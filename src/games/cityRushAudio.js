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
// Le tōgé : eurobeat de montagne, 152 — le tempo des descentes de Initial D.
export const CITY_RUSH_TOUGE_BPM = 152;

export function cityRushMusicBpm(cityId) {
  if (cityId === 'route-66') return CITY_RUSH_ROUTE_66_BPM;
  if (cityId === 'nordschleife') return CITY_RUSH_NORDSCHLEIFE_BPM;
  if (cityId === 'touge') return CITY_RUSH_TOUGE_BPM;
  return CITY_RUSH_MUSIC_BPM[cityId] || CITY_RUSH_DEFAULT_BPM;
}

// La grille : 16 pas par mesure (doubles croches), boucle de 8 mesures.
const STEPS_PER_BAR = 16;
const BARS_PER_LOOP = 8;
export const CITY_RUSH_LOOP_STEPS = STEPS_PER_BAR * BARS_PER_LOOP;

// ── VICE CITY (Miami, Floride) ────────────────────────────────────────
// Progression disco d'origine, une mesure par accord : Dm7 · G7 · Cmaj7 · Am7.
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

// ── TOKYO · SHUTO EXPRESSWAY C1 (Japon) ───────────────────────────────
// Ambiance Eurobeat / synth-wave nocturne nippone sur l'anneau de la C1 :
// basse nerveuse en doubles croches (16th notes), cocotte staccato,
// progression rapide Am · F · G · Em et lead tranchant en quinte/octave.
const TOKYO_CHORDS = Object.freeze([
  Object.freeze({ root: 45, intervals: Object.freeze([0, 3, 7, 12]) }), // Am
  Object.freeze({ root: 41, intervals: Object.freeze([0, 4, 7, 12]) }), // F
  Object.freeze({ root: 43, intervals: Object.freeze([0, 4, 7, 12]) }), // G
  Object.freeze({ root: 40, intervals: Object.freeze([0, 3, 7, 12]) }), // Em
]);
const TOKYO_LEAD = Object.freeze([
  Object.freeze([69, 72, 76, 79, 76, 72, 74, 76]),
  Object.freeze([77, 76, 74, 72, 74, 76, 74, 72]),
  Object.freeze([79, 77, 76, 74, 76, 79, 81, 79]),
  Object.freeze([76, 74, 72, 71, 69, 71, 72, 69]),
]);

// ── PARIS · RIVE GAUCHE (France) ──────────────────────────────────────
// Valse / French touch nocturne mélancolique et élégante : temps fort marqué,
// accords veloutés en Dm · Gm · A7 · Dm, accordéon/piano feutré et lead expressif.
const PARIS_CHORDS = Object.freeze([
  Object.freeze({ root: 38, intervals: Object.freeze([0, 3, 7, 12]) }), // Dm
  Object.freeze({ root: 43, intervals: Object.freeze([0, 3, 7, 10]) }), // Gm7
  Object.freeze({ root: 45, intervals: Object.freeze([0, 4, 7, 10]) }), // A7
  Object.freeze({ root: 38, intervals: Object.freeze([0, 3, 7, 12]) }), // Dm
]);
const PARIS_LEAD = Object.freeze([
  Object.freeze([74, null, 77, 76, 74, null, 73, 74]),
  Object.freeze([79, null, 77, 76, 74, 76, 77, null]),
  Object.freeze([76, null, 74, 73, 71, 73, 74, 76]),
  Object.freeze([74, null, 72, 70, 69, 70, 72, 74]),
]);

// ── LONDRES · SOHO (Royaume-Uni) ──────────────────────────────────────
// Garage / UK drill / drum & bass syncopé : basse 808 reese profonde,
// hi-hats rapides en triolets/doubles, stabs dub percutants en Cm · Ab · Fm · G.
const LONDON_CHORDS = Object.freeze([
  Object.freeze({ root: 36, intervals: Object.freeze([0, 3, 7, 10]) }), // Cm7
  Object.freeze({ root: 44, intervals: Object.freeze([0, 4, 7, 11]) }), // Abmaj7
  Object.freeze({ root: 41, intervals: Object.freeze([0, 3, 7, 10]) }), // Fm7
  Object.freeze({ root: 43, intervals: Object.freeze([0, 4, 7, 10]) }), // G7
]);
const LONDON_LEAD = Object.freeze([
  Object.freeze([72, null, 75, null, 74, 72, 70, null]),
  Object.freeze([75, 77, 79, null, 77, 75, 74, null]),
  Object.freeze([72, null, 70, 72, 74, null, 72, 70]),
  Object.freeze([71, null, 74, null, 72, 71, 69, 71]),
]);

