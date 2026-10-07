import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RPG_BARRAGE_SABLE,
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
  RPG_PA_PER_TURN,
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
  rpgElementMultiplier,
  rpgCounterElement,
  rpgEndTurn,
  rpgEnemyTurn,
  rpgEstimateIntent,
  rpgFelureRatio,
  rpgGuard,
  rpgRecolte,
  rpgReposition,
  rpgRewards,
  rpgSouffle,
  rpgSwap,
  rpgTierMultiplier,
  rpgTurnRing,
  rpgUsableSkills,
  rpgUseSkill,
  rpgXpForLevel,
} from '../src/games/rpgCombat.js';

// ── Petits acteurs de test ─────────────────────────────────────────────────
// Chiffres ronds : les formules se vérifient à la main.
const SKILLS = [
  { id: 'frappe', name: 'Frappe', element: 'sable', kind: 'physique', pa: 1, power: 100, target: 'ennemi' },
  { id: 'verre', name: 'Éclat', element: 'verre', kind: 'physique', pa: 1, power: 100, interrupt: true, target: 'ennemi' },
  { id: 'braise', name: 'Braise', element: 'braise', kind: 'physique', pa: 1, power: 100, target: 'ennemi' },
  { id: 'lourd', name: 'Coup lourd', element: 'sable', kind: 'physique', pa: 2, power: 100, crystallizePower: 200, target: 'ennemi' },
  { id: 'crochet', name: 'Crochet', element: 'sable', kind: 'physique', pa: 1, power: 100, push: 1, target: 'ennemi' },
  { id: 'soin', name: 'Soin', element: 'eau', kind: 'soin', pa: 1, power: 100, target: 'allie' },
  { id: 'retard', name: 'Retard', element: 'verre', kind: 'magie', pa: 1, power: 0, delay: true, target: 'ennemi' },
  { id: 'ultime', name: 'Ultime', element: 'sable', kind: 'physique', pa: 3, power: 300, target: 'ennemi', requiresName: 3 },
];

