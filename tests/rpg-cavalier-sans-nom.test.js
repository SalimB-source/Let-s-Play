import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, openSync, readSync, closeSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  cardById, cardColors, cardFrameInfo, cardCopyLimit, cardHasMythicFrame,
  cardHasShinyFrame, RPG_DUEL_CARDS,
} from '../src/games/rpgCards.js';
import { cardArt, CARD_ART_LARGEUR, CARD_ART_HAUTEUR } from '../src/games/rpgCardArt.js';
import { COLLECTION_DEPART, carteReveleePar } from '../src/games/rpgCollection.js';
import { prixCarteDirecte } from '../src/games/rpgSoukDirect.js';
import { carteAuVivier } from '../src/games/rpgBoosters.js';
import { pastillesPourCarte, effetsDetailles } from '../src/games/effetIcons.js';
import { choisirCibleAutoIA } from '../src/games/rpgAI.js';
import {
  rpgNouveauDuel, rpgJouerCreature, rpgLancerAttaque, rpgResoudreArriveeCiblee,
  arriveeACibleLegale,
} from '../src/games/rpgDuel.js';

const ID = 'le-cavalier-sans-nom';
// Deux paliers de part et d'autre du seuil : la Dune (4) est renvoyable, le
// Galion (5) ne l'est pas. Aucune des deux n'a d'arrivée ciblée.
const SOUS_SEUIL = 'dune-marchante';
const SUR_SEUIL = 'galion-de-la-flotte';

/** Un duel aux réserves pleines, avec un paquet pour lire la pioche. */
function duel() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.5 });
  for (const camp of ['joueur', 'sorcier']) {
    d[camp].mana = { eau: 50, sable: 50, braise: 50, neige: 50, tenebres: 50 };
    d[camp].deck = ['chien-du-guet', 'chien-du-guet', 'chien-du-guet'];
  }
  d.tour = 'joueur';
  return d;
}

function poser(d, camp, id, cibleId = null) {
  d[camp].main.push(id);
  const resultat = rpgJouerCreature(d, camp, id, cibleId);
  assert.equal(resultat.ok, true, `${id} se joue`);
  return resultat.entite;
}

/** Largeur/hauteur d'un JPEG lues dans son en-tête SOF (même lecteur que le dépôt). */
function dimensionsJpeg(chemin) {
  const descripteur = openSync(chemin, 'r');
  try {
    const entete = Buffer.alloc(64 * 1024);
    const lus = readSync(descripteur, entete, 0, entete.length, 0);
    for (let i = 2; i + 9 < lus;) {
      if (entete[i] !== 0xff) { i += 1; continue; }
      const balise = entete[i + 1];
      const estSof = balise >= 0xc0 && balise <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(balise);
      if (estSof) return [entete.readUInt16BE(i + 7), entete.readUInt16BE(i + 5)];
      i += 2 + entete.readUInt16BE(i + 2);
    }
  } finally {
    closeSync(descripteur);
  }
  throw new Error(`${chemin} : en-tête SOF introuvable`);
}

test('Le cavalier sans nom est une mythique Eau + Ténèbres 5/5 pour 6, Envol et Tribut 2', () => {
  const c = cardById(ID);
  assert.ok(c, 'la carte existe au catalogue');
  assert.equal(c.name, 'Le cavalier sans nom');
  assert.equal(c.kind ?? 'creature', 'creature');
  assert.deepEqual([c.cost, c.atk, c.def], [6, 5, 5]);
  assert.equal(c.rarity, 'mythique');
  assert.deepEqual(cardColors(c), ['eau', 'tenebres']);
  assert.deepEqual(c.colorCost, { eau: 1, tenebres: 1 });
  assert.equal(c.envol, true);
  assert.equal(c.tribut, 2);
  assert.match(c.typeLine, /légendaire/u);
});

test('son Rebond est borné à coût 4 ou moins et rapporte une carte', () => {
  const c = cardById(ID);
  assert.deepEqual(c.arrivee, { type: 'retour-main', cible: 'creature', coutMax: 4, pioche: 1 });
  assert.equal(cardById(SOUS_SEUIL).cost, 4, 'la borne basse du test est bien 4');
  assert.equal(cardById(SUR_SEUIL).cost, 5, 'la borne haute du test est bien 5');
  assert.match(c.text, /de coût 4 ou moins/u);
  assert.match(c.text, /puis piochez une carte/u);
});

