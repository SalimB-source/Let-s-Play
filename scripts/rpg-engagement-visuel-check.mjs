import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const probe = { name: 'engagement-probe', enforce: 'pre', transform(code, id) {
  if (id.endsWith('RpgMobaBoard.jsx')) {
    const ancre = '  const [version, redraw] = useReducer((n) => n + 1, 0);';
    if (!code.includes(ancre)) throw Error('sonde Conquête introuvable');
    return code.replace(ancre, `${ancre}\n window.__etatTest = duel; window.__forceTest = redraw;`);
  }
  if (id.endsWith('RpgDuelPage.jsx')) {
    const ancre = '  const duel = duelRef.current;';
    if (!code.includes(ancre)) throw Error('sonde duel introuvable');
    return code.replace(ancre, `${ancre}\n window.__etatTest = duel; window.__forceTest = force;`);
  }
  return null;
} };
/** Le filtre ne doit pas atteindre la carte, ses icônes ou ses valeurs.
 *  `gris` dit ce qu'on attend du portrait : vrai pour le mal d'invocation (il
 *  reste marqué), faux pour l'engagement (il ne marque plus rien). */
async function verifierIllustration(carte, gris) {
  const infos = await carte.evaluate((el) => {
    const portrait = el.matches('.rpg-card') ? el.querySelector(':scope > .rpg-card__img') : el.querySelector(':scope > img');
    const elements = [...el.querySelectorAll('.rpg-card-icone, .rpg-effet-icone, .rpg-card__stat--atk, .rpg-card__pt, .rpg-card-element-badge, .moba__slot-label')];
    return { portrait: portrait && getComputedStyle(portrait).filter, carte: getComputedStyle(el).filter,
      indicateurs: elements.map((item) => getComputedStyle(item).filter) };
  });
  assert.ok(infos.portrait !== null, 'portrait présent');
  if (gris) assert.match(infos.portrait, /grayscale\(1\)/, 'portrait entièrement grisé');
  else assert.doesNotMatch(infos.portrait, /grayscale/, 'portrait en couleur : aucun signe d’engagement');
  assert.doesNotMatch(infos.carte, /grayscale/, 'carte non désaturée');
  assert.ok(infos.indicateurs.length, 'indicateurs présents');
  for (const filtre of infos.indicateurs) assert.doesNotMatch(filtre, /grayscale/, 'icône ou valeur en couleur');
}

