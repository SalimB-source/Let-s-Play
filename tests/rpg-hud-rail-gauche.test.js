import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const plateau = readFileSync(new URL('../src/games/rpg-avatars-plateau.css', import.meta.url), 'utf8');
const battle = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');

/** Le bloc du rail, du commentaire d'ouverture à la fin de sa requête média. */
const debut = plateau.indexOf("Rail d'avatars à gauche");
// Le rail finit là où commence le bloc tactile du paysage, ajouté après lui.
const finRail = plateau.indexOf('Au doigt, en paysage : les deux avatars encadrent la médiane');
const rail = debut < 0 ? '' : plateau.slice(debut, finRail > debut ? finRail : undefined);
// Le rail ne contient que sa propre requête média.
const railSeul = rail;

test('Rail d’avatars : la colonne gauche devient un rail, réservé à la souris large', () => {
  assert.ok(railSeul, 'le bloc « Rail d\'avatars à gauche » doit exister');
  assert.match(railSeul, /@media \(min-width: 900px\) and \(hover: hover\) and \(pointer: fine\)/,
    'le rail ne s’applique qu’à la souris sur écran large');
  assert.match(railSeul, /--rpg-rail-marge: 14px;/);
  assert.match(railSeul, /--rpg-rail-largeur: clamp\(150px, 14vw, 190px\);/);
  assert.doesNotMatch(plateau.slice(0, debut), /--rpg-rail-largeur/,
    'aucune trace du rail hors de sa requête média');
});

