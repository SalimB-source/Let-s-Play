/**
 * Entrée SSR utilisée par scripts/mirage-flow-check.mjs — `npm run check:mirage-flow`.
 *
 * Vérifie le nouveau parcours d'entrée de Mirage Rush :
 *
 *   1. à l'arrivée, l'overlay affiche uniquement trois vrais boutons de mode
 *      (RUÉE / DUEL / EN LIGNE), sans maps ni bouton de lancement ;
 *   2. le clic sur RUÉE ou DUEL ouvre l'écran suivant, où les 9 maps et le
 *      bouton de lancement apparaissent ;
 *   3. un lien de défi ouvre directement l'écran des maps, verrouillé sur le
 *      terrain imposé ;
 *   4. le panneau latéral est regroupé dans PARAMÈTRES avec trois onglets :
 *      La communauté, Ton cavalier, Informations ;
 *   5. la piste de l'application (trois voies, `setLaneCount(3)`) fait suivre
 *      les textes : deux rivaux, « 3 CAVALIERS » et « sur les 3 voies ».
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext';
import MirageRushPage from '../src/games/MirageRushPage';
import { encodeChallenge } from '../src/games/duelChallenge';
import { laneCount, setLaneCount } from '../src/games/mirageRules';

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

function mapCards(node) {
  return [...node.querySelectorAll('.mirage-map-card')];
}

async function openMode(assert, node, label) {
  const button = modeButtons(node).find((candidate) => candidate.querySelector('strong')?.textContent === label);
  assert.ok(button, `le bouton ${label} est présent`);
  assert.equal(button.tagName, 'BUTTON', `${label} est un vrai bouton HTML`);
  assert.notEqual(button.getAttribute('role'), 'tab', `${label} n'est pas exposé comme un onglet`);
  await act(async () => { button.click(); });
  await act(async () => { await sleep(0); });
}

function assertNineMaps(assert, node) {
  const maps = mapCards(node);
  assert.equal(maps.length, 9, 'neuf horizons sont proposés sur l’écran des maps');
  assert.deepEqual(
    maps.map((card) => card.querySelector('.mirage-map-copy strong')?.textContent),
    ['Dunes de l’Écho', 'Dust Creek', 'Plaines d’Or', 'Costa Omertà', 'Alger la Blanche', 'Plaines de Yōtei', 'Remparts d’Ocre', 'Château de l’Infini', 'Thunder Airbase'],
    'les neuf cartes de map sont dans l’ordre',
  );
  const mapIds = ['desert', 'western', 'prairie', 'sardinia', 'alger', 'japan', 'ramparts', 'infinity', 'airbase'];
  const thumbnails = maps.map((card, index) => {
    const image = card.querySelector('img.mirage-map-art');
    assert.ok(image, `${mapIds[index]} possède sa miniature illustrée`);
    assert.equal(card.querySelectorAll('img.mirage-map-art').length, 1,
      'une seule image par carte, sans rendu 3D supplémentaire');
    assert.match(image.getAttribute('src'), new RegExp(`/${mapIds[index]}-[a-zA-Z0-9_-]+[.]webp$`),
      'chaque carte utilise son illustration locale, versionnée par Vite');
    assert.equal(image.getAttribute('width'), '768', 'largeur intrinsèque du panorama');
    assert.equal(image.getAttribute('height'), '256', 'hauteur intrinsèque du panorama');
    assert.equal(image.getAttribute('alt'), '', 'le nom visible suffit à nommer le bouton');
    assert.equal(image.parentElement.getAttribute('aria-hidden'), 'true', 'image décorative pour les lecteurs d’écran');
    assert.equal(image.getAttribute('draggable'), 'false', 'pas de glisser-déposer qui gêne les gestes tactiles');
    assert.equal(image.getAttribute('loading'), 'eager', 'les miniatures sont chargées sur l’écran des maps');
    return image.getAttribute('src');
  });
  assert.equal(new Set(thumbnails).size, 9, 'neuf illustrations distinctes');
  return maps;
}

export async function checkMirageFlow(assert) {
  /* ---------------- 1. Écran d'entrée : vrais boutons de mode ----------- */
  const page = await mountPage('/jeu');
  try {
    const intro = page.node.querySelector('.mirage-intro-overlay');
    assert.ok(intro, 'l’overlay d’intro est affiché');
    assert.ok(intro.classList.contains('is-mode-step'), 'l’arrivée se fait sur l’écran 01 des modes');

    assert.equal(page.node.querySelectorAll('.mirage-mode-tabs').length, 0,
      'la barre d’onglets (RUÉE / DUEL / EN LIGNE) n’est pas revenue dans l’en-tête principal');

    const buttons = modeButtons(page.node);
    assert.equal(buttons.length, 3, 'trois modes sont proposés');
    assert.deepEqual(
      buttons.map((button) => button.querySelector('strong')?.textContent),
      ['RUÉE', 'DUEL', 'EN LIGNE'],
      'les modes RUÉE, DUEL et EN LIGNE sont proposés',
    );
    for (const button of buttons) {
      assert.equal(button.tagName, 'BUTTON', `${button.textContent} est un vrai bouton`);
      assert.equal(button.type, 'button', 'les modes ne soumettent aucun formulaire');
      assert.notEqual(button.getAttribute('role'), 'tab', 'les boutons de mode ne sont pas des onglets');
    }
    assert.equal(page.node.querySelectorAll('.mirage-stage-picker').length, 0,
      'aucune map n’est affichée avant le choix d’un mode');
    assert.equal(page.node.querySelectorAll('.mirage-start-button').length, 0,
      'le lancement n’est pas affiché avant l’écran des maps');
    assert.ok(page.node.querySelector('.mirage-overlay-hint').textContent.includes('ÉCRAN 01'),
      'l’écran annonce bien la première étape');

    /* ------------------ 2. Paramètres : 3 onglets rangés ---------------- */
    const settings = page.node.querySelector('.mirage-settings');
    assert.ok(settings, 'un panneau PARAMÈTRES regroupe les informations latérales');
    assert.ok(settings.textContent.includes('PARAMÈTRES'), 'le panneau est titré Paramètres');
    const settingsTabs = [...settings.querySelectorAll('.mirage-settings-tabs button')];
    assert.deepEqual(settingsTabs.map((tab) => tab.textContent), ['La communauté', 'Ton cavalier', 'Informations'],
      'les trois onglets demandés sont présents');
    assert.equal(settingsTabs[0].getAttribute('aria-selected'), 'true', 'La communauté est ouverte par défaut');
    assert.ok(settings.querySelector('#mirage-panel-community .mirage-leaderboard'), 'le classement est rangé dans La communauté');
    assert.ok(settings.querySelector('#mirage-panel-rider .mirage-progression'), 'la progression est rangée dans Ton cavalier');
    assert.ok(settings.querySelector('#mirage-panel-info .mirage-howto'), 'les règles sont rangées dans Informations');
    await act(async () => { settingsTabs[1].click(); });
    assert.equal(settingsTabs[1].getAttribute('aria-selected'), 'true', 'l’onglet Ton cavalier s’active au clic');
    await act(async () => { settingsTabs[2].click(); });
    assert.equal(settingsTabs[2].getAttribute('aria-selected'), 'true', 'l’onglet Informations s’active au clic');

    /* ---------------- 3. Clic RUÉE : écran suivant avec maps ------------ */
    await act(async () => { settingsTabs[0].click(); });
    await openMode(assert, page.node, 'RUÉE');
    let stageIntro = page.node.querySelector('.mirage-intro-overlay');
    assert.ok(stageIntro.classList.contains('is-stage-step'), 'cliquer RUÉE ouvre l’écran 02 des maps');
    assert.ok(stageIntro.querySelector('.mirage-selected-mode-pill')?.textContent.includes('RUÉE'),
      'le mode choisi est rappelé sur l’écran des maps');
    assert.ok(stageIntro.querySelector('h2').textContent.includes('LE SABLE'),
      'le titre annonce la ruée');
    let maps = assertNineMaps(assert, page.node);
    assert.equal(maps[0].getAttribute('aria-pressed'), 'true', 'les Dunes de l’Écho sont sélectionnées par défaut');
    assert.ok(page.node.querySelector('.mirage-start-button'), 'le bouton de lancement apparaît sur l’écran des maps');
    assert.ok(page.node.querySelector('.mirage-start-button').textContent.includes('LANCER LA PARTIE') || page.node.querySelector('.mirage-start-button').textContent.includes('CHARGEMENT'),
      'le bouton propose « LANCER LA PARTIE » (ou l’attente du rendu 3D)');

    for (const card of maps) {
      await act(async () => { card.click(); });
      assert.equal(card.getAttribute('aria-pressed'), 'true', 'chaque miniature permet de sélectionner son terrain');
      assert.equal(maps.filter((map) => map.getAttribute('aria-pressed') === 'true').length, 1,
        'un seul terrain sélectionné à la fois');
    }

    const algerCard = maps.find((card) => card.querySelector('.mirage-map-copy strong')?.textContent === 'Alger la Blanche');
    assert.ok(algerCard, 'la carte Alger la Blanche est proposée');
    await act(async () => { algerCard.click(); });
    assert.ok(page.node.querySelector('.mirage-game-brand').textContent.includes('ALGER LA BLANCHE'),
      'choisir Alger la Blanche met à jour le bandeau (ZONE 05 · ALGER LA BLANCHE)');

    /* ---------------- 4. Retour puis clic DUEL : maps + consignes ------- */
    const backToModes = page.node.querySelector('.mirage-secondary-button');
    assert.ok(backToModes, 'un bouton permet de revenir aux modes');
    await act(async () => { backToModes.click(); });
    assert.ok(page.node.querySelector('.mirage-intro-overlay').classList.contains('is-mode-step'),
      'le bouton retour rouvre l’écran des modes');
    await openMode(assert, page.node, 'DUEL');
    stageIntro = page.node.querySelector('.mirage-intro-overlay');
    assert.ok(stageIntro.classList.contains('is-stage-step'), 'cliquer DUEL ouvre lui aussi l’écran des maps');
    assert.ok(stageIntro.querySelector('h2').textContent.includes('À TOI DE'),
      'le titre annonce le duel');
    assert.ok(page.node.querySelector('.mirage-start-button').textContent.includes('LANCER LE DUEL') || page.node.querySelector('.mirage-start-button').textContent.includes('CHARGEMENT'),
      'le bouton propose « LANCER LE DUEL » après le choix DUEL');
    assert.ok(page.node.querySelector('.mirage-overlay-hint').textContent.includes('LE PLUS RAPIDE GAGNE'),
      'les consignes du duel apparaissent sur l’écran des maps');
    const keyPowerIcons = [...page.node.querySelectorAll('.mirage-keys-hint [data-power-icon]')].map((el) => el.getAttribute('data-power-icon'));
    assert.deepEqual(keyPowerIcons, ['shield', 'lasso', 'boost', 'pistol'],
      'les 4 icônes vectorielles des objets spéciaux sont affichées dans les raccourcis duel');
    const rulePowerIcons = [...page.node.querySelectorAll('.mirage-rule-powers-grid [data-power-icon]')].map((el) => el.getAttribute('data-power-icon'));
    assert.deepEqual(rulePowerIcons, ['shield', 'lasso', 'boost', 'pistol'],
      'les 4 icônes vectorielles des objets spéciaux restent dans l’onglet Informations');

    /* ---------------- 5. Clic EN LIGNE : maps avant lobby -------------- */
    await act(async () => { page.node.querySelector('.mirage-secondary-button').click(); });
    await openMode(assert, page.node, 'EN LIGNE');
    const onlineIntro = page.node.querySelector('.mirage-intro-overlay');
    assert.ok(onlineIntro.classList.contains('is-stage-step'), 'cliquer EN LIGNE ouvre aussi l’écran des maps');
    assert.ok(onlineIntro.querySelector('.mirage-selected-mode-pill')?.textContent.includes('EN LIGNE'),
      'le mode En ligne est rappelé sur l’écran des maps');
    assert.ok(onlineIntro.querySelector('h2').textContent.includes('CHOISIS'),
      'le titre invite à choisir la map du salon');
    assertNineMaps(assert, page.node);
    assert.ok(page.node.querySelector('.mirage-start-button').textContent.includes('OUVRIR LES SALONS'),
      'le bouton En ligne ouvre le lobby après le choix de map');
  } finally {
    await page.unmount();
  }

  /* ------------- 5. Lien de défi : maps directes et verrouillées -------- */
  const code = encodeChallenge({ seed: 20260929, duration: 41.5, trace: [0, 240, 480, 800], name: 'Salim', stage: 'prairie' });
  const challenged = await mountPage(`/jeu?duel=${code}`);
  try {
    const intro = challenged.node.querySelector('.mirage-intro-overlay');
    assert.ok(intro, 'l’overlay d’intro est affiché sur un lien de défi');
    assert.ok(intro.classList.contains('is-stage-step'), 'un défi arrive directement sur l’écran des maps');
    assert.equal(modeButtons(challenged.node).length, 0, 'le défi ne repasse pas par l’écran des modes');
    assert.ok(intro.querySelector('.mirage-selected-mode-pill')?.textContent.includes('DUEL'),
      'le mode DUEL est rappelé sur le défi');
    const lockedMaps = assertNineMaps(assert, challenged.node);
    assert.ok(lockedMaps.every((card) => card.disabled),
      'les cartes de terrain sont verrouillées : le stage est imposé par le défi');
    await act(async () => { lockedMaps[0].click(); });
    assert.equal(lockedMaps.find((card) => card.getAttribute('aria-pressed') === 'true')
      ?.querySelector('.mirage-map-copy strong')?.textContent, 'Plaines d’Or',
    'la carte imposée par le défi est affichée comme sélectionnée');
    assert.ok(intro.textContent.includes('Stage imposé par le défi'),
      'l’encart précise que le stage est imposé');
    assert.ok(intro.querySelector('h2').textContent.includes('À TOI DE'),
      'le titre est en mode duel');
    const start = challenged.node.querySelector('.mirage-start-button');
    assert.ok(start, 'le bouton de lancement du défi est disponible sur l’écran des maps');
    assert.ok(start.textContent.includes('LANCER LE DUEL') || start.textContent.includes('CHARGEMENT'),
      'le bouton propose « LANCER LE DUEL » (ou l’attente du rendu 3D)');
    assert.ok(challenged.node.querySelector('.mirage-overlay-hint').textContent.includes('LE PLUS RAPIDE GAGNE'),
      'les consignes du duel sont révélées dès l’arrivée sur le lien');
    assert.ok(challenged.node.querySelector('.mirage-game-brand').textContent.includes('PLAINES D’OR'),
      'le stage du défi (ZONE 03 · Plaines d’Or) est bien appliqué');
  } finally {
    await challenged.unmount();
  }

  /* ------- 6. Piste de l'application : trois voies, deux rivaux -------- */
  setLaneCount(3);
  const app = await mountPage('/jeu');
  try {
    assert.equal(laneCount(), 3, 'la piste de l’app compte trois voies');
    const duelCard = modeButtons(app.node).find((button) => button.querySelector('strong')?.textContent === 'DUEL');
    assert.ok(duelCard.textContent.includes('Face aux 2 PNJ · 800 m'),
      'le bouton DUEL annonce deux PNJ et 800 m sur la piste à trois voies');
    await act(async () => { duelCard.click(); });
    const intro = app.node.querySelector('.mirage-intro-overlay');
    assert.ok(intro.textContent.includes('sur les 3 voies'),
      'l’overlay annonce une piste à trois voies');
    assert.ok(intro.textContent.includes('2 cavaliers rivaux IA (L’Ombre et Sauge)'),
      'deux rivaux entrent en piste à trois voies, Améthyste reste au vestiaire');
    assert.ok(app.node.querySelector('.mirage-overlay-hint').textContent.includes('3 CAVALIERS'),
      'le rappel de départ compte trois cavaliers (toi + deux rivaux)');
    const duelRules = [...app.node.querySelectorAll('.mirage-howto')]
      .find((section) => section.textContent.includes('MODE DUEL'));
    assert.ok(duelRules.textContent.includes('MODE DUEL · 3 CAVALIERS'),
      'le panneau des règles annonce trois cavaliers');
    assert.ok(duelRules.textContent.includes('2 cavaliers rivaux'),
      'le panneau des règles annonce deux rivaux');
  } finally {
    await app.unmount();
    setLaneCount(4);
  }
}
