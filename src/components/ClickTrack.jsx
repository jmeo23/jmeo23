import React from 'react'

export function ClickTrack({ beatIndex, bpm, currentBar, totalBars, isOn, onToggle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0f0f1e', border: '1px solid #1a1a2e', borderRadius: 8, padding: '8px 12px' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0,1,2,3].map(i => {
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
      <span style={{ color: '#555', fontSize: '0.7rem' }}>
        <span style={{ color: '#e0e0f0', fontWeight: 700 }}>{bpm}</span> BPM
      </span>
      <span style={{ color: '#444', fontSize: '0.7rem', marginLeft: 4 }}>
        Bar <span style={{ color: '#888', fontWeight: 700 }}>{currentBar || '—'}</span>
        {totalBars > 0 && ` / ${totalBars}`}
      </span>
      <button onClick={onToggle} style={{
        marginLeft: 'auto', padding: '5px 14px', borderRadius: 20,
        border: `1px solid ${isOn ? '#22c55e66' : '#2a2a3a'}`,
        background: isOn ? '#0a1a10' : '#131328',
        color: isOn ? '#22c55e' : '#444',
        fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
      }}>
        Click {isOn ? 'ON' : 'OFF'}
      </button>
    </div>
  )
}
