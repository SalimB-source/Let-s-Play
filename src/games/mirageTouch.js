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
 *   - **un geste change d'UNE seule voie** : le changement part dès que le
 *     doigt a parcouru `SWIPE_MIN_DISTANCE` (pendant le mouvement, sans
 *     attendre le relâchement : aucune latence), puis la suite du glissement —
 *     même très longue, même en revenant en arrière — ne change plus rien.
 *     Pour passer une autre voie, on relève le doigt et on glisse de nouveau :
 *     aucun délai à attendre, le geste suivant est lu tout de suite. Sur la
 *     piste à trois voies du téléphone, un seul coup de doigt ne peut donc
 *     plus traverser d'un bord à l'autre ;
 *   - **le saut en diagonale a disparu** : un geste ne produit qu'UNE action,
 *     soit une voie, soit un saut — jamais les deux. Sur une diagonale, c'est
 *     l'axe dominant (le plus loin au-delà de son seuil) qui gagne ; un geste
 *     qui a déjà changé de voie ne fait plus sauter, et inversement. Le moteur
 *     suit la même règle : les commandes de mouvement sont bloquées pendant le
 *     saut (`playerLaneAfterAction` de mirageRules), le cheval retombe donc
 *     toujours dans la voie où il a décollé.
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

/**
 * Distance horizontale (px) qui déclenche le changement de voie. Mesurée au
 * pouce : 22 px ≈ 4 mm sur un téléphone de 390 pt, soit un petit coup de doigt
 * — la glissade répond sans qu'on ait à « tirer » sur l'écran. C'est aussi la
 * seule distance horizontale qui compte : un geste ne change qu'une voie, le
 * reste du trajet n'a plus d'effet.
 */
export const SWIPE_MIN_DISTANCE = 22;
/** Distance verticale (px) vers le haut qui déclenche le saut. */
export const SWIPE_JUMP_DISTANCE = 20;
/** Au-delà de cette amplitude, un appui n'est plus une tape mais un glissement. */
export const TAP_MAX_DISTANCE = 14;
/** Durée maximale (ms) d'une tape qui saute (320 : une tape de pouce ordinaire). */
export const TAP_MAX_DURATION = 320;

/** Horloge du geste : `at` s'il est exploitable, sinon l'horloge système. */
function clockAt(at) {
  return Number.isFinite(at) ? at : Date.now();
}

/**
 * Suivi d'un geste, en coordonnées d'écran (clientX/clientY, y vers le bas).
 * `begin()` ouvre le geste, `sample()` est appelé à chaque mouvement, `end()`
 * au relâchement (le dernier échantillon compte : un geste très bref peut ne
 * livrer qu'un seul `move`, voire aucun).
 *
 * Un geste produit au plus **une** action — `left`, `right` **ou** `jump` —
 * quel que soit le nombre d'échantillons reçus ou la distance parcourue : c'est
 * ce qui empêche un coup de doigt de traverser deux voies d'un coup, et ce qui
 * supprime le saut en diagonale (voie + saut dans le même geste). L'action part
 * dès le premier échantillon qui franchit un seuil (aucune attente du
 * relâchement, aucun délai de recharge) ; la suivante part avec le geste
 * suivant, lu immédiatement lui aussi.
 */
