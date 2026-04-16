export default function WordCard({ word, index, onCamera, delay = 0 }) {
  return (
    <div
      className="slide-up"
      style={{
        background: 'white',
        borderRadius: 20,
        padding: '16px 20px',
        boxShadow: '0 3px 16px rgba(0,0,0,0.06)',
        border: `2px solid ${word.mastered ? 'var(--green)' : '#F0E8E0'}`,
        animationDelay: `${delay}s`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14
      }}
    >
      <span style={{
        fontFamily: "'Baloo 2', cursive",
        fontSize: 22,
        fontWeight: 700,
        color: word.mastered ? 'var(--green-dark)' : 'var(--text)'
      }}>
        {word.word}
      </span>

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
  )
}
