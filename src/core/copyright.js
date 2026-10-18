(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SY = Object.assign(root.SY || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function compliance(license) {
    if (license === '不可商用') {
      return { level: 'risk', label: '不可商用', oneClick: false, text: '不可商用。不能直接导出，需要你确认版权风险。' };
    }
    if (license === '商用授权') {
      return { level: 'ok', label: '商用授权', oneClick: true, text: '商用授权。可以按预设导出。' };
    }
    if (license === '自有版权') {
      return { level: 'ok', label: '自有版权', oneClick: true, text: '自有版权。可以按预设导出。' };
    }
    return { level: 'warn', label: '未标注', oneClick: false, text: '版权还没标注。请先在模板库补全。' };
  }

  function worstLicense(list) {
    const items = (list || []).filter(Boolean);
    if (!items.length || items.some((item) => !['自有版权', '商用授权', '不可商用'].includes(item))) return '未标注';
    if (items.includes('不可商用')) return '不可商用';
    if (items.includes('商用授权')) return '商用授权';
    return '自有版权';
  }

  function exportDecision(licenses) {
    const worst = worstLicense(licenses);
    const status = compliance(worst);
    return { ...status, worst, blocked: !status.oneClick, licenses: [...(licenses || [])] };
  }

  return { compliance, worstLicense, exportDecision };
});
