# Mobile View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mobile-optimized Perform view for iPhone, triggered automatically at viewport widths under 520px, with large section cards and a fixed bottom bar (Start/Stop · Loop · CLK).

**Architecture:** Extract all perform logic into a `usePerformEngine` hook shared by the existing `PerformView` and a new `MobilePerformView`. `App.jsx` uses a `useMobileView` hook to branch between the desktop shell (unchanged) and a mobile shell with a simplified top bar and hamburger drawer.

**Tech Stack:** React 18, Vite, Vitest, inline styles (no CSS modules)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/useMobileView.js` | **Create** | Returns `true` when `window.innerWidth < 520`; re-checks on resize |
| `src/lib/usePerformEngine.js` | **Create** | All state, refs, audio engine, state machine, and callbacks extracted from PerformView |
| `src/components/PerformView.jsx` | **Modify** | Consume `usePerformEngine`; export `BreakView`; no behaviour change |
| `src/components/MobilePerformView.jsx` | **Create** | Mobile layout: full-screen section cards + fixed bottom bar |
| `src/App.jsx` | **Modify** | Branch on `isMobile`; add drawer state and mobile top bar |
| `test/useMobileView.test.js` | **Create** | Unit tests for `isMobileWidth` threshold logic |

---

## Task 1: `useMobileView` hook

**Files:**
- Create: `src/lib/useMobileView.js`
- Create: `test/useMobileView.test.js`

- [ ] **Step 1: Write the failing test**

Create `test/useMobileView.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { isMobileWidth } from '../src/lib/useMobileView.js'

