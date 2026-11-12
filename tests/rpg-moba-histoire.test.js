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

test('cinq chapitres distincts, decks compatibles, musiques classiques et portraits des vraies cartes', async () => {
  assert.deepEqual(MOBA_HISTOIRE.map((c) => c.plateau?.id), ['trois-voies', 'port-des-corsaires', 'erg-des-ksour', 'lac-gele-viking', 'temple-du-nil-egyptien']);
  assert.deepEqual(MOBA_HISTOIRE.map((c) => c.deck?.id), ['tour-listes-1', 'tour-corsaires-1', 'tour-souk-2', 'tour-fjord-3', 'tour-sablier-5']);
  assert.equal(MOBA_HISTOIRE[0].portrait, 'guetteur-du-beffroi');
  assert.ok(MOBA_HISTOIRE[0].deck.cardIds.includes(MOBA_HISTOIRE[0].portrait));
  assert.equal(MOBA_HISTOIRE[1].portrait, 'la-barbe-rousse');
  assert.match(MOBA_HISTOIRE[1].texte, /Barbe-Rousse/);
  assert.equal(MOBA_HISTOIRE[1].deck.name, 'Flotte de l’abordage');
  for (const chapitre of MOBA_HISTOIRE) {
    assert.equal(rpgMobaValiderDeck(chapitre.deck).ok, true, chapitre.titre);
    assert.ok(RPG_PLATEAU_MUSIC_FILES[chapitre.plateau.musique], chapitre.plateau.nom);
    if (chapitre.portrait) {
      assert.ok(cardById(chapitre.portrait), chapitre.portrait);
      assert.ok(chapitre.deck.cardIds.includes(chapitre.portrait), chapitre.deck.name);
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
  assert.equal(prochainChapitreMoba(2, 'joueur'), MOBA_HISTOIRE[3]);
  assert.equal(prochainChapitreMoba(3, 'joueur'), MOBA_HISTOIRE[4]);
  assert.equal(prochainChapitreMoba(4, 'joueur'), null);
  assert.deepEqual(MOBA_HISTOIRE.map((chapitre) => chapitre.ambiance), ['braises', 'embruns', 'sable', 'neige', 'brume']);
  const css = await readFile(new URL('../src/games/rpgMobaHistoire.css', import.meta.url), 'utf8');
  for (const ambiance of MOBA_HISTOIRE.map((chapitre) => chapitre.ambiance)) {
    assert.match(css, new RegExp(`moba__interlude-particles--${ambiance}`));
  }
  assert.match(css, /moba__interlude-particles i[^}]*animation: none/);
  assert.match(css, /moba__interlude-particles--brume::before[^}]*animation: none/);
  assert.match(css, /moba-interlude-approche[^]*?scale\(1\.075\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
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
      partie.duel.moba.winner = adverse.id === 'tour-fjord-3' && parties.length === 4 ? 'sorcier' : 'joueur';
      return partie.duel;
    };
    const retourMobaRef = { current: null };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, { decksMaison: [deck], creerPartie, onQuitter: () => {}, onBackRef: retourMobaRef })));
    // La liste thématique est maintenant proposée par défaut ; le deck
    // personnel reste disponible et conserve son choix pendant la campagne.
    await act(async () => [...document.querySelectorAll('.moba__booster')]
      .find((button) => button.querySelector('.moba__booster-name')?.textContent === deck.name).click());
    assert.ok(document.querySelector('.moba__story-start button'));
    assert.equal(document.querySelector('.moba').dataset.mobaPlateau, 'trois-voies');
    await act(async () => document.querySelector('.moba__story-start button').click());
    assert.equal(parties.length, 0, 'Le duel ne commence pas avant le premier master');
    let premierMaster = document.querySelector('.moba__interlude');
    assert.ok(premierMaster);
    assert.match(premierMaster.textContent, /LE PREMIER AFFRONTEMENT/);
    assert.match(premierMaster.querySelector('.moba__interlude-hero img').src, /guetteur-du-beffroi\.jpg/);
    assert.equal(premierMaster.querySelectorAll('.moba__interlude-particles--braises i').length, 36);
    assert.equal(document.querySelector('.moba__setup-overlay'), null);
    assert.ok(lectures.some((audio) => audio.src.endsWith(RPG_PLATEAU_MUSIC_FILES['table-des-heures'])));
    await act(async () => retourMobaRef.current());
    assert.ok(document.querySelector('.moba__setup-overlay'), 'Retour à la préparation depuis le master');
    assert.equal(parties.length, 0);
    await act(async () => document.querySelector('.moba__story-start button').click());
    premierMaster = document.querySelector('.moba__interlude');
    await act(async () => premierMaster.querySelector('.moba__primary').click());
    assert.equal(document.querySelector('.moba__interlude'), null);
    assert.equal(parties[0][0].id, deck.id);
    assert.equal(parties[0][1].id, MOBA_HISTOIRE[0].deck.id);
    assert.match(document.querySelector('.moba__end-chapter').textContent, /Chapitre 1 \/ 5/);
    for (let index = 1; index < MOBA_HISTOIRE.length; index++) {
      if (index === 4) {
        assert.equal(document.querySelector('.moba__interlude'), null);
        assert.match(document.querySelector('.moba__end-actions .moba__primary').textContent, /Réessayer ce chapitre/);
        await act(async () => document.querySelector('.moba__end-actions .moba__primary').click());
        assert.equal(parties[4][1].id, MOBA_HISTOIRE[3].deck.id);
        assert.equal(document.querySelector('.moba').dataset.mobaPlateau, MOBA_HISTOIRE[3].plateau.id);
      }
      await act(async () => document.querySelector('.moba__end-actions .moba__primary').click());
      const interlude = document.querySelector('.moba__interlude');
      assert.ok(interlude);
      assert.ok(interlude.querySelector('.moba__interlude-hero img'), 'Le personnage occupe le master, sans cadre de carte');
      if (index === 1) {
        assert.match(interlude.querySelector('.moba__interlude-hero img').alt, /Barbe-Rousse/i);
        assert.match(interlude.textContent, /Barbe-Rousse/);
        assert.match(interlude.textContent, /Flotte de l’abordage/);
      }
      assert.equal(interlude.querySelector('.moba__interlude-portrait'), null);
      assert.equal(interlude.querySelectorAll(`.moba__interlude-particles--${MOBA_HISTOIRE[index].ambiance} i`).length, 36);
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
      assert.match(document.querySelector('.moba__end-chapter').textContent, new RegExp(`Chapitre ${index + 1} \\/ ${MOBA_HISTOIRE.length}`));
    }
    assert.match(document.querySelector('.moba__end-panel h2').textContent, /Histoire accomplie/);
    assert.equal(document.querySelector('.moba__interlude'), null);
    assert.ok(lectures.some((audio) => audio.src.includes('Egypt.mp3')));
    const partiesTerminees = parties.length;
    await act(async () => document.querySelector('.moba__end-actions .moba__primary').click());
    assert.equal(parties.length, partiesTerminees, 'Recommencer réaffiche le premier master avant de recréer un duel');
    assert.match(document.querySelector('.moba__interlude').textContent, /CHAPITRE 1 \/ 5/);
    await act(async () => document.querySelector('.moba__interlude-actions button:last-child').click());
    assert.match(document.querySelector('.moba__end-panel h2').textContent, /Histoire accomplie/);
    assert.match(document.querySelector('.moba__end-chapter').textContent, /Chapitre 5 \/ 5/);
    assert.equal(document.querySelector('.moba').dataset.mobaPlateau, MOBA_HISTOIRE[4].plateau.id);
    assert.equal(parties.length, partiesTerminees);
    await act(async () => document.querySelector('.moba__end-actions .moba__primary').click());
    await act(async () => document.querySelector('.moba__interlude .moba__primary').click());
    assert.equal(parties.length, partiesTerminees + 1);
    assert.equal(parties.at(-1)[1].id, MOBA_HISTOIRE[0].deck.id);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
