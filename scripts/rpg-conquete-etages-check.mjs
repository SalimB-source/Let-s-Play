/** Régression navigateur : npm run dev, puis npm run check:rpg-conquete-etages.
 *
 * L'écran de Conquête OUVERT dans une tour — la liste des étages. C'est celui
 * qui défilait le plus : la maquette 3D faisait 287 px de haut dans un écran de
 * 390, et les cinq étages commençaient à 759 px du bord (1334 px de page pour
 * 390 de fenêtre). Les cartes perdaient aussi 64 px de gouttière.
 *
 * Ce qui est garanti ici, sur les onze tours et aux quatre formats :
 *   - la PAGE ne défile jamais ;
 *   - aucune carte d'étage n'est rognée — nom, note, pacte et gain se lisent
 *     en entier, sans ellipse ;
 *   - la carte prend toute la largeur de la colonne de jeu ;
 *   - la liste tient en entier dès 390 px de haut (844×390, 915×412), onze
 *     tours comprises. Sous cette hauteur (568×320, 667×375), les tours hautes
 *     ne peuvent pas tenir sept noms, notes, pactes et gains dans 219 px :
 *     c'est alors la LISTE qui glisse, de façon bornée, et jamais la page.
 *
 * Le profil de test a tout déblayé : chaque tour est ouverte, et les gains
 * passent à leur forme longue (« +50 gagnés · rejeu +10 ») — le pire cas.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { RPG_STORY_TOURS } from '../src/games/rpgStoryTours.js';

// `RPG_FORMATS=844x390` pour ne rejouer qu'un format en diagnostic.
const FORMATS = process.env.RPG_FORMATS
  ? process.env.RPG_FORMATS.split(',').map((f) => f.split('x').map(Number))
  : [[568, 320], [667, 375], [844, 390], [915, 412]];
const URL = process.env.RPG_URL || 'http://localhost:5173/Let-s-Play/jeu/sablier-de-bab-el';
const TOUS_VAINCUS = RPG_STORY_TOURS.flatMap((tour) => tour.etages.map((etage) => etage.id));

/** Sur les petits paysage, la liste peut glisser : sept étages avec leur nom,
 * leur note, leur pacte et leur gain demandent ~350 px de texte lisible, et la
 * fenêtre n'en offre que 219. On borne quand même la glisse pour qu'une
 * régression (une carte qui triple de haut, une gouttière qui revient) se voie
 * au lieu de passer pour « le petit écran, normal ». */
const GLISSE_MAX = 260;

const lancer = () => chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  args: process.env.CHROMIUM_ARGS
    ? process.env.CHROMIUM_ARGS.split(/ +/)
    : ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'],
});

const mesurer = () => {
  const rect = (sel) => {
    const el = document.querySelector(sel);
    return el ? el.getBoundingClientRect().toJSON() : null;
  };
  const menu = document.querySelector('.rpg-mode-menu');
  const liste = document.querySelector('.rpg-story-tour__floors');
  const carte = document.querySelector('.rpg-story-floor');
  return {
    viewport: { w: innerWidth, h: innerHeight },
    page: { scrollH: menu.scrollHeight, clientH: menu.clientHeight, scrollTop: menu.scrollTop },
    liste: { scrollH: liste.scrollHeight, clientH: liste.clientHeight },
    detail: rect('.rpg-story__detail'),
    tete: rect('.rpg-story-tour__header'),
    gains: rect('.rpg-story-tour__gains'),
    retour: rect('.rpg-story__back'),
    tour: carte?.closest('.rpg-story-tour')?.querySelector('h3')?.textContent ?? null,
    etages: [...document.querySelectorAll('.rpg-story-floor')].map((el) => {
      const box = el.getBoundingClientRect();
      const badge = el.querySelector('.rpg-story-floor__badge')?.getBoundingClientRect();
      const gain = el.querySelector('.rpg-story-floor__gain')?.getBoundingClientRect();
      return {
        id: el.dataset.etage,
        box: box.toJSON(),
        rogne: el.scrollHeight - el.clientHeight,
        badgeDeborde: badge ? Math.max(0, badge.right - box.right) : 0,
        gainDeborde: gain ? Math.max(0, gain.right - box.right) : 0,
      };
    }),
  };
};

