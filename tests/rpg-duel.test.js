import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  RPG_MAIN_DEPART,
  rpgAttaquerCreature,
  rpgAttaquerSorcier,
  rpgBlesserCreature,
  rpgChoisirBloqueurs,
  rpgEngagerTerrain,
  rpgEstProtegee,
  rpgFinDeTour,
  rpgJouerCreature,
  rpgLancerAttaque,
  rpgMana,
  rpgNouveauDuel,
  rpgNombreDestructions,
  rpgDestructionsDepuis,
  rpgOuvrirFenetreReponse,
  rpgPiocher,
  rpgPeutPayer,
  rpgPoserTerrain,
  rpgSorcierPv,
  rpgTourSorcierIA,
  rpgVainqueur,
} from '../src/games/rpgDuel.js';
import {
  CARD_RARITIES,
  RPG_CREATURE_CARDS,
  RPG_DUEL_CARDS,
  RPG_DECK_JOUEUR_BASE,
  RPG_DECK_SORCIER_BASE,
  RPG_HERO_CARDS,
  RPG_MAGIE_CARDS,
  RPG_TERRAIN_CARDS,
  RPG_DECKS,
  cardArtId,
  cardById,
  cardColorCost,
  cardColors,
  cardRarityInfo,
  creatureById,
  terrainManaColors,
  RPG_DECK_HYBRIDE_BASE,
  rpgValiderDeck,
} from '../src/games/rpgCards.js';
import { rpgLancerMagie } from '../src/games/rpgDuel.js';

/** Main de départ générique, mélangée de façon fixe. */
const duelDeBase = (opts = {}) => rpgNouveauDuel({
  joueurDeck: ['chien-du-guet', 'chien-du-guet', 'fennec-des-decombres', 'porteuse-de-cruches', 'guetteur-du-beffroi', 'dune-marchante', 'colosse-de-sel', 'vipere-de-verre', 'sonneur-fele', 'djinn-du-souk', 'scribe-de-la-liste', 'chien-du-guet'],
  sorcierDeck: ['chien-du-guet', 'dune-marchante', 'chien-du-guet', 'dune-marchante', 'chien-du-guet', 'dune-marchante', 'chien-du-guet', 'dune-marchante'],
  rng: () => 0.5,
  ...opts,
});

/** Glisse une carte précise en main (le test ne dépend pas du mélange). */
const donner = (duel, cote, carteId) => duel[cote].main.push(carteId);

/** Donne directement du mana (le paiement est testé à part). */
const donnerMana = (duel, cote, n) => { duel[cote].mana = { braise: n, eau: n, sable: n }; };

test('les bordures utilisent les quatre couleurs de rareté et acceptent uncommon', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(CARD_RARITIES).map(([key, rarity]) => [key, rarity.color])), {
    commune: '#f1f3f5',
    inhabituelle: '#4d9aff',
    rare: '#e1b33f',
    mythique: '#a875ed',
  });
  assert.equal(cardRarityInfo({ rarity: 'uncommon' }).key, 'inhabituelle');
  assert.equal(cardRarityInfo({ rarity: 'inhabituelle' }).color, CARD_RARITIES.inhabituelle.color);
  assert.equal(cardRarityInfo({ rarity: 'inconnue' }).key, 'commune');
  const carteFennec = cardById('fennec-des-decombres');
  assert.deepEqual({ cost: carteFennec.cost, atk: carteFennec.atk, def: carteFennec.def, rarity: carteFennec.rarity, esquive: carteFennec.esquive, rapidite: carteFennec.rapidite }, {
    cost: 2, atk: 3, def: 1, rarity: 'inhabituelle', esquive: 1, rapidite: true,
  });
});

test('le Cavalier amazigh est une rare Sable incluse dans le deck et le catalogue complet', () => {
  const cavalier = cardById('cavalier-amazigh-du-desert');
  assert.deepEqual({ element: cavalier.element, cost: cavalier.cost, atk: cavalier.atk, def: cavalier.def, rarity: cavalier.rarity }, {
    element: 'sable', cost: 5, atk: 4, def: 4, rarity: 'rare',
  });
  assert.equal(cavalier.typeLine, 'Créature — Guerrier amazigh');
  assert.deepEqual(cavalier.arrivee, { type: 'combat', cible: 'creature' });
  assert.match(cavalier.text, /se bat contre une créature adverse ciblée/i);
  assert.equal(RPG_DUEL_CARDS.some((carte) => carte.id === cavalier.id && carte.kind === 'creature'), true);
  assert.equal(RPG_DECK_JOUEUR_BASE.filter((id) => id === cavalier.id).length, 1,
    'le deck Veilleurs du Désert reçoit une copie du Cavalier à la place d’un Fennec');
  assert.equal(rpgValiderDeck(RPG_DECK_JOUEUR_BASE).ok, true, 'le deck conserve ses 40 cartes et sa limite d’exemplaires');
  assert.equal(new Set(RPG_DUEL_CARDS.map((carte) => carte.id)).size, RPG_DUEL_CARDS.length,
    'le catalogue réunit les cartes sans doublon');
  assert.deepEqual(new Set(RPG_DUEL_CARDS.map((carte) => carte.kind)),
    new Set(['creature', 'hero', 'terrain', 'magie']));
});

test('le set de créatures existe : vingt-trois cartes façon TCG (coût, attaque, défense, rareté, type)', () => {
  assert.equal(RPG_CREATURE_CARDS.length, 23);
  for (const carte of RPG_CREATURE_CARDS) {
    assert.ok(carte.id && carte.name, 'chaque carte a un identifiant et un nom');
    assert.ok(Number.isFinite(carte.cost) && carte.cost >= 0, 'chaque carte a un coût');
    assert.ok(carte.atk >= 0 && carte.def >= 1, 'chaque carte a attaque et défense');
    assert.ok(Object.hasOwn(CARD_RARITIES, carte.rarity), 'chaque carte a une rareté connue');
    assert.ok(['braise', 'eau', 'sable'].includes(carte.element), 'chaque carte a un type parmi les trois couleurs');
  }
  assert.equal(creatureById('djinn-du-souk').name, 'Djinn du souk');
});

test('Anqa est une 4/4 Braise à 4 avec Envol qui revient après deux tours', () => {
  const anqa = cardById('anqa-des-braises');
  assert.deepEqual({ element: anqa.element, cost: anqa.cost, atk: anqa.atk, def: anqa.def, rarity: anqa.rarity, envol: anqa.envol }, {
    element: 'braise', cost: 4, atk: 4, def: 4, rarity: 'mythique', envol: true,
  });
  assert.equal(anqa.destruction.type, 'retour-apres-tours');
  assert.equal(anqa.destruction.tours, 2);
  assert.match(anqa.text, /Envol — Ne peut être bloquée que par une créature avec Envol/);
  assert.match(anqa.text, /revient en jeu après deux tours/i);
  assert.equal(cardArtId(anqa), 'anqa-des-braises');
});

test('l’Envol d’Anqa ne laisse que les créatures volantes la bloquer', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 30);
  donnerMana(duel, 'sorcier', 30);
  donner(duel, 'sorcier', 'anqa-des-braises');
  const anqaAttaquante = rpgJouerCreature(duel, 'sorcier', 'anqa-des-braises').entite;
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  anqaAttaquante.ready = true;
  chien.ready = true;

  assert.equal(anqaAttaquante.envol, true, 'l’Envol est porté par l’entité en jeu');
  assert.deepEqual(rpgChoisirBloqueurs(duel, 'sorcier', [anqaAttaquante.id]), {},
    'l’IA ne jette pas un Chien terrestre devant l’Anqa volante');
  const refus = rpgLancerAttaque(duel, 'sorcier', [anqaAttaquante.id], { [anqaAttaquante.id]: [chien.id] });
  assert.equal(refus.ok, false);
  assert.equal(refus.raison, 'envol', 'le moteur refuse un bloqueur sans Envol');
  assert.equal(chien.pv, 2, 'le blocage refusé ne blesse personne');
  assert.equal(duel.joueur.pv, 50, 'aucune attaque n’est résolue');

  donner(duel, 'joueur', 'anqa-des-braises');
  const anqaBloqueuse = rpgJouerCreature(duel, 'joueur', 'anqa-des-braises').entite;
  anqaBloqueuse.ready = true;
  assert.deepEqual(rpgChoisirBloqueurs(duel, 'sorcier', [anqaAttaquante.id]), {
    [anqaAttaquante.id]: [anqaBloqueuse.id],
  }, 'une créature avec Envol peut bloquer un attaquant avec Envol');
  const combat = rpgLancerAttaque(duel, 'sorcier', [anqaAttaquante.id], {
    [anqaAttaquante.id]: [anqaBloqueuse.id],
  });
  assert.equal(combat.ok, true);
  assert.equal(combat.resume.paires.length, 1, 'les deux Anqa s’affrontent en vol');
  assert.equal(duel.joueur.pv, 50, 'l’Anqa volante arrête l’attaque avant les PV');
  assert.equal(duel.sorcier.creatures.includes(anqaAttaquante), false, 'les deux 4/4 se détruisent');
  assert.equal(duel.joueur.creatures.includes(anqaBloqueuse), false);
});

test('Anqa revient en jeu après deux changements de tour, sans attaquer immédiatement', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'anqa-des-braises');
  const anqa = rpgJouerCreature(duel, 'joueur', 'anqa-des-braises').entite;
  assert.equal(rpgBlesserCreature(duel, 'joueur', anqa.id, 4).ok, true);
  assert.equal(duel.joueur.creatures.includes(anqa), false, 'Anqa est détruite et quitte le champ');
  assert.ok(duel.joueur.cimetiere.includes('anqa-des-braises'));
  assert.deepEqual(duel.joueur.retoursProgrammes, [
    { carteId: 'anqa-des-braises', toursRestants: 2 },
  ]);

  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'sorcier');
  assert.equal(duel.joueur.retoursProgrammes[0].toursRestants, 1,
    'elle reste au cimetière après le premier tour');
  assert.equal(duel.joueur.creatures.some((entite) => entite.carteId === 'anqa-des-braises'), false);

  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'joueur');
  const anqaRenaissante = duel.joueur.creatures.find((entite) => entite.carteId === 'anqa-des-braises');
  assert.ok(anqaRenaissante, 'Anqa revient au début du tour après le deuxième tour');
  assert.equal(anqaRenaissante.pv, 4);
  assert.equal(anqaRenaissante.envol, true, 'elle renaît toujours volante');
  assert.equal(anqaRenaissante.ready, false, 'elle arrive avec le mal d’invocation');
  assert.equal(duel.joueur.cimetiere.includes('anqa-des-braises'), false);
  assert.deepEqual(duel.joueur.retoursProgrammes, []);
});

