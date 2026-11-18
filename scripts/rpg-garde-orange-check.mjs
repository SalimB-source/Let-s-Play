import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const server = await createServer({ configFile: false, plugins: [(await import('@vitejs/plugin-react')).default()], base: '/Let-s-Play/', server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.RPG_TEST_CHROMIUM || undefined, args: ['--no-sandbox'] });
  const port = server.httpServer.address().port;
  for (const [width, height, touch] of [[390, 844, true], [1280, 720, false]]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: touch, hasTouch: touch });
    await page.goto(`http://127.0.0.1:${port}/Let-s-Play/scripts/rpg-garde-orange.html`, { waitUntil: 'networkidle' });
    for (const id of ['provocation', 'selection', 'gele', 'moba']) {
      const card = page.locator(`#${id} .rpg-card`);
      const etat = await card.evaluate(el => {
        const aura = el.querySelector('.rpg-card__resonance--garde');
        return { liseret: Boolean(el.querySelector('.rpg-card__liseret-garde')),
          ombre: Boolean(el.querySelector('.rpg-card__ombre-garde')),
          cadre: Boolean(el.querySelector('.rpg-cadre-carte')),
          cadreCouleur: [...el.classList].some(nom => nom.startsWith('rpg-card--frame-')),
          aura: getComputedStyle(aura).backgroundImage,
          onde: getComputedStyle(aura.querySelector('.rpg-card__resonance-onde')).borderColor,
          ecu: getComputedStyle(el.querySelector('.rpg-card__img')).maskImage
            || getComputedStyle(el.querySelector('.rpg-card__img')).webkitMaskImage,
          icone: getComputedStyle(el.querySelector('[data-effet=defenseur] .rpg-effet-icone')).animationName,
          pierre: el.querySelector('[data-effet=defenseur] .rpg-effet-icone').getAttribute('data-pierre'),
          traitEcu: getComputedStyle(aura, '::after').content,
          outline: getComputedStyle(el).outlineColor, outlineStyle: getComputedStyle(el).outlineStyle,
          boxShadow: getComputedStyle(el).boxShadow };
      });
      assert.equal(etat.liseret, false, `${id}: pas de cadre Défenseur`);
      assert.equal(etat.ombre, false, `${id}: pas de silhouette d’écu`);
      assert.equal(etat.cadre, false, `${id}: pas de cadre SVG sur la créature`);
      assert.equal(etat.cadreCouleur, false, `${id}: pas de classe de cadre coloré`);
      assert.match(etat.aura, /238, 111, 20/, `${id}: aura orange conservée`);
      // Parité téléphone / bureau : même silhouette sans filet décoratif.
      assert.equal(etat.ecu, 'none', `${id}: illustration rectangulaire`);
      assert.equal(etat.icone, 'rpg-defenseur-pierre', `${id}: icône animée`);
      assert.equal(etat.pierre, 'orange', `${id}: icône orange`);
      assert.equal(etat.traitEcu, 'none', `${id} (${width}×${height}): aucun filet Défenseur`);
      assert.equal(etat.onde, 'rgba(255, 151, 47, 0.58)', `${id}: ondes orange conservées`);
      if (id === 'selection') {
        if (touch) { assert.equal(etat.outline, 'rgb(255, 224, 130)'); assert.equal(etat.outlineStyle, 'solid'); }
        else assert.match(etat.boxShadow, /255, 107, 94/, 'sélection visible');
      }
    }
    // Les trois effets demandés sont plus doux ; Malédiction conserve son cycle.
    for (const [id, nom, teinte] of [
      ['resonance', 'rpg-sonar-doux', 'rgba(96, 178, 255, 0.58)'],
      ['aura', 'rpg-sonar-doux', 'rgba(250, 205, 90, 0.58)'],
      ['provocation', 'rpg-sonar-doux', 'rgba(255, 151, 47, 0.58)'],
      ['malediction', 'rpg-resonance-onde', 'rgba(178, 146, 245, 0.92)'],
    ]) {
      const onde = page.locator(`#${id} .rpg-card__resonance-onde--1`).first();
      const cycle = await onde.evaluate(el => {
        const style = getComputedStyle(el);
        const animation = el.getAnimations().find(a => a.animationName);
        animation.pause(); animation.effect.updateTiming({ delay: 0 }); animation.currentTime = 576;
        const pointe = Number(getComputedStyle(el).opacity);
        animation.currentTime = 0;
        const debut = new DOMMatrixReadOnly(getComputedStyle(el).transform).a;
        animation.currentTime = 3599;
        const fin = new DOMMatrixReadOnly(getComputedStyle(el).transform).a;
        animation.cancel();
        return { nom: style.animationName, duree: style.animationDuration, couleur: style.borderColor, pointe, debut, fin };
      });
      assert.equal(cycle.nom, nom, `${id} : animation attendue`);
      assert.equal(cycle.duree, '3.6s', `${id} : cadence conservée`);
      assert.equal(cycle.couleur, teinte, `${id} : couleur propre conservée`);
      if (id !== 'malediction') {
        assert.ok(cycle.pointe <= .46 && cycle.debut > .83 && cycle.fin < 1.15, `${id} : intensité et amplitude réduites ${JSON.stringify(cycle)}`);
      } else assert.ok(cycle.pointe > .8 && cycle.debut < .61 && cycle.fin > 1.4, `Malédiction inchangée : ${JSON.stringify(cycle)}`);
    }
    assert.equal(await page.locator('#aura-garde .rpg-card__resonance--garde').evaluate(el => getComputedStyle(el, '::after').content), 'none');
    assert.equal(await page.locator('#normal .rpg-card__liseret-garde').count(), 0);
    await page.locator('#provocation .rpg-card').click();
    assert.equal(await page.locator('body').getAttribute('data-clicked'), 'oui');
    // Test du réglage dans le jeu avant de tester le réglage système.
    await page.locator('.rpg-battle').first().evaluate(el => el.classList.add('is-reduced'));
    assert.equal(await page.locator('#provocation [data-effet=defenseur] .rpg-effet-icone').evaluate(el => getComputedStyle(el).animationName), 'none', 'animation de l’icône désactivée par le jeu');
    for (const id of ['resonance', 'aura', 'provocation', 'malediction']) {
      const etat = await page.locator(`#${id} .rpg-card__resonance-onde--3`).first().evaluate(el => ({ animation: getComputedStyle(el).animationName, opacite: Number(getComputedStyle(el).opacity), scale: new DOMMatrixReadOnly(getComputedStyle(el).transform).a }));
      assert.equal(etat.animation, 'none', `${id} : réglage du jeu`);
      assert.ok(id === 'malediction' ? etat.scale > 1.2 && etat.opacite === .15 : etat.scale <= 1.12 && etat.opacite <= .08, `${id} : couronne fixe`);
    }
    await page.locator('.rpg-battle').first().evaluate(el => el.classList.remove('is-reduced'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('#provocation [data-effet=defenseur] .rpg-effet-icone').evaluate(el => getComputedStyle(el).animationName), 'none', 'animation de l’icône désactivée par le système');
    assert.equal(await page.locator('#gele .rpg-card__ombre-garde').count(), 0,
      'aucune ombre de contour sous mouvement réduit');
    assert.ok(await page.locator('#gele .rpg-card__resonance--garde').count(),
      'le repère sonar reste présent sous mouvement réduit');
    for (const id of ['resonance', 'aura', 'provocation', 'malediction']) {
      const etat = await page.locator(`#${id} .rpg-card__resonance-onde--3`).first().evaluate(el => ({ animation: getComputedStyle(el).animationName, opacite: Number(getComputedStyle(el).opacity), scale: new DOMMatrixReadOnly(getComputedStyle(el).transform).a }));
      assert.equal(etat.animation, 'none', `${id} : réglage système`);
      assert.ok(id === 'malediction' ? etat.scale > 1.2 && etat.opacite === .15 : etat.scale <= 1.12 && etat.opacite <= .08, `${id} : couronne fixe`);
    }
    await page.close();
    console.log(`${width}×${height} : aura, absence de cadre, sélection et interaction vérifiées`);
  }
} finally {
  await browser?.close();
  await server.close();
}
