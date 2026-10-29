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
 * Deux livraisons sortent de ce script, jamais les deux à la fois :
 *
 *   - **le pack hors ligne** (`npm run desktop:web`) : le site construit et
 *     élagué. Publié à part sur la Release, il rend le jeu jouable sans
 *     Internet — c'est l'option, pas la règle ;
 *   - **la coque seule** (`npm run desktop:coque`) : l'installeur publié à
 *     chaque version. Il ne contient **aucun** fichier du site : la fenêtre
 *     charge le site en ligne, donc un correctif du jeu arrive au lancement
 *     suivant, sans reconstruire 230 Mo d'installeur.
 *
 * Usage :
 *   npm run desktop:web                 # pack hors ligne (site complet)
 *   npm run desktop:web -- --keep-all   # idem sans élaguer (test, comparaison)
 *   npm run desktop:coque               # installeur sans paquet web (~105 Mo)
 *
 * Sortie : `desktop/dist-web/` — c'est le dossier que `electron-builder` copie
 * dans les ressources de l'installeur (`desktop/electron-builder.yml`). En mode
 * coque, il ne contient qu'un `LISEZ-MOI.txt` : présent pour satisfaire
 * `extraResources`, invisible pour le jeu, qui n'y voit pas d'`index.html`.
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
const coqueSeule = process.argv.includes('--coque');

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
// 1) Le paquet web, ou son absence
// ---------------------------------------------------------------------------
if (coqueSeule) {
  // `extraResources` pointe sur `../dist-web` : electron-builder refuse une
  // source absente. Un dossier marqueur suffit — `dossierPaquetWeb()` ne
  // reconnaît un pack qu'à la présence d'un `index.html`, la coque restera donc
  // en mode en ligne, et le menu « Pack hors ligne… » proposera de l'installer.
  supprimer(PAQUET);
  mkdirSync(PAQUET, { recursive: true });
  writeFileSync(join(PAQUET, 'LISEZ-MOI.txt'), [
    'Cet installeur ne contient pas le jeu : la coque ouvre le site en ligne,',
    'qui reçoit les correctifs sans réinstallation.',
    '',
    'Pour jouer sans Internet, installez le « pack hors ligne » depuis la page',
    'de la Release (github.com/SalimB-source/Let-s-Play/releases/tag/desktop),',
    'puis menu Aide → Pack hors ligne… → Choisir un fichier .zip.',
    '',
  ].join('\n'));
  console.log('[desktop] coque seule : aucun fichier du site dans l’installeur.');
} else {
  var paquetWeb = construirePaquetWeb();
}

/** Construit, élague et date le paquet web — l'option « hors ligne ». */
function construirePaquetWeb() {
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
    'Desert Solitude with Percussion.mp3',
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

  return { avant, avantOctets, supprimes, supprimeOctets, apres, apresOctets, aSupabase };
}

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
  // L'updater est une dépendance d'exécution (contrairement à electron-builder).
  dependencies: { 'electron-updater': paquetCoque.dependencies?.['electron-updater'] },
}, null, 2)}
`);

// Le projet isolé reçoit uniquement les dépendances de production. Ne jamais
// copier desktop/node_modules : il contient le runtime Electron et les outils
// de build, ce qui ferait grossir l'asar de centaines de Mo.
const npmInstall = spawnSync('npm', [
  'install', '--prefix', SCENE, '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund',
], { stdio: 'inherit', shell: process.platform === 'win32' });
if (npmInstall.status !== 0) {
  console.error('[desktop] installation des dépendances runtime dans desktop/pack impossible.');
  process.exit(npmInstall.status ?? 1);
}

// npm installe parfois une dépendance **imbriquée** sous son parent quand deux
// versions se disputent la racine : `electron-updater@6.8.11` garde son
// `semver` dans `node_modules/electron-updater/node_modules/semver`. Or
// electron-builder ne recopie pas ce sous-dossier sous un motif
// `node_modules/<module>/**` — le module est bien dans l'asar, son code non.
// Résultat, chez le joueur, à la première ligne : « Cannot find module
// 'semver' » (version 1.0.2993). On aplatit systématiquement avant de vérifier.
const npmDedupe = spawnSync('npm', [
  'dedupe', '--prefix', SCENE, '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund',
], { stdio: 'inherit', shell: process.platform === 'win32' });
if (npmDedupe.status !== 0) {
  console.error('[desktop] npm dedupe a échoué : des modules runtime peuvent rester imbriqués.');
  process.exit(npmDedupe.status ?? 1);
}

// ---------------------------------------------------------------------------
// Garde-fou : `node_modules` n'est embarqué que module par module
// ---------------------------------------------------------------------------
// `electron-builder.yml` exclut `node_modules/**` puis rouvre chaque module
// explicitement. C'est ce qui empêche electron-builder de remonter l'arbre et
// d'embarquer le `node_modules` du dépôt entier (672 Mo d'asar dépliés, un
// installeur de 497 Mo — vu en CI). En échange, un module oublié ne se
// verrait qu'au lancement, chez le joueur : on refuse de produire l'exécutable.
const ymlBuilder = readFileSync(join(RACINE, 'desktop', 'electron-builder.yml'), 'utf8');
if (!ymlBuilder.includes("'!node_modules/**'")) {
  console.error('[desktop] electron-builder.yml n’exclut plus node_modules en bloc.');
  console.error('          Rétablissez « - \'!node_modules/**\' » avant la liste des modules.');
  process.exit(1);
}
const modulesAutorises = new Set(
  [...ymlBuilder.matchAll(/^\s+- 'node_modules\/((?:@[^/']+\/)?[^'/]+)\/\*\*'$/gm)]
    .map(([, nom]) => nom),
);
const dossierModules = join(SCENE, 'node_modules');

/** Tous les modules d'un `node_modules`, **y compris les imbriqués**.
 *
 * La version précédente ne lisait que le premier niveau : `semver`, glissé
 * sous `electron-updater`, était donc invisible pour le garde-fou — qui a
 * laissé passer un exécutable incapable de démarrer. */