test('une Anqa détruite par des blessures simultanées programme aussi son retour', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'anqa-des-braises');
  donner(duel, 'sorcier', 'colosse-de-sel');
  const anqa = rpgJouerCreature(duel, 'joueur', 'anqa-des-braises').entite;
  const colosse = rpgJouerCreature(duel, 'sorcier', 'colosse-de-sel').entite;
  colosse.ready = true;

  assert.equal(rpgAttaquerCreature(duel, 'sorcier', colosse.id, anqa.id).ok, true);
  assert.equal(duel.joueur.creatures.includes(anqa), false);
  assert.deepEqual(duel.joueur.retoursProgrammes, [
    { carteId: 'anqa-des-braises', toursRestants: 2 },
  ]);
});

test('chaque carte du duel possède une illustration locale et une ligne de type', () => {
  const cartes = [...RPG_CREATURE_CARDS, ...RPG_HERO_CARDS, ...RPG_TERRAIN_CARDS, ...RPG_MAGIE_CARDS];
  for (const carte of cartes) {
    assert.ok(carte.typeLine, `${carte.id} affiche un type de carte`);
    const image = fileURLToPath(new URL(`../public/cards/${cardArtId(carte)}.jpg`, import.meta.url));
    assert.ok(existsSync(image), `${carte.id} réutilise une illustration existante (${image})`);
  }
  assert.ok(RPG_MAGIE_CARDS.find((carte) => carte.id === 'parade-du-verre').instant,
    'la Parade est bien marquée comme éphémère');
});

test('les decks ont leurs illustrations et le contrôle catalogue détecte les partages restants', () => {
  const cartes = [...RPG_CREATURE_CARDS, ...RPG_HERO_CARDS, ...RPG_TERRAIN_CARDS, ...RPG_MAGIE_CARDS];
  for (const deck of RPG_DECKS) {
    const imagesDeCeDeck = new Map();
    for (const id of new Set(deck.cardIds)) {
      const illustration = cardArtId(cardById(id));
      assert.ok(illustration, `${id} a une illustration`);
      assert.equal(imagesDeCeDeck.has(illustration), false,
        `${id} partage l’illustration ${illustration} avec ${imagesDeCeDeck.get(illustration)} dans ${deck.name}`);
      imagesDeCeDeck.set(illustration, id);
    }
  }

  assert.equal(cardArtId('tempete-de-sable'), 'tempete-de-sable',
    'Tempête de sable utilise bien l’illustration du tourbillon');
  assert.equal(cardArtId('desert'), 'desert', 'le nouveau terrain utilise l’illustration du Désert');
  assert.equal(cardById('desert').name, 'Désert', 'la carte Plaines est remplacée par le Désert');
  assert.notEqual(cardArtId('tempete-de-sable'), cardArtId('desert'),
    'la tempête ne reprend pas l’illustration du Désert');
  assert.equal(cardArtId('rempart-de-dunes'), 'rempart-de-dunes',
    'Rempart de dunes utilise sa nouvelle illustration protectrice');
  assert.notEqual(cardArtId('rempart-de-dunes'), cardArtId('dune-marchante'),
    'Rempart de dunes ne reprend pas l’illustration de la Dune marchante');

  const nouvellesIllustrations = [
    ['montagne', 'montagne'], ['fennec-des-decombres', 'fennec-des-decombres'],
    ['braisier-du-souk', 'braisier-du-souk'],
    ['djinn-du-souk', 'djinn-du-souk'], ['ghul-des-cendres', 'ghul-des-cendres'],
    ['sahir-des-braises', 'sahir-des-braises'], ['ifrit-des-ergs', 'ifrit-des-ergs'],
    ['ifrit-al-ahmar', 'ifrit-al-ahmar'],
    ['trait-de-braise', 'trait-de-braise'], ['fureur-du-souk', 'fureur-du-souk'],
    ['rafale-du-minaret', 'rafale-du-minaret'], ['nuage-de-cendres', 'nuage-de-cendres'],
    ['cavalier-amazigh-du-desert', 'cavalier-amazigh-du-desert'],
    ['veilleur-du-couchant', 'veilleur-du-couchant'], ['vent-rouge', 'vent-rouge'],
    ['petra', 'petra'], ['feriel', 'feriel'],
  ];
  for (const [carteId, illustration] of nouvellesIllustrations) {
    assert.equal(cardArtId(carteId), illustration,
      `${carteId} affiche sa nouvelle illustration full art`);
    assert.ok(existsSync(fileURLToPath(new URL(`../public/cards/${illustration}.jpg`, import.meta.url))),
      `l’illustration plein art ${illustration} est livrée avec le jeu`);
  }

  // Les illustrations dédiées des decks sont uniques. Les rares partages
  // restants dans le catalogue hors decks de départ sont recensés ici afin
  // qu'aucun nouveau partage ne passe inaperçu.
  const proprietaires = new Map();
  for (const carte of cartes) {
    const illustration = cardArtId(carte);
    if (!proprietaires.has(illustration)) proprietaires.set(illustration, []);
    proprietaires.get(illustration).push(carte.id);
  }
  const partages = [...proprietaires.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([illustration, ids]) => [illustration, ids])
    .sort(([a], [b]) => a.localeCompare(b));
  assert.deepEqual(partages, [
    ['mer', ['mer', 'eau-de-la-source', 'lame-de-mer']],
  ]);
});

test('les capacités des personnages amazighs se déclenchent à l’arrivée et à la destruction', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 100);
  donner(duel, 'joueur', 'fennec-des-decombres');
  const fennec = rpgJouerCreature(duel, 'joueur', 'fennec-des-decombres').entite;
  donner(duel, 'joueur', 'tislit-des-aures');
  const piocheAvant = duel.joueur.deck.length;
  rpgJouerCreature(duel, 'joueur', 'tislit-des-aures');
  assert.equal(duel.joueur.deck.length, piocheAvant - 1, 'Tislit fait piocher une carte en arrivant');

  donner(duel, 'joueur', 'tiziri-du-djurdjura');
  rpgJouerCreature(duel, 'joueur', 'tiziri-du-djurdjura');
  assert.equal(fennec.atk, 4, 'Tiziri renforce l’attaque du Fennec sans retirer son esquive');
  donner(duel, 'joueur', 'amani-des-ksour');
  const amani = rpgJouerCreature(duel, 'joueur', 'amani-des-ksour').entite;
  assert.equal(amani.bouclier, 2, 'Amani entre avec son bouclier');

  donner(duel, 'joueur', 'amayas-du-hoggar');
  const amayas = rpgJouerCreature(duel, 'joueur', 'amayas-du-hoggar').entite;
  const mainAvantDestruction = duel.joueur.main.length;
  rpgBlesserCreature(duel, 'joueur', amayas.id, 2);
  assert.equal(duel.joueur.main.length, mainAvantDestruction + 1, 'Amayas fait piocher une carte quand il est détruit');

  donner(duel, 'joueur', 'tin-hinan');
  rpgJouerCreature(duel, 'joueur', 'tin-hinan');
  assert.equal(fennec.atk, 5, 'Tin Hinan renforce à son tour le Fennec');
  assert.equal(fennec.def, 2, 'le renfort de Tin Hinan augmente aussi sa défense');
  assert.equal(fennec.esquive, 1, 'les bonus de statistiques ne désactivent pas son esquive');
});

test('le Cavalier doit choisir une créature adverse et combat mutuellement à son arrivée', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'cavalier-amazigh-du-desert');
  donner(duel, 'sorcier', 'chien-du-guet');
  const cible = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;

  const manaAvant = { ...duel.joueur.mana };
  const sansCible = rpgJouerCreature(duel, 'joueur', 'cavalier-amazigh-du-desert');
  assert.deepEqual(sansCible, { ok: false, raison: 'cible' }, 'le Cavalier attend une cible adverse légale');
  assert.deepEqual(duel.joueur.mana, manaAvant, 'une pose sans cible ne paie rien');
  assert.ok(duel.joueur.main.includes('cavalier-amazigh-du-desert'), 'la carte reste en main jusqu’au choix');

  const debut = rpgNombreDestructions(duel);
  const pose = rpgJouerCreature(duel, 'joueur', 'cavalier-amazigh-du-desert', cible.id);
  assert.equal(pose.ok, true);
  assert.equal(pose.entite.pv, 2, 'le Cavalier reçoit en retour les 2 dégâts de l’attaque du Chien');
  assert.ok(!duel.sorcier.creatures.includes(cible), 'les 4 dégâts du Cavalier détruisent le Chien 2/2');
  assert.deepEqual(rpgDestructionsDepuis(duel, debut), [
    { entityId: cible.id, sourceElements: ['sable'] },
  ], 'la destruction de la cible est attribuée au Cavalier Sable');
  assert.ok(duel.log.some((entry) => /Cavalier amazigh du Désert se bat contre Chien du guet \(4 \/ 2\)/.test(entry)),
    'le journal annonce l’affrontement et les deux attaques');
});

test('les deux combattants meurent bien simultanément avant les effets de destruction', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 30);
  donnerMana(duel, 'sorcier', 30);
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  donner(duel, 'joueur', 'cavalier-amazigh-du-desert');
  donner(duel, 'sorcier', 'sonneur-fele');
  const sonneur = rpgJouerCreature(duel, 'sorcier', 'sonneur-fele').entite;
  Object.assign(sonneur, { atk: 4, def: 4, pv: 4, pvMax: 4 });

  const debut = rpgNombreDestructions(duel);
  const pose = rpgJouerCreature(duel, 'joueur', 'cavalier-amazigh-du-desert', sonneur.id);
  assert.equal(pose.ok, true);
  assert.ok(!duel.joueur.creatures.includes(pose.entite), 'les 4 dégâts du Sonneur détruisent le Cavalier');
  assert.ok(!duel.sorcier.creatures.includes(sonneur), 'les 4 dégâts du Cavalier détruisent le Sonneur');
  assert.ok(!duel.joueur.creatures.includes(chien),
    'le dernier tocsin du Sonneur se résout ensuite sur le Chien resté en jeu');
  assert.deepEqual(rpgDestructionsDepuis(duel, debut), [
    { entityId: sonneur.id, sourceElements: ['sable'] },
    { entityId: pose.entite.id, sourceElements: ['eau'] },
    { entityId: chien.id, sourceElements: ['eau'] },
  ], 'les deux blessures mutuelles précèdent bien les capacités de destruction');
});

