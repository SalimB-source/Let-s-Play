import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS, cardById } from '../src/games/rpgCards.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgJouerArme, rpgConditionEmbuscadeRemplie, rpgBlesserCreature, rpgFinDeTour, rpgOuvrirFinDeTour, rpgPeutRepondre, rpgSorcierMagieRapide, rpgLancerMagie, rpgResoudreArriveeCiblee, rpgReglerHasard, rpgRenvoisEnMain, rpgEmplacementsChamp } from '../src/games/rpgDuel.js';
import { rpgCiblesIndividuellesClassique, rpgCibleIndividuelleClassiqueEncoreLegale, rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique, rpgChoisirAttaqueIndividuelleClassiqueIA } from '../src/games/rpgCombatIndividuelClassique.js';

function partie() {
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => .9 });
  for (const cote of ['joueur', 'sorcier']) duel[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  return duel;
}
/**
 * Pose une créature prête à combattre. Ce plateau de test se bat **au contact** :
 * l'ashigaru des braises porte « À distance » sur sa face, on le ramène donc à
 * la mêlée sauf demande explicite (`{ contact: false }`), sinon les capacités
 * « au blocage » et le gel du porteur disparaîtraient des échanges que ces
 * tests mesurent. La riposte, elle, survit au tir entre deux créatures « À
 * distance » (voir `rpg-tir-riposte.test.js`).
 */
function poser(duel, cote, id = 'ashigaru-des-braises', { contact = true } = {}) {
  // Construction de plateau de test, indépendante du quota d'invocation.
  duel[cote].invocationNormaleJouee = false;
  duel[cote].main.push(id);
  const tourAvant = duel.tour;
  duel.tour = cote;
  const res = rpgJouerCreature(duel, cote, id);
  duel.tour = tourAvant;
  assert.ok(res.ok, res.raison);
  // Plateau préexistant : ces tests portent sur les échanges, pas la pose.
  res.entite.ready = true;
  res.entite.malInvocation = false;
  if (contact) res.entite.distance = false;
  return res.entite;
}

test('les cibles sont celles du MOBA sans les voies : Envol, Infiltration et priorités', () => {
  const d = partie(), a = poser(d, 'joueur'), sol = poser(d, 'sorcier'), vol = poser(d, 'sorcier'), cache = poser(d, 'sorcier');
  vol.envol = true; cache.infiltration = true;
  assert.deepEqual(rpgCiblesIndividuellesClassique(d, 'joueur', a.id), { cibles: [sol.id], directe: false });
  a.envol = true;
  assert.deepEqual(rpgCiblesIndividuellesClassique(d, 'joueur', a.id), { cibles: [sol.id, vol.id], directe: false });
  vol.provocation = true; sol.defenseur = true;
  assert.deepEqual(rpgCiblesIndividuellesClassique(d, 'joueur', a.id), { cibles: [sol.id, vol.id], directe: false });
  vol.provocation = false;
  assert.deepEqual(rpgCiblesIndividuellesClassique(d, 'joueur', a.id), { cibles: [sol.id], directe: false });
  sol.defenseur = false; a.coupRapide = true;
  assert.deepEqual(rpgCiblesIndividuellesClassique(d, 'joueur', a.id), { cibles: [sol.id, vol.id, cache.id], directe: false });
});

test('déclaration puis échange simultané, sans blocage ni phase d’attaque globale', () => {
  const d = partie(), a = poser(d, 'joueur'), c = poser(d, 'sorcier');
  a.atk = 5; c.atk = 5;
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, c.id).ok);
  assert.equal(d.fenetreReponse, true);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(r.resume.blessures.length, 2);
  assert.equal(d.combatAnimations.filter((e) => e.type === 'choc-creatures').length, 1);
  assert.ok(JSON.parse(JSON.stringify(d)).combatAnimations.some((e) => e.type === 'choc-creatures'), 'le signal traverse le PvP');
  assert.equal(d.joueur.creatures.length, 0); assert.equal(d.sorcier.creatures.length, 0);
  assert.equal(d.phase, 'principale'); assert.equal(d.attaqueJouee, null);
  assert.equal(d.combatDeclare, null); assert.equal(d.fenetreReponse, false);
});

