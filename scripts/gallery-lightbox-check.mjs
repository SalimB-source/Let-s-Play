/**
 * Contrôle de la visionneuse des captures d'article — `npm run check:gallery`.
 *
 * Les galeries intégrées au corps des articles (actus, dossiers, tests) sont
 * cliquables : une capture ouvre la visionneuse, qui l'affiche en grand, sans
 * recadrage. Ce comportement est invisible pour un contrôle de rendu statique —
 * il faut vraiment cliquer. Le script monte donc la galerie dans jsdom avec la
 * vraie pile React et déroule les gestes du lecteur :
 *
 *   1. la grille : une capture = un bouton, avec son texte alternatif ;
 *   2. l'ouverture : clic sur la deuxième capture, visionneuse posée sur
 *      <body> (portail), visuel et légende attendus, page verrouillée ;
 *   3. la navigation : flèches du clavier et boutons, avec bouclage ;
 *   4. la fermeture : Échap, bouton, clic sur le fond — et pas sur le cadre —
 *      avec restitution du défilement et du focus à la vignette d'origine ;
 *   5. les cas limites : une seule capture (aucune flèche), `full` servi à la
 *      place de `src` dans la visionneuse ;
 *   6. le rendu serveur : aucune visionneuse dans le HTML initial ;
 *   7. les données : chaque visuel du catalogue porte un texte alternatif.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'node_modules', '.cache', 'gallery-lightbox-smoke');

execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'build', '--ssr', 'scripts/gallery-lightbox-smoke.jsx', '--outDir',
   path.relative(root, outDir), '--emptyOutDir', '--logLevel', 'error'],
  { cwd: root, stdio: 'inherit' },
);

/* ------------------------------------------------------------ environnement */

