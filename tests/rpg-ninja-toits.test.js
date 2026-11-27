/** Le ninja samouraï des toits — le tireur à invocation spéciale du set.
 *
 *  2/1 pour 2, « À distance », Braise, Harakiri 1. Il s'invoque **sans
 *  consommer l'invocation normale** (Invocation spéciale) dès que l'adversaire
 *  tient la table — `conditionEmbuscade: 'adversaire-a-une-creature'`, registre
 *  `MOBA_EMBUSCADES_IMPRIMEES`. Sans créature en face, il s'invoque
 *  normalement, pendant son propre tour.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { RPG_SOLEIL_ROUGE_CARDS, RPG_SOLEIL_ROUGE_SET_ID } from '../src/games/rpgSoleilRouge.js';
import { RPG_DUEL_CARDS, RPG_ELEMENTS, cardById, cardColors, cardCost, cardArtId } from '../src/games/rpgCards.js';
import { COLLECTION_DEPART } from '../src/games/rpgCollection.js';
import { CARD_ART_HAUTEUR, CARD_ART_LARGEUR, cardArt } from '../src/games/rpgCardArt.js';
import { pastillesPourCarte } from '../src/games/effetIcons.js';
import { rpgCarteEmbuscade } from '../src/games/rpgEmbuscade.js';
import { rpgNouveauDuel, rpgJouerCreature } from '../src/games/rpgDuel.js';

const ID = 'ninja-samourai-des-toits';

function dimensionsJpeg(jpg) {
  for (let i = 2; i < jpg.length;) {
    const marqueur = jpg[i + 1];
    if (marqueur >= 0xc0 && marqueur <= 0xc3) return [jpg.readUInt16BE(i + 7), jpg.readUInt16BE(i + 5)];
    i += 2 + jpg.readUInt16BE(i + 2);
  }
  return null;
}

/** Un duel prêt à poser : mana plein, phase principale, tour du joueur. */
function partie({ creatureAdverse = false, invocationJouee = false } = {}) {
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.9 });
  for (const cote of ['joueur', 'sorcier']) {
    duel[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((element) => [element, 40]));
  }
  duel.moba = false;
  duel.lignes = false;
  duel.tour = 'joueur';
  duel.phase = 'principale';
  duel.joueur.invocationNormaleJouee = invocationJouee;
  if (creatureAdverse) {
    duel.tour = 'sorcier';
    duel.sorcier.main.push('viking-des-neiges');
    assert.equal(rpgJouerCreature(duel, 'sorcier', 'viking-des-neiges').ok, true);
    duel.tour = 'joueur';
  }
  duel.joueur.main.push(ID);
  return duel;
}

test('la fiche : un 2/1 pour 2, à distance, Braise, Harakiri 1', () => {
  const carte = cardById(ID);
  assert.equal(carte.name, 'Ninja samouraï des toits');
  assert.equal(cardCost(carte), 2);
  assert.deepEqual([carte.atk, carte.def], [2, 1]);
  assert.equal(carte.distance, true);
  assert.equal(carte.honneur, 1);
  assert.equal(carte.typeLine, 'Créature — Humain · Ninja · Samouraï');
  assert.equal(carte.rarity, 'inhabituelle');
  assert.equal(carte.reactionTourAdverse, true, 'Invocation spéciale');
  assert.equal(carte.conditionEmbuscade, 'adversaire-a-une-creature');
  assert.ok(rpgCarteEmbuscade(carte), 'la carte est au registre des Embuscades');
  assert.match(carte.text, /^Invocation spéciale — /);
  assert.match(carte.text, /À distance — /);
  assert.match(carte.text, /Harakiri — /);
});

test('la carte appartient au Serment du Soleil rouge, en Braise seule', () => {
  const carte = cardById(ID);
  assert.equal(carte.set, RPG_SOLEIL_ROUGE_SET_ID);
  assert.deepEqual(cardColors(ID), ['braise']);
  assert.ok(RPG_SOLEIL_ROUGE_CARDS.some((candidate) => candidate.id === ID));
  assert.ok(RPG_DUEL_CARDS.some((candidate) => candidate.id === ID));
  assert.ok(COLLECTION_DEPART.includes(ID), 'inhabituelle : offerte dans la dotation');
  assert.equal(cardArtId(carte), ID);
});

test('ses pastilles : Invocation spéciale et Harakiri', () => {
  assert.deepEqual(pastillesPourCarte(cardById(ID)).map((pastille) => pastille.cle),
    ['reactionTourAdverse', 'honneur']);
});

test('avec une créature en face, il entre sans consommer l’invocation normale', () => {
  const duel = partie({ creatureAdverse: true, invocationJouee: true });
  const res = rpgJouerCreature(duel, 'joueur', ID);
  assert.equal(res.ok, true, res.raison);
  assert.deepEqual([res.entite.atk, res.entite.pv, res.entite.distance], [2, 1, true]);
});

test('sans créature en face, il entre comme invocation normale', () => {
  // Le quota revenu d’une invocation normale par tour s’applique à cette entrée :
  // une pose déjà faite ce tour-ci la bloque, alors que l’Embuscade (une
  // créature en face) reste hors quota.
  const utilisee = partie({ creatureAdverse: false, invocationJouee: true });
  assert.equal(rpgJouerCreature(utilisee, 'joueur', ID).raison, 'creature-limite');
  const libre = partie({ creatureAdverse: false, invocationJouee: false });
  assert.equal(rpgJouerCreature(libre, 'joueur', ID).ok, true, 'sinon, invocation normale');
});

test('sa peinture est livrée en 768 × 960 et reste légère', () => {
  const chemin = new URL(`../public/cards/${ID}.jpg`, import.meta.url);
  const jpg = readFileSync(chemin);
  assert.deepEqual(dimensionsJpeg(jpg), [CARD_ART_LARGEUR, CARD_ART_HAUTEUR]);
  assert.ok(statSync(chemin).size <= 260 * 1024);
  assert.match(cardArt(ID), new RegExp(`cards/${ID}\\.jpg\\?v=ninja-sur-les-toits-sans-cadre-v4$`));
});
