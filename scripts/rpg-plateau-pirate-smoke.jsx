// Le Navire Pirate du Sablier, monté pour de vrai dans jsdom : le joueur
// sélectionne le deck des Lettres de Marque sur l'étagère, lance la partie,
// et la table du duel s'ouvre sur le pont supérieur du galion tout en lançant
// en boucle la piste dédiée `stepanbel_pirates_main-01.mp3` (et de même en PvP).
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import RpgPvpBoard from '../src/games/RpgPvpBoard.jsx';
import { RPG_DECKS } from '../src/games/rpgCards.js';
import { rpgNouveauDuel } from '../src/games/rpgDuel.js';
import { RPG_PLATEAUX, plateauParId } from '../src/games/rpgPlateaux.js';
import { passerMulligan } from './rpg-duel-start.js';

const DECK_ID = 'lettres-de-marque';
const PLATEAU_ID = 'navire-pirate';
const MUSIC_FILE = '/audio/stepanbel_pirates_main-01.mp3';

export async function checkPlateauPirate(assert) {
  const plateau = plateauParId(PLATEAU_ID);
  const deck = RPG_DECKS.find(({ id }) => id === DECK_ID);
  assert.ok(deck, 'le deck des Lettres de Marque fait partie du catalogue');
  assert.ok(plateau, 'Le Navire Pirate fait partie des plateaux');

  const pistesLancees = [];
  const pistesActives = new Set();
  const precedentAudio = window.Audio;
  class AudioTrace {
    constructor(src = '') {
      this.src = src;
      this.loop = false;
      this.preload = 'none';
      this.volume = 1;
      this.muted = false;
      this.paused = true;
      this.currentTime = 0;
    }
    play() {
      this.paused = false;
      pistesLancees.push(this.src);
      pistesActives.add(this);
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
      pistesActives.delete(this);
    }
    removeAttribute() {
      this.src = '';
    }
    load() {}
  }
  window.Audio = AudioTrace;

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const cliquer = async (element) => { await act(async () => { element.click(); }); };

  try {
    await act(async () => { root.render(<RpgDuelPage rng={() => 0.1} />); });

    const ongletDeck = [...container.querySelectorAll('.rpg-mode-menu__switch button')]
      .find((bouton) => bouton.textContent.replace(/\s+/g, ' ').trim().endsWith('Deck'));
    assert.ok(ongletDeck, 'le menu propose l’onglet Deck');
    await cliquer(ongletDeck);

    const boitier = [...container.querySelectorAll('.rpg-deck-choice__button')]
      .find((bouton) => bouton.textContent.includes('Lettres de Marque'));
    assert.ok(boitier, 'l’étagère propose le deck des Lettres de Marque');
    await cliquer(boitier);

    const lancer = container.querySelector('.rpg-deck-detail__play');
    assert.ok(lancer, 'la fiche du deck permet de lancer la partie');
    await cliquer(lancer);
    await passerMulligan(container, cliquer);

    const table = container.querySelector('.card-table');
    assert.ok(table, 'la table du duel est montée après le mulligan');
    const posees = RPG_PLATEAUX.filter(({ id }) => table.classList.contains(`card-table--plateau-${id}`));
    assert.equal(posees.length, 1, 'la table porte exactement un plateau du catalogue');
    assert.equal(posees[0].id, PLATEAU_ID, 'le deck des Lettres de Marque impose Le Navire Pirate');
    assert.match(table.style.backgroundImage, /plateau-navire-pirate\.jpg/,
      'le fond de la table est bien la peinture du navire pirate livrée dans public/');
    assert.ok(table.classList.contains('card-table--decoupee'),
      'la table se découpe face à la Cour des Djinns adverse');
    assert.equal(table.dataset.plateauJoueur, PLATEAU_ID,
      'la moitié basse est le pont du navire pirate');
    assert.equal(table.dataset.plateauAdversaire, 'table-des-heures',
      'la moitié haute garde la Table des Heures du sorcier');
    assert.match(table.getAttribute('aria-label') ?? '', /Table des Heures côté sorcier, Le Navire Pirate côté joueur/,
      'le libellé accessible nomme les deux terrains');

    const moitieJoueur = table.querySelector('.rpg-plateau-moitie--joueur');
    assert.ok(moitieJoueur, 'la moitié du joueur est peinte sur la table');
    assert.match(moitieJoueur.style.backgroundImage, /plateau-navire-pirate\.jpg/);
    assert.ok(moitieJoueur.classList.contains(`rpg-plateau-moitie--plateau-${PLATEAU_ID}`));

    // La musique du plateau pirate tourne en boucle pendant la partie et le thème
    // principal des menus s'est arrêté.
    assert.ok(pistesLancees.some((src) => src.endsWith(MUSIC_FILE)),
      'la piste stepanbel_pirates_main-01.mp3 a bien démarré pour le plateau pirate');
    const actives = [...pistesActives].map((a) => a.src);
    assert.ok(actives.some((src) => src.endsWith(MUSIC_FILE)),
      'stepanbel_pirates_main-01.mp3 est en cours de lecture active');
    assert.ok(!actives.some((src) => src.includes('Desert Solitude')),
      'le thème principal des menus s’est effacé pendant le duel sur le navire pirate');

    // Vérification PvP : RpgPvpBoard applique lui aussi Le Navire Pirate et sa musique.
    await act(async () => { root.unmount(); });
    pistesLancees.length = 0;
    pistesActives.clear();
    const rootPvp = createRoot(container);
    const vuePvp = rpgNouveauDuel({
      joueurDeck: deck.cardIds.filter((id) => id !== 'desert' && id !== 'eau-de-la-source'),
      sorcierDeck: deck.cardIds.filter((id) => id !== 'desert' && id !== 'eau-de-la-source'),
      modeMana: 'essai',
      joueurCouleurs: ['sable', 'eau'],
      sorcierCouleurs: ['sable', 'eau'],
      rng: () => 0.25,
    });
    try {
      await act(async () => {
        rootPvp.render(
          <RpgPvpBoard
            vue={vuePvp}
            code="PIRATE1"
            decks={{
              joueur: { id: 'lettres-de-marque', cardIds: deck.cardIds },
              sorcier: { id: 'lettres-de-marque', cardIds: deck.cardIds },
            }}
          />,
        );
      });
      const tablePvp = container.querySelector('.card-table');
      assert.ok(tablePvp?.classList.contains('card-table--plateau-navire-pirate'),
        'en PvP aussi, un duel pirate monte Le Navire Pirate');
      assert.ok(!tablePvp.classList.contains('card-table--decoupee'),
        'deux capitaines pirates partagent le navire entier d’un seul tenant, sans découpe');
      assert.ok(pistesLancees.some((src) => src.endsWith(MUSIC_FILE)),
        'en PvP aussi, stepanbel_pirates_main-01.mp3 accompagne le duel sur le navire pirate');
    } finally {
      await act(async () => { rootPvp.unmount(); });
    }
  } finally {
    window.Audio = precedentAudio;
    container.remove();
  }
  return true;
}
