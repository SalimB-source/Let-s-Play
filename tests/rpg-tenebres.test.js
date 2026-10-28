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
  rpgDefausserCarte,
  rpgFinDeTour,
  rpgLancerAttaque,
  rpgLancerMagie,
  rpgJouerCreature,
  rpgJouerArme,
  rpgAttaquerCreature,
  rpgSacrifierCreature,
  rpgBlesserCreature,
  rpgMulligan,
  rpgMulliganSorcier,
  rpgNombreTransferts,
  rpgNombreTributs,
  rpgNouveauDuel,
  rpgPeutPayer,
  rpgTributsDepuis,
  rpgTransfertsDepuis,
} from '../src/games/rpgDuel.js';
import { choisirCarteIA } from '../src/games/rpgAI.js';
import { EFFETS_SPRITE, effetIcon, iconePourLigne, pastillesPourCarte } from '../src/games/effetIcons.js';

/* ── Le set Ténèbres : La Balance des Heures (doc 16) ──────────────────────── */

test('la cinquième couleur existe partout où l’élément se nomme', () => {
  assert.equal(RPG_ELEMENTS.length, 5);
  assert.equal(RPG_ELEMENTS[4], 'tenebres');
  const couleurs = Object.keys(CARD_FRAME_COLORS).filter((key) => !key.startsWith('arme'));
  assert.equal(couleurs.length, 31, '5 mono + 26 combinaisons (binômes, trinômes, quadrinômes et le tout-éléments)');
  assert.ok(CARD_FRAME_COLORS.tenebres, 'la couleur mono Ténèbres');
  assert.ok(CARD_FRAME_COLORS['hybride-braise-eau-sable-neige-tenebres'], 'le repli à cinq couleurs');
  assert.equal(Object.keys(CARD_FRAME_COLORS).some((key) => key.startsWith('arme')), false,
    'aucune couleur de cadre spécifique aux armes ne subsiste, y compris pour Ténèbres');
  assert.equal(MYTHIQUE_VITRINE_PAR_ELEMENT.tenebres, 'la-devoreuse');
  assert.ok(cardById('la-devoreuse'));
});

test('les 21 fiches de base sont en Ténèbres, les 5 grandes figures couvrent les éléments, et les limites de copies tiennent', () => {
  const fiches = [...RPG_TENEBRES_CREATURES, ...RPG_TENEBRES_MAGIES, ...RPG_TENEBRES_ARMES, ...RPG_TENEBRES_JETONS];
  assert.equal(RPG_TENEBRES_CREATURES.length, 17);
  assert.equal(RPG_TENEBRES_FIGURES.length, 5);
  assert.equal(RPG_TENEBRES_MAGIES.length, 7);
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
    ['tenebres', 'sable', 'braise', 'sable', 'eau']);
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
  assert.equal(cardById('la-grande-pesee').effet.pioche, 2);
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
  assert.equal(effetIcon('transfert').includes('#i-transfert'), true,
    'Le Poids (transfert) porte son icône propre, pas celle du Tribut');
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
  assert.equal(adversaireManaEssai(deck).id, 'essai-mana-lettres-de-marque',
    'la rotation enchaîne sur le deck des Lettres de Marque, cinquième du banc');
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
  // Le journal hors-état nomme le camp qui reçoit la vie et la carte source,
  // pour que la table allume sa balance des Heures.
  assert.equal(rpgNombreTransferts(duel), 1);
  assert.deepEqual(rpgTransfertsDepuis(duel), [
    { coteSource: 'joueur', montant: 2, sourceCarteId: 'le-poids' },
  ]);
  assert.deepEqual(rpgTransfertsDepuis(duel, 1), [], 'la position de lecture borne le journal');
});

