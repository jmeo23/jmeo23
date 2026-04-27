const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('phr0st', {
  getSongs:     () => ipcRenderer.invoke('songs:getAll'),
  getSetlists:  () => ipcRenderer.invoke('setlists:getAll'),
  getSettings:  () => ipcRenderer.invoke('settings:get'),
  saveSettings: (s) => ipcRenderer.invoke('settings:save', s),

  onSongsUpdated: (cb) => ipcRenderer.on('songs:updated', (_, d) => cb(d)),
  onStateUpdate:  (cb) => ipcRenderer.on('state:update',  (_, d) => cb(d)),

  sendCommand: (cmd, payload) => ipcRenderer.send('command', { cmd, payload }),
})
