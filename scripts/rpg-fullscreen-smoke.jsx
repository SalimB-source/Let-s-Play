/**
 * Entrée SSR utilisée par scripts/rpg-fullscreen-check.mjs —
 * `npm run check:rpg-fullscreen`.
 *
 * Joue le plein écran du Sablier dans jsdom, avec la vraie page
 * (`/jeu/sablier-de-bab-el`) : le menu (Jouer, Histoire, Decks, Catalogue) et le
 * duel. jsdom n'a pas de Fullscreen API : on en installe une doublure qui répond
 * comme un navigateur (la demande aboutit un instant plus tard, puis
 * `fullscreenchange` part), qu'on peut aussi faire refuser, ou fermer « de
 * l'extérieur » (Échap, geste « retour » d'Android).
 *
 *   0. Plein écran « de base » : la page se lance en plein écran — la coque
 *      (`.rpg-battle`, couche fixe) porte `is-immersive` dès le montage, sans
 *      geste, et le verrou de défilement est posé. Le natif attend le premier
 *      geste du joueur (le navigateur refuse une demande hors geste).
 *   1. Le premier geste (clic dans le menu) demande le plein écran natif sur la
 *      coque du jeu — pas sur `<html>` : le site entier ne part pas en plein
 *      écran, seul le Sablier.
 *   2. Lancer le duel : le même nœud reste en plein écran (le nœud de la coque
 *      survit au changement d'écran), le bouton de la barre du duel est allumé.
 *   3. Retour au menu depuis le duel : le plein écran reste ouvert — la session
 *      de paysage ne possède plus le plein écran et ne le referme plus.
 *   4. Touche F : ferme puis rouvre, au menu comme en duel ; F majuscule aussi ;
 *      Ctrl/Cmd/Alt + F et touche maintenue restent au navigateur.
 *   5. Saisie de texte : un « f » tapé dans un champ ne bascule rien, un clic
 *      dans un champ ne demande pas le natif.
 *   6. Le navigateur referme le plein écran (Échap, « retour » Android) : la
 *      page suit, le jeu reste jouable, la touche qui vient de refermer ne
 *      rouvre rien, et relancer une partie le rouvre.
 *   7. Un étage du mode Histoire se lance aussi en plein écran dans le geste.
 *   8. Sans Fullscreen API (iPhone, iframe) : la couche fixe seule suffit, F la
 *      retire sans appeler `exitFullscreen`.
 *   9. Démontage : le verrou de défilement est rendu et le plein écran refermé.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const squash = (value) => String(value ?? '').replace(/[\s\u202f\u00a0]+/g, ' ').trim();

async function mountPage() {
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node);
  await act(async () => root.render(<RpgDuelPage rng={() => 0.999} />));
  await act(async () => { await sleep(20); });
  return { node, unmount: async () => { await act(async () => root.unmount()); node.remove(); } };
}

const click = (element) => act(async () => { element.click(); });
const settle = (ms = 20) => act(async () => { await sleep(ms); });

/** Appuie sur une touche depuis `target` ; rend l'évènement pour lire `defaultPrevented`. */
async function press(key, init = {}, target = window) {
  const event = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  await act(async () => { target.dispatchEvent(event); });
  return event;
}

/** Un doigt (ou une souris) qui se pose dans le jeu. */
const touch = (element) => act(async () => {
  element.dispatchEvent(new window.Event('pointerdown', { bubbles: true }));
});

/**
 * Fullscreen API de remplacement. `element` est l'élément en plein écran ;
 * `requests` et `exits` comptent les appels. `refuse` : la demande est rejetée.
 * `browserExit()` : le navigateur referme de lui-même (Échap, geste « retour »).
 */
