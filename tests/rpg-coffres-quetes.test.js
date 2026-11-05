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
  majLe: null, debutLe: new Date().toISOString(),
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
  assert.equal(GENRES_COFFRES.bronze.nom, 'Coffre en bois');
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
  // couvercle : c'est la scène qui lui ménage de l'air au-dessus.
  assert.match(jsx, /viewBox="0 0 64 58"/);
  const ensemble = regle('.rpg-coffres-quetes__slot.is-ouvert .rpg-coffre-svg__ensemble');
  assert.doesNotMatch(ensemble, /scale\(/, 'le coffre ouvert ne rétrécit pas');
  assert.match(ensemble, /translateY\(\d+px\)/, 'il descend seulement pour dégager le haut du cadre');
  // L'air vient de la scène, pas d'un coffre plus petit : le SVG garde sa
  // hauteur propre et déborde de son viewBox vers le haut.
  const scene = regle('.rpg-coffres-quetes__scene');
  assert.match(scene, /--scene-air:\s*\d+px/, 'la scène réserve de l’air');
  assert.match(scene, /height: calc\(var\(--coffre-h\) \+ var\(--scene-air\)\)/);
  assert.match(scene, /align-items: flex-end/, 'le coffre est calé en bas, sa taille ne bouge pas');
  const svg = regle('.rpg-coffres-quetes__scene .rpg-coffre-svg');
  assert.match(svg, /height: var\(--coffre-h\)/, 'le SVG garde la hauteur du coffre, pas celle de la scène');
  assert.match(svg, /overflow: visible/, 'le couvercle peut occuper l’air réservé');

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

test('sur mobile, la barre du haut remplace la fraction, sans désaligner les coffres', async () => {
  const fs = await import('node:fs');
  const jsx = fs.readFileSync('src/games/RpgCoffresQuetes.jsx', 'utf8');
  const css = fs.readFileSync('src/games/rpg-coffres-quetes.css', 'utf8');
  const regle = (needle) => [...css.matchAll(/([^{}]*)\{([^}]*)\}/g)]
    .filter((m) => m[1].includes(needle)).map((m) => m[2]).join(' ');

  // Une quête en cours montre la barre ; les autres états gardent leur badge,
  // ils n'ont plus rien à faire progresser.
  assert.match(jsx, /coffre\.etat === 'encours' \? \(/);
  assert.match(jsx, /data-coffre-progres=\{`\$\{coffre\.progres\}\/\$\{coffre\.objectif\}`\}/);
  assert.match(jsx, /data-coffre-legende=\{legendeCoffre\(coffre\)\}/);
  // La barre du bas a disparu : il n'en reste qu'une, en haut.
  assert.equal((jsx.match(/rpg-coffres-quetes__jauge"/g) || []).length, 1);
  // Elle précède la scène du coffre.
  assert.ok(jsx.indexOf('rpg-coffres-quetes__jauge"') < jsx.indexOf('rpg-coffres-quetes__scene"'),
    'la barre est au-dessus du coffre');

  // Barre et badge occupent la même hauteur : sinon les coffres ne seraient
  // plus alignés d'un emplacement à l'autre.
  const hBarre = regle('.rpg-coffres-quetes__jauge').match(/min-height:\s*(\d+)px/);
  const hBadge = regle('.rpg-coffres-quetes__etat').match(/min-height:\s*(\d+)px/);
  assert.ok(hBarre && hBadge && hBarre[1] === hBadge[1], 'barre et badge à la même hauteur de rangée');

  // La place du bouton refresh est réservée sur la barre, puisque c'est elle
  // qui occupe désormais le haut d'une quête en cours.
  assert.match(css, /\.has-remplacement \.rpg-coffres-quetes__jauge \{ padding-right: \d+px; \}/);
});
