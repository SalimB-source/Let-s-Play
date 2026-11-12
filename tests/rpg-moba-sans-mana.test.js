import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { rpgMulligan, rpgDemarrerManaEssai, rpgFinDeTour, rpgNouveauDuel, rpgPeutPayer } from '../src/games/rpgDuel.js';
import { sacrificesInvocation } from '../src/games/rpgInvocation.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaLancerMagie, rpgMobaPasserCreature, rpgMobaPeutPayer, rpgMobaTerminerTour, rpgMobaPasserFinDeTour } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirCreatureIA } from '../src/games/rpgMobaAI.js';

function partie() {
  const d = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['sable', 'braise'], sorcierCouleurs: ['braise', 'eau'], rng: () => .5 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok); assert.ok(rpgMulligan(d, 'sorcier', []).ok); assert.ok(rpgDemarrerManaEssai(d).ok);
  return d;
}
function donner(d, cote, id) { d[cote].main.push(id); }

test('pas de mana ni de choix de couleur, en début de partie ou aux tours suivants', () => {
  const d = partie();
  assert.equal(d.joueur.manaChoixEnAttente, false);
  for (const side of ['joueur', 'sorcier']) assert.equal(Object.values(d[side].mana).reduce((a,b) => a+b, 0), 0);
  assert.equal(rpgMobaTerminerTour(d, 'joueur').ok, true);
  assert.equal(rpgMobaPasserFinDeTour(d, 'sorcier').ok, true);
  assert.equal(d.sorcier.manaChoixEnAttente, false);
  assert.equal(Object.values(d.sorcier.manaMax).reduce((a,b) => a+b, 0), 0);
});

test('coûts imprimés 1 à 4 gratuits, sorts et prix en PV séparés ; classique inchangé', () => {
  for (const [id, lane, slot] of [['ashigaru-des-braises','left',0], ['gardienne-des-portes-de-sable','left',1], ['ronin-du-soleil-rouge','right',0], ['pourfendeur-des-djinns','right',1]]) {
    const d = partie();
    donner(d, 'joueur', id);
    assert.ok(cardById(id).cost <= 4); assert.equal(sacrificesInvocation(cardById(id), d), 0);
    assert.ok(rpgMobaJouerCreature(d, 'joueur', id, lane, slot).ok, id);
  }
  const d = partie();
  donner(d, 'joueur', 'trait-de-braise');
  assert.ok(rpgMobaLancerMagie(d, 'joueur', 'trait-de-braise', 'sorcier', 'center').ok);
  assert.equal(Object.values(d.joueur.mana).reduce((a,b) => a+b, 0), 0);
  const classique = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [] });
  assert.equal(rpgPeutPayer(classique.joueur, cardById('trait-de-braise')), false);
});

test('une seule invocation à sacrifice par camp et par tour, y compris après une annonce contrée', () => {
  const d = partie();
  const a = rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(d); rpgFinDeTour(d);
  const b = rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', 'right', 0).entite;
  rpgFinDeTour(d); rpgFinDeTour(d);
  donner(d, 'joueur', 'anqa-des-braises'); donner(d, 'joueur', 'orochi'); donner(d, 'sorcier', 'ecueil');
  assert.ok(rpgMobaJouerCreature(d, 'joueur', 'anqa-des-braises', 'left', 0, { ouvrirReponse: true, sacrificeIds: [a.id] }).ok);
  assert.ok(rpgMobaLancerMagie(d, 'sorcier', 'ecueil').contre);
  assert.ok(d.joueur.creatures.some(e => e.id === a.id), 'contre : les victimes restent en jeu');
  assert.equal(rpgMobaPeutPayer(d, 'joueur', cardById('orochi')), false);
  const before = JSON.stringify(d);
  assert.equal(rpgMobaJouerCreature(d, 'joueur', 'orochi', 'left', 0, { sacrificeIds: [a.id, b.id] }).raison, 'creature-limite');
  assert.equal(JSON.stringify(d), before);
  rpgFinDeTour(d); rpgFinDeTour(d);
  assert.equal(rpgMobaPeutPayer(d, 'joueur', cardById('orochi')), true);
  const result = rpgMobaJouerCreature(d, 'joueur', 'orochi', 'left', 0, { ouvrirReponse: true, sacrificeIds: [a.id, b.id] });
  assert.ok(result.ok);
  assert.ok(rpgMobaPasserCreature(d, 'sorcier').entite, 'résolution autorisée malgré la limite réservée à l’annonce');
  assert.equal(d.joueur.creatures.length, 1);
});

