import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgFinDeTour, rpgReglerHasard, rpgAvecCompteurEntitesIsole } from '../src/games/rpgDuel.js';
import { mobaInfliger, mobaVoie } from '../src/games/rpgMoba.js';
import { rpgMobaNouveauDuel, rpgMobaMulligan, rpgMobaJouerCreature, rpgMobaLancerMagie, rpgMobaResoudreRecherche, rpgMobaCandidatsRecherche, rpgMobaResoudreArrivee, rpgMobaPasserEffetCreature, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirArriveeIA, rpgMobaChoisirRechercheIA } from '../src/games/rpgMobaAI.js';

function partie(side) {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.equal(rpgMobaMulligan(duel, 'joueur', []).ok, true);
  assert.equal(rpgMobaMulligan(duel, 'sorcier', []).ok, true);
  if (side === 'sorcier') rpgFinDeTour(duel);
  duel[side].main = ['reanimation'];
  return duel;
}

for (const side of ['joueur', 'sorcier']) {
  test(`${side} : réanimation choisit une créature utile plutôt que la première du cimetière`, () => {
    const duel = partie(side);
    duel[side].cimetiere = ['jarl-au-marteau-de-guerre', 'ashigaru-des-braises'];
    assert.equal(rpgMobaLancerMagie(duel, side, 'reanimation', null, 'left', null, { emplacementReanimation: 0 }).ok, true);
    assert.deepEqual(rpgMobaCandidatsRecherche(duel, side), ['ashigaru-des-braises', 'jarl-au-marteau-de-guerre']);
    let jets = 0;
    rpgReglerHasard(duel, () => { jets++; return .5; });
    const avant = JSON.stringify(duel);
    const choix = rpgMobaChoisirRechercheIA(duel, side);
    assert.equal(choix, 'jarl-au-marteau-de-guerre');
    assert.equal(JSON.stringify(duel), avant, 'la réflexion ne modifie pas la partie');
    assert.equal(jets, 0, 'la réflexion ne consomme pas le hasard réel');
    assert.equal(rpgMobaResoudreRecherche(duel, side, choix).ok, true);
    assert.equal(duel[side].creatures[0].carteId, choix);
    assert.equal(mobaVoie(duel.moba, 'left').slots[side][0], duel[side].creatures[0].id);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  });

  test(`${side} : la réanimation tient compte du soin à l'arrivée dans la voie choisie`, () => {
    const duel = partie(side);
    const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
    mobaInfliger(duel.moba, enemy, 'right', 7);
    duel[side].cimetiere = ['porteuse-de-cruches', 'loup-des-neiges'];
    assert.equal(rpgMobaLancerMagie(duel, side, 'reanimation', null, 'right', null, { emplacementReanimation: 1 }).ok, true);
    assert.deepEqual(rpgMobaCandidatsRecherche(duel, side), ['loup-des-neiges', 'porteuse-de-cruches']);
    const avant = JSON.stringify(duel);
    assert.equal(rpgMobaChoisirRechercheIA(duel, side), 'porteuse-de-cruches');
    assert.equal(JSON.stringify(duel), avant);
    assert.equal(rpgMobaResoudreRecherche(duel, side, 'porteuse-de-cruches').ok, true);
    assert.equal(mobaVoie(duel.moba, 'right').hp[side], 16);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  });
}

test('Ralliement : comparer les renforts légaux sans consommer les autres cartes', () => {
  const duel = partie('joueur');
  duel.joueur.main = ['ralliement-des-neiges', 'faucon-du-zenith', 'jarl-au-marteau-de-guerre'];
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'ralliement-des-neiges').ok, true);
  assert.deepEqual(rpgMobaCandidatsRecherche(duel, 'joueur'), ['jarl-au-marteau-de-guerre', 'faucon-du-zenith']);
  const etat = JSON.stringify(duel);
  const choix = rpgMobaChoisirRechercheIA(duel, 'joueur');
  assert.equal(choix, 'faucon-du-zenith');
  assert.equal(JSON.stringify(duel), etat);
  assert.equal(rpgMobaResoudreRecherche(duel, 'joueur', choix).ok, true);
  assert.deepEqual(duel.joueur.main, ['jarl-au-marteau-de-guerre']);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
  assert.equal(rpgMobaChoisirRechercheIA(duel, 'joueur'), null);
});

test('les simulations ne consomment pas les identifiants des entités, même après une exception', () => {
  const duel = partie('joueur');
  duel.joueur.cimetiere = ['jarl-au-marteau-de-guerre', 'ashigaru-des-braises'];
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'reanimation', null, 'left', null, { emplacementReanimation: 0 }).ok, true);
  const autre = partie('joueur');
  autre.joueur.main = ['ashigaru-des-braises'];
  const premier = rpgMobaJouerCreature(autre, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  assert.ok(premier);
  assert.equal(rpgMobaChoisirRechercheIA(duel, 'joueur'), 'jarl-au-marteau-de-guerre');
  assert.throws(() => rpgAvecCompteurEntitesIsole(() => {
    const copie = JSON.parse(JSON.stringify(duel));
    assert.equal(rpgMobaResoudreRecherche(copie, 'joueur', 'ashigaru-des-braises').ok, true);
    throw new Error('simulation interrompue');
  }), /simulation interrompue/);
  rpgFinDeTour(autre); rpgFinDeTour(autre);
  autre.joueur.main = ['ashigaru-des-braises'];
  const deuxieme = rpgMobaJouerCreature(autre, 'joueur', 'ashigaru-des-braises', 'left', 1).entite;
  assert.ok(deuxieme);
  assert.equal(Number(deuxieme.id.split('-')[1]), Number(premier.id.split('-')[1]) + 1);
});

