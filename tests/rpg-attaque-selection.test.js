/** Choisir une créature n'est pas déclarer une attaque.
 *
 *  Cliquer une des siennes ouvre sa manœuvre : le pas d'abord, la cible
 *  ensuite. Tant qu'aucune cible n'est désignée, rien ne s'incline, aucune
 *  lueur rouge ne s'allume, et l'invite ne réclame pas de cible. Le pas, lui,
 *  referme la sélection derrière lui.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');

test('une créature choisie n’est pas un assaut déclaré', () => {
  assert.match(page,
    /declaredAttacker=\{Boolean\(\(phase && attaquants\.includes\(entite\.id\) && \(combatCollectif \|\| ciblesAttaque\[entite\.id\]\)\)/,
    'la lueur rouge et l’inclinaison attendent une cible désignée');
  assert.doesNotMatch(page, /declaredAttacker=\{Boolean\(\(phase && attaquants\.includes\(entite\.id\)\) \|\|/,
    'la simple sélection ne suffit plus');
});

test('l’invite propose le pas avant la cible', () => {
  assert.match(page, /const inviteAttaqueIndividuelle = \(\(\) => \{[\s\S]{0,900}?\}\)\(\);/);
  assert.match(page, /peutMarcher && peutFrapper\) return `\$\{nom\} — cliquez une case libre pour avancer, ou une cible pour attaquer`/);
  assert.match(page, /if \(peutMarcher\) return `\$\{nom\} — cliquez une case libre pour avancer \(aucune cible à portée\)`/,
    'une créature loin du sorcier n’est pas sommée de viser');
  assert.match(page, /if \(peutFrapper\) return 'Cliquez une cible légale pour lancer l’attaque'/);
  assert.match(page, /texte: !combatCollectif \? \(attaquants\.length\s*\? inviteAttaqueIndividuelle/,
    'la phase d’attaque individuelle affiche cette invite-là');
  assert.doesNotMatch(page, /'Cliquez une cible légale pour lancer l’attaque' : 'Choisissez une créature attaquante'/,
    'plus de réclamation de cible par défaut');
});

test('le pas referme la sélection', () => {
  assert.match(page, /const deplacerAttaquant = \(camp, index\) => \{[\s\S]{0,900}?setPhase\(false\);\s*setAttaquants\(\[\]\);\s*setCiblesAttaque\(\{\}\);/,
    'après le pas, plus rien n’est en attente');
});

test('une créature qui ne peut rien faire n’ouvre pas de phase', () => {
  assert.match(page, /if \(!combatCollectif && !deplacementsLegaux\(duel, 'joueur', entite\.id\)\.length\s*&& !rpgPeutAttaquer\(entite\)\) \{[\s\S]{0,120}?jouerSfx\('erreur'\);/);
});

test('la doc dit la même chose', () => {
  const doc = readFileSync(new URL('../docs/rpg/36-avancee.md', import.meta.url), 'utf8');
  assert.match(doc, /Choisir n'est pas déclarer/);
  assert.match(doc, /referme\s+la sélection/);
});
