/** Le duel : deux tireurs se répondent.
 *
 *  Une Attaque ciblée n'a pas de contact — mais une cible qui tire elle aussi
 *  (Attaque ciblée **ou** « À distance ») ne se laisse pas viser sans rendre
 *  son coup. Sa volée part dans le même échange simultané que la frappe : elle
 *  touche même si le tir la terrasse. La Contre-attaque, elle, garde sa propre
 *  riposte (et reste un mot-clé de mêlée).
 *
 *  C'est le chemin du duel classique (`rpgLancerAttaque`) ; l'adaptateur
 *  individuel (`resoudreEchangeIndividuel`) avait déjà le sien.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgReglerHasard, rpgLancerAttaque } from '../src/games/rpgDuel.js';

const TIREUR = 'tislit-des-aures';        // Attaque ciblée sur sa face
const TIREUR_DISTANCE = 'guetteuse-des-marees'; // « À distance » seulement
const MELÉE = 'guerrier-au-bouclier-rond';

function partie() {
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.9 });
  for (const cote of ['joueur', 'sorcier']) duel[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  duel.lignes = false;
  // Aucun coup critique, aucun raté : les dégâts mesurés sont ceux de la fiche.
  rpgReglerHasard(duel, () => 0.99);
  return duel;
}

/** Pose une créature prête, sur le champ. */
function poser(duel, cote, id) {
  duel[cote].invocationNormaleJouee = false;
  duel[cote].main.push(id);
  const tourAvant = duel.tour;
  duel.tour = cote;
  const res = rpgJouerCreature(duel, cote, id);
  duel.tour = tourAvant;
  assert.ok(res.ok, `${id} entre en jeu : ${res.raison}`);
  res.entite.ready = true;
  res.entite.malInvocation = false;
  return res.entite;
}

/** Le joueur tire sur une créature adverse avec son Attaque ciblée. */
function tirer(duel, attaquantId, cibleId) {
  const r = rpgLancerAttaque(duel, 'joueur', [attaquantId], null, null, null, { [attaquantId]: cibleId });
  assert.ok(r.ok, JSON.stringify(r));
  return r;
}

const pvDe = (duel, cote, id) => duel[cote].creatures.find((e) => e.id === id)?.pv;

test('une cible avec Attaque ciblée répond à la volée de l’attaquant', () => {
  const d = partie();
  const a = poser(d, 'joueur', TIREUR);
  const c = poser(d, 'sorcier', TIREUR);
  a.atk = 3; a.pv = 6; a.pvMax = 6;
  c.atk = 2; c.pv = 6; c.pvMax = 6;
  tirer(d, a.id, c.id);
  assert.equal(pvDe(d, 'sorcier', c.id), 3, 'la cible encaisse le tir');
  assert.equal(pvDe(d, 'joueur', a.id), 4, 'l’attaquant encaisse la volée rendue');
  assert.ok(d.log.some((ligne) => /répond à la volée de/.test(ligne)), d.log.slice(-4).join(' | '));
});

test('une cible « À distance » répond aussi : deux tireurs, même sans Attaque ciblée', () => {
  const d = partie();
  const a = poser(d, 'joueur', TIREUR);
  const c = poser(d, 'sorcier', TIREUR_DISTANCE);
  assert.equal(c.coupRapide, false, 'la cible ne porte que « À distance »');
  assert.equal(c.distance, true);
  a.atk = 3; a.pv = 6; a.pvMax = 6;
  c.atk = 2; c.pv = 6; c.pvMax = 6;
  tirer(d, a.id, c.id);
  assert.equal(pvDe(d, 'sorcier', c.id), 3);
  assert.equal(pvDe(d, 'joueur', a.id), 4, 'la volée est rendue');
});

test('un corps à corps ne répond pas à un tir', () => {
  const d = partie();
  const a = poser(d, 'joueur', TIREUR);
  const c = poser(d, 'sorcier', MELÉE);
  a.atk = 3; a.pv = 6; a.pvMax = 6;
  c.atk = 4; c.pv = 6; c.pvMax = 6;
  tirer(d, a.id, c.id);
  assert.equal(pvDe(d, 'sorcier', c.id), 3, 'la cible encaisse');
  assert.equal(pvDe(d, 'joueur', a.id), 6, 'personne ne lui rend son coup à distance');
});

test('la volée rendue part en même temps : elle touche même si le tir terrasse la cible', () => {
  const d = partie();
  const a = poser(d, 'joueur', TIREUR);
  const c = poser(d, 'sorcier', TIREUR);
  a.atk = 8; a.pv = 6; a.pvMax = 6;
  c.atk = 2; c.pv = 3; c.pvMax = 3;
  tirer(d, a.id, c.id);
  assert.equal(pvDe(d, 'sorcier', c.id), undefined, 'la cible est détruite');
  assert.equal(pvDe(d, 'joueur', a.id), 4, 'sa volée est quand même partie');
});

test('un tireur gelé ne répond pas', () => {
  const d = partie();
  const a = poser(d, 'joueur', TIREUR);
  const c = poser(d, 'sorcier', TIREUR);
  a.atk = 3; a.pv = 6; a.pvMax = 6;
  c.atk = 2; c.pv = 6; c.pvMax = 6;
  c.gelToursRestants = 2;
  tirer(d, a.id, c.id);
  assert.equal(pvDe(d, 'joueur', a.id), 6, 'un tireur gelé ne rend pas son coup');
});

test('la Contre-attaque reste une affaire de mêlée : aucun tireur ne la porte', async () => {
  const { RPG_DUEL_CARDS } = await import('../src/games/rpgCards.js');
  const fautives = RPG_DUEL_CARDS
    .filter((carte) => (carte.contreAttaque || carte.donne?.contreAttaque)
      && (carte.coupRapide || carte.distance))
    .map((carte) => carte.id);
  assert.deepEqual(fautives, [],
    'le mot-clé Contre-attaque est réservé aux créatures de mêlée');
  // Et elle a toujours ses porteurs historiques, tous au contact.
  const porteurs = RPG_DUEL_CARDS.filter((carte) => carte.contreAttaque).map((carte) => carte.id);
  assert.ok(porteurs.includes('eirik-du-premier-serment'));
  assert.ok(porteurs.includes('pourfendeur-des-djinns'));
  assert.ok(!porteurs.includes('salem'), 'SALEM tire : il rend sa volée par la règle des tireurs');
});
