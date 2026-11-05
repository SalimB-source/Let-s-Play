#!/usr/bin/env node
/**
 * Icônes des APK — `scripts/android-icons.mjs`
 * --------------------------------------------
 * Une seule coque Android, trois applications : chacune a son icône de lanceur,
 * et Android veut **quatre variantes par densité** (API 26+ : fond, premier
 * plan, monochrome ; API < 26 : icône pleine).
 *
 *   - `site`      → l'icône historique, laissée telle quelle (`ic_launcher`) ;
 *   - `sablier`   → le sablier d'or sur nuit, dessiné par `desktop/make-icon.mjs` ;
 *   - `vice-city` → le coucher de soleil de Vice City Rush, même générateur.
 *
 * Pourquoi réutiliser le dessinateur du PC : les deux icônes existent déjà, en
 * pur JavaScript, sans `sharp` (que la CI Android n'installe pas). Un seul
 * dessin par jeu, deux formats (`.ico`/`.png` sur PC, `mipmap-*` sur Android).
 *
 * Usage : `node scripts/android-icons.mjs [site|sablier|vice-city|tous]`
 *   → écrit dans `android/app/src/main/res/mipmap-<densité>/`.
 *   Par défaut : `tous`, ce que fait la CI avant chaque build d'APK.
 *
 * Les fichiers produits sont **versionnés** : un build local n'a pas besoin de
 * lancer ce script, seul un changement de dessin le justifie.
 */
import { inflateSync } from 'node:zlib';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { encoderPng, reduire } from '../desktop/icones.mjs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// Les PNG maîtres sont **lus**, pas redessinés : les dessins vivent dans
// `desktop/icones.mjs` et servent d'abord au PC (`make-icon.mjs`). Les relire
// garantit que les deux plateformes montrent exactement la même icône.

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RES = join(RACINE, 'android', 'app', 'src', 'main', 'res');

/** Densités Android et leur facteur (1 dp = `échelle` px). */
const DENSITES = [['mdpi', 1], ['hdpi', 1.5], ['xhdpi', 2], ['xxhdpi', 3], ['xxxhdpi', 4]];

/** Rendu maître : assez grand pour toutes les densités (xxxhdpi = 192 px). */
const MAITRE = 1024;

/**
 * Décode un PNG RGBA 8 bits non entrelacé (filtres 0 à 4 de la spécification).
 * Le décodeur est volontairement minimal : il ne lit que nos propres PNG, écrits
 * par `encoderPng` avec le filtre 0 — mais il applique quand même les cinq
 * filtres, pour rester juste si un outil réécrit le fichier.
 */
function lirePng(chemin) {
  const donnees = readFileSync(chemin);
  let position = 8;                    // signature PNG
  let largeur = 0; let hauteur = 0;
  const morceaux = [];
  while (position < donnees.length) {
    const longueur = donnees.readUInt32BE(position);
    const type = donnees.toString('ascii', position + 4, position + 8);
    const corps = donnees.subarray(position + 8, position + 8 + longueur);
    if (type === 'IHDR') {
      largeur = corps.readUInt32BE(0);
      hauteur = corps.readUInt32BE(4);
      if (corps[8] !== 8 || corps[9] !== 6 || corps[12] !== 0) {
        throw new Error(`${chemin} : PNG non RGBA 8 bits non entrelacé`);
      }
    } else if (type === 'IDAT') {
      morceaux.push(corps);
    } else if (type === 'IEND') {
      break;
    }
    position += 12 + longueur;
  }
  const brut = inflateSync(Buffer.concat(morceaux));
  const sortie = new Uint8ClampedArray(largeur * hauteur * 4);
  const octetsParPixel = 4;
  const longueurLigne = largeur * octetsParPixel + 1;
  for (let y = 0; y < hauteur; y++) {
    const filtre = brut[y * longueurLigne];
    const ligne = y * longueurLigne + 1;
    const precedente = (y - 1) * longueurLigne + 1;
    for (let x = 0; x < largeur * octetsParPixel; x++) {
      const valeur = brut[ligne + x];
      const gauche = x >= octetsParPixel ? sortie[y * largeur * 4 + x - octetsParPixel] : 0;
      const haut = y > 0 ? sortie[(y - 1) * largeur * 4 + x] : 0;
      const hautGauche = y > 0 && x >= octetsParPixel ? sortie[(y - 1) * largeur * 4 + x - octetsParPixel] : 0;
      let reel = valeur;
      if (filtre === 1) reel = (valeur + gauche) & 255;
      else if (filtre === 2) reel = (valeur + haut) & 255;
      else if (filtre === 3) reel = (valeur + ((gauche + haut) >> 1)) & 255;
      else if (filtre === 4) {
        const p = gauche + haut - hautGauche;
        const pa = Math.abs(p - gauche); const pb = Math.abs(p - haut); const pc = Math.abs(p - hautGauche);
        const predit = pa <= pb && pa <= pc ? gauche : (pb <= pc ? haut : hautGauche);
        reel = (valeur + predit) & 255;
      }
      sortie[y * largeur * 4 + x] = reel;
    }
  }
  return { pixels: sortie, largeur };
}

