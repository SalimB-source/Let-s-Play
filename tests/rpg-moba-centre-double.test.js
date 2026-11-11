import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgDemarrerManaEssai, rpgFinDeTour, rpgMulligan, rpgReglerHasard } from '../src/games/rpgDuel.js';
import { mobaInfliger, mobaVoie } from '../src/games/rpgMoba.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaLancerMagie, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';
import { rpgMobaCiblesIndividuelles } from '../src/games/rpgMobaAttaqueIndividuelle.js';
import { rpgMobaChoisirAttaqueIndividuelleIA, rpgMobaChoisirMagieIA } from '../src/games/rpgMobaAI.js';

function partie() {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  for (const side of ['joueur', 'sorcier']) Object.assign(d[side].mana, { sable: 30, braise: 30, tenebres: 30, eau: 30, neige: 30 });
  return d;
}
function tour(d, side) { if (d.tour !== side) rpgFinDeTour(d); assert.equal(d.tour, side); }
function poser(d, side, id, lane, opts = {}) {
  tour(d, side); d[side].main = [id];
  const result = rpgMobaJouerCreature(d, side, id, lane, 0, opts);
  assert.ok(result.ok, JSON.stringify(result));
  return result.entite;
}
function centre(d, side) { assert.ok(mobaInfliger(d.moba, side, 'center', 15).conquered); }

for (const side of ['joueur', 'sorcier']) {
  const ennemi = side === 'joueur' ? 'sorcier' : 'joueur';
  test(`${side} : le transfert d'arrivée du centre touche chaque flanc et émet deux événements`, () => {
    const d = partie(); tour(d, side); centre(d, side);
    mobaInfliger(d.moba, ennemi, 'left', 4); mobaInfliger(d.moba, ennemi, 'right', 4);
    d[side].main = ['pretre-de-la-bouche'];
    const result = rpgMobaJouerCreature(d, side, 'pretre-de-la-bouche', 'center', 0);
    assert.ok(result.ok, JSON.stringify(result));
    for (const lane of ['left', 'right']) {
      assert.equal(mobaVoie(d.moba, lane).hp[side], 17);
      assert.equal(mobaVoie(d.moba, lane).hp[ennemi], 19);
    }
    assert.deepEqual(result.damageEvents.map((e) => e.laneId).sort(), ['left', 'right']);
    assert.deepEqual(result.healingEvents.map((e) => e.laneId).sort(), ['left', 'right']);
    assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`${side} : le transfert à la mort du centre touche les deux flancs`, () => {
    const d = partie(); tour(d, side); centre(d, side);
    mobaInfliger(d.moba, ennemi, 'left', 4); mobaInfliger(d.moba, ennemi, 'right', 4);
    const ouvrier = poser(d, side, 'ouvrier-du-natron', 'center');
    d[side].main = ['effacement-des-faibles'];
    const result = rpgMobaLancerMagie(d, side, 'effacement-des-faibles', ouvrier.id);
    assert.ok(result.ok, JSON.stringify(result));
    for (const lane of ['left', 'right']) {
      assert.equal(mobaVoie(d.moba, lane).hp[side], 17);
      assert.equal(mobaVoie(d.moba, lane).hp[ennemi], 19);
    }
    assert.deepEqual(result.damageEvents.map((e) => e.laneId).sort(), ['left', 'right']);
    assert.deepEqual(result.healingEvents.map((e) => e.laneId).sort(), ['left', 'right']);
    assert.ok(rpgMobaPlacementCoherent(d));
  });
  for (const flank of ['left', 'right']) test(`${side} : frappe directe du centre par ${flank}`, () => {
    const d = partie(); tour(d, side); centre(d, side);
    const source = poser(d, side, 'ashigaru-des-braises', 'center');
    source.ready = true;
    assert.equal(rpgMobaDeclarerAttaqueIndividuelle(d, side, source.id, null).raison, 'voie-obligatoire');
    assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, side, source.id, null, flank).ok);
    const result = rpgMobaResoudreAttaqueIndividuelle(d, side);
    assert.ok(result.ok, JSON.stringify(result));
    assert.ok(mobaVoie(d.moba, flank).hp[ennemi] < 20);
    assert.equal(mobaVoie(d.moba, flank === 'left' ? 'right' : 'left').hp[ennemi], 20);
    assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`${side} : le Défenseur central protège les deux voies contre les attaques ciblées`, () => {
    const d = partie(); tour(d, ennemi); centre(d, ennemi);
    const garde = poser(d, ennemi, 'gardienne-des-portes-de-sable', 'center');
    const attaquant = poser(d, side, 'ashigaru-des-braises', 'left');
    attaquant.ready = true; attaquant.coupRapide = true;
    assert.deepEqual(rpgMobaCiblesIndividuelles(d, side, attaquant.id), { cibles: [garde.id], directe: false });
    assert.equal(rpgMobaDeclarerAttaqueIndividuelle(d, side, attaquant.id, null).raison, 'cible');
    assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, side, attaquant.id, garde.id).ok);
  });
  test(`${side} : l'IA transmet une voie pour l'attaque depuis le centre`, () => {
    const d = partie(); tour(d, side); centre(d, side);
    const source = poser(d, side, 'ashigaru-des-braises', 'center'); source.ready = true;
    const avant = JSON.stringify(d);
    const choix = rpgMobaChoisirAttaqueIndividuelleIA(d, side);
    assert.ok(choix && ['left', 'right'].includes(choix.voie), JSON.stringify(choix));
    assert.equal(JSON.stringify(d), avant);
    assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, side, choix.attaquantId, choix.cibleId, choix.voie).ok);
  });
}

