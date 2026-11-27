import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgActiverCapacite, rpgCiblesActivationLegales, rpgBlesserCreature, rpgResoudreDestructionCiblee, rpgJouerCreature, rpgEstProtegeeDesSorts } from '../src/games/rpgDuel.js';

function duel() { return rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => .99 }); }
function poser(d, side, id) {
  const c = cardById(id);
  const e = { id: `${side}-${id}`, carteId: id, name: c.name, atk: c.atk, def: c.def, pv: c.def, pvMax: c.def, ready: true, malInvocation: false, attaquee: false, contreAttaque: Boolean(c.contreAttaque) };
  d[side].creatures.push(e); return e;
}

test('une protection permanente vise seulement les trois effets et respecte leur couleur', () => {
  const cible = { protectionSortsContre: ['braise'] };
  assert.equal(rpgEstProtegeeDesSorts(cible, 'braise', 'effet-creature'), true);
  for (const type of ['attaque', 'capacite', 'magie']) assert.equal(rpgEstProtegeeDesSorts(cible, 'braise', type), false);
  assert.equal(rpgEstProtegeeDesSorts(cible, 'eau', 'effet-creature'), false);
});

test('un effet activé adverse est arrêté par le bouclier de sa couleur', () => {
  const d = duel(), source = poser(d, 'joueur', 'vampire-des-braises');
  const cible = poser(d, 'sorcier', 'chien-du-guet'); cible.protection = { contre: 'braise' };
  const pv = cible.pv;
  assert.equal(rpgActiverCapacite(d, 'joueur', source.id, cible.id).ok, true);
  assert.equal(cible.pv, pv); assert.equal(cible.protection, null);
});

test('une protection permanente exclut la cible des activations adverses', () => {
  const d = duel(), source = poser(d, 'joueur', 'vampire-des-braises');
  const cible = poser(d, 'sorcier', 'chien-du-guet'); cible.protectionSortsContre = 'braise';
  assert.equal(rpgCiblesActivationLegales(d, 'joueur', source.id).includes(cible.id), false);
  assert.equal(rpgActiverCapacite(d, 'joueur', source.id, cible.id).ok, false);
  assert.equal(source.activationUtiliseeMatch, undefined);
});

test('l’arrivée et son bouclier de couleur : la Vipère ne change pas l’attaque', () => {
  const d = duel(), cible = poser(d, 'joueur', 'chien-du-guet');
  cible.protection = { contre: 'eau' }; const atk = cible.atk;
  d.tour = 'sorcier'; d.sorcier.main = ['vipere-de-verre'];
  const r = rpgJouerCreature(d, 'sorcier', 'vipere-de-verre', cible.id);
  assert.equal(r.ok, true, r.raison); assert.equal(cible.atk, atk); assert.equal(cible.protection, null);
});

test('une créature avec Contre-attaque riposte sur la source d’un effet activé', () => {
  const d = duel(), source = poser(d, 'joueur', 'vampire-des-braises'); source.pv = source.pvMax = source.def = 10;
  const cible = poser(d, 'sorcier', 'gardien-de-la-porte-ardente');
  assert.equal(rpgActiverCapacite(d, 'joueur', source.id, cible.id).ok, true);
  assert.equal(source.pv, 8); assert.equal(d.joueur.pv, 25);
});

test('une Contre-attaque sur un effet de mort frappe le sorcier de la source disparue', () => {
  const d = duel(), ghul = poser(d, 'joueur', 'ghul-des-cendres');
  const cible = poser(d, 'sorcier', 'gardien-de-la-porte-ardente');
  assert.equal(rpgBlesserCreature(d, 'joueur', ghul.id, 10).ok, true);
  assert.equal(rpgResoudreDestructionCiblee(d, 'joueur', cible.id).ok, true);
  assert.equal(cible.pv, 3); assert.equal(d.joueur.pv, 23);
});

test('la Vipère contre un effet activé annoncé sans retirer sa source', async () => {
  const { rpgEffetsReponseDisponibles, rpgActiverEffetReponse } = await import('../src/games/rpgDuel.js');
  const d = duel(), vipere = poser(d, 'joueur', 'vipere-de-verre');
  const cible = poser(d, 'joueur', 'chien-du-guet'), source = poser(d, 'sorcier', 'vampire-des-braises');
  d.tour = 'sorcier'; const pv = cible.pv;
  assert.equal(rpgActiverCapacite(d, 'sorcier', source.id, cible.id, { attendreReponse: true }).effetEnAttente, true);
  assert.deepEqual(rpgEffetsReponseDisponibles(d, 'joueur').map(e => e.id), [vipere.id]);
  assert.equal(rpgActiverEffetReponse(d, 'joueur', vipere.id).ok, true);
  assert.equal(cible.pv, pv); assert.ok(d.sorcier.creatures.includes(source));
  assert.equal(source.activationUtiliseeMatch, true); assert.equal(vipere.activationUtiliseeMatch, true); assert.equal(vipere.ready, false);
  assert.equal(d.sorcier.cimetiere.includes(source.carteId), false); assert.equal(d.effetCreatureEnAttente, null);
});

