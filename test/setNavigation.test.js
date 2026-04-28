import { describe, it, expect } from 'vitest'
import { computeNextSong } from '../src/lib/setNavigation.js'

const songs = [
  { id: 's1', title: 'Song 1' },
  { id: 's2', title: 'Song 2' },
  { id: 's3', title: 'Song 3' },
  { id: 's4', title: 'Song 4' },
]

describe('computeNextSong', () => {
  it('returns the next song object within the same set', () => {
    const gig = { sets: [{ songs: ['s1', 's2', 's3'] }, { songs: ['s4'] }] }
    expect(computeNextSong(gig, songs, 's1')).toEqual({ id: 's2', title: 'Song 2' })
  })

  it('returns null for the last song in a set', () => {
    const gig = { sets: [{ songs: ['s1', 's2', 's3'] }, { songs: ['s4'] }] }
    expect(computeNextSong(gig, songs, 's3')).toBeNull()
  })

  it('does not cross set boundaries', () => {
    const gig = { sets: [{ songs: ['s1'] }, { songs: ['s2'] }] }
    expect(computeNextSong(gig, songs, 's1')).toBeNull()
  })

  it('returns null when loadedGig is null', () => {
    expect(computeNextSong(null, songs, 's1')).toBeNull()
  })

  it('returns null when activeSongId is not in any set', () => {
    const gig = { sets: [{ songs: ['s2', 's3'] }] }
    expect(computeNextSong(gig, songs, 's1')).toBeNull()
  })

  it('returns null when the next song id is not in the songs array', () => {
    const gig = { sets: [{ songs: ['s1', 'unknown-id'] }] }
    expect(computeNextSong(gig, songs, 's1')).toBeNull()
  })
})
