import React from 'react'

export function ClickTrack({ beatIndex, bpm, currentBar, totalBars, isOn, isIdle, onToggle }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: '#0f0f1e', border: `1px solid ${isIdle ? '#1a1a2e' : '#2a2a3a'}`,
      borderRadius: 8, padding: '8px 14px',
      transition: 'border-color 0.4s',
    }}>

      {/* Beat dots or idle glyph */}
      {isIdle ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 80 }}>
          <span style={{
            fontFamily: "'EmojiFont', 'Segoe UI Emoji', sans-serif",
            fontSize: '1.4rem', lineHeight: 1,
            color: '#6060a0',
            userSelect: 'none',
          }}>t</span>
          <span style={{
            fontFamily: "'VCR', monospace",
            fontSize: '0.65rem', color: '#6060a0',
            letterSpacing: '0.1em',
          }}>IDLE</span>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2, 3].map(i => {
            const active = i === beatIndex
            const down   = i === 0
            return (
              <div key={i} style={{
                width: 12, height: 12, borderRadius: '50%',
                background: active ? (down ? '#22c55e' : '#55bb88') : '#1e1e35',
                border: `1px solid ${active ? (down ? '#22c55e' : '#55bb88') : '#2a2a3a'}`,
                boxShadow: active && down ? '0 0 10px #22c55e99' : 'none',
                transition: 'background 0.05s',
              }} />
            )
          })}
        </div>
      )}

      {/* BPM */}
      <span style={{ fontFamily: "'VCR', monospace", fontSize: '0.75rem', color: isIdle ? '#2a2a4a' : '#e0e0f0', transition: 'color 0.4s' }}>
        <span style={{ fontSize: '1rem', color: isIdle ? '#2a2a4a' : '#a855f7', textShadow: isIdle ? 'none' : '0 0 10px #a855f777' }}>{bpm}</span>
        {' '}BPM
      </span>

      {/* Bar counter */}
      <span style={{ fontFamily: "'VCR', monospace", fontSize: '0.7rem', color: isIdle ? '#2a2a4a' : '#555', transition: 'color 0.4s', marginLeft: 4 }}>
        BAR{' '}
        <span style={{ color: isIdle ? '#2a2a4a' : '#888', fontSize: '0.85rem' }}>{isIdle ? '—' : (currentBar || '—')}</span>
        {!isIdle && totalBars > 0 && <span style={{ color: '#444' }}> / {totalBars}</span>}
      </span>

      {/* Click toggle */}
      <button onClick={onToggle} style={{
        marginLeft: 'auto', padding: '5px 14px', borderRadius: 20,
        border: `1px solid ${isOn && !isIdle ? '#22c55e66' : '#2a2a3a'}`,
        background: isOn && !isIdle ? '#0a1a10' : '#131328',
        color: isOn && !isIdle ? '#22c55e' : '#333',
        fontFamily: "'VCR', monospace",
        fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer',
        letterSpacing: '0.08em',
        transition: 'all 0.2s',
      }}>
        CLICK {isOn ? 'ON' : 'OFF'}
      </button>
    </div>
  )
}
