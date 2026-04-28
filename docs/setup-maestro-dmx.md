# phr0stOS + Maestro DMX — Setup Guide

---

## Overview

phr0stOS and Maestro DMX serve different roles in your live show. Understanding the split helps you set up correctly:

| | phr0stOS | Maestro DMX |
|---|---|---|
| **Role** | Band timing, click track, section management | Lighting design, fixture programming |
| **Runs on** | Drummer's laptop (Electron app) | Lighting operator's laptop (or same machine) |
| **DMX output** | Simple per-section scenes (intro, verse, chorus…) | Full programmer: chases, pixel mapping, timelines |
| **Triggered by** | Song section changes (automatic) | MIDI note/program change from phr0stOS |

**Choose your integration mode before you start:**

- **Mode A — phr0stOS standalone** (no Maestro): phr0stOS owns the DMX universe directly. Simple scenes only. Good for small shows or when you have no dedicated lighting operator.
- **Mode B — phr0stOS + Maestro** (recommended for full shows): Maestro programs the light show. phr0stOS triggers Maestro cues automatically when song sections change. The lighting operator designs scenes in Maestro; phr0stOS fires them at the right musical moment.

---

## Hardware You Need

### Both modes
- **USB DMX interface** — any of these work:
  - Enttec Open DMX USB
  - Enttec DMX USB Pro
  - DMXking ultraDMX Micro
  - Any device that presents as a serial port sending DMX 512

