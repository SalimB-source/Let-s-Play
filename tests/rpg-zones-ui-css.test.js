/**
 * La zone d'un sort, côté **styles et source** — le contrat que jsdom ne voit
 * pas.
 *
 * Les cases du champ ne sont pas des éléments ordinaires : le calque des cases
 * (`.rpg-creature-slots`) éteint les pointeurs (`pointer-events: none`) et se
 * tient **sous** les cartes (`z-index: 0` contre `1`). Une case interactive
 * doit donc, à la fois, rendre les pointeurs à elle-même et passer devant les
 * cartes. Les cases de placement (`--choix`) et de pas (`--deplacement`) font
 * cela depuis toujours ; les cases de zone l'oubliaient — le clic tombait dans
 * la rangée ou sur la créature posée, l'ancre ne se posait jamais, et les sorts
 * de zone étaient illançables. Ces tests tiennent la leçon.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/games/rpg-mana-essai.css', import.meta.url), 'utf8');
const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');

/** Les déclarations d'un sélecteur exact, ou `null`. */
function regle(selecteur) {
  const echappe = selecteur.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const trouve = new RegExp(`(?:^|\\n)${echappe}\\s*\\{([^}]*)\\}`, 'u').exec(css);
  return trouve ? trouve[1] : null;
}

test('le calque des cases éteint bien les pointeurs et passe sous les cartes', () => {
  const slots = regle('.rpg-creature-slots');
  assert.ok(slots, 'le calque des cases existe');
  assert.match(slots, /pointer-events:\s*none/u);
  assert.match(slots, /z-index:\s*0/u);
  // C'est ce couple qui oblige chaque case interactive à se reprendre : les
  // cartes de la rangée montent à `z-index: 1`, au-dessus du calque.
  assert.match(css, /\.rpg-card-stack__toggle \{ position: relative; z-index: 1; \}/u,
    'les cartes passent devant le calque des cases');
});

test('une case de zone réactive les pointeurs — sinon le clic ne l’atteint jamais', () => {
  const caseZone = regle('.rpg-creature-slot--zone-sort');
  assert.ok(caseZone, 'la case de zone a ses styles');
  assert.match(caseZone, /pointer-events:\s*auto/u, 'sans pointer-events, la case est inerte');
  assert.match(caseZone, /cursor:\s*pointer/u);
  assert.match(caseZone, /position:\s*relative/u);
  // Les autres cases interactives suivent la même règle : la zone ne peut pas
  // être la seule à l'oublier.
  for (const selecteur of ['.rpg-creature-slot--choix', '.rpg-creature-slot--deplacement']) {
    assert.match(regle(selecteur) ?? '', /pointer-events:\s*auto/u, selecteur);
  }
});

test('en désignation, le calque des cases passe devant les cartes', () => {
  const calque = regle('.card-table.is-choix-zone .rpg-creature-slots');
  assert.ok(calque, 'la table porte un état de désignation de zone');
  assert.match(calque, /pointer-events:\s*auto/u);
  const zIndex = Number(/z-index:\s*(\d+)/u.exec(calque)?.[1]);
  assert.ok(zIndex >= 2, `le calque doit passer devant les cartes (z-index ${zIndex})`);
});

test('la page ouvre l’état de zone et câble les cases', () => {
  assert.match(page, /is-choix-zone/u, 'la table signale la désignation de zone');
  assert.match(page, /zoneSortEnCours \? ' is-choix-zone' : ''/u);
  assert.match(page, /onChoisirZone=\{zoneSortEnCours/u);
  assert.match(page, /zoneSort=\{zoneSortEnCours \? \{ cases: casesZoneSort\(/u);
  // Le bandeau de validation et le renoncement sont cliquables eux aussi.
  assert.match(page, /rpg-zone-sort__valider/u);
  assert.match(page, /rpg-zone-sort__annuler/u);
});