test('le signal de secousse exclut les attaques directes, ratées ou sans dégâts', () => {
  const signal = (d) => (d.combatAnimations ?? []).filter((e) => e.type === 'choc-creatures');
  const direct = partie(), seul = poser(direct, 'joueur');
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(direct, 'joueur', seul.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(direct, 'joueur').ok);
  assert.equal(signal(direct).length, 0);

  const rate = partie(), archer = poser(rate, 'joueur'), cible = poser(rate, 'sorcier');
  archer.coupRapide = true;
  rpgReglerHasard(rate, () => 0.01);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(rate, 'joueur', archer.id, cible.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(rate, 'joueur').ok);
  assert.equal(signal(rate).length, 0);

  const nul = partie(), a = poser(nul, 'joueur'), c = poser(nul, 'sorcier');
  a.atk = 0; c.atk = 0;
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(nul, 'joueur', a.id, c.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(nul, 'joueur').ok);
  assert.equal(signal(nul).length, 0);
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

test('un refus ne consomme rien et le PvP utilise le même ciblage', () => {
  const d = partie(), a = poser(d, 'joueur'); poser(d, 'sorcier');
  const avant = JSON.stringify(d);
  assert.equal(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, 'inconnue').raison, 'cible');
  assert.equal(JSON.stringify(d), avant);
  d.pvp = true;
  assert.equal(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id).raison, 'cible');
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, d.sorcier.creatures[0].id).ok);
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

test('les conditions d’Embuscade dépendent du plateau, pas du type d’attaque', () => {
  const d = partie(), a = poser(d, 'joueur'), c = poser(d, 'sorcier');
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, c.id).ok);
  assert.equal(rpgConditionEmbuscadeRemplie(d, 'sorcier', cardById('gardienne-du-croissant')), false);
  // La Sentinelle des sables ne se déclenche plus sur une simple attaque : il
  // faut un sorcier sans défenseur frappé directement.
  assert.equal(rpgConditionEmbuscadeRemplie(d, 'sorcier', cardById('sentinelle-des-sables')), false);
  assert.equal(rpgConditionEmbuscadeRemplie(d, 'sorcier', cardById('chacal-du-seuil')), true);
  const d2 = partie(), tireur = poser(d2, 'joueur'), cible = poser(d2, 'sorcier');
  tireur.coupRapide = true;
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d2, 'joueur', tireur.id, cible.id).ok);
  assert.equal(rpgConditionEmbuscadeRemplie(d2, 'sorcier', cardById('gardienne-du-croissant')), false);
  cible.pv--;
  assert.equal(rpgConditionEmbuscadeRemplie(d2, 'sorcier', cardById('gardienne-du-croissant')), true);
});

test('une ancienne Provocation fonctionne comme Défenseur, sans bonus', () => {
  const d = partie(), a = poser(d, 'joueur'), c = poser(d, 'sorcier');
  c.provocation = true; const def = c.def;
  assert.equal(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id).raison, 'cible');
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, c.id).ok);
  assert.equal(c.def, def);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(d, 'joueur').ok);
  if (d.sorcier.creatures.some(e => e.id === c.id)) {
    rpgFinDeTour(d); assert.equal(c.def, def);
  }
});

test('une Magie Rapide en réponse peut éliminer l’attaquant', () => {
  const d = partie(), a = poser(d, 'joueur'), c = poser(d, 'sorcier');
  d.sorcier.main.push('trait-de-braise');
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, c.id).ok);
  const attaque = d.combatDeclare;
  assert.ok(rpgLancerMagie(d, 'sorcier', 'trait-de-braise', a.id).ok);
  assert.equal(d.joueur.creatures.includes(a), false);
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

