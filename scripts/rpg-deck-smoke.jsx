// Rendu réel de l'onglet Deck dans jsdom : boîtiers 3D illustrés, liste des cartes qui
// n'apparaît qu'une fois un deck cliqué, bouton « Sélectionner » (choix mémorisé sur
// l'appareil, Cour des Djinns comprise) et filtre par couleur.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { RPG_DECKS } from '../src/games/rpgCards.js';
import { RPG_DECK_STORAGE_KEY } from '../src/games/rpgDeckChoice.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const texte = (element) => (element?.textContent ?? '').replace(/\s+/g, ' ').trim();

const DECK_DE_TEST = ['desert', 'desert', 'desert', 'desert', 'chien-du-guet', 'parade-du-verre', 'mer', 'veilleur-du-couchant', 'fennec-des-decombres', 'desert'];
const SORCIER_DE_TEST = ['chien-du-guet', 'desert', 'chien-du-guet', 'desert', 'desert', 'desert', 'desert', 'desert', 'desert', 'desert'];

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
    carte: (nom) => [...container.querySelectorAll('.rpg-deck-choice')].find((choix) => choix.querySelector('strong')?.textContent === nom),
    selection: (nom) => api.carte(nom)?.querySelector('.rpg-deck-choice__select'),
    puce: (label) => [...container.querySelectorAll('.rpg-deck-filter__chip')].find((puce) => texte(puce) === label),
    decksVisibles: () => [...container.querySelectorAll('.rpg-deck-choice')].map((choix) => choix.querySelector('strong').textContent),
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
const NOMS = Object.fromEntries(RPG_DECKS.map((deck) => [deck.id, deck.name]));
const VEILLEURS = NOMS['veilleurs-du-desert'];
const SENTIERS = NOMS['sentiers-de-cendre'];
const COUR = NOMS['cour-des-djinns'];
const MAREE = NOMS['maree-des-abysses'];
const SERMENT = NOMS['serment-des-neuf-hivers'];

