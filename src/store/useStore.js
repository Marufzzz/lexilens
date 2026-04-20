import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { generateDailyWords, verifyPhoto as groqVerify } from '../lib/groq'

const TODAY = () => new Date().toISOString().split('T')[0]
const YESTERDAY = () => new Date(Date.now() - 86400000).toISOString().split('T')[0]

const useStore = create((set, get) => ({
  user: null,
  profile: null,
  zoneProgress: [],
  todaySession: null,
  loading: false,
  error: null,

  setUser: (user) => set({ user }),
  setError: (error) => set({ error }),

  // ─── Auth ───────────────────────────────────────────────
  signUp: async (email, password, username, avatar, apiKey) => {
    const key = apiKey || import.meta.env.VITE_GROQ_API_KEY || ''

    // Pass profile data as metadata — trigger will create the full profile
    // even before email confirmation, so no session is needed
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, avatar, gemini_api_key: key }
      }
    })
    if (error) throw error

    const userId = data.user?.id
    if (!userId) throw new Error('Signup failed — no user returned')

    // If we got a session (email confirm disabled), load profile right away
    if (data.session) {
      set({ user: data.user })
      await get().loadProfile(userId)
    } else {
      // No session yet (email confirm required) — profile was created by trigger.
      // Store the user object so onComplete can proceed.
      set({ user: data.user })
    }

    return data.user
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data.user
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, zoneProgress: [], todaySession: null })
  },

  // ─── Profile ────────────────────────────────────────────
  loadProfile: async (userId) => {
    set({ loading: true })
    try {
      const [profileRes, zonesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('zone_progress').select('*').eq('user_id', userId).order('zone_id')
      ])

      let profile = profileRes.data
      let zones = zonesRes.data || []

      // Profile missing or couldn't be fetched — create a fallback in memory
      // so the app renders immediately even if DB is unavailable
      if (!profile) {
        const envKey = import.meta.env.VITE_GROQ_API_KEY || ''
        // Try to create it (may fail if no session — that's OK, trigger already did it)
        await supabase.from('profiles').upsert({
          id: userId, username: 'Explorer', avatar: '🦁',
          gemini_api_key: envKey, current_zone: 1, total_xp: 0,
          level: 1, streak_count: 0, longest_streak: 0
        }).then(() => {}).catch(() => {})
        await supabase.from('zone_progress').upsert({
          user_id: userId, zone_id: 1, streak_days: 0, is_cleared: false
        }, { onConflict: 'user_id,zone_id' }).then(() => {}).catch(() => {})

        // Re-fetch or use fallback
        const { data: fp } = await supabase.from('profiles').select('*').eq('id', userId).single()
        const { data: fz } = await supabase.from('zone_progress').select('*').eq('user_id', userId)
        profile = fp || { id: userId, username: 'Explorer', avatar: '🦁', gemini_api_key: envKey, current_zone: 1, total_xp: 0, level: 1, streak_count: 0, longest_streak: 0 }
        zones = fz || []
      }

      // Patch missing gemini key from env var
      if (profile && !profile.gemini_api_key && import.meta.env.VITE_GROQ_API_KEY) {
        profile = { ...profile, gemini_api_key: import.meta.env.VITE_GROQ_API_KEY }
        supabase.from('profiles').update({ gemini_api_key: import.meta.env.VITE_GROQ_API_KEY }).eq('id', userId).then(() => {}).catch(() => {})
      }

      // Always set profile — this unblocks the screens
      set({ profile, zoneProgress: zones })

      // Non-blocking: check streak + load today's session
      if (profile) {
        get().checkStreakContinuity(profile).catch(() => {})
        get().loadTodaySession(userId, profile).catch(() => {})
      }
    } catch (e) {
      console.error('loadProfile error', e)
      // Even on error, clear loading so screens don't spin forever
    } finally {
      set({ loading: false })
    }
  },

  checkStreakContinuity: async (profile) => {
    // If last active was not yesterday or today, reset streak for current zone
    const lastActive = profile.last_active_date
    if (lastActive && lastActive !== TODAY() && lastActive !== YESTERDAY()) {
      // Streak broken! Reset zone streak days
      const { zoneProgress } = get()
      const currentZone = zoneProgress.find(z => z.zone_id === profile.current_zone)
      if (currentZone && !currentZone.is_cleared) {
        await supabase.from('zone_progress')
          .update({ streak_days: 0 })
          .eq('user_id', profile.id)
          .eq('zone_id', profile.current_zone)

        set(state => ({
          zoneProgress: state.zoneProgress.map(z =>
            z.zone_id === profile.current_zone ? { ...z, streak_days: 0 } : z
          )
        }))
      }
    }
  },

  updateProfile: async (updates) => {
    const { profile } = get()
    const { data } = await supabase.from('profiles').update(updates).eq('id', profile.id).select().single()
    set({ profile: data })
  },

  // ─── Daily Session ───────────────────────────────────────
  loadTodaySession: async (userId, profile) => {
    const today = TODAY()
    const { data: session } = await supabase
      .from('daily_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    if (session) {
      set({ todaySession: session })
      return
    }
    // Don't auto-generate here — HomeScreen useEffect handles it
    // This prevents double calls
  },

  generateTodayWords: async (userId, profile) => {
    if (get()._generating) return
    set({ _generating: true })

    const { data: existing } = await supabase
      .from('daily_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('date', TODAY())
      .single()

    if (existing) {
      set({ todaySession: existing, _generating: false })
      return
    }

    set({ loading: true })
    try {
      const apiKey = profile.gemini_api_key || import.meta.env.VITE_GROQ_API_KEY || ''
      if (!apiKey) throw new Error('No API key')

      // Fetch ALL past words ever used by this user (not just 30 days)
      const { data: pastSessions } = await supabase
        .from('daily_sessions')
        .select('words')
        .eq('user_id', userId)

      const usedWords = Array.from(new Set(
        (pastSessions || [])
          .flatMap(s => (s.words || []).map(w => (w.word || '').toLowerCase()))
          .filter(Boolean)
      ))

      console.log('[generateTodayWords] Used words count:', usedWords.length)

      let words
      try {
        words = await generateDailyWords(apiKey, profile.current_zone, profile.level, usedWords)
      } catch (e) {
        console.error('[generateTodayWords] First attempt failed:', e.message)
        // Retry once with no context, still avoiding used words
        words = await generateDailyWords(apiKey, profile.current_zone, 1, usedWords)
      }

      // Filter out any accidentally repeated words (belt and suspenders)
      const fresh = words.filter(w => !usedWords.includes((w.word || '').toLowerCase()))
      const finalWords = fresh.length >= 5 ? fresh.slice(0, 5) : words.slice(0, 5)

      const { data: session, error } = await supabase
        .from('daily_sessions')
        .insert({
          user_id: userId,
          date: TODAY(),
          zone_id: profile.current_zone,
          words: finalWords,
          words_completed: 0,
          xp_earned: 0,
          is_complete: false
        })
        .select()
        .single()

      if (error?.code === '23505') {
        const { data: s } = await supabase.from('daily_sessions').select('*').eq('user_id', userId).eq('date', TODAY()).single()
        set({ todaySession: s })
      } else {
        set({ todaySession: session })
      }
    } catch (e) {
      console.error('[generateTodayWords] All retries failed:', e)
      set({ error: 'Could not generate words. Please check your connection and try again.' })
    } finally {
      set({ loading: false, _generating: false })
    }
  },

  // ─── Photo Verification ──────────────────────────────────
  submitPhoto: async (wordIndex, imageBase64) => {
    const { profile, todaySession } = get()
    const apiKey = profile?.gemini_api_key || import.meta.env.VITE_GROQ_API_KEY || ''
    if (!apiKey || !todaySession) throw new Error('Not ready')

    const word = todaySession.words[wordIndex]
    if (word.mastered) return { match: true, confidence: 1, hint: 'Already mastered!' }

    set({ loading: true })
    try {
      const result = await groqVerify(
        apiKey,
        imageBase64,
        word.word
      )

      const updatedWords = todaySession.words.map((w, i) =>
        i === wordIndex
          ? { ...w, attempts: (w.attempts || 0) + 1, mastered: result.match, photo_verified: result.match }
          : w
      )

      const newCompleted = updatedWords.filter(w => w.mastered).length
      const xpGain = result.match ? (ZONES_XP[profile.current_zone] || 100) : 0
      const allDone = newCompleted >= 5

      const { data: updatedSession } = await supabase
        .from('daily_sessions')
        .update({
          words: updatedWords,
          words_completed: newCompleted,
          xp_earned: (todaySession.xp_earned || 0) + xpGain,
          is_complete: allDone
        })
        .eq('id', todaySession.id)
        .select()
        .single()

      set({ todaySession: updatedSession })

      if (result.match) {
        await get().awardXP(xpGain, allDone)
      }

      return result
    } finally {
      set({ loading: false })
    }
  },

  awardXP: async (xpGain, sessionComplete) => {
    const { profile, zoneProgress } = get()
    const today = TODAY()
    const yesterday = YESTERDAY()

    const newXP = (profile.total_xp || 0) + xpGain
    const newLevel = calcLevel(newXP)

    let updates = { total_xp: newXP, level: newLevel, last_active_date: today }

    if (sessionComplete) {
      // Update streak
      const wasYesterday = profile.last_active_date === yesterday
      const isToday = profile.last_active_date === today
      const newStreak = isToday ? profile.streak_count : (wasYesterday ? (profile.streak_count || 0) + 1 : 1)

      updates.streak_count = newStreak
      updates.longest_streak = Math.max(newStreak, profile.longest_streak || 0)

      // Update zone streak
      const currentZoneP = zoneProgress.find(z => z.zone_id === profile.current_zone)
      const newZoneStreak = (currentZoneP?.streak_days || 0) + 1
      const zoneCleared = newZoneStreak >= 15

      await supabase.from('zone_progress')
        .update({ streak_days: newZoneStreak, is_cleared: zoneCleared, cleared_date: zoneCleared ? today : null })
        .eq('user_id', profile.id)
        .eq('zone_id', profile.current_zone)

      set(state => ({
        zoneProgress: state.zoneProgress.map(z =>
          z.zone_id === profile.current_zone
            ? { ...z, streak_days: newZoneStreak, is_cleared: zoneCleared }
            : z
        )
      }))

      if (zoneCleared && profile.current_zone < 6) {
        const nextZone = profile.current_zone + 1
        updates.current_zone = nextZone
        await supabase.from('zone_progress').upsert({
          user_id: profile.id, zone_id: nextZone, streak_days: 0, is_cleared: false
        }, { onConflict: 'user_id,zone_id', ignoreDuplicates: true })
      }
    }

    await supabase.from('profiles').update(updates).eq('id', profile.id)
    set(state => ({ profile: { ...state.profile, ...updates } }))
  }
}))

const ZONES_XP = { 1: 100, 2: 140, 3: 190, 4: 250, 5: 330, 6: 450 }

const calcLevel = (xp) => {
  const thresholds = [0, 500, 1000, 1800, 2800, 4200, 6000, 8200, 10800, 13800, 17200, 21000]
  let level = 1
  for (let i = 1; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) level = i + 1
    else break
  }
  return level
}

export default useStore
