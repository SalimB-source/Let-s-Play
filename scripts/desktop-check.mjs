#!/usr/bin/env node
/**
 * Vérifications de la coque PC — scripts/desktop-check.mjs
 * --------------------------------------------------------
 * `npm run check:desktop` : ce que la coque promet, vérifié sans lancer
 * Electron (donc exécutable sur n'importe quelle CI, y compris Linux).
 *
 *   1. les commutateurs GPU sont bien ceux qui activent la carte graphique
 *      (et surtout : personne n'a remis un `disableHardwareAcceleration`) ;
 *   2. le serveur local sert le jeu : route sans extension → `index.html`,
 *      fichiers → bon type MIME et cache, et **aucune évasion hors du paquet** ;
 *   3. la fenêtre reste isolée : `contextIsolation`, pas de Node dans le rendu,
 *      pas de pont `LetsPlayAndroid` (qui forcerait la mise en page téléphone) ;
 *   4. l'empaquetage copie bien le paquet web hors de l'archive.
 *
 * Sort avec un code non nul au premier échec (convention des check: du dépôt).
 */

import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { gpuSwitches, interpreterEtatGpu, qualifierRenderer } from '../desktop/gpu.js';
import { startLocalServer } from '../desktop/local-server.js';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let reussites = 0;
function ok(message) {
  reussites += 1;
  console.log(`  ✓ ${message}`);
}

// ---------------------------------------------------------------------------
// 1) Réglages GPU
// ---------------------------------------------------------------------------
console.log('1. Commutateurs GPU');
for (const plateforme of ['win32', 'darwin', 'linux']) {
  const noms = gpuSwitches({ platform: plateforme }).map(([nom]) => nom);
  assert.ok(noms.includes('ignore-gpu-blocklist'), `${plateforme} : ignore-gpu-blocklist absent`);
  assert.ok(!noms.includes('disable-gpu'), `${plateforme} : disable-gpu présent`);
  assert.ok(!noms.includes('disable-gpu-compositing'), `${plateforme} : compositing désactivé`);
}
ok('ignore-gpu-blocklist posé sur win32/darwin/linux, jamais de disable-gpu');

const win = Object.fromEntries(gpuSwitches({ platform: 'win32' }));
assert.equal(win['use-angle'], 'd3d11', 'Windows doit passer par Direct3D 11');
ok('Windows traduit WebGL via ANGLE/D3D11');

const force = Object.fromEntries(gpuSwitches({ platform: 'win32', env: { LETSPLAY_ANGLE: 'gl' } }));
assert.equal(force['use-angle'], 'gl', 'LETSPLAY_ANGLE doit prendre le dessus');
ok('dérogation LETSPLAY_ANGLE respectée (diagnostic)');

const logiciel = Object.fromEntries(gpuSwitches({ platform: 'win32', env: { LETSPLAY_SOFTWARE_GL: '1' } }));
assert.equal(logiciel['use-angle'], 'swiftshader');
assert.ok(!('ignore-gpu-blocklist' in logiciel), 'mode logiciel : pas de forçage GPU');
ok('mode logiciel volontaire (LETSPLAY_SOFTWARE_GL) isolé');

assert.equal(qualifierRenderer('ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)').carte, true);
assert.equal(qualifierRenderer('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (10.0.0.0)) SwiftShader driver)').carte, false);
assert.equal(qualifierRenderer('Microsoft Basic Render Driver').carte, false);
ok('détection rendu logiciel / matérielle (SwiftShader, Basic Render Driver)');

const etatBon = interpreterEtatGpu({ webgl: 'enabled', webgl2: 'enabled', compositing: 'enabled', opengl: 'disabled', canvas: 'disabled' });
const etatMauvais = interpreterEtatGpu({ webgl: 'software', webgl2: 'software', compositing: 'disabled' });
assert.equal(etatBon.ok, true);
assert.equal(etatMauvais.ok, false);
ok('lecture des fonctions GPU (webgl/webgl2/compositing ; opengl ignoré sous Windows)');

