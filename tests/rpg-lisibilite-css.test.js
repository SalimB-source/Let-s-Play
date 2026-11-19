import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOSSIER = path.join(ROOT, 'src/games');
const CSS_RPG = fs.readdirSync(DOSSIER)
  .filter((nom) => /^rpg.*\.css$/.test(nom))
  .sort()
  .map((nom) => ({ nom, css: fs.readFileSync(path.join(DOSSIER, nom), 'utf8') }));

/** Vignettes : le texte y suit la largeur de la face (conteneurs `cqw`). */
const VIGNETTES = [
  '--img', 'hand__card', 'mulligan__card', 'catalogue__art',
  'atelier__carte-art', 'hover-card-preview__face', 'cimetiere',
];

/** Les commentaires sont neutralisés pour ne pas lire leurs exemples chiffrés. */
function masque(css) {
  const sortie = css.split('');
  let depuis = 0;
  for (;;) {
    const debut = css.indexOf('/*', depuis);
    if (debut < 0) break;
    const fin = css.indexOf('*/', debut + 2);
    const borne = fin < 0 ? css.length : fin + 2;
    for (let i = debut; i < borne; i += 1) sortie[i] = ' ';
    depuis = borne;
  }
  return sortie.join('');
}

/** Sélecteur de la déclaration qui commence à `position`, lue sur une pile de blocs. */
function selecteursParPosition(masqueCss) {
  const positions = new Map();
  const pile = [];
  let tampon = '';
  for (let i = 0; i < masqueCss.length; i += 1) {
    const c = masqueCss[i];
    if (c === '{') { pile.push(tampon.trim()); tampon = ''; continue; }
    if (c === '}') { pile.pop(); tampon = ''; continue; }
    if (c === ';') { tampon = ''; continue; }
    tampon += c;
    if (pile.length) positions.set(i, pile[pile.length - 1]);
  }
  return positions;
}

function estVignette(selecteur) {
  return VIGNETTES.some((mot) => selecteur.includes(mot));
}

/** Toutes les tailles en pixels d'un fichier, avec leur sélecteur. */
function tailles(css) {
  const masqueCss = masque(css);
  const selecteurs = selecteursParPosition(masqueCss);
  const trouvees = [];
  const motifs = [/font-size:\s*(\d+(?:\.\d+)?)px/g, /font:\s*[^;{}]*?(\d+(?:\.\d+)?)px/g];
  for (const motif of motifs) {
    for (const hit of masqueCss.matchAll(motif)) {
      trouvees.push({
        px: Number(hit[1]),
        selecteur: selecteurs.get(hit.index) ?? '',
        extrait: masqueCss.slice(hit.index, hit.index + 60).split('}')[0],
      });
    }
  }
  return trouvees;
}

test('Lisibilité : aucun texte d’interface sous 10 px, 11 px pour les textes de carte', () => {
  const fautes = [];
  for (const { nom, css } of CSS_RPG) {
    for (const { px, selecteur } of tailles(css)) {
      if (px >= 10 || estVignette(selecteur)) continue;
      const plancher = /(__text|__texte|__rules|__regles|__flavor|__description|__desc|__resume|__body|__type|__log|__journal)/i.test(selecteur) ? 11 : 10;
      if (px < plancher) fautes.push(`${nom} — ${selecteur.trim()} : ${px}px`);
    }
  }
  assert.deepEqual(fautes, [], `tailles sous le plancher :\n${fautes.join('\n')}`);
});

test('Lisibilité : les vignettes ne descendent pas sous 5 px', () => {
  const fautes = [];
  for (const { nom, css } of CSS_RPG) {
    for (const { px, selecteur } of tailles(css)) {
      if (!estVignette(selecteur) || px >= 5) continue;
      fautes.push(`${nom} — ${selecteur.trim()} : ${px}px`);
    }
  }
  assert.deepEqual(fautes, []);
});

test('Contraste : plus aucun texte clair sous 62 % d’opacité', () => {
  const fautes = [];
  const motif = /color:\s*rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(0?\.\d+)\s*\)/g;
  for (const { nom, css } of CSS_RPG) {
    for (const hit of masque(css).matchAll(motif)) {
      const [r, g, b, a] = [Number(hit[1]), Number(hit[2]), Number(hit[3]), Number(hit[4])];
      if (Math.min(r, g, b) >= 200 && a < 0.62) fautes.push(`${nom} — ${hit[0]}`);
    }
  }
  assert.deepEqual(fautes, [], `textes trop pâles :\n${fautes.join('\n')}`);
});

test('Troncature : une vignette annonce le texte coupé par un repère, pas en silence', () => {
  const battle = CSS_RPG.find(({ nom }) => nom === 'rpg-battle.css').css;
  const mobile = battle.slice(battle.indexOf('Troncature annoncée'));
  assert.ok(mobile, 'le bloc « Troncature annoncée » doit exister');
  // Le repère vit dans la requête tactile/mobile : les grandes cartes n'y touchent pas.
  const media = mobile.slice(0, mobile.indexOf('}\n}') + 3);
  assert.match(media, /@media \(max-width: 760px\)/, 'le repère n’apparaît que sur cartes serrées');
  for (const selecteur of [
    '.rpg-card--img .rpg-card__text::after',
    '.rpg-hand__card--img .rpg-hand__text::after',
  ]) {
    assert.ok(mobile.includes(selecteur), `repère manquant : ${selecteur}`);
  }
  assert.match(mobile, /content: '＋'/, 'le repère porte un signe visible');
  assert.match(mobile, /pointer-events: none/, 'le repère ne doit pas intercepter les appuis');
});
