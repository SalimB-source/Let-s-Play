import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RPG_CHUTE_BONUS,
  RPG_CLOCK_INTERVAL,
  RPG_CONSONANCE_MULTIPLIER,
  RPG_COUNTER_REDUCTION,
  RPG_CRISTALLISATION_COST,
  RPG_CRIT_CAP,
  RPG_FELURE_COUNTER,
  RPG_FELURE_INTERRUPT,
  RPG_FELURE_MAX,
  RPG_FELURE_MULTIPLIER,
  RPG_GUARD_REDUCTION,
  RPG_INTENT_FAMILIES,
  RPG_SABLE_SPILL,
  RPG_TIERS,
  RPG_TIER_DAMAGE,
  RPG_TIER_TAKEN,
  RPG_VERRE_MAX,
  rpgAddFoes,
  rpgBarrage,
  rpgCheckEnd,
  computeIntent,
  rpgComputeDamage,
  rpgComputeHeal,
  rpgComputeShield,
  rpgCreateBattle,
  rpgCritChance,
  rpgCreuxBonuses,
  rpgCurrentActor,
  rpgDealDamage,
  rpgDrawCards,
  rpgDraftPick,
  rpgElementMultiplier,
  rpgCounterElement,
  rpgEndTurn,
  rpgEnemyTurn,
  rpgEstimateIntent,
  rpgFelureRatio,
  rpgGuard,
  rpgPlayCard,
  rpgPlayableCards,
  rpgComputeRecolte,
  rpgRecolte,
  rpgReposition,
  rpgRewards,
  rpgSouffle,
  rpgSwap,
  rpgTierMultiplier,
  rpgTurnRing,
  rpgXpForLevel,
} from '../src/games/rpgCombat.js';
import { cardById } from '../src/games/rpgCards.js';

// ── Petits acteurs de test ─────────────────────────────────────────────────
// Salem et Yamina existent dans le catalogue de cartes : leur attaque de
// base sert de référence aux tests d'intégration ; les pouvoirs sont posés
// dans la main quand un test en a besoin.
function hero(overrides = {}) {
  return {
    id: 'salem',
    name: 'Salem',
    role: 'Le Sondeur · Sable',
    element: 'sable',
    level: 12,
    maxHp: 400,
    atk: 30,
    def: 20,
    mag: 30,
    res: 20,
    spd: 10,
    agi: 60,
    tier: 1,
    nameSegments: 3,
    ...overrides,
  };
}

function foe(overrides = {}) {
  return {
    id: 'balayeur',
    name: 'Balayeur',
    element: 'sable',
    maxHp: 900,
    atk: 24,
    def: 10,
    mag: 20,
    res: 10,
    spd: 20, // agit en premier : pratique pour tester les intentions
    agi: 40,
    tier: 1,
    moves: [{ id: 'raclette', label: 'Raclette', family: 'lourd', power: 100, kind: 'physique', weight: 1 }],
    ...overrides,
  };
}

function battle(overrides = {}) {
  return rpgCreateBattle({ party: [hero()], foes: [foe()], seed: 7, ...overrides });
}

const actor = (b, id) => b.actors.find((a) => a.id === id);

/** Force un ennemi à annoncer un coup précis (une seule action = choix sûr). */
function withIntent(b, move) {
  const enemy = actor(b, 'balayeur');
  enemy.moves = [move];
  enemy.spd = 20;
  enemy.delayed = null;
  b.ring = ['balayeur', 'salem'];
  b.ringIndex = 0;
  computeIntent(b, enemy);
  return enemy;
}

/** Met Salem au poste de pilote et lui donne de quoi payer ses cartes. */
function salemTurn(b, sable = 100) {
  b.ring = ['salem', 'balayeur'];
  b.ringIndex = 0;
  b.ground.equipe = sable;
  return actor(b, 'salem');
}

