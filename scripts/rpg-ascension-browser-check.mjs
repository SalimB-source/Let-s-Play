import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { creerServeurAscension } from './rpg-ascension-preview.mjs';
import { verifierDuoBrowser } from './rpg-ascension-duo-browser.mjs';
import { verifierRenfortsBrowser } from './rpg-ascension-renforts-browser.mjs';
import { verifierDecksAscensionBrowser } from './rpg-ascension-decks-browser.mjs';

const port = Number(process.env.ASCENSION_TEST_PORT ?? 4184);
const dossier = process.env.ASCENSION_SCREENSHOTS ?? 'node_modules/.cache/rpg-ascension-browser';
await mkdir(dossier, { recursive: true });
const server = await creerServeurAscension(port);
let browser;
try {
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  if (!process.env.ASCENSION_DUO_ONLY && !process.env.ASCENSION_RENFORTS_ONLY && !process.env.ASCENSION_DECKS_ONLY) for (const mode of ['duel', 'moba']) for (const [width, height, tactile] of [[1440, 900, false], [1280, 720, false], [844, 390, true], [667, 375, true], [568, 320, true]]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: tactile, isMobile: tactile, reducedMotion: 'reduce' });
    page.setDefaultTimeout(10000); page.setDefaultNavigationTimeout(20000);
    const erreurs = []; page.on('pageerror', (error) => erreurs.push(error.message));
    const choisir = (node) => tactile ? node.tap() : node.click();
    const zone = (side = 'joueur') => page.locator(`[data-ascension-side="${side}"]`);
    const reserve = () => page.locator('.rpg-ascension-popover');
    const face = () => page.locator('.rpg-ascension-popover [data-ascension-reserve-card="samourai-du-dragon-rouge"]');
    const apercu = () => page.locator('.rpg-ascension-card-preview');
    const materiau = (id) => page.locator(`[data-ascension-material][data-card-id="${id}"]`);
    const ronin = () => materiau('ronin-du-soleil-rouge');
    const onna = () => materiau('onna-musha-des-cendres');
    const hatamoto = () => materiau('hatamoto-des-cendres');
    const instantane = () => page.evaluate(() => JSON.stringify(window.__ASCENSION_TEST_DUEL__));
    const ouvrirRituel = async () => { await choisir(zone()); await choisir(face()); await choisir(page.locator('.rpg-ascension-prepare')); };
    const ecran = mode === 'duel' ? '.card-table' : '.moba__surface';
    try {
      await page.goto(`http://127.0.0.1:${port}/?mode=${mode}`, { waitUntil: 'networkidle' });
      assert.equal(await page.locator('[data-ascension-side]').count(), 2);
      const disposition = await page.evaluate((m) => {
        const obstacles = [...document.querySelectorAll(m === 'duel'
          ? '.rpg-card-piles, .rpg-table-zones, .rpg-wizard-plate, .rpg-card[data-entity-id]'
          : '.moba__player, .moba__status, .moba__journal, .moba__piles .rpg-card-pile, .moba__slot.has-creature')]
          .map((n) => ({ nom: n.className, rect: n.getBoundingClientRect() })).filter(({ rect }) => rect.width && rect.height);
        return [...document.querySelectorAll('[data-ascension-side]')].map((n) => {
          const r = n.getBoundingClientRect();
          return { cote: n.dataset.ascensionSide, largeur: r.width, hauteur: r.height,
            dansEcran: r.x >= 0 && r.y >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
            cliquable: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('[data-ascension-side]') === n,
            chevauchements: obstacles.filter(({ rect: o }) => Math.min(r.right, o.right) - Math.max(r.left, o.left) > 1
              && Math.min(r.bottom, o.bottom) - Math.max(r.top, o.top) > 1).map(({ nom }) => nom) };
        });
      }, mode);
      for (const z of disposition) {
        assert.ok(z.dansEcran && z.cliquable, `${mode} ${width} : réserve ${z.cote} accessible`);
        assert.ok(z.largeur >= 44 && z.hauteur >= 44, 'zone tactile de 44 px');
        assert.deepEqual(z.chevauchements, [], 'pas de chevauchement de la zone fermée');
      }
      const avant = await instantane();
      // L'adversaire peut lui aussi lire les cartes, jamais les invoquer.
      await choisir(zone('sorcier')); await choisir(face());
      assert.equal(await apercu().count(), 1);
      assert.equal(await page.locator('.rpg-ascension-prepare').count(), 0);
      await page.keyboard.press('Escape'); assert.equal(await reserve().count(), 1);
      await page.waitForFunction(() => document.activeElement?.hasAttribute('data-ascension-reserve-card'));
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.activeElement?.dataset.ascensionSide === 'sorcier');
      const tailleAvant = await page.locator(ecran).boundingBox();
      const cartesAvant = await page.locator('.rpg-card[data-entity-id]').evaluateAll((ns) => ns.map((n) => { const r = n.getBoundingClientRect(); return { id: n.dataset.entityId, x: r.x, y: r.y, w: r.width, h: r.height }; }));
      await choisir(zone());
      assert.equal(await reserve().getAttribute('aria-modal'), 'false');
      await page.waitForFunction(() => document.activeElement?.hasAttribute('data-ascension-reserve-card'));
      assert.equal(await zone().getAttribute('aria-expanded'), 'true');
      assert.equal(await page.locator('.rpg-ascension-panel, .rpg-ascension-overlay').count(), 0, 'ni volet ni voile');
      assert.equal(await page.locator(ecran).getAttribute('inert'), null);
      assert.deepEqual(await page.locator(ecran).boundingBox(), tailleAvant, 'le plateau n’est ni déplacé ni réduit');
      assert.deepEqual(await page.locator('.rpg-card[data-entity-id]').evaluateAll((ns) => ns.map((n) => { const r = n.getBoundingClientRect(); return { id: n.dataset.entityId, x: r.x, y: r.y, w: r.width, h: r.height }; })), cartesAvant, 'aucune créature déplacée');
      const geometrie = await reserve().evaluate((n) => {
        const r = n.getBoundingClientRect(), a = document.querySelector('[data-ascension-side="joueur"]').getBoundingClientRect();
        const c = n.querySelector('[data-ascension-reserve-card]'), t = c.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom,
          auDessus: r.bottom <= a.top, ecart: a.top - r.bottom,
          carte: { w: t.width, h: t.height, x: t.x, y: t.y, right: t.right, bottom: t.bottom, cliquable: document.elementFromPoint(t.x + t.width / 2, t.y + t.height / 2)?.closest('[data-ascension-reserve-card]') === c },
          renduPlateau: c.matches('.rpg-card') && Boolean(c.querySelector('.rpg-card__foot')) };
      });
      assert.ok(geometrie.x >= 0 && geometrie.y >= 0 && geometrie.right <= width && geometrie.bottom <= height);
      assert.ok(geometrie.w <= 180 && geometrie.h <= 270, 'petite fenêtre verticale');
      assert.ok(geometrie.auDessus && geometrie.ecart >= 3 && geometrie.ecart <= 12, 'fenêtre juste au-dessus de l’Ascension');
      assert.ok(geometrie.renduPlateau && geometrie.carte.cliquable && geometrie.carte.w >= 44 && geometrie.carte.h >= 44, 'vraie face plateau cliquable');
      assert.equal(await face().getAttribute('data-entity-id'), null);
      assert.equal(await face().locator('.rpg-card__foot').innerText().then((s) => s.replace(/\s/g, '')), '77');
      assert.match(await face().locator('.rpg-card__img').getAttribute('src'), /ascension-dragon-humanoide-v2/);
      await page.waitForFunction(() => {
        const image = document.querySelector('[data-ascension-reserve-card] .rpg-card__img');
        return image?.complete && image.naturalWidth === 768 && image.naturalHeight === 960;
      });
      for (const cle of ['overkill', 'esquive', 'defenseur']) assert.equal(await face().locator(`[data-effet="${cle}"]`).count(), 1, cle);
      assert.equal(await page.locator('[data-ascension-material]').count(), 0, 'consultation sans choix automatique');
      assert.equal(await page.locator('.rpg-ascension-reserve-item.is-ready').count(), 1, 'carte invocable signalée');
      await choisir(face()); assert.equal(await apercu().count(), 1);
      for (const cle of ['overkill', 'esquive', 'defenseur']) assert.equal(await apercu().locator(`[data-pastille="${cle}"]`).count(), 1, cle);
      const lecture = await apercu().evaluate((n) => {
        const panel = n.querySelector('.rpg-card-peek__panel'), nom = n.querySelector('.rpg-hover-card-preview__name');
        const image = n.querySelector('.rpg-hover-card-preview__face').getBoundingClientRect(), cadre = panel.getBoundingClientRect();
        return { hautPanel: cadre.top, hautNom: nom.getBoundingClientRect().top,
          basNom: nom.getBoundingClientRect().bottom, scroll: panel.scrollTop,
          imageEntiere: image.top >= cadre.top - 1 && image.bottom <= cadre.bottom + 1 && image.left >= 0 && image.right <= innerWidth,
          dessusReserve: Number(getComputedStyle(n).zIndex) > Number(getComputedStyle(document.querySelector('.rpg-ascension-popover')).zIndex) };
      });
      assert.ok(lecture.dessusReserve, 'la réserve ne recouvre pas la fiche, y compris en MOBA');
      assert.ok(lecture.imageEntiere, 'l’illustration et ses statistiques restent entières dès l’ouverture');
      assert.ok(lecture.scroll === 0 && lecture.hautNom >= lecture.hautPanel - 1 && lecture.hautNom >= 0 && lecture.basNom <= height, 'titre lisible dès l’ouverture, sans contenu rogné au-dessus');
      for (const [cle, explication] of [['esquive', /15 %/], ['defenseur', /priorité/]]) {
        const pastille = apercu().locator(`[data-pastille="${cle}"]`);
        if (tactile) await pastille.tap(); else await pastille.hover();
        const bulle = page.locator('.rpg-pastille-bulle');
        await bulle.waitFor({ state: 'visible' }); assert.match(await bulle.innerText(), explication);
        const lisible = await bulle.evaluate((n) => {
          const r = n.getBoundingClientRect(), ancien = n.style.pointerEvents;
          n.style.pointerEvents = 'auto';
          const dessus = n.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
          n.style.pointerEvents = ancien;
          return dessus && r.x >= 0 && r.y >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
        });
        assert.ok(lisible, `explication ${cle} visible au-dessus de la fiche et dans l’écran`);
        if (tactile) await pastille.tap(); else await page.mouse.move(0, 0);
        await page.locator('.rpg-ascension-preview-close').focus();
      }
      assert.equal(await page.locator(ecran).getAttribute('inert'), '', 'plateau neutralisé seulement pendant la fiche');
      assert.equal(await instantane(), avant, 'le clic affiche seulement l’aperçu');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.activeElement?.hasAttribute('data-ascension-reserve-card'));
      assert.equal(await reserve().count(), 1, 'fermer la fiche garde la petite réserve ouverte');
      await page.locator('.rpg-ascension-close').focus(); await page.keyboard.press('Shift+Tab');
      assert.equal(await reserve().evaluate((n) => n.contains(document.activeElement)), false, 'pas de piège de focus dans la réserve');
      await choisir(zone()); assert.equal(await reserve().count(), 0, 'le bouton replie la réserve');
      await choisir(zone());
      await page.screenshot({ path: `${dossier}/${mode}-reserve-${width}x${height}.png` });
      if (width === 1440) await page.screenshot({ path: `${dossier}/${mode}-reserve.png` });
      await choisir(face());
      if (width === 1440 || width === 568) await page.screenshot({ path: `${dossier}/${mode}-apercu-${width}.png` });
      await choisir(page.locator('.rpg-ascension-prepare'));
      assert.equal(await reserve().count(), 0); assert.equal(await apercu().count(), 0);
      assert.equal(await page.locator('.rpg-ascension-ritual').count(), 1);
      assert.equal(await page.locator(ecran).getAttribute('inert'), null, 'choix sur le vrai champ');
      const materiaux = await page.locator('[data-ascension-material]').evaluateAll((ns) => ns.map((n) => {
        const r = n.getBoundingClientRect(); return { id: n.dataset.cardId, w: r.width, h: r.height, x: r.x, y: r.y, right: r.right, bottom: r.bottom,
          cliquable: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('[data-ascension-material]') === n };
      }));
      assert.equal(materiaux.length, 3);
      for (const c of materiaux) assert.ok(c.cliquable && c.w >= 44 && c.h >= 44 && c.x >= 0 && c.y >= 0 && c.right <= width && c.bottom <= height, `${c.id} accessible au doigt`);
      // Les commandes ordinaires ne doivent jamais traverser un choix de sacrifices.
      await page.locator(mode === 'duel' ? '.rpg-btn--endturn' : '.moba__buttons > .moba__primary').evaluate((n) => n.click());
      assert.equal(await instantane(), avant);
      await choisir(ronin()); await choisir(hatamoto());
      assert.equal(await page.locator('.rpg-ascension-invoke').isDisabled(), true);
      assert.equal(await page.locator('.rpg-ascension-total.is-invalid').count(), 1);
      assert.equal(await onna().isDisabled(), true);
      await choisir(hatamoto()); await choisir(onna());
      assert.equal(await page.locator('.rpg-ascension-invoke').isEnabled(), true);
      assert.equal(await onna().getAttribute('data-ascension-order'), '2');
      assert.equal(await instantane(), avant);
      await choisir(page.locator('.rpg-ascension-board-link'));
      assert.equal(await ronin().evaluate((n) => document.activeElement === n), true);
      await page.keyboard.press('Space'); assert.equal(await ronin().getAttribute('aria-pressed'), 'false');
      await page.keyboard.press('Enter'); assert.equal(await ronin().getAttribute('aria-pressed'), 'true');
      await ronin().focus(); await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.activeElement?.dataset.ascensionSide === 'joueur');
      assert.equal(await page.locator('.rpg-ascension-ritual').count(), 0); assert.equal(await instantane(), avant);
      await ouvrirRituel(); await choisir(ronin()); await choisir(onna());
      await page.screenshot({ path: `${dossier}/${mode}-rituel-${width}x${height}.png` });
      await choisir(page.locator('.rpg-ascension-invoke'));
      if (mode === 'moba') {
        assert.equal(await instantane(), avant, 'préparation sans paiement');
        await choisir(page.locator('[data-moba-lane="right"][data-moba-side="joueur"][data-moba-slot="1"] button'));
      }
      await page.waitForFunction(() => window.__ASCENSION_TEST_DUEL__.joueur.creatures.some((e) => e.carteId === 'samourai-du-dragon-rouge'));
      const apres = await page.evaluate(() => {
        const d = window.__ASCENSION_TEST_DUEL__;
        return { reserve: d.joueur.reserveAscension, quota: d.moba ? d.moba.creaturesJouees.joueur : d.joueur.invocationNormaleJouee,
          victimes: d.joueur.cimetiere.filter((id) => ['ronin-du-soleil-rouge', 'onna-musha-des-cendres'].includes(id)).length,
          dragon: d.joueur.creatures.find((e) => e.carteId === 'samourai-du-dragon-rouge') };
      });
      assert.deepEqual(apres.reserve, ['jarl-du-dernier-rempart', 'scorpion-de-l-eclipse', 'colosse-du-verre-ardent']); assert.equal(apres.quota, false); assert.equal(apres.victimes, 2);
      assert.equal(apres.dragon.atk, 7); assert.equal(apres.dragon.pv, 7);
      assert.equal(apres.dragon.overkill, true); assert.equal(apres.dragon.esquive, true);
      assert.equal(apres.dragon.esquiveChance, .15); assert.equal(apres.dragon.defenseur, true);
      const dragonPose = page.locator('.rpg-card[data-entity-id][data-card-id="samourai-du-dragon-rouge"]');
      for (const cle of ['overkill', 'esquive', 'defenseur']) assert.equal(await dragonPose.locator(`[data-effet="${cle}"]`).count(), 1, `plateau : ${cle}`);
      await choisir(zone()); assert.equal(await page.locator('.rpg-ascension-empty').count(), 0); assert.equal(await face().count(), 0); assert.equal(await page.locator('[data-ascension-reserve-card]').count(), 3);
      await page.keyboard.press('Escape');
      assert.deepEqual(erreurs, [], 'aucune erreur JavaScript');
      await page.screenshot({ path: `${dossier}/${mode}-${width}x${height}.png` });
      console.log(`✓ Ascension ${mode} ${width} × ${height} (${tactile ? 'tap tactile' : 'souris'}) : fenêtre au-dessus de la zone, faces plateau, aperçu, focus et invocation.`);
    } catch (error) {
      await page.screenshot({ path: `${dossier}/echec-${mode}-${width}.png` }).catch(() => {}); throw error;
    } finally { await page.close(); }
  }
  if (!process.env.ASCENSION_RENFORTS_ONLY && !process.env.ASCENSION_DECKS_ONLY) await verifierDuoBrowser(browser, port, dossier);
  if (!process.env.ASCENSION_DUO_ONLY && !process.env.ASCENSION_DECKS_ONLY) await verifierRenfortsBrowser(browser, port, dossier);
  if (!process.env.ASCENSION_DUO_ONLY && !process.env.ASCENSION_RENFORTS_ONLY) await verifierDecksAscensionBrowser(browser, port, dossier);
} finally { await browser?.close(); await server.close(); }
