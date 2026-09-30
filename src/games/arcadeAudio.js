const COWBOY_CRY_URL = new URL('./assets/cowboy-hey-haa.mp3', import.meta.url).href;
const MUSIC_VOLUME = 0.17;
const BPM = 116;
export const PRAIRIE_BPM = 126;
export const SARDINIA_BPM = 92;
export const ALGER_BPM = 104;
export const JAPAN_BPM = 108;
export const RAMPARTS_BPM = 128;
export const INFINITY_BPM = 134;
export const AIRBASE_BPM = 138;
const NOTES = [55, 55, 82.4, 73.4, 55, 65.4, 82.4, 98, 55, 55, 82.4, 73.4, 65.4, 73.4, 98, 82.4];
const HOOK = [659.3, 0, 784, 0, 987.8, 880, 0, 784, 659.3, 0, 587.3, 659.3, 0, 784, 880, 0];

/** Original lightweight Web Audio soundtracks, selected per stage (no external tracks). */
export class DesertGroove {
  constructor() {
    this.stage = 'desert';
    this.context = null;
    this.master = null;
    this.whiteNoise = null;
    this.timer = null;
    this.step = 0;
    this.nextTime = 0;
    this.running = false;
    this.cryBuffer = null;
    this.cryLoading = null;
    this.crySource = null;
    this.lastCry = -Infinity;
    this.session = 0;
  }

