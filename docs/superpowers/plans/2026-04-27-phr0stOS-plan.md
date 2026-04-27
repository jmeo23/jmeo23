# phr0stOS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build phr0stOS — a live band Electron app that plays a click track, auto-advances through song sections with per-section DMX light scenes, supports a song-start count-in with optional animated DMX, and connects iPads/iPhones over WiFi.

**Architecture:** Electron desktop shell with a React + Vite renderer. The renderer owns the Web Audio click track and song state machine; it forwards beat events to the main process via IPC. The main process owns all hardware (DMX via node-serialport, MIDI via node-midi, file I/O) and runs an Express + WebSocket server so mobile devices can follow the show. A `songStart` phase (1 prep bar + 2-bar count-in) precedes the first section, with optional per-song animated DMX during count-in.

**Tech Stack:** Electron 28, React 18, Vite 5, Vitest, node-serialport 12, midi (node-midi), Express 4, ws 8, Web Audio API, memfs (test mocking)

---

## File Map

| File | Responsibility |
|------|---------------|
| `electron/main.js` | Window creation, IPC handlers, hardware init |
| `electron/preload.js` | contextBridge IPC bridge (renderer ↔ main) |
| `electron/songLibrary.js` | Song/setlist JSON load/validate/watch |
| `electron/dmxEngine.js` | Serial connection + scene firing + count-in animation |
| `electron/midiEngine.js` | MIDI input + pad-to-action mapping |
| `electron/expressServer.js` | Express HTTP + WebSocket for mobile clients |
| `src/main.jsx` | React entry point |
| `src/App.jsx` | Root component + view routing |
| `src/demoSongs.js` | 1 demo song (Basket Case) to bootstrap the UI |
| `src/audioEngine.js` | Web Audio lookahead click scheduler |
| `src/songStateMachine.js` | State: idle → songStart:prepBar → songStart:countIn → playing |
| `src/components/PerformView.jsx` | Live performance main view |
| `src/components/SectionCard.jsx` | Section card with progress bar |
| `src/components/ClickTrack.jsx` | Beat dots row |
| `src/components/CountdownOverlay.jsx` | Full-screen count-in overlay |
| `src/components/DmxPanel.jsx` | DMX fixture channel bars |
| `src/components/Sidebar.jsx` | Setlist + library panel |
| `src/components/LibraryView.jsx` | Song browser + search |
| `src/components/SongEditor.jsx` | Create/edit songs (stub) |
| `src/components/SetlistEditor.jsx` | Build setlists from library (stub) |
| `src/components/SettingsView.jsx` | Serial port, MIDI, audio settings |
| `tests/songLibrary.test.js` | JSON load/validate/watch tests |
| `tests/songStateMachine.test.js` | All state transition tests |
| `tests/dmxEngine.test.js` | Scene firing + animation tests |

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `electron/main.js`
- Create: `electron/preload.js`
- Create: `src/main.jsx`
- Create: `src/App.jsx`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "phr0stOS",
  "version": "0.1.0",
  "private": true,
  "main": "electron/main.js",
  "scripts": {
    "dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "build": "vite build",
    "preview": "electron .",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.16.0",
    "serialport": "^12.0.0",
    "midi": "^2.0.0"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "vitest": "^1.2.0",
    "memfs": "^4.6.0",
    "concurrently": "^8.2.0",
    "wait-on": "^7.2.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install
```
Expected: `node_modules/` created, no errors.

- [ ] **Step 3: Create vite.config.js**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist' },
  server: { port: 5173 },
})
```

- [ ] **Step 4: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>phr0stOS</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0d0d14; color: #e0e0f0; font-family: 'Segoe UI', system-ui, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

- [ ] **Step 5: Create src/main.jsx**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
```

- [ ] **Step 6: Create src/App.jsx (stub)**

```jsx
import React from 'react'

export default function App() {
  return (
    <div style={{ padding: 20, color: '#e0e0f0' }}>
      phr0stOS loading…
    </div>
  )
}
```

- [ ] **Step 7: Create electron/preload.js**

```js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('phr0st', {
  getSongs:     () => ipcRenderer.invoke('songs:getAll'),
  getSetlists:  () => ipcRenderer.invoke('setlists:getAll'),
  getSettings:  () => ipcRenderer.invoke('settings:get'),
  saveSettings: (s) => ipcRenderer.invoke('settings:save', s),

  onSongsUpdated: (cb) => ipcRenderer.on('songs:updated', (_, d) => cb(d)),
  onStateUpdate:  (cb) => ipcRenderer.on('state:update',  (_, d) => cb(d)),

  sendCommand: (cmd, payload) => ipcRenderer.send('command', { cmd, payload }),
})
```

- [ ] **Step 8: Create electron/main.js (stub)**

```js
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const isDev = !app.isPackaged
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 9: Verify dev mode launches**

In one terminal: `npx vite`
In another: `electron .`

Expected: Electron window opens showing "phr0stOS loading…" on a dark background.

- [ ] **Step 10: Initialize git and commit**

```bash
git init
git add package.json vite.config.js index.html electron/ src/
git commit -m "feat: scaffold Electron + React + Vite"
```

---

### Task 2: Song library — load and validate

**Files:**
- Create: `vitest.config.js`
- Create: `electron/songLibrary.js`
- Create: `tests/songLibrary.test.js`

- [ ] **Step 1: Create vitest.config.js**

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
})
```

- [ ] **Step 2: Write failing tests**

Create `tests/songLibrary.test.js`:

```js
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { Volume } from 'memfs'

const vol = new Volume()
vi.mock('fs/promises', () => vol.promises)

const { loadSong, loadSetlist, validateSong } = await import('../electron/songLibrary.js')

const VALID_SONG = {
  id: 'basket-case',
  title: 'Basket Case',
  artist: 'Green Day',
  bpm: 170,
  timeSignature: [4, 4],
  key: 'Eb major',
  sections: [
    { id: 'intro',  name: 'Intro',   bars: 4, dmxScene: 'intro' },
    { id: 'verse1', name: 'Verse 1', bars: 8, dmxScene: 'verse' },
  ],
  dmxScenes: {
    intro: { pars: [40,40,40,40,40,40], wash: [0,0,0,0],     strobe: 0, laser: 30, smoke: 20 },
    verse: { pars: [80,60,80,60,80,60], wash: [60,60,60,60], strobe: 0, laser: 0,  smoke: 0  },
  },
}

beforeEach(() => vol.reset())

describe('validateSong', () => {
  test('accepts a valid song', () => {
    expect(() => validateSong(VALID_SONG)).not.toThrow()
  })
  test('throws on missing id', () => {
    expect(() => validateSong({ ...VALID_SONG, id: undefined })).toThrow('id')
  })
  test('throws on bpm <= 0', () => {
    expect(() => validateSong({ ...VALID_SONG, bpm: 0 })).toThrow('bpm')
  })
  test('throws on missing sections array', () => {
    expect(() => validateSong({ ...VALID_SONG, sections: undefined })).toThrow('sections')
  })
  test('throws when section references undefined dmxScene key', () => {
    const bad = { ...VALID_SONG, sections: [{ id: 'x', name: 'X', bars: 4, dmxScene: 'missing' }] }
    expect(() => validateSong(bad)).toThrow('dmxScene')
  })
  test('accepts song with countInScene beat-pulse', () => {
    const withCountIn = {
      ...VALID_SONG,
      countInScene: {
        type: 'beat-pulse',
        peak: { pars: [255,255,255,255,255,255], wash: [255,255,255,255], strobe: 0, laser: 0, smoke: 0 },
        base: { pars: [0,0,0,0,0,0],             wash: [0,0,0,0],         strobe: 0, laser: 0, smoke: 0 },
      },
    }
    expect(() => validateSong(withCountIn)).not.toThrow()
  })
  test('throws on unknown countInScene type', () => {
    const bad = { ...VALID_SONG, countInScene: { type: 'strobe-crazy' } }
    expect(() => validateSong(bad)).toThrow('countInScene')
  })
})

