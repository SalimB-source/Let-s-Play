import test from 'node:test';
import assert from 'node:assert/strict';
import { choisirCouleurManaIA, choisirDefausseIA, choisirMulliganIA } from '../src/games/rpgAI.js';
import { mobaInfliger } from '../src/games/rpgMoba.js';
import { rpgChoisirCouleurMana, rpgFinDeTour, rpgReglerHasard } from '../src/games/rpgDuel.js';
import { MOBA_DECKS, rpgMobaCreerPartie, rpgMobaCiblesDestruction, rpgMobaResoudreDestruction, rpgMobaResoudreSite, rpgMobaResoudreRecherche, rpgMobaMulligan, rpgMobaJouerCreature, rpgMobaJouerArme, MOBA_ARMES, rpgMobaResoudreArrivee, rpgMobaLancerMagie, rpgMobaDeclarerAttaque, rpgMobaLancerAttaque, rpgMobaTerminerTour, rpgMobaDefausser, rpgMobaPasserFinDeTour, rpgMobaPasserEffetCreature, rpgMobaPasserSort, rpgMobaPasserCreature, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirRechercheIA, rpgMobaChoisirSiteIA, rpgMobaChoisirCreatureIA, rpgMobaChoisirMagieIA, rpgMobaChoisirArriveeIA, rpgMobaChoisirAttaquantsIA, rpgMobaChoisirCiblesAttaqueIA, rpgMobaChoisirBlocagesIA } from '../src/games/rpgMobaAI.js';

const ok = (result) => assert.equal(result.ok, true, JSON.stringify(result));

