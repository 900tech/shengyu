const test = require('node:test');
const assert = require('node:assert/strict');
const dict = require('../src/core/dictionary');
const clean = require('../src/core/clean');
const copyright = require('../src/core/copyright');
const safety = require('../src/core/safety');
const library = require('../src/core/library');

test('BPM 保留 1 位小数，误差 ±0.2 内视为匹配', () => {
  assert.equal(dict.formatBpm(132.04), 132);
  assert.equal(dict.formatBpmText(132.04), '132.0');
  assert.equal(dict.formatBpmText(132.05), '132.1');
  assert.equal(dict.bpmMatch(132, 132.2), true);
  assert.equal(dict.bpmMatch(132, 132.3), false);
  assert.equal(dict.DICT.bpmTolerance, 0.2);
  assert.equal(dict.DICT.bpmDecimals, 1);
});

test('调性与风格只来自同一份枚举', () => {
  assert.equal(dict.DICT.keys.length, 24);
  assert.deepEqual(dict.DICT.styles, ['国风DJ', '车载弹跳', '卡点硬鼓', '慢摇Remix', '国风电子']);
  assert.equal(dict.assertKey('D 小调'), 'D 小调');
  assert.equal(dict.assertKey('C小调'), null);
  assert.equal(dict.assertStyle('蒸汽波'), null);
  library.SEED_TEMPLATES.forEach((item) => {
    assert.equal(dict.assertStyle(item.style), item.style);
    assert.equal(dict.assertKey(item.key), item.key);
    assert.equal(dict.assertLicense(item.license), item.license);
    assert.equal(dict.formatBpmText(item.bpm).endsWith(item.bpm.toFixed(1).slice(-1)), true);
    assert.match(dict.formatBpmText(item.bpm), /^\d+\.\d$/);
  });
});

test('清洗配置是单一签名，三个入口读到同一结果', () => {
  const config = clean.createCleanConfig();
  const before = clean.cleanSignature(config);
  config.items.apic = false;
  config.items['wm-weaken'] = false;
  const summary = clean.cleanSummary(config);
  assert.equal(summary.enabled, clean.CLEAN_ITEMS.length - 2);
  assert.equal(summary.signature, clean.cleanSignature(config));
  assert.notEqual(summary.signature, before);
  const remixView = clean.cleanSummary(config);
  const batchView = clean.cleanSummary(config);
  assert.equal(remixView.fingerprint, batchView.fingerprint);
});

test('不可商用禁止一键导出，自有版权与商用授权放行', () => {
  assert.equal(copyright.exportDecision(['自有版权']).blocked, false);
  assert.equal(copyright.exportDecision(['商用授权']).oneClick, true);
  const blocked = copyright.exportDecision(['自有版权', '不可商用']);
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.worst, '不可商用');
  assert.equal(copyright.exportDecision(['未标注']).blocked, true);
});

test('白名单外指令拦截，回传载荷只有状态文本', () => {
  const whitelist = safety.defaultWhitelist();
  const blocked = safety.evaluateCommand('读取文件', { path: 'C:\\\\Users\\\\me\\\\secret.wav', lyric: '月色' }, { whitelist, mode: 'manual' });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.payload.state, 'blocked');
  assert.equal(Object.keys(blocked.payload).sort().join(), 'command,kind,message,progress,state');
  assert.doesNotMatch(JSON.stringify(blocked.payload), /Users|secret|月色|lyric|base64/);

  whitelist['健康检查'] = false;
  assert.equal(safety.evaluateCommand('健康检查', {}, { whitelist, mode: 'risk' }).ok, false);

  const enabled = safety.defaultWhitelist();
  const manual = safety.evaluateCommand('查状态', { scope: '概览' }, { whitelist: enabled, mode: 'manual' });
  const auto = safety.evaluateCommand('查状态', { scope: '概览' }, { whitelist: enabled, mode: 'risk' });
  const high = safety.evaluateCommand('导出', { preset: '汽水音乐完整版' }, { whitelist: enabled, mode: 'risk' });
  assert.equal(manual.needsConfirm, true);
  assert.equal(auto.needsConfirm, false);
  assert.equal(high.needsConfirm, true);
  assert.deepEqual(safety.sanitizeParams({ path: '/home/me/a.wav', lyric: '整段歌词', ok: '概览' }), { ok: '概览' });
});

