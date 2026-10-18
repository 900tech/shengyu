const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const chrome = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find((item) => fs.existsSync(item));
if (!chrome) {
  console.error('未找到 Chrome。请安装后设置 CHROME_PATH。');
  process.exit(1);
}

const port = 43127;
const shots = path.join('/tmp', 'shengyu-shots');
fs.mkdirSync(shots, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  const server = spawn(process.execPath, ['scripts/preview-server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('预览服务没有启动')), 8000);
    server.stdout.on('data', (chunk) => {
      if (String(chunk).includes(String(port))) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.on('exit', (code) => reject(new Error(`预览服务退出 ${code}`)));
  });

  const errors = [];
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  try {
    const page = await browser.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(shots, 'dashboard.png') });

    const nav = await page.$$eval('.nav-btn span', (nodes) => nodes.map((node) => node.textContent.trim()));
    assert(nav.join(',') === '控制台,音频处理,模板库,作品库,远程指令,设置', `导航不符：${nav.join(',')}`);
    const title = await page.title();
    assert(title.includes('声屿'), title);

    await page.click('[data-audio-tab="remix"]');
    await page.waitForSelector('[data-template-select="t4"]');
    await page.click('[data-template-select="t4"]');
    await page.click('[data-start-remix]');
    await page.waitForSelector('.modal.open');
    const modalText = await page.$eval('#modalContent', (node) => node.innerText);
    assert(modalText.includes('不可商用') || modalText.includes('拦住'), modalText);
    await page.screenshot({ path: path.join(shots, 'copyright-modal.png') });
    await page.click('[data-modal-close]');

    await page.click('[data-template-select="t4"]');
    const before = await page.evaluate(() => window.Shengyu.snapshot().works.find((work) => work.name === '月下归舟').versions.length);
    await page.click('[data-start-remix]');
    await page.waitForFunction((count) => {
      const work = window.Shengyu.snapshot().works.find((item) => item.name === '月下归舟');
      return work && work.versions.length > count;
    }, { timeout: 8000 }, before);

    await page.click('[data-audio-tab="clean"]');
    await page.waitForSelector('[data-clean-item="apic"]');
    const fingerprintBefore = await page.evaluate(() => window.Shengyu.snapshot().clean.fingerprint);
    await page.click('[data-clean-item="apic"]');
    await page.waitForFunction((previous) => window.Shengyu.snapshot().clean.fingerprint !== previous, { timeout: 3000 }, fingerprintBefore);
    const fingerprint = await page.evaluate(() => window.Shengyu.snapshot().clean.fingerprint);
    await page.click('[data-audio-tab="remix"]');
    const remixText = await page.evaluate(() => document.body.innerText);
    assert(remixText.includes(fingerprint), 'Remix 页没有同步清洗指纹');

    await page.click('[data-nav="works"]');
    await page.waitForSelector('[data-preset="douyin"]');
    await page.click('[data-preset="douyin"]');
    const presetText = await page.evaluate(() => document.body.innerText);
    assert(presetText.includes('抖音60秒卡点版') && presetText.includes('60 秒'), presetText.slice(0, 200));
    await page.screenshot({ path: path.join(shots, 'works.png') });

    await page.click('[data-nav="remote"]');
    const payload = await page.evaluate(() => window.Shengyu.blockProbe());
    assert(payload.state === 'blocked', JSON.stringify(payload));
    assert(!JSON.stringify(payload).includes('secret') && !JSON.stringify(payload).includes('不应出现'), JSON.stringify(payload));
    await page.waitForFunction(() => document.body.innerText.includes('已拦截'), { timeout: 3000 });
    await page.screenshot({ path: path.join(shots, 'remote.png') });

    await page.click('[data-nav="templates"]');
    await page.waitForSelector('[data-library-tab="creation"]');
    await page.screenshot({ path: path.join(shots, 'templates.png') });
    await page.click('[data-nav="dashboard"]');
    await page.click('[data-open-trend]');
    await page.waitForFunction(() => document.body.innerText.includes('尚未抓到榜单'), { timeout: 4000 });
    const trendText = await page.evaluate(() => document.body.innerText);
    assert(!trendText.includes('本地样例'), '榜单不应再显示本地样例');
    await page.screenshot({ path: path.join(shots, 'charts-empty.png') });

    await page.click('[data-nav="audio"]');
    await page.click('[data-audio-tab="create"]');
    await page.waitForSelector('[data-rewrite-lyric]');
    await page.click('[data-rewrite-lyric]');
    await page.waitForFunction(() => document.body.innerText.includes('本地词典'), { timeout: 3000 });

    await page.click('[data-nav="settings"]');
    await page.click('[data-theme-set="dark"]');
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    assert(theme === 'dark', theme);
    await page.screenshot({ path: path.join(shots, 'settings-dark.png') });

    await page.setViewport({ width: 390, height: 844 });
    await page.click('[data-nav="dashboard"]');
    await page.screenshot({ path: path.join(shots, 'dashboard-mobile.png') });

    assert(errors.length === 0, `控制台错误：\n${errors.join('\n')}`);
    console.log('浏览器走查通过');
    console.log(shots);
  } finally {
    await browser.close();
    server.kill();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
