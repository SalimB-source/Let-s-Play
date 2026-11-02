import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { RPG_ELEMENTS, cardById, cardColors, cardColorCost } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgLancerMagie } from '../src/games/rpgDuel.js';
import { RPG_REVELATIONS_PAR_ETAGE } from '../src/games/rpgCollection.js';
import { rpgFoudreSoundFor } from '../src/games/rpgFoudreAudio.js';
const ID = 'tempete-de-foudre-et-de-givre';
function scene() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.5 });
  for (const cote of ['joueur', 'sorcier']) d[cote].mana = Object.fromEntries(RPG_ELEMENTS.map(c => [c, 30]));
  return d;
}
function poser(d, cote) {
  d[cote].main.push('dune-marchante');
  const e = rpgJouerCreature(d, cote, 'dune-marchante').entite;
  e.pv = e.pvMax = e.def = 10;
  return e;
}
function lancer(d, cote = 'joueur') { d.tour = cote; d[cote].main.push(ID); return rpgLancerMagie(d, cote, ID); }

test('La tempête est une sorcellerie Neige/Braise disponible au Fjord et illustrée', () => {
  const carte = cardById(ID);
  assert.deepEqual(cardColors(carte), ['neige', 'braise']);
  assert.equal(cardColorCost(carte).neige, 1); assert.equal(cardColorCost(carte).braise, 1);
  assert.equal(carte.cost, 5); assert.equal(carte.instant, undefined);
  assert.deepEqual(carte.effet, { type: 'degats', amount: 3, cible: 'toutes-autres' });
  assert.ok(RPG_REVELATIONS_PAR_ETAGE['fjord-3'].includes(ID));
  assert.ok(existsSync(new URL(`../public/cards/${ID}.jpg`, import.meta.url)));
  assert.equal(rpgFoudreSoundFor(ID, 'spell'), 'foudre_marteau');
});
test('Trois dégâts simultanés aux créatures des deux camps, sans toucher les sorciers', () => {
  for (const cote of ['joueur', 'sorcier']) {
    const d = scene(); const amie = poser(d, 'joueur'); const ennemie = poser(d, 'sorcier');
    assert.equal(lancer(d, cote).ok, true);
    assert.equal(amie.pv, 7); assert.equal(ennemie.pv, 7);
    assert.equal(d.joueur.pv, 25); assert.equal(d.sorcier.pv, 25);
    const fx = d.combatAnimations.find(a => a.type === 'tempete-foudre');
    assert.deepEqual(new Set(fx.cibles), new Set([amie.id, ennemie.id]));
    assert.deepEqual(JSON.parse(JSON.stringify(d)).combatAnimations.find(a => a.id === fx.id), fx);
  }
});
test('Les boucliers adverses bloquent une fois, mais les alliés ne sont pas protégés de leur propre sort', () => {
  for (const couleur of ['neige', 'braise']) {
    const d = scene(); const allie = poser(d, 'joueur'); const adverse = poser(d, 'sorcier');
    allie.protection = { contre: couleur }; adverse.protection = { contre: couleur };
    assert.equal(lancer(d).ok, true);
    assert.equal(allie.pv, 7); assert.ok(allie.protection);
    assert.equal(adverse.pv, 10); assert.equal(adverse.protection, null);
    const fx = d.combatAnimations.find(a => a.type === 'tempete-foudre');
    assert.ok(fx.cibles.includes(adverse.id), 'un éclair atteint aussi le bouclier');
  }
});
test('Une créature à 3 PV ou moins est détruite et la table vide reste valide', () => {
  const d = scene(); const e = poser(d, 'joueur'); e.pv = e.def = 3;
  assert.equal(lancer(d).ok, true); assert.equal(d.joueur.creatures.includes(e), false);
  assert.ok(d.joueur.cimetiere.includes('dune-marchante'));
  const vide = scene(); assert.equal(lancer(vide).ok, true);
  assert.deepEqual(vide.combatAnimations.find(a => a.type === 'tempete-foudre').cibles, []);
});

test('Le signal visuel et les dégâts survivent à une action PvP sérialisée', async () => {
  const { rpgPvpAppliquer } = await import('../src/games/rpgPvp.js');
  const d = scene(); const amie = poser(d, 'joueur'); const ennemie = poser(d, 'sorcier');
  d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true }; d.tour = 'joueur'; d.joueur.main.push(ID);
  const res = rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: ID });
  assert.equal(res.ok, true, res.raison);
  assert.equal(amie.pv, 7); assert.equal(ennemie.pv, 7);
  assert.deepEqual(new Set(JSON.parse(JSON.stringify(d)).combatAnimations.find(a => a.type === 'tempete-foudre').cibles), new Set([amie.id, ennemie.id]));
});

test('Le sort ne frappe pas les sites et le bouclier général adverse intercepte la vague', () => {
  const d = scene();
  const cible = poser(d, 'sorcier'); cible.bouclier = 1;
  const site = { id: 'site-test', carteId: 'source-de-bimini', name: 'Source de Bimini', pv: 10, def: 10, pvMax: 10 };
  d.sorcier.creatures.push(site);
  assert.equal(lancer(d).ok, true);
  assert.equal(cible.pv, 10); assert.equal(cible.bouclier, 0);
  assert.equal(site.pv, 10);
  const fx = d.combatAnimations.find(a => a.type === 'tempete-foudre');
  assert.ok(fx.cibles.includes(cible.id)); assert.ok(!fx.cibles.includes(site.id));
});
