import { useEffect, useState } from 'react';

/**
 * `useMediaQuery(query)` — true quand la requête média correspond.
 *
 * Utilisé pour basculer l'interface selon la taille d'écran : sur mobile
 * (≤ 760 px, le seuil de la fenêtre sociale) la messagerie s'ouvre sur la
 * page dédiée (`/messages`) plutôt que dans le pop-up. Rend `false` sans
 * DOM (rendu SSR des scripts de vérification) pour garder le comportement
 * « fenêtre » de référence.
 */
export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    try {
      return window.matchMedia(query).matches;
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mql = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);
    setMatches(mql.matches);
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    // Vieux navigateurs (Safari < 14).
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [query]);

  return matches;
}
