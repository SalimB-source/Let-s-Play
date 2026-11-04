import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--no-zygote','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true});page.setDefaultTimeout(120000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.SCHOOL_URL||'http://localhost:5173/Let-s-Play/jeu/vice-city-rush',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Les situations',exact:true}).click();
  await page.getByRole('button',{name:/Lancer l’exercice : 07 ·/}).click();
  await page.getByRole('dialog',{name:'Préparer la mission'}).getByRole('button',{name:'Commencer la mission →',exact:true}).click({noWaitAfter:true});
  await page.locator('.driving-side-mirrors canvas[data-status="ready"]').nth(1).waitFor();
  // Deterministic telemetry simulation after a real 3D launch. Stop the render
  // loop so its physical clock cannot overwrite the synthetic model samples.
  await page.evaluate(()=>{window.requestAnimationFrame=()=>0;});
  await page.waitForTimeout(200);
  async function send(time){await page.evaluate(time=>{
    const el=document.querySelector('.vice-free-roam');let fiber=el[Object.keys(el).find(k=>k.startsWith('__reactFiber'))];
    while(fiber&&!fiber.memoizedProps?.onTelemetry)fiber=fiber.return;
    fiber.memoizedProps.onTelemetry({x:102.35,z:-77,heading:0,speed:0,signedSpeed:0,damage:0,time});
  },time);}
  await send(100);await send(101);
  const brief=page.locator('.driving-top-brief');
  assert.equal(await brief.getAttribute('data-assistance-state'),'wait');assert.match(await brief.innerText(),/❌.*Attendez encore un peu/s);
  assert.equal(await page.locator('.driving-fault-notice').count(),0,'a waiting cross is not a scored error');
  await send(160);
  assert.equal(await brief.getAttribute('data-assistance-state'),'go');assert.match(await brief.innerText(),/✅.*C’est bon/s);
  const layout=await page.evaluate(()=>{const b=document.querySelector('.driving-top-brief').getBoundingClientRect(),w=document.querySelector('.driving-school-world').getBoundingClientRect(),p=document.querySelector('.driving-top-brief p').getBoundingClientRect();return{noOverlap:b.bottom<=w.top+.5,fits:p.width<=innerWidth,noOverflow:document.documentElement.scrollWidth<=innerWidth};});
  assert.deepEqual(layout,{noOverlap:true,fits:true,noOverflow:true});assert.deepEqual(errors,[]);
  console.log('PASS: real school view, synthetic priority wait → clearance, red cross → green check, no false fault, mobile HUD layout.');
}finally{await browser.close();}
