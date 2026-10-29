import { requestNativeFullscreen, exitNativeFullscreen, nativeFullscreenElement } from './gameFullscreen.js';

/**
 * Le paysage du Sablier appartient à la **route**, pas au duel
 * -----------------------------------------------------------
 * Deux écrans le réclament : la route `/jeu/sablier-de-bab-el` (menu, atelier,
 * souk, mode histoire — voir `PaysageSablier.jsx`) et le duel lui-même. Ils se
 * superposent : le duel ouvre sa session à l'intérieur de celle de la route.
 *
 * D'où ce compteur de module : le système n'est prévenu qu'à la **première**
 * ouverture et à la **dernière** fermeture. Sans lui, revenir du duel au menu
 * relâchait le verrou et l'écran repassait en portrait — exactement le défaut
 * qu'on corrige.
 */
let sessionsOuvertes = 0;

/**
 * Le verrou d'orientation a-t-il été réellement pris — par n'importe quelle
 * session ? Il faut le savoir : le duel peut avoir verrouillé là où la route,
 * montée hors plein écran, n'y était pas parvenue. Sans ce drapeau, la dernière
 * session quittée ne rendait pas l'écran (son `ownsOrientation` à faux) et le
 * site restait coincé en paysage.
 */
let verrouPris = false;

/** Session ouverte par ce module — les tests s'en servent, pas l'application. */
export function sessionsPaysageOuvertes() {
  return sessionsOuvertes;
}

/** Remise à zéro réservée aux tests : une session ne survit pas à un test. */
export function reinitialiserSessionsPaysage() {
  sessionsOuvertes = 0;
  verrouPris = false;
}

/** Le pont Android, sous son nouveau nom comme sous l'ancien. */
function annoncerPaysage(win, actif) {
  const pont = win?.LetsPlayAndroid;
  if (!pont) return;
  try {
    if (typeof pont.setPaysageSablier === 'function') pont.setPaysageSablier(actif);
    else pont.setDuelLandscape?.(actif);
  } catch { /* pont d'une APK plus ancienne : rien à casser */ }
}

/** Délai (ms) laissé à la page pour obtenir le plein écran avant de verrouiller
 * le paysage : `screen.orientation.lock` est refusé tant que le document n'est
 * pas en plein écran, et la demande de la page est en vol dans le même geste. */
const FULLSCREEN_WAIT_MS = 1200;

/**
 * Attend que le document passe en plein écran — celui que la page demande de
 * son côté (`useGameFullscreen`), pas celui de la session. Rend une promesse
 * (`true` si le plein écran est là, `false` à la fin du délai) ou `null` quand
 * il n'y a rien à attendre : le plein écran est déjà posé, ou le document ne
 * peut pas nous prévenir (doublure de test). Le verrou d'orientation est tenté
 * dans tous les cas, son échec menant à l'invite de rotation.
 */
function attendrePleinEcran(doc, timeoutMs = FULLSCREEN_WAIT_MS) {
  if (nativeFullscreenElement(doc)) return null;
  if (typeof doc?.addEventListener !== 'function' || typeof setTimeout !== 'function') return null;
  // Sans Fullscreen API (iPhone, iframe) il n'y a rien à attendre : le verrou
  // d'orientation sera refusé de toute façon et l'invite de rotation prend le relais.
  const element = doc?.documentElement;
  if (typeof element?.requestFullscreen !== 'function' && typeof element?.webkitRequestFullscreen !== 'function') {
    return null;
  }
  return new Promise((resolve) => {
    const terminer = () => {
      clearTimeout(timer);
      doc.removeEventListener('fullscreenchange', surChangement);
      doc.removeEventListener('webkitfullscreenchange', surChangement);
      resolve(Boolean(nativeFullscreenElement(doc)));
    };
    const surChangement = () => { if (nativeFullscreenElement(doc)) terminer(); };
    const timer = setTimeout(terminer, timeoutMs);
    doc.addEventListener('fullscreenchange', surChangement);
    doc.addEventListener('webkitfullscreenchange', surChangement);
  });
}

/** A duel owns only the orientation/fullscreen it requested. A late browser
 * promise must never lock the screen again after the player leaves the duel. */
