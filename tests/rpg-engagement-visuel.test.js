/** L'engagement est une règle, pas une apparence.
 *
 *  Une créature qui a attaqué ne peut plus bloquer, être sacrifiée ni avancer
 *  avant le tour suivant — mais la table ne doit plus le montrer : ni portrait
 *  grisé, ni carte inclinée. Seul l'assaut lui-même (déclaration, bond) reste
 *  visible. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (chemin) => readFileSync(new URL(chemin, import.meta.url), 'utf8');
const etats = lire('../src/games/rpg-etats-cartes.css');
const battle = lire('../src/games/rpg-battle.css');
const relief = lire('../src/games/rpg-relief-visuel.css');
const page = lire('../src/games/RpgDuelPage.jsx');

test('le portrait grisé est réservé au mal d’invocation', () => {
  const sansCommentaires = etats.replace(/\/\*[\s\S]*?\*\//g, '');
  const regles = [...sansCommentaires.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .map(([, selecteur, corps]) => ({ selecteur: selecteur.trim(), corps }));
  const portraits = regles.filter(({ corps, selecteur }) => corps.includes('grayscale(1)')
    && /(rpg-card__img|> img)/.test(selecteur));
  assert.equal(portraits.length, 1, 'une seule règle grise les portraits : la table et la Conquête');
  const selecteurs = portraits[0].selecteur.split(',').map((s) => s.trim());
  assert.equal(selecteurs.length, 2, 'les deux portraits suivent la même règle');
  assert.ok(selecteurs.every((s) => s.includes('is-summoning-sick')),
    'le mal d’invocation garde son gris : la créature ne peut pas attaquer');
  assert.ok(selecteurs.every((s) => !s.includes('is-attacked')),
    'une créature engagée garde ses couleurs');
  assert.doesNotMatch(sansCommentaires, /is-attacked[^}]*filter:/,
    'aucun filtre ne vise l’engagement');
  // Le terrain engagé, lui, garde son traitement : c'est le mana dépensé.
  assert.match(etats, /\.rpg-terrain\.is-tapped \{[^}]*filter: grayscale\(1\)/);
});

test('seul l’assaut déclaré penche la carte', () => {
  assert.match(page, /data-combat-tilted=\{declaredAttacker \? 'true' : 'false'\}/,
    'l’engagement ne fait plus pencher la carte');
  assert.doesNotMatch(page, /data-combat-tilted=\{declaredAttacker \|\| entite\.attaquee/);
  assert.match(battle, /\.rpg-card\[data-combat-tilted="true"\] \{[^}]*transform: rotate\(10deg\)/,
    'la déclaration garde son inclinaison');
  // Aucune rotation ne part de `is-attacked` seul.
  const rotations = battle.match(/[^}]*is-attacked[^{]*\{[^}]*transform:[^}]*\}/g) ?? [];
  assert.equal(rotations.length, 0, 'aucune règle ne penche une créature engagée');
});

test('le bond d’attaque garde sa lueur, sans devenir un état', () => {
  assert.match(battle, /\.rpg-card\.is-attacked\.fx-lunge \{[\s\S]{0,200}rgba\(255, 83, 76/,
    'la cinématique garde son rouge');
  assert.doesNotMatch(battle, /is-attacked[^,{]*\.rpg-card__img/,
    'l’illustration n’est plus voilée par l’engagement');
  assert.match(battle, /\.rpg-card--mythique:not\(\.is-summoning-sick\) > \.rpg-card__img/,
    'la peinture mythique ne s’éteint plus après une attaque');
  assert.doesNotMatch(battle, /has-infiltration\.is-attacked/,
    'l’infiltration engagée n’a plus de traitement à part');
});

test('le relief au survol ne traite plus l’engagement comme un signal', () => {
  assert.doesNotMatch(relief, /\.is-attacked/, 'un engagement muet ne bloque plus le relief');
  assert.match(relief, /:not\(\[data-combat-tilted="true"\]\)/,
    'l’assaut déclaré, lui, reste exclu du relief');
});

test('la règle est intacte : la créature reste marquée et annoncée', () => {
  assert.match(page, /entite\.attaquee \? 'is-attacked' : ''/,
    'la classe reste posée : les autres règles s’y appuient');
  assert.match(page, /entite\.attaquee \? `, engagée, elle se dégagera au début du prochain tour/,
    'le libellé accessible dit toujours l’engagement');
  for (const chemin of ['../src/games/rpgDuel.js']) {
    const moteur = lire(chemin);
    assert.match(moteur, /attaquant\.attaquee = true/, 'attaquer engage toujours');
    assert.match(moteur, /if \(entite\.attaquee\) return \{ ok: false, raison: 'sacrifice-engage' \}/,
      'une créature engagée ne peut toujours pas être sacrifiée');
  }
});
