/**
 * Entrée SSR de `scripts/rpg-duel-nav-check.mjs` — `npm run check:rpg-duel-nav`.
 *
 * La barre du duel au doigt : `rpg-mobile.css` replie ses six commandes dans
 * un seul bouton hamburger et ne déplie le panneau que sur `.is-open`. Ce
 * scénario monte la page réelle avec un pointeur grossier, lance un duel et
 * joue le geste :
 *
 *   1. le hamburger s'affiche, le panneau reste replié et `aria-expanded` est
 *      à `false` ;
 *   2. un appui sur le hamburger déplie le panneau — la classe `is-open` que
 *      la feuille attend — et l'icône passe de ☰ à ✕ ;
 *   3. le panneau porte bien les trois modes (Menu, Deck, Catalogue) et les
 *      trois réglages (son, 3D, plein écran) ;
 *   4. un geste hors de la barre referme le panneau ;
 *   5. rouvert, le mode Deck s'ouvre depuis le panneau : la barre du duel
 *      disparaît avec la table et l'écran des decks prend la place.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { lancerDuelDepuisMenu, passerMulligan } from './rpg-duel-start.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function checkRpgDuelNav(assert) {
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node);
  const click = (element) => act(async () => { element.click(); });
  const settle = (ms = 20) => act(async () => { await sleep(ms); });
  try {
    await act(async () => root.render(<RpgDuelPage rng={() => 0.999} />));
    await settle();
    await lancerDuelDepuisMenu(node, click);
    await passerMulligan(node, click);
    await settle(50);

    const shell = node.querySelector('.rpg-battle');
    assert.ok(shell.classList.contains('rpg-battle--touch'),
      'la page montée avec un pointeur grossier prend la présentation tactile');
    const burger = node.querySelector('.rpg-duel-nav__burger');
    const menu = node.querySelector('.rpg-duel-nav__menu');
    assert.ok(burger && menu, 'la barre du duel porte son bouton hamburger et son panneau');
    assert.equal(burger.getAttribute('aria-expanded'), 'false', 'le panneau est annoncé replié au départ');
    assert.equal(menu.classList.contains('is-open'), false, 'le panneau ne s’ouvre pas avant le geste');

    await click(burger);
    assert.equal(burger.getAttribute('aria-expanded'), 'true', 'le hamburger annonce le panneau ouvert');
    assert.equal(menu.classList.contains('is-open'), true,
      'le hamburger pose `is-open` : c’est la classe que `rpg-mobile.css` déplie en panneau');
    assert.equal(burger.querySelector('.rpg-duel-nav__burger-icon').textContent, '✕',
      'le hamburger devient une croix une fois le panneau ouvert');
    const commandes = [...menu.querySelectorAll('button')];
    assert.deepEqual(commandes.slice(0, 3).map((bouton) => bouton.textContent.trim()),
      ['Menu', 'Deck', 'Catalogue'], 'les trois modes du duel sont dans le panneau');
    assert.equal(commandes.length, 6,
      'le panneau garde les six commandes : les trois modes et le son, la 3D et le plein écran');

    // Le premier geste hors de la barre referme le panneau (le fond de table
    // est un `pointerdown` comme un autre).
    await act(async () => {
      node.querySelector('.card-table').dispatchEvent(new window.Event('pointerdown', { bubbles: true }));
    });
    assert.equal(menu.classList.contains('is-open'), false, 'un geste hors de la barre referme le panneau');

    // Rouvert, le mode Deck mène à son écran : la table et sa barre s'effacent.
    await click(burger);
    const deck = [...menu.querySelectorAll('button')].find((bouton) => bouton.textContent.trim() === 'Deck');
    await click(deck);
    assert.equal(node.querySelector('.rpg-duel-nav'), null, 'quitter le duel retire sa barre de navigation');
    assert.ok(node.querySelector('.rpg-mode-menu--decks'),
      'le mode Deck s’ouvre depuis le panneau du hamburger');
  } finally {
    await act(async () => root.unmount());
    node.remove();
  }
}