test('Rail d’avatars : le rail tient dans la marge déjà réservée aux rangées de cartes', () => {
  const marge = Number(railSeul.match(/--rpg-rail-marge: (\d+)px/)[1]);
  const largeurMax = Number(railSeul.match(/--rpg-rail-largeur: clamp\(150px, 14vw, (\d+)px\)/)[1]);
  const decalage = Number(railSeul.match(/var\(--rpg-rail-largeur\) \+ (\d+)px/)[1]);
  const gaucheRangees = Number(battle.match(/\.card-row \{\n  z-index: 4;\n  left: clamp\((\d+)px, 20%, 280px\)/)[1]);
  assert.ok(marge + largeurMax + decalage <= gaucheRangees,
    `le rail (${marge} + ${largeurMax} + ${decalage}px) doit finir avant la zone de jeu (${gaucheRangees}px)`);
});

test('Rail d’avatars : les portraits sont ancrés à gauche, plus sur l’axe central', () => {
  const plaque = railSeul.slice(railSeul.indexOf('.card-table > .rpg-wizard-plate'), railSeul.indexOf('/* 2.'));
  assert.match(plaque, /left: calc\(var\(--rpg-rail-marge\) \+ \(var\(--rpg-rail-largeur\) - var\(--rpg-avatar-plateau\)\) \/ 2\);/,
    'le portrait se centre dans la largeur du rail');
  assert.match(plaque, /transform: none;/, 'plus de translation depuis le centre');
  assert.match(plaque, /:not\(\.rpg-battle--touch\)/, 'le plateau tactile garde sa disposition');
  assert.doesNotMatch(plaque, /left: calc\(50%/, 'l’axe central n’est plus la référence');
});

test('Rail d’avatars : le nom revient sous la barre de vie', () => {
  const nom = railSeul.slice(railSeul.indexOf('/* 2.'), railSeul.indexOf('/* 3.'));
  assert.match(nom, /\.rpg-wizard-plate__profile-name, \.rpg-wizard-plate__enemy-name/);
  assert.match(nom, /display: block;/, 'le duel masquait ces noms');
  assert.match(nom, /top: calc\(100% \+ var\(--rpg-vie-bar-height\) \+ 5px\);/, 'le nom se pose sous les PV');
  assert.match(nom, /width: var\(--rpg-rail-largeur\);/, 'le nom prend la largeur du rail');
  assert.match(nom, /text-overflow: ellipsis;/, 'un nom trop long ne déborde pas du rail');
});

test('Rail d’avatars : la jauge de mana descend sous le nom, pas sous le seul médaillon', () => {
  const mana = railSeul.slice(railSeul.indexOf('/* 3.'), railSeul.indexOf('/* 4.'));
  assert.match(mana, /\.rpg-flux-track \{[^}]*left: var\(--rpg-rail-marge\);[^}]*width: var\(--rpg-rail-largeur\);/s,
    'la jauge garde la colonne du rail');
  const ennemi = mana.slice(mana.indexOf('--ennemi'), mana.indexOf('--joueur'));
  const joueur = mana.slice(mana.indexOf('--joueur'));
  assert.match(ennemi, /bottom: calc\(var\(--rpg-rail-ennemi-bottom\)[^;]*var\(--rpg-vie-bar-height\) \+ var\(--rpg-rail-nom-h\) \+ 12px\);/s,
    'la jauge adverse remonte au-dessus du portrait, dans la bande libre de la colonne');
  assert.match(joueur, /var\(--rpg-vie-bar-height\) \+ var\(--rpg-rail-nom-h\) \+ 9px/,
    'la jauge du joueur passe sous la barre de vie et sous le nom');
  assert.match(joueur, /top: calc\(var\(--rpg-rail-ascension-joueur-top\)/, 'la jauge du joueur suit sa plaque remontée');
});

test('Rail d’avatars : piles et main cachée cèdent la colonne', () => {
  const reste = railSeul.slice(railSeul.indexOf('/* 4.'));
  assert.match(reste, /\.card-table > \.rpg-card-piles--player/);
  assert.match(reste, /\.card-table > \.rpg-hidden-hand/, 'la main cachée du sorcier était collée à gauche');
  assert.match(reste, /left: calc\(var\(--rpg-rail-marge\) \+ var\(--rpg-rail-largeur\) \+ 10px\);/,
    'les deux se rangent à droite du rail');
});

test('Rail d’avatars : le joueur remonte sous son bloc Ascension, hors de portée de la main', () => {
  const bloc = railSeul.slice(railSeul.indexOf('/* 5.'));
  assert.match(bloc, /\.rpg-wizard-plate--joueur \{\s*top: calc\(var\(--rpg-rail-ascension-joueur-top\) \+ var\(--rpg-rail-ascension-h\)\);\s*bottom: auto;/s,
    'la plaque se pose sous l’Ascension, plus au ras du bas');
  assert.match(railSeul, /--rpg-rail-ascension-joueur-top: calc\(44% \+ clamp\(72px, min\(7\.2vw, 12vh\), 104px\) \+ 64px\);/,
    'la même expression que le bloc Ascension de rpg-ascension.css');
  assert.match(railSeul, /--rpg-rail-ascension-joueur-top: calc\(42% \+ clamp\(72px, min\(7\.2vw, 12vh\), 104px\) \+ 64px\);/,
    'et sa variante du mode essai');
  assert.doesNotMatch(railSeul, /--rpg-rail-bas-joueur/, 'plus d’ancrage au bas de la table');
});

test('Rail d’avatars : le sorcier descend au ras de la médiane, au-dessus du paquet du joueur', () => {
  assert.match(railSeul, /--rpg-rail-ennemi-bottom: calc\(56% \+ 8px\);/,
    'le portrait se pose juste au-dessus du paquet du joueur (`top: 44 %`)');
  assert.match(railSeul, /--rpg-rail-ennemi-bottom: calc\(58% \+ 8px\);/,
    'en essai, le paquet remonte à 42 %');
  const bloc = railSeul.slice(railSeul.indexOf('/* 6.'));
  assert.match(bloc, /\.rpg-wizard-plate--ennemi\s*\{\s*top: auto;\s*bottom: var\(--rpg-rail-ennemi-bottom\);\s*\}/s,
    'le sorcier quitte le haut de la table');
  assert.doesNotMatch(railSeul, /--ennemi[^{]*\{\s*top: 1%/,
    'plus d’ancrage à 1 % du haut');
});

test('Paysage tactile : les deux avatars encadrent la médiane, dans la colonne de gauche', () => {
  const bloc = plateau.slice(plateau.indexOf('Au doigt, en paysage : les deux avatars encadrent la médiane'));
  assert.ok(bloc, 'le bloc tactile du paysage doit exister');
  assert.match(bloc, /@media \(orientation: landscape\)/, 'il ne concerne que le paysage');
  assert.match(bloc, /left: calc\(6px \+ env\(safe-area-inset-left, 0px\)\);/, 'les pastilles quittent l’axe central');
  assert.match(bloc, /bottom: calc\(56% \+ 6px\);/, 'le sorcier se pose juste au-dessus du paquet du joueur');
  assert.match(bloc, /grid-area: mana;/, 'le joueur occupe la cellule qui ouvre sa moitié de table');
  assert.match(bloc, /top: 0;/, 'son bord haut est la ligne médiane');
  assert.doesNotMatch(bloc, /left: calc\(50%/, 'plus de centrage sur le champ');
});

test('Rail d’avatars : l’expression de l’Ascension reste celle de rpg-ascension.css', () => {
  const ascension = readFileSync(new URL('../src/games/rpg-ascension.css', import.meta.url), 'utf8');
  assert.match(ascension, /\.card-table > \.rpg-ascension-placement--joueur \{ left: 14px; top: calc\(44% \+ clamp\(72px, min\(7\.2vw, 12vh\), 104px\) \+ 64px\); \}/,
    'si le bloc Ascension bouge, le rail doit être réaligné');
});
