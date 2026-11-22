/** L'icône du type remplace l'arc des créatures à distance sans arme visible.
 *
 * La liste a été arrêtée peinture par peinture : dix cartes gardent l'arc
 * (yumi, arquebuse, fusil, canon, shuriken, arc de chasse), vingt reçoivent
 * le glyphe de leur type — l'oiseau du Tengu, la griffe de la Manticore, la
 * figure pour toutes celles qui frappent de leur voix, de leur bâton ou de
 * leur ombre. L'étoile d'invocation garde la priorité : une nature qui
 * convoque ne montre ni arc ni type.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cardById } from '../src/games/rpgCards.js';
import { carteLanceEtoile } from '../src/games/rpgCartesEtoile.js';
import { carteSansArmeVisible, iconeTypeDe, entiteIconeType } from '../src/games/rpgCartesIconeType.js';

const lire = (nom) => readFileSync(fileURLToPath(new URL(`../src/games/${nom}`, import.meta.url)), 'utf8');

const OISEAU = ['tengu-du-mont-ardent'];
const BETE = ['manticore-des-dunes'];
const FIGURE = [
  'guetteuse-des-marees',
  'scribe-des-feuillets',
  'pretre-de-la-bouche',
  'lecteur-du-dernier-nom',
  'tercio-de-cuivre',
  'guetteur-du-beffroi',
  'sonneur-fele',
  'veilleuse-des-citernes',
  'tiziri-du-djurdjura',
  'volva-soigneuse',
  'scalde-des-runes',
  'veilleuse-au-corbeau-noir',
  'eclipse-silencieuse',
  'sorcier-du-ressac-noir',
  'veilleuse-de-la-lune-givree',
  'archonte-du-sablier-noir',
  'pere-des-corbeaux',
  'dame-des-neuf-mondes',
];
const GARDENT_LARC = [
  'ashigaru-des-braises',
  'archer-samourai-des-cendres',
  'ninja-samourai-des-toits',
  'galion-de-la-flotte',
  'la-vengeance-de-la-reine-anne',
  'le-chasseur-d-ocracoke',
  'tislit-des-aures',
  'bouchra-guerriere-des-cretes',
  'archere-viking-du-givre',
  'archer-du-pachyderme-ardent',
];

test('type : le glyphe suit la nature, jamais le nom', () => {
  for (const id of OISEAU) assert.equal(iconeTypeDe(cardById(id)), 'oiseau', id);
  for (const id of BETE) assert.equal(iconeTypeDe(cardById(id)), 'bete', id);
  for (const id of FIGURE) assert.equal(iconeTypeDe(cardById(id)), 'figure', id);
  // La Veilleuse AU corbeau noir est une figure : son corbeau n'est pas son type.
  assert.equal(iconeTypeDe(cardById('veilleuse-au-corbeau-noir')), 'figure');
  // Le Père des corbeaux est un héros en figure : le bâton, pas l'arc.
  assert.equal(iconeTypeDe(cardById('pere-des-corbeaux')), 'figure');
});

test('type : les peintures armées gardent l’arc, les natures gardent l’étoile', () => {
  for (const id of GARDENT_LARC) {
    assert.equal(iconeTypeDe(cardById(id)), null, `${id} tire : l'arc reste`);
    assert.equal(carteSansArmeVisible(cardById(id)), false, id);
  }
  for (const id of [...OISEAU, ...BETE, ...FIGURE]) {
    assert.equal(carteSansArmeVisible(cardById(id)), true, id);
    assert.equal(carteLanceEtoile(cardById(id)), false, `${id} n'est pas une étoile`);
  }
  // Une nature qui convoque garde l'étoile : elle n'entre pas dans la liste.
  for (const id of ['sahir-des-braises', 'djinn-de-foudre', 'faucon-du-zenith', 'ureus-du-seuil']) {
    assert.equal(iconeTypeDe(cardById(id)), null, id);
  }
  // Les armes tirent toujours : aucune icône de type sur une fiche d'arme.
  assert.equal(iconeTypeDe({ kind: 'arme', porteeArme: 'distance' }), null);
  assert.equal(iconeTypeDe(null), null);
  assert.equal(iconeTypeDe(undefined), null);
  // Une fiche peut forcer son glyphe, ou le refuser.
  assert.equal(iconeTypeDe({ id: 'tengu-du-mont-ardent', typeLine: 'Créature — Yōkai · Tengu', iconeType: 'bete' }), 'bete');
  assert.equal(iconeTypeDe({ id: 'tengu-du-mont-ardent', typeLine: 'Créature — Yōkai · Tengu', iconeType: null }), null);
});

test('type : visible sur le plateau, depuis la créature en jeu', () => {
  const fiche = cardById('tengu-du-mont-ardent');
  assert.equal(entiteIconeType({ id: 'e1', carteId: 'tengu-du-mont-ardent', distance: fiche.distance, atk: fiche.atk, pv: fiche.def }), 'oiseau');
  assert.equal(entiteIconeType({ id: 'e2', carteId: 'sonneur-fele', distance: true }), 'figure');
  assert.equal(entiteIconeType({ id: 'e3', carteId: 'archere-viking-du-givre', distance: true }), null, 'l’archère garde l’arc');
  assert.equal(entiteIconeType(null), null);
});

test('type : l’icône d’ATQ dessine le glyphe du type à la place de l’arc', () => {
  const page = lire('RpgDuelPage.jsx');
  const moba = lire('RpgMobaBoard.jsx');
  // Le glyphe passe avant l'arc, après l'étoile.
  assert.match(page, /data-stat-icon=\{nature \? `type-\$\{nature\}` : arc \? \(etoile \? 'etoile' : 'arc'\) : type\}/);
  // Trois glyphes : l'oiseau plein, la griffe en trois traits, la figure buste.
  assert.match(page, /nature === 'oiseau'/);
  assert.match(page, /nature === 'bete'/);
  assert.match(page, /nature === 'figure'/);
  assert.match(page, /data-stat-nature=""/);
  // Main, fiche, aperçu et plateau passent tous par le type ; les armes non.
  assert.match(page, /iconeType=\{armes\.length \? null : entiteIconeType\(entite\)\}/);
  assert.match(page, /iconeType=\{!armesEquipees\.length && iconeTypeDe\(carte\)\}/);
  assert.equal((page.match(/iconeType=\{iconeTypeDe\(carte\)\}/g) ?? []).length, 2, 'fiche et main');
  assert.match(moba, /iconeType=\{iconeTypeDe\(card\)\}/);
  assert.doesNotMatch(page, /iconeType=\{iconeTypeDe\(carte\)\} \/><span className="rpg-stat-value">\{signeBonus/);
});
