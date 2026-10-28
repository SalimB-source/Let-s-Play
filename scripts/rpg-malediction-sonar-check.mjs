/**
 * Le sonar violet de la Malédiction.
 * node scripts/rpg-malediction-sonar-check.mjs
 *
 * Même calque que la résonance et que l'aura — trois ondes qui dépassent le
 * cadre et s'effacent, un liseré qui reste allumé, une phase par entité — mais
 * teinté de violet pour que la source d'un MALUS se lise à sa couleur, comme
 * celle d'un bonus se lit en jaune. Le contrôle tient quatre choses : le calque
 * n'apparaît QUE sur la carte qui imprime la Malédiction (jamais sur une
 * créature maudite), c'est exactement le calque de la résonance avec sa
 * variante violette, il hérite du même débordement et du même mouvement réduit,
 * et la règle de camp entier reste écrite dans le moteur.
 *
 * Aperçu interactif (sans navigateur à installer) :
 *   npm run preview:rpg-malediction-sonar
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build, createServer } from 'vite';
import { JSDOM } from 'jsdom';
import { RPG_DUEL_CARDS, cardById } from '../src/games/rpgCards.js';

const apercu = process.argv.includes('--preview');

if (apercu) await lancerApercu();
else await verifier();

async function verifier() {
  // ── 0. Le rendu réel : une carte maudite, un calque violet ────────────────
  const previousEnv = process.env.NODE_ENV;
  await build({
    logLevel: 'error',
    build: { ssr: 'scripts/rpg-resonance-smoke.jsx', outDir: 'node_modules/.cache/rpg-malediction-sonar', emptyOutDir: true },
  });
  // `build()` force NODE_ENV=production dans CE processus : React chargerait sa
  // version de production. On restaure la valeur d'origine.
  if (previousEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousEnv;

  const { rendreCartes } = await import('../node_modules/.cache/rpg-malediction-sonar/rpg-resonance-smoke.js');
  const rendu = rendreCartes();

  assert.deepEqual(rendu.malediction.carte?.malediction, { atk: 2, def: 0 },
    'La Barbe Noire imprime la Malédiction -2/-0');
  assert.equal(rendu.maledictionNeutre.carte?.malediction, undefined,
    'le Fennec des décombres ne l’imprime pas');

  const carteDom = (html) => {
    const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
    return { dom, racine: dom.window.document.querySelector('.rpg-card') };
  };

  {
    const { dom, racine } = carteDom(rendu.malediction.html);
    try {
      assert.ok(racine.classList.contains('has-malediction'),
        'la carte qui imprime la Malédiction porte la classe de la Malédiction');
      assert.equal(racine.classList.contains('has-aura'), false,
        'une Malédiction n’est pas une aura : la classe jaune reste au jaune');
      assert.equal(racine.classList.contains('has-resonance'), false,
        'et pas une résonance : la classe bleue reste au bleu');
      const calque = racine.querySelector('.rpg-card__resonance--malediction');
      assert.ok(calque, 'le calque de sonar est rendu, dans sa variante violette');
      assert.equal(calque, racine.querySelector('.rpg-card__resonance'),
        'c’est le même calque que la résonance, pas un second effet');
      assert.equal(calque.getAttribute('aria-hidden'), 'true',
        'le calque est décoratif : la Malédiction est déjà dans l’icône et dans la description lue');
      assert.equal(calque.querySelectorAll('.rpg-card__resonance-onde').length, 3,
        'trois ondes naissent du cœur de la carte');
      assert.match(calque.getAttribute('style') ?? '', /--rpg-resonance-phase:-?\d+\.\d+s/,
        'la phase du sonar est posée par carte');
      const img = racine.querySelector('.rpg-card__img');
      assert.equal(img.nextElementSibling, calque, 'le calque se glisse juste après l’illustration');
    } finally {
      dom.window.close();
    }
  }

  {
    const { dom, racine } = carteDom(rendu.maledictionNeutre.html);
    try {
      assert.equal(racine.classList.contains('has-malediction'), false,
        'une créature maudite ne porte pas le calque de la source');
      assert.equal(racine.querySelector('.rpg-card__resonance'), null,
        'même avec `entite.maledictionBonus = -2`, aucune onde n’est rendue');
    } finally {
      dom.window.close();
    }
  }

  // ── 1. Qui la porte : la carte qui imprime la Malédiction, et elle seule ──
  const lire = (nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8');
  const battleCss = lire('rpg-battle.css');
  const duel = lire('RpgDuelPage.jsx');

  const sources = RPG_DUEL_CARDS.filter((carte) => carte.malediction);
  assert.ok(sources.length >= 1, 'au moins une créature imprime la Malédiction');
  for (const carte of sources) {
    assert.ok(['creature', 'hero'].includes(carte.kind),
      `${carte.id} : seules les créatures invoquées portent la Malédiction`);
    assert.ok((carte.malediction.atk ?? 0) > 0,
      `${carte.id} : la Malédiction retire au moins 1 point d’attaque`);
  }
  assert.ok(cardById('la-barbe-noire')?.malediction,
    'La Barbe Noire reste la source de Malédiction du catalogue');

  assert.match(duel, /\{carte\?\.malediction \? <AuraOndes variante="malediction" phase=\{phaseAura\(entite\)\} \/> : null\}/,
    'le calque violet se décide sur la Malédiction imprimée de la carte');
  assert.doesNotMatch(duel, /entite\?\.malediction \? <AuraOndes/,
    'une créature maudite ne projette pas le calque de la source');
  assert.doesNotMatch(duel, /maledictionBonus[^,\n]*\? <AuraOndes/,
    'le malus reçu (`maledictionBonus`) n’allume aucune onde');
  assert.match(duel, /carte\?\.malediction \? 'has-malediction' : '',/,
    'la carte porte la classe de la Malédiction, sur le même verdict');

  // ── 2. Le composant : un seul calque, trois teintes ───────────────────────
  const composant = duel.slice(
    duel.indexOf('/** L\'aura de sonar'),
    duel.indexOf("/* ── Soins : l'éclat d'un gain de vie"),
  );
  assert.match(composant, /malediction: 'rpg-card__resonance--malediction'/,
    'la variante violette se pose sur le même calque');
  assert.match(composant, /aura: 'rpg-card__resonance--aura'/,
    'sans toucher à la variante jaune');
  assert.equal((duel.match(/function AuraOndes/g) ?? []).length, 1,
    'un seul composant d’ondes pour les trois teintes — pas trois effets à maintenir');

  // ── 3. La feuille : le même débordement, une teinte de Ténèbres ───────────
  const debut = battleCss.indexOf('/* ── Résonance : une aura bleue de sonar');
  const fin = battleCss.indexOf('/* ── Infiltration : la carte brumeuse');
  assert.ok(debut > 0 && fin > debut, 'le bloc du sonar porte les trois variantes');
  const resonanceCss = battleCss.slice(debut, fin);

  assert.match(resonanceCss, /\.rpg-card:is\(\.has-resonance, \.has-aura, \.has-malediction\)\s*\{[^}]*overflow:\s*clip;[^}]*overflow-clip-margin:\s*58px;/s,
    'les ondes violettes débordent du cadre comme les bleues et les jaunes');
  assert.match(resonanceCss, /\.rpg-card:is\(\.has-resonance, \.has-aura, \.has-malediction\) \.rpg-card__img\s*\{[^}]*animation:\s*none !important;/s,
    'le survol ne fait pas déborder l’illustration agrandie d’une carte maudite');

  const mauditCss = resonanceCss.slice(
    resonanceCss.indexOf('.rpg-card__resonance--malediction {'),
    resonanceCss.indexOf('.rpg-card__resonance-onde--1'),
  );
  assert.ok(mauditCss.length > 0, 'la feuille déclare la variante violette');
  assert.match(mauditCss, /background:\s*radial-gradient\([^;]*rgba\(203, 176, 250,/s,
    'le halo prend une teinte violette');
  assert.match(mauditCss, /box-shadow:\s*inset 0 0 16px rgba\(154, 124, 224,/s,
    'le liseré qui reste allumé passe au violet des Ténèbres');
  assert.match(mauditCss, /\.rpg-card__resonance--malediction \.rpg-card__resonance-onde\s*\{[^}]*border-color:\s*rgba\(178, 146, 245,/s,
    'les ondes de la Malédiction sont violettes');
  assert.match(mauditCss, /border-color:\s*rgba\(178, 146, 245, \.92\);/,
    'l’anneau de l’onde est le même violet que le halo');
  assert.doesNotMatch(mauditCss, /rgba\(96, 178, 255|rgba\(250, 205, 90/,
    'ni le bleu du sonar ni l’or de l’aura ne se glissent dans le violet');
  assert.doesNotMatch(mauditCss, /--rpg-resonance-retard|@keyframes/,
    'la variante violette ne redéclare ni cadence ni images clés : elle hérite du cycle');
  assert.doesNotMatch(mauditCss, /animation:/,
    'aucune animation propre : les ondes violettes battent exactement comme les jaunes');

  // Le mouvement réduit, déclaré une fois, vaut pour les trois teintes.
  assert.match(resonanceCss, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.rpg-card__resonance-onde\s*\{\s*animation:\s*none;/,
    'en mouvement réduit, les ondes violettes se figent comme les autres');
  assert.equal((battleCss.match(/@keyframes rpg-resonance-onde/g) ?? []).length, 1,
    'une seule cadence pour les trois teintes');

  // ── 4. La règle : la Malédiction touche le camp entier, sans adjacence ────
  const moteur = lire('rpgDuel.js');
  assert.match(moteur, /function appliquerMaledictions\(duel\) \{[\s\S]*?duelCardById\(entite\.carteId\)\?\.malediction/,
    'le moteur lit la Malédiction imprimée de chaque créature en jeu');
  assert.match(moteur, /appliquerMaledictions\(duel\);/,
    'rafraichirAuras recalcule le malus à chaque changement de la table');
  assert.doesNotMatch(moteur, /function appliquerMaledictions\(duel\) \{[\s\S]{0,1200}?voisines\(/,
    'aucun voisinage dans le calcul : le camp entier est maudit');
  assert.match(lire('effetIcons.js'), /malediction: \(\) => 'Tant qu’elle est en jeu, TOUTES les créatures du camp adverse/,
    'la définition du mot-clé dit le camp entier');
  assert.match(duel, /malédiction : toutes les créatures adverses gagnent -/,
    'la description lue de la table le dit elle aussi');

  console.log('✓ Malédiction : la carte qui l’imprime porte le sonar de la résonance en violet — même calque, mêmes ondes, même débordement, même mouvement réduit — et seule la source rayonne, jamais une créature maudite');
}

/* ══ Aperçu interactif ══════════════════════════════════════════════════════
   `npm run preview:rpg-malediction-sonar` sert une page de démonstration sur
   le port 5173 : les trois teintes du même calque posées côte à côte, avec une
   créature maudite qui ne rayonne pas — voir les ondes dans le vrai
   navigateur, sans lancer une partie. Aucun navigateur à installer. */

