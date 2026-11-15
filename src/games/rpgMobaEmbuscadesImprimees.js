import { cardById, cardHasPrintedType } from './rpgCards.js';

// Conditions globales, indépendantes des voies, dans tous les modes.
const autre = (s) => s === 'joueur' ? 'sorcier' : 'joueur';
const creatures = (d, s) => (d[s]?.creatures ?? []).filter((e) => cardById(e.carteId)?.kind !== 'site');
const blessee = (e) => e.pv < e.pvMax;
const vampire = (e) => cardHasPrintedType(e.carteId, 'Vampire');
const entree = (texte, condition, cout = null) => Object.freeze({ texte, condition, cout });
const estCreature = (id) => ['creature', 'hero'].includes(cardById(id)?.kind);
const creaturesCimetiere = (d, s) => (d[s]?.cimetiere ?? []).filter(estCreature);
const autreCarteEnMain = (d, s, id, predicate) => {
  const main = d[s]?.main ?? [];
  const indexInvoquee = main.indexOf(id);
  return main.some((c, i) => i !== indexInvoquee && predicate(c));
};

/** Les candidats sont des IDs : les exemplaires identiques sont interchangeables.
 * Pour une défausse, on réserve toujours un exemplaire de la carte invoquée. */
export function rpgCandidatsCoutInvocationSpeciale(duel, cote, id) {
  const cout = MOBA_EMBUSCADES_IMPRIMEES[id]?.cout;
  if (!cout) return [];
  const zone = duel?.[cote]?.[cout.zone] ?? [];
  const indexInvoquee = cout.zone === 'main' ? zone.indexOf(id) : -1;
  return [...new Set(zone.filter((c, i) => i !== indexInvoquee && cout.admissible(c)))];
}
export function rpgCoutInvocationSpecialeDisponible(duel, cote, id, choix = null) {
  const cout = MOBA_EMBUSCADES_IMPRIMEES[id]?.cout;
  if (!cout) return true;
  const candidats = rpgCandidatsCoutInvocationSpeciale(duel, cote, id);
  return choix === null ? candidats.length > 0 : candidats.includes(choix);
}
export function rpgPayerCoutInvocationSpeciale(duel, cote, id, choix) {
  const cout = MOBA_EMBUSCADES_IMPRIMEES[id]?.cout;
  if (!cout) return true;
  if (!rpgCoutInvocationSpecialeDisponible(duel, cote, id, choix) || choix == null) return false;
  const camp = duel[cote];
  const indexInvoquee = cout.zone === 'main' ? camp.main.indexOf(id) : -1;
  const index = camp[cout.zone].findIndex((c, i) => i !== indexInvoquee && c === choix);
  const [carteId] = camp[cout.zone].splice(index, 1);
  (camp[cout.destination] ??= []).push(carteId);
  duel.log.push(`${cote === 'joueur' ? 'Vous' : 'Le sorcier'} ${cout.destination === 'exil' ? (cote === 'joueur' ? 'exilez' : 'exile') : (cote === 'joueur' ? 'défaussez' : 'défausse')} ${cardById(carteId)?.name ?? carteId} pour invoquer ${cardById(id)?.name ?? id}.`);
  return true;
}
const exilerCreature = Object.freeze({ zone: 'cimetiere', destination: 'exil', admissible: estCreature });
const defausserCreature = Object.freeze({ zone: 'main', destination: 'cimetiere', admissible: estCreature });
const defausserMagie = Object.freeze({ zone: 'main', destination: 'cimetiere', admissible: (id) => cardById(id)?.kind === 'magie' });

export const MOBA_EMBUSCADES_IMPRIMEES = Object.freeze({
  'ouvrier-du-natron': entree('Défaussez une autre carte de créature de votre main, au choix.', (d, s) => autreCarteEnMain(d, s, 'ouvrier-du-natron', estCreature), defausserCreature),
  'momie-de-lin': entree('Vous avez au moins deux cartes de créature dans votre cimetière.', (d, s) => creaturesCimetiere(d, s).length >= 2),
  'veuve-des-urnes': entree('Défaussez une carte de magie de votre main, au choix.', (d, s) => autreCarteEnMain(d, s, 'veuve-des-urnes', defausserMagie.admissible), defausserMagie),
  'gardien-des-sept-sceaux': entree('Vous avez au moins trois cartes dans votre cimetière.', (d, s) => (d[s]?.cimetiere ?? []).length >= 3),
  'lecteur-du-dernier-nom': entree('Exilez une carte de créature de votre cimetière, au choix.', (d, s) => creaturesCimetiere(d, s).length > 0, exilerCreature),
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

export const rpgMobaConditionImprimee = (duel, side, id) => Boolean(duel?.[side]
  && MOBA_EMBUSCADES_IMPRIMEES[id]?.condition(duel, side));
