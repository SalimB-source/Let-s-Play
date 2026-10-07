// ══════════════════════════════════════════════════════════════════════
// Bande-son de Vice City Rush.
//
// Tout est synthétisé en Web Audio : aucun fichier à charger, donc aucun
// poids mort dans le bundle et pas de silence au premier tour de roue. La
// classe se conduit comme `DesertGroove` (arcadeAudio.js) :
//
//   - `start()` / `stop()` / `pause()` / `resume()` pilotent la musique ;
//   - `engine({ speed, throttle, boost })` est appelé à chaque image par le
//     monde 3D : le moteur est un nœud permanent dont on ne fait bouger que
//     la fréquence et le volume (pas de création d'oscillateur par frame) ;
//   - les bruitages (`gunshot`, `pistolReload`, `skid`, `explosion`…)
//     fabriquent leurs nœuds à la volée et se taisent si le son est coupé.
//
// La musique est un disco de synthé : grosse caisse à quatre temps,
// charleston en croches, claquement sur les temps 2 et 4, basse qui saute
// d'octave, stabs de cuivres sur les contretemps, nappe de cordes et un
// refrain qui n'entre que sur la seconde moitié de la boucle de huit
// mesures. Chaque ville a son tempo.
// ══════════════════════════════════════════════════════════════════════

const MUSIC_VOLUME = 0.2;
const SFX_VOLUME = 0.5;
const ENGINE_VOLUME = 0.32;
const MASTER_VOLUME = 0.95;

// Tempo par ville : Vice City roule à 122, Tokyo serre les dents à 132.
// La campagne mexicaine adopte un tempo plus lent, façon balade ensoleillée.
export const CITY_RUSH_MUSIC_BPM = Object.freeze({
  'vice-city': 122,
  'new-york': 126,
  tokyo: 132,
  paris: 118,
  london: 124,
  'mexico-countryside': 104,
});
export const CITY_RUSH_DEFAULT_BPM = 122;
export const CITY_RUSH_ROUTE_66_BPM = 108;
// Le Ring : tempo posé, plus proche du rythme d'un tour de 8 minutes que d'une
// course de rue. Constant à part, comme la 66, pour ne pas toucher aux villes.
export const CITY_RUSH_NORDSCHLEIFE_BPM = 116;

export function cityRushMusicBpm(cityId) {
  if (cityId === 'route-66') return CITY_RUSH_ROUTE_66_BPM;
  if (cityId === 'nordschleife') return CITY_RUSH_NORDSCHLEIFE_BPM;
  return CITY_RUSH_MUSIC_BPM[cityId] || CITY_RUSH_DEFAULT_BPM;
}

// La grille : 16 pas par mesure (doubles croches), boucle de 8 mesures.
const STEPS_PER_BAR = 16;
const BARS_PER_LOOP = 8;
export const CITY_RUSH_LOOP_STEPS = STEPS_PER_BAR * BARS_PER_LOOP;

// Progression disco, une mesure par accord : Dm7 · G7 · Cmaj7 · Am7.
const CHORDS = Object.freeze([
  Object.freeze({ root: 38, intervals: Object.freeze([0, 3, 7, 10]) }),
  Object.freeze({ root: 43, intervals: Object.freeze([0, 4, 7, 10]) }),
  Object.freeze({ root: 48, intervals: Object.freeze([0, 4, 7, 11]) }),
  Object.freeze({ root: 45, intervals: Object.freeze([0, 3, 7, 10]) }),
]);

// Basse : une croche par pas pair, soit 8 notes par mesure. Les nombres sont
// des demi-tons au-dessus de la fondamentale de l'accord (12 = octave, null
// = silence). Les sauts d'octave font tout le disco.
const BASS_8 = Object.freeze([
  Object.freeze([0, null, 12, 0, 0, 12, 7, 0]),
  Object.freeze([0, null, 12, 0, 7, 0, 12, 10]),
  Object.freeze([0, 12, 0, 7, 0, null, 12, 0]),
  Object.freeze([0, null, 12, 0, 7, 7, 0, -5]),
]);

// Mélodie (notes MIDI) : elle n'entre que sur les mesures 5 à 8 de la
// boucle, pour que les quatre premières mesures servent d'intro.
const LEAD_8 = Object.freeze([
  Object.freeze([76, 76, 74, 72, null, 74, null, null]),
  Object.freeze([72, 74, 76, 74, 72, null, null, null]),
  Object.freeze([79, 79, 76, 74, 72, 74, null, null]),
  Object.freeze([74, 72, 69, 71, 72, null, null, null]),
]);

// Hauteur du moteur : cinq rapports, le régime remonte à chaque passage de
// vitesse (0,24 → 1). Exporté pour être vérifié sans Web Audio.
export const CITY_RUSH_ENGINE_GEARS = 5;

export function cityRushEngineRpm(speedRatio, gears = CITY_RUSH_ENGINE_GEARS) {
  const ratio = Math.max(0, Math.min(1, Number(speedRatio) || 0));
  const count = Math.max(1, Math.floor(Number(gears) || 1));
  const span = 1 / count;
  const gear = Math.min(count - 1, Math.floor(ratio / span));
  const within = Math.max(0, Math.min(1, (ratio - gear * span) / span));
  const rpm = 0.24 + within * 0.76;
  return { gear, rpm, frequency: 34 + rpm * 92 };
}