for (const side of ['joueur', 'sorcier']) for (const victoire of [false, true]) {
  test(`${side} : réanimer le Maître permet ${victoire ? 'la victoire immédiate' : 'une première conquête'}`, () => {
    const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
    const duel = partie(enemy);
    duel[enemy].main = ['gardienne-des-portes-de-sable'];
    assert.ok(rpgMobaJouerCreature(duel, enemy, 'gardienne-des-portes-de-sable', 'right', 0).ok);
    rpgFinDeTour(duel);
    if (victoire) assert.ok(mobaInfliger(duel.moba, side, 'left', 20).conquered);
    mobaInfliger(duel.moba, side, 'right', 17);
    duel[side].main = ['reanimation'];
    duel[side].cimetiere = ['maitre-du-marteau', 'jarl-au-marteau-de-guerre'];
    assert.ok(rpgMobaLancerMagie(duel, side, 'reanimation', null, 'right', null, { emplacementReanimation: 0 }).ok);
    assert.deepEqual(rpgMobaCandidatsRecherche(duel, side), ['jarl-au-marteau-de-guerre', 'maitre-du-marteau']);
    const avant = JSON.stringify(duel);
    let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
    assert.equal(rpgMobaChoisirRechercheIA(duel, side), 'maitre-du-marteau');
    assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0);
    assert.ok(rpgMobaResoudreRecherche(duel, side, 'maitre-du-marteau').ok);
    assert.ok(rpgMobaResoudreArrivee(duel, side, 'sorcier').ok);
    if (duel.effetCreatureEnAttente) assert.ok(rpgMobaPasserEffetCreature(duel, enemy).ok);
    assert.equal(mobaVoie(duel.moba, 'right').conqueredBy, side);
    assert.equal(duel.moba.winner, victoire ? side : null);
    assert.ok(rpgMobaPlacementCoherent(duel));
  });
}

for (const side of ['joueur', 'sorcier']) {
  test(`${side} : le renfort tient compte des deux frappes de l’Oni`, () => {
    const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
    const duel = partie(enemy);
    duel[enemy].main = ['ashigaru-des-braises'];
    const premier = rpgMobaJouerCreature(duel, enemy, 'ashigaru-des-braises', 'right', 0).entite;
    assert.ok(premier);
    rpgFinDeTour(duel); rpgFinDeTour(duel);
    duel[enemy].main = ['ashigaru-des-braises'];
    const second = rpgMobaJouerCreature(duel, enemy, 'ashigaru-des-braises', 'right', 1).entite;
    assert.ok(second);
    for (const e of [premier, second]) Object.assign(e, { atk: 5, pv: 3, pvMax: 3, def: 3 });
    rpgFinDeTour(duel);
    duel[side].main = ['reanimation'];
    duel[side].cimetiere = ['oni-de-la-fournaise', 'maitre-du-marteau'];
    assert.ok(rpgMobaLancerMagie(duel, side, 'reanimation', null, 'right', null, { emplacementReanimation: 0 }).ok);
    assert.deepEqual(rpgMobaCandidatsRecherche(duel, side), ['maitre-du-marteau', 'oni-de-la-fournaise']);
    const avant = JSON.stringify(duel);
    let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
    assert.equal(rpgMobaChoisirRechercheIA(duel, side), 'oni-de-la-fournaise');
    assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0);
    assert.ok(rpgMobaResoudreRecherche(duel, side, 'oni-de-la-fournaise').ok);
    for (let i = 0; i < 2; i++) {
      const cible = rpgMobaChoisirArriveeIA(duel, side);
      assert.ok(cible); assert.ok(rpgMobaResoudreArrivee(duel, side, cible).ok);
    }
    if (duel.effetCreatureEnAttente) assert.ok(rpgMobaPasserEffetCreature(duel, enemy).ok);
    assert.equal(duel[enemy].creatures.length, 0);
    assert.ok(rpgMobaPlacementCoherent(duel));
  });
}

for (const side of ['joueur', 'sorcier']) {
  test(`${side} : le renfort prend en compte la réponse passée à l’arrivée hostile`, () => {
    const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
    const duel = partie(enemy);
    duel[enemy].main = ['ashigaru-des-braises'];
    const cible = rpgMobaJouerCreature(duel, enemy, 'ashigaru-des-braises', 'right', 0).entite;
    assert.ok(cible);
    cible.atk = 6;
    rpgFinDeTour(duel);
    duel[side].main = ['reanimation'];
    duel[side].cimetiere = ['tour-de-braise', 'jarl-au-marteau-de-guerre'];
    assert.ok(rpgMobaLancerMagie(duel, side, 'reanimation', null, 'right', null, { emplacementReanimation: 0 }).ok);
    duel[enemy].main = ['parade-du-verre'];
    const avant = JSON.stringify(duel);
    assert.equal(rpgMobaChoisirRechercheIA(duel, side), 'tour-de-braise');
    assert.equal(JSON.stringify(duel), avant);
    assert.ok(rpgMobaResoudreRecherche(duel, side, 'tour-de-braise').ok);
    assert.ok(rpgMobaResoudreArrivee(duel, side, cible.id).ok);
    assert.ok(duel.effetCreatureEnAttente, 'la réponse doit bien être passée');
    assert.ok(rpgMobaPasserEffetCreature(duel, enemy).ok);
    assert.equal(duel[enemy].creatures.some(e => e.id === cible.id), false);
    assert.ok(rpgMobaPlacementCoherent(duel));
  });
}
