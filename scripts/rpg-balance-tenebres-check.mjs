/**
 * La balance des Heures, signature du set Ténèbres (transfert de vie).
 * node scripts/rpg-balance-tenebres-check.mjs
 *
 * Le moteur journalise chaque transfert (Tribut au contact, sorts « pesée »)
 * hors de l'état JSON. La page relève les nouveaux événements et incline, au
 * centre de la table, un fléau du côté qui perd des PV ; des grains d'or
 * filent de la coupelle basse vers la haute. Un lot de transferts simultanés
 * ne donne qu'une seule balance. Le calque est décoratif, centré (il ne dépend
 * d'aucune position de carte), ne capte aucun geste et ne se lève pas en
 * mouvement réduit.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const engine = readFileSync(new URL('../src/games/rpgDuel.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');

// ── 1. Les deux sens, rendus pour de vrai ──────────────────────────────────
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-balance-tenebres-smoke.jsx', outDir: 'node_modules/.cache/rpg-balance-tenebres', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const { rendreBalanceJoueur, rendreBalanceSorcier } = await import('../node_modules/.cache/rpg-balance-tenebres/rpg-balance-tenebres-smoke.js');

function verifierBalance(html, sens, modificateur) {
  const { window } = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  try {
    const racine = window.document.querySelector('.rpg-balance-tenebres');
    assert.ok(racine, 'le calque de la balance est rendu');
    assert.equal(racine.getAttribute('data-rpg-balance-fx'), 'tenebres', 'il se nomme pour les contrôles et la feuille');
    assert.equal(racine.getAttribute('data-rpg-balance-sens'), sens, 'le sens du transfert est nommé');
    assert.ok(racine.classList.contains(modificateur), `il porte le modificateur ${modificateur}`);
    assert.equal(racine.getAttribute('aria-hidden'), 'true', 'il est décoratif : rien à lire, rien à sélectionner');

    assert.ok(racine.querySelector('.rpg-balance-tenebres__halo'), 'un halo sombre local l’entoure');
    assert.equal(racine.querySelectorAll('.rpg-balance-tenebres__glyphe').length, 2, 'deux hiéroglyphes s’allument');
    assert.ok(racine.querySelector('.rpg-balance-tenebres__pilier'), 'le pilier central est dessiné');
    assert.ok(racine.querySelector('.rpg-balance-tenebres__fleau'), 'le fléau pivote sur son axe');
    assert.equal(racine.querySelectorAll('.rpg-balance-tenebres__plateau').length, 2, 'deux coupelles, une par camp');
    assert.equal(racine.querySelectorAll('.rpg-balance-tenebres__coupelle').length, 2, 'chaque plateau tient sa coupelle');
    const grains = [...racine.querySelectorAll('.rpg-balance-tenebres__grain')];
    assert.equal(grains.length, 5, 'cinq grains d’or traversent la balance');
    assert.ok(grains.every((grain) => /--dx:-?\d+px/.test(grain.getAttribute('style') ?? '')
      && /--dy:-?\d+px/.test(grain.getAttribute('style') ?? '')
      && /--d:\d+ms/.test(grain.getAttribute('style') ?? '')),
    'chaque grain part dans sa direction, avec son propre retard');
  } finally {
    window.close();
  }
}
verifierBalance(rendreBalanceJoueur(), 'gagne-joueur', 'rpg-balance-tenebres--gagne-joueur');
verifierBalance(rendreBalanceSorcier(), 'gagne-sorcier', 'rpg-balance-tenebres--gagne-sorcier');

// ── 2. La feuille : une balance qui penche ─────────────────────────────────
assert.match(css, /\.rpg-balance-tenebres\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*58;[^}]*left:\s*50%;[^}]*top:\s*50%;[^}]*pointer-events:\s*none;/s,
  'le calque est centré sur le plateau, au-dessus des cartes, et ne capte aucun geste');
assert.match(css, /\.rpg-balance-tenebres\s*\{[^}]*animation:\s*rpg-balance-vie calc\(1\.1s \* var\(--rpg-anim-scale, 1\)\) ease-out both;/s,
  'il vit 1,1 s puis rend la table');
assert.match(css, /\.rpg-balance-tenebres--gagne-sorcier\s*\{\s*--sens:\s*-1;\s*\}/,
  'le flux de grains s’inverse quand c’est le sorcier qui reçoit la vie');
assert.match(css, /\.rpg-balance-tenebres--gagne-joueur \.rpg-balance-tenebres__fleau\s*\{\s*--inclinaison:\s*-9deg;\s*\}/,
  'le fléau s’abaisse du côté du sorcier quand le joueur gagne les PV');
assert.match(css, /\.rpg-balance-tenebres--gagne-sorcier \.rpg-balance-tenebres__fleau\s*\{\s*--inclinaison:\s*9deg;\s*\}/,
  'et du côté du joueur quand c’est le sorcier qui les gagne');
assert.match(css, /\.rpg-balance-tenebres__fleau\s*\{[^}]*animation:\s*rpg-balance-incline calc\(1\.1s \* var\(--rpg-anim-scale, 1\)\) cubic-bezier\(\.35, \.7, \.3, 1\) both;/s,
  'le fléau porte son inclinaison');
for (const nom of ['vie', 'halo', 'glyphe', 'incline', 'coupelle', 'grain']) {
  assert.match(css, new RegExp(`@keyframes rpg-balance-${nom} `), `l’animation « ${nom} » existe`);
}
// Aucune mise en page animée dans le bloc de la balance.
const debutImages = css.indexOf('@keyframes rpg-balance-vie');
const finImages = css.indexOf('(RpgTableScene3D)');
assert.ok(debutImages > 0 && finImages > debutImages, 'les images clés de la balance forment un bloc');
const imagesCles = css.slice(debutImages, finImages);
assert.doesNotMatch(imagesCles, /(^|[^-])(top|left|right|bottom|width|height|margin):/s,
  'la balance n’anime aucune propriété de mise en page : ni position, ni taille');

// ── 3. Le mouvement réduit : la balance reste immobile ─────────────────────
assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.rpg-balance-tenebres,\s*\.rpg-balance-tenebres \*\s*\{[^}]*animation:\s*none !important;/,
  'en mouvement réduit, la balance et ses pièces se figent');

// ── 4. Le moteur : un journal de transferts hors état JSON ─────────────────
assert.match(engine, /const transfertsParDuel = new WeakMap\(\);/, 'le journal vit dans une WeakMap, jamais dans l’état sérialisé');
assert.match(engine, /export function rpgNombreTransferts\(duel\)/, 'le moteur publie la taille du journal');
assert.match(engine, /export function rpgTransfertsDepuis\(duel, position = 0\)/, 'et une lecture bornée par position');
assert.match(engine, /function journaliserTransfert\(duel, coteSource, montant, sourceCarteId = null\)/,
  'chaque transfert est journalisé avec son camp receveur et sa carte source');
const transfertVie = engine.slice(engine.indexOf('function transfertVie('), engine.indexOf('/**', engine.indexOf('function transfertVie(') + 4));
assert.match(transfertVie, /journaliserTransfert\(duel, coteSource, n, sourceCarteId\);/,
  'le cœur du transfert alimente le journal après avoir déplacé la vie');
assert.match(engine, /transfertVie\(duel, cote, montant, sourceCarteId\);/,
  'le sort « pesée » transmet sa carte source au journal');
assert.match(engine, /transfertVie\(duel, cote, montant\);/,
  'le Tribut au combat garde une source nulle (pas de carte sort)');

// ── 5. La page : la balance se lève sur les transferts ─────────────────────
assert.match(page, /const \[balancesTenebres, setBalancesTenebres\] = useState\(\[\]\);/,
  'la table garde la liste des balances en cours');
assert.match(page, /rpgNombreTransferts,/, 'la page importe la taille du journal');
assert.match(page, /rpgTransfertsDepuis,/, 'et sa lecture bornée');
assert.match(page, /const frais = rpgTransfertsDepuis\(duelCourant, position\);/,
  'chaque rendu relève les transferts parus depuis la dernière position');
assert.match(page, /if \(!frais\.length \|\| animationsReduites\(\)\) return;/,
  'aucune balance ne se lève en mouvement réduit, et la position de lecture avance quand même');
assert.match(page, /effectId: `balance-\$\{token\}`,/, 'un lot de transferts simultanés ne donne qu’une seule balance');
assert.match(page, /coteSource: frais\[0\]\.coteSource,/, 'le sens vient du camp qui reçoit la vie');
assert.match(page, /\{balancesTenebres\.map\(\(effet\) => \(\s*<BalanceTenebres\s+key=\{effet\.effectId\}/s,
  'elles sont rendues au centre de la table');
assert.match(page, /if \(!balancesTenebres\.length\) return undefined;[\s\S]*?setBalancesTenebres\(\(current\) => nettoyerFantomes\(current\)\)/,
  'un chien de garde retire les balances périmées si la minuterie se perd');
assert.match(page, /setBalancesTenebres\(\[\]\);/, 'quitter le duel efface les balances en cours');

console.log('✓ Balance des Heures : le transfert de vie Ténèbres incline le fléau du côté qui perd des PV — halo local, deux hiéroglyphes, pilier et deux coupelles, cinq grains d’or qui traversent, sens inversé selon le camp receveur — calque centré sans dépendance aux cartes, sans capter de geste, sans toucher la mise en page, silencieux en mouvement réduit');
