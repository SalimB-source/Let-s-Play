import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { texteActivation } from '../src/games/rpgActivationTexte.js';
import { rpgNouveauDuel, rpgMulligan, rpgDemarrerManaEssai, rpgJouerCreature, rpgLancerMagie, rpgSorcierResoudreAnnonce, rpgEffetsReponseDisponibles, rpgActiverEffetReponse, rpgPeutActiverCapacite } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaPasserCreature, rpgMobaActiverEffetReponse } from '../src/games/rpgMobaLocal.js';

function duel() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => .5 });
  for (const side of ['joueur', 'sorcier']) d[side].mana = { eau: 50, sable: 50, braise: 50, neige: 50, tenebres: 50 };
  return d;
}
function source(d, id, side = 'joueur') {
  const e = { id: `${side}-${id}`, carteId: id, name: cardById(id).name, pv: 10, pvMax: 10, ready: true, malInvocation: false, attaquee: false };
  d[side].creatures.push(e); return e;
}
function annonce(d, id, side = 'sorcier') {
  d[side].main.push(id); d.annonce = { cote: side, carteId: id, cibleId: null }; d.fenetreReponse = true;
}

test('le joueur peut laisser passer une créature sans dépenser sa réponse', () => {
  const d = duel(), e = source(d, 'garde-du-voile');
  d.tour = 'sorcier'; annonce(d, 'chien-du-guet');
  assert.deepEqual(rpgEffetsReponseDisponibles(d, 'joueur').map(e => e.id), [e.id]);
  assert.equal(rpgSorcierResoudreAnnonce(d).ok, true);
  assert.ok(d.sorcier.creatures.some(e => e.carteId === 'chien-du-guet'));
  assert.equal(e.activationUtiliseeMatch, undefined);
});

test('choix explicite entre plusieurs créatures et coût payé exactement une fois', () => {
  const d = duel(), garde = source(d, 'garde-du-voile'), kraken = source(d, 'kraken');
  d.tour = 'sorcier'; annonce(d, 'chien-du-guet');
  assert.equal(rpgEffetsReponseDisponibles(d, 'joueur').length, 2);
  const mana = Object.values(d.sorcier.mana).reduce((a, b) => a + b, 0);
  assert.equal(rpgActiverEffetReponse(d, 'joueur', kraken.id).ok, true);
  assert.equal(Object.values(d.sorcier.mana).reduce((a, b) => a + b, 0), mana); // Le mode actuel ne dépense pas de mana.
  assert.deepEqual(d.sorcier.cimetiere, ['chien-du-guet']);
  assert.equal(d.sorcier.main.includes('chien-du-guet'), false);
  assert.equal(kraken.activationUtiliseeMatch, true); assert.equal(kraken.ready, false);
  assert.equal(garde.activationUtiliseeMatch, undefined);
  assert.equal(rpgActiverEffetReponse(d, 'joueur', garde.id).ok, false);
});

test('filtres, état et timing sont validés sans modifier la partie au refus', () => {
  const d = duel(), e = source(d, 'vipere-de-verre');
  d.tour = 'sorcier'; annonce(d, 'chien-du-guet');
  let avant = JSON.stringify(d);
  assert.equal(rpgActiverEffetReponse(d, 'joueur', e.id).ok, false); assert.equal(JSON.stringify(d), avant);
  d.annonce.carteId = 'poigne-de-givre'; d.sorcier.main = ['poigne-de-givre'];
  for (const key of ['malInvocation', 'attaquee', 'activationUtiliseeMatch', 'activationUtiliseeCeTour']) {
    e[key] = true; avant = JSON.stringify(d);
    assert.equal(rpgActiverEffetReponse(d, 'joueur', e.id).ok, false, key);
    assert.equal(JSON.stringify(d), avant); e[key] = false;
  }
  assert.equal(rpgPeutActiverCapacite(d, 'joueur', e.id), false);
  assert.equal(rpgActiverEffetReponse(d, 'sorcier', e.id).ok, false);
  assert.equal(rpgActiverEffetReponse(d, 'joueur', e.id).ok, true);
});

test('Jörmungandr pioche seulement quand il contre un sort', () => {
  const d = duel(), e = source(d, 'jormungandr'); d.joueur.deck = ['chien-du-guet'];
  d.tour = 'sorcier'; annonce(d, 'poigne-de-givre');
  assert.equal(rpgActiverEffetReponse(d, 'joueur', e.id).ok, true);
  assert.deepEqual(d.joueur.main, ['chien-du-guet']);
});

test('un jeu direct sans fenêtre ne déclenche pas un contre implicite côté joueur', () => {
  const d = duel(), e = source(d, 'garde-du-voile'); d.tour = 'sorcier'; d.sorcier.main = ['chien-du-guet'];
  assert.equal(rpgJouerCreature(d, 'sorcier', 'chien-du-guet').ok, true);
  assert.equal(e.activationUtiliseeMatch, undefined);
  assert.equal(d.sorcier.creatures[0].carteId, 'chien-du-guet');
});

test('IA solo choisit une réponse légale à une annonce du joueur', () => {
  const d = duel(), e = source(d, 'garde-du-voile', 'sorcier'); d.joueur.main = ['chien-du-guet'];
  const r = rpgJouerCreature(d, 'joueur', 'chien-du-guet');
  assert.equal(r.contre, true); assert.equal(e.activationUtiliseeMatch, true);
  assert.deepEqual(d.joueur.cimetiere, ['chien-du-guet']);
});

