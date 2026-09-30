import test from 'node:test';
import assert from 'node:assert/strict';
import { DesertGroove, PRAIRIE_BPM, SARDINIA_BPM, ALGER_BPM, JAPAN_BPM } from '../src/games/arcadeAudio.js';

test('prairie selects its own soundtrack and resets the phrase', () => {
  const audio = new DesertGroove();
  audio.step = 83;
  audio.setStage('prairie');
  assert.equal(audio.step, 0);
  let prairie = 0, western = 0, sardinia = 0, alger = 0, japan = 0;
  audio.playPrairie = () => prairie++;
  audio.playWestern = () => western++;
  audio.playSardinia = () => sardinia++;
  audio.playAlger = () => alger++;
  audio.playJapan = () => japan++;
  audio.playStep(0, 0);
  assert.equal(prairie, 1);
  assert.equal(western, 0);
  audio.setStage('western');
  audio.playStep(0, 0);
  assert.equal(western, 1);
  audio.setStage('sardinia');
  audio.playStep(0, 0);
  assert.equal(sardinia, 1);
  audio.setStage('alger');
  audio.playStep(0, 0);
  assert.equal(alger, 1);
  audio.setStage('japan');
  audio.playStep(0, 0);
  assert.equal(japan, 1);
});

test('japan samurai score schedules finite, positive notes at its own tempo', () => {
  const audio = new DesertGroove();
  audio.setStage('japan');
  const stepLength = 60 / JAPAN_BPM / 4;
  assert.ok(stepLength > 0);
  const notes = [];
  audio.noise = () => {};
  audio.tone = (frequency, time, duration, type, volume) => {
    assert.ok(Number.isFinite(frequency) && frequency > 0);
    assert.ok(Number.isFinite(time) && time >= 0);
    assert.ok(duration > 0 && volume > 0);
    notes.push(frequency);
  };
  for (let bar = 0; bar < 16; bar++) {
    for (let step = 0; step < 16; step++) {
      audio.step = bar * 16 + step;
      audio.playJapan(step, audio.step * stepLength);
    }
  }
  assert.ok(notes.length > 40, 'the shamisen, shakuhachi and taiko motif produces plenty of notes');
});

test('sardinia mafia-style score schedules finite, positive notes at its own tempo', () => {
  const audio = new DesertGroove();
  audio.setStage('sardinia');
  const stepLength = 60 / SARDINIA_BPM / 4;
  assert.ok(stepLength > 0);
  const notes = [];
  audio.noise = () => {};
  audio.tone = (frequency, time, duration, type, volume) => {
    assert.ok(Number.isFinite(frequency) && frequency > 0);
    assert.ok(Number.isFinite(time) && time >= 0);
    assert.ok(duration > 0 && volume > 0);
    notes.push(frequency);
  };
  for (let bar = 0; bar < 8; bar++) {
    for (let step = 0; step < 16; step++) {
      audio.step = bar * 16 + step;
      audio.playSardinia(step, audio.step * stepLength);
    }
  }
  assert.ok(notes.length > 20, 'the mandolin and accordion motif produces plenty of notes');
});

test('sixteen-bar prairie score schedules finite, positive notes and varies phrases', () => {
  const audio = new DesertGroove();
  const bars = [];
  audio.noise = () => {};
  for (let bar = 0; bar < 16; bar++) {
    const notes = [];
    audio.tone = (frequency, time, duration, type, volume) => {
      assert.ok(Number.isFinite(frequency) && frequency > 0);
      assert.ok(Number.isFinite(time) && time >= 0);
      assert.ok(duration > 0 && volume > 0 && volume <= 0.2);
      notes.push(frequency);
    };
    for (let step = 0; step < 16; step++) {
      audio.step = bar * 16 + step;
      audio.playPrairie(step, audio.step * 60 / PRAIRIE_BPM / 4);
    }
    bars.push(JSON.stringify(notes));
  }
  assert.ok(new Set(bars).size >= 12);
  assert.notEqual(bars[0], bars[8], "refrain adds instrumentation");
});

test('alger chaabi score schedules finite, positive notes at its own tempo', () => {
  const audio = new DesertGroove();
  audio.setStage('alger');
  const stepLength = 60 / ALGER_BPM / 4;
  assert.ok(stepLength > 0);
  assert.notEqual(ALGER_BPM, PRAIRIE_BPM);
  assert.notEqual(ALGER_BPM, SARDINIA_BPM);
  const bars = [];
  audio.noise = () => {};
  for (let bar = 0; bar < 16; bar++) {
    const notes = [];
    audio.tone = (frequency, time, duration, type, volume) => {
      assert.ok(Number.isFinite(frequency) && frequency > 0);
      assert.ok(Number.isFinite(time) && time >= 0);
      assert.ok(duration > 0 && volume > 0 && volume <= 0.25);
      notes.push(frequency);
    };
    for (let step = 0; step < 16; step++) {
      audio.step = bar * 16 + step;
      audio.playAlger(step, audio.step * stepLength);
    }
    bars.push(JSON.stringify(notes));
  }
  assert.ok(bars[0].length > 20, 'la darbuka, l’oud et le violon produisent un motif nourri');
  assert.notEqual(bars[0], bars[8], 'le refrain épaissit l’instrumentation');
  assert.ok(new Set(bars).size >= 6, 'les huit mesures varient');
  // Le motif du refrain monte vers l’aigu (maqam Hijaz), il ne s’aplatit pas.
  const firstHalf = JSON.parse(bars[0]);
  const secondHalf = JSON.parse(bars[8]);
  assert.ok(Math.max(...secondHalf) > Math.max(...firstHalf));
});

