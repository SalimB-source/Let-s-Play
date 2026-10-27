// La vraie page de duel : les quatre étages du Souk, le choix de profil et le
// duel en ligne. Le décor CSS doit survivre même quand WebGL n'est pas présent.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import RpgPvpBoard from '../src/games/RpgPvpBoard.jsx';
import { RPG_DECKS_ARCHETYPES } from '../src/games/rpgCards.js';
import { rpgNouveauDuel } from '../src/games/rpgDuel.js';
import { RPG_PROFIL_STORAGE_KEY } from '../src/games/rpgProfil.js';
import { RPG_STORY_LEGACY_STORAGE_KEY, RPG_STORY_STORAGE_KEY } from '../src/games/rpgStory.js';
import { acteSuivantHistoire, questionChoix, sceneHistoire } from '../src/games/rpgStoryScenes.js';
import { recitHistoireVide, transitionRecitHistoire } from '../src/games/rpgStoryFlow.js';
import { passerMulligan } from './rpg-duel-start.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Une sauvegarde valide au briefing du premier duel du Souk : les transitions
// sont celles du récit, pas un curseur fabriqué en dehors de la campagne.
function progressionAuSouk(assert) {
  let recit = recitHistoireVide();
  let etagesVaincus = [];
  const atteint = () => recit.curseur.type === 'duel' && recit.curseur.etageId === 'souk-1';
  for (let garde = 0; garde < 200 && !atteint(); garde += 1) {
    const curseur = recit.curseur;
    if (curseur.type === 'fin') {
      const suivant = acteSuivantHistoire(curseur.acteId ?? 'acte-1');
      assert.ok(suivant, 'un acte conduit à la Tour du Souk');
      recit = transitionRecitHistoire(recit, { type: 'ouvrir-acte', curseur, acteId: suivant.id }, etagesVaincus);
    } else if (curseur.type === 'duel') {
      etagesVaincus = [...etagesVaincus, curseur.etageId];
      recit = transitionRecitHistoire(recit, { type: 'victoire', curseur, etageId: curseur.etageId }, etagesVaincus);
    } else {
      const scene = sceneHistoire(curseur.id);
      if (scene.choix) {
        const optionId = questionChoix(scene.choix).options[0].id;
        recit = transitionRecitHistoire(recit, { type: 'resumer', curseur }, etagesVaincus);
        recit = transitionRecitHistoire(recit, { type: 'choisir', curseur: recit.curseur, optionId }, etagesVaincus);
      } else {
        recit = transitionRecitHistoire(recit, { type: 'continuer', curseur }, etagesVaincus);
      }
    }
  }
  assert.ok(atteint(), 'le récit atteint le premier duel du Souk');
  return { version: 2, etagesVaincus, recit };
}