for (const [width, height] of FORMATS) {
  const browser = await lancer();
  try {
    const context = await browser.newContext({
      viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    });
    await context.addInitScript(([vaincus]) => {
      localStorage.setItem('letsplay_sablier_entree_v1', 'jeu');
      localStorage.setItem('letsplay_sablier_sound_v1', 'off');
      localStorage.setItem('letsplay_sablier_profil_v1', JSON.stringify({ version: 1, xp: 120, boostersOfferts: 2 }));
      localStorage.setItem('letsplay_sablier_histoire_v1', JSON.stringify({ version: 2, etagesVaincus: vaincus, recit: null }));
      for (const nom of ['requestFullscreen', 'webkitRequestFullscreen']) {
        Object.defineProperty(Element.prototype, nom, { configurable: true, value: undefined });
      }
      if (screen.orientation) {
        Object.defineProperty(screen.orientation, 'lock', { value: () => Promise.reject(new Error('unsupported')), configurable: true });
      }
    }, [TOUS_VAINCUS]);
    const page = await context.newPage();
    await page.goto(URL);
    // Le Sablier est une couche immersive : la navigation du site n'est pas
    // dans le viewport de jeu (le plein écran la recouvre ; ici on l'a
    // neutralisé pour tester). `addStyleTag` survit aux re-rendus de React,
    // contrairement à un `display: none` posé à la main sur le nœud.
    await page.addStyleTag({ content: 'nav[aria-label="Navigation principale"]{display:none !important}' });
    await page.locator('[data-accueil-jouer="conquete"], .rpg-mode-menu__hero-actions .rpg-menu-button--conquete').first().click();
    await page.locator('.rpg-conquete-carrousel .rpg-story-tower').waitFor();

    const points = page.locator('.rpg-conquete-carrousel__points button');
    const total = await points.count();
    assert.equal(total, RPG_STORY_TOURS.length, `${width}×${height} : les onze tours sont là`);
    let glisses = 0;

    for (let i = 0; i < total; i += 1) {
      await points.nth(i).click();
      await page.waitForTimeout(150);
      await page.locator('.rpg-conquete-carrousel .rpg-story-tower').click();
      await page.locator('.rpg-story-floor').first().waitFor();
      // Les polices de titre changent la mesure du texte : avant qu'elles
      // soient chargées, la note se replie sur une ligne de plus et la liste
      // paraît 90 px plus haute que ce que le joueur verra.
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);

      const m = await page.evaluate(mesurer);
      const prefixe = `${width}×${height} « ${m.tour} »`;
      assert.equal(m.etages.length, RPG_STORY_TOURS[i].etages.length, `${prefixe} : tous les étages sont listés`);
      assert.ok(m.page.scrollH <= m.page.clientH + 1, `${prefixe} : la page ne défile pas (${m.page.scrollH} > ${m.page.clientH})`);
      assert.equal(m.page.scrollTop, 0, `${prefixe} : aucun défilement de page`);

      for (const boite of [m.tete, m.gains, m.retour]) {
        assert.ok(boite && boite.top >= -1 && boite.bottom <= m.viewport.h + 1, `${prefixe} : l'en-tête tient dans l'écran`);
        assert.ok(boite.right <= m.viewport.w + 1, `${prefixe} : l'en-tête tient en largeur`);
      }

      for (const etage of m.etages) {
        assert.ok(etage.rogne <= 1, `${prefixe} ${etage.id} : texte rogné de ${etage.rogne}px`);
        assert.ok(etage.box.width >= m.detail.width - 16, `${prefixe} ${etage.id} : la carte prend toute la largeur (${etage.box.width.toFixed(0)} / ${m.detail.width.toFixed(0)})`);
        assert.ok(etage.box.left >= -1 && etage.box.right <= m.viewport.w + 1, `${prefixe} ${etage.id} : la carte tient en largeur`);
        assert.ok(etage.badgeDeborde <= 1 && etage.gainDeborde <= 1, `${prefixe} ${etage.id} : badge ou gain hors de la carte`);
      }

      const glisse = m.liste.scrollH - m.liste.clientH;
      if (height >= 390) {
        assert.ok(glisse <= 1, `${prefixe} : les ${m.etages.length} étages tiennent sans glisser (${glisse}px de trop)`);
      } else {
        assert.ok(glisse <= GLISSE_MAX, `${prefixe} : la liste déborde de ${glisse}px (max ${GLISSE_MAX})`);
        if (glisse > 1) glisses += 1;
      }

      await page.locator('.rpg-story__back').click();
      await page.locator('.rpg-conquete-carrousel .rpg-story-tower').waitFor();
    }
    console.log(`✓ ${width}×${height} — 11 tours, étages pleine largeur, aucun texte rogné, page immobile${glisses ? ` (${glisses} tour(s) à liste glissante)` : ''}`);
  } finally {
    await browser.close();
  }
}
