/**
 * La carte délitée : une destruction ne s'évapore plus, elle redevient du
 * sable — douze grains s'échappent du fantôme et tombent en éventail au sol.
 * node scripts/rpg-carte-delitee-check.mjs
 *
 * Le fantôme de destruction existant (`FantomeCarteDetruite`) gère déjà la
 * géométrie, le cycle de vie et la variante Braise. Le délitement est un calque
 * frère, rendu seulement pour une mort générique : ni la combustion (qui a ses
 * flammes) ni la prise en cale d'Abordage (la carte repart chez son capteur) ne
 * produisent de grains. Chute en transform/opacity, 700 ms, invisible en
 * mouvement réduit, et le moteur reste vierge de tout habillage.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const engine = readFileSync(new URL('../src/games/rpgDuel.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');

function extraireBloc(texte, marqueur) {
  const debut = texte.indexOf(marqueur);
  assert.ok(debut >= 0, `${marqueur} existe`);
  let profondeur = 0;
  let fin = -1;
  for (let i = texte.indexOf('{', debut); i < texte.length; i += 1) {
    if (texte[i] === '{') profondeur += 1;
    if (texte[i] === '}') {
      profondeur -= 1;
      if (profondeur === 0) { fin = i; break; }
    }
  }
  assert.ok(fin > debut, `${marqueur} forme un bloc fermé`);
  return texte.slice(debut, fin + 1);
}

// ── 1. Les trois situations, rendues pour de vrai ──────────────────────────
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-carte-delitee-smoke.jsx', outDir: 'node_modules/.cache/rpg-carte-delitee', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const smoke = await import('../node_modules/.cache/rpg-carte-delitee/rpg-carte-delitee-smoke.js');

function dom(html) {
  return new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
}

{
  const { window } = dom(smoke.rendreDestructionGenerique());
  try {
    const fantome = window.document.querySelector('.rpg-card-destruction-fx');
    assert.ok(fantome, 'le fantôme de destruction habituel est rendu');
    const calque = window.document.querySelector('.rpg-carte-delitee');
    assert.ok(calque, 'une mort générique ajoute le calque de délitement');
    assert.equal(calque.getAttribute('aria-hidden'), 'true', 'le calque est décoratif');
    const style = calque.getAttribute('style') ?? '';
    assert.match(style, /left:\s*210px/, 'il reprend la géométrie figée du fantôme');
    assert.match(style, /width:\s*132px/, 'sa largeur est celle de la carte');
    const grains = calque.querySelectorAll('.rpg-carte-delitee__grain');
    assert.equal(grains.length, 12, 'douze grains de sable se déliten');
    const premier = grains[0].getAttribute('style') ?? '';
    assert.match(premier, /--gx:\s*12%/, 'chaque grain porte sa position de départ…');
    assert.match(premier, /--dy:\s*96px/, '…et sa distance de chute');
    assert.match(premier, /--d:\s*30ms/, '…et son décalage, sans calcul au rendu');
  } finally {
    window.close();
  }
}

{
  const { window } = dom(smoke.rendreDestructionBrulee());
  try {
    assert.ok(window.document.querySelector('.rpg-card-destruction-fx.is-burning'),
      'la combustion garde sa variante Braise');
    assert.equal(window.document.querySelector('.rpg-carte-delitee'), null,
      'une carte consumée par la Braise ne se délite pas : ses flammes racontent déjà la mort');
  } finally {
    window.close();
  }
}

{
  const { window } = dom(smoke.rendrePriseEnCale());
  try {
    assert.ok(window.document.querySelector('.rpg-card-destruction-fx.is-abordage'),
      'la prise en cale garde sa variante Abordage');
    assert.equal(window.document.querySelector('.rpg-carte-delitee'), null,
      'une carte prise en cale part chez son capteur, elle ne tombe pas en sable');
  } finally {
    window.close();
  }
}

// ── 2. La feuille : une chute en éventail, sans layout, hors des slices gardés
const positionBloc = css.indexOf('.rpg-carte-delitee {');
assert.ok(positionBloc > css.indexOf("Les flèches d'attaque et de blocage"),
  'le bloc est après les flèches, dans la zone FX gardée');
assert.ok(positionBloc < css.indexOf('LA TEMPÊTE DE SABLE'),
  'et avant la tempête, hors des slices des autres checks');
const blocCalque = extraireBloc(css, '.rpg-carte-delitee {');
assert.match(blocCalque, /position:\s*absolute;/, 'le calque est absolu, calé sur la géométrie du fantôme');
assert.match(blocCalque, /z-index:\s*54;/, 'il passe sous le fantôme (55) et les traits de liaison');
assert.match(blocCalque, /pointer-events:\s*none;/, 'il ne capte aucun geste');
assert.match(blocCalque, /overflow:\s*visible;/, 'les grains débordent de la carte pour tomber au plateau');
assert.match(css, /\.rpg-carte-delitee__grain\s*\{[^}]*animation:\s*rpg-carte-delitee-grain calc\(\.7s \* var\(--rpg-anim-scale, 1\)\) cubic-bezier\(\.4, \.1, \.6, 1\) both;/s,
  'la chute dure 700 ms avec une courbe qui accélère comme une pesanteur');
const keyframes = extraireBloc(css, '@keyframes rpg-carte-delitee-grain');
assert.doesNotMatch(keyframes, /(top|left|right|bottom|width|height|margin|padding):/,
  'la chute n’anime aucune propriété de mise en page');
assert.match(keyframes, /translate\(var\(--dx, 0px\), var\(--dy, 80px\)\)/,
  'le grain atterrit plus bas, à sa propre distance de chute');
assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.rpg-carte-delitee__grain \{ animation: none; opacity: 0; \}\s*\}/,
  'en mouvement réduit, aucun grain : la carte disparaît sans chute');
assert.match(css, /\.rpg-carte-delitee,\s*\.rpg-carte-delitee \* \{ animation: none !important; transition: none !important; \}/,
  'le bloc global de mouvement réduit couvre aussi le délitement');

// Le fantôme générique se tasse désormais vers le bas, il ne s'évapore plus.
const keyframesDestruction = extraireBloc(css, '@keyframes rpg-card-destroy');
assert.match(keyframesDestruction, /100% \{[^}]*translate: 0 10px;/s,
  'la carte détruite se tasse vers le bas, dans le sens du sable qui tombe');
assert.doesNotMatch(keyframesDestruction, /translate: 0 -20px/,
  'l’ancienne évaporation vers le haut est supprimée');
const keyframesBraise = extraireBloc(css, '@keyframes rpg-card-burn');
assert.match(keyframesBraise, /rpg-card-burn/, 'la combustion Braise garde sa cinématique propre');

// ── 3. La page : douze grains figés, réservés aux morts génériques ─────────
assert.match(page, /const GRAINS_DELITEMENT = Object\.freeze\(\[/, 'les paramètres des grains sont figés une fois pour toutes');
assert.equal((page.match(/\{ gx: /g) ?? []).length >= 12, true, 'douze jeux de coordonnées sont déclarés');
assert.match(page, /\{!prise && !effet\.bruleeParBraise && \(/,
  'ni les prises en cale ni les combustions Braise ne produisent de grains');
assert.match(page, /className="rpg-carte-delitee"/, 'le calque utilise la classe de la feuille');
assert.match(page, /GRAINS_DELITEMENT\.map\(\(grain, index\) => \(/, 'les grains sont rendus à partir de la constante figée');
assert.match(page, /'--gx': `\$\{grain\.gx\}%`/, 'la position de départ est exposée en pourcentage de la carte');
assert.match(page, /'--dy': `\$\{grain\.dy\}px`/, 'la chute passe par les variables CSS, en pixels');
assert.match(page, /left: `\$\{effet\.left\}px`[\s\S]{0,160}?height: `\$\{effet\.height\}px`/,
  'le calque partage exactement la géométrie capturée du fantôme');

// ── 4. Le moteur reste la source de vérité, sans habillage visuel ──────────
assert.equal(engine.includes('rpg-carte-delitee'), false, 'aucune classe de délitement dans le moteur');
assert.equal(engine.includes('GRAINS_DELITEMENT'), false, 'les grains sont un choix de présentation, pas de règle');

console.log('✓ Carte délitée : toute mort générique (hors Braise et hors prise en cale) délite douze grains de sable qui tombent en éventail au plateau en 700 ms, sur un calque frère du fantôme à géométrie partagée — transform/opacity seulement, le fantôme se tasse vers le bas au lieu de s’évaporer, rien en mouvement réduit, moteur vierge de tout visuel');
