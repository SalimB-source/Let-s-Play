/**
 * L'Attaque ciblée sonne comme une flèche, jamais comme une épée.
 *
 * Le duel n'avait qu'une frappe de créature : `player_attack_hit`, un coup
 * d'épée, joué aussi bien par un corps à corps que par la frappe ciblée du
 * coup rapide. Une créature qui ne faisait QUE sa frappe ciblée (sa proie
 * désignée, son attaque arrêtée sur la touche) entendait donc l'acier.
 *
 * `rpgAttackAudio.js` sépare les deux gestes : un whoosh pour la flèche qui
 * touche, un autre pour celle qui rate, le coup d'épée pour le corps à
 * corps. Ces tests figent le partage, l'échantillon lui-même, et le routage
 * du lecteur.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RPG_ARROW_MISS_SFX, RPG_ARROW_SFX, RPG_SFX_NAMES, RpgAudioPlayer, rpgSfx } from '../src/games/rpgAudio.js';
import { gainEchantillon } from '../src/games/rpgNiveauxSons.js';
import {
  RPG_MELEE_SFX,
  rpgFrappesCibleesReussies,
  rpgFrappesCibleesTirees,
  rpgResolutionAToucheUneCible,
  rpgSonsResolutionCombat,
} from '../src/games/rpgAttackAudio.js';

const FLECHE_TOUCHEE = new URL('../src/games/assets/arrow-whoosh-hit.mp3', import.meta.url);
const FLECHE_RATEE = new URL('../src/games/assets/arrow-whoosh-miss.mp3', import.meta.url);

function resumeDeTest(overrides = {}) {
  return {
    frappeSorcier: 0,
    paires: [],
    coupsRapides: [],
    blocages: {},
    repartitions: {},
    attaquantsBloques: [],
    critiques: [],
    ...overrides,
  };
}

test('les deux whooshes de flèche fournis sont livrés avec le jeu', () => {
  const touchee = readFileSync(FLECHE_TOUCHEE);
  const ratee = readFileSync(FLECHE_RATEE);
  assert.ok(touchee.byteLength > 30_000 && touchee.byteLength < 120_000,
    'le whoosh qui touche reste un effet court, pas une musique');
  assert.ok(ratee.byteLength > 20_000 && ratee.byteLength < 100_000,
    'le whoosh qui rate reste un effet court, pas une musique');
  assert.notDeepEqual(touchee, ratee, 'les deux issues ont des fichiers différents');
});

test('les whooshes de flèche touchée et ratée sont deux échantillons jouables', () => {
  assert.equal(RPG_ARROW_SFX, 'fleche');
  assert.equal(RPG_ARROW_MISS_SFX, 'fleche_ratee');
  assert.ok(RPG_SFX_NAMES.includes(RPG_ARROW_SFX));
  assert.ok(RPG_SFX_NAMES.includes(RPG_ARROW_MISS_SFX));
  assert.deepEqual(rpgSfx(RPG_ARROW_SFX), [{ kind: 'sample', at: 0, dur: 3, g: 1 }]);
  assert.deepEqual(rpgSfx(RPG_ARROW_MISS_SFX), [{ kind: 'sample', at: 0, dur: 2, g: 1 }]);
  // Le coup d'épée reste au catalogue : il sert toujours le corps à corps.
  assert.equal(RPG_MELEE_SFX, 'player_attack_hit');
  assert.ok(RPG_SFX_NAMES.includes(RPG_MELEE_SFX));
});

test('seules les frappes ciblées réellement portées comptent', () => {
  const touchee = { attaquantId: 'a1', cibleId: 'c1', degats: 3 };
  assert.deepEqual(rpgFrappesCibleesReussies(resumeDeTest({
    coupsRapides: [touchee, { attaquantId: 'a2', rate: true }, { attaquantId: 'a3', annule: true }],
  })), [touchee]);
  assert.equal(rpgResolutionAToucheUneCible(resumeDeTest({ coupsRapides: [touchee] })), true);
  assert.equal(rpgResolutionAToucheUneCible(resumeDeTest({ coupsRapides: [{ attaquantId: 'a2', rate: true }] })), false);
  assert.deepEqual(rpgFrappesCibleesReussies(null), []);
  assert.deepEqual(rpgFrappesCibleesReussies({}), []);
});

test('tout tir parti compte comme flèche, raté compris — l’annulée non', () => {
  const touchee = { attaquantId: 'a1', cibleId: 'c1', degats: 3 };
  const ratee = { attaquantId: 'a2', cibleId: 'c2', rate: true };
  const annulee = { attaquantId: 'a3', annule: true };
  assert.deepEqual(rpgFrappesCibleesTirees(resumeDeTest({
    coupsRapides: [touchee, ratee, annulee],
  })), [touchee, ratee], 'la proie qui disparaît avant le tir n’envoie rien');
  assert.deepEqual(rpgFrappesCibleesTirees(null), []);
  // Deux attaquants ciblés dont un rate : chaque issue a son whoosh.
  const sons = rpgSonsResolutionCombat(resumeDeTest({
    coupsRapides: [touchee, ratee],
  }));
  assert.deepEqual(sons.map((son) => son.nom), [RPG_ARROW_SFX, RPG_ARROW_MISS_SFX]);
  assert.equal(sons[0].fleches, 1);
  assert.equal(sons[0].touchees, 1);
  assert.equal(sons[1].fleches, 1);
  assert.equal(sons[1].touchees, 0);
  assert.ok(sons[1].delai > sons[0].delai, 'les deux whooshes sont légèrement décalés');
});

test('une frappe ciblée seule ne joue que la flèche — jamais le coup d’épée', () => {
  const sons = rpgSonsResolutionCombat(resumeDeTest({
    coupsRapides: [{ attaquantId: 'a1', cibleId: 'c1', degats: 4 }],
  }));
  assert.deepEqual(sons.map((son) => son.nom), [RPG_ARROW_SFX]);
  assert.equal(sons[0].delai, 0.015);
  assert.equal(sons[0].fleches, 1);
  // Le scénario exact du joueur : la créature frappe sa proie, son attaque
  // s'arrête là, aucun corps à corps, aucun dégât au sorcier.
  const seul = resumeDeTest({
    coupsRapides: [{ attaquantId: 'a1', cibleId: 'c1', degats: 4 }],
    frappeSorcier: 0,
  });
  assert.equal(rpgSonsResolutionCombat(seul).some((son) => son.nom === 'player_attack_hit'), false);
});

test('le corps à corps garde le coup d’épée, sans flèche', () => {
  const sons = rpgSonsResolutionCombat(resumeDeTest({
    paires: [{ attaquantId: 'a1', bloqueurId: 'b1', degats: 2 }],
  }));
  assert.deepEqual(sons.map((son) => son.nom), [RPG_MELEE_SFX]);
});

test('deux attaquants, deux sons : la flèche d’abord, le choc ensuite', () => {
  const sons = rpgSonsResolutionCombat(resumeDeTest({
    coupsRapides: [{ attaquantId: 'a1', cibleId: 'c1', degats: 3 }],
    paires: [{ attaquantId: 'a2', bloqueurId: 'b1', degats: 2 }],
  }));
  assert.deepEqual(sons.map((son) => son.nom), [RPG_ARROW_SFX, RPG_MELEE_SFX]);
  assert.deepEqual(sons.map((son) => son.delai), [0.015, 0.015]);
});

test('une flèche ratée joue le whoosh distinct du raté, sans réveiller l’acier', () => {
  // La proie survit, aucun corps à corps, aucun dégât au sorcier : seul le
  // bruitage dédié au tir manqué est joué.
  const rate = resumeDeTest({ coupsRapides: [{ attaquantId: 'a1', cibleId: 'c1', degats: 0, rate: true }] });
  const sons = rpgSonsResolutionCombat(rate);
  assert.deepEqual(sons.map((son) => son.nom), [RPG_ARROW_MISS_SFX]);
  assert.equal(sons[0].fleches, 1);
  assert.equal(sons[0].touchees, 0, 'le résumé distingue le tir du toucher');
  assert.equal(rpgSonsResolutionCombat(rate).some((son) => son.nom === 'player_attack_hit'), false);
  assert.equal(rpgSonsResolutionCombat(rate).some((son) => son.nom === 'block_impact'), false,
    'le repli métallique de la page est mort : rien d’acier sur un raté');

  // Une proie disparue avant le tir : l'arc ne se bande pas, silence.
  assert.deepEqual(rpgSonsResolutionCombat(resumeDeTest({
    coupsRapides: [{ attaquantId: 'a1', cibleId: 'c1', annule: true }],
  })), []);
  // Pas de résumé du tout : silence, la page garde ses propres sons d'échec.
  assert.deepEqual(rpgSonsResolutionCombat(null), []);
  assert.deepEqual(rpgSonsResolutionCombat({}), []);
});

test('le souffle élémentaire remplace le coup d’épée, pas la flèche', () => {
  const sons = rpgSonsResolutionCombat(resumeDeTest({
    coupsRapides: [{ attaquantId: 'a1', cibleId: 'c1', degats: 3 }],
    paires: [{ attaquantId: 'a2', bloqueurId: 'b1', degats: 2 }],
  }), { sonMelee: 'flame_gust' });
  assert.deepEqual(sons.map((son) => son.nom), [RPG_ARROW_SFX, 'flame_gust']);
  const flecheSeule = rpgSonsResolutionCombat(resumeDeTest({
    coupsRapides: [{ attaquantId: 'a1', cibleId: 'c1', degats: 3 }],
  }), { sonMelee: 'flame_gust' });
  assert.deepEqual(flecheSeule.map((son) => son.nom), [RPG_ARROW_SFX],
    'une capacité de feu ne double jamais la flèche d’un autre attaquant');
});

test('RpgAudioPlayer route chaque issue vers son fichier de whoosh', () => {
  const lectures = [];
  class FakeAudio {
    constructor(src) {
      this.src = src;
      this.preload = '';
      this.volume = 1;
      this.currentTime = 0;
    }
    play() { lectures.push({ src: this.src, volume: this.volume }); return Promise.resolve(); }
    pause() {}
    removeAttribute() { this.src = ''; }
    load() {}
  }
  const precedent = globalThis.window;
  globalThis.window = { Audio: FakeAudio };
  try {
    const player = new RpgAudioPlayer();
    player.ctx = { currentTime: 0 };
    player.master = {};
    player.play(RPG_ARROW_SFX);
    player.play(RPG_ARROW_MISS_SFX);
    assert.equal(lectures.length, 2);
    assert.ok(lectures[0].src.endsWith('arrow-whoosh-hit.mp3'), lectures[0].src);
    assert.ok(lectures[1].src.endsWith('arrow-whoosh-miss.mp3'), lectures[1].src);
    assert.ok(Math.abs(lectures[0].volume - gainEchantillon(RPG_ARROW_SFX)) < 1e-9);
    assert.ok(Math.abs(lectures[1].volume - gainEchantillon(RPG_ARROW_MISS_SFX)) < 1e-9);
    player.destroy();
    assert.equal(player.arrowShotAudio, null, 'le démontage libère le son de touche');
    assert.equal(player.arrowWhooshMissAudio, null, 'le démontage libère le son de raté');
  } finally {
    globalThis.window = precedent;
  }
});

test('l’acier ne s’annonce que s’il va frapper', async () => {
  const { rpgVagueAnnonceAcier } = await import('../src/games/rpgAttackAudio.js');
  // Une vague qui ne tire que des flèches se valide en silence : chaque
  // attaquant a sa proie désignée, aucune lame ne se lève.
  assert.equal(rpgVagueAnnonceAcier(['a', 'b'], { a: 'x', b: 'y' }), false);
  // Un attaquant sans proie part au corps à corps : l'acier s'annonce.
  assert.equal(rpgVagueAnnonceAcier(['a', 'b'], { a: 'x' }), true);
  // Avant toute désignation, rien n'est joué : rien n'est encore décidé.
  assert.equal(rpgVagueAnnonceAcier(['a'], {}), true);
  // Vague vide, entrées absentes : jamais d'erreur, jamais d'acier.
  assert.equal(rpgVagueAnnonceAcier([], {}), false);
  assert.equal(rpgVagueAnnonceAcier(undefined, undefined), false);
});
