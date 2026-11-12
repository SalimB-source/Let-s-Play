import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MOBA_DECKS, rpgMobaValiderDeck, rpgMobaCreerPartie } from '../src/games/rpgMobaLocal.js';
import { MOBA_HISTOIRE, prochainChapitreMoba } from '../src/games/rpgMobaHistoire.js';
import { RPG_PLATEAU_MUSIC_FILES } from '../src/games/rpgPlateauMusic.js';
import { cardById } from '../src/games/rpgCards.js';

test('trois chapitres distincts, decks compatibles, musiques classiques et portraits des vraies cartes', async () => {
  assert.deepEqual(MOBA_HISTOIRE.map((c) => c.plateau?.id), ['trois-voies', 'lac-gele-viking', 'temple-du-nil-egyptien']);
  assert.deepEqual(MOBA_HISTOIRE.map((c) => c.deck?.id), ['tour-listes-1', 'tour-fjord-3', 'tour-sablier-5']);
  for (const chapitre of MOBA_HISTOIRE) {
    assert.equal(rpgMobaValiderDeck(chapitre.deck).ok, true, chapitre.titre);
    assert.ok(RPG_PLATEAU_MUSIC_FILES[chapitre.plateau.musique], chapitre.plateau.nom);
    if (chapitre.portrait) {
      assert.ok(cardById(chapitre.portrait), chapitre.portrait);
      const art = await readFile(new URL(`../public/cards/${chapitre.portrait}.jpg`, import.meta.url));
      assert.equal(art[0], 0xff);
      assert.equal(art[1], 0xd8);
      const decor = await readFile(new URL(`../public/${chapitre.decor}`, import.meta.url));
      assert.equal(decor.toString('ascii', 0, 4), 'RIFF');
    }
  }
  assert.equal(prochainChapitreMoba(0, 'sorcier'), null);
  assert.equal(prochainChapitreMoba(0, 'nul'), null);
  assert.equal(prochainChapitreMoba(0, 'joueur'), MOBA_HISTOIRE[1]);
  assert.equal(prochainChapitreMoba(1, 'joueur'), MOBA_HISTOIRE[2]);
  assert.equal(prochainChapitreMoba(2, 'joueur'), null);
});

test('l’histoire enchaîne victoire, master de carte, nouveau plateau, nouvel adversaire et bilan final', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const lectures = [];
  class FakeAudio {
    constructor(src) { this.src = src; this.paused = true; lectures.push(this); }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    load() {}
    addEventListener() {}
    removeEventListener() {}
  }
  dom.window.Audio = FakeAudio;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const deck = { ...MOBA_DECKS[0], id: 'deck-du-joueur', name: 'Mon deck' };
    const parties = [];
    const creerPartie = (joueur, adverse) => {
      parties.push([joueur, adverse]);
      const partie = rpgMobaCreerPartie(joueur, adverse);
      assert.equal(partie.ok, true);
      // Simule le verdict du moteur, sans modifier ses règles de jeu.
      // La première visite du fjord échoue : le récit doit rester à cet étage.
      partie.duel.moba.winner = adverse.id === 'tour-fjord-3' && parties.length === 2 ? 'sorcier' : 'joueur';
      return partie.duel;
    };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, { decksMaison: [deck], creerPartie, onQuitter: () => {} })));
    assert.ok(document.querySelector('.moba__story-start button'));
    assert.equal(document.querySelector('.moba').dataset.mobaPlateau, 'trois-voies');
    await act(async () => document.querySelector('.moba__story-start button').click());
    assert.equal(parties[0][0].id, deck.id);
    assert.equal(parties[0][1].id, MOBA_HISTOIRE[0].deck.id);
    assert.match(document.querySelector('.moba__end-chapter').textContent, /Chapitre 1 \/ 3/);
    for (let index = 1; index < MOBA_HISTOIRE.length; index++) {
      if (index === 2) {
        assert.equal(document.querySelector('.moba__interlude'), null);
        assert.match(document.querySelector('.moba__end-actions .moba__primary').textContent, /Réessayer ce chapitre/);
        await act(async () => document.querySelector('.moba__end-actions .moba__primary').click());
        assert.equal(parties[2][1].id, MOBA_HISTOIRE[1].deck.id);
        assert.equal(document.querySelector('.moba').dataset.mobaPlateau, MOBA_HISTOIRE[1].plateau.id);
      }
      await act(async () => document.querySelector('.moba__end-actions .moba__primary').click());
      const interlude = document.querySelector('.moba__interlude');
      assert.ok(interlude);
      assert.match(interlude.querySelector('img').src, new RegExp(`${MOBA_HISTOIRE[index].portrait}\\.jpg`));
      assert.match(interlude.style.getPropertyValue('--moba-interlude-decor'), new RegExp(MOBA_HISTOIRE[index].decor));
      assert.match(interlude.textContent, new RegExp(MOBA_HISTOIRE[index].deck.name));
      const piste = RPG_PLATEAU_MUSIC_FILES[MOBA_HISTOIRE[index].plateau.musique];
      assert.ok(lectures.some((audio) => audio.src.endsWith(piste)), `La musique du prochain plateau commence pendant le master : ${lectures.map((audio) => audio.src).join(', ')}`);
      await act(async () => interlude.querySelector('.moba__primary').click());
      assert.equal(parties.at(-1)[0], parties[0][0]);
      assert.equal(parties.at(-1)[1].id, MOBA_HISTOIRE[index].deck.id);
      assert.equal(document.querySelector('.moba').dataset.mobaPlateau, MOBA_HISTOIRE[index].plateau.id);
      assert.match(document.querySelector('.moba__notice').textContent, new RegExp(MOBA_HISTOIRE[index].deck.name));
      assert.match(document.querySelector('.moba__end-chapter').textContent, new RegExp(`Chapitre ${index + 1} \\/ 3`));
    }
    assert.match(document.querySelector('.moba__end-panel h2').textContent, /Histoire accomplie/);
    assert.equal(document.querySelector('.moba__interlude'), null);
    assert.ok(lectures.some((audio) => audio.src.includes('Egypt.mp3')));
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
