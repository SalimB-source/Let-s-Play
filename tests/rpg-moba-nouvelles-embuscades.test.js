import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { rpgDemarrerManaEssai, rpgFinDeTour, rpgMulligan } from '../src/games/rpgDuel.js';
import { sacrificesInvocation } from '../src/games/rpgInvocation.js';
import { MOBA_EMBUSCADES_CONDITIONS, rpgMobaConditionSpeciale } from '../src/games/rpgMobaEmbuscades.js';
import { rpgMobaCartePourApercu, rpgMobaNotesCarte } from '../src/games/rpgMobaPresentation.js';
import { rpgMobaChoisirEmbuscadeIA, rpgMobaChoisirCreatureIA } from '../src/games/rpgMobaAI.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaPasserCreature, rpgMobaPeutEmbuscade, rpgMobaPeutPayer, rpgMobaPlacementCoherent, rpgMobaSacrificesInvocation } from '../src/games/rpgMobaLocal.js';

function partie() {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  for (const side of ['joueur', 'sorcier']) Object.assign(d[side].mana, { sable: 30, braise: 30, eau: 30, neige: 30, tenebres: 30 });
  return d;
}
function poser(d, side, id, slot = 0, lane = 'left') {
  d.moba.creaturesJouees[side] = false; // Préparer plusieurs alliés en raccourcissant les tours du fixture.
  d[side].main.push(id);
  const pose = rpgMobaJouerCreature(d, side, id, lane, slot);
  assert.ok(pose.entite, `${id}: ${JSON.stringify(pose)}`);
  return pose.entite;
}

const conditions = [
  ['faiseur-de-passage', (d) => poser(d, 'joueur', 'gardienne-des-portes-de-sable')],
  ['ghul-des-cendres', (d) => poser(d, 'joueur', 'djinn-du-dernier-brasier')],
  ['feriel', (d) => { poser(d, 'joueur', 'gardienne-des-portes-de-sable'); poser(d, 'joueur', 'ashigaru-des-braises', 1); }],
  ['veilleuse-des-citernes', (d) => { const e = poser(d, 'joueur', 'viking-des-neiges'); e.pv -= 1; }],
  ['volva-soigneuse', (d) => { const e = poser(d, 'joueur', 'viking-des-neiges'); e.pv -= 1; }],
  ['kenshi-de-la-forge', (d) => poser(d, 'joueur', 'samourai-du-torii')],
  ['pretre-de-la-bouche', (d) => { d.moba.lanes[0].hp.joueur -= 1; }],
  ['pilote-de-la-carreira', () => {}],
  ['corbeau-de-givre', (d) => { rpgFinDeTour(d); poser(d, 'sorcier', 'ashigaru-des-braises'); rpgFinDeTour(d); }],
];

for (const [id, preparer] of conditions) test(`${id} : condition, invocation spéciale gratuite en sacrifices et indépendante du quota`, () => {
  const d = partie();
  assert.ok(MOBA_EMBUSCADES_CONDITIONS[id]);
  assert.ok(rpgMobaNotesCarte(cardById(id)).some((note) => note.includes(MOBA_EMBUSCADES_CONDITIONS[id])));
  assert.equal(rpgMobaCartePourApercu(cardById(id)).reactionTourAdverse, true);
  assert.equal(cardById(id).reactionTourAdverse, undefined, 'le catalogue hors MOBA reste inchangé');
  d.joueur.main = [id];
  if (id !== 'pilote-de-la-carreira') assert.equal(rpgMobaConditionSpeciale(d, 'joueur', id), false);
  preparer(d);
  if (!d.joueur.main.includes(id)) d.joueur.main.push(id);
  assert.equal(rpgMobaConditionSpeciale(d, 'joueur', id), true);
  assert.equal(rpgMobaPeutEmbuscade(d, 'joueur', id), true);
  assert.equal(rpgMobaSacrificesInvocation(d, 'joueur', cardById(id)), 0);
  assert.equal(rpgMobaPeutPayer(d, 'joueur', cardById(id)), true);
  const slot = d.moba.lanes[2].slots.joueur.indexOf(null);
  const quotaAvant = d.moba.creaturesJouees.joueur;
  const announced = rpgMobaJouerCreature(d, 'joueur', id, 'right', slot, { ouvrirReponse: true, sacrificeIds: [] });
  assert.equal(announced.creatureEnAttente, true, JSON.stringify(announced));
  assert.equal(d.mobaCreatureEnAttente.invocationSpecialeMoba, true);
  assert.equal(d.moba.creaturesJouees.joueur, quotaAvant, 'quota normal inchangé');
  assert.equal(rpgMobaPasserCreature(d, 'sorcier').ok, true);
  assert.ok(rpgMobaPlacementCoherent(d));
});