export async function checkRpgDecks(assert) {
  window.localStorage.clear();
  const page = await monter(assert);
  const { container, click, tab, boxButtons } = page;
  const names = RPG_DECKS.map((deck) => deck.name);

  // --- Onglet Deck, avant tout clic : une étagère de boîtiers, aucune liste -----------------
  await click(tab('Deck'), 'onglet Deck');
  assert.ok(container.querySelector('.rpg-deck-catalog--closed'), 'l’onglet Deck s’ouvre sur l’étagère fermée');
  assert.equal(container.querySelectorAll('.rpg-deck-choice').length, RPG_DECKS.length, 'un boîtier par deck');
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
  const adverse = RPG_DECKS.findIndex((deck) => deck.role === 'adversaire');
  await click(boxButtons()[adverse], 'boîtier de la Cour des Djinns');
  assert.ok(container.querySelector('.rpg-deck-catalog--open'), 'le clic ouvre le deck');
  const detail = container.querySelector('.rpg-deck-detail');
  assert.ok(detail, 'la fiche du deck apparaît');
  assert.match(detail.getAttribute('aria-label'), new RegExp(RPG_DECKS[adverse].name), 'la fiche est celle du deck cliqué');
  const uniques = new Set(RPG_DECKS[adverse].cardIds).size;
  assert.equal(container.querySelectorAll('.rpg-deck-list li').length, uniques, 'la liste montre toutes les références du deck');
  assert.match(container.querySelector('.rpg-deck-detail__list-heading').textContent, /Liste des cartes/, 'la liste est titrée');
  assert.equal(boxButtons()[adverse].getAttribute('aria-pressed'), 'true', 'le boîtier ouvert est signalé');
  assert.equal(boxButtons().filter((button) => button.getAttribute('aria-pressed') === 'true').length, 1, 'un seul boîtier est ouvert');
  assert.ok(!container.querySelector('.rpg-deck-detail__note'), 'la Cour des Djinns n’est plus « réservée au sorcier » : aucune note');
  assert.ok(container.textContent.includes('Jouer avec ce deck'), 'la Cour des Djinns propose, elle aussi, de jouer avec elle');
  assert.match(container.querySelector('.rpg-deck-detail__header .rpg-mode-menu__eyebrow').textContent, /VOTRE DECK/, 'sa fiche ne parle plus de « deck adverse »');
  assert.ok(container.querySelector('.rpg-deck-detail .rpg-deckbox--showcase'), 'la fiche expose le boîtier en grand');
  assert.ok(container.querySelectorAll('.rpg-deck-choice .rpg-deckbox--mini').length === RPG_DECKS.length, 'les boîtiers de la colonne passent en version réduite');
  assert.ok(container.querySelector('.rpg-deck-choice.is-active')?.textContent.includes(VEILLEURS), 'ouvrir la Cour des Djinns ne change pas le deck de jeu');

  // --- Changer de deck remplace la liste ----------------------------------------------------
  const hybride = RPG_DECKS.findIndex((deck) => deck.element === 'hybride');
  await click(boxButtons()[hybride], 'boîtier du deck hybride');
  assert.equal(container.querySelector('.rpg-deck-detail h2').textContent, RPG_DECKS[hybride].name, 'la fiche suit le deck cliqué');
  assert.equal(container.querySelectorAll('.rpg-deck-list li').length, new Set(RPG_DECKS[hybride].cardIds).size, 'la liste suit le deck cliqué');
  assert.ok(container.textContent.includes('Jouer avec ce deck'), 'chaque deck propose de jouer avec lui');
  assert.equal(stocke(), null, 'ouvrir des boîtiers ne mémorise rien');
  assert.ok(container.querySelector('.rpg-deck-choice.is-active')?.textContent.includes(VEILLEURS), 'ouvrir le deck hybride ne le sélectionne pas : il faut « Sélectionner »');

  // --- Fermer le deck masque de nouveau la liste ---------------------------------------------
  await click(container.querySelector('.rpg-deck-detail__close'), 'bouton Fermer le deck');
  assert.ok(!container.querySelector('.rpg-deck-list'), 'fermer le deck retire la liste');
  assert.ok(!container.querySelector('.rpg-deck-detail'), 'fermer le deck retire la fiche');
  assert.ok(container.querySelector('.rpg-deck-catalog--closed'), 'l’étagère redevient fermée');

  // --- Quitter l'onglet puis revenir : on repart sans liste, le deck de jeu n'a pas bougé ----
  await click(boxButtons()[hybride], 'réouverture du deck hybride');
  assert.ok(container.querySelector('.rpg-deck-list'), 'la liste revient au clic');
  await click(tab('Jouer'), 'onglet Jouer');
  assert.ok(page.deckDeJeu().includes(VEILLEURS), 'ouvrir un boîtier ne change pas le deck affiché sur l’écran Jouer');
  assert.ok(vignetteJeu(container).includes(`/cards/${ARTS['veilleurs-du-desert']}.jpg`), 'la vignette de l’écran Jouer montre l’illustration du deck de jeu (Veilleurs par défaut)');
  assert.ok(page.adversaire().includes(COUR), 'face aux Veilleurs, la carte « ADVERSAIRE » annonce la Cour des Djinns');
  assert.match(page.adversaire(), /Affrontez les djinns de Braise/, 'avec sa phrase d’accroche');
  await click(tab('Deck'), 'retour sur l’onglet Deck');
  assert.ok(!container.querySelector('.rpg-deck-list'), 'revenir sur l’onglet Deck ne rouvre aucune liste');

  // --- « Sélectionner » : un bouton sous chaque boîtier --------------------------------------
  const cartes = [...container.querySelectorAll('.rpg-deck-choice')];
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
  assert.ok(![...container.querySelectorAll('.rpg-deck-choice__select')].some((bouton) => bouton.disabled), 'aucun bouton « Sélectionner » désactivé : les trois decks sont complets');
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
  assert.ok(page.deckDeJeu().includes(COUR), 'l’écran Jouer annonce la Cour des Djinns comme deck de jeu');
  assert.ok(vignetteJeu(container).includes(`/cards/${ARTS['cour-des-djinns']}.jpg`), 'avec l’illustration de son boîtier');
  assert.ok(page.adversaire().includes(VEILLEURS) && !page.adversaire().includes(COUR), 'face à la Cour, le sorcier prend les Veilleurs du Désert : pas de duel miroir');
  assert.match(page.adversaire(), /Affrontez les veilleurs du Désert/, 'avec la phrase d’accroche des Veilleurs');
  await click(tab('Deck'), 'retour sur l’onglet Deck');
  await click(page.selection(VEILLEURS), 'Sélectionner de nouveau les Veilleurs');
  assert.equal(stocke(), JSON.stringify({ deckId: 'veilleurs-du-desert' }), 'on revient aux Veilleurs : le choix mémorisé suit');
  await click(tab('Jouer'), 'onglet Jouer avec les Veilleurs');
  assert.ok(page.adversaire().includes(COUR), 'face aux Veilleurs, le sorcier rejoue la Cour des Djinns');
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
  assert.ok(page.deckDeJeu().includes(SENTIERS), 'l’écran Jouer annonce le deck sélectionné');
  assert.ok(vignetteJeu(container).includes(`/cards/${ARTS['sentiers-de-cendre']}.jpg`), 'la vignette de l’écran Jouer montre l’illustration du deck sélectionné');
  await page.demonter();

  // --- Au lancement suivant du jeu : le choix est restauré ----------------------------------
  const relance = await monter(assert);
  assert.ok(relance.deckDeJeu().includes(SENTIERS), 'au lancement suivant, l’écran Jouer annonce le deck mémorisé');
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
    assert.ok(corrompu.deckDeJeu().includes(VEILLEURS), `sauvegarde ${label} : le menu repart sur le deck par défaut`);
    await corrompu.click(corrompu.tab('Deck'), 'onglet Deck');
    assert.ok(corrompu.carte(VEILLEURS).classList.contains('is-active'), `sauvegarde ${label} : le deck par défaut est signalé`);
    await corrompu.demonter();
  }

  // La Cour des Djinns mémorisée est restaurée, et le sorcier prend alors les Veilleurs.
  window.localStorage.setItem(RPG_DECK_STORAGE_KEY, JSON.stringify({ deckId: 'cour-des-djinns' }));
  const restauree = await monter(assert);
  assert.ok(restauree.deckDeJeu().includes(COUR), 'la Cour des Djinns mémorisée est restaurée au lancement suivant');
  assert.ok(restauree.adversaire().includes(VEILLEURS), 'et le sorcier joue alors les Veilleurs du Désert');
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
    assert.ok(sansStockage.deckDeJeu().includes(SENTIERS), 'l’écran Jouer suit le choix de la session');
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
    ['Toutes', 'Sable', 'Braise', 'Eau', 'Neige', 'Hybride'],
    'le filtre propose Toutes puis les couleurs des decks existants (l’Eau de la Marée, la Neige du Serment)');
  assert.ok(filtre.container.querySelectorAll('.rpg-deck-filter__chip svg').length >= 6, 'les puces de couleur portent un emblème dessiné (SVG)');
  assert.equal(filtre.puce('Toutes').getAttribute('aria-pressed'), 'true', 'Toutes est active au départ');
  assert.deepEqual(filtre.decksVisibles(), [VEILLEURS, COUR, SENTIERS, MAREE, SERMENT],
    'sans filtre, les cinq decks sont sur l’étagère');
  assert.equal(texte(filtre.container.querySelector('.rpg-deck-filter__count')), '5 / 5 decks', 'le compteur annonce 5 / 5 decks');

  const attendu = [
    ['Sable', [VEILLEURS, SENTIERS]],
    ['Braise', [COUR, SENTIERS]],
    ['Eau', [MAREE]],
    ['Neige', [SERMENT]],
    ['Hybride', [SENTIERS]],
    ['Toutes', [VEILLEURS, COUR, SENTIERS, MAREE, SERMENT]],
  ];
  for (const [couleur, decks] of attendu) {
    await filtre.click(filtre.puce(couleur), `puce ${couleur}`);
    assert.deepEqual(filtre.decksVisibles(), decks, `filtre ${couleur} : ${decks.join(' + ')}`);
    assert.equal(filtre.container.querySelectorAll('.rpg-deck-filter__chip[aria-pressed="true"]').length, 1, 'une seule puce active');
    assert.equal(filtre.puce(couleur).getAttribute('aria-pressed'), 'true', `la puce ${couleur} est signalée active`);
    assert.equal(texte(filtre.container.querySelector('.rpg-deck-filter__count')), `${decks.length} / 5 decks`, `le compteur suit le filtre ${couleur}`);
    assert.equal(filtre.container.querySelectorAll('.rpg-deckbox').length, decks.length, 'les boîtiers écartés ne sont pas dessinés');
  }
  assert.ok(!filtre.container.querySelector('.rpg-deck-list'), 'filtrer n’ouvre aucune liste de cartes');

  // Un deck ouvert que le filtre écarte se referme ; un deck qui reste visible reste ouvert.
  await filtre.click(filtre.carte(VEILLEURS).querySelector('.rpg-deck-choice__button'), 'ouvrir Veilleurs');
  assert.ok(filtre.container.querySelector('.rpg-deck-detail'), 'Veilleurs est ouvert');
  await filtre.click(filtre.puce('Braise'), 'puce Braise');
  assert.ok(!filtre.container.querySelector('.rpg-deck-detail'), 'filtrer sur Braise écarte Veilleurs : sa fiche se ferme');
  assert.ok(!filtre.container.querySelector('.rpg-deck-list'), 'et sa liste de cartes avec elle');
  assert.ok(filtre.container.querySelector('.rpg-deck-catalog--closed'), 'l’étagère redevient fermée');
  await filtre.click(filtre.puce('Toutes'), 'puce Toutes');
  assert.ok(!filtre.container.querySelector('.rpg-deck-detail'), 'revenir à Toutes ne rouvre pas la fiche du deck écarté');
  await filtre.click(filtre.carte(SENTIERS).querySelector('.rpg-deck-choice__button'), 'ouvrir Sentiers');
  await filtre.click(filtre.puce('Braise'), 'puce Braise');
  assert.match(texte(filtre.container.querySelector('.rpg-deck-detail h2')), new RegExp(SENTIERS), 'Sentiers (bicolore) reste ouvert sous le filtre Braise');

  // Sélectionner depuis une étagère filtrée ; le deck de jeu reste nommé même s'il est masqué.
  await filtre.click(filtre.selection(SENTIERS), 'Sélectionner depuis la vue filtrée');
  assert.equal(stocke(), JSON.stringify({ deckId: 'sentiers-de-cendre' }), 'on peut sélectionner depuis une étagère filtrée');
  await filtre.click(filtre.puce('Sable'), 'puce Sable');
  await filtre.click(filtre.selection(VEILLEURS), 'Sélectionner Veilleurs');
  await filtre.click(filtre.puce('Hybride'), 'puce Hybride');
  assert.deepEqual(filtre.decksVisibles(), [SENTIERS], 'sous le filtre Hybride, seul Sentiers reste visible');
  assert.ok(texte(filtre.container.querySelector('.rpg-deck-catalog__status')).includes(VEILLEURS), 'la ligne d’état nomme toujours le deck de jeu, même masqué par le filtre');
  await filtre.demonter();

  // --- Jouer avec ce deck : sélectionne, mémorise et démarre avec ce deck --------------------
  // (vrais decks : le duel prend les cartes du deck, et la plaque « VOUS » annonce celui du duel)
  window.localStorage.clear();
  const jeu = await monter(assert, { vraisDecks: true });
  await jeu.click(jeu.tab('Deck'), 'onglet Deck');
  await jeu.click(jeu.carte(SENTIERS).querySelector('.rpg-deck-choice__button'), 'ouvrir Sentiers');
  assert.ok(jeu.container.querySelector('.rpg-deck-choice.is-active')?.textContent.includes(VEILLEURS), 'Veilleurs est le deck de jeu avant de lancer');
  const jouer = [...jeu.container.querySelectorAll('.rpg-deck-detail__play')];
  assert.equal(jouer.length, 1, 'la fiche d’un deck de joueur propose « Jouer avec ce deck »');
  await jeu.click(jouer[0], 'Jouer avec ce deck');
  assert.ok(jeu.container.querySelector('.card-table'), 'le duel démarre');
  assert.match(texte(jeu.container.querySelector('.rpg-wizard-plate--joueur')), new RegExp(SENTIERS), 'le duel se joue avec le deck ouvert, pas avec l’ancien deck de jeu');
  assert.match(jeu.plaque('ennemi'), /Cour des Djinns · Braise/, 'face à Sentiers de cendre, le sorcier joue la Cour des Djinns');
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
  assert.match(cour.plaque('ennemi'), /Veilleurs du Désert · Sable/, 'le sorcier joue alors les Veilleurs du Désert');
  assert.ok(!/Cour des Djinns/.test(cour.plaque('ennemi')), 'le sorcier n’a pas le même deck que le joueur');
  assert.ok(cour.avatar('ennemi').includes(`/cards/${ARTS['veilleurs-du-desert']}.jpg`), 'l’avatar du sorcier est alors l’illustration des Veilleurs du Désert');
  assert.ok(cour.avatar('joueur').includes('/cards/tin-hinan'), 'l’avatar du joueur reste son personnage, quel que soit le deck');
  assert.equal(stocke(), JSON.stringify({ deckId: 'cour-des-djinns' }), '« Jouer avec ce deck » mémorise la Cour des Djinns');
  await cour.demonter();

  // « Lancer le duel » (écran Jouer) joue avec le deck mémorisé d'un lancement précédent.
  window.localStorage.setItem(RPG_DECK_STORAGE_KEY, JSON.stringify({ deckId: 'sentiers-de-cendre' }));
  const lancement = await monter(assert, { vraisDecks: true });
  const lancer = lancement.container.querySelector('.rpg-mode-menu__hero-copy .rpg-menu-button--primary');
  await lancement.click(lancer, 'Lancer le duel');
  assert.ok(lancement.container.querySelector('.card-table'), 'le duel démarre depuis l’écran Jouer');
  assert.match(texte(lancement.container.querySelector('.rpg-wizard-plate--joueur')), new RegExp(SENTIERS), '« Lancer le duel » utilise le deck mémorisé');
  assert.match(lancement.plaque('ennemi'), /Cour des Djinns · Braise/, 'le sorcier joue la Cour des Djinns');
  await lancement.demonter();

  // Même chose avec la Cour des Djinns mémorisée : le sorcier prend les Veilleurs.
  window.localStorage.setItem(RPG_DECK_STORAGE_KEY, JSON.stringify({ deckId: 'cour-des-djinns' }));
  const lancementCour = await monter(assert, { vraisDecks: true });
  await lancementCour.click(lancementCour.container.querySelector('.rpg-mode-menu__hero-copy .rpg-menu-button--primary'), 'Lancer le duel (Cour mémorisée)');
  assert.match(lancementCour.plaque('joueur'), new RegExp(COUR), '« Lancer le duel » joue la Cour des Djinns mémorisée');
  assert.match(lancementCour.plaque('ennemi'), /Veilleurs du Désert · Sable/, 'et le sorcier joue les Veilleurs du Désert');
  await lancementCour.demonter();
  window.localStorage.clear();
}
