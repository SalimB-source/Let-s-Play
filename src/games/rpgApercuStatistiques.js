import { cardById } from './rpgCards.js';
import { plafondSoinCreature } from './rpgArmure.js';

/** Conserve l'identité de la carte consultée, mais relit ses statistiques sur
 * le champ : une mise à jour PvP ou un effet peut survenir pendant l'aperçu. */
export function actualiserStatsApercu(visuel, duel) {
  if (!visuel?.id || !duel) return visuel;
  const entite = ['joueur', 'sorcier'].flatMap((cote) => duel[cote]?.creatures ?? [])
    .find((item) => item.id === visuel.id && item.carteId === visuel.carteId);
  if (!entite) return visuel;
  const carte = cardById(entite.carteId);
  return { ...visuel, atk: entite.atk, pv: entite.pv,
    poison: entite.poison, brulure: entite.brulure, gelToursRestants: entite.gelToursRestants,
    empecheAttaqueToursRestants: entite.empecheAttaqueToursRestants,
    empecheBlocageToursRestants: entite.empecheBlocageToursRestants,
    blessee: carte?.kind !== 'site' && entite.pv < plafondSoinCreature(entite, entite.pvMax ?? carte?.def ?? entite.pv) };
}