test('Braisier au centre : zone sur les deux flancs et un seul impact par créature', () => {
  const d = partie();
  const left = poser(d, 'sorcier', 'viking-des-neiges', 'left');
  tour(d, 'joueur'); tour(d, 'sorcier');
  const right = poser(d, 'sorcier', 'viking-des-neiges', 'right');
  const old = [left.pv, right.pv];
  tour(d, 'joueur'); centre(d, 'joueur');
  d.joueur.main = ['braisier-du-souk'];
  const result = rpgMobaJouerCreature(d, 'joueur', 'braisier-du-souk', 'center', 0);
  assert.ok(result.ok, JSON.stringify(result));
  assert.equal(left.pv, old[0] - 1); assert.equal(right.pv, old[1] - 1);
  assert.equal(mobaVoie(d.moba, 'left').hp.sorcier, 19);
  assert.equal(mobaVoie(d.moba, 'right').hp.sorcier, 19);
  assert.deepEqual(result.damageEvents.map((e) => e.laneId).sort(), ['left', 'right']);
  assert.ok(rpgMobaPlacementCoherent(d));
});

test('une zone de flanc touche une fois la créature centrale adverse', () => {
  const d = partie(); centre(d, 'joueur');
  const cible = poser(d, 'joueur', 'viking-des-neiges', 'center');
  cible.pv = cible.pvMax = cible.def = 6;
  const pv = cible.pv;
  tour(d, 'sorcier');
  d.sorcier.main = ['nuage-de-cendres'];
  const result = rpgMobaLancerMagie(d, 'sorcier', 'nuage-de-cendres', null, 'right');
  assert.ok(result.ok, JSON.stringify(result));
  assert.equal(cible.pv, pv - 2);
  assert.ok(rpgMobaPlacementCoherent(d));
});

test('le brouillard de la voie choisie arrête les deux blessures de l’échange central', () => {
  const d = partie();
  const defenseur = poser(d, 'sorcier', 'gardienne-des-portes-de-sable', 'left');
  tour(d, 'joueur'); centre(d, 'joueur');
  const source = poser(d, 'joueur', 'viking-des-neiges', 'center'); source.ready = true;
  const avant = [source.pv, defenseur.pv];
  d.brouillardCombatVoies = ['left'];
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', source.id, defenseur.id, 'left').ok);
  const resultat = rpgMobaResoudreAttaqueIndividuelle(d, 'joueur');
  assert.ok(resultat.ok);
  assert.deepEqual(resultat.resume.blessures, []);
  assert.deepEqual([source.pv, defenseur.pv], avant);
});

test('la conquête effective d’un flanc ne retire pas la créature centrale adverse', () => {
  const d = partie(); centre(d, 'joueur');
  const centrale = poser(d, 'joueur', 'ashigaru-des-braises', 'center');
  const attaque = poser(d, 'sorcier', 'ashigaru-des-braises', 'left');
  attaque.ready = true; attaque.coupRapide = true;
  mobaVoie(d.moba, 'left').hp.joueur = 1;
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'sorcier', attaque.id, null).ok);
  const resultat = rpgMobaResoudreAttaqueIndividuelle(d, 'sorcier');
  assert.ok(resultat.ok, JSON.stringify(resultat));
  assert.equal(mobaVoie(d.moba, 'left').active, false);
  assert.ok(d.joueur.creatures.includes(centrale));
  assert.equal(mobaVoie(d.moba, 'center').slots.joueur[0], centrale.id);
  assert.ok(rpgMobaPlacementCoherent(d));
  tour(d, 'joueur'); centrale.ready = true;
  assert.equal(rpgMobaCiblesIndividuelles(d, 'joueur', centrale.id, 'right').directe, true);
});

test('Ténacité revient dans sa case centrale encore jouable', () => {
  const d = partie(); centre(d, 'joueur');
  const cible = poser(d, 'joueur', 'ashigaru-des-braises', 'center');
  cible.tenaciteDisponible = true;
  d.joueur.main = ['effacement-des-faibles'];
  assert.ok(rpgMobaLancerMagie(d, 'joueur', 'effacement-des-faibles', cible.id).ok);
  assert.equal(d.joueur.creatures.includes(cible), false);
  assert.equal(d.joueur.retoursProgrammes[0]?.mobaLane, 'center');
  rpgFinDeTour(d); rpgFinDeTour(d);
  const revenue = d.joueur.creatures.find((e) => e.carteId === 'ashigaru-des-braises');
  assert.ok(revenue);
  assert.notEqual(revenue.id, cible.id);
  assert.equal(revenue.mobaLane, 'center');
  assert.equal(mobaVoie(d.moba, 'center').slots.joueur[0], revenue.id);
  assert.ok(rpgMobaPlacementCoherent(d));
});

