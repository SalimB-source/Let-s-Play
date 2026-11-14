// Vérifie la cascade réelle et les priorités d'état, y compris le rendu MOBA autonome.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const css = ['rpg-battle.css', 'rpg-moba.css'].map((file) => readFileSync(new URL(`../src/games/${file}`, import.meta.url), 'utf8')).join('\n');
const browser = await chromium.launch({ executablePath: process.env.RPG_TEST_CHROMIUM || undefined, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  await page.setContent(`<style>${css}</style>
    <div class="rpg-battle" style="--yellow:#ffd619">
      <button class="rpg-card is-pret is-mythique-creature" id="posee"></button>
      <button class="rpg-card is-pret is-mythique-creature is-furie" id="furie"></button>
      <button class="rpg-card is-pret" id="commune"></button>
      <button class="rpg-card is-pret is-mythique-creature is-declared-attacker" id="attaque"></button>
      <button class="rpg-card is-pret is-mythique-creature is-ciblable" id="cible"></button>
      <button class="rpg-hand__card is-playable is-mythique-creature" id="main"></button>
      <button class="rpg-hand__card is-playable is-special-ambush is-mythique-creature" id="speciale"></button>
      <button class="rpg-hand__card is-playable is-special-ambush" id="autre"></button>
      <div class="moba"><div class="moba__hand-cards">
        <button class="moba__card moba__real-hand rpg-hand__card is-playable is-special-ambush is-mythique-creature" id="moba-partage"></button>
        <button class="moba__card is-special-ambush is-mythique-creature" id="moba-autonome"></button>
        <button class="moba__card is-special-ambush" id="moba-autre"></button>
      </div></div>
    </div>`);
  const styles = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[id]')].map((el) => {
    const s = getComputedStyle(el);
    return [el.id, { shadow: s.boxShadow, halo: s.getPropertyValue('--rpg-play-halo').replaceAll(' ', ''), animation: s.animationName }];
  })));
  for (const id of ['posee', 'furie']) assert.match(styles[id].shadow, /130, 220, 255/, `${id} : créature prête sans or`);
  assert.match(styles.commune.shadow, /255, 214, 25/, 'les autres raretés gardent leur indicateur');
  assert.match(styles.attaque.shadow, /255, 83, 76/, 'une attaque déclarée garde sa lueur rouge');
  assert.match(styles.cible.shadow, /91, 240, 218/, 'une cible conserve sa lueur de ciblage');
  assert.equal(styles.main.halo, '0,180,255', 'la pose normale reste bleue');
  for (const id of ['speciale', 'moba-partage', 'moba-autonome']) {
    assert.equal(styles[id].halo, '154,100,240', `${id} : invocation spéciale violette, non dorée`);
    assert.equal(styles[id].animation, 'none', `${id} : respect du mouvement réduit`);
  }
  for (const id of ['autre', 'moba-autre']) assert.equal(styles[id].halo, '255,152,14', `${id} : signal spécial ordinaire inchangé`);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const id of ['speciale', 'moba-partage', 'moba-autonome']) {
    assert.equal(await page.locator(`#${id}`).evaluate((el) => getComputedStyle(el).animationName), 'rpg-mythique-halo-pulse', `${id} : le signal spécial reste animé`);
  }
  console.log('Lueurs des créatures mythiques vérifiées sur table et en main, en duel et MOBA.');
} finally { await browser.close(); }
