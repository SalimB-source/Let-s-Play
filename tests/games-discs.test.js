import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/pages/Games.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/games/games.css', import.meta.url), 'utf8');

test('les trois jeux restent accessibles et le projet à venir ne crée pas de lien', () => {
  for (const route of ['/jeu/mirage-rush', '/jeu/vice-city-rush', '/jeu/sablier-de-bab-el']) assert.ok(page.includes(route));
  assert.match(page, /id: 'projet-03'.*route: null/);
  assert.match(page, /game\.route\s*\? <Link[\s\S]*?: <div className="game-disc-link">/);
  assert.match(page, /aria-label=\{`\$\{head\.playLabel\} \$\{game\.title\}`\}/);
  assert.doesNotMatch(page, /game\.description|game-card-desc|games-page-intro/);
});

test('les disques sont ronds, en relief, adaptatifs et respectent le mouvement réduit', () => {
  assert.match(css, /\.game-disc \{[^}]*border-radius: 50%[^}]*transform: rotateX/s);
  assert.match(css, /\.game-disc__hole/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition: none/);
  assert.match(css, /\.game-disc-link:focus-visible/);
});