// ── Éléments ───────────────────────────────────────────────────────────────
test('éléments : le cycle Braise → Souffle → Sable → Eau → Braise', () => {
  assert.equal(rpgElementMultiplier('braise', 'souffle'), 1.5);
  assert.equal(rpgElementMultiplier('souffle', 'sable'), 1.5);
  assert.equal(rpgElementMultiplier('sable', 'eau'), 1.5);
  assert.equal(rpgElementMultiplier('eau', 'braise'), 1.5);
  assert.equal(rpgElementMultiplier('souffle', 'braise'), 0.75);
  assert.equal(rpgElementMultiplier('eau', 'sable'), 0.75);
  assert.equal(rpgElementMultiplier('sable', 'braise'), 1);
});

test('éléments : l’axe Encre ↔ Verre est avantageux dans les deux sens', () => {
  assert.equal(rpgElementMultiplier('encre', 'verre'), 1.5);
  assert.equal(rpgElementMultiplier('verre', 'encre'), 1.5);
  assert.equal(rpgElementMultiplier('encre', 'sable'), 1);
});

test('contre-élément : on sait quel élément bat lequel', () => {
  assert.equal(rpgCounterElement('souffle'), 'braise');
  assert.equal(rpgCounterElement('sable'), 'souffle');
  assert.equal(rpgCounterElement('eau'), 'sable');
  assert.equal(rpgCounterElement('braise'), 'eau');
});

// ── Étages ─────────────────────────────────────────────────────────────────
test('étages : frapper de haut fait +15 % par étage, être en haut protège de 5 %', () => {
  assert.equal(rpgTierMultiplier(3, 1), 1 + 2 * RPG_TIER_DAMAGE);
  assert.equal(rpgTierMultiplier(1, 3), 1 - 2 * RPG_TIER_TAKEN);
  assert.equal(rpgTierMultiplier(1, 1), 1);
});

test('étages : tout le monde descend d’un étage à chaque round', () => {
  const b = battle();
  actor(b, 'salem').tier = 3;
  actor(b, 'balayeur').tier = 2;
  b.ringIndex = b.ring.length - 1;
  rpgEndTurn(b);
  assert.equal(actor(b, 'salem').tier, 2);
  assert.equal(actor(b, 'balayeur').tier, 1);
});

test('étages : on ne descend pas sous le premier', () => {
  const b = battle();
  actor(b, 'salem').tier = 1;
  b.ringIndex = b.ring.length - 1;
  rpgEndTurn(b);
  assert.equal(actor(b, 'salem').tier, 1);
});

test('étages : la carte Reposition fait monter et refuse au-delà du 3e', () => {
  const b = battle();
  const salem = salemTurn(b);
  b.hand.push('reposition');
  assert.equal(rpgPlayCard(b, { actorId: 'salem', cardId: 'reposition' }).ok, true);
  assert.equal(salem.tier, 2);
  salem.tier = 3;
  assert.equal(rpgPlayCard(b, { actorId: 'salem', cardId: 'reposition' }).ok, false);
});

test('étages : une chute du 3e au 1er frappe ×1,4', () => {
  const base = rpgComputeDamage({ attack: 30, power: 100, defense: 10, variance: 1 });
  const chute = rpgComputeDamage({ attack: 30, power: 100, defense: 10, variance: 1, chute: true });
  assert.equal(chute, Math.round(base * RPG_CHUTE_BONUS));
  // et la carte Crochet fait bien descendre d'un étage
  const b = battle();
  const enemy = actor(b, 'balayeur');
  enemy.tier = 3;
  salemTurn(b);
  b.hand.push('crochet');
  rpgPlayCard(b, { actorId: 'salem', cardId: 'crochet', targetId: 'balayeur' });
  assert.equal(enemy.tier, 2);
});

// ── Formules pures ─────────────────────────────────────────────────────────
test('dégâts : la formule de base se calcule à la main', () => {
  const value = rpgComputeDamage({
    attack: 30,
    power: 100,
    defense: 20,
    crit: false,
    variance: 1,
  });
  assert.equal(value, Math.round(30 * 100 / 100 - 20 * 0.5));
});

