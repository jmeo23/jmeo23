# phr0stOS — Design Spec
**Date:** 2026-04-27  
**Status:** In progress — brainstorming complete, implementation plan not yet written

---

## What Is phr0stOS

A live band performance app for controlling a light show and managing song sections in real time. The primary user is the drummer (or any band member), who loads a setlist, starts a song, and the app automatically advances through sections — triggering DMX light scenes at each transition. Any section can be looped to extend it while the singer talks, and the Roland SPD-SX can toggle loop mode via a physical pad.

**Runs on:** Windows, macOS, Linux (Electron desktop). iPad and iPhone connect over WiFi via browser.

---

## Decisions Made

### Platform & Stack
- **Electron** — desktop shell, ships as a single installer (.exe / .dmg / .deb)
- **React + Vite** — renderer/UI layer
- **Node.js main process** — owns all hardware access and file I/O
- **Express + WebSocket** — local HTTP server inside the Electron app, serves the React UI so iPads/iPhones can connect over WiFi via Safari/Chrome
- **No Logic Pro, no external DAW** — phr0stOS is the click source

### Architecture: Main/Renderer Split
```
Electron Main Process (Node.js)
├── node-serialport     → Maestro DMX controller (USB serial)
├── node-midi           → Roland SPD-SX MIDI input
├── fs                  → song + setlist JSON files
└── Express + WebSocket → serves UI to mobile devices on WiFi

Electron Renderer (React + Vite)
└── Web Audio API       → click track (lookahead scheduler)

Mobile (iPad / iPhone)
└── Safari/Chrome       → connects to http://[laptop-ip]:3000 over WiFi
```

The renderer is **read-only for timing** — it displays state, never drives it. React renders the UI; the audio scheduler owns beat count, bar count, and section transitions.

### Click Track
- **Web Audio API lookahead scheduler** — schedules audio 100ms ahead against the hardware audio clock (not `setInterval`)
- Downbeat uses a user-loaded `.wav` file (e.g. `Synth_Square_A_hi.wav`)
- Upbeats use a synthesized 900Hz tone (or a second loaded WAV)
- BPM is **per-song** and never changes during a song, even during section switches
- Click runs continuously — section transitions happen around it, not instead of it

### DMX
- **Maestro DMX controller** via USB serial (`node-serialport` in main process)
- **Fixtures:** 6 PAR cans, 4 wash lights, 1 strobe, 1 laser, 1 smoke machine
- **Scenes** are named (intro, verse, chorus, bridge, solo, outro) and defined per song as a set of DMX channel values
- Scene fires automatically when a section becomes active

### MIDI
- **Roland SPD-SX** connects via USB MIDI
- `node-midi` in the main process handles input with ~1ms latency
- One configurable pad toggles **loop on/off** for the currently active section
- State change happens in main process immediately; UI update follows async

---

## UI Layout

### Desktop (Electron window, 1280×800+)
Two-column layout:
- **Left sidebar:** Tonight's Setlist (ordered, current song highlighted green) + Song Library (searchable)
- **Main area:** Song title + metadata · Click track beat dots · Vertical section list · DMX fixture channel bars

### Mobile (iPad / iPhone, browser over WiFi)
Tab bar navigation: **Perform · Library · DMX · Set**
- Perform tab mirrors the desktop main area with larger tap targets
- Setlist tab shows tonight's running order

### Color scheme
Purple (`#a855f7`) + green (`#22c55e`) on dark background (`#0d0d14`). WCAG AA accessible. Optimized for readability in dark stage lighting.

---

## Song Start Count-In

When "Start Song" is pressed, a 3-bar startup sequence runs before the first section activates:

### State Machine

```
idle → songStart:prepBar → songStart:countIn → playing (Intro active)
                                   ↓ cancel
                                 idle
```

### Prep Bar (`songStart:prepBar`)
- Click starts immediately at the song's BPM
- Beat dots flash as normal
- No overlay — the performer screen shows as-is (no section active yet)
- DMX stays dark (no scene fired yet)
- Lasts exactly 1 bar (4 beats)
- Pressing "Stop" during this phase: click stops, returns to `idle`

### Count-In (`songStart:countIn`)
- Overlay appears after the prep bar completes
- **Header:** `"Song Start: Count In"`
- **No from→to arrow** (hidden — no "from" section exists)
- Large beat number cycles **1 · 2 · 1 2 3 4** (bar 1 half-note feel, bar 2 full count)
- 8 dots (two rows of 4) fill as beats pass
- Cancel button and "Stop" button both stop the click and return to `idle`
- On beat 8 completion: Intro section activates, DMX intro scene fires, state → `playing`