test('son cadre suit la diagonale Eau + Ténèbres, sans reflet même mythique', () => {
  const c = cardById(ID);
  assert.equal(cardFrameInfo(c).key, 'hybride-eau-tenebres');
  assert.equal(cardHasMythicFrame(c), true);
  assert.equal(cardHasShinyFrame(c), false, 'une hybride ne brille pas');
  assert.equal(cardCopyLimit(c), 1, 'une mythique ne s’aligne qu’à un exemplaire');
});

test('sa peinture est livrée au format du cadre (768 × 960), sous le plafond', () => {
  const c = cardById(ID);
  assert.equal(cardArt(c), '/cards/le-cavalier-sans-nom.jpg');
  const chemin = fileURLToPath(new URL('../public/cards/le-cavalier-sans-nom.jpg', import.meta.url));
  assert.ok(existsSync(chemin), 'le-cavalier-sans-nom.jpg est livré');
  assert.deepEqual(dimensionsJpeg(chemin), [CARD_ART_LARGEUR, CARD_ART_HAUTEUR]);
  assert.ok(readFileSync(chemin).length < 260 * 1024, 'sous les 260 Ko');
});

test('elle se collectionne : hors dotation, révélée à la Nécropole, vendue à l’étal', () => {
  assert.equal(COLLECTION_DEPART.includes(ID), false, 'une mythique n’est pas donnée d’entrée');
  assert.equal(carteReveleePar(ID)?.etageId, 'necropole-4');
  assert.equal(prixCarteDirecte(ID), 300, 'mythique à l’unité');
  assert.equal(carteAuVivier(ID), true, 'ouvrable en booster');
  assert.equal(RPG_DUEL_CARDS.filter((c) => c.id === ID).length, 1, 'un seul exemplaire au catalogue');
});

test('son aperçu tient en pastilles : Envol, Tribut 2, Rebond — aucun mot perdu', () => {
  const c = cardById(ID);
  const labels = pastillesPourCarte(c).map((p) => (p.valeur != null ? `${p.label} ${p.valeur}` : p.label));
  assert.deepEqual(labels, ['Envol', 'Tribut 2', 'Rebond']);
  const mots = (t) => new Set(String(t).toLowerCase().match(/[a-z0-9à-ÿ]+/gu) ?? []);
  const { pastilles, texte } = effetsDetailles(c);
  const affiches = mots([
    texte,
    ...pastilles.map((p) => (p.valeur != null ? `${p.label} ${p.valeur}` : p.label)),
    ...pastilles.map((p) => p.description),
  ].filter(Boolean).join(' '));
  for (const mot of mots(c.text)) {
    assert.ok(affiches.has(mot), `« ${mot} » reste lisible dans l’aperçu`);
  }
  assert.match(texte, /coût 4 ou moins/u, 'le plafond reste écrit sur la fiche, pas seulement dans le moteur');
});

test('Rebond + pioche : une créature de coût 4 repart en main, et une carte arrive', () => {
  const d = duel();
  const ennemi = poser(d, 'sorcier', SOUS_SEUIL);
  const paquet = d.joueur.deck.length;
  const main = d.joueur.main.length;
  const cavalier = poser(d, 'joueur', ID, ennemi.id);
  assert.ok(cavalier, 'le cavalier entre en jeu');
  assert.equal(d.sorcier.creatures.includes(ennemi), false, 'la cible quitte la table');
  assert.equal(d.sorcier.main.includes(SOUS_SEUIL), true, 'elle revient dans la main de son propriétaire');
  assert.equal(d.sorcier.cimetiere.includes(SOUS_SEUIL), false, 'ce n’est pas une destruction');
  assert.equal(d.joueur.creatures.includes(cavalier), true, 'le cavalier ne se renvoie pas lui-même');
  assert.equal(d.joueur.deck.length, paquet - 1, 'une carte piochée');
  assert.equal(d.joueur.main.length, main + 1, 'la carte piochée est en main');
});