test('AI decisions simulate games with both seats, legal lane blocks and real decks', () => {
  const edited = { ...MOBA_DECKS[1], cardIds: [...MOBA_DECKS[1].cardIds] };
  for (const [from, to] of [['viking-des-neiges', 'veilleuse-des-citernes'], ['ashigaru-des-braises', 'djinn-de-la-flamme-mourante'], ['loup-des-neiges', 'scalde-des-runes'], ['berserk-des-trois-hivers', 'valkyrie-au-corbeau'], ['gardien-viking-du-fjord', 'drakkar-a-tete-de-dragon'], ['gardien-viking-du-fjord', 'volva-soigneuse'], ['porteuse-de-cruches', 'vipere-de-verre'], ['festin-des-vaillants', 'sonneur-fele'], ['hurlement-du-blizzard', 'geant-des-banquises'], ['eclair-du-marteau', 'feriel'], ['trait-de-braise', 'djinn-de-la-fleche-ardente']]) {
    edited.cardIds[edited.cardIds.indexOf(from)] = to;
  }
  edited.cardIds[edited.cardIds.indexOf('ressac')] = 'le-routier';
  edited.cardIds[edited.cardIds.indexOf('verglas')] = 'silence-decume';
  edited.cardIds[edited.cardIds.indexOf('grand-voile-blanc')] = 'maree-contraire';
  edited.cardIds[edited.cardIds.indexOf('hurlement-du-blizzard')] = 'ecueil';
  edited.cardIds[edited.cardIds.indexOf('tempete-de-foudre-et-de-givre')] = 'contresort-des-abimes';
  const editedNew = { ...MOBA_DECKS[0], cardIds: [...MOBA_DECKS[0].cardIds] };
  for (const [from, to] of [['ashigaru-des-braises', 'gardien-de-la-porte-ardente'], ['gardienne-des-portes-de-sable', 'rempart-des-sables-eternels'], ['loup-des-neiges', 'serpent-du-monde'], ['jarl-au-marteau-de-guerre', 'ifrit-al-ahmar'], ['berserk-des-trois-hivers', 'tin-hinan'], ['trait-de-braise', 'serment-de-la-forge'], ['verglas', 'embuscade'], ['grand-voile-blanc', 'rapport-du-greffier'], ['brume-du-fjord', 'tempete-de-sable'], ['poigne-de-givre', 'appat-de-la-meute'], ['mousse-des-galiotes', 'fennec-des-decombres'], ['gardienne-des-portes-de-sable', 'chien-du-guet']]) {
    editedNew.cardIds[editedNew.cardIds.indexOf(from)] = to;
  }
  editedNew.cardIds[editedNew.cardIds.indexOf('trait-de-braise')] = 'feux-de-kitsune';
  editedNew.cardIds[editedNew.cardIds.indexOf('mur-de-boucliers')] = 'defi-du-jarl';
  const editedDiscard = { ...MOBA_DECKS[4], cardIds: [...MOBA_DECKS[4].cardIds] };
  for (const [from, to] of [['papyrus', 'nom-efface'], ['viking-des-neiges', 'ibis-des-comptes'], ['gardien-viking-du-fjord', 'celle-qui-pese'], ['jarl-au-marteau-de-guerre', 'pere-des-corbeaux'], ['berserk-des-trois-hivers', 'valkyrie-des-neuf-nuits'], ['grand-hiver', 'la-devoreuse']]) {
    editedDiscard.cardIds[editedDiscard.cardIds.indexOf(from)] = to;
  }
  const editedSearch = { ...MOBA_DECKS[0], cardIds: [...MOBA_DECKS[0].cardIds] };
  for (const [from, to] of [['gardienne-des-portes-de-sable', 'tiziri-du-djurdjura'], ['mousse-des-galiotes', 'fennec-des-decombres']]) editedSearch.cardIds[editedSearch.cardIds.indexOf(from)] = to;
  const editedHarakiri = { ...MOBA_DECKS[0], cardIds: [...MOBA_DECKS[0].cardIds] };
  for (const [from, to] of [['ashigaru-des-braises', 'ronin-du-soleil-rouge'], ['ashigaru-des-braises', 'hatamoto-des-cendres'], ['jarl-au-marteau-de-guerre', 'samourai-du-torii'], ['jarl-au-marteau-de-guerre', 'tengu-du-mont-ardent'], ['mousse-des-galiotes', 'amani-des-ksour'], ['loup-des-neiges', 'kenshi-de-la-forge'], ['tempete-de-foudre-et-de-givre', 'susanoo']]) editedHarakiri.cardIds[editedHarakiri.cardIds.indexOf(from)] = to;
  const editedTransfer = { ...MOBA_DECKS[4], cardIds: [...MOBA_DECKS[4].cardIds] };
  for (const [from, to] of [['ashigaru-des-braises', 'chacal-du-seuil'], ['ashigaru-des-braises', 'pretre-de-la-bouche'], ['papyrus', 'le-poids'], ['papyrus', 'la-grande-pesee'], ['viking-des-neiges', 'berserk-du-crepuscule'], ['jarl-au-marteau-de-guerre', 'celui-qui-juge'], ['loup-des-neiges', 'ouvrier-du-natron'], ['brume-du-fjord', 'offrande-de-lin']]) editedTransfer.cardIds[editedTransfer.cardIds.indexOf(from)] = to;
  const editedTokens = { ...MOBA_DECKS[0], cardIds: [...MOBA_DECKS[0].cardIds] };
  for (const [from, to] of [['jarl-au-marteau-de-guerre', 'tarek'], ['viking-des-neiges', 'daimyo-du-soleil-rouge'], ['grand-hiver', 'orochi']]) editedTokens.cardIds[editedTokens.cardIds.indexOf(from)] = to;
  editedTokens.cardIds[editedTokens.cardIds.indexOf('mur-de-boucliers')] = 'reanimation';
  const editedMomie = { ...MOBA_DECKS[4], cardIds: [...MOBA_DECKS[4].cardIds] };
  for (const [from, to] of [['jarl-au-marteau-de-guerre', 'momie-de-lin'], ['grand-hiver', 'la-derniere-pesee']]) editedMomie.cardIds[editedMomie.cardIds.indexOf(from)] = to;
  const editedHeures = { ...MOBA_DECKS[0], cardIds: [...MOBA_DECKS[0].cardIds] };
  for (const [from, to] of [['ashigaru-des-braises', 'guetteur-du-beffroi'], ['mousse-des-galiotes', 'faussoyeur-des-dunes'], ['jarl-au-marteau-de-guerre', 'dune-marchante'], ['loup-des-neiges', 'scribe-de-la-liste']]) editedHeures.cardIds[editedHeures.cardIds.indexOf(from)] = to;
  editedHeures.cardIds[editedHeures.cardIds.indexOf('verglas')] = 'embuscade';
  editedHeures.cardIds[editedHeures.cardIds.indexOf('ashigaru-des-braises')] = 'braisier-du-souk';
  editedHeures.cardIds[editedHeures.cardIds.indexOf('jarl-au-marteau-de-guerre')] = 'valkyrie-des-glaces';
  const editedCorbeaux = { ...MOBA_DECKS[4], cardIds: [...MOBA_DECKS[4].cardIds] };
  editedCorbeaux.cardIds[editedCorbeaux.cardIds.indexOf('jarl-au-marteau-de-guerre')] = 'maitre-des-corbeaux';
  editedCorbeaux.cardIds[editedCorbeaux.cardIds.indexOf('grand-hiver')] = 'neige-noire';
  const editedArmes = { ...MOBA_DECKS[0], cardIds: [...MOBA_DECKS[0].cardIds] };
  for (const [from, to] of [['grand-voile-blanc', 'memoire-de-l-armurerie'], ['trait-de-braise', 'brise-lame'], ['mur-de-boucliers', 'sabre-maudit']]) {
    const index = editedArmes.cardIds.indexOf(from); assert.ok(index >= 0); editedArmes.cardIds[index] = to;
  }
  const editedBoarding = { ...MOBA_DECKS[0], elements: ['neige', 'sable', 'eau'], cardIds: [...MOBA_DECKS[0].cardIds] };
  for (const [from, to] of [['ashigaru-des-braises', 'porteuse-de-cruches'], ['ashigaru-des-braises', 'porteuse-de-cruches'], ['anqa-des-braises', 'sonneur-fele'], ['trait-de-braise', 'lettre-de-marque'], ['grand-voile-blanc', 'lettre-de-marque'], ['grand-hiver', 'le-grand-debarquement'], ['tempete-de-foudre-et-de-givre', 'ressac'], ['tempete-de-foudre-et-de-givre', 'parade-du-verre']]) {
    const index = editedBoarding.cardIds.indexOf(from); assert.ok(index >= 0); editedBoarding.cardIds[index] = to;
  }
  const editedPirates = { ...editedBoarding, cardIds: [...editedBoarding.cardIds] };
  for (const [from, to] of [['porteuse-de-cruches','rais-de-la-galiote'], ['porteuse-de-cruches','cotre-de-course'], ['sonneur-fele','galion-de-la-flotte'], ['jarl-au-marteau-de-guerre','la-vengeance-de-la-reine-anne'], ['viking-des-neiges','negociant-des-ranscons'], ['loup-des-neiges','le-chasseur-d-ocracoke']]) {
    const index = editedPirates.cardIds.indexOf(from); assert.ok(index >= 0); editedPirates.cardIds[index] = to;
  }
  const editedRiders = { ...editedBoarding, cardIds: [...editedBoarding.cardIds] };
  for (const [from, to] of [['jarl-au-marteau-de-guerre','le-cavalier-du-ressac-gele'], ['viking-des-neiges','le-cavalier-des-dunes-gelees']]) {
    const index = editedRiders.cardIds.indexOf(from); assert.ok(index >= 0); editedRiders.cardIds[index] = to;
  }
  const editedPyre = { ...MOBA_DECKS[4], cardIds: [...MOBA_DECKS[4].cardIds] };
  editedPyre.cardIds[editedPyre.cardIds.indexOf('jarl-au-marteau-de-guerre')] = 'le-cavalier-du-bucher';
  const editedOni = { ...MOBA_DECKS[0], cardIds: [...MOBA_DECKS[0].cardIds] };
  editedOni.cardIds[editedOni.cardIds.indexOf('jarl-au-marteau-de-guerre')] = 'oni-de-la-fournaise';
  editedOni.cardIds[editedOni.cardIds.indexOf('grand-voile-blanc')] = 'feux-de-kitsune';
  const editedSteam = { ...MOBA_DECKS[1], cardIds: [...MOBA_DECKS[1].cardIds] };
  editedSteam.cardIds[editedSteam.cardIds.indexOf('jarl-au-marteau-de-guerre')] = 'le-cavalier-de-vapeur';
  const editedFights = { ...editedBoarding, cardIds: [...editedBoarding.cardIds] };
  for (const [from, to] of [['jarl-au-marteau-de-guerre', 'bakunawa'], ['viking-des-neiges', 'cavalier-amazigh-du-desert'], ['lettre-de-marque', 'le-routier']]) {
    const index = editedFights.cardIds.indexOf(from); assert.ok(index >= 0); editedFights.cardIds[index] = to;
  }
  const editedBlackbeard = { ...MOBA_DECKS[4], cardIds: [...MOBA_DECKS[4].cardIds] };
  for (const [from, to] of [['jarl-au-marteau-de-guerre', 'la-barbe-noire'], ['papyrus', 'le-poids']]) {
    const index = editedBlackbeard.cardIds.indexOf(from); assert.ok(index >= 0); editedBlackbeard.cardIds[index] = to;
  }
  const editedBrulot = { ...MOBA_DECKS[0], cardIds: [...MOBA_DECKS[0].cardIds] };
  editedBrulot.cardIds[editedBrulot.cardIds.indexOf('ashigaru-des-braises')] = 'le-brulot';
  const editedRousse = { ...editedBoarding, cardIds: [...editedBoarding.cardIds] };
  editedRousse.cardIds[editedRousse.cardIds.indexOf('jarl-au-marteau-de-guerre')] = 'la-barbe-rousse';
  const editedCounters = { ...MOBA_DECKS[0], cardIds: [...MOBA_DECKS[0].cardIds] };
  for (const [from,to] of [['viking-des-neiges','eirik-du-premier-serment'],['jarl-au-marteau-de-guerre','pourfendeur-des-djinns']]) editedCounters.cardIds[editedCounters.cardIds.indexOf(from)] = to;
  const editedKings = { ...MOBA_DECKS[0], elements: ['neige','sable','tenebres'], cardIds: [...MOBA_DECKS[0].cardIds] };
  for (const [from,to] of [['ashigaru-des-braises','papyrus'],['ashigaru-des-braises','papyrus'],['anqa-des-braises','kusayla-roi-des-imazighen'],['trait-de-braise','nom-efface'],['tempete-de-foudre-et-de-givre','neige-noire'],['tempete-de-foudre-et-de-givre','la-derniere-pesee'],['jarl-au-marteau-de-guerre','salem']]) { const index=editedKings.cardIds.indexOf(from); assert.ok(index>=0); editedKings.cardIds[index]=to; }
  const editedDame = { ...MOBA_DECKS[0], cardIds: [...MOBA_DECKS[0].cardIds] };
  editedDame.cardIds[editedDame.cardIds.indexOf('jarl-au-marteau-de-guerre')] = 'dame-aux-ailes-d-or';
  editedDame.cardIds[editedDame.cardIds.indexOf('brume-du-fjord')] = 'rempart-de-dunes';
  const editedGhul = { ...MOBA_DECKS[0], cardIds: [...MOBA_DECKS[0].cardIds] };
  editedGhul.cardIds[editedGhul.cardIds.indexOf('ashigaru-des-braises')] = 'ghul-des-cendres';
  editedGhul.cardIds[editedGhul.cardIds.lastIndexOf('ashigaru-des-braises')] = 'ghul-des-cendres';
  const editedChercheuse = { ...MOBA_DECKS[0], cardIds: [...MOBA_DECKS[0].cardIds] };
  editedChercheuse.cardIds[editedChercheuse.cardIds.indexOf('ashigaru-des-braises')] = 'chercheuse-des-armes-ensevelies';
  editedChercheuse.cardIds[editedChercheuse.cardIds.lastIndexOf('ashigaru-des-braises')] = 'chercheuse-des-armes-ensevelies';
  const editedJavelot = { ...editedChercheuse, cardIds: [...editedChercheuse.cardIds] };
  editedJavelot.cardIds[editedJavelot.cardIds.indexOf('viking-des-neiges')] = 'javelot-du-beffroi';
  const editedArmor = { ...MOBA_DECKS[0], cardIds: [...MOBA_DECKS[0].cardIds] };
  for (const [from,to] of [['ashigaru-des-braises','cuirasse-de-sel'],['trait-de-braise','braise-et-sable'],['viking-des-neiges','bouchra-guerriere-des-cretes'],['anqa-des-braises','cavalier-des-deux-sabres']]) editedArmor.cardIds[editedArmor.cardIds.indexOf(from)] = to;
  const editedFive = { ...MOBA_DECKS[0], cardIds: [...MOBA_DECKS[0].cardIds] };
  for (const [from,to] of [['ashigaru-des-braises','takouba-des-pistes'],['ashigaru-des-braises','lance-de-givre'],['trait-de-braise','hache-de-la-banquise'],['anqa-des-braises','armure-de-cendres']]) editedFive.cardIds[editedFive.cardIds.indexOf(from)] = to;
  const editedBlackSabre = { ...MOBA_DECKS[4], elements:['neige','sable','tenebres'], cardIds:[...MOBA_DECKS[4].cardIds] };
  for (const [from,to] of [['ashigaru-des-braises','sabre-du-croissant-noir'],['ashigaru-des-braises','sabre-du-croissant-noir'],['anqa-des-braises','gardienne-des-portes-de-sable'],['tempete-de-foudre-et-de-givre','cuirasse-de-sel'],['tempete-de-foudre-et-de-givre','takouba-des-pistes'],['trait-de-braise','javelot-du-beffroi']]) editedBlackSabre.cardIds[editedBlackSabre.cardIds.indexOf(from)] = to;
  const editedTributArmes = { ...editedBlackSabre, cardIds:[...editedBlackSabre.cardIds] };
  for (const [from,to] of [['viking-des-neiges','licou-du-chien-de-sable'], ['jarl-au-marteau-de-guerre','harnais-du-mehari'], ['jarl-au-marteau-de-guerre','khopesh-d-or']]) editedTributArmes.cardIds[editedTributArmes.cardIds.indexOf(from)] = to;
  const editedMaskJitte = { ...editedTributArmes, cardIds:[...editedTributArmes.cardIds] };
  for (const [from,to] of [['loup-des-neiges','chien-du-guet'],['gardien-viking-du-fjord','masque-du-guetteur'],['berserk-des-trois-hivers','jitte-d-amayas']]) editedMaskJitte.cardIds[editedMaskJitte.cardIds.indexOf(from)] = to;
  const editedLuneSandales = { ...editedMaskJitte, cardIds:[...editedMaskJitte.cardIds] };
  for (const [from,to] of [['masque-du-guetteur','sandales-de-tislit'], ['jitte-d-amayas','lance-de-la-lune-givree']]) editedLuneSandales.cardIds[editedLuneSandales.cardIds.indexOf(from)] = to;
  const editedToursSable = { ...MOBA_DECKS[0], cardIds:[...MOBA_DECKS[0].cardIds] };
  for (const [from,to] of [['gardienne-des-portes-de-sable','tour-de-sable'],['gardienne-des-portes-de-sable','tour-de-sable'],['ashigaru-des-braises','tour-de-braise'],['ashigaru-des-braises','tour-de-braise'],['loup-des-neiges','tour-de-neige'],['loup-des-neiges','tour-de-neige'],['trait-de-braise','grappin-d-abordage']]) editedToursSable.cardIds[editedToursSable.cardIds.indexOf(from)] = to;
  const editedToursFlots = { ...MOBA_DECKS[1], cardIds:[...MOBA_DECKS[1].cardIds] };
  for (const [from,to] of [['porteuse-de-cruches','tour-des-flots'],['porteuse-de-cruches','tour-des-flots'],['ashigaru-des-braises','tour-de-braise'],['ashigaru-des-braises','tour-de-braise'],['loup-des-neiges','tour-de-neige'],['loup-des-neiges','tour-de-neige'],['trait-de-braise','baton-des-citernes']]) editedToursFlots.cardIds[editedToursFlots.cardIds.indexOf(from)] = to;
  const editedTourTenebres = { ...editedBlackSabre, cardIds:[...editedBlackSabre.cardIds] };
  for (const [from,to] of [['jarl-au-marteau-de-guerre','tour-des-tenebres']]) editedTourTenebres.cardIds[editedTourTenebres.cardIds.indexOf(from)] = to;
  const editedLame = { ...MOBA_DECKS[0], cardIds:[...MOBA_DECKS[0].cardIds] };
  editedLame.cardIds[editedLame.cardIds.indexOf('mur-de-boucliers')] = 'lame-des-ergs';
  const editedLima = { ...editedBoarding, cardIds:[...editedBoarding.cardIds] };
  editedLima.cardIds[editedLima.cardIds.indexOf('lettre-de-marque')] = 'le-tresor-de-lima';
  const editedBimini = { ...editedBoarding, cardIds:[...editedBoarding.cardIds] };
  editedBimini.cardIds[editedBimini.cardIds.indexOf('lettre-de-marque')] = 'source-de-bimini';
  const editedSphere = { ...editedBoarding, cardIds: [...editedBoarding.cardIds] };
  for (const from of ['mur-de-boucliers', 'brume-du-fjord']) editedSphere.cardIds[editedSphere.cardIds.indexOf(from)] = 'sphere-de-rotation';
  const decks = [...MOBA_DECKS, edited, editedNew, editedDiscard, editedSearch, editedHarakiri, editedTransfer, editedTokens, editedMomie, editedHeures, editedCorbeaux];
  let announcedSpells = 0;
  let announcedLaneSpells = 0;
  let announcedFriendlySpells = 0;
  let announcedHeals = 0;
  let announcedTransfers = 0;
  let announcedFeasts = 0;
  let announcedReports = 0;
  let announcedWaves = 0;
  let announcedFrostAshWaves = 0;
  let announcedSymmetricWaves = 0;
  let announcedSymmetricWipes = 0;
  let announcedReinforcements = 0;
  let announcedAmbushes = 0;
  const announcedNewSpells = new Set();
  const announcedExtendedSpells = new Set();
  let countersPlayed = 0;
  let announcedCreatures = 0;
  const announcedEquipment = new Set();
  let boardingChoices = 0;
  const cavaliersJoues = new Set();
  let choixOni = 0;
  const duelsArriveeJoues = new Set();
  let blackbeardPlayed = 0;
  let brulotPlayed = 0;
  let roussePlayed = 0;
  const countersJoues = new Set();
  const kingsPlayed = new Set();
  const biminiPlayed = new Set();
  let damePlayed = 0;
  let ghulPlayed = 0, ghulChoices = 0;
  const chercheusePlayed = new Set(), javelotPlayed = new Set(), armesNouvelles = new Set(), autresArmes = new Set(), armesTribut = new Set(), masquesJittes = new Set(), luneSandales = new Set();
  const spherePlayed = new Set();
  for (let index = 0; index < 440; index++) {
    let seed = index + 1;
    const rng = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const duel = rpgMobaCreerPartie(index >= 400 ? (index % 2 ? decks[0] : editedSphere) : index >= 380 ? (index % 2 ? decks[0] : editedBimini) : index >= 360 ? (index % 2 ? decks[0] : editedLima) : index >= 340 ? (index % 2 ? decks[0] : editedLame) : index >= 320 ? editedTourTenebres : index >= 300 ? (index % 2 ? editedToursSable : editedToursFlots) : index < 45 ? decks[index % decks.length] : index < 50 ? editedArmes : index < 60 ? editedBoarding : index < 70 ? editedPirates : index < 80 ? editedRiders : index < 85 ? editedPyre : index < 95 ? editedOni : index < 100 ? editedSteam : index < 110 ? editedFights : index < 120 ? editedBlackbeard : index < 130 ? editedBrulot : index < 140 ? editedRousse : index < 150 ? editedCounters : index < 160 ? editedKings : index < 170 ? editedDame : index < 180 ? editedGhul : index < 190 ? (index % 2 ? decks[0] : editedChercheuse) : index < 200 ? (index % 2 ? decks[0] : editedJavelot) : index < 220 ? (index % 2 ? decks[0] : editedArmor) : (index % 2 ? decks[0] : index < 230 ? editedFive : index < 240 ? editedBlackSabre : index < 260 ? editedTributArmes : index < 280 ? editedMaskJitte : editedLuneSandales), index >= 400 ? (index % 2 ? editedSphere : decks[0]) : index >= 380 && index % 2 ? editedBimini : index >= 360 && index < 380 && index % 2 ? editedLima : index >= 340 && index < 360 && index % 2 ? editedLame : index >= 300 ? decks[0] : index >= 220 && index % 2 ? (index < 230 ? editedFive : index < 240 ? editedBlackSabre : index < 260 ? editedTributArmes : index < 280 ? editedMaskJitte : editedLuneSandales) : index >= 200 && index < 220 && index % 2 ? editedArmor : index >= 190 && index < 200 && index % 2 ? editedJavelot : index >= 180 && index < 190 && index % 2 ? editedChercheuse : decks[(index + 2) % decks.length], { rng }).duel;
    for (const side of ['joueur', 'sorcier']) ok(rpgMobaMulligan(duel, side, choisirMulliganIA(duel, side), rng));
    let actions = 0;
    while (!duel.moba.winner && actions++ < 1000) {
      assert.equal(rpgMobaPlacementCoherent(duel), true);
      const side = duel.tour, defense = side === 'joueur' ? 'sorcier' : 'joueur';
      if (duel.destructionsEnAttente?.length) { const controller = duel.destructionsEnAttente[0].cote; const cible = rpgMobaCiblesDestruction(duel, controller)[0]; assert.ok(cible); ok(rpgMobaResoudreDestruction(duel, controller, cible)); ghulChoices++; continue; }
      if (duel.siteEnAttente && !duel.mobaRechercheEnAttente && !duel.defausseEnAttente) { const controller=duel.siteEnAttente.cote; const cible=rpgMobaChoisirSiteIA(duel,controller); assert.ok(cible); ok(rpgMobaResoudreSite(duel,controller,cible)); continue; }
      if (duel[side].manaChoixEnAttente) { ok(rpgChoisirCouleurMana(duel, side, choisirCouleurManaIA(duel, side))); continue; }
      if (duel.mobaRechercheEnAttente) { const searchSide = duel.mobaRechercheEnAttente.cote; ok(rpgMobaResoudreRecherche(duel, searchSide, rpgMobaChoisirRechercheIA(duel, searchSide))); continue; }
      if (duel.defausseEnAttente) { const discardSide = duel.defausseEnAttente.cote; ok(rpgMobaDefausser(duel, discardSide, choisirDefausseIA(duel, discardSide))); continue; }
      if (duel.arriveeEnAttente) {
        if (Number.isFinite(duel.arriveeEnAttente.abordage)) boardingChoices++;
        if (duel.arriveeEnAttente.carteId === 'oni-de-la-fournaise' && duel.arriveeEnAttente.cibleOni) choixOni++;
        const cible = rpgMobaChoisirArriveeIA(duel, side);
        assert.ok(cible, 'arrival must have a legal choice');
        ok(rpgMobaResoudreArrivee(duel, side, cible)); continue;
      }
      if (duel.mobaSortEnAttente || duel.mobaCreatureEnAttente || duel.effetCreatureEnAttente || duel.combatDeclare || duel.finDeTour) {
        const reaction = rpgMobaChoisirMagieIA(duel, defense, true);
        if (reaction) { const result = rpgMobaLancerMagie(duel, defense, reaction.id, reaction.cible, reaction.lane, reaction.prixLane); ok(result); if (result.contre) countersPlayed++; continue; }
      }
      if (duel.mobaSortEnAttente) { ok(rpgMobaPasserSort(duel, defense)); continue; }
      if (duel.mobaCreatureEnAttente) { ok(rpgMobaPasserCreature(duel, defense)); continue; }
      if (duel.effetCreatureEnAttente) { ok(rpgMobaPasserEffetCreature(duel, defense)); continue; }
      if (duel.combatDeclare) {
        const ids = duel.combatDeclare.attaquants;
        const blocks = rpgMobaChoisirBlocagesIA(duel, side, ids);
        ok(rpgMobaLancerAttaque(duel, side, ids, blocks, { declaree: true })); continue;
      }
      if (duel.finDeTour) { ok(rpgMobaPasserFinDeTour(duel, defense)); continue; }
      const creature = rpgMobaChoisirCreatureIA(duel, side);
      const magie = rpgMobaChoisirMagieIA(duel, side);
      if (magie && (!creature || magie.score >= 35)) {
        const result = MOBA_ARMES.includes(magie.id)
          ? rpgMobaJouerArme(duel, side, magie.id, magie.cible, { ouvrirReponse: true, laneId: magie.lane, slot: magie.emplacementArme })
          : rpgMobaLancerMagie(duel, side, magie.id, magie.cible, magie.lane, magie.prixLane, { ouvrirReponse: true, cibleSecondaireId: magie.cibleSecondaire ?? null, emplacementReanimation: magie.emplacementReanimation ?? null });
        ok(result);
        if (magie.id === 'sphere-de-rotation') spherePlayed.add(side);
        if (magie.id === 'javelot-du-beffroi') javelotPlayed.add(side);
        if (['cuirasse-de-sel','braise-et-sable'].includes(magie.id)) armesNouvelles.add(`${magie.id}:${side}`);
        if (['takouba-des-pistes','armure-de-cendres','sabre-du-croissant-noir','hache-de-la-banquise','lance-de-givre'].includes(magie.id)) autresArmes.add(`${magie.id}:${side}`);
        if (['khopesh-d-or','licou-du-chien-de-sable','harnais-du-mehari'].includes(magie.id)) armesTribut.add(`${magie.id}:${side}`);
        if (['masque-du-guetteur','jitte-d-amayas'].includes(magie.id)) masquesJittes.add(`${magie.id}:${side}`);
        if (['lance-de-la-lune-givree','sandales-de-tislit'].includes(magie.id)) luneSandales.add(`${magie.id}:${side}`);
        if (result.sortEnAttente) {
          announcedSpells++;
          if (['sabre-maudit','brise-lame','memoire-de-l-armurerie'].includes(magie.id)) announcedEquipment.add(magie.id);
          if (magie.cible === 'sorcier') announcedLaneSpells++;
          if (magie.id === 'eau-de-la-source') announcedHeals++;
          if (magie.id === 'festin-des-vaillants') announcedFeasts++;
          if (magie.id === 'rapport-du-greffier') announcedReports++;
          if (['tempete-de-sable', 'vent-rouge', 'brisure-de-verre'].includes(magie.id)) announcedWaves++;
          if (['brume-du-fjord', 'hurlement-du-blizzard', 'verglas', 'nuage-de-cendres'].includes(magie.id)) announcedFrostAshWaves++;
          if (['grand-hiver', 'tempete-de-foudre-et-de-givre'].includes(magie.id)) announcedSymmetricWaves++;
          if (['la-derniere-pesee', 'ressac-de-la-lune-noire'].includes(magie.id)) announcedSymmetricWipes++;
          if (['mur-de-boucliers', 'serment-de-la-forge', 'rempart-de-dunes', 'offrande-de-lin'].includes(magie.id)) announcedReinforcements++;
          if (magie.id === 'embuscade') announcedAmbushes++;
          if (['nom-efface', 'le-routier', 'neige-noire'].includes(magie.id)) announcedNewSpells.add(magie.id);
          if (['le-poids', 'la-grande-pesee'].includes(magie.id)) announcedTransfers++;
          if (duel.mobaSortEnAttente?.cibleCote === side) announcedFriendlySpells++;
          if (['appat-de-la-meute', 'frappe-iaijutsu', 'courant-de-retour', 'haut-fond', 'lame-de-mer', 'effacement-des-faibles', 'le-jugement-des-colosses'].includes(magie.id)) announcedExtendedSpells.add(magie.id);
        }
        continue;
      }
      if (creature) { const result = rpgMobaJouerCreature(duel, side, creature.id, creature.lane, creature.slot, { ouvrirReponse: true }); ok(result); if (result.creatureEnAttente) { announcedCreatures++; if (creature.id === 'la-barbe-noire') blackbeardPlayed++; if (creature.id === 'le-brulot') brulotPlayed++; if (creature.id === 'la-barbe-rousse') roussePlayed++; if (['eirik-du-premier-serment','pourfendeur-des-djinns'].includes(creature.id)) countersJoues.add(creature.id); if (['salem','kusayla-roi-des-imazighen'].includes(creature.id)) kingsPlayed.add(creature.id); if (creature.id === 'source-de-bimini') biminiPlayed.add(side); if (creature.id === 'dame-aux-ailes-d-or') damePlayed++; if (creature.id === 'ghul-des-cendres') ghulPlayed++; if (creature.id === 'chercheuse-des-armes-ensevelies') chercheusePlayed.add(side); if (creature.id.startsWith('le-cavalier-')) cavaliersJoues.add(creature.id); if (['bakunawa', 'cavalier-amazigh-du-desert'].includes(creature.id)) duelsArriveeJoues.add(creature.id); } continue; }
      const attackers = duel.attaqueJouee !== side ? rpgMobaChoisirAttaquantsIA(duel, side) : [];
      if (attackers.length) { ok(rpgMobaDeclarerAttaque(duel, side, attackers, rpgMobaChoisirCiblesAttaqueIA(duel, side, attackers))); continue; }
      ok(rpgMobaTerminerTour(duel, side));
    }
    if (!duel.moba.winner) {
      // Sans fatigue, deux paquets vides ne garantissent pas une fin :
      // il peut manquer du mana, des créatures ou une attaque favorable.
      for (const side of ['joueur', 'sorcier']) {
        assert.equal(duel[side].deck.length, 0, `game ${index}: deck not empty`);
      }
    }
  }
  assert.deepEqual(spherePlayed, new Set(['joueur', 'sorcier']), 'simulated games play the Sphère in both seats');
  assert.ok(blackbeardPlayed > 0, 'simulated games exercise Barbe Noire');
  assert.ok(brulotPlayed > 0, 'simulated games exercise Le Brûlot');
  assert.ok(roussePlayed > 0, 'simulated games exercise Barbe-Rousse');
  assert.deepEqual(countersJoues, new Set(['eirik-du-premier-serment','pourfendeur-des-djinns']));
  assert.deepEqual(kingsPlayed, new Set(['salem','kusayla-roi-des-imazighen']));
  for (const id of ['lance-de-la-lune-givree','sandales-de-tislit']) for (const side of ['joueur','sorcier']) assert.ok(luneSandales.has(`${id}:${side}`), `${id} is played by ${side}`);
  for (const id of ['masque-du-guetteur','jitte-d-amayas']) for (const side of ['joueur','sorcier']) assert.ok(masquesJittes.has(`${id}:${side}`), `${id} is played by ${side}`);
  for (const id of ['khopesh-d-or','licou-du-chien-de-sable','harnais-du-mehari']) for (const side of ['joueur','sorcier']) assert.ok(armesTribut.has(`${id}:${side}`), `${id} is played by ${side}`);
  for (const id of ['takouba-des-pistes','armure-de-cendres','sabre-du-croissant-noir','hache-de-la-banquise','lance-de-givre']) for (const side of ['joueur','sorcier']) assert.ok(autresArmes.has(`${id}:${side}`), `${id} is played by ${side}`);
  assert.deepEqual(armesNouvelles, new Set(['cuirasse-de-sel:joueur','cuirasse-de-sel:sorcier','braise-et-sable:joueur','braise-et-sable:sorcier']), 'both new weapons are played by both seats');
  assert.deepEqual(javelotPlayed, new Set(['joueur','sorcier']), 'simulated games play the Javelot in both seats');
  assert.deepEqual(chercheusePlayed, new Set(['joueur','sorcier']), 'simulated games play Chercheuse in both seats');
  assert.ok(ghulPlayed > 0 && ghulChoices > 0, 'simulated games play Ghul and resolve its death choice');
  assert.deepEqual(biminiPlayed, new Set(['joueur','sorcier']), 'both seats announce the Source');
  assert.ok(damePlayed > 0, 'simulated games play the Dame');
  assert.deepEqual(duelsArriveeJoues, new Set(['bakunawa', 'cavalier-amazigh-du-desert']));
  assert.ok(boardingChoices > 0, 'simulated games exercise boarding');
  assert.ok(choixOni > 0, 'simulated games exercise the Oni second target');
  assert.ok(cavaliersJoues.has('le-cavalier-des-dunes-gelees'));
  assert.ok(cavaliersJoues.has('le-cavalier-du-ressac-gele'));
  assert.ok(cavaliersJoues.has('le-cavalier-du-bucher'));
  assert.ok(cavaliersJoues.has('le-cavalier-de-vapeur'));
  assert.ok(announcedEquipment.has('sabre-maudit'), 'simulated games exercise equipment');
  assert.ok(announcedCreatures > 0, 'simulated games exercise creature announcements');
  assert.ok(announcedSpells > 0, 'simulated games exercise the targeted spell window');
  assert.ok(announcedLaneSpells > 0, 'simulated games exercise lane spell responses');
  assert.ok(announcedFriendlySpells > 0, 'simulated games exercise friendly-target spell responses');
  assert.ok(announcedHeals > 0, 'simulated games exercise the healing lane response');
  assert.ok(announcedFeasts > 0, 'simulated games exercise the global healing response');
  assert.ok(announcedReports > 0, 'simulated games exercise the deck draw response');
  assert.ok(announcedWaves > 0, 'simulated games exercise the hostile wave response');
  assert.ok(announcedFrostAshWaves > 0, 'simulated games exercise frost and ash wave responses');
  assert.ok(announcedSymmetricWaves > 0, 'simulated games exercise symmetric wave responses');
  assert.ok(announcedSymmetricWipes > 0, 'simulated games exercise symmetric wipe responses');
  assert.ok(announcedReinforcements > 0, 'simulated games exercise reinforcement responses');
  assert.ok(announcedAmbushes > 0, 'simulated games exercise Ambush responses');
  assert.ok(announcedNewSpells.has('nom-efface'), 'simulated games exercise hand responses');
  assert.ok(announcedNewSpells.has('le-routier'), 'simulated games exercise draw-and-discard responses');
  assert.ok(announcedNewSpells.has('neige-noire'), 'simulated games exercise priced symmetric wipe responses');
  assert.ok(countersPlayed > 0, 'simulated games exercise spell counters');
  assert.ok(announcedTransfers > 0, 'simulated games exercise the transfer lane response');
  assert.ok(announcedExtendedSpells.size > 0, 'simulated games exercise the extended spell window');
});

