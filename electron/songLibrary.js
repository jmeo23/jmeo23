import { readFile, mkdir, readdir } from 'fs/promises'
import fsSync from 'fs'
import path   from 'path'
import os     from 'os'

const SONGS_DIR    = path.join(os.homedir(), 'phr0stOS', 'songs')
const SETLISTS_DIR = path.join(os.homedir(), 'phr0stOS', 'setlists')
const VALID_COUNT_IN_TYPES = ['beat-pulse', 'fade']

function validateSong(song) {
  if (!song.id)                      throw new Error('song missing: id')
  if (!song.title)                   throw new Error('song missing: title')
  if (!song.bpm || song.bpm <= 0)    throw new Error('song bpm must be positive')
  if (!Array.isArray(song.sections)) throw new Error('song missing: sections array')
  if (!song.dmxScenes || typeof song.dmxScenes !== 'object')
                                     throw new Error('song missing: dmxScenes')
  for (const s of song.sections) {
    if (!song.dmxScenes[s.dmxScene])
      throw new Error(`section "${s.id}" references missing dmxScene key: ${s.dmxScene}`)
  }
  if (song.countInScene != null) {
    if (!VALID_COUNT_IN_TYPES.includes(song.countInScene.type))
      throw new Error(`countInScene.type must be one of: ${VALID_COUNT_IN_TYPES.join(', ')}`)
  }
}

async function loadSong(filePath) {
  const raw  = await readFile(filePath, 'utf8')
  const song = JSON.parse(raw)
  validateSong(song)
  return song
}

async function loadSetlist(filePath) {
  const raw = await readFile(filePath, 'utf8')
  const s   = JSON.parse(raw)
  if (!s.id || !s.name || !Array.isArray(s.songs))
    throw new Error('setlist missing required fields: id, name, songs')
  return s
}

async function ensureDirs() {
  await mkdir(SONGS_DIR,    { recursive: true })
  await mkdir(SETLISTS_DIR, { recursive: true })
}

async function loadAllSongs() {
  await ensureDirs()
  const files = (await readdir(SONGS_DIR)).filter(f => f.endsWith('.json'))
  const songs = []
  for (const f of files) {
    try   { songs.push(await loadSong(path.join(SONGS_DIR, f))) }
    catch (e) { console.warn(`Skipping invalid song ${f}: ${e.message}`) }
  }
  return songs
}

async function loadAllSetlists() {
  await ensureDirs()
  const files = (await readdir(SETLISTS_DIR)).filter(f => f.endsWith('.json'))
  const setlists = []
  for (const f of files) {
    try   { setlists.push(await loadSetlist(path.join(SETLISTS_DIR, f))) }
    catch (e) { console.warn(`Skipping invalid setlist ${f}: ${e.message}`) }
  }
  return setlists
}

function watchSongsFolder(onChange) {
  fsSync.watch(SONGS_DIR, { persistent: false }, () => onChange())
}

export {
  validateSong, loadSong, loadSetlist,
  loadAllSongs, loadAllSetlists,
  watchSongsFolder,
  SONGS_DIR, SETLISTS_DIR,
}