function listerModules(dossier) {
  const trouves = [];
  const visiter = (courant, prefixe = '') => {
    for (const entree of readdirSync(courant, { withFileTypes: true })) {
      if (!entree.isDirectory() || entree.name === '.bin') continue;
      const paquets = entree.name.startsWith('@')
        ? readdirSync(join(courant, entree.name)).map((nom) => (
          [`${entree.name}/${nom}`, join(courant, entree.name, nom)]
        ))
        : [[entree.name, join(courant, entree.name)]];
      for (const [nom, chemin] of paquets) {
        const relatif = prefixe ? `${prefixe}/node_modules/${nom}` : nom;
        trouves.push({ nom, relatif });
        const sousDossier = join(chemin, 'node_modules');
        if (existsSync(sousDossier)) visiter(sousDossier, relatif);
      }
    }
  };
  if (existsSync(dossier)) visiter(dossier);
  return trouves;
}

const modules = listerModules(dossierModules);
const modulesPlats = modules.filter(({ relatif }) => !relatif.includes('/node_modules/'));
const modulesImbriques = modules.filter(({ relatif }) => relatif.includes('/node_modules/'));

if (modulesImbriques.length) {
  console.error(`[desktop] module(s) imbriqué(s) dans un autre : ${modulesImbriques.map(({ relatif }) => relatif).join(', ')}`);
  console.error('          electron-builder ne recopie pas ces sous-dossiers : l’exécutable');
  console.error('          planterait au lancement sur « Cannot find module ». Aplatissez');
  console.error('          l’arbre (npm dedupe) avant de reconstruire.');
  process.exit(1);
}

const modulesOublies = modulesPlats.map(({ nom }) => nom).filter((nom) => !modulesAutorises.has(nom));
if (modulesOublies.length) {
  console.error(`[desktop] dépendance(s) absente(s) de electron-builder.yml : ${modulesOublies.join(', ')}`);
  for (const nom of modulesOublies) {
    console.error(`          ajoutez : - 'node_modules/${nom}/**' dans la section « files »`);
  }
  process.exit(1);
}
const octetsModules = total(dossierModules, lister(dossierModules));
if (octetsModules > 32 * 1024 * 1024) {
  console.error(`[desktop] dépendances runtime trop lourdes : ${tailleLisible(octetsModules)} `
    + `pour ${modulesPlats.length} modules — le pack ne doit contenir que la coque.`);
  process.exit(1);
}
console.log(`[desktop] dépendances runtime : ${modulesPlats.length} modules, ${tailleLisible(octetsModules)}`);
console.log(`[desktop] projet d'empaquetage isolé : ${SCENE} (${FICHIERS_SCENE.length + 3} fichiers + electron-updater)`);

// ---------------------------------------------------------------------------
// Compte rendu
// ---------------------------------------------------------------------------
if (coqueSeule) {
  console.log('[desktop] installeur « en ligne » prêt : le jeu sera chargé depuis le site,');
  console.log('          et `desktop/pack` ne porte que les sept fichiers d’exécution.');
} else {
  const parDossier = new Map();
  for (const relatif of paquetWeb.apres) {
    const cle = relatif.includes('/') ? relatif.split('/')[0] : '(racine)';
    parDossier.set(cle, (parDossier.get(cle) || 0) + 1);
  }
  console.log('');
  console.log('[desktop] paquet hors ligne prêt :');
  console.log(`  avant élagage : ${paquetWeb.avant.length} fichiers — ${tailleLisible(paquetWeb.avantOctets)}`);
  if (!garderTout) {
    console.log(`  élagués       : ${paquetWeb.supprimes} fichiers — ${tailleLisible(paquetWeb.supprimeOctets)}`);
  }
  console.log(`  embarqués     : ${paquetWeb.apres.length} fichiers — ${tailleLisible(paquetWeb.apresOctets)}`);
  for (const [dossier, nombre] of [...parDossier.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    console.log(`    ${dossier.padEnd(16)} ${nombre} fichiers`);
  }
  console.log('');
  if (!paquetWeb.aSupabase) {
    console.warn('[desktop] attention : aucune clé Supabase dans l’environnement.');
    console.warn('          Le paquet se construit quand même : hors ligne, le duel, l’atelier');
    console.warn('          de decks et le souk fonctionnent ; la connexion du compte et les');
    console.warn('          duels à distance demanderont un paquet reconstruit avec les clés');
    console.warn('          (VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY, voir .env.example).');
  }
}
console.log('[desktop] suite : npm run desktop:setup puis npm run desktop:dist');
