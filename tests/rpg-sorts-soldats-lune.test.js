import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { RPG_ELEMENTS, cardById, cardColors, cardColorCost } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgJouerArme, rpgLancerMagie, rpgLancerAttaque, rpgReglerHasard, rpgSortACibleValide } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
const ids = ['voile-de-la-lune-noire', 'ressac-de-la-lune-noire', 'sabre-du-croissant-noir', 'lance-de-la-lune-givree'];
function duel() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.5 });
  for (const cote of ['joueur', 'sorcier']) d[cote].mana = Object.fromEntries(RPG_ELEMENTS.map(c => [c, 20]));
  return d;
}
function poser(d, cote, id) { d[cote].main.push(id); return rpgJouerCreature(d, cote, id).entite; }

test('Les sorts et armes de la Lune sont bicolores, dans le catalogue et illustrés', () => {
  for (const id of ids) {
    const c = cardById(id);
    assert.equal(c.set, 'soldats-de-la-lune');
    assert.equal(cardColors(c).length, 2);
    assert.equal(cardColorCost(c).tenebres, 1);
    assert.ok(existsSync(new URL(`../public/cards/${id}.jpg`, import.meta.url)));
  }
});
test('Le voile protège une alliée et le ressac épargne les Vampires des deux camps', () => {
  const d = duel(); const amie = poser(d, 'joueur', 'chien-du-guet');
  poser(d, 'sorcier', 'dune-marchante');
  const vampireAllie = poser(d, 'joueur', 'danseuse-des-ombres-de-dune');
  const vampireAdverse = poser(d, 'sorcier', 'sentinelle-des-sables');
  d.joueur.main.push(ids[0], ids[1]);
  assert.ok(rpgLancerMagie(d, 'joueur', ids[0], amie.id).ok);
  assert.equal(amie.bouclier, 1);
  assert.equal(cardById(ids[1]).cost, 5);
  assert.equal(cardById(ids[1]).instant, undefined);
  assert.ok(rpgLancerMagie(d, 'joueur', ids[1]).ok);
  assert.ok(d.joueur.main.includes('chien-du-guet'));
  assert.ok(d.sorcier.main.includes('dune-marchante'));
  assert.ok(d.joueur.creatures.includes(vampireAllie));
  assert.ok(d.sorcier.creatures.includes(vampireAdverse));
});
test('Les deux armes donnent les caractéristiques imprimées', () => {
  for (const [id, atk, def, capacite] of [[ids[2], 4, 2, 'infiltration'], [ids[3], 3, 3, 'coupRapide']]) {
    const d = duel(); const chien = poser(d, 'joueur', 'chien-du-guet'); d.joueur.main.push(id);
    assert.ok(rpgJouerArme(d, 'joueur', id, chien.id).ok);
    assert.deepEqual([chien.atk, chien.def, chien[capacite]], [atk, def, true]);
  }
});
test('Le ressac est une sorcellerie, injouable pendant la réponse PvP', () => {
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true }; d.tour = 'sorcier';
  const adverse = poser(d, 'sorcier', 'dune-marchante'); adverse.ready = true;
  d.joueur.main.push(ids[1]);
  assert.ok(rpgPvpAppliquer(d, 'sorcier', { type: 'attaquer', declarer: true, attaquants: [adverse.id] }).ok);
  assert.equal(rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: ids[1] }).ok, false);
  assert.ok(d.joueur.main.includes(ids[1]));
});
test('Le ressac peut être lancé sans cible, même sur une table vide', () => {
  const d = duel(); d.joueur.main.push(ids[1]);
  assert.equal(rpgSortACibleValide(d, 'joueur', cardById(ids[1])), true);
  assert.ok(rpgLancerMagie(d, 'joueur', ids[1]).ok);
});
test('Le sabre ne perd son unique endurance qu’après une attaque', () => {
  const d = duel(); const chien = poser(d, 'joueur', 'dune-marchante');
  const attaquant = poser(d, 'sorcier', 'chien-du-guet'); attaquant.ready = true;
  d.joueur.main.push(ids[2]); assert.ok(rpgJouerArme(d, 'joueur', ids[2], chien.id).ok);
  assert.equal(chien.arme.durabilite, 1);
  assert.ok(rpgLancerAttaque(d, 'sorcier', [attaquant.id], { [attaquant.id]: [chien.id] }).ok);
  assert.equal(chien.arme.durabilite, 1, 'un blocage ne consomme pas l’attaque');
  chien.ready = true; chien.attaquee = false;
  assert.ok(rpgLancerAttaque(d, 'joueur', [chien.id], {}).ok);
  assert.equal(chien.arme, null);
  assert.ok(d.joueur.cimetiere.includes(ids[2]));
});
test('La lance réussit son attaque ciblée même avec le jet habituellement raté', () => {
  const d = duel(); const chien = poser(d, 'joueur', 'chien-du-guet');
  const adverse = poser(d, 'sorcier', 'dune-marchante');
  d.joueur.main.push(ids[3]); assert.ok(rpgJouerArme(d, 'joueur', ids[3], chien.id).ok);
  chien.ready = true; rpgReglerHasard(d, () => 0);
  const res = rpgLancerAttaque(d, 'joueur', [chien.id], {}, null, null, { [chien.id]: adverse.id });
  assert.ok(res.ok);
  assert.equal(res.resume.coupsRapides[0].rate, undefined);
  assert.equal(res.resume.coupsRapides[0].degats, 6);
  assert.equal(res.resume.coupsRapides[0].critique, true);
  assert.ok(d.sorcier.cimetiere.includes('dune-marchante'));
});

test('La lance donne un coup critique à 25 % et le retire quand elle est remplacée', () => {
  const d = duel(); const chien = poser(d, 'joueur', 'chien-du-guet');
  d.joueur.main.push(ids[3], ids[2]);
  assert.ok(rpgJouerArme(d, 'joueur', ids[3], chien.id).ok);
  assert.deepEqual(chien.coupCritique, { chance: 0.25, fois: 2 });
  assert.ok(rpgJouerArme(d, 'joueur', ids[2], chien.id).ok);
  assert.equal(chien.coupCritique, null);
});
test('La lance additionne son critique à celui du porteur sans réduire son multiplicateur', () => {
  const d = duel(); const porteur = poser(d, 'joueur', 'kagutsuchi-flamme-originelle');
  d.joueur.main.push(ids[3]);
  assert.ok(rpgJouerArme(d, 'joueur', ids[3], porteur.id).ok);
  assert.deepEqual(porteur.coupCritique, { chance: 0.5, fois: 4 });
  d.joueur.main.push(ids[2]);
  assert.ok(rpgJouerArme(d, 'joueur', ids[2], porteur.id).ok);
  assert.deepEqual(porteur.coupCritique, { chance: 0.25, fois: 4 });
});
