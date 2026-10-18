(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SY = Object.assign(root.SY || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const COMMAND_DEFS = Object.freeze([
    { name: '查状态', risk: 'low', summary: '查看本地任务与连接状态' },
    { name: '批量Demo', risk: 'high', summary: '按当前创作参数生成 Demo' },
    { name: 'Remix', risk: 'high', summary: '按已选模板生成本地 Remix 方案' },
    { name: '清洗', risk: 'high', summary: '按全局清洗规则生成清洗方案' },
    { name: '模板迭代', risk: 'high', summary: '为模板记录一个新的参数版本' },
    { name: '导出', risk: 'high', summary: '按导出预设生成导出方案' },
    { name: '暂停', risk: 'low', summary: '暂停正在排队的本地任务' },
    { name: '终止', risk: 'low', summary: '终止正在排队的本地任务' },
    { name: '健康检查', risk: 'low', summary: '检查本机界面与白名单' }
  ]);

  const ERRORS = Object.freeze({
    format: { title: '无法读取这个文件', detail: '请改用 MP3、WAV、FLAC 或 M4A。文件只在本机读取。' },
    whitelist: { title: '指令已拦截', detail: '这条指令不在授权范围内。请只使用预设的标准指令。' },
    copyright: { title: '导出已被拦住', detail: '当前模板标记为不可商用。请更换模板，或确认你已经了解版权风险后再继续。' },
    missingLicense: { title: '还不能导出', detail: '有模板还没有版权标注。请先在模板库补全。' },
    noTemplate: { title: '还没有选择模板', detail: '请至少选择一个伴奏模板，再生成版本。' },
    engine: { title: '已保存处理方案', detail: '当前版本不会改写或导出音频文件。接入本地音频引擎后，会按同一套配置执行。' },
    empty: { title: '没有可处理的内容', detail: '请先在本机选择作品或音频，再继续。' },
    offline: { title: '连接已关闭', detail: '请在本机设置里重新打开连接。指令端不能修改这个开关。' },
    generic: { title: '这一步没有完成', detail: '请重试。如果仍然不行，可以在设置里查看本机操作记录。' }
  });

  function pathRe() {
    return /[A-Za-z]:\\[^\s'"]+|\/(?:home|Users|tmp|var|opt|workspace)\/[^\s'"]+/g;
  }

  function scrub(value) {
    return String(value == null ? '' : value)
      .replace(pathRe(), '[路径已隐藏]')
      .replace(/[A-Za-z0-9+/]{48,}={0,2}/g, '[内容已隐藏]')
      .slice(0, 180);
  }

  function sanitizeError(code) {
    return ERRORS[code] || ERRORS.generic;
  }

  function sanitizeParams(input) {
    const out = {};
    if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
    Object.entries(input).forEach(([key, value]) => {
      if (!/^[\u4e00-\u9fa5A-Za-z0-9_]{1,24}$/.test(key)) return;
      if (/path|file|lyric|audio|buffer|base64|cover|blob|template/i.test(key)) return;
      if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
      else if (typeof value === 'boolean') out[key] = value;
      else if (typeof value === 'string') {
        const text = scrub(value).trim();
        if (!text || text.includes('[路径已隐藏]') || text.includes('[内容已隐藏]')) return;
        out[key] = text.slice(0, 80);
      }
    });
    return out;
  }

  function buildStatusPayload({ command, progress, state, message }) {
    const payload = {
      kind: 'status',
      command: scrub(command).slice(0, 24),
      progress: Math.max(0, Math.min(100, Math.round(Number(progress) || 0))),
      state: ['queued', 'running', 'done', 'error', 'blocked'].includes(state) ? state : 'error',
      message: scrub(message).slice(0, 120)
    };
    const blob = JSON.stringify(payload);
    if (pathRe().test(blob) || /data:audio|base64,/i.test(blob)) {
      return { kind: 'status', command: payload.command, progress: 0, state: 'error', message: '状态已省略' };
    }
    return payload;
  }

  function evaluateCommand(name, params, context) {
    const whitelist = (context && context.whitelist) || {};
    const mode = context && context.mode === 'risk' ? 'risk' : 'manual';
    const def = COMMAND_DEFS.find((item) => item.name === name);
    if (!def || whitelist[name] !== true) {
      return {
        ok: false,
        error: 'whitelist',
        payload: buildStatusPayload({ command: name, progress: 0, state: 'blocked', message: '指令不在授权范围内' })
      };
    }
    return {
      ok: true,
      def,
      params: sanitizeParams(params),
      needsConfirm: mode !== 'risk' || def.risk === 'high',
      risk: def.risk,
      payload: buildStatusPayload({ command: name, progress: 0, state: 'queued', message: '已接收纯文本指令' })
    };
  }

  function createAuditEntry({ source, action, detail, result, durationMs, at }) {
    return {
      id: Math.random().toString(36).slice(2, 9),
      at: at || new Date().toISOString(),
      source: source === 'remote' ? 'remote' : 'local',
      action: scrub(action).slice(0, 40),
      detail: scrub(detail).slice(0, 160),
      result: scrub(result).slice(0, 40),
      durationMs: Math.max(0, Math.round(Number(durationMs) || 0))
    };
  }

  function defaultWhitelist() {
    const map = {};
    COMMAND_DEFS.forEach((item) => { map[item.name] = true; });
    return map;
  }

  return {
    COMMAND_DEFS,
    ERRORS,
    scrub,
    sanitizeError,
    sanitizeParams,
    buildStatusPayload,
    evaluateCommand,
    createAuditEntry,
    defaultWhitelist
  };
});
