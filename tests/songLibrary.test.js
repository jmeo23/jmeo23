import { describe, test, expect, beforeEach, vi } from 'vitest'
import { Volume } from 'memfs'

// vi.hoisted runs before vi.mock factories (and before module-level code),
// so `vol` is available inside the vi.mock factory without TDZ issues.
const { vol } = vi.hoisted(() => {
  const { Volume } = require('memfs')
  return { vol: new Volume() }
})

vi.mock('fs/promises', async () => {
  return {
    readFile:  (...args) => vol.promises.readFile(...args),
    writeFile: (...args) => vol.promises.writeFile(...args),
    mkdir:     (...args) => vol.promises.mkdir(...args),
    readdir:   (...args) => vol.promises.readdir(...args),
    rm:        (...args) => vol.promises.rm(...args),
    stat:      (...args) => vol.promises.stat(...args),
  }
})

const { loadSong, loadSetlist, validateSong } = await import('../electron/songLibrary.mjs')

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