test('plusieurs invocations spéciales s’enchaînent après l’invocation normale, mais chaque condition est revérifiée', () => {
  const d = partie();
  d.joueur.main = ['gardienne-des-portes-de-sable', 'faiseur-de-passage', 'faiseur-de-passage', 'ghul-des-cendres'];
  poser(d, 'joueur', 'gardienne-des-portes-de-sable');
  assert.equal(d.moba.creaturesJouees.joueur, true);
  assert.equal(rpgMobaPeutEmbuscade(d, 'joueur', 'ghul-des-cendres'), false);
  for (const slot of [0, 1]) {
    assert.equal(rpgMobaPeutEmbuscade(d, 'joueur', 'faiseur-de-passage'), true);
    assert.ok(rpgMobaJouerCreature(d, 'joueur', 'faiseur-de-passage', 'right', slot, { ouvrirReponse: true, sacrificeIds: [] }).creatureEnAttente);
    assert.ok(rpgMobaPasserCreature(d, 'sorcier').ok);
  }
  assert.equal(d.moba.creaturesJouees.joueur, true);
  assert.equal(d.moba.embuscadesJouees.joueur, true);
  assert.equal(rpgMobaPeutEmbuscade(d, 'joueur', 'ghul-des-cendres'), false);
  assert.equal(rpgMobaPeutPayer(d, 'joueur', cardById('ghul-des-cendres')), false);
  assert.equal(rpgMobaJouerCreature(d, 'joueur', 'ghul-des-cendres', 'right', 2).ok, false);
});

test('sans condition la pose reste normale, et une Embuscade imprimée de coût 6 ne sacrifie pas', () => {
  const d = partie();
  d.joueur.main = ['ghul-des-cendres'];
  assert.equal(rpgMobaPeutEmbuscade(d, 'joueur', 'ghul-des-cendres'), false);
  assert.ok(rpgMobaJouerCreature(d, 'joueur', 'ghul-des-cendres', 'left', 0).entite);
  assert.equal(d.moba.creaturesJouees.joueur, true);
  assert.equal(sacrificesInvocation(cardById('tojiro-le-pourfendeur'), d, 'joueur'), 1);
  assert.equal(sacrificesInvocation(cardById('tojiro-le-pourfendeur'), d, 'joueur', true), 0);
});

test('Navire en main et voie à PV égaux éteignent leurs conditions', () => {
  const d = partie();
  d.joueur.main = ['pilote-de-la-carreira', 'drakkar-a-tete-de-dragon', 'pretre-de-la-bouche'];
  assert.equal(rpgMobaConditionSpeciale(d, 'joueur', 'pilote-de-la-carreira'), false);
  assert.equal(rpgMobaConditionSpeciale(d, 'joueur', 'pretre-de-la-bouche'), false);
  d.joueur.main.splice(1, 1);
  assert.equal(rpgMobaConditionSpeciale(d, 'joueur', 'pilote-de-la-carreira'), true);
});

test('hors tour, le Pilote répond à une annonce et son invocation suspend puis reprend celle-ci', () => {
  const d = partie();
  d.joueur.main = ['ashigaru-des-braises'];
  d.sorcier.main = ['pilote-de-la-carreira'];
  assert.ok(rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', 'left', 0, { ouvrirReponse: true }).creatureEnAttente);
  assert.equal(rpgMobaPeutEmbuscade(d, 'sorcier', 'pilote-de-la-carreira'), true);
  const avant = JSON.stringify(d);
  const choix = rpgMobaChoisirEmbuscadeIA(d, 'sorcier');
  assert.equal(choix?.id, 'pilote-de-la-carreira');
  assert.equal(JSON.stringify(d), avant, 'l’IA ne change pas la partie lors de sa simulation');
  assert.ok(rpgMobaJouerCreature(d, 'sorcier', choix.id, choix.lane, choix.slot, { ouvrirReponse: true, sacrificeIds: [] }).creatureEnAttente);
  assert.equal(d.mobaCreatureEnAttente.invocationSpecialeMoba, true);
  assert.ok(rpgMobaPasserCreature(d, 'joueur').entite);
  assert.equal(d.mobaCreatureEnAttente?.carteId, 'ashigaru-des-braises');
  assert.ok(rpgMobaPasserCreature(d, 'sorcier').entite);
  assert.ok(rpgMobaPlacementCoherent(d));
});

test('l’IA peut préférer une invocation spéciale à la pose normale déjà utilisée', () => {
  const d = partie();
  rpgFinDeTour(d);
  d.sorcier.main = ['gardienne-des-portes-de-sable', 'faiseur-de-passage'];
  poser(d, 'sorcier', 'gardienne-des-portes-de-sable');
  const avant = JSON.stringify(d);
  const choix = rpgMobaChoisirCreatureIA(d, 'sorcier');
  assert.equal(choix?.id, 'faiseur-de-passage');
  assert.deepEqual(choix.sacrificeIds, []);
  assert.equal(JSON.stringify(d), avant);
});
