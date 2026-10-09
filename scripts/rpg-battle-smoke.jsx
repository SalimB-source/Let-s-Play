// Rendu réel de la nouvelle partie (le duel de sorciers) dans jsdom :
// la table démarre vide, chaque camp pioche 5 cartes en images 4:5, on pose
// un terrain (un par tour), on l'engage pour son mana, on paie une créature,
// puis le sorcier adverse joue tout seul (terrain + créatures). Les règles
// viennent du moteur (testé par ailleurs) ; ce qui est vérifié ici, c'est
// que la page les affiche et réagit — React et les timers se rencontrent.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function checkRpgBattle(assert) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  // Decks déterministes : 5 cartes chacun, tout part dans la main de départ.
  await act(async () => {
    root.render(<RpgDuelPage
      joueurDeck={['plaines', 'plaines', 'rat-des-decombres', 'chien-du-guet', 'porteuse-de-cruches']}
      sorcierDeck={['plaines', 'plaines', 'chien-du-guet', 'chien-du-guet', 'chien-du-guet']}
    />);
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

  // ── Toutes les cartes de la main sont les images 4:5 générées ──────────
  const srcs = [...container.querySelectorAll('.rpg-hand__card--img img')].map((i) => i.getAttribute('src'));
  assert.equal(srcs.length, 5, 'chaque carte de la main est une image');
  assert.ok(srcs.every((s) => /cards\/.+\.jpg$/.test(s)), `les cartes pointent vers /cards/ (${srcs.join(', ')})`);

  // ── Un tour de jeu : terrain (1/tour), engager, payer une créature ─────
  const jouerUnTour = async () => {
    const terrainMain = handCards().find((b) => b.className.includes('rpg-hand__card--terrain') && !b.disabled);
    if (terrainMain) await act(async () => { terrainMain.click(); });
    const monTerrain = container.querySelector('.rpg-terrain--joueur:not(.is-tapped)');
    if (monTerrain) await act(async () => { monTerrain.click(); });
    const jouable = handCards().find((b) => !b.disabled && !b.className.includes('rpg-hand__card--terrain'));
    if (jouable) await act(async () => { jouable.click(); });
  };

  let poses = 0;
  for (let tour = 0; tour < 4 && !poses; tour += 1) {
    await jouerUnTour();
    poses = container.querySelectorAll('.rpg-card--equipe').length;
    if (!poses) {
      await act(async () => { findButton('Fin du tour').click(); });
      await act(async () => { await wait(1800); });
    }
  }
  assert.ok(poses >= 1, 'une créature payée au mana doit entrer en jeu');
  assert.match(container.textContent, /⚔/, 'la carte posée montre son attaque');
  assert.ok(container.querySelectorAll('.rpg-terrain--joueur').length >= 1, 'le terrain posé est visible');
  assert.ok(container.querySelector('.rpg-terrain--joueur.is-tapped'), 'le terrain a été engagé pour son mana');

  // ── Mal d'invocation : la créature qui arrive observe ──────────────────
  await act(async () => { container.querySelector('.rpg-card--equipe').click(); });
  assert.match(container.textContent, /observe encore|déjà frappé/, 'le mal d’invocation doit être expliqué');

  // ── Le sorcier adverse joue tout seul : terrain puis créatures ─────────
  let ennemiJoue = 0;
  for (let tour = 0; tour < 3 && !ennemiJoue; tour += 1) {
    await act(async () => { findButton('Fin du tour').click(); });
    await act(async () => { await wait(1800); });
    ennemiJoue = container.querySelectorAll('.rpg-card--ennemi').length
      + container.querySelectorAll('.rpg-terrains--ennemi .rpg-terrain').length;
  }
  assert.ok(ennemiJoue >= 1, 'le sorcier adverse doit poser terrains et cartes');

  // ── Mur de créatures : pas de frappe directe tant qu'elles font face ───
  await act(async () => { container.querySelector('.rpg-wizard-plate--ennemi').click(); });
  assert.match(container.textContent, /fait face|d’abord|Lancez la phase/, 'la frappe du sorcier passe par la phase d’attaque');

  // ── Au tour suivant, notre créature devient prête (liseré doré) ────────
  await act(async () => { findButton('Fin du tour').click(); });
  await act(async () => { await wait(1800); });
  assert.ok(container.querySelector('.rpg-card--equipe.is-pret'),
    'notre créature doit être prête à attaquer à notre tour');

  // ── Phase d'attaque : on déclare tous les attaquants, puis on lance ───
  await act(async () => { findButton('⚔ Attaquer').click(); });
  assert.ok(findButton('Lancer l’attaque'), 'la phase d’attaque propose de lancer');
  await act(async () => { container.querySelector('.rpg-card--equipe').click(); });
  const lancer = findButton('Lancer l’attaque');
  assert.match(lancer.textContent, /\(1\)/, 'un attaquant déclaré');
  await act(async () => { lancer.click(); });
  assert.match(container.textContent, /Attaque résolue|frappent le sorcier/, 'l’attaque se résout');
  assert.ok(!container.querySelector('.rpg-card--equipe.is-pret'),
    'les attaquants ont frappé : plus personne n’est prêt');

  await act(async () => { root.unmount(); });
}
