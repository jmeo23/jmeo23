import React, { useRef, useState, useCallback, useEffect } from 'react'
import { AudioEngine }        from '../audioEngine.js'
import { createStateMachine } from '../songStateMachine.js'
import { ClickTrack }         from './ClickTrack.jsx'
import { SectionCard }        from './SectionCard.jsx'
import { CountdownOverlay }   from './CountdownOverlay.jsx'
import { DmxPanel }           from './DmxPanel.jsx'

function BreakView({ brk }) {
  useEffect(() => {
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

export function PerformView({ song, onStateChange }) {
  const [smState,        setSmState]        = useState('idle')
  const [activeSection,  setActiveSection]  = useState(-1)
  const [currentBar,     setCurrentBar]     = useState(0)
  const [totalBars,      setTotalBars]      = useState(0)
  const [beatIndex,      setBeatIndex]      = useState(-1)
  const [clickOn,        setClickOn]        = useState(true)
  const [overlay,        setOverlay]        = useState({ mode: 'hidden' })
  const [countInDisplay, setCountInDisplay] = useState(null)
  const [dotsFilled,     setDotsFilled]     = useState(0)
  const [isLooping,      setIsLooping]      = useState(false)
  const [pendingSection, setPendingSection] = useState(-1)
  const [currentScene,   setCurrentScene]   = useState(null)
  const [sceneName,      setSceneName]      = useState('')

  useEffect(() => { onStateChange?.(smState) }, [smState])

  const actionRef = useRef({})
  actionRef.current = { startSong, stopSong, smState }

  useEffect(() => {
    const off = window.phr0st?.onStateUpdate(data => {
      if (data.event === 'midi:loopPad')
        smRef.current?.toggleLoop(smRef.current.activeSection)
      if (data.event === 'midi:startSong') {
        const { startSong, stopSong, smState } = actionRef.current
        smState === 'idle' ? startSong() : stopSong()
      }
    })
    return () => off?.()
  }, [])

  const smRef     = useRef(null)
  const engineRef = useRef(null)
  const dotsRef   = useRef(0)

  const handleBeat = useCallback((beatIdx) => {
    setBeatIndex(beatIdx)
    smRef.current?.onBeat()
  }, [])

  function startSong() {
    if (!song) return
    const sm = createStateMachine(song)
    smRef.current = sm
    dotsRef.current = 0

    sm.on('overlayShow', ({ mode, from, to }) => {
      dotsRef.current = 0
      setDotsFilled(0)
      setCountInDisplay(null)
      setPendingSection(to)
      setOverlay({
        mode,
        from: from >= 0 ? song.sections[from]?.name : '',
        to:   song.sections[to]?.name ?? '',
      })
    })
    sm.on('overlayHide',      ()            => setOverlay({ mode: 'hidden' }))
    sm.on('countInBeat',      (n)           => { dotsRef.current++; setDotsFilled(dotsRef.current); setCountInDisplay(n) })
    sm.on('sectionActivated', ({ index, section }) => {
      setPendingSection(-1)
      setActiveSection(index)
      setCurrentBar(1)
      setTotalBars(section.bars)
      setSmState('playing')
      setCurrentScene(song.dmxScenes[section.dmxScene] ?? null)
      setSceneName(section.dmxScene)
      window.phr0st?.sendCommand('countIn:stop', {})
      window.phr0st?.sendCommand('dmx:scene', { sceneName: section.dmxScene })
    })
    sm.on('barAdvanced',  ({ bar, totalBars: t }) => { setCurrentBar(bar); setTotalBars(t) })
    sm.on('loopChanged',  ({ isLooping: l })      => setIsLooping(l))
    sm.on('songEnded',    ()                      => {
      engineRef.current?.stop()
      setSmState('idle')
      setActiveSection(-1)
      setCurrentScene(null)
      setPendingSection(-1)
    })

    // forward count-in beat events to main for DMX
    sm.on('countInBeat', () => window.phr0st?.sendCommand('countIn:beat', {}))

    const engine = new AudioEngine({
      bpm: song.bpm, downbeatBuffer: null, upbeatBuffer: null,
      onBeat: handleBeat,
    })
    engine.setMuted(!clickOn)
    engineRef.current = engine

    window.phr0st?.sendCommand('song:load', { song })
    window.phr0st?.sendCommand('countIn:start', {})

    sm.startSong()
    engine.start()
    setSmState('songStart:prepBar')
  }

  function stopSong() {
    engineRef.current?.stop()
    smRef.current?.stop()
    setSmState('idle')
    setActiveSection(-1)
    setOverlay({ mode: 'hidden' })
    setBeatIndex(-1)
    setCurrentScene(null)
    setPendingSection(-1)
    window.phr0st?.sendCommand('countIn:stop', {})
  }

  function handleCancel() {
    window.phr0st?.sendCommand('countIn:stop', {})
    if (overlay.mode === 'sectionTransition') {
      smRef.current?.cancelToLoop()
      setOverlay({ mode: 'hidden' })
      setPendingSection(-1)
      setIsLooping(true)
      setCurrentBar(1)
    } else {
      smRef.current?.cancel()
      engineRef.current?.stop()
      setSmState('idle')
      setActiveSection(-1)
      setOverlay({ mode: 'hidden' })
      setPendingSection(-1)
    }
  }

  function getSectionStatus(idx) {
    if (smState === 'idle' || activeSection === -1) return 'idle'
    if (idx === activeSection && isLooping) return 'looping'
    if (idx === activeSection)              return 'active'
    if (idx === pendingSection)             return 'pending'
    if (idx < activeSection)               return 'done'
    return 'idle'
  }

  if (!song) return <div style={{ padding: 20, color: '#555' }}>No song selected</div>
  if (song.type === 'break') return <BreakView brk={song} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, height: '100%', overflow: 'hidden', position: 'relative' }}>
      {/* Live loop banner */}
      {isLooping && (
        <div style={{
          flexShrink: 0,
          textAlign: 'center',
          padding: '10px 0',
          borderRadius: 8,
          background: '#1a0a2e',
          border: '1px solid #a855f766',
          boxShadow: '0 0 18px #a855f744',
          fontFamily: "'VCR', monospace",
          fontSize: '1.15rem',
          letterSpacing: '0.22em',
          color: '#a855f7',
          textTransform: 'uppercase',
        }}>
          ↻ Live Looping
        </div>
      )}

      {/* Song header + Start/Stop */}
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
        <button
          onClick={smState === 'idle' ? startSong : stopSong}
          style={{
            padding: '8px 20px', borderRadius: 20, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
            border: `1px solid ${smState === 'idle' ? '#22c55e66' : '#ef444466'}`,
            background: smState === 'idle' ? '#0a1a10' : '#1a0808',
            color: smState === 'idle' ? '#22c55e' : '#ef4444',
          }}
        >
          {smState === 'idle' ? 'Start Song' : 'Stop'}
        </button>
      </div>

      {/* Click track */}
      <ClickTrack
        beatIndex={beatIndex}
        bpm={song.bpm}
        currentBar={currentBar}
        totalBars={totalBars}
        isOn={clickOn}
        isIdle={smState === 'idle'}
        onToggle={() => {
          const next = !clickOn
          setClickOn(next)
          engineRef.current?.setMuted(!next)
        }}
      />

      {/* Sections + DMX side by side */}
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
              onTap={() => { if (smState !== 'idle') smRef.current?.jumpToSection(i) }}
              onLoopToggle={() => smRef.current?.toggleLoop(i)}
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
