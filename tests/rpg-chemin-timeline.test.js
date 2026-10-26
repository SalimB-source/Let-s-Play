import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/** « Le Chemin » — regression de la timeline et du vrai paquet du Souk. */
const lire = (chemin) => readFileSync(new URL(chemin, import.meta.url), 'utf8');
const piste = lire('../src/games/RpgPisteGains.jsx');
const paquet = lire('../src/games/RpgPaquetChemin.jsx');
const css = lire('../src/games/rpg-piste-gains.css');

test('la section du Chemin est une timeline espacée et scrollable', () => {
  assert.match(css, /--rpg-piste-pas: 168px/, 'les niveaux sont éloignés sur PC');
  assert.match(css, /\.rpg-piste \{[\s\S]{0,600}?overflow-y: auto;/,
    'la section défile en hauteur');
  assert.match(css, /\.rpg-piste__bande \{[\s\S]{0,500}?overflow-x: auto;/,
    'la bande défile à l’horizontale');
  assert.match(css, /\.rpg-piste__filet \{[\s\S]{0,700}?position: absolute;/,
    'un filet continu traverse les niveaux');
  assert.match(css, /\.rpg-piste__filet::after \{[\s\S]{0,500}?rotate\(45deg\)/,
    'un losange marque chaque jalon');
  assert.match(piste, /data-piste-scrollable=""/, 'le harnais sait que la section défile');
  assert.match(piste, /className="rpg-piste__defile"/, 'une aide au défilement est visible');
});

test('les icônes sont libres, sans carré ni rond', () => {
  assert.match(css, /\.rpg-piste__tuile \{[\s\S]{0,500}?border: 0;[\s\S]{0,260}?border-radius: 0;[\s\S]{0,200}?background: none;/,
    'plus de boîte autour des gains');
  assert.doesNotMatch(css, /\.rpg-piste__palier--rang \.rpg-piste__tuile \{\s*border-radius: 50%/,
    'plus de médaillon rond pour les rangs');
  assert.match(css, /\.rpg-piste__puce \{[\s\S]{0,400}?border: 0;/,
    'la pastille du cosmétique est libre aussi');
});

test('le paquet est le vrai sachet que le Souk ouvre', () => {
  assert.match(piste, /import RpgPaquetChemin from '\.\/RpgPaquetChemin\.jsx';/,
    'la piste utilise le composant du jeu');
  assert.match(piste, /import '\.\/rpg-souk\.css';/, 'avec la feuille du Souk');
  assert.match(paquet, /rpg-souk__sachet-ancre/, 'l’ancre vient de la cérémonie');
  assert.match(paquet, /className="rpg-piste__sachet rpg-souk__sachet"/,
    'le sachet reprend les classes de la cérémonie');
  assert.match(paquet, /rpg-souk__sachet-corps/, 'son corps est celui du jeu');
  assert.match(paquet, /rpg-souk__sachet-languette/, 'sa languette aussi');
  assert.match(paquet, /cardArt\(rayon\.vitrine\)/, 'avec la peinture de la vitrine');
  assert.match(paquet, /TAUX\.cartes/, 'et ses cinq cartes annoncées');
  assert.match(css, /\.rpg-piste__paquet-reel \.rpg-souk__sachet-ancre \{/,
    'la miniature réduit ce sachet sans le redessiner');
});
