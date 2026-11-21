/** La main, au doigt, reste d'une seule pièce.
 *
 *  `RpgDuelPage.jsx` pose une cale (`.rpg-hand__ecart`) au milieu de la main :
 *  à la souris large, elle réserve la largeur du médaillon du joueur et la
 *  rangée s'ouvre en deux autour de lui. Sur un téléphone, le portrait a sa
 *  propre rangée au-dessus de la main : la cale n'y séparait plus rien, elle
 *  coupait la main en deux groupes. Elle est donc ramenée à zéro au doigt.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const portrait = readFileSync(new URL('../src/games/rpg-portrait.css', import.meta.url), 'utf8');
const plateau = readFileSync(new URL('../src/games/rpg-avatars-plateau.css', import.meta.url), 'utf8');

test('au doigt, la cale de la main ne réserve plus la largeur du médaillon', () => {
  const regle = portrait.match(/\.rpg-hand__ecart\s*\{[^}]*\}/g) ?? [];
  assert.ok(regle.length >= 1, 'la feuille debout connaît la cale');
  for (const bloc of regle) {
    assert.match(bloc, /flex: 0 0 0;/, 'la cale ne prend plus de place');
    assert.match(bloc, /width: 0;/, 'ni de largeur');
    assert.doesNotMatch(bloc, /rpg-avatar-height/, 'plus de largeur de portrait');
  }
  assert.doesNotMatch(portrait, /\.rpg-battle--touch \.rpg-hand__ecart\s*\{[^}]*flex: 0 0 calc\(/,
    'aucune cale dimensionnée ne subsiste au doigt');
});

test('à la souris large, la main s’ouvre toujours autour du médaillon', () => {
  assert.match(plateau, /:not\(\.rpg-battle--touch\) \.rpg-hand__ecart \{[^}]*flex: 0 0 calc\(var\(--rpg-avatar-plateau\) \+ 26px\);/);
});