export function createRpgLandscapeSession(win = window, doc = document) {
  let active = false;
  // Cette session a-t-elle déjà compté dans `sessionsOuvertes` ? `enter()` peut
  // être appelé plusieurs fois (reprise de partie, retour au plateau) : une
  // session ne compte qu'une fois.
  let annonce = false;
  let generation = 0;
  let ownsFullscreen = false;
  let ownsOrientation = false;
  // Une seule tentative de verrou à la fois : l'évènement `fullscreenchange` et
  // le flux principal de `enter()` peuvent se croiser, ils partagent la même
  // promesse au lieu d'appeler `lock` deux fois.
  let verrouEnCours = null;
  // Écouteur de rattrapage : tant que la session est ouverte et que le paysage
  // n'est pas pris, chaque entrée en plein écran rejoue le verrou. Le
  // navigateur refuse `screen.orientation.lock` hors plein écran, et le plein
  // écran de la page peut arriver après l'attente de `enter()` (geste suivant,
  // navigateur lent) — la partie doit finir en paysage dès qu'il est là.
  let rattrapage = null;
  const mobile = () => Boolean(win.LetsPlayAndroid)
    || Boolean(win.matchMedia?.('(pointer: coarse)').matches)
    || win.innerWidth <= 620;

  const libererRattrapage = () => {
    if (!rattrapage) return;
    try {
      doc?.removeEventListener?.('fullscreenchange', rattrapage);
      doc?.removeEventListener?.('webkitfullscreenchange', rattrapage);
    } catch { /* document muet */ }
    rattrapage = null;
  };

  const verrouillerPaysage = (token) => {
    if (ownsOrientation || !active || token !== generation) return Promise.resolve(false);
    if (verrouEnCours) return verrouEnCours;
    if (!win.screen?.orientation?.lock) return Promise.resolve(false);
    verrouEnCours = win.screen.orientation.lock('landscape')
      .then(() => {
        // Session close during the lock: hand the screen back.
        if (!active || token !== generation) {
          try { win.screen.orientation.unlock?.(); } catch { /* already unlocked */ }
          return false;
        }
        ownsOrientation = true;
        verrouPris = true;
        libererRattrapage();
        return true;
      })
      .catch(() => false) // Safari / embedded previews: the rotate prompt is the fallback.
      .finally(() => { verrouEnCours = null; });
    return verrouEnCours;
  };

  return {
    async enter({ fullscreen = true } = {}) {
      const needsLandscape = mobile();
      active = true;
      const token = ++generation;
      if (needsLandscape) {
        if (!annonce) {
          annonce = true;
          sessionsOuvertes += 1;
          if (sessionsOuvertes === 1) annoncerPaysage(win, true);
        }
        // Un `enter()` qui remplace le précédent reprend l'écouteur avec le
        // nouveau jeton — un seul rattrapage armé par session.
        libererRattrapage();
        if (typeof doc?.addEventListener === 'function') {
          rattrapage = () => {
            if (!active || token !== generation || ownsOrientation) return;
            if (!nativeFullscreenElement(doc)) return;
            verrouillerPaysage(token);
          };
          doc.addEventListener('fullscreenchange', rattrapage);
          doc.addEventListener('webkitfullscreenchange', rattrapage);
        }
      }
      // The native fullscreen request must happen inside the launch/resume
      // gesture. It applies on desktop too; CSS keeps the table fitted to the
      // viewport when the browser or an embedded preview rejects the request.
      if (fullscreen && !nativeFullscreenElement(doc)) {
        const opened = await requestNativeFullscreen(doc.documentElement);
        if (opened) {
          if (!active || token !== generation) {
            if (!active) await exitNativeFullscreen(doc);
            else ownsFullscreen = true;
            return;
          }
          ownsFullscreen = true;
        }
      } else if (!fullscreen) {
        // `fullscreen: false` : le plein écran appartient à la page
        // (`useGameFullscreen`) — au doigt, la page le demande dans le geste du
        // lancement, juste avant cet appel. On l'attend avant de verrouiller
        // l'orientation — le navigateur refuse `screen.orientation.lock` hors
        // plein écran — sans jamais le refermer. S'il arrive après le délai,
        // l'écouteur de rattrapage rejouera le verrou. Rien à attendre (plein
        // écran déjà posé, document muet, API absente) : on enchaîne sans
        // passer la main, comme avant.
        const attente = attendrePleinEcran(doc);
        if (attente) await attente;
      }
      if (!active || token !== generation || !needsLandscape) return;
      await verrouillerPaysage(token);
    },
    leave() {
      active = false;
      generation++;
      libererRattrapage();
      // Le paysage n'est rendu qu'à la dernière session : le duel qui se referme
      // sur le menu laisse l'écran en paysage, c'est la route qui le tient.
      let derniere = false;
      if (annonce) {
        annonce = false;
        sessionsOuvertes = Math.max(0, sessionsOuvertes - 1);
        derniere = sessionsOuvertes === 0;
        if (derniere) annoncerPaysage(win, false);
      }
      if (derniere && (ownsOrientation || verrouPris)) {
        try { win.screen.orientation.unlock?.(); } catch { /* already unlocked */ }
      }
      if (derniere) verrouPris = false;
      ownsOrientation = false;
      if (ownsFullscreen) exitNativeFullscreen(doc);
      ownsFullscreen = false;
    },
  };
}
