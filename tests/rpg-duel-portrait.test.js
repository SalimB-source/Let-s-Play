/** Le duel debout — la géométrie du téléphone en portrait.
 *
 *  Le plateau est une pile verticale : le sorcier adverse, ses deux rangées,
 *  les nôtres, notre sorcier, la main. En paysage cette pile devait tenir dans
 *  une bande de hauteur (`--rpg-board-band`), d'où l'avatar qui recouvrait les
 *  cases et la main hors de l'écran. Debout, elle retrouve sa forme : une seule
 *  colonne de sept rangées, et l'échelle vient de la largeur.
 *
 *  Deux vérifications, comme pour le paysage (`rpg-plateau-mobile.test.js`) :
 *  les feuilles portent bien le contrat (regex, pour qu'une refonte
 *  accidentelle le perde), et l'arithmétique du modèle tient sur les tailles
 *  réelles des téléphones debout.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = (nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8');
const sansCommentaires = (texte) => texte.replace(/\/\*[\s\S]*?\*\//g, '');

const portrait = sansCommentaires(css('rpg-portrait.css'));
const duel = sansCommentaires(css('RpgDuelPage.jsx'));

/** Le bloc `@media (orientation: portrait)` de la coque, commentaires ôtés. */
function blocPortrait(texte) {
  const debut = texte.indexOf('@media (orientation: portrait)');
  assert.ok(debut >= 0, 'la coque portrait existe');
  let profondeur = 0;
  for (let i = texte.indexOf('{', debut); i < texte.length; i += 1) {
    if (texte[i] === '{') profondeur += 1;
    else if (texte[i] === '}') {
      profondeur -= 1;
      if (profondeur === 0) return texte.slice(debut, i + 1);
    }
  }
  throw new Error('bloc portrait non refermé');
}

const bloc = blocPortrait(portrait);

// ── Les constantes du CSS tactile, rejouées ici sans navigateur ─────────────
const PAD = 6;    // --rpg-touch-pad
const GAP = 4;    // --rpg-touch-gap
const clamp = (min, valeur, max) => Math.max(min, Math.min(valeur, max));

function mesures(largeur, hauteur) {
  // --duel-card : la largeur d'abord (cinq cartes de front), la hauteur en
  // plafond (deux rangées par camp entre les deux bandeaux).
  const carte = clamp(44, Math.min((largeur - 32) / 5.15, (hauteur - 165) / 9), 96);
  const gouttiere = Math.max(4, 0.08 * carte);          // --rpg-field-gap
  const rangee = 1.02 * carte;                          // --rpg-field-card
  // La rangée : ses deux marges de 2 px, quatre gouttières, cinq cases.
  const colonne = Math.min(rangee, (largeur - 2 * PAD - 4 - 4 * gouttiere) / 5);
  const deuxRangees = 2 * (colonne * 1.25) + gouttiere + 8; // 4/5 + gouttière + marges
  const nav = clamp(38, 0.62 * carte, 52);              // --rpg-touch-nav
  const avatar = clamp(40, 0.92 * carte, 64);           // --rpg-avatar-height
  const bandeau = avatar + 20 + 6;                      // + vie + souffle
  const commandes = clamp(42, 0.62 * carte, 52) + 4;    // --rpg-touch-combat
  const main = Math.max(44, 0.9 * carte) * 1.32;        // --rpg-touch-hand
  const total = nav + 2 * bandeau + 2 * deuxRangees + commandes + main + 2 * PAD + 6 * GAP;
  return { carte, colonne, deuxRangees, bandeau, main, total };
}

/** Téléphones debout, du plus court au plus grand (320 × 480 excepté : deux
 *  rangées de cartes n'y tiennent pas, le paysage reste son repli). */
const PORTRAITS = [
  [320, 568, 'iPhone SE, debout'],
  [360, 640, 'Android bas de gamme'],
  [375, 667, 'iPhone 8'],
  [390, 844, 'iPhone 12-15'],
  [412, 915, 'Pixel 7'],
  [428, 926, 'iPhone Max'],
  [768, 1024, 'iPad debout'],
];

test('la coque portrait est une seule colonne de sept rangées', () => {
  assert.match(bloc, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  const areas = bloc.match(/grid-template-areas:\s*([^;]+);/)?.[1] ?? '';
  const rangees = areas.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('"'));
  assert.deepEqual(rangees, [
    '"tete"', '"haut"', '"ennemi"', '"equipe"', '"bas"', '"commandes"', '"main"',
  ], 'de haut en bas : journal+menu, bandeau adverse, son champ, le nôtre, son bandeau, commandes, main');
  const rows = bloc.match(/grid-template-rows:\s*([^;]+);/)?.[1] ?? '';
  for (const nom of ['--rpg-touch-nav', '--rpg-avatar-nav', '1fr', '--rpg-touch-hand']) {
    assert.ok(rows.includes(nom), `la rangée ${nom} est déclarée`);
  }
});

