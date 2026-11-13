import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS, cardById } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgConditionEmbuscadeRemplie, rpgBlesserCreature, rpgFinDeTour, rpgOuvrirFinDeTour, rpgPeutRepondre, rpgSorcierMagieRapide } from '../src/games/rpgDuel.js';
import { rpgCiblesIndividuellesClassique, rpgCibleIndividuelleClassiqueEncoreLegale, rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique, rpgChoisirAttaqueIndividuelleClassiqueIA } from '../src/games/rpgCombatIndividuelClassique.js';

function partie() {
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => .9 });
  for (const cote of ['joueur', 'sorcier']) duel[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  return duel;
}
function poser(duel, cote, id = 'ashigaru-des-braises') {
  // Construction de plateau de test, indépendante du quota d'invocation.
  duel[cote].invocationNormaleJouee = false;
  duel[cote].main.push(id);
  const res = rpgJouerCreature(duel, cote, id);
  assert.ok(res.ok, res.raison);
  res.entite.ready = true;
  return res.entite;
}

test('les cibles sont celles du MOBA sans les voies : Envol, Infiltration et priorités', () => {
  const d = partie(), a = poser(d, 'joueur'), sol = poser(d, 'sorcier'), vol = poser(d, 'sorcier'), cache = poser(d, 'sorcier');
  vol.envol = true; cache.infiltration = true;
  assert.deepEqual(rpgCiblesIndividuellesClassique(d, 'joueur', a.id), { cibles: [sol.id], directe: false });
  a.envol = true;
  assert.deepEqual(rpgCiblesIndividuellesClassique(d, 'joueur', a.id), { cibles: [sol.id, vol.id], directe: false });
  vol.provocation = true; sol.defenseur = true;
  assert.deepEqual(rpgCiblesIndividuellesClassique(d, 'joueur', a.id), { cibles: [vol.id], directe: false });
  vol.provocation = false;
  assert.deepEqual(rpgCiblesIndividuellesClassique(d, 'joueur', a.id), { cibles: [sol.id], directe: false });
  sol.defenseur = false; a.coupRapide = true;
  assert.deepEqual(rpgCiblesIndividuellesClassique(d, 'joueur', a.id), { cibles: [sol.id, vol.id, cache.id], directe: true });
});

test('déclaration puis échange simultané, sans blocage ni phase d’attaque globale', () => {
  const d = partie(), a = poser(d, 'joueur'), c = poser(d, 'sorcier');
  a.atk = 5; c.atk = 5;
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, c.id).ok);
  assert.equal(d.fenetreReponse, true);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(r.resume.blessures.length, 2);
  assert.equal(d.joueur.creatures.length, 0); assert.equal(d.sorcier.creatures.length, 0);
  assert.equal(d.phase, 'principale'); assert.equal(d.attaqueJouee, null);
  assert.equal(d.combatDeclare, null); assert.equal(d.fenetreReponse, false);
});

test('deux créatures attaquent séparément ; la même ne peut attaquer deux fois', () => {
  const d = partie(), a = poser(d, 'joueur'), b = poser(d, 'joueur');
  const pv = d.sorcier.pv;
  for (const e of [a, b]) {
    assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', e.id).ok);
    assert.ok(rpgResoudreAttaqueIndividuelleClassique(d, 'joueur').ok);
  }
  assert.equal(d.sorcier.pv, pv - a.atk - b.atk);
  assert.equal(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id).raison, 'pas-pret');
});

test('un refus ne consomme rien et le PvP ne peut utiliser ce chemin', () => {
  const d = partie(), a = poser(d, 'joueur'); poser(d, 'sorcier');
  const avant = JSON.stringify(d);
  assert.equal(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id).raison, 'cible');
  assert.equal(JSON.stringify(d), avant);
  d.pvp = true;
  assert.equal(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id).raison, 'mode');
});

test('une cible disparue ou rendue inaccessible pendant la réponse annule sans rediriger', () => {
  const d = partie(), a = poser(d, 'joueur'), c = poser(d, 'sorcier');
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, c.id).ok);
  const pv = d.sorcier.pv;
  c.infiltration = true;
  assert.equal(rpgCibleIndividuelleClassiqueEncoreLegale(d, 'joueur', a.id, c.id, false), false);
  assert.equal(rpgResoudreAttaqueIndividuelleClassique(d, 'joueur').annule, true);
  assert.equal(d.sorcier.pv, pv); assert.equal(a.attaquee, true);
});

