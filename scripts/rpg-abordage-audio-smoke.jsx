import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { RpgAudioPlayer } from '../src/games/rpgAudio.js';
import { lancerDuelDepuisMenu, passerMulligan } from './rpg-duel-start.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 30 cartes Sable + Eau conformes à `rpgValiderDeck` (max 2 exemplaires).
// Avec `rng = () => 0.999`, le mélange conserve l'ordre et la main de départ
// (3 cartes en Mana Essai) correspond aux 3 dernières entrées du tableau.
const REMPLISSAGE_PIRATE = [
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

// 26 + 4 = 30 cartes. Main de départ (3 dernières) : Mousse, Raïs #1, Raïs #2.
const DECK_JOUEUR = [
  ...REMPLISSAGE_PIRATE,
  'la-barbe-rousse',
  'rais-de-la-galiote',
  'rais-de-la-galiote',
  'mousse-des-galiotes',
];

// 26 + 4 = 30 cartes. Main de départ du sorcier : Mousse (1), Raïs (2), Barbe-Rousse (6).
const DECK_SORCIER = [
  ...REMPLISSAGE_PIRATE,
  'la-barbe-noire',
  'la-barbe-rousse',
  'rais-de-la-galiote',
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

export async function checkRpgAbordageAudio(assert, fichiersLus = []) {
  const sons = [];
  const jouerOriginal = RpgAudioPlayer.prototype.play;
  RpgAudioPlayer.prototype.play = function espionAbordage(nom, delai) {
    sons.push(nom);
    return jouerOriginal.call(this, nom, delai);
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
    await attendre(
      () => container.querySelector(`.rpg-flux-choix__option--${couleur}`),
      `le choix de mana ${couleur} apparaît`,
    );
    await cliquer(container.querySelector(`.rpg-flux-choix__option--${couleur}`), `choisir mana ${couleur}`);
  };
  const passerTourSorcier = async () => {
    await cliquer(container.querySelector('.rpg-btn--endturn'), 'finir le tour du joueur');
    await act(async () => { await wait(900); });
    for (let essai = 0; essai < 14; essai += 1) {
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
    await act(async () => {
      root.render(<RpgDuelPage joueurDeck={DECK_JOUEUR} sorcierDeck={DECK_SORCIER} rng={() => 0.999} />);
    });
    assert.ok(await lancerDuelDepuisMenu(container, (el) => cliquer(el, 'ouvrir le duel')), 'lancement du duel');
    await passerMulligan(container, cliquer);
    await act(async () => { await wait(120); });

    // ── Tour 1 : chaque camp pose sa Mousse des galiotes (coût 1) ────────────
    await choisirMana('sable');
    await attendre(() => carteEnMain('Mousse des galiotes'), 'Mousse des galiotes en main');
    const mousseJoueur = carteEnMain('Mousse des galiotes');
    await glisserSurTable(mousseJoueur);
    await attendre(
      () => container.querySelector('.rpg-card--equipe[data-card-id="mousse-des-galiotes"]'),
      'Mousse du joueur sur la table',
    );
    assert.ok(!sons.includes('abordage'), 'aucun cliquetis de chaînes sur une créature ordinaire');
    assert.ok(sons.includes('pirate_arrivee'),
      'la Mousse des galiotes, carte pirate, est saluée d’un « Ahoy ! » à son arrivée');
    assert.ok(!sons.includes('navire_arrivee'), 'une créature à terre ne déclenche pas l’ambiance de quai');
    assert.ok(fichiersLus.some((src) => /pirate-ahoy/i.test(src)),
      'l’élément <audio> joue bien pirate-ahoy.mp3 à l’arrivée pirate');

    await passerTourSorcier();
    await attendre(
      () => container.querySelector('.rpg-card--ennemi[data-card-id="mousse-des-galiotes"]'),
      'Mousse du sorcier sur la table',
    );
    // Deuxième arrivée pirate de la partie : l’accueil alterne et laisse la
    // place au dialogue « Alright » (Pirate_Dialogue_Alright.wav).
    assert.ok(sons.includes('pirate_dialogue'),
      'l’arrivée de la Mousse du sorcier joue le second accueil pirate, « Alright »');
    assert.equal(sons.filter((nom) => nom === 'pirate_arrivee').length, 1,
      'le cri « Ahoy ! » ne double pas le dialogue : les deux voix alternent');
    assert.ok(fichiersLus.some((src) => /pirate-dialogue-alright/i.test(src)),
      'l’élément <audio> joue bien pirate-dialogue-alright.wav');

    // ── Tour 2 (Joueur) : Raïs de la galiote kidnappe la Mousse adverse ──────
    await choisirMana('eau');
    sons.length = 0;
    fichiersLus.length = 0;
    const rais1 = carteEnMain('Raïs de la galiote');
    assert.ok(rais1, 'Raïs de la galiote en main');
    await glisserSurTable(rais1);
    await attendre(
      () => container.querySelector('.rpg-card--equipe[data-card-id="rais-de-la-galiote"]'),
      'Raïs du joueur arrive sur la table',
    );
    assert.ok(!sons.includes('abordage'),
      'tant que la victime n’est pas désignée, le cliquetis de chaînes ne part pas');
    // Troisième arrivée pirate : le cycle revient au cri « Ahoy ! ».
    assert.ok(sons.includes('pirate_arrivee'),
      'le Raïs, carte pirate, est accueilli par un nouvel « Ahoy ! » : les voix alternent');
    assert.ok(!sons.includes('navire_arrivee'), 'le Raïs n’est pas un navire');

    const cibleMousseEnnemie = container.querySelector('.rpg-card--ennemi[data-card-id="mousse-des-galiotes"]');
    await cliquer(cibleMousseEnnemie, 'désigner la Mousse adverse à kidnapper');
    await attendre(
      () => container.querySelector('.rpg-card--equipe[data-prisonniere="mousse-des-galiotes"]'),
      'la Mousse adverse est en cale derrière le Raïs du joueur',
    );
    assert.equal(sons.filter((nom) => nom === 'abordage').length, 1,
      'le cliquetis de chaînes retentit exactement une fois au kidnapping');
    assert.ok(fichiersLus.some((src) => /chain-rattle/i.test(src)),
      'l’élément <audio> joue bien chain-rattle.wav');
    assert.ok(!sons.includes('destruction_hit'),
      'une créature kidnappée en cale ne joue jamais le bruit de destruction');

    // ── Tour 2 (Sorcier) : le Raïs du sorcier kidnappe la Mousse du joueur ───
    sons.length = 0;
    fichiersLus.length = 0;
    await passerTourSorcier();
    await attendre(
      () => container.querySelector('.rpg-card--ennemi[data-prisonniere="mousse-des-galiotes"]'),
      'le Raïs du sorcier détient la Mousse du joueur en cale',
    );
    assert.equal(sons.filter((nom) => nom === 'abordage').length, 1,
      'le kidnapping par une créature adverse avec Abordage joue aussi le cliquetis de chaînes');
    assert.ok(fichiersLus.some((src) => /chain-rattle/i.test(src)),
      'l’élément <audio> joue chain-rattle.wav aussi pour un kidnapping adverse');
    assert.ok(!sons.includes('destruction_hit'),
      'pas de bruit de destruction non plus quand le sorcier kidnappe une créature');

    // ── Tour 3 (Joueur) : second Raïs sans cible de coût ≤ 1 → pas de cri ────
    await choisirMana('sable');
    sons.length = 0;
    const rais2 = carteEnMain('Raïs de la galiote');
    assert.ok(rais2, 'second Raïs en main');
    await glisserSurTable(rais2);
    await attendre(
      () => container.querySelectorAll('.rpg-card--equipe[data-card-id="rais-de-la-galiote"]').length === 2,
      'le second Raïs est posé sans prise possible',
    );
    assert.ok(sons.includes('card_place'), 'la pose joue son bruitage de carte');
    assert.ok(!sons.includes('abordage'),
      'sans créature kidnappée, le Raïs n’émet pas le cliquetis d’abordage');
  } finally {
    RpgAudioPlayer.prototype.play = jouerOriginal;
    await act(async () => root.unmount());
    container.remove();
  }
}