test('Jörmungandr pioche en contrant un effet ; les restrictions normales sont appliquées', async () => {
  const { rpgEffetsReponseDisponibles, rpgActiverEffetReponse } = await import('../src/games/rpgDuel.js');
  const d = duel(), serpent = poser(d, 'joueur', 'jormungandr'); d.joueur.deck = ['garde-du-voile'];
  const cible = poser(d, 'joueur', 'chien-du-guet'), source = poser(d, 'sorcier', 'vampire-des-braises'); d.tour = 'sorcier';
  assert.equal(rpgActiverCapacite(d, 'sorcier', source.id, cible.id, { attendreReponse: true }).effetEnAttente, true);
  serpent.attaquee = true; assert.deepEqual(rpgEffetsReponseDisponibles(d, 'joueur'), []);
  assert.equal(rpgActiverEffetReponse(d, 'joueur', serpent.id).ok, false);
  serpent.attaquee = false; assert.equal(rpgActiverEffetReponse(d, 'joueur', serpent.id).ok, true);
  assert.deepEqual(d.joueur.main, ['garde-du-voile']);
});

test('en PvP, seule la personne qui répond peut contrer l’effet en attente', async () => {
  const { rpgPvpAppliquer } = await import('../src/games/rpgPvp.js');
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const vipere = poser(d, 'joueur', 'vipere-de-verre'), cible = poser(d, 'joueur', 'chien-du-guet');
  const source = poser(d, 'sorcier', 'vampire-des-braises'); d.tour = 'sorcier';
  assert.equal(rpgPvpAppliquer(d, 'sorcier', { type: 'activer', capacite: true, entiteId: source.id, cibleId: cible.id }).ok, true);
  assert.ok(d.effetCreatureEnAttente);
  assert.equal(rpgPvpAppliquer(d, 'sorcier', { type: 'activer-reponse', entiteId: vipere.id }).ok, false);
  assert.equal(rpgPvpAppliquer(d, 'joueur', { type: 'activer-reponse', entiteId: vipere.id }).ok, true);
  assert.equal(d.effetCreatureEnAttente, null); assert.equal(d.joueur.creatures.find(e => e.id === cible.id).pv, cible.pv);
});

test('en Conquête, une Vipère peut contrer une activation ciblée sans retirer son auteur', async () => {
  const { rpgMulligan, rpgDemarrerManaEssai } = await import('../src/games/rpgDuel.js');
  const { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaActiverCapacite, rpgMobaActiverEffetReponse, rpgMobaPlacementCoherent } = await import('../src/games/rpgMobaLocal.js');
  const deck = Array(12).fill('gardienne-des-portes-de-sable');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgMulligan(d, 'joueur', []); rpgMulligan(d, 'sorcier', []); rpgDemarrerManaEssai(d);
  d.joueur.main = ['vipere-de-verre', 'chien-du-guet'];
  const v = rpgMobaJouerCreature(d, 'joueur', 'vipere-de-verre', 'left', 0).entite;
  d.moba.creaturesJouees.joueur = false;
  const cible = rpgMobaJouerCreature(d, 'joueur', 'chien-du-guet', 'left', 1).entite;
  assert.ok(v && cible); v.malInvocation = false;
  d.tour = 'sorcier'; d.sorcier.main = ['vampire-des-braises'];
  const source = rpgMobaJouerCreature(d, 'sorcier', 'vampire-des-braises', 'left', 0).entite;
  assert.ok(source); source.malInvocation = false;
  const pv = cible.pv;
  const annonce = rpgMobaActiverCapacite(d, 'sorcier', source.id, { cibleId: cible.id });
  assert.equal(annonce.ok, true, JSON.stringify(annonce)); assert.equal(annonce.effetEnAttente, true);
  assert.equal(rpgMobaActiverEffetReponse(d, 'joueur', v.id).ok, true);
  assert.equal(cible.pv, pv); assert.ok(d.sorcier.creatures.includes(source)); assert.equal(rpgMobaPlacementCoherent(d), true);
});

test('en PvP, un effet de mort ciblé peut être contré après le choix de cible', async () => {
  const { rpgPvpAppliquer } = await import('../src/games/rpgPvp.js');
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true }; d.tour = 'joueur';
  const ghul = poser(d, 'joueur', 'ghul-des-cendres');
  const vipere = poser(d, 'sorcier', 'vipere-de-verre'); vipere.pv = vipere.def = vipere.pvMax = 5;
  const pv = vipere.pv;
  assert.equal(rpgBlesserCreature(d, 'joueur', ghul.id, 10).ok, true);
  assert.equal(rpgPvpAppliquer(d, 'joueur', { type: 'resoudre-destruction', cibleId: vipere.id }).ok, true);
  assert.equal(d.effetCreatureEnAttente?.type, 'destruction');
  assert.equal(rpgPvpAppliquer(d, 'sorcier', { type: 'activer-reponse', entiteId: vipere.id }).ok, true);
  assert.equal(d.sorcier.creatures.find(e => e.id === vipere.id).pv, pv);
  assert.ok(d.joueur.cimetiere.includes('ghul-des-cendres'));
});