test('Rapidité permet au Fennec d’attaquer dès son tour de pose', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donner(duel, 'joueur', 'fennec-des-decombres');
  const fennec = rpgJouerCreature(duel, 'joueur', 'fennec-des-decombres').entite;
  assert.equal(fennec.rapidite, true, 'la capacité est portée par l’entité en jeu');
  assert.equal(fennec.ready, true, 'le Fennec est prêt dès son arrivée malgré le mal d’invocation habituel');
  const pvAvant = duel.sorcier.pv;
  const attaque = rpgLancerAttaque(duel, 'joueur', [fennec.id]);
  assert.equal(attaque.ok, true, 'le moteur accepte son attaque le tour où il a été posé');
  assert.equal(duel.sorcier.pv, pvAvant - 3, 'son attaque peut toucher directement dès ce tour');
  assert.equal(fennec.attaquee, true, 'l’attaque immédiate est bien consommée pour le tour');
});

test('Fériel est une mythique 4 mana 3/1 avec Rapidité et Coup rapide', () => {
  const feriel = cardById('feriel');
  assert.deepEqual({ cost: feriel.cost, atk: feriel.atk, def: feriel.def, rarity: feriel.rarity, rapidite: feriel.rapidite, coupRapide: feriel.coupRapide }, {
    cost: 4, atk: 3, def: 1, rarity: 'mythique', rapidite: true, coupRapide: true,
  });
  assert.equal(feriel.arrivee, undefined, 'son ancien effet de dégâts à l’arrivée est retiré');
  assert.match(feriel.text, /Rapidité/);
  assert.match(feriel.text, /Coup rapide.*sélectionnée pour attaquer.*créature adverse.*dégâts d’attaque/i);
  assert.equal(cardArtId(feriel), 'feriel', 'Fériel utilise sa nouvelle illustration dédiée');
});

test('le Coup rapide de Fériel vise une créature, applique Esquive, sans riposte ni dégâts directs', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'feriel');
  const feriel = rpgJouerCreature(duel, 'joueur', 'feriel').entite;
  donner(duel, 'sorcier', 'fennec-des-decombres');
  const fennec = rpgJouerCreature(duel, 'sorcier', 'fennec-des-decombres').entite;
  Object.assign(fennec, { pv: 5, def: 5, pvMax: 5 });

  assert.equal(feriel.ready, true, 'Fériel peut attaquer dès son tour de pose');
  assert.equal(rpgLancerAttaque(duel, 'joueur', [feriel.id]).raison, 'cible',
    'le moteur réclame une cible quand une créature adverse peut être choisie');
  assert.equal(rpgAttaquerSorcier(duel, 'joueur', feriel.id).raison, 'cible',
    'Fériel ne peut pas contourner son Coup rapide pour frapper directement le sorcier');

  const pvSorcier = duel.sorcier.pv;
  const res = rpgLancerAttaque(duel, 'joueur', [feriel.id], {}, null, null, { [feriel.id]: fennec.id });
  assert.equal(res.ok, true);
  assert.equal(fennec.pv, 3, 'les 3 dégâts d’attaque perdent 1 point face à Esquive 1');
  assert.equal(feriel.pv, 1, 'la créature visée ne riposte pas contre Fériel');
  assert.equal(duel.sorcier.pv, pvSorcier, 'le Coup rapide ne touche pas les PV du sorcier');
  assert.equal(feriel.attaquee, true, 'Fériel a consommé son attaque');
  assert.deepEqual(res.resume.coupsRapides.map(({ attaquant, cible, degats }) => ({ attaquant, cible, degats })), [
    { attaquant: 'FÉRIEL', cible: 'Fennec des décombres', degats: 3 },
  ]);
});

test('le Coup rapide de Fériel choisit automatiquement une cible légale pendant le tour de l’IA', () => {
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.999 });
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  donner(duel, 'sorcier', 'feriel');
  const feriel = rpgJouerCreature(duel, 'sorcier', 'feriel').entite;
  const pvJoueur = duel.joueur.pv;

  rpgTourSorcierIA(duel);
  assert.equal(duel.joueur.creatures.includes(chien), false, 'Fériel vise automatiquement le Chien adverse');
  assert.equal(duel.joueur.pv, pvJoueur, 'l’attaque ciblée ne frappe pas le joueur');
  assert.equal(feriel.attaquee, true, 'l’attaque rapide de l’IA est bien consommée');
});

test('les capacités de feu punissent les bloqueurs et rendent les djinns distincts', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 100);
  donnerMana(duel, 'sorcier', 100);
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  donner(duel, 'sorcier', 'ghul-des-cendres');
  const ghul = rpgJouerCreature(duel, 'sorcier', 'ghul-des-cendres').entite;
  const pvChien = chien.pv;
  rpgBlesserCreature(duel, 'sorcier', ghul.id, 1);
  assert.equal(chien.pv, pvChien - 1, 'le Ghul inflige un dégât aux créatures adverses en mourant');

  donner(duel, 'sorcier', 'ifrit-des-ergs');
  const pvJoueur = duel.joueur.pv;
  rpgJouerCreature(duel, 'sorcier', 'ifrit-des-ergs');
  assert.equal(duel.joueur.pv, pvJoueur - 2, 'l’Ifrit frappe le sorcier adverse à son arrivée');
  donner(duel, 'sorcier', 'ifrit-al-ahmar');
  rpgJouerCreature(duel, 'sorcier', 'ifrit-al-ahmar');
  assert.equal(duel.joueur.creatures.length, 0, 'l’Ifrit al-Ahmar balaie les créatures adverses à son arrivée');
});

test('le journal de destruction distingue la source immédiate et les capacités déclenchées', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);

  donner(duel, 'sorcier', 'fennec-des-decombres');
  const fennecToucheParEau = rpgJouerCreature(duel, 'sorcier', 'fennec-des-decombres').entite;
  donner(duel, 'joueur', 'lame-de-mer');
  const debutEau = rpgNombreDestructions(duel);
  assert.equal(rpgLancerMagie(duel, 'joueur', 'lame-de-mer', fennecToucheParEau.id).ok, true);
  assert.deepEqual(rpgDestructionsDepuis(duel, debutEau), [
    { entityId: fennecToucheParEau.id, sourceElements: ['eau'] },
  ], 'un sort Eau reste distingué d’une destruction par Braise');

  donner(duel, 'joueur', 'trait-de-braise');
  donner(duel, 'sorcier', 'fennec-des-decombres');
  const fennecToucheParFeu = rpgJouerCreature(duel, 'sorcier', 'fennec-des-decombres').entite;
  const debutBraise = rpgNombreDestructions(duel);
  assert.equal(rpgLancerMagie(duel, 'joueur', 'trait-de-braise', fennecToucheParFeu.id).ok, true);
  assert.deepEqual(rpgDestructionsDepuis(duel, debutBraise), [
    { entityId: fennecToucheParFeu.id, sourceElements: ['braise'] },
  ], 'un sort Braise attribue la destruction à la bonne créature cible');

  donner(duel, 'joueur', 'fennec-des-decombres');
  const fennecDuJoueur = rpgJouerCreature(duel, 'joueur', 'fennec-des-decombres').entite;
  donner(duel, 'sorcier', 'ghul-des-cendres');
  const ghul = rpgJouerCreature(duel, 'sorcier', 'ghul-des-cendres').entite;
  const debutCapacite = rpgNombreDestructions(duel);
  rpgBlesserCreature(duel, 'sorcier', ghul.id, 1, 'eau');
  assert.deepEqual(rpgDestructionsDepuis(duel, debutCapacite), [
    { entityId: ghul.id, sourceElements: ['eau'] },
    { entityId: fennecDuJoueur.id, sourceElements: ['braise'] },
  ], 'le Ghul meurt par Eau, mais son effet de Braise brûle correctement sa victime');
});

test('les dégâts d’arrivée Braise attribuent la destruction à la créature source', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'sorcier', 'fennec-des-decombres');
  const fennec = rpgJouerCreature(duel, 'sorcier', 'fennec-des-decombres').entite;
  donner(duel, 'joueur', 'braisier-du-souk');

  const debutArrivee = rpgNombreDestructions(duel);
  assert.equal(rpgJouerCreature(duel, 'joueur', 'braisier-du-souk').ok, true);
  assert.deepEqual(rpgDestructionsDepuis(duel, debutArrivee), [
    { entityId: fennec.id, sourceElements: ['braise'] },
  ], 'le dégât d’arrivée du Braisier est reconnu comme source Braise');
});

test('le Sahir abat le Fennec avant qu’il ne puisse infliger ses blessures de combat', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'sahir-des-braises');
  donner(duel, 'sorcier', 'fennec-des-decombres');
  const sahir = rpgJouerCreature(duel, 'joueur', 'sahir-des-braises').entite;
  const fennec = rpgJouerCreature(duel, 'sorcier', 'fennec-des-decombres').entite;
  sahir.ready = true;

  const debutCombat = rpgNombreDestructions(duel);
  const combat = rpgLancerAttaque(duel, 'joueur', [sahir.id], { [sahir.id]: [fennec.id] });
  assert.equal(combat.ok, true);
  assert.deepEqual(rpgDestructionsDepuis(duel, debutCombat), [
    { entityId: fennec.id, sourceElements: ['braise'] },
  ], 'les 2 dégâts préalables du Sahir tuent le Fennec avant les blessures de combat');
  assert.equal(duel.sorcier.creatures.includes(fennec), false);
  assert.equal(sahir.pv, sahir.pvMax, 'le Fennec détruit ne peut plus infliger ses 3 dégâts au Sahir');
});

test('Sahir des braises est mythique, conserve sa pioche et gagne 2 dégâts en combat', () => {
  const carte = cardById('sahir-des-braises');
  assert.equal(carte.rarity, 'mythique');
  assert.deepEqual(carte.arrivee, { type: 'pioche', amount: 1 });
  assert.deepEqual(carte.combat, { type: 'degats-creature-combattue', amount: 2 });
  assert.match(carte.text, /attaque ou bloque/i);
  assert.match(carte.text, /avant les blessures de combat/i, 'le texte précise que les 2 dégâts partent en premier');
});

