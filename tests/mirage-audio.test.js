import test from 'node:test';
import assert from 'node:assert/strict';
import { DesertGroove, PRAIRIE_BPM, SARDINIA_BPM, ALGER_BPM, JAPAN_BPM, RAMPARTS_BPM, INFINITY_BPM, AIRBASE_BPM, SNAKEWAY_BPM, cupFanfareScore } from '../src/games/arcadeAudio.js';

test('prairie selects its own soundtrack and resets the phrase', () => {
  const audio = new DesertGroove();
  audio.step = 83;
  audio.setStage('prairie');
  assert.equal(audio.step, 0);
  let prairie = 0, western = 0, sardinia = 0, alger = 0, japan = 0, ramparts = 0, infinity = 0, airbase = 0, snakeway = 0;
  audio.playPrairie = () => prairie++;
  audio.playWestern = () => western++;
  audio.playSardinia = () => sardinia++;
  audio.playAlger = () => alger++;
  audio.playJapan = () => japan++;
  audio.playRamparts = () => ramparts++;
  audio.playInfinity = () => infinity++;
  audio.playAirbase = () => airbase++;
  audio.playSnakeway = () => snakeway++;
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
  audio.setStage('ramparts');
  audio.playStep(0, 0);
  assert.equal(ramparts, 1);
  assert.equal(japan, 1, 'les Remparts d’Ocre ne rejouent pas la piste de Yōtei');
  audio.setStage('infinity');
  audio.playStep(0, 0);
  assert.equal(infinity, 1);
  assert.equal(ramparts, 1, 'le Château de l’Infini a sa propre partition au biwa');
  audio.setStage('airbase');
  audio.playStep(0, 0);
  assert.equal(airbase, 1);
  assert.equal(ramparts, 1, 'Thunder Airbase ne rejoue pas la piste des Remparts d’Ocre');
  audio.setStage('snakeway');
  audio.playStep(0, 0);
  assert.equal(snakeway, 1);
  assert.equal(airbase, 1, 'le Chemin du Serpent a sa propre ambiance synthétique');
});

test('snakeway celestial synth score schedules finite notes at its own tempo', () => {
  const audio = new DesertGroove();
  audio.setStage('snakeway');
  assert.ok(SNAKEWAY_BPM > 116 && SNAKEWAY_BPM < AIRBASE_BPM);
  const frequencies = [];
  audio.noise = () => {};
  audio.tone = (frequency, time, duration, type, volume) => {
    assert.ok(Number.isFinite(frequency) && frequency > 0);
    assert.ok(Number.isFinite(time) && time >= 0);
    assert.ok(duration > 0 && volume > 0);
    frequencies.push(frequency);
  };
  for (let bar = 0; bar < 16; bar++) {
    for (let step = 0; step < 16; step++) {
      audio.step = bar * 16 + step;
      audio.playStep(step, audio.step * (60 / SNAKEWAY_BPM / 4));
    }
  }
  assert.ok(frequencies.length > 250, 'les cloches et nappes font vivre le trajet céleste');
  assert.ok(frequencies.some((frequency) => frequency >= 1000), 'un carillon aigu scintille au-dessus des nuages');
});

test('infinity castle biwa & taiko score schedules finite notes and intensifies on the shift', () => {
  const audio = new DesertGroove();
  audio.setStage('infinity');
  assert.ok(INFINITY_BPM > RAMPARTS_BPM, 'un tempo haletant pour le Château de l’Infini');
  const stepLength = 60 / INFINITY_BPM / 4;
  const firstHalf = [];
  const secondHalf = [];
  audio.noise = () => {};
  audio.tone = (frequency, time, duration, type, volume) => {
    assert.ok(Number.isFinite(frequency) && frequency > 0);
    assert.ok(Number.isFinite(time) && time >= 0);
    assert.ok(duration > 0 && volume > 0);
    if (audio.step < 128) firstHalf.push(frequency);
    else secondHalf.push(frequency);
  };
  for (let bar = 0; bar < 16; bar++) {
    for (let step = 0; step < 16; step++) {
      audio.step = bar * 16 + step;
      audio.playInfinity(step, audio.step * stepLength);
    }
  }
  assert.ok(firstHalf.length > 80, 'biwa, koto et taiko produisent un motif dense');
  assert.ok(secondHalf.length > firstHalf.length, 'la seconde moitié du cycle densifie les arpèges et les frappes de biwa');
});

