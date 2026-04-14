import { useState } from 'react'

export default function WordCard({ word, index, onCamera, delay = 0 }) {
  const [expanded, setExpanded] = useState(false)

  const statusColor = word.mastered ? 'var(--green)' : 'var(--orange)'
  const statusBg = word.mastered ? 'var(--green-light)' : 'var(--orange-light)'

  return (
    <div
      className="slide-up"
      style={{
        background: 'white',
        borderRadius: 20,
        padding: '16px 18px',
        boxShadow: '0 3px 16px rgba(0,0,0,0.06)',
        border: `2px solid ${word.mastered ? 'var(--green)' : '#F0E8E0'}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        animationDelay: `${delay}s`,
        position: 'relative',
        overflow: 'hidden'
      }}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Mastered shimmer overlay */}
      {word.mastered && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(6,214,160,0.05), rgba(6,214,160,0.1))',
          pointerEvents: 'none'
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Emoji */}
        <div style={{
          width: 52, height: 52,
          background: statusBg,
          borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, flexShrink: 0,
          position: 'relative'
        }}>
          {word.mastered ? '✅' : word.emoji || '📷'}
          {word.attempts > 0 && !word.mastered && (
            <div style={{
              position: 'absolute', top: -4, right: -4,
              background: 'var(--orange)', color: 'white',
              fontSize: 9, fontWeight: 700,
              width: 16, height: 16, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {word.attempts}
            </div>
          )}
        </div>

        {/* Word info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: "'Baloo 2', cursive",
              fontSize: 20,
              fontWeight: 700,
              color: word.mastered ? 'var(--green-dark)' : 'var(--text)'
            }}>
              {word.word}
            </span>
            {word.bangla_hint && (
              <span style={{
                fontSize: 12, color: 'var(--text-soft)', fontWeight: 500
              }}>
                {word.bangla_hint}
              </span>
            )}
          </div>
          <p style={{
            fontSize: 13, color: 'var(--text-soft)',
            lineHeight: 1.4, marginTop: 2,
            overflow: expanded ? 'visible' : 'hidden',
            display: expanded ? 'block' : '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical'
          }}>
            {word.definition}
          </p>
        </div>

        {/* Camera button OR Check */}
        {!word.mastered ? (
          <button
            onClick={e => { e.stopPropagation(); onCamera(word, index) }}
            style={{
              width: 46, height: 46,
              background: 'linear-gradient(135deg, var(--orange), #F15BB5)',
              border: 'none', borderRadius: 14,
              fontSize: 20, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(255,107,53,0.35)',
              flexShrink: 0,
              transition: 'transform 0.15s'
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            📷
          </button>
        ) : (
          <div style={{
            width: 46, height: 46,
            background: 'var(--green-light)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0
          }}>
            ✓
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          marginTop: 12, paddingTop: 12,
          borderTop: '1px dashed var(--border)'
        }} className="fade-in">
          <div style={{
            fontSize: 12, fontWeight: 700, color: 'var(--text-soft)',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6
          }}>
            Where to find it
          </div>
          <div style={{
            fontSize: 14, color: 'var(--text)',
            background: 'var(--bg)', borderRadius: 10,
            padding: '8px 12px', fontWeight: 500
          }}>
            📍 {word.where_to_find || 'Look around you!'}
          </div>
          {word.mastered && (
            <div style={{
              marginTop: 8,
              fontSize: 14, color: 'var(--green-dark)',
              background: 'var(--green-light)',
              borderRadius: 10, padding: '8px 12px',
              fontWeight: 600
            }}>
              🎉 Mastered! Great job!
            </div>
          )}
        </div>
      )}
    </div>
  )
}
