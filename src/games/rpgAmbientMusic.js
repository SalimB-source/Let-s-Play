/**
 * Musiques d'ambiance — Le Sablier (mode Histoire, les Tours de Bab El).
 *
 * Cinq ambiances, une par tour, toutes **synthétisées en WebAudio** : zéro
 * fichier à charger (convention du dépôt, voir `cityRushAudio.js` et `rpgAudio.js`),
 * donc rien ne se charge en silence et le bundle ne grossit pas.
 *
 * L'esthétique suit la direction artistique du projet (dossier `docs/rpg/`) :
 *  - triangles filtrés et attaques feutrées pour les matières de la ville ;
 *  - cloches à partiels pour l'Astrolabe et les appels lointains ;
 *  - souffle bruité, finement filtré, pour le sable, l'eau et le vent ;
 *  - une réverbération stéréo générée localement, légère sous les bruitages.
 *
 * Le contrat de la classe est le même que `CityRushAudio` :
 *   - `setTour(tourId)` change la tour en cours (et donc la boucle) ;
 *   - `start()` / `stop()` / `pause()` / `resume()` pilotent la lecture ;
 *   - `setMuted(muted)` coupe la musique sans détruire les nœuds ;
 *   - la musique est une boucle de 8 mesures à 16 pas par mesure, programmée
 *     pas-à-pas par un setInterval (pas de création d'oscillateur par frame).
 */

// ── Constantes rythmiques ─────────────────────────────────────────────
const STEPS_PER_BAR = 16;
const BARS_PER_LOOP = 8;
export const RPG_AMBIENT_LOOP_STEPS = STEPS_PER_BAR * BARS_PER_LOOP;

// Tempo propre à chaque tour (BPM). Plus bas que la course — c'est un duel
// de cartes, une tension qui monte lentement, pas une poursuite.
export const RPG_AMBIENT_BPM = Object.freeze({
  'tour-des-listes': 78,   // lent, administratif, tic-tac métronomique
  'tour-du-souk': 92,      // marchandage animé mais pas pressé
  'tour-des-sables': 70,   // très lent, solennel, fin des choses
  'tour-des-abysses': 66,  // immersion sous l'eau, tempo flottant
  'tour-des-corsaires': 96, // rameurs, tambour de bord et abordage
  'tour-du-fjord': 84,     // vent du nord, pas cadencé d'une garde
  'tour-du-soleil-rouge': 88, // martial, koto et braises du mont ardent
  'tour-de-la-necropole': 64, // funéraire, sistre et murmure des tombes
});
export const RPG_AMBIENT_DEFAULT_BPM = 78;

// Niveaux : la musique d'ambiance reste sous les bruitages du duel.
const MUSIC_VOLUME = 0.16;
const DRONE_VOLUME = 0.10;
const MASTER_VOLUME = 0.95;
const AMBIENT_REVERB_SECONDS = 0.82;
const AMBIENT_REVERB_SEND = 0.14;
const AMBIENT_REVERB_RETURN = 0.2;

const midiToFrequency = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

/** Petite réverbération de salle, calculée une seule fois par lecteur. */
function makeAmbientImpulse(context) {
  if (typeof context.createBuffer !== 'function' || !context.sampleRate) return null;
  const length = Math.max(1, Math.floor(context.sampleRate * AMBIENT_REVERB_SECONDS));
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const samples = impulse.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      const tail = (1 - index / length) ** 3.8;
      samples[index] = (Math.random() * 2 - 1) * tail * (channel === 0 ? 0.97 : 1.03);
    }
  }
  return impulse;
}

// ── Progressions harmoniques ──────────────────────────────────────────
// Chaque tour a une grille de 4 accords sur 8 mesures (deux mesures par
// accord, en général) pour donner une respiration lente. Les `root` sont
// des numéros MIDI, les `intervals` sont les demi-tons au-dessus.

// Tour des Listes : gamme mineure descendante, administrative et froide.
// Dm  ·  Bb  ·  F  ·  Am — comme une plume qui gratte le registre.
const LISTES_CHORDS = Object.freeze([
  Object.freeze({ root: 50, intervals: Object.freeze([0, 3, 7, 12]) }), // Dm
  Object.freeze({ root: 46, intervals: Object.freeze([0, 4, 7, 12]) }), // Bb
  Object.freeze({ root: 53, intervals: Object.freeze([0, 4, 7, 12]) }), // F
  Object.freeze({ root: 45, intervals: Object.freeze([0, 3, 7, 12]) }), // Am
]);

// Tour du Souk : coloration orientale, un balancement qui tourne comme
// les caravanes — Em · F · Am · G, avec des secondes pour le soleil.
const SOUK_CHORDS = Object.freeze([
  Object.freeze({ root: 40, intervals: Object.freeze([0, 3, 7, 14]) }), // Em9
  Object.freeze({ root: 41, intervals: Object.freeze([0, 4, 7, 12]) }), // F
  Object.freeze({ root: 45, intervals: Object.freeze([0, 3, 7, 12]) }), // Am
  Object.freeze({ root: 43, intervals: Object.freeze([0, 4, 7, 10]) }), // G7
]);

// Tour des Sables : la fin. Très grave, très large, solennel — Dm · Gm ·
// Bb · A, tenus longs, le zénith du soleil sur le portail.
const SABLES_CHORDS = Object.freeze([
  Object.freeze({ root: 38, intervals: Object.freeze([0, 3, 7, 10]) }), // Dm7
  Object.freeze({ root: 43, intervals: Object.freeze([0, 3, 7, 10]) }), // Gm7
  Object.freeze({ root: 46, intervals: Object.freeze([0, 4, 7, 12]) }), // Bb
  Object.freeze({ root: 45, intervals: Object.freeze([0, 4, 9, 12]) }), // A
]);

