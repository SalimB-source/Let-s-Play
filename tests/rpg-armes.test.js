/**
 * Les armes du Sablier — le prototype du cinquième type de cartes.
 *
 * Quatre armes, une par élément, jouées depuis la main et attachées
 * directement à une créature alliée : bonus +attaque/+défense, mot-clé donné
 * (Infiltration, Envol, Rapidité, immunité) ou effet propre (les serpents du Bâton, à son
 * arrivée puis à la demande contre 3 manas), une seule par créature, et
 * l'arme tombe au cimetière quand son porteur quitte la table — détruit ou
 * renvoyé en main. Ces contrôles tiennent le catalogue, le moteur
 * (`rpgJouerArme`, `rpgActiverArme`), l'IA du sorcier et les decks.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  rpgNouveauDuel,
  rpgJouerCreature,
  rpgJouerArme,
  rpgActiverArme,
  rpgFinDeTour,
  rpgLancerMagie,
  rpgBlesserCreature,
  rpgAttaquerCreature,
  rpgPeutBloquerAttaquant,
  rpgChoisirBloqueurs,
  rpgLancerAttaque,
  rpgEstProtegee,
  rpgSorcierActiverArmes,
  rpgSorcierAnnonceSuivante,
  rpgSorcierResoudreAnnonce,
} from '../src/games/rpgDuel.js';
import { choisirCarteIA } from '../src/games/rpgAI.js';
import {
  CATALOGUE_DU_COMPOSEUR,
  RPG_ARME_CARDS,
  RPG_DECKS,
  RPG_DUEL_CARDS,
  armeById,
  cardById,
  rpgValiderDeck,
} from '../src/games/rpgCards.js';
import { composerDeck } from '../src/games/rpgDeckComposer.js';
import { COLLECTION_DEPART, carteReveleePar } from '../src/games/rpgCollection.js';

const duelVide = () => rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [] });
const donner = (duel, cote, id) => duel[cote].main.push(id);
const manaPlein = (duel, cote) => { duel[cote].mana = { braise: 9, eau: 9, sable: 9, neige: 9 }; };

/** Pose une créature et rend son entité : le futur porteur. */
const poser = (duel, cote, id) => {
  donner(duel, cote, id);
  manaPlein(duel, cote);
  const res = rpgJouerCreature(duel, cote, id);
  assert.equal(res.ok, true, `${id} entre en jeu`);
  return res.entite;
};

/** Attache une arme à un porteur et rend l'entité. */
const equiper = (duel, cote, armeId, entite) => {
  donner(duel, cote, armeId);
  manaPlein(duel, cote);
  const res = rpgJouerArme(duel, cote, armeId, entite.id);
  assert.equal(res.ok, true, `${armeId} s'attache à ${entite.name}`);
  return res.entite;
};

// ── Le catalogue ────────────────────────────────────────────────────────────

/**
 * Les dix équipements du Sable (`docs/rpg/14-equipements-du-sable.md`) sont
 * venus s'ajouter au prototype : pour que ces contrôles historiques restent
 * lisibles, ils continuent de ne regarder que les quatre armes d'origine. Le
 * lot a son propre fichier de tests (`tests/rpg-equipements-sable.test.js`).
 */
const LOT_EQUIPEMENTS_SABLE = [
  'sandales-de-tislit', 'cuirasse-de-sel', 'javelot-du-beffroi',
  'licou-du-chien-de-sable', 'boussole-du-hoggar', 'harnais-du-mehari',
  'masque-du-guetteur', 'jitte-d-amayas', 'lame-des-ergs', 'takouba-de-tin-hinan',
];
const ARMES_PROTOTYPE = RPG_ARME_CARDS.filter((carte) => !LOT_EQUIPEMENTS_SABLE.includes(carte.id));