const APERCU_CSS = `
:root { color-scheme: dark; }
html, body { margin: 0; background: #0b0910; color: #e9e2f2; font-family: system-ui, sans-serif; }
main { display: grid; gap: 18px; padding: 26px; max-width: 1180px; margin: 0 auto; }
h1 { margin: 0 0 8px; font: 800 24px/1.2 Georgia, serif; letter-spacing: .01em; }
h1 em { color: #b292f5; font-style: normal; }
header p { margin: 0 0 8px; color: #b6a9cd; font-size: 14px; line-height: 1.6; max-width: 900px; }
.note { color: #8f83a8; font-size: 12.5px; line-height: 1.5; }
.grille { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 18px; align-items: start; }
.scenario { background: linear-gradient(180deg, #171225, #100c1a); border: 1px solid #35284f; border-radius: 12px; padding: 16px; }
.scenario h2 { margin: 0 0 14px; font: 700 11px/1.2 system-ui, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: #b292f5; }
/* La carte de table prend sa largeur dans sa case : 200 px ici, comme sur le plateau. */
.scenario .rpg-card { width: 200px; margin-inline: auto; }
.scenario .note { margin: 14px 0 0; }
@media (prefers-reduced-motion: reduce) {
  .scenario::after { content: 'Mouvement réduit actif : les ondes sont figées en couronnes, le liseré reste allumé.';
    display: block; margin-top: 12px; color: #8f83a8; font-size: 12px; }
}
`;

async function lancerApercu() {
  const server = await createServer({
    base: '/',
    // `allowedHosts: true` : l'aperçu accepte le domaine public de la prévisualisation.
    server: { host: '0.0.0.0', port: 5173, allowedHosts: true },
    plugins: [{
      name: 'rpg-malediction-sonar-apercu',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url !== '/') return next();
          res.setHeader('Content-Type', 'text/html');
          server.transformIndexHtml('/__rpg-malediction-apercu',
            '<!doctype html><html lang="fr"><head><meta charset="utf-8">'
            + '<meta name="viewport" content="width=device-width, initial-scale=1">'
            + '<title>Le Sablier — le sonar de la Malédiction</title><style>' + APERCU_CSS + '</style></head>'
            + '<body><div id="root"></div>'
            + '<script type="module" src="/scripts/rpg-malediction-sonar-apercu.jsx"></script></body></html>')
            .then((html) => res.end(html));
        });
      },
    }],
  });
  await server.listen();
  server.printUrls();
}