test('ramparts tactical score schedules finite notes, then the bomb beep quickens', () => {
  const audio = new DesertGroove();
  audio.setStage('ramparts');
  assert.ok(RAMPARTS_BPM > JAPAN_BPM, 'un tempo plus nerveux que les plaines de Yōtei');
  const stepLength = 60 / RAMPARTS_BPM / 4;
  const beepsPerPhrase = new Array(16).fill(0);
  let notes = 0;
  audio.noise = () => {};
  audio.tone = (frequency, time, duration, type, volume) => {
    assert.ok(Number.isFinite(frequency) && frequency > 0);
    assert.ok(Number.isFinite(time) && time >= 0);
    assert.ok(duration > 0 && volume > 0);
    notes += 1;
    if (frequency === 2093) beepsPerPhrase[Math.floor(audio.step / 16) % 16] += 1;
  };
  for (let bar = 0; bar < 16; bar++) {
    for (let step = 0; step < 16; step++) {
      audio.step = bar * 16 + step;
      audio.playRamparts(step, audio.step * stepLength);
    }
  }
  assert.ok(notes > 200, 'kick, basse, stabs et nappes produisent de nombreuses notes');
  assert.equal(beepsPerPhrase.slice(0, 8).reduce((a, b) => a + b, 0), 0, 'pas de bip avant la pose de la bombe');
  assert.equal(beepsPerPhrase[8], 2, 'un bip toutes les demi-mesures une fois la bombe posée');
  assert.equal(beepsPerPhrase[15], 4, 'le bip s’accélère dans les dernières mesures');
});

