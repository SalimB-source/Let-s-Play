import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { plateauParId, resoudrePlateauxDuDuel, vignettePlateauRelative } from '../src/games/rpgPlateaux.js';
import { RPG_PLATEAU_MUSIC_FILES } from '../src/games/rpgPlateauMusic.js';
import { tablePlaqueFile, tableSceneTheme } from '../src/games/rpgTableSceneThemes.js';

const lire = (fichier) => readFileSync(new URL(fichier, import.meta.url), 'utf8');
const tailleJpeg = (file) => {
  const data = readFileSync(file);
  for (let i = 2; i < data.length;) {
    if (data[i] !== 0xff) { i += 1; continue; }
    const marker = data[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return [data.readUInt16BE(i + 7), data.readUInt16BE(i + 5)];
    }
    i += 2 + data.readUInt16BE(i + 2);
  }
  return null;
};

test('la lice viking est un nouveau plateau sélectionnable, avec fond 4K et vignette', () => {
  const plateau = plateauParId('champ-de-bataille-viking');
  assert.ok(plateau?.choixSeulement);
  assert.match(plateau.nom, /bataille viking/i);
  assert.match(plateau.resume, /plumes.*flottent/i);
  assert.match(plateau.resume, /au milieu, un Valknut.*triangles entrelacés/i,
    'le symbole nordique est gravé au centre sans couvrir les cartes');
  assert.match(plateau.resume, /Aucun brasero ni flamme/i, 'la nouvelle peinture est froide, sans feu');
  const fond = new URL(`../public/${plateau.fichier}`, import.meta.url);
  assert.deepEqual(tailleJpeg(fond), [3840, 2560]);
  const vignette = new URL(`../public/${vignettePlateauRelative(plateau)}`, import.meta.url);
  assert.ok(existsSync(vignette));
  assert.ok(statSync(vignette).size < 80 * 1024);
  assert.equal(tablePlaqueFile(plateau), plateau.fichier);
  const theme = tableSceneTheme(plateau.id);
  assert.equal(theme.objets.length, 0);
  assert.equal(theme.lights.length, 0, 'aucun ancien reflet de brasero en 3D');
  assert.ok(theme.particles.vx > 0 && theme.particles.vy < 0, 'du givre porté par le vent');
  assert.match(lire('../src/games/RpgDuelPage.jsx'), /RpgBraisesVikings/,
    'des étincelles flottent aux bords, sans flamme ni brasero');
  assert.equal(RPG_PLATEAU_MUSIC_FILES[plateau.id], '/Last Valkyrie song.mp3');
  assert.ok(existsSync(new URL('../public/Last Valkyrie song.mp3', import.meta.url)));
  assert.notEqual(RPG_PLATEAU_MUSIC_FILES[plateau.id], RPG_PLATEAU_MUSIC_FILES['village-viking']);
});

test('choisir la lice n’altère pas le terrain du deck adverse', () => {
  const terrain = resoudrePlateauxDuDuel({
    deckJoueur: 'serment-des-neuf-hivers',
    deckAdverse: 'veilleurs-du-desert',
    plateauChoisi: 'champ-de-bataille-viking',
  });
  assert.equal(terrain.joueur.plateau.id, 'champ-de-bataille-viking');
  assert.equal(terrain.adversaire.plateau.id, 'erg-du-sahara');
  assert.equal(terrain.decouper, true);
});

test('les plumes flottent dans leur moitié sans gêner les cartes, avec animation réductible', () => {
  const duel = lire('../src/games/RpgDuelPage.jsx');
  const calque = lire('../src/games/RpgPlumesVikings.jsx');
  const css = lire('../src/games/rpg-battle.css');
  assert.match(duel, /plateau\.id === 'champ-de-bataille-viking' && <RpgPlumesVikings cote=\{plateauDecoupe \? 'joueur' : 'entier'\}/);
  assert.match(duel, /plateauDecoupe && plateauAdverse\.id === 'champ-de-bataille-viking' && <RpgPlumesVikings cote="adverse"/);
  assert.match(calque, /aria-hidden="true"/);
  assert.match(css, /\.rpg-plumes-vikings--joueur\s*\{\s*clip-path: inset\(var\(--rpg-frontiere/);
  assert.match(css, /\.rpg-plumes-vikings--adverse\s*\{\s*clip-path: inset\(0 0 calc\(100% - var\(--rpg-frontiere/);
  assert.match(css, /\.rpg-plumes-vikings\s*\{[^}]*pointer-events: none/s);
  assert.match(css, /@keyframes rpg-plume-viking-flotte/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*?\.rpg-plumes-vikings__plume \{ animation: none; \}/);
});

test('les particules de feu restent sur les bords et suivent leur moitié de plateau', () => {
  const duel = lire('../src/games/RpgDuelPage.jsx');
  const braises = lire('../src/games/RpgBraisesVikings.jsx');
  const css = lire('../src/games/rpg-battle.css');
  assert.match(duel, /plateau\.id === 'champ-de-bataille-viking' && <RpgBraisesVikings cote=\{plateauDecoupe \? 'joueur' : 'entier'\}/);
  assert.match(duel, /plateauDecoupe && plateauAdverse\.id === 'champ-de-bataille-viking' && <RpgBraisesVikings cote="adverse"/);
  assert.match(braises, /aria-hidden="true"/);
  const positions = [...braises.matchAll(/\[(\d+), (\d+), \d+, -?\d+, [\d.]+, -?\d+\]/g)]
    .map(([, x, y]) => [Number(x), Number(y)]);
  assert.ok(positions.length >= 12, 'des étincelles visibles sur les bords du plateau');
  assert.ok(positions.every(([x, y]) => x <= 22 || x >= 82 || y <= 8 || y >= 94),
    'le centre et les zones de cartes restent dégagés');
  assert.match(css, /\.rpg-braises-vikings--joueur\s*\{\s*clip-path: inset\(var\(--rpg-frontiere/);
  assert.match(css, /\.rpg-braises-vikings--adverse\s*\{\s*clip-path: inset\(0 0 calc\(100% - var\(--rpg-frontiere/);
  assert.match(css, /\.rpg-braises-vikings\s*\{[^}]*pointer-events: none/s);
  assert.match(css, /@keyframes rpg-braise-viking-vole/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*?\.rpg-braises-vikings__etincelle \{ animation: none; \}/);
});

test('les étincelles vikings demeurent perceptibles par-dessus la peinture et le décor 3D', () => {
  const braises = lire('../src/games/RpgBraisesVikings.jsx');
  const css = lire('../src/games/rpg-battle.css');
  const tailles = [...braises.matchAll(/\[\d+, \d+, (\d+), -?\d+, [\d.]+, -?\d+\]/g)].map(([, taille]) => Number(taille));
  assert.ok(tailles.length >= 24 && tailles.every((taille) => taille >= 6), 'assez de braises lisibles sur un fond 4K');
  assert.match(css, /\.rpg-braises-vikings\s*\{[^}]*z-index:\s*1;/s,
    'les étincelles passent devant le canvas 3D et la vignette');
  assert.match(css, /\.rpg-braises-vikings__etincelle\s*\{[^}]*box-shadow:[^}]*rgba\(255, 113, 38, \.9\)/s,
    'un halo visible éclaire chaque braise sans ajout de flamme');
});