test('Sahir inflige ses 2 dégâts à la créature qui le bloque quand il attaque', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'sahir-des-braises');
  donner(duel, 'sorcier', 'colosse-de-sel');
  const sahir = rpgJouerCreature(duel, 'joueur', 'sahir-des-braises').entite;
  const bloqueur = rpgJouerCreature(duel, 'sorcier', 'colosse-de-sel').entite;
  sahir.ready = true;

  const combat = rpgLancerAttaque(duel, 'joueur', [sahir.id], { [sahir.id]: [bloqueur.id] });
  assert.equal(combat.ok, true);
  assert.equal(bloqueur.pv, 1, 'le Colosse 5/5 reçoit 2 dégâts d’attaque et 2 dégâts du Sahir');
  assert.equal(duel.joueur.creatures.includes(sahir), false,
    'le Colosse survit aux dégâts préalables et inflige ensuite ses blessures normales au Sahir');
});

test('Sahir inflige ses 2 dégâts à la créature qu’il bloque', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'sahir-des-braises');
  donner(duel, 'sorcier', 'colosse-de-sel');
  const bloqueur = rpgJouerCreature(duel, 'joueur', 'sahir-des-braises').entite;
  const attaquant = rpgJouerCreature(duel, 'sorcier', 'colosse-de-sel').entite;
  attaquant.ready = true;

  const combat = rpgLancerAttaque(duel, 'sorcier', [attaquant.id], { [attaquant.id]: [bloqueur.id] });
  assert.equal(combat.ok, true);
  assert.equal(attaquant.pv, 1, 'le Sahir bloqueur inflige 2 dégâts en plus de ses 2 dégâts de combat');
  assert.equal(duel.joueur.creatures.includes(bloqueur), false,
    'le Colosse survit aux dégâts préalables et tue ensuite le Sahir avec ses blessures normales');
});

test('un Sahir bloqueur détruit le Fennec avant ses blessures de combat', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'sahir-des-braises');
  donner(duel, 'sorcier', 'fennec-des-decombres');
  const sahir = rpgJouerCreature(duel, 'joueur', 'sahir-des-braises').entite;
  const fennec = rpgJouerCreature(duel, 'sorcier', 'fennec-des-decombres').entite;
  fennec.ready = true;

  const combat = rpgLancerAttaque(duel, 'sorcier', [fennec.id], { [fennec.id]: [sahir.id] });
  assert.equal(combat.ok, true);
  assert.equal(duel.sorcier.creatures.includes(fennec), false, 'les 2 dégâts préalables tuent le Fennec 3/1');
  assert.equal(duel.joueur.creatures.includes(sahir), true, 'le Sahir reste en jeu');
  assert.equal(sahir.pv, sahir.pvMax, 'le Fennec tué ne porte pas ses 3 dégâts');
});

test('rpgAttaquerCreature résout aussi les dégâts du Sahir avant la riposte', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'sahir-des-braises');
  donner(duel, 'sorcier', 'fennec-des-decombres');
  const sahir = rpgJouerCreature(duel, 'joueur', 'sahir-des-braises').entite;
  const adversaire = rpgJouerCreature(duel, 'sorcier', 'fennec-des-decombres').entite;
  sahir.ready = true;

  assert.equal(rpgAttaquerCreature(duel, 'joueur', sahir.id, adversaire.id).ok, true);
  assert.equal(duel.sorcier.creatures.includes(adversaire), false, 'les 2 dégâts du Sahir détruisent le Fennec');
  assert.equal(sahir.pv, sahir.pvMax, 'le Fennec détruit ne peut pas infliger ses dégâts de riposte');
});

test('les terrains mono produisent leur couleur et Pétra produit Braise ou Sable', () => {
  assert.equal(RPG_TERRAIN_CARDS.length, 4);
  assert.deepEqual(RPG_TERRAIN_CARDS.map((t) => t.id).sort(), ['desert', 'mer', 'montagne', 'petra']);
  assert.equal(RPG_TERRAIN_CARDS.find((t) => t.id === 'montagne').element, 'braise');
  assert.equal(RPG_TERRAIN_CARDS.find((t) => t.id === 'mer').element, 'eau');
  assert.equal(RPG_TERRAIN_CARDS.find((t) => t.id === 'desert').element, 'sable');
  assert.equal(cardById('petra').element, 'hybride');
  assert.deepEqual(cardColors('petra'), ['sable', 'braise']);
  assert.deepEqual(terrainManaColors('petra'), ['braise', 'sable']);
});

test('les créatures du Désert attaquent et leur protection colorée dure le tour posé et le suivant adverse', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 3);
  donner(duel, 'joueur', 'amayas-du-hoggar');
  const amayas = rpgJouerCreature(duel, 'joueur', 'amayas-du-hoggar').entite;

  assert.ok(amayas.atk > amayas.def, 'Amayas est une créature offensive du Désert');
  assert.deepEqual(amayas.protection, { contre: 'braise', toursRestants: 2 });
  assert.equal(rpgEstProtegee(amayas, 'braise'), true);
  assert.equal(rpgEstProtegee(amayas, 'eau'), false, 'la protection ne couvre que la couleur indiquée');
  assert.equal(cardById('tiziri-du-djurdjura').protection.contre, 'eau', 'Tiziri protège contre une autre couleur');
  assert.equal(cardById('tislit-des-aures').protection, undefined, 'la protection n’est pas attribuée à toutes les créatures');

  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'sorcier');
  assert.equal(amayas.protection.toursRestants, 1, 'la protection reste active pendant le tour adverse juste après');
  duel.sorcier.main.push('trait-de-braise');
  duel.sorcier.mana = { braise: 2, eau: 0, sable: 0 };
  const magieBloquee = rpgLancerMagie(duel, 'sorcier', 'trait-de-braise', amayas.id);
  assert.equal(magieBloquee.raison, 'protection', 'la couleur protégée ne peut pas cibler la créature');
  assert.ok(duel.sorcier.main.includes('trait-de-braise'), 'le sort bloqué reste en main');
  assert.equal(amayas.pv, 2, 'le sort protégé ne blesse pas');

  const ifrit = {
    id: 'ifrit-test', carteId: 'ifrit-des-ergs', name: 'Ifrit test',
    atk: 5, def: 4, pv: 4, pvMax: 4, bouclier: 0, ready: true, attaquee: false,
  };
  const ghul = {
    id: 'ghul-test', carteId: 'ghul-des-cendres', name: 'Ghul test',
    atk: 2, def: 1, pv: 1, pvMax: 1, bouclier: 0, ready: false, attaquee: false,
  };
  duel.sorcier.creatures.push(ifrit, ghul);
  assert.equal(rpgAttaquerCreature(duel, 'sorcier', ifrit.id, amayas.id).ok, true);
  assert.equal(amayas.pv, 2, 'les dégâts de combat Braise sont aussi prévenus');
  amayas.ready = true;
  assert.deepEqual(rpgChoisirBloqueurs(duel, 'joueur', [amayas.id]), {},
    'un bloqueur Braise ne peut pas arrêter un attaquant protégé contre Braise');
  assert.equal(rpgLancerAttaque(duel, 'joueur', [amayas.id], { [amayas.id]: [ghul.id] }).raison, 'protection',
    'le moteur refuse aussi une affectation de blocage illégale');

  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'joueur');
  assert.equal(amayas.protection, null, 'la protection expire après le tour adverse immédiatement suivant');
  assert.equal(rpgEstProtegee(amayas, 'braise'), false);
});

test('la partie démarre table vide et chaque camp pioche 5 cartes', () => {
  const duel = duelDeBase();
  assert.equal(duel.joueur.creatures.length, 0, 'aucune créature en jeu au départ');
  assert.equal(duel.sorcier.creatures.length, 0);
  assert.equal(duel.joueur.terrains.length, 0, 'aucun terrain au départ');
  assert.equal(duel.joueur.main.length, RPG_MAIN_DEPART);
  assert.equal(duel.sorcier.main.length, RPG_MAIN_DEPART);
  assert.equal(duel.joueur.pv, 50, 'le joueur démarre à 50 PV');
});

test('les 5 cartes piochées viennent bien du deck', () => {
  const duel = duelDeBase();
  assert.equal(duel.joueur.deck.length, 12 - RPG_MAIN_DEPART);
  const carte = rpgPiocher(duel, 'joueur');
  assert.ok(carte, 'piocher rend la carte');
  assert.equal(duel.joueur.main.length, 6);
});

test('deck vide : piocher rend null sans casser', () => {
  const duel = rpgNouveauDuel({ joueurDeck: ['chien-du-guet', 'chien-du-guet'], rng: () => 0 });
  assert.equal(duel.joueur.main.length, 2, 'le deck ne donne que ce qu’il a');
  assert.equal(rpgPiocher(duel, 'joueur'), null);
});

test('le sorcier ennemi a davantage de PV selon sa puissance', () => {
  assert.equal(rpgSorcierPv(0), 50);
  assert.equal(rpgSorcierPv(4), 70);
  const duel = duelDeBase({ sorcierPuissance: 6 });
  assert.equal(duel.sorcier.pv, 80);
});

test('on pose un terrain par tour, et l’engager donne son mana', () => {
  const duel = duelDeBase();
  donner(duel, 'joueur', 'desert');
  donner(duel, 'joueur', 'mer');
  assert.equal(rpgPoserTerrain(duel, 'joueur', 'desert').ok, true);
  assert.equal(rpgPoserTerrain(duel, 'joueur', 'mer').ok, false, 'un seul terrain par tour');
  assert.equal(duel.joueur.terrains.length, 1);
  const terrain = duel.joueur.terrains[0];
  assert.equal(rpgEngagerTerrain(duel, 'joueur', terrain.id).ok, true);
  assert.equal(rpgMana(duel.joueur).sable, 1, 'le Désert produit un mana sable');
  assert.equal(rpgEngagerTerrain(duel, 'joueur', terrain.id).ok, false, 'déjà engagé');
});