test('le prototype compte cinq armes, une par élément, avec leur peinture', () => {
  assert.equal(ARMES_PROTOTYPE.length, 5);
  assert.deepEqual(ARMES_PROTOTYPE.map((carte) => carte.element).sort(), ['braise', 'eau', 'neige', 'sable', 'tenebres']);
  for (const carte of ARMES_PROTOTYPE) {
    assert.equal(carte.kind, 'arme', `${carte.id} est une arme`);
    assert.match(carte.typeLine, /^Arme — /, `${carte.id} affiche sa ligne de type`);
    assert.ok(carte.bonus && Number.isInteger(carte.bonus.atk) && Number.isInteger(carte.bonus.def),
      `${carte.id} donne un bonus +attaque/+défense`);
    assert.ok(carte.text && carte.flavor, `${carte.id} a son texte et sa saveur`);
    assert.equal(armeById(carte.id), carte, `${carte.id} se retrouve par armeById`);
    assert.equal(cardById(carte.id).kind, 'arme', `${carte.id} est au catalogue général`);
    assert.ok(RPG_DUEL_CARDS.some((candidate) => candidate.id === carte.id),
      `${carte.id} est une carte du duel`);
    const image = fileURLToPath(new URL(`../public/cards/${carte.id}.jpg`, import.meta.url));
    assert.ok(existsSync(image), `${carte.id} a sa peinture plein art (${image})`);
  }
  // L'étagement par rareté du prototype : chiffres, effets d'élément, immunité.
  assert.equal(armeById('takouba-des-pistes').rarity, 'commune');
  assert.equal(armeById('takouba-des-pistes').cost, 3);
  assert.deepEqual(armeById('takouba-des-pistes').bonus, { atk: 2, def: 0 });
  assert.equal(armeById('takouba-des-pistes').donne.infiltration, true);
  assert.equal(armeById('baton-des-citernes').arrivee.jeton, 'serpent-des-citernes');
  assert.equal(armeById('baton-des-citernes').activation.cout, 3);
  assert.deepEqual(armeById('lance-de-givre').bonus, { atk: 1, def: 1 });
  assert.equal(armeById('lance-de-givre').donne.envol, true);
  assert.equal(armeById('lance-de-givre').donne.bouclier, 1);
  assert.match(armeById('lance-de-givre').text, /\+1\/\+1, Envol et un bouclier de 1/);
  assert.equal(armeById('armure-de-cendres').rarity, 'mythique');
  assert.deepEqual(armeById('armure-de-cendres').bonus, { atk: 3, def: 3 });
  assert.equal(armeById('armure-de-cendres').donne.immunite, 'braise');
  assert.equal(armeById('armure-de-cendres').donne.rapidite, true);
});

test('les decks du catalogue suivent leur quota d’armes sans dépasser une mythique', () => {
  const armesParDeck = {
    'veilleurs-du-desert': ['sandales-de-tislit', 'licou-du-chien-de-sable', 'jitte-d-amayas', 'takouba-de-tin-hinan', 'harnais-du-mehari'],
    'cour-des-djinns': [],
    'sentiers-de-cendre': ['takouba-des-pistes', 'harnais-du-mehari', 'jitte-d-amayas', 'masque-du-guetteur'],
    'maree-des-abysses': ['baton-des-citernes'],
    'serment-des-neuf-hivers': ['lance-de-givre'],
    'serment-du-soleil-rouge': [],
    'balance-des-heures': ['khopesh-d-or'],
  };
  for (const deck of RPG_DECKS) {
    assert.equal(deck.cardIds.length, 30, `${deck.name} fait 30 cartes`);
    assert.equal(rpgValiderDeck(deck.cardIds).ok, true, `${deck.name} reste valide`);
    const armes = [...new Set(deck.cardIds.filter((id) => armeById(id)))].sort();
    assert.deepEqual(armes, armesParDeck[deck.id].sort(), `${deck.name} respecte sa sélection d’armes`);
    const mythiques = [...new Set(deck.cardIds.filter((id) => cardById(id).rarity === 'mythique'))];
    assert.equal(mythiques.length, 1, `${deck.name} ne garde qu’une mythique distincte`);
  }

  const veilleurs = RPG_DECKS.find((deck) => deck.id === 'veilleurs-du-desert');
  assert.ok(veilleurs.cardIds.includes('takouba-de-tin-hinan'),
    'les Veilleurs gardent la Takouba mythique comme seule mythique');
  const sentiers = RPG_DECKS.find((deck) => deck.id === 'sentiers-de-cendre');
  assert.ok(sentiers.cardIds.includes('takouba-des-pistes'),
    'les Sentiers gardent la Takouba des pistes de leur signature');
  assert.deepEqual([...new Set(sentiers.cardIds.filter((id) => cardById(id).rarity === 'mythique'))], ['feriel'],
    'Fériel est la seule mythique des Sentiers, pas les deux équipements mythiques');
});

test('les armes entrent dans la collection comme les autres cartes', () => {
  assert.ok(COLLECTION_DEPART.includes('takouba-des-pistes'),
    'la Takouba commune appartient à tout le monde d’entrée');
  for (const id of ['baton-des-citernes', 'armure-de-cendres', 'lance-de-givre']) {
    assert.equal(COLLECTION_DEPART.includes(id), false, `${id} se conquiert`);
    assert.ok(carteReveleePar(id), `${id} est la récompense d’un étage des Tours`);
  }
});

