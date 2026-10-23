#!/usr/bin/env node
/**
 * Les vignettes de la carte de profil — tools/make-profil-vignettes.mjs
 * ---------------------------------------------------------------------
 * Deux bandeaux de choix vivent sur la carte de profil : douze visages de
 * personnages et douze terrains de duel. Leurs peintures d'origine font de
 * 160 Ko à 4 Mo — les charger toutes pour un choix, c'est plus lourd que la
 * partie qui suit. Cet outil en découpe donc des **vignettes**, écrites dans
 * `public/profil/` et suivies par le dépôt, comme les sprites du récit
 * (`public/sablier-story/stands/`, générés par `tools/make-stands.py`).
 *
 *     node tools/make-profil-vignettes.mjs            # régénère tout
 *     node tools/make-profil-vignettes.mjs --verifier # ne régénère rien
 *
 * Les visages sont découpés **au même endroit que le jeu les cadre** : la bible
 * du récit (`rpgStoryCast.js`) donne, par personnage, un `position` en
 * pourcentages — c'est le `background-position` d'un cadre en
 * `background-size: cover`. L'outil reproduit exactement ce calcul, pour qu'un
 * avatar rond de 52 px montre le même visage que le portrait de la scène, sans
 * jamais couper une tête. Les terrains sont recadrés au centre, au ratio 3:2 de
 * leurs fonds — là où la table pose les cartes.
 *
 * L'outil lit les catalogues du jeu plutôt qu'une liste recopiée : ajouter un
 * personnage à `RPG_AVATAR_IDS` suffit pour que sa vignette existe au prochain
 * passage. Une figure **repeinte** (`rpgCardArt.js` change sa révision) doit
 * passer par ici, puis par `AVATAR_REVISION` / `PLATEAU_VIGNETTE_REVISION` pour
 * que les caches suivent.
 *
 * Dépendance : ImageMagick (`convert`), comme pour les sprites du récit.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  AVATAR_TAILLE,
  RPG_AVATAR_IDS,
  figureDAvatar,
  vignetteAvatarRelative,
} from '../src/games/rpgAvatars.js';
import {
  PLATEAU_VIGNETTE_LARGEUR,
  RPG_PLATEAUX,
  vignettePlateauRelative,
} from '../src/games/rpgPlateaux.js';
import {
  DOS_DE_CARTE_LARGEUR,
  DOS_DE_CARTE_SOURCE,
  vignetteDosRelative,
} from '../src/games/rpgProfilGains.js';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(RACINE, 'public');
const VERIFIER = process.argv.includes('--verifier');

/** La taille d'une image, lue par ImageMagick. */
function dimensions(fichier) {
  const brut = execFileSync('convert', [fichier, '-format', '%w %h', 'info:'], { encoding: 'utf8' });
  const [largeur, hauteur] = brut.trim().split(/\s+/).map(Number);
  return { largeur, hauteur };
}

/**
 * Le recadrage `background-size: cover` + `background-position: px% py%`, dans
 * les coordonnées de l'image source. C'est le calcul du navigateur, à l'octave
 * près : la vignette montre ce que le cadre du jeu montre.
 */
function recadrageCover({ largeur, hauteur }, cible, position = '50% 50%') {
  const [px, py] = String(position).split(/\s+/).map((valeur) => {
    const nombre = Number.parseFloat(valeur);
    return Number.isFinite(nombre) ? Math.min(100, Math.max(0, nombre)) : 50;
  });
  const echelle = Math.max(cible.largeur / largeur, cible.hauteur / hauteur);
  const decoupe = {
    largeur: cible.largeur / echelle,
    hauteur: cible.hauteur / echelle,
  };
  return {
    ...decoupe,
    x: (largeur - decoupe.largeur) * (px / 100),
    y: (hauteur - decoupe.hauteur) * (py / 100),
  };
}

