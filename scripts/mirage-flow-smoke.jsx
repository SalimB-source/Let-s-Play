/**
 * Entrée SSR utilisée par scripts/mirage-flow-check.mjs — `npm run check:mirage-flow`.
 *
 * Vérifie le nouveau parcours d'entrée de Mirage Rush :
 *
 *   1. à l'arrivée, l'overlay affiche uniquement quatre vrais boutons de mode
 *      (RUÉE / DUEL / COUPE / EN LIGNE), sans maps ni bouton de lancement ;
 *   2. le clic sur RUÉE ou DUEL ouvre l'écran suivant, où les 9 maps et le
 *      bouton de lancement apparaissent ;
 *   3. le clic sur COUPE ouvre ce même écran, mais le choix de la map y est
 *      remplacé par celui de la coupe (Coupe du Désert : Dunes de l'Écho,
 *      Dust Creek, Plaines d'Or, dans cet ordre, et le barème des points) et
 *      « LANCER LA COUPE » ; un lien ?mode=cup y arrive directement ;
 *   4. un lien de défi ouvre directement l'écran des maps, verrouillé sur le
 *      terrain imposé ;
 *   5. le panneau latéral est regroupé dans PARAMÈTRES avec trois onglets :
 *      La communauté, Ton cavalier, Informations (les règles de la COUPE y
 *      figurent) ;
 *   6. le lobby EN LIGNE (?mode=online) garde sa barre de boutons de mode
 *      (RUÉE, DUEL, COUPE, EN LIGNE) : le bouton COUPE ramène à la coupe ;
 *   7. la piste de l'application (trois voies, `setLaneCount(3)`) fait suivre
 *      les textes : deux rivaux, « 3 CAVALIERS » et « sur les 3 voies » — et
 *      la coupe passe elle aussi à trois cavaliers (barème 10 / 7 / 4).
 *
 * Le déroulé complet d'une coupe (3 courses, points, trophée) est vérifié
 * par scripts/mirage-cup-smoke.jsx — `npm run check:mirage-cup`.
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

// Écran 02 du mode COUPE : la coupe remplace le choix de la map.
function assertCupIntro(assert, node) {
  const intro = node.querySelector('.mirage-intro-overlay');
  assert.ok(intro, 'l’overlay d’intro est affiché en mode coupe');
  assert.ok(intro.classList.contains('is-stage-step'), 'la coupe s’ouvre sur l’écran 02, celui du lancement');
  assert.ok(intro.querySelector('.mirage-selected-mode-pill')?.textContent.includes('COUPE'),
    'le mode COUPE est rappelé sur l’écran de la coupe');
  assert.ok(intro.querySelector('h2').textContent.includes('TROPHÉE'), 'le titre annonce le trophée');
  assert.equal(node.querySelectorAll('.mirage-stage-picker').length, 0,
    'le terrain est imposé par la coupe : plus de sélecteur de terrain');
  const cards = [...node.querySelectorAll('.mirage-cup-card')];
  assert.equal(cards.length, 1, 'une seule coupe pour l’instant');
  assert.equal(cards[0].getAttribute('aria-pressed'), 'true', 'la Coupe du Désert est sélectionnée');
  assert.equal(cards[0].querySelector('.mirage-cup-card-title strong')?.textContent, 'Coupe du Désert');
  assert.deepEqual(
    [...cards[0].querySelectorAll('.mirage-cup-stop strong')].map((el) => el.textContent),
    ['Dunes de l’Écho', 'Dust Creek', 'Plaines d’Or'],
    'la coupe enchaîne Dunes de l’Écho, Dust Creek puis Plaines d’Or, dans cet ordre');
  assert.deepEqual(
    [...cards[0].querySelectorAll('.mirage-cup-stop-number')].map((el) => el.textContent),
    ['COURSE 1', 'COURSE 2', 'COURSE 3']);
  assert.ok(node.querySelector('.mirage-cup-name-field input'), 'le nom du trophée est modifiable');
  const start = node.querySelector('.mirage-start-button');
  assert.ok(start.textContent.includes('LANCER LA COUPE') || start.textContent.includes('CHARGEMENT'),
    'le bouton propose « LANCER LA COUPE » (ou l’attente du rendu 3D)');
  assert.ok(node.querySelector('.mirage-game-brand').textContent.includes('DUNES DE L’ÉCHO'),
    'le bandeau de zone annonce la première course de la coupe');
  const hint = node.querySelector('.mirage-overlay-hint').textContent;
  assert.ok(hint.includes('3 COURSES') && hint.includes('1ᵉʳ 10 PTS'), 'la consigne rappelle les 3 courses et le barème');
  const keyPowerIcons = [...node.querySelectorAll('.mirage-keys-hint [data-power-icon]')].map((el) => el.getAttribute('data-power-icon'));
  assert.deepEqual(keyPowerIcons, ['shield', 'lasso', 'boost', 'pistol'], 'les pouvoirs du duel sont rappelés : ils servent aussi en coupe');
  return cards[0];
}

function cupPoints(card) {
  return [...card.querySelectorAll('.mirage-cup-points > span')].map((el) => el.textContent.replace(/\s+/g, ' ').trim());
}

export async function checkMirageFlow(assert) {
  /* ---------------- 1. Écran d'entrée : vrais boutons de mode ----------- */
  const page = await mountPage('/jeu');
  try {
    const intro = page.node.querySelector('.mirage-intro-overlay');
    assert.ok(intro, 'l’overlay d’intro est affiché');
    assert.ok(intro.classList.contains('is-mode-step'), 'l’arrivée se fait sur l’écran 01 des modes');

    assert.equal(page.node.querySelectorAll('.mirage-mode-tabs').length, 0,
      'la barre d’onglets (RUÉE / DUEL / COUPE / EN LIGNE) n’est pas revenue dans l’en-tête principal');

    const buttons = modeButtons(page.node);
    assert.equal(buttons.length, 4, 'quatre modes sont proposés');
    assert.deepEqual(
      buttons.map((button) => button.querySelector('strong')?.textContent),
      ['RUÉE', 'DUEL', 'COUPE', 'EN LIGNE'],
      'les modes RUÉE, DUEL, COUPE et EN LIGNE sont proposés',
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

    /* ------- 4 bis. Clic COUPE : la Coupe du Désert remplace les maps ---- */
    await act(async () => { page.node.querySelector('.mirage-secondary-button').click(); });
    await openMode(assert, page.node, 'COUPE');
    const cupCard = assertCupIntro(assert, page.node);
    assert.deepEqual(cupPoints(cupCard), ['1ᵉʳ 10 pts', '2ᵉ 7 pts', '3ᵉ 4 pts', '4ᵉ 2 pts'],
      'le barème des points est affiché, décroissant de la 1ʳᵉ à la 4ᵉ place');
    const cupIntro = page.node.querySelector('.mirage-intro-overlay');
    assert.ok(cupIntro.querySelector('.mirage-overlay-kicker').textContent.includes('COUPE · 3 COURSES · 4 CAVALIERS'),
      'la coupe se court à quatre cavaliers sur la piste à quatre voies');
    assert.ok(cupIntro.textContent.includes('contre L’Ombre, Sauge et Améthyste'),
      'les trois rivaux de la piste à quatre voies sont nommés');
    const cupRules = page.node.querySelector('#mirage-panel-info .mirage-cup-rules');
    assert.ok(cupRules, 'les règles de la coupe sont rangées dans Informations');
    assert.ok(cupRules.textContent.includes('MODE COUPE · 4 CAVALIERS'), 'le panneau des règles annonce quatre cavaliers en coupe');

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

  /* ------ 5 bis. ?mode=cup ouvre directement la Coupe du Désert ---------- */
  const cupPage = await mountPage('/jeu?mode=cup');
  try {
    assertCupIntro(assert, cupPage.node);
    assert.equal(modeButtons(cupPage.node).length, 0, 'le lien ?mode=cup ne repasse pas par l’écran des modes');
  } finally {
    await cupPage.unmount();
  }

  /* ------ 5 ter. Le lobby EN LIGNE garde ses boutons de mode, COUPE comprise ------ */
  const lobby = await mountPage('/jeu?mode=online');
  try {
    assert.ok(lobby.node.querySelector('.mirage-heading.has-mode-tabs'), 'l’en-tête du lobby porte sa barre de modes');
    const tabs = [...lobby.node.querySelectorAll('.mirage-mode-tabs .mirage-mode-tab')];
    const label = (tab) => tab.textContent.replace(tab.querySelector('span').textContent, '').trim();
    assert.deepEqual(tabs.map(label), ['RUÉE', 'DUEL', 'COUPE', 'EN LIGNE'], 'le lobby propose les quatre modes');
    assert.equal(label(tabs.find((tab) => tab.classList.contains('is-active'))), 'EN LIGNE', 'EN LIGNE est le bouton actif du lobby');
    await act(async () => { tabs.find((tab) => label(tab) === 'COUPE').click(); });
    assert.equal(lobby.node.querySelectorAll('.mirage-mode-tabs').length, 0, 'le bouton COUPE quitte le lobby pour la page du jeu');
    assertCupIntro(assert, lobby.node);
  } finally {
    await lobby.unmount();
  }

  /* ------------- 5 quater. Lien de défi : maps directes et verrouillées -------- */
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
    const threeLaneCup = modeButtons(app.node).find((button) => button.querySelector('strong')?.textContent === 'COUPE');
    assert.ok(threeLaneCup.textContent.includes('3 courses · 3 cavaliers'),
      'le bouton COUPE annonce trois cavaliers sur la piste à trois voies');
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

    // La coupe suit le duel : trois cavaliers, donc trois places au barème.
    await act(async () => { app.node.querySelector('.mirage-secondary-button').click(); });
    await openMode(assert, app.node, 'COUPE');
    const threeCupCard = assertCupIntro(assert, app.node);
    const threeCupIntro = app.node.querySelector('.mirage-intro-overlay');
    assert.ok(threeCupIntro.querySelector('.mirage-overlay-kicker').textContent.includes('COUPE · 3 COURSES · 3 CAVALIERS'),
      'le bandeau de la coupe compte trois cavaliers');
    assert.ok(threeCupIntro.textContent.includes('contre L’Ombre et Sauge'),
      'seuls L’Ombre et Sauge entrent en piste, comme en duel');
    assert.ok(!threeCupIntro.textContent.includes('Améthyste'), 'Améthyste reste au vestiaire');
    assert.deepEqual(cupPoints(threeCupCard), ['1ᵉʳ 10 pts', '2ᵉ 7 pts', '3ᵉ 4 pts'],
      'le barème s’arrête à la 3ᵉ place : il n’y a que trois cavaliers');
    const threeCupRules = app.node.querySelector('.mirage-cup-rules');
    assert.ok(threeCupRules.textContent.includes('MODE COUPE · 3 CAVALIERS'), 'le panneau des règles annonce trois cavaliers en coupe');
    assert.equal(threeCupRules.querySelectorAll('.mirage-cup-points-pill').length, 3, 'trois places au barème du panneau des règles');
  } finally {
    await app.unmount();
    setLaneCount(4);
  }
}