test('decision probes do not mutate the real game', () => {
  const duel = rpgMobaCreerPartie(MOBA_DECKS[0], MOBA_DECKS[3]).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  ok(rpgChoisirCouleurMana(duel, 'joueur', choisirCouleurManaIA(duel, 'joueur')));
  const avant = JSON.stringify(duel);
  rpgMobaChoisirCreatureIA(duel, 'joueur'); rpgMobaChoisirMagieIA(duel, 'joueur');
  assert.equal(JSON.stringify(duel), avant);
});

test('AI uses a legal instant in a response window and does not cross lanes when blocking', () => {
  const duel = rpgMobaCreerPartie(MOBA_DECKS[0], MOBA_DECKS[0], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'neige'));
  duel.joueur.mana.neige = 10;
  duel.joueur.main.push('jarl-au-marteau-de-guerre');
  const attacker = rpgMobaJouerCreature(duel, 'joueur', 'jarl-au-marteau-de-guerre', 'left', 0);
  ok(attacker); attacker.entite.ready = true;
  ok(rpgMobaTerminerTour(duel, 'joueur')); ok(rpgMobaPasserFinDeTour(duel, 'sorcier'));
  if (duel.sorcier.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'sorcier', 'neige'));
  duel.sorcier.mana.neige = 10;
  duel.sorcier.main.push('loup-des-neiges', 'loup-des-neiges');
  const blocker = rpgMobaJouerCreature(duel, 'sorcier', 'loup-des-neiges', 'left', 0); ok(blocker);
  ok(rpgMobaJouerCreature(duel, 'sorcier', 'loup-des-neiges', 'right', 0));
  ok(rpgMobaTerminerTour(duel, 'sorcier')); ok(rpgMobaPasserFinDeTour(duel, 'joueur'));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'neige'));
  ok(rpgMobaDeclarerAttaque(duel, 'joueur', [attacker.entite.id]));
  const blocks = rpgMobaChoisirBlocagesIA(duel, 'joueur', [attacker.entite.id]);
  assert.deepEqual(blocks[attacker.entite.id], [blocker.entite.id], 'provocation is satisfied in the same lane');
  duel.sorcier.mana.neige = 10;
  duel.sorcier.main = ['poigne-de-givre'];
  const magie = rpgMobaChoisirMagieIA(duel, 'sorcier', true);
  assert.equal(magie?.id, 'poigne-de-givre');
  assert.equal(magie?.cible, attacker.entite.id);
  ok(rpgMobaLancerMagie(duel, 'sorcier', magie.id, magie.cible, magie.lane, magie.prixLane));
  if (duel.combatDeclare) ok(rpgMobaLancerAttaque(duel, 'joueur', duel.combatDeclare.attaquants, blocks, { declaree: true }));
});

