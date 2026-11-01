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
  rpgAttaquerSorcier,
  rpgCiblesAttaqueRapide,
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
  RPG_DECKS_ARCHETYPES,
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
  if (id === 'seigneur-des-machoires') Object.assign(res.entite, { tenaciteDisponible: false, tribut: 0 });
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
  'sphere-de-rotation',
];
const ARMES_PROTOTYPE = RPG_ARME_CARDS.filter((carte) => !LOT_EQUIPEMENTS_SABLE.includes(carte.id) && carte.set !== 'soldats-de-la-lune');

test('le prototype compte sept armes, une par élément (la Neige et le Sable en portent deux), avec leur peinture', () => {
  assert.equal(ARMES_PROTOTYPE.length, 7);
  assert.deepEqual(ARMES_PROTOTYPE.map((carte) => carte.element).sort(),
    ['braise', 'eau', 'neige', 'neige', 'sable', 'sable', 'tenebres']);
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
  assert.equal(armeById('baton-des-citernes').activation, undefined);
  assert.deepEqual(armeById('lance-de-givre').bonus, { atk: 1, def: 0 });
  assert.equal(armeById('lance-de-givre').donne.coupRapide, true);
  assert.equal(armeById('lance-de-givre').donne.envol, undefined);
  assert.equal(armeById('lance-de-givre').donne.bouclier, undefined,
    'la Lance ne donne plus de bouclier');
  assert.match(armeById('lance-de-givre').text, /\+1\/\+0 et Attaque ciblée/);
  assert.doesNotMatch(armeById('lance-de-givre').text, /bouclier/i);
  assert.equal(armeById('armure-de-cendres').rarity, 'mythique');
  assert.deepEqual(armeById('armure-de-cendres').bonus, { atk: 0, def: 4 });
  assert.equal(armeById('armure-de-cendres').donne.immunite, undefined);
  assert.equal(armeById('armure-de-cendres').donne.contreAttaque, true);
  // La Hache de la banquise : le forfait d'attachement et le bouclier de l'arme.
  const hache = armeById('hache-de-la-banquise');
  assert.equal(hache.cost, 3);
  assert.equal(hache.element, 'neige');
  assert.deepEqual(hache.bonus, { atk: 2, def: 0 });
  assert.equal(hache.blessurePorteur, 1, 'l’arme mord son porteur en s’attachant');
  assert.equal(hache.donne?.bouclier, undefined);
});

