/**
 * Contrôle de `src/lib/phoneLayout.js` — sans navigateur (jsdom, déjà présent
 * pour les autres vérifications).
 *
 * On simule les situations qui font qu'un téléphone reçoit la mise en page du
 * PC : écran de 390 px mais fenêtre de mise en page de 860 px (zoom de page
 * Safari, « version ordinateur »), page servie avec un viewport élargi, WebView
 * qui ignore `<meta viewport>`. On vérifie que :
 *   — le viewport est bien réécrit dans ces cas (et une seule fois) ;
 *   — un ordinateur, une tablette, un téléphone en paysage ou déjà correct ne
 *     sont jamais touchés ;
 *   — les bascules JavaScript (page /messages, barre qui ne se cache pas)
 *     suivent la même définition du téléphone.
 *
 *   npm run check:phone-layout
 */
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const CANONICAL = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
const VARIANT = 'width=device-width, initial-scale=1, viewport-fit=cover';

/**
 * Installe un faux navigateur dans les globales puis importe le module.
 * `handheld` reflète `(hover:none) and (pointer:coarse) and (max-device-width:600px)`.
 */
async function withPage({ screen, layoutWidth, layoutHeight = 0, meta, handheld, coarsePointer = true }) {
  const dom = new JSDOM(`<!doctype html><html><head><meta name="viewport" content="${meta}"></head><body></body></html>`, {
    pretendToBeVisual: true,
  });
  const { window } = dom;
  Object.defineProperty(window.screen, 'width', { value: screen[0], configurable: true });
  Object.defineProperty(window.screen, 'height', { value: screen[1], configurable: true });
  Object.defineProperty(window.document.documentElement, 'clientWidth', { value: layoutWidth, configurable: true });
  if (layoutHeight) {
    // La hauteur suit la même mise à l'échelle que la largeur (zoom de page).
    Object.defineProperty(window, 'innerHeight', { value: layoutHeight, configurable: true });
  }
  Object.defineProperty(window, 'innerWidth', { value: layoutWidth, configurable: true });
  window.matchMedia = (query) => {
    const isHandheldQuery = query.includes('max-device-width:600px');
    const wantsCoarse = query.includes('pointer:coarse');
    return {
      matches: (isHandheldQuery ? handheld : layoutWidth <= 800) && (!wantsCoarse || coarsePointer),
      addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
    };
  };

  // Les globales restent installées pendant tout le cas : le module lit
  // `window` / `document` au moment de l'appel, comme dans un navigateur.
  globalThis.window = window;
  globalThis.document = window.document;
  const mod = await import(`../src/lib/phoneLayout.js?case=${Math.random()}`);
  return {
    mod,
    dom,
    window,
    metaNode: window.document.querySelector('meta[name=viewport]'),
    restore() {
      globalThis.window = undefined;
      globalThis.document = undefined;
    },
  };
}

const cases = [
  {
    name: 'iPhone portrait, fenêtre 860 px (zoom de page) → recalcule le viewport',
    page: { screen: [390, 844], layoutWidth: 860, layoutHeight: 1875, meta: CANONICAL, handheld: true },
    check: ({ result, metaNode }) => {
      assert.equal(result, true, 'le viewport devait être réécrit');
      assert.equal(metaNode.getAttribute('content'), VARIANT);
    },
  },
  {
    name: 'iPhone portrait, page servie avec width=860 → rétablit le viewport du site',
    page: { screen: [390, 844], layoutWidth: 860, layoutHeight: 1875, meta: 'width=860, initial-scale=1.0', handheld: true },
    check: ({ result, afterFirst }) => {
      assert.equal(result, true, 'le viewport devait être rétabli');
      assert.equal(afterFirst, CANONICAL, 'le premier appel doit rétablir le viewport du site');
    },
  },
  {
    name: 'iPhone portrait, fenêtre 1024 px (version ordinateur) → recalcule',
    page: { screen: [390, 844], layoutWidth: 1024, layoutHeight: 2215, meta: CANONICAL, handheld: true },
    check: ({ result }) => assert.equal(result, true),
  },
  {
    name: 'iPhone portrait déjà correct (390 px) → ne touche à rien',
    page: { screen: [390, 844], layoutWidth: 390, layoutHeight: 844, meta: CANONICAL, handheld: true },
    check: ({ result, metaNode }) => {
      assert.equal(result, false);
      assert.equal(metaNode.getAttribute('content'), CANONICAL);
    },
  },
  {
    name: 'iPhone en paysage (844 px, largeur réelle) → ne touche à rien',
    page: { screen: [844, 390], layoutWidth: 844, layoutHeight: 390, meta: CANONICAL, handheld: false },
    check: ({ result, metaNode }) => {
      assert.equal(result, false);
      assert.equal(metaNode.getAttribute('content'), CANONICAL);
    },
  },
  {
    name: 'ordinateur 1440 px → ne touche à rien',
    page: { screen: [1440, 900], layoutWidth: 1440, layoutHeight: 900, meta: CANONICAL, handheld: false },
    check: ({ result }) => assert.equal(result, false),
  },
  {
    name: 'iPad 820 px → ne touche à rien (écran trop large pour un téléphone)',
    page: { screen: [820, 1180], layoutWidth: 900, layoutHeight: 1180, meta: CANONICAL, handheld: false },
    check: ({ result }) => assert.equal(result, false),
  },
];

