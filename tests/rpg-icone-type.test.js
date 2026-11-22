/** L'icône du type remplace l'arc des créatures à distance sans arme visible.
 *
 * Le type d'une créature, c'est sa couleur : le sablier du Sable, la tête de
 * mort des Ténèbres, la flamme de la Braise, le flocon de la Neige, la goutte
 * de l'Eau — les emblèmes partagés de `rpgEmblemes.jsx`, pas un dessin de plus.
 *
 * La liste des vingt cartes a été arrêtée peinture par peinture : dix gardent
 * l'arc (yumi, arquebuse, fusil, canon, shuriken, arc de chasse), vingt
 * reçoivent l'emblème de leur couleur. L'étoile d'invocation garde la priorité :
 * une nature qui convoque ne montre ni arc ni type.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cardById } from '../src/games/rpgCards.js';
import { carteLanceEtoile } from '../src/games/rpgCartesEtoile.js';
import { carteSansArmeVisible, iconeTypeDe, entiteIconeType } from '../src/games/rpgCartesIconeType.js';

const lire = (nom) => readFileSync(fileURLToPath(new URL(`../src/games/${nom}`, import.meta.url)), 'utf8');

const PAR_ELEMENT = {
  braise: ['tengu-du-mont-ardent'],
  sable: ['tercio-de-cuivre', 'manticore-des-dunes', 'guetteur-du-beffroi', 'tiziri-du-djurdjura', 'eclipse-silencieuse', 'archonte-du-sablier-noir'],
  tenebres: ['scribe-des-feuillets', 'pretre-de-la-bouche', 'lecteur-du-dernier-nom'],
  eau: ['guetteuse-des-marees', 'sonneur-fele', 'veilleuse-des-citernes', 'sorcier-du-ressac-noir'],
  neige: ['volva-soigneuse', 'scalde-des-runes', 'veilleuse-au-corbeau-noir', 'veilleuse-de-la-lune-givree', 'pere-des-corbeaux', 'dame-des-neuf-mondes'],
};
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

test('type : l’emblème suit la couleur de la créature, jamais son nom', () => {
  for (const [element, ids] of Object.entries(PAR_ELEMENT)) {
    for (const id of ids) assert.equal(iconeTypeDe(cardById(id)), element, id);
  }
  // Hybrides : première couleur dans l'ordre canonique, comme le cadre.
  assert.equal(iconeTypeDe(cardById('veilleuse-au-corbeau-noir')), 'neige');
  assert.equal(iconeTypeDe(cardById('eclipse-silencieuse')), 'sable');
  assert.equal(iconeTypeDe(cardById('sorcier-du-ressac-noir')), 'eau');
});

test('type : les peintures armées gardent l’arc, les natures gardent l’étoile', () => {
  for (const id of GARDENT_LARC) {
    assert.equal(iconeTypeDe(cardById(id)), null, `${id} tire : l'arc reste`);
    assert.equal(carteSansArmeVisible(cardById(id)), false, id);
  }
  for (const ids of Object.values(PAR_ELEMENT)) for (const id of ids) {
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
  // Une fiche peut forcer son emblème, ou le refuser.
  assert.equal(iconeTypeDe({ id: 'tengu-du-mont-ardent', iconeType: 'eau' }), 'eau');
  assert.equal(iconeTypeDe({ id: 'tengu-du-mont-ardent', iconeType: null }), null);
});

test('type : visible sur le plateau, depuis la créature en jeu', () => {
  const fiche = cardById('tengu-du-mont-ardent');
  assert.equal(entiteIconeType({ id: 'e1', carteId: 'tengu-du-mont-ardent', distance: fiche.distance, atk: fiche.atk, pv: fiche.def }), 'braise');
  assert.equal(entiteIconeType({ id: 'e2', carteId: 'sonneur-fele', distance: true }), 'eau');
  assert.equal(entiteIconeType({ id: 'e3', carteId: 'archere-viking-du-givre', distance: true }), null, 'l’archère garde l’arc');
  assert.equal(entiteIconeType(null), null);
});

test('type : l’icône d’ATQ emprunte les emblèmes d’élément partagés', () => {
  const page = lire('RpgDuelPage.jsx');
  const moba = lire('RpgMobaBoard.jsx');
  const emblemes = lire('rpgEmblemes.jsx');
  // Le glyphe passe avant l'arc, après l'étoile, et vient du module partagé :
  // sablier, flamme, goutte, flocon et crâne restent UN seul dessin partout.
  assert.match(page, /data-stat-icon=\{nature \? `type-\$\{nature\}` : arc \? \(etoile \? 'etoile' : 'arc'\) : type\}/);
  assert.match(page, /<g data-stat-nature="">\{ELEMENT_GLYPHES\[nature\]\}<\/g>/);
  assert.match(page, /import \{ ELEMENT_GLYPHES \} from '\.\/rpgEmblemes\.jsx';/);
  assert.match(emblemes, /export const ELEMENT_GLYPHES = EMBLEMS;/);
  // Les glyphes pleins portent leur fill : le svg hôte impose fill: none.
  assert.equal((emblemes.match(/fill="currentColor" stroke="none"/g) ?? []).length, 5);
  assert.doesNotMatch(page, /nature === 'oiseau'|nature === 'bete'|nature === 'figure'/);
  // Main, fiche, aperçu et plateau passent tous par le type ; les armes non.
  assert.match(page, /iconeType=\{armes\.length \? null : entiteIconeType\(entite\)\}/);
  assert.match(page, /iconeType=\{!armesEquipees\.length && iconeTypeDe\(carte\)\}/);
  assert.equal((page.match(/iconeType=\{iconeTypeDe\(carte\)\}/g) ?? []).length, 2, 'fiche et main');
  assert.match(moba, /iconeType=\{iconeTypeDe\(card\)\}/);
});
