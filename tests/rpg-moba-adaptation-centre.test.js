import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgDemarrerManaEssai, rpgMulligan, rpgFinDeTour, rpgPeutRepondre } from '../src/games/rpgDuel.js';
import { mobaInfliger, mobaVoie } from '../src/games/rpgMoba.js';
import { MOBA_CARTES_AUTORISEES, rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaPasserCreature, rpgMobaCiblesSite, rpgMobaResoudreSite, rpgMobaResoudreArrivee, rpgMobaTerminerTour, rpgMobaPasserFinDeTour, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';

function partie() {
  const duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('chien-du-guet'), sorcierDeck: Array(30).fill('chien-du-guet'), rng: () => .5 });
  rpgMulligan(duel, 'joueur', []); rpgMulligan(duel, 'sorcier', []); rpgDemarrerManaEssai(duel);
  Object.assign(duel.joueur.mana, { sable: 30, eau: 30, braise: 30 });
  mobaInfliger(duel.moba, 'joueur', 'center', 15);
  return duel;
}

test('Guetteuse : cible le centre conquis et y fait revenir son allié', () => {
  const duel = partie();
  duel.joueur.main = ['chien-du-guet', 'guetteuse-des-marees'];
  const allie = rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'center', 0).entite;
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  const guetteuse = rpgMobaJouerCreature(duel, 'joueur', 'guetteuse-des-marees', 'right', 0);
  assert.ok(guetteuse.arriveeEnAttente, JSON.stringify(guetteuse));
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', allie.id).ok, true);
  assert.equal(mobaVoie(duel.moba, 'center').slots.joueur[0], null);
  assert.ok(duel.joueur.exil.includes('chien-du-guet'));
  const fin = rpgMobaTerminerTour(duel, 'joueur');
  if (fin.reponse) assert.equal(rpgMobaPasserFinDeTour(duel, fin.reponse).ok, true);
  else assert.equal(fin.ok, true);
  const revenu = duel.joueur.creatures.find((e) => e.carteId === 'chien-du-guet');
  assert.ok(revenu); assert.notEqual(revenu.id, allie.id);
  assert.equal(revenu.mobaLane, 'center');
  assert.equal(mobaVoie(duel.moba, 'center').slots.joueur[0], revenu.id);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Tarek : ses jetons restent dans la voie de combat et peuvent occuper le centre conquis', () => {
  const duel = partie();
  duel.joueur.main = ['ashigaru-des-braises', 'tarek'];
  const victime = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  const result = rpgMobaJouerCreature(duel, 'joueur', 'tarek', 'right', 0, { sacrificeIds: [victime.id] });
  assert.equal(result.ok, true, JSON.stringify(result));
  const chiens = duel.joueur.creatures.filter((e) => e.carteId === 'chien-de-sable');
  assert.equal(chiens.length, 2);
  assert.deepEqual(chiens.map((e) => e.mobaLane).sort(), ['center', 'right']);
  assert.ok(chiens.some((e) => mobaVoie(duel.moba, 'center').slots.joueur.includes(e.id)));
  assert.equal(mobaVoie(duel.moba, 'left').slots.joueur.filter(Boolean).length, 0);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('la mort du sacrifié ne place pas de jeton sur la case réservée à la nouvelle invocation', () => {
  const duel = partie();
  Object.assign(duel.joueur.mana, { neige: 30 });
  duel.joueur.main = ['ashigaru-des-braises', 'ashigaru-des-braises', 'orochi', 'jarl-au-marteau-de-guerre'];
  const a = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  const b = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 1).entite;
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  const orochi = rpgMobaJouerCreature(duel, 'joueur', 'orochi', 'right', 0, { sacrificeIds: [a.id, b.id] });
  assert.equal(orochi.ok, true, JSON.stringify(orochi));
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  const jarl = rpgMobaJouerCreature(duel, 'joueur', 'jarl-au-marteau-de-guerre', 'right', 0, { sacrificeIds: [orochi.entite.id] });
  assert.equal(jarl.ok, true, JSON.stringify(jarl));
  assert.equal(mobaVoie(duel.moba, 'right').slots.joueur[0], jarl.entite.id);
  assert.ok(duel.joueur.creatures.some((e) => e.carteId === 'petit-orochi'));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

for (const annoncer of [false, true]) for (const gagnant of [false, true]) {
  test(`sacrifice conquérant ferme la case avant l’arrivée (annonce=${annoncer}, victoire=${gagnant})`, () => {
    const duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('chien-du-guet'), sorcierDeck: Array(30).fill('chien-du-guet'), rng: () => .5 });
    rpgMulligan(duel, 'joueur', []); rpgMulligan(duel, 'sorcier', []); rpgDemarrerManaEssai(duel);
    Object.assign(duel.joueur.mana, { braise: 30 });
    duel.joueur.main = ['ronin-du-soleil-rouge', 'anqa-des-braises'];
    const victime = rpgMobaJouerCreature(duel, 'joueur', 'ronin-du-soleil-rouge', 'left', 0).entite;
    assert.ok(victime);
    rpgFinDeTour(duel); rpgFinDeTour(duel);
    if (gagnant) mobaInfliger(duel.moba, 'joueur', 'right', 20);
    mobaVoie(duel.moba, 'left').hp.sorcier = 1;
    let result = rpgMobaJouerCreature(duel, 'joueur', 'anqa-des-braises', 'left', 0, { sacrificeIds: [victime.id], ouvrirReponse: annoncer });
    if (annoncer) {
      assert.equal(result.creatureEnAttente, true);
      assert.ok(duel.joueur.creatures.some((e) => e.id === victime.id));
      result = rpgMobaPasserCreature(duel, 'sorcier');
    }
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.dissipe, true);
    assert.equal(duel.moba.winner, gagnant ? 'joueur' : null);
    assert.equal(mobaVoie(duel.moba, 'left').active, false);
    assert.ok(duel.joueur.cimetiere.includes('anqa-des-braises'));
    assert.ok(!duel.joueur.creatures.some((e) => e.carteId === 'anqa-des-braises'));
    assert.ok(!duel.mobaCreatureEnAttente);
    assert.ok(result.damageEvents.some((e) => e.cardId === 'ronin-du-soleil-rouge'));
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  });
}

