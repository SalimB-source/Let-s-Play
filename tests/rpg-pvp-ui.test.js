import { test } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const HOTE = 'u-hote';
const INVITE = 'u-invite';

function installerDom() {
  const dom = new JSDOM('<!doctype html><html lang="fr"><body></body></html>', {
    url: 'http://localhost:5173/jeu/sablier-de-bab-el/defi/ABCDEF12',
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

test('RpgPvpBoard monte la vraie table visuelle RpgDuelPage et pilote un duel complet Hôte ↔ Invité', async () => {
  const dom = installerDom();
  const vite = await createServer({
    server: { middlewareMode: true },
    ssr: { external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const { RPG_DECKS } = await vite.ssrLoadModule('/src/games/rpgCards.js');
    const { decksPourDefi, resultatSalon } = await vite.ssrLoadModule('/src/games/rpgPvpSalon.js');
    const { creerArbitre } = await vite.ssrLoadModule('/src/server/sablierArbitre.js');
    const { rngSeme } = await vite.ssrLoadModule('/src/games/rpgHasard.js');
    const { default: RpgPvpBoard } = await vite.ssrLoadModule('/src/games/RpgPvpBoard.jsx');

    const duels = new Map();
    const noms = { [HOTE]: 'Salim', [INVITE]: 'Yasmine' };
    const arbitre = creerArbitre({
      magasin: {
        duelParCode: async (code) => (duels.has(code) ? structuredClone(duels.get(code)) : null),
        insererDuel: async (ligne) => { duels.set(ligne.code, structuredClone(ligne)); return ligne; },
        mettreAJourDuel: async (code, seqAttendu, patch) => {
          const ligne = duels.get(code);
          if (!ligne || (ligne.seq ?? 0) !== seqAttendu) return null;
          const maj = { ...ligne, ...structuredClone(patch) };
          duels.set(code, maj);
          return structuredClone(maj);
        },
        journaliser: async () => {},
        nomDe: async (uid) => noms[uid] ?? '',
        sontAmis: async () => true,
        etatSablier: async () => null,
      },
      authentifier: async (jeton) => (noms[jeton] ? { id: jeton } : null),
      maintenant: () => Date.parse('2026-10-21T15:00:00Z'),
      hasard: rngSeme(12),
    });

    const appeler = async (jeton, corps) => {
      const req = new Request('https://lets-play.test/api/sablier-duel', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${jeton}` },
        body: JSON.stringify(corps),
      });
      const rep = await arbitre(req);
      return rep.json();
    };

    const decks = decksPourDefi(RPG_DECKS);
    const hoteDom = dom.window.document.createElement('div');
    const inviteDom = dom.window.document.createElement('div');
    dom.window.document.body.append(hoteDom, inviteDom);
    const rootHote = createRoot(hoteDom);
    const rootInvite = createRoot(inviteDom);

    try {
      const ouverture = await appeler(HOTE, {
        action: 'ouvrir',
        deck: decks[0].cardIds,
        visibilite: 'lien',
        mode: 'live',
      });
      const jointure = await appeler(INVITE, {
        action: 'rejoindre',
        code: ouverture.code,
        deck: decks[1].cardIds,
      });
      assert.equal(jointure.statut, 'en_cours');

      let vueHote = await appeler(HOTE, { action: 'etat', code: ouverture.code });
      let vueInvite = await appeler(INVITE, { action: 'etat', code: ouverture.code });
      let quitteHote = 0;

      const rendreDeuxTables = async () => {
        await act(async () => {
          rootHote.render(
            React.createElement(RpgPvpBoard, {
              vue: vueHote.etat,
              siege: vueHote.siege,
              code: vueHote.code,
              statut: vueHote.statut,
              mode: vueHote.mode,
              echeance: vueHote.echeance,
              seq: vueHote.seq,
              noms: vueHote.noms,
              decks: vueHote.decks,
              gagnantId: vueHote.gagnant_id,
              finRaison: vueHote.fin_raison,
              resultat: resultatSalon(vueHote, HOTE),
              onIntention: async (intention) => {
                const r = await appeler(HOTE, { action: 'jouer', code: ouverture.code, seq: vueHote.seq, intention });
                if (r.ok) {
                  vueHote = r;
                  vueInvite = await appeler(INVITE, { action: 'etat', code: ouverture.code });
                }
                return r;
              },
              onAbandon: async () => {
                await appeler(HOTE, { action: 'abandonner', code: ouverture.code });
                vueHote = await appeler(HOTE, { action: 'etat', code: ouverture.code });
                vueInvite = await appeler(INVITE, { action: 'etat', code: ouverture.code });
              },
              onQuitter: () => { quitteHote += 1; },
            }),
          );
          rootInvite.render(
            React.createElement(RpgPvpBoard, {
              vue: vueInvite.etat,
              siege: vueInvite.siege,
              code: vueInvite.code,
              statut: vueInvite.statut,
              mode: vueInvite.mode,
              echeance: vueInvite.echeance,
              seq: vueInvite.seq,
              noms: vueInvite.noms,
              decks: vueInvite.decks,
              gagnantId: vueInvite.gagnant_id,
              finRaison: vueInvite.fin_raison,
              resultat: resultatSalon(vueInvite, INVITE),
              onIntention: async (intention) => {
                const r = await appeler(INVITE, { action: 'jouer', code: ouverture.code, seq: vueInvite.seq, intention });
                if (r.ok) {
                  vueInvite = r;
                  vueHote = await appeler(HOTE, { action: 'etat', code: ouverture.code });
                }
                return r;
              },
              onAbandon: async () => {
                await appeler(INVITE, { action: 'abandonner', code: ouverture.code });
                vueInvite = await appeler(INVITE, { action: 'etat', code: ouverture.code });
                vueHote = await appeler(HOTE, { action: 'etat', code: ouverture.code });
              },
              onQuitter: () => {},
            }),
          );
        });
      };

      await rendreDeuxTables();

      // 1. La vraie table visuelle est montée chez les deux joueurs (aucun plateau texte hérité).
      assert.ok(hoteDom.querySelector('.rpg-battle .rpg-duel-nav__pvp'), 'la vraie table de duel est montée côté hôte');
      assert.ok(inviteDom.querySelector('.rpg-battle .rpg-duel-nav__pvp'), 'la vraie table de duel est montée côté invité');
      assert.equal(hoteDom.querySelector('.rpg-pvp--duel'), null, 'aucun plateau textuel côté hôte');
      assert.equal(inviteDom.querySelector('.rpg-pvp--duel'), null, 'aucun plateau textuel côté invité');
      assert.ok(hoteDom.querySelector('.rpg-duel-nav__pvp')?.textContent.includes(ouverture.code), 'badge EN LIGNE + code affiché');
      assert.equal(hoteDom.querySelectorAll('.rpg-hand > *').length, 3, 'les 3 vraies cartes de départ de l’hôte sont rendues en éventail');
      assert.equal(inviteDom.querySelectorAll('.rpg-hand > *').length, 3, 'les 3 vraies cartes de départ de l’invité sont rendues en éventail');
      assert.equal(hoteDom.querySelectorAll('.rpg-hidden-hand > *').length > 0, true, 'main adverse dos-de-carte affichée');
      assert.ok(hoteDom.textContent.includes('Yasmine'), 'le nom de l’adversaire apparaît sur sa plaque');
      assert.ok(inviteDom.textContent.includes('Salim'), 'le nom de l’hôte apparaît sur la plaque adverse côté invité');

      // 2. Volet de mulligan visuel ouvert chez les deux joueurs -> clic sur le vrai bouton de validation.
      const trouverValiderMulligan = (racine) => [...racine.querySelectorAll('button')]
        .find((b) => /Garder|Valider|Commencer|main/i.test(b.textContent) && !/Salon|Main ·/i.test(b.textContent));
      const btnMulliganHote = trouverValiderMulligan(hoteDom);
      const btnMulliganInvite = trouverValiderMulligan(inviteDom);
      assert.ok(btnMulliganHote, 'le volet de mulligan visuel est ouvert côté hôte');
      assert.ok(btnMulliganInvite, 'le volet de mulligan visuel est ouvert côté invité');

      await act(async () => { btnMulliganHote.click(); });
      await rendreDeuxTables();
      await act(async () => { btnMulliganInvite.click(); });
      await rendreDeuxTables();

      assert.equal(vueHote.etat.manaEssaiDemarre, true, 'le duel démarre visuellement dès les deux mulligans validés');

      // 3. Abandon en deux clics dans la barre du duel -> écran de Victoire / Défaite sur la vraie table.
      await act(async () => {
        const btnAbandon = [...inviteDom.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Abandonner');
        assert.ok(btnAbandon, 'bouton Abandonner accessible dans la barre du duel');
        btnAbandon.click();
      });
      await act(async () => {
        const btnConfirmer = [...inviteDom.querySelectorAll('button')].find((b) => /Confirmer l’abandon/i.test(b.textContent));
        assert.ok(btnConfirmer, 'confirmation d’abandon en 2 clics');
        btnConfirmer.click();
      });
      await rendreDeuxTables();

      assert.ok(hoteDom.querySelector('.rpg-overlay h2')?.textContent.includes('Victoire'), 'écran de Victoire affiché chez le gagnant');
      assert.ok(inviteDom.querySelector('.rpg-overlay h2')?.textContent.includes('Défaite'), 'écran de Défaite affiché chez le perdant');

      await act(async () => {
        const btnRetour = [...hoteDom.querySelectorAll('.rpg-overlay button')].find((b) => /Retour au salon/i.test(b.textContent));
        assert.ok(btnRetour, 'bouton Retour au salon présent sur l’écran de fin');
        btnRetour.click();
      });
      assert.equal(quitteHote, 1);
    } finally {
      await act(async () => {
        rootHote.unmount();
        rootInvite.unmount();
      });
    }
  } finally {
    await vite.close();
    dom.window.close();
  }
});
