/**
 * LA CENDRE — commandes tactiles « manette » (téléphone, application).
 *
 * Layout d'une manette de console, transposé au pouce :
 *
 *   - **à gauche, un stick** : déplacer le chevalier dans la direction du
 *     doigt, par rapport à la caméra (comme ZQSD) ; poussé à fond, il fait
 *     **courir** (l'équivalent de MAJ). Une poussée partielle ralentit le pas
 *     (`stepMovement` normalise la direction, c'est `speedScale` qui porte la
 *     nuance : voir `stickSpeedScale`) ;
 *   - **à droite, les boutons** : FRAPPE (J), LOURDE (K), ROULADE (Espace),
 *     VERROU (Tab), POTION (F), AGIR (E). Ils remplissent exactement la file
 *     d'actions du clavier (`queue` de SoulsWorld) via `TOUCH_QUEUE` : le
 *     moteur n'a pas deux chemins d'entrée, seulement deux périphériques ;
 *   - **glisser sur l'écran** (hors stick et boutons) fait tourner la caméra,
 *     comme la souris capturée (`attachLookPad`).
 *
 * Le module est coupé en deux, comme `mirageTouch.js` :
 *
 *   - la **décision pure** (`stickVector`, `moveFromStick`,
 *     `stickSpeedScale`) : aucun DOM, couverte par `tests/souls-touch.test.js` ;
 *   - le **branchement** (`attachStick`, `attachLookPad`) sur les éléments du
 *     DOM, avec repli Touch Events pour les vieilles WebView.
 */

/** Course du pouce (px) qui vaut « stick à fond ». */
export const STICK_RADIUS = 58;
/** En deçà de cette fraction, le doigt posé ne déplace personne (zone morte). */
export const STICK_DEAD_ZONE = 0.16;
/** À partir de cette fraction, le chevalier court (équivalent de MAJ). */
export const STICK_RUN_AT = 0.82;
/** Vitesse minimale d'une poussée à peine sortie de la zone morte. */
export const STICK_SLOW_WALK = 0.45;
/** Part de la course du stick que parcourt le pommeau (visuel). */
export const KNOB_TRAVEL_RATIO = 0.52;
/** Le doigt est moins précis que la souris : on amplifie le geste de caméra. */
export const TOUCH_LOOK_SENSITIVITY = 1.45;

/**
 * Boutons du pavé droit, dans l'ordre d'affichage (grille de 2 colonnes) :
 * la ROULADE tombe en bas à droite, sous le pouce.
 */
export const PAD_ACTIONS = Object.freeze([
  Object.freeze({ id: 'light', action: 'light', glyph: '⚔', text: 'FRAPPE', aria: 'Attaque légère' }),
  Object.freeze({ id: 'heavy', action: 'heavy', glyph: '⚒', text: 'LOURDE', aria: 'Attaque lourde' }),
  Object.freeze({ id: 'lock', action: 'lock', glyph: '◎', text: 'VERROU', aria: 'Verrouiller la cible' }),
  Object.freeze({ id: 'flask', action: 'flask', glyph: '⚗', text: 'POTION', aria: 'Boire la potion de vie' }),
  Object.freeze({ id: 'rest', action: 'rest', glyph: '✦', text: 'AGIR', aria: 'Interagir : feu de camp, coffre, portail' }),
  Object.freeze({ id: 'dodge', action: 'dodge', glyph: '⟳', text: 'ROULADE', aria: 'Esquiver — roulade à i-frames', big: true }),
]);

/**
 * Correspondance bouton tactile → drapeau de la file d'actions du monde
 * (`queue` de SoulsWorld) : c'est le contrat du moteur, testé.
 */
export const TOUCH_QUEUE = Object.freeze({
  light: 'light',
  heavy: 'heavy',
  dodge: 'dodge',
  lock: 'lock',
  flask: 'flask',
  rest: 'rest',
});

