// Rendu réel de l'onglet Deck dans jsdom : boîtiers 3D illustrés, liste des cartes qui
// n'apparaît qu'une fois un deck cliqué, bouton « Sélectionner » (choix mémorisé sur
// l'appareil, Cour des Djinns comprise) et filtre par couleur.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { RPG_DECKS, RPG_DUEL_CARDS, cardById, cardColors, cardFrameColor, carteJouableSansTerrain } from '../src/games/rpgCards.js';
import { collectionJoueur } from '../src/games/rpgCollection.js';
import { RPG_DECK_STORAGE_KEY } from '../src/games/rpgDeckChoice.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const setterNomGlobal = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
const texte = (element) => (element?.textContent ?? '').replace(/\s+/g, ' ').trim();

const DECK_DE_TEST = ['chien-du-guet', 'chien-du-guet', 'parade-du-verre', 'djinn-de-foudre', 'fennec-des-decombres', 'guetteur-du-beffroi', 'dune-marchante', 'faiseur-de-passage', 'tislit-des-aures', 'tiziri-du-djurdjura'];
const SORCIER_DE_TEST = ['chien-du-guet', 'chien-du-guet', 'guetteur-du-beffroi', 'dune-marchante', 'faiseur-de-passage', 'fennec-des-decombres', 'parade-du-verre', 'djinn-de-foudre', 'tislit-des-aures', 'tiziri-du-djurdjura'];

/**
 * Monte la page dans le document courant. `vraisDecks` : pas de deck de test, le duel se joue
 * avec les cartes réelles du deck choisi (sinon le deck de test remplace les cartes du duel).
 */
async function monter(assert, { vraisDecks = false } = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(vraisDecks
      ? <RpgDuelPage rng={() => 0.999} />
      : <RpgDuelPage joueurDeck={DECK_DE_TEST} sorcierDeck={SORCIER_DE_TEST} rng={() => 0.999} />);
  });
  const settle = async () => {
    for (let i = 0; i < 3; i += 1) {
      await act(async () => { });
      await wait(30);
    }
  };
  const click = async (element, hint = '?') => {
    assert.ok(element, `l’élément attendu existe (${hint})`);
    await act(async () => { element.click(); });
    await settle();
  };
  const api = {
    container,
    settle,
    click,
    tab: (label) => [...container.querySelectorAll('.rpg-mode-menu__switch button')].find((button) => button.textContent.includes(label)),
    boxButtons: () => [...container.querySelectorAll('.rpg-deck-choice__button')],
    carte: (nom) => [...container.querySelectorAll('.rpg-deck-choice:not(.rpg-deck-choice--neuf)')].find((choix) => choix.querySelector('strong')?.textContent === nom),
    selection: (nom) => api.carte(nom)?.querySelector('.rpg-deck-choice__select'),
    puce: (label) => [...container.querySelectorAll('.rpg-deck-filter__chip')].find((puce) => texte(puce) === label),
    decksVisibles: () => [...container.querySelectorAll('.rpg-deck-choice:not(.rpg-deck-choice--neuf)')].map((choix) => choix.querySelector('strong').textContent),
    deckDeJeu: () => texte(container.querySelector('.rpg-menu-deck-summary--player')),
    adversaire: () => texte(container.querySelector('.rpg-menu-deck-summary--opponent')),
    plaque: (camp) => texte(container.querySelector(`.rpg-wizard-plate--${camp} .rpg-wizard-plate__identity`)),
    avatar: (camp) => container.querySelector(`.rpg-wizard-plate--${camp} .rpg-wizard-plate__avatar img`)?.getAttribute('src') ?? '',
    demonter: async () => {
      await act(async () => { root.unmount(); });
      container.remove();
    },
  };
  return api;
}

const stocke = () => window.localStorage.getItem(RPG_DECK_STORAGE_KEY);
const ARTS = Object.fromEntries(RPG_DECKS.map((deck) => [deck.id, deck.boxArt]));
const vignetteJeu = (container) => container.querySelector('.rpg-menu-deck-summary--player img')?.getAttribute('src') ?? '';
/**
 * La fenêtre « Partie rapide » est devenue le seul miroir du deck de jeu sur
 * l'écran Jouer : elle s'ouvre, dit quel deck est choisi et lequel est
 * l'actuel, puis se referme.
 */
const deckChoisiSurJouer = async (assert, page, label) => {
  await page.click(page.container.querySelector('.rpg-menu-button--partie-rapide'), `Partie rapide (${label})`);
  const overlay = page.container.querySelector('.rpg-partie-rapide');
  assert.ok(overlay, 'la fenêtre « Partie rapide » s’ouvre');
  const choisi = texte(overlay.querySelector('.rpg-partie-rapide__deck.is-selected .rpg-partie-rapide__deck-name'));
  const actuel = texte([...overlay.querySelectorAll('.rpg-partie-rapide__deck')]
    .find((deck) => deck.querySelector('.rpg-partie-rapide__badge'))?.querySelector('.rpg-partie-rapide__deck-name'));
  const art = overlay.querySelector('.rpg-partie-rapide__deck.is-selected .rpg-partie-rapide__deck-art')?.style.backgroundImage ?? '';
  await page.click(overlay.querySelector('.rpg-partie-rapide__close'), 'refermer la fenêtre');
  return { choisi, actuel, art };
};
const NOMS = Object.fromEntries(RPG_DECKS.map((deck) => [deck.id, deck.name]));
const VEILLEURS = NOMS['veilleurs-du-desert'];
const SENTIERS = NOMS['sentiers-de-cendre'];
const COUR = NOMS['cour-des-djinns'];
const MAREE = NOMS['maree-des-abysses'];
const SERMENT = NOMS['serment-des-neuf-hivers'];
const SOLEIL = NOMS['serment-du-soleil-rouge'];
const BALANCE = NOMS['balance-des-heures'];
const LETTRES = NOMS['lettres-de-marque'];

