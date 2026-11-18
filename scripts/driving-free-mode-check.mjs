import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--no-zygote','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:1000,height:700}});page.setDefaultTimeout(120000);
  const requests=[],errors=[];page.on('request',request=>requests.push(request.url()));page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.SCHOOL_URL||'http://localhost:5173/Let-s-Play/jeu/vice-city-rush',{waitUntil:'networkidle'});
  assert.equal(requests.some(url=>url.includes('/ViceCityFreeRoam')),false,'3D city should not load on the hub');
  const learningSave=await page.evaluate(()=>localStorage.getItem('letsplay_driving_progress_v1'));
  await page.getByRole('button',{name:'Conduite libre',exact:true}).click({noWaitAfter:true});
  const app=page.getByRole('application',{name:'Conduite libre dans Vice City',exact:true});await app.waitFor();
  await page.waitForFunction(()=>document.querySelector('.vice-free-roam-speed small')?.textContent?.includes('DÉGÂTS'));
  assert.equal(await page.locator('.vice-free-roam-world canvas').count(),1);
  assert.equal(await page.locator('.driving-top-brief').count(),0);
  assert.equal(await page.locator('.driving-side-mirrors').count(),0);
  assert.equal(await page.locator('.school-free-mode').isVisible(),true);
  // Sur téléphone, les sept actions vivent dans un tiroir refermé : on les
  // mesure après l'avoir ouvert. Sur ordinateur, la colonne historique. C'est
  // la pastille ☰ qui fait foi, pas une requête média recopiée ici : la même
  // feuille la montre en portrait étroit (max-width:650px) comme en pointeur
  // grossier, et le contrôle ne peut pas se tromper de définition.
  const isHandheld = async () => page.locator('.vice-free-roam-actions-toggle').isVisible();
  for (const viewport of [{width:1000,height:700},{width:390,height:844},{width:844,height:390}]) {
    await page.setViewportSize(viewport);
    const handheld = await isHandheld();
    if (handheld) {
      const toggle = page.locator('.vice-free-roam-actions-toggle');
      assert.equal(await toggle.isVisible(), true, 'la pastille ☰ ACTIONS est visible sur téléphone');
      const toggleRect = await toggle.boundingBox();
      assert.ok(toggleRect.x + toggleRect.width <= viewport.width + 1, 'la pastille tient dans la fenêtre');
      assert.ok(toggleRect.x + toggleRect.width > viewport.width / 2, 'la pastille reste à droite');
      // D'abord le refermer pour vérifier l'état au repos, puis l'ouvrir.
      if ((await page.getAttribute('#vice-free-roam-actions', 'class')).includes('is-open')) await toggle.click();
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.vice-free-roam-actions')).visibility === 'hidden');
      assert.equal(await page.locator('.vice-free-roam-actions').evaluate(el => getComputedStyle(el).visibility), 'hidden', 'tiroir refermé au repos');
      assert.equal(await page.getAttribute('.vice-free-roam-actions-toggle', 'aria-expanded'), 'false');
      await toggle.click();
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.vice-free-roam-actions')).visibility === 'visible', null, { timeout: 5000 });
      // Un tap sur la ville referme le tiroir sans viser une pastille.
      await page.locator('.vice-free-roam-actions').waitFor({ state: 'visible' });
    }
    // Les sept actions du tiroir / de la colonne : toutes visibles et
    // entièrement dans la fenêtre. Sur ordinateur, la colonne de 112 px garde
    // ses x égaux et ses y séparés — l'invariant historique, au pixel. Sur
    // téléphone, le tiroir les range en deux colonnes tactiles.
    const buttons=await page.locator('.vice-free-roam-actions>button').evaluateAll(els=>els.filter(el=>getComputedStyle(el).display!=='none').map(el=>{
      const rect=el.getBoundingClientRect();return {text:el.textContent.trim(),x:rect.x,y:rect.y,width:rect.width,height:rect.height,right:rect.right,bottom:rect.bottom};
    }));
    assert.ok(buttons.length>=6,'les actions sont présentes');
    // L'ordre est l'invariant ; le libellé du rendu dit le **mode** affiché
    // (« ◈ STANDARD · REPLI »), le mot RENDU restant dans l'infobulle.
    const ORDER=[/ACTIVITÉS/,/GARAGE/,/SON/,/^[◈◆] /,/^[◈◆] /,/COCKPIT/,/MENU/];
    for (const [i,pattern] of ORDER.entries()) {
      const button=buttons[i];
      assert.ok(pattern.test(button.text),`action ${i+1} : « ${button.text} » ne correspond pas à ${pattern}`);
      assert.ok(button.right<=viewport.width+1 && button.bottom<=viewport.height+1,`action ${i+1} tient dans la fenêtre`);
      assert.ok(button.x>=0,`action ${i+1} reste dans la fenêtre`);
      if (handheld) { assert.ok(button.width>60, 'cible tactile suffisante'); continue; }
      assert.ok(button.x>viewport.width/2,`action ${i+1} reste à droite`);
      assert.equal(button.width,112,'largeur historique de la colonne');
      assert.equal(button.x,buttons[0].x,'même colonne que la première action');
      if (i) assert.ok(button.y>=buttons[i-1].bottom+4,'actions verticalement séparées');
    }
    if (handheld) {
      // Le tiroir se referme d'un tap sur la ville : on le vérifie pour de vrai,
      // là où la ville est encore visible (le haut de l'écran, au-dessus des
      // commandes tactiles et du compteur).
      const open = await page.evaluate(() => document.querySelector('.vice-free-roam').dataset.actionsOpen);
      assert.equal(open, 'true', 'le tiroir est ouvert');
      // `mouse.click` passe par le système d'événements réel : c'est le geste du
      // joueur, pas une simulation. Un appui long sur le canevas n'est pas
      // nécessaire — le `pointerdown` est écouté au premier contact.
      const before = await page.evaluate(() => document.querySelector('.vice-free-roam').dataset.actionsOpen);
      assert.equal(before, 'true', 'tiroir ouvert avant le tap');
      await page.mouse.click(Math.round(viewport.width / 2), Math.round(viewport.height * 0.62));
      // L'état React bascule tout de suite ; la feuille fait suivre `visibility`
      // après sa transition. On attend l'état, pas la fin d'une animation.
      await page.waitForFunction(() => document.querySelector('.vice-free-roam').dataset.actionsOpen === 'false', null, { timeout: 5000 });
      assert.equal(await page.evaluate(() => document.querySelector('.vice-free-roam').dataset.actionsOpen), 'false', 'un tap sur la ville referme le tiroir');
    }
  }
  assert.equal(await page.locator('[data-action="shoot"], [data-action="foot-shoot"], [data-action="interact"], .vice-free-roam-crosshair').count(),0);
  assert.equal(await page.locator('.vice-free-roam-touch button').count(),3);
  for(const key of ['e','z']){await page.keyboard.press(key);}
  await page.locator('.vice-free-roam-world canvas').click({position:{x:400,y:180}});
  assert.equal(await page.locator('.vice-free-roam-crosshair').count(),0);
  assert.equal(await page.getByRole('button',{name:/Sortir du véhicule|Tirer|Courir vers/}).count(),0);
  // Le rendu est un vrai réglage : le bouton change de mode, la ville se
  // reconstruit, et le choix survit à l'appareil.
  const graphics=page.locator('.vice-free-roam-graphics');
  assert.equal(await graphics.getAttribute('data-graphics-mode'),'standard');
  assert.match((await graphics.textContent()).trim(),/STANDARD/);
  await graphics.evaluate(el=>el.click());
  await page.waitForFunction(()=>document.querySelector('.vice-free-roam-graphics')?.dataset.graphicsMode==='cinema');
  await page.waitForSelector('.vice-free-roam-world canvas');
  assert.equal(await page.evaluate(()=>localStorage.getItem('letsplay_vice_city_rush_graphics_v1')),'cinema');
  // Ce Chromium (SwiftShader) n'expose pas `navigator.gpu` : le cycle ne promet
  // donc pas l'essai, il retombe au standard **en le disant**. Et le clic
  // doit partir de ce qui est **affiché** (STANDARD · REPLI), pas du mode
  // autrefois demandé : c'est la référence `graphicsModeRef` resynchronisée.
  // Le repli est **affiché** : le clic suivant doit repartir de ce qui est
  // affiché (STANDARD · REPLI), pas re-demander l'essai refusé. C'est le
  // correctif de `graphicsModeRef` : la préférence enregistrée repasse au
  // standard, et le libellé reste « STANDARD » (le repli peut rester affiché
  // tant que la ville n'a pas été reconstruite une fois sur un moteur accepté).
  await page.locator('.vice-free-roam-graphics').evaluate(el=>el.click());
  await page.waitForFunction(()=>document.querySelector('.vice-free-roam-graphics')?.dataset.graphicsMode==='standard');
  assert.match((await graphics.textContent()).trim(),/STANDARD/,'le clic sur RENDU repart de ce qui est affiché');
  assert.equal(await page.evaluate(()=>localStorage.getItem('letsplay_vice_city_rush_graphics_v1')),'standard');
  // Camera and sound remain usable from the repositioned column.
  const camera=page.locator('.vice-free-roam-view');
  const before=await camera.getAttribute('aria-pressed');await camera.evaluate(el=>el.click());
  await page.waitForFunction(previous=>document.querySelector('.vice-free-roam-view').getAttribute('aria-pressed')!==previous,before);
  const sound=page.locator('.vice-free-roam-sound');const soundBefore=await sound.getAttribute('aria-pressed');await sound.evaluate(el=>el.click());
  await page.waitForFunction(previous=>document.querySelector('.vice-free-roam-sound').getAttribute('aria-pressed')!==previous,soundBefore);
  await page.locator('.vice-free-roam-menu').evaluate(el=>el.click());
  await page.getByRole('button',{name:'Conduite libre',exact:true}).waitFor();
  assert.equal(await page.locator('.school-free-mode').count(),0);
  assert.equal(await page.evaluate(()=>localStorage.getItem('letsplay_driving_progress_v1')),learningSave);
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);
  console.log('PASS: deferred 3D loading, free-drive rendering, right-side actions on PC (112 px column), mobile (☰ drawer) and landscape, vehicle-only controls (no exit/shooting), sound and camera toggles, return to learning hub, separate progress and mobile layout.');
} finally {await browser.close();}
