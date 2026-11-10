import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgNouveauDuel, rpgMulligan, rpgDemarrerManaEssai, rpgFinDeTour, rpgJouerCreature, rpgSorcierAnnonceSuivante, rpgSorcierResoudreAnnonce, rpgReglerHasard } from '../src/games/rpgDuel.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirCreatureIA } from '../src/games/rpgMobaAI.js';
import { choisirCarteIA } from '../src/games/rpgAI.js';

const mana = { braise: 40, eau: 40, sable: 40, neige: 40, tenebres: 40 };
function partie(moba = false) {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = moba ? rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 })
    : rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], modeMana: RPG_MODE_MANA_ESSAI, rng: () => .5 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  for (const side of ['joueur','sorcier']) { d[side].main = []; d[side].mana = { ...mana }; d[side].manaChoixEnAttente = false; }
  return d;
}
function poser(d, side, id, lane = 'left', slot = 0) {
  d[side].main.push(id); d[side].mana = { ...mana }; d[side].manaChoixEnAttente = false;
  const result = d.moba ? rpgMobaJouerCreature(d, side, id, lane, slot) : rpgJouerCreature(d, side, id, null, { cibleDifferee: true });
  assert.ok(result.entite, JSON.stringify(result));
  return result.entite;
}
function choix(d) { return d.moba ? rpgMobaChoisirCreatureIA(d, 'sorcier') : choisirCarteIA(d, 'sorcier', { rng: () => .99 }); }
function id(c) { return c?.id ?? c?.carteId; }
for (const mode of ['classique', 'moba']) {
  test(`${mode} : conserve une créature supérieure au lieu de la sacrifier sans bénéfice`, () => {
    const d = partie(mode === 'moba'); rpgFinDeTour(d);
    const forte = poser(d, 'sorcier', 'ashigaru-des-braises'); Object.assign(forte, { atk: 15, pv: 15, def: 15, pvMax: 15 });
    d.sorcier.mana = { ...mana }; d.sorcier.main = ['anqa-des-braises']; const before = JSON.stringify(d);
    assert.equal(choix(d), null); assert.equal(JSON.stringify(d), before);
  });
  test(`${mode} : sacrifie une créature moins précieuse plutôt que la plus puissante`, () => {
    const d = partie(mode === 'moba'); rpgFinDeTour(d);
    const forte = poser(d, 'sorcier', 'ashigaru-des-braises', 'left', 0); Object.assign(forte, { atk: 15, pv: 15, def: 15, pvMax: 15 });
    const faible = poser(d, 'sorcier', 'ashigaru-des-braises', 'right', 0);
    d.sorcier.mana = { ...mana }; d.sorcier.main = ['anqa-des-braises']; const before = JSON.stringify(d);
    const c = choix(d); assert.equal(id(c), 'anqa-des-braises'); assert.deepEqual(c.sacrificeIds, [faible.id]); assert.equal(JSON.stringify(d), before);
    if (!d.moba) { assert.equal(rpgSorcierAnnonceSuivante(d)?.carteId, 'anqa-des-braises'); const result = rpgSorcierResoudreAnnonce(d); assert.equal(result.ok, true); assert.deepEqual(result.sacrificeIds, [faible.id]); }
  });
  test(`${mode} : refuse deux sacrifices dont la valeur combinée dépasse l'invocation`, () => {
    const d = partie(mode === 'moba'); rpgFinDeTour(d);
    for (const [lane, slot] of [['left',0],['right',0]]) { const e = poser(d, 'sorcier', 'ashigaru-des-braises', lane, slot); Object.assign(e, { atk: 9, pv: 9, def: 9, pvMax: 9 }); }
    d.sorcier.mana = { ...mana }; d.sorcier.main = ['orochi']; assert.equal(choix(d), null);
  });
  test(`${mode} : accepte un sacrifice défavorable quand l'arrivée élimine une menace importante`, () => {
    const d = partie(mode === 'moba');
    const ennemi = poser(d, 'joueur', 'ashigaru-des-braises'); Object.assign(ennemi, { atk: 12, pv: 4, def: 4, pvMax: 4 });
    rpgFinDeTour(d);
    const forte = poser(d, 'sorcier', 'ashigaru-des-braises'); Object.assign(forte, { atk: 6, pv: 6, def: 6, pvMax: 6 });
    d.sorcier.mana = { ...mana }; d.sorcier.main = ['lionne-du-midi-ardent']; const before = JSON.stringify(d);
    const c = choix(d); assert.equal(id(c), 'lionne-du-midi-ardent'); assert.deepEqual(c.sacrificeIds, [forte.id]); assert.equal(JSON.stringify(d), before);
  });
}

