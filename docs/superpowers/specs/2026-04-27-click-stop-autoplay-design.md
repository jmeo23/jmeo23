# Click Stop on Song End + AutoPlay Feature

**Date:** 2026-04-27  
**Status:** Approved

---

## Problem Statement

Two issues:

1. **Click overlap bug** — When a song finishes its last section, the AudioEngine is not stopped. The click keeps running. If the user hits Start Song again, a second engine starts while the first is still running, producing overlapping click tracks.

2. **AutoPlay feature** — When a set is loaded, users want the option for the app to automatically advance to the next song in the set when the current song ends, going through the normal count-in flow. AutoPlay must not cross set boundaries.

---

## Bug Fix: Click Not Stopping on Song End

**Root cause:** `PerformView.jsx:82` — the `songEnded` handler resets React state but never calls `engineRef.current?.stop()`.

**Fix:** Add `engineRef.current?.stop()` as the first statement in the `songEnded` handler, before any state updates. `AudioEngine.stop()` is idempotent and safe to call in any state.

No other files touched for this fix.

---

## AutoPlay Feature

### Architecture

**App.jsx** computes two things and passes them to PerformView:

- `nextSong` — the full song object immediately after `activeSong` within the same set in `loadedGig`. Returns `null` if: the current song is the last in its set, no set is loaded, or the current song is not found in any set. Pure derivation — no new state.
- `onAutoAdvance` — callback that calls `setActiveSongId(nextSong.id)`. App already handles song switching when `activeSongId` changes; nothing else needed.

**PerformView.jsx** receives `nextSong` and `onAutoAdvance` props and gains:

1. **AutoPlay toggle** — `useState(false)` for `autoPlay`. Small toggle button rendered next to the Start/Stop button, styled consistently with the existing click-mute toggle. Always visible and toggleable; only meaningful when `nextSong` is non-null.

2. **Updated `songEnded` handler:**
   - `engineRef.current?.stop()` — stops click immediately (bug fix)
   - Reset state (idle, no active section, no scene, no pending) — same as now
   - If `autoPlay && nextSong`: set `pendingAutoStartRef.current = true`, call `onAutoAdvance()`
   - Otherwise: song ends cleanly, no further action

3. **Auto-start effect** — `useEffect` keyed on `song?.id`. When the song prop changes because App advanced `activeSongId`, if `pendingAutoStartRef.current` is true: clear the ref and call `startSong()`. Using a ref (not state) avoids a re-render loop. The `song?.id` key ensures the effect only fires on an actual song change.

### Count-in Behavior

AutoPlay transitions go through the full normal count-in flow: prep bar + 8-beat countdown. This is automatic — `startSong()` always begins with `songStart:prepBar` state, unchanged.

### Set Boundary Rule

AutoPlay never crosses a set boundary. `nextSong` is computed within a single set — if `activeSongId` is the last song in Set 1, `nextSong` is `null` even if Set 2 has songs loaded.

### Edge Cases

| Scenario | Behavior |
|---|---|
| Manual Stop while AutoPlay on | `stopSong()` never sets `pendingAutoStartRef` — no auto-advance |
| No set loaded | `nextSong` is null — toggle has no effect even if on |
| User clicks different song from sidebar while idle | `pendingAutoStartRef` is false — no auto-start |
| Last song in set | `nextSong` is null — song ends cleanly regardless of AutoPlay toggle |

---

## Files Changed

| File | Change |
|---|---|
| `src/components/PerformView.jsx` | Bug fix in `songEnded` + AutoPlay toggle + updated handler + auto-start effect |
| `src/App.jsx` | Compute `nextSong`, add `onAutoAdvance`, pass both to PerformView |

---

## Out of Scope

- AutoPlay crossing set boundaries
- AutoPlay persisting across app restarts (session-only toggle state is sufficient)
- Any changes to `songStateMachine.js` or `audioEngine.js`
