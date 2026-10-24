/**
 * Envol et Overkill du Maître restent visibles, grisés avant Furie et dorés
 * une fois les gains réellement portés par la créature.
 * node scripts/rpg-furie-icones-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const iconesCss = readFileSync(new URL('../src/games/effet-icons.css', import.meta.url), 'utf8');

const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: {
    ssr: 'scripts/rpg-furie-icones-smoke.jsx',
    outDir: 'node_modules/.cache/rpg-furie-icones',
    emptyOutDir: true,
  },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const { rendreIconesFurie } = await import('../node_modules/.cache/rpg-furie-icones/rpg-furie-icones-smoke.js');
const { window } = new JSDOM(`<!doctype html><html><body>${rendreIconesFurie()}</body></html>`);
const document = window.document;
const cas = (nom) => document.querySelector(`[data-cas="${nom}"]`);

try {
  const verifier = (nom, type, attendus) => {
    const racine = cas(nom);
    assert.ok(racine, `${nom} est rendu`);
    for (const cle of ['envol', 'overkill']) {
      const selecteur = type === 'badge'
        ? `.rpg-card-icone[data-effet="${cle}"]`
        : `.rpg-pastille[data-pastille="${cle}"]`;
      const icone = racine.querySelector(selecteur);
      assert.ok(icone, `${nom} : ${cle} reste visible`);
      const inactif = attendus.includes(cle);
      assert.equal(icone.classList.contains('is-inactif'), inactif,
        `${nom} : ${cle} ${inactif ? 'attend' : 'a rejoint'} son état actif`);
      assert.equal(icone.getAttribute('data-effet-inactif'), inactif ? 'true' : null,
        `${nom} : l’état de ${cle} est explicite`);
      assert.equal(icone.classList.contains('is-epuisee'), false,
        `${nom} : un gain conditionnel n’est pas un effet dépensé`);
    }
  };

  verifier('main', 'badge', ['envol', 'overkill']);
  verifier('catalogue', 'pastille', ['envol', 'overkill']);
  verifier('normal-preview', 'pastille', ['envol', 'overkill']);
  verifier('normal-table', 'badge', ['envol', 'overkill']);
  verifier('furie-preview', 'pastille', []);
  verifier('furie-table', 'badge', []);
  verifier('partiel-table', 'badge', ['overkill']);

  assert.match(cas('normal-table').querySelector('.rpg-card-icones')?.getAttribute('aria-label') ?? '',
    /Envol \(furie\) \(Furie non active\).*Overkill \(furie\) \(Furie non active\)/,
    'la lecture accessible annonce aussi l’attente de Furie');
  assert.doesNotMatch(cas('furie-table').querySelector('.rpg-card-icones')?.getAttribute('aria-label') ?? '',
    /Furie non active/, 'cette mention disparaît une fois les gains actifs');
  assert.equal(cas('normal-preview').querySelector('.rpg-hover-card-preview')?.getAttribute('data-effets-inactifs'),
    'envol overkill', 'la preview expose les deux gains en attente');
  assert.equal(cas('furie-preview').querySelector('.rpg-hover-card-preview')?.getAttribute('data-effets-inactifs'), null,
    'et les retire quand sa Furie est déclenchée');
} finally {
  window.close();
}

assert.match(iconesCss, /\.rpg-pastille\.is-inactif\s*\{[^}]*filter:\s*grayscale\(1\);/s,
  'les pastilles conditionnelles ont bien un traitement gris');
assert.match(iconesCss, /\.rpg-card-icone\.is-inactif\s*\{[^}]*filter:\s*grayscale\(1\);/s,
  'les badges de la table et de la main partagent ce traitement');

console.log('✓ Icônes de Furie : Envol et Overkill restent grisés dans la main, le catalogue, la preview et sur la table tant que le Maître ne les porte pas ; ils retrouvent leur couleur dès leur activation, indépendamment l’un de l’autre.');
