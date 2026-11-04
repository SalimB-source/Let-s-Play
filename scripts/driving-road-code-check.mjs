import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--no-zygote','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(180000);
  const errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error('PAGE ERROR:',error.message);});
  await page.goto(process.env.SCHOOL_URL||'http://localhost:5173/Let-s-Play/jeu/vice-city-rush',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Les situations',exact:true}).click();
  assert.equal(await page.locator('.school-situation-card').count(),23);
  for(const [number,id] of [[20,'narrow-passage'],[21,'emergency-vehicle'],[22,'priority-road'],[23,'yield-clear']].filter(([number])=>!process.env.SCHOOL_SCENARIO||number===Number(process.env.SCHOOL_SCENARIO))){
    const art=page.locator(`svg[data-situation="${id}"]`);await art.waitFor();assert.equal(await art.locator(':scope>text').count(),0,'no text bubble on thumbnails');
    await page.getByRole('button',{name:new RegExp(`Lancer l’exercice : ${number} ·`)}).click();
    const mission=page.getByRole('dialog',{name:'Préparer la mission'});await mission.waitFor();
    await mission.getByRole('button',{name:'Commencer la mission →',exact:true}).click({noWaitAfter:true});
    try { await page.locator('.driving-side-mirrors canvas[data-status="ready"]').nth(1).waitFor(); } catch(error) {
      console.error('Mirror status:',await page.locator('.driving-side-mirrors canvas').evaluateAll(els=>els.map(el=>el.dataset.status)));throw error;
    }
    assert.equal(await page.locator('.driving-school-world .vice-free-roam-world canvas').count(),1);
    assert.match(await page.locator('.driving-instructor h2').innerText(),new RegExp(`^${number} ·`));
    assert.equal(await page.locator('.driving-max-speed').isVisible(),true);
    if(process.env.SCHOOL_SCREENSHOTS)await page.screenshot({path:`/tmp/school-${id}.png`});
    console.log(`PASS: ${number} ${id}, real 3D view and live mirrors.`);
    await page.locator('.vice-free-roam-menu').click({noWaitAfter:true});
    await page.getByRole('dialog',{name:'Exercice en pause'}).getByRole('button',{name:'Quitter l’exercice',exact:true}).click();
    await page.getByRole('region',{name:'Bilan de l’exercice'}).getByRole('button',{name:'Quitter',exact:true}).click();
    await page.getByRole('button',{name:'Les situations',exact:true}).click();
  }
  await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('.school-situation-card').count(),23);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);console.log('PASS: selected missions launch/quit, 23 cards, mobile catalogue and no JS errors.');
}finally{await browser.close();}
