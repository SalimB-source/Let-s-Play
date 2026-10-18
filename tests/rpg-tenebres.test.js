import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

import {
  CARD_FRAME_COLORS,
  RPG_CREATURE_CARDS,
  RPG_ELEMENTS,
  RPG_JETON_CARDS,
  RPG_MAGIE_CARDS,
  MYTHIQUE_VITRINE_PAR_ELEMENT,
  cardById,
  cardColorCost,
  cardCopyLimit,
} from '../src/games/rpgCards.js';
import {
  RPG_TENEBRES_ARMES,
  RPG_TENEBRES_CREATURES,
  RPG_TENEBRES_FIGURES,
  RPG_TENEBRES_JETONS,
  RPG_TENEBRES_MAGIES,
} from '../src/games/rpgTenebres.js';
import {
  RPG_MANA_ESSAI_DECKS,
  RPG_MODE_MANA_ESSAI,
  adversaireManaEssai,
  validerDeckManaEssai,
} from '../src/games/rpgManaEssai.js';
import {
  arriveeCiblePortee,
  rpgAttaquerSorcier,
  rpgDemarrerManaEssai,
  rpgLancerMagie,
  rpgMulligan,
  rpgMulliganSorcier,
  rpgNouveauDuel,
  rpgPeutPayer,
} from '../src/games/rpgDuel.js';
import { EFFETS_SPRITE, effetIcon, iconePourLigne, pastillesPourCarte } from '../src/games/effetIcons.js';

/* ── Le set Ténèbres : La Balance des Heures (doc 16) ──────────────────────── */

test('la cinquième couleur existe partout où l’élément se nomme', () => {
  assert.equal(RPG_ELEMENTS.length, 5);
  assert.equal(RPG_ELEMENTS[4], 'tenebres');
  const couleurs = Object.keys(CARD_FRAME_COLORS).filter((key) => !key.startsWith('arme'));
  assert.equal(couleurs.length, 31, '5 mono + 26 combinaisons (binômes, trinômes, quadrinômes et le tout-éléments)');
  assert.ok(CARD_FRAME_COLORS.tenebres, 'la couleur mono Ténèbres');
  assert.ok(CARD_FRAME_COLORS['hybride-braise-eau-sable-neige-tenebres'], 'le repli à cinq couleurs');
  assert.ok(CARD_FRAME_COLORS['arme-tenebres'], 'l’acier de Ténèbres');
  assert.equal(MYTHIQUE_VITRINE_PAR_ELEMENT.tenebres, 'la-devoreuse');
  assert.ok(cardById('la-devoreuse'));
});

test('les 20 fiches de base sont en Ténèbres, les 6 grandes figures couvrent les éléments, et les limites de copies tiennent', () => {
  const fiches = [...RPG_TENEBRES_CREATURES, ...RPG_TENEBRES_MAGIES, ...RPG_TENEBRES_ARMES, ...RPG_TENEBRES_JETONS];
  assert.equal(RPG_TENEBRES_CREATURES.length, 18);
  assert.equal(RPG_TENEBRES_FIGURES.length, 6);
  assert.equal(RPG_TENEBRES_MAGIES.length, 6);
  assert.equal(RPG_TENEBRES_ARMES.length, 1);
  assert.equal(RPG_TENEBRES_JETONS.length, 1);
  assert.equal(RPG_TENEBRES_JETONS[0].id, 'shabti');
  const baseFiches = [
    ...RPG_TENEBRES_CREATURES.slice(0, 12),
    ...RPG_TENEBRES_MAGIES,
    ...RPG_TENEBRES_ARMES,
    ...RPG_TENEBRES_JETONS,
  ];
  for (const carte of baseFiches) {
    assert.equal(carte.element, 'tenebres', carte.id);
  }
  for (const carte of fiches) {
    assert.equal(cardById(carte.id)?.id, carte.id, `${carte.id} est dans le catalogue`);
    assert.ok(existsSync(`public/cards/${carte.art || carte.id}.jpg`), `illustration présente pour ${carte.id}`);
  }
  for (const figure of RPG_TENEBRES_FIGURES) {
    assert.equal(figure.rarity, 'mythique', `${figure.id} est mythique`);
    assert.equal(cardCopyLimit(cardById(figure.id)), 1, `${figure.id} est limitée à 1 exemplaire`);
    assert.match(figure.typeLine, /^Créature légendaire — /);
    assert.doesNotMatch(`${figure.name} ${figure.typeLine} ${figure.text} ${figure.flavor}`, /\bdieu(x)?\b/iu,
      `${figure.id} est nommée par son attribut, jamais « dieu »`);
  }
  assert.deepEqual(RPG_TENEBRES_FIGURES.map((f) => f.element),
    ['tenebres', 'tenebres', 'sable', 'braise', 'sable', 'eau']);
  assert.deepEqual(cardColorCost(cardById('maitre-des-hieroglyphes')), { tenebres: 1 });
  assert.deepEqual(cardColorCost(cardById('faucon-du-zenith')), { sable: 1 });
  const ids = fiches.map((carte) => carte.id);
  assert.equal(new Set(ids).size, ids.length, 'aucun id dupliqué dans le set');
  const catalogue = [...RPG_CREATURE_CARDS, ...RPG_MAGIE_CARDS, ...RPG_JETON_CARDS].map((carte) => carte.id);
  assert.equal(new Set(catalogue).size, catalogue.length, 'aucun id dupliqué dans le catalogue entier');
  assert.equal(cardCopyLimit(cardById('la-devoreuse')), 1, 'la mythique se joue en exemplaire unique');
  assert.equal(cardCopyLimit(cardById('momie-de-lin')), 2);
  assert.deepEqual(cardColorCost(cardById('momie-de-lin')), { tenebres: 1 });
});

