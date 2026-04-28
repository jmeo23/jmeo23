const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs   = require('fs/promises')
const os   = require('os')
const { createExpressServer } = require('./expressServer')
let createMidiPlayer
try { createMidiPlayer = require('./midiPlayer').createMidiPlayer }
catch (e) { console.warn('midiPlayer unavailable:', e.message) }

const MIDI_TEST_DIR  = path.join(__dirname, '..', 'test', 'midi')
const MIDI_TEST_FILE = path.join(MIDI_TEST_DIR, 'DKC1_-_Aquatic_Ambience.mid')

// Native modules loaded lazily — they require compiled .node binaries.
// If not compiled yet, hardware features are disabled but the app still starts.
let SerialPort, createDmxEngine, createMidiEngine, midiLib
try {
  SerialPort      = require('serialport').SerialPort
  createDmxEngine = require('./dmxEngine').createDmxEngine
} catch { console.warn('serialport/dmxEngine not available — run npx electron-rebuild') }
try {
  midiLib          = require('midi')
  createMidiEngine = require('./midiEngine').createMidiEngine
} catch { console.warn('midi not available — run npx electron-rebuild') }

const SETTINGS_PATH = path.join(os.homedir(), 'phr0stOS', 'settings.json')

let mainWindow
let dmxEngine     = null
let midiEngine    = null
let midiPlayer    = null
let currentSong   = null
let loopPadNote   = 36
let startSongNote = null

function dispatchMidiNote(note) {
  if (note === loopPadNote)
    mainWindow?.webContents.send('state:update', { event: 'midi:loopPad' })
  if (startSongNote !== null && note === startSongNote)
    mainWindow?.webContents.send('state:update', { event: 'midi:startSong' })
}

async function loadSettings() {
  try { return JSON.parse(await fs.readFile(SETTINGS_PATH, 'utf8')) }
  catch { return { serialPort: null, midiDevice: null, loopPadNote: 36 } }
}

async function saveSettings(settings) {
  await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true })
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2))
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  const isDev = !app.isPackaged
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

function handleCommand(_, { cmd, payload }) {
  switch (cmd) {
    case 'dmx:connect': {
      try {
        const port = new SerialPort({ path: payload.path, baudRate: 115200 })
        dmxEngine = createDmxEngine(port)
      } catch (e) { console.error('DMX connect failed:', e.message) }
      break
    }
    case 'midi:connect': {
      try {
        loopPadNote   = payload.loopPadNote   ?? 36
        startSongNote = payload.startSongNote ?? null
        midiEngine = createMidiEngine({ onPad: dispatchMidiNote })
        midiEngine.connect(payload.portIndex ?? 0)
      } catch (e) { console.error('MIDI connect failed:', e.message) }
      break
    }
    case 'song:load': {
      currentSong = payload.song
      break
    }
    case 'countIn:start': {
      if (!dmxEngine || !currentSong?.countInScene) return
      const beatMs   = (60 / currentSong.bpm) * 1000
      const totalMs  = beatMs * 12
      dmxEngine.startCountInAnimation(currentSong.countInScene, totalMs)
      break
    }
    case 'countIn:beat': {
      if (!dmxEngine || !currentSong?.countInScene) return
      const beatMs = (60 / currentSong.bpm) * 1000
      dmxEngine.onCountInBeat(currentSong.countInScene, beatMs)
      break
    }
    case 'countIn:stop': {
      dmxEngine?.stopCountInAnimation()
      break
    }
    case 'midi:playFile': {
      const filePath = payload.file
        ? path.join(MIDI_TEST_DIR, payload.file)
        : MIDI_TEST_FILE
      midiPlayer = createMidiPlayer({
        filePath,
        onNote: ({ note, velocity, channel }) => {
          mainWindow?.webContents.send('midi:note', { note, velocity, channel })
          dispatchMidiNote(note)
        },
        onDone: () => mainWindow?.webContents.send('midi:playerStopped'),
      })
      midiPlayer.play()
      break
    }
    case 'midi:stopFile': {
      midiPlayer?.stop()
      midiPlayer = null
      break
    }
    case 'dmx:scene': {
      if (!dmxEngine || !currentSong) return
      const scene = currentSong.dmxScenes[payload.sceneName]
      if (scene) dmxEngine.fireScene(scene)
      break
    }
    case 'dmx:rawScene': {
      if (!dmxEngine) return
      dmxEngine.fireScene(payload.scene)
      break
    }
  }
}

function setupIpc(loadAllSongs, loadAllSetlists, watchSongsFolder) {
  ipcMain.handle('songs:getAll',    () => loadAllSongs())
  ipcMain.handle('setlists:getAll', () => loadAllSetlists())
  ipcMain.handle('settings:get',    () => loadSettings())
  ipcMain.handle('settings:save',   (_, s) => saveSettings(s))
  ipcMain.handle('midi:listPorts', () => {
    if (!midiLib) return []
    try {
      const input = new midiLib.Input()
      const ports = []
      for (let i = 0; i < input.getPortCount(); i++)
        ports.push({ index: i, name: input.getPortName(i) })
      return ports
    } catch { return [] }
  })
  ipcMain.on('command', handleCommand)

  watchSongsFolder(async () => {
    const songs = await loadAllSongs()
    mainWindow?.webContents.send('songs:updated', songs)
  })
}

app.whenReady().then(async () => {
  try {
    const { loadAllSongs, loadAllSetlists, watchSongsFolder } = await import('./songLibrary.mjs')
    createWindow()
    setupIpc(loadAllSongs, loadAllSetlists, watchSongsFolder)
    const wsServer = createExpressServer({
      distPath: path.join(__dirname, '../dist'),
      onMessage: (msg) => { if (msg.cmd) handleCommand(null, msg) },
    })
    wsServer.listen(3000).then((port) => console.log(`Mobile: http://localhost:${port}`))
  } catch (e) {
    console.error('Failed to initialize song library:', e)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