test('le déclencheur de blocage détruit l’attaquant avant les dégâts ordinaires', () => {
  const d = partie(), a = poser(d, 'joueur'), c = poser(d, 'sorcier', 'vampire-des-braises');
  a.pv = 1; a.atk = 8; c.atk = 8; const pv = c.pv;
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, c.id).ok);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok); assert.equal(d.joueur.creatures.some(e => e.id === a.id), false);
  assert.equal(c.pv, pv); assert.deepEqual(r.resume.blessures, []);
  assert.equal(r.resume.effetsAvantCombat[0].entiteId, a.id);
});

test('le déclencheur d’attaque détruit la cible avant les dégâts ordinaires', () => {
  const d = partie(), a = poser(d, 'joueur', 'vampire-des-braises'), c = poser(d, 'sorcier');
  c.pv = 1; c.atk = 8; const pv = a.pv;
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, c.id).ok);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok); assert.equal(d.sorcier.creatures.some(e => e.id === c.id), false);
  assert.equal(a.pv, pv); assert.deepEqual(r.resume.blessures, []);
});

test('les conditions d’Embuscade distinguent attaque normale et Attaque ciblée', () => {
  const d = partie(), a = poser(d, 'joueur'), c = poser(d, 'sorcier');
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, c.id).ok);
  assert.equal(rpgConditionEmbuscadeRemplie(d, 'sorcier', cardById('gardienne-du-croissant')), false);
  assert.equal(rpgConditionEmbuscadeRemplie(d, 'sorcier', cardById('sentinelle-des-sables')), true);
  const d2 = partie(), tireur = poser(d2, 'joueur'), cible = poser(d2, 'sorcier');
  tireur.coupRapide = true;
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d2, 'joueur', tireur.id, cible.id).ok);
  assert.equal(rpgConditionEmbuscadeRemplie(d2, 'sorcier', cardById('gardienne-du-croissant')), true);
});

test('Provocation donne son bonus temporaire et bloque l’attaque directe', () => {
  const d = partie(), a = poser(d, 'joueur'), c = poser(d, 'sorcier');
  c.provocation = true; const def = c.def;
  assert.equal(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id).raison, 'cible');
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, c.id).ok);
  assert.equal(c.def, def + 1);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(d, 'joueur').ok);
  if (d.sorcier.creatures.some(e => e.id === c.id)) {
    rpgFinDeTour(d); assert.equal(c.def, def);
  }
});

test('Embuscade en réponse à l’attaque : son arrivée peut éliminer l’attaquant', () => {
  const d = partie(), a = poser(d, 'joueur'), c = poser(d, 'sorcier');
  d.sorcier.main.push('sentinelle-des-sables');
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, c.id).ok);
  const attaque = d.combatDeclare;
  const r = rpgJouerCreature(d, 'sorcier', 'sentinelle-des-sables', a.id);
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(d.joueur.creatures.some(e => e.id === a.id), false);
  assert.equal(d.combatDeclare, attaque);
  const resolution = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(resolution.ok); assert.equal(resolution.annule, true);
});

test('la frappe directe est absorbée par le bouclier du sorcier', () => {
  const d = partie(), a = poser(d, 'joueur');
  a.atk = 5; d.sorcier.bouclier = 2; const pv = d.sorcier.pv;
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id).ok);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok); assert.equal(d.sorcier.pv, pv - 3); assert.equal(d.sorcier.bouclier, 0);
  assert.equal(r.resume.frappeSorcier, 3);
});

test('la Tour des Flots renvoie son adversaire avant les blessures ordinaires', () => {
  const d = partie(), a = poser(d, 'joueur'), c = poser(d, 'sorcier', 'tour-des-flots');
  a.atk = 8; const pv = c.pv;
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, c.id).ok);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok); assert.equal(d.joueur.creatures.some(e => e.id === a.id), false);
  assert.ok(d.joueur.main.includes(a.carteId)); assert.equal(c.pv, pv);
  assert.deepEqual(r.resume.blessures, []);
});


test('une Embuscade remplissant sa condition est permise en fin de tour adverse', () => {
  const d = partie(); d.tour = 'sorcier';
  const ennemi = poser(d, 'sorcier');
  ennemi.def = ennemi.pvMax = ennemi.pv = 3;
  rpgBlesserCreature(d, 'sorcier', ennemi.id, 1);
  d.joueur.main.push('sanguinaire-des-dunes');
  assert.equal(rpgJouerCreature(d, 'joueur', 'sanguinaire-des-dunes').raison, 'timing');
  rpgOuvrirFinDeTour(d);
  assert.equal(rpgPeutRepondre(d, 'joueur'), true);
  assert.ok(rpgJouerCreature(d, 'joueur', 'sanguinaire-des-dunes').ok);
});

