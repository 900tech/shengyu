const test = require('node:test');
const assert = require('node:assert/strict');
const lyrics = require('../src/core/lyrics');
const library = require('../src/core/library');

test('歌词仿写在本地词典上产出可导出文本', () => {
  const draft = lyrics.rewriteLyric({
    seed: '山色落入杯中月',
    density: 70,
    style: '国风DJ',
    source: '唐诗意象精选',
    title: '杯中月'
  });
  assert.equal(draft.method, 'local-dictionary');
  assert.equal(draft.style, '国风DJ');
  assert.ok(draft.text.length > 8);
  assert.ok(!draft.text.includes('http'));
  const overlap = library.overlapRatio(draft.text, '完全另一句公路灯火');
  assert.ok(overlap < 1);
});
