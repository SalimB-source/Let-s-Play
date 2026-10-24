import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const lire = (chemin) => readFileSync(new URL(`../${chemin}`, import.meta.url), 'utf8');

test('icône des Ténèbres : tête de mort sur les cartes, l’atelier, le guide, les coffrets et les jauges de mana', () => {
  const box = lire('src/games/RpgDeckBox.jsx');
  const duelPage = lire('src/games/RpgDuelPage.jsx');
  const atelier = lire('src/games/RpgDeckAtelier.jsx');
  const assistant = lire('src/games/RpgDeckAssistant.jsx');
  const rules = lire('src/games/RpgCardRules.jsx');
  const guide = lire('src/games/RpgCardGuide.jsx');
  const battleCss = lire('src/games/rpg-battle.css');

  for (const [nom, source] of [
    ['RpgDuelPage.jsx', duelPage],
    ['RpgDeckAtelier.jsx', atelier],
    ['RpgDeckAssistant.jsx', assistant],
    ['RpgCardRules.jsx', rules],
    ['RpgCardGuide.jsx', guide],
  ]) {
    assert.doesNotMatch(source, /⚖/, `${nom} n’affiche plus la balance pour les Ténèbres`);
    assert.match(source, /tenebres:\s*(?:\{\s*glyph:\s*)?'💀'/, `${nom} utilise la tête de mort 💀 pour les Ténèbres`);
  }

  const tenebresEmblem = box.slice(box.indexOf('  // Ténèbres'));
  assert.doesNotMatch(tenebresEmblem, /M4 7\.6h16/, 'l’ancien emblème SVG de balance a disparu de RpgDeckBox.jsx');
  assert.match(tenebresEmblem, /fillRule="evenodd"/, 'l’emblème SVG des Ténèbres dessine la tête de mort ajourée');
  assert.match(
    battleCss,
    /\.rpg-card-element-badge__pip--tenebres\s*\{\s*background:\s*radial-gradient/,
    'la pastille Ténèbres des cartes hybrides porte son fond violet sombre',
  );
});