test('passer sur un effet de mort ciblé le résout et conserve l’identité de la source', async () => {
  const { rpgPvpAppliquer } = await import('../src/games/rpgPvp.js');
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true }; d.tour = 'joueur';
  const ghul = poser(d, 'joueur', 'ghul-des-cendres'); poser(d, 'sorcier', 'vipere-de-verre');
  const cible = poser(d, 'sorcier', 'gardien-de-la-porte-ardente');
  rpgBlesserCreature(d, 'joueur', ghul.id, 10);
  assert.equal(rpgPvpAppliquer(d, 'joueur', { type: 'resoudre-destruction', cibleId: cible.id }).ok, true);
  assert.equal(rpgPvpAppliquer(d, 'sorcier', { type: 'passer-effet' }).ok, true);
  assert.equal(d.sorcier.creatures.find(e => e.id === cible.id).pv, 3); assert.equal(d.joueur.pv, 23);
});

test('une activation sans cible peut être contrée en PvP après paiement', async () => {
  const { rpgPvpAppliquer } = await import('../src/games/rpgPvp.js');
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const source = poser(d, 'joueur', 'rodeuse-des-tombes');
  const vipere = poser(d, 'sorcier', 'vipere-de-verre'); d.joueur.deck = ['chien-du-guet'];
  assert.equal(rpgPvpAppliquer(d, 'joueur', { type: 'activer', capacite: true, entiteId: source.id }).ok, true);
  assert.equal(d.effetCreatureEnAttente?.type, 'activation');
  assert.equal(rpgPvpAppliquer(d, 'sorcier', { type: 'activer-reponse', entiteId: vipere.id }).ok, true);
  assert.equal(d.joueur.deck.length, 1); assert.equal(source.activationUtiliseeMatch, true);
});

test('passer sur une activation sans cible la résout', async () => {
  const { rpgPvpAppliquer } = await import('../src/games/rpgPvp.js');
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const source = poser(d, 'joueur', 'rodeuse-des-tombes'); poser(d, 'sorcier', 'vipere-de-verre'); d.joueur.deck = ['chien-du-guet'];
  assert.equal(rpgPvpAppliquer(d, 'joueur', { type: 'activer', capacite: true, entiteId: source.id }).ok, true);
  assert.equal(rpgPvpAppliquer(d, 'sorcier', { type: 'passer-effet' }).ok, true);
  assert.deepEqual(d.joueur.main, ['chien-du-guet']);
});

test('une arrivée ciblée ne peut pas viser une créature protégée contre sa couleur', async () => {
  const { arriveeACibleLegale } = await import('../src/games/rpgDuel.js');
  const d = duel(), cible = poser(d, 'sorcier', 'chien-du-guet'); cible.protectionSortsContre = 'eau';
  d.joueur.main = ['vipere-de-verre'];
  assert.equal(arriveeACibleLegale(d, 'joueur', cardById('vipere-de-verre')), false);
  assert.equal(rpgJouerCreature(d, 'joueur', 'vipere-de-verre', cible.id).ok, false);
  assert.deepEqual(d.joueur.main, ['vipere-de-verre']);
});

test('en Conquête, un effet de mort ciblé peut être contré sans faire revenir sa source', async () => {
  const { rpgMulligan, rpgDemarrerManaEssai } = await import('../src/games/rpgDuel.js');
  const { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaResoudreDestruction, rpgMobaActiverEffetReponse, rpgMobaPlacementCoherent } = await import('../src/games/rpgMobaLocal.js');
  const deck = Array(12).fill('gardienne-des-portes-de-sable');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgMulligan(d, 'joueur', []); rpgMulligan(d, 'sorcier', []); rpgDemarrerManaEssai(d);
  d.tour = 'sorcier'; d.sorcier.main = ['vipere-de-verre', 'chien-du-guet'];
  const v = rpgMobaJouerCreature(d, 'sorcier', 'vipere-de-verre', 'left', 0).entite;
  d.moba.creaturesJouees.sorcier = false;
  const cible = rpgMobaJouerCreature(d, 'sorcier', 'chien-du-guet', 'left', 1).entite;
  v.malInvocation = false; d.tour = 'joueur'; d.joueur.main = ['ghul-des-cendres'];
  const ghul = rpgMobaJouerCreature(d, 'joueur', 'ghul-des-cendres', 'left', 0).entite;
  assert.ok(ghul); rpgBlesserCreature(d, 'joueur', ghul.id, 20);
  const { mobaRetirer } = await import('../src/games/rpgMoba.js'); mobaRetirer(d.moba, 'joueur', ghul.id);
  const pv = cible.pv; const annonce = rpgMobaResoudreDestruction(d, 'joueur', cible.id);
  assert.equal(annonce.ok, true, JSON.stringify(annonce)); assert.equal(annonce.effetEnAttente, true);
  assert.equal(rpgMobaActiverEffetReponse(d, 'sorcier', v.id).ok, true);
  assert.equal(cible.pv, pv); assert.ok(d.joueur.cimetiere.includes('ghul-des-cendres')); assert.equal(rpgMobaPlacementCoherent(d), true);
});

