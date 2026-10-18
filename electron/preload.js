const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('shengyuDesktop', {
  notify(title, body) {
    ipcRenderer.send('notify', {
      title: String(title || '').slice(0, 80),
      body: String(body || '').slice(0, 180)
    });
  },
  version: () => ipcRenderer.invoke('version')
});
