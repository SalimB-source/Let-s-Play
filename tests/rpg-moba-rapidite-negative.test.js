import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { mobaNouveau } from '../src/games/rpgMoba.js';
import { MOBA_RAPIDITE_EMBUSCADES, rpgMobaConditionRapidite } from '../src/games/rpgMobaRapidite.js';
import { MOBA_EMBUSCADES_IMPRIMEES, rpgMobaConditionImprimee } from '../src/games/rpgMobaEmbuscadesImprimees.js';
import { MOBA_EMBUSCADES_CONDITIONS, rpgMobaConditionSpeciale } from '../src/games/rpgMobaEmbuscades.js';

const presence = (id, options = {}) => ({ id, carteId: id, atk: cardById(id)?.atk ?? 1,
  pv: 4, pvMax: 4, mobaLane: 'right', ...options });
// Plateau nu : main et cimetière vides, aucune créature de chaque côté.
const nue = () => ({ moba: mobaNouveau(), tour: 'joueur', phase: 'principale',
  joueur: { main: [], cimetiere: [], creatures: [] },
  sorcier: { main: [], cimetiere: [], creatures: [] } });
// Les cas sont écrits du point de vue du joueur : on échange les camps pour
// vérifier la même condition côté sorcier.
const pourCote = (d, cote) => (cote === 'sorcier' ? { ...d, joueur: d.sorcier, sorcier: d.joueur } : d);
const blesse = (id, options = {}) => presence(id, { pv: 1, pvMax: 4, ...options });

/* Chaque carte restante décrit elle-même le plateau qui remplit sa condition.
 * Les plateaux se contredisent (l'une veut un adversaire vide, l'autre une
 * créature en face) : chaque cas part donc d'un plateau nu. */
const CAS = {
  'pilote-de-la-carreira': (d) => { d.joueur.main = ['sabre-maudit']; },
  'kenshi-de-la-forge': (d) => { d.joueur.creatures = [presence('samourai-du-torii'), presence('samourai-du-torii', { id: 'torii-2' })]; },
  'pretre-de-la-bouche': (d) => { d.joueur.cimetiere = ['chien-du-guet', 'ashigaru-des-braises']; },
  'veilleuse-des-citernes': (d) => { d.joueur.creatures = [blesse('ashigaru-des-braises')]; },
  'volva-soigneuse': (d) => { d.joueur.creatures = [blesse('viking-des-neiges')]; },
  'chacal-du-seuil': (d) => { d.sorcier.creatures = [presence('chien-du-guet', { atk: 1 })]; },
  'bouchra-guerriere-des-cretes': (d) => { d.joueur.cimetiere = ['takouba-des-pistes']; },
  'danseuse-des-ombres-de-dune': (d) => { d.sorcier.creatures = [blesse('ashigaru-des-braises')]; },
  'djinn-de-la-fleche-ardente': (d) => { d.joueur.cimetiere = ['djinn-de-foudre', 'djinn-du-dernier-brasier', 'djinn-des-braises-voilees']; },
  'le-renegat': (d) => { d.joueur.cimetiere = ['source-de-bimini']; },
  'ronin-du-soleil-rouge': (d) => { d.joueur.creatures = [presence('onna-musha-des-cendres')]; },
  'veilleuse-au-corbeau-noir': () => {},
  'djinn-des-ailes-de-cendre': (d) => { d.sorcier.creatures = [presence('valkyrie-des-glaces', { envol: true })]; },
  'lionne-du-midi-ardent': (d) => { d.sorcier.creatures = [presence('guetteuse-des-marees'), presence('viking-des-neiges', { id: 'neige' })]; },
  'le-chasseur-d-ocracoke': (d) => { d.sorcier.creatures = [presence('le-brulot')]; },
  'garde-du-trone-givre': (d) => { d.joueur.cimetiere = ['viking-des-neiges']; },
  'momie-de-lin': (d) => { d.joueur.cimetiere = ['chien-du-guet']; },
  'sanguinaire-des-dunes': (d) => { d.sorcier.creatures = [blesse('ashigaru-des-braises'), blesse('chien-du-guet', { id: 'blesse-2' })]; },
  'gardienne-du-croissant': (d) => { d.joueur.creatures = [blesse('ashigaru-des-braises')]; },
  'porte-etendard-de-leclipse': (d) => { d.joueur.creatures = [presence('ashigaru-des-braises'), presence('chien-du-guet', { id: 'a2' }), presence('viking-des-neiges', { id: 'a3' })]; },
  'sorcier-du-ressac-noir': (d) => { d.joueur.cimetiere = ['ecueil']; },
  'tojiro-le-pourfendeur': (d) => { d.joueur.main = ['sabre-maudit']; },
};
// Le seul contre-exemple qui n'est pas le plateau nu : le Pilote exige une main
// sans Navire.
const NEGATIFS = {
  'pilote-de-la-carreira': (d) => { d.joueur.main = ['cotre-de-course']; },
  // Elle veut un adversaire vide : son contre-exemple est une créature en face.
  'veilleuse-au-corbeau-noir': (d) => { d.sorcier.creatures = [presence('chien-du-guet')]; },
};

