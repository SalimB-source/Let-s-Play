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

// Les liens d’entrave : deux chaînes rivetées en croix sur les diagonales de
// la carte, qui s’y verrouillent au contact du grappin.
{
  const doc = documentDe(rendreFantome({ abordage: null }));
  const liens = doc.querySelector('.rpg-abordage-liens');
  assert.ok(liens, 'la carte prise porte ses chaînes d’entrave en croix');
  const diagonales = [...doc.querySelectorAll('.rpg-abordage-liens__diagonale')];
  assert.deepEqual(diagonales.map((g) => g.getAttribute('data-diagonale')),
    ['descendante', 'montante'], 'les deux diagonales sont chaînées');
  const chapelets = [...doc.querySelectorAll('.rpg-abordage-liens__chapelet')];
  assert.ok(chapelets.length >= 8, 'au moins quatre maillons par diagonale');
  assert.equal(Number(liens.getAttribute('data-rpg-abordage-liens')), chapelets.length,
    'le compteur annoncé est celui des maillons peints');
  assert.ok(doc.querySelector('.rpg-abordage-liens__eclair'),
    'un éclair d’impact marque le contact de la chaîne au centre de la carte');
  // Chaque maillon est peint deux fois, comme la torsade : le creux d’acier,
  // puis le fil de lumière.
  for (const chapelet of chapelets) {
    assert.equal(chapelet.querySelectorAll('.rpg-abordage-liens__anneau--creux').length, 1);
    assert.equal(chapelet.querySelectorAll('.rpg-abordage-liens__anneau--fil').length, 1);
  }
  // Les maillons tombent exactement sur l’une des deux diagonales (carte 120 × 150).
  const W = 120;
  const H = 150;
  const surDiagonale = (x, y) => {
    const descendante = Math.abs(y - (H / W) * x) < 1.5;
    const montante = Math.abs(y - (H - (H / W) * x)) < 1.5;
    return descendante || montante;
  };
  for (const chapelet of chapelets) {
    const transform = chapelet.getAttribute('transform') ?? '';
    const match = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(transform);
    assert.ok(match, 'chaque maillon est positionné sur sa diagonale');
    assert.ok(surDiagonale(Number(match[1]), Number(match[2])),
      'le maillon tombe sur l’une des deux diagonales de la carte');
    assert.match(transform, /rotate\(/, 'le maillon s’oriente dans l’axe de sa diagonale');
  }
  assert.ok(chapelets.some((c) => c.getAttribute('data-central') === 'true'),
    'le croisement des diagonales est verrouillé par un maillon central');
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
  // ── Le tressage ─────────────────────────────────────────────────────────
  // Deux brins d'acier enroulés : les demi-ondes alternent entre un calque
  // arrière et un calque avant, et ce sont EUX qui font passer un brin
  // dessus, l'autre dessous. Rien d'un chapelet d'ovales.
  assert.equal(chaine.getAttribute('data-rpg-abordage-chaine'), 'tressee',
    'la chaîne se nomme pour ce qu’elle est : une torsade');
  const arriere = [...docChaine.querySelectorAll('.rpg-abordage-chaine__brins--arriere .rpg-abordage-chaine__brin')];
  const avant = [...docChaine.querySelectorAll('.rpg-abordage-chaine__brins--avant .rpg-abordage-chaine__brin')];
  assert.ok(arriere.length >= 6, 'les demi-ondes arrière forment un brin continu');
  assert.ok(avant.length >= 6, 'les demi-ondes avant aussi');
  assert.equal(Number(chaine.getAttribute('data-rpg-abordage-lobes')), arriere.length + avant.length,
    'le nombre annoncé est celui des demi-ondes peintes');
  // Chaque demi-onde est peinte deux fois : le creux du brin, puis le fil de
  // lumière qui court au cœur de l’acier.
  assert.equal(docChaine.querySelectorAll('.rpg-abordage-chaine__fil--avant').length, avant.length,
    'un fil de lumière par demi-onde avant');
  assert.equal(docChaine.querySelectorAll('.rpg-abordage-chaine__fil--arriere').length, arriere.length,
    'un fil de lumière par demi-onde arrière');
  // L’alternance : d’un croisement à l’autre, c’est l’autre brin qui passe
  // devant. Le brin avant change donc de côté à chaque demi-onde.
  const pointsDe = (brin) => {
    const nombres = brin.getAttribute('d').trim().split(/[ML\s]+/).filter(Boolean).map(Number);
    return nombres.reduce((liste, valeur, index) => {
      if (index % 2 === 0) liste.push({ x: valeur, y: 0 });
      else liste.at(-1).y = valeur;
      return liste;
    }, []);
  };
  const bombement = (brin) => {
    const ys = pointsDe(brin).map((point) => point.y);
    return Math.max(...ys) - Math.min(...ys);
  };
  assert.ok([...arriere, ...avant].every((brin) => bombement(brin) > 4),
    'chaque demi-onde bombe vraiment de part et d’autre de l’axe');
  // Les deux calques se recouvrent : à la même abscisse, une demi-onde avant
  // couvre une demi-onde arrière — c’est le croisement tressé.
  const bornes = (brin) => {
    const points = pointsDe(brin);
    return [points[0].x, points.at(-1).x];
  };
  const avantX = avant.map(bornes);
  const arriereX = arriere.map(bornes);
  const recouvrements = avantX.filter(([a0, a1]) => arriereX.some(([b0, b1]) => a0 < b1 && b0 < a1));
  assert.ok(recouvrements.length >= avantX.length - 1,
    'chaque demi-onde avant recouvre une demi-onde arrière : le brin passe dessus');
  const cotes = avant.map((brin) => (pointsDe(brin)[0].y < 28 ? 'haut' : 'bas'));
  assert.ok(cotes.some((cote, index) => index > 0 && cote !== cotes[index - 1]),
    'le brin qui passe devant change de côté : la torsade tourne');
  // Les deux brins suivent la MÊME ondulation : au premier croisement ils se
  // rejoignent sur l’axe (y = 28), c’est un seul fil qui s’enroule.
  const croisement = (brin) => pointsDe(brin)[0];
  assert.deepEqual(croisement(avant[0]), croisement(arriere[0]),
    'les deux brins passent par le même point de croisement');
  assert.equal(croisement(avant[0]).y, 28, 'ce croisement est sur l’axe de la chaîne');

  assert.ok(docChaine.querySelector('.rpg-abordage-chaine__ombre path'),
    'une ombre portée donne du relief sous l’acier');
  assert.ok(docChaine.querySelector('.rpg-abordage-chaine__manille'),
    'une manille noue la chaîne au capteur');
  assert.ok(docChaine.querySelector('.rpg-abordage-chaine__grappin path'), 'un grappin termine la course');
}

// Une morte ordinaire ne reçoit ni la classe d'Abordage ni sa chaîne.
{
  const doc = documentDe(rendreMorte());
  const fantome = doc.querySelector('.rpg-card-destruction-fx');
  assert.ok(fantome, 'la carte détruite garde son fantôme');
  assert.ok(!fantome.classList.contains('is-abordage'), 'une morte n’est pas une prise');
  assert.equal(doc.querySelector('.rpg-abordage-chaine'), null, 'aucune chaîne pour une destruction');
  assert.equal(doc.querySelector('.rpg-abordage-liens'), null,
    'une destruction sans prise n’entrave pas la carte de chaînes');
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
assert.match(page, /\{prise && <LiensAbordageCarte effet=\{effet\} \/>\}/,
  'seule une prise en cale entrave la carte de ses chaînes diagonales, jamais une destruction');
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
// La feuille peint le tressage : creux sombre, fil de lumière, calques avant
// et arrière distincts.
assert.match(css, /\.rpg-abordage-chaine__brin\s*\{[^}]*fill:\s*none;[^}]*stroke-width:\s*3\.1;/s,
  'le creux du brin est un trait plein, large');
assert.match(css, /\.rpg-abordage-chaine__fil\s*\{[^}]*fill:\s*none;[^}]*stroke-width:\s*1\.1;/s,
  'la lumière de l’acier est un fil fin, au cœur du brin');
