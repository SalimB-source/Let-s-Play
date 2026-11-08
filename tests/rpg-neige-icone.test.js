import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const lire = (chemin) => readFileSync(new URL(`../src/games/${chemin}`, import.meta.url), 'utf8');

test('le flocon de Neige est blanc, y compris dans le filtre actif', () => {
  const emblemes = lire('rpgEmblemes.jsx');
  const css = lire('rpg-deckbox.css');

  assert.match(emblemes, /neige:\s*\([\s\S]*?<g fill="none" stroke="currentColor"/, 'le flocon SVG prend sa couleur dans le style');
  assert.match(css, /\.rpg-emblem--neige\s*\{\s*color:\s*#fff\s*;/, 'le flocon est blanc');
  assert.match(css, /\.rpg-deck-filter__chip\.is-active \.rpg-emblem--neige\s*\{\s*color:\s*#fff\s*;/, 'le filtre actif ne le recolore pas');
});

test('les pierres Neige simples, hybrides et de coût affichent le SVG plutôt que l’emoji coloré', () => {
  const duel = lire('RpgDuelPage.jsx');
  const css = lire('rpg-battle.css');

  assert.match(duel, /if \(element === 'neige'\) return <ElementEmblem element="neige" \/>/);
  assert.match(duel, /<GlyphePierreElement element=\{couleur\} \/>/, 'pierre hybride');
  assert.match(duel, /<GlyphePierreElement element=\{teinte\} \/>/, 'pierre simple et coût');
  assert.match(duel, /<GlyphePierreElement element="neige" \/>/, 'coût du pouvoir de glace');
  assert.match(duel, /carte\.manaEngagement\.couleur === 'neige' \? <ElementEmblem element="neige" \/>/, 'pierre d’engagement de mana');
  assert.match(css, /\.rpg-card-element-badge__glyphe > \.rpg-emblem--neige\s*\{[^}]*width:\s*56%/);
  assert.match(css, /\.rpg-mana-cost i > \.rpg-emblem--neige\s*\{[^}]*width:\s*80%/);
});
