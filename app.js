const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const icon = (name) => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const uid = () => Math.random().toString(36).slice(2, 9);
const nowTime = () => new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
const todayLabel = () => new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date());
const fmtSize = (bytes) => bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
const fmtDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '时长待确认';
  const total = Math.round(seconds);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const STATE_VERSION = 2;
const STEP_NAMES = ['音频分析', '人声分离', '节拍对齐', '自动混缩', '元数据清洗'];
const LYRICS = [
  ['夜航', '夜色把江面收好，鼓点只在船舷轻敲。'],
  ['长安', '长安一夜灯未歇，弦声越过旧城阙。'],
  ['归人', '归人未到码头，拍子先靠了岸。'],
  ['霜桥', '霜落小桥，马蹄与低音一起慢下来。'],
  ['远山', '远山不回答，副歌先亮了。'],
  ['渔火', '渔火三点，刚好卡进重拍。'],
  ['旧词', '旧词换了拍，意思仍停在原处。'],
  ['春水', '春水拍岸，人声留在第二段。']
];

function seedDemos() {
  return [
    { id: 'd1', label: 'Demo 01 · 山河入梦', title: '山河入梦', lyric: '山色落入杯中月，鼓声惊起故人舟。', bpm: 132.0, key: 'D 小调', style: '国风DJ', score: 92 },
    { id: 'd2', label: 'Demo 02 · 长风令', title: '长风令', lyric: '长风越关山，灯火照人还。今夜一拍落，万里共清欢。', bpm: 134.0, key: 'A 小调', style: '国风DJ', score: 88 },
    { id: 'd3', label: 'Demo 03 · 月照千城', title: '月照千城', lyric: '月照千城雪，弦动一江春。旧句换新声，恰逢有缘人。', bpm: 130.0, key: 'E 小调', style: '国风电子', score: 85 },
    { id: 'd4', label: 'Demo 04 · 烟雨行', title: '烟雨行', lyric: '烟雨不问归程，拍落青石旧痕。', bpm: 128.0, key: 'C 小调', style: '慢摇Remix', score: 81 }
  ];
}

function freshState() {
  return {
    stateVersion: STATE_VERSION,
    page: 'dashboard',
    dashView: 'home',
    audioTab: 'upload',
    theme: 'light',
    libraryTab: 'accompaniment',
    settingsTab: 'general',
    remoteMode: 'manual',
    agentConnected: true,
    advancedOpen: false,
    filtersOpen: false,
    historyOpen: false,
    uploaded: [],
    selectedTemplates: ['t1'],
    remixOptions: { align: true, vocal: true, loudness: true },
    structureId: 'chorus-first',
    styleFilter: '全部',
    matchBpm: false,
    works: JSON.parse(JSON.stringify(SY.SEED_WORKS)),
    templates: JSON.parse(JSON.stringify(SY.SEED_TEMPLATES)),
    demos: seedDemos(),
    demoChoices: {},
    poetry: { source: '唐诗意象精选', density: 68, style: '国风DJ', count: 4 },
    overlapThreshold: 40,
    clean: SY.createCleanConfig(),
    metadataTemplates: [
      { id: 'mt1', name: '青屿 · 默认发行', artist: '青屿', album: '独立作品集', copyright: '© 2026 青屿 保留所有权利', scene: '汽水音乐' },
      { id: 'mt2', name: '仅保留作品名', artist: '', album: '', copyright: '', scene: '通用' }
    ],
    metadataTemplateId: 'mt1',
    exportPresets: JSON.parse(JSON.stringify(SY.EXPORT_PRESETS)),
    exportPresetId: 'qishui',
    defaultFormat: 'WAV',
    defaultLufs: -14,
    pending: [
      { id: 'c1', type: 'Remix', target: '《月下归舟》', params: { note: '132.0 BPM · 国风DJ版 + 卡点版' }, time: '10:24', risk: 'high' },
      { id: 'c2', type: '导出', target: '《长街灯火》', params: { note: '汽水音乐完整版 · 清洗元数据' }, time: '09:58', risk: 'high' }
    ],
    history: [
      { type: '健康检查', result: '已完成', time: '今天 08:00' },
      { type: '查状态', result: '已完成', time: '昨天 22:30' }
    ],
    audit: [],
    whitelist: SY.defaultWhitelist(),
    commandTemplates: [],
    selectedWorkIds: [],
    openWorks: {},
    workQuery: '',
    workStatus: '全部',
    workStyle: '全部',
    workLicense: '全部',
    libraryQuery: '',
    libraryStyles: [],
    libraryLicenses: [],
    libraryKey: '',
    bpmMin: 80,
    bpmMax: 180,
    activeCreationId: '',
    chartRange: 'week',
    lastPayload: null,
    remixProgress: null,
    preview: null,
    pickerMode: 'audio',
    materialPlatform: {}
  };
}

function loadState() {
  const base = freshState();
  try {
    const saved = JSON.parse(localStorage.getItem('shengyu-state') || 'null');
    if (!saved || saved.stateVersion !== STATE_VERSION) return base;
    const next = Object.assign(base, saved);
    next.tasks = [];
    next.clean = SY.normalizeCleanConfig(saved.clean);
    next.remixOptions = Object.assign({ align: true, vocal: true, loudness: true }, saved.remixOptions || {});
    next.uploaded = (saved.uploaded || []).map((file) => ({ ...file, url: '' }));
    next.whitelist = Object.assign(SY.defaultWhitelist(), saved.whitelist || {});
    next.works = saved.works?.length ? saved.works : base.works;
    next.templates = saved.templates?.length ? saved.templates : base.templates;
    next.demos = saved.demos?.length ? saved.demos : base.demos;
    next.exportPresets = saved.exportPresets?.length ? saved.exportPresets : base.exportPresets;
    next.metadataTemplates = saved.metadataTemplates?.length ? saved.metadataTemplates : base.metadataTemplates;
    return next;
  } catch {
    return base;
  }
}

const state = loadState();
state.tasks = [];
state.taskControl = 'run';
state.pendingAction = null;
let past = [];
let future = [];
let player = null;
let previewTimer = null;
let stepTimer = null;

function persistable() {
  const { tasks, taskControl, pendingAction, ...rest } = state;
  return {
    ...rest,
    uploaded: state.uploaded.map(({ url, ...file }) => file)
  };
}
function persist() {
  localStorage.setItem('shengyu-state', JSON.stringify(persistable()));
}
function remember() {
  past.push(JSON.stringify(persistable()));
  if (past.length > 25) past.shift();
  future = [];
}
function applySnapshot(json) {
  const data = JSON.parse(json);
  Object.keys(state).forEach((key) => {
    if (!(key in data) && !['tasks', 'taskControl', 'pendingAction'].includes(key)) delete state[key];
  });
  Object.assign(state, data);
  state.tasks = state.tasks || [];
  state.uploaded = (state.uploaded || []).map((file) => ({ ...file, url: '' }));
  setTheme(state.theme);
  setPage(state.page, { silent: true });
}
function undo() {
  if (!past.length) return toast('没有可撤销的操作', '界面会保持现状');
  future.push(JSON.stringify(persistable()));
  applySnapshot(past.pop());
  toast('已撤销上一步', '改动只发生在本机');
}
function redo() {
  if (!future.length) return toast('没有可恢复的操作', '界面会保持现状');
  past.push(JSON.stringify(persistable()));
  applySnapshot(future.pop());
  toast('已恢复上一步', '改动只发生在本机');
}

