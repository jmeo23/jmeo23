import React from 'react'
import { usePerformEngine } from '../lib/usePerformEngine.js'
import { ClickTrack }       from './ClickTrack.jsx'
import { SectionCard }      from './SectionCard.jsx'
import { CountdownOverlay } from './CountdownOverlay.jsx'
import { DmxPanel }         from './DmxPanel.jsx'

export function BreakView({ brk }) {
  React.useEffect(() => {
    if (brk?.dmxScene) window.phr0st?.sendCommand('dmx:rawScene', { scene: brk.dmxScene })
  }, [brk?.id])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, padding: 20 }}>
      <div style={{ fontFamily: "'VCR', monospace", fontSize: '0.6rem', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.14em' }}>Short Break</div>
      <div style={{ fontFamily: "'Pix32', monospace", fontSize: '1.8rem', color: '#f59e0b', letterSpacing: '0.04em' }}>{brk.name}</div>
      <div style={{ fontFamily: "'VCR', monospace", fontSize: '0.8rem', color: '#9a7000' }}>{brk.durationMins} minutes</div>
      <DmxPanel scene={brk.dmxScene} sceneName="break" />
    </div>
  )
}

export function PerformView({ song, onStateChange, nextSong, onAutoAdvance }) {
  const {
    smState, currentBar, totalBars, beatIndex,
    clickOn, overlay, countInDisplay, dotsFilled, isLooping,
    autoPlay, setAutoPlay, startSong, stopSong, handleCancel,
    getSectionStatus, toggleClick, jumpToSection, toggleLoop,
    currentScene, sceneName,
  } = usePerformEngine({ song, onStateChange, nextSong, onAutoAdvance })

  if (!song) return <div style={{ padding: 20, color: '#555' }}>No song selected</div>
  if (song.type === 'break') return <BreakView brk={song} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, height: '100%', overflow: 'hidden', position: 'relative' }}>
      {isLooping && (
        <div style={{
          flexShrink: 0, textAlign: 'center', padding: '10px 0', borderRadius: 8,
          background: '#1a0a2e', border: '1px solid #a855f766', boxShadow: '0 0 18px #a855f744',
          fontFamily: "'VCR', monospace", fontSize: '1.15rem', letterSpacing: '0.22em',
          color: '#a855f7', textTransform: 'uppercase',
        }}>↻ Live Looping</div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: "'Pix32', monospace", fontSize: '1.3rem', color: '#e0e0f0', letterSpacing: '0.02em' }}>{song.title}</div>
          <div style={{ fontSize: '0.7rem', color: '#555', marginTop: 2 }}>{song.artist}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {[`${song.bpm} BPM`, `${song.timeSignature.join('/')}`, song.key, `${song.sections.length} sections`].map(t => (
              <span key={t} style={{ fontFamily: "'VCR', monospace", fontSize: '0.58rem', padding: '2px 8px', borderRadius: 10, border: '1px solid #2a2a3a', color: '#666', background: '#131328' }}>{t}</span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setAutoPlay(v => !v)}
            style={{
              padding: '8px 16px', borderRadius: 20, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
              border: `1px solid ${autoPlay ? '#a855f766' : '#2a2a3a'}`,
              background: autoPlay ? '#1a0a2a' : 'transparent',
              color: autoPlay ? '#a855f7' : '#444',
            }}
          >AUTO</button>
          <button
            onClick={smState === 'idle' ? startSong : stopSong}
            style={{
              padding: '8px 20px', borderRadius: 20, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
              border: `1px solid ${smState === 'idle' ? '#22c55e66' : '#ef444466'}`,
              background: smState === 'idle' ? '#0a1a10' : '#1a0808',
              color: smState === 'idle' ? '#22c55e' : '#ef4444',
            }}
          >{smState === 'idle' ? 'Start Song' : 'Stop'}</button>
        </div>
      </div>

      <ClickTrack
        beatIndex={beatIndex}
        bpm={song.bpm}
        currentBar={currentBar}
        totalBars={totalBars}
        isOn={clickOn}
        isIdle={smState === 'idle'}
        onToggle={toggleClick}
      />

      <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 260, flexShrink: 0, overflowY: 'auto' }}>
          <div style={{ fontSize: '0.6rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, flexShrink: 0 }}>Song Sections</div>
          {song.sections.map((s, i) => (
            <SectionCard
              key={s.id}
              section={s}
              index={i}
              status={getSectionStatus(i)}
              currentBar={currentBar}
              onTap={() => jumpToSection(i)}
              onLoopToggle={() => toggleLoop(i)}
            />
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <DmxPanel scene={currentScene} sceneName={sceneName} />
        </div>
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
