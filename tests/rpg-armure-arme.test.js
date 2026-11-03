import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgNouveauDuel, rpgJouerCreature, rpgJouerArme, rpgBlesserCreature, rpgConsommerSoins, rpgLancerAttaque } from '../src/games/rpgDuel.js';
import { armureArme, defenseSansArmure, plafondSoinCreature } from '../src/games/rpgArmure.js';
import { furieGagnee } from '../src/games/rpgAI.js';
import { rpgPvpVue } from '../src/games/rpgPvp.js';
const duelVide = () => rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.9 });
const mana = (duel, cote) => { duel[cote].mana = { sable: 20, eau: 20, neige: 20, braise: 20, tenebres: 20 }; };
const poser = (duel, cote, id) => { duel[cote].main.push(id); mana(duel, cote); const r = rpgJouerCreature(duel, cote, id); assert.equal(r.ok, true); return r.entite; };
const equiper = (duel, cote, id, cible) => { duel[cote].main.push(id); mana(duel, cote); const r = rpgJouerArme(duel, cote, id, cible.id); assert.equal(r.ok, true); };

test('une arme ajoute une réserve distincte sans soigner, les dégâts la touchent en premier et les soins ne la réparent pas', () => {
  for (const cote of ['joueur', 'sorcier']) {
    const duel = duelVide(); duel.tour = cote;
    const chien = poser(duel, cote, 'chien-du-guet');
    rpgBlesserCreature(duel, cote, chien.id, 1);
    rpgConsommerSoins(duel);
    equiper(duel, cote, 'armure-de-cendres', chien);
    assert.equal(defenseSansArmure(chien), 1);
    assert.deepEqual(armureArme(chien), { max: 4, restant: 4 });
    assert.deepEqual(rpgConsommerSoins(duel), [], 'équiper ne soigne pas');
    rpgBlesserCreature(duel, cote, chien.id, 3);
    assert.equal(defenseSansArmure(chien), 1);
    assert.deepEqual(armureArme(chien), { max: 4, restant: 1 });
    assert.equal(plafondSoinCreature(chien), 3);
    poser(duel, cote, 'yamina');
    assert.equal(defenseSansArmure(chien), 2);
    assert.equal(chien.pv, 3);
    assert.deepEqual(armureArme(chien), { max: 4, restant: 1 }, 'le soin ne répare pas l’armure');
    assert.deepEqual(rpgConsommerSoins(duel).filter(x => x.entityId === chien.id).map(x => x.montant), [1]);
    equiper(duel, cote, 'takouba-des-pistes', chien);
    assert.equal(chien.pv, 2);
    assert.equal(chien.pvMax, 2);
    assert.equal(armureArme(chien), null);
  }
});

test('les dégâts simultanés frappent l’armure avant la créature et le bris ne soigne pas', () => {
  const duel = duelVide();
  const attaquant = poser(duel, 'joueur', 'chien-du-guet');
  const bloqueur = poser(duel, 'sorcier', 'chien-du-guet');
  equiper(duel, 'sorcier', 'armure-de-cendres', bloqueur);
  bloqueur.arme.durabilite = 1;
  attaquant.ready = true;
  const res = rpgLancerAttaque(duel, 'joueur', [attaquant.id], { [attaquant.id]: [bloqueur.id] });
  assert.equal(res.ok, true);
  assert.equal(bloqueur.arme, null);
  assert.equal(bloqueur.pv, 2, 'l’armure absorbe les deux blessures avant de se briser');
});

test('les points d’armure survivent à la sérialisation et sont visibles dans la vue PvP', () => {
  const duel = duelVide(); const chien = poser(duel, 'joueur', 'chien-du-guet');
  equiper(duel, 'joueur', 'armure-de-cendres', chien);
  rpgBlesserCreature(duel, 'joueur', chien.id, 2);
  const vue = rpgPvpVue(duel, 'joueur');
  const copie = JSON.parse(JSON.stringify(vue.joueur.creatures.find(e => e.id === chien.id)));
  assert.deepEqual(armureArme(copie), { max: 4, restant: 2 });
  assert.equal(defenseSansArmure(copie), 2);
});

