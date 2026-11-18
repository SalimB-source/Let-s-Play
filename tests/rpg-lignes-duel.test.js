import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgEmplacementsChamp } from '../src/games/rpgDuel.js';
import { rpgCiblesIndividuellesClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { champMax, ligneDe, frontTient, RPG_LIGNE_FRONT, RPG_LIGNE_FOND } from '../src/games/rpgLignes.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import { etatInitial } from '../src/server/sablierArbitre.js';

// Deux cartes du catalogue, une par ligne : le Viking est un corps à corps,
// l'archère porte le trait « À distance » (l'ashigaru aussi, depuis qu'il tire
// à l'arquebuse — il ne peut donc pas servir de mêlée ici).
const MELEE = 'viking-des-neiges';
const DISTANCE = 'archere-viking-du-givre';

function table(lignes = true) {
  // Le mode sans terrains est celui qui tient les cases : c'est lui qui pose
  // les créatures sur le champ (`emplacement`).
  // Le drapeau passe par la **fabrique** : c'est elle que la page appelle.
  // Le forcer après coup masquerait une régression (la fabrique avalait
  // `lignes` sans le recopier, et le plateau restait à cinq cases).
  const d = rpgNouveauDuel({
    joueurDeck: [], sorcierDeck: [], modeMana: RPG_MODE_MANA_ESSAI,
    joueurCouleurs: ['braise'], sorcierCouleurs: ['neige'], rng: () => .9, lignes,
  });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  d.pvp = true;
  d.tour = 'joueur';
  const poser = (camp, id, options) => {
    d[camp].invocationNormaleJouee = false;
    d[camp].main.push(id);
    const avant = d.tour;
    d.tour = camp;
    const resultat = rpgJouerCreature(d, camp, id, null, options);
    d.tour = avant;
    if (!resultat.ok) return resultat;
    resultat.entite.ready = true;
    resultat.entite.malInvocation = false;
    return resultat;
  };
  const poserOk = (camp, id, options) => {
    const resultat = poser(camp, id, options);
    assert.ok(resultat.ok, `${id} doit entrer en jeu : ${resultat.raison}`);
    return resultat.entite;
  };
  return { d, poser, poserOk };
}

test('les deux lignes ouvrent dix cases ; la carte choisit sa ligne', () => {
  const { d, poserOk } = table();
  assert.equal(d.lignes, true, 'la fabrique garde le drapeau des lignes');
  assert.equal(champMax(d), 10);
  const melee = poserOk('joueur', MELEE);
  const archiere = poserOk('joueur', DISTANCE);
  assert.equal(ligneDe(melee), RPG_LIGNE_FRONT, 'un corps à corps tient le front');
  assert.equal(ligneDe(archiere), RPG_LIGNE_FOND, 'une créature à distance se range derrière');
  assert.ok(archiere.emplacement >= 5, `le fond commence à la sixième case (reçu ${archiere.emplacement})`);
  // Les dix cases du champ portent bien les deux créatures, chacune à sa place.
  const cases = rpgEmplacementsChamp(d.joueur, champMax(d));
  assert.equal(cases.length, 10);
  assert.equal(cases[melee.emplacement].id, melee.id);
  assert.equal(cases[archiere.emplacement].id, archiere.id);
});

test('une case du mauvais côté est ignorée, pas refusée', () => {
  const { d, poserOk } = table();
  // L'archère glissée sur la première case du front se range au fond.
  const archiere = poserOk('joueur', DISTANCE, { emplacement: 0 });
  assert.equal(ligneDe(archiere), RPG_LIGNE_FOND);
  assert.ok(archiere.emplacement >= 5);
  // Le corps à corps déposé au fond se range devant.
  const melee = poserOk('joueur', MELEE, { emplacement: 7 });
  assert.equal(ligneDe(melee), RPG_LIGNE_FRONT);
  assert.ok(melee.emplacement < 5);
  assert.notEqual(melee.emplacement, archiere.emplacement);
  assert.ok(d, 'le duel reste cohérent');
});

test('le fond est hors de portée tant que le front tient, et se découvre quand il tombe', () => {
  const { d, poserOk } = table();
  d.tour = 'sorcier';
  const mur = poserOk('joueur', MELEE); // devant, chez la cible
  const archiere = poserOk('joueur', DISTANCE);
  const attaquant = poserOk('sorcier', MELEE);
  d.tour = 'sorcier';
  const cibles = () => rpgCiblesIndividuellesClassique(d, 'sorcier', attaquant.id).cibles;
  assert.ok(cibles().includes(mur.id), 'la mêlée voit le front');
  assert.equal(cibles().includes(archiere.id), false, 'la mêlée ne voit pas le fond');
  // Le front tombe : le fond n'est plus protégé.
  d.joueur.creatures = d.joueur.creatures.filter((e) => e.id !== mur.id);
  assert.equal(frontTient(d.joueur.creatures), false);
  assert.ok(cibles().includes(archiere.id), 'front tombé, le fond redevient une cible');
});

test('Attaque ciblée et Infiltration passent la ligne', () => {
  for (const trait of ['coupRapide', 'infiltration']) {
    const { d, poserOk } = table();
    d.tour = 'joueur';
    poserOk('joueur', MELEE);
    const archiere = poserOk('joueur', DISTANCE);
    d.tour = 'sorcier';
    poserOk('sorcier', MELEE);
    const attaquant = poserOk('sorcier', MELEE);
    attaquant[trait] = true;
    const cibles = rpgCiblesIndividuellesClassique(d, 'sorcier', attaquant.id).cibles;
    assert.ok(cibles.includes(archiere.id), `${trait} atteint le fond`);
  }
});

test('un Défenseur reste devant, même quand le fond est libre', () => {
  const { d, poserOk } = table();
  const defenseur = poserOk('joueur', 'guerrier-au-bouclier-rond');
  assert.equal(ligneDe(defenseur), RPG_LIGNE_FRONT);
  assert.ok(defenseur.emplacement < 5);
  assert.ok(d);
});

test('chaque ligne a ses cinq places : le front plein n’empêche pas le fond', () => {
  const { d, poser, poserOk } = table();
  const front = [];
  for (let i = 0; i < 5; i += 1) front.push(poserOk('joueur', MELEE));
  assert.equal(front.filter((e) => ligneDe(e) === RPG_LIGNE_FRONT).length, 5);
  // Le sixième corps à corps n'a plus de place devant : il est refusé, et
  // n'occupe pas une case du fond pour autant.
  const refus = poser('joueur', MELEE);
  assert.equal(refus.ok, false);
  assert.equal(refus.raison, 'champ-plein');
  // Une créature à distance trouve encore les cinq places du fond.
  const archiere = poserOk('joueur', DISTANCE);
  assert.equal(ligneDe(archiere), RPG_LIGNE_FOND);
  assert.equal(d.joueur.creatures.length, 6);
});

test('sans le drapeau des lignes, rien ne change : cinq cases, tout le monde devant', () => {
  const { d, poserOk } = table(false);
  assert.equal(champMax(d), 5);
  assert.equal(d.lignes, undefined);
  const archiere = poserOk('joueur', DISTANCE);
  const melee = poserOk('joueur', MELEE);
  assert.equal(ligneDe(archiere), RPG_LIGNE_FRONT, 'hors lignes, la ligne du fond n’existe pas');
  assert.equal(ligneDe(melee), RPG_LIGNE_FRONT);
  assert.ok(archiere.emplacement < 5 && melee.emplacement < 5);
});

test('le duel en ligne ouvre aussi les deux lignes, dès l’état initial', () => {
  // L'arbitre crée ses duels de son côté : sans le drapeau, la première pose
  // d'un joueur partirait sur une rangée que l'autre ne voit pas.
  const etat = etatInitial([MELEE, DISTANCE], [MELEE], 'graine-des-deux-lignes');
  assert.equal(etat.lignes, true);
  assert.equal(champMax(etat), 10);
});

test('« À distance » tire sans riposte mais ne voit pas le fond : l’Attaque ciblée seule passe', () => {
  const { d, poserOk } = table();
  d.tour = 'joueur';
  const mur = poserOk('joueur', MELEE);
  const fond = poserOk('joueur', DISTANCE);
  d.tour = 'sorcier';
  // Un tireur « À distance » qui n'a **pas** l'Attaque ciblée : c'est le trait
  // de ligne seul qui est jugé ici.
  const tireur = poserOk('sorcier', 'ashigaru-des-braises');
  assert.equal(tireur.distance, true);
  assert.equal(tireur.coupRapide, false);
  const cibles = () => rpgCiblesIndividuellesClassique(d, 'sorcier', tireur.id).cibles;
  assert.ok(cibles().includes(mur.id), 'le tireur voit le front');
  assert.equal(cibles().includes(fond.id), false,
    'tirer de loin ne fait pas traverser la ligne : le fond reste couvert');
  // Le privilège de la ligne reste à l’Attaque ciblée (et à l’Infiltration).
  tireur.coupRapide = true;
  assert.ok(cibles().includes(fond.id), 'l’Attaque ciblée passe le front');
});
