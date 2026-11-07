/**
 * Experimental local-only integration with the real duel engine. The UI uses
 * preconstructed or validated custom decks from an audited pool; most card
 * effects and online play are not yet supported. Never bypass the audit gate.
 */
import { cardColors, cardHasPrintedType, duelCardById, magieById } from './rpgCards.js';
import { ciblesDefenseur } from './rpgDefenseur.js';
import {
  rpgAppliquerBannieresAttaque, rpgDefausserCarte, rpgDemarrerManaEssai, rpgFinDeTour, rpgJouerCreature,
  rpgEstProtegee, rpgPeutAttaquer, rpgPeutPayer,
  rpgLancerAttaque, rpgLancerMagie, rpgMulligan, rpgNouveauDuel,
  rpgOuvrirFinDeTour, rpgPreparerDefausseFinDeTour, rpgResoudreArriveeCiblee, rpgResoudreEffetCreatureEnAttente, rpgRetirerEntitesConquete,
} from './rpgDuel.js';
import { RPG_MODE_MANA_ESSAI, validerDeckManaEssai } from './rpgManaEssai.js';
import { MOBA_SIDES, mobaInfliger, mobaNouveau, mobaPayerPrix, mobaPlacer, mobaRetirer, mobaSoigner, mobaValiderBlocages, mobaVoie } from './rpgMoba.js';

const OFFSETS = Object.freeze({ left: 0, center: 2, right: 3 });
const NOMS_VOIES = Object.freeze({ left: 'la voie gauche', center: 'la voie centrale', right: 'la voie droite' });
// Audited for the experimental combat bridge and the supported arrival and
// scheduled-return paths. Expand with tests as more abilities are adapted.
const CARTES_COMBAT_AUDITEES = new Set([
  'ashigaru-des-braises', 'mousse-des-galiotes', 'viking-des-neiges',
  'gardienne-des-portes-de-sable', 'gardien-viking-du-fjord',
  'loup-des-neiges', 'berserk-des-trois-hivers', 'jarl-au-marteau-de-guerre',
  'anqa-des-braises', 'porteuse-de-cruches', 'sahir-des-braises', 'guerrier-au-bouclier-rond', 'lionne-du-midi-ardent', 'maitre-du-marteau',
  'ifrit-des-ergs', 'djinn-des-braises-voilees', 'djinn-du-dernier-brasier', 'djinn-de-la-premiere-etincelle', 'djinn-des-ailes-de-cendre',
  'djinn-de-la-flamme-mourante', 'veilleuse-des-citernes', 'scalde-des-runes', 'valkyrie-au-corbeau', 'scribe-des-feuillets', 'drakkar-a-tete-de-dragon',
  'volva-soigneuse', 'faiseur-de-passage', 'vipere-de-verre', 'sonneur-fele', 'corbeau-de-givre', 'geant-des-banquises', 'leviathan',
  'gardien-de-la-porte-ardente', 'rempart-des-sables-eternels', 'tin-hinan', 'serpent-du-monde', 'ifrit-al-ahmar', 'celle-qui-pese', 'ibis-des-comptes', 'amayas-du-hoggar', 'jormungandr', 'yamina', 'dame-des-neuf-mondes', 'la-devoreuse', 'valkyrie-des-neuf-nuits', 'pere-des-corbeaux', 'kraken', 'fennec-des-decombres', 'chien-du-guet', 'le-renegat', 'tiziri-du-djurdjura', 'pilote-de-la-carreira',
  'chacal-du-seuil', 'veilleuse-au-corbeau-noir', 'berserk-du-crepuscule', 'seigneur-des-machoires', 'faucon-du-zenith', 'celui-qui-juge', 'pretre-de-la-bouche', 'ouvrier-du-natron', 'gardienne-de-la-balance',
  'orochi', 'momie-de-lin', 'daimyo-du-soleil-rouge', 'tarek',
  'braisier-du-souk', 'valkyrie-des-glaces', 'maitre-des-corbeaux', 'guetteur-du-beffroi', 'dune-marchante', 'faussoyeur-des-dunes', 'scribe-de-la-liste',
  'amani-des-ksour', 'susanoo', 'ronin-du-soleil-rouge', 'hatamoto-des-cendres', 'cavalier-des-deux-sabres', 'samourai-du-torii', 'onna-musha-des-cendres', 'tengu-du-mont-ardent', 'kenshi-de-la-forge',
  'tislit-des-aures', 'ureus-du-seuil', 'feriel', 'djinn-de-la-fleche-ardente', 'djinn-de-foudre', 'bouchra-guerriere-des-cretes', 'kagutsuchi-flamme-originelle', 'maitre-des-hieroglyphes', 'tercio-de-cuivre', 'archere-viking-du-givre',
]);
const JETONS_COMBAT_AUDITES = new Set(['petit-orochi', 'shabti', 'samourai-du-daimyo', 'chien-de-sable']);
const combatAudite = (entite) => CARTES_COMBAT_AUDITEES.has(entite.carteId)
  || (entite.jeton === true && JETONS_COMBAT_AUDITES.has(entite.carteId));