export async function checkRpgDecks(assert) {
  window.localStorage.clear();
  const page = await monter(assert);
  const { container, click, tab, boxButtons } = page;
  const names = RPG_DECKS.map((deck) => deck.name);

  // --- Onglet Deck, avant tout clic : une étagère de boîtiers, aucune liste -----------------
  await click(tab('Deck'), 'onglet Deck');
  assert.ok(container.querySelector('.rpg-deck-catalog--closed'), 'l’onglet Deck s’ouvre sur l’étagère fermée');
  assert.equal(container.querySelectorAll('.rpg-deck-choice:not(.rpg-deck-choice--neuf)').length, RPG_DECKS.length, 'un boîtier par deck');
  assert.ok(container.querySelector('.rpg-deck-choice--neuf'), 'la crate « Nouveau deck » attend au début de l’étagère');
  assert.ok(!container.querySelector('.rpg-deck-list'), 'aucune liste de cartes tant qu’aucun deck n’est cliqué');
  assert.ok(!container.querySelector('.rpg-deck-detail'), 'aucune fiche de deck tant qu’aucun deck n’est cliqué');
  assert.ok(!container.textContent.includes('Liste des cartes'), 'le titre « Liste des cartes » n’est pas affiché');
  assert.ok(!container.textContent.includes('Jouer avec ce deck'), 'le bouton « Jouer avec ce deck » attend lui aussi le clic');

  // --- Chaque deck est un boîtier 3D illustré -----------------------------------------------
  const boxes = [...container.querySelectorAll('.rpg-deck-choice .rpg-deckbox')];
  assert.equal(boxes.length, RPG_DECKS.length, 'chaque choix de deck porte un boîtier 3D');
  const artUrls = boxes.map((box) => box.querySelector('.rpg-deckbox__art').style.backgroundImage);
  RPG_DECKS.forEach((deck, index) => {
    assert.equal(boxes[index].querySelectorAll('.rpg-deckbox__face').length, 6, `le boîtier « ${deck.name} » a ses six faces`);
    assert.ok(artUrls[index].includes(`/cards/${deck.boxArt}.jpg`), `le boîtier « ${deck.name} » porte l’illustration ${deck.boxArt} (${artUrls[index]})`);
    assert.equal(boxes[index].getAttribute('aria-hidden'), 'true', 'le décor 3D est masqué aux lecteurs d’écran (le bouton porte le nom)');
    assert.equal(boxes[index].querySelector('.rpg-deckbox__title').textContent, deck.name, 'le dos du boîtier porte le nom du deck');
  });
  assert.equal(new Set(artUrls).size, RPG_DECKS.length, 'chaque boîtier a sa propre illustration');
  boxButtons().forEach((button, index) => {
    assert.ok(button.textContent.includes(names[index]), 'le bouton du boîtier porte le nom du deck (nom accessible)');
    assert.equal(button.getAttribute('aria-pressed'), 'false', 'aucun boîtier n’est ouvert au départ');
  });

  // --- Le deck de jeu : le premier deck de joueur tant que rien n’est choisi -----------------
  assert.equal(container.querySelectorAll('.rpg-deck-choice.is-active').length, 1, 'un seul deck de jeu est signalé sur l’étagère');
  assert.ok(container.querySelector('.rpg-deck-choice.is-active')?.textContent.includes(VEILLEURS), 'le deck de jeu par défaut est le premier deck de joueur');
  assert.equal(stocke(), null, 'rien n’est mémorisé tant que le joueur n’a rien choisi');

  // --- Clic sur un boîtier : la fiche et la liste apparaissent, SANS changer de deck de jeu ---
  // La liste occupe toute la largeur : le rail « Vos decks » s'efface pendant la lecture.
  const adverse = RPG_DECKS.findIndex((deck) => deck.role === 'adversaire');
  await click(boxButtons()[adverse], 'boîtier de la Cour des Djinns');
  assert.ok(container.querySelector('.rpg-deck-catalog--open'), 'le clic ouvre le deck');
  const detail = container.querySelector('.rpg-deck-detail');
  assert.ok(detail, 'la fiche du deck apparaît');
  assert.match(detail.getAttribute('aria-label'), new RegExp(RPG_DECKS[adverse].name), 'la fiche est celle du deck cliqué');
  const uniques = new Set(RPG_DECKS[adverse].cardIds).size;
  assert.equal(container.querySelectorAll('.rpg-deck-list li').length, uniques, 'la liste montre toutes les références du deck');
  assert.match(container.querySelector('.rpg-deck-detail__list-heading').textContent, /Liste des cartes/, 'la liste est titrée');
  assert.ok(!container.querySelector('.rpg-deck-catalog__rail'), 'le rail « Vos decks » s’efface tant qu’un deck est ouvert');
  assert.ok(!container.querySelector('.rpg-deck-choice__button'), 'les boîtiers de l’étagère ne sont plus rendus');
  assert.ok(!container.querySelector('.rpg-deck-detail__note'), 'la Cour des Djinns n’est plus « réservée au sorcier » : aucune note');
  assert.ok(container.textContent.includes('Jouer avec ce deck'), 'la Cour des Djinns propose, elle aussi, de jouer avec elle');
  assert.match(container.querySelector('.rpg-deck-detail__header .rpg-mode-menu__eyebrow').textContent, /VOTRE DECK/, 'sa fiche ne parle plus de « deck adverse »');
  assert.ok(container.querySelector('.rpg-deck-detail .rpg-deckbox--showcase'), 'la fiche expose le boîtier en grand');

  // --- Changer de deck : fermer la fiche, puis ouvrir l'autre boîtier -------------------------
  const hybride = RPG_DECKS.findIndex((deck) => deck.element === 'hybride');
  await click(container.querySelector('.rpg-deck-detail__close'), 'Fermer le deck pour changer');
  assert.ok(container.querySelector('.rpg-deck-catalog--closed'), 'fermer le deck rouvre l’étagère');
  assert.ok(container.querySelector('.rpg-deck-choice.is-active')?.textContent.includes(VEILLEURS), 'ouvrir la Cour ne l’a pas sélectionnée : Veilleurs reste le deck de jeu');
  await click(boxButtons()[hybride], 'boîtier du deck hybride');
  assert.equal(container.querySelector('.rpg-deck-detail h2').textContent, RPG_DECKS[hybride].name, 'la fiche suit le deck cliqué');
  assert.equal(container.querySelectorAll('.rpg-deck-list li').length, new Set(RPG_DECKS[hybride].cardIds).size, 'la liste suit le deck cliqué');
  assert.ok(container.textContent.includes('Jouer avec ce deck'), 'chaque deck propose de jouer avec lui');
  assert.equal(stocke(), null, 'ouvrir des boîtiers ne mémorise rien');

  // --- Fermer le deck masque de nouveau la liste ---------------------------------------------
  await click(container.querySelector('.rpg-deck-detail__close'), 'bouton Fermer le deck');
  assert.ok(!container.querySelector('.rpg-deck-list'), 'fermer le deck retire la liste');
  assert.ok(!container.querySelector('.rpg-deck-detail'), 'fermer le deck retire la fiche');
  assert.ok(container.querySelector('.rpg-deck-catalog--closed'), 'l’étagère redevient fermée');
  assert.ok(container.querySelector('.rpg-deck-choice__button'), 'les boîtiers reviennent sur l’étagère');

  // --- Quitter l'onglet puis revenir : on repart sans liste, le deck de jeu n'a pas bougé ----
  await click(boxButtons()[hybride], 'réouverture du deck hybride');
  assert.ok(container.querySelector('.rpg-deck-list'), 'la liste revient au clic');
  await click(tab('Jouer'), 'onglet Jouer');
  const rapideA = await deckChoisiSurJouer(assert, page, 'ouverture d’un boîtier');
  assert.ok(rapideA.choisi.includes(VEILLEURS) && rapideA.actuel.includes(VEILLEURS), 'ouvrir un boîtier ne change pas le deck de jeu');
  assert.ok(rapideA.art.includes(`/cards/${ARTS['veilleurs-du-desert']}.jpg`), 'la fenêtre Partie rapide montre l’illustration du deck de jeu (Veilleurs par défaut)');
  await click(tab('Deck'), 'retour sur l’onglet Deck');
  assert.ok(!container.querySelector('.rpg-deck-list'), 'revenir sur l’onglet Deck ne rouvre aucune liste');

  // --- « Sélectionner » : un bouton sous chaque boîtier --------------------------------------
  const cartes = [...container.querySelectorAll('.rpg-deck-choice:not(.rpg-deck-choice--neuf)')];
  cartes.forEach((choix) => {
    const nom = choix.querySelector('strong').textContent;
    const boutons = [...choix.children].filter((enfant) => enfant.tagName === 'BUTTON');
    assert.equal(boutons.length, 2, `« ${nom} » : le bouton d’ouverture et le bouton de sélection`);
    assert.ok(boutons[0].classList.contains('rpg-deck-choice__button') && boutons[1].classList.contains('rpg-deck-choice__select'),
      `« ${nom} » : « Sélectionner » vient après le boîtier, sous lui`);
    assert.ok(!boutons[0].querySelector('button'), `« ${nom} » : aucun bouton imbriqué dans un bouton`);
  });
  assert.equal(page.selection(VEILLEURS).getAttribute('aria-disabled'), 'true', 'le deck de jeu courant se présente comme déjà sélectionné');
  assert.match(page.selection(VEILLEURS).textContent, /Sélectionné/, 'avec son libellé « Sélectionné »');
  assert.equal(page.selection(SENTIERS).textContent.trim(), 'Sélectionner', 'un deck de joueur propose « Sélectionner »');
  assert.ok(!page.selection(SENTIERS).disabled && !page.selection(SENTIERS).hasAttribute('aria-disabled'), 'et ce bouton est actif');
  assert.equal(page.selection(COUR).textContent.trim(), 'Sélectionner', 'la Cour des Djinns propose « Sélectionner » comme les autres');
  assert.ok(!page.selection(COUR).disabled && !page.selection(COUR).hasAttribute('aria-disabled'), 'et son bouton est actif');
  assert.ok(!container.textContent.includes('Réservé à l’adversaire') && !container.textContent.includes('DECK ADVERSAIRE'), 'plus aucune mention « réservé à l’adversaire » sur l’étagère');
  assert.ok(![...container.querySelectorAll('.rpg-deck-choice__select')].some((bouton) => bouton.disabled), 'aucun bouton « Sélectionner » désactivé : les huit decks sont complets');
  assert.match(page.selection(SENTIERS).getAttribute('aria-label'), new RegExp(`Sélectionner.*${SENTIERS}`), 'le bouton a un nom accessible qui cite le deck');
  const etat = container.querySelector('.rpg-deck-catalog__status');
  assert.equal(etat?.getAttribute('role'), 'status', 'le deck de jeu est annoncé dans une zone d’état');
  assert.ok(texte(etat).includes(VEILLEURS), 'la ligne d’état nomme le deck de jeu');

  // La Cour des Djinns se sélectionne comme les autres ; le sorcier prend alors un autre deck.
  await click(page.selection(COUR), 'Sélectionner la Cour des Djinns');
  assert.ok(!container.querySelector('.rpg-deck-detail'), 'Sélectionner la Cour n’ouvre pas non plus sa liste');
  assert.equal(stocke(), JSON.stringify({ deckId: 'cour-des-djinns' }), 'la Cour des Djinns est mémorisée comme les autres decks');
  assert.ok(page.carte(COUR).classList.contains('is-active'), 'la Cour des Djinns devient le deck de jeu');
  assert.equal(container.querySelectorAll('.rpg-deck-choice.is-active').length, 1, 'un seul deck de jeu à la fois');
  assert.equal(page.selection(COUR).getAttribute('aria-disabled'), 'true', 'son bouton passe à « Sélectionné »');
  assert.equal(page.selection(VEILLEURS).textContent.trim(), 'Sélectionner', 'les Veilleurs redeviennent sélectionnables');
  assert.ok(texte(container.querySelector('.rpg-deck-catalog__status')).includes(COUR), 'la ligne d’état nomme la Cour des Djinns');
  await click(tab('Jouer'), 'onglet Jouer avec la Cour sélectionnée');
  const rapideB = await deckChoisiSurJouer(assert, page, 'Cour sélectionnée');
  assert.ok(rapideB.choisi.includes(COUR) && rapideB.actuel.includes(COUR), 'la fenêtre Partie rapide annonce la Cour des Djinns comme deck de jeu');
  assert.ok(rapideB.art.includes(`/cards/${ARTS['cour-des-djinns']}.jpg`), 'avec l’illustration de son boîtier');
  await click(tab('Deck'), 'retour sur l’onglet Deck');
  await click(page.selection(VEILLEURS), 'Sélectionner de nouveau les Veilleurs');
  assert.equal(stocke(), JSON.stringify({ deckId: 'veilleurs-du-desert' }), 'on revient aux Veilleurs : le choix mémorisé suit');
  await click(tab('Jouer'), 'onglet Jouer avec les Veilleurs');
  const rapideC = await deckChoisiSurJouer(assert, page, 'retour aux Veilleurs');
  assert.ok(rapideC.choisi.includes(VEILLEURS) && rapideC.actuel.includes(VEILLEURS), 'on revient aux Veilleurs : la fenêtre Partie rapide suit');
  await click(tab('Deck'), 'retour sur l’onglet Deck');

  await click(page.selection(SENTIERS), 'Sélectionner Sentiers de cendre');
  assert.ok(!container.querySelector('.rpg-deck-detail'), 'Sélectionner n’ouvre pas la liste des cartes');
  assert.equal(stocke(), JSON.stringify({ deckId: 'sentiers-de-cendre' }), 'le choix est mémorisé sur l’appareil');
  assert.equal(container.querySelectorAll('.rpg-deck-choice.is-active').length, 1, 'un seul deck de jeu à la fois');
  assert.ok(page.carte(SENTIERS).classList.contains('is-active'), 'Sentiers de cendre devient le deck de jeu');
  assert.equal(page.selection(SENTIERS).getAttribute('aria-disabled'), 'true', 'son bouton passe à « Sélectionné »');
  assert.equal(page.selection(VEILLEURS).textContent.trim(), 'Sélectionner', 'l’ancien deck de jeu redevient sélectionnable');
  assert.ok(!page.selection(VEILLEURS).hasAttribute('aria-disabled'), 'et son bouton est de nouveau actif');
  assert.ok(texte(container.querySelector('.rpg-deck-catalog__status')).includes(SENTIERS), 'la ligne d’état suit le choix');
  assert.match(texte(container.querySelector('.rpg-deck-catalog__status')), /Mémorisé/, 'et confirme que le choix est mémorisé');

  window.localStorage.setItem(RPG_DECK_STORAGE_KEY, '{"deckId":"sentiers-de-cendre","sentinelle":1}');
  await click(page.selection(SENTIERS), 'deck déjà sélectionné');
  assert.equal(stocke(), '{"deckId":"sentiers-de-cendre","sentinelle":1}', 'cliquer le deck déjà sélectionné ne réécrit rien');
  window.localStorage.setItem(RPG_DECK_STORAGE_KEY, JSON.stringify({ deckId: 'sentiers-de-cendre' }));

  await click(tab('Jouer'), 'onglet Jouer');
  const rapideD = await deckChoisiSurJouer(assert, page, 'Sentiers sélectionné');
  assert.ok(rapideD.choisi.includes(SENTIERS) && rapideD.actuel.includes(SENTIERS), 'la fenêtre Partie rapide annonce le deck sélectionné');
  assert.ok(rapideD.art.includes(`/cards/${ARTS['sentiers-de-cendre']}.jpg`), 'avec l’illustration du deck sélectionné');
  await page.demonter();

  // --- Au lancement suivant du jeu : le choix est restauré ----------------------------------
  const relance = await monter(assert);
  const rapideRelance = await deckChoisiSurJouer(assert, relance, 'après relance');
  assert.ok(rapideRelance.choisi.includes(SENTIERS) && rapideRelance.actuel.includes(SENTIERS), 'au lancement suivant, le deck mémorisé est annoncé');
  await relance.click(relance.tab('Deck'), 'onglet Deck après relance');
  assert.ok(relance.carte(SENTIERS).classList.contains('is-active'), 'au lancement suivant, le deck mémorisé est toujours sélectionné');
  assert.equal(relance.container.querySelectorAll('.rpg-deck-choice.is-active').length, 1, 'et il est le seul');
  assert.ok(!/Mémorisé/.test(texte(relance.container.querySelector('.rpg-deck-catalog__status'))), 'la confirmation n’est affichée qu’après un clic, pas à chaque lancement');
  await relance.demonter();

  // --- Sauvegarde périmée ou corrompue : retour au deck par défaut ---------------------------
  for (const [label, valeur] of [
    ['JSON corrompu', '{oops'],
    ['deck inconnu', JSON.stringify({ deckId: 'deck-supprime' })],
    ['mauvais type', JSON.stringify({ deckId: 7 })],
    ['valeur vide', ''],
  ]) {
    window.localStorage.setItem(RPG_DECK_STORAGE_KEY, valeur);
    const corrompu = await monter(assert);
    await corrompu.click(corrompu.tab('Deck'), 'onglet Deck');
    assert.ok(corrompu.carte(VEILLEURS).classList.contains('is-active'), `sauvegarde ${label} : le deck par défaut est signalé`);
    await corrompu.demonter();
  }

  // La Cour des Djinns mémorisée est restaurée, et le sorcier prend alors les Veilleurs.
  window.localStorage.setItem(RPG_DECK_STORAGE_KEY, JSON.stringify({ deckId: 'cour-des-djinns' }));
  const restauree = await monter(assert);
  await restauree.click(restauree.tab('Deck'), 'onglet Deck après relance');
  assert.ok(restauree.carte(COUR).classList.contains('is-active'), 'elle est signalée comme deck de jeu sur l’étagère');
  await restauree.demonter();

  // --- Stockage indisponible : le choix vaut pour la session, sans casser le menu ------------
  window.localStorage.clear();
  const prototype = Object.getPrototypeOf(window.localStorage);
  const setItemOrigine = prototype.setItem;
  prototype.setItem = () => { throw new window.DOMException('quota dépassé', 'QuotaExceededError'); };
  try {
    const sansStockage = await monter(assert);
    await sansStockage.click(sansStockage.tab('Deck'), 'onglet Deck (stockage plein)');
    await sansStockage.click(sansStockage.selection(SENTIERS), 'Sélectionner sans stockage');
    assert.ok(sansStockage.carte(SENTIERS).classList.contains('is-active'), 'sans stockage, le choix s’applique quand même pour la session');
    assert.match(texte(sansStockage.container.querySelector('.rpg-deck-catalog__status')), /Non mémorisé/, 'et le joueur est prévenu qu’il ne sera pas conservé');
    assert.ok(!/✓ Mémorisé/.test(sansStockage.container.textContent), 'sans afficher une fausse confirmation');
    await sansStockage.click(sansStockage.tab('Jouer'), 'onglet Jouer');
    const rapideSession = await deckChoisiSurJouer(assert, sansStockage, 'sans stockage');
    assert.ok(rapideSession.choisi.includes(SENTIERS) && rapideSession.actuel.includes(SENTIERS), 'la fenêtre Partie rapide suit le choix de la session');
    await sansStockage.demonter();
  } finally {
    prototype.setItem = setItemOrigine;
  }
  assert.equal(stocke(), null, 'rien n’a été écrit pendant la panne de stockage');

  // --- Filtre par couleur ---------------------------------------------------------------------
  window.localStorage.clear();
  const filtre = await monter(assert);
  await filtre.click(filtre.tab('Deck'), 'onglet Deck');
  const groupe = filtre.container.querySelector('.rpg-deck-filter');
  assert.equal(groupe?.getAttribute('role'), 'group', 'les puces forment un groupe');
  assert.match(groupe.getAttribute('aria-label'), /couleur/i, 'le groupe de filtres est nommé');
  assert.deepEqual([...filtre.container.querySelectorAll('.rpg-deck-filter__chip')].map(texte),
    ['Toutes', 'Sable', 'Braise', 'Eau', 'Neige', 'Ténèbres', 'Hybride'],
    'le filtre propose Toutes puis les couleurs des decks existants (la Neige du Serment, les Ténèbres de la Balance)');
  assert.ok(filtre.container.querySelectorAll('.rpg-deck-filter__chip svg').length >= 7, 'les puces de couleur portent un emblème dessiné (SVG)');
  assert.equal(filtre.puce('Toutes').getAttribute('aria-pressed'), 'true', 'Toutes est active au départ');
  assert.deepEqual(filtre.decksVisibles(), [VEILLEURS, COUR, SENTIERS, MAREE, SERMENT, SOLEIL, BALANCE, LETTRES],
    'sans filtre, les huit decks sont sur l’étagère');
  assert.equal(texte(filtre.container.querySelector('.rpg-deck-filter__count')), '8 / 8 decks', 'le compteur annonce 8 / 8 decks');

  const attendu = [
    ['Sable', [VEILLEURS, SENTIERS, LETTRES]],
    ['Braise', [COUR, SENTIERS, SOLEIL]],
    ['Eau', [MAREE, LETTRES]],
    ['Neige', [SERMENT]],
    ['Ténèbres', [BALANCE]],
    ['Hybride', [SENTIERS, LETTRES]],
    ['Toutes', [VEILLEURS, COUR, SENTIERS, MAREE, SERMENT, SOLEIL, BALANCE, LETTRES]],
  ];
  for (const [couleur, decks] of attendu) {
    await filtre.click(filtre.puce(couleur), `puce ${couleur}`);
    assert.deepEqual(filtre.decksVisibles(), decks, `filtre ${couleur} : ${decks.join(' + ')}`);
    assert.equal(filtre.container.querySelectorAll('.rpg-deck-filter__chip[aria-pressed="true"]').length, 1, 'une seule puce active');
    assert.equal(filtre.puce(couleur).getAttribute('aria-pressed'), 'true', `la puce ${couleur} est signalée active`);
    assert.equal(texte(filtre.container.querySelector('.rpg-deck-filter__count')), `${decks.length} / 8 decks`, `le compteur suit le filtre ${couleur}`);
    assert.equal(filtre.container.querySelectorAll('.rpg-deckbox').length, decks.length, 'les boîtiers écartés ne sont pas dessinés');
  }
  assert.ok(!filtre.container.querySelector('.rpg-deck-list'), 'filtrer n’ouvre aucune liste de cartes');

  // Tant qu'une fiche est ouverte, le rail — et ses puces — s'effacent : on
  // referme d'abord, on filtre ensuite.
  await filtre.click(filtre.carte(VEILLEURS).querySelector('.rpg-deck-choice__button'), 'ouvrir Veilleurs');
  assert.ok(filtre.container.querySelector('.rpg-deck-detail'), 'Veilleurs est ouvert');
  assert.ok(!filtre.container.querySelector('.rpg-deck-filter'), 'le filtre n’est pas affiché pendant la lecture d’une fiche');
  await filtre.click(filtre.container.querySelector('.rpg-deck-detail__close'), 'Fermer Veilleurs');
  assert.ok(filtre.container.querySelector('.rpg-deck-filter'), 'le filtre revient avec l’étagère');
  await filtre.click(filtre.puce('Braise'), 'puce Braise');
  assert.ok(!filtre.container.querySelector('.rpg-deck-detail'), 'la fiche reste fermée après le filtre');
  await filtre.click(filtre.puce('Toutes'), 'puce Toutes');

  // Sélectionner depuis une étagère filtrée ; le deck de jeu reste nommé même s'il est masqué.
  await filtre.click(filtre.selection(SENTIERS), 'Sélectionner depuis la vue filtrée');
  assert.equal(stocke(), JSON.stringify({ deckId: 'sentiers-de-cendre' }), 'on peut sélectionner depuis une étagère filtrée');
  await filtre.click(filtre.puce('Sable'), 'puce Sable');
  await filtre.click(filtre.selection(VEILLEURS), 'Sélectionner Veilleurs');
  await filtre.click(filtre.puce('Hybride'), 'puce Hybride');
  assert.deepEqual(filtre.decksVisibles(), [SENTIERS, LETTRES], 'sous le filtre Hybride, Sentiers et Lettres de Marque restent visibles');
  assert.ok(texte(filtre.container.querySelector('.rpg-deck-catalog__status')).includes(VEILLEURS), 'la ligne d’état nomme toujours le deck de jeu, même masqué par le filtre');
  await filtre.demonter();

  // --- Jouer avec ce deck : sélectionne, mémorise et démarre avec ce deck --------------------
  // (vrais decks : le duel prend les cartes du deck, et la plaque « VOUS » annonce celui du duel)
  window.localStorage.clear();
  const jeu = await monter(assert, { vraisDecks: true });
  await jeu.click(jeu.tab('Deck'), 'onglet Deck');
  assert.ok(jeu.container.querySelector('.rpg-deck-choice.is-active')?.textContent.includes(VEILLEURS), 'Veilleurs est le deck de jeu avant de lancer');
  await jeu.click(jeu.carte(SENTIERS).querySelector('.rpg-deck-choice__button'), 'ouvrir Sentiers');
  const jouer = [...jeu.container.querySelectorAll('.rpg-deck-detail__play')];
  assert.equal(jouer.length, 1, 'la fiche d’un deck de joueur propose « Jouer avec ce deck »');
  await jeu.click(jouer[0], 'Jouer avec ce deck');
  assert.ok(jeu.container.querySelector('.card-table'), 'le duel démarre');
  assert.match(texte(jeu.container.querySelector('.rpg-wizard-plate--joueur')), new RegExp(SENTIERS), 'le duel se joue avec le deck ouvert, pas avec l’ancien deck de jeu');
  assert.match(jeu.plaque('ennemi'), /Cour des Djinns · .*Braise/, 'face à Sentiers de cendre, le sorcier joue la Cour des Djinns');
  assert.ok(jeu.avatar('ennemi').includes(`/cards/${ARTS['cour-des-djinns']}.jpg`), 'et son avatar est l’illustration de la Cour des Djinns');
  assert.equal(stocke(), JSON.stringify({ deckId: 'sentiers-de-cendre' }), '« Jouer avec ce deck » mémorise aussi ce deck');

  // Retour au menu pendant le duel : le choix suivant n'affecte pas le duel en cours.
  const navDeck = [...jeu.container.querySelectorAll('.rpg-duel-nav button')].find((button) => button.textContent.includes('Deck'));
  await jeu.click(navDeck, 'bouton Deck du duel');
  assert.ok(jeu.container.querySelector('.rpg-deck-catalog'), 'le menu Deck est accessible depuis le duel');
  await jeu.click(jeu.selection(VEILLEURS), 'Sélectionner Veilleurs pendant un duel');
  assert.match(texte(jeu.container.querySelector('.rpg-deck-catalog__status')), /duel en cours garde son deck/, 'pendant un duel, la ligne d’état précise que le choix vaudra pour le prochain');
  await jeu.click(jeu.container.querySelector('.rpg-menu-button--resume'), 'Reprendre le duel');
  assert.match(texte(jeu.container.querySelector('.rpg-wizard-plate--joueur')), new RegExp(SENTIERS), 'à la reprise, le duel garde le deck avec lequel il a commencé');
  assert.equal(stocke(), JSON.stringify({ deckId: 'veilleurs-du-desert' }), 'le nouveau choix reste mémorisé pour la prochaine partie');
  await jeu.demonter();

  // La Cour des Djinns se joue : le sorcier prend alors les Veilleurs du Désert (pas de duel miroir).
  window.localStorage.clear();
  const cour = await monter(assert, { vraisDecks: true });
  await cour.click(cour.tab('Deck'), 'onglet Deck');
  await cour.click(cour.carte(COUR).querySelector('.rpg-deck-choice__button'), 'ouvrir la Cour des Djinns');
  const jouerCour = [...cour.container.querySelectorAll('.rpg-deck-detail__play')];
  assert.equal(jouerCour.length, 1, 'la fiche de la Cour des Djinns propose « Jouer avec ce deck »');
  await cour.click(jouerCour[0], 'Jouer avec la Cour des Djinns');
  assert.ok(cour.container.querySelector('.card-table'), 'le duel démarre avec la Cour des Djinns');
  assert.match(cour.plaque('joueur'), new RegExp(COUR), 'le joueur joue la Cour des Djinns');
  assert.match(cour.plaque('ennemi'), /Veilleurs du Désert · .*Sable/, 'le sorcier joue alors les Veilleurs du Désert');
  assert.ok(!/Cour des Djinns/.test(cour.plaque('ennemi')), 'le sorcier n’a pas le même deck que le joueur');
  assert.ok(cour.avatar('ennemi').includes(`/cards/${ARTS['veilleurs-du-desert']}.jpg`), 'l’avatar du sorcier est alors l’illustration des Veilleurs du Désert');
  assert.ok(cour.avatar('joueur').includes('/cards/tin-hinan'), 'l’avatar du joueur reste son personnage, quel que soit le deck');
  assert.equal(stocke(), JSON.stringify({ deckId: 'cour-des-djinns' }), '« Jouer avec ce deck » mémorise la Cour des Djinns');
  await cour.demonter();

  // Le bouton principal de l'écran Jouer est « Mode histoire » : il ouvre le
  // récit, quel que soit le deck mémorisé (le duel rapide passe par l'onglet Deck).
  // Un nouveau joueur passe d'abord par le seuil de Bab El.
  window.localStorage.setItem(RPG_DECK_STORAGE_KEY, JSON.stringify({ deckId: 'sentiers-de-cendre' }));
  const lancement = await monter(assert, { vraisDecks: true });
  const modeHistoire = lancement.container.querySelector('.rpg-mode-menu__hero-copy .rpg-menu-button--primary');
  assert.match(texte(modeHistoire), /Mode histoire/, 'le bouton principal de Jouer est « Mode histoire »');
  await lancement.click(modeHistoire, 'Mode histoire');
  const commencer = lancement.container.querySelector('[data-bab-el-commencer]');
  if (commencer) await lancement.click(commencer, 'Commencer la campagne');
  assert.ok(lancement.container.querySelector('.rpg-narrative'), 'le mode histoire ouvre le récit');
  assert.ok(!lancement.container.querySelector('.card-table'), 'le mode histoire ne démarre pas un duel');
  await lancement.demonter();
  window.localStorage.clear();


  // --- L'atelier : grille « Arena », bascules, clic droit, courbe --------------------------------
  window.localStorage.clear();
  const atelier = await monter(assert);
  await atelier.click(atelier.tab('Deck'), 'onglet Deck (atelier)');
  assert.match(texte(atelier.container.querySelector('.rpg-deck-catalog__sync')), /Decks gardés sur cet appareil/, 'hors compte, la ligne de sync le dit');
  await atelier.click(atelier.container.querySelector('.rpg-deck-choice--neuf'), 'ouvrir l’atelier');
  assert.ok(atelier.container.querySelector('.rpg-atelier'), 'l’atelier remplace l’étagère');
  assert.ok(!atelier.container.querySelector('.rpg-deck-catalog__choices'), 'l’étagère n’est pas rendue en même temps que l’atelier');
  assert.match(texte(atelier.container.querySelector('.rpg-atelier__state')), /0 \/ 30 cartes/, 'les compteurs démarrent à zéro');
  assert.equal(atelier.container.querySelectorAll('.rpg-atelier__carte').length, RPG_DUEL_CARDS.length, 'la bibliothèque montre tout le catalogue');
  assert.ok(atelier.container.querySelectorAll('.rpg-atelier__carte.is-locked').length > 0, 'les cartes hors collection sont verrouillées');
  const rangeeKraken = atelier.container.querySelector('.rpg-atelier__carte[data-card-id="kraken"]');
  assert.ok(rangeeKraken.classList.contains('is-locked'), 'le Kraken est verrouillé au départ');
  assert.equal(rangeeKraken.style.getPropertyValue('--frame'), cardFrameColor(cardById('kraken')),
    'le cadre du Kraken mythique suit sa couleur Eau dans la collection');
  assert.ok(rangeeKraken.querySelector('.rpg-atelier__carte-art.rpg-card--frame-eau.rpg-card--frame-brillant.rpg-card--mythique'),
    'le Kraken garde ses classes de cadre mythique brillant dans l’atelier');
  assert.match(texte(rangeeKraken), /Le Souk la vendra après « Le Pêcheur de perles » — La Tour des Abysses/, 'et il annonce où il se débloque');
  assert.equal(rangeeKraken.querySelector('.rpg-atelier__carte-ajout').disabled, true, 'impossible d’ajouter une carte verrouillée');
  const rangeeHybride = atelier.container.querySelector('.rpg-atelier__carte[data-card-id="rais-de-la-galiote"]');
  assert.ok(rangeeHybride?.querySelector('.rpg-atelier__carte-art.rpg-card--frame-hybride-eau-sable:not(.rpg-card--frame-brillant)'),
    'une carte hybride garde dans l’atelier ses deux aplats diagonaux, sans reflet');
  const rangeeChien = atelier.container.querySelector('.rpg-atelier__carte[data-card-id="chien-du-guet"]');
  assert.ok(!rangeeChien.classList.contains('is-locked'), 'une commune de la dotation est libre');
  await atelier.click(rangeeChien.querySelector('.rpg-atelier__carte-ajout'), 'ajouter Chien du guet');
  assert.match(texte(atelier.container.querySelector('.rpg-atelier__state')), /1 \/ 30 cartes/, 'le compteur suit l’ajout');
  const ligneChien = atelier.container.querySelector('.rpg-atelier__ligne[data-card-id="chien-du-guet"]');
  assert.ok(ligneChien, 'la carte apparaît dans le deck en cours');
  await atelier.click(ligneChien.querySelector('.rpg-atelier__ligne-compte button'), 'retirer Chien du guet');
  assert.match(texte(atelier.container.querySelector('.rpg-atelier__state')), /0 \/ 30 cartes/, 'le compteur suit le retrait');

  // --- La disposition « Arena » : grille illustrée, bascules, clic droit, courbe --------------
  assert.ok(rangeeChien.querySelector('.rpg-atelier__carte-art img'), 'la collection est une grille de cartes illustrées');
  assert.ok(rangeeChien.querySelector('.rpg-atelier__cout'), 'le médaillon de coût est posé sur la carte');
  assert.ok(rangeeChien.querySelector('.rpg-atelier__carte-pt'), 'une créature affiche attaque / défense');
  assert.ok(rangeeKraken.querySelector('.rpg-atelier__carte-cadenas'), 'une carte verrouillée porte un cadenas');
  const toolbar = atelier.container.querySelector('.rpg-atelier__toolbar');
  assert.ok(toolbar, 'la barre de filtres existe');
  const pips = [...toolbar.querySelectorAll('.rpg-atelier__toggle--pip')];
  assert.equal(pips.length, 5, 'cinq pips de couleur à bascule (les Ténèbres comprises)');
  assert.ok(pips.every((pip) => pip.getAttribute('aria-pressed') === 'false'), 'aucune couleur active au départ');
  const pipEau = pips.find((pip) => pip.getAttribute('aria-label') === 'Couleur Eau');
  await atelier.click(pipEau, 'bascule Eau');
  assert.equal(pipEau.getAttribute('aria-pressed'), 'true', 'la bascule est pressée');
  const cartesEau = [...atelier.container.querySelectorAll('.rpg-atelier__carte')];
  assert.ok(cartesEau.length > 0 && cartesEau.length < RPG_DUEL_CARDS.length, 'le filtre Eau réduit la grille');
  assert.ok(cartesEau.every((carte) => cardColors(cardById(carte.dataset.cardId)).includes('eau')), 'ne restent que des cartes Eau (ou hybrides avec Eau)');
  const pipSable = pips.find((pip) => pip.getAttribute('aria-label') === 'Couleur Sable');
  await atelier.click(pipSable, 'bascule Sable en plus');
  assert.ok(atelier.container.querySelectorAll('.rpg-atelier__carte').length > cartesEau.length, 'deux couleurs cumulent (ou logique)');
  const cout2 = [...toolbar.querySelectorAll('.rpg-atelier__toggle--cout')].find((bouton) => texte(bouton) === '2');
  await atelier.click(cout2, 'bascule coût 2');
  assert.ok(atelier.container.querySelector('.rpg-atelier__carte[data-card-id="chien-du-guet"]'), 'le Chien du guet (Sable, coût 2) reste');
  assert.ok([...atelier.container.querySelectorAll('.rpg-atelier__carte')].every((carte) => Number(carte.querySelector('.rpg-atelier__cout b')?.textContent) === 2),
    'le filtre de coût ne montre que les cartes du palier 2');
  const reset = toolbar.querySelector('.rpg-atelier__toggle--reset');
  assert.ok(reset, 'un bouton de réinitialisation apparaît quand un filtre est actif');
  await atelier.click(reset, 'réinitialiser les filtres');
  assert.equal(atelier.container.querySelectorAll('.rpg-atelier__carte').length, RPG_DUEL_CARDS.length, 'la grille complète revient');
  assert.ok(!toolbar.querySelector('.rpg-atelier__toggle--reset'), 'et le bouton disparaît');
  const possedees = [...toolbar.querySelectorAll('.rpg-atelier__toggle')].find((bouton) => texte(bouton) === 'Possédées');
  await atelier.click(possedees, 'bascule Possédées');
  assert.equal(atelier.container.querySelectorAll('.rpg-atelier__carte.is-locked').length, 0, '« Possédées » masque les cartes verrouillées');
  await atelier.click(possedees, 'bascule Possédées (retour)');
  // Le clic droit retire un exemplaire, comme sur Arena.
  await atelier.click(atelier.container.querySelector('.rpg-atelier__carte[data-card-id="chien-du-guet"] .rpg-atelier__carte-ajout'), 'ajouter Chien du guet (clic droit à suivre)');
  await atelier.click(atelier.container.querySelector('.rpg-atelier__carte[data-card-id="chien-du-guet"] .rpg-atelier__carte-ajout'), 'second Chien du guet');
  assert.match(texte(atelier.container.querySelector('.rpg-atelier__carte[data-card-id="chien-du-guet"] .rpg-atelier__carte-count')), /×2/, 'le compteur « ×2 » est posé sur la carte');
  await act(async () => {
    atelier.container.querySelector('.rpg-atelier__carte[data-card-id="chien-du-guet"]').dispatchEvent(new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  });
  await atelier.settle();
  assert.match(texte(atelier.container.querySelector('.rpg-atelier__state')), /1 \/ 30 cartes/, 'le clic droit retire un exemplaire');
  // La courbe de mana et les couleurs suivent le deck.
  const barre2 = atelier.container.querySelector('.rpg-atelier__barre[data-cout="2"] b');
  assert.equal(texte(barre2), '1', 'la courbe de mana compte le Chien du guet au palier 2');
  assert.match(texte(atelier.container.querySelector('.rpg-atelier__couleurs')), /Sable/, 'la répartition des couleurs nomme le Sable');
  // Vider demande deux clics, puis le deck repart de zéro.
  const vider = [...atelier.container.querySelectorAll('.rpg-atelier__outil')].find((bouton) => texte(bouton).includes('Vider'));
  await atelier.click(vider, 'Vider (premier clic)');
  assert.match(texte(atelier.container.querySelector('.rpg-atelier__state')), /1 \/ 30 cartes/, 'le premier clic ne vide pas');
  await atelier.click([...atelier.container.querySelectorAll('.rpg-atelier__outil')].find((bouton) => texte(bouton).includes('confirmer')), 'Vider (confirmer)');
  assert.match(texte(atelier.container.querySelector('.rpg-atelier__state')), /0 \/ 30 cartes/, 'le deck est vide');
  // Le survol d’une carte de la grille ouvre l’aperçu grand format de la page.
  await act(async () => {
    const cible = atelier.container.querySelector('.rpg-atelier__carte[data-card-id="chien-du-guet"]');
    cible.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true }));
  });
  await atelier.settle();
  assert.ok(atelier.container.querySelector('.rpg-hover-card-preview'), 'l’aperçu de carte s’affiche au survol dans l’atelier');
  await act(async () => {
    atelier.container.querySelector('.rpg-atelier__carte[data-card-id="chien-du-guet"]').dispatchEvent(new window.MouseEvent('mouseout', { bubbles: true }));
  });
  await atelier.settle();
  assert.ok(!atelier.container.querySelector('.rpg-hover-card-preview'), 'et disparaît quand la souris s’en va');

  // --- La création assistée : couleurs, 4 créatures, 4 sorts, l’IA complète --------------------
  await atelier.click([...atelier.container.querySelectorAll('.rpg-atelier__outil')].find((bouton) => texte(bouton).includes('Création assistée')), 'bouton Création assistée');
  const assistant = atelier.container.querySelector('.rpg-assistant');
  assert.ok(assistant, 'l’assistant remplace les panneaux de l’atelier');
  assert.ok(!atelier.container.querySelector('.rpg-atelier__panneaux'), 'les panneaux sont masqués pendant l’assistant');
  assert.equal(assistant.querySelectorAll('.rpg-assistant__fil li').length, 3, 'trois étapes au fil de l’assistant');
  const pipSableAssistant = [...assistant.querySelectorAll('.rpg-assistant__couleur')].find((bouton) => bouton.getAttribute('aria-label') === 'Couleur Sable');
  await atelier.click(pipSableAssistant, 'couleur Sable');
  assert.equal(pipSableAssistant.getAttribute('aria-pressed'), 'true', 'la couleur Sable est retenue');
  await atelier.click(assistant.querySelector('.rpg-assistant__actions .rpg-menu-button--primary'), 'Continuer vers les créatures');
  assert.match(texte(assistant.querySelector('.rpg-assistant__compteur')), /0 \/ 4 créatures/, 'le compteur de créatures démarre à zéro');
  const vignettesCrea = [...assistant.querySelectorAll('.rpg-assistant__carte-bouton')];
  assert.ok(vignettesCrea.length >= 4, 'des créatures Sable possédées sont proposées');
  for (const vignette of vignettesCrea.slice(0, 4)) await atelier.click(vignette, 'choisir une créature');
  assert.match(texte(assistant.querySelector('.rpg-assistant__compteur')), /4 \/ 4 créatures/, 'quatre créatures sont choisies');
  assert.equal(assistant.querySelectorAll('.rpg-assistant__carte.is-choisie').length, 4, 'les vignettes choisies portent la coche');
  const versSorts = assistant.querySelector('.rpg-assistant__actions .rpg-menu-button--primary');
  assert.equal(versSorts.disabled, false, 'Continuer est ouvert avec quatre créatures');
  await atelier.click(versSorts, 'Continuer vers les sorts');
  assert.match(texte(assistant.querySelector('.rpg-assistant__compteur')), /0 \/ 4 sorts/, 'le compteur de sorts démarre à zéro');
  const vignettesSorts = [...assistant.querySelectorAll('.rpg-assistant__carte-bouton')];
  assert.ok(vignettesSorts.length >= 4, 'des sorts Sable possédés sont proposés');
  for (const vignette of vignettesSorts.slice(0, 4)) await atelier.click(vignette, 'choisir un sort');
  const generer = assistant.querySelector('.rpg-assistant__actions .rpg-menu-button--primary');
  assert.match(texte(generer), /Générer le deck/, 'le dernier pas génère le deck');
  await atelier.click(generer, 'Générer le deck');
  assert.ok(!atelier.container.querySelector('.rpg-assistant'), 'l’assistant se referme sur le deck généré');
  assert.match(texte(atelier.container.querySelector('.rpg-atelier__state')), /30 \/ 30 cartes/, 'le deck généré est complet');
  assert.match(texte(atelier.container.querySelector('.rpg-atelier__verdict')), /prêt à jouer/, 'le verdict de validation est vert');
  assert.match(texte(atelier.container.querySelector('.rpg-atelier__statut')), /Deck généré/, 'la ligne d’état explique la génération');
  assert.ok(atelier.container.querySelectorAll('.rpg-atelier__liste .rpg-atelier__ligne').length >= 8,
    'la liste du deck mêle les huit choix et les compléments de l’IA');

  // --- Enregistrer : le jeu propose de nommer le deck ------------------------------------------
  await atelier.click(atelier.container.querySelector('.rpg-atelier__actions .rpg-menu-button--primary'), 'Enregistrer le deck');
  const nommage = atelier.container.querySelector('.rpg-atelier__nommage');
  assert.ok(nommage, 'l’enregistrement propose d’abord de nommer le deck');
  const propositions = [...nommage.querySelectorAll('.rpg-atelier__nommage-suggestions button')];
  assert.equal(propositions.length, 3, 'trois noms sont proposés');
  const champNommage = nommage.querySelector('input[type="text"]');
  assert.equal(champNommage.value, texte(propositions[0]), 'le champ est prérempli de la première proposition');
  await atelier.click(propositions[1], 'choisir la deuxième proposition');
  assert.equal(champNommage.value, texte(propositions[1]), 'le champ suit la proposition cliquée');
  const nomRetenu = champNommage.value;
  await atelier.click(nommage.querySelector('.rpg-menu-button--primary'), 'confirmer l’enregistrement');
  assert.ok(!atelier.container.querySelector('.rpg-atelier'), 'l’enregistrement referme l’atelier');
  // L'enregistrement ouvre d'abord la fiche du deck neuf — l'étagère attend derrière.
  const detailMaison = atelier.container.querySelector('.rpg-deck-detail');
  assert.ok(detailMaison, 'la fiche du deck neuf est ouverte après l’enregistrement');
  assert.match(texte(detailMaison.querySelector('.rpg-mode-menu__eyebrow')), /DECK MAISON/, 'la fiche annonce un deck maison');
  assert.ok(texte(detailMaison).includes(nomRetenu), 'la fiche porte le nom retenu');
  const casierLu = JSON.parse(window.localStorage.getItem('letsplay_sablier_decks_maison_v1'));
  assert.equal(casierLu.decks.length, 1);
  assert.equal(casierLu.decks[0].nom, nomRetenu, 'le nom retenu est mémorisé');
  assert.ok(casierLu.decks[0].id.startsWith('maison-'), 'identifiant maison');
  assert.equal(casierLu.decks[0].element, 'sable', 'couleur dérivée des cartes');
  await atelier.click(atelier.container.querySelector('.rpg-deck-detail__close'), 'Fermer la fiche');
  const boiteGeneree = atelier.carte(nomRetenu);
  assert.ok(boiteGeneree, `le deck « ${nomRetenu} » rejoint l’étagère`);
  assert.match(texte(boiteGeneree), /DECK MAISON/, 'il porte l’étiquette maison');
  assert.match(texte(boiteGeneree), /30 cartes/, 'avec ses 30 cartes');
  assert.equal(boiteGeneree.querySelector('.rpg-deck-choice__select').disabled, false, 'un deck complet et possédé se sélectionne');
  assert.match(texte(atelier.container.querySelector('.rpg-deck-catalog__status')), /Mémorisé/, 'l’enregistrement est confirmé sur la ligne d’état');
  await atelier.click(boiteGeneree.querySelector('.rpg-deck-choice__button'), 'rouvrir la fiche pour la suite');
  const boutonSupprimer = [...atelier.container.querySelectorAll('.rpg-deck-detail__actions button')].find((b) => b.textContent.includes('Supprimer'));
  assert.ok(boutonSupprimer, 'la fiche maison propose de supprimer');
  await atelier.click(boutonSupprimer, 'Supprimer (premier clic)');
  assert.ok(atelier.container.querySelector('.rpg-deck-detail'), 'le premier clic ne supprime pas');
  await atelier.click([...atelier.container.querySelectorAll('.rpg-deck-detail__actions button')].find((b) => b.textContent.includes('Confirmer')), 'Confirmer la suppression');
  assert.ok(!atelier.carte(nomRetenu), 'le deck quitte l’étagère');
  const casierApresSuppression = JSON.parse(window.localStorage.getItem('letsplay_sablier_decks_maison_v1'));
  assert.equal(casierApresSuppression.decks.length, 0, 'le casier est vide');
  assert.equal(casierApresSuppression.supprimes.length, 1, 'une pierre tombale est posée pour la synchronisation');
  await atelier.demonter();

  // --- Brouillon : nom écrit au clavier, conservé face aux propositions ------------------------
  window.localStorage.removeItem('letsplay_sablier_decks_maison_v1');
  const brouillon = await monter(assert);
  await brouillon.click(brouillon.tab('Deck'), 'onglet Deck (brouillon)');
  await brouillon.click(brouillon.container.querySelector('.rpg-deck-choice--neuf'), 'ouvrir l’atelier');
  await brouillon.click(brouillon.container.querySelector('.rpg-atelier__carte[data-card-id="chien-du-guet"] .rpg-atelier__carte-ajout'), 'ajouter Chien du guet');
  const champNom = brouillon.container.querySelector('.rpg-atelier__state input[type="text"]');
  await act(async () => {
    setterNomGlobal.call(champNom, 'Bab El m’écoute');
    champNom.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  await brouillon.settle();
  await brouillon.click(brouillon.container.querySelector('.rpg-atelier__actions .rpg-menu-button--primary'), 'Enregistrer le brouillon');
  const nommageBrouillon = brouillon.container.querySelector('.rpg-atelier__nommage');
  assert.ok(nommageBrouillon, 'même un brouillon passe par le nommage');
  assert.equal(nommageBrouillon.querySelector('input[type="text"]').value, 'Bab El m’écoute',
    'le nom écrit au clavier est gardé, jamais remplacé par la proposition');
  assert.equal(nommageBrouillon.querySelectorAll('.rpg-atelier__nommage-suggestions button').length, 3,
    'les propositions restent offertes à côté');
  await brouillon.click(nommageBrouillon.querySelector('.rpg-menu-button--primary'), 'confirmer l’enregistrement');
  assert.ok(brouillon.container.querySelector('.rpg-deck-detail'), 'la fiche du brouillon est ouverte');
  await brouillon.click(brouillon.container.querySelector('.rpg-deck-detail__close'), 'Fermer la fiche du brouillon');
  const maisonBox = brouillon.carte('Bab El m’écoute');
  assert.ok(maisonBox, 'le brouillon rejoint l’étagère');
  assert.match(texte(maisonBox), /DECK MAISON/, 'il porte l’étiquette maison');
  assert.match(texte(maisonBox), /1 carte/, 'avec son nombre de cartes');
  assert.equal(maisonBox.querySelector('.rpg-deck-choice__select').disabled, true, 'brouillon : « Sélectionner » est indisponible');
  assert.match(texte(maisonBox.querySelector('.rpg-deck-choice__select')), /Indisponible/, 'et l’affiche comme pour un deck du catalogue');
  assert.match(texte(brouillon.container.querySelector('.rpg-deck-catalog__status')), /Mémorisé/, 'l’enregistrement est confirmé sur la ligne d’état');
  await brouillon.demonter();

  // --- Un deck maison complet : sélectionnable, jouable, éditable ------------------------------
  // Le deck est bâti à la collection : quinze cartes Sable possédées, deux exemplaires chacune.
  window.localStorage.removeItem('letsplay_sablier_decks_maison_v1');
  const collectionDepart = collectionJoueur();
  const sablesPossedees = RPG_DUEL_CARDS.filter((carte) => carteJouableSansTerrain(carte)
    && cardColors(carte).every((couleur) => couleur === 'sable')
    && collectionDepart.includes(carte.id));
  assert.ok(sablesPossedees.length >= 15, 'la dotation compte au moins quinze cartes Sable');
  const cartesMaison = sablesPossedees.slice(0, 15).flatMap((carte) => [carte.id, carte.id]);
  window.localStorage.setItem('letsplay_sablier_decks_maison_v1', JSON.stringify({
    decks: [{ id: 'maison-smoke', nom: 'Dunes de fumée', cardIds: cartesMaison, creeLe: '2026-01-01T00:00:00.000Z', majLe: '2026-01-01T00:00:00.000Z' }],
    supprimes: [],
  }));
  const maison = await monter(assert, { vraisDecks: true });
  await maison.click(maison.tab('Deck'), 'onglet Deck (maison complet)');
  const boiteMaison = maison.carte('Dunes de fumée');
  assert.ok(boiteMaison, 'le deck maison complet est sur l’étagère');
  assert.match(texte(boiteMaison), /30 cartes/, 'avec ses 30 cartes');
  const selectionMaison = boiteMaison.querySelector('.rpg-deck-choice__select');
  assert.equal(selectionMaison.disabled, false, 'complet et dans la collection : il se sélectionne');
  await maison.click(selectionMaison, 'Sélectionner le deck maison');
  assert.equal(stocke(), JSON.stringify({ deckId: 'maison-smoke' }), 'le choix maison est mémorisé comme les autres');
  await maison.click(boiteMaison.querySelector('.rpg-deck-choice__button'), 'ouvrir la fiche du deck maison');
  const detailComplet = maison.container.querySelector('.rpg-deck-detail');
  assert.match(texte(detailComplet.querySelector('.rpg-deck-detail__stats')), /validé/, 'la validation maison ne dit que du vert');
  await maison.click(detailComplet.querySelector('.rpg-deck-detail__play'), 'Jouer avec ce deck maison');
  assert.ok(maison.container.querySelector('.card-table'), 'le duel démarre avec le deck maison');
  assert.match(maison.plaque('joueur'), /Dunes de fumée/, 'la plaque « VOUS » porte le nom du deck maison');
  assert.match(maison.plaque('ennemi'), /Cour des Djinns/, 'face à un deck maison, le sorcier joue la Cour des Djinns');
  // Édition : l’atelier reprend le deck, renommé puis réenregistré — par le nommage.
  const navDeckMaison = [...maison.container.querySelectorAll('.rpg-duel-nav button')].find((button) => button.textContent.includes('Deck'));
  await maison.click(navDeckMaison, 'retour au menu depuis le duel');
  await maison.click(maison.carte('Dunes de fumée').querySelector('.rpg-deck-choice__button'), 'rouvrir la fiche maison');
  await maison.click([...maison.container.querySelectorAll('.rpg-deck-detail__actions button')].find((b) => b.textContent.includes('Modifier')), 'Modifier dans l’atelier');
  const atelierEdition = maison.container.querySelector('.rpg-atelier');
  assert.ok(atelierEdition, 'l’atelier s’ouvre en édition');
  const champNomEdition = atelierEdition.querySelector('.rpg-atelier__state input[type="text"]');
  assert.equal(champNomEdition.value, 'Dunes de fumée', 'le deck en cours est chargé');
  assert.match(texte(atelierEdition.querySelector('.rpg-atelier__state')), /30 \/ 30 cartes/, 'avec ses 30 cartes');
  const champEmbleme = atelierEdition.querySelector('select[aria-label="Carte emblématique du boîtier"]');
  assert.ok(champEmbleme, 'la carte emblématique est choisissable');
  await act(async () => {
    setterNomGlobal.call(champNomEdition, 'Dunes de braise');
    champNomEdition.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  await maison.settle();
  await maison.click(atelierEdition.querySelector('.rpg-atelier__actions .rpg-menu-button--primary'), 'réenregistrer le deck édité');
  const nommageEdition = maison.container.querySelector('.rpg-atelier__nommage');
  assert.ok(nommageEdition, 'la réédition passe aussi par le nommage');
  assert.equal(nommageEdition.querySelector('input[type="text"]').value, 'Dunes de braise', 'le renommage tapé au clavier est gardé');
  await maison.click(nommageEdition.querySelector('.rpg-menu-button--primary'), 'confirmer l’enregistrement');
  await maison.click(maison.container.querySelector('.rpg-deck-detail__close'), 'Fermer la fiche du deck renommé');
  assert.ok(maison.carte('Dunes de braise'), 'l’étagère montre le deck renommé');
  assert.ok(!maison.carte('Dunes de fumée'), 'l’ancien nom a disparu');
  const casierEdite = JSON.parse(window.localStorage.getItem('letsplay_sablier_decks_maison_v1'));
  assert.equal(casierEdite.decks.length, 1, 'l’édition remplace, ne duplique pas');
  assert.equal(casierEdite.decks[0].nom, 'Dunes de braise');
  // Copier un deck du catalogue : les cartes hors collection sont retirées d’office.
  await maison.click(maison.carte(SERMENT).querySelector('.rpg-deck-choice__button'), 'ouvrir le Serment des Neuf Hivers');
  await maison.click([...maison.container.querySelectorAll('.rpg-deck-detail__actions button')].find((b) => b.textContent.includes('Copier')), 'Copier pour l’adapter');
  const atelierCopie = maison.container.querySelector('.rpg-atelier');
  assert.ok(atelierCopie, 'l’atelier s’ouvre en copie');
  assert.equal(atelierCopie.querySelector('.rpg-atelier__state input[type="text"]').value, 'Serment des Neuf Hivers (copie)', 'nommé d’après sa source');
  // Le Serment regorge de rares verrouillées : la copie n’en garde que la dotation.
  const cartesCopiees = [...atelierCopie.querySelectorAll('.rpg-atelier__ligne')].reduce((total, ligne) => total + Number(ligne.querySelector('.rpg-atelier__ligne-compte b').textContent.slice(1)), 0);
  assert.ok(cartesCopiees < 30, `la copie n’embarque pas les cartes verrouillées (${cartesCopiees} cartes gardées)`);
  await maison.demonter();
  window.localStorage.clear();
}