test('AI prefers the spell that wins the second lane over other possible moves', async () => {
  const { mobaInfliger } = await import('../src/games/rpgMoba.js');
  const duel = rpgMobaCreerPartie(MOBA_DECKS[0], MOBA_DECKS[0], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'neige'));
  duel.joueur.main = ['grand-hiver', 'eclair-du-marteau', 'ashigaru-des-braises'];
  duel.joueur.mana.neige = 10; duel.joueur.mana.braise = 10;
  ok(mobaInfliger(duel.moba, 'joueur', 'left', 20));
  ok(mobaInfliger(duel.moba, 'joueur', 'right', 17));
  const spell = rpgMobaChoisirMagieIA(duel, 'joueur');
  assert.equal(spell?.id, 'eclair-du-marteau');
  assert.equal(spell?.lane, 'right');
  assert.ok(spell.score >= 35, 'board prioritizes conquest over summoning');
  ok(rpgMobaLancerMagie(duel, 'joueur', spell.id, spell.cible, spell.lane));
  assert.equal(duel.moba.winner, 'joueur');
});

test('AI avoids a losing board wipe but uses one when enemy losses are greater', () => {
  const duel = rpgMobaCreerPartie(MOBA_DECKS[0], MOBA_DECKS[0], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'neige'));
  duel.joueur.mana.neige = 20; duel.joueur.mana.braise = 20;
  duel.joueur.main = ['jarl-au-marteau-de-guerre'];
  const ally = rpgMobaJouerCreature(duel, 'joueur', 'jarl-au-marteau-de-guerre', 'left', 0).entite;
  ok(rpgMobaTerminerTour(duel, 'joueur')); ok(rpgMobaPasserFinDeTour(duel, 'sorcier'));
  if (duel.sorcier.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'sorcier', 'braise'));
  duel.sorcier.mana.braise = 20; duel.sorcier.main = ['ashigaru-des-braises'];
  ok(rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0));
  ok(rpgMobaTerminerTour(duel, 'sorcier')); ok(rpgMobaPasserFinDeTour(duel, 'joueur'));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'neige'));
  duel.joueur.mana.neige = 20; duel.joueur.main = ['la-derniere-pesee'];
  duel.joueur.mana.tenebres = 20;
  assert.equal(rpgMobaChoisirMagieIA(duel, 'joueur'), null, 'do not sacrifice a stronger allied board');
  // Invert the comparison without using an unsafe real-game move.
  ally.atk = 0; ally.pv = 1;
  duel.sorcier.creatures[0].atk = 8; duel.sorcier.creatures[0].pv = 8;
  const spell = rpgMobaChoisirMagieIA(duel, 'joueur');
  assert.equal(spell?.id, 'la-derniere-pesee');
  ok(rpgMobaLancerMagie(duel, 'joueur', spell.id, spell.cible, spell.lane));
  assert.equal(duel.joueur.creatures.length, 0);
  assert.equal(duel.sorcier.creatures.length, 0);
});

