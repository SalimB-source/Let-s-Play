import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

// Comparer les mêmes faces avec et sans le réglage PC dans un vrai navigateur.
const fichiers = ['rpg-battle.css', 'rpg-mobile.css', 'rpg-mana-essai.css', 'effet-icons.css', 'rpg-moba.css'];
const feuilles = await Promise.all(fichiers.map((nom) => readFile(new URL(`../src/games/${nom}`, import.meta.url), 'utf8')));
const debut = feuilles.at(-1).lastIndexOf('/* Sur ordinateur, agrandir les chiffres');
assert.ok(debut >= 0, 'réglage PC présent');
const cssAvant = [...feuilles.slice(0, -1), feuilles.at(-1).slice(0, debut)].join('\n');
const cssApres = feuilles.join('\n');
const valeurs = '<span class="rpg-stat-icon">⚔</span><span class="rpg-stat-value">12</span>';
const pied = `<footer class="rpg-card__foot"><span class="rpg-card__stat--atk">${valeurs}</span><span class="rpg-card__pt">${valeurs}</span></footer>`;
const main = `<span class="rpg-hand__stats"><span class="rpg-hand__stat">${valeurs}</span><span class="rpg-hand__stat">${valeurs}</span></span>`;
const html = `<div class="rpg-battle" data-scene="duel"><div class="card-table"><div class="card-row"><button class="rpg-card rpg-card--img">${pied}</button><span class="rpg-card-stack"><button class="rpg-card rpg-card--img">${pied}</button></span></div><button class="rpg-hand__card rpg-hand__card--img rpg-hand__card--type-creature">${main}</button></div></div><div class="rpg-battle rpg-battle--moba"><div class="moba"><div class="moba__slots"><div class="moba__real-slot"><button class="rpg-card rpg-card--img">${pied}</button></div></div><button class="moba__real-hand rpg-hand__card rpg-hand__card--img rpg-hand__card--type-creature">${main}</button></div></div>`;
const browser = await chromium.launch({ ...(process.env.RPG_TEST_CHROMIUM ? { executablePath: process.env.RPG_TEST_CHROMIUM } : {}), headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({ viewport: mobile ? { width: 844, height: 390 } : { width: 1440, height: 900 }, hasTouch: mobile, isMobile: mobile });
    const mesurer = async (css) => {
      await page.setContent(html);
      await page.addStyleTag({ content: css });
      await page.addStyleTag({ content: '.rpg-card, .rpg-hand__card { width: 100px !important; height: 140px !important; position: relative !important; }' });
      return page.locator('.rpg-card__stat--atk, .rpg-card__pt, .rpg-hand__stat').evaluateAll((nodes) => nodes.map((node) => {
        const carte = node.closest('.rpg-card, .rpg-hand__card').getBoundingClientRect();
        const rect = node.getBoundingClientRect();
        return { size: parseFloat(getComputedStyle(node).fontSize), dedans: rect.left >= carte.left - 1 && rect.right <= carte.right + 1 && rect.top >= carte.top - 1 && rect.bottom <= carte.bottom + 1 };
      }));
    };
    const avant = await mesurer(cssAvant), apres = await mesurer(cssApres);
    assert.equal(apres.length, 10);
    apres.forEach((stat, i) => {
      if (mobile) assert.equal(stat.size, avant[i].size, `mobile ${i} inchangé`);
      else assert.ok(stat.size > avant[i].size, `PC ${i} : ${avant[i].size} → ${stat.size}`);
      assert.ok(stat.dedans, `${mobile ? 'mobile' : 'PC'} ${i} reste dans la carte`);
    });
    await page.close();
  }
  console.log('ATQ/DÉF : agrandis sur PC, inchangés au tactile, contenus dans les faces Duel et MOBA.');
} finally { await browser.close(); }
