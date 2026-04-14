import { useEffect, useState } from 'react'

export default function SplashScreen() {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 300)
    const t2 = setTimeout(() => setStage(2), 900)
    const t3 = setTimeout(() => setStage(3), 1500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div style={{
      height: '100%',
      background: 'linear-gradient(160deg, #FF6B35 0%, #F15BB5 50%, #9B5DE5 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background blobs */}
      <div style={{
        position: 'absolute', width: 300, height: 300,
        background: 'rgba(255,255,255,0.08)', borderRadius: '50%',
        top: -80, left: -80
      }} />
      <div style={{
        position: 'absolute', width: 200, height: 200,
        background: 'rgba(255,255,255,0.06)', borderRadius: '50%',
        bottom: 40, right: -60
      }} />

      {/* Logo */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        opacity: stage >= 1 ? 1 : 0,
        transform: stage >= 1 ? 'scale(1)' : 'scale(0.6)',
        transition: 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        <div style={{
          width: 100, height: 100,
          background: 'white',
          borderRadius: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 52,
          boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
          animation: stage >= 2 ? 'float 3s ease-in-out infinite' : 'none'
        }}>
          🔍
        </div>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontFamily: "'Baloo 2', cursive",
            fontSize: 44,
            fontWeight: 800,
            color: 'white',
            letterSpacing: -1,
            textShadow: '0 2px 12px rgba(0,0,0,0.15)'
          }}>
            LexiLens
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: 16,
            fontWeight: 600,
            opacity: stage >= 2 ? 1 : 0,
            transform: stage >= 2 ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.5s ease 0.2s'
          }}>
            Learn words. Explore your world. 🌍
          </p>
        </div>
      </div>

      {/* Loading dots */}
      <div style={{
        position: 'absolute', bottom: 60,
        display: 'flex', gap: 8,
        opacity: stage >= 3 ? 1 : 0,
        transition: 'opacity 0.4s ease'
      }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 8, height: 8,
            background: 'white',
            borderRadius: '50%',
            animation: 'bounce 1.2s ease infinite',
            animationDelay: `${i * 0.2}s`
          }} />
        ))}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-10px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
