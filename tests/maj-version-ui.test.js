/**
 * Le panneau de mise à jour, monté pour de vrai.
 *
 * Les règles (comparaison d'identités, veille, URL de rechargement) sont tenues
 * par `tests/maj-version.test.js`. Ici on vérifie ce que le joueur voit : le
 * panneau apparaît quand la veille signale un build plus récent, « Plus tard »
 * le range en pastille sans toucher à la page, et la pastille le rouvre.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

function installerDom() {
  const dom = new JSDOM('<!doctype html><html lang="fr"><body></body></html>', {
    url: 'https://let-s-play-nu.vercel.app/jeu/sablier-de-bab-el',
    pretendToBeVisual: true,
  });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Element = dom.window.Element;
  globalThis.Node = dom.window.Node;
  globalThis.Event = dom.window.Event;
  globalThis.MouseEvent = dom.window.MouseEvent;
  return dom;
}

test('le panneau s’ouvre sur une nouvelle version et « Plus tard » le range en pastille', async () => {
  const dom = installerDom();
  const conteneur = document.createElement('div');
  document.body.appendChild(conteneur);
  const racine = createRoot(conteneur);

  // Une veille de test : elle signale un build, et retient son arrêt.
  let arretDemande = false;
  let optionsRecues = null;
  const veille = (options) => {
    optionsRecues = options;
    queueMicrotask(() => options.onNouvelleVersion({ buildId: 'abcdef123456', builtAt: '2026-10-29T14:23:06.000Z' }));
    return () => { arretDemande = true; };
  };

  const vite = await createServer({
    server: { middlewareMode: true },
    ssr: { external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const { default: MiseAJourDisponible } = await vite.ssrLoadModule('/src/components/MiseAJourDisponible.jsx');

    await act(async () => {
      racine.render(React.createElement(MiseAJourDisponible, { veille, dev: false, baseUrl: '/' }));
    });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    assert.ok(optionsRecues, 'la veille est démarrée hors développement');
    assert.equal(optionsRecues.baseUrl, '/', 'version.json est lu à la racine du site');

    const panneau = conteneur.querySelector('.maj-site');
    assert.ok(panneau, 'le panneau apparaît');
    assert.equal(panneau.getAttribute('role'), 'dialog');
    assert.equal(panneau.getAttribute('aria-modal'), 'true');
    assert.match(conteneur.querySelector('#maj-site-titre').textContent, /nouvelle version/i);
    assert.match(conteneur.textContent, /29 octobre 2026/, 'la date de publication est affichée quand elle est connue');

    const boutons = [...conteneur.querySelectorAll('button')].map((b) => b.textContent.trim());
    assert.deepEqual(boutons, ['Recharger maintenant', 'Plus tard']);

    // Échap vaut « Plus tard » : on ne reste pas coincé sous le panneau.
    await act(async () => {
      window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
    });
    assert.equal(conteneur.querySelector('.maj-site'), null, 'Échap range le panneau');
    assert.ok(conteneur.querySelector('.maj-site__pastille'), 'Échap laisse la pastille');

    // La pastille rouvre, et le bouton referme.
    await act(async () => { conteneur.querySelector('.maj-site__pastille').click(); });
    assert.ok(conteneur.querySelector('.maj-site__panneau'), 'la pastille rouvre le panneau');

    // « Plus tard » : le panneau se range, la page ne bouge pas.
    const plusTard = [...conteneur.querySelectorAll('button')].find((b) => b.textContent.includes('Plus tard'));
    await act(async () => { plusTard.click(); });

    assert.equal(conteneur.querySelector('.maj-site'), null, 'le panneau se referme');
    const pastille = conteneur.querySelector('.maj-site__pastille');
    assert.ok(pastille, 'une pastille discrète reste, pour ne pas oublier la mise à jour');
    assert.equal(document.querySelector('.maj-site__panneau'), null);

    // La pastille rouvre le panneau.
    await act(async () => { pastille.click(); });
    assert.ok(conteneur.querySelector('.maj-site__panneau'), 'la pastille rouvre le panneau');
  } finally {
    await act(async () => { racine.unmount(); });
    await vite.close();
    assert.equal(arretDemande, true, 'démonter le panneau arrête la veille');
    dom.window.close();
  }
});
