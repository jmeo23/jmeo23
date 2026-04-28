# Lighting Integration — Open Questions

**Date:** 2026-04-28  
**Status:** Pending investigation

---

## The Goal

Build a live show where:

- The **Roland SPD-SX** sends MIDI to phr0stOS to control the set list, navigate songs, and trigger loops — keeping the drummer in command of the show's flow without a dedicated tech
- A **click track** runs from phr0stOS, keeping the band tight and enabling precise, automated lighting cues tied to the music
- **Lighting scenes change automatically** when song sections change (verse → chorus → bridge) — no manual triggering by a lighting operator for each cue
- **Any band member** (or stage crew) can pull up phr0stOS on their phone to see the current song, setlist, and status
- The result: a more professional show with tighter playing, consistent lighting, and less cognitive load on individual band members

---

## Current Lighting Setup (As Understood)

- iPad running **TouchOSC** with a layout called `maestro-1.5.tosc`
- The guitar player fires lighting cues manually from the iPad during the show
- Commands go over a local WiFi router (or dongle) to a laptop running some control software
- That software outputs **DMX 512** to a USB DMX interface → fixtures

### Open Question: What Is "Maestro"?

The `.tosc` file is named `maestro-1.5`. We don't know yet if this refers to:

- **Madrix** — German LED control software (Madrix Plexus hardware or Madrix software with OSC input)
- **QLC+** — free open-source lighting software
- **Enttec** or another DMX controller platform
- A hardware controller with a built-in OSC server
- Something else entirely

**To resolve:** Check the lighting laptop for installed software. Open `C:\Users\julat\Downloads\maestro-1.5.tosc` in the TouchOSC Editor — the **OSC Host** address and the **button script addresses** (e.g. `/show/cue/index` vs `/qlcplus/...`) will identify the target software.

---

## Approach Comparison

### Option A — phr0stOS Standalone (Direct DMX)

phr0stOS writes raw DMX 512 frames directly via a USB DMX interface on its own.

| Pros | Cons |
|---|---|
| No external software dependency | Static scenes only — no chases, fades, or pixel mapping |
| Fully integrated — section change = instant scene | All scene editing in JSON files until Song Editor ships |
| Works without a lighting laptop | Limited programming capability vs. dedicated software |
| Already partially implemented | Doesn't reuse your existing show's light programming |

**Best for:** Rehearsals, small shows, situations with no dedicated lighting operator.

---

### Option B — phr0stOS → Maestro/Madrix (OSC or MIDI trigger)

phr0stOS detects section changes and sends an OSC or MIDI message to the lighting software. The lighting operator programs the actual scenes in Maestro/Madrix.

| Pros | Cons |
|---|---|
| Full lighting programming power (chases, pixel effects, timelines) | Requires knowing what "Maestro" actually is and its OSC/MIDI API |
| Reuses your existing rig and current show programming | Adds a dependency — lighting laptop must be running and on the network |
| Lighting operator retains creative control over scene design | Needs WiFi or MIDI cable between drummer's laptop and lighting laptop |
| Builds on your current TouchOSC setup | More moving parts to troubleshoot |

**Best for:** Full shows with an existing rig and a lighting op who programs scenes.

---

### Option C — Ableton Live as Central Hub

Ableton handles click track, backing tracks, MIDI routing, and lighting triggers all in one place.

| Pros | Cons |
|---|---|
| Industry standard — widely documented | Expensive licence |
| Powerful MIDI routing, clip launching, Max for Live | Steep learning curve |
| Can drive backing tracks alongside lighting | Replaces phr0stOS rather than augmenting it |
| Ableton Link syncs tempo across devices | Overkill if you just want click + automatic lighting |

**Best for:** Bands that want full backing tracks, complex MIDI routing, and are willing to invest time learning Ableton.

---

## Important Note — SPD-SX as Show Controller

The Roland SPD-SX should be the primary physical controller for the drummer to run the show hands-free:

- **Start / stop songs** — drummer initiates the count-in without touching a mouse or keyboard
- **Navigate the set list** — next song, previous song from the kit
- **Trigger loops** — toggle the active loop section in PerformView
- **Advance sections manually** if needed mid-song

phr0stOS already handles one MIDI input (loop pad, default note 36). Full SPD-SX integration — start-song note, set navigation — is the next major hardware feature.

---

## Next Steps

1. **Identify Maestro** — check the lighting laptop for installed software; read OSC addresses from the `.tosc` file
2. **Decide integration mode** — Option A (standalone DMX), B (OSC/MIDI trigger), or both
3. **Test basic OSC pipeline** — manually fire a cue from phr0stOS to confirm the network path works end-to-end
4. **Design the scene library** — global named scenes + per-section assignment (brainstorming in progress)
5. **Build Song Editor** — required for assigning scenes to sections without editing JSON files
6. **SPD-SX full integration** — start song, set navigation, loop trigger from the pad
