(function (root, factory) {
  const dict = (typeof module === 'object' && module.exports) ? require('./dictionary') : root.SY;
  const api = factory(dict);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SY = Object.assign(root.SY || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (dict) {
  const STYLE_PRESETS = Object.freeze({
    国风DJ: { bpm: 132.0, key: 'D 小调' },
    车载弹跳: { bpm: 136.0, key: 'G 小调' },
    卡点硬鼓: { bpm: 140.0, key: 'F# 小调' },
    慢摇Remix: { bpm: 118.0, key: 'C 小调' },
    国风电子: { bpm: 128.0, key: 'A 小调' }
  });

  const GENRE_RULES = [
    [/电子|舞曲|电音|edm|electronic|dance|house|techno|trance/i, '国风电子'],
    [/嘻哈|说唱|hip-?hop|rap|trap/i, '卡点硬鼓'],
    [/摇滚|rock|metal/i, '车载弹跳'],
    [/国风|中国风|民谣|folk|中国音乐|戏曲/i, '国风DJ'],
    [/流行|pop|k-pop|r&b|节奏布鲁斯|抒情|ballad/i, '慢摇Remix']
  ];

  function mapGenre(names) {
    const text = (Array.isArray(names) ? names : [names]).filter(Boolean).join(' ');
    if (!text || text === '音乐' || text === 'Music') return null;
    for (let i = 0; i < GENRE_RULES.length; i += 1) {
      if (GENRE_RULES[i][0].test(text)) return GENRE_RULES[i][1];
    }
    return null;
  }

  function cleanEntry(entry) {
    const genres = (entry.genres || []).map((item) => String(item).slice(0, 24)).filter((item) => item && item !== '音乐' && item !== 'Music').slice(0, 4);
    const style = dict.assertStyle(entry.style) || mapGenre(genres);
    return {
      source: String(entry.source || '公开榜单').slice(0, 40),
      rank: Math.max(1, Number(entry.rank) || 1),
      title: String(entry.title || '未命名').slice(0, 80),
      artist: String(entry.artist || '未知艺人').slice(0, 80),
      released: String(entry.released || '').slice(0, 20),
      genres,
      style,
      duration: Number.isFinite(Number(entry.duration)) ? Math.round(Number(entry.duration)) : null
    };
  }

  function parseApple(json) {
    const results = json?.feed?.results;
    if (!Array.isArray(results)) return [];
    return results.map((item, index) => cleanEntry({
      source: 'Apple Music 中国最常播放',
      rank: index + 1,
      title: item.name,
      artist: item.artistName,
      released: item.releaseDate,
      genres: (item.genres || []).map((genre) => genre.name)
    }));
  }

  function parseDeezer(json) {
    const list = json?.tracks?.data || json?.data;
    if (!Array.isArray(list)) return [];
    return list.map((item, index) => cleanEntry({
      source: 'Deezer 公开榜',
      rank: item.position || index + 1,
      title: item.title,
      artist: item.artist?.name,
      duration: item.duration,
      genres: item.album?.genres?.data?.map((genre) => genre.name) || []
    }));
  }

  function parseCustom(json) {
    if (json?.feed?.results) return parseApple(json).map((item) => ({ ...item, source: '自定义 HTTPS 榜单' }));
    if (json?.tracks?.data || (json?.data && json.data[0]?.title)) return parseDeezer(json).map((item) => ({ ...item, source: '自定义 HTTPS 榜单' }));
    const list = Array.isArray(json) ? json : json?.entries;
    if (!Array.isArray(list)) return [];
    return list.map((item, index) => cleanEntry({
      source: '自定义 HTTPS 榜单',
      rank: item.rank || index + 1,
      title: item.title || item.name,
      artist: item.artist || item.artistName,
      released: item.released || item.releaseDate,
      genres: item.genres || [],
      style: item.style,
      duration: item.duration
    }));
  }

  function filterByStyle(entries, style) {
    if (!style || style === '全部') return entries.slice();
    if (!dict.assertStyle(style)) return [];
    return entries.filter((item) => item.style === style);
  }

  function titleKeywords(entries) {
    const freq = new Map();
    entries.forEach((entry) => {
      const text = String(entry.title || '').replace(/\s/g, '');
      for (let i = 0; i < text.length - 1; i += 1) {
        const gram = text.slice(i, i + 2);
        if (!/^[\u4e00-\u9fa5]{2}$/.test(gram)) continue;
        freq.set(gram, (freq.get(gram) || 0) + 1);
      }
    });
    return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map((item) => item[0]);
  }

  function styleCounts(entries) {
    const counts = {};
    dict.DICT.styles.forEach((style) => { counts[style] = 0; });
    let unmapped = 0;
    entries.forEach((entry) => {
      if (entry.style && counts[entry.style] != null) counts[entry.style] += 1;
      else unmapped += 1;
    });
    return { counts, unmapped };
  }

  function summarize(entries, range) {
    const list = Array.isArray(entries) ? entries : [];
    const month = range === 'month';
    if (!list.length) {
      return {
        ok: false,
        fake: false,
        networked: false,
        range: month ? '月' : '周',
        message: '尚未抓到榜单。失败时不会用样例歌曲填空。',
        entries: [],
        keywords: [],
        counts: {},
        unmapped: 0,
        weights: { apple: 0.7, deezer: 0.3 }
      };
    }
    const grouped = styleCounts(list);
    return {
      ok: true,
      fake: false,
      networked: true,
      range: month ? '月' : '周',
      message: '',
      entries: list,
      keywords: titleKeywords(list),
      counts: grouped.counts,
      unmapped: grouped.unmapped,
      weights: { apple: 0.7, deezer: 0.3 }
    };
  }

  function presetFor(style) {
    return STYLE_PRESETS[dict.assertStyle(style) || '国风DJ'];
  }

  return {
    STYLE_PRESETS,
    mapGenre,
    parseApple,
    parseDeezer,
    parseCustom,
    filterByStyle,
    titleKeywords,
    styleCounts,
    summarize,
    presetFor
  };
});