test('cowboy cry respects mute, loading, overlap, cooldown and stops without resuming later', () => {
  const audio = new DesertGroove();
  const sources = [];
  const ducking = [];
  const gainParam = { cancelScheduledValues: () => {}, setValueAtTime: v => ducking.push(v), linearRampToValueAtTime: v => ducking.push(v) };
  audio.context = {
    state: 'running', currentTime: 10, destination: {},
    suspend() { this.state = 'suspended'; },
    createBufferSource: () => {
      const source = { connect() {}, disconnect() {}, start() { this.started = true; }, stop() { this.stopped = true; this.onended?.(); } };
      sources.push(source);
      return source;
    },
    createGain: () => ({ gain: { value: 0 }, connect() {}, disconnect() {} }),
  };
  audio.master = { gain: gainParam };
  audio.cheer();
  assert.equal(sources.length, 0, 'muted');
  audio.running = true;
  audio.cheer();
  assert.equal(sources.length, 0, 'not loaded');
  audio.cryBuffer = { duration: 1.96 };
  audio.cheer();
  assert.equal(sources.length, 1);
  assert.equal(sources[0].started, true);
  assert.ok(ducking.includes(0.07), 'music ducks under voice');
  audio.cheer();
  assert.equal(sources.length, 1, 'no overlap');
  sources[0].onended();
  audio.context.currentTime = 11;
  audio.cheer();
  assert.equal(sources.length, 1, 'cooldown');
  audio.context.currentTime = 15;
  audio.cheer();
  assert.equal(sources.length, 2);
  audio.stop();
  assert.equal(sources[1].stopped, true);
  assert.equal(audio.crySource, null);
  assert.equal(ducking.at(-1), 0.17, 'normal music level restored');
  audio.cheer();
  assert.equal(sources.length, 2, 'no cry while stopped');
  audio.setStage('prairie');
  assert.equal(audio.lastCry, -Infinity, 'new race resets cooldown');
});

test('a pending start cannot reactivate sound after stop', async () => {
  const audio = new DesertGroove();
  let resumed;
  audio.context = { state: 'suspended', resume: () => new Promise(resolve => { resumed = resolve; }) };
  const originalWindow = globalThis.window;
  globalThis.window = { AudioContext: function () {} };
  try {
    const start = audio.start();
    audio.stop();
    resumed();
    await start;
    assert.equal(audio.running, false);
    assert.equal(audio.timer, null);
  } finally { globalThis.window = originalWindow; }
});

test('voice load failure stays silent and does not interrupt the game', async () => {
  const originalFetch = globalThis.fetch;
  const audio = new DesertGroove();
  audio.context = {};
  globalThis.fetch = async () => { throw new Error('Offline'); };
  try {
    await audio.loadCry();
    assert.equal(audio.cryBuffer, null);
    assert.equal(audio.cryLoading, null);
  } finally { globalThis.fetch = originalFetch; }
});

test('game uses the unmodified user-uploaded MP3 rather than the generated voice', async () => {
  const { readFile } = await import('node:fs/promises');
  const { createHash } = await import('node:crypto');
  const data = await readFile(new URL('../src/games/assets/cowboy-hey-haa.mp3', import.meta.url));
  const hash = createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
  assert.equal(hash, '5490bc87ec38e0d5e651260f2ad280f40025cdac');
  const audioModule = await readFile(new URL('../src/games/arcadeAudio.js', import.meta.url), 'utf8');
  assert.ok(audioModule.includes("new URL('./assets/cowboy-hey-haa.mp3', import.meta.url)"));
  assert.ok(!audioModule.includes('cowboy-hey-haa.wav'));
});

test('power-up sound effects (lassoThrow, speedBoost, shieldGravity) schedule tones and sweeps when running', () => {
  const audio = new DesertGroove();
  let tones = 0;
  let noises = 0;
  let oscillators = 0;
  audio.tone = (frequency, time, duration, type, volume) => {
    assert.ok(frequency > 0 && duration > 0 && volume > 0);
    tones += 1;
  };
  audio.noise = (time, duration, volume) => {
    assert.ok(duration > 0 && volume > 0);
    noises += 1;
  };
  audio.context = {
    currentTime: 5,
    createOscillator: () => {
      oscillators += 1;
      return {
        type: 'sine',
        frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {},
        start() {},
        stop() {},
      };
    },
    createGain: () => ({
      gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {},
    }),
    createBiquadFilter: () => ({
      type: 'lowpass',
      frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {},
    }),
  };
  audio.master = {};

  // Muted / not running: nothing scheduled
  audio.lassoThrow();
  audio.speedBoost();
  audio.shieldGravity();
  audio.mudSplash();
  assert.equal(tones + noises + oscillators, 0);

  audio.running = true;
  audio.lassoThrow();
  assert.ok(tones >= 2 && noises >= 3 && oscillators >= 2, 'lassoThrow schedules rope whooshes and whip snap');

  const prevTones = tones;
  const prevOsc = oscillators;
  audio.speedBoost();
  assert.ok(tones > prevTones && oscillators > prevOsc, 'speedBoost schedules turbine sweep and turbo arpeggio');

  const prevTones2 = tones;
  const prevOsc2 = oscillators;
  audio.shieldGravity();
  assert.ok(tones > prevTones2 && oscillators >= prevOsc2 + 2, 'shieldGravity schedules gravity pitch warp and harmonics');

  const prevTones3 = tones;
  const prevNoises3 = noises;
  audio.mudSplash();
  assert.ok(tones >= prevTones3 + 4 && noises >= prevNoises3 + 2, 'mudSplash schedules squelchy noise bursts and descending tones');
});

