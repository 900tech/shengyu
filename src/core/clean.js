(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SY = Object.assign(root.SY || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const CLEAN_ITEMS = Object.freeze([
    { id: 'id3', layer: 'tags', label: 'ID3 全字段', detail: '标题、艺术家、专辑、作曲、作词、版权、备注' },
    { id: 'apic', layer: 'tags', label: '内嵌封面', detail: 'APIC、FLAC 与 iTunes 封面' },
    { id: 'uslt', layer: 'tags', label: '内嵌歌词', detail: 'USLT 与歌词块' },
    { id: 'wxxx', layer: 'tags', label: '内嵌链接', detail: 'WXXX 与来源网址' },
    { id: 'platform', layer: 'tags', label: '平台标识', detail: '第三方平台专属字段' },
    { id: 'wav-info', layer: 'tags', label: 'WAV INFO', detail: 'INFO 块全部字段' },
    { id: 'wav-bext', layer: 'tags', label: 'WAV bext', detail: '广播扩展块' },
    { id: 'encoder', layer: 'tags', label: '编码工具', detail: '编码器与软件标记' },
    { id: 'flac', layer: 'tags', label: 'FLAC 注释', detail: 'Vorbis 注释与流附加字段' },
    { id: 'm4a', layer: 'tags', label: 'M4A 标签', detail: 'iTunes 元数据、版权与来源' },
    { id: 'struct-edge', layer: 'structure', label: '头尾冗余', detail: '文件头尾多余数据块' },
    { id: 'struct-pad', layer: 'structure', label: '填充字节', detail: '对齐填充' },
    { id: 'struct-stego', layer: 'structure', label: '帧间隐写', detail: '检测帧间隙异常数据' },
    { id: 'struct-pack', layer: 'structure', label: '重新封装', detail: '消除编码器独有封装特征，需本地引擎' },
    { id: 'wm-detect', layer: 'acoustic', label: '水印检测', detail: '给出频谱提示与风险等级' },
    { id: 'wm-weaken', layer: 'acoustic', label: '水印弱化', detail: '仅记录方案，浏览器不改写音频' }
  ]);

  const LAYERS = Object.freeze([
    { id: 'tags', name: '标签层', sub: 'ID3 / INFO / Vorbis / iTunes' },
    { id: 'structure', name: '结构层', sub: '冗余块、隐写与封装指纹' },
    { id: 'acoustic', name: '声学层', sub: '检测优先，不在此版本改写音频' }
  ]);

  function createCleanConfig() {
    const items = {};
    CLEAN_ITEMS.forEach((item) => { items[item.id] = true; });
    return { items, applyOnExport: true };
  }

  function normalizeCleanConfig(input) {
    const base = createCleanConfig();
    if (!input || typeof input !== 'object' || !input.items) return base;
    CLEAN_ITEMS.forEach((item) => {
      if (typeof input.items[item.id] === 'boolean') base.items[item.id] = input.items[item.id];
    });
    if (typeof input.applyOnExport === 'boolean') base.applyOnExport = input.applyOnExport;
    return base;
  }

  function cleanSignature(config) {
    const safe = normalizeCleanConfig(config);
    return CLEAN_ITEMS.map((item) => (safe.items[item.id] ? '1' : '0')).join('');
  }

  function cleanSummary(config) {
    const safe = normalizeCleanConfig(config);
    const enabled = CLEAN_ITEMS.filter((item) => safe.items[item.id]);
    let hash = 0;
    const signature = cleanSignature(safe);
    for (const char of signature) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
    return {
      enabled: enabled.length,
      total: CLEAN_ITEMS.length,
      signature,
      fingerprint: hash.toString(16).slice(0, 4).toUpperCase().padStart(4, '0'),
      ids: enabled.map((item) => item.id)
    };
  }

  function setLayer(config, layer, value) {
    const next = normalizeCleanConfig(config);
    CLEAN_ITEMS.forEach((item) => {
      if (item.layer === layer) next.items[item.id] = Boolean(value);
    });
    return next;
  }

  return { CLEAN_ITEMS, LAYERS, createCleanConfig, normalizeCleanConfig, cleanSignature, cleanSummary, setLayer };
});
