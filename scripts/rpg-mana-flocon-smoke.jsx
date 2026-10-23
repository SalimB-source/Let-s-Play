// Le choix du mana de l'essai sans terrains, rendu dans jsdom sur un deck
// hybride Sable + Neige : le rond « Neige » propose le même flocon que
// l'icône ❄️ imprimée sur les cartes Neige, et la source acquise le reprend
// dans la jauge du camp.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { lancerDuelDepuisMenu, passerMulligan } from './rpg-duel-start.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Deux couleurs (Sable et Neige) : le premier mana demande donc un choix. Le
// Loup des neiges apporte la Neige au paquet, sans terrain à poser.
const DECK_JOUEUR = [
  'chien-du-guet', 'chien-du-guet', 'fennec-des-decombres', 'tislit-des-aures',
  'loup-des-neiges', 'loup-des-neiges', 'desert', 'desert',
];
const DECK_SORCIER = ['chien-du-guet', 'tislit-des-aures', 'fennec-des-decombres'];

/** Les deux familles de branches du flocon : les trois axes qui traversent le
 *  centre, puis les six pointes en V. */
const AXE = /^M12 2\.15V21\.85$/;
const POINTE = /^M10\.3 3\.95 12 5\.65l1\.7-1\.7$/;
const rotation = (path) => {
  const trouve = path.getAttribute('transform')?.match(/rotate\((-?\d+) 12 12\)/);
  return trouve ? Number(trouve[1]) : null;
};

export async function checkRpgManaFlocon(assert) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const q = (selector) => container.querySelector(selector);
  const cliquer = async (element, message) => {
    assert.ok(element, message);
    await act(async () => { element.click(); });
  };
  const attendre = async (condition, message, maxMs = 3000) => {
    for (let ecoule = 0; ecoule <= maxMs; ecoule += 50) {
      if (condition()) return;
      await act(async () => { await wait(50); });
    }
    assert.fail(message);
  };

  try {
    await act(async () => {
      root.render(<RpgDuelPage joueurDeck={DECK_JOUEUR} sorcierDeck={DECK_SORCIER} rng={() => 0.999} />);
    });
    assert.ok(await lancerDuelDepuisMenu(container, (element) => cliquer(element, 'l’onglet Deck lance le duel')),
      'le duel se lance depuis l’onglet Deck');
    await passerMulligan(container, cliquer);
    await attendre(() => q('.rpg-flux-choix__option--neige'), 'le choix du mana Neige apparaît');

    // ── 1. Le rond Neige porte un flocon, pas le cristal taillé d'avant ──────
    const option = q('.rpg-flux-choix__option--neige');
    assert.match(option.getAttribute('aria-label') ?? '', /mana Neige/i,
      'le rond annonce la couleur Neige aux lecteurs d’écran');
    const embleme = option.querySelector('svg.rpg-emblem--neige');
    assert.ok(embleme, 'le rond Neige dessine l’emblème SVG de la Neige');
    const traits = [...embleme.querySelectorAll('g[stroke="currentColor"]')];
    assert.equal(traits.length, 1, 'le flocon est tracé d’un seul groupe de traits');
    assert.equal(traits[0].getAttribute('fill'), 'none',
      'aucune surface pleine : le flocon reste un dessin de branches');
    const chemins = [...embleme.querySelectorAll('path')];
    const axes = chemins.filter((path) => AXE.test(path.getAttribute('d') ?? ''));
    const pointes = chemins.filter((path) => POINTE.test(path.getAttribute('d') ?? ''));
    assert.equal(axes.length, 3, 'trois axes traversent le centre du flocon');
    assert.deepEqual(axes.map(rotation).sort((a, b) => a - b), [0, 60, 120],
      'les axes se croisent tous les 60°');
    assert.equal(pointes.length, 6, 'six pointes en V terminent les branches');
    assert.deepEqual(pointes.map(rotation).sort((a, b) => a - b), [0, 60, 120, 180, 240, 300],
      'une pointe sur chacune des six branches');
    assert.equal(chemins.length, 9, 'le flocon se dessine en neuf traits, sans cristal plein');
    assert.ok(axes.every((path) => path.getAttribute('stroke-width') === '2.2'),
      'les axes gardent la même épaisseur');
    assert.ok(pointes.every((path) => path.getAttribute('stroke-width') === '2'),
      'les pointes gardent la même épaisseur');
    assert.doesNotMatch(embleme.outerHTML, /M12 1\.3 4\.9 5\.6v9\.6L12 22\.7/,
      'l’ancien prisme hexagonal de la Neige ne revient pas');

    // ── 2. Le choix retenu allume le même flocon dans la jauge ───────────────
    await cliquer(option, 'choisir le mana Neige');
    await attendre(() => q('.rpg-flux-track--joueur .rpg-flux-track__slot--neige'),
      'la source Neige rejoint la jauge du joueur');
    const slot = q('.rpg-flux-track--joueur .rpg-flux-track__slot--neige');
    assert.equal(slot.dataset.manaEtat, 'disponible', 'le mana Neige acquis est disponible');
    assert.equal(slot.querySelector('svg.rpg-emblem--neige')?.outerHTML, embleme.outerHTML,
      'la jauge reprend exactement le flocon du choix');
  } finally {
    await act(async () => { root.unmount(); });
    container.remove();
  }
}