test('la Tour des Flots subit les blessures avant de renvoyer l’attaquant, des deux côtés et en PvP', () => {
  for (const pvp of [false, true]) for (const cote of ['joueur', 'sorcier']) {
    const d = partie(); d.pvp = pvp; d.tour = cote;
    const adv = cote === 'joueur' ? 'sorcier' : 'joueur';
    const a = poser(d, cote), c = poser(d, adv, 'tour-des-flots');
    a.atk = 2; const pv = c.pv;
    assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, cote, a.id, c.id).ok);
    const r = rpgResoudreAttaqueIndividuelleClassique(d, cote);
    assert.ok(r.ok); assert.equal(c.pv, pv - 2);
    assert.deepEqual(r.resume.blessures, [{ entiteId: c.id, sourceId: a.id, montant: 2 }]);
    assert.ok(d.combatFeed.some(e => e.type === 'hit' && e.victim.id === c.id && e.amount === 2));
    assert.ok(!d[cote].creatures.some(e => e.id === a.id));
    assert.ok(d[cote].main.includes(a.carteId));
    assert.ok(rpgRenvoisEnMain(d).some(e => e.entityId === a.id));
    assert.ok(!rpgEmplacementsChamp(d[cote]).some(e => e?.id === a.id));
    assert.ok(d.log.some(l => l.includes('renvoie') && l.includes('après les blessures')));
  }
});

test('le renvoi libère sa case sans déplacer les autres créatures du plateau', () => {
  const d = partie(); d.modeMana = RPG_MODE_MANA_ESSAI;
  const a = poser(d, 'joueur'), voisine = poser(d, 'joueur'), tour = poser(d, 'sorcier', 'tour-des-flots');
  a.atk = 2; const caseAttaquant = a.emplacement, caseVoisine = voisine.emplacement;
  assert.notEqual(caseAttaquant, caseVoisine);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, tour.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(d, 'joueur').ok);
  const cases = rpgEmplacementsChamp(d.joueur);
  assert.equal(cases[caseAttaquant], null); assert.equal(cases[caseVoisine], voisine);
  assert.equal(voisine.emplacement, caseVoisine); assert.equal(tour.pv, 2);
});

test('la Tour des Flots détruite renvoie quand même l’attaquant après le coup létal', () => {
  const d = partie(), a = poser(d, 'joueur'), c = poser(d, 'sorcier', 'tour-des-flots');
  a.atk = 8;
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, c.id).ok);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok); assert.equal(r.resume.blessures[0].montant, 8);
  assert.ok(d.sorcier.cimetiere.includes('tour-des-flots'));
  assert.ok(d.joueur.main.includes(a.carteId));
  const destruction = d.log.findIndex(l => l.includes('Tour des Flots est détruite'));
  const renvoi = d.log.findIndex(l => l.includes('Tour des Flots renvoie'));
  assert.ok(destruction >= 0 && renvoi > destruction);
});

test('la Tour des Flots ne renvoie pas un attaquant tué par les blessures de combat', () => {
  const d = partie(), a = poser(d, 'joueur'), c = poser(d, 'sorcier', 'tour-des-flots');
  a.atk = 2; a.pv = 1; c.atk = 2;
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, c.id).ok);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok); assert.equal(c.pv, 2); assert.equal(r.resume.blessures.length, 2);
  assert.ok(d.joueur.cimetiere.includes(a.carteId));
  assert.ok(!d.joueur.main.includes(a.carteId));
  assert.ok(!d.log.some(l => l.includes('Tour des Flots renvoie')));
});

test('une Tour et un attaquant détruits ensemble vont au cimetière, sans renvoi', () => {
  const d = partie(), a = poser(d, 'joueur'), c = poser(d, 'sorcier', 'tour-des-flots');
  a.atk = 8; a.pv = 1; c.atk = 2;
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, c.id).ok);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok); assert.equal(r.resume.blessures.length, 2);
  assert.ok(d.joueur.cimetiere.includes(a.carteId)); assert.ok(d.sorcier.cimetiere.includes(c.carteId));
  assert.ok(!d.joueur.main.includes(a.carteId)); assert.deepEqual(rpgRenvoisEnMain(d), []);
});

test('le bouclier général conserve son comportement classique face au renvoi de la Tour', () => {
  const d = partie(), a = poser(d, 'joueur'), c = poser(d, 'sorcier', 'tour-des-flots');
  a.atk = 2; a.bouclier = 1;
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, c.id).ok);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok); assert.equal(c.pv, 2); assert.equal(r.resume.blessures[0].montant, 2);
  assert.ok(!d.joueur.creatures.includes(a)); assert.equal(a.bouclier, 1);
  assert.ok(d.joueur.main.includes(a.carteId)); assert.ok(rpgRenvoisEnMain(d).some(e => e.entityId === a.id));
});

