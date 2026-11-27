import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const documentPour = (element) => new JSDOM(renderToStaticMarkup(element)).window.document;

test('la règle activée est encadrée dans les fiches, le guide, le cimetière et l’atelier', async () => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  try {
    const { RpgActivationDescription } = await vite.ssrLoadModule('/src/games/RpgActivationDescription.jsx');
    const { HoverCardPreview, CimetiereCarousel } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { GuideCard } = await vite.ssrLoadModule('/src/games/RpgCardGuide.jsx');
    const { default: Editor } = await vite.ssrLoadModule('/src/games/RpgMobaDeckEditor.jsx');
    const { MOBA_DECKS } = await vite.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { RPG_DUEL_CARDS, cardById } = await vite.ssrLoadModule('/src/games/rpgCards.js');
    const { texteActivation } = await vite.ssrLoadModule('/src/games/rpgActivationTexte.js');
    const scalde = cardById('scalde-des-runes');
    const normal = cardById('chien-du-guet');
    const reponse = cardById('garde-du-voile');
    for (const carte of RPG_DUEL_CARDS.filter(c => c.activation)) {
      const doc = documentPour(React.createElement(RpgActivationDescription, { carte }));
      const bloc = doc.querySelector('.rpg-activation-description');
      assert.ok(bloc, carte.id);
      assert.ok(bloc.textContent.includes(texteActivation(carte)), `${carte.id} conserve le texte complet et ses éventuels coûts`);
      assert.equal(bloc.dataset.effetActive, carte.activation.effet?.type === 'contresort' ? 'reponse' : 'activation');
    }
    assert.equal(documentPour(React.createElement(RpgActivationDescription, { carte: normal })).querySelector('.rpg-activation-description'), null);
    const reponseDoc = documentPour(React.createElement(RpgActivationDescription, { carte: reponse }));
    assert.ok(reponseDoc.querySelector('.rpg-activation-description--reponse'));
    assert.match(reponseDoc.body.textContent, /Effet-réponse/);
    for (const variante of ['', 'catalogue', 'annonce', 'appui-long', 'graveyard']) {
      const doc = documentPour(React.createElement(HoverCardPreview, { carte: scalde, variante, effetsEpuises: ['activation'] }));
      const bloc = doc.querySelector('.rpg-hover-card-preview__activation.rpg-activation-description');
      assert.ok(bloc, variante); assert.match(bloc.textContent, /Festin des vaillants/);
      assert.match(bloc.textContent, /Déjà utilisé pendant cette présence/);
    }
    const prison = documentPour(React.createElement(HoverCardPreview, { carte: normal, prisonniere: scalde }));
    assert.match(prison.querySelector('.rpg-hover-card-preview__prisonniere .rpg-activation-description').textContent, /Festin/);
    const cimetiere = documentPour(React.createElement(CimetiereCarousel, { cartes: [scalde.id], campLabel: 'Votre', onClose() {} }));
    assert.match(cimetiere.querySelector('.rpg-graveyard-carousel__details .rpg-activation-description').textContent, /Festin/);
    const guide = documentPour(React.createElement(GuideCard, { carte: scalde, cardArt: () => '' }));
    assert.match(guide.querySelector('.rpg-card-guide__details .rpg-activation-description').textContent, /Festin/);
    const editor = documentPour(React.createElement(Editor, { deck: MOBA_DECKS[0], joueur: 'Vous', onCancel() {}, onSave() {} }));
    const card = [...editor.querySelectorAll('.moba__editor-card')].find(el => el.querySelector('strong')?.textContent === scalde.name);
    assert.match(card.querySelector('.rpg-activation-description').textContent, /Festin/);
    assert.match(card.querySelector('.rpg-activation-description--note').textContent, /Conquête|MOBA/);
    const css = readFileSync(new URL('../src/games/rpg-activation-description.css', import.meta.url), 'utf8');
    assert.match(css, /border:\s*1px solid/); assert.match(css, /overflow-wrap:\s*anywhere/);
  } finally { await vite.close(); }
});