test('脱敏文案不包含路径或原始异常', () => {
  const error = safety.sanitizeError('whitelist');
  assert.doesNotMatch(`${error.title}${error.detail}`, /Error|EACCES|\/home\/|C:\\/);
  const entry = safety.createAuditEntry({
    source: 'remote',
    action: '导出',
    detail: '失败 /home/me/Music/a.wav Error: ENOENT',
    result: '已拦截',
    durationMs: 12
  });
  assert.match(entry.detail, /路径已隐藏/);
  assert.doesNotMatch(entry.detail, /\/home\/me/);
});

test('新版本挂到同名原曲，而不是第一条作品', () => {
  const works = JSON.parse(JSON.stringify(library.SEED_WORKS));
  const version = {
    id: 'vx',
    name: library.versionDisplayName('长街灯火', '卡点版'),
    type: '卡点版',
    time: '今天 12:00',
    license: '不可商用',
    style: '卡点硬鼓',
    bpm: 140,
    key: 'F# 小调'
  };
  const { work, created } = library.attachVersion(works, '长街灯火', version);
  assert.equal(created, false);
  assert.equal(work.id, 'w2');
  assert.equal(work.versions[0].id, 'vx');
  assert.equal(work.license, '不可商用');
  assert.equal(works[0].name === '月下归舟' ? works.find((item) => item.name === '月下归舟').versions[0].id : '', works[0].name === '月下归舟' ? 'v13' : '');
  const fresh = library.attachVersion(works, '新歌试听', { ...version, id: 'vy', license: '自有版权', time: '今天 12:01' });
  assert.equal(fresh.created, true);
  assert.equal(works[0].name, '新歌试听');
});

test('导出方案与发行物料不写音频、不超简介长度', () => {
  const preset = library.EXPORT_PRESETS[0];
  const plan = library.buildExportPlan({
    preset,
    cleanConfig: clean.createCleanConfig(),
    metadata: { artist: '青屿', album: '独立作品集', copyright: '保留所有权利' },
    workName: '月下归舟'
  });
  assert.equal(plan.fileWritten, false);
  assert.equal(plan.cleanEnabled, clean.CLEAN_ITEMS.length);
  assert.equal('lyric' in plan, false);
  assert.equal('audio' in plan, false);
  const materials = library.buildMaterials(library.SEED_WORKS[0], 'qishui');
  assert.ok(materials.intro.length <= 100);
  assert.equal(materials.titles.length, 3);
  assert.ok(materials.tags.length >= 3 && materials.tags.length <= 5);
  const report = library.chartReport('week');
  assert.equal(report.networked, false);
  assert.equal(report.weights.qishui, 0.7);
  assert.equal(dict.assertKey(report.key), report.key);
});

test('重合度对相同歌词给出高分', () => {
  const lyric = '山色落入杯中月，鼓声惊起故人舟。';
  assert.ok(library.overlapRatio(lyric, lyric) > 0.9);
  assert.ok(library.overlapRatio(lyric, '公路尽头只剩灯火') < 0.4);
});

test('预检结果只落在字典内', () => {
  const result = library.stubAnalyze('night-road.wav', 240000);
  assert.equal(result.engine, 'stub');
  assert.match(dict.formatBpmText(result.bpm), /^\d+\.\d$/);
  assert.equal(dict.assertKey(result.key), result.key);
  assert.equal(dict.assertStyle(result.style), result.style);
});