let failures = 0;
for (const testCase of cases) {
  try {
    const page = await withPage(testCase.page);
    // Trois appels comme dans `main.jsx` (avant le rendu, puis +400 ms et
    // +1500 ms). Un même contenu n'est jamais écrit deux fois : au plus deux
    // écritures (viewport du site, puis variante de recalcul), puis silence.
    const writes = [page.mod.normalizePhoneViewport()];
    const afterFirst = page.metaNode.getAttribute('content');
    writes.push(page.mod.normalizePhoneViewport(), page.mod.normalizePhoneViewport());
    testCase.check({ result: writes[0], afterFirst, metaNode: page.metaNode });
    assert.ok(writes.filter(Boolean).length <= 2, `trop d'écritures : ${writes.join(', ')}`);
    assert.equal(writes[2], false, 'le troisième appel devait être sans effet');
    assert.ok([CANONICAL, VARIANT].includes(page.metaNode.getAttribute('content')), 'viewport final inattendu');
    page.restore();
    console.log(`  ok   ${testCase.name}`);
  } catch (error) {
    failures += 1;
    console.error(`  KO   ${testCase.name}\n       ${error.message}`);
  }
}

// Les bascules JavaScript suivent la même définition du téléphone : un
// téléphone à fenêtre large est « mobile » (page /messages plutôt que pop-up).
// Chaque page doit être interrogée pendant que ses globales sont installées.
const decisions = [];
for (const [label, options] of [
  ['téléphone à fenêtre large', { screen: [390, 844], layoutWidth: 1200, layoutHeight: 2400, meta: CANONICAL, handheld: true }],
  ['ordinateur', { screen: [1440, 900], layoutWidth: 1200, layoutHeight: 900, meta: CANONICAL, handheld: false }],
]) {
  // Une page à la fois : les globales doivent être celles de la page interrogée.
  const page = await withPage(options);
  decisions.push([label, page.mod.isHandheld(), page.mod.isPhoneLayout(), page.mod.SOCIAL_MOBILE_MEDIA]);
  page.restore();
}

try {
  const [phone, computer] = decisions;
  assert.equal(phone[1], true, 'téléphone à fenêtre large : isHandheld');
  assert.equal(phone[2], true, 'téléphone à fenêtre large : isPhoneLayout');
  assert.equal(phone[3].includes('max-device-width:600px'), true, 'SOCIAL_MOBILE_MEDIA doit viser la taille d’écran');
  assert.equal(computer[1], false, 'ordinateur : isHandheld');
  assert.equal(computer[2], false, 'ordinateur : isPhoneLayout');
  console.log('  ok   téléphone à fenêtre large → décisions « mobile » (page /messages, barre fixe) ; ordinateur → bureau');
} catch (error) {
  failures += 1;
  console.error(`  KO   décisions JavaScript\n       ${error.message}`);
}

if (failures) {
  console.error(`\n${failures} contrôle(s) en échec.\n`);
  process.exit(1);
}
console.log('\nOK — la détection « téléphone » résiste au zoom de page, à « version ordinateur » et aux WebViews.\n');
