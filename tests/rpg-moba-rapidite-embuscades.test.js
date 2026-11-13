import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_DUEL_CARDS, RPG_JETON_CARDS, cardById } from '../src/games/rpgCards.js';
import { RPG_TOUR_OUBLIEE_CARTES } from '../src/games/rpgTourOubliee.js';
import { rpgDemarrerManaEssai, rpgFinDeTour, rpgMulligan, rpgNouveauDuel, rpgJouerCreature, rpgJouerArme, rpgPeutAttaquer, rpgPeutRepondre } from '../src/games/rpgDuel.js';
import { MOBA_RAPIDITE_EMBUSCADES } from '../src/games/rpgMobaRapidite.js';
import { MOBA_EMBUSCADES_IMPRIMEES } from '../src/games/rpgMobaEmbuscadesImprimees.js';
import { rpgMobaCartePourApercu, rpgMobaNotesCarte } from '../src/games/rpgMobaPresentation.js';
import { rpgMobaChoisirEmbuscadeIA } from '../src/games/rpgMobaAI.js';
import { rpgMobaNouveauDuel, rpgMobaPeutEmbuscade, rpgMobaJouerCreature, rpgMobaPasserCreature, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaJouerArme, rpgMobaLancerMagie, rpgMobaPlacementCoherent, rpgMobaResoudreArrivee } from '../src/games/rpgMobaLocal.js';

const parties = () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  for (const side of ['joueur', 'sorcier']) Object.assign(d[side].mana, { sable: 30, braise: 30, eau: 30, neige: 30, tenebres: 30 });
  return d;
};
const withEnemy = (d, id = 'ashigaru-des-braises') => {
  rpgFinDeTour(d);
  d.sorcier.main = [id];
  const result = rpgMobaJouerCreature(d, 'sorcier', id, 'left', 0);
  assert.ok(result.ok, JSON.stringify(result));
  rpgFinDeTour(d);
  return result.entite;
};

test('audit de toutes les Rapidités, jetons et Embuscades imprimées', () => {
  const creatures = RPG_DUEL_CARDS.filter((c) => c.rapidite);
  assert.equal(creatures.length, 25);
  assert.deepEqual(creatures.filter((c) => !MOBA_RAPIDITE_EMBUSCADES[c.id]).map((c) => c.id), ['feriel']);
  assert.deepEqual(RPG_JETON_CARDS.filter((c) => c.rapidite).map((c) => c.id), ['chien-de-sable', 'guepard']);
  assert.deepEqual(RPG_DUEL_CARDS.filter((c) => c.donne?.rapidite).map((c) => c.id), ['sandales-de-tislit']);
  assert.equal(RPG_TOUR_OUBLIEE_CARTES.filter((c) => c.rapidite).length, 4);
  assert.equal(Object.keys(MOBA_EMBUSCADES_IMPRIMEES).length, 10);
  for (const carte of creatures) {
    const apercu = rpgMobaCartePourApercu(carte);
    assert.equal(apercu.reactionTourAdverse, false, carte.id);
    assert.equal(apercu.rapidite, true, carte.id);
    assert.match(apercu.text, /Embuscade MOBA.*tour adverse/, carte.id);
    assert.ok(apercu.text.includes('Rapidité') || !carte.text.includes('Rapidité'), carte.id);
    assert.equal(cardById(carte.id).reactionTourAdverse, undefined, 'catalogue classique inchangé');
  }
  for (const id of Object.keys(MOBA_EMBUSCADES_IMPRIMEES)) {
    assert.match(rpgMobaCartePourApercu(cardById(id)).text, /tour adverse/);
    assert.doesNotMatch(rpgMobaCartePourApercu(cardById(id)).text, /jouer cette créature pendant le tour adverse/);
    assert.match(rpgMobaNotesCarte(cardById(id)).join(' '), /réponse adverse/);
  }
  assert.match(rpgMobaCartePourApercu(cardById('sorcier-du-ressac-noir')).text, /renvoie/);
  assert.doesNotMatch(rpgMobaCartePourApercu(cardById('sorcier-du-ressac-noir')).text, /contrez/);
  assert.deepEqual(rpgMobaCartePourApercu(cardById('sandales-de-tislit')).bonus, { atk: 1, def: 1 });
  assert.deepEqual(cardById('sandales-de-tislit').bonus, { atk: 0, def: 1 });
});

