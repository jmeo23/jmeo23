import React, { useState } from 'react'

export function Sidebar({ songs, loadedGig, activeSongId, onSelectSong, onOpenSets }) {
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
          const setSongs    = set.songs.map(id => songs.find(s => s.id === id)).filter(Boolean)
          const isCollapsed = collapsed.has(si)
          const showHeader  = loadedGig.sets.length > 1

          return (
            <React.Fragment key={si}>
              {showHeader && (
                <div
                  onClick={() => toggleCollapse(si)}
                  style={{
                    padding: '5px 12px 4px',
                    fontFamily: "'VCR', monospace", fontSize: '0.5rem',
                    color: '#daa520', textTransform: 'uppercase', letterSpacing: '0.12em',
                    borderTop: si > 0 ? '1px solid #12121f' : 'none',
                    marginTop: si > 0 ? 4 : 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', userSelect: 'none',
                  }}
                >
                  <span>{set.name}</span>
                  <span style={{ fontSize: '0.6rem', color: '#4a4a2a' }}>{isCollapsed ? '▶' : '▼'}</span>
                </div>
              )}

              {!isCollapsed && setSongs.map((song, i) => {
                const active = activeSongId === song.id
                return (
                  <div key={song.id} onClick={() => onSelectSong(song.id)} style={{
                    padding: '7px 12px', fontSize: '0.75rem', cursor: 'pointer',
                    borderBottom: '1px solid #0f0f1c',
                    color: active ? '#22c55e' : '#a0a0c8',
                    background: active ? '#091409' : 'transparent',
                    borderLeft: `3px solid ${active ? '#22c55e' : 'transparent'}`,
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'background 0.15s, color 0.15s',
                  }}>
                    <span style={{ fontFamily: "'VCR', monospace", fontSize: '0.6rem', color: active ? '#22c55e55' : '#222', width: 14, flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</span>
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