/** Les jeux à dessiner, avec leur nom de ressource Android. */
const JEUX = {
  sablier: { nom: 'ic_launcher_sablier' },
  'vice-city': { nom: 'ic_launcher_vice_city' },
};

/** Emprise du dessin dans la zone sûre de l'icône adaptative (108 dp). */
const PART_DESSIN = 0.74;

/**
 * Écrit, pour un jeu, les quatre variantes dans chaque densité, et son XML
 * d'icône adaptative (API 26+).
 */
function ecrireJeu(id, maitre) {
  const { nom } = JEUX[id];

  for (const [densite, echelle] of DENSITES) {
    const dossier = join(RES, `mipmap-${densite}`);
    mkdirSync(dossier, { recursive: true });

    // 1) API < 26 : l'icône entière, posée à 48 dp.
    const taillePleine = Math.round(48 * echelle);
    writeFileSync(join(dossier, `${nom}.png`), encoderPng(reduire(maitre, MAITRE, taillePleine), taillePleine));

    // 2) API 26+ : canvas adaptatif de 108 dp, dessin réduit et centré dans la
    //    zone sûre (les lanceurs le masquent en cercle, en goutte, en carré).
    const canvas = Math.round(108 * echelle);
    const dessin = Math.round(canvas * PART_DESSIN);
    const centre = Math.round((canvas - dessin) / 2);
    const premierPlan = new Uint8ClampedArray(canvas * canvas * 4);
    const reduit = reduire(maitre, MAITRE, dessin);
    for (let y = 0; y < dessin; y++) {
      for (let x = 0; x < dessin; x++) {
        const source = (y * dessin + x) * 4;
        const cible = ((y + centre) * canvas + (x + centre)) * 4;
        premierPlan[cible] = reduit[source];
        premierPlan[cible + 1] = reduit[source + 1];
        premierPlan[cible + 2] = reduit[source + 2];
        premierPlan[cible + 3] = reduit[source + 3];
      }
    }
    writeFileSync(join(dossier, `${nom}_foreground.png`), encoderPng(premierPlan, canvas));

    // 3) Monochrome (thèmes Android 13+) : la même silhouette, en blanc, dont
    //    l'alpha suit la luminance du dessin — Android la teinte lui-même.
    const mono = new Uint8ClampedArray(canvas * canvas * 4);
    for (let i = 0; i < canvas * canvas; i++) {
      const source = i * 4;
      const luminance = 0.299 * premierPlan[source] + 0.587 * premierPlan[source + 1] + 0.114 * premierPlan[source + 2];
      mono[source] = 255; mono[source + 1] = 255; mono[source + 2] = 255;
      // Le fond du dessin est opaque : sans ce seuil, la monochrome serait un
      // carré plein. On ne garde que ce qui est visiblement dessiné.
      mono[source + 3] = premierPlan[source + 3] > 8 ? Math.round(luminance) : 0;
    }
    writeFileSync(join(dossier, `${nom}_monochrome.png`), encoderPng(mono, canvas));
  }

  // 4) Le XML d'icône adaptative : fond uni (le noir du site) + les deux calques.
  const dossierAny = join(RES, 'mipmap-anydpi-v26');
  mkdirSync(dossierAny, { recursive: true });
  writeFileSync(join(dossierAny, `${nom}.xml`), `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/lp_black" />
    <foreground android:drawable="@mipmap/${nom}_foreground" />
    <monochrome android:drawable="@mipmap/${nom}_monochrome" />
</adaptive-icon>
`);

  console.log(`[icônes android] ${id} → ${nom} (${DENSITES.length} densités)`);
}

/** PNG maîtres : ceux que produit `node desktop/make-icon.mjs`. */
const PNG_MAITRE = {
  sablier: join(RACINE, 'desktop', 'app-icons', 'icon-1024.png'),
  'vice-city': join(RACINE, 'desktop', 'app-icons-vice-city', 'icon-1024.png'),
};

const demande = (process.argv[2] || 'tous').trim();
if (demande !== 'tous' && !PNG_MAITRE[demande]) {
  console.error(`usage : node scripts/android-icons.mjs [tous|${Object.keys(PNG_MAITRE).join('|')}]`);
  process.exit(1);
}
const cibles = demande === 'tous' ? Object.keys(PNG_MAITRE) : [demande];

for (const id of cibles) {
  if (!existsSync(PNG_MAITRE[id])) {
    console.error(`[icônes android] ${PNG_MAITRE[id]} manquant.`);
    console.error('                  Lancez d’abord : node desktop/make-icon.mjs');
    process.exit(1);
  }
  const { pixels, largeur } = lirePng(PNG_MAITRE[id]);
  ecrireJeu(id, largeur === MAITRE ? pixels : reduire(pixels, largeur, MAITRE));
}
console.log(`Icônes Android générées : ${cibles.join(', ')}.`);