// ── NEW YORK · MIDTOWN (USA) ──────────────────────────────────────────
// Boom-bap / funk urbain new-yorkais des 90s : grosse caisse lourde syncopée,
// rim-shot tranchant, basse funk slappée et cuivres jazz nocturnes en Fm7 · Bbm7 · Eb7 · Abmaj7.
const NY_CHORDS = Object.freeze([
  Object.freeze({ root: 41, intervals: Object.freeze([0, 3, 7, 10]) }), // Fm7
  Object.freeze({ root: 46, intervals: Object.freeze([0, 3, 7, 10]) }), // Bbm7
  Object.freeze({ root: 39, intervals: Object.freeze([0, 4, 7, 10]) }), // Eb7
  Object.freeze({ root: 44, intervals: Object.freeze([0, 4, 7, 11]) }), // Abmaj7
]);
const NY_LEAD = Object.freeze([
  Object.freeze([77, null, 75, 72, 75, 77, null, 80]),
  Object.freeze([82, 80, 77, null, 75, 77, null, null]),
  Object.freeze([75, null, 78, 80, 78, 75, null, 77]),
  Object.freeze([75, 72, 70, 72, 75, null, null, null]),
]);

// ── ROUTE 66 · MOTHER ROAD (USA) ──────────────────────────────────────
// Blues rock américain poussiéreux : shuffle de batterie (charleston syncopé),
// basse boogie-woogie marchante en E blues, riffs d'orgue saturé.
const ROUTE_66_CHORDS = Object.freeze([
  Object.freeze({ root: 40, intervals: Object.freeze([0, 4, 7, 10]) }), // E7
  Object.freeze({ root: 45, intervals: Object.freeze([0, 4, 7, 10]) }), // A7
  Object.freeze({ root: 40, intervals: Object.freeze([0, 4, 7, 10]) }), // E7
  Object.freeze({ root: 47, intervals: Object.freeze([0, 4, 7, 10]) }), // B7
]);
const ROUTE_66_LEAD = Object.freeze([
  Object.freeze([76, null, 79, 81, 79, 76, 74, 76]),
  Object.freeze([81, null, 84, 86, 84, 81, 79, 81]),
  Object.freeze([76, 79, 81, 82, 81, 79, 76, null]),
  Object.freeze([83, 81, 79, 76, 74, 71, 74, 76]),
]);

// ── CARRETERA DEL SOL (Mexique) ───────────────────────────────────────
// Cumbia / mariachi ensoleillé : guitarrón rebondissant (temps 1 et 3),
// stabs de trompettes cuivrées ensoleillées et percussion maraca en G · C · D7 · G.
const MEXICO_CHORDS = Object.freeze([
  Object.freeze({ root: 43, intervals: Object.freeze([0, 4, 7, 12]) }), // G
  Object.freeze({ root: 48, intervals: Object.freeze([0, 4, 7, 12]) }), // C
  Object.freeze({ root: 38, intervals: Object.freeze([0, 4, 7, 10]) }), // D7
  Object.freeze({ root: 43, intervals: Object.freeze([0, 4, 7, 12]) }), // G
]);
const MEXICO_LEAD = Object.freeze([
  Object.freeze([74, 79, null, 79, 83, 81, 79, null]),
  Object.freeze([84, 83, 81, 79, 81, 84, null, null]),
  Object.freeze([86, null, 84, 83, 81, 79, 81, null]),
  Object.freeze([79, 74, 71, 74, 79, null, null, null]),
]);