test('en PvP le deuxième siège choisit lui-même la cible de son effet de mort', async () => {
  const { rpgPvpAppliquer } = await import('../src/games/rpgPvp.js');
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true }; d.tour = 'sorcier';
  const ghul = poser(d, 'sorcier', 'ghul-des-cendres'), vipere = poser(d, 'joueur', 'vipere-de-verre');
  rpgBlesserCreature(d, 'sorcier', ghul.id, 10);
  assert.equal(d.destructionsEnAttente?.[0]?.cote, 'sorcier');
  assert.equal(rpgPvpAppliquer(d, 'sorcier', { type: 'resoudre-destruction', cibleId: vipere.id }).ok, true);
  assert.equal(rpgPvpAppliquer(d, 'joueur', { type: 'activer-reponse', entiteId: vipere.id }).ok, true);
});

test('en PvP, on peut contrer une arrivée sans cible sans contrer la créature', async () => {
  const { rpgPvpAppliquer } = await import('../src/games/rpgPvp.js');
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const vipere = poser(d, 'sorcier', 'vipere-de-verre');
  d.joueur.main = ['dune-marchante']; d.joueur.deck = ['garde-du-voile'];
  assert.equal(rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: 'dune-marchante' }).ok, true);
  assert.equal(d.effetCreatureEnAttente?.type, 'arrivee');
  assert.equal(rpgPvpAppliquer(d, 'sorcier', { type: 'activer-reponse', entiteId: vipere.id }).ok, true);
  assert.ok(d.joueur.creatures.some(e => e.carteId === 'dune-marchante'));
  assert.deepEqual(d.joueur.deck, ['garde-du-voile']); assert.equal(Boolean(d.renfortChoixEnAttente), false);
});

test('en PvP, laisser passer une arrivée sans cible déclenche son choix', async () => {
  const { rpgPvpAppliquer } = await import('../src/games/rpgPvp.js');
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  poser(d, 'sorcier', 'vipere-de-verre'); d.joueur.main = ['dune-marchante']; d.joueur.deck = ['garde-du-voile'];
  assert.equal(rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: 'dune-marchante' }).ok, true);
  assert.equal(rpgPvpAppliquer(d, 'sorcier', { type: 'passer-effet' }).ok, true);
  assert.equal(d.renfortChoixEnAttente?.sourceCarteId, 'dune-marchante');
});

test('en Conquête, laisser passer une arrivée sans cible ouvre sa recherche', async () => {
  const { rpgMulligan, rpgDemarrerManaEssai } = await import('../src/games/rpgDuel.js');
  const { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaPasserEffetCreature, rpgMobaCandidatsRecherche } = await import('../src/games/rpgMobaLocal.js');
  const deck = Array(12).fill('gardienne-des-portes-de-sable');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgMulligan(d, 'joueur', []); rpgMulligan(d, 'sorcier', []); rpgDemarrerManaEssai(d);
  d.tour = 'sorcier'; d.sorcier.main = ['vipere-de-verre'];
  const vipere = rpgMobaJouerCreature(d, 'sorcier', 'vipere-de-verre', 'left', 0).entite; vipere.malInvocation = false;
  d.tour = 'joueur'; d.joueur.main = ['dune-marchante']; d.joueur.deck = ['garde-du-voile'];
  const pose = rpgMobaJouerCreature(d, 'joueur', 'dune-marchante', 'left', 0);
  assert.equal(pose.effetEnAttente, true, JSON.stringify(pose));
  const passe = rpgMobaPasserEffetCreature(d, 'sorcier'); assert.equal(passe.ok, true, JSON.stringify(passe));
  assert.deepEqual(rpgMobaCandidatsRecherche(d, 'joueur'), ['garde-du-voile']);
});

test('en Conquête, passer la créature puis contrer son arrivée laisse la créature en jeu', async () => {
  const { rpgMulligan, rpgDemarrerManaEssai } = await import('../src/games/rpgDuel.js');
  const { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaPasserCreature, rpgMobaActiverEffetReponse } = await import('../src/games/rpgMobaLocal.js');
  const deck = Array(12).fill('gardienne-des-portes-de-sable');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgMulligan(d, 'joueur', []); rpgMulligan(d, 'sorcier', []); rpgDemarrerManaEssai(d);
  d.tour = 'sorcier'; d.sorcier.main = ['vipere-de-verre'];
  const vipere = rpgMobaJouerCreature(d, 'sorcier', 'vipere-de-verre', 'left', 0).entite; vipere.malInvocation = false;
  d.tour = 'joueur'; d.joueur.main = ['dune-marchante']; d.joueur.deck = ['garde-du-voile'];
  assert.equal(rpgMobaJouerCreature(d, 'joueur', 'dune-marchante', 'left', 0, { ouvrirReponse: true }).creatureEnAttente, true);
  const entree = rpgMobaPasserCreature(d, 'sorcier'); assert.equal(entree.ok, true, JSON.stringify(entree));
  assert.equal(entree.effetEnAttente, true); assert.equal(d.fenetreReponse, true);
  assert.equal(rpgMobaActiverEffetReponse(d, 'sorcier', vipere.id).ok, true);
  assert.ok(d.joueur.creatures.some(e => e.carteId === 'dune-marchante')); assert.equal(d.mobaRechercheEnAttente, undefined);
});