test('une Tour détruite par une capacité avant combat ne renvoie pas l’attaquant', () => {
  const d = partie(), a = poser(d, 'joueur', 'vampire-des-braises'), c = poser(d, 'sorcier', 'tour-des-flots');
  c.pv = 1;
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, c.id).ok);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok); assert.equal(r.resume.effetsAvantCombat[0].entiteId, c.id);
  assert.deepEqual(r.resume.blessures, []); assert.ok(d.joueur.creatures.includes(a));
  assert.ok(d.sorcier.cimetiere.includes(c.carteId)); assert.deepEqual(rpgRenvoisEnMain(d), []);
});

test('le bouclier coloré anti-Eau ne bloque pas la capacité de la Tour des Flots', () => {
  const d = partie(), a = poser(d, 'joueur'), c = poser(d, 'sorcier', 'tour-des-flots');
  a.atk = 2; a.protection = { contre: 'eau', toursRestants: 2 };
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, c.id).ok);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok); assert.equal(c.pv, 2); assert.equal(r.resume.blessures[0].montant, 2);
  assert.ok(!d.joueur.creatures.includes(a)); assert.ok(d.joueur.main.includes(a.carteId));
  assert.ok(a.protection, 'le bouclier coloré ne bloque que les sorts');
});

test('une Attaque ciblée ne déclenche pas le renvoi au blocage de la Tour des Flots', () => {
  const d = partie(), a = poser(d, 'joueur'), c = poser(d, 'sorcier', 'tour-des-flots');
  a.atk = 2; a.coupRapide = true; rpgReglerHasard(d, () => .99);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, c.id).ok);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok); assert.equal(c.pv, 2); assert.ok(d.joueur.creatures.includes(a));
  assert.ok(!d.joueur.main.includes(a.carteId));
});

test('la Sphère de rotation conserve son renvoi avant les blessures face à la Tour des Flots', () => {
  const d = partie(), a = poser(d, 'joueur'), c = poser(d, 'sorcier', 'tour-des-flots');
  a.atk = 2; a.arme = { carteId: 'sphere-de-rotation', durabilite: 2 }; rpgReglerHasard(d, () => 0);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, c.id).ok);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok); assert.equal(c.pv, 4); assert.deepEqual(r.resume.blessures, []);
  assert.ok(d.sorcier.main.includes('tour-des-flots')); assert.ok(d.joueur.creatures.includes(a));
});

test('le Cavalier de vapeur respecte aussi son renvoi après les blessures en duel individuel', () => {
  const d = partie(), a = poser(d, 'joueur');
  a.atk = 1; a.pv = 20; d.tour = 'sorcier'; d.sorcier.main.push('le-cavalier-de-vapeur');
  const pose = rpgJouerCreature(d, 'sorcier', 'le-cavalier-de-vapeur', a.id);
  assert.ok(pose.ok); const c = pose.entite; d.tour = 'joueur';
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, c.id).ok);
  const pv = c.pv;
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok); assert.equal(c.pv, pv - 1); assert.equal(r.resume.blessures[0].montant, 1);
  assert.ok(d.joueur.main.includes(a.carteId));
});

test('une Invocation spéciale est interdite en fin de tour adverse même si sa condition est remplie', () => {
  const d = partie(); d.tour = 'sorcier';
  const ennemi = poser(d, 'sorcier'); ennemi.pv--;
  const autre = poser(d, 'sorcier'); autre.pv--;
  d.joueur.main = ['sanguinaire-des-dunes'];
  assert.equal(rpgJouerCreature(d, 'joueur', 'sanguinaire-des-dunes').raison, 'pas-votre-tour');
  rpgOuvrirFinDeTour(d);
  assert.equal(rpgPeutRepondre(d, 'joueur'), false);
  const avant = JSON.stringify(d);
  assert.equal(rpgJouerCreature(d, 'joueur', 'sanguinaire-des-dunes').raison, 'pas-votre-tour');
  assert.equal(JSON.stringify(d), avant);
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

test('une Magie Rapide du joueur peut supprimer un attaquant IA avant son échange', () => {
  const d = partie(); d.tour = 'sorcier';
  const a = poser(d, 'sorcier'); a.atk = 5; a.pv = 1;
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(d);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  d.joueur.main = ['trait-de-braise'];
  assert.ok(rpgLancerMagie(d, 'joueur', 'trait-de-braise', a.id).ok);
  assert.equal(d.sorcier.creatures.includes(a), false);
  const pv = d.joueur.pv;
  assert.equal(rpgResoudreAttaqueIndividuelleClassique(d, 'sorcier').annule, true);
  assert.equal(d.joueur.pv, pv);
});

test('l’IA ne joue pas d’Invocation spéciale pendant la réponse à une attaque', () => {
  const d = partie(), a = poser(d, 'joueur'); a.pv = 1;
  d.sorcier.main = ['sentinelle-des-sables'];
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id).ok);
  assert.equal(rpgPeutRepondre(d, 'sorcier'), false);
  assert.equal(rpgSorcierMagieRapide(d, () => .5), null);
  assert.ok(d.joueur.creatures.includes(a));
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(d, 'joueur').ok);
});

