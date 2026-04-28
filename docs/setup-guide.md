# phr0stOS Setup Guide

---

## What Is phr0stOS?

phr0stOS is a live-show management app for bands. It runs on a laptop (typically the drummer's) and provides:

- A **click track** that keeps the band tight
- A **set list** with ordered songs and breaks, navigable during a show
- **Section-by-section song structure** (intro, verse, chorus, bridge, outro) with visual cues
- **Automatic lighting cues** fired when song sections change
- **MIDI input** from a Roland SPD-SX (or any MIDI controller) so the drummer controls the show from the kit
- A **mobile web interface** so any band member or crew can view the current song and set status from their phone

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 18 or later | [nodejs.org](https://nodejs.org) |
| npm | comes with Node.js | |
| Git | any | For cloning the repo |
| Windows 10 / 11 | 64-bit | macOS support in progress |

---

## Installation

### 1. Clone the repository

```bash
git clone <repo-url> phr0stOS
cd phr0stOS
```

### 2. Install dependencies

```bash
npm install
```

### 3. (Optional) Compile native modules

Required for MIDI input and direct DMX output. If you only want the click track and set list, skip this step — the app starts without native modules.

```bash
npx electron-rebuild
```

If this fails, install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (Windows) with the "Desktop development with C++" workload, then try again.

---

## Running the App

### Development mode (hot reload)

Open two terminals:

**Terminal 1 — Vite dev server:**
```bash
npm run dev
```

**Terminal 2 — Electron:**
```bash
npm run electron
```

The Electron window opens automatically. The Vite dev server runs at `http://localhost:5173`. The mobile web server starts at `http://localhost:3000`.

### Production build

```bash
npm run build
npm run electron
```

---

## Songs Folder

phr0stOS loads songs from:

```
C:\Users\<you>\phr0stOS\songs\
```

The folder is created automatically on first launch. phr0stOS watches it live — drop in a `.json` file and it appears in the Library immediately, no restart needed.

### Song file format

```json
{
  "id": "unique-song-id",
  "title": "My Song",
  "artist": "The Band",
  "bpm": 120,
  "key": "A",
  "timeSignature": [4, 4],
  "sections": [
    { "id": "s1", "name": "Intro",  "bars": 8 },
    { "id": "s2", "name": "Verse",  "bars": 16 },
    { "id": "s3", "name": "Chorus", "bars": 8 },
    { "id": "s4", "name": "Bridge", "bars": 8 },
    { "id": "s5", "name": "Outro",  "bars": 8 }
  ]
}
```

- `id` must be unique across all songs
- `bpm` drives the click track tempo
- `timeSignature` is `[beatsPerBar, noteValue]` — e.g. `[4, 4]` for 4/4, `[6, 8]` for 6/8
- `sections` play in order; each `bars` value sets how long the section runs

---

## Settings

Open the **Settings** tab in phr0stOS to configure hardware. Settings are saved to `C:\Users\<you>\phr0stOS\settings.json`.

| Setting | Description | Default |
|---|---|---|
| Serial Port | COM port of USB DMX interface (e.g. `COM4`) | none |
| MIDI Device | Index of MIDI input device | `0` |
| Loop Pad Note | MIDI note that toggles the active loop section | `36` (C2) |
| Start Song Note | MIDI note that starts the song (optional) | none |

---

## MIDI Setup — Roland SPD-SX

The SPD-SX connects via USB and appears as a standard MIDI device.

1. Connect the SPD-SX to the laptop with a USB cable.
2. Open phr0stOS → **Settings**.
3. Set **MIDI Device** to `0` (or whichever index appears if you have multiple MIDI devices).
4. Set **Loop Pad Note** to the pad you want to use for loop toggling (default: 36 = C2 on the SPD-SX).
5. Set **Start Song Note** to the pad that remotely starts the song count-in (optional).

In PerformView, the loop pad toggles looping on the currently active section. The start-song note triggers the same flow as clicking "Start Song" on screen.

> **Roadmap:** Full SPD-SX set navigation (next song, previous song from the pad) is a planned feature.

---

## Mobile Web Access

Any device on the same network can open phr0stOS in a browser:

```
http://<laptop-ip>:3000
```

**Finding the laptop's IP (Windows):**
```
ipconfig
```
Look for the IPv4 address under the active adapter (Wi-Fi or Ethernet).

The console also logs `Mobile: http://localhost:3000` at startup — replace `localhost` with the actual IP for remote devices.

### Same machine vs. different machine

| Scenario | How to connect |
|---|---|
| phr0stOS on drummer's laptop, others on phones | Connect all devices to the band's WiFi router or hotspot. Open `http://<drummer-ip>:3000` |
| phr0stOS on a dedicated stage laptop | Same — connect to the stage network |
| Testing alone on one machine | Use `http://localhost:3000` |

> **Security note:** Authentication is on the roadmap. For now, keep the network private (band's router or personal hotspot). Do not expose port 3000 to a public network.

---

## Lighting Setup

See [`docs/setup-maestro-dmx.md`](setup-maestro-dmx.md) for full lighting integration details.

**Quick summary:**

| Mode | What it is | Good for |
|---|---|---|
| Standalone DMX | phr0stOS writes DMX directly via a USB DMX interface | Small shows, rehearsals |
| Maestro/Madrix trigger | phr0stOS sends OSC or MIDI to lighting software on section change | Full shows with existing rig |

See [`docs/open-questions/2026-04-28-lighting-setup.md`](open-questions/2026-04-28-lighting-setup.md) for the current decision in progress.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| App window doesn't open | Check the Electron terminal for errors. Confirm `npm run dev` is running first in dev mode. |
| Songs don't appear in Library | Confirm `~/phr0stOS/songs/` exists and contains valid `.json` files. Check the JSON is well-formed. |
| Click track sounds wrong or distorted | Close other audio apps that may be holding the audio device. Restart phr0stOS. |
| MIDI not responding | Run `npx electron-rebuild` to compile the native MIDI module. Reconnect the SPD-SX after launching. |
| DMX not working | Run `npx electron-rebuild`. Confirm the correct COM port in Settings. Try unplugging and replugging the USB DMX interface. |
| Mobile page not loading | Confirm all devices are on the same network. On Windows, allow Node.js through the firewall or open port 3000 manually. |
| `Cannot find module` errors | Run `npm install` again. |
| `serialport not available` in console | Native modules not compiled — run `npx electron-rebuild`. |
