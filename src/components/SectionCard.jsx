import React from 'react'

// status: 'idle' | 'active' | 'looping' | 'pending' | 'done'
export function SectionCard({ section, index, status, currentBar, onTap, onLoopToggle }) {
  const colors = {
    active:  { border: '#22c55e66', name: '#22c55e', fill: '#22c55e', glow: '0 0 8px #22c55e44' },
    looping: { border: '#a855f766', name: '#a855f7', fill: '#a855f7', glow: '0 0 8px #a855f744' },
    pending: { border: '#f59e0b66', name: '#f59e0b', fill: '#f59e0b', glow: 'none' },
    idle:    { border: '#1e1e30',   name: '#4a4a6a', fill: '#2a2a4a', glow: 'none' },
    done:    { border: '#141424',   name: '#333',    fill: '#22c55e', glow: 'none' },
  }[status] ?? { border: '#1e1e30', name: '#4a4a6a', fill: '#2a2a4a', glow: 'none' }

  const pct = (status === 'active' || status === 'looping')
    ? Math.min(((currentBar - 1) / section.bars) * 100, 100)
    : status === 'done' ? 100 : 0

  return (
    <div
      onClick={onTap}
      style={{
        background: '#0f0f1e',
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: '9px 12px',
        cursor: 'pointer',
        opacity: status === 'done' ? 0.35 : 1,
        boxShadow: colors.glow,
        transition: 'box-shadow 0.2s, opacity 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: "'VCR', monospace", fontSize: '0.58rem', color: '#2a2a3a', width: 16, fontWeight: 700 }}>{index + 1}</span>
        <span style={{ fontFamily: "'Pix32', monospace", fontSize: '0.82rem', color: colors.name, flex: 1 }}>
          {section.name}
        </span>
        <span style={{ fontFamily: "'VCR', monospace", fontSize: '0.55rem', color: '#333', letterSpacing: '0.05em' }}>
          {section.bars}B
          {status === 'looping' && <span style={{ color: '#a855f7' }}> ↻</span>}
          {status === 'pending' && <span style={{ color: '#f59e0b' }}> ↓</span>}
        </span>
        <span
          style={{ fontSize: '0.95rem', color: status === 'looping' ? '#a855f7' : '#1e1e30', cursor: 'pointer', padding: '0 2px', transition: 'color 0.2s' }}
          onClick={(e) => { e.stopPropagation(); onLoopToggle() }}
        >↻</span>
      </div>
      <div style={{ marginTop: 7, height: 2, background: '#1a1a2e', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', background: colors.fill, width: `${pct}%`,
          transition: 'width 0.3s linear',
          borderRadius: 2,
          boxShadow: pct > 0 && status !== 'done' ? `0 0 6px ${colors.fill}88` : 'none',
        }} />
      </div>
    </div>
  )
}
