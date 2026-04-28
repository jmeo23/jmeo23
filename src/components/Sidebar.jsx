import React, { useState } from 'react'

export function Sidebar({ songs, breaks = [], loadedGig, activeSongId, onSelectSong, onOpenSets }) {
  const [collapsed, setCollapsed] = useState(new Set())

  function toggleCollapse(si) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(si) ? next.delete(si) : next.add(si)
      return next
    })
  }

  return (
    <div style={{ width: 200, borderRight: '1px solid #1a1a2e', display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0, background: '#0b0b18' }}>

      {/* Header */}
      <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid #12121f', flexShrink: 0 }}>
        <div style={{ fontFamily: "'VCR', monospace", fontSize: '0.55rem', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 2 }}>
          Tonight's Set
        </div>
        {loadedGig?.label && (
          <div style={{ fontSize: '0.68rem', color: '#6060a0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={loadedGig.label}>
            {loadedGig.label}
          </div>
        )}
      </div>

      {/* Empty state */}
      {!loadedGig ? (
        <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontFamily: "'VCR', monospace", fontSize: '0.58rem', color: '#2a2a4a', letterSpacing: '0.08em' }}>No set loaded</div>
          <button
            onClick={onOpenSets}
            style={{
              padding: '5px 10px', borderRadius: 6, border: '1px solid #a855f744',
              background: '#a855f711', color: '#a855f7',
              fontSize: '0.65rem', cursor: 'pointer', textAlign: 'left',
            }}
          >Open Sets →</button>
        </div>
      ) : (
        loadedGig.sets.map((set, si) => {
          const setSongs    = set.songs.map(id => songs.find(s => s.id === id) ?? breaks.find(b => b.id === id)).filter(Boolean)
          const isCollapsed = collapsed.has(si)
          const showHeader  = loadedGig.sets.length > 1

          return (
            <React.Fragment key={si}>
              {showHeader && (
                <div
                  onClick={() => toggleCollapse(si)}
                  style={{
                    padding: '7px 12px 6px',
                    background: '#13110a',
                    borderTop: si > 0 ? '2px solid #2a2000' : 'none',
                    borderBottom: '1px solid #2a2000',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', userSelect: 'none',
                  }}
                >
                  <span style={{ fontFamily: "'VCR', monospace", fontSize: '0.68rem', color: '#daa520', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{set.name}</span>
                  <span style={{ fontSize: '0.65rem', color: '#6a5a10' }}>{isCollapsed ? '▶' : '▼'}</span>
                </div>
              )}

              {!isCollapsed && setSongs.map((item, i) => {
                const isBreak = item.type === 'break'
                const active  = !isBreak && activeSongId === item.id
                if (isBreak) {
                  return (
                    <div key={`${item.id}-${i}`} style={{
                      padding: '5px 12px', fontSize: '0.65rem',
                      borderBottom: '1px solid #0f0f1c',
                      borderLeft: '3px solid #f59e0b44',
                      background: '#0f0d00',
                      color: '#f59e0b',
                      display: 'flex', alignItems: 'center', gap: 6,
                      userSelect: 'none',
                    }}>
                      <span style={{ fontFamily: "'VCR', monospace", fontSize: '0.55rem', color: '#9a7000', width: 14, flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                        <div style={{ fontFamily: "'VCR', monospace", fontSize: '0.5rem', color: '#9a7000', marginTop: 1 }}>{item.durationMins} min</div>
                      </div>
                    </div>
                  )
                }
                return (
                  <div key={item.id} onClick={() => onSelectSong(item.id)} style={{
                    padding: '7px 12px', fontSize: '0.75rem', cursor: 'pointer',
                    borderBottom: '1px solid #0f0f1c',
                    color: active ? '#22c55e' : '#a0a0c8',
                    background: active ? '#091409' : 'transparent',
                    borderLeft: `3px solid ${active ? '#22c55e' : 'transparent'}`,
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'background 0.15s, color 0.15s',
                  }}>
                    <span style={{ fontFamily: "'VCR', monospace", fontSize: '0.6rem', color: active ? '#22c55e55' : '#222', width: 14, flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                  </div>
                )
              })}
            </React.Fragment>
          )
        })
      )}
    </div>
  )
}