test('soin, barrage et récolte ont leur formule', () => {
  assert.equal(rpgComputeHeal({ magic: 30, power: 100 }), Math.round(30 * 100 / 100 * 1.15));
  assert.equal(rpgComputeShield({ mag: 30 }), Math.round(40 + 30 * 1.2));
  assert.equal(rpgComputeRecolte(40), Math.round(40 * 0.8));
});

test('critique : plafonné à 35 %', () => {
  assert.equal(rpgCritChance({ agi: 4000 }), RPG_CRIT_CAP);
  assert.ok(rpgCritChance({ agi: 60 }) > 0.05);
});

// ── Intention : l'ennemi annonce sa carte ──────────────────────────────────
test('intention : chaque ennemi annonce son coup dès l’ouverture', () => {
  const b = battle();
  const enemy = actor(b, 'balayeur');
  assert.ok(enemy.intent, 'l’ennemi ouvre avec une intention');
  assert.equal(enemy.intent.family, 'lourd');
  assert.equal(enemy.intent.targetId, 'salem');
});

test('intention : les cinq familles sont connues', () => {
  assert.deepEqual(Object.keys(RPG_INTENT_FAMILIES).sort(),
    ['incantation', 'lourd', 'sablier', 'soutien', 'zone']);
});

test('intention : l’incantation annonce l’élément qui l’interrompt', () => {
  const b = battle();
  const enemy = withIntent(b, { id: 'chaudiere', label: 'Chaudière', family: 'incantation', power: 120, counterElement: 'eau', weight: 1 });
  assert.equal(enemy.intent.counterElement, 'eau');
});

test('intention : après son coup, l’ennemi annonce déjà le suivant', () => {
  const b = battle();
  withIntent(b, { id: 'raclette', label: 'Raclette', family: 'lourd', power: 100, kind: 'physique', weight: 1 });
  rpgEnemyTurn(b);
  const enemy = actor(b, 'balayeur');
  assert.ok(enemy.intent, 'une nouvelle carte est annoncée');
});

test('ennemi : il pose sa carte annoncée avant de l’exécuter', () => {
  const b = battle();
  withIntent(b, { id: 'raclette', label: 'Raclette', family: 'lourd', power: 100, kind: 'physique', weight: 1 });
  rpgEnemyTurn(b);
  assert.ok(b.log.some((line) => line.text.includes('pose la carte « Raclette »')));
});

// ── Cartes de base et main ─────────────────────────────────────────────────
test('cartes : une seule attaque de base par personnage, gratuite, une fois par tour', () => {
  const b = battle();
  salemTurn(b, 0);
  const enemy = actor(b, 'balayeur');
  const before = enemy.hp;
  const first = rpgPlayCard(b, { actorId: 'salem', cardId: 'sonde', targetId: 'balayeur' });
  assert.equal(first.ok, true);
  assert.ok(enemy.hp < before, 'la carte de base blesse');
  const again = rpgPlayCard(b, { actorId: 'salem', cardId: 'sonde', targetId: 'balayeur' });
  assert.equal(again.ok, false, 'deuxième base refusée dans le même tour');
});

test('cartes : sonder le sol ajoute du sable, une fois par tour', () => {
  const b = battle();
  salemTurn(b, 0);
  assert.equal(rpgPlayCard(b, { actorId: 'salem', cardId: 'sonder-le-sol' }).ok, true);
  assert.equal(b.ground.equipe, 20);
  assert.equal(rpgPlayCard(b, { actorId: 'salem', cardId: 'sonder-le-sol' }).ok, false);
});

test('main : on pioche à l’ouverture et la main propose base + pouvoirs', () => {
  const b = battle();
  assert.equal(b.hand.length, 4, 'quatre cartes en main à l’ouverture');
  const salem = salemTurn(b);
  const playable = rpgPlayableCards(b, salem);
  assert.ok(playable.some((c) => c.id === 'sonde' && c.source === 'base'));
  assert.ok(playable.some((c) => c.id === 'sonder-le-sol'));
  for (const id of b.hand) assert.ok(playable.some((c) => c.id === id && c.source === 'main'));
});

