import { useRef, useState, useCallback, useEffect } from 'react'
import { AudioEngine }        from '../audioEngine.js'
import { createStateMachine } from '../songStateMachine.js'

export function usePerformEngine({ song, onStateChange, nextSong, onAutoAdvance }) {
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
  const [autoPlay,       setAutoPlay]       = useState(false)

  useEffect(() => { onStateChange?.(smState) }, [smState])

  const smRef               = useRef(null)
  const engineRef           = useRef(null)
  const dotsRef             = useRef(0)
  const autoPlayRef         = useRef(false)
  const pendingAutoStartRef = useRef(false)
  const actionRef           = useRef({})

  autoPlayRef.current       = autoPlay
  actionRef.current         = { startSong, stopSong, smState }

  useEffect(() => {
    const off = window.phr0st?.onStateUpdate(data => {
      if (data.event === 'midi:loopPad')
        smRef.current?.toggleLoop(smRef.current?.activeSection)
      if (data.event === 'midi:startSong') {
        const { startSong: start, stopSong: stop, smState: s } = actionRef.current
        s === 'idle' ? start() : stop()
      }
    })
    return () => off?.()
  }, [])

  useEffect(() => {
    if (pendingAutoStartRef.current && smState === 'idle') {
      pendingAutoStartRef.current = false
      startSong()
    }
  }, [song?.id])

  const handleBeat = useCallback((beatIdx) => {
    setBeatIndex(beatIdx)
    smRef.current?.onBeat()
  }, [])

  function startSong() {
    if (!song) return
    const sm = createStateMachine(song)
    smRef.current  = sm
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
    sm.on('songEnded', () => {
      engineRef.current?.stop()
      setSmState('idle')
      setActiveSection(-1)
      setCurrentScene(null)
      setPendingSection(-1)
      if (autoPlayRef.current && nextSong) {
        pendingAutoStartRef.current = true
        onAutoAdvance?.()
      }
    })
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
    pendingAutoStartRef.current = false
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
      pendingAutoStartRef.current = false
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

  function toggleClick() {
    const next = !clickOn
    setClickOn(next)
    engineRef.current?.setMuted(!next)
  }

  function jumpToSection(i) {
    if (smState !== 'idle') smRef.current?.jumpToSection(i)
  }

  function toggleLoop(i) {
    smRef.current?.toggleLoop(i)
  }

  return {
    smState, activeSection, currentBar, totalBars, beatIndex,
    clickOn, overlay, countInDisplay, dotsFilled, isLooping,
    pendingSection, currentScene, sceneName, autoPlay, setAutoPlay,
    startSong, stopSong, handleCancel, getSectionStatus,
    toggleClick, jumpToSection, toggleLoop,
  }
}