test('AI does not throw a weak creature into a strong same-lane blocker', () => {
  const duel = rpgMobaCreerPartie(MOBA_DECKS[0], MOBA_DECKS[0], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'braise'));
  duel.joueur.main = ['ashigaru-des-braises']; duel.joueur.mana.braise = 10;
  const attacker = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  ok(rpgMobaTerminerTour(duel, 'joueur')); ok(rpgMobaPasserFinDeTour(duel, 'sorcier'));
  if (duel.sorcier.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'sorcier', 'neige'));
  duel.sorcier.main = ['jarl-au-marteau-de-guerre']; duel.sorcier.mana.neige = 10;
  ok(rpgMobaJouerCreature(duel, 'sorcier', 'jarl-au-marteau-de-guerre', 'left', 0));
  ok(rpgMobaTerminerTour(duel, 'sorcier')); ok(rpgMobaPasserFinDeTour(duel, 'joueur'));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'braise'));
  const avant = JSON.stringify(duel);
  assert.deepEqual(rpgMobaChoisirAttaquantsIA(duel, 'joueur'), []);
  assert.equal(JSON.stringify(duel), avant, 'combat search leaves live state untouched');
  assert.ok(duel.joueur.creatures.includes(attacker));
});

test('AI preserves ephemeral attackers and short-lived buffs after combat', () => {
  const duel = rpgMobaCreerPartie(MOBA_DECKS[0], MOBA_DECKS[0], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'braise'));
  duel.joueur.main = ['ashigaru-des-braises', 'djinn-de-la-premiere-etincelle', 'mur-de-boucliers'];
  duel.joueur.mana.braise = 20; duel.joueur.mana.neige = 20;
  const creature = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  creature.ready = true;
  ok(rpgMobaDeclarerAttaque(duel, 'joueur', [creature.id]));
  ok(rpgMobaLancerAttaque(duel, 'joueur', [creature.id], {}, { declaree: true }));
  assert.equal(rpgMobaChoisirCreatureIA(duel, 'joueur'), null);
  assert.equal(rpgMobaChoisirMagieIA(duel, 'joueur'), null);
});

test('AI chooses an eligible enemy for neutral exile, or an eligible ally if no enemy is legal', () => {
  const duel = rpgMobaCreerPartie(MOBA_DECKS[4], MOBA_DECKS[4], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'neige'));
  duel.joueur.mana.braise = 20; duel.joueur.mana.neige = 20; duel.joueur.mana.tenebres = 20;
  duel.joueur.main = ['ashigaru-des-braises'];
  const enemy = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  ok(rpgMobaTerminerTour(duel, 'joueur')); ok(rpgMobaPasserFinDeTour(duel, 'sorcier'));
  if (duel.sorcier.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'sorcier', 'neige'));
  duel.sorcier.mana.braise = 20; duel.sorcier.mana.neige = 20; duel.sorcier.mana.tenebres = 20;
  duel.sorcier.main = ['ashigaru-des-braises', 'valkyrie-des-neuf-nuits'];
  const ally = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0).entite;
  const valkyrie = rpgMobaJouerCreature(duel, 'sorcier', 'valkyrie-des-neuf-nuits', 'center', 0);
  ok(valkyrie); assert.equal(valkyrie.arriveeEnAttente, true);
  assert.equal(rpgMobaChoisirArriveeIA(duel, 'sorcier'), enemy.id);
  ok(rpgMobaResoudreArrivee(duel, 'sorcier', enemy.id));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
  // A second valid arrival with no enemy still finds the other allied creature.
  duel.sorcier.main.push('valkyrie-des-neuf-nuits');
  const second = rpgMobaJouerCreature(duel, 'sorcier', 'valkyrie-des-neuf-nuits', 'right', 1);
  ok(second); assert.equal(second.arriveeEnAttente, true);
  assert.equal(rpgMobaChoisirArriveeIA(duel, 'sorcier'), ally.id);
  ok(rpgMobaResoudreArrivee(duel, 'sorcier', ally.id));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('AI assigns forced blockers to attackers in their own lane, including zero attack', () => {
  const duel = rpgMobaCreerPartie(MOBA_DECKS[0], MOBA_DECKS[0], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'neige'));
  duel.joueur.mana.braise = 10; duel.joueur.main = ['ashigaru-des-braises'];
  const attacker = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  ok(rpgMobaTerminerTour(duel, 'joueur')); ok(rpgMobaPasserFinDeTour(duel, 'sorcier'));
  if (duel.sorcier.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'sorcier', 'neige'));
  duel.sorcier.mana.braise = 10; duel.sorcier.main = ['ashigaru-des-braises', 'ashigaru-des-braises'];
  const blocker = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  const distant = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0).entite;
  ok(rpgMobaTerminerTour(duel, 'sorcier')); ok(rpgMobaPasserFinDeTour(duel, 'joueur'));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'neige'));
  duel.joueur.mana.neige = 10; duel.joueur.main = ['embuscade'];
  ok(rpgMobaLancerMagie(duel, 'joueur', 'embuscade'));
  attacker.atk = 0;
  ok(rpgMobaDeclarerAttaque(duel, 'joueur', [attacker.id]));
  const blocks = rpgMobaChoisirBlocagesIA(duel, 'joueur', [attacker.id]);
  assert.deepEqual(blocks[attacker.id], [blocker.id]); assert.ok(!Object.values(blocks).flat().includes(distant.id));
  ok(rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], blocks, { declaree: true }));
});

