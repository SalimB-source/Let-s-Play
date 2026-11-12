/**
 * Experimental local-only integration with the real duel engine. The UI uses
 * preconstructed or validated custom decks from an audited pool; most card
 * effects and online play are not yet supported. Never bypass the audit gate.
 */
import { armeById, carteEstArme, cardColors, cardHasPrintedType, duelCardById, lienSatisfait, magieById } from './rpgCards.js';
import { rpgMobaCiblesIndividuelles, rpgMobaCibleIndividuelleEncoreLegale, rpgMobaBonusProvocation } from './rpgMobaAttaqueIndividuelle.js';
import { MOBA_ABORDAGE_IMPRIME, CARTES_COMBAT_AUDITEES } from './rpgMobaAudit.js';
import {
  rpgAppliquerBannieresAttaque, rpgDefausserCarte, rpgDemarrerManaEssai, rpgFinDeTour, rpgJouerCreature, rpgJouerArme,
  rpgEstProtegee, rpgEstProtegeeDesSorts, rpgPeutAttaquer, rpgPeutPayer, rpgConditionEmbuscadeRemplie, rpgConsommerSoinsCreatureMoba, rpgConsommerDegatsCapaciteMoba, rpgConsommerPiochesRetourExilMoba, rpgPriseEnCaleLegale, arriveeACibleLegale,
  rpgResoudreEchangeIndividuelMoba, rpgLancerMagie, rpgMulligan, rpgNouveauDuel, rpgPiocher, rpgPresenterRechercheMoba,
  rpgOuvrirFinDeTour, rpgPreparerDefausseFinDeTour, rpgResoudreSiteCible, rpgDissiperSiteSansCibleMoba, rpgResoudreDestructionCiblee, rpgDissiperDestructionsSansCible, rpgResoudreArriveeCiblee, rpgResoudreEffetCreatureEnAttente, rpgRetirerEntitesConquete,
} from './rpgDuel.js';
import { RPG_MODE_MANA_ESSAI, validerDeckManaEssai } from './rpgManaEssai.js';
import { invocationPossible, limiteInvocationMoba, sacrificesInvocation, victimesInvocation } from './rpgInvocation.js';
import { MOBA_EMBUSCADES_CONDITIONS, rpgMobaConditionSpeciale } from './rpgMobaEmbuscades.js';
import { MOBA_SIDES, mobaInfliger, mobaNouveau, mobaPayerPrix, mobaPlacer, mobaRattacherCentre, mobaRetirer, mobaVoieCombat, mobaVoiesCombat, mobaPartageVoie, mobaVoieJouable, mobaSoigner, mobaVoie } from './rpgMoba.js';

const OFFSETS = Object.freeze({ left: 0, center: 2, right: 3 });
const NOMS_VOIES = Object.freeze({ left: 'la voie gauche', center: 'la voie centrale', right: 'la voie droite' });
// Audited for the experimental combat bridge and the supported arrival and
// scheduled-return paths. Expand with tests as more abilities are adapted.
const JETONS_COMBAT_AUDITES = new Set(['petit-orochi', 'shabti', 'samourai-du-daimyo', 'chien-de-sable', 'corsaire', 'guepard', 'serpent-des-citernes']);
const combatAudite = (entite) => CARTES_COMBAT_AUDITEES.has(entite.carteId)
  || (entite.jeton === true && JETONS_COMBAT_AUDITES.has(entite.carteId));
// Only the explicitly audited printed weapons and Sabre's spell-weapon may
// enter. Printed Vol de vie and the audited sabres are lane-adapted; arbitrary grants stay gated.
export const MOBA_ARMES = Object.freeze(['javelot-du-beffroi', 'cuirasse-de-sel', 'braise-et-sable', 'takouba-des-pistes', 'armure-de-cendres', 'sabre-du-croissant-noir', 'hache-de-la-banquise', 'lance-de-givre', 'khopesh-d-or', 'licou-du-chien-de-sable', 'harnais-du-mehari', 'masque-du-guetteur', 'jitte-d-amayas', 'lance-de-la-lune-givree', 'sandales-de-tislit', 'grappin-d-abordage', 'baton-des-citernes', 'lame-des-ergs', 'takouba-de-tin-hinan', 'sphere-de-rotation']);
const equipementAudite = (entite) => (!entite.arme || MOBA_ARMES.includes(entite.arme.carteId)) && (entite.armes ?? []).every((id) => id === 'sabre-maudit')
  && (!entite.volDeVie || Boolean(duelCardById(entite.carteId)?.volDeVie) || (entite.armes ?? []).includes('sabre-maudit') || entite.arme?.carteId === 'sabre-du-croissant-noir');

// Only captures of audited presences, made by the lane-aware bridge, are
// accepted. The held entity keeps its original assignment but occupies no slot.
const caleAuditee = (duel, cote, entite) => {
  if (!entite.enCale) return true;
  const prisonniere = entite.enCale.entite;
  const proprietaire = cote === 'joueur' ? 'sorcier' : 'joueur';
  return Boolean(prisonniere && prisonniere.id && prisonniere.carteId === entite.enCale.carteId
    && combatAudite(prisonniere) && equipementAudite(prisonniere) && !prisonniere.enCale
    && duel.moba.assignments.some((a) => a.entityId === prisonniere.id && a.side === proprietaire && mobaVoieCombat(duel.moba, proprietaire, a.laneId) === prisonniere.mobaLane)
    && !MOBA_SIDES.some((s) => duel[s].creatures.some((e) => e.id === prisonniere.id)));
};
const fail = (raison) => ({ ok: false, raison });
// Ces sorts exigent une déclaration de blocage, absente des nouvelles règles MOBA.
export const rpgMobaSortBlocageInterdit = (id) => ['appat-de-la-meute', 'embuscade'].includes(id);
export const MOBA_ARRIVEES_ALLIEES = Object.freeze(['gardienne-du-croissant', 'guerrier-au-bouclier-rond', 'veilleuse-des-citernes', 'volva-soigneuse', 'faiseur-de-passage', 'tour-de-sable', 'guetteuse-des-marees']);
export const MOBA_ARRIVEES_HOSTILES = Object.freeze(['lionne-du-midi-ardent', 'maitre-du-marteau', 'vipere-de-verre', 'sonneur-fele', 'corbeau-de-givre', 'la-devoreuse', 'eclipse-silencieuse', 'veilleuse-de-la-lune-givree', 'sentinelle-des-sables', 'traqueur-des-nuits-sans-lune', 'kraken', 'le-cavalier-sans-nom', 'le-cavalier-de-vapeur', 'oni-de-la-fournaise', 'bakunawa', 'cavalier-amazigh-du-desert', 'souverain-de-la-lune-noire', 'tour-de-braise', 'tour-de-neige']);
export const MOBA_ARRIVEES_NEUTRES = Object.freeze(['valkyrie-des-neuf-nuits', 'pere-des-corbeaux', 'maitre-des-corbeaux', 'susanoo']);
// Chercheuse keeps the classic random search for kind === 'arme'.
// Sabre maudit is a magic, not a candidate; only audited printed weapons are.
// Re-audit the search and its UX before enabling further printed weapons.
const MOBA_ARRIVEES_GLOBALES = Object.freeze(['passeur-au-masque-de-chacal', 'lecteur-du-dernier-nom', 'archonte-du-sablier-noir', 'geant-des-banquises', 'leviathan', 'rempart-des-sables-eternels', 'tin-hinan', 'serpent-du-monde', 'celle-qui-pese', 'ibis-des-comptes', 'amayas-du-hoggar', 'jormungandr', 'celui-qui-juge', 'daimyo-du-soleil-rouge', 'tarek', 'guetteur-du-beffroi', 'faussoyeur-des-dunes', 'chercheuse-des-armes-ensevelies', 'braisier-du-souk', 'valkyrie-des-glaces', 'le-cavalier-du-ressac-gele', 'le-cavalier-des-dunes-gelees', 'la-barbe-rousse', 'salem', 'kusayla-roi-des-imazighen', 'dame-aux-ailes-d-or', 'tour-des-tenebres', 'porte-etendard-de-leclipse', 'sanguinaire-des-dunes']);
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
// Non-targeted effects; spatial ones choose a lane before casting, while
// hand and deck effects still resolve directly.
export const MOBA_MAGIES_IMMEDIATES = Object.freeze([
  'tempete-de-sable', 'brisure-de-verre', 'vent-rouge', 'rapport-du-greffier',
  'les-feuillets', 'la-derniere-pesee', 'ressac-de-la-lune-noire', 'nuage-de-cendres', 'serment-de-la-forge', 'nom-efface', 'le-routier', 'embuscade', 'lettre-de-marque', 'le-grand-debarquement',
]);
// Sorts audités, uniquement en phase principale et sans réponse imbriquée.
const MOBA_MAGIES_MAIN_REPONSE = Object.freeze(['nom-efface']);
const MOBA_MAGIES_PIOCHE_REPONSE = Object.freeze(['rapport-du-greffier', 'les-feuillets', 'le-routier', 'papyrus', 'lettre-de-marque']);
export const MOBA_MAGIES_RENFORT_REPONSE = Object.freeze(['mur-de-boucliers', 'serment-de-la-forge', 'rempart-de-dunes', 'offrande-de-lin', 'le-grand-debarquement']);
export const MOBA_MAGIES_ZONE_TOTALE_REPONSE = Object.freeze([
  'grand-hiver', 'tempete-de-foudre-et-de-givre', 'la-derniere-pesee', 'ressac-de-la-lune-noire', 'neige-noire',
]);
export const MOBA_MAGIES_ZONE_REPONSE = Object.freeze([
  'tempete-de-sable', 'vent-rouge', 'brisure-de-verre',
  'brume-du-fjord', 'hurlement-du-blizzard', 'verglas', 'nuage-de-cendres', 'embuscade',
  ...MOBA_MAGIES_ZONE_TOTALE_REPONSE,
]);
// Spatial spells pick exactly one active lane, independently of any PV payment.
export const MOBA_MAGIES_SPATIALES = Object.freeze([
  ...MOBA_MAGIES_ZONE_REPONSE, ...MOBA_MAGIES_RENFORT_REPONSE, 'grand-voile-blanc',
]);
export const MOBA_SORTS_REPONSE = Object.freeze([
  'poigne-de-givre', 'ressac', 'eclair-du-marteau', 'trait-de-braise',
  'appat-de-la-meute', 'frappe-iaijutsu', 'courant-de-retour', 'haut-fond', 'lame-de-mer',
  'effacement-des-faibles', 'le-jugement-des-colosses', 'parade-du-verre', 'voile-de-la-lune-noire', 'feux-de-kitsune', 'defi-du-jarl', 'reanimation', 'sabre-maudit', 'memoire-de-l-armurerie', 'brise-lame',
  'eau-de-la-source', 'festin-des-vaillants', 'le-poids', 'la-grande-pesee', 'grand-voile-blanc',
  ...MOBA_MAGIES_PIOCHE_REPONSE, ...MOBA_MAGIES_MAIN_REPONSE, ...MOBA_MAGIES_ZONE_REPONSE, ...MOBA_MAGIES_RENFORT_REPONSE,
]);
// These counters only respond to a pending MOBA spell, never to creatures,
// combat, arrivals or another response. No general stack is introduced.
export const MOBA_CONTRESORTS = Object.freeze(['silence-decume', 'maree-contraire', 'ecueil', 'contresort-des-abimes']);
export const MOBA_MAGIES_VOIES = Object.freeze(['eclair-du-marteau', 'trait-de-braise']);
export const MOBA_MAGIES_TRANSFERT = Object.freeze(['le-poids', 'la-grande-pesee']);
export const MOBA_MAGIES_SOINS = Object.freeze(['festin-des-vaillants', 'eau-de-la-source']);
export const MOBA_MAGIES_PRIX = Object.freeze(['papyrus', 'neige-noire', 'offrande-de-lin', 'la-grande-pesee']);
export const MOBA_MAGIES_REANIMATION = Object.freeze(['reanimation']);
export const MOBA_MAGIES_NEUTRES = Object.freeze(['effacement-des-faibles', 'le-jugement-des-colosses']);
export const MOBA_MAGIES_ALLIEES = Object.freeze(['parade-du-verre', 'voile-de-la-lune-noire', 'sabre-maudit', 'memoire-de-l-armurerie']);
export const MOBA_MAGIES_CIBLEES = Object.freeze([
  'poigne-de-givre', 'ressac', 'appat-de-la-meute', 'frappe-iaijutsu', 'courant-de-retour', 'haut-fond', 'lame-de-mer', 'feux-de-kitsune', 'defi-du-jarl', 'brise-lame',
  ...MOBA_MAGIES_VOIES, ...MOBA_MAGIES_ALLIEES, ...MOBA_MAGIES_NEUTRES,
]);
const ancienDeckEssai = Object.freeze([
  ...MOBA_CARTES_ESSAI.flatMap((id) => ['anqa-des-braises', 'viking-des-neiges'].includes(id) ? [id] : [id, id]),
  ...MOBA_MAGIES_ESSAI.filter((id) => id !== 'rempart-de-dunes').flatMap((id) =>
    ['mur-de-boucliers', 'grand-voile-blanc', 'grand-hiver', 'verglas', 'brume-du-fjord'].includes(id) ? [id] : [id, id]),
  'poigne-de-givre', 'poigne-de-givre', ...MOBA_MAGIES_VOIES, 'festin-des-vaillants',
]);
let nombreGardiennes = 0;
let nombrePoignes = 0;
const deckSources = ancienDeckEssai.map((id) => {
  if (id === 'mousse-des-galiotes') return 'porteuse-de-cruches';
  if (id === 'gardienne-des-portes-de-sable') return nombreGardiennes++ === 0 ? 'eau-de-la-source' : 'festin-des-vaillants';
  if (id === 'poigne-de-givre') return nombrePoignes++ === 0 ? 'ressac' : 'parade-du-verre';
  return id;
});
const deckSahir = [...ancienDeckEssai];
deckSahir[deckSahir.indexOf('ashigaru-des-braises')] = 'sahir-des-braises';
deckSahir[deckSahir.indexOf('brume-du-fjord')] = 'rempart-de-dunes';
deckSahir[deckSahir.indexOf('viking-des-neiges')] = 'guerrier-au-bouclier-rond';
const deckLionne = [...deckSources];
deckLionne[deckLionne.indexOf('jarl-au-marteau-de-guerre')] = 'lionne-du-midi-ardent';
deckLionne[deckLionne.indexOf('anqa-des-braises')] = 'maitre-du-marteau';
const deckPapyrus = ancienDeckEssai.map((id) => id === 'mousse-des-galiotes' ? 'guerrier-au-bouclier-rond'
  : id === 'gardienne-des-portes-de-sable' ? 'papyrus' : id);