function toast(title, message = '') {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<b>${esc(title)}</b><span>${esc(message)}</span>`;
  $('#toastStack').append(el);
  setTimeout(() => el.remove(), 3400);
}
function notify(title, message = '') {
  toast(title, message);
  window.shengyuDesktop?.notify?.(title, message);
}
function fail(code) {
  const error = SY.sanitizeError(code);
  toast(error.title, error.detail);
  return error;
}
function audit(source, action, detail, result, started) {
  const entry = SY.createAuditEntry({
    source,
    action,
    detail,
    result,
    durationMs: started ? Date.now() - started : 0
  });
  state.audit.unshift(entry);
  if (source === 'remote') state.history.unshift({ type: action, result, time: `今天 ${nowTime()}` });
  persist();
  return entry;
}

function metaTemplate() {
  return state.metadataTemplates.find((item) => item.id === state.metadataTemplateId) || state.metadataTemplates[0];
}
function currentPreset() {
  return state.exportPresets.find((item) => item.id === state.exportPresetId) || state.exportPresets[0];
}
function currentSource() {
  return state.uploaded[0] || { name: '月下归舟.wav', bpm: 132.0, key: 'D 小调', duration: '03:24', style: '国风DJ', engine: 'seed', status: '示例' };
}
function sourceName(file = currentSource()) {
  return String(file.name || '未命名作品').replace(/\.[^.]+$/, '').slice(0, 40);
}
function selectedTemplateObjects() {
  return state.selectedTemplates.map((id) => state.templates.find((item) => item.id === id)).filter(Boolean);
}
function cleanLine() {
  const summary = SY.cleanSummary(state.clean);
  const apply = state.clean.applyOnExport ? '导出时会套用' : '导出时先不套用';
  return `清洗规则 ${summary.fingerprint} · ${summary.enabled}/${summary.total} 项 · ${apply}。清洗页、Remix 导出、批量导出读的是同一份。`;
}
function makePlan(workName, apply = state.clean.applyOnExport) {
  return SY.buildExportPlan({
    preset: currentPreset(),
    cleanConfig: state.clean,
    metadata: metaTemplate(),
    workName,
    apply
  });
}
function overlapAgainst(lyric, skipTitle) {
  const texts = [];
  state.works.forEach((work) => {
    if (work.lyric) texts.push(work.lyric);
    work.versions.forEach((version) => { if (version.lyric) texts.push(version.lyric); });
  });
  state.demos.forEach((demo) => {
    if (demo.title !== skipTitle && demo.lyric) texts.push(demo.lyric);
  });
  if (!texts.length) return 0;
  return Math.max(...texts.map((text) => SY.overlapRatio(lyric, text)));
}
function findWork(id) { return state.works.find((item) => item.id === id); }
function findVersion(work, versionId) { return work?.versions.find((item) => item.id === versionId); }

const navItems = [
  ['dashboard', 'grid', '控制台'],
  ['audio', 'wave', '音频处理'],
  ['templates', 'layers', '模板库'],
  ['works', 'music', '作品库'],
  ['remote', 'command', '远程指令'],
  ['settings', 'settings', '设置']
];
const pageMeta = {
  dashboard: ['今日工作台', '控制台'],
  audio: ['本地处理链路', '音频处理'],
  templates: ['统一资产管理', '模板库'],
  works: ['版本自动聚合', '作品库'],
  remote: ['纯文本 · 不传文件', '远程指令'],
  settings: ['仅保存在本机', '设置']
};

function renderChrome() {
  const pending = state.pending.length;
  $('#pendingBadge').textContent = pending;
  $('#pendingBadge').style.display = pending ? '' : 'none';
  $('#connLabel').className = state.agentConnected ? 'connection' : 'connection off';
  $('#connLabel').innerHTML = `<i></i>${state.agentConnected ? 'Agent 已连接' : '未连接'}`;
  $('#modeChip').textContent = state.remoteMode === 'risk' ? '仅高风险确认' : '全手动确认';
  $('#advancedToggle').textContent = state.advancedOpen ? '收起高级选项' : '高级选项';
  $('#mainNav').innerHTML = navItems.map(([id, glyph, label]) => `<button class="nav-btn ${state.page === id ? 'active' : ''}" data-nav="${id}">${icon(glyph)}<span>${label}</span>${id === 'remote' && pending ? `<b class="nav-count">${pending}</b>` : ''}</button>`).join('');
}
function advancedPanel() {
  if (!state.advancedOpen) return '';
  const summary = SY.cleanSummary(state.clean);
  return `<section class="card advanced-panel"><div><h3>高级选项</h3><p>默认收起。BPM 统一保留 1 位小数，调性与风格只从全局字典读取，跨模块匹配误差 ±${SY.DICT.bpmTolerance}。</p><div class="range-row"><div><span>歌词重合度提醒</span><output id="overlapOut">${state.overlapThreshold}%</output></div><input id="overlapRange" type="range" min="20" max="80" value="${state.overlapThreshold}"></div></div><div><h3>当前清洗指纹</h3><p>${esc(cleanLine())}</p><div class="dict-pills" style="margin-top:10px">${SY.DICT.styles.map((item) => `<span class="tag gold">${item}</span>`).join('')}<span class="tag">${summary.fingerprint}</span></div></div></section>`;
}
function mount(html) {
  $('#pageRoot').innerHTML = advancedPanel() + html;
}
function setPage(page, opts = {}) {
  if (!pageMeta[page]) return;
  state.page = page;
  renderChrome();
  $('#pageEyebrow').textContent = pageMeta[page][0];
  $('#pageTitle').textContent = pageMeta[page][1];
  const renderers = { dashboard: renderDashboard, audio: renderAudio, templates: renderTemplates, works: renderWorks, remote: renderRemote, settings: renderSettings };
  renderers[page]();
  if (!opts.silent) window.scrollTo({ top: 0, behavior: 'smooth' });
  persist();
}
function rerender() { setPage(state.page, { silent: true }); }

function waveBars(count = 36) {
  return Array.from({ length: count }, (_, index) => `<i style="height:${8 + ((index * 17) % 26)}px"></i>`).join('');
}
function complianceButton(license) {
  const status = SY.compliance(license);
  const tone = status.level === 'risk' ? 'risk' : status.level === 'warn' ? 'warn' : 'ok';
  return `<button class="compliance status ${tone}" data-compliance="${esc(license || '未标注')}">${esc(status.label)}</button>`;
}
function paramsText(params) {
  if (!params) return '';
  if (typeof params === 'string') return esc(params);
  return esc(Object.values(params).join(' · '));
}

function renderDashboard() {
  if (state.dashView === 'trend') return renderTrend();
  const recent = state.audit.slice(0, 4);
  const rows = recent.length ? recent.map((item) => taskRow(item.action, `${item.result} · ${item.detail || '已记入本机日志'}`, item.result === '已拦截' ? 'warn' : '完成', item.at.slice(11, 16))).join('') : state.works.slice(0, 3).map((work) => taskRow(work.versions[0]?.name || work.name, work.versions[0]?.type || work.style, '完成', work.updated)).join('');
  const templateCount = state.templates.length;
  mount(`<section class="hero-strip"><div class="hero-left"><p class="eyebrow">LOCAL WORKFLOW / ${esc(todayLabel())}</p><h2>让灵感在本地，完整抵达听众。</h2><p>榜单样例可拆解 · 核心资产不离开这台设备 · 外部调用成本 ¥0.00</p><div class="hero-actions"><button class="btn primary" data-audio-tab="create">${icon('spark')}开始创作</button><button class="btn" data-open-trend>查看趋势</button></div></div><div class="hero-meter"><div class="meter-ring"><span>82<small>趋势指数</small></span></div><div class="meter-copy"><b>国风电子热度上升</b><span>热门区间 130.0–136.0 BPM</span><span>副歌前置占比 68%</span><span>汽水音乐权重 70%</span></div></div></section>
    <div class="section-head"><div><h3>快速开始</h3><p>两次点击内抵达核心操作</p></div></div>
    <section class="quick-grid">
      ${quickCard('01', 'upload', '上传音频并处理', '在本机预检格式、时长和占位 BPM', '上传音频', 'upload')}
      ${quickCard('02', 'spark', '一键生成 Remix', '选择模板后批量生成版本方案', '选择模板', 'remix')}
      ${quickCard('03', 'shield', '元数据清洗重写', '三层清洗与个人模板共用一套规则', '开始清洗', 'clean')}
      ${quickCard('04', 'command', '查看远程指令', '只审核纯文本指令，文件不会上传', `查看 ${state.pending.length} 条待确认`, 'remote')}
    </section>
    <div class="section-head"><div><h3>最近处理</h3><p>本地操作和远程指令都写在同一本日志里</p></div><button data-nav="works">查看全部</button></div>
    <section class="dash-columns"><div class="card list-card">${rows}</div><div class="card trend-card"><div class="trend-top"><h3>七日风格热度</h3><b>+18.4%</b></div><div class="bars">${[38, 51, 44, 63, 58, 74, 89].map((height, index) => `<i class="${index === 6 ? 'hot' : ''}" style="height:${height}%"></i>`).join('')}</div><div class="bar-labels"><span>上上周</span><span>本周</span></div><div class="trend-foot"><span>增长最快</span><b>国风电子 · 132.0 BPM</b></div></div></section>
    <section class="stats-row"><div class="stat"><b>${templateCount}</b><small>模板数</small></div><div class="stat"><b>${state.works.length}</b><small>作品数</small></div><div class="stat"><b>¥${state.cost || '0.00'}</b><small>累计成本</small></div></section>`);
}
function quickCard(no, glyph, title, desc, button, tab) {
  const tones = { upload: 'teal', remix: 'gold', clean: 'green', remote: 'yellow' };
  const action = tab === 'remote' ? 'data-nav="remote"' : `data-audio-tab="${tab}"`;
  return `<article class="card quick-card"><span class="quick-no">${no}</span><div class="quick-icon ${tones[tab] || ''}">${icon(glyph)}</div><h3>${title}</h3><p>${desc}</p><button class="btn primary block large" ${action}>${button}${icon('chevron')}</button></article>`;
}
function taskRow(name, desc, status, time) {
  const tone = status === 'warn' ? 'warn' : status === 'run' ? 'run' : '';
  return `<div class="task-row"><div class="task-main"><i class="${tone}"></i><span><b>${esc(name)}</b><small>${esc(desc)}</small></span></div><time>${esc(time)}</time></div>`;
}
function renderTrend() {
  const report = SY.chartReport(state.chartRange);
  mount(`<div class="page-intro"><div><h2>爆款拆解</h2><p>只使用本地公开文本样例，不联网，也不下载音频</p></div><div class="intro-actions"><div class="segmented"><button class="seg-btn ${state.chartRange === 'week' ? 'active' : ''}" data-chart-range="week">按周</button><button class="seg-btn ${state.chartRange === 'month' ? 'active' : ''}" data-chart-range="month">按月</button></div><button class="btn" data-dash-home>返回控制台</button></div></div>
    <section class="chart-grid"><article class="card status-card"><small>汽水音乐</small><b>70%</b></article><article class="card status-card"><small>网易云音乐</small><b>30%</b></article><article class="card status-card"><small>${esc(report.range)}热度</small><b>+${report.trendDelta}</b></article></section>
    <section class="chart-layout" style="margin-top:12px"><article class="card clean-card"><h3>可复用特征</h3><p>${esc(report.advice)}</p><div class="detail-grid"><div class="detail-box"><small>热门 BPM</small><b>${report.bpm[0].toFixed(1)}–${report.bpm[1].toFixed(1)}</b></div><div class="detail-box"><small>峰值</small><b>${SY.formatBpmText(report.bpmPeak)}</b></div><div class="detail-box"><small>调性</small><b>${esc(report.keys.join(' / '))}</b></div><div class="detail-box"><small>时长</small><b>${esc(report.duration)}</b></div><div class="detail-box"><small>结构</small><b>${esc(report.structure)}</b></div><div class="detail-box"><small>高潮</small><b>${esc(report.hookAt)}</b></div></div><div class="dict-pills" style="margin-top:14px">${report.keywords.map((item) => `<span class="tag">${esc(item)}</span>`).join('')}${report.tags.map((item) => `<span class="tag gold">${esc(item)}</span>`).join('')}</div></article><aside class="card clean-card"><h3>保存到创作模板</h3><p>会锁定 BPM、调性和风格边界，供创作中心直接使用。</p><div class="security-note">${icon('shield')}数据只写进本机模板库。</div><button class="btn primary block large" style="margin-top:16px" data-save-trend>${icon('plus')}保存为创作模板</button></aside></section>`);
}

function audioShell(content) {
  return `<div class="page-intro"><div><h2>一条清晰的本地处理链路</h2><p>导入、创作、混缩和清洗都只在当前设备完成</p></div><span class="status ok">未开放入站端口</span></div>
    <div class="segmented studio-tabs">${[['upload', '音频导入'], ['create', '创作中心'], ['remix', '一键 Remix'], ['clean', '元数据清洗']].map(([id, name]) => `<button class="seg-btn ${state.audioTab === id ? 'active' : ''}" data-audio-tab="${id}">${name}</button>`).join('')}</div>${content}`;
}
function renderAudio() {
  const views = { upload: renderUpload, create: renderCreate, remix: renderRemix, clean: renderClean };
  mount(audioShell(views[state.audioTab]()));
  if (state.audioTab === 'upload') bindDropZone();
  if (state.audioTab === 'clean') syncLayerChecks();
  if (state.audioTab === 'remix') paintProgress();
}
function renderUpload() {
  const rows = state.uploaded.map((file, index) => `<tr><td><div class="file-name"><span class="file-glyph">${icon('wave')}</span><span><b>${esc(file.name)}</b><small>${fmtSize(file.size)} · ${file.engine === 'stub' ? 'BPM 为预检占位' : '示例'}</small></span></div><div class="wave-play"><button class="btn" data-play-file="${index}">${icon('play')}播放确认</button><div class="wave-mini">${waveBars(16)}</div></div></td><td>${esc(file.duration || '时长待确认')}</td><td>${esc(file.format)}</td><td>${SY.formatBpmText(file.bpm)}</td><td>${esc(file.key)}</td><td><span class="status ${file.status === '预检中' ? 'run' : 'ok'}">${esc(file.status || '预检完成')}</span></td><td><button class="btn ghost" data-use-file="${index}">进入 Remix</button></td></tr>`).join('');
  return `<section class="drop-zone" id="dropZone"><div><div class="upload-orb">${icon('upload')}</div><h3>拖入音频文件，或点击选择本地文件</h3><p>文件只在当前设备读取，不会上传</p><button class="btn primary" data-pick-file>选择本地文件</button><div class="drop-formats">MP3 · WAV · FLAC · M4A</div></div></section>
    <div class="section-head"><div><h3>待处理文件</h3><p>${state.uploaded.length ? `${state.uploaded.length} 个文件已在本机预检，检测引擎尚未接入` : '导入后显示文件名、时长、格式和占位分析'}</p></div>${state.uploaded.length ? '<button data-clear-files>清空列表</button>' : ''}</div>
    <section class="card table-wrap">${state.uploaded.length ? `<table class="file-table"><thead><tr><th>文件</th><th>时长</th><th>格式</th><th>BPM</th><th>调性</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table>` : `<div class="empty">${icon('wave')}<p>还没有本地音频</p></div>`}</section>`;
}
function bindDropZone() {
  const zone = $('#dropZone');
  if (!zone) return;
  ['dragenter', 'dragover'].forEach((name) => zone.addEventListener(name, (event) => { event.preventDefault(); zone.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((name) => zone.addEventListener(name, (event) => { event.preventDefault(); zone.classList.remove('drag'); }));
  zone.addEventListener('drop', (event) => handleFiles(event.dataTransfer.files));
}
function readDuration(url) {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => resolve(audio.duration);
    audio.onerror = () => resolve(null);
    audio.src = url;
  });
}
async function handleFiles(fileList) {
  const valid = ['mp3', 'wav', 'flac', 'm4a'];
  const files = [...fileList].filter((file) => valid.includes((file.name.split('.').pop() || '').toLowerCase()));
  if (!files.length) return fail('format');
  if (state.pickerMode === 'template') return importTemplates(files);
  remember();
  for (const file of files) {
    const guessed = SY.stubAnalyze(file.name, file.size);
    const item = { id: uid(), name: file.name, size: file.size, format: file.name.split('.').pop().toUpperCase(), bpm: guessed.bpm, key: guessed.key, style: guessed.style, duration: '', url: URL.createObjectURL(file), status: '预检中', engine: 'stub' };
    state.uploaded.unshift(item);
    rerender();
    item.duration = fmtDuration(await readDuration(item.url));
    item.status = '预检完成';
  }
  audit('local', '导入音频', `${files.length} 个文件完成预检`, '已完成');
  addTask(`预检 ${files.length} 个音频`, 900);
  rerender();
}
function importTemplates(files) {
  remember();
  files.forEach((file) => {
    const guessed = SY.stubAnalyze(file.name, file.size);
    state.templates.unshift({ id: uid(), kind: 'accompaniment', name: file.name.replace(/\.[^.]+$/, '').slice(0, 24), style: guessed.style, bpm: guessed.bpm, key: guessed.key, license: '自有版权', desc: '导入时按全局字典预填，检测引擎尚未接入', versions: ['v1 · 导入预检'] });
  });
  audit('local', '导入模板', `${files.length} 个模板已预填参数`, '已完成');
  toast('模板参数已预填', 'BPM、调性和风格来自同一字典。检测引擎尚未接入。');
  state.libraryTab = 'accompaniment';
  setPage('templates');
}

function renderCreate() {
  const active = state.templates.find((item) => item.id === state.activeCreationId);
  const cards = state.demos.map((demo) => {
    const ratio = Math.round(overlapAgainst(demo.lyric, demo.title) * 100);
    const warned = ratio >= state.overlapThreshold;
    const choice = state.demoChoices[demo.id] || '';
    return `<article class="card demo-card ${choice}"><div class="demo-card-top"><div><h3>${esc(demo.label)}</h3><span class="status ${warned ? 'warn' : 'ok'}">${warned ? `重合度 ${ratio}% · 请改写` : `重合度 ${ratio}% · 通过`}</span></div><span class="score">${demo.score}</span></div><p class="lyric">${esc(demo.lyric)}</p><div class="demo-tags"><span class="tag gold">${esc(demo.style)}</span><span class="tag">${SY.formatBpmText(demo.bpm)} BPM</span><span class="tag">${esc(demo.key)}</span></div><div class="demo-actions"><button class="btn ${choice === 'rejected' ? 'danger' : ''}" data-demo-choice="rejected" data-id="${demo.id}">${icon('x')}淘汰</button><button class="btn ${choice === 'chosen' ? 'primary' : ''}" data-demo-choice="chosen" data-id="${demo.id}">${icon('check')}入选</button></div></article>`;
  }).join('');
  return `<section class="create-layout"><aside class="card create-controls"><h3>国风诗词模式</h3><div class="field"><label>诗词素材</label><select class="select" id="poetrySource">${['唐诗意象精选', '宋词婉约意象', '边塞与山河主题'].map((item) => `<option ${state.poetry.source === item ? 'selected' : ''}>${item}</option>`).join('')}</select></div><div class="range-row"><div><span>文言密度</span><output id="densityOut">${state.poetry.density}%</output></div><input id="density" type="range" min="20" max="90" value="${state.poetry.density}"></div><div class="field"><label>风格边界</label><select class="select" id="poetryStyle">${SY.DICT.styles.map((item) => `<option ${state.poetry.style === item ? 'selected' : ''}>${item}</option>`).join('')}</select></div><div class="field" style="margin-top:13px"><label>批量数量</label><select class="select" id="poetryCount">${[4, 8, 12].map((item) => `<option value="${item}" ${Number(state.poetry.count) === item ? 'selected' : ''}>${item} 条 Demo</option>`).join('')}</select></div>${active ? `<div class="security-note" style="margin-top:16px">${icon('spark')}对标「${esc(active.name)}」· ${SY.formatBpmText(active.bpm)} BPM · ${esc(active.key)}</div>` : `<div class="security-note" style="margin-top:16px">${icon('shield')}生成时对照已有歌词做重合度检查。</div>`}<button class="btn primary block" data-generate-demos>${icon('spark')}批量生成</button></aside><div><div class="section-head" style="margin-top:0"><div><h3>本轮候选</h3><p>直接在卡片上入选或淘汰</p></div></div><div class="demo-grid">${cards}</div><div class="bottom-bar"><span class="sync-line">超过 ${state.overlapThreshold}% 会标黄，不会上传歌词。</span><div style="display:flex;gap:8px"><button class="btn" data-more-demos>生成更多</button><button class="btn primary" data-export-demos>${icon('download')}批量导出</button></div></div></div></section>`;
}
function generateDemos() {
  remember();
  const count = Number(state.poetry.count) || 4;
  const active = state.templates.find((item) => item.id === state.activeCreationId);
  const created = [];
  for (let index = 0; index < count; index += 1) {
    const bank = LYRICS[(state.demos.length + index) % LYRICS.length];
    const bpm = active ? SY.formatBpm(active.bpm + ((index % 3) - 1) * 0.2) : SY.formatBpm(128 + ((state.demos.length + index) % 9));
    const demo = {
      id: uid(),
      title: bank[0],
      label: `Demo ${String(state.demos.length + 1).padStart(2, '0')} · ${bank[0]}`,
      lyric: bank[1],
      bpm,
      key: active?.key || SY.DICT.keys[(state.demos.length + index) % SY.DICT.keys.length],
      style: state.poetry.style,
      score: 78 + ((index * 3) % 15)
    };
    created.push(demo);
  }
  state.demos = created.concat(state.demos).slice(0, 12);
  const warned = created.filter((demo) => overlapAgainst(demo.lyric, demo.title) * 100 >= state.overlapThreshold).length;
  audit('local', '批量Demo', `生成 ${created.length} 条，${warned} 条重合度偏高`, '已完成');
  toast('本轮 Demo 已生成', warned ? `${warned} 条和已有歌词太接近，已标黄` : '重合度都在阈值内');
  state.audioTab = 'create';
  rerender();
}
function chooseDemo(id, choice) {
  const demo = state.demos.find((item) => item.id === id);
  if (!demo) return;
  remember();
  if (choice === 'rejected' && demo.versionId) {
    state.works.forEach((work) => { work.versions = work.versions.filter((version) => version.id !== demo.versionId); });
    state.works = state.works.filter((work) => work.versions.length);
    demo.versionId = '';
  }
  if (choice === 'chosen') ensureDemoVersion(demo);
  state.demoChoices[id] = choice;
  audit('local', choice === 'chosen' ? '入选 Demo' : '淘汰 Demo', demo.title, '已完成');
  toast(choice === 'chosen' ? '已入选，并挂到版本树' : '已淘汰', demo.title);
  rerender();
}
function ensureDemoVersion(demo) {
  if (demo.versionId && state.works.some((work) => work.versions.some((version) => version.id === demo.versionId))) return;
  const version = {
    id: uid(),
    name: SY.versionDisplayName(demo.title, '初稿Demo'),
    type: '初稿Demo',
    time: `今天 ${nowTime()}`,
    license: '自有版权',
    style: demo.style,
    bpm: demo.bpm,
    key: demo.key,
    lyric: demo.lyric,
    snapshot: { summary: `${SY.formatBpmText(demo.bpm)} BPM / ${demo.key} / 文言密度 ${state.poetry.density}%`, clean: true, structureId: state.structureId }
  };
  demo.versionId = version.id;
  SY.attachVersion(state.works, demo.title, version);
}

function renderRemix() {
  const source = currentSource();
  const selected = selectedTemplateObjects();
  const decision = SY.exportDecision(selected.map((item) => item.license));
  const structures = SY.STRUCTURES.map((item) => `<button class="style-tab ${state.structureId === item.id ? 'active' : ''}" data-structure="${item.id}">${item.name}</button>`).join('');
  return `<section class="remix-layout"><aside class="card source-card"><div class="album-cover"><button class="play-float" data-play-source>${icon('play')}</button></div><h3>${esc(sourceName(source))}</h3><p>${esc(source.duration || '时长待确认')} · 本地源</p><div class="wave-mini">${waveBars()}</div><div class="source-meta"><span class="tag">${SY.formatBpmText(source.bpm)} BPM</span><span class="tag">${esc(source.key)}</span></div><p class="sync-line">${source.engine === 'stub' ? 'BPM 与调性是预检占位，人声分离尚未接入。' : '示例原曲，可替换为你的本地文件。'}</p></aside>
    <div class="templates-main"><div class="style-tabs">${structures}</div><div class="style-tabs">${['全部', ...SY.DICT.styles].map((item) => `<button class="style-tab ${state.styleFilter === item ? 'active' : ''}" data-style-filter="${item}">${item}</button>`).join('')}<button class="style-tab ${state.matchBpm ? 'active' : ''}" data-match-bpm>±${SY.DICT.bpmTolerance} 匹配</button></div><div class="template-grid" id="remixTemplates">${renderRemixTemplates()}</div></div>
    <aside class="card option-card"><h3>处理选项</h3>${optionRow('align', '自动节拍对齐', '按模板节拍对齐')}${optionRow('vocal', '保留原主人声', '人声分离接口尚未接入')}${optionRow('loudness', '响度标准化', `目标 ${currentPreset().lufs} LUFS`)}${optionRow('clean', '导出前清洗元数据', cleanLine())}<div style="margin:12px 0">${selected.length ? complianceButton(decision.worst) : '<span class="status warn">还没选择模板</span>'}</div><button class="btn primary block large" data-start-remix>${icon('spark')}生成 ${selected.length} 个版本</button><p class="sync-line">生成的是版本方案，不会写出音频文件。</p></aside></section><div id="remixProgress"></div>`;
}
function optionRow(key, title, sub) {
  const checked = key === 'clean' ? state.clean.applyOnExport : state.remixOptions[key];
  return `<div class="option-row"><span>${title}<small>${esc(sub)}</small></span><label class="toggle"><input type="checkbox" data-remix-option="${key}" ${checked ? 'checked' : ''}><i></i></label></div>`;
}
function renderRemixTemplates() {
  const source = currentSource();
  return state.templates.filter((item) => item.kind !== 'creation').filter((item) => state.styleFilter === '全部' || item.style === state.styleFilter).filter((item) => !state.matchBpm || SY.bpmMatch(source.bpm, item.bpm)).map((item) => {
    const matched = SY.bpmMatch(source.bpm, item.bpm);
    return `<article class="template-card ${state.selectedTemplates.includes(item.id) ? 'selected' : ''}" data-template-select="${item.id}"><span class="select-dot">${icon('check')}</span><h4>${esc(item.name)}</h4><div class="template-meta"><span class="tag gold">${esc(item.style)}</span><span class="tag">${SY.formatBpmText(item.bpm)}</span><span class="tag">${esc(item.key)}</span>${matched ? '<span class="tag teal">可匹配</span>' : ''}</div><p>${esc(item.desc)}</p>${complianceButton(item.license)}</article>`;
  }).join('') || '<div class="card empty"><p>这个筛选下没有模板</p></div>';
}
function paintProgress() {
  const slot = $('#remixProgress');
  if (!slot || state.remixProgress == null) return;
  slot.innerHTML = `<section class="card step-progress"><div class="step-line">${STEP_NAMES.map((name, index) => `<div class="step ${index < state.remixProgress ? 'done' : index === state.remixProgress ? 'active' : ''}"><i>${index < state.remixProgress ? icon('check') : index + 1}</i><b>${name}</b></div>`).join('')}</div></section>`;
}
function beginRemix() {
  const list = selectedTemplateObjects();
  if (!list.length) return fail('noTemplate');
  const decision = SY.exportDecision(list.map((item) => item.license));
  if (decision.blocked) {
    state.pendingAction = { type: 'remix' };
    const error = SY.sanitizeError(decision.worst === '未标注' ? 'missingLicense' : 'copyright');
    openModal(`<div class="modal-icon">${icon('shield')}</div><h2>${esc(error.title)}</h2><p>${esc(error.detail)}涉及：${esc(list.filter((item) => item.license === '不可商用' || !SY.DICT.licenses.includes(item.license)).map((item) => item.name).join('、'))}。继续也只生成版本方案，不会导出音频。</p><div class="modal-actions"><button class="btn" data-modal-close>返回更换</button><button class="btn danger" data-risk-continue>知悉风险，继续</button></div>`);
    return;
  }
  runRemix();
}
function runRemix() {
  closeModal();
  const list = selectedTemplateObjects();
  const name = sourceName();
  state.remixProgress = 0;
  paintProgress();
  if (stepTimer) clearInterval(stepTimer);
  let step = 0;
  stepTimer = setInterval(() => {
    step += 1;
    state.remixProgress = Math.min(step, 4);
    paintProgress();
    if (step >= 4) clearInterval(stepTimer);
  }, 640);
  addTask(`Remix 方案 · ${name}`, 3200, () => {
    remember();
    list.forEach((template) => {
      const type = SY.TYPE_BY_STYLE[template.style] || template.style;
      SY.attachVersion(state.works, name, {
        id: uid(),
        name: SY.versionDisplayName(name, type),
        type,
        time: `今天 ${nowTime()}`,
        license: template.license,
        style: template.style,
        bpm: template.bpm,
        key: template.key,
        snapshot: {
          summary: `${template.name} / ${SY.formatBpmText(template.bpm)} BPM / ${SY.STRUCTURES.find((item) => item.id === state.structureId)?.name || ''}`,
          templateId: template.id,
          structureId: state.structureId,
          clean: state.clean.applyOnExport,
          options: { ...state.remixOptions }
        }
      });
    });
    state.remixProgress = 5;
    paintProgress();
    audit('local', 'Remix', `${list.length} 个版本挂到 ${name}`, '已完成');
    persist();
    notify('版本树已更新', `${list.length} 个版本已挂到「${name}」`);
  });
}

function renderClean() {
  const source = currentSource();
  const work = state.works.find((item) => item.name === sourceName(source));
  const license = work?.license || '自有版权';
  const template = metaTemplate();
  return `<section class="clean-layout"><div class="card clean-card"><h3>三层清洗项目</h3><p>${esc(cleanLine())}</p>
    ${SY.LAYERS.map((layer) => cleanGroup(layer)).join('')}
    </div><aside class="card clean-card"><h3>当前文件</h3><p>${esc(source.format || 'WAV')} · ${source.size ? fmtSize(source.size) : '示例'} · 不会改写原文件</p><div class="file-name"><span class="file-glyph">${icon('wave')}</span><span><b>${esc(source.name)}</b><small>${esc(source.status || '示例')}</small></span></div><div class="field" style="margin-top:18px"><label>元数据模板</label><select class="select" id="metaPick">${state.metadataTemplates.map((item) => `<option value="${item.id}" ${item.id === template.id ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}</select></div><div class="field" style="margin-top:12px"><label>艺名</label><input class="input" id="artistInput" value="${esc(template.artist)}"></div><div class="field" style="margin-top:12px"><label>专辑</label><input class="input" id="albumInput" value="${esc(template.album)}"></div><div class="field" style="margin-top:12px"><label>版权声明</label><input class="input" id="copyrightInput" value="${esc(template.copyright)}"></div><div class="option-row"><span>导出时套用这套清洗<small>与 Remix、批量导出同步</small></span><label class="toggle"><input type="checkbox" data-remix-option="clean" ${state.clean.applyOnExport ? 'checked' : ''}><i></i></label></div><div class="security-note" style="margin-top:12px">${icon('shield')}规则改一处，三个入口一起变。浏览器里只生成方案。</div><button class="btn primary block large" style="margin-top:15px" data-start-clean>${icon('shield')}清洗并导出</button><div style="margin-top:10px;text-align:center">${complianceButton(license)}</div></aside></section>`;
}
function cleanGroup(layer) {
  const items = SY.CLEAN_ITEMS.filter((item) => item.layer === layer.id);
  const enabled = items.filter((item) => state.clean.items[item.id]).length;
  const status = enabled === 0 ? '已关闭' : enabled === items.length ? '已启用' : '部分关闭';
  return `<div class="clean-group"><div class="clean-group-head"><span><label class="toggle"><input type="checkbox" data-clean-layer="${layer.id}"><i></i></label><span><b>${layer.name}</b><small>${layer.sub}</small></span></span><span class="status ${enabled ? 'ok' : 'warn'}">${status}</span></div><div class="clean-items">${items.map((item) => `<label class="check" title="${esc(item.detail)}"><input type="checkbox" data-clean-item="${item.id}" ${state.clean.items[item.id] ? 'checked' : ''}>${esc(item.label)}</label>`).join('')}</div></div>`;
}
function syncLayerChecks() {
  SY.LAYERS.forEach((layer) => {
    const box = $(`[data-clean-layer="${layer.id}"]`);
    if (!box) return;
    const items = SY.CLEAN_ITEMS.filter((item) => item.layer === layer.id);
    const enabled = items.filter((item) => state.clean.items[item.id]).length;
    box.checked = enabled === items.length;
    box.indeterminate = enabled > 0 && enabled < items.length;
  });
}
function saveMetaFromInputs() {
  const template = metaTemplate();
  if (!template) return;
  if ($('#artistInput')) template.artist = $('#artistInput').value.slice(0, 40);
  if ($('#albumInput')) template.album = $('#albumInput').value.slice(0, 40);
  if ($('#copyrightInput')) template.copyright = $('#copyrightInput').value.slice(0, 80);
}
function beginClean() {
  saveMetaFromInputs();
  const name = sourceName();
  const work = state.works.find((item) => item.name === name);
  const decision = SY.exportDecision([work?.license || '自有版权']);
  if (decision.blocked) {
    state.pendingAction = { type: 'clean' };
    const error = SY.sanitizeError('copyright');
    openModal(`<div class="modal-icon">${icon('shield')}</div><h2>${esc(error.title)}</h2><p>${esc(error.detail)}</p><div class="modal-actions"><button class="btn" data-modal-close>取消</button><button class="btn danger" data-risk-continue>知悉风险，继续</button></div>`);
    return;
  }
  runClean();
}
function runClean() {
  closeModal();
  const name = sourceName();
  addTask(`清洗方案 · ${name}`, 1800, () => {
    remember();
    const plan = makePlan(name);
    SY.attachVersion(state.works, name, {
      id: uid(),
      name: SY.versionDisplayName(name, '清洗版'),
      type: '清洗版',
      time: `今天 ${nowTime()}`,
      license: state.works.find((item) => item.name === name)?.license || '自有版权',
      style: currentSource().style || '国风DJ',
      bpm: SY.formatBpm(currentSource().bpm),
      key: currentSource().key,
      snapshot: { summary: `清洗 ${plan.cleanFingerprint} / ${plan.presetName}`, clean: plan.cleanApplied, presetId: plan.presetId },
      exportPlan: plan
    });
    audit('local', '清洗', `${name} · 指纹 ${plan.cleanFingerprint}`, '已完成');
    persist();
    const error = SY.sanitizeError('engine');
    notify(error.title, error.detail);
  });
}

function renderTemplates() {
  const list = filteredTemplates();
  mount(`<div class="page-intro"><div><h2>模板与版权，一处维护</h2><p>筛选默认收起。试听 15 秒后结束，不留下预览文件</p></div><button class="btn primary" data-import-template>${icon('plus')}导入模板</button></div>
    <div class="library-tools"><div class="segmented"><button class="seg-btn ${state.libraryTab === 'creation' ? 'active' : ''}" data-library-tab="creation">创作模板</button><button class="seg-btn ${state.libraryTab === 'accompaniment' ? 'active' : ''}" data-library-tab="accompaniment">伴奏模板</button></div><div style="display:flex;gap:8px"><button class="btn" data-toggle-filters>${state.filtersOpen ? '收起筛选' : '筛选'}</button><div class="search">${icon('search')}<input class="input" id="templateSearch" value="${esc(state.libraryQuery)}" placeholder="搜索名称或风格"></div></div></div>
    <section class="library-layout ${state.filtersOpen ? '' : 'no-filter'}">${state.filtersOpen ? filterPanel() : ''}<div class="template-library-grid" id="libraryGrid">${renderLibraryCards(list)}</div></section>`);
}
function filterPanel() {
  return `<aside class="card filter-panel"><h3>筛选条件</h3><div class="filter-section"><b>风格</b><div class="filter-options">${SY.DICT.styles.map((item) => `<label class="check"><input type="checkbox" data-filter-style="${item}" ${state.libraryStyles.includes(item) ? 'checked' : ''}>${item}</label>`).join('')}</div></div><div class="filter-section"><b>调性</b><select class="select" id="libraryKey"><option value="">全部调性</option>${SY.DICT.keys.map((item) => `<option ${state.libraryKey === item ? 'selected' : ''}>${item}</option>`).join('')}</select></div><div class="filter-section"><b>版权属性</b><div class="filter-options">${SY.DICT.licenses.map((item) => `<label class="check"><input type="checkbox" data-filter-license="${item}" ${state.libraryLicenses.includes(item) ? 'checked' : ''}>${item}</label>`).join('')}</div></div><div class="filter-section"><b>BPM 区间</b><div class="sync-line">${SY.formatBpmText(state.bpmMin)} – ${SY.formatBpmText(state.bpmMax)}</div><input data-bpm="min" type="range" min="80" max="180" value="${state.bpmMin}"><input data-bpm="max" type="range" min="80" max="180" value="${state.bpmMax}"></div></aside>`;
}
function filteredTemplates() {
  const kind = state.libraryTab === 'creation' ? 'creation' : 'accompaniment';
  return state.templates.filter((item) => (item.kind || 'accompaniment') === kind).filter((item) => {
    if (state.libraryQuery && !`${item.name} ${item.style}`.toLowerCase().includes(state.libraryQuery.toLowerCase())) return false;
    if (state.libraryStyles.length && !state.libraryStyles.includes(item.style)) return false;
    if (state.libraryLicenses.length && !state.libraryLicenses.includes(item.license)) return false;
    if (state.libraryKey && item.key !== state.libraryKey) return false;
    return item.bpm >= state.bpmMin && item.bpm <= state.bpmMax;
  });
}
function renderLibraryCards(list) {
  if (!list.length) return '<div class="card empty"><p>没有符合筛选的模板</p></div>';
  return list.map((item, index) => `<article class="card lib-card"><div class="lib-art">${Array.from({ length: 22 }, (_, bar) => `<i style="height:${8 + (bar * 13 + index * 7) % 34}px"></i>`).join('')}</div><div class="lib-head"><div><h3>${esc(item.name)}</h3><p>${esc((item.versions || ['v1'])[0])} · ${SY.formatBpmText(item.bpm)} BPM</p></div>${complianceButton(item.license)}</div><div class="lib-meta"><span class="tag gold">${esc(item.style)}</span><span class="tag">${esc(item.key)}</span></div><div class="lib-foot"><button class="preview-btn" data-preview-template="${item.id}">${icon('play')}15 秒试听${state.preview?.templateId === item.id ? ` · ${state.preview.left}s` : ''}</button><button class="icon-btn" data-template-detail="${item.id}">${icon('more')}</button></div></article>`).join('');
}

function visibleWorks() {
  return state.works.filter((work) => {
    if (state.workQuery && !work.name.includes(state.workQuery)) return false;
    if (state.workStatus !== '全部' && work.status !== state.workStatus) return false;
    if (state.workStyle !== '全部' && work.style !== state.workStyle) return false;
    if (state.workLicense !== '全部' && work.license !== state.workLicense) return false;
    return true;
  });
}
function renderWorks() {
  const preset = currentPreset();
  const selected = state.works.filter((work) => state.selectedWorkIds.includes(work.id));
  const decision = SY.exportDecision(selected.map((work) => work.license));
  mount(`<div class="page-intro"><div><h2>原曲聚合的版本树</h2><p>新的 Demo、Remix 和清洗版会自动回到同名原曲下</p></div><button class="btn primary" data-audio-tab="upload">${icon('plus')}导入原曲</button></div>
    <div class="preset-grid">${state.exportPresets.map((item) => `<button class="card preset-card ${item.id === preset.id ? 'selected' : ''}" data-preset="${item.id}"><b>${esc(item.name)}</b><span>${esc(item.format)} · ${item.lufs} LUFS · ${esc(item.duration)}</span></button>`).join('')}</div>
    <div class="batch-bar"><span class="sync-line">当前预设「${esc(preset.name)}」。${esc(cleanLine())}</span><button class="btn" data-save-preset>保存自定义预设</button></div>
    <div class="works-toolbar"><div class="left"><div class="search">${icon('search')}<input class="input" id="workSearch" value="${esc(state.workQuery)}" placeholder="搜索作品"></div><select class="select" id="workStatus"><option>全部</option>${['待发布', '已发布', '已上架'].map((item) => `<option ${state.workStatus === item ? 'selected' : ''}>${item}</option>`).join('')}</select><select class="select" id="workStyle"><option>全部</option>${SY.DICT.styles.map((item) => `<option ${state.workStyle === item ? 'selected' : ''}>${item}</option>`).join('')}</select><select class="select" id="workLicense"><option>全部</option>${SY.DICT.licenses.map((item) => `<option ${state.workLicense === item ? 'selected' : ''}>${item}</option>`).join('')}</select></div><div class="right"><button class="btn" data-batch-rename ${selected.length ? '' : 'disabled'}>批量重命名</button><button class="btn" data-batch-tag ${selected.length ? '' : 'disabled'}>批量标签</button><button class="btn primary" data-batch-export ${selected.length ? '' : 'disabled'}>批量导出</button></div></div>
    ${selected.length ? `<div class="sync-line" style="margin-bottom:10px">已选 ${selected.length} 首 · ${complianceButton(decision.worst)}</div>` : ''}
    <section class="work-list">${visibleWorks().map(renderWorkCard).join('') || '<div class="card empty"><p>没有符合条件的作品</p></div>'}</section>`);
}
function renderWorkCard(work) {
  return `<article class="card work-card ${state.openWorks[work.id] ? 'open' : ''}" data-work="${work.id}"><div class="work-summary" data-toggle-work="${work.id}"><input class="pick" type="checkbox" data-pick-work="${work.id}" ${state.selectedWorkIds.includes(work.id) ? 'checked' : ''}><div class="work-cover">${icon('music')}</div><div class="work-info"><h3>${esc(work.name)}</h3><p>${work.versions.length} 个版本 · ${SY.formatBpmText(work.bpm)} BPM · ${esc(work.key)}</p><span class="tag ${work.status === '已上架' ? 'green' : work.status === '待发布' ? 'gold' : 'teal'}">${esc(work.status)}</span></div><div class="work-updated"><b>${esc(work.updated)}</b><small>${complianceButton(work.license)}</small></div><button class="expand-btn">${icon('chevron')}</button></div><div class="version-tree">${work.versions.map((version) => `<div class="version-row"><div><b>${esc(version.name)}</b><small>${esc(version.type)}</small></div><time>${esc(version.time)}</time><button class="btn ghost" data-version-detail="${work.id}:${version.id}">查看参数</button></div>`).join('')}</div></article>`;
}

function renderRemote() {
  const payload = state.lastPayload ? JSON.stringify(state.lastPayload, null, 2) : '还没有向外发送状态。发送时只有指令名、进度和简短说明。';
  mount(`<div class="page-intro"><div><h2>只接收标准纯文本指令</h2><p>本机主动维护连接状态，不开放入站端口。指令端不能改执行模式</p></div><span class="status ${state.agentConnected ? 'ok' : 'warn'}">${state.agentConnected ? '连接状态正常' : '连接已关闭'}</span></div>
    <section class="remote-status"><div class="card status-card"><small>AGENT 连接</small><b class="text"><span class="status ${state.agentConnected ? 'ok' : 'warn'}">${state.agentConnected ? '在线' : '关闭'}</span></b></div><div class="card status-card"><small>执行模式</small><b class="text">${state.remoteMode === 'risk' ? '仅高风险确认' : '全手动确认'}</b></div><div class="card status-card"><small>待确认</small><b>${String(state.pending.length).padStart(2, '0')}</b></div><div class="card status-card"><small>最近同步</small><b class="text">${state.history[0]?.time || '尚未'}</b></div></section>
    <div class="section-head"><div><h3>预设下发</h3><p>没有自由输入。未授权指令会被拦截</p></div><button class="btn danger" data-probe-block>试一条未授权指令</button></div>
    <div class="cmd-grid">${SY.COMMAND_DEFS.map((item) => `<button class="btn" data-issue="${item.name}" ${state.whitelist[item.name] ? '' : 'disabled'}>${item.name}</button>`).join('')}</div>
    <div class="section-head"><div><h3>待确认指令</h3><p>高风险操作必须在本机点确认</p></div></div>
    <section class="command-list">${state.pending.length ? state.pending.map((item) => `<article class="card command-card"><div><h3>${esc(item.type)} · ${esc(item.target || '当前作品')}</h3><p>${paramsText(item.params)}</p><div class="command-meta"><span class="tag">${esc(item.time)}</span><span class="tag gold">${item.risk === 'low' ? '低风险' : '高风险'} · 需确认</span><span class="status ok">白名单内</span></div></div><div class="command-actions"><button class="btn danger" data-command-reject="${item.id}">拒绝</button><button class="btn primary" data-command-confirm="${item.id}">确认执行</button></div></article>`).join('') : `<div class="card empty">${icon('check')}<p>没有待确认指令</p></div>`}</section>
    <div class="section-head"><div><h3>指令模板</h3><p>只存在这台设备上</p></div></div>
    <section class="card clean-card"><div class="chart-layout"><div class="field"><label>模板名称</label><input class="input" id="cmdLabel" maxlength="24" placeholder="例如 国风双版本"></div><div class="field"><label>指令</label><select class="select" id="cmdPick">${SY.COMMAND_DEFS.filter((item) => state.whitelist[item.name]).map((item) => `<option>${item.name}</option>`).join('')}</select></div></div><button class="btn" style="margin-top:12px" data-save-command>保存到本机</button><div class="command-list" style="margin-top:12px">${state.commandTemplates.map((item) => `<article class="card command-card"><div><h3>${esc(item.name)}</h3><p>${esc(item.command)}</p></div><div class="command-actions"><button class="btn danger" data-delete-command="${item.id}">删除</button><button class="btn primary" data-send-command="${item.id}">下发</button></div></article>`).join('') || '<p class="sync-line">还没有指令模板</p>'}</div></section>
    <div class="section-head"><div><h3>最近一次状态回传</h3><p>这里能看到的只有文本状态</p></div></div>
    <pre class="payload-box">${esc(payload)}</pre>
    <div class="section-head"><div><h3>历史指令</h3><p>默认折叠</p></div><button data-show-history>${state.historyOpen ? '收起' : '展开'}</button></div>
    <section class="card table-wrap" id="historyTable" ${state.historyOpen ? '' : 'hidden'}><table class="log-table"><thead><tr><th>指令</th><th>结果</th><th>时间</th><th>数据边界</th></tr></thead><tbody>${state.history.map((item) => `<tr><td>${esc(item.type)}</td><td><span class="status ${item.result === '已拦截' || item.result === '已拒绝' ? 'warn' : 'ok'}">${esc(item.result)}</span></td><td>${esc(item.time)}</td><td>仅文本状态</td></tr>`).join('')}</tbody></table></section>
    <div class="safety-bar"><span>${icon('lock')}只接收授权指令</span><span>${icon('shield')}音频只在本地处理</span><span>${icon('clock')}操作都有日志</span></div>`);
}
function issueCommand(name, params = {}, target = '当前作品') {
  if (!state.agentConnected) {
    state.lastPayload = SY.buildStatusPayload({ command: name, progress: 0, state: 'error', message: '连接已关闭' });
    audit('remote', name, '连接关闭', '未执行');
    fail('offline');
    if (state.page === 'remote') rerender();
    return state.lastPayload;
  }
  const decision = SY.evaluateCommand(name, params, { whitelist: state.whitelist, mode: state.remoteMode });
  state.lastPayload = decision.payload;
  if (!decision.ok) {
    audit('remote', name, '不在授权范围内', '已拦截');
    fail('whitelist');
    if (state.page === 'remote') rerender();
    return decision.payload;
  }
  if (decision.needsConfirm) {
    state.pending.unshift({ id: uid(), type: name, target, params: decision.params, time: nowTime(), risk: decision.risk });
    audit('remote', name, '等待本机确认', '已排队');
    toast('指令等待确认', '还没有使用本地文件');
  } else {
    executeCommand(name, decision.params, target);
  }
  renderChrome();
  if (state.page === 'remote') rerender();
  return state.lastPayload;
}
function executeCommand(name, params = {}, target = '当前作品') {
  const started = Date.now();
  state.lastPayload = SY.buildStatusPayload({ command: name, progress: 30, state: 'running', message: '正在本机执行' });
  if (name === '暂停') state.taskControl = 'paused';
  if (name === '终止') {
    state.taskControl = 'killed';
    state.tasks = [];
    renderTasks();
    setTimeout(() => { state.taskControl = 'run'; }, 400);
  }
  if (name === '查状态' || name === '健康检查') {
    const message = name === '健康检查' ? '界面可用，未开放入站端口' : `待确认 ${state.pending.length} 条`;
    state.lastPayload = SY.buildStatusPayload({ command: name, progress: 100, state: 'done', message });
    audit('remote', name, message, '已完成', started);
    notify(name === '健康检查' ? '健康检查完成' : '状态已更新', message);
    return;
  }
  if (name === '暂停' || name === '终止') {
    state.lastPayload = SY.buildStatusPayload({ command: name, progress: 100, state: 'done', message: name === '暂停' ? '任务已暂停' : '任务已终止' });
    audit('remote', name, state.lastPayload.message, '已完成', started);
    return;
  }
  if (name === '批量Demo') {
    generateDemos();
    state.lastPayload = SY.buildStatusPayload({ command: name, progress: 100, state: 'done', message: 'Demo 已在本机生成' });
    audit('remote', name, '已调用创作中心', '已完成', started);
    return;
  }
  if (name === 'Remix') { beginRemix(); audit('remote', name, '已进入版权检查', '已接收', started); return; }
  if (name === '清洗') { beginClean(); audit('remote', name, '已进入版权检查', '已接收', started); return; }
  if (name === '导出') {
    const targetWork = state.works.find((work) => work.name === sourceName()) || state.works[0];
    exportTargets(targetWork ? [targetWork.id] : []);
    audit('remote', name, '已进入版权检查', '已接收', started);
    return;
  }
  if (name === '模板迭代') {
    const template = selectedTemplateObjects()[0] || state.templates[0];
    template.versions = template.versions || [];
    template.versions.unshift(`v${template.versions.length + 1} · ${nowTime()} 参数迭代`);
    state.lastPayload = SY.buildStatusPayload({ command: name, progress: 100, state: 'done', message: '已记录模板版本' });
    audit('remote', name, template.name, '已完成', started);
    toast('模板版本已记下', template.name);
  }
}

function renderSettings() {
  mount(`<div class="page-intro"><div><h2>本地偏好与安全边界</h2><p>远程指令不能查看或修改这里的开关</p></div><span class="status ok">配置在本机</span></div><section class="settings-layout"><aside class="card settings-menu">${[['general', '通用设置'], ['remote', '远程调度'], ['audio', '音频处理'], ['about', '关于']].map(([id, name]) => `<button class="${state.settingsTab === id ? 'active' : ''}" data-settings-tab="${id}">${name}</button>`).join('')}</aside><div>${renderSettingsContent()}</div></section>`);
}
function renderSettingsContent() {
  if (state.settingsTab === 'remote') {
    return `<article class="card settings-card"><h3>远程调度</h3><p>模式切换只影响之后的新指令</p>${settingRow('Agent 连接', '关闭后不再接收指令，也不会打开入站端口', `<label class="toggle"><input type="checkbox" id="agentToggle" ${state.agentConnected ? 'checked' : ''}><i></i></label>`)}${settingRow('执行模式', '默认每条指令都要手动确认', `<select class="select" id="remoteMode"><option value="manual" ${state.remoteMode === 'manual' ? 'selected' : ''}>全手动确认</option><option value="risk" ${state.remoteMode === 'risk' ? 'selected' : ''}>仅高风险手动</option></select>`)}</article><article class="card settings-card"><h3>指令白名单</h3><p>只能开关预设指令，不能自己写一条新指令</p>${SY.COMMAND_DEFS.map((item) => settingRow(item.name, `${item.risk === 'low' ? '低风险' : '高风险'} · ${item.summary}`, `<label class="toggle"><input type="checkbox" data-whitelist="${item.name}" ${state.whitelist[item.name] ? 'checked' : ''}><i></i></label>`)).join('')}<div style="margin-top:12px"><button class="btn" data-open-audit>查看操作日志</button></div></article>`;
  }
  if (state.settingsTab === 'audio') {
    return `<article class="card settings-card"><h3>音频处理</h3><p>真实人声分离、重封装和水印弱化还没有接入</p>${settingRow('默认导出格式', '用于新建的自定义预设', `<select class="select" id="defaultFormat">${['WAV', 'FLAC', 'MP3'].map((item) => `<option ${state.defaultFormat === item ? 'selected' : ''}>${item}</option>`).join('')}</select>`)}${settingRow('默认响度', '自定义预设使用，三套内置预设保持自己的响度', `<select class="select" id="defaultLufs">${[-14, -12, -9].map((item) => `<option value="${item}" ${Number(state.defaultLufs) === item ? 'selected' : ''}>${item} LUFS</option>`).join('')}</select>`)}</article><article class="card settings-card"><h3>全局参数字典</h3><p>BPM ${SY.DICT.bpmDecimals} 位小数，匹配误差 ±${SY.DICT.bpmTolerance}。调性 ${SY.DICT.keys.length} 个。</p><div class="dict-pills">${SY.DICT.styles.map((item) => `<span class="tag gold">${item}</span>`).join('')}</div><div class="dict-pills" style="margin-top:8px">${SY.DICT.licenses.map((item) => `<span class="tag">${item}</span>`).join('')}</div></article>`;
  }
  if (state.settingsTab === 'about') {
    return `<article class="card settings-card"><h3>关于声屿</h3><p>个人本地音频智能创作工作台</p>${settingRow('版本', '当前本地构建', '<b>0.1.0</b>')}${settingRow('数据位置', '只保存在这台设备', '<span class="status ok">本机</span>')}${settingRow('音频引擎', '分离、检测、重封装与水印弱化', '<span class="status warn">尚未接入</span>')}${settingRow('网络', '界面不上传音频、歌词、模板或作品', '<span class="status ok">未传文件</span>')}</article>`;
  }
  return `<article class="card settings-card"><h3>通用设置</h3><p>外观和导出偏好</p>${settingRow('界面主题', '浅色与深色使用同一套结构', `<div class="segmented"><button class="seg-btn ${state.theme === 'light' ? 'active' : ''}" data-theme-set="light">浅色</button><button class="seg-btn ${state.theme === 'dark' ? 'active' : ''}" data-theme-set="dark">深色</button></div>`)}${settingRow('默认导出位置', '不显示真实磁盘路径', '<input class="input" value="音乐/声屿导出" readonly>')}${settingRow('默认元数据模板', '清洗、Remix 和批量导出共用', `<select class="select" id="metaPick">${state.metadataTemplates.map((item) => `<option value="${item.id}" ${item.id === state.metadataTemplateId ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}</select>`)}</article>`;
}
function settingRow(name, desc, control) {
  return `<div class="setting-row"><div><b>${name}</b><small>${desc}</small></div><div>${control}</div></div>`;
}

function addTask(name, duration = 2200, onDone) {
  if (state.taskControl === 'killed') return;
  const task = { id: uid(), name, progress: 4 };
  state.tasks.unshift(task);
  renderTasks();
  $('#taskPanel').classList.remove('minimized');
  let elapsed = 0;
  const timer = setInterval(() => {
    if (state.taskControl === 'killed') {
      clearInterval(timer);
      state.tasks = [];
      renderTasks();
      return;
    }
    if (state.taskControl === 'paused') {
      renderTasks();
      return;
    }
    elapsed += 260;
    task.progress = Math.min(100, Math.round(elapsed / duration * 100));
    renderTasks();
    if (task.progress >= 100) {
      clearInterval(timer);
      if (onDone) onDone();
      else notify('本地任务已完成', name);
      setTimeout(() => {
        state.tasks = state.tasks.filter((item) => item.id !== task.id);
        renderTasks();
        if (!state.tasks.length) $('#taskPanel').classList.add('minimized');
      }, 2200);
    }
  }, 260);
}
function renderTasks() {
  $('#taskCount').textContent = state.tasks.length;
  $('#taskList').innerHTML = state.tasks.length ? state.tasks.map((task) => `<div class="global-task"><div><b>${esc(task.name)}</b><small>${state.taskControl === 'paused' ? '已暂停' : `${task.progress}%`}</small></div><div class="progress"><i style="width:${task.progress}%"></i></div></div>`).join('') : '<div class="empty" style="padding:20px"><p>没有后台任务</p></div>';
}
function openModal(html) {
  $('#modalContent').innerHTML = html;
  $('#modal').classList.add('open');
  $('#modal').setAttribute('aria-hidden', 'false');
  $('#overlay').hidden = false;
}
function closeModal() {
  $('#modal').classList.remove('open');
  $('#modal').setAttribute('aria-hidden', 'true');
  state.pendingAction = null;
  if (!$('#drawer').classList.contains('open')) $('#overlay').hidden = true;
}
function openDrawer(title, html) {
  $('#drawerTitle').textContent = title;
  $('#drawerBody').innerHTML = html;
  $('#drawer').classList.add('open');
  $('#drawer').setAttribute('aria-hidden', 'false');
  $('#overlay').hidden = false;
}
function closeDrawer() {
  $('#drawer').classList.remove('open');
  $('#drawer').setAttribute('aria-hidden', 'true');
  if (!$('#modal').classList.contains('open')) $('#overlay').hidden = true;
}

function showWorkDetail(workId, versionId) {
  const work = findWork(workId);
  const version = findVersion(work, versionId) || work?.versions[0];
  if (!work || !version) return;
  const platform = state.materialPlatform[work.id] || 'qishui';
  const generated = SY.buildMaterials(work, platform);
  const saved = work.materials?.[platform] || generated;
  const logs = state.audit.filter((item) => (item.detail || '').includes(work.name) || (item.action || '').includes(work.name)).slice(0, 5);
  openDrawer(work.name, `<div class="detail-cover">${icon('music')}</div><div class="detail-grid"><div class="detail-box"><small>BPM</small><b>${SY.formatBpmText(work.bpm)}</b></div><div class="detail-box"><small>调性</small><b>${esc(work.key)}</b></div><div class="detail-box"><small>版权</small><b>${esc(work.license)}</b></div><div class="detail-box"><small>状态</small><b>${esc(work.status)}</b></div></div>
    <div class="detail-section"><h3>作品信息</h3><div class="field"><label>状态</label><select class="select" data-work-status="${work.id}">${['待发布', '已发布', '已上架'].map((item) => `<option ${work.status === item ? 'selected' : ''}>${item}</option>`).join('')}</select></div><p class="sync-line">版权来自模板，不能在这里改成可商用。${complianceButton(work.license)}</p></div>
    <div class="detail-section"><h3>参数快照</h3><div class="security-note">${icon('clock')} ${esc(version.snapshot?.summary || '暂无快照')}</div><button class="btn block" style="margin-top:8px" data-load-snapshot="${work.id}:${version.id}">加载参数到 Remix</button></div>
    <div class="detail-section"><h3>发行物料</h3><div class="segmented"><button class="seg-btn ${platform === 'qishui' ? 'active' : ''}" data-material-platform="qishui" data-work-id="${work.id}" data-version-id="${version.id}">汽水音乐</button><button class="seg-btn ${platform === 'netease' ? 'active' : ''}" data-material-platform="netease" data-work-id="${work.id}" data-version-id="${version.id}">网易云音乐</button></div><div class="field" style="margin-top:10px"><label>歌名建议</label><textarea id="materialTitles" rows="3">${esc(saved.titles.join('\n'))}</textarea></div><div class="field" style="margin-top:8px"><label>简介</label><textarea id="materialIntro" rows="3" maxlength="100">${esc(saved.intro)}</textarea></div><div class="dict-pills" style="margin-top:8px">${saved.tags.map((item) => `<span class="tag">${esc(item)}</span>`).join('')}</div><p class="sync-line">建议发布：${esc(saved.publishAt)}</p><button class="btn block" data-copy-material="${work.id}">${icon('copy')}复制全部物料</button></div>
    <div class="detail-section"><h3>按预设导出</h3><p class="sync-line">${esc(currentPreset().name)} · ${esc(currentPreset().format)} · ${currentPreset().lufs} LUFS</p><button class="btn primary block" data-export-work="${work.id}:${version.id}">${icon('download')}导出此版本</button><div style="margin-top:8px">${complianceButton(version.license || work.license)}</div></div>
    <div class="detail-section"><h3>相关日志</h3>${logs.length ? logs.map((item) => `<div class="task-row"><div class="task-main"><i></i><span><b>${esc(item.action)}</b><small>${esc(item.result)}</small></span></div><time>${esc(item.at.slice(11, 16))}</time></div>`).join('') : '<p class="sync-line">还没有与这首作品相关的新日志</p>'}</div>`);
}
function showTemplateDetail(id) {
  const template = state.templates.find((item) => item.id === id);
  if (!template) return;
  openDrawer(template.name, `<div class="detail-cover"><div class="wave-mini" style="width:72%;justify-content:center">${waveBars(28)}</div></div><div class="detail-grid"><div class="detail-box"><small>BPM</small><b>${SY.formatBpmText(template.bpm)}</b></div><div class="detail-box"><small>调性</small><b>${esc(template.key)}</b></div><div class="detail-box"><small>风格</small><b>${esc(template.style)}</b></div><div class="detail-box"><small>版权</small><b>${esc(template.license)}</b></div></div><div class="detail-section"><h3>结构说明</h3><p class="sync-line">${esc(template.desc)}</p></div><div class="detail-section"><h3>版本记录</h3>${(template.versions || ['v1 · 初始']).map((item, index) => `<div class="task-row"><div class="task-main"><i></i><span><b>${esc(item)}</b><small>${index === 0 ? '当前' : '可回溯的参数记录'}</small></span></div></div>`).join('')}<p class="sync-line">对比的是参数记录，不是音频文件。</p></div>`);
}
function showAudit() {
  openDrawer('操作日志', state.audit.length ? state.audit.slice(0, 40).map((item) => `<div class="task-row"><div class="task-main"><i class="${item.result === '已拦截' ? 'warn' : ''}"></i><span><b>${esc(item.action)} · ${esc(item.result)}</b><small>${esc(item.detail || item.source)}</small></span></div><time>${esc(item.at.slice(5, 16).replace('T', ' '))}</time></div>`).join('') : '<div class="empty"><p>还没有操作记录</p></div>');
}
function continueRisk() {
  const action = state.pendingAction;
  state.pendingAction = null;
  closeModal();
  if (!action) return;
  if (action.type === 'remix') runRemix();
  if (action.type === 'clean') runClean();
  if (action.type === 'export') writeExportPlans(action.ids);
}
function exportTargets(ids) {
  const works = state.works.filter((work) => ids.includes(work.id));
  if (!works.length) return fail('empty');
  const decision = SY.exportDecision(works.map((work) => work.license));
  if (decision.blocked) {
    state.pendingAction = { type: 'export', ids };
    const error = SY.sanitizeError(decision.worst === '未标注' ? 'missingLicense' : 'copyright');
    openModal(`<div class="modal-icon">${icon('shield')}</div><h2>${esc(error.title)}</h2><p>${esc(error.detail)}涉及：${esc(works.filter((work) => work.license === '不可商用').map((work) => work.name).join('、') || '当前选择')}。</p><div class="modal-actions"><button class="btn" data-modal-close>取消</button><button class="btn danger" data-risk-continue>知悉风险，继续</button></div>`);
    return;
  }
  writeExportPlans(ids);
}
function writeExportPlans(ids) {
  remember();
  const works = state.works.filter((work) => ids.includes(work.id));
  works.forEach((work) => {
    const version = work.versions[0];
    if (!version) return;
    version.exportPlan = makePlan(work.name);
    version.snapshot = Object.assign({}, version.snapshot, { presetId: currentPreset().id, clean: state.clean.applyOnExport });
  });
  audit('local', '导出', `${works.map((work) => work.name).join('、')} · ${currentPreset().name}`, '已完成');
  persist();
  const error = SY.sanitizeError('engine');
  notify(error.title, `${currentPreset().name}。${error.detail}`);
}
function saveTrendTemplate() {
  const report = SY.chartReport(state.chartRange);
  remember();
  const item = {
    id: uid(),
    kind: 'creation',
    name: `${report.style} · ${report.range}报`,
    style: report.style,
    bpm: SY.formatBpm(report.bpmPeak),
    key: report.key,
    license: '自有版权',
    desc: report.advice,
    versions: [`v1 · 来自${report.range}榜样例`]
  };
  state.templates.unshift(item);
  state.activeCreationId = item.id;
  state.poetry.style = item.style;
  audit('local', '保存创作模板', item.name, '已完成');
  toast('已保存创作模板', `${item.name} · ${SY.formatBpmText(item.bpm)} BPM`);
  state.dashView = 'home';
  state.libraryTab = 'creation';
  setPage('templates');
}
function playUrl(url) {
  if (!url) return toast('请重新导入后再听', '播放只在本次打开期间有效');
  if (player) { player.pause(); }
  player = new Audio(url);
  player.play().catch(() => toast('暂时不能播放', '请重新选择本地文件后再试'));
}
function startPreview(templateId) {
  if (previewTimer) clearInterval(previewTimer);
  if (player) player.pause();
  state.preview = { templateId, left: 15 };
  const file = state.uploaded.find((item) => item.url);
  if (file?.url) playUrl(file.url);
  toast('开始 15 秒试听', '没有生成预览文件');
  previewTimer = setInterval(() => {
    if (!state.preview) return;
    state.preview.left -= 1;
    const label = $(`[data-preview-template="${templateId}"]`);
    if (label) label.lastChild.textContent = `15 秒试听 · ${state.preview.left}s`;
    if (state.preview.left <= 0) {
      clearInterval(previewTimer);
      previewTimer = null;
      if (player) player.pause();
      state.preview = null;
      toast('试听已结束', '临时播放已清理，没有留下文件');
      if (state.page === 'templates') rerender();
    }
  }, 1000);
  if (state.page === 'templates') rerender();
}
function setTheme(theme) {
  state.theme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = state.theme;
  const toggle = $('#themeToggle');
  if (toggle) toggle.innerHTML = icon(state.theme === 'light' ? 'moon' : 'sun');
  persist();
}
function openWorksBatch(kind) {
  const ids = state.selectedWorkIds.slice();
  if (!ids.length) return fail('empty');
  if (kind === 'rename') {
    openModal(`<div class="modal-icon">${icon('music')}</div><h2>批量重命名</h2><p>按原曲名加上版本称呼，只改本机显示名。</p><div class="modal-actions"><button class="btn" data-modal-close>取消</button><button class="btn primary" data-rename-as="发行版">加上发行版</button></div>`);
    return;
  }
  openModal(`<div class="modal-icon">${icon('spark')}</div><h2>批量标签</h2><p>风格只会改成字典里的一项。</p><div class="field">${SY.DICT.styles.map((item) => `<button class="btn" data-tag-as="${item}" style="margin:4px">${item}</button>`).join('')}</div>`);
}

document.addEventListener('click', (event) => {
  const hit = (sel) => event.target.closest(sel);
  if (hit('#advancedToggle')) {
    state.advancedOpen = !state.advancedOpen;
    rerender();
    return;
  }
  const nav = hit('[data-nav]');
  if (nav) { setPage(nav.dataset.nav); return; }
  const audioTab = hit('[data-audio-tab]');
  if (audioTab) { state.audioTab = audioTab.dataset.audioTab; setPage('audio'); return; }
  if (hit('[data-pick-file]')) { state.pickerMode = 'audio'; $('#filePicker').click(); return; }
  if (hit('[data-import-template]')) { state.pickerMode = 'template'; $('#filePicker').click(); return; }
  if (hit('[data-clear-files]')) {
    remember();
    state.uploaded.forEach((file) => { if (file.url) URL.revokeObjectURL(file.url); });
    state.uploaded = [];
    rerender();
    return;
  }
  const useFile = hit('[data-use-file]');
  if (useFile) {
    const index = Number(useFile.dataset.useFile);
    const [file] = state.uploaded.splice(index, 1);
    state.uploaded.unshift(file);
    state.audioTab = 'remix';
    rerender();
    return;
  }
  const play = hit('[data-play-file]');
  if (play) { playUrl(state.uploaded[Number(play.dataset.playFile)]?.url); return; }
  if (hit('[data-play-source]')) { playUrl(state.uploaded[0]?.url); return; }
  const choice = hit('[data-demo-choice]');
  if (choice) { chooseDemo(choice.dataset.id, choice.dataset.demoChoice); return; }
  if (hit('[data-generate-demos],[data-more-demos]')) { generateDemos(); return; }
  if (hit('[data-export-demos]')) {
    const chosen = state.demos.filter((demo) => state.demoChoices[demo.id] === 'chosen');
    if (!chosen.length) return fail('empty');
    remember();
    chosen.forEach((demo) => ensureDemoVersion(demo));
    chosen.forEach((demo) => {
      const work = state.works.find((item) => item.name === demo.title);
      const version = work?.versions.find((item) => item.id === demo.versionId);
      if (version) version.exportPlan = makePlan(demo.title);
    });
    audit('local', '批量导出', chosen.map((demo) => demo.title).join('、'), '已完成');
    fail('engine');
    return;
  }
  const compliance = hit('[data-compliance]');
  if (compliance) {
    const status = SY.compliance(compliance.dataset.compliance);
    openModal(`<div class="modal-icon">${icon('shield')}</div><h2>${esc(status.label)}</h2><p>${esc(status.text)}</p><div class="modal-actions"><button class="btn primary" data-modal-close>知道了</button></div>`);
    return;
  }
  const templateSelect = hit('[data-template-select]');
  if (templateSelect) {
    const id = templateSelect.dataset.templateSelect;
    remember();
    state.selectedTemplates = state.selectedTemplates.includes(id) ? state.selectedTemplates.filter((item) => item !== id) : state.selectedTemplates.concat(id);
    rerender();
    return;
  }
  const style = hit('[data-style-filter]');
  if (style) { state.styleFilter = style.dataset.styleFilter; rerender(); return; }
  if (hit('[data-match-bpm]')) { state.matchBpm = !state.matchBpm; rerender(); return; }
  const structure = hit('[data-structure]');
  if (structure) { state.structureId = structure.dataset.structure; rerender(); return; }
  if (hit('[data-start-remix]')) { beginRemix(); return; }
  if (hit('[data-start-clean]')) { beginClean(); return; }
  if (hit('[data-risk-continue]')) { continueRisk(); return; }
  if (hit('[data-open-trend]')) { state.dashView = 'trend'; rerender(); return; }
  if (hit('[data-dash-home]')) { state.dashView = 'home'; rerender(); return; }
  const chartRange = hit('[data-chart-range]');
  if (chartRange) { state.chartRange = chartRange.dataset.chartRange; rerender(); return; }
  if (hit('[data-save-trend]')) { saveTrendTemplate(); return; }
  const libraryTab = hit('[data-library-tab]');
  if (libraryTab) { state.libraryTab = libraryTab.dataset.libraryTab; rerender(); return; }
  if (hit('[data-toggle-filters]')) { state.filtersOpen = !state.filtersOpen; rerender(); return; }
  const preview = hit('[data-preview-template]');
  if (preview) { startPreview(preview.dataset.previewTemplate); return; }
  const templateDetail = hit('[data-template-detail]');
  if (templateDetail) { showTemplateDetail(templateDetail.dataset.templateDetail); return; }
  const workToggle = hit('[data-toggle-work]');
  if (workToggle && !hit('input, label, [data-compliance]')) {
    const id = workToggle.dataset.toggleWork;
    state.openWorks[id] = !state.openWorks[id];
    workToggle.closest('.work-card').classList.toggle('open', Boolean(state.openWorks[id]));
    return;
  }
  const version = hit('[data-version-detail]');
  if (version) {
    const [workId, versionId] = version.dataset.versionDetail.split(':');
    showWorkDetail(workId, versionId);
    return;
  }
  const preset = hit('[data-preset]');
  if (preset) { state.exportPresetId = preset.dataset.preset; rerender(); return; }
  if (hit('[data-save-preset]')) {
    openModal(`<div class="modal-icon">${icon('download')}</div><h2>保存自定义预设</h2><p>使用设置里的默认格式和响度，只存在本机。</p><div class="field" style="margin-top:12px"><input class="input" id="presetName" maxlength="20" placeholder="预设名称"></div><div class="modal-actions"><button class="btn" data-modal-close>取消</button><button class="btn primary" data-confirm-preset>保存</button></div>`);
    return;
  }
  if (hit('[data-confirm-preset]')) {
    const name = ($('#presetName')?.value || '').trim();
    if (!name) return toast('请先写预设名称', '名称只保存在本机');
    remember();
    const item = { id: uid(), name: name.slice(0, 20), format: state.defaultFormat, quality: '自定义', duration: '完整时长', lufs: Number(state.defaultLufs), scene: '自定义', builtin: false };
    state.exportPresets.push(item);
    state.exportPresetId = item.id;
    closeModal();
    audit('local', '保存导出预设', item.name, '已完成');
    toast('预设已保存', item.name);
    rerender();
    return;
  }
  if (hit('[data-batch-export]')) { exportTargets(state.selectedWorkIds.slice()); return; }
  if (hit('[data-batch-rename]')) { openWorksBatch('rename'); return; }
  if (hit('[data-batch-tag]')) { openWorksBatch('tag'); return; }
  const rename = hit('[data-rename-as]');
  if (rename) {
    remember();
    state.selectedWorkIds.forEach((id) => {
      const work = findWork(id);
      if (!work) return;
      const version = work.versions[0];
      if (version) version.name = SY.versionDisplayName(work.name, rename.dataset.renameAs);
    });
    closeModal();
    audit('local', '批量重命名', `${state.selectedWorkIds.length} 首`, '已完成');
    rerender();
    return;
  }
  const tag = hit('[data-tag-as]');
  if (tag && SY.DICT.styles.includes(tag.dataset.tagAs)) {
    remember();
    state.selectedWorkIds.forEach((id) => { const work = findWork(id); if (work) work.style = tag.dataset.tagAs; });
    closeModal();
    audit('local', '批量标签', tag.dataset.tagAs, '已完成');
    rerender();
    return;
  }
  const exportBtn = hit('[data-export-work]');
  if (exportBtn) {
    const [workId, versionId] = exportBtn.dataset.exportWork.split(':');
    const work = findWork(workId);
    const version = findVersion(work, versionId);
    const decision = SY.exportDecision([version?.license || work?.license]);
    if (decision.blocked) {
      state.pendingAction = { type: 'export', ids: [workId] };
      const error = SY.sanitizeError('copyright');
      openModal(`<div class="modal-icon">${icon('shield')}</div><h2>${esc(error.title)}</h2><p>${esc(error.detail)}</p><div class="modal-actions"><button class="btn" data-modal-close>取消</button><button class="btn danger" data-risk-continue>知悉风险，继续</button></div>`);
      return;
    }
    writeExportPlans([workId]);
    return;
  }
  const loadSnap = hit('[data-load-snapshot]');
  if (loadSnap) {
    const [workId, versionId] = loadSnap.dataset.loadSnapshot.split(':');
    const version = findVersion(findWork(workId), versionId);
    if (!version?.snapshot) return;
    remember();
    if (version.snapshot.templateId && state.templates.some((item) => item.id === version.snapshot.templateId)) state.selectedTemplates = [version.snapshot.templateId];
    if (version.snapshot.structureId) state.structureId = version.snapshot.structureId;
    if (typeof version.snapshot.clean === 'boolean') state.clean.applyOnExport = version.snapshot.clean;
    if (version.snapshot.options) state.remixOptions = Object.assign(state.remixOptions, version.snapshot.options);
    if (version.snapshot.presetId) state.exportPresetId = version.snapshot.presetId;
    closeDrawer();
    state.audioTab = 'remix';
    toast('参数已填入 Remix', '可以按这套快照再生成一个版本');
    setPage('audio');
    return;
  }
  const copy = hit('[data-copy-material]');
  if (copy) {
    const work = findWork(copy.dataset.copyMaterial);
    const platform = state.materialPlatform[work.id] || 'qishui';
    const material = work.materials?.[platform] || SY.buildMaterials(work, platform);
    const text = [`歌名：${material.titles.join(' / ')}`, material.intro, material.tags.map((item) => `#${item}`).join(' '), `发布时间：${material.publishAt}`].join('\n');
    navigator.clipboard?.writeText(text).then(() => toast('已复制发行物料', '只复制了文字')).catch(() => toast('请手动复制', '剪贴板暂时不可用'));
    return;
  }
  const platformBtn = hit('[data-material-platform]');
  if (platformBtn) {
    state.materialPlatform[platformBtn.dataset.workId] = platformBtn.dataset.materialPlatform;
    showWorkDetail(platformBtn.dataset.workId, platformBtn.dataset.versionId);
    return;
  }
  if (hit('[data-probe-block]')) { issueCommand('读取文件', { path: 'C:\\Users\\me\\secret.wav', lyric: '不应出现' }); return; }
  const issue = hit('[data-issue]');
  if (issue) { issueCommand(issue.dataset.issue, { note: SY.COMMAND_DEFS.find((item) => item.name === issue.dataset.issue)?.summary || '' }); return; }
  const confirm = hit('[data-command-confirm]');
  if (confirm) {
    const index = state.pending.findIndex((item) => item.id === confirm.dataset.commandConfirm);
    if (index < 0) return;
    const command = state.pending.splice(index, 1)[0];
    executeCommand(command.type, command.params, command.target);
    renderChrome();
    rerender();
    return;
  }
  const reject = hit('[data-command-reject]');
  if (reject) {
    const index = state.pending.findIndex((item) => item.id === reject.dataset.commandReject);
    if (index < 0) return;
    const command = state.pending.splice(index, 1)[0];
    audit('remote', command.type, '用户拒绝', '已拒绝');
    toast('指令已拒绝', '没有使用本地文件');
    renderChrome();
    rerender();
    return;
  }
  if (hit('[data-save-command]')) {
    const name = ($('#cmdLabel')?.value || '').trim();
    const command = $('#cmdPick')?.value;
    if (!name) return toast('请先写模板名称', '名称只保存在本机');
    if (!state.whitelist[command]) return fail('whitelist');
    remember();
    state.commandTemplates.unshift({ id: uid(), name: name.slice(0, 24), command });
    audit('local', '保存指令模板', name, '已完成');
    toast('指令模板已保存', '没有上传');
    rerender();
    return;
  }
  const sendCommand = hit('[data-send-command]');
  if (sendCommand) {
    const item = state.commandTemplates.find((template) => template.id === sendCommand.dataset.sendCommand);
    if (item) issueCommand(item.command, { note: item.name }, item.name);
    return;
  }
  const deleteCommand = hit('[data-delete-command]');
  if (deleteCommand) {
    remember();
    state.commandTemplates = state.commandTemplates.filter((item) => item.id !== deleteCommand.dataset.deleteCommand);
    rerender();
    return;
  }
  if (hit('[data-show-history]')) { state.historyOpen = !state.historyOpen; rerender(); return; }
  const settings = hit('[data-settings-tab]');
  if (settings) { state.settingsTab = settings.dataset.settingsTab; rerender(); return; }
  const themeSet = hit('[data-theme-set]');
  if (themeSet) { setTheme(themeSet.dataset.themeSet); rerender(); return; }
  if (hit('[data-open-audit]')) { showAudit(); return; }
  if (hit('[data-modal-close]')) { closeModal(); return; }
  if (hit('[data-close-drawer]')) { closeDrawer(); return; }
});

