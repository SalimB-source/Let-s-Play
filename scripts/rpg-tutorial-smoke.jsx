import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
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

    assert.equal(tutorialStep(), 'terrain', 'le guide encadre le terrain à poser');
    assert.equal(container.querySelector('[data-tutorial-target="terrain-card"]')?.dataset.cardId, 'desert',
      'la zone active pointe vers la carte Désert préparée dans la main');
    await click(card('desert'), 'la carte Désert guidée');
    await act(async () => { await wait(850); });
    assert.equal(tutorialStep(), 'mana', 'poser le terrain fait avancer le guide vers la production de mana');
    assert.ok(container.querySelector('.rpg-terrains--joueur [data-tutorial-target="mana-terrain"]'),
      'le terrain posé devient la nouvelle zone encadrée');

    await click(container.querySelector('[data-tutorial-target="mana-terrain"]'), 'le terrain de production de mana');
    assert.equal(tutorialStep(), 'creature', 'engager le terrain fait avancer le guide vers la créature payable');
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
    assert.deepEqual(exampleIds(), ['desert', 'tin-hinan'], 'les fiches affichent des exemples issus du catalogue réel');
    assert.equal(container.querySelector('[data-card-id="desert"] .rpg-card-guide__rules')?.textContent,
      'Engagez : ajoutez un mana ⏳.', 'le guide imprime aussi l’icône Sable dans le texte du Désert');

    await click(next(), 'la fiche suivante');
    assert.equal(step(), 'card-guide-terrain-hybride', 'le parcours montre ensuite le terrain à deux couleurs');
    assert.deepEqual(exampleIds(), ['petra', 'desert']);
    const reglesPetra = container.querySelector('[data-card-id="petra"] .rpg-card-guide__rules');
    assert.equal(reglesPetra?.textContent, 'Engagez : ajoutez un mana 🔥 ou ⏳.',
      'le terrain hybride affiche les deux icônes en conservant le choix « ou »');
    assert.deepEqual([...reglesPetra.querySelectorAll('.rpg-card-rules__mana[role="img"]')]
      .map((icone) => icone.getAttribute('aria-label')), ['Braise', 'Sable'],
    'les deux icônes du guide gardent un nom accessible');
    await click(next(), 'la fiche des terrains');
    assert.equal(step(), 'card-guide-rituel-ephemere', 'les deux timings de magie sont présentés côte à côte');
    assert.deepEqual(exampleIds(), ['rempart-de-dunes', 'parade-du-verre']);

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
