/** Le Coup critique et l'Esquive à 25 %, et le critique GARANTI contre une
 *  créature déjà blessée — demande du joueur : « 25 % pour les deux et
 *  critique garanti si la créature contre qui elle se bat est déjà blessé ».
 *
 *  Ici on ne teste que la règle : le seuil, la garantie (sans tirage) et ce
 *  qu'elle ne couvre pas (le sorcier, une cible intacte). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  RPG_COUP_CRITIQUE_CHANCE, RPG_ESQUIVE_CHANCE,
  creatureBlessee, rpgNouveauDuel, rpgReglerHasard, rpgLancerAttaque,
  rpgBlesserCreature, rpgActionsEtat,
} from '../src/games/rpgDuel.js';
import { EFFET_DEFINITIONS } from '../src/games/effetIcons.js';

const lire = (nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8');
const FICHIERS_CARTES = ['rpgCards.js', 'rpgTenebres.js', 'rpgSoleilRouge.js', 'rpgLettresDeMarque.js', 'rpgAscensionCards.js'];

/** Un duel minimal : aucune pioche, tout est posé à la main. */
function duelVide(rng = () => 0.99) {
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng });
  duel.tour = 'joueur';
  duel.mulliganFait = { joueur: true, sorcier: true };
  rpgActionsEtat(duel);
  return duel;
}

/** Combattant qui porte un Coup critique à ×2, réglable en PV. */
const combattant = (id, pv, pvMax, extra = {}) => ({
  id, carteId: 'ashigaru-des-braises', name: id,
  atk: 3, def: 1, pv, pvMax, pvMaxInitial: pvMax,
  ready: true, malInvocation: false, attaquee: false,
  coupCritique: { chance: RPG_COUP_CRITIQUE_CHANCE, fois: 2 },
  ...extra,
});

/** Attaque déclarée d'un attaquant sur un bloqueur ; renvoie le journal. */
function frapper(duel, attaquant, defenseur) {
  const combat = rpgLancerAttaque(duel, 'joueur', [attaquant.id], { [attaquant.id]: [defenseur.id] });
  assert.equal(combat.ok, true, JSON.stringify(combat));
  return duel.log.join('\n');
}

test('les deux jetons sont à 25 %', () => {
  assert.equal(RPG_COUP_CRITIQUE_CHANCE, 0.25);
  assert.equal(RPG_ESQUIVE_CHANCE, 0.25);
});

