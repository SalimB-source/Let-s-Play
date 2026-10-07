import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext';
import ViceCityRushPage from '../src/games/ViceCityRushPage';
import { dismissTitleMenu } from './vice-city-title-menu-dismiss.jsx';
import { worldProbe } from './vice-city-world-stub.jsx';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const squash = (value) => String(value ?? '').replace(/[\s\u202f\u00a0]+/g, ' ').trim();
const click = (element) => act(async () => { element.click(); });
const settle = (ms = 20) => act(async () => { await sleep(ms); });

function mustFind(node, selector, label) {
  const element = node.querySelector(selector);
  if (!element) throw new Error(`élément introuvable : ${selector} (${label})`);
  return element;
}

const coachPanel = (node) => mustFind(
  node,
  '.cr-tutorial-layer.is-in-game:not([hidden]) .cr-tutorial-panel[role="region"]',
  'coach intégré au circuit',
);
const tutorialEvent = (event) => act(async () => { worldProbe.props.onTutorial(event); });
const lessonComplete = (index, success) => tutorialEvent({
  type: 'lesson-complete', index, id: null, label: null, success, total: 10, elapsed: 8 + index * 6,
});
const lessonStart = (index, police) => tutorialEvent({
  type: 'lesson-start', index, id: null, label: null, total: 10, police, elapsed: 8 + index * 6,
});

