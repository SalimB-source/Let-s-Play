/**
 * Au lancement d'un sort, plus aucun souffle d'élément.
 *
 * Le « ressac » d'Eau tombait sur quatorze magies — y compris des hybrides
 * Sable comme la Lettre de marque — et le vent de Braise couvrait le sort
 * qu'on venait de lancer : deux nappes de bruit, entendues comme un son
 * d'interface synthétique. La page ne joue plus que le tonnerre de l'Éclair du
 * marteau, qui est le sort lui-même (`rpgSortAudio.js`).
 *
 * Ces tests figent la règle et la disparition de la vague : le nom
 * `water_wave`, son fichier et son routage ne sont plus dans le jeu.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { RPG_DUEL_CARDS, cardById } from '../src/games/rpgCards.js';
import { RPG_SFX_NAMES, rpgSfx } from '../src/games/rpgAudio.js';
import { RPG_NIVEAUX_ECHANTILLONS } from '../src/games/rpgNiveauxSons.js';
import { sonSortAuLancement } from '../src/games/rpgSortAudio.js';

const SORTS = RPG_DUEL_CARDS.filter((carte) => carte.kind === 'magie');

test('un sort ne joue plus le souffle de son élément', () => {
  // Les deux anciens souffles de sort.
  assert.equal(sonSortAuLancement(cardById('trait-de-braise')), null, 'plus de vent de Braise');
  assert.equal(sonSortAuLancement(cardById('eau-de-la-source')), null, 'plus de vague d’Eau');
  // Une hybride Sable + Eau, la carte la plus absurde à faire sonner comme une vague.
  assert.equal(sonSortAuLancement(cardById('lettre-de-marque')), null);
  assert.equal(sonSortAuLancement(cardById('grand-debarquement')), null);
  // Aucune magie du jeu ne joue de son d'élément…
  for (const sort of SORTS) {
    if (sort.id === 'eclair-du-marteau' || sort.id === 'brise-lame') continue;
    assert.equal(sonSortAuLancement(sort), null, `${sort.name} reste muet au lancement`);
  }
  // …sauf l'Éclair du marteau : son tonnerre EST le sort.
  assert.equal(sonSortAuLancement(cardById('eclair-du-marteau')), 'foudre_marteau');
  assert.equal(sonSortAuLancement(cardById('brise-lame')), 'weapon_break', 'Brise-lame joue le son de lame brisée');
  // Une carte qui n'en est pas un, ou rien du tout : silence, jamais d'erreur.
  assert.equal(sonSortAuLancement(cardById('tislit-des-aures')), null);
  assert.equal(sonSortAuLancement(null), null);
});

test('un son imposé par l’appelant est respecté', () => {
  // Le renvoi en main d'une magie garde son froissement de carte.
  assert.equal(sonSortAuLancement(cardById('ressac'), { sonForce: 'creature_return' }), 'creature_return');
  // Même sur l'Éclair du marteau, l'appelant peut trancher.
  assert.equal(sonSortAuLancement(cardById('eclair-du-marteau'), { sonForce: 'card_countered' }), 'card_countered');
});

test('la vague d’Eau a quitté le catalogue avec son fichier', () => {
  assert.equal(RPG_SFX_NAMES.includes('water_wave'), false, 'le nom n’est plus jouable');
  assert.equal(rpgSfx('water_wave'), null, 'un nom absent se tait, sans repli');
  assert.equal(RPG_NIVEAUX_ECHANTILLONS.water_wave, undefined, 'plus d’entrée dans la table des niveaux');
  assert.equal(existsSync(new URL('../src/games/assets/water-wave.wav', import.meta.url)), false,
    'water-wave.wav n’est plus livré');
  assert.equal(existsSync(new URL('../src/games/rpgWaterAudio.js', import.meta.url)), false,
    'le routage Eau des sorts est supprimé');
});

test('le souffle de Braise sert encore les créatures', () => {
  // Le retirer des sorts ne touche pas les effets de créature qui blessent :
  // une arrivée de Braise et une capacité de combat gardent leur flamme.
  assert.ok(RPG_SFX_NAMES.includes('flame_gust'));
  const tour = cardById('tour-de-braise');
  assert.equal(sonSortAuLancement(tour), null, 'ce n’est pas un sort : le module des sorts ne décide pas pour elle');
});
