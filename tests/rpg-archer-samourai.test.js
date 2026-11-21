/** L'archer samouraï des cendres — le tireur commune du Serment du Soleil rouge.
 *
 *  Un 2/1 pour 2, type Samouraï, qui porte « À distance » : il frappe de loin
 *  (le sorcier adverse, faute de cible désignée), sans recevoir de coup en
 *  retour — sauf d'un autre tireur — et il rate une fois sur quatre. Comme
 *  toute créature du set, il porte Harakiri 1.
 *
 *  Règle de conception rappelée ici : « À distance » et Contre-attaque ne se
 *  cumulent jamais sur une même créature ; un tireur ne riposte pas deux fois.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { RPG_SOLEIL_ROUGE_CARDS, RPG_SOLEIL_ROUGE_SET_ID } from '../src/games/rpgSoleilRouge.js';
import { RPG_DECKS_ARCHETYPES, RPG_DUEL_CARDS, cardById, cardColors, cardCost, cardArtId, rpgValiderDeck } from '../src/games/rpgCards.js';
import { COLLECTION_DEPART } from '../src/games/rpgCollection.js';
import { CARD_ART_HAUTEUR, CARD_ART_LARGEUR, cardArt } from '../src/games/rpgCardArt.js';
import { RPG_DISTANCE_ECHEC_CHANCE, rpgNouveauDuel, rpgJouerCreature, rpgReglerHasard, rpgLancerAttaque } from '../src/games/rpgDuel.js';

const ID = 'archer-samourai-des-cendres';

function dimensionsJpeg(jpg) {
  for (let i = 2; i < jpg.length;) {
    const marqueur = jpg[i + 1];
    if (marqueur >= 0xc0 && marqueur <= 0xc3) {
      return [jpg.readUInt16BE(i + 7), jpg.readUInt16BE(i + 5)];
    }
    i += 2 + jpg.readUInt16BE(i + 2);
  }
  return null;
}

function partie() {
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.9 });
  duel.moba = false;
  duel.lignes = false;
  return duel;
}

/** Pose la carte, prête à attaquer, et rend son entité. */
function poserArcher(duel) {
  duel.joueur.invocationNormaleJouee = false;
  duel.joueur.main.push(ID);
  const res = rpgJouerCreature(duel, 'joueur', ID);
  assert.equal(res.ok, true, `l’archer entre en jeu : ${res.raison ?? ''}`);
  res.entite.ready = true;
  res.entite.malInvocation = false;
  return res.entite;
}

test('la fiche : un 2/1 pour 2, Samouraï et « À distance », avec Harakiri 1', () => {
  const carte = cardById(ID);
  assert.ok(carte, 'la carte est au catalogue');
  assert.equal(carte.name, 'Archer samouraï des cendres');
  assert.equal(cardCost(carte), 2);
  assert.deepEqual([carte.atk, carte.def], [2, 1]);
  assert.equal(carte.kind, 'creature');
  assert.equal(carte.distance, true, 'il tire de loin');
  assert.equal(carte.rarity, 'commune');
  assert.equal(carte.typeLine, 'Créature — Humain · Samouraï');
  assert.equal(carte.honneur, 1, 'Harakiri 1');
  assert.match(carte.text, /^À distance — /);
  assert.match(carte.text, /Harakiri — /, 'la règle du Harakiri est rappelée sur la face');
  assert.ok(carte.flavor?.length > 0, 'la carte a une phrase d’ambiance');
});

test('la carte appartient au Serment du Soleil rouge et se collectionne', () => {
  const carte = cardById(ID);
  assert.equal(carte.set, RPG_SOLEIL_ROUGE_SET_ID);
  assert.equal(carte.element, 'braise');
  assert.deepEqual(cardColors(ID), ['braise']);
  assert.ok(RPG_SOLEIL_ROUGE_CARDS.some((candidate) => candidate.id === ID), 'présente dans le set');
  assert.ok(RPG_DUEL_CARDS.some((candidate) => candidate.id === ID), 'présente au catalogue du duel');
  assert.ok(COLLECTION_DEPART.includes(ID), 'offerte dans la dotation de départ, comme les autres communes');
  assert.equal(cardArtId(carte), ID, 'sa peinture porte son identifiant');
});

test('il entre dans le deck préconstruit du Soleil rouge, deux exemplaires au plus', () => {
  const starter = RPG_DECKS_ARCHETYPES.find((deck) => deck.id === RPG_SOLEIL_ROUGE_SET_ID);
  // Commune : deux copies maximum dans un deck de 30 cartes sans terrain.
  const variante = [...starter.cardIds.slice(0, 28), ID, ID];
  assert.deepEqual(rpgValiderDeck(variante), { ok: true, terrains: 0 });
  const trois = [...starter.cardIds.slice(0, 27), ID, ID, ID];
  assert.equal(rpgValiderDeck(trois).ok, false, 'la limite de copies reste celle des communes');
});

test('« À distance » et Contre-attaque ne se cumulent pas', () => {
  assert.equal(cardById(ID).contreAttaque, undefined,
    'un tireur ne porte jamais Contre-attaque : sa riposte est celle de l’échange de tirs');
});

test('sa peinture est livrée en 768 × 960 et reste légère', () => {
  const chemin = new URL(`../public/cards/${ID}.jpg`, import.meta.url);
  const jpg = readFileSync(chemin);
  assert.deepEqual(dimensionsJpeg(jpg), [CARD_ART_LARGEUR, CARD_ART_HAUTEUR]);
  assert.ok(statSync(chemin).size <= 260 * 1024, 'sous le plafond d’une peinture livrée');
  assert.match(cardArt(ID), new RegExp(`cards/${ID}\\.jpg\\?v=archer-samourai-cendres-v2$`),
    'la révision de cache est déclarée');
});

test('il frappe le sorcier sans contact, mais rate un tir sur quatre', () => {
  const duel = partie();
  rpgReglerHasard(duel, () => 0.99);
  const archer = poserArcher(duel);
  assert.deepEqual([archer.atk, archer.pv, archer.distance], [2, 1, true], 'l’entité reprend la fiche');

  const avant = duel.sorcier.pv;
  assert.equal(rpgLancerAttaque(duel, 'joueur', [archer.id]).ok, true);
  assert.equal(duel.sorcier.pv, avant - 2, 'deux blessures à distance');
  assert.equal(duel.joueur.creatures.find((e) => e.id === archer.id).pv, 1,
    'aucun coup en retour : le sorcier ne le touche pas');
});

test('son tir porte la chance de raté de tous les tireurs', () => {
  assert.equal(RPG_DISTANCE_ECHEC_CHANCE, 0.25, 'un tir sur quatre manque sa cible');
  assert.equal(cardById(ID).distance, true, 'c’est « À distance » qui déclenche ce quart de raté');
});