test('en Conquête, le soin de voie d’une arrivée suspendue est conservé au passage', async () => {
  const { rpgMulligan, rpgDemarrerManaEssai } = await import('../src/games/rpgDuel.js');
  const { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaPasserEffetCreature } = await import('../src/games/rpgMobaLocal.js');
  const deck = Array(12).fill('gardienne-des-portes-de-sable');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgMulligan(d, 'joueur', []); rpgMulligan(d, 'sorcier', []); rpgDemarrerManaEssai(d);
  d.tour = 'sorcier'; d.sorcier.main = ['vipere-de-verre'];
  const vipere = rpgMobaJouerCreature(d, 'sorcier', 'vipere-de-verre', 'left', 0).entite; vipere.malInvocation = false;
  d.tour = 'joueur'; d.joueur.main = ['porteuse-de-cruches'];
  const lane = d.moba.lanes.find(l => l.id === 'left'); lane.hp.joueur = 10;
  const pose = rpgMobaJouerCreature(d, 'joueur', 'porteuse-de-cruches', 'left', 0);
  assert.equal(pose.effetEnAttente, true, JSON.stringify(pose)); assert.equal(lane.hp.joueur, 10);
  const passe = rpgMobaPasserEffetCreature(d, 'sorcier'); assert.equal(passe.ok, true, JSON.stringify(passe));
  assert.ok(lane.hp.joueur > 10); assert.ok(passe.healingEvents.some(e => e.healing > 0));
});

test('un effet de mort sans cible peut être contré en PvP', async () => {
  const { rpgPvpAppliquer } = await import('../src/games/rpgPvp.js');
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const source = poser(d, 'joueur', 'scarabee-des-sceaux'), vipere = poser(d, 'sorcier', 'vipere-de-verre');
  d.joueur.deck = ['chien-du-guet'];
  rpgBlesserCreature(d, 'joueur', source.id, 10);
  assert.equal(d.effetCreatureEnAttente?.mortSansCible, true); assert.equal(d.joueur.main.length, 0);
  assert.equal(rpgPvpAppliquer(d, 'sorcier', { type: 'activer-reponse', entiteId: vipere.id }).ok, true);
  assert.deepEqual(d.joueur.deck, ['chien-du-guet']); assert.ok(d.joueur.cimetiere.includes(source.carteId));
});

test('laisser passer un effet de mort sans cible le résout', async () => {
  const { rpgPvpAppliquer } = await import('../src/games/rpgPvp.js');
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const source = poser(d, 'joueur', 'scarabee-des-sceaux'); poser(d, 'sorcier', 'vipere-de-verre');
  d.joueur.deck = ['chien-du-guet']; rpgBlesserCreature(d, 'joueur', source.id, 10);
  assert.equal(rpgPvpAppliquer(d, 'sorcier', { type: 'passer-effet' }).ok, true);
  assert.deepEqual(d.joueur.main, ['chien-du-guet']); assert.equal(d.effetCreatureEnAttente, null);
});

test('deux effets de mort annoncés sont résolus dans l’ordre sans écraser la première réponse', async () => {
  const { rpgPvpAppliquer } = await import('../src/games/rpgPvp.js');
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const premier = poser(d, 'joueur', 'scarabee-des-sceaux'), second = poser(d, 'joueur', 'porteur-de-la-plume');
  const vipere = poser(d, 'sorcier', 'vipere-de-verre'); d.joueur.deck = ['chien-du-guet']; d.joueur.pv = 15;
  rpgBlesserCreature(d, 'joueur', premier.id, 10); rpgBlesserCreature(d, 'joueur', second.id, 10);
  assert.equal(d.effetCreatureEnAttente.carteId, premier.carteId); assert.equal(d.effetsMortEnFile?.length, 1);
  assert.equal(rpgPvpAppliquer(d, 'sorcier', { type: 'activer-reponse', entiteId: vipere.id }).ok, true);
  assert.equal(d.joueur.main.length, 0); assert.equal(d.joueur.pv, 16); assert.equal(d.effetsMortEnFile.length, 0);
});

test('en duel solo, le Ghul de l’IA annonce sa cible avant de frapper', async () => {
  const { rpgActiverEffetReponse } = await import('../src/games/rpgDuel.js');
  const d = duel(); const vipere = poser(d, 'joueur', 'vipere-de-verre');
  const ghul = poser(d, 'sorcier', 'ghul-des-cendres'); d.tour = 'sorcier';
  const pv = vipere.pv; rpgBlesserCreature(d, 'sorcier', ghul.id, 10);
  assert.equal(d.effetCreatureEnAttente?.type, 'destruction');
  assert.equal(rpgActiverEffetReponse(d, 'joueur', vipere.id).ok, true); assert.equal(vipere.pv, pv);
});