test('le composeur remplit un quota d’armes comme les autres quotas', () => {
  const liste = composerDeck({
    identite: ['sable'],
    terrains: [],
    creatures: 1,
    magies: 0,
    armes: 2,
  }, CATALOGUE_DU_COMPOSEUR);
  assert.equal(liste.length, 3);
  // Le Sable n'a plus une seule arme mais onze : les deux places vont aux
  // deux meilleures, la mythique du lot puis la Lame des ergs (la meilleure
  // rare depuis que la Jitte s'est simplifiée en +2/+1 et protection).
  assert.equal(liste.filter((id) => id === 'takouba-de-tin-hinan').length, 1,
    'la place de mythique va à la Takouba de Tin Hinan, seule mythique Sable');
  assert.equal(liste.filter((id) => id === 'lame-des-ergs').length, 1,
    'la seconde place va à la meilleure arme rare du Sable');
  assert.equal(rpgValiderDeck(liste).ok, false, 'ce mini-paquet teste les quotas, pas le format de trente cartes');
});

// ── L'attachement ───────────────────────────────────────────────────────────

test('attacher une arme paie son mana et renforce le porteur tant qu’il la porte', () => {
  const duel = duelVide();
  const chien = poser(duel, 'joueur', 'chien-du-guet'); // 2/2
  equiper(duel, 'joueur', 'takouba-des-pistes', chien);
  assert.equal(chien.atk, 4, '2 + 2 d’attaque');
  assert.equal(chien.def, 2, 'et +0 de défense : la Takouba ne renforce pas');
  assert.equal(chien.pv, 2);
  assert.equal(chien.pvMax, 2);
  assert.equal(chien.arme.carteId, 'takouba-des-pistes');
  assert.equal(duel.joueur.main.includes('takouba-des-pistes'), false, 'l’arme quitte la main');
  assert.equal(duel.joueur.cimetiere.includes('takouba-des-pistes'), false,
    'elle ne passe pas par le cimetière : elle est portée');
});

test('sans porteur désigné, l’arme refuse de partir et rien n’est payé', () => {
  const duel = duelVide();
  donner(duel, 'joueur', 'takouba-des-pistes');
  manaPlein(duel, 'joueur');
  const res = rpgJouerArme(duel, 'joueur', 'takouba-des-pistes', 'entite-absente');
  assert.equal(res.ok, false);
  assert.equal(res.raison, 'cible');
  assert.ok(duel.joueur.main.includes('takouba-des-pistes'), 'la carte reste en main');
  assert.equal(duel.joueur.mana.sable, 9, 'le mana est intact');
  // Et une arme ne se pose jamais comme une créature.
  poser(duel, 'joueur', 'chien-du-guet');
  assert.equal(rpgJouerCreature(duel, 'joueur', 'takouba-des-pistes').ok, false);
});

/** Les serpents des citernes présents sur la table d'un camp. */
const serpents = (duel, cote) => duel[cote].creatures
  .filter((entite) => entite.carteId === 'serpent-des-citernes');

test('à son arrivée, le Bâton appelle un serpent 3/1 avec Rapidité — et ne donne plus l’Esquive', () => {
  const duel = duelVide();
  const dune = poser(duel, 'joueur', 'dune-marchante'); // 2/4
  equiper(duel, 'joueur', 'baton-des-citernes', dune);
  assert.equal(dune.atk, 3, 'le porteur gagne +1 d’attaque');
  assert.equal(dune.pv, 6, 'le +2 de défense grandit les PV');
  assert.equal(dune.esquive, false, 'le Bâton ne donne plus l’Esquive');
  const appeles = serpents(duel, 'joueur');
  assert.equal(appeles.length, 1, 'un serpent naît de l’arrivée du Bâton');
  assert.equal(appeles[0].atk, 3);
  assert.equal(appeles[0].pv, 1);
  assert.equal(appeles[0].jeton, true, 'c’est une créature-jeton');
  assert.equal(appeles[0].rapidite, true);
  assert.equal(appeles[0].ready, true, 'Rapidité : il peut attaquer dès ce tour');
  assert.equal(appeles[0].detruireFinDuTour, true, 'mais la fin du tour le reprendra');
  rpgBlesserCreature(duel, 'joueur', dune.id, 3, 'eau', null, 'magie');
  assert.equal(dune.pv, 3, 'sans Esquive, la Dune encaisse les 3 dégâts');
});