test('les decks du catalogue suivent leur quota d’armes et leur plafond de mythiques', () => {
  const armesParDeck = {
    'veilleurs-du-desert': ['sandales-de-tislit', 'licou-du-chien-de-sable', 'jitte-d-amayas', 'takouba-de-tin-hinan', 'harnais-du-mehari'],
    'cour-des-djinns': [],
    'sentiers-de-cendre': ['takouba-des-pistes', 'harnais-du-mehari', 'jitte-d-amayas', 'lame-des-ergs', 'masque-du-guetteur'],
    'maree-des-abysses': ['baton-des-citernes'],
    'serment-des-neuf-hivers': ['lance-de-givre'],
    'serment-du-soleil-rouge': [],
    'balance-des-heures': ['khopesh-d-or'],
    'lettres-de-marque': ['baton-des-citernes', 'grappin-d-abordage'],
  };
  for (const deck of RPG_DECKS_ARCHETYPES) {
    assert.equal(deck.cardIds.length, 30, `${deck.name} fait 30 cartes`);
    assert.equal(rpgValiderDeck(deck.cardIds).ok, true, `${deck.name} reste valide`);
    const armes = [...new Set(deck.cardIds.filter((id) => armeById(id)))].sort();
    assert.deepEqual(armes, armesParDeck[deck.id].sort(), `${deck.name} respecte sa sélection d’armes`);
    const mythiques = [...new Set(deck.cardIds.filter((id) => cardById(id).rarity === 'mythique'))];
    assert.equal(mythiques.length,
      ['serment-des-neuf-hivers', 'serment-du-soleil-rouge'].includes(deck.id) ? 2 : 1,
      `${deck.name} respecte son nombre de mythiques distinctes`);
  }

  const veilleurs = RPG_DECKS_ARCHETYPES.find((deck) => deck.id === 'veilleurs-du-desert');
  assert.ok(veilleurs.cardIds.includes('takouba-de-tin-hinan'),
    'les Veilleurs gardent la Takouba mythique comme seule mythique');
  const sentiers = RPG_DECKS_ARCHETYPES.find((deck) => deck.id === 'sentiers-de-cendre');
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

test('le Bâton remplit les places libres de Serpents 1/1 permanents et ne s’active plus', () => {
  const duel = duelVide();
  const dune = poser(duel, 'joueur', 'dune-marchante');
  poser(duel, 'joueur', 'chien-du-guet');
  equiper(duel, 'joueur', 'baton-des-citernes', dune);
  assert.equal(dune.atk, 2);
  assert.equal(dune.pv, 7);
  assert.equal(serpents(duel, 'joueur').length, 3);
  for (const serpent of serpents(duel, 'joueur')) {
    assert.deepEqual([serpent.atk, serpent.pv, serpent.rapidite], [1, 1, false]);
    assert.notEqual(serpent.detruireFinDuTour, true);
  }
  assert.equal(rpgActiverArme(duel, 'joueur', dune.id).ok, false);
  rpgFinDeTour(duel);
  assert.equal(serpents(duel, 'joueur').length, 3);
});

test('la Lance de givre donne +1/+0 et Attaque ciblée au porteur, sans Envol ni bouclier', () => {
  const duel = duelVide();
  const dune = poser(duel, 'joueur', 'dune-marchante'); // 2/4
  equiper(duel, 'joueur', 'lance-de-givre', dune);
  assert.equal(dune.atk, 3, '2 + 1 d’attaque');
  assert.deepEqual([dune.def, dune.pv, dune.pvMax], [4, 4, 4], 'la défense et les PV ne changent pas');
  assert.equal(dune.coupRapide, true, 'la Lance confère bien Attaque ciblée');
  assert.equal(dune.envol, false, 'l’ancien Envol est retiré');
  assert.equal(dune.bouclier ?? 0, 0, 'la Lance ne dresse aucun bouclier');
  assert.equal(dune.arme.bouclier, undefined, 'aucun point de bouclier ne vit sur l’arme');
  dune.ready = true;
  const cibles = rpgCiblesAttaqueRapide(duel, 'joueur', [dune.id]);
  assert.deepEqual(cibles, {}, 'sans cible adverse, le porteur peut encore attaquer normalement');
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
  equiper(duel, 'joueur', 'lance-de-givre', chien); // +1/+0 et Attaque ciblée, la Takouba tombe
  assert.equal(chien.arme.carteId, 'lance-de-givre');
  assert.equal(chien.atk, 3, 'le +2 de la Takouba est parti, le +1 de la Lance est là');
  assert.deepEqual([chien.def, chien.pv, chien.pvMax], [2, 2, 2],
    'le +0 de défense de la Lance laisse le Chien 2/2 intact');
  assert.equal(chien.coupRapide, true);
  assert.equal(chien.envol, false);
  assert.equal(chien.bouclier ?? 0, 0, 'la Lance ne dresse aucun bouclier en s’attachant');
  assert.equal(chien.arme.bouclier, undefined);
  assert.ok(duel.joueur.cimetiere.includes('takouba-des-pistes'),
    'l’ancienne arme est au cimetière, pas en main');
  assert.equal(duel.joueur.main.includes('takouba-des-pistes'), false);
});

test('remplacer la Lance conserve les PV et ne vole pas un bouclier venu d’ailleurs', () => {
  const duel = duelVide();
  const dune = poser(duel, 'joueur', 'dune-marchante'); // 2/4
  equiper(duel, 'joueur', 'lance-de-givre', dune);
  assert.deepEqual([dune.atk, dune.def, dune.pv, dune.pvMax, dune.bouclier ?? 0], [3, 4, 4, 4, 0]);

  donner(duel, 'joueur', 'parade-du-verre');
  manaPlein(duel, 'joueur');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'parade-du-verre', dune.id).ok, true);
  assert.equal(dune.bouclier, 1, 'la parade vient de la Parade, pas de la Lance');

  rpgBlesserCreature(duel, 'joueur', dune.id, 1, 'eau', null, 'magie');
  assert.equal(dune.bouclier, 1, 'une blessure directe ne fait pas tomber la parade');
  assert.equal(dune.pv, 3, 'le dégât passe : la parade n’absorbe plus rien');

  equiper(duel, 'joueur', 'takouba-des-pistes', dune);
  assert.deepEqual([dune.atk, dune.def, dune.pv, dune.pvMax], [4, 3, 3, 4],
    'le +0 de la Lance ne change ni le plafond ni les PV en le remplaçant');
  assert.equal(dune.bouclier, 1, 'la parade de la Parade demeure : changer d’arme ne la vole pas');
  assert.equal(dune.envol, false, 'Envol repart avec la Lance');
  assert.equal(dune.arme.carteId, 'takouba-des-pistes');
});

