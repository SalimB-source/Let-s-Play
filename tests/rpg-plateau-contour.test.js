/** Les cartes du plateau : plates au repos, un contour au survol — or pour
 * nous, rouge pour le sorcier. Uniquement de la peinture : aucune règle. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const lire = (nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8');
const battle = lire('rpg-battle.css');
const page = lire('RpgDuelPage.jsx');

/** Le bloc du plateau, de son commentaire d'ouverture au bout de sa requête
 * média — c'est là que vivent les deux règles, et nulle part ailleurs. */
const debut = battle.indexOf('Le plateau : des cartes posées, un contour au survol');
assert.ok(debut >= 0, 'le bloc « cartes posées » doit exister');
const bloc = battle.slice(debut, battle.indexOf("@keyframes rpg-spell-arrival", debut));

test('Au repos, la carte posée n’a plus de relief — et l’état garde son signal', () => {
  const plat = bloc.match(/\.rpg-battle \.card-row \.rpg-card:not\([^)]*\)[^{]*\{\s*box-shadow: none;\s*\}/s);
  assert.ok(plat, 'le relief tombe sur les cartes des rangées');
  // Tout ce qui parle déjà à l'œil est exclu : sans cette liste, un halo de
  // ciblage ou de désignation disparaîtrait avec le relief.
  for (const etat of ['.is-pret', '.is-ciblable', '.is-spell-target', '.is-coup-rapide-cible',
    '.is-a-portee', '.is-envol', '.is-selected', '.is-blocking', '.is-declared-attacker',
    '.is-sacrifice-target', '.is-ascension-chosen']) {
    assert.ok(plat[0].includes(etat), `${etat} garde son ombre`);
  }
  // La règle ne touche que le plateau : la main garde son relief.
  assert.doesNotMatch(plat[0], /rpg-hand|rpg-mulligan|hover-card-preview/,
    'la main, le mulligan et les aperçus ne sont pas concernés');
});

test('Le contour du survol descend de la rangée : or pour nous, rouge pour lui', () => {
  assert.match(bloc, /\.card-row--equipe \.rpg-card \{ --rpg-contour-survol: #f0cd7f; \}/,
    'notre rangée porte l’or');
  const ennemi = bloc.match(/\.card-row--ennemi \.rpg-card \{ --rpg-contour-survol: (#[0-9a-f]{6}); \}/);
  assert.ok(ennemi, 'la rangée du sorcier porte sa propre teinte');
  assert.match(ennemi[1], /^#ff/, `le camp adverse est rouge (${ennemi[1]})`);
  assert.notEqual(ennemi[1], '#f0cd7f', 'les deux camps ne partagent pas la même couleur');
  assert.match(bloc, /outline: 2px solid var\(--rpg-contour-survol, #f0cd7f\);/,
    'un contour fin, jamais un halo');
});

test('Le contour est un geste de souris, et il cède aux états plus forts', () => {
  const requete = bloc.slice(bloc.indexOf('@media (hover: hover) and (pointer: fine)'));
  assert.ok(requete, 'le contour vit dans la requête média du survol');
  const survol = requete.match(/:is\(:hover, :focus-visible\):not\([^)]*\)/s);
  assert.ok(survol, 'la règle vise :hover et :focus-visible');
  for (const etat of ['.is-ciblable', '.is-spell-target', '.is-pret', '.is-declared-attacker']) {
    assert.ok(survol[0].includes(etat), `${etat} reste maître de sa couleur`);
  }
  const horsRequete = bloc.slice(0, bloc.indexOf('@media (hover: hover) and (pointer: fine)'));
  assert.doesNotMatch(horsRequete, /--rpg-contour-survol: #(?!f0cd7f)/,
    'aucune teinte de survol hors de la requête média');
});

test('Désigner reste plus fort que survoler : 4 px contre 2 px', () => {
  const vise = battle.match(/\.rpg-card\.is-spell-target,\n\.rpg-card\.is-coup-rapide-cible \{\n  outline: (\d)px solid/);
  assert.ok(vise, 'la proie désignée garde son contour épais');
  assert.equal(vise[1], '4');
  const survol = bloc.match(/outline: (\d)px solid var\(--rpg-contour-survol/);
  assert.equal(survol[1], '2');
});

test('Le survol ne câble rien : c’est le CSS qui lit la rangée, pas le JSX', () => {
  // Les deux rangées existent déjà dans la page : le camp du contour se lit
  // sur `.card-row--equipe` / `.card-row--ennemi`, aucune prop n'est ajoutée.
  assert.match(page, /className="card-row card-row--ennemi"/, 'la rangée du sorcier existe');
  assert.match(page, /className="card-row card-row--equipe"/, 'la rangée du joueur existe');
  assert.doesNotMatch(page, /contourSurvol|contour-survol=/, 'aucune prop de survol');
});

test('La cascade le confirme : plat au repos, relief des états, main intacte', () => {
  const dom = new JSDOM(`<!doctype html><style>${battle}</style>
    <div class="rpg-battle">
      <div class="card-row card-row--ennemi">
        <button class="rpg-card" id="repos"></button>
        <button class="rpg-card is-pret" id="pret"></button>
        <button class="rpg-card is-ciblable" id="cible"></button>
      </div>
      <div class="rpg-hand"><button class="rpg-card" id="main"></button></div>
    </div>`, { pretendToBeVisual: true });
  const ombre = (id) => dom.window.getComputedStyle(dom.window.document.getElementById(id)).boxShadow;
  assert.equal(ombre('repos'), 'none', 'une créature au repos ne flotte plus');
  assert.notEqual(ombre('pret'), 'none', 'la prête garde son liseré');
  assert.notEqual(ombre('cible'), 'none', 'la cible garde son halo de ciblage');
  assert.notEqual(ombre('main'), 'none', 'une carte de la main garde son relief');
  assert.equal(
    dom.window.getComputedStyle(dom.window.document.getElementById('repos')).outlineStyle,
    'none',
    'aucun contour hors du survol',
  );
});
