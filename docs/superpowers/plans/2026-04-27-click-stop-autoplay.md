# Click Stop + AutoPlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix click overlap when a song ends, and add an AutoPlay toggle that advances to the next song in the same set through the normal count-in flow.

**Architecture:** Extract `computeNextSong` as a tested pure function in `src/lib/setNavigation.js`. App.jsx derives `nextSong` from it and passes it along with an `onAutoAdvance` callback to PerformView. PerformView gains an `autoPlay` toggle, uses a ref to track a pending auto-start, and a `useEffect` keyed on `song?.id` to call `startSong()` when the next song arrives.

**Tech Stack:** React 18, Vite, Vitest, Electron

---

## File Map

| File | Change |
|---|---|
| `src/components/PerformView.jsx` | Bug fix + AutoPlay toggle + updated `songEnded` handler + `pendingAutoStartRef` + auto-start effect |
| `src/App.jsx` | Import `computeNextSong`, derive `nextSong`, add `handleAutoAdvance`, pass both to PerformView |
| `src/lib/setNavigation.js` | **New** — pure function `computeNextSong(loadedGig, songs, activeSongId)` |
| `test/setNavigation.test.js` | **New** — Vitest unit tests for `computeNextSong` |

---

## Task 1: Fix click overlap on song end

**Files:**
- Modify: `src/components/PerformView.jsx:82`

- [ ] **Step 1: Make the change**

  In `PerformView.jsx`, find the `songEnded` listener (currently line 82, inside `startSong()`):

  ```js
  // BEFORE
  sm.on('songEnded', () => { setSmState('idle'); setActiveSection(-1); setCurrentScene(null); setPendingSection(-1) })
  ```

  Replace with:

  ```js
  sm.on('songEnded', () => {
    engineRef.current?.stop()
    setSmState('idle')
    setActiveSection(-1)
    setCurrentScene(null)
    setPendingSection(-1)
  })
  ```