function installFullscreenApi() {
  const api = { element: null, requests: 0, exits: 0, refuse: false };
  const later = (work) => new Promise((resolve) => queueMicrotask(() => { work(); resolve(); }));
  const changed = () => document.dispatchEvent(new window.Event('fullscreenchange'));
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => api.element });
  window.HTMLElement.prototype.requestFullscreen = function requestFullscreen() {
    api.requests += 1;
    if (api.refuse) return Promise.reject(new TypeError('Fullscreen request denied'));
    return later(() => { api.element = this; changed(); });
  };
  document.exitFullscreen = function exitFullscreen() {
    api.exits += 1;
    if (!api.element) return Promise.reject(new TypeError('Document not active'));
    return later(() => { api.element = null; changed(); });
  };
  api.browserExit = () => act(async () => { api.element = null; changed(); await sleep(5); });
  api.uninstall = () => {
    delete document.fullscreenElement;
    delete document.exitFullscreen;
    delete window.HTMLElement.prototype.requestFullscreen;
  };
  return api;
}

// ── Lecture de la page ──────────────────────────────────────────────────────

const OPEN = { native: true, layer: true, locked: true, pressed: 'true' };
const LAYER_ONLY = { native: false, layer: true, locked: true, pressed: 'true' };
const CLOSED = { native: false, layer: false, locked: false, pressed: 'false' };

const shellOf = (node) => node.querySelector('.rpg-battle');
const menuToggleOf = (node) => node.querySelector('.rpg-mode-menu__fullscreen');
const duelToggleOf = (node) => node.querySelector('.rpg-duel-nav__fullscreen');
const toggleOf = (node) => menuToggleOf(node) ?? duelToggleOf(node);
const launchOf = (node) => node.querySelector('.rpg-mode-menu__play .rpg-menu-button--primary');
const menuTabOf = (node, label) => [...node.querySelectorAll('.rpg-mode-menu__switch button')]
  .find((button) => squash(button.textContent).includes(label));
const storyFloorOf = (node) => node.querySelector('.rpg-story-floor.is-next:not(:disabled)');
const duelMenuButtonOf = (node) => [...node.querySelectorAll('.rpg-duel-nav button')]
  .find((button) => squash(button.textContent) === 'Menu');

/** Plein écran de la coque : natif, couche fixe, verrou de défilement, bouton allumé. */
const stateOf = (node, api) => ({
  native: api.element !== null && api.element === shellOf(node),
  layer: shellOf(node).classList.contains('is-immersive'),
  locked: document.body.classList.contains('game-immersive-lock'),
  pressed: toggleOf(node)?.getAttribute('aria-pressed') ?? null,
});

const counts = (api) => ({ requests: api.requests, exits: api.exits });
const since = (api, before) => ({ requests: api.requests - before.requests, exits: api.exits - before.exits });