describe('isMobileWidth', () => {
  it('returns true for widths under 520', () => {
    expect(isMobileWidth(390)).toBe(true)
    expect(isMobileWidth(375)).toBe(true)
    expect(isMobileWidth(519)).toBe(true)
  })

  it('returns false at exactly 520', () => {
    expect(isMobileWidth(520)).toBe(false)
  })

  it('returns false for desktop widths', () => {
    expect(isMobileWidth(768)).toBe(false)
    expect(isMobileWidth(1440)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — expect it to fail**

```bash
npx vitest run test/useMobileView.test.js
```

Expected: `FAIL — Cannot find module '../src/lib/useMobileView.js'`

- [ ] **Step 3: Create the hook**

Create `src/lib/useMobileView.js`:

```js
import { useState, useEffect } from 'react'

export function isMobileWidth(width) {
  return width < 520
}

export function useMobileView() {
  const [isMobile, setIsMobile] = useState(() => isMobileWidth(window.innerWidth))

  useEffect(() => {
    const handler = () => setIsMobile(isMobileWidth(window.innerWidth))
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return isMobile
}
```

- [ ] **Step 4: Run test — expect it to pass**

```bash
npx vitest run test/useMobileView.test.js
```

Expected: `3 tests passed`

- [ ] **Step 5: Commit**

```bash
git add src/lib/useMobileView.js test/useMobileView.test.js
git commit -m "feat: add useMobileView hook"
```

---

## Task 2: Extract `usePerformEngine` hook

**Files:**
- Create: `src/lib/usePerformEngine.js`

- [ ] **Step 1: Create the hook by extracting logic from PerformView**

Create `src/lib/usePerformEngine.js` with the full logic currently in `PerformView.jsx` (lines 25–178):

```js
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
```

- [ ] **Step 2: Run the existing test suite to confirm nothing is broken yet**

```bash
npx vitest run
```

Expected: all existing tests pass (the new file isn't wired up yet)

- [ ] **Step 3: Commit**

```bash
git add src/lib/usePerformEngine.js
git commit -m "feat: extract usePerformEngine hook"
```

---

## Task 3: Refactor `PerformView` to use `usePerformEngine`

**Files:**
- Modify: `src/components/PerformView.jsx`

- [ ] **Step 1: Replace PerformView with the refactored version**

Replace the entire contents of `src/components/PerformView.jsx`:

```jsx
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
```

- [ ] **Step 2: Run the app and verify Perform view works identically**

```bash
npm run dev
```

Open http://localhost:5173 in browser. Verify:
- Song sections display correctly
- Start Song button works (count-in fires, sections advance)
- Stop button works
- Loop toggle (↻ on a section card) works
- AUTO toggle works
- Click track toggle works

- [ ] **Step 3: Run test suite**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/PerformView.jsx
git commit -m "refactor: PerformView consumes usePerformEngine"
```

---

## Task 4: Create `MobilePerformView`

**Files:**
- Create: `src/components/MobilePerformView.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/MobilePerformView.jsx`:

```jsx
import React, { useState } from 'react'
import { usePerformEngine } from '../lib/usePerformEngine.js'
import { BreakView }        from './PerformView.jsx'
import { CountdownOverlay } from './CountdownOverlay.jsx'
import { DmxPanel }         from './DmxPanel.jsx'

export function MobilePerformView({ song, onStateChange, nextSong, onAutoAdvance }) {
  const [dmxOpen, setDmxOpen] = useState(false)

  const {
    smState, activeSection, currentBar, totalBars,
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
```

- [ ] **Step 2: Verify the component imports cleanly**

```bash
npx vitest run
```

Expected: all tests pass (no import errors)

- [ ] **Step 3: Commit**

```bash
git add src/components/MobilePerformView.jsx
git commit -m "feat: MobilePerformView — full-screen sections + bottom bar"
```

---

## Task 5: Wire mobile shell in `App.jsx`

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Replace `App.jsx` with the mobile-aware version**

Replace the entire contents of `src/App.jsx`:

```jsx
import React, { useState, useEffect } from 'react'
import { PerformView }       from './components/PerformView.jsx'
import { MobilePerformView } from './components/MobilePerformView.jsx'
import { LibraryView }       from './components/LibraryView.jsx'
import { SettingsView }      from './components/SettingsView.jsx'
import { SetlistEditor }     from './components/SetlistEditor.jsx'
import { Sidebar }           from './components/Sidebar.jsx'
import { useMobileView }     from './lib/useMobileView.js'
import { DEMO_SONGS, DEMO_BREAKS } from './demoSongs.js'
import { computeNextSong }   from './lib/setNavigation.js'

const TABS = ['Perform', 'Sets', 'Library', 'Settings']

export default function App() {
  const [view,         setView]         = useState('Perform')
  const [songs,        setSongs]        = useState(DEMO_SONGS)
  const [breaks,       setBreaks]       = useState(DEMO_BREAKS)
  const [activeSongId, setActiveSongId] = useState(DEMO_SONGS[0]?.id)
  const [loadedGig,    setLoadedGig]    = useState(null)
  const [smState,      setSmState]      = useState('idle')
  const [setsDirty,    setSetsDirty]    = useState(false)
  const [drawerOpen,   setDrawerOpen]   = useState(false)

  const isMobile = useMobileView()

  useEffect(() => {
    window.phr0st?.initializeZoom()
    window.phr0st?.getSongs().then(s => { if (s?.length) setSongs(s) })
    window.phr0st?.onSongsUpdated(s => setSongs(s))
    window.phr0st?.onStateUpdate(data => {
      if (data.event === 'midi:loopPad') {
        // Handled inside PerformView via smRef — nothing needed here
      }
    })
  }, [])

  const activeItem = songs.find(s => s.id === activeSongId)
    ?? breaks.find(b => b.id === activeSongId)
    ?? songs[0]

  const nextSong = computeNextSong(loadedGig, songs, activeSongId)

  function handleAutoAdvance() {
    if (nextSong) setActiveSongId(nextSong.id)
  }

  function handleTabChange(tab) {
    if (view === 'Sets' && setsDirty && tab !== 'Sets') {
      if (!window.confirm('You have unsaved changes. Leave without saving?')) return
    }
    setView(tab)
    setDrawerOpen(false)
  }

  function handleSelectSong(id) {
    setActiveSongId(id)
    setView('Perform')
    setDrawerOpen(false)
  }

  const mainContent = (
    <>
      {view === 'Perform'  && (isMobile
        ? <MobilePerformView song={activeItem} onStateChange={setSmState} nextSong={nextSong} onAutoAdvance={handleAutoAdvance} />
        : <PerformView       song={activeItem} onStateChange={setSmState} nextSong={nextSong} onAutoAdvance={handleAutoAdvance} />
      )}
      {view === 'Library'  && <LibraryView songs={songs} onSelect={s => { setActiveSongId(s.id); setView('Perform') }} />}
      {view === 'Sets'     && <SetlistEditor songs={songs} breaks={breaks} onLoadGig={(gig) => { setLoadedGig(gig); setView('Perform') }} onDirtyChange={setSetsDirty} />}
      {view === 'Settings' && <SettingsView />}
    </>
  )

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d0d14', color: '#e0e0f0', position: 'relative' }}>

        {/* Mobile top bar */}
        <div style={{ background: '#13132a', padding: '10px 14px 8px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '2px solid #1e1e3a', flexShrink: 0 }}>
          <span style={{ fontFamily: "'Pix32', monospace", color: '#a855f7', fontSize: '1rem', letterSpacing: '0.04em', textShadow: '0 0 18px #a855f766', userSelect: 'none' }}>phr0stOS</span>
          <span style={{ width: 1, height: 14, background: '#2a2a3a' }} />
          <span style={{ color: '#c0c0d8', fontWeight: 700, fontSize: '0.9rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeItem?.title ?? activeItem?.name}
          </span>
          <span style={{
            fontSize: '0.55rem', padding: '3px 8px', borderRadius: 10, fontWeight: 700,
            fontFamily: "'VCR', monospace", userSelect: 'none',
            background: smState === 'idle' ? 'transparent' : '#a855f711',
            color: smState === 'idle' ? '#2a2a4a' : '#a855f7',
            border: `1px solid ${smState === 'idle' ? '#1e1e3a' : '#a855f744'}`,
          }}>
            {smState === 'idle' ? '● IDLE' : '● LIVE'}
          </span>
          <button
            onClick={() => setDrawerOpen(v => !v)}
            style={{ background: 'none', border: 'none', color: drawerOpen ? '#a855f7' : '#555', fontSize: '1.3rem', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
          >
            {drawerOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {mainContent}

          {/* Hamburger drawer */}
          {drawerOpen && (
            <>
              <div
                onClick={() => setDrawerOpen(false)}
                style={{ position: 'absolute', inset: 0, background: '#00000077', zIndex: 9 }}
              />
              <div style={{
                position: 'absolute', top: 0, left: 0, bottom: 0, width: 220,
                background: '#0b0b18', borderRight: '1px solid #1a1a2e',
                display: 'flex', flexDirection: 'column', zIndex: 10, overflowY: 'auto',
              }}>
                <div style={{ padding: '10px 14px 6px', borderBottom: '1px solid #12121f', flexShrink: 0 }}>
                  <div style={{ fontFamily: "'VCR', monospace", fontSize: '0.55rem', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.14em' }}>Tonight's Set</div>
                  {loadedGig?.label && (
                    <div style={{ fontSize: '0.68rem', color: '#6060a0', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loadedGig.label}</div>
                  )}
                </div>

                {!loadedGig ? (
                  <div style={{ padding: '14px 12px' }}>
                    <div style={{ fontFamily: "'VCR', monospace", fontSize: '0.58rem', color: '#2a2a4a', marginBottom: 8 }}>No set loaded</div>
                    <button onClick={() => handleTabChange('Sets')} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #a855f744', background: '#a855f711', color: '#a855f7', fontSize: '0.65rem', cursor: 'pointer' }}>Open Sets →</button>
                  </div>
                ) : (
                  loadedGig.sets.map((set, si) => {
                    const setSongs = set.songs.map(id => songs.find(s => s.id === id) ?? breaks.find(b => b.id === id)).filter(Boolean)
                    return (
                      <React.Fragment key={si}>
                        {loadedGig.sets.length > 1 && (
                          <div style={{ padding: '7px 12px 6px', background: '#13110a', borderBottom: '1px solid #2a2000' }}>
                            <span style={{ fontFamily: "'VCR', monospace", fontSize: '0.68rem', color: '#daa520', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{set.name}</span>
                          </div>
                        )}
                        {setSongs.map((item, i) => {
                          const isBreak  = item.type === 'break'
                          const isActive = !isBreak && activeSongId === item.id
                          if (isBreak) {
                            return (
                              <div key={`${item.id}-${i}`} style={{ padding: '5px 12px', fontSize: '0.65rem', borderBottom: '1px solid #0f0f1c', borderLeft: '3px solid #f59e0b44', background: '#0f0d00', color: '#f59e0b' }}>
                                <span style={{ fontFamily: "'VCR', monospace", fontSize: '0.55rem', color: '#9a7000', marginRight: 6 }}>{i + 1}</span>
                                {item.name}
                              </div>
                            )
                          }
                          return (
                            <div key={item.id} onClick={() => handleSelectSong(item.id)} style={{
                              padding: '9px 12px', fontSize: '0.82rem', cursor: 'pointer',
                              borderBottom: '1px solid #0f0f1c',
                              color: isActive ? '#22c55e' : '#a0a0c8',
                              background: isActive ? '#091409' : 'transparent',
                              borderLeft: `3px solid ${isActive ? '#22c55e' : 'transparent'}`,
                              display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                              <span style={{ fontFamily: "'VCR', monospace", fontSize: '0.6rem', color: isActive ? '#22c55e55' : '#222', width: 14 }}>{i + 1}</span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                            </div>
                          )
                        })}
                      </React.Fragment>
                    )
                  })
                )}

                {/* Nav links */}
                <div style={{ marginTop: 'auto', padding: '12px 14px', borderTop: '1px solid #12121f', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {['Sets', 'Library', 'Settings'].map(tab => (
                    <button key={tab} onClick={() => handleTabChange(tab)} style={{
                      background: 'none', border: 'none', color: '#a855f7', fontSize: '0.75rem',
                      cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit',
                    }}>{tab} →</button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // Desktop layout (unchanged)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d0d14', color: '#e0e0f0' }}>
      <div style={{ background: '#13132a', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '2px solid #1e1e3a', flexShrink: 0 }}>
        <span style={{
          fontFamily: "'EmojiFont', 'Segoe UI Emoji', sans-serif",
          fontSize: '1.3rem', lineHeight: 1,
          color: smState === 'idle' ? '#6060a0' : '#a855f7',
          textShadow: smState !== 'idle' ? '0 0 14px #a855f7cc' : 'none',
          transition: 'color 0.4s, text-shadow 0.4s',
          userSelect: 'none', width: 22, textAlign: 'center',
        }}>
          {smState === 'idle' ? 't' : '♪'}
        </span>
        <span style={{ fontFamily: "'Pix32', monospace", color: '#a855f7', fontSize: '1.1rem', letterSpacing: '0.04em', textShadow: '0 0 18px #a855f766', userSelect: 'none' }}>phr0stOS</span>
        <span style={{ width: 1, height: 16, background: '#2a2a3a' }} />
        <span style={{ color: '#c0c0d8', fontWeight: 700, fontSize: '0.85rem' }}>{activeItem?.title ?? activeItem?.name}</span>
        {activeItem?.type !== 'break' && <>
          <span style={{ color: '#444', fontSize: '0.7rem' }}>{activeItem?.artist}</span>
          <span style={{ color: '#333', fontSize: '0.65rem' }}>{activeItem?.bpm} BPM</span>
        </>}
        <span style={{
          marginLeft: 'auto',
          background: smState === 'idle' ? 'transparent' : '#a855f711',
          color: smState === 'idle' ? '#2a2a4a' : '#a855f7',
          fontSize: '0.6rem', padding: '3px 10px', borderRadius: 12,
          border: `1px solid ${smState === 'idle' ? '#1e1e3a' : '#a855f744'}`,
          fontWeight: 700, fontFamily: "'VCR', monospace",
          transition: 'all 0.4s', userSelect: 'none',
        }}>
          {smState === 'idle' ? '● IDLE' : '● LIVE'}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => handleTabChange(tab)} style={{
              padding: '4px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.7rem',
              background: view === tab ? '#a855f720' : 'transparent',
              color:      view === tab ? '#a855f7'   : '#444',
              fontFamily: 'inherit',
            }}>{tab}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          songs={songs}
          breaks={breaks}
          loadedGig={loadedGig}
          activeSongId={activeSongId}
          onSelectSong={(id) => { setActiveSongId(id); setView('Perform') }}
          onOpenSets={() => setView('Sets')}
        />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {mainContent}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test desktop layout is unchanged**

Open http://localhost:5173 in a full browser window (>520px wide). Verify:
- Top bar, sidebar, tabs, and Perform view all look and work exactly as before

- [ ] **Step 3: Test mobile layout in Chrome DevTools**

Press F12 → toggle device toolbar (Ctrl+Shift+M) → select iPhone 14 Pro (393×852). Verify:
- Mobile top bar shows: phr0stOS · song title · IDLE badge · ☰
- No sidebar, no tab bar
- Sections are large and scrollable
- Bottom bar shows CLK · ▶ Start Song · ↻
- Tapping ☰ opens the drawer with song list and Sets/Library/Settings links
- Tapping outside the drawer closes it
- Tapping a song in the drawer selects it and closes the drawer
- Start Song starts the count-in, bottom bar flips to ■ Stop
- Tapping a section card while playing jumps to that section
- Loop button (on card or bottom bar) toggles looping
- DMX row expands/collapses when tapped

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: mobile shell with drawer and MobilePerformView"
```
