import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById, duelCardById } from '../src/games/rpgCards.js';
import { sacrificesInvocation, invocationPossible } from '../src/games/rpgInvocation.js';
import { rpgNouveauDuel, rpgMulligan, rpgDemarrerManaEssai, rpgJouerCreature, rpgSorcierAnnonceSuivante, rpgSorcierResoudreAnnonce } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';

const nouveau = () => {
  const d = rpgNouveauDuel({ joueurDeck: Array(4).fill('chien-du-guet'), sorcierDeck: Array(4).fill('chien-du-guet'), joueurCouleurs: ['sable', 'braise', 'neige'], sorcierCouleurs: ['sable', 'braise', 'neige'], modeMana: RPG_MODE_MANA_ESSAI, rng: () => .99 });
  rpgMulligan(d, 'joueur', []);
  rpgMulligan(d, 'sorcier', []);
  rpgDemarrerManaEssai(d);
  for (const c of ['joueur', 'sorcier']) {
    d[c].main = [];
    d[c].manaChoixEnAttente = false;
    d[c].mana = { braise: 40, eau: 40, sable: 40, neige: 40, tenebres: 40 };
  }
  return d;
};
function victime(d, cote = 'joueur') {
  d[cote].main.push('chien-du-guet');
  const r = rpgJouerCreature(d, cote, 'chien-du-guet');
  assert.equal(r.ok, true, r.raison);
  return r.entite;
}
function jouer(d, id, ids, cote = 'joueur') {
  d[cote].main.push(id);
  return rpgJouerCreature(d, cote, id, null, { sacrificeIds: ids, cibleDifferee: true });
}
function refusIntact(d, id, options) {
  d.joueur.main = [id];
  const avant = JSON.stringify(d);
  const r = rpgJouerCreature(d, 'joueur', id, null, { cibleDifferee: true, ...options });
  assert.equal(r.ok, false);
  assert.equal(JSON.stringify(d), avant, 'refus sans paiement ni destruction');
  return r;
}

test('seuils d’invocation : moins de 5, 5, 6, 7 et plus, même sur les fiches moteur sans kind', () => {
  for (const [id, cout, nombre] of [['chien-du-guet', 2, 0], ['faucon-du-zenith', 5, 1], ['cavalier-des-deux-sabres', 6, 1], ['maitre-des-corbeaux', 7, 2], ['orochi', 8, 2]]) {
    assert.equal(cardById(id).cost, cout);
    assert.equal(sacrificesInvocation(cardById(id)), nombre);
    assert.equal(sacrificesInvocation(duelCardById(id)), nombre);
  }
});

for (const [id, nombre] of [['faucon-du-zenith', 1], ['cavalier-des-deux-sabres', 1], ['maitre-des-corbeaux', 2], ['orochi', 2]]) {
  test(`${id} : le prix est dû même sur une rangée presque vide`, () => {
    const d = nouveau();
    assert.equal(refusIntact(d, id, {}).raison, 'sacrifice-requis');
    const ids = Array.from({ length: nombre }, () => victime(d).id);
    const mana = { ...d.joueur.mana };
    const r = jouer(d, id, ids);
    assert.equal(r.ok, true, r.raison);
    assert.deepEqual(r.sacrificeIds, ids);
    assert.equal(d.joueur.creatures.length, 1);
    assert.equal(d.joueur.creatures[0].carteId, id);
    assert.equal(d.joueur.cimetiere.filter(c => c === 'chien-du-guet').length, nombre);
    assert.notDeepEqual(d.joueur.mana, mana, 'le mana reste dû en plus des sacrifices');
  });
}

test('victimes distinctes, alliées, présentes et non sites ; quantité exacte', () => {
  const d = nouveau();
  const a = victime(d), b = victime(d), ennemi = victime(d, 'sorcier');
  for (const ids of [[], [a.id], [a.id, a.id], [a.id, 'absent'], [a.id, ennemi.id], [a.id, b.id, ennemi.id]]) {
    refusIntact(d, 'orochi', { sacrificeIds: ids });
  }
  const site = { ...a, id: 'site', carteId: 'source-de-bimini' };
  d.joueur.creatures.push(site);
  refusIntact(d, 'orochi', { sacrificeIds: [a.id, site.id] });
  assert.equal(jouer(d, 'orochi', [a.id, b.id]).ok, true);
});