test('les mécaniques du moteur sont posées sur les fiches qui les servent', () => {
  assert.equal(cardById('le-poids').effet.type, 'transfert');
  assert.equal(cardById('la-grande-pesee').effet.type, 'transfert');
  assert.equal(cardById('la-grande-pesee').effet.pioche, 1);
  assert.ok(cardById('la-grande-pesee').prixPv >= 1, 'la Grande Pesée se paie aussi en PV');
  assert.equal(cardById('nom-efface').effet.type, 'defausse-adverse');
  assert.equal(cardById('les-feuillets').effet.type, 'defaussePaquet');
  assert.equal(cardById('les-feuillets').effet.amount, 3);
  assert.equal(cardById('pretre-de-la-bouche').arrivee.type, 'transfert');
  assert.equal(cardById('pretre-de-la-bouche').arrivee.amount, 1);
  assert.equal(arriveeCiblePortee(cardById('pretre-de-la-bouche')), null, 'le transfert à l’arrivée ne désigne personne');
  assert.equal(cardById('ouvrier-du-natron').destruction.type, 'transfert');
  assert.equal(cardById('chacal-du-seuil').tribut, 1);
  assert.equal(cardById('celui-qui-juge').tribut, 2);
  assert.equal(cardById('khopesh-d-or').donne.tribut, 1, 'l’arme de Khéops porte le Tribut');
  // Français d’abord : le mot-clé se lit dans le texte, jamais « dégâts ».
  assert.match(cardById('chacal-du-seuil').text, /tribut/iu);
  assert.match(cardById('le-poids').text, /perd 2 PV/iu);
  assert.doesNotMatch(cardById('le-poids').text, /dégâts?/iu);
});

test('les pastilles et les lignes de règle lisent le Tribut et la défausse', () => {
  const pastillesDe = (id) => pastillesPourCarte(cardById(id))
    .map((pastille) => (pastille.valeur != null ? `${pastille.label} ${pastille.valeur}` : pastille.label));
  assert.ok(pastillesDe('chacal-du-seuil').includes('Tribut 1'));
  assert.ok(pastillesDe('le-poids').includes('Transfert'));
  assert.ok([...EFFETS_SPRITE.matchAll(/<symbol id="(i-[a-z-]+)"/g)].some((m) => m[1] === 'i-tribut'));
  assert.equal(effetIcon('tribut').includes('#i-tribut'), true);
  assert.equal(iconePourLigne(cardById('chacal-du-seuil'), cardById('chacal-du-seuil').text), 'tribut',
    '« Tribut 1 — … » ouvre la ligne : son icône passe avant toute autre');
  assert.equal(iconePourLigne(cardById('nom-efface'), cardById('nom-efface').text), 'defausse');
  assert.equal(iconePourLigne(cardById('le-poids'), cardById('le-poids').text), 'transfert',
    'sans motif imprimé, l’effet principal de la fiche tranche');
});

test('La Balance des Heures tient dans le banc d’essai', () => {
  const deck = RPG_MANA_ESSAI_DECKS.find((candidate) => candidate.id === 'essai-mana-tenebres');
  assert.ok(deck, 'le quatrième deck est enregistré');
  assert.equal(deck.cardIds.length, 30);
  assert.deepEqual(deck.elements, ['tenebres']);
  assert.deepEqual(validerDeckManaEssai(deck), { ok: true }, deck.name);
  assert.equal(adversaireManaEssai(deck).id, RPG_MANA_ESSAI_DECKS[0].id, 'la rotation fait le tour des quatre decks');
});

const rng = () => 0.5;
const deck = RPG_MANA_ESSAI_DECKS.find((candidate) => candidate.id === 'essai-mana-tenebres');
const nouveau = () => rpgNouveauDuel({
  joueurDeck: deck.cardIds,
  sorcierDeck: deck.cardIds,
  joueurCouleurs: ['tenebres'],
  sorcierCouleurs: ['tenebres'],
  modeMana: RPG_MODE_MANA_ESSAI,
  rng,
});
const installerMana = (duel) => {
  assert.equal(rpgMulligan(duel, 'joueur', [], rng).ok, true);
  assert.equal(rpgMulliganSorcier(duel, rng).ok, true);
  rpgDemarrerManaEssai(duel);
  duel.joueur.mana.tenebres = 50;
  duel.joueur.manaMax.tenebres = Math.max(duel.joueur.manaMax.tenebres ?? 0, 50);
};

