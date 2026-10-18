import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { cardHybridGradient } from '../src/games/rpgCards.js';
import { RPG_TUTORIAL_OPENING_HAND } from '../src/games/rpgTutorial.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function checkRpgTutorial(assert) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const tutorialStep = () => container.querySelector('.rpg-tutorial')?.dataset.tutorialStep ?? null;
  const click = async (element, label) => {
    assert.ok(element, `${label} est présent`);
    await act(async () => { element.click(); });
  };
  const nextInfoStep = () => container.querySelector('.rpg-tutorial__next');
  const card = (cardId) => container.querySelector(`.rpg-hand__card[data-card-id="${cardId}"]`);

  try {
    await act(async () => { root.render(<RpgDuelPage rng={() => 0.999} />); });
    await click([...container.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Apprendre à jouer')), 'l’entrée « Apprendre à jouer »');

    assert.equal(tutorialStep(), 'bienvenue', 'le tutoriel ouvre son étape d’accueil');
    await click(nextInfoStep(), 'la commande de l’étape d’accueil');
    assert.equal(tutorialStep(), 'main', 'le guide commence par expliquer la main');
    assert.deepEqual([...container.querySelectorAll('.rpg-hand__card')].map((element) => element.dataset.cardId),
      RPG_TUTORIAL_OPENING_HAND, 'la main guidée est stable et contient les cartes annoncées');
    await click(nextInfoStep(), 'la commande de présentation de la main');

    assert.equal(tutorialStep(), 'mana', 'le guide explique la réserve automatique');
    assert.ok(container.querySelector('[data-tutorial-target="mana-track"]'), 'la réserve est encadrée');
    assert.equal(container.querySelectorAll('.rpg-terrain--joueur').length, 0, 'aucun terrain à jouer');
    await click(nextInfoStep(), 'la présentation du mana automatique');
    assert.equal(tutorialStep(), 'creature', 'le guide passe à la créature');
    assert.equal(card('tislit-des-aures')?.getAttribute('data-jouable'), 'true',
      'le mana produit rend Tislit jouable');
    await click(card('tislit-des-aures'), 'la carte Tislit préparée');
    await act(async () => { await wait(850); });
    assert.equal(tutorialStep(), 'invocation', 'jouer Tislit révèle la règle du mal d’invocation');
    assert.ok(container.querySelector('[data-tutorial-target="played-creature"]'),
      'l’explication du mal d’invocation encadre la créature réellement jouée');

    await click(nextInfoStep(), 'la commande de la règle du mal d’invocation');
    assert.equal(tutorialStep(), 'fin-tour', 'la règle suivante guide vers la fin du tour');
    await click(container.querySelector('[data-tutorial-target="end-turn"]'), 'la commande de fin du tour');
    await act(async () => { await wait(700); });
    assert.equal(tutorialStep(), 'tour-adverse', 'le guide explique que le tour adverse commence');
    await act(async () => { await wait(2200); });
    assert.equal(tutorialStep(), 'attaque', 'le guide attend le retour effectif du tour avant d’expliquer l’attaque');
    await click(container.querySelector('[data-tutorial-target="attack-all"]'), 'la commande d’attaque');
    assert.equal(tutorialStep(), 'confirmer-attaque', 'déclarer les attaquants fait avancer le guide vers la confirmation');
    await click(container.querySelector('[data-tutorial-target="confirm-attack"]'), 'la confirmation de l’attaque');
    assert.equal(tutorialStep(), 'combat', 'confirmer une attaque directe révèle la règle des points de vie');
  } finally {
    await act(async () => { root.unmount(); });
    container.remove();
  }
}

export async function checkRpgCardGuide(assert) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const step = () => container.querySelector('.rpg-tutorial')?.dataset.tutorialStep ?? null;
  const click = async (element, label) => {
    assert.ok(element, `${label} est présent`);
    await act(async () => { element.click(); });
  };
  const exampleIds = () => [...container.querySelectorAll('[data-tutorial-target="card-guide-examples"] [data-card-id]')]
    .map((element) => element.dataset.cardId);
  const next = () => container.querySelector('.rpg-tutorial__next');

  try {
    await act(async () => { root.render(<RpgDuelPage rng={() => 0.999} />); });
    await click([...container.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Cartes & effets')), 'l’entrée « Cartes & effets »');
    assert.equal(step(), 'card-guide-familles-de-cartes', 'le guide avancé commence par présenter les familles de cartes');
    assert.deepEqual(exampleIds(), ['tislit-des-aures', 'tin-hinan'], 'les fiches affichent des exemples issus du catalogue réel');
    assert.ok(container.querySelector('[data-card-id="tin-hinan"].rpg-card--mythique .rpg-card-guide__art img'),
      'l’exemple de Tin Hinan est une illustration mythique, éligible au vernis sans masquer son coût');
    assert.ok(container.querySelector('[data-card-id="tislit-des-aures"] .rpg-card-guide__rules'),
      'la première fiche montre une créature du nouveau deck');
    await click(next(), 'la fiche suivante');
    assert.equal(step(), 'card-guide-armes');
    await click(next(), 'la fiche sur le mana multicolore');
    assert.equal(step(), 'card-guide-terrain-hybride', 'la fiche historique explique maintenant le choix de mana');
    assert.deepEqual(exampleIds(), ['vent-rouge']);
    assert.ok(container.querySelector('[data-card-id="vent-rouge"].rpg-card--frame-hybride-braise-sable'),
      'le guide conserve un exemple hybride réellement jouable');
    assert.equal(container.querySelector('[data-card-id="petra"]'), null, 'aucun terrain donné en exemple');
    await click(next(), 'la fiche après les terrains');
    assert.equal(step(), 'card-guide-arme-maudite', 'le guide montre aussi l’arme issue d’une magie');
    await click(next(), 'la fiche des magies');
    assert.equal(step(), 'card-guide-rituel-ephemere', 'les deux timings de magie sont présentés côte à côte');
    assert.deepEqual(exampleIds(), ['rempart-de-dunes', 'parade-du-verre']);

    await click(next(), 'la fiche sur les magies qui ciblent ou touchent une zone');
    assert.equal(step(), 'card-guide-cible-ou-zone', 'Vent rouge est présenté avec les magies de zone');
    const coutVentRouge = container.querySelector('[data-card-id="vent-rouge"] .rpg-card-guide__cost--hybride');
    const sceauVentRouge = container.querySelector('[data-card-id="vent-rouge"] .rpg-sort-sceau--hybride');
    assert.equal(coutVentRouge?.textContent, '3', 'le coût hybride garde son chiffre dans le guide');
    assert.match(coutVentRouge?.getAttribute('aria-label') ?? '', /3 mana, dont 1 Braise et 1 Sable/u,
      'le lecteur d’écran reçoit les deux pips obligatoires en plus du chiffre');
    assert.equal(coutVentRouge?.style.getPropertyValue('--rpg-hybrid-cost-bg'), cardHybridGradient('vent-rouge'),
      'le disque Braise/Sable de Vent rouge prend les mêmes deux moitiés que son sceau');
    assert.equal(sceauVentRouge?.style.getPropertyValue('--rpg-sort-sceau-fond-hybride'),
      coutVentRouge.style.getPropertyValue('--rpg-hybrid-cost-bg'), 'sceau et coût d’une magie hybride concordent');
    assert.equal(container.querySelector('[data-card-id="trait-de-braise"] .rpg-card-guide__cost--hybride'), null,
      'une magie mono du guide garde son coût ordinaire');

    while (step() !== 'card-guide-contresorts') await click(next(), 'la fiche de notion suivante');
    assert.ok(exampleIds().includes('contresort-des-abimes'), 'la fiche Contresorts pointe vers une vraie carte de réponse');
    await click(container.querySelector('.rpg-tutorial__close'), 'la fermeture du guide');
    assert.equal(container.querySelector('.rpg-card-guide'), null, 'fermer le guide revient au menu Jouer');
    assert.ok(container.querySelector('.rpg-mode-menu__play'), 'le menu principal réapparaît sans démarrer un duel');
  } finally {
    await act(async () => { root.unmount(); });
    container.remove();
  }
}