test('l’échelle vient de la largeur, la hauteur n’est qu’un plafond', () => {
  assert.match(bloc, /--duel-card:\s*clamp\(44px,\s*min\(calc\(\(100vw - 32px\) \/ 5\.15\),\s*calc\(\(100dvh - 165px\) \/ 9\)\),\s*96px\)/);
  // Le paysage garde sa bande mesurée (`--rpg-board-band`), le portrait ne la
  // relit jamais : il n'a pas de bande à partager, chaque rangée est à sa place.
  assert.doesNotMatch(bloc, /--rpg-board-band/);
  assert.match(bloc, /@supports \(height: 100svh\)/, 'la petite hauteur de viewport est couverte');
});

test('cinq cartes de front et deux rangées tiennent dans chaque téléphone debout', () => {
  for (const [largeur, hauteur, nom] of PORTRAITS) {
    const m = mesures(largeur, hauteur);
    assert.ok(m.colonne >= 34,
      `${nom} : une case mesure ${m.colonne.toFixed(1)} px, au-dessus du plancher tactile`);
    assert.ok(5 * m.colonne + 4 * Math.max(4, 0.08 * m.carte) <= largeur - 2 * PAD,
      `${nom} : les cinq cases et leurs gouttières tiennent dans la largeur`);
    assert.ok(m.total <= hauteur,
      `${nom} : ${m.total.toFixed(0)} px de plateau pour ${hauteur} px d'écran`);
  }
});

test('le médaillon ne recouvre plus les cases : il vit dans son bandeau', () => {
  // Le défaut corrigé en paysage (#1562) : l'avatar posé sur le champ. Debout,
  // les plaques sont dans les rangées `haut` et `bas`, jamais dans un champ.
  assert.match(bloc, /\.rpg-wizard-plate--ennemi \{ grid-area: haut; \}/);
  assert.match(bloc, /\.rpg-wizard-plate--joueur \{ grid-area: bas; \}/);
  const plaque = bloc.match(/\.card-table > \.rpg-wizard-plate,\s*\n[^{]+\{([\s\S]*?)\}/)?.[1] ?? '';
  assert.match(plaque, /position:\s*static/, 'le médaillon quitte le positionnement absolu du paysage');
  assert.match(plaque, /transform:\s*none/);
  // La main occupe toute la largeur : personne à contourner en bas.
  assert.match(bloc, /\.rpg-hand-dock \.rpg-hand \{\s*\n\s*width:\s*100%/);
});

test('les commandes passent de la colonne de droite à une ligne sous le plateau', () => {
  const bottombar = bloc.match(/\.card-table > \.rpg-bottombar \{([\s\S]*?)\}/)?.[1] ?? '';
  assert.match(bottombar, /grid-area:\s*commandes/);
  assert.match(bottombar, /flex-direction:\s*row/, 'le rail et les boutons se rangent côte à côte');
});

test('la coque portrait est chargée après celles du paysage', () => {
  const paysage = duel.indexOf("import './rpg-avatars-plateau.css';");
  const coque = duel.indexOf("import './rpg-portrait.css';");
  assert.ok(paysage >= 0 && coque > paysage,
    'la coque portrait doit l\'emporter sur les règles du paysage');
});

test('le HUD debout ne reprend aucune piste du paysage', () => {
  // Les zones `enemy-mana`, `mana`, `controls` et `hand` du paysage créaient
  // des pistes implicites : la main et les commandes sortaient de l'écran.
  assert.match(bloc, /grid-column:\s*1 \/ -1/, 'tous les enfants rentrent dans l’unique colonne');
  assert.match(bloc, /\.rpg-hand-dock[\s\S]*?grid-area:\s*main/, 'la main occupe la rangée `main`');
  assert.match(bloc, /\.rpg-turn-rail[\s\S]*?flex-direction:\s*row/, 'le rail du tour est horizontal');
  assert.match(bloc, /\.rpg-wizard-plate__avatar[\s\S]*?position:\s*relative/, 'le médaillon rentre dans sa plaque');
  assert.match(bloc, /:has\(\.card-row\[data-lignes="true"\]\)[\s\S]*?grid-template-rows:/,
    'la variante deux rangées garde les sept rangées debout');
});