export async function checkCityRushTutorialUi(assert) {
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node);
  await act(async () => root.render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/jeu/vice-city-rush']}>
        <ViceCityRushPage />
      </MemoryRouter>
    </AuthProvider>,
  ));
  await settle(35);
  await dismissTitleMenu(node);

  try {
    const walletBefore = squash(mustFind(node, '.city-rush-wallet', 'portefeuille initial').textContent);
    const launch = mustFind(node, '.city-rush-tutorial-launch', 'lancement du tour guidé depuis le menu');
    await click(launch);
    assert.ok(node.querySelector('.city-rush-countdown'), 'le tutoriel lance une vraie course');
    assert.equal(worldProbe.props.raceFormat, 'laps');
    assert.equal(worldProbe.props.raceLaps, 1, 'la course d’entraînement dure un tour');
    assert.equal(
      worldProbe.props.racePoliceFromStart, false,
      'la route reste vide de police : l’escouade n’entre qu’à la leçon des tirs',
    );
    assert.equal(worldProbe.props.tutorialMode, true, 'le moteur joue lui-même les mini-tutos');
    assert.equal(worldProbe.props.cityId, 'vice-city');
    assert.equal(worldProbe.props.roster.filter((racer) => racer.isPlayer).length, 1, 'la route est un entraînement solo');
    assert.ok(node.querySelector('.city-rush-page.is-tutorial'));

    // Le compte à rebours réel de la page (3, 2, 1, GO) ouvre le coach au-dessus
    // du circuit vivant. Il ne capture ni les flèches de conduite ni P.
    for (let tick = 0; tick < 4; tick += 1) await settle(850);
    let panel = coachPanel(node);
    assert.equal(node.querySelectorAll('.cr-tutorial-progress-segment').length, 10);
    assert.match(squash(panel.textContent), /Change de voie, sans lever le pied/);
    assert.match(squash(panel.textContent), /EN DIRECT/);
    assert.match(squash(panel.textContent), /DÉMONSTRATION 1 EN COURS/, 'la démonstration annonce la leçon jouée');
    assert.match(squash(panel.textContent), /ROUTE SANS POLICE/, 'aucune berline avant la leçon des tirs');
    assert.ok(node.querySelector('.city-rush-world-stub[data-phase="playing"]'), 'la course réelle tourne sous le coach');

    const arrow = new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    await act(async () => window.dispatchEvent(arrow));
    assert.equal(arrow.defaultPrevented, false, 'les flèches ne sont pas détournées par le tutoriel');
    assert.match(squash(panel.textContent), /Change de voie, sans lever le pied/);

    // Le moteur annonce la leçon réussie en piste : le tic vert tombe, le coach
    // passe tout seul à la leçon suivante.
    await lessonComplete(0, 'CHANGEMENT DE VOIE RÉUSSI');
    await lessonStart(1, false);
    panel = coachPanel(node);
    const firstSegment = node.querySelectorAll('.cr-tutorial-progress-segment')[0];
    assert.ok(firstSegment.classList.contains('is-done'), 'la leçon réussie porte son tic vert');
    assert.equal(squash(firstSegment.querySelector('b')?.textContent), '✓');
    assert.match(squash(panel.textContent), /CHANGEMENT DE VOIE RÉUSSI/);
    assert.match(squash(panel.textContent), /1 \/ 10/);
    assert.match(squash(panel.textContent), /La ligne propre récompense la patience/, 'la 2e démo s’est lancée');
    assert.match(squash(panel.textContent), /EN DIRECT/);

    // Feuilleter les fiches ne change pas la leçon jouée : PRÉCÉDENT revient sur
    // la leçon réussie, REVENIR AU DIRECT ramène à la démonstration en cours.
    await click(mustFind(node, '.cr-tutorial-nav-button.is-quiet', 'feuilleter la leçon précédente'));
    panel = coachPanel(node);
    assert.match(squash(panel.textContent), /Change de voie, sans lever le pied/);
    assert.match(squash(panel.textContent), /DÉJÀ RÉUSSIE/);
    await click(mustFind(node, '.cr-tutorial-nav-button.is-playback', 'revenir à la démonstration'));
    panel = coachPanel(node);
    assert.match(squash(panel.textContent), /La ligne propre récompense la patience/);
    assert.match(squash(panel.textContent), /EN DIRECT/);

    await click(mustFind(node, '.cr-tutorial-nav-button.is-next', 'feuilleter la leçon suivante'));
    panel = coachPanel(node);
    assert.match(squash(panel.textContent), /À VENIR/);

    await click(node.querySelectorAll('.cr-tutorial-progress-segment')[4]);
    panel = coachPanel(node);
    assert.match(squash(panel.textContent), /Traverse le conteneur jaune/);
    assert.match(squash(panel.textContent), /BOUTON JAUNE/);

    const pause = new window.KeyboardEvent('keydown', { key: 'p', bubbles: true, cancelable: true });
    await act(async () => window.dispatchEvent(pause));
    assert.ok(node.querySelector('.city-rush-pause-overlay'), 'P suspend le jeu, pas le contrôle du coach');
    assert.equal(pause.defaultPrevented, true);
    await click(mustFind(node, '.city-rush-top-button.is-resume', 'reprendre le tour guidé'));
    assert.ok(node.querySelector('.city-rush-world-stub[data-phase="playing"]'));

    await click(mustFind(node, '.cr-tutorial-close', 'masquer le coach sans quitter la course'));
    assert.ok(node.querySelector('.city-rush-tutorial-guide-toggle'), 'le guide peut être rouvert depuis la barre de jeu');
    assert.ok(mustFind(node, '.cr-tutorial-layer', 'le coach reste monté pour conserver l’étape').hidden);
    await click(mustFind(node, '.city-rush-tutorial-guide-toggle', 'rouvrir le coach'));
    panel = coachPanel(node);
    assert.match(squash(panel.textContent), /Traverse le conteneur jaune/);

    // La leçon des tirs fait entrer l'escouade : le bandeau passe au rouge.
    await lessonStart(2, true);
    panel = coachPanel(node);
    assert.match(squash(panel.textContent), /POLICE EN PISTE/, 'la police entre en piste pour la leçon des tirs');

    // Toutes les leçons réussies, puis la fin du tour guidé : dix tics verts.
    await tutorialEvent({ type: 'lesson-start', index: 9, id: null, label: null, total: 10, police: true, elapsed: 60 });
    for (let index = 1; index < 10; index += 1) await lessonComplete(index, `RÉUSSITE ${index}`);
    await tutorialEvent({ type: 'complete', total: 10, elapsed: 66, score: 900 });
    panel = coachPanel(node);
    assert.equal(
      node.querySelectorAll('.cr-tutorial-progress-segment.is-done').length, 10,
      'les dix mini-tutos finissent par un tic vert',
    );
    assert.match(squash(panel.textContent), /GUIDE TERMINÉ/);
    assert.match(squash(panel.textContent), /MASQUER LE COACH/);

    await act(async () => worldProbe.props.onFinish({
      city: 'vice-city',
      rank: 1,
      duration: 65,
      score: 1200,
      pickups: 3,
      laps: 1,
      winner: 'TOI',
      destroyed: false,
      timedOut: false,
      sprint: false,
    }));
    assert.match(squash(node.textContent), /TUTORIEL EN COURSE · TERMINÉ/);
    assert.match(squash(node.textContent), /LES BASESSONT LÀ/);
    assert.equal(node.querySelector('.city-rush-cash-reward'), null, 'aucun billet n’est attribué pour le tour d’entraînement');
    assert.equal(node.querySelector('.city-rush-next-race-button'), null, 'le solo guidé ne débloque pas la course suivante');
    assert.equal(squash(mustFind(node, '.city-rush-wallet', 'portefeuille après tutoriel').textContent), walletBefore);

    const replay = [...node.querySelectorAll('.city-rush-start-button')]
      .find((button) => /REJOUER LE TUTORIEL/.test(squash(button.textContent)));
    assert.ok(replay, 'le résultat permet de rejouer le tour guidé');
    await click(replay);
    assert.ok(node.querySelector('.city-rush-countdown'));
    // Nouveau tour : le coach repart de la première démo, sans tic vert.
    assert.equal(node.querySelectorAll('.cr-tutorial-progress-segment.is-done').length, 0);
    const cancel = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    await act(async () => window.dispatchEvent(cancel));
    assert.ok(node.querySelector('.city-rush-intro'), 'Échap annule le compte à rebours et revient au menu');
    assert.equal(node.querySelector('.city-rush-page.is-tutorial'), null);
  } finally {
    await act(async () => root.unmount());
    node.remove();
  }
}