/** Statistiques que l'écran de pause propose de monter (feu de camp). */
export const TOUCH_LEVEL_STATS = Object.freeze(['vit', 'end', 'str']);

/** Vrai sur un écran tactile au pointeur grossier ; ne lève jamais. */
export function isTouchPointer(win = typeof window === 'undefined' ? null : window) {
  if (!win || typeof win.matchMedia !== 'function') return false;
  try {
    return Boolean(win.matchMedia('(pointer: coarse)')?.matches);
  } catch {
    return false;
  }
}

/**
 * Vecteur du stick pour un doigt à `(dx, dy)` du centre de la base (px, `dy`
 * vers le bas comme l'écran). Renvoie `{ x, y, magnitude, run }` :
 *
 *   - `x` ∈ [−1, 1] vers la droite, `y` ∈ [−1, 1] vers l'avant (l'axe de
 *     l'écran est inversé : lever le doigt fait avancer) — **direction
 *     unitaire**, `magnitude` porte la poussée ;
 *   - `magnitude` ∈ [0, 1] : 1 quand le doigt a parcouru `radius` (au-delà, le
 *     vecteur ne grandit plus — le doigt peut sortir de la base sans rien
 *     casser) ;
 *   - `run` : vrai au-delà de `STICK_RUN_AT`, le seuil de course.
 */
export function stickVector(dx, dy, radius = STICK_RADIUS) {
  const x = Number(dx);
  const y = Number(dy);
  const length = Math.hypot(x, y);
  // Coordonnées illisibles (évènement tronqué) ou doigt au centre : personne
  // ne bouge — une valeur douteuse ne doit pas déplacer le chevalier.
  if (!Number.isFinite(length) || length < 1e-6) {
    return { x: 0, y: 0, magnitude: 0, run: false };
  }
  const travel = Math.min(length, radius);
  const magnitude = travel / radius;
  return {
    x: x / length,
    y: y === 0 ? 0 : -y / length,
    magnitude,
    run: magnitude >= STICK_RUN_AT,
  };
}

/**
 * Entrée de déplacement à partir du vecteur du stick : applique la zone morte
 * et ré-échelonne la poussée au-delà (la marche part du bord de la zone morte,
 * pas du centre). Sous la zone morte, personne ne bouge — le doigt posé pour
 * regarder l'écran ne fait pas dériver le chevalier.
 *
 * `x` / `y` restent la **direction unitaire** : c'est `magnitude` qui porte la
 * nuance de vitesse (`stickSpeedScale`), et `run` la course.
 */
export function moveFromStick(vector, options = {}) {
  const deadZone = options.deadZone ?? STICK_DEAD_ZONE;
  const runAt = options.runAt ?? STICK_RUN_AT;
  const magnitude = Math.min(1, Math.max(0, Number(vector?.magnitude) || 0));
  if (magnitude <= deadZone) return { x: 0, y: 0, magnitude: 0, run: false };
  return {
    x: Number(vector.x) || 0,
    y: Number(vector.y) || 0,
    magnitude: (magnitude - deadZone) / (1 - deadZone),
    run: magnitude >= runAt,
  };
}

/**
 * Nuance de vitesse d'une poussée partielle : à peine sortie de la zone morte
 * le chevalier avance doucement (`STICK_SLOW_WALK`), stick à fond il va à sa
 * vitesse pleine. C'est ce facteur que `stepMovement` multiplie à la vitesse.
 */
export function stickSpeedScale(magnitude, options = {}) {
  const floor = options.floor ?? STICK_SLOW_WALK;
  const value = Math.min(1, Math.max(0, Number(magnitude) || 0));
  return floor + (1 - floor) * value;
}

/** Le doigt `id` dans une liste Touch (TouchList ou tableau), ou `undefined`. */
function findTouch(list, id) {
  if (!list) return undefined;
  for (let index = 0; index < list.length; index += 1) {
    if (list[index].identifier === id) return list[index];
  }
  return undefined;
}