### "Start Song" Button
- Immediately changes to **"Stop"** when pressed (covers prep bar + count-in + playing)
- Cancel in the overlay and Stop button are equivalent during `songStart`

### Count-In DMX Animation

Each song can define an optional `countInScene` that animates fixtures during the 3-bar startup sequence (prep bar + count-in). If omitted, DMX stays dark.

**Preset types:**

| Type | Parameters | Behavior |
|------|-----------|---------|
| `beat-pulse` | `peak`, `base` | Snaps to `peak` on each of the 8 beats, decays to `base` between beats |
| `fade` | `from`, `to` | Linearly interpolates from `from` → `to` over the full 3-bar duration |

**Song JSON:**
```json
"countInScene": {
  "type": "beat-pulse",
  "peak": { "pars": [255,255,255,255,255,255], "wash": [200,200,200,200], "strobe": 0, "laser": 0, "smoke": 0 },
  "base": { "pars": [0,0,0,0,0,0], "wash": [0,0,0,0], "strobe": 0, "laser": 0, "smoke": 0 }
}
```
```json
"countInScene": {
  "type": "fade",
  "from": { "pars": [255,255,255,255,255,255], "wash": [200,200,200,200], "strobe": 0, "laser": 0, "smoke": 0 },
  "to":   { "pars": [0,0,0,0,0,0],             "wash": [0,0,0,0],           "strobe": 0, "laser": 0, "smoke": 0 }
}
```

**Engine behavior:**
- `beat-pulse`: DMX snaps to `peak` on each beat, linearly fades to `base` over the remaining beat interval
- `fade`: DMX set to `from` at prep bar start, linearly interpolates to `to` over the full 3-bar duration
- Scene handoff: when Intro activates, the Intro DMX scene fires immediately and overrides the count-in animation
- All animation timing is owned by the DMX engine in the main process — no animation logic in the renderer

---

## Song Sections

### Behavior
- Only **one section is active** at a time
- Sections display **vertically** in song order
- Active section highlighted **green**
- Looping section highlighted **purple**
- Pending (queued) section pulses **amber**
- Each section card shows name, bar count, and a progress bar filling as bars elapse

### Auto-Advance
When "Start Song" is pressed, the song plays through all sections automatically:
1. Section plays for its defined bar count
2. At the end, a **2-bar count-in** fires: `1 · 2 · | 1-2-3-4`
3. On the downbeat after beat 8, the next section becomes active and its DMX scene fires
4. This repeats until the final section (Outro), then the song stops

### Manual Section Jump
- Tap any section card → immediate 2-bar count-in → switch
- During count-in, tapping the SPD-SX loop pad **cancels** the switch and re-engages loop on current section

### Loop Mode
- ↻ button on any section card (or SPD-SX configured pad) toggles loop
- Looping section: bar count resets at the end instead of triggering auto-advance
- To exit loop: tap another section (triggers count-in) or tap ↻ again (disengages, auto-advance resumes)

### Count-In Display
A full-screen overlay shows during the 2-bar count-in:
- Section transition: `Verse 1 → Chorus`
- Large beat number: cycles **1 · 2 · 1 2 3 4** (bar 1 shows half notes; bar 2 is full count)
- 8 dots (two rows of 4) fill as beats pass
- "Cancel" button and SPD-SX hint shown

---

## Data Model