test('le serpent du Bâton frappe le tour même, puis la fin du tour le détruit', () => {
  const duel = duelVide();
  const dune = poser(duel, 'joueur', 'dune-marchante');
  equiper(duel, 'joueur', 'baton-des-citernes', dune);
  const serpent = serpents(duel, 'joueur')[0];
  const cible = poser(duel, 'sorcier', 'ghul-des-cendres'); // 2/1
  const attaque = rpgAttaquerCreature(duel, 'joueur', serpent.id, cible.id);
  assert.equal(attaque.ok, true, 'le serpent attaque dès son arrivée (Rapidité)');
  assert.equal(duel.sorcier.creatures.some((entite) => entite.id === cible.id), false,
    'ses 3 dégâts achèvent le Ghul');
  rpgFinDeTour(duel);
  assert.equal(serpents(duel, 'joueur').length, 0, 'la fin du tour détruit le serpent');
  assert.equal(duel.tour, 'sorcier', 'le tour a changé de main');
});

test('activer le Bâton pour 3 manas appelle un autre serpent — jamais hors de son tour ni sans mana', () => {
  const duel = duelVide();
  const dune = poser(duel, 'joueur', 'dune-marchante');
  equiper(duel, 'joueur', 'baton-des-citernes', dune); // serpent d'arrivée
  assert.equal(serpents(duel, 'joueur').length, 1);
  duel.joueur.mana = { braise: 0, eau: 3, sable: 0, neige: 0 };
  const res = rpgActiverArme(duel, 'joueur', dune.id);
  assert.equal(res.ok, true);
  assert.equal(serpents(duel, 'joueur').length, 2, 'un second serpent répond à l’activation');
  assert.equal(rpgPeutPayerMana(duel), false, 'les 3 manas sont partis');
  const sansMana = rpgActiverArme(duel, 'joueur', dune.id);
  assert.equal(sansMana.ok, false);
  assert.equal(sansMana.raison, 'mana');
  duel.tour = 'sorcier';
  duel.joueur.mana = { braise: 0, eau: 9, sable: 0, neige: 0 };
  const horsTour = rpgActiverArme(duel, 'joueur', dune.id);
  assert.equal(horsTour.ok, false);
  assert.equal(horsTour.raison, 'tour', 'une capacité activée se décide pendant son propre tour');

  const duel2 = duelVide();
  const chien = poser(duel2, 'joueur', 'chien-du-guet');
  equiper(duel2, 'joueur', 'takouba-des-pistes', chien);
  const sansActivation = rpgActiverArme(duel2, 'joueur', chien.id);
  assert.equal(sansActivation.ok, false);
  assert.equal(sansActivation.raison, 'aucune-activation', 'la Takouba n’a rien à activer');
});

/** Reste-t-il de quoi payer la moindre chose ? (mana du joueur épuisé ou non). */
const rpgPeutPayerMana = (duel) => Object.values(duel.joueur.mana).some((n) => n > 0);

test('la Lance de givre donne +1/+1, Envol et un bouclier de 1 au porteur, dans les deux sens du blocage', () => {
  const duel = duelVide();
  const chien = poser(duel, 'joueur', 'chien-du-guet'); // 2/2
  const anqa = poser(duel, 'sorcier', 'anqa-des-braises'); // volante de naissance
  assert.equal(rpgPeutBloquerAttaquant(chien, anqa), false, 'au sol, il ne bloque pas une volante');
  equiper(duel, 'joueur', 'lance-de-givre', chien);
  assert.equal(chien.atk, 3, '2 + 1 d’attaque');
  assert.equal(chien.def, 3, '2 + 1 de défense');
  assert.equal(chien.pv, 3, 'le +1 de défense grandit aussi les PV présents');
  assert.equal(chien.envol, true);
  assert.equal(chien.bouclier, 1, 'la Lance dresse son bouclier de 1');
  assert.equal(chien.arme.bouclier, 1, 'et ce point encore intact reste rattaché à l’arme');
  const coupAbsorbe = rpgBlesserCreature(duel, 'joueur', chien.id, 1, 'eau', null, 'magie');
  assert.equal(coupAbsorbe.absorbes, 1, 'le prochain dégât est absorbé');
  assert.equal(coupAbsorbe.recus, 0);
  assert.equal(chien.bouclier, 0, 'le bouclier est consommé');
  assert.equal(chien.arme.bouclier, 0, 'sa part portée par la Lance aussi');
  assert.equal(chien.pv, 3, 'les PV du porteur n’ont pas été entamés');
  assert.equal(rpgPeutBloquerAttaquant(chien, anqa), true, 'porteur de la Lance, il bloque les volantes');
  assert.equal(rpgPeutBloquerAttaquant(anqa, chien), true);
  const dune = poser(duel, 'sorcier', 'dune-marchante');
  assert.equal(rpgPeutBloquerAttaquant(dune, chien), false,
    'et seule une volante peut désormais le bloquer, lui');
});

