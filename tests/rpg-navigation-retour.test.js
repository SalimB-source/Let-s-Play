import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { avancerEcranJeu, reculerEcranJeu } from '../src/games/rpgNavigationBack.js';

const lire = (fichier) => readFileSync(new URL(fichier, import.meta.url), 'utf8');

test('Retour remonte chaque écran et s’arrête au menu principal', () => {
  let historique = [];
  for (const [depart, arrivee] of [['jouer', 'decks'], ['decks', 'catalogue'], ['catalogue', 'partie']]) {
    historique = avancerEcranJeu(historique, depart, arrivee);
  }
  for (const [ecran, precedent] of [['partie', 'catalogue'], ['catalogue', 'decks'], ['decks', 'jouer'], ['jouer', 'jouer']]) {
    const resultat = reculerEcranJeu(historique, ecran);
    assert.equal(resultat.ecran, precedent);
    historique = resultat.historique;
  }
  assert.deepEqual(historique, []);
});

test('un retour volontaire au menu efface l’historique, jamais le site dans la pile', () => {
  assert.deepEqual(avancerEcranJeu(['jouer', 'tours'], 'partie', 'jouer'), []);
  assert.deepEqual(reculerEcranJeu([], 'moba'), { ecran: 'jouer', historique: [] });
  assert.deepEqual(reculerEcranJeu([], 'jouer'), { ecran: 'jouer', historique: [] });
});

test('le Sablier ne propose plus de sortie vers le mode fenêtré', () => {
  const page = lire('../src/games/RpgDuelPage.jsx');
  const moba = lire('../src/games/RpgMobaBoard.jsx');
  assert.doesNotMatch(page, /onToggleFullscreen|basculerPleinEcran|rpg-mode-menu__fullscreen|rpg-duel-nav__fullscreen/);
  assert.doesNotMatch(moba, /onToggleFullscreen|moba__fullscreen/);
  assert.match(page, /entrerPleinEcran\(\{ pinned: true, native: false \}\)/);
  assert.match(page, /if \(window\.LetsPlayAndroid\) return undefined;/);
  assert.match(page, /if \(!window\.LetsPlayAndroid && window\.matchMedia\?\.\('\(pointer: coarse\)'\)\.matches\) entrerPleinEcran\(\);/);
  assert.match(page, /window\.letsPlayGameBack = retourJeu/);
});

test('l’APK utilise Retour pour le jeu, sans quitter le menu ni la WebView plein écran', () => {
  const java = lire('../android/app/src/main/java/dz/letsplay/officiel/MainActivity.java');
  const retour = java.slice(java.indexOf('public void onBackPressed()'), java.indexOf('protected void onSaveInstanceState(', java.indexOf('public void onBackPressed()')));
  assert.match(retour, /videoView != null[\s\S]*?exitFullscreen\(\)/);
  assert.match(retour, /estPageSablier\(\)[\s\S]*?letsPlayGameBack/);
  assert.match(retour, /else if \(!jeuDedie\(\)\)/);
  assert.match(java, /SYSTEM_UI_FLAG_HIDE_NAVIGATION \| View\.SYSTEM_UI_FLAG_IMMERSIVE_STICKY/);
  assert.match(java, /estPageSablier\(\) \? 0 : WindowInsets\.Type\.systemBars\(\)/);
});