const fail = (raison) => ({ ok: false, raison });
export const MOBA_ARRIVEES_ALLIEES = Object.freeze(['guerrier-au-bouclier-rond', 'veilleuse-des-citernes', 'volva-soigneuse', 'faiseur-de-passage']);
export const MOBA_ARRIVEES_HOSTILES = Object.freeze(['lionne-du-midi-ardent', 'maitre-du-marteau', 'vipere-de-verre', 'sonneur-fele', 'corbeau-de-givre', 'la-devoreuse', 'kraken']);
export const MOBA_ARRIVEES_NEUTRES = Object.freeze(['valkyrie-des-neuf-nuits', 'pere-des-corbeaux', 'maitre-des-corbeaux', 'susanoo']);
const MOBA_ARRIVEES_GLOBALES = Object.freeze(['geant-des-banquises', 'leviathan', 'rempart-des-sables-eternels', 'tin-hinan', 'serpent-du-monde', 'celle-qui-pese', 'ibis-des-comptes', 'amayas-du-hoggar', 'jormungandr', 'celui-qui-juge', 'daimyo-du-soleil-rouge', 'tarek', 'guetteur-du-beffroi', 'faussoyeur-des-dunes', 'braisier-du-souk', 'valkyrie-des-glaces']);
// Keep the original starter list independent of additions to the editor pool.
export const MOBA_CARTES_ESSAI = Object.freeze([
  'ashigaru-des-braises', 'mousse-des-galiotes', 'viking-des-neiges',
  'gardienne-des-portes-de-sable', 'gardien-viking-du-fjord', 'loup-des-neiges',
  'berserk-des-trois-hivers', 'jarl-au-marteau-de-guerre', 'anqa-des-braises',
]);
export const MOBA_MAGIES_ESSAI = Object.freeze([
  'mur-de-boucliers', 'brume-du-fjord', 'hurlement-du-blizzard',
  'grand-voile-blanc', 'verglas', 'grand-hiver', 'tempete-de-foudre-et-de-givre', 'rempart-de-dunes',
]);
// These effects have no lane choice. The board launches them directly; an
// audited subset may still announce before resolving when responses are enabled.
export const MOBA_MAGIES_IMMEDIATES = Object.freeze([
  'tempete-de-sable', 'brisure-de-verre', 'vent-rouge', 'rapport-du-greffier',
  'les-feuillets', 'la-derniere-pesee', 'ressac-de-la-lune-noire', 'nuage-de-cendres', 'serment-de-la-forge', 'nom-efface', 'le-routier', 'embuscade',
]);
// Sorts audités, uniquement en phase principale et sans réponse imbriquée.
const MOBA_MAGIES_PIOCHE_REPONSE = Object.freeze(['rapport-du-greffier', 'les-feuillets']);
export const MOBA_MAGIES_ZONE_TOTALE_REPONSE = Object.freeze([
  'grand-hiver', 'tempete-de-foudre-et-de-givre', 'la-derniere-pesee', 'ressac-de-la-lune-noire',
]);
export const MOBA_MAGIES_ZONE_REPONSE = Object.freeze([
  'tempete-de-sable', 'vent-rouge', 'brisure-de-verre',
  'brume-du-fjord', 'hurlement-du-blizzard', 'verglas', 'nuage-de-cendres',
  ...MOBA_MAGIES_ZONE_TOTALE_REPONSE,
]);
export const MOBA_SORTS_REPONSE = Object.freeze([
  'poigne-de-givre', 'ressac', 'eclair-du-marteau', 'trait-de-braise',
  'appat-de-la-meute', 'frappe-iaijutsu', 'courant-de-retour', 'haut-fond', 'lame-de-mer',
  'effacement-des-faibles', 'le-jugement-des-colosses', 'parade-du-verre', 'voile-de-la-lune-noire',
  'eau-de-la-source', 'festin-des-vaillants', 'le-poids', 'la-grande-pesee',
  ...MOBA_MAGIES_PIOCHE_REPONSE, ...MOBA_MAGIES_ZONE_REPONSE,
]);
export const MOBA_MAGIES_VOIES = Object.freeze(['eclair-du-marteau', 'trait-de-braise']);
export const MOBA_MAGIES_TRANSFERT = Object.freeze(['le-poids', 'la-grande-pesee']);
export const MOBA_MAGIES_SOINS = Object.freeze(['festin-des-vaillants', 'eau-de-la-source']);
export const MOBA_MAGIES_PRIX = Object.freeze(['papyrus', 'neige-noire', 'offrande-de-lin', 'la-grande-pesee']);
export const MOBA_MAGIES_NEUTRES = Object.freeze(['effacement-des-faibles', 'le-jugement-des-colosses']);
export const MOBA_MAGIES_ALLIEES = Object.freeze(['parade-du-verre', 'voile-de-la-lune-noire']);
export const MOBA_MAGIES_CIBLEES = Object.freeze([
  'poigne-de-givre', 'ressac', 'appat-de-la-meute', 'frappe-iaijutsu', 'courant-de-retour', 'haut-fond', 'lame-de-mer',
  ...MOBA_MAGIES_VOIES, ...MOBA_MAGIES_ALLIEES, ...MOBA_MAGIES_NEUTRES,
]);
export const MOBA_DECK_ESSAI = Object.freeze([
  ...MOBA_CARTES_ESSAI.flatMap((id) => ['anqa-des-braises', 'viking-des-neiges'].includes(id) ? [id] : [id, id]),
  ...MOBA_MAGIES_ESSAI.filter((id) => id !== 'rempart-de-dunes').flatMap((id) =>
    ['mur-de-boucliers', 'grand-voile-blanc', 'grand-hiver', 'verglas', 'brume-du-fjord'].includes(id) ? [id] : [id, id]),
  'poigne-de-givre', 'poigne-de-givre', ...MOBA_MAGIES_VOIES, 'festin-des-vaillants',
]);
let nombreGardiennes = 0;
let nombrePoignes = 0;
const deckSources = MOBA_DECK_ESSAI.map((id) => {
  if (id === 'mousse-des-galiotes') return 'porteuse-de-cruches';
  if (id === 'gardienne-des-portes-de-sable') return nombreGardiennes++ === 0 ? 'eau-de-la-source' : 'festin-des-vaillants';
  if (id === 'poigne-de-givre') return nombrePoignes++ === 0 ? 'ressac' : 'parade-du-verre';
  return id;
});
const deckSahir = [...MOBA_DECK_ESSAI];
deckSahir[deckSahir.indexOf('ashigaru-des-braises')] = 'sahir-des-braises';
deckSahir[deckSahir.indexOf('brume-du-fjord')] = 'rempart-de-dunes';
deckSahir[deckSahir.indexOf('viking-des-neiges')] = 'guerrier-au-bouclier-rond';
const deckLionne = [...deckSources];
deckLionne[deckLionne.indexOf('jarl-au-marteau-de-guerre')] = 'lionne-du-midi-ardent';
deckLionne[deckLionne.indexOf('anqa-des-braises')] = 'maitre-du-marteau';
const deckPapyrus = MOBA_DECK_ESSAI.map((id) => id === 'mousse-des-galiotes' ? 'guerrier-au-bouclier-rond'
  : id === 'gardienne-des-portes-de-sable' ? 'papyrus' : id);