document.addEventListener('input', (event) => {
  if (event.target.id === 'density') {
    state.poetry.density = Number(event.target.value);
    const out = $('#densityOut');
    if (out) out.textContent = `${state.poetry.density}%`;
  }
  if (event.target.id === 'overlapRange') {
    state.overlapThreshold = Number(event.target.value);
    const out = $('#overlapOut');
    if (out) out.textContent = `${state.overlapThreshold}%`;
    persist();
  }
  if (event.target.id === 'templateSearch') {
    state.libraryQuery = event.target.value.trim();
    const grid = $('#libraryGrid');
    if (grid) grid.innerHTML = renderLibraryCards(filteredTemplates());
  }
  if (event.target.id === 'workSearch') {
    state.workQuery = event.target.value.trim();
    $$('[data-work]').forEach((card) => {
      const work = findWork(card.dataset.work);
      card.hidden = Boolean(state.workQuery) && !work?.name.includes(state.workQuery);
    });
  }
  if (event.target.dataset.bpm) {
    const value = SY.formatBpm(event.target.value);
    if (event.target.dataset.bpm === 'min') state.bpmMin = Math.min(value, state.bpmMax);
    else state.bpmMax = Math.max(value, state.bpmMin);
    const grid = $('#libraryGrid');
    if (grid) grid.innerHTML = renderLibraryCards(filteredTemplates());
  }
  if (['artistInput', 'albumInput', 'copyrightInput'].includes(event.target.id)) saveMetaFromInputs();
  if (event.target.id === 'materialTitles' || event.target.id === 'materialIntro') {
    const workId = $('.drawer .btn.primary')?.dataset?.exportWork?.split(':')[0];
    const work = findWork(workId);
    if (!work) return;
    const platform = state.materialPlatform[work.id] || 'qishui';
    const base = work.materials?.[platform] || SY.buildMaterials(work, platform);
    work.materials = work.materials || {};
    work.materials[platform] = {
      ...base,
      titles: event.target.id === 'materialTitles' ? event.target.value.split('\n').map((item) => item.trim()).filter(Boolean).slice(0, 3) : base.titles,
      intro: event.target.id === 'materialIntro' ? event.target.value.slice(0, 100) : base.intro
    };
    persist();
  }
});
document.addEventListener('change', (event) => {
  if (event.target.id === 'poetrySource') state.poetry.source = event.target.value;
  if (event.target.id === 'poetryStyle' && SY.DICT.styles.includes(event.target.value)) state.poetry.style = event.target.value;
  if (event.target.id === 'poetryCount') state.poetry.count = Number(event.target.value);
  if (event.target.id === 'metaPick') { state.metadataTemplateId = event.target.value; rerender(); }
  if (event.target.matches('[data-clean-item]')) {
    remember();
    state.clean.items[event.target.dataset.cleanItem] = event.target.checked;
    toast('清洗规则已同步', cleanLine());
    rerender();
  }
  if (event.target.matches('[data-clean-layer]')) {
    remember();
    state.clean = SY.setLayer(state.clean, event.target.dataset.cleanLayer, event.target.checked);
    toast('清洗规则已同步', cleanLine());
    rerender();
  }
  if (event.target.matches('[data-remix-option]')) {
    const key = event.target.dataset.remixOption;
    if (key === 'clean') state.clean.applyOnExport = event.target.checked;
    else state.remixOptions[key] = event.target.checked;
    toast(key === 'clean' ? '导出清洗开关已同步' : '处理选项已更新', key === 'clean' ? cleanLine() : '只影响之后的新任务');
    persist();
    if (key === 'clean') rerender();
  }
  if (event.target.id === 'remoteMode') {
    state.remoteMode = event.target.value === 'risk' ? 'risk' : 'manual';
    toast('执行模式已更新', '正在跑的任务不受影响，指令端也不能改这个开关');
    renderChrome();
    persist();
  }
  if (event.target.id === 'agentToggle') {
    state.agentConnected = event.target.checked;
    toast(state.agentConnected ? '连接已打开' : '连接已关闭', '仍然不会监听入站端口');
    renderChrome();
    persist();
  }
  if (event.target.matches('[data-whitelist]')) {
    state.whitelist[event.target.dataset.whitelist] = event.target.checked;
    toast('白名单已更新', event.target.checked ? '这条指令可以接收' : '这条指令会被拦截');
    persist();
  }
  if (event.target.matches('[data-filter-style]')) {
    const style = event.target.dataset.filterStyle;
    state.libraryStyles = event.target.checked ? state.libraryStyles.concat(style) : state.libraryStyles.filter((item) => item !== style);
    rerender();
  }
  if (event.target.matches('[data-filter-license]')) {
    const license = event.target.dataset.filterLicense;
    state.libraryLicenses = event.target.checked ? state.libraryLicenses.concat(license) : state.libraryLicenses.filter((item) => item !== license);
    rerender();
  }
  if (event.target.id === 'libraryKey') { state.libraryKey = event.target.value; rerender(); }
  if (event.target.id === 'workStatus') { state.workStatus = event.target.value === '全部' ? '全部' : event.target.value; rerender(); }
  if (event.target.id === 'workStyle') { state.workStyle = SY.DICT.styles.includes(event.target.value) ? event.target.value : '全部'; rerender(); }
  if (event.target.id === 'workLicense') { state.workLicense = SY.DICT.licenses.includes(event.target.value) ? event.target.value : '全部'; rerender(); }
  if (event.target.id === 'defaultFormat') state.defaultFormat = event.target.value;
  if (event.target.id === 'defaultLufs') state.defaultLufs = Number(event.target.value);
  if (event.target.matches('[data-pick-work]')) {
    const id = event.target.dataset.pickWork;
    state.selectedWorkIds = event.target.checked ? state.selectedWorkIds.concat(id) : state.selectedWorkIds.filter((item) => item !== id);
    rerender();
  }
  if (event.target.matches('[data-work-status]')) {
    const work = findWork(event.target.dataset.workStatus);
    if (!work) return;
    work.status = event.target.value;
    work.updated = `今天 ${nowTime()}`;
    audit('local', '更新作品状态', `${work.name} · ${work.status}`, '已完成');
    toast('已自动保存', work.name);
  }
  persist();
});

