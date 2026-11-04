import { test } from 'node:test';
import assert from 'node:assert/strict';

import { GAINS } from '../src/games/rpgCredits.js';
import { JOURS_DE_LA_SERIE } from '../src/games/rpgQuetes.js';
import {
  GENRES_COFFRES, coffreDeLaQuete, legendeCoffre, paquetsDuCoffre, vueDesCoffres,
} from '../src/games/rpgCoffresQuetes.js';

/** Un état de quêtes lisible : trois quêtes, une par palier. */
const TROIS = ['creatures-10', 'duels-2', 'duels-3'];
const etat = (suite = {}) => ({
  version: 1, jour: '2026-11-04', quetes: TROIS,
  progres: { 'creatures-10': 0, 'duels-2': 0, 'duels-3': 0 },
  reclamations: [], cachet: false, semaine: false, serie: 1,
  majLe: null, debutLe: '2026-11-04T08:00:00.000Z',
  ...suite,
});

test('les trois quêtes du jour deviennent trois coffres, un par palier', () => {
  const vue = vueDesCoffres(etat());
  assert.equal(vue.slots.length, 4, 'trois coffres de quête + le Coffre du cycle');
  assert.deepEqual(vue.slots.map((c) => c.genre), ['bronze', 'argent', 'or', 'royal']);
  assert.deepEqual(vue.slots.map((c) => c.etat), ['encours', 'encours', 'encours', 'encours']);
  assert.equal(vue.prets, 0);
});

test('un coffre verse exactement ce que sa quête versait — l’économie ne bouge pas', () => {
  const vue = vueDesCoffres(etat());
  assert.equal(vue.slots[0].credits, 60, 'la ménagerie (facile)');
  assert.equal(vue.slots[1].credits, 70, 'deux duels (moyenne)');
  assert.equal(vue.slots[2].credits, 100, 'trois duels (difficile)');
  assert.equal(vue.slots[3].credits, GAINS.cachetDuCycle);
  assert.equal(vue.semaine.credits, GAINS.cachetDeLaSemaine);
});

test('quête finie : le coffre est prêt ; quête réclamée : le coffre est ouvert', () => {
  const pret = vueDesCoffres(etat({ progres: { 'creatures-10': 10, 'duels-2': 0, 'duels-3': 0 } }));
  assert.equal(pret.slots[0].etat, 'pret');
  assert.equal(pret.slots[0].pourcent, 100);
  assert.equal(pret.prets, 1);
  assert.equal(legendeCoffre(pret.slots[0]), 'Ouvrir !');

  const ouvert = vueDesCoffres(etat({ reclamations: ['creatures-10'] }));
  assert.equal(ouvert.slots[0].etat, 'ouvert');
  assert.equal(legendeCoffre(ouvert.slots[0]), 'Ouvert ✓');
});

test('le Coffre du cycle attend les trois quêtes, et lui seul ajoute un paquet', () => {
  const enCours = vueDesCoffres(etat({ reclamations: ['creatures-10'] }));
  assert.equal(enCours.slots[3].etat, 'encours');
  assert.equal(enCours.slots[3].progres, 1);
  assert.equal(enCours.slots[3].objectif, 3);

  const complet = vueDesCoffres(etat({ reclamations: TROIS }));
  assert.equal(complet.slots[3].etat, 'pret');
  assert.equal(complet.slots[3].paquets, 1, 'le Coffre du cycle offre un paquet de cartes');
  assert.equal(complet.prets, 1);

  const pris = vueDesCoffres(etat({ reclamations: TROIS, cachet: true }));
  assert.equal(pris.slots[3].etat, 'ouvert');
  assert.equal(pris.slots[3].pourcent, 100);
});

test('seuls les coffres du cycle et de la semaine donnent des cartes', () => {
  assert.equal(paquetsDuCoffre('bronze'), 0);
  assert.equal(paquetsDuCoffre('argent'), 0);
  assert.equal(paquetsDuCoffre('or'), 0);
  assert.equal(paquetsDuCoffre('royal'), 1);
  assert.equal(paquetsDuCoffre('legende'), 2);
  assert.equal(paquetsDuCoffre('inconnu'), 0);
  assert.equal(GENRES_COFFRES.royal.nom, 'Coffre du cycle');
});

test('le Coffre de la semaine suit la série de sept jours', () => {
  const milieu = vueDesCoffres(etat({ serie: 3 }));
  assert.equal(milieu.semaine.etat, 'encours');
  assert.equal(milieu.semaine.progres, 3);
  assert.equal(milieu.semaine.objectif, JOURS_DE_LA_SERIE);

  const pleine = vueDesCoffres(etat({ serie: JOURS_DE_LA_SERIE }));
  assert.equal(pleine.semaine.etat, 'pret');
  assert.equal(pleine.semaine.paquets, 2, 'la semaine offre deux paquets');

  const prise = vueDesCoffres(etat({ serie: JOURS_DE_LA_SERIE, semaine: true }));
  assert.equal(prise.semaine.etat, 'ouvert');
});