test('payer une créature : le total ET un mana de sa couleur', () => {
  const duel = duelDeBase();
  donner(duel, 'joueur', 'djinn-du-souk'); // coût 5, dont 1 braise
  duel.joueur.mana = { braise: 0, eau: 5, sable: 5 };
  assert.equal(rpgJouerCreature(duel, 'joueur', 'djinn-du-souk').ok, false,
    '10 mana mais aucun braise : le Djinn ne sort pas');
  duel.joueur.mana = { braise: 1, eau: 4, sable: 0 };
  assert.equal(rpgJouerCreature(duel, 'joueur', 'djinn-du-souk').ok, true, '1 braise + 4 : payé');
  assert.equal(rpgMana(duel.joueur).total, 0, 'le mana est dépensé');
});

test('les terrains dégagés rendent une carte jouable et paient automatiquement le coût', () => {
  const duel = duelDeBase();
  donner(duel, 'joueur', 'chien-du-guet'); // 2, dont 1 sable
  const montagne = { id: 'auto-braise', carteId: 'montagne', tapped: false };
  const mer = { id: 'auto-eau', carteId: 'mer', tapped: false };
  duel.joueur.terrains.push(montagne, mer);

  assert.equal(rpgPeutPayer(duel.joueur, creatureById('chien-du-guet')), false,
    'deux terrains ne suffisent pas si aucun ne produit le sable requis');
  assert.equal(rpgJouerCreature(duel, 'joueur', 'chien-du-guet').raison, 'mana');
  assert.equal(montagne.tapped || mer.tapped, false, 'un paiement refusé ne touche pas aux terrains');

  mer.carteId = 'desert';
  assert.equal(rpgPeutPayer(duel.joueur, creatureById('chien-du-guet')), true,
    'les deux terrains disponibles couvrent le coût et la couleur');
  assert.equal(rpgJouerCreature(duel, 'joueur', 'chien-du-guet').ok, true);
  assert.equal(montagne.tapped, true, 'le terrain générique est engagé automatiquement');
  assert.equal(mer.tapped, true, 'le terrain sable est engagé automatiquement');
  assert.equal(rpgMana(duel.joueur).total, 0, 'les terrains produisent puis dépensent leur mana immédiatement');
});

test('Pétra permet de choisir manuellement Braise ou Sable en s’engageant', () => {
  const duelBraise = duelDeBase();
  donner(duelBraise, 'joueur', 'petra');
  assert.equal(rpgPoserTerrain(duelBraise, 'joueur', 'petra').ok, true);
  const petraBraise = duelBraise.joueur.terrains[0];
  assert.deepEqual(terrainManaColors('petra'), ['braise', 'sable']);
  assert.deepEqual(rpgEngagerTerrain(duelBraise, 'joueur', petraBraise.id, 'braise'), { ok: true, couleur: 'braise' });
  assert.equal(rpgMana(duelBraise.joueur).braise, 1);
  assert.equal(petraBraise.tapped, true);

  const duelSable = duelDeBase();
  donner(duelSable, 'joueur', 'petra');
  rpgPoserTerrain(duelSable, 'joueur', 'petra');
  const petraSable = duelSable.joueur.terrains[0];
  assert.equal(rpgEngagerTerrain(duelSable, 'joueur', petraSable.id, 'eau').raison, 'couleur',
    'Pétra refuse une couleur qu’elle ne produit pas sans s’engager');
  assert.equal(petraSable.tapped, false);
  assert.deepEqual(rpgEngagerTerrain(duelSable, 'joueur', petraSable.id, 'sable'), { ok: true, couleur: 'sable' });
  assert.equal(rpgMana(duelSable.joueur).sable, 1);
  assert.equal(rpgEngagerTerrain(duelSable, 'joueur', petraSable.id, 'eau').raison, 'deja-engage');
});

test('un coût hybride exige une source Braise et une source Sable', () => {
  const veilleur = cardById('veilleur-du-couchant');
  const sort = cardById('vent-rouge');
  assert.deepEqual(cardColors(veilleur), ['sable', 'braise']);
  assert.deepEqual(cardColorCost(veilleur), { sable: 1, braise: 1 });
  assert.deepEqual(cardColorCost(sort), { braise: 1, sable: 1 });
  assert.equal(rpgEstProtegee({ protection: { contre: 'sable', toursRestants: 1 } }, cardColors(veilleur)), true,
    'un attaquant bicolore est arrêté par une protection contre le Sable');
  assert.equal(rpgEstProtegee({ protection: { contre: 'eau', toursRestants: 1 } }, cardColors(veilleur)), false,
    'une protection contre une troisième couleur ne s’applique pas');

  const camp = duelDeBase().joueur;
  camp.mana = { braise: 3, eau: 0, sable: 0 };
  assert.equal(rpgPeutPayer(camp, veilleur), false, 'trois Braises ne remplacent pas le pip Sable');
  camp.mana = { braise: 0, eau: 0, sable: 3 };
  assert.equal(rpgPeutPayer(camp, veilleur), false, 'trois Sables ne remplacent pas le pip Braise');
  camp.mana = { braise: 2, eau: 0, sable: 1 };
  assert.equal(rpgPeutPayer(camp, veilleur), true, 'une source de chaque couleur et un mana générique suffisent');
});

test('Pétra et deux Déserts peuvent couvrir les deux pips hybrides et le coût générique', () => {
  const duel = duelDeBase();
  donner(duel, 'joueur', 'veilleur-du-couchant');
  const petra = { id: 'hybride-petra', carteId: 'petra', tapped: false };
  const desertA = { id: 'hybride-sable-a', carteId: 'desert', tapped: false };
  const desertB = { id: 'hybride-sable-b', carteId: 'desert', tapped: false };
  duel.joueur.terrains.push(petra, desertA, desertB);
  assert.equal(rpgPeutPayer(duel.joueur, cardById('veilleur-du-couchant')), true,
    'Pétra peut réserver Braise, les Déserts couvrent Sable et le mana générique');
  assert.equal(rpgJouerCreature(duel, 'joueur', 'veilleur-du-couchant').ok, true);
  assert.ok(petra.tapped && desertA.tapped && desertB.tapped, 'les trois sources sont engagées automatiquement');
  assert.equal(rpgMana(duel.joueur).total, 0, 'les trois manas sont dépensés');
});

test('une magie se paie elle aussi en engageant automatiquement ses terrains', () => {
  const duel = duelDeBase();
  donner(duel, 'joueur', 'eau-de-la-source');
  duel.joueur.pv = 40;
  const terrain = { id: 'mer-auto-sort', carteId: 'mer', tapped: false };
  duel.joueur.terrains.push(terrain);

  assert.equal(rpgPeutPayer(duel.joueur, { cost: 1, element: 'eau' }), true,
    'une source eau dégagée suffit à rendre le rituel jouable');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'eau-de-la-source').ok, true);
  assert.equal(terrain.tapped, true, 'la mer s’engage quand le sort est lancé');
  assert.equal(duel.joueur.pv, 44, 'le sort se résout après son paiement');
  assert.equal(rpgMana(duel.joueur).total, 0);
});

test('poser une créature sans mana échoue, avec mana elle entre en jeu', () => {
  const duel = duelDeBase();
  donner(duel, 'joueur', 'chien-du-guet'); // 2, sable
  assert.equal(rpgJouerCreature(duel, 'joueur', 'chien-du-guet').ok, false, 'sans mana, non');
  donnerMana(duel, 'joueur', 2);
  const pose = rpgJouerCreature(duel, 'joueur', 'chien-du-guet');
  assert.equal(pose.ok, true);
  assert.equal(duel.joueur.creatures.length, 1);
  assert.equal(duel.joueur.creatures[0].atk, 2);
  assert.equal(duel.joueur.creatures[0].pv, 2);
});

test('les blessures restent repérables après un bonus de défense', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  assert.equal(chien.pvMax, 2, 'la créature conserve son maximum de PV de base');

  donner(duel, 'joueur', 'rempart-de-dunes');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'rempart-de-dunes').ok, true);
  assert.equal(chien.pvMax, 3, 'un bonus de défense augmente aussi le maximum de PV');
  rpgBlesserCreature(duel, 'joueur', chien.id, 1);
  assert.equal(chien.pv, 2);
  assert.ok(chien.pv < chien.pvMax, 'la créature blessée reste distinguable après le bonus');
});

test('capacité à l’arrivée : la Porteuse soigne son sorcier (plafonné)', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  duel.joueur.pv = 40;
  donner(duel, 'joueur', 'porteuse-de-cruches');
  rpgJouerCreature(duel, 'joueur', 'porteuse-de-cruches');
  assert.equal(duel.joueur.pv, 43);
  duel.joueur.pv = 49;
  donner(duel, 'joueur', 'porteuse-de-cruches');
  rpgJouerCreature(duel, 'joueur', 'porteuse-de-cruches');
  assert.equal(duel.joueur.pv, 50, 'le soin ne dépasse pas le maximum');
});

test('la Veilleuse gagne son bouclier dès son arrivée et absorbe les premiers dégâts', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'veilleuse-des-citernes');
  const veilleuse = rpgJouerCreature(duel, 'joueur', 'veilleuse-des-citernes').entite;
  assert.equal(veilleuse.bouclier, 2);
  const degats = rpgBlesserCreature(duel, 'joueur', veilleuse.id, 3);
  assert.equal(degats.absorbes, 2);
  assert.equal(veilleuse.pv, 3);
});

test('capacité à l’arrivée : le Guetteur fait piocher une carte', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'guetteur-du-beffroi');
  const mainAvant = duel.joueur.main.length;
  rpgJouerCreature(duel, 'joueur', 'guetteur-du-beffroi');
  assert.equal(duel.joueur.main.length, mainAvant, '−1 posée +1 piochée');
});

test('capacité à l’arrivée : la Vipère mord une créature adverse', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'sorcier', 10);
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'sorcier', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  donner(duel, 'joueur', 'vipere-de-verre');
  rpgJouerCreature(duel, 'joueur', 'vipere-de-verre', chien.id);
  assert.equal(duel.sorcier.creatures.length, 0, '2/2 mordu à 2 : il meurt');
});

test('capacité à l’arrivée : le Colosse buffe vos autres créatures', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donner(duel, 'joueur', 'chien-du-guet');
  donner(duel, 'joueur', 'colosse-de-sel');
  rpgJouerCreature(duel, 'joueur', 'chien-du-guet');
  rpgJouerCreature(duel, 'joueur', 'colosse-de-sel');
  const chien = duel.joueur.creatures.find((e) => e.carteId === 'chien-du-guet');
  const colosse = duel.joueur.creatures.find((e) => e.carteId === 'colosse-de-sel');
  assert.equal(chien.atk, 3);
  assert.equal(chien.pv, 3);
  assert.equal(colosse.atk, 5, 'lui-même n’est pas buffé');
});