test('duel classique : Rapidité imprimée et accordée par les Sandales restent inchangées', () => {
  const d = rpgNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok);
  d.joueur.mana.sable = 30;
  d.joueur.main = ['fennec-des-decombres', 'gardienne-des-portes-de-sable', 'sandales-de-tislit'];
  const rapide = rpgJouerCreature(d, 'joueur', 'fennec-des-decombres').entite;
  const porteur = rpgJouerCreature(d, 'joueur', 'gardienne-des-portes-de-sable').entite;
  assert.equal(rapide.rapidite, true);
  assert.equal(rpgPeutAttaquer(rapide), true);
  assert.equal(rpgPeutAttaquer(porteur), false);
  const avantArme = { atk: porteur.atk, pvMax: porteur.pvMax };
  assert.equal(rpgJouerArme(d, 'joueur', 'sandales-de-tislit', porteur.id).ok, true);
  assert.equal(porteur.atk, avantArme.atk);
  assert.equal(porteur.pvMax, avantArme.pvMax + 1);
  assert.equal(porteur.rapidite, true);
  assert.equal(rpgPeutAttaquer(porteur), true);
  assert.equal(cardById('sandales-de-tislit').donne.rapidite, true);
});

test('phase principale personnelle : pose spéciale globale, sans sacrifice, sans quota ni pose normale', () => {
  const d = parties();
  const enemy = withEnemy(d);
  d.joueur.main = ['chacal-du-seuil', 'chacal-du-seuil', 'ashigaru-des-braises'];
  assert.ok(rpgMobaPeutEmbuscade(d, 'joueur', 'chacal-du-seuil'));
  // L'adversaire est à gauche, la pose peut être faite à droite.
  assert.ok(rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', 'left', 0).ok);
  assert.equal(d.moba.creaturesJouees.joueur, true);
  for (const slot of [0, 1]) {
    assert.equal(rpgMobaPeutEmbuscade(d, 'joueur', 'chacal-du-seuil'), true);
    const annonce = rpgMobaJouerCreature(d, 'joueur', 'chacal-du-seuil', 'right', slot, { ouvrirReponse: true, sacrificeIds: [] });
    assert.equal(annonce.creatureEnAttente, true, JSON.stringify(annonce));
    assert.equal(rpgMobaPasserCreature(d, 'sorcier').ok, true);
  }
  assert.equal(d.moba.creaturesJouees.joueur, true);
  assert.equal(d.sorcier.creatures.some((e) => e.id === enemy.id), true);
  assert.equal(rpgMobaPlacementCoherent(d), true);
});

test('aucune Embuscade hors tour, pendant les réponses, ni sans condition', () => {
  const d = parties();
  withEnemy(d);
  d.joueur.main = ['chacal-du-seuil'];
  for (const phase of ['combat', 'fin']) {
    d.phase = phase;
    assert.equal(rpgMobaPeutEmbuscade(d, 'joueur', 'chacal-du-seuil'), false);
    assert.equal(rpgMobaJouerCreature(d, 'joueur', 'chacal-du-seuil', 'right', 0).ok, false);
  }
  d.phase = 'principale';
  d.fenetreReponse = true;
  assert.equal(rpgMobaPeutEmbuscade(d, 'joueur', 'chacal-du-seuil'), false);
  d.fenetreReponse = false;
  assert.equal(rpgMobaJouerCreature(d, 'sorcier', 'chacal-du-seuil', 'right', 0).ok, false);
  assert.equal(rpgJouerCreature(d, 'sorcier', 'chacal-du-seuil').ok, false, 'moteur également verrouillé');
  assert.equal(rpgMobaChoisirEmbuscadeIA(d, 'sorcier'), null);
  d.sorcier.main = ['chacal-du-seuil']; d.joueur.main = [];
  assert.equal(rpgPeutRepondre(d, 'sorcier'), false);
  d.sorcier.creatures = []; // condition de Chacal retirée sans toucher au plateau allié
  assert.equal(rpgMobaPeutEmbuscade(d, 'joueur', 'chacal-du-seuil'), false);
});

test('IA : une invocation spéciale de son tour est proposée, sans muter le duel', () => {
  const d = parties();
  withEnemy(d);
  d.sorcier.main = ['chacal-du-seuil'];
  // Le joueur peut avoir déjà dépensé sa pose normale : l'IA n'en dépend pas.
  d.joueur.main = ['chacal-du-seuil'];
  d.moba.creaturesJouees.joueur = true;
  const before = JSON.stringify(d);
  const choix = rpgMobaChoisirEmbuscadeIA(d, 'joueur');
  assert.equal(choix?.id, 'chacal-du-seuil');
  assert.equal(JSON.stringify(d), before);
  assert.equal(rpgMobaChoisirEmbuscadeIA(d, 'sorcier'), null);
});

test('Cavalier des deux sabres : exige un Samouraï armé, non simplement un Samouraï', () => {
  const d = parties();
  d.joueur.main = ['ronin-du-soleil-rouge', 'cavalier-des-deux-sabres'];
  const samurai = rpgMobaJouerCreature(d, 'joueur', 'ronin-du-soleil-rouge', 'left', 0).entite;
  assert.ok(samurai);
  assert.equal(rpgMobaPeutEmbuscade(d, 'joueur', 'cavalier-des-deux-sabres'), false);
  samurai.arme = { carteId: 'takouba-des-pistes' };
  assert.equal(rpgMobaPeutEmbuscade(d, 'joueur', 'cavalier-des-deux-sabres'), true);
  const res = rpgMobaJouerCreature(d, 'joueur', 'cavalier-des-deux-sabres', 'right', 0, { sacrificeIds: [] });
  assert.ok(res.entite, JSON.stringify(res));
  assert.equal(rpgMobaPlacementCoherent(d), true);
});

test('Sentinelle : condition globale, arrivée ciblée hors combat sur sa voie', () => {
  const d = parties();
  const enemy = withEnemy(d);
  d.joueur.main = ['sentinelle-des-sables'];
  assert.equal(rpgMobaPeutEmbuscade(d, 'joueur', 'sentinelle-des-sables'), true);
  const result = rpgMobaJouerCreature(d, 'joueur', 'sentinelle-des-sables', 'left', 0, { sacrificeIds: [] });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(d.arriveeEnAttente?.carteId, 'sentinelle-des-sables');
  const cible = rpgMobaResoudreArrivee(d, 'joueur', enemy.id);
  assert.ok(cible.ok, JSON.stringify(cible));
  assert.equal(rpgMobaPlacementCoherent(d), true);
});

test('Sorcier du ressac : son arrivée ne contre aucune annonce, renvoie la petite créature', () => {
  const d = parties();
  const enemy = withEnemy(d);
  d.joueur.main = ['sorcier-du-ressac-noir'];
  d.joueur.cimetiere.push('poigne-de-givre');
  // Un Vampire allié sur une autre voie (la condition reste globale).
  d.joueur.main.push('vampire-des-braises');
  const vampire = rpgMobaJouerCreature(d, 'joueur', 'vampire-des-braises', 'right', 0).entite;
  assert.ok(vampire);
  assert.equal(rpgMobaPeutEmbuscade(d, 'joueur', 'sorcier-du-ressac-noir'), true);
  const result = rpgMobaJouerCreature(d, 'joueur', 'sorcier-du-ressac-noir', 'right', 1, { sacrificeIds: [] });
  assert.ok(result.entite, JSON.stringify(result));
  assert.equal(d.sorcier.creatures.some((e) => e.id === enemy.id), false);
  assert.equal(d.sorcier.main.includes(enemy.carteId), true);
  assert.equal(rpgMobaPlacementCoherent(d), true);
});

for (const [id, jeton] of [['tarek', 'chien-de-sable'], ['kusayla-roi-des-imazighen', 'guepard']]) test(`${id} : jeton créé sous condition propre et sans sacrifice`, () => {
  const d = parties();
  d.joueur.main = ['gardienne-des-portes-de-sable', id];
  const allie = rpgMobaJouerCreature(d, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  assert.ok(allie);
  if (id === 'tarek') { allie.pvMax += 1; } // blessure de la créature Sable
  else { const enemy = withEnemy(d, 'ashigaru-des-braises'); enemy.atk = 3; }
  if (id !== 'tarek') d.joueur.main = [id];
  assert.equal(rpgMobaPeutEmbuscade(d, 'joueur', id), true);
  const result = rpgMobaJouerCreature(d, 'joueur', id, 'right', 0, { sacrificeIds: [] });
  assert.ok(result.entite, JSON.stringify(result));
  assert.ok(d.joueur.creatures.some((e) => e.carteId === jeton && e.jeton));
  assert.equal(rpgMobaPlacementCoherent(d), true);
});
test('Sandales MOBA : +1/+1 pendant son tour, sans Rapidité ni réaction', () => {
  const d = parties();
  d.joueur.main = ['gardienne-des-portes-de-sable', 'sandales-de-tislit', 'cuirasse-de-sel'];
  const porteur = rpgMobaJouerCreature(d, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  assert.ok(porteur);
  const avant = { atk: porteur.atk, def: porteur.def, pv: porteur.pv, pvMax: porteur.pvMax };
  const res = rpgMobaJouerArme(d, 'joueur', 'sandales-de-tislit', porteur.id);
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(porteur.arme?.carteId, 'sandales-de-tislit');
  assert.equal(porteur.rapidite, false);
  assert.deepEqual([porteur.atk, porteur.def, porteur.pv, porteur.pvMax], [avant.atk + 1, avant.def + 1, avant.pv + 1, avant.pvMax + 1]);
  d.moba.armesJouees.joueur = false; // Vérifier séparément le retrait du bonus à la substitution.
  assert.ok(rpgMobaJouerArme(d, 'joueur', 'cuirasse-de-sel', porteur.id).ok);
  assert.equal(porteur.atk, avant.atk);
  assert.ok(rpgMobaPlacementCoherent(d));
});

test('Sandales MOBA : Brise-lame retire aussi leur bonus de force', () => {
  const d = parties();
  d.joueur.main = ['gardienne-des-portes-de-sable', 'sandales-de-tislit'];
  const porteur = rpgMobaJouerCreature(d, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  const atk = porteur.atk;
  assert.ok(rpgMobaJouerArme(d, 'joueur', 'sandales-de-tislit', porteur.id).ok);
  assert.equal(porteur.atk, atk + 1);
  rpgFinDeTour(d); rpgFinDeTour(d);
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', porteur.id, null, 'left').ok);
  d.sorcier.main = ['brise-lame'];
  assert.ok(rpgMobaLancerMagie(d, 'sorcier', 'brise-lame', porteur.id).ok);
  assert.equal(porteur.arme, null);
  assert.equal(porteur.atk, atk);
  assert.ok(d.combatDeclare && rpgMobaPlacementCoherent(d));
});

test('Sandales MOBA : aucune réponse à une attaque adverse, même sur la voie attaquée', () => {
  const d = parties();
  rpgFinDeTour(d);
  d.sorcier.main = ['gardienne-des-portes-de-sable', 'sandales-de-tislit'];
  const porteur = rpgMobaJouerCreature(d, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  assert.ok(porteur);
  rpgFinDeTour(d);
  d.joueur.main = ['ashigaru-des-braises'];
  const attaquant = rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(d); rpgFinDeTour(d);
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', attaquant.id, porteur.id, 'left').ok);
  const avant = JSON.stringify(d);
  assert.equal(rpgMobaJouerArme(d, 'sorcier', 'sandales-de-tislit', porteur.id).ok, false);
  assert.equal(JSON.stringify(d), avant);
  assert.equal(rpgMobaPlacementCoherent(d), true);
});


test('Porte-étendard : le renfort MOBA dure aussi pendant le prochain tour adverse', () => {
  const d = parties();
  d.joueur.main = ['vampire-des-braises'];
  const premier = rpgMobaJouerCreature(d, 'joueur', 'vampire-des-braises', 'left', 0).entite;
  assert.ok(premier);
  rpgFinDeTour(d); rpgFinDeTour(d);
  d.joueur.main = ['vampire-des-braises', 'porte-etendard-de-leclipse'];
  const second = rpgMobaJouerCreature(d, 'joueur', 'vampire-des-braises', 'left', 1).entite;
  assert.ok(second);
  premier.pv -= 1;
  const defense = premier.pvMax;
  assert.equal(rpgMobaPeutEmbuscade(d, 'joueur', 'porte-etendard-de-leclipse'), true);
  assert.ok(rpgMobaJouerCreature(d, 'joueur', 'porte-etendard-de-leclipse', 'right', 0, { sacrificeIds: [] }).entite);
  assert.equal(premier.pvMax, defense + 2);
  rpgFinDeTour(d);
  assert.equal(premier.pvMax, defense + 2, 'le buff demeure durant le tour adverse');
  rpgFinDeTour(d);
  assert.equal(premier.pvMax, defense, 'le buff expire après le tour adverse');
});

test('Embuscade spéciale non imprimée : condition globale, même après la pose normale', () => {
  const d = parties();
  d.joueur.main = ['gardienne-des-portes-de-sable', 'faiseur-de-passage'];
  assert.ok(rpgMobaJouerCreature(d, 'joueur', 'gardienne-des-portes-de-sable', 'right', 0).entite);
  assert.equal(rpgMobaPeutEmbuscade(d, 'joueur', 'faiseur-de-passage'), true);
  const result = rpgMobaJouerCreature(d, 'joueur', 'faiseur-de-passage', 'left', 0, { sacrificeIds: [] });
  assert.ok(result.entite, JSON.stringify(result));
  assert.equal(d.moba.creaturesJouees.joueur, true);
  assert.equal(rpgMobaPlacementCoherent(d), true);
});

test('moteur direct : le drapeau spécial ne permet pas de contourner les conditions', () => {
  const d = parties();
  d.joueur.main = ['cavalier-des-deux-sabres'];
  const before = JSON.stringify(d);
  assert.equal(rpgJouerCreature(d, 'joueur', 'cavalier-des-deux-sabres', null,
    { invocationSpecialeMoba: true }).ok, false);
  assert.equal(JSON.stringify(d), before);
});
