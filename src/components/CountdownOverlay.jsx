import React from 'react'

// mode: 'hidden' | 'songStart' | 'sectionTransition'
// displayNum: 1|2|3|4|null  (null = silent half-rest beat)
// dotsFilled: 0-8
export function CountdownOverlay({ mode, from, to, displayNum, dotsFilled, onCancel }) {
  if (mode === 'hidden') return null

  return (
    <div style={S.overlay}>
      <div style={S.label}>
        {mode === 'songStart' ? 'Song Start: Count In' : 'Section Switch'}
      </div>

      {mode === 'sectionTransition' && (
        <div style={S.arrow}>
          <span style={S.fromText}>{from}</span>
          <span style={S.arrText}>→</span>
          <span style={S.toText}>{to}</span>
        </div>
      )}

      <div style={S.number}>{displayNum ?? ' '}</div>

      <div style={S.dotsRow}>
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            style={{
              ...S.dot,
              ...(i < dotsFilled - 1 ? S.dotDone : {}),
              ...(i === dotsFilled - 1 ? S.dotNow : {}),
            }}
          />
        ))}
      </div>

      <div style={S.hint}>SPD-SX loop pad cancels</div>

      <button style={S.cancelBtn} onClick={onCancel}>
        Cancel — keep looping
      </button>
    </div>
  )
}

const S = {
  overlay: {
    position: 'fixed', inset: 0, background: '#0d0d14ee',
    backdropFilter: 'blur(4px)', zIndex: 100,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  label:    { fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.2em' },
  arrow:    { display: 'flex', alignItems: 'center', gap: 16, fontSize: '1.1rem', fontWeight: 700 },
  fromText: { color: '#22c55e' },
  arrText:  { color: '#333', fontSize: '1.6rem' },
  toText:   { color: '#f59e0b' },
  number:   {
    fontSize: '9rem', fontWeight: 900, lineHeight: 1, color: '#22c55e',
    textShadow: '0 0 50px #22c55eaa, 0 0 100px #22c55e44', minWidth: '1ch', textAlign: 'center',
  },
  dotsRow:  { display: 'flex', gap: 12, marginTop: 4 },
  dot:      { width: 18, height: 18, borderRadius: '50%', border: '2px solid #2a2a3a', background: '#1e1e35' },
  dotDone:  { background: '#22c55e', borderColor: '#22c55e', boxShadow: '0 0 10px #22c55e88' },
  dotNow:   { background: '#f59e0b', borderColor: '#f59e0b', boxShadow: '0 0 14px #f59e0baa' },
  hint:     { fontSize: '0.65rem', color: '#444', marginTop: 6 },
  cancelBtn: {
    marginTop: 10, padding: '7px 22px', borderRadius: 20,
    border: '1px solid #ef444466', background: 'transparent',
    color: '#ef4444', fontSize: '0.7rem', cursor: 'pointer',
  },
}
