import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { cardById, RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { effetsEpuisesPourEntite } from '../src/games/effetIcons.js';
import { procElementDistance, RPG_PROC_ELEMENT_CHANCE } from '../src/games/rpgCartesIconeType.js';
import { retoursAuDeckInvocation } from '../src/games/rpgInvocation.js';
import {
  rpgActiverCapacite,
  rpgFinDeTour,
  rpgJouerCreature,
  rpgLancerAttaque,
  rpgNouveauDuel,
  rpgPeutActiverCapacite,
} from '../src/games/rpgDuel.js';

/** Les créatures À distance qui frappent de leur emblème — pas d'un arc —
 *  signent leur élément à l'impact : une chance sur quatre. Braise brûle,
 *  Neige gèle, Sable emporte un butin, Ténèbres transfèrent la vie. */

function quotaLibre(duel, cote) {
  if (duel?.moba) duel.moba.creaturesJouees[cote] = false;
  else if (duel?.[cote]) duel[cote].invocationNormaleJouee = false;
}

function duel({ rng = () => 0.1, joueurDeck = [], sorcierDeck = [] } = {}) {
  const d = rpgNouveauDuel({ joueurDeck, sorcierDeck, rng });
  for (const cote of ['joueur', 'sorcier']) {
    d[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((element) => [element, 10]));
  }
  return d;
}

function poser(d, cote, id) {
  const tour = d.tour;
  d.tour = cote;                 // la pose est légale au tour de son camp
  quotaLibre(d, cote);           // une invocation normale par tour : le test en pose plusieurs
  d[cote].main.push(id);
  // Le prix d'une invocation de coût 5+ est un retour de cartes de la main au
  // deck : le test avance des Gerboises comme monnaie.
  const retourIds = [];
  for (let i = 0; i < retoursAuDeckInvocation(cardById(id)); i++) {
    d[cote].main.push('gerboise-des-ruines');
    retourIds.push('gerboise-des-ruines');
  }
  const resultat = rpgJouerCreature(d, cote, id, null, retourIds.length ? { retourIds } : {});
  d.tour = tour;
  assert.equal(resultat.ok, true, `${id} entre en jeu : ${resultat.raison}`);
  resultat.entite.ready = true;
  resultat.entite.malInvocation = false;
  return resultat.entite;
}

test('l’emblème signe l’effet : Braise brûle, Neige gèle, Sable butine, Ténèbres transfèrent', () => {
  assert.equal(RPG_PROC_ELEMENT_CHANCE, 0.25);
  assert.deepEqual({
    braise: procElementDistance(cardById('tengu-du-mont-ardent')),
    neige: procElementDistance(cardById('volva-soigneuse')),
    sable: procElementDistance(cardById('tercio-de-cuivre')),
    tenebres: procElementDistance(cardById('scribe-des-feuillets')),
  }, { braise: 'brulure', neige: 'gel', sable: 'butin', tenebres: 'transfert' });
  // L'Eau n'a pas d'effet propre, l'arc reste un tir, la mêlée ne signe rien.
  assert.equal(procElementDistance(cardById('guetteuse-des-marees')), null);
  assert.equal(procElementDistance(cardById('ashigaru-des-braises')), null, 'elle bande un arc');
  assert.equal(procElementDistance(cardById('eirik-du-premier-serment')), null, 'il frappe au corps à corps');
  assert.equal(procElementDistance(cardById('gerboise-des-ruines')), null);
});

test('Braise — le Tengu brûle sa cible : 1 PV au début de son tour', () => {
  const d = duel({ rng: () => 0.1 });
  // Le Tengu a Envol : sa cible aussi (le Griffon des dunes gelées, 4/5).
  const griffon = poser(d, 'sorcier', 'griffon-des-dunes-gelees');
  griffon.atk = 0; // pas de riposte : le Harakiri du Tengu ne viendrait pas s'y mêler
  const tengu = poser(d, 'joueur', 'tengu-du-mont-ardent');
  assert.equal(rpgLancerAttaque(d, 'joueur', [tengu.id], { [tengu.id]: [griffon.id] }).ok, true);
  assert.equal(griffon.pv, 3, 'le tir inflige ses 2 dégâts');
  assert.equal(griffon.brulure, true, 'la braise prend');
  assert.ok(d.log.some((ligne) => ligne.startsWith('Brûlure :')), 'le journal annonce la brûlure');
  rpgFinDeTour(d); // le tour du sorcier s'ouvre : sa créature brûle
  assert.equal(griffon.pv, 2, '1 PV perdu au début du tour du contrôleur');
  rpgFinDeTour(d); // tour du joueur : la victime ne brûle pas chez l'autre camp
  assert.equal(griffon.pv, 2);
  assert.equal(griffon.brulure, true, 'la flamme ne s’éteint pas d’elle-même');
});

test('Braise — la brûlure boit les soins, les autres créatures se soignent', () => {
  const d = duel({ rng: () => 0.1 });
  const brulee = poser(d, 'joueur', 'griffon-des-dunes-gelees');
  const temoin = poser(d, 'joueur', 'dune-marchante');
  const tengu = poser(d, 'sorcier', 'tengu-du-mont-ardent');
  const ashigaru = poser(d, 'sorcier', 'ashigaru-des-braises');
  brulee.atk = 0; // aucune riposte : les deux victimes ne font que recevoir
  temoin.atk = 0;
  // La Résonance samouraï du Tengu donne +1/+1 à l'Ashigaru : il frappe à 2.
  assert.equal(ashigaru.atk, 2);
  d.tour = 'sorcier';
  assert.equal(rpgLancerAttaque(d, 'sorcier', [tengu.id, ashigaru.id],
    { [tengu.id]: [brulee.id], [ashigaru.id]: [temoin.id] }).ok, true);
  assert.equal(brulee.brulure, true);
  assert.equal(temoin.brulure, false, 'l’arc ne signe aucun élément');
  assert.deepEqual([brulee.pv, temoin.pv], [3, 2]);
  rpgFinDeTour(d); // le joueur commence : sa créature brûlée perd 1 PV
  assert.equal(brulee.pv, 2);
  const eirik = poser(d, 'joueur', 'eirik-du-premier-serment');
  const joueurPv = d.joueur.pv;
  assert.equal(rpgActiverCapacite(d, 'joueur', eirik.id).ok, true);
  assert.equal(temoin.pv, 4, 'la créature intacte profite du soin');
  assert.equal(brulee.pv, 2, 'la créature brûlée ne remonte pas');
  assert.equal(d.joueur.pv, joueurPv + 2, 'le sorcier, lui, est soigné');
});

test('Neige — la Volva gèle sa cible une fois sur quatre', () => {
  const d = duel({ rng: () => 0.1 });
  const dune = poser(d, 'sorcier', 'dune-marchante');
  const volva = poser(d, 'joueur', 'volva-soigneuse');
  assert.equal(rpgLancerAttaque(d, 'joueur', [volva.id], { [volva.id]: [dune.id] }).ok, true);
  assert.ok((dune.gelToursRestants ?? 0) > 0, 'la cible est gelée');
  assert.ok(d.log.some((ligne) => /gel/iu.test(ligne)), 'le journal annonce le gel');

  const rate = duel({ rng: () => 0.9 });
  const dune2 = poser(rate, 'sorcier', 'dune-marchante');
  const volva2 = poser(rate, 'joueur', 'volva-soigneuse');
  assert.equal(rpgLancerAttaque(rate, 'joueur', [volva2.id], { [volva2.id]: [dune2.id] }).ok, true);
  assert.equal(dune2.gelToursRestants ?? 0, 0, 'le jet manqué ne gèle pas');
});

test('Sable — le Tercio emporte un butin quand son tir touche le sorcier', () => {
  const d = duel({ rng: () => 0.1, joueurDeck: Array(8).fill('gerboise-des-ruines') });
  const tercio = poser(d, 'joueur', 'tercio-de-cuivre');
  const deckAvant = d.joueur.deck.length;
  const mainAvant = d.joueur.main.length;
  const pvAvant = d.sorcier.pv;
  assert.equal(rpgLancerAttaque(d, 'joueur', [tercio.id], {}).ok, true);
  assert.equal(d.sorcier.pv, pvAvant - 1);
  assert.equal(d.joueur.deck.length, deckAvant - 1, 'le butin pioche une carte');
  assert.equal(d.joueur.main.length, mainAvant + 1);
  assert.equal(d.defausseEnAttente?.restant, 1, 'puis une défausse est exigée');
  assert.ok(d.log.some((ligne) => ligne.startsWith('Butin :')));

  const rate = duel({ rng: () => 0.9, joueurDeck: Array(8).fill('gerboise-des-ruines') });
  const tercio2 = poser(rate, 'joueur', 'tercio-de-cuivre');
  const deckRate = rate.joueur.deck.length;
  assert.equal(rpgLancerAttaque(rate, 'joueur', [tercio2.id], {}).ok, true);
  assert.equal(rate.joueur.deck.length, deckRate, 'le jet manqué ne pioche rien');
});

test('Ténèbres — le Scribe transfère 1 PV du sorcier adverse au vôtre', () => {
  const d = duel({ rng: () => 0.1 });
  const scribe = poser(d, 'joueur', 'scribe-des-feuillets');
  const sorcierAvant = d.sorcier.pv;
  const joueurAvant = d.joueur.pv;
  assert.equal(rpgLancerAttaque(d, 'joueur', [scribe.id], {}).ok, true);
  assert.equal(d.sorcier.pv, sorcierAvant - 3, '2 dégâts du tir, 1 PV transféré');
  assert.equal(d.joueur.pv, joueurAvant + 1, 'un seul transfert par contact, pas un par point');
  assert.ok(d.log.some((ligne) => ligne.startsWith('Transfert :')));

  const rate = duel({ rng: () => 0.9 });
  const scribe2 = poser(rate, 'joueur', 'scribe-des-feuillets');
  const sorcierRate = rate.sorcier.pv;
  const joueurRate = rate.joueur.pv;
  assert.equal(rpgLancerAttaque(rate, 'joueur', [scribe2.id], {}).ok, true);
  assert.equal(rate.sorcier.pv, sorcierRate - 2, 'le jet manqué laisse les dégâts nus');
  assert.equal(rate.joueur.pv, joueurRate);
});

test('le seuil du jet est bien 25 %', () => {
  for (const [valeur, attendu] of [[0.24, true], [0.26, false]]) {
    const d = duel({ rng: () => valeur });
    const griffon = poser(d, 'sorcier', 'griffon-des-dunes-gelees');
    griffon.atk = 0;
    const tengu = poser(d, 'joueur', 'tengu-du-mont-ardent');
    assert.equal(rpgLancerAttaque(d, 'joueur', [tengu.id], { [tengu.id]: [griffon.id] }).ok, true);
    assert.equal(griffon.brulure, attendu, `un jet de ${valeur} ${attendu ? 'brûle' : 'ne brûle pas'}`);
  }
});

test('un effet activé dépensé grise la créature et ferme le bouton', () => {
  const d = duel({ rng: () => 0.9 });
  const eirik = poser(d, 'joueur', 'eirik-du-premier-serment');
  const carte = cardById('eirik-du-premier-serment');
  assert.equal(rpgPeutActiverCapacite(d, 'joueur', eirik.id), true);
  assert.deepEqual(effetsEpuisesPourEntite(carte, eirik), []);
  assert.equal(rpgActiverCapacite(d, 'joueur', eirik.id).ok, true);
  assert.equal(eirik.activationUtiliseeCeTour, true);
  assert.equal(rpgPeutActiverCapacite(d, 'joueur', eirik.id), false, 'plus rien à proposer ce tour');
  assert.equal(rpgActiverCapacite(d, 'joueur', eirik.id).raison, 'deja-activee');
  assert.deepEqual(effetsEpuisesPourEntite(carte, eirik), ['activation'], 'la fiche le dit au survol');
  rpgFinDeTour(d);
  rpgFinDeTour(d); // le tour du joueur revient : l'effet se recharge
  assert.equal(eirik.activationUtiliseeCeTour, false);
  assert.equal(rpgPeutActiverCapacite(d, 'joueur', eirik.id), true);
});

test('la table grise la peinture et ouvre le rognage le temps du menu d’effet', () => {
  const jsx = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
  // Le bouton pend sous la carte : le cadre qui rogne doit s'ouvrir pour lui.
  assert.match(css, /\.rpg-card\.is-effet-menu\s*\{[^}]*overflow-clip-margin:\s*46px/u);
  assert.match(jsx, /boutonEffetVisible \? 'is-effet-menu' : ''/u);
  // L'éclair a sa propre boîte : il ne peut plus être rogné par la ligne de texte.
  assert.match(jsx, /<span className="rpg-card__effet-btn-eclair" aria-hidden="true">⚡<\/span>/u);
  assert.match(css, /\.rpg-card__effet-btn-eclair\s*\{[^}]*line-height:\s*1/u);
  // Effet activé dépensé : la créature grise, ses chiffres restent lisibles.
  assert.match(jsx, /activationEpuisee \? 'is-activation-epuisee' : ''/u);
  assert.match(css, /\.rpg-card\.is-activation-epuisee \.rpg-card__img\s*\{[^}]*grayscale\(/u);
  assert.match(jsx, /effet activé déjà utilisé ce tour/u);
});
