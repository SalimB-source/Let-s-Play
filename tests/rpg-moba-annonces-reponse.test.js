import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

async function setup(partage = true) {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
  const local = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
  const classic = await server.ssrLoadModule('/src/games/rpgDuel.js');
  const { RPG_RENDU_MOBA } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
  let duel;
  const initialiser = () => (duel = local.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise', 'eau', 'neige'], sorcierCouleurs: ['braise', 'sable', 'neige'], rng: () => .5 }));
  const props = { initialiser, onQuitter: () => {}, rendu: partage ? { HoverCardPreview: RPG_RENDU_MOBA.HoverCardPreview, TableCard: RPG_RENDU_MOBA.TableCard } : null };
  const root = createRoot(document.getElementById('root'));
  const render = () => act(async () => root.render(React.createElement(Board, props)));
  const text = (selector, value) => [...document.querySelectorAll(selector)].find((node) => node.textContent.includes(value));
  const click = async (button) => { assert.ok(button, 'commande présente'); assert.equal(button.disabled, false); await act(async () => button.click()); };
  const tick = () => act(async () => new Promise((resolve) => setTimeout(resolve, 550)));
  await render(); await click(document.querySelector('.moba__mulligan .moba__primary'));
  if (duel.joueur.manaChoixEnAttente) await click(text('.moba__choice button', 'braise'));
  return { get duel() { return duel; }, local, classic, render, text, click, tick, dom,
    cleanup: async () => { await act(async () => root.unmount()); await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT; } };
}

async function annonceCreature(t) {
  const { duel: d, classic } = t;
  classic.rpgFinDeTour(d);
  if (d.sorcier.manaChoixEnAttente) classic.rpgChoisirCouleurMana(d, 'sorcier', 'sable');
  d.sorcier.main = ['gardienne-des-portes-de-sable']; d.sorcier.mana.sable = 20;
  d.joueur.main = ['ecueil']; d.joueur.mana.eau = 20;
  await t.render(); await t.tick();
  assert.equal(d.mobaCreatureEnAttente?.carteId, 'gardienne-des-portes-de-sable');
}

test('créature adverse : aperçu classique, réponse, réouverture et contresort', async () => {
  const t = await setup();
  try {
    await annonceCreature(t);
    const d = t.duel, modal = document.querySelector('.moba__card-announcement');
    assert.ok(modal); assert.equal(modal.getAttribute('role'), 'dialog');
    assert.match(modal.getAttribute('aria-label'), /Gardienne des portes de sable.*Voie.*emplacement/i);
    assert.ok(modal.querySelector('.rpg-hover-card-preview--annonce'));
    assert.equal(document.querySelector('.moba__hand').closest('[inert]') !== null, true, 'plateau désactivé tant que la fenêtre est ouverte');
    const respond = t.text('.moba__card-announcement button', 'Répondre');
    assert.equal(document.activeElement, respond);
    const pass = t.text('.moba__card-announcement button', 'Laisser passer');
    await act(async () => respond.dispatchEvent(new t.dom.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })));
    assert.equal(document.activeElement, pass, 'focus piégé dans le dialogue');
    await t.click(respond);
    assert.equal(document.querySelector('.moba__card-announcement'), null);
    assert.ok(d.mobaCreatureEnAttente); assert.equal(d.sorcier.creatures.length, 0, 'répondre ne résout rien');
    const voir = t.text('.moba__controls button', 'Voir l’annonce');
    assert.equal(document.activeElement, voir, 'focus rendu à la commande de réouverture');
    await t.click(voir); assert.ok(document.querySelector('.moba__card-announcement'));
    await t.click(t.text('.moba__card-announcement button', 'Répondre'));
    await t.click(t.text('.moba__card', 'Écueil'));
    assert.equal(d.mobaCreatureEnAttente, null); assert.equal(d.sorcier.creatures.length, 0);
    assert.ok(d.sorcier.cimetiere.includes('gardienne-des-portes-de-sable'));
    assert.equal(document.querySelector('.moba__card-announcement'), null);
  } finally { await t.cleanup(); }
});

