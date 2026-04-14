import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import useStore from './store/useStore'
import SplashScreen from './screens/SplashScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import HomeScreen from './screens/HomeScreen'
import CameraScreen from './screens/CameraScreen'
import MapScreen from './screens/MapScreen'
import ProfileScreen from './screens/ProfileScreen'
import BottomNav from './components/BottomNav'

export default function App() {
  const [appState, setAppState] = useState('splash')
  const [activeTab, setActiveTab] = useState('home')
  const [cameraWord, setCameraWord] = useState(null)
  const { setUser, loadProfile } = useStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadProfile(session.user.id).then(() => setAppState('app'))
      } else {
        setTimeout(() => setAppState('onboarding'), 2200)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user)
        loadProfile(session.user.id).then(() => setAppState('app'))
      } else if (event === 'SIGNED_OUT') {
        setAppState('onboarding')
        setActiveTab('home')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const openCamera = (wordData) => {
    setCameraWord(wordData)
    setActiveTab('camera')
  }

  const closeCamera = (success) => {
    setActiveTab('home')
    setCameraWord(null)
  }

  const handleOnboardingComplete = () => {
    setAppState('app')
  }

  if (appState === 'splash') return <SplashScreen />
  if (appState === 'onboarding') return <OnboardingScreen onComplete={handleOnboardingComplete} />

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{ display: activeTab === 'home' ? 'block' : 'none', height: '100%' }}>
          <HomeScreen onOpenCamera={openCamera} />
        </div>
        <div style={{ display: activeTab === 'map' ? 'block' : 'none', height: '100%' }}>
          <MapScreen />
        </div>
        <div style={{ display: activeTab === 'profile' ? 'block' : 'none', height: '100%' }}>
          <ProfileScreen />
        </div>
        {activeTab === 'camera' && (
          <CameraScreen word={cameraWord} onClose={closeCamera} />
        )}
      </div>
      {activeTab !== 'camera' && (
        <BottomNav active={activeTab} onChange={setActiveTab} />
      )}
    </div>
  )
}
