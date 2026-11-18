import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

// La géométrie des deux rangées, vérifiée sur les **vraies** feuilles : le
// piège n'était pas dans le HTML mais dans la cascade. La règle des cinq
// colonnes pose `grid-row: 1` sur toutes les cartes du champ ; une règle de
// rangée plus faible perdait, le fond se dessinait dans la rangée du front et
// une archère venait se poser sur la case d'un corps à corps.
const feuilles = ['rpg-battle', 'rpg-mobile', 'rpg-mana-essai'];
const css = feuilles.map((nom) => readFileSync(new URL(`../src/games/${nom}.css`, import.meta.url), 'utf8')).join('\n');

function plateau(cote) {
  const ligne = (l) => (l === 'front' ? 1 : 6);
  const cartes = ['front', 'fond'].map((l) => `
        <button class="rpg-card" data-ligne="${l}" data-case-essai="${ligne(l)}"
          style="--case-essai:${ligne(l)};--case-col:1"></button>`).join('');
  const cases = ['front', 'fond'].map((l) => `
        <span class="rpg-creature-slot ${l === 'front' ? 'is-front' : 'is-fond'}"
          data-ligne="${l}" data-creature-slot="${ligne(l)}" data-creature-slot-col="1"
          style="--case-col:1"></span>`).join('');
  return `
      <div class="card-row card-row--${cote}" data-lignes="true" data-front-tient="true">
        <div class="rpg-creature-slots rpg-creature-slots--${cote === 'equipe' ? 'joueur' : 'ennemi'}"
          data-lignes="true" data-front-tient="true">${cases}</div>${cartes}
      </div>`;
}

const dom = new JSDOM(`<!doctype html><html><head></head><body>
  <div class="rpg-battle" data-mode-mana="essai" data-scene="duel">
    <div class="card-table">${plateau('equipe')}${plateau('ennemi')}</div>
  </div>
</body></html>`, { pretendToBeVisual: true });
const style = dom.window.document.createElement('style');
style.textContent = css;
dom.window.document.head.appendChild(style);

const lecture = (selecteur) => {
  const element = dom.window.document.querySelector(selecteur);
  assert.ok(element, `élément introuvable : ${selecteur}`);
  const style = dom.window.getComputedStyle(element);
  return { ligne: style.gridRow, colonne: style.gridColumn, element };
};

test('chaque carte est dans la rangée de sa ligne, des deux côtés', () => {
  // Le joueur : le front est la rangée du haut, le fond celle du bas.
  assert.equal(lecture('.card-row--equipe > .rpg-card[data-ligne="front"]').ligne, '1');
  assert.equal(lecture('.card-row--equipe > .rpg-card[data-ligne="fond"]').ligne, '2');
  // Le sorcier : c'est l'inverse, son front fait face au joueur.
  assert.equal(lecture('.card-row--ennemi > .rpg-card[data-ligne="front"]').ligne, '2');
  assert.equal(lecture('.card-row--ennemi > .rpg-card[data-ligne="fond"]').ligne, '1');
});

test('les cases dessinées suivent la même géométrie que les cartes', () => {
  assert.equal(lecture('.card-row--equipe .rpg-creature-slot[data-ligne="front"]').ligne, '1');
  assert.equal(lecture('.card-row--equipe .rpg-creature-slot[data-ligne="fond"]').ligne, '2');
  assert.equal(lecture('.card-row--ennemi .rpg-creature-slot[data-ligne="front"]').ligne, '2');
  assert.equal(lecture('.card-row--ennemi .rpg-creature-slot[data-ligne="fond"]').ligne, '1');
});

test('la colonne vient de la case : deux lignes, les mêmes cinq colonnes', () => {
  for (const cote of ['equipe', 'ennemi']) {
    for (const ligne of ['front', 'fond']) {
      const { colonne, element } = lecture(`.card-row--${cote} > .rpg-card[data-ligne="${ligne}"]`);
      assert.equal(colonne, 'var(--case-col, auto)', 'la colonne est calculée depuis la case');
      assert.equal(element.style.getPropertyValue('--case-col'), '1',
        'la carte du fond garde la colonne de sa case, pas la première place libre');
    }
  }
});

test('sans le drapeau des lignes, rien de tout cela ne s’applique', () => {
  const simple = new JSDOM(`<!doctype html><div class="rpg-battle" data-mode-mana="essai">
    <div class="card-table"><div class="card-row card-row--equipe">
      <button class="rpg-card" data-case-essai="3" style="--case-essai:3"></button>
    </div></div></div>`, { pretendToBeVisual: true });
  const feuille = simple.window.document.createElement('style');
  feuille.textContent = css;
  simple.window.document.head.appendChild(feuille);
  const carte = simple.window.document.querySelector('.rpg-card');
  assert.equal(simple.window.getComputedStyle(carte).gridRow, '1', 'une seule ligne, une seule rangée');
  assert.equal(simple.window.getComputedStyle(carte).gridColumn, 'var(--case-essai, auto)');
});
