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
  test(`Embuscade adverse sans sacrifice reprend ${fenetre} (${actif})`, () => {
    const { d, defenseur, victime, djinn } = preparer(actif);
    const id = 'tojiro-le-pourfendeur';
    assert.equal(rpgMobaPeutEmbuscade(d, defenseur, id), false);
    if (fenetre === 'combat') assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, actif, djinn.id, victime.id, 'left').ok);
    if (fenetre === 'sort') { d[actif].main = ['tempete-de-sable']; assert.ok(rpgMobaLancerMagie(d, actif, 'tempete-de-sable', null, 'right', null, { ouvrirReponse: true }).sortEnAttente); }
    if (fenetre === 'creature') { d[actif].main = ['ashigaru-des-braises']; assert.ok(rpgMobaJouerCreature(d, actif, 'ashigaru-des-braises', 'right', 0, { ouvrirReponse: true }).creatureEnAttente); }
    if (fenetre === 'fin') { d[actif].main = []; assert.ok(rpgMobaTerminerTour(d, actif).reponse); }
    assert.ok(rpgMobaPeutEmbuscade(d, defenseur, id));
    if (fenetre === 'combat') assert.ok(rpgMobaPeutRepondreAttaque(d, defenseur));
    const avant = JSON.stringify(d);
    assert.equal(rpgMobaChoisirEmbuscadeIA(d, defenseur)?.id, id);
    assert.equal(JSON.stringify(d), avant);
    assert.equal(rpgMobaJouerCreature(d, defenseur, id, 'left', 1, { ouvrirReponse: true, sacrificeIds: [victime.id] }).ok, false);
    assert.equal(JSON.stringify(d), avant);
    const original = d.mobaSortEnAttente ?? d.mobaCreatureEnAttente ?? d.finDeTour;
    assert.ok(rpgMobaJouerCreature(d, defenseur, id, 'left', 1, { ouvrirReponse: true, sacrificeIds: [] }).creatureEnAttente);
    assert.ok(rpgMobaPasserCreature(d, actif).entite);
    assert.ok(d[defenseur].creatures.includes(victime));
    assert.equal(d.moba.creaturesJouees[defenseur], false);
    if (fenetre === 'sort') { assert.equal(d.mobaSortEnAttente, original); assert.ok(rpgMobaPasserSort(d, defenseur).ok); }
    if (fenetre === 'creature') { assert.equal(d.mobaCreatureEnAttente, original); assert.ok(rpgMobaPasserCreature(d, defenseur).ok); }
    if (fenetre === 'fin') { assert.equal(d.finDeTour, original); assert.ok(rpgMobaPasserFinDeTour(d, defenseur).ok); }
    if (fenetre === 'combat') assert.ok(rpgMobaLancerAttaque(d, actif, [djinn.id], {}, { declaree: true }).ok);
  });
}

for (const actif of ['joueur', 'sorcier']) {
  test(`Embuscade contrée reprend l’annonce initiale (${actif})`, () => {
    const { d, defenseur, victime } = preparer(actif);
    d[actif].main = ['ashigaru-des-braises', 'ecueil'];
    assert.ok(rpgMobaJouerCreature(d, actif, 'ashigaru-des-braises', 'right', 0, { ouvrirReponse: true }).creatureEnAttente);
    const original = d.mobaCreatureEnAttente;
    assert.ok(rpgMobaJouerCreature(d, defenseur, 'tojiro-le-pourfendeur', 'left', 1, { ouvrirReponse: true, sacrificeIds: [] }).ok);
    assert.ok(rpgMobaLancerMagie(d, actif, 'ecueil').contre);
    assert.equal(d.mobaCreatureEnAttente, original);
    assert.ok(d[defenseur].creatures.includes(victime));
    assert.ok(rpgMobaPasserCreature(d, defenseur).entite);
  });
}

for (const actif of ['joueur', 'sorcier']) {
  test(`Une capacité suspendue reprend après l'Embuscade (${actif})`, () => {
    const { d, defenseur, victime } = preparer(actif);
    d[actif].main = ['eclipse-silencieuse'];
    assert.ok(rpgMobaJouerCreature(d, actif, 'eclipse-silencieuse', 'left', 1, { ouvrirReponse: true }).ok);
    assert.ok(rpgMobaPasserCreature(d, defenseur).arriveeEnAttente);
    assert.ok(rpgMobaResoudreArrivee(d, actif, victime.id).effetEnAttente);
    const original = d.effetCreatureEnAttente;
    assert.ok(rpgMobaJouerCreature(d, defenseur, 'tojiro-le-pourfendeur', 'right', 0, { ouvrirReponse: true, sacrificeIds: [] }).ok);
    assert.ok(rpgMobaPasserCreature(d, actif).entite);
    assert.equal(d.effetCreatureEnAttente, original);
    assert.ok(rpgMobaPasserEffetCreature(d, defenseur).ok);
  });
  test(`Une arrivée ciblée en Embuscade reprend le sort suspendu (${actif})`, () => {
    const { d, defenseur, djinn } = preparer(actif);
    d[defenseur].main = ['sentinelle-des-sables'];
    d[actif].main = ['tempete-de-sable'];
    assert.ok(rpgMobaLancerMagie(d, actif, 'tempete-de-sable', null, 'right', null, { ouvrirReponse: true }).sortEnAttente);
    const original = d.mobaSortEnAttente;
    const annonce = rpgMobaJouerCreature(d, defenseur, 'sentinelle-des-sables', 'left', 1, { ouvrirReponse: true, sacrificeIds: [] });
    assert.ok(annonce.ok, JSON.stringify(annonce));
    const entree = rpgMobaPasserCreature(d, actif);
    assert.ok(entree.arriveeEnAttente, JSON.stringify(entree));
    const cible = rpgMobaResoudreArrivee(d, defenseur, djinn.id);
    assert.ok(cible.ok, JSON.stringify(cible));
    if (cible.effetEnAttente) assert.ok(rpgMobaPasserEffetCreature(d, actif).ok);
    assert.equal(d.mobaSortEnAttente, original);
    assert.ok(rpgMobaPasserSort(d, defenseur).ok);
  });
}

for (const actif of ['joueur', 'sorcier']) {
  test(`La recherche du Pilote en Embuscade reprend le sort suspendu (${actif})`, async () => {
    const { rpgMobaResoudreRecherche } = await import('../src/games/rpgMobaLocal.js');
    const { d, defenseur } = preparer(actif);
    d[defenseur].main = ['pilote-de-la-carreira'];
    d[defenseur].deck.push('cotre-de-course');
    d[actif].main = ['tempete-de-sable'];
    assert.ok(rpgMobaLancerMagie(d, actif, 'tempete-de-sable', null, 'right', null, { ouvrirReponse: true }).sortEnAttente);
    const original = d.mobaSortEnAttente;
    assert.ok(rpgMobaJouerCreature(d, defenseur, 'pilote-de-la-carreira', 'left', 1, { ouvrirReponse: true, sacrificeIds: [] }).ok);
    assert.ok(rpgMobaPasserCreature(d, actif).entite);
    assert.equal(d.mobaRechercheEnAttente?.cote, defenseur);
    assert.ok(rpgMobaResoudreRecherche(d, defenseur, 'cotre-de-course').ok);
    assert.equal(d.mobaEmbuscadeArrivee, null);
    assert.equal(d.mobaSortEnAttente, original);
    assert.ok(rpgMobaPasserSort(d, defenseur).ok);
  });
}