test('en Conquête, un décès au combat ouvre une réponse à son effet sans cible', async () => {
  const { rpgMulligan, rpgDemarrerManaEssai } = await import('../src/games/rpgDuel.js');
  const { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle, rpgMobaActiverEffetReponse, rpgMobaPlacementCoherent } = await import('../src/games/rpgMobaLocal.js');
  const deck = Array(12).fill('gardienne-des-portes-de-sable');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgMulligan(d, 'joueur', []); rpgMulligan(d, 'sorcier', []); rpgDemarrerManaEssai(d);
  d.tour = 'sorcier'; d.sorcier.main = ['vipere-de-verre', 'chien-du-guet'];
  const vipere = rpgMobaJouerCreature(d, 'sorcier', 'vipere-de-verre', 'left', 0).entite;
  d.moba.creaturesJouees.sorcier = false;
  const chien = rpgMobaJouerCreature(d, 'sorcier', 'chien-du-guet', 'left', 1).entite;
  d.tour = 'joueur'; d.joueur.main = ['scarabee-des-sceaux']; d.joueur.deck = ['garde-du-voile'];
  const scarabee = rpgMobaJouerCreature(d, 'joueur', 'scarabee-des-sceaux', 'left', 0).entite;
  assert.ok(scarabee); vipere.malInvocation = false; chien.malInvocation = false; d.tour = 'sorcier';
  const declaration = rpgMobaDeclarerAttaqueIndividuelle(d, 'sorcier', chien.id, scarabee.id);
  assert.equal(declaration.ok, true, JSON.stringify(declaration));
  const combat = rpgMobaResoudreAttaqueIndividuelle(d, 'sorcier'); assert.equal(combat.ok, true, JSON.stringify(combat));
  assert.equal(d.effetCreatureEnAttente?.carteId, 'scarabee-des-sceaux'); assert.equal(d.fenetreReponse, true);
  assert.equal(rpgMobaActiverEffetReponse(d, 'sorcier', vipere.id).ok, true);
  assert.deepEqual(d.joueur.deck, ['garde-du-voile']); assert.equal(rpgMobaPlacementCoherent(d), true);
});

test('un retour programmé suspend l’arrivée avant de poursuivre la transition', async () => {
  const { rpgFinDeTour, rpgActiverEffetReponse } = await import('../src/games/rpgDuel.js');
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true }; d.tour = 'sorcier';
  const vipere = poser(d, 'sorcier', 'vipere-de-verre');
  d.joueur.cimetiere = ['dune-marchante']; d.joueur.deck = ['garde-du-voile', 'chien-du-guet'];
  d.joueur.retoursProgrammes = [{ carteId: 'dune-marchante', toursRestants: 1 }];
  rpgFinDeTour(d);
  assert.equal(d.effetCreatureEnAttente?.retourAutomatique, true); assert.ok(d.transitionRetours);
  assert.equal(rpgActiverEffetReponse(d, 'sorcier', vipere.id).ok, true);
  assert.equal(d.transitionRetours, null); assert.equal(Boolean(d.renfortChoixEnAttente), false);
  assert.ok(d.joueur.creatures.some(e => e.carteId === 'dune-marchante'));
});

test('le contre automatique de l’IA ne réentre pas dans la transition des retours', async () => {
  const { rpgFinDeTour } = await import('../src/games/rpgDuel.js');
  const d = duel(); d.tour = 'sorcier'; const vipere = poser(d, 'sorcier', 'vipere-de-verre');
  d.joueur.cimetiere = ['dune-marchante']; d.joueur.deck = ['garde-du-voile', 'chien-du-guet'];
  d.joueur.retoursProgrammes = [{ carteId: 'dune-marchante', toursRestants: 1 }];
  assert.doesNotThrow(() => rpgFinDeTour(d));
  assert.equal(d.transitionRetours, null); assert.equal(vipere.activationUtiliseeMatch, true);
  assert.ok(d.joueur.creatures.some(e => e.carteId === 'dune-marchante')); assert.equal(Boolean(d.renfortChoixEnAttente), false);
});

test('un retour programmé dont l’arrivée est acceptée conserve son choix avant de reprendre le tour', async () => {
  const { rpgFinDeTour, rpgResoudreEffetCreatureEnAttente, rpgResoudreRenfortChoisi, rpgCartesRenfortChoisi } = await import('../src/games/rpgDuel.js');
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true }; d.tour = 'sorcier';
  poser(d, 'sorcier', 'vipere-de-verre'); d.joueur.cimetiere = ['dune-marchante'];
  d.joueur.deck = ['chien-du-guet', 'garde-du-voile', 'chien-du-guet'];
  d.joueur.retoursProgrammes = [{ carteId: 'dune-marchante', toursRestants: 1 }];
  rpgFinDeTour(d);
  assert.equal(rpgResoudreEffetCreatureEnAttente(d, 'sorcier').ok, true);
  assert.ok(d.transitionRetours); assert.equal(d.renfortChoixEnAttente?.sourceCarteId, 'dune-marchante');
  const choix = rpgCartesRenfortChoisi(d, 'joueur').find(c => c.id === 'garde-du-voile');
  assert.ok(choix); assert.equal(rpgResoudreRenfortChoisi(d, 'joueur', choix.index).ok, true);
  assert.equal(d.transitionRetours, null); assert.ok(d.joueur.main.includes('garde-du-voile'));
});