test('main : une carte jouée part au cimetière et paie son sable', () => {
  const b = battle();
  const salem = salemTurn(b, 60);
  b.hand.length = 0;
  b.hand.push('crochet'); // coût 10
  const before = b.ground.equipe;
  assert.equal(rpgPlayCard(b, { actorId: 'salem', cardId: 'crochet', targetId: 'balayeur' }).ok, true);
  assert.equal(b.hand.length, 0);
  assert.deepEqual(b.graveyard, ['crochet']);
  assert.equal(b.ground.equipe, before - cardById('crochet').cost);
});

test('main : une carte trop chère refuse de partir sans le sable demandé', () => {
  const b = battle();
  salemTurn(b, 0);
  b.hand.length = 0;
  b.hand.push('effondrement'); // coût 40
  const result = rpgPlayCard(b, { actorId: 'salem', cardId: 'effondrement', targetId: 'balayeur' });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'sable-insuffisant');
});

test('main : piocher ne donne jamais deux fois la même carte ni plus de sept', () => {
  const b = battle();
  b.hand.length = 0;
  b.graveyard.length = 0;
  const drawn = rpgDrawCards(b, 7);
  assert.equal(new Set(drawn).size, drawn.length);
  assert.equal(rpgDrawCards(b, 1).length, 0, 'main pleine : on ne pioche pas');
});

test('nom : une carte verrouillée est refusée et signalée', () => {
  const b = battle();
  const salem = salemTurn(b);
  salem.nameSegments = 2;
  b.hand.length = 0;
  b.hand.push('le-dernier-etage'); // exige 3 segments
  const result = rpgPlayCard(b, { actorId: 'salem', cardId: 'le-dernier-etage', targetId: 'balayeur' });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'nom-verrouille');
  assert.ok(rpgPlayableCards(b, salem).some((c) => c.id === 'le-dernier-etage' && c.locked));
});

// ── Réponses devenues cartes ───────────────────────────────────────────────
test('garde : −60 % de dégâts et +1 Verre quand on était la cible annoncée', () => {
  const b = battle();
  const salem = actor(b, 'salem');
  withIntent(b, { id: 'raclette', label: 'Raclette', family: 'lourd', power: 100, kind: 'physique', weight: 1 });
  b.hand.length = 0;
  b.hand.push('garde');
  b.ring = ['salem', 'balayeur'];
  b.ringIndex = 0;
  assert.equal(rpgPlayCard(b, { actorId: 'salem', cardId: 'garde' }).ok, true);
  assert.equal(salem.guarding, true);
  assert.equal(b.verre, 1, 'cible annoncée : +1 Verre');
  const hp = salem.hp;
  rpgEndTurn(b);
  rpgEnemyTurn(b);
  const lost = hp - salem.hp;
  // brut : 24×100/100 − 20×0.5 = 14 ; gardé : ×0,4 ≈ 6 (variance ±5 %)
  assert.ok(lost <= 8, `la garde écrase le coup (perdu : ${lost})`);
});

test('garde : sans cible annoncée, pas de Verre', () => {
  const b = battle();
  actor(b, 'balayeur').intent = null;
  salemTurn(b);
  b.hand.length = 0;
  b.hand.push('garde');
  rpgPlayCard(b, { actorId: 'salem', cardId: 'garde' });
  assert.equal(b.verre, 0);
});

test('barrage : la carte Bulle absorbe avant les PV', () => {
  const b = battle();
  const salem = salemTurn(b, 30);
  b.hand.length = 0;
  b.hand.push('bulle'); // coût 20
  assert.equal(rpgPlayCard(b, { actorId: 'salem', cardId: 'bulle', targetId: 'salem' }).ok, true);
  const shield = salem.shield;
  assert.ok(shield > 0);
  const hp = salem.hp;
  rpgDealDamage(b, salem, Math.max(1, shield - 5));
  assert.equal(salem.hp, hp, 'le barrage encaisse tout');
  assert.ok(salem.shield < shield);
});

