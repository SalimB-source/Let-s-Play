import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { choisirCibleAutoIA } from '../src/games/rpgAI.js';
import { rpgBlesserCreature, rpgFinDeTour, rpgJouerCreature, rpgNouveauDuel, rpgReglerHasard, rpgSorcierAnnonceSuivante, rpgSorcierResoudreAnnonce } from '../src/games/rpgDuel.js';

function partie(contexte, carteForte = 'ashigaru-des-braises') {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgFinDeTour(duel);
  duel.sorcier.main = ['gardienne-des-portes-de-sable'];
  const faible = rpgJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable').entite;
  assert.ok(faible); faible.pv = faible.def = 1;
  rpgFinDeTour(duel);
  let menace = null;
  if (contexte !== 'aucune') {
    duel.joueur.main = ['ashigaru-des-braises'];
    menace = rpgJouerCreature(duel, 'joueur', 'ashigaru-des-braises').entite;
    assert.ok(menace); menace.atk = 3;
  }
  rpgFinDeTour(duel);
  duel.sorcier.main = [carteForte];
  const forte = rpgJouerCreature(duel, 'sorcier', carteForte, faible.id).entite;
  assert.ok(forte);
  if (carteForte === 'volva-soigneuse') {
    faible.pv = faible.def = 1;
    assert.ok(rpgBlesserCreature(duel, 'sorcier', forte.id, 1).ok);
  } else Object.assign(forte, { atk: 6, pv: 4, def: 4, pvMax: 6 });
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  if (contexte === 'gelee') menace.gelToursRestants = 2;
  if (contexte === 'interdite') menace.nePeutPasAttaquer = true;
  duel.sorcier.main = ['volva-soigneuse'];
  return { duel, faible, forte };
}

for (const contexte of ['aucune', 'menace', 'gelee', 'interdite']) {
  test(`classique : la Völva annonce un soin selon le contexte (${contexte})`, () => {
    const { duel, faible, forte } = partie(contexte);
    let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
    const avant = JSON.stringify(duel);
    const choix = choisirCibleAutoIA(duel, 'sorcier', cardById('volva-soigneuse'));
    assert.equal(choix, contexte === 'menace' ? faible.id : forte.id);
    assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0);
    const annonce = rpgSorcierAnnonceSuivante(duel, () => .5);
    assert.equal(annonce?.carteId, 'volva-soigneuse');
    assert.equal(annonce.cibleId, choix);
    const result = rpgSorcierResoudreAnnonce(duel);
    assert.ok(result.ok, JSON.stringify(result));
    assert.equal(faible.pv, contexte === 'menace' ? 4 : 1);
    assert.equal(forte.pv, contexte === 'menace' ? 4 : 6);
  });
}

test('classique : la Völva reste jouable seule sur une table vide', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgFinDeTour(duel); duel.sorcier.main = ['volva-soigneuse'];
  const annonce = rpgSorcierAnnonceSuivante(duel, () => .5);
  assert.equal(annonce?.carteId, 'volva-soigneuse');
  assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
  assert.ok(duel.sorcier.creatures.some(e => e.carteId === 'volva-soigneuse'));
});

test('classique : consolider la Völva plutôt que la Gardienne malgré la perte de Furie', () => {
  const { duel, faible, forte } = partie('aucune', 'volva-soigneuse');
  assert.deepEqual([faible.atk, faible.pv, faible.pvMax], [1, 1, 4]);
  assert.deepEqual([forte.atk, forte.pv, forte.pvMax, forte.furieBonusAtk], [4, 2, 3, 2]);
  assert.ok(forte.ready && !forte.attaquee && faible.ready && !faible.attaquee);
  const annonce = rpgSorcierAnnonceSuivante(duel, () => .5);
  assert.equal(annonce?.cibleId, forte.id);
  assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
  assert.equal(faible.pv, 1);
  assert.equal(forte.pv, 3);
  assert.equal(forte.atk, 2);
  assert.equal(forte.furieBonusAtk, 0);
});

test('classique : une menace létale peut rendre le soin de la Gardienne prioritaire', () => {
  const { duel, faible, forte } = partie('menace', 'volva-soigneuse');
  const annonce = rpgSorcierAnnonceSuivante(duel, () => .5);
  assert.equal(annonce?.cibleId, faible.id);
  assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
  assert.equal(faible.pv, 4);
  assert.equal(forte.pv, 2);
  assert.equal(forte.furieBonusAtk, 2);
});

test('classique : la protection contre les sorts de neige ne bloque pas le soin de la Völva', () => {
  const { duel, faible, forte } = partie('menace');
  faible.protection = { contre: 'neige', toursRestants: 2 };
  const annonce = rpgSorcierAnnonceSuivante(duel, () => .5);
  assert.equal(annonce?.cibleId, faible.id);
  assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
  assert.equal(faible.pv, 4);
  assert.equal(forte.pv, 4);
});

test('classique : un Site ne fait pas obstacle à une Völva qui se vise', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgFinDeTour(duel);
  duel.sorcier.main = ['source-de-bimini'];
  const site = rpgJouerCreature(duel, 'sorcier', 'source-de-bimini').entite;
  assert.ok(site);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel.sorcier.main = ['volva-soigneuse'];
  const annonce = rpgSorcierAnnonceSuivante(duel, () => .5);
  assert.equal(annonce?.carteId, 'volva-soigneuse');
  assert.equal(annonce.cibleId, null);
  assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
  assert.ok(duel.sorcier.creatures.some(e => e.carteId === 'volva-soigneuse'));
});

test('classique : une armure détruite ne peut pas être restaurée par le soin', () => {
  const { duel, faible, forte } = partie('aucune');
  forte.armuresMagiques = [{ max: 2, restant: 0 }];
  const annonce = rpgSorcierAnnonceSuivante(duel, () => .5);
  assert.equal(annonce?.cibleId, faible.id);
  assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
  assert.equal(faible.pv, 4); assert.equal(forte.pv, 4);
});

test('classique : une menace sans Envol ne peut pas atteindre une cible volante', () => {
  const { duel, faible, forte } = partie('menace');
  faible.envol = true;
  const annonce = rpgSorcierAnnonceSuivante(duel, () => .5);
  assert.equal(annonce?.cibleId, forte.id);
  assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
  assert.equal(faible.pv, 1); assert.equal(forte.pv, 6);
});

test('classique : une créature incapable d’attaquer immédiatement perd de sa priorité offensive', () => {
  const { duel, faible, forte } = partie('aucune');
  forte.ready = false;
  const annonce = rpgSorcierAnnonceSuivante(duel, () => .5);
  assert.equal(annonce?.cibleId, faible.id);
  assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
  assert.equal(faible.pv, 4); assert.equal(forte.pv, 4);
});