// Keep each preconstructed deck's theme while replacing its third colour.
const sansBraise = (id) => ({
  'ashigaru-des-braises': 'scalde-des-runes',
  'anqa-des-braises': 'geant-des-banquises',
  'tempete-de-foudre-et-de-givre': 'defi-du-jarl',
  'trait-de-braise': 'hache-de-la-banquise',
}[id] ?? id);
export const MOBA_DECK_ESSAI = Object.freeze(ancienDeckEssai.map(sansBraise));
const sourcesBicolore = deckSources.map(sansBraise);
const papyrusBicolore = deckPapyrus.map(sansBraise);
const sahirBicolore = deckSahir.map((id) => ({
  'mousse-des-galiotes': 'scalde-des-runes',
  'gardienne-des-portes-de-sable': 'volva-soigneuse',
  'rempart-de-dunes': 'mur-de-boucliers',
}[id] ?? id));
const lionneBicolore = deckLionne.map((id) => ({
  'porteuse-de-cruches': 'guerrier-au-bouclier-rond',
  'eau-de-la-source': 'hache-de-la-banquise',
  'ressac': 'defi-du-jarl',
  'parade-du-verre': 'lance-de-givre',
}[id] ?? id));
export const MOBA_DECKS = Object.freeze([
  Object.freeze({ id: 'sable', name: 'Sable et givre', description: 'Gardiennes et assauts des neiges.', elements: Object.freeze(['neige', 'sable']), cardIds: MOBA_DECK_ESSAI }),
  Object.freeze({ id: 'sources', name: 'Sources et givre', description: 'Soins de voie, Ressac et Parade de verre.', elements: Object.freeze(['neige', 'eau']), cardIds: Object.freeze(sourcesBicolore) }),
  Object.freeze({ id: 'sahir', name: 'Le cercle des braises', description: 'Sahir pioche et frappe ; les guerriers et les boucliers protègent vos créatures.', elements: Object.freeze(['neige', 'braise']), cardIds: Object.freeze(sahirBicolore) }),
  Object.freeze({ id: 'lionne', name: 'Le givre ardent', description: 'La Lionne et le Maître frappent à leur arrivée ; les guerriers protègent vos voies.', elements: Object.freeze(['neige', 'braise']), cardIds: Object.freeze(lionneBicolore) }),
  Object.freeze({ id: 'papyrus', name: 'Les serments du papyrus', description: 'Payez des PV de voie pour piocher et protégez vos guerriers.', elements: Object.freeze(['neige', 'tenebres']), cardIds: Object.freeze(papyrusBicolore) }),
]);

