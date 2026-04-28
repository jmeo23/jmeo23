import React from 'react'

// status: 'idle' | 'active' | 'looping' | 'pending' | 'done'
export function SectionCard({ section, index, status, currentBar, onTap, onLoopToggle }) {
  const colors = {
    active:  { border: '#22c55e', name: '#22c55e', fill: '#22c55e' },
    looping: { border: '#a855f7', name: '#a855f7', fill: '#a855f7' },
    pending: { border: '#f59e0b', name: '#f59e0b', fill: '#f59e0b' },
    idle:    { border: '#2a2a3a', name: '#777',    fill: '#2a2a4a' },
    done:    { border: '#1a1a2e', name: '#444',    fill: '#22c55e' },
  }[status] ?? { border: '#2a2a3a', name: '#777', fill: '#2a2a4a' }

  const pct = (status === 'active' || status === 'looping')
    ? Math.min(((currentBar - 1) / section.bars) * 100, 100)
    : status === 'done' ? 100 : 0

  return (
    <div
      onClick={onTap}
      style={{
        background: '#131328', border: `2px solid ${colors.border}`,
        borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
        opacity: status === 'done' ? 0.4 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '0.6rem', color: '#333', width: 16, fontWeight: 700 }}>{index + 1}</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: colors.name, flex: 1 }}>
          {section.name}
        </span>
        <span style={{ fontSize: '0.6rem', color: '#444' }}>
          {section.bars} bars
          {status === 'looping' && ' · LOOPING'}
          {status === 'pending' && ' · NEXT ↓'}
        </span>
        <span
          style={{ fontSize: '0.9rem', color: status === 'looping' ? '#a855f7' : '#2a2a3a', cursor: 'pointer', padding: '0 2px' }}
          onClick={(e) => { e.stopPropagation(); onLoopToggle() }}
        >↻</span>
      </div>
      <div style={{ marginTop: 6, height: 3, background: '#1e1e35', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: colors.fill, width: `${pct}%`, transition: 'width 0.3s linear', borderRadius: 2 }} />
      </div>
    </div>
  )
}