describe('loadSong', () => {
  test('loads and parses valid song JSON', async () => {
    vol.fromJSON({ '/songs/basket-case.json': JSON.stringify(VALID_SONG) })
    const song = await loadSong('/songs/basket-case.json')
    expect(song.title).toBe('Basket Case')
    expect(song.sections).toHaveLength(2)
  })
  test('throws on malformed JSON', async () => {
    vol.fromJSON({ '/songs/bad.json': 'not json {{' })
    await expect(loadSong('/songs/bad.json')).rejects.toThrow()
  })
})

describe('loadSetlist', () => {
  test('loads valid setlist', async () => {
    const setlist = { id: 'fri', name: 'Friday', date: '2026-04-25', songs: ['basket-case'] }
    vol.fromJSON({ '/setlists/fri.json': JSON.stringify(setlist) })
    const result = await loadSetlist('/setlists/fri.json')
    expect(result.songs).toContain('basket-case')
  })
  test('throws on missing name', async () => {
    const bad = { id: 'x', songs: [] }
    vol.fromJSON({ '/setlists/x.json': JSON.stringify(bad) })
    await expect(loadSetlist('/setlists/x.json')).rejects.toThrow('name')
  })
})
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npm test -- tests/songLibrary.test.js
```
Expected: FAIL — `Cannot find module '../electron/songLibrary.js'`

- [ ] **Step 4: Implement electron/songLibrary.js**

```js
const fs     = require('fs/promises')
const fsSync = require('fs')
const path   = require('path')
const os     = require('os')

const SONGS_DIR    = path.join(os.homedir(), 'phr0stOS', 'songs')
const SETLISTS_DIR = path.join(os.homedir(), 'phr0stOS', 'setlists')
const VALID_COUNT_IN_TYPES = ['beat-pulse', 'fade']

function validateSong(song) {
  if (!song.id)                      throw new Error('song missing: id')
  if (!song.title)                   throw new Error('song missing: title')
  if (!song.bpm || song.bpm <= 0)    throw new Error('song bpm must be positive')
  if (!Array.isArray(song.sections)) throw new Error('song missing: sections array')
  if (!song.dmxScenes || typeof song.dmxScenes !== 'object')
                                     throw new Error('song missing: dmxScenes')
  for (const s of song.sections) {
    if (!song.dmxScenes[s.dmxScene])
      throw new Error(`section "${s.id}" references missing dmxScene key: ${s.dmxScene}`)
  }
  if (song.countInScene != null) {
    if (!VALID_COUNT_IN_TYPES.includes(song.countInScene.type))
      throw new Error(`countInScene.type must be one of: ${VALID_COUNT_IN_TYPES.join(', ')}`)
  }
}

async function loadSong(filePath) {
  const raw  = await fs.readFile(filePath, 'utf8')
  const song = JSON.parse(raw)
  validateSong(song)
  return song
}

async function loadSetlist(filePath) {
  const raw = await fs.readFile(filePath, 'utf8')
  const s   = JSON.parse(raw)
  if (!s.id || !s.name || !Array.isArray(s.songs))
    throw new Error('setlist missing required fields: id, name, songs')
  return s
}

async function ensureDirs() {
  await fs.mkdir(SONGS_DIR,    { recursive: true })
  await fs.mkdir(SETLISTS_DIR, { recursive: true })
}

async function loadAllSongs() {
  await ensureDirs()
  const files = (await fs.readdir(SONGS_DIR)).filter(f => f.endsWith('.json'))
  const songs = []
  for (const f of files) {
    try   { songs.push(await loadSong(path.join(SONGS_DIR, f))) }
    catch (e) { console.warn(`Skipping invalid song ${f}: ${e.message}`) }
  }
  return songs
}

async function loadAllSetlists() {
  await ensureDirs()
  const files = (await fs.readdir(SETLISTS_DIR)).filter(f => f.endsWith('.json'))
  const setlists = []
  for (const f of files) {
    try   { setlists.push(await loadSetlist(path.join(SETLISTS_DIR, f))) }
    catch (e) { console.warn(`Skipping invalid setlist ${f}: ${e.message}`) }
  }
  return setlists
}

function watchSongsFolder(onChange) {
  fsSync.watch(SONGS_DIR, { persistent: false }, () => onChange())
}