test('un joueur sans quêtes voit encore le Coffre du cycle et celui de la semaine', () => {
  const vide = vueDesCoffres({ quetes: [] });
  assert.equal(vide.slots.length, 1);
  assert.equal(vide.slots[0].cle, 'cycle');
  assert.equal(vide.slots[0].etat, 'encours');
  assert.ok(vide.semaine);
  assert.equal(vueDesCoffres(null).prets, 0, 'un état absent ne casse pas l’écran');
});

test('coffreDeLaQuete retrouve le coffre d’une quête, et rend null pour une inconnue', () => {
  const coffre = coffreDeLaQuete(etat(), 'duels-2');
  assert.equal(coffre.genre, 'argent');
  assert.equal(coffre.queteId, 'duels-2');
  assert.equal(coffreDeLaQuete(etat(), 'quete-inexistante'), null);
});

test('sur mobile aussi, le coffre encaissé est ouvert, vidé et grisé', async () => {
  const fs = await import('node:fs');
  const css = fs.readFileSync('src/games/rpg-coffres-quetes.css', 'utf8');
  const jsx = fs.readFileSync('src/games/RpgCoffresQuetes.jsx', 'utf8');
  const regle = (needle) => [...css.matchAll(/([^{}]*)\{([^}]*)\}/g)]
    .filter((m) => m[1].includes(needle)).map((m) => m[2]).join(' ');
  const ouvert = (needle) => regle(`.rpg-coffres-quetes__slot.is-ouvert .rpg-coffres-quetes__${needle}`);

  // Le creux vide existe dans le SVG et n'apparaît qu'une fois encaissé.
  assert.match(jsx, /rpg-coffre-svg__gueule/);
  assert.match(regle('.rpg-coffre-svg__gueule'), /opacity:\s*0/, 'caché tant que le coffre est plein');
  assert.match(regle('.is-ouvert .rpg-coffre-svg__gueule'), /opacity:\s*1/);

  // Le métal et le gain passent en niveaux de gris, comme sur l'accueil bureau.
  assert.match(regle('.is-ouvert .rpg-coffre-svg'), /grayscale\(1\)/);
  assert.match(ouvert('gain'), /grayscale\(1\)/);
  // La lueur épouse le tracé du SVG ; un coffre vidé n'en garde aucune. Il ne
  // reste que l'ombre au sol, qui est noire.
  assert.doesNotMatch(regle('.is-ouvert .rpg-coffre-svg'), /color-mix/, 'plus de lueur sur un coffre vidé');
  assert.doesNotMatch(css, /rpg-coffres-quetes__halo/, 'le halo rond a disparu');
  assert.match(regle('.is-encours .rpg-coffre-svg'), /drop-shadow\(0 0 \d+px color-mix/, 'la lueur suit la silhouette');
  assert.match(regle('.is-pret .rpg-coffre-svg'), /drop-shadow\(0 0 \d+px color-mix/, 'et elle s’intensifie quand le coffre est prêt');
  // La jauge et la légende ne restent pas vertes.
  assert.doesNotMatch(ouvert('jauge-remplie'), /#9fd07a/);
  assert.doesNotMatch(ouvert('etat'), /#9fd07a/);

  // Le couvercle s'ouvre franchement plus grand que dans la cérémonie.
  const angle = (sel) => Math.abs(Number(regle(sel).match(/rotate\((-?\d+)deg\)/)[1]));
  assert.ok(angle('.rpg-coffres-quetes__slot.is-ouvert .rpg-coffre-svg__couvercle')
    > angle('.rpg-coffre-svg.is-ouvert .rpg-coffre-svg__couvercle'), 'le coffre de la rangée bâille plus grand');

  // Le viewBox est fixe : c'est le coffre qui rétrécit pour laisser passer le
  // couvercle, sinon il serait rogné en haut.
  assert.match(jsx, /viewBox="0 0 64 58"/);
  const ensemble = regle('.rpg-coffres-quetes__slot.is-ouvert .rpg-coffre-svg__ensemble');
  const k = Number(ensemble.match(/scale\(([\d.]+)\)/)[1]);
  assert.ok(k > 0 && k < 1, 'le coffre vidé doit rétrécir pour tenir dans le cadre');
  assert.match(ensemble, /translateY\(\d+px\)/, 'et descendre pour dégager le haut du cadre');

  // La cérémonie d'ouverture partage CoffreSvg : elle garde son coffre plein,
  // donc aucune des règles ci-dessus ne doit déborder sur elle.
  for (const needle of ['__ensemble', '__gueule', '__couvercle']) {
    const ciblees = [...css.matchAll(/([^{}]*)\{([^}]*)\}/g)]
      .filter((m) => m[1].includes(`.rpg-coffre-svg${needle}`) && /scale\(|opacity:\s*1|rotate\(-40/.test(m[2]));
    for (const m of ciblees) {
      assert.match(m[1], /\.rpg-coffres-quetes__slot\.is-ouvert/,
        `la pose ouverte de ${needle} doit rester scopée à la rangée`);
    }
  }
});
