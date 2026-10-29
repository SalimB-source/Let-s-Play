import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (chemin) => readFileSync(new URL(chemin, import.meta.url), 'utf8');

/** La Conquête n'a plus d'onglet : sa bannière de l'accueil utilise la carte Tour des Ténèbres. */
test('la bannière Conquête utilise sa miniature de carte, sans l’ancien emoji, et le dessin partagé demeure disponible', () => {
  const page = lire('../src/games/RpgDuelPage.jsx');
  const icones = lire('../src/games/RpgModeIcon.jsx');
  const ancienEmoji = String.fromCodePoint(0x1F5FC); // U+1F5FC, sans glyphe dans la source
  assert.ok(!page.includes(ancienEmoji), 'l’ancien emoji a disparu de la barre des modes');
  assert.doesNotMatch(page, /import RpgConqueteIcon from '\.\/RpgConqueteIcon\.jsx';/,
    'la barre n’importe plus l’icône d’onglet');
  assert.doesNotMatch(page, /<button[^>]*aria-label="Conquête"[\s\S]{0,600}?<\/button>/,
    'plus d’onglet Conquête dans la barre');
  assert.match(page, /rpg-menu-button--conquete[\s\S]{0,300}?cardArt\('tour-des-tenebres'\)/,
    'la bannière Conquête utilise sa miniature tirée des cartes du jeu');
  assert.match(icones, /\bconquete:\s*\(/, 'le dessin de la Conquête est disponible');
  assert.match(page, /rpg-menu-button--conquete[\s\S]{0,480}?>Conquête</,
    'le libellé de la carte reste lisible');
});

test('le SVG dessine une tour, un sablier et un grain unique', () => {
  const svg = lire('../public/icons/sablier/conquete.svg');
  assert.match(svg, /viewBox="0 0 24 24"/, 'l’icône tient dans une grille de 24 px');
  assert.match(svg, /linearGradient id="sablier-conquete-or"/,
    'l’or du Sablier est porté par le fichier, pas par la police du système');
  assert.match(svg, /M7 21V5\.5h2\.2V3\.7/, 'les créneaux de la tour sont dessinés');
  assert.match(svg, /M9\.2 11\.3h5\.6L12 14\.9Z/, 'le sable du haut du sablier est dessiné');
  assert.match(svg, /M9\.2 18\.2h5\.6L12 14\.6Z/, 'le sable du bas du sablier est dessiné');
  assert.match(svg, /<circle cx="12" cy="14\.75"/, 'un grain unique marque la progression');
});

test('le composant historique sert l’icône embarquée et reste décoratif', () => {
  const composant = lire('../src/games/RpgConqueteIcon.jsx');
  assert.match(composant, /icons\/sablier\/conquete\.svg/,
    'le composant pointe vers le dessin du dossier public/icons');
  assert.match(composant, /import\.meta\.env\.BASE_URL/,
    'le chemin suit la base du site (GitHub Pages, Vercel, coque PC)');
  assert.match(composant, /data-icone-conquete=""/, 'le dessin porte son nouveau nom');
  assert.match(composant, /alt=""/, 'l’image n’est pas relue par les lecteurs d’écran');
  assert.match(composant, /aria-hidden="true"/, 'le dessin reste décoratif');

  const css = lire('../src/games/rpg-battle.css');
  assert.match(css, /\.rpg-conquete-icon\s*\{[^}]*width: 1em;[^}]*height: 1em;/s,
    'l’icône historique suit la taille des autres icônes d’onglets');
});
