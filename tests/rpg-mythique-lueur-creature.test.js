import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');

test('les créatures et héros mythiques ne reçoivent plus le halo de rareté', () => {
  assert.match(page, /const estCreature = carte\.kind === 'creature' \|\| carte\.kind === 'hero';/);
  assert.match(page, /const mythiqueJouable = baseJouable && estMythique && !estCreature;/);
  assert.match(page, /embuscadeJouable \? 'is-special-ambush' : ''/);
  const dom = new JSDOM(`<style>${css}</style>
    <button class="rpg-hand__card is-playable rpg-card--mythique is-mythique-creature" id="creature"></button>
    <button class="rpg-hand__card is-playable is-mythique-jouable" id="sort"></button>
    <button class="rpg-hand__card is-playable is-mythique-creature is-special-ambush" id="speciale"></button>
    <button class="rpg-hand__card is-playable is-special-ambush" id="speciale-ordinaire"></button>`);
  try {
    const halo = id => dom.window.getComputedStyle(dom.window.document.getElementById(id)).getPropertyValue('--rpg-play-halo').replaceAll(' ', '');
    assert.equal(halo('creature'), '0,180,255');
    assert.equal(halo('sort'), '255,152,14');
    assert.equal(halo('speciale'), '154,100,240');
    assert.equal(halo('speciale-ordinaire'), '255,152,14');
  } finally { dom.window.close(); }
});

test('la créature mythique posée reste identifiée même en Furie et en MOBA', async () => {
  const [{ createServer }, React, { renderToStaticMarkup }] = await Promise.all([
    import('vite'), import('react'), import('react-dom/server'),
  ]);
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  try {
    const { TableCard } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    for (const [id, mythique, furie] of [
      ['feriel', true, false], ['maitre-du-marteau', true, true], ['chien-du-guet', false, false],
    ]) for (const cote of ['joueur', 'ennemi']) for (const moba of [null, { ariaLabel: 'Carte MOBA' }]) {
      const entite = { id, carteId: id, name: id, atk: 3, pv: 3, pvMax: 3, ready: true, malInvocation: false, furieDeclenchee: furie };
      const html = renderToStaticMarkup(React.createElement(TableCard, { entite, cote, moba }));
      const dom = new JSDOM(html);
      const face = dom.window.document.querySelector('.rpg-card');
      assert.equal(face.classList.contains('is-mythique-creature'), mythique, `${id} : statut de rareté indépendant du cadre`);
      assert.ok(face.classList.contains('is-pret'), `${id} : disponibilité conservée`);
      if (furie) assert.ok(!face.classList.contains('rpg-card--mythique'), 'la Furie garde sa face sans cadre');
      dom.window.close();
    }
    const mobaBoard = readFileSync(new URL('../src/games/RpgMobaBoard.jsx', import.meta.url), 'utf8');
    assert.match(mobaBoard, /const mythiqueCreature = \['creature', 'hero'\]\.includes\(card\.kind\) && cardRarityInfo\(card\)\.key === 'mythique';/);
    assert.equal((mobaBoard.match(/mythiqueCreature \? ' is-mythique-creature'/g) || []).length, 2, 'les deux mains MOBA distinguent la rareté');
  } finally { await vite.close(); }
});