test('AI selects the lane where Le Poids wins and uses isolated probes', async () => {
  const { mobaInfliger } = await import('../src/games/rpgMoba.js');
  const duel = rpgMobaCreerPartie(MOBA_DECKS[4], MOBA_DECKS[4], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', choisirCouleurManaIA(duel, 'joueur')));
  duel.joueur.mana.tenebres = 20; duel.joueur.main = ['le-poids'];
  ok(mobaInfliger(duel.moba, 'joueur', 'right', 20)); ok(mobaInfliger(duel.moba, 'joueur', 'left', 18));
  const before = JSON.stringify(duel);
  const choice = rpgMobaChoisirMagieIA(duel, 'joueur');
  assert.equal(choice.id, 'le-poids'); assert.equal(choice.lane, 'left');
  assert.equal(JSON.stringify(duel), before);
  ok(rpgMobaLancerMagie(duel, 'joueur', choice.id, choice.cible, choice.lane));
  assert.equal(duel.moba.winner, 'joueur'); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('AI picks independent affordable payment and winning transfer lanes for La Grande Pesée', async () => {
  const { mobaInfliger } = await import('../src/games/rpgMoba.js');
  const duel = rpgMobaCreerPartie(MOBA_DECKS[4], MOBA_DECKS[4], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', choisirCouleurManaIA(duel, 'joueur')));
  duel.joueur.mana.tenebres = 20; duel.joueur.main = ['la-grande-pesee'];
  ok(mobaInfliger(duel.moba, 'joueur', 'right', 20)); ok(mobaInfliger(duel.moba, 'joueur', 'left', 17));
  ok(mobaInfliger(duel.moba, 'sorcier', 'left', 19));
  const choice = rpgMobaChoisirMagieIA(duel, 'joueur');
  assert.equal(choice.id, 'la-grande-pesee'); assert.equal(choice.lane, 'left'); assert.equal(choice.prixLane, 'center');
  ok(rpgMobaLancerMagie(duel, 'joueur', choice.id, choice.cible, choice.lane, choice.prixLane));
  assert.equal(duel.moba.winner, 'joueur'); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('AI summons Tarek and can plan legal attacks with his rapid tokens', () => {
  const duel = rpgMobaCreerPartie(MOBA_DECKS[0], MOBA_DECKS[0], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'sable'));
  duel.joueur.main = ['tarek']; duel.joueur.mana.sable = 10;
  const choice = rpgMobaChoisirCreatureIA(duel, 'joueur');
  assert.equal(choice?.id, 'tarek');
  ok(rpgMobaJouerCreature(duel, 'joueur', choice.id, choice.lane, choice.slot));
  const dogs = duel.joueur.creatures.filter((e) => e.carteId === 'chien-de-sable');
  assert.equal(dogs.length, 2);
  const attackers = rpgMobaChoisirAttaquantsIA(duel, 'joueur');
  assert.ok(attackers.some((id) => dogs.some((dog) => dog.id === id)));
  ok(rpgMobaDeclarerAttaque(duel, 'joueur', attackers, rpgMobaChoisirCiblesAttaqueIA(duel, 'joueur', attackers)));
  ok(rpgMobaLancerAttaque(duel, 'joueur', attackers, {}, { declaree: true }));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});


test('AI chooses a winning Braisier arrival before a more expensive creature, without mutating the duel', () => {
  const duel = rpgMobaCreerPartie(MOBA_DECKS[0], MOBA_DECKS[0], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', choisirCouleurManaIA(duel, 'joueur')));
  duel.joueur.mana.braise = 20; duel.joueur.mana.neige = 20;
  duel.joueur.main = ['braisier-du-souk', 'jarl-au-marteau-de-guerre'];
  mobaInfliger(duel.moba, 'joueur', 'left', 20);
  mobaInfliger(duel.moba, 'joueur', 'right', 19);
  const before = JSON.stringify(duel);
  const choice = rpgMobaChoisirCreatureIA(duel, 'joueur');
  assert.deepEqual(choice, { id: 'braisier-du-souk', lane: 'right', slot: 0 });
  assert.equal(JSON.stringify(duel), before);
  ok(rpgMobaJouerCreature(duel, 'joueur', choice.id, choice.lane, choice.slot));
  assert.equal(duel.moba.winner, 'joueur');
});

test('AI avoids a Valkyrie wave that would destroy more allied value than it gains', () => {
  const duel = rpgMobaCreerPartie(MOBA_DECKS[0], MOBA_DECKS[0], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', choisirCouleurManaIA(duel, 'joueur')));
  duel.joueur.mana.braise = 20; duel.joueur.mana.neige = 20;
  duel.joueur.main = Array(4).fill('ashigaru-des-braises');
  for (const [lane, slot] of [['left', 0], ['left', 1], ['center', 0], ['right', 0]]) {
    const placed = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', lane, slot);
    ok(placed); placed.entite.atk = 10;
  }
  duel.joueur.main = ['valkyrie-des-glaces', 'jarl-au-marteau-de-guerre'];
  let randomCalls = 0; rpgReglerHasard(duel, () => { randomCalls += 1; return 0; });
  const before = JSON.stringify(duel);
  const choice = rpgMobaChoisirCreatureIA(duel, 'joueur');
  assert.equal(choice?.id, 'jarl-au-marteau-de-guerre');
  assert.equal(JSON.stringify(duel), before); assert.equal(randomCalls, 0, 'probing must not consume live RNG');
  ok(rpgMobaJouerCreature(duel, 'joueur', choice.id, choice.lane, choice.slot));
});

test('AI can play Valkyrie when the global wave is favorable', () => {
  const duel = rpgMobaCreerPartie(MOBA_DECKS[0], MOBA_DECKS[0], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', choisirCouleurManaIA(duel, 'joueur')));
  duel.joueur.mana.neige = 20; duel.joueur.main = ['valkyrie-des-glaces'];
  const before = JSON.stringify(duel); const choice = rpgMobaChoisirCreatureIA(duel, 'joueur');
  assert.equal(choice?.id, 'valkyrie-des-glaces'); assert.equal(JSON.stringify(duel), before);
  ok(rpgMobaJouerCreature(duel, 'joueur', choice.id, choice.lane, choice.slot));
});

test('AI spell probes resolve human Ghul retaliation on copies without spending live randomness', () => {
  const duel=rpgMobaCreerPartie(MOBA_DECKS[0],MOBA_DECKS[0],{rng:()=>.5}).duel;ok(rpgMobaMulligan(duel,'joueur',[]));ok(rpgMobaMulligan(duel,'sorcier',[]));
  if(duel.joueur.manaChoixEnAttente)ok(rpgChoisirCouleurMana(duel,'joueur',choisirCouleurManaIA(duel,'joueur')));
  duel.joueur.main=['ghul-des-cendres'];duel.joueur.mana.braise=30;const ghul=rpgMobaJouerCreature(duel,'joueur','ghul-des-cendres','left',0).entite;rpgFinDeTour(duel);
  if(duel.sorcier.manaChoixEnAttente)ok(rpgChoisirCouleurMana(duel,'sorcier',choisirCouleurManaIA(duel,'sorcier')));
  duel.sorcier.main=['mousse-des-galiotes','trait-de-braise'];duel.sorcier.mana.sable=30;duel.sorcier.mana.braise=30;const mousse=rpgMobaJouerCreature(duel,'sorcier','mousse-des-galiotes','right',0).entite;mousse.pv=1;
  let randomCalls=0;rpgReglerHasard(duel,()=>{randomCalls++;return .5;});const before=JSON.stringify(duel);assert.notEqual(rpgMobaChoisirMagieIA(duel,'sorcier')?.cible,ghul.id);assert.equal(JSON.stringify(duel),before);assert.equal(randomCalls,0);
  ghul.atk=8;const beforeThreat=JSON.stringify(duel);const choice=rpgMobaChoisirMagieIA(duel,'sorcier');assert.equal(choice?.id,'trait-de-braise');assert.equal(choice?.cible,ghul.id);assert.equal(JSON.stringify(duel),beforeThreat);assert.equal(randomCalls,0);
});

test('AI evaluates the printed Javelot as an attachment on isolated copies', () => {
  const duel=rpgMobaCreerPartie(MOBA_DECKS[0],MOBA_DECKS[0],{rng:()=>.5}).duel;ok(rpgMobaMulligan(duel,'joueur',[]));ok(rpgMobaMulligan(duel,'sorcier',[]));
  if(duel.joueur.manaChoixEnAttente)ok(rpgChoisirCouleurMana(duel,'joueur',choisirCouleurManaIA(duel,'joueur')));
  duel.joueur.main=['gardienne-des-portes-de-sable','javelot-du-beffroi'];duel.joueur.mana.sable=30;const porteur=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).entite;
  let appels=0;rpgReglerHasard(duel,()=>{appels++;return .5;});const avant=JSON.stringify(duel);assert.equal(rpgMobaChoisirCreatureIA(duel,'joueur'),null);const choix=rpgMobaChoisirMagieIA(duel,'joueur');assert.equal(choix?.id,'javelot-du-beffroi');assert.equal(choix?.cible,porteur.id);assert.equal(JSON.stringify(duel),avant);assert.equal(appels,0);
  ok(rpgMobaJouerArme(duel,'joueur',choix.id,choix.cible));assert.equal(porteur.arme?.carteId,'javelot-du-beffroi');assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('AI can counter an announced Javelot without exposing or changing its own state during planning', () => {
  const duel=rpgMobaCreerPartie(MOBA_DECKS[0],MOBA_DECKS[0],{rng:()=>.5}).duel;ok(rpgMobaMulligan(duel,'joueur',[]));ok(rpgMobaMulligan(duel,'sorcier',[]));
  if(duel.joueur.manaChoixEnAttente)ok(rpgChoisirCouleurMana(duel,'joueur',choisirCouleurManaIA(duel,'joueur')));
  duel.joueur.main=['gardienne-des-portes-de-sable','javelot-du-beffroi'];duel.joueur.mana.sable=30;const porteur=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;ok(rpgMobaJouerArme(duel,'joueur','javelot-du-beffroi',porteur.id,{ouvrirReponse:true}));
  duel.sorcier.main=['contresort-des-abimes'];duel.sorcier.mana.eau=30;let appels=0;rpgReglerHasard(duel,()=>{appels++;return .5;});const avant=JSON.stringify(duel);const choix=rpgMobaChoisirMagieIA(duel,'sorcier',true);
  assert.equal(choix?.id,'contresort-des-abimes');assert.equal(JSON.stringify(duel),avant);assert.equal(appels,0);assert.equal(rpgMobaLancerMagie(duel,'sorcier',choix.id).contre,true);assert.equal(porteur.arme,null);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for (const id of ['cuirasse-de-sel','braise-et-sable','takouba-des-pistes','armure-de-cendres','sabre-du-croissant-noir','hache-de-la-banquise','lance-de-givre','khopesh-d-or','licou-du-chien-de-sable','harnais-du-mehari','masque-du-guetteur','jitte-d-amayas','lance-de-la-lune-givree','sandales-de-tislit','takouba-de-tin-hinan','sphere-de-rotation']) test(`AI evaluates ${id} with isolated attachment probes`, () => {
  const duel=rpgMobaCreerPartie(MOBA_DECKS[0],MOBA_DECKS[0],{rng:()=>.5}).duel;ok(rpgMobaMulligan(duel,'joueur',[]));ok(rpgMobaMulligan(duel,'sorcier',[]));
  if(duel.joueur.manaChoixEnAttente)ok(rpgChoisirCouleurMana(duel,'joueur',choisirCouleurManaIA(duel,'joueur')));duel.joueur.main=['gardienne-des-portes-de-sable',id];duel.joueur.mana.sable=30;duel.joueur.mana.braise=30;duel.joueur.mana.tenebres=30;duel.joueur.mana.neige=30;duel.joueur.mana.eau=30;const porteur=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).entite;
  let appels=0;rpgReglerHasard(duel,()=>{appels++;return .5;});const avant=JSON.stringify(duel);const choix=rpgMobaChoisirMagieIA(duel,'joueur');assert.equal(choix?.id,id);assert.equal(choix?.cible,porteur.id);assert.equal(JSON.stringify(duel),avant);assert.equal(appels,0);
  ok(rpgMobaJouerArme(duel,'joueur',choix.id,choix.cible));assert.equal(porteur.arme.carteId,id);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('AI evaluates Grappin boarding on an isolated copy, preferring a useful carrier', () => {
  const duel=rpgMobaCreerPartie(MOBA_DECKS[0],MOBA_DECKS[0],{rng:()=>.5}).duel;ok(rpgMobaMulligan(duel,'joueur',[]));ok(rpgMobaMulligan(duel,'sorcier',[]));
  if(duel.joueur.manaChoixEnAttente)ok(rpgChoisirCouleurMana(duel,'joueur',choisirCouleurManaIA(duel,'joueur')));
  duel.joueur.main=['gardienne-des-portes-de-sable','mousse-des-galiotes','grappin-d-abordage'];duel.joueur.mana.sable=30;
  const cher=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;rpgMobaJouerCreature(duel,'joueur','mousse-des-galiotes','center',0);rpgFinDeTour(duel);if(duel.sorcier.manaChoixEnAttente)ok(rpgChoisirCouleurMana(duel,'sorcier',choisirCouleurManaIA(duel,'sorcier')));
  duel.sorcier.main=['gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;const victime=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;rpgFinDeTour(duel);if(duel.joueur.manaChoixEnAttente)ok(rpgChoisirCouleurMana(duel,'joueur',choisirCouleurManaIA(duel,'joueur')));duel.joueur.mana.sable=30;
  let appels=0;rpgReglerHasard(duel,()=>{appels++;return .5;});const avant=JSON.stringify(duel);const choix=rpgMobaChoisirMagieIA(duel,'joueur');
  assert.equal(choix?.id,'grappin-d-abordage');assert.equal(choix.cible,cher.id);assert.equal(JSON.stringify(duel),avant);assert.equal(appels,0);
  assert.equal(rpgMobaJouerArme(duel,'joueur',choix.id,choix.cible).arriveeEnAttente,true);assert.equal(rpgMobaChoisirArriveeIA(duel,'joueur'),victime.id);ok(rpgMobaResoudreArrivee(duel,'joueur',victime.id));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('AI counter probes account for the human Grappin capture without resolving the live choice', () => {
  const duel=rpgMobaCreerPartie(MOBA_DECKS[0],MOBA_DECKS[0],{rng:()=>.5}).duel;ok(rpgMobaMulligan(duel,'joueur',[]));ok(rpgMobaMulligan(duel,'sorcier',[]));
  if(duel.joueur.manaChoixEnAttente)ok(rpgChoisirCouleurMana(duel,'joueur',choisirCouleurManaIA(duel,'joueur')));
  rpgFinDeTour(duel);if(duel.sorcier.manaChoixEnAttente)ok(rpgChoisirCouleurMana(duel,'sorcier',choisirCouleurManaIA(duel,'sorcier')));duel.sorcier.main=['viking-des-neiges'];duel.sorcier.mana.neige=30;const victime=rpgMobaJouerCreature(duel,'sorcier','viking-des-neiges','left',0).entite;rpgFinDeTour(duel);if(duel.joueur.manaChoixEnAttente)ok(rpgChoisirCouleurMana(duel,'joueur',choisirCouleurManaIA(duel,'joueur')));
  duel.joueur.main=['mousse-des-galiotes','grappin-d-abordage'];duel.joueur.mana.sable=30;const porteur=rpgMobaJouerCreature(duel,'joueur','mousse-des-galiotes','right',0).entite;
  ok(rpgMobaJouerArme(duel,'joueur','grappin-d-abordage',porteur.id,{ouvrirReponse:true}));duel.sorcier.main=['contresort-des-abimes'];duel.sorcier.mana.eau=30;
  let appels=0;rpgReglerHasard(duel,()=>{appels++;return .5;});const avant=JSON.stringify(duel);const choix=rpgMobaChoisirMagieIA(duel,'sorcier',true);
  assert.equal(choix?.id,'contresort-des-abimes');assert.equal(JSON.stringify(duel),avant);assert.equal(appels,0);assert.equal(duel.arriveeEnAttente,null);assert.ok(duel.sorcier.creatures.includes(victime));
});

test('IA MOBA : Tour de sable se protège seule et bloque obligatoirement dans sa voie', () => {
  const duel=rpgMobaCreerPartie(MOBA_DECKS[0],MOBA_DECKS[0],{rng:()=>.5}).duel;
  ok(rpgMobaMulligan(duel,'joueur',[]));ok(rpgMobaMulligan(duel,'sorcier',[]));if(duel.joueur.manaChoixEnAttente)ok(rpgChoisirCouleurMana(duel,'joueur','sable'));
  duel.joueur.main=['gardienne-des-portes-de-sable','gardienne-des-portes-de-sable'];duel.joueur.mana.sable=30;
  const a=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;
  const b=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).entite;
  ok(rpgMobaTerminerTour(duel,'joueur'));ok(rpgMobaPasserFinDeTour(duel,'sorcier'));
  if(duel.sorcier.manaChoixEnAttente)ok(rpgChoisirCouleurMana(duel,'sorcier','sable'));
  duel.sorcier.main=['tour-de-sable'];duel.sorcier.mana.sable=30;
  const tour=rpgMobaJouerCreature(duel,'sorcier','tour-de-sable','left',0).entite;assert.ok(tour);
  const before=JSON.stringify(duel);assert.equal(rpgMobaChoisirArriveeIA(duel,'sorcier'),tour.id);assert.equal(JSON.stringify(duel),before);ok(rpgMobaResoudreArrivee(duel,'sorcier',tour.id));
  ok(rpgMobaTerminerTour(duel,'sorcier'));ok(rpgMobaPasserFinDeTour(duel,'joueur'));if(duel.joueur.manaChoixEnAttente)ok(rpgChoisirCouleurMana(duel,'joueur','sable'));
  a.ready=true;b.ready=true;ok(rpgMobaDeclarerAttaque(duel,'joueur',[a.id,b.id]));
  const blocks=rpgMobaChoisirBlocagesIA(duel,'joueur',[a.id,b.id]);assert.deepEqual(blocks[a.id],[tour.id]);assert.ok(!(blocks[b.id]??[]).includes(tour.id));
  ok(rpgMobaLancerAttaque(duel,'joueur',[a.id,b.id],blocks,{declaree:true}));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('IA MOBA : paquet vide, elle tente une brèche au lieu de passer indéfiniment devant deux Murs', () => {
  const duel=rpgMobaCreerPartie(MOBA_DECKS[0],MOBA_DECKS[1],{rng:()=>.5}).duel;
  ok(rpgMobaMulligan(duel,'joueur',[]));ok(rpgMobaMulligan(duel,'sorcier',[]));if(duel.joueur.manaChoixEnAttente)ok(rpgChoisirCouleurMana(duel,'joueur','neige'));
  duel.joueur.main=['tour-de-neige','tour-des-flots'];duel.joueur.mana.neige=30;duel.joueur.mana.eau=30;
  const neige=rpgMobaJouerCreature(duel,'joueur','tour-de-neige','right',0).entite;const flots=rpgMobaJouerCreature(duel,'joueur','tour-des-flots','right',1).entite;assert.ok(neige&&flots);
  ok(rpgMobaTerminerTour(duel,'joueur'));ok(rpgMobaPasserFinDeTour(duel,'sorcier'));if(duel.sorcier.manaChoixEnAttente)ok(rpgChoisirCouleurMana(duel,'sorcier','neige'));
  duel.sorcier.main=['berserk-des-trois-hivers','ashigaru-des-braises'];duel.sorcier.mana.neige=30;duel.sorcier.mana.braise=30;
  const a=rpgMobaJouerCreature(duel,'sorcier','berserk-des-trois-hivers','right',0).entite;const b=rpgMobaJouerCreature(duel,'sorcier','ashigaru-des-braises','right',1).entite;
  a.ready=true;a.malInvocation=false;b.ready=true;b.malInvocation=false;neige.ready=true;flots.ready=true;duel.sorcier.deck=[];
  const before=JSON.stringify(duel);const ids=rpgMobaChoisirAttaquantsIA(duel,'sorcier');assert.deepEqual(new Set(ids),new Set([a.id,b.id]));assert.equal(JSON.stringify(duel),before);
});

test('IA MOBA : sonde le Bâton et ses quatre jetons sans toucher à la partie', () => {
  const duel=rpgMobaCreerPartie(MOBA_DECKS[0],MOBA_DECKS[0],{rng:()=>.5}).duel;ok(rpgMobaMulligan(duel,'joueur',[]));ok(rpgMobaMulligan(duel,'sorcier',[]));if(duel.joueur.manaChoixEnAttente)ok(rpgChoisirCouleurMana(duel,'joueur','sable'));
  duel.joueur.main=['gardienne-des-portes-de-sable','baton-des-citernes'];duel.joueur.mana.sable=30;duel.joueur.mana.eau=30;
  const p=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;let calls=0;rpgReglerHasard(duel,()=>{calls++;return .5;});const before=JSON.stringify(duel);
  const choix=rpgMobaChoisirMagieIA(duel,'joueur');assert.equal(choix?.id,'baton-des-citernes');assert.equal(choix.cible,p.id);assert.equal(JSON.stringify(duel),before);assert.equal(calls,0);
  ok(rpgMobaJouerArme(duel,'joueur',choix.id,choix.cible));assert.equal(duel.joueur.creatures.filter(e=>e.carteId==='serpent-des-citernes').length,4);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('IA MOBA : Écueil anticipe la vague de la Tour des Ténèbres sur une copie', () => {
  const duel=rpgMobaCreerPartie(MOBA_DECKS[0],MOBA_DECKS[0],{rng:()=>.5}).duel;ok(rpgMobaMulligan(duel,'joueur',[]));ok(rpgMobaMulligan(duel,'sorcier',[]));if(duel.joueur.manaChoixEnAttente)ok(rpgChoisirCouleurMana(duel,'joueur','sable'));
  rpgFinDeTour(duel);if(duel.sorcier.manaChoixEnAttente)ok(rpgChoisirCouleurMana(duel,'sorcier','sable'));
  duel.sorcier.main=['gardienne-des-portes-de-sable','gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;
  const a=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0).entite;const b=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;
  rpgFinDeTour(duel);if(duel.joueur.manaChoixEnAttente)ok(rpgChoisirCouleurMana(duel,'joueur','sable'));duel.joueur.main=['tour-des-tenebres'];duel.joueur.mana.tenebres=30;
  ok(rpgMobaJouerCreature(duel,'joueur','tour-des-tenebres','center',0,{ouvrirReponse:true}));duel.sorcier.main=['ecueil'];duel.sorcier.mana.eau=30;
  let calls=0;rpgReglerHasard(duel,()=>{calls++;return .5;});const before=JSON.stringify(duel);const choix=rpgMobaChoisirMagieIA(duel,'sorcier',true);
  assert.equal(choix?.id,'ecueil');assert.equal(JSON.stringify(duel),before);assert.equal(calls,0);assert.equal(rpgMobaLancerMagie(duel,'sorcier','ecueil').contre,true);assert.ok(duel.sorcier.creatures.includes(a)&&duel.sorcier.creatures.includes(b));
});

test('IA MOBA : Lame vivante choisit une case libre sans modifier la partie ni le hasard', () => {
  const duel=rpgMobaCreerPartie(MOBA_DECKS[0],MOBA_DECKS[0],{rng:()=>.5}).duel;ok(rpgMobaMulligan(duel,'joueur',[]));ok(rpgMobaMulligan(duel,'sorcier',[]));if(duel.joueur.manaChoixEnAttente)ok(rpgChoisirCouleurMana(duel,'joueur','sable'));
  duel.joueur.main=['lame-des-ergs'];duel.joueur.mana.sable=30;let calls=0;rpgReglerHasard(duel,()=>{calls++;return .5;});const before=JSON.stringify(duel);
  const choix=rpgMobaChoisirMagieIA(duel,'joueur');assert.equal(choix?.id,'lame-des-ergs');assert.equal(choix.cible,null);assert.ok(['left','center','right'].includes(choix.lane));assert.ok(Number.isInteger(choix.emplacementArme));assert.equal(JSON.stringify(duel),before);assert.equal(calls,0);
  ok(rpgMobaJouerArme(duel,'joueur',choix.id,null,{laneId:choix.lane,slot:choix.emplacementArme}));const chien=duel.joueur.creatures[0];assert.equal(chien.arme.carteId,'lame-des-ergs');assert.equal(chien.mobaLane,choix.lane);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('IA MOBA : Contresort évalue une Lame vivante annoncée sans créer son Chien', () => {
  const duel=rpgMobaCreerPartie(MOBA_DECKS[0],MOBA_DECKS[0],{rng:()=>.5}).duel;ok(rpgMobaMulligan(duel,'joueur',[]));ok(rpgMobaMulligan(duel,'sorcier',[]));if(duel.joueur.manaChoixEnAttente)ok(rpgChoisirCouleurMana(duel,'joueur','sable'));
  duel.joueur.main=['lame-des-ergs'];duel.joueur.mana.sable=30;ok(rpgMobaJouerArme(duel,'joueur','lame-des-ergs',null,{ouvrirReponse:true,laneId:'center',slot:0}));duel.sorcier.main=['contresort-des-abimes'];duel.sorcier.mana.eau=30;
  let calls=0;rpgReglerHasard(duel,()=>{calls++;return .5;});const avant=JSON.stringify(duel);const choix=rpgMobaChoisirMagieIA(duel,'sorcier',true);assert.equal(choix?.id,'contresort-des-abimes');assert.equal(JSON.stringify(duel),avant);assert.equal(calls,0);assert.equal(duel.joueur.creatures.length,0);
  assert.equal(rpgMobaLancerMagie(duel,'sorcier',choix.id).contre,true);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('IA MOBA : installe le Trésor légalement sans muter sa recherche', () => {
  const duel=rpgMobaCreerPartie(MOBA_DECKS[0],MOBA_DECKS[0],{rng:()=>.5}).duel;ok(rpgMobaMulligan(duel,'joueur',[]));ok(rpgMobaMulligan(duel,'sorcier',[]));if(duel.joueur.manaChoixEnAttente)ok(rpgChoisirCouleurMana(duel,'joueur','sable'));
  duel.joueur.main=['le-tresor-de-lima'];duel.joueur.mana.sable=30;duel.joueur.mana.eau=30;const avant=JSON.stringify(duel);const choix=rpgMobaChoisirCreatureIA(duel,'joueur');
  assert.equal(choix?.id,'le-tresor-de-lima');assert.equal(JSON.stringify(duel),avant);ok(rpgMobaJouerCreature(duel,'joueur',choix.id,choix.lane,choix.slot));assert.equal(duel.joueur.creatures[0].heures.restants,2);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('IA MOBA : la Source de Bimini se pose et son choix reste légal sans mutation', () => {
  const duel=rpgMobaCreerPartie(MOBA_DECKS[0],MOBA_DECKS[0],{rng:()=>.5}).duel;ok(rpgMobaMulligan(duel,'joueur',[]));ok(rpgMobaMulligan(duel,'sorcier',[]));if(duel.joueur.manaChoixEnAttente)ok(rpgChoisirCouleurMana(duel,'joueur','sable'));
  duel.joueur.main=['gardienne-des-portes-de-sable','source-de-bimini'];duel.joueur.mana.sable=30;duel.joueur.mana.eau=30;const cible=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).entite;const avant=JSON.stringify(duel);const pose=rpgMobaChoisirCreatureIA(duel,'joueur');assert.equal(pose?.id,'source-de-bimini');assert.equal(JSON.stringify(duel),avant);const site=rpgMobaJouerCreature(duel,'joueur',pose.id,pose.lane,pose.slot).entite;site.heures.restants=1;rpgFinDeTour(duel);if(duel.sorcier.manaChoixEnAttente)ok(rpgChoisirCouleurMana(duel,'sorcier',choisirCouleurManaIA(duel,'sorcier')));rpgFinDeTour(duel);assert.ok(duel.siteEnAttente);const etat=JSON.stringify(duel);assert.equal(rpgMobaChoisirSiteIA(duel,'joueur'),cible.id);assert.equal(JSON.stringify(duel),etat);ok(rpgMobaResoudreSite(duel,'joueur',cible.id));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('IA MOBA : les nouvelles créatures sont jouables sans mutation pendant la simulation', () => {
  const ids = ['djinn-des-cendres-vengeresses','scarabee-du-natron','lecteur-du-dernier-nom','general-du-croissant-noir','fleau-de-la-lune-noire','souverain-de-la-lune-noire','messagere-des-cendres','garde-du-voile','rodeuse-des-tombes','gerboise-des-ruines','gardien-des-sept-sceaux','veuve-des-urnes','porteur-de-la-plume','scarabee-des-sceaux','scorpion-du-seuil','manticore-des-dunes','vampire-des-braises','novice-des-cendres','chasseuse-de-braise','sentinelle-du-brasier','danseuse-des-ombres-de-dune','veilleur-du-dernier-crepuscule','archonte-du-sablier-noir'];
  for (const side of ['joueur', 'sorcier']) for (const id of ids) {
    const duel = rpgMobaCreerPartie(MOBA_DECKS[0], MOBA_DECKS[0], { rng: () => .5 }).duel;
    ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
    if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'sable'));
    if (side === 'sorcier') { rpgFinDeTour(duel); if (duel.sorcier.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'sorcier', 'sable')); }
    duel[side].main = [id]; Object.assign(duel[side].mana, { sable: 30, tenebres: 30, braise: 30 });
    let calls = 0; rpgReglerHasard(duel, () => { calls++; return .5; });
    const before = JSON.stringify(duel), choice = rpgMobaChoisirCreatureIA(duel, side);
    assert.equal(choice?.id, id); assert.equal(JSON.stringify(duel), before); assert.equal(calls, 0);
    ok(rpgMobaJouerCreature(duel, side, id, choice.lane, choice.slot));
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('IA MOBA : le combat avec Infiltration et les dégâts préalables reste légal et isolé', () => {
  const duel = rpgMobaCreerPartie(MOBA_DECKS[0], MOBA_DECKS[0], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'sable'));
  duel.joueur.main = ['danseuse-des-ombres-de-dune', 'vampire-des-braises']; Object.assign(duel.joueur.mana, { sable: 30, tenebres: 30, braise: 30 });
  const danseuse = rpgMobaJouerCreature(duel, 'joueur', 'danseuse-des-ombres-de-dune', 'left', 0).entite;
  const vampire = rpgMobaJouerCreature(duel, 'joueur', 'vampire-des-braises', 'right', 0).entite;
  rpgFinDeTour(duel); if (duel.sorcier.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'sorcier', 'sable'));
  duel.sorcier.main = ['chien-du-guet', 'scorpion-du-seuil']; duel.sorcier.mana.sable = 30;
  const chien = rpgMobaJouerCreature(duel, 'sorcier', 'chien-du-guet', 'left', 0).entite;
  rpgMobaJouerCreature(duel, 'sorcier', 'scorpion-du-seuil', 'right', 0);
  rpgFinDeTour(duel); if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'sable'));
  let calls = 0; rpgReglerHasard(duel, () => { calls++; return .5; });
  const before = JSON.stringify(duel), ids = rpgMobaChoisirAttaquantsIA(duel, 'joueur');
  assert.ok(ids.includes(danseuse.id)); assert.equal(JSON.stringify(duel), before); assert.equal(calls, 0);
  ok(rpgMobaDeclarerAttaque(duel, 'joueur', [danseuse.id, vampire.id]));
  const avantBlocage = JSON.stringify(duel), blocks = rpgMobaChoisirBlocagesIA(duel, 'joueur', [danseuse.id, vampire.id]);
  assert.ok(!(blocks[danseuse.id] ?? []).includes(chien.id)); assert.equal(JSON.stringify(duel), avantBlocage); assert.equal(calls, 0);
  ok(rpgMobaLancerAttaque(duel, 'joueur', [danseuse.id, vampire.id], blocks, { declaree: true }));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('IA MOBA : Souverain choisit un duel en simulant les deux coups et le Vol de vie', () => {
  const duel = rpgMobaCreerPartie(MOBA_DECKS[0], MOBA_DECKS[0], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'sable'));
  duel.joueur.main = ['dune-marchante', 'chien-du-guet']; duel.joueur.mana.sable = 30;
  const dune = rpgMobaJouerCreature(duel, 'joueur', 'dune-marchante', 'left', 0).entite;
  const chien = rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'right', 0).entite;
  rpgFinDeTour(duel); if (duel.sorcier.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'sorcier', 'sable'));
  duel.sorcier.main = ['souverain-de-la-lune-noire']; Object.assign(duel.sorcier.mana, { sable: 30, tenebres: 30 });
  const before = JSON.stringify(duel), choix = rpgMobaChoisirCreatureIA(duel, 'sorcier');
  assert.equal(choix?.id, 'souverain-de-la-lune-noire'); assert.equal(JSON.stringify(duel), before);
  const hero = rpgMobaJouerCreature(duel, 'sorcier', choix.id, choix.lane, choix.slot).entite;
  const snapshot = JSON.stringify(duel); const cible = rpgMobaChoisirArriveeIA(duel, 'sorcier');
  assert.ok([dune.id, chien.id].includes(cible)); assert.equal(JSON.stringify(duel), snapshot);
  ok(rpgMobaResoudreArrivee(duel, 'sorcier', cible)); assert.ok(duel.sorcier.creatures.includes(hero));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

for (const side of ['joueur', 'sorcier']) test(`IA Guetteuse : choix isolé privilégie une alliée blessée plutôt qu’un jeton (${side})`, () => {
  const duel = rpgMobaCreerPartie(MOBA_DECKS[0], MOBA_DECKS[0], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'sable'));
  if (side === 'sorcier') { rpgFinDeTour(duel); if (duel.sorcier.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, side, 'sable')); }
  Object.assign(duel[side].mana, { sable: 30, eau: 30 }); duel[side].main = ['tarek', 'chien-du-guet', 'guetteuse-des-marees'];
  ok(rpgMobaJouerCreature(duel, side, 'tarek', 'right', 0));
  const allie = rpgMobaJouerCreature(duel, side, 'chien-du-guet', 'center', 0).entite; allie.pv = 1;
  const avantPose = JSON.stringify(duel), pose = rpgMobaChoisirCreatureIA(duel, side);
  assert.equal(pose?.id, 'guetteuse-des-marees'); assert.equal(JSON.stringify(duel), avantPose);
  assert.equal(rpgMobaJouerCreature(duel, side, pose.id, pose.lane, pose.slot).arriveeEnAttente, true);
  const avant = JSON.stringify(duel); assert.equal(rpgMobaChoisirArriveeIA(duel, side), allie.id); assert.equal(JSON.stringify(duel), avant);
  ok(rpgMobaResoudreArrivee(duel, side, allie.id)); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

for (const side of ['joueur', 'sorcier']) test(`IA Passeur : évalue et joue la réanimation sur une copie (${side})`, () => {
  const duel = rpgMobaCreerPartie(MOBA_DECKS[0], MOBA_DECKS[0], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'sable'));
  if (side === 'sorcier') { rpgFinDeTour(duel); if (duel.sorcier.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, side, 'sable')); }
  duel[side].mana.tenebres = 30; duel[side].main = ['passeur-au-masque-de-chacal']; duel[side].cimetiere = ['chien-du-guet'];
  let appels = 0; rpgReglerHasard(duel, () => { appels++; return .5; });
  const avant = JSON.stringify(duel), choix = rpgMobaChoisirCreatureIA(duel, side);
  assert.equal(choix?.id, 'passeur-au-masque-de-chacal'); assert.equal(JSON.stringify(duel), avant); assert.equal(appels, 0);
  ok(rpgMobaJouerCreature(duel, side, choix.id, choix.lane, choix.slot));
  assert.ok(duel[side].creatures.some(e => e.carteId === 'chien-du-guet')); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

for (const side of ['joueur', 'sorcier']) test(`IA Sphère : choix de combat sur copie sans consommer le hasard (${side})`, () => {
  const duel = rpgMobaCreerPartie(MOBA_DECKS[0], MOBA_DECKS[0], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'sable'));
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  if (enemy === 'sorcier') { rpgFinDeTour(duel); if (duel.sorcier.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'sorcier', 'sable')); }
  duel[enemy].main = ['gardienne-des-portes-de-sable']; duel[enemy].mana.sable = 30;
  ok(rpgMobaJouerCreature(duel, enemy, 'gardienne-des-portes-de-sable', 'left', 0));
  rpgFinDeTour(duel); if (duel[side].manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, side, 'sable'));
  duel[side].main = ['chien-du-guet', 'sphere-de-rotation']; Object.assign(duel[side].mana, { sable: 30, eau: 30 });
  const porteur = rpgMobaJouerCreature(duel, side, 'chien-du-guet', 'left', 0).entite;
  ok(rpgMobaJouerArme(duel, side, 'sphere-de-rotation', porteur.id)); porteur.ready = true;
  let appels = 0; rpgReglerHasard(duel, () => { appels++; return .14; });
  const avant = JSON.stringify(duel); const attaquants = rpgMobaChoisirAttaquantsIA(duel, side);
  rpgMobaChoisirCiblesAttaqueIA(duel, side, attaquants); rpgMobaChoisirBlocagesIA(duel, side, [porteur.id]);
  assert.equal(JSON.stringify(duel), avant); assert.equal(appels, 0); assert.equal(rpgMobaPlacementCoherent(duel), true);
});
