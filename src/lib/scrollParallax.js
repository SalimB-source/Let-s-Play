const PARALLAX_ATTRIBUTE_SELECTOR = '[data-parallax]';

// Les cartes et blocs sémantiques des pages sont animés sans devoir ajouter
// un attribut dans chacune des dizaines de routes. Les attributs explicites
// restent prioritaires pour régler la vitesse et l'amplitude au cas par cas.
export const AUTO_PARALLAX_SELECTOR = [
  'main section',
  'main article',
  'main header',
  'main aside',
  'main figure',
  'main .wrap',
  'main [class*="card"]',
  'main [class*="panel"]',
  'main [class*="tile"]',
  'main [class*="banner"]',
  'main [class*="feature"]',
  'main [class*="hero"]',
  'main [class*="grid"]',
  'main [class*="head"]',
  'main [class*="cover"]',
  'main [class*="quote"]',
  'main [class*="carousel"]',
  'footer.footer',
].join(', ');

const PARALLAX_TARGET_SELECTOR = `${PARALLAX_ATTRIBUTE_SELECTOR}, [data-scroll-parallax], ${AUTO_PARALLAX_SELECTOR}`;
const PARALLAX_OPT_OUT_SELECTOR = '[data-no-parallax], .mirage-page, .city-rush-page';
const AUTO_PARALLAX_ATTRIBUTE = 'data-scroll-parallax';
const DEFAULT_SPEED = 0.025;
const DEFAULT_LIMIT = 12;

function hasAttribute(element, name) {
  if (typeof element?.hasAttribute === 'function') return element.hasAttribute(name);
  if (name === 'data-parallax') return element?.dataset?.parallax !== undefined;
  return false;
}

function isOptedOut(element) {
  const speed = element?.getAttribute?.('data-parallax') ?? element?.dataset?.parallax;
  return speed === 'off'
    || speed === 'false'
    || hasAttribute(element, 'data-no-parallax')
    || Boolean(element?.closest?.(PARALLAX_OPT_OUT_SELECTOR));
}

function isParallaxTarget(element) {
  if (!element || element.nodeType !== 1 || isOptedOut(element)) return false;
  return hasAttribute(element, 'data-parallax')
    || hasAttribute(element, AUTO_PARALLAX_ATTRIBUTE)
    || Boolean(element.matches?.(AUTO_PARALLAX_SELECTOR));
}

/**
 * Anime les blocs marqués data-parallax et les cartes/sections de toutes les
 * pages, sans déclencher de rendu React à chaque frame. `data-parallax` règle
 * le facteur de déplacement et `data-parallax-limit` le borne en pixels ; les
 * blocs détectés automatiquement reçoivent un mouvement plus discret.
 *
 * Le déplacement utilise la propriété CSS `translate`, qui se compose avec
 * les transforms de survol et les animations déjà présentes. Les zones de jeu
 * plein écran restent exclues pour ne pas déplacer leurs commandes ou canvas.
 */
