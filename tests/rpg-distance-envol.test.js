import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgReglerHasard, rpgAttaquerSorcier, rpgPeutBloquerAttaquant } from '../src/games/rpgDuel.js';
import { rpgCiblesIndividuellesClassique, rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle } from '../src/games/rpgMobaLocal.js';
import { rpgMobaCiblesIndividuelles } from '../src/games/rpgMobaAttaqueIndividuelle.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';

function table(mode, cote = 'joueur', lignes = false) {
  const moba = mode === 'conquete';
  const d = (moba ? rpgMobaNouveauDuel : rpgNouveauDuel)({ joueurDeck: [], sorcierDeck: [], lignes, modeMana: lignes ? 'essai' : undefined, joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], pvp: mode === 'pvp', rng: () => .9 });
  d.mulliganFait = { joueur: true, sorcier: true }; d.manaEssaiDemarre = true;
  for (const camp of ['joueur', 'sorcier']) {
    d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40]));
    d[camp].manaChoixEnAttente = null;
  }
  const ennemi = cote === 'joueur' ? 'sorcier' : 'joueur';
  function poser(camp, id, lane = 'left', slot = 0) {
    d.tour = camp; d[camp].invocationNormaleJouee = false;
    if (moba) d.moba.creaturesJouees[camp] = false;
    d[camp].main.push(id);
    const res = moba ? rpgMobaJouerCreature(d, camp, id, lane, slot) : rpgJouerCreature(d, camp, id);
    assert.ok(res.ok, JSON.stringify(res));
    Object.assign(res.entite, { ready: true, malInvocation: false, atk: 2, pv: 10, pvMax: 10 });
    return res.entite;
  }
  const a = poser(cote, 'ashigaru-des-braises');
  const c = poser(ennemi, 'chien-du-guet'); c.envol = true;
  d.tour = cote; rpgReglerHasard(d, () => .99);
  const choix = () => moba ? rpgMobaCiblesIndividuelles(d, cote, a.id, 'left') : rpgCiblesIndividuellesClassique(d, cote, a.id);
  const declarer = () => moba ? rpgMobaDeclarerAttaqueIndividuelle(d, cote, a.id, c.id, 'left') : mode === 'pvp'
    ? rpgPvpAppliquer(d, cote, { type: 'attaquer', declarer: true, attaquants: [a.id], cibleId: c.id })
    : rpgDeclarerAttaqueIndividuelleClassique(d, cote, a.id, c.id);
  const resoudre = () => moba ? rpgMobaResoudreAttaqueIndividuelle(d, cote) : mode === 'pvp'
    ? rpgPvpAppliquer(d, ennemi, { type: 'bloquer', blocages: {} })
    : rpgResoudreAttaqueIndividuelleClassique(d, cote);
  return { d, a, c, cote, ennemi, poser, choix, declarer, resoudre };
}

for (const mode of ['classique', 'pvp', 'conquete']) for (const cote of ['joueur', 'sorcier']) {
  test(`${mode}, ${cote} : une créature à distance peut attaquer une volante, sans riposte de mêlée`, () => {
    const { a, c, choix, declarer, resoudre } = table(mode, cote);
    assert.ok(a.distance && !a.envol && !a.coupRapide);
    assert.deepEqual(choix().cibles, [c.id]);
    assert.equal(choix().directe, false, 'la cible volante accessible protège de la frappe directe');
    assert.ok(declarer().ok);
    const result = resoudre(); assert.ok(result.ok, JSON.stringify(result)); assert.ok(!result.annule);
    assert.equal(c.pv, 8); assert.equal(a.pv, 10);
  });
  test(`${mode}, ${cote} : l’Envol gagné en réponse ne protège plus du tir`, () => {
    const { a, c, declarer, resoudre } = table(mode, cote);
    c.envol = false;
    assert.ok(declarer().ok);
    c.envol = true;
    const result = resoudre(); assert.ok(result.ok, JSON.stringify(result)); assert.ok(!result.annule);
    assert.equal(c.pv, 8); assert.equal(a.pv, 10);
  });
}

for (const mode of ['classique', 'conquete']) {
  test(`${mode} : mêlée terrestre, Infiltration et priorité Défenseur restent inchangées`, () => {
    const { d, a, c, ennemi, poser, choix } = table(mode);
    a.distance = false;
    assert.ok(!choix().cibles.includes(c.id), 'mêlée au sol ne vise pas Envol');
    a.distance = true;
    c.infiltration = true;
    assert.ok(!choix().cibles.includes(c.id), 'le tir normal ne traverse pas Infiltration');
    c.infiltration = false;
    const garde = poser(ennemi, 'chien-du-guet', 'left', 1); garde.defenseur = true;
    d.tour = 'joueur';
    assert.deepEqual(choix().cibles, [garde.id], 'Défenseur accessible reste prioritaire');
    a.infiltration = true;
    assert.ok(choix().cibles.includes(c.id), 'Infiltration permet de dépasser le Défenseur');
    assert.equal(rpgPeutBloquerAttaquant(a, c), false, 'À distance ne modifie pas les règles de blocage');
  });
}

test('Conquête : le tir normal reste limité à la voie de l’attaquant', () => {
  const { d, a, ennemi, poser, choix } = table('conquete');
  const ailleurs = poser(ennemi, 'chien-du-guet', 'right', 0); ailleurs.envol = true; d.tour = 'joueur';
  assert.equal(choix().cibles.includes(ailleurs.id), false);
  assert.equal(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, ailleurs.id, 'left').ok, false);
});

test('lignes : une volante au fond reste protégée par le front', () => {
  const { d, a, c, ennemi, poser, choix } = table('classique', 'joueur', true);
  c.emplacement = 5;
  const garde = poser(ennemi, 'chien-du-guet'); garde.emplacement = 0; d.tour = 'joueur';
  assert.ok(!choix().cibles.includes(c.id));
  garde.emplacement = 6;
  assert.ok(choix().cibles.includes(c.id));
});

test('raccourci historique : une volante accessible à un tireur empêche la frappe directe', () => {
  const { d, a, c } = table('classique');
  assert.equal(rpgAttaquerSorcier(d, 'joueur', a.id).ok, false);
  assert.ok(d.sorcier.creatures.includes(c));
});

for (const mode of ['classique', 'conquete']) {
  test(`${mode} : la perte de la distance en réponse rend une volante inaccessible`, () => {
    const { a, c, declarer, resoudre } = table(mode);
    assert.ok(declarer().ok);
    a.distance = false;
    const resultat = resoudre();
    assert.ok(resultat.ok && resultat.annule);
    assert.equal(c.pv, 10);
  });
  test(`${mode} : un Défenseur volant accessible devient prioritaire pour le tireur`, () => {
    const { d, c, ennemi, poser, choix } = table(mode);
    c.defenseur = true;
    const sol = poser(ennemi, 'chien-du-guet', 'left', 1); d.tour = 'joueur';
    assert.deepEqual(choix().cibles, [c.id]);
    assert.ok(!choix().cibles.includes(sol.id));
  });
  test(`${mode} : Attaque ciblée conserve la possibilité de viser Envol et Infiltration`, () => {
    const { a, c, choix } = table(mode);
    a.distance = false; a.coupRapide = true; c.infiltration = true;
    assert.ok(choix().cibles.includes(c.id));
  });
}
