import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgFinDeTour, rpgJouerCreature, rpgNouveauDuel, rpgPeutAttaquer, rpgReglerHasard } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaMulligan, rpgMobaJouerCreature, rpgMobaResoudreSite, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirSiteIA } from '../src/games/rpgMobaAI.js';

function position(side, deuxSites = false) {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMobaMulligan(duel, 'joueur', []).ok && rpgMobaMulligan(duel, 'sorcier', []).ok);
  if (side === 'sorcier') rpgFinDeTour(duel);
  duel[side].main = ['gardienne-des-portes-de-sable'];
  const intacte = rpgMobaJouerCreature(duel, side, 'gardienne-des-portes-de-sable', 'right', 0).entite;
  assert.ok(intacte);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel[side].main = ['gardienne-des-portes-de-sable', 'source-de-bimini'];
  const blessee = rpgMobaJouerCreature(duel, side, 'gardienne-des-portes-de-sable', 'right', 1).entite;
  const site = rpgMobaJouerCreature(duel, side, 'source-de-bimini', 'left', 0).entite;
  assert.ok(blessee && site);
  blessee.pv = blessee.def = 1;
  site.heures.restants = 1;
  let site2 = null;
  if (deuxSites) {
    duel[side].main.push('source-de-bimini');
    site2 = rpgMobaJouerCreature(duel, side, 'source-de-bimini', 'left', 1).entite;
    assert.ok(site2); site2.heures.restants = 1;
  }
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  return { duel, intacte, blessee, site, site2 };
}

for (const side of ['joueur', 'sorcier']) {
  test(`${side} : la Source attend un vrai choix et soigne la créature blessée plutôt que son équivalent intact`, () => {
    const { duel, intacte, blessee, site } = position(side);
    assert.equal(duel.siteEnAttente?.entiteId, site.id);
    assert.equal(duel.phase, 'debut');
    const avant = JSON.stringify(duel);
    let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
    const choix = rpgMobaChoisirSiteIA(duel, side);
    assert.equal(choix, blessee.id);
    assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0);
    assert.ok(rpgMobaResoudreSite(duel, side, choix).ok);
    assert.equal(duel.phase, 'principale'); assert.equal(duel.siteEnAttente, null);
    assert.equal(blessee.atk, 4); assert.equal(blessee.pv, 7);
    assert.equal(blessee.tenaciteDisponible, true); assert.equal(blessee.bouclier, 1);
    assert.equal(intacte.atk, 1); assert.equal(intacte.pv, 4);
    assert.ok(duel[side].cimetiere.includes('source-de-bimini'));
    assert.ok(rpgMobaPlacementCoherent(duel));
  });
}

for (const side of ['joueur', 'sorcier']) {
  test(`${side} : deux Sources sont résolues séparément avant de reprendre le tour`, () => {
    const { duel, site, site2 } = position(side, true);
    assert.equal(duel.siteEnAttente?.entiteId, site.id);
    const premier = rpgMobaChoisirSiteIA(duel, side);
    assert.ok(premier && rpgMobaResoudreSite(duel, side, premier).ok);
    assert.equal(duel.phase, 'debut');
    assert.equal(duel.siteEnAttente?.entiteId, site2.id);
    const second = rpgMobaChoisirSiteIA(duel, side);
    assert.ok(second && rpgMobaResoudreSite(duel, side, second).ok);
    assert.equal(duel.siteEnAttente, null); assert.equal(duel.phase, 'principale');
    assert.equal(duel[side].cimetiere.filter((id) => id === 'source-de-bimini').length, 2);
    assert.equal(rpgMobaChoisirSiteIA(duel, side), null);
    assert.ok(rpgMobaPlacementCoherent(duel));
  });
}

test('duel classique : la Source du sorcier reste résolue automatiquement', () => {
  const duel = rpgNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 });
  rpgFinDeTour(duel);
  duel.sorcier.main = ['gardienne-des-portes-de-sable', 'source-de-bimini'];
  const cible = rpgJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable').entite;
  const source = rpgJouerCreature(duel, 'sorcier', 'source-de-bimini').entite;
  assert.ok(cible && source);
  source.heures.restants = 1;
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  assert.equal(duel.siteEnAttente, null);
  assert.equal(cible.atk, 4); assert.equal(cible.pv, 7);
  assert.ok(duel.sorcier.cimetiere.includes('source-de-bimini'));
});

