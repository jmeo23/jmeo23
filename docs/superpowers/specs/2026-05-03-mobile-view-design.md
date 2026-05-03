# Mobile View Design

**Date:** 2026-05-03  
**Status:** Approved

## Overview

Add a mobile-optimized view of phr0stOS for iPhone use on stage. The mobile view is triggered automatically when the viewport width is under 520px (e.g., opening `http://<desktop-ip>:5173` in iPhone Safari on the same WiFi network). The desktop layout is completely unchanged.

The primary use case: performer holds iPhone on stage, monitors current section and bar count, taps to jump sections, starts/stops the song, and toggles loop — all with large, easy tap targets.

## Architecture

### `src/lib/useMobileView.js`

A hook that listens to `window.resize` and returns `true` when `window.innerWidth < 520`. Used only in `App.jsx` to branch between desktop and mobile shells.

### `src/lib/usePerformEngine.js`

All stateful logic extracted from `PerformView.jsx` into a shared hook:

- State: `smState`, `activeSection`, `currentBar`, `totalBars`, `beatIndex`, `clickOn`, `overlay`, `countInDisplay`, `dotsFilled`, `isLooping`, `pendingSection`, `currentScene`, `sceneName`, `autoPlay`
- Refs: `smRef`, `engineRef`, `dotsRef`, `autoPlayRef`, `pendingAutoStartRef`, `actionRef`
- Functions: `startSong()`, `stopSong()`, `handleCancel()`, `getSectionStatus(idx)`
- Effects: MIDI event wiring, auto-advance on song change, `onStateChange` callback

`PerformView.jsx` is refactored to consume `usePerformEngine` with no behavior change. `MobilePerformView.jsx` consumes the same hook.

### `src/components/MobilePerformView.jsx`

New component. Uses `usePerformEngine`. Layout:

```
┌─────────────────────────┐
│ [top bar — from App]    │
├─────────────────────────┤
│  section cards (scroll) │
│  · · ·                  │
│  [▶ DMX Scene] toggle   │
│  [DMX panel — if open]  │
├─────────────────────────┤
│ [♩ CLK]  [▶/■ Start/Stop]  [↻ Loop] │
└─────────────────────────┘
```

**Section cards:**
- Border-radius 12px, padding 13px 14px
- Section name: `1.05rem`, bold
- Bar count: `0.65rem`, monospace, dim
- Loop button: 38×38px touch target, border-radius 10px, purple when active
- Progress bar: 3px height
- Status colours match desktop (green = active, purple = looping, amber = pending, faded = done)

**Bottom bar (fixed, always visible):**
- Height ~80px, `background: #13132a`, `border-top: 2px solid #1e1e3a`
- **CLK button:** 56×56px square, toggles click track on/off
- **Start/Stop button:** `flex: 2`, padding 17px, font 0.95rem, border-radius 16px. Green (`#22c55e`) when idle, red (`#ef4444`) when playing
- **Loop button:** 56×56px square, purple when loop is active, dim when idle

**DMX row (above bottom bar):**
- Single collapsed row: `▶ DMX Scene` label, tapping expands the `DmxPanel` inline
- Hidden by default; state is local to `MobilePerformView`

**CountdownOverlay:** reused as-is (already covers full screen).

### `App.jsx` — mobile shell

When `isMobile` is true, `App.jsx` renders a different shell:

**Top bar:**
- `phr0stOS` logo · divider · current song title · LIVE/IDLE badge · `☰` hamburger
- No tab buttons

**Body:**
- No `Sidebar` component
- Full-width `MobilePerformView` (or `LibraryView` / `SetlistEditor` / `SettingsView` when navigated to via drawer)

**Hamburger drawer:**
- Slides in from the left as an absolute overlay, width 220px
- Shows the loaded setlist (same song list as `Sidebar`), active song highlighted green
- Footer links: Sets · Library · Settings (tap navigates and closes drawer)
- Tap the overlay behind the drawer to close
- State: `drawerOpen` boolean, local to `App.jsx`

## Behaviour Details

- **Song selection in drawer:** tapping a song calls `onSelectSong(id)` and closes the drawer, same as the desktop sidebar
- **Auto-play:** the `AUTO` toggle is omitted from the mobile UI. The `autoPlay` state lives in `usePerformEngine` and defaults to `false` on mobile; MIDI-triggered auto-advance still works as normal
- **Break view:** `BreakView` renders inside `MobilePerformView` the same way it does in `PerformView` — full-screen centered content, no bottom bar
- **Viewport meta tag:** `index.html` must have `<meta name="viewport" content="width=device-width, initial-scale=1">` to prevent iPhone Safari from scaling the desktop layout

## Files Changed

| File | Change |
|------|--------|
| `src/lib/useMobileView.js` | New — viewport width hook |
| `src/lib/usePerformEngine.js` | New — logic extracted from PerformView |
| `src/components/MobilePerformView.jsx` | New — mobile layout |
| `src/components/PerformView.jsx` | Refactor to use `usePerformEngine`; no behaviour change |
| `src/App.jsx` | Branch on `isMobile`; add drawer state |
| `index.html` | Add viewport meta if missing |

## Out of Scope

- `LibraryView`, `SetlistEditor`, `SettingsView` are not restyled for mobile — they render as-is when navigated to via the drawer
- No native app packaging (PWA manifest, Capacitor, etc.)
- No font size changes to the desktop layout