$('#filePicker').addEventListener('change', (event) => {
  handleFiles(event.target.files);
  event.target.value = '';
});
$('#themeToggle').addEventListener('click', () => { setTheme(state.theme === 'light' ? 'dark' : 'light'); if (state.page === 'settings') rerender(); });
$('#taskPanelToggle').addEventListener('click', () => $('#taskPanel').classList.toggle('minimized'));
$('#overlay').addEventListener('click', () => { closeModal(); closeDrawer(); });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { closeModal(); closeDrawer(); }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) { event.preventDefault(); undo(); }
  if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'))) { event.preventDefault(); redo(); }
});

window.Shengyu = {
  snapshot() {
    return {
      page: state.page,
      theme: state.theme,
      mode: state.remoteMode,
      connected: state.agentConnected,
      clean: SY.cleanSummary(state.clean),
      applyOnExport: state.clean.applyOnExport,
      works: state.works.map((work) => ({ name: work.name, license: work.license, versions: work.versions.map((version) => version.name) })),
      payload: state.lastPayload,
      pending: state.pending.length,
      styles: SY.DICT.styles.slice(),
      keyCount: SY.DICT.keys.length,
      fileWritten: false
    };
  },
  blockProbe() { return issueCommand('读取文件', { path: 'C:\\Users\\me\\secret.wav', lyric: '不应出现' }); }
};

setTheme(state.theme);
renderChrome();
renderTasks();
setPage(state.page, { silent: true });
