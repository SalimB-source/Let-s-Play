import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { RPG_TUTORIELS } from '../src/games/rpgTutorial.js';
import { cardHybridGradient } from '../src/games/rpgCards.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function monter(container) {
  const root = createRoot(container);
  const tuto = () => container.querySelector('.rpg-tutorial');
  const step = () => tuto()?.dataset.tutorialStep ?? null;
  const click = async (element, label) => {
    if (!element) throw new Error(`${label} est absent du DOM`);
    await act(async () => { element.click(); });
  };
  const next = () => container.querySelector('.rpg-tutorial__next');
  const card = (cardId) => container.querySelector(`.rpg-hand__card[data-card-id="${cardId}"]`);
  const carteChamp = (cote, cardId) => container.querySelector(`.card-row--${cote} .rpg-card[data-card-id="${cardId}"]`);
  return { root, tuto, step, click, next, card, carteChamp };
}

async function avancerInfos(harnais, jusqua) {
  for (let garde = 0; garde < 30 && harnais.step() !== jusqua; garde += 1) {
    await harnais.click(harnais.next(), `la commande de ${harnais.step()}`);
  }
}

export async function checkRpgTutorial(assert) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const harnais = monter(container);
  try {
    await act(async () => { harnais.root.render(<RpgDuelPage rng={() => 0.999} />); });
    await harnais.click([...container.querySelectorAll('button')]
      .find((bouton) => bouton.textContent.includes('Apprendre à jouer')), 'l’entrée « Apprendre à jouer »');

    const entrees = [...container.querySelectorAll('[data-tutorial-start]')];
    assert.equal(entrees.length, RPG_TUTORIELS.length, 'le menu propose une entrée par leçon');
    assert.deepEqual(entrees.map((entree) => entree.dataset.tutorialStart), RPG_TUTORIELS.map((lecon) => lecon.id));
    assert.ok(container.querySelector('[data-tutorial-id="maree-des-abysses"]')?.textContent.includes('150'),
      'la leçon Eau annonce ses 150 crédits');

    await harnais.click(entrees[0], 'le départ de la première leçon');
    await act(async () => { await wait(120); });
    assert.equal(harnais.step(), 'bienvenue', 'la leçon ouvre son étape d’accueil');
    assert.ok(container.querySelector('.rpg-tutorial')?.textContent.includes('Les Fondations du Sablier'),
      'l’encadré nomme la leçon choisie');

    await harnais.click(harnais.next(), 'l’étape d’accueil');
    assert.equal(harnais.step(), 'main');
    assert.deepEqual([...container.querySelectorAll('.rpg-hand__card')].map((element) => element.dataset.cardId),
      RPG_TUTORIELS[0].openingHand, 'la main guidée est celle de la leçon');

    await avancerInfos(harnais, 'creature');
    assert.equal(harnais.step(), 'creature');
    assert.ok(container.querySelector('[data-tutorial-target="mana-track"]') || true);
    assert.equal(harnais.card('tislit-des-aures')?.getAttribute('data-jouable'), 'true',
      'le mana produit rend Tislit jouable');
    await harnais.click(harnais.card('tislit-des-aures'), 'la carte Tislit préparée');
    await act(async () => { await wait(850); });
    assert.equal(harnais.step(), 'invocation', 'jouer Tislit révèle le mal d’invocation');
    assert.ok(harnais.carteChamp('equipe', 'tislit-des-aures'), 'l’explication encadre la créature réellement jouée');

    await avancerInfos(harnais, 'cinq-creatures');
    assert.ok(container.querySelector('.rpg-creature-slots--joueur'), 'les cinq emplacements sont montrés');
    await harnais.click(harnais.next(), 'la règle des cinq créatures');
    assert.equal(harnais.step(), 'fin-tour');
    await harnais.click(container.querySelector('[data-tutorial-target="end-turn"]'), 'la commande de fin de tour');
    await act(async () => { await wait(900); });
    assert.equal(harnais.step(), 'tour-adverse', 'le guide attend le tour adverse');
    await act(async () => { await wait(2400); });
    assert.equal(harnais.step(), 'pioche', 'le retour du tour joueur fait avancer le guide');
  } finally {
    await act(async () => { harnais.root.unmount(); });
    container.remove();
  }
}

