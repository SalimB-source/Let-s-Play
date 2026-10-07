import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext';
import ViceCityRushPage from '../src/games/ViceCityRushPage';

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
    const launch = mustFind(node, '.city-rush-tutorial-launch', 'lancement du tutoriel depuis le menu');
    await click(launch);
    let dialog = mustFind(node, '[role="dialog"][aria-modal="true"]', 'fenêtre du tutoriel');
    assert.equal(node.querySelectorAll('.cr-tutorial-progress-segment').length, 10);
    assert.match(squash(dialog.textContent), /Change de voie, sans lever le pied/);

    const rightArrow = new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    await act(async () => dialog.dispatchEvent(rightArrow));
    dialog = mustFind(node, '[role="dialog"]', 'étape suivante au clavier');
    assert.match(squash(dialog.textContent), /La ligne propre récompense la patience/);

    await click(mustFind(node, '.cr-tutorial-nav-button.is-playback', 'pause automatique'));
    assert.match(squash(dialog.textContent), /REPRENDRE/);
    await click(node.querySelectorAll('.cr-tutorial-progress-segment')[4]);
    dialog = mustFind(node, '[role="dialog"]', 'accès direct au tutoriel Bazooka');
    assert.match(squash(dialog.textContent), /Traverse le conteneur jaune/);
    assert.match(squash(dialog.textContent), /BOUTON JAUNE/);

    const close = mustFind(node, '.cr-tutorial-close', 'fermer le tutoriel');
    await click(close);
    assert.equal(node.querySelector('[role="dialog"]'), null);
    assert.ok(node.querySelector('.city-rush-mode-picker'), 'le menu de course reste ouvert après fermeture');

    await click(launch);
    dialog = mustFind(node, '[role="dialog"]', 'réouverture du tutoriel');
    const escape = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    await act(async () => dialog.dispatchEvent(escape));
    assert.equal(node.querySelector('[role="dialog"]'), null, 'Échap ferme le guide sans démarrer la course');
  } finally {
    await act(async () => root.unmount());
    node.remove();
  }
}