test('créature adverse : laisser passer résout la pose une seule fois, rendu autonome', async () => {
  const t = await setup(false);
  try {
    await annonceCreature(t);
    assert.ok(document.querySelector('.moba__announcement-fallback img'));
    assert.match(document.querySelector('.moba__card-announcement').textContent, /Gardienne des portes de sable/);
    await t.click(t.text('.moba__card-announcement button', 'Laisser passer'));
    assert.equal(t.duel.mobaCreatureEnAttente, null);
    assert.equal(t.duel.sorcier.creatures.filter(e => e.carteId === 'gardienne-des-portes-de-sable').length, 1);
    assert.equal(document.querySelector('.moba__card-announcement'), null);
  } finally { await t.cleanup(); }
});

test('sort adverse : sa cible est montrée, le bouclier peut répondre puis le sort est passé', async () => {
  const t = await setup();
  try {
    const { duel: d, local, classic } = t;
    d.joueur.main = ['ashigaru-des-braises']; d.joueur.mana.braise = 10;
    const cible = local.rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
    assert.ok(cible); const pv = cible.pv;
    cible.attaquee = true;
    classic.rpgFinDeTour(d);
    if (d.sorcier.manaChoixEnAttente) classic.rpgChoisirCouleurMana(d, 'sorcier', 'neige');
    d.sorcier.main = ['poigne-de-givre']; d.sorcier.mana.neige = 20;
    d.joueur.main = ['parade-du-verre']; d.joueur.mana.eau = 20;
    await t.render(); await t.tick();
    assert.equal(d.mobaSortEnAttente?.cibleId, cible.id);
    const modal = document.querySelector('.moba__card-announcement');
    assert.match(modal.getAttribute('aria-label'), /Poigne de givre.*Ashigaru.*Voie gauche/i);
    assert.equal(cible.pv, pv);
    const cibleDOM = () => document.querySelector(`[data-moba-entity="${cible.id}"] .rpg-card`);
    assert.equal(cibleDOM()?.dataset.combatTilted, 'true', 'reste engagée pendant la réponse');
    await t.click(t.text('.moba__card-announcement button', 'Répondre'));
    await t.click(t.text('.moba__card', 'Parade de verre'));
    await t.click(document.querySelector(`[data-moba-entity="${cible.id}"] button`));
    assert.equal(cible.bouclier, 1); assert.ok(d.mobaSortEnAttente);
    assert.equal(cible.attaquee, true);
    assert.equal(cibleDOM()?.dataset.combatTilted, 'true', 'reste engagée après le sort en réponse');
    await t.click(t.text('.moba__controls button', 'Voir l’annonce'));
    await t.click(t.text('.moba__card-announcement button', 'Laisser passer'));
    assert.equal(d.mobaSortEnAttente, null); assert.equal(cible.pv, pv);
    assert.ok(d.sorcier.cimetiere.includes('poigne-de-givre'));
  } finally { await t.cleanup(); }
});

test('la carte du joueur reste soumise à la réponse automatique de l’IA, sans dialogue humain', async () => {
  const t = await setup();
  try {
    const d = t.duel;
    d.joueur.main = ['gardienne-des-portes-de-sable']; d.joueur.mana.sable = 20;
    d.sorcier.main = ['ecueil']; d.sorcier.mana.eau = 20;
    if (d.joueur.manaChoixEnAttente) await t.click(t.text('.moba__choice button', 'braise'));
    await t.render(); await t.click(t.text('.moba__card', 'Gardienne des portes de sable'));
    await t.click(document.querySelector('[data-moba-lane="right"][data-moba-side="joueur"][data-moba-slot="1"] button.moba__slot'));
    assert.equal(d.mobaCreatureEnAttente?.cote, 'joueur');
    assert.equal(document.querySelector('.moba__card-announcement'), null);
    await t.tick();
    assert.equal(d.mobaCreatureEnAttente, null); assert.ok(d.sorcier.cimetiere.includes('ecueil'));
  } finally { await t.cleanup(); }
});

