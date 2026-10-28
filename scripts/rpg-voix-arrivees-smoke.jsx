import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { RpgAudioPlayer } from '../src/games/rpgAudio.js';

import { installerDeckMaisonDeTest, passerMulligan } from './rpg-duel-start.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 26 cartes Sable/Eau conformes à `rpgValiderDeck` (max 2 exemplaires), plus
// quatre cartes Braise : trois couleurs au plus, la limite d'un duel sans
// terrains. La main de départ (rng fixe) reçoit la Mousse des galiotes — une
// pirate muette, qui garde « Ahoy ! » — et les Kenshi de la forge, qui ont
// chacun leur échantillon d'arrivée.
const REMPLISSAGE = [
  'tercio-de-cuivre',
  'pilote-de-la-carreira',
  'le-renegat',
  'negociant-des-ranscons',
  'galion-de-la-flotte',
  'le-routier',
  'le-grand-debarquement',
  'haut-fond',
  'vipere-de-verre',
  'lettre-de-marque',
  'grappin-d-abordage',
  'baton-des-citernes',
  'cotre-de-course',
].flatMap((id) => [id, id]);

const DECK_JOUEUR = [
  ...REMPLISSAGE,
  'kenshi-de-la-forge',
  'kenshi-de-la-forge',
  'mousse-des-galiotes',
  'mousse-des-galiotes',
];

// Le sorcier joue les mêmes couleurs (Sable, Eau, Braise) : au-delà de trois
// couleurs, `rpgNouveauDuel` refuse un duel sans terrains.
const DECK_SORCIER = [
  ...REMPLISSAGE,
  'kenshi-de-la-forge',
  'kenshi-de-la-forge',
  'mousse-des-galiotes',
  'mousse-des-galiotes',
];

function creerTransfert() {
  const values = new Map();
  return {
    effectAllowed: 'move',
    dropEffect: 'move',
    types: [],
    setData(type, value) { values.set(type, value); this.types = [...values.keys()]; },
    getData(type) { return values.get(type) ?? ''; },
  };
}

function envoyerEvenementGlisser(target, type, dataTransfer) {
  const event = new window.Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
  target.dispatchEvent(event);
}

/** Un fichier a-t-il été lu par un `<audio>` du jeu ? */
const fichierLu = (fichiersLus, nom) => fichiersLus.some((src) => decodeURIComponent(src).includes(nom));

