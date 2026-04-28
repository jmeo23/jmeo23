const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('phr0st', {
  getSongs:     () => ipcRenderer.invoke('songs:getAll'),
  getSetlists:  () => ipcRenderer.invoke('setlists:getAll'),
  getSettings:  () => ipcRenderer.invoke('settings:get'),
  saveSettings: (s) => ipcRenderer.invoke('settings:save', s),

  onSongsUpdated: (cb) => {
    const handler = (_, d) => cb(d)
    ipcRenderer.on('songs:updated', handler)
    return () => ipcRenderer.removeListener('songs:updated', handler)
  },
  onStateUpdate: (cb) => {
    const handler = (_, d) => cb(d)
    ipcRenderer.on('state:update', handler)
    return () => ipcRenderer.removeListener('state:update', handler)
  },

  sendCommand: (cmd, payload) => ipcRenderer.send('command', { cmd, payload }),
})
