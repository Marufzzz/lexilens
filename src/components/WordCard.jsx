export default function WordCard({ word, index, onCamera, delay = 0 }) {
  return (
    <div
      className="slide-up"
      style={{
        background: 'white',
        borderRadius: 20,
        padding: '16px 18px',
        boxShadow: '0 3px 16px rgba(0,0,0,0.06)',
        border: `2px solid ${word.mastered ? 'var(--green)' : '#F0E8E0'}`,
        animationDelay: `${delay}s`,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {word.mastered && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(6,214,160,0.05), rgba(6,214,160,0.1))',
          pointerEvents: 'none'
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Word info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Baloo 2', cursive",
            fontSize: 20,
            fontWeight: 700,
            color: word.mastered ? 'var(--green-dark)' : 'var(--text)',
            marginBottom: 4
          }}>
            {word.word}
          </div>
          <p style={{
            fontSize: 13,
            color: 'var(--text-soft)',
            lineHeight: 1.5,
            margin: 0
          }}>
            {word.definition}
          </p>
          {(word.bangla_definition || word.bangla_hint) && (
            <p style={{
              fontSize: 13,
              color: 'var(--purple)',
              lineHeight: 1.5,
              marginTop: 4,
              fontWeight: 500
            }}>
              {word.bangla_definition || word.bangla_hint}
            </p>
          )}
        </div>

        {/* Status button */}
        {!word.mastered ? (
          <button
            onClick={() => onCamera(word, index)}
            style={{
              width: 46, height: 46,
              background: 'linear-gradient(135deg, var(--orange), #F15BB5)',
              border: 'none', borderRadius: 14,
              fontSize: 20, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(255,107,53,0.35)',
              flexShrink: 0
            }}
          >
            📷
          </button>
        ) : (
          <div style={{
            width: 46, height: 46,
            background: 'var(--green-light)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0
          }}>
            ✅
          </div>
        )}
      </div>
    </div>
  )
}
