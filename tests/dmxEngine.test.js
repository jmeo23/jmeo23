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
