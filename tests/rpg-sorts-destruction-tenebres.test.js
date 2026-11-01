import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgJouerArme, rpgLancerMagie, rpgSortACibleValide, rpgReglerHasard } from '../src/games/rpgDuel.js';
import { choisirCibleAutoIA } from '../src/games/rpgAI.js';

function scene() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => .99 });
  d.joueur.mana = { sable: 20, eau: 20, neige: 20, braise: 20, tenebres: 20 };
  d.sorcier.mana = { sable: 20, eau: 20, neige: 20, braise: 20, tenebres: 20 };
  return d;
}
function poser(d, cote, id) {
  d[cote].main.push(id); const res = rpgJouerCreature(d, cote, id);
  assert.equal(res.ok, true, id); return res.entite;
}
function preparer(d, id) { d.joueur.main.push(id); return cardById(id); }
const faible = 'effacement-des-faibles';
const fort = 'le-jugement-des-colosses';

test('deux Sorcelleries Ténèbres aux coûts et seuils demandés', () => {
  for (const [id, cost, champ, valeur] of [[faible, 3, 'coutMax', 3], [fort, 5, 'coutMin', 4]]) {
    const c = cardById(id); assert.equal(c.element, 'tenebres'); assert.equal(c.cost, cost);
    assert.equal(c.effet[champ], valeur); assert.equal(c.instant, undefined);
  }
});
for (const [id, creature, autorise] of [
  [faible, 'chien-du-guet', true], [faible, 'kenshi-de-la-forge', true],
  [faible, 'dune-marchante', false],
  [fort, 'chien-du-guet', false], [fort, 'dune-marchante', true],
]) {
  test(`${id} vérifie le coût de ${creature} avant paiement`, () => {
    const d = scene(); const victime = poser(d, 'sorcier', creature); const c = preparer(d, id);
    const manaAvant = { ...d.joueur.mana }; const cibleAvant = rpgSortACibleValide(d, 'joueur', c);
    assert.equal(cibleAvant, autorise);
    const res = rpgLancerMagie(d, 'joueur', id, victime.id);
    assert.equal(res.ok, autorise);
    assert.equal(d.sorcier.creatures.some((e) => e.id === victime.id), !autorise);
    if (autorise) assert.ok(d.sorcier.cimetiere.includes(creature));
    else { assert.deepEqual(d.joueur.mana, manaAvant); assert.ok(d.joueur.main.includes(id)); }
  });
}
test('le seuil tient compte du coût augmenté par le Grappin', () => {
  const d = scene(); const victime = poser(d, 'sorcier', 'kenshi-de-la-forge');
  d.sorcier.main.push('grappin-d-abordage'); assert.equal(rpgJouerArme(d, 'sorcier', 'grappin-d-abordage', victime.id).ok, true);
  const c = preparer(d, faible); assert.equal(rpgSortACibleValide(d, 'joueur', c), false);
  preparer(d, fort); assert.equal(rpgLancerMagie(d, 'joueur', fort, victime.id).ok, true);
  assert.ok(!d.sorcier.creatures.some(e => e.id === victime.id));
});
test('on peut aussi détruire une créature alliée', () => {
  const d = scene(); const victime = poser(d, 'joueur', 'chien-du-guet'); preparer(d, faible);
  assert.equal(rpgLancerMagie(d, 'joueur', faible, victime.id).ok, true);
  assert.ok(d.joueur.cimetiere.includes(victime.carteId));
});
test('un bouclier adverse consomme le sort mais protège sa créature', () => {
  const d = scene(); const victime = poser(d, 'sorcier', 'chien-du-guet'); victime.bouclier = 1; preparer(d, faible);
  assert.equal(rpgLancerMagie(d, 'joueur', faible, victime.id).bouclierBloque, true);
  assert.equal(victime.bouclier, 0); assert.ok(d.sorcier.creatures.includes(victime));
});
test('une cible protégée ou esquivant le sort reste en jeu', () => {
  const d = scene(); const victime = poser(d, 'sorcier', 'chien-du-guet'); preparer(d, faible);
  victime.protection = { contre: 'tenebres', toursRestants: Infinity };
  assert.equal(rpgSortACibleValide(d, 'joueur', cardById(faible)), true);
  assert.equal(rpgLancerMagie(d, 'joueur', faible, victime.id).bouclierBloque, true);
  assert.equal(victime.protection, null);
  preparer(d, faible);
  victime.esquive = true; victime.esquiveChance = .25; rpgReglerHasard(d, () => 0);
  assert.equal(rpgLancerMagie(d, 'joueur', faible, victime.id).ok, true);
  assert.ok(d.sorcier.creatures.includes(victime));
});
test('l’IA choisit une créature adverse respectant le seuil', () => {
  const d = scene(); const petite = poser(d, 'joueur', 'chien-du-guet');
  const grande = poser(d, 'joueur', 'dune-marchante');
  assert.equal(choisirCibleAutoIA(d, 'sorcier', cardById(faible)), petite.id);
  assert.equal(choisirCibleAutoIA(d, 'sorcier', cardById(fort)), grande.id);
});
test('le bouclier allié ne bloque pas un sort allié', () => {
  const d = scene(); const victime = poser(d, 'joueur', 'chien-du-guet'); victime.bouclier = 1; preparer(d, faible);
  const res = rpgLancerMagie(d, 'joueur', faible, victime.id);
  assert.equal(res.ok, true); assert.notEqual(res.bouclierBloque, true);
  assert.ok(!d.joueur.creatures.some(e => e.id === victime.id));
});
