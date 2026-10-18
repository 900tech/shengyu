(function (root, factory) {
  const dict = (typeof module === 'object' && module.exports) ? require('./dictionary') : root.SY;
  const clean = (typeof module === 'object' && module.exports) ? require('./clean') : root.SY;
  const api = factory(dict, clean);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SY = Object.assign(root.SY || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (dict, clean) {
  const TYPE_BY_STYLE = Object.freeze({
    '国风DJ': '国风DJ版',
    '车载弹跳': '车载版',
    '卡点硬鼓': '卡点版',
    '慢摇Remix': '慢摇版',
    '国风电子': '国风电子版'
  });

  const STRUCTURES = Object.freeze([
    { id: 'chorus-first', name: '副歌前置', desc: '前奏不超过 8 拍，副歌提前进入' },
    { id: 'hook-30', name: '30秒高潮', desc: '30 秒内进入高潮' },
    { id: 'short-drop', name: '短 Drop', desc: '8 拍 Build 后进入短 Drop' }
  ]);

  const EXPORT_PRESETS = Object.freeze([
    { id: 'qishui', name: '汽水音乐完整版', format: 'WAV', quality: '标准或无损', duration: '完整时长', lufs: -14, scene: '汽水音乐', builtin: true },
    { id: 'douyin', name: '抖音60秒卡点版', format: 'MP3', quality: '320 kbps', duration: '60 秒 · 副歌与 Drop', lufs: -14, scene: '抖音', builtin: true },
    { id: 'car', name: '车载无损版', format: 'FLAC', quality: '无损', duration: '完整时长 · 低频优化', lufs: -12, scene: '车载', builtin: true }
  ]);

  function versionDisplayName(original, typeLabel) {
    return `${String(original || '未命名作品').slice(0, 40)} · ${String(typeLabel || '新版本').slice(0, 20)}`;
  }

  function attachVersion(works, originalName, version) {
    const name = String(originalName || '未命名作品').slice(0, 40);
    let work = works.find((item) => item.name === name);
    let created = false;
    if (!work) {
      work = {
        id: `w${Math.random().toString(36).slice(2, 8)}`,
        name,
        style: version.style,
        bpm: version.bpm,
        key: version.key,
        status: '待发布',
        license: version.license || '自有版权',
        updated: version.time,
        lyric: version.lyric || '',
        versions: [],
        materials: {}
      };
      works.unshift(work);
      created = true;
    }
    work.versions.unshift(version);
    work.updated = version.time;
    if (version.bpm) work.bpm = version.bpm;
    if (version.key) work.key = version.key;
    if (version.style) work.style = version.style;
    if (version.license === '不可商用') work.license = '不可商用';
    if (version.lyric) work.lyric = version.lyric;
    return { work, created };
  }

  function overlapRatio(a, b) {
    const grams = (value) => {
      const text = String(value || '').replace(/\s/g, '');
      const set = new Set();
      for (let i = 0; i < text.length - 1; i += 1) set.add(text.slice(i, i + 2));
      return set;
    };
    const left = grams(a);
    const right = grams(b);
    if (!left.size || !right.size) return 0;
    let shared = 0;
    left.forEach((item) => { if (right.has(item)) shared += 1; });
    return shared / Math.min(left.size, right.size);
  }

  function stubAnalyze(name, size) {
    // TODO(engine): 替换为本地 BPM / 调性检测。当前只按文件名生成字典内的占位结果，不读取音频内容做识别。
    const seed = Array.from(String(name || '')).reduce((sum, char) => sum + char.charCodeAt(0), 0) + (Number(size) % 97);
    const bpm = dict.formatBpm(118 + (seed % 46) + ((seed % 10) / 10));
    return {
      bpm,
      key: dict.DICT.keys[seed % dict.DICT.keys.length],
      style: dict.DICT.styles[seed % dict.DICT.styles.length],
      engine: 'stub'
    };
  }

  function buildExportPlan({ preset, cleanConfig, metadata, workName, apply = true, fileWritten = false, fileName = '', byteLength = 0 }) {
    const summary = clean.cleanSummary(cleanConfig);
    const applied = apply !== false;
    const written = fileWritten === true && Number(byteLength) > 44;
    return {
      workName: String(workName || '').slice(0, 40),
      presetId: preset.id,
      presetName: preset.name,
      format: 'WAV',
      quality: preset.quality,
      duration: preset.duration,
      lufs: preset.lufs,
      scene: preset.scene,
      cleanApplied: applied,
      cleanSignature: summary.signature,
      cleanEnabled: applied ? summary.enabled : 0,
      cleanFingerprint: summary.fingerprint,
      metadata: {
        artist: String(metadata.artist || '').slice(0, 40),
        album: String(metadata.album || '').slice(0, 40),
        copyright: String(metadata.copyright || '').slice(0, 80)
      },
      fileWritten: written,
      fileName: written ? String(fileName || '').slice(0, 80) : '',
      byteLength: written ? Number(byteLength) : 0,
      note: written ? '音频已写入所选文件' : '尚未写入文件'
    };
  }

  function buildMaterials(work, platform) {
    const style = work.style || '国风DJ';
    const bpm = dict.formatBpmText(work.bpm);
    const qishui = platform !== 'netease';
    const titles = [
      work.name,
      `${work.name}（${style}）`,
      qishui ? `夜路｜${work.name}` : `${work.name} · 慢摇`
    ].map((item) => String(item).slice(0, 28));
    const tags = qishui
      ? ['国风DJ', '车载', '夜路', '东方电子', '推荐歌单'].slice(0, 5)
      : ['国风', '慢摇', '抒情', 'DJ', '华语'].slice(0, 5);
    const intro = `${work.name}，${bpm} BPM 的${style}。适合夜路与歌单推荐。`.slice(0, 100);
    return {
      platform: qishui ? '汽水音乐' : '网易云音乐',
      titles,
      tags,
      intro,
      publishAt: qishui ? '工作日 18:00–20:00' : '周五 20:00–22:00'
    };
  }

  function chartReport(range, entries) {
    const month = range === 'month';
    const list = Array.isArray(entries) ? entries : [];
    if (!list.length) {
      return {
        ok: false,
        fake: false,
        networked: false,
        range: month ? '月' : '周',
        message: '尚未抓到榜单。失败时不会用样例歌曲填空。',
        weights: { apple: 0.7, deezer: 0.3 },
        key: null,
        style: null,
        bpmPeak: null,
        keywords: []
      };
    }
    const style = list.find((item) => dict.assertStyle(item.style))?.style || null;
    return {
      ok: true,
      fake: false,
      networked: true,
      range: month ? '月' : '周',
      message: '',
      weights: { apple: 0.7, deezer: 0.3 },
      key: null,
      style,
      bpmPeak: null,
      keywords: []
    };
  }

  const SEED_TEMPLATES = [
    { id: 't1', kind: 'accompaniment', name: '山河劲鼓', style: '国风DJ', bpm: 132.0, key: 'D 小调', license: '自有版权', desc: '笛声引子 · 副歌前置 · 16 拍短 Drop', versions: ['v2 · 高潮前移', 'v1 · 初始导入'] },
    { id: 't2', kind: 'accompaniment', name: '长安夜行', style: '国风电子', bpm: 128.0, key: 'A 小调', license: '商用授权', desc: '琵琶切片 · 30 秒高潮 · 宽阔氛围', versions: ['v2 · 低频调整', 'v1 · 初始导入'] },
    { id: 't3', kind: 'accompaniment', name: '公路低频', style: '车载弹跳', bpm: 136.0, key: 'G 小调', license: '商用授权', desc: '弹性低频 · 简短前奏 · 车载响度', versions: ['v1 · 初始导入'] },
    { id: 't4', kind: 'accompaniment', name: '霜月硬鼓', style: '卡点硬鼓', bpm: 140.0, key: 'F# 小调', license: '不可商用', desc: '重拍卡点 · 8 拍 Build · 短 Drop', versions: ['v1 · 初始导入'] },
    { id: 't5', kind: 'accompaniment', name: '烟雨慢摇', style: '慢摇Remix', bpm: 118.0, key: 'C 小调', license: '自有版权', desc: '柔和鼓组 · 人声留白 · 长尾氛围', versions: ['v2 · 留白加长', 'v1 · 初始导入'] },
    { id: 't6', kind: 'accompaniment', name: '破阵国潮', style: '国风DJ', bpm: 134.0, key: 'E 小调', license: '商用授权', desc: '战鼓采样 · 副歌双叠', versions: ['v1 · 初始导入'] },
    { id: 'c1', kind: 'creation', name: '夜路副歌前置', style: '国风DJ', bpm: 132.0, key: 'D 小调', license: '自有版权', desc: '8 拍内进入副歌，适合直接套到创作中心', versions: ['v1 · 内置'] },
    { id: 'c2', kind: 'creation', name: '车载低频', style: '车载弹跳', bpm: 136.0, key: 'G 小调', license: '商用授权', desc: '低频靠前，适合完整时长导出', versions: ['v1 · 内置'] }
  ];

  const SEED_WORKS = [
    {
      id: 'w1', name: '月下归舟', style: '国风DJ', bpm: 132.0, key: 'D 小调', status: '待发布', license: '自有版权', updated: '今天 09:42',
      lyric: '山色落入杯中月，鼓声惊起故人舟。', materials: {},
      versions: [
        { id: 'v13', name: '月下归舟 · 清洗版', type: '清洗版', time: '今天 09:42', license: '自有版权', style: '国风DJ', bpm: 132.0, key: 'D 小调', snapshot: { summary: '132.0 BPM / D 小调 / 全局清洗', templateId: 't1', structureId: 'chorus-first', clean: true } },
        { id: 'v12', name: '月下归舟 · 国风DJ版', type: '国风DJ版', time: '今天 09:31', license: '自有版权', style: '国风DJ', bpm: 132.0, key: 'D 小调', snapshot: { summary: '山河劲鼓 / 副歌前置 / 自动混缩', templateId: 't1', structureId: 'chorus-first', clean: true } },
        { id: 'v11', name: '月下归舟 · 初稿Demo', type: '初稿Demo', time: '昨天 22:18', license: '自有版权', style: '国风DJ', bpm: 132.0, key: 'D 小调', lyric: '山色落入杯中月，鼓声惊起故人舟。', snapshot: { summary: '文言密度 68% / 热门匹配 92', templateId: null, clean: true } }
      ]
    },
    {
      id: 'w2', name: '长街灯火', style: '车载弹跳', bpm: 136.0, key: 'G 小调', status: '已发布', license: '商用授权', updated: '昨天 18:20',
      lyric: '灯火沿街铺开，低音把夜路托住。', materials: {},
      versions: [
        { id: 'v22', name: '长街灯火 · 车载版', type: '车载版', time: '昨天 18:20', license: '商用授权', style: '车载弹跳', bpm: 136.0, key: 'G 小调', snapshot: { summary: 'FLAC / -12 LUFS / 低频优化', templateId: 't3', structureId: 'hook-30', presetId: 'car', clean: true } },
        { id: 'v21', name: '长街灯火 · 润色版', type: '润色版', time: '昨天 17:54', license: '商用授权', style: '车载弹跳', bpm: 136.0, key: 'G 小调', snapshot: { summary: '公路低频 / 自动对齐 / 保留人声', templateId: 't3', structureId: 'short-drop', clean: true } }
      ]
    },
    {
      id: 'w3', name: '故园风', style: '慢摇Remix', bpm: 118.0, key: 'C 小调', status: '已上架', license: '自有版权', updated: '10月14日',
      lyric: '烟雨不问归程，拍落青石旧痕。', materials: {},
      versions: [
        { id: 'v31', name: '故园风 · 慢摇版', type: '慢摇版', time: '10月14日', license: '自有版权', style: '慢摇Remix', bpm: 118.0, key: 'C 小调', snapshot: { summary: '烟雨慢摇 / 标准响度', templateId: 't5', structureId: 'chorus-first', clean: true } }
      ]
    }
  ];

  return {
    TYPE_BY_STYLE,
    STRUCTURES,
    EXPORT_PRESETS,
    SEED_TEMPLATES,
    SEED_WORKS,
    versionDisplayName,
    attachVersion,
    overlapRatio,
    stubAnalyze,
    buildExportPlan,
    buildMaterials,
    chartReport
  };
});
