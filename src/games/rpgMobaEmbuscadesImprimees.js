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
const magiesRapidesCimetiere = (d, s) => (d[s]?.cimetiere ?? [])
  .filter((id) => { const c = cardById(id); return c?.kind === 'magie' && c.instant; }).length;
const exilerMagieRapide = Object.freeze({ zone: 'cimetiere', destination: 'exil',
  admissible: (id) => { const c = cardById(id); return c?.kind === 'magie' && Boolean(c.instant); } });
const defausserSabreMaudit = Object.freeze({ zone: 'main', destination: 'cimetiere',
  admissible: (id) => id === 'sabre-maudit' });
const exilerCreature = Object.freeze({ zone: 'cimetiere', destination: 'exil', admissible: estCreature });
const defausserCreature = Object.freeze({ zone: 'main', destination: 'cimetiere', admissible: estCreature });
const defausserMagie = Object.freeze({ zone: 'main', destination: 'cimetiere', admissible: (id) => cardById(id)?.kind === 'magie' });

export const MOBA_EMBUSCADES_IMPRIMEES = Object.freeze({
  'garde-du-trone-givre': entree('Vous avez au moins un Viking dans votre cimetière.', (d, s) => creaturesCimetiere(d, s).some((id) => cardHasPrintedType(id, 'Viking'))),
  'momie-de-lin': entree('Exilez une carte de créature de votre cimetière, au choix.', (d, s) => creaturesCimetiere(d, s).length > 0, exilerCreature),
  'ninja-samourai-des-toits': entree('L’adversaire contrôle au moins une créature.',
    (d, s) => creatures(d, autre(s)).length >= 1),
  'sanguinaire-des-dunes': entree('L’adversaire contrôle au moins deux créatures blessées.', (d, s) => creatures(d, autre(s)).filter(blessee).length >= 2),
  'gardienne-du-croissant': entree('Vous contrôlez une créature blessée.', (d, s) => creatures(d, s).some(blessee)),
  'porte-etendard-de-leclipse': entree('Vous contrôlez au moins trois créatures.', (d, s) => creatures(d, s).length >= 3),
  'sorcier-du-ressac-noir': entree('Exilez une Magie Rapide de votre cimetière, au choix.', (d, s) => magiesRapidesCimetiere(d, s) > 0, exilerMagieRapide),
  'tojiro-le-pourfendeur': entree('Défaussez une carte Sabre maudit de votre main, au choix.', (d, s) => autreCarteEnMain(d, s, 'tojiro-le-pourfendeur', (id) => id === 'sabre-maudit'), defausserSabreMaudit),
});

export const rpgMobaConditionImprimee = (duel, side, id) => Boolean(duel?.[side]
  && MOBA_EMBUSCADES_IMPRIMEES[id]?.condition(duel, side));
