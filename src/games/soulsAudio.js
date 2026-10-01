// ════════════════════════════════════════════════════════════════════
// LA CENDRE — audio de combat (synthèse WebAudio, zéro fichier)
// Créé uniquement après un geste utilisateur (autorisation autoplay).
// ════════════════════════════════════════════════════════════════════

let ctx = null;
let noiseBuffer = null;

function ensure() {
  if (ctx) return ctx;
  const AudioCtx = typeof window !== 'undefined'
    ? (window.AudioContext || window.webkitAudioContext)
    : null;
  if (!AudioCtx) return null;
  try {
    ctx = new AudioCtx();
  } catch {
    return null;
  }
  return ctx;
}

function noise(ac) {
  if (!noiseBuffer) {
    noiseBuffer = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer;
  return src;
}

function env(ac, gain, peak, attack, decay) {
  const t = ac.currentTime;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

/** Son de combat nommé — silencieux si l'audio n'est pas disponible. */
export function playSouls(name) {
  const ac = ensure();
  if (!ac) return;
  if (ac.state === 'suspended') ac.resume?.();
  try {
    switch (name) {
      case 'swing': { // whoosh d'arme
        const src = noise(ac);
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 1.4;
        bp.frequency.setValueAtTime(1400, ac.currentTime);
        bp.frequency.exponentialRampToValueAtTime(320, ac.currentTime + 0.16);
        const g = ac.createGain();
        env(ac, g, 0.14, 0.02, 0.16);
        src.connect(bp).connect(g).connect(ac.destination);
        src.start();
        src.stop(ac.currentTime + 0.22);
        break;
      }
      case 'swingHeavy': {
        const src = noise(ac);
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 1.1;
        bp.frequency.setValueAtTime(900, ac.currentTime);
        bp.frequency.exponentialRampToValueAtTime(180, ac.currentTime + 0.26);
        const g = ac.createGain();
        env(ac, g, 0.2, 0.03, 0.26);
        src.connect(bp).connect(g).connect(ac.destination);
        src.start();
        src.stop(ac.currentTime + 0.34);
        break;
      }
      case 'hit': { // impact sur armure : corps + ping métallique
        const osc = ac.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(170, ac.currentTime);
        osc.frequency.exponentialRampToValueAtTime(58, ac.currentTime + 0.1);
        const g = ac.createGain();
        env(ac, g, 0.3, 0.004, 0.12);
        osc.connect(g).connect(ac.destination);
        osc.start();
        osc.stop(ac.currentTime + 0.16);
        const ping = ac.createOscillator();
        ping.type = 'triangle';
        ping.frequency.setValueAtTime(2350, ac.currentTime);
        ping.frequency.exponentialRampToValueAtTime(1750, ac.currentTime + 0.09);
        const pg = ac.createGain();
        env(ac, pg, 0.1, 0.003, 0.09);
        ping.connect(pg).connect(ac.destination);
        ping.start();
        ping.stop(ac.currentTime + 0.12);
        break;
      }
      case 'riposte': { // coup particulièrement nourri
        const osc = ac.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, ac.currentTime);
        osc.frequency.exponentialRampToValueAtTime(48, ac.currentTime + 0.18);
        const g = ac.createGain();
        env(ac, g, 0.34, 0.005, 0.2);
        osc.connect(g).connect(ac.destination);
        osc.start();
        osc.stop(ac.currentTime + 0.24);
        break;
      }
      case 'hurt': { // le joueur encaisse
        const osc = ac.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ac.currentTime);
        osc.frequency.exponentialRampToValueAtTime(84, ac.currentTime + 0.2);
        const lp = ac.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 900;
        const g = ac.createGain();
        env(ac, g, 0.26, 0.006, 0.22);
        osc.connect(lp).connect(g).connect(ac.destination);
        osc.start();
        osc.stop(ac.currentTime + 0.26);
        break;
      }
      case 'roll': { // roulade dans la cendre
        const src = noise(ac);
        const lp = ac.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(1600, ac.currentTime);
        lp.frequency.exponentialRampToValueAtTime(400, ac.currentTime + 0.3);
        const g = ac.createGain();
        env(ac, g, 0.1, 0.04, 0.3);
        src.connect(lp).connect(g).connect(ac.destination);
        src.start();
        src.stop(ac.currentTime + 0.38);
        break;
      }
      case 'whiff': { // esquive parfaite (l'arme passe à travers)
        const src = noise(ac);
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 3;
        bp.frequency.setValueAtTime(2600, ac.currentTime);
        bp.frequency.exponentialRampToValueAtTime(900, ac.currentTime + 0.14);
        const g = ac.createGain();
        env(ac, g, 0.12, 0.01, 0.14);
        src.connect(bp).connect(g).connect(ac.destination);
        src.start();
        src.stop(ac.currentTime + 0.18);
        break;
      }
      case 'lock': { // verrouillage
        const osc = ac.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(620, ac.currentTime);
        osc.frequency.exponentialRampToValueAtTime(940, ac.currentTime + 0.07);
        const g = ac.createGain();
        env(ac, g, 0.12, 0.004, 0.08);
        osc.connect(g).connect(ac.destination);
        osc.start();
        osc.stop(ac.currentTime + 0.11);
        break;
      }
      case 'aggro': { // l'ennemi vous a repéré
        const osc = ac.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, ac.currentTime);
        osc.frequency.exponentialRampToValueAtTime(165, ac.currentTime + 0.28);
        const g = ac.createGain();
        env(ac, g, 0.2, 0.05, 0.32);
        osc.connect(g).connect(ac.destination);
        osc.start();
        osc.stop(ac.currentTime + 0.42);
        break;
      }
      case 'death': { // ennemi vaincu
        const osc = ac.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, ac.currentTime);
        osc.frequency.exponentialRampToValueAtTime(52, ac.currentTime + 0.55);
        const g = ac.createGain();
        env(ac, g, 0.24, 0.01, 0.6);
        osc.connect(g).connect(ac.destination);
        osc.start();
        osc.stop(ac.currentTime + 0.68);
        const src = noise(ac);
        const lp = ac.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 700;
        const ng = ac.createGain();
        env(ac, ng, 0.1, 0.02, 0.5);
        src.connect(lp).connect(ng).connect(ac.destination);
        src.start();
        src.stop(ac.currentTime + 0.6);
        break;
      }
      case 'souls': { // ramassage / gain d'âmes : scintillement montant
        for (const [f0, f1, delay] of [[660, 990, 0], [880, 1320, 0.07]]) {
          const osc = ac.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f0, ac.currentTime + delay);
          osc.frequency.exponentialRampToValueAtTime(f1, ac.currentTime + delay + 0.28);
          const g = ac.createGain();
          g.gain.setValueAtTime(0.0001, ac.currentTime + delay);
          g.gain.exponentialRampToValueAtTime(0.14, ac.currentTime + delay + 0.03);
          g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + delay + 0.34);
          osc.connect(g).connect(ac.destination);
          osc.start(ac.currentTime + delay);
          osc.stop(ac.currentTime + delay + 0.4);
        }
        break;
      }
      case 'flask': { // gorgée : souffle doux + verre
        const src = noise(ac);
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 950;
        bp.Q.value = 1.4;
        const g = ac.createGain();
        env(ac, g, 0.16, 0.05, 0.5);
        src.connect(bp).connect(g).connect(ac.destination);
        src.start();
        src.stop(ac.currentTime + 0.6);
        const osc = ac.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, ac.currentTime + 0.18);
        osc.frequency.exponentialRampToValueAtTime(260, ac.currentTime + 0.5);
        const og = ac.createGain();
        og.gain.setValueAtTime(0.0001, ac.currentTime + 0.18);
        og.gain.exponentialRampToValueAtTime(0.1, ac.currentTime + 0.24);
        og.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.55);
        osc.connect(og).connect(ac.destination);
        osc.start(ac.currentTime + 0.18);
        osc.stop(ac.currentTime + 0.6);
        break;
      }
      case 'rest': { // repos au feu : nappe chaleureuse
        for (const f of [110, 165, 220]) {
          const osc = ac.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = f;
          const g = ac.createGain();
          g.gain.setValueAtTime(0.0001, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.09, ac.currentTime + 0.5);
          g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.6);
          osc.connect(g).connect(ac.destination);
          osc.start();
          osc.stop(ac.currentTime + 1.7);
        }
        break;
      }
      case 'lost': { // mort du joueur : chute sombre
        const osc = ac.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(196, ac.currentTime);
        osc.frequency.exponentialRampToValueAtTime(49, ac.currentTime + 1.1);
        const g = ac.createGain();
        env(ac, g, 0.3, 0.02, 1.3);
        osc.connect(g).connect(ac.destination);
        osc.start();
        osc.stop(ac.currentTime + 1.5);
        const src = noise(ac);
        const lp = ac.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 420;
        const ng = ac.createGain();
        env(ac, ng, 0.14, 0.04, 1.1);
        src.connect(lp).connect(ng).connect(ac.destination);
        src.start();
        src.stop(ac.currentTime + 1.3);
        break;
      }
      case 'chest': { // coffre : grincement de charnière + carillon de la clé
        const sq = ac.createOscillator();
        sq.type = 'sawtooth';
        sq.frequency.setValueAtTime(90, ac.currentTime);
        sq.frequency.exponentialRampToValueAtTime(240, ac.currentTime + 0.55);
        const lp = ac.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 520;
        const sg = ac.createGain();
        env(ac, sg, 0.1, 0.08, 0.55);
        sq.connect(lp).connect(sg).connect(ac.destination);
        sq.start();
        sq.stop(ac.currentTime + 0.75);
        for (const [f, delay] of [[784, 0.5], [988, 0.62], [1318, 0.74]]) {
          const osc = ac.createOscillator();
          osc.type = 'triangle';
          osc.frequency.value = f;
          const g = ac.createGain();
          g.gain.setValueAtTime(0.0001, ac.currentTime + delay);
          g.gain.exponentialRampToValueAtTime(0.13, ac.currentTime + delay + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + delay + 0.9);
          osc.connect(g).connect(ac.destination);
          osc.start(ac.currentTime + delay);
          osc.stop(ac.currentTime + delay + 1);
        }
        break;
      }
      case 'gate': { // grand portail : verrou, puis grondement de pierre
        const clunk = ac.createOscillator();
        clunk.type = 'square';
        clunk.frequency.setValueAtTime(140, ac.currentTime);
        clunk.frequency.exponentialRampToValueAtTime(55, ac.currentTime + 0.18);
        const cg = ac.createGain();
        env(ac, cg, 0.2, 0.01, 0.22);
        clunk.connect(cg).connect(ac.destination);
        clunk.start();
        clunk.stop(ac.currentTime + 0.3);
        const src = noise(ac);
        const lp = ac.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(260, ac.currentTime);
        lp.frequency.linearRampToValueAtTime(120, ac.currentTime + 2.6);
        const ng = ac.createGain();
        env(ac, ng, 0.34, 0.5, 2.2);
        src.loop = true;
        src.connect(lp).connect(ng).connect(ac.destination);
        src.start(ac.currentTime + 0.15);
        src.stop(ac.currentTime + 3.0);
        break;
      }
      case 'roar': { // le Roi se dresse : grondement grave qui monte
        const osc = ac.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(48, ac.currentTime);
        osc.frequency.exponentialRampToValueAtTime(96, ac.currentTime + 1.6);
        osc.frequency.exponentialRampToValueAtTime(58, ac.currentTime + 2.4);
        const lp = ac.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(220, ac.currentTime);
        lp.frequency.linearRampToValueAtTime(700, ac.currentTime + 1.7);
        const g = ac.createGain();
        env(ac, g, 0.3, 0.9, 1.6);
        osc.connect(lp).connect(g).connect(ac.destination);
        osc.start();
        osc.stop(ac.currentTime + 2.7);
        break;
      }
      default:
        break;
    }
  } catch {
    // jamais de crash audio en plein combat
  }
}