  /** Pistol shot: a sharp crack, a low boom and a desert echo. */
  gunshot() {
    if (!this.running || !this.context || !this.master) return;
    const ctx = this.context;
    const time = ctx.currentTime + 0.005;
    const makeBurst = (at, duration, volume, type, freq) => {
      const length = Math.ceil(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.18));
      const src = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      src.buffer = buffer;
      filter.type = type;
      filter.frequency.setValueAtTime(freq, at);
      gain.gain.value = volume;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start(at);
    };
    makeBurst(time, 0.35, 0.9, 'lowpass', 3200);
    makeBurst(time, 0.08, 0.5, 'highpass', 2500);
    makeBurst(time + 0.16, 0.4, 0.16, 'lowpass', 1400);
    makeBurst(time + 0.34, 0.45, 0.07, 'lowpass', 900);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.2);
    gain.gain.setValueAtTime(0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.26);
  }

  setStage(stage) {
    this.stage = stage;
    this.step = 0;
    this.lastCry = -Infinity;
  }

  async start() {
    if (this.running) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.context ||= new AudioContext();
    const context = this.context;
    const session = ++this.session;
    try { await context.resume(); } catch { return; }
    if (this.context !== context || this.session !== session) return;
    if (!this.master) {
      this.master = this.context.createGain();
      this.master.gain.value = MUSIC_VOLUME;
      this.master.connect(this.context.destination);
    }
    this.running = true;
    void this.loadCry();
    this.nextTime = this.context.currentTime + 0.06;
    this.timer = window.setInterval(() => this.schedule(), 35);
  }

  schedule() {
    if (!this.context || !this.running) return;
    const stepLength = 60 / (this.stage === 'prairie' ? PRAIRIE_BPM : this.stage === 'western' ? 132 : this.stage === 'sardinia' ? SARDINIA_BPM : this.stage === 'alger' ? ALGER_BPM : this.stage === 'japan' ? JAPAN_BPM : this.stage === 'ramparts' ? RAMPARTS_BPM : this.stage === 'infinity' ? INFINITY_BPM : this.stage === 'airbase' ? AIRBASE_BPM : BPM) / 4;
    while (this.nextTime < this.context.currentTime + 0.12) {
      this.playStep(this.step % 16, this.nextTime);
      this.step += 1;
      this.nextTime += stepLength;
    }
  }

  tone(frequency, time, duration, type, volume, filterFrequency = null) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    if (filterFrequency) {
      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterFrequency, time);
      oscillator.connect(filter);
      filter.connect(gain);
    } else oscillator.connect(gain);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    gain.connect(this.master);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.025);
  }

  /** One shared second of white noise, reused by every hit instead of a fresh buffer each time. */
  noiseBuffer() {
    if (!this.whiteNoise || this.whiteNoise.sampleRate !== this.context.sampleRate) {
      const length = this.context.sampleRate;
      this.whiteNoise = this.context.createBuffer(1, length, this.context.sampleRate);
      const data = this.whiteNoise.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    return this.whiteNoise;
  }

  noise(time, duration, volume, highpass = 5000) {
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.noiseBuffer();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(highpass, time);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(time, Math.random() * Math.max(0, 1 - duration), duration);
  }

  playWestern(step, time) {
    // Original E-minor cowboy motif: whistle, plucked strings, galloping percussion.
    const melody = [659.25, 0, 783.99, 739.99, 659.25, 0, 493.88, 0, 587.33, 659.25, 0, 783.99, 880, 783.99, 739.99, 0];
    const phrase = Math.floor(this.step / 16) % 4;
    const root = [82.41, 82.41, 73.42, 61.74][phrase];
    if (step % 4 === 0) {
      this.tone(root, time, 0.22, 'triangle', 0.22);
      this.tone(90, time, 0.07, 'sine', 0.17);
    }
    if ([2, 6, 10, 14].includes(step)) {
      [2, 3, 4.75].forEach((ratio, i) => this.tone(root * ratio, time + i * 0.014, 0.16, 'triangle', 0.09));
    }
    if ([0, 3, 4, 7, 8, 11, 12, 15].includes(step)) {
      this.noise(time, 0.027, 0.08, 2200);
      this.tone(260, time, 0.04, 'triangle', 0.06);
    }
    if (melody[step]) {
      const note = melody[step] * (phrase === 3 ? 0.75 : 1);
      this.tone(note, time, 0.24, 'sine', 0.2);
      this.tone(note * 2, time + 0.008, 0.18, 'sine', 0.025);
    }
    if (step === 12) this.noise(time, 0.09, 0.08, 1200);
  }

  playPrairie(step, time) {
    // Sixteen-bar western escape: rising whistle, warm brass and driving gallop.
    // The second four bars answer the first, avoiding a one-bar repeated hook.
    const beat = 60 / PRAIRIE_BPM;
    const phrase = Math.floor(this.step / 16) % 16;
    const heroic = phrase >= 8;
    const bar = Math.floor(this.step / 16) % 8;
    const chords = [
      [98, 246.94, 293.66], [73.42, 220, 293.66],
      [82.41, 196, 246.94], [65.41, 196, 261.63],
      [98, 246.94, 293.66], [65.41, 196, 261.63],
      [73.42, 220, 293.66], [98, 246.94, 293.66],
    ];
    const melody = [
      [392, 493.88, 587.33, 783.99], [739.99, 587.33, 440, 0],
      [493.88, 587.33, 659.25, 783.99], [659.25, 523.25, 392, 0],
      [587.33, 783.99, 987.77, 880], [783.99, 659.25, 523.25, 0],
      [587.33, 659.25, 739.99, 880], [783.99, 587.33, 392, 0],
    ];
    const chord = chords[bar];
    if (step === 0 || step === 8) {
      this.tone(chord[0] * (step === 8 ? 1.5 : 1), time, beat * 0.8, 'triangle', 0.2);
    }
    if (step % 2 === 0) {
      // Picked-guitar / banjo-like arpeggio, softer than Dust Creek's strums.
      const note = [chord[0] * 2, chord[1], chord[2], chord[1]][(step / 2) % 4];
      this.tone(note, time, beat * 0.55, 'triangle', 0.11);
      if (heroic) this.tone(note * 2, time + beat * 0.25, beat * 0.3, 'triangle', 0.045);
      this.tone(note * 2, time, 0.09, 'sine', 0.025);
    }
    if (step % 4 === 0) {
      const note = melody[bar][step / 4];
      if (note) {
        const length = step === 8 ? beat * 1.4 : beat * 0.85;
        this.tone(note, time, length, 'sine', 0.15);
        // Filtered brass doubles the refrain an octave below the whistle.
        if (heroic) {
          this.tone(note / 2, time, length * 1.15, 'sawtooth', 0.065, 1500);
          this.tone(note / 2 * 1.003, time + 0.018, length, 'triangle', 0.045);
        }
        this.tone(note * 2, time + 0.008, length * 0.8, 'sine', 0.018);
        // Quiet delayed echo suggests an open landscape, without audio assets.
        this.tone(note, time + beat * 0.75, length * 0.7, 'sine', 0.035);
      }
    }
    if (step === 0) {
      [chord[1], chord[2]].forEach(note => {
        this.tone(note, time, beat * 3.5, 'sine', 0.035);
        if (heroic) this.tone(note * 2, time, beat * 3.5, 'sawtooth', 0.022, 900);
      });
    }
    if ([0, 3, 6, 8, 11, 14].includes(step)) {
      this.noise(time, 0.035, 0.065, 1800);
      this.tone(step % 8 === 0 ? 65 : 95, time, 0.16, 'sine', 0.15);
      this.tone(170, time, 0.045, 'triangle', 0.045);
    }
    if (step === 4 || step === 12) this.noise(time, 0.10, heroic ? 0.065 : 0.04, 2600);
    // Drum pickup into the refrain; a sparse first half keeps the build audible.
    if (phrase % 8 === 7 && step >= 12) {
      this.tone(110 + (step - 12) * 22, time, 0.12, 'triangle', 0.085);
      this.noise(time, 0.07, 0.04, 1900);
    }
    if (heroic && step === 0 && phrase % 4 === 0) this.noise(time, beat * 1.5, 0.04, 6500);
  }

  playSardinia(step, time) {
    // An original coastal-village serenade — tremolo mandolin, a sighing
    // accordion pad and a lonesome solo line — in the spirit of a classic
    // Italian family-crime score, without quoting any existing melody.
    const beat = 60 / SARDINIA_BPM;
    const bar = Math.floor(this.step / 16) % 8;
    const phrase = Math.floor(this.step / 16) % 16;
    const swell = phrase >= 8; // the second half of the loop thickens the texture
    const chords = [
      [73.42, 220, 261.63], [82.41, 196, 246.94],
      [65.41, 196, 261.63], [73.42, 220, 277.18],
      [73.42, 220, 261.63], [61.74, 185, 246.94],
      [65.41, 196, 261.63], [73.42, 220, 261.63],
    ];
    const melody = [
      [440, 493.88, 523.25, 0], [587.33, 523.25, 493.88, 440],
      [392, 440, 493.88, 0], [523.25, 587.33, 659.25, 587.33],
      [440, 493.88, 587.33, 0], [523.25, 493.88, 440, 392],
      [349.23, 392, 440, 0], [493.88, 440, 392, 349.23],
    ];
    const chord = chords[bar];

    // Accordion pad: a soft lowpassed sawtooth sustained under the whole bar.
    if (step === 0) {
      chord.forEach((note) => this.tone(note, time, beat * 3.7, 'sawtooth', swell ? 0.05 : 0.032, 950));
      this.tone(chord[0] / 2, time, beat * 3.7, 'sine', 0.08);
    }

    // Tremolo mandolin: three fast re-picks per eighth note.
    if (step % 2 === 0) {
      const note = [chord[2], chord[1], chord[2] * 2, chord[1]][(step / 2) % 4];
      for (let i = 0; i < 3; i++) this.tone(note, time + i * 0.045, 0.05, 'triangle', 0.1 - i * 0.02);
    }

    // Upright bass, waltz-like: root on the downbeat, two lighter offbeats.
    if (step % 8 === 0) this.tone(chord[0] / 2, time, beat * 0.9, 'sine', 0.22);
    if (step % 8 === 3 || step % 8 === 6) this.tone((chord[0] / 2) * 1.5, time, beat * 0.4, 'sine', 0.1);

    // A lonesome solo line, answered every other bar.
    if (step % 4 === 0) {
      const note = melody[bar][step / 4];
      if (note) {
        const length = beat * (swell ? 1.05 : 0.85);
        this.tone(note, time, length, 'sawtooth', swell ? 0.15 : 0.1, 2200);
        this.tone(note * 2, time + 0.01, length * 0.6, 'sine', 0.02);
      }
    }

    // Distant harbour bell and footsteps on cobblestone.
    if ([0, 6, 10].includes(step)) this.noise(time, 0.03, 0.035, 3200);
    if (step === 12 && bar % 4 === 0) this.tone(880, time, 0.5, 'sine', 0.05, 3000);
  }

  playJapan(step, time) {
    // Original Samurai night ride across the plains of Yōtei / Mount Fuji:
    // D In-sen pentatonic scale (D, Eb, G, A, C) with booming O-daiko drums,
    // percussive Tsugaru shamisen plucks, koto cascades, and a haunting shakuhachi flute.
    const beat = 60 / JAPAN_BPM;
    const bar = Math.floor(this.step / 16) % 8;
    const phrase = Math.floor(this.step / 16) % 16;
    const battle = phrase >= 8;

    const chords = [
      [73.42, 146.83, 220.0, 293.66],
      [77.78, 155.56, 233.08, 311.13],
      [65.41, 130.81, 196.0, 261.63],
      [73.42, 146.83, 220.0, 311.13],
      [73.42, 146.83, 220.0, 293.66],
      [98.0, 196.0, 293.66, 392.0],
      [77.78, 155.56, 261.63, 311.13],
      [73.42, 146.83, 220.0, 293.66],
    ];
    const shakuhachi = [
      [587.33, 622.25, 783.99, 880.0],
      [783.99, 622.25, 587.33, 0],
      [523.25, 587.33, 622.25, 783.99],
      [622.25, 587.33, 440.0, 0],
      [587.33, 783.99, 880.0, 1046.5],
      [880.0, 783.99, 622.25, 587.33],
      [622.25, 783.99, 587.33, 440.0],
      [587.33, 440.0, 293.66, 0],
    ];
    const chord = chords[bar];

    // Deep O-daiko war drums on heavy accents
    if ([0, 6, 8, 14].includes(step) || (battle && step === 11)) {
      const rootBoom = step === 0 ? chord[0] : chord[0] * 1.12;
      this.tone(rootBoom, time, beat * 0.65, 'sine', step === 0 ? 0.28 : 0.2);
      this.tone(rootBoom * 0.75, time + 0.02, beat * 0.45, 'triangle', 0.14);
      this.noise(time, 0.05, 0.055, 1400);
    }

    // Sharp shime-daiko rim clicks (fuchi) & bamboo clappers (hyōshigi)
    if ([4, 7, 12, 15].includes(step)) {
      this.noise(time, 0.028, 0.065, 3800);
      this.tone(step % 4 === 0 ? 440 : 520, time, 0.038, 'triangle', 0.075);
    }

    // Tsugaru shamisen percussive ostinato
    if (step % 2 === 0) {
      const shamisenNotes = [chord[1], chord[2], chord[3], chord[2]];
      const note = shamisenNotes[(step / 2) % 4];
      this.tone(note, time, beat * 0.36, 'sawtooth', 0.12, 2100);
      this.tone(note * 2, time + 0.006, 0.07, 'triangle', 0.055);
      if (battle && (step === 2 || step === 10)) {
        // Rapid shamisen double-strike (tataki)
        this.tone(note * 1.5, time + beat * 0.24, beat * 0.25, 'sawtooth', 0.085, 2200);
      }
    }

    // Koto shimmering arpeggio on the downbeat of every other bar
    if (step === 0 && bar % 2 === 0) {
      [chord[1], chord[2], chord[3], chord[2] * 2].forEach((n, idx) => {
        this.tone(n, time + idx * 0.045, beat * 1.1, 'triangle', 0.065);
      });
    }

    // Haunting Shakuhachi bamboo flute melody with mountain echo
    if (step % 4 === 0) {
      const note = shakuhachi[bar][step / 4];
      if (note) {
        const length = step === 0 ? beat * 1.25 : beat * 0.9;
        // Breathy bamboo attack (chiff)
        this.noise(time, 0.045, 0.03, 4600);
        this.tone(note, time, length, 'sine', battle ? 0.17 : 0.14);
        this.tone(note * 0.5, time + 0.012, length * 0.95, 'triangle', battle ? 0.075 : 0.045);
        this.tone(note * 2, time + 0.015, length * 0.65, 'sine', 0.022);
        // Echo across the plains toward Mount Fuji
        this.tone(note, time + beat * 0.75, length * 0.65, 'sine', 0.038);
      }
    }

    // Taiko battle roll at the end of an 8-bar phrase
    if (phrase % 8 === 7 && step >= 12) {
      this.tone(82 + (step - 12) * 18, time, 0.12, 'sine', 0.16);
      this.noise(time, 0.055, 0.05, 2100);
    }

    // Temple bell (Bonshō / Rin) chime on 4-bar boundaries
    if (step === 0 && bar % 4 === 0) {
      this.tone(1174.66, time, beat * 2.2, 'sine', 0.045);
      this.tone(587.33, time + 0.01, beat * 2.5, 'sine', 0.04);
    }
  }

  playAlger(step, time) {
    // Original chaâbi algérois : darbuka sur un cycle maqsum, basse d'oud,
    // arpèges de qanun et une ligne de violon en maqam Hijaz — dans l'esprit
    // de la musique orientale algérienne, sans citer aucune mélodie existante.
    const beat = 60 / ALGER_BPM;
    const bar = Math.floor(this.step / 16) % 8;
    const phrase = Math.floor(this.step / 16) % 16;
    const refrain = phrase >= 8; // la seconde moitié de la boucle s'épaissit
    const chords = [
      [73.42, 146.83, 185.0], [77.78, 155.56, 196.0],
      [73.42, 146.83, 185.0], [65.41, 130.81, 174.61],
      [73.42, 146.83, 185.0], [77.78, 155.56, 196.0],
      [65.41, 130.81, 174.61], [73.42, 146.83, 185.0],
    ];
    const melody = [
      [587.33, 739.99, 622.25, 587.33], [622.25, 587.33, 523.25, 587.33],
      [466.16, 523.25, 587.33, 523.25], [440, 466.16, 523.25, 440],
      [587.33, 622.25, 739.99, 880], [880, 783.99, 739.99, 622.25],
      [739.99, 622.25, 587.33, 523.25], [587.33, 440, 587.33, 0],
    ];
    const chord = chords[bar];

    // Darbuka : dum sur les temps forts, tek sur les contretemps (maqsum).
    if (step === 0 || step === 8) {
      this.tone(88, time, 0.16, 'sine', 0.22);
      this.tone(58, time + 0.02, 0.2, 'sine', 0.15);
      this.noise(time, 0.04, 0.05, 2200);
    }
    if (step === 2 || step === 6 || step === 12) {
      this.noise(time, 0.03, 0.075, 4200);
      this.tone(320, time, 0.04, 'triangle', 0.05);
    }
    if (step === 14 && bar % 2 === 1) {
      this.noise(time, 0.025, 0.05, 5200);
      this.tone(380, time, 0.035, 'triangle', 0.04);
    }
    // Bendir grave sur le premier temps de la mesure.
    if (step === 0) this.tone(62, time, beat * 0.8, 'sine', 0.11);
    // Riq : chuchotement de cymbalettes sur les doubles-croches.
    if (step % 2 === 1) this.noise(time, 0.018, 0.022, 7000);

    // Oud : basse pincée, quinte en fin de demi-mesure.
    if (step % 8 === 0) this.tone(chord[0], time, beat * 0.7, 'triangle', 0.18);
    if (step % 8 === 5) this.tone(chord[0] * 1.5, time, beat * 0.35, 'triangle', 0.09);

    // Qanun : arpèges clairs sur les degrés du maqam.
    if (step % 2 === 0) {
      const note = [chord[1] * 2, chord[2] * 2, chord[1] * 2, chord[2] * 4][(step / 2) % 4];
      this.tone(note, time, 0.06, 'triangle', refrain ? 0.08 : 0.055);
      if (refrain) this.tone(note * 2, time + 0.035, 0.04, 'sine', 0.026);
    }

    // Violon : la ligne mélodique, doublée à l'octave dans le refrain.
    if (step % 4 === 0) {
      const note = melody[bar][step / 4];
      if (note) {
        const length = beat * (refrain ? 1.1 : 0.85);
        this.tone(note, time, length, 'sawtooth', refrain ? 0.12 : 0.085, 2400);
        this.tone(note * 2, time + 0.01, length * 0.55, 'sine', 0.022);
        if (refrain) this.tone(note / 2, time + 0.015, length, 'triangle', 0.05, 1200);
      }
    }

    // Roulement de darbuka qui relance le cycle.
    if (phrase % 8 === 7 && step >= 12) {
      this.tone(120 + (step - 12) * 30, time, 0.1, 'triangle', 0.07);
      this.noise(time, 0.05, 0.035, 2600);
    }
  }

  playRamparts(step, time) {
    // Original « tactical desert » groove for Remparts d’Ocre, the de_dust2 homage: E Phrygian
    // dominant (E F G# A B C D) over a four-on-the-floor pulse, offbeat bass,
    // syncopated synth stabs and a Phrygian descent (D, C, B, back to E). Each
    // eight-bar phrase opens with a radio click; in the second half the bomb
    // is "planted" and its beep quickens toward the end of the loop. No
    // existing Counter-Strike music or melody is quoted.
    const beat = 60 / RAMPARTS_BPM;
    const bar = Math.floor(this.step / 16) % 8;
    const phrase = Math.floor(this.step / 16) % 16;
    const planted = phrase >= 8;
    const roots = [82.41, 82.41, 87.31, 82.41, 73.42, 73.42, 65.41, 61.74];
    const pads = [
      [329.63, 493.88], [329.63, 493.88], [349.23, 523.25], [329.63, 493.88],
      [293.66, 440.0], [293.66, 440.0], [261.63, 329.63], [246.94, 415.3],
    ];
    const stabs = [
      [659.25, 698.46, 659.25, 587.33, 523.25, 493.88],
      [493.88, 523.25, 587.33, 523.25, 493.88, 415.3],
      [698.46, 659.25, 698.46, 830.61, 698.46, 659.25],
      [659.25, 0, 587.33, 0, 659.25, 0],
      [587.33, 659.25, 698.46, 659.25, 587.33, 523.25],
      [523.25, 587.33, 523.25, 493.88, 440.0, 493.88],
      [523.25, 493.88, 440.0, 415.3, 440.0, 493.88],
      [415.3, 0, 493.88, 0, 329.63, 0],
    ];
    const stabSteps = [0, 3, 6, 8, 11, 14]; // syncope 3-3-2
    const root = roots[bar];

    // Kick on every beat, double clap on 2 and 4.
    if (step % 4 === 0) {
      this.tone(120, time, 0.1, 'sine', 0.36);
      this.tone(50, time + 0.012, 0.15, 'sine', 0.26);
    }
    if (step === 4 || step === 12) {
      this.noise(time, 0.08, 0.09, 1800);
      this.noise(time + 0.014, 0.06, 0.06, 1200);
    }
    // Hi-hats: ticking sixteenths, an open hat on each offbeat eighth.
    if (step % 2 === 1) this.noise(time, 0.02, 0.026, 8200);
    if (step % 4 === 2) this.noise(time, 0.08, 0.034, 6200);

    // Offbeat bass, with an octave ghost note before the snare.
    if (step % 4 === 2) {
      this.tone(root, time, beat * 0.42, 'sawtooth', 0.16, 480);
      this.tone(root / 2, time, beat * 0.42, 'sine', 0.12);
    }
    if (step === 3 || step === 11) this.tone(root * 2, time, beat * 0.2, 'sawtooth', 0.06, 700);

    // Pad: a sustained dyad under each bar, a little brighter once planted.
    if (step === 0) pads[bar].forEach(note => this.tone(note, time, beat * 3.8, 'sawtooth', planted ? 0.036 : 0.027, 850));

    // Synth stabs: soft plucks first, then saw + octave once the bomb is down.
    const slot = stabSteps.indexOf(step);
    const stab = slot >= 0 ? stabs[bar][slot] : 0;
    if (stab && (planted || bar % 2 === 0 || slot < 3)) {
      if (planted) {
        this.tone(stab, time, beat * 0.32, 'sawtooth', 0.09, 2400);
        this.tone(stab * 2, time + 0.008, beat * 0.2, 'square', 0.018, 3200);
      } else {
        this.tone(stab / 2, time, beat * 0.3, 'triangle', 0.11);
      }
    }

    // Radio click at the top of each eight-bar phrase — "go, go, go!" without words.
    if (step === 0 && phrase % 8 === 0) {
      this.noise(time, 0.12, 0.045, 2400);
      this.tone(1318.51, time + 0.02, 0.045, 'square', 0.025, 3000);
    }

    // Bomb beep: every half bar after the plant, every beat in the last two bars.
    if (planted && step % (phrase >= 14 ? 4 : 8) === 2) this.tone(2093, time, 0.06, 'sine', 0.035);

    // Snare roll into the next phrase.
    if (phrase % 8 === 7 && step >= 8 && step % 2 === 0) {
      this.noise(time, 0.05, 0.04 + (step - 8) * 0.006, 1600);
      this.tone(150 + (step - 8) * 20, time, 0.06, 'triangle', 0.05);
    }
  }

  playAirbase(step, time) {
    // Original « flight-line rock » for Thunder Airbase, the Street Fighter II Guile-stage
    // homage: a driving martial snare over a four-on-the-floor kick, punchy muted-guitar
    // offbeats, a rolling bass and a bright brass fanfare answering the riff. Upbeat,
    // patriotic parade energy — without quoting Guile's theme or any existing melody.
    const beat = 60 / AIRBASE_BPM;
    const bar = Math.floor(this.step / 16) % 8;
    const phrase = Math.floor(this.step / 16) % 16;
    const flyby = phrase >= 8; // the second half opens the throttle: jets overhead
    const roots = [65.41, 65.41, 87.31, 98.0, 65.41, 87.31, 98.0, 65.41]; // C C F G C F G C
    const riffs = [
      [523.25, 587.33, 659.25, 783.99, 659.25, 587.33],
      [523.25, 659.25, 783.99, 659.25, 587.33, 523.25],
      [698.46, 783.99, 880.0, 783.99, 698.46, 659.25],
      [783.99, 880.0, 783.99, 659.25, 587.33, 523.25],
      [523.25, 587.33, 659.25, 783.99, 880.0, 783.99],
      [698.46, 880.0, 783.99, 698.46, 659.25, 587.33],
      [783.99, 880.0, 1046.5, 880.0, 783.99, 659.25],
      [783.99, 659.25, 587.33, 523.25, 392.0, 523.25],
    ];
    const fanfare = [
      [261.63, 329.63, 392.0], [261.63, 329.63, 392.0],
      [349.23, 440.0, 523.25], [392.0, 493.88, 587.33],
      [261.63, 329.63, 392.0], [349.23, 440.0, 523.25],
      [392.0, 493.88, 587.33], [261.63, 329.63, 392.0],
    ];
    const riffSteps = [0, 2, 4, 8, 10, 12];
    const root = roots[bar];

    // Kick on every beat, martial snare on 2 and 4 (plus a pickup roll into bar 8).
    if (step % 4 === 0) {
      this.tone(110, time, 0.11, 'sine', 0.32);
      this.tone(52, time + 0.01, 0.14, 'sine', 0.22);
    }
    if (step === 4 || step === 12) {
      this.noise(time, 0.09, flyby ? 0.11 : 0.085, 2000);
      this.tone(190, time, 0.08, 'triangle', 0.11);
    }
    if (step % 2 === 1) this.noise(time, 0.018, 0.024, 8400);
    if (step % 4 === 2) this.noise(time, 0.07, 0.03, 6400);

    // Rolling bass: root eighths with a fifth lift before each snare hit.
    if (step % 2 === 0) {
      this.tone(root, time, beat * 0.4, 'triangle', 0.17);
      this.tone(root / 2, time, beat * 0.4, 'sine', 0.1);
    }
    if (step === 3 || step === 11) this.tone(root * 1.5, time, beat * 0.22, 'triangle', 0.09);

    // Muted-guitar riff: short plucks on the offbeats, doubled an octave up on flyby.
    const slot = riffSteps.indexOf(step);
    const riff = slot >= 0 ? riffs[bar][slot] : 0;
    if (riff) {
      this.tone(riff / 2, time, beat * 0.26, 'sawtooth', flyby ? 0.075 : 0.06, 1900);
      if (flyby) this.tone(riff, time + 0.006, beat * 0.18, 'square', 0.02, 3400);
    }

    // Brass fanfare: a bright triad stabbed on the downbeat, sustained on bar 8.
    if (step === 0) {
      const length = bar === 7 ? beat * 3.6 : beat * 0.55;
      fanfare[bar].forEach((note) => this.tone(note, time, length, 'sawtooth', flyby ? 0.05 : 0.038, 1500));
      this.tone(root * 2, time, length, 'triangle', 0.04);
    }

    // Jet flyby at the top of the second half: rising turbine sweep + wind rush.
    if (flyby && step === 0 && phrase % 8 === 0) {
      this.noise(time, beat * 2.2, 0.05, 900);
      [220, 277.18, 329.63, 440].forEach((freq, idx) => {
        this.tone(freq, time + idx * beat * 0.5, beat * 0.6, 'sawtooth', 0.045, 2600);
      });
    }

    // Snare pickup roll into the next phrase.
    if (phrase % 8 === 7 && step >= 8 && step % 2 === 0) {
      this.noise(time, 0.05, 0.045 + (step - 8) * 0.007, 2200);
      this.tone(170 + (step - 8) * 22, time, 0.06, 'triangle', 0.055);
    }
  }

  playInfinity(step, time) {
    // Original « Château de l’Infini » score (Demon Slayer homage):
    // E Miyako-bushi / In-sen dark scale (E, F, A, B, C) driven by Nakime’s
    // sharp Biwa strikes (sawari buzz + resonant fifth), thunderous O-daiko
    // war drums, rapid koto/shamisen ostinato, and a tragic shakuhachi/brass
    // theme that intensifies when the fortress shifts in the second 8-bar half.
    const beat = 60 / INFINITY_BPM;
    const bar = Math.floor(this.step / 16) % 8;
    const phrase = Math.floor(this.step / 16) % 16;
    const shifted = phrase >= 8;

    const chords = [
      [82.41, 164.81, 246.94, 329.63],
      [87.31, 174.61, 261.63, 349.23],
      [110.0, 220.0, 261.63, 329.63],
      [82.41, 164.81, 246.94, 349.23],
      [82.41, 164.81, 246.94, 329.63],
      [98.0, 196.0, 246.94, 349.23],
      [87.31, 174.61, 246.94, 329.63],
      [82.41, 164.81, 246.94, 329.63],
    ];
    const melody = [
      [659.25, 698.46, 987.77, 880.0],
      [987.77, 698.46, 659.25, 0],
      [523.25, 659.25, 698.46, 987.77],
      [880.0, 698.46, 659.25, 0],
      [659.25, 987.77, 1046.5, 1318.51],
      [1046.5, 987.77, 880.0, 698.46],
      [987.77, 880.0, 698.46, 659.25],
      [698.46, 659.25, 493.88, 0],
    ];
    const chord = chords[bar];

    // Nakime's Biwa strike ("Ben!") at the start of every 2-bar cell (and on step 10 when shifted):
    // sharp plectrum snap + resonant sawari buzz over fifths.
    if ((step === 0 && bar % 2 === 0) || (shifted && step === 10 && bar % 2 === 1)) {
      this.noise(time, 0.035, 0.09, 2800);
      this.tone(chord[1], time, beat * 0.75, 'sawtooth', 0.16, 2600);
      this.tone(chord[2], time + 0.014, beat * 0.7, 'sawtooth', 0.13, 2900);
      this.tone(chord[3] * 2, time + 0.026, beat * 0.45, 'triangle', 0.09);
    }

    // Thunderous O-daiko drums on urgent syncopations
    if ([0, 3, 6, 8, 12, 14].includes(step)) {
      const accent = step === 0 || step === 8;
      this.tone(accent ? chord[0] : chord[0] * 1.15, time, beat * 0.55, 'sine', accent ? 0.28 : 0.19);
      this.tone(52, time + 0.015, 0.14, 'sine', accent ? 0.22 : 0.14);
    }

    // Shime-daiko rim shots & wooden clappers (hyōshigi)
    if (step === 4 || step === 12 || (shifted && step % 4 === 2)) {
      this.noise(time, 0.032, 0.075, 3600);
      this.tone(540, time, 0.035, 'triangle', 0.08);
    }

    // Rapid koto / shamisen sixteenth-note cascade in E In-sen
    const kotoRun = [chord[1], chord[2], chord[3], chord[2] * 2];
    const kotoNote = kotoRun[step % 4] * (step >= 8 ? 1.25 : 1);
    if (step % 2 === 0 || shifted) {
      this.tone(kotoNote, time, beat * 0.28, 'triangle', shifted ? 0.1 : 0.08);
    }

    // Tragic shakuhachi & demonic brass theme
    if (step % 4 === 0) {
      const note = melody[bar][step / 4];
      if (note) {
        const length = beat * (shifted ? 1.1 : 0.85);
        this.tone(note, time, length, 'sawtooth', shifted ? 0.13 : 0.095, 2300);
        this.tone(note * 0.5, time + 0.01, length, 'triangle', shifted ? 0.09 : 0.055);
        if (shifted) {
          this.tone(note * 2, time + 0.015, length * 0.65, 'sine', 0.03);
        }
      }
    }

    // Sliding fusuma / taiko crescendo at the end of each 8-bar phrase
    if (phrase % 8 === 7 && step >= 10) {
      this.tone(90 + (step - 10) * 24, time, 0.1, 'sine', 0.16);
      this.noise(time, 0.05, 0.06, 2000);
    }
  }


  playStep(step, time) {
    if (this.stage === 'infinity') { this.playInfinity(step, time); return; }
    if (this.stage === 'airbase') { this.playAirbase(step, time); return; }
    if (this.stage === 'ramparts') { this.playRamparts(step, time); return; }
    if (this.stage === 'prairie') { this.playPrairie(step, time); return; }
    if (this.stage === 'western') { this.playWestern(step, time); return; }
    if (this.stage === 'sardinia') { this.playSardinia(step, time); return; }
    if (this.stage === 'alger') { this.playAlger(step, time); return; }
    if (this.stage === 'japan') { this.playJapan(step, time); return; }
    const beat = 60 / BPM;
    if ([0, 6, 8, 14].includes(step)) {
      this.tone(110, time, 0.18, 'sine', 0.34);
      this.tone(55, time + 0.035, 0.16, 'sine', 0.2);
    }
    if ([4, 12].includes(step)) {
      this.noise(time, 0.11, 0.11, 1100);
      this.tone(185, time, 0.085, 'triangle', 0.12);
    }
    if ([2, 6, 10, 14].includes(step)) this.noise(time, 0.045, 0.045, 7000);
    if ([0, 3, 6, 8, 11, 14].includes(step)) {
      this.tone(NOTES[step], time, beat * 0.34, 'sawtooth', 0.105, 420);
    }
    const hook = HOOK[step];
    if (hook) this.tone(hook, time, beat * 0.32, 'square', 0.035, 1700);
  }

  /** Crystal pickup chime; rarer crystals sound brighter and richer. */
  pickup(tier = 0) {
    if (!this.running || !this.context || !this.master) return;
    const time = this.context.currentTime + 0.005;
    const notes = [[1046.5, 1568], [1174.7, 1760], [1318.5, 1975.5, 2637]][tier] || [1046.5, 1568];
    notes.forEach((frequency, index) => this.tone(frequency, time + index * 0.055, 0.2, 'triangle', 0.16 + tier * 0.025));
    this.noise(time, 0.05, 0.035, 9000);
  }

  /** Cursed diamond: the chime collapses into a dull, braking growl. */
  trap() {
    if (!this.running || !this.context || !this.master) return;
    const time = this.context.currentTime + 0.005;
    [392, 294, 208, 155].forEach((frequency, index) => {
      this.tone(frequency, time + index * 0.06, 0.22, 'sawtooth', 0.13, 900);
    });
    this.noise(time + 0.05, 0.28, 0.05, 1400);
  }

  /** Mud puddle splash: wet squelch, heavy hoof suction and bubbling mire drops. */
  mudSplash() {
    if (!this.running || !this.context || !this.master) return;
    const time = this.context.currentTime + 0.005;
    this.noise(time, 0.24, 0.11, 850);
    this.noise(time + 0.06, 0.18, 0.07, 1600);
    [220, 165, 118, 86].forEach((frequency, index) => {
      this.tone(frequency, time + index * 0.045, 0.19, 'triangle', 0.15, 680);
    });
  }

  /** Bright ascending arcade fanfare when a power-up finishes charging. */
  powerReady() {
    if (!this.running || !this.context || !this.master) return;
    const time = this.context.currentTime + 0.01;
    [587.33, 880, 1174.66, 1760].forEach((frequency, index) => {
      this.tone(frequency, time + index * 0.055, 0.22, 'triangle', 0.22);
    });
  }

  /** Lasso throw: two spinning rope whooshes followed by a sharp whip-crack snap. */
  lassoThrow() {
    if (!this.running || !this.context || !this.master) return;
    const ctx = this.context;
    const time = ctx.currentTime + 0.005;

    // Two fast spinning rope whooshes + whistling cord glissando
    [0, 0.11].forEach((offset, idx) => {
      const t = time + offset;
      this.noise(t, 0.095, 0.14 + idx * 0.04, 1500 + idx * 500);
      if (ctx.createOscillator && ctx.createGain) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(280 + idx * 80, t);
        osc.frequency.exponentialRampToValueAtTime(760 + idx * 140, t + 0.085);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.095);
        osc.connect(gain);
        gain.connect(this.master);
        osc.start(t);
        osc.stop(t + 0.11);
      } else {
        this.tone(420 + idx * 140, t, 0.09, 'sine', 0.2);
      }
    });

    // Whip-snap & taut rope twang when the lasso flies forward
    const snapAt = time + 0.22;
    this.noise(snapAt, 0.075, 0.26, 3200);
    this.tone(580, snapAt, 0.06, 'triangle', 0.24);
    this.tone(240, snapAt + 0.035, 0.14, 'triangle', 0.18);
  }

  /** Speed boost (Turbo): rising turbine surge, high-velocity wind rush and heroic chord. */
  speedBoost() {
    if (!this.running || !this.context || !this.master) return;
    const ctx = this.context;
    const time = ctx.currentTime + 0.005;

    // Wind rush
    this.noise(time, 0.38, 0.14, 1800);
    this.noise(time + 0.12, 0.32, 0.12, 3600);

    // Continuous pitch-ramping turbine sweep
    if (ctx.createOscillator && ctx.createGain) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(880, time + 0.42);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(0.2, time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.45);
      if (ctx.createBiquadFilter) {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(700, time);
        filter.frequency.exponentialRampToValueAtTime(3400, time + 0.42);
        osc.connect(filter);
        filter.connect(gain);
      } else {
        osc.connect(gain);
      }
      gain.connect(this.master);
      osc.start(time);
      osc.stop(time + 0.47);
    }

    // Bright ascending turbo arpeggio
    [440, 554.37, 659.25, 880, 1108.73].forEach((freq, idx) => {
      this.tone(freq, time + idx * 0.048, 0.22, 'triangle', 0.18);
      this.tone(freq * 1.5, time + idx * 0.048 + 0.01, 0.16, 'sine', 0.08);
    });
  }

  /** Shield activation: deep gravity-well warp, sub-bass drop and magnetic harmonic pulse. */
  shieldGravity() {
    if (!this.running || !this.context || !this.master) return;
    const ctx = this.context;
    const time = ctx.currentTime + 0.005;

    // Deep gravity-wave pitch bend (downward pull then upward force-field lock)
    if (ctx.createOscillator && ctx.createGain) {
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(190, time);
      sub.frequency.exponentialRampToValueAtTime(48, time + 0.24);
      sub.frequency.exponentialRampToValueAtTime(110, time + 0.58);
      subGain.gain.setValueAtTime(0.0001, time);
      subGain.gain.exponentialRampToValueAtTime(0.36, time + 0.03);
      subGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.62);
      sub.connect(subGain);
      subGain.connect(this.master);
      sub.start(time);
      sub.stop(time + 0.64);

      const warp = ctx.createOscillator();
      const warpGain = ctx.createGain();
      warp.type = 'sawtooth';
      warp.frequency.setValueAtTime(95, time);
      warp.frequency.exponentialRampToValueAtTime(220, time + 0.52);
      warpGain.gain.setValueAtTime(0.0001, time);
      warpGain.gain.exponentialRampToValueAtTime(0.16, time + 0.05);
      warpGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.56);
      if (ctx.createBiquadFilter) {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, time);
        filter.frequency.exponentialRampToValueAtTime(1200, time + 0.35);
        filter.frequency.exponentialRampToValueAtTime(420, time + 0.56);
        warp.connect(filter);
        filter.connect(warpGain);
      } else {
        warp.connect(warpGain);
      }
      warpGain.connect(this.master);
      warp.start(time);
      warp.stop(time + 0.58);
    }

    // Resonant magnetic gravity-dome harmonics
    [110, 164.81, 220, 329.63, 440].forEach((freq, idx) => {
      this.tone(freq, time + idx * 0.055, 0.36, 'sine', 0.14);
      this.tone(freq * 1.01, time + idx * 0.055 + 0.015, 0.32, 'triangle', 0.09, 900);
    });
  }

  async loadCry() {
    if (this.cryBuffer || this.cryLoading || !this.context) return;
    const context = this.context;
    this.cryLoading = (async () => {
      try {
        const response = await fetch(COWBOY_CRY_URL);
        if (!response.ok) return;
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        if (this.context === context) this.cryBuffer = buffer;
      } catch { /* An unavailable voice asset must never interrupt the race. */ }
    })();
    try { await this.cryLoading; } finally { this.cryLoading = null; }
  }

  cheer() {
    // Do not queue late playback: mute, overlap and cooldown always win.
    if (!this.running || this.context?.state !== 'running' || !this.master || !this.cryBuffer || this.crySource) return;
    const now = this.context.currentTime;
    if (now - this.lastCry < 4) return;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = this.cryBuffer;
    gain.gain.value = 0.24;
    source.connect(gain);
    gain.connect(this.context.destination);
    this.crySource = source;
    this.lastCry = now;
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      if (this.crySource === source) this.crySource = null;
    };
    const music = this.master.gain;
    music.cancelScheduledValues(now);
    music.setValueAtTime(MUSIC_VOLUME, now);
    music.linearRampToValueAtTime(0.07, now + 0.03);
    music.setValueAtTime(0.07, now + source.buffer.duration);
    music.linearRampToValueAtTime(MUSIC_VOLUME, now + source.buffer.duration + 0.2);
    source.start(now);
  }

  stop() {
    this.running = false;
    this.session += 1;
    if (this.crySource) {
      this.crySource.stop();
      this.crySource = null;
    }
    if (this.master && this.context) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setValueAtTime(MUSIC_VOLUME, this.context.currentTime);
    }
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    if (this.context?.state === 'running') this.context.suspend();
  }

  destroy() {
    this.stop();
    if (this.context) this.context.close();
    this.context = null;
    this.master = null;
    this.cryBuffer = null;
  }
}
