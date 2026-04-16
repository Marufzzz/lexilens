import { useState } from 'react'
import { AVATARS } from '../lib/gameData'
import useStore from '../store/useStore'

export default function OnboardingScreen({ onComplete }) {
  const [mode, setMode] = useState('welcome') // welcome | signup | signin
  const [step, setStep] = useState(0)         // signup sub-steps: 0=name 1=avatar 2=account
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('🦁')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signUp, signIn, setUser, loadProfile } = useStore()

  const clearError = () => setError('')

  // ── Sign Up ──────────────────────────────────────────────
  const handleSignUp = async () => {
    if (!email || !password || password.length < 6) {
      setError('Enter a valid email and password (min 6 chars)')
      return
    }
    setLoading(true); clearError()
    try {
      const key = import.meta.env.VITE_GROQ_API_KEY || ''
      await signUp(email, password, name, avatar, key)
      onComplete()
    } catch (e) {
      setError(e.message || 'Sign up failed. Try again.')
    } finally { setLoading(false) }
  }

  // ── Sign In ──────────────────────────────────────────────
  const handleSignIn = async () => {
    if (!email || !password) { setError('Please enter email and password'); return }
    setLoading(true); clearError()
    try {
      const user = await signIn(email, password)
      setUser(user)
      await loadProfile(user.id)
      onComplete()
    } catch (e) {
      setError(e.message || 'Wrong email or password.')
    } finally { setLoading(false) }
  }

  const BG = {
    welcome: 'linear-gradient(160deg,#FF6B35 0%,#F15BB5 50%,#9B5DE5 100%)',
    signup:  'linear-gradient(135deg,#9B5DE5,#3A86FF)',
    signin:  'linear-gradient(135deg,#06D6A0,#3A86FF)',
  }

  const BackBtn = ({ to }) => (
    <button onClick={() => { setMode(to); clearError() }}
      style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:12, width:36, height:36, color:'white', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
      ←
    </button>
  )

  const ErrBox = () => error ? (
    <div style={{ background:'rgba(255,255,255,0.2)', color:'white', padding:'10px 14px', borderRadius:12, fontSize:13, fontWeight:600 }}>
      ⚠️ {error}
    </div>
  ) : null

  // ── WELCOME ───────────────────────────────────────────────
  if (mode === 'welcome') return (
    <div style={{ height:'100%', background:BG.welcome, display:'flex', flexDirection:'column', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', width:300, height:300, background:'rgba(255,255,255,0.08)', borderRadius:'50%', top:-80, left:-80 }} />
      <div style={{ position:'absolute', width:200, height:200, background:'rgba(255,255,255,0.06)', borderRadius:'50%', bottom:40, right:-60 }} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20, padding:'0 24px', position:'relative' }} className="pop-in">
        <div style={{ fontSize:80, animation:'float 3s ease-in-out infinite' }}>🔍</div>
        <div style={{ textAlign:'center' }}>
          <h1 style={{ fontFamily:"'Baloo 2',cursive", fontSize:44, fontWeight:800, color:'white', letterSpacing:-1 }}>LexiLens</h1>
          <p style={{ color:'rgba(255,255,255,0.85)', fontSize:16, fontWeight:600, marginTop:6 }}>Learn words. Explore your world. 🌍</p>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center' }}>
          {['📸 Photo Quests','🔥 Daily Streaks','🗺️ Zone Unlocks','⭐ Level Up'].map(t => (
            <span key={t} style={{ background:'rgba(255,255,255,0.2)', color:'white', fontSize:13, fontWeight:700, padding:'6px 14px', borderRadius:100 }}>{t}</span>
          ))}
        </div>
      </div>
      <div style={{ padding:'0 24px 48px', display:'flex', flexDirection:'column', gap:12 }}>
        <button className="btn" style={{ background:'white', color:'#FF6B35', width:'100%', fontSize:18 }}
          onClick={() => { setMode('signup'); setStep(0) }}>
          Get Started 🚀
        </button>
        <button className="btn" style={{ background:'rgba(255,255,255,0.15)', color:'white', width:'100%', fontSize:16, border:'2px solid rgba(255,255,255,0.4)' }}
          onClick={() => setMode('signin')}>
          I already have an account
        </button>
      </div>
    </div>
  )

  // ── SIGN IN ───────────────────────────────────────────────
  if (mode === 'signin') return (
    <div style={{ height:'100%', background:BG.signin, display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'20px 20px 0', display:'flex', alignItems:'center', gap:12 }}>
        <BackBtn to="welcome" />
        <span style={{ color:'white', fontWeight:700, fontSize:16 }}>Sign In</span>
      </div>
      <div style={{ flex:1, padding:'24px', display:'flex', flexDirection:'column', gap:16 }} className="slide-up">
        <div style={{ color:'white', marginTop:8 }}>
          <div style={{ fontSize:48 }}>👋</div>
          <h2 style={{ fontFamily:"'Baloo 2',cursive", fontSize:32, fontWeight:800, marginTop:8 }}>Welcome back!</h2>
          <p style={{ opacity:0.85, fontSize:15, marginTop:4 }}>Continue your word adventure</p>
        </div>
        <input className="input" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSignIn()} />
        <ErrBox />
        <div style={{ flex:1 }} />
        <button className="btn" style={{ background:'white', color:'#06D6A0', width:'100%', fontSize:18 }}
          onClick={handleSignIn} disabled={loading || !email || !password}>
          {loading ? <span className="spinner" style={{ width:20, height:20, borderTopColor:'#06D6A0' }} /> : 'Sign In →'}
        </button>
        <button style={{ background:'none', border:'none', color:'rgba(255,255,255,0.8)', fontSize:14, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontWeight:600 }}
          onClick={() => { setMode('signup'); setStep(0); clearError() }}>
          Don't have an account? Sign up
        </button>
      </div>
    </div>
  )

  // ── SIGN UP steps ─────────────────────────────────────────
  return (
    <div style={{ height:'100%', background:BG.signup, display:'flex', flexDirection:'column' }}>
      {/* Header with back + progress */}
      <div style={{ padding:'20px 20px 0', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => step === 0 ? (setMode('welcome'), clearError()) : setStep(s => s-1)}
          style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:12, width:36, height:36, color:'white', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          ←
        </button>
        <div style={{ flex:1, display:'flex', gap:5 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ height:6, flex: i<=step ? 2 : 1, background: i<=step ? 'white' : 'rgba(255,255,255,0.3)', borderRadius:3, transition:'all 0.3s' }} />
          ))}
        </div>
      </div>

      <div style={{ flex:1, padding:'20px 24px 40px', display:'flex', flexDirection:'column' }}>

        {/* Step 0 — Name */}
        {step === 0 && (
          <div style={{ display:'flex', flexDirection:'column', flex:1, gap:18 }} className="slide-up">
            <div style={{ color:'white', marginTop:10 }}>
              <div style={{ fontSize:48 }}>👋</div>
              <h2 style={{ fontFamily:"'Baloo 2',cursive", fontSize:32, fontWeight:800, marginTop:8 }}>What's your name?</h2>
              <p style={{ opacity:0.85, marginTop:4, fontSize:15 }}>This is how you'll appear on the leaderboard</p>
            </div>
            <input className="input" placeholder="Your name here..." value={name} maxLength={20}
              onChange={e => setName(e.target.value)} style={{ fontSize:18, padding:'16px 20px' }}
              onKeyDown={e => e.key === 'Enter' && name.trim() && setStep(1)} />
            <div style={{ flex:1 }} />
            <button className="btn" style={{ background:'white', color:'#9B5DE5', width:'100%', fontSize:18 }}
              onClick={() => setStep(1)} disabled={!name.trim()}>
              Next →
            </button>
            <button style={{ background:'none', border:'none', color:'rgba(255,255,255,0.8)', fontSize:14, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontWeight:600 }}
              onClick={() => { setMode('signin'); clearError() }}>
              Already have an account? Sign in
            </button>
          </div>
        )}

        {/* Step 1 — Avatar */}
        {step === 1 && (
          <div style={{ display:'flex', flexDirection:'column', flex:1, gap:14 }} className="slide-up">
            <div style={{ color:'white', marginTop:10 }}>
              <div style={{ fontSize:48 }}>🐾</div>
              <h2 style={{ fontFamily:"'Baloo 2',cursive", fontSize:32, fontWeight:800, marginTop:8 }}>Pick your avatar</h2>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:52, background:'rgba(255,255,255,0.2)', width:84, height:84, borderRadius:22, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>{avatar}</div>
              <div style={{ color:'white', fontWeight:700, marginTop:6, fontSize:16 }}>{name}</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
              {AVATARS.map(a => (
                <button key={a} onClick={() => setAvatar(a)} style={{ fontSize:30, padding:'10px', background: avatar===a ? 'white' : 'rgba(255,255,255,0.15)', border: avatar===a ? '3px solid white' : '3px solid transparent', borderRadius:13, cursor:'pointer', transform: avatar===a ? 'scale(1.08)' : 'scale(1)', transition:'all 0.2s' }}>{a}</button>
              ))}
            </div>
            <div style={{ flex:1 }} />
            <button className="btn" style={{ background:'white', color:'#3A86FF', width:'100%', fontSize:18 }} onClick={() => setStep(2)}>
              This is me! {avatar}
            </button>
          </div>
        )}

        {/* Step 2 — Account */}
        {step === 2 && (
          <div style={{ display:'flex', flexDirection:'column', flex:1, gap:14 }} className="slide-up">
            <div style={{ color:'white', marginTop:10 }}>
              <div style={{ fontSize:48 }}>🔐</div>
              <h2 style={{ fontFamily:"'Baloo 2',cursive", fontSize:32, fontWeight:800, marginTop:8 }}>Create account</h2>
              <p style={{ opacity:0.85, marginTop:4, fontSize:15 }}>Your progress is saved securely</p>
            </div>
            <input className="input" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
            <input className="input" type="password" placeholder="Password (min 6 characters)" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignUp()} />
            <ErrBox />
            <div style={{ flex:1 }} />
            <button className="btn" style={{ background:'white', color:'#FFC107', width:'100%', fontSize:18 }}
              onClick={handleSignUp} disabled={loading || !email || !password}>
              {loading ? <span className="spinner" style={{ width:20, height:20, borderTopColor:'#FFC107' }} /> : 'Create Account ✨'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
