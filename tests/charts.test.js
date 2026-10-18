const test = require('node:test');
const assert = require('node:assert/strict');
const charts = require('../src/core/charts');

test('Apple 与 Deezer 文本榜可以解析，且不保留音频地址', () => {
  const apple = charts.parseApple({
    feed: {
      results: [{
        name: '霓虹',
        artistName: '青屿',
        releaseDate: '2026-01-01',
        genres: [{ name: '音乐' }, { name: '电子' }],
        url: 'https://example.invalid/audio'
      }]
    }
  });
  assert.equal(apple[0].title, '霓虹');
  assert.equal(apple[0].style, '国风电子');
  assert.equal(apple[0].url, undefined);
  const deezer = charts.parseDeezer({
    data: [{ title: 'Night', artist: { name: 'Ada' }, duration: 180, position: 2, preview: 'https://example.invalid/a.mp3' }]
  });
  assert.equal(deezer[0].artist, 'Ada');
  assert.equal(deezer[0].duration, 180);
  assert.equal(deezer[0].preview, undefined);
  assert.equal(deezer[0].style, null);
});

test('风格筛选为空时不回填其他歌，空榜不是成功', () => {
  const entries = charts.parseApple({ feed: { results: [{ name: 'A', artistName: 'B', genres: [{ name: 'Pop' }] }] } });
  assert.equal(charts.filterByStyle(entries, '卡点硬鼓').length, 0);
  assert.equal(charts.filterByStyle(entries, '慢摇Remix').length, 1);
  const empty = charts.summarize([], 'week');
  assert.equal(empty.ok, false);
  assert.equal(empty.fake, false);
  assert.equal(empty.entries.length, 0);
});

test('自定义榜单只接收文本字段', () => {
  const custom = charts.parseCustom([{ title: '长安', artist: '青屿', style: '国风DJ', audio: 'secret' }]);
  assert.equal(custom[0].style, '国风DJ');
  assert.equal(custom[0].audio, undefined);
  assert.deepEqual(charts.presetFor('国风DJ'), { bpm: 132, key: 'D 小调' });
});
