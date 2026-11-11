import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgDemarrerManaEssai, rpgFinDeTour, rpgMulligan, rpgReglerHasard } from '../src/games/rpgDuel.js';
import { mobaVoie } from '../src/games/rpgMoba.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle, rpgMobaLancerMagie, rpgMobaJouerArme, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';

function partie() {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgMulligan(d, 'joueur', []); rpgMulligan(d, 'sorcier', []); rpgDemarrerManaEssai(d);
  d.joueur.main = ['ashigaru-des-braises'];
  const a = rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(d);
  d.sorcier.main = ['ashigaru-des-braises'];
  const c = rpgMobaJouerCreature(d, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(d); a.ready = true;
  return { d, a, c };
}

test('échange simultané sans blocage et reprise de la phase principale', () => {
  const { d, a, c } = partie();
  a.atk = 5; c.atk = 5;
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, c.id).ok);
  assert.equal(a.attaquee, true); assert.equal(d.fenetreReponse, true);
  const result = rpgMobaResoudreAttaqueIndividuelle(d, 'joueur');
  assert.ok(result.ok, JSON.stringify(result));
  assert.deepEqual(result.resume.blessures, [
    { entiteId: c.id, sourceId: a.id, montant: 5 },
    { entiteId: a.id, sourceId: c.id, montant: 5 },
  ]);
  assert.equal(d.joueur.creatures.length, 0); assert.equal(d.sorcier.creatures.length, 0);
  assert.equal(d.phase, 'principale'); assert.equal(d.attaqueJouee, null); assert.equal(d.combatDeclare, null);
  assert.ok(rpgMobaPlacementCoherent(d));
});

test('Overkill traverse après un échange et une créature ne peut attaquer deux fois', () => {
  const { d, a, c } = partie();
  a.atk = 5; a.overkill = true; c.atk = 0;
  const hp = mobaVoie(d.moba, 'left').hp.sorcier;
  const defense = c.def;
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, c.id).ok);
  const result = rpgMobaResoudreAttaqueIndividuelle(d, 'joueur');
  assert.ok(result.ok, JSON.stringify(result));
  assert.equal(mobaVoie(d.moba, 'left').hp.sorcier, hp - Math.max(0, 5 - defense));
  assert.equal(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id).ok, false);
});

test('une cible retirée pendant la réponse annule sans redirection', () => {
  const { d, a, c } = partie();
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, c.id).ok);
  c.infiltration = true; // Une réponse lui prête Infiltration avant les dégâts.
  const hp = mobaVoie(d.moba, 'left').hp.sorcier;
  const result = rpgMobaResoudreAttaqueIndividuelle(d, 'joueur');
  assert.ok(result.ok, JSON.stringify(result)); assert.equal(result.annule, true);
  assert.equal(mobaVoie(d.moba, 'left').hp.sorcier, hp);
});

test('Attaque ciblée : pas de riposte ordinaire', () => {
  const { d, a, c } = partie();
  a.coupRapide = true; a.atk = 3; c.atk = 8;
  const pv = a.pv;
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, c.id).ok);
  const result = rpgMobaResoudreAttaqueIndividuelle(d, 'joueur');
  assert.ok(result.ok, JSON.stringify(result)); assert.equal(a.pv, pv);
});

test('une Magie Rapide qui détruit l’attaquant termine sa seule attaque et ne ferme pas le tour', () => {
  const { d, a, c } = partie();
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, c.id).ok);
  d.sorcier.main = ['trait-de-braise'];
  const result = rpgMobaLancerMagie(d, 'sorcier', 'trait-de-braise', a.id);
  assert.ok(result.ok, JSON.stringify(result));
  assert.equal(result.combatTermine, true); assert.equal(d.combatDeclare, null);
  assert.equal(d.phase, 'principale'); assert.equal(d.attaqueJouee, null);
});

