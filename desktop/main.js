/**
 * Coque PC du Sablier de Bab El — desktop/main.js
 * ================================================
 * Processus principal Electron. Trois choses, dans cet ordre :
 *
 *   1. **poser les réglages GPU avant `app.whenReady()`** — après, ils n'ont
 *      plus aucun effet (voir `desktop/gpu.js`) ;
 *   2. **démarrer le serveur local** qui sert le paquet web (`desktop/local-server.js`) ;
 *   3. **ouvrir la fenêtre** sur la route du jeu.
 *
 * Deux modes :
 *
 *   - `online` (**le défaut**) — la fenêtre charge le site en ligne, comme le
 *     fait l'APK Android avec `let-s-play-nu.vercel.app`. Chaque correctif du
 *     site est donc visible au lancement suivant, et l'installeur Windows ne
 *     contient plus de copie du site : ~105 Mo au lieu de 235.
 *   - `local` — le **pack hors ligne** (option, ~100 Mo) a été installé dans
 *     `resources/app` : le jeu se joue sans Internet. La coque ne le choisit
 *     pas d'elle-même ; c'est le filet quand le réseau manque (`--local`, menu
 *     « Jouer la version hors ligne », ou `LETSPLAY_DESKTOP_MODE=local`).
 *
 * Dérogations (variables d'environnement, pour le diagnostic) :
 *   `LETSPLAY_DESKTOP_MODE=local|online` · `LETSPLAY_REMOTE_ORIGIN=https://…`
 *   `LETSPLAY_PORT=4173` · `LETSPLAY_DEVTOOLS=1` · voir `gpu.js` pour le GPU.
 */

import { app, BrowserWindow, Menu, dialog, ipcMain, shell, session } from 'electron';
import { execFile } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import pkgUpdater from 'electron-updater';
const { autoUpdater } = pkgUpdater;

import { gpuSwitches, interpreterEtatGpu, qualifierRenderer, DIAGNOSTIC_INTRO } from './gpu.js';
import { startLocalServer, DEFAULT_PORT, DEFAULT_REMOTE_ORIGIN } from './local-server.js';

/** Identifiant Windows : regroupe les fenêtres dans la barre des tâches et
 * signe les notifications. Même famille que `dz.letsplay.officiel` (Android). */
const APP_USER_MODEL_ID = 'dz.letsplay.sablier';

/** Route du jeu dans l'app (identique au site, `src/main.jsx`). */
const ROUTE_JEU = '/jeu/sablier-de-bab-el';

/** Titre de la fenêtre — le nom du jeu, pas celui du média. */
const TITRE = 'Le Sablier de Bab El';

const MODE_FORCE = process.env.LETSPLAY_DESKTOP_MODE || '';

/** La page de la Release `desktop` : l'installeur, le portable, et le pack
 * hors ligne. Un seul lien à donner aux joueurs, il ne change jamais. */
const RELEASE_DESKTOP = 'https://github.com/SalimB-source/Let-s-Play/releases/tag/desktop';
const REMOTE_ORIGIN = (process.env.LETSPLAY_REMOTE_ORIGIN || DEFAULT_REMOTE_ORIGIN).replace(/\/+$/, '');

/** En développement, `app.getAppPath()` est `desktop/` ; une fois installé, le
 * paquet web est copié hors de l'archive `app.asar` (ressources), parce qu'un
 * serveur HTTP qui lit dans une archive est plus lent et plus fragile. */
function dossierPaquetWeb() {
  if (process.env.LETSPLAY_PAQUET) return process.env.LETSPLAY_PAQUET;
  const candidats = app.isPackaged
    ? [join(process.resourcesPath, 'app'), join(app.getAppPath(), 'app')]
    : [join(app.getAppPath(), 'app'), join(app.getAppPath(), 'dist-web')];
  return candidats.find((dossier) => existsSync(join(dossier, 'index.html'))) || null;
}

// ---------------------------------------------------------------------------
// 1) Réglages GPU — AVANT ready.
// ---------------------------------------------------------------------------
const commutateurs = gpuSwitches({ platform: process.platform, env: process.env });
for (const [nom, valeur] of commutateurs) {
  if (valeur) app.commandLine.appendSwitch(nom, valeur);
  else app.commandLine.appendSwitch(nom);
}
// Jamais de bascule en rendu logiciel ici (`app.disable…Acceleration`) : ce
// serait exactement l'inverse du but — un jeu WebGL dessiné par le CPU.