test('la Furie ne s’éteint pas quand une créature blessée reçoit de l’armure', () => {
  const duel = duelVide();
  const loup = poser(duel, 'joueur', 'loup-des-neiges');
  rpgBlesserCreature(duel, 'joueur', loup.id, 1);
  assert.equal(loup.furieDeclenchee, true);
  equiper(duel, 'joueur', 'armure-de-cendres', loup);
  assert.equal(loup.furieDeclenchee, true);
  rpgBlesserCreature(duel, 'joueur', loup.id, 2);
  assert.equal(loup.furieDeclenchee, true);
});

test('sans blessure propre, un soin ne restaure pas les points d’armure perdus', () => {
  const duel = duelVide(); const chien = poser(duel, 'joueur', 'chien-du-guet');
  equiper(duel, 'joueur', 'armure-de-cendres', chien);
  rpgBlesserCreature(duel, 'joueur', chien.id, 2);
  rpgConsommerSoins(duel);
  poser(duel, 'joueur', 'yamina');
  assert.equal(chien.pv, 4);
  assert.equal(armureArme(chien).restant, 2);
  assert.deepEqual(rpgConsommerSoins(duel).filter(x => x.entityId === chien.id), []);
});

test('un excédent de dégâts passe de l’armure à la défense propre', () => {
  const duel = duelVide(); const chien = poser(duel, 'joueur', 'chien-du-guet');
  equiper(duel, 'joueur', 'armure-de-cendres', chien);
  rpgBlesserCreature(duel, 'joueur', chien.id, 5);
  assert.deepEqual(armureArme(chien), { max: 4, restant: 0 });
  assert.equal(defenseSansArmure(chien), 1);
  equiper(duel, 'joueur', 'takouba-des-pistes', chien);
  assert.equal(chien.pv, 1, 'retirer une armure épuisée ne rend pas les blessures');
});

test('la perte du Lien ne retire pas deux fois une armure déjà consommée', () => {
  const duel = duelVide(); const porteur = poser(duel, 'joueur', 'momie-de-lin');
  const bouchra = poser(duel, 'joueur', 'bouchra-guerriere-des-cretes');
  equiper(duel, 'joueur', 'cuirasse-de-sel', porteur);
  assert.deepEqual(armureArme(porteur), { max: 4, restant: 4 });
  rpgBlesserCreature(duel, 'joueur', porteur.id, 4);
  assert.deepEqual(armureArme(porteur), { max: 4, restant: 0 });
  const pv = porteur.pv;
  rpgBlesserCreature(duel, 'joueur', bouchra.id, 99);
  assert.deepEqual(armureArme(porteur), { max: 3, restant: 0 });
  assert.equal(porteur.pv, pv);
  assert.equal(porteur.def, pv);
});


test('la prévision de Furie de l’IA tient compte de l’armure', () => {
  const duel = duelVide(); const loup = poser(duel, 'joueur', 'loup-des-neiges');
  equiper(duel, 'joueur', 'armure-de-cendres', loup);
  assert.equal(furieGagnee(loup, 3), 0);
  assert.equal(furieGagnee(loup, 5), 1);
});

test('remplacer immédiatement l’armure conserve une blessure antérieure', () => {
  const duel = duelVide(); const chien = poser(duel, 'joueur', 'chien-du-guet');
  rpgBlesserCreature(duel, 'joueur', chien.id, 1);
  equiper(duel, 'joueur', 'armure-de-cendres', chien);
  equiper(duel, 'joueur', 'takouba-des-pistes', chien);
  assert.equal(chien.pv, 1);
  assert.equal(chien.pvMax, 2);
});

test('le Licou à défense négative reste un malus et non une armure', () => {
  const duel = duelVide(); const chien = poser(duel, 'joueur', 'chien-du-guet');
  equiper(duel, 'joueur', 'licou-du-chien-de-sable', chien);
  assert.equal(chien.pv, 1);
  assert.equal(armureArme(chien), null);
  equiper(duel, 'joueur', 'takouba-des-pistes', chien);
  assert.equal(chien.pv, 2, 'le retrait du malus rend la défense correspondante');
});
