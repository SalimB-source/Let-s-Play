import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature } from '../src/games/rpgDuel.js';
import { rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgAttaqueTousDisponible, rpgAttaqueTousMobaDisponible, rpgVagueDirecteClassique, rpgVagueDirecteMoba } from '../src/games/rpgAttaqueTous.js';
import { rpgMobaNouveauDuel as rpgMobaNouveauDuel2, rpgMobaJouerCreature } from '../src/games/rpgMobaLocal.js';
import { rpgMulligan, rpgDemarrerManaEssai, rpgFinDeTour } from '../src/games/rpgDuel.js';

function duel(cote = 'joueur', pvp = false) {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => .9 });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  d.pvp = pvp; d.tour = cote;
  const poser = (camp, id = 'ashigaru-des-braises') => {
    d[camp].invocationNormaleJouee = false; d[camp].main.push(id);
    const avant = d.tour; d.tour = camp;
    const result = rpgJouerCreature(d, camp, id); d.tour = avant;
    assert.ok(result.ok, result.raison);
    result.entite.ready = true; result.entite.malInvocation = false;
    return result.entite;
  };
  return { d, poser };
}

test('champ adverse vide : la vague emporte toutes les créatures prêtes', () => {
  const { d, poser } = duel();
  const a = poser('joueur'); const b = poser('joueur');
  assert.equal(rpgAttaqueTousDisponible(d, 'joueur'), true);
  assert.deepEqual(rpgVagueDirecteClassique(d, 'joueur').map((e) => e.id), [a.id, b.id]);
});

test('variante PvP : même règle', () => {
  const { d, poser } = duel('joueur', true);
  const a = poser('joueur');
  assert.equal(rpgAttaqueTousDisponible(d, 'joueur'), true);
  assert.deepEqual(rpgVagueDirecteClassique(d, 'joueur').map((e) => e.id), [a.id]);
});

test('champ adverse peuplé de volantes hors de portée : la vague reste offerte', () => {
  const { d, poser } = duel();
  const a = poser('joueur');
  const volante = poser('sorcier'); volante.envol = true;
  assert.deepEqual(rpgVagueDirecteClassique(d, 'joueur').map((e) => e.id), [a.id]);
  assert.equal(rpgAttaqueTousDisponible(d, 'joueur'), true);
});

test('une seule cible atteignable ferme la vague : on combat l’atteignable', () => {
  const { d, poser } = duel();
  poser('joueur');
  const volante = poser('sorcier'); volante.envol = true;
  const auSol = poser('sorcier');
  assert.equal(rpgVagueDirecteClassique(d, 'joueur').length, 0);
  assert.equal(rpgAttaqueTousDisponible(d, 'joueur'), false);
  // La volante ne suffit pas non plus : c'est bien la créature au sol qui bloque.
  d.sorcier.creatures = d.sorcier.creatures.filter((e) => e !== auSol);
  assert.equal(rpgAttaqueTousDisponible(d, 'joueur'), true);
});

test('une créature engagée ou mal invoquée ne fait pas partie de la vague', () => {
  const { d, poser } = duel();
  const a = poser('joueur'); const b = poser('joueur');
  b.ready = false;
  assert.deepEqual(rpgVagueDirecteClassique(d, 'joueur').map((e) => e.id), [a.id]);
  assert.equal(rpgAttaqueTousDisponible(d, 'joueur'), true, 'la vague se juge sur les seules créatures prêtes');
});

test('sans créature prête, aucune vague', () => {
  const { d, poser } = duel();
  poser('joueur').ready = false;
  assert.equal(rpgAttaqueTousDisponible(d, 'joueur'), false);
});

test('la vague frappe le sorcier une créature après l’autre', () => {
  const { d, poser } = duel();
  const a = poser('joueur'); const b = poser('joueur');
  const volante = poser('sorcier'); volante.envol = true;
  const pv = d.sorcier.pv;
  for (const id of rpgVagueDirecteClassique(d, 'joueur').map((e) => e.id)) {
    const declaration = rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', id, null);
    assert.ok(declaration.ok, JSON.stringify(declaration));
    assert.ok(rpgResoudreAttaqueIndividuelleClassique(d, 'joueur').ok);
  }
  const degats = [a, b].reduce((somme, e) => somme + e.atk, 0);
  assert.equal(d.sorcier.pv, pv - degats);
  assert.ok(d.sorcier.creatures.includes(volante), 'la volante hors de portée n’est jamais visée');
});

test('le MOBA garde ses voies : pas de vague classique', () => {
  const { d } = duel();
  d.moba = { lanes: {} };
  assert.deepEqual(rpgVagueDirecteClassique(d, 'joueur'), []);
  assert.equal(rpgAttaqueTousDisponible(d, 'joueur'), false);
});

function conquete() {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel2({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgMulligan(d, 'joueur', []); rpgMulligan(d, 'sorcier', []); rpgDemarrerManaEssai(d);
  if (d.tour !== 'sorcier') rpgFinDeTour(d);
  d.sorcier.main = ['ashigaru-des-braises'];
  const proie = rpgMobaJouerCreature(d, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(d); d.joueur.main = ['ashigaru-des-braises'];
  const attaquant = rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  attaquant.ready = true; attaquant.malInvocation = false;
  return { d, proie, attaquant };
}

test('Conquête : vague offerte quand rien n’est atteignable dans les voies', () => {
  const { d, proie, attaquant } = conquete();
  assert.equal(rpgAttaqueTousMobaDisponible(d, 'joueur'), false, 'une créature au sol reste atteignable');
  proie.envol = true;
  assert.equal(rpgAttaqueTousMobaDisponible(d, 'joueur'), true);
  assert.deepEqual(rpgVagueDirecteMoba(d, 'joueur'), [{ id: attaquant.id, voie: 'left' }]);
  // Une créature au sol ailleurs ramène une cible atteignable dans sa voie.
  d.sorcier.main = []; proie.envol = false;
  assert.equal(rpgAttaqueTousMobaDisponible(d, 'joueur'), false);
});

test('Conquête : une créature en retrait des voies n’entre pas dans la vague', () => {
  const { d, proie, attaquant } = conquete();
  proie.envol = true; attaquant.ready = false;
  assert.equal(rpgAttaqueTousMobaDisponible(d, 'joueur'), false, 'plus aucune créature prête');
  attaquant.ready = true;
  assert.equal(rpgAttaqueTousMobaDisponible(d, 'joueur'), true);
});
