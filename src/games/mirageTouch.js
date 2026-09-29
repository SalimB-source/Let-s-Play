/**
 * Commandes tactiles « instinctives » de Mirage Rush.
 *
 * Le cheval galope tout seul : sur téléphone, le joueur n'a plus qu'à glisser
 * le doigt sur la piste.
 *
 *   - glisser vers la gauche  → voie de gauche ;
 *   - glisser vers la droite  → voie de droite ;
 *   - glisser vers le haut    → saut ;
 *   - taper (appui bref sans bouger) → saut ;
 *   - garder le doigt posé et continuer à glisser enchaîne les changements de
 *     voie (le doigt pilote le cheval comme un petit joystick) : le geste est
 *     lu pendant le mouvement, pas seulement au relâchement ;
 *   - une diagonale haut + côté fait les deux (le changement de voie part
 *     avant le saut, sinon il serait avalé par le blocage des voies en l'air).
 *
 * Le module est volontairement coupé en trois :
 *
 *   - `createSwipeTracker()` : la décision pure « un déplacement donne quelles
 *     actions », sans aucun DOM — c'est elle que couvre
 *     `tests/mirage-touch.test.js` ;
 *   - `attachSwipeControls()` : le branchement sur un élément (Pointer Events,
 *     avec repli Touch Events pour les vieux WebView) ;
 *   - `createSwipeFeedback()` : le retour visuel (flèche qui part dans le sens
 *     du geste + rappel des commandes en début de course).
 *
 * Les actions renvoyées (`left`, `right`, `jump`) sont exactement celles
 * attendues par `world.action()` et `playerLaneAfterAction()` de mirageRules.
 */

/** Distance horizontale (px) qui déclenche le premier changement de voie. */
export const SWIPE_MIN_DISTANCE = 34;
/**
 * Distance horizontale (px) entre deux changements de voie d'un même
 * glissement. Plus longue que la première : un geste diagonal ne doit pas
 * traverser trois voies d'un coup, alors qu'un petit coup de doigt doit se
 * sentir immédiatement.
 */
export const SWIPE_REPEAT_DISTANCE = 60;
/** Distance verticale (px) vers le haut qui déclenche le saut. */
export const SWIPE_JUMP_DISTANCE = 30;
/** Au-delà de cette amplitude, un appui n'est plus une tape mais un glissement. */
export const TAP_MAX_DISTANCE = 14;
/** Durée maximale (ms) d'une tape qui saute. */
export const TAP_MAX_DURATION = 280;
/**
 * Garde-fou : un navigateur peut livrer des `pointermove` groupés après un
 * geste très rapide. On borne le nombre d'actions produites par échantillon
 * pour qu'un seul mouvement ne vide pas toute la piste.
 */
const MAX_ACTIONS_PER_SAMPLE = 4;

/** Horloge du geste : `at` s'il est exploitable, sinon l'horloge système. */
function clockAt(at) {
  return Number.isFinite(at) ? at : Date.now();
}

/**
 * Suivi d'un geste, en coordonnées d'écran (clientX/clientY, y vers le bas).
 * `begin()` ouvre le geste, `sample()` est appelé à chaque mouvement, `end()`
 * au relâchement (le dernier échantillon compte : un geste très bref peut ne
 * livrer qu'un seul `move`, voire aucun).
 */
