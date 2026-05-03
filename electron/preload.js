const { contextBridge, ipcRenderer, webFrame } = require('electron')

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

  listMidiPorts: () => ipcRenderer.invoke('midi:listPorts'),

  onMidiNote: (cb) => {
    const handler = (_, d) => cb(d)
    ipcRenderer.on('midi:note', handler)
    return () => ipcRenderer.removeListener('midi:note', handler)
  },
  onMidiPlayerStopped: (cb) => {
    const handler = () => cb()
    ipcRenderer.on('midi:playerStopped', handler)
    return () => ipcRenderer.removeListener('midi:playerStopped', handler)
  },

  sendCommand: (cmd, payload) => ipcRenderer.send('command', { cmd, payload }),

  setZoomLevel: (factor) => {
    webFrame.setZoomFactor(factor)
  },

  initializeZoom: async () => {
    const settings = await ipcRenderer.invoke('settings:get')
    if (settings?.zoom) {
      webFrame.setZoomFactor(settings.zoom)
    }
  },
})
