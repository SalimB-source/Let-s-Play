import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { RpgAudioPlayer } from '../src/games/rpgAudio.js';

import { installerDeckMaisonDeTest, passerMulligan } from './rpg-duel-start.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 26 cartes Sable/Eau conformes à `rpgValiderDeck`, plus quatre cartes : deux
// Tislit des Aurès (1 mana, Sable, **Attaque ciblée**) et deux Mousse des
// galiotes. Deux couleurs, aucune terre : le duel démarre en Mana Essai.
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
  'tislit-des-aures',
  'tislit-des-aures',
  'mousse-des-galiotes',
  'mousse-des-galiotes',
];

const DECK_SORCIER = [
  ...REMPLISSAGE,
  'mousse-des-galiotes',
  'mousse-des-galiotes',
  'vipere-de-verre',
  'vipere-de-verre',
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

/**
 * Le duel de la flèche : une Tislit des Aurès (Attaque ciblée) frappe la seule
 * créature du sorcier et s'arrête sur sa proie. On vérifie ce que le lecteur
 * audio reçoit réellement : `fleche`, jamais `player_attack_hit`.
 */
export async function checkRpgFlecheAudio(assert, fichiersLus = []) {
  const sons = [];
  const jouerOriginal = RpgAudioPlayer.prototype.play;
  RpgAudioPlayer.prototype.play = function espionFleche(nom, delai) {
    sons.push({ nom, delai });
    return jouerOriginal.call(this, nom, delai);
  };

  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);

  const cliquer = async (element, message = 'la commande existe') => {
    assert.ok(element, message);
    await act(async () => { element.click(); });
  };
  const attendre = async (condition, message, maxMs = 6000) => {
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
  const atteindreProie = async () => {
    for (let essai = 0; essai < 40; essai += 1) {
      if (container.querySelector('.rpg-card--ennemi')) return;
      await act(async () => { await wait(100); });
    }
    assert.fail('une créature adverse sur la table');
  };
  const passerTourSorcier = async () => {
    await cliquer(container.querySelector('.rpg-btn--endturn'), 'finir le tour du joueur');
    await act(async () => { await wait(900); });
    for (let essai = 0; essai < 24; essai += 1) {
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
      if (container.querySelector('.rpg-btn--endturn:not(:disabled)')) break;
      await act(async () => { await wait(300); });
    }
  };

  try {
    installerDeckMaisonDeTest(DECK_JOUEUR, 'maison-fleche-smoke');
    await act(async () => {
      root.render(<RpgDuelPage joueurDeck={DECK_JOUEUR} sorcierDeck={DECK_SORCIER} rng={() => 0.999} />);
    });
    const ongletDeck = [...container.querySelectorAll('.rpg-mode-menu__switch button')]
      .find((bouton) => bouton.textContent.replace(/\s+/g, ' ').trim().endsWith('Deck'));
    await cliquer(ongletDeck, 'onglet Deck du menu');
    await attendre(() => container.querySelector('.rpg-deck-choice__button'), 'le boîtier du deck apparaît');
    await cliquer(container.querySelector('.rpg-deck-choice__button'), 'ouvrir le boîtier du deck');
    await attendre(() => container.querySelector('.rpg-deck-detail__play'), 'le détail du deck propose de jouer');
    await cliquer(container.querySelector('.rpg-deck-detail__play'), 'jouer avec ce deck');
    await passerMulligan(container, cliquer);
    await attendre(() => container.querySelector('.card-table'), 'la table du duel est ouverte', 8000);

    // ── Tour 1 : Tislit entre en jeu (1 mana Sable) ────────────────────────
    await choisirMana('sable');
    await attendre(() => carteEnMain('Tislit'), 'Tislit en main');
    await glisserSurTable(carteEnMain('Tislit'));
    await attendre(() => carteSurTable('equipe', 'tislit-des-aures'), 'Tislit sur la table');

    // ── Le sorcier installe une proie (il lui faut parfois deux tours) ─────
    for (let tour = 0; tour < 5 && !container.querySelector('.rpg-card--ennemi'); tour += 1) {
      // Chaque tour du joueur s'ouvre sur le choix du mana ; on l'ouvre en
      // Sable et on passe la main sans rien poser.
      await choisirMana('sable');
      await passerTourSorcier();
      await act(async () => { await wait(300); });
    }
    await atteindreProie();

    // ── Tour 2 : la flèche ─────────────────────────────────────────────────
    await choisirMana('sable');
    const cible = await (async () => {
      for (let essai = 0; essai < 6; essai += 1) {
        const trouvée = container.querySelector('.rpg-card--ennemi');
        if (trouvée) return trouvée;
        await act(async () => { await wait(200); });
      }
      return null;
    })();
    assert.ok(cible, 'une proie est disponible pour l’Attaque ciblée');

    sons.length = 0;
    const fichiersAvant = fichiersLus.length;
    await cliquer(carteSurTable('equipe', 'tislit-des-aures'), 'sélectionner Tislit');
    await attendre(() => container.querySelector('.rpg-btn--confirmer-attaque'), 'la déclaration d’attaque s’ouvre');
    await cliquer(cible, 'désigner la proie de l’Attaque ciblée');
    await cliquer(container.querySelector('.rpg-btn--confirmer-attaque'), 'confirmer l’attaque');
    await act(async () => { await wait(400); });

    const noms = sons.map((son) => son.nom);
    if (process.env.RPG_FLE_DEBUG) console.log('SONS', JSON.stringify(sons), 'FICHIERS', JSON.stringify(fichiersLus.slice(fichiersAvant)));
    assert.ok(noms.includes('fleche'),
      `la frappe ciblée joue la flèche (sons : ${noms.join(', ') || 'aucun'})`);
    assert.ok(!noms.includes('player_attack_hit'),
      `une frappe ciblée seule ne joue plus le coup d’épée (sons : ${noms.join(', ')})`);
    assert.ok(!noms.includes('block_impact'),
      'l’attaque s’arrête sur sa proie : aucun choc de blocage');
    // Le fichier réellement lu par l'élément <audio>.
    assert.ok(fichiersLus.slice(fichiersAvant).some((src) => src.includes('arrow-shot.wav')),
      'l’élément <audio> joue arrow-shot.wav');
    assert.ok(!fichiersLus.slice(fichiersAvant).some((src) => src.includes('player-attack-hit.wav')),
      'player-attack-hit.wav reste muet sur une Attaque ciblée');
    // La frappe s'arrête sur la proie : le sorcier ne perd rien.
    assert.match(container.querySelector('.rpg-log')?.textContent ?? '',
      /Attaque ciblée/i, 'le journal annonce l’Attaque ciblée');
  } finally {
    RpgAudioPlayer.prototype.play = jouerOriginal;
    await act(async () => { root.unmount(); });
    container.remove();
  }
}
