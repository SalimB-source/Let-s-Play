/**
 * Pont sécurisé entre la fenêtre de jeu et le processus principal.
 * ----------------------------------------------------------------
 * `contextIsolation` est actif et `nodeIntegration` désactivé : la page ne
 * voit de Node que ce qui est exposé ici, sous `window.letsPlayDesktop`.
 *
 * Volontairement **aucun** `window.LetsPlayAndroid` : ce pont existe pour
 * l'APK, et le jeu s'en sert pour passer en mise en page téléphone et verrouiller
 * le paysage (`RpgDuelPage.jsx`, `rpgLandscape.js`). Sur PC on veut exactement
 * l'inverse — la détection `pointer: coarse` / `max-width: 1100px` prend alors
 * le relais et donne la table « bureau », à la souris et au clavier.
 *
 * Ce fichier est en CommonJS (`.cjs`) : avec `sandbox: true`, un preload ESM
 * n'est pas chargé. Le reste du dossier `desktop/` est en ESM.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('letsPlayDesktop', {
  /** Vrai dans la coque PC (absent dans un navigateur classique). */
  isDesktop: true,
  plateforme: process.platform,
  versions: {
    electron: process.versions.electron,
    chromium: process.versions.chrome,
    node: process.versions.node,
  },
  /** État complet : mode, URLs, GPU, commutateurs, fonctions Chromium. */
  etat: () => ipcRenderer.invoke('desktop:etat'),
  /** Plein écran de la fenêtre (`true`/`false`, ou sans argument = bascule). */
  pleinEcran: (actif) => ipcRenderer.invoke('desktop:plein-ecran', actif),
  /** Recharger la page courante. */
  recharger: () => ipcRenderer.invoke('desktop:recharger'),
  /** Revenir au duel (utilisé par la page « hors ligne »). */
  allerAuJeu: () => ipcRenderer.invoke('desktop:aller-au-jeu'),
  /** Ouvrir la fenêtre de diagnostic graphique. */
  ouvrirDiagnostic: () => ipcRenderer.invoke('desktop:ouvrir-diagnostic'),
  /** Ouvrir le rapport `chrome://gpu` de Chromium. */
  ouvrirRapportChromium: () => ipcRenderer.invoke('desktop:ouvrir-rapport-chromium'),
});