// Tour des Abysses : accords flottants, renversés, beaucoup de vide —
// Cm  ·  Ab  ·  Eb  ·  Bb, le ressac qui revient sans crier gare.
const ABYSSES_CHORDS = Object.freeze([
  Object.freeze({ root: 36, intervals: Object.freeze([0, 3, 7, 10]) }), // Cm7
  Object.freeze({ root: 44, intervals: Object.freeze([0, 4, 7, 11]) }), // Abmaj7
  Object.freeze({ root: 39, intervals: Object.freeze([0, 3, 7, 10]) }), // Ebm7
  Object.freeze({ root: 46, intervals: Object.freeze([0, 4, 7, 10]) }), // Bb7
]);

// Tour du Fjord : mineur nordique, large et droit comme le bouclier —
// Dm  ·  F  ·  C  ·  Gm, un pas cadencé qui monte vers le père des corbeaux.
const FJORD_CHORDS = Object.freeze([
  Object.freeze({ root: 50, intervals: Object.freeze([0, 3, 7, 12]) }), // Dm
  Object.freeze({ root: 53, intervals: Object.freeze([0, 4, 7, 12]) }), // F
  Object.freeze({ root: 48, intervals: Object.freeze([0, 4, 7, 12]) }), // C
  Object.freeze({ root: 43, intervals: Object.freeze([0, 3, 7, 10]) }), // Gm7
]);

// Tour du Soleil rouge : mode japonais Insen martial — Dm · Bb · Gm · A(b9).
const SOLEIL_CHORDS = Object.freeze([
  Object.freeze({ root: 50, intervals: Object.freeze([0, 1, 7, 12]) }), // D insen
  Object.freeze({ root: 46, intervals: Object.freeze([0, 4, 7, 12]) }), // Bb
  Object.freeze({ root: 43, intervals: Object.freeze([0, 3, 7, 10]) }), // Gm
  Object.freeze({ root: 45, intervals: Object.freeze([0, 4, 7, 13]) }), // A(b9)
]);

// Tour de la Nécropole : phrygien dominant égyptien, solennel et funéraire — E · F · Am · B7.
const NECROPOLE_CHORDS = Object.freeze([
  Object.freeze({ root: 40, intervals: Object.freeze([0, 4, 7, 11]) }), // Emaj7
  Object.freeze({ root: 41, intervals: Object.freeze([0, 3, 7, 10]) }), // Fm
  Object.freeze({ root: 45, intervals: Object.freeze([0, 3, 7, 12]) }), // Am
  Object.freeze({ root: 47, intervals: Object.freeze([0, 4, 7, 10]) }), // B7
]);

// ── Mélodies d'ambiance (quelques notes éparses, jamais envahissantes) ─
// Elles n'entrent qu'aux mesures 5-8 pour que le début de boucle serve
// d'intro, et elles restent clairsemées (max une note tous les 2 temps).

const LISTES_LEAD = Object.freeze([
  Object.freeze([null, 62, null, 64, null, null, 65, null]),
  Object.freeze([null, 64, null, null, 62, null, 60, null]),
  Object.freeze([null, 65, null, 64, null, null, null, 60]),
  Object.freeze([null, null, 62, null, null, 57, null, null]),
]);

const SOUK_LEAD = Object.freeze([
  Object.freeze([null, 64, null, null, 67, null, null, null]),
  Object.freeze([69, null, null, 67, null, 64, null, null]),
  Object.freeze([null, null, 69, null, null, 67, 65, null]),
  Object.freeze([64, null, null, null, 62, null, null, null]),
]);

const SABLES_LEAD = Object.freeze([
  Object.freeze([null, null, 62, null, null, null, 65, null]),
  Object.freeze([null, null, null, 67, null, null, null, 65]),
  Object.freeze([null, 62, null, null, null, 64, null, null]),
  Object.freeze([null, null, 60, null, null, null, null, null]),
]);

const ABYSSES_LEAD = Object.freeze([
  Object.freeze([null, 60, null, null, null, 63, null, null]),
  Object.freeze([null, null, 67, null, null, null, 65, null]),
  Object.freeze([null, 63, null, null, null, null, 60, null]),
  Object.freeze([null, null, null, 58, null, null, null, null]),
]);

const FJORD_LEAD = Object.freeze([
  Object.freeze([null, 62, null, null, 64, null, 67, null]),
  Object.freeze([null, null, 69, null, null, 67, null, null]),
  Object.freeze([null, 64, null, 62, null, null, 65, null]),
  Object.freeze([null, null, null, 60, null, null, null, 57]),
]);

const SOLEIL_LEAD = Object.freeze([
  Object.freeze([null, 62, null, 63, null, null, 67, null]),
  Object.freeze([null, 69, null, null, 70, null, 69, null]),
  Object.freeze([null, 67, null, 63, null, null, null, 62]),
  Object.freeze([null, 63, null, null, 62, null, null, null]),
]);

const NECROPOLE_LEAD = Object.freeze([
  Object.freeze([null, 52, null, 53, null, null, 56, null]),
  Object.freeze([null, 57, null, null, 56, null, 53, null]),
  Object.freeze([null, 52, null, 53, null, null, null, 52]),
  Object.freeze([null, 50, null, null, 52, null, null, null]),
]);

// ── Classe principale ─────────────────────────────────────────────────
export class RpgAmbientMusic {
  constructor() {
    this.tourId = 'tour-des-listes';
    this.context = null;
    this.master = null;
    this.musicBus = null;
    this.droneBus = null;
    this.reverbInput = null;
    this.reverb = null;
    this.reverbFilter = null;
    this.reverbReturn = null;
    this.ticker = null;
    this.step = 0;
    this.nextTime = 0;
    this.running = false;
    this.paused = false;
    this.muted = false;
    this.volume = 1;
    this.session = 0;
    this.noiseBuffer = null;
    // État du tintement d'horloge (Tour des Listes).
    this.tockToggle = false;
    // Compteur de gouttes (Tour des Abysses) pour en déclencher au hasard.
    this.dripCounter = 0;
  }

