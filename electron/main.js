const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs   = require('fs/promises')
const os   = require('os')
const { SerialPort } = require('serialport')
const { createDmxEngine } = require('./dmxEngine')
const { createMidiEngine } = require('./midiEngine')

const SETTINGS_PATH = path.join(os.homedir(), 'phr0stOS', 'settings.json')

let mainWindow
let dmxEngine   = null
let midiEngine  = null
let currentSong = null
let loopPadNote = 36

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
        loopPadNote = payload.loopPadNote ?? 36
        midiEngine = createMidiEngine({
          onPad: (note) => {
            if (note === loopPadNote)
              mainWindow?.webContents.send('state:update', { event: 'midi:loopPad' })
          },
        })
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
    case 'dmx:scene': {
      if (!dmxEngine || !currentSong) return
      const scene = currentSong.dmxScenes[payload.sceneName]
      if (scene) dmxEngine.fireScene(scene)
      break
    }
  }
}

function setupIpc(loadAllSongs, loadAllSetlists, watchSongsFolder) {
  ipcMain.handle('songs:getAll',    () => loadAllSongs())
  ipcMain.handle('setlists:getAll', () => loadAllSetlists())
  ipcMain.handle('settings:get',    () => loadSettings())
  ipcMain.handle('settings:save',   (_, s) => saveSettings(s))
  ipcMain.handle('midi:listPorts',  () => midiEngine?.listPorts() ?? [])
  ipcMain.on('command', handleCommand)

  watchSongsFolder(async () => {
    const songs = await loadAllSongs()
    mainWindow?.webContents.send('songs:updated', songs)
  })
}

app.whenReady().then(async () => {
  try {
    const { loadAllSongs, loadAllSetlists, watchSongsFolder } = await import('./songLibrary.js')
    createWindow()
    setupIpc(loadAllSongs, loadAllSetlists, watchSongsFolder)
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
