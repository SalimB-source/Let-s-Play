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
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  dom.window.matchMedia = () => ({
    matches: false, media: '',
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
  });
  dom.window.scrollTo = () => {};
  dom.window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  dom.window.HTMLMediaElement.prototype.pause = () => {};
  dom.window.HTMLMediaElement.prototype.load = () => {};
  return dom;
}

/** Une journée de quêtes : la première est finie, la deuxième entamée. */
function journeeQuetes(suite = {}) {
  return {
    version: 1, jour: new Date().toISOString().slice(0, 10),
    quetes: ['creatures-10', 'duels-2', 'duels-3'],
    progres: { 'creatures-10': 10, 'duels-2': 1, 'duels-3': 0 },
    reclamations: [], cachet: false, semaine: false, serie: 3,
    debutLe: new Date().toISOString(),
    ...suite,
  };
}

/* ── L'accueil mobile : une arène, un gros bouton, des coffres ─────────────
   Le composant est monté seul (rapide, ciblé), puis la page entière est montée
   au doigt pour vérifier le geste complet : coffre prêt → tap → crédits en
   bourse → cérémonie. */

test('accueil mobile : les quêtes deviennent des coffres, et seul un coffre prêt s’ouvre', async () => {
  const dom = installerDom();
  const vite = await createServer({
    server: { middlewareMode: true },
    ssr: { external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    appType: 'custom', logLevel: 'silent',
  });
  try {
    const { default: RpgAccueilMobile } = await vite.ssrLoadModule('/src/games/RpgAccueilMobile.jsx');
    const { progressionDeXp } = await vite.ssrLoadModule('/src/games/rpgProfil.js');

    const ouverts = [];
    const ecrans = [];
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(RpgAccueilMobile, {
        quetes: journeeQuetes(),
        credits: 245,
        barreXp: progressionDeXp(120),
        nomCompte: 'Salim',
        onOuvrirQuete: (coffre) => ouverts.push(coffre),
        onOuvrirCycle: (coffre) => ouverts.push(coffre),
        onOuvrirSemaine: (coffre) => ouverts.push(coffre),
        onChangeScreen: (ecran) => ecrans.push(ecran),
      }));
    });
    await act(async () => { await wait(20); });

    try {
      // Le bandeau du joueur : niveau, pseudo, bourse.
      assert.equal(container.querySelector('[data-accueil-niveau]')?.textContent, '3');
      assert.equal(container.querySelector('.rpg-accueil-mobile__pseudo')?.textContent, 'Salim');
      assert.equal(container.querySelector('[data-accueil-credits]')?.getAttribute('data-accueil-credits'), '245');

      // Les cinq coffres, dans l'ordre, avec leur état.
      const slots = [...container.querySelectorAll('.rpg-coffres-quetes__slot')];
      assert.equal(slots.length, 5, 'trois quêtes + le cycle + la semaine');
      assert.deepEqual(slots.map((s) => s.dataset.coffreEtat), ['pret', 'encours', 'encours', 'encours', 'encours']);
      assert.deepEqual(slots.map((s) => s.dataset.coffreGenre), ['bronze', 'argent', 'or', 'royal', 'legende']);

      // Un coffre verrouillé ne répond pas ; le coffre prêt, si.
      const boutons = slots.map((s) => s.querySelector('button'));
      assert.equal(boutons[0].disabled, false, 'la quête finie donne un coffre ouvrable');
      assert.equal(boutons[1].disabled, true, 'une quête en cours garde son coffre verrouillé');
      assert.equal(boutons[3].disabled, true, 'le Coffre du cycle attend les trois quêtes');

      await act(async () => { boutons[0].click(); });
      assert.equal(ouverts.length, 1);
      assert.equal(ouverts[0].queteId, 'creatures-10');
      assert.equal(ouverts[0].credits, 60);
      assert.equal(ouverts[0].paquets, 0, 'un coffre de quête ne donne pas de cartes');

      // Les pastilles de mode changent l'arène et le bouton de jeu.
      const modes = [...container.querySelectorAll('[data-accueil-mode]')];
      assert.deepEqual(modes.map((m) => m.dataset.accueilMode), ['conquete', 'histoire', 'ligne']);
      assert.equal(container.querySelector('[data-accueil-jouer]').dataset.accueilJouer, 'conquete');
      await act(async () => { modes[1].click(); });
      assert.equal(container.querySelector('[data-accueil-jouer]').dataset.accueilJouer, 'histoire');
      assert.equal(container.querySelector('[data-accueil-arene]').dataset.accueilArene, 'histoire');

      // Le gros bouton lance le mode choisi.
      await act(async () => { modes[0].click(); });
      await act(async () => { container.querySelector('[data-accueil-jouer]').click(); });
      assert.deepEqual(ecrans, ['tours'], 'Conquérir ouvre la galerie des tours');

      // La bourse ouvre le Souk.
      await act(async () => { container.querySelector('[data-accueil-souk]').click(); });
      assert.deepEqual(ecrans, ['tours', 'souk']);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  } finally {
    await vite.close();
    dom.window.close();
  }
});

