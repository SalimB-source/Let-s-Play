/** L'avancée côté écran : les cases légales deviennent des boutons, la
 *  créature cliquée les montre, le sorcier avance avant de frapper, et une
 *  carte qui a percé se dessine dans la rangée qu'elle occupe. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/games/rpg-mana-essai.css', import.meta.url), 'utf8');

test('la page importe le moteur du pas et celui de l’IA', () => {
  assert.match(page, /import \{ deplacementsLegaux, rpgDeplacerCreature, rpgPeutBouger \} from '\.\/rpgMouvement\.js'/);
  assert.match(page, /import \{ rpgIABougerCreatures \} from '\.\/rpgMouvementIA\.js'/);
  assert.match(page, /import \{ campDeLaCreature, campPoseDe, envahisseurs, occupantsDeCamp, positionDe \} from '\.\/rpgChamp\.js'/);
});

test('la créature choisie ouvre ses cases d’avancée, dans les deux rangées', () => {
  const passes = page.match(/casesDeplacement=\{deplacementsAttaquant\.filter\(\(c\) => c\.camp === '(joueur|sorcier)'\)/g) ?? [];
  assert.equal(passes.length, 2, 'une rangée par camp');
  assert.match(page, /const deplacementsAttaquant = attaquantMobile && !modePvp\s*\n?\s*\? deplacementsLegaux\(duel, 'joueur', attaquantMobile\) : \[\];/);
  assert.match(page, /rpgDeplacerCreature\(duel, 'joueur', attaquantMobile, \{ camp, index \}\)/);
});

test('une créature qui peut encore avancer n’est pas envoyée d’office sur le sorcier', () => {
  assert.match(page, /&& !deplacementsLegaux\(duel, 'joueur', entite\.id\)\.length/);
});

test('le sorcier avance avant de frapper', () => {
  const debut = page.indexOf('const declarerAttaqueSorcier = (attaquantImpose = null) => {');
  assert.ok(debut > 0);
  const bloc = page.slice(debut, debut + 900);
  assert.match(bloc, /rpgIABougerCreatures\(duel, 'sorcier'\)/);
});

test('une carte avancée se dessine dans la rangée qu’elle occupe, avec son camp', () => {
  assert.match(page, /const proprietaire = campDeLaCreature\(duel, entite\) \?\? 'sorcier';/);
  assert.match(page, /const proprietaire = campDeLaCreature\(duel, entite\) \?\? 'joueur';/);
  const clics = page.match(/proprietaire === 'joueur' \? cliquerCreatureJoueur\(entite\) : cliquerCreatureEnnemie\(entite\)/g) ?? [];
  assert.equal(clics.length, 2, 'le clic suit le propriétaire, pas la rangée');
  // La rangée ne dessine que les créatures qui s'y tiennent : `campPoseDe`
  // écarte l'envahisseur de son ancienne rangée (sans quoi il apparaîtrait
  // deux fois — la figurine qui ne bouge pas et sa copie sur la case visée).
  assert.match(page, /const entites = \(duel\[cote\]\?\.creatures \?\? \[\]\)\s*\n?\s*\.filter\(\(entite\) => !campPose \|\| campPoseDe\(entite, cote\) === campPose\)/);
  // Les piles étrangères restent d'un seul exemplaire : pas de fusion entre camps.
  assert.match(page, /const etrangeres = campPose\s*\n?\s*\? envahisseurs\(duel, campPose\)\.map/);
  assert.match(page, /const clePile = \(cote, pile\) => `\$\{cote\}:\$\{campDeLaCreature/);
});

test('les cases se lisent sur la rangée réelle, envahisseurs compris', () => {
  assert.match(page, /occupantsDeCamp\(duel, campPose\)\.map\(\(\{ entite, index \}\) => \[entite\.id, index \+ 1\]\)/);
});

test('le survol montre les cases de pas en bleu, sans les engager', () => {
  // L'aperçu se calcule sur les cases légales du pas, hors phase d'attaque.
  assert.match(page, /const survolMouvant = \(\(\) => \{[\s\S]{0,420}?deplacementsLegaux\(duel, 'joueur', entite\.id\)/);
  assert.match(page, /if \(!entiteId \|\| modePvp \|\| phase \|\| !lignesActives\(duel\)\) return null;/);
  assert.match(page, /rpgPeutBouger\(duel, 'joueur', entite\)/, 'une créature qui a déjà marché ne montre rien');
  const poses = page.match(/casesSurvol=\{survolMouvant\?\.(joueur|sorcier) \?\? null\}/g) ?? [];
  assert.equal(poses.length, 2, 'les deux rangées suivent le même aperçu');
  // La case survolée n'est jamais un bouton : aucun clic n'y est branché.
  assert.match(page, /const survolee = !occupant && !choisissable && !deplacable/);
  assert.match(page, /rpg-creature-slot--survol-deplacement/);
  assert.match(css, /\.rpg-creature-slot--survol-deplacement \{[\s\S]{0,260}rgba\(126, 196, 255/,
    'le signal du survol est bleu, distinct du doré et de l’ivoire');
});

test('le bouton d’avancée a son style, en pointillés, et n’affiche pas les repères de case vide', () => {
  assert.match(css, /\.rpg-creature-slot--deplacement \{/);
  assert.match(css, /\.rpg-creature-slot--deplacement[\s\S]{0,220}border-style: dashed;/);
  const reperes = css.match(/\.rpg-creature-slot\.is-empty:not\(\.rpg-creature-slot--choix\):not\(\.rpg-creature-slot--deplacement\):not\(\.rpg-creature-slot--survol-deplacement\)::(before|after)/g) ?? [];
  assert.equal(reperes.length, 4, 'les quatre repères de case vide excluent l’avancée et le survol');
  assert.equal((css.match(/\.rpg-creature-slot\.is-empty:not\(\.rpg-creature-slot--choix\)::/g) ?? []).length, 0,
    'plus aucun repère ne s’affiche sous une case d’avancée');
});