// Une seule instance : un double clic sur le raccourci alors que le jeu tourne
// ramène la fenêtre existante au lieu d'ouvrir une deuxième table.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const fenetre = BrowserWindow.getAllWindows()[0];
    if (!fenetre) return;
    if (fenetre.isMinimized()) fenetre.restore();
    fenetre.focus();
  });
  demarrer();
}

let fenetrePrincipale = null;
let serveurLocal = null;
let mode = 'online';
let urlJeu = `${REMOTE_ORIGIN}${ROUTE_JEU}`;
/** Le duel servi par le pack hors ligne, quand il est installé. */
let urlLocale = '';
let verificationMajManuelle = false;
let verificationMajEnCours = false;
let telechargementMajEnCours = false;
/** Une relance de la vérification après un échec silencieux (démarrage hors ligne). */
let relanceMajFaite = false;
/** Le paquet web embarqué, quand il existe (mode local). */
let dossierPaquet = null;
/** Une seule proposition par session : « jouer en ligne » ne se redemande pas. */
let sitePlusRecentPropose = false;

async function demarrer() {
  if (process.platform === 'win32') app.setAppUserModelId(APP_USER_MODEL_ID);

  await app.whenReady();
  autoriserMediasEtPleinEcran();

  // 2) Le pack hors ligne, s'il est installé (`resources/app`).
  //    On le sert, mais il ne décide plus du mode : le jeu s'ouvre sur le site,
  //    qui porte les correctifs du jour. Le pack est le filet hors connexion.
  const paquet = MODE_FORCE === 'online' ? null : dossierPaquetWeb();
  dossierPaquet = paquet;
  if (paquet) {
    try {
      serveurLocal = await startLocalServer({
        distDir: paquet,
        port: Number(process.env.LETSPLAY_PORT || DEFAULT_PORT),
        remoteOrigin: REMOTE_ORIGIN,
        log: (message) => console.log(message),
        getStatus: () => ({ version: app.getVersion(), electron: process.versions.electron }),
      });
      urlLocale = serveurLocal.url(ROUTE_JEU);
      console.log(`[desktop] pack hors ligne servi sur ${serveurLocal.origin}`);
    } catch (erreur) {
      console.error(`[desktop] serveur local impossible, jeu en ligne seulement : ${erreur?.message || erreur}`);
    }
  }
  mode = veutDemarrerLocal() && urlLocale ? 'local' : 'online';
  urlJeu = mode === 'local' ? urlLocale : `${REMOTE_ORIGIN}${ROUTE_JEU}`;
  console.log(`[desktop] mode ${mode} : ${urlJeu}`);

  creerFenetre();
  construireMenu();
  configurerMiseAJour();
  configurerVerificationSite();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) creerFenetre();
  });
}

/**
 * Le pack hors ligne doit-il être le mode de démarrage ?
 *
 * Non, sauf demande explicite : c'est le site qui fait foi, parce qu'il reçoit
 * les correctifs sans réinstallation. Trois façons de forcer le pack — le
 * raccourci `--local` (dépannage), la variable d'environnement, et le menu
 * « Jouer la version hors ligne », qui bascule pour la session.
 */
function veutDemarrerLocal() {
  if (MODE_FORCE === 'online') return false;
  if (MODE_FORCE === 'local') return true;
  return process.argv.includes('--local');
}

/**
 * Permissions demandées par la page. Le site utilise le micro et la caméra pour
 * les appels (`src/messages/`) et l'API Plein écran pour le duel ; tout le reste
 * est refusé — la coque n'a pas besoin de géolocalisation ni de notifications
 * push, et un refus net vaut mieux qu'une fenêtre silencieuse.
 * L'OS demande quand même son propre accord au joueur.
 */
function autoriserMediasEtPleinEcran() {
  const AUTORISES = new Set(['media', 'fullscreen', 'pointerLock', 'clipboard-sanitized-write']);
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(AUTORISES.has(permission));
  });
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => AUTORISES.has(permission) || permission === 'mediaKeySystem');
}

