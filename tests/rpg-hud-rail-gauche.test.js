import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const plateau = readFileSync(new URL('../src/games/rpg-avatars-plateau.css', import.meta.url), 'utf8');
const battle = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');

/** Le bloc du rail, du commentaire d'ouverture à la fin de sa requête média. */
const debut = plateau.indexOf("Rail d'avatars à gauche");
const rail = debut < 0 ? '' : plateau.slice(debut);
// Le rail ferme le fichier : tout ce qui suit son commentaire lui appartient.
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
  for (const [camp, bloc] of [['adverse', ennemi], ['joueur', joueur]]) {
    assert.match(bloc, /var\(--rpg-vie-bar-height\) \+ var\(--rpg-rail-nom-h\) \+ 9px/,
      `la jauge ${camp} passe sous la barre de vie et sous le nom`);
  }
  assert.match(joueur, /bottom: calc\(var\(--rpg-rail-bas-joueur\)/, 'la jauge du joueur s’accroche au bas, comme sa plaque');
});

test('Rail d’avatars : piles et main cachée cèdent la colonne', () => {
  const reste = railSeul.slice(railSeul.indexOf('/* 4.'));
  assert.match(reste, /\.card-table > \.rpg-card-piles--player/);
  assert.match(reste, /\.card-table > \.rpg-hidden-hand/, 'la main cachée du sorcier était collée à gauche');
  assert.match(reste, /left: calc\(var\(--rpg-rail-marge\) \+ var\(--rpg-rail-largeur\) \+ 10px\);/,
    'les deux se rangent à droite du rail');
});
