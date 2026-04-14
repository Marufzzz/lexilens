import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { generateDailyWords, verifyPhoto as geminiVerify } from '../lib/gemini'

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
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    // Create profile
    await supabase.from('profiles').upsert({
      id: data.user.id,
      username,
      avatar,
      gemini_api_key: apiKey,
      current_zone: 1,
      total_xp: 0,
      level: 1,
      streak_count: 0,
      longest_streak: 0
    })

    // Init zone progress for zone 1
    await supabase.from('zone_progress').upsert({
      user_id: data.user.id,
      zone_id: 1,
      streak_days: 0,
      is_cleared: false
    })

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
      const [{ data: profile }, { data: zones }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('zone_progress').select('*').eq('user_id', userId).order('zone_id')
      ])

      set({ profile, zoneProgress: zones || [] })

      // Check streak continuity
      if (profile) {
        await get().checkStreakContinuity(profile)
        await get().loadTodaySession(userId, profile)
      }
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

    // Generate new session if API key exists
    if (profile?.gemini_api_key) {
      await get().generateTodayWords(userId, profile)
    } else {
      // No API key yet — set empty session marker
      set({ todaySession: null })
    }
  },

  generateTodayWords: async (userId, profile) => {
    set({ loading: true })
    try {
      const words = await generateDailyWords(
        profile.gemini_api_key,
        profile.current_zone,
        profile.level,
        []
      )

      const { data: session } = await supabase
        .from('daily_sessions')
        .insert({
          user_id: userId,
          date: TODAY(),
          zone_id: profile.current_zone,
          words,
          words_completed: 0,
          xp_earned: 0,
          is_complete: false
        })
        .select()
        .single()

      set({ todaySession: session })
    } catch (e) {
      set({ error: 'Failed to generate words. Check your API key.' })
    } finally {
      set({ loading: false })
    }
  },

  // ─── Photo Verification ──────────────────────────────────
  submitPhoto: async (wordIndex, imageBase64) => {
    const { profile, todaySession } = get()
    if (!profile?.gemini_api_key || !todaySession) throw new Error('Not ready')

    const word = todaySession.words[wordIndex]
    if (word.mastered) return { match: true, confidence: 1, hint: 'Already mastered!' }

    set({ loading: true })
    try {
      const result = await geminiVerify(
        profile.gemini_api_key,
        imageBase64,
        word.word,
        word.definition
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
