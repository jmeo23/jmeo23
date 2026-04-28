# phr0stOS

Live band performance app — click track, DMX light scenes, song section auto-advance, and mobile WiFi control.

**Runs on:** Windows, macOS, Linux (Electron desktop). iPad/iPhone connect over WiFi via browser.

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm

```bash
npm install
```

### Run in dev mode

```bash
npm run dev
```

Starts Vite at `http://localhost:5173`, then launches Electron pointing at it. DevTools open automatically.

### Run tests

```bash
npm test
```

### Production build

```bash
npm run build   # builds Vite bundle into dist/
npm run preview # runs Electron against the built dist/
```

---

## What to test (golden path)

1. App loads — dark purple/green theme, "Basket Case" in the left sidebar
2. **Start Song** — beat dots flash for ~1.4s (prep bar at 170 BPM, no overlay yet)
3. **"Song Start: Count In"** overlay appears — large numbers cycle `1 · (blank) · 2 · (blank) · 1 2 3 4`, 8 dots fill left-to-right
4. **Intro** section turns green, DMX panel shows fixture levels
5. Song auto-advances through all sections with a 2-bar count-in overlay between each
6. Click **↻** on a section while active → turns purple and loops instead of advancing
7. Click **↻** again (or tap another section) to exit loop
8. **Cancel** button during any count-in returns to idle immediately
9. **Library** tab → search filters by title or key
10. **Settings** tab → serial port and MIDI fields (no hardware required to test UI)

---

## Hardware (optional — app works without it)

### DMX (Maestro USB controller)
1. Open the **Settings** tab
2. Enter the serial port (e.g. `COM3` on Windows, `/dev/ttyUSB0` on Linux/Mac)
3. Click **Save & Connect**

### MIDI (Roland SPD-SX loop pad)
1. Connect the SPD-SX via USB
2. Open **Settings**, enter the loop pad MIDI note number (default: 36)
3. Click **Save & Connect**
4. The configured pad toggles loop on/off for the active section

### Native module rebuild (Windows)
`midi` and `serialport` require native compilation. Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the "Desktop development with C++" workload, then:

```bash
npx electron-rebuild
```

---

## Song library

Drop `.json` song files into `~/phr0stOS/songs/`. The app watches the folder — files appear in the library instantly without restarting.

Setlists live in `~/phr0stOS/setlists/`.

See `docs/superpowers/specs/2026-04-27-phr0stOS-design.md` for the full song JSON format.

---

## Mobile (iPad / iPhone)

Build for production first (`npm run build`), then launch the app. Mobile devices on the same WiFi network can open:

```
http://[your-laptop-ip]:3000
```

The app serves the same React UI over Express + WebSocket.

---

## Stack

| Layer | Tech |
|-------|------|
| Desktop shell | Electron 28 |
| UI | React 18 + Vite 5 |
| Click track | Web Audio API (lookahead scheduler) |
| DMX | node-serialport → Maestro USB controller |
| MIDI | node-midi → Roland SPD-SX |
| Mobile server | Express 4 + WebSocket (ws 8) |
| Tests | Vitest |
