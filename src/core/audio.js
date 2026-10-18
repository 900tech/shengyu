(function (root, factory) {
  const dict = (typeof module === 'object' && module.exports) ? require('./dictionary') : root.SY;
  const api = factory(dict);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SY = Object.assign(root.SY || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (dict) {
  const PITCH_HZ = {
    C: 261.63, 'C#': 277.18, D: 293.66, 'D#': 311.13, E: 329.63, F: 349.23,
    'F#': 369.99, G: 392.0, 'G#': 415.3, A: 440.0, 'A#': 466.16, B: 493.88
  };
  const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  function bytesOf(input) {
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    throw new Error('audio-bytes');
  }

  function viewOf(bytes) {
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  function writeText(bytes, offset, text) {
    for (let i = 0; i < text.length; i += 1) bytes[offset + i] = text.charCodeAt(i);
  }

  function readText(bytes, offset, length) {
    let text = '';
    for (let i = 0; i < length; i += 1) text += String.fromCharCode(bytes[offset + i]);
    return text;
  }

  function pitchOf(key) {
    const name = String(key || '').split(' ')[0];
    return PITCH_HZ[name] || 293.66;
  }

  function clampSample(value) {
    if (value > 1) return 1;
    if (value < -1) return -1;
    return value;
  }

  function styleProfile(style) {
    if (style === '车载弹跳') return { kick: 0.9, hat: 0.22, bass: 0.42, lead: 0.18, air: 0.04 };
    if (style === '卡点硬鼓') return { kick: 1, hat: 0.34, bass: 0.28, lead: 0.1, air: 0.02 };
    if (style === '慢摇Remix') return { kick: 0.45, hat: 0.05, bass: 0.22, lead: 0.3, air: 0.12 };
    if (style === '国风电子') return { kick: 0.72, hat: 0.16, bass: 0.3, lead: 0.26, air: 0.14 };
    return { kick: 0.78, hat: 0.14, bass: 0.32, lead: 0.24, air: 0.1 };
  }

  function synthesize(options = {}) {
    const sampleRate = options.sampleRate || 22050;
    const seconds = Math.min(60, Math.max(0.4, Number(options.seconds) || 8));
    const bpm = dict.formatBpm(options.bpm) || 120;
    const key = dict.assertKey(options.key) || 'D 小调';
    const minor = key.endsWith('小调');
    const scale = minor ? [0, 3, 5, 7, 10, 12] : [0, 2, 4, 7, 9, 12];
    const root = pitchOf(key);
    const profile = styleProfile(options.style);
    const count = Math.floor(sampleRate * seconds);
    const samples = new Float32Array(count);
    const beat = sampleRate * (60 / bpm);
    for (let i = 0; i < count; i += 1) {
      const t = i / sampleRate;
      const beatPos = (i % beat) / beat;
      const beatIndex = Math.floor(i / beat);
      const degree = scale[beatIndex % scale.length];
      const hz = root * (2 ** (degree / 12));
      const env = Math.sin(Math.min(1, beatPos * (options.style === '慢摇Remix' ? 1.2 : 2.4)) * Math.PI);
      let sample = 0;
      if (beatPos < 0.09) {
        const k = beatPos / 0.09;
        sample += Math.sin(2 * Math.PI * (150 - 100 * k) * t) * (1 - k) * profile.kick;
      }
      if (profile.hat > 0.08 && beatIndex % 2 === 1 && beatPos < 0.025) {
        const noise = ((i * 17) % 100) / 100 - 0.5;
        sample += noise * profile.hat * (1 - beatPos / 0.025);
      }
      const bassGate = beatPos < 0.55 ? 1 : 0.35;
      sample += Math.sin(2 * Math.PI * (root / 2) * t) * profile.bass * bassGate;
      sample += Math.sin(2 * Math.PI * hz * t) * env * profile.lead;
      if (String(options.style || '').includes('国风')) {
        sample += Math.sin(2 * Math.PI * hz * 2 * t) * env * profile.air;
      }
      samples[i] = clampSample(sample * 0.46);
    }
    return { samples, sampleRate, duration: seconds, bpm, key, style: options.style || '国风DJ' };
  }

  function encodeWav(samples, sampleRate) {
    const count = samples.length;
    const dataSize = count * 2;
    const bytes = new Uint8Array(44 + dataSize);
    const view = new DataView(bytes.buffer);
    writeText(bytes, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeText(bytes, 8, 'WAVE');
    writeText(bytes, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeText(bytes, 36, 'data');
    view.setUint32(40, dataSize, true);
    for (let i = 0; i < count; i += 1) {
      view.setInt16(44 + i * 2, (clampSample(samples[i]) * 32767) | 0, true);
    }
    return bytes;
  }

  function isWav(input) {
    try {
      const bytes = bytesOf(input);
      return bytes.length > 44 && readText(bytes, 0, 4) === 'RIFF' && readText(bytes, 8, 4) === 'WAVE';
    } catch {
      return false;
    }
  }

  function decodeWav(input) {
    const bytes = bytesOf(input);
    if (!isWav(bytes)) return null;
    const view = viewOf(bytes);
    let offset = 12;
    let format = null;
    let data = null;
    const extras = [];
    while (offset + 8 <= bytes.length) {
      const id = readText(bytes, offset, 4);
      const size = view.getUint32(offset + 4, true);
      const start = offset + 8;
      if (start + size > bytes.length) break;
      if (id === 'fmt ') format = { start, size };
      else if (id === 'data') data = { start, size };
      else extras.push(id);
      offset = start + size + (size % 2);
    }
    if (!format || !data) return null;
    const channels = view.getUint16(format.start + 2, true);
    const sampleRate = view.getUint32(format.start + 4, true);
    const bits = view.getUint16(format.start + 14, true);
    if (bits !== 16 || channels < 1) return null;
    const frames = Math.floor(data.size / (2 * channels));
    const samples = new Float32Array(frames);
    for (let i = 0; i < frames; i += 1) {
      let mixed = 0;
      for (let channel = 0; channel < channels; channel += 1) {
        mixed += view.getInt16(data.start + (i * channels + channel) * 2, true) / 32768;
      }
      samples[i] = mixed / channels;
    }
    return { samples, sampleRate, extras };
  }

  function wavExtraChunks(input) {
    const decoded = decodeWav(input);
    return decoded ? decoded.extras : [];
  }

  function appendChunk(input, id, payload) {
    const bytes = bytesOf(input);
    const extra = bytesOf(payload);
    const size = extra.length + (extra.length % 2);
    const next = new Uint8Array(bytes.length + 8 + size);
    next.set(bytes, 0);
    writeText(next, bytes.length, String(id).slice(0, 4).padEnd(4, ' '));
    const view = new DataView(next.buffer);
    view.setUint32(bytes.length + 4, extra.length, true);
    next.set(extra, bytes.length + 8);
    view.setUint32(4, next.length - 8, true);
    return next;
  }

  function resample(samples, fromRate, toRate) {
    if (!samples.length || fromRate === toRate) return samples;
    const count = Math.max(1, Math.floor(samples.length * toRate / fromRate));
    const out = new Float32Array(count);
    const step = fromRate / toRate;
    for (let i = 0; i < count; i += 1) {
      const pos = i * step;
      const left = Math.floor(pos);
      const frac = pos - left;
      const a = samples[left] || 0;
      const b = samples[Math.min(samples.length - 1, left + 1)] || 0;
      out[i] = a * (1 - frac) + b * frac;
    }
    return out;
  }

  function mixSource(target, targetRate, source, options = {}) {
    if (!source?.samples?.length) return target;
    let incoming = source.samples;
    let rate = source.sampleRate || targetRate;
    if (options.sourceBpm && options.targetBpm && options.sourceBpm > 0) {
      rate *= options.targetBpm / options.sourceBpm;
    }
    if (options.watermark) rate *= 1.005;
    incoming = resample(incoming, rate, targetRate);
    const gain = options.vocal === false ? 0.28 : 0.62;
    const length = Math.min(target.length, incoming.length);
    for (let i = 0; i < length; i += 1) target[i] = clampSample(target[i] * 0.72 + incoming[i] * gain);
    return target;
  }

  function normalizePeak(samples, peak = 0.82) {
    let max = 0;
    for (let i = 0; i < samples.length; i += 1) max = Math.max(max, Math.abs(samples[i]));
    if (max < 0.0001) return samples;
    const gain = peak / max;
    for (let i = 0; i < samples.length; i += 1) samples[i] = clampSample(samples[i] * gain);
    return samples;
  }

  function cleanWav(input, options = {}) {
    const decoded = decodeWav(input);
    if (!decoded) return bytesOf(input);
    let samples = decoded.samples;
    if (options.watermark) samples = resample(samples, decoded.sampleRate, decoded.sampleRate / 1.005);
    if (options.loudness !== false) normalizePeak(samples, 0.8);
    return encodeWav(samples, decoded.sampleRate);
  }

  function downmixAudioBuffer(audioBuffer) {
    const rate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const channels = audioBuffer.numberOfChannels;
    const samples = new Float32Array(length);
    for (let channel = 0; channel < channels; channel += 1) {
      const data = audioBuffer.getChannelData(channel);
      for (let i = 0; i < length; i += 1) samples[i] += data[i] / channels;
    }
    return { samples, sampleRate: rate };
  }

  function goertzel(samples, sampleRate, freq) {
    const k = Math.round(freq * samples.length / sampleRate);
    const omega = (2 * Math.PI * k) / samples.length;
    const coeff = 2 * Math.cos(omega);
    let s0 = 0;
    let s1 = 0;
    let s2 = 0;
    for (let i = 0; i < samples.length; i += 1) {
      s0 = samples[i] + coeff * s1 - s2;
      s2 = s1;
      s1 = s0;
    }
    return s1 * s1 + s2 * s2 - coeff * s1 * s2;
  }

  function analyzePcm(samples, sampleRate) {
    const usable = samples.length > sampleRate * 12 ? samples.subarray(0, sampleRate * 12) : samples;
    const bpm = detectBpm(usable, sampleRate);
    const key = detectKey(usable, sampleRate);
    let peak = 0;
    for (let i = 0; i < Math.min(usable.length, sampleRate); i += 8) peak = Math.max(peak, Math.abs(usable[i]));
    return {
      bpm: dict.formatBpm(bpm) || 120,
      key: dict.assertKey(key) || 'C 大调',
      engine: 'local',
      audible: peak > 0.01
    };
  }

  function detectBpm(samples, sampleRate) {
    const hop = Math.max(1, Math.floor(sampleRate / 100));
    const flux = [];
    let prev = 0;
    for (let i = 0; i + hop < samples.length; i += hop) {
      let energy = 0;
      for (let j = 0; j < hop; j += 4) energy += samples[i + j] * samples[i + j];
      flux.push(Math.max(0, energy - prev));
      prev = energy;
    }
    const frame = hop / sampleRate;
    const minLag = Math.max(1, Math.round((60 / 180) / frame));
    const maxLag = Math.min(flux.length - 2, Math.round((60 / 70) / frame));
    let best = 0;
    let bestLag = minLag;
    for (let lag = minLag; lag <= maxLag; lag += 1) {
      let score = 0;
      for (let i = 0; i + lag < flux.length; i += 2) score += flux[i] * flux[i + lag];
      if (score > best) {
        best = score;
        bestLag = lag;
      }
    }
    const bpm = 60 / (bestLag * frame);
    return dict.formatBpm(bpm) || 120;
  }

  function detectKey(samples, sampleRate) {
    const slice = samples.length > sampleRate * 4 ? samples.subarray(0, sampleRate * 4) : samples;
    const chroma = new Array(12).fill(0);
    for (let note = 0; note < 12; note += 1) {
      const base = 130.81 * (2 ** (note / 12));
      for (let octave = 0; octave < 3; octave += 1) chroma[note] += goertzel(slice, sampleRate, base * (2 ** octave));
    }
    let best = -Infinity;
    let bestKey = 'C 大调';
    dict.DICT.keys.forEach((key) => {
      const pitch = dict.DICT.pitches.indexOf(key.split(' ')[0]);
      const profile = key.endsWith('小调') ? MINOR : MAJOR;
      let score = 0;
      for (let i = 0; i < 12; i += 1) score += chroma[(pitch + i) % 12] * profile[i];
      if (score > best) {
        best = score;
        bestKey = key;
      }
    });
    return bestKey;
  }

  function clickTrack(bpm, sampleRate, seconds) {
    const count = Math.floor(sampleRate * seconds);
    const samples = new Float32Array(count);
    const beat = sampleRate * (60 / bpm);
    for (let i = 0; i < count; i += 1) {
      const pos = i % beat;
      if (pos < sampleRate * 0.02) samples[i] = 1 - pos / (sampleRate * 0.02);
    }
    return { samples, sampleRate };
  }

  function renderTrack(options = {}) {
    const rendered = synthesize(options);
    if (options.source) {
      mixSource(rendered.samples, rendered.sampleRate, options.source, {
        sourceBpm: options.sourceBpm,
        targetBpm: rendered.bpm,
        vocal: options.vocal,
        watermark: options.watermark
      });
    } else if (options.watermark) {
      const shifted = resample(rendered.samples, rendered.sampleRate, rendered.sampleRate / 1.005);
      rendered.samples = shifted;
    }
    normalizePeak(rendered.samples, options.peak || 0.82);
    const wav = options.clean === false ? encodeWav(rendered.samples, rendered.sampleRate) : cleanWav(encodeWav(rendered.samples, rendered.sampleRate), { watermark: false, loudness: true });
    return { wav, duration: rendered.samples.length / rendered.sampleRate, sampleRate: rendered.sampleRate, bpm: rendered.bpm, key: rendered.key };
  }

  return {
    synthesize,
    encodeWav,
    decodeWav,
    isWav,
    wavExtraChunks,
    appendChunk,
    resample,
    mixSource,
    normalizePeak,
    cleanWav,
    downmixAudioBuffer,
    analyzePcm,
    clickTrack,
    renderTrack
  };
});