### Song (JSON file, one per song)
```json
{
  "id": "basket-case",
  "title": "Basket Case",
  "artist": "Green Day",
  "bpm": 170,
  "timeSignature": [4, 4],
  "key": "Eb major",
  "sections": [
    { "id": "intro",       "name": "Intro",       "bars": 16, "dmxScene": "intro"  },
    { "id": "verse1",      "name": "Verse 1",     "bars": 8,  "dmxScene": "verse"  },
    { "id": "chorus1",     "name": "Chorus",      "bars": 8,  "dmxScene": "chorus" },
    { "id": "verse2",      "name": "Verse 2",     "bars": 8,  "dmxScene": "verse"  },
    { "id": "chorus2",     "name": "Chorus",      "bars": 8,  "dmxScene": "chorus" },
    { "id": "bridgesolo",  "name": "Bridge/Solo", "bars": 8,  "dmxScene": "bridge" },
    { "id": "chorus3",     "name": "Chorus",      "bars": 8,  "dmxScene": "chorus" },
    { "id": "outro",       "name": "Outro",       "bars": 8,  "dmxScene": "outro"  }
  ],
  "dmxScenes": {
    "intro":  { "pars": [40,40,40,40,40,40], "wash": [0,0,0,0],           "strobe": 0,  "laser": 30,  "smoke": 20 },
    "verse":  { "pars": [80,60,80,60,80,60], "wash": [60,60,60,60],       "strobe": 0,  "laser": 0,   "smoke": 0  },
    "chorus": { "pars": [255,255,255,255,255,255], "wash": [200,200,200,200], "strobe": 60, "laser": 80, "smoke": 40 },
    "bridge": { "pars": [120,0,120,0,120,0], "wash": [100,0,100,0],       "strobe": 30, "laser": 120, "smoke": 0  },
    "outro":  { "pars": [30,30,30,30,30,30], "wash": [20,20,20,20],       "strobe": 0,  "laser": 0,   "smoke": 10 }
  }
}
```

Songs live in `~/phr0stOS/songs/`. The app watches this folder — drop a `.json` file in and it appears in the library.

### Setlist (JSON file, one per setlist)
```json
{
  "id": "friday-apr-25",
  "name": "Friday April 25th at Wild and Crazy Venue",
  "date": "2026-04-25",
  "songs": ["basket-case", "longview", "when-i-come-around"]
}
```
- Name and Date are **required**
- Songs are references to song IDs (songs always live in the library)
- Setlists live in `~/phr0stOS/setlists/`
- UI: search/browse library on one side, ordered setlist on the other. Add with `+`, remove with `×`, reorder by drag

### Song Library
- All songs always live in the library
- Searchable by name or key
- Songs are never deleted from a setlist — only removed from the running order

---

## Screens / Views

| Screen | Purpose |
|--------|---------|
| **Perform** | Main live view — sections, click, DMX |
| **Library** | Browse + search all songs, open song editor |
| **Song Editor** | Create/edit song metadata, sections, DMX scenes |
| **Setlist Editor** | Build tonight's set from library songs |
| **Settings** | Serial port selection, MIDI device, click WAV files, audio output |

---

## What Still Needs to Be Decided / Built

### Deferred to Implementation
- Per-section DMX channel editor UI (full 512-channel editor)
- Song import from JSON/CSV file
- Audio routing — separate volume controls for Click (IEM), Backing Tracks, FOH
- Network sync / multi-device control (architecture is ready, feature deferred)
- 10 demo songs pre-loaded in the library

### Open Questions
- **Second click WAV** — do upbeats use a different sound file, or just the synthesized tone?
- **MIDI pad mapping** — is one pad enough (loop toggle), or do we want pads for next section, cancel countdown, stop?
- **DMX manual override** — can the user override a scene's levels mid-show without losing the auto-scene on next switch?
- **Setlist screen on mobile** — should the drummer's iPhone show a simplified view (just sections + big loop button)?

---

## Reference Demo

A working interactive prototype exists at:
```
C:\WebApps\phr0stOS\.superpowers\brainstorm\1093-1777263767\content\
├── basketcase-v2.html    — full UI mock (vertical sections, auto-advance, DMX)
├── click-test.html       — click track test with WAV loading + countdown
├── countdown-mockup.html — countdown overlay mockup
└── responsive-layout.html — desktop/iPad/iPhone layout comparison
```

Serve via the brainstorm server at `http://localhost:59515` (restart with `scripts/start-server.sh --project-dir /c/WebApps/phr0stOS`).

---

## Next Step

Write the implementation plan (via `superpowers:writing-plans` skill) — breaking the build into phases:
1. **Phase 1:** Electron scaffold + React + Vite + local HTTP server
2. **Phase 2:** Song/setlist data layer (JSON read/write, library watcher)
3. **Phase 3:** Click track engine (Web Audio lookahead scheduler, WAV loading)
4. **Phase 4:** Section state machine (auto-advance, loop, countdown UI)
5. **Phase 5:** DMX engine (node-serialport, scene system)
6. **Phase 6:** MIDI input (node-midi, SPD-SX loop pad)
7. **Phase 7:** UI polish (WCAG AA, dark theme, mobile responsive)
8. **Phase 8:** Settings screen, demo songs, song editor
