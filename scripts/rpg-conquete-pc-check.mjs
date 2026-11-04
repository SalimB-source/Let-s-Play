/** Régression navigateur : npm run dev, puis npm run check:rpg-conquete-pc.
 *
 * La Conquête sur ordinateur, sans défiler. Deux écrans :
 *
 *   - la **galerie des tours** : la maquette portait un `aspect-ratio: 4/3`
 *     figé, soit 493 px de haut pour 660 de large ; la carte montait à 743 px
 *     et poussait le résumé, le bouton « Voir les étages » et la pagination
 *     sous le bord (1122 px de page pour une fenêtre de 900). C'est désormais
 *     la maquette qui absorbe la hauteur restante ;
 *   - l'**écran des étages** : empilé, il demandait 1331 px pour 900. Sur un
 *     écran large, la tour et son texte passent à gauche, les étages à droite.
 *
 * Garanti sur les onze tours et aux quatre tailles : la page ne défile pas, la
 * tour et sa description sont visibles, aucun texte n'est rogné.
 *
 * `RPG_FORMATS=1440x900` pour ne rejouer qu'une taille en diagnostic.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { RPG_STORY_TOURS } from '../src/games/rpgStoryTours.js';

const FORMATS = process.env.RPG_FORMATS
  ? process.env.RPG_FORMATS.split(',').map((f) => f.split('x').map(Number))
  : [[1280, 800], [1366, 768], [1440, 900], [1920, 1080]];
const URL = process.env.RPG_URL || 'http://localhost:5173/Let-s-Play/jeu/sablier-de-bab-el';
const TOUS_VAINCUS = RPG_STORY_TOURS.flatMap((tour) => tour.etages.map((etage) => etage.id));

/** Sur PC la colonne des étages a de la hauteur : sept cartes y tiennent.
 * On borne quand même la glisse pour qu'une régression se voie. */
const GLISSE_MAX = 120;

const lancer = () => chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  args: process.env.CHROMIUM_ARGS
    ? process.env.CHROMIUM_ARGS.split(/ +/)
    : ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'],
});

const mesurerGalerie = () => {
  const rect = (sel) => {
    const el = document.querySelector(sel);
    return el ? el.getBoundingClientRect().toJSON() : null;
  };
  const menu = document.querySelector('.rpg-mode-menu');
  const carte = document.querySelector('.rpg-conquete-carrousel .rpg-story-tower');
  const resume = document.querySelector('.rpg-conquete-carrousel .rpg-story-tower__resume');
  return {
    viewport: { w: innerWidth, h: innerHeight },
    menu: { scrollH: menu.scrollHeight, clientH: menu.clientHeight, scrollTop: menu.scrollTop },
    carte: carte ? { ...carte.getBoundingClientRect().toJSON(), rogne: carte.scrollHeight - carte.clientHeight } : null,
    art: rect('.rpg-conquete-carrousel .rpg-story-tower__art'),
    nom: rect('.rpg-conquete-carrousel .rpg-story-tower__name'),
    resume: resume ? { ...resume.getBoundingClientRect().toJSON(), rogne: resume.scrollHeight - resume.clientHeight } : null,
    cta: rect('.rpg-conquete-carrousel .rpg-story-tower__cta'),
    pagination: rect('.rpg-conquete-carrousel__pagination'),
    intro: document.querySelector('.rpg-free-tours__heading p')?.textContent ?? null,
    tour: carte?.dataset.tour ?? null,
  };
};

const mesurerEtages = () => {
  const menu = document.querySelector('.rpg-mode-menu');
  const liste = document.querySelector('.rpg-story-tour__floors');
  const rect = (sel) => {
    const el = document.querySelector(sel);
    return el ? el.getBoundingClientRect().toJSON() : null;
  };
  return {
    viewport: { w: innerWidth, h: innerHeight },
    menu: { scrollH: menu.scrollHeight, clientH: menu.clientHeight, scrollTop: menu.scrollTop },
    liste: { scrollH: liste.scrollHeight, clientH: liste.clientHeight },
    banniere: rect('.rpg-story-tour__banner'),
    description: rect('.rpg-story-tour__heading p'),
    nom: rect('.rpg-story-tour__header h3'),
    prochain: rect('.rpg-tour-prochain'),
    titre: document.querySelector('.rpg-story-tour__header h3')?.textContent ?? null,
    etages: [...document.querySelectorAll('.rpg-story-floor')].map((el) => {
      const box = el.getBoundingClientRect();
      return { id: el.dataset.etage, box: box.toJSON(), rogne: el.scrollHeight - el.clientHeight };
    }),
  };
};