test('Conquête : passage ou contre explicite, sans repayer la carte réservée', () => {
  for (const contrer of [false, true]) {
    const deck = Array(12).fill('gardienne-des-portes-de-sable');
    const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
    rpgMulligan(d, 'joueur', []); rpgMulligan(d, 'sorcier', []); rpgDemarrerManaEssai(d);
    for (const side of ['joueur', 'sorcier']) d[side].mana = { eau: 50, sable: 50, braise: 50, neige: 50, tenebres: 50 };
    d.joueur.main = ['garde-du-voile'];
    const e = rpgMobaJouerCreature(d, 'joueur', 'garde-du-voile', 'right', 0).entite;
    assert.ok(e); e.malInvocation = false;
    d.tour = 'sorcier'; d.sorcier.main = ['chien-du-guet'];
    assert.equal(rpgMobaJouerCreature(d, 'sorcier', 'chien-du-guet', 'right', 0, { ouvrirReponse: true }).creatureEnAttente, true);
    const mana = JSON.stringify(d.sorcier.mana);
    if (contrer) {
      assert.equal(rpgMobaActiverEffetReponse(d, 'joueur', e.id).ok, true);
      assert.equal(JSON.stringify(d.sorcier.mana), mana);
      assert.deepEqual(d.sorcier.cimetiere, ['chien-du-guet']);
      assert.equal(e.activationUtiliseeMatch, true);
    } else {
      assert.equal(rpgMobaPasserCreature(d, 'joueur').ok, true);
      assert.equal(e.activationUtiliseeMatch, undefined);
      assert.ok(d.sorcier.creatures.some(x => x.carteId === 'chien-du-guet'));
    }
  }
});

test('la description indique la réponse volontaire', () => {
  for (const id of ['garde-du-voile', 'vipere-de-verre', 'kraken', 'jormungandr']) {
    const texte = texteActivation(cardById(id));
    assert.match(texte, /Activez en réponse/); assert.doesNotMatch(texte, /automatiquement/);
  }
});

test('une invocation normale contrée paie aussi son retour au deck', () => {
  const d = duel(), e = source(d, 'kraken'); d.tour = 'sorcier';
  annonce(d, 'jormungandr'); d.sorcier.main.push('chien-du-guet', 'gardienne-des-portes-de-sable');
  d.annonce.retourIds = ['chien-du-guet', 'gardienne-des-portes-de-sable'];
  assert.equal(rpgActiverEffetReponse(d, 'joueur', e.id).ok, true);
  assert.deepEqual(d.sorcier.main, []);
  assert.deepEqual(new Set(d.sorcier.deck), new Set(['chien-du-guet', 'gardienne-des-portes-de-sable']));
  assert.deepEqual(d.sorcier.cimetiere, ['jormungandr']);
});

test('une créature déjà engagée ne peut répondre', () => {
  const d = duel(), e = source(d, 'garde-du-voile'); d.tour = 'sorcier'; annonce(d, 'chien-du-guet');
  e.ready = false;
  assert.equal(rpgActiverEffetReponse(d, 'joueur', e.id).ok, false);
});

test('Conquête : un contre rend la priorité à la carte suspendue', () => {
  const deck = Array(12).fill('gardienne-des-portes-de-sable');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgMulligan(d, 'joueur', []); rpgMulligan(d, 'sorcier', []); rpgDemarrerManaEssai(d);
  d.joueur.main = ['garde-du-voile'];
  const e = rpgMobaJouerCreature(d, 'joueur', 'garde-du-voile', 'right', 0).entite; e.malInvocation = false;
  d.tour = 'sorcier'; d.sorcier.main = ['chien-du-guet'];
  rpgMobaJouerCreature(d, 'sorcier', 'chien-du-guet', 'right', 0, { ouvrirReponse: true });
  const origine = { cote: 'joueur', carteId: 'poigne-de-givre' };
  d.mobaCreatureEnAttente.embuscadeSuspendue = true;
  d.mobaReponseSuspendue = { type: 'sort', attente: origine };
  assert.equal(rpgMobaActiverEffetReponse(d, 'joueur', e.id).ok, true);
  assert.equal(d.mobaSortEnAttente, origine);
  assert.equal(d.fenetreReponse, true);
});

test('Conquête : une créature contrée paie ses cartes à remettre au deck', () => {
  const deck = Array(12).fill('gardienne-des-portes-de-sable');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgMulligan(d, 'joueur', []); rpgMulligan(d, 'sorcier', []); rpgDemarrerManaEssai(d);
  d.joueur.main = ['garde-du-voile'];
  const e = rpgMobaJouerCreature(d, 'joueur', 'garde-du-voile', 'right', 0).entite; e.malInvocation = false;
  d.tour = 'sorcier'; d.sorcier.main = ['jormungandr', 'chien-du-guet', 'gardienne-des-portes-de-sable'];
  const result = rpgMobaJouerCreature(d, 'sorcier', 'jormungandr', 'right', 0,
    { ouvrirReponse: true, retourIds: ['chien-du-guet', 'gardienne-des-portes-de-sable'] });
  assert.equal(result.creatureEnAttente, true, JSON.stringify(result));
  assert.equal(rpgMobaActiverEffetReponse(d, 'joueur', e.id).ok, true);
  assert.deepEqual(d.sorcier.main, []);
  assert.ok(d.sorcier.deck.includes('chien-du-guet'));
  assert.ok(d.sorcier.deck.includes('gardienne-des-portes-de-sable'));
});