for (const mode of ['classique', 'moba']) {
  test(`${mode} : accepte un remplacement inférieur pour arrêter un létal aérien`, () => {
    const d = partie(mode === 'moba');
    const attaquant = poser(d, 'joueur', 'ashigaru-des-braises', 'right');
    Object.assign(attaquant, { atk: 5, pv: 6, def: 6, pvMax: 6, envol: true });
    if (d.moba) {
      const lane = d.moba.lanes.find((l) => l.id === 'left');
      lane.active = false; lane.conqueredBy = 'joueur'; lane.hp.sorcier = 0;
      d.moba.lanes.find((l) => l.id === 'right').hp.sorcier = 5;
    } else d.sorcier.pv = 5;
    rpgFinDeTour(d);
    const forte = poser(d, 'sorcier', 'ashigaru-des-braises', d.moba ? 'center' : 'left');
    Object.assign(forte, { atk: 8, pv: 8, def: 8, pvMax: 8 });
    d.sorcier.mana = { ...mana }; d.sorcier.main = ['anqa-des-braises'];
    const before = JSON.stringify(d); const c = choix(d);
    assert.equal(id(c), 'anqa-des-braises'); assert.deepEqual(c.sacrificeIds, [forte.id]);
    if (d.moba) assert.equal(c.lane, 'right');
    assert.equal(JSON.stringify(d), before);
  });
}

for (const mode of ['classique', 'moba']) {
  test(`${mode} : accepte un sacrifice défavorable pour une victoire immédiate en combat`, () => {
    const d = partie(mode === 'moba');
    if (d.moba) {
      const voie = d.moba.lanes.find(l => l.id === 'left'); voie.active = false; voie.conqueredBy = 'sorcier'; voie.hp.joueur = 0;
      d.moba.lanes.find(l => l.id === 'right').hp.joueur = 5;
    } else d.joueur.pv = 5;
    rpgFinDeTour(d);
    const victime = poser(d, 'sorcier', 'ashigaru-des-braises', d.moba ? 'center' : 'left');
    Object.assign(victime, { atk: 9, pv: 9, def: 9, pvMax: 9 });
    d.sorcier.mana = { ...mana }; d.sorcier.main = ['ifrit-des-ergs'];
    const avant = JSON.stringify(d); const c = choix(d);
    assert.equal(id(c), 'ifrit-des-ergs'); assert.deepEqual(c.sacrificeIds, [victime.id]);
    if (d.moba) assert.equal(c.lane, 'right');
    assert.equal(JSON.stringify(d), avant);
  });
}

test('classique : une réponse changeant la valeur de la victime fait renoncer sans sacrifier', () => {
  const d = partie(); rpgFinDeTour(d);
  const victime = poser(d, 'sorcier', 'ashigaru-des-braises');
  d.sorcier.mana = { ...mana }; d.sorcier.main = ['anqa-des-braises'];
  assert.equal(rpgSorcierAnnonceSuivante(d)?.carteId, 'anqa-des-braises');
  Object.assign(victime, { atk: 20, pv: 20, def: 20, pvMax: 20 });
  const manaAvant = { ...d.sorcier.mana };
  const result = rpgSorcierResoudreAnnonce(d);
  assert.equal(result.ok, false); assert.equal(result.raison, 'sacrifice-inutile');
  assert.ok(d.sorcier.creatures.includes(victime)); assert.ok(d.sorcier.main.includes('anqa-des-braises'));
  assert.deepEqual(d.sorcier.mana, manaAvant); assert.equal(d.annonce, null);
  assert.equal(rpgSorcierAnnonceSuivante(d), null);
});

for (const mode of ['classique', 'moba']) {
  test(`${mode} : les simulations de sacrifice ne consomment pas le hasard réel`, () => {
    const d = partie(mode === 'moba'); rpgFinDeTour(d);
    const forte = poser(d, 'sorcier', 'ashigaru-des-braises'); Object.assign(forte, { atk: 12, pv: 12, def: 12, pvMax: 12 });
    d.sorcier.mana = { ...mana }; d.sorcier.main = ['anqa-des-braises'];
    let appels = 0; rpgReglerHasard(d, () => { appels++; return .5; });
    const avant = JSON.stringify(d); choix(d);
    assert.equal(appels, 0); assert.equal(JSON.stringify(d), avant);
  });
}
