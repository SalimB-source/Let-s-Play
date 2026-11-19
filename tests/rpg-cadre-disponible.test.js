/** Le liseré doré dit « cette carte a quelque chose à faire **maintenant** » :
 *  frapper une cible légale, toucher le sorcier, ou avancer. Il ne promet plus
 *  une action qui n'existe pas — et les Défenseurs disponibles le portent comme
 *  les autres créatures (`rpgDefenseur.js` n'y change rien).
 *
 * Les calculs sont ceux du moteur : `rpgCiblesIndividuellesClassique` pour les
 * cibles (portée, lignes, priorité Défenseur) et `deplacementsLegaux` pour le
 * pas. La page ne réinvente aucune règle.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');

test('la page calcule la disponibilité sur les cibles et le pas', () => {
  const debut = page.indexOf('const pretAAgir = (entite, proprietaire) => {');
  assert.ok(debut > 0, 'le calcul existe');
  const bloc = page.slice(debut, debut + 900);
  assert.match(bloc, /if \(!entite \|\| !rpgPeutAttaquer\(entite\)\) return false;/, 'engagée, gelée, malade : jamais disponible');
  assert.match(bloc, /if \(combatCollectif \|\| !lignesActives\(duel\)\) return true;/, 'hors des lignes, la lecture historique reste');
  assert.match(bloc, /const choix = rpgCiblesIndividuellesClassique\(duel, proprietaire, entite\.id\);/, 'les cibles viennent du moteur');
  assert.match(bloc, /if \(choix\.directe \|\| choix\.cibles\.length\) return true;/, 'frapper une cible ou le sorcier suffit');
  assert.match(bloc, /return deplacementsLegaux\(duel, proprietaire, entite\.id\)\.length > 0;/, 'sinon, une case de pas suffit');
});

test('les deux rangées passent la disponibilité à leur carte', () => {
  const passes = page.match(/pretAAgir=\{pretAAgir\(entite, proprietaire\)\}/g) ?? [];
  assert.equal(passes.length, 2, 'une rangée par camp');
  // Le propriétaire vient du champ réel : un envahisseur se mesure chez lui.
  assert.match(page, /const proprietaire = campDeLaCreature\(duel, entite\) \?\? 'sorcier';/);
  assert.match(page, /const proprietaire = campDeLaCreature\(duel, entite\) \?\? 'joueur';/);
});

test('la carte suit la prop, et garde son ancienne lecture sans elle', () => {
  assert.match(page, /\n  pretAAgir = null,/, 'la prop a un défaut neutre');
  assert.match(page, /\(pretAAgir \?\? rpgPeutAttaquer\(entite\)\) \? 'is-pret' : '',/,
    'aperçus, MOBA et écrans sans duel gardent « peut attaquer »');
});