test('Infiltration : le porteur du Takouba ne peut pas être bloqué, tant qu’il le porte', () => {
  const duel = duelVide();
  const chien = poser(duel, 'joueur', 'chien-du-guet'); // 2/2
  const dune = poser(duel, 'sorcier', 'dune-marchante');
  const anqa = poser(duel, 'sorcier', 'anqa-des-braises'); // volante de naissance
  assert.equal(rpgPeutBloquerAttaquant(dune, chien), true, 'sans le Takouba, le Chien se bloque normalement');
  equiper(duel, 'joueur', 'takouba-des-pistes', chien); // +2/+0 et Infiltration
  assert.equal(chien.atk, 4);
  assert.equal(chien.pv, 2, 'le +0 de défense ne le renforce pas : arme d’assaut pur');
  assert.equal(chien.infiltration, true);
  assert.equal(rpgPeutBloquerAttaquant(dune, chien), false, 'aucun bloqueur au sol ne l’arrête');
  assert.equal(rpgPeutBloquerAttaquant(anqa, chien), false, 'pas même un bloqueur volant');
  assert.deepEqual(rpgChoisirBloqueurs(duel, 'joueur', [chien.id]) ?? {}, {},
    'l’IA adverse ne propose aucun bloqueur contre un inbloquable');

  chien.ready = true;
  const tentative = rpgLancerAttaque(duel, 'joueur', [chien.id], { [chien.id]: [dune.id] });
  assert.equal(tentative.ok, false, 'le blocage est refusé par le moteur');
  assert.equal(tentative.raison, 'infiltration');
  const pvSorcier = duel.sorcier.pv;
  const res = rpgLancerAttaque(duel, 'joueur', [chien.id], { [chien.id]: [] });
  assert.equal(res.ok, true);
  assert.equal(res.resume.frappeSorcier, 4, 'ses 4 dégâts passent entièrement');
  assert.equal(duel.sorcier.pv, pvSorcier - 4);

  // L’arme remplacée, l’Infiltration s’en va avec elle.
  const duel2 = duelVide();
  const chien2 = poser(duel2, 'joueur', 'chien-du-guet');
  const dune2 = poser(duel2, 'sorcier', 'dune-marchante');
  equiper(duel2, 'joueur', 'takouba-des-pistes', chien2);
  equiper(duel2, 'joueur', 'baton-des-citernes', chien2); // le Takouba tombe au cimetière
  assert.equal(chien2.infiltration, false, 'sans le Takouba, plus d’Infiltration');
  assert.equal(rpgPeutBloquerAttaquant(dune2, chien2), true, 'et le porteur redevient bloquable');
});

test('une seconde arme envoie la première au cimetière et retire son bonus', () => {
  const duel = duelVide();
  const chien = poser(duel, 'joueur', 'chien-du-guet'); // 2/2
  equiper(duel, 'joueur', 'takouba-des-pistes', chien); // → 4/2
  equiper(duel, 'joueur', 'lance-de-givre', chien); // +1/+1, Envol et Bouclier 1, la Takouba tombe
  assert.equal(chien.arme.carteId, 'lance-de-givre');
  assert.equal(chien.atk, 3, 'le +2 de la Takouba est parti, le +1 de la Lance est là');
  assert.equal(chien.pv, 3);
  assert.equal(chien.envol, true);
  assert.equal(chien.bouclier, 1, 'la Lance dresse son bouclier en s’attachant');
  assert.equal(chien.arme.bouclier, 1);
  assert.ok(duel.joueur.cimetiere.includes('takouba-des-pistes'),
    'l’ancienne arme est au cimetière, pas en main');
  assert.equal(duel.joueur.main.includes('takouba-des-pistes'), false);
});

