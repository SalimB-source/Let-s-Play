/**
 * Son du prototype — « Le Sablier de Bab El ».
 *
 * Zéro asset : tout est synthétisé en WebAudio, dans le vocabulaire du
 * dossier DA (§ 5) — carrés nets pour les jingles, sinus doux pour les
 * soins, cloche de l'Astrolabe à partiels, souffle bruité pour le sable.
 *
 * Deux couches :
 *  - pure : `hz()` et `rpgSfx(name)` décrivent les séquences (notes, départs,
 *    durées, gains). Testables sans navigateur.
 *  - lecteur : `RpgAudioPlayer` ne s'éveille qu'après un geste joueur
 *    (`unlock`), planifie proprement, et reste muet si WebAudio manque
 *    (jsdom des checks, navigateurs sans audio) ou si l'on coupe le son.
 */

const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** « A4 » → 440 Hz ; accepte # et b. */
export function hz(note) {
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(note);
  if (!match) return 0;
  const base = SEMITONES[match[1]];
  const acc = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
  const midi = 12 * (Number(match[3]) + 1) + base + acc;
  return 440 * 2 ** ((midi - 69) / 12);
}

const tone = (w, n, at, dur, g = 0.5) => ({ kind: 'tone', w, n, at, dur, g });
const thud = (at, dur, g = 0.7) => ({ kind: 'thud', at, dur, g });
const noise = (at, dur, g = 0.4) => ({ kind: 'noise', at, dur, g });
const bell = (n, at, dur, g = 0.5) => ({ kind: 'bell', n, at, dur, g });

/**
 * Séquences sonores. Chaque événement du jeu a la sienne ; un nom inconnu
 * rend null (le lecteur se tait).
 */
export function rpgSfx(name) {
  switch (name) {
    // L'ennemi apparaît : petit arpège carré, clin d'œil aux jingles d'encounter.
    case 'apparition':
      return [
        tone('square', 'E4', 0, 0.09),
        tone('square', 'G4', 0.09, 0.09),
        tone('square', 'B4', 0.18, 0.09),
        tone('square', 'E5', 0.27, 0.2, 0.42),
      ];
    case 'victoire':
      return [
        tone('square', 'C5', 0, 0.1),
        tone('square', 'E5', 0.1, 0.1),
        tone('square', 'G5', 0.2, 0.1),
        tone('square', 'C6', 0.3, 0.34, 0.4),
        tone('triangle', 'G4', 0.3, 0.34, 0.5),
      ];
    case 'defaite':
      return [
        tone('triangle', 'E4', 0, 0.26, 0.55),
        tone('triangle', 'C4', 0.3, 0.26, 0.55),
        tone('triangle', 'A3', 0.6, 0.55, 0.5),
      ];
    case 'whoosh':
      return [noise(0, 0.16, 0.3), tone('triangle', 'G3', 0, 0.12, 0.25)];
    case 'hit':
      return [thud(0, 0.16, 0.8), noise(0, 0.08, 0.25)];
    case 'heal':
      return [tone('sine', 'C5', 0, 0.12, 0.4), tone('sine', 'E5', 0.11, 0.22, 0.4)];
    case 'zone':
      return [thud(0, 0.3, 0.8), tone('sawtooth', 'A2', 0.02, 0.28, 0.22), noise(0.02, 0.2, 0.3)];
    case 'bell':
      return [bell('A5', 0, 1.1, 0.5), bell('E5', 0.02, 0.9, 0.3)];
    case 'blip':
      return [tone('square', 'B4', 0, 0.05, 0.25)];
    case 'explore':
      return [tone('triangle', 'G4', 0, 0.16, 0.35), tone('triangle', 'A4', 0.16, 0.16, 0.35), tone('triangle', 'B4', 0.32, 0.3, 0.35)];
    case 'souffle':
      return [noise(0, 0.3, 0.45)];
    default:
      return null;
  }
}

/** Lecteur WebAudio : muet tant que `unlock()` n'a pas suivi un geste joueur. */
export class RpgAudioPlayer {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch {
      this.ctx = null;
      return;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.22;
    this.master.connect(this.ctx.destination);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.22;
  }

  play(name, delay = 0) {
    if (!this.ctx || !this.master || this.muted) return;
    const seq = rpgSfx(name);
    if (!seq) return;
    const t0 = this.ctx.currentTime + delay;
    for (const ev of seq) this.schedule(ev, t0 + ev.at);
  }

  envelope(gain, g, t, dur) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(g, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  schedule(ev, t) {
    const ctx = this.ctx;
    if (ev.kind === 'noise') {
      const length = Math.max(1, Math.floor(ctx.sampleRate * ev.dur));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      this.envelope(gain, ev.g, t, ev.dur);
      src.connect(gain).connect(this.master);
      src.start(t);
      src.stop(t + ev.dur + 0.05);
      return;
    }
    if (ev.kind === 'thud') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + ev.dur);
      const gain = ctx.createGain();
      this.envelope(gain, ev.g, t, ev.dur);
      osc.connect(gain).connect(this.master);
      osc.start(t);
      osc.stop(t + ev.dur + 0.05);
      return;
    }
    if (ev.kind === 'bell') {
      for (const [mult, g] of [[1, ev.g], [2.01, ev.g * 0.35], [2.74, ev.g * 0.15]]) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = hz(ev.n) * mult;
        const gain = ctx.createGain();
        this.envelope(gain, g, t, ev.dur);
        osc.connect(gain).connect(this.master);
        osc.start(t);
        osc.stop(t + ev.dur + 0.05);
      }
      return;
    }
    const osc = ctx.createOscillator();
    osc.type = ev.w ?? 'square';
    osc.frequency.value = hz(ev.n);
    const gain = ctx.createGain();
    this.envelope(gain, ev.g, t, ev.dur);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + ev.dur + 0.05);
  }
}
