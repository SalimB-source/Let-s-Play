import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { RpgAudioPlayer } from '../src/games/rpgAudio.js';

import { installerDeckMaisonDeTest, passerMulligan } from './rpg-duel-start.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Le remplissage Braise des scénarios de la table : communes et rares, deux
// exemplaires au plus pour les communes (limite du format).
const REMPLISSAGE = [...['ashigaru-des-braises', 'ghul-des-cendres', 'hatamoto-des-cendres', 'ronin-du-soleil-rouge']
  .flatMap((id) => [id, id]),
'samourai-du-torii', 'kenshi-de-la-forge', 'sahir-des-braises', 'braisier-du-souk', 'onna-musha-des-cendres',
'tengu-du-mont-ardent', 'oni-de-la-fournaise', 'daimyo-du-soleil-rouge', 'anqa-des-braises', 'ifrit-des-ergs',
'feriel', 'ifrit-al-ahmar', 'frappe-iaijutsu', 'armure-de-cendres'];

// Le joueur : trente cartes Braise, tirées à l'identique (`rng 0.999`). La
// main de départ tient la **Tour de Braise** seule carte jouable — c'est elle
// qui inflige 1 dégât à une créature adverse **désignée**.
const DECK_JOUEUR = [...REMPLISSAGE,
  'tour-de-braise', 'kagutsuchi-flamme-originelle', 'cavalier-des-deux-sabres', 'orochi',
  'trait-de-braise', 'tour-de-braise', 'lionne-du-midi-ardent', 'susanoo'];

// Le sorcier : la même famille de cartes, mais son Le Brûlot à deux manas entre
// en jeu tôt — c'est la cible que la Tour doit brûler.
const DECK_SORCIER = [...REMPLISSAGE,
  'le-brulot', 'kagutsuchi-flamme-originelle', 'cavalier-des-deux-sabres', 'orochi',
  'trait-de-braise', 'lionne-du-midi-ardent', 'le-brulot', 'susanoo'];

function creerTransfert() {
  const values = new Map();
  return {
    effectAllowed: 'move',
    dropEffect: 'move',
    types: [],
    setData(type, value) { values.set(type, value); this.types = [...values.keys()]; },
    getData(type) { return values.get(type) ?? ''; },
    clearData() { values.clear(); this.types = []; },
  };
}

function envoyerEvenementGlisser(target, type, dataTransfer) {
  const event = new window.Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
  target.dispatchEvent(event);
}

/**
 * La Tour de Braise en jeu réel : sa **flamme n'est pas jouée à la pose**.
 * Le souffle attend le clic qui désigne la créature qui prend le dégât — avant
 * ce clic, la table est muette de feu, et le joueur peut encore renoncer.
 */
export async function checkRpgArriveeSouffle(assert, fichiersLus = []) {
  const sons = [];
  const jouerOriginal = RpgAudioPlayer.prototype.play;
  RpgAudioPlayer.prototype.play = function espionSouffle(nom, delai) {
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
  const boutonTexte = (texte) => [...container.querySelectorAll('button')]
    .find((bouton) => bouton.textContent.replace(/\s+/g, ' ').trim().includes(texte));
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
    installerDeckMaisonDeTest(DECK_JOUEUR, 'maison-arrivee-smoke');
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

    // ── La Tour en main, une proie en face ────────────────────────────────
    await choisirMana('braise');
    await attendre(() => carteEnMain('Tour de Braise'), 'la Tour de Braise est en main');
    // Le mana pousse d'un tour à l'autre : on laisse le sorcier poser sa
    // créature (Le Brûlot) et la Tour devient jouable à trois manas.
    for (let tour = 0; tour < 6; tour += 1) {
      await choisirMana('braise');
      const prete = carteEnMain('Tour de Braise')?.getAttribute('data-jouable') === 'true';
      const proie = container.querySelector('.rpg-card--ennemi');
      if (prete && proie) break;
      await passerTourSorcier();
      await act(async () => { await wait(300); });
    }
    const proie = container.querySelector('.rpg-card--ennemi');
    assert.ok(proie, 'une créature adverse attend d’être brûlée');
    const tour = carteEnMain('Tour de Braise');
    assert.equal(tour?.getAttribute('data-jouable'), 'true', 'la Tour est jouable sur le mana du tour');

    // ── La pose : la Tour arrive, mais rien ne brûle encore ───────────────
    sons.length = 0;
    const fichiersAvant = fichiersLus.length;
    await glisserSurTable(tour);
    await attendre(() => carteSurTable('equipe', 'tour-de-braise'), 'la Tour arrive sur la table');
    // La désignation s'ouvre : le joueur doit choisir la créature qui prend
    // le dégât — et peut encore renoncer.
    await attendre(() => boutonTexte('Renoncer à la cible'), 'la table demande la victime des 1 dégât');
    await act(async () => { await wait(400); });

    const nomsPose = sons.map((son) => son.nom);
    if (process.env.RPG_FLE_DEBUG) console.log('SONS À LA POSE', JSON.stringify(sons));
    assert.ok(!nomsPose.includes('flame_gust'),
      `la Tour ne brûle pas à la pose (sons : ${nomsPose.join(', ') || 'aucun'})`);
    assert.ok(!fichiersLus.slice(fichiersAvant).some((src) => src.includes('flame-gust.wav')),
      'flame-gust.wav reste silencieux tant que la victime n’est pas désignée');

    // ── Le clic : la flamme part avec les 1 dégât ─────────────────────────
    sons.length = 0;
    await cliquer(proie, 'désigner la créature qui prend le dégât');
    await act(async () => { await wait(400); });
    const nomsCible = sons.map((son) => son.nom);
    if (process.env.RPG_FLE_DEBUG) console.log('SONS À LA DÉSIGNATION', JSON.stringify(sons), 'FICHIERS', JSON.stringify(fichiersLus.slice(fichiersAvant)));
    assert.ok(nomsCible.includes('flame_gust'),
      `le souffle de la Tour part sur la cible désignée (sons : ${nomsCible.join(', ') || 'aucun'})`);
    assert.ok(fichiersLus.slice(fichiersAvant).some((src) => src.includes('flame-gust.wav')),
      'l’élément <audio> joue flame-gust.wav au clic');
    assert.match(container.querySelector('.rpg-log')?.textContent ?? '', /Tour de Braise/i,
      'le journal garde la trace de la Tour');
  } finally {
    RpgAudioPlayer.prototype.play = jouerOriginal;
    await act(async () => { root.unmount(); });
    container.remove();
  }
}