test('contrer le Brûlot annule les dégâts à la fois au tueur et au sorcier', async () => {
  const { rpgPvpAppliquer } = await import('../src/games/rpgPvp.js');
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const brulot = poser(d, 'joueur', 'le-brulot'), vipere = poser(d, 'sorcier', 'vipere-de-verre');
  const tueur = poser(d, 'sorcier', 'chien-du-guet'); tueur.pv = tueur.pvMax = tueur.def = 6;
  rpgBlesserCreature(d, 'joueur', brulot.id, 2, 'sable', null, 'attaque', tueur.carteId, { cote: 'sorcier', id: tueur.id }, 'sorcier');
  assert.equal(d.effetCreatureEnAttente?.tueur?.id, tueur.id); assert.equal(d.sorcier.pv, 25); assert.equal(tueur.pv, 6);
  assert.equal(rpgPvpAppliquer(d, 'sorcier', { type: 'activer-reponse', entiteId: vipere.id }).ok, true);
  assert.equal(d.sorcier.pv, 25); assert.equal(tueur.pv, 6);
});

test('laisser passer le Brûlot touche son tueur et son sorcier', async () => {
  const { rpgPvpAppliquer, rpgPvpVue } = await import('../src/games/rpgPvp.js');
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const brulot = poser(d, 'joueur', 'le-brulot'); poser(d, 'sorcier', 'vipere-de-verre');
  const tueur = poser(d, 'sorcier', 'chien-du-guet'); tueur.pv = tueur.pvMax = tueur.def = 6;
  rpgBlesserCreature(d, 'joueur', brulot.id, 2, 'sable', null, 'attaque', tueur.carteId, { cote: 'sorcier', id: tueur.id }, 'sorcier');
  assert.equal(rpgPvpVue(d, 'sorcier').effetCreatureEnAttente.tueur.cote, 'joueur');
  assert.equal(rpgPvpAppliquer(d, 'sorcier', { type: 'passer-effet' }).ok, true);
  assert.equal(d.sorcier.pv, 23); assert.equal(d.sorcier.creatures.find(e => e.id === tueur.id).pv, 4);
});

test('un effet d’arrivée ciblant le sorcier peut être contré après désignation', async () => {
  const { rpgPvpAppliquer } = await import('../src/games/rpgPvp.js');
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const source = poser(d, 'joueur', 'maitre-du-marteau'), vipere = poser(d, 'sorcier', 'vipere-de-verre');
  d.arriveeEnAttente = { cote: 'joueur', entiteId: source.id, carteId: source.carteId };
  assert.equal(rpgPvpAppliquer(d, 'joueur', { type: 'resoudre-arrivee', cibleId: 'sorcier' }).ok, true);
  assert.equal(d.effetCreatureEnAttente?.cibleId, 'sorcier');
  assert.equal(rpgPvpAppliquer(d, 'sorcier', { type: 'activer-reponse', entiteId: vipere.id }).ok, true);
  assert.equal(d.sorcier.pv, 25); assert.ok(d.joueur.creatures.includes(source));
});

test('un effet d’arrivée ciblant le sorcier inflige ses dégâts si on le laisse passer', async () => {
  const { rpgPvpAppliquer } = await import('../src/games/rpgPvp.js');
  const d = duel(); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  const source = poser(d, 'joueur', 'maitre-du-marteau'); poser(d, 'sorcier', 'vipere-de-verre');
  d.arriveeEnAttente = { cote: 'joueur', entiteId: source.id, carteId: source.carteId };
  assert.equal(rpgPvpAppliquer(d, 'joueur', { type: 'resoudre-arrivee', cibleId: 'sorcier' }).ok, true);
  assert.equal(rpgPvpAppliquer(d, 'sorcier', { type: 'passer-effet' }).ok, true);
  assert.equal(d.sorcier.pv, 22);
});