test('l’IA applique les mêmes règles sans mana et ne rejoue pas une invocation à sacrifice', () => {
  const d = partie(); rpgFinDeTour(d);
  d.sorcier.main = ['ashigaru-des-braises', 'anqa-des-braises'];
  const small = rpgMobaJouerCreature(d, 'sorcier', 'ashigaru-des-braises', 'left', 0); assert.ok(small.ok);
  assert.equal(rpgMobaChoisirCreatureIA(d, 'sorcier'), null);
  small.entite.atk = 0; small.entite.nePeutPasAttaquer = true;
  rpgFinDeTour(d); rpgFinDeTour(d); d.sorcier.main = ['anqa-des-braises'];
  const choice = rpgMobaChoisirCreatureIA(d, 'sorcier'); assert.equal(choice?.id, 'anqa-des-braises');
  assert.ok(rpgMobaJouerCreature(d, 'sorcier', choice.id, choice.lane, choice.slot, { sacrificeIds: choice.sacrificeIds }).ok);
  donner(d, 'sorcier', 'anqa-des-braises');
  assert.notEqual(rpgMobaChoisirCreatureIA(d, 'sorcier')?.id, 'anqa-des-braises');
});


test('le Prix en PV reste obligatoire et indépendant du coût en mana', () => {
  const d = partie(); donner(d, 'joueur', 'papyrus');
  const voie = d.moba.lanes.find(l => l.id === 'left');
  voie.hp.joueur = cardById('papyrus').prixPv;
  assert.equal(rpgMobaLancerMagie(d, 'joueur', 'papyrus', null, 'left').raison, 'prix');
  voie.hp.joueur += 5;
  const avant = voie.hp.joueur;
  assert.ok(rpgMobaLancerMagie(d, 'joueur', 'papyrus', null, 'left').ok);
  assert.equal(voie.hp.joueur, avant - cardById('papyrus').prixPv);
});

for (const side of ['joueur', 'sorcier']) {
  test(`${side} : une seule créature par tour, mais un sort reste possible`, () => {
    const d = partie(); if (side === 'sorcier') rpgFinDeTour(d);
    d[side].main = ['ashigaru-des-braises', 'gardienne-des-portes-de-sable', 'anqa-des-braises', 'trait-de-braise'];
    const petite = rpgMobaJouerCreature(d, side, 'ashigaru-des-braises', 'left', 0).entite;
    assert.ok(petite);
    assert.equal(rpgMobaPeutPayer(d, side, cardById('gardienne-des-portes-de-sable')), false);
    let avant = JSON.stringify(d);
    assert.equal(rpgMobaJouerCreature(d, side, 'gardienne-des-portes-de-sable', 'right', 0).raison, 'creature-limite');
    assert.equal(JSON.stringify(d), avant, 'refus sans mutation ni perte de carte');
    assert.ok(rpgMobaLancerMagie(d, side, 'trait-de-braise', 'sorcier', 'center').ok);
    assert.equal(rpgMobaJouerCreature(d, side, 'anqa-des-braises', 'left', 0, { sacrificeIds: [petite.id] }).raison, 'creature-limite');
    assert.equal(d.moba.creaturesJouees[side], true);
    rpgFinDeTour(d); rpgFinDeTour(d);
    assert.ok(rpgMobaJouerCreature(d, side, 'gardienne-des-portes-de-sable', 'right', 0).ok, 'quota réarmé au tour suivant');
  });
}