export function createSwipeTracker(options = {}) {
  const minDistance = options.minDistance ?? SWIPE_MIN_DISTANCE;
  const repeatDistance = options.repeatDistance ?? SWIPE_REPEAT_DISTANCE;
  const jumpDistance = options.jumpDistance ?? SWIPE_JUMP_DISTANCE;
  const tapToJump = options.tapToJump ?? true;
  const tapMaxDistance = options.tapMaxDistance ?? TAP_MAX_DISTANCE;
  const tapMaxDuration = options.tapMaxDuration ?? TAP_MAX_DURATION;

  let tracking = false;
  let startX = 0;
  let startY = 0;
  let startedAt = 0;
  let anchorX = 0;
  let laneChanges = 0;
  let jumpFired = false;
  let firedAny = false;

  const begin = (x, y, at) => {
    tracking = true;
    startX = x;
    startY = y;
    startedAt = clockAt(at);
    anchorX = x;
    laneChanges = 0;
    jumpFired = false;
    firedAny = false;
    return [];
  };

  const sample = (x, y) => {
    if (!tracking || !Number.isFinite(x) || !Number.isFinite(y)) return [];
    const actions = [];
    // Un doigt qui tremble ne doit pas faire zigzaguer le cheval : l'ancre
    // n'avance qu'au moment où une voie est vraiment changée.
    let travelled = x - anchorX;
    while (actions.length < MAX_ACTIONS_PER_SAMPLE) {
      const threshold = laneChanges === 0 ? minDistance : repeatDistance;
      if (Math.abs(travelled) < threshold) break;
      actions.push(travelled > 0 ? 'right' : 'left');
      anchorX += travelled > 0 ? threshold : -threshold;
      travelled = x - anchorX;
      laneChanges += 1;
    }
    // Le saut ne part qu'une fois par geste : en l'air, les voies sont de toute
    // façon verrouillées (voir `playerLaneAfterAction`).
    if (!jumpFired && startY - y >= jumpDistance) {
      actions.push('jump');
      jumpFired = true;
    }
    if (actions.length > 0) firedAny = true;
    return actions;
  };

  /** `allowTap` laisse l'appelant refuser la tape (souris, par exemple). */
  const end = (x, y, at, allowTap = true) => {
    if (!tracking) return [];
    const actions = sample(x, y);
    tracking = false;
    if (firedAny || !tapToJump || !allowTap) return actions;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return actions;
    const brief = clockAt(at) - startedAt <= tapMaxDuration;
    const still = Math.abs(x - startX) <= tapMaxDistance && Math.abs(y - startY) <= tapMaxDistance;
    return brief && still ? ['jump'] : actions;
  };

  const cancel = () => {
    tracking = false;
  };

  return {
    begin,
    sample,
    end,
    cancel,
    isTracking: () => tracking,
  };
}

/** Coordonnées d'un événement Pointer ou Touch, ou `null` si inexploitable. */
function pointFrom(event) {
  if (typeof event.clientX === 'number' && typeof event.clientY === 'number') {
    return { x: event.clientX, y: event.clientY };
  }
  const touch = event.touches?.[0] || event.changedTouches?.[0];
  return touch ? { x: touch.clientX, y: touch.clientY } : null;
}

/** Identifiant du doigt suivi (les événements Touch n'ont pas de pointerId). */
function idFrom(event) {
  if (event.pointerId != null) return event.pointerId;
  return event.changedTouches?.[0]?.identifier ?? event.touches?.[0]?.identifier ?? 0;
}

/**
 * Branche les gestes de glissement sur `element` (le canvas du jeu).
 * Retourne la fonction qui détache tous les écouteurs.
 *
 * `onAction(name)` reçoit `left`, `right` ou `jump` ; `onGesture(name)`
 * (facultatif) est appelé juste avant, pour le retour visuel.
 *
 * Le défilement de la page est neutralisé par `touch-action: none` sur le
 * canvas (voir mirage-rush.css) : sans lui, un glissement vertical ferait
 * défiler le site au lieu de faire sauter le cheval.
 */
