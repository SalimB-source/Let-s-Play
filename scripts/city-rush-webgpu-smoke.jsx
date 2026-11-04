/**
 * Fumée compilée de la ville : la **vraie page** de conduite libre, montée en
 * React, avec un moteur 3D remplacé et un `navigator.gpu` simulé.
 *
 * Ce que l'on vérifie, et que rien d'autre ne vérifie :
 *
 *   1. sans carte (le cas de la plupart des navigateurs), l'entrée RENDU suit
 *      le cycle STANDARD → CINÉMA → WEBGPU, mais ne tente jamais l'essai : elle
 *      revient au standard au lieu de promettre ;
 *   2. avec une carte et l'API, choisir WEBGPU **ouvre réellement**
 *      `WebGPURenderer` (l'import paresseux est chargé, la scène est celle de
 *      la ville) — c'est le seul endroit où son constructeur est appelé ;
 *   3. si le moteur refuse, la ville retombe sur WebGL et l'interface
 *      l'annonce (`· REPLI`), jamais un écran noir ;
 *   4. la préférence est mémorisée sur l'appareil.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ViceCityFreeRoam from '../src/games/ViceCityFreeRoam.jsx';
import {
  CITY_RUSH_GRAPHICS_PREF_KEY,
  resetCityRushWebGpuProbe,
} from '../src/games/cityRushPost.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const settle = (ms = 30) => act(async () => { await sleep(ms); });
const squash = (value) => String(value ?? '').replace(/[\s\u202f\u00a0]+/g, ' ').trim();
const click = (element) => act(async () => { element.click(); await sleep(5); });
const stored = () => window.localStorage.getItem(CITY_RUSH_GRAPHICS_PREF_KEY);

async function until(read, label, timeout = 6000) {
  const start = Date.now();
  for (;;) {
    const value = read();
    if (value) return value;
    if (Date.now() - start > timeout) throw new Error(`délai dépassé : ${label}`);
    await act(async () => { await sleep(10); });
  }
}

/** Simule (ou retire) `navigator.gpu` : API + carte, comme un vrai Chrome. */
export function setGpu(globalWindow, gpu) {
  if (gpu === null) {
    delete globalWindow.navigator.gpu;
    resetCityRushWebGpuProbe();
    return;
  }
  Object.defineProperty(globalWindow.navigator, 'gpu', {
    configurable: true,
    writable: true,
    value: gpu,
  });
  resetCityRushWebGpuProbe();
}

export async function mountFreeRoam() {
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node);
  // `onError` de React affiche l'erreur au lieu de la perdre : c'est ce qui
  // permet de savoir pourquoi une ville ne se monte pas.
  const seen = [];
  const onError = (event) => { seen.push(event?.error?.message || event?.message || String(event)); };
  window.addEventListener('error', onError);
  await act(async () => {
    root.render(<ViceCityFreeRoam carId="vice-roadster" onExit={() => {}} />);
    await sleep(20);
  });
  if (seen.length) console.log('DEBUG erreurs React:', seen.slice(0, 2));
  await until(() => node.querySelector('.vice-free-roam-graphics'), 'la barre de la ville');
  return {
    node,
    async unmount() {
      await act(async () => { root.unmount(); await sleep(10); });
      node.remove();
    },
  };
}

export function graphicsButton(node) {
  return node.querySelector('.vice-free-roam-graphics');
}

