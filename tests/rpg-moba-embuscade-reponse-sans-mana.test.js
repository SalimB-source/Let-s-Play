import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgMulligan, rpgDemarrerManaEssai, rpgFinDeTour } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaPeutEmbuscade, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaLancerAttaque, rpgMobaLancerMagie, rpgMobaPasserCreature, rpgMobaPasserSort, rpgMobaTerminerTour, rpgMobaPasserFinDeTour, rpgMobaResoudreArrivee, rpgMobaPasserEffetCreature } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirEmbuscadeIA } from '../src/games/rpgMobaAI.js';
import { rpgMobaPeutRepondreAttaque } from '../src/games/rpgMobaReponseAttaque.js';

function preparer(actif) {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  const defenseur = actif === 'joueur' ? 'sorcier' : 'joueur';
  if (d.tour !== defenseur) rpgFinDeTour(d);
  d[defenseur].main = ['gardienne-des-portes-de-sable'];
  const victime = rpgMobaJouerCreature(d, defenseur, 'gardienne-des-portes-de-sable', 'left', 0).entite;
  assert.ok(victime); victime.pv--;
  rpgFinDeTour(d);
  d[actif].main = ['djinn-du-dernier-brasier'];
  const djinn = rpgMobaJouerCreature(d, actif, 'djinn-du-dernier-brasier', 'left', 0).entite;
  assert.ok(djinn); djinn.detruireFinDuTour = false;
  rpgFinDeTour(d); rpgFinDeTour(d);
  d[defenseur].main = ['tojiro-le-pourfendeur'];
  return { d, defenseur, victime, djinn };
}
for (const actif of ['joueur', 'sorcier']) for (const fenetre of ['combat', 'sort', 'creature', 'fin']) {
  test(`Invocation spéciale refusée sans mutation pendant ${fenetre}, puis reprise (${actif})`, () => {
    const { d, defenseur, victime, djinn } = preparer(actif);
    const id = 'tojiro-le-pourfendeur';
    assert.equal(rpgMobaPeutEmbuscade(d, defenseur, id), false);
    if (fenetre === 'combat') assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, actif, djinn.id, victime.id, 'left').ok);
    if (fenetre === 'sort') { d[actif].main = ['tempete-de-sable']; assert.ok(rpgMobaLancerMagie(d, actif, 'tempete-de-sable', null, 'right', null, { ouvrirReponse: true }).sortEnAttente); }
    if (fenetre === 'creature') { d[actif].main = ['ashigaru-des-braises']; assert.ok(rpgMobaJouerCreature(d, actif, 'ashigaru-des-braises', 'right', 0, { ouvrirReponse: true }).creatureEnAttente); }
    if (fenetre === 'fin') { d[actif].main = []; assert.ok(rpgMobaTerminerTour(d, actif).reponse); }
    const avant = JSON.stringify(d);
    assert.equal(rpgMobaPeutEmbuscade(d, defenseur, id), false);
    if (fenetre === 'combat') assert.equal(rpgMobaPeutRepondreAttaque(d, defenseur), false);
    assert.equal(rpgMobaChoisirEmbuscadeIA(d, defenseur), null);
    assert.equal(rpgMobaJouerCreature(d, defenseur, id, 'left', 1, { ouvrirReponse: true, sacrificeIds: [] }).raison, 'pas-votre-tour');
    assert.equal(JSON.stringify(d), avant);
    assert.ok(d[defenseur].creatures.includes(victime));
    assert.equal(d.moba.creaturesJouees[defenseur], false);
    if (fenetre === 'sort') assert.ok(rpgMobaPasserSort(d, defenseur).ok);
    if (fenetre === 'creature') assert.ok(rpgMobaPasserCreature(d, defenseur).ok);
    if (fenetre === 'fin') assert.ok(rpgMobaPasserFinDeTour(d, defenseur).ok);
    if (fenetre === 'combat') assert.ok(rpgMobaLancerAttaque(d, actif, [djinn.id], {}, { declaree: true }).ok);
  });
}