/** Coordonnées d'un évènement Pointer ou Touch, ou `null` si inexploitable. */
function pointFrom(event, id) {
  if (typeof event.clientX === 'number' && typeof event.clientY === 'number') {
    return { x: event.clientX, y: event.clientY };
  }
  const touch = (id == null ? undefined : findTouch(event.changedTouches, id) || findTouch(event.touches, id))
    || event.changedTouches?.[0]
    || event.touches?.[0];
  return touch ? { x: touch.clientX, y: touch.clientY } : null;
}

/** Identifiant du doigt qui vient de se poser (les évènements Touch n'en ont pas). */
function idFrom(event) {
  if (event.pointerId != null) return event.pointerId;
  return event.changedTouches?.[0]?.identifier ?? event.touches?.[0]?.identifier ?? 0;
}

/** Nom des évènements et de leurs gestionnaires, Pointer Events ou Touch Events. */
function pointerBinding(element, handlers) {
  const supportsPointer = typeof window !== 'undefined' && typeof window.PointerEvent === 'function';
  const names = supportsPointer
    ? ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']
    : ['touchstart', 'touchmove', 'touchend', 'touchcancel'];
  const list = supportsPointer
    ? [handlers.down, handlers.move, handlers.up, handlers.cancel, handlers.cancel]
    : [handlers.down, handlers.move, handlers.up, handlers.cancel];
  // `pointermove` / `touchmove` restent non passifs : on bloque le défilement
  // même si `touch-action` n'est pas appliqué (vieille WebView).
  const passive = supportsPointer ? [true, false, true, true, true] : [true, false, true, true];
  names.forEach((name, index) => element.addEventListener(name, list[index], { passive: passive[index] }));
  return () => names.forEach((name, index) => element.removeEventListener(name, list[index]));
}

/**
 * Branche un stick sur `element` (la base, dans le DOM).
 *
 * `handlers.move(vector)` reçoit chaque position du doigt (`stickVector`),
 * `handlers.end()` est appelé au relâchement (le stick revient au centre :
 * le chevalier s'arrête). `options.knob` est le pommeau déplacé visuellement
 * — il suit la poussée sans re-rendu React.
 *
 * Un seul doigt pilote le stick : un second posé par accident (la paume) est
 * ignoré jusqu'au relâchement du premier.
 */