module.exports = {
  validateSong, loadSong, loadSetlist,
  loadAllSongs, loadAllSetlists,
  watchSongsFolder,
  SONGS_DIR, SETLISTS_DIR,
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm test -- tests/songLibrary.test.js
```
Expected: All 9 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.js electron/songLibrary.js tests/songLibrary.test.js
git commit -m "feat: song/setlist JSON loader with validation incl. countInScene"
```

---

### Task 3: Song library IPC + folder watcher wired into main process

**Files:**
- Modify: `electron/main.js`

- [ ] **Step 1: Replace electron/main.js with fully wired version**

```js
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { loadAllSongs, loadAllSetlists, watchSongsFolder } = require('./songLibrary')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  const isDev = !app.isPackaged
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

function setupIpc() {
  ipcMain.handle('songs:getAll',    () => loadAllSongs())
  ipcMain.handle('setlists:getAll', () => loadAllSetlists())

  watchSongsFolder(async () => {
    const songs = await loadAllSongs()
    mainWindow?.webContents.send('songs:updated', songs)
  })
}

app.whenReady().then(() => {
  createWindow()
  setupIpc()
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 2: Verify in dev — open DevTools console and run**

```js
window.phr0st.getSongs().then(console.log)
```
Expected: `[]` (empty — no songs in folder yet, no crash).

- [ ] **Step 3: Commit**

```bash
git add electron/main.js
git commit -m "feat: wire song/setlist IPC + folder watcher"
```

---

### Task 4: Song state machine

**Files:**
- Create: `src/songStateMachine.js`
- Create: `tests/songStateMachine.test.js`

Pure JS — no Web Audio, no IPC, no DOM. Receives `onBeat()` calls and emits events via a callback map.

**States:** `idle` · `songStart:prepBar` · `songStart:countIn` · `playing` · `playing:sectionCountIn`

**Count-in beat display pattern** (8 beats, both songStart and sectionCountIn):
- Beat 0 → `1` · Beat 1 → `null` · Beat 2 → `2` · Beat 3 → `null`
- Beat 4 → `1` · Beat 5 → `2` · Beat 6 → `3` · Beat 7 → `4`

- [ ] **Step 1: Write failing tests**

Create `tests/songStateMachine.test.js`:

```js
import { describe, test, expect, vi } from 'vitest'
import { createStateMachine } from '../src/songStateMachine.js'

const SONG = {
  bpm: 120,
  timeSignature: [4, 4],
  sections: [
    { id: 'intro',  name: 'Intro',   bars: 2, dmxScene: 'intro' },
    { id: 'verse1', name: 'Verse 1', bars: 2, dmxScene: 'verse' },
    { id: 'outro',  name: 'Outro',   bars: 2, dmxScene: 'outro' },
  ],
}

function beats(sm, n) { for (let i = 0; i < n; i++) sm.onBeat() }

// ── idle ──────────────────────────────────────────────────────
describe('idle', () => {
  test('starts in idle', () => {
    expect(createStateMachine(SONG).state).toBe('idle')
  })
  test('startSong → songStart:prepBar', () => {
    const sm = createStateMachine(SONG)
    sm.startSong()
    expect(sm.state).toBe('songStart:prepBar')
  })
  test('stop in idle is a no-op', () => {
    const sm = createStateMachine(SONG)
    sm.stop()
    expect(sm.state).toBe('idle')
  })
})

// ── songStart:prepBar ─────────────────────────────────────────
describe('songStart:prepBar', () => {
  test('4 beats → songStart:countIn', () => {
    const sm = createStateMachine(SONG)
    sm.startSong()
    beats(sm, 4)
    expect(sm.state).toBe('songStart:countIn')
  })
  test('stop during prepBar → idle', () => {
    const sm = createStateMachine(SONG)
    sm.startSong()
    beats(sm, 2)
    sm.stop()
    expect(sm.state).toBe('idle')
  })
  test('no overlay emitted during prepBar', () => {
    const sm = createStateMachine(SONG)
    const overlayOn = vi.fn()
    sm.on('overlayShow', overlayOn)
    sm.startSong()
    beats(sm, 3)
    expect(overlayOn).not.toHaveBeenCalled()
  })
})

// ── songStart:countIn ─────────────────────────────────────────
describe('songStart:countIn', () => {
  function intoCountIn() {
    const sm = createStateMachine(SONG)
    sm.startSong()
    beats(sm, 4)
    return sm
  }

  test('overlayShow emitted with mode songStart', () => {
    const sm = createStateMachine(SONG)
    const overlayOn = vi.fn()
    sm.on('overlayShow', overlayOn)
    sm.startSong()
    beats(sm, 4)
    expect(overlayOn).toHaveBeenCalledWith({ mode: 'songStart', from: -1, to: 0 })
  })
  test('beat display pattern: 1,null,2,null,1,2,3,4', () => {
    const sm = intoCountIn()
    const displayed = []
    sm.on('countInBeat', (n) => displayed.push(n))
    beats(sm, 8)
    expect(displayed).toEqual([1, null, 2, null, 1, 2, 3, 4])
  })
  test('8 beats → playing, section 0 active', () => {
    const sm = intoCountIn()
    beats(sm, 8)
    expect(sm.state).toBe('playing')
    expect(sm.activeSection).toBe(0)
    expect(sm.currentBar).toBe(1)
  })
  test('sectionActivated emitted on transition to playing', () => {
    const sm = intoCountIn()
    const activated = vi.fn()
    sm.on('sectionActivated', activated)
    beats(sm, 8)
    expect(activated).toHaveBeenCalledWith({ index: 0, section: SONG.sections[0] })
  })
  test('cancel → idle, overlayHide emitted', () => {
    const sm = intoCountIn()
    const overlayOff = vi.fn()
    sm.on('overlayHide', overlayOff)
    beats(sm, 3)
    sm.cancel()
    expect(sm.state).toBe('idle')
    expect(overlayOff).toHaveBeenCalled()
  })
  test('stop during countIn → idle', () => {
    const sm = intoCountIn()
    beats(sm, 2)
    sm.stop()
    expect(sm.state).toBe('idle')
  })
})

// ── playing — auto-advance ────────────────────────────────────
describe('playing', () => {
  function intoPlaying() {
    const sm = createStateMachine(SONG)
    sm.startSong()
    beats(sm, 12) // 4 prepBar + 8 countIn
    return sm
  }

  test('section 0 active after song start', () => {
    expect(intoPlaying().activeSection).toBe(0)
  })
  test('bar counter increments each 4 beats', () => {
    const sm = intoPlaying()
    beats(sm, 4)
    expect(sm.currentBar).toBe(2)
  })
  test('section count-in starts after last bar of section', () => {
    const sm = intoPlaying() // intro: 2 bars = 8 beats
    beats(sm, 8)
    expect(sm.state).toBe('playing:sectionCountIn')
  })
  test('section count-in: 8 beats → section 1 active', () => {
    const sm = intoPlaying()
    beats(sm, 8 + 8)
    expect(sm.activeSection).toBe(1)
    expect(sm.state).toBe('playing')
  })
  test('song ends after final section completes', () => {
    const sm = intoPlaying()
    // intro(8) + cIn(8) + verse(8) + cIn(8) + outro(8) = 40 beats
    beats(sm, 40)
    expect(sm.state).toBe('idle')
  })
  test('songEnded emitted', () => {
    const sm = intoPlaying()
    const ended = vi.fn()
    sm.on('songEnded', ended)
    beats(sm, 40)
    expect(ended).toHaveBeenCalled()
  })
})

// ── loop ──────────────────────────────────────────────────────
describe('loop mode', () => {
  function intoPlaying() {
    const sm = createStateMachine(SONG)
    sm.startSong()
    beats(sm, 12)
    return sm
  }

  test('toggleLoop enables loop', () => {
    const sm = intoPlaying()
    sm.toggleLoop(0)
    expect(sm.isLooping).toBe(true)
  })
  test('looping section: bar resets instead of triggering count-in', () => {
    const sm = intoPlaying()
    sm.toggleLoop(0)
    beats(sm, 8) // intro completes
    expect(sm.state).toBe('playing')
    expect(sm.activeSection).toBe(0)
    expect(sm.currentBar).toBe(1)
  })
  test('toggleLoop again disengages, auto-advance resumes', () => {
    const sm = intoPlaying()
    sm.toggleLoop(0)
    beats(sm, 8)     // loops once
    sm.toggleLoop(0) // disengage
    beats(sm, 8)     // now advances
    expect(sm.state).toBe('playing:sectionCountIn')
  })
})

// ── manual jump ───────────────────────────────────────────────
describe('manual section jump', () => {
  function intoPlaying() {
    const sm = createStateMachine(SONG)
    sm.startSong()
    beats(sm, 12)
    return sm
  }

  test('jumpToSection triggers count-in', () => {
    const sm = intoPlaying()
    sm.jumpToSection(2)
    expect(sm.state).toBe('playing:sectionCountIn')
  })
  test('after count-in, target section is active', () => {
    const sm = intoPlaying()
    sm.jumpToSection(2)
    beats(sm, 8)
    expect(sm.activeSection).toBe(2)
  })
  test('section count-in overlay emitted with sectionTransition mode', () => {
    const sm = intoPlaying()
    const overlayOn = vi.fn()
    sm.on('overlayShow', overlayOn)
    sm.jumpToSection(2)
    expect(overlayOn).toHaveBeenCalledWith({ mode: 'sectionTransition', from: 0, to: 2 })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- tests/songStateMachine.test.js
```
Expected: FAIL — `Cannot find module '../src/songStateMachine.js'`

- [ ] **Step 3: Implement src/songStateMachine.js**

```js
// Display values for the 8-beat count-in: half-note bar then full quarter bar
const COUNT_IN_DISPLAY = [1, null, 2, null, 1, 2, 3, 4]

export function createStateMachine(song) {
  const listeners = {}
  let state         = 'idle'
  let activeSection = -1
  let currentBar    = 0
  let beatInBar     = 0      // 0-based within current bar
  let countInBeat   = 0      // 0-7 during any count-in
  let pendingSection = -1
  let isLooping     = false

  function emit(event, data) {
    ;(listeners[event] || []).forEach(cb => cb(data))
  }

  function on(event, cb) {
    if (!listeners[event]) listeners[event] = []
    listeners[event].push(cb)
  }

  function toIdle() {
    state = 'idle'; activeSection = -1; currentBar = 0
    beatInBar = 0; countInBeat = 0; pendingSection = -1; isLooping = false
    emit('overlayHide')
  }

  function startCountIn(toSection, mode) {
    countInBeat    = 0
    pendingSection = toSection
    state          = mode
    emit('overlayShow', { mode: mode === 'songStart:countIn' ? 'songStart' : 'sectionTransition', from: activeSection, to: toSection })
  }

  function activateSection(idx) {
    activeSection  = idx
    currentBar     = 1
    beatInBar      = 0
    isLooping      = false
    pendingSection = -1
    countInBeat    = 0
    state          = 'playing'
    emit('overlayHide')
    emit('sectionActivated', { index: idx, section: song.sections[idx] })
    emit('barAdvanced', { bar: 1, totalBars: song.sections[idx].bars })
  }

  function onBeat() {
    if (state === 'idle') return

    if (state === 'songStart:prepBar') {
      beatInBar++
      if (beatInBar >= song.timeSignature[0]) {
        beatInBar = 0
        startCountIn(0, 'songStart:countIn')
      }
      return
    }

    if (state === 'songStart:countIn' || state === 'playing:sectionCountIn') {
      emit('countInBeat', COUNT_IN_DISPLAY[countInBeat] ?? null)
      countInBeat++
      if (countInBeat >= 8) activateSection(pendingSection)
      return
    }

    if (state === 'playing') {
      beatInBar = (beatInBar + 1) % song.timeSignature[0]
      if (beatInBar === 0) {
        currentBar++
        const section = song.sections[activeSection]
        emit('barAdvanced', { bar: currentBar, totalBars: section.bars })

        if (currentBar > section.bars) {
          if (isLooping) {
            currentBar = 1
            emit('barAdvanced', { bar: 1, totalBars: section.bars })
          } else {
            const nextIdx = activeSection + 1
            if (nextIdx < song.sections.length) {
              startCountIn(nextIdx, 'playing:sectionCountIn')
            } else {
              toIdle()
              emit('songEnded')
            }
          }
        }
      }
    }
  }

  function startSong() {
    if (state !== 'idle') return
    state     = 'songStart:prepBar'
    beatInBar = 0
    emit('songStarted')
  }

  function stop()   { toIdle() }
  function cancel() { toIdle() }

  function toggleLoop(sectionIdx) {
    if (sectionIdx !== activeSection) return
    isLooping = !isLooping
    emit('loopChanged', { isLooping })
  }

  function jumpToSection(idx) {
    if (state !== 'playing') return
    startCountIn(idx, 'playing:sectionCountIn')
  }

  return {
    get state()          { return state },
    get activeSection()  { return activeSection },
    get currentBar()     { return currentBar },
    get isLooping()      { return isLooping },
    on, startSong, stop, cancel, toggleLoop, jumpToSection, onBeat,
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- tests/songStateMachine.test.js
```
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/songStateMachine.js tests/songStateMachine.test.js
git commit -m "feat: song state machine — songStart, auto-advance, loop, jump"
```

---

### Task 5: DMX engine — serial + scene firing + count-in animation

**Files:**
- Create: `electron/dmxEngine.js`
- Create: `tests/dmxEngine.test.js`

Channel map (Maestro, 1-indexed → 0-indexed buffer):
- CH 1–6 (idx 0–5): PAR cans
- CH 7–10 (idx 6–9): Wash lights
- CH 11 (idx 10): Strobe · CH 12 (idx 11): Laser · CH 13 (idx 12): Smoke

- [ ] **Step 1: Write failing tests**

Create `tests/dmxEngine.test.js`:

```js
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { createDmxEngine } from '../electron/dmxEngine.js'

function makeMockPort() {
  const writes = []
  return {
    port: { write: vi.fn((buf) => writes.push(Buffer.from(buf))) },
    writes,
  }
}

const INTRO_SCENE  = { pars: [40,40,40,40,40,40], wash: [0,0,0,0],   strobe: 0,  laser: 30, smoke: 20 }
const CHORUS_SCENE = { pars: [255,255,255,255,255,255], wash: [200,200,200,200], strobe: 60, laser: 80, smoke: 40 }
const BEAT_PULSE   = {
  type: 'beat-pulse',
  peak: { pars: [255,255,255,255,255,255], wash: [255,255,255,255], strobe: 0, laser: 0, smoke: 0 },
  base: { pars: [0,0,0,0,0,0],             wash: [0,0,0,0],         strobe: 0, laser: 0, smoke: 0 },
}
const FADE_SCENE = {
  type: 'fade',
  from: { pars: [100,100,100,100,100,100], wash: [50,50,50,50], strobe: 0, laser: 0, smoke: 0 },
  to:   { pars: [0,0,0,0,0,0],             wash: [0,0,0,0],     strobe: 0, laser: 0, smoke: 0 },
}

describe('fireScene', () => {
  test('writes a 512-byte buffer', () => {
    const { port, writes } = makeMockPort()
    createDmxEngine(port).fireScene(INTRO_SCENE)
    expect(writes[0]).toHaveLength(512)
  })
  test('PAR ch1 (idx 0) = 40 for intro scene', () => {
    const { port, writes } = makeMockPort()
    createDmxEngine(port).fireScene(INTRO_SCENE)
    expect(writes[0][0]).toBe(40)
  })
  test('strobe ch11 (idx 10) = 60 for chorus scene', () => {
    const { port, writes } = makeMockPort()
    createDmxEngine(port).fireScene(CHORUS_SCENE)
    expect(writes[0][10]).toBe(60)
  })
  test('laser ch12 (idx 11) = 80 for chorus scene', () => {
    const { port, writes } = makeMockPort()
    createDmxEngine(port).fireScene(CHORUS_SCENE)
    expect(writes[0][11]).toBe(80)
  })
})

describe('beat-pulse count-in', () => {
  test('startCountInAnimation with beat-pulse fires base values immediately', () => {
    const { port, writes } = makeMockPort()
    createDmxEngine(port).startCountInAnimation(BEAT_PULSE, 500)
    expect(writes[0][0]).toBe(0) // base PAR[0]
  })
  test('onCountInBeat snaps to peak values', () => {
    const { port, writes } = makeMockPort()
    const engine = createDmxEngine(port)
    engine.startCountInAnimation(BEAT_PULSE, 500)
    engine.onCountInBeat(BEAT_PULSE, 500)
    expect(writes[writes.length - 1][0]).toBe(255) // peak PAR[0]
  })
  test('stopCountInAnimation does not throw', () => {
    const { port } = makeMockPort()
    const engine = createDmxEngine(port)
    engine.startCountInAnimation(BEAT_PULSE, 500)
    expect(() => engine.stopCountInAnimation()).not.toThrow()
  })
})

describe('fade count-in', () => {
  test('startCountInAnimation with fade fires "from" values immediately', () => {
    const { port, writes } = makeMockPort()
    createDmxEngine(port).startCountInAnimation(FADE_SCENE, 3000)
    expect(writes[0][0]).toBe(100) // from.pars[0]
  })
})
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
npm test -- tests/dmxEngine.test.js
```
Expected: FAIL — `Cannot find module '../electron/dmxEngine.js'`

- [ ] **Step 3: Implement electron/dmxEngine.js**

```js
const CH = {
  PARS:   [0, 1, 2, 3, 4, 5],
  WASH:   [6, 7, 8, 9],
  STROBE: 10,
  LASER:  11,
  SMOKE:  12,
}

function clamp(v) { return Math.max(0, Math.min(255, Math.round(v ?? 0))) }

function sceneToBuffer(values) {
  const buf = Buffer.alloc(512, 0)
  if (values.pars)        values.pars.forEach((v, i)  => { buf[CH.PARS[i]] = clamp(v) })
  if (values.wash)        values.wash.forEach((v, i)  => { buf[CH.WASH[i]] = clamp(v) })
  if (values.strobe != null) buf[CH.STROBE] = clamp(values.strobe)
  if (values.laser  != null) buf[CH.LASER]  = clamp(values.laser)
  if (values.smoke  != null) buf[CH.SMOKE]  = clamp(values.smoke)
  return buf
}

function lerp(from, to, t) {
  return {
    pars:   from.pars.map((v, i)  => v + (to.pars[i]  - v) * t),
    wash:   from.wash.map((v, i)  => v + (to.wash[i]  - v) * t),
    strobe: from.strobe + (to.strobe - from.strobe) * t,
    laser:  from.laser  + (to.laser  - from.laser)  * t,
    smoke:  from.smoke  + (to.smoke  - from.smoke)  * t,
  }
}

function createDmxEngine(port) {
  let fadeTimer  = null
  let pulseTimer = null

  function fireScene(scene) {
    port.write(sceneToBuffer(scene))
  }

  function startCountInAnimation(countInScene, durationMs) {
    stopCountInAnimation()
    if (!countInScene) return

    if (countInScene.type === 'beat-pulse') {
      fireScene(countInScene.base)
    }

    if (countInScene.type === 'fade') {
      fireScene(countInScene.from)
      const start = Date.now()
      fadeTimer = setInterval(() => {
        const t = Math.min((Date.now() - start) / durationMs, 1)
        fireScene(lerp(countInScene.from, countInScene.to, t))
        if (t >= 1) stopCountInAnimation()
      }, 16)
    }
  }

  function onCountInBeat(countInScene, beatIntervalMs) {
    if (!countInScene || countInScene.type !== 'beat-pulse') return
    if (pulseTimer) clearTimeout(pulseTimer)
    fireScene(countInScene.peak)
    const steps  = 8
    const stepMs = (beatIntervalMs ?? 500) / steps
    let step = 0
    function decay() {
      step++
      fireScene(lerp(countInScene.peak, countInScene.base, step / steps))
      if (step < steps) pulseTimer = setTimeout(decay, stepMs)
    }
    pulseTimer = setTimeout(decay, stepMs)
  }

  function stopCountInAnimation() {
    if (fadeTimer)  { clearInterval(fadeTimer);  fadeTimer  = null }
    if (pulseTimer) { clearTimeout(pulseTimer);  pulseTimer = null }
  }

  return { fireScene, startCountInAnimation, onCountInBeat, stopCountInAnimation }
}

module.exports = { createDmxEngine, CH }
```

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/dmxEngine.test.js
```
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add electron/dmxEngine.js tests/dmxEngine.test.js
git commit -m "feat: DMX engine — scene firing + beat-pulse and fade count-in animation"
```

---

### Task 6: Wire DMX + MIDI into main process

**Files:**
- Create: `electron/midiEngine.js`
- Modify: `electron/main.js`

- [ ] **Step 1: Create electron/midiEngine.js**

```js
const midi = require('midi')

function createMidiEngine({ onPad }) {
  const input = new midi.Input()
  let portIndex = -1

  function listPorts() {
    const ports = []
    for (let i = 0; i < input.getPortCount(); i++) {
      ports.push({ index: i, name: input.getPortName(i) })
    }
    return ports
  }

  function connect(index) {
    if (portIndex !== -1) input.closePort()
    portIndex = index
    input.openPort(index)
    input.on('message', (_, msg) => {
      const [status, note, velocity] = msg
      const isNoteOn = (status & 0xF0) === 0x90 && velocity > 0
      if (isNoteOn) onPad(note)
    })
  }

  function disconnect() {
    if (portIndex !== -1) { input.closePort(); portIndex = -1 }
  }

  return { listPorts, connect, disconnect }
}

module.exports = { createMidiEngine }
```

- [ ] **Step 2: Expand electron/main.js to handle DMX + MIDI + settings commands**

Replace `electron/main.js`:

```js
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs   = require('fs/promises')
const os   = require('os')
const { loadAllSongs, loadAllSetlists, watchSongsFolder } = require('./songLibrary')
const { createDmxEngine } = require('./dmxEngine')
const { createMidiEngine } = require('./midiEngine')
const { SerialPort } = require('serialport')

const SETTINGS_PATH = path.join(os.homedir(), 'phr0stOS', 'settings.json')

let mainWindow
let dmxEngine   = null
let midiEngine  = null
let currentSong = null
let loopPadNote = 36

async function loadSettings() {
  try { return JSON.parse(await fs.readFile(SETTINGS_PATH, 'utf8')) }
  catch { return { serialPort: null, midiDevice: null, loopPadNote: 36 } }
}

async function saveSettings(settings) {
  await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true })
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2))
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  const isDev = !app.isPackaged
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

function handleCommand(_, { cmd, payload }) {
  switch (cmd) {
    case 'dmx:connect': {
      try {
        const port = new SerialPort({ path: payload.path, baudRate: 115200 })
        dmxEngine = createDmxEngine(port)
      } catch (e) { console.error('DMX connect failed:', e.message) }
      break
    }
    case 'midi:connect': {
      try {
        loopPadNote = payload.loopPadNote ?? 36
        midiEngine = createMidiEngine({
          onPad: (note) => {
            if (note === loopPadNote)
              mainWindow?.webContents.send('state:update', { event: 'midi:loopPad' })
          },
        })
        midiEngine.connect(payload.portIndex ?? 0)
      } catch (e) { console.error('MIDI connect failed:', e.message) }
      break
    }
    case 'song:load': {
      currentSong = payload.song
      break
    }
    case 'countIn:start': {
      if (!dmxEngine || !currentSong?.countInScene) return
      const beatMs   = (60 / currentSong.bpm) * 1000
      const totalMs  = beatMs * 12 // 3 bars × 4 beats
      dmxEngine.startCountInAnimation(currentSong.countInScene, totalMs)
      break
    }
    case 'countIn:beat': {
      if (!dmxEngine || !currentSong?.countInScene) return
      const beatMs = (60 / currentSong.bpm) * 1000
      dmxEngine.onCountInBeat(currentSong.countInScene, beatMs)
      break
    }
    case 'countIn:stop': {
      dmxEngine?.stopCountInAnimation()
      break
    }
    case 'dmx:scene': {
      if (!dmxEngine || !currentSong) return
      const scene = currentSong.dmxScenes[payload.sceneName]
      if (scene) dmxEngine.fireScene(scene)
      break
    }
  }
}

function setupIpc() {
  ipcMain.handle('songs:getAll',    () => loadAllSongs())
  ipcMain.handle('setlists:getAll', () => loadAllSetlists())
  ipcMain.handle('settings:get',    () => loadSettings())
  ipcMain.handle('settings:save',   (_, s) => saveSettings(s))
  ipcMain.handle('midi:listPorts',  () => midiEngine?.listPorts() ?? [])
  ipcMain.on('command', handleCommand)

  watchSongsFolder(async () => {
    const songs = await loadAllSongs()
    mainWindow?.webContents.send('songs:updated', songs)
  })
}

app.whenReady().then(() => {
  createWindow()
  setupIpc()
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 3: Commit**

```bash
git add electron/midiEngine.js electron/main.js
git commit -m "feat: DMX + MIDI + settings wired into main process"
```

---

### Task 7: Express + WebSocket server for mobile

**Files:**
- Create: `electron/expressServer.js`
- Modify: `electron/main.js`

- [ ] **Step 1: Create electron/expressServer.js**

```js
const express = require('express')
const { WebSocketServer } = require('ws')
const http = require('http')
const path = require('path')

function createExpressServer({ distPath, onMessage }) {
  const expressApp = express()
  expressApp.use(express.static(distPath))
  expressApp.get('*', (_, res) => res.sendFile(path.join(distPath, 'index.html')))

  const server     = http.createServer(expressApp)
  const wss        = new WebSocketServer({ server })
  const clients    = new Set()

  wss.on('connection', (ws) => {
    clients.add(ws)
    ws.on('close', () => clients.delete(ws))
    ws.on('message', (msg) => {
      try { onMessage(JSON.parse(msg.toString())) } catch {}
    })
  })

  function broadcast(data) {
    const payload = JSON.stringify(data)
    for (const ws of clients) {
      if (ws.readyState === ws.OPEN) ws.send(payload)
    }
  }

  function listen(port = 3000) {
    return new Promise((resolve) => server.listen(port, () => resolve(port)))
  }

  return { broadcast, listen }
}

module.exports = { createExpressServer }
```

- [ ] **Step 2: Start express server in main.js — add to app.whenReady()**

Add these lines inside `app.whenReady().then(() => { ... })` after `setupIpc()`:

```js
const { createExpressServer } = require('./expressServer')
const wsServer = createExpressServer({
  distPath: path.join(__dirname, '../dist'),
  onMessage: (msg) => { if (msg.cmd) handleCommand(null, msg) },
})
wsServer.listen(3000).then((port) => console.log(`Mobile: http://localhost:${port}`))
```

- [ ] **Step 3: Commit**

```bash
git add electron/expressServer.js electron/main.js
git commit -m "feat: Express + WebSocket mobile server"
```

---

### Task 8: Web Audio click track engine

**Files:**
- Create: `src/audioEngine.js`

Cannot be unit-tested without a real AudioContext. Verified manually in Task 9.

- [ ] **Step 1: Create src/audioEngine.js**

```js
const LOOKAHEAD_MS = 100.0
const SCHEDULE_MS  = 25.0

export class AudioEngine {
  constructor({ bpm, downbeatBuffer, upbeatBuffer, onBeat }) {
    this.bpm            = bpm
    this.downbeatBuffer = downbeatBuffer  // AudioBuffer or null → synthesize
    this.upbeatBuffer   = upbeatBuffer    // AudioBuffer or null → synthesize
    this.onBeat         = onBeat          // (beatIndex: 0-3) => void
    this.ctx            = null
    this.nextBeatTime   = 0
    this.beatIndex      = 0
    this.timerId        = null
    this.running        = false
    this.muted          = false
  }

  get beatInterval() { return 60 / this.bpm }

  start() {
    if (this.running) return
    this.ctx          = new (window.AudioContext || window.webkitAudioContext)()
    this.nextBeatTime = this.ctx.currentTime + 0.05
    this.beatIndex    = 0
    this.running      = true
    this._schedule()
  }

  stop() {
    this.running = false
    clearTimeout(this.timerId)
    if (this.ctx) { this.ctx.close(); this.ctx = null }
  }

  setMuted(muted) { this.muted = muted }

  _schedule() {
    if (!this.running) return
    const lookahead = LOOKAHEAD_MS / 1000
    while (this.nextBeatTime < this.ctx.currentTime + lookahead) {
      this._scheduleBeat(this.beatIndex, this.nextBeatTime)
      this.nextBeatTime += this.beatInterval
      this.beatIndex     = (this.beatIndex + 1) % 4
    }
    this.timerId = setTimeout(() => this._schedule(), SCHEDULE_MS)
  }

  _scheduleBeat(beatIdx, time) {
    const delayMs = Math.max(0, (time - this.ctx.currentTime) * 1000 - 5)
    setTimeout(() => this.onBeat(beatIdx), delayMs)
    if (this.muted) return
    const buffer = beatIdx === 0 ? this.downbeatBuffer : this.upbeatBuffer
    buffer ? this._playBuffer(buffer, time) : this._playTone(beatIdx === 0 ? 1200 : 900, time)
  }

  _playBuffer(buffer, time) {
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.connect(this.ctx.destination)
    src.start(time)
  }

  _playTone(freq, time) {
    const osc  = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.3, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04)
    osc.start(time)
    osc.stop(time + 0.05)
  }

  static async loadWav(ctx, url) {
    const res = await fetch(url)
    const buf = await res.arrayBuffer()
    return ctx.decodeAudioData(buf)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/audioEngine.js
git commit -m "feat: Web Audio lookahead click track scheduler"
```

---

### Task 9: CountdownOverlay component

**Files:**
- Create: `src/components/CountdownOverlay.jsx`

- [ ] **Step 1: Create src/components/CountdownOverlay.jsx**

```jsx
import React from 'react'

// mode: 'hidden' | 'songStart' | 'sectionTransition'
// displayNum: 1|2|3|4|null  (null = silent half-rest beat)
// dotsFilled: 0-8
export function CountdownOverlay({ mode, from, to, displayNum, dotsFilled, onCancel }) {
  if (mode === 'hidden') return null

  return (
    <div style={S.overlay}>
      <div style={S.label}>
        {mode === 'songStart' ? 'Song Start: Count In' : 'Section Switch'}
      </div>

      {mode === 'sectionTransition' && (
        <div style={S.arrow}>
          <span style={S.fromText}>{from}</span>
          <span style={S.arrText}>→</span>
          <span style={S.toText}>{to}</span>
        </div>
      )}

      <div style={S.number}>{displayNum ?? ' '}</div>

      <div style={S.dotsRow}>
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            style={{
              ...S.dot,
              ...(i < dotsFilled - 1 ? S.dotDone : {}),
              ...(i === dotsFilled - 1 ? S.dotNow : {}),
            }}
          />
        ))}
      </div>

      <div style={S.hint}>SPD-SX loop pad cancels</div>

      <button style={S.cancelBtn} onClick={onCancel}>
        Cancel — keep looping
      </button>
    </div>
  )
}

const S = {
  overlay: {
    position: 'fixed', inset: 0, background: '#0d0d14ee',
    backdropFilter: 'blur(4px)', zIndex: 100,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  label:    { fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.2em' },
  arrow:    { display: 'flex', alignItems: 'center', gap: 16, fontSize: '1.1rem', fontWeight: 700 },
  fromText: { color: '#22c55e' },
  arrText:  { color: '#333', fontSize: '1.6rem' },
  toText:   { color: '#f59e0b' },
  number:   {
    fontSize: '9rem', fontWeight: 900, lineHeight: 1, color: '#22c55e',
    textShadow: '0 0 50px #22c55eaa, 0 0 100px #22c55e44', minWidth: '1ch', textAlign: 'center',
  },
  dotsRow:  { display: 'flex', gap: 12, marginTop: 4 },
  dot:      { width: 18, height: 18, borderRadius: '50%', border: '2px solid #2a2a3a', background: '#1e1e35' },
  dotDone:  { background: '#22c55e', borderColor: '#22c55e', boxShadow: '0 0 10px #22c55e88' },
  dotNow:   { background: '#f59e0b', borderColor: '#f59e0b', boxShadow: '0 0 14px #f59e0baa' },
  hint:     { fontSize: '0.65rem', color: '#444', marginTop: 6 },
  cancelBtn: {
    marginTop: 10, padding: '7px 22px', borderRadius: 20,
    border: '1px solid #ef444466', background: 'transparent',
    color: '#ef4444', fontSize: '0.7rem', cursor: 'pointer',
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CountdownOverlay.jsx
git commit -m "feat: CountdownOverlay — songStart and sectionTransition modes"
```

---

### Task 10: SectionCard + ClickTrack components

**Files:**
- Create: `src/components/SectionCard.jsx`
- Create: `src/components/ClickTrack.jsx`

- [ ] **Step 1: Create src/components/SectionCard.jsx**

```jsx
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
```

- [ ] **Step 2: Create src/components/ClickTrack.jsx**

```jsx
import React from 'react'

export function ClickTrack({ beatIndex, bpm, currentBar, totalBars, isOn, onToggle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0f0f1e', border: '1px solid #1a1a2e', borderRadius: 8, padding: '8px 12px' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0,1,2,3].map(i => {
          const active = i === beatIndex
          const down   = i === 0
          return (
            <div key={i} style={{
              width: 12, height: 12, borderRadius: '50%',
              background: active ? (down ? '#22c55e' : '#55bb88') : '#1e1e35',
              border: `1px solid ${active ? (down ? '#22c55e' : '#55bb88') : '#2a2a3a'}`,
              boxShadow: active && down ? '0 0 10px #22c55e99' : 'none',
              transition: 'background 0.05s',
            }} />
          )
        })}
      </div>
      <span style={{ color: '#555', fontSize: '0.7rem' }}>
        <span style={{ color: '#e0e0f0', fontWeight: 700 }}>{bpm}</span> BPM
      </span>
      <span style={{ color: '#444', fontSize: '0.7rem', marginLeft: 4 }}>
        Bar <span style={{ color: '#888', fontWeight: 700 }}>{currentBar || '—'}</span>
        {totalBars > 0 && ` / ${totalBars}`}
      </span>
      <button onClick={onToggle} style={{
        marginLeft: 'auto', padding: '5px 14px', borderRadius: 20,
        border: `1px solid ${isOn ? '#22c55e66' : '#2a2a3a'}`,
        background: isOn ? '#0a1a10' : '#131328',
        color: isOn ? '#22c55e' : '#444',
        fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
      }}>
        Click {isOn ? 'ON' : 'OFF'}
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SectionCard.jsx src/components/ClickTrack.jsx
git commit -m "feat: SectionCard and ClickTrack components"
```

---

### Task 11: DmxPanel + Sidebar components

**Files:**
- Create: `src/components/DmxPanel.jsx`
- Create: `src/components/Sidebar.jsx`

- [ ] **Step 1: Create src/components/DmxPanel.jsx**

```jsx
import React from 'react'

function Bar({ value, barColor }) {
  const pct = ((value ?? 0) / 255 * 100).toFixed(0)
  return (
    <div style={{ width: 16, height: 56, background: '#1a1a2e', borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${pct}%`, background: barColor, borderRadius: 3, transition: 'height 0.5s ease' }} />
    </div>
  )
}

function Group({ values, label, barColor }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {[].concat(values).map((v, i) => <Bar key={i} value={v} barColor={barColor} />)}
      </div>
      <div style={{ fontSize: '0.55rem', color: '#444' }}>{label}</div>
    </div>
  )
}

export function DmxPanel({ scene, sceneName }) {
  if (!scene) return (
    <div style={{ background: '#0f0f1e', border: '1px solid #1a1a2e', borderRadius: 8, padding: '10px 12px', color: '#333', fontSize: '0.7rem' }}>
      DMX — no scene active
    </div>
  )
  return (
    <div style={{ background: '#0f0f1e', border: '1px solid #1a1a2e', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: '0.6rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 8 }}>
        DMX Fixtures
        <span style={{ color: '#a855f7', fontSize: '0.7rem', textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>— {sceneName}</span>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <Group values={scene.pars}    label="PAR Cans ×6" barColor="#a855f7" />
        <Group values={scene.wash}    label="Wash ×4"     barColor="#a855f788" />
        <Group values={scene.strobe}  label="Strobe"      barColor="#ff6b6b" />
        <Group values={scene.laser}   label="Laser"       barColor="#6bffff" />
        <Group values={scene.smoke}   label="Smoke"       barColor="#888" />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create src/components/Sidebar.jsx**

```jsx
import React from 'react'

export function Sidebar({ songs, setlist, activeSongId, onSelectSong }) {
  const setlistSongs = setlist.map(id => songs.find(s => s.id === id)).filter(Boolean)
  return (
    <div style={{ width: 200, borderRight: '1px solid #1a1a2e', display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0 }}>
      <div style={{ fontSize: '0.6rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '10px 12px 4px', fontWeight: 700 }}>Tonight's Set</div>
      {setlistSongs.map((song, i) => (
        <div key={song.id} onClick={() => onSelectSong(song.id)} style={{
          padding: '8px 12px', fontSize: '0.75rem', cursor: 'pointer',
          borderBottom: '1px solid #111827',
          color: activeSongId === song.id ? '#22c55e' : '#555',
          background: activeSongId === song.id ? '#0a1a10' : 'transparent',
          borderLeft: `3px solid ${activeSongId === song.id ? '#22c55e' : 'transparent'}`,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: '0.65rem', color: activeSongId === song.id ? '#22c55e66' : '#333', width: 14 }}>{i + 1}</span>
          {song.title}
        </div>
      ))}
      <div style={{ borderTop: '1px solid #1a1a2e', margin: '8px 0' }} />
      <div style={{ fontSize: '0.6rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 12px', fontWeight: 700 }}>Library</div>
      {songs.map(song => (
        <div key={song.id} onClick={() => onSelectSong(song.id)} style={{
          padding: '8px 12px', fontSize: '0.75rem', color: '#555', cursor: 'pointer', borderBottom: '1px solid #111827',
        }}>
          {song.title}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/DmxPanel.jsx src/components/Sidebar.jsx
git commit -m "feat: DmxPanel and Sidebar components"
```

---

### Task 12: PerformView — wire everything together

**Files:**
- Create: `src/components/PerformView.jsx`
- Create: `src/demoSongs.js`

- [ ] **Step 1: Create src/demoSongs.js**

```js
export const DEMO_SONGS = [
  {
    id: 'basket-case',
    title: 'Basket Case',
    artist: 'Green Day',
    bpm: 170,
    timeSignature: [4, 4],
    key: 'Eb major',
    sections: [
      { id: 'intro',   name: 'Intro',         bars: 4,  dmxScene: 'intro'  },
      { id: 'verse1',  name: 'Verse 1',       bars: 8,  dmxScene: 'verse'  },
      { id: 'chorus1', name: 'Chorus',        bars: 8,  dmxScene: 'chorus' },
      { id: 'verse2',  name: 'Verse 2',       bars: 8,  dmxScene: 'verse'  },
      { id: 'chorus2', name: 'Chorus',        bars: 8,  dmxScene: 'chorus' },
      { id: 'bridge',  name: 'Bridge / Solo', bars: 8,  dmxScene: 'bridge' },
      { id: 'chorus3', name: 'Chorus',        bars: 8,  dmxScene: 'chorus' },
      { id: 'outro',   name: 'Outro',         bars: 4,  dmxScene: 'outro'  },
    ],
    dmxScenes: {
      intro:  { pars:[40,40,40,40,40,40],         wash:[0,0,0,0],           strobe:0,  laser:30,  smoke:20 },
      verse:  { pars:[80,60,80,60,80,60],         wash:[60,60,60,60],       strobe:0,  laser:0,   smoke:0  },
      chorus: { pars:[255,255,255,255,255,255],   wash:[200,200,200,200],   strobe:60, laser:80,  smoke:40 },
      bridge: { pars:[120,0,120,0,120,0],         wash:[100,0,100,0],       strobe:30, laser:120, smoke:0  },
      outro:  { pars:[30,30,30,30,30,30],         wash:[20,20,20,20],       strobe:0,  laser:0,   smoke:10 },
    },
    countInScene: {
      type: 'beat-pulse',
      peak: { pars:[255,255,255,255,255,255], wash:[255,255,255,255], strobe:0, laser:0, smoke:0 },
      base: { pars:[0,0,0,0,0,0],             wash:[0,0,0,0],         strobe:0, laser:0, smoke:0 },
    },
  },
]
```

- [ ] **Step 2: Create src/components/PerformView.jsx**

```jsx
import React, { useRef, useState, useCallback } from 'react'
import { AudioEngine }        from '../audioEngine.js'
import { createStateMachine } from '../songStateMachine.js'
import { ClickTrack }         from './ClickTrack.jsx'
import { SectionCard }        from './SectionCard.jsx'
import { CountdownOverlay }   from './CountdownOverlay.jsx'
import { DmxPanel }           from './DmxPanel.jsx'

export function PerformView({ song }) {
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
  const [currentScene,   setCurrentScene]   = useState(null)
  const [sceneName,      setSceneName]      = useState('')

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
      setOverlay({
        mode,
        from: from >= 0 ? song.sections[from]?.name : '',
        to:   song.sections[to]?.name ?? '',
      })
    })
    sm.on('overlayHide',      ()            => setOverlay({ mode: 'hidden' }))
    sm.on('countInBeat',      (n)           => { dotsRef.current++; setDotsFilled(dotsRef.current); setCountInDisplay(n) })
    sm.on('sectionActivated', ({ index, section }) => {
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
    sm.on('songEnded',    ()                      => { setSmState('idle'); setActiveSection(-1); setCurrentScene(null) })

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
    window.phr0st?.sendCommand('countIn:stop', {})
  }

  function handleCancel() {
    smRef.current?.cancel()
    engineRef.current?.stop()
    setSmState('idle')
    setActiveSection(-1)
    setOverlay({ mode: 'hidden' })
    window.phr0st?.sendCommand('countIn:stop', {})
  }

  function getSectionStatus(idx) {
    if (smState === 'idle' || activeSection === -1) return 'idle'
    if (idx === activeSection && isLooping) return 'looping'
    if (idx === activeSection) return 'active'
    if (idx < activeSection)  return 'done'
    return 'idle'
  }

  if (!song) return <div style={{ padding: 20, color: '#555' }}>No song selected</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, height: '100%', overflow: 'hidden', position: 'relative' }}>
      {/* Song header + Start/Stop */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>{song.title}</div>
          <div style={{ fontSize: '0.75rem', color: '#555' }}>{song.artist}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {[`${song.bpm} BPM`, `${song.timeSignature.join('/')}`, song.key, `${song.sections.length} sections`].map(t => (
              <span key={t} style={{ fontSize: '0.6rem', padding: '2px 8px', borderRadius: 10, border: '1px solid #2a2a3a', color: '#666', background: '#131328' }}>{t}</span>
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
```

- [ ] **Step 3: Commit**

```bash
git add src/components/PerformView.jsx src/demoSongs.js
git commit -m "feat: PerformView wiring audio engine, state machine, and all components"
```

---

### Task 13: App routing + remaining views

**Files:**
- Create: `src/components/LibraryView.jsx`
- Create: `src/components/SettingsView.jsx`
- Create: `src/components/SongEditor.jsx`
- Create: `src/components/SetlistEditor.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create src/components/LibraryView.jsx**

```jsx
import React, { useState } from 'react'

export function LibraryView({ songs, onSelect }) {
  const [query, setQuery] = useState('')
  const filtered = songs.filter(s =>
    s.title.toLowerCase().includes(query.toLowerCase()) ||
    (s.key ?? '').toLowerCase().includes(query.toLowerCase())
  )
  return (
    <div style={{ padding: 16, color: '#e0e0f0', display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search by name or key…"
        style={{ padding: '8px 12px', background: '#131328', border: '1px solid #2a2a3a', borderRadius: 8, color: '#e0e0f0', fontSize: '0.85rem' }}
      />
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {filtered.map(s => (
          <div key={s.id} onClick={() => onSelect(s)} style={{ padding: '10px 12px', borderBottom: '1px solid #1a1a2e', cursor: 'pointer' }}>
            <div style={{ fontWeight: 700, color: '#e0e0f0' }}>{s.title}</div>
            <div style={{ fontSize: '0.7rem', color: '#555' }}>{s.artist} · {s.bpm} BPM · {s.key}</div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ color: '#333', padding: 12 }}>No songs match "{query}"</div>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create src/components/SettingsView.jsx**

```jsx
import React, { useState, useEffect } from 'react'

export function SettingsView() {
  const [settings, setSettings] = useState({ serialPort: '', midiDevice: '', loopPadNote: 36 })
  const [saved,    setSaved]    = useState(false)

  useEffect(() => {
    window.phr0st?.getSettings().then(s => s && setSettings(s))
  }, [])

  async function handleSave() {
    await window.phr0st?.saveSettings(settings)
    window.phr0st?.sendCommand('dmx:connect',  { path: settings.serialPort })
    window.phr0st?.sendCommand('midi:connect', { portIndex: 0, loopPadNote: settings.loopPadNote })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function Field({ label, k, type = 'text' }) {
    return (
      <label style={{ display: 'block', marginBottom: 14, fontSize: '0.8rem', color: '#888' }}>
        {label}
        <input
          type={type}
          value={settings[k] ?? ''}
          onChange={e => setSettings(s => ({ ...s, [k]: type === 'number' ? +e.target.value : e.target.value }))}
          style={{ display: 'block', width: '100%', marginTop: 4, padding: '6px 10px', background: '#131328', border: '1px solid #2a2a3a', borderRadius: 6, color: '#e0e0f0', fontSize: '0.8rem' }}
        />
      </label>
    )
  }

  return (
    <div style={{ padding: 20, color: '#e0e0f0', maxWidth: 420 }}>
      <div style={{ fontWeight: 700, marginBottom: 20, fontSize: '1rem' }}>Settings</div>
      <Field label="Serial Port (DMX — e.g. COM3 or /dev/ttyUSB0)" k="serialPort" />
      <Field label="MIDI Device Name (e.g. SPD-SX)" k="midiDevice" />
      <Field label="SPD-SX Loop Pad MIDI Note" k="loopPadNote" type="number" />
      <button onClick={handleSave} style={{
        padding: '8px 20px', borderRadius: 8, border: '1px solid #a855f766',
        background: '#1a0f2e', color: '#a855f7', cursor: 'pointer', fontSize: '0.8rem',
      }}>
        {saved ? 'Saved ✓' : 'Save & Connect'}
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Create stub components**

`src/components/SongEditor.jsx`:
```jsx
import React from 'react'
export function SongEditor({ song }) {
  return <div style={{ padding: 20, color: '#555' }}>Song Editor — {song?.title ?? 'New Song'} (coming soon)</div>
}
```

`src/components/SetlistEditor.jsx`:
```jsx
import React from 'react'
export function SetlistEditor() {
  return <div style={{ padding: 20, color: '#555' }}>Setlist Editor (coming soon)</div>
}
```

- [ ] **Step 4: Replace src/App.jsx with full routing**

```jsx
import React, { useState, useEffect } from 'react'
import { PerformView }   from './components/PerformView.jsx'
import { LibraryView }   from './components/LibraryView.jsx'
import { SettingsView }  from './components/SettingsView.jsx'
import { Sidebar }       from './components/Sidebar.jsx'
import { DEMO_SONGS }    from './demoSongs.js'

const TABS = ['Perform', 'Library', 'Settings']

export default function App() {
  const [view,          setView]          = useState('Perform')
  const [songs,         setSongs]         = useState(DEMO_SONGS)
  const [activeSongId,  setActiveSongId]  = useState(DEMO_SONGS[0]?.id)
  const [setlist,       setSetlist]       = useState(DEMO_SONGS.map(s => s.id))

  useEffect(() => {
    window.phr0st?.getSongs().then(s  => { if (s?.length) setSongs(s) })
    window.phr0st?.onSongsUpdated(s   => setSongs(s))
    window.phr0st?.onStateUpdate(data => {
      if (data.event === 'midi:loopPad') {
        // Handled inside PerformView via smRef — nothing needed here
      }
    })
  }, [])

  const activeSong = songs.find(s => s.id === activeSongId) ?? songs[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d0d14', color: '#e0e0f0' }}>
      {/* Top bar */}
      <div style={{ background: '#13132a', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '2px solid #2a2a3a', flexShrink: 0 }}>
        <span style={{ color: '#a855f7', fontWeight: 900, fontSize: '1rem', letterSpacing: '0.06em' }}>phr0stOS</span>
        <span style={{ color: '#e0e0f0', fontWeight: 700, fontSize: '0.9rem' }}>{activeSong?.title}</span>
        <span style={{ color: '#555', fontSize: '0.75rem' }}>{activeSong?.artist} · {activeSong?.bpm} BPM · {activeSong?.key}</span>
        <span style={{ marginLeft: 'auto', background: '#22c55e22', color: '#22c55e', fontSize: '0.65rem', padding: '3px 10px', borderRadius: 12, border: '1px solid #22c55e66', fontWeight: 700 }}>● LIVE</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setView(tab)} style={{
              padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.7rem',
              background: view === tab ? '#a855f722' : 'transparent',
              color:      view === tab ? '#a855f7'   : '#555',
            }}>{tab}</button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          songs={songs}
          setlist={setlist}
          activeSongId={activeSongId}
          onSelectSong={(id) => { setActiveSongId(id); setView('Perform') }}
        />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {view === 'Perform'  && <PerformView song={activeSong} />}
          {view === 'Library'  && <LibraryView songs={songs} onSelect={s => { setActiveSongId(s.id); setView('Perform') }} />}
          {view === 'Settings' && <SettingsView />}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Manual smoke test in browser**

```bash
npx vite
```
Open `http://localhost:5173`. Verify:
- [ ] App loads with dark theme, no console errors
- [ ] Sidebar shows Basket Case; tab navigation works
- [ ] Click "Start Song" — beat dots flash, no overlay for ~1.4 seconds (prep bar at 170 BPM)
- [ ] Count-in overlay appears: header reads "Song Start: Count In", no from→to arrow
- [ ] Beat numbers cycle: 1, (blank), 2, (blank), 1, 2, 3, 4
- [ ] 8 dots fill left-to-right as beats pass
- [ ] Intro section activates (green) after count-in
- [ ] Sections auto-advance with count-in overlay between each
- [ ] Loop toggle (↻) makes section repeat instead of advancing
- [ ] Cancel button during count-in returns to idle (overlay hides, Stop becomes Start Song)
- [ ] Library search filters by title

- [ ] **Step 6: Commit**

```bash
git add src/components/ src/App.jsx src/demoSongs.js
git commit -m "feat: app routing, all views, MIDI loop pad wired from main"
```

---

### Task 14: Run all tests + final verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```
Expected output (all pass):
```
✓ tests/songLibrary.test.js       (9 tests)
✓ tests/songStateMachine.test.js  (18 tests)
✓ tests/dmxEngine.test.js         (7 tests)
```

- [ ] **Step 2: Fix any failing tests before proceeding**

If a test fails, read the failure message, fix the source file, re-run, confirm green.

- [ ] **Step 3: Build for production**

```bash
npm run build
```
Expected: `dist/` folder created, no errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: phr0stOS v0.1 — full build passing all tests"
```
