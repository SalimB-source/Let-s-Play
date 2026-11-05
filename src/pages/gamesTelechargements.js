import { useLanguage } from '../i18n/LanguageContext';

/**
 * Téléchargements des jeux — `src/pages/gamesTelechargements.js`
 * --------------------------------------------------------------
 * Les quatre applications publiées par la CI (voir `.github/workflows/`) : pour
 * chaque jeu, un installeur Windows et une APK Android. Les deux coques de jeu
 * ouvrent la page du jeu sans en sortir, et WebGPU de la conduite libre y est
 * disponible comme dans un navigateur.
 *
 * **Pourquoi ces URL sont écrites ici et pas dans un fichier de configuration
 * généré** : ce sont des liens **stables**. Le dépôt publie chaque build sur des
 * Releases permanentes, avec en plus une copie au nom FIXE de chaque fichier
 * (`<jeu>-setup.exe`, `<jeu>-latest.apk`) — c'est ce que la CI ajoute à côté du
 * nom versionné. Le site n'a donc jamais besoin de savoir quelle version est en
 * ligne : le lien ne change pas, le contenu est remplacé.
 *
 * Correspondance avec `desktop/jeux.js` (côté PC) et la table `identites` de
 * `android/app/build.gradle` (côté Android) : mêmes jeux, mêmes routes.
 */

const DEPOT = 'https://github.com/SalimB-source/Let-s-Play';

/** Releases permanentes, une par jeu et par plateforme. */
export const RELEASES = {
  sablier: {
    windows: `${DEPOT}/releases/download/desktop/le-sablier-de-bab-el-setup.exe`,
    apk: `${DEPOT}/releases/download/apk-sablier/le-sablier-de-bab-el-latest.apk`,
  },
  viceCity: {
    windows: `${DEPOT}/releases/download/desktop-vice-city/vice-city-rush-setup.exe`,
    apk: `${DEPOT}/releases/download/apk-vice-city/vice-city-rush-latest.apk`,
  },
};

/**
 * Libellés par langue. Trois langues comme le reste du site (`useLanguage`) :
 * le français d'abord, puis l'anglais et l'arabe, qui lisent la même grille.
 */
const TEXTES = {
  fr: {
    titre: 'Emporter le jeu',
    windows: 'Windows',
    android: 'Android',
    apk: 'APK',
    exe: '.exe',
    aideWindows: 'Installeur Windows 10/11 — le jeu dans sa propre fenêtre, sans passer par le site.',
    aideAndroid: 'Application Android — le jeu seul, avec son icône dans le tiroir d’applications.',
  },
  en: {
    titre: 'Take it with you',
    windows: 'Windows',
    android: 'Android',
    apk: 'APK',
    exe: '.exe',
    aideWindows: 'Windows 10/11 installer — the game in its own window, no browser needed.',
    aideAndroid: 'Android app — the game on its own, with its icon in the app drawer.',
  },
  ar: {
    titre: 'خُذ اللعبة معك',
    windows: 'ويندوز',
    android: 'أندرويد',
    apk: 'APK',
    exe: '.exe',
    aideWindows: 'مُثبّت لويندوز 10/11 — اللعبة في نافذة خاصة، دون متصفح.',
    aideAndroid: 'تطبيق أندرويد — اللعبة وحدها، بأيقونتها في قائمة التطبيقات.',
  },
};

/** Libellés de la langue courante, avec repli sur le français. */
export function textesTelechargement(lang) {
  return TEXTES[lang] || TEXTES.fr;
}

/**
 * Vrai dans une coque (exe Electron, APK). Les téléchargements y sont inutiles —
 * on est déjà dans l'application — et les liens sortiraient de la coque, que
 * `desktop/routes.js` et `MainActivity.estRouteDuJeu` refusent justement. On ne
 * les affiche donc pas, comme le fait déjà le hub du Sablier.
 */
export function dansUneCoque(win = typeof window === 'undefined' ? undefined : window) {
  if (!win) return false;
  return Boolean(win.letsPlayDesktop || win.LetsPlayAndroid);
}

/** Raccourci pratique : les textes de la langue active. */
export function useTextesTelechargement() {
  const { lang } = useLanguage();
  return textesTelechargement(lang);
}