for (const actif of ['joueur', 'sorcier']) {
  test(`un contresort reste possible sur une annonce de créature (${actif})`, () => {
    const { d, defenseur, victime } = preparer(actif);
    d[actif].main = ['ashigaru-des-braises'];
    d[defenseur].main = ['tojiro-le-pourfendeur', 'ecueil'];
    assert.ok(rpgMobaJouerCreature(d, actif, 'ashigaru-des-braises', 'right', 0, { ouvrirReponse: true }).creatureEnAttente);
    assert.equal(rpgMobaJouerCreature(d, defenseur, 'tojiro-le-pourfendeur', 'left', 1).raison, 'pas-votre-tour');
    assert.ok(rpgMobaLancerMagie(d, defenseur, 'ecueil').contre);
    assert.ok(d[defenseur].creatures.includes(victime));
    assert.equal(d.mobaCreatureEnAttente, null);
  });
  test(`une capacité suspendue reprend après le refus d’une Invocation spéciale (${actif})`, () => {
    const { d, defenseur, victime } = preparer(actif);
    d[actif].main = ['eclipse-silencieuse'];
    d[defenseur].main.push('trait-de-braise'); // maintient une vraie fenêtre de réponse
    assert.ok(rpgMobaJouerCreature(d, actif, 'eclipse-silencieuse', 'left', 1, { ouvrirReponse: true }).ok);
    assert.ok(rpgMobaPasserCreature(d, defenseur).arriveeEnAttente);
    assert.ok(rpgMobaResoudreArrivee(d, actif, victime.id).effetEnAttente);
    const original = d.effetCreatureEnAttente, avant = JSON.stringify(d);
    assert.equal(rpgMobaJouerCreature(d, defenseur, 'tojiro-le-pourfendeur', 'right', 0).raison, 'pas-votre-tour');
    assert.equal(JSON.stringify(d), avant);
    assert.equal(d.effetCreatureEnAttente, original);
    assert.ok(rpgMobaPasserEffetCreature(d, defenseur).ok);
  });
  test(`une Magie Rapide ne perturbe pas le sort suspendu (${actif})`, () => {
    const { d, defenseur, djinn } = preparer(actif);
    d[defenseur].main = ['sentinelle-des-sables', 'trait-de-braise'];
    d[actif].main = ['tempete-de-sable'];
    assert.ok(rpgMobaLancerMagie(d, actif, 'tempete-de-sable', null, 'right', null, { ouvrirReponse: true }).sortEnAttente);
    const original = d.mobaSortEnAttente;
    assert.equal(rpgMobaJouerCreature(d, defenseur, 'sentinelle-des-sables', 'left', 1).raison, 'pas-votre-tour');
    assert.ok(rpgMobaLancerMagie(d, defenseur, 'trait-de-braise', djinn.id).ok);
    assert.equal(d.mobaSortEnAttente, original);
    assert.ok(rpgMobaPasserSort(d, defenseur).ok);
  });
  test(`la recherche ne démarre pas lorsque le Pilote est refusé (${actif})`, () => {
    const { d, defenseur } = preparer(actif);
    d[defenseur].main = ['pilote-de-la-carreira'];
    d[defenseur].deck.push('cotre-de-course');
    d[actif].main = ['tempete-de-sable'];
    assert.ok(rpgMobaLancerMagie(d, actif, 'tempete-de-sable', null, 'right', null, { ouvrirReponse: true }).sortEnAttente);
    const original = d.mobaSortEnAttente, avant = JSON.stringify(d);
    assert.equal(rpgMobaJouerCreature(d, defenseur, 'pilote-de-la-carreira', 'left', 1).raison, 'pas-votre-tour');
    assert.equal(JSON.stringify(d), avant);
    assert.ok(!d.mobaRechercheEnAttente);
    assert.equal(d.mobaSortEnAttente, original);
    assert.ok(rpgMobaPasserSort(d, defenseur).ok);
  });
}
