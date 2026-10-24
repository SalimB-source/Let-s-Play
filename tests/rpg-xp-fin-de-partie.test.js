import { test } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function installerDom({ mouvementReduit = false } = {}) {
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
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  dom.window.matchMedia = (requete) => ({
    matches: mouvementReduit && /prefers-reduced-motion/.test(requete),
    media: requete,
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

/* ── La barre d'XP de l'écran de fin de duel ────────────────────────────────
   Elle part du total d'avant la partie, monte jusqu'à celui du moment, et
   laisse voir le palier qu'elle franchit. Elle ne décide de rien : le profil
   est déjà écrit quand elle s'affiche — elle raconte. */

test('la barre d’XP de fin de duel monte du total d’avant la partie, palier compris', async () => {
  const dom = installerDom();
  const vite = await createServer({
    server: { middlewareMode: true },
    ssr: { external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const { xpTotalDuNiveau, seuilDuNiveau, progressionDeXp } = await vite.ssrLoadModule('/src/games/rpgProfil.js');
    const { BarreXpFinDeDuel } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');

    // Une partie sans palier franchi : le total monte, le niveau ne bouge pas.
    const gain = Math.min(12, seuilDuNiveau(4) - 1);
    const depart = xpTotalDuNiveau(4);
    const arrivee = depart + gain;
    const barre = progressionDeXp(arrivee);
    assert.equal(barre.niveau, progressionDeXp(depart).niveau, 'le cas de test ne franchit aucun palier');

    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    try {
      await act(async () => {
        root.render(React.createElement(BarreXpFinDeDuel, {
          depart,
          arrivee,
          legende: 'Duel perdu — les cartes posées comptent quand même.',
        }));
      });

      const bloc = host.querySelector('[data-xp-fin-de-duel]');
      assert.ok(bloc, 'la barre de fin de duel est à l’écran');
      assert.equal(bloc.dataset.xpDepart, String(depart), 'elle part du total d’avant la partie');
      assert.equal(bloc.dataset.xpCible, String(arrivee), 'et va jusqu’au total du moment');
      assert.equal(bloc.dataset.xpGain, String(gain), 'le gain de la partie est annoncé');
      assert.equal(host.querySelector('[data-xp-gain-ligne]')?.textContent.replace(/\s+/g, ' ').trim(),
        `✦ +${gain} XP`, 'le gain se lit dans son coin');

      const piste = host.querySelector('.rpg-overlay__xp-piste');
      assert.ok(piste, 'la piste est là');
      assert.equal(piste.getAttribute('role'), 'progressbar', 'et reste un vrai progressbar');
      assert.equal(host.querySelectorAll('.rpg-overlay__xp-piste i').length, 1, 'avec son remplissage');

      // La montée se joue trame par trame : à mi-chemin, le chiffre est déjà
      // entre les deux totaux — la barre ne saute pas d'un coup.
      await act(async () => { await wait(180); });
      const intermediaire = Number(host.querySelector('[data-xp-fin-de-duel]').dataset.xpValeur);
      assert.ok(intermediaire > depart && intermediaire < arrivee,
        `la barre monte progressivement (${intermediaire} entre ${depart} et ${arrivee})`);

      // Et elle arrive : total, niveau et piste sont ceux des règles.
      let valeur = intermediaire;
      for (let essai = 0; essai < 60 && valeur !== arrivee; essai += 1) {
        await act(async () => { await wait(80); });
        valeur = Number(host.querySelector('[data-xp-fin-de-duel]').dataset.xpValeur);
      }
      assert.equal(valeur, arrivee, 'la barre rejoint le total du profil');
      assert.equal(host.querySelector('[data-xp-niveau]').textContent.trim(), `Niveau ${barre.niveau}`,
        'le niveau affiché est celui des règles');
      assert.equal(piste.dataset.xpPercent, String(barre.percent), 'la piste est remplie comme les règles le disent');
      assert.match(host.querySelector('.rpg-overlay__xp-lecture').textContent, /XP/,
        'la lecture chiffrée accompagne la piste');
      assert.match(host.querySelector('.rpg-overlay__xp-legende').textContent, /Duel perdu/,
        'la légende de la défaite se lit sous la barre');
      assert.doesNotMatch(host.querySelector('.rpg-overlay__xp-lecture').textContent, /atteint/,
        'aucun palier franchi : rien n’est promis');
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }

    // Un palier franchi s'annonce, avec son paquet.
    const depart2 = xpTotalDuNiveau(3) - 4;
    const arrivee2 = depart2 + 90;
    const barre2 = progressionDeXp(arrivee2);
    assert.ok(barre2.niveau > progressionDeXp(depart2).niveau, 'le cas de test franchit bien un palier');

    const host2 = document.createElement('div');
    document.body.appendChild(host2);
    const root2 = createRoot(host2);
    try {
      await act(async () => {
        root2.render(React.createElement(BarreXpFinDeDuel, { depart: depart2, arrivee: arrivee2 }));
      });
      let lecture = '';
      for (let essai = 0; essai < 60 && !/atteint/.test(lecture); essai += 1) {
        await act(async () => { await wait(80); });
        lecture = host2.querySelector('.rpg-overlay__xp-lecture')?.textContent ?? '';
      }
      assert.match(lecture, new RegExp(`niveau ${barre2.niveau} atteint, un paquet s’ouvre`),
        'le palier franchi est annoncé, et le paquet avec');
      assert.ok(host2.querySelector('[data-xp-niveau].is-palier'),
        'le niveau prend la marque du palier');
    } finally {
      await act(async () => root2.unmount());
      host2.remove();
    }
  } finally {
    await vite.close();
    dom.window.close();
  }
});

test('avec « réduire les animations », la barre d’XP arrive tout de suite à son total', async () => {
  const dom = installerDom({ mouvementReduit: true });
  const vite = await createServer({
    server: { middlewareMode: true },
    ssr: { external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const { xpTotalDuNiveau } = await vite.ssrLoadModule('/src/games/rpgProfil.js');
    const { BarreXpFinDeDuel } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const depart = xpTotalDuNiveau(2);
    const arrivee = depart + 44;

    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    try {
      await act(async () => {
        root.render(React.createElement(BarreXpFinDeDuel, { depart, arrivee }));
      });
      await act(async () => { await wait(40); });
      assert.equal(host.querySelector('[data-xp-fin-de-duel]').dataset.xpValeur, String(arrivee),
        'sans animation, le total est écrit dès la première image');
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  } finally {
    await vite.close();
    dom.window.close();
  }
});

/* ── La vraie table : la barre apparaît sur l'écran de fin, victoire comme
   défaite, et repart de zéro à la partie suivante. ───────────────────────── */

test('la table du Sablier montre la barre d’XP à la fin du duel, gagné comme perdu', async () => {
  const dom = installerDom();
  const vite = await createServer({
    server: { middlewareMode: true },
    ssr: { external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const { RPG_PROFIL_STORAGE_KEY, xpTotalDuNiveau } = await vite.ssrLoadModule('/src/games/rpgProfil.js');
    const { RPG_STORY_TOURS } = await vite.ssrLoadModule('/src/games/rpgStoryTours.js');
    const { RPG_STORY_STORAGE_KEY } = await vite.ssrLoadModule('/src/games/rpgStory.js');
    const { cardById, convertirDeckSansTerrain } = await vite.ssrLoadModule('/src/games/rpgCards.js');
    const { default: RpgDuelPage } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { lancerDuelDepuisMenu, passerMulligan } = await vite.ssrLoadModule('/scripts/rpg-duel-start.js');

    const etagesPremiereTour = RPG_STORY_TOURS[0].etages.map((etage) => etage.id);
    const trait = cardById('trait-de-braise');
    const originalTrait = { cost: trait.cost, effet: { ...trait.effet } };
    const baseSansTest = convertirDeckSansTerrain(['eau-de-la-source', 'trait-de-braise'])
      .filter((id) => id !== 'eau-de-la-source' && id !== 'trait-de-braise');
    const deckTest = ['eau-de-la-source', ...baseSansTest.slice(0, 27), 'trait-de-braise', 'trait-de-braise'];

    const cliquer = async (el, label = 'élément cliquable') => {
      assert.ok(el, `${label} présent dans le DOM`);
      await act(async () => { el.click(); });
    };

    const attendre = async (lecteur, label, delaiMax = 6000, container = document) => {
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

    const lancerSource = async (container) => {
      const carte = await attendre(
        () => container.querySelector('.rpg-hand__card[data-card-id="eau-de-la-source"].is-playable'),
        'Eau de la source jouable en main',
        8000,
        container,
      );
      await cliquer(carte, 'carte Eau de la source');
      const confirmer = container.querySelector('.rpg-spell-confirm .rpg-btn--primary');
      if (confirmer) await cliquer(confirmer, 'confirmer Lancer le sort');
      await act(async () => { await wait(80); });
    };

    const lancerTraitDeBraise = async (container) => {
      const carte = await attendre(
        () => container.querySelector('.rpg-hand__card[data-card-id="trait-de-braise"].is-playable'),
        'Trait de braise jouable en main',
        8000,
        container,
      );
      await cliquer(carte, 'carte Trait de braise');
      const confirmer = container.querySelector('.rpg-spell-confirm .rpg-btn--primary');
      if (confirmer) await cliquer(confirmer, 'confirmer Lancer le sort');
      const cible = await attendre(
        () => container.querySelector('.rpg-wizard-plate--ennemi'),
        'cible adverse',
        5000,
        container,
      );
      await cliquer(cible, 'cibler le sorcier');
      await act(async () => { await wait(400); });
    };

    const preparer = () => {
      window.localStorage.clear();
      window.localStorage.setItem('letsplay_sablier_sound_v1', 'off');
      window.localStorage.setItem(RPG_STORY_STORAGE_KEY, JSON.stringify({
        version: 2,
        etagesVaincus: etagesPremiereTour,
        recit: null,
      }));
      window.localStorage.setItem(RPG_PROFIL_STORAGE_KEY, JSON.stringify({
        version: 1,
        xp: xpTotalDuNiveau(3) + 5,
        boostersOfferts: 0,
      }));
    };

    try {
      trait.cost = 0;
      trait.effet = { ...originalTrait.effet, amount: 99 };

      // ── Victoire : la barre monte, et son total est celui du profil écrit.
      preparer();
      const containerVictoire = document.createElement('div');
      document.body.appendChild(containerVictoire);
      const rootVictoire = createRoot(containerVictoire);
      try {
        await act(async () => {
          rootVictoire.render(React.createElement(RpgDuelPage, {
            joueurDeck: deckTest,
            sorcierDeck: Array(20).fill('tislit-des-aures'),
            rng: () => 0,
          }));
        });
        await lancerDuelDepuisMenu(containerVictoire, cliquer);
        await passerMulligan(containerVictoire, cliquer);

        assert.equal(containerVictoire.querySelector('[data-xp-fin-de-duel]'), null,
          'aucune barre de fin ne s’affiche pendant la partie');

        await lancerTraitDeBraise(containerVictoire);
        await attendre(
          () => containerVictoire.querySelector('.rpg-overlay:not(.rpg-overlay--loss)'),
          'écran de victoire',
          8000,
          containerVictoire,
        );

        const barreVictoire = containerVictoire.querySelector('[data-xp-fin-de-duel]');
        assert.ok(barreVictoire, 'la barre d’XP monte sur l’écran de victoire');
        const profilVictoire = JSON.parse(window.localStorage.getItem(RPG_PROFIL_STORAGE_KEY));
        assert.equal(barreVictoire.dataset.xpCible, String(profilVictoire.xp),
          'la cible de la barre est le total réellement écrit dans le profil');
        assert.ok(Number(barreVictoire.dataset.xpGain) >= 20,
          'le gain du duel libre (20 XP) est au moins là');
        assert.match(containerVictoire.querySelector('.rpg-overlay__xp-legende').textContent, /victoire/i,
          'et la légende parle de la victoire');

        // La montée se termine sur le total du profil.
        let valeur = Number(barreVictoire.dataset.xpValeur);
        for (let essai = 0; essai < 60 && valeur !== Number(barreVictoire.dataset.xpCible); essai += 1) {
          await act(async () => { await wait(80); });
          valeur = Number(containerVictoire.querySelector('[data-xp-fin-de-duel]').dataset.xpValeur);
        }
        assert.equal(valeur, Number(barreVictoire.dataset.xpCible), 'la barre rejoint le total de la victoire');
      } finally {
        await act(async () => rootVictoire.unmount());
        containerVictoire.remove();
      }

      // ── Défaite : les cartes posées comptent quand même, la barre le dit.
      preparer();
      const containerDefaite = document.createElement('div');
      document.body.appendChild(containerDefaite);
      const rootDefaite = createRoot(containerDefaite);
      try {
        await act(async () => {
          rootDefaite.render(React.createElement(RpgDuelPage, {
            joueurDeck: deckTest,
            sorcierDeck: deckTest,
            rng: () => 0,
          }));
        });
        await lancerDuelDepuisMenu(containerDefaite, cliquer);
        await passerMulligan(containerDefaite, cliquer);

        // Une carte posée avant de perdre : 2 XP au fil de la table.
        await lancerSource(containerDefaite);

        const btnFinTour = await attendre(
          () => containerDefaite.querySelector('.rpg-btn--endturn:not(:disabled)'),
          'bouton Fin du tour actif',
          8000,
          containerDefaite,
        );
        await cliquer(btnFinTour, 'Fin du tour');
        await attendre(
          () => containerDefaite.querySelector('.rpg-overlay.rpg-overlay--loss'),
          'écran de défaite',
          10000,
          containerDefaite,
        );

        const barreDefaite = containerDefaite.querySelector('[data-xp-fin-de-duel]');
        assert.ok(barreDefaite, 'la barre d’XP monte aussi sur l’écran de défaite');
        assert.equal(barreDefaite.dataset.xpCible,
          String(JSON.parse(window.localStorage.getItem(RPG_PROFIL_STORAGE_KEY)).xp),
          'la cible de la barre est le total écrit après la défaite');
        assert.ok(Number(barreDefaite.dataset.xpGain) >= 2,
          'les 2 XP de la carte posée sont comptées, même perdu');
        assert.match(containerDefaite.querySelector('.rpg-overlay__xp-legende').textContent, /perdu/i,
          'la défaite le dit sans effacer le gain');
      } finally {
        await act(async () => rootDefaite.unmount());
        containerDefaite.remove();
      }
    } finally {
      trait.cost = originalTrait.cost;
      trait.effet = originalTrait.effet;
    }
  } finally {
    await vite.close();
    dom.window.close();
  }
});
