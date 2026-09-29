import { PHONE_LAYOUT_MEDIA, isAndroidApp } from '../lib/phoneLayout';

/**
 * `racePopup` — « la course s'ouvre-t-elle en pop-up ? »
 *
 * Sur téléphone, sur tablette et dans l'app Android, une manche de Mirage Rush
 * (Ruée, Duel) ne se joue plus au milieu de la page : la fenêtre de jeu est
 * décollée en plein écran par-dessus le reste (`position: fixed`, voir
 * `.mirage-page.is-race-popup` dans `mirage-rush.css`) et le défilement est gelé
 * (`usePageScrollLock`). Un balayage du doigt pour esquiver — ou une main posée
 * sur l'écran — ne fait donc plus défiler l'arrière-plan.
 *
 * Trois signaux, dans l'esprit de `src/lib/phoneLayout.js` :
 *   — appareil tactile (`hover:none` + `pointer:coarse`) : téléphone en paysage
 *     et tablette compris, là où le geste peut justement faire défiler ;
 *   — mise en page téléphone (`PHONE_LAYOUT_MEDIA` : fenêtre étroite, ou écran
 *     de téléphone dont le zoom de page a élargi la fenêtre) ;
 *   — app Android, où `MainActivity` injecte le pont `LetsPlayAndroid` : la
 *     WebView peut être large (paysage) et le pouce reste un doigt.
 *
 * L'intro — le choix de la course — reste dans la page : ce sont bien les
 * manches (décompte, partie, pause, arrivée) qui s'ouvrent en pop-up, et la
 * page retrouve sa place, intacte, à la fermeture.
 */

/** Requête média : tactile, ou mise en page téléphone. */
export const RACE_POPUP_MEDIA = `(hover:none) and (pointer:coarse), ${PHONE_LAYOUT_MEDIA}`;

/** Phases de la manche : tout sauf l'intro, qui vit dans la page. */
export const RACE_POPUP_PHASES = ['countdown', 'playing', 'paused', 'finished'];

/**
 * Décision pure. `popupLayout` vient de `racePopupLayout()`, `phase` de l'état
 * de `MirageRushPage` — l'intro reste en place, tout le reste s'ouvre en
 * pop-up là où la machine le demande.
 */
export function racePopupOpen(phase, popupLayout) {
  return Boolean(popupLayout) && RACE_POPUP_PHASES.includes(phase);
}

/**
 * Faut-il ouvrir les courses en pop-up sur cette machine ? `touchLike` couvre
 * le tactile et la mise en page téléphone (résultat de `RACE_POPUP_MEDIA`),
 * `app` l'app Android.
 */
export function racePopupLayout(touchLike, app = isAndroidApp()) {
  return Boolean(touchLike || app);
}
