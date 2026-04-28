export function computeNextSong(loadedGig, songs, activeSongId) {
  if (!loadedGig) return null
  for (const set of loadedGig.sets) {
    const idx = set.songs.indexOf(activeSongId)
    if (idx === -1) continue
    const nextId = set.songs[idx + 1]
    if (!nextId) return null
    return songs.find(s => s.id === nextId) ?? null
  }
  return null
}