// ---------------------------------------------------------------------------
// 3) La fenêtre
// ---------------------------------------------------------------------------
function creerFenetre() {
  const etat = lireEtatFenetre();

  fenetrePrincipale = new BrowserWindow({
    ...etat,
    minWidth: 1024,
    minHeight: 640,
    title: TITRE,
    // Couleur du fond de l'app (`<meta name="theme-color">`) : évite l'écran
    // blanc pendant le chargement du paquet.
    backgroundColor: '#05060f',
    autoHideMenuBar: true,
    show: false,
    // L'icône vit dans les ressources (hors asar) une fois installée, voir
    // extraResources ; en développement, dans desktop/app-icons/.
    icon: join(
      app.isPackaged ? process.resourcesPath : join(import.meta.dirname, 'app-icons'),
      process.platform === 'win32' ? 'icon.ico' : 'icon.png',
    ),
    webPreferences: {
      preload: join(import.meta.dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      // Le jeu ne doit pas être ralenti quand la fenêtre passe derrière une
      // autre : les animations CSS et l'audio du duel continuent.
      backgroundThrottling: false,
    },
  });

  fenetrePrincipale.once('ready-to-show', () => fenetrePrincipale.show());
  fenetrePrincipale.on('closed', () => { fenetrePrincipale = null; });
  fenetrePrincipale.on('close', memoriserEtatFenetre);

  // Les liens externes (YouTube, Instagram, le dépôt…) partent au navigateur du
  // PC — comme dans l'APK, le jeu reste dans sa fenêtre.
  fenetrePrincipale.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  fenetrePrincipale.webContents.on('will-navigate', (evenement, url) => {
    if (estOrigineAutorisee(url)) return;
    evenement.preventDefault();
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
  });

  if (process.env.LETSPLAY_DEVTOOLS === '1') fenetrePrincipale.webContents.openDevTools({ mode: 'detach' });

  chargerJeu();
}

/** Vrai si l'URL appartient au serveur local ou au site en ligne. */
function estOrigineAutorisee(url) {
  try {
    const { origin, protocol } = new URL(url);
    if (serveurLocal && origin === serveurLocal.origin) return true;
    if (origin === new URL(REMOTE_ORIGIN).origin) return true;
    return protocol === 'file:';
  } catch {
    return false;
  }
}

function chargerJeu() {
  fenetrePrincipale.loadURL(urlJeu).catch(() => afficherHorsLigne());

  // En mode en ligne sans connexion : page d'attente avec un bouton « Réessayer »
  // (le paquet local, lui, n'a pas besoin d'Internet pour démarrer).
  fenetrePrincipale.webContents.on('did-fail-load', (_e, code, _description, urlValide) => {
    if (code === -3) return;              // -3 = navigation annulée (repli React), pas une erreur
    if (urlValide && urlValide.startsWith(urlJeu)) afficherHorsLigne();
  });
}

function afficherHorsLigne() {
  if (!fenetrePrincipale) return;
  fenetrePrincipale.loadFile(join(import.meta.dirname, 'offline.html'), {
    // `locale=1` : le pack hors ligne est installé, la page propose d'y jouer
    // au lieu de laisser le joueur devant un mur.
    query: { cible: urlJeu, mode, locale: urlLocale ? '1' : '0' },
  });
}

// ---------------------------------------------------------------------------
// État de la fenêtre (taille, position, plein écran) d'un lancement à l'autre
// ---------------------------------------------------------------------------
function fichierEtat() {
  return join(app.getPath('userData'), 'fenetre.json');
}

function lireEtatFenetre() {
  try {
    const brut = JSON.parse(readFileSync(fichierEtat(), 'utf8'));
    const etat = {};
    if (Number.isFinite(brut.width) && Number.isFinite(brut.height)) {
      etat.width = Math.max(1024, brut.width);
      etat.height = Math.max(640, brut.height);
    }
    if (Number.isFinite(brut.x) && Number.isFinite(brut.y)) { etat.x = brut.x; etat.y = brut.y; }
    return etat;
  } catch {
    return { width: 1440, height: 900 };
  }
}

function memoriserEtatFenetre() {
  if (!fenetrePrincipale) return;
  try {
    if (fenetrePrincipale.isFullScreen()) return;   // ne pas figer une taille de plein écran
    const bounds = fenetrePrincipale.getBounds();
    mkdirSync(app.getPath('userData'), { recursive: true });
    writeFileSync(fichierEtat(), JSON.stringify(bounds, null, 2));
  } catch { /* un état non écrit n'empêche pas de jouer */ }
}

// ---------------------------------------------------------------------------
// Mises à jour (installateur Windows publié sur la Release GitHub `desktop`)
// ---------------------------------------------------------------------------
function afficherDialogue(options) {
  return fenetrePrincipale
    ? dialog.showMessageBox(fenetrePrincipale, options)
    : dialog.showMessageBox(options);
}

function signalerErreurMaj(erreur) {
  verificationMajEnCours = false;
  const erreurVisible = verificationMajManuelle || telechargementMajEnCours;
  verificationMajManuelle = false;
  telechargementMajEnCours = false;
  console.error('[desktop:update] échec :', erreur);
  // Démarrage hors ligne, réseau qui n'a pas encore repris : une relance, une
  // seule et sans rien dire, une minute plus tard. Une erreur *visible* (le
  // joueur a cliqué « Rechercher une mise à jour ») reste un dialogue.
  if (!erreurVisible && !relanceMajFaite) {
    relanceMajFaite = true;
    planifierVerificationMaj(60000);
  }
  if (erreurVisible) {
    afficherDialogue({
      type: 'error',
      title: 'Mise à jour impossible',
      message: 'La recherche ou le téléchargement de la mise à jour a échoué.',
      detail: `${erreur?.message || erreur}\n\nVérifiez votre connexion Internet et réessayez.`,
      buttons: ['OK'],
    });
  }
}

function configurerMiseAJour() {
  // Le build de développement, le portable (sans installation) et les autres
  // plateformes ne doivent pas télécharger l'installateur NSIS.
  if (!app.isPackaged || process.platform !== 'win32' || process.env.PORTABLE_EXECUTABLE_DIR) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on('checking-for-update', () => {
    verificationMajEnCours = true;
    console.log('[desktop:update] vérification de la Release GitHub…');
  });

  autoUpdater.on('update-available', (info) => {
    // Garder le verrou de vérification pendant le téléchargement : un second
    // checkForUpdates() simultané est rejeté par electron-updater.
    telechargementMajEnCours = true;
    verificationMajManuelle = false;
    console.log(`[desktop:update] v${info.version} disponible, téléchargement automatique…`);
    afficherDialogue({
      type: 'info',
      title: 'Mise à jour disponible',
      message: `La version ${info.version} du Sablier de Bab El est disponible.`,
      detail: 'Elle est en cours de téléchargement en arrière-plan. Le jeu reste utilisable pendant le téléchargement.',
      buttons: ['Continuer'],
      defaultId: 0,
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`[desktop:update] téléchargement ${Math.round(progress.percent)} %`);
  });

  autoUpdater.on('update-not-available', (info) => {
    verificationMajEnCours = false;
    console.log(`[desktop:update] application à jour (v${info.version})`);
    if (verificationMajManuelle) {
      verificationMajManuelle = false;
      afficherDialogue({
        type: 'info',
        title: 'Aucune mise à jour',
        message: 'Le Sablier de Bab El est déjà à jour.',
        detail: `Version installée : ${app.getVersion()}`,
        buttons: ['OK'],
      });
    }
  });

  autoUpdater.on('update-downloaded', async (info) => {
    verificationMajEnCours = false;
    telechargementMajEnCours = false;
    console.log(`[desktop:update] v${info.version} téléchargée, prête à installer`);
    const { response } = await afficherDialogue({
      type: 'info',
      title: 'Mise à jour prête',
      message: `La version ${info.version} est téléchargée.`,
      detail: 'Redémarrer maintenant l’installe tout de suite — sinon elle s’installe à la fermeture du jeu, sans rien redemander.',
      buttons: ['Redémarrer et installer', 'Plus tard (à la fermeture)'],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) autoUpdater.quitAndInstall();
  });

  autoUpdater.on('error', signalerErreurMaj);

  // Au lancement, tôt : le joueur est encore au menu, c'est le meilleur moment
  // pour installer. Puis toutes les six heures, pour une session qui dure.
  planifierVerificationMaj(2000);
  const battement = setInterval(() => lancerVerificationMaj(false), 6 * 60 * 60 * 1000);
  battement.unref?.();
}

/** Programme une vérification silencieuse (jamais deux en même temps). */
function planifierVerificationMaj(delaiMs) {
  const temporisateur = setTimeout(() => lancerVerificationMaj(false), delaiMs);
  temporisateur.unref?.();
}

/** Le site en ligne est-il plus récent que le paquet embarqué ?
 *
 * L'installateur Windows embarque une copie du site : sans nouvelle Release,
 * un PC peut jouer une version vieille de plusieurs semaines, alors que la
 * version en ligne contient les correctifs du jour. `version.json` (écrit par
 * `vite.config.js`, gravé dans le bundle) donne l'identité du build : si les
 * deux diffèrent, on propose de jouer en ligne — le paquet local reste là,
 * jouable hors connexion, et l'installateur, lui, continue de se mettre à jour
 * par `autoUpdater`. Rien à faire hors ligne : on ne dit rien.
 */
function configurerVerificationSite() {
  const temporisateur = setTimeout(verifierSitePlusRecent, 3000);
  temporisateur.unref?.();
}

function lireBuildLocal() {
  if (!dossierPaquet) return '';
  try {
    const donnees = JSON.parse(readFileSync(join(dossierPaquet, 'version.json'), 'utf8'));
    return typeof donnees?.buildId === 'string' ? donnees.buildId.trim() : '';
  } catch {
    return '';
  }
}

async function verifierSitePlusRecent() {
  if (sitePlusRecentPropose || mode !== 'local' || !dossierPaquet) return;
  if (typeof fetch !== 'function') return;
  const buildLocal = lireBuildLocal();
  // Un build local (`local-…`) n'est pas comparable à un déploiement.
  if (!buildLocal || buildLocal.startsWith('local-')) return;

  let distant = null;
  try {
    const controleur = new AbortController();
    const minuterie = setTimeout(() => controleur.abort(), 6000);
    const reponse = await fetch(`${REMOTE_ORIGIN}/version.json?v=${Date.now()}`, {
      cache: 'no-store',
      signal: controleur.signal,
    });
    clearTimeout(minuterie);
    if (reponse.ok) distant = await reponse.json();
  } catch {
    return; // hors ligne : le paquet local est justement là pour ça
  }

  const buildDistant = typeof distant?.buildId === 'string' ? distant.buildId.trim() : '';
  if (!buildDistant || buildDistant === buildLocal || buildDistant.startsWith('local-')) return;

  sitePlusRecentPropose = true;
  console.log(`[desktop:site] paquet ${buildLocal} / en ligne ${buildDistant}`);
  const { response } = await afficherDialogue({
    type: 'info',
    title: 'Une version plus récente est en ligne',
    message: 'L’application installée embarque une copie du site plus ancienne que celle en ligne.',
    detail: 'Jouer en version en ligne donne accès aux correctifs du jour. L’application reste installée et jouable hors connexion, et l’installateur, quand il est republié, s’installe à la fermeture du jeu.',
    buttons: ['Jouer en version en ligne', 'Rester dans l’application'],
    defaultId: 0,
    cancelId: 1,
  });
  if (response === 0) basculerEnLigne();
}

/**
 * Passer au pack hors ligne pour la session. Utilisé par la page d'attente
 * (bouton « Jouer hors ligne ») et par le menu. Sans pack, on ne peut que
 * réessayer : la page d'attente le dit.
 */
function basculerEnLocal() {
  if (!urlLocale) return afficherHorsLigne();
  mode = 'local';
  urlJeu = urlLocale;
  construireMenu();
  console.log(`[desktop] bascule hors ligne : ${urlJeu}`);
  fenetrePrincipale?.loadURL(urlJeu).catch(() => afficherHorsLigne());
}

function basculerEnLigne() {
  mode = 'online';
  urlJeu = `${REMOTE_ORIGIN}${ROUTE_JEU}`;
  construireMenu();
  console.log(`[desktop] bascule en ligne : ${urlJeu}`);
  fenetrePrincipale?.loadURL(urlJeu).catch(() => afficherHorsLigne());
}

function lancerVerificationMaj(manuelle) {
  if (!app.isPackaged || process.platform !== 'win32' || process.env.PORTABLE_EXECUTABLE_DIR || verificationMajEnCours) return;
  verificationMajManuelle = manuelle;
  verificationMajEnCours = true;
  try {
    const resultat = autoUpdater.checkForUpdates();
    resultat?.catch(signalerErreurMaj);
  } catch (erreur) {
    signalerErreurMaj(erreur);
  }
}

// ---------------------------------------------------------------------------
// Pack hors ligne (option)
// ---------------------------------------------------------------------------
/**
 * L'installeur publié ne contient plus de copie du site : ~105 Mo au lieu de
 * 967, et surtout, il n'a plus à être reconstruit à chaque correctif. Qui veut
 * jouer sans Internet installe le **pack hors ligne**, publié à part sur la
 * même Release (~100 Mo, le site élagué de ce que la coque n'ouvre jamais).
 *
 * Il se dépose dans `resources/app` — exactement où `dossierPaquetWeb()` le
 * cherche — et n'est jamais écrasé par une mise à jour de la coque, qui ne
 * touche qu'à `app.asar`.
 */
async function ouvrirPackHorsLigne() {
  const installe = Boolean(dossierPaquet);
  const boutons = installe
    ? ['Retirer le pack', 'Fermer']
    : ['Télécharger le pack', 'Choisir un fichier .zip…', 'Fermer'];
  const { response } = await afficherDialogue({
    type: 'info',
    title: 'Pack hors ligne',
    message: installe
      ? 'Le pack hors ligne est installé : le jeu démarre sans Internet.'
      : 'Le pack hors ligne rend le jeu jouable sans connexion.',
    detail: installe
      ? 'Le jeu démarre quand même sur le site en ligne, qui reçoit les correctifs du jour ; '
        + 'le pack sert de secours dès que le réseau manque (menu Jeu → Jouer la version hors ligne, '
        + 'ou automatiquement depuis la page « pas de connexion »).'
      : 'Il pèse environ 100 Mo et se télécharge depuis la page de la Release. Une fois le .zip '
        + 'récupéré, « Choisir un fichier .zip… » l’installe ici. Sans lui, le jeu a besoin d’une '
        + 'connexion pour démarrer — c’est le prix d’un installeur de 105 Mo qui se corrige tout seul.',
    buttons: boutons,
    defaultId: 0,
    cancelId: boutons.length - 1,
  });
  if (installe) {
    if (response === 0) await retirerPackHorsLigne();
    return;
  }
  if (response === 0) shell.openExternal(RELEASE_DESKTOP);
  else if (response === 1) await choisirEtInstallerPack();
}

async function choisirEtInstallerPack() {
  const { canceled, filePaths } = await dialog.showOpenDialog(fenetrePrincipale, {
    title: 'Choisir le pack hors ligne (.zip)',
    properties: ['openFile'],
    filters: [{ name: 'Archive du pack', extensions: ['zip'] }],
  });
  if (canceled || !filePaths?.[0]) return;
  try {
    await installerPackZip(filePaths[0]);
    const { response } = await afficherDialogue({
      type: 'info',
      title: 'Pack hors ligne installé',
      message: 'Le jeu est désormais jouable sans connexion.',
      detail: 'L’application doit redémarrer pour le prendre en compte.',
      buttons: ['Redémarrer maintenant', 'Plus tard'],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) { app.relaunch(); app.exit(0); }
  } catch (erreur) {
    afficherDialogue({
      type: 'error',
      title: 'Installation impossible',
      message: 'Le pack hors ligne n’a pas pu être installé.',
      detail: `${erreur?.message || erreur}\n\nÀ la main : décompressez l’archive et copiez son `
        + `dossier « app » dans :\n${dossierDestinationPack()}`,
      buttons: ['OK'],
    });
  }
}

/** Le dossier où vit le pack, une fois installé. */
function dossierDestinationPack() {
  return join(process.resourcesPath || dirname(app.getAppPath()), 'app');
}

/** Guillemets PowerShell : une apostrophe se double, rien d'autre ne s'échappe. */
function psQuote(texte) {
  return `'${String(texte).replace(/'/g, "''")}'`;
}

function executerCommande(commande, arguments_) {
  return new Promise((resoudre, rejeter) => {
    execFile(commande, arguments_, { windowsHide: true }, (erreur, sortie, erreurSortie) => {
      if (erreur) rejeter(new Error(String(erreurSortie || erreur.message).trim()));
      else resoudre(String(sortie));
    });
  });
}

/**
 * Décompresse le pack puis le pose dans `resources/app`.
 *
 * L'extraction passe par PowerShell (`Expand-Archive`, présent depuis Windows
 * 10) plutôt que par une dépendance de plus dans la coque : le pack est
 * l'option, pas la règle, et `node:zlib` ne lit pas les archives ZIP. Le
 * dossier temporaire est nettoyé dans tous les cas, et une archive sans
 * `index.html` est refusée avant d'avoir touché à l'installation.
 */
async function installerPackZip(archive) {
  if (process.platform !== 'win32') {
    throw new Error('l’installation automatique du pack passe par PowerShell (Windows).');
  }
  if (!app.isPackaged) {
    throw new Error('en développement, servez `desktop/dist-web` avec LETSPLAY_PAQUET.');
  }
  const tampon = join(app.getPath('temp'), `sablier-pack-${Date.now()}`);
  try {
    mkdirSync(tampon, { recursive: true });
    await executerCommande('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-Command',
      `Expand-Archive -LiteralPath ${psQuote(archive)} -DestinationPath ${psQuote(tampon)} -Force`,
    ]);
    const racine = existsSync(join(tampon, 'app', 'index.html'))
      ? join(tampon, 'app')
      : tampon;
    if (!existsSync(join(racine, 'index.html'))) {
      throw new Error('l’archive ne contient pas index.html — est-ce bien le pack hors ligne ?');
    }
    const destination = dossierDestinationPack();
    rmSync(destination, { recursive: true, force: true, maxRetries: 6, retryDelay: 250 });
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(racine, destination, { recursive: true });
    console.log(`[desktop] pack hors ligne installé dans ${destination}`);
  } finally {
    rmSync(tampon, { recursive: true, force: true, maxRetries: 6, retryDelay: 250 });
  }
}

async function retirerPackHorsLigne() {
  try {
    rmSync(dossierDestinationPack(), { recursive: true, force: true, maxRetries: 6, retryDelay: 250 });
  } catch (erreur) {
    afficherDialogue({
      type: 'error',
      title: 'Retrait impossible',
      message: 'Le pack hors ligne n’a pas pu être retiré.',
      detail: `${erreur?.message || erreur}\n\nSupprimez à la main le dossier :\n${dossierDestinationPack()}`,
      buttons: ['OK'],
    });
    return;
  }
  afficherDialogue({
    type: 'info',
    title: 'Pack hors ligne retiré',
    message: 'Le jeu se jouera désormais en ligne uniquement.',
    detail: 'L’application doit redémarrer pour le prendre en compte.',
    buttons: ['Redémarrer maintenant', 'Plus tard'],
    defaultId: 0,
    cancelId: 1,
  }).then(({ response }) => {
    if (response === 0) { app.relaunch(); app.exit(0); }
  });
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------
function construireMenu() {
  const estMac = process.platform === 'darwin';

  const modele = [
    ...(estMac ? [{ role: 'appMenu', label: TITRE }] : []),
    {
      label: 'Jeu',
      submenu: [
        {
          label: 'Plein écran',
          accelerator: 'F11',
          click: () => fenetrePrincipale?.setFullScreen(!fenetrePrincipale.isFullScreen()),
        },
        {
          label: 'Recharger la table',
          accelerator: 'CmdOrCtrl+R',
          click: () => fenetrePrincipale?.webContents.reload(),
        },
        {
          label: 'Revenir à l’écran du duel',
          click: () => { fenetrePrincipale?.loadURL(urlJeu); },
        },
        // La bascule n'apparaît que si elle mène quelque part : sans pack
        // hors ligne, il n'y a rien à rejoindre.
        ...(urlLocale ? [{
          label: mode === 'local' ? 'Revenir au site en ligne' : 'Jouer la version hors ligne',
          click: () => (mode === 'local' ? basculerEnLigne() : basculerEnLocal()),
        }] : []),
        { type: 'separator' },
        { role: estMac ? 'close' : 'quit', label: estMac ? 'Fermer la fenêtre' : 'Quitter' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { role: 'zoomIn', label: 'Zoom avant' },
        { role: 'zoomOut', label: 'Zoom arrière' },
        { role: 'resetZoom', label: 'Zoom normal' },
        { type: 'separator' },
        { role: 'toggleDevTools', label: 'Outils de développement' },
      ],
    },
    {
      label: 'Carte graphique',
      submenu: [
        { label: 'État de la carte graphique…', click: ouvrirDiagnostic },
        { label: 'Rapport GPU de Chromium…', click: ouvrirRapportChromium },
        { type: 'separator' },
        // Ligne d'information (grisée) : d'où vient le jeu affiché.
        {
          label: mode === 'local'
            ? 'Mode : pack hors ligne — sans Internet'
            : 'Mode : site en ligne — correctifs du jour',
          enabled: false,
        },
        {
          label: `Pack hors ligne : ${dossierPaquet ? 'installé' : 'absent'}`,
          enabled: false,
        },
      ],
    },
    {
      label: 'Aide',
      submenu: [
        {
          label: 'Rechercher une mise à jour…',
          click: () => {
            if (!app.isPackaged || process.platform !== 'win32' || process.env.PORTABLE_EXECUTABLE_DIR) {
              afficherDialogue({
                type: 'info',
                title: 'Mises à jour',
                message: 'La mise à jour automatique est disponible dans la version Windows installée.',
                buttons: ['OK'],
              });
              return;
            }
            if (verificationMajEnCours) return;
            lancerVerificationMaj(true);
          },
        },
        { label: 'Pack hors ligne…', click: () => { ouvrirPackHorsLigne(); } },
        { label: 'Le site Let’s Play (navigateur)', click: () => shell.openExternal(REMOTE_ORIGIN) },
        { label: 'Dépôt du projet', click: () => shell.openExternal('https://github.com/SalimB-source/Let-s-Play') },
        { type: 'separator' },
        { role: 'about', label: `À propos de ${TITRE}` },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(modele));
}

/** Fenêtre de diagnostic : renderer réel, état des fonctions GPU, sonde WebGL. */
function ouvrirDiagnostic() {
  const existante = BrowserWindow.getAllWindows().find((f) => f.webContents.getURL().endsWith('diagnostic.html'));
  if (existante) { existante.focus(); return; }

  const fenetre = new BrowserWindow({
    width: 760,
    height: 720,
    parent: fenetrePrincipale || undefined,
    title: 'État de la carte graphique',
    backgroundColor: '#05060f',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(import.meta.dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  fenetre.loadFile(join(import.meta.dirname, 'diagnostic.html'), {
    query: { intro: DIAGNOSTIC_INTRO },
  });
  fenetre.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

/** `chrome://gpu` dans une fenêtre à part : le rapport complet de Chromium. */
function ouvrirRapportChromium() {
  const fenetre = new BrowserWindow({
    width: 1000,
    height: 760,
    title: 'chrome://gpu — rapport Chromium',
    backgroundColor: '#05060f',
  });
  fenetre.loadURL('chrome://gpu');
  fenetre.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

// ---------------------------------------------------------------------------
// Pont rendu ↔ principal
// ---------------------------------------------------------------------------
ipcMain.handle('desktop:etat', async () => {
  let gpuInfo = null;
  let featureStatus = {};
  try {
    gpuInfo = await app.getGPUInfo('basic');
  } catch (erreur) {
    gpuInfo = { erreur: String(erreur?.message || erreur) };
  }
  try {
    featureStatus = app.getGPUFeatureStatus();
  } catch { /* anciens Electron */ }

  const renderer = gpuInfo?.gpuDevice?.[0]?.renderer
    || gpuInfo?.auxAttributes?.glRenderer
    || '';
  return {
    version: app.getVersion(),
    electron: process.versions.electron,
    chromium: process.versions.chrome,
    node: process.versions.node,
    plateforme: process.platform,
    mode,
    urlJeu,
    origineLocale: serveurLocal?.origin || null,
    origineDistante: REMOTE_ORIGIN,
    commutateurs,
    gpu: gpuInfo,
    renderer,
    rendu: qualifierRenderer(renderer),
    fonctions: interpreterEtatGpu(featureStatus),
    paquets: { dossier: dossierPaquetWeb() },
  };
});

ipcMain.handle('desktop:plein-ecran', (_e, actif) => {
  if (!fenetrePrincipale) return false;
  const voulu = typeof actif === 'boolean' ? actif : !fenetrePrincipale.isFullScreen();
  fenetrePrincipale.setFullScreen(voulu);
  return voulu;
});

ipcMain.handle('desktop:recharger', () => {
  fenetrePrincipale?.webContents.reload();
  return true;
});

ipcMain.handle('desktop:ouvrir-diagnostic', () => {
  ouvrirDiagnostic();
  return true;
});

/** Recharger le jeu lui-même (et non la page d'attente « hors ligne »). */
ipcMain.handle('desktop:aller-au-jeu', () => {
  if (fenetrePrincipale) chargerJeu();
  return true;
});

/** Depuis la page d'attente : basculer sur le pack hors ligne. */
ipcMain.handle('desktop:aller-au-jeu-local', () => {
  basculerEnLocal();
  return true;
});

/** `chrome://gpu` s'ouvre dans sa propre fenêtre : une page `file://` ne peut
 * pas y naviguer directement. */
ipcMain.handle('desktop:ouvrir-rapport-chromium', () => {
  ouvrirRapportChromium();
  return true;
});

/** Ouvrir une URL externe (inscription sur le site) dans le navigateur du PC. */
ipcMain.handle('desktop:ouvrir-externe', (_e, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    shell.openExternal(url);
    return true;
  }
  return false;
});

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    try { await serveurLocal?.close(); } catch { /* déjà fermé */ }
    app.quit();
  }
});

app.on('before-quit', async () => {
  try { await serveurLocal?.close(); } catch { /* déjà fermé */ }
});

// Message de secours si `dialog` est disponible mais la fenêtre absente.
process.on('uncaughtException', (erreur) => {
  console.error('[desktop] exception :', erreur);
  if (app.isReady() && !BrowserWindow.getAllWindows().length) {
    dialog.showErrorBox('Le Sablier de Bab El a rencontré une erreur', String(erreur?.message || erreur));
  }
});