test('le Djinn coûte 5, est 3/3 et détruit au hasard un terrain adverse à son arrivée', () => {
  const carte = cardById('djinn-du-souk');
  assert.deepEqual({ cost: carte.cost, atk: carte.atk, def: carte.def }, { cost: 5, atk: 3, def: 3 });
  assert.deepEqual(carte.arrivee, { type: 'detruire-terrain-aleatoire' });
  assert.match(carte.text, /terrain adverse au hasard/i);

  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donner(duel, 'joueur', 'djinn-du-souk');
  duel.sorcier.terrains.push(
    { id: 'terrain-petra', carteId: 'petra', tapped: false },
    { id: 'terrain-desert', carteId: 'desert', tapped: true },
  );
  const debutDestruction = rpgNombreDestructions(duel);
  const randomOriginal = Math.random;
  let pose;
  Math.random = () => 0.99;
  try {
    pose = rpgJouerCreature(duel, 'joueur', 'djinn-du-souk');
  } finally {
    Math.random = randomOriginal;
  }

  assert.equal(pose.ok, true);
  assert.deepEqual(duel.sorcier.terrains.map((terrain) => terrain.carteId), ['petra'],
    'le tirage aléatoire choisi retire bien le Désert, qu’il soit engagé ou non');
  assert.equal(duel.sorcier.cimetiere.at(-1), 'desert', 'le terrain détruit rejoint le cimetière de son propriétaire');
  assert.deepEqual(rpgDestructionsDepuis(duel, debutDestruction), [
    { entityId: 'terrain-desert', sourceElements: ['braise'] },
  ], 'la destruction est attribuée au Djinn Braise pour déclencher l’animation de brûlure');
  assert.equal(duel.sorcier.pv, 50, 'la nouvelle capacité ne blesse plus le sorcier adverse');
  assert.match(duel.log.at(-1), /Djinn du souk détruit le terrain adverse Désert/);
});

test('Esquive 1 réduit les attaques et les magies, mais pas les capacités d’arrivée', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'fennec-des-decombres');
  const fennec = rpgJouerCreature(duel, 'joueur', 'fennec-des-decombres').entite;
  donner(duel, 'sorcier', 'porteuse-de-cruches');
  const porteuse = rpgJouerCreature(duel, 'sorcier', 'porteuse-de-cruches').entite;
  porteuse.ready = true;

  const combat = rpgLancerAttaque(duel, 'sorcier', [porteuse.id], { [porteuse.id]: [fennec.id] });
  assert.equal(combat.ok, true);
  assert.equal(fennec.pv, 1, 'Esquive 1 annule le point d’attaque de la Porteuse');
  assert.ok(duel.joueur.creatures.includes(fennec), 'le Fennec survit au dégât évité');
  assert.ok(!duel.sorcier.creatures.includes(porteuse), 'le Fennec riposte normalement au bloqueur');

  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'brisure-de-verre');
  assert.equal(rpgLancerMagie(duel, 'sorcier', 'brisure-de-verre').ok, true);
  assert.equal(fennec.pv, 1, 'Esquive 1 annule aussi le dégât de la magie');

  donner(duel, 'sorcier', 'braisier-du-souk');
  assert.equal(rpgJouerCreature(duel, 'sorcier', 'braisier-du-souk').ok, true);
  assert.ok(!duel.joueur.creatures.includes(fennec), 'un dégât d’arrivée n’est ni une attaque ni une magie et n’est pas esquivé');
});

test('Esquive 1 se calcule séparément pour chacun des dégâts d’un combat', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'fennec-des-decombres');
  const fennec = rpgJouerCreature(duel, 'joueur', 'fennec-des-decombres').entite;
  fennec.ready = true;
  donner(duel, 'sorcier', 'porteuse-de-cruches');
  donner(duel, 'sorcier', 'porteuse-de-cruches');
  const premierePorteuse = rpgJouerCreature(duel, 'sorcier', 'porteuse-de-cruches').entite;
  const secondePorteuse = rpgJouerCreature(duel, 'sorcier', 'porteuse-de-cruches').entite;

  const combat = rpgLancerAttaque(duel, 'joueur', [fennec.id], {
    [fennec.id]: [premierePorteuse.id, secondePorteuse.id],
  });
  assert.equal(combat.ok, true);
  assert.equal(fennec.pv, 1,
    'les deux bloqueuses infligent 1 chacune, toutes deux annulées séparément par Esquive 1');
  assert.ok(duel.joueur.creatures.includes(fennec), 'le Fennec ne prend aucun dégât cumulé du combat');
});

test('capacité à la destruction : le Sonneur tocsine toutes les créatures adverses', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 30);
  donnerMana(duel, 'sorcier', 30);
  donner(duel, 'joueur', 'sonneur-fele');
  donner(duel, 'sorcier', 'chien-du-guet');
  donner(duel, 'sorcier', 'dune-marchante');
  const sonneur = rpgJouerCreature(duel, 'joueur', 'sonneur-fele').entite;
  rpgJouerCreature(duel, 'sorcier', 'chien-du-guet');
  rpgJouerCreature(duel, 'sorcier', 'dune-marchante');
  rpgBlesserCreature(duel, 'joueur', sonneur.id, 3);
  assert.equal(duel.joueur.creatures.length, 0);
  assert.equal(duel.sorcier.creatures.length, 1, 'le chien 2/2 meurt, la dune survit');
  assert.equal(duel.sorcier.creatures[0].pv, 3, 'la dune 2/5 a pris le tocsin (2)');
});

test('chaque attaquant peut viser le sorcier : les bloqueurs sont choisis séparément', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donnerMana(duel, 'sorcier', 10);
  donner(duel, 'joueur', 'dune-marchante');
  donner(duel, 'sorcier', 'chien-du-guet');
  const maDune = rpgJouerCreature(duel, 'joueur', 'dune-marchante').entite;
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  assert.equal(rpgAttaquerCreature(duel, 'joueur', maDune.id, chien.id).raison,
    'pas-pret', 'une créature qui arrive observe : pas d’attaque ce tour');
  maDune.ready = true;
  chien.ready = true;

  const direct = rpgLancerAttaque(duel, 'joueur', [maDune.id], {});
  assert.equal(direct.ok, true, 'la présence de bloqueurs ne supprime pas les dégâts directs');
  assert.equal(direct.resume.frappeSorcier, 2);
  assert.equal(duel.sorcier.pv, 48);
  assert.equal(duel.sorcier.creatures.length, 1, 'le chien reste en défense tant que le joueur ne l’assigne pas');
  assert.equal(rpgAttaquerSorcier(duel, 'joueur', maDune.id).raison, 'pas-pret', 'une créature ne réattaque pas');
});

test('combat de créatures : dégâts mutuels, la plus fragile casse', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'dune-marchante');
  donner(duel, 'sorcier', 'chien-du-guet');
  rpgJouerCreature(duel, 'joueur', 'dune-marchante');
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  rpgFinDeTour(duel);
  rpgAttaquerCreature(duel, 'sorcier', chien.id, duel.joueur.creatures[0].id);
  assert.equal(duel.sorcier.creatures.length, 0, 'le chien meurt (2 ≥ 2)');
  assert.equal(duel.joueur.creatures[0].pv, 3, 'la dune encaisse 2');
});

test('début de tour : on dégage ses terrains, le mana repart de zéro, pioche 1', () => {
  const duel = duelDeBase();
  donner(duel, 'sorcier', 'desert');
  rpgPoserTerrain(duel, 'sorcier', 'desert');
  rpgEngagerTerrain(duel, 'sorcier', duel.sorcier.terrains[0].id);
  assert.equal(duel.sorcier.terrains[0].tapped, true);
  const mainAvant = duel.sorcier.main.length;
  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'sorcier');
  assert.equal(duel.sorcier.terrains[0].tapped, false, 'les terrains dégagent');
  assert.equal(rpgMana(duel.sorcier).total, 0, 'le mana non dépensé s’est évaporé');
  assert.equal(duel.sorcier.terrainPose, false, 'un nouveau terrain peut être posé');
  assert.equal(duel.sorcier.main.length, mainAvant + 1);
});

test('le sorcier IA joue son tour : terrain, mana, créature, puis attaque', () => {
  const duel = rpgNouveauDuel({
    joueurDeck: ['dune-marchante', 'dune-marchante', 'dune-marchante', 'dune-marchante', 'dune-marchante', 'dune-marchante'],
    sorcierDeck: ['chien-du-guet', 'chien-du-guet', 'chien-du-guet', 'chien-du-guet', 'chien-du-guet', 'chien-du-guet'],
    rng: () => 0.2,
  });
  // Deux Désert déjà en jeu (tours précédents) : l'IA les engage et paie.
  duel.sorcier.terrains.push(
    { id: 't1', carteId: 'desert', tapped: false },
    { id: 't2', carteId: 'desert', tapped: false },
  );
  donner(duel, 'sorcier', 'chien-du-guet');
  rpgTourSorcierIA(duel, () => 0);
  assert.equal(duel.sorcier.creatures.length, 1, '2 mana sable : un chien posé');
  assert.equal(rpgMana(duel.sorcier).total, 0, 'le mana a payé le chien');
  rpgFinDeTour(duel);
  rpgFinDeTour(duel);
  const pvAvant = duel.joueur.pv;
  rpgTourSorcierIA(duel, () => 0);
  assert.equal(duel.joueur.pv, pvAvant - 2, 'le chien prêt frappe le joueur');
});

test('les héros sont des cartes du paquet, pas de la main de départ', () => {
  const duel = rpgNouveauDuel({
    joueurDeck: ['salem', 'yamina', 'boualem', 'feriel', 'tarek', 'chien-du-guet', 'chien-du-guet'],
    rng: () => 0.5,
  });
  donnerMana(duel, 'joueur', 10);
  if (duel.joueur.main.includes('salem')) {
    const res = rpgJouerCreature(duel, 'joueur', 'salem');
    assert.equal(res.ok, true, 'Salem se pose comme carte');
    assert.equal(duel.joueur.creatures[0].kind, 'hero');
  }
  assert.ok(true);
});