export async function checkCityRushWebGpu(assert) {
  window.localStorage.clear();
  const gpuApi = { requestAdapter: async () => ({ name: 'carte simulée' }) };

  // ── 1. Sans carte : l'entrée existe, l'essai n'est jamais tenté. ─────────
  {
    setGpu(window, null);
    const { node, unmount } = await mountFreeRoam();
    try {
      const button = graphicsButton(node);
      assert.ok(button, 'la ville porte une entrée RENDU');
      assert.equal(squash(button.textContent), '◈ STANDARD', 'le rendu par défaut');
      assert.equal(button.getAttribute('data-graphics-mode'), 'standard');
      // Le cycle traverse quand même les modes (la préférence se garde), mais
      // le moteur ne peut pas recevoir WEBGPU : la carte manque.
      await click(button);
      assert.equal(squash(graphicsButton(node).textContent), '◈ CINÉMA', 'le clic passe au cinéma');
      assert.equal(stored(), 'cinema', 'la préférence est mémorisée');
      // Sans carte, demander l'essai ne l'invente pas : le cycle retombe au
      // standard et l'annonce.
      await click(graphicsButton(node));
      assert.equal(squash(graphicsButton(node).textContent), '◈ STANDARD · REPLI', 'l’essai refusé est annoncé');
      assert.equal(graphicsButton(node).getAttribute('data-graphics-mode'), 'standard', 'l’attribut suit le mode qui tourne');
      assert.match(graphicsButton(node).getAttribute('title'), /indisponible/, 'l’infobulle explique le repli');
      // Le cycle reste complet : la prochaine pression repart au cinéma.
      await click(graphicsButton(node));
      assert.equal(squash(graphicsButton(node).textContent), '◈ CINÉMA', 'le cycle continue après un repli');
      // CINÉMA n'est pas un libellé vide : la ville passe par la chaîne de
      // post-traitement, qui redessine la scène dans sa cible HDR.
      assert.equal(node.querySelector('.vice-free-roam-world').dataset.renderPass, 'halo', 'la scène passe par la chaîne de halo');
      assert.ok(globalThis.__cityRushLastRenderer, 'un renderer a été ouvert pour le cinéma');
      // Retour au standard : la ville redessine en direct, sans chaîne.
      await click(graphicsButton(node)); // webgpu (refusé, pas de carte) → standard
      await settle(120);
      assert.equal(node.querySelector('.vice-free-roam-world').dataset.renderPass, 'direct', 'le standard ne monte aucune chaîne');
    } finally {
      await unmount();
    }
  }

  // ── 2. Avec une carte : WEBGPU ouvre réellement le moteur, et la ville
  //       accepte la scène. ─────────────────────────────────────────────────
  {
    // Une préférence d'un essai précédent ne doit pas décider pour ce test.
    window.localStorage.clear();
    setGpu(window, gpuApi);
    const opened = globalThis.__cityRushOpened;
    opened.length = 0;
    const { node, unmount } = await mountFreeRoam();
    try {
      await until(() => node.querySelector('.vice-free-roam-graphics'), 'la barre');
      // La sonde de carte est asynchrone : l'essai ne devient demandable
      // qu'une fois `navigator.gpu.requestAdapter()` revenu.
      await settle(150);
      const button = graphicsButton(node);
      await click(button); // cinéma
      await click(graphicsButton(node)); // webgpu
      assert.equal(squash(graphicsButton(node).textContent), '◈ WEBGPU · ESSAI');
      assert.equal(graphicsButton(node).getAttribute('data-graphics-mode'), 'webgpu');
      assert.equal(stored(), 'webgpu', 'l’essai survit au rechargement');
      assert.ok(opened.length >= 1, 'un renderer a été ouvert pour la ville');
      assert.ok(opened.includes('webgpu'), `le moteur WebGPU a été demandé (${opened.join(', ')})`);
      // L'ouverture est asynchrone : on attend que la scène soit montée.
      await until(() => node.querySelector('.vice-free-roam-world').dataset.cockpitMirror, 'le montage sous WebGPU');
      assert.equal(globalThis.__cityRushLastRenderer?.isCityRushWebGpu, true, 'le dernier renderer ouvert est bien le WebGPU');
      // Sous WebGPU, le rétroviseur en direct laisse la place au miroir peint :
      // `setRenderTarget` + cible flottante ne s'y comportent pas comme en WebGL.
      assert.equal(node.querySelector('.vice-free-roam-world').dataset.cockpitMirror, 'painted', 'le rétroviseur WebGPU est peint, pas rendu');
      assert.equal(node.querySelector('.vice-free-roam-world').dataset.renderPass, 'direct', 'le WebGPU ne monte pas la chaîne de halo');
    } finally {
      await unmount();
      setGpu(window, null);
    }
  }

  // ── 3. Le préférence WEBGPU retenue ne casse rien au montage suivant sans
  //       carte : la ville s'ouvre en standard, sans écran noir. ────────────
  {
    setGpu(window, null);
    window.localStorage.setItem(CITY_RUSH_GRAPHICS_PREF_KEY, 'webgpu');
    const { node, unmount } = await mountFreeRoam();
    try {
      await until(() => node.querySelector('.vice-free-roam-graphics'), 'la barre');
      await settle(200);
      const button = graphicsButton(node);
      // L'état vit dans le composant : `graphicsLive` y est publié par le
      // montage (mode réellement ouvert). On lit donc ce que le bouton reflète.
      assert.equal(button.getAttribute('data-graphics-mode'), 'standard', 'le moteur ouvert est le WebGL standard');
      assert.match(squash(button.textContent), /STANDARD/, 'sans carte, la ville revient au standard');
      assert.ok(node.querySelector('.vice-free-roam-world canvas'), 'la scène est bien montée (aucun écran noir)');
    } finally {
      await unmount();
      window.localStorage.clear();
    }
  }
}