### Mode B only
- **Virtual MIDI port** (if both apps run on the same laptop) — use [loopMIDI](https://www.tobias-erichsen.de/software/loopmidi.html) (free, Windows)
- **MIDI cable + USB MIDI interface** (if phr0stOS and Maestro run on different laptops)

---

## Mode A — phr0stOS Standalone (Direct DMX)

phr0stOS sends a raw 512-byte DMX frame whenever a song section activates. No Maestro involved.

### Setup steps

1. **Plug in your USB DMX interface** on the drummer's laptop.

2. **Open phr0stOS → Settings tab** and select the correct serial port (e.g. `COM4` on Windows).

3. **Define DMX scenes in your song JSON files.** Each scene maps fixture channels to values:
   ```json
   "dmxScenes": {
     "intro":  { "pars": [40,40,40,40,40,40], "wash": [0,0,0,0],             "strobe": 0,  "laser": 30,  "smoke": 20 },
     "verse":  { "pars": [80,60,80,60,80,60], "wash": [60,60,60,60],         "strobe": 0,  "laser": 0,   "smoke": 0  },
     "chorus": { "pars": [255,255,255,255,255,255], "wash": [200,200,200,200],"strobe": 60, "laser": 80,  "smoke": 40 },
     "bridge": { "pars": [120,0,120,0,120,0], "wash": [100,0,100,0],         "strobe": 30, "laser": 120, "smoke": 0  },
     "outro":  { "pars": [30,30,30,30,30,30], "wash": [20,20,20,20],         "strobe": 0,  "laser": 0,   "smoke": 10 }
   }
   ```

4. **DMX channel map** (phr0stOS default):

   | Channels | Fixture |
   |---|---|
   | 0 – 5 | PAR cans (6 fixtures, 1 channel each) |
   | 6 – 9 | Wash lights (4 fixtures, 1 channel each) |
   | 10 | Strobe (0–255 intensity) |
   | 11 | Laser (0–255) |
   | 12 | Smoke machine (0–255) |

   Adjust your fixture patch in your DMX hardware to match, or edit `electron/dmxEngine.js` to match your rig.

5. **Start a song** — phr0stOS fires each scene as sections advance. No further action needed.

### Limitations of Mode A
- No chase effects or dynamic animations (static snapshots only)
- No per-beat light effects beyond the count-in pulse
- Scene editing requires editing JSON files by hand (Song Editor UI is on the roadmap)

---

## Mode B — phr0stOS + Maestro (Full Show)

phr0stOS sends MIDI notes to Maestro when each section activates. Maestro maps those notes to fully programmed lighting scenes or cues.

### Architecture

```
phr0stOS (drummer's laptop)
  ↓  MIDI note-on (virtual port or cable)
Maestro DMX (lighting op's laptop or same machine)
  ↓  DMX 512
USB DMX interface → fixtures
```

### Step 1 — Set up the MIDI connection

**Same laptop:**
1. Download and install [loopMIDI](https://www.tobias-erichsen.de/software/loopmidi.html).
2. Open loopMIDI, click `+` to create a virtual port named `phr0stOS`.

**Two laptops:**
1. Connect a MIDI interface (USB) to each laptop.
2. Run a MIDI cable from the drummer's MIDI OUT to the lighting op's MIDI IN.

### Step 2 — Enable MIDI output in phr0stOS

> **Note:** phr0stOS currently handles MIDI **input** (Roland SPD-SX loop pad). MIDI output for Maestro cue triggering is a planned feature. Until it ships, use the workaround below.

**Workaround — use a DAW as a relay:**
1. Load a DAW (Ableton, Reaper, etc.) alongside phr0stOS on the drummer's laptop.
2. Configure the DAW to receive audio clock or a MIDI track triggered manually, and forward MIDI notes to the `phr0stOS` loopMIDI port that Maestro listens to.

Alternatively, a band member can trigger Maestro cues manually in time with section changes until native MIDI output is added to phr0stOS.

### Step 3 — Program Maestro scenes

In Maestro, create one scene per song section type:

| MIDI Note | Section | Maestro Scene |
|---|---|---|
| C3 (48) | Intro | Intro scene |
| D3 (50) | Verse | Verse scene |
| E3 (52) | Chorus | Chorus scene |
| F3 (53) | Bridge | Bridge scene |
| G3 (55) | Outro | Outro scene |

You can use any note mapping you like — the above is a suggested convention.

1. In Maestro, open **MIDI Settings** and select the incoming MIDI device (`phr0stOS` virtual port or your MIDI interface).
2. For each scene, assign a **MIDI trigger** (note-on, any velocity).
3. Programme the scene fully in Maestro — chases, pixel effects, dimmer curves, whatever you need.

### Step 4 — Test the rig

1. Open Maestro, confirm it's receiving MIDI (use Maestro's MIDI monitor).
2. Start phr0stOS, load a song, hit **Start Song**.
3. As sections advance, verify the corresponding Maestro scenes fire.
4. Walk the stage and check all fixtures respond.

---

## Count-In DMX (Both Modes)

phr0stOS can animate fixtures during the 3-bar count-in before each song. This is independent of Maestro — it fires directly from phr0stOS's DMX engine.

Two animation types are available per song:

**beat-pulse** — snaps to `peak` values on each beat, fades to `base` between beats:
```json
"countInScene": {
  "type": "beat-pulse",
  "peak": { "pars": [255,255,255,255,255,255], "wash": [255,255,255,255], "strobe": 0, "laser": 0, "smoke": 0 },
  "base": { "pars": [0,0,0,0,0,0],             "wash": [0,0,0,0],         "strobe": 0, "laser": 0, "smoke": 0 }
}
```

**fade** — linear interpolation from `from` → `to` over the full 3-bar startup:
```json
"countInScene": {
  "type": "fade",
  "from": { "pars": [255,255,255,255,255,255], "wash": [200,200,200,200], "strobe": 0, "laser": 0, "smoke": 0 },
  "to":   { "pars": [0,0,0,0,0,0],             "wash": [0,0,0,0],         "strobe": 0, "laser": 0, "smoke": 0 }
}
```

When the Intro section activates, the Intro DMX scene (or Maestro cue) immediately overrides the count-in animation.

---

## Troubleshooting

| Symptom | Check |
|---|---|
| No DMX output | Confirm serial port in Settings matches device. Try unplugging and re-plugging the USB DMX interface. |
| Wrong scene fires | DMX channel map may not match your fixture patch. Check `electron/dmxEngine.js` channel assignments. |
| Maestro doesn't respond to MIDI | Confirm loopMIDI port is created and selected in both phr0stOS (output) and Maestro (input). Check Maestro's MIDI monitor. |
| Lights flash on section change then go dark | Fixture may be set to DMX hold-last on signal loss. Check fixture settings. |
| Count-in animation doesn't fire | Song JSON is missing `countInScene` block. Add one (see above). |
| `serialport not available` in phr0stOS console | Native modules need to be compiled: run `npx electron-rebuild` in the project directory. |

---

## Roadmap Items Relevant to This Setup

The following features are planned and will improve the Maestro integration:

- **MIDI output** — phr0stOS will send MIDI note-on on each section activation, removing the need for a DAW relay
- **Per-section DMX channel editor UI** — edit scenes visually without touching JSON files
- **Manual DMX override** — temporary level adjustments mid-show without losing the auto-scene on next section change