test('moteur : le Tribut au combat remplit le même journal, sans carte source', () => {
  const duel = nouveau();
  installerMana(duel);
  duel.joueur.pv = 18;
  // Une créature prête portant Tribut 1, comme dans le test de Tribut existant :
  // elle touche le sorcier, la vie change de camp sans passer par un sort.
  duel.joueur.creatures.push({
    id: 'tribut-journal-test',
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
  const pvJoueurAvant = duel.joueur.pv;
  const pvSorcierAvant = duel.sorcier.pv;
  const attaque = rpgAttaquerSorcier(duel, 'joueur', 'tribut-journal-test');
  assert.equal(attaque.ok, true, JSON.stringify(attaque));
  assert.equal(duel.sorcier.pv, pvSorcierAvant - 2, 'la frappe d’attaque puis le Tribut');
  assert.equal(duel.joueur.pv, pvJoueurAvant + 1, 'le joueur encasse le Tribut');
  const transferts = rpgTransfertsDepuis(duel);
  assert.equal(transferts.length, 1);
  assert.equal(transferts[0].coteSource, 'joueur');
  assert.equal(transferts[0].montant, 1);
  assert.equal(transferts[0].sourceCarteId, null, 'un Tribut au combat n’a pas de carte sort source');
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

test('moteur : deux Tributs qui touchent le sorcier au même combat se cumulent', () => {
  const duel = nouveau();
  installerMana(duel);
  duel.joueur.pv = 18;
  for (let i = 0; i < 2; i += 1) {
    duel.joueur.creatures.push({
      id: `chacal-${i}`,
      carteId: 'chacal-du-seuil',
      name: `Chacal ${i}`,
      atk: 1,
      pv: 1,
      pvMax: 1,
      def: 1,
      tribut: 1,
      ready: true,
      attaquee: false,
      jeton: false,
      armes: [],
      emplacement: i,
    });
  }
  const avant = { joueur: duel.joueur.pv, sorcier: duel.sorcier.pv };
  const res = rpgLancerAttaque(duel, 'joueur', ['chacal-0', 'chacal-1'], { 'chacal-0': [], 'chacal-1': [] });
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(duel.log.filter((ligne) => /Tribut :/u.test(ligne)).length, 2,
    'chaque Chacal déclenche son propre Tribut');
  assert.equal(duel.sorcier.pv, avant.sorcier - 2 - 2, 'deux frappes + deux Tributs');
  assert.equal(duel.joueur.pv, avant.joueur + 2, 'les deux transferts de vie se cumulent');
});

test('moteur : le journal de Tribut nomme la créature collectrice, sans les pesées', () => {
  const duel = nouveau();
  installerMana(duel);
  duel.joueur.pv = 18;
  duel.joueur.creatures.push({
    id: 'tribut-fil-test',
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
  const attaque = rpgAttaquerSorcier(duel, 'joueur', 'tribut-fil-test');
  assert.equal(attaque.ok, true, JSON.stringify(attaque));
  assert.equal(rpgNombreTributs(duel), 1, 'un contact au sorcier = un Tribut journalisé');
  assert.deepEqual(rpgTributsDepuis(duel), [
    { entityId: 'tribut-fil-test', cote: 'joueur', montant: 1 },
  ]);
  assert.deepEqual(rpgTributsDepuis(duel, 1), [], 'la position de lecture borne le journal');

  // Une pesée lancée depuis la main remplit bien le journal des transferts,
  // mais jamais celui des Tributs : aucun fil ne doit partir d'une créature.
  const duelPesee = nouveau();
  installerMana(duelPesee);
  duelPesee.joueur.main.push('le-poids');
  duelPesee.joueur.pv = 20;
  const pesee = rpgLancerMagie(duelPesee, 'joueur', 'le-poids');
  assert.equal(pesee.ok, true, JSON.stringify(pesee));
  assert.equal(rpgNombreTransferts(duelPesee), 1, 'la pesée reste un transfert de vie');
  assert.equal(rpgNombreTributs(duelPesee), 0, 'une pesée n’a pas de créature source : pas de Tribut');
});

test('moteur : chaque créature qui touche le sorcier laisse son propre Tribut', () => {
  const duel = nouveau();
  installerMana(duel);
  duel.joueur.pv = 18;
  for (let i = 0; i < 2; i += 1) {
    duel.joueur.creatures.push({
      id: `chacal-fil-${i}`,
      carteId: 'chacal-du-seuil',
      name: `Chacal ${i}`,
      atk: 1,
      pv: 1,
      pvMax: 1,
      def: 1,
      tribut: 1,
      ready: true,
      attaquee: false,
      jeton: false,
      armes: [],
      emplacement: i,
    });
  }
  const res = rpgLancerAttaque(duel, 'joueur', ['chacal-fil-0', 'chacal-fil-1'], {
    'chacal-fil-0': [],
    'chacal-fil-1': [],
  });
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.deepEqual(rpgTributsDepuis(duel), [
    { entityId: 'chacal-fil-0', cote: 'joueur', montant: 1 },
    { entityId: 'chacal-fil-1', cote: 'joueur', montant: 1 },
  ], 'la table peut tracer un fil par créature, pas un fil fusionné');
});

test('moteur : un Tribut du sorcier nomme le camp adverse', () => {
  const duel = nouveau();
  installerMana(duel);
  duel.sorcier.pv = 20;
  duel.sorcier.creatures.push({
    id: 'chacal-ennemi',
    carteId: 'chacal-du-seuil',
    name: 'Chacal adverse',
    atk: 1,
    pv: 1,
    pvMax: 1,
    def: 1,
    tribut: 1,
    ready: true,
    attaquee: false,
    jeton: false,
    armes: [],
    emplacement: 0,
  });
  const attaque = rpgAttaquerSorcier(duel, 'sorcier', 'chacal-ennemi');
  assert.equal(attaque.ok, true, JSON.stringify(attaque));
  assert.deepEqual(rpgTributsDepuis(duel), [
    { entityId: 'chacal-ennemi', cote: 'sorcier', montant: 1 },
  ], 'le fil se trace aussi quand c’est le sorcier qui encaisse le Tribut');
});

test('moteur : deux « Nom effacé » cumulent leurs défausses pour le joueur', () => {
  const duel = nouveau();
  installerMana(duel);
  duel.sorcier.main.push('nom-efface', 'nom-efface');
  duel.sorcier.mana.tenebres = 50;
  duel.sorcier.manaMax.tenebres = Math.max(duel.sorcier.manaMax.tenebres ?? 0, 50);
  duel.tour = 'sorcier';
  const mainAvant = duel.joueur.main.length;
  assert.equal(rpgLancerMagie(duel, 'sorcier', 'nom-efface').ok, true);
  assert.equal(rpgLancerMagie(duel, 'sorcier', 'nom-efface').ok, true);
  assert.equal(duel.defausseEnAttente?.cote, 'joueur', 'l’écran de défausse est ouvert');
  assert.equal(duel.defausseEnAttente?.restant, 2, 'les deux défausses se cumulent');
  assert.equal(duel.joueur.main.length, mainAvant, 'rien n’est enlevé tant que le joueur n’a pas choisi');
  rpgDefausserCarte(duel, 'joueur');
  assert.equal(duel.defausseEnAttente?.restant, 1, 'il reste la défausse du second effacement');
  rpgDefausserCarte(duel, 'joueur');
  assert.equal(duel.defausseEnAttente, null, 'la fenêtre est soldée');
  assert.equal(duel.joueur.main.length, mainAvant - 2, 'deux cartes sont bien parties');
});


test('Ténèbres : Tribut reste minoritaire et les quatre rôles révisés sont distincts', () => {
  const creatures = RPG_TENEBRES_CREATURES.filter((c) => c.element === 'tenebres');
  assert.equal(creatures.length, 13);
  assert.deepEqual(creatures.filter((c) => c.tribut).map((c) => c.id), ['chacal-du-seuil', 'celui-qui-juge']);
  for (const id of ['ureus-du-seuil', 'celle-qui-pese', 'passeur-au-masque-de-chacal', 'maitre-des-hieroglyphes']) {
    const carte = cardById(id);
    assert.equal(carte.tribut, undefined);
    assert.doesNotMatch(carte.text, /tribut/iu);
    assert.ok(!pastillesPourCarte(carte).some((p) => p.label === 'Tribut'));
  }
  assert.equal(cardById('ureus-du-seuil').coupRapide, true);
  assert.equal(cardById('ureus-du-seuil').atk, 2);
  assert.equal(cardById('ureus-du-seuil').def, 1);
  assert.equal(cardById('celle-qui-pese').arrivee.type, 'defausse-adverse');
  assert.equal(cardById('passeur-au-masque-de-chacal').arrivee.type, 'reanimation');
  assert.deepEqual(cardById('maitre-des-hieroglyphes').arrivee, { type: 'pioche', amount: 2 });
});

const poserTenebres = (duel, id) => {
  duel.joueur.main.push(id);
  const resultat = rpgJouerCreature(duel, 'joueur', id);
  assert.equal(resultat.ok, true, JSON.stringify(resultat));
  return resultat.entite;
};

test('moteur : Celle qui pèse fait défausser à son arrivée, même sans combat', () => {
  for (const main of [[], ['papyrus', 'khopesh-d-or']]) {
    const duel = nouveau();
    installerMana(duel);
    duel.sorcier.main = [...main];
    const pv = duel.sorcier.pv;
    const cimetiere = duel.sorcier.cimetiere.length;
    poserTenebres(duel, 'celle-qui-pese');
    assert.equal(duel.sorcier.main.length, Math.max(0, main.length - 1));
    assert.equal(duel.sorcier.cimetiere.length, cimetiere + (main.length ? 1 : 0));
    assert.equal(duel.sorcier.pv, pv);
  }
});

test('moteur : le Passeur réanime et le Maître pioche sans Tribut', () => {
  const duel = nouveau();
  installerMana(duel);
  duel.joueur.cimetiere = ['ouvrier-du-natron', 'momie-de-lin', 'papyrus'];
  poserTenebres(duel, 'passeur-au-masque-de-chacal');
  assert.ok(duel.joueur.creatures.some((c) => c.carteId === 'momie-de-lin'));
  assert.deepEqual(duel.joueur.cimetiere, ['ouvrier-du-natron', 'papyrus']);
  const main = duel.joueur.main.length;
  const paquet = duel.joueur.deck.length;
  poserTenebres(duel, 'maitre-des-hieroglyphes');
  assert.equal(duel.joueur.main.length, main + 2);
  assert.equal(duel.joueur.deck.length, paquet - 2);
});

test('moteur : l’Uræus frappe une créature sans riposte et sans transférer de PV', () => {
  const duel = nouveau();
  installerMana(duel);
  const ureus = poserTenebres(duel, 'ureus-du-seuil');
  const cible = poserTenebres(duel, 'momie-de-lin');
  duel.joueur.creatures = duel.joueur.creatures.filter((c) => c.id !== cible.id);
  duel.sorcier.creatures.push(cible);
  ureus.ready = true;
  const pv = [duel.joueur.pv, duel.sorcier.pv, ureus.pv];
  assert.equal(rpgAttaquerSorcier(duel, 'joueur', ureus.id, cible.id).ok, true);
  assert.equal(cible.pv, cible.pvMax - ureus.atk);
  assert.deepEqual([duel.joueur.pv, duel.sorcier.pv, ureus.pv], pv);
  assert.equal(ureus.attaquee, true);
});

test('moteur : le Chacal du seuil 2/1 attaque dès son arrivée avec Rapidité et Tribut', () => {
  const carte = cardById('chacal-du-seuil');
  assert.equal(carte.rapidite, true);
  assert.equal(carte.atk, 2);
  assert.equal(carte.def, 1);
  assert.match(carte.text, /Rapidité/);
  assert.ok(pastillesPourCarte(carte).some((p) => p.label === 'Rapidité'));
  const duel = nouveau();
  installerMana(duel);
  duel.joueur.pv = 20;
  const adverse = duel.sorcier.pv;
  const chacal = poserTenebres(duel, 'chacal-du-seuil');
  assert.equal(chacal.ready, true);
  assert.equal(rpgAttaquerSorcier(duel, 'joueur', chacal.id).ok, true);
  assert.equal(duel.sorcier.pv, adverse - 3, '2 d’attaque et 1 de Tribut');
  assert.equal(duel.joueur.pv, 21);
});

test('l’Ouvrier du natron est une 1/1 pour 1 mana et transfère 1 PV à sa mort', () => {
  const carte = cardById('ouvrier-du-natron');
  assert.equal(carte.cost, 1);
  assert.equal(carte.atk, 1);
  assert.equal(carte.def, 1);
  assert.deepEqual(carte.destruction, { type: 'transfert', amount: 1 });
  const duel = nouveau();
  installerMana(duel);
  duel.joueur.pv = 20;
  const ouvrier = poserTenebres(duel, 'ouvrier-du-natron');
  assert.equal(ouvrier.atk, 1);
  assert.equal(ouvrier.pv, 1);
  const adverse = duel.sorcier.pv;
  rpgBlesserCreature(duel, 'joueur', ouvrier.id, 1);
  assert.ok(!duel.joueur.creatures.some((c) => c.id === ouvrier.id), 'l’Ouvrier est au cimetière');
  assert.equal(duel.sorcier.pv, adverse - 1, 'le sorcier adverse perd 1 PV');
  assert.equal(duel.joueur.pv, 21, 'vous en gagnez 1');
});

test('l’Ibis des comptes gagne Envol et conserve son arrivée de pioche-défausse', () => {
  const carte = cardById('ibis-des-comptes');
  assert.equal(carte.envol, true);
  assert.equal(carte.cost, 3);
  assert.equal(carte.atk, 2);
  assert.equal(carte.def, 2);
  assert.deepEqual(carte.arrivee, { type: 'pioche-defausse', pioche: 1, defausse: 1 });
  assert.match(carte.text, /Envol/);
  assert.ok(pastillesPourCarte(carte).some((p) => p.label === 'Envol'));
  const duel = nouveau();
  installerMana(duel);
  const ibis = poserTenebres(duel, 'ibis-des-comptes');
  assert.equal(ibis.envol, true);
});


test('la Momie crée un Shabti à sa mort, pas à son arrivée', () => {
  const carte = cardById('momie-de-lin');
  assert.equal(carte.arrivee, undefined);
  assert.deepEqual(carte.destruction, { type: 'jetons', jeton: 'shabti', nombre: 1 });
  assert.match(carte.text, /meurt/);
  const duel = nouveau();
  installerMana(duel);
  const momie = poserTenebres(duel, 'momie-de-lin');
  assert.equal(duel.joueur.creatures.filter((c) => c.carteId === 'shabti').length, 0);
  rpgBlesserCreature(duel, 'joueur', momie.id, momie.pv);
  assert.ok(!duel.joueur.creatures.some((c) => c.id === momie.id));
  const shabtis = duel.joueur.creatures.filter((c) => c.carteId === 'shabti');
  assert.equal(shabtis.length, 1);
  for (const shabti of shabtis) {
    assert.equal(shabti.atk, 1);
    assert.equal(shabti.pv, 1);
    assert.equal(shabti.ready, false);
  }
});

test('les textes de défausse adverse restent concis sans préciser le choix', () => {
  assert.equal(cardById('nom-efface').text, 'L’adversaire défausse une carte.');
  assert.equal(cardById('celle-qui-pese').text, 'Quand Celle qui pèse arrive : l’adversaire défausse une carte.');
});

test('La Dévoreuse est une 4/4 pour 6 mana et conserve son exil à l’arrivée', () => {
  const carte = cardById('la-devoreuse');
  assert.equal(carte.atk, 4);
  assert.equal(carte.def, 4);
  assert.equal(carte.cost, 6);
  assert.deepEqual(carte.arrivee, { type: 'exil', cible: 'creature' });
});

test('Celui qui juge 3/5 détruit les créatures à 3 mana ou moins à l’arrivée', () => {
  const carte = cardById('celui-qui-juge');
  assert.equal(carte.atk, 3);
  assert.equal(carte.def, 5);
  assert.equal(carte.cost, 6);
  assert.equal(carte.tribut, 2);
  assert.ok(!carte.infiltration);
  assert.deepEqual(carte.arrivee, { type: 'destruction-coutmax', coutMax: 3, cible: 'toutes-autres' });
  assert.equal(arriveeCiblePortee(carte), null);
  for (const cote of ['joueur', 'sorcier']) {
    const duel = nouveau();
    installerMana(duel);
    const momie = poserTenebres(duel, 'momie-de-lin');
    const gardienne = poserTenebres(duel, 'gardienne-de-la-balance');
    const ennemi = poserTenebres(duel, 'momie-de-lin');
    duel.joueur.creatures = duel.joueur.creatures.filter((c) => c.id !== ennemi.id);
    duel.sorcier.creatures.push(ennemi);
    duel.tour = cote;
    duel[cote].mana.tenebres = 50;
    duel[cote].manaMax.tenebres = 50;
    duel[cote].manaSources = ['tenebres'];
    duel[cote].main.push(carte.id);
    const pv = [duel.joueur.pv, duel.sorcier.pv];
    const resultat = rpgJouerCreature(duel, cote, carte.id);
    assert.equal(resultat.ok, true, JSON.stringify(resultat));
    assert.equal(resultat.entite.pv, 5, 'la source est épargnée');
    assert.ok(!duel.joueur.creatures.some((c) => c.id === momie.id), 'la momie du joueur est détruite (3 mana)');
    assert.ok(!duel.joueur.creatures.some((c) => c.id === gardienne.id), 'la gardienne du joueur est détruite (2 mana)');
    assert.ok(!duel.sorcier.creatures.some((c) => c.id === ennemi.id), 'la momie ennemie est détruite (3 mana)');
    // La Gardienne de la balance, détruite par la vague, soigne son contrôleur
    // de 3 PV (son déclencheur de destruction) ; le sorcier adverse ne prend rien.
    assert.equal(duel.joueur.pv, pv[0] + 3, 'la Gardienne morte soigne le joueur de 3 PV');
    assert.equal(duel.sorcier.pv, pv[1], 'aucun dégât au sorcier adverse');
  }
});


test('La Dernière Pesée est une sorcellerie mythique Ténèbres à 8 mana', () => {
  const carte = cardById('la-derniere-pesee');
  assert.equal(carte.kind, 'magie');
  assert.equal(carte.cost, 8);
  assert.equal(carte.rarity, 'mythique');
  assert.equal(carte.element, 'tenebres');
  assert.ok(!carte.instant);
  assert.equal(cardCopyLimit(carte), 1);
  assert.equal(carte.text, 'Détruisez toutes les créatures.');
  assert.ok(pastillesPourCarte(carte).some((p) => p.label === 'Destruction totale'));
});

const lancerDernierePesee = (duel, cote = 'joueur') => {
  duel[cote].main.push('la-derniere-pesee');
  return rpgLancerMagie(duel, cote, 'la-derniere-pesee');
};

test('La Dernière Pesée détruit les deux camps sans dégâts ni exil et paie 8 mana', () => {
  for (const cote of ['joueur', 'sorcier']) {
    const duel = nouveau();
    installerMana(duel);
    const allie = poserTenebres(duel, 'chacal-du-seuil');
    const ennemi = poserTenebres(duel, 'ibis-des-comptes');
    duel.joueur.creatures = duel.joueur.creatures.filter((c) => c.id !== ennemi.id);
    duel.sorcier.creatures.push(ennemi);
    // Ni les PV élevés, ni la prévention des dégâts ne bloquent une destruction.
    Object.assign(allie, { pv: 100, pvMax: 100, def: 100, bouclier: 100, bouclierLumiere: true });
    const pv = [duel.joueur.pv, duel.sorcier.pv];
    duel.tour = cote;
    duel[cote].mana.tenebres = 8;
    duel[cote].manaSources = ['tenebres'];
    duel[cote].main = [];
    duel[cote === 'joueur' ? 'sorcier' : 'joueur'].main = [];
    assert.equal(lancerDernierePesee(duel, cote).ok, true);
    assert.equal(duel[cote].mana.tenebres, 0);
    assert.equal(duel.joueur.creatures.length, 0);
    assert.equal(duel.sorcier.creatures.length, 0);
    assert.ok(duel.joueur.cimetiere.includes(allie.carteId));
    assert.ok(duel.sorcier.cimetiere.includes(ennemi.carteId));
    assert.ok(duel[cote].cimetiere.includes('la-derniere-pesee'));
    assert.deepEqual([duel.joueur.pv, duel.sorcier.pv], pv);
  }
});

test('La Dernière Pesée libère tout le champ avant les déclenchements de mort', () => {
  const duel = nouveau();
  installerMana(duel);
  for (let i = 0; i < 5; i++) poserTenebres(duel, 'chacal-du-seuil');
  assert.equal(duel.joueur.creatures.length, 5);
  assert.equal(lancerDernierePesee(duel).ok, true);
  assert.equal(duel.joueur.creatures.length, 0, 'toutes les créatures sont détruites');
});

test('La Dernière Pesée tue les créatures tenaces et épargne les protections', () => {
  const duel = nouveau();
  installerMana(duel);
  const tenace = poserTenebres(duel, 'chacal-du-seuil');
  tenace.tenaciteDisponible = true;
  const protege = poserTenebres(duel, 'chacal-du-seuil');
  protege.protection = { contre: 'tenebres', toursRestants: 2 };
  assert.equal(lancerDernierePesee(duel).ok, true);
  // Tenacité ne refuse plus la destruction : la vague l'emporte, mais sa carte
  // est promise à un retour au prochain tour du joueur.
  assert.ok(!duel.joueur.creatures.includes(tenace));
  assert.ok(duel.joueur.cimetiere.includes('chacal-du-seuil'));
  assert.equal(duel.joueur.retoursProgrammes.filter((retour) => retour.tenacite).length, 1,
    'un seul retour promis pour la créature tenace');
  // La protection de couleur, elle, écarte toujours la vague.
  assert.ok(duel.joueur.creatures.includes(protege));
  assert.equal(protege.pv, 1);
});

test('La Dernière Pesée exige son tour et son mana, mais aucune cible', () => {
  const duel = nouveau();
  installerMana(duel);
  duel.joueur.mana.tenebres = 7;
  duel.joueur.main = ['la-derniere-pesee'];
  assert.equal(rpgLancerMagie(duel, 'joueur', 'la-derniere-pesee').raison, 'mana');
  assert.equal(duel.joueur.mana.tenebres, 7);
  duel.joueur.mana.tenebres = 8;
  duel.tour = 'sorcier';
  duel.fenetreReponse = true;
  assert.equal(rpgLancerMagie(duel, 'joueur', 'la-derniere-pesee').raison, 'timing');
  duel.tour = 'joueur';
  assert.equal(rpgLancerMagie(duel, 'joueur', 'la-derniere-pesee').ok, true, 'jouable sur champ vide');
});

test('l’IA préfère la destruction totale quand le champ adverse domine', () => {
  const duel = nouveau();
  installerMana(duel);
  duel.joueur.main = ['la-derniere-pesee'];
  assert.equal(choisirCarteIA(duel, 'joueur', { rng }), null, 'pas sur champ vide');
  const creature = poserTenebres(duel, 'chacal-du-seuil');
  assert.equal(choisirCarteIA(duel, 'joueur', { rng }), null, 'pas pour détruire seulement son camp');
  duel.joueur.creatures = [];
  duel.sorcier.creatures = [creature];
  assert.equal(choisirCarteIA(duel, 'joueur', { rng })?.carteId, 'la-derniere-pesee');
});

test('Offrande de lin : 2 mana et 1 PV pour +1/+0 et Tribut 1 jusqu’à la fin du tour', () => {
  const carte = cardById('offrande-de-lin');
  assert.equal(carte.prixPv, 1, 'le lin se paie d’une goutte de vie');
  assert.equal(carte.cost, 2);
  assert.equal(carte.text, 'Payez 1 PV : vos créatures gagnent +1/+0 et Tribut 1 jusqu’à la fin du tour.');
  assert.deepEqual(carte.effet, { type: 'buff', atk: 1, def: 0, tribut: 1, tours: 1 });
  const duel = nouveau();
  installerMana(duel);
  const chacal = poserTenebres(duel, 'chacal-du-seuil');
  duel.joueur.pv = 5;
  duel.joueur.mana.tenebres = 2;
  duel.joueur.main.push(carte.id);
  assert.equal(rpgPeutPayer(duel.joueur, carte), true);
  assert.equal(rpgLancerMagie(duel, 'joueur', carte.id).ok, true);
  assert.equal(duel.joueur.pv, 4, 'le Prix de 1 PV est payé');
  assert.equal(duel.joueur.mana.tenebres, 0);
  assert.equal(chacal.atk, 3);
  assert.equal(chacal.def, 1);
  assert.equal(chacal.tribut, 2, 'son Tribut 1 imprimé monte à 2 jusqu’à la fin du tour');
  rpgFinDeTour(duel);
  assert.equal(chacal.atk, 2, 'le lin se défait à la fin du tour');
  assert.equal(chacal.tribut, 1, 'le Tribut retombe à sa valeur imprimée');
});

test('le Maître des hiéroglyphes gagne Envol et Attaque ciblée sans perdre sa pioche', () => {
  const carte = cardById('maitre-des-hieroglyphes');
  assert.equal(carte.envol, true);
  assert.match(carte.text, /Envol/);
  assert.ok(pastillesPourCarte(carte).some((p) => p.label === 'Envol'));
  assert.equal(carte.coupRapide, true);
  assert.equal(carte.cost, 5);
  assert.equal(carte.atk, 3);
  assert.equal(carte.def, 5);
  assert.match(carte.text, /Attaque ciblée/);
  const duel = nouveau();
  installerMana(duel);
  const cible = poserTenebres(duel, 'momie-de-lin');
  duel.joueur.creatures = duel.joueur.creatures.filter((c) => c.id !== cible.id);
  duel.sorcier.creatures.push(cible);
  const main = duel.joueur.main.length;
  const maitre = poserTenebres(duel, carte.id);
  assert.equal(duel.joueur.main.length, main + 2);
  assert.equal(maitre.coupRapide, true);
  assert.equal(maitre.envol, true);
  maitre.ready = true;
  assert.equal(rpgAttaquerSorcier(duel, 'joueur', maitre.id, cible.id).ok, true);
  assert.equal(cible.pv, 1);
  assert.equal(maitre.pv, 5, 'aucune riposte');
  assert.equal(maitre.attaquee, true);
});


const equiperKhopesh = (duel, porteur) => {
  duel.joueur.main.push('khopesh-d-or');
  assert.equal(rpgJouerArme(duel, 'joueur', 'khopesh-d-or', porteur.id).ok, true);
};

test('Khopesh : bonus conservés, mort réelle puis retour à 1 DEF sans arme ni boucle', () => {
  const duel = nouveau();
  installerMana(duel);
  const porteur = poserTenebres(duel, 'momie-de-lin');
  equiperKhopesh(duel, porteur);
  assert.equal(porteur.atk, 4);
  assert.equal(porteur.pv, 5);
  assert.equal(porteur.tribut, 1);
  rpgBlesserCreature(duel, 'joueur', porteur.id, 10);
  const revenue = duel.joueur.creatures.find((c) => c.carteId === 'momie-de-lin');
  assert.ok(revenue);
  assert.notEqual(revenue.id, porteur.id);
  assert.equal(revenue.atk, 2);
  assert.equal(revenue.pv, 1);
  assert.equal(revenue.def, 1);
  assert.equal(revenue.pvMax, 1);
  assert.equal(revenue.ready, false);
  assert.ok(!revenue.arme);
  assert.equal(revenue.tribut, 0);
  assert.ok(duel.joueur.cimetiere.includes('khopesh-d-or'));
  assert.ok(!duel.joueur.cimetiere.includes('momie-de-lin'));
  assert.equal(duel.joueur.creatures.filter((c) => c.carteId === 'shabti').length, 1, 'effet de mort déclenché');
  rpgBlesserCreature(duel, 'joueur', revenue.id, 1);
  assert.ok(!duel.joueur.creatures.some((c) => c.carteId === 'momie-de-lin'));
});

test('Khopesh : les arrivées se rejouent, Rapidité est conservée sur une nouvelle présence', () => {
  for (const id of ['maitre-des-hieroglyphes', 'chacal-du-seuil']) {
    const duel = nouveau();
    installerMana(duel);
    const porteur = poserTenebres(duel, id);
    equiperKhopesh(duel, porteur);
    const main = duel.joueur.main.length;
    rpgBlesserCreature(duel, 'joueur', porteur.id, 10);
    const revenu = duel.joueur.creatures.find((c) => c.carteId === id);
    assert.equal(revenu.pv, 1);
    assert.equal(revenu.ready, id === 'chacal-du-seuil');
    assert.equal(duel.joueur.main.length, main + (id === 'maitre-des-hieroglyphes' ? 2 : 0));
  }
});

test('Khopesh : le porteur revient après combat ou destruction totale, jamais la mauvaise créature', () => {
  for (const mode of ['combat', 'destruction-totale']) {
    const duel = nouveau();
    installerMana(duel);
    const porteur = poserTenebres(duel, 'chacal-du-seuil');
    equiperKhopesh(duel, porteur);
    const ennemi = poserTenebres(duel, 'ureus-du-seuil');
    duel.joueur.creatures = duel.joueur.creatures.filter((c) => c.id !== ennemi.id);
    duel.sorcier.creatures.push(ennemi);
    if (mode === 'combat') {
      ennemi.atk = 3;
      assert.equal(rpgAttaquerCreature(duel, 'joueur', porteur.id, ennemi.id).ok, true);
    } else {
      poserTenebres(duel, 'ibis-des-comptes');
      assert.equal(lancerDernierePesee(duel).ok, true);
    }
    assert.equal(duel.joueur.creatures.length, 1);
    const revenu = duel.joueur.creatures[0];
    assert.equal(revenu.carteId, 'chacal-du-seuil');
    assert.equal(revenu.pv, 1);
    assert.equal(duel.sorcier.creatures.length, 0);
    assert.ok(duel.joueur.cimetiere.includes('khopesh-d-or'));
  }
});

test('Khopesh : un porteur tenace meurt, le Khopesh le relève et le retour de Tenacité se dissipe', () => {
  const duel = nouveau();
  installerMana(duel);
  const porteur = poserTenebres(duel, 'chacal-du-seuil');
  equiperKhopesh(duel, porteur);
  porteur.tenaciteDisponible = true;
  rpgBlesserCreature(duel, 'joueur', porteur.id, 10);
  // Tenacité ne refuse plus la mort : le porteur tombe et sa renaissance est
  // programmée ; mais le Khopesh relève aussitôt la carte, qui n'est donc plus
  // au cimetière — le retour promis se dissipe au prochain tour.
  assert.equal(duel.joueur.creatures.some((c) => c.id === porteur.id), false);
  assert.equal(duel.joueur.creatures[0].carteId, 'chacal-du-seuil');
  assert.notEqual(duel.joueur.creatures[0].id, porteur.id);
  assert.equal(duel.joueur.creatures[0].pv, 1);
  assert.deepEqual(duel.joueur.retoursProgrammes.map((retour) => retour.tenacite), [true]);
  rpgFinDeTour(duel);
  assert.deepEqual(duel.joueur.retoursProgrammes.map((retour) => retour.tenacite), [true],
    'le retour attend le tour du joueur');
  rpgFinDeTour(duel);
  assert.deepEqual(duel.joueur.retoursProgrammes, [],
    'la carte a déjà été relevée par le Khopesh : rien à reprendre au cimetière');
  assert.equal(duel.joueur.creatures.filter((c) => c.carteId === 'chacal-du-seuil').length, 1,
    'une seule présence, pas de doublon');
});

test('Khopesh : le sacrifice du porteur le réanime', () => {
  const duel = nouveau();
  installerMana(duel);
  const porteur = poserTenebres(duel, 'chacal-du-seuil');
  equiperKhopesh(duel, porteur);
  assert.equal(rpgSacrifierCreature(duel, 'joueur', porteur.id).ok, true);
  assert.equal(duel.joueur.creatures[0].carteId, 'chacal-du-seuil');
  assert.notEqual(duel.joueur.creatures[0].id, porteur.id);
  assert.equal(duel.joueur.creatures[0].pv, 1);
});

test('Khopesh : exiler le porteur ne le réanime pas', () => {
  const duel = nouveau();
  installerMana(duel);
  const porteur = poserTenebres(duel, 'chacal-du-seuil');
  equiperKhopesh(duel, porteur);
  duel.joueur.main.push('la-devoreuse');
  assert.equal(rpgJouerCreature(duel, 'joueur', 'la-devoreuse', porteur.id).ok, true);
  assert.ok(!duel.joueur.creatures.some((c) => c.carteId === porteur.carteId));
  assert.ok(duel.joueur.exil.includes(porteur.carteId));
  assert.ok(duel.joueur.cimetiere.includes('khopesh-d-or'));
});
