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
 * Deux modes, choisis automatiquement :
 *
 *   - `local`  — le paquet web est embarqué (dossier `app/` à côté des
 *                ressources) : le jeu démarre et se joue **sans Internet**.
 *                Seuls le compte, les duels en ligne et le souk demandent une
 *                connexion (Supabase), exactement comme sur le site.
 *   - `online` — pas de paquet embarqué : la fenêtre charge le site en ligne,
 *                comme le fait l'APK Android avec `let-s-play-nu.vercel.app`.
 *                Chaque mise à jour du site est alors visible sans réinstaller.
 *
 * Dérogations (variables d'environnement, pour le diagnostic) :
 *   `LETSPLAY_DESKTOP_MODE=local|online` · `LETSPLAY_REMOTE_ORIGIN=https://…`
 *   `LETSPLAY_PORT=4173` · `LETSPLAY_DEVTOOLS=1` · voir `gpu.js` pour le GPU.
 */

import { app, BrowserWindow, Menu, dialog, ipcMain, shell, session } from 'electron';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { autoUpdater } from 'electron-updater';

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
let verificationMajManuelle = false;
let verificationMajEnCours = false;
let telechargementMajEnCours = false;

async function demarrer() {
  if (process.platform === 'win32') app.setAppUserModelId(APP_USER_MODEL_ID);

  await app.whenReady();
  autoriserMediasEtPleinEcran();

  // 2) Le paquet local, s'il est embarqué.
  const paquet = MODE_FORCE === 'online' ? null : dossierPaquetWeb();
  if (paquet) {
    try {
      serveurLocal = await startLocalServer({
        distDir: paquet,
        port: Number(process.env.LETSPLAY_PORT || DEFAULT_PORT),
        remoteOrigin: REMOTE_ORIGIN,
        log: (message) => console.log(message),
        getStatus: () => ({ version: app.getVersion(), electron: process.versions.electron }),
      });
      mode = 'local';
      urlJeu = serveurLocal.url(ROUTE_JEU);
      console.log(`[desktop] paquet local servi sur ${serveurLocal.origin}`);
    } catch (erreur) {
      console.error(`[desktop] serveur local impossible, repli en ligne : ${erreur?.message || erreur}`);
    }
  }
  if (mode === 'online') {
    console.log(`[desktop] mode en ligne : ${urlJeu}`);
  }

  creerFenetre();
  construireMenu();
  configurerMiseAJour();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) creerFenetre();
  });
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
    query: { cible: urlJeu, mode },
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
      message: `La version ${info.version} a été téléchargée.`,
      detail: 'Installez-la maintenant, ou continuez à jouer : elle s’installera à la fermeture de l’application.',
      buttons: ['Redémarrer et installer', 'Plus tard'],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) autoUpdater.quitAndInstall();
  });

  autoUpdater.on('error', signalerErreurMaj);

  // Une vérification au démarrage, différée pour laisser la fenêtre s'ouvrir.
  const temporisateur = setTimeout(() => lancerVerificationMaj(false), 8000);
  temporisateur.unref?.();
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
            ? 'Mode : paquet local — jouable hors ligne'
            : 'Mode : site en ligne',
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
