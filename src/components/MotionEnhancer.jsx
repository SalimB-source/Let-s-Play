import { useLayoutEffect } from 'react';

/**
 * Active les révélations au défilement seulement si le navigateur les prend en
 * charge et si l’utilisateur n’a pas demandé moins de mouvement. Sans ces
 * API, le contenu reste entièrement visible.
 */
export default function MotionEnhancer() {
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (
      !('IntersectionObserver' in window)
      || !('MutationObserver' in window)
      || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) return undefined;

    const root = document.documentElement;
    const observed = new WeakSet();
    const revealObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-revealed');
        revealObserver.unobserve(entry.target);
      }
    }, { threshold: 0, rootMargin: '0px 0px -48px 0px' });

    function observeRevealElements(node) {
      if (!(node instanceof Element)) return;
      const elements = [];
      if (node.matches('[data-reveal]')) elements.push(node);
      elements.push(...node.querySelectorAll('[data-reveal]'));

      for (const element of elements) {
        if (observed.has(element)) continue;
        observed.add(element);
        const bounds = element.getBoundingClientRect();
        if (bounds.top < window.innerHeight && bounds.bottom > 0) {
          element.classList.add('is-revealed');
        } else {
          revealObserver.observe(element);
        }
      }
    }

    // Enregistrer les éléments avant d’activer la règle qui les masque : ceux
    // déjà visibles au chargement ne clignotent jamais.
    observeRevealElements(document.body);
    root.classList.add('motion-ready');

    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) observeRevealElements(node);
        for (const node of record.removedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches('[data-reveal]')) revealObserver.unobserve(node);
          node.querySelectorAll('[data-reveal]').forEach((element) => revealObserver.unobserve(element));
        }
      }
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      revealObserver.disconnect();
      root.classList.remove('motion-ready');
    };
  }, []);

  return null;
}
