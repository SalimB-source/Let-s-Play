import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const read = (file) => readFileSync(new URL(`../src/games/${file}`, import.meta.url), 'utf8');
const css = postcss.parse(read('rpg-battle.css'));
const moba = postcss.parse(read('rpg-moba.css'));
const rules = (sheet, selector) => {
  const found = [];
  sheet.walkRules((r) => { if (r.selectors?.includes(selector)) found.push(r); });
  assert.ok(found.length, `règle absente : ${selector}`);
  return found;
};
const declarations = (r) => Object.fromEntries(r.nodes.filter((n) => n.type === 'decl').map((n) => [n.prop, n.value]));

test('une invocation spéciale jouable partage exactement le halo mythique, y compris au survol et en mouvement réduit', () => {
  const special = rules(css, '.rpg-hand__card.is-special-ambush.is-playable');
  const mythique = rules(css, '.rpg-hand__card.is-mythique-jouable.is-playable');
  assert.deepEqual(special, mythique);
  const values = declarations(special[0]);
  assert.equal(values['--rpg-play-halo'], '255, 152, 14');
  assert.equal(values['--rpg-play-halo-clair'], '255, 214, 120');
  assert.match(values.animation, /rpg-mythique-halo-pulse/);
  assert.equal(values.outline, undefined);
  assert.ok(special.some((r) => r.parent.name === 'media' && r.parent.params.includes('prefers-reduced-motion')));
  assert.deepEqual(rules(css, '.rpg-hand__card.is-special-ambush.is-playable:hover:not(:disabled)'), rules(css, '.rpg-hand__card.is-mythique-jouable.is-playable:hover:not(:disabled)'));
  assert.match(declarations(rules(css, '.rpg-hand__card.is-lien-actif')[0]).outline, /solid/);
});

test('les deux rendus MOBA utilisent le halo doré et respectent le mouvement réduit', () => {
  const selector = '.moba .moba__hand-cards .moba__card.is-special-ambush:not(:disabled)';
  const found = rules(moba, selector);
  assert.equal(declarations(found[0])['--rpg-play-halo'], '255, 152, 14');
  assert.match(declarations(found[0]).animation, /rpg-mythique-halo-pulse/);
  assert.ok(found.some((r) => r.parent.name === 'media' && r.parent.params.includes('prefers-reduced-motion')));
  const board = read('RpgMobaBoard.jsx');
  assert.match(board, /const specialementJouable = !disabled && !defausse && !iaAgit && \['creature', 'hero'\]\.includes\(card.kind\) && rpgMobaPeutEmbuscade/);
  assert.equal((board.match(/specialementJouable \? ' is-special-ambush'/g) || []).length, 2);
  const duel = read('RpgDuelPage.jsx');
  assert.match(duel, /const embuscadeJouable = baseJouable && !groupe\.enRenvoi && estCreature\s+&& duel\.tour === 'sorcier' && duel\.fenetreReponse && reponseActive/);
});