const midiToFrequency = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Les véhicules modernes ne partagent plus un seul « moteur synthé ». Chaque
// famille garde le même contrat de volume et de régime, mais possède sa
// matière : citadine feutrée, hot hatch râpeuse, GT pleine, supercar aiguë ou
// groupe électrique avec sifflement d'inverter.
export const CITY_RUSH_ENGINE_PROFILES = Object.freeze({
  'city-hatch': Object.freeze({ body: 'triangle', sub: 'sine', edge: 'sawtooth', edgeRatio: 2.35, lowpass: 760, noise: 520, lfo: 17 }),
  'nova-hatch': Object.freeze({ body: 'triangle', sub: 'square', edge: 'sawtooth', edgeRatio: 2.55, lowpass: 860, noise: 600, lfo: 19 }),
  volkswagen: Object.freeze({ body: 'sawtooth', sub: 'triangle', edge: 'sawtooth', edgeRatio: 2.65, lowpass: 1120, noise: 720, lfo: 22 }),
  porsche: Object.freeze({ body: 'sawtooth', sub: 'sine', edge: 'square', edgeRatio: 2.05, lowpass: 980, noise: 680, lfo: 20 }),
  bmw: Object.freeze({ body: 'sawtooth', sub: 'sine', edge: 'sawtooth', edgeRatio: 2.25, lowpass: 1180, noise: 760, lfo: 21 }),
  audi: Object.freeze({ body: 'sawtooth', sub: 'square', edge: 'sawtooth', edgeRatio: 3.05, lowpass: 1480, noise: 900, lfo: 25 }),
  lamborghini: Object.freeze({ body: 'sawtooth', sub: 'square', edge: 'sawtooth', edgeRatio: 3.35, lowpass: 1720, noise: 980, lfo: 28 }),
  'electric-gt': Object.freeze({ body: 'triangle', sub: 'sine', edge: 'sawtooth', edgeRatio: 4.8, lowpass: 2200, noise: 460, lfo: 8, electric: true }),
  'sport-crossover': Object.freeze({ body: 'triangle', sub: 'sine', edge: 'sawtooth', edgeRatio: 4.2, lowpass: 1850, noise: 540, lfo: 10, electric: true }),
  'neo-roadster': Object.freeze({ body: 'triangle', sub: 'sine', edge: 'square', edgeRatio: 5.2, lowpass: 2450, noise: 420, lfo: 7, electric: true }),
});

const DEFAULT_ENGINE_PROFILE = CITY_RUSH_ENGINE_PROFILES['city-hatch'];

export function cityRushEngineProfile(archetype) {
  return CITY_RUSH_ENGINE_PROFILES[archetype] || DEFAULT_ENGINE_PROFILE;
}

export class CityRushAudio {
  constructor() {
    this.cityId = 'vice-city';
    this.context = null;
    this.master = null;
    this.limiter = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.engineBus = null;
    this.heliBus = null;
    this.whiteNoise = null;
    this.timer = null;
    this.step = 0;
    this.nextTime = 0;
    this.running = false;
    this.paused = false;
    this.session = 0;
    this.engineNodes = null;
    this.engineState = null;
    this.engineProfile = DEFAULT_ENGINE_PROFILE;
    this.heliNodes = null;
    this.heliStopTimer = null;
    this.sirenBus = null;
    this.sirenNodes = null;
    this.sirenState = null;
    this.sirenStopTimer = null;
  }

  // ── Cycle de vie ────────────────────────────────────────────────────
  setCity(cityId) {
    if (!cityId || cityId === this.cityId) return;
    this.cityId = cityId;
    this.step = 0;
  }

