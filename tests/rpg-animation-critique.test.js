import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rpgNouveauDuel, rpgReglerHasard, rpgLancerAttaque } from '../src/games/rpgDuel.js';
import { rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgPvpAppliquer, rpgPvpVue } from '../src/games/rpgPvp.js';

function duel() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => .5 });
  d.tour = 'joueur'; d.mulliganFait = { joueur: true, sorcier: true };
  const make = (id) => ({ id, carteId: 'ashigaru-des-braises', name: id, atk: 3, def: 1, pv: 1, pvMax: 1,
    ready: true, malInvocation: false, attaquee: false, coupCritique: { chance: 1, fois: 2 } });
  const attaquant = make('attaquant'), defenseur = make('defenseur');
  d.joueur.creatures.push(attaquant); d.sorcier.creatures.push(defenseur);
  rpgReglerHasard(d, () => .1);
  return { d, attaquant, defenseur };
}
const signaux = (d) => (d.combatAnimations ?? []).filter(e => e.type === 'coup-critique');

for (const mode of ['classique', 'pvp', 'collectif']) test(`${mode} : chaque critique des deux combattants est transmis même après leur mort`, () => {
  const { d, attaquant, defenseur } = duel();
  let result;
  if (mode === 'collectif') result = rpgLancerAttaque(d, 'joueur', [attaquant.id], { [attaquant.id]: [defenseur.id] });
  else if (mode === 'pvp') {
    d.pvp = true;
    assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'attaquer', declarer: true, attaquants: [attaquant.id], cibleId: defenseur.id }).ok);
    assert.deepEqual(signaux(d), [], 'aucune animation à la déclaration');
    result = rpgPvpAppliquer(d, 'sorcier', { type: 'bloquer', blocages: {} });
  } else {
    assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', attaquant.id, defenseur.id).ok);
    assert.deepEqual(signaux(d), []);
    result = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  }
  assert.ok(result.ok, JSON.stringify(result));
  assert.deepEqual(signaux(d).map(({ entiteId, fois }) => [entiteId, fois]).sort(), [['attaquant', 2], ['defenseur', 2]]);
  assert.equal(d.joueur.creatures.length, 0); assert.equal(d.sorcier.creatures.length, 0);
  if (mode === 'pvp') for (const cote of ['joueur', 'sorcier']) assert.deepEqual(signaux(rpgPvpVue(d, cote)), signaux(d));
});

test('une frappe ciblée manquée ne produit pas de signal critique', () => {
  const { d, attaquant, defenseur } = duel(); attaquant.coupRapide = true;
  rpgReglerHasard(d, () => 0);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', attaquant.id, defenseur.id).ok);
  const result = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(result.ok); assert.equal(result.resume.coupsRapides[0].rate, true);
  assert.deepEqual(signaux(d), []);
});

test('les deux préférences de mouvement réduit suppriment les calques animés', () => {
  const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
  assert.match(css, /\.rpg-battle\.is-reduced \.rpg-critique-fx i\s*\{\s*display:\s*none/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.rpg-critique-fx i\s*\{\s*display:\s*none/);
  assert.match(css, /\.rpg-battle\.is-reduced \.rpg-card__critique\s*\{\s*animation:\s*none/);
});
