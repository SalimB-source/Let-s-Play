/**
 * Le son d'une arrivée de créature — et **le moment** où il part.
 *
 * Deux temps, deux règles :
 *
 *  1. **le souffle de l'élément** (`sonArriveeElement`) : le tonnerre du
 *     marteau, sinon le feu de Braise, sinon l'eau. C'est le son de l'effet,
 *     pas celui de la carte ;
 *  2. **le moment** : une arrivée qui *désigne* encore sa cible
 *     (`arriveeCiblePortee`, moteur) ne sonne pas à la pose. La Tour de Braise
 *     n'inflige son dégât qu'au clic qui désigne la créature : faire brûler la
 *     table au moment où la carte se pose promettait une blessure qui n'avait
 *     pas encore de victime — et le joueur pouvait encore renoncer à la
 *     désignation. Le souffle part donc avec l'effet (`sonArriveeALaDesignation`).
 *
 * Une arrivée qui se résout seule — soin, pioche, jetons, dégâts de zone —
 * garde son son à la pose : elle n'attend personne.
 */
import { rpgFoudreSoundFor } from './rpgFoudreAudio.js';
import { rpgFireSoundFor } from './rpgFireAudio.js';

/** Le souffle de l'élément d'une arrivée, `null` si la carte n'en a pas. */
export function sonArriveeElement(carte) {
  return rpgFoudreSoundFor(carte, 'arrival')
    ?? rpgFireSoundFor(carte, 'arrival')
    ?? null;
}

/**
 * Ce que la pose fait entendre : le souffle de l'élément, **sauf** quand une
 * cible reste à désigner (`arriveeEnAttente`) — le son attend alors l'effet.
 */
export function sonArriveeAuPose(carte, { arriveeEnAttente = false } = {}) {
  if (arriveeEnAttente) return null;
  return sonArriveeElement(carte);
}

/**
 * Ce que la désignation fait entendre, une fois la victime choisie : le
 * souffle de l'élément, le retour en main d'un renvoi, ou le simple clic de
 * sélection quand l'arrivée n'a pas de son propre.
 */
export function sonArriveeALaDesignation(carte) {
  if (carte?.arrivee?.type === 'retour-main') return 'creature_return';
  return sonArriveeElement(carte) ?? 'select';
}
