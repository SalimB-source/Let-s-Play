// Vérification d'interface de la vie et des compteurs animés du Sablier.
//
// Rendu jsdom réel de `PlaqueVie` et `CompteurCarte`, puis lectures de la
// feuille : la plaque garde la valeur vraie pendant que le chiffre roule, le
// sable suit la part de vie, la réserve s'ouvre au-dessus du maximum
// d'origine, les grains tombent, la dernière Heure veille, et le mouvement
// réduit n'enlève que le geste — jamais l'information.
//
// Aperçu interactif (sans navigateur à installer) :
//   npm run preview:rpg-vie-compteurs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';

const apercu = process.argv.includes('--preview');

if (apercu) await lancerApercu();
else await verifier();

async function verifier() {
  const previousEnv = process.env.NODE_ENV;
  await build({
    logLevel: 'error',
    build: { ssr: 'scripts/rpg-vie-compteurs-smoke.jsx', outDir: 'node_modules/.cache/rpg-vie-compteurs', emptyOutDir: true },
  });
  // `build()` force NODE_ENV=production dans CE processus : React chargerait sa
  // version de production, sans `act`. On restaure la valeur d'origine.
  if (previousEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousEnv;

  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/jeu/sablier-de-bab-el',
    pretendToBeVisual: true,
  });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  try {
    const { checkRpgVieCompteurs } = await import('../node_modules/.cache/rpg-vie-compteurs/rpg-vie-compteurs-smoke.js');
    await checkRpgVieCompteurs(assert);
  } finally {
    dom.window.close();
  }

  const composant = readFileSync(new URL('../src/games/RpgVieCompteurs.jsx', import.meta.url), 'utf8');
  const feuille = readFileSync(new URL('../src/games/rpg-vie-compteurs.css', import.meta.url), 'utf8');

  // ── La feuille : le sable reste local, les couleurs ne se confondent pas ───
  assert.match(feuille, /\.rpg-jauge-vie__nappe\s*\{[^}]*pointer-events:\s*none;/s,
    'la nappe de sable ne capte aucun geste');
  assert.match(feuille, /\.rpg-jauge-vie__sable\s*\{[^}]*height:\s*calc\(var\(--rpg-jauge-part, 1\) \* 100%\);/s,
    'la hauteur du sable est pilotée par la part de vie');
  assert.match(feuille, /\.rpg-jauge-vie__reserve\s*\{[^}]*background:\s*linear-gradient\(180deg, rgba\(255, 219, 133/s,
    'la réserve est dorée : elle ne se confond pas avec le sable');
  assert.doesNotMatch(feuille, /@media[^{]*max-width/,
    'aucune requête de largeur : la feuille vaut pour tous les écrans');
  assert.match(feuille, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.rpg-jauge-vie__grain \{ display: none; \}/,
    'les grains ne tombent plus en mouvement réduit');
  assert.doesNotMatch(composant, /setInterval/, 'aucune minuterie qui tourne en boucle');

  console.log('✓ Vie et compteurs : la plaque garde la valeur vraie pendant que le chiffre roule, le sable suit la part de vie, la réserve s’ouvre en or au-dessus de 25, six grains tombent à chaque perte, la jauge veille à 5 PV — et la dernière Heure se fêle dans son losange. En mouvement réduit, tout s’arrête sauf l’information.');
}

/* ══ Aperçu interactif ══════════════════════════════════════════════════════
   `npm run preview:rpg-vie-compteurs` sert une page de démonstration sur le
   port 5173 : toutes les plaques d'état, les compteurs, et des boutons pour
   encaisser, soigner et égrener une Heure — voir les gestes dans le vrai
   navigateur, sans lancer une partie. Aucun navigateur à installer. */

const APERCU_CSS = `
:root { color-scheme: dark; }
html, body { margin: 0; background: #0d0a07; color: #efe3cc; font-family: system-ui, sans-serif; }
main { display: grid; gap: 18px; padding: 26px; max-width: 1180px; margin: 0 auto; }
h1 { margin: 0 0 8px; font: 800 24px/1.2 Georgia, serif; letter-spacing: .01em; }
h1 em { color: #ffd87a; font-style: normal; }
header p { margin: 0 0 8px; color: #c9b18a; font-size: 14px; line-height: 1.6; max-width: 900px; }
.note { color: #9c8a6d; font-size: 12.5px; line-height: 1.5; }
.grille { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; align-items: start; }
.scenario { background: linear-gradient(180deg, #1b140d, #14100b); border: 1px solid #3d2c16; border-radius: 12px; padding: 16px; }
.scenario h2 { margin: 0 0 14px; font: 700 11px/1.2 system-ui, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: #d9a441; }
.essai { grid-column: 1 / -1; }
.essai .plaque { margin-bottom: 14px; }
.plaque {
  position: relative; display: grid; grid-template-columns: 42px minmax(0, 1fr) auto;
  grid-template-rows: auto auto auto; gap: 3px 8px; width: 204px; min-height: 84px;
  padding: 9px; border: 1px solid rgba(226, 190, 119, .58); border-radius: 13px;
  background: linear-gradient(135deg, rgba(18, 15, 16, .92), rgba(10, 11, 17, .75));
  box-shadow: 0 6px 18px rgba(0, 0, 0, .44), inset 0 1px rgba(255, 255, 255, .09);
}
.avatar { grid-column: 1; grid-row: 1 / 4; width: 42px; height: 42px; align-self: center; border-radius: 9px;
  background: linear-gradient(160deg, #3a2a18, #120d08); }
.ident { grid-column: 2; grid-row: 1; display: grid; gap: 2px; }
.ident strong { color: #fff0cf; font: 800 10px/1.1 system-ui, sans-serif; letter-spacing: .11em; }
.ident small { color: #cbb993; font: 500 8px/1.1 Georgia, serif; }
.zones { grid-column: 2 / 4; grid-row: 3; color: rgba(230, 218, 190, .8); font: 600 8px/1.2 monospace; }
.rpg-wizard-plate__pv { grid-column: 3; grid-row: 1 / 3; align-self: center; display: flex; align-items: center;
  gap: 5px; color: #ffe6a2; font: 800 18px/1 Georgia, serif; white-space: nowrap; }
.rpg-wizard-plate__hp-icon--shield { display: none; }
.rpg-wizard-plate__hp-icon--heart { display: inline-block; color: #f06468; font-size: .9em;
  line-height: 1; text-shadow: 0 0 7px rgba(240, 100, 104, .52); }
.rpg-wizard-plate__hp-max { margin-inline-start: .08em; color: rgba(255, 230, 162, .7); font: 600 .58em/1 monospace;
  vertical-align: super; }
.rpg-wizard-plate__shield-value { margin-inline-start: .25em; }
.cartes { display: flex; gap: 30px; align-items: center; margin-top: 12px; }
.mini { position: relative; width: 110px; height: 154px; border-radius: 8px; border: 1px solid #6b4a22;
  background: linear-gradient(160deg, #3a2b1a, #1a120b); }
.mini .rpg-card__compteurs { position: absolute; top: 12px; left: 12px; display: flex; gap: 8px; }
.rpg-card__compteur { display: grid; place-items: center; width: 20px; aspect-ratio: 1; border-radius: 3px;
  border: 1px solid #eacb83; background: linear-gradient(145deg, #665127, #322513); transform: rotate(45deg);
  box-shadow: 0 1px 4px rgba(0, 0, 0, .8), inset 0 1px rgba(255, 255, 255, .22); }
.rpg-card__compteur > span { color: #fff4d0; font: 900 11px/1 system-ui, sans-serif; transform: rotate(-45deg); }
.rpg-card__compteur--heures { border-color: #b3d8f3; background: linear-gradient(145deg, #426888, #1c344e); }
.rpg-card__compteur--heures > span { color: #e8f6ff; }
.boutons { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 4px; }
.boutons button { padding: 8px 14px; border-radius: 9px; border: 1px solid #d9a441; color: #ffe4ad;
  background: rgba(217, 164, 65, .14); font: 600 13px/1 system-ui, sans-serif; cursor: pointer; }
.boutons button:hover { background: rgba(217, 164, 65, .26); }
@media (prefers-reduced-motion: reduce) {
  .scenario::after { content: 'Mouvement réduit actif : les gestes sont éteints, l’information reste.';
    display: block; margin-top: 12px; color: #9c8a6d; font-size: 12px; }
}
`;

async function lancerApercu() {
  const server = await createServer({
    base: '/',
    // `allowedHosts: true` : l'aperçu accepte le domaine public de la prévisualisation.
    server: { host: '0.0.0.0', port: 5173, allowedHosts: true },
    plugins: [{
      name: 'rpg-vie-compteurs-apercu',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url !== '/') return next();
          res.setHeader('Content-Type', 'text/html');
          server.transformIndexHtml('/__rpg-vie-apercu',
            '<!doctype html><html lang="fr"><head><meta charset="utf-8">'
            + '<meta name="viewport" content="width=device-width, initial-scale=1">'
            + '<title>Le Sablier — vie et compteurs</title><style>' + APERCU_CSS + '</style></head>'
            + '<body><div id="root"></div>'
            + '<script type="module" src="/scripts/rpg-vie-compteurs-apercu.jsx"></script></body></html>')
            .then((html) => res.end(html));
        });
      },
    }],
  });
  await server.listen();
  server.printUrls();
}