test('la production de mana du harnais est sans effet, même si le porteur meurt avant les blessures', () => {
  const d = partie(), a = poser(d, 'joueur'), c = poser(d, 'sorcier', 'vampire-des-braises');
  a.arme = { carteId: 'harnais-du-mehari', durabilite: 2 }; a.pv = 1;
  d.joueur.mana.sable = 0;
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, c.id).ok);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok); assert.equal(d.joueur.mana.sable, 0);
  assert.equal(d.joueur.creatures.some(e => e.id === a.id), false);
});


test('l’IA choisit et résout chaque attaque séparément avec une fenêtre de réponse', () => {
  const d = partie(); d.tour = 'sorcier';
  const a = poser(d, 'sorcier'), b = poser(d, 'sorcier');
  const pv = d.joueur.pv;
  for (const e of [a, b]) {
    const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(d);
    assert.equal(choix.attaquantId, e.id); assert.equal(choix.cibleId, null);
    assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'sorcier', choix.attaquantId, choix.cibleId).ok);
    assert.equal(d.fenetreReponse, true);
    assert.ok(rpgResoudreAttaqueIndividuelleClassique(d, 'sorcier').ok);
  }
  assert.equal(d.joueur.pv, pv - a.atk - b.atk);
  assert.equal(rpgChoisirAttaqueIndividuelleClassiqueIA(d), null);
});

test('une Embuscade du joueur peut supprimer un attaquant IA avant son échange', () => {
  const d = partie(); d.tour = 'sorcier';
  const a = poser(d, 'sorcier'); a.atk = 5; a.pv = 1;
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(d);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  d.joueur.main.push('sentinelle-des-sables');
  assert.ok(rpgJouerCreature(d, 'joueur', 'sentinelle-des-sables', a.id).ok);
  assert.equal(d.sorcier.creatures.includes(a), false);
  const pv = d.joueur.pv;
  assert.equal(rpgResoudreAttaqueIndividuelleClassique(d, 'sorcier').annule, true);
  assert.equal(d.joueur.pv, pv);
});

test('l’IA utilise une Embuscade légale pendant la réponse à une attaque', () => {
  const d = partie(), a = poser(d, 'joueur'); a.pv = 1;
  d.sorcier.main.push('sentinelle-des-sables');
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id).ok);
  assert.equal(rpgPeutRepondre(d, 'sorcier'), true);
  const reponse = rpgSorcierMagieRapide(d, () => .5);
  assert.equal(reponse?.carteId, 'sentinelle-des-sables');
  assert.equal(d.joueur.creatures.includes(a), false);
  assert.equal(rpgResoudreAttaqueIndividuelleClassique(d, 'joueur').annule, true);
});

test('l’IA peut aussi utiliser une Embuscade légale en fin de tour', () => {
  const d = partie(), a = poser(d, 'joueur'); a.def = a.pvMax = a.pv = 3;
  rpgBlesserCreature(d, 'joueur', a.id, 1);
  d.sorcier.main.push('sanguinaire-des-dunes'); rpgOuvrirFinDeTour(d);
  assert.equal(rpgPeutRepondre(d, 'sorcier'), true);
  assert.equal(rpgSorcierMagieRapide(d, () => .5)?.carteId, 'sanguinaire-des-dunes');
  assert.ok(d.finDeTour); assert.equal(d.fenetreReponse, true);
});

test('Embuscade reste jouable dans les fenêtres de sort et d’effet de créature', () => {
  for (const fenetre of ['annonce', 'effetCreatureEnAttente']) {
    const d = partie(); d.tour = 'sorcier';
    const ennemi = poser(d, 'sorcier'); ennemi.def = ennemi.pvMax = ennemi.pv = 4;
    rpgBlesserCreature(d, 'sorcier', ennemi.id, 1);
    d.joueur.main.push('sanguinaire-des-dunes');
    d.fenetreReponse = true;
    d[fenetre] = { cote: 'sorcier', carteId: 'ashigaru-des-braises', cibleId: null };
    assert.equal(rpgPeutRepondre(d, 'joueur'), true, fenetre);
    assert.ok(rpgJouerCreature(d, 'joueur', 'sanguinaire-des-dunes').ok, fenetre);
  }
});
