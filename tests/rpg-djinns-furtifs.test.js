import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { cardById } from '../src/games/rpgCards.js';
import { pastillesPourCarte } from '../src/games/effetIcons.js';
import { carteReveleePar, COLLECTION_DEPART } from '../src/games/rpgCollection.js';
import { vivierRayon } from '../src/games/rpgBoosters.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgFinDeTour, rpgLancerAttaque, rpgPeutBloquerAttaquant } from '../src/games/rpgDuel.js';

const cartes = [
  ['djinn-des-braises-voilees', 2, 2, 1, 'souk-1'],
  ['djinn-de-la-flamme-mourante', 3, 2, 2, 'souk-2'],
  ['djinn-du-dernier-brasier', 4, 4, 3, 'sables-1'],
  ['djinn-de-la-premiere-etincelle', 1, 2, 1, 'souk-1'],
  ['djinn-de-la-fleche-ardente', 3, 3, 1, 'souk-2'],
  ['djinn-des-ailes-de-cendre', 4, 3, 2, 'sables-1'],
];
const duelNeuf = () => {
  const duel = rpgNouveauDuel({ joueurDeck: Array(20).fill('chien-du-guet'), sorcierDeck: Array(20).fill('chien-du-guet'), rng: () => 0.9 });
  duel.joueur.mana = { braise: 30, sable: 30, neige: 30, eau: 30, tenebres: 30 };
  duel.sorcier.mana = { braise: 30, sable: 30, neige: 30, eau: 30, tenebres: 30 };
  return duel;
};
const poser = (duel, cote, id) => {
  duel[cote].main.push(id);
  const res = rpgJouerCreature(duel, cote, id);
  assert.equal(res.ok, true, `${id} : ${res.raison ?? ''}`);
  return res.entite;
};

test('les six Djinns Braise ont leurs illustrations, pastilles et accès au Souk', () => {
  for (const [id, cost, atk, def, etage] of cartes) {
    const carte = cardById(id);
    assert.deepEqual([carte.kind, carte.element, carte.cost, carte.atk, carte.def, carte.rarity], ['creature', 'braise', cost, atk, def, 'rare']);
    assert.match(carte.typeLine, /Djinn/);
    assert.equal(carte.furtif, true); assert.equal(carte.ephemere, true); assert.equal(carte.rapidite, true);
    assert.ok(pastillesPourCarte(carte).some(p => p.label === 'Furtivité'));
    assert.match(carte.text, /Furtivité.*[Dd]étruit à la fin du tour/);
    assert.ok(existsSync(new URL(`../public/cards/${id}.jpg`, import.meta.url)));
    assert.equal(carteReveleePar(id)?.etageId, etage);
    assert.equal(COLLECTION_DEPART.includes(id), false);
    assert.ok(vivierRayon('souk').includes(id));
  }
});

test('Furtif : chaque Djinn peut attaquer immédiatement et est détruit à la fin du tour des deux camps', () => {
  for (const [id] of cartes) for (const cote of ['joueur', 'sorcier']) {
    const duel = duelNeuf(); duel.tour = cote;
    const djinn = poser(duel, cote, id);
    assert.equal(djinn.ready, true, id);
    assert.equal(djinn.detruireFinDuTour, true, id);
    rpgFinDeTour(duel);
    assert.equal(duel[cote].creatures.includes(djinn), false, id);
    assert.ok(duel[cote].cimetiere.includes(id), id);
  }
});

test('le Djinn voilé est imblocable et celui de la flamme mourante fait piocher', () => {
  const duel = duelNeuf();
  const voile = poser(duel, 'joueur', 'djinn-des-braises-voilees');
  const chien = poser(duel, 'sorcier', 'chien-du-guet');
  assert.equal(rpgPeutBloquerAttaquant(chien, voile), false);
  const avant = duel.joueur.main.length;
  poser(duel, 'joueur', 'djinn-de-la-flamme-mourante');
  assert.equal(duel.joueur.main.length, avant + 1);
});

test('le dernier brasier a Overkill et perce avec ses dégâts excédentaires', () => {
  const duel = duelNeuf(); const djinn = poser(duel, 'joueur', 'djinn-du-dernier-brasier');
  const bloqueur = poser(duel, 'sorcier', 'chien-du-guet');
  const pv = duel.sorcier.pv;
  assert.equal(rpgLancerAttaque(duel, 'joueur', [djinn.id], { [djinn.id]: [bloqueur.id] }).ok, true);
  assert.equal(duel.sorcier.pv, pv - 2);
});


test('le Djinn de la flèche doit choisir une cible et celui des ailes vole', () => {
  const duel = duelNeuf();
  const tireur = poser(duel, 'joueur', 'djinn-de-la-fleche-ardente');
  const ailé = poser(duel, 'joueur', 'djinn-des-ailes-de-cendre');
  const chien = poser(duel, 'sorcier', 'chien-du-guet');
  assert.equal(tireur.coupRapide, true);
  assert.equal(rpgLancerAttaque(duel, 'joueur', [tireur.id], {}).raison, 'cible-obligatoire');
  assert.equal(ailé.envol, true);
  assert.equal(rpgPeutBloquerAttaquant(chien, ailé), false);
  assert.equal(rpgLancerAttaque(duel, 'joueur', [tireur.id], {}, null, null, { [tireur.id]: chien.id }).ok, true);
});
