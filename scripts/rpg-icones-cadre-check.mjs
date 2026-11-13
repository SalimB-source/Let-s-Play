import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const server = await createServer({ configFile: false, plugins: [(await import('@vitejs/plugin-react')).default()], base: '/', server: { host: '127.0.0.1', port: 0, strictPort: false }, logLevel: 'error' });
let browser;
try {
  await server.listen();
  const port = server.httpServer.address().port;
  browser = await chromium.launch({ executablePath: process.env.RPG_TEST_CHROMIUM || undefined, args: ['--no-sandbox'] });
  for (const [width, height, touch] of [[640, 280, true], [844, 390, true], [1280, 720, false]]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: touch, hasTouch: touch });
    await page.goto(`http://127.0.0.1:${port}/scripts/rpg-icones-cadre.html`);
    await page.waitForSelector('#posee .rpg-card-icone');
    const verifier = async (id, attendu) => {
      const result = await page.locator(`#${id}`).evaluate((face) => {
        const frame = face.getBoundingClientRect();
        const colonne = face.querySelector('.rpg-card-icones');
        return {
          style: colonne.style.cssText,
          icones: [...colonne.querySelectorAll('.rpg-card-icone')].filter(el => getComputedStyle(el).display !== 'none').map(el => {
            const r = el.getBoundingClientRect();
            return { x: r.left - frame.left, y: r.top - frame.top, right: r.right - frame.left, bottom: r.bottom - frame.top, width: r.width, height: r.height };
          }),
          width: frame.width, height: frame.height,
        };
      });
      assert.equal(result.icones.length, attendu, `${id} : chaque effet reste visible`);
      for (const r of result.icones) {
        assert.ok(r.x >= -0.1 && r.y >= -0.1 && r.right <= result.width + .1 && r.bottom <= result.height + .1, `${width}×${height} ${id}: ${JSON.stringify(result)}`);
      }
      return result;
    };
    for (const [id, count] of [['posee', 4], ['activation', 4], ['main', 4], ['apercu', 10], ['catalogue', 10], ['moba', 10], ['mulligan', 10]]) await verifier(id, count);
    const avant = await verifier('posee', 4);
    assert.ok(avant.icones[0].width < 24, 'une colonne trop longue réduit les icônes');
    await page.locator('#posee').evaluate((face) => { face.style.width = '240px'; face.style.height = '300px'; });
    await page.waitForFunction(() => document.querySelector('#posee .rpg-card-icones').style.getPropertyValue('--rpg-plaque-taille') === '');
    const agrandie = await verifier('posee', 4);
    assert.ok(agrandie.icones[0].width > avant.icones[0].width, 'la taille normale revient lorsque la face grandit');
    await page.evaluate(() => window.changerEffets(1));
    const seul = await verifier('posee', 1);
    assert.ok(seul.icones[0].width >= 24, 'un seul effet garde sa taille normale');
    await page.locator('#posee').evaluate((face) => { face.style.width = '48px'; face.style.height = '60px'; });
    await page.waitForFunction(() => document.querySelector('#posee .rpg-card-icone').getBoundingClientRect().width < 13);
    const petit = await verifier('posee', 1);
    assert.ok(petit.icones[0].width <= 13, 'un seul effet ne prend pas la moitié d’une petite carte');
    await page.evaluate(() => window.changerEffets(10));
    await page.waitForFunction(() => document.querySelector('#posee .rpg-card-icones').children.length === 10);
    await verifier('posee', 10);
    await page.close();
    console.log(`${width}×${height} : table, main, aperçu, catalogue et MOBA vérifiés`);
  }
} finally {
  await browser?.close();
  await server.close();
}