test('airbase flight-line rock schedules finite notes and varies its eight bars', () => {
  const audio = new DesertGroove();
  audio.setStage('airbase');
  assert.ok(AIRBASE_BPM > RAMPARTS_BPM, 'un tempo plus pressé que les Remparts d’Ocre');
  const stepLength = 60 / AIRBASE_BPM / 4;
  const bars = [];
  audio.noise = () => {};
  for (let bar = 0; bar < 16; bar++) {
    const notes = [];
    audio.tone = (frequency, time, duration, type, volume) => {
      assert.ok(Number.isFinite(frequency) && frequency > 0);
      assert.ok(Number.isFinite(time) && time >= 0);
      assert.ok(duration > 0 && volume > 0);
      notes.push(frequency);
    };
    for (let step = 0; step < 16; step++) {
      audio.step = bar * 16 + step;
      audio.playAirbase(step, audio.step * stepLength);
    }
    bars.push(JSON.stringify(notes));
  }
  const total = bars.reduce((count, bar) => count + JSON.parse(bar).length, 0);
  assert.ok(total > 200, 'grosse caisse, caisse claire, basse, riff et fanfare produisent de nombreuses notes');
  assert.notEqual(bars[0], bars[8], 'le passage des jets épaissit l’instrumentation');
  assert.ok(new Set(bars).size >= 6, 'les huit mesures varient');
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

test('cowboy cry is wired to player boost activation, not the fifth-gem streak', async () => {
  const { readFile } = await import('node:fs/promises');
  const [world, rushPage, onlinePage] = await Promise.all([
    readFile(new URL('../src/games/MirageWorld.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/games/MirageRushPage.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/games/MirageOnline.jsx', import.meta.url), 'utf8'),
  ]);

  assert.doesNotMatch(world, /onCheer|callbacks\.cheer/);
  assert.doesNotMatch(rushPage, /onCheer=/);
  assert.doesNotMatch(onlinePage, /onCheer=/);
  assert.match(rushPage, /else if \(info\.type === 'boost'\) \{\s*audioRef\.current\?\.speedBoost\?\.\(\);\s*audioRef\.current\?\.cheer\?\.\(\);/);
  assert.match(onlinePage, /else if \(info\.type === 'boost'\) \{\s*audio\.current\?\.speedBoost\?\.\(\);\s*audio\.current\?\.cheer\?\.\(\);/);
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

test('the cup fanfare is a finite, ordered score: a call, an answer, then a held chord with timpani and cymbal', () => {
  const score = cupFanfareScore();
  assert.ok(score.length > 15);
  let previous = 0;
  for (const event of score) {
    assert.ok(Number.isFinite(event.at) && event.at >= previous, 'events are sorted by start time');
    previous = event.at;
    assert.ok(event.duration > 0 && event.volume > 0 && event.volume <= 0.5, 'audible but never clipping on its own');
    if (event.kind === 'tone') assert.ok(event.frequency > 0 && typeof event.type === 'string');
    else {
      assert.equal(event.kind, 'noise');
      assert.ok(event.highpass > 0);
    }
  }
  const end = Math.max(...score.map((event) => event.at + event.duration));
  assert.ok(end > 2 && end < 4, `the fanfare lasts about three seconds, not ${end.toFixed(2)}`);
  const held = score.filter((event) => event.kind === 'tone' && event.duration >= 1.4 && event.type === 'sawtooth');
  assert.ok(held.length >= 5, 'the final chord stacks at least five brass voices');
  assert.equal(new Set(held.map((event) => event.at)).size, 1, 'they start together');
  assert.ok(score.some((event) => event.kind === 'tone' && event.frequency < 100), 'a timpani hit');
  assert.ok(score.some((event) => event.kind === 'noise' && event.duration > 1), 'a cymbal wash');
});

test('the fanfare plays on its own bus even though the music is stopped, and stop() fades it out', async () => {
  const audio = new DesertGroove();
  const events = [];
  const ramps = [];
  const timeouts = [];
  let resumed = 0;
  const context = {
    state: 'suspended',
    currentTime: 10,
    destination: {},
    resume: async () => { context.state = 'running'; resumed += 1; },
    suspend() { context.state = 'suspended'; },
    createGain: () => ({
      gain: { value: 1, cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime: (value, time) => ramps.push([value, time]) },
      connect() {},
      disconnect() {},
    }),
    createDynamicsCompressor: () => ({ connect() {} }),
  };
  audio.context = context;
  audio.master = { gain: { cancelScheduledValues() {}, setValueAtTime() {} } };
  audio.tone = (frequency, time, duration, type, volume, filter, destination) => events.push({ time, destination });
  audio.noise = (time, duration, volume, highpass, destination) => events.push({ time, destination });
  const originalWindow = globalThis.window;
  globalThis.window = { AudioContext: function () {}, setTimeout: (callback) => { timeouts.push(callback); return 0; } };
  try {
    await audio.fanfare();
    assert.equal(resumed, 1, 'a context suspended by the end of the race is resumed');
    assert.equal(audio.running, false, 'no music is started');
    assert.equal(events.length, cupFanfareScore().length, 'every note of the score is scheduled');
    const buses = new Set(events.map((event) => event.destination));
    assert.equal(buses.size, 1, 'every note goes through the same bus');
    const [bus] = buses;
    assert.ok(bus && bus !== audio.master, 'and that bus is not the music master');
    assert.equal(audio.fanfareBus, bus);
    assert.ok(events.every((event) => event.time >= 10.05), 'nothing is scheduled in the past');

    audio.stop();
    assert.equal(audio.fanfareBus, null, 'leaving the screen silences the fanfare');
    assert.deepEqual(ramps.at(-1)?.[0], 0, 'with a fade to zero rather than a click');
    assert.equal(timeouts.length, 1);
    timeouts[0]();
  } finally { globalThis.window = originalWindow; }
});

test('a fanfare still waiting for the audio context is cancelled by stop, and no AudioContext stays silent', async () => {
  const originalWindow = globalThis.window;
  try {
    const audio = new DesertGroove();
    let release;
    audio.context = { state: 'suspended', resume: () => new Promise((resolve) => { release = resolve; }) };
    globalThis.window = { AudioContext: function () {} };
    const pending = audio.fanfare();
    audio.stop();
    release();
    await pending;
    assert.equal(audio.fanfareBus, null);

    const mute = new DesertGroove();
    globalThis.window = {};
    await mute.fanfare();
    assert.equal(mute.context, null);
    assert.equal(mute.fanfareBus, null);
  } finally { globalThis.window = originalWindow; }
});

test('les techniques de Cloud ont leurs bruitages : vent doré, explosion, orage, tonnerre', () => {
  const audio = new DesertGroove();
  const tones = [];
  const noises = [];
  const oscillators = [];
  const filters = [];
  let noiseSources = 0;
  const sweepParam = (values) => ({
    values,
    setValueAtTime: (value, time) => values.push({ value, time }),
    exponentialRampToValueAtTime: (value, time) => values.push({ value, time }),
  });
  audio.tone = (frequency, time, duration, type, volume) => {
    assert.ok(frequency > 0 && duration > 0 && volume > 0);
    tones.push({ frequency, time, duration, type, volume });
  };
  audio.noise = (time, duration, volume, highpass) => {
    assert.ok(duration > 0 && volume > 0);
    noises.push({ time, duration, volume, highpass });
  };
  audio.context = {
    currentTime: 5,
    sampleRate: 44100,
    createBuffer: (channels, length) => ({ length, sampleRate: 44100, getChannelData: () => new Float32Array(length) }),
    createBufferSource: () => {
      noiseSources += 1;
      return { buffer: null, connect() {}, start() {}, stop() {} };
    },
    createBiquadFilter: () => {
      const frequency = sweepParam([]);
      const filter = { type: 'lowpass', Q: { setValueAtTime() {} }, frequency, connect() {} };
      filters.push(filter);
      return filter;
    },
    createGain: () => ({ gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }),
    createOscillator: () => {
      const frequency = sweepParam([]);
      const oscillator = { type: 'sine', frequency, connect() {}, start() {}, stop() {} };
      oscillators.push(oscillator);
      return oscillator;
    },
  };
  audio.master = {};
  const nodes = () => tones.length + noises.length + oscillators.length + noiseSources;

  // Son coupé / musique arrêtée : rien n'est programmé.
  audio.cloudSwordWave();
  audio.cloudWaveExplosion();
  audio.cloudStormCharge();
  audio.cloudThunderStrike();
  assert.equal(nodes(), 0, 'aucun bruitage ne part quand le son est coupé');

  audio.running = true;

  // Onde d'épée (jaune) : la rafale de vent qui monte et l'or qui chante.
  audio.cloudSwordWave();
  assert.ok(noiseSources >= 2 && noises.length >= 1, 'la rafale et la poussière dorée soufflent');
  assert.ok(tones.length >= 3, 'la lame fend l’air sur un accord clair');
  assert.ok(
    oscillators.some((oscillator) => oscillator.type === 'sawtooth'
      && oscillator.frequency.values.some((event) => event.value === 150)
      && oscillator.frequency.values.some((event) => event.value === 720)),
    'le sifflement de la lame balaie de 150 à 720 Hz',
  );
  assert.ok(
    filters.some((filter) => filter.type === 'lowpass' && filter.frequency.values.some((event) => event.value === 2600)),
    'le souffle s’ouvre vers l’aigu',
  );

  // Impact de l'onde : l'explosion dorée, du grave qui tombe aux éclats.
  const tonesBefore = tones.length;
  const oscillatorsBefore = oscillators.length;
  audio.cloudWaveExplosion();
  assert.ok(tones.length >= tonesBefore + 5, 'les éclats dorés retombent en cascade');
  assert.ok(
    oscillators.slice(oscillatorsBefore).some((oscillator) => oscillator.frequency.values.some((event) => event.value === 34)),
    'la déflagration descend à 34 Hz',
  );
  assert.ok(
    filters.some((filter) => filter.type === 'lowpass' && filter.frequency.values.some((event) => event.value === 220)),
    'la boule de feu s’assombrit',
  );

  // Éclair (rouge) : l'orage se forme, le vent forcit.
  audio.cloudStormCharge();
  assert.ok(
    filters.some((filter) => filter.frequency.values.some((event) => event.value === 1500)),
    'le vent d’orage monte',
  );
  assert.ok(
    oscillators.some((oscillator) => oscillator.frequency.values.every((event) => event.value <= 104)),
    'le grondement reste dans le grave',
  );

  // La foudre tombe : claquement sec, détonation sous 30 Hz, tonnerre qui roule.
  audio.cloudThunderStrike();
  assert.ok(noises.some((burst) => burst.highpass >= 5000), 'le claquement sec ouvre le tonnerre');
  assert.ok(
    oscillators.some((oscillator) => oscillator.frequency.values.some((event) => event.value === 26)),
    'la détonation tombe à 26 Hz',
  );
  assert.ok(
    filters.some((filter) => filter.type === 'lowpass'
      && filter.frequency.values.some((event) => event.value === 120)),
    'le tonnerre roule et s’éteint dans le lointain',
  );
  assert.ok(noiseSources >= 10, 'rafales, orage et tonnerre ont leur propre matière');
});

test('les bruitages de Cloud et de Link sont branchés sur le monde et les deux pages', async () => {
  const { readFile } = await import('node:fs/promises');
  const [world, rushPage, onlinePage, audioModule] = await Promise.all([
    readFile(new URL('../src/games/MirageWorld.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/games/MirageRushPage.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/games/MirageOnline.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/games/arcadeAudio.js', import.meta.url), 'utf8'),
  ]);

  for (const method of ['cloudSwordWave', 'cloudWaveExplosion', 'cloudStormCharge', 'cloudThunderStrike']) {
    assert.ok(audioModule.includes(`${method}()`), `${method}() existe dans arcadeAudio.js`);
  }
  // Le monde signale la frappe au moment exact où la foudre claque ou où l'onde explose.
  assert.match(world, /callbacks\.cloudStrike\?\.\(\{ kind: 'red' \}\);/);
  assert.match(world, /callbacks\.cloudStrike\?\.\(\{ kind: 'yellow' \}\);/);
  assert.match(world, /cloudStrike: \(info\) => callbackRefs\.current\.onCloudStrike\?\.\(info\)/);
  // Sur les deux pages, le chocobo doré remplace le lasso et le pistolet par ses
  // techniques ; Link intercale (ou précède) les siennes dans la même chaîne.
  assert.match(rushPage, /if \(isCloudRider\) audioRef\.current\?\.cloudSwordWave\?\.\(\);(\s*else if \(isLinkRider\) audioRef\.current\?\.linkBoomerangThrow\?\.\(\);)?\s*else audioRef\.current\?\.lassoThrow\?\.\(\);/);
  assert.match(rushPage, /if \(isCloudRider\) audioRef\.current\?\.cloudStormCharge\?\.\(\);(\s*else if \(isLinkRider\) audioRef\.current\?\.linkTriforce\?\.\(\);)?\s*else audioRef\.current\?\.gunshot[?.]*\(\);/);
  assert.match(onlinePage, /if \(isCloudRider\) audio\.current\?\.cloudSwordWave\?\.\(\);(\s*else if \(isLinkRider\) audio\.current\?\.linkBoomerangThrow\?\.\(\);)?\s*else audio\.current\?\.lassoThrow\?\.\(\);/);
  assert.match(onlinePage, /if \(isCloudRider\) audio\.current\?\.cloudStormCharge\?\.\(\);(\s*else if \(isLinkRider\) audio\.current\?\.linkTriforce\?\.\(\);)?\s*else audio\.current\?\.gunshot[?.]*\(\);/);
  // …et Link pose sa bombe, lance son boomerang, puis sa Triforce.
  for (const [name, page, audio] of [['MirageRushPage', rushPage, 'audioRef.current'], ['MirageOnline', onlinePage, 'audio.current']]) {
    for (const method of ['linkBombDrop', 'linkBoomerangThrow', 'linkTriforce']) {
      assert.ok(page.includes(`${audio}?.${method}?.();`), `${name} joue ${method}()`);
    }
    assert.ok(page.includes('isLinkRider'), `${name} distingue le cavalier Link`);
  }
  for (const method of ['linkBombDrop', 'linkBombExplosion', 'linkBoomerangThrow', 'linkTriforce', 'linkTriforceImpact']) {
    assert.ok(audioModule.includes(`${method}()`), `${method}() existe dans arcadeAudio.js`);
  }
  assert.match(world, /callbacks\.linkStrike\?\.\(\{ kind: 'bomb' \}\);/);
  assert.match(world, /callbacks\.linkStrike\?\.\(\{ kind: 'triforce' \}\);/);
  assert.match(rushPage, /onLinkStrike=\{\(info\) => \{[\s\S]*?linkBombExplosion[\s\S]*?linkTriforceImpact[\s\S]*?\}\}/);
  assert.match(onlinePage, /onLinkStrike=\{\(info\) => \{[\s\S]*?linkBombExplosion[\s\S]*?linkTriforceImpact[\s\S]*?\}\}/);
  // …puis le tonnerre et l'explosion dorée sonnent quand la cible est touchée.
  for (const [name, page] of [['MirageRushPage', rushPage], ['MirageOnline', onlinePage]]) {
    const audio = name === 'MirageRushPage' ? 'audioRef.current' : 'audio.current';
    assert.match(page, /onCloudStrike=\{\(info\) => \{[\s\S]*?cloudThunderStrike[\s\S]*?cloudWaveExplosion[\s\S]*?\}\}/);
    assert.ok(page.includes(`if (info?.kind === 'red') ${audio}?.cloudThunderStrike?.();`), `${name} joue le tonnerre`);
    assert.ok(page.includes(`else ${audio}?.cloudWaveExplosion?.();`), `${name} joue l’explosion dorée`);
  }
});