test('la fenêtre de réponse permet une Embuscade et revient à la même attaque', async () => {
  const { d, a, c } = partie();
  const { rpgMobaPasserCreature, rpgMobaPeutEmbuscade } = await import('../src/games/rpgMobaLocal.js');
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, c.id).ok);
  d.sorcier.main = ['garde-du-trone-givre'];
  assert.equal(rpgMobaPeutEmbuscade(d, 'sorcier', 'garde-du-trone-givre'), true);
  const annonce = rpgMobaJouerCreature(d, 'sorcier', 'garde-du-trone-givre', 'left', 1, { ouvrirReponse: true });
  assert.ok(annonce.ok, JSON.stringify(annonce));
  assert.ok(rpgMobaPasserCreature(d, 'joueur').ok);
  assert.equal(d.combatDeclare.cibleIndividuelle.cibleId, c.id);
  assert.equal(d.fenetreReponse, true);
  assert.ok(rpgMobaResoudreAttaqueIndividuelle(d, 'joueur').ok);
});

test('deux créatures attaquent séparément pendant le même tour', () => {
  const { d, a, c } = partie();
  d.joueur.main = ['ashigaru-des-braises'];
  const b = rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', 'right', 0).entite;
  b.ready = true; a.coupRapide = true;
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, null).ok);
  assert.ok(rpgMobaResoudreAttaqueIndividuelle(d, 'joueur').ok);
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', b.id, null).ok);
  assert.ok(rpgMobaResoudreAttaqueIndividuelle(d, 'joueur').ok);
  assert.equal(a.attaquee, true); assert.equal(b.attaquee, true);
  assert.equal(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, c.id).ok, false);
});

test('Provocation accorde son bonus dès la déclaration, et un Défenseur apparu ne redirige pas', () => {
  const { d, a, c } = partie();
  c.provocation = true; c.atk = 0; const defense = c.def;
  assert.equal(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, null).ok, false);
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, c.id).ok);
  assert.equal(c.def, defense + 1);
  d.sorcier.main = ['garde-du-trone-givre'];
  assert.ok(rpgMobaJouerCreature(d, 'sorcier', 'garde-du-trone-givre', 'left', 1, { ouvrirReponse: true }).ok);
  // Pas de redirection vers une nouvelle présence après la fenêtre de réponse.
  return import('../src/games/rpgMobaLocal.js').then(({ rpgMobaPasserCreature }) => {
    assert.ok(rpgMobaPasserCreature(d, 'joueur').ok);
    assert.ok(rpgMobaResoudreAttaqueIndividuelle(d, 'joueur').ok);
    assert.equal(d.sorcier.creatures.find((e) => e.carteId === 'garde-du-trone-givre').pv, 4);
  });
});

test('un Bouclier de lumière empêche aussi le passage Overkill', () => {
  const { d, a, c } = partie();
  a.atk = 5; a.overkill = true; c.atk = 0; c.bouclierLumiere = true;
  const hp = mobaVoie(d.moba, 'left').hp.sorcier;
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, c.id).ok);
  const result = rpgMobaResoudreAttaqueIndividuelle(d, 'joueur');
  assert.ok(result.ok);
  assert.deepEqual(result.resume.blessures, []);
  assert.equal(mobaVoie(d.moba, 'left').hp.sorcier, hp);
  assert.equal(c.bouclierLumiere, false);
});

test('l’IA évalue une attaque individuelle sur copie sans consommer son tour', async () => {
  const { rpgMobaChoisirAttaqueIndividuelleIA } = await import('../src/games/rpgMobaAI.js');
  const { d, a, c } = partie(); a.coupRapide = true;
  const avant = JSON.stringify(d);
  const choix = rpgMobaChoisirAttaqueIndividuelleIA(d, 'joueur');
  assert.ok(choix); assert.equal(choix.attaquantId, a.id);
  assert.equal(JSON.stringify(d), avant);
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', choix.attaquantId, choix.cibleId).ok);
});

test('Contre-attaque ciblée riposte même si la créature ciblée est détruite', () => {
  const { d, a, c } = partie();
  a.coupRapide = true; a.atk = 3; a.pv = 9; a.pvMax = 9; a.def = 9;
  c.contreAttaque = true; c.atk = 2;
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, c.id).ok);
  assert.ok(rpgMobaResoudreAttaqueIndividuelle(d, 'joueur').ok);
  assert.equal(d.sorcier.creatures.some((e) => e.id === c.id), false);
  assert.equal(a.pv, 7);
});

