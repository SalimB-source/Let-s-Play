import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const battleCss = fs.readFileSync(path.join(ROOT, 'src/games/rpg-battle.css'), 'utf8');

/** Le corps d'une règle, sélecteurs multiples acceptés (`a, b { … }`). */
function corpsDe(selecteurs) {
  const motif = new RegExp(`(?:^|\\n)${selecteurs}\\s*\\{([^}]*)\\}`, 'g');
  const blocs = [...battleCss.matchAll(motif)].map((m) => m[1]);
  assert.ok(blocs.length > 0, `règle introuvable : ${selecteurs}`);
  return blocs.join('\n');
}

test('Fiche de carte : le duo carte + vitrine est centré en hauteur', () => {
  const duo = corpsDe('\\.rpg-card-peek__duo');
  // La rangée du volet fait toute la hauteur restante : un enfant étiré et
  // aligné en haut collait la fiche sous le bord supérieur de l'écran.
  assert.doesNotMatch(
    duo,
    /align-items:\s*center/,
    'le duo ne centre pas par align-items : une fiche plus haute que l’écran y serait rognée par le haut',
  );

  const centrage = corpsDe(
    '\\.rpg-card-peek__duo\\s*>\\s*\\.rpg-card-peek__panel,\\s*\\n\\.rpg-card-peek__duo\\s*>\\s*\\.rpg-vitrine',
  );
  assert.match(
    centrage,
    /margin-block:\s*auto/,
    'la fiche et sa vitrine se centrent par marges automatiques — elles retombent à zéro quand la fiche dépasse l’écran',
  );
});

test('Fiche de carte : l’illustration se centre contre sa colonne de texte', () => {
  const empile = corpsDe(
    '\\.rpg-hover-card-preview--catalogue\\s+\\.rpg-hover-card-preview__empile',
  );
  assert.match(
    empile,
    /align-self:\s*center/,
    'l’illustration se cale au milieu de la fiche quand le texte est plus long qu’elle',
  );

  // La colonne de texte, elle, garde son alignement en haut : c'est elle qu'on lit.
  const fiche = corpsDe('\\.rpg-card-peek--catalogue\\s+\\.rpg-hover-card-preview');
  assert.match(
    fiche,
    /align-items:\s*start/,
    'la colonne de texte de la fiche reste alignée en haut',
  );
});

test('Fiche de carte : le centrage ne déborde pas sur la fiche d’appui long', () => {
  // Le volet d'appui long n'a ni vitrine ni duo : il centre déjà son panneau
  // par `align-content`. La règle du duo ne doit pas le viser.
  assert.doesNotMatch(
    battleCss,
    /\.rpg-card-peek__panel\s*\{[^}]*margin-block:\s*auto/,
    'le panneau seul (appui long) ne reçoit pas les marges automatiques du duo',
  );
});

test('Fiche du catalogue mobile paysage : carte et règles au-dessus d’une boutique compacte', () => {
  assert.match(battleCss, /@media \(orientation: landscape\) and \(max-height: 760px\)/,
    'le paysage du WebView est reconnu même s’il annonce un pointeur de souris');
  const mobile = (selecteur) => corpsDe(`\\s*${selecteur}`);
  const duo = mobile('\\.rpg-card-peek--catalogue:has\\(\\.rpg-vitrine\\) \\.rpg-card-peek__duo');
  assert.match(duo, /display:\s*flex;\s*flex-direction:\s*column/,
    'la boutique passe sous la carte, et non dans une troisième colonne étroite');
  assert.match(duo, /width:\s*min\(680px, 100%\)/);
  assert.match(duo, /overflow-y:\s*auto/,
    'la fiche défile si les effets ou les actions dépassent');
  const apercu = mobile('\\.rpg-card-peek--catalogue:has\\(\\.rpg-vitrine\\) \\.rpg-hover-card-preview');
  assert.match(apercu, /grid-template-columns:\s*minmax\(110px, min\(280px, 40dvh\)\) minmax\(0, 1fr\)/,
    'carte et règles restent côte à côte');
  assert.match(mobile('\\.rpg-card-peek--catalogue:has\\(\\.rpg-vitrine\\) \\.rpg-hover-card-preview__details'), /overflow-y:\s*auto/);
  const vitrine = mobile('\\.rpg-card-peek--catalogue \\.rpg-vitrine');
  assert.match(vitrine, /grid-template-columns:\s*min\(140px, 18dvh\) minmax\(0, 1fr\)/,
    'le portrait alternatif miniature est à gauche de son action');
  assert.match(mobile('\\.rpg-card-peek--catalogue \\.rpg-vitrine__art'), /grid-column:\s*1;\s*grid-row:\s*1 \/ span 5/);
  assert.match(vitrine, /max-height:\s*none/,
    'la vitrine peut grandir dans le volet défilant sans cacher ses commandes');
  assert.match(battleCss, /\.rpg-card-peek__bar\s*\{[^}]*z-index:\s*1/s,
    'Fermer reste hors de la zone qui défile');
});