for (const [label, entries, condition] of [
  ['Rapidité', MOBA_RAPIDITE_EMBUSCADES, rpgMobaConditionRapidite],
  ['imprimée', MOBA_EMBUSCADES_IMPRIMEES, rpgMobaConditionImprimee],
  ['spéciale', MOBA_EMBUSCADES_CONDITIONS, rpgMobaConditionSpeciale],
]) test(`conditions ${label} : chaque carte possède un prérequis global et un contre-exemple`, () => {
  for (const id of Object.keys(entries)) {
    assert.ok(CAS[id], `plateau de test manquant pour ${id}`);
    for (const cote of ['joueur', 'sorcier']) {
      const positif = nue(); CAS[id](positif);
      assert.equal(condition(pourCote(positif, cote), cote, id), true, `positif ${id} (${cote})`);
      const negatif = nue(); NEGATIFS[id]?.(negatif);
      assert.equal(condition(pourCote(negatif, cote), cote, id), false, `négatif ${id} (${cote})`);
    }
    assert.ok((entries[id].texte ?? entries[id]).length > 15, `texte ${id}`);
  }
});

test('main et cimetière : seuils et catégories sont distincts et réévalués', () => {
  const d = nue();
  const arme = (id) => rpgMobaConditionRapidite(d, 'joueur', id);
  assert.equal(arme('bouchra-guerriere-des-cretes'), false, 'un cimetière vide ne suffit pas');
  d.joueur.cimetiere = ['takouba-des-pistes'];
  assert.equal(arme('bouchra-guerriere-des-cretes'), true, 'une arme au cimetière');
  d.joueur.cimetiere = ['ecueil'];
  assert.equal(arme('bouchra-guerriere-des-cretes'), false, 'une Magie Rapide n’est pas une arme');
  assert.equal(rpgMobaConditionImprimee(d, 'joueur', 'sorcier-du-ressac-noir'), true,
    'la Magie Rapide se lit, elle, dans le cimetière');
  assert.equal(rpgMobaConditionImprimee(d, 'joueur', 'momie-de-lin'), false,
    'aucune créature à exiler');
  d.joueur.cimetiere = ['chien-du-guet', 'ashigaru-des-braises'];
  assert.equal(rpgMobaConditionSpeciale(d, 'joueur', 'pretre-de-la-bouche'), true, 'deux créatures');
  d.joueur.cimetiere = ['chien-du-guet'];
  assert.equal(rpgMobaConditionSpeciale(d, 'joueur', 'pretre-de-la-bouche'), false, 'une seule créature');
  d.joueur.main = ['sabre-maudit'];
  assert.equal(rpgMobaConditionImprimee(d, 'joueur', 'tojiro-le-pourfendeur'), true, 'le coût est en main');
  d.joueur.main = ['cotre-de-course'];
  assert.equal(rpgMobaConditionImprimee(d, 'joueur', 'tojiro-le-pourfendeur'), false, 'sans Sabre maudit');
  assert.equal(rpgMobaConditionSpeciale(d, 'joueur', 'pilote-de-la-carreira'), false, 'un Navire en main');
});
