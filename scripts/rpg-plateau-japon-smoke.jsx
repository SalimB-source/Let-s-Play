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
  // Chaque camp reçoit le plateau de son deck : la cour de l’Empereur couvre
  // la moitié du joueur, la Table des Heures (Cour des Djinns) celle du
  // sorcier. Le duel, lui, se joue bien avec le paquet du deck ouvert.
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
    // La table découpée : les deux terrains diffèrent, chaque moitié porte la
    // peinture de son camp et le liseré souligne la jonction.
    assert.ok(table.classList.contains('card-table--decoupee'),
      'la table se découpe quand les deux decks imposent des terrains différents');
    assert.equal(table.dataset.plateauJoueur, PLATEAU_ID,
      'la moitié basse est le terrain du deck du joueur');
    assert.equal(table.dataset.plateauAdversaire, 'table-des-heures',
      'la moitié haute est le terrain du deck adverse (la Cour des Djinns)');
    const moitieJoueur = table.querySelector('.rpg-plateau-moitie--joueur');
    const moitieAdverse = table.querySelector('.rpg-plateau-moitie--adverse');
    assert.ok(moitieJoueur && moitieAdverse, 'les deux moitiés peintes sont montées sur la table');
    assert.match(moitieJoueur.style.backgroundImage, /plateau-cour-de-l-empereur\.jpg/,
      'la moitié du joueur montre la cour de l’Empereur');
    assert.match(moitieAdverse.style.backgroundImage, /card-table\.jpg/,
      'la moitié du sorcier montre la Table des Heures');
    assert.ok(table.querySelector('.rpg-plateau-lisere'),
      'le liseré souligne la jonction des deux terrains');
    assert.match(table.getAttribute('aria-label') ?? '', /Table des Heures côté sorcier, La Cour de l.Empereur côté joueur/,
      'le libellé accessible nomme le terrain de chaque camp');
  } finally {
    await act(async () => { root.unmount(); });
    container.remove();
  }
  return true;
}