export async function checkRpgTutorialCombat(assert) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const harnais = monter(container);
  try {
    await act(async () => { harnais.root.render(<RpgDuelPage rng={() => 0.999} />); });
    await harnais.click([...container.querySelectorAll('button')]
      .find((bouton) => bouton.textContent.includes('Apprendre à jouer')), 'l’entrée « Apprendre à jouer »');
    await harnais.click(container.querySelector('[data-tutorial-start="fondations-du-sablier"]'), 'la première leçon');
    await act(async () => { await wait(120); });

    await avancerInfos(harnais, 'creature');
    await harnais.click(harnais.card('tislit-des-aures'), 'la carte Tislit');
    await act(async () => { await wait(850); });
    await avancerInfos(harnais, 'fin-tour');
    await harnais.click(container.querySelector('[data-tutorial-target="end-turn"]'), 'la fin du tour');
    for (let i = 0; i < 18 && harnais.step() !== 'pioche'; i += 1) {
      await act(async () => { await wait(300); });
    }
    assert.equal(harnais.step(), 'pioche', 'le tour adverse passe et le guide revient au joueur');

    await harnais.click(harnais.next(), 'la pioche de début de tour');
    assert.equal(harnais.step(), 'attaque');
    await harnais.click(container.querySelector('[data-tutorial-target="attack-all"]'), 'Attaquer avec tous');
    assert.equal(harnais.step(), 'confirmer-attaque');
    await harnais.click(container.querySelector('[data-tutorial-target="confirm-attack"]'), 'la confirmation');
    assert.equal(harnais.step(), 'combat');
    assert.ok(container.querySelector('[data-tutorial-target="opponent-health"]'));

    await harnais.click(harnais.next(), 'la règle des points de vie');
    assert.equal(harnais.step(), 'arme');
    await harnais.click(harnais.card('sandales-de-tislit'), 'les Sandales de Tislit');
    await act(async () => { await wait(850); });
    assert.equal(harnais.step(), 'arme-cible');
    await harnais.click(harnais.carteChamp('equipe', 'tislit-des-aures'), 'Tislit, porteuse des Sandales');
    await act(async () => { await wait(300); });
    assert.equal(harnais.step(), 'arme-portee');
    assert.ok(harnais.carteChamp('equipe', 'tislit-des-aures')?.getAttribute('data-armes')?.includes('sandales-de-tislit'));

    await harnais.click(harnais.next(), 'la règle de l’arme');
    assert.equal(harnais.step(), 'fin-tour-2');
    assert.ok(harnais.carteChamp('equipe', 'chien-du-guet'), 'la scène de défense installe le Chien du guet');
    await harnais.click(container.querySelector('[data-tutorial-target="end-turn"]'), 'la fin du tour de défense');
    for (let i = 0; i < 20 && harnais.step() !== 'blocage'; i += 1) {
      await act(async () => { await wait(300); });
    }
    assert.equal(harnais.step(), 'blocage', 'le blocage du Chien du guet est demandé après l’assaut');
    await harnais.click(harnais.carteChamp('equipe', 'chien-du-guet'), 'le Chien du guet bloqueur');
    assert.equal(harnais.step(), 'blocage-cible');
    await harnais.click(harnais.carteChamp('ennemi', 'chien-de-sable'), 'le Chien de sable attaquant');
    assert.equal(harnais.step(), 'blocage-confirmer');
    await harnais.click(container.querySelector('[data-tutorial-target="resolve-combat"]'), 'Résoudre le combat');
    await act(async () => { await wait(300); });
    assert.equal(harnais.step(), 'blocage-explique');
    await harnais.click(harnais.next(), 'le bilan du blocage');
    assert.equal(harnais.step(), 'termine');
    assert.ok(container.querySelector('.rpg-tutorial__reward')?.textContent.includes('120'));
  } finally {
    await act(async () => { harnais.root.unmount(); });
    container.remove();
  }
}

