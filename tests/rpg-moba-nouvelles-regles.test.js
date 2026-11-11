import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgDemarrerManaEssai, rpgFinDeTour, rpgMulligan } from '../src/games/rpgDuel.js';
import { mobaInfliger, mobaSoigner, mobaVoie } from '../src/games/rpgMoba.js';
import { MOBA_DECKS, rpgMobaNouveauDuel, rpgMobaCiblesAttaque, rpgMobaDeclarerAttaque, rpgMobaLancerAttaque, rpgMobaJouerCreature, rpgMobaResoudreArrivee, rpgMobaValiderDeck } from '../src/games/rpgMobaLocal.js';
import { MOBA_DECKS_TOURS, MOBA_DECKS_TOURS_TOTAL, rpgMobaDeckMaison, rpgMobaDeckTourAleatoire } from '../src/games/rpgMobaDecks.js';
import { rpgMobaCombatIndicators } from '../src/games/rpgMobaCombatIndicators.js';

function partie() {
  const duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 });
  rpgMulligan(duel, 'joueur', []); rpgMulligan(duel, 'sorcier', []); rpgDemarrerManaEssai(duel);
  return duel;
}

test('les voies latérales ont 20 PV, le centre 10, avec des plafonds de soin indépendants', () => {
  const duel = partie();
  assert.deepEqual(duel.moba.lanes.map((lane) => [lane.hp.joueur, lane.hp.sorcier]), [[20,20],[10,10],[20,20]]);
  for (const lane of duel.moba.lanes) {
    mobaInfliger(duel.moba, 'sorcier', lane.id, 1);
    assert.equal(mobaSoigner(duel.moba, 'joueur', lane.id, 99).healing, 1);
    assert.equal(lane.hp.joueur, lane.id === 'center' ? 10 : 20);
  }
});

for (const side of ['joueur', 'sorcier']) for (const lane of ['left', 'right']) for (const declaree of [false, true]) test(`Attaque ciblée centrale : ${side} vise ${lane}, déclarée ${declaree}`, () => {
  const duel = partie(), enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  if (enemy === 'sorcier') rpgFinDeTour(duel);
  duel[enemy].mana.braise = 20;
  const cible = rpgMobaJouerCreature(duel, enemy, 'ashigaru-des-braises', lane, 0).entite;
  cible.pv = cible.pvMax = cible.def = 20;
  rpgFinDeTour(duel);
  duel[side].mana.braise = 20; duel[side].main.push('feriel');
  const attaquant = rpgMobaJouerCreature(duel, side, 'feriel', 'center', 0).entite;
  assert.ok(attaquant && cible);
  assert.deepEqual(rpgMobaCiblesAttaque(duel, side, attaquant.id), { obligatoires: true, cibles: [cible.id] });
  assert.deepEqual(rpgMobaCombatIndicators(duel, side, [attaquant.id]).attackArrows, {});
  assert.deepEqual(rpgMobaCombatIndicators(duel, side, [attaquant.id], { [attaquant.id]: cible.id }).attackArrows, { [cible.id]: [attaquant.id] });
  assert.equal(rpgMobaDeclarerAttaque(duel, side, [attaquant.id]).raison, 'cible-obligatoire');
  const choix = { [attaquant.id]: cible.id };
  if (declaree) assert.equal(rpgMobaDeclarerAttaque(duel, side, [attaquant.id], choix).ok, true);
  const result = rpgMobaLancerAttaque(duel, side, [attaquant.id], {}, { declaree, ciblesAttaque: choix });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.ok(cible.pv < 20);
  assert.equal(mobaVoie(duel.moba, lane).hp[enemy], 20);
  assert.equal(mobaVoie(duel.moba, 'center').hp[enemy], 10);
});

test('une arrivée ciblée centrale peut choisir une créature latérale', () => {
  const duel = partie(); duel.joueur.mana.braise = 20;
  const cible = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 0).entite;
  rpgFinDeTour(duel); duel.sorcier.mana.braise = 20; duel.sorcier.main.push('lionne-du-midi-ardent');
  assert.equal(rpgMobaJouerCreature(duel, 'sorcier', 'lionne-du-midi-ardent', 'center', 0).ok, true);
  assert.equal(rpgMobaResoudreArrivee(duel, 'sorcier', cible.id).ok, true);
  assert.equal(rpgMobaValiderDeck(MOBA_DECKS[0]).ok, true);
});

test('le tirage IA utilise les decks des tours intacts et audités, et les decks maison gardent leur identité', () => {
  assert.ok(MOBA_DECKS_TOURS.length > 1);
  assert.ok(MOBA_DECKS_TOURS.length <= MOBA_DECKS_TOURS_TOTAL);
  for (const deck of MOBA_DECKS) assert.equal(rpgMobaValiderDeck(deck).ok, true, deck.name);
  for (const deck of MOBA_DECKS_TOURS) assert.equal(rpgMobaValiderDeck(deck).ok, true, deck.name);
  assert.equal(rpgMobaDeckTourAleatoire(() => 0), MOBA_DECKS_TOURS[0]);
  assert.equal(rpgMobaDeckTourAleatoire(() => .999999), MOBA_DECKS_TOURS.at(-1));
  const maison = rpgMobaDeckMaison({ id: 'maison-test', nom: 'Mon deck', element: 'neige', cardIds: [] });
  assert.equal(maison.name, 'Mon deck'); assert.deepEqual(maison.elements, ['neige']);
  assert.equal(rpgMobaValiderDeck(maison).ok, false);
});

test('un Défenseur latéral ne force pas l’attaque ciblée du centre, y compris pour l’IA', async () => {
  const { rpgMobaChoisirAttaqueIndividuelleIA } = await import('../src/games/rpgMobaAI.js');
  const duel = partie();
  duel.joueur.main = ['gardienne-des-portes-de-sable'];
  const droite = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 0).entite;
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel.joueur.main = ['ashigaru-des-braises'];
  const gauche = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(duel);
  duel.sorcier.main = ['ashigaru-des-braises'];
  const attaquant = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'center', 0).entite;
  attaquant.coupRapide = true; attaquant.ready = true;
  assert.deepEqual(rpgMobaCiblesAttaque(duel, 'sorcier', attaquant.id), { obligatoires: false, cibles: [droite.id, gauche.id] });
  const choix = rpgMobaChoisirAttaqueIndividuelleIA(duel, 'sorcier');
  assert.ok(choix && [null, gauche.id, droite.id].includes(choix.cibleId));
  assert.equal(rpgMobaDeclarerAttaque(duel, 'sorcier', [attaquant.id], { [attaquant.id]: gauche.id }).ok, true);
});
