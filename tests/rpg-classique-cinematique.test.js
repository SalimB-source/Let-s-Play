import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { positionsCombatClassique, cinematiqueCombatClassique } from '../src/games/rpgCombatClassiqueCinematique.js';
import { rpgMobaDecalerChiffres } from '../src/games/rpgMobaImpact.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgReglerHasard } from '../src/games/rpgDuel.js';
import { rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';

const positions = { width: 500, height: 400, entities: { a: { x: 100, y: 300 }, b: { x: 300, y: 100 } }, avatars: { joueur: { x: 50, y: 350 }, sorcier: { x: 450, y: 50 } } };
const combat = { attaquants: ['a'], cibleIndividuelle: { cibleId: 'b', ciblee: false } };

test('échange réel : chiffres, critique et choc restent aux positions des deux combattants', () => {
  const result = { ok: true, resume: { blessures: [{ entiteId: 'b', sourceId: 'a', montant: 3 }, { entiteId: 'a', sourceId: 'b', montant: 2 }], critiques: [{ entiteId: 'a' }], frappeSorcier: 1 } };
  const avant = JSON.stringify(result);
  const effet = cinematiqueCombatClassique(combat, 'joueur', result, positions, { a: 'A', b: 'B', 'avatar:sorcier': 'Adversaire' });
  assert.deepEqual(effet.impacts.map(({ id, montant, critique }) => [id, montant, critique]), [['b', 3, true], ['a', 2, false], ['avatar:sorcier', 1, true]]);
  assert.deepEqual(effet.choc, { x: 200, y: 200 });
  assert.match(effet.annonce, /B : 3 dégâts/);
  assert.equal(JSON.stringify(result), avant);
  const suivant = rpgMobaDecalerChiffres(effet, [effet]);
  assert.equal(suivant.impacts[0].decalageX, 48);
});

test('frappe directe des deux camps, annulation et tir raté sans faux impact', () => {
  for (const cote of ['joueur', 'sorcier']) {
    const effect = cinematiqueCombatClassique({ ...combat, cibleIndividuelle: { cibleId: null, ciblee: false } }, cote,
      { ok: true, resume: { frappeSorcier: 2 } }, positions);
    assert.deepEqual(effect.destination, positions.avatars[cote === 'joueur' ? 'sorcier' : 'joueur']);
    assert.equal(effect.impacts[0].montant, 2);
    assert.equal(effect.choc, null);
  }
  assert.equal(cinematiqueCombatClassique(combat, 'joueur', { ok: true, annule: true }, positions), null);
  const ciblee = { ...combat, cibleIndividuelle: { cibleId: 'b', ciblee: true } };
  const rate = cinematiqueCombatClassique(ciblee, 'joueur', { ok: true, resume: { coupsRapides: [{ attaquantId: 'a', rate: true }], blessures: [] } }, positions);
  assert.deepEqual(rate.impacts, []);
  assert.equal(rate.choc, null);
  assert.equal(rate.projectileRate.dx, 160);
  assert.equal(rate.projectileRate.dy, -160);
  assert.equal(cinematiqueCombatClassique(ciblee, 'joueur', { ok: true, resume: { blessures: [] } }, null).projectileRate, null);
});

test('capture la géométrie locale avant la disparition et retrouve une carte empilée', () => {
  const dom = new JSDOM('<div id="table"><div class="card-row"><div data-entity-id="a" data-card-id="chien"></div></div><div class="rpg-wizard-plate--ennemi"><div class="rpg-wizard-plate__avatar"></div></div></div>');
  const table = dom.window.document.querySelector('#table');
  table.getBoundingClientRect = () => ({ left: 100, top: 50, width: 1000, height: 800 });
  Object.defineProperties(table, { clientWidth: { value: 500 }, clientHeight: { value: 400 } });
  table.querySelector('[data-entity-id]').getBoundingClientRect = () => ({ left: 200, top: 250, width: 100, height: 100 });
  table.querySelector('.rpg-wizard-plate__avatar').getBoundingClientRect = () => ({ left: 400, top: 70, width: 80, height: 80 });
  const p = positionsCombatClassique(table, [{ entityId: 'a', cardId: 'chien' }, { entityId: 'b', cardId: 'chien' }]);
  assert.deepEqual(p.entities.a, { x: 75, y: 125 });
  assert.deepEqual(p.entities.b, p.entities.a);
  assert.deepEqual(p.avatars.sorcier, { x: 170, y: 30 });
  dom.window.close();
});

for (const cote of ['joueur', 'sorcier']) test(`bilan du vrai moteur : dégâts directs et bouclier (${cote})`, () => {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => .9 });
  d.tour = cote;
  d[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  d[cote].main.push('ashigaru-des-braises');
  const a = rpgJouerCreature(d, cote, 'ashigaru-des-braises').entite;
  a.ready = true; a.malInvocation = false; a.atk = 5;
  const defenseur = cote === 'joueur' ? 'sorcier' : 'joueur';
  d[defenseur].bouclier = 2;
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, cote, a.id).ok);
  const declaration = d.combatDeclare;
  const res = rpgResoudreAttaqueIndividuelleClassique(d, cote);
  const effet = cinematiqueCombatClassique(declaration, cote, res, { ...positions, entities: { [a.id]: positions.entities.a } });
  assert.equal(effet.impacts[0].montant, 3);
  assert.equal(effet.impacts[0].id, `avatar:${defenseur}`);
});

test('le moteur réel ne produit pas de chiffre sur une attaque ciblée ratée', () => {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [] });
  for (const cote of ['joueur', 'sorcier']) d[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  const poser = (cote) => {
    d[cote].main.push('ashigaru-des-braises');
    const tour = d.tour; d.tour = cote;
    const result = rpgJouerCreature(d, cote, 'ashigaru-des-braises'); d.tour = tour;
    assert.ok(result.ok); result.entite.ready = true; result.entite.malInvocation = false;
    return result.entite;
  };
  const a = poser('joueur'), b = poser('sorcier'); a.coupRapide = true;
  rpgReglerHasard(d, () => .01);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, b.id).ok);
  const declaration = d.combatDeclare;
  const res = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  const effet = cinematiqueCombatClassique(declaration, 'joueur', res, { ...positions, entities: { [a.id]: positions.entities.a, [b.id]: positions.entities.b } });
  assert.deepEqual(effet.impacts, []);
  assert.ok(effet.projectileRate);
  assert.equal(effet.choc, null);
});

test('les styles réutilisent le MOBA et conservent les chiffres en mouvement réduit', () => {
  const css = readFileSync(new URL('../src/games/rpg-moba.css', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  assert.match(css, /\.card-table \.rpg-classique-impact-cinema[^}]*pointer-events: none/s);
  assert.match(css, /\.rpg-battle\.is-reduced \.rpg-classique-impact-cinema \.moba__impact-number \{ animation: none; opacity: 1;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.rpg-classique-impact-cinema[\s\S]*?\.rpg-classique-impact-cinema \.moba__impact-number \{ animation: none; opacity: 1;/);
  assert.match(page, /positionsCombatClassique\(tableRef\.current, champAvant\)/);
  assert.match(page, /rpgMobaDecalerChiffres\(impact, courants\)/);
  assert.match(page, /programmerNettoyage\([\s\S]*?\), 1200\)/);
  assert.match(page, /animationsVisuellesTimersRef\.current\.push\(timer\)/);
  assert.match(page, /setImpactsCombatClassique\(\[\]\)/);
});
