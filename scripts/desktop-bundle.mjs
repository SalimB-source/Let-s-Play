#!/usr/bin/env node
/**
 * Construit le paquet web embarqué de la coque PC — scripts/desktop-bundle.mjs
 * ---------------------------------------------------------------------------
 * Trois étapes :
 *
 *   1. `vite build` en mode `DESKTOP=1` : base `/`, sortie `desktop/dist-web`
 *      (voir `vite.config.js`). Le site et le paquet partagent exactement le
 *      même code — aucune duplication de logique de jeu.
 *   2. **Élagage** : `desktop/dist-web` contient alors tout `public/`
 *      (208 Mo : vidéos, captures, actus…). On ne garde que ce dont le Sablier
 *      a besoin (`desktop/bundle-assets.json`) — cartes, plateaux, musiques de
 *      plateau, décor du mode histoire, sons, icônes de succès — et le code
 *      compilé. Le reste restera joignable en ligne via le relais du serveur
 *      local ; hors ligne, il n'est de toute façon jamais demandé.
 *   3. Un manifeste `desktop-manifest.json` : date, taille, présence des clés
 *      Supabase — la fenêtre « À propos » et le diagnostic peuvent le lire, et
 *      la CI l'affiche dans ses logs.
 *
 * Usage :
 *   npm run desktop:web                 # paquet complet
 *   npm run desktop:web -- --keep-all   # ne rien élaguer (test, comparaison)
 *
 * Sortie : `desktop/dist-web/` — c'est le dossier que `electron-builder` copie
 * dans les ressources de l'installeur (`desktop/electron-builder.yml`).
 */

