import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const duel = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const moba = readFileSync(new URL('../src/games/RpgMobaBoard.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');

test('duel et PvP déclenchent une seule secousse sur les nouveaux impacts de combat', () => {
  assert.match(duel, /animationsCombatNouvelles = \(duel\.combatAnimations \?\? \[\]\)\s*\.filter\(\(animation\) => !avant\.combatAnimationIds\?\.has\(animation\.id\)\)/);
  assert.match(duel, /if \(!mouvementReduit && \(impactsCombat\.size > 0\s*\|\| animationsCombatNouvelles\.some\(\(animation\) => animation\.type === 'choc-creatures'\)\)\)\s*\{\s*declencherImpactEcran\('combat'\)/);
  assert.match(duel, /impactEcran && impactEcran\.mode !== 'combat'/, 'aucun son de sorcier ajouté au choc de créatures');
  assert.match(duel, /impactEcran\?\.mode === 'received' \? ` rpg-screen-hit--/, 'aucun flash rouge sur un choc de créatures');
  assert.match(moba, /animation\.id > avantDestructions\.animationSeq && animation\.type === 'choc-creatures'/);
});

test('la secousse suit la vitesse, redémarre et respecte le mouvement réduit', () => {
  for (const variante of ['a', 'b']) {
    assert.match(css, new RegExp(`\\.card-table\\.rpg-combat-screen-shake--${variante},\\s*\\.moba__surface\\.rpg-combat-screen-shake--${variante}\\s*\\{[^}]*rpg-screen-shake-${variante} calc\\(\\.56s \\* var\\(--rpg-anim-scale, 1\\)\\)[^}]*calc\\(\\.18s \\* var\\(--rpg-anim-scale, 1\\)\\)`, 's'));
    assert.match(css, new RegExp(`\\.rpg-battle\\.is-reduced \\.card-table\\.rpg-combat-screen-shake--${variante}`));
    assert.match(css, new RegExp(`\\.rpg-battle\\.is-reduced \\.moba__surface\\.rpg-combat-screen-shake--${variante}`));
  }
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.card-table\.rpg-combat-screen-shake--a[^}]*\.moba__surface\.rpg-combat-screen-shake--b[^}]*animation: none !important/s);
  assert.match(duel, /mode === 'combat' \? dureeAnimation\(900\) : 900/);
  assert.match(moba, /effacerSecousseEcran\(\)/);
});
