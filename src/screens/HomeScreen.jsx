import { useState } from 'react'
import useStore from '../store/useStore'
import WordCard from '../components/WordCard'
import XPBar from '../components/XPBar'
import { ZONES, getLevelInfo } from '../lib/gameData'

export default function HomeScreen({ onOpenCamera }) {
  const { profile, todaySession, zoneProgress, loading, generateTodayWords } = useStore()
  const [showCelebration, setShowCelebration] = useState(false)

  if (!profile) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:16, padding:24 }}>
      <div className="spinner" />
      <div style={{ fontSize:14, color:'var(--text-soft)', fontWeight:600, textAlign:'center' }}>
        Loading your profile...
      </div>
    </div>
  )

  const zone = ZONES[profile.current_zone - 1]
  const currentZoneP = zoneProgress.find(z => z.zone_id === profile.current_zone)
  const streakDays = currentZoneP?.streak_days || 0
  const wordsCompleted = todaySession?.words_completed || 0
  const totalWords = todaySession?.words?.length || 5
  const allDone = wordsCompleted >= 5

  const progressPct = (wordsCompleted / totalWords) * 100

  const handleCamera = (word, index) => {
    onOpenCamera({ word, index, sessionId: todaySession?.id })
  }

  return (
    <div className="screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${zone.color}, ${zone.color}99)`,
        padding: '20px 20px 28px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* bg decoration */}
        <div style={{
          position: 'absolute', right: -20, top: -20,
          width: 120, height: 120,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '50%'
        }} />

        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600 }}>
              Good {getTimeGreeting()}!
            </div>
            <h2 style={{ color: 'white', fontSize: 24, fontWeight: 800, marginTop: 2 }}>
              {profile.avatar} {profile.username}
            </h2>
          </div>

          {/* Streak badge */}
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 16, padding: '8px 14px',
            display: 'flex', alignItems: 'center', gap: 6,
            backdropFilter: 'blur(8px)'
          }}>
            <span style={{ fontSize: 20, animation: 'streak-fire 1s ease-in-out infinite' }}>🔥</span>
            <div>
              <div style={{ color: 'white', fontSize: 18, fontWeight: 800, lineHeight: 1 }}>
                {profile.streak_count || 0}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: 600 }}>day streak</div>
            </div>
          </div>
        </div>

        {/* XP Bar */}
        <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: '10px 14px' }}>
          <XPBar level={profile.level} xp={profile.total_xp} />
        </div>

        {/* Zone info */}
        <div style={{
          marginTop: 14,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>{zone.emoji}</span>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>Zone {profile.current_zone}: {zone.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>{zone.radius}</div>
            </div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 10, padding: '4px 10px',
            color: 'white', fontSize: 12, fontWeight: 700
          }}>
            Day {streakDays}/15
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Today's Progress bar */}
        <div style={{
          background: 'white', borderRadius: 20, padding: '16px 18px',
          boxShadow: 'var(--shadow)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, fontFamily: "'Baloo 2', cursive" }}>
                Today's Words
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 1 }}>
                {allDone ? "🎉 All done! Come back tomorrow" : `${wordsCompleted} of ${totalWords} completed`}
              </div>
            </div>
            <div style={{ fontSize: 28 }}>
              {allDone ? '🎉' : `${wordsCompleted}/${totalWords}`}
            </div>
          </div>
          {/* Progress track */}
          <div style={{ display: 'flex', gap: 6 }}>
            {Array.from({ length: totalWords }).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 8, borderRadius: 4,
                background: i < wordsCompleted ? 'var(--green)' : 'var(--border)',
                transition: 'background 0.4s ease',
                transitionDelay: `${i * 0.1}s`
              }} />
            ))}
          </div>
          {allDone && (
            <div style={{
              marginTop: 12, background: 'var(--green-light)',
              borderRadius: 12, padding: '10px 14px',
              fontSize: 13, color: 'var(--green-dark)', fontWeight: 700,
              textAlign: 'center'
            }}>
              ✅ Streak day {streakDays} complete! Keep going tomorrow 🔥
            </div>
          )}
        </div>

        {/* Words section */}
        <div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Baloo 2', cursive" }}>
              📸 Photo Quests
            </h3>
            {loading && <div className="spinner" style={{ width: 18, height: 18 }} />}
          </div>

          {!profile.gemini_api_key && !todaySession && (
            <div style={{
              background: 'white', borderRadius: 20, padding: 20,
              boxShadow: 'var(--shadow)', textAlign: 'center'
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Add your AI key to start!</div>
              <div style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 16 }}>
                Go to Profile → Settings to add your free Gemini API key
              </div>
            </div>
          )}

          {!todaySession && profile.gemini_api_key && !loading && (
            <button
              className="btn btn-primary btn-full"
              onClick={() => generateTodayWords(profile.id, profile)}
            >
              ✨ Generate Today's Words
            </button>
          )}

          {todaySession?.words?.map((word, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <WordCard
                word={word}
                index={i}
                onCamera={handleCamera}
                delay={i * 0.07}
              />
            </div>
          ))}

          {loading && !todaySession && (
            <div style={{
              background: 'white', borderRadius: 20, padding: 32,
              textAlign: 'center', boxShadow: 'var(--shadow)'
            }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              <div style={{ fontSize: 14, color: 'var(--text-soft)', fontWeight: 600 }}>
                AI is picking your words... 🤖
              </div>
            </div>
          )}
        </div>

        {/* Zone progress mini-card */}
        <div style={{
          background: 'white', borderRadius: 20, padding: '16px 18px',
          boxShadow: 'var(--shadow)'
        }}>
          <div style={{ fontWeight: 800, fontFamily: "'Baloo 2', cursive", marginBottom: 12, fontSize: 15 }}>
            🗺️ Zone {profile.current_zone} Progress
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} style={{
                width: 18, height: 18,
                borderRadius: 5,
                background: i < streakDays ? zone.color : 'var(--border)',
                transition: 'background 0.3s ease',
                transitionDelay: `${i * 0.03}s`
              }} />
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 8, fontWeight: 600 }}>
            {streakDays >= 15 ? '🎉 Zone cleared!' : `${15 - streakDays} more days to unlock Zone ${profile.current_zone + 1 <= 6 ? profile.current_zone + 1 : '✓'}`}
          </div>
        </div>

        <div style={{ height: 10 }} />
      </div>
    </div>
  )
}

const getTimeGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
