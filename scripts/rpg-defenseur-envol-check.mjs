import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const probe = { name: 'defenseur-envol-probe', enforce: 'pre', transform(code, id) {
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

const server = await createServer({ configFile: false, plugins: [probe, (await import('@vitejs/plugin-react')).default()], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
let browser;
try {
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.RPG_TEST_CHROMIUM || undefined, args: ['--no-sandbox'] });
  for (const [width, height, mode] of [[1440,900,'duel'], [844,390,'duel'], [1440,900,'moba'], [844,390,'moba'], [844,390,'autonome']]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    if (mode === 'duel') {
      await page.addInitScript(() => { Math.random = () => .425; });
      await page.goto(`${base}/scripts/rpg-plateau-visuel.html?split`);
      await page.getByRole('button', { name: 'Deck', exact: true }).click();
      await page.locator('.rpg-deck-choice__button').first().click();
      await page.locator('.rpg-deck-detail__play').click();
      await page.getByRole('button', { name: 'Garder cette main', exact: true }).click();
      await page.locator('.rpg-mulligan').waitFor({ state: 'detached' });
    } else {
      await page.goto(`${base}/scripts/rpg-moba-plateau-visuel.html?test${mode === 'autonome' ? '&autonome' : ''}`);
      await page.locator('.moba__mulligan .moba__primary').click();
    }
    const ids = await page.evaluate(async (mode) => {
      const d = window.__etatTest;
      for (const c of Object.keys(d.joueur.mana)) d.joueur.mana[c] = 30;
      const m = await import(mode === 'duel' ? '/src/games/rpgDuel.js' : '/src/games/rpgMobaLocal.js');
      const jouer = (id, slot) => {
        d.joueur.main = [id];
        if (mode === 'duel') { d.joueur.invocationNormaleJouee = false; return m.rpgJouerCreature(d, 'joueur', id).entite; }
        d.moba.creaturesJouees.joueur = false;
        return m.rpgMobaJouerCreature(d, 'joueur', id, 'left', slot).entite;
      };
      const a = jouer('ashigaru-des-braises', 0), b = jouer('mousse-des-galiotes', 1);
      if (!a || !b) throw Error('pose impossible');
      a.defenseur = true; a.attaquee = true; a.malInvocation = false;
      b.envol = true; b.malInvocation = false;
      window.__forceTest();
      return [a.id, b.id];
    }, mode);
    const select = (id) => mode === 'duel' ? page.locator(`[data-entity-id="${id}"]`) : page.locator(`[data-moba-entity="${id}"] .moba__slot`).first();
    const a = select(ids[0]), b = select(ids[1]);
    await a.waitFor({ state: 'attached' }); await b.waitFor({ state: 'attached' });
    await page.waitForTimeout(750);
    const details = await Promise.all([a,b].map(c => c.evaluate(el => {
      const image = el.matches('.rpg-card') ? el.querySelector(':scope > .rpg-card__img') : el.querySelector(':scope > img');
      const css = getComputedStyle(el), img = getComputedStyle(image);
      const wrapper = el.closest('.moba__real-slot, .moba__plain-slot, .moba__ghost-slot') || el.closest('.rpg-card-stack, .rpg-card-prison') || el;
      return { defenseur: el.classList.contains('rpg-carte-bouclier'), envol: el.classList.contains('is-envol'),
        mask: img.maskImage, imageFilter: img.filter, cardFilter: css.filter, width: el.offsetWidth, height: el.offsetHeight,
        background: css.backgroundColor, wrapperZ: getComputedStyle(wrapper).zIndex,
        icons: [...el.querySelectorAll('.rpg-card-icone, .rpg-card__stat--atk, .rpg-card__pt, .moba__slot-label')].map(n => getComputedStyle(n).filter) };
    })));
    assert.equal(details[0].defenseur, true); assert.equal(details[1].defenseur, false);
    assert.equal(details[1].envol, true);
    assert.match(details[0].mask, /bouclier-defenseur\.svg|M4\.35009/); assert.equal(details[1].mask, 'none');
    assert.equal(details[0].background, 'rgba(0, 0, 0, 0)');
    assert.match(details[0].imageFilter, /grayscale\(1\)/); assert.doesNotMatch(details[0].cardFilter, /grayscale/);
    assert.ok(details[0].icons.length); for (const filtre of details[0].icons) assert.doesNotMatch(filtre, /grayscale/);
    assert.ok(Math.abs(details[0].width-details[1].width) <= 1 && Math.abs(details[0].height-details[1].height) <= 1);
    assert.equal(details[1].wrapperZ, '2');
    if (process.env.RPG_DEFENSEUR_SCREENSHOT && width === 1440 && mode === 'duel') await page.screenshot({ path: process.env.RPG_DEFENSEUR_SCREENSHOT });
    // Vérifier les pixels réellement peints, pas seulement la propriété CSS :
    // le centre rouge reste visible et les coins découvrent le fond vert.
    await page.evaluate((mode) => {
      const box = document.createElement('div'); box.dataset.maskProbe = 'true';
      box.className = mode === 'duel' ? 'rpg-battle' : 'rpg-battle moba';
      box.style.cssText = 'position:fixed;left:10px;top:10px;width:120px;height:150px;z-index:999999;background:rgb(0,255,0);overflow:hidden';
      const card = document.createElement('button');
      card.className = mode === 'autonome' ? 'moba__slot has-creature rpg-carte-bouclier' : 'rpg-card rpg-carte-bouclier';
      card.style.cssText = 'position:absolute;inset:0;width:120px;height:150px;min-width:0;max-width:none;padding:0;margin:0;border:0;animation:none;transform:none;translate:none;rotate:none;scale:1';
      const img = document.createElement('img'); img.className = 'rpg-card__img';
      img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:fill';
      img.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="150"><rect width="120" height="150" fill="red"/></svg>');
      card.append(img); box.append(card); (document.fullscreenElement ?? document.body).append(box);
    }, mode);
    const probeImage = await page.locator('[data-mask-probe]').screenshot();
    const pixels = await page.evaluate(async (base64) => {
      const img = new Image(); img.src = `data:image/png;base64,${base64}`; await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
      return [[3,3], [116,3], [60,60], [3,145], [116,145]].map(([x,y]) => [...ctx.getImageData(x,y,1,1).data]);
    }, probeImage.toString('base64'));
    for (const i of [0,1,3,4]) assert.ok(pixels[i][1] > 220 && pixels[i][0] < 30, `${mode} coin transparent : ${pixels[i]}`);
    assert.ok(pixels[2][0] > 220 && pixels[2][1] < 30, `${mode} centre peint : ${pixels[2]}`);
    await page.locator('[data-mask-probe]').evaluate(el => el.remove());
    // Deux cartes superposées, la carte au sol étant ajoutée APRES la volante :
    // l'ordre du DOM seul ne suffit donc pas. Exercer les vrais wrappers CSS.
    const superpositions = await page.evaluate((mode) => {
      const root = document.createElement('div');
      root.className = 'rpg-battle'; root.dataset.modeMana = 'essai';
      root.style.cssText = 'position:fixed;inset:0;z-index:999999;pointer-events:none';
      const parent = document.createElement('div');
      parent.className = mode === 'duel' ? 'card-row' : 'moba';
      parent.style.cssText = 'position:absolute;left:10px;top:10px;width:120px;height:120px;pointer-events:auto';
      const row = mode === 'duel' ? parent : document.createElement('div');
      if (mode !== 'duel') { row.className = 'moba__slots'; row.style.cssText = 'position:absolute;inset:0'; parent.append(row); }
      root.append(parent); (document.fullscreenElement ?? document.body).append(root);
      const kinds = mode === 'duel' ? ['direct', 'pile', 'prison'] : ['real', 'plain', 'ghost'];
      const result = [];
      for (const kind of kinds) for (const sol of kinds) {
        row.replaceChildren();
        const make = (flying, type) => {
          const card = document.createElement('button');
          card.className = (mode === 'duel' || type === 'real' ? 'rpg-card ' : '') + (mode === 'duel' ? '' : 'moba__slot has-creature ') + (flying ? 'is-envol' : '');
          card.dataset.testFlight = flying ? 'vol' : 'sol';
          card.style.cssText = 'position:absolute;inset:0;width:120px;height:120px;animation:none;transform:none;translate:none;pointer-events:auto';
          if (type === 'direct') return card;
          const wrap = document.createElement('div');
          wrap.className = ({ pile:'rpg-card-stack', prison:'rpg-card-prison', real:'moba__real-slot', plain:'moba__plain-slot', ghost:'moba__ghost-slot' })[type];
          wrap.style.cssText = 'position:absolute;inset:0;width:120px;height:120px;pointer-events:auto';
          wrap.append(card); return wrap;
        };
        row.append(make(true, kind), make(false, sol));
        const top = document.elementFromPoint(70,70)?.dataset.testFlight;
        result.push({ kind: `${kind} / ${sol}`, top, hit: document.elementFromPoint(70,70)?.outerHTML.slice(0, 200), rect: row.getBoundingClientRect().toJSON(), card: row.firstElementChild.getBoundingClientRect().toJSON(), rootCss: [getComputedStyle(root).display,getComputedStyle(root).visibility,getComputedStyle(root).zIndex,getComputedStyle(row.firstElementChild).pointerEvents,getComputedStyle(root).opacity,getComputedStyle(root).overflow,JSON.stringify(root.getBoundingClientRect().toJSON())], stack: document.elementsFromPoint(70,70).map(e=>e.className).slice(0,10) });
      }
      root.remove(); return result;
    }, mode);
    for (const { kind, top, ...extra } of superpositions) assert.equal(top, 'vol', `${mode} ${kind} : la volante doit passer devant la carte au sol ${JSON.stringify(extra)}`);
    // Les statuts peuvent être accordés puis retirés sans figer la silhouette ou le niveau.
    await page.evaluate(([a, b]) => { const d=window.__etatTest; d.joueur.creatures.find(e=>e.id===a).defenseur=false; d.joueur.creatures.find(e=>e.id===b).envol=false; window.__forceTest(); }, ids);
    assert.equal(await a.evaluate(el => el.classList.contains('rpg-carte-bouclier')), false);
    assert.equal(await b.evaluate(el => el.classList.contains('is-envol')), false);
    console.log(`${width}×${height} ${mode} : silhouette, couleur, taille, superposition et statuts dynamiques vérifiés`);
    await page.close();
  }
} finally { if (browser) await browser.close(); await server.close(); }
