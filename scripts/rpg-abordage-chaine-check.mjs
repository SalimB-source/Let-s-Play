/**
 * La chaîne de l'Abordage part du CAPTEUR, où qu'il soit.
 * node scripts/rpg-abordage-chaine-check.mjs
 *
 * Le sorcier pose sa créature accostage et prend sa prise dans le même
 * geste : quand l'action se résout, le capteur n'a pas encore d'élément.
 * L'instantané d'avant l'action ne le connaît pas non plus — la chaîne
 * partait alors du centre de sa rangée, en plein milieu de la table, et la
 * carte prise venait s'y engloutir. Le fantôme de la carte prise remesure
 * donc le capteur SUR LA TABLE RENDUE, à la première image : sa carte
 * exacte, jamais le milieu de sa rangée. Le même vecteur mène la chaîne et
 * la carte, et les deux voyagent 1400 ms.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { act } from 'react';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');

// ── 1. Le fantôme et la chaîne, rendus pour de vrai ────────────────────────
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-abordage-chaine-smoke.jsx', outDir: 'node_modules/.cache/rpg-abordage-chaine', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

// Un document de travail : la mesure lit la table réelle, et le fantôme se
// monte aussi en direct pour rejouer « le capteur arrive après le geste ».
const { window } = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.HTMLElement = window.HTMLElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { rendreFantome, rendreChaine, rendreMorte, vecteurVersCapteur, monterFantomeDevantTableVide } = await import(
  '../node_modules/.cache/rpg-abordage-chaine/rpg-abordage-chaine-smoke.js'
);

const documentDe = (html) => new JSDOM(`<!doctype html><html><body>${html}</body></html>`).window.document;

// Sans vecteur mesuré, la carte est DÉJÀ une prise : elle attend son capteur
// (classe d'Abordage) au lieu de s'effacer comme une morte. La chaîne, elle,
// n'apparaît qu'une fois l'adresse du capteur connue.
{
  const doc = documentDe(rendreFantome({ abordage: null }));
  const fantome = doc.querySelector('.rpg-card-destruction-fx');
  assert.ok(fantome, 'le fantôme de la carte prise est rendu');
  assert.ok(fantome.classList.contains('is-abordage'),
    'la prise se nomme sans attendre la mesure : elle ne joue pas un adieu de morte');
  assert.equal(doc.querySelector('.rpg-abordage-chaine'), null,
    'aucune chaîne ne part d’une adresse inconnue');
  assert.equal(fantome.getAttribute('data-rpg-destroyed-id'), 'entite-prise',
    'le fantôme garde l’identité de la créature prise');
  assert.equal(fantome.getAttribute('aria-hidden'), 'true', 'il est décoratif');
}

// Le vecteur mesuré mène les deux : la chaîne part du capteur, la carte vole
// jusqu'à lui. Ici le capteur est à 500 px à droite et 260 px plus haut.
{
  const vecteur = { dx: 500, dy: -260 };
  const doc = documentDe(rendreFantome({ abordage: vecteur }));
  const fantome = doc.querySelector('.rpg-card-destruction-fx');
  const style = fantome.getAttribute('style') ?? '';
  assert.match(style, /--rpg-abordage-x:500px/, 'la carte est rappelée vers le capteur');
  assert.match(style, /--rpg-abordage-y:-260px/);
  assert.match(style, /left:200px/, 'elle reste posée sur son ancienne case');
  assert.match(style, /top:300px/);

  const chaineHtml = rendreChaine(vecteur);
  const docChaine = documentDe(chaineHtml);
  const chaine = docChaine.querySelector('.rpg-abordage-chaine');
  assert.ok(chaine, 'la chaîne est rendue');
  const styleChaine = chaine.getAttribute('style') ?? '';
  // Le fantôme est centré sur (260, 375) ; le capteur, lui, est à
  // (260 + 500, 375 - 260) = (760, 115) : c'est là que la chaîne se noue.
  assert.match(styleChaine, /left:760px/, 'la chaîne part du centre du capteur, pas de la prise');
  assert.match(styleChaine, /top:115px/);
  assert.match(styleChaine, /width:563\.56\d*px/, 'elle couvre la distance réelle (√(500² + 260²))');
  assert.match(styleChaine, /rotate\(2\.662\d*rad\)/, 'elle s’oriente du capteur vers la prise');
  const anneaux = [...docChaine.querySelectorAll('.rpg-abordage-chaine__anneau')];
  assert.ok(anneaux.length >= 4, 'des anneaux d’acier la composent');
  assert.ok(docChaine.querySelector('.rpg-abordage-chaine__grappin path'), 'un grappin termine la course');
}

// Une morte ordinaire ne reçoit ni la classe d'Abordage ni sa chaîne.
{
  const doc = documentDe(rendreMorte());
  const fantome = doc.querySelector('.rpg-card-destruction-fx');
  assert.ok(fantome, 'la carte détruite garde son fantôme');
  assert.ok(!fantome.classList.contains('is-abordage'), 'une morte n’est pas une prise');
  assert.equal(doc.querySelector('.rpg-abordage-chaine'), null, 'aucune chaîne pour une destruction');
}

// ── 2. La mesure : le capteur réel, jamais le milieu de sa rangée ──────────
const rect = (left, top, width, height) => () => ({
  left, top, width, height, right: left + width, bottom: top + height, x: left, y: top,
});
window.document.body.innerHTML = '<div class="card-table">'
  + '<div class="card-row card-row--ennemi"><button data-entity-id="entite-capteur"></button></div>'
  + '</div>';
const table = window.document.querySelector('.card-table');
const capteur = window.document.querySelector('[data-entity-id]');
// La table occupe 1000 × 700 px en page ; le capteur est posé en haut à
// droite, comme une créature du sorcier au bout de sa rangée.
table.getBoundingClientRect = rect(0, 0, 1000, 700);
capteur.getBoundingClientRect = rect(700, 40, 120, 150);
const effet = { left: 200, top: 300, width: 120, height: 150 };
const vecteur = vecteurVersCapteur({ table, capteurId: 'entite-capteur', effet });
assert.deepEqual(vecteur, { dx: 500, dy: -260 },
  'le vecteur vise la carte du capteur — centre de table exclu');

// Le capteur d'une action en cours de rendu : pas d'élément, pas de mesure.
// Le fantôme remesurera à l'image suivante plutôt que de viser un milieu.
assert.equal(vecteurVersCapteur({ table, capteurId: 'entite-pas-encore-la', effet }), null,
  'un capteur absent ne donne aucun vecteur — jamais un repli au centre');
assert.equal(vecteurVersCapteur({ table: null, capteurId: 'entite-capteur', effet }), null,
  'sans table, aucune mesure');

// ── 2 bis. Le geste réel : le capteur arrive APRÈS le fantôme ─────────────
// C'est exactement la prise du sorcier : l'action se résout sans que sa
// créature soit rendue, puis elle apparaît. La chaîne doit s'accrocher à SA
// carte — pas rester au milieu, et pas disparaître.
{
  const attente = (ms) => new Promise((resolve) => { window.setTimeout(resolve, ms); });
  const { container, table: tableVide, root } = await monterFantomeDevantTableVide();
  tableVide.getBoundingClientRect = rect(0, 0, 1000, 700);
  assert.equal(container.querySelector('.rpg-abordage-chaine'), null,
    'aucune chaîne ne part tant que le capteur n’a pas de carte');

  // Le capteur entre en jeu à sa place : en haut à droite de la table.
  const saCarte = window.document.createElement('button');
  saCarte.dataset.entityId = 'entite-capteur';
  saCarte.getBoundingClientRect = rect(700, 40, 120, 150);
  tableVide.append(saCarte);
  await act(async () => { await attente(120); });

  const chaine = container.querySelector('.rpg-abordage-chaine');
  assert.ok(chaine, 'la chaîne apparaît dès que le capteur est rendu');
  const style = chaine.getAttribute('style') ?? '';
  assert.match(style, /left:\s*760px;\s*top:\s*115px/,
    'elle se noue sur la CARTE du capteur (760 × 115), pas au milieu de la rangée (500)');
  assert.match(container.querySelector('.rpg-card-destruction-fx').getAttribute('style') ?? '',
    /--rpg-abordage-x:\s*500px;.*--rpg-abordage-y:\s*-260px/,
    'la carte prise vole vers ce même capteur');
  await act(async () => root.unmount());
  assert.equal(container.querySelector('.rpg-abordage-chaine'), null, 'le fantôme rend la table');
}

// ── 3. La page : la mesure après rendu, et l'instantané pour estimation ───
const animer = page.slice(page.indexOf('const animerModificationsChamp = ('),
  page.indexOf('const conserverAnnulation ='));
assert.match(animer, /capteurId: capteurId \?\? null,/,
  'l’effet emporte l’identité du capteur jusqu’au fantôme');
assert.match(animer, /fantôme \(`FantomeCarteDetruite`\) remesure le capteur sur la table/,
  'la page dit que la rangée n’est qu’une estimation d’attente');

assert.match(page, /export function FantomeCarteDetruite\(\{ effet, tableRef, onTermine = null \}\)/,
  'le fantôme est un composant, pas une carte anonyme');
assert.match(page, /const \[vecteur, setVecteur\] = useState\(effet\.abordage \?\? null\);/,
  'l’estimation de l’instantané sert de première image');
assert.match(page, /useLayoutEffect\(\(\) => \{\s*if \(!effet\.capteurId\) return undefined;/,
  'la mesure se fait après le rendu, quand le capteur existe enfin');
assert.match(page, /vecteurVersCapteur\(\{\s*table: tableRef\?\.current,\s*capteurId: effet\.capteurId,\s*effet,/s,
  'elle passe par la mesure de table, pas par un centre de rangée');
assert.match(page, /window\.requestAnimationFrame \?\? \(\(rappel\) => window\.setTimeout\(rappel, 16\)\)/,
  'si le capteur manque encore, la mesure est retentée');
assert.match(page, /prise && vecteur && \(\s*<ChaineAbordage effet=\{\{ \.\.\.effet, abordage: vecteur \}\} \/>/s,
  'la chaîne utilise le MÊME vecteur mesuré que la carte');
assert.match(page, /'--rpg-abordage-x': `\$\{vecteur\?\.dx \?\? 0\}px`/,
  'et la carte vole vers ce même capteur');
assert.match(page, /export function vecteurVersCapteur\(\{ table, capteurId, effet \}\)/,
  'la mesure est exportée pour être contrôlée');

// La scène de l'appel : plus de carte de destruction bricolée dans la table.
const rendu = page.slice(page.indexOf('{cartesEnDestruction.map('),
  page.indexOf('{rouesFeu.map('));
assert.match(rendu, /<FantomeCarteDetruite\s+key=\{effet\.effectId\}/,
  'la table délègue le fantôme (et sa mesure) au composant');
assert.doesNotMatch(rendu, /effet\.abordage && <ChaineAbordage/,
  'la chaîne ne se dessine plus depuis l’estimation d’avant l’action');

// ── 4. La feuille : la course a la durée de la mesure ──────────────────────
assert.match(css, /\.rpg-card-destruction-fx\.is-abordage\s*\{\s*animation: rpg-abordage-prise 1400ms ease-in-out forwards;/s,
  'la carte prise voyage pendant 1,4 s');
assert.match(css, /@keyframes rpg-abordage-prise\s*\{\s*0%, 38% \{ transform: rotate\(var\(--rpg-fx-rotation\)\); opacity: 1; \}/,
  'elle attend la première image : la mesure a le temps d’arriver');

window.close();
