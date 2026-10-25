import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (chemin) => readFileSync(new URL(chemin, import.meta.url), 'utf8');

/** L'onglet « Jeu Solo » ne dépend plus d'un emoji : son dessin est à lui. */
test('l’onglet Jeu Solo porte la tour au sablier, pas l’ancien emoji', () => {
  const page = lire('../src/games/RpgDuelPage.jsx');
  const ancienEmoji = String.fromCodePoint(0x1F5FC); // U+1F5FC, sans glyphe dans la source
  assert.ok(!page.includes(ancienEmoji), 'l’ancien emoji a disparu de la barre des modes');
  assert.match(page, /import RpgSoloIcon from '\.\/RpgSoloIcon\.jsx';/,
    'le composant de l’icône est importé');

  const onglet = page.match(/<button[^>]*aria-label="Jeu Solo"[\s\S]{0,600}?<\/button>/)?.[0] ?? '';
  assert.match(onglet, /rpg-mode-menu__onglet-icone--solo/,
    'le span de l’onglet garde une classe dédiée pour sa taille');
  assert.match(onglet, /<RpgSoloIcon\s*\/>/, 'le dessin remplace le glyphe');
  assert.match(onglet, />Jeu Solo</, 'le libellé reste lisible et audible');
});

test('le SVG dessine une tour, un sablier et un grain unique', () => {
  const svg = lire('../public/icons/sablier/jeu-solo.svg');
  assert.match(svg, /viewBox="0 0 24 24"/, 'l’icône tient dans une grille de 24 px');
  assert.match(svg, /linearGradient id="sablier-jeu-solo-or"/,
    'l’or du Sablier est porté par le fichier, pas par la police du système');
  assert.match(svg, /M7 21V5\.5h2\.2V3\.7/, 'les créneaux de la tour sont dessinés');
  assert.match(svg, /M9\.2 11\.3h5\.6L12 14\.9Z/, 'le sable du haut du sablier est dessiné');
  assert.match(svg, /M9\.2 18\.2h5\.6L12 14\.6Z/, 'le sable du bas du sablier est dessiné');
  assert.match(svg, /<circle cx="12" cy="14\.75"/, 'un grain unique marque le parcours solo');
});

test('le composant sert l’icône embarquée et reste décoratif', () => {
  const composant = lire('../src/games/RpgSoloIcon.jsx');
  assert.match(composant, /icons\/sablier\/jeu-solo\.svg/,
    'le composant pointe vers le dessin du dossier public/icons');
  assert.match(composant, /import\.meta\.env\.BASE_URL/,
    'le chemin suit la base du site (GitHub Pages, Vercel, coque PC)');
  assert.match(composant, /alt=""/, 'l’image n’est pas relue par les lecteurs d’écran');
  assert.match(composant, /aria-hidden="true"/, 'le dessin reste décoratif');

  const css = lire('../src/games/rpg-battle.css');
  assert.match(css, /\.rpg-solo-icon\s*\{[^}]*width: 1em;[^}]*height: 1em;/s,
    'l’icône suit la taille des autres icônes d’onglets');
});