  // ── Cycle de vie ────────────────────────────────────────────────────
  setTour(tourId) {
    if (!tourId || tourId === this.tourId) return;
    if (!Object.prototype.hasOwnProperty.call(RPG_AMBIENT_BPM, tourId)) return;
    this.tourId = tourId;
    this.step = 0;
    this.tockToggle = false;
    this.dripCounter = 0;
  }

  effectiveMasterGain() {
    if (this.muted || this.volume <= 0) return 0.0001;
    return Math.max(0.0001, MASTER_VOLUME * this.volume);
  }

  static supportedTours() {
    return Object.keys(RPG_AMBIENT_BPM);
  }

  async start() {
    if (this.running) {
      this.paused = false;
      return;
    }
    if (typeof window === 'undefined') return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.context ||= new AC();
    const ctx = this.context;
    const session = ++this.session;
    try { await ctx.resume(); } catch { return; }
    if (this.context !== ctx || this.session !== session) return;
    if (!this.master) {
      this.master = ctx.createGain();
      this.master.gain.value = this.effectiveMasterGain();
      this.master.connect(ctx.destination);

      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = MUSIC_VOLUME;
      this.musicBus.connect(this.master);

      this.droneBus = ctx.createGain();
      this.droneBus.gain.value = DRONE_VOLUME;
      this.droneBus.connect(this.master);

      // Une queue stéréo discrète donne de l'air aux cloches et aux nappes,
      // sans masquer les bruitages tactiques. Elle est générée localement.
      if (typeof ctx.createConvolver === 'function') {
        const impulse = makeAmbientImpulse(ctx);
        if (impulse) {
          this.reverbInput = ctx.createGain();
          this.reverbInput.gain.value = AMBIENT_REVERB_SEND;
          this.musicBus.connect(this.reverbInput);
          this.droneBus.connect(this.reverbInput);

          this.reverb = ctx.createConvolver();
          this.reverb.buffer = impulse;
          this.reverbFilter = typeof ctx.createBiquadFilter === 'function' ? ctx.createBiquadFilter() : null;
          if (this.reverbFilter) {
            this.reverbFilter.type = 'lowpass';
            this.reverbFilter.frequency.value = 4800;
            this.reverb.connect(this.reverbFilter);
          }
          this.reverbReturn = ctx.createGain();
          this.reverbReturn.gain.value = AMBIENT_REVERB_RETURN;
          (this.reverbFilter || this.reverb).connect(this.reverbReturn);
          this.reverbReturn.connect(this.master);
        }
      }
    }
    this.running = true;
    this.paused = false;
    this.master.gain.setTargetAtTime(this.effectiveMasterGain(), ctx.currentTime, 0.25);
    this.nextTime = ctx.currentTime + 0.25;
    this.clearTicker();
    // La boucle est alimentée par un setInterval de 40 ms, comme la course.
    this.ticker = window.setInterval(() => this.schedule(), 40);
  }