test('le Passeur central réanime une créature sur un flanc partagé', () => {
  const d = partie(); centre(d, 'joueur');
  const victime = poser(d, 'joueur', 'ashigaru-des-braises', 'left');
  tour(d, 'sorcier'); tour(d, 'joueur');
  d.joueur.main = ['passeur-au-masque-de-chacal'];
  const result = rpgMobaJouerCreature(d, 'joueur', 'passeur-au-masque-de-chacal', 'center', 0, { sacrificeIds: [victime.id] });
  assert.ok(result.ok, JSON.stringify(result));
  const revenue = d.joueur.creatures.find((e) => e.carteId === 'ashigaru-des-braises');
  assert.ok(revenue); assert.notEqual(revenue.id, victime.id);
  assert.ok(['left', 'right'].includes(revenue.mobaLane));
  assert.ok(rpgMobaPlacementCoherent(d));
});

test('l’IA peut choisir la case centrale conquise pour Réanimation', () => {
  const d = partie(); centre(d, 'joueur');
  for (const [index, lane, slot] of [[0, 'left', 0], [1, 'left', 1], [2, 'right', 0], [3, 'right', 1]]) {
    if (index) { tour(d, 'sorcier'); tour(d, 'joueur'); }
    d.joueur.main = ['ashigaru-des-braises'];
    assert.ok(rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', lane, slot).ok);
  }
  d.joueur.cimetiere = ['viking-des-neiges']; d.joueur.main = ['reanimation'];
  const avant = JSON.stringify(d);
  const choix = rpgMobaChoisirMagieIA(d, 'joueur');
  assert.equal(choix?.id, 'reanimation', JSON.stringify(choix));
  assert.equal(choix.lane, 'center'); assert.equal(choix.emplacementReanimation, 0);
  assert.equal(JSON.stringify(d), avant);
  assert.ok(rpgMobaLancerMagie(d, 'joueur', choix.id, choix.cible, choix.lane, choix.prixLane, { emplacementReanimation: choix.emplacementReanimation }).ok);
  assert.equal(d.joueur.creatures.find((e) => e.carteId === 'viking-des-neiges')?.mobaLane, 'center');
  assert.ok(rpgMobaPlacementCoherent(d));
});

test('la Contre-attaque d’une créature centrale riposte aux deux voies actives', () => {
  const d = partie(); centre(d, 'joueur');
  const source = poser(d, 'joueur', 'viking-des-neiges', 'center');
  source.contreAttaque = true; source.esquive = true; source.esquiveChance = 1; source.atk = 3;
  tour(d, 'sorcier'); d.sorcier.main = ['trait-de-braise']; rpgReglerHasard(d, () => 0);
  const result = rpgMobaLancerMagie(d, 'sorcier', 'trait-de-braise', source.id);
  assert.ok(result.ok, JSON.stringify(result));
  assert.equal(mobaVoie(d.moba, 'left').hp.sorcier, 17);
  assert.equal(mobaVoie(d.moba, 'right').hp.sorcier, 17);
  assert.deepEqual(result.damageEvents.filter((e) => e.contreAttaque).map((e) => e.laneId).sort(), ['left', 'right']);
  assert.ok(rpgMobaPlacementCoherent(d));
});

test('une capacité centrale ne touche que le flanc encore actif après une conquête adverse', () => {
  const d = partie(); centre(d, 'joueur');
  assert.ok(mobaInfliger(d.moba, 'sorcier', 'left', 20).conquered);
  d.joueur.main = ['braisier-du-souk'];
  const result = rpgMobaJouerCreature(d, 'joueur', 'braisier-du-souk', 'center', 0);
  assert.ok(result.ok, JSON.stringify(result));
  assert.equal(mobaVoie(d.moba, 'left').hp.sorcier, 20);
  assert.equal(mobaVoie(d.moba, 'right').hp.sorcier, 19);
  assert.deepEqual(result.damageEvents.map((e) => e.laneId), ['right']);
  assert.equal(result.entite.mobaLane, 'center');
  assert.ok(rpgMobaPlacementCoherent(d));
});

test('une capacité centrale qui conquiert un flanc met fin à la partie sans retirer sa source', () => {
  const d = partie(); centre(d, 'joueur');
  mobaVoie(d.moba, 'right').hp.sorcier = 1;
  d.joueur.main = ['braisier-du-souk'];
  const result = rpgMobaJouerCreature(d, 'joueur', 'braisier-du-souk', 'center', 0);
  assert.ok(result.ok, JSON.stringify(result));
  assert.equal(d.moba.winner, 'joueur');
  assert.equal(mobaVoie(d.moba, 'center').slots.joueur[0], result.entite.id);
  assert.ok(d.joueur.creatures.includes(result.entite));
  assert.ok(rpgMobaPlacementCoherent(d));
});