export async function checkRpgVoixArrivees(assert, fichiersLus = []) {
  const sons = [];
  const jouerOriginal = RpgAudioPlayer.prototype.play;
  RpgAudioPlayer.prototype.play = function espionVoix(nom, delai) {
    sons.push(nom);
    return jouerOriginal.call(this, nom, delai);
  };
  // Le préchargement d'une voix : muet, il prépare le fichier pour que la
  // réplique puisse partir avec le geste, avant la pose.
  const precharges = [];
  const prechargerOriginal = RpgAudioPlayer.prototype.prechargerVoix;
  RpgAudioPlayer.prototype.prechargerVoix = function espionPrechargement(url) {
    precharges.push(url);
    return prechargerOriginal.call(this, url);
  };

  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);

  const cliquer = async (element, message = 'la commande existe') => {
    assert.ok(element, message);
    await act(async () => { element.click(); });
  };
  const attendre = async (condition, message, maxMs = 5000) => {
    for (let ecoule = 0; ecoule <= maxMs; ecoule += 50) {
      if (condition()) return;
      await act(async () => { await wait(50); });
    }
    assert.fail(message);
  };
  const main = () => [...container.querySelectorAll('button.rpg-hand__card')];
  const carteEnMain = (nom) => main().find((carte) => carte.getAttribute('aria-label')?.includes(nom));
  const carteSurTable = (camp, carteId) => container.querySelector(`.rpg-card--${camp}[data-card-id="${carteId}"]`);
  const glisserSurTable = async (carte) => {
    const dataTransfer = creerTransfert();
    const table = container.querySelector('.card-table');
    assert.equal(carte?.getAttribute('draggable'), 'true', 'la carte jouable peut être glissée');
    await act(async () => {
      envoyerEvenementGlisser(carte, 'dragstart', dataTransfer);
      envoyerEvenementGlisser(table, 'dragover', dataTransfer);
      envoyerEvenementGlisser(table, 'drop', dataTransfer);
      envoyerEvenementGlisser(carte, 'dragend', dataTransfer);
    });
  };
  const choisirMana = async (couleur) => {
    const option = container.querySelector(`.rpg-flux-choix__option--${couleur}`);
    if (!option) return false;
    await cliquer(option, `choisir mana ${couleur}`);
    return true;
  };
  const passerTourSorcier = async () => {
    await cliquer(container.querySelector('.rpg-btn--endturn'), 'finir le tour du joueur');
    await act(async () => { await wait(900); });
    for (let essai = 0; essai < 20; essai += 1) {
      // Le sorcier attaque : la défense du joueur se referme en résolvant le
      // combat sans bloqueur assigné.
      const resoudre = container.querySelector('.rpg-btn--resolve-combat:not(:disabled)');
      if (resoudre) {
        await cliquer(resoudre);
        await act(async () => { await wait(500); });
        continue;
      }
      const laisser = [...container.querySelectorAll('.rpg-annonce-sort button')]
        .find((bouton) => bouton.textContent.includes('Laisser passer'));
      if (laisser) {
        await cliquer(laisser);
        await act(async () => { await wait(900); });
        continue;
      }
      const finTour = container.querySelector('.rpg-fin-tour button');
      if (finTour) {
        await cliquer(finTour);
        await act(async () => { await wait(300); });
        continue;
      }
      if (container.querySelector('.rpg-flux-choix__option') || container.querySelector('.rpg-btn--endturn:not(:disabled)')) {
        break;
      }
      await act(async () => { await wait(300); });
    }
  };

  try {
    installerDeckMaisonDeTest(DECK_JOUEUR, 'maison-voix-smoke');
    await act(async () => {
      root.render(<RpgDuelPage joueurDeck={DECK_JOUEUR} sorcierDeck={DECK_SORCIER} rng={() => 0.999} />);
    });
    // Le volet de deck s'ouvre en deux temps (onglet Deck, boîtier, détail) :
    // on attend chaque panneau plutôt que de cliquer à l'aveugle.
    const ongletDeck = [...container.querySelectorAll('.rpg-mode-menu__switch button')]
      .find((bouton) => bouton.textContent.replace(/\s+/g, ' ').trim().endsWith('Deck'));
    await cliquer(ongletDeck, 'onglet Deck du menu');
    await attendre(() => container.querySelector('.rpg-deck-choice__button'), 'le boîtier du deck apparaît');
    await cliquer(container.querySelector('.rpg-deck-choice__button'), 'ouvrir le boîtier du deck');
    await attendre(() => container.querySelector('.rpg-deck-detail__play'), 'le détail du deck propose de jouer');
    await cliquer(container.querySelector('.rpg-deck-detail__play'), 'jouer avec ce deck');
    await passerMulligan(container, cliquer);
    await attendre(() => container.querySelector('.card-table'), 'la table du duel est ouverte', 8000);

    // ── Tour 1 : la Mousse des galiotes, muette, garde l'accueil pirate ─────
    await choisirMana('sable');
    await attendre(() => carteEnMain('Mousse des galiotes'), 'Mousse des galiotes en main');
    await glisserSurTable(carteEnMain('Mousse des galiotes'));
    await attendre(() => carteSurTable('equipe', 'mousse-des-galiotes'), 'Mousse du joueur sur la table');
    assert.ok(sons.includes('pirate_arrivee'),
      'une carte pirate sans voix propre garde son « Ahoy ! » d’arrivée');
    assert.ok(fichierLu(fichiersLus, 'pirate-ahoy.mp3'),
      'l’élément <audio> joue pirate-ahoy.mp3 pour la Mousse');

    await passerTourSorcier();

    // ── Tours suivants : le Kenshi de la forge entre en jeu avec SA voix ────
    // Il coûte 3 manas : on ouvre un mana de Braise dès qu'il devient jouable.
    let kenshiPose = false;
    for (let tour = 0; tour < 8 && !kenshiPose; tour += 1) {
      await choisirMana('braise');
      const kenshi = carteEnMain('Kenshi de la forge');
      if (kenshi?.getAttribute('draggable') === 'true') {
        // La voix du Kenshi est préparée pendant qu'il est encore en main :
        // c'est ce qui lui permet de partir à l'instant du geste.
        assert.ok(precharges.some((url) => decodeURIComponent(url).includes('Kenshi de la forge.mp3')),
          'la voix de la carte en main est préchargée, sans être jouée');
        sons.length = 0;
        const lecturesAvant = fichiersLus.length;
        await glisserSurTable(kenshi);
        // **La voix précède le plateau** : au sortir du geste, la carte vole
        // encore — la créature n'est pas sur sa rangée — et sa réplique est
        // déjà partie.
        assert.equal(carteSurTable('equipe', 'kenshi-de-la-forge'), null,
          'la voix part avant que la créature ne touche le plateau');
        assert.ok(fichiersLus.slice(lecturesAvant)
          .some((src) => decodeURIComponent(src).includes('Kenshi de la forge.mp3')),
        'le Kenshi parle dès que sa carte quitte la main, pas à l’atterrissage');
        await attendre(() => carteSurTable('equipe', 'kenshi-de-la-forge'),
          'Kenshi de la forge arrive sur la table');
        await act(async () => { await wait(400); });
        const nouvelles = fichiersLus.slice(lecturesAvant);
        const lecturesKenshi = nouvelles
          .filter((src) => decodeURIComponent(src).includes('Kenshi de la forge.mp3'));
        assert.equal(lecturesKenshi.length, 1,
          'la voix ne se rejoue pas quand la créature touche le plateau');
        assert.ok(!nouvelles.some((src) => /pirate-ahoy|dock-sound|dwarf-dialogue/i.test(src)),
          'la voix propre de la carte remplace les accueils génériques');
        kenshiPose = true;
        break;
      }
      await passerTourSorcier();
    }
    assert.ok(kenshiPose, 'le Kenshi de la forge a fini par entrer en jeu');
  } finally {
    RpgAudioPlayer.prototype.play = jouerOriginal;
    RpgAudioPlayer.prototype.prechargerVoix = prechargerOriginal;
    await act(async () => { root.unmount(); });
    container.remove();
  }
}
