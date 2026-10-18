(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SY = Object.assign(root.SY || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const PITCHES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const MODES = ['大调', '小调'];
  const STYLES = ['国风DJ', '车载弹跳', '卡点硬鼓', '慢摇Remix', '国风电子'];
  const LICENSES = ['自有版权', '商用授权', '不可商用'];
  const KEYS = PITCHES.flatMap((pitch) => MODES.map((mode) => `${pitch} ${mode}`));
  const BPM_TOLERANCE = 0.2;

  function formatBpm(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return Math.round(n * 10) / 10;
  }

  function formatBpmText(value) {
    const n = formatBpm(value);
    return n === null ? '—' : n.toFixed(1);
  }

  function bpmMatch(a, b, tolerance = BPM_TOLERANCE) {
    const x = formatBpm(a);
    const y = formatBpm(b);
    if (x === null || y === null) return false;
    return Math.abs(x - y) <= tolerance + 1e-9;
  }

  function assertKey(key) {
    return KEYS.includes(key) ? key : null;
  }

  function assertStyle(style) {
    return STYLES.includes(style) ? style : null;
  }

  function assertLicense(license) {
    return LICENSES.includes(license) ? license : null;
  }

  return {
    DICT: Object.freeze({
      pitches: PITCHES,
      modes: MODES,
      keys: KEYS,
      styles: STYLES,
      licenses: LICENSES,
      bpmTolerance: BPM_TOLERANCE,
      bpmDecimals: 1
    }),
    formatBpm,
    formatBpmText,
    bpmMatch,
    assertKey,
    assertStyle,
    assertLicense
  };
});
