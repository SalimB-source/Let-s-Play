// Rendu réel du mode Histoire dans jsdom : tours, étages verrouillés,
// lancement d'un étage (deck et profil IA de l'étage) et retour au menu.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function checkRpgStory(assert) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const progressKey = 'letsplay_sablier_histoire_v1';

  await act(async () => {
    root.render(<RpgDuelPage
      joueurDeck={['desert', 'desert', 'desert', 'desert', 'chien-du-guet', 'parade-du-verre', 'mer', 'veilleur-du-couchant', 'fennec-des-decombres', 'desert']}
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
    await wait(60);
    await act(async () => { });
  };

  // --- Accès au mode Histoire depuis le menu ---
  await click(buttons().find((button) => button.textContent.includes('Histoire')), 'entrée Histoire depuis le menu');
  assert.ok(container.querySelector('.rpg-story'), 'la carte du mode Histoire s’affiche');
  assert.equal(container.querySelectorAll('.rpg-story-tour').length, 3, 'les trois tours sont présentées');

  // --- Étages : le premier est ouvert, les suivants verrouillés ---
  const floors = () => [...container.querySelectorAll('.rpg-story-floor')];
  const floorById = (id) => floors().find((floor) => floor.getAttribute('data-etage') === id);
  assert.ok(floorById('listes-1'), 'l’étage de départ est rendu');
  assert.ok(!floorById('listes-1').disabled, 'le premier étage est jouable');
  assert.ok(floorById('listes-1').className.includes('is-next'), 'le premier étage est proposé comme prochaine étape');
  assert.ok(floorById('listes-2')?.disabled, 'le deuxième étage reste verrouillé tant que le premier tient');
  assert.match(floorById('listes-2').textContent, /verrouillé/i, 'le verrouillage est annoncé');
  assert.ok(!floorById('souk-1').disabled, 'la première marche des autres tours est aussi ouverte');

  // --- Lancement de l'étage : deck, puissance et profil de l'étage ---
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
  assert.match(plate.textContent, /🛡\s*50/, 'la puissance 0 du guetteur donne bien 50 PV');

  // --- Retour au menu : on retrouve la carte des tours ---
  await click(buttons().find((button) => button.textContent.trim() === 'Menu'), 'bouton Menu');
  await wait(120);
  await act(async () => { });
  assert.ok(container.querySelector('.rpg-story'), 'le bouton Menu ramène aux tours en mode Histoire');
  assert.ok(container.querySelector('.rpg-story-tour'), 'les tours restent consultables');

  // --- Reprendre le même étage par son bouton ---
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
      joueurDeck={['desert', 'desert', 'desert', 'desert', 'chien-du-guet', 'parade-du-verre', 'mer', 'veilleur-du-couchant', 'fennec-des-decombres', 'desert']}
      sorcierDeck={['chien-du-guet', 'desert', 'chien-du-guet', 'desert', 'desert', 'desert', 'desert', 'desert', 'desert', 'desert']}
      rng={() => 0.999}
    />);
  });
  await click(buttons().find((button) => button.textContent.includes('Histoire')), 'entrée Histoire après remontage');
  assert.ok(floorById('listes-2') && !floorById('listes-2').disabled,
    'un étage sauvegardé comme vaincu reste jouable');
  assert.ok(floorById('listes-2').className.includes('is-cleared'), 'les étages vaincus sont marqués');
  assert.ok(floorById('listes-5')?.disabled, 'les étages non atteints restent verrouillés');
  assert.ok(container.textContent.includes('3 / 5 ÉTAGES DÉBLAYÉS'), 'le compteur de progression suit');

  await act(async () => { root2.unmount(); });
}
