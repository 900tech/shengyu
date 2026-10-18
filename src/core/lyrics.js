(function (root, factory) {
  const dict = (typeof module === 'object' && module.exports) ? require('./dictionary') : root.SY;
  const api = factory(dict);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SY = Object.assign(root.SY || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (dict) {
  const BANKS = {
    唐诗意象精选: ['月', '江', '舟', '城', '霜', '关', '雁', '灯', '山', '鼓'],
    宋词婉约意象: ['雨', '桥', '袖', '楼', '烟', '帘', '梦', '花', '岸', '笛'],
    边塞与山河主题: ['关', '沙', '马', '风', '河', '戍', '角', '原', '雪', '营']
  };
  const TAILS = {
    国风DJ: '鼓点把旧句推到副歌前面。',
    车载弹跳: '低音沿着夜路一拍一拍往前送。',
    卡点硬鼓: '重拍落下，词停在最亮的那一下。',
    慢摇Remix: '句子拉长，人声仍留在第二段。',
    国风电子: '弦音切开节拍，城灯跟着亮起来。'
  };

  function bankFor(source) {
    return BANKS[source] || BANKS['唐诗意象精选'];
  }

  function rewriteLyric(options = {}) {
    const seed = String(options.seed || '月色落入杯中').replace(/\s+/g, '').slice(0, 40);
    const density = Math.max(20, Math.min(90, Number(options.density) || 60));
    const style = dict.assertStyle(options.style) || '国风DJ';
    const images = bankFor(options.source);
    const keep = Math.max(2, Math.round(seed.length * (100 - density) / 100));
    const head = seed.slice(0, keep) || images[0];
    const picked = [];
    for (let i = 0; i < 4; i += 1) picked.push(images[(seed.length + i * 3) % images.length]);
    const lineA = `${head}${picked[0]}色${picked[1]}声，${picked[2]}影停在拍上。`;
    const lineB = `${picked[3]}未散，${TAILS[style]}`;
    const text = `${lineA}\n${lineB}`.slice(0, 180);
    const title = String(options.title || head || '仿写').slice(0, 12);
    return {
      title,
      text,
      style,
      density,
      source: options.source || '唐诗意象精选',
      method: 'local-dictionary'
    };
  }

  return { rewriteLyric };
});