/** Only this audited pool may be used by a player-built MOBA deck. */
export const MOBA_CARTES_AUTORISEES = Object.freeze([...new Set([
  ...CARTES_COMBAT_AUDITEES, ...MOBA_ARMES, ...MOBA_MAGIES_ESSAI, ...MOBA_MAGIES_IMMEDIATES, ...MOBA_MAGIES_CIBLEES, ...MOBA_MAGIES_SOINS, ...MOBA_MAGIES_PRIX, ...MOBA_MAGIES_TRANSFERT, ...MOBA_MAGIES_REANIMATION, ...MOBA_CONTRESORTS,
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

/** Quotas d'annonces par camp et par tour, y compris les réponses. */
export function rpgMobaLimiteCarte(duel, side, carte) {
  if (!duel?.moba || !MOBA_SIDES.includes(side) || !carte) return null;
  if (carteEstArme(carte) && duel.moba.armesJouees?.[side]) return 'arme-limite';
  if (carte.kind === 'magie' && !carteEstArme(carte) && duel.moba.sortsJoues?.[side]) return 'sort-limite';
  return limiteInvocationMoba(duel, side, carte);
}

/** Whether a displayed card can be paid, including a legal lane for life prices. */
export function rpgMobaPeutPayer(duel, side, carte) {
  if (!duel?.moba || !MOBA_SIDES.includes(side) || !carte) return false;
  const speciale = ['creature', 'hero'].includes(carte.kind) && rpgMobaPeutEmbuscade(duel, side, carte.id);
  if ((!speciale && rpgMobaLimiteCarte(duel, side, carte)) || !invocationPossible(duel, side, carte, speciale)) return false;
  if (!MOBA_MAGIES_PRIX.includes(carte.id)) return rpgPeutPayer(duel[side], carte);
  return rpgPeutPayer(duel[side], carte, { ignorerPrixPv: true })
    && duel.moba.lanes.some((lane) => lane.active && lane.hp[side] > carte.prixPv);
}

/** La même lecture du coût que la pose : la condition spéciale dispense de sacrifice. */
export function rpgMobaSacrificesInvocation(duel, side, carte) {
  return sacrificesInvocation(carte, duel, side, rpgMobaPeutEmbuscade(duel, side, carte?.id));
}

/** Two human-controlled seats reuse the turn engine, without mana costs or growth.
 * `pvp` is the engine's manual-control flag; no network or referee is used. */
export function rpgMobaNouveauDuel(options = {}) {
  const duel = rpgNouveauDuel({ ...options, modeMana: RPG_MODE_MANA_ESSAI, pvp: true });
  duel.moba = mobaNouveau();
  duel.moba.creaturesJouees = { joueur: false, sorcier: false };
  duel.moba.embuscadesJouees = { joueur: false, sorcier: false };
  duel.moba.sortsJoues = { joueur: false, sorcier: false };
  duel.moba.armesJouees = { joueur: false, sorcier: false };
  for (const side of MOBA_SIDES) { duel[side].mobaSansMana = true; duel[side].manaChoixEnAttente = false; }
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
  if (!rpgMobaPlacementCoherent(duel) || duel.destructionsEnAttente?.length || duel.mobaRechercheEnAttente?.cote !== side) return fail('timing');
  if (!rpgMobaCandidatsRecherche(duel, side).includes(cardId)) return fail('cible');
  const [id] = duel[side].deck.splice(duel[side].deck.indexOf(cardId), 1);
  duel[side].main.push(id);
  rpgPresenterRechercheMoba(duel, side, id);
  const source = duelCardById(duel.mobaRechercheEnAttente.sourceCarteId)?.name ?? 'La capacité';
  // Do not leak the AI's searched card through the shared log.
  duel.log.push(`${source} trouve une carte dans son deck et l’ajoute à sa main.`);
  duel.mobaRechercheEnAttente = null;
  synchroniserSorties(duel);
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
  rpgConsommerSoinsCreatureMoba(duel);
  rpgConsommerDegatsCapaciteMoba(duel);
  rpgConsommerPiochesRetourExilMoba(duel);
  rpgFinDeTour(duel);
  const healingEvents = rpgConsommerSoinsCreatureMoba(duel);
  const damageEvents = rpgConsommerDegatsCapaciteMoba(duel);
  const drawEvents = rpgConsommerPiochesRetourExilMoba(duel);
  // Une capacité de retour peut détruire des créatures d'autres voies.
  synchroniserSorties(duel);
  return duel.tour !== avant || duel.moba.winner || duel.transitionRetours ? { ok: true, tour: duel.tour, ...(duel.arriveeEnAttente ? { arriveeEnAttente: true } : {}), ...(healingEvents.length ? { healingEvents } : {}), ...(damageEvents.length ? { damageEvents } : {}), ...(drawEvents.length ? { drawEvents } : {}) } : fail('timing');
}

export function rpgMobaDefausser(duel, side, index) {
  if (duel?.mobaRechercheEnAttente) return fail('timing');
  if (!duel?.moba || duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return fail('partie-terminee');
  if (!MOBA_SIDES.includes(side) || !rpgMobaPlacementCoherent(duel) || duel.destructionsEnAttente?.length
    || duel.defausseEnAttente?.cote !== side
    || (duel.defausseEnAttente.motif === 'fin-de-tour' && duel.tour !== side)) return fail('timing');
  if (!Number.isInteger(index) || index < 0 || index >= duel[side].main.length) return fail('hors-main');
  const result = rpgDefausserCarte(duel, side, index);
  if (!result.ok) return result;
  return { ok: true, restant: duel.defausseEnAttente?.restant ?? 0, carteId: result.carteId };
}

/** The Source targets a creature, not another Site, in any active allied lane. */
export function rpgMobaCiblesSite(duel, side) {
  if (!duel?.moba || duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul
    || !MOBA_SIDES.includes(side) || duel.siteEnAttente?.cote !== side) return [];
  const sourceLane = duel[side].creatures.find((e) => e.id === duel.siteEnAttente.entiteId)?.mobaLane;
  return duel[side].creatures.filter((entite) => (!sourceLane || mobaPartageVoie(duel.moba, entite.mobaLane, sourceLane)) && duelCardById(entite.carteId)?.kind !== 'site'
    && mobaVoiesCombat(duel.moba, entite.mobaLane).length > 0).map((entite) => entite.id);
}

export function rpgMobaResoudreSite(duel, side, cibleId) {
  if (!duel?.moba || duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return fail('partie-terminee');
  if (!rpgMobaPlacementCoherent(duel)) return fail('etat-incoherent');
  if (duel.destructionsEnAttente?.length || duel.mobaRechercheEnAttente || duel.defausseEnAttente) return fail('timing');
  if (!rpgMobaCiblesSite(duel, side).includes(cibleId)) return fail('cible');
  rpgConsommerSoinsCreatureMoba(duel); rpgConsommerDegatsCapaciteMoba(duel);
  const result = rpgResoudreSiteCible(duel, side, cibleId);
  if (!result.ok) return result;
  const healingEvents = rpgConsommerSoinsCreatureMoba(duel);
  const damageEvents = rpgConsommerDegatsCapaciteMoba(duel);
  synchroniserSorties(duel);
  return { ...result, healingEvents, damageEvents };
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
  // A simultaneous wave can remove the last target after the trigger was
  // queued. Never strand the board behind an impossible choice.
  rpgDissiperDestructionsSansCible(duel);
  if (rpgDissiperSiteSansCibleMoba(duel)) synchroniserSorties(duel);
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
        if ((!lane.active && !(lane.id === 'center' && lane.conqueredBy === side && (duel.moba.centerChoice === side || duel.moba.centerJoined?.side === side))) || occupied.has(id)) return false;
        const entity = entities.find((candidate) => candidate.id === id);
        if (!entity || entity.emplacement !== OFFSETS[lane.id] + slot || entity.mobaLane !== mobaVoieCombat(duel.moba, side, lane.id)) return false;
        occupied.add(id);
      }
    }
    if (occupied.size !== entities.length) return false;
  }
  return true;
}

/** Attach only the conqueror's surviving central creature to an active side lane.
 * Its physical central slot and permanent original assignment remain intact. */
export function rpgMobaChoisirVoieCentrale(duel, side, laneId) {
  if (!rpgMobaPlacementCoherent(duel)) return fail('etat-incoherent');
  const result = mobaRattacherCentre(duel.moba, side, laneId);
  if (!result.ok) return result;
  for (const id of mobaVoie(duel.moba, 'center').slots[side]) {
    const entity = duel[side].creatures.find((item) => item.id === id);
    if (entity) entity.mobaLane = laneId;
  }
  return result;
}

// These audited Embuscades can use the bounded combat response path.
// Offered boarding still needs its own off-turn arrival adaptation.
export const MOBA_EMBUSCADES_COMBAT = Object.freeze(['tojiro-le-pourfendeur', 'sanguinaire-des-dunes', 'gardienne-du-croissant', 'porte-etendard-de-leclipse', 'garde-du-trone-givre', 'eclipse-silencieuse', 'veilleuse-de-la-lune-givree', 'sentinelle-des-sables', 'traqueur-des-nuits-sans-lune']);
export function rpgMobaPeutEmbuscade(duel, side, cardId) {
  const carte = duelCardById(cardId);
  if (!duel?.moba || !MOBA_SIDES.includes(side) || !carte || carte.conditionEmbuscade === 'deux-attaquants') return false;
  const nouvelle = rpgMobaConditionSpeciale(duel, side, cardId);
  const annonce = duel.mobaCreatureEnAttente;
  const sorcier = cardId === 'sorcier-du-ressac-noir' && annonce && !annonce.embuscadeCombat && !annonce.embuscadeSuspendue && !annonce.origineCreature
    && annonce.cote === duel.tour && annonce.cote !== side && ['creature', 'hero'].includes((duelCardById(annonce.carteId)?.kind ?? 'creature'));
  const generale = ['sanguinaire-des-dunes', 'tojiro-le-pourfendeur'].includes(cardId);
  const menace = !duel.mobaReponseSuspendue && ((cardId === 'gardienne-du-croissant' && !annonce
    && ((duel.mobaSortEnAttente?.cote === duel.tour && !duel.mobaSortEnAttente.armeMoba)
      || duel.effetCreatureEnAttente?.cote === duel.tour))
    || ((generale || nouvelle) && ((annonce?.cote === duel.tour && !annonce.embuscadeCombat && !annonce.embuscadeSuspendue && !annonce.origineCreature)
      || duel.mobaSortEnAttente?.cote === duel.tour || duel.effetCreatureEnAttente?.cote === duel.tour
      || (duel.finDeTour?.cote === duel.tour && duel.phase === 'fin'))));
  const combat = (MOBA_EMBUSCADES_COMBAT.includes(cardId) || nouvelle) && duel.phase === 'blocage'
    && duel.combatDeclare?.cote === duel.tour && !annonce && !duel.mobaReponseSuspendue
    && (!duel.combatDeclare.blocages || nouvelle || ['porte-etendard-de-leclipse', 'gardienne-du-croissant', 'sanguinaire-des-dunes', 'tojiro-le-pourfendeur'].includes(cardId));
  const tourPropre = side === duel.tour;
  const fenetre = tourPropre
    ? nouvelle && ['principale', 'principale2'].includes(duel.phase) && !duel.fenetreReponse
      && !annonce && !duel.mobaSortEnAttente && !duel.finDeTour && !duel.combatDeclare && !duel.effetCreatureEnAttente
    : (combat || sorcier || menace) && duel.fenetreReponse
      && (!duel.mobaSortEnAttente || menace) && (!duel.effetCreatureEnAttente || menace)
      && (sorcier || nouvelle || rpgConditionEmbuscadeRemplie(duel, side, carte));
  return Boolean(fenetre && !duel.moba.winner && !duel.fin?.gagnant && !duel.fin?.nul && !duel.moba.centerChoice
    && duel.manaEssaiDemarre && !duel.arriveeEnAttente && !duel.destructionsEnAttente?.length
    && !duel.defausseEnAttente && !duel.siteEnAttente && !duel.mobaRechercheEnAttente
    && !duel[side].manaChoixEnAttente && !duel[side].prochaineArriveeAbordage && !duel[side].abordageDesArrivees
    && duel[side].main.includes(cardId) && rpgPeutPayer(duel[side], carte)
    && invocationPossible(duel, side, carte, true) && rpgMobaPlacementCoherent(duel)
    && duel.moba.lanes.some((lane) => mobaVoieJouable(duel.moba, side, lane.id)
      && lane.slots[side].some((id) => id === null)));
}

/** Place a creature from the active player's hand using the engine's payment,
 * restrictions, entity creation and aura recalculation. Effects requiring lane
 * semantics are temporarily rejected rather than executed incorrectly. */
export function rpgMobaJouerCreature(duel, side, cardId, laneId, slot, { ouvrirReponse = false, resoudreEnAttente = false, sacrificeIds = null } = {}) {
  if (duel?.mobaRechercheEnAttente) return fail('timing');
  if (!rpgMobaPlacementCoherent(duel)) return fail('etat-incoherent');
  if (duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return fail('partie-terminee');
  if (!MOBA_SIDES.includes(side)) return fail('pas-votre-tour');
  const attente = resoudreEnAttente && duel.mobaCreatureEnAttente;
  const speciale = resoudreEnAttente ? Boolean(attente?.invocationSpecialeMoba || attente?.embuscadeCombat || attente?.embuscadeSuspendue || attente?.origineCreature)
    : rpgMobaPeutEmbuscade(duel, side, cardId);
  const reaction = side !== duel.tour && (Boolean(attente?.embuscadeCombat || attente?.embuscadeSuspendue || attente?.origineCreature) || speciale);
  if (duel.tour !== side && !reaction) return fail('pas-votre-tour');
  // Always offer a response to an off-turn summon; no silent direct placement.
  if (reaction && !resoudreEnAttente && !ouvrirReponse) return fail('timing');
  if (resoudreEnAttente && (!attente || attente.cote !== side || attente.carteId !== cardId || attente.laneId !== laneId || attente.slot !== slot || !duel.fenetreReponse)) return fail('timing');
  if (!duel.manaEssaiDemarre || duel[side].manaChoixEnAttente
    || (!reaction && !['principale', 'principale2'].includes(duel.phase))
    || (duel.fenetreReponse && !attente && !reaction) || (duel.finDeTour && !(reaction && (Object.hasOwn(MOBA_EMBUSCADES_CONDITIONS, cardId) || ['sanguinaire-des-dunes', 'tojiro-le-pourfendeur'].includes(cardId)) && !resoudreEnAttente)) || (duel.combatDeclare && !reaction)
    || duel.arriveeEnAttente || (duel.effetCreatureEnAttente && !(reaction && (Object.hasOwn(MOBA_EMBUSCADES_CONDITIONS, cardId) || ['gardienne-du-croissant', 'sanguinaire-des-dunes', 'tojiro-le-pourfendeur'].includes(cardId)) && !resoudreEnAttente))
    || duel.destructionsEnAttente?.length || duel.defausseEnAttente || duel.siteEnAttente) return fail('timing');
  const lane = mobaVoie(duel.moba, laneId);
  if (!mobaVoieJouable(duel.moba, side, laneId)) return fail('voie-inactive');
  const sacrificesDemandes = resoudreEnAttente ? attente.sacrificeIds : sacrificeIds;
  if (!Number.isInteger(slot) || slot < 0 || slot >= lane.slots[side].length
    || (lane.slots[side][slot] !== null && !sacrificesDemandes?.includes(lane.slots[side][slot]))) return fail('emplacement');
  const carte = duelCardById(cardId);
  if (!carte) return fail('carte');
  // A card with unaudited combat or leave-play abilities must never enter the
  // local game: accepting it could later deadlock the only combat phase.
  if (!CARTES_COMBAT_AUDITEES.has(cardId) || (carte.reactionTourAdverse && !MOBA_EMBUSCADES_COMBAT.includes(cardId) && cardId !== 'sorcier-du-ressac-noir')) return fail('effet-non-pris-en-charge');
  // Porteuse heals her own lane; audited shields and damage use the engine's
  // deferred arrival choices. Other arrivals remain gated until audited.
  const soinArrivee = ['porteuse-de-cruches', 'yamina', 'dame-des-neuf-mondes', 'tour-des-flots'].includes(cardId);
  const arriveeCiblee = MOBA_ARRIVEES_ALLIEES.includes(cardId) || MOBA_ARRIVEES_HOSTILES.includes(cardId) || MOBA_ARRIVEES_NEUTRES.includes(cardId);
  const arriveeGlobale = MOBA_ARRIVEES_GLOBALES.includes(cardId) || ['tiziri-du-djurdjura', 'pilote-de-la-carreira', 'pretre-de-la-bouche'].includes(cardId);
  if ((carte.arrivee && carte.arrivee.type !== 'pioche' && !soinArrivee && !arriveeCiblee && !arriveeGlobale) || (Number.isFinite(carte.abordage) && !MOBA_ABORDAGE_IMPRIME.includes(cardId)) || carte.interceptionAttaque
    || carte.prixPv || (carte.kind !== 'site' && duel[side].abordageDesArrivees)) return fail('effet-non-pris-en-charge');
  // Une invocation payée par sacrifice prend physiquement la place d'une
  // des victimes choisies, y compris après la fenêtre de réponse. Laisser le
  // moteur commun signaler les listes de victimes manquantes ou invalides.
  const nombreSacrifices = resoudreEnAttente ? attente.sacrificeIds.length : sacrificesInvocation(carte, duel, side, speciale);
  if (nombreSacrifices && sacrificesDemandes === null) return { ok: false, raison: 'sacrifice-requis', nombreSacrifices };
  if (nombreSacrifices && Array.isArray(sacrificesDemandes)
    && sacrificesDemandes.length === nombreSacrifices
    && new Set(sacrificesDemandes).size === nombreSacrifices
    && sacrificesDemandes.every((id) => victimesInvocation(duel[side]).some((e) => e.id === id))
    && !sacrificesDemandes.includes(lane.slots[side][slot])) return fail('emplacement-sacrifice');
  const before = JSON.stringify(duel);
  const restore = () => {
    const snapshot = JSON.parse(before);
    for (const key of Object.keys(duel)) delete duel[key];
    Object.assign(duel, snapshot);
  };
  try {
    const damageEvents = [];
    const healingEvents = [];
    rpgConsommerSoinsCreatureMoba(duel);
    rpgConsommerDegatsCapaciteMoba(duel);
    const reponseSuspendue = reaction && !resoudreEnAttente && (Object.hasOwn(MOBA_EMBUSCADES_CONDITIONS, cardId) || ['gardienne-du-croissant', 'sanguinaire-des-dunes', 'tojiro-le-pourfendeur'].includes(cardId))
      ? (duel.mobaSortEnAttente ? { type: 'sort', attente: duel.mobaSortEnAttente }
        : duel.effetCreatureEnAttente ? { type: 'effet', attente: duel.effetCreatureEnAttente }
        : duel.mobaCreatureEnAttente ? { type: 'creature', attente: duel.mobaCreatureEnAttente }
        : duel.finDeTour ? { type: 'fin', attente: duel.finDeTour } : null) : null;
    const origineCreature = reaction && cardId === 'sorcier-du-ressac-noir' ? (attente?.origineCreature ?? duel.mobaCreatureEnAttente) : null;
    const result = rpgJouerCreature(duel, side, cardId, null, {
      emplacement: OFFSETS[laneId] + slot,
      invocationSpecialeMoba: speciale,
      ...(sacrificesDemandes !== null ? { sacrificeIds: sacrificesDemandes } : {}),
      ...(ouvrirReponse && !resoudreEnAttente ? { annoncerCreatureMoba: { laneId, slot, nomVoie: NOMS_VOIES[laneId], ...(reaction ? (origineCreature ? { origineCreature } : reponseSuspendue ? { embuscadeSuspendue: true } : { embuscadeCombat: true }) : {}) } } : {}),
      ...(resoudreEnAttente ? { resoudreCreatureMoba: true } : {}),
      ...(origineCreature ? { annonceCreatureMobaOrigine: origineCreature } : {}),
      peutPlacerApresSacrifices: () => !duel.moba.winner && mobaVoieJouable(duel.moba, side, laneId),
      onEntitePlacee: (entite) => {
        entite.mobaLane = mobaVoieCombat(duel.moba, side, laneId);
        synchroniserSorties(duel); // Release sacrificed physical slots before placement.
        if (!mobaPlacer(duel.moba, side, laneId, slot, entite.id).ok) throw new Error('Placement MOBA incohérent');
      },
      ...((arriveeCiblee || ((duel[side].prochaineArriveeAbordage || Number.isFinite(carte.abordage)) && (ouvrirReponse || resoudreEnAttente))) ? { cibleDifferee: true } : {}),
      ...(soinArrivee ? { resoudreSoinSorcier: ({ amount }) => {
        const resultats = mobaVoiesCombat(duel.moba, laneId).map((voie) => {
          const result = mobaSoigner(duel.moba, side, voie, amount);
          if (result.ok) healingEvents.push({ laneId: voie, side, cardId, ...result });
          return result;
        });
        return { ok: resultats.some((result) => result.ok), healing: resultats.reduce((n, result) => n + (result.healing ?? 0), 0) };
      } } : {}),
      ...(cardId === 'braisier-du-souk' ? { resoudreDegatsSorcier: ({ amount }) => {
        synchroniserSorties(duel);
        const resultats = mobaVoiesCombat(duel.moba, laneId).map((voie) => infligerDansVoie(duel, side, voie, amount, damageEvents, { cardId }));
        return { recus: resultats.reduce((n, result) => n + (result.recus ?? 0), 0), terminerCombat: resultats.some((result) => result.terminerCombat) };
      } } : {}),
    });
    // The supported path reaches no payment or other mutation when refused;
    // keep the original object references intact for the local controller.
    healingEvents.push(...rpgConsommerSoinsCreatureMoba(duel));
    damageEvents.push(...rpgConsommerDegatsCapaciteMoba(duel));
    if (!result.ok) return result;
    if (result.creatureEnAttente) {
      if (reponseSuspendue) {
        duel.mobaReponseSuspendue = reponseSuspendue;
        if (reponseSuspendue.type === 'sort') duel.mobaSortEnAttente = null;
        else if (reponseSuspendue.type === 'effet') duel.effetCreatureEnAttente = null;
        else if (reponseSuspendue.type === 'fin') duel.finDeTour = null;
        // Une annonce de créature est remplacée par l'annonce imbriquée.

      }
      return result;
    }
    if (attente) {
      duel.mobaCreatureEnAttente = null; duel.fenetreReponse = Boolean(attente.embuscadeCombat && duel.combatDeclare);
      if (attente.origineCreature) {
        duel[attente.origineCreature.cote].cimetiere.push(attente.origineCreature.carteId);
        duel.log.push(`${carte.name} contre ${duelCardById(attente.origineCreature.carteId)?.name ?? 'la créature'} avant son arrivée.`);
      }
    }
    if (result.dissipe) {
      if (attente?.embuscadeSuspendue) reprendreReponseSuspendue(duel);
      synchroniserSorties(duel);
      return { ...result, damageEvents, healingEvents };
    }
    // Only audited arrivals are permitted above; still fail closed if engine
    // state actions removed another entity or added an unexpected one.
    synchroniserSorties(duel);
    normaliserArriveeMoba(duel);
    if (attente?.embuscadeCombat || attente?.embuscadeSuspendue) reconcilerCombatDeclare(duel);
    if ((attente?.embuscadeCombat || attente?.embuscadeSuspendue) && duel.arriveeEnAttente) duel.mobaEmbuscadeArrivee = true;
    if (attente?.embuscadeSuspendue && !duel.arriveeEnAttente && !duel.effetCreatureEnAttente) reprendreReponseSuspendue(duel);
    if (result.arriveeEnAttente && !duel.arriveeEnAttente) result.arriveeEnAttente = false;
    // An immediate death caused by the arrival is a valid resolved play, not
    // a failed placement. Unexpected extra entities still fail closed.
    if (!result.entite || !rpgMobaPlacementCoherent(duel)) {
      restore();
      return fail('effet-non-pris-en-charge');
    }
    return { ...result, damageEvents, healingEvents };
  } catch (error) {
    restore();
    throw error;
  }
}

// Réactive uniquement l'annonce mise de côté par l'Embuscade, sans la payer
// une seconde fois. La priorité revient au défenseur de cette annonce.
function reprendreReponseSuspendue(duel) {
  const suspendue = duel.mobaReponseSuspendue;
  if (!suspendue) return;
  duel.mobaReponseSuspendue = null;
  if (duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) {
    if (['sort', 'creature'].includes(suspendue.type)) duel[suspendue.attente.cote].cimetiere.push(suspendue.attente.carteId);
    return;
  }
  if (suspendue.type === 'sort') duel.mobaSortEnAttente = suspendue.attente;
  else if (suspendue.type === 'creature') duel.mobaCreatureEnAttente = suspendue.attente;
  else if (suspendue.type === 'fin') duel.finDeTour = suspendue.attente;
  else duel.effetCreatureEnAttente = suspendue.attente;
  duel.fenetreReponse = true;
}

/** Resolve a paid creature announcement without reopening a response to the
 * card itself. Targeted arrival choices happen afterward as a separate step. */
export function rpgMobaPasserCreature(duel, side) {
  if (!rpgMobaPlacementCoherent(duel)) return fail('etat-incoherent');
  const attente = duel.mobaCreatureEnAttente;
  if (!attente || side !== (attente.cote === 'joueur' ? 'sorcier' : 'joueur') || (attente.cote !== duel.tour && !attente.embuscadeCombat && !attente.embuscadeSuspendue && !attente.origineCreature)
    || !duel.fenetreReponse || duel.defausseEnAttente || duel.mobaRechercheEnAttente || duel.destructionsEnAttente?.length || duel.moba.winner) return fail('aucune-creature');
  const lane = mobaVoie(duel.moba, attente.laneId);
  if (!mobaVoieJouable(duel.moba, attente.cote, attente.laneId)
    || (lane.slots[attente.cote][attente.slot] !== null && !attente.sacrificeIds?.includes(lane.slots[attente.cote][attente.slot]))) {
    duel[attente.cote].cimetiere.push(attente.carteId);
    duel.log.push(`La case de ${duelCardById(attente.carteId)?.name ?? 'la créature'} n'est plus disponible : elle ne peut pas entrer.`);
    duel.mobaCreatureEnAttente = attente.origineCreature ?? null; duel.fenetreReponse = Boolean(attente.origineCreature || (attente.embuscadeCombat && duel.combatDeclare));
    if (attente.embuscadeSuspendue) reprendreReponseSuspendue(duel);
    return { ok: true, dissipe: true };
  }
  const result = rpgMobaJouerCreature(duel, attente.cote, attente.carteId, attente.laneId, attente.slot, { resoudreEnAttente: true });
  if (!result.ok && duel.mobaCreatureEnAttente === attente) {
    duel[attente.cote].cimetiere.push(attente.carteId);
    duel.log.push(`${duelCardById(attente.carteId)?.name ?? 'La créature'} ne peut plus entrer : elle est mise au cimetière.`);
    duel.mobaCreatureEnAttente = attente.origineCreature ?? null; duel.fenetreReponse = Boolean(attente.origineCreature || (attente.embuscadeCombat && duel.combatDeclare));
    if (attente.embuscadeSuspendue) reprendreReponseSuspendue(duel);
    return { ok: true, dissipe: true };
  }
  return result;
}

/** Boarding is resolved first, then any separate printed targeted arrival.
 * This prevents nested response windows and provides an explicit, legal
 * target list shared by the UI, AI, and authoritative adapter. */
export function rpgMobaCiblesPrise(duel, side) {
  const attente = duel?.arriveeEnAttente;
  if (!attente || attente.cote !== side || !Number.isFinite(attente.abordage)) return [];
  const source = duel[side]?.creatures.find((e) => e.id === attente.entiteId);
  if (!source || source.enCale) return [];
  const ennemi = side === 'joueur' ? 'sorcier' : 'joueur';
  const couleurs = cardColors(duelCardById(attente.carteId));
  return duel[ennemi].creatures.filter((e) => mobaPartageVoie(duel.moba, e.mobaLane, source.mobaLane)
    && duel.moba.lanes.some((lane) => mobaVoieJouable(duel.moba, ennemi, lane.id) && lane.slots[ennemi].includes(e.id))
    && rpgPriseEnCaleLegale(e, couleurs, attente.abordage)).map((e) => e.id);
}
/** The Oni chooses distinct opposing creatures in active lanes. A shield is
 * not a targeting restriction: it intercepts only its own impact. */
export function rpgMobaCiblesOni(duel, side) {
  const attente = duel?.arriveeEnAttente;
  if (attente?.cote !== side || attente.carteId !== 'oni-de-la-fournaise' || Number.isFinite(attente.abordage)) return [];
  const source = duel[side]?.creatures.find((entity) => entity.id === attente.entiteId);
  if (!source) return [];
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  const couleurs = cardColors(duelCardById(attente.carteId));
  return duel[enemy].creatures.filter((entity) => mobaPartageVoie(duel.moba, entity.mobaLane, source.mobaLane) && !rpgEstProtegee(entity, couleurs)
    && duel.moba.lanes.some((lane) => mobaVoieJouable(duel.moba, enemy, lane.id) && lane.slots[enemy].includes(entity.id))).map((entity) => entity.id);
}
function normaliserArriveeMoba(duel) {
  const attente = duel.arriveeEnAttente;
  if (!attente || duel.effetCreatureEnAttente) return;
  const source = duel[attente.cote].creatures.find((e) => e.id === attente.entiteId);
  if (!source) { duel.arriveeEnAttente = null; return; }
  if (Number.isFinite(attente.abordage) && !rpgMobaCiblesPrise(duel, attente.cote).length) delete attente.abordage;
  if (!Number.isFinite(attente.abordage) && (attente.arriveeResolue
    || !arriveeACibleLegale(duel, attente.cote, duelCardById(attente.carteId), attente.entiteId, attente.attaquants))) {
    // The Cavalier's draw is unconditional, including when boarding removed
    // its last legal bounce target before the separate arrival choice.
    const piocheSansCible = !attente.arriveeResolue && attente.carteId === 'le-cavalier-sans-nom';
    if (piocheSansCible) rpgPiocher(duel, attente.cote);
    duel.arriveeEnAttente = null;
    duel.log.push(piocheSansCible
      ? `${source.name} : aucune cible à renvoyer ; la pioche reste due.`
      : `La capacité restante de ${source.name} se dissipe : aucune cible légale.`);
  }
}

/** Resolve an audited arrival choice; the engine validates protection and may
 * open an opposing instant-response window before the hostile effect resolves. */
export function rpgMobaResoudreArrivee(duel, side, cibleId) {
  if (duel?.mobaRechercheEnAttente) return fail('timing');
  if (!duel?.moba || duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return fail('partie-terminee');
  if (!rpgMobaPlacementCoherent(duel)) return fail('etat-incoherent');
  if (!MOBA_SIDES.includes(side) || (duel.tour !== side && !duel.mobaEmbuscadeArrivee && !duel.arriveeEnAttente?.retour)) return fail('pas-votre-tour');
  const attente = duel.arriveeEnAttente;
  if (attente?.cote !== side || duel.effetCreatureEnAttente || duel.destructionsEnAttente?.length || (!Number.isFinite(attente.abordage) && ![...MOBA_ARRIVEES_ALLIEES, ...MOBA_ARRIVEES_HOSTILES, ...MOBA_ARRIVEES_NEUTRES].includes(attente.carteId))) return fail('aucune-attente');
  if (Number.isFinite(attente.abordage) && !rpgMobaCiblesPrise(duel, side).includes(cibleId)) return fail('cible');
  const damageEvents = [];
  let options = null;
  const sourceLane = duel[side].creatures.find((e) => e.id === attente.entiteId)?.mobaLane;
  if (!sourceLane) return fail('cible');
  if (cibleId === 'sorcier' && attente.carteId === 'maitre-du-marteau') {
    const source = duel[side].creatures.find((entity) => entity.id === attente.entiteId);
    if (!source || !mobaVoiesCombat(duel.moba, source.mobaLane).length) return fail('cible');
    options = { resoudreDegatsSorcier: ({ amount }) => {
      const impacts = mobaVoiesCombat(duel.moba, source.mobaLane).map((voie) => infligerDansVoie(duel, side, voie, amount, damageEvents, { cardId: attente.carteId }));
      return { recus: impacts.reduce((n, impact) => n + (impact.recus ?? 0), 0), terminerCombat: impacts.some((impact) => impact.terminerCombat) };
    } };
  } else {
    const cibleSides = Number.isFinite(attente.abordage) ? [side === 'joueur' ? 'sorcier' : 'joueur'] : MOBA_ARRIVEES_NEUTRES.includes(attente.carteId) ? MOBA_SIDES
      : [MOBA_ARRIVEES_ALLIEES.includes(attente.carteId) ? side : (side === 'joueur' ? 'sorcier' : 'joueur')];
    const cibleSide = cibleSides.find((camp) => duel.moba.lanes.some((voie) => mobaVoieJouable(duel.moba, camp, voie.id) && voie.slots[camp].includes(cibleId)));
    if (!cibleSide || !duel[cibleSide].creatures.some((entity) => entity.id === cibleId && mobaPartageVoie(duel.moba, entity.mobaLane, sourceLane))) return fail('cible');
  }
  if (attente.carteId === 'oni-de-la-fournaise' && !Number.isFinite(attente.abordage)) {
    const candidates = rpgMobaCiblesOni(duel, side);
    if (!candidates.includes(cibleId)) return fail('cible');
    const first = attente.cibleOni;
    // The first click reserves a choice only; no damage or response occurs.
    if (first === cibleId) {
      delete attente.cibleOni;
      return { ok: true, arriveeEnAttente: true };
    }
    if (!first && candidates.length > 1) {
      attente.cibleOni = cibleId;
      return { ok: true, arriveeEnAttente: true };
    }
    if (first && !candidates.includes(first)) return fail('cible');
    options = { ciblesOniMoba: first ? [first, cibleId] : [cibleId] };
    cibleId = first ?? cibleId;
  }
  rpgConsommerSoinsCreatureMoba(duel);
  rpgConsommerDegatsCapaciteMoba(duel);
  const result = rpgResoudreArriveeCiblee(duel, side, cibleId, options);
  const healingEvents = rpgConsommerSoinsCreatureMoba(duel);
  damageEvents.push(...rpgConsommerDegatsCapaciteMoba(duel));
  const drawEvents = rpgConsommerPiochesRetourExilMoba(duel);
  if (result.ok) {
    synchroniserSorties(duel); normaliserArriveeMoba(duel);
    if (duel.mobaEmbuscadeArrivee && !duel.arriveeEnAttente && !duel.effetCreatureEnAttente) {
      duel.mobaEmbuscadeArrivee = null;
      reconcilerCombatDeclare(duel);
      duel.fenetreReponse = Boolean(duel.combatDeclare);
      reprendreReponseSuspendue(duel);
    }
  }
  return { ...result, damageEvents, healingEvents, ...(drawEvents.length ? { drawEvents } : {}), ...(duel.arriveeEnAttente ? { arriveeEnAttente: true } : {}) };
}

/** The defender passes on a paid creature effect; it resolves using the engine. */
export function rpgMobaPasserEffetCreature(duel, side) {
  if (duel?.mobaRechercheEnAttente) return fail('timing');
  if (!duel?.moba || duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return fail('partie-terminee');
  if (!rpgMobaPlacementCoherent(duel)) return fail('etat-incoherent');
  const attente = duel.effetCreatureEnAttente;
  if (!MOBA_SIDES.includes(side) || !attente || side === attente.cote || (attente.cote !== duel.tour && !duel.mobaEmbuscadeArrivee)
    || ![...MOBA_ARRIVEES_HOSTILES, ...MOBA_ARRIVEES_NEUTRES].includes(attente.carteId) || !duel.fenetreReponse || duel.destructionsEnAttente?.length) return fail('aucun-effet');
  rpgConsommerSoinsCreatureMoba(duel);
  rpgConsommerDegatsCapaciteMoba(duel);
  const result = rpgResoudreEffetCreatureEnAttente(duel, side);
  const healingEvents = rpgConsommerSoinsCreatureMoba(duel);
  const damageEvents = rpgConsommerDegatsCapaciteMoba(duel);
  if (result.ok) {
    synchroniserSorties(duel);
    if (duel.mobaEmbuscadeArrivee) {
      duel.mobaEmbuscadeArrivee = null;
      reconcilerCombatDeclare(duel);
      duel.fenetreReponse = Boolean(duel.combatDeclare);
    }
  }
  return { ...result, healingEvents, ...(damageEvents.length ? { damageEvents } : {}) };
}

/** Pass priority on a paid, announced spell. An illegal target normally
 * fizzles it; Festin retains its independent, global creature healing. */
export function rpgMobaPasserSort(duel, side) {
  if (!duel?.moba || duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return fail('partie-terminee');
  if (!rpgMobaPlacementCoherent(duel)) return fail('etat-incoherent');
  const attente = duel.mobaSortEnAttente;
  if (!attente || side !== (attente.cote === 'joueur' ? 'sorcier' : 'joueur')
    || attente.cote !== duel.tour || !(MOBA_SORTS_REPONSE.includes(attente.carteId) || (attente.armeMoba && MOBA_ARMES.includes(attente.carteId)))
    || !duel.fenetreReponse || duel.defausseEnAttente || duel.mobaRechercheEnAttente || duel.destructionsEnAttente?.length) return fail('aucun-sort');
  const degatsVoie = attente.cibleId === 'sorcier';
  const soinVoie = attente.cibleId === null && MOBA_MAGIES_SOINS.includes(attente.carteId);
  const transfertVoie = MOBA_MAGIES_TRANSFERT.includes(attente.carteId) && (attente.cibleId === null || attente.carteId === 'le-poids');
  const cibleVoie = degatsVoie || soinVoie || transfertVoie;
  const voie = cibleVoie ? mobaVoie(duel.moba, attente.laneId) : null;
  if (cibleVoie && ((degatsVoie && !MOBA_MAGIES_VOIES.includes(attente.carteId)) || !voie)) return fail('etat-incoherent');
  const damageEvents = [];
  const healingEvents = [];
  // Festin's creature healing is global and independent of its lane heal.
  // A closed lane loses its healing without redirecting or cancelling that part.
  const voiePerdue = cibleVoie && !voie.active;
  const retour = attente.reanimationMoba;
  const placementArmeInvalide = attente.placementArmeVivante && !emplacementReanimationValide(duel, attente.cote, attente.placementArmeVivante.laneId, attente.placementArmeVivante.slot);
  const equipementInvalide = attente.carteId === 'memoire-de-l-armurerie' && (attente.cibleSecondaireId !== 'sabre-maudit' || !duel[attente.cote].cimetiere.includes('sabre-maudit') || rpgEstProtegee(duel[attente.cote].creatures.find((e) => e.id === attente.cibleId), cardColors(magieById('sabre-maudit'))));
  const retourInvalide = attente.carteId === 'reanimation' && (!retour || !emplacementReanimationValide(duel, attente.cote, retour.laneId, retour.slot) || !derniereCreatureReanimable(duel, attente.cote));
  rpgConsommerSoinsCreatureMoba(duel);
  rpgConsommerDegatsCapaciteMoba(duel);
  const result = placementArmeInvalide || equipementInvalide || retourInvalide || (voiePerdue && attente.carteId !== 'festin-des-vaillants') ? fail('cible') : attente.armeMoba
    ? rpgJouerArme(duel, attente.cote, attente.carteId, attente.cibleId, { resoudreArmeMoba: true, mobaPlacementArme: attente.placementArmeVivante })
    : rpgLancerMagie(duel, attente.cote, attente.carteId, attente.cibleId, attente.cibleSecondaireId ?? null, {
    resoudreSortMoba: true,
    ...(attente.laneId ? { mobaLane: attente.laneId } : {}),
    ...(retour ? { placerReanimationMoba: placementReanimation(duel, attente.cote, retour.laneId, retour.slot), surEvenementRetourMoba: observerRetour(damageEvents, healingEvents) } : {}),
    ...(attente.carteId === 'feux-de-kitsune' && attente.cibleSecondaireId ? { ciblesIndependantesMoba: true } : {}),
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
  healingEvents.push(...rpgConsommerSoinsCreatureMoba(duel));
  damageEvents.push(...rpgConsommerDegatsCapaciteMoba(duel));
  // Only target illegality is a normal fizzle. Preserve the pending card on an
  // unexpected timing or engine error instead of silently consuming it.
  if (!result.ok && !['cible', 'protection', 'mur', 'arme-cimetiere'].includes(result.raison)) return result;
  duel.mobaSortEnAttente = null;
  duel.fenetreReponse = false;
  if (result.ok && voiePerdue && attente.carteId === 'festin-des-vaillants') {
    duel.log.push(`La voie de Festin des vaillants est conquise : seules les créatures alliées sont soignées.`);
  }
  if (!result.ok) {
    duel[attente.cote].cimetiere.push(attente.carteId);
    duel.log.push(`La cible de ${(armeById(attente.carteId) ?? duelCardById(attente.carteId))?.name ?? 'la carte'} n'est plus légale : ${attente.armeMoba ? 'l’arme ne peut pas être attachée' : 'le sort se dissipe'}.`);
    return { ok: true, dissipe: true };
  }
  synchroniserSorties(duel);
  normaliserArriveeMoba(duel);
  return { ...result, ...(cibleVoie || retour || healingEvents.length || damageEvents.length ? { damageEvents, healingEvents } : {}),
    ...(duel.arriveeEnAttente ? { arriveeEnAttente: true } : {}) };
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
  return { recus: damage.damage, sourceExileeParConquete: damage.conquered && !(laneId === 'center' && duel.moba.centerJoined?.side === side) };
}

/** Interface de compatibilité : les cibles sont celles du combat individuel. */
export function rpgMobaCiblesAttaque(duel, side, attackerId) {
  const choix = rpgMobaCiblesIndividuelles(duel, side, attackerId);
  return { obligatoires: !choix.directe, cibles: choix.cibles };
}

/** L'ancienne signature n'accepte désormais qu'un attaquant et une cible. */
export function rpgMobaDeclarerAttaque(duel, side, attackerIds, ciblesAttaque = {}) {
  if (!Array.isArray(attackerIds) || attackerIds.length !== 1 || !ciblesAttaque || typeof ciblesAttaque !== 'object'
    || Array.isArray(ciblesAttaque) || Object.keys(ciblesAttaque).some((id) => id !== attackerIds[0])) return fail('combat-individuel');
  return rpgMobaDeclarerAttaqueIndividuelle(duel, side, attackerIds[0], ciblesAttaque[attackerIds[0]] ?? null);
}

/** Annonce expérimentale d'une seule créature. Le champ individuel conserve
 * la cible d'origine même si une réponse modifie les priorités du plateau. */
export function rpgMobaDeclarerAttaqueIndividuelle(duel, side, attackerId, cibleId = null, voieAttaque = null) {
  if (!duel?.moba || duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return fail('partie-terminee');
  if (!MOBA_SIDES.includes(side) || duel.tour !== side) return fail('pas-votre-tour');
  if (!rpgMobaPlacementCoherent(duel)) return fail('etat-incoherent');
  if (!duel.manaEssaiDemarre || duel[side].manaChoixEnAttente || duel.phase !== 'principale'
    || duel.fenetreReponse || duel.finDeTour || duel.combatDeclare || duel.moba.centerChoice
    || duel.mobaRechercheEnAttente || duel.mobaCreatureEnAttente || duel.mobaSortEnAttente
    || duel.arriveeEnAttente || duel.effetCreatureEnAttente || duel.destructionsEnAttente?.length
    || duel.defausseEnAttente || duel.siteEnAttente) return fail('timing');
  if (MOBA_SIDES.some((camp) => duel[camp].creatures.some((e) =>
    !combatAudite(e) || !equipementAudite(e) || !caleAuditee(duel, camp, e)))) return fail('effet-non-pris-en-charge');
  const attaquant = duel[side].creatures.find((e) => e.id === attackerId);
  if (!rpgPeutAttaquer(attaquant)) return fail('pas-pret');
  const voies = mobaVoiesCombat(duel.moba, attaquant.mobaLane);
  if (voieAttaque && !voies.includes(voieAttaque)) return fail('voie-inactive');
  // Une frappe directe depuis le centre exige un choix explicite de voie.
  if (!voieAttaque && cibleId === null && voies.length > 1) return fail('voie-obligatoire');
  const cible = duel[side === 'joueur' ? 'sorcier' : 'joueur'].creatures.find((e) => e.id === cibleId);
  const candidates = voieAttaque ? [voieAttaque] : [...voies].sort((a, b) => Number(mobaPartageVoie(duel.moba, cible?.mobaLane, b)) - Number(mobaPartageVoie(duel.moba, cible?.mobaLane, a)));
  const candidatesLegales = candidates.filter((v) => {
    const choix = rpgMobaCiblesIndividuelles(duel, side, attackerId, v);
    return cibleId === null ? choix.directe : choix.cibles.includes(cibleId);
  });
  if (!candidatesLegales.length) return fail('cible');
  if (!voieAttaque && candidatesLegales.length > 1) return fail('voie-obligatoire');
  const voie = candidatesLegales[0];
  const bannieresAppliquees = rpgAppliquerBannieresAttaque(duel, side, [attackerId]);
  const ciblee = Boolean(attaquant.coupRapide);
  if (cibleId !== null) rpgMobaBonusProvocation(duel, side === 'joueur' ? 'sorcier' : 'joueur', cibleId);
  attaquant.attaquee = true;
  duel.log.push(`${attaquant.name} annonce une attaque${cibleId ? ` contre ${duel[side === 'joueur' ? 'sorcier' : 'joueur'].creatures.find((e) => e.id === cibleId)?.name ?? 'une créature'}` : ' directe sur sa voie'}.`);
  duel.phase = 'blocage'; // Réutilisation des fenêtres de réponse, pas de blocage.
  duel.fenetreReponse = true;
  duel.combatDeclare = { cote: side, attaquants: [attackerId], ciblesAttaque: ciblee && cibleId ? { [attackerId]: cibleId } : {},
    bannieresAppliquees, cibleIndividuelle: { cibleId, ciblee, voie } };
  return { ok: true };
}

/** Passe la réponse et résout la frappe sans ouvrir de phase de blocage. */
export function rpgMobaResoudreAttaqueIndividuelle(duel, side) {
  const combat = duel?.combatDeclare;
  if (!duel?.moba || !combat?.cibleIndividuelle || side !== combat.cote || duel.tour !== side
    || duel.phase !== 'blocage' || !duel.fenetreReponse || duel.mobaCreatureEnAttente || duel.mobaSortEnAttente
    || duel.arriveeEnAttente || duel.effetCreatureEnAttente || duel.destructionsEnAttente?.length
    || duel.siteEnAttente || duel.defausseEnAttente || duel.mobaRechercheEnAttente || duel.moba.centerChoice) return fail('timing');
  if (!rpgMobaPlacementCoherent(duel)) return fail('etat-incoherent');
  const attackerId = combat.attaquants[0];
  const { cibleId, ciblee, voie } = combat.cibleIndividuelle;
  const valide = rpgMobaCibleIndividuelleEncoreLegale(duel, side, attackerId, cibleId, ciblee, voie);
  const damageEvents = [];
  const healingEvents = [];
  rpgConsommerSoinsCreatureMoba(duel); rpgConsommerDegatsCapaciteMoba(duel);
  let result = { ok: true, annule: true, resume: { frappeSorcier: 0, furies: [], paires: [], coupsRapides: [], critiques: [] } };
  if (valide) result = rpgResoudreEchangeIndividuelMoba(duel, side, attackerId, cibleId, ciblee, {
    voieAttaque: voie,
    resoudreDegatsDirects: (amount) => infligerDansVoie(duel, side, voie, amount, damageEvents, { attackerId }),
    surTransfertMoba: (transfer, source) => {
      damageEvents.push({ ...transfer, laneId: transfer.laneId, targetSide: side === 'joueur' ? 'sorcier' : 'joueur', attackerId: source.id, tribut: true });
      healingEvents.push({ laneId: transfer.laneId, side, healing: transfer.healing, attackerId: source.id });
    },
  });
  if (!result.ok) return result;
  if (!valide) duel.log.push('La cible de l’attaque n’est plus légale : l’attaque est annulée.');
  duel.combatDeclare = null;
  duel.fenetreReponse = false;
  duel.phase = 'principale';
  synchroniserSorties(duel);
  normaliserArriveeMoba(duel);
  healingEvents.push(...rpgConsommerSoinsCreatureMoba(duel));
  damageEvents.push(...rpgConsommerDegatsCapaciteMoba(duel));
  return { ...result, damageEvents, healingEvents };
}

/** Les blocages n'existent plus en MOBA. */
export function rpgMobaDeclarerBlocages() {
  return fail('blocage-indisponible-moba');
}

/** Compatibilité avec l'ancienne signature : seule une attaque individuelle
 * déjà annoncée peut être résolue, sans affectation de bloqueur. */
export function rpgMobaLancerAttaque(duel, side, attackerIds, blocks = {}, { declaree = false } = {}) {
  if (!declaree || !Array.isArray(attackerIds) || attackerIds.length !== 1
    || attackerIds[0] !== duel?.combatDeclare?.attaquants?.[0] || !duel.combatDeclare.cibleIndividuelle
    || !blocks || typeof blocks !== 'object' || Array.isArray(blocks)
    || Object.values(blocks).some((ids) => !Array.isArray(ids) || ids.length > 0)) return fail('combat-individuel');
  return rpgMobaResoudreAttaqueIndividuelle(duel, side);
}

// Match the classic engine's latest eligible creature, without skipping an
// unsupported card to revive an older one. Returns never bypass the audit gate.
function derniereCreatureReanimable(duel, side) {
  const id = [...duel[side].cimetiere].reverse().find((candidate) => {
    const carte = duelCardById(candidate);
    return carte && !magieById(candidate) && !armeById(candidate) && !['terrain', 'site'].includes(carte.kind);
  });
  return id && CARTES_COMBAT_AUDITEES.has(id) ? id : null;
}
function emplacementReanimationValide(duel, side, laneId, slot) {
  const voie = mobaVoie(duel.moba, laneId);
  return Boolean(mobaVoieJouable(duel.moba, side, laneId) && Number.isInteger(slot) && slot >= 0 && slot < voie.slots[side].length && voie.slots[side][slot] === null);
}
function observerRetour(damageEvents, healingEvents) {
  return (event) => {
    if (event.type === 'degats' || event.type === 'transfert') damageEvents.push({ ...event, targetSide: event.cote === 'joueur' ? 'sorcier' : 'joueur', cardId: event.carteId });
    if (event.type === 'soin' || event.type === 'transfert') healingEvents.push({ ...event, side: event.cote, cardId: event.carteId });
  };
}
function placementReanimation(duel, side, laneId, slot) {
  return (entite) => {
    entite.emplacement = OFFSETS[laneId] + slot;
    entite.mobaLane = mobaVoieCombat(duel.moba, side, laneId);
    if (!mobaPlacer(duel.moba, side, laneId, slot, entite.id).ok) throw new Error('Placement de Réanimation MOBA incohérent');
  };
}

/** Printed weapons attach only to a legal allied bearer in an active lane.
 * The paid announcement shares the existing response window, but remains an
 * armament (only a counter targeting a card can counter it, not a spell). */
export function rpgMobaJouerArme(duel, side, cardId, cibleId = null, { ouvrirReponse = false, laneId = null, slot = null } = {}) {
  if (!duel?.moba || duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return fail('partie-terminee');
  if (!rpgMobaPlacementCoherent(duel)) return fail('etat-incoherent');
  if (!MOBA_SIDES.includes(side) || duel.tour !== side) return fail('pas-votre-tour');
  if (!duel.manaEssaiDemarre || duel[side].manaChoixEnAttente || !['principale', 'principale2'].includes(duel.phase)
    || duel.fenetreReponse || duel.finDeTour || duel.combatDeclare || duel.arriveeEnAttente || duel.effetCreatureEnAttente
    || duel.destructionsEnAttente?.length || duel.defausseEnAttente || duel.siteEnAttente || duel.mobaRechercheEnAttente) return fail('timing');
  if (!MOBA_ARMES.includes(cardId)) return fail('effet-non-pris-en-charge');
  if (rpgMobaLimiteCarte(duel, side, armeById(cardId))) return fail('arme-limite');
  if (MOBA_SIDES.some((cote) => duel[cote].creatures.some((e) => !combatAudite(e) || !equipementAudite(e) || !caleAuditee(duel, cote, e)))) return fail('effet-non-pris-en-charge');
  const cible = duel[side].creatures.find((entity) => entity.id === cibleId);
  const vivante = cardId === 'lame-des-ergs' && cibleId == null;
  if (vivante) {
    if (!emplacementReanimationValide(duel, side, laneId, slot)) return fail('cible');
  } else {
    if (!cible || cible.mur || !duel.moba.lanes.some((lane) => mobaVoieJouable(duel.moba, side, lane.id) && lane.slots[side].includes(cibleId))) return fail('cible');
    if (rpgEstProtegee(cible, cardColors(armeById(cardId)))) return fail('protection');
  }
  const result = rpgJouerArme(duel, side, cardId, cibleId, { annoncerArmeMoba: ouvrirReponse,
    ...(vivante ? { mobaPlacementArme: { laneId, slot } } : {}) });
  if (result.ok) (duel.moba.armesJouees ??= {})[side] = true;
  if (result.ok && !result.sortEnAttente) {
    synchroniserSorties(duel);
    normaliserArriveeMoba(duel);
  }
  return result.ok && duel.arriveeEnAttente ? { ...result, arriveeEnAttente: true } : result;
}

/** Audited global effects and single-creature spells only. The duel engine
 * validates protection, payment and resolves the printed text. The local UI
 * opts in to the limited main-phase spell window; probes resolve immediately. */
export function rpgMobaLancerMagie(duel, side, cardId, cibleId = null, laneId = null, prixLaneId = null, { ouvrirReponse = false, cibleSecondaireId = null, emplacementReanimation = null } = {}) {
  if (rpgMobaSortBlocageInterdit(cardId)) return fail('blocage-indisponible-moba');
  if (duel?.mobaRechercheEnAttente) return fail('timing');
  if (!rpgMobaPlacementCoherent(duel)) return fail('etat-incoherent');
  if (duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return fail('partie-terminee');
  if (!MOBA_SIDES.includes(side)) return fail('pas-votre-tour');
  const limiteCarte = rpgMobaLimiteCarte(duel, side, magieById(cardId));
  if (limiteCarte) return fail(limiteCarte);
  const embuscadeEnAttente = Boolean(duel.mobaCreatureEnAttente?.embuscadeCombat || duel.mobaCreatureEnAttente?.embuscadeSuspendue || duel.mobaCreatureEnAttente?.origineCreature);
  const embuscadeSuspendue = duel.mobaCreatureEnAttente?.embuscadeSuspendue;
  const origineCreature = duel.mobaCreatureEnAttente?.origineCreature;
  const effetEmbuscade = Boolean(duel.mobaEmbuscadeArrivee && duel.effetCreatureEnAttente);
  const auteurImbrique = embuscadeEnAttente ? duel.mobaCreatureEnAttente.cote : effetEmbuscade ? duel.effetCreatureEnAttente.cote : null;
  if (auteurImbrique && (side === auteurImbrique || !duel.fenetreReponse)) return fail('timing');
  const reaction = (auteurImbrique && side !== auteurImbrique) || (duel.tour !== side && (
    (duel.phase === 'blocage' && duel.combatDeclare?.cote === duel.tour)
    || (duel.phase === 'fin' && duel.finDeTour?.cote === duel.tour && duel.fenetreReponse)
    || (duel.effetCreatureEnAttente?.cote === duel.tour && [...MOBA_ARRIVEES_HOSTILES, ...MOBA_ARRIVEES_NEUTRES].includes(duel.effetCreatureEnAttente?.carteId) && duel.fenetreReponse)
    || (duel.mobaSortEnAttente?.cote === duel.tour && duel.fenetreReponse)
    || (duel.mobaCreatureEnAttente?.cote === duel.tour && duel.fenetreReponse)
  ));
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
  const renfort = MOBA_MAGIES_RENFORT_REPONSE.includes(cardId);
  const contre = MOBA_CONTRESORTS.includes(cardId);
  const reanimation = MOBA_MAGIES_REANIMATION.includes(cardId);
  const spatial = MOBA_MAGIES_SPATIALES.includes(cardId);
  if (!reanimation && emplacementReanimation !== null) return fail('cible');
  if (cardId === 'memoire-de-l-armurerie') {
    cibleSecondaireId ??= [...duel[side].cimetiere].reverse().find((id) => id === 'sabre-maudit') ?? null;
    if (cibleSecondaireId !== 'sabre-maudit' || !duel[side].cimetiere.includes(cibleSecondaireId)) return fail('arme-cimetiere');
  }
  if (cibleSecondaireId !== null && !['feux-de-kitsune', 'defi-du-jarl', 'memoire-de-l-armurerie'].includes(cardId)) return fail('cible');
  if (cardId === 'defi-du-jarl' && cibleSecondaireId === null) return fail('cible');
  if ((!MOBA_MAGIES_ESSAI.includes(cardId) && !MOBA_MAGIES_IMMEDIATES.includes(cardId) && !ciblee && !soin && !prix && !transfert && !contre && !reanimation)
    || MOBA_SIDES.some((cote) => duel[cote].creatures.some((e) => !combatAudite(e) || !equipementAudite(e) || !caleAuditee(duel, cote, e)))) return fail('effet-non-pris-en-charge');
  const contreSort = Boolean(duel.mobaSortEnAttente && (duel.mobaSortEnAttente.armeMoba ? cardId === 'contresort-des-abimes' : cardId !== 'ecueil'));
  const contreCreature = Boolean(duel.mobaCreatureEnAttente && ['ecueil', 'contresort-des-abimes'].includes(cardId));
  if (contre && (!reaction || (!contreSort && !contreCreature) || cibleId !== null || laneId !== null || prixLaneId !== null)) return fail('timing');
  if (reanimation) {
    if (cibleId !== null || prixLaneId !== null || !emplacementReanimationValide(duel, side, laneId, emplacementReanimation) || !derniereCreatureReanimable(duel, side)) return fail('cible');
  } else if (prix) {
    // A transfer with a price has two independent choices: one lane pays,
    // and a possibly different active lane receives the transfer.
    const lanePrix = prixLaneId ?? (transfert ? null : laneId);
    const lane = mobaVoie(duel.moba, lanePrix);
    if (cibleId !== null || !lane?.active || ((transfert || spatial) && !mobaVoie(duel.moba, laneId)?.active)) return fail('cible');
    if (lane.hp[side] <= magieById(cardId).prixPv) return fail('prix');
  } else if (soin || transfert) {
    const poidsLie = cardId === 'le-poids' && lienSatisfait(magieById(cardId), duel[side].creatures);
    if (!mobaVoie(duel.moba, laneId)?.active) return fail('cible');
    if (poidsLie && (cibleId !== null || ouvrirReponse)) {
      const ennemi = side === 'joueur' ? 'sorcier' : 'joueur';
      const cible = duel[ennemi].creatures.find((entity) => entity.id === cibleId);
      if (!cible || !mobaPartageVoie(duel.moba, cible.mobaLane, laneId) || !duel.moba.lanes.some((voie) => mobaVoieJouable(duel.moba, ennemi, voie.id) && voie.slots[ennemi].includes(cibleId))) return fail('cible');
      if (rpgEstProtegee(cible, cardColors(magieById(cardId))) || rpgEstProtegeeDesSorts(cible, cardColors(magieById(cardId)))) return fail('protection');
    } else if (!poidsLie && cibleId !== null) return fail('cible');
  } else if (ciblee && cibleId === 'sorcier') {
    if (!MOBA_MAGIES_VOIES.includes(cardId) || !mobaVoie(duel.moba, laneId)?.active) return fail('cible');
  } else if (ciblee) {
    const cotesCibles = MOBA_MAGIES_NEUTRES.includes(cardId) ? MOBA_SIDES
      : [MOBA_MAGIES_ALLIEES.includes(cardId) ? side : (side === 'joueur' ? 'sorcier' : 'joueur')];
    const cibleSide = cotesCibles.find((cote) => duel.moba.lanes.some((voie) => mobaVoieJouable(duel.moba, cote, voie.id) && voie.slots[cote].includes(cibleId)));
    if (laneId !== null || !cibleSide || !duel[cibleSide].creatures.some((entity) => entity.id === cibleId)) return fail('cible');
    const voiePrimaire = duel[cibleSide].creatures.find((entity) => entity.id === cibleId)?.mobaLane;
    const coteSecondaire = cardId === 'defi-du-jarl' ? side : cibleSide;
    if (cardId === 'memoire-de-l-armurerie' && rpgEstProtegee(duel[side].creatures.find((e) => e.id === cibleId), cardColors(magieById(cibleSecondaireId)))) return fail('protection');
    if (cibleSecondaireId !== null && cardId !== 'memoire-de-l-armurerie' && (cibleSecondaireId === cibleId || !mobaPartageVoie(duel.moba, duel[coteSecondaire].creatures.find((entity) => entity.id === cibleSecondaireId)?.mobaLane, voiePrimaire) || !duel.moba.lanes.some((voie) => mobaVoieJouable(duel.moba, coteSecondaire, voie.id) && voie.slots[coteSecondaire].includes(cibleSecondaireId)) || !duel[coteSecondaire].creatures.some((entity) => entity.id === cibleSecondaireId))) return fail('cible');
  } else if (cibleId !== null || (spatial ? !mobaVoie(duel.moba, laneId)?.active : laneId !== null)) return fail('cible');
  const damageEvents = [];
  const healingEvents = [];
  const nomCible = (id, cote = side === 'joueur' ? 'sorcier' : 'joueur') => {
    const cible = duel[cote].creatures.find((entity) => entity.id === id);
    const voie = duel.moba.lanes.find((lane) => lane.slots[cote].includes(id));
    return cible && voie ? `${cible.name} · ${NOMS_VOIES[voie.id]}${cardId === 'defi-du-jarl' ? ` · ${cote === 'joueur' ? 'Vous' : 'IA'}` : ''}` : null;
  };
  const options = {
    ...((spatial || soin || transfert || cibleId === 'sorcier') && laneId ? { mobaLane: laneId } : {}),
    ...(cardId === 'lettre-de-marque' ? { nomsCiblesMoba: ['Pioche et prochaine arrivée avec Abordage'] } : {}),
    ...(cardId === 'le-grand-debarquement' ? { nomsCiblesMoba: ['Créatures alliées avec une prise en cale'] } : {}),
    ...(['feux-de-kitsune', 'defi-du-jarl'].includes(cardId) ? { nomsCiblesMoba: [nomCible(cibleId), nomCible(cibleSecondaireId, cardId === 'defi-du-jarl' ? side : undefined)] } : {}),
    ...(cardId === 'memoire-de-l-armurerie' ? { nomsCiblesMoba: [`${nomCible(cibleId, side)} · Sabre maudit au cimetière`] } : {}),
    ...(reanimation ? { placerReanimationMoba: placementReanimation(duel, side, laneId, emplacementReanimation), surEvenementRetourMoba: observerRetour(damageEvents, healingEvents) } : {}),
    ...(cardId === 'feux-de-kitsune' && cibleSecondaireId ? { ciblesIndependantesMoba: true } : {}),
    ...(contre ? (contreCreature ? { contrerCreatureMoba: true } : { contrerSortMoba: true }) : {}),
    ...(ouvrirReponse && !reaction && !duel.fenetreReponse && MOBA_SORTS_REPONSE.includes(cardId)
      && (reanimation ? cibleId === null && !!laneId : renfort || (prix && (MOBA_MAGIES_ZONE_REPONSE.includes(cardId) || MOBA_MAGIES_PIOCHE_REPONSE.includes(cardId))) ? cibleId === null && (prix ? (prixLaneId ?? laneId) !== null : laneId === null)
        : MOBA_MAGIES_PIOCHE_REPONSE.includes(cardId) || MOBA_MAGIES_MAIN_REPONSE.includes(cardId) || spatial ? cibleId === null && (spatial ? !!laneId : laneId === null)
        : soin || transfert ? !!laneId && (cibleId === null || cardId === 'le-poids')
        : cibleId === 'sorcier' ? MOBA_MAGIES_VOIES.includes(cardId)
          : cibleId && MOBA_SIDES.some((cote) => duel[cote].creatures.some((entity) => entity.id === cibleId)))
      ? { annoncerSortMoba: true,
        ...(reanimation ? { reanimationMoba: { laneId, slot: emplacementReanimation, nomVoie: NOMS_VOIES[laneId] } } : {}),
        ...(MOBA_MAGIES_PIOCHE_REPONSE.includes(cardId) ? { ciblePiocheMoba: cardId !== 'les-feuillets' ? side : (side === 'joueur' ? 'sorcier' : 'joueur') } : {}),
        ...(cardId === 'grand-voile-blanc' ? { cibleCombatMoba: true } : {}),
        ...(MOBA_MAGIES_MAIN_REPONSE.includes(cardId) ? { cibleMainMoba: side === 'joueur' ? 'sorcier' : 'joueur' } : {}),
        ...(MOBA_MAGIES_ZONE_REPONSE.includes(cardId) || renfort ? { cibleZoneMoba: renfort ? side : MOBA_MAGIES_ZONE_TOTALE_REPONSE.includes(cardId) ? 'tous' : (side === 'joueur' ? 'sorcier' : 'joueur') } : {}),
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
  rpgConsommerSoinsCreatureMoba(duel);
  rpgConsommerDegatsCapaciteMoba(duel);
  const result = rpgLancerMagie(duel, side, cardId, cibleId, cibleSecondaireId, options);
  if (result.ok) {
    const quota = carteEstArme(magieById(cardId)) ? 'armesJouees' : 'sortsJoues';
    (duel.moba[quota] ??= {})[side] = true;
  }
  if (result.ok && result.contre && embuscadeSuspendue) reprendreReponseSuspendue(duel);
  else if (result.ok && result.contre && origineCreature) { duel.mobaCreatureEnAttente = origineCreature; duel.fenetreReponse = true; }
  else if (result.ok && result.contre && embuscadeEnAttente && duel.combatDeclare) duel.fenetreReponse = true;
  healingEvents.push(...rpgConsommerSoinsCreatureMoba(duel));
  damageEvents.push(...rpgConsommerDegatsCapaciteMoba(duel));
  if (!result.ok) return result;
  if (duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) {
    for (const key of ['mobaSortEnAttente', 'mobaCreatureEnAttente']) {
      const pending = duel[key];
      if (pending) { duel[pending.cote].cimetiere.push(pending.carteId); if (pending.origineCreature) duel[pending.origineCreature.cote].cimetiere.push(pending.origineCreature.carteId); duel[key] = null; duel.fenetreReponse = false; }
    }
    reprendreReponseSuspendue(duel);
  }
  synchroniserSorties(duel);
  const combatTermine = reaction ? reconcilerCombatDeclare(duel) : false;
  if ((duel.mobaCreatureEnAttente?.embuscadeCombat || duel.mobaCreatureEnAttente?.embuscadeSuspendue || duel.mobaCreatureEnAttente?.origineCreature || (duel.mobaEmbuscadeArrivee && duel.effetCreatureEnAttente)) && !duel.moba.winner) duel.fenetreReponse = true;
  return { ...result, damageEvents, healingEvents, combatTermine };
}

/** A targeted death trigger is a mandatory choice, not a nested response. */
export function rpgMobaCiblesDestruction(duel, side) {
  const attente = duel?.destructionsEnAttente?.[0];
  if (!duel?.moba || !MOBA_SIDES.includes(side) || !attente || attente.cote !== side || attente.carteId !== 'ghul-des-cendres' || duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return [];
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  const couleurs = cardColors(duelCardById(attente.carteId));
  return duel[enemy].creatures.filter((entity) => (!attente.mobaLane || mobaPartageVoie(duel.moba, entity.mobaLane, attente.mobaLane)) && !rpgEstProtegee(entity, couleurs)
    && duel.moba.lanes.some((lane) => mobaVoieJouable(duel.moba, enemy, lane.id) && lane.slots[enemy].includes(entity.id))).map((entity) => entity.id);
}

function reconcilerCombatDeclare(duel) {
  const combat = duel.combatDeclare;
  if (!combat) return false;
  const survivants = combat.attaquants.filter((id) => duel[combat.cote].creatures.some((entity) => entity.id === id));
  if (!survivants.length || duel.moba.winner) {
    if (!combat.cibleIndividuelle) duel.attaqueJouee = combat.cote;
    duel.combatDeclare = null;
    duel.fenetreReponse = false;
    duel.phase = combat.cibleIndividuelle ? 'principale' : 'principale2';
    return true;
  }
  const defenseur = combat.cote === 'joueur' ? 'sorcier' : 'joueur';
  duel.combatDeclare = { ...combat, attaquants: survivants,
    ciblesAttaque: Object.fromEntries(Object.entries(combat.ciblesAttaque ?? {}).filter(([id]) => survivants.includes(id))),
    ...(combat.blocages ? { blocages: Object.fromEntries(Object.entries(combat.blocages)
      .filter(([id]) => survivants.includes(id)).map(([id, ids]) => [id, ids.filter((bloqueur) => duel[defenseur].creatures.some((e) => e.id === bloqueur))])) } : {}) };
  return false;
}

export function rpgMobaResoudreDestruction(duel, side, cibleId) {
  if (!duel?.moba || duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return fail('partie-terminee');
  if (!rpgMobaPlacementCoherent(duel)) return fail('etat-incoherent');
  if (duel.destructionsEnAttente?.[0]?.cote !== side) return fail('aucune-attente');
  if (!rpgMobaCiblesDestruction(duel, side).includes(cibleId)) return fail('cible');
  rpgConsommerSoinsCreatureMoba(duel);
  rpgConsommerDegatsCapaciteMoba(duel);
  const result = rpgResoudreDestructionCiblee(duel, side, cibleId);
  if (!result.ok) return result;
  if (duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) {
    for (const key of ['mobaSortEnAttente', 'mobaCreatureEnAttente']) {
      const pending = duel[key];
      if (pending) { duel[pending.cote].cimetiere.push(pending.carteId); if (pending.origineCreature) duel[pending.origineCreature.cote].cimetiere.push(pending.origineCreature.carteId); duel[key] = null; duel.fenetreReponse = false; }
    }
    reprendreReponseSuspendue(duel);
  }
  synchroniserSorties(duel);
  const healingEvents = rpgConsommerSoinsCreatureMoba(duel);
  const damageEvents = rpgConsommerDegatsCapaciteMoba(duel);
  const drawEvents = rpgConsommerPiochesRetourExilMoba(duel);
  if (!duel.moba.winner) normaliserArriveeMoba(duel);
  const combatTermine = reconcilerCombatDeclare(duel);
  return { ...result, healingEvents, damageEvents, combatTermine, ...(drawEvents.length ? { drawEvents } : {}) };
}