// ---------------------------------------------------------------------------
// 2) Serveur local
// ---------------------------------------------------------------------------
console.log('2. Serveur local');
const paquet = mkdtempSync(join(tmpdir(), 'sablier-check-'));
mkdirSync(join(paquet, 'assets'), { recursive: true });
mkdirSync(join(paquet, 'cards'), { recursive: true });
writeFileSync(join(paquet, 'index.html'), '<!doctype html><title>jeu</title>');
writeFileSync(join(paquet, 'assets', 'app-a1b2.js'), 'console.log(1)');
writeFileSync(join(paquet, 'cards', 'boualem.jpg'), Buffer.from([0xff, 0xd8, 0xff, 0xe0]));

const serveur = await startLocalServer({ distDir: paquet, port: 0, remoteOrigin: '' });
const lire = async (chemin, options) => {
  const reponse = await fetch(serveur.url(chemin), options);
  const corps = await reponse.arrayBuffer();
  return { reponse, corps };
};

{
  const { reponse } = await lire('/');
  assert.equal(reponse.status, 200);
  assert.match(reponse.headers.get('content-type'), /text\/html/);
  ok('GET / sert index.html');
}
{
  const { reponse } = await lire('/jeu/sablier-de-bab-el');
  assert.equal(reponse.status, 200, 'la route du jeu doit renvoyer index.html');
  assert.match(reponse.headers.get('content-type'), /text\/html/);
  ok('route sans extension → index.html (BrowserRouter)');
}
{
  const { reponse } = await lire('/assets/app-a1b2.js');
  assert.equal(reponse.status, 200);
  assert.match(reponse.headers.get('content-type'), /javascript/);
  assert.match(reponse.headers.get('cache-control'), /immutable/);
  ok('fichiers de build : bon MIME, cache immutable');
}
{
  const { reponse } = await lire('/cards/boualem.jpg');
  assert.equal(reponse.status, 200);
  assert.match(reponse.headers.get('content-type'), /image\/jpeg/);
  ok('image du paquet servie en image/jpeg');
}
{
  const { reponse } = await lire('/cards/absente.jpg');
  assert.equal(reponse.status, 404, 'sans repli distant, un fichier absent est un 404');
  ok('fichier absent, repli désactivé → 404 franc');
}
{
  // Un fichier confidentiel vit À CÔTÉ du paquet, jamais dedans : aucune URL ne
  // doit pouvoir le lire. (Un chemin sans extension peut légitimement renvoyer
  // index.html — c'est le repli des routes React — mais jamais un autre fichier.)
  const secret = join(dirname(paquet), 'secret-hors-paquet.txt');
  writeFileSync(secret, 'CONTENU-INTERDIT-42');
  for (const piege of [
    '/../secret-hors-paquet.txt',
    '/..%2fsecret-hors-paquet.txt',
    '/assets/../../secret-hors-paquet.txt',
    '/%2e%2e%2fsecret-hors-paquet.txt',
    '/..%2f..%2f..%2fetc/passwd',
  ]) {
    const { reponse, corps } = await lire(piege);
    const texte = Buffer.from(corps).toString('utf8');
    assert.ok(!texte.includes('CONTENU-INTERDIT-42'), `fuite du fichier voisin : ${piege}`);
    assert.ok(!texte.includes('root:'), `fuite de /etc/passwd : ${piege}`);
    assert.ok(reponse.status === 200 || reponse.status === 404, `statut inattendu ${reponse.status} pour ${piege}`);
  }
  rmSync(secret, { force: true });
}
ok('aucune lecture hors du paquet (../, %2e%2e, %2f)');
{
  const { reponse, corps } = await lire('/__desktop/status');
  assert.equal(reponse.status, 200);
  const etat = JSON.parse(Buffer.from(corps).toString('utf8'));
  assert.equal(etat.ok, true);
  assert.equal(etat.mode, 'local');
  ok('point d’état /__desktop/status');
}
{
  // HEAD doit répondre sans corps mais avec la taille, et Range sert les plages MP3 en boucle.
  const { reponse } = await lire('/cards/boualem.jpg', { method: 'HEAD' });
  assert.equal(reponse.status, 200);
  assert.equal(reponse.headers.get('content-length'), '4');
  assert.equal(reponse.headers.get('accept-ranges'), 'bytes');
  const { reponse: partielle, corps: octetsPartiels } = await lire('/cards/boualem.jpg', {
    headers: { range: 'bytes=1-2' },
  });
  assert.equal(partielle.status, 206);
  assert.equal(partielle.headers.get('content-range'), 'bytes 1-2/4');
  assert.deepEqual([...new Uint8Array(octetsPartiels)], [0xd8, 0xff]);
  ok('HEAD renvoie la taille sans corps et Range répond en 206 Partial Content');
}
await serveur.close();
rmSync(paquet, { recursive: true, force: true });

