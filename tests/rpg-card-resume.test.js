import test from 'node:test';
import assert from 'node:assert/strict';

import { LIMITE_RESUME, resumeCarte, simplifierRegleCarte, regleCarteLongue } from '../src/games/rpgCardResume.js';
import { cardById } from '../src/games/rpgCards.js';

/**
 * L'aperçu d'une carte ne peut pas réciter trois lignes de règles.
 * `rpgCardResume.js` raccourcit les mots-clés connus ; ces tests les tiennent
 * fixés sur les textes réellement imprimés — un raccourci qui ne mord plus ne
 * se voit nulle part ailleurs (le jeu et les fiches lisent la règle entière).
 */

test('la Contre-attaque se raccourcit dans les deux formulations du catalogue', () => {
  // « quand c’est un sort qui le cible » — Tojiro, Kusayla.
  for (const id of ['tojiro-le-pourfendeur', 'kusayla-roi-des-imazighen']) {
    const court = simplifierRegleCarte(cardById(id));
    // Le nettoyage des blancs colle les deux-points (`\s+([.;:,])` → `$1`).
    assert.match(court, /Contre-attaque ?: riposte aux coups et aux sorts\./u, id);
    assert.doesNotMatch(court, /lui inflige ses dégâts d’attaque/u, id);
  }
  // « quand c’est un sort — ciblé ou de zone — qui l’atteint » — Eirik.
  const eirik = simplifierRegleCarte(cardById('eirik-du-premier-serment'));
  assert.match(eirik, /Contre-attaque ?: riposte aux coups et aux sorts\./u);
  assert.doesNotMatch(eirik, /ciblé ou de zone/u, 'la définition complète reste sur la fiche');
});

test('la Compagnie d’Eirik tient en une ligne dans l’aperçu', () => {
  const court = simplifierRegleCarte(cardById('eirik-du-premier-serment'));
  assert.match(court, /Compagnie ?: \+1\/\+1 par autre Viking de son camp\./u);
  const resume = resumeCarte(cardById('eirik-du-premier-serment'));
  assert.ok(resume.length <= LIMITE_RESUME + 1, `résumé trop long (${resume.length})`);
  assert.match(resume, /^Contre-attaque/u, 'le résumé commence par le mot-clé, pas par sa définition');
});

test('la règle complète reste entière sur la carte', () => {
  const carte = cardById('eirik-du-premier-serment');
  assert.equal(regleCarteLongue(carte), true, 'l’aperçu sait qu’il doit ajouter le bloc défilant');
  assert.match(carte.text, /quand c’est un sort — ciblé ou de zone — qui l’atteint/u);
  assert.match(carte.text, /Compagnie — Tant qu’il est en jeu/u);
});
