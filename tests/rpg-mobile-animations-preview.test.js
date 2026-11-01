import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');

test('sur mobile les présentations automatiques ne couvrent pas le plateau', () => {
  assert.match(css, /\.rpg-battle--touch \.rpg-auto-preview\s*\{\s*display:\s*none;/);
  assert.match(css, /\.rpg-battle--touch \.rpg-spell-played-stack\s*\{[^}]*width:\s*1px;[^}]*height:\s*1px;[^}]*clip-path:\s*inset\(50%\)/s);
  assert.match(page, /role="status"\s+aria-label=\{contre/);
  assert.match(page, /\{apercuAnnonceOuvert && \(/, 'la fenêtre de réponse reste disponible');
  assert.match(page, /\{apercuAppui && <ApercuCarteAppuiLong/, 'l’aperçu volontaire reste disponible');
});

test('la barre de fin de tour est plus courte sur mobile sans réduire la cible tactile', () => {
  assert.match(css, /\.rpg-battle--touch \.rpg-fin-tour\s*\{[^}]*width:\s*min\(220px,\s*100%\);[^}]*justify-self:\s*end;/s);
  assert.match(css, /\.rpg-annonce-sort__compact-pass\s*\{\s*min-height:\s*44px;/);
  assert.match(page, /className="rpg-annonce-sort__compact rpg-fin-tour"[\s\S]*?onClick=\{\(\) => \{ jouerSfx\('pass'\); passerFinTourSorcier\(\); \}\}/);
});