  stop() {
    this.running = false;
    this.paused = false;
    this.clearTicker();
    if (this.context && this.master) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.35);
    }
  }

  pause() {
    if (!this.running || this.paused) return;
    this.paused = true;
    this.clearTicker();
    if (this.master && this.context) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.25);
    }
  }

  resume() {
    if (!this.running || !this.paused || !this.context) return;
    this.paused = false;
    this.master.gain.setTargetAtTime(this.effectiveMasterGain(), this.context.currentTime, 0.25);
    this.nextTime = this.context.currentTime + 0.15;
    this.clearTicker();
    this.ticker = window.setInterval(() => this.schedule(), 40);
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (!this.master) return;
    this.master.gain.setTargetAtTime(this.effectiveMasterGain(), this.context?.currentTime ?? 0, 0.15);
  }

  setVolume(volume) {
    const num = Number(volume);
    this.volume = Number.isFinite(num) ? Math.max(0, Math.min(1, num)) : 1;
    if (!this.master) return;
    this.master.gain.setTargetAtTime(this.effectiveMasterGain(), this.context?.currentTime ?? 0, 0.15);
  }

  destroy() {
    this.stop();
    this.session += 1;
    this.noiseBuffer = null;
    const ctx = this.context;
    this.context = null;
    this.master = null;
    this.musicBus = null;
    this.droneBus = null;
    this.reverbInput = null;
    this.reverb = null;
    this.reverbFilter = null;
    this.reverbReturn = null;
    if (ctx && typeof ctx.close === 'function') {
      try { ctx.close(); } catch { /* Contexte déjà fermé. */ }
    }
  }

  clearTicker() {
    if (this.ticker !== null && typeof window !== 'undefined') window.clearInterval(this.ticker);
    this.ticker = null;
  }

  ready() {
    return Boolean(this.running && !this.paused && this.context && this.master);
  }

  // ── Outils Web Audio ────────────────────────────────────────────────
  ensureNoiseBuffer() {
    if (!this.context) return null;
    const sr = this.context.sampleRate;
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === sr) return this.noiseBuffer;
    const length = Math.floor(sr);
    this.noiseBuffer = this.context.createBuffer(1, length, sr);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    return this.noiseBuffer;
  }

  tone(frequency, time, duration, type, volume, options = {}) {
    if (!this.context) return;
    const {
      filter = 0, filterTo = 0, attack = 0.08, detune = 0,
      destination = this.musicBus, q = 0.8,
    } = options;
    const ctx = this.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, frequency), time);
    if (detune) osc.detune.setValueAtTime(detune, time);
    let tail = osc;
    if (filter) {
      const biquad = ctx.createBiquadFilter();
      biquad.type = 'lowpass';
      biquad.frequency.setValueAtTime(filter, time);
      biquad.Q.value = q;
      if (filterTo) biquad.frequency.exponentialRampToValueAtTime(Math.max(40, filterTo), time + duration);
      osc.connect(biquad);
      tail = biquad;
    }
    tail.connect(gain);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    gain.connect(destination);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  /** Bruit filtré : utilisé pour le souffle du sable, le vent, le ressac. */
  filteredNoise(time, duration, volume, options = {}) {
    if (!this.context) return;
    const {
      type = 'lowpass', frequency = 1200, frequencyTo = 0, q = 0.8, attack = 0.15,
      destination = this.droneBus,
    } = options;
    const buffer = this.ensureNoiseBuffer();
    if (!buffer) return;
    const ctx = this.context;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
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
    source.start(time, Math.random() * Math.max(0, 1 - duration), duration + 0.05);
  }

  /** Cloche à partiels, comme dans rpgAudio mais pour la musique d'ambiance. */
  bell(midiNote, time, duration, volume, destination = this.musicBus) {
    const freq = midiToFrequency(midiNote);
    for (const [mult, gainRatio] of [[1, 1], [2.01, 0.3], [2.76, 0.12]]) {
      this.tone(freq * mult, time, duration, 'sine', volume * gainRatio, {
        attack: 0.005, destination,
      });
    }
  }

  // ── Planification ───────────────────────────────────────────────────
  schedule() {
    if (!this.context || !this.running || this.paused) return;
    const bpm = RPG_AMBIENT_BPM[this.tourId] || RPG_AMBIENT_DEFAULT_BPM;
    const stepLength = 60 / bpm / 4;
    // Si l'onglet a été gelé, on recale au lieu d'avaler des mesures.
    if (this.nextTime < this.context.currentTime - 0.6) this.nextTime = this.context.currentTime + 0.15;
    while (this.nextTime < this.context.currentTime + 0.12) {
      this.playStep(this.step % RPG_AMBIENT_LOOP_STEPS, this.nextTime);
      this.step += 1;
      this.nextTime += stepLength;
    }
  }

  playStep(step, time) {
    switch (this.tourId) {
      case 'tour-du-souk':     this.playSouk(step, time); return;
      case 'tour-des-sables':  this.playSables(step, time); return;
      case 'tour-des-abysses': this.playAbysses(step, time); return;
      case 'tour-des-corsaires': this.playCorsaires(step, time); return;
      case 'tour-du-fjord':    this.playFjord(step, time); return;
      case 'tour-du-soleil-rouge': this.playSoleilRouge(step, time); return;
      case 'tour-de-la-necropole': this.playNecropole(step, time); return;
      default:                 this.playListes(step, time); return;
    }
  }

  // ── Tour des Listes : administratif, tic-tac, gratte de plume ──────
  playListes(step, time) {
    const bar = Math.floor(step / STEPS_PER_BAR) % BARS_PER_LOOP;
    const beat = step % STEPS_PER_BAR;
    const chord = LISTES_CHORDS[Math.floor(bar / 2) % LISTES_CHORDS.length];
    const stepLength = 60 / RPG_AMBIENT_BPM['tour-des-listes'] / 4;

    // Nappe très douce : deux notes tenues à l'octave, feutrée comme un
    // sous-bois de papier. Un filtre très bas garde le grave.
    if (beat === 0) {
      [0, 12].forEach((offset, i) => {
        this.tone(midiToFrequency(chord.root + offset), time, stepLength * STEPS_PER_BAR * 2,
          'triangle', 0.055, { filter: 900, attack: 0.6, detune: i ? 5 : -5, destination: this.droneBus });
      });
    }

    // Tic-tac du grand horloger : bois sec sur les temps, plus un tintement
    // haut et bref toutes les deux mesures.
    if (beat === 0 || beat === 8) {
      // Toc de bois feutré : impulsion triangulaire filtrée, sans bip carré.
      this.tone(this.tockToggle ? 740 : 660, time, 0.055, 'triangle', 0.045, { filter: 1550, attack: 0.003 });
      this.filteredNoise(time, 0.05, 0.035, {
        type: 'bandpass', frequency: 1800, q: 3, attack: 0.002, destination: this.musicBus,
      });
      this.tockToggle = !this.tockToggle;
    }
    if (beat === 0 && bar % 4 === 0) {
      // Clochette plus haute, comme le rappel de l'horloge tous les 4 temps.
      this.bell(chord.root + 24, time, 0.55, 0.05);
    }

    // Gratte de plume : bruit très aigu et court, aléatoire sur les
    // contretemps — comme un scribe qui note un nom.
    if (beat % 4 === 2 || beat % 4 === 3) {
      if ((step * 7 + bar) % 5 === 0) {
        this.filteredNoise(time, 0.06, 0.025, {
          type: 'highpass', frequency: 5200, q: 1.5, attack: 0.002,
        });
      }
    }

    // Note de basse solennelle qui change avec l'accord : un pas feutré
    // dans les escaliers de la tour.
    if (beat === 0) {
      this.tone(midiToFrequency(chord.root - 12), time, stepLength * 3, 'sine', 0.16, {
        filter: 320, attack: 0.12,
      });
    }

    // Mélodie clairsemée aux mesures 5-8 : une note par-ci par-là sur le
    // carillon, comme si le Grand Horloger recomptait ses listes.
    if (bar >= 4 && beat % 2 === 0) {
      const note = LISTES_LEAD[(bar - 4) % LISTES_LEAD.length][beat / 2];
      if (note) this.bell(note, time, 0.9, 0.04);
    }
  }

  // ── Tour du Souk : étals, négociations, parfums d'épices ───────────
  playSouk(step, time) {
    const bar = Math.floor(step / STEPS_PER_BAR) % BARS_PER_LOOP;
    const beat = step % STEPS_PER_BAR;
    const chord = SOUK_CHORDS[Math.floor(bar / 2) % SOUK_CHORDS.length];
    const stepLength = 60 / RPG_AMBIENT_BPM['tour-du-souk'] / 4;

    // Nappe : accords d'oud synthétiques, arrondis et légèrement désaccordés.
    if (beat === 0) {
      chord.intervals.forEach((interval, i) => {
        this.tone(midiToFrequency(chord.root + 12 + interval), time, stepLength * STEPS_PER_BAR * 2,
          'triangle', 0.035, { filter: 1500, attack: 0.35, detune: i % 2 ? 5 : -5, destination: this.droneBus });
      });
    }

    // Percussions : darbouka — basse sur temps 1 et 3, claquement sec sur
    // 2 et 4, avec un petit tak bref sur les contretemps de fin de mesure.
    if (beat === 0 || beat === 8) {
      this.tone(140, time, 0.12, 'sine', 0.22, { filter: 280, attack: 0.005 });
      this.tone(70, time + 0.015, 0.18, 'sine', 0.12, { destination: this.musicBus });
    }
    if (beat === 4 || beat === 12) {
      this.filteredNoise(time, 0.08, 0.1, {
        type: 'bandpass', frequency: 2200, q: 1.8, attack: 0.002,
      });
    }
    if (beat === 14 || (beat === 6 && bar % 2 === 1)) {
      this.filteredNoise(time, 0.04, 0.05, {
        type: 'highpass', frequency: 4800, q: 1.2, attack: 0.002,
      });
    }

    // Basse bondissante du guitarrón, un peu comme la cumbia du Mexique
    // mais plus sobre, sur les temps 1, le « & » du 2, le 3, le « & » du 4.
    const soukBassMap = [0, null, null, 7, 0, null, null, 10];
    if (beat % 2 === 0) {
      const int = soukBassMap[beat / 2];
      if (int !== null && int !== undefined) {
        this.tone(midiToFrequency(chord.root + int), time, stepLength * 1.1, 'triangle', 0.18, {
          filter: 650, attack: 0.01,
        });
      }
    }

    // Zurna / nay : une note aiguë et courte de temps à autre, comme le
    // marchand qui vous hèle du fond de son étal.
    if (beat === 3 || beat === 11) {
      if ((bar + beat) % 3 === 0) {
        this.tone(midiToFrequency(chord.root + 12 + chord.intervals[2] + 2), time, stepLength * 1.3,
          'triangle', 0.05, { filter: 2800, filterTo: 1500, attack: 0.025, detune: 4 });
      }
    }

    // Mélodie du souk aux mesures 5-8 : quelques notes de oud dans le
    // mode hijaz (demi-ton augmenté) comme le soleil qui traverse les toiles.
    if (bar >= 4 && beat % 2 === 0) {
      const note = SOUK_LEAD[(bar - 4) % SOUK_LEAD.length][beat / 2];
      if (note) {
        this.tone(midiToFrequency(note + 12), time, stepLength * 1.6, 'triangle', 0.08, {
          filter: 2400, attack: 0.04,
        });
      }
    }

    // Rumeur lointaine du souk : un chuchotement filtré permanent, tout bas.
    if (beat === 0 && bar % 2 === 0) {
      this.filteredNoise(time, stepLength * STEPS_PER_BAR * 2, 0.025, {
        type: 'bandpass', frequency: 700, q: 0.6, attack: 0.8, destination: this.droneBus,
      });
    }
  }

  // ── Tour des Sables : gravité, zénith, fin du monde ────────────────
  playSables(step, time) {
    const bar = Math.floor(step / STEPS_PER_BAR) % BARS_PER_LOOP;
    const beat = step % STEPS_PER_BAR;
    const chord = SABLES_CHORDS[Math.floor(bar / 2) % SABLES_CHORDS.length];
    const stepLength = 60 / RPG_AMBIENT_BPM['tour-des-sables'] / 4;

    // Nappe : cordes en dessous, très lentes, avec vibrato imperceptible.
    // Le vent de sable qui couvre tout en permanence, en dessous.
    if (beat === 0) {
      chord.intervals.forEach((interval, i) => {
        this.tone(midiToFrequency(chord.root - 12 + interval), time, stepLength * STEPS_PER_BAR * 2,
          'sine', 0.05, { filter: 480, attack: 1.2, detune: (i % 2 ? 4 : -4), destination: this.droneBus });
      });
      // Souffle du désert : bruit large qui se balance très lentement.
      this.filteredNoise(time, stepLength * STEPS_PER_BAR * 2, 0.055, {
        type: 'lowpass', frequency: 650, frequencyTo: 380, q: 0.7, attack: 1.5, destination: this.droneBus,
      });
    }

    // Gong profond et solennel tous les deux temps — l'appel de l'horloge
    // du zénith. Très long, très grave.
    if (beat === 0 && bar % 2 === 0) {
      this.tone(110, time, 2.2, 'sine', 0.28, { filter: 280, filterTo: 80, attack: 0.02 });
      this.tone(55, time, 3.5, 'sine', 0.18, { filter: 160, attack: 0.15 });
      this.filteredNoise(time, 0.6, 0.05, {
        type: 'bandpass', frequency: 220, q: 2, attack: 0.01, destination: this.musicBus,
      });
    }

    // Un tintement métallique très haut sur la fin de chaque mesure — un
    // clou dans la porte, un éclat de verre sous le sable.
    if (beat === 15) {
      this.bell(84, time, 0.8, 0.025);
    }

    // Basse : une note fondamentale par changement d'accord, très lente.
    if (beat === 0 && bar % 2 === 0) {
      this.tone(midiToFrequency(chord.root - 24), time, stepLength * STEPS_PER_BAR * 2, 'sine', 0.18, {
        filter: 180, attack: 0.4, destination: this.musicBus,
      });
    }

    // Crépitement du sable : bruits très aigus, sporadiques, comme les
    // grains qui tombent du sablier au-dessus du portail.
    if (((step * 11) + bar) % 17 === 0) {
      this.filteredNoise(time, 0.12, 0.02, {
        type: 'highpass', frequency: 6500, q: 2.5, attack: 0.002,
      });
    }

    // Mélodie très raréfiée (mesures 5-8) : une note toutes les deux
    // mesures, un cor lointain qui appelle depuis le zénith.
    if (bar >= 4 && beat === 0 && bar % 2 === 0) {
      const leadBar = Math.floor((bar - 4) / 2);
      const notes = SABLES_LEAD[leadBar] || [];
      for (let i = 0; i < notes.length; i += 1) {
        const n = notes[i];
        if (n) this.tone(midiToFrequency(n), time + i * stepLength * 2, stepLength * 2.5, 'triangle', 0.045, {
          filter: 1900, filterTo: 900, attack: 0.24,
        });
      }
    }
  }

  // ── Tour des Abysses : bulles, vagues lentes, cloches sous l'eau ───
  playAbysses(step, time) {
    const bar = Math.floor(step / STEPS_PER_BAR) % BARS_PER_LOOP;
    const beat = step % STEPS_PER_BAR;
    const chord = ABYSSES_CHORDS[Math.floor(bar / 2) % ABYSSES_CHORDS.length];
    const stepLength = 60 / RPG_AMBIENT_BPM['tour-des-abysses'] / 4;

    // Nappe continue très feutrée : sine pur + filtre sous 400 Hz,
    // comme la pression de l'eau sur les tympans.
    if (beat === 0) {
      chord.intervals.forEach((interval, i) => {
        this.tone(midiToFrequency(chord.root - 12 + interval), time, stepLength * STEPS_PER_BAR * 2,
          'sine', 0.055, { filter: 380, attack: 1.5, detune: (i % 2 ? 3 : -3), destination: this.droneBus });
      });
      // Ressac permanent : bruit bas de vagues qui déferlent au ralenti.
      this.filteredNoise(time, stepLength * STEPS_PER_BAR * 2, 0.06, {
        type: 'lowpass', frequency: 500, frequencyTo: 220, q: 0.5, attack: 1.8, destination: this.droneBus,
      });
    }

    // Goutte d'eau qui tombe : sine qui descend très vite, résonance.
    // Seulement de temps à autre, pas sur la grille — hasard.
    this.dripCounter += 1;
    if (this.dripCounter > 9 && Math.random() < 0.12) {
      this.dripCounter = 0;
      this.tone(880 + Math.random() * 440, time, 0.2, 'sine', 0.06, {
        filter: 2400, attack: 0.003,
      });
      this.tone(440, time + 0.08, 0.4, 'sine', 0.025, {
        filter: 1600, attack: 0.04,
      });
    }

    // Cloche sous-marine toutes les deux mesures, étouffée par l'eau —
    // le sonneur d'écume qui appelle les bêtes du fond.
    if (beat === 0 && bar % 2 === 0) {
      // Une cloche avec moins de partiels aigus, plus longue, filtrée.
      [1, 1.48, 2.01].forEach((mult, idx) => {
        this.tone(midiToFrequency(chord.root + 19) * mult, time, 3.5, 'sine',
          idx === 0 ? 0.08 : 0.03, { filter: 900, attack: 0.02, destination: this.musicBus });
      });
    }

    // Bulle qui remonte : petit bruit court, aléatoire.
    if (((step * 13 + bar) % 11) === 0) {
      this.filteredNoise(time, 0.1, 0.035, {
        type: 'bandpass', frequency: 600 + Math.random() * 800, q: 4, attack: 0.004,
      });
    }

    // Basse sous-marine : fondamentale très grave, sans attaque.
    if (beat === 0 && bar % 2 === 0) {
      this.tone(midiToFrequency(chord.root - 24), time, stepLength * STEPS_PER_BAR * 2,
        'sine', 0.18, { filter: 180, attack: 0.6 });
    }

    // Mélodie flottante aux mesures 5-8 : une note par deux mesures, un
    // chant de baleine lointain qui passe dans le noir.
    if (bar >= 4 && beat === 0 && (bar - 4) % 2 === 0) {
      const leadBar = Math.floor((bar - 4) / 2);
      const line = ABYSSES_LEAD[leadBar] || [];
      for (let i = 0; i < line.length; i += 1) {
        const n = line[i];
        if (n) this.tone(midiToFrequency(n - 12), time + i * stepLength * 2, stepLength * 2.2, 'sine', 0.06, {
          filter: 1800, filterTo: 700, attack: 0.5, destination: this.musicBus,
        });
      }
    }
  }

  // ── Tour des Corsaires : fond sous-marin, rame et tambour de bord ──
  playCorsaires(step, time) {
    this.playAbysses(step, time);
    const beat = step % STEPS_PER_BAR;
    const stepLength = 60 / RPG_AMBIENT_BPM['tour-des-corsaires'] / 4;
    // Deux coups sourds de tambour rythment les rames, sans masquer le ressac.
    if (beat === 0 || beat === 8) {
      this.tone(beat === 0 ? 48 : 43, time, stepLength * 2.4, 'triangle', 0.09, {
        filter: 150, attack: 0.008, destination: this.musicBus,
      });
    }
    if (beat === 4 || beat === 12) {
      this.filteredNoise(time, 0.09, 0.026, { type: 'lowpass', frequency: 420, q: 0.7 });
    }
  }

  // ── Tour du Fjord : neige, boucliers, corbeaux ─────────────────────
  playFjord(step, time) {
    const bar = Math.floor(step / STEPS_PER_BAR) % BARS_PER_LOOP;
    const beat = step % STEPS_PER_BAR;
    const chord = FJORD_CHORDS[Math.floor(bar / 2) % FJORD_CHORDS.length];
    const stepLength = 60 / RPG_AMBIENT_BPM['tour-du-fjord'] / 4;

    // Bourdon de fond : quinte ouverte (drone nordique), comme une
    // tampagne ou un tambour qui résonne dans la vallée.
    if (beat === 0) {
      // La fondamentale (D) et sa quinte (A) tenues en permanence sous
      // tous les accords, comme le vent sur le glacier.
      [0, 7].forEach((off) => {
        this.tone(midiToFrequency(38 + off), time, stepLength * STEPS_PER_BAR * 2,
          'sine', 0.06, { filter: 300, attack: 1.0, destination: this.droneBus });
      });
      chord.intervals.forEach((interval, i) => {
        this.tone(midiToFrequency(chord.root + interval), time, stepLength * STEPS_PER_BAR * 2,
          'triangle', 0.03, { filter: 1400, attack: 0.5, detune: (i % 2 ? 4 : -4), destination: this.droneBus });
      });
      // Vent du fjord : souffle aigu et froid en continu.
      this.filteredNoise(time, stepLength * STEPS_PER_BAR * 2, 0.04, {
        type: 'highpass', frequency: 1200, frequencyTo: 800, q: 0.7, attack: 1.2, destination: this.droneBus,
      });
    }

    // Pas cadencé de la garde : roulement de tambour en sourdine, grosse
    // caisse sur les temps 1 et 3 (pas de caisse claire : boucliers).
    if (beat === 0 || beat === 8) {
      this.tone(105, time, 0.18, 'sine', 0.28, { filter: 260, attack: 0.006 });
      this.tone(55, time + 0.02, 0.28, 'sine', 0.14);
    }
    // Choc de boucliers : thud sourd sur le temps 2 et 4.
    if (beat === 4 || beat === 12) {
      this.filteredNoise(time, 0.1, 0.09, { type: 'lowpass', frequency: 480, q: 1.2, attack: 0.004 });
      this.tone(130, time, 0.12, 'sine', 0.12, { filter: 280, attack: 0.005 });
    }

    // Cor du Gjallarhorn toutes les 4 mesures : une seule note longue
    // qui traverse la neige, comme la Valkyrie qui choisit.
    if (beat === 0 && bar === 0) {
      this.tone(midiToFrequency(50), time, stepLength * 5, 'triangle', 0.055, {
        filter: 620, filterTo: 360, attack: 0.34,
      });
      this.tone(midiToFrequency(62), time, stepLength * 4, 'triangle', 0.04, {
        filter: 900, filterTo: 500, attack: 0.5,
      });
    }

    // Basse nordique : une note par mesure, qui marche avec la garde.
    if (beat === 0) {
      this.tone(midiToFrequency(chord.root - 12), time, stepLength * 2.5, 'triangle', 0.2, {
        filter: 380, attack: 0.05,
      });
    }

    // Crissement de la neige sous les pieds : bruit très aigu et court.
    if (((step * 17 + bar) % 13) === 0) {
      this.filteredNoise(time, 0.06, 0.03, {
        type: 'highpass', frequency: 4500, q: 2, attack: 0.003,
      });
    }

    // Chœur des scaldes / petite mélodie aux mesures 5-8 : quelques notes
    // de chant nordique, sans vibrato, comme une complainte du fjord.
    if (bar >= 4 && beat % 2 === 0) {
      const note = FJORD_LEAD[(bar - 4) % FJORD_LEAD.length][beat / 2];
      if (note) {
        this.tone(midiToFrequency(note), time, stepLength * 2, 'triangle', 0.055, {
          filter: 2100, filterTo: 1050, attack: 0.18,
        });
        this.tone(midiToFrequency(note + 7), time + 0.02, stepLength * 1.6, 'sine', 0.025, {
          filter: 2000, attack: 0.15, destination: this.musicBus,
        });
      }
    }
  }

  // ── Tour du Soleil rouge : koto, taiko martial et braises ─────────
  playSoleilRouge(step, time) {
    const bar = Math.floor(step / STEPS_PER_BAR) % BARS_PER_LOOP;
    const beat = step % STEPS_PER_BAR;
    const chord = SOLEIL_CHORDS[Math.floor(bar / 2) % SOLEIL_CHORDS.length];
    const stepLength = 60 / RPG_AMBIENT_BPM['tour-du-soleil-rouge'] / 4;

    // Nappe et souffle de braises / vent de cendre du volcan
    if (beat === 0) {
      [0, 7].forEach((off) => {
        this.tone(midiToFrequency(chord.root - 12 + off), time, stepLength * STEPS_PER_BAR * 2,
          'triangle', 0.05, { filter: 420, attack: 0.8, destination: this.droneBus });
      });
      this.filteredNoise(time, stepLength * STEPS_PER_BAR * 2, 0.035, {
        type: 'bandpass', frequency: 1600, q: 2.2, attack: 0.5, destination: this.droneBus,
      });
    }

    // Taiko drum sur les temps 1 et 3 (beat 0 et 8)
    if (beat === 0 || beat === 8) {
      this.tone(68, time, 0.22, 'sine', 0.26, { filter: 220, attack: 0.005 });
      this.tone(135, time, 0.08, 'triangle', 0.12, { filter: 450, attack: 0.003 });
    }

    // Claquement de bois (hyōshigi) sur le contretemps
    if (beat === 4 || beat === 12) {
      this.tone(880, time, 0.04, 'triangle', 0.04, { filter: 2400, attack: 0.002 });
      this.filteredNoise(time, 0.04, 0.03, { type: 'highpass', frequency: 3200, q: 3, attack: 0.002 });
    }

    // Pincement de koto / shamisen
    if (beat % 4 === 2) {
      const kotoNote = chord.root + chord.intervals[(beat / 2) % chord.intervals.length];
      this.tone(midiToFrequency(kotoNote), time, 0.25, 'triangle', 0.06, {
        filter: 1800, filterTo: 600, attack: 0.004,
      });
    }

    // Mélodie de flûte / koto aux mesures 5-8
    if (bar >= 4 && beat % 2 === 0) {
      const note = SOLEIL_LEAD[(bar - 4) % SOLEIL_LEAD.length][beat / 2];
      if (note) {
        this.tone(midiToFrequency(note), time, stepLength * 2.2, 'sine', 0.06, {
          filter: 1600, attack: 0.12, destination: this.musicBus,
        });
        this.tone(midiToFrequency(note + 12), time + 0.03, stepLength * 1.5, 'triangle', 0.025, {
          filter: 2200, attack: 0.08,
        });
      }
    }
  }

  // ── Tour de la Nécropole : funéraire, sistre et murmure des tombes ─
  playNecropole(step, time) {
    const bar = Math.floor(step / STEPS_PER_BAR) % BARS_PER_LOOP;
    const beat = step % STEPS_PER_BAR;
    const chord = NECROPOLE_CHORDS[Math.floor(bar / 2) % NECROPOLE_CHORDS.length];
    const stepLength = 60 / RPG_AMBIENT_BPM['tour-de-la-necropole'] / 4;

    // Bourdon funéraire très grave et résonance de crypte
    if (beat === 0) {
      this.tone(midiToFrequency(chord.root - 12), time, stepLength * STEPS_PER_BAR * 2,
        'sine', 0.07, { filter: 180, attack: 1.2, destination: this.droneBus });
      this.tone(midiToFrequency(chord.root - 5), time, stepLength * STEPS_PER_BAR * 2,
        'triangle', 0.04, { filter: 320, attack: 1.0, destination: this.droneBus });
      // Souffle d'air froid des catacombes
      this.filteredNoise(time, stepLength * STEPS_PER_BAR * 2, 0.03, {
        type: 'lowpass', frequency: 450, q: 1.5, attack: 1.5, destination: this.droneBus,
      });
    }

    // Frappe sourde de sarcophage sur le premier temps
    if (beat === 0) {
      this.tone(48, time, 0.35, 'sine', 0.22, { filter: 140, attack: 0.01 });
    }

    // Tintement de cloche d'obsidienne toutes les 2 mesures
    if (beat === 0 && bar % 2 === 0) {
      this.bell(chord.root + 12, time, stepLength * 6, 0.05);
    }

    // Shimmer de sistre (percussion de métal léger des prêtresses)
    if (beat === 4 || beat === 12) {
      this.filteredNoise(time, 0.08, 0.035, {
        type: 'highpass', frequency: 5000, q: 2.5, attack: 0.003, destination: this.musicBus,
      });
    }

    // Mélodie pharaonique envoûtante aux mesures 5-8
    if (bar >= 4 && beat % 2 === 0) {
      const note = NECROPOLE_LEAD[(bar - 4) % NECROPOLE_LEAD.length][beat / 2];
      if (note) {
        this.tone(midiToFrequency(note), time, stepLength * 2.5, 'triangle', 0.05, {
          filter: 1200, filterTo: 550, attack: 0.22, destination: this.musicBus,
        });
        this.tone(midiToFrequency(note + 7), time + 0.04, stepLength * 1.8, 'sine', 0.02, {
          filter: 1400, attack: 0.18,
        });
      }
    }
  }
}

