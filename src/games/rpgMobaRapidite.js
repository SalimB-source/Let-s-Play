import { cardById, cardColors, cardHasPrintedType } from './rpgCards.js';

// Les conditions ne dépendent ni d'une voie ni d'une fenêtre de réponse :
// elles se lisent sur tout le plateau, dans tous les modes.
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
  'messagere-des-cendres': propre('Vous contrôlez un Vampire indemne.', (d, s) => allies(d, s).some((e) => type(e, 'Vampire') && !blessee(e))),
  'cavalier-des-deux-sabres': propre('Vous contrôlez un Samouraï équipé d’une arme.', (d, s) => allies(d, s).some((e) => type(e, 'Samouraï') && (e.arme || e.armes?.length))),
  'ronin-du-soleil-rouge': propre('Vous contrôlez un Samouraï blessé.', (d, s) => allies(d, s).some((e) => type(e, 'Samouraï') && blessee(e))),
  'chacal-du-seuil': propre('L’adversaire contrôle une créature de force 2 ou moins.', (d, s) => adversaires(d, s).some((e) => e.atk <= 2)),
  'lionne-du-midi-ardent': propre('Vous contrôlez une créature blessée et l’adversaire une créature de force 3 ou plus.', (d, s) => allies(d, s).some(blessee) && adversaires(d, s).some((e) => e.atk >= 3)),
  'seigneur-des-machoires': propre('Vous contrôlez deux créatures blessées et l’adversaire une créature de force 4 ou plus.', (d, s) => allies(d, s).filter(blessee).length >= 2 && adversaires(d, s).some((e) => e.atk >= 4)),
  'cotre-de-course': propre('Vous contrôlez un autre Navire.', (d, s) => allies(d, s).some((e) => type(e, 'Navire'))),
  'le-renegat': propre('Vous contrôlez un Navire et l’adversaire contrôle une créature.', (d, s) => allies(d, s).some((e) => type(e, 'Navire')) && adversaires(d, s).length > 0),
  'le-chasseur-d-ocracoke': propre('Vous contrôlez un Navire et l’adversaire un Pirate ou une créature avec Abordage ou Butin.', (d, s) => allies(d, s).some((e) => type(e, 'Navire')) && adversaires(d, s).some((e) => { const c = cardById(e.carteId); return type(e, 'Pirate') || Number.isFinite(c?.abordage) || Boolean(c?.butin); })),
  'fennec-des-decombres': propre('L’adversaire contrôle une créature blessée.', (d, s) => adversaires(d, s).some(blessee)),
  'gerboise-des-ruines': propre('L’adversaire contrôle au moins deux créatures et vous avez au moins deux créatures en main.', (d, s) => adversaires(d, s).length >= 2 && compteCartes(d, s, 'main', (c) => ['creature', 'hero'].includes(c?.kind)) >= 2),
  'bouchra-guerriere-des-cretes': propre('Vous contrôlez une créature Sable blessée et avez une arme au cimetière.', (d, s) => allies(d, s).some((e) => couleur(e, 'sable') && blessee(e)) && compteCartes(d, s, 'cimetiere', (c) => c?.kind === 'arme') > 0),
  'ifrit-des-ergs': propre('Vous contrôlez une créature Braise et l’adversaire une créature de force 3 ou plus.', (d, s) => allies(d, s).some((e) => couleur(e, 'braise')) && adversaires(d, s).some((e) => e.atk >= 3)),
  'djinn-des-braises-voilees': propre('Vous contrôlez un autre Djinn et une créature Braise.', (d, s) => allies(d, s).some((e) => type(e, 'Djinn')) && allies(d, s).some((e) => couleur(e, 'braise'))),
  'djinn-de-la-flamme-mourante': propre('Vous contrôlez un Djinn blessé.', (d, s) => allies(d, s).some((e) => type(e, 'Djinn') && blessee(e))),
  'djinn-du-dernier-brasier': propre('Vous contrôlez un Djinn et avez au moins deux magies dans votre cimetière.', (d, s) => allies(d, s).some((e) => type(e, 'Djinn')) && compteCartes(d, s, 'cimetiere', (c) => c?.kind === 'magie') >= 2),
  'djinn-de-la-premiere-etincelle': propre('Vous contrôlez une créature Braise.', (d, s) => allies(d, s).some((e) => couleur(e, 'braise'))),
  'djinn-de-la-fleche-ardente': propre('Vous contrôlez un Djinn et l’adversaire une créature blessée.', (d, s) => allies(d, s).some((e) => type(e, 'Djinn')) && adversaires(d, s).some(blessee)),
  'djinn-des-ailes-de-cendre': propre('Vous contrôlez un Djinn et l’adversaire une créature avec Envol.', (d, s) => allies(d, s).some((e) => type(e, 'Djinn')) && adversaires(d, s).some((e) => e.envol)),
  'djinn-de-foudre': propre('Vous contrôlez un Djinn et l’adversaire une créature de force 3 ou plus.', (d, s) => allies(d, s).some((e) => type(e, 'Djinn')) && adversaires(d, s).some((e) => e.atk >= 3)),
  'veilleuse-au-corbeau-noir': propre('Vous contrôlez un Vampire blessé.', (d, s) => allies(d, s).some((e) => type(e, 'Vampire') && blessee(e))),
  'danseuse-des-ombres-de-dune': propre('Vous contrôlez au moins deux autres Vampires.', (d, s) => allies(d, s).filter((e) => type(e, 'Vampire')).length >= 2),
  'le-cavalier-du-bucher': propre('Vous contrôlez une créature Braise blessée et l’adversaire une créature blessée.', (d, s) => allies(d, s).some((e) => couleur(e, 'braise') && blessee(e)) && adversaires(d, s).some(blessee)),
  salem: propre('Vous contrôlez une créature, l’adversaire une créature de force 3 ou plus, et vous avez une Sorcellerie au cimetière.', (d, s) => allies(d, s).length > 0 && adversaires(d, s).some((e) => e.atk >= 3) && compteCartes(d, s, 'cimetiere', (c) => c?.kind === 'magie' && !c.instant) > 0),
  // Les jetons ne se jouent pas depuis la main : leurs créateurs sont spéciaux.
  tarek: propre('Vous contrôlez une créature Sable blessée.', (d, s) => allies(d, s).some((e) => couleur(e, 'sable') && blessee(e))),
  'kusayla-roi-des-imazighen': propre('Vous contrôlez une créature Sable et l’adversaire une créature de force 3 ou plus.', (d, s) => allies(d, s).some((e) => couleur(e, 'sable')) && adversaires(d, s).some((e) => e.atk >= 3)),
});

export function rpgMobaConditionRapidite(duel, side, cardId) {
  return Boolean(duel && duel[side] && MOBA_RAPIDITE_EMBUSCADES[cardId]?.condition(duel, side));
}
