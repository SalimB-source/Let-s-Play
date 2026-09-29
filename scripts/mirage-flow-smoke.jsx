/**
 * Entrée SSR utilisée par scripts/mirage-flow-check.mjs — `npm run check:mirage-flow`.
 *
 * Vérifie le parcours d'entrée de Mirage Rush (page /jeu) après le retrait de
 * la barre d'onglets (RUÉE / DUEL / EN LIGNE) et du sélecteur de terrain
 * (étape « 02 / ton terrain ») :
 *
 *   1. à l'arrivée, la page lance directement la ruée : ni barre d'onglets
 *      dans l'en-tête, ni sélecteur de mode, ni sélecteur de terrain, et le
 *      bouton « LANCER LA PARTIE » est présent d'emblée (visible sans
 *      défilement, donc jamais conditionné à un choix préalable) ;
 *   2. le terrain est figé sur les Dunes de l'Écho (bandeau ZONE 01) ;
 *   3. les commandes clavier et les consignes de la ruée sont révélées ;
 *   4. un lien de défi (?duel=…) ouvre directement le duel : bouton
 *      « LANCER LE DUEL », stage imposé par le défi (bandeau ZONE 03) et
 *      consignes des 600 m.
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

export async function checkMirageFlow(assert) {
  /* ---------------- 1. Écran d'entrée : la ruée, directement ------------ */
  const page = await mountPage('/jeu');
  try {
    const intro = page.node.querySelector('.mirage-intro-overlay');
    assert.ok(intro, 'l’overlay d’intro est affiché');

    assert.equal(page.node.querySelectorAll('.mirage-mode-tabs').length, 0,
      'la barre d’onglets (RUÉE / DUEL / EN LIGNE) a disparu de l’en-tête');
    assert.equal(page.node.querySelectorAll('.mirage-mode-picker').length, 0,
      'le sélecteur de mode a disparu de l’overlay d’intro');
    assert.equal(page.node.querySelectorAll('.mirage-stage-picker').length, 0,
      'le sélecteur de terrain (02 / ton terrain) a disparu');
    assert.equal(page.node.querySelectorAll('.mirage-map-card').length, 0,
      'aucune carte de map n’est proposée');

    assert.ok(intro.querySelector('h2').textContent.includes('LE SABLE'),
      'le titre annonce directement la ruée');
    assert.ok(intro.querySelector('h2').textContent.includes('SE RÉVEILLE'),
      'le titre n’invite plus à choisir un mode au préalable');

    const start = page.node.querySelector('.mirage-start-button');
    assert.ok(start, 'le bouton de lancement est présent dès l’arrivée (pas de choix préalable)');
    // En jsdom le canvas 3D ne se rend pas : `ready` reste false et le bouton
    // affiche son libellé d’attente. Dans un navigateur il devient
    // « LANCER LA PARTIE » — l’essentiel ici est qu’il existe sans condition.
    assert.ok(start.textContent.includes('LANCER LA PARTIE') || start.textContent.includes('CHARGEMENT DU DÉSERT'),
      'le bouton propose « LANCER LA PARTIE » (ou l’attente du rendu 3D)');
    // Il doit rester dans le flux de l’overlay : rien ne le conditionne, donc
    // aucun risque qu’il n’apparaisse qu’après un défilement.
    assert.ok(intro.contains(start), 'le bouton de lancement vit bien dans l’overlay d’intro');

    assert.ok(page.node.querySelector('.mirage-keys-hint'), 'les commandes clavier sont révélées');
    assert.ok(page.node.querySelector('.mirage-overlay-hint').textContent.includes('RECORD À BATTRE'),
      'les consignes de la ruée sont révélées');

    /* ---------------- 2. Terrain figé sur les Dunes de l'Écho ----------- */
    assert.ok(page.node.querySelector('.mirage-game-brand').textContent.includes('DUNES DE L’ÉCHO'),
      'le bandeau de zone reste sur le terrain par défaut (ZONE 01)');
  } finally {
    await page.unmount();
  }

  /* ------------- 3. Lien de défi : le duel s'ouvre directement ---------- */
  const code = encodeChallenge({ seed: 20260929, duration: 41.5, trace: [0, 240, 480, 600], name: 'Salim', stage: 'prairie' });
  const challenged = await mountPage(`/jeu?duel=${code}`);
  try {
    const intro = challenged.node.querySelector('.mirage-intro-overlay');
    assert.ok(intro, 'l’overlay d’intro est affiché sur un lien de défi');
    assert.equal(challenged.node.querySelectorAll('.mirage-map-card').length, 0,
      'le sélecteur de terrain reste absent, même avec un défi');
    assert.ok(intro.textContent.includes('Stage imposé par le défi'),
      'l’encart précise que le stage est imposé');
    assert.ok(intro.querySelector('h2').textContent.includes('À TOI DE'),
      'le titre passe en mode duel');
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