test('un bouclier coloré ne bloque pas l’attachement d’une arme alliée', () => {
  const duel = duelVide();
  const tiziri = poser(duel, 'joueur', 'tiziri-du-djurdjura');
  tiziri.protection = { contre: 'eau', toursRestants: 2 }; // protection forcée : Tiziri ne protège plus que de la Braise
  donner(duel, 'joueur', 'baton-des-citernes');
  manaPlein(duel, 'joueur');
  const res = rpgJouerArme(duel, 'joueur', 'baton-des-citernes', tiziri.id);
  assert.equal(res.ok, true);
  assert.equal(tiziri.arme.carteId, 'baton-des-citernes');
  assert.equal(tiziri.protection.contre, 'eau', 'le bouclier reste intact');
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

test('l’Armure donne +0/+4 et Contre-attaque, sans Rapidité ni immunité', () => {
  const duel = duelVide();
  const chien = poser(duel, 'joueur', 'chien-du-guet');
  equiper(duel, 'joueur', 'armure-de-cendres', chien);
  assert.equal(chien.atk, 2);
  assert.equal(chien.pv, 6);
  assert.equal(chien.contreAttaque, true);
  assert.equal(chien.rapidite, false);
  assert.equal(rpgEstProtegee(chien, 'braise'), false);
  equiper(duel, 'joueur', 'takouba-des-pistes', chien);
  assert.equal(chien.contreAttaque, false);
});

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
  const seigneur = poser(duel, 'sorcier', 'seigneur-des-machoires');
  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'armure-de-cendres');
  manaPlein(duel, 'sorcier');
  const coup = choisirCarteIA(duel, 'sorcier', { rng: () => 0.5 });
  assert.equal(coup.carteId, 'armure-de-cendres');
  assert.equal(coup.cibleId, seigneur.id, 'le Seigneur, sa créature la plus précieuse, reçoit l’Armure');
  // Sans créature à équiper, l'arme attend : l'IA la garde en main.
  const duelVideTable = duelVide();
  duelVideTable.tour = 'sorcier';
  donner(duelVideTable, 'sorcier', 'armure-de-cendres');
  manaPlein(duelVideTable, 'sorcier');
  assert.equal(choisirCarteIA(duelVideTable, 'sorcier', { rng: () => 0.5 }), null);
});

