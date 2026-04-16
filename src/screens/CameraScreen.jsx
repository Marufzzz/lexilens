import { useState, useRef, useEffect } from 'react'
import useStore from '../store/useStore'

// Compress image to max 512px and 70% quality before sending to AI
const compressImage = (base64) => new Promise((resolve) => {
  const img = new Image()
  img.onload = () => {
    const MAX = 512
    let { width, height } = img
    if (width > MAX || height > MAX) {
      if (width > height) { height = Math.round(height * MAX / width); width = MAX }
      else { width = Math.round(width * MAX / height); height = MAX }
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').drawImage(img, 0, 0, width, height)
    const compressed = canvas.toDataURL('image/jpeg', 0.7).split(',')[1]
    resolve(compressed)
  }
  img.onerror = () => resolve(base64) // fallback to original
  img.src = 'data:image/jpeg;base64,' + base64
})

export default function CameraScreen({ word, onClose }) {
  const [phase, setPhase] = useState('capture') // capture | preview | verifying | result
  const [imageBase64, setImageBase64] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [result, setResult] = useState(null)
  const inputRef = useRef()
  const timeoutRef = useRef()
  const { submitPhoto } = useStore()

  // Safety net: if stuck on verifying for >18s, force a timeout result
  useEffect(() => {
    if (phase === 'verifying') {
      timeoutRef.current = setTimeout(() => {
        setResult({ match: false, confidence: 0, hint: 'Verification timed out. Try again with a clearer photo!' })
        setPhase('result')
      }, 18000)
    }
    return () => clearTimeout(timeoutRef.current)
  }, [phase])

  if (!word) return null
  const { word: wordData, index } = word

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const fullBase64 = ev.target.result
      const base64 = fullBase64.split(',')[1]
      setImageBase64(base64)
      setImagePreview(fullBase64)
      setPhase('preview')
    }
    reader.readAsDataURL(file)
  }

  const handleVerify = async () => {
    setPhase('verifying')
    try {
      // Compress image before sending — reduces size from ~3MB to ~50KB
      const compressed = await compressImage(imageBase64)
      const res = await submitPhoto(index, compressed)
      clearTimeout(timeoutRef.current)
      setResult(res)
      setPhase('result')
    } catch (e) {
      clearTimeout(timeoutRef.current)
      setResult({ match: false, confidence: 0, hint: 'Something went wrong. Please try again!' })
      setPhase('result')
    }
  }

  const handleRetry = () => {
    setImageBase64(null)
    setImagePreview(null)
    setResult(null)
    setPhase('capture')
    if (inputRef.current) inputRef.current.value = ''
  }

  const ZONE_GRADIENT = [
    '', 'linear-gradient(135deg, #FF6B35, #F15BB5)',
    'linear-gradient(135deg, #06D6A0, #3A86FF)',
    'linear-gradient(135deg, #9B5DE5, #3A86FF)',
    'linear-gradient(135deg, #FFC107, #FF6B35)',
    'linear-gradient(135deg, #3A86FF, #9B5DE5)',
    'linear-gradient(135deg, #F15BB5, #9B5DE5)'
  ]

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#1A1A2E',
      display: 'flex', flexDirection: 'column',
      zIndex: 100
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 14,
        background: 'rgba(255,255,255,0.05)'
      }}>
        <button onClick={() => onClose(false)} style={{
          width: 38, height: 38,
          background: 'rgba(255,255,255,0.1)',
          border: 'none', borderRadius: 12,
          color: 'white', fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600 }}>FIND &amp; PHOTOGRAPH</div>
          <div style={{
            color: 'white', fontSize: 20,
            fontFamily: "'Baloo 2', cursive", fontWeight: 700
          }}>
            {wordData.emoji || '📷'} {wordData.word}
          </div>
        </div>
      </div>

      {/* Word definition card */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 16, padding: '12px 16px',
          display: 'flex', flexDirection: 'column', gap: 6
        }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Definition</div>
          <div style={{ color: 'white', fontSize: 14, lineHeight: 1.5, fontWeight: 500 }}>
            {wordData.definition}
          </div>
          {wordData.where_to_find && (
            <div style={{ color: '#FFC107', fontSize: 13, fontWeight: 600 }}>
              📍 {wordData.where_to_find}
            </div>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div style={{ flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>

        {/* CAPTURE phase */}
        {phase === 'capture' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }} className="fade-in">
            <div style={{
              width: 200, height: 200,
              border: '3px dashed rgba(255,255,255,0.3)',
              borderRadius: 28,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 12, color: 'rgba(255,255,255,0.5)'
            }}>
              <div style={{ fontSize: 56 }}>📷</div>
              <div style={{ fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
                Take a photo of<br />"{wordData.word}"
              </div>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="camera-input"
            />
            <label htmlFor="camera-input" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              background: 'linear-gradient(135deg, var(--orange), #F15BB5)',
              color: 'white', fontWeight: 700, fontSize: 18,
              padding: '18px 48px', borderRadius: 20,
              cursor: 'pointer', width: '100%',
              boxShadow: '0 6px 24px rgba(255,107,53,0.4)',
              fontFamily: "'Nunito', sans-serif"
            }}>
              📸 Open Camera
            </label>

            {/* OR upload option */}
            <label htmlFor="gallery-input" style={{
              color: 'rgba(255,255,255,0.5)', fontSize: 13,
              fontWeight: 600, cursor: 'pointer', textDecoration: 'underline'
            }}>
              or choose from gallery
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="gallery-input"
            />
          </div>
        )}

        {/* PREVIEW phase */}
        {phase === 'preview' && imagePreview && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }} className="pop-in">
            <img
              src={imagePreview}
              style={{
                width: '100%', maxHeight: 280,
                objectFit: 'cover',
                borderRadius: 20,
                border: '3px solid rgba(255,255,255,0.2)'
              }}
            />
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
              Looks good? Let the AI check it! 🤖
            </div>
            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              <button
                onClick={handleRetry}
                style={{
                  flex: 1, padding: '14px',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none', borderRadius: 16,
                  color: 'white', fontSize: 15, fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                🔄 Retake
              </button>
              <button
                onClick={handleVerify}
                style={{
                  flex: 2, padding: '14px',
                  background: 'linear-gradient(135deg, var(--purple), #3A86FF)',
                  border: 'none', borderRadius: 16,
                  color: 'white', fontSize: 15, fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(155,93,229,0.4)'
                }}
              >
                ✨ Verify with AI
              </button>
            </div>
          </div>
        )}

        {/* VERIFYING phase */}
        {phase === 'verifying' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }} className="fade-in">
            {imagePreview && (
              <img src={imagePreview} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 20, opacity: 0.5 }} />
            )}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, animation: 'spin 1s linear infinite', display: 'inline-block' }}>🔍</div>
              <div style={{ color: 'white', fontSize: 18, fontWeight: 700, marginTop: 12, fontFamily: "'Baloo 2', cursive" }}>
                AI is checking...
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 6 }}>
                Looking for "{wordData.word}" in your photo
              </div>
            </div>
          </div>
        )}

        {/* RESULT phase */}
        {phase === 'result' && result && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }} className="bounce-in">
            {imagePreview && (
              <img
                src={imagePreview}
                style={{
                  width: '100%', maxHeight: 220,
                  objectFit: 'cover', borderRadius: 20,
                  border: `3px solid ${result.match ? 'var(--green)' : 'var(--red)'}`
                }}
              />
            )}

            {/* Result card */}
            <div style={{
              width: '100%',
              background: result.match ? 'rgba(6,214,160,0.15)' : 'rgba(239,68,68,0.15)',
              border: `2px solid ${result.match ? 'var(--green)' : 'var(--red)'}44`,
              borderRadius: 20, padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 52 }}>
                {result.match ? '🎉' : '😅'}
              </div>
              <div style={{
                color: result.match ? 'var(--green)' : '#EF4444',
                fontSize: 24, fontWeight: 800, marginTop: 8,
                fontFamily: "'Baloo 2', cursive"
              }}>
                {result.match ? 'Great job!' : 'Not quite!'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
                {result.hint}
              </div>
              {result.match && (
                <div style={{
                  marginTop: 12,
                  background: 'rgba(6,214,160,0.2)',
                  borderRadius: 12, padding: '8px 16px',
                  color: 'var(--green)', fontWeight: 700, fontSize: 15
                }}>
                  +{[100,140,190,250,330,450][0]} XP earned! ⭐
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              {!result.match && (
                <button onClick={handleRetry} style={{
                  flex: 1, padding: '14px',
                  background: 'linear-gradient(135deg, var(--orange), #F15BB5)',
                  border: 'none', borderRadius: 16,
                  color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer'
                }}>
                  📸 Try Again
                </button>
              )}
              <button onClick={() => onClose(result.match)} style={{
                flex: 1, padding: '14px',
                background: result.match ? 'linear-gradient(135deg, var(--green), #3A86FF)' : 'rgba(255,255,255,0.1)',
                border: 'none', borderRadius: 16,
                color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer'
              }}>
                {result.match ? '🏠 Back Home' : '← Go Back'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ height: 20 }} />
    </div>
  )
}