export const MOBA_DECKS = Object.freeze([
  Object.freeze({ id: 'sable', name: 'Sable et givre', description: 'Gardiennes et assauts des neiges.', elements: Object.freeze(['neige', 'sable', 'braise']), cardIds: MOBA_DECK_ESSAI }),
  Object.freeze({ id: 'sources', name: 'Sources et givre', description: 'Soins de voie, Ressac et Parade de verre.', elements: Object.freeze(['neige', 'eau', 'braise']), cardIds: Object.freeze(deckSources) }),
  Object.freeze({ id: 'sahir', name: 'Le cercle des braises', description: 'Sahir pioche et frappe ; le Guerrier et Rempart protègent vos créatures.', elements: Object.freeze(['neige', 'sable', 'braise']), cardIds: Object.freeze(deckSahir) }),
  Object.freeze({ id: 'lionne', name: 'La source ardente', description: 'La Lionne et le Maître frappent à leur arrivée ; les eaux soignent vos voies.', elements: Object.freeze(['neige', 'eau', 'braise']), cardIds: Object.freeze(deckLionne) }),
  Object.freeze({ id: 'papyrus', name: 'Les serments du papyrus', description: 'Payez des PV de voie pour piocher et protégez vos guerriers.', elements: Object.freeze(['neige', 'braise', 'tenebres']), cardIds: Object.freeze(deckPapyrus) }),
]);

/** Only this audited pool may be used by a player-built MOBA deck. */
export const MOBA_CARTES_AUTORISEES = Object.freeze([...new Set([
  ...CARTES_COMBAT_AUDITEES, ...MOBA_MAGIES_ESSAI, ...MOBA_MAGIES_IMMEDIATES, ...MOBA_MAGIES_CIBLEES, ...MOBA_MAGIES_SOINS, ...MOBA_MAGIES_PRIX, ...MOBA_MAGIES_TRANSFERT,
])]);
const CARTES_AUTORISEES = new Set(MOBA_CARTES_AUTORISEES);

/** The normal mana-essai deck rules plus the MOBA effect audit gate. */
export function rpgMobaValiderDeck(deck) {
  const result = validerDeckManaEssai(deck);
  if (!result.ok) return result;
  const unsupported = deck.cardIds.find((id) => !CARTES_AUTORISEES.has(id));
  return unsupported ? fail(`carte non adaptée au MOBA : ${unsupported}`) : { ok: true };
}

/** Create a user-selected match only after validating both complete decks.
 * Test fixtures can still use the lower-level rpgMobaNouveauDuel directly. */
export function rpgMobaCreerPartie(joueur, sorcier, options = {}) {
  for (const [side, deck] of [['joueur', joueur], ['sorcier', sorcier]]) {
    const validation = rpgMobaValiderDeck(deck);
    if (!validation.ok) return { ...validation, side };
  }
  return { ok: true, duel: rpgMobaNouveauDuel({
    ...options, joueurDeck: [...joueur.cardIds], sorcierDeck: [...sorcier.cardIds],
    joueurCouleurs: [...joueur.elements], sorcierCouleurs: [...sorcier.elements],
  }) };
}

/** Whether a displayed card can be paid, including the existence of a legal
 * lane for an audited life price. Timing and targets are checked separately. */
export function rpgMobaPeutPayer(duel, side, carte) {
  if (!duel?.moba || !MOBA_SIDES.includes(side) || !carte) return false;
  if (!MOBA_MAGIES_PRIX.includes(carte.id)) return rpgPeutPayer(duel[side], carte);
  return rpgPeutPayer(duel[side], carte, { ignorerPrixPv: true })
    && duel.moba.lanes.some((lane) => lane.active && lane.hp[side] > carte.prixPv);
}

/** Two human-controlled seats use the existing mana-essai turn and mana rules.
 * `pvp` is the engine's manual-control flag; no network or referee is used. */
export function rpgMobaNouveauDuel(options = {}) {
  const duel = rpgNouveauDuel({ ...options, modeMana: RPG_MODE_MANA_ESSAI, pvp: true });
  duel.moba = mobaNouveau();
  return duel;
}

/** Eligible unique cards in the searching player's own deck. Never render the
 * AI's candidates in the human interface. */
export function rpgMobaCandidatsRecherche(duel, side) {
  const recherche = duel?.mobaRechercheEnAttente;
  if (!recherche || recherche.cote !== side || !MOBA_SIDES.includes(side)) return [];
  return [...new Set(duel[side].deck.filter((id) => {
    if (recherche.sourceCarteId === 'pilote-de-la-carreira') return cardHasPrintedType(id, 'Navire');
    if (recherche.sourceCarteId !== 'tiziri-du-djurdjura') return false;
    const ligne = magieById(id)?.typeLine ?? '';
    return ligne.includes('Magie Rapide') || ligne.includes('Sorcellerie');
  }))];
}