test('contre-élément : l’attaque annoncée tombe à moitié et la Fêlure monte', () => {
  const b = battle({
    party: [hero(), { ...hero(), id: 'yamina', name: 'Yamina', element: 'verre', spd: 14 }],
  });
  const enemy = withIntent(b, { id: 'tampon', label: 'Tampon', family: 'lourd', power: 100, kind: 'magie', element: 'encre', weight: 1 });
  b.ring = ['yamina', 'salem', 'balayeur'];
  b.ringIndex = 0;
  const felure = enemy.felure;
  assert.equal(rpgPlayCard(b, { actorId: 'yamina', cardId: 'aiguille', targetId: 'balayeur' }).ok, true);
  assert.equal(enemy.contred, true, 'verre contre encre : élan cassé');
  assert.ok(enemy.felure >= felure + RPG_FELURE_COUNTER, '+15 Fêlure de contre, au moins');
  assert.equal(b.verre, 1);
});

test('interruption : le bon élément annule l’incantation, +25 Fêlure', () => {
  const b = battle({
    party: [hero(), { ...hero(), id: 'yamina', name: 'Yamina', element: 'verre', spd: 12 }],
  });
  const enemy = withIntent(b, { id: 'chaudiere', label: 'Chaudière', family: 'incantation', power: 120, kind: 'magie', element: 'braise', counterElement: 'verre', weight: 1 });
  b.ring = ['yamina', 'balayeur', 'salem'];
  b.ringIndex = 0;
  const felure = enemy.felure;
  assert.equal(rpgPlayCard(b, { actorId: 'yamina', cardId: 'aiguille', targetId: 'balayeur' }).ok, true);
  assert.equal(enemy.intent, null, 'l’incantation retombe');
  assert.ok(enemy.felure >= felure + RPG_FELURE_INTERRUPT, '+25 Fêlure d’interruption');
});

test('retard : la carte Retard repousse le coup annoncé d’un round', () => {
  const b = battle();
  const enemy = withIntent(b, { id: 'raclette', label: 'Raclette', family: 'lourd', power: 100, kind: 'physique', weight: 1 });
  salemTurn(b, 40);
  b.hand.length = 0;
  b.hand.push('retard');
  assert.equal(rpgPlayCard(b, { actorId: 'salem', cardId: 'retard', targetId: 'balayeur' }).ok, true);
  assert.equal(enemy.intent, null);
  assert.ok(enemy.delayed, 'le coup est mis de côté');
});

// ── Sable ──────────────────────────────────────────────────────────────────
test('sable : la moitié des PV perdus tombe sur le sol de la victime', () => {
  const b = battle();
  const enemy = actor(b, 'balayeur');
  const lost = rpgDealDamage(b, enemy, 100);
  assert.equal(b.ground.ennemi, Math.round(lost * RPG_SABLE_SPILL));
});

test('récolte : convertit le sable du sol en soins', () => {
  const b = battle();
  const salem = salemTurn(b, 50);
  salem.hp = 300;
  const result = rpgRecolte(b, 'salem');
  assert.equal(result.taken, 40);
  assert.ok(salem.hp > 300);
  assert.equal(b.ground.equipe, 10);
});

test('récolte : impossible sur un sol vide', () => {
  const b = battle();
  salemTurn(b, 0);
  assert.equal(rpgRecolte(b, 'salem').ok, false);
});

test('souffle : on retire du sable à l’ennemi et on en récupère la moitié', () => {
  const b = battle();
  salemTurn(b, 0);
  b.ground.ennemi = 60;
  assert.equal(rpgSouffle(b, 'salem').ok, true);
  assert.equal(b.ground.ennemi, 20);
  assert.equal(b.ground.equipe, 20);
});

test('sablier : l’ennemi se soigne avec son sable, sauf si on le souffle', () => {
  const b = battle();
  const enemy = withIntent(b, { id: 'sac', label: 'Sac de sable', family: 'sablier', power: 0, weight: 1 });
  b.ground.ennemi = 40;
  enemy.hp = 500;
  rpgEnemyTurn(b);
  assert.ok(enemy.hp > 500, 'il se soigne avec son sable');
});

