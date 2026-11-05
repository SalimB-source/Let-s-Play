#!/usr/bin/env node
/**
 * Icônes des apps PC — desktop/make-icon.mjs
 * ------------------------------------------
 * Une seule coque, deux applications : ce script écrit l'icône de **chaque**
 * jeu dans son dossier (voir `desktop/jeux.js`, champ `icones`) :
 *
 *   - `desktop/app-icons/`           → Le Sablier de Bab El ;
 *   - `desktop/app-icons-vice-city/` → Vice City Rush.
 *
 * Pour chaque jeu, trois fichiers :
 *
 *   - `icon.png`       (512 × 512, Linux + source des autres) ;
 *   - `icon-1024.png`  (visuels : README, store, réseaux) ;
 *   - `icon.ico`       (16, 24, 32, 48, 64, 128 en BMP 32 bits + 256 en PNG
 *                       compressé — le format attendu par l'explorateur et la
 *                       barre des tâches Windows).
 *
 * Les dessins eux-mêmes vivent dans `desktop/icones.mjs`, sans effet de bord :
 * `scripts/android-icons.mjs` les réutilise pour les APK.
 *
 * Encodage sans dépendance : PNG avec `node:zlib`, ICO à la main.
 *
 * Usage : `node desktop/make-icon.mjs` (régénère les six fichiers).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE, SUPER, encoderPng, reduire, rendre, rendreViceCity } from './icones.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
/** Un dossier d'icônes par jeu (voir `desktop/jeux.js`, champ `icones`). */
const SORTIE_SABLIER = join(ICI, 'app-icons');
const SORTIE_VICE_CITY = join(ICI, 'app-icons-vice-city');

const TAILLES_ICO = [16, 24, 32, 48, 64, 128];  // BMP
const TAILLE_ICO_PNG = 256;                     // PNG dans l'ICO

// ---------------------------------------------------------------------------
// Encodage ICO (entrées BMP 32 bits + une entrée PNG 256)
// ---------------------------------------------------------------------------
/** Image BMP/DIB d'une entrée ICO : en-tête (hauteur doublée) + pixels BGRA de
 * bas en haut + masque AND (1 bit, lignes alignées sur 4 octets). */
function bmpPourIco(pixels, taille) {
  const entete = Buffer.alloc(40);
  entete.writeUInt32LE(40, 0);
  entete.writeInt32LE(taille, 4);
  entete.writeInt32LE(taille * 2, 8);      // XOR + AND
  entete.writeUInt16LE(1, 12);
  entete.writeUInt16LE(32, 14);
  entete.writeUInt32LE(0, 16);             // BI_RGB
  entete.writeUInt32LE(taille * taille * 4, 20);

  const xor = Buffer.alloc(taille * taille * 4);
  for (let y = 0; y < taille; y++) {
    const ligneCible = taille - 1 - y;     // BMP : de bas en haut
    for (let x = 0; x < taille; x++) {
      const src = (y * taille + x) * 4;
      const dst = (ligneCible * taille + x) * 4;
      xor[dst] = pixels[src + 2];          // B
      xor[dst + 1] = pixels[src + 1];      // G
      xor[dst + 2] = pixels[src];          // R
      xor[dst + 3] = pixels[src + 3];      // A
    }
  }

  const octetsParLigne = Math.ceil(taille / 32) * 4;
  const and = Buffer.alloc(octetsParLigne * taille);
  for (let y = 0; y < taille; y++) {
    const ligneCible = taille - 1 - y;
    for (let x = 0; x < taille; x++) {
      const alpha = pixels[(y * taille + x) * 4 + 3];
      if (alpha < 128) and[ligneCible * octetsParLigne + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return Buffer.concat([entete, xor, and]);
}

export function encoderIco(entrees) {
  const entete = Buffer.alloc(6);
  entete.writeUInt16LE(0, 0);
  entete.writeUInt16LE(1, 2);              // type icône
  entete.writeUInt16LE(entrees.length, 4);

  const repertoires = [];
  const images = [];
  let decalage = 6 + entrees.length * 16;
  for (const { taille, donnees } of entrees) {
    const dir = Buffer.alloc(16);
    dir[0] = taille >= 256 ? 0 : taille;   // 0 signifie 256
    dir[1] = taille >= 256 ? 0 : taille;
    dir[2] = 0; dir[3] = 0;
    dir.writeUInt16LE(1, 4);               // plans
    dir.writeUInt16LE(32, 6);              // bits par pixel
    dir.writeUInt32LE(donnees.length, 8);
    dir.writeUInt32LE(decalage, 12);
    repertoires.push(dir);
    images.push(donnees);
    decalage += donnees.length;
  }
  return Buffer.concat([entete, ...repertoires, ...images]);
}

// ---------------------------------------------------------------------------
// Production : une icône par jeu, dans son dossier
// ---------------------------------------------------------------------------
/** Écrit les trois fichiers d'une icône (512, 1024, ICO multi-tailles). */
function ecrireIcones({ rendre, dossier, nom }) {
  console.log(`[icône ${nom}] rendu ${SUPER} × ${SUPER}…`);
  const maitre = reduire(rendre(SUPER), SUPER, BASE);
  mkdirSync(dossier, { recursive: true });

  const png512 = encoderPng(reduire(maitre, BASE, 512), 512);
  writeFileSync(join(dossier, 'icon.png'), png512);
  console.log(`[icône ${nom}] icon.png — ${(png512.length / 1024).toFixed(1)} Ko`);

  const png1024 = encoderPng(maitre, BASE);
  writeFileSync(join(dossier, 'icon-1024.png'), png1024);
  console.log(`[icône ${nom}] icon-1024.png — ${(png1024.length / 1024).toFixed(1)} Ko`);

  const entrees = TAILLES_ICO.map((taille) => ({
    taille,
    donnees: bmpPourIco(reduire(maitre, BASE, taille), taille),
  }));
  entrees.push({
    taille: TAILLE_ICO_PNG,
    donnees: encoderPng(reduire(maitre, BASE, TAILLE_ICO_PNG), TAILLE_ICO_PNG),
  });

  const ico = encoderIco(entrees);
  writeFileSync(join(dossier, 'icon.ico'), ico);
  console.log(`[icône ${nom}] icon.ico — ${(ico.length / 1024).toFixed(1)} Ko (${entrees.map((e) => e.taille).join(', ')} px)`);
}

ecrireIcones({ rendre, dossier: SORTIE_SABLIER, nom: 'sablier' });
ecrireIcones({ rendre: rendreViceCity, dossier: SORTIE_VICE_CITY, nom: 'vice-city' });