export function rpgMobaResoudreRecherche(duel, side, cardId) {
  if (!duel?.moba || duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return fail('partie-terminee');
  if (!rpgMobaPlacementCoherent(duel) || duel.mobaRechercheEnAttente?.cote !== side) return fail('timing');
  if (!rpgMobaCandidatsRecherche(duel, side).includes(cardId)) return fail('cible');
  const [id] = duel[side].deck.splice(duel[side].deck.indexOf(cardId), 1);
  duel[side].main.push(id);
  const source = duelCardById(duel.mobaRechercheEnAttente.sourceCarteId)?.name ?? 'La capacité';
  // Do not leak the AI's searched card through the shared log.
  duel.log.push(`${source} trouve une carte dans son deck et l’ajoute à sa main.`);
  duel.mobaRechercheEnAttente = null;
  return { ok: true };
}

/** Each seat chooses its own starting cards before the first turn begins. */
export function rpgMobaMulligan(duel, side, indices = [], rng = Math.random) {
  if (!duel?.moba || duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return fail('partie-terminee');
  if (!MOBA_SIDES.includes(side) || !Array.isArray(indices)
    || indices.some((index) => !Number.isInteger(index) || index < 0 || index >= duel[side].main.length)
    || new Set(indices).size !== indices.length) return fail('choix');
  const expected = !duel.mulliganFait.joueur ? 'joueur' : !duel.mulliganFait.sorcier ? 'sorcier' : null;
  if (side !== expected) return fail('pas-votre-tour');
  const result = rpgMulligan(duel, side, indices, rng);
  if (!result.ok) return fail('mulligan');
  if (side === 'sorcier') {
    const start = rpgDemarrerManaEssai(duel);
    if (!start.ok) return start;
  }
  return { ok: true, demarre: duel.manaEssaiDemarre };
}

/** The current player chooses their own excess cards rather than having the
 * classic engine's automatic end-of-turn discard choose for them. */
export function rpgMobaTerminerTour(duel, side) {
  if (duel?.mobaRechercheEnAttente) return fail('timing');
  if (!duel?.moba || duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return fail('partie-terminee');
  if (!rpgMobaPlacementCoherent(duel)) return fail('etat-incoherent');
  if (!MOBA_SIDES.includes(side) || duel.tour !== side) return fail('pas-votre-tour');
  if (!duel.manaEssaiDemarre || duel[side].manaChoixEnAttente
    || !['principale', 'principale2'].includes(duel.phase)
    || duel.fenetreReponse || duel.finDeTour || duel.combatDeclare || duel.arriveeEnAttente
    || duel.effetCreatureEnAttente || duel.destructionsEnAttente?.length || duel.siteEnAttente
    || (duel.defausseEnAttente && duel.defausseEnAttente.motif !== 'fin-de-tour')) return fail('timing');
  const restant = rpgPreparerDefausseFinDeTour(duel, side);
  if (restant) return { ok: true, defausse: restant };
  if (!rpgOuvrirFinDeTour(duel)) return fail('timing');
  return { ok: true, reponse: side === 'joueur' ? 'sorcier' : 'joueur' };
}

/** The non-active seat may respond, then explicitly pass the end-of-turn window. */
export function rpgMobaPasserFinDeTour(duel, side) {
  if (duel?.mobaRechercheEnAttente) return fail('timing');
  if (!duel?.moba || duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return fail('partie-terminee');
  if (!rpgMobaPlacementCoherent(duel)) return fail('etat-incoherent');
  if (!MOBA_SIDES.includes(side) || side === duel.tour) return fail('pas-votre-tour');
  if (duel.phase !== 'fin' || duel.finDeTour?.cote !== duel.tour || !duel.fenetreReponse
    || duel.combatDeclare || duel.arriveeEnAttente || duel.effetCreatureEnAttente
    || duel.destructionsEnAttente?.length || duel.defausseEnAttente || duel.siteEnAttente) return fail('timing');
  const avant = duel.tour;
  rpgFinDeTour(duel);
  // Une capacité de retour peut détruire des créatures d'autres voies.
  synchroniserSorties(duel);
  return duel.tour !== avant ? { ok: true, tour: duel.tour } : fail('timing');
}

export function rpgMobaDefausser(duel, side, index) {
  if (duel?.mobaRechercheEnAttente) return fail('timing');
  if (!duel?.moba || duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return fail('partie-terminee');
  if (!MOBA_SIDES.includes(side) || !rpgMobaPlacementCoherent(duel)
    || duel.defausseEnAttente?.cote !== side
    || (duel.defausseEnAttente.motif === 'fin-de-tour' && duel.tour !== side)) return fail('timing');
  if (!Number.isInteger(index) || index < 0 || index >= duel[side].main.length) return fail('hors-main');
  const result = rpgDefausserCarte(duel, side, index);
  if (!result.ok) return result;
  return { ok: true, restant: duel.defausseEnAttente?.restant ?? 0, carteId: result.carteId };
}

/** Remove lane references to creatures the engine has just taken off board. */
function synchroniserSorties(duel) {
  if (duel.moba.winner) return;
  for (const cote of MOBA_SIDES) {
    const live = new Set(duel[cote].creatures.map((entity) => entity.id));
    for (const lane of duel.moba.lanes) {
      for (const id of [...lane.slots[cote]]) if (id !== null && !live.has(id)) mobaRetirer(duel.moba, cote, id);
    }
  }
}

/** Check the engine's fixed slots and the lane record describe the same board.
 * Fail closed if an unsupported engine action has modified only one of them. */
export function rpgMobaPlacementCoherent(duel) {
  if (!duel?.moba || duel.modeMana !== RPG_MODE_MANA_ESSAI) return false;
  for (const side of MOBA_SIDES) {
    const entities = duel[side]?.creatures;
    if (!Array.isArray(entities)) return false;
    const occupied = new Set();
    for (const lane of duel.moba.lanes) {
      if (!Object.hasOwn(OFFSETS, lane.id) || !Array.isArray(lane.slots?.[side])) return false;
      for (const [slot, id] of lane.slots[side].entries()) {
        if (id === null) continue;
        if (!lane.active || occupied.has(id)) return false;
        const entity = entities.find((candidate) => candidate.id === id);
        if (!entity || entity.emplacement !== OFFSETS[lane.id] + slot || entity.mobaLane !== lane.id) return false;
        occupied.add(id);
      }
    }
    if (occupied.size !== entities.length) return false;
  }
  return true;
}

/** Place a creature from the active player's hand using the engine's payment,
 * restrictions, entity creation and aura recalculation. Effects requiring lane
 * semantics are temporarily rejected rather than executed incorrectly. */
export function rpgMobaJouerCreature(duel, side, cardId, laneId, slot) {
  if (duel?.mobaRechercheEnAttente) return fail('timing');
  if (!rpgMobaPlacementCoherent(duel)) return fail('etat-incoherent');
  if (duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return fail('partie-terminee');
  if (!MOBA_SIDES.includes(side) || duel.tour !== side) return fail('pas-votre-tour');
  if (!duel.manaEssaiDemarre || duel[side].manaChoixEnAttente
    || !['principale', 'principale2'].includes(duel.phase)
    || duel.fenetreReponse || duel.finDeTour || duel.combatDeclare
    || duel.arriveeEnAttente || duel.effetCreatureEnAttente
    || duel.destructionsEnAttente?.length || duel.defausseEnAttente || duel.siteEnAttente) return fail('timing');
  const lane = mobaVoie(duel.moba, laneId);
  if (!lane?.active) return fail('voie-inactive');
  if (!Number.isInteger(slot) || slot < 0 || slot >= lane.slots[side].length || lane.slots[side][slot] !== null) return fail('emplacement');
  const carte = duelCardById(cardId);
  if (!carte || carte.kind === 'site') return fail('carte');
  // A card with unaudited combat or leave-play abilities must never enter the
  // local game: accepting it could later deadlock the only combat phase.
  if (!CARTES_COMBAT_AUDITEES.has(cardId)) return fail('effet-non-pris-en-charge');
  // Porteuse heals her own lane; audited shields and damage use the engine's
  // deferred arrival choices. Other arrivals remain gated until audited.
  const soinArrivee = ['porteuse-de-cruches', 'yamina', 'dame-des-neuf-mondes'].includes(cardId);
  const arriveeCiblee = MOBA_ARRIVEES_ALLIEES.includes(cardId) || MOBA_ARRIVEES_HOSTILES.includes(cardId) || MOBA_ARRIVEES_NEUTRES.includes(cardId);
  const arriveeGlobale = MOBA_ARRIVEES_GLOBALES.includes(cardId) || ['tiziri-du-djurdjura', 'pilote-de-la-carreira', 'pretre-de-la-bouche'].includes(cardId);
  if ((carte.arrivee && carte.arrivee.type !== 'pioche' && !soinArrivee && !arriveeCiblee && !arriveeGlobale) || Number.isFinite(carte.abordage) || carte.interceptionAttaque
    || carte.prixPv || duel[side].abordageDesArrivees || duel[side].prochaineArriveeAbordage) return fail('effet-non-pris-en-charge');
  const before = JSON.stringify(duel);
  const restore = () => {
    const snapshot = JSON.parse(before);
    for (const key of Object.keys(duel)) delete duel[key];
    Object.assign(duel, snapshot);
  };
  try {
    const damageEvents = [];
    const result = rpgJouerCreature(duel, side, cardId, null, {
      emplacement: OFFSETS[laneId] + slot,
      onEntitePlacee: (entite) => {
        entite.mobaLane = laneId;
        if (!mobaPlacer(duel.moba, side, laneId, slot, entite.id).ok) throw new Error('Placement MOBA incohérent');
      },
      ...(arriveeCiblee ? { cibleDifferee: true } : {}),
      ...(soinArrivee ? { resoudreSoinSorcier: ({ amount }) => mobaSoigner(duel.moba, side, laneId, amount) } : {}),
      ...(cardId === 'braisier-du-souk' ? { resoudreDegatsSorcier: ({ amount }) => {
        synchroniserSorties(duel);
        return infligerDansVoie(duel, side, laneId, amount, damageEvents, { cardId });
      } } : {}),
    });
    // The supported path reaches no payment or other mutation when refused;
    // keep the original object references intact for the local controller.
    if (!result.ok) return result;
    // Only audited arrivals are permitted above; still fail closed if engine
    // state actions removed another entity or added an unexpected one.
    synchroniserSorties(duel);
    // An immediate death caused by the arrival is a valid resolved play, not
    // a failed placement. Unexpected extra entities still fail closed.
    if (!result.entite || !rpgMobaPlacementCoherent(duel)) {
      restore();
      return fail('effet-non-pris-en-charge');
    }
    return { ...result, damageEvents };
  } catch (error) {
    restore();
    throw error;
  }
}

/** Resolve an audited arrival choice; the engine validates protection and may
 * open an opposing instant-response window before the hostile effect resolves. */
export function rpgMobaResoudreArrivee(duel, side, cibleId) {
  if (duel?.mobaRechercheEnAttente) return fail('timing');
  if (!duel?.moba || duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return fail('partie-terminee');
  if (!rpgMobaPlacementCoherent(duel)) return fail('etat-incoherent');
  if (!MOBA_SIDES.includes(side) || duel.tour !== side) return fail('pas-votre-tour');
  const attente = duel.arriveeEnAttente;
  if (attente?.cote !== side || ![...MOBA_ARRIVEES_ALLIEES, ...MOBA_ARRIVEES_HOSTILES, ...MOBA_ARRIVEES_NEUTRES].includes(attente.carteId)) return fail('aucune-attente');
  const damageEvents = [];
  let options = null;
  if (cibleId === 'sorcier' && attente.carteId === 'maitre-du-marteau') {
    const source = duel[side].creatures.find((entity) => entity.id === attente.entiteId);
    if (!source || !mobaVoie(duel.moba, source.mobaLane)?.active) return fail('cible');
    options = { resoudreDegatsSorcier: ({ amount }) => infligerDansVoie(duel, side, source.mobaLane, amount, damageEvents, { cardId: attente.carteId }) };
  } else {
    const cibleSides = MOBA_ARRIVEES_NEUTRES.includes(attente.carteId) ? MOBA_SIDES
      : [MOBA_ARRIVEES_ALLIEES.includes(attente.carteId) ? side : (side === 'joueur' ? 'sorcier' : 'joueur')];
    const cibleSide = cibleSides.find((camp) => duel.moba.lanes.some((voie) => voie.active && voie.slots[camp].includes(cibleId)));
    if (!cibleSide || !duel[cibleSide].creatures.some((entity) => entity.id === cibleId)) return fail('cible');
  }
  const result = rpgResoudreArriveeCiblee(duel, side, cibleId, options);
  if (result.ok) synchroniserSorties(duel);
  return { ...result, damageEvents };
}

/** The defender passes on a paid creature effect; it resolves using the engine. */
export function rpgMobaPasserEffetCreature(duel, side) {
  if (duel?.mobaRechercheEnAttente) return fail('timing');
  if (!duel?.moba || duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return fail('partie-terminee');
  if (!rpgMobaPlacementCoherent(duel)) return fail('etat-incoherent');
  const attente = duel.effetCreatureEnAttente;
  if (!MOBA_SIDES.includes(side) || !attente || side === attente.cote || attente.cote !== duel.tour
    || ![...MOBA_ARRIVEES_HOSTILES, ...MOBA_ARRIVEES_NEUTRES].includes(attente.carteId) || !duel.fenetreReponse) return fail('aucun-effet');
  const result = rpgResoudreEffetCreatureEnAttente(duel, side);
  if (result.ok) synchroniserSorties(duel);
  return result;
}

/** Pass priority on a paid, announced spell. An illegal target normally
 * fizzles it; Festin retains its independent, global creature healing. */
export function rpgMobaPasserSort(duel, side) {
  if (!duel?.moba || duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return fail('partie-terminee');
  if (!rpgMobaPlacementCoherent(duel)) return fail('etat-incoherent');
  const attente = duel.mobaSortEnAttente;
  if (!attente || side !== (attente.cote === 'joueur' ? 'sorcier' : 'joueur')
    || attente.cote !== duel.tour || !MOBA_SORTS_REPONSE.includes(attente.carteId)
    || !duel.fenetreReponse || duel.defausseEnAttente || duel.mobaRechercheEnAttente) return fail('aucun-sort');
  const degatsVoie = attente.cibleId === 'sorcier';
  const soinVoie = attente.cibleId === null && MOBA_MAGIES_SOINS.includes(attente.carteId);
  const transfertVoie = attente.cibleId === null && MOBA_MAGIES_TRANSFERT.includes(attente.carteId);
  const cibleVoie = degatsVoie || soinVoie || transfertVoie;
  const voie = cibleVoie ? mobaVoie(duel.moba, attente.laneId) : null;
  if (cibleVoie && ((degatsVoie && !MOBA_MAGIES_VOIES.includes(attente.carteId)) || !voie)) return fail('etat-incoherent');
  const damageEvents = [];
  const healingEvents = [];
  // Festin's creature healing is global and independent of its lane heal.
  // A closed lane loses its healing without redirecting or cancelling that part.
  const voiePerdue = cibleVoie && !voie.active;
  const result = voiePerdue && attente.carteId !== 'festin-des-vaillants' ? fail('cible') : rpgLancerMagie(duel, attente.cote, attente.carteId, attente.cibleId, null, {
    resoudreSortMoba: true,
    ...(transfertVoie ? { mobaLane: attente.laneId, surTransfertMoba: (event) => {
      damageEvents.push({ ...event, laneId: attente.laneId, targetSide: side, cardId: attente.carteId, transfert: true });
      healingEvents.push({ laneId: attente.laneId, side: attente.cote, cardId: attente.carteId, healing: event.healing });
    } } : {}),
    ...(degatsVoie ? { resoudreDegatsSorcier: ({ amount }) => infligerDansVoie(duel, attente.cote, attente.laneId, amount, damageEvents, { cardId: attente.carteId }) } : {}),
    ...(soinVoie ? { resoudreSoinSorcier: ({ amount }) => {
      const healing = mobaSoigner(duel.moba, attente.cote, attente.laneId, amount);
      if (healing.ok) healingEvents.push({ laneId: attente.laneId, side: attente.cote, cardId: attente.carteId, ...healing });
      return healing;
    } } : {}),
  });
  // Only target illegality is a normal fizzle. Preserve the pending card on an
  // unexpected timing or engine error instead of silently consuming it.
  if (!result.ok && !['cible', 'protection'].includes(result.raison)) return result;
  duel.mobaSortEnAttente = null;
  duel.fenetreReponse = false;
  if (result.ok && voiePerdue && attente.carteId === 'festin-des-vaillants') {
    duel.log.push(`La voie de Festin des vaillants est conquise : seules les créatures alliées sont soignées.`);
  }
  if (!result.ok) {
    duel[attente.cote].cimetiere.push(attente.carteId);
    duel.log.push(`La cible de ${magieById(attente.carteId)?.name ?? 'la magie'} n'est plus légale : le sort se dissipe.`);
    return { ok: true, dissipe: true };
  }
  synchroniserSorties(duel);
  return cibleVoie ? { ...result, damageEvents, healingEvents } : result;
}

/** Apply a resolved hit and perform conquest cleanup immediately. */
function infligerDansVoie(duel, side, laneId, amount, damageEvents, details = {}) {
  const damage = mobaInfliger(duel.moba, side, laneId, amount);
  if (!damage.ok) return { recus: 0 };
  damageEvents.push({ ...details, laneId, targetSide: side === 'joueur' ? 'sorcier' : 'joueur', ...damage });
  if (damage.conquered) rpgRetirerEntitesConquete(duel, damage.removed, laneId);
  if (damage.winner) {
    duel.fin = { gagnant: damage.winner, raison: 'conquete-moba' };
    return { recus: damage.damage, terminerCombat: true };
  }
  return { recus: damage.damage, sourceExileeParConquete: damage.conquered };
}

/** An Attaque ciblée can only see enemies in its own lane. Defenders in
 * other lanes do not attract it. Protected creatures still prevent a face
 * attack, even when none of them is a legal target. */
export function rpgMobaCiblesAttaque(duel, side, attackerId) {
  const attaquant = duel?.[side]?.creatures.find((e) => e.id === attackerId);
  if (!attaquant?.coupRapide) return { obligatoires: false, cibles: [] };
  const ennemi = side === 'joueur' ? 'sorcier' : 'joueur';
  const adversaires = duel[ennemi].creatures.filter((e) => e.mobaLane === attaquant.mobaLane);
  const couleurs = cardColors(duelCardById(attaquant.carteId));
  const cibles = ciblesDefenseur(adversaires.filter((e) => !rpgEstProtegee(e, couleurs)));
  return { obligatoires: adversaires.length > 0, cibles: cibles.map((e) => e.id) };
}

function validerCiblesAttaque(duel, side, ids, cibles) {
  if (!cibles || typeof cibles !== 'object' || Array.isArray(cibles)
    || Object.keys(cibles).some((id) => !ids.includes(id))) return fail('cible');
  for (const id of ids) {
    const attacker = duel[side].creatures.find((e) => e.id === id);
    const target = cibles[id];
    if (!attacker) return fail('attaquant');
    if (!attacker.coupRapide && target) return fail('cible');
    const choix = rpgMobaCiblesAttaque(duel, side, id);
    if (choix.obligatoires && !target) return fail('cible-obligatoire');
    if (target && !choix.cibles.includes(target)) return fail('cible');
  }
  return { ok: true };
}

/** Declare an attack before giving the other seat a real response window. */
export function rpgMobaDeclarerAttaque(duel, side, attackerIds, ciblesAttaque = {}) {
  if (duel?.mobaRechercheEnAttente) return fail('timing');
  if (!rpgMobaPlacementCoherent(duel)) return fail('etat-incoherent');
  if (duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return fail('partie-terminee');
  if (!MOBA_SIDES.includes(side) || duel.tour !== side) return fail('pas-votre-tour');
  if (!duel.manaEssaiDemarre || duel[side].manaChoixEnAttente || duel.phase !== 'principale'
    || duel.attaqueJouee === side || duel.fenetreReponse || duel.finDeTour || duel.combatDeclare
    || duel.arriveeEnAttente || duel.effetCreatureEnAttente || duel.destructionsEnAttente?.length
    || duel.defausseEnAttente || duel.siteEnAttente) return fail('timing');
  const valid = mobaValiderBlocages(duel.moba, side, attackerIds, {});
  if (!valid.ok) return valid;
  const ciblesValides = validerCiblesAttaque(duel, side, attackerIds, ciblesAttaque);
  if (!ciblesValides.ok) return ciblesValides;
  if (MOBA_SIDES.some((camp) => duel[camp].creatures.some((e) =>
    !combatAudite(e) || e.arme || e.enCale || e.volDeVie || e.doitBloquer))) return fail('effet-non-pris-en-charge');
  if (attackerIds.some((id) => !rpgPeutAttaquer(duel[side].creatures.find((e) => e.id === id)))) return fail('pas-pret');
  const bannieresAppliquees = rpgAppliquerBannieresAttaque(duel, side, attackerIds);
  duel.phase = 'blocage';
  duel.fenetreReponse = true;
  duel.combatDeclare = { cote: side, attaquants: [...attackerIds], ciblesAttaque: { ...ciblesAttaque }, bannieresAppliquees };
  return { ok: true };
}

/** Combat damage, readiness, blocking and the one-attack-per-turn rule are
 * resolved by the duel engine. Other card abilities require an audit first. */
export function rpgMobaLancerAttaque(duel, side, attackerIds, blocks = {}, { declaree = false, ciblesAttaque = {} } = {}) {
  if (duel?.mobaRechercheEnAttente) return fail('timing');
  if (!rpgMobaPlacementCoherent(duel)) return fail('etat-incoherent');
  if (duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return fail('partie-terminee');
  if (!MOBA_SIDES.includes(side) || duel.tour !== side) return fail('pas-votre-tour');
  const combat = duel.combatDeclare;
  const combatValide = declaree && duel.phase === 'blocage' && combat?.cote === side
    && Array.isArray(attackerIds) && attackerIds.length === combat.attaquants.length
    && attackerIds.every((id) => combat.attaquants.includes(id));
  if (!duel.manaEssaiDemarre || duel[side].manaChoixEnAttente
    || (declaree ? !combatValide : (!['principale', 'attaque'].includes(duel.phase) || duel.fenetreReponse || duel.combatDeclare))
    || duel.finDeTour || duel.arriveeEnAttente || duel.effetCreatureEnAttente
    || duel.destructionsEnAttente?.length || duel.defausseEnAttente || duel.siteEnAttente) return fail('timing');
  const isolation = mobaValiderBlocages(duel.moba, side, attackerIds, blocks);
  if (!isolation.ok) return isolation;
  if (!declaree) {
    const ciblesValides = validerCiblesAttaque(duel, side, attackerIds, ciblesAttaque);
    if (!ciblesValides.ok) return ciblesValides;
  }

  // Other keywords, death triggers and player-targeting effects must be audited
  // before enabling them. This is not a permanent card restriction.
  if (MOBA_SIDES.some((cote) => duel[cote].creatures.some((entity) =>
    !combatAudite(entity) || entity.arme || entity.enCale
      || entity.volDeVie || entity.doitBloquer
  ))) return fail('effet-non-pris-en-charge');

  const lanesByAttacker = new Map();
  for (const lane of duel.moba.lanes) {
    for (const id of lane.slots[side]) if (id !== null) lanesByAttacker.set(id, lane.id);
  }
  const damageEvents = [];
  const healingEvents = [];
  const result = rpgLancerAttaque(duel, side, attackerIds, blocks, null, null, declaree ? combat.ciblesAttaque : ciblesAttaque, {
    attaqueDeclaree: declaree,
    bannieresAppliquees: declaree && Boolean(combat.bannieresAppliquees),
    surTransfertMoba: (transfer, source) => {
      damageEvents.push({ ...transfer, laneId: transfer.laneId, targetSide: side === 'joueur' ? 'sorcier' : 'joueur', attackerId: source.id, tribut: true });
      healingEvents.push({ laneId: transfer.laneId, side, healing: transfer.healing, attackerId: source.id });
    },
    resoudreDegatsDirects: (hit) => {
      const laneId = lanesByAttacker.get(hit.attaquantId);
      return infligerDansVoie(duel, side, laneId, hit.amount, damageEvents, { attackerId: hit.attaquantId });
    },
  });
  if (!result.ok) return result;
  if (declaree) {
    duel.combatDeclare = null;
    duel.fenetreReponse = false;
    if (duel.phase === 'blocage') duel.phase = 'principale2';
  }
  // Creatures killed in ordinary combat leave the engine field. Clear the
  // corresponding lane slots without changing their original assignment.
  if (!duel.moba.winner) {
    for (const cote of MOBA_SIDES) {
      const live = new Set(duel[cote].creatures.map((entity) => entity.id));
      for (const lane of duel.moba.lanes) {
        for (const id of [...lane.slots[cote]]) {
          if (id !== null && !live.has(id)) mobaRetirer(duel.moba, cote, id);
        }
      }
    }
  }
  return { ...result, damageEvents, healingEvents };
}

/** Audited global effects and single-creature spells only. The duel engine
 * validates protection, payment and resolves the printed text. The local UI
 * opts in to the limited main-phase spell window; probes resolve immediately. */
export function rpgMobaLancerMagie(duel, side, cardId, cibleId = null, laneId = null, prixLaneId = null, { ouvrirReponse = false } = {}) {
  if (duel?.mobaRechercheEnAttente) return fail('timing');
  if (!rpgMobaPlacementCoherent(duel)) return fail('etat-incoherent');
  if (duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return fail('partie-terminee');
  if (!MOBA_SIDES.includes(side)) return fail('pas-votre-tour');
  const reaction = duel.tour !== side && (
    (duel.phase === 'blocage' && duel.combatDeclare?.cote === duel.tour)
    || (duel.phase === 'fin' && duel.finDeTour?.cote === duel.tour && duel.fenetreReponse)
    || (duel.effetCreatureEnAttente?.cote === duel.tour && [...MOBA_ARRIVEES_HOSTILES, ...MOBA_ARRIVEES_NEUTRES].includes(duel.effetCreatureEnAttente?.carteId) && duel.fenetreReponse)
    || (duel.mobaSortEnAttente?.cote === duel.tour && duel.fenetreReponse)
  );
  if (duel.tour !== side && !reaction) return fail('pas-votre-tour');
  if (reaction && !magieById(cardId)?.instant) return fail('timing');
  if (!duel.manaEssaiDemarre || duel[side].manaChoixEnAttente
    || (!reaction && (!['principale', 'principale2'].includes(duel.phase) || duel.fenetreReponse || duel.combatDeclare || duel.finDeTour))
    || duel.arriveeEnAttente || (duel.effetCreatureEnAttente && !reaction)
    || duel.destructionsEnAttente?.length || duel.defausseEnAttente || duel.siteEnAttente) return fail('timing');
  const ciblee = MOBA_MAGIES_CIBLEES.includes(cardId);
  const soin = MOBA_MAGIES_SOINS.includes(cardId);
  const prix = MOBA_MAGIES_PRIX.includes(cardId);
  const transfert = MOBA_MAGIES_TRANSFERT.includes(cardId);
  if ((!MOBA_MAGIES_ESSAI.includes(cardId) && !MOBA_MAGIES_IMMEDIATES.includes(cardId) && !ciblee && !soin && !prix && !transfert)
    || MOBA_SIDES.some((cote) => duel[cote].creatures.some((e) => !combatAudite(e) || e.arme || e.enCale))) return fail('effet-non-pris-en-charge');
  if (prix) {
    // A transfer with a price has two independent choices: one lane pays,
    // and a possibly different active lane receives the transfer.
    const lanePrix = prixLaneId ?? (transfert ? null : laneId);
    const lane = mobaVoie(duel.moba, lanePrix);
    if (cibleId !== null || !lane?.active || (transfert && !mobaVoie(duel.moba, laneId)?.active)) return fail('cible');
    if (lane.hp[side] <= magieById(cardId).prixPv) return fail('prix');
  } else if (soin || transfert) {
    if (cibleId !== null || !mobaVoie(duel.moba, laneId)?.active) return fail('cible');
  } else if (ciblee && cibleId === 'sorcier') {
    if (!MOBA_MAGIES_VOIES.includes(cardId) || !mobaVoie(duel.moba, laneId)?.active) return fail('cible');
  } else if (ciblee) {
    const cotesCibles = MOBA_MAGIES_NEUTRES.includes(cardId) ? MOBA_SIDES
      : [MOBA_MAGIES_ALLIEES.includes(cardId) ? side : (side === 'joueur' ? 'sorcier' : 'joueur')];
    const cibleSide = cotesCibles.find((cote) => duel.moba.lanes.some((voie) => voie.active && voie.slots[cote].includes(cibleId)));
    if (laneId !== null || !cibleSide || !duel[cibleSide].creatures.some((entity) => entity.id === cibleId)) return fail('cible');
  } else if (cibleId !== null || laneId !== null) return fail('cible');
  const damageEvents = [];
  const healingEvents = [];
  const options = {
    ...(ouvrirReponse && !reaction && !duel.fenetreReponse && MOBA_SORTS_REPONSE.includes(cardId)
      && (MOBA_MAGIES_PIOCHE_REPONSE.includes(cardId) || MOBA_MAGIES_ZONE_REPONSE.includes(cardId) ? cibleId === null && laneId === null
        : soin || transfert ? cibleId === null && !!laneId
        : cibleId === 'sorcier' ? MOBA_MAGIES_VOIES.includes(cardId)
          : cibleId && MOBA_SIDES.some((cote) => duel[cote].creatures.some((entity) => entity.id === cibleId)))
      ? { annoncerSortMoba: true,
        ...(MOBA_MAGIES_PIOCHE_REPONSE.includes(cardId) ? { ciblePiocheMoba: cardId === 'rapport-du-greffier' ? side : (side === 'joueur' ? 'sorcier' : 'joueur') } : {}),
        ...(MOBA_MAGIES_ZONE_REPONSE.includes(cardId) ? { cibleZoneMoba: MOBA_MAGIES_ZONE_TOTALE_REPONSE.includes(cardId) ? 'tous' : (side === 'joueur' ? 'sorcier' : 'joueur') } : {}),
        ...(cibleId === 'sorcier' || soin || transfert
          ? { laneMoba: laneId, nomVoieMoba: NOMS_VOIES[laneId], cibleVoieMoba: true, cibleVoieAllieeMoba: soin } : {}) } : {}),
    ...(transfert ? { mobaLane: laneId, surTransfertMoba: (event) => {
      damageEvents.push({ ...event, laneId, targetSide: side === 'joueur' ? 'sorcier' : 'joueur', cardId, transfert: true });
      healingEvents.push({ laneId, side, cardId, healing: event.healing });
    } } : {}),
    ...(prix ? { payerPrixPv: (amount) => {
      const voiePrix = prixLaneId ?? laneId;
      const payment = mobaPayerPrix(duel.moba, side, voiePrix, amount);
      if (!payment.ok) throw new Error(`Prix MOBA invalide : ${payment.raison}`);
      damageEvents.push({ laneId: voiePrix, targetSide: side, cardId, damage: payment.paid, prix: true });
      return payment;
    } } : {}),
    ...(cibleId === 'sorcier' ? {
      resoudreDegatsSorcier: ({ amount }) => infligerDansVoie(duel, side, laneId, amount, damageEvents, { cardId }),
    } : {}),
    ...(soin ? {
      resoudreSoinSorcier: ({ amount }) => {
        const healing = mobaSoigner(duel.moba, side, laneId, amount);
        if (healing.ok) healingEvents.push({ laneId, side, cardId, ...healing });
        return healing;
      },
    } : {}),
  };
  const result = rpgLancerMagie(duel, side, cardId, cibleId, null, options);
  if (!result.ok) return result;
  if ((duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) && duel.mobaSortEnAttente) {
    const attente = duel.mobaSortEnAttente;
    duel[attente.cote].cimetiere.push(attente.carteId);
    duel.mobaSortEnAttente = null;
    duel.fenetreReponse = false;
  }
  synchroniserSorties(duel);
  let combatTermine = false;
  if (reaction && duel.combatDeclare) {
    const combat = duel.combatDeclare;
    const survivants = combat.attaquants.filter((id) => duel[combat.cote].creatures.some((entity) => entity.id === id));
    if (!survivants.length || duel.moba.winner) {
      duel.attaqueJouee = combat.cote;
      duel.combatDeclare = null;
      duel.fenetreReponse = false;
      duel.phase = 'principale2';
      combatTermine = true;
    } else {
      duel.combatDeclare = { ...combat, attaquants: survivants,
        ciblesAttaque: Object.fromEntries(Object.entries(combat.ciblesAttaque ?? {}).filter(([id]) => survivants.includes(id))) };
    }
  }
  return { ...result, damageEvents, healingEvents, combatTermine };
}