import { spawnSync } from 'node:child_process';
import {
  copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PAQUET = join(RACINE, 'desktop', 'dist-web');
const REGLES = join(RACINE, 'desktop', 'bundle-assets.json');

const garderTout = process.argv.includes('--keep-all');

/** Traduit un motif simple (`*`, `?`) en expression rationnelle ancrée. */
function motifVersRegExp(motif) {
  const echappe = motif.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${echappe.replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]')}$`);
}

/** Liste récursive des fichiers d'un dossier, chemins relatifs en `/`. */
function lister(dossier, prefixe = '') {
  const sortie = [];
  for (const entree of readdirSync(join(dossier, prefixe), { withFileTypes: true })) {
    const relatif = prefixe ? `${prefixe}/${entree.name}` : entree.name;
    if (entree.isDirectory()) sortie.push(...lister(dossier, relatif));
    else sortie.push(relatif);
  }
  return sortie;
}

/** Vrai si le fichier fait partie du paquet embarqué. */
function estEmbarque(relatif, regles) {
  const dossiers = regles.dirs || [];
  const premier = relatif.split('/')[0];
  if (dossiers.includes(premier)) return true;
  if ((regles.files || []).includes(relatif)) return true;
  const globs = (regles.globs || []).map(motifVersRegExp);
  return globs.some((re) => re.test(relatif));
}

/**
 * Supprime un fichier ou un dossier en réessayant : sous Windows, l'antivirus
 * (Defender) scanne les fichiers que Vite vient d'écrire et peut les verrouiller
 * quelques dizaines de millisecondes — sans retry, l'élagage mourrait en EPERM.
 */
function supprimer(chemin) {
  rmSync(chemin, { recursive: true, force: true, maxRetries: 6, retryDelay: 250 });
}

/** Taille lisible d'un dossier ou d'un fichier. */
function tailleLisible(octets) {
  if (octets >= 1024 ** 3) return `${(octets / 1024 ** 3).toFixed(2)} Go`;
  if (octets >= 1024 ** 2) return `${(octets / 1024 ** 2).toFixed(1)} Mo`;
  return `${(octets / 1024).toFixed(1)} Ko`;
}

/** Somme des tailles d'une liste de chemins relatifs. */
function total(dossier, fichiers) {
  return fichiers.reduce((somme, relatif) => {
    try { return somme + statSync(join(dossier, relatif)).size; } catch { return somme; }
  }, 0);
}

// ---------------------------------------------------------------------------
// 1) Build Vite
// ---------------------------------------------------------------------------
console.log('[desktop] build Vite (mode desktop)…');
const vite = spawnSync(
  process.execPath,
  [join(RACINE, 'node_modules', 'vite', 'bin', 'vite.js'), 'build'],
  { cwd: RACINE, stdio: 'inherit', env: { ...process.env, DESKTOP: '1' } },
);
if (vite.status !== 0) {
  console.error('[desktop] le build Vite a échoué — le paquet n’est pas produit.');
  process.exit(vite.status ?? 1);
}

if (!existsSync(join(PAQUET, 'index.html'))) {
  console.error(`[desktop] ${join(PAQUET, 'index.html')} introuvable après build.`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2) Élagage
// ---------------------------------------------------------------------------
const regles = JSON.parse(readFileSync(REGLES, 'utf8'));
const avant = lister(PAQUET);
const avantOctets = total(PAQUET, avant);

let supprimes = 0;
let supprimeOctets = 0;
if (!garderTout) {
  for (const relatif of avant) {
    if (estEmbarque(relatif, regles)) continue;
    const chemin = join(PAQUET, relatif);
    supprimeOctets += statSync(chemin).size;
    supprimer(chemin);
    supprimes += 1;
  }
  // Vide les dossiers devenus vides (news-auto/, videos/…).
  const viderDossiers = (dossier) => {
    for (const entree of readdirSync(dossier, { withFileTypes: true })) {
      if (!entree.isDirectory()) continue;
      const chemin = join(dossier, entree.name);
      viderDossiers(chemin);
      if (readdirSync(chemin).length === 0) supprimer(chemin);
    }
  };
  viderDossiers(PAQUET);
}

const apres = lister(PAQUET);
const apresOctets = total(PAQUET, apres);

// Contrôle : le paquet doit contenir le jeu, ses plateaux et ses sons.
const attendus = [
  'index.html',
  'cards/amani-des-ksour.jpg',
  'plateau-erg-du-sahara.jpg',
  'sablier-story/mode-histoire.jpg',
  'audio/arabian-travel.mp3',
];
const manquants = attendus.filter((f) => !apres.includes(f));
if (manquants.length) {
  console.error(`[desktop] paquet incomplet, il manque : ${manquants.join(', ')}`);
  console.error('          Vérifiez desktop/bundle-assets.json.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 3) Manifeste
// ---------------------------------------------------------------------------
const aSupabase = Boolean(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY
  || process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

mkdirSync(PAQUET, { recursive: true });
writeFileSync(join(PAQUET, 'desktop-manifest.json'), `${JSON.stringify({
  nom: 'Le Sablier de Bab El — paquet PC',
  genere: new Date().toISOString(),
  elagage: garderTout ? 'aucun' : 'desktop/bundle-assets.json',
  fichiers: apres.length,
  octets: apresOctets,
  supabase: aSupabase ? 'configure' : 'absent (jeu jouable hors ligne, compte et duels en ligne indisponibles)',
}, null, 2)}\n`);

// ---------------------------------------------------------------------------
// 4) Scène de packaging : une application minimale et propre
// ---------------------------------------------------------------------------
// electron-builder empaquette « le dossier app » tel qu'il le comprend ; y
// laisser traîner node_modules/ (Electron téléchargé inclus), dist-web/ ou
// release/ gonfle l'asar de centaines de Mo (vu en CI : app.asar.unpacked à
// 729 Mo). On assemble donc `desktop/stage/` : les sept fichiers d'exécution,
// rien d'autre, avec un package.json sans dépendances. L'asar final pèse
// quelques dizaines de Ko, et le jeu voyage à côté, dans resources/app.
const SCENE = join(RACINE, 'desktop', 'pack');
const FICHIERS_SCENE = [
  'main.js', 'preload.cjs', 'gpu.js', 'local-server.js',
  'diagnostic.html', 'offline.html',
];
rmSync(SCENE, { recursive: true, force: true });
mkdirSync(join(SCENE, 'app-icons'), { recursive: true });
for (const fichier of FICHIERS_SCENE) {
  copyFileSync(join(RACINE, 'desktop', fichier), join(SCENE, fichier));
}
// La config et les icônes voyagent avec le projet isolé.
copyFileSync(join(RACINE, 'desktop', 'electron-builder.yml'), join(SCENE, 'electron-builder.yml'));
for (const icone of ['icon.ico', 'icon.png']) {
  copyFileSync(join(RACINE, 'desktop', 'app-icons', icone), join(SCENE, 'app-icons', icone));
}
const paquetCoque = JSON.parse(readFileSync(join(RACINE, 'desktop', 'package.json'), 'utf8'));

// Version d'Electron ÉPINGLÉE : electron-builder télécharge des binaires par
// version exacte et refuse un intervalle (« ^44.9.0 ») quand le projet
// d'empaquetage n'a pas de node_modules. On lit la version réellement installée
// dans desktop/, sinon celle du lockfile.
let electronVersion = '';
try {
  electronVersion = JSON.parse(
    readFileSync(join(RACINE, 'desktop', 'node_modules', 'electron', 'package.json'), 'utf8'),
  ).version || '';
} catch { /* electron pas installé localement */ }
if (!electronVersion) {
  try {
    const lock = JSON.parse(readFileSync(join(RACINE, 'desktop', 'package-lock.json'), 'utf8'));
    electronVersion = lock.packages?.['node_modules/electron']?.version || '';
  } catch { /* pas de lock */ }
}
if (!electronVersion) {
  console.error('[desktop] version d’Electron introuvable (node_modules et lock absents).');
  process.exit(1);
}
writeFileSync(join(SCENE, 'package.json'), `${JSON.stringify({
  name: paquetCoque.name,
  productName: paquetCoque.productName,
  version: paquetCoque.version,
  description: paquetCoque.description,
  main: 'main.js',
  type: 'module',
  private: true,
  author: paquetCoque.author,
  license: paquetCoque.license,
  homepage: paquetCoque.homepage,
  // Version exacte : electron-builder refuse un intervalle sans node_modules.
  devDependencies: { electron: electronVersion },
}, null, 2)}
`);
console.log(`[desktop] projet d'empaquetage isolé : ${SCENE} (${FICHIERS_SCENE.length + 3} fichiers)`);

// ---------------------------------------------------------------------------
// Compte rendu
// ---------------------------------------------------------------------------
const parDossier = new Map();
for (const relatif of apres) {
  const cle = relatif.includes('/') ? relatif.split('/')[0] : '(racine)';
  parDossier.set(cle, (parDossier.get(cle) || 0) + 1);
}

console.log('');
console.log('[desktop] paquet web prêt :');
console.log(`  avant élagage : ${avant.length} fichiers — ${tailleLisible(avantOctets)}`);
if (!garderTout) {
  console.log(`  élagués       : ${supprimes} fichiers — ${tailleLisible(supprimeOctets)}`);
}
console.log(`  embarqués     : ${apres.length} fichiers — ${tailleLisible(apresOctets)}`);
for (const [dossier, nombre] of [...parDossier.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
  console.log(`    ${dossier.padEnd(16)} ${nombre} fichiers`);
}
console.log('');
if (!aSupabase) {
  console.warn('[desktop] attention : aucune clé Supabase dans l’environnement.');
  console.warn('          Le paquet se construit quand même : hors ligne, le duel, l’atelier');
  console.warn('          de decks et le souk fonctionnent ; la connexion du compte et les');
  console.warn('          duels à distance demanderont un paquet reconstruit avec les clés');
  console.warn('          (VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY, voir .env.example).');
}
console.log('[desktop] suite : npm run desktop:setup puis npm run desktop:dist');