// ── NÜRBURGRING NORDSCHLEIFE (Allemagne) ──────────────────────────────
// Kraftwerk / Krautrock / techno mécanique de l'Eifel : basse motorik
// hypnotique et droite, kick sec, résonances industrielles en Dm · Bb · Gm · A.
const NORDSCHLEIFE_CHORDS = Object.freeze([
  Object.freeze({ root: 38, intervals: Object.freeze([0, 3, 7, 12]) }), // Dm
  Object.freeze({ root: 46, intervals: Object.freeze([0, 4, 7, 12]) }), // Bb
  Object.freeze({ root: 43, intervals: Object.freeze([0, 3, 7, 12]) }), // Gm
  Object.freeze({ root: 45, intervals: Object.freeze([0, 4, 7, 12]) }), // A
]);
const NORDSCHLEIFE_LEAD = Object.freeze([
  Object.freeze([74, 74, 77, 74, 81, 77, 74, null]),
  Object.freeze([77, 77, 82, 77, 86, 82, 77, null]),
  Object.freeze([79, 79, 82, 79, 86, 82, 79, null]),
  Object.freeze([81, 81, 85, 81, 88, 85, 81, 77]),
]);
// ── MONT HARUNA (tōgé de nuit) ────────────────────────────────────────
// Eurobeat de descente : la mineur lancinante qui monte avec la révolution,
// puis F, G, E — la rondeur harmonique des compilations Super Eurobeat.
const TOUGE_CHORDS = Object.freeze([
  Object.freeze({ root: 45, intervals: Object.freeze([0, 3, 7, 12]) }), // Am
  Object.freeze({ root: 41, intervals: Object.freeze([0, 4, 7, 12]) }), // F
  Object.freeze({ root: 43, intervals: Object.freeze([0, 4, 7, 12]) }), // G
  Object.freeze({ root: 40, intervals: Object.freeze([0, 3, 7, 12]) }), // Em
]);
// Le thème : des croches qui grimpent la montagne et redescendent en glissant,
// comme la voiture dans les épingles.
const TOUGE_LEAD = Object.freeze([
  Object.freeze([69, 76, 72, 76, 69, 76, 72, 76]),
  Object.freeze([65, 72, 69, 72, 65, 72, 69, 72]),
  Object.freeze([67, 74, 71, 74, 67, 74, 71, 79]),
  Object.freeze([64, 71, 68, 71, 76, 74, 71, 68]),
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
    if (this.cityId === 'tokyo') { this.playTokyo(step, time); return; }
    if (this.cityId === 'paris') { this.playParis(step, time); return; }
    if (this.cityId === 'london') { this.playLondon(step, time); return; }
    if (this.cityId === 'new-york') { this.playNewYork(step, time); return; }
    if (this.cityId === 'route-66') { this.playRoute66(step, time); return; }
    if (this.cityId === 'mexico-countryside') { this.playMexico(step, time); return; }
    if (this.cityId === 'nordschleife') { this.playNordschleife(step, time); return; }
    if (this.cityId === 'touge') { this.playTouge(step, time); return; }
    this.playViceCity(step, time);
  }

  playViceCity(step, time) {
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

  // ── Japon · Shutō C1 (Eurobeat / Synth-wave nocturne) ───────────────
  playTokyo(step, time) {
    const bar = Math.floor(step / STEPS_PER_BAR) % BARS_PER_LOOP;
    const beat = step % STEPS_PER_BAR;
    const chord = TOKYO_CHORDS[bar % TOKYO_CHORDS.length];
    const stepLength = 60 / cityRushMusicBpm(this.cityId) / 4;

    // Kick 4-on-the-floor puissant
    if (beat % 4 === 0) {
      this.kick(time);
      this.noise(time, 0.02, 0.09, { type: 'highpass', frequency: 4500, destination: this.musicBus });
    }
    // Charleston rapide en doubles croches (16th hats) avec accent ouvert sur contretemps
    if (beat % 2 === 1) {
      this.hat(time, false);
    } else if (beat % 4 === 2) {
      this.hat(time, true);
    }
    // Caisse claire synthé agressive sur temps 2 et 4
    if (beat === 4 || beat === 12) {
      this.tone(210, time, 0.08, 'triangle', 0.18, { filter: 1400, destination: this.musicBus });
      this.noise(time, 0.14, 0.22, { type: 'bandpass', frequency: 1900, q: 1.2, destination: this.musicBus });
    }
    // Basse Eurobeat rapide en doubles croches (octaves et rebonds)
    const tokyoBassOffsets = [0, 12, 0, 12, 0, 7, 12, 0, 0, 12, 0, 12, 7, 12, 10, 12];
    const bassOffset = tokyoBassOffsets[beat];
    this.tone(midiToFrequency(chord.root + bassOffset), time, stepLength * 0.75, 'sawtooth', 0.18, {
      filter: 1100, filterTo: 350, attack: 0.005, destination: this.musicBus,
    });
    // Stabs synthé super-saw typiques Initial D sur contretemps
    if ([2, 6, 8, 10, 14].includes(beat)) {
      chord.intervals.forEach((interval) => {
        this.tone(midiToFrequency(chord.root + 12 + interval), time, stepLength * 1.1, 'sawtooth', 0.055, {
          filter: 3600, filterTo: 1200, attack: 0.006, detune: 9, destination: this.musicBus,
        });
      });
    }
    // Lead de course sur la seconde moitié
    if (bar >= 4 && beat % 2 === 0) {
      const note = TOKYO_LEAD[(bar - 4) % TOKYO_LEAD.length][beat / 2];
      if (note) {
        this.tone(midiToFrequency(note), time, stepLength * 1.8, 'sawtooth', 0.12, {
          filter: 4800, filterTo: 2200, attack: 0.008, destination: this.musicBus,
        });
        this.tone(midiToFrequency(note + 12), time + 0.004, stepLength * 1.2, 'square', 0.035, {
          filter: 5400, destination: this.musicBus,
        });
      }
    }
    if (step === 0) this.crash(time);
  }

  // ── France · Paris Rive Gauche (Valse / French Touch nocturne) ──────
  playParis(step, time) {
    const bar = Math.floor(step / STEPS_PER_BAR) % BARS_PER_LOOP;
    const beat = step % STEPS_PER_BAR;
    const chord = PARIS_CHORDS[bar % PARIS_CHORDS.length];
    const stepLength = 60 / cityRushMusicBpm(this.cityId) / 4;

    // Rythme élégant : kick velouté sur temps 1 et demi-mesure (temps 3)
    if (beat === 0 || beat === 8) {
      this.tone(115, time, 0.12, 'sine', 0.45, { destination: this.musicBus });
      this.tone(48, time + 0.02, 0.18, 'sine', 0.25, { destination: this.musicBus });
    }
    // Charleston doux et brossé
    if (beat % 2 === 0) {
      this.noise(time, beat === 14 ? 0.12 : 0.04, 0.055, {
        type: 'highpass', frequency: 7800, destination: this.musicBus,
      });
    }
    // Claquement doux feutré sur 4 et 12
    if (beat === 4 || beat === 12) {
      this.noise(time, 0.08, 0.14, { type: 'bandpass', frequency: 1600, q: 0.9, destination: this.musicBus });
    }
    // Basse ronde jazz/French touch
    if (beat === 0 || beat === 6 || beat === 10) {
      const noteMidi = chord.root + (beat === 6 ? 7 : beat === 10 ? 12 : 0);
      this.tone(midiToFrequency(noteMidi), time, stepLength * 2.2, 'triangle', 0.22, {
        destination: this.musicBus,
      });
    }
    // Nappe d'accordéon / Rhodes mélancolique sur les temps 2 et 4
    if (beat === 4 || beat === 10) {
      chord.intervals.forEach((interval, idx) => {
        this.tone(midiToFrequency(chord.root + 12 + interval), time, stepLength * 2.8, 'sawtooth', 0.045, {
          filter: 1200, attack: 0.04, detune: idx % 2 ? 6 : -6, destination: this.musicBus,
        });
      });
    }
    // Mélodie poétique de violon / synthé vintage
    if (bar >= 4 && beat % 2 === 0) {
      const note = PARIS_LEAD[(bar - 4) % PARIS_LEAD.length][beat / 2];
      if (note) {
        this.tone(midiToFrequency(note), time, stepLength * 1.9, 'sine', 0.14, {
          destination: this.musicBus,
        });
        this.tone(midiToFrequency(note), time + 0.01, stepLength * 1.8, 'triangle', 0.08, {
          filter: 2400, destination: this.musicBus,
        });
      }
    }
    if (step === 0) this.crash(time);
  }

  // ── Royaume-Uni · Londres Soho (UK Garage / Bassline) ────────────────
  playLondon(step, time) {
    const bar = Math.floor(step / STEPS_PER_BAR) % BARS_PER_LOOP;
    const beat = step % STEPS_PER_BAR;
    const chord = LONDON_CHORDS[bar % LONDON_CHORDS.length];
    const stepLength = 60 / cityRushMusicBpm(this.cityId) / 4;

    // Kick 2-step syncopé : pas sur chaque temps, mais avec rebond sur beat 6 ou 7
    if (beat === 0 || beat === 6 || beat === 10) {
      this.kick(time);
    }
    // Rimshot percutant UK garage
    if (beat === 4 || beat === 12) {
      this.tone(340, time, 0.04, 'triangle', 0.15, { destination: this.musicBus });
      this.noise(time, 0.07, 0.24, { type: 'bandpass', frequency: 2800, q: 2.1, destination: this.musicBus });
    }
    // Hi-hats syncopés et sautillants en croches/doubles
    if (beat % 2 === 1 || beat === 2 || beat === 8 || beat === 14) {
      this.hat(time, beat === 14 || beat === 6);
    }
    // Basse Reese / sub 808 profonde et modulée
    if (beat === 2 || beat === 6 || beat === 8 || beat === 12) {
      const noteMidi = chord.root + (beat === 6 ? 10 : beat === 12 ? 7 : 0);
      this.tone(midiToFrequency(noteMidi), time, stepLength * 2, 'sawtooth', 0.22, {
        filter: 620, filterTo: 220, attack: 0.01, destination: this.musicBus,
      });
      this.tone(midiToFrequency(noteMidi) / 2, time, stepLength * 2, 'sine', 0.28, {
        destination: this.musicBus,
      });
    }
    // Dub stabs d'orgue M1 caractéristiques de Londres
    if (beat === 3 || beat === 7 || beat === 11 || beat === 15) {
      chord.intervals.forEach((interval) => {
        this.tone(midiToFrequency(chord.root + 24 + interval), time, stepLength * 0.9, 'triangle', 0.08, {
          filter: 2800, filterTo: 800, attack: 0.005, destination: this.musicBus,
        });
      });
    }
    // Lead underground syncopé
    if (bar >= 4 && beat % 2 === 0) {
      const note = LONDON_LEAD[(bar - 4) % LONDON_LEAD.length][beat / 2];
      if (note) {
        this.tone(midiToFrequency(note), time, stepLength * 1.5, 'square', 0.09, {
          filter: 3200, filterTo: 1400, destination: this.musicBus,
        });
      }
    }
    if (step === 0) this.crash(time);
  }

  // ── USA · New York Midtown (Boom-Bap / Urban Jazz-Funk) ─────────────
  playNewYork(step, time) {
    const bar = Math.floor(step / STEPS_PER_BAR) % BARS_PER_LOOP;
    const beat = step % STEPS_PER_BAR;
    const chord = NY_CHORDS[bar % NY_CHORDS.length];
    const stepLength = 60 / cityRushMusicBpm(this.cityId) / 4;

    // Kick boom-bap lourd (temps 1, contretemps syncopé)
    if (beat === 0 || beat === 6 || beat === 10) {
      this.tone(140, time, 0.14, 'sine', 0.58, { destination: this.musicBus });
      this.tone(42, time + 0.015, 0.22, 'sine', 0.32, { destination: this.musicBus });
    }
    // Caisse claire claquante de rue sur 4 et 12
    if (beat === 4 || beat === 12) {
      this.tone(180, time, 0.09, 'triangle', 0.16, { destination: this.musicBus });
      this.noise(time, 0.11, 0.26, { type: 'bandpass', frequency: 1600, q: 1.0, destination: this.musicBus });
    }
    // Shaker / Hi-hat jazzy new-yorkais
    if (beat % 2 === 0) {
      this.noise(time, 0.035, 0.065, { type: 'highpass', frequency: 8500, destination: this.musicBus });
    }
    // Ligne de basse funk slappée urbaine
    const nyBassMap = [0, null, 12, null, 0, 7, 10, null, 12, null, 7, 5, 0, null, 7, 10];
    const bassInt = nyBassMap[beat];
    if (bassInt !== null && bassInt !== undefined) {
      this.tone(midiToFrequency(chord.root + bassInt), time, stepLength * 1.4, 'sawtooth', 0.19, {
        filter: 750, filterTo: 350, attack: 0.008, destination: this.musicBus,
      });
      this.tone(midiToFrequency(chord.root + bassInt), time, stepLength * 1.2, 'sine', 0.16, {
        destination: this.musicBus,
      });
    }
    // Cuivres jazz nocturnes sur accords de 7e
    if (beat === 2 || beat === 8 || beat === 14) {
      chord.intervals.forEach((interval) => {
        this.tone(midiToFrequency(chord.root + 12 + interval), time, stepLength * 1.8, 'sawtooth', 0.05, {
          filter: 2100, filterTo: 900, attack: 0.02, destination: this.musicBus,
        });
      });
    }
    // Lead cuivré / trompette urbaine
    if (bar >= 4 && beat % 2 === 0) {
      const note = NY_LEAD[(bar - 4) % NY_LEAD.length][beat / 2];
      if (note) {
        this.tone(midiToFrequency(note), time, stepLength * 1.6, 'sawtooth', 0.095, {
          filter: 3200, filterTo: 1800, attack: 0.015, destination: this.musicBus,
        });
      }
    }
    if (step === 0) this.crash(time);
  }

  // ── USA · Historic Route 66 (Blues-Rock / Boogie-Woogie) ────────────
  playRoute66(step, time) {
    const bar = Math.floor(step / STEPS_PER_BAR) % BARS_PER_LOOP;
    const beat = step % STEPS_PER_BAR;
    const chord = ROUTE_66_CHORDS[bar % ROUTE_66_CHORDS.length];
    const stepLength = 60 / cityRushMusicBpm(this.cityId) / 4;

    // Batterie blues-rock : grosse caisse sur 0 et 8, caisse claire sur 4 et 12
    if (beat === 0 || beat === 8) {
      this.tone(125, time, 0.12, 'sine', 0.5, { destination: this.musicBus });
      this.tone(50, time + 0.02, 0.18, 'sine', 0.22, { destination: this.musicBus });
    }
    if (beat === 4 || beat === 12) {
      this.tone(195, time, 0.08, 'triangle', 0.14, { destination: this.musicBus });
      this.noise(time, 0.1, 0.22, { type: 'bandpass', frequency: 1800, q: 1.1, destination: this.musicBus });
    }
    // Shuffle de ride/charleston boogie (croches balancées)
    if ([0, 3, 4, 7, 8, 11, 12, 15].includes(beat)) {
      this.noise(time, 0.04, 0.05, { type: 'highpass', frequency: 7000, destination: this.musicBus });
    }
    // Walking bass / boogie blues marchant
    const boogieIntervals = [0, 4, 7, 9, 10, 9, 7, 4];
    if (beat % 2 === 0) {
      const boogieNote = chord.root + boogieIntervals[(beat / 2) % 8];
      this.tone(midiToFrequency(boogieNote), time, stepLength * 1.5, 'triangle', 0.22, {
        destination: this.musicBus,
      });
      this.tone(midiToFrequency(boogieNote), time, stepLength * 1.0, 'sawtooth', 0.08, {
        filter: 480, destination: this.musicBus,
      });
    }
    // Accords d'orgue Hammond / guitare blues saturée
    if (beat === 2 || beat === 6 || beat === 10 || beat === 14) {
      chord.intervals.forEach((interval) => {
        this.tone(midiToFrequency(chord.root + 12 + interval), time, stepLength * 1.2, 'sawtooth', 0.045, {
          filter: 1800, filterTo: 900, attack: 0.01, destination: this.musicBus,
        });
      });
    }
    // Solo de guitare blues / harmonica sur la 2e partie
    if (bar >= 4 && beat % 2 === 0) {
      const note = ROUTE_66_LEAD[(bar - 4) % ROUTE_66_LEAD.length][beat / 2];
      if (note) {
        this.tone(midiToFrequency(note), time, stepLength * 1.8, 'sawtooth', 0.11, {
          filter: 3400, filterTo: 1600, attack: 0.01, destination: this.musicBus,
        });
        this.tone(midiToFrequency(note), time + 0.008, stepLength * 1.6, 'square', 0.03, {
          filter: 2600, destination: this.musicBus,
        });
      }
    }
    if (step === 0) this.crash(time);
  }

  // ── Mexique · Carretera del Sol (Cumbia / Mariachi ensoleillé) ──────
  playMexico(step, time) {
    const bar = Math.floor(step / STEPS_PER_BAR) % BARS_PER_LOOP;
    const beat = step % STEPS_PER_BAR;
    const chord = MEXICO_CHORDS[bar % MEXICO_CHORDS.length];
    const stepLength = 60 / cityRushMusicBpm(this.cityId) / 4;

    // Tambora mexicaine / percussion cumbia sur temps 1 et 3
    if (beat === 0 || beat === 8) {
      this.tone(100, time, 0.16, 'sine', 0.45, { destination: this.musicBus });
      this.tone(55, time + 0.02, 0.2, 'sine', 0.28, { destination: this.musicBus });
    }
    // Güiro / Maracas frottées sur chaque contretemps
    if (beat % 2 === 1) {
      this.noise(time, 0.035, 0.065, { type: 'bandpass', frequency: 3800, q: 1.4, destination: this.musicBus });
    }
    // Guitarrón bondissant mexicain
    if (beat === 0 || beat === 6 || beat === 8 || beat === 14) {
      const rootNote = chord.root + (beat === 6 || beat === 14 ? 7 : 0);
      this.tone(midiToFrequency(rootNote), time, stepLength * 1.7, 'triangle', 0.24, {
        destination: this.musicBus,
      });
      this.tone(midiToFrequency(rootNote), time, stepLength * 1.2, 'sine', 0.15, {
        destination: this.musicBus,
      });
    }
    // Vihuela / Stabs de trompette mariachi festive
    if (beat === 3 || beat === 7 || beat === 11 || beat === 15) {
      chord.intervals.forEach((interval) => {
        this.tone(midiToFrequency(chord.root + 24 + interval), time, stepLength * 1.1, 'sawtooth', 0.065, {
          filter: 3400, filterTo: 1400, attack: 0.008, destination: this.musicBus,
        });
      });
    }
    // Refrain enjoué de trompettes mexicaines
    if (bar >= 4 && beat % 2 === 0) {
      const note = MEXICO_LEAD[(bar - 4) % MEXICO_LEAD.length][beat / 2];
      if (note) {
        this.tone(midiToFrequency(note), time, stepLength * 1.7, 'sawtooth', 0.13, {
          filter: 3800, filterTo: 2200, attack: 0.012, destination: this.musicBus,
        });
        this.tone(midiToFrequency(note + 4), time + 0.005, stepLength * 1.6, 'sawtooth', 0.07, {
          filter: 3400, attack: 0.012, destination: this.musicBus,
        });
      }
    }
    if (step === 0) this.crash(time);
  }

  // ── Allemagne · Nürburgring Nordschleife (Krautrock / Techno Motorik) 
  playNordschleife(step, time) {
    const bar = Math.floor(step / STEPS_PER_BAR) % BARS_PER_LOOP;
    const beat = step % STEPS_PER_BAR;
    const chord = NORDSCHLEIFE_CHORDS[bar % NORDSCHLEIFE_CHORDS.length];
    const stepLength = 60 / cityRushMusicBpm(this.cityId) / 4;

    // Kick techno sec et précis sur les 4 temps
    if (beat % 4 === 0) {
      this.tone(150, time, 0.09, 'sine', 0.52, { destination: this.musicBus });
      this.tone(50, time + 0.01, 0.14, 'sine', 0.28, { destination: this.musicBus });
      this.noise(time, 0.02, 0.08, { type: 'highpass', frequency: 3200, destination: this.musicBus });
    }
    // Charleston mécanique et rigide
    if (beat % 2 === 1) {
      this.noise(time, 0.025, 0.05, { type: 'highpass', frequency: 9500, destination: this.musicBus });
    } else if (beat % 4 === 2) {
      this.noise(time, 0.06, 0.07, { type: 'highpass', frequency: 7500, destination: this.musicBus });
    }
    // Clac industriel sur 4 et 12
    if (beat === 4 || beat === 12) {
      this.tone(260, time, 0.05, 'triangle', 0.12, { destination: this.musicBus });
      this.noise(time, 0.08, 0.18, { type: 'bandpass', frequency: 2400, q: 2.5, destination: this.musicBus });
    }
    // Basse motorik allemande métronomique continue (croches pulsées)
    if (beat % 2 === 0) {
      const motorikNote = chord.root + (beat === 8 || beat === 14 ? 7 : 0);
      this.tone(midiToFrequency(motorikNote), time, stepLength * 1.6, 'sawtooth', 0.18, {
        filter: 800, filterTo: 300, attack: 0.005, destination: this.musicBus,
      });
      this.tone(midiToFrequency(motorikNote) / 2, time, stepLength * 1.6, 'sine', 0.15, {
        destination: this.musicBus,
      });
    }
    // Arpège de synthé modulaire / séquenceur analogique allemand
    const krautArp = [0, 7, 12, 7, 0, 7, 12, 15];
    const arpInt = krautArp[(beat / 2) % 8];
    if (beat % 2 === 0) {
      this.tone(midiToFrequency(chord.root + 12 + arpInt), time, stepLength * 0.9, 'triangle', 0.07, {
        filter: 2200, attack: 0.004, destination: this.musicBus,
      });
    }
    // Thème d'autoroute / ring futuriste précis
    if (bar >= 4 && beat % 2 === 0) {
      const note = NORDSCHLEIFE_LEAD[(bar - 4) % NORDSCHLEIFE_LEAD.length][beat / 2];
      if (note) {
        this.tone(midiToFrequency(note), time, stepLength * 1.7, 'square', 0.09, {
          filter: 3600, filterTo: 1800, attack: 0.006, destination: this.musicBus,
        });
        this.tone(midiToFrequency(note + 12), time + 0.004, stepLength * 1.2, 'sawtooth', 0.035, {
          filter: 4200, destination: this.musicBus,
        });
      }
    }
    if (step === 0) this.crash(time);
  }

  playTouge(step, time) {
    const bar = Math.floor(step / STEPS_PER_BAR) % BARS_PER_LOOP;
    const beat = step % STEPS_PER_BAR;
    const chord = TOUGE_CHORDS[bar % TOUGE_CHORDS.length];
    const stepLength = 60 / cityRushMusicBpm(this.cityId) / 4;

    // Kick eurobeat : quatre au plancher, nerveux.
    if (beat % 4 === 0) {
      this.tone(158, time, 0.08, 'sine', 0.5, { destination: this.musicBus });
      this.tone(52, time + 0.008, 0.12, 'sine', 0.3, { destination: this.musicBus });
      this.noise(time, 0.02, 0.07, { type: 'highpass', frequency: 3400, destination: this.musicBus });
    }
    // Contretemps ouvert : le « un-TCHAK » qui fait tourner les phares.
    if (beat % 4 === 2) this.hat(time, true);
    else if (beat % 2 === 1) this.noise(time, 0.02, 0.045, { type: 'highpass', frequency: 9800, destination: this.musicBus });
    // Clap sur 2 et 4.
    if (beat === 4 || beat === 12) this.clap(time);
    // Basse en octaves roulantes : le moteur de la piste de danse.
    if (beat % 2 === 0) {
      const octave = (beat / 2) % 2 === 0 ? 0 : 12;
      this.tone(midiToFrequency(chord.root + octave), time, stepLength * 1.35, 'sawtooth', 0.2, {
        filter: 900, filterTo: 420, attack: 0.004, destination: this.musicBus,
      });
      this.tone(midiToFrequency(chord.root + octave - 12), time, stepLength * 1.35, 'sine', 0.16, {
        destination: this.musicBus,
      });
    }
    // Stabs de cordes eurobeat sur les contretemps de la mesure.
    if (beat === 2 || beat === 6 || beat === 10 || beat === 14) {
      this.stab(chord, time, beat === 14 ? 0.7 : 0.85);
    }
    // Le thème n'entre qu'à la moitié de la boucle : d'abord la montée,
    // ensuite la descente grinçante dans les épingles.
    if (bar >= 4 && beat % 2 === 0) {
      const note = TOUGE_LEAD[(bar - 4) % TOUGE_LEAD.length][beat / 2];
      if (note) {
        this.tone(midiToFrequency(note), time, stepLength * 1.5, 'sawtooth', 0.085, {
          filter: 3200, filterTo: 1900, attack: 0.005, destination: this.musicBus,
        });
        this.tone(midiToFrequency(note - 12), time + 0.004, stepLength * 1.2, 'square', 0.03, {
          filter: 2600, destination: this.musicBus,
        });
      }
    }
    // La cloche du tunnel : une fois par boucle, haute et lointaine.
    if (step === 0) {
      this.crash(time);
      this.tone(midiToFrequency(93), time + stepLength * 2, 0.5, 'triangle', 0.05, {
        filter: 5200, attack: 0.002, destination: this.musicBus,
      });
    }
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
   * Fusil à pompe : un coup de tonnerre court et gras — le grave qui vide les
   * enceintes, le claquement sec de la gerbe, l'écho entre les façades — puis
   * le **réarmement**, deux claquements métalliques de pompe qui annoncent
   * que l'arme est de nouveau prête. Panoramiqué sur la voie du tireur.
   */
  shotgun({ pan = 0, delay = 0 } = {}) {
    if (!this.ready()) return;
    const time = this.context.currentTime + 0.005 + Math.max(0, delay);
    const out = this.panned(pan);
    // Le souffle : une grosse bourre de bruit qui descend très vite du médium
    // vers le grave, plus longue et plus ronde qu'une balle d'AK-47.
    this.noise(time, 0.44, 0.62, { type: 'lowpass', frequency: 2400, frequencyTo: 220, destination: out });
    // Le claquement : l'attaque sèche qui claque au-dessus du grave.
    this.noise(time, 0.13, 0.5, { type: 'highpass', frequency: 1900, destination: out });
    // La caisse : le corps de la détonation, une descente de 120 à 45 Hz.
    this.tone(120, time, 0.34, 'sine', 0.46, { filter: 900, filterTo: 140, destination: out });
    this.tone(64, time + 0.015, 0.42, 'sine', 0.34, { destination: out });
    // L'écho entre les immeubles, un peu plus large que celui du pistolet.
    this.noise(time + 0.19, 0.5, 0.11, { type: 'lowpass', frequency: 800, destination: out });
    this.noise(time + 0.38, 0.36, 0.05, { type: 'lowpass', frequency: 520, destination: out });
    // Le réarmement : la pompe tirée puis repoussée, deux clics métalliques
    // brefs et très sélectifs (Q élevé), assez tard pour s'entendre.
    for (const [offset, frequency] of [[0.46, 2600], [0.62, 3400]]) {
      this.noise(time + offset, 0.07, 0.2, { type: 'bandpass', frequency, q: 9, destination: out });
      this.tone(frequency / 12, time + offset, 0.06, 'square', 0.06, { filter: 4200, destination: out });
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
    const root = { 'blue-shot': 60, pistol: 64, bazooka: 55, boost: 69, radio: 74, health: 76 }[type] ?? 69;
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

  /**
   * Sortie de mini-garage : l'atelier remet la coque à neuf. Le pont
   * hydraulique qui monte, la clé à chocs qui déboulonne (cliquetis de plus en
   * plus serrés), deux clés qui s'entrechoquent, le capot que le mécano
   * rabat — et, seulement si des points de vie ont vraiment été rendus, trois
   * notes claires qui disent « elle est réparée ». Coque déjà intacte,
   * l'atelier ne fait que vérifier : pas d'accord de confirmation.
   */
  garageRepair({ pan = 0, restored = 0 } = {}) {
    if (!this.ready()) return;
    const ctx = this.context;
    const time = ctx.currentTime + 0.005;
    const out = this.panned(pan);
    const repaired = Math.max(0, Math.round(Number(restored) || 0)) > 0;

    // Le pont élévateur : appel d'air grave qui monte, pompe qui se met en route.
    this.noise(time, 0.52, 0.15, {
      type: 'bandpass', frequency: 620, frequencyTo: 2400, q: 0.9, destination: out,
    });
    this.tone(88, time, 0.34, 'sine', 0.12, { filter: 320, destination: out });

    // La clé à chocs : huit coups de cliquet, de plus en plus rapprochés.
    const ratchet = [0, 0.055, 0.1, 0.14, 0.185, 0.225, 0.26, 0.3];
    ratchet.forEach((offset, index) => {
      const at = time + 0.08 + offset;
      const tighten = 1 - index / (ratchet.length * 1.6);
      this.noise(at, 0.055, 0.12 + tighten * 0.05, {
        type: 'bandpass', frequency: 1900 + index * 190, q: 2.4, destination: out,
      });
      this.tone(300 + index * 26, at, 0.05, 'square', 0.05, {
        filter: 2600, attack: 0.002, destination: out,
      });
    });

    // L'outil qu'on repose sur l'établi : deux claquements métalliques.
    this.noise(time + 0.46, 0.09, 0.15, { type: 'highpass', frequency: 3400, destination: out });
    this.tone(1180, time + 0.46, 0.12, 'square', 0.055, {
      filter: 5200, attack: 0.002, destination: out,
    });
    this.tone(1570, time + 0.5, 0.1, 'square', 0.04, {
      filter: 6000, attack: 0.002, destination: out,
    });

    // Le capot claque : la voiture est prête à repartir.
    this.tone(120, time + 0.6, 0.22, 'sine', 0.22, {
      filter: 420, filterTo: 70, destination: out,
    });
    this.noise(time + 0.6, 0.14, 0.17, {
      type: 'bandpass', frequency: 1500, frequencyTo: 700, q: 1.8, destination: out,
    });

    // Accord de « réparée » : il ne retentit que si la coque a repris des points.
    if (repaired) {
      [76, 81, 88].forEach((note, index) => {
        this.tone(midiToFrequency(note), time + 0.74 + index * 0.09, 0.42, 'triangle', 0.1, {
          filter: 6000, destination: out,
        });
      });
      this.noise(time + 0.74, 0.3, 0.05, { type: 'highpass', frequency: 6200, destination: out });
    }
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