test('le bouclier de la Lance repart avec elle, sans voler celui d’un autre effet', () => {
  const duel = duelVide();
  const chien = poser(duel, 'joueur', 'chien-du-guet');
  equiper(duel, 'joueur', 'lance-de-givre', chien);
  assert.equal(chien.bouclier, 1);

  equiper(duel, 'joueur', 'takouba-des-pistes', chien);
  assert.equal(chien.bouclier, 0, 'le point encore intact repart avec la Lance remplacée');
  assert.equal(chien.envol, false, 'Envol repart avec elle aussi');

  equiper(duel, 'joueur', 'lance-de-givre', chien);
  donner(duel, 'joueur', 'parade-du-verre');
  manaPlein(duel, 'joueur');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'parade-du-verre', chien.id).ok, true);
  assert.equal(chien.bouclier, 4, 'le point de la Lance s’ajoute aux 3 de la Parade');

  rpgBlesserCreature(duel, 'joueur', chien.id, 1, 'eau', null, 'magie');
  assert.equal(chien.bouclier, 3, 'un point a été absorbé');
  assert.equal(chien.arme.bouclier, 0, 'le point de la Lance encaisse le premier');

  equiper(duel, 'joueur', 'baton-des-citernes', chien);
  assert.equal(chien.bouclier, 3, 'les 3 points de la Parade restent : changer d’arme ne les vole pas');
  assert.equal(chien.arme.carteId, 'baton-des-citernes');
});

test('la protection contre la couleur de l’arme refuse l’attachement', () => {
  const duel = duelVide();
  const tiziri = poser(duel, 'joueur', 'tiziri-du-djurdjura');
  tiziri.protection = { contre: 'eau', toursRestants: 2 }; // protection forcée : Tiziri ne protège plus que de la Braise
  donner(duel, 'joueur', 'baton-des-citernes');
  manaPlein(duel, 'joueur');
  const res = rpgJouerArme(duel, 'joueur', 'baton-des-citernes', tiziri.id);
  assert.equal(res.ok, false);
  assert.equal(res.raison, 'protection');
  assert.equal(tiziri.arme, null);
  assert.ok(duel.joueur.main.includes('baton-des-citernes'), 'rien n’est payé');
});

// ── Le sort de l'arme quand le porteur part ─────────────────────────────────

test('quand le porteur meurt, son arme tombe au cimetière avec lui', () => {
  const duel = duelVide();
  const chien = poser(duel, 'joueur', 'chien-du-guet');
  equiper(duel, 'joueur', 'takouba-des-pistes', chien);
  rpgBlesserCreature(duel, 'joueur', chien.id, 99, 'braise', null, 'magie');
  assert.equal(duel.joueur.creatures.length, 0);
  assert.ok(duel.joueur.cimetiere.includes('chien-du-guet'), 'la créature est au cimetière');
  assert.ok(duel.joueur.cimetiere.includes('takouba-des-pistes'), 'et son arme aussi');
  assert.equal(duel.joueur.main.includes('takouba-des-pistes'), false, 'jamais en main');
});

test('renvoyé en main, le porteur repart sans son arme : elle tombe au cimetière', () => {
  const duel = duelVide();
  const chien = poser(duel, 'joueur', 'chien-du-guet');
  equiper(duel, 'joueur', 'takouba-des-pistes', chien);
  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'ressac');
  manaPlein(duel, 'sorcier');
  const res = rpgLancerMagie(duel, 'sorcier', 'ressac', chien.id);
  assert.equal(res.ok, true);
  assert.ok(duel.joueur.main.includes('chien-du-guet'), 'la créature repart en main');
  assert.ok(duel.joueur.cimetiere.includes('takouba-des-pistes'),
    'mais son arme tombe au cimetière');
  assert.equal(duel.joueur.main.includes('takouba-des-pistes'), false);
});

// ── L'Armure de cendres : +3/+3, Rapidité, immunité contre la Braise ───────

