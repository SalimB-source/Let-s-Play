// Les deux plateaux des Ténèbres, montés pour de vrai dans jsdom : la Balance
// des Heures (le set égyptien) ouvre la partie sur les dalles de la Nécropole,
// et la table se découpe face au sorcier venu d'ailleurs. Le Palais du Pharaon,
// lui, appartient au tribunal de la Nécropole — un étage du mode Histoire, pas
// un deck du catalogue : sa correspondance se vérifie sur le module des
// plateaux, et sa peinture sur le fichier livré.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { RPG_DECKS } from '../src/games/rpgCards.js';
import { plateauDeDeck, plateauParId } from '../src/games/rpgPlateaux.js';
import { lancerDuelDepuisMenu, passerMulligan } from './rpg-duel-start.js';

const DECK_JOUEUR = 'balance-des-heures';
const PLATEAU_JOUEUR = 'necropole-des-dalles';
const PLATEAU_ADVERSE = 'table-des-heures'; // la Cour des Djinns, le sorcier par défaut

export async function checkPlateauxTenebres(assert) {
  const joueur = RPG_DECKS.find(({ id }) => id === DECK_JOUEUR);
  assert.ok(joueur, 'la Balance des Heures fait partie du catalogue');
  assert.ok(plateauParId(PLATEAU_JOUEUR), 'la Nécropole des dalles fait partie des plateaux');
  assert.ok(plateauParId('palais-du-pharaon'), 'Le Palais du Pharaon fait partie des plateaux');

  // Le tribunal de la Nécropole (Tour de la Nécropole, étage 4) est un deck de
  // campagne : c'est sa clé que la page lui passe, et elle impose le palais.
  const tribunal = plateauDeDeck('juges-de-la-necropole');
  assert.equal(tribunal.plateau.id, 'palais-du-pharaon',
    'le tribunal de la Nécropole siège au Palais du Pharaon');
  assert.equal(tribunal.motif, 'deck', 'la correspondance est explicite, pas une couleur');
  // Un étage de la tour passe la clé du deck : les trois premières cryptes
  // restent sur les dalles égyptiennes.
  for (const cle of ['momies-de-la-necropole', 'chacals-du-seuil']) {
    assert.equal(plateauDeDeck(cle).plateau.id, PLATEAU_JOUEUR, `${cle} se bat sur les dalles`);
  }

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<RpgDuelPage joueurDeck={joueur.cardIds} rng={() => 0.1} />);
  });
  const cliquer = async (element) => { await act(async () => { element.click(); }); };
  try {
    const lancer = await lancerDuelDepuisMenu(container, cliquer);
    assert.ok(lancer, 'l’onglet Deck propose de jouer avec le deck ouvert');
    await passerMulligan(container, cliquer);

    const table = container.querySelector('.card-table');
    assert.ok(table, 'la table du duel est montée après le mulligan');
    assert.ok(table.classList.contains(`card-table--plateau-${PLATEAU_JOUEUR}`),
      'le deck égyptien impose les dalles de la Nécropole');
    assert.match(table.style.backgroundImage, /plateau-necropole-des-dalles\.jpg/,
      'le fond de la table est la peinture du Nil et des pyramides');
    assert.equal(table.dataset.plateauAdversaire, PLATEAU_ADVERSE,
      'la moitié haute garde le terrain du sorcier : la Table des Heures');
    assert.ok(table.classList.contains('card-table--decoupee'),
      'deux terrains différents : la table se découpe');
    assert.match(table.getAttribute('aria-label') ?? '', /Table des Heures côté sorcier, La Nécropole des dalles côté joueur/,
      'le libellé accessible nomme les deux terrains');

    const moitieJoueur = table.querySelector('.rpg-plateau-moitie--joueur');
    const moitieAdverse = table.querySelector('.rpg-plateau-moitie--adverse');
    assert.ok(moitieJoueur && moitieAdverse, 'les deux moitiés peintes sont montées sur la table');
    assert.match(moitieJoueur.style.backgroundImage, /plateau-necropole-des-dalles\.jpg/,
      'la moitié basse montre les dalles de basalte');
    assert.match(moitieAdverse.style.backgroundImage, /card-table\.jpg/,
      'la moitié haute montre la table du sorcier');
    assert.ok(table.querySelector('.rpg-plateau-lisere'),
      'le liseré souligne la jonction des deux terrains');
    // La moitié du joueur porte aussi la couleur de repli des dalles, le temps
    // que la peinture arrive (la classe est posée sur la moitié).
    assert.ok(moitieJoueur.classList.contains(`rpg-plateau-moitie--plateau-${PLATEAU_JOUEUR}`),
      'la moitié des dalles porte sa classe de couleur de repli');
  } finally {
    await act(async () => { root.unmount(); });
    container.remove();
  }
  return true;
}
