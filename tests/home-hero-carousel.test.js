import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { HERO_SLIDE_MS, heroSlides, heroFallbackImage } from '../src/theme/homeHero.js';

/* Diaporama du héros de l'accueil : les deux visuels fournis par le
   propriétaire (The Blood of Dawnwalker sans emblème ni titre, The Legend of
   Zelda) ont rejoint la clé d'art Phantom Blade Zero, en fondu automatique
   toutes les 3 secondes. */

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

test('diaporama : trois visuels, trois secondes, ordre Phantom → Dawnwalker → Zelda', () => {
  assert.equal(HERO_SLIDE_MS, 3000);
  assert.deepEqual(
    heroSlides.map((slide) => slide.id),
    ['phantom-blade-zero', 'dawnwalker', 'zelda'],
  );
  assert.deepEqual(
    heroSlides.map((slide) => slide.label),
    ['Phantom Blade Zero', 'The Blood of Dawnwalker', 'The Legend of Zelda'],
  );
});

test('diaporama : chaque visuel a sa variante portrait et un fichier présent', () => {
  // Le premier visuel est aussi le repli : une seule image à précharger.
  assert.equal(heroSlides[0].image, heroFallbackImage);
  for (const slide of heroSlides) {
    for (const file of [slide.image, slide.portrait]) {
      const name = file.split('/').filter(Boolean).pop();
      assert.ok(existsSync(new URL(`public/${name}`, root)), `${name} manquant dans public/`);
    }
    // Le téléphone reçoit une variante dédiée : un 16:9 recadré en portrait
    // couperait le sujet (voir le commentaire de `homeHero.js`).
    assert.notEqual(slide.portrait, slide.image);
  }
});

test('diaporama : seul le visuel lumineux demande un voile renforcé', () => {
  assert.deepEqual(
    heroSlides.map((slide) => slide.light),
    [false, false, true],
  );
});

test('accueil : le héros monte les trois visuels et fait tourner l’index toutes les 3 s', () => {
  const home = read('src/pages/Home.jsx');
  assert.match(home, /import \{ HERO_SLIDE_MS, heroFallbackImage, heroSlides \} from '\.\.\/theme\/homeHero';/);
  assert.match(home, /heroSlides\.map\(/);
  assert.match(home, /const \[activeHeroSlide, setActiveHeroSlide\] = useState\(0\)/);
  assert.match(home, /setInterval\(\(\) => \{[\s\S]*?% heroSlides\.length[\s\S]*?\}, HERO_SLIDE_MS\)/);
  // Moins d'animations demandé : pas de défilement automatique.
  assert.match(home, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches[\s\S]*?return undefined;/);
  // Le visuel actif est signalé au CSS par `is-active` (fondu enchaîné).
  assert.match(home, /index === activeHeroSlide \? ' is-active' : ''/);
});

test('styles du héros : fondu enchaîné et voile dédié au visuel lumineux', () => {
  const css = read('src/styles.css');
  assert.match(css, /\.hero-picture\{[^}]*opacity:0;transition:opacity/);
  assert.match(css, /\.hero-picture\.is-active\{opacity:1\}/);
  assert.match(css, /\.hero-picture--light::after/);
  assert.match(css, /\.hero-slides\{position:absolute;inset:0/);
  // Le fondu disparaît si l'utilisateur a demandé moins d'animations.
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\{\s*\.hero-picture\{transition:none\}/);
});
