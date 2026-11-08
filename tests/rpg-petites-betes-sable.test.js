import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { cardArt } from '../src/games/rpgCardArt.js';
import { RPG_CREATURE_CARDS, RPG_DUEL_CARDS, RPG_ELEMENTS, cardById } from '../src/games/rpgCards.js';
import { carteAuVivier, carteFavoriseeRayon } from '../src/games/rpgBoosters.js';
import {
  rpgBlesserCreature, rpgJouerCreature, rpgLancerAttaque,
  rpgNouveauDuel, rpgResoudreDestructionCiblee,
} from '../src/games/rpgDuel.js';

const BETES = [
  ['gerboise-des-ruines', 2, 1, 'commune'],
  ['scarabee-des-sceaux', 1, 2, 'inhabituelle'],
  ['scorpion-du-seuil', 2, 1, 'inhabituelle'],
];

function duel() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.9 });
  for (const cote of ['joueur', 'sorcier']) {
    d[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((element) => [element, 10]));
  }
  return d;
}

function poser(d, cote, id) {
  d[cote].main.push(id);
  const resultat = rpgJouerCreature(d, cote, id);
  assert.equal(resultat.ok, true, `${id} entre en jeu : ${resultat.raison}`);
  return resultat.entite;
}

test('les trois petites bêtes Sable coûtent deux, ont chacune une peinture et rejoignent le Souk', () => {
  for (const [id, atk, def, rarity] of BETES) {
    const carte = cardById(id);
    assert.ok(carte, `${id} existe`);
    assert.deepEqual([carte.element, carte.cost, carte.atk, carte.def, carte.rarity],
      ['sable', 2, atk, def, rarity]);
    assert.equal(carte.art, id, 'une peinture dédiée à chaque créature');
    assert.ok(existsSync(new URL(`../public/cards/${id}.jpg`, import.meta.url)));
    assert.match(cardArt(id), new RegExp(`cards/${id}\\.jpg\\?v=sable-petites-betes-v1$`));
    assert.ok(RPG_CREATURE_CARDS.some((candidate) => candidate.id === id));
    assert.ok(RPG_DUEL_CARDS.some((candidate) => candidate.id === id && candidate.kind === 'creature'));
    assert.equal(carteAuVivier(id), true);
    assert.equal(carteFavoriseeRayon('set-sable', carte), true);
  }
});

test('la Gerboise peut attaquer dès son arrivée', () => {
  const d = duel();
  const gerboise = poser(d, 'joueur', 'gerboise-des-ruines');
  assert.equal(gerboise.ready, true);
  const pv = d.sorcier.pv;
  assert.equal(rpgLancerAttaque(d, 'joueur', [gerboise.id], {}).ok, true);
  assert.equal(d.sorcier.pv, pv - 2);
});

test('le Scarabée fait piocher une seule carte à son contrôleur en mourant', () => {
  const d = duel();
  d.joueur.deck.push('chien-du-guet');
  const scarabee = poser(d, 'joueur', 'scarabee-des-sceaux');
  const avant = d.joueur.main.length;
  rpgBlesserCreature(d, 'joueur', scarabee.id, 2, 'braise');
  assert.ok(d.joueur.cimetiere.includes('scarabee-des-sceaux'));
  assert.equal(d.joueur.main.length, avant + 1);
  assert.ok(d.joueur.main.includes('chien-du-guet'));
});

test('le Scorpion blessé à mort attend le choix d’une créature adverse, sans blesser le sorcier', () => {
  const d = duel();
  const cible = poser(d, 'sorcier', 'chien-du-guet');
  const scorpion = poser(d, 'joueur', 'scorpion-du-seuil');
  const pvSorcier = d.sorcier.pv;
  rpgBlesserCreature(d, 'joueur', scorpion.id, 1, 'eau');
  assert.equal(d.destructionsEnAttente?.length, 1);
  assert.equal(rpgResoudreDestructionCiblee(d, 'joueur', cible.id).ok, true);
  assert.equal(cible.pv, 1);
  assert.equal(d.sorcier.pv, pvSorcier);
  assert.equal(d.destructionsEnAttente.length, 0);
});