for (const dansLaVoie of [false, true]) {
  test(`Source de Bimini : aucune cible hors de sa voie (allié local=${dansLaVoie})`, () => {
    const duel = partie();
    duel.joueur.main = ['chien-du-guet', 'chien-du-guet', 'source-de-bimini'];
    const exterieur = rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'left', 0).entite;
    rpgFinDeTour(duel); rpgFinDeTour(duel);
    const local = dansLaVoie ? rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'center', 0).entite : null;
    const site = rpgMobaJouerCreature(duel, 'joueur', 'source-de-bimini', 'right', 0).entite;
    assert.ok(exterieur && site); if (dansLaVoie) assert.ok(local);
    const attaqueExterieur = exterieur.atk;
    site.heures.restants = 1;
    duel.sorcier.main = [];
    let fin = rpgMobaTerminerTour(duel, 'joueur');
    if (fin.reponse) fin = rpgMobaPasserFinDeTour(duel, fin.reponse);
    assert.equal(fin.ok, true);
    fin = rpgMobaTerminerTour(duel, 'sorcier');
    if (fin.reponse) fin = rpgMobaPasserFinDeTour(duel, fin.reponse);
    assert.equal(fin.ok, true);
    if (dansLaVoie) {
      assert.equal(duel.siteEnAttente?.entiteId, site.id);
      assert.deepEqual(rpgMobaCiblesSite(duel, 'joueur'), [local.id]);
      assert.equal(rpgMobaResoudreSite(duel, 'joueur', local.id).ok, true);
    } else {
      assert.ok(!duel.siteEnAttente);
      assert.ok(duel.joueur.cimetiere.includes('source-de-bimini'));
      assert.equal(exterieur.atk, attaqueExterieur);
    }
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  });
}

for (const side of ['joueur', 'sorcier']) {
  test(`Sorcier du ressac noir : annonce depuis la main en MOBA (${side})`, () => {
    assert.ok(MOBA_CARTES_AUTORISEES.includes('sorcier-du-ressac-noir'));
    const duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('chien-du-guet'), sorcierDeck: Array(30).fill('chien-du-guet'), rng: () => .5 });
    rpgMulligan(duel, 'joueur', []); rpgMulligan(duel, 'sorcier', []); rpgDemarrerManaEssai(duel);
    if (side === 'sorcier') rpgFinDeTour(duel);
    const defenseur = side === 'joueur' ? 'sorcier' : 'joueur';
    duel[side].main = ['chien-du-guet']; duel[side].mana.sable = 30;
    duel[defenseur].main = ['sorcier-du-ressac-noir'];
    Object.assign(duel[defenseur].mana, { eau: 30, tenebres: 30 });
    const annonce = rpgMobaJouerCreature(duel, side, 'chien-du-guet', 'left', 0, { ouvrirReponse: true });
    assert.equal(annonce.creatureEnAttente, true);
    assert.equal(rpgPeutRepondre(duel, defenseur), false);
    assert.equal(rpgMobaJouerCreature(duel, defenseur, 'sorcier-du-ressac-noir', 'right', 0, { ouvrirReponse: true }).creatureEnAttente, true);
    assert.equal(rpgMobaPasserCreature(duel, side).entite?.carteId, 'sorcier-du-ressac-noir');
    assert.ok(duel[side].cimetiere.includes('chien-du-guet'));
  });
}