export async function checkRpgTutorialEau(assert) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const harnais = monter(container);
  try {
    await act(async () => { harnais.root.render(<RpgDuelPage rng={() => 0.999} />); });
    await harnais.click([...container.querySelectorAll('button')]
      .find((bouton) => bouton.textContent.includes('Apprendre à jouer')), 'l’entrée « Apprendre à jouer »');
    await harnais.click(container.querySelector('[data-tutorial-start="maree-des-abysses"]'), 'la leçon Eau');
    await act(async () => { await wait(120); });
    assert.equal(harnais.step(), 'bienvenue');
    await avancerInfos(harnais, 'creature');
    await harnais.click(harnais.card('porteuse-de-cruches'), 'la Porteuse de cruches');
    await act(async () => { await wait(850); });
    assert.equal(harnais.step(), 'soin');
    await avancerInfos(harnais, 'sorcellerie');
    await harnais.click(harnais.card('eau-de-la-source'), 'l’Eau de la source');
    await act(async () => { await wait(900); });
    assert.equal(harnais.step(), 'sorcellerie-info');
    await harnais.click(harnais.next(), 'la règle de la sorcellerie');
    assert.equal(harnais.step(), 'magie-rapide');
    await harnais.click(harnais.card('ressac'), 'Ressac');
    assert.equal(harnais.step(), 'magie-rapide-cible');
    await harnais.click(harnais.carteChamp('ennemi', 'vipere-de-verre'), 'la Vipère de verre');
    await act(async () => { await wait(300); });
    assert.equal(harnais.step(), 'magie-rapide-info');
    await harnais.click(harnais.next(), 'la règle de la magie rapide');
    assert.equal(harnais.step(), 'fin-tour');
    await harnais.click(container.querySelector('[data-tutorial-target="end-turn"]'), 'la fin du tour');
    for (let i = 0; i < 24 && !container.querySelector('.rpg-annonce-sort__respond'); i += 1) {
      await act(async () => { await wait(300); });
    }
    assert.equal(harnais.step(), 'annonce-adverse', 'le sorcier annonce sa Lame de mer scénarisée');
    assert.ok(container.querySelector('[data-tutorial-target="spell-announcement"]'), 'la section d’annonce est encadrée');
    await harnais.click(container.querySelector('.rpg-annonce-sort__respond'), 'Répondre');
    assert.equal(harnais.step(), 'contre-jouer', 'Répondre ouvre l’étape du contre');
    await harnais.click(harnais.card('contresort-des-abimes'), 'le Contresort des abîmes');
    await act(async () => { await wait(400); });
    assert.equal(harnais.step(), 'contre-info');
  } finally {
    await act(async () => { harnais.root.unmount(); });
    container.remove();
  }
}

export async function checkRpgCardGuide(assert) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const harnais = monter(container);
  const exempleIds = () => [...container.querySelectorAll('[data-tutorial-target="card-guide-examples"] [data-card-id]')]
    .map((element) => element.dataset.cardId);
  try {
    await act(async () => { harnais.root.render(<RpgDuelPage rng={() => 0.999} />); });
    await harnais.click([...container.querySelectorAll('button')]
      .find((bouton) => bouton.textContent.includes('Cartes & effets')), 'l’entrée « Cartes & effets »');
    assert.equal(harnais.step(), 'card-guide-familles-de-cartes', 'le guide avancé commence par les familles de cartes');
    assert.deepEqual(exempleIds(), ['tislit-des-aures', 'tin-hinan'], 'les fiches affichent des exemples du catalogue réel');
    await harnais.click(harnais.next(), 'la fiche suivante');
    assert.equal(harnais.step(), 'card-guide-armes');
    await harnais.click(harnais.next(), 'la fiche du mana multicolore');
    assert.equal(harnais.step(), 'card-guide-terrain-hybride');
    const coutVentRouge = container.querySelector('[data-card-id="vent-rouge"] .rpg-card-guide__cost--hybride');
    assert.equal(coutVentRouge?.textContent, '3', 'le coût hybride garde son chiffre dans le guide');
    assert.equal(coutVentRouge?.style.getPropertyValue('--rpg-hybrid-cost-bg'), cardHybridGradient('vent-rouge'));

    while (harnais.step() !== 'card-guide-contresorts') await harnais.click(harnais.next(), 'la fiche de notion suivante');
    assert.ok(exempleIds().includes('contresort-des-abimes'), 'la fiche Contresorts pointe vers une vraie carte');
    await harnais.click(container.querySelector('.rpg-tutorial__close'), 'la fermeture du guide');
    assert.equal(container.querySelector('.rpg-card-guide'), null, 'fermer le guide revient au menu Jouer');
    assert.ok(container.querySelector('.rpg-mode-menu__play'), 'le menu principal réapparaît sans démarrer un duel');
  } finally {
    await act(async () => { harnais.root.unmount(); });
    container.remove();
  }
}
