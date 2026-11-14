import assert from 'node:assert/strict';

const CARTES = {
  jarl: { id: 'jarl-du-dernier-rempart', couts: [3, 5], materiaux: ['gardien-viking-du-fjord', 'jarl-au-marteau-de-guerre'], effets: ['overkill', 'bouclier', 'furie'], stats: [4, 10], recette: /Viking 3.*Viking 5/ },
  scorpion: { id: 'scorpion-de-l-eclipse', couts: [2, 3, 3], materiaux: ['scorpion-du-seuil', 'ureus-du-seuil', 'ureus-du-seuil'], effets: ['poison', 'volDeVie'], stats: [5, 9], recette: /Scorpion Sable 2.*Ténèbres 3.*Ténèbres 3/ },
  colosse: { id: 'colosse-du-verre-ardent', couts: [1, 3, 4], materiaux: ['djinn-de-la-premiere-etincelle', 'djinn-de-la-flamme-mourante', 'dune-marchante'], effets: ['bouclier', 'contreAttaque'], stats: [7, 8], recette: /Djinn Braise 1.*Djinn Braise 3.*Élémental Sable 4/ },
};

export async function verifierDuoBrowser(browser, port, dossier) {
  for (const mode of ['duel', 'moba']) for (const [width, height, tactile] of [[1440, 900, false], [568, 320, true]]) for (const [scene, carte] of Object.entries(CARTES)) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: tactile, isMobile: tactile, reducedMotion: 'reduce' });
    page.setDefaultTimeout(12000); const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
    const choisir = n => tactile ? n.tap() : n.click();
    const lire = () => page.evaluate(() => structuredClone(window.__ASCENSION_TEST_DUEL__));
    const zone = page.locator('[data-ascension-side="joueur"]');
    const face = page.locator(`[data-ascension-reserve-card="${carte.id}"]`);
    const corps = id => page.locator(`.rpg-card[data-entity-id="${id}"]`);
    const materiau = id => page.locator(`[data-ascension-material="${id}"]`);
    try {
      await page.goto(`http://127.0.0.1:${port}/?mode=${mode}&scene=${scene}`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => [...document.querySelectorAll('.rpg-card[data-entity-id] .rpg-card__img')].every(n => n.complete && n.naturalWidth > 0));
      const avant = await lire(); const ids = [];
      for (const id of carte.materiaux) ids.push(avant.joueur.creatures.find(e => e.carteId === id && !ids.includes(e.id)).id);
      const destination = mode === 'moba' ? avant.moba.lanes.flatMap(l => l.slots.joueur.map((id, slot) => ({ id, lane: l.id, slot }))).find(p => p.id === ids[0]) : null;
      await choisir(zone); assert.equal(await page.locator('[data-ascension-reserve-card]').count(), 4);
      await face.scrollIntoViewIfNeeded(); await choisir(face);
      const apercu = page.locator('.rpg-ascension-card-preview');
      for (const effet of carte.effets) assert.equal(await apercu.locator(`[data-pastille="${effet}"]`).count(), 1, `${scene} : ${effet}`);
      const image = apercu.locator('.rpg-hover-card-preview__face img').first();
      await image.evaluate(n => n.decode());
      const visible = await apercu.evaluate(n => {
        const p = n.querySelector('.rpg-card-peek__panel'), f = n.querySelector('.rpg-hover-card-preview__face'), titre = n.querySelector('.rpg-hover-card-preview__name');
        const a = p.getBoundingClientRect(), b = f.getBoundingClientRect(), t = titre.getBoundingClientRect();
        return p.scrollTop === 0 && b.top >= a.top - 1 && b.bottom <= a.bottom + 1 && t.top >= a.top - 1 && t.bottom <= innerHeight;
      });
      assert.ok(visible, `${scene} : titre, peinture et statistiques entiers dès l’ouverture`);
      await page.screenshot({ path: `${dossier}/fiche-${mode}-${scene}-${width}.png` });
      assert.deepEqual(await lire(), avant, 'consultation sans mutation');
      await choisir(page.locator('.rpg-ascension-prepare'));
      assert.match(await page.locator('.rpg-ascension-board-link small').innerText(), carte.recette);
      for (let i = 0; i < ids.length; i++) {
        assert.equal(await page.locator('.rpg-ascension-invoke').isDisabled(), true, 'pas de paiement avec une recette incomplète');
        await choisir(materiau(ids[i])); assert.equal(await materiau(ids[i]).getAttribute('data-ascension-order'), String(i + 1));
      }
      assert.equal(await page.locator('.rpg-ascension-invoke').isEnabled(), true);
      const commandes = await page.locator('.rpg-ascension-invoke, .rpg-ascension-cancel').evaluateAll(ns => ns.every(n => {
        const r = n.getBoundingClientRect(); return r.x >= 0 && r.y >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && r.height >= 44 && document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('button') === n;
      }));
      assert.ok(commandes, 'confirmation et annulation accessibles au doigt');
      assert.deepEqual(await lire(), avant, 'sélection des trois matériaux sans paiement');
      await page.screenshot({ path: `${dossier}/rituel-${mode}-${scene}-${width}.png` });
      await choisir(page.locator('.rpg-ascension-invoke'));
      if (mode === 'moba') await choisir(page.locator(`[data-moba-lane="${destination.lane}"][data-moba-side="joueur"][data-moba-slot="${destination.slot}"] button`));
      await page.waitForFunction(id => window.__ASCENSION_TEST_DUEL__.joueur.creatures.some(e => e.carteId === id), carte.id);
      if (scene === 'scorpion') {
        const cible = avant.sorcier.creatures[0].id;
        await choisir(corps(cible));
        await page.waitForFunction(id => !window.__ASCENSION_TEST_DUEL__.sorcier.creatures.some(e => e.id === id), cible);
      }
      const apres = await lire(); const e = apres.joueur.creatures.find(e => e.carteId === carte.id);
      assert.equal(e.atk, carte.stats[0]); assert.equal(e.pv, carte.stats[1]);
      assert.equal(apres.joueur.reserveAscension.length, 3); assert.ok(!apres.joueur.reserveAscension.includes(carte.id));
      assert.ok(ids.every(id => !apres.joueur.creatures.some(e => e.id === id)));
      assert.equal(mode === 'moba' ? apres.moba.creaturesJouees.joueur : apres.joueur.invocationNormaleJouee, false);
      for (const effet of carte.effets) assert.equal(await corps(e.id).locator(`[data-effet="${effet}"]`).count(), 1, `plateau : ${effet}`);
      if (scene === 'colosse') for (const ennemi of avant.sorcier.creatures) {
        const maintenant = apres.sorcier.creatures.find(e => e.id === ennemi.id);
        assert.equal(maintenant.pv, ennemi.pv - (mode === 'duel' || ennemi.mobaLane === e.mobaLane ? 2 : 0));
      }
      assert.deepEqual(erreurs, []);
      await page.screenshot({ path: `${dossier}/duo-${mode}-${scene}-${width}.png` });
      console.log(`✓ ${scene} ${mode} ${width}×${height} : fiche, recette exacte, ${ids.length} sacrifices, effets réels et quota conservé.`);
    } catch (e) {
      await page.screenshot({ path: `${dossier}/echec-duo-${mode}-${scene}-${width}.png` }).catch(() => {});
      console.error('État en échec', JSON.stringify(await lire().catch(() => null))); throw e;
    } finally { await page.close(); }
  }
  for (const mode of ['duel', 'moba']) {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
    try {
      await page.goto(`http://127.0.0.1:${port}/?mode=${mode}&scene=jarl-furie`, { waitUntil: 'networkidle' });
      const jarl = page.locator('.rpg-card[data-entity-id][data-card-id="jarl-du-dernier-rempart"]');
      const image = jarl.locator('.rpg-card__img');
      assert.match(await image.getAttribute('src'), /jarl-du-dernier-rempart-furie\.jpg\?v=/);
      await image.evaluate(n => n.decode());
      const stats = await page.evaluate(() => window.__ASCENSION_TEST_DUEL__.joueur.creatures.find(e => e.carteId === 'jarl-du-dernier-rempart'));
      assert.equal(stats.atk, 8); assert.equal(stats.pv, 9); assert.equal(stats.furieDeclenchee, true);
      await page.screenshot({ path: `${dossier}/jarl-furie-${mode}.png` });
      console.log(`✓ Jarl Furie ${mode} tactile : peinture dédiée chargée, 8 ATQ et 9 DEF.`);
    } finally { await page.close(); }
  }
}
