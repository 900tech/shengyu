const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');

// 不监听任何入站端口。远程协作若以后接入，只允许主进程向外发送纯文本状态。
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: '声屿',
    backgroundColor: '#F7F8FA',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) event.preventDefault();
  });
  win.webContents.on('will-attach-webview', (event) => event.preventDefault());
  win.loadFile(path.join(__dirname, '..', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('second-instance', () => {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('notify', (_event, payload) => {
  const title = String(payload?.title || '声屿').slice(0, 80);
  const body = String(payload?.body || '').slice(0, 180);
  if (Notification.isSupported()) new Notification({ title, body }).show();
});

ipcMain.handle('version', () => app.getVersion());
