import { getLevelInfo, getXPForLevel } from '../lib/gameData'

export default function XPBar({ level, xp }) {
  const levelInfo = getLevelInfo(level)
  const currentLevelXP = getXPForLevel(level)
  const nextLevelXP = getXPForLevel(level + 1)
  const progress = Math.min(100, ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Level badge */}
      <div style={{
        background: levelInfo.color + '22',
        border: `2px solid ${levelInfo.color}44`,
        borderRadius: 12,
        padding: '4px 10px',
        display: 'flex', alignItems: 'center', gap: 5,
        flexShrink: 0
      }}>
        <span style={{ fontSize: 14 }}>{levelInfo.emoji}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: levelInfo.color }}>Lv.{level}</span>
      </div>

      {/* XP bar */}
      <div style={{ flex: 1 }}>
        <div className="xp-bar">
          <div className="xp-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 10, color: 'var(--text-soft)', marginTop: 3, fontWeight: 600
        }}>
          <span>{xp.toLocaleString()} XP</span>
          <span>{nextLevelXP.toLocaleString()} XP</span>
        </div>
      </div>
    </div>
  )
}
