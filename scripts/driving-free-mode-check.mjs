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
  for (const viewport of [{width:1000,height:700},{width:390,height:844},{width:844,height:390}]) {
    await page.setViewportSize(viewport);
    const buttons=await page.locator('.vice-free-roam-header>button').evaluateAll(els=>els.map(el=>{
      const rect=el.getBoundingClientRect();return {text:el.textContent.trim(),x:rect.x,y:rect.y,width:rect.width,height:rect.height,right:rect.right,bottom:rect.bottom,visible:getComputedStyle(el).display!=='none'};
    }));
    assert.equal(buttons.length,6);
    for (const [i,label] of ['ACTIVITÉS','GARAGE','SON','RENDU','COCKPIT','MENU'].entries()) {
      const button=buttons[i];assert.ok(button.text.includes(label));assert.ok(button.visible,label);
      assert.equal(button.width,112);assert.equal(button.x,buttons[0].x);
      assert.ok(button.right<=viewport.width && button.bottom<=viewport.height);
      assert.ok(button.x>viewport.width/2);
      if (i) assert.ok(button.y>=buttons[i-1].bottom+4,'vertically separated actions');
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
  // donc pas l'essai, il retombe au standard en l'annonçant.
  assert.equal(await page.evaluate(()=>Boolean(navigator.gpu)),false);
  await page.locator('.vice-free-roam-graphics').evaluate(el=>el.click());
  await page.waitForFunction(()=>document.querySelector('.vice-free-roam-graphics')?.dataset.graphicsMode==='standard');
  assert.match((await graphics.textContent()).trim(),/REPLI/,'sans carte, le repli est annoncé');
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
  console.log('PASS: deferred 3D loading, free-drive rendering, five vertical right-side actions on PC/mobile/landscape, vehicle-only controls (no exit/shooting), sound and camera toggles, return to learning hub, separate progress and mobile layout.');
} finally {await browser.close();}
