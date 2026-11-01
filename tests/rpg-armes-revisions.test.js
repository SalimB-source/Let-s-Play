import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgNouveauDuel, rpgJouerCreature, rpgJouerArme, rpgLancerAttaque, rpgLancerMagie, rpgReglerHasard, rpgAttaquerCreature, rpgFinDeTour } from '../src/games/rpgDuel.js';
import { armeById } from '../src/games/rpgCards.js';

const mana = (d, side) => { d[side].mana = { sable: 20, eau: 20, neige: 20, braise: 20, tenebres: 20 }; };
function poser(d, side, id) { mana(d, side); d[side].main.push(id); const r = rpgJouerCreature(d, side, id); assert.equal(r.ok, true); return r.entite; }
function equiper(d, side, unit, id) { mana(d, side); d[side].main.push(id); assert.equal(rpgJouerArme(d, side, id, unit.id).ok, true); }
function scene(arme, cote = 'joueur') {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => .9 });
  const a = poser(d, 'joueur', 'dune-marchante');
  const b = poser(d, 'sorcier', 'dune-marchante');
  equiper(d, cote, cote === 'joueur' ? a : b, arme);
  a.ready = true; b.ready = true;
  return { d, a, b };
}
for (const [arme, seuil] of [['lance-de-givre', .15], ['javelot-du-beffroi', .25]]) {
  test(`${arme} gèle avant les dégâts à son seuil exact en combat bloqué`, () => {
    for (const [jet, gele] of [[seuil - .001, true], [seuil, false]]) {
      const { d, a, b } = scene(arme);
      // Exercer le blocage classique indépendamment de l'Attaque ciblée de l'arme.
      a.coupRapide = false;
      rpgReglerHasard(d, () => jet);
      const pv = a.pv;
      const r = rpgLancerAttaque(d, 'joueur', [a.id], { [a.id]: [b.id] });
      assert.equal(r.ok, true);
      assert.equal((b.gelToursRestants ?? 0) > 0, gele);
      assert.equal(a.pv, pv - (gele ? 0 : b.atk));
    }
  });
  test(`${arme} déclenche aussi en défense et dans un duel de créatures`, () => {
    const { d, a, b } = scene(arme, 'sorcier');
    rpgReglerHasard(d, () => 0);
    const pvB = b.pv;
    assert.equal(rpgLancerAttaque(d, 'joueur', [a.id], { [a.id]: [b.id] }).ok, true);
    assert.ok(a.gelToursRestants > 0);
    assert.equal(b.pv, pvB);
    const autre = scene(arme); rpgReglerHasard(autre.d, () => 0);
    assert.equal(rpgAttaquerCreature(autre.d, 'joueur', autre.a.id, autre.b.id).ok, true);
    assert.ok(autre.b.gelToursRestants > 0);
  });
  test(`${arme} gèle la cible d'une Attaque ciblée réussie`, () => {
    const { d, a, b } = scene(arme);
    const jets = [.9, 0]; rpgReglerHasard(d, () => jets.shift() ?? .9);
    assert.equal(rpgLancerAttaque(d, 'joueur', [a.id], {}, null, null, { [a.id]: b.id }).ok, true);
    assert.ok(b.gelToursRestants > 0);
  });
}
test('un bouclier adverse absorbe le gel de l’arme', () => {
  const { d, a, b } = scene('lance-de-givre'); b.bouclier = 1;
  rpgReglerHasard(d, () => 0);
  assert.equal(rpgAttaquerCreature(d, 'joueur', a.id, b.id).ok, true);
  assert.equal(b.bouclier, 0); assert.equal(b.gelToursRestants ?? 0, 0);
});
test('le Bâton ne crée aucun jeton si les cinq places sont occupées', () => {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [] });
  const units = Array.from({ length: 5 }, () => poser(d, 'joueur', 'chien-du-guet'));
  equiper(d, 'joueur', units[0], 'baton-des-citernes');
  assert.equal(d.joueur.creatures.length, 5);
  assert.equal(armeById('baton-des-citernes').activation, undefined);
  rpgFinDeTour(d);
  assert.equal(d.joueur.creatures.length, 5);
});
test('une Attaque ciblée ratée ne déclenche pas le gel', () => {
  const { d, a, b } = scene('lance-de-givre'); rpgReglerHasard(d, () => 0);
  assert.equal(rpgLancerAttaque(d, 'joueur', [a.id], {}, null, null, { [a.id]: b.id }).ok, true);
  assert.equal(b.gelToursRestants ?? 0, 0);
});
test('l’Armure accorde une vraie Contre-attaque et son remplacement la retire', () => {
  const { d, a, b } = scene('armure-de-cendres', 'sorcier');
  const avant = d.joueur.pv;
  d.joueur.main.push('trait-de-braise'); mana(d, 'joueur');
  // La Braise n'est plus bloquée et déclenche la riposte sur son lanceur.
  assert.equal(b.contreAttaque, true);
  assert.equal(rpgLancerMagie(d, 'joueur', 'trait-de-braise', b.id).ok, true);
  assert.equal(d.joueur.pv, avant - b.atk);
  equiper(d, 'sorcier', b, 'takouba-des-pistes');
  assert.equal(b.contreAttaque, false);
});
