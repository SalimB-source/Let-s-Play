import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const css = postcss.parse(readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8'));
const rule = (selector) => {
  const found = [];
  css.walkRules((r) => { if (r.selectors?.includes(selector)) found.push(r); });
  assert.ok(found.length, `règle absente : ${selector}`);
  return found;
};
const declarations = (r) => Object.fromEntries(r.nodes.filter((n) => n.type === 'decl').map((n) => [n.prop, n.value]));

test('le violet prime sur le halo mythique sans remplacer le filet du Lien', () => {
  const ambush = rule('.rpg-hand__card.is-playable.is-special-ambush.is-mythique-jouable').at(-1);
  const values = declarations(ambush);
  assert.equal(values['--rpg-play-halo'], '163, 91, 255');
  assert.equal(values['--rpg-play-halo-clair'], '200, 155, 255');
  assert.equal(values.outline, undefined);
  assert.ok(ambush.source.start.line > rule('.rpg-hand__card.is-mythique-jouable.is-playable')[0].source.start.line);
  assert.match(declarations(rule('.rpg-hand__card.is-lien-actif')[0]).outline, /solid/);
});

test('survol, animation et mouvement réduit utilisent les couleurs du halo', () => {
  for (const selector of [
    '.rpg-hand__card.is-playable',
    '.rpg-hand__card.is-playable:hover:not(:disabled)',
    '.rpg-hand__card.is-mythique-jouable.is-playable',
    '.rpg-hand__card.is-mythique-jouable.is-playable:hover:not(:disabled)',
  ]) {
    const shadows = rule(selector).map(declarations).map((d) => d['box-shadow']).filter(Boolean);
    assert.ok(shadows.length, `halo absent : ${selector}`);
    for (const shadow of shadows) assert.match(shadow, /var\(--rpg-play-halo/);
  }
  const keyframes = [];
  css.walkAtRules('keyframes', (r) => { if (r.params === 'rpg-mythique-halo-pulse') keyframes.push(r); });
  assert.equal(keyframes.length, 1);
  for (const frame of keyframes[0].nodes) assert.match(declarations(frame)['box-shadow'], /var\(--rpg-play-halo/);
});