test('le sorcier ne peut pas activer le Bâton', () => {
  const duel = duelVide();
  const dune = poser(duel, 'sorcier', 'dune-marchante');
  equiper(duel, 'sorcier', 'baton-des-citernes', dune);
  assert.equal(serpents(duel, 'sorcier').length, 4);
  duel.tour = 'sorcier';
  assert.equal(rpgSorcierActiverArmes(duel).length, 0);
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

// ── La Hache de la banquise : le prix de l'attachement ─────────────────────

test('la Hache de la banquise mord son porteur (1 dégât) puis le renforce de +2/+0 sans parade', () => {
  const duel = duelVide();
  const dune = poser(duel, 'joueur', 'dune-marchante'); // 2/4
  equiper(duel, 'joueur', 'hache-de-la-banquise', dune);
  assert.equal(dune.atk, 4, '2 + 2 d’attaque');
  assert.equal(dune.def, 3, 'la Hache ne change pas la défense : la morsure, elle, suit les PV');
  assert.equal(dune.pv, 3, 'elle a d’abord mordu son porteur : 4 − 1');
  assert.equal(dune.pvMax, 4, 'la morsure est une blessure, pas une amputation du maximum');
  assert.equal(dune.bouclier, 0, 'la Hache ne donne pas de bouclier');
  assert.equal(dune.arme.carteId, 'hache-de-la-banquise');
  // La parade ne prévient pas les dégâts : seul un sort la fait tomber.
  rpgBlesserCreature(duel, 'joueur', dune.id, 2, 'braise', null, 'magie');
  assert.equal(dune.bouclier, 0);
  assert.equal(dune.pv, 1, 'les 2 dégâts passent : 3 − 2');
});

test('remplacer la Hache ne soigne pas sa morsure', () => {
  const duel = duelVide();
  const dune = poser(duel, 'joueur', 'dune-marchante');
  equiper(duel, 'joueur', 'hache-de-la-banquise', dune);
  assert.equal(dune.bouclier, 0);
  equiper(duel, 'joueur', 'takouba-des-pistes', dune); // la Hache tombe au cimetière
  assert.equal(dune.bouclier, 0, 'sans la Hache, plus de bouclier');
  assert.equal(dune.atk, 4, '2 de la Dune + 2 de la Takouba, la Hache est repartie');
  assert.equal(dune.pv, 3, 'la blessure de la morsure, elle, ne se soigne pas');
  assert.ok(duel.joueur.cimetiere.includes('hache-de-la-banquise'));
});

test('les armes ont deux compteurs, sauf celles qui donnent Attaque ciblée', () => {
  const duel = duelVide();
  const porteur = poser(duel, 'joueur', 'chien-du-guet');
  equiper(duel, 'joueur', 'baton-des-citernes', porteur);
  assert.equal(porteur.arme.durabilite, 2);
  equiper(duel, 'joueur', 'armure-de-cendres', porteur);
  assert.equal(porteur.arme.durabilite, 2, 'un remplacement repart avec deux compteurs');
  equiper(duel, 'joueur', 'lance-de-givre', porteur);
  assert.equal(porteur.arme.durabilite, 1, 'l’Attaque ciblée ne donne qu’un compteur');
});

test('l’Attaque ciblée use son unique compteur et détruit l’arme après l’attaque', () => {
  const duel = duelVide();
  const porteur = poser(duel, 'joueur', 'chien-du-guet');
  equiper(duel, 'joueur', 'javelot-du-beffroi', porteur);
  porteur.ready = true;
  assert.equal(rpgAttaquerSorcier(duel, 'joueur', porteur.id).ok, true);
  assert.equal(porteur.arme, null);
  assert.ok(duel.joueur.cimetiere.includes('javelot-du-beffroi'));
  assert.equal(porteur.coupRapide, false, 'le porteur perd Attaque ciblée avec l’arme détruite');
});

test('le compteur d’une arme baisse à l’attaque et à la défense, puis détruit l’arme à zéro', () => {
  const duel = duelVide();
  const bloqueur = poser(duel, 'sorcier', 'dune-marchante');
  const attaquant1 = poser(duel, 'joueur', 'chien-du-guet');
  attaquant1.ready = true;
  equiper(duel, 'sorcier', 'baton-des-citernes', bloqueur);
  assert.equal(bloqueur.arme.durabilite, 2);

  const premier = rpgLancerAttaque(duel, 'joueur', [attaquant1.id], { [attaquant1.id]: [bloqueur.id] });
  assert.equal(premier.ok, true);
  assert.equal(bloqueur.arme.durabilite, 1, 'bloquer coûte un compteur après le combat');

  const attaquant2 = poser(duel, 'joueur', 'chien-du-guet');
  attaquant2.ready = true;
  duel.attaqueJouee = null; // seconde résolution de combat dans ce test
  const second = rpgLancerAttaque(duel, 'joueur', [attaquant2.id], { [attaquant2.id]: [bloqueur.id] });
  assert.equal(second.ok, true);
  assert.equal(bloqueur.arme, null, 'l’arme est détruite quand son compteur tombe à zéro');
  assert.ok(duel.sorcier.cimetiere.includes('baton-des-citernes'));
  assert.equal(bloqueur.atk, 2, 'le bonus d’attaque de l’arme a disparu');
});

test('un porteur qui succombe à la morsure ne porte rien : l’arme tombe avec lui', () => {
  const duel = duelVide();
  const ghul = poser(duel, 'joueur', 'ghul-des-cendres'); // 2/1
  assert.equal(ghul.pv, 1);
  donner(duel, 'joueur', 'hache-de-la-banquise');
  manaPlein(duel, 'joueur');
  const res = rpgJouerArme(duel, 'joueur', 'hache-de-la-banquise', ghul.id);
  assert.equal(res.ok, true, 'l’attachement a bien eu lieu — puis la morsure a suivi');
  assert.equal(duel.joueur.creatures.length, 0, 'le porteur meurt de la morsure');
  assert.ok(duel.joueur.cimetiere.includes('ghul-des-cendres'));
  assert.ok(duel.joueur.cimetiere.includes('hache-de-la-banquise'),
    'l’arme rejoint le cimetière avec le porteur qu’elle a tué');
  assert.equal(duel.joueur.main.includes('hache-de-la-banquise'), false, 'elle a quitté la main');
});

test('l’IA ne confie pas la Hache à un porteur qui mourrait de sa morsure', () => {
  const duel = duelVide();
  const ghul = poser(duel, 'sorcier', 'ghul-des-cendres'); // 2/1
  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'hache-de-la-banquise');
  manaPlein(duel, 'sorcier');
  const choix = choisirCarteIA(duel, 'sorcier', () => 0.5);
  assert.equal(choix?.carteId === 'hache-de-la-banquise' ? choix.cibleId : null, null,
    'aucune cible : le Ghul ne survivrait pas au dégât de l’attachement');
  assert.equal(ghul.pv, 1, 'et personne n’a été blessé');
});