test('l’IA ne joue pas d’Invocation spéciale en fin de tour adverse', () => {
  const d = partie(), a = poser(d, 'joueur'); a.pv--;
  const autre = poser(d, 'joueur'); autre.pv--;
  d.sorcier.main = ['sanguinaire-des-dunes']; rpgOuvrirFinDeTour(d);
  assert.equal(rpgPeutRepondre(d, 'sorcier'), false);
  assert.equal(rpgSorcierMagieRapide(d, () => .5), null);
  assert.ok(d.finDeTour); assert.equal(d.fenetreReponse, true);
});

test('Invocation spéciale reste interdite dans les fenêtres de sort et d’effet de créature', () => {
  for (const fenetre of ['annonce', 'effetCreatureEnAttente']) {
    const d = partie(); d.tour = 'sorcier';
    const ennemi = poser(d, 'sorcier'); ennemi.pv--;
    const autre = poser(d, 'sorcier'); autre.pv--;
    d.joueur.main = ['sanguinaire-des-dunes']; d.fenetreReponse = true;
    d[fenetre] = { cote: 'sorcier', carteId: 'ashigaru-des-braises', cibleId: null };
    assert.equal(rpgPeutRepondre(d, 'joueur'), false, fenetre);
    const avant = JSON.stringify(d);
    assert.equal(rpgJouerCreature(d, 'joueur', 'sanguinaire-des-dunes').raison, 'pas-votre-tour');
    assert.equal(JSON.stringify(d), avant);
  }
});

for (const attaquantCote of ['joueur', 'sorcier']) {
  test(`Une Invocation spéciale refusée ne perturbe pas l’attaque directe (${attaquantCote})`, () => {
    const d = partie(); d.tour = attaquantCote;
    const defenseur = attaquantCote === 'joueur' ? 'sorcier' : 'joueur';
    const a = poser(d, attaquantCote); a.def = a.pvMax = 5; a.pv = 4;
    d[defenseur].main = ['fennec-des-decombres'];
    const pv = d[defenseur].pv;
    assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, attaquantCote, a.id).ok);
    const avant = JSON.stringify(d);
    assert.equal(rpgJouerCreature(d, defenseur, 'fennec-des-decombres').raison, 'pas-votre-tour');
    assert.equal(JSON.stringify(d), avant);
    const resultat = rpgResoudreAttaqueIndividuelleClassique(d, attaquantCote);
    assert.ok(resultat.ok && !resultat.annule);
    assert.equal(d[defenseur].pv, pv - a.atk);
    assert.equal(a.attaquee, true);
  });
}

test('une Invocation spéciale refusée ne redirige pas une attaque ciblée', () => {
  const d = partie(), a = poser(d, 'joueur'), c = poser(d, 'sorcier');
  a.def = a.pvMax = 5; a.pv = 4; d.sorcier.main = ['fennec-des-decombres'];
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, c.id).ok);
  assert.equal(rpgJouerCreature(d, 'sorcier', 'fennec-des-decombres').raison, 'pas-votre-tour');
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok && !r.annule); assert.equal(a.attaquee, true);
});

test('Une Embuscade refusée ne perturbe pas l’attaque directe', () => {
  const d = partie(), a = poser(d, 'joueur');
  d.sorcier.main.push('fennec-des-decombres'); // attaquant indemne : condition fausse
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id).ok);
  assert.equal(rpgJouerCreature(d, 'sorcier', 'fennec-des-decombres').ok, false);
  assert.equal(d.combatDeclare.cibleIndividuelle.interrompueParEmbuscade, undefined);
  const pv = d.sorcier.pv;
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(d, 'joueur').ok);
  assert.equal(d.sorcier.pv, pv - a.atk);
});