assert.match(css, /\.rpg-abordage-chaine__brin--arriere\s*\{\s*stroke:\s*#454e58;\s*\}/,
  'le brin arrière est à l’ombre');
assert.match(css, /\.rpg-abordage-chaine__fil--avant\s*\{\s*stroke:\s*#f4fafd;\s*\}/,
  'le brin avant reçoit la lumière');
assert.match(css, /\.rpg-abordage-chaine__brin,\s*\n\.rpg-abordage-chaine__fil,\s*\n\.rpg-abordage-chaine__ombre path\s*\{\s*animation: rpg-abordage-anneau 1400ms linear forwards;/s,
  'les lobes et leur ombre remontent ensemble quand la chaîne se tend');
assert.match(css, /@keyframes rpg-abordage-prise\s*\{\s*0%, 38% \{ transform: rotate\(var\(--rpg-fx-rotation\)\); opacity: 1; \}/,
  'elle attend la première image : la mesure a le temps d’arriver');

// ── 5. Les liens diagonaux : verrouillage au contact du grappin ───────────
assert.match(css, /\.rpg-abordage-liens\s*\{[^}]*z-index: 3;/s,
  'les chaînes d’entrave se peignent par-dessus l’illustration de la carte');
assert.match(css, /@keyframes rpg-abordage-liens\s*\{[\s\S]*?0%, 27% \{ opacity: 0;[\s\S]*?34% \{ opacity: 1;/,
  'la croix de chaînes reste invisible pendant le vol puis se verrouille au contact (28 %–34 %)');
assert.match(css, /@keyframes rpg-abordage-liens-eclair\s*\{/,
  'l’éclair d’impact au croisement des diagonales est animé sur la même course de 1,4 s');
assert.match(css, /\.rpg-abordage-liens \{ display: none; \}/,
  'mouvement réduit : les liens d’entrave sont masqués comme la chaîne de traction');

window.close();