test('Conquête : les deux cibles de l’Oni restent désignées après sauvegarde et réponse', async () => {
  const { rpgMulligan, rpgDemarrerManaEssai, rpgFinDeTour } = await import('../src/games/rpgDuel.js');
  const { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaResoudreArrivee, rpgMobaPasserEffetCreature } = await import('../src/games/rpgMobaLocal.js');
  const deck = Array(12).fill('gardienne-des-portes-de-sable');
  let d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgMulligan(d, 'joueur', []); rpgMulligan(d, 'sorcier', []); rpgDemarrerManaEssai(d);
  d.tour = 'sorcier'; d.sorcier.main = ['vipere-de-verre'];
  const vipere = rpgMobaJouerCreature(d, 'sorcier', 'vipere-de-verre', 'left', 0).entite; assert.ok(vipere); vipere.malInvocation = false; vipere.pv = vipere.pvMax = vipere.def = 10;
  rpgFinDeTour(d); rpgFinDeTour(d); d.sorcier.main = ['gardienne-des-portes-de-sable'];
  const cible = rpgMobaJouerCreature(d, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 1).entite; assert.ok(cible); cible.pv = cible.pvMax = cible.def = 10;
  rpgFinDeTour(d); d.joueur.main = ['oni-de-la-fournaise', 'gardienne-des-portes-de-sable'];
  const pose = rpgMobaJouerCreature(d, 'joueur', 'oni-de-la-fournaise', 'left', 0, { retourIds: ['gardienne-des-portes-de-sable'] });
  assert.equal(pose.arriveeEnAttente, true, JSON.stringify({ pose, tour: d.tour, attente: d.arriveeEnAttente, fin: d.fin }));
  assert.equal(rpgMobaResoudreArrivee(d, 'joueur', vipere.id).arriveeEnAttente, true);
  assert.equal(rpgMobaResoudreArrivee(d, 'joueur', cible.id).effetEnAttente, true);
  assert.deepEqual(d.effetCreatureEnAttente.ciblesOniMoba, [vipere.id, cible.id]);
  d = JSON.parse(JSON.stringify(d));
  assert.equal(rpgMobaPasserEffetCreature(d, 'sorcier').ok, true);
  assert.equal(d.sorcier.creatures.find(e => e.id === vipere.id)?.pv, vipere.pv - 3);
  assert.equal(d.sorcier.creatures.find(e => e.id === cible.id)?.pv, cible.pv - 3);
});

test('une cible protégée est refusée pour l’effet de mort même si une autre cible est légale', () => {
  const d = duel(), ghul = poser(d, 'joueur', 'ghul-des-cendres');
  const protegee = poser(d, 'sorcier', 'chien-du-guet'); protegee.protectionSortsContre = cardById(ghul.carteId).element;
  const autreCible = poser(d, 'sorcier', 'garde-du-voile');
  assert.equal(rpgBlesserCreature(d, 'joueur', ghul.id, 10).ok, true);
  assert.equal(rpgResoudreDestructionCiblee(d, 'joueur', protegee.id).raison, 'cible');
  assert.equal(d.destructionsEnAttente.length, 1);
  assert.equal(rpgResoudreDestructionCiblee(d, 'joueur', autreCible.id).ok, true);
});

test('Conquête : après réponse, le marteau frappe la voie et non les PV du sorcier', async () => {
  const { rpgMulligan, rpgDemarrerManaEssai } = await import('../src/games/rpgDuel.js');
  const { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaResoudreArrivee, rpgMobaPasserEffetCreature } = await import('../src/games/rpgMobaLocal.js');
  const deck = Array(12).fill('gardienne-des-portes-de-sable');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgMulligan(d, 'joueur', []); rpgMulligan(d, 'sorcier', []); rpgDemarrerManaEssai(d);
  d.tour = 'sorcier'; d.sorcier.main = ['vipere-de-verre'];
  const vipere = rpgMobaJouerCreature(d, 'sorcier', 'vipere-de-verre', 'left', 0).entite; assert.ok(vipere); vipere.malInvocation = false;
  d.tour = 'joueur'; d.joueur.main = ['maitre-du-marteau', 'chien-du-guet', 'garde-du-voile'];
  const pose = rpgMobaJouerCreature(d, 'joueur', 'maitre-du-marteau', 'left', 0, { retourIds: ['chien-du-guet'] });
  assert.equal(pose.ok, true, JSON.stringify(pose)); assert.equal(pose.arriveeEnAttente, true);
  const lane = d.moba.lanes.find(l => l.id === 'left'); const pv = lane.hp.sorcier, pvSorcier = d.sorcier.pv;
  assert.equal(rpgMobaResoudreArrivee(d, 'joueur', 'sorcier').effetEnAttente, true);
  assert.equal(lane.hp.sorcier, pv);
  const passe = rpgMobaPasserEffetCreature(d, 'sorcier'); assert.equal(passe.ok, true, JSON.stringify(passe));
  assert.equal(lane.hp.sorcier, pv - 3); assert.equal(d.sorcier.pv, pvSorcier);
});

test('deux créatures mortes dans la même action d’état ne perdent pas leurs effets', async () => {
  const { rpgActionsEtat, rpgActiverEffetReponse } = await import('../src/games/rpgDuel.js');
  const d = duel(); d.pvp = true;
  const premier = poser(d, 'joueur', 'scarabee-des-sceaux'), second = poser(d, 'joueur', 'porteur-de-la-plume');
  const vipere = poser(d, 'sorcier', 'vipere-de-verre'); d.joueur.deck = ['chien-du-guet']; d.joueur.pv = 15;
  premier.pv = 0; second.pv = 0;
  rpgActionsEtat(d);
  assert.ok(!d.joueur.creatures.includes(premier) && !d.joueur.creatures.includes(second));
  assert.equal(d.effetCreatureEnAttente?.carteId, premier.carteId); assert.equal(d.effetsMortEnFile?.length, 1);
  assert.equal(rpgActiverEffetReponse(d, 'sorcier', vipere.id).ok, true);
  assert.equal(d.joueur.main.length, 0); assert.equal(d.joueur.pv, 16); assert.equal(d.effetsMortEnFile.length, 0);
});
