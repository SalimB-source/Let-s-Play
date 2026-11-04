/** Régression navigateur : npm run dev, puis npm run check:rpg-conquete-mobile.
 * Installer le navigateur une fois : npx playwright install chromium.
 * RPG_URL, CHROMIUM_EXECUTABLE_PATH et CHROMIUM_ARGS peuvent remplacer les
 * valeurs locales par défaut.
 *
 * Sur mobile, le Sablier se joue en paysage (l'invite de rotation verrouille le
 * portrait). La galerie de Conquête doit alors tenir sur UN seul écran : la
 * carte de tour, ses flèches, le compteur et les points de pagination sont
 * visibles sans aucun défilement, et ce pour les onze tours, sur les formats
 * de téléphone courants. On vérifie aussi qu'aucun texte de la carte n'est
 * rogné (le résumé et les gains passent à la ligne, jamais d'ellipse).
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  args: process.env.CHROMIUM_ARGS
    ? process.env.CHROMIUM_ARGS.split(/ +/)
    : ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'],
});

// Formats paysage de téléphone / petite tablette tactile.
const FORMATS = [[568, 320], [667, 375], [844, 390], [915, 412]];
const URL = process.env.RPG_URL || 'http://localhost:5173/Let-s-Play/jeu/sablier-de-bab-el';

const mesurer = () => {
  const rect = (sel) => {
    const el = document.querySelector(sel);
    return el ? el.getBoundingClientRect().toJSON() : null;
  };
  const menu = document.querySelector('.rpg-mode-menu');
  const card = document.querySelector('.rpg-conquete-carrousel .rpg-story-tower');
  const body = document.querySelector('.rpg-conquete-carrousel .rpg-story-tower__body');
  return {
    viewport: { w: innerWidth, h: innerHeight },
    menu: { scrollH: menu.scrollHeight, clientH: menu.clientHeight, scrollTop: menu.scrollTop },
    card: rect('.rpg-conquete-carrousel .rpg-story-tower'),
    art: rect('.rpg-conquete-carrousel .rpg-story-tower__art'),
    body: rect('.rpg-conquete-carrousel .rpg-story-tower__body'),
    cta: rect('.rpg-conquete-carrousel .rpg-story-tower__cta'),
    pagination: rect('.rpg-conquete-carrousel__pagination'),
    fleches: [...document.querySelectorAll('.rpg-conquete-carrousel__fleche')].map((f) => f.getBoundingClientRect().toJSON()),
    cardDeborde: card ? card.scrollHeight - card.clientHeight : 0,
    bodyDeborde: body ? body.scrollHeight - body.clientHeight : 0,
    tour: card?.dataset.tour ?? null,
  };
};

try {
  // Un seul contexte : certains Chromium de conteneur (`--single-process`)
  // meurent à la fermeture d'un second contexte. On change simplement le
  // format du viewport et on recharge la page entre chaque taille.
  const context = await browser.newContext({
    viewport: { width: FORMATS[0][0], height: FORMATS[0][1] },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  await context.addInitScript(() => {
    localStorage.setItem('letsplay_sablier_entree_v1', 'jeu');
    localStorage.setItem('letsplay_sablier_sound_v1', 'off');
    // Un profil déjà actif évite les coffrets / cérémonies de bienvenue.
    localStorage.setItem('letsplay_sablier_profil_v1', JSON.stringify({ version: 1, xp: 1, boostersOfferts: 0 }));
    for (const name of ['requestFullscreen', 'webkitRequestFullscreen']) {
      Object.defineProperty(Element.prototype, name, { configurable: true, value: undefined });
    }
    if (screen.orientation) {
      Object.defineProperty(screen.orientation, 'lock', { value: () => Promise.reject(new Error('unsupported')), configurable: true });
    }
  });
  const page = await context.newPage();
  for (const [width, height] of FORMATS) {
    await page.setViewportSize({ width, height });
    await page.goto(URL);
    await page.locator('.rpg-mode-menu__hero-actions .rpg-menu-button--conquete').click();
    await page.locator('.rpg-conquete-carrousel .rpg-story-tower').waitFor();
    // Le Sablier est une couche plein écran : la navigation du site n'est pas
    // dans le viewport de jeu (elle est masquée par la couche immersive).
    await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Navigation principale"]');
      if (nav) nav.style.display = 'none';
    });

    const points = page.locator('.rpg-conquete-carrousel__points button');
    const total = await points.count();
    assert.equal(total, 11, `${width}×${height} : les onze tours ont leur point de pagination`);

    for (let i = 0; i < total; i += 1) {
      await points.nth(i).click();
      await page.waitForTimeout(180);
      const m = await page.evaluate(mesurer);
      const prefixed = `${width}×${height} tour ${m.tour}`;
      assert.ok(m.menu.scrollH <= m.menu.clientH + 1, `${prefixed} : le menu ne défile pas (${m.menu.scrollH} > ${m.menu.clientH})`);
      assert.equal(m.menu.scrollTop, 0, `${prefixed} : aucun défilement vertical`);
      assert.ok(m.card && m.card.top >= -1 && m.card.left >= -1, `${prefixed} : la carte commence dans l'écran`);
      assert.ok(m.card.bottom <= m.viewport.h + 1, `${prefixed} : le bas de la carte tient (${m.card.bottom.toFixed(0)} ≤ ${m.viewport.h})`);
      assert.ok(m.card.right <= m.viewport.w + 1, `${prefixed} : la droite de la carte tient`);
      assert.ok(m.art && m.art.height >= 50, `${prefixed} : la maquette garde une hauteur lisible (${m.art?.height})`);
      assert.ok(m.body && m.body.bottom <= m.card.bottom + 1, `${prefixed} : le texte ne sort pas de la carte`);
      assert.ok(m.cta && m.cta.bottom <= m.card.bottom + 1, `${prefixed} : « Voir les étages » reste dans la carte`);
      assert.ok(m.pagination && m.pagination.bottom <= m.viewport.h + 1, `${prefixed} : la pagination reste visible (${m.pagination?.bottom.toFixed(0)} ≤ ${m.viewport.h})`);
      assert.ok(m.cardDeborde <= 1, `${prefixed} : aucun contenu de carte rogné (${m.cardDeborde}px)`);
      assert.ok(m.bodyDeborde <= 1, `${prefixed} : aucun texte de carte rogné (${m.bodyDeborde}px)`);
      for (const f of m.fleches) {
        assert.ok(f.top >= -1 && f.bottom <= m.viewport.h + 1 && f.left >= -1 && f.right <= m.viewport.w + 1, `${prefixed} : une flèche sort de l'écran`);
      }
    }
    console.log(`✓ ${width}×${height} — les 11 cartes de tour tiennent sans défilement`);
  }
  await context.close();
} finally {
  await browser.close();
}