for (const [width, height] of FORMATS) {
  const browser = await lancer();
  try {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    await context.addInitScript(([vaincus]) => {
      localStorage.setItem('letsplay_sablier_entree_v1', 'jeu');
      localStorage.setItem('letsplay_sablier_sound_v1', 'off');
      localStorage.setItem('letsplay_sablier_profil_v1', JSON.stringify({ version: 1, xp: 120, boostersOfferts: 2 }));
      localStorage.setItem('letsplay_sablier_histoire_v1', JSON.stringify({ version: 2, etagesVaincus: vaincus, recit: null }));
      for (const nom of ['requestFullscreen', 'webkitRequestFullscreen']) {
        Object.defineProperty(Element.prototype, nom, { configurable: true, value: undefined });
      }
    }, [TOUS_VAINCUS]);
    const page = await context.newPage();
    await page.goto(URL);
    await page.addStyleTag({ content: 'nav[aria-label="Navigation principale"]{display:none !important}' });
    await page.locator('.rpg-mode-menu__hero-actions .rpg-menu-button--conquete, [data-accueil-jouer="conquete"]').first().click();
    await page.locator('.rpg-conquete-carrousel .rpg-story-tower').waitFor();
    await page.evaluate(() => document.fonts.ready);

    const points = page.locator('.rpg-conquete-carrousel__points button');
    const total = await points.count();
    assert.equal(total, RPG_STORY_TOURS.length, `${width}×${height} : les onze tours sont là`);
    let glissesGalerie = 0;
    let glissesEtages = 0;

    for (let i = 0; i < total; i += 1) {
      await points.nth(i).click();
      await page.waitForTimeout(150);

      // ── La galerie : la carte, son résumé et son bouton tiennent ────────
      const g = await page.evaluate(mesurerGalerie);
      const pg = `${width}×${height} galerie « ${g.tour} »`;
      assert.ok(g.menu.scrollH <= g.menu.clientH + 1, `${pg} : la page ne défile pas (${g.menu.scrollH} > ${g.menu.clientH})`);
      assert.equal(g.menu.scrollTop, 0, `${pg} : aucun défilement`);
      assert.equal(g.intro, null, `${pg} : le texte d’introduction « Gravissez les tours… » a été retiré`);
      for (const [nom, boite] of [['carte', g.carte], ['maquette', g.art], ['nom', g.nom], ['résumé', g.resume], ['bouton', g.cta], ['pagination', g.pagination]]) {
        assert.ok(boite, `${pg} : ${nom} présent`);
        assert.ok(boite.top >= -1 && boite.bottom <= g.viewport.h + 1, `${pg} : ${nom} visible sans défiler (${boite.top.toFixed(0)}→${boite.bottom.toFixed(0)} pour ${g.viewport.h})`);
        assert.ok(boite.left >= -1 && boite.right <= g.viewport.w + 1, `${pg} : ${nom} tient en largeur`);
      }
      assert.ok(g.carte.rogne <= 1, `${pg} : carte rognée de ${g.carte.rogne}px`);
      assert.ok(g.resume.rogne <= 1, `${pg} : résumé rogné de ${g.resume.rogne}px`);
      assert.ok(g.art.height >= 90, `${pg} : la maquette garde une taille lisible (${g.art.height.toFixed(0)})`);

      // ── Dans la tour : la tour, son texte et les étages côte à côte ─────
      await page.locator('.rpg-conquete-carrousel .rpg-story-tower').click();
      await page.locator('.rpg-story-floor').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(200);

      const e = await page.evaluate(mesurerEtages);
      const pe = `${width}×${height} étages « ${e.titre} »`;
      assert.equal(e.etages.length, RPG_STORY_TOURS[i].etages.length, `${pe} : tous les étages sont listés`);
      assert.ok(e.menu.scrollH <= e.menu.clientH + 1, `${pe} : la page ne défile pas (${e.menu.scrollH} > ${e.menu.clientH})`);
      for (const [nom, boite] of [['maquette', e.banniere], ['nom', e.nom], ['description', e.description]]) {
        assert.ok(boite, `${pe} : ${nom} présent`);
        assert.ok(boite.top >= -1 && boite.bottom <= e.viewport.h + 1, `${pe} : ${nom} visible sans défiler (${boite.top.toFixed(0)}→${boite.bottom.toFixed(0)})`);
      }
      // Le « prochain défi » disparaît une fois la tour déblayée en entier —
      // c'est le cas du profil de test. On le vérifie seulement s'il est là.
      if (e.prochain) {
        assert.ok(e.prochain.top >= -1 && e.prochain.bottom <= e.viewport.h + 1, `${pe} : le prochain défi est visible sans défiler (${e.prochain.top.toFixed(0)}→${e.prochain.bottom.toFixed(0)})`);
      }
      // La colonne des étages est à droite de celle de la tour : côte à côte.
      assert.ok(e.etages[0].box.left > e.banniere.right - 1, `${pe} : les étages sont à côté de la tour, pas dessous`);
      for (const etage of e.etages) {
        assert.ok(etage.rogne <= 1, `${pe} ${etage.id} : texte rogné de ${etage.rogne}px`);
        assert.ok(etage.box.right <= e.viewport.w + 1, `${pe} ${etage.id} : la carte tient en largeur`);
      }
      const glisse = e.liste.scrollH - e.liste.clientH;
      assert.ok(glisse <= GLISSE_MAX, `${pe} : la colonne des étages déborde de ${glisse}px (max ${GLISSE_MAX})`);
      if (glisse > 1) glissesEtages += 1;

      await page.locator('.rpg-story__back').click();
      await page.locator('.rpg-conquete-carrousel .rpg-story-tower').waitFor();
    }
    console.log(`✓ ${width}×${height} — 11 tours : galerie et étages sans défilement, tour + description visibles${glissesEtages ? ` (${glissesEtages} colonne(s) d’étages glissante(s))` : ''}`);
  } finally {
    await browser.close();
  }
}
