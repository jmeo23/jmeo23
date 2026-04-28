const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
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

function setupIpc(loadAllSongs, loadAllSetlists, watchSongsFolder) {
  ipcMain.handle('songs:getAll',    () => loadAllSongs())
  ipcMain.handle('setlists:getAll', () => loadAllSetlists())
  ipcMain.handle('settings:get',    () => ({}))
  ipcMain.handle('settings:save',   () => {})
  ipcMain.on('command',             () => {})

  watchSongsFolder(async () => {
    const songs = await loadAllSongs()
    mainWindow?.webContents.send('songs:updated', songs)
  })
}

app.whenReady().then(async () => {
  const { loadAllSongs, loadAllSetlists, watchSongsFolder } = await import('./songLibrary.js')
  createWindow()
  setupIpc(loadAllSongs, loadAllSetlists, watchSongsFolder)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
