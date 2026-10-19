// Le tour de l'IA du Sablier, joué pour de vrai dans jsdom : le joueur rend la
// main, et le sorcier doit jouer — puis rendre le tour. Ce scénario couvre le
// geste qui suit la fin de tour (préparation, annonce, résolution, attaque) et
// pas seulement l'état du plateau : une exception levée dans cette chaîne
// laissait la partie sur « Au tour du sorcier », immobile.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { lancerDuelDepuisMenu, passerMulligan } from './rpg-duel-start.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Le sorcier ne joue que du Sable : ses renforts de deck sont bon marché, et
 *  au troisième tour (trois manas) il a toujours une carte payable. */
const DECK_JOUER = ['chien-du-guet', 'parade-du-verre', 'mer', 'djinn-de-foudre', 'fennec-des-descombres', 'chien-du-guet', 'mer'];
const DECK_SORCIER = Array.from({ length: 10 }, () => 'tislit-des-aures');

const ACTION_DU_SORCIER = /Le sorcier (annonce|pose|lance|attache|active)\b/;

export async function checkRpgIaJoue(assert) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);

  const cartes = () => [...container.querySelectorAll('button')];
  const bouton = (label) => cartes().find((element) => element.textContent.includes(label));
  const cliquer = async (element, message = 'la commande existe') => {
    assert.ok(element, message);
    await act(async () => { element.click(); });
  };
  const journal = () => [...container.querySelectorAll('.rpg-log__line')]
    .map((ligne) => ligne.textContent).join(' | ');

  try {
    await act(async () => {
      root.render(<RpgDuelPage joueurDeck={DECK_JOUER} sorcierDeck={DECK_SORCIER} rng={() => 0.999} />);
    });
    await lancerDuelDepuisMenu(container, (element) => cliquer(element, 'le menu mène au duel'));
    await act(async () => { await wait(120); });
    await passerMulligan(container, cliquer);
    await act(async () => { await wait(150); });

    let actionVue = false;
    let tourRendu = false;
    for (let tour = 0; tour < 3 && !(actionVue && tourRendu); tour += 1) {
      // Le mana du tour : la fenêtre s'ouvre sur la table, et rien ne se joue
      // tant que la couleur n'est pas choisie.
      const mana = container.querySelector('.rpg-flux-choix__option');
      if (mana) await cliquer(mana, 'le mana du tour se choisit');
      await act(async () => { await wait(120); });

      // La main rendue : le joueur clôt son tour, comme il le ferait.
      const finDuTour = bouton('Fin du tour');
      assert.ok(finDuTour, 'le bouton de fin de tour est là');
      if (finDuTour.disabled) break;
      await cliquer(finDuTour, 'la fin de tour part du clic du joueur');

      // On laisse au sorcier le temps de sa chaîne : préparation, annonce,
      // résolution, puis attaque éventuelle. Les fenêtres qui demandent une
      // réponse se franchissent d'un clic, sans simuler l'état du moteur.
      // On laisse au sorcier le temps de sa chaîne : préparation, annonce,
      // résolution, puis attaque éventuelle. Les fenêtres qui demandent une
      // réponse se franchissent d'un clic, sans simuler l'état du moteur.
      let sorcierVu = false;
      for (let pas = 0; pas < 30; pas += 1) {
        const laisserPasser = bouton('Laisser passer');
        if (laisserPasser && !laisserPasser.disabled) await cliquer(laisserPasser, 'laisser passer');
        const resoudre = bouton('Résoudre le combat');
        if (resoudre && !resoudre.disabled) await cliquer(resoudre, 'résoudre le combat');
        const valider = container.querySelector('.rpg-btn--discard-confirm');
        if (valider) await cliquer(valider, 'valider la défausse');
        if (container.textContent.includes('à défausser') && !container.querySelector('.rpg-btn--discard-confirm')) {
          const carteMain = container.querySelector('.rpg-hand__card');
          if (carteMain) await cliquer(carteMain, 'choisir une carte à défausser');
        }
        await act(async () => { await wait(300); });
        if (ACTION_DU_SORCIER.test(journal())) actionVue = true;
        const fin = bouton('Fin du tour');
        if (fin?.disabled || journal().includes('— Au tour du sorcier.')) sorcierVu = true;
        // La fenêtre de mana ne se rouvre qu'au tour du joueur : elle ne
        // reparaît qu'une fois la chaîne du sorcier allée au bout.
        if (sorcierVu && container.querySelector('.rpg-flux-choix__option')) { tourRendu = true; break; }
      }
    }

    assert.ok(actionVue,
      `le sorcier joue une carte dans son tour (journal : ${journal().slice(-320) || 'vide'})`);
    assert.ok(tourRendu,
      `le sorcier rend le tour au joueur (journal : ${journal().slice(-320) || 'vide'})`);
    assert.equal(container.querySelector('.rpg-mulligan'), null, 'le volet de mulligan est refermé');
  } finally {
    await act(async () => { root.unmount(); });
    container.remove();
  }
}
