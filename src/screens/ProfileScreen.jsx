import { useState } from 'react'
import useStore from '../store/useStore'
import { getLevelInfo, ZONES } from '../lib/gameData'

export default function ProfileScreen() {
  const { profile, zoneProgress, signOut, updateProfile } = useStore()
  const [editingKey, setEditingKey] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  if (!profile) return null

  const levelInfo = getLevelInfo(profile.level)
  const zone = ZONES[(profile.current_zone || 1) - 1]
  const zonesCleared = zoneProgress.filter(z => z.is_cleared).length

  const handleSaveKey = async () => {
    if (!newKey.trim()) return
    setSaving(true)
    await updateProfile({ gemini_api_key: newKey.trim() })
    setSaving(false)
    setSaved(true)
    setEditingKey(false)
    setNewKey('')
    setTimeout(() => setSaved(false), 2000)
  }

  const STAT_ITEMS = [
    { emoji: '⭐', label: 'Total XP', value: (profile.total_xp || 0).toLocaleString() },
    { emoji: '🔥', label: 'Best Streak', value: `${profile.longest_streak || 0} days` },
    { emoji: '🗺️', label: 'Zones Cleared', value: `${zonesCleared} / 6` },
    { emoji: '📊', label: 'Current Level', value: `Level ${profile.level}` }
  ]

  return (
    <div className="screen" style={{ background: 'var(--bg)' }}>
      {/* Hero header */}
      <div style={{
        background: `linear-gradient(135deg, ${zone.color}, ${zone.color}88)`,
        padding: '28px 20px 36px',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', right: -30, top: -30,
          width: 160, height: 160,
          background: 'rgba(255,255,255,0.08)', borderRadius: '50%'
        }} />

        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
          <div style={{
            width: 80, height: 80,
            background: 'rgba(255,255,255,0.25)',
            borderRadius: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 44,
            border: '3px solid rgba(255,255,255,0.4)'
          }}>
            {profile.avatar}
          </div>
          <div>
            <h2 style={{ color: 'white', fontSize: 26, fontWeight: 800, fontFamily: "'Baloo 2', cursive" }}>
              {profile.username}
            </h2>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 100, padding: '4px 12px', marginTop: 6
            }}>
              <span style={{ fontSize: 16 }}>{levelInfo.emoji}</span>
              <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>
                {levelInfo.tier} — Level {profile.level}
              </span>
            </div>
          </div>
        </div>

        {/* Current zone */}
        <div style={{
          marginTop: 16,
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 14, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          <span style={{ fontSize: 20 }}>{zone.emoji}</span>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>
              Zone {profile.current_zone}: {zone.name}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              {zone.radius}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', color: 'white', fontWeight: 800, fontSize: 18, fontFamily: "'Baloo 2', cursive" }}>
            🔥 {profile.streak_count || 0}
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Stats grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10
        }}>
          {STAT_ITEMS.map(stat => (
            <div key={stat.label} style={{
              background: 'white',
              borderRadius: 18, padding: '16px',
              boxShadow: 'var(--shadow)',
              display: 'flex', flexDirection: 'column', gap: 6
            }}>
              <span style={{ fontSize: 24 }}>{stat.emoji}</span>
              <div style={{ fontFamily: "'Baloo 2', cursive", fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-soft)', fontWeight: 600 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Zone progress overview */}
        <div style={{ background: 'white', borderRadius: 18, padding: '16px', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: 17, fontWeight: 700, marginBottom: 14 }}>
            🗺️ Zone Progress
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ZONES.map(z => {
              const zp = zoneProgress.find(zpr => zpr.zone_id === z.id)
              const state = z.id < profile.current_zone ? 'cleared' : z.id === profile.current_zone ? 'active' : 'locked'
              const days = zp?.streak_days || 0
              return (
                <div key={z.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  opacity: state === 'locked' ? 0.4 : 1
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: state === 'locked' ? '#EEE' : z.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, flexShrink: 0
                  }}>
                    {state === 'cleared' ? '✅' : z.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>
                      Zone {z.id}: {z.name}
                    </div>
                    <div style={{ height: 6, background: '#F0E8E0', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: state === 'cleared' ? '100%' : `${(days / 15) * 100}%`,
                        background: z.color,
                        borderRadius: 3,
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-soft)', fontWeight: 700, flexShrink: 0 }}>
                    {state === 'cleared' ? '✅' : state === 'active' ? `${days}/15` : '🔒'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* API Key settings */}
        <div style={{ background: 'white', borderRadius: 18, padding: '16px', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
            🤖 AI Settings
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 12 }}>
            Your Gemini API key powers word generation and photo verification
          </p>

          {!editingKey ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{
                flex: 1, background: 'var(--bg)',
                borderRadius: 12, padding: '10px 14px',
                fontSize: 13, color: 'var(--text-soft)', fontWeight: 600
              }}>
                {profile.gemini_api_key
                  ? `🔑 ••••••••${profile.gemini_api_key.slice(-6)}`
                  : '⚠️ No API key — add one to play!'}
              </div>
              <button
                onClick={() => setEditingKey(true)}
                className="btn btn-secondary btn-sm"
              >
                {profile.gemini_api_key ? 'Change' : 'Add Key'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                className="input"
                placeholder="Paste new Gemini API key..."
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                style={{ fontSize: 13 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => { setEditingKey(false); setNewKey('') }}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ flex: 2 }}
                  onClick={handleSaveKey}
                  disabled={saving || !newKey.trim()}
                >
                  {saving ? '...' : '💾 Save'}
                </button>
              </div>
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, color: 'var(--orange)', fontWeight: 600, textAlign: 'center' }}>
                Get a free API key →
              </a>
            </div>
          )}

          {saved && (
            <div style={{
              marginTop: 8, background: 'var(--green-light)',
              borderRadius: 10, padding: '8px 14px',
              fontSize: 13, color: 'var(--green-dark)', fontWeight: 700,
              textAlign: 'center'
            }} className="pop-in">
              ✅ API key saved!
            </div>
          )}
        </div>

        {/* Sign out */}
        <button
          className="btn btn-ghost btn-full"
          onClick={signOut}
          style={{
            border: '2px solid var(--border)',
            color: 'var(--text-soft)',
            fontWeight: 700
          }}
        >
          👋 Sign Out
        </button>

        <div style={{ height: 10 }} />
      </div>
    </div>
  )
}