/** Mapping pratique : tourId → { bpm, nom } (utile pour les tests et l'UI). */
export const RPG_AMBIENT_THEMES = Object.freeze({
  'tour-des-listes': Object.freeze({
    nom: 'Le Grand Horloger compte ses noms',
    bpm: RPG_AMBIENT_BPM['tour-des-listes'],
    ambiance: 'Tic-tac de bois, clochettes hautes, gratte de plume — la Chambre des Heures classe les quartiers.',
  }),
  'tour-du-souk': Object.freeze({
    nom: 'Les étals ne ferment jamais',
    bpm: RPG_AMBIENT_BPM['tour-du-souk'],
    ambiance: 'Darbouka, ouds et négociations — trente étals suspendus où rien ne se vend à perte.',
  }),
  'tour-des-sables': Object.freeze({
    nom: 'Le zénith sur le portail',
    bpm: RPG_AMBIENT_BPM['tour-des-sables'],
    ambiance: 'Gongs lents, cordes graves et vent de sable — la dernière tour au-dessus du portail.',
  }),
  'tour-des-abysses': Object.freeze({
    nom: 'Les cloches du fond répondent',
    bpm: RPG_AMBIENT_BPM['tour-des-abysses'],
    ambiance: 'Cloches étouffées, bulles et ressac — l\'abîme contre une carte à la fois.',
  }),
  'tour-des-corsaires': Object.freeze({
    nom: 'Les lettres de marque',
    bpm: RPG_AMBIENT_BPM['tour-des-corsaires'],
    ambiance: 'Tambour de rame, cordages qui grincent et cloches des citernes — la flotte corsaire de la Régence.',
  }),
  'tour-du-fjord': Object.freeze({
    nom: 'Neuf hivers de mémoire et de glace',
    bpm: RPG_AMBIENT_BPM['tour-du-fjord'],
    ambiance: 'Tambour de boucliers, cor du nord et complainte des scaldes — le serment des neiges.',
  }),
  'tour-du-soleil-rouge': Object.freeze({
    nom: 'L’acier du Soleil rouge',
    bpm: RPG_AMBIENT_BPM['tour-du-soleil-rouge'],
    ambiance: 'Koto martial, tambours taiko et souffle du mont ardent — la forteresse des samouraïs.',
  }),
  'tour-de-la-necropole': Object.freeze({
    nom: 'Le jugement de la nécropole',
    bpm: RPG_AMBIENT_BPM['tour-de-la-necropole'],
    ambiance: 'Sistre funéraire, cloches de bronze et murmure des tombes — la balance des heures.',
  }),
});

export default RpgAmbientMusic;
