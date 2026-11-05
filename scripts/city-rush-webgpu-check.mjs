/**
 * `npm run check:city-rush-webgpu` — l'entrée RENDU de la ville, sur la vraie
 * page, avec un moteur 3D factice et un `navigator.gpu` simulé.
 *
 * Deux moitiés :
 *   - `tests/city-rush-post.test.js` fige les règles pures (cycle, sonde,
 *     libellés, repli) ;
 *   - ce fichier monte la vraie page de conduite libre en jsdom et vérifie que
 *     l'interface, l'état React et l'usine de renderer s'accordent.
 *
 * jsdom n'a pas de WebGL : le renderer est une doublure
 * (`globalThis.__cityRushTestRenderer`), et ce qu'on juge est bien la
 * **structure** — quel moteur est demandé, quand, et ce que l'interface en dit.
 */
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'node_modules', '.cache', 'city-rush-webgpu-smoke');

execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'build', '--ssr', 'scripts/city-rush-webgpu-smoke.jsx', '--outDir', path.relative(root, outDir), '--emptyOutDir', '--logLevel', 'error'],
  { cwd: root, stdio: 'inherit' },
);

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(globalThis, 'localStorage', { value: dom.window.localStorage, configurable: true, writable: true });
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
dom.window.scrollTo = () => {};
if (!dom.window.matchMedia) {
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
}
if (!dom.window.PointerEvent) dom.window.PointerEvent = dom.window.MouseEvent;
if (!globalThis.PointerEvent) globalThis.PointerEvent = dom.window.MouseEvent;
if (!dom.window.requestAnimationFrame) dom.window.requestAnimationFrame = (callback) => setTimeout(() => callback(performance.now()), 16);
if (!globalThis.requestAnimationFrame) globalThis.requestAnimationFrame = dom.window.requestAnimationFrame;
if (!globalThis.cancelAnimationFrame) globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame;

// jsdom n'observe pas les tailles : la ville compte sur `ResizeObserver` pour
// son cadrage, on lui en donne un inerte.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Le canvas 2D de la minicarte et des rétroviseurs, et le WebGL refusé : la
// ville doit se monter sans contexte graphique grâce à la doublure de renderer.
const gradient = { addColorStop() {} };
const ctx2d = () => new Proxy({}, {
  get: (_target, key) => {
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient;
    if (key === 'measureText') return () => ({ width: 10 });
    if (key === 'getImageData') return (x, y, width, height) => ({ data: new Uint8ClampedArray(Math.max(1, width * height) * 4) });
    if (key === 'createImageData') return (width, height) => ({ data: new Uint8ClampedArray(Math.max(1, width * height) * 4) });
    if (key === 'canvas') return { width: 1, height: 1 };
    return () => {};
  },
  set: () => true,
});
dom.window.HTMLCanvasElement.prototype.getContext = function getContext(kind) {
  return kind === '2d' ? ctx2d() : null;
};

// Le renderer factice : il porte ce que la ville interroge de lui.
function fakeRenderer(mode) {
  const canvas = document.createElement('canvas');
  canvas.className = 'city-rush-canvas';
  const renderer = {
    isCityRushWebGpu: mode === 'webgpu',
    domElement: canvas,
    shadowMap: { enabled: false, type: 0, autoUpdate: true },
    capabilities: { isWebGL2: mode !== 'webgpu', getMaxAnisotropy: () => 4 },
    extensions: { has: () => false, get: () => null },
    info: { render: { calls: 0 } },
    outputColorSpace: '',
    toneMapping: 0,
    toneMappingExposure: 1,
    setPixelRatio() {},
    getPixelRatio() { return 1; },
    setSize() {},
    getSize(target) { target.width = 1000; target.height = 700; return target; },
    setRenderTarget() {},
    getRenderTarget() { return null; },
    renderCalls: 0,
    render() { this.renderCalls += 1; },
    setAnimationLoop() {},
    dispose() {},
    forceContextLoss() {},
    compile() {},
  };
  // Le dernier renderer ouvert, pour que la vérification puisse juger ce qui a
  // réellement été dessiné (et non seulement le libellé du bouton).
  globalThis.__cityRushLastRenderer = renderer;
  return renderer;
}
// Les modes demandés, dans l'ordre : la vérification juge le chemin suivi.
globalThis.__cityRushOpened = [];
globalThis.__cityRushTestRenderer = async (mode) => {
  globalThis.__cityRushOpened.push(mode);
  return fakeRenderer(mode);
};

const smoke = await import(path.join(outDir, 'city-rush-webgpu-smoke.js'));
const { checkCityRushWebGpu } = smoke;

try {
  await checkCityRushWebGpu(assert);
  console.log('check:city-rush-webgpu (interface) ✓ — WebGPU par défaut, préférences, mobile, repli, mode école, qualité et portrait vérifiés avec un renderer simulé.');
} catch (error) {
  console.error('check:city-rush-webgpu ✗');
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
}