// ---------------------------------------------------------------------------
// 3) Isolation de la fenêtre
// ---------------------------------------------------------------------------
console.log('3. Isolation de la fenêtre');
const principal = readFileSync(join(RACINE, 'desktop', 'main.js'), 'utf8');
assert.ok(!principal.includes('disableHardwareAcceleration('), 'appel disableHardwareAcceleration( dans main.js !');
assert.ok(principal.includes('appendSwitch'), 'les commutateurs GPU ne sont pas posés');
assert.ok(principal.includes('contextIsolation: true'));
assert.ok(principal.includes('nodeIntegration: false'));
assert.ok(principal.includes('sandbox: true'));
ok('main.js : accélération matérielle jamais désactivée, rendu isolé et sandboxé');

const pont = readFileSync(join(RACINE, 'desktop', 'preload.cjs'), 'utf8');
assert.ok(!/exposeInMainWorld\(\s*['"]LetsPlayAndroid/.test(pont), 'le pont Android ne doit pas exister sur PC');
ok('preload : pas de LetsPlayAndroid (le jeu reste en mise en page PC)');

const config = readFileSync(join(RACINE, 'vite.config.js'), 'utf8');
assert.ok(config.includes("process.env.DESKTOP === '1'"), 'le mode desktop de vite.config.js a disparu');
assert.ok(config.includes("outDir: 'desktop/dist-web'"), 'la sortie desktop de vite.config.js a disparu');
ok('vite.config.js : mode DESKTOP=1, base /, sortie desktop/dist-web');

// ---------------------------------------------------------------------------
// 4) Empaquetage
// ---------------------------------------------------------------------------
console.log('4. Empaquetage');
const builder = readFileSync(join(RACINE, 'desktop', 'electron-builder.yml'), 'utf8');
assert.match(builder, /from:\s*\.\.\/dist-web/);
assert.match(builder, /to:\s*app/);
assert.ok(builder.includes('app-icons/icon.ico'), 'icône Windows absente de la config');
assert.match(builder, /provider:\s*github[\s\S]*owner:\s*SalimB-source[\s\S]*repo:\s*Let-s-Play/,
  'electron-updater doit cibler la Release GitHub du dépôt');
const desktopPackage = JSON.parse(readFileSync(join(RACINE, 'desktop', 'package.json'), 'utf8'));
assert.ok(desktopPackage.dependencies?.['electron-updater'], 'electron-updater doit être une dépendance runtime');
assert.match(principal, /autoUpdater\.checkForUpdates\(\)/);
assert.match(principal, /autoUpdater\.quitAndInstall\(\)/);
assert.match(principal, /update-downloaded/);
ok('electron-updater : fournisseur GitHub configuré, vérification et installation intégrées');
ok('electron-builder : paquet web hors asar (resources/app), icône présente');

const regles = JSON.parse(readFileSync(join(RACINE, 'desktop', 'bundle-assets.json'), 'utf8'));
for (const dossier of ['assets', 'cards', 'sablier-story', 'sablier-tours', 'audio', 'icons', 'profil']) {
  assert.ok(regles.dirs.includes(dossier), `dossier embarqué manquant : ${dossier}`);
}
ok('bundle-assets.json : cartes, plateaux, sons et décor du Sablier embarqués');

const builderYml = readFileSync(join(RACINE, 'desktop', 'electron-builder.yml'), 'utf8');
assert.match(builderYml, /output:\s*\.\.\/release/, 'la sortie doit rester desktop/release');
assert.doesNotMatch(builderYml, /electronDist/,
  'electronDist casse la CI quand node_modules/electron/dist n’est pas extrait');
const bundle = readFileSync(join(RACINE, 'scripts', 'desktop-bundle.mjs'), 'utf8');
for (const fichier of ['main.js', 'preload.cjs', 'gpu.js', 'local-server.js', 'diagnostic.html', 'offline.html']) {
  assert.ok(bundle.includes(`'${fichier}'`), `le projet isolé doit contenir ${fichier}`);
}
assert.match(bundle, /devDependencies: \{ electron: electronVersion \}/,
  'pack/package.json doit épingler la version exacte d’Electron');
assert.match(bundle, /node_modules', 'electron', 'package\.json'/,
  'la version épinglée doit venir de l’Electron réellement installé');
assert.match(bundle, /dependencies: \{ 'electron-updater': paquetCoque\.dependencies/,
  'electron-updater doit être inclus dans le projet empaqueté');
assert.match(bundle, /--omit=dev/,
  'seules les dépendances runtime doivent être installées dans le projet isolé');
ok('projet d’empaquetage isolé desktop/pack (runtime updater inclus, Electron de build exclu)');

const icones = ['desktop/app-icons/icon.ico', 'desktop/app-icons/icon.png'];
for (const fichier of icones) {
  assert.ok(readFileSync(join(RACINE, fichier)).length > 1000, `${fichier} absent ou vide`);
}
const ico = readFileSync(join(RACINE, 'desktop/app-icons/icon.ico'));
assert.equal(ico.readUInt16LE(2), 1, 'icon.ico n’est pas une icône');
assert.ok(ico.readUInt16LE(4) >= 4, 'icon.ico a trop peu de tailles');
ok('icon.ico / icon.png présents et valides');

// ---------------------------------------------------------------------------
// 5) Collisions de casse : le piège qui casse les build Windows
// ---------------------------------------------------------------------------
// Sous Windows, le système de fichiers est insensible à la casse : un import
// SANS extension `./CityRushTutorial` y résout `cityRushTutorial.js` quand les
// deux fichiers coexistent (Linux, lui, prend le `.jsx`, qui seul possède
// l'export par défaut). Le build ne casse alors que sur Windows, loin des yeux.
// On détecte la configuration, et on n'échoue que si un import sans extension
// vise effectivement ce radical — des fichiers homonymes jamais importés sans
// extension (ou toujours avec) ne sont pas un danger.
console.log('5. Collisions de casse (piège Windows)');

const EXT_MODULES = ['.js', '.jsx', '.ts', '.tsx'];

function listerSous(dossier, prefixe = '') {
  const sortie = [];
  for (const entree of readdirSync(join(dossier, prefixe), { withFileTypes: true })) {
    if (entree.name === 'node_modules' || entree.name.startsWith('.')) continue;
    const relatif = prefixe ? `${prefixe}/${entree.name}` : entree.name;
    if (entree.isDirectory()) sortie.push(...listerSous(dossier, relatif));
    else sortie.push(relatif);
  }
  return sortie;
}

/** radical (nom sans extension) minusculé → fichiers qui le portent. */
const groupes = new Map();
for (const racineSrc of ['src', 'scripts']) {
  for (const relatif of listerSous(join(RACINE, racineSrc))) {
    const base = relatif.split('/').pop();
    const ext = EXT_MODULES.find((e) => base.endsWith(e));
    if (!ext) continue;
    const cle = `${racineSrc}/${relatif.slice(0, relatif.length - base.length)}${base.slice(0, -ext.length)}`.toLowerCase();
    const groupe = groupes.get(cle) || [];
    groupe.push(`${racineSrc}/${relatif}`);
    groupes.set(cle, groupe);
  }
}

/** Contenu de tous les modules, pour chercher les imports sans extension. */
const sources = [];
for (const racineSrc of ['src', 'scripts']) {
  for (const relatif of listerSous(join(RACINE, racineSrc))) {
    sources.push([`${racineSrc}/${relatif}`, readFileSync(join(RACINE, racineSrc, relatif), 'utf8')]);
  }
}

let collisionsActives = 0;
for (const [cle, fichiers] of groupes) {
  if (fichiers.length < 2) continue;
  const radical = cle.split('/').pop();
  // Import sans extension : le radical suivi directement du guillemet fermant
  // (un import avec extension, `./x.jsx`, a un point avant le guillemet).
  const motif = new RegExp(`from\\s+['"][^'"]*\\b${radical}['"]`, 'i');
  const touches = sources.filter(([, contenu]) => motif.test(contenu)).map(([nom]) => nom);
  if (!touches.length) continue;
  collisionsActives += 1;
  console.error(`  ✗ ${fichiers.join(' et ')} ne diffèrent que par la casse,`);
  console.error(`    et ${touches.join(', ')} importe « ${radical} » sans extension :`);
  console.error('    sous Windows, cet import résoudrait le mauvais fichier. Renommez l’un des deux.');
}
assert.equal(collisionsActives, 0, 'collision de casse visée par un import sans extension');
ok('aucun import sans extension ne vise deux fichiers de même casse');

// ---------------------------------------------------------------------------
// 6) La coque ouvre le site, pas une copie du site
// ---------------------------------------------------------------------------
// L'installeur a longtemps embarqué le site entier (226 Mo de `dist-web`, dont
// 103 Mo de peintures) : chaque correctif du jeu imposait donc une Release de
// 967 Mo, et les PC installés jouaient la version du jour de l'installation.
// La coque charge maintenant le site en ligne ; le pack hors ligne est une
// option publiée à part. Ce basculement tient à quatre choses, vérifiées ici :
// le mode de démarrage, le script d'empaquetage, les déclencheurs du workflow
// et la version dérivée qui fait voir les mises à jour de coque.
console.log('6. La coque ouvre le site, pas une copie du site');

assert.match(principal, /mode = veutDemarrerLocal\(\) && urlLocale \? 'local' : 'online'/,
  'le démarrage par défaut doit être le site en ligne ; le pack ne doit pas s’imposer');
assert.match(principal, /function veutDemarrerLocal\(\)[\s\S]*?process\.argv\.includes\('--local'\)/,
  'le pack hors ligne doit rester joignable à la demande (--local)');
assert.match(principal, /function basculerEnLocal\(\)/, 'la bascule vers le pack hors ligne a disparu');
assert.match(principal, /'desktop:aller-au-jeu-local'/, 'la page « hors ligne » ne peut plus basculer sur le pack');
assert.match(principal, /locale: urlLocale \? '1' : '0'/, 'la page d’attente ne sait plus si un pack est installé');
assert.match(principal, /Expand-Archive/, 'l’installation du pack .zip a disparu');
assert.match(principal, /dossierDestinationPack\(\)[\s\S]*?resourcesPath/,
  'le pack doit atterrir dans resources/app, là où dossierPaquetWeb() le cherche');
ok('mode par défaut = site ; pack hors ligne optionnel, bascule et installation .zip présentes');

const bundleCoque = readFileSync(join(RACINE, 'scripts', 'desktop-bundle.mjs'), 'utf8');
assert.match(bundleCoque, /process\.argv\.includes\('--coque'\)/, 'le mode « coque seule » a disparu');
assert.match(bundleCoque, /LISEZ-MOI\.txt/, 'la coque seule doit poser un dossier marqueur pour extraResources');
assert.match(bundleCoque, /if \(coqueSeule\) \{[\s\S]*?\} else \{\s*var paquetWeb = construirePaquetWeb\(\);/,
  'le build Vite ne doit pas tourner quand on n’embarque pas le site');
const racinePackage = JSON.parse(readFileSync(join(RACINE, 'package.json'), 'utf8'));
assert.equal(racinePackage.scripts['desktop:coque'], 'node scripts/desktop-bundle.mjs --coque',
  'npm run desktop:coque doit exister (installeur sans paquet web)');
assert.match(bundleCoque, /modulesOublies = modulesInstalles\.filter/,
  'le garde-fou des modules embarqués a disparu');
assert.match(bundleCoque, /total\(dossierModules, lister\(dossierModules\)\)/,
  'le poids des modules runtime n’est plus contrôlé');
const builderFiles = readFileSync(join(RACINE, 'desktop', 'electron-builder.yml'), 'utf8');
assert.ok(builderFiles.includes("'!node_modules/**'"),
  'electron-builder.yml doit exclure node_modules en bloc : sinon il embarque celui du dépôt');
const modulesListes = [...builderFiles.matchAll(/^\s+- 'node_modules\/((?:@[^/']+\/)?[^'/]+)\/\*\*'$/gm)]
  .map(([, nom]) => nom);
assert.ok(modulesListes.length >= 10, 'la liste des modules embarqués a disparu');
assert.ok(modulesListes.some((nom) => nom.startsWith('electron-updater')),
  'electron-updater doit être embarqué (sinon aucune mise à jour)');
ok('desktop-bundle : mode --coque sans build Vite, marqueur LISEZ-MOI, script npm dédié');

// Le piège qui a coûté 400 Mo : electron-builder remonte l'arbre pour collecter
// les dépendances de production. Sans l'exclusion en bloc de `node_modules`, il
// embarque celui du dépôt — un installeur de 497 Mo pour un jeu qui n'en a pas
// besoin. La liste est vérifiée module par module par le script de build.
assert.equal(modulesListes.length, modulesListes.filter((nom, i) => modulesListes.indexOf(nom) === i).length,
  'la liste des modules embarqués contient un doublon');
ok(`modules embarqués : exclusion en bloc + ${modulesListes.length} modules autorisés explicitement`);

const workflow = readFileSync(join(RACINE, '.github', 'workflows', 'desktop-windows.yml'), 'utf8');
assert.match(workflow, /branches:\s*\n\s*- main\s*\n\s*paths:/,
  'le workflow doit partir sur `main` (une PR ne doit pas publier de Release)');
for (const chemin of ["'src/**'", "'public/**'", "'index.html'", "'vite.config.js'"]) {
  assert.ok(!workflow.includes(chemin),
    `un changement du site ne doit plus reconstruire l'installeur : ${chemin} traîne dans les chemins`);
}
for (const chemin of ["'desktop/**'", "'scripts/desktop-bundle.mjs'"]) {
  assert.ok(workflow.includes(chemin), `les changements de la coque doivent reconstruire : ${chemin}`);
}
ok('déclencheurs : la coque seulement — ni src/, ni public/, ni index.html');

assert.match(workflow, /npm run desktop:coque/, 'l’installeur doit sortir sans le paquet web');
assert.doesNotMatch(workflow, /npm run desktop:web[\s\S]*?npm run desktop:dist/,
  'le job de l’installeur ne doit plus construire le site');
assert.match(workflow, /-s desktop\/dist-web\/index\.html/,
  'rien ne vérifie que l’installeur « en ligne » ne contient pas le site');
ok('le job de l’installeur ne construit pas le site, et échoue s’il s’y retrouve');

assert.match(workflow, /workflow_dispatch:\s*\n\s*inputs:\s*\n\s*pack_hors_ligne:/,
  'le pack hors ligne doit être une option de lancement manuel');
assert.match(workflow, /inputs\.pack_hors_ligne == true/,
  'le pack hors ligne ne doit pas se construire à chaque build');
assert.match(workflow, /gh release upload desktop desktop\/sablier-pack-hors-ligne\.zip --clobber/,
  'le pack doit être publié sur la Release, sous un nom fixe');
assert.match(workflow, /Compress-Archive -Path "\$dest\/app"/,
  'l’archive doit contenir un dossier `app/` à sa racine (celui que la coque décompresse)');
ok('pack hors ligne : construit sur demande, zippé en app/, publié à côté de l’installeur');

assert.match(workflow, /- name: Version dérivée du build/,
  'la version publiée doit être dérivée du dépôt, sinon une reconstruction ne se voit pas');
assert.match(workflow, /git rev-list --count HEAD/,
  'le correctif de version suit le nombre de commits');
assert.match(workflow, /Math\.max\(base, commits, run\)/,
  'la version ne doit jamais reculer : correctif = max(fichier, commits, run)');
assert.match(workflow, /pkg\.version = process\.argv\[1\]/,
  'la version calculée doit être écrite dans desktop/package.json avant l’empaquetage');
assert.match(workflow, /fetch-depth:\s*0/,
  'le compte des commits exige un clone complet');
assert.ok(
  workflow.lastIndexOf('- name: Version dérivée du build') < workflow.indexOf('- name: Coque seule'),
  'la version doit être posée avant la fabrication du projet empaqueté',
);
assert.match(bundleCoque, /version:\s*paquetCoque\.version/,
  'le projet empaqueté reprend la version de la coque');
assert.match(workflow, /if: github\.ref == 'refs\/heads\/main'/,
  'la Release ne se publie que depuis `main`');
assert.match(workflow, /gh release delete desktop/,
  'la Release du tag `desktop` est remplacée à chaque build (stockage borné)');
assert.match(workflow, /cancel-in-progress:\s*\$\{\{ github\.event_name == 'pull_request' \}\}/,
  'un build de `main` ne doit pas être annulé en pleine publication de la Release');
ok('version dérivée (max fichier/commits/run), posée avant le pack, publiée sur `main` seulement');

console.log('');
console.log(`check:desktop — ${reussites} vérifications, aucune en échec.`);
