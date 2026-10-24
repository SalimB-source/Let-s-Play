import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const soukCss = fs.readFileSync(path.join(ROOT, 'src/games/rpg-souk.css'), 'utf8');
const battleCss = fs.readFileSync(path.join(ROOT, 'src/games/rpg-battle.css'), 'utf8');
const profilCss = fs.readFileSync(path.join(ROOT, 'src/games/rpg-profil.css'), 'utf8');

function blocRegle(css, selecteurRegex) {
  const globalRegex = new RegExp(selecteurRegex.source, `${selecteurRegex.flags.replace(/g/g, '')}g`);
  const matches = [...css.matchAll(globalRegex)];
  assert.ok(matches.length > 0, `règle introuvable : ${selecteurRegex}`);
  return matches.map((m) => m[1]).join('\n');
}

test('Booster : aucun voile noir 3D sur les cartes ouvertes (.rpg-souk__carte ne coupe plus .rpg-souk__carte-volume)', () => {
  const carte = blocRegle(soukCss, /(?:^|\n)\.rpg-souk__carte\s*\{([^}]*)\}/);
  assert.match(carte, /background:\s*transparent\s*;/,
    '.rpg-souk__carte reste transparente pour ne jamais voiler la moitié inclinée en Z < 0');
  assert.doesNotMatch(carte, /transform-style:\s*preserve-3d/,
    '.rpg-souk__carte isole la perspective de .rpg-souk__carte-volume au lieu de partager son plan Z = 0');
  assert.match(carte, /perspective:\s*\d+px\s*;/,
    '.rpg-souk__carte conserve la perspective 3D de la carte');

  assert.doesNotMatch(
    soukCss,
    /\.rpg-souk__carte\[data-souk-carte-rarete=['"](?:rare|mythique)['"]\]\s*\{/,
    'les fonds sombres de rareté ne sont plus peints sur le plan Z = 0 de .rpg-souk__carte',
  );

  const volume = blocRegle(soukCss, /(?:^|\n)\.rpg-souk__carte-volume\s*\{([^}]*)\}/);
  assert.match(volume, /transform-style:\s*preserve-3d\s*;/,
    '.rpg-souk__carte-volume porte la scène 3D interne');
  assert.match(volume, /background:\s*rgba\(/,
    'le fond de la carte bascule d’un bloc avec .rpg-souk__carte-volume');
  assert.doesNotMatch(
    soukCss,
    /\.rpg-souk__carte:hover\s+\.rpg-souk__carte-volume\s*\{[^}]*filter:/,
    'aucun filter sur .rpg-souk__carte-volume au survol (cela aplatirait preserve-3d)',
  );
});

test('Booster : le clic droit atteint toujours la carte ouverte et sa fiche passe au-dessus de la cérémonie', () => {
  const volume = blocRegle(soukCss, /(?:^|\n)\.rpg-souk__carte-volume\s*\{([^}]*)\}/);
  assert.doesNotMatch(volume, /pointer-events:\s*none/,
    '.rpg-souk__carte-volume doit rester cliquable : sinon le compositeur 3D traverse la coque transparente .rpg-souk__carte');

  const verso = blocRegle(soukCss, /(?:^|\n)\.rpg-souk__carte-verso\s*\{([^}]*)\}/);
  assert.match(verso, /pointer-events:\s*none\s*;/,
    'le verso décoratif ne vole jamais le clic droit aux cartes révélées');

  assert.match(
    soukCss,
    /\[data-souk-phase=['"]termine['"]\]\s+\.rpg-souk__carte-retourne\.is-revelee\s*\{[^}]*transform-style:\s*flat\s*;/,
    'une fois retournées, les cartes sortent du preserve-3d parent pour un hit-testing 2D/3D sans ambiguïté',
  );

  assert.match(
    soukCss,
    /\.rpg-souk__carte-retourne:not\(\.is-revelee\)\s*>\s*\.rpg-souk__carte\s*\{\s*pointer-events:\s*none;\s*\}/,
    'les cartes non retournées ne répondent pas au pointeur',
  );

  // La cérémonie d'un paquet offert monte à z-index: 10045 (rpg-profil.css) :
  // .rpg-card-peek doit passer strictement au-dessus lorsqu'un booster est ouvert.
  const zOffert = Number(profilCss.match(/\.rpg-battle \.rpg-souk__ceremonie\[data-souk-ceremonie-offert\]\s*\{\s*z-index:\s*(\d+)/)?.[1]);
  assert.equal(zOffert, 10045);

  const zPeekBattle = Number(battleCss.match(/\.rpg-battle:has\(\[data-souk-ceremonie\]\)\s*\.rpg-card-peek\s*\{\s*z-index:\s*(\d+)/)?.[1]);
  const zPeekProfil = Number(profilCss.match(/\.rpg-battle:has\(\[data-souk-ceremonie\]\)\s*\.rpg-card-peek\s*\{\s*z-index:\s*(\d+)/)?.[1]);
  assert.ok(zPeekBattle > zOffert, `rpg-battle.css élève .rpg-card-peek (${zPeekBattle}) au-dessus de ${zOffert}`);
  assert.ok(zPeekProfil > zOffert, `rpg-profil.css élève .rpg-card-peek (${zPeekProfil}) au-dessus de ${zOffert}`);
});

test('Booster : les cartes gagnées s’affichent sur 5 colonnes', () => {
  const grille = blocRegle(soukCss, /(?:^|\n)\.rpg-souk__ceremonie-cartes\s*\{([^}]*)\}/);
  assert.match(grille, /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)\s*;/,
    'les 5 cartes d’un paquet s’alignent sur 5 colonnes');
});
