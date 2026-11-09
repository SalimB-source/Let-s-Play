import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const css = ['rpg-battle.css', 'rpg-mobile.css', 'rpg-mana-essai.css', 'effet-icons.css', 'rpg-moba.css']
  .map((nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8')).join('\n');

test('les repères des cartes posées en MOBA sont équilibrés sans changer la main ni le duel classique', () => {
  const face = (classe, icones = '') => `<button class="${classe}"><span class="rpg-card-element-badge is-plaque"></span><span class="rpg-hand__title"><span class="rpg-mana-cost is-plaque"></span></span><span class="rpg-card-icones rpg-card-icones--colonne ${icones}"><span class="rpg-card-icone"><svg class="rpg-effet-icone"></svg></span></span></button>`;
  const dom = new JSDOM(`<style>${css}</style><div class="rpg-battle rpg-battle--moba"><div class="moba"><div class="moba__slots"><div class="moba__real-slot">${face('rpg-card rpg-card--img moba__slot')}</div></div><div class="moba__hand-item">${face('rpg-hand__card rpg-hand__card--img moba__real-hand', 'rpg-card-icones--main')}</div></div></div><div class="rpg-battle"><div class="card-row">${face('rpg-card rpg-card--img')}</div><div class="rpg-hand">${face('rpg-hand__card rpg-hand__card--img', 'rpg-card-icones--main')}</div></div>`, {virtualConsole: new VirtualConsole()});
  try {
    const style = (selector) => dom.window.getComputedStyle(dom.window.document.querySelector(selector));
    for (const [moba, classique] of [['.moba__real-slot', '.card-row'], ['.moba__hand-item', '.rpg-hand']]) {
      const colonne = style(`${moba} .rpg-card-icones`);
      const originale = style(`${classique} .rpg-card-icones`);
      assert.equal(colonne.getPropertyValue('--rpg-plaque-taille'),
        moba === '.moba__hand-item' ? '26cqw' : 'clamp(18px,22cqw,30px)');
      if (moba === '.moba__real-slot') {
        assert.notEqual(colonne.getPropertyValue('--rpg-plaque-taille'), originale.getPropertyValue('--rpg-plaque-taille'),
          'les effets posés en MOBA ont leur propre taille, sans modifier le duel classique');
      }
      assert.equal(colonne.getPropertyValue('--rpg-plaque-bord'), originale.getPropertyValue('--rpg-plaque-bord'));
      assert.equal(colonne.transform, originale.transform);
    }
    for (const element of ['.rpg-card-element-badge', '.rpg-hand__title', '.rpg-card-icones']) {
      const marqueur = style(`.moba__hand-item ${element}`);
      assert.equal(marqueur.getPropertyValue('--rpg-plaque-taille'), '26cqw');
      assert.equal(marqueur.getPropertyValue('--rpg-cout-taille').replaceAll(' ', ''), 'calc(var(--rpg-plaque-taille)*1.12)');
    }
    const couleur = style('.moba__real-slot .rpg-card-element-badge');
    const titre = style('.moba__real-slot .rpg-card__title, .moba__real-slot .rpg-hand__title');
    const effets = style('.moba__real-slot .rpg-card-icones');
    for (const repere of [couleur, titre]) {
      assert.equal(repere.getPropertyValue('--rpg-plaque-taille'), 'clamp(16px,18cqw,26px)',
        'coût et couleur réduits sur les créatures posées');
      assert.equal(repere.getPropertyValue('--rpg-card-marker-size'), 'clamp(16px,18cqw,26px)',
        'les compteurs suivent les nouveaux repères');
      assert.equal(repere.getPropertyValue('--rpg-cout-taille').replaceAll(' ', ''),
        'calc(var(--rpg-plaque-taille)*1.12)');
    }
    assert.equal(effets.getPropertyValue('--rpg-plaque-taille'), 'clamp(18px,22cqw,30px)');
    for (const largeur of [48, 95, 132]) {
      const clamp = (min, ratio, max) => Math.min(max, Math.max(min, largeur * ratio));
      assert.ok(clamp(18, .22, 30) >= clamp(16, .18, 26) * 1.12,
        `à ${largeur}px, les effets sont au moins aussi visibles que le coût`);
    }
    assert.equal(style('.card-row .rpg-card-element-badge').getPropertyValue('--rpg-plaque-taille'),
      'clamp(24px,26cqw,52px)', 'la table classique garde ses dimensions');
    for (const [selector, marge] of [['.moba__real-slot .rpg-card', '64px'], ['.moba__hand-item .rpg-hand__card', '40px']]) {
      assert.equal(style(selector).overflow, 'clip');
      assert.equal(style(selector).getPropertyValue('overflow-clip-margin'), marge);
    }
  } finally { dom.window.close(); }
});