test('la Bannière se déclenche une seule fois si l’invocation adverse est refusée', () => {
  const d = partie(), a = poser(d, 'joueur');
  a.carteId = 'daimyo-du-soleil-rouge'; a.def = a.pvMax = 6; a.pv = 4;
  d.sorcier.main = ['fennec-des-decombres']; const avant = a.atk;
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id).ok);
  assert.equal(a.atk, avant + 1);
  assert.equal(rpgJouerCreature(d, 'sorcier', 'fennec-des-decombres').raison, 'pas-votre-tour');
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(d, 'joueur').ok);
  assert.equal(a.atk, avant + 1);
});

test('une Invocation spéciale refusée ne bloque pas la Bannière au prochain tour', () => {
  const d = partie(), a = poser(d, 'joueur');
  a.carteId = 'daimyo-du-soleil-rouge'; a.def = a.pvMax = 6; a.pv = 4;
  d.sorcier.main = ['fennec-des-decombres'];
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id).ok);
  assert.equal(rpgJouerCreature(d, 'sorcier', 'fennec-des-decombres').raison, 'pas-votre-tour');
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(d, 'joueur').ok);
  const apresPremiereAnnonce = a.atk;
  rpgFinDeTour(d); rpgFinDeTour(d);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id).ok);
  assert.equal(a.atk, apresPremiereAnnonce + 1);
});

test('une arrivée ciblée interdite ne suspend pas une attaque', () => {
  const d = partie(), a = poser(d, 'joueur'); a.def = a.pv = a.pvMax = 8;
  d.sorcier.main = ['sentinelle-des-sables'];
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id).ok);
  assert.equal(rpgJouerCreature(d, 'sorcier', 'sentinelle-des-sables', null, { cibleDifferee: true }).raison, 'pas-votre-tour');
  assert.ok(!d.arriveeEnAttente);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(d, 'joueur').ok);
});

test('Infiltration conserve la frappe directe après une Invocation spéciale refusée', () => {
  const d = partie(), a = poser(d, 'joueur');
  a.def = a.pvMax = 5; a.pv = 4; a.infiltration = true;
  d.sorcier.main = ['fennec-des-decombres'];
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id).ok);
  assert.equal(rpgJouerCreature(d, 'sorcier', 'fennec-des-decombres').raison, 'pas-votre-tour');
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(d, 'joueur').ok);
});

test('une créature ordinaire ne frappe pas directement si une créature adverse est présente', () => {
  const d = partie(), a = poser(d, 'joueur'), cible = poser(d, 'sorcier');
  const avant = JSON.stringify(d);
  assert.equal(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, null).raison, 'cible');
  assert.equal(JSON.stringify(d), avant);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, cible.id).ok);
});

for (const cote of ['joueur', 'sorcier']) for (const pvp of [false, true]) {
  const adv = cote === 'joueur' ? 'sorcier' : 'joueur';
  test(`${cote} ${pvp ? 'PvP' : 'duel'} : Infiltration choisit une autre créature mais ne permet pas la frappe directe`, () => {
    const d = partie(); d.pvp = pvp; d.tour = cote;
    const a = poser(d, cote, 'danseuse-des-ombres-de-dune');
    const garde = poser(d, adv, 'gardien-de-la-porte-ardente');
    const autre = poser(d, adv);
    assert.equal(a.infiltration, true);
    assert.deepEqual(rpgCiblesIndividuellesClassique(d, cote, a.id), { cibles: [garde.id, autre.id], directe: false });
    const pv = d[adv].pv;
    assert.equal(rpgDeclarerAttaqueIndividuelleClassique(d, cote, a.id, null).raison, 'cible');
    assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, cote, a.id, autre.id).ok);
    assert.ok(rpgResoudreAttaqueIndividuelleClassique(d, cote).ok);
    assert.equal(d[adv].pv, pv);
    assert.equal(d[adv].creatures.find((e) => e.id === garde.id).pv, garde.pvMax);
  });
}