const dom = new JSDOM('<!doctype html><html><body><div id="page"></div></body></html>', {
  url: 'https://letsplay.test/Let-s-Play/',
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.localStorage = dom.window.localStorage;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { React, ArticleGallery, articleGalleries, renderGallery } = await import(
  path.join(outDir, 'gallery-lightbox-smoke.js')
);
const { createRoot } = await import('react-dom/client');
const act = React.act || React.default?.act;

let failures = 0;
function check(label, actual, expected) {
  const ok = Object.is(actual, expected);
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? ` → ${actual}` : ` → ${actual} (attendu : ${expected})`}`);
}
const ok = (label, condition) => check(label, Boolean(condition), true);

const { document: doc } = dom.window;
const q = (selector) => doc.querySelector(selector);
const qa = (selector) => [...doc.querySelectorAll(selector)];
const lightbox = () => q('.article-lightbox');

async function click(element) {
  await act(async () => {
    element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}
async function press(key) {
  await act(async () => {
    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
}

/* ------------------------------------------------------------------ fixture */

const GALLERY = {
  label: 'GOD OF WAR LAUFEY',
  meta: 'SANTA MONICA STUDIO · PS BLOG',
  items: [
    { src: 'screenshots/demo/01.jpg', alt: 'Faye face à Begtse', caption: '01 / Faye face à Begtse' },
    { src: 'screenshots/demo/02.jpg', full: 'screenshots/demo/02-large.jpg', alt: 'L’arc-serpent de Faye', caption: '02 / L’arc-serpent' },
    { src: 'https://cdn.test/03.jpg', alt: 'L’édition numérique Deluxe', caption: '03 / L’édition Deluxe' },
  ],
  credit: 'Visuels officiels — Santa Monica Studio.',
};

const container = q('#page');
const root2 = createRoot(container);
await act(async () => { root2.render(React.createElement(ArticleGallery, GALLERY)); });

/* -------------------------------------------------- 1. la grille est cliquable */

console.log('\n[1/7] La grille : une capture = un bouton\n');

const triggers = qa('.article-gallery-open');
check('trois captures, trois boutons', triggers.length, 3);
check('chaque bouton est un <button type="button">', triggers.every((b) => b.tagName === 'BUTTON' && b.type === 'button'), true);
check('chaque bouton annonce la capture qu’il agrandit', triggers.every((b, i) => b.getAttribute('aria-label')?.includes(GALLERY.items[i].alt)), true);
check('chaque bouton annonce sa position', triggers[1].getAttribute('aria-label').includes('2 sur 3'), true);
check('chaque bouton ouvre un dialogue', triggers.every((b) => b.getAttribute('aria-haspopup') === 'dialog'), true);
check('le texte alternatif reste sur l’image', qa('.article-gallery-open img').map((i) => i.getAttribute('alt')).join(' | '), GALLERY.items.map((i) => i.alt).join(' | '));
check('les chemins locaux prennent le préfixe du site', q('.article-gallery-open img').getAttribute('src'), '/Let-s-Play/screenshots/demo/01.jpg');
check('les URL officielles passent telles quelles', qa('.article-gallery-open img')[2].getAttribute('src'), 'https://cdn.test/03.jpg');
check('les légendes restent sous la grille', qa('.article-gallery-item figcaption').length, 3);
ok('aucune visionneuse tant qu’on n’a pas cliqué', !lightbox());

/* ------------------------------------------------------------ 2. l’ouverture */

console.log('\n[2/7] L’ouverture : clic sur la deuxième capture\n');

await click(triggers[1]);

check('la visionneuse s’ouvre', Boolean(lightbox()), true);
check('elle est posée sur <body>, hors du corps de l’article', lightbox().parentElement, doc.body);
check('c’est bien un dialogue modal', `${lightbox().getAttribute('role')}/${lightbox().getAttribute('aria-modal')}`, 'dialog/true');
check('le dialogue annonce le visuel affiché', lightbox().getAttribute('aria-label'), 'GOD OF WAR LAUFEY — visuel 2 sur 3');
check('la visionneuse sert la version large quand elle existe', q('.article-lightbox-stage img').getAttribute('src'), '/Let-s-Play/screenshots/demo/02-large.jpg');
check('le visuel garde son texte alternatif', q('.article-lightbox-stage img').getAttribute('alt'), GALLERY.items[1].alt);
check('la légende suit le visuel', q('.article-lightbox-caption').textContent, '02 / L’arc-serpent');
check('le compteur suit le visuel', q('.article-lightbox-count').textContent, '02 / 03');
check('l’en-tête rappelle le sujet', q('.article-lightbox-kicker').textContent, 'CAPTURES / GOD OF WAR LAUFEY');
check('la page ne défile plus derrière la visionneuse', doc.body.style.overflow, 'hidden');
check('le focus part sur le bouton de fermeture', doc.activeElement, q('.article-lightbox-close'));
check('les deux flèches sont là', qa('.article-lightbox-nav').length, 2);

/* ----------------------------------------------------------- 3. la navigation */

console.log('\n[3/7] La navigation : clavier et flèches, avec bouclage\n');

await press('ArrowRight');
check('flèche droite → visuel suivant', q('.article-lightbox-count').textContent, '03 / 03');
await press('ArrowRight');
check('au dernier visuel, on revient au premier', q('.article-lightbox-count').textContent, '01 / 03');
await press('ArrowLeft');
check('flèche gauche → on reboucle sur le dernier', q('.article-lightbox-count').textContent, '03 / 03');
await press('Home');
check('Début → premier visuel', q('.article-lightbox-count').textContent, '01 / 03');
await press('End');
check('Fin → dernier visuel', q('.article-lightbox-count').textContent, '03 / 03');
await click(q('.article-lightbox-next'));
check('bouton suivant → bouclage vers le premier', q('.article-lightbox-count').textContent, '01 / 03');
await click(q('.article-lightbox-prev'));
check('bouton précédent → dernier visuel', q('.article-lightbox-count').textContent, '03 / 03');
check('le visuel affiché suit le compteur', q('.article-lightbox-stage img').getAttribute('src'), 'https://cdn.test/03.jpg');
check('le texte alternatif suit lui aussi', q('.article-lightbox-stage img').getAttribute('alt'), GALLERY.items[2].alt);

/* ------------------------------------------------------------ 4. la fermeture */

console.log('\n[4/7] La fermeture : Échap, bouton, clic sur le fond\n');

await click(q('.article-lightbox-box'));
ok('un clic dans le cadre ne ferme pas', lightbox());

await press('Escape');
ok('Échap ferme la visionneuse', !lightbox());
check('le défilement de la page est rendu', doc.body.style.overflow, '');
check('le focus revient à la vignette cliquée', doc.activeElement, triggers[1]);

await click(triggers[0]);
ok('réouverture par une autre vignette', lightbox());
check('la visionneuse ouvre bien sur cette vignette', q('.article-lightbox-count').textContent, '01 / 03');
await click(q('.article-lightbox-close'));
ok('le bouton ✕ ferme', !lightbox());
check('le focus revient sur la première vignette', doc.activeElement, triggers[0]);

await click(triggers[2]);
ok('réouverture par la troisième vignette', lightbox());
await click(lightbox());
ok('un clic sur le fond ferme', !lightbox());
check('le défilement est rendu une fois de plus', doc.body.style.overflow, '');

/* ------------------------------------------------------------ 5. cas limites */

console.log('\n[5/7] Cas limites : une seule capture, galerie vide\n');

await act(async () => {
  root2.render(React.createElement(ArticleGallery, { label: 'SOLO', items: [GALLERY.items[0]] }));
});
await click(q('.article-gallery-open'));
ok('une capture seule s’ouvre quand même', lightbox());
check('aucune flèche quand il n’y a rien à parcourir', qa('.article-lightbox-nav').length, 0);
check('le compteur reste juste', q('.article-lightbox-count').textContent, '01 / 01');
await press('Escape');

await act(async () => { root2.render(React.createElement(ArticleGallery, { label: 'VIDE', items: [] })); });
check('une galerie sans visuel ne rend rien', q('.article-gallery'), null);

await act(async () => { root2.unmount(); });
check('le défilement n’est pas laissé bloqué après démontage', doc.body.style.overflow, '');

/* ----------------------------------------------------------- 6. rendu serveur */

console.log('\n[6/7] Rendu serveur : aucune visionneuse dans le HTML initial\n');

const html = renderGallery(GALLERY);
ok('la grille est rendue côté serveur', html.includes('article-gallery-grid'));
ok('les captures y sont déjà des boutons', html.includes('article-gallery-open'));
ok('aucune visionneuse dans le HTML initial', !html.includes('article-lightbox'));
ok('le crédit est rendu', html.includes('Santa Monica Studio.'));

/* --------------------------------------------------------------- 7. données */

console.log('\n[7/7] Catalogue : chaque visuel porte un texte alternatif\n');

const entries = Object.entries(articleGalleries);
const missingAlt = entries.flatMap(([key, gallery]) => (gallery.items || [])
  .map((item, index) => (item.alt && item.alt.trim() ? null : `${key} #${index + 1}`))
  .filter(Boolean));
const missingSrc = entries.flatMap(([key, gallery]) => (gallery.items || [])
  .map((item, index) => (item.src ? null : `${key} #${index + 1}`))
  .filter(Boolean));
check('galeries au catalogue', entries.length > 0, true);
check('aucun visuel sans texte alternatif', missingAlt.join(', ') || 'aucun', 'aucun');
check('aucun visuel sans source', missingSrc.join(', ') || 'aucun', 'aucun');

console.log(failures === 0
  ? '\n  OK — les captures des articles s’ouvrent en grand, se parcourent et se referment.\n'
  : `\n  ÉCHEC — ${failures} contrôle(s) en défaut.\n`);
process.exit(failures === 0 ? 0 : 1);