test('moteur : le transfert déplace des PV, jamais des dégâts', () => {
  const duel = nouveau();
  installerMana(duel);
  duel.joueur.main.push('le-poids');
  duel.joueur.pv = 20;
  const sorcierAvant = duel.sorcier.pv;
  const res = rpgLancerMagie(duel, 'joueur', 'le-poids');
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(duel.sorcier.pv, sorcierAvant - 2, 'le sorcier perd 2 PV');
  assert.equal(duel.joueur.pv, 22, 'le joueur en gagne 2');
  assert.ok(duel.log.some((ligne) => /Transfert :/u.test(ligne)));
});

test('moteur : le Prix en PV refuse la carte sous le seuil, rien n’est payé', () => {
  const duel = nouveau();
  installerMana(duel);
  duel.joueur.main.push('papyrus');
  duel.joueur.pv = 1;
  const papyrus = cardById('papyrus');
  assert.equal(rpgPeutPayer(duel.joueur, papyrus), false, '2 PV de Prix, 1 PV en main : refus');
  const mainAvant = duel.joueur.main.length;
  const res = rpgLancerMagie(duel, 'joueur', 'papyrus');
  assert.equal(res.ok, false);
  assert.equal(duel.joueur.pv, 1, 'aucun PV dépensé');
  assert.equal(duel.joueur.main.length, mainAvant, 'la carte reste en main');
  duel.joueur.pv = 3;
  assert.equal(rpgPeutPayer(duel.joueur, papyrus), true, 'au-dessus du seuil, la carte se paie');
  const res2 = rpgLancerMagie(duel, 'joueur', 'papyrus');
  assert.equal(res2.ok, true, JSON.stringify(res2));
  assert.equal(duel.joueur.pv, 1, '2 PV de Prix payés');
  assert.ok(!duel.joueur.main.includes('papyrus'), 'la carte a quitté la main');
});

test('moteur : Nom effacé au choix de la victime, Les feuillets raccourcissent le paquet', () => {
  const duel = nouveau();
  installerMana(duel);
  duel.joueur.main.push('nom-efface', 'les-feuillets');

  // Le sorcier est la victime : l’IA épargne sa meilleure carte.
  duel.sorcier.main = ['papyrus', 'khopesh-d-or'];
  const avantSorcier = duel.sorcier.main.length;
  const res = rpgLancerMagie(duel, 'joueur', 'nom-efface');
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(duel.sorcier.main.length, avantSorcier - 1, 'une seule carte adverse part');

  // Les feuillets : trois cartes du dessus du paquet adverse au cimetière.
  const deckAvant = duel.sorcier.deck.length;
  const cimetiereAvant = duel.sorcier.cimetiere.length;
  const res2 = rpgLancerMagie(duel, 'joueur', 'les-feuillets');
  assert.equal(res2.ok, true, JSON.stringify(res2));
  assert.equal(duel.sorcier.deck.length, deckAvant - 3, 'trois feuillets tombent');
  assert.equal(duel.sorcier.cimetiere.length, cimetiereAvant + 3);
});

test('moteur : quand le sorcier efface, c’est au joueur de choisir (écran de défausse)', () => {
  const duel = nouveau();
  installerMana(duel);
  duel.sorcier.main.push('nom-efface');
  duel.sorcier.manaSources = ['tenebres'];
  duel.sorcier.mana.tenebres = 50;
  duel.sorcier.manaMax.tenebres = Math.max(duel.sorcier.manaMax.tenebres ?? 0, 50);
  duel.tour = 'sorcier';
  const mainAvant = duel.joueur.main.length;
  const res = rpgLancerMagie(duel, 'sorcier', 'nom-efface');
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(duel.defausseEnAttente?.cote, 'joueur', 'l’écran de défausse s’ouvre pour le joueur');
  assert.equal(duel.defausseEnAttente?.restant, 1);
  assert.equal(duel.joueur.main.length, mainAvant, 'rien n’est enlevé tant que le joueur n’a pas choisi');
});

test('moteur : le Tribut transfère la vie au contact du sorcier', () => {
  const duel = nouveau();
  installerMana(duel);
  duel.joueur.pv = 18;
  duel.joueur.creatures.push({
    id: 'tribut-test',
    carteId: 'chacal-du-seuil',
    name: 'Chacal du seuil',
    atk: 1,
    pv: 1,
    pvMax: 1,
    tribut: 1,
    ready: true,
    attaquee: false,
    jeton: false,
    armes: [],
    emplacement: 0,
  });
  const avant = { joueur: duel.joueur.pv, sorcier: duel.sorcier.pv };
  const res = rpgAttaquerSorcier(duel, 'joueur', 'tribut-test');
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(duel.sorcier.pv, avant.sorcier - 1 - 1, 'la frappe d’attaque + le Tribut');
  assert.equal(duel.joueur.pv, avant.joueur + 1, 'le contrôleur reçoit les PV du Tribut');
  assert.ok(duel.log.some((ligne) => /Tribut :/u.test(ligne)), 'le journal nomme le Tribut');
});