test('phase d’attaque sans bloqueur : tous les attaquants frappent le sorcier', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donner(duel, 'joueur', 'chien-du-guet');
  donner(duel, 'joueur', 'dune-marchante');
  rpgJouerCreature(duel, 'joueur', 'chien-du-guet');
  rpgJouerCreature(duel, 'joueur', 'dune-marchante');
  rpgFinDeTour(duel);
  rpgFinDeTour(duel);
  const ids = duel.joueur.creatures.map((e) => e.id);
  const res = rpgLancerAttaque(duel, 'joueur', ids);
  assert.equal(res.ok, true);
  assert.equal(res.resume.frappeSorcier, 2 + 2, 'chien 2 + dune 2');
  assert.equal(duel.sorcier.pv, 50 - 4);
  assert.ok(duel.joueur.creatures.every((e) => e.attaquee), 'tout le monde a frappé');
  assert.equal(rpgLancerAttaque(duel, 'joueur', ids).raison, 'pas-pret', 'une seule attaque par tour');
});

test('après le choix des bloqueurs, un éphémère répond avant les dégâts et un attaquant reste bloqué', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donnerMana(duel, 'sorcier', 10);
  donner(duel, 'joueur', 'chien-du-guet');
  const attaquant = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  attaquant.ready = true;
  donner(duel, 'sorcier', 'chien-du-guet');
  const bloqueur = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  donner(duel, 'joueur', 'rafale-du-minaret');

  const blocages = rpgChoisirBloqueurs(duel, 'joueur', [attaquant.id]);
  assert.deepEqual(blocages[attaquant.id], [bloqueur.id], 'le sorcier assigne son bloqueur avant de rendre la priorité');
  assert.equal(rpgOuvrirFenetreReponse(duel, 'joueur'), true, 'la fenêtre de réponse s’ouvre pendant le tour du joueur');
  const reponse = rpgLancerMagie(duel, 'joueur', 'rafale-du-minaret', bloqueur.id);
  assert.equal(reponse.ok, true, 'le joueur peut lancer un éphémère après le choix du bloqueur');
  assert.equal(duel.sorcier.creatures.includes(bloqueur), false, 'l’éphémère retire le bloqueur avant les dégâts');

  const pvSorcier = duel.sorcier.pv;
  const res = rpgLancerAttaque(duel, 'joueur', [attaquant.id], { [attaquant.id]: [] }, {}, [attaquant.id]);
  assert.equal(res.ok, true);
  assert.equal(res.resume.frappeSorcier, 0, 'un attaquant déjà bloqué ne frappe pas directement quand son bloqueur disparaît');
  assert.deepEqual(res.resume.attaquantsBloques, [attaquant.id]);
  assert.equal(duel.sorcier.pv, pvSorcier);
});

test('défense automatique : une créature bloque chaque attaquant, dégâts simultanés', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'chien-du-guet');   // 2/2
  donner(duel, 'joueur', 'vipere-de-verre'); // 3/1
  donner(duel, 'sorcier', 'dune-marchante'); // 2/5
  donner(duel, 'sorcier', 'dune-marchante'); // 2/5
  rpgJouerCreature(duel, 'joueur', 'chien-du-guet');
  const vipere = rpgJouerCreature(duel, 'joueur', 'vipere-de-verre').entite;
  rpgJouerCreature(duel, 'sorcier', 'dune-marchante');
  rpgJouerCreature(duel, 'sorcier', 'dune-marchante');
  rpgFinDeTour(duel);
  rpgFinDeTour(duel);
  const chien = duel.joueur.creatures.find((e) => e.carteId === 'chien-du-guet');
  const res = rpgLancerAttaque(duel, 'joueur', [chien.id, vipere.id]);
  assert.equal(res.ok, true);
  // chien → dune 1 (2 dégâts), vipère → dune 2 (3 dégâts) ; chaque attaquant
  // encaisse la riposte (2) même si sa cible meurt : dégâts simultanés.
  assert.equal(duel.sorcier.creatures.length, 2, 'les dunes 2/5 encaissent sans mourir');
  assert.deepEqual(duel.sorcier.creatures.map((d) => d.pv).sort(), [2, 3]);
  assert.equal(duel.joueur.creatures.length, 0, 'chien 2/2 et vipère 3/1 meurent à la riposte');
});

test('les magies : types, coûts, cibles et éphémères de combat', () => {
  assert.equal(RPG_MAGIE_CARDS.length, 13);
  for (const carte of RPG_MAGIE_CARDS) {
    assert.ok(['braise', 'eau', 'sable'].includes(carte.element), 'type parmi les trois couleurs');
    assert.ok(carte.kind === 'magie' && carte.cost >= 0);
    assert.ok(Array.isArray(carte.cibles) && carte.cibles.length >= 1);
  }
  assert.ok(RPG_MAGIE_CARDS.some((c) => c.cibles.includes('sorcier')), 'certaines magies ciblent les joueurs');
  assert.ok(RPG_MAGIE_CARDS.some((c) => c.cibles.includes('creature')), 'certaines magies ciblent les créatures');
  assert.ok(RPG_MAGIE_CARDS.find((c) => c.id === 'rafale-du-minaret')?.instant);
  assert.ok(RPG_MAGIE_CARDS.find((c) => c.id === 'brisure-de-verre')?.instant);
});

test('un bloqueur ne peut arrêter qu’un seul attaquant ; les autres frappent les PV', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'sorcier', 'chien-du-guet');
  const attaquantBloque = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  const attaquantLibre = rpgJouerCreature(duel, 'sorcier', 'dune-marchante').entite;
  donner(duel, 'joueur', 'chien-du-guet');
  const bloqueur = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  attaquantBloque.ready = true;
  attaquantLibre.ready = true;
  bloqueur.ready = true;

  const res = rpgLancerAttaque(duel, 'sorcier', [attaquantBloque.id, attaquantLibre.id], {
    [attaquantBloque.id]: bloqueur.id,
  });
  assert.equal(res.ok, true);
  assert.equal(res.resume.paires.length, 1, 'un seul échange de combat');
  assert.equal(res.resume.frappeSorcier, 2, 'la Dune non bloquée inflige 2');
  assert.equal(duel.joueur.pv, 48);
  assert.equal(duel.joueur.creatures.length, 0, 'Chien contre Chien : les deux sont détruits');
  assert.equal(duel.joueur.cimetiere.at(-1), 'chien-du-guet');
});

test('plusieurs bloqueurs défendent un attaquant et la force est répartie avant les dégâts mutuels', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'sorcier', 30);
  donnerMana(duel, 'joueur', 30);
  donner(duel, 'sorcier', 'colosse-de-sel'); // 5/5
  const colosse = rpgJouerCreature(duel, 'sorcier', 'colosse-de-sel').entite;
  donner(duel, 'joueur', 'porteuse-de-cruches'); // 1/3
  donner(duel, 'joueur', 'fennec-des-decombres'); // 3/1, Esquive 1
  const porteuse = rpgJouerCreature(duel, 'joueur', 'porteuse-de-cruches').entite;
  const fennec = rpgJouerCreature(duel, 'joueur', 'fennec-des-decombres').entite;
  colosse.ready = true;

  const res = rpgLancerAttaque(duel, 'sorcier', [colosse.id], {
    [colosse.id]: [porteuse.id, fennec.id],
  }, {
    [colosse.id]: { [porteuse.id]: 3, [fennec.id]: 2 },
  });
  assert.equal(res.ok, true, 'les créatures nouvellement posées peuvent défendre');
  assert.deepEqual(res.resume.blocages[colosse.id], [porteuse.id, fennec.id]);
  assert.deepEqual(res.resume.repartitions[colosse.id], { [porteuse.id]: 3, [fennec.id]: 2 });
  assert.equal(colosse.pv, 1, 'le Colosse reçoit 1 dégât de la Porteuse et 3 du Fennec');
  assert.deepEqual(duel.joueur.creatures, [], 'la répartition détruit la Porteuse et, malgré son esquive, le Fennec');
  assert.ok(duel.joueur.cimetiere.includes('porteuse-de-cruches'));
  assert.ok(duel.joueur.cimetiere.includes('fennec-des-decombres'));
});

test('la répartition des dégâts doit exactement égaler la force de l’attaquant', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'sorcier', 30);
  donnerMana(duel, 'joueur', 30);
  donner(duel, 'sorcier', 'colosse-de-sel');
  const colosse = rpgJouerCreature(duel, 'sorcier', 'colosse-de-sel').entite;
  donner(duel, 'joueur', 'porteuse-de-cruches');
  donner(duel, 'joueur', 'fennec-des-decombres');
  const porteuse = rpgJouerCreature(duel, 'joueur', 'porteuse-de-cruches').entite;
  const fennec = rpgJouerCreature(duel, 'joueur', 'fennec-des-decombres').entite;
  colosse.ready = true;
  const res = rpgLancerAttaque(duel, 'sorcier', [colosse.id], {
    [colosse.id]: [porteuse.id, fennec.id],
  }, {
    [colosse.id]: { [porteuse.id]: 3, [fennec.id]: 1 },
  });
  assert.equal(res.ok, false);
  assert.equal(res.raison, 'repartition');
  assert.equal(colosse.attaquee, false, 'une répartition invalide n’engage pas l’attaquant');
});

