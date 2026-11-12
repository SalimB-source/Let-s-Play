import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgFinDeTour, rpgBlesserCreature, rpgConsommerArriveesCreature } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaMulligan, rpgMobaJouerCreature, rpgMobaResoudreArrivee, rpgMobaPlacementCoherent, rpgMobaTerminerTour, rpgMobaPasserFinDeTour } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirArriveeIA } from '../src/games/rpgMobaAI.js';
import { mobaInfliger, mobaVoie } from '../src/games/rpgMoba.js';

function partie() {
  const deck = Array(20).fill('ashigaru-des-braises');
  const duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.equal(rpgMobaMulligan(duel, 'joueur', []).ok, true);
  assert.equal(rpgMobaMulligan(duel, 'sorcier', []).ok, true);
  return duel;
}
function poser(duel, cote, id, lane, slot, options = {}) {
  duel.moba.creaturesJouees[cote] = false;
  duel[cote].main.push(id);
  for (const element of Object.keys(duel[cote].mana)) duel[cote].mana[element] = 30;
  const result = rpgMobaJouerCreature(duel, cote, id, lane, slot, options);
  assert.equal(result.ok, true, `${id}: ${result.raison}`);
  return result.entite;
}
function adversaires(duel) {
  rpgFinDeTour(duel);
  const a = poser(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 0);
  const b = poser(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 1);
  rpgFinDeTour(duel);
  return [a, b];
}
function terminer(duel, cote) {
  const fin = rpgMobaTerminerTour(duel, cote);
  assert.equal(fin.ok, true, fin.raison);
  assert.ok(fin.reponse);
  const passage = rpgMobaPasserFinDeTour(duel, fin.reponse);
  assert.equal(passage.ok, true, passage.raison);
  return passage;
}