test('nouvelle annonce de la même carte : la fenêtre se rouvre après la résolution précédente', async () => {
  const t = await setup(false);
  try {
    await annonceCreature(t);
    t.duel.sorcier.main.push('gardienne-des-portes-de-sable');
    await t.click(t.text('.moba__card-announcement button', 'Répondre'));
    await t.click(t.text('.moba__controls button', 'Passer et laisser entrer'));
    assert.equal(document.querySelector('.moba__card-announcement'), null);
    await t.tick();
    assert.equal(t.duel.mobaCreatureEnAttente?.carteId, 'gardienne-des-portes-de-sable');
    assert.ok(document.querySelector('.moba__card-announcement'), 'chaque nouvelle carte possède son annonce');
  } finally { await t.cleanup(); }
});

test('Embuscade adverse : répondre permet de contrer et de reprendre le sort suspendu', async () => {
  const t = await setup(false);
  try {
    const { duel: d, local, classic } = t;
    classic.rpgFinDeTour(d); if (d.sorcier.manaChoixEnAttente) classic.rpgChoisirCouleurMana(d, 'sorcier', 'braise');
    d.sorcier.main = ['ronin-du-soleil-rouge']; d.sorcier.mana.braise = 20;
    const cible = local.rpgMobaJouerCreature(d, 'sorcier', 'ronin-du-soleil-rouge', 'left', 0).entite;
    assert.ok(cible);
    classic.rpgFinDeTour(d); if (d.joueur.manaChoixEnAttente) classic.rpgChoisirCouleurMana(d, 'joueur', 'braise');
    d.sorcier.main = ['gardienne-du-croissant']; Object.assign(d.sorcier.mana, { sable: 20, tenebres: 20 });
    d.joueur.main = ['trait-de-braise', 'ecueil']; Object.assign(d.joueur.mana, { braise: 20, eau: 20 });
    await t.render(); await t.click(t.text('.moba__card', 'Trait de braise'));
    await t.click(document.querySelector(`[data-moba-entity="${cible.id}"] button`));
    await t.tick();
    assert.equal(d.mobaCreatureEnAttente?.carteId, 'gardienne-du-croissant');
    assert.match(document.querySelector('.moba__card-announcement').getAttribute('aria-label'), /Gardien au croissant/);
    await t.click(t.text('.moba__card-announcement button', 'Répondre'));
    await t.click(t.text('.moba__card', 'Écueil'));
    assert.equal(d.mobaSortEnAttente?.cibleId, cible.id, 'le sort initial est repris après le contre');
    assert.equal(document.querySelector('.moba__card-announcement'), null, 'le joueur ne répond pas à son propre sort');
    await t.tick();
    assert.equal(d.mobaSortEnAttente, null);
  } finally { await t.cleanup(); }
});

test('arme adverse : l’annonce identifie le porteur et laisse attacher l’arme', async () => {
  const t = await setup();
  try {
    const { duel: d, local, classic } = t;
    classic.rpgFinDeTour(d); if (d.sorcier.manaChoixEnAttente) classic.rpgChoisirCouleurMana(d, 'sorcier', 'sable');
    d.sorcier.main = ['gardienne-des-portes-de-sable']; d.sorcier.mana.sable = 30;
    const porteur = local.rpgMobaJouerCreature(d, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    assert.ok(porteur);
    d.sorcier.main = ['javelot-du-beffroi']; d.joueur.main = [];
    await t.render(); await t.tick();
    assert.equal(d.mobaSortEnAttente?.armeMoba, true);
    assert.match(document.querySelector('.moba__card-announcement').getAttribute('aria-label'), /Javelot du beffroi.*Gardienne.*Voie gauche/i);
    await t.click(t.text('.moba__card-announcement button', 'Laisser passer'));
    assert.equal(d.mobaSortEnAttente, null);
    assert.equal(porteur.arme?.carteId, 'javelot-du-beffroi');
  } finally { await t.cleanup(); }
});

test('l’annonce disparaît si la partie se termine et le rejeu ne la conserve pas', async () => {
  const t = await setup(false);
  try {
    await annonceCreature(t);
    t.duel.moba.winner = 'joueur'; await t.render();
    assert.equal(document.querySelector('.moba__card-announcement'), null);
    await t.click(t.text('.moba__end-actions button', 'Rejouer'));
    assert.equal(document.querySelector('.moba__card-announcement'), null);
    assert.ok(document.querySelector('.moba__mulligan'));
  } finally { await t.cleanup(); }
});