test('au doigt, la page monte l’accueil mobile et un coffre prêt verse ses crédits', async () => {
  const dom = installerDom();
  // `LetsPlayAndroid` est le drapeau natif : il force la coque tactile sans
  // dépendre d'un matchMedia que jsdom ne sait pas évaluer.
  dom.window.LetsPlayAndroid = true;
  const vite = await createServer({
    server: { middlewareMode: true },
    ssr: { external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    appType: 'custom', logLevel: 'silent',
  });
  try {
    const { RPG_STORY_STORAGE_KEY } = await vite.ssrLoadModule('/src/games/rpgStory.js');
    const { RPG_PROFIL_STORAGE_KEY } = await vite.ssrLoadModule('/src/games/rpgProfil.js');
    const { RPG_QUETES_STORAGE_KEY } = await vite.ssrLoadModule('/src/games/rpgQuetes.js');
    const { RPG_BOURSE_STORAGE_KEY } = await vite.ssrLoadModule('/src/games/rpgCredits.js');
    const { default: RpgDuelPage } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');

    window.localStorage.clear();
    window.localStorage.setItem('letsplay_sablier_sound_v1', 'off');
    window.localStorage.setItem(RPG_STORY_STORAGE_KEY, JSON.stringify({ version: 2, etagesVaincus: [], recit: null }));
    window.localStorage.setItem(RPG_PROFIL_STORAGE_KEY, JSON.stringify({ version: 1, xp: 0, boostersOfferts: 0 }));
    window.localStorage.setItem(RPG_QUETES_STORAGE_KEY, JSON.stringify(journeeQuetes()));

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => { root.render(React.createElement(RpgDuelPage, { rng: () => 0 })); });
    await act(async () => { await wait(60); });

    try {
      assert.ok(container.querySelector('.rpg-accueil-mobile'), 'au doigt, l’accueil est celui du jeu mobile');
      assert.equal(container.querySelector('.rpg-mode-menu__play'), null, 'la vitrine du bureau n’est pas montée');

      const coffre = container.querySelector('[data-coffre="quete:creatures-10"]');
      assert.equal(coffre?.dataset.coffreEtat, 'pret', 'la quête finie attend son tap');
      const avant = JSON.parse(window.localStorage.getItem(RPG_BOURSE_STORAGE_KEY) ?? '{}').credits ?? 0;

      await act(async () => { coffre.querySelector('button').click(); });
      await act(async () => { await wait(20); });

      const ceremonie = container.querySelector('[data-coffre-ouverture]');
      assert.ok(ceremonie, 'la cérémonie du coffre s’affiche');
      assert.equal(ceremonie.dataset.coffreOuverture, 'bronze');
      assert.equal(ceremonie.querySelector('[data-coffre-gain]').dataset.coffreGain, '60');
      const apres = JSON.parse(window.localStorage.getItem(RPG_BOURSE_STORAGE_KEY) ?? '{}').credits ?? 0;
      // La quête verse ses 60 ◈ dès le tap. Elle verse aussi de l'XP : si ce
      // gain fait franchir un palier, le paquet offert rembourse ses doublons
      // par-dessus. Le contrat testé est donc « au moins la récompense », et
      // c'est la cérémonie qui dit le montant exact de la quête.
      assert.ok(apres - avant >= 60, `les crédits sont en bourse dès le tap, avant la cérémonie (${apres - avant} ◈)`);

      // Le coffre est ouvert : il ne se paie pas deux fois.
      assert.equal(container.querySelector('[data-coffre="quete:creatures-10"]').dataset.coffreEtat, 'ouvert');

      await act(async () => { ceremonie.querySelector('[data-coffre-suite]').click(); });
      assert.equal(container.querySelector('[data-coffre-ouverture]'), null, '« Encaisser » referme la cérémonie');
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  } finally {
    await vite.close();
    dom.window.close();
  }
});

test('accueil mobile : le bouton refresh change une quête, une seule fois par jour', async () => {
  const dom = installerDom();
  const vite = await createServer({
    server: { middlewareMode: true },
    ssr: { external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    appType: 'custom', logLevel: 'silent',
  });
  try {
    const { default: RpgAccueilMobile } = await vite.ssrLoadModule('/src/games/RpgAccueilMobile.jsx');
    const { progressionDeXp } = await vite.ssrLoadModule('/src/games/rpgProfil.js');
    const { remplacerQuete } = await vite.ssrLoadModule('/src/games/rpgQuetes.js');

    let etat = journeeQuetes();
    const demandes = [];
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const rendre = async () => act(async () => {
      root.render(React.createElement(RpgAccueilMobile, {
        quetes: etat,
        credits: 245,
        barreXp: progressionDeXp(120),
        nomCompte: 'Salim',
        onRemplacerQuete: (queteId) => {
          demandes.push(queteId);
          const r = remplacerQuete({ etat, queteId, graine: 'compte-test' });
          if (r.ok) etat = r.etat;
          return r;
        },
      }));
    });
    await rendre();
    await act(async () => { await wait(20); });

    try {
      const boutons = () => [...container.querySelectorAll('[data-coffre-remplacer]')];
      // Deux seulement : la quête finie a son coffre prêt, et les coffres du
      // cycle et de la semaine ne sont pas des quêtes.
      assert.deepEqual(boutons().map((b) => b.dataset.coffreRemplacer), ['duels-2', 'duels-3']);
      assert.ok(boutons().every((b) => !b.disabled));

      // Le bouton est un frère du bouton principal, jamais son enfant.
      for (const b of boutons()) {
        assert.equal(b.closest('.rpg-coffres-quetes__bouton'), null, 'pas de bouton imbriqué');
        assert.equal(b.parentElement.classList.contains('rpg-coffres-quetes__slot'), true);
      }
      // Le premier bouton du slot reste celui du coffre : l'ordre compte.
      const slot = container.querySelector('[data-coffre="quete:duels-2"]');
      assert.equal(slot.querySelector('button').dataset.coffreRemplacer, undefined);

      await act(async () => { boutons()[0].click(); });
      await rendre();
      await act(async () => { await wait(20); });

      assert.deepEqual(demandes, ['duels-2']);
      assert.ok(!etat.quetes.includes('duels-2'), 'la quête a bien été changée');
      assert.equal(etat.quetes.length, 3);
      // Le droit est consommé pour toute la journée : les boutons restants
      // sont inerte, mais toujours visibles.
      assert.ok(boutons().length > 0, 'épuisé, le bouton reste visible');
      assert.ok(boutons().every((b) => b.disabled));
      assert.ok(boutons().every((b) => b.dataset.coffreRemplacerEtat === 'epuise'));

      // Cliquer un bouton épuisé ne demande rien de plus.
      await act(async () => { boutons()[0].click(); });
      assert.deepEqual(demandes, ['duels-2']);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  } finally {
    await vite.close();
    dom.window.close();
  }
});