test('l’Armure de cendres donne +3/+3, la Rapidité et l’immunité contre la Braise', () => {
  const duel = duelVide();
  const chien = poser(duel, 'joueur', 'chien-du-guet'); // 2/2, mal d'invocation
  assert.equal(chien.ready, false, 'le Chien vient d’arriver : il ne peut pas attaquer');
  equiper(duel, 'joueur', 'armure-de-cendres', chien);
  assert.equal(chien.atk, 5, '2 + 3 d’attaque');
  assert.equal(chien.pv, 5, '2 + 3 de défense');
  assert.equal(chien.rapidite, true, 'l’Armure donne la Rapidité');
  assert.equal(chien.ready, true, 'le porteur peut attaquer dès ce tour');
  assert.equal(rpgEstProtegee(chien, 'braise'), true, 'immunisé contre la Braise');
  assert.equal(rpgEstProtegee(chien, 'eau'), false, 'mais pas contre les autres éléments');
  const dune = poser(duel, 'sorcier', 'dune-marchante'); // 2/5
  const attaque = rpgAttaquerCreature(duel, 'joueur', chien.id, dune.id);
  assert.equal(attaque.ok, true, 'la Rapidité le laisse attaquer aussitôt');
  // Dégâts de Braise : aucun. Dégâts d'un autre élément : pleins.
  chien.pv = chien.pvMax;
  const braise = rpgBlesserCreature(duel, 'joueur', chien.id, 4, 'braise', null, 'magie');
  assert.equal(braise.protegee, true, 'une magie de Braise ne l’atteint pas');
  assert.equal(chien.pv, chien.pvMax, 'aucun dégât de Braise encaissé');
  const eau = rpgBlesserCreature(duel, 'joueur', chien.id, 2, 'eau', null, 'magie');
  assert.equal(eau.ok, true);
  assert.equal(chien.pv, chien.pvMax - 2, 'une magie d’Eau, elle, le blesse');
});

test('une créature Braise ne peut pas bloquer le porteur de l’Armure de cendres', () => {
  const duel = duelVide();
  const porteur = poser(duel, 'joueur', 'chien-du-guet');
  equiper(duel, 'joueur', 'armure-de-cendres', porteur);
  const ghul = poser(duel, 'sorcier', 'ghul-des-cendres');
  duel.sorcier.pv = 4; // l’IA voudrait normalement sacrifier le Ghul pour éviter les 5 dégâts létaux

  assert.deepEqual(rpgChoisirBloqueurs(duel, 'joueur', [porteur.id]), {},
    'l’IA ne propose pas le Ghul Braise comme bloqueur contre le porteur immunisé');
  const attaque = rpgLancerAttaque(duel, 'joueur', [porteur.id], null);
  assert.equal(attaque.ok, true, 'l’attaque automatique ne se retrouve pas bloquée illégalement');
  assert.equal(attaque.resume.frappeSorcier, 5, 'les 5 dégâts passent au sorcier');
  assert.equal(ghul.pv, 1, 'le Ghul reste intact puisque l’Armure l’empêche de bloquer');
});

test('remplacer l’Armure retire son immunité : la Braise mord de nouveau', () => {
  const duel = duelVide();
  const chien = poser(duel, 'joueur', 'chien-du-guet');
  equiper(duel, 'joueur', 'armure-de-cendres', chien);
  assert.equal(rpgEstProtegee(chien, 'braise'), true);
  equiper(duel, 'joueur', 'takouba-des-pistes', chien); // l'Armure tombe au cimetière
  assert.equal(chien.arme.carteId, 'takouba-des-pistes');
  assert.equal(rpgEstProtegee(chien, 'braise'), false, 'sans l’Armure, plus d’immunité');
  assert.ok(duel.joueur.cimetiere.includes('armure-de-cendres'));
});

// ── Les contres ─────────────────────────────────────────────────────────────

test('un Contresort des abîmes contre l’arme annoncée : elle ne sera jamais portée', () => {
  const duel = duelVide();
  const ghul = poser(duel, 'sorcier', 'ghul-des-cendres'); // futur porteur
  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'armure-de-cendres');
  manaPlein(duel, 'sorcier');
  const annonce = rpgSorcierAnnonceSuivante(duel, () => 0.5);
  assert.equal(annonce?.carteId, 'armure-de-cendres', 'le sorcier annonce son arme');
  assert.equal(annonce?.cibleId, ghul.id, 'et désigne son porteur');
  donner(duel, 'joueur', 'contresort-des-abimes');
  manaPlein(duel, 'joueur');
  const res = rpgLancerMagie(duel, 'joueur', 'contresort-des-abimes');
  assert.equal(res.ok, true);
  assert.equal(res.contre, true);
  assert.equal(res.carteContree, 'armure-de-cendres');
  assert.ok(duel.sorcier.cimetiere.includes('armure-de-cendres'), 'l’arme contrecarrée va au cimetière');
  assert.equal(ghul.arme, null, 'le porteur désigné reste sans arme');
});