/** Une vignette : recadrage, mise à l'échelle, WebP. Rend le poids écrit. */
function ecrireVignette(source, sortie, cible, position) {
  const { largeur, hauteur } = dimensions(source);
  const coupe = recadrageCover({ largeur, hauteur }, cible, position);
  const entier = (nombre) => String(Math.max(1, Math.round(nombre)));
  const arguments_ = [
    source,
    '-crop', `${entier(coupe.largeur)}x${entier(coupe.hauteur)}+${entier(coupe.x)}+${entier(coupe.y)}`,
    '+repage',
    '-resize', `${cible.largeur}x${cible.hauteur}`,
    '-strip',
    '-quality', '80',
    '-define', 'webp:method=6',
    sortie,
  ];
  if (!VERIFIER) {
    // ImageMagick ne crée pas les dossiers : `public/profil/` naît ici.
    mkdirSync(path.dirname(sortie), { recursive: true });
    execFileSync('convert', arguments_, { stdio: 'inherit' });
  }
  return sortie;
}

const ko = (fichier) => `${(statSync(fichier).size / 1024).toFixed(1)} Ko`;
const lignes = [];
const manquants = [];

// ── Les visages : un carré, cadré comme la scène le cadre ───────────────────
for (const id of RPG_AVATAR_IDS) {
  const figure = figureDAvatar(id);
  const relative = vignetteAvatarRelative(id);
  const source = path.join(PUBLIC, figure.portrait);
  const sortie = path.join(PUBLIC, relative);
  if (!existsSync(source)) { manquants.push(source); continue; }
  if (VERIFIER) {
    if (existsSync(sortie)) lignes.push(['visage', id, ko(sortie)]);
    else manquants.push(sortie);
    continue;
  }
  ecrireVignette(source, sortie, { largeur: AVATAR_TAILLE, hauteur: AVATAR_TAILLE }, figure.position);
  lignes.push(['visage', id, ko(sortie)]);
}

// ── Les terrains : le ratio 3:2 de leurs fonds, recadré au centre ───────────
const ciblePlateau = {
  largeur: PLATEAU_VIGNETTE_LARGEUR,
  hauteur: Math.round((PLATEAU_VIGNETTE_LARGEUR * 2) / 3),
};
for (const plateau of RPG_PLATEAUX) {
  const source = path.join(PUBLIC, plateau.fichier);
  const sortie = path.join(PUBLIC, vignettePlateauRelative(plateau));
  if (!existsSync(source)) { manquants.push(source); continue; }
  if (VERIFIER) {
    if (existsSync(sortie)) lignes.push(['plateau', plateau.id, ko(sortie)]);
    else manquants.push(sortie);
    continue;
  }
  ecrireVignette(source, sortie, ciblePlateau, '50% 50%');
  lignes.push(['plateau', plateau.id, ko(sortie)]);
}

// ── Le dos de carte : la miniature que la piste montre pour un paquet ───────
// Cinq cartes face cachée — on montre le dos, jamais un tirage qui n'a pas eu
// lieu. 4:5 comme une carte en jeu.
{
  const source = path.join(PUBLIC, DOS_DE_CARTE_SOURCE);
  const sortie = path.join(PUBLIC, vignetteDosRelative());
  const cible = {
    largeur: DOS_DE_CARTE_LARGEUR,
    hauteur: Math.round((DOS_DE_CARTE_LARGEUR * 5) / 4),
  };
  if (!existsSync(source)) manquants.push(source);
  else if (VERIFIER) {
    if (existsSync(sortie)) lignes.push(['dos', 'dos-de-carte', ko(sortie)]);
    else manquants.push(sortie);
  } else {
    ecrireVignette(source, sortie, cible, '50% 40%');
    lignes.push(['dos', 'dos-de-carte', ko(sortie)]);
  }
}

for (const [famille, id, poids] of lignes) {
  console.log(`${famille.padEnd(8)} ${id.padEnd(24)} ${poids}`);
}
const total = lignes.length;
console.log(`\n${total} vignettes (${VERIFIER ? 'vérifiées' : 'écrites'}) dans public/profil/.`);

if (manquants.length) {
  console.error(`\nManquants :\n${manquants.map((fichier) => `  - ${fichier}`).join('\n')}`);
  process.exitCode = 1;
}
