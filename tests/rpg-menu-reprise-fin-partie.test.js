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

/* ── Le bouton vert « Reprendre le duel en cours » ──────────────────────────
   Il n'a de sens que pour une partie **non terminée**. Un duel gagné ou perdu
   garde son bilan en mémoire, mais « Retour aux tours » ramène au menu : la
   table finie ne doit plus se proposer sous l'étagère des tours. */

test('après « Retour aux tours », un duel terminé ne propose plus de le reprendre', async () => {
  const dom = installerDom();
  const vite = await createServer({
    server: { middlewareMode: true },
    ssr: { external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const { RPG_PROFIL_STORAGE_KEY, xpTotalDuNiveau } = await vite.ssrLoadModule('/src/games/rpgProfil.js');
    const { RPG_STORY_TOURS, RPG_STORY_DECKS } = await vite.ssrLoadModule('/src/games/rpgStoryTours.js');
    const { RPG_STORY_STORAGE_KEY } = await vite.ssrLoadModule('/src/games/rpgStory.js');
    const { cardById, convertirDeckSansTerrain } = await vite.ssrLoadModule('/src/games/rpgCards.js');
    const { default: RpgDuelPage } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { passerMulligan } = await vite.ssrLoadModule('/scripts/rpg-duel-start.js');

    const premiereTour = RPG_STORY_TOURS[0];
    const premierEtage = premiereTour.etages[0];
    const originalDeckEtage = RPG_STORY_DECKS[premierEtage.deck];
    const trait = cardById('trait-de-braise');
    const originalTrait = { cost: trait.cost, effet: { ...trait.effet } };
    const baseSansTest = convertirDeckSansTerrain(['eau-de-la-source', 'trait-de-braise'])
      .filter((id) => id !== 'eau-de-la-source' && id !== 'trait-de-braise');
    const deckTest = ['eau-de-la-source', ...baseSansTest.slice(0, 27), 'trait-de-braise', 'trait-de-braise'];

    const cliquer = async (el, label = 'élément cliquable') => {
      assert.ok(el, `${label} présent dans le DOM`);
      await act(async () => { el.click(); });
    };

    const attendre = async (lecteur, label, delaiMax = 8000, container = document) => {
      const debut = Date.now();
      while (Date.now() - debut < delaiMax) {
        const choixMana = container.querySelector('.rpg-flux-choix__option:not(:disabled)');
        if (choixMana) await act(async () => { choixMana.click(); });
        const laisserPasser = container.querySelector('.rpg-annonce-sort__pass:not(:disabled)');
        if (laisserPasser) await act(async () => { laisserPasser.click(); });
        const valeur = lecteur();
        if (valeur) return valeur;
        await act(async () => { await wait(50); });
      }
      throw new Error(`Délai dépassé : ${label}`);
    };

    const boutonTexte = (container, selecteur, texte) => [...container.querySelectorAll(selecteur)]
      .find((el) => el.textContent.replace(/\s+/g, ' ').trim().includes(texte)) ?? null;

    const profilVierge = () => window.localStorage.setItem(RPG_PROFIL_STORAGE_KEY, JSON.stringify({
      version: 1,
      xp: xpTotalDuNiveau(2),
      boostersOfferts: 0,
    }));

    try {
      trait.cost = 0;
      trait.effet = { ...originalTrait.effet, amount: 99 };
      RPG_STORY_DECKS[premierEtage.deck] = Array(20).fill('tislit-des-aures');

      window.localStorage.clear();
      window.localStorage.setItem('letsplay_sablier_sound_v1', 'off');
      // Le premier étage de la première tour est ouvert, aucun n'est déblayé.
      window.localStorage.setItem(RPG_STORY_STORAGE_KEY, JSON.stringify({
        version: 2,
        etagesVaincus: [],
        recit: null,
      }));
      profilVierge();

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);
      try {
        await act(async () => {
          root.render(React.createElement(RpgDuelPage, {
            joueurDeck: deckTest,
            rng: () => 0,
          }));
        });
        await act(async () => { await wait(20); });

        // ── Une partie lancée depuis la carte « Conquête » : le bouton de
        // reprise vit sur le menu tant qu'elle n'est pas finie.
        await cliquer(boutonTexte(container, '.rpg-mode-menu__hero-actions .rpg-menu-button--conquete', 'Conquête'), 'carte Conquête');
        await cliquer(container.querySelector(`.rpg-story-tower[data-tour="${premiereTour.id}"]`), 'la première tour');
        await cliquer(container.querySelector(`.rpg-story-floor[data-etage="${premierEtage.id}"]`), 'le premier étage');
        await passerMulligan(container, cliquer);

        // Le menu de la table s'ouvre par le bouton hamburger de la barre.
        const burger = await attendre(
          () => container.querySelector('.rpg-duel-nav__burger'),
          'bouton du menu de la table',
          8000,
          container,
        );
        await cliquer(burger, 'ouvrir le menu de la table');
        await cliquer(boutonTexte(container, '.rpg-duel-nav__menu button', 'Menu'), 'bouton Menu');
        assert.ok(container.querySelector('[data-scene="menu"]'), 'le menu est affiché pendant la partie');
        assert.ok(container.querySelector('.rpg-menu-button--resume'),
          'une partie non terminée se reprend depuis le menu');
        await cliquer(container.querySelector('.rpg-menu-button--resume'), 'bouton Reprendre');
        assert.ok(container.querySelector('[data-scene="partie"]') ?? container.querySelector('.rpg-battle:not(.rpg-battle--menu)'),
          'et le bouton ramène bien sur la table');

        // ── Coup fatal : le duel est gagné.
        const carte = await attendre(
          () => container.querySelector('.rpg-hand__card[data-card-id="trait-de-braise"].is-playable'),
          'Trait de braise jouable',
          8000,
          container,
        );
        await cliquer(carte, 'carte Trait de braise');
        const confirmer = container.querySelector('.rpg-spell-confirm .rpg-btn--primary');
        if (confirmer) await cliquer(confirmer, 'confirmer le sort');
        const cible = await attendre(
          () => container.querySelector('.rpg-wizard-plate--ennemi'),
          'le sorcier adverse',
          6000,
          container,
        );
        await cliquer(cible, 'cibler le sorcier');
        await attendre(
          () => container.querySelector('.rpg-overlay:not(.rpg-overlay--loss)'),
          'écran de victoire',
          8000,
          container,
        );

        // ── « Retour aux tours » : le duel est terminé, le bouton vert s'en va.
        const retour = boutonTexte(container, '.rpg-overlay button', 'Retour aux tours');
        await cliquer(retour, 'bouton Retour aux tours');
        await act(async () => { await wait(60); });

        assert.ok(container.querySelector('[data-scene="menu"]'), 'on est bien revenu au menu');
        assert.ok(container.querySelector('.rpg-story__tours'), 'sur l’étagère des tours');
        assert.equal(container.querySelector('.rpg-menu-button--resume'), null,
          'un duel terminé ne propose plus « Reprendre le duel en cours »');
        assert.equal(boutonTexte(container, 'button', 'Reprendre le duel en cours'), null,
          'et la phrase ne traîne nulle part dans le menu');
        assert.equal(container.querySelector('.rpg-mode-menu--reprise'), null,
          'le menu ne réserve plus la place du bouton flottant');

        // ── Une nouvelle partie depuis l'étagère repropose la reprise.
        await cliquer(container.querySelector(`.rpg-story-tower[data-tour="${premiereTour.id}"]`), 'la première tour');
        await cliquer(container.querySelector(`.rpg-story-floor[data-etage="${premierEtage.id}"]`), 'le premier étage');
        await passerMulligan(container, cliquer);
        await act(async () => { await wait(60); });
        const burger2 = await attendre(
          () => container.querySelector('.rpg-duel-nav__burger'),
          'bouton du menu de la table (2e partie)',
          8000,
          container,
        );
        await cliquer(burger2, 'ouvrir le menu de la table (2e partie)');
        await cliquer(boutonTexte(container, '.rpg-duel-nav__menu button', 'Menu'), 'bouton Menu (2e partie)');
        assert.ok(container.querySelector('.rpg-menu-button--resume'),
          'la partie neuve, elle, se reprend depuis le menu');
      } finally {
        await act(async () => root.unmount());
        container.remove();
      }
    } finally {
      trait.cost = originalTrait.cost;
      trait.effet = originalTrait.effet;
      RPG_STORY_DECKS[premierEtage.deck] = originalDeckEtage;
    }
  } finally {
    await vite.close();
    dom.window.close();
  }
});