export function initScrollParallax(root = typeof document !== 'undefined' ? document : null) {
  if (typeof window === 'undefined' || !root?.querySelectorAll) return () => {};

  const elements = new Set();
  const markedByInitializer = new WeakSet();
  const motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let frame = null;
  const lastOffsets = new WeakMap();
  const requestFrame = typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame.bind(window)
    : (callback) => window.setTimeout(callback, 16);
  const cancelFrame = typeof window.cancelAnimationFrame === 'function'
    ? window.cancelAnimationFrame.bind(window)
    : window.clearTimeout.bind(window);

  const removeTarget = (element) => {
    const wasTracked = elements.delete(element);
    if (wasTracked || markedByInitializer.has(element)) {
      element.style?.removeProperty('--parallax-y');
      lastOffsets.delete(element);
    }
    if (markedByInitializer.has(element)) {
      element.removeAttribute?.(AUTO_PARALLAX_ATTRIBUTE);
      markedByInitializer.delete(element);
    }
    return wasTracked;
  };

  const registerTarget = (element) => {
    if (!element || element.nodeType !== 1) return false;
    if (!isParallaxTarget(element)) return removeTarget(element);

    const wasTracked = elements.has(element);
    elements.add(element);
    if (
      !hasAttribute(element, 'data-parallax')
      && !hasAttribute(element, AUTO_PARALLAX_ATTRIBUTE)
      && typeof element.setAttribute === 'function'
    ) {
      // Le marqueur sert uniquement à appliquer la même règle CSS que les
      // éléments réglés à la main ; il n'est pas observé par le MutationObserver.
      element.setAttribute(AUTO_PARALLAX_ATTRIBUTE, '');
      markedByInitializer.add(element);
    }
    return !wasTracked;
  };

  const clearOffsets = () => {
    elements.forEach((element) => {
      element.style?.removeProperty('--parallax-y');
      lastOffsets.set(element, 0);
    });
  };

  const inheritedOffsetOf = (element) => {
    let offset = 0;
    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
      offset += lastOffsets.get(ancestor) || 0;
    }
    return offset;
  };

  const update = () => {
    frame = null;
    if (motionPreference?.matches) {
      clearOffsets();
      return;
    }

    const documentHeight = typeof document !== 'undefined' ? document.documentElement?.clientHeight : 0;
    const viewportHeight = window.innerHeight || documentHeight || 1;
    const offsets = Array.from(elements).map((element) => {
      if (element.isConnected === false) {
        removeTarget(element);
        return [element, 0];
      }

      const rect = element.getBoundingClientRect();
      const previousOffset = lastOffsets.get(element) || 0;
      if (rect.bottom <= 0 || rect.top >= viewportHeight) return [element, 0];

      const explicitSpeed = hasAttribute(element, 'data-parallax');
      const speed = explicitSpeed
        ? Number.parseFloat(element.dataset?.parallax)
        : DEFAULT_SPEED;
      const rawLimit = Number.parseFloat(element.dataset?.parallaxLimit);
      const fallbackLimit = explicitSpeed ? 24 : DEFAULT_LIMIT;
      const limit = Number.isFinite(rawLimit) && rawLimit >= 0 ? rawLimit : fallbackLimit;
      if (!Number.isFinite(speed)) return [element, 0];

      // getBoundingClientRect inclut les décalages déjà appliqués à l'élément
      // et à ses parents ; on les soustrait pour éviter qu'ils n'influencent le
      // calcul du prochain mouvement.
      const distanceFromCenter = rect.top
        - previousOffset
        - inheritedOffsetOf(element)
        + rect.height / 2
        - viewportHeight / 2;
      const offset = Math.max(-limit, Math.min(limit, -distanceFromCenter * speed));
      return [element, offset];
    });

    // Toutes les mesures sont faites avant les écritures pour éviter les
    // alternances lecture/écriture qui provoquent du layout thrashing.
    offsets.forEach(([element, offset]) => {
      if (element.isConnected === false) return;
      element.style?.setProperty('--parallax-y', `${offset.toFixed(1)}px`);
      lastOffsets.set(element, offset);
    });
  };

  const schedule = () => {
    if (motionPreference?.matches || frame !== null) return;
    frame = requestFrame(update);
  };

  const onMotionPreferenceChange = (event) => {
    if (event.matches) {
      if (frame !== null) cancelFrame(frame);
      frame = null;
      clearOffsets();
    } else {
      schedule();
    }
  };

  const collectParallaxElements = (node) => {
    if (node?.nodeType !== 1) return false;
    let changed = registerTarget(node);
    node.querySelectorAll?.(PARALLAX_TARGET_SELECTOR).forEach((element) => {
      if (registerTarget(element)) changed = true;
    });
    return changed;
  };

  root.querySelectorAll(PARALLAX_TARGET_SELECTOR).forEach(registerTarget);

  const mutationObserver = typeof MutationObserver === 'undefined'
    ? null
    : new MutationObserver((mutations) => {
      let changed = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          const element = mutation.target;
          const wasTracked = elements.has(element);
          registerTarget(element);
          if (wasTracked || elements.has(element)) changed = true;
          return;
        }
        mutation.addedNodes.forEach((node) => {
          if (collectParallaxElements(node)) changed = true;
        });
      });
      if (changed) schedule();
    });

  mutationObserver?.observe(root.documentElement || root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-parallax', 'data-parallax-limit', 'data-no-parallax', 'class'],
  });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  if (motionPreference?.addEventListener) {
    motionPreference.addEventListener('change', onMotionPreferenceChange);
  } else {
    motionPreference?.addListener?.(onMotionPreferenceChange);
  }
  schedule();

  return () => {
    mutationObserver?.disconnect();
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    if (motionPreference?.removeEventListener) {
      motionPreference.removeEventListener('change', onMotionPreferenceChange);
    } else {
      motionPreference?.removeListener?.(onMotionPreferenceChange);
    }
    if (frame !== null) cancelFrame(frame);
    elements.forEach(removeTarget);
  };
}