- [ ] **Step 2: Manual smoke test**

  Run `npm run dev`. Load any song. Let it play through all sections to the end. Confirm:
  - The click stops immediately when the last bar completes.
  - The button returns to "Start Song".
  - Clicking "Start Song" again starts exactly one clean click — no doubled beats, no overlapping tones.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/PerformView.jsx
  git commit -m "fix: stop AudioEngine when song ends to prevent click overlap"
  ```

---

## Task 2: Write failing tests for computeNextSong

**Files:**
- Create: `test/setNavigation.test.js`

- [ ] **Step 1: Create the test file**

  Create `test/setNavigation.test.js` with this content:

  ```js
  import { describe, it, expect } from 'vitest'
  import { computeNextSong } from '../src/lib/setNavigation.js'

  const songs = [
    { id: 's1', title: 'Song 1' },
    { id: 's2', title: 'Song 2' },
    { id: 's3', title: 'Song 3' },
    { id: 's4', title: 'Song 4' },
  ]

  describe('computeNextSong', () => {
    it('returns the next song object within the same set', () => {
      const gig = { sets: [{ songs: ['s1', 's2', 's3'] }, { songs: ['s4'] }] }
      expect(computeNextSong(gig, songs, 's1')).toEqual({ id: 's2', title: 'Song 2' })
    })

    it('returns null for the last song in a set', () => {
      const gig = { sets: [{ songs: ['s1', 's2', 's3'] }, { songs: ['s4'] }] }
      expect(computeNextSong(gig, songs, 's3')).toBeNull()
    })

    it('does not cross set boundaries', () => {
      const gig = { sets: [{ songs: ['s1'] }, { songs: ['s2'] }] }
      expect(computeNextSong(gig, songs, 's1')).toBeNull()
    })

    it('returns null when loadedGig is null', () => {
      expect(computeNextSong(null, songs, 's1')).toBeNull()
    })

    it('returns null when activeSongId is not in any set', () => {
      const gig = { sets: [{ songs: ['s2', 's3'] }] }
      expect(computeNextSong(gig, songs, 's1')).toBeNull()
    })

    it('returns null when the next song id is not in the songs array', () => {
      const gig = { sets: [{ songs: ['s1', 'unknown-id'] }] }
      expect(computeNextSong(gig, songs, 's1')).toBeNull()
    })
  })
  ```

- [ ] **Step 2: Run tests and confirm they fail**

  ```bash
  npm test
  ```

  Expected: all 6 tests fail with `Cannot find module '../src/lib/setNavigation.js'`.

---

## Task 3: Implement computeNextSong to pass tests

**Files:**
- Create: `src/lib/setNavigation.js`

- [ ] **Step 1: Create the file**

  Create `src/lib/setNavigation.js`:

  ```js
  export function computeNextSong(loadedGig, songs, activeSongId) {
    if (!loadedGig) return null
    for (const set of loadedGig.sets) {
      const idx = set.songs.indexOf(activeSongId)
      if (idx === -1) continue
      const nextId = set.songs[idx + 1]
      if (!nextId) return null
      return songs.find(s => s.id === nextId) ?? null
    }
    return null
  }
  ```

- [ ] **Step 2: Run tests and confirm they all pass**

  ```bash
  npm test
  ```

  Expected output: `6 passed` with no failures.

- [ ] **Step 3: Commit**

  ```bash
  git add src/lib/setNavigation.js test/setNavigation.test.js
  git commit -m "feat: add computeNextSong utility with unit tests"
  ```

---

## Task 4: Wire nextSong and onAutoAdvance into App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add the import**

  At the top of `src/App.jsx`, add this import after the existing imports:

  ```js
  import { computeNextSong } from './lib/setNavigation.js'
  ```

- [ ] **Step 2: Derive nextSong and add the callback**

  Inside the `App` function body, after the `activeSong` line (currently line 29), add:

  ```js
  const nextSong = computeNextSong(loadedGig, songs, activeSongId)

  function handleAutoAdvance() {
    if (nextSong) setActiveSongId(nextSong.id)
  }
  ```

- [ ] **Step 3: Pass the new props to PerformView**

  Find the PerformView JSX line (currently line 97):

  ```jsx
  // BEFORE
  {view === 'Perform'  && <PerformView song={activeSong} onStateChange={setSmState} />}
  ```

  Replace with:

  ```jsx
  {view === 'Perform'  && <PerformView song={activeSong} onStateChange={setSmState} nextSong={nextSong} onAutoAdvance={handleAutoAdvance} />}
  ```

- [ ] **Step 4: Run tests to confirm nothing broke**

  ```bash
  npm test
  ```

  Expected: 6 passed.

- [ ] **Step 5: Commit**

  ```bash
  git add src/App.jsx
  git commit -m "feat: compute nextSong and pass autoAdvance callback to PerformView"
  ```

---

## Task 5: AutoPlay toggle and auto-start in PerformView

**Files:**
- Modify: `src/components/PerformView.jsx`

- [ ] **Step 1: Update the function signature to accept new props**

  Change the first line of the component (currently line 9):

  ```js
  // BEFORE
  export function PerformView({ song, onStateChange }) {
  ```

  ```js
  // AFTER
  export function PerformView({ song, onStateChange, nextSong, onAutoAdvance }) {
  ```

- [ ] **Step 2: Add autoPlay state and refs**

  In the state declarations block (after `pendingSection` state, around line 20), add:

  ```js
  const [autoPlay, setAutoPlay] = useState(false)
  ```

  After the existing refs (`smRef`, `engineRef`, `dotsRef`, currently lines 41-43), add:

  ```js
  const autoPlayRef        = useRef(false)
  const pendingAutoStartRef = useRef(false)
  autoPlayRef.current = autoPlay
  ```

  The `autoPlayRef` keeps the `songEnded` closure up-to-date if the user toggles AutoPlay after hitting Start Song.

- [ ] **Step 3: Add the auto-start effect**

  After the existing `useEffect` hooks (after line 39), add:

  ```js
  useEffect(() => {
    if (pendingAutoStartRef.current) {
      pendingAutoStartRef.current = false
      startSong()
    }
  }, [song?.id])
  ```

  This fires only when the `song` prop actually changes (App advanced `activeSongId`). The ref avoids a re-render loop.

- [ ] **Step 4: Update the songEnded handler**

  Inside `startSong()`, find the `songEnded` listener (the one you updated in Task 1):

  ```js
  sm.on('songEnded', () => {
    engineRef.current?.stop()
    setSmState('idle')
    setActiveSection(-1)
    setCurrentScene(null)
    setPendingSection(-1)
  })
  ```

  Replace with:

  ```js
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
  ```

- [ ] **Step 5: Add the AutoPlay toggle button**

  Find the song header `<div>` that contains the Start/Stop button (around line 156). The Start/Stop button is currently the only button in the header's right side. Add the AutoPlay toggle immediately before it:

  ```jsx
  {/* AutoPlay toggle + Start/Stop */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <button
      onClick={() => setAutoPlay(v => !v)}
      style={{
        padding: '8px 16px', borderRadius: 20, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
        border: `1px solid ${autoPlay ? '#a855f766' : '#2a2a3a'}`,
        background: autoPlay ? '#1a0a2a' : 'transparent',
        color: autoPlay ? '#a855f7' : '#444',
      }}
    >
      AUTO
    </button>
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
  ```

  Remove the old lone Start/Stop button (the one not wrapped in this new div).

- [ ] **Step 6: Run tests**

  ```bash
  npm test
  ```

  Expected: 6 passed.

- [ ] **Step 7: Manual verification — AutoPlay happy path**

  Load a set with at least 2 songs (Sets view → Load Event or Load Set). Switch to Perform view. Select the first song in the set. Enable AUTO (button turns purple). Hit Start Song. Let the song play through all sections to the end.

  Expected: the click stops cleanly, then immediately re-enters the count-in for the next song in the same set (prep bar + 8-beat countdown), then that song plays.

- [ ] **Step 8: Manual verification — last song stops**

  Select the last song in a loaded set. Enable AUTO. Hit Start Song. Let the song end.

  Expected: song ends, click stops, nothing auto-advances. Button returns to "Start Song".

- [ ] **Step 9: Manual verification — no set, AUTO has no effect**

  Navigate away from any loaded set (reload the app without loading a set). Enable AUTO. Start any song. Let it end.

  Expected: song ends cleanly, no auto-advance, no crash.

- [ ] **Step 10: Manual verification — manual Stop does not trigger AutoPlay**

  Load a set, enable AUTO, start a song, then click Stop before it ends.

  Expected: click stops immediately, no auto-advance, no pending start.

- [ ] **Step 11: Commit**

  ```bash
  git add src/components/PerformView.jsx
  git commit -m "feat: add AutoPlay toggle — advances to next set song on song end"
  ```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| Click stops when last section completes | Task 1 |
| No click overlap on re-start | Task 1 |
| AutoPlay advances to next song in set | Task 5 |
| AutoPlay goes through normal count-in | Task 5 (startSong always uses prepBar → countIn) |
| AutoPlay stops at last song in set | Tasks 3 + 5 (computeNextSong returns null) |
| AutoPlay toggle in PerformView near Start/Stop | Task 5, Step 5 |
| Set boundary not crossed | Task 3 (computeNextSong per-set loop) |
