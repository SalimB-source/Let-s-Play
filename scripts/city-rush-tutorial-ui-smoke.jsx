import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext';
import ViceCityRushPage from '../src/games/ViceCityRushPage';
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

  try {
    const walletBefore = squash(mustFind(node, '.city-rush-wallet', 'portefeuille initial').textContent);
    const launch = mustFind(node, '.city-rush-tutorial-launch', 'lancement du tour guidé depuis le menu');
    await click(launch);
    assert.ok(node.querySelector('.city-rush-countdown'), 'le tutoriel lance une vraie course');
    assert.equal(worldProbe.props.raceFormat, 'laps');
    assert.equal(worldProbe.props.raceLaps, 1, 'la course d’entraînement dure un tour');
    assert.equal(worldProbe.props.racePoliceFromStart, true, 'la police est présente dès le départ pour la leçon');
    assert.equal(worldProbe.props.tutorialMode, true, 'le moteur active les rencontres garanties du tutoriel');
    assert.equal(worldProbe.props.cityId, 'vice-city');
    assert.equal(worldProbe.props.roster.filter((racer) => racer.isPlayer).length, 1, 'la route est un entraînement solo');
    assert.ok(node.querySelector('.city-rush-page.is-tutorial'));

    // Le compte à rebours réel de la page (3, 2, 1, GO) ouvre le coach au-dessus
    // du circuit vivant. Il ne capture ni les flèches de conduite ni P.
    for (let tick = 0; tick < 4; tick += 1) await settle(850);
    let panel = mustFind(node, '.cr-tutorial-layer.is-in-game:not([hidden]) .cr-tutorial-panel[role="region"]', 'coach intégré au circuit');
    assert.equal(node.querySelectorAll('.cr-tutorial-progress-segment').length, 10);
    assert.match(squash(panel.textContent), /Change de voie, sans lever le pied/);
    assert.ok(node.querySelector('.city-rush-world-stub[data-phase="playing"]'), 'la course réelle tourne sous le coach');

    const arrow = new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    await act(async () => window.dispatchEvent(arrow));
    assert.equal(arrow.defaultPrevented, false, 'les flèches ne sont pas détournées par le tutoriel');
    assert.match(squash(panel.textContent), /Change de voie, sans lever le pied/);

    await click(mustFind(node, '.cr-tutorial-nav-button.is-next', 'avancer manuellement dans la leçon'));
    panel = mustFind(node, '.cr-tutorial-layer:not([hidden]) .cr-tutorial-panel', 'étape suivante');
    assert.match(squash(panel.textContent), /La ligne propre récompense la patience/);
    await click(mustFind(node, '.cr-tutorial-nav-button.is-playback', 'suspendre les conseils sans arrêter la voiture'));
    assert.match(squash(panel.textContent), /REPRENDRE/);

    await click(node.querySelectorAll('.cr-tutorial-progress-segment')[4]);
    panel = mustFind(node, '.cr-tutorial-layer:not([hidden]) .cr-tutorial-panel', 'accès direct à la leçon Bazooka');
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
    panel = mustFind(node, '.cr-tutorial-layer:not([hidden]) .cr-tutorial-panel', 'guide rouvert à la même étape');
    assert.match(squash(panel.textContent), /Traverse le conteneur jaune/);

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
    const cancel = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    await act(async () => window.dispatchEvent(cancel));
    assert.ok(node.querySelector('.city-rush-intro'), 'Échap annule le compte à rebours et revient au menu');
    assert.equal(node.querySelector('.city-rush-page.is-tutorial'), null);
  } finally {
    await act(async () => root.unmount());
    node.remove();
  }
}
