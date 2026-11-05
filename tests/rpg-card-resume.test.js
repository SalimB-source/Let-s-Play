import test from 'node:test';
import assert from 'node:assert/strict';

import { LIMITE_RESUME, resumeCarte, simplifierRegleCarte, regleCarteLongue, conditionEmbuscadePourApercu } from '../src/games/rpgCardResume.js';
import { cardById, RPG_DUEL_CARDS, cardHasPrintedType } from '../src/games/rpgCards.js';

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

test('la condition colorée de chaque Vampire provient du texte imprimé et reste limitée au tour adverse', () => {
  const vampires = RPG_DUEL_CARDS.filter((carte) => carte.reactionTourAdverse
    && cardHasPrintedType(carte, 'Vampire'));
  assert.equal(vampires.length, 16);
  for (const carte of vampires) {
    const condition = conditionEmbuscadePourApercu(carte);
    assert.ok(condition, `condition de ${carte.id} absente`);
    assert.ok(carte.text.includes(`seulement si ${condition}.`), carte.id);
  }
  assert.equal(conditionEmbuscadePourApercu(cardById('chien-du-guet')), null);
  assert.equal(conditionEmbuscadePourApercu(cardById('embuscade')), null,
    'la Sorcellerie Embuscade n’est pas une créature jouable en réaction');
});

test('la condition est colorée et lisible dans les trois aperçus, sans teinter les autres cartes', async () => {
  const { readFileSync } = await import('node:fs');
  const { build } = await import('vite');
  const { default: React } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { JSDOM } = await import('jsdom');
  const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
  assert.match(css, /\.rpg-hover-card-preview__embuscade\s*\{[^}]*border-left:\s*3px solid #[\da-f]+;[^}]*background:\s*linear-gradient\([^}]*color:\s*#[\da-f]+;/is);

  const env = process.env.NODE_ENV;
  try {
    await build({
      logLevel: 'error',
      build: {
        ssr: 'src/games/RpgDuelPage.jsx',
        outDir: 'node_modules/.cache/rpg-embuscade-preview',
        emptyOutDir: true,
      },
    });
  } finally {
    if (env === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = env;
  }
  const { HoverCardPreview } = await import('../node_modules/.cache/rpg-embuscade-preview/RpgDuelPage.js');
  const vampires = RPG_DUEL_CARDS.filter((carte) => carte.reactionTourAdverse
    && cardHasPrintedType(carte, 'Vampire'));
  for (const variante of ['', 'appui-long', 'catalogue']) {
    for (const carte of vampires) {
      const markup = renderToStaticMarkup(React.createElement(HoverCardPreview, { carte, variante }));
      const dom = new JSDOM(markup);
      const condition = dom.window.document.querySelector('.rpg-hover-card-preview__embuscade');
      assert.equal(condition?.getAttribute('data-condition-embuscade'), carte.conditionEmbuscade,
        `${carte.id} : ${variante || 'survol'}`);
      assert.equal(condition?.querySelector('span')?.textContent, `Jouable si ${conditionEmbuscadePourApercu(carte)}.`);
      dom.window.close();
    }
    const ordinaire = renderToStaticMarkup(React.createElement(HoverCardPreview, {
      carte: cardById('chien-du-guet'), variante,
    }));
    assert.doesNotMatch(ordinaire, /rpg-hover-card-preview__embuscade/);
  }
});