test('le seuil refuse une créature de coût 5 : la pose est annulée, rien n’est payé', () => {
  const d = duel();
  const tropCher = poser(d, 'sorcier', SUR_SEUIL);
  const manaAvant = { ...d.joueur.mana };
  const paquet = d.joueur.deck.length;
  d.joueur.main.push(ID);
  const pose = rpgJouerCreature(d, 'joueur', ID, tropCher.id);
  assert.equal(pose.ok, false, 'la cible hors seuil est refusée');
  assert.equal(pose.raison, 'cible');
  assert.equal(d.joueur.main.includes(ID), true, 'le cavalier reste en main');
  assert.deepEqual(d.joueur.mana, manaAvant, 'aucun mana dépensé');
  assert.equal(d.joueur.deck.length, paquet, 'aucune pioche : l’effet n’a pas eu lieu');
  assert.equal(d.sorcier.creatures.includes(tropCher), true, 'le Galion tient la table');
});

test('désignation différée : seule la créature sous le seuil est cliquable', () => {
  const d = duel();
  const legal = poser(d, 'sorcier', SOUS_SEUIL);
  const tropCher = poser(d, 'sorcier', SUR_SEUIL);
  d.joueur.main.push(ID);
  const pose = rpgJouerCreature(d, 'joueur', ID, null, { cibleDifferee: true });
  assert.equal(pose.ok, true);
  assert.ok(d.arriveeEnAttente, 'l’arrivée attend sa cible');
  const refuse = rpgResoudreArriveeCiblee(d, 'joueur', tropCher.id);
  assert.equal(refuse.ok, false, 'le coût 5 n’est pas une cible légale');
  assert.equal(refuse.raison, 'cible');
  assert.ok(d.arriveeEnAttente, 'l’attente reste ouverte après un clic refusé');
  const accepte = rpgResoudreArriveeCiblee(d, 'joueur', legal.id);
  assert.equal(accepte.ok, true);
  assert.equal(d.sorcier.main.includes(SOUS_SEUIL), true, 'la cible choisie est renvoyée');
  assert.equal(d.sorcier.creatures.includes(tropCher), true, 'le Galion n’a pas bougé');
});

test('sans cible légale, la pioche part quand même : le Rebond ne rend pas la carte muette', () => {
  const d = duel();
  poser(d, 'sorcier', SUR_SEUIL);
  const carte = cardById(ID);
  assert.equal(arriveeACibleLegale(d, 'joueur', carte), false, 'le coût 5 n’ouvre pas de désignation');
  const paquet = d.joueur.deck.length;
  d.joueur.main.push(ID);
  const pose = rpgJouerCreature(d, 'joueur', ID, null, { cibleDifferee: true });
  assert.equal(pose.ok, true);
  assert.equal(d.arriveeEnAttente ?? null, null, 'rien à désigner : l’arrivée se résout d’elle-même');
  assert.equal(d.joueur.deck.length, paquet - 1, 'la carte est piochée sans renvoi');
  assert.equal(d.sorcier.creatures.length, 1, 'le Galion reste en jeu');
});

test('l’IA respecte le plafond : elle renvoie la créature de coût 4, pas celle de coût 5', () => {
  const d = duel();
  d.tour = 'sorcier';
  const petit = poser(d, 'joueur', SOUS_SEUIL);
  poser(d, 'joueur', SUR_SEUIL);
  const choix = choisirCibleAutoIA(d, 'sorcier', cardById(ID));
  assert.equal(choix, petit.id, 'l’IA ne désigne que la cible sous le seuil');
});

test('Tribut 2 : toucher le sorcier lui retire 2 PV et en rend 2 au contrôleur', () => {
  const d = duel();
  const cavalier = poser(d, 'joueur', ID);
  assert.equal(cavalier.envol, true, 'l’Envol est porté par l’entité');
  cavalier.ready = true;
  cavalier.attaquee = false;
  const avant = { joueur: d.joueur.pv, sorcier: d.sorcier.pv };
  const attaque = rpgLancerAttaque(d, 'joueur', [cavalier.id], { [cavalier.id]: [] });
  assert.equal(attaque.ok, true);
  assert.equal(d.sorcier.pv, avant.sorcier - 5 - 2, '5 d’attaque + 2 de Tribut');
  assert.equal(d.joueur.pv, avant.joueur + 2, 'le contrôleur gagne les 2 PV du Tribut');
  assert.ok(d.log.some((ligne) => /Tribut :/u.test(ligne)), 'le journal nomme le Tribut');
});
