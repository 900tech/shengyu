const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('shengyuDesktop', {
  notify(title, body) {
    ipcRenderer.send('notify', {
      title: String(title || '').slice(0, 80),
      body: String(body || '').slice(0, 180)
    });
  },
  version: () => ipcRenderer.invoke('version'),
  saveFile: (payload) => ipcRenderer.invoke('save-file', payload),
  cacheAudio: (id, bytes) => ipcRenderer.invoke('cache-audio', { id, bytes }),
  loadCached: (id) => ipcRenderer.invoke('load-cached', id),
  fetchCharts: (options) => ipcRenderer.invoke('fetch-charts', options || {}),
  pingStatus: (url) => ipcRenderer.invoke('ping-status', url)
});
