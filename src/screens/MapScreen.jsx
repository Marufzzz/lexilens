import { useState } from 'react'
import useStore from '../store/useStore'
import { ZONES } from '../lib/gameData'

export default function MapScreen() {
  const { profile, zoneProgress } = useStore()
  const [selected, setSelected] = useState(null)

  if (!profile) return null

  const getZoneState = (zoneId) => {
    if (zoneId < profile.current_zone) return 'cleared'
    if (zoneId === profile.current_zone) return 'active'
    return 'locked'
  }

  const getZoneProgress = (zoneId) => {
    return zoneProgress.find(z => z.zone_id === zoneId)
  }

  const selectedZone = selected !== null ? ZONES[selected] : null
  const selectedState = selected !== null ? getZoneState(selected + 1) : null
  const selectedProgress = selected !== null ? getZoneProgress(selected + 1) : null

  return (
    <div style={{ background: 'var(--bg)', flex: 1 }}>
      {/* Header */}
      <div style={{
        padding: '20px 20px 16px',
        background: 'linear-gradient(135deg, #1A1A2E, #3A1060)',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <h2 style={{ color: 'white', fontSize: 26, fontWeight: 800, fontFamily: "'Baloo 2', cursive" }}>
          🗺️ World Map
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 2 }}>
          Complete 15-day streaks to unlock new zones
        </p>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Zone cards — bottom to top (home first) */}
        {ZONES.map((zone, i) => {
          const zoneId = zone.id
          const state = getZoneState(zoneId)
          const progress = getZoneProgress(zoneId)
          const streakDays = progress?.streak_days || 0
          const isSelected = selected === i
          const isLocked = state === 'locked'
          const isActive = state === 'active'
          const isCleared = state === 'cleared'

          return (
            <div key={zone.id}>
              {/* Connector arrow (between zones) */}
              {i > 0 && (
                <div style={{
                  display: 'flex', justifyContent: 'center',
                  marginBottom: 4
                }}>
                  <div style={{
                    fontSize: 16,
                    opacity: ZONES[i-1].id < profile.current_zone ? 1 : 0.3,
                    transform: 'rotate(180deg)'
                  }}>
                    {isLocked ? '🔒' : '⬆️'}
                  </div>
                </div>
              )}

              {/* Zone card */}
              <div
                onClick={() => !isLocked && setSelected(isSelected ? null : i)}
                style={{
                  background: isLocked ? '#F5F5F5' : 'white',
                  borderRadius: 20,
                  border: isActive ? `2.5px solid ${zone.color}` : isCleared ? `2px solid ${zone.color}44` : '2px solid #EBEBEB',
                  overflow: 'hidden',
                  opacity: isLocked ? 0.55 : 1,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? `0 4px 20px ${zone.color}33` : 'var(--shadow)'
                }}
              >
                {/* Zone header */}
                <div style={{
                  padding: '14px 16px',
                  background: isLocked ? 'transparent' : zone.light,
                  display: 'flex', alignItems: 'center', gap: 14
                }}>
                  {/* Icon */}
                  <div style={{
                    width: 52, height: 52,
                    background: isLocked ? '#E0E0E0' : zone.color,
                    borderRadius: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 26, flexShrink: 0,
                    filter: isLocked ? 'grayscale(1)' : 'none'
                  }}>
                    {isCleared ? '✅' : zone.emoji}
                  </div>

                  {/* Name + status */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontFamily: "'Baloo 2', cursive",
                        fontSize: 18, fontWeight: 700,
                        color: isLocked ? '#AAAAAA' : 'var(--text)'
                      }}>
                        Zone {zone.id}: {zone.name}
                      </span>
                      {isActive && (
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          background: zone.color, color: 'white',
                          padding: '2px 8px', borderRadius: 100
                        }}>
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: isLocked ? '#AAAAAA' : 'var(--text-soft)', marginTop: 2 }}>
                      {zone.radius} • {zone.description.split('.')[0]}
                    </div>
                  </div>

                  {/* State indicator */}
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    {isCleared && <div style={{ fontSize: 24 }}>✅</div>}
                    {isActive && (
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: zone.color, fontFamily: "'Baloo 2', cursive" }}>
                          {streakDays}/15
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-soft)' }}>days</div>
                      </div>
                    )}
                    {isLocked && <div style={{ fontSize: 24 }}>🔒</div>}
                  </div>
                </div>

                {/* Streak dots for active zone */}
                {isActive && (
                  <div style={{ padding: '10px 16px', borderTop: `1px solid ${zone.color}22` }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {Array.from({ length: 15 }).map((_, d) => (
                        <div key={d} style={{
                          width: 16, height: 16,
                          borderRadius: 4,
                          background: d < streakDays ? zone.color : 'var(--border)',
                          transition: 'background 0.3s',
                          transitionDelay: `${d * 0.02}s`
                        }} />
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 6, fontWeight: 600 }}>
                      🔥 {streakDays} / 15 days streak
                    </div>
                  </div>
                )}

                {/* Expanded detail */}
                {isSelected && !isLocked && (
                  <div style={{ padding: '12px 16px 16px', borderTop: `1px solid ${zone.color}22` }} className="slide-up">
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                      Where to search
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {zone.locations.map(loc => (
                        <span key={loc} style={{
                          fontSize: 12, fontWeight: 600,
                          background: zone.light, color: zone.color,
                          padding: '4px 10px', borderRadius: 100,
                          border: `1px solid ${zone.color}33`
                        }}>
                          {loc}
                        </span>
                      ))}
                    </div>
                    <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-soft)' }}>
                      {isCleared
                        ? `✅ Cleared! You mastered Zone ${zone.id}.`
                        : isActive
                          ? `Complete 5 words daily for ${15 - streakDays} more days to unlock Zone ${zone.id + 1}!`
                          : `Unlock by clearing Zone ${zone.id - 1} first.`
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Legend */}
        <div style={{
          background: 'white', borderRadius: 16,
          padding: '14px 16px', marginTop: 8,
          boxShadow: 'var(--shadow)'
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, fontFamily: "'Baloo 2', cursive" }}>
            📖 How to unlock zones
          </div>
          {[
            ['🔥', 'Complete all 5 daily words'],
            ['📅', 'Do it 15 days in a row'],
            ['🔓', 'New zone unlocks automatically'],
            ['⚠️', 'Missing a day resets the streak!']
          ].map(([icon, text]) => (
            <div key={text} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
              <span>{icon}</span>
              <span style={{ fontSize: 12, color: 'var(--text-soft)', fontWeight: 500 }}>{text}</span>
            </div>
          ))}
        </div>

        <div style={{ height: 10 }} />
      </div>
    </div>
  )
}