export function attachStick(element, handlers = {}, options = {}) {
  if (!element || typeof element.addEventListener !== 'function') return () => {};
  const radius = options.radius ?? STICK_RADIUS;
  const knob = options.knob || null;
  const center = options.center || (() => {
    const rect = element.getBoundingClientRect?.();
    if (!rect) return { x: 0, y: 0 };
    return { x: rect.left + (rect.width || 0) / 2, y: rect.top + (rect.height || 0) / 2 };
  });

  let trackedId = null;

  /** Course visuelle du pommeau : mesurée sur le DOM, sinon une part du rayon. */
  const knobTravel = () => {
    if (options.knobTravel != null) return options.knobTravel;
    const size = element.clientWidth || element.getBoundingClientRect?.().width || 0;
    const knobSize = knob?.offsetWidth || 0;
    if (size > 0 && knobSize > 0) return Math.max(8, (size - knobSize) / 2);
    return radius * KNOB_TRAVEL_RATIO;
  };

  const placeKnob = (vector) => {
    if (!knob) return;
    const travel = knobTravel() * (vector?.magnitude ?? 0);
    const x = (vector?.x ?? 0) * travel;
    const y = (vector?.y ?? 0) * travel;
    knob.style.transform = `translate3d(${x.toFixed(1)}px, ${(-y).toFixed(1)}px, 0)`;
  };

  const centre = () => {
    const point = center();
    return { x: Number(point?.x) || 0, y: Number(point?.y) || 0 };
  };

  const emit = (point) => {
    if (!point) return;
    const origin = centre();
    const vector = stickVector(point.x - origin.x, point.y - origin.y, radius);
    placeKnob(vector);
    handlers.move?.(vector);
    return vector;
  };

  const concerns = (event) => {
    if (trackedId === null) return false;
    if (event.pointerId != null) return event.pointerId === trackedId;
    if (event.changedTouches?.length) return Boolean(findTouch(event.changedTouches, trackedId));
    return idFrom(event) === trackedId;
  };

  const down = (event) => {
    if (trackedId !== null) return;
    const id = idFrom(event);
    const point = pointFrom(event, id);
    if (!point) return;
    trackedId = id;
    if (event.pointerId != null) {
      // La capture garde le suivi même si le doigt sort de la base.
      try { element.setPointerCapture?.(event.pointerId); } catch { /* capture refusée */ }
    }
    emit(point);
  };

  const move = (event) => {
    if (!concerns(event)) return;
    const point = pointFrom(event, trackedId);
    if (!point) return;
    if (event.cancelable) event.preventDefault();
    emit(point);
  };

  /**
   * Relâchement (ou capture perdue) : le stick revient au centre. Un évènement
   * qui désigne un autre doigt est ignoré ; `lostpointercapture` peut arriver
   * sans identifiant — sans capture, le doigt n'est de toute façon plus suivi.
   */
  const stop = (event) => {
    if (trackedId === null) return;
    if (event?.pointerId != null && event.pointerId !== trackedId) return;
    if (event?.changedTouches?.length && !findTouch(event.changedTouches, trackedId)) return;
    if (typeof event?.pointerId === 'number' && element.hasPointerCapture?.(event.pointerId)) {
      try { element.releasePointerCapture(event.pointerId); } catch { /* déjà rendue */ }
    }
    trackedId = null;
    placeKnob({ x: 0, y: 0, magnitude: 0 });
    handlers.end?.();
  };

  const detach = pointerBinding(element, { down, move, up: stop, cancel: stop });
  return () => {
    detach();
    trackedId = null;
  };
}

/**
 * Branche la caméra au doigt sur `element` (le canvas du jeu) : chaque
 * déplacement du doigt est livré en pixels à `onLook(dx, dy)`, à multiplier par
 * la sensibilité de la caméra. La souris est ignorée — elle a son propre
 * pilotage (pointer lock, ou glisser pour regarder) dans `SoulsWorld`.
 */
export function attachLookPad(element, onLook, options = {}) {
  if (!element || typeof element.addEventListener !== 'function' || typeof onLook !== 'function') {
    return () => {};
  }
  let trackedId = null;
  let last = { x: 0, y: 0 };

  const concerns = (event) => {
    if (trackedId === null) return false;
    if (event.pointerId != null) return event.pointerId === trackedId;
    if (event.changedTouches?.length) return Boolean(findTouch(event.changedTouches, trackedId));
    return idFrom(event) === trackedId;
  };

  const down = (event) => {
    if (trackedId !== null || event.pointerType === 'mouse') return;
    const id = idFrom(event);
    const point = pointFrom(event, id);
    if (!point) return;
    trackedId = id;
    last = point;
    if (event.pointerId != null) {
      try { element.setPointerCapture?.(event.pointerId); } catch { /* capture refusée */ }
    }
  };

  const move = (event) => {
    if (!concerns(event)) return;
    const point = pointFrom(event, trackedId);
    if (!point) return;
    if (event.cancelable) event.preventDefault();
    const dx = point.x - last.x;
    const dy = point.y - last.y;
    last = point;
    if (dx || dy) onLook(dx, dy);
  };

  const stop = (event) => {
    if (trackedId === null) return;
    if (event?.pointerId != null && event.pointerId !== trackedId) return;
    if (event?.changedTouches?.length && !findTouch(event.changedTouches, trackedId)) return;
    trackedId = null;
  };

  const detach = pointerBinding(element, { down, move, up: stop, cancel: stop });
  return () => {
    detach();
    trackedId = null;
  };
}
