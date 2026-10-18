const test = require('node:test');
const assert = require('node:assert/strict');
const dict = require('../src/core/dictionary');
const audio = require('../src/core/audio');

test('合成结果是可解码、非静音的 WAV', () => {
  const rendered = audio.renderTrack({ bpm: 132, key: 'D 小调', style: '国风DJ', seconds: 1, sampleRate: 8000 });
  assert.equal(String.fromCharCode(...rendered.wav.slice(0, 4)), 'RIFF');
  assert.ok(rendered.wav.length > 44);
  const decoded = audio.decodeWav(rendered.wav);
  assert.equal(decoded.sampleRate, 8000);
  let peak = 0;
  for (let i = 0; i < decoded.samples.length; i += 8) peak = Math.max(peak, Math.abs(decoded.samples[i]));
  assert.ok(peak > 0.05);
  assert.equal(audio.wavExtraChunks(rendered.wav).length, 0);
});

test('清洗会丢掉额外块，并保留可播放波形', () => {
  const rendered = audio.renderTrack({ bpm: 120, key: 'C 大调', style: '慢摇Remix', seconds: 0.5, sampleRate: 8000, clean: false });
  const dirty = audio.appendChunk(rendered.wav, 'LIST', new Uint8Array([1, 2, 3, 4]));
  assert.ok(audio.wavExtraChunks(dirty).includes('LIST'));
  const cleaned = audio.cleanWav(dirty, { watermark: true });
  assert.equal(audio.wavExtraChunks(cleaned).length, 0);
  const decoded = audio.decodeWav(cleaned);
  assert.ok(decoded.samples.length > 100);
});

test('节拍脉冲的 BPM 落在误差附近，调性来自字典', () => {
  const track = audio.clickTrack(132, 8000, 8);
  const result = audio.analyzePcm(track.samples, track.sampleRate);
  assert.equal(result.engine, 'local');
  assert.ok(Math.abs(result.bpm - 132) <= 2, `BPM ${result.bpm}`);
  assert.equal(dict.assertKey(result.key), result.key);
});
