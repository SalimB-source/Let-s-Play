const PARALLAX_SELECTOR = '[data-parallax]';

/**
 * Anime les éléments marqués data-parallax au rythme du défilement, sans
 * déclencher de rendu React à chaque frame. `data-parallax` est le facteur
 * de déplacement et `data-parallax-limit` borne l'effet en pixels.
 *
 * Le déplacement est appliqué via la propriété CSS `translate`, qui se
 * compose avec les transforms de survol et les animations déjà présentes.
 */
export function initScrollParallax(root = typeof document !== 'undefined' ? document : null) {
  if (typeof window === 'undefined' || !root?.querySelectorAll) return () => {};

  const elements = new Set(root.querySelectorAll(PARALLAX_SELECTOR));

  const motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let frame = null;
  const lastOffsets = new WeakMap();
  const requestFrame = typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame.bind(window)
    : (callback) => window.setTimeout(callback, 16);
  const cancelFrame = typeof window.cancelAnimationFrame === 'function'
    ? window.cancelAnimationFrame.bind(window)
    : window.clearTimeout.bind(window);

  const clearOffsets = () => {
    elements.forEach((element) => {
      element.style?.removeProperty('--parallax-y');
      lastOffsets.set(element, 0);
    });
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
        elements.delete(element);
        return [element, 0];
      }

      const rect = element.getBoundingClientRect();
      const previousOffset = lastOffsets.get(element) || 0;
      if (rect.bottom <= 0 || rect.top >= viewportHeight) return [element, 0];

      const speed = Number.parseFloat(element.dataset?.parallax);
      const rawLimit = Number.parseFloat(element.dataset?.parallaxLimit);
      const limit = Number.isFinite(rawLimit) && rawLimit >= 0 ? rawLimit : 24;
      if (!Number.isFinite(speed)) return [element, 0];

      // getBoundingClientRect inclut le décalage appliqué à la frame précédente :
      // on le soustrait pour éviter que le mouvement ne se corrige lui-même.
      const distanceFromCenter = rect.top - previousOffset + rect.height / 2 - viewportHeight / 2;
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
    const previousSize = elements.size;
    if (node.matches?.(PARALLAX_SELECTOR)) elements.add(node);
    node.querySelectorAll?.(PARALLAX_SELECTOR).forEach((element) => elements.add(element));
    return elements.size !== previousSize;
  };
  const mutationObserver = typeof MutationObserver === 'undefined'
    ? null
    : new MutationObserver((mutations) => {
      let changed = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          const element = mutation.target;
          if (element.matches?.(PARALLAX_SELECTOR)) {
            elements.add(element);
            changed = true;
          } else if (elements.delete(element)) {
            element.style?.removeProperty('--parallax-y');
            lastOffsets.delete(element);
            changed = true;
          }
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
    attributeFilter: ['data-parallax', 'data-parallax-limit'],
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
    clearOffsets();
  };
}