test('un manque de mana ou un emplacement invalide ne consomme aucune victime', () => {
  const d = nouveau();
  const a = victime(d), b = victime(d);
  refusIntact(d, 'faucon-du-zenith', { sacrificeIds: [a.id], emplacement: b.emplacement });
  d.joueur.mana = { sable: 0 };
  assert.equal(refusIntact(d, 'faucon-du-zenith', { sacrificeIds: [a.id] }).raison, 'mana');
});

test('cinq cartes en jeu : aucune petite créature de remplacement, mais invocation coûteuse avec son prix exact', () => {
  const d = nouveau();
  const corps = Array.from({ length: 5 }, () => victime(d));
  assert.equal(refusIntact(d, 'chien-du-guet', {}).raison, 'champ-plein');
  refusIntact(d, 'chien-du-guet', { sacrificeIds: [corps[0].id] });
  assert.equal(invocationPossible(d, 'joueur', cardById('chien-du-guet')), false);
  const r = jouer(d, 'orochi', [corps[1].id, corps[3].id]);
  assert.equal(r.ok, true, r.raison);
  assert.equal(d.joueur.creatures.length, 4);
  assert.equal(r.entite.emplacement, corps[1].emplacement);
});

test('IA : ne propose pas une invocation sans victimes, choisit deux victimes faibles quand possible', () => {
  const d = nouveau();
  d.tour = 'sorcier';
  d.sorcier.main = ['orochi'];
  assert.equal(rpgSorcierAnnonceSuivante(d, () => .99), null);
  const faibles = [victime(d, 'sorcier'), victime(d, 'sorcier')];
  const forte = victime(d, 'sorcier');
  Object.assign(forte, { atk: 20, def: 20, pv: 20, pvMax: 20 });
  assert.ok(rpgSorcierAnnonceSuivante(d, () => .99));
  const r = rpgSorcierResoudreAnnonce(d);
  assert.equal(r.ok, true, r.raison);
  assert.deepEqual(new Set(r.sacrificeIds), new Set(faibles.map(e => e.id)));
  assert.ok(d.sorcier.creatures.some(e => e.id === forte.id));
});

test('JcJ : transmet et revalide les deux sacrifices, sans choix automatique adverse', () => {
  const d = nouveau();
  d.pvp = true;
  const corps = [victime(d), victime(d)];
  d.joueur.main = ['orochi'];
  const avant = JSON.stringify(d);
  assert.equal(rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: 'orochi' }).ok, false);
  assert.equal(JSON.stringify(d), avant);
  const r = rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: 'orochi', sacrificeIds: corps.map(e => e.id) });
  assert.equal(r.ok, true, r.raison);
  assert.equal(d.joueur.creatures.length, 1);
});

test('les effets d’arrivée continuent à créer leurs jetons sans payer de sacrifices supplémentaires', () => {
  const d = nouveau();
  const a = victime(d);
  const r = jouer(d, 'tarek', [a.id]);
  assert.equal(r.ok, true);
  assert.equal(d.joueur.creatures.filter(e => e.carteId === 'chien-de-sable').length, 2);
});

test('une victime créant un jeton ne peut ni dépasser les cinq places ni voler la case réservée', () => {
  const d = nouveau();
  d.joueur.main = ['momie-de-lin'];
  const momie = rpgJouerCreature(d, 'joueur', 'momie-de-lin').entite;
  for (let i = 0; i < 4; i++) victime(d);
  const r = jouer(d, 'faucon-du-zenith', [momie.id]);
  assert.equal(r.ok, true);
  assert.equal(d.joueur.creatures.length, 5);
  assert.equal(r.entite.emplacement, momie.emplacement);
  assert.equal(d.joueur.creatures.some(e => e.carteId === 'shabti'), false);
});
