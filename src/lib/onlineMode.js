/**
 * Mode en ligne du Sablier et de Mirage — verrouillage réversible.
 * ---------------------------------------------------------------
 * Le mode en ligne (duels PvP, salons Mirage) est désactivé par défaut
 * pour sécuriser le lancement public. Il ne s'active que lorsque la
 * variable d'environnement vaut explicitement "true".
 *
 *   - Côté client : VITE_ONLINE_MODE_ENABLED
 *   - Côté serveur : ONLINE_MODE_ENABLED (Vercel)
 *
 * Le drapeau VITE n'est jamais une protection de sécurité : le serveur
 * reste l'autorité finale (api/sablier-duel.js).
 *
 * Usage :
 *   import { isOnlineModeEnabled, ONLINE_MODE_DISABLED_REASON } from '../lib/onlineMode.js';
 *   if (!isOnlineModeEnabled()) return { ok:false, raison: ONLINE_MODE_DISABLED_REASON }
 */

// Raison retournée par le serveur quand le mode est verrouillé.
// Stable, sans fuite d'information — consommée par l'interface pour afficher "Bientôt disponible".
export const ONLINE_MODE_DISABLED_REASON = 'mode-en-ligne-bientot-disponible';

// Bannière courte pour l'interface (cohérente avec les langues existantes —
// le site est publié en FR, les dictionnaires FR/EN/AR gardent la même clé).
export const ONLINE_MODE_DISABLED_LABEL = 'Bientôt disponible';
export const ONLINE_MODE_DISABLED_LABEL_EN = 'Coming soon';
export const ONLINE_MODE_DISABLED_LABEL_AR = 'قريباً';

export function isOnlineModeEnabled() {
  // Le fallback Node permet d'exécuter les tests des salons activés sans Vite.
  const value = import.meta.env?.VITE_ONLINE_MODE_ENABLED
    ?? (typeof process !== 'undefined' && process.env?.VITE_ONLINE_MODE_ENABLED);
  return value === 'true';
}
