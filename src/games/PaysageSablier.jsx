import { useEffect } from 'react';

import { createRpgLandscapeSession } from './rpgLandscape.js';

/**
 * Le Sablier en paysage — `src/games/PaysageSablier.jsx`
 * =====================================================
 * Enveloppe les routes du Sablier et tient le verrou d'orientation tant qu'on y
 * est : écran d'entrée, menu, mode histoire, atelier de decks, souk, duel.
 *
 * Pourquoi ici et pas dans le duel : la partie verrouillait déjà le paysage,
 * mais elle le rendait en se refermant — retour au menu, l'écran repassait en
 * portrait. Le verrou appartient à la **route** ; le duel en ouvre une session
 * de plus, et le compteur de `rpgLandscape.js` fait que seul le dernier écran
 * quitté rend l'écran à la rotation libre.
 *
 * Ne rend rien : les invites de rotation vivent dans les écrans eux-mêmes (le
 * duel en a une), et une barre posée par-dessus le menu gênerait plus qu'elle
 * n'aiderait.
 */
export default function PaysageSablier({ children, session = createRpgLandscapeSession }) {
  useEffect(() => {
    const paysage = session();
    // `fullscreen: false` : le plein écran appartient à l'écran qui le demande
    // dans un geste (le duel). Ici, on ne fait que réclamer l'orientation —
    // l'APK l'accorde toujours, le navigateur seulement s'il est déjà en plein
    // écran (Chrome refuse `screen.orientation.lock` autrement).
    // `enter` est asynchrone : un échec de verrou n'a rien à faire remonter.
    Promise.resolve(paysage.enter({ fullscreen: false })).catch(() => {});
    return () => paysage.leave();
  }, [session]);

  return children ?? null;
}