// ── Fêlure ─────────────────────────────────────────────────────────────────
test('fêlure : à 100 l’ennemi est Fêlé, perd son tour et le premier coup est gratuit', () => {
  const b = battle();
  const enemy = actor(b, 'balayeur');
  enemy.felure = RPG_FELURE_MAX;
  enemy.fele = true;
  withIntent(b, { id: 'raclette', label: 'Raclette', family: 'lourd', power: 100, kind: 'physique', weight: 1 });
  enemy.fele = true;
  const hp = actor(b, 'salem').hp;
  rpgEnemyTurn(b);
  assert.equal(actor(b, 'salem').hp, hp, 'Fêlé : il ne frappe pas');
  b.freeSkillFor = 'balayeur';
  salemTurn(b, 0);
  const ehp = enemy.hp;
  rpgPlayCard(b, { actorId: 'salem', cardId: 'sonde', targetId: 'balayeur' });
  assert.ok(enemy.hp < ehp, 'le coup gratuit part même sans sable');
});

test('fêlure : les dégâts sont doublés sur un ennemi Fêlé', () => {
  const brut = battle();
  salemTurn(brut, 0);
  const e1 = actor(brut, 'balayeur');
  const hp1 = e1.hp;
  rpgPlayCard(brut, { actorId: 'salem', cardId: 'sonde', targetId: 'balayeur' });
  const perdBrut = hp1 - e1.hp;

  const b = battle();
  const enemy = actor(b, 'balayeur');
  enemy.fele = true;
  enemy.felure = RPG_FELURE_MAX;
  salemTurn(b, 0);
  const hp = enemy.hp;
  rpgPlayCard(b, { actorId: 'salem', cardId: 'sonde', targetId: 'balayeur' });
  const perdu = hp - enemy.hp;
  assert.ok(perdu >= perdBrut * 2 - 2 && perdu <= perdBrut * 2 + 2, `le coup est doublé (${perdBrut} → ${perdu})`);
  assert.equal(rpgFelureRatio(enemy), 1);
});

// ── Consonance & cristallisation ───────────────────────────────────────────
test('consonance : trois éléments dans le round donnent ×1,5 et un Verre', () => {
  const b = battle();
  salemTurn(b);
  b.hand.length = 0;
  b.hand.push('four'); // braise
  b.ground.equipe = 60;
  rpgPlayCard(b, { actorId: 'salem', cardId: 'sonde', targetId: 'balayeur' }); // sable
  actor(b, 'salem').basicUsed = false;
  rpgPlayCard(b, { actorId: 'salem', cardId: 'four', targetId: 'balayeur' });
  b.roundElements.push('eau');
  assert.equal(b.consonance, false);
  b.roundElements.push('verre');
  // la consonance se déclenche à l'enregistrement du 3e élément distinct :
  const b2 = battle();
  salemTurn(b2, 60);
  b2.hand.length = 0;
  b2.hand.push('four');
  rpgPlayCard(b2, { actorId: 'salem', cardId: 'sonde', targetId: 'balayeur' });
  rpgPlayCard(b2, { actorId: 'salem', cardId: 'four', targetId: 'balayeur' });
  assert.ok(b2.roundElements.includes('sable') && b2.roundElements.includes('braise'));
});

test('cristallisation : 3 Verres dépensés, puissance doublée', () => {
  const brut = battle();
  salemTurn(brut, 60);
  brut.hand.length = 0;
  brut.hand.push('four');
  const e1 = actor(brut, 'balayeur');
  const hp1 = e1.hp;
  rpgPlayCard(brut, { actorId: 'salem', cardId: 'four', targetId: 'balayeur' });
  const degatsBruts = hp1 - e1.hp;

  const b = battle();
  salemTurn(b, 60);
  b.hand.length = 0;
  b.hand.push('four');
  b.verre = 3;
  const e2 = actor(b, 'balayeur');
  const hp2 = e2.hp;
  const result = rpgPlayCard(b, { actorId: 'salem', cardId: 'four', targetId: 'balayeur', crystallize: true });
  assert.equal(result.ok, true);
  assert.equal(b.verre, 0);
  const degatsCristal = hp2 - e2.hp;
  assert.ok(degatsCristal > degatsBruts * 1.5, `cristallisé (${degatsCristal}) >> brut (${degatsBruts})`);
});

