import assert from 'node:assert/strict';
import { RPG_DECKS_THEMATIQUES } from '../src/games/rpgDecksThematiques.js';

/** Démarrage depuis les menus ordinaires, sans fixture de main, de champ ou
 * de réserve : les quatre préconstruits doivent mener au vrai plateau. */
export async function verifierDecksAscensionBrowser(browser, port, dossier) {
  const themes = RPG_DECKS_THEMATIQUES.filter(d => d.id.startsWith('ascension-'));
  assert.equal(themes.length, 4);
  for (const mode of ['duel', 'moba']) for (const theme of themes) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(15000); const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
    try {
      await page.goto(`http://127.0.0.1:${port}/decks?mode=${mode}`, { waitUntil: 'networkidle' });
      if (mode === 'duel') {
        // Nouveau contexte invité : terminer l’accueil gratuit par les vrais
        // boutons, sans contourner inert ni modifier le casier du joueur.
        await page.locator('.rpg-coffret__boite').first().click();
        for (let vague = 0; vague < 3; vague++) await page.locator('.rpg-coffret__suivant').click();
        await page.locator('.rpg-coffret').waitFor({ state: 'hidden' });
        await page.locator('.rpg-mode-menu__switch button').filter({ hasText: 'Deck' }).click();
        const boite = page.locator('.rpg-deck-choice:not(.rpg-deck-choice--neuf)').filter({ hasText: theme.name });
        await boite.locator('.rpg-deck-choice__button').click();
        assert.match(await page.locator('.rpg-deck-detail__stats').innerText(), /30/);
        assert.equal(await page.locator('.rpg-deck-detail [data-card-id]').count(), new Set(theme.cardIds).size);
        assert.equal(await page.locator(`.rpg-deck-detail [data-card-id="${theme.boxArt}"]`).count(), 0, 'Ascension hors du paquet');
        await page.locator('.rpg-deck-detail__play').click();
        await page.locator('.rpg-mulligan__valider').click();
        if (await page.locator('.rpg-mulligan__commencer').count()) await page.locator('.rpg-mulligan__commencer').click();
      } else {
        const boite = page.locator('.moba__booster').filter({ hasText: theme.name });
        await boite.click(); assert.equal(await boite.getAttribute('aria-pressed'), 'true');
        assert.match(await boite.locator('img').getAttribute('src'), new RegExp(`${theme.boxArt}\\.jpg`));
        await page.getByRole('button', { name: /Commencer le duel libre/ }).click();
        await page.getByRole('button', { name: /Garder ma main/ }).click();
      }
      await page.waitForSelector('[data-ascension-side="joueur"]');
      const reserve = page.locator('[data-ascension-side="joueur"]'); await reserve.click();
      assert.equal(await page.locator('[data-ascension-reserve-card]').count(), 4);
      const face = page.locator(`[data-ascension-reserve-card="${theme.boxArt}"]`); await face.scrollIntoViewIfNeeded();
      await face.locator('.rpg-card__img').evaluate(n => n.decode());
      assert.equal(await page.locator('.rpg-hand__card').count(), 5, 'main de départ normale');
      assert.equal(await page.locator(`.rpg-hand__card[data-card-id="${theme.boxArt}"]`).count(), 0);
      await page.screenshot({ path: `${dossier}/deck-${mode}-${theme.id}.jpg`, type: 'jpeg', quality: 88 });
      assert.deepEqual(erreurs, []);
      console.log(`✓ Deck ${mode} — ${theme.name} : sélection réelle, 30 cartes, main de 5 et Ascension dans la réserve.`);
    } catch (e) {
      await page.screenshot({ path: `${dossier}/echec-deck-${mode}-${theme.id}.png` }).catch(() => {}); throw e;
    } finally { await page.close(); }
  }
}