test('Infiltration et Attaque ciblée contournent la priorité sans ignorer les autres restrictions', () => {
  const d = partie(), a = poser(d, 'joueur'), garde = poser(d, 'sorcier', 'gardien-de-la-porte-ardente'), cible = poser(d, 'sorcier');
  a.coupRapide = true;
  assert.deepEqual(rpgCiblesIndividuellesClassique(d, 'joueur', a.id), { cibles: [garde.id], directe: false });
  assert.equal(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, cible.id).raison, 'cible');
  a.infiltration = true;
  assert.deepEqual(rpgCiblesIndividuellesClassique(d, 'joueur', a.id), { cibles: [garde.id, cible.id], directe: false });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, cible.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(d, 'joueur').ok);
});

test('Infiltration temporaire ne contourne plus Défenseur après sa disparition', () => {
  const d = partie(), a = poser(d, 'joueur'), garde = poser(d, 'sorcier', 'gardien-de-la-porte-ardente');
  a.infiltration = true; a.infiltrationTour = true;
  assert.equal(rpgCiblesIndividuellesClassique(d, 'joueur', a.id).directe, false);
  rpgFinDeTour(d);
  assert.equal(a.infiltration, false);
  assert.deepEqual(rpgCiblesIndividuellesClassique(d, 'joueur', a.id), { cibles: [garde.id], directe: false });
});


test('une arme donnant Infiltration ouvre la route puis la priorité revient quand elle est remplacée', () => {
  const d = partie(), a = poser(d, 'joueur'), garde = poser(d, 'sorcier', 'gardien-de-la-porte-ardente');
  d.joueur.main.push('takouba-des-pistes');
  assert.ok(rpgJouerArme(d, 'joueur', 'takouba-des-pistes', a.id).ok);
  assert.equal(a.infiltration, true);
  assert.equal(rpgCiblesIndividuellesClassique(d, 'joueur', a.id).directe, false);
  d.joueur.main.push('cuirasse-de-sel');
  assert.ok(rpgJouerArme(d, 'joueur', 'cuirasse-de-sel', a.id).ok);
  assert.equal(a.infiltration, false);
  assert.deepEqual(rpgCiblesIndividuellesClassique(d, 'joueur', a.id), { cibles: [garde.id], directe: false });
});

test('l’IA classique ne choisit pas de frappe directe derrière un Défenseur', () => {
  const d = partie(), a = poser(d, 'sorcier', 'danseuse-des-ombres-de-dune');
  poser(d, 'joueur', 'gardien-de-la-porte-ardente');
  d.tour = 'sorcier'; d.joueur.pv = 1;
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(d);
  assert.ok(!choix || (choix.attaquantId === a.id && choix.cibleId !== null));
});

test('une créature « À distance » frappe sans recevoir de coup en retour', () => {
  // Le tir part de la ligne du fond : la créature visée ne la rejoint pas, donc
  // elle ne rend pas son coup. La cible encaisse, un point c'est tout.
  const d = partie(), tireur = poser(d, 'joueur', 'ashigaru-des-braises', { contact: false });
  const cible = poser(d, 'sorcier');
  assert.equal(tireur.distance, true, 'la fiche « À distance » devient un trait de la créature');
  assert.equal(tireur.coupRapide, false, 'aucune Attaque ciblée : c’est bien le trait qui fait la différence');
  assert.equal(cible.distance, false, 'une mêlée reste une mêlée');
  tireur.atk = 3; cible.atk = 9;
  const pvTireur = tireur.pv, pvCible = cible.pv;
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', tireur.id, cible.id).ok);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(r.resume.blessures.length, 1, 'une seule blessure : celle du tir');
  assert.equal(r.resume.blessures[0].entiteId, cible.id);
  assert.equal(tireur.pv, pvTireur, 'le tireur n’encaisse aucune riposte');
  assert.equal(cible.pv, pvCible - 3);
});

test('le même échange au contact rend les deux coups', () => {
  const d = partie(), attaquant = poser(d, 'joueur'), cible = poser(d, 'sorcier');
  attaquant.atk = 3; cible.atk = 9;
  const pvAttaquant = attaquant.pv;
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', attaquant.id, cible.id).ok);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(r.resume.blessures.length, 2, 'mêlée : les deux frappent ensemble');
  assert.ok(attaquant.pv < pvAttaquant, 'la riposte de la cible touche le corps à corps');
});
