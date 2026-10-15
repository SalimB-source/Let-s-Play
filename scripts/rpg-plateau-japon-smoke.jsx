// Le plateau japonais du Sablier, monté pour de vrai dans jsdom : le joueur
// ouvre le deck du Serment du Soleil rouge, lance la partie, et la table du
// duel se couvre de la cour de l’Empereur.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { RPG_DECKS } from '../src/games/rpgCards.js';
import { RPG_PLATEAUX, plateauParId } from '../src/games/rpgPlateaux.js';
import { passerMulligan } from './rpg-duel-start.js';

const DECK_ID = 'serment-du-soleil-rouge';
const PLATEAU_ID = 'cour-de-l-empereur';

export async function checkPlateauJapon(assert) {
  const plateau = plateauParId(PLATEAU_ID);
  const deck = RPG_DECKS.find(({ id }) => id === DECK_ID);
  assert.ok(deck, 'le deck du Serment du Soleil rouge fait partie du catalogue');
  assert.ok(plateau, 'la cour de l’Empereur fait partie des plateaux');

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  // Le tirage du plateau désigne un camp : 0,1 → c’est le joueur qui impose
  // son terrain. Le duel, lui, se joue bien avec le paquet du deck ouvert.
  await act(async () => { root.render(<RpgDuelPage rng={() => 0.1} />); });
  const cliquer = async (element) => { await act(async () => { element.click(); }); };
  try {
    // Une partie rapide part de l’onglet Deck.
    const ongletDeck = [...container.querySelectorAll('.rpg-mode-menu__switch button')]
      .find((bouton) => bouton.textContent.replace(/\s+/g, ' ').trim().endsWith('Deck'));
    assert.ok(ongletDeck, 'le menu propose l’onglet Deck');
    await cliquer(ongletDeck);
    const boitier = [...container.querySelectorAll('.rpg-deck-choice__button')]
      .find((bouton) => bouton.textContent.includes('Soleil rouge'));
    assert.ok(boitier, 'l’étagère propose le deck du Soleil rouge');
    await cliquer(boitier);
    const lancer = container.querySelector('.rpg-deck-detail__play');
    assert.ok(lancer, 'la fiche du deck permet de le jouer');
    await cliquer(lancer);
    await passerMulligan(container, cliquer);

    const table = container.querySelector('.card-table');
    assert.ok(table, 'la table du duel est montée après le mulligan');
    const posees = RPG_PLATEAUX.filter(({ id }) => table.classList.contains(`card-table--plateau-${id}`));
    assert.equal(posees.length, 1, 'la table porte exactement un plateau du catalogue');
    assert.equal(posees[0].id, PLATEAU_ID,
      'le deck du Soleil rouge impose son terrain : le duel se joue dans la cour');
    assert.match(table.style.backgroundImage, /plateau-cour-de-l-empereur\.jpg/,
      'le fond de la table est bien la peinture japonaise livrée dans public/');
    assert.match(table.getAttribute('aria-label') ?? '', /La Cour de l.Empereur/,
      'la table annonce la cour de l’Empereur dans son libellé accessible');
  } finally {
    await act(async () => { root.unmount(); });
    container.remove();
  }
  return true;
}