export function attachSwipeControls(element, onAction, options = {}) {
  if (!element || typeof element.addEventListener !== 'function' || typeof onAction !== 'function') {
    return () => {};
  }
  const tracker = createSwipeTracker(options);
  const onGesture = options.onGesture;
  const supportsPointer = typeof window !== 'undefined' && typeof window.PointerEvent === 'function';
  let trackedId = null;

  const emit = (actions) => {
    for (const name of actions) {
      if (onGesture) onGesture(name);
      onAction(name);
    }
  };

  const release = () => {
    if (!supportsPointer || trackedId === null) return;
    try {
      if (element.hasPointerCapture?.(trackedId)) element.releasePointerCapture(trackedId);
    } catch { /* le navigateur a déjà lâché la capture */ }
  };

  const start = (event) => {
    // Un seul doigt pilote le cheval : un second posé par accident (la paume,
    // un autre joueur) est ignoré jusqu'au relâchement du premier.
    if (trackedId !== null) return;
    const point = pointFrom(event);
    if (!point) return;
    trackedId = idFrom(event);
    tracker.begin(point.x, point.y, event.timeStamp);
    if (supportsPointer && event.pointerId != null) {
      // La capture garde le suivi même si le doigt sort du canvas en glissant.
      try { element.setPointerCapture?.(event.pointerId); } catch { /* capture refusée */ }
    }
  };

  const move = (event) => {
    if (trackedId === null || idFrom(event) !== trackedId) return;
    const point = pointFrom(event);
    if (!point) return;
    if (event.cancelable) event.preventDefault();
    emit(tracker.sample(point.x, point.y));
  };

  const finish = (event) => {
    if (trackedId === null || idFrom(event) !== trackedId) return;
    const point = pointFrom(event);
    release();
    trackedId = null;
    // La tape qui saute reste un geste du pouce : un clic de souris sur la
    // piste ne doit pas faire bondir le cheval à l'improviste.
    emit(tracker.end(point?.x, point?.y, event.timeStamp, event.pointerType !== 'mouse'));
  };

  const abort = (event) => {
    if (trackedId === null || (event && idFrom(event) !== trackedId)) return;
    release();
    trackedId = null;
    tracker.cancel();
  };

  const names = supportsPointer
    ? ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']
    : ['touchstart', 'touchmove', 'touchend', 'touchcancel'];
  const handlers = [start, move, finish, abort];
  // `pointermove` / `touchmove` restent non passifs pour pouvoir bloquer le
  // défilement si `touch-action` n'est pas appliqué (vieux WebView).
  const passive = [true, false, true, true];
  names.forEach((name, index) => element.addEventListener(name, handlers[index], { passive: passive[index] }));

  return () => {
    names.forEach((name, index) => element.removeEventListener(name, handlers[index]));
    abort();
  };
}

/**
 * Retour visuel des gestes, posé dans le même conteneur que le canvas :
 * - `pulse(action)` : une flèche part dans le sens du geste ;
 * - `showHint()` / `hideHint()` : la pastille « GLISSE ← → … », affichée au
 *   départ d'une course puis effacée dès que le joueur a compris (ou après
 *   quelques secondes). Elle porte la classe `mirage-swipe-hint` du reste de
 *   l'interface, et le CSS ne l'affiche que sur écran tactile.
 */
export function createSwipeFeedback(mount, options = {}) {
  if (!mount || typeof document === 'undefined') {
    return { pulse() {}, showHint() {}, hideHint() {}, destroy() {} };
  }
  const hintText = options.hint || 'GLISSE ← → POUR ESQUIVER · ↑ OU TAPE POUR SAUTER';
  const hintTimeout = options.hintTimeout ?? 6000;
  const hintGestures = options.hintGestures ?? 3;

  const layer = document.createElement('div');
  layer.className = 'mirage-touch-layer';
  layer.setAttribute('aria-hidden', 'true');

  const pulse = document.createElement('span');
  pulse.className = 'mirage-touch-pulse';

  const hint = document.createElement('span');
  hint.className = 'mirage-swipe-hint';
  hint.textContent = hintText;

  layer.append(pulse, hint);
  mount.append(layer);

  let timer = 0;
  let gestures = 0;

  const hideHint = () => {
    if (timer) { clearTimeout(timer); timer = 0; }
    hint.classList.remove('is-on');
  };

  return {
    pulse(action) {
      pulse.dataset.action = action;
      pulse.textContent = action === 'jump' ? '↑' : action === 'left' ? '←' : '→';
      // Relancer l'animation : deux gestes identiques à la suite ne rejouent
      // pas une animation tant que la classe ne disparaît pas d'abord.
      pulse.classList.remove('is-live');
      void pulse.offsetWidth;
      pulse.classList.add('is-live');
      gestures += 1;
      if (gestures >= hintGestures) hideHint();
    },
    showHint() {
      gestures = 0;
      hint.classList.add('is-on');
      if (timer) clearTimeout(timer);
      timer = setTimeout(hideHint, hintTimeout);
    },
    hideHint,
    destroy() {
      hideHint();
      layer.remove();
    },
  };
}
