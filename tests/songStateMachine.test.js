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
