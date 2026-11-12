import { cardById, cardHasPrintedType } from './rpgCards.js';

// Conditions globales, indépendantes des voies : le duel classique ne les lit pas.
const autre = (s) => s === 'joueur' ? 'sorcier' : 'joueur';
const creatures = (d, s) => (d[s]?.creatures ?? []).filter((e) => cardById(e.carteId)?.kind !== 'site');
const blessee = (e) => e.pv < e.pvMax;
const vampire = (e) => cardHasPrintedType(e.carteId, 'Vampire');
const entree = (texte, condition) => Object.freeze({ texte, condition });

export const MOBA_EMBUSCADES_IMPRIMEES = Object.freeze({
  'sentinelle-des-sables': entree('L’adversaire contrôle une créature.', (d, s) => creatures(d, autre(s)).length > 0),
  'tojiro-le-pourfendeur': entree('L’adversaire contrôle un Djinn et vous contrôlez une créature blessée.', (d, s) => creatures(d, autre(s)).some((e) => cardHasPrintedType(e.carteId, 'Djinn')) && creatures(d, s).some(blessee)),
  'garde-du-trone-givre': entree('Vous contrôlez une créature blessée et l’adversaire contrôle une créature.', (d, s) => creatures(d, s).some(blessee) && creatures(d, autre(s)).length > 0),
  'eclipse-silencieuse': entree('L’adversaire contrôle une créature de force 2 ou plus.', (d, s) => creatures(d, autre(s)).some((e) => e.atk >= 2)),
  'gardienne-du-croissant': entree('Vous contrôlez une créature blessée sans bouclier.', (d, s) => creatures(d, s).some((e) => blessee(e) && !e.bouclier)),
  'traqueur-des-nuits-sans-lune': entree('L’adversaire contrôle au moins deux créatures.', (d, s) => creatures(d, autre(s)).length >= 2),
  'sorcier-du-ressac-noir': entree('Vous contrôlez un Vampire, avez une Magie Rapide au cimetière et l’adversaire une créature non-jeton de coût 3 ou moins.', (d, s) => creatures(d, s).some(vampire) && (d[s]?.cimetiere ?? []).some((id) => { const c = cardById(id); return c?.kind === 'magie' && c.instant; }) && creatures(d, autre(s)).some((e) => !e.jeton && (cardById(e.carteId)?.cost ?? Infinity) <= 3)),
  'sanguinaire-des-dunes': entree('L’adversaire contrôle au moins deux créatures blessées.', (d, s) => creatures(d, autre(s)).filter(blessee).length >= 2),
  'porte-etendard-de-leclipse': entree('Vous contrôlez deux Vampires, dont un blessé.', (d, s) => creatures(d, s).filter(vampire).length >= 2 && creatures(d, s).some((e) => vampire(e) && blessee(e))),
  'veilleuse-de-la-lune-givree': entree('L’adversaire contrôle une créature de force 3 ou plus.', (d, s) => creatures(d, autre(s)).some((e) => e.atk >= 3)),
});

export const rpgMobaConditionImprimee = (duel, side, id) => Boolean(duel?.moba
  && MOBA_EMBUSCADES_IMPRIMEES[id]?.condition(duel, side));
