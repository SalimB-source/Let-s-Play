/**
 * Entrée SSR utilisée par scripts/mirage-flow-check.mjs — `npm run check:mirage-flow`.
 *
 * Vérifie le parcours d'entrée de Mirage Rush (page /jeu) :
 *
 *   1. à l'arrivée, SEUL le choix du mode (ruée / duel / en ligne) est
 *      proposé : aucun mode marqué sélectionné, le terrain (étape 02) est
 *      remplacé par un encart verrouillé, et le bouton « lancer » n'existe
 *      pas encore ;
 *   2. choisir RUÉE débloque le terrain (4 cartes de map), révèle la
 *      description, le bouton de lancement et les raccourcis clavier ; la
 *      carte choisie est bien prise en compte (bandeau ZONE au-dessus du
 *      plateau) ;
 *   3. les onglets d'en-tête passent par le même chemin : cliquer DUEL
 *      garde le terrain visible et révèle les textes du duel ;
 *   4. un lien de défi (?duel=…) compte déjà comme un choix de mode : le
 *      terrain est visible d'emblée mais verrouillé par le défi, avec le
 *      bouton « LANCER LE DUEL » disponible.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext';
import MirageRushPage from '../src/games/MirageRushPage';
import { encodeChallenge } from '../src/games/duelChallenge';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function clickByText(rootEl, selector, expected, assert) {
  const candidates = [...rootEl.querySelectorAll(selector)];
  const target = candidates.find((el) => el.textContent.includes(expected));
  assert.ok(target, `bouton « ${expected} » trouvé (${selector})`);
  return act(async () => target.click());
}

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
  /* -------------------------- 1. Écran d'entrée : le mode d'abord -------- */
  const page = await mountPage('/jeu');
  try {
    const intro = page.node.querySelector('.mirage-intro-overlay');
    assert.ok(intro, 'l’overlay d’intro est affiché');
    assert.equal(page.node.querySelectorAll('.mirage-mode-picker button[aria-pressed="true"]').length, 0,
      'aucun mode pré-sélectionné avant le choix du joueur');
    assert.ok(page.node.querySelector('.mirage-stage-locked'),
      'le terrain est remplacé par un encart « verrouillé » tant qu’aucun mode n’est choisi');
    assert.ok(!page.node.querySelector('.mirage-stage-picker'),
      'aucune carte de map n’est proposée avant le choix du mode');
    assert.ok(!page.node.querySelector('.mirage-start-button'),
      'pas de bouton « lancer » tant qu’aucun mode n’est choisi');
    assert.ok(intro.querySelector('h2').textContent.includes('CHOISIS D’ABORD'),
      'le titre invite d’abord à choisir le mode');

    /* ------------------ 2. Choisir RUÉE débloque le choix de la map ------ */
    await clickByText(page.node, '.mirage-mode-picker button', 'RUÉE', assert);
    const maps = page.node.querySelectorAll('.mirage-stage-picker .mirage-map-card');
    assert.equal(maps.length, 4, 'les 4 cartes de terrain apparaissent après le choix du mode');
    assert.ok(page.node.querySelector('.mirage-start-button'), 'le bouton « lancer » apparaît');
    assert.ok(page.node.querySelector('.mirage-keys-hint'), 'les commandes clavier sont révélées');
    assert.equal([...page.node.querySelectorAll('.mirage-mode-picker button')].find((el) => el.textContent.includes('RUÉE'))?.getAttribute('aria-pressed'), 'true',
      'le mode RUÉE est marqué sélectionné');

    // La map choisie est prise en compte : le bandeau au-dessus du plateau change.
    await act(async () => maps[1].click()); // Dust Creek (zone 02)
    assert.equal(maps[1].getAttribute('aria-pressed'), 'true', 'la carte Dust Creek est sélectionnée');
    assert.ok(page.node.querySelector('.mirage-game-brand').textContent.includes('DUST CREEK'),
      'le bandeau de zone affiche le terrain choisi');

    /* --------------- 3. Les onglets d'en-tête suivent le même parcours --- */
    await clickByText(page.node, '.mirage-mode-tab', 'DUEL', assert);
    assert.ok(page.node.querySelector('.mirage-intro-overlay h2').textContent.includes('À TOI DE'),
      'le titre passe en mode duel');
    const duelButton = [...page.node.querySelectorAll('.mirage-mode-picker button')].find((el) => el.textContent.includes('DUEL'));
    assert.equal(duelButton?.getAttribute('aria-pressed'), 'true', 'le mode DUEL est marqué sélectionné');
    assert.ok(page.node.querySelector('.mirage-stage-picker'), 'le terrain reste visible en duel');
    assert.ok([...page.node.querySelectorAll('.mirage-map-card')].every((card) => !card.disabled),
      'sans lien de défi, les cartes restent libres en duel');
    assert.ok(page.node.querySelector('.mirage-start-button'),
      'le bouton de lancement est bien présent en duel');
    assert.ok(page.node.querySelector('.mirage-overlay-hint').textContent.includes('LE PLUS RAPIDE GAGNE'),
      'les consignes du duel (600 m) sont révélées');
  } finally {
    await page.unmount();
  }

  /* ----------- 4. Lien de défi : mode imposé, terrain visible mais clos - */
  const code = encodeChallenge({ seed: 20260929, duration: 41.5, trace: [0, 240, 480, 600], name: 'Salim', stage: 'prairie' });
  const challenged = await mountPage(`/jeu?duel=${code}`);
  try {
    const maps = challenged.node.querySelectorAll('.mirage-stage-picker .mirage-map-card');
    assert.equal(maps.length, 4, 'avec un défi, le terrain est visible d’emblée (le mode est déjà choisi)');
    assert.ok([...maps].every((card) => card.disabled), 'les cartes sont verrouillées : le défi impose le stage');
    assert.ok(challenged.node.querySelector('.mirage-intro-overlay')?.textContent.includes('Stage imposé par le défi'),
      'l’encart précise que le stage est imposé');
    assert.ok(challenged.node.querySelector('.mirage-start-button'), 'le bouton de lancement du défi est disponible d’emblée');
    assert.ok(challenged.node.querySelector('.mirage-overlay-hint').textContent.includes('LE PLUS RAPIDE GAGNE'),
      'les consignes du duel sont révélées dès l’arrivée sur le lien');
    const prairie = [...maps].find((card) => card.getAttribute('aria-pressed') === 'true');
    assert.ok(prairie?.textContent.includes('Plaines d’Or'), 'le stage du défi (Plaines d’Or) est présélectionné');
  } finally {
    await challenged.unmount();
  }
}
