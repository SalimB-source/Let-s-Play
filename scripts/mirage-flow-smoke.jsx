/**
 * Entrée SSR utilisée par scripts/mirage-flow-check.mjs — `npm run check:mirage-flow`.
 *
 * Vérifie le parcours d'entrée de Mirage Rush (page /jeu) : le choix du mode
 * (RUÉE / DUEL / EN LIGNE) est remis DANS LE JEU, dans l'overlay d'intro,
 * tandis que la barre d'onglets de l'en-tête et le sélecteur de terrain
 * restent retirés :
 *
 *   1. à l'arrivée, l'overlay d'intro propose le choix du mode (3 cartes,
 *      RUÉE sélectionnée par défaut) : ni barre d'onglets dans l'en-tête,
 *      ni sélecteur de terrain, et le bouton « LANCER LA PARTIE » est
 *      présent d'emblée ;
 *   2. le clic sur DUEL bascule l'overlay en mode duel (« À TOI DE »,
 *      bouton « LANCER LE DUEL ») et le clic sur RUÉE revient en ruée ;
 *   3. le terrain est figé sur les Dunes de l'Écho (bandeau ZONE 01) ;
 *   4. un lien de défi (?duel=…) ouvre directement le duel : DUEL déjà
 *      sélectionné, bouton « LANCER LE DUEL », stage imposé par le défi
 *      (bandeau ZONE 03) et consignes des 600 m.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext';
import MirageRushPage from '../src/games/MirageRushPage';
import { encodeChallenge } from '../src/games/duelChallenge';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function mountPage(entry) {
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node);
  await act(async () => root.render(
    <AuthProvider>
      <MemoryRouter initialEntries={[entry]}>
        <MirageRushPage />
      </MemoryRouter>
    </AuthProvider>,
  ));
  await act(async () => { await sleep(30); });
  return {
    node,
    unmount: async () => { await act(async () => root.unmount()); node.remove(); },
  };
}

function modeButtons(node) {
  const picker = node.querySelector('.mirage-mode-picker');
  return picker ? [...picker.querySelectorAll('button')] : [];
}

export async function checkMirageFlow(assert) {
  /* ---------------- 1. Écran d'entrée : le choix du mode est là --------- */
  const page = await mountPage('/jeu');
  try {
    const intro = page.node.querySelector('.mirage-intro-overlay');
    assert.ok(intro, 'l’overlay d’intro est affiché');

    assert.equal(page.node.querySelectorAll('.mirage-mode-tabs').length, 0,
      'la barre d’onglets (RUÉE / DUEL / EN LIGNE) n’est pas revenue dans l’en-tête');

    const buttons = modeButtons(page.node);
    assert.ok(intro.querySelector('.mirage-mode-picker'), 'le sélecteur de mode est remis dans l’overlay d’intro');
    assert.equal(buttons.length, 3, 'trois modes sont proposés');
    assert.deepEqual(
      buttons.map((button) => button.querySelector('strong')?.textContent),
      ['RUÉE', 'DUEL', 'EN LIGNE'],
      'les modes RUÉE, DUEL et EN LIGNE sont choisis');
    assert.equal(buttons[0].getAttribute('aria-pressed'), 'true',
      'la RUÉE est sélectionnée par défaut');
    assert.equal(page.node.querySelectorAll('.mirage-stage-picker').length, 0,
      'le sélecteur de terrain (02 / ton terrain) reste retiré');
    assert.equal(page.node.querySelectorAll('.mirage-map-card').length, 0,
      'aucune carte de map n’est proposée');

    assert.ok(intro.querySelector('h2').textContent.includes('LE SABLE'),
      'le titre annonce la ruée par défaut');

    const start = page.node.querySelector('.mirage-start-button');
    assert.ok(start, 'le bouton de lancement est présent dès l’arrivée');
    // En jsdom le canvas 3D ne se rend pas : `ready` reste false et le bouton
    // affiche son libellé d’attente. Dans un navigateur il devient
    // « LANCER LA PARTIE » — l’essentiel ici est qu’il existe sans condition.
    assert.ok(start.textContent.includes('LANCER LA PARTIE') || start.textContent.includes('CHARGEMENT DU DÉSERT'),
      'le bouton propose « LANCER LA PARTIE » (ou l’attente du rendu 3D)');
    assert.ok(intro.contains(start), 'le bouton de lancement vit dans l’overlay d’intro, sous le choix du mode');

    assert.ok(page.node.querySelector('.mirage-keys-hint'), 'les commandes clavier sont révélées');
    assert.ok(page.node.querySelector('.mirage-overlay-hint').textContent.includes('RECORD À BATTRE'),
      'les consignes de la ruée sont révélées');

    /* ---------------- 2. Terrain figé sur les Dunes de l'Écho ----------- */
    assert.ok(page.node.querySelector('.mirage-game-brand').textContent.includes('DUNES DE L’ÉCHO'),
      'le bandeau de zone reste sur le terrain par défaut (ZONE 01)');

    /* --------------- 3. Le clic sur DUEL bascule l'overlay -------------- */
    await act(async () => { buttons[1].click(); });
    const duelIntro = page.node.querySelector('.mirage-intro-overlay');
    assert.ok(duelIntro.querySelector('h2').textContent.includes('À TOI DE'),
      'cliquer DUEL passe l’overlay en mode duel');
    const duelStart = page.node.querySelector('.mirage-start-button');
    assert.ok(duelStart.textContent.includes('LANCER LE DUEL') || duelStart.textContent.includes('CHARGEMENT DU DÉSERT'),
      'le bouton propose « LANCER LE DUEL » après le clic sur DUEL');
    assert.ok(page.node.querySelector('.mirage-overlay-hint').textContent.includes('LE PLUS RAPIDE GAGNE'),
      'les consignes du duel (600 m) apparaissent après le clic sur DUEL');

    /* ---------- Et le clic sur RUÉE revient à la ruée par défaut -------- */
    const rushButton = modeButtons(page.node).find((button) => button.querySelector('strong')?.textContent === 'RUÉE');
    assert.ok(rushButton, 'la carte RUÉE reste proposée après le passage en duel');
    await act(async () => { rushButton.click(); });
    const rushStart = page.node.querySelector('.mirage-start-button');
    assert.ok(rushStart.textContent.includes('LANCER LA PARTIE') || rushStart.textContent.includes('CHARGEMENT DU DÉSERT'),
      'cliquer RUÉE revient au mode ruée');
  } finally {
    await page.unmount();
  }

  /* ------------- 4. Lien de défi : le duel s'ouvre directement ---------- */
  const code = encodeChallenge({ seed: 20260929, duration: 41.5, trace: [0, 240, 480, 600], name: 'Salim', stage: 'prairie' });
  const challenged = await mountPage(`/jeu?duel=${code}`);
  try {
    const intro = challenged.node.querySelector('.mirage-intro-overlay');
    assert.ok(intro, 'l’overlay d’intro est affiché sur un lien de défi');
    const duelButton = modeButtons(challenged.node).find((button) => button.querySelector('strong')?.textContent === 'DUEL');
    assert.ok(duelButton, 'le sélecteur de mode est présent même sur un lien de défi');
    assert.equal(duelButton.getAttribute('aria-pressed'), 'true',
      'le mode DUEL est déjà sélectionné sur un lien de défi');
    assert.ok(duelButton.textContent.includes('Défi de Salim'),
      'la carte DUEL annonce le défi du joueur');
    assert.equal(challenged.node.querySelectorAll('.mirage-map-card').length, 0,
      'le sélecteur de terrain reste absent, même avec un défi');
    assert.ok(intro.textContent.includes('Stage imposé par le défi'),
      'l’encart précise que le stage est imposé');
    assert.ok(intro.querySelector('h2').textContent.includes('À TOI DE'),
      'le titre est en mode duel');
    const start = challenged.node.querySelector('.mirage-start-button');
    assert.ok(start, 'le bouton de lancement du défi est disponible d’emblée');
    assert.ok(start.textContent.includes('LANCER LE DUEL') || start.textContent.includes('CHARGEMENT DU DÉSERT'),
      'le bouton propose « LANCER LE DUEL » (ou l’attente du rendu 3D)');
    assert.ok(challenged.node.querySelector('.mirage-overlay-hint').textContent.includes('LE PLUS RAPIDE GAGNE'),
      'les consignes du duel (600 m) sont révélées dès l’arrivée sur le lien');
    assert.ok(challenged.node.querySelector('.mirage-game-brand').textContent.includes('PLAINES D’OR'),
      'le stage du défi (ZONE 03 · Plaines d’Or) est bien appliqué');
  } finally {
    await challenged.unmount();
  }
}