test('toutes les cartes qui portent Coup critique lancent le dé à 25 %', () => {
  for (const fichier of FICHIERS_CARTES) {
    const source = lire(fichier);
    const chances = [...source.matchAll(/coupCritique:\s*(?:Object\.freeze\()?\{?\s*chance:\s*([0-9.]+)/g)].map((m) => Number(m[1]));
    for (const chance of chances) assert.equal(chance, 0.25, `${fichier} : ${chance}`);
    // Les armes et les sorts qui le PRÊTENT portent la même valeur.
    for (const m of source.matchAll(/coupCritique:\s*(0\.\d+)/g)) assert.equal(Number(m[1]), 0.25, fichier);
  }
  const textes = FICHIERS_CARTES.map(lire).join('\n');
  assert.doesNotMatch(textes, /Coup critique(?:\s*—[^.]*?)?15 %/u, 'aucun texte n’annonce encore 15 %');
  assert.match(textes, /Coup critique — 25 %/u);
  assert.match(textes, /contre une créature déjà blessée, il est garanti/u,
    'les fiches imprimées annoncent la garantie');
  // L'Attaque ciblée garde SON 15 % de rater : ce n'est pas le critique.
  assert.match(textes, /15 % de chances de rater/u);
});

test('la description de la plaquette annonce 25 % et la garantie', () => {
  const critique = EFFET_DEFINITIONS.coupCritique;
  assert.match(critique, /25 %/);
  assert.match(critique, /déjà blessée/);
  assert.match(critique, /garanti/);
  assert.match(EFFET_DEFINITIONS.esquive(), /25 %/);
});

test('une créature déjà blessée est reconnue, le sorcier et les PV pleins non', () => {
  assert.equal(creatureBlessee({ pv: 2, pvMax: 4 }), true);
  assert.equal(creatureBlessee({ pv: 4, pvMax: 4 }), false);
  assert.equal(creatureBlessee({ pv: 2, pv: 4, pvMax: undefined }), false);
  assert.equal(creatureBlessee({ pv: 2, def: 4 }), true, 'une vieille sauvegarde sans pvMax retombe sur la DEF');
  assert.equal(creatureBlessee(null), false);
});

test('le critique est GARANTI contre une créature blessée, sans tirage', () => {
  const duel = duelVide(() => 0.99); // 0.99 : aucun dé ne passe jamais
  const attaquant = combattant('attaquant', 4, 4);
  const blesse = combattant('blesse', 4, 6);
  duel.joueur.creatures.push(attaquant);
  duel.sorcier.creatures.push(blesse);
  rpgActionsEtat(duel);
  const journal = frapper(duel, attaquant, blesse);
  assert.equal(blesse.pv, -2, '3 dégâts ×2 : la créature blessée encaisse 6');
  assert.match(journal, /Coup critique garanti : attaquant frappe 2 fois !/);
});

test('contre une créature intacte, le critique repasse par le dé à 25 %', () => {
  const jamais = duelVide(() => 0.99);
  const attaquant = combattant('attaquant', 4, 4);
  const intact = combattant('intact', 6, 6);
  jamais.joueur.creatures.push(attaquant);
  jamais.sorcier.creatures.push(intact);
  rpgActionsEtat(jamais);
  const journal = frapper(jamais, attaquant, intact);
  assert.equal(intact.pv, 3, '3 dégâts, sans critique');
  assert.doesNotMatch(journal, /Coup critique/u);

  const chanceux = duelVide(() => 0.24); // sous le seuil de 25 %
  const attaquant2 = combattant('attaquant2', 4, 4);
  const intact2 = combattant('intact2', 6, 6);
  chanceux.joueur.creatures.push(attaquant2);
  chanceux.sorcier.creatures.push(intact2);
  rpgActionsEtat(chanceux);
  const journal2 = frapper(chanceux, attaquant2, intact2);
  assert.equal(intact2.pv, 0, 'le dé à 24 % passe : 6 dégâts');
  assert.match(journal2, /Coup critique : attaquant2 frappe 2 fois !/);
  assert.doesNotMatch(journal2, /garanti/u, 'un critique tiré ne se dit pas garanti');
});

test('la garantie ne vise jamais le sorcier : une attaque directe garde son dé', () => {
  const duel = duelVide(() => 0.99);
  const attaquant = combattant('attaquant', 4, 4);
  duel.joueur.creatures.push(attaquant);
  // Un allié blessé dans le camp d'en face ne change rien : le coup part au sorcier.
  duel.sorcier.creatures.push(combattant('blesse', 4, 6));
  rpgActionsEtat(duel);
  const pvSorcier = duel.sorcier.pv;
  assert.equal(rpgLancerAttaque(duel, 'joueur', [attaquant.id], { [attaquant.id]: [] }).ok, true);
  assert.equal(duel.sorcier.pv, pvSorcier - 3, '3 dégâts, sans critique');
  assert.doesNotMatch(duel.log.join('\n'), /Coup critique/u);
});

test('l’Esquive passe à 25 % et s’ajoute entre deux sources', () => {
  const duel = duelVide(() => 0.24);
  const cible = { id: 'esquiveuse', carteId: 'onna-musha-des-cendres', name: 'Onna-musha',
    atk: 3, def: 3, pv: 3, pvMax: 3, ready: true, esquive: true, esquiveChance: RPG_ESQUIVE_CHANCE };
  duel.joueur.creatures.push(cible);
  rpgActionsEtat(duel);
  const esquive = rpgBlesserCreature(duel, 'joueur', cible.id, 1, 'braise', null, 'capacite');
  assert.equal(esquive.esquive, true, '0.24 < 0.25 : la capacité est esquivée');
  assert.equal(cible.pv, 3);

  rpgReglerHasard(duel, () => 0.25);
  const touche = rpgBlesserCreature(duel, 'joueur', cible.id, 1, 'braise', null, 'capacite');
  assert.equal(touche.esquive, false, 'au seuil exact de 25 %, l’Esquive échoue');
  assert.equal(cible.pv, 2);

  // Deux sources (fiche + arme) : 50 %, plafonné à 1.
  const source = lire('rpgDuel.js');
  assert.match(source, /chance \+= RPG_ESQUIVE_CHANCE/);
  assert.match(source, /Math\.min\(1, chance\)/);
});

test('la coque ne laisse aucun ancien 15 % sur Esquive ou Coup critique', () => {
  const docs = ['25-cartes-liees.md', '31-ascension.md']
    .map((nom) => readFileSync(new URL(`../docs/rpg/${nom}`, import.meta.url), 'utf8')).join('\n');
  assert.doesNotMatch(docs, /Esquive (?:vaut )?\*{0,2}15 %/u);
  assert.doesNotMatch(docs, /critique \*{0,2}15 %/u);
  // Les autres jets à 15 % (Attaque ciblée qui rate, gel, blocage) restent.
  const cartes = readdirSync(new URL('../src/games/', import.meta.url)).filter((f) => f.endsWith('.js'));
  assert.ok(cartes.length > 10);
});
