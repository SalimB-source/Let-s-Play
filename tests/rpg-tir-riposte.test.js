/** L'échange de tirs.
 *
 *  Une créature « À distance » frappe de loin, sans recevoir de coup en retour
 *  d'un corps à corps qui ne l'atteint pas. Mais deux tireurs qui se visent se
 *  répondent : la cible riposte de sa propre volée, dans le même échange
 *  simultané que la mêlée — sans contact pour autant (ni capacités « au
 *  blocage », ni gel du porteur adverse).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgReglerHasard } from '../src/games/rpgDuel.js';
import {
  rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique,
} from '../src/games/rpgCombatIndividuelClassique.js';

const TIREUR = 'ashigaru-des-braises'; // porte « À distance » sur sa face

function partie() {
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => .9 });
  for (const cote of ['joueur', 'sorcier']) duel[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  // Aucun coup critique : les dégâts mesurés sont ceux de la fiche.
  rpgReglerHasard(duel, () => .99);
  return duel;
}

/** Pose une créature prête à combattre ; `distance` garde (ou non) son trait. */
function poser(duel, cote, id = TIREUR, { distance = true } = {}) {
  duel[cote].invocationNormaleJouee = false;
  duel[cote].main.push(id);
  const tourAvant = duel.tour;
  duel.tour = cote;
  const res = rpgJouerCreature(duel, cote, id);
  duel.tour = tourAvant;
  assert.ok(res.ok, res.raison);
  res.entite.ready = true;
  res.entite.malInvocation = false;
  res.entite.distance = distance;
  return res.entite;
}

function echange(d, attaquant, cible) {
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', attaquant.id, cible.id).ok);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(r.ok, JSON.stringify(r));
  return r.resume;
}

test('deux tireurs qui se visent se répondent', () => {
  const d = partie();
  const a = poser(d, 'joueur');
  const c = poser(d, 'sorcier');
  a.atk = 3; a.pv = 6;
  c.atk = 2; c.pv = 6;
  const resume = echange(d, a, c);
  assert.equal(resume.blessures.length, 2, 'chaque tireur encaisse la volée de l’autre');
  const touchee = resume.blessures.find((b) => b.entiteId === c.id);
  const rendue = resume.blessures.find((b) => b.entiteId === a.id);
  assert.equal(touchee?.montant, 3, 'l’attaquant inflige ses dégâts');
  assert.equal(rendue?.montant, 2, 'la cible riposte avec les siens');
  // Les deux volées partent ensemble : chacun encaisse, dans le même échange.
  assert.equal(d.joueur.creatures.find((e) => e.id === a.id)?.pv, 4, 'l’attaquant encaisse la riposte');
  assert.equal(d.sorcier.creatures.find((e) => e.id === c.id)?.pv, 3, 'la cible encaisse le tir');
});

test('un tireur face à un corps à corps garde son tir sans réponse', () => {
  const d = partie();
  const a = poser(d, 'joueur');
  const c = poser(d, 'sorcier', TIREUR, { distance: false });
  a.atk = 3; a.pv = 6;
  c.atk = 2; c.pv = 6;
  const resume = echange(d, a, c);
  assert.equal(resume.blessures.length, 1, 'seule la cible encaisse');
  assert.equal(resume.blessures[0].entiteId, c.id);
  assert.equal(d.joueur.creatures.find((e) => e.id === a.id)?.pv, 6, 'l’attaquant reste intact');
});

test('la mêlée reste un duel, sans changement', () => {
  const d = partie();
  const a = poser(d, 'joueur', TIREUR, { distance: false });
  const c = poser(d, 'sorcier', TIREUR, { distance: false });
  a.atk = 2; a.pv = 9; c.atk = 2; c.pv = 9;
  const resume = echange(d, a, c);
  assert.equal(resume.blessures.length, 2, 'les deux corps à corps frappent ensemble');
});

test('pas de capacité « au blocage » dans un échange de tirs', () => {
  const d = partie();
  const a = poser(d, 'joueur');
  const vampire = poser(d, 'sorcier', 'vampire-des-braises');
  vampire.distance = true; // un tireur qui garde son déclencheur de blocage
  a.atk = 1; a.pv = 10;
  vampire.atk = 1; vampire.pv = 4;
  const resume = echange(d, a, vampire);
  // Au contact, le déclencheur du vampire aurait détruit l'attaquant avant les
  // dégâts ordinaires ; à distance, il n'y a pas de contact : le tir part.
  assert.equal(resume.effetsAvantCombat, undefined, 'aucune capacité avant combat');
  assert.equal(vampire.pv, 3, 'le vampire encaisse le tir');
});

test('un tireur gelé ne riposte pas', () => {
  const d = partie();
  const a = poser(d, 'joueur');
  const c = poser(d, 'sorcier');
  a.atk = 2; a.pv = 8;
  c.atk = 5; c.pv = 8;
  c.gelToursRestants = 1;
  echange(d, a, c);
  assert.equal(d.joueur.creatures.find((e) => e.id === a.id)?.pv, 8, 'le gel éteint la volée de riposte');
});

test('le tireur adverse rend la pareille au sorcier du joueur', () => {
  const d = partie();
  const nôtre = poser(d, 'joueur');
  const sien = poser(d, 'sorcier');
  nôtre.atk = 4; nôtre.pv = 7;
  sien.atk = 3; sien.pv = 7;
  d.tour = 'sorcier';
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'sorcier', sien.id, nôtre.id).ok, 'le sorcier déclare à son tour');
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'sorcier');
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(r.resume.blessures.length, 2, 'la règle est symétrique');
  assert.equal(d.sorcier.creatures.find((e) => e.id === sien.id)?.pv, 3);
  assert.equal(d.joueur.creatures.find((e) => e.id === nôtre.id)?.pv, 4);
});