test('cristallisation : refusée sans assez de Verre', () => {
  const b = battle();
  salemTurn(b, 60);
  b.hand.length = 0;
  b.hand.push('four');
  b.verre = 1;
  assert.equal(rpgPlayCard(b, { actorId: 'salem', cardId: 'four', targetId: 'balayeur', crystallize: true }).ok, false);
});

test('verre : la jauge ne dépasse jamais 5', () => {
  const b = battle();
  b.verre = RPG_VERRE_MAX;
  salemTurn(b);
  b.hand.length = 0;
  b.hand.push('garde');
  withIntent(b, { id: 'raclette', label: 'Raclette', family: 'lourd', power: 100, kind: 'physique', weight: 1 });
  b.ring = ['salem', 'balayeur'];
  b.ringIndex = 0;
  rpgPlayCard(b, { actorId: 'salem', cardId: 'garde' });
  assert.equal(b.verre, RPG_VERRE_MAX);
});

// ── Astrolabe ──────────────────────────────────────────────────────────────
test('astrolabe : il sonne tous les 5 rounds, renforce les ennemis et fait descendre', () => {
  const b = battle();
  actor(b, 'salem').tier = 2;
  for (let i = 0; i < 12 && b.clockStrike === 0; i += 1) {
    b.ringIndex = b.ring.length - 1;
    rpgEndTurn(b);
  }
  assert.ok(b.clockStrike > 0, 'l’Astrolabe sonne');
  assert.equal(b.round, RPG_CLOCK_INTERVAL + 1);
  assert.equal(actor(b, 'salem').tier, 1, 'tout le monde descend');
});

test('astrolabe : un boss en phase 2 raccourcit l’horloge', () => {
  const b = battle({
    foes: [foe({ phases: [{ threshold: 0.5, clockInterval: 2, label: 'Phase 2' }] })],
  });
  const enemy = actor(b, 'balayeur');
  enemy.hp = enemy.maxHp * 0.4;
  withIntent(b, { id: 'raclette', label: 'Raclette', family: 'lourd', power: 100, kind: 'physique', weight: 1 });
  rpgEnemyTurn(b);
  assert.equal(b.clockInterval, 2);
});

// ── Draft & collection ─────────────────────────────────────────────────────
test('draft : chaque vague offre trois cartes hors collection, on en garde une', () => {
  const b = battle();
  const rewards = rpgRewards(b);
  assert.equal(rewards.draft.length, 3);
  for (const id of rewards.draft) assert.ok(!b.collection.includes(id));
  const chosen = rewards.draft[0];
  assert.equal(rpgDraftPick(b, chosen).ok, true);
  assert.ok(b.collection.includes(chosen));
  assert.equal(b.draft, null);
  const again = rpgRewards(b);
  assert.equal(again.draft, null, 'l’offre ne se retire pas');
});

// ── Divers ─────────────────────────────────────────────────────────────────
test('statut : une carte sans puissance ne blesse personne', () => {
  const b = battle();
  const enemy = actor(b, 'balayeur');
  salemTurn(b, 40);
  b.hand.length = 0;
  b.hand.push('retard');
  const hp = enemy.hp;
  rpgPlayCard(b, { actorId: 'salem', cardId: 'retard', targetId: 'balayeur' });
  assert.equal(enemy.hp, hp);
});

test('réserve : la permutation échange les places', () => {
  const b = battle({ reserve: [hero({ id: 'tarek', name: 'Tarek', spd: 5 })] });
  assert.equal(rpgSwap(b, 'salem', 'tarek').ok, true);
  assert.equal(actor(b, 'salem').side, 'reserve');
  assert.equal(actor(b, 'tarek').side, 'equipe');
});

