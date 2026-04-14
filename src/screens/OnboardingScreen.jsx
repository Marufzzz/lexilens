import { useState } from 'react'
import { AVATARS } from '../lib/gameData'
import useStore from '../store/useStore'

// Steps: welcome → name → avatar → account → done (API key no longer needed)
const STEPS = ['welcome', 'name', 'avatar', 'account', 'done']

export default function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('🦁')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signUp } = useStore()

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1))

  const handleCreateAccount = async () => {
    if (!email || !password || password.length < 6) {
      setError('Enter a valid email and password (min 6 characters)')
      return
    }
    setLoading(true)
    setError('')
    try {
      // Use the built-in env var key — no manual entry needed
      const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || ''
      await signUp(email, password, name, avatar, geminiKey)
      next()
    } catch (e) {
      setError(e.message || 'Failed to create account. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const STEP_COLORS = [
    'linear-gradient(135deg, #FF6B35, #F15BB5)',
    'linear-gradient(135deg, #9B5DE5, #3A86FF)',
    'linear-gradient(135deg, #06D6A0, #3A86FF)',
    'linear-gradient(135deg, #FFC107, #FF6B35)',
    'linear-gradient(135deg, #06D6A0, #9B5DE5)'
  ]

  return (
    <div style={{
      height: '100%',
      background: STEP_COLORS[step],
      display: 'flex',
      flexDirection: 'column',
      transition: 'background 0.6s ease'
    }}>
      {/* Progress dots */}
      {step > 0 && step < 4 && (
        <div style={{
          display: 'flex', gap: 6, justifyContent: 'center', paddingTop: 20
        }}>
          {[1,2,3].map(i => (
            <div key={i} style={{
              width: i <= step ? 24 : 8,
              height: 8,
              background: i <= step ? 'white' : 'rgba(255,255,255,0.3)',
              borderRadius: 4,
              transition: 'all 0.3s ease'
            }} />
          ))}
        </div>
      )}

      <div style={{ flex: 1, padding: '20px 24px 40px', display: 'flex', flexDirection: 'column' }}>

        {/* WELCOME */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 24, textAlign: 'center' }} className="pop-in">
            <div style={{ fontSize: 80, animation: 'float 3s ease-in-out infinite' }}>🔍</div>
            <div>
              <h1 style={{ color: 'white', fontSize: 40, fontWeight: 800 }}>Welcome to<br />LexiLens!</h1>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 17, marginTop: 12, lineHeight: 1.6 }}>
                Learn English words by photographing objects around you. The more you explore, the more you learn! 📸
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['📸 Photo Quests', '🔥 Daily Streaks', '🗺️ Zone Unlocks', '⭐ Level Up'].map(t => (
                <span key={t} style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white', fontSize: 13, fontWeight: 700,
                  padding: '6px 14px', borderRadius: 100
                }}>{t}</span>
              ))}
            </div>
            <button className="btn" style={{ background: 'white', color: '#FF6B35', width: '100%', fontSize: 18, padding: '16px' }} onClick={next}>
              Let's Start! 🚀
            </button>
          </div>
        )}

        {/* NAME */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 20 }} className="slide-up">
            <div style={{ color: 'white', marginTop: 20 }}>
              <div style={{ fontSize: 48 }}>👋</div>
              <h2 style={{ fontSize: 32, fontWeight: 800, marginTop: 8 }}>What's your name?</h2>
              <p style={{ opacity: 0.85, marginTop: 4, fontSize: 15 }}>This is how you'll appear on the leaderboard</p>
            </div>
            <input
              className="input"
              placeholder="Your name here..."
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
              style={{ fontSize: 18, padding: '16px 20px' }}
            />
            <div style={{ flex: 1 }} />
            <button
              className="btn"
              style={{ background: 'white', color: '#9B5DE5', width: '100%', fontSize: 18 }}
              onClick={next}
              disabled={!name.trim()}
            >
              Next →
            </button>
          </div>
        )}

        {/* AVATAR */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 20 }} className="slide-up">
            <div style={{ color: 'white', marginTop: 20 }}>
              <div style={{ fontSize: 48 }}>🐾</div>
              <h2 style={{ fontSize: 32, fontWeight: 800, marginTop: 8 }}>Pick your avatar</h2>
              <p style={{ opacity: 0.85, marginTop: 4, fontSize: 15 }}>Choose your animal companion for the journey</p>
            </div>

            {/* Selected avatar preview */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 64,
                background: 'rgba(255,255,255,0.2)',
                width: 100, height: 100,
                borderRadius: 28,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                animation: 'bounce-in 0.4s ease'
              }}>
                {avatar}
              </div>
              <div style={{ color: 'white', fontWeight: 700, marginTop: 8, fontSize: 18 }}>{name}</div>
            </div>

            {/* Avatar grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {AVATARS.map(a => (
                <button key={a} onClick={() => setAvatar(a)} style={{
                  fontSize: 36, padding: '12px',
                  background: avatar === a ? 'white' : 'rgba(255,255,255,0.15)',
                  border: avatar === a ? '3px solid white' : '3px solid transparent',
                  borderRadius: 16,
                  cursor: 'pointer',
                  transform: avatar === a ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.2s ease'
                }}>
                  {a}
                </button>
              ))}
            </div>

            <button
              className="btn"
              style={{ background: 'white', color: '#06D6A0', width: '100%', fontSize: 18 }}
              onClick={next}
            >
              This is me! {avatar}
            </button>
          </div>
        )}

        {/* ACCOUNT */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 16 }} className="slide-up">
            <div style={{ color: 'white', marginTop: 20 }}>
              <div style={{ fontSize: 48 }}>🔐</div>
              <h2 style={{ fontSize: 32, fontWeight: 800, marginTop: 8 }}>Create account</h2>
              <p style={{ opacity: 0.85, marginTop: 4, fontSize: 15 }}>Your progress is saved securely</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                className="input"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <input
                className="input"
                type="password"
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <div style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
                ⚠️ {error}
              </div>
            )}
            <div style={{ flex: 1 }} />
            <button
              className="btn"
              style={{ background: 'white', color: '#FFC107', width: '100%', fontSize: 18 }}
              onClick={handleCreateAccount}
              disabled={loading || !email || !password}
            >
              {loading ? <span className="spinner" style={{ width: 20, height: 20, borderTopColor: '#FFC107' }} /> : 'Create Account ✨'}
            </button>
          </div>
        )}

        {/* DONE */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 24, textAlign: 'center' }} className="bounce-in">
            <div style={{ fontSize: 80 }}>🎉</div>
            <div>
              <h2 style={{ color: 'white', fontSize: 36, fontWeight: 800 }}>You're all set,<br />{name}!</h2>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 17, marginTop: 10, lineHeight: 1.6 }}>
                Your journey starts at home 🏠<br />Find 5 objects and photograph them to earn your first XP!
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ fontSize: 32, background: 'rgba(255,255,255,0.2)', borderRadius: 16, padding: '10px 16px' }}>🏠 Zone 1</div>
              <div style={{ fontSize: 32, background: 'rgba(255,255,255,0.2)', borderRadius: 16, padding: '10px 16px' }}>🔥 15 days</div>
            </div>
            <button className="btn" style={{ background: 'white', color: '#9B5DE5', width: '100%', fontSize: 18 }} onClick={onComplete}>
              Let's Go! 🚀
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
