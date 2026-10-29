import test from 'node:test';
import assert from 'node:assert/strict';
import { closeSync, openSync, readSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CARD_ART_HAUTEUR, CARD_ART_LARGEUR } from '../src/games/rpgCardArt.js';

/**
 * Le poids des peintures, verrouillé.
 * -----------------------------------
 * Les faces étaient livrées en 1024 × 1280 (et en cinq formats voisins) pour
 * un affichage de 270 px au plus : 103 Mo de JPEG, 63 % du paquet du jeu, dans
 * l'installeur comme dans chaque visite du site. Elles sont désormais livrées
 * en 768 × 960, qualité 72 — 39 Mo, sans différence visible à l'écran.
 *
 * Ce test garde la porte fermée : une peinture neuve déposée en 1024 × 1280
 * échoue ici jusqu'à ce qu'elle passe par `npm run art:aleger`. Il ne lit que
 * l'en-tête SOF de chaque fichier, jamais l'image entière.
 */

const RACINE = new URL('../public/cards/', import.meta.url);
const CHEMIN = fileURLToPath(RACINE);

/** Largeur et hauteur d'un JPEG, lues dans son en-tête SOF. */
function dimensionsJpeg(chemin) {
  const descripteur = openSync(chemin, 'r');
  try {
    const entete = Buffer.alloc(64 * 1024);
    const lus = readSync(descripteur, entete, 0, entete.length, 0);
    assert.ok(lus > 4, `${chemin} est lisible`);
    assert.equal(entete[0], 0xff, `${chemin} est un JPEG`);
    assert.equal(entete[1], 0xd8, `${chemin} est un JPEG`);
    for (let i = 2; i + 9 < lus;) {
      if (entete[i] !== 0xff) { i += 1; continue; }
      const balise = entete[i + 1];
      const estSof = balise >= 0xc0 && balise <= 0xcf
        && ![0xc4, 0xc8, 0xcc].includes(balise);
      if (estSof) return [entete.readUInt16BE(i + 7), entete.readUInt16BE(i + 5)];
      i += 2 + entete.readUInt16BE(i + 2);
    }
  } finally {
    closeSync(descripteur);
  }
  throw new Error(`${chemin} : en-tête SOF introuvable`);
}

/** Tous les JPEG du dossier, à plat ou dans `alt/`. */
function peintures() {
  return readdirSync(CHEMIN, { withFileTypes: true })
    .flatMap((entree) => {
      if (entree.isFile()) return entree.name.endsWith('.jpg') ? [entree.name] : [];
      if (entree.name !== 'alt') return [];
      return readdirSync(`${CHEMIN}alt`, { withFileTypes: true })
        .filter((alt) => alt.isFile() && alt.name.endsWith('.jpg'))
        .map((alt) => `alt/${alt.name}`);
    });
}

const FICHIERS = peintures();
// Plafond par fichier : la plus lourde pèse 210 Ko en qualité 72. La marge
// laisse passer une peinture très détaillée sans laisser revenir du 1024.
const PLAFOND_FICHIER = 260 * 1024;
// Plafond global : 38 Mo livrés, 48 Mo autorisés. Les 10 Mo d'écart couvrent
// une quinzaine de cartes neuves avant qu'on doive y regarder.
const PLAFOND_TOTAL = 48 * 1024 * 1024;

test('chaque peinture est livrée en 768 × 960, la géométrie du cadre affiché', () => {
  assert.ok(FICHIERS.length > 380, `le catalogue est bien là (${FICHIERS.length} peintures)`);
  for (const fichier of FICHIERS) {
    assert.deepEqual(dimensionsJpeg(`${CHEMIN}${fichier}`), [CARD_ART_LARGEUR, CARD_ART_HAUTEUR],
      `${fichier} est au format livré — passez-le par npm run art:aleger`);
  }
});

test('aucune peinture ne dépasse 260 Ko, et le catalogue tient sous 48 Mo', () => {
  const lourdes = [];
  let total = 0;
  for (const fichier of FICHIERS) {
    const octets = statSync(`${CHEMIN}${fichier}`).size;
    total += octets;
    if (octets > PLAFOND_FICHIER) lourdes.push(`${fichier} (${Math.round(octets / 1024)} Ko)`);
  }
  assert.deepEqual(lourdes, [], 'aucune peinture au-dessus du plafond');
  assert.ok(total < PLAFOND_TOTAL,
    `le catalogue pèse ${Math.round(total / 1048576)} Mo, sous les 48 Mo`);
});