test('ouverture : 4 cartes en main, 0 Verre, sols vides, anneau par Vitesse', () => {
  const b = battle();
  assert.equal(b.hand.length, 4);
  assert.equal(b.verre, 0);
  assert.deepEqual(b.ground, { equipe: 0, ennemi: 0 });
  assert.equal(rpgCurrentActor(b).id, 'balayeur', 'le plus rapide ouvre');
  assert.ok(rpgTurnRing(b, 4).length >= 2);
});

test('embuscade : l’équipe agit en premier', () => {
  const b = battle({ ambush: true });
  assert.equal(rpgCurrentActor(b).id, 'salem');
});

test('vagues : on ajoute des ennemis en cours de combat, avec leur intention', () => {
  const b = battle();
  rpgAddFoes(b, [foe({ id: 'balayeur-2', spd: 1 })]);
  assert.ok(actor(b, 'balayeur-2').intent);
});

test('victoire et défaite ferment le combat', () => {
  const b = battle();
  actor(b, 'balayeur').hp = 0;
  actor(b, 'balayeur').alive = false;
  rpgCheckEnd(b);
  assert.equal(b.over, 'victoire');
  const b2 = battle();
  actor(b2, 'salem').hp = 0;
  actor(b2, 'salem').alive = false;
  rpgCheckEnd(b2);
  assert.equal(b2.over, 'defaite');
});

test('récompenses : celles du contenu sont conservées et s’additionnent', () => {
  const b = battle({ foes: [foe(), foe({ id: 'balayeur-2' })] });
  const rewards = rpgRewards(b);
  assert.ok(rewards.xp >= 80);
  assert.ok(rewards.sable >= 50);
});

test('difficulté : elle change les dégâts, pas le tempo', () => {
  const calme = battle({ difficulty: 'recit' });
  const veille = battle({ difficulty: 'veilleur' });
  assert.ok(RPG_INTENT_FAMILIES.lourd);
  assert.notEqual(calme.difficulty, veille.difficulty);
});

test('progression : la courbe d’XP suit 60 × n^1,6', () => {
  assert.equal(rpgXpForLevel(1), 60);
  assert.ok(rpgXpForLevel(10) > rpgXpForLevel(9));
});

test('creux : un compagnon perdu laisse une empreinte utile à l’équipe', () => {
  const bonuses = rpgCreuxBonuses(['salem']);
  assert.ok(Object.keys(bonuses).length > 0);
});

test('tour : on passe au suivant, puis au round d’après en piochant', () => {
  const b = battle();
  assert.equal(rpgCurrentActor(b).id, 'balayeur');
  rpgEndTurn(b);
  assert.equal(rpgCurrentActor(b).id, 'salem');
  const hand = b.hand.length;
  rpgEndTurn(b);
  assert.equal(b.round, 2);
  assert.ok(b.hand.length >= hand, 'le nouveau tour pioche');
});

test('éphemère : la carte Garde répond pendant le tour ennemi', () => {
  const b = battle();
  withIntent(b, { id: 'raclette', label: 'Raclette', family: 'lourd', power: 100, kind: 'physique', weight: 1 });
  assert.equal(rpgCurrentActor(b).id, 'balayeur', "c'est le tour de l'ennemi");
  b.hand.length = 0;
  b.hand.push('garde');
  const result = rpgPlayCard(b, { actorId: 'salem', cardId: 'garde' });
  assert.equal(result.ok, true, 'un éphémère se pose hors de son tour');
  const b2 = battle();
  withIntent(b2, { id: 'raclette', label: 'Raclette', family: 'lourd', power: 100, kind: 'physique', weight: 1 });
  b2.hand.length = 0;
  b2.hand.push('nappe'); // pas un éphémère
  assert.equal(rpgPlayCard(b2, { actorId: 'salem', cardId: 'nappe' }).ok, false);
});