test('une petite créature annoncée réserve le quota même si elle est contrée', () => {
  const d = partie(); d.joueur.main = ['ashigaru-des-braises', 'gardienne-des-portes-de-sable']; d.sorcier.main = ['ecueil'];
  assert.equal(rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', 'left', 0, { ouvrirReponse: true }).creatureEnAttente, true);
  assert.ok(rpgMobaLancerMagie(d, 'sorcier', 'ecueil').contre);
  assert.equal(rpgMobaJouerCreature(d, 'joueur', 'gardienne-des-portes-de-sable', 'right', 0).raison, 'creature-limite');
  assert.deepEqual(d.joueur.main, ['gardienne-des-portes-de-sable']);
});

test('une annonce illégale ne consomme pas le quota, sa résolution reste possible, et les Sites sont distincts', () => {
  const d = partie(); d.joueur.main = ['ashigaru-des-braises', 'source-de-bimini'];
  const avant = JSON.stringify(d);
  assert.equal(rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', 'left', 8, { ouvrirReponse: true }).raison, 'emplacement');
  assert.equal(JSON.stringify(d), avant);
  assert.equal(rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', 'left', 0, { ouvrirReponse: true }).creatureEnAttente, true);
  assert.ok(rpgMobaPasserCreature(d, 'sorcier').entite);
  assert.ok(rpgMobaJouerCreature(d, 'joueur', 'source-de-bimini', 'right', 0).ok, 'Site non soumis au quota de créatures');
});

test('le choix de l’IA respecte la limite des petites créatures sans modifier le duel', () => {
  const d = partie(); rpgFinDeTour(d); d.sorcier.main = ['ashigaru-des-braises', 'gardienne-des-portes-de-sable'];
  assert.ok(rpgMobaJouerCreature(d, 'sorcier', 'ashigaru-des-braises', 'left', 0).ok);
  const avant = JSON.stringify(d);
  assert.equal(rpgMobaChoisirCreatureIA(d, 'sorcier'), null);
  assert.equal(JSON.stringify(d), avant);
});

test('une réanimation ne consomme pas le quota de petite créature et reste légale après une invocation', () => {
  const d = partie();
  d.joueur.main = ['ashigaru-des-braises', 'reanimation', 'gardienne-des-portes-de-sable'];
  d.joueur.cimetiere = ['gardienne-des-portes-de-sable'];
  assert.ok(rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', 'left', 0).ok);
  assert.ok(rpgMobaLancerMagie(d, 'joueur', 'reanimation', null, 'right', null, { emplacementReanimation: 0 }).ok);
  assert.equal(d.joueur.creatures.length, 2);
  assert.equal(rpgMobaJouerCreature(d, 'joueur', 'gardienne-des-portes-de-sable', 'left', 1).raison, 'creature-limite');
});

test('après une créature à sacrifice, une petite créature est refusée dans le même tour', () => {
  const d = partie();
  d.joueur.main = ['ashigaru-des-braises'];
  const victime = rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(d); rpgFinDeTour(d);
  d.joueur.main = ['anqa-des-braises', 'gardienne-des-portes-de-sable'];
  assert.ok(rpgMobaJouerCreature(d, 'joueur', 'anqa-des-braises', 'left', 0, { sacrificeIds: [victime.id] }).ok);
  assert.equal(rpgMobaJouerCreature(d, 'joueur', 'gardienne-des-portes-de-sable', 'right', 0).raison, 'creature-limite');
});

test('une carte Embuscade jouée normalement à son propre tour consomme le quota approprié', () => {
  const d = partie();
  d.joueur.main = ['garde-du-trone-givre', 'gardienne-des-portes-de-sable'];
  assert.ok(rpgMobaJouerCreature(d, 'joueur', 'garde-du-trone-givre', 'left', 0).ok);
  assert.equal(d.moba.creaturesJouees.joueur, true);
  assert.equal(rpgMobaJouerCreature(d, 'joueur', 'gardienne-des-portes-de-sable', 'right', 0).raison, 'creature-limite');
});