export async function checkPlateauSouk(assert) {
  window.localStorage.clear();
  window.localStorage.setItem('letsplay_sablier_sound_v1', 'off');
  // Les premiers étages déjà gagnés restent rejouables : les quatre boutons de
  // la tour sont ainsi accessibles sans simuler de victoire du moteur.
  window.localStorage.setItem(RPG_STORY_LEGACY_STORAGE_KEY, JSON.stringify({
    version: 1, etagesVaincus: ['souk-1', 'souk-2', 'souk-3'],
  }));
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root = null;
  const query = (selector) => container.querySelector(selector);
  const cliquer = async (element) => {
    assert.ok(element, 'la commande demandée est affichée');
    assert.equal(element.disabled, false, 'la commande est disponible');
    await act(async () => element.click());
    await wait(30);
    await act(async () => {});
  };
  const monter = async (element) => {
    if (root) await act(async () => root.unmount());
    root = createRoot(container);
    await act(async () => root.render(element));
    await wait(30);
    await act(async () => {});
  };
  const ouvrirTours = () => cliquer(query('.rpg-mode-menu__hero-actions .rpg-menu-button--conquete'));
  const ouvrirSouk = () => cliquer(query('.rpg-story-tower[data-tour="tour-du-souk"]'));
  const ouvrirEtage = async (id) => {
    await cliquer(query(`.rpg-story-floor[data-etage="${id}"]`));
    await passerMulligan(container, cliquer);
    const table = query('.card-table');
    assert.ok(table, `${id} ouvre bien la table de duel`);
    return table;
  };
  const revenirAuxTours = () => cliquer([...container.querySelectorAll('button')]
    .find((button) => button.textContent.trim() === 'Menu'));
  const paquetSable = Array(30).fill('chien-du-guet');

  try {
    await monter(<RpgDuelPage joueurDeck={paquetSable} rng={() => 0.1} />);
    await ouvrirTours();
    for (const id of ['souk-1', 'souk-2', 'souk-3', 'souk-4']) {
      await ouvrirSouk();
      const table = await ouvrirEtage(id);
      assert.equal(table.dataset.plateauJoueur, 'erg-du-sahara', 'le joueur garde son propre terrain');
      assert.equal(table.dataset.plateauAdversaire, 'place-du-souk', `${id} se joue au Souk côté adversaire`);
      assert.ok(table.classList.contains('card-table--decoupee'));
      const moitie = table.querySelector('.rpg-plateau-moitie--adverse');
      assert.ok(moitie.classList.contains('rpg-plateau-moitie--plateau-place-du-souk'));
      assert.match(moitie.style.backgroundImage, /plateau-place-du-souk\.jpg/);
      assert.match(table.getAttribute('aria-label'), /La Place du Souk côté sorcier/);
      await revenirAuxTours();
    }

    // Choisir le terrain depuis le vrai profil, puis lancer le même étage : les
    // deux camps utilisent cette fois la place d'un seul tenant et sa 3D.
    await monter(<RpgDuelPage joueurDeck={paquetSable} rng={() => 0.1} />);
    await cliquer(query('[data-profil-onglet]'));
    const choix = query('[data-profil-plateau="place-du-souk"]');
    assert.match(choix.style.backgroundImage, /profil\/plateaux\/place-du-souk\.webp/);
    await cliquer(choix);
    assert.equal(choix.getAttribute('aria-pressed'), 'true');
    assert.equal(JSON.parse(window.localStorage.getItem(RPG_PROFIL_STORAGE_KEY)).plateau, 'place-du-souk');
    await cliquer(query('[data-profil-retour]'));
    await ouvrirTours();
    await ouvrirSouk();
    const table = await ouvrirEtage('souk-1');
    assert.equal(table.dataset.plateauJoueur, 'place-du-souk');
    assert.equal(table.dataset.plateauAdversaire, 'place-du-souk');
    assert.ok(!table.classList.contains('card-table--decoupee'));
    assert.match(table.style.backgroundImage, /plateau-place-du-souk\.jpg/);
    assert.ok(table.querySelector('[data-table-3d="place-du-souk"]'), 'le décor 3D est proposé');
    assert.equal(table.querySelector('[data-table-3d]').dataset.renderer, 'fallback', 'sans WebGL la peinture reste visible');

    // En ligne aussi, le choix local du profil peint la moitié du joueur sans
    // remplacer le terrain adverse ni modifier l'état du serveur.
    const deck = RPG_DECKS_ARCHETYPES.find(({ id }) => id === 'cour-des-djinns');
    assert.ok(deck, 'la Cour des Djinns est disponible pour le duel en ligne');
    const vue = rpgNouveauDuel({
      joueurDeck: deck.cardIds.filter((id) => id !== 'desert' && id !== 'montagne'),
      sorcierDeck: deck.cardIds.filter((id) => id !== 'desert' && id !== 'montagne'),
      modeMana: 'essai', joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], rng: () => 0.25,
    });
    await monter(<RpgPvpBoard vue={vue} code="SOUK" decks={{ joueur: deck, sorcier: deck }} />);
    const tablePvp = query('.card-table');
    assert.ok(tablePvp);
    assert.equal(tablePvp.dataset.plateauJoueur, 'place-du-souk');
    assert.equal(tablePvp.dataset.plateauAdversaire, 'table-des-heures');
    assert.match(tablePvp.querySelector('.rpg-plateau-moitie--joueur').style.backgroundImage, /plateau-place-du-souk\.jpg/);

    // Le récit utilise le même terrain en lançant le vrai briefing de l'acte II.
    await act(async () => root.unmount());
    root = null;
    window.localStorage.clear();
    window.localStorage.setItem('letsplay_sablier_sound_v1', 'off');
    window.localStorage.setItem(RPG_STORY_STORAGE_KEY, JSON.stringify(progressionAuSouk(assert)));
    await monter(<RpgDuelPage joueurDeck={paquetSable} rng={() => 0.1} />);
    await cliquer(query('.rpg-mode-menu__hero-actions .rpg-menu-button--histoire'));
    if (!query('[data-story-campaign]') && query('.rpg-narrative__back')) {
      await cliquer(query('.rpg-narrative__back'));
    }
    await cliquer(query('[data-story-campaign]'));
    await cliquer(query('[data-story-start-duel]'));
    await passerMulligan(container, cliquer);
    const tableRecit = query('.card-table');
    assert.equal(tableRecit?.dataset.plateauAdversaire, 'place-du-souk', 'le récit monte aussi la place côté sorcier');
    assert.match(tableRecit.querySelector('.rpg-plateau-moitie--adverse').style.backgroundImage, /plateau-place-du-souk\.jpg/);
  } finally {
    if (root) await act(async () => root.unmount());
    container.remove();
    window.localStorage.clear();
  }
}