test('le sorcier peut contrer l’arme du joueur, comme une créature', () => {
  const duel = duelVide();
  const chien = poser(duel, 'joueur', 'chien-du-guet');
  donner(duel, 'sorcier', 'contresort-des-abimes');
  manaPlein(duel, 'sorcier');
  donner(duel, 'joueur', 'armure-de-cendres');
  manaPlein(duel, 'joueur');
  const res = rpgJouerArme(duel, 'joueur', 'armure-de-cendres', chien.id);
  assert.equal(res.ok, true);
  assert.equal(res.contre, true, 'le sorcier répond par son contresort « carte »');
  assert.equal(chien.arme, null);
  assert.equal(chien.atk, 2, 'aucun bonus n’a été posé');
  assert.ok(duel.joueur.cimetiere.includes('armure-de-cendres'), 'l’arme contrée est défaussée');
});

// ── L'IA du sorcier ─────────────────────────────────────────────────────────

test('l’IA équipe sa meilleure créature sans arme, jamais une créature déjà armée', () => {
  const duel = duelVide();
  poser(duel, 'sorcier', 'ghul-des-cendres');
  const colosse = poser(duel, 'sorcier', 'colosse-de-sel');
  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'armure-de-cendres');
  manaPlein(duel, 'sorcier');
  const coup = choisirCarteIA(duel, 'sorcier', { rng: () => 0.5 });
  assert.equal(coup.carteId, 'armure-de-cendres');
  assert.equal(coup.cibleId, colosse.id, 'le Colosse, sa créature la plus précieuse, reçoit l’Armure');
  // Sans créature à équiper, l'arme attend : l'IA la garde en main.
  const duelVideTable = duelVide();
  duelVideTable.tour = 'sorcier';
  donner(duelVideTable, 'sorcier', 'armure-de-cendres');
  manaPlein(duelVideTable, 'sorcier');
  assert.equal(choisirCarteIA(duelVideTable, 'sorcier', { rng: () => 0.5 }), null);
});

test('le sorcier active le Bâton après ses annonces : ses serpents attaquent le tour même', () => {
  const duel = duelVide();
  const dune = poser(duel, 'sorcier', 'dune-marchante');
  equiper(duel, 'sorcier', 'baton-des-citernes', dune); // serpent d'arrivée
  assert.equal(serpents(duel, 'sorcier').length, 1);
  duel.tour = 'sorcier';
  duel.sorcier.mana = { braise: 0, eau: 3, sable: 0, neige: 0 };
  const actives = rpgSorcierActiverArmes(duel);
  assert.equal(actives.length, 1, 'une activation pour les 3 manas restants');
  assert.equal(serpents(duel, 'sorcier').length, 2, 'le second serpent a répondu');
  assert.ok(serpents(duel, 'sorcier').every((serpent) => serpent.ready),
    'les deux serpents sont prêts à attaquer ce tour-ci');
  duel.sorcier.mana = { braise: 0, eau: 3, sable: 0, neige: 0 };
  donner(duel, 'sorcier', 'contresort-des-abimes');
  assert.equal(rpgSorcierActiverArmes(duel).length, 0,
    'avec un contresort en main, le sorcier garde ses 4 manas de réponse');
});

test('contré par le sorcier, le Bâton n’appelle aucun serpent', () => {
  const duel = duelVide();
  const chien = poser(duel, 'joueur', 'chien-du-guet');
  donner(duel, 'sorcier', 'contresort-des-abimes');
  manaPlein(duel, 'sorcier');
  donner(duel, 'joueur', 'baton-des-citernes');
  manaPlein(duel, 'joueur');
  const res = rpgJouerArme(duel, 'joueur', 'baton-des-citernes', chien.id);
  assert.equal(res.contre, true, 'le sorcier contre le Bâton annoncé');
  assert.equal(chien.arme, null, 'le Bâton n’est jamais porté');
  assert.equal(serpents(duel, 'joueur').length, 0, 'et aucun serpent n’arrive');
});

test('le sorcier joue son arme par la fenêtre d’annonce, comme ses autres cartes', () => {
  const duel = duelVide();
  const ghul = poser(duel, 'sorcier', 'ghul-des-cendres'); // 1/1
  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'takouba-des-pistes');
  manaPlein(duel, 'sorcier');
  const annonce = rpgSorcierAnnonceSuivante(duel, () => 0.5);
  assert.equal(annonce?.carteId, 'takouba-des-pistes');
  const res = rpgSorcierResoudreAnnonce(duel);
  assert.equal(res.ok, true);
  assert.equal(ghul.arme.carteId, 'takouba-des-pistes');
  assert.equal(ghul.atk, 3, 'le Ghul porte la Takouba : 1 + 2');
  assert.equal(ghul.pv, 1, 'et +0 de défense : toujours 1 PV');
});
