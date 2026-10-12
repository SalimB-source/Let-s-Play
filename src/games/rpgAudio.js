/**
 * Son du prototype — « Le Sablier du temps ».
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
 *
 * Inventaire complet du duel — toutes les actions tactiles et souris qui
 * méritent un retour sonore :
 *  - plateau : apparition, victoire, defaite, tour, phase, annonce, pass
 *  - mana : terrain_pose, terrain_tap, mana
 *  - cartes : creature, magie, pioche, destruction, burn, soin, bouclier
 *  - combat : attaque_declaree, attaque_confirmee, blocage, combat, degats,
 *    degats_sorcier, coup_rapide, impact
 *  - magie : contresort, whoosh, hit, zone, bell, blip, explore, souffle
 *  - UI : menu, select, erreur, pile, annuler, hover
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

    // ── Plateau & tours ──────────────────────────────────────────────
    case 'tour':
      return [bell('C6', 0, 0.9, 0.42), tone('triangle', 'G4', 0.02, 0.34, 0.32)];
    case 'phase':
      return [tone('square', 'G4', 0, 0.07, 0.32), tone('square', 'B4', 0.07, 0.09, 0.3)];
    case 'annonce':
      return [
        tone('square', 'E4', 0, 0.08),
        tone('square', 'G4', 0.08, 0.08),
        tone('square', 'B4', 0.16, 0.08),
        tone('square', 'E5', 0.24, 0.18, 0.38),
        bell('E5', 0.06, 0.6, 0.22),
      ];
    case 'pass':
      return [noise(0, 0.22, 0.22), tone('triangle', 'A3', 0, 0.22, 0.22)];

    // ── Mana & terrains ──────────────────────────────────────────────
    case 'terrain_pose':
      return [thud(0, 0.22, 0.7), tone('sine', 'C3', 0.02, 0.35, 0.38), noise(0.02, 0.15, 0.2)];
    case 'terrain_tap':
      return [tone('square', 'B4', 0, 0.06, 0.32), tone('triangle', 'E3', 0, 0.18, 0.36)];
    case 'mana':
      return [tone('sine', 'A3', 0, 0.12, 0.36), tone('square', 'B4', 0.08, 0.06, 0.26)];

    // ── Cartes ───────────────────────────────────────────────────────
    case 'creature':
      return [
        noise(0, 0.12, 0.25),
        tone('square', 'C4', 0.05, 0.08, 0.45),
        tone('square', 'E4', 0.13, 0.08, 0.45),
        tone('square', 'G4', 0.21, 0.14, 0.42),
      ];
    case 'magie':
      return [
        bell('A5', 0, 0.9, 0.46),
        noise(0, 0.18, 0.24),
        tone('sine', 'E5', 0.12, 0.22, 0.4),
        tone('sine', 'G5', 0.22, 0.28, 0.36),
      ];
    case 'pioche':
      return [
        tone('square', 'B5', 0, 0.06, 0.28),
        tone('triangle', 'G5', 0.06, 0.08, 0.3),
        noise(0, 0.08, 0.14),
      ];
    case 'destruction':
      return [noise(0, 0.32, 0.44), thud(0.06, 0.24, 0.66), tone('sawtooth', 'G2', 0.02, 0.3, 0.22)];
    case 'burn':
      return [thud(0, 0.26, 0.72), tone('sawtooth', 'A2', 0.02, 0.32, 0.22), noise(0.04, 0.34, 0.34), tone('sawtooth', 'E2', 0, 0.4, 0.18)];
    case 'soin_long':
      return [
        tone('sine', 'C5', 0, 0.14, 0.38),
        tone('sine', 'E5', 0.13, 0.16, 0.38),
        tone('sine', 'G5', 0.27, 0.32, 0.36),
      ];
    case 'bouclier':
      return [bell('E5', 0, 1.0, 0.46), tone('sine', 'C5', 0.02, 0.42, 0.36)];

    // ── Combat ───────────────────────────────────────────────────────
    case 'attaque_declaree':
      return [tone('square', 'C4', 0, 0.08, 0.52), tone('square', 'E4', 0.08, 0.1, 0.46)];
    case 'attaque_confirmee':
      return [thud(0, 0.18, 0.82), tone('square', 'C5', 0.05, 0.12, 0.52), noise(0.02, 0.18, 0.28)];
    case 'blocage':
      return [thud(0, 0.14, 0.62), tone('square', 'G4', 0.04, 0.08, 0.42), tone('square', 'A4', 0.12, 0.12, 0.4)];
    case 'combat':
      return [
        thud(0, 0.28, 0.92),
        tone('sawtooth', 'A2', 0.02, 0.26, 0.26),
        noise(0.02, 0.22, 0.32),
        tone('square', 'E4', 0.12, 0.12, 0.36),
      ];
    case 'degats':
      return [thud(0, 0.2, 0.86), noise(0, 0.12, 0.3), tone('triangle', 'C3', 0, 0.2, 0.32)];
    case 'degats_sorcier':
      return [thud(0, 0.18, 0.82), tone('square', 'G4', 0.06, 0.12, 0.46), noise(0, 0.1, 0.28)];
    case 'coup_rapide':
      return [
        tone('square', 'E5', 0, 0.06, 0.42),
        tone('square', 'G5', 0.06, 0.06, 0.42),
        tone('square', 'B5', 0.12, 0.1, 0.4),
        noise(0, 0.08, 0.18),
      ];
    case 'impact':
      return [thud(0, 0.32, 0.88), tone('sawtooth', 'G1', 0.02, 0.34, 0.28), noise(0.02, 0.28, 0.36), bell('C4', 0.04, 0.6, 0.28)];

    // ── Magie & contre ───────────────────────────────────────────────
    case 'contresort':
      return [
        bell('D6', 0, 0.68, 0.52),
        tone('square', 'A4', 0.1, 0.12, 0.42),
        tone('square', 'E4', 0.22, 0.18, 0.4),
        noise(0.1, 0.14, 0.22),
      ];

    // ── UI ───────────────────────────────────────────────────────────
    case 'menu':
      return [tone('square', 'C5', 0, 0.06, 0.26), tone('square', 'E5', 0.05, 0.06, 0.22)];
    case 'select':
      return [tone('square', 'E4', 0, 0.07, 0.36), tone('square', 'G4', 0.07, 0.07, 0.36), tone('square', 'C5', 0.14, 0.14, 0.34)];
    case 'erreur':
      return [
        tone('triangle', 'E3', 0, 0.18, 0.5),
        tone('triangle', 'D#3', 0.12, 0.22, 0.46),
        thud(0, 0.16, 0.42),
      ];
    case 'pile':
      return [tone('square', 'B4', 0, 0.05, 0.26), tone('square', 'C5', 0.06, 0.07, 0.26)];
    case 'annuler':
      return [noise(0, 0.14, 0.24), tone('triangle', 'B4', 0, 0.1, 0.3), tone('triangle', 'G4', 0.1, 0.15, 0.3)];
    case 'hover':
      return [tone('square', 'A4', 0, 0.04, 0.14)];

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
