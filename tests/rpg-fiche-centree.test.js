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

test('Fiche du catalogue mobile : coût, couleur et ATQ/DEF discrets sans modifier les cartes en jeu', () => {
  const debut = battleCss.indexOf('/* Sur la fiche mobile, les repères');
  assert.ok(debut >= 0, 'la réduction des repères de la fiche existe');
  const fin = battleCss.indexOf('/* ═', debut);
  const mobile = battleCss.slice(debut, fin);
  assert.match(mobile, /@media \(max-width: 720px\), \(orientation: landscape\) and \(max-height: 760px\)/,
    'portrait et paysage mobile, y compris WebView annonçant une souris');
  assert.match(mobile, /--rpg-card-marker-size:\s*clamp\(26px, min\(3\.4vw, 6dvh\), 34px\)/,
    'coût et couleur partagent un diamètre réduit, même dans un paysage large');
  assert.match(mobile, /font-size:\s*calc\(var\(--rpg-card-marker-size\) \* \.5\)/,
    'le glyphe de couleur suit le diamètre de sa pastille');
  assert.match(mobile, /grid-template-columns:\s*repeat\(2, max-content\)/,
    'les deux plaques ne s’étirent plus jusqu’au milieu de la carte');
  assert.match(mobile, /font-size:\s*clamp\(16px, min\(4\.5vw, 4\.4dvh\), 21px\)/,
    'ATQ/DEF gardent une taille lisible mais contenue');
  const selecteurs = mobile.split('\n').filter((ligne) => /^  \.rpg/.test(ligne));
  assert.ok(selecteurs.length >= 7);
  assert.ok(selecteurs.every((selecteur) => selecteur.includes('.rpg-card-peek--catalogue .rpg-hover-card-preview__face')),
    'aucun sélecteur ne réduit les cartes du plateau ni les autres aperçus');
});

test('Fiche mobile : carte et description légèrement réduites, sans toucher aux autres aperçus', () => {
  assert.match(corpsDe('\\s*\\.rpg-card-peek--catalogue \\.rpg-hover-card-preview__empile'),
    /width:\s*min\(100%, 288px, 50dvh\)/,
    'la carte portrait est plus petite mais garde son ratio');
  const debut = battleCss.indexOf('/* La fiche ouverte garde ses textes');
  const fin = battleCss.indexOf('/* Sur la fiche mobile, les repères', debut);
  assert.ok(debut >= 0 && fin > debut);
  const mobile = battleCss.slice(debut, fin);
  assert.match(mobile, /@media \(max-width: 720px\), \(orientation: landscape\) and \(max-height: 760px\)/);
  assert.match(mobile, /\.rpg-card-peek--catalogue \.rpg-hover-card-preview__details\s*\{[^}]*gap:\s*6px;[^}]*padding:\s*8px 10px/s);
  assert.match(mobile, /\.rpg-card-peek--catalogue \.rpg-hover-card-preview__rules\s*\{[^}]*font-size:\s*clamp\(12px, 1\.6vw, 13px\);[^}]*line-height:\s*1\.35/s,
    'le texte des effets ne descend pas sous 12 px');
  assert.match(mobile, /\.rpg-card-peek--catalogue \.rpg-hover-card-preview__embuscade\s*\{[^}]*font-size:\s*12px/s);
  assert.ok(mobile.split('\n').filter((ligne) => /^  \.rpg/.test(ligne))
    .every((ligne) => ligne.includes('.rpg-card-peek--catalogue .rpg-hover-card-preview__')),
  'aucun autre aperçu ou carte de jeu ne change');
});

test('Fiche du catalogue mobile paysage : carte et règles au-dessus d’une boutique compacte', () => {
  assert.match(battleCss, /@media \(orientation: landscape\) and \(max-height: 760px\)/,
    'le paysage du WebView est reconnu même s’il annonce un pointeur de souris');
  const mobile = (selecteur) => corpsDe(`\\s*${selecteur}`);
  const duo = mobile('\\.rpg-card-peek--catalogue:has\\(\\.rpg-vitrine\\) \\.rpg-card-peek__duo');
  assert.match(duo, /display:\s*flex;\s*flex-direction:\s*column/,
    'la boutique passe sous la carte, et non dans une troisième colonne étroite');
  assert.match(duo, /width:\s*min\(620px, 100%\)/,
    'la fiche est légèrement moins large, sans diminuer la zone de fermeture');
  assert.match(duo, /overflow-y:\s*auto/,
    'la fiche défile si les effets ou les actions dépassent');
  const apercu = mobile('\\.rpg-card-peek--catalogue:has\\(\\.rpg-vitrine\\) \\.rpg-hover-card-preview');
  assert.match(apercu, /grid-template-columns:\s*minmax\(110px, min\(250px, 36dvh\)\) minmax\(0, 1fr\)/,
    'carte un peu plus petite et règles toujours à côté');
  assert.match(mobile('\\.rpg-card-peek--catalogue:not\\(:has\\(\\.rpg-vitrine\\)\\) \\.rpg-hover-card-preview'),
    /grid-template-columns:\s*minmax\(110px, min\(250px, 36dvh\)\) minmax\(0, 1fr\)/,
    'la fiche ouverte sans vitrine suit la même échelle');
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