test('les effets qui exigent un blocage ne se déclenchent pas dans l’échange normal', () => {
  const { d, a, c } = partie();
  // Le Vampire infligerait un dégât préalable s'il était bloqué en classique.
  a.carteId = 'vampire-des-braises'; a.atk = 0; a.pv = 5; a.pvMax = 5; a.def = 5;
  c.atk = 0; const defense = c.pv;
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, c.id).ok);
  assert.ok(rpgMobaResoudreAttaqueIndividuelle(d, 'joueur').ok);
  assert.equal(c.pv, defense);
});

test('une cible qui quitte le plateau après l’annonce annule l’attaque sans viser la voie', async () => {
  const { mobaRetirer } = await import('../src/games/rpgMoba.js');
  const { d, a, c } = partie();
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, c.id).ok);
  d.sorcier.creatures = d.sorcier.creatures.filter((e) => e.id !== c.id);
  assert.ok(mobaRetirer(d.moba, 'sorcier', c.id).ok);
  const hp = mobaVoie(d.moba, 'left').hp.sorcier;
  const result = rpgMobaResoudreAttaqueIndividuelle(d, 'joueur');
  assert.equal(result.annule, true); assert.equal(mobaVoie(d.moba, 'left').hp.sorcier, hp);
});

test('Overkill est simultané même si la riposte ordinaire tue aussi l’attaquant', () => {
  const { d, a, c } = partie();
  a.atk = 5; a.overkill = true; c.atk = 5;
  const hp = mobaVoie(d.moba, 'left').hp.sorcier, defense = c.def;
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, c.id).ok);
  assert.ok(rpgMobaResoudreAttaqueIndividuelle(d, 'joueur').ok);
  assert.equal(d.joueur.creatures.length, 0);
  assert.equal(mobaVoie(d.moba, 'left').hp.sorcier, hp - (5 - defense));
});

test('l’attaque directe conquiert le centre sans choix ni transfert de PV', () => {
  const { d, a } = partie();
  // Utiliser un emplacement central valide pour une seconde créature.
  d.joueur.main = ['ashigaru-des-braises'];
  const centre = rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', 'center', 0).entite;
  centre.ready = true; centre.atk = 15;
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', centre.id, null).ok);
  const result = rpgMobaResoudreAttaqueIndividuelle(d, 'joueur');
  assert.ok(result.ok, JSON.stringify(result));
  assert.equal(d.moba.centerChoice, null);
  assert.deepEqual(d.moba.centerJoined, { side: 'joueur', laneId: null });
  assert.equal(mobaVoie(d.moba, 'center').hp.joueur, 0);
  assert.equal(mobaVoie(d.moba, 'left').hp.joueur, 20);
  assert.equal(mobaVoie(d.moba, 'right').hp.joueur, 20);
  assert.equal(centre.mobaLane, 'center');
  assert.equal(d.combatDeclare, null); assert.equal(d.phase, 'principale');
  assert.ok(rpgMobaPlacementCoherent(d));
  assert.equal(a.attaquee, false);
});

test('Overkill ne traverse pas une esquive', () => {
  const { d, a, c } = partie();
  a.atk = 5; a.overkill = true; c.atk = 0; c.esquive = true; c.esquiveChance = 1;
  const hp = mobaVoie(d.moba, 'left').hp.sorcier;
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, c.id).ok);
  assert.ok(rpgMobaResoudreAttaqueIndividuelle(d, 'joueur').ok);
  assert.equal(c.pv, c.pvMax); assert.equal(mobaVoie(d.moba, 'left').hp.sorcier, hp);
});

test('une Attaque ciblée peut rater et ne provoque aucun Overkill', () => {
  const { d, a, c } = partie();
  a.coupRapide = true; a.overkill = true; a.atk = 5;
  const hp = mobaVoie(d.moba, 'left').hp.sorcier;
  rpgReglerHasard(d, () => 0);
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, c.id).ok);
  const result = rpgMobaResoudreAttaqueIndividuelle(d, 'joueur');
  assert.equal(result.resume.coupsRapides[0].rate, true);
  assert.deepEqual(result.resume.blessures, []);
  assert.equal(c.pv, c.pvMax); assert.equal(mobaVoie(d.moba, 'left').hp.sorcier, hp);
});