export function createSwipeTracker(options = {}) {
  const minDistance = options.minDistance ?? SWIPE_MIN_DISTANCE;
  const jumpDistance = options.jumpDistance ?? SWIPE_JUMP_DISTANCE;
  const tapToJump = options.tapToJump ?? true;
  const tapMaxDistance = options.tapMaxDistance ?? TAP_MAX_DISTANCE;
  const tapMaxDuration = options.tapMaxDuration ?? TAP_MAX_DURATION;

  let tracking = false;
  let startX = 0;
  let startY = 0;
  let startedAt = 0;
  // Une action est déjà partie dans ce geste : plus rien d'autre ne suivra
  // (ni seconde voie, ni saut en diagonale). Sert aussi à refuser la tape.
  let firedAny = false;

  const begin = (x, y, at) => {
    tracking = true;
    startX = x;
    startY = y;
    startedAt = clockAt(at);
    firedAny = false;
    return [];
  };

  const sample = (x, y) => {
    if (!tracking || !Number.isFinite(x) || !Number.isFinite(y)) return [];
    // Un geste = une action : dès qu'une voie ou un saut est parti, le doigt
    // peut aller aussi loin qu'il veut (ou revenir en arrière, rebond du
    // relâchement compris) sans rien déclencher de plus.
    if (firedAny) return [];
    const travelled = x - startX;
    const climbed = startY - y;
    // Les seuils se mesurent depuis le point de départ du geste.
    const laneReady = Math.abs(travelled) >= minDistance;
    const jumpReady = climbed >= jumpDistance;
    if (!laneReady && !jumpReady) return [];
    // Diagonale (ou geste très rapide lu en un seul échantillon) : les deux
    // seuils sont franchis à la fois — l'axe le plus engagé l'emporte, jamais
    // les deux. À égalité, la voie gagne : c'est le geste le plus fréquent.
    const wantsJump = jumpReady
      && (!laneReady || climbed / jumpDistance > Math.abs(travelled) / minDistance);
    firedAny = true;
    // Un seul saut par geste ; à l'atterrissage, le moteur garde la fenêtre
    // courte de `jumpBuffer` (MirageWorld) pour ne pas perdre une tape faite
    // juste avant de toucher le sol.
    return [wantsJump ? 'jump' : (travelled > 0 ? 'right' : 'left')];
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

/** Le doigt `id` dans une liste Touch (TouchList ou tableau), ou `undefined`. */
function findTouch(list, id) {
  if (!list) return undefined;
  for (let index = 0; index < list.length; index += 1) {
    if (list[index].identifier === id) return list[index];
  }
  return undefined;
}

/**
 * Coordonnées d'un événement Pointer ou Touch, ou `null` si inexploitable.
 * Avec des événements Touch, plusieurs doigts peuvent être posés : on lit celui
 * qu'on suit (`id`) — jamais `touches[0]`, qui peut être un autre doigt, surtout
 * au relâchement du premier — sinon la position d'un voisin ferait partir un
 * changement de voie qu'aucun geste n'a demandé.
 */
function pointFrom(event, id) {
  if (typeof event.clientX === 'number' && typeof event.clientY === 'number') {
    return { x: event.clientX, y: event.clientY };
  }
  const touch = (id == null ? undefined : findTouch(event.changedTouches, id) || findTouch(event.touches, id))
    || event.changedTouches?.[0]
    || event.touches?.[0];
  return touch ? { x: touch.clientX, y: touch.clientY } : null;
}

/** Identifiant du doigt qui vient de se poser (les événements Touch n'ont pas de pointerId). */
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

  // L'événement concerne-t-il le doigt suivi ? Un `touchmove` peut annoncer
  // plusieurs doigts à la fois : le nôtre n'est pas forcément le premier.
  const concernsTracked = (event) => {
    if (trackedId === null) return false;
    if (event.pointerId != null) return event.pointerId === trackedId;
    if (event.changedTouches?.length) return Boolean(findTouch(event.changedTouches, trackedId));
    return idFrom(event) === trackedId;
  };

  const start = (event) => {
    // Un seul doigt pilote le cheval : un second posé par accident (la paume,
    // un autre joueur) est ignoré jusqu'au relâchement du premier. C'est aussi
    // ce qui garantit qu'à deux doigts, une seule voie change à la fois.
    if (trackedId !== null) return;
    const id = idFrom(event);
    const point = pointFrom(event, id);
    if (!point) return;
    trackedId = id;
    tracker.begin(point.x, point.y, event.timeStamp);
    if (supportsPointer && event.pointerId != null) {
      // La capture garde le suivi même si le doigt sort du canvas en glissant.
      try { element.setPointerCapture?.(event.pointerId); } catch { /* capture refusée */ }
    }
  };

  const move = (event) => {
    if (!concernsTracked(event)) return;
    const point = pointFrom(event, trackedId);
    if (!point) return;
    if (event.cancelable) event.preventDefault();
    emit(tracker.sample(point.x, point.y));
  };

  const finish = (event) => {
    if (!concernsTracked(event)) return;
    const point = pointFrom(event, trackedId);
    release();
    trackedId = null;
    // La tape qui saute reste un geste du pouce : un clic de souris sur la
    // piste ne doit pas faire bondir le cheval à l'improviste.
    emit(tracker.end(point?.x, point?.y, event.timeStamp, event.pointerType !== 'mouse'));
  };

  const abort = (event) => {
    if (trackedId === null || (event && !concernsTracked(event))) return;
    release();
    trackedId = null;
    tracker.cancel();
  };

  // `lostpointercapture` referme le geste quand le navigateur reprend la main
  // (appel entrant, geste système, capture volée) : sans lui, un doigt dont le
  // relâchement n'est jamais livré garderait `trackedId` occupé et **toutes**
  // les glissades suivantes seraient ignorées — le jeu paraîtrait bloqué.
  const names = supportsPointer
    ? ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']
    : ['touchstart', 'touchmove', 'touchend', 'touchcancel'];
  const handlers = supportsPointer
    ? [start, move, finish, abort, abort]
    : [start, move, finish, abort];
  // `pointermove` / `touchmove` restent non passifs pour pouvoir bloquer le
  // défilement si `touch-action` n'est pas appliqué (vieux WebView).
  const passive = [true, false, true, true, true];
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
