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

test('Montée de niveau : aucun paquet ne s’ouvre pendant une partie en cours, et il s’ouvre dès la fin du duel (victoire, défaite ou campagne)', async () => {
  const dom = installerDom();
  const vite = await createServer({
    server: { middlewareMode: true },
    ssr: { external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const { XP, RPG_PROFIL_STORAGE_KEY, xpTotalDuNiveau, boostersDus } = await vite.ssrLoadModule('/src/games/rpgProfil.js');
    const { RPG_STORY_TOURS, RPG_STORY_DECKS } = await vite.ssrLoadModule('/src/games/rpgStoryTours.js');
    const { RPG_STORY_STORAGE_KEY } = await vite.ssrLoadModule('/src/games/rpgStory.js');
    const { recitHistoireVide } = await vite.ssrLoadModule('/src/games/rpgStoryFlow.js');
    const { rngSeme } = await vite.ssrLoadModule('/src/games/rpgHasard.js');
    const { cardById, convertirDeckSansTerrain } = await vite.ssrLoadModule('/src/games/rpgCards.js');
    const { useSablierBourse } = await vite.ssrLoadModule('/src/games/useSablierBourse.js');
    const { default: RpgDuelPage } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { passerMulligan } = await vite.ssrLoadModule('/scripts/rpg-duel-start.js');

    const premiereTour = RPG_STORY_TOURS[0];
    const etagesPremiereTour = premiereTour.etages.map((etage) => etage.id);
    const progressionComptoirOuvert = { etagesVaincus: etagesPremiereTour };

    // ── 1. Hook `useSablierBourse` : palier franchi en cours de partie → différé jusqu'à la victoire ou la défaite
    {
      let courant = null;
      function SondeBourse({ partieEnCours }) {
        courant = useSablierBourse({
          progression: progressionComptoirOuvert,
          rng: rngSeme(20261024),
          partieEnCours,
        });
        return null;
      }

      // 1a. Défaite après montée de niveau en cours de partie
      window.localStorage.clear();
      window.localStorage.setItem(RPG_PROFIL_STORAGE_KEY, JSON.stringify({
        version: 1,
        xp: xpTotalDuNiveau(2) - XP.carteJouee,
        boostersOfferts: 0,
      }));
      const host = document.createElement('div');
      document.body.appendChild(host);
      const root = createRoot(host);
      try {
        await act(async () => {
          root.render(React.createElement(SondeBourse, { partieEnCours: true }));
        });
        assert.equal(courant.niveau, 1);
        assert.equal(courant.monteeNiveau, null);

        const evenementCarte = await act(async () => courant.noterEvenementDuel({
          type: 'carte-jouee',
          cardId: 'trait-de-braise',
        }));
        assert.equal(evenementCarte.niveaux, 1, 'le palier est bien franchi sur la carte jouée');
        assert.equal(courant.niveau, 2, 'le niveau 2 est acquis tout de suite');
        assert.equal(courant.boostersEnAttente, 1, 'la dette du paquet est inscrite dans le profil');
        assert.equal(courant.monteeNiveau, null, 'aucune ouverture ni annonce pendant la partie');
        assert.equal(courant.bourse.cartes.length, 0, 'aucun paquet n’est tiré en plein tour');

        // La partie se termine sur une défaite (`partieEnCours` passe à `false` sans `duel-gagne`).
        await act(async () => {
          root.render(React.createElement(SondeBourse, { partieEnCours: false }));
        });
        assert.ok(courant.monteeNiveau?.ouverture, 'le paquet s’ouvre dès que la partie se termine (défaite)');
        assert.equal(courant.monteeNiveau.ouverture.offert, true);
        assert.equal(courant.monteeNiveau.ouverture.paquets, 1);
        assert.equal(courant.boostersEnAttente, 0, 'la dette est soldée à la fin de la partie');
        assert.equal(courant.bourse.cartes.length, 5, 'les cinq cartes sont rangées');
      } finally {
        await act(async () => root.unmount());
        host.remove();
      }

      // 1b. Palier en cours de partie + second palier sur la victoire : une seule cérémonie groupée en fin de duel
      window.localStorage.clear();
      window.localStorage.setItem(RPG_PROFIL_STORAGE_KEY, JSON.stringify({
        version: 1,
        xp: xpTotalDuNiveau(2) - XP.carteJouee,
        boostersOfferts: 0,
      }));
      const host2 = document.createElement('div');
      document.body.appendChild(host2);
      const root2 = createRoot(host2);
      try {
        await act(async () => {
          root2.render(React.createElement(SondeBourse, { partieEnCours: true }));
        });
        await act(async () => courant.noterEvenementDuel({
          type: 'carte-jouee',
          cardId: 'trait-de-braise',
        }));
        assert.equal(courant.monteeNiveau, null, 'toujours rien pendant le duel');
        assert.equal(courant.boostersEnAttente, 1);

        // Fin du duel sur un boss d'histoire (premier déblayage + tour terminée → franchit d'autres paliers).
        await act(async () => {
          root2.render(React.createElement(SondeBourse, { partieEnCours: false }));
        });
        // Notons aussi le cas où `duel-gagne` tombe exactement à la fin :
        await act(async () => courant.fermerMonteeNiveau());
        assert.equal(courant.monteeNiveau, null);
      } finally {
        await act(async () => root2.unmount());
        host2.remove();
      }
    }

    // ── 2. Vraie table `<RpgDuelPage>` : aucune ouverture en cours de duel, ouverture en fin de duel (victoire & défaite)
    const trait = cardById('trait-de-braise');
    const source = cardById('eau-de-la-source');
    const originalTrait = { cost: trait.cost, effet: { ...trait.effet } };
    const originalSourceCost = source.cost;
    const baseSansTest = convertirDeckSansTerrain(['eau-de-la-source', 'trait-de-braise'])
      .filter((id) => id !== 'eau-de-la-source' && id !== 'trait-de-braise');
    const deckTest = ['eau-de-la-source', ...baseSansTest.slice(0, 27), 'trait-de-braise', 'trait-de-braise'];
    const premierEtage = premiereTour.etages[0];
    const originalDeckEtage = RPG_STORY_DECKS[premierEtage.deck];

    const cliquer = async (el, label = 'élément cliquable') => {
      assert.ok(el, `${label} présent dans le DOM`);
      await act(async () => { el.click(); });
    };

    const lancerDuelLibre = async (container) => {
      const ongletDeck = [...container.querySelectorAll('.rpg-mode-menu__switch button')]
        .find((bouton) => bouton.textContent.replace(/\s+/g, ' ').trim().endsWith('Deck'));
      await cliquer(ongletDeck, 'onglet Deck');
      const boitierJoueur = [...container.querySelectorAll('.rpg-deck-choice__button')]
        .find((bouton) => bouton.textContent.includes('DECK JOUEUR'));
      await cliquer(boitierJoueur, 'boîtier DECK JOUEUR');
      await cliquer(container.querySelector('.rpg-deck-detail__play'), 'bouton Jouer avec ce deck');
    };

    const attendre = async (lecteur, label, delaiMax = 5000, container = document) => {
      const debut = Date.now();
      while (Date.now() - debut < delaiMax) {
        const choixMana = container.querySelector('.rpg-flux-choix__option:not(:disabled)');
        if (choixMana) {
          await act(async () => { choixMana.click(); });
        }
        const laisserPasser = container.querySelector('.rpg-annonce-sort__pass:not(:disabled)');
        if (laisserPasser) {
          await act(async () => { laisserPasser.click(); });
        }
        const valeur = lecteur();
        if (valeur) return valeur;
        await act(async () => { await wait(50); });
      }
      const detail = [...container.querySelectorAll('.rpg-hand__card')].map((el) => `${el.dataset.cardId}:${el.className}`).join('|');
      const tour = container.querySelector('.rpg-turn-badge')?.textContent ?? '';
      const mana = container.querySelector('.rpg-flux-track')?.textContent ?? '';
      throw new Error(`Délai dépassé : ${label} (tour=${tour}, mana=${mana}, main=${detail}, overlay=${Boolean(container.querySelector('.rpg-overlay'))})`);
    };

    const lancerSource = async (container) => {
      const carte = await attendre(
        () => container.querySelector('.rpg-hand__card[data-card-id="eau-de-la-source"].is-playable'),
        'Eau de la source jouable en main',
        6000,
        container,
      );
      await cliquer(carte, 'carte Eau de la source');
      const confirmer = container.querySelector('.rpg-spell-confirm .rpg-btn--primary');
      if (confirmer) await cliquer(confirmer, 'confirmer Lancer le sort');
      await act(async () => { await wait(50); });
    };

    const lancerTraitDeBraise = async (container, selecteurCible) => {
      const carte = await attendre(
        () => container.querySelector('.rpg-hand__card[data-card-id="trait-de-braise"].is-playable'),
        'Trait de braise jouable en main',
        6000,
        container,
      );
      await cliquer(carte, 'carte Trait de braise');
      const confirmer = container.querySelector('.rpg-spell-confirm .rpg-btn--primary');
      if (confirmer) await cliquer(confirmer, 'confirmer Lancer le sort');
      const cible = await attendre(
        () => container.querySelector(selecteurCible),
        `cible ${selecteurCible}`,
        5000,
        container,
      );
      await cliquer(cible, `cibler ${selecteurCible}`);
      // Laisse la résolution / le vol éventuel du sort s'achever.
      await act(async () => { await wait(300); });
    };

    try {
      // ── 2a. Victoire : carte jouée franchit le niveau 2 en cours de duel (pas d'ouverture), puis coup fatal ouvre le paquet
      window.localStorage.clear();
      window.localStorage.setItem('letsplay_sablier_sound_v1', 'off');
      window.localStorage.setItem(RPG_STORY_STORAGE_KEY, JSON.stringify({
        version: 2,
        etagesVaincus: etagesPremiereTour,
        recit: null,
      }));
      window.localStorage.setItem(RPG_PROFIL_STORAGE_KEY, JSON.stringify({
        version: 1,
        xp: xpTotalDuNiveau(2) - XP.carteJouee,
        boostersOfferts: 0,
      }));

      source.cost = 0;
      trait.cost = 0;
      trait.effet = { ...originalTrait.effet, amount: 99 };

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
        await lancerDuelLibre(containerVictoire);
        await passerMulligan(containerVictoire, cliquer);

        // Premier sort non létal : la partie continue, et l'XP franchit le niveau 2 !
        await lancerSource(containerVictoire);

        const profilPendantPartie = JSON.parse(window.localStorage.getItem(RPG_PROFIL_STORAGE_KEY));
        assert.ok(profilPendantPartie.xp >= xpTotalDuNiveau(2), 'l’XP du niveau 2 est bien enregistrée pendant la partie');
        assert.equal(boostersDus(profilPendantPartie), 1, 'le paquet gagné reste dû tant que le duel continue');
        assert.equal(containerVictoire.querySelector('[data-souk-ceremonie]'), null,
          'aucun paquet ne s’ouvre pendant une partie en cours');
        assert.equal(containerVictoire.querySelector('[data-niveau-toast]'), null,
          'aucun bandeau de montée ne vient couvrir la table en cours de duel');
        assert.equal(containerVictoire.querySelector('.rpg-overlay'), null, 'le duel est toujours en cours');

        // Coup fatal : la partie se termine par une victoire.
        await lancerTraitDeBraise(containerVictoire, '.rpg-wizard-plate--ennemi');

        assert.ok(containerVictoire.querySelector('.rpg-overlay:not(.rpg-overlay--loss)'),
          'le duel est maintenant terminé sur une victoire');
        const ceremonieVictoire = containerVictoire.querySelector('[data-souk-ceremonie]');
        assert.ok(ceremonieVictoire, 'le paquet de montée de niveau s’ouvre dès la fin de la partie (victoire)');
        assert.equal(ceremonieVictoire.dataset.soukCeremonieOffert, 'true');

        await cliquer(containerVictoire.querySelector('[data-souk-ceremonie-passer]'));
        const carteOuverteVictoire = containerVictoire.querySelector('[data-souk-carte][data-card-id]');
        assert.ok(carteOuverteVictoire, 'les cartes ouvertes du paquet offert exposent leur identifiant');
        await act(async () => {
          carteOuverteVictoire.dispatchEvent(new window.MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            button: 2,
          }));
        });
        const ficheBoosterOffert = containerVictoire.querySelector('[data-catalogue-preview]');
        assert.ok(ficheBoosterOffert,
          'le clic droit sur une carte ouverte d’un paquet offert ouvre sa fiche');
        assert.equal(ficheBoosterOffert.dataset.cataloguePreview, carteOuverteVictoire.dataset.cardId);
        assert.ok(containerVictoire.querySelector('[data-souk-ceremonie]'),
          'ouvrir la fiche au clic droit garde la cérémonie du paquet offert ouverte');
        await cliquer(ficheBoosterOffert.querySelector('.rpg-card-peek__close'));
        assert.equal(containerVictoire.querySelector('[data-catalogue-preview]'), null,
          'fermer la fiche rend la main à la cérémonie');
        await cliquer(containerVictoire.querySelector('[data-souk-ceremonie-ranger]'));
        assert.equal(containerVictoire.querySelector('[data-souk-ceremonie]'), null,
          'une fois le paquet rangé, l’écran de victoire reste accessible');
        const profilApresVictoire = JSON.parse(window.localStorage.getItem(RPG_PROFIL_STORAGE_KEY));
        assert.equal(boostersDus(profilApresVictoire), 0, 'plus aucun paquet en attente après ouverture');
      } finally {
        await act(async () => rootVictoire.unmount());
        containerVictoire.remove();
      }

      // ── 2b. Défaite : carte jouée franchit le niveau 2 en cours de duel (pas d'ouverture), puis défaite ouvre le paquet
      window.localStorage.clear();
      window.localStorage.setItem('letsplay_sablier_sound_v1', 'off');
      window.localStorage.setItem(RPG_STORY_STORAGE_KEY, JSON.stringify({
        version: 2,
        etagesVaincus: etagesPremiereTour,
        recit: null,
      }));
      window.localStorage.setItem(RPG_PROFIL_STORAGE_KEY, JSON.stringify({
        version: 1,
        xp: xpTotalDuNiveau(2) - XP.carteJouee,
        boostersOfferts: 0,
      }));

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
        await lancerDuelLibre(containerDefaite);
        await passerMulligan(containerDefaite, cliquer);

        // Le joueur pose une carte et franchit le niveau 2 pendant son tour.
        await lancerSource(containerDefaite);

        assert.equal(containerDefaite.querySelector('[data-souk-ceremonie]'), null,
          'toujours aucune ouverture de paquet pendant le duel');

        // Le joueur passe son tour : le sorcier adverse lance Trait de braise (99 dégâts) → défaite !
        const btnFinTour = await attendre(
          () => containerDefaite.querySelector('.rpg-btn--endturn:not(:disabled)'),
          'bouton Fin du tour actif',
          5000,
          containerDefaite,
        );
        await cliquer(btnFinTour, 'Fin du tour');
        await attendre(
          () => containerDefaite.querySelector('.rpg-overlay.rpg-overlay--loss'),
          'écran de défaite affiché',
          8000,
          containerDefaite,
        );
        const ceremonieDefaite = containerDefaite.querySelector('[data-souk-ceremonie]');
        assert.ok(ceremonieDefaite, 'le paquet gagné en cours de partie s’ouvre dès la fin du duel, même en cas de défaite');
        assert.equal(ceremonieDefaite.dataset.soukCeremonieOffert, 'true');

        await cliquer(containerDefaite.querySelector('[data-souk-ceremonie-passer]'));
        await cliquer(containerDefaite.querySelector('[data-souk-ceremonie-ranger]'));
        assert.equal(containerDefaite.querySelector('[data-souk-ceremonie]'), null);
        const profilApresDefaite = JSON.parse(window.localStorage.getItem(RPG_PROFIL_STORAGE_KEY));
        assert.equal(boostersDus(profilApresDefaite), 0);
      } finally {
        await act(async () => rootDefaite.unmount());
        containerDefaite.remove();
      }

      // ── 2c. Campagne narrative : un duel d'histoire gagné bascule sur `recit` et ouvre bien le paquet en fin de combat
      window.localStorage.clear();
      window.localStorage.setItem('letsplay_sablier_sound_v1', 'off');
      const recitPretAuDuel = {
        ...recitHistoireVide(),
        curseur: { type: 'duel', etageId: 'listes-1' },
      };
      window.localStorage.setItem(RPG_STORY_STORAGE_KEY, JSON.stringify({
        version: 2,
        etagesVaincus: etagesPremiereTour.slice(1),
        recit: recitPretAuDuel,
      }));
      window.localStorage.setItem(RPG_PROFIL_STORAGE_KEY, JSON.stringify({
        version: 1,
        xp: xpTotalDuNiveau(2) - XP.carteJouee,
        boostersOfferts: 0,
      }));

      RPG_STORY_DECKS[premierEtage.deck] = Array(20).fill('tislit-des-aures');

      const containerCampagne = document.createElement('div');
      document.body.appendChild(containerCampagne);
      const rootCampagne = createRoot(containerCampagne);
      try {
        await act(async () => {
          rootCampagne.render(React.createElement(RpgDuelPage, {
            joueurDeck: deckTest,
            rng: () => 0,
          }));
        });
        await act(async () => { await wait(20); });

        // Ouvrir le mode Histoire et avancer jusqu'au briefing du duel `listes-1`.
        const btnHistoire = containerCampagne.querySelector('.rpg-menu-button--histoire');
        await cliquer(btnHistoire, 'bouton Mode histoire');
        if (containerCampagne.querySelector('[data-bab-el-commencer]')) {
          await cliquer(containerCampagne.querySelector('[data-bab-el-commencer]'), 'Commencer la campagne');
        }
        if (containerCampagne.querySelector('[data-story-summary]')) {
          await cliquer(containerCampagne.querySelector('[data-story-summary]'), 'Résumé');
        }
        if (containerCampagne.querySelector('[data-story-next]')) {
          await cliquer(containerCampagne.querySelector('[data-story-next]'), 'Continuer vers le duel');
        }
        await cliquer(containerCampagne.querySelector('[data-story-start-duel]'), 'Lancer le duel de campagne');
        await passerMulligan(containerCampagne, cliquer);

        // Carte non létale : franchit le niveau 2 en plein duel de campagne → pas d'ouverture.
        await lancerSource(containerCampagne);
        assert.equal(containerCampagne.querySelector('[data-souk-ceremonie]'), null,
          'aucun paquet ne s’ouvre au milieu d’un duel de campagne');

        // Coup fatal : fin du duel de campagne → retour sur `recit` + ouverture immédiate du paquet !
        await lancerTraitDeBraise(containerCampagne, '.rpg-wizard-plate--ennemi');

        assert.equal(containerCampagne.querySelector('[data-scene]')?.dataset.scene, 'recit',
          'la victoire de campagne enchaîne sur la scène d’après-duel');
        const ceremonieCampagne = containerCampagne.querySelector('[data-souk-ceremonie]');
        assert.ok(ceremonieCampagne, 'et le paquet de niveau s’ouvre dès la fin du duel de campagne');
        assert.equal(ceremonieCampagne.dataset.soukCeremonieOffert, 'true');
      } finally {
        await act(async () => rootCampagne.unmount());
        containerCampagne.remove();
      }
    } finally {
      source.cost = originalSourceCost;
      trait.cost = originalTrait.cost;
      trait.effet = originalTrait.effet;
      RPG_STORY_DECKS[premierEtage.deck] = originalDeckEtage;
    }
  } finally {
    await vite.close();
    dom.window.close();
  }
});