  async start() {
    if (this.running) {
      this.paused = false;
      return;
    }
    if (typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.context ||= new AudioContext();
    const context = this.context;
    const session = ++this.session;
    try { await context.resume(); } catch { return; }
    if (this.context !== context || this.session !== session) return;
    if (!this.master) {
      this.master = context.createGain();
      this.master.gain.value = MASTER_VOLUME;
      // Un limiteur doux en sortie : une explosion par-dessus la musique et
      // le moteur ne doit pas écrêter les enceintes du téléphone. S'il
      // manque (vieux navigateur), on sort à niveau égal, sans rabattre.
      if (typeof context.createDynamicsCompressor === 'function') {
        this.limiter = context.createDynamicsCompressor();
        this.limiter.threshold.value = -9;
        this.limiter.knee.value = 8;
        this.limiter.ratio.value = 7;
        this.limiter.attack.value = 0.004;
        this.limiter.release.value = 0.2;
        this.master.connect(this.limiter);
        this.limiter.connect(context.destination);
      } else {
        this.master.connect(context.destination);
      }
      this.musicBus = context.createGain();
      this.musicBus.gain.value = MUSIC_VOLUME;
      this.musicBus.connect(this.master);
      this.sfxBus = context.createGain();
      this.sfxBus.gain.value = SFX_VOLUME;
      this.sfxBus.connect(this.master);
      this.engineBus = context.createGain();
      this.engineBus.gain.value = ENGINE_VOLUME;
      this.engineBus.connect(this.master);
      this.heliBus = context.createGain();
      this.heliBus.gain.value = 0;
      this.heliBus.connect(this.master);
      // Sirène de police : muette tant que l'escouade du dernier tour n'est
      // pas en piste (voir `policeSiren`).
      this.sirenBus = context.createGain();
      this.sirenBus.gain.value = 0;
      this.sirenBus.connect(this.master);
    }
    this.running = true;
    this.paused = false;
    this.master.gain.setTargetAtTime(MASTER_VOLUME, context.currentTime, 0.08);
    this.nextTime = context.currentTime + 0.08;
    this.clearTimer();
    this.timer = window.setInterval(() => this.schedule(), 35);
  }

  // Coupure franche : musique, moteur et hélicoptère s'arrêtent, le
  // contexte reste vivant pour un prochain `start()`.
  stop() {
    this.running = false;
    this.paused = false;
    this.clearTimer();
    this.disposeEngine();
    this.disposeHelicopter();
    this.disposeSiren();
    if (this.context && this.master) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.06);
    }
  }

  // Pause : la musique reprend où elle en était (`step` est conservé).
  pause() {
    if (!this.running || this.paused) return;
    this.paused = true;
    this.clearTimer();
    this.engine({ speed: 0, throttle: 0, idle: true });
    if (!this.context) return;
    this.heliBus?.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.08);
    this.sirenBus?.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.08);
    if (this.master) this.master.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.06);
  }

  resume() {
    if (!this.running || !this.paused || !this.context) return;
    this.paused = false;
    // Le monde reprogramme la sirène à l'image suivante : on oublie le
    // dernier niveau pour que la reprise soit ré-automatisée même si la
    // distance n'a pas bougé.
    this.sirenState = null;
    this.master.gain.setTargetAtTime(MASTER_VOLUME, this.context.currentTime, 0.08);
    this.nextTime = this.context.currentTime + 0.05;
    this.clearTimer();
    this.timer = window.setInterval(() => this.schedule(), 35);
  }

  destroy() {
    this.stop();
    this.session += 1;
    this.whiteNoise = null;
    const context = this.context;
    this.context = null;
    this.master = null;
    this.limiter = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.engineBus = null;
    this.heliBus = null;
    this.sirenBus = null;
    this.sirenNodes = null;
    this.sirenState = null;
    if (context && typeof context.close === 'function') {
      try { context.close(); } catch { /* Contexte déjà fermé. */ }
    }
  }

  clearTimer() {
    if (this.timer !== null && typeof window !== 'undefined') window.clearInterval(this.timer);
    this.timer = null;
  }

  // Vrai quand on peut fabriquer des nœuds : contexte vivant, son lancé,
  // et pas en pause (un bruitage de pause n'aurait nulle part où aller).
  ready() {
    return Boolean(this.running && !this.paused && this.context && this.master);
  }

  // ── Outils Web Audio ────────────────────────────────────────────────
  /** Une seconde de bruit blanc, partagée par tous les bruitages. */
  noiseBuffer() {
    if (!this.whiteNoise || this.whiteNoise.sampleRate !== this.context.sampleRate) {
      const length = Math.floor(this.context.sampleRate);
      this.whiteNoise = this.context.createBuffer(1, length, this.context.sampleRate);
      const data = this.whiteNoise.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    return this.whiteNoise;
  }

  /** Une note : oscillateur + enveloppe, filtre passe-bas optionnel. */
  tone(frequency, time, duration, type, volume, options = {}) {
    const {
      filter = 0, filterTo = 0, attack = 0.012, detune = 0, destination = this.musicBus,
    } = options;
    const ctx = this.context;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(1, frequency), time);
    if (detune) oscillator.detune.setValueAtTime(detune, time);
    let tail = oscillator;
    if (filter) {
      const biquad = ctx.createBiquadFilter();
      biquad.type = 'lowpass';
      biquad.frequency.setValueAtTime(filter, time);
      if (filterTo) biquad.frequency.exponentialRampToValueAtTime(Math.max(40, filterTo), time + duration);
      oscillator.connect(biquad);
      tail = biquad;
    }
    tail.connect(gain);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    gain.connect(destination);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.03);
  }

  /** Un bruit : bruit blanc filtré, avec enveloppe et balayage possible. */
  noise(time, duration, volume, options = {}) {
    const {
      type = 'highpass', frequency = 6000, frequencyTo = 0, q = 0.8, attack = 0.005,
      destination = this.sfxBus,
    } = options;
    const ctx = this.context;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = this.noiseBuffer();
    // Plus long que la seconde de bruit partagée : on boucle au lieu de
    // couper net (explosions, ovations, souffles de turbo).
    if (duration > 0.9) source.loop = true;
    filter.type = type;
    filter.frequency.setValueAtTime(frequency, time);
    filter.Q.value = q;
    if (frequencyTo) filter.frequency.exponentialRampToValueAtTime(Math.max(40, frequencyTo), time + duration);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(time, Math.random() * Math.max(0, 1 - duration), duration + 0.02);
  }

  /** Sortie stéréo : les tirs d'un rival arrivent de sa voie, pas du centre. */
  panned(pan, bus = this.sfxBus) {
    if (!pan || typeof this.context.createStereoPanner !== 'function') return bus;
    const panner = this.context.createStereoPanner();
    panner.pan.value = clamp(pan, -1, 1);
    panner.connect(bus);
    return panner;
  }

  // ── Musique ─────────────────────────────────────────────────────────
  schedule() {
    if (!this.context || !this.running || this.paused) return;
    const stepLength = 60 / cityRushMusicBpm(this.cityId) / 4;
    // Onglet gelé par le navigateur (ou téléphone verrouillé) : plutôt que
    // de rattraper des dizaines de mesures d'un coup — une avalanche de
    // nœuds qui partiraient tous en même temps — on recale la grille.
    if (this.nextTime < this.context.currentTime - 0.4) this.nextTime = this.context.currentTime + 0.05;
    while (this.nextTime < this.context.currentTime + 0.12) {
      this.playStep(this.step % CITY_RUSH_LOOP_STEPS, this.nextTime);
      this.step += 1;
      this.nextTime += stepLength;
    }
  }

  playStep(step, time) {
    const bar = Math.floor(step / STEPS_PER_BAR) % BARS_PER_LOOP;
    const beat = step % STEPS_PER_BAR;
    const chord = CHORDS[bar % CHORDS.length];
    // Grosse caisse : quatre temps au plancher.
    if (beat % 4 === 0) this.kick(time);
    // Charleston : croches, ouverture sur le dernier temps de la mesure.
    if (beat % 2 === 0) this.hat(time, beat === 14);
    // Claquement : temps 2 et 4.
    if (beat === 4 || beat === 12) this.clap(time);
    // Basse : croches, sauts d'octave.
    if (beat % 2 === 0) {
      const offset = BASS_8[bar % BASS_8.length][beat / 2];
      if (offset !== null && offset !== undefined) this.bass(chord.root + offset, time);
    }
    // Stabs de cuivres sur les contretemps.
    if (beat === 3 || beat === 6 || beat === 11 || beat === 14) {
      this.stab(chord, time, beat === 14 ? 0.72 : 1);
    }
    // Nappe de cordes : une tenue par mesure.
    if (beat === 0) this.strings(chord, time, bar);
    // Le refrain n'entre qu'à la moitié de la boucle.
    if (bar >= 4 && beat % 2 === 0) {
      const note = LEAD_8[(bar - 4) % LEAD_8.length][beat / 2];
      if (note) this.lead(note, time);
    }
    // Cymbale et remplissage pour marquer le retour de la boucle.
    if (step === 0) this.crash(time);
    if (bar === 7 && beat === 15) this.noise(time, 0.12, 0.07, { type: 'bandpass', frequency: 1400, q: 1.4, destination: this.musicBus });
  }

  kick(time) {
    const ctx = this.context;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(132, time);
    oscillator.frequency.exponentialRampToValueAtTime(44, time + 0.11);
    gain.gain.setValueAtTime(0.55, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);
    oscillator.connect(gain);
    gain.connect(this.musicBus);
    oscillator.start(time);
    oscillator.stop(time + 0.27);
    this.noise(time, 0.03, 0.12, { type: 'highpass', frequency: 2200, destination: this.musicBus });
  }

  hat(time, open = false) {
    this.noise(time, open ? 0.17 : 0.045, open ? 0.11 : 0.075, {
      type: 'highpass', frequency: open ? 7200 : 9000, destination: this.musicBus,
    });
  }

  clap(time) {
    // Trois claquements très rapides puis une queue : la claque disco.
    for (let index = 0; index < 3; index += 1) {
      this.noise(time + index * 0.011, 0.035, 0.26, {
        type: 'bandpass', frequency: 1500, q: 1.1, destination: this.musicBus,
      });
    }
    this.noise(time + 0.03, 0.16, 0.16, { type: 'bandpass', frequency: 1100, q: 0.7, destination: this.musicBus });
  }

  crash(time) {
    this.noise(time, 1.3, 0.075, { type: 'highpass', frequency: 4800, attack: 0.01, destination: this.musicBus });
  }

  bass(midi, time) {
    const frequency = midiToFrequency(midi);
    this.tone(frequency, time, 0.17, 'sawtooth', 0.2, { filter: 520, filterTo: 300 });
    this.tone(frequency, time, 0.12, 'sine', 0.13);
  }

  stab(chord, time, velocity = 1) {
    for (const interval of chord.intervals) {
      const frequency = midiToFrequency(chord.root + 24 + interval);
      this.tone(frequency, time, 0.19, 'sawtooth', 0.062 * velocity, {
        filter: 3200, filterTo: 900, attack: 0.008, detune: 4,
      });
    }
  }

  strings(chord, time, bar = 0) {
    const stepLength = 60 / cityRushMusicBpm(this.cityId) / 4;
    const duration = stepLength * STEPS_PER_BAR;
    chord.intervals.forEach((interval, index) => {
      this.tone(midiToFrequency(chord.root + 12 + interval), time, duration, 'sawtooth', 0.03, {
        filter: 1500 + (bar >= 4 ? 900 : 0), attack: 0.22, detune: index % 2 ? 7 : -7,
      });
    });
  }

  lead(note, time) {
    const frequency = midiToFrequency(note);
    this.tone(frequency, time, 0.15, 'square', 0.1, { filter: 4200, filterTo: 2200, attack: 0.008 });
    this.tone(frequency * 2, time, 0.09, 'sawtooth', 0.025, { filter: 6000 });
  }

  // ── Moteur : un nœud permanent, piloté à chaque image ───────────────
  ensureEngine(profile = this.engineProfile) {
    if (!this.context) return this.engineNodes;
    if (this.engineNodes && this.engineNodes.profile === profile) return this.engineNodes;
    if (this.engineNodes) this.disposeEngine();
    const ctx = this.context;
    const out = ctx.createGain();
    out.gain.value = 0.0001;
    out.connect(this.engineBus);
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = profile.lowpass;
    lowpass.Q.value = 0.8;
    lowpass.connect(out);

    // Trois oscillateurs : le corps, un octave en dessous, un harmonique
    // aigu qui donne le « râpeux » du rupteur.
    const make = (type, ratio, level) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.value = 60 * ratio;
      gain.gain.value = level;
      oscillator.connect(gain);
      gain.connect(lowpass);
      oscillator.start();
      return { oscillator, gain };
    };
    const body = make(profile.body, 1, profile.electric ? 0.38 : 0.5);
    const sub = make(profile.sub, 0.5, profile.electric ? 0.22 : 0.32);
    const edge = make(profile.edge, profile.edgeRatio, profile.electric ? 0.17 : 0.12);

    // Souffle et bruit de roulement : le bruit blanc monte avec la vitesse.
    const noise = ctx.createBufferSource();
    const noiseFilter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();
    noise.buffer = this.noiseBuffer();
    noise.loop = true;
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = profile.noise;
    noiseFilter.Q.value = 0.7;
    noiseGain.gain.value = 0.12;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(lowpass);
    noise.start();

    // Trémolo : le régime se ressent jusque dans le volume.
    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = profile.lfo;
    lfoDepth.gain.value = profile.electric ? 0.08 : 0.16;
    lfo.connect(lfoDepth);
    lfoDepth.connect(out.gain);
    lfo.start();

    this.engineNodes = { out, lowpass, body, sub, edge, noiseFilter, noiseGain, noise, lfo, lfoDepth, profile };
    return this.engineNodes;
  }

  disposeEngine() {
    if (!this.engineNodes) return;
    const nodes = this.engineNodes;
    this.engineNodes = null;
    this.engineState = null;
    try {
      nodes.out.gain.cancelScheduledValues(this.context.currentTime);
      nodes.out.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.05);
    } catch { /* Contexte disparu. */ }
    const stopAt = this.context.currentTime + 0.4;
    for (const node of [nodes.body.oscillator, nodes.sub.oscillator, nodes.edge.oscillator, nodes.noise, nodes.lfo]) {
      try { node.stop(stopAt); } catch { /* Déjà arrêté. */ }
    }
  }

  /**
   * État du moteur, appelé à chaque image par le monde 3D. `speed` est le
   * rapport vitesse / vitesse maximale (0 → 1), `throttle` l'effort demandé
   * (1 quand on écrase l'accélérateur), `boost` le turbo, `idle` le ralenti
   * du tour d'honneur ou de la grille de départ.
   */
  engine({ speed = 0, throttle = 0, boost = false, idle = false, mute = false, engineProfile = null } = {}) {
    if (!this.running || !this.context) return;
    if (engineProfile) this.engineProfile = cityRushEngineProfile(engineProfile);
    const nodes = this.ensureEngine(this.engineProfile);
    if (!nodes) return;
    // Le monde appelle `engine()` à chaque image : on ne reprogramme les
    // automations que quand la valeur bouge vraiment (128 crans de vitesse,
    // 10 d'accélérateur), sinon on empile des événements pour rien.
    const ratio = Math.round(clamp(Number(speed) || 0, 0, 1) * 128) / 128;
    const push = Math.round(clamp(Number(throttle) || 0, 0, 1) * 10) / 10;
    const state = this.engineState || (this.engineState = {});
    const changed = state.ratio !== ratio || state.push !== push || state.boost !== boost
      || state.idle !== idle || state.mute !== mute || state.profile !== this.engineProfile;
    if (changed) Object.assign(state, { ratio, push, boost, idle, mute, profile: this.engineProfile });
    if (!changed) return;
    const { rpm, frequency } = cityRushEngineRpm(ratio);
    const pitched = frequency * (boost ? 1.14 : 1);
    const now = this.context.currentTime;
    const glide = 0.055;
    nodes.body.oscillator.frequency.setTargetAtTime(pitched, now, glide);
    nodes.sub.oscillator.frequency.setTargetAtTime(pitched * 0.5, now, glide);
    nodes.edge.oscillator.frequency.setTargetAtTime(pitched * 2.01, now, glide);
    nodes.lowpass.frequency.setTargetAtTime(this.engineProfile.lowpass + rpm * 1750 + (boost ? 900 : 0), now, 0.08);
    nodes.noiseFilter.frequency.setTargetAtTime(this.engineProfile.noise + ratio * 1500, now, 0.08);
    nodes.noiseGain.gain.setTargetAtTime((this.engineProfile.electric ? 0.045 : 0.08) + ratio * 0.2, now, 0.1);
    nodes.lfo.frequency.setTargetAtTime(this.engineProfile.lfo * 0.55 + rpm * (this.engineProfile.electric ? 8 : 26), now, 0.1);
    const volume = mute
      ? 0.0001
      : idle
        ? 0.07 + push * 0.07
        : 0.08 + rpm * 0.1 + push * 0.06 + (boost ? 0.06 : 0);
    nodes.out.gain.setTargetAtTime(Math.max(0.0001, volume), now, 0.08);
  }

  // ── Bruitages ───────────────────────────────────────────────────────
  /** Coup de feu : claquement, corps, puis l'écho entre les façades. */
  gunshot({ pan = 0, delay = 0 } = {}) {
    if (!this.ready()) return;
    const time = this.context.currentTime + 0.005 + Math.max(0, delay);
    const out = this.panned(pan);
    this.noise(time, 0.09, 0.55, { type: 'highpass', frequency: 2800, destination: out });
    this.noise(time, 0.3, 0.34, { type: 'lowpass', frequency: 1600, frequencyTo: 500, destination: out });
    this.tone(190, time, 0.14, 'sine', 0.3, { destination: out });
    this.noise(time + 0.17, 0.34, 0.09, { type: 'lowpass', frequency: 900, destination: out });
  }

  /**
   * Mitrailleuse : une rafale rapprochée de coups secs (ratatatata), panoramiquée
   * sur la voie du tireur. Chaque coup réutilise la texture du `gunshot`.
   */
  machineGun({ pan = 0, delay = 0, shots = 7, spacing = 0.045 } = {}) {
    if (!this.ready()) return;
    const out = this.panned(pan);
    const base = this.context.currentTime + 0.005 + Math.max(0, delay);
    for (let i = 0; i < Math.max(1, shots); i += 1) {
      const time = base + i * spacing;
      this.noise(time, 0.08, 0.5, { type: 'highpass', frequency: 3000, destination: out });
      this.noise(time, 0.26, 0.3, { type: 'lowpass', frequency: 1500, frequencyTo: 500, destination: out });
      this.tone(180, time, 0.12, 'sine', 0.28, { destination: out });
      this.noise(time + 0.15, 0.3, 0.08, { type: 'lowpass', frequency: 900, destination: out });
    }
  }

  /**
   * Dérapage : pneus qui hurlent. `intensity` va de 0,48 (tir bleu léger) à
   * 1 (Voiture touchée par une rafale). Le son est décalé de `delay` pour
   * tomber sur l'impact, pas sur le coup de feu.
   */
  skid({ pan = 0, delay = 0, intensity = 1, duration = 0.72 } = {}) {
    if (!this.ready()) return;
    const ctx = this.context;
    const time = ctx.currentTime + 0.005 + Math.max(0, delay);
    const out = this.panned(pan);
    const length = Math.max(0.2, duration * clamp(intensity, 0.4, 1.4));
    const volume = 0.45 * clamp(intensity, 0.3, 1.3);

    // Le cri du pneu : bruit blanc dans un filtre très sélectif.
    const source = ctx.createBufferSource();
    const band = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = this.noiseBuffer();
    source.loop = true;
    band.type = 'bandpass';
    band.frequency.setValueAtTime(1750, time);
    band.frequency.linearRampToValueAtTime(2350, time + length * 0.35);
    band.frequency.linearRampToValueAtTime(1250, time + length);
    band.Q.value = 7;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.05);
    gain.gain.setValueAtTime(volume, time + length * 0.55);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
    source.connect(band);
    band.connect(gain);
    gain.connect(out);
    source.start(time);
    source.stop(time + length + 0.05);

    // Le sifflement aigu qui tremble par-dessus.
    const squeal = ctx.createOscillator();
    const squealGain = ctx.createGain();
    const wobble = ctx.createOscillator();
    const wobbleDepth = ctx.createGain();
    squeal.type = 'sine';
    squeal.frequency.setValueAtTime(1850, time);
    squeal.frequency.linearRampToValueAtTime(2400, time + length * 0.4);
    squeal.frequency.linearRampToValueAtTime(1500, time + length);
    wobble.type = 'sine';
    wobble.frequency.value = 17;
    wobbleDepth.gain.value = 130;
    wobble.connect(wobbleDepth);
    wobbleDepth.connect(squeal.frequency);
    squealGain.gain.setValueAtTime(0.0001, time);
    squealGain.gain.exponentialRampToValueAtTime(volume * 0.28, time + 0.06);
    squealGain.gain.exponentialRampToValueAtTime(0.0001, time + length);
    squeal.connect(squealGain);
    squealGain.connect(out);
    squeal.start(time);
    squeal.stop(time + length + 0.05);
    wobble.start(time);
    wobble.stop(time + length + 0.05);
  }

  /** Missile qui part : sifflement qui monte et traînée. */
  missileLaunch({ pan = 0, delay = 0 } = {}) {
    if (!this.ready()) return;
    const time = this.context.currentTime + 0.005 + Math.max(0, delay);
    const out = this.panned(pan);
    this.noise(time, 0.62, 0.3, { type: 'bandpass', frequency: 420, frequencyTo: 2900, q: 1.1, destination: out });
    const ctx = this.context;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(220, time);
    oscillator.frequency.exponentialRampToValueAtTime(880, time + 0.55);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.1, time + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.6);
    oscillator.connect(gain);
    gain.connect(out);
    oscillator.start(time);
    oscillator.stop(time + 0.63);
  }

  /** Explosion : le souffle, le grave qui descend, les débris, l'écho. */
  explosion({ pan = 0, delay = 0 } = {}) {
    if (!this.ready()) return;
    const ctx = this.context;
    const time = ctx.currentTime + 0.005 + Math.max(0, delay);
    const out = this.panned(pan);
    // Le grave : une descente qui vide les enceintes.
    const boom = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(128, time);
    boom.frequency.exponentialRampToValueAtTime(28, time + 0.85);
    boomGain.gain.setValueAtTime(0.75, time);
    boomGain.gain.exponentialRampToValueAtTime(0.0001, time + 1.15);
    boom.connect(boomGain);
    boomGain.connect(out);
    boom.start(time);
    boom.stop(time + 1.2);
    // Le souffle : large bande qui s'assombrit.
    this.noise(time, 1.35, 0.42, { type: 'lowpass', frequency: 2600, frequencyTo: 200, destination: out });
    // Le claquement initial.
    this.noise(time, 0.16, 0.3, { type: 'highpass', frequency: 3200, destination: out });
    // Les débris qui retombent.
    this.noise(time + 0.28, 0.9, 0.12, { type: 'bandpass', frequency: 900, q: 0.9, destination: out });
    // L'écho sur les façades.
    this.noise(time + 0.42, 1.2, 0.11, { type: 'lowpass', frequency: 520, destination: out });
  }

  /**
   * Frôlement : un rival qui double (ou qu'on double) passe en sifflant. La
   * hauteur monte à l'approche puis retombe — l'effet Doppler de bord de
   * route. `speed` est l'écart de vitesse ramené entre 0 et 1.
   */
  passby({ pan = 0, speed = 0.5 } = {}) {
    if (!this.ready()) return;
    const ctx = this.context;
    const time = ctx.currentTime + 0.005;
    const out = this.panned(pan);
    const close = clamp(Number(speed) || 0, 0, 1);
    const volume = 0.1 + close * 0.16;
    this.noise(time, 0.55, volume, { type: 'bandpass', frequency: 800, frequencyTo: 2600, q: 0.9, destination: out, attack: 0.12 });
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(180 + close * 90, time);
    oscillator.frequency.linearRampToValueAtTime(320 + close * 160, time + 0.26);
    oscillator.frequency.linearRampToValueAtTime(120, time + 0.55);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume * 0.5, time + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.55);
    oscillator.connect(gain);
    gain.connect(out);
    oscillator.start(time);
    oscillator.stop(time + 0.58);
  }

  /** Hélicoptère : pales qui hachent et turbine qui monte en régime. */
  ensureHelicopter() {
    if (this.heliNodes || !this.context) return this.heliNodes;
    const ctx = this.context;
    // Le niveau de l'hélicoptère est piloté par `heliBus` (montée à
    // l'approche, extinction après l'explosion) : ce gain reste à 1.
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(this.heliBus);

    // Pales : bruit filtré, haché par un LFO (deux pales, ~6,5 tours/s).
    const blades = ctx.createBufferSource();
    const bladeFilter = ctx.createBiquadFilter();
    const bladeGain = ctx.createGain();
    const chop = ctx.createOscillator();
    const chopDepth = ctx.createGain();
    blades.buffer = this.noiseBuffer();
    blades.loop = true;
    bladeFilter.type = 'bandpass';
    bladeFilter.frequency.value = 420;
    bladeFilter.Q.value = 0.9;
    bladeGain.gain.value = 0.55;
    chop.type = 'sine';
    chop.frequency.value = 13.5;
    chopDepth.gain.value = 0.45;
    chop.connect(chopDepth);
    chopDepth.connect(bladeGain.gain);
    blades.connect(bladeFilter);
    bladeFilter.connect(bladeGain);
    bladeGain.connect(out);
    blades.start();
    chop.start();

    // Turbine : deux oscillateurs graves et leur vibrato.
    const turbine = ctx.createOscillator();
    const turbineHarmonic = ctx.createOscillator();
    const turbineFilter = ctx.createBiquadFilter();
    const turbineGain = ctx.createGain();
    const vibrato = ctx.createOscillator();
    const vibratoDepth = ctx.createGain();
    turbine.type = 'sawtooth';
    turbine.frequency.setValueAtTime(62, ctx.currentTime);
    turbine.frequency.linearRampToValueAtTime(94, ctx.currentTime + 1.4);
    turbineHarmonic.type = 'sine';
    turbineHarmonic.frequency.setValueAtTime(124, ctx.currentTime);
    turbineHarmonic.frequency.linearRampToValueAtTime(188, ctx.currentTime + 1.4);
    turbineFilter.type = 'lowpass';
    turbineFilter.frequency.value = 520;
    turbineGain.gain.value = 0.22;
    vibrato.type = 'sine';
    vibrato.frequency.value = 4.2;
    vibratoDepth.gain.value = 3.5;
    vibrato.connect(vibratoDepth);
    vibratoDepth.connect(turbine.frequency);
    turbine.connect(turbineFilter);
    turbineHarmonic.connect(turbineFilter);
    turbineFilter.connect(turbineGain);
    turbineGain.connect(out);
    turbine.start();
    turbineHarmonic.start();
    vibrato.start();

    this.heliNodes = {
      out, blades, bladeFilter, bladeGain, chop, chopDepth,
      turbine, turbineHarmonic, turbineFilter, turbineGain, vibrato, vibratoDepth,
    };
    return this.heliNodes;
  }

  helicopterStart() {
    if (!this.ready()) return;
    if (this.heliStopTimer !== null) {
      window.clearTimeout(this.heliStopTimer);
      this.heliStopTimer = null;
    }
    const nodes = this.ensureHelicopter();
    if (!nodes) return;
    const now = this.context.currentTime;
    this.heliBus.gain.cancelScheduledValues(now);
    this.heliBus.gain.setValueAtTime(Math.max(0.0001, this.heliBus.gain.value), now);
    // Niveau mesuré : le rotor reste au-dessus de la musique sans la couvrir.
    this.heliBus.gain.linearRampToValueAtTime(0.22, now + 0.85);
  }

  helicopterStop() {
    if (!this.context || !this.heliNodes) return;
    const now = this.context.currentTime;
    this.heliBus.gain.cancelScheduledValues(now);
    this.heliBus.gain.setValueAtTime(Math.max(0.0001, this.heliBus.gain.value), now);
    this.heliBus.gain.linearRampToValueAtTime(0.0001, now + 0.9);
    if (this.heliStopTimer !== null) window.clearTimeout(this.heliStopTimer);
    this.heliStopTimer = window.setTimeout(() => {
      this.heliStopTimer = null;
      this.disposeHelicopter();
    }, 1000);
  }

  disposeHelicopter() {
    if (this.heliStopTimer !== null) {
      window.clearTimeout(this.heliStopTimer);
      this.heliStopTimer = null;
    }
    if (!this.heliNodes) return;
    const nodes = this.heliNodes;
    this.heliNodes = null;
    if (this.heliBus) {
      try {
        this.heliBus.gain.cancelScheduledValues(this.context.currentTime);
        this.heliBus.gain.setValueAtTime(0.0001, this.context.currentTime);
      } catch { /* Contexte disparu. */ }
    }
    const stopAt = this.context.currentTime + 0.1;
    for (const node of [nodes.blades, nodes.chop, nodes.turbine, nodes.turbineHarmonic, nodes.vibrato]) {
      try { node.stop(stopAt); } catch { /* Déjà arrêté. */ }
    }
  }

  /**
   * Sirène de l'escouade de police : deux tons qui alternent (l'aller-retour
   * « hi-lo » des berlines américaines) tenus par un LFO carré, plus une voix
   * légèrement désaccordée qui fait battre la sirène. Le niveau est piloté par
   * `sirenBus` ; le monde n'envoie que la proximité de l'escouade.
   */
  ensureSiren() {
    if (this.sirenNodes || !this.context) return this.sirenNodes;
    const ctx = this.context;
    // Le niveau est piloté par `sirenBus` : ce gain reste à 1 (comme le rotor).
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(this.sirenBus);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    filter.Q.value = 0.85;
    filter.connect(out);

    const body = ctx.createGain();
    body.gain.value = 0.5;
    body.connect(filter);

    const wail = ctx.createOscillator();
    const wailGain = ctx.createGain();
    wail.type = 'sawtooth';
    wail.frequency.value = 690;
    wailGain.gain.value = 0.55;
    wail.connect(wailGain);
    wailGain.connect(body);
    wail.start();

    // Deuxième voix désaccordée : la sirène « bat » au lieu de siffler droit.
    const echo = ctx.createOscillator();
    const echoGain = ctx.createGain();
    echo.type = 'square';
    echo.frequency.value = 706;
    echoGain.gain.value = 0.16;
    echo.connect(echoGain);
    echoGain.connect(body);
    echo.start();

    // LFO carré : l'alternance des deux hauteurs, la signature de la poursuite.
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.type = 'square';
    lfo.frequency.value = 1.55;
    depth.gain.value = 215;
    lfo.connect(depth);
    depth.connect(wail.frequency);
    depth.connect(echo.frequency);
    lfo.start();

    this.sirenNodes = { out, filter, body, wail, wailGain, echo, echoGain, lfo, depth };
    return this.sirenNodes;
  }

  /**
   * Proximité de l'escouade : appelée à chaque image par le monde 3D avec un
   * niveau 0 → 1. Les valeurs sont quantifiées (16 crans) pour ne pas empiler
   * d'automations inutiles, comme le régime moteur.
   */
  policeSiren({ level = 1, mute = false } = {}) {
    if (!this.running || !this.context) return;
    const nodes = this.ensureSiren();
    if (!nodes) return;
    const step = Math.round(clamp(Number(level) || 0, 0, 1) * 16) / 16;
    const state = this.sirenState || (this.sirenState = {});
    if (state.step === step && state.mute === mute) return;
    Object.assign(state, { step, mute });
    const volume = mute || step <= 0 ? 0.0001 : 0.03 + step * 0.13;
    this.sirenBus.gain.setTargetAtTime(volume, this.context.currentTime, 0.12);
  }

  /** Fin de la poursuite : la sirène s'éloigne puis les nœuds sont libérés. */
  policeSirenOff() {
    if (!this.context || !this.sirenNodes) return;
    const now = this.context.currentTime;
    this.sirenBus.gain.cancelScheduledValues(now);
    this.sirenBus.gain.setValueAtTime(Math.max(0.0001, this.sirenBus.gain.value), now);
    this.sirenBus.gain.linearRampToValueAtTime(0.0001, now + 0.6);
    this.sirenState = null;
    if (this.sirenStopTimer !== null) window.clearTimeout(this.sirenStopTimer);
    this.sirenStopTimer = window.setTimeout(() => {
      this.sirenStopTimer = null;
      this.disposeSiren();
    }, 700);
  }

  disposeSiren() {
    if (this.sirenStopTimer !== null) {
      window.clearTimeout(this.sirenStopTimer);
      this.sirenStopTimer = null;
    }
    this.sirenState = null;
    if (!this.sirenNodes) return;
    const nodes = this.sirenNodes;
    this.sirenNodes = null;
    if (this.sirenBus) {
      try {
        this.sirenBus.gain.cancelScheduledValues(this.context.currentTime);
        this.sirenBus.gain.setValueAtTime(0.0001, this.context.currentTime);
      } catch { /* Contexte disparu. */ }
    }
    const stopAt = this.context.currentTime + 0.1;
    for (const node of [nodes.wail, nodes.echo, nodes.lfo]) {
      try { node.stop(stopAt); } catch { /* Déjà arrêté. */ }
    }
  }

  // ── Petits bruitages de course ──────────────────────────────────────
  /** Changement de chargeur : extraction, insertion, puis armement de la culasse. */
  pistolReload({ pan = 0, delay = 0 } = {}) {
    if (!this.ready()) return;
    const time = this.context.currentTime + 0.005 + Math.max(0, delay);
    const out = this.panned(pan);

    // Petit déclic métallique pour libérer le chargeur vide.
    this.noise(time, 0.045, 0.18, { type: 'bandpass', frequency: 2500, q: 2.2, destination: out });
    this.tone(410, time, 0.055, 'square', 0.045, { filter: 2100, attack: 0.002, destination: out });
    // Le chargeur neuf s'emboîte avec un claquement plus sourd.
    this.noise(time + 0.12, 0.075, 0.24, { type: 'bandpass', frequency: 1150, q: 1.3, destination: out });
    this.tone(155, time + 0.12, 0.075, 'triangle', 0.13, { filter: 600, destination: out });
    // Course de culasse, puis verrouillage sec : la mitrailleuse est prête.
    this.noise(time + 0.25, 0.11, 0.18, { type: 'bandpass', frequency: 3100, frequencyTo: 1300, q: 1.7, destination: out });
    this.noise(time + 0.42, 0.05, 0.2, { type: 'highpass', frequency: 2800, destination: out });
    this.tone(520, time + 0.42, 0.055, 'square', 0.05, { filter: 2500, destination: out });
  }

  /** Bonus ramassé : un bip par couleur, un accord quand la jauge est pleine. */
  pickup(type = 'boost', { ready = false } = {}) {
    if (!this.ready()) return;
    if (type === 'pistol') this.pistolReload();
    const root = { 'blue-shot': 60, pistol: 64, boost: 69, radio: 74 }[type] ?? 69;
    const time = this.context.currentTime + 0.005;
    const out = this.sfxBus;
    this.tone(midiToFrequency(root + 12), time, 0.1, 'triangle', 0.14, { destination: out });
    this.tone(midiToFrequency(root + 19), time + 0.07, 0.12, 'triangle', 0.11, { destination: out });
    if (ready) {
      this.tone(midiToFrequency(root + 24), time + 0.15, 0.3, 'square', 0.09, { filter: 5200, destination: out });
      this.noise(time + 0.15, 0.35, 0.06, { type: 'highpass', frequency: 6500, destination: out });
    }
  }

  /** Turbo : l'appel d'air, puis la poussée. */
  boost() {
    if (!this.ready()) return;
    const time = this.context.currentTime + 0.005;
    this.noise(time, 0.45, 0.22, { type: 'bandpass', frequency: 700, frequencyTo: 3200, q: 0.9 });
    this.tone(180, time, 0.4, 'sawtooth', 0.09, { filter: 1400, filterTo: 3600 });
  }

  /** Tremplin : décollage et appel d'air ascendant. */
  rampJump({ pan = 0, speed = 1 } = {}) {
    if (!this.ready()) return;
    const ctx = this.context;
    const time = ctx.currentTime + 0.005;
    const out = this.panned(pan);
    const speedRatio = clamp(((Number(speed) || 20) - 15) / 45, 0, 1);
    this.noise(time, 0.52 + speedRatio * 0.22, 0.2, {
      type: 'bandpass',
      frequency: 650,
      frequencyTo: 2600 + speedRatio * 1100,
      q: 1.1,
      destination: out,
    });
    const baseFreq = 220 + speedRatio * 80;
    this.tone(baseFreq, time, 0.4, 'sawtooth', 0.11, {
      filter: 1200,
      filterTo: 3600,
      destination: out,
    });
    this.tone(baseFreq * 1.5, time + 0.04, 0.35, 'square', 0.08, {
      filter: 1800,
      filterTo: 4400,
      destination: out,
    });
    this.tone(baseFreq * 2.0, time + 0.09, 0.3, 'triangle', 0.12, {
      destination: out,
    });
  }

  /** Atterrissage : claquement de suspension et reprise d'adhérence des pneus. */
  rampLand({ pan = 0, speed = 1 } = {}) {
    if (!this.ready()) return;
    const ctx = this.context;
    const time = ctx.currentTime + 0.005;
    const out = this.panned(pan);
    this.tone(110, time, 0.18, 'sine', 0.25, {
      filter: 450,
      filterTo: 60,
      destination: out,
    });
    this.noise(time, 0.15, 0.2, {
      type: 'bandpass',
      frequency: 1800,
      frequencyTo: 800,
      q: 2.2,
      destination: out,
    });
  }

  /** Feux de départ : un bip par seconde, un accord sur le GO. */
  countdownBeep(step) {
    if (!this.ready()) return;
    const time = this.context.currentTime + 0.005;
    if (step > 0) {
      this.tone(660, time, 0.2, 'square', 0.16, { filter: 3200, destination: this.sfxBus });
      this.tone(330, time, 0.16, 'triangle', 0.1, { destination: this.sfxBus });
      return;
    }
    this.tone(990, time, 0.45, 'square', 0.18, { filter: 4200, destination: this.sfxBus });
    this.tone(1320, time + 0.09, 0.4, 'square', 0.12, { filter: 5200, destination: this.sfxBus });
    this.noise(time, 0.4, 0.12, { type: 'highpass', frequency: 3800 });
  }

  /** Passage de ligne : deux notes, trois et plus brillantes au dernier tour. */
  lap(final = false) {
    if (!this.ready()) return;
    const time = this.context.currentTime + 0.005;
    const notes = final ? [72, 76, 79, 84] : [72, 79];
    notes.forEach((note, index) => {
      this.tone(midiToFrequency(note), time + index * 0.11, 0.4, 'square', 0.11, {
        filter: 4800, destination: this.sfxBus,
      });
    });
    this.crowd(final ? 1.5 : 1, final ? 0.16 : 0.1);
  }

  /** Arrivée : fanfare courte et ovation. */
  finish(rank = 4) {
    if (!this.ready()) return;
    const win = rank === 1;
    const time = this.context.currentTime + 0.02;
    const notes = win ? [69, 73, 76, 81] : [69, 72, 76];
    notes.forEach((note, index) => {
      const at = time + index * 0.13;
      this.tone(midiToFrequency(note), at, 0.55, 'sawtooth', 0.14, { filter: 3000, destination: this.sfxBus });
      this.tone(midiToFrequency(note - 12), at, 0.5, 'triangle', 0.09, { destination: this.sfxBus });
    });
    this.tone(midiToFrequency(win ? 45 : 43), time, 1.3, 'sine', 0.2, { destination: this.sfxBus });
    this.noise(time, 1.1, 0.1, { type: 'highpass', frequency: 5200 });
    this.crowd(2.2, win ? 0.2 : 0.13);
  }

  /** Ovation : bruit filtré en tremolo, la foule des tribunes. */
  crowd(duration = 1.2, volume = 0.12) {
    if (!this.ready()) return;
    const ctx = this.context;
    const time = ctx.currentTime + 0.01;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const tremolo = ctx.createOscillator();
    const tremoloDepth = ctx.createGain();
    source.buffer = this.noiseBuffer();
    source.loop = true;
    filter.type = 'bandpass';
    filter.frequency.value = 950;
    filter.Q.value = 0.6;
    tremolo.type = 'sine';
    tremolo.frequency.value = 6.2;
    tremoloDepth.gain.value = volume * 0.4;
    tremolo.connect(tremoloDepth);
    tremoloDepth.connect(gain.gain);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.28);
    gain.gain.setValueAtTime(volume, time + duration * 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    source.start(time);
    source.stop(time + duration + 0.1);
    tremolo.start(time);
    tremolo.stop(time + duration + 0.1);
  }
}

export default CityRushAudio;