test('Ténacité : la créature revient, attend la cible choisie et termine le début du tour une seule fois', () => {
  const duel = partie(), [a, b] = adversaires(duel);
  const sacrifice = poser(duel, 'joueur', 'ashigaru-des-braises', 'right', 0);
  // L'invocation prend la place physique de la victime choisie.
  const marteau = poser(duel, 'joueur', 'maitre-du-marteau', 'right', 0, { sacrificeIds: [sacrifice.id] });
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', 'sorcier').ok, true);
  rpgBlesserCreature(duel, 'joueur', marteau.id, 99);
  assert.equal(duel.joueur.retoursProgrammes[0].tenacite, true);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  const retour = duel.joueur.creatures.find(e => e.carteId === marteau.carteId);
  assert.ok(retour); assert.equal(retour.pv, 1); assert.equal(retour.tenaciteDisponible, false);
  assert.equal(duel.phase, 'debut'); assert.equal(duel.arriveeEnAttente.entiteId, retour.id);
  const pv = [a.pv, b.pv], cartes = duel.joueur.deck.length;
  rpgFinDeTour(duel);
  assert.equal(duel.joueur.deck.length, cartes, 'la transition ne rejoue pas la pioche');
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', 'non-valide').ok, false);
  assert.deepEqual([a.pv, b.pv], pv);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', b.id).ok, true);
  assert.equal(a.pv, pv[0]); assert.equal(b.pv, pv[1] - 3);
  assert.equal(duel.transitionRetours, null); assert.equal(duel.phase, 'principale');
  assert.equal(duel.joueur.deck.length, cartes);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('exil réel : le retour choisit une cible, puis le tour passe', () => {
  const duel = partie(), [a, b] = adversaires(duel);
  const vipere = poser(duel, 'joueur', 'vipere-de-verre', 'right', 0);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', a.id).ok, true);
  poser(duel, 'joueur', 'guetteuse-des-marees', 'right', 1);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', vipere.id).ok, true);
  assert.ok(duel.joueur.exil.includes(vipere.carteId));
  assert.equal(JSON.parse(JSON.stringify(duel)).retoursExilFinTour[0].exilEntityId, vipere.id);
  rpgConsommerArriveesCreature(duel);
  const oldAtk = b.atk;
  const result = terminer(duel, 'joueur');
  assert.equal(result.arriveeEnAttente, true); assert.equal(duel.tour, 'joueur');
  const arrivee = rpgConsommerArriveesCreature(duel).find(event => event.origine === 'retour-exil');
  assert.equal(arrivee.exilEntityId, vipere.id);
  assert.notEqual(arrivee.entityId, vipere.id);
  assert.equal(duel.arriveeEnAttente.carteId, vipere.carteId);
  assert.equal(b.atk, oldAtk);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', b.id).ok, true);
  assert.equal(b.atk, Math.max(0, oldAtk - 2));
  assert.equal(duel.tour, 'sorcier'); assert.equal(duel.phase, 'principale');
  assert.equal(duel.transitionRetours, null); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('la provenance d’un retour d’exil survit à une sauvegarde JSON', () => {
  const duel = partie();
  const cible = poser(duel, 'joueur', 'ashigaru-des-braises', 'right', 0);
  poser(duel, 'joueur', 'guetteuse-des-marees', 'right', 1);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', cible.id).ok, true);
  const reprise = JSON.parse(JSON.stringify(duel));
  assert.equal(reprise.retoursExilFinTour[0].exilEntityId, cible.id);
  terminer(reprise, 'joueur');
  const arrivee = rpgConsommerArriveesCreature(reprise).find(event => event.origine === 'retour-exil');
  assert.ok(arrivee);
  assert.equal(arrivee.exilEntityId, cible.id);
  assert.notEqual(arrivee.entityId, cible.id);
  assert.equal(rpgMobaPlacementCoherent(reprise), true);
});

test('plusieurs retours ne sont ni perdus ni appliqués avant leur choix', () => {
  const duel = partie(), [a, b] = adversaires(duel);
  (duel.joueur.exil ??= []).push('vipere-de-verre', 'maitre-du-marteau');
  duel.retoursExilFinTour = [
    { cote: 'joueur', carteId: 'vipere-de-verre', mobaLane: 'right', mobaSlot: 0 },
    { cote: 'joueur', carteId: 'maitre-du-marteau', mobaLane: 'right', mobaSlot: 1 },
  ];
  const bAvant = b.pv, deckAvant = duel.sorcier.deck.length;
  terminer(duel, 'joueur');
  assert.equal(duel.arriveeEnAttente.carteId, 'vipere-de-verre');
  assert.equal(duel.joueur.creatures.some(e => e.carteId === 'maitre-du-marteau'), false);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', a.id).ok, true);
  assert.equal(duel.arriveeEnAttente.carteId, 'maitre-du-marteau');
  assert.equal(b.pv, bAvant); assert.equal(duel.sorcier.deck.length, deckAvant);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', b.id).ok, true);
  assert.equal(b.pv, bAvant - 3); assert.equal(duel.sorcier.deck.length, deckAvant - 1);
  assert.equal(duel.tour, 'sorcier'); assert.equal(duel.transitionRetours, null);
});

test('une arrivée sans cible légale ne bloque pas, et les effets non ciblés restent automatiques', () => {
  const duel = partie();
  (duel.joueur.exil ??= []).push('vipere-de-verre', 'ashigaru-des-braises');
  duel.retoursExilFinTour = [
    { cote: 'joueur', carteId: 'vipere-de-verre', mobaLane: 'right', mobaSlot: 0 },
    { cote: 'joueur', carteId: 'ashigaru-des-braises', mobaLane: 'right', mobaSlot: 1 },
  ];
  terminer(duel, 'joueur');
  assert.equal(duel.arriveeEnAttente, null); assert.equal(duel.transitionRetours, null);
  assert.equal(duel.joueur.creatures.length, 2); assert.equal(duel.tour, 'sorcier');
});

test('retour du camp IA hors tour : l’IA peut choisir puis la transition reprend', () => {
  const duel = partie();
  poser(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 0);
  (duel.sorcier.exil ??= []).push('vipere-de-verre');
  duel.retoursExilFinTour = [{ cote: 'sorcier', carteId: 'vipere-de-verre', mobaLane: 'right', mobaSlot: 0 }];
  terminer(duel, 'joueur');
  assert.equal(duel.arriveeEnAttente.cote, 'sorcier');
  const cible = rpgMobaChoisirArriveeIA(duel, 'sorcier');
  assert.ok(cible); assert.equal(rpgMobaResoudreArrivee(duel, 'sorcier', cible).ok, true);
  assert.equal(duel.tour, 'sorcier'); assert.equal(duel.phase, 'principale');
});

test('la cible voie du Maître revenu reste au choix et peut finir la partie', () => {
  const duel = partie();
  mobaInfliger(duel.moba, 'joueur', 'left', 20);
  mobaVoie(duel.moba, 'right').hp.sorcier = 3;
  (duel.joueur.exil ??= []).push('maitre-du-marteau', 'ashigaru-des-braises');
  duel.retoursExilFinTour = [
    { cote: 'joueur', carteId: 'maitre-du-marteau', mobaLane: 'right', mobaSlot: 0 },
    { cote: 'joueur', carteId: 'ashigaru-des-braises', mobaLane: 'right', mobaSlot: 1 },
  ];
  terminer(duel, 'joueur');
  const result = rpgMobaResoudreArrivee(duel, 'joueur', 'sorcier');
  assert.equal(result.ok, true); assert.equal(mobaVoie(duel.moba, 'right').active, false);
  assert.equal(duel.moba.winner, 'joueur'); assert.equal(duel.transitionRetours, null);
  assert.equal(duel.joueur.creatures.some(e => e.carteId === 'ashigaru-des-braises'), false, 'la victoire arrête les retours suivants');
});

test('en duel classique, un retour hors tour attend aussi le choix du joueur', async () => {
  const { rpgNouveauDuel, rpgJouerCreature, rpgResoudreArriveeCiblee } = await import('../src/games/rpgDuel.js');
  const deck = Array(15).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  duel.sorcier.main = ['gardienne-des-portes-de-sable', 'gardienne-des-portes-de-sable'];
  duel.sorcier.mana.sable = 20;
  const a = rpgJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable').entite;
  const b = rpgJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable').entite;
  assert.ok(a && b);
  duel.tour = 'sorcier'; duel.joueur.exil = ['vipere-de-verre'];
  duel.retoursExilFinTour = [{ cote: 'joueur', carteId: 'vipere-de-verre' }];
  const old = b.atk;
  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'sorcier'); assert.equal(duel.arriveeEnAttente.cote, 'joueur');
  assert.equal(rpgResoudreArriveeCiblee(duel, 'joueur', b.id).ok, true);
  assert.equal(b.atk, Math.max(0, old - 2));
  assert.equal(duel.tour, 'joueur'); assert.equal(duel.transitionRetours, null);
});

test('le retour ne choisit jamais une créature située sur une autre voie', () => {
  const duel = partie();
  rpgFinDeTour(duel);
  const cible = poser(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0);
  rpgFinDeTour(duel);
  (duel.joueur.exil ??= []).push('vipere-de-verre');
  duel.retoursExilFinTour = [{ cote: 'joueur', carteId: 'vipere-de-verre', mobaLane: 'right', mobaSlot: 0 }];
  const attaque = cible.atk;
  terminer(duel, 'joueur');
  assert.equal(cible.atk, attaque); assert.equal(duel.arriveeEnAttente, null);
  assert.equal(duel.tour, 'sorcier');
});

test('PvP : la réponse adverse est résolue avant les retours suivants et la transition', async () => {
  const { rpgNouveauDuel, rpgJouerCreature, rpgMulligan } = await import('../src/games/rpgDuel.js');
  const { rpgPvpAppliquer, rpgPvpCoteActif, rpgPvpVue } = await import('../src/games/rpgPvp.js');
  const deck = Array(15).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, pvp: true, rng: () => .5 });
  rpgMulligan(duel, 'joueur', []); rpgMulligan(duel, 'sorcier', []);
  duel.sorcier.main = ['gardienne-des-portes-de-sable']; duel.sorcier.mana.sable = 20;
  const cible = rpgJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable').entite;
  assert.ok(cible);
  duel.sorcier.main = [];
  duel.joueur.exil = ['vipere-de-verre', 'ashigaru-des-braises'];
  duel.retoursExilFinTour = [
    { cote: 'joueur', carteId: 'vipere-de-verre' },
    { cote: 'joueur', carteId: 'ashigaru-des-braises' },
  ];
  const fin = rpgPvpAppliquer(duel, 'joueur', { type: 'fin-de-tour' });
  assert.equal(fin.ok, true, fin.raison); assert.equal(duel.arriveeEnAttente.cote, 'joueur');
  assert.equal(rpgPvpAppliquer(duel, 'joueur', { type: 'renoncer-arrivee' }).ok, false);
  const vue = rpgPvpVue(duel, 'sorcier');
  assert.equal(vue.arriveeEnAttente.cote, 'sorcier');
  assert.equal(vue.transitionRetours.file[0].cote, 'sorcier');
  duel.sorcier.main = ['rempart-de-dunes']; duel.sorcier.mana.sable = 20;
  const cibleActuelle = () => duel.sorcier.creatures.find(e => e.id === cible.id);
  const attaqueAvant = cibleActuelle().atk;
  assert.equal(rpgPvpAppliquer(duel, 'joueur', { type: 'resoudre-arrivee', cibleId: cible.id }).ok, true);
  assert.equal(rpgPvpCoteActif(duel), 'sorcier');
  assert.ok(duel.effetCreatureEnAttente); assert.equal(cibleActuelle().atk, attaqueAvant);
  assert.equal(duel.joueur.creatures.some(e => e.carteId === 'ashigaru-des-braises'), false);
  assert.equal(rpgPvpAppliquer(duel, 'sorcier', { type: 'jouer-carte', carteId: 'rempart-de-dunes' }).ok, true);
  assert.ok(duel.effetCreatureEnAttente);
  assert.equal(rpgPvpAppliquer(duel, 'sorcier', { type: 'passer-effet' }).ok, true);
  assert.equal(cibleActuelle().atk, Math.max(0, attaqueAvant - 2));
  assert.equal(duel.joueur.creatures.some(e => e.carteId === 'ashigaru-des-braises'), true);
  assert.equal(duel.tour, 'sorcier'); assert.equal(duel.transitionRetours, null);
});

test('le poison et les Heures attendent la désignation de Ténacité puis avancent une seule fois', () => {
  const duel = partie();
  const allie = poser(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0);
  allie.poison = { toursRestants: 2, degats: 1 };
  allie.heures = { restants: 2, effet: null };
  duel.joueur.cimetiere.push('maitre-du-marteau');
  duel.joueur.retoursProgrammes = [{ carteId: 'maitre-du-marteau', tenacite: true, toursRestants: 1, mobaLane: 'right' }];
  duel.tour = 'sorcier';
  const pvAvant = allie.pv;
  rpgFinDeTour(duel);
  assert.equal(duel.phase, 'debut'); assert.ok(duel.arriveeEnAttente);
  assert.equal(allie.pv, pvAvant); assert.equal(allie.poison.toursRestants, 2); assert.equal(allie.heures.restants, 2);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', 'sorcier').ok, true);
  assert.equal(allie.pv, pvAvant - 1); assert.equal(allie.poison.toursRestants, 1); assert.equal(allie.heures.restants, 1);
  assert.equal(duel.phase, 'principale');
});

test('une destruction ciblée suspend le retour suivant jusqu’à sa résolution', async () => {
  const { rpgMobaResoudreDestruction } = await import('../src/games/rpgMobaLocal.js');
  const duel = partie();
  const ghul = poser(duel, 'joueur', 'ghul-des-cendres', 'right', 0);
  const autre = poser(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 1);
  (duel.sorcier.exil ??= []).push('maitre-du-marteau', 'vipere-de-verre');
  duel.retoursExilFinTour = [
    { cote: 'sorcier', carteId: 'maitre-du-marteau', mobaLane: 'right', mobaSlot: 0 },
    { cote: 'sorcier', carteId: 'vipere-de-verre', mobaLane: 'right', mobaSlot: 1 },
  ];
  terminer(duel, 'joueur');
  const marteau = duel.sorcier.creatures.find(e => e.carteId === 'maitre-du-marteau');
  assert.equal(rpgMobaResoudreArrivee(duel, 'sorcier', ghul.id).ok, true);
  assert.equal(duel.destructionsEnAttente[0].cote, 'joueur');
  assert.equal(duel.sorcier.creatures.some(e => e.carteId === 'vipere-de-verre'), false);
  assert.equal(rpgMobaResoudreDestruction(duel, 'joueur', marteau.id).ok, true);
  assert.equal(marteau.pv, 4);
  assert.equal(duel.arriveeEnAttente.carteId, 'vipere-de-verre');
  assert.equal(rpgMobaResoudreArrivee(duel, 'sorcier', autre.id).ok, true);
  assert.equal(duel.transitionRetours, null); assert.equal(duel.tour, 'sorcier');
});

test('PvP : le camp actif peut répondre au retour adverse hors tour', async () => {
  const { rpgNouveauDuel, rpgJouerCreature, rpgMulligan } = await import('../src/games/rpgDuel.js');
  const { rpgPvpAppliquer, rpgPvpCoteActif } = await import('../src/games/rpgPvp.js');
  const deck = Array(15).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, pvp: true, rng: () => .5 });
  rpgMulligan(duel, 'joueur', []); rpgMulligan(duel, 'sorcier', []);
  duel.joueur.main = ['gardienne-des-portes-de-sable']; duel.joueur.mana.sable = 20;
  const cible = rpgJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable').entite;
  duel.joueur.main = []; duel.sorcier.main = [];
  duel.sorcier.exil = ['vipere-de-verre'];
  duel.retoursExilFinTour = [{ cote: 'sorcier', carteId: 'vipere-de-verre' }];
  assert.equal(rpgPvpAppliquer(duel, 'joueur', { type: 'fin-de-tour' }).ok, true);
  assert.equal(duel.tour, 'joueur'); assert.equal(rpgPvpCoteActif(duel), 'sorcier');
  duel.joueur.main = ['rempart-de-dunes']; duel.joueur.mana.sable = 20;
  assert.equal(rpgPvpAppliquer(duel, 'sorcier', { type: 'resoudre-arrivee', cibleId: cible.id }).ok, true);
  assert.equal(rpgPvpCoteActif(duel), 'joueur'); assert.ok(duel.effetCreatureEnAttente);
  assert.equal(rpgPvpAppliquer(duel, 'joueur', { type: 'jouer-carte', carteId: 'rempart-de-dunes' }).ok, true);
  assert.equal(rpgPvpAppliquer(duel, 'joueur', { type: 'passer-effet' }).ok, true);
  assert.equal(duel.tour, 'sorcier'); assert.equal(duel.transitionRetours, null);
});

test('la désignation refuse une autre voie ou un Site sans consommer le choix', () => {
  const duel = partie(); rpgFinDeTour(duel);
  const horsVoie = poser(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0);
  const site = poser(duel, 'sorcier', 'source-de-bimini', 'right', 0);
  const cible = poser(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 1);
  rpgFinDeTour(duel);
  (duel.joueur.exil ??= []).push('vipere-de-verre');
  duel.retoursExilFinTour = [{ cote: 'joueur', carteId: 'vipere-de-verre', mobaLane: 'right', mobaSlot: 0 }];
  terminer(duel, 'joueur');
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', horsVoie.id).ok, false);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', site.id).ok, false);
  assert.ok(duel.arriveeEnAttente);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', cible.id).ok, true);
  assert.equal(duel.tour, 'sorcier');
});
