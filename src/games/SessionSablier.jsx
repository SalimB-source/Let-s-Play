import { useEffect } from 'react';

import { createSessionSablier } from './rpgSessionSablier.js';

/**
 * La session du Sablier — `src/games/SessionSablier.jsx`
 * =====================================================
 * Enveloppe les routes du Sablier (écran d'entrée, menu, mode histoire, atelier
 * de decks, souk, duel) et tient **une** session tant qu'on y est : annonce au
 * pont Android, plein écran à la demande de l'écran.
 *
 * Elle ne touche plus à l'orientation. Le Sablier se joue debout comme couché :
 * la coque portrait du duel vit dans `rpg-portrait.css`, celle du paysage dans
 * `rpg-mobile.css`, et les menus ont leur colonne portrait depuis toujours
 * (`rpg-battle.css`). Aucun écran de rotation, aucune invite : l'appareil fait
 * ce que le joueur lui demande.
 *
 * Ne rend rien de visible : les invites de rotation ont disparu avec le verrou.
 */
export default function SessionSablier({ children, session = createSessionSablier }) {
  useEffect(() => {
    // `fullscreen: false` : le plein écran appartient à l'écran qui le demande
    // dans un geste (le duel). Ici, on ne fait qu'ouvrir la session.
    const s = session();
    Promise.resolve(s.enter({ fullscreen: false })).catch(() => {});
    return () => s.leave();
  }, [session]);

  return children ?? null;
}
