// Le plateau derrière une carte consultée, rendu dans jsdom.
// ------------------------------------------------------------
// Une carte ouverte en grand — l'appui long d'une seconde au doigt, la fiche
// d'un clic droit à la souris — pose son voile sombre : la table prend alors
// `data-apercu-carte`, et la carte qui a ouvert l'aperçu reçoit
// `data-apercu-source` pour rester nette pendant que le décor passe au flou
// (`rpg-battle.css`). L'aperçu furtif du survol, lui, ne floute rien : il
// s'ouvre et se referme au passage du curseur.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { RPG_LONG_PRESS_MS } from '../src/games/rpgLongPress.js';
import { lancerDuelDepuisMenu, passerMulligan } from './rpg-duel-start.js';

const DECK_JOUEUR = ['desert', 'chien-du-guet', 'fennec-des-decombres', 'mer', 'montagne', 'ressac', 'parade-du-verre', 'djinn-de-foudre', 'desert', 'desert'];
const DECK_SORCIER = ['montagne', 'desert', 'chien-du-guet', 'fennec-des-decombres', 'dune-marchante', 'montagne', 'chien-du-guet', 'desert', 'djinn-du-souk', 'vipere-de-verre'];

export async function checkRpgPlateauFlou(assert) {
  const originalMatchMedia = window.matchMedia;
  // Appareil tactile en paysage, mouvement réduit : les poses sont synchrones.
  window.matchMedia = () => ({ matches: true });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const q = (selector) => container.querySelector(selector);
  const qa = (selector) => [...container.querySelectorAll(selector)];
  const attendre = (ms) => act(async () => new Promise((resolve) => setTimeout(resolve, ms)));
  const click = async (element, message = 'la commande existe') => {
    assert.ok(element, message);
    await act(async () => { element.click(); });
  };
  const table = () => q('.card-table');
  const marquee = () => q('[data-apercu-source]');
  const fond = () => q('.card-table > .rpg-plateau-fond');
  const main = () => qa('.rpg-hand__card');
  const envoyerPointeur = async (element, type, props = {}) => {
    assert.ok(element, 'la carte existe');
    await act(async () => {
      const evenement = new window.Event(type, { bubbles: true, cancelable: true });
      Object.assign(evenement, {
        pointerType: 'touch', pointerId: 7, clientX: 30, clientY: 30, isPrimary: true, button: 0, ...props,
      });
      element.dispatchEvent(evenement);
    });
  };
  const appuiLong = async (element) => {
    await envoyerPointeur(element, 'pointerdown');
    await attendre(RPG_LONG_PRESS_MS + 120);
    await envoyerPointeur(element, 'pointerup');
  };
  const clicDroit = async (element) => {
    assert.ok(element, 'la cible du clic droit existe');
    await act(async () => {
      element.dispatchEvent(new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, buttons: 2 }));
    });
  };
  const survoler = async (element) => {
    assert.ok(element, 'la carte survolée existe');
    await act(async () => {
      element.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true, clientX: 40, clientY: 40 }));
    });
  };
  const touche = (key) => act(async () => {
    window.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }));
  });

  try {
    await act(async () => {
      root.render(<RpgDuelPage joueurDeck={DECK_JOUEUR} sorcierDeck={DECK_SORCIER} rng={() => 0.5} />);
    });
    assert.ok(await lancerDuelDepuisMenu(container, (element) => click(element, 'le menu mène au duel')), 'l’onglet Deck lance le duel');
    await passerMulligan(container, (element) => click(element, 'le volet se valide'));
    await attendre(160);

    // ── 1. Au repos : la table est nette, le calque jumeau attend ───────────
    assert.ok(table(), 'la table de duel est rendue');
    assert.equal(table().hasAttribute('data-apercu-carte'), false, 'sans aperçu ouvert, la table n’est pas marquée');
    assert.ok(fond(), 'le calque jumeau de la peinture est posé dans la table, prêt à la remplacer');
    assert.ok(marquee() === null, 'aucune carte ne garde le focus quand rien n’est consulté');

    // ── 2. L'aperçu furtif du survol ne floute rien ─────────────────────────
    await survoler(main()[0]);
    assert.ok(q('.rpg-hover-card-preview'), 'le survol ouvre bien l’aperçu rapide');
    await attendre(460);
    assert.equal(table().hasAttribute('data-apercu-carte'), false,
      'l’aperçu du survol ne floute pas le plateau : il s’ouvre au passage de la souris');

    // ── 3. L'appui long : le plateau se marque, la carte pressée reste nette ─
    const cartePressee = main()[0];
    const idPresse = cartePressee.dataset.cardId;
    await appuiLong(cartePressee);
    assert.ok(q('.rpg-card-peek'), 'l’appui long ouvre la fiche de la carte');
    assert.equal(table().getAttribute('data-apercu-carte'), 'fiche',
      'la table porte l’aperçu ouvert : la feuille de style y lit le flou du plateau');
    assert.ok(marquee() === cartePressee,
      'la carte consultée garde le focus : seule l’élément pressé est marqué');
    assert.equal(cartePressee.hasAttribute('data-apercu-source'), true,
      'la carte pressée échappe au flou (`data-apercu-source`)');
    assert.equal(qa('[data-card-id][data-apercu-source]').length, 1,
      'une seule carte échappe au flou : ses voisines se floutent avec le décor');

    // ── 4. À la fermeture, tout rentre dans l'ordre ─────────────────────────
    // Le clic qui suit la levée du doigt est avalé 400 ms (`rpgLongPress.js`) :
    // on laisse passer la fenêtre, comme le fait un joueur qui lit sa carte.
    await attendre(460);
    await click(q('.rpg-card-peek__close'), 'le volet se ferme d’un bouton');
    assert.ok(q('.rpg-card-peek') === null, 'la fiche est refermée');
    assert.equal(table().hasAttribute('data-apercu-carte'), false, 'le plateau redevient net');
    assert.ok(marquee() === null, 'la marque de focus est retirée avec l’aperçu');

    // ── 5. Le clic droit ouvre la même fiche, avec le même focus ────────────
    const mainAvant = main().length;
    const carteDroite = main()[1] ?? main()[0];
    await clicDroit(carteDroite);
    assert.ok(q('.rpg-card-peek'), 'le clic droit ouvre la fiche sans rien jouer');
    assert.equal(table().getAttribute('data-apercu-carte'), 'fiche',
      'la fiche d’un clic droit floute le plateau comme celle de l’appui long');
    assert.ok(marquee() === carteDroite, 'la carte cliquée droit garde le focus');
    assert.equal(main().length, mainAvant, 'consulter une carte ne la joue pas : la main est intacte');
    assert.equal(idPresse, main()[0].dataset.cardId, 'et elle n’a pas quitté sa place');

    // ── 6. Échap referme : plus rien de flou ────────────────────────────────
    await touche('Escape');
    assert.ok(q('.rpg-card-peek') === null, 'Échap referme la fiche');
    assert.equal(table().hasAttribute('data-apercu-carte'), false, 'Échap rend le plateau net');
    assert.ok(marquee() === null, 'Échap retire la marque de focus');

    // ── 7. Un aperçu n'efface pas la peinture du plateau ────────────────────
    assert.match(table().style.backgroundImage, /url\(/,
      'la peinture du plateau reste sur la table : le calque flou ne fait que la doubler');
    assert.equal(fond().getAttribute('aria-hidden'), 'true',
      'le calque jumeau ne dit rien de plus que la table aux lecteurs d’écran');
  } finally {
    window.matchMedia = originalMatchMedia;
    await act(async () => { root.unmount(); });
    container.remove();
  }
}
