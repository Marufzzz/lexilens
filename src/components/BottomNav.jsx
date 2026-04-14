export default function BottomNav({ active, onChange }) {
  const tabs = [
    { id: 'home', emoji: '🏠', label: 'Home' },
    { id: 'map', emoji: '🗺️', label: 'Map' },
    { id: 'profile', emoji: '👤', label: 'Me' }
  ]

  return (
    <div style={{
      display: 'flex',
      background: 'white',
      borderTop: '1.5px solid #F0E8E0',
      padding: '8px 0 calc(8px + env(safe-area-inset-bottom, 0px))',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.06)'
    }}>
      {tabs.map(tab => {
        const isActive = active === tab.id
        return (
          <button key={tab.id} onClick={() => onChange(tab.id)} style={{
            flex: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '6px 0',
            transition: 'transform 0.15s'
          }}>
            <div style={{
              width: 48, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 12,
              background: isActive ? 'var(--orange-light)' : 'transparent',
              transition: 'all 0.2s ease'
            }}>
              <span style={{
                fontSize: isActive ? 22 : 20,
                filter: isActive ? 'none' : 'grayscale(0.3) opacity(0.7)',
                transition: 'all 0.2s ease',
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                display: 'block'
              }}>
                {tab.emoji}
              </span>
            </div>
            <span style={{
              fontSize: 11, fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--orange)' : 'var(--text-soft)',
              transition: 'color 0.2s'
            }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
