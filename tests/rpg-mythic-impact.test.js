import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { arriveesEnJeu, playMythicImpact } from '../src/games/rpgMythicImpact.js';
const lookup = (id) => ({ rarity: id === 'legend' ? 'mythique' : 'rare' });
const a = { id: 'a', carteId: 'legend' };
const b = { id: 'b', carteId: 'ordinary' };
const attente = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Une table de duel avec deux créatures posées, et des `animate` espionnés. */
function tableDeTest() {
  const dom = new JSDOM('<div id="table"><div class="card-row">'
    + '<button data-entity-id="a"></button><button data-entity-id="b"></button>'
    + '</div></div>');
  const table = dom.window.document.querySelector('#table');
  const traces = { table: 0, voisins: 0, carte: 0, annulees: 0 };
  const card = table.querySelector('[data-entity-id="a"]');
  const voisine = table.querySelector('[data-entity-id="b"]');
  card.getBoundingClientRect = () => ({ left: 10, top: 20, width: 100, height: 140 });
  table.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 });
  Object.defineProperty(table, 'offsetWidth', { value: 100 });
  Object.defineProperty(table, 'offsetHeight', { value: 100 });
  const espion = (compteur) => () => {
    traces[compteur] += 1;
    return { cancel() { traces.annulees += 1; } };
  };
  table.animate = espion('table');
  card.animate = espion('carte');
  voisine.animate = espion('voisins');
  return { dom, table, card, traces };
}

test('toute entité nouvelle arrive en jeu, la carte qui tombe est pour toutes', () => {
  assert.deepEqual(arriveesEnJeu([], [a, b], lookup), [
    { ...a, mythique: true },
    { ...b, mythique: false },
  ]);
  assert.deepEqual(arriveesEnJeu([a, b], [{ ...a }, b], lookup), [],
    'un rendu stable ne rejoue pas l’arrivée');
  assert.deepEqual(arriveesEnJeu([a, b], [b], lookup), [],
    'une créature qui quitte le jeu n’arrive pas');
  assert.deepEqual(arriveesEnJeu([a], [a, { ...a, id: 'c' }], lookup), [{ ...a, id: 'c', mythique: true }]);
});

test('une arrivée sans rang mythique frappe la table sans la faire trembler', async () => {
  const { dom, table, card, traces } = tableDeTest();
  globalThis.document = dom.window.document;
  try {
    const sons = [];
    const cancel = playMythicImpact(table, card, (name) => sons.push(name), false, false);
    const couche = table.querySelector('.rpg-mythic-impact');
    assert.ok(couche.classList.contains('rpg-mythic-impact--pose'),
      'la couche posée est marquée du profil d’une simple arrivée');
    assert.equal(couche.getAttribute('aria-hidden'), 'true', 'la couche est muette pour les lecteurs d’écran');
    assert.equal(traces.carte, 1, 'la carte qui s’élève et retombe : le geste est le même qu’une mythique');
    assert.equal(table.querySelectorAll('.rpg-mythic-impact__cracks path').length, 0,
      'pas de fissures : le sol ne se fend que pour une mythique');
    assert.equal(table.querySelectorAll('.rpg-mythic-impact__ring').length, 1,
      'un seul anneau, sans écho');
    assert.equal(table.querySelectorAll('.rpg-mythic-impact__dust, .rpg-mythic-impact__debris').length, 14,
      'la poussière est là, à moitié moins dense');
    await attente(420);
    assert.deepEqual(sons, [], 'aucun tonnerre : une carte posée n’est pas une arrivée de mythe');
    cancel();
    assert.deepEqual([traces.table, traces.voisins], [0, 0],
      'ni la table ni les voisines ne bougent — le tremblement reste le propre du mythe');
    assert.equal(table.children.length, 1, 'la couche est retirée avec l’animation');
  } finally { dom.window.close(); delete globalThis.document; }
});

test('une arrivée mythique garde sa cérémonie entière', async () => {
  const { dom, table, card, traces } = tableDeTest();
  globalThis.document = dom.window.document;
  try {
    const sons = [];
    const cancel = playMythicImpact(table, card, (name) => sons.push(name));
    assert.equal(table.querySelectorAll('.rpg-mythic-impact__cracks path').length, 9);
    assert.equal(table.querySelectorAll('.rpg-mythic-impact__ring').length, 2, 'l’anneau et son écho');
    assert.equal(table.querySelectorAll('.rpg-mythic-impact__dust, .rpg-mythic-impact__debris').length, 28);
    await attente(420);
    assert.deepEqual(sons, ['mythic_impact'], 'le coup de tonnerre part à l’impact');
    assert.equal(traces.table, 1, 'la table tremble');
    assert.equal(traces.voisins, 1, 'la vague soulève la créature voisine');
    assert.equal(traces.carte, 1, 'la carte a frappé le sol');
    cancel();
    assert.equal(table.children.length, 1, 'annuler rend la table à ses enfants d’origine');
  } finally { dom.window.close(); delete globalThis.document; }
});

test('mouvement réduit : l’arrivée se lit sans cérémonie, et sans secousse', async () => {
  const { dom, table, card, traces } = tableDeTest();
  globalThis.document = dom.window.document;
  try {
    const sons = [];
    const stop = playMythicImpact(table, card, (name) => sons.push(name), true, true);
    assert.ok(table.querySelector('.is-reduced'), 'la couche est marquée réduite (et cachée par la feuille)');
    assert.equal(table.querySelectorAll('.rpg-mythic-impact__cracks path').length, 0,
      'mouvement réduit : rien n’est peint sur le sol');
    assert.deepEqual(sons, ['mythic_impact'], 'le son de la mythique reste, il n’est pas un mouvement');
    await attente(420);
    assert.equal(traces.table, 0, 'mouvement réduit : la table ne tremble pas');
    assert.equal(traces.voisins, 0, 'mouvement réduit : les voisines ne tressautent pas');
    stop();
    assert.equal(traces.annulees, 1, 'annuler éteint l’éclat joué et retire la couche');
    const poses = [];
    const muet = playMythicImpact(table, card, (name) => poses.push(name), true, false);
    assert.deepEqual(poses, [], 'une simple arrivée en mouvement réduit ne sonne pas');
    assert.equal(traces.carte, 2, 'l’éclat de la carte, lui, est joué à chaque fois');
    muet();
    assert.equal(table.querySelectorAll('.rpg-mythic-impact').length, 0,
      'les deux cérémonies réduites laissent la table vide');
  } finally { dom.window.close(); delete globalThis.document; }
});
