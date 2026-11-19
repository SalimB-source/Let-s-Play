/** L'engagement grise la carte.
 *
 *  Une créature qui a attaqué a consommé son tour : elle ne peut plus frapper,
 *  ni bloquer, ni être sacrifiée, ni avancer avant le prochain tour de son
 *  camp. La table le montre — la face se grise, comme une carte tombée — sans
 *  lui retirer un seul clic : une créature engagée reste une cible de sort.
 *
 *  Ce que l'engagement ne fait **pas** : pencher la carte (seul l'assaut
 *  déclaré penche), changer le relief au survol, ni griser l'illustration
 *  seule (là, le gris du mal d'invocation garde son sens propre).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (chemin) => readFileSync(new URL(chemin, import.meta.url), 'utf8');
const etats = lire('../src/games/rpg-etats-cartes.css');
const battle = lire('../src/games/rpg-battle.css');
const relief = lire('../src/games/rpg-relief-visuel.css');
const moba = lire('../src/games/rpg-moba.css');
const page = lire('../src/games/RpgDuelPage.jsx');
const sansCommentaires = (texte) => texte.replace(/\/\*[\s\S]*?\*\//g, '');

test('la créature engagée se grise sur la table', () => {
  assert.match(sansCommentaires(etats),
    /\.rpg-card\.is-attacked:not\(\.is-down\) \{\s*filter: grayscale\(1\) brightness\(\.72\);/,
    'la face entière est grisée, comme une carte tombée');
  // Le gris ne remplace pas celui de la carte tombée, qui garde son opacité.
  assert.match(battle, /\.rpg-card\.is-down \{\s*filter: grayscale\(1\) brightness\(\.6\);\s*opacity: \.55;/,
    'une carte tombée garde son propre traitement');
});

test('le ciblage rallume la carte engagée', () => {
  const regle = sansCommentaires(etats)
    .match(/\.rpg-card\.is-attacked:is\(([^)]*)\) \{\s*filter: none;/);
  assert.ok(regle, 'une règle rend ses couleurs à la carte engagée que la table désigne');
  for (const etat of ['.is-ciblable', '.is-spell-target', '.is-coup-rapide-cible', '.is-selected', '.is-active']) {
    assert.ok(regle[1].includes(etat), `${etat} rallume la carte`);
  }
});

test('le gris de l’illustration reste réservé au mal d’invocation', () => {
  const regles = [...sansCommentaires(etats).matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .map(([, selecteur, corps]) => ({ selecteur: selecteur.trim(), corps }));
  const portraits = regles.filter(({ corps, selecteur }) => corps.includes('grayscale(1)')
    && /(rpg-card__img|> img)/.test(selecteur));
  assert.equal(portraits.length, 1, 'une seule règle grise les portraits : la table et la Conquête');
  const selecteurs = portraits[0].selecteur.split(',').map((s) => s.trim());
  assert.ok(selecteurs.every((s) => s.includes('is-summoning-sick')),
    'le mal d’invocation garde son gris, il ne parle pas de l’engagement');
  // L'engagement, lui, n'ajoute aucune règle sur l'illustration.
  assert.doesNotMatch(sansCommentaires(etats), /is-attacked[^,{}]*\.rpg-card__img/,
    'l’illustration n’est pas grisée deux fois');
  assert.match(sansCommentaires(etats), /\.rpg-terrain\.is-tapped \{[^}]*filter: grayscale\(1\)/,
    'le terrain engagé garde son traitement : c’est le mana dépensé');
});

test('le MOBA grise aussi ses créatures engagées, malgré le bouton désactivé', () => {
  assert.match(sansCommentaires(moba),
    /\.moba \.moba__real-slot \.rpg-card\.moba__slot\.is-attacked:disabled,[\s\S]{0,120}filter: grayscale\(1\)/,
    'la règle `:disabled` du slot ne rend pas ses couleurs à une créature engagée');
  assert.match(page, /entite\.attaquee \? 'is-attacked' : ''/,
    'la table du duel pose toujours la classe');
});

test('l’engagement ne penche pas la carte et ne touche pas au relief', () => {
  assert.match(page, /data-combat-tilted=\{declaredAttacker \? 'true' : 'false'\}/,
    'seul l’assaut déclaré penche');
  assert.doesNotMatch(page, /data-combat-tilted=\{declaredAttacker \|\| entite\.attaquee/);
  const rotations = battle.match(/[^}]*is-attacked[^{]*\{[^}]*transform:[^}]*\}/g) ?? [];
  assert.equal(rotations.length, 0, 'aucune règle ne penche une créature engagée');
  assert.match(battle, /\.rpg-card\.is-attacked\.fx-lunge \{[\s\S]{0,200}rgba\(255, 83, 76/,
    'le bond d’attaque garde sa lueur rouge');
  assert.doesNotMatch(relief, /\.is-attacked/, 'le relief au survol ignore l’engagement');
});

test('la règle est intacte : la créature reste marquée et annoncée', () => {
  assert.match(page, /entite\.attaquee \? `, engagée, elle se dégagera au début du prochain tour/,
    'le libellé accessible dit l’engagement');
  const moteur = lire('../src/games/rpgDuel.js');
  assert.match(moteur, /attaquant\.attaquee = true/, 'attaquer engage toujours');
  assert.match(moteur, /if \(entite\.attaquee\) return \{ ok: false, raison: 'sacrifice-engage' \}/,
    'une créature engagée ne peut toujours pas être sacrifiée');
});