function contexteBimini(side, contexte) {
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMobaMulligan(duel, 'joueur', []).ok && rpgMobaMulligan(duel, 'sorcier', []).ok);
  if (side === 'sorcier') rpgFinDeTour(duel);
  duel[side].main = ['ashigaru-des-braises'];
  const sacrifice = rpgMobaJouerCreature(duel, side, 'ashigaru-des-braises', 'right', 0).entite;
  assert.ok(sacrifice);
  rpgFinDeTour(duel);
  let menace = null;
  if (contexte !== 'aucune') {
    duel[enemy].main = ['ashigaru-des-braises'];
    menace = rpgMobaJouerCreature(duel, enemy, 'ashigaru-des-braises', contexte === 'autreVoie' ? 'right' : 'left', 0).entite;
    assert.ok(menace); menace.atk = 3;
  }
  rpgFinDeTour(duel);
  duel[side].main = ['jarl-au-marteau-de-guerre'];
  const jarl = rpgMobaJouerCreature(duel, side, 'jarl-au-marteau-de-guerre', 'right', 0, { sacrificeIds: [sacrifice.id] }).entite;
  assert.ok(jarl);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel[side].main = ['gardienne-des-portes-de-sable', 'source-de-bimini'];
  const gardienne = rpgMobaJouerCreature(duel, side, 'gardienne-des-portes-de-sable', 'left', 0).entite;
  const source = rpgMobaJouerCreature(duel, side, 'source-de-bimini', 'center', 0).entite;
  assert.ok(gardienne && source); gardienne.pv = gardienne.def = 1; source.heures.restants = 1;
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  assert.equal(duel.siteEnAttente?.entiteId, source.id);
  if (contexte === 'gelee') menace.gelToursRestants = 2;
  if (contexte === 'bouclier') gardienne.bouclier = 1;
  return { duel, enemy, jarl, gardienne, menace };
}

for (const side of ['joueur', 'sorcier']) for (const contexte of ['aucune', 'menace', 'autreVoie', 'gelee', 'bouclier']) {
  test(`${side} : la Source tient compte du contexte (${contexte})`, () => {
    const { duel, jarl, gardienne } = contexteBimini(side, contexte);
    let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
    const avant = JSON.stringify(duel);
    const choix = rpgMobaChoisirSiteIA(duel, side);
    assert.equal(choix, contexte === 'menace' ? gardienne.id : jarl.id);
    assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0);
    assert.ok(rpgMobaResoudreSite(duel, side, choix).ok);
    assert.equal(duel.siteEnAttente, null); assert.equal(duel.phase, 'principale');
    assert.ok(rpgMobaPlacementCoherent(duel));
  });
}

for (const side of ['joueur', 'sorcier']) {
  test(`${side} : la menace prise en compte peut vraiment éliminer la Gardienne non consacrée`, () => {
    const { duel, enemy, jarl, gardienne, menace } = contexteBimini(side, 'menace');
    const essai = JSON.parse(JSON.stringify(duel));
    rpgReglerHasard(essai, () => .5);
    assert.ok(rpgMobaResoudreSite(essai, side, jarl.id).ok);
    rpgFinDeTour(essai);
    assert.equal(essai.tour, enemy);
    const annonce = rpgMobaDeclarerAttaqueIndividuelle(essai, enemy, menace.id, gardienne.id, 'left');
    assert.ok(annonce.ok, JSON.stringify(annonce));
    assert.ok(rpgMobaResoudreAttaqueIndividuelle(essai, enemy).ok);
    assert.equal(essai[side].creatures.some((e) => e.id === gardienne.id), false);
    assert.ok(rpgMobaResoudreSite(duel, side, gardienne.id).ok);
    rpgFinDeTour(duel);
    assert.ok(rpgMobaDeclarerAttaqueIndividuelle(duel, enemy, menace.id, gardienne.id, 'left').ok);
    assert.ok(rpgMobaResoudreAttaqueIndividuelle(duel, enemy).ok);
    assert.ok(duel[side].creatures.some((e) => e.id === gardienne.id));
    assert.ok(rpgMobaPlacementCoherent(duel));
  });
}

for (const side of ['joueur', 'sorcier']) {
  test(`${side} : à valeurs égales la Source privilégie une créature capable d'attaquer`, () => {
    const { duel, intacte, blessee } = position(side);
    blessee.pv = blessee.def = 4;
    intacte.nePeutPasAttaquer = true;
    assert.ok(!rpgPeutAttaquer(intacte) && rpgPeutAttaquer(blessee));
    const avant = JSON.stringify(duel);
    assert.equal(rpgMobaChoisirSiteIA(duel, side), blessee.id);
    assert.equal(JSON.stringify(duel), avant);
    assert.ok(rpgMobaResoudreSite(duel, side, blessee.id).ok);
  });
}