function hero(overrides = {}) {
  return {
    id: 'salem',
    name: 'Salem',
    element: 'sable',
    maxHp: 400,
    atk: 30,
    def: 20,
    mag: 30,
    res: 20,
    spd: 10,
    agi: 60,
    tier: 1,
    skills: SKILLS,
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

// ── Éléments ───────────────────────────────────────────────────────────────
test('éléments : le cycle Braise → Souffle → Sable → Eau → Braise', () => {
  assert.equal(rpgElementMultiplier('braise', 'souffle'), 1.5);
  assert.equal(rpgElementMultiplier('souffle', 'sable'), 1.5);
  assert.equal(rpgElementMultiplier('sable', 'eau'), 1.5);
  assert.equal(rpgElementMultiplier('eau', 'braise'), 1.5);
  assert.equal(rpgElementMultiplier('souffle', 'braise'), 0.75);
  assert.equal(rpgElementMultiplier('sable', 'sable'), 1);
});

test('éléments : l’axe Encre ↔ Verre est avantageux dans les deux sens', () => {
  assert.equal(rpgElementMultiplier('encre', 'verre'), 1.5);
  assert.equal(rpgElementMultiplier('verre', 'encre'), 1.5);
});

test('contre-élément : on sait quel élément bat lequel', () => {
  assert.equal(rpgCounterElement('souffle'), 'braise');
  assert.equal(rpgCounterElement('sable'), 'souffle');
  assert.equal(rpgCounterElement('eau'), 'sable');
  assert.equal(rpgCounterElement('braise'), 'eau');
});

// ── Étages ─────────────────────────────────────────────────────────────────
test('étages : frapper de haut fait +15 % par étage, être en haut protège de 5 %', () => {
  assert.equal(RPG_TIER_DAMAGE, 0.15);
  assert.equal(RPG_TIER_TAKEN, 0.05);
  assert.equal(rpgTierMultiplier(1, 1), 1);
  assert.equal(rpgTierMultiplier(3, 1), 1.3);
  assert.ok(Math.abs(rpgTierMultiplier(1, 3) - 0.9) < 1e-9);
});

test('étages : tout le monde descend d’un étage à chaque round', () => {
  const b = battle();
  actor(b, 'salem').tier = 3;
  actor(b, 'balayeur').tier = 2;
  b.ring = ['salem', 'balayeur'];
  b.ringIndex = 0;
  rpgEndTurn(b);
  rpgEndTurn(b);
  assert.equal(b.round, 2);
  assert.equal(actor(b, 'salem').tier, 2);
  assert.equal(actor(b, 'balayeur').tier, 1);
});

test('étages : on ne descend pas sous le premier', () => {
  const b = battle();
  b.ring = ['salem', 'balayeur'];
  b.ringIndex = 0;
  rpgEndTurn(b);
  rpgEndTurn(b);
  assert.equal(actor(b, 'salem').tier, 1);
});

test('étages : le Reposition fait monter et refuse au-delà du 3e', () => {
  const b = battle();
  assert.equal(rpgReposition(b, 'salem').tier, 2);
  assert.equal(actor(b, 'salem').pa, RPG_PA_PER_TURN - 1);
  actor(b, 'salem').pa = 3;
  assert.equal(rpgReposition(b, 'salem').tier, RPG_TIERS);
  actor(b, 'salem').pa = 3;
  assert.equal(rpgReposition(b, 'salem').reason, 'etage-max');
});

test('étages : une chute du 3e au 1er frappe ×1,4', () => {
  const b = battle();
  const enemy = actor(b, 'balayeur');
  enemy.tier = RPG_TIERS;
  const avant = enemy.hp;
  actor(b, 'salem').skills = [{ id: 'double-crochet', name: 'Double crochet', element: 'sable', kind: 'physique', pa: 1, power: 100, push: 3, target: 'ennemi' }];
  rpgUseSkill(b, { actorId: 'salem', skillId: 'double-crochet', targetId: 'balayeur' });
  assert.equal(enemy.tier, 1);
  assert.match(b.log.map((l) => l.text).join(' '), /CHUTE/);
  assert.equal(avant - enemy.hp >= 24, true);
  assert.equal(RPG_CHUTE_BONUS, 1.4);
});

// ── Formules ───────────────────────────────────────────────────────────────
test('dégâts : la formule de base se calcule à la main', () => {
  assert.equal(rpgComputeDamage({ attack: 30, power: 100, defense: 20 }), 20);
  assert.equal(rpgComputeDamage({ attack: 30, power: 100, defense: 20, element: 'sable', targetElement: 'eau' }), 30);
  assert.equal(rpgComputeDamage({ attack: 30, power: 100, defense: 20, felure: true, consonance: true }), 60);
  assert.equal(rpgComputeDamage({ attack: 1, power: 10, defense: 999 }), 1);
});

test('soin, barrage et récolte ont leur formule', () => {
  assert.equal(rpgComputeHeal({ magic: 30, power: 100 }), 35);
  assert.equal(rpgComputeShield({ mag: 30 }), 76); // 40 + 30 × 1,2
  assert.equal(rpgComputeShield({ mag: 0 }), 40);
});

test('critique : plafonné à 35 %', () => {
  assert.ok(Math.abs(rpgCritChance({ agi: 60 }) - (0.05 + 60 / 400)) < 1e-9);
  assert.equal(rpgCritChance({ agi: 9999 }), RPG_CRIT_CAP);
});

// ── Intention : tout est annoncé ───────────────────────────────────────────
test('intention : chaque ennemi annonce son coup dès l’ouverture', () => {
  const b = battle();
  const enemy = actor(b, 'balayeur');
  assert.ok(enemy.intent, 'aucune intention annoncée');
  assert.equal(enemy.intent.family, 'lourd');
  assert.equal(enemy.intent.targetId, 'salem');
  assert.ok(RPG_INTENT_FAMILIES[enemy.intent.family]);
  assert.ok(rpgEstimateIntent(b, enemy, actor(b, 'salem')) > 0);
});

test('intention : les cinq familles sont connues', () => {
  assert.deepEqual(
    Object.keys(RPG_INTENT_FAMILIES).sort(),
    ['incantation', 'lourd', 'sablier', 'soutien', 'zone'].sort(),
  );
});

test('intention : l’incantation annonce l’élément qui l’interrompt', () => {
  const b = battle();
  const enemy = withIntent(b, { id: 'chaudiere', label: 'Chaudière', family: 'incantation', power: 300, kind: 'magie', element: 'braise', counterElement: 'eau', weight: 1 });
  assert.equal(enemy.intent.counterElement, 'eau');
});

test('intention : après son coup, l’ennemi annonce déjà le suivant', () => {
  const b = battle();
  withIntent(b, { id: 'raclette', label: 'Raclette', family: 'lourd', power: 100, kind: 'physique', weight: 1 });
  rpgEnemyTurn(b);
  assert.ok(actor(b, 'balayeur').intent, 'l’ennemi doit ré-annoncer un coup');
});

// ── Les quatre réponses ────────────────────────────────────────────────────
test('garde : −60 % de dégâts et +1 Verre quand on était la cible annoncée', () => {
  const b = battle();
  withIntent(b, { id: 'raclette', label: 'Raclette', family: 'lourd', power: 100, kind: 'physique', weight: 1 });
  assert.equal(rpgGuard(b, 'salem').vise, true);
  assert.equal(b.verre, 1);
  const avant = actor(b, 'salem').hp;
  rpgEnemyTurn(b);
  const perdu = avant - actor(b, 'salem').hp;

  const ouvert = battle();
  withIntent(ouvert, { id: 'raclette', label: 'Raclette', family: 'lourd', power: 100, kind: 'physique', weight: 1 });
  const avantOuvert = actor(ouvert, 'salem').hp;
  rpgEnemyTurn(ouvert);
  const perduOuvert = avantOuvert - actor(ouvert, 'salem').hp;

  assert.equal(RPG_GUARD_REDUCTION, 0.6);
  assert.ok(perdu < perduOuvert * 0.5, `garde ${perdu} vs ouvert ${perduOuvert}`);
});

test('garde : sans cible annoncée, pas de Verre', () => {
  const b = battle();
  actor(b, 'balayeur').intent = null;
  assert.equal(rpgGuard(b, 'salem').vise, false);
  assert.equal(b.verre, 0);
});

test('barrage : il absorbe avant les PV et coûte 20 sable', () => {
  const b = battle();
  b.ground.equipe = 60;
  const result = rpgBarrage(b, 'salem');
  assert.equal(result.ok, true);
  assert.equal(b.ground.equipe, 60 - RPG_BARRAGE_SABLE);
  assert.equal(actor(b, 'salem').shield, rpgComputeShield(actor(b, 'salem')));

  const avant = actor(b, 'salem').hp;
  rpgDealDamage(b, actor(b, 'salem'), 60, { source: actor(b, 'balayeur') });
  assert.equal(actor(b, 'salem').hp, avant, 'le barrage doit absorber un coup de 60');
  assert.equal(actor(b, 'salem').shield, rpgComputeShield(actor(b, 'salem')) - 60);
  // Au-delà de ce qu'il absorbe, le surplus passe dans les PV.
  rpgDealDamage(b, actor(b, 'salem'), 100, { source: actor(b, 'balayeur') });
  assert.equal(actor(b, 'salem').shield, 0);
  assert.equal(actor(b, 'salem').hp, avant - 84);
});

test('barrage : refusé sans sable au sol', () => {
  const b = battle();
  assert.equal(rpgBarrage(b, 'salem').reason, 'sable-insuffisant');
});

test('contre-élément : l’attaque annoncée tombe à moitié et la Fêlure monte', () => {
  const b = battle();
  const enemy = withIntent(b, { id: 'raclette', label: 'Raclette', family: 'lourd', power: 100, kind: 'physique', element: 'eau', weight: 1 });

  const sableAvant = actor(b, 'salem').hp;
  rpgUseSkill(b, { actorId: 'salem', skillId: 'frappe', targetId: 'balayeur' }); // sable bat eau
  assert.equal(enemy.contred, true);
  // +15 au contre-élément, plus 10 % des dégâts du coup lui-même
  assert.ok(enemy.felure >= RPG_FELURE_COUNTER, `fêlure ${enemy.felure}`);
  assert.equal(b.verre, 1);
  assert.equal(RPG_COUNTER_REDUCTION, 0.5);

  rpgEnemyTurn(b);
  const perdu = sableAvant - actor(b, 'salem').hp;

  const simple = battle();
  const enemySimple = withIntent(simple, { id: 'raclette', label: 'Raclette', family: 'lourd', power: 100, kind: 'physique', element: 'eau', weight: 1 });
  enemySimple.intent = { moveId: 'raclette', label: 'Raclette', family: 'lourd', element: 'eau', power: 100, kind: 'physique', targetId: 'salem', counterElement: 'sable' };
  const avantSimple = actor(simple, 'salem').hp;
  rpgEnemyTurn(simple);
  const perduSimple = avantSimple - actor(simple, 'salem').hp;

  assert.ok(perdu < perduSimple * 0.65, `contré ${perdu} vs simple ${perduSimple}`);
});

test('interruption : le bon élément annule l’incantation, +25 Fêlure', () => {
  const b = battle();
  const enemy = withIntent(b, { id: 'radiation', label: 'Radiation', family: 'incantation', power: 280, kind: 'magie', element: 'encre', counterElement: 'verre', weight: 1 });
  const avant = actor(b, 'salem').hp;

  rpgUseSkill(b, { actorId: 'salem', skillId: 'verre', targetId: 'balayeur' });
  assert.equal(enemy.intent, null);
  // +25 à l'interruption, plus 10 % des dégâts de l'Éclat
  assert.ok(enemy.felure >= RPG_FELURE_INTERRUPT, `fêlure ${enemy.felure}`);

  b.ring = ['balayeur', 'salem'];
  b.ringIndex = 0;
  rpgEnemyTurn(b);
  assert.equal(actor(b, 'salem').hp, avant, 'l’incantation ne doit pas tomber');
});

test('interruption : le mauvais élément ne change rien', () => {
  const b = battle();
  const enemy = withIntent(b, { id: 'radiation', label: 'Radiation', family: 'incantation', power: 280, kind: 'magie', element: 'encre', counterElement: 'verre', weight: 1 });
  rpgUseSkill(b, { actorId: 'salem', skillId: 'frappe', targetId: 'balayeur' });
  assert.ok(enemy.intent);
});

test('retard : l’Horlogère repousse le coup annoncé d’un round', () => {
  const b = battle();
  withIntent(b, { id: 'raclette', label: 'Raclette', family: 'lourd', power: 100, kind: 'physique', weight: 1 });
  rpgUseSkill(b, { actorId: 'salem', skillId: 'retard', targetId: 'balayeur' });
  assert.equal(actor(b, 'balayeur').intent, null);
  assert.ok(actor(b, 'balayeur').delayed);
  const avant = actor(b, 'salem').hp;
  b.ring = ['balayeur', 'salem'];
  b.ringIndex = 0;
  rpgEnemyTurn(b);
  assert.equal(actor(b, 'salem').hp, avant, 'le coup retardé ne doit pas tomber ce round');
  assert.equal(actor(b, 'balayeur').delayed.moveId, 'raclette');
  // Le coup repoussé reprend sa place au round suivant.
  rpgEndTurn(b);
  assert.equal(b.round, 2);
  assert.equal(actor(b, 'balayeur').intent?.moveId, 'raclette');
  assert.equal(actor(b, 'balayeur').delayed ?? null, null);
});

// ── Le sable ───────────────────────────────────────────────────────────────
test('sable : la moitié des PV perdus tombe sur le sol de la victime', () => {
  const b = battle();
  assert.equal(RPG_SABLE_SPILL, 0.5);
  rpgDealDamage(b, actor(b, 'balayeur'), 100, { source: actor(b, 'salem') });
  assert.equal(b.ground.ennemi, 50);
  assert.equal(b.ground.equipe, 0);
  rpgDealDamage(b, actor(b, 'salem'), 40, { source: actor(b, 'balayeur') });
  assert.equal(b.ground.equipe, 20);
});

test('récolte : 1 PA, jusqu’à 40 sable puisé, soin ×0,8', () => {
  const b = battle();
  b.ground.equipe = 100;
  actor(b, 'salem').hp = 200;
  const result = rpgRecolte(b, 'salem');
  assert.equal(result.taken, 40);
  assert.equal(result.heal, 32);
  assert.equal(actor(b, 'salem').hp, 232);
  assert.equal(b.ground.equipe, 60);
  assert.equal(actor(b, 'salem').pa, RPG_PA_PER_TURN - 1);
});

test('récolte : impossible sur un sol vide', () => {
  const b = battle();
  assert.equal(rpgRecolte(b, 'salem').reason, 'sable-insuffisant');
});

test('souffle : on retire du sable à l’ennemi et on en récupère la moitié', () => {
  const b = battle();
  b.ground.ennemi = 90;
  const result = rpgSouffle(b, 'salem');
  assert.equal(result.taken, 40);
  assert.equal(b.ground.ennemi, 50);
  assert.equal(b.ground.equipe, 20);
});

test('sablier : l’ennemi se soigne avec son sable, sauf si on le souffle', () => {
  const b = battle();
  const enemy = withIntent(b, { id: 'sac', label: 'Sac de sable', family: 'sablier', power: 0, weight: 1 });
  enemy.hp = 500;
  b.ground.ennemi = 80;
  b.ring = ['balayeur', 'salem'];
  b.ringIndex = 0;
  rpgEnemyTurn(b);
  assert.equal(enemy.hp, 500 + 32);
  assert.equal(b.ground.ennemi, 40);
});

test('sort à sable : il refuse de partir sans le sable demandé', () => {
  const b = battle();
  actor(b, 'salem').skills = [{ id: 'deluge', name: 'Déluge', element: 'eau', kind: 'magie', pa: 3, power: 200, sandCost: 40, target: 'tous-ennemis' }];
  assert.equal(rpgUseSkill(b, { actorId: 'salem', skillId: 'deluge' }).reason, 'sable-insuffisant');
  b.ground.equipe = 40;
  assert.equal(rpgUseSkill(b, { actorId: 'salem', skillId: 'deluge' }).ok, true);
  assert.equal(b.ground.equipe, 0);
});

// ── Fêlure, Consonance, Verre ──────────────────────────────────────────────
test('fêlure : à 100 l’ennemi est Fêlé, perd son tour et le premier coup est gratuit', () => {
  const b = battle();
  const enemy = actor(b, 'balayeur');
  enemy.felure = 95;
  rpgDealDamage(b, enemy, 200, { source: actor(b, 'salem') });
  assert.equal(enemy.fele, true);
  assert.equal(b.freeSkillFor, 'balayeur');
  assert.equal(rpgFelureRatio(enemy), 1);

  const avant = enemy.hp;
  b.ring = ['balayeur', 'salem'];
  b.ringIndex = 0;
  rpgEnemyTurn(b);
  assert.equal(enemy.hp, avant, 'un ennemi Fêlé n’agit pas');

  actor(b, 'salem').pa = 0;
  const result = rpgUseSkill(b, { actorId: 'salem', skillId: 'lourd', targetId: 'balayeur' });
  assert.equal(result.ok, true);
  assert.equal(result.cost, 0);
});

test('fêlure : les dégâts sont doublés sur un ennemi Fêlé', () => {
  const normal = battle();
  rpgUseSkill(normal, { actorId: 'salem', skillId: 'frappe', targetId: 'balayeur' });
  const normalLost = 900 - actor(normal, 'balayeur').hp;

  const fele = battle();
  actor(fele, 'balayeur').fele = true;
  rpgUseSkill(fele, { actorId: 'salem', skillId: 'frappe', targetId: 'balayeur' });
  const feleLost = 900 - actor(fele, 'balayeur').hp;

  assert.equal(RPG_FELURE_MULTIPLIER, 2);
  assert.ok(Math.abs(feleLost - normalLost * 2) <= 1, `fêlé ${feleLost} vs normal ${normalLost}`);
});

test('consonance : trois éléments dans le round donnent ×1,5 et un Verre', () => {
  const b = battle();
  actor(b, 'salem').pa = 9;
  rpgUseSkill(b, { actorId: 'salem', skillId: 'frappe', targetId: 'balayeur' });  // sable
  rpgUseSkill(b, { actorId: 'salem', skillId: 'verre', targetId: 'balayeur' });   // verre
  assert.equal(b.consonance, false);
  rpgUseSkill(b, { actorId: 'salem', skillId: 'braise', targetId: 'balayeur' });  // braise → accord
  assert.equal(b.consonance, true);
  assert.equal(b.verre, 1);
  // L'accord profite aux coups suivants, pas à celui qui l'a déclenché.
  const avant = actor(b, 'balayeur').hp;
  rpgUseSkill(b, { actorId: 'salem', skillId: 'frappe', targetId: 'balayeur' });
  const booste = avant - actor(b, 'balayeur').hp;
  const simple = rpgComputeDamage({ attack: 30, power: 100, defense: 10, element: 'sable', targetElement: 'sable' });
  assert.ok(booste >= Math.round(simple * RPG_CONSONANCE_MULTIPLIER * 0.95), `consonance ${booste} vs ${simple}`);
});

test('consonance : répéter le même élément ne déclenche rien', () => {
  const b = battle();
  actor(b, 'salem').pa = 9;
  rpgUseSkill(b, { actorId: 'salem', skillId: 'frappe', targetId: 'balayeur' });
  rpgUseSkill(b, { actorId: 'salem', skillId: 'frappe', targetId: 'balayeur' });
  rpgUseSkill(b, { actorId: 'salem', skillId: 'frappe', targetId: 'balayeur' });
  assert.equal(b.consonance, false);
});

test('cristallisation : 3 Verres dépensés, puissance doublée', () => {
  const simple = battle();
  rpgUseSkill(simple, { actorId: 'salem', skillId: 'lourd', targetId: 'balayeur' });
  const simpleLost = 900 - actor(simple, 'balayeur').hp;

  const charge = battle();
  charge.verre = RPG_CRISTALLISATION_COST;
  const result = rpgUseSkill(charge, { actorId: 'salem', skillId: 'lourd', targetId: 'balayeur', crystallize: true });
  const chargeLost = 900 - actor(charge, 'balayeur').hp;

  assert.equal(result.crystallize, true);
  assert.equal(charge.verre, 0);
  assert.ok(chargeLost > simpleLost * 1.6, `cristallisé ${chargeLost} vs simple ${simpleLost}`);
});

test('cristallisation : refusée sans assez de Verre', () => {
  const b = battle();
  b.verre = 1;
  assert.equal(rpgUseSkill(b, { actorId: 'salem', skillId: 'lourd', targetId: 'balayeur', crystallize: true }).reason, 'verre-insuffisant');
});

test('verre : la jauge ne dépasse jamais 5', () => {
  const b = battle();
  b.verre = RPG_VERRE_MAX;
  withIntent(b, { id: 'raclette', label: 'Raclette', family: 'lourd', power: 100, kind: 'physique', weight: 1 });
  rpgGuard(b, 'salem');
  assert.equal(b.verre, RPG_VERRE_MAX);
});

// ── L'Astrolabe ────────────────────────────────────────────────────────────
test('astrolabe : il sonne tous les 5 rounds, renforce les ennemis et fait descendre', () => {
  const b = battle();
  assert.equal(b.clock, RPG_CLOCK_INTERVAL);
  actor(b, 'salem').tier = 3;
  for (let round = 0; round < RPG_CLOCK_INTERVAL; round += 1) {
    b.ring = ['salem', 'balayeur'];
    b.ringIndex = 0;
    rpgEndTurn(b);
    rpgEndTurn(b);
  }
  assert.equal(b.clockStrike, 2);
  assert.equal(actor(b, 'salem').tier, 1); // 5 rounds de glissement + 1 étage de sonnerie
  assert.match(b.log.map((l) => l.text).join(' '), /ASTROLABE SONNE/);
});

test('astrolabe : un boss en phase 2 raccourcit l’horloge', () => {
  const b = battle();
  const enemy = actor(b, 'balayeur');
  enemy.maxHp = 100;
  enemy.hp = 40;
  enemy.phases = [{ threshold: 0.5, label: 'Phase 2', clockInterval: 4 }];
  enemy.moves = [{ id: 'marteau', label: 'Marteau', family: 'lourd', power: 100, weight: 1, phase: 2 }];
  b.ring = ['balayeur', 'salem'];
  b.ringIndex = 0;
  rpgEnemyTurn(b);
  assert.equal(enemy.phaseIndex, 1);
  assert.equal(b.clockInterval, 4);
});

// ── Compétences, Nom, réserve ──────────────────────────────────────────────
test('PA : une compétence coûte ce qu’elle annonce', () => {
  const b = battle();
  assert.equal(rpgUseSkill(b, { actorId: 'salem', skillId: 'lourd', targetId: 'balayeur' }).ok, true);
  assert.equal(actor(b, 'salem').pa, RPG_PA_PER_TURN - 2);
  assert.equal(rpgUseSkill(b, { actorId: 'salem', skillId: 'lourd', targetId: 'balayeur' }).ok, false);
});

test('nom : une compétence verrouillée est refusée et signalée', () => {
  const b = battle();
  actor(b, 'salem').nameSegments = 2;
  const ultime = rpgUsableSkills(actor(b, 'salem')).find((s) => s.id === 'ultime');
  assert.equal(ultime.locked, true);
  assert.equal(ultime.missing, 1);
  assert.equal(rpgUseSkill(b, { actorId: 'salem', skillId: 'ultime', targetId: 'balayeur' }).reason, 'nom-verrouille');
});

test('statut : une compétence sans puissance ne blesse personne', () => {
  const b = battle();
  const avant = actor(b, 'salem').hp;
  rpgUseSkill(b, { actorId: 'salem', skillId: 'retard', targetId: 'balayeur' });
  assert.equal(actor(b, 'salem').hp, avant);
});

test('réserve : la permutation échange les places', () => {
  const b = rpgCreateBattle({
    party: [hero()],
    foes: [foe()],
    reserve: [{ ...hero(), id: 'tarek', name: 'Tarek' }],
    seed: 7,
  });
  assert.equal(actor(b, 'tarek').side, 'reserve');
  assert.equal(b.ring.includes('tarek'), false);
  assert.equal(rpgSwap(b, 'salem', 'tarek').ok, true);
  assert.equal(actor(b, 'salem').side, 'reserve');
  assert.equal(actor(b, 'tarek').side, 'equipe');
  assert.equal(actor(b, 'tarek').pa, 0);
  assert.equal(b.ring.includes('tarek'), true);
});

// ── Anneau, vagues, fin, récompenses ───────────────────────────────────────
test('ouverture : 3 PA, 0 Verre, sols vides, anneau par Vitesse', () => {
  const b = battle();
  assert.equal(actor(b, 'salem').pa, RPG_PA_PER_TURN);
  assert.equal(b.verre, 0);
  assert.deepEqual(b.ground, { equipe: 0, ennemi: 0 });
  assert.deepEqual(b.ring, ['balayeur', 'salem']);
  assert.equal(rpgCurrentActor(b).id, 'balayeur');
  assert.equal(rpgTurnRing(b, 6).length, 6);
});

test('embuscade : l’équipe agit en premier', () => {
  assert.equal(battle({ ambush: true }).ring[0], 'salem');
});

test('vagues : on ajoute des ennemis en cours de combat, avec leur intention', () => {
  const b = battle();
  const added = rpgAddFoes(b, [{ ...foe(), id: 'balayeur-b', name: 'Balayeur B' }]);
  assert.equal(b.actors.filter((a) => a.side === 'ennemi').length, 2);
  assert.ok(added[0].intent, 'le nouvel ennemi doit annoncer un coup');
  assert.equal(b.ring.length, 3);
});

test('victoire et défaite ferment le combat', () => {
  const gagne = battle();
  rpgDealDamage(gagne, actor(gagne, 'balayeur'), 9999, { source: actor(gagne, 'salem') });
  assert.equal(rpgCheckEnd(gagne), 'victoire');

  const perdu = battle();
  rpgDealDamage(perdu, actor(perdu, 'salem'), 9999, { source: actor(perdu, 'balayeur') });
  assert.equal(rpgCheckEnd(perdu), 'defaite');
});

test('récompenses : celles du contenu sont conservées et s’additionnent', () => {
  const b = rpgCreateBattle({
    party: [hero()],
    foes: [
      foe({ id: 'a', rewards: { xp: 52, sable: 34, registres: 1 } }),
      foe({ id: 'b', rewards: { xp: 66, sable: 48 } }),
    ],
    seed: 7,
  });
  assert.deepEqual(rpgRewards(b), { xp: 118, sable: 82, registres: 1 });
});

test('difficulté : elle change les dégâts, pas le tempo', () => {
  const doux = battle({ difficulty: 'recit' });
  withIntent(doux, { id: 'raclette', label: 'Raclette', family: 'lourd', power: 100, kind: 'physique', weight: 1 });
  const avantDoux = actor(doux, 'salem').hp;
  rpgEnemyTurn(doux);
  const perduDoux = avantDoux - actor(doux, 'salem').hp;

  const dur = battle({ difficulty: 'veilleur' });
  withIntent(dur, { id: 'raclette', label: 'Raclette', family: 'lourd', power: 100, kind: 'physique', weight: 1 });
  const avantDur = actor(dur, 'salem').hp;
  rpgEnemyTurn(dur);
  const perduDur = avantDur - actor(dur, 'salem').hp;

  assert.ok(perduDur > perduDoux, `Veilleur ${perduDur} vs Récit ${perduDoux}`);
});

test('progression : la courbe d’XP suit 60 × n^1,6', () => {
  assert.equal(rpgXpForLevel(1), 60);
  assert.equal(rpgXpForLevel(10), Math.round(60 * Math.pow(10, 1.6)));
  assert.ok(rpgXpForLevel(60) > rpgXpForLevel(59));
});

test('creux : un compagnon perdu laisse une empreinte utile à l’équipe', () => {
  const creux = rpgCreuxBonuses(['yamina', 'inconnu']);
  assert.equal(creux.length, 1);
  assert.equal(creux[0].stat, 'mag');
});

test('tour : on passe au suivant, puis au round d’après avec 3 PA', () => {
  const b = battle();
  b.ring = ['salem', 'balayeur'];
  b.ringIndex = 0;
  actor(b, 'salem').pa = 1;
  rpgEndTurn(b);
  assert.equal(rpgCurrentActor(b).id, 'balayeur');
  rpgEndTurn(b);
  assert.equal(b.round, 2);
  assert.equal(actor(b, 'salem').pa, RPG_PA_PER_TURN);
});
