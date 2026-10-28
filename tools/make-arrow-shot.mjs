/**
 * Fabrique `src/games/assets/arrow-shot.wav` — le son de l'Attaque ciblée.
 *
 * Le Sablier n'a jamais eu d'échantillon d'arc : toutes les frappes de
 * créatures jouaient `player-attack-hit.wav`, un coup d'épée. Ce générateur
 * écrit l'échantillon manquant, reproductible à l'octet près :
 *
 *   node tools/make-arrow-shot.mjs
 *
 * Le son tient en trois gestes, dans l'ordre où on les entend :
 *   1. la corde lâchée — deux partiels de corde qui tombent d'un demi-ton,
 *      très courts, avec le claquement sec de l'encoche ;
 *   2. le trait — un souffle de bande (800–3200 Hz) qui s'ouvre puis meurt ;
 *   3. l'empennage — un sifflement descendant, discret, qui file au loin.
 *
 * 44,1 kHz, mono, 16 bits, 0,55 s : un fichier de ~48 Ko, du calibre des
 * bruitages de table du jeu (jamais une musique).
 */
import { writeFileSync } from 'node:fs';

const SAMPLE_RATE = 44100;
const DUREE = 0.55;
const TOTAL = Math.round(SAMPLE_RATE * DUREE);

/** Un bruit blanc reproductible (aucun `Math.random`, le fichier ne bouge pas). */
function bruit(index) {
  const x = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

const echantillons = new Float64Array(TOTAL);

const ajouter = (index, valeur) => {
  if (index < 0 || index >= TOTAL) return;
  echantillons[index] += valeur;
};

// ── 1. La corde lâchée ─────────────────────────────────────────────────────
// Deux partiels, la fondamentale qui descend d'un demi-ton en 60 ms : c'est
// ce glissement qui fait « corde » et non « note ».
for (let i = 0; i < Math.round(0.16 * SAMPLE_RATE); i += 1) {
  const t = i / SAMPLE_RATE;
  const glissando = 1 - 0.06 * Math.min(1, t / 0.06);
  const enveloppe = Math.exp(-t / 0.045);
  const fondamentale = Math.sin(2 * Math.PI * 196 * glissando * t) * 0.42;
  const octave = Math.sin(2 * Math.PI * 392 * glissando * t + 0.6) * 0.16;
  const quinzieme = Math.sin(2 * Math.PI * 588 * t + 1.1) * 0.06;
  ajouter(i, (fondamentale + octave + quinzieme) * enveloppe);
}

// Le claquement de l'encoche : 4 ms de bruit très filtré, presque un tic.
for (let i = 0; i < Math.round(0.006 * SAMPLE_RATE); i += 1) {
  const t = i / SAMPLE_RATE;
  ajouter(i, bruit(i) * 0.5 * Math.exp(-t / 0.0016));
}

// ── 2. Le trait : un souffle de bande qui s'ouvre puis meurt ────────────────
// Bande 800–3200 Hz obtenue par différence de deux passe-bas à un pôle :
// aucun filtre externe, le calcul reste lisible.
let bas1 = 0;
let bas2 = 0;
const alphaHaut = 1 - Math.exp(-2 * Math.PI * 3200 / SAMPLE_RATE);
const alphaBas = 1 - Math.exp(-2 * Math.PI * 800 / SAMPLE_RATE);
for (let i = 0; i < Math.round(0.42 * SAMPLE_RATE); i += 1) {
  const t = i / SAMPLE_RATE;
  const blanc = bruit(i * 7 + 3);
  bas1 += alphaHaut * (blanc - bas1);
  bas2 += alphaBas * (blanc - bas2);
  const bande = bas1 - bas2;
  // Attaque de 18 ms (le trait part), deux pentes de fuite : l'air puis le
  // silence, sans coupure audible.
  const attaque = Math.min(1, t / 0.018);
  const fuite = Math.exp(-t / 0.13) * 0.55 + Math.exp(-t / 0.36) * 0.45;
  ajouter(i + Math.round(0.008 * SAMPLE_RATE), bande * attaque * fuite * 1.35);
}

// ── 3. L'empennage : un sifflement qui descend et s'éloigne ────────────────
for (let i = 0; i < Math.round(0.5 * SAMPLE_RATE); i += 1) {
  const t = i / SAMPLE_RATE;
  // Fréquence linéaire 1900 → 950 Hz sur 0,5 s : la phase est son intégrale.
  const phase = 2 * Math.PI * (1900 * t - (950 * t * t) / 1.0);
  const enveloppe = Math.min(1, t / 0.03) * Math.exp(-t / 0.19) * 0.055;
  ajouter(i + Math.round(0.012 * SAMPLE_RATE), Math.sin(phase) * enveloppe);
}

// ── Fin : fondu de 30 ms et normalisation à 0,85 ───────────────────────────
let crete = 0;
for (let i = 0; i < TOTAL; i += 1) crete = Math.max(crete, Math.abs(echantillons[i]));
const gain = crete > 0 ? 0.85 / crete : 1;
const fondu = Math.round(0.03 * SAMPLE_RATE);
for (let i = 0; i < TOTAL; i += 1) {
  const reste = TOTAL - i;
  const attenuation = reste < fondu ? reste / fondu : 1;
  echantillons[i] = Math.max(-1, Math.min(1, echantillons[i] * gain * attenuation));
}

// ── Écriture du WAV (PCM 16 bits mono) ─────────────────────────────────────
const octetsDonnees = TOTAL * 2;
const tampon = Buffer.alloc(44 + octetsDonnees);
tampon.write('RIFF', 0, 'ascii');
tampon.writeUInt32LE(36 + octetsDonnees, 4);
tampon.write('WAVE', 8, 'ascii');
tampon.write('fmt ', 12, 'ascii');
tampon.writeUInt32LE(16, 16); // taille du bloc fmt
tampon.writeUInt16LE(1, 20); // PCM
tampon.writeUInt16LE(1, 22); // mono
tampon.writeUInt32LE(SAMPLE_RATE, 24);
tampon.writeUInt32LE(SAMPLE_RATE * 2, 28); // octets par seconde
tampon.writeUInt16LE(2, 32); // alignement
tampon.writeUInt16LE(16, 34); // bits par échantillon
tampon.write('data', 36, 'ascii');
tampon.writeUInt32LE(octetsDonnees, 40);
for (let i = 0; i < TOTAL; i += 1) {
  tampon.writeInt16LE(Math.round(echantillons[i] * 32767), 44 + i * 2);
}

const sortie = new URL('../src/games/assets/arrow-shot.wav', import.meta.url);
writeFileSync(sortie, tampon);
console.log(`arrow-shot.wav écrit : ${tampon.length} octets, ${DUREE} s, ${SAMPLE_RATE} Hz mono`);
