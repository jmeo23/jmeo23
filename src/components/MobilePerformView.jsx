import React, { useState } from 'react'
import { usePerformEngine } from '../lib/usePerformEngine.js'
import { BreakView }        from './PerformView.jsx'
import { CountdownOverlay } from './CountdownOverlay.jsx'
import { DmxPanel }         from './DmxPanel.jsx'

export function MobilePerformView({ song, onStateChange, nextSong, onAutoAdvance }) {
  const [dmxOpen, setDmxOpen] = useState(false)

  const {
    smState, activeSection, currentBar,
    clickOn, overlay, countInDisplay, dotsFilled, isLooping,
    currentScene, sceneName,
    startSong, stopSong, handleCancel, getSectionStatus,
    toggleClick, jumpToSection, toggleLoop,
  } = usePerformEngine({ song, onStateChange, nextSong, onAutoAdvance })

  if (!song) return <div style={{ padding: 20, color: '#555' }}>No song selected</div>
  if (song.type === 'break') return <BreakView brk={song} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', background: '#0d0d14' }}>

      {/* Scrollable sections */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 4px', display: 'flex', flexDirection: 'column', gap: 7 }}>

        {isLooping && (
          <div style={{
            textAlign: 'center', padding: '10px 0', borderRadius: 10, flexShrink: 0,
            background: '#1a0a2e', border: '1px solid #a855f766',
            fontFamily: "'VCR', monospace", fontSize: '1rem',
            letterSpacing: '0.22em', color: '#a855f7', textTransform: 'uppercase',
          }}>↻ Live Looping</div>
        )}

        {song.sections.map((s, i) => {
          const status = getSectionStatus(i)
          const colors = {
            active:  { border: '#22c55e66', name: '#22c55e', fill: '#22c55e', bg: '#091409' },
            looping: { border: '#a855f766', name: '#a855f7', fill: '#a855f7', bg: '#0f0a1e' },
            pending: { border: '#f59e0b55', name: '#f59e0b', fill: '#f59e0b', bg: '#0f0f1e' },
            idle:    { border: '#1e1e30',   name: '#4a4a6a', fill: '#2a2a4a', bg: '#0f0f1e' },
            done:    { border: '#141424',   name: '#333',    fill: '#22c55e', bg: '#0f0f1e' },
          }[status] ?? { border: '#1e1e30', name: '#4a4a6a', fill: '#2a2a4a', bg: '#0f0f1e' }

          const isActive = status === 'active' || status === 'looping'
          const pct = isActive
            ? Math.min(((currentBar - 1) / s.bars) * 100, 100)
            : status === 'done' ? 100 : 0

          return (
            <div
              key={s.id}
              onClick={() => jumpToSection(i)}
              style={{
                borderRadius: 12, padding: '13px 14px 11px', flexShrink: 0,
                border: `1px solid ${colors.border}`, background: colors.bg,
                opacity: status === 'done' ? 0.3 : 1,
                boxShadow: isActive ? `0 0 10px ${colors.fill}33` : 'none',
                cursor: smState !== 'idle' ? 'pointer' : 'default',
                transition: 'box-shadow 0.2s, opacity 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: "'VCR', monospace", fontSize: '0.6rem', color: '#2a2a4a', width: 14, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontFamily: "'Pix32', monospace", fontSize: '1.05rem', fontWeight: 700, color: colors.name, flex: 1 }}>{s.name}</span>
                <span style={{ fontFamily: "'VCR', monospace", fontSize: '0.65rem', color: '#444' }}>
                  {isActive ? `bar ${currentBar}/${s.bars}` : `${s.bars}B`}
                </span>
                <div
                  onClick={e => { e.stopPropagation(); toggleLoop(i) }}
                  style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    border: `1px solid ${status === 'looping' ? '#a855f766' : '#2a2a4a'}`,
                    background: status === 'looping' ? '#1a0a2a' : 'transparent',
                    color: status === 'looping' ? '#a855f7' : '#2a2a4a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem', cursor: 'pointer',
                    transition: 'color 0.2s, border-color 0.2s',
                  }}
                >↻</div>
              </div>
              <div style={{ height: 3, background: '#1a1a2e', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
                <div style={{
                  height: '100%', width: `${pct}%`, background: colors.fill, borderRadius: 2,
                  transition: 'width 0.3s linear',
                  boxShadow: pct > 0 && status !== 'done' ? `0 0 6px ${colors.fill}88` : 'none',
                }} />
              </div>
            </div>
          )
        })}

        {/* DMX collapsible */}
        <div style={{ flexShrink: 0 }}>
          <div
            onClick={() => setDmxOpen(v => !v)}
            style={{
              padding: '8px 12px', borderRadius: 8, border: '1px solid #1e1e3a',
              background: '#0f0f1e', color: '#444', fontSize: '0.65rem',
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
            }}
          >
            <span>{dmxOpen ? '▼' : '▶'}</span>
            <span>DMX Scene{sceneName ? ` — ${sceneName}` : ''}</span>
          </div>
          {dmxOpen && <div style={{ marginTop: 6 }}><DmxPanel scene={currentScene} sceneName={sceneName} /></div>}
        </div>

      </div>

      {/* Fixed bottom bar */}
      <div style={{
        background: '#13132a', borderTop: '2px solid #1e1e3a',
        padding: '10px 10px 14px', display: 'flex', gap: 8, alignItems: 'center',
        flexShrink: 0,
      }}>
        <button
          onClick={toggleClick}
          style={{
            width: 56, height: 56, borderRadius: 14, flexShrink: 0, cursor: 'pointer',
            border: `1px solid ${clickOn ? '#a855f744' : '#2a2a3a'}`,
            background: 'transparent',
            color: clickOn ? '#a855f7' : '#555',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
          }}
        >
          <span style={{ fontSize: '1rem' }}>♩</span>
          <span style={{ fontSize: '0.6rem', fontFamily: 'monospace' }}>CLK</span>
        </button>

        <button
          onClick={smState === 'idle' ? startSong : stopSong}
          style={{
            flex: 2, padding: '17px 0', borderRadius: 16, fontWeight: 700, fontSize: '0.95rem',
            border: `1px solid ${smState === 'idle' ? '#22c55e66' : '#ef444466'}`,
            background: smState === 'idle' ? '#0a1a10' : '#1a0808',
            color: smState === 'idle' ? '#22c55e' : '#ef4444',
            boxShadow: smState === 'idle' ? '0 0 12px #22c55e22' : 'none',
            cursor: 'pointer',
          }}
        >
          {smState === 'idle' ? '▶ Start Song' : '■ Stop'}
        </button>

        <button
          onClick={() => { if (isLooping) toggleLoop(activeSection) }}
          style={{
            width: 56, height: 56, borderRadius: 14, flexShrink: 0,
            border: `1px solid ${isLooping ? '#a855f766' : '#1e1e3a'}`,
            background: isLooping ? '#1a0a2a' : 'transparent',
            color: isLooping ? '#a855f7' : '#2a2a4a',
            fontSize: '1.3rem', cursor: isLooping ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >↻</button>
      </div>

      <CountdownOverlay
        mode={overlay.mode}
        from={overlay.from}
        to={overlay.to}
        displayNum={countInDisplay}
        dotsFilled={dotsFilled}
        onCancel={handleCancel}
      />
    </div>
  )
}
