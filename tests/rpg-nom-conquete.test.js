import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (chemin) => readFileSync(new URL(chemin, import.meta.url), 'utf8');

/** L'ancien « Jeu Solo » s'appelle désormais « Conquête » dans l'interface. */
test('le mode Conquête porte son nom sur la carte, l’écran et les en-têtes', () => {
  const page = lire('../src/games/RpgDuelPage.jsx');
  assert.doesNotMatch(page, /aria-label="Conquête"/,
    'la Conquête n’est plus annoncée comme onglet de la barre');
  assert.doesNotMatch(page, /<span className="rpg-mode-menu__onglet-libelle">Conquête<\/span>/,
    'la barre ne porte plus le libellé Conquête');
  assert.match(page, /<strong>Conquête<\/strong>/,
    'la carte de la page Jouer porte le nouveau nom');
  assert.match(page, /aria-label="Conquête — les Tours de Bab El"/,
    'la région des tours est annoncée avec le nouveau nom');
  assert.match(page, /CONQUÊTE · \{resumeLibre\.vaincus\} \/ \{resumeLibre\.total\} ÉTAGES DÉBLAYÉS/,
    'l’en-tête d’une tour ouverte est renommé');
  assert.match(page, /CONQUÊTE · LES TOURS DE BAB EL/,
    'l’en-tête de la galerie des tours est renommé');
  assert.doesNotMatch(page, /Jeu Solo|JEU SOLO|jeu solo/,
    'aucun libellé ou commentaire de la page ne garde l’ancien nom');
});

test('l’icône Conquête annonce elle aussi le nouveau nom', () => {
  const svg = lire('../public/icons/sablier/conquete.svg');
  const composant = lire('../src/games/RpgConqueteIcon.jsx');
  assert.match(svg, /<title id="titre">Conquête — la tour au sablier<\/title>/,
    'le titre du SVG annonce la Conquête');
  assert.doesNotMatch(svg, /Jeu Solo|JEU SOLO|jeu solo/, 'le SVG ne garde pas l’ancien nom');
  assert.doesNotMatch(composant, /Jeu Solo|JEU SOLO|jeu solo/,
    'le composant de l’icône ne garde pas l’ancien nom');
});
