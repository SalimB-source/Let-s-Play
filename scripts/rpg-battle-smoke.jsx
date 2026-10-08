// Rendu réel de la nouvelle partie (le duel de sorciers) dans jsdom :
// la table démarre vide, chaque camp pioche 5 cartes en images 4:5, on pose
// une créature, on vérifie le mal d'invocation, le mur de créatures et le
// tour du sorcier adverse qui joue tout seul. Les règles viennent du moteur
// (testé par ailleurs) ; ce qui est vérifié ici, c'est que la page les
// affiche et réagit — le seul endroit où React et les timers se rencontrent.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function checkRpgBattle(assert) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<RpgDuelPage />);
  });

  const buttons = () => [...container.querySelectorAll('button')];
  const findButton = (label) => buttons().find((button) => button.textContent.includes(label));
  const handCards = () => buttons().filter((b) => b.className.includes('rpg-hand__card'));

  // ── Nouvelle partie : table vide, 5 cartes, 50 PV face à un sorcier à 60 ─
  assert.ok(container.querySelector('.card-table'), 'la table de jeu doit être montée');
  assert.equal(container.querySelectorAll('.rpg-card').length, 0, 'la table démarre sans aucune carte');
  assert.equal(handCards().length, 5, 'chaque camp pioche 5 cartes');
  assert.match(container.textContent, /🛡 50/, 'le joueur démarre à 50 PV');
  assert.match(container.textContent, /🛡 60/, 'le sorcier (puissance 2) démarre à 60 PV');

  // ── Toutes les cartes sont les images 4:5 générées ─────────────────────
  const srcs = [...container.querySelectorAll('.rpg-hand__card--img img')].map((i) => i.getAttribute('src'));
  assert.equal(srcs.length, 5, 'chaque carte de la main est une image');
  assert.ok(srcs.every((s) => /cards\/.+\.jpg$/.test(s)), `les cartes pointent vers /cards/ (${srcs.join(', ')})`);

  // ── Poser une créature (2 ⛃ de revenu au premier tour) ─────────────────
  let pose = 0;
  for (let essai = 0; essai < 4 && !pose; essai += 1) {
    const jouable = handCards().find((b) => !b.disabled);
    if (jouable) {
      await act(async () => { jouable.click(); });
      pose = container.querySelectorAll('.rpg-card--equipe').length;
      break;
    }
    await act(async () => { findButton('Fin du tour').click(); });
    await act(async () => { await wait(1800); });
  }
  assert.equal(pose, 1, 'une créature doit être posée sur la table');
  assert.match(container.textContent, /⚔/, 'la carte posée montre son attaque');

  // ── Mal d'invocation : la créature qui arrive observe ──────────────────
  await act(async () => { container.querySelector('.rpg-card--equipe').click(); });
  assert.match(container.textContent, /observe encore|déjà frappé/, 'le mal d’invocation doit être expliqué');

  // ── Le sorcier adverse joue son tour tout seul ─────────────────────────
  await act(async () => { findButton('Fin du tour').click(); });
  await act(async () => { await wait(1800); });
  assert.ok(container.querySelectorAll('.rpg-card--ennemi').length >= 1,
    'le sorcier adverse doit poser ses cartes');

  // ── Mur de créatures : pas de frappe directe tant qu'elles font face ───
  await act(async () => { container.querySelector('.rpg-wizard-plate--ennemi').click(); });
  assert.match(container.textContent, /fait face|d’abord|Choisissez/, 'le mur de créatures doit bloquer la frappe directe');

  // ── Au tour suivant, notre créature devient prête (liseré doré) ────────
  await act(async () => { findButton('Fin du tour').click(); });
  await act(async () => { await wait(1800); });
  assert.ok(container.querySelector('.rpg-card--equipe.is-pret'),
    'notre créature doit être prête à attaquer à notre tour');

  await act(async () => { root.unmount(); });
}
