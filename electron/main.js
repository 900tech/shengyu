const { app, BrowserWindow, dialog, ipcMain, Notification } = require('electron');
const fs = require('fs');
const https = require('https');
const path = require('path');
const charts = require('../src/core/charts');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

const APPLE_CHART = 'https://rss.applemarketingtools.com/api/v2/cn/music/most-played/50/songs.json';
const DEEZER_CHART = 'https://api.deezer.com/chart/0/tracks?limit=50';

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

function cacheDir() {
  const dir = path.join(app.getPath('userData'), 'audio');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function safeId(id) {
  return /^[a-z0-9]{4,16}$/.test(String(id || '')) ? String(id) : '';
}

function getJson(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    let parsed;
    try { parsed = new URL(url); } catch { reject(new Error('bad-url')); return; }
    if (parsed.protocol !== 'https:') { reject(new Error('https-only')); return; }
    const req = https.get(url, {
      headers: { 'User-Agent': 'Shengyu/0.2', Accept: 'application/json' }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (redirects >= 2) { reject(new Error('redirect')); return; }
        resolve(getJson(new URL(res.headers.location, url).href, redirects + 1));
        return;
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        reject(new Error('http'));
        return;
      }
      const chunks = [];
      let size = 0;
      res.on('data', (chunk) => {
        size += chunk.length;
        if (size > 2000000) {
          req.destroy();
          reject(new Error('too-large'));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch { reject(new Error('json')); }
      });
    });
    req.setTimeout(12000, () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.on('error', () => reject(new Error('network')));
  });
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

ipcMain.handle('save-file', async (event, payload) => {
  const kind = payload?.kind === 'txt' ? 'txt' : 'wav';
  const win = BrowserWindow.fromWebContents(event.sender);
  const fileName = String(payload?.defaultName || `Shengyu.${kind}`).replace(/[\\/]/g, '').slice(0, 80);
  const result = await dialog.showSaveDialog(win, {
    title: kind === 'txt' ? '保存歌词' : '保存音频',
    defaultPath: path.join(app.getPath('music'), fileName),
    filters: kind === 'txt'
      ? [{ name: '文本', extensions: ['txt'] }]
      : [{ name: 'WAV 音频', extensions: ['wav'] }]
  });
  if (result.canceled || !result.filePath) return { ok: false, canceled: true };
  const bytes = Buffer.from(payload.bytes || []);
  if (!bytes.length) return { ok: false, message: '没有可写的内容' };
  fs.writeFileSync(result.filePath, bytes);
  const size = fs.statSync(result.filePath).size;
  if (size !== bytes.length) return { ok: false, message: '写入后的大小不一致' };
  return { ok: true, fileName: path.basename(result.filePath), byteLength: size };
});

ipcMain.handle('cache-audio', (_event, payload) => {
  const id = safeId(payload?.id);
  if (!id) return { ok: false };
  const bytes = Buffer.from(payload.bytes || []);
  if (bytes.length < 44) return { ok: false };
  fs.writeFileSync(path.join(cacheDir(), `${id}.wav`), bytes);
  return { ok: true };
});

ipcMain.handle('load-cached', (_event, id) => {
  const safe = safeId(id);
  if (!safe) return { ok: false };
  const file = path.join(cacheDir(), `${safe}.wav`);
  if (!fs.existsSync(file)) return { ok: false };
  return { ok: true, bytes: fs.readFileSync(file) };
});

ipcMain.handle('fetch-charts', async (_event, options) => {
  const sources = [];
  const entries = [];
  const failures = [];
  async function take(name, url, parse) {
    try {
      const json = await getJson(url);
      const list = parse(json);
      sources.push({ name, count: list.length });
      entries.push(...list);
      if (!list.length) failures.push(`${name}返回了空列表`);
    } catch {
      failures.push(`${name}没有响应`);
      sources.push({ name, count: 0 });
    }
  }
  await take('Apple Music', APPLE_CHART, charts.parseApple);
  await take('Deezer', DEEZER_CHART, charts.parseDeezer);
  const extra = String(options?.extraUrl || '').trim();
  if (extra) {
    if (!/^https:\/\/\S+$/.test(extra)) failures.push('自定义地址只接受 https');
    else await take('自定义榜单', extra, charts.parseCustom);
  }
  if (!entries.length) {
    return {
      ok: false,
      entries: [],
      sources,
      message: `尚未抓到榜单。${failures.join('，') || '公开接口没有返回曲目'}。没有用样例填空。`
    };
  }
  return {
    ok: true,
    entries: entries.slice(0, 120),
    sources,
    fetchedAt: new Date().toISOString(),
    message: failures.length ? `部分来源失败：${failures.join('，')}` : ''
  };
});

function pingUrl(url) {
  return new Promise((resolve, reject) => {
    let parsed;
    try { parsed = new URL(url); } catch { reject(new Error('bad-url')); return; }
    if (parsed.protocol !== 'https:') { reject(new Error('https-only')); return; }
    const req = https.get(url, { headers: { 'User-Agent': 'Shengyu/0.2' } }, (res) => {
      res.resume();
      if (res.statusCode >= 200 && res.statusCode < 300) resolve(true);
      else reject(new Error('http'));
    });
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.on('error', () => reject(new Error('network')));
  });
}

ipcMain.handle('ping-status', async (_event, url) => {
  const target = String(url || '').trim();
  if (!/^https:\/\/\S+$/.test(target)) return { ok: false, message: '只接受 https 状态地址' };
  try {
    await pingUrl(target);
    return { ok: true, message: '状态地址有响应' };
  } catch {
    return { ok: false, message: '状态地址没有响应。未连通时不会显示已连接。' };
  }
});