const server = await createServer({ configFile: false, plugins: [probe, (await import('@vitejs/plugin-react')).default()], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
let browser;
try {
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.RPG_TEST_CHROMIUM || undefined, args: ['--no-sandbox'] });
  for (const [width, height, autonome] of [[1440, 900, false], [844, 390, false], [844, 390, true]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`${base}/scripts/rpg-moba-plateau-visuel.html?test${autonome ? '&autonome' : ''}`);
    await page.locator('.moba__mulligan .moba__primary').click();
    const ids = await page.evaluate(async () => {
      const m = await import('/src/games/rpgMobaLocal.js'); const d = window.__etatTest;
      d.joueur.main = ['ashigaru-des-braises']; d.moba.creaturesJouees.joueur = false;
      const a = m.rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
      d.joueur.main = ['ashigaru-des-braises']; d.moba.creaturesJouees.joueur = false;
      const b = m.rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', 'left', 1).entite;
      if (!a || !b) throw Error('pose impossible');
      a.attaquee = true; a.malInvocation = false; a.defenseur = true;
      b.attaquee = false; b.malInvocation = true; b.rapidite = false;
      d.moba.creaturesJouees.joueur = false; d.joueur.main = ['anqa-des-braises']; window.__forceTest();
      return [a.id, b.id];
    });
    const select = (id) => page.locator(`[data-moba-entity="${id}"] .moba__slot`).first();
    const a = select(ids[0]), b = select(ids[1]);
    await a.waitFor({ state: 'attached' });
    // L'engagement ne se voit plus ; le mal d'invocation, si.
    await verifierIllustration(a, false);
    await verifierIllustration(b, true);
    assert.ok(await a.evaluate(el => el.classList.contains('is-attacked')));
    assert.ok(await b.evaluate(el => el.classList.contains('is-summoning-sick')));
    assert.equal(await a.evaluate(el => el.dataset.combatTilted ?? 'false'), 'false',
      'une créature engagée reste droite');
    await page.waitForTimeout(800);
    const tailles = await Promise.all([a, b].map(c => c.evaluate(el => ({ width: el.offsetWidth, height: el.offsetHeight, scale: getComputedStyle(el).scale }))));
    assert.ok(Math.abs(tailles[0].width - tailles[1].width) < 1 && Math.abs(tailles[0].height - tailles[1].height) < 1);
    assert.notEqual(tailles[0].scale, '1.1');
    await page.locator('.moba__hand-cards .moba__card').first().click();
    assert.equal(await a.isDisabled(), true, 'engagée non sélectionnable pour le sacrifice');
    assert.equal(await b.isDisabled(), false, 'mal d’invocation ne bloque pas le sacrifice');
    await page.evaluate(() => { const d = window.__etatTest; d.joueur.creatures.forEach(e => { e.attaquee = false; e.malInvocation = false; }); window.__forceTest(); });
    for (const c of [a, b]) await verifierIllustration(c, false);
    await page.close(); console.log(`${width}×${height} Conquête ${autonome ? 'autonome' : 'partagé'} : états, taille et sacrifice vérifiés`);
  }
  for (const [width, height] of [[1440, 900], [844, 390]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.addInitScript(() => { Math.random = () => .425; });
    await page.goto(`${base}/scripts/rpg-plateau-visuel.html?split`);
    await page.getByRole('button', { name: 'Deck', exact: true }).click();
    await page.locator('.rpg-deck-choice__button').first().click();
    await page.locator('.rpg-deck-detail__play').click();
    await page.getByRole('button', { name: 'Garder cette main', exact: true }).click();
    await page.locator('.rpg-mulligan').waitFor({ state: 'detached' });
    const ids = await page.evaluate(async () => {
      const m = await import('/src/games/rpgDuel.js'), d = window.__etatTest;
      for (const c of Object.keys(d.joueur.mana)) d.joueur.mana[c] = 30;
      d.joueur.main = ['ashigaru-des-braises']; d.joueur.invocationNormaleJouee = false;
      const a = m.rpgJouerCreature(d, 'joueur', 'ashigaru-des-braises').entite;
      d.joueur.main = ['ashigaru-des-braises']; d.joueur.invocationNormaleJouee = false;
      const b = m.rpgJouerCreature(d, 'joueur', 'ashigaru-des-braises').entite;
      if (!a || !b) throw Error('pose impossible');
      a.attaquee = true; a.malInvocation = false; a.defenseur = true;
      b.attaquee = false; b.malInvocation = true; b.rapidite = false;
      d.joueur.invocationNormaleJouee = false; d.joueur.main = ['anqa-des-braises']; window.__forceTest();
      return [a.id, b.id];
    });
    const a = page.locator(`[data-entity-id="${ids[0]}"]`), b = page.locator(`[data-entity-id="${ids[1]}"]`);
    await a.waitFor({ state: 'attached' }); await b.waitFor({ state: 'attached' });
    await verifierIllustration(a, false);
    await verifierIllustration(b, true);
    assert.equal(await a.evaluate(el => el.dataset.combatTilted ?? 'false'), 'false',
      'attaquer ne penche plus la carte une fois l’assaut résolu');
    await page.waitForTimeout(800);
    const tailles = await Promise.all([a,b].map(c => c.evaluate(el => ({ width: el.offsetWidth, height: el.offsetHeight, scale: getComputedStyle(el).scale }))));
    assert.ok(Math.abs(tailles[0].width - tailles[1].width) < 1 && Math.abs(tailles[0].height - tailles[1].height) < 1);
    assert.notEqual(tailles[0].scale, '1.1');
    await page.locator('.rpg-hand__card[data-card-id="anqa-des-braises"]').first().click();
    await page.locator('.rpg-sacrifice-choix__sacrifier').click();
    assert.equal(await a.evaluate(el => el.classList.contains('is-sacrifice-target')), false);
    assert.equal(await b.evaluate(el => el.classList.contains('is-sacrifice-target')), true);
    const terrain = await page.evaluate(() => {
      const carte = document.createElement('div'); carte.className = 'rpg-terrain is-tapped'; carte.style.transition = 'none';
      carte.innerHTML = '<img alt=""><span>Terrain</span>';
      document.querySelector('.card-table').append(carte);
      const engage = getComputedStyle(carte).filter;
      carte.classList.remove('is-tapped');
      const degage = getComputedStyle(carte).filter;
      carte.remove(); return { engage, degage };
    });
    assert.match(terrain.engage, /grayscale\(1\)/);
    assert.doesNotMatch(terrain.degage, /grayscale\(1\)/);
    await page.close(); console.log(`${width}×${height} duel : états, taille et sacrifice vérifiés`);
  }
} finally { if (browser) await browser.close(); await server.close(); }