test('Parade et Trait de braise sont des éphémères de réponse; le bouclier absorbe les dégâts', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donnerMana(duel, 'sorcier', 10);
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  donner(duel, 'sorcier', 'chien-du-guet');
  const cible = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  Object.assign(cible, { pv: 5, def: 5, pvMax: 5 });
  donner(duel, 'joueur', 'parade-du-verre');
  donner(duel, 'joueur', 'trait-de-braise');
  donnerMana(duel, 'joueur', 2);

  duel.tour = 'sorcier';
  assert.equal(rpgLancerMagie(duel, 'joueur', 'parade-du-verre', chien.id).raison, 'timing',
    'aucune réponse hors de la fenêtre de combat');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'trait-de-braise', cible.id).raison, 'timing',
    'Trait de braise ne peut pas être lancé hors de la fenêtre de réponse adverse');
  duel.fenetreReponse = true;
  const trait = rpgLancerMagie(duel, 'joueur', 'trait-de-braise', cible.id);
  assert.equal(trait.ok, true, 'le nouvel éphémère Braise peut être lancé en réponse');
  assert.equal(cible.pv, 2, 'les 3 dégâts du Trait laissent 2 PV à la créature adverse 5/5');
  assert.ok(duel.joueur.cimetiere.includes('trait-de-braise'), 'le Trait résolu va au cimetière');

  donnerMana(duel, 'joueur', 2);
  const parade = rpgLancerMagie(duel, 'joueur', 'parade-du-verre', chien.id);
  assert.equal(parade.ok, true);
  assert.equal(chien.bouclier, 3);
  assert.ok(duel.joueur.cimetiere.includes('parade-du-verre'), 'la Parade résolue va au cimetière');

  const premierCoup = rpgBlesserCreature(duel, 'joueur', chien.id, 2);
  assert.equal(premierCoup.absorbes, 2);
  assert.equal(chien.pv, 2, 'les premiers dégâts ne traversent pas le bouclier');
  rpgBlesserCreature(duel, 'joueur', chien.id, 2);
  assert.equal(chien.pv, 1, 'le point de bouclier restant absorbe un dégât');
  assert.equal(chien.bouclier, 0);
});

test('Parade de verre ne se lance pas si sa créature cible est absente', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 5);
  donner(duel, 'joueur', 'parade-du-verre');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'parade-du-verre', 'entite-absente').raison, 'cible');
  assert.ok(duel.joueur.main.includes('parade-du-verre'), 'la carte et le mana restent intacts');
});

test('les decks de départ respectent les limites mythiques et le deck hybride reste valide', () => {
  assert.deepEqual(RPG_DECKS.map(({ id }) => id), ['veilleurs-du-desert', 'cour-des-djinns', 'sentiers-de-cendre']);
  assert.equal(RPG_DECK_SORCIER_BASE.filter((id) => id === 'feriel').length, 1,
    'la Cour des Djinns contient une Fériel mythique');
  assert.equal(RPG_DECK_HYBRIDE_BASE.filter((id) => id === 'feriel').length, 1,
    'les Sentiers de cendre contiennent une Fériel mythique');
  assert.equal(RPG_DECK_SORCIER_BASE.filter((id) => id === 'anqa-des-braises').length, 1,
    'la Cour des Djinns contient une Anqa mythique');
  assert.equal(RPG_DECK_HYBRIDE_BASE.filter((id) => id === 'anqa-des-braises').length, 1,
    'les Sentiers de cendre contiennent une Anqa mythique');
  for (const [deck, terrainsAttendus, creaturesAttendues, magiesAttendues] of [
    [RPG_DECK_JOUEUR_BASE, 17, 18, 5],
    [RPG_DECK_SORCIER_BASE, 18, 10, 12],
  ]) {
    const valide = rpgValiderDeck(deck);
    assert.equal(valide.ok, true, valide.raison);
    assert.equal(deck.length, 40);
    assert.equal(valide.terrains, terrainsAttendus);
    const comptes = {};
    for (const id of deck) {
      comptes[id] = (comptes[id] ?? 0) + 1;
      assert.ok(cardById(id), `${id} existe dans le catalogue des cartes`);
    }
    for (const [id, n] of Object.entries(comptes)) {
      const carte = cardById(id);
      const limite = carte.rarity === 'mythique' ? 1 : carte.kind === 'terrain' ? Infinity : 3;
      assert.ok(n <= limite, `${id} ×${n} (limite ${limite})`);
    }
    const creatures = deck.filter((id) => ['creature', 'hero'].includes(cardById(id)?.kind));
    const magies = deck.filter((id) => cardById(id)?.kind === 'magie');
    assert.equal(creatures.length, creaturesAttendues);
    assert.equal(magies.length, magiesAttendues);
  }

  for (const [deck, element, terrain] of [
    [RPG_DECK_JOUEUR_BASE, 'sable', 'desert'],
    [RPG_DECK_SORCIER_BASE, 'braise', 'montagne'],
  ]) {
    for (const id of deck) {
      const carte = cardById(id);
      assert.equal(carte.element, element, `${id} appartient à l’élément ${element}`);
      if (carte.kind === 'terrain') assert.equal(id, terrain, 'le terrain de base correspond à la couleur du deck');
    }
  }

  const deckHybride = RPG_DECKS.find(({ id }) => id === 'sentiers-de-cendre');
  assert.ok(deckHybride, 'le deck hybride apparaît dans la sélection');
  assert.equal(deckHybride.role, 'joueur');
  assert.deepEqual(deckHybride.elements, ['sable', 'braise']);
  assert.equal(deckHybride.cardIds, RPG_DECK_HYBRIDE_BASE, 'la sélection utilise le deck hybride de 40 cartes');
  const valide = rpgValiderDeck(deckHybride.cardIds);
  assert.equal(valide.ok, true, valide.raison);
  assert.equal(valide.terrains, 17);
  assert.equal(RPG_DECK_HYBRIDE_BASE.filter((id) => id === 'petra').length, 5);
  assert.equal(RPG_DECK_HYBRIDE_BASE.filter((id) => id === 'desert').length, 6);
  assert.equal(RPG_DECK_HYBRIDE_BASE.filter((id) => id === 'montagne').length, 6);
  assert.equal(RPG_DECK_HYBRIDE_BASE.filter((id) => ['creature', 'hero'].includes(cardById(id)?.kind)).length, 18);
  assert.equal(RPG_DECK_HYBRIDE_BASE.filter((id) => cardById(id)?.kind === 'magie').length, 5);
  for (const carte of RPG_DUEL_CARDS.filter((candidate) => candidate.rarity === 'mythique')) {
    assert.ok(RPG_DECK_HYBRIDE_BASE.filter((id) => id === carte.id).length <= 1,
      `${carte.id} mythique apparaît au plus une fois dans le deck hybride`);
  }
  for (const id of new Set(RPG_DECK_HYBRIDE_BASE)) {
    const carte = cardById(id);
    assert.ok(cardColors(carte).every((couleur) => deckHybride.elements.includes(couleur)),
      `${id} reste dans l’identité Sable/Braise du deck`);
  }
  const cartesHybrides = new Set(RPG_DECK_HYBRIDE_BASE.filter((id) => {
    const cout = cardColorCost(cardById(id));
    return cout.braise > 0 && cout.sable > 0;
  }));
  assert.ok(cartesHybrides.has('veilleur-du-couchant') && cartesHybrides.has('vent-rouge'),
    'le deck contient plusieurs cartes exigeant une source Braise et une source Sable');
});

test('le validateur rejette : pas 40 cartes, trop d’exemplaires, trop peu de terrains', () => {
  assert.equal(rpgValiderDeck(RPG_DECK_JOUEUR_BASE.slice(0, 39)).ok, false);
  const tropDeCopies = [
    ...Array(17).fill('desert'),
    ...RPG_DECK_JOUEUR_BASE.filter((id) => id !== 'desert').slice(0, 19),
    'chien-du-guet', 'chien-du-guet', 'chien-du-guet', 'chien-du-guet',
  ];
  assert.equal(tropDeCopies.length, 40);
  assert.equal(rpgValiderDeck(tropDeCopies).ok, false, '4 exemplaires d’une créature sont refusés');

  const mythiqueEnDouble = [...RPG_DECK_HYBRIDE_BASE];
  const emplacementFennec = mythiqueEnDouble.indexOf('fennec-des-decombres');
  mythiqueEnDouble[emplacementFennec] = 'sahir-des-braises';
  const resultatMythique = rpgValiderDeck(mythiqueEnDouble);
  assert.equal(resultatMythique.ok, false, 'deux exemplaires du même mythique sont refusés');
  assert.match(resultatMythique.raison, /sahir-des-braises mythique en 2 exemplaires \(1 max\)/);

  const sansTerrains = Array.from({ length: 40 }, (_, index) => RPG_CREATURE_CARDS[index % RPG_CREATURE_CARDS.length].id);
  assert.equal(rpgValiderDeck(sansTerrains).ok, false, '0 terrain = refus');
});

test('Trait de braise coûte 2, est un éphémère et inflige 3 dégâts à une créature ou un sorcier', () => {
  const trait = cardById('trait-de-braise');
  assert.deepEqual({ cost: trait.cost, instant: trait.instant, typeLine: trait.typeLine, amount: trait.effet.amount, cibles: trait.cibles }, {
    cost: 2, instant: true, typeLine: 'Éphémère — Braise', amount: 3, cibles: ['creature', 'sorcier'],
  });
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'trait-de-braise');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'trait-de-braise').ok, false, 'sans cible légale, le sort échoue');
  donnerMana(duel, 'sorcier', 10);
  donner(duel, 'sorcier', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  assert.equal(rpgLancerMagie(duel, 'joueur', 'trait-de-braise', chien.id).ok, true, 'les 3 dégâts détruisent le Chien 2/2');
  assert.equal(duel.sorcier.creatures.length, 0);
  const pvSorcierAvant = duel.sorcier.pv;
  donner(duel, 'joueur', 'trait-de-braise');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'trait-de-braise', 'sorcier').ok, true,
    'la cible Sorcier applique aussi les 3 dégâts');
  assert.equal(duel.sorcier.pv, pvSorcierAvant - 3);
  duel.joueur.pv = 40;
  donner(duel, 'joueur', 'eau-de-la-source');
  rpgLancerMagie(duel, 'joueur', 'eau-de-la-source');
  assert.equal(duel.joueur.pv, 44);
  const mainAvant = duel.joueur.main.length;
  donner(duel, 'joueur', 'rapport-du-greffier');
  rpgLancerMagie(duel, 'joueur', 'rapport-du-greffier');
  assert.equal(duel.joueur.main.length, mainAvant + 2, 'donner +1, lancée −1, piochées +2');
  donner(duel, 'joueur', 'fureur-du-souk');
  const pvAvant = duel.sorcier.pv;
  rpgLancerMagie(duel, 'joueur', 'fureur-du-souk');
  assert.equal(duel.sorcier.pv, pvAvant - 4, 'Fureur du souk touche le sorcier');
});

test('vainqueur : nul tant que les deux sorciers sont debout', () => {
  const duel = duelDeBase();
  assert.equal(rpgVainqueur(duel), null);
  duel.sorcier.pv = 0;
  assert.equal(rpgVainqueur(duel), 'joueur');
  duel.joueur.pv = 0;
  assert.equal(rpgVainqueur(duel), 'egalite');
});
