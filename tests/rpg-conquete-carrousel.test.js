import { test } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function installerDom() {
  const dom = new JSDOM('<!doctype html><html lang="fr"><body></body></html>', {
    url: 'http://localhost:5173/jeu/sablier-de-bab-el',
    pretendToBeVisual: true,
  });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.SVGElement = dom.window.SVGElement;
  globalThis.Element = dom.window.Element;
  globalThis.Node = dom.window.Node;
  globalThis.CustomEvent = dom.window.CustomEvent;
  globalThis.Event = dom.window.Event;
  globalThis.MouseEvent = dom.window.MouseEvent;
  globalThis.PointerEvent = dom.window.MouseEvent;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.sessionStorage = dom.window.sessionStorage;
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  dom.window.matchMedia = () => ({
    matches: false,
    media: '',
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  });
  dom.window.scrollTo = () => {};
  dom.window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  dom.window.HTMLMediaElement.prototype.pause = () => {};
  dom.window.HTMLMediaElement.prototype.load = () => {};
  return dom;
}

/* ── La Conquête en carrousel ──────────────────────────────────────────────
   Une seule tour, en grand ; les flèches gauche/droite changent de tour (en
   boucle) ; et à la prochaine connexion, le carrousel rouvre sur la dernière
   tour jouée (mémorisée par `enregistrerDerniereTour`). */

test('Conquête : une tour à la fois, flèches en boucle, et retour sur la dernière tour jouée', async () => {
  const dom = installerDom();
  const vite = await createServer({
    server: { middlewareMode: true },
    ssr: { external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const { RPG_STORY_TOURS } = await vite.ssrLoadModule('/src/games/rpgStoryTours.js');
    const { RPG_STORY_STORAGE_KEY } = await vite.ssrLoadModule('/src/games/rpgStory.js');
    const { RPG_PROFIL_STORAGE_KEY, xpTotalDuNiveau } = await vite.ssrLoadModule('/src/games/rpgProfil.js');
    const { default: RpgDuelPage } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');

    const cliquer = async (el, label = 'élément cliquable') => {
      assert.ok(el, `${label} présent dans le DOM`);
      await act(async () => { el.click(); });
    };
    const boutonTexte = (container, selecteur, texte) => [...container.querySelectorAll(selecteur)]
      .find((el) => el.textContent.replace(/\s+/g, ' ').trim().includes(texte)) ?? null;
    const tourAffichee = (container) => container
      .querySelector('.rpg-conquete-carrousel .rpg-story-tower')?.getAttribute('data-tour') ?? null;
    const allerConquete = (container) => cliquer(
      boutonTexte(container, '.rpg-mode-menu__hero-actions .rpg-menu-button--conquete', 'Conquête'),
      'carte Conquête',
    );
    const monterSession = async (container) => {
      const root = createRoot(container);
      await act(async () => { root.render(React.createElement(RpgDuelPage, { rng: () => 0 })); });
      await act(async () => { await wait(20); });
      return root;
    };

    window.localStorage.clear();
    window.localStorage.setItem('letsplay_sablier_sound_v1', 'off');
    window.localStorage.setItem(RPG_STORY_STORAGE_KEY, JSON.stringify({ version: 2, etagesVaincus: [], recit: null }));
    window.localStorage.setItem(RPG_PROFIL_STORAGE_KEY, JSON.stringify({ version: 1, xp: xpTotalDuNiveau(2), boostersOfferts: 0 }));

    // ── Première visite : aucune tour mémorisée, le carrousel ouvre la première.
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = await monterSession(container);
    try {
      await allerConquete(container);
      assert.ok(container.querySelector('.rpg-mode-menu')?.classList.contains('rpg-mode-menu--conquete-galerie'),
        'la galerie porte la coque mobile « un seul écran »');
      assert.equal(container.querySelectorAll('.rpg-conquete-carrousel .rpg-story-tower').length, 1,
        'une seule tour est affichée à la fois');
      assert.equal(tourAffichee(container), RPG_STORY_TOURS[0].id, 'sans mémorisation, la première tour');

      // Les flèches font défiler les tours, et reviennent en boucle.
      await cliquer(container.querySelector('[data-carrousel="suivante"]'), 'flèche droite');
      assert.equal(tourAffichee(container), RPG_STORY_TOURS[1].id, 'la flèche droite avance d’une tour');
      await cliquer(container.querySelector('[data-carrousel="precedente"]'), 'flèche gauche');
      assert.equal(tourAffichee(container), RPG_STORY_TOURS[0].id, 'la flèche gauche recule d’une tour');
      await cliquer(container.querySelector('[data-carrousel="precedente"]'), 'flèche gauche (boucle)');
      assert.equal(tourAffichee(container), RPG_STORY_TOURS[RPG_STORY_TOURS.length - 1].id,
        'depuis la première, la flèche gauche boucle sur la dernière');

      // Les points de navigation sautent directement à une tour.
      await cliquer(container.querySelector('.rpg-conquete-carrousel__points button:nth-child(2)'), 'deuxième point');
      assert.equal(tourAffichee(container), RPG_STORY_TOURS[1].id, 'un point saute à sa tour');

      // Ouvrir une tour débloquée la mémorise ; au retour, le carrousel reste
      // dessus. (Seule la première tour est ouverte au départ : on y revient.)
      await cliquer(container.querySelector('.rpg-conquete-carrousel__points button:nth-child(1)'), 'premier point');
      assert.equal(tourAffichee(container), RPG_STORY_TOURS[0].id, 'retour sur la première tour');
      await cliquer(container.querySelector(`.rpg-story-tower[data-tour="${RPG_STORY_TOURS[0].id}"]`), 'la première tour (débloquée)');
      assert.ok(!container.querySelector('.rpg-mode-menu')?.classList.contains('rpg-mode-menu--conquete-galerie'),
        'le détail d’une tour garde son défilement propre (la coque ne s’applique qu’à la galerie)');
      await cliquer(container.querySelector('.rpg-story__back'), 'retour aux tours');
      assert.ok(container.querySelector('.rpg-mode-menu')?.classList.contains('rpg-mode-menu--conquete-galerie'),
        'de retour à la galerie, la coque mobile est de nouveau posée');
      assert.equal(tourAffichee(container), RPG_STORY_TOURS[0].id, 'au retour, la tour ouverte reste affichée');
      assert.equal(window.localStorage.getItem('letsplay_sablier_derniere_tour_v1'), RPG_STORY_TOURS[0].id,
        'ouvrir une tour enregistre la dernière tour jouée');
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }

    // ── Nouvelle connexion : le carrousel rouvre sur la dernière tour mémorisée.
    window.localStorage.setItem('letsplay_sablier_derniere_tour_v1', RPG_STORY_TOURS[2].id);
    const container2 = document.createElement('div');
    document.body.appendChild(container2);
    const root2 = await monterSession(container2);
    try {
      await allerConquete(container2);
      assert.equal(tourAffichee(container2), RPG_STORY_TOURS[2].id,
        'à la reconnexion, le carrousel rouvre sur la dernière tour jouée');
    } finally {
      await act(async () => root2.unmount());
      container2.remove();
    }
  } finally {
    await vite.close();
    dom.window.close();
  }
});
