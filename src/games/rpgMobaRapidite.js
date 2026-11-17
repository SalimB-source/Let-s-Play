import { cardById, cardColors, cardHasPrintedType } from './rpgCards.js';

// Les conditions ne dépendent ni d'une voie ni d'une fenêtre de réponse :
// elles se lisent sur tout le plateau, dans tous les modes.
// Dix cartes seulement gardent une Invocation spéciale ici ; les autres
// (Djinns, Vampires, Navires, Sable…) se jouent normalement.
const ennemi = (s) => s === 'joueur' ? 'sorcier' : 'joueur';
const creature = (e) => e && cardById(e.carteId)?.kind !== 'site';
const allies = (d, s) => (d[s]?.creatures ?? []).filter(creature);
const adversaires = (d, s) => (d[ennemi(s)]?.creatures ?? []).filter(creature);
const type = (e, nom) => cardHasPrintedType(e.carteId, nom);
const couleur = (e, nom) => cardColors(cardById(e.carteId)).includes(nom);
const blessee = (e) => e.pv < e.pvMax;
const compteCartes = (d, s, zone, pred) => (d[s]?.[zone] ?? []).filter((id) => pred(cardById(id))).length;
const propre = (texte, condition) => Object.freeze({ texte, condition });

export const MOBA_RAPIDITE_EMBUSCADES = Object.freeze({
  'chacal-du-seuil': propre('L’adversaire contrôle une créature de force 2 ou moins.', (d, s) => adversaires(d, s).some((e) => e.atk <= 2)),
  'bouchra-guerriere-des-cretes': propre('Vous avez une arme dans votre cimetière.', (d, s) => compteCartes(d, s, 'cimetiere', (c) => c?.kind === 'arme') > 0),
  'danseuse-des-ombres-de-dune': propre('L’adversaire contrôle une créature blessée.', (d, s) => adversaires(d, s).some(blessee)),
  'djinn-de-la-fleche-ardente': propre('Vous avez au moins trois Djinns dans votre cimetière.', (d, s) => compteCartes(d, s, 'cimetiere', (c) => c?.typeLine?.includes('Djinn')) >= 3),
  'le-renegat': propre('Une carte Trésor est dans votre cimetière.', (d, s) => compteCartes(d, s, 'cimetiere', (c) => Boolean(c) && cardHasPrintedType(c, 'Trésor')) > 0),
  'ronin-du-soleil-rouge': propre('Vous contrôlez Onna-musha des cendres.', (d, s) => allies(d, s).some((e) => e.carteId === 'onna-musha-des-cendres')),
  'veilleuse-au-corbeau-noir': propre('L’adversaire ne contrôle aucune créature.', (d, s) => adversaires(d, s).length === 0),
  'djinn-des-ailes-de-cendre': propre('L’adversaire contrôle une créature avec Envol.', (d, s) => adversaires(d, s).some((e) => e.envol)),
  'lionne-du-midi-ardent': propre('L’adversaire contrôle une créature Eau et une créature Neige.', (d, s) => adversaires(d, s).some((e) => couleur(e, 'eau')) && adversaires(d, s).some((e) => couleur(e, 'neige'))),
  'le-chasseur-d-ocracoke': propre('L’adversaire contrôle un Pirate ou un Navire.', (d, s) => adversaires(d, s).some((e) => type(e, 'Pirate') || type(e, 'Navire'))),
});

export function rpgMobaConditionRapidite(duel, side, cardId) {
  return Boolean(duel && duel[side] && MOBA_RAPIDITE_EMBUSCADES[cardId]?.condition(duel, side));
}
