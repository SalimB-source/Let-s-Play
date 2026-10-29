/**
 * Les navigateurs anciens — le plancher de compatibilité du site.
 *
 * Le 29 octobre 2026, l'APK Android affichait un écran noir alors que le même
 * site s'ouvrait dans Chrome, sur le même téléphone et le même réseau. Le
 * bundle compilé visait un moteur de 2023 ; la WebView du téléphone était plus
 * ancienne, ne pouvait pas lire le module, et rien ne le disait.
 *
 * Trois choses tiennent maintenant, et ce fichier les verrouille :
 *
 *   1. **la syntaxe** — `build.target` explicite dans `vite.config.js`, jamais
 *      le « baseline » par défaut de Vite, qui suit les navigateurs à jour ;
 *   2. **les API** — les quatre fonctions récentes utilisées par le jeu sont
 *      comblées avant tout autre import (`src/lib/navigateursAnciens.js`) ;
 *   3. **le silence** — une amorce visible dès le HTML, un panneau de secours
 *      qui nomme le moteur et l'erreur, et un garde de rendu côté React. Plus
 *      jamais un rectangle noir sans explication.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { comblerNavigateurAncien } from '../src/lib/navigateursAnciens.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lire = (...parties) => fs.readFileSync(path.join(ROOT, ...parties), 'utf8');

const viteConfig = lire('vite.config.js');
const mainJsx = lire('src/main.jsx');
const indexPath = lire('index.html');
const compat = lire('src/lib', 'navigateursAnciens.js');
const gradle = lire('android', 'app', 'build.gradle');
const mainActivity = lire('android', 'app', 'src', 'main', 'java', 'dz', 'letsplay', 'officiel', 'MainActivity.java');
const workflowAndroid = lire('.github', 'workflows', 'android-apk.yml');
const pkg = JSON.parse(lire('package.json'));

test('le build vise un plancher de navigateurs explicite', () => {
  assert.match(viteConfig, /const CIBLES = \[[^\]]+\]/, 'la liste des cibles doit exister et être nommée');
  assert.match(viteConfig, /build:\s*\{[\s\S]*?target:\s*CIBLES/,
    'build.target doit prendre la liste : sans lui, Vite 8 vise un moteur de 2023');
  const cibles = /const CIBLES = \[([^\]]+)\]/.exec(viteConfig)[1];
  assert.match(cibles, /'chrome\d+'/, 'Chromium doit figurer dans les cibles');
  assert.match(cibles, /'safari[\d.]+'/, 'Safari doit figurer dans les cibles');
  const chrome = Number(/'chrome(\d+)'/.exec(cibles)[1]);
  assert.ok(chrome <= 90,
    `Chrome ${chrome} est trop récent pour une WebView Android non mise à jour (viser ≤ 90)`);
});

test('aucune dépendance n’est installée en « latest »', () => {
  const toutes = { ...pkg.dependencies, ...pkg.devDependencies };
  const flottantes = Object.entries(toutes).filter(([, v]) => v === 'latest');
  assert.deepEqual(flottantes, [],
    'une version « latest » peut relever le plancher de compatibilité sans qu’aucun commit ne le montre');
  // Les trois outils qui décident de la syntaxe de sortie sont figés.
  assert.match(toutes.vite, /^\d+\.\d+\.\d+$/, 'vite doit être épinglé en version exacte');
  assert.match(toutes.react, /^\d+\.\d+\.\d+$/, 'react doit être épinglé en version exacte');
});

test('les API récentes sont comblées — et le font vraiment', () => {
  for (const nom of ['Object.hasOwn', 'Array.prototype.at', 'String.prototype.at', 'structuredClone', 'randomUUID']) {
    assert.ok(compat.includes(nom), `le comblage de ${nom} a disparu`);
  }

  // Banc d'essai : un « moteur ancien » auquel il manque les quatre API.
  const cible = {
    Object, Array, String, Map, Set, Date, RegExp, Math, Number, Uint8Array,
    crypto: { getRandomValues: (tableau) => tableau.fill(7) },
  };
  delete cible.Object.hasOwn;
  const atNatif = Array.prototype.at;
  const atChaineNatif = String.prototype.at;
  delete Array.prototype.at;
  delete String.prototype.at;
  try {
    const poses = comblerNavigateurAncien(cible);
    assert.ok(poses.includes('Object.hasOwn'), 'hasOwn doit être posé');
    assert.ok(poses.includes('Array.prototype.at'), 'Array.prototype.at doit être posé');
    assert.ok(poses.includes('String.prototype.at'), 'String.prototype.at doit être posé');
    assert.ok(poses.includes('structuredClone'), 'structuredClone doit être posé');
    assert.ok(poses.includes('crypto.randomUUID'), 'randomUUID doit être posé');

    // Comportement, pas seulement présence.
    assert.equal(cible.Object.hasOwn({ a: 1 }, 'a'), true);
    assert.equal(cible.Object.hasOwn({ a: 1 }, 'b'), false);
    assert.equal(cible.Object.hasOwn(null, 'a'), false, 'hasOwn(null) ne doit jamais lever');
    assert.equal([1, 2, 3].at(-1), 3);
    assert.equal([1, 2, 3].at(9), undefined);
    assert.equal('abc'.at(-1), 'c');

    const identifiant = cible.crypto.randomUUID();
    assert.match(identifiant, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      'randomUUID doit produire un v4 valide');

    const source = { liste: [1, { b: 2 }], date: new Date(0), carte: new Map([['a', { x: 1 }]]) };
    source.moi = source;
    const copie = cible.structuredClone(source);
    assert.equal(copie.liste[1].b, 2);
    assert.ok(copie.date instanceof Date, 'les dates restent des dates');
    assert.equal(copie.moi, copie, 'une référence circulaire se referme sur la copie');
    assert.equal(copie.carte.get('a').x, 1);
    assert.notEqual(copie.carte, source.carte, 'les Map sont copiées, pas partagées');
  } finally {
    Array.prototype.at = atNatif;
    String.prototype.at = atChaineNatif;
  }
});

test('sur un moteur moderne, rien n’est remplacé', () => {
  const poses = comblerNavigateurAncien({ Object, Array, String, structuredClone, crypto: globalThis.crypto });
  assert.deepEqual(poses.filter((nom) => nom === 'structuredClone'), [],
    'structuredClone natif ne doit pas être écrasé');
});

test('le comblage passe avant tout le reste', () => {
  const imports = [...mainJsx.matchAll(/^import\s+[^;]*;$/gm)].map((m) => m[0]);
  assert.ok(imports.length > 0, 'main.jsx doit importer des modules');
  assert.match(imports[0], /import '\.\/lib\/navigateursAnciens\.js';/,
    'les comblages doivent être le PREMIER import : un module évalué avant eux planterait');
});

test('l’application est sous un garde de rendu', () => {
  assert.match(mainJsx, /import GardeErreur from '\.\/components\/GardeErreur';/);
  assert.match(mainJsx, /<GardeErreur>\s*<App \/>\s*<\/GardeErreur>/,
    'une erreur de rendu non rattrapée vidait la page sans rien dire');
  const garde = lire('src', 'components', 'GardeErreur.jsx');
  assert.match(garde, /getDerivedStateFromError/);
  assert.match(garde, /window\.location\.reload\(\)/, 'le panneau doit proposer de recharger');
  assert.match(garde, /navigator\.userAgent/, 'le panneau doit nommer le moteur');
});

test('index.html affiche une amorce, puis un secours lisible', () => {
  assert.match(indexPath, /id="amorce"/, 'sans amorce, un module qui ne s’exécute pas laisse un écran noir');
  assert.match(indexPath, /id="secours"/);
  assert.match(indexPath, /id="secours-recharger"/);
  assert.match(indexPath, /Android System WebView/, 'le panneau doit nommer la cause la plus fréquente');
  assert.match(indexPath, /DELAI_MS = \d+/, 'le secours doit avoir un délai');
  assert.ok(indexPath.indexOf('id="amorce"') < indexPath.indexOf('id="secours"'),
    'l’amorce vient avant le secours, qui la remplace');

  // Le panneau de secours est du HTML pur : il doit tenir sur un moteur qui ne
  // comprend ni les flèches, ni `const`, ni les gabarits de chaînes.
  const script = /<script>([\s\S]*?)<\/script>/.exec(indexPath.slice(indexPath.indexOf('id="secours"')))?.[1] || '';
  assert.ok(script.length > 500, 'le script de secours est introuvable');
  // Les commentaires parlent de `const` et de `<script>` : on ne garde que le
  // code pour juger de sa syntaxe.
  const code = script.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  assert.doesNotMatch(code, /=>/, 'pas de fonction fléchée dans le secours');
  assert.doesNotMatch(code, /`/, 'pas de gabarit de chaîne dans le secours');
  assert.doesNotMatch(code, /\b(const|let)\s+[A-Za-z_$]/, 'pas de const/let dans le secours');
  assert.doesNotMatch(code, /\bclass\s+[A-Za-z_$]/, 'pas de classe dans le secours');
  assert.match(script, /LetsPlayAndroid/, 'le secours doit demander sa version à l’APK quand il y tourne');
});

test('l’amorce s’efface dès que React a rendu', () => {
  assert.match(mainJsx, /function retirerAmorce\(\)/);
  assert.match(mainJsx, /racine\.childElementCount > 0/, 'on ne retire l’amorce que sur un vrai rendu');
  assert.match(mainJsx, /requestAnimationFrame\(retirerAmorce\)/);
});

test('l’APK numérote ses versions et expose son moteur', () => {
  assert.match(gradle, /System\.getenv\('ANDROID_VERSION_CODE'\)/,
    'le versionCode doit venir de la CI, sinon il reste figé et Android refuse la mise à jour');
  assert.match(gradle, /versionCode versionCodeEnv/, 'le champ doit lire la variable');
  assert.match(workflowAndroid, /git rev-list --count HEAD/,
    'le versionCode suit le nombre de commits');
  assert.match(workflowAndroid, /ANDROID_VERSION_CODE=\$CODE/, 'la variable doit être exportée au build');
  assert.match(workflowAndroid, /fetch-depth: 0/, 'le compte des commits exige un clone complet');
  assert.match(workflowAndroid, /ANDROID_VERSION_NAME/, 'le nom du fichier publié doit porter la version');

  assert.match(mainActivity, /public String webViewVersion\(\)/,
    'l’application doit pouvoir dire sa version de WebView au panneau de secours');
  assert.match(mainActivity, /WebSettings\.getDefaultUserAgent/, 'la version vient de l’agent utilisateur');
});