export async function checkRpgFullscreen(assert) {
  window.localStorage.clear();
  const api = installFullscreenApi();
  try {
    // ── 0-6. Le plein écran vit du menu au duel ────────────────────────────
    {
      const { node, unmount } = await mountPage();
      const coqueAuMontage = shellOf(node);
      assert.ok(coqueAuMontage, 'la coque du Sablier est rendue dès l’ouverture de la page');
      assert.equal(coqueAuMontage.dataset.scene, 'menu', 'la page s’ouvre sur le menu, avant toute partie');

      // 0. Plein écran « de base » : la couche fixe couvre le viewport sans
      // geste ; le natif attend le premier geste du joueur.
      assert.deepEqual(stateOf(node, api), LAYER_ONLY, 'l’interface se lance en plein écran de base, menu compris');
      assert.deepEqual(counts(api), { requests: 0, exits: 0 }, 'aucune demande native avant un geste du joueur');
      const bouton = menuToggleOf(node);
      assert.ok(bouton, 'le menu propose son bouton « plein écran »');
      assert.equal(bouton.getAttribute('aria-pressed'), 'true', 'le bouton reflète le plein écran de base');
      assert.equal(bouton.getAttribute('aria-label'), 'Quitter le plein écran');
      assert.match(bouton.title, /\(F\)/, 'l’infobulle annonce la touche F');
      assert.ok(bouton.querySelector('svg.rpg-fullscreen-icon'), 'icône dessinée en SVG (pas de glyphe absent des polices)');
      assert.ok(bouton.classList.contains('is-on'), 'le bouton est allumé tant que le plein écran est voulu');

      // 1. Le premier geste demande le plein écran natif — sur la coque du jeu.
      await touch(coqueAuMontage);
      await settle();
      assert.deepEqual(stateOf(node, api), OPEN, 'le premier geste ouvre le plein écran natif');
      assert.deepEqual(since(api, { requests: 0, exits: 0 }), { requests: 1, exits: 0 }, 'une seule demande native');
      assert.notEqual(api.element, document.documentElement, 'le Sablier part en plein écran, pas toute la page du site');
      assert.equal(api.element, coqueAuMontage, 'la cible est la coque du jeu');

      // 2. Lancer le duel : le plein écran traverse le changement d'écran.
      await click(launchOf(node));
      await settle();
      const coqueEnDuel = shellOf(node);
      assert.equal(coqueEnDuel.dataset.scene, 'duel', 'le duel est lancé');
      assert.equal(coqueEnDuel, coqueAuMontage, 'la coque est le même nœud : le navigateur ne referme pas le plein écran');
      assert.deepEqual(stateOf(node, api), OPEN, 'le duel continue en plein écran');
      assert.equal(api.element, coqueEnDuel, 'le plein écran natif porte toujours sur la coque');
      const boutonDuel = duelToggleOf(node);
      assert.ok(boutonDuel, 'la barre du duel a son bouton « plein écran »');
      assert.equal(boutonDuel.getAttribute('aria-pressed'), 'true', 'le bouton du duel reflète le plein écran');
      assert.match(boutonDuel.title, /\(F\)/, 'l’infobulle du duel annonce la touche F');
      assert.ok(boutonDuel.querySelector('svg.rpg-fullscreen-icon'), 'même icône SVG dans la barre du duel');

      // 4. Touche F : ferme, puis rouvre (depuis le duel).
      const avantF = counts(api);
      await press('f');
      await settle();
      assert.deepEqual(stateOf(node, api), CLOSED, 'F referme le plein écran natif et rend la page');
      assert.deepEqual(since(api, avantF), { requests: 0, exits: 1 }, 'F passe par exitFullscreen');
      assert.equal(duelToggleOf(node).getAttribute('aria-pressed'), 'false', 'le bouton du duel s’éteint');
      assert.equal(duelToggleOf(node).getAttribute('aria-label'), 'Jouer en plein écran');
      await press('F');
      await settle();
      assert.deepEqual(stateOf(node, api), OPEN, 'F majuscule rouvre le plein écran, en duel comme au menu');

      // 4 bis. Les combinaisons du navigateur et la touche maintenue ne font rien.
      const avantCombos = counts(api);
      for (const init of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { repeat: true }]) {
        const event = await press('f', init);
        assert.equal(event.defaultPrevented, false, `F avec ${JSON.stringify(init)} reste au navigateur`);
      }
      await settle();
      assert.deepEqual(since(api, avantCombos), { requests: 0, exits: 0 }, 'aucune bascule sur une combinaison ou une touche maintenue');

      // 5. Un « f » tapé dans un champ de saisie ne bascule rien.
      const champ = document.createElement('input');
      document.body.append(champ);
      const avantSaisie = counts(api);
      const eventSaisie = await press('f', {}, champ);
      assert.equal(eventSaisie.defaultPrevented, false, 'la saisie du nom d’un deck garde la touche f');
      await settle();
      assert.deepEqual(since(api, avantSaisie), { requests: 0, exits: 0 }, 'rien ne bascule pendant la saisie');
      // Un clic dans un champ ne demande pas non plus le natif.
      await act(async () => { api.element = null; });
      await touch(champ);
      await settle();
      assert.equal(api.requests, avantSaisie.requests, 'un geste dans un champ ne demande pas le plein écran');
      champ.remove();
      await act(async () => { api.element = coqueEnDuel; document.dispatchEvent(new window.Event('fullscreenchange')); });
      await settle();

      // 3. Retour au menu : le plein écran reste ouvert.
      await click(duelMenuButtonOf(node));
      await settle();
      assert.equal(shellOf(node).dataset.scene, 'menu', 'le menu est revenu');
      assert.deepEqual(stateOf(node, api), OPEN, 'quitter le duel ne referme pas le plein écran du menu');
      assert.deepEqual(since(api, avantF), { requests: 1, exits: 1 }, 'la session de paysage ne referme plus le plein écran');
      assert.equal(shellOf(node), coqueAuMontage, 'un seul et même nœud du menu au duel');

      // 6. Le navigateur referme (Échap, geste « retour » d'Android) : la page
      // suit, le jeu reste jouable, et relancer une partie rouvre l'écran. La
      // touche qui referme ne le rouvre pas dans la foulée, même quand le
      // navigateur n'a pas encore envoyé son `fullscreenchange`.
      await act(async () => { api.element = null; });
      const avantEchap = counts(api);
      await press('Escape');
      await settle();
      assert.deepEqual(since(api, avantEchap), { requests: 0, exits: 0 }, 'Échap ne rouvre pas le plein écran qu’il vient de fermer');
      await api.browserExit();
      assert.deepEqual(stateOf(node, api), CLOSED, 'une sortie du navigateur rend la mise en page de la page');
      assert.ok(shellOf(node).dataset.scene, 'le jeu reste affiché et jouable dans la couche fixe');
      await click(launchOf(node));
      await settle();
      assert.deepEqual(stateOf(node, api), OPEN, 'relancer une partie rouvre le plein écran dans le geste');
      assert.equal(shellOf(node).dataset.scene, 'duel', 'le duel est reparti');

      await unmount();
      assert.equal(api.element, null, 'quitter la page referme le plein écran');
      assert.equal(document.body.classList.contains('game-immersive-lock'), false, 'quitter la page rend le défilement');
    }

    // ── 7. Le mode Histoire se lance en plein écran, dans le geste ─────────
    {
      const { node, unmount } = await mountPage();
      await click(menuTabOf(node, 'Histoire'));
      await settle();
      const etage = storyFloorOf(node);
      assert.ok(etage, 'le premier étage de l’Histoire est jouable');
      await click(etage);
      await settle();
      assert.deepEqual(stateOf(node, api), OPEN, 'un étage du mode Histoire se lance en plein écran');
      assert.equal(shellOf(node).dataset.scene, 'duel', 'le duel de l’étage est ouvert');
      await unmount();
    }

    // ── 8. Sans Fullscreen API (iPhone, iframe) : la couche fixe suffit ────
    {
      api.uninstall();
      const { node, unmount } = await mountPage();
      assert.deepEqual(stateOf(node, api), { ...LAYER_ONLY, native: false },
        'le plein écran de base tient sans Fullscreen API');
      await touch(shellOf(node));
      await settle();
      assert.deepEqual(stateOf(node, api), { ...LAYER_ONLY, native: false },
        'un geste ne casse rien quand le navigateur n’a pas l’API');
      await press('f');
      await settle();
      assert.deepEqual(stateOf(node, api), CLOSED, 'F retire la couche fixe sans appeler exitFullscreen');
      await click(launchOf(node));
      await settle();
      assert.deepEqual(stateOf(node, api), { ...LAYER_ONLY, native: false },
        'le duel se lance dans la couche fixe, qui couvre tout le viewport');
      await unmount();
      assert.equal(document.body.classList.contains('game-immersive-lock'), false, 'le défilement est rendu même sans API');
    }

    // ── 9. Le navigateur refuse (politique, iframe sans allowfullscreen) ───
    {
      const refusee = installFullscreenApi();
      refusee.refuse = true;
      const { node, unmount } = await mountPage();
      await touch(shellOf(node));
      await settle();
      assert.deepEqual(stateOf(node, refusee), LAYER_ONLY, 'une demande refusée laisse la couche fixe, qui suffit pour jouer');
      assert.equal(refusee.element, null, 'rien n’est en plein écran natif');
      await unmount();
      refusee.uninstall();
    }
  } finally {
    api.uninstall();
    document.body.classList.remove('game-immersive-lock');
  }
}
