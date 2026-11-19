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

test('Rail d’avatars : le portrait du joueur est centré sur la table, sous son champ', () => {
  const plaque = railSeul.slice(railSeul.indexOf('.card-table > .rpg-wizard-plate'), railSeul.indexOf('/* 2.'));
  assert.match(plaque, /left: 50%;/, 'le portrait tient l’axe de la table');
  assert.match(plaque, /transform: translateX\(-50%\);/, 'centré sur cet axe');
  assert.match(plaque, /:not\(\.rpg-battle--touch\)/, 'le plateau tactile garde sa disposition');
  assert.doesNotMatch(plaque, /rpg-rail-marge/, 'plus d’ancrage dans la colonne de gauche');
  assert.match(plaque, /--joueur/, 'seul le joueur est centré : le sorcier garde son bandeau');
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
  assert.match(ennemi, /top: calc\(var\(--rpg-essai-ennemi-top\)[^;]*var\(--rpg-vie-bar-height\) \+ var\(--rpg-rail-nom-h\) \+ 9px\);/s,
    'la jauge adverse reste sous son portrait, au-dessus de ses rangées');
  assert.match(joueur, /\+ 6px \+ var\(--rpg-rail-nom-h\) \+ 6px\);/,
    'la jauge du joueur passe au-dessus du nom, qui est au-dessus du médaillon');
  assert.match(joueur, /top: auto;/, 'la jauge du joueur n’est plus ancrée par le haut');
  assert.match(joueur, /bottom: calc\(var\(--rpg-rail-joueur-bottom\) \+ var\(--rpg-avatar-plateau\)/,
    'elle s’empile au-dessus du médaillon, lui-même au-dessus du bas de la table');
  assert.match(joueur, /left: 50%;/, 'centrée comme son portrait');
  assert.match(joueur, /transform: translateX\(-50%\);/);
});

test('Rail d’avatars : piles et main cachée cèdent la colonne', () => {
  const reste = railSeul.slice(railSeul.indexOf('/* 4.'));
  assert.match(reste, /\.card-table > \.rpg-card-piles--player/);
  assert.match(reste, /\.card-table > \.rpg-hidden-hand/, 'la main cachée du sorcier était collée à gauche');
  assert.match(reste, /left: calc\(var\(--rpg-rail-marge\) \+ var\(--rpg-rail-largeur\) \+ 10px\);/,
    'les deux se rangent à droite du rail');
});

test('Rail d’avatars : le joueur se pose au milieu, au-dessus du dock de la main', () => {
  const bloc = railSeul.slice(railSeul.indexOf('/* 5.'));
  assert.match(bloc, /\.rpg-wizard-plate--joueur \{\s*top: auto;\s*bottom: var\(--rpg-rail-joueur-bottom\);\s*z-index: 60;/s,
    'la plaque se pose au bas de la table et passe au-dessus du dock');
  assert.match(railSeul, /--rpg-rail-joueur-bottom: calc\(10px \+ var\(--rpg-vie-bar-height\) \+ 4px\);/,
    'la barre de vie garde ses quelques pixels sous le médaillon');
  const dock = railSeul.slice(railSeul.indexOf('/* 6.'));
  assert.match(dock, /\.rpg-hand-dock \.rpg-hand \{\s*justify-content: center;/,
    'la main se centre : elle partait du bord gauche, par-dessus la colonne');
  assert.match(dock, /\.rpg-hand__ecart \{\s*flex: 0 0 calc\(var\(--rpg-avatar-plateau\) \+ 26px\);/,
    'la cale réserve la largeur du portrait entre les deux moitiés');
  assert.match(dock, /pointer-events: none;/, 'la cale ne capte pas les clics du portrait');
  assert.match(railSeul, /--rpg-rail-ascension-joueur-top: calc\(44% \+ clamp\(72px, min\(7\.2vw, 12vh\), 104px\) \+ 64px\);/,
    'la même expression que le bloc Ascension de rpg-ascension.css');
  assert.match(railSeul, /--rpg-rail-ascension-joueur-top: calc\(42% \+ clamp\(72px, min\(7\.2vw, 12vh\), 104px\) \+ 64px\);/,
    'et sa variante du mode essai');
  assert.doesNotMatch(railSeul, /--rpg-rail-bas-joueur/, 'plus d’ancrage au bas de la table');
});

test('Rail d’avatars : le sorcier garde son bandeau du haut, rien ne s’empile dans la colonne', () => {
  assert.doesNotMatch(railSeul, /--rpg-wizard-plate--ennemi/,
    'aucune règle de rail ne déplace plus le portrait adverse');
  assert.doesNotMatch(railSeul, /--rpg-rail-ennemi-bottom/,
    'plus d’ancrage du sorcier au ras du paquet');
  // Le sorcier reste réglé par le haut du plateau (`top: 1 %`, 12,5 % en essai) :
  // deux portraits empilés ne tiendraient pas dans la même colonne.
  assert.match(plateau, /\.rpg-wizard-plate--ennemi\s*\{[^}]*top: 1%/s);
});

test('Main coupée en deux : la page pose la cale à la moitié de la main', () => {
  const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  assert.match(page, /const coupeMain = groupesMain\.length >= 8\s*\n\s*\? Math\.ceil\(groupesMain\.length \/ 2\)\s*\n\s*: Math\.min\(3, Math\.floor\(groupesMain\.length \/ 2\)\);/,
    'trois cartes à gauche jusqu’à sept, la moitié au-delà');
  assert.match(page, /position === coupeMain && <span className="rpg-hand__ecart" aria-hidden="true" \/>/,
    'la cale s’insère entre les deux moitiés');
  // Six cartes : trois à gauche, trois à droite ; sept : trois et quatre.
  const coupe = (n) => (n >= 8 ? Math.ceil(n / 2) : Math.min(3, Math.floor(n / 2)));
  assert.deepEqual([0, 1, 2, 4, 6, 7, 8, 10].map(coupe), [0, 0, 1, 2, 3, 3, 4, 5]);
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