test('la Sphère peut renvoyer la créature ciblée avant l’échange', () => {
  const { d, a, c } = partie();
  d.joueur.main = ['sphere-de-rotation'];
  const equipe = rpgMobaJouerArme(d, 'joueur', 'sphere-de-rotation', a.id);
  assert.ok(equipe.ok, JSON.stringify(equipe));
  rpgReglerHasard(d, () => 0);
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, c.id).ok);
  const result = rpgMobaResoudreAttaqueIndividuelle(d, 'joueur');
  assert.ok(result.ok, JSON.stringify(result)); assert.equal(result.annule, true);
  assert.equal(d.sorcier.creatures.some((e) => e.id === c.id), false);
  assert.ok(d.sorcier.main.includes(c.carteId)); assert.ok(rpgMobaPlacementCoherent(d));
});

test('les anciennes entrées MOBA ne permettent ni combat groupé ni blocage', async () => {
  const { rpgMobaDeclarerAttaque, rpgMobaDeclarerBlocages, rpgMobaLancerAttaque } = await import('../src/games/rpgMobaLocal.js');
  const { d, a, c } = partie();
  assert.equal(rpgMobaDeclarerAttaque(d, 'joueur', [a.id, a.id]).ok, false);
  assert.equal(rpgMobaLancerAttaque(d, 'joueur', [a.id]).ok, false);
  assert.ok(rpgMobaDeclarerAttaque(d, 'joueur', [a.id], { [a.id]: c.id }).ok);
  assert.equal(rpgMobaDeclarerBlocages(d, 'sorcier', { [a.id]: [c.id] }).ok, false);
  assert.equal(rpgMobaLancerAttaque(d, 'joueur', [a.id], { [a.id]: [c.id] }, { declaree: true }).ok, false);
  assert.ok(rpgMobaLancerAttaque(d, 'joueur', [a.id], {}, { declaree: true }).ok);
});

test('le gel avant blessures agit aussi lorsque la cible gèle l’attaquant', () => {
  const { d, a, c } = partie();
  c.carteId = 'archere-viking-du-givre'; c.atk = 0; a.atk = 4;
  rpgReglerHasard(d, () => 0);
  const pv = c.pv;
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, c.id).ok);
  assert.ok(rpgMobaResoudreAttaqueIndividuelle(d, 'joueur').ok);
  assert.ok(a.gelToursRestants > 0); assert.equal(c.pv, pv);
});

test('Tojiro en réponse ne sacrifie pas la cible en présence du Djinn attaquant', async () => {
  const { rpgMobaPasserCreature } = await import('../src/games/rpgMobaLocal.js');
  const { d, a, c } = partie();
  a.carteId = 'djinn-du-dernier-brasier';
  c.pv = c.pvMax = c.def = 10; c.atk = 0;
  const hp = mobaVoie(d.moba, 'left').hp.sorcier;
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, c.id).ok);
  d.sorcier.main = ['tojiro-le-pourfendeur']; d.sorcier.mana.braise = 20;
  const annonce = rpgMobaJouerCreature(d, 'sorcier', 'tojiro-le-pourfendeur', 'left', 1, { ouvrirReponse: true, sacrificeIds: [] });
  assert.ok(annonce.ok, JSON.stringify(annonce));
  assert.ok(rpgMobaPasserCreature(d, 'joueur').ok);
  assert.ok(d.sorcier.creatures.some((e) => e.id === c.id));
  const result = rpgMobaResoudreAttaqueIndividuelle(d, 'joueur');
  assert.ok(result.ok, JSON.stringify(result)); assert.notEqual(result.annule, true);
  assert.ok(c.pv < 10);
  assert.equal(mobaVoie(d.moba, 'left').hp.sorcier, hp); assert.ok(rpgMobaPlacementCoherent(d));
});
