import assert from 'node:assert/strict';

/** Les quatre soutiens, joués par la main réelle, puis l’Ascension préparée
 * par leurs effets : souris et doigt, en Duel et en MOBA. */
export async function verifierRenfortsBrowser(browser, port, dossier) {
  for (const mode of ['duel', 'moba']) for (const [width, height, tactile] of [[1440, 900, false], [568, 320, true]]) for (const ascension of ['scorpion', 'colosse']) {
    const scene = `soutiens-${ascension}`;
    const id = ascension === 'scorpion' ? 'scorpion-de-l-eclipse' : 'colosse-du-verre-ardent';
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: tactile, isMobile: tactile, reducedMotion: 'reduce' });
    page.setDefaultTimeout(12000);
    const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
    const choisir = n => tactile ? n.tap() : n.click();
    const main = carte => page.locator(`.rpg-hand__card[data-card-id="${carte}"]`).first();
    const lire = () => page.evaluate(() => structuredClone(window.__ASCENSION_TEST_DUEL__));
    const attendre = async carte => {
      await page.waitForFunction(c => {
        const d = window.__ASCENSION_TEST_DUEL__;
        return d.joueur.creatures.some(e => e.carteId === c) && !d.mobaCreatureEnAttente && !d.mobaSortEnAttente && !d.arriveeEnAttente && !d.effetCreatureEnAttente;
      }, carte);
      if (mode === 'duel') await page.waitForFunction(() => !document.querySelector('.card-table.is-card-flight-active'));
    };
    const sort = async carte => {
      const n = main(carte); assert.equal(await n.isEnabled(), true); assert.match(await n.getAttribute('class'), /is-playable/);
      await choisir(n);
      if (mode === 'duel') await choisir(page.getByRole('button', { name: 'Lancer le sort', exact: true }));
      if (mode === 'moba' && carte === 'retour-des-ensevelis') await choisir(page.locator('[data-moba-lane="right"][data-moba-side="joueur"][data-moba-slot="1"] button'));
    };
    try {
      await page.goto(`http://127.0.0.1:${port}/?mode=${mode}&scene=${scene}`, { waitUntil: 'networkidle' });
      if (ascension === 'scorpion') {
        assert.equal(await main('convoi-des-dunes').isEnabled(), true);
        await choisir(main('convoi-des-dunes'));
        await choisir(mode === 'duel' ? page.locator('[data-creature-slot-choix="true"]').first() : page.locator('[data-moba-lane="left"][data-moba-side="joueur"][data-moba-slot="1"] button'));
        await attendre('scorpion-du-seuil');
        const apresConvoi = await lire();
        assert.equal(apresConvoi.joueur.creatures.filter(e => e.carteId === 'convoi-des-dunes').length, 1);
        assert.equal(apresConvoi.joueur.creatures.find(e => e.carteId === 'scorpion-du-seuil').ready, false);
        await sort('retour-des-ensevelis'); await attendre('momie-de-lin');
      } else {
        const debut = await lire();
        assert.equal(mode === 'moba' ? debut.moba.creaturesJouees.joueur : debut.joueur.invocationNormaleJouee, true, 'invocation normale déjà dépensée');
        await sort('confluence-des-etincelles'); await attendre('djinn-de-la-flamme-mourante');
        const apresConfluence = await lire();
        assert.equal(apresConfluence.joueur.creatures.length, 2);
        assert.equal(apresConfluence.joueur.creatures.find(e => e.carteId === 'djinn-de-la-flamme-mourante').ready, true, 'Rapidité conservée');
        assert.ok(apresConfluence.joueur.main.includes('ghul-des-cendres'), 'vraie pioche d’arrivée');
        await sort('eveil-des-dunes'); await attendre('dune-marchante');
        assert.match(await main('eveil-des-dunes').getAttribute('class'), /is-unplayable/, 'autre copie éteinte malgré une seconde Dune dans le deck');
        if (mode === 'moba') assert.equal(await main('eveil-des-dunes').isDisabled(), true);
        else {
          const avantUsage = JSON.stringify(await lire()); await choisir(main('eveil-des-dunes'));
          assert.equal(await page.locator('.rpg-spell-confirm').count(), 0);
          assert.equal(JSON.stringify(await lire()), avantUsage, 'une seconde activation ne lance rien');
        }
      }
      await page.waitForFunction(() => [...document.querySelectorAll('.rpg-card[data-entity-id] .rpg-card__img')].every(n => n.complete && n.naturalWidth > 0));
      const preparee = await lire();
      assert.equal(mode === 'moba' ? preparee.moba.creaturesJouees.joueur : preparee.joueur.invocationNormaleJouee, true, 'les effets ne réinitialisent ni ne dépensent un autre quota');
      await choisir(page.locator('[data-ascension-side="joueur"]'));
      const face = page.locator(`[data-ascension-reserve-card="${id}"]`);
      await face.scrollIntoViewIfNeeded(); await choisir(face); await choisir(page.locator('.rpg-ascension-prepare'));
      const recettes = ascension === 'scorpion' ? ['scorpion-du-seuil', 'ureus-du-seuil', 'momie-de-lin'] : ['djinn-de-la-premiere-etincelle', 'djinn-de-la-flamme-mourante', 'dune-marchante'];
      const victimes = recettes.map(c => preparee.joueur.creatures.find(e => e.carteId === c));
      for (const e of victimes) await choisir(page.locator(`[data-ascension-material="${e.id}"]`));
      assert.equal(await page.locator('.rpg-ascension-invoke').isEnabled(), true);
      await page.screenshot({ path: `${dossier}/preparation-${mode}-${ascension}-${width}.png` });
      await choisir(page.locator('.rpg-ascension-invoke'));
      if (mode === 'moba') {
        const voie = preparee.moba.lanes.find(l => l.slots.joueur.includes(victimes[0].id));
        const slot = voie.slots.joueur.indexOf(victimes[0].id);
        await choisir(page.locator(`[data-moba-lane="${voie.id}"][data-moba-side="joueur"][data-moba-slot="${slot}"] button`));
      }
      await attendre(id);
      const apres = await lire();
      assert.equal(apres.joueur.reserveAscension.length, 3);
      assert.equal(mode === 'moba' ? apres.moba.creaturesJouees.joueur : apres.joueur.invocationNormaleJouee, true);
      assert.ok(victimes.every(e => !apres.joueur.creatures.some(v => v.id === e.id)));
      assert.deepEqual(erreurs, []);
      await page.screenshot({ path: `${dossier}/renforts-${mode}-${ascension}-${width}.png` });
      console.log(`✓ ${scene} ${mode} ${width}×${height} : cartes jouées depuis la main, arrivées conservées, renforts sans quota et Ascension à trois réelle.`);
    } catch (e) {
      await page.screenshot({ path: `${dossier}/echec-${scene}-${mode}-${width}.png` }).catch(() => {});
      console.error('État des soutiens en échec', JSON.stringify(await lire().catch(() => null))); throw e;
    } finally { await page.close(); }
  }
}
