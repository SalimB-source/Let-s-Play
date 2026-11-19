/**
 * **Deux Attaques ciblées se répondent.**
 *
 * Une Attaque ciblée n'a pas de contact : la cible ne riposte pas, c'est le
 * prix du tir. Sauf quand la cible porte **elle aussi** l'Attaque ciblée : elle
 * rend alors son coup du même geste, comme deux créatures « À distance » qui
 * s'échangent leurs volées. Une Contre-attaque, elle, a déjà sa riposte — elle
 * ne frappe pas deux fois pour le même coup.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature } from '../src/games/rpgDuel.js';
import {
  rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique,
} from '../src/games/rpgCombatIndividuelClassique.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';

// 2/5, Attaque ciblée : le tir de référence.
const TIREUR = 'archere-viking-du-givre';
// 2/1, mêlée nue : la cible qui ne riposte pas.
const MELEE = 'viking-des-neiges';

function table() {
  const d = rpgNouveauDuel({
    joueurDeck: [], sorcierDeck: [], modeMana: RPG_MODE_MANA_ESSAI,
    joueurCouleurs: ['braise'], sorcierCouleurs: ['neige'], rng: () => 0.9,
  });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  d.pvp = true;
  d.tour = 'joueur';
  d.phase = 'principale';
  const poser = (camp, id) => {
    d[camp].invocationNormaleJouee = false;
    d[camp].main.push(id);
    const avant = d.tour;
    d.tour = camp;
    const resultat = rpgJouerCreature(d, camp, id);
    d.tour = avant;
    assert.ok(resultat.ok, `${id} doit entrer en jeu : ${resultat.raison}`);
    resultat.entite.ready = true;
    resultat.entite.malInvocation = false;
    return resultat.entite;
  };
  const attaquer = (attaquant, cible) => {
    d.tour = 'joueur';
    d.phase = 'principale';
    d.combatDeclare = null;
    d.fenetreReponse = false;
    const declaration = rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', attaquant.id, cible.id);
    assert.ok(declaration.ok, `attaque refusée : ${declaration.raison}`);
    const resolution = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
    assert.ok(resolution.ok, `résolution refusée : ${resolution.raison}`);
    return resolution;
  };
  return { d, poser, attaquer };
}

test('une Attaque ciblée contre une autre Attaque ciblée : la cible rend son coup', () => {
  const { poser, attaquer } = table();
  const attaquant = poser('joueur', TIREUR);
  const cible = poser('sorcier', TIREUR);
  assert.equal(attaquant.coupRapide, true);
  assert.equal(cible.coupRapide, true);
  const avant = { attaquant: attaquant.pv, cible: cible.pv };

  const res = attaquer(attaquant, cible);

  assert.ok(cible.pv < avant.cible, 'la cible encaisse le tir');
  assert.ok(attaquant.pv < avant.attaquant, 'et elle répond : l’attaquant encaisse aussi');
  assert.equal(avant.cible - cible.pv, 2);
  assert.equal(avant.attaquant - attaquant.pv, 2);
  const blessures = res.resume.blessures;
  assert.ok(blessures.some((b) => b.entiteId === cible.id), 'le tir a porté');
  assert.ok(blessures.some((b) => b.entiteId === attaquant.id && b.sourceId === cible.id),
    'la riposte vient bien de la créature agressée');
});

test('une Attaque ciblée contre une mêlée reste sans réponse', () => {
  const { d, poser, attaquer } = table();
  const attaquant = poser('joueur', TIREUR);
  const cible = poser('sorcier', MELEE);
  const avant = attaquant.pv;
  const pvCible = cible.pv;

  const res = attaquer(attaquant, cible);

  const survivante = d.sorcier.creatures.find((e) => e.id === cible.id);
  assert.ok(!survivante || survivante.pv < pvCible, 'la mêlée encaisse le tir');
  assert.equal(attaquant.pv, avant, 'la mêlée n’a pas de tir pour répondre');
  assert.ok(!res.resume.blessures.some((b) => b.entiteId === attaquant.id));
});

test('une Contre-attaque ne frappe pas deux fois pour le même coup', () => {
  const { d, poser, attaquer } = table();
  const attaquant = poser('joueur', TIREUR);
  const cible = poser('sorcier', TIREUR);
  cible.contreAttaque = true; // Attaque ciblée ET Contre-attaque
  const avant = attaquant.pv;

  attaquer(attaquant, cible);

  assert.equal(avant - attaquant.pv, 2, 'une seule riposte, pas deux');
  assert.ok(d.log.some((ligne) => /Contre-attaque/.test(ligne)), 'c’est la Contre-attaque qui a répondu');
});
