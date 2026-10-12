// Rendu réel du mode Histoire dans jsdom : galerie des maquettes 3D,
// page d'une tour (étages dévoilés), étages verrouillés, lancement d'un étage
// (deck et profil IA de l'étage) et retour au menu.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { RPG_STORY_TOURS } from '../src/games/rpgStoryTours.js';
import { rpgSorcierPv } from '../src/games/rpgDuel.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function checkRpgStory(assert) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const progressKey = 'letsplay_sablier_histoire_v1';

  await act(async () => {
    root.render(<RpgDuelPage
      joueurDeck={['desert', 'desert', 'desert', 'desert', 'chien-du-guet', 'parade-du-verre', 'mer', 'djinn-de-foudre', 'fennec-des-decombres', 'desert']}
      sorcierDeck={['chien-du-guet', 'desert', 'chien-du-guet', 'desert', 'desert', 'desert', 'desert', 'desert', 'desert', 'desert']}
      rng={() => 0.999}
    />);
  });

  const buttons = () => [...container.querySelectorAll('button')];
  const click = async (button, hint = '?') => {
    assert.ok(button, `le bouton attendu existe (${hint})`);
    await act(async () => { button.click(); });
    await wait(30);
    await act(async () => { });
    await wait(60);
    await act(async () => { });
  };

  // --- Accès au mode Histoire : la galerie des maquettes 3D ---
  await click(buttons().find((button) => button.textContent.includes('Histoire')), 'entrée Histoire depuis le menu');
  assert.ok(container.querySelector('.rpg-story'), 'la carte du mode Histoire s’affiche');
  assert.equal(container.querySelectorAll('.rpg-story-tower').length, RPG_STORY_TOURS.length,
    'les tours du catalogue sont toutes présentées en maquettes 3D');
  assert.ok(container.textContent.includes('La Tour du Fjord'), 'la Tour du Fjord (la Neige) est présentée');
  assert.ok(container.textContent.includes('La Tour des Abysses'), 'la Tour des Abysses (l’Eau) est présentée');
  assert.equal(container.querySelectorAll('.rpg-story-floor').length, 0,
    'les étages restent masqués tant qu’une tour n’est pas ouverte');
  for (const tour of RPG_STORY_TOURS) {
    const vignette = container.querySelector(`.rpg-story-tower[data-tour="${tour.id}"] .rpg-story-tower__art`);
    assert.ok(vignette, `${tour.nom} porte une vue de maquette`);
    assert.equal(vignette.dataset.towerModel, tour.id, `${tour.nom} demande son propre modèle 3D`);
    assert.equal(vignette.getAttribute('aria-hidden'), 'true', 'la vue reste décorative, le bouton garde son nom');
    assert.ok(vignette.querySelector('canvas'), 'une vraie surface de rendu est réservée à la 3D');
    assert.equal(vignette.dataset.renderer, 'fallback', 'sans WebGL (jsdom), la peinture prend le relais');
    assert.match(vignette.querySelector('.rpg-story-stage__fallback')?.getAttribute('style') ?? '', new RegExp(`sablier-tours/${tour.miniature}`),
      `${tour.nom} garde sa peinture de repli`);
  }

  // --- Ouverture d'une tour : ses étages se dévoilent sur sa page ---
  const tourCard = (tourId) => container.querySelector(`.rpg-story-tower[data-tour="${tourId}"]`);
  const ouvrirTour = async (tourId, hint) => {
    await click(tourCard(tourId), hint);
    assert.ok(container.querySelector('.rpg-story-tour'), 'la page de la tour dévoile ses étages');
    assert.ok(container.querySelector('.rpg-story__back'), 'la page de la tour propose le retour à la galerie');
    assert.equal(document.activeElement, container.querySelector('.rpg-story__back'), 'le focus clavier accompagne l’ouverture de la tour');
  };
  await ouvrirTour('tour-des-listes', 'ouverture de la Tour des Listes');
  const banner = container.querySelector('.rpg-story-tour__banner');
  assert.equal(banner?.dataset.towerModel, 'tour-des-listes', 'la page reprend la même maquette, dans un cadre plus grand');
  assert.equal(banner?.dataset.renderer, 'fallback', 'la bannière reste disponible sans WebGL');
  assert.match(banner.querySelector('.rpg-story-stage__fallback')?.getAttribute('style') ?? '', /sablier-tours\/tour-des-listes\.jpg/,
    'la page de la tour garde sa peinture de repli');

  // --- Étages : le premier est ouvert, les suivants verrouillés ---
  const floors = () => [...container.querySelectorAll('.rpg-story-floor')];
  const floorById = (id) => floors().find((floor) => floor.getAttribute('data-etage') === id);
  assert.ok(floorById('listes-1'), 'l’étage de départ est rendu');
  assert.ok(!floorById('listes-1').disabled, 'le premier étage est jouable');
  assert.ok(floorById('listes-1').className.includes('is-next'), 'le premier étage est proposé comme prochaine étape');
  assert.ok(floorById('listes-2')?.disabled, 'le deuxième étage reste verrouillé tant que le premier tient');
  assert.match(floorById('listes-2').textContent, /verrouillé/i, 'le verrouillage est annoncé');
  assert.equal(floors().length, 5, 'la page ne dévoile que les étages de la tour ouverte');
  assert.ok(!container.querySelector('.rpg-story-tower'), 'les autres tours restent sur la galerie');

  // --- Retour à la galerie : les étages se referment ---
  await click(container.querySelector('.rpg-story__back'), 'bouton Retour aux tours');
  assert.equal(container.querySelectorAll('.rpg-story-floor').length, 0,
    'revenir à la galerie masque de nouveau les étages');
  assert.equal(container.querySelectorAll('.rpg-story-tower').length, RPG_STORY_TOURS.length,
    'la galerie des maquettes revient');
  assert.equal(document.activeElement, tourCard('tour-des-listes'), 'le retour à la galerie retrouve le focus de la carte');

  // --- Lancement de l'étage : deck, puissance et profil de l'étage ---
  await ouvrirTour('tour-des-listes', 'réouverture de la Tour des Listes');
  assert.ok(!floorById('listes-1').disabled, 'le premier étage est toujours jouable');
  await click(floorById('listes-1'), 'étage listes-1 au lancement');
  await wait(120);
  await act(async () => { });
  assert.ok(!container.querySelector('.rpg-story'), 'le duel de l’étage remplace la carte des tours');
  const navStory = container.querySelector('.rpg-duel-nav__story');
  assert.ok(navStory?.textContent.includes('MODE HISTOIRE'), 'la navigation rappelle le mode Histoire');
  assert.ok(navStory.textContent.includes('Le Guetteur de palier'), 'la navigation nomme le sorcier affronté');
  const plate = container.querySelector('.rpg-wizard-plate--ennemi');
  assert.match(plate.textContent, /Le Guetteur de palier/, 'la plaque adverse porte le nom du sorcier de l’étage');
  assert.match(plate.textContent, /Vigie de la Chambre/, 'la fonction du sorcier remplace la ligne habituelle');
  assert.equal(plate.querySelector('.rpg-wizard-plate__hp-value')?.textContent.trim(), String(rpgSorcierPv(0)),
    `la puissance 0 du guetteur donne bien ${rpgSorcierPv(0)} PV`);

  // --- Retour au menu : on retrouve la galerie des tours ---
  await click(buttons().find((button) => button.textContent.trim() === 'Menu'), 'bouton Menu');
  await wait(120);
  await act(async () => { });
  assert.ok(container.querySelector('.rpg-story'), 'le bouton Menu ramène au mode Histoire');
  assert.ok(container.querySelector('.rpg-story-tower'), 'les tours restent consultables en maquettes');
  assert.equal(container.querySelectorAll('.rpg-story-floor').length, 0,
    'le retour au menu laisse la galerie fermée sur ses étages');

  // --- Reprendre le même étage en rouvrant sa tour ---
  await ouvrirTour('tour-des-listes', 'Tour des Listes après le duel');
  await click(floorById('listes-1'), 'étage listes-1 bis');
  await wait(120);
  await act(async () => { });
  assert.match(container.querySelector('.rpg-duel-nav__story')?.textContent ?? '', /Le Guetteur de palier/,
    'rejouer le même étage relance bien le duel');

  // --- Un nouveau montage relit la progression sauvegardée dans localStorage ---
  await act(async () => { root.unmount(); });
  const root2 = createRoot(container);
  await act(async () => {
    window.localStorage.setItem(progressKey, JSON.stringify({ version: 1, etagesVaincus: ['listes-1', 'listes-2', 'listes-3'] }));
    root2.render(<RpgDuelPage
      joueurDeck={['desert', 'desert', 'desert', 'desert', 'chien-du-guet', 'parade-du-verre', 'mer', 'djinn-de-foudre', 'fennec-des-decombres', 'desert']}
      sorcierDeck={['chien-du-guet', 'desert', 'chien-du-guet', 'desert', 'desert', 'desert', 'desert', 'desert', 'desert', 'desert']}
      rng={() => 0.999}
    />);
  });
  await click(buttons().find((button) => button.textContent.includes('Histoire')), 'entrée Histoire après remontage');
  assert.ok(container.querySelector('.rpg-story-tower'), 'la galerie des tours est rendue après remontage');
  await ouvrirTour('tour-des-listes', 'Tour des Listes après remontage');
  assert.ok(floorById('listes-2') && !floorById('listes-2').disabled,
    'un étage sauvegardé comme vaincu reste jouable');
  assert.ok(floorById('listes-2').className.includes('is-cleared'), 'les étages vaincus sont marqués');
  assert.ok(floorById('listes-5')?.disabled, 'les étages non atteints restent verrouillés');
  assert.ok(container.textContent.includes('3 / 5 ÉTAGES DÉBLAYÉS'), 'le compteur de progression suit');

  await act(async () => { root2.unmount(); });
}
