// Fumée du prototype RPG — « Le Sablier de Bab El ».
//
// Deux vérifications que les tests unitaires ne couvrent pas :
//
// 1. **Le contenu de la démo est cohérent** : chaque élément, chaque famille
//    d'intention et chaque seuil de phase existe dans le moteur, et surtout
//    chaque incantation ennemie peut être interrompue par une compétence de
//    l'équipe (sinon le joueur se prend un coup impossible à empêcher).
// 2. **Le combat se joue jusqu'au bout** : un pilote automatique enchaîne les
//    trois vagues (dont le boss à deux phases) en utilisant les quatre
//    réponses — garde, barrage, contre-élément, reposition — et l'on imprime
//    le bilan.
//
// Lancement : `npm run check:rpg`
import assert from 'node:assert/strict';
import {
  RPG_BARRAGE_SABLE,
  RPG_ELEMENTS,
  RPG_INTENT_FAMILIES,
  RPG_PA_PER_TURN,
  rpgAddFoes,
  rpgBarrage,
  rpgCreateBattle,
  rpgCurrentActor,
  rpgElementMultiplier,
  rpgEndTurn,
  rpgEnemyTurn,
  rpgGuard,
  rpgRecolte,
  rpgReposition,
  rpgRewards,
  rpgSouffle,
  rpgUseSkill,
  rpgRng,
} from '../src/games/rpgCombat.js';
import { RPG_DEMO_PARTY, RPG_DEMO_RESERVE, RPG_DEMO_WAVES } from '../src/games/rpgContent.js';

// ── 1. Cohérence du contenu ────────────────────────────────────────────────
const party = [...RPG_DEMO_PARTY, ...RPG_DEMO_RESERVE];
let skills = 0;
for (const member of party) {
  assert.ok(member.id && member.name, 'un compagnon sans identifiant');
  assert.ok(member.maxHp > 0 && member.atk > 0, `${member.id} : statistiques incomplètes`);
  if (member.element) assert.ok(RPG_ELEMENTS.includes(member.element), `${member.id} : élément inconnu « ${member.element} »`);
  for (const skill of member.skills) {
    skills += 1;
    assert.ok(skill.id && skill.name, `${member.id} : compétence sans nom`);
    assert.ok(skill.pa >= 1 && skill.pa <= RPG_PA_PER_TURN, `${member.id}/${skill.id} : coût de PA hors bornes`);
    assert.ok(!skill.element || RPG_ELEMENTS.includes(skill.element), `${skill.id} : élément inconnu`);
    assert.ok(['physique', 'magie', 'soin'].includes(skill.kind), `${skill.id} : type inconnu`);
    assert.ok((skill.requiresName ?? 0) <= 3, `${skill.id} : palier de Nom impossible`);
    const hasEffect = skill.power > 0 || skill.shield || skill.ground || skill.gainPa || skill.delay || skill.kind === 'soin';
    assert.ok(hasEffect, `${skill.id} : aucun effet`);
    if (skill.push) assert.ok(skill.push >= 1, `${skill.id} : déplacement invalide`);
    if (skill.sandCost) assert.ok(skill.sandCost <= 200, `${skill.id} : coût de sable hors bornes`);
  }
}

let moves = 0;
const incantations = [];
for (const wave of RPG_DEMO_WAVES) {
  assert.ok(wave.clockInterval >= 3, `vague ${wave.id} : horloge trop courte`);
  for (const enemy of wave.foes) {
    assert.ok(enemy.moves?.length, `${enemy.id} : aucune action`);
    for (const move of enemy.moves) {
      moves += 1;
      assert.ok(move.id && move.label, `${enemy.id} : action sans libellé`);
      assert.ok(RPG_INTENT_FAMILIES[move.family], `${enemy.id}/${move.id} : famille inconnue « ${move.family} »`);
      assert.ok(move.power > 0 || move.family === 'sablier' || move.family === 'soutien',
        `${enemy.id}/${move.id} : action sans effet`);
      assert.ok(!move.element || RPG_ELEMENTS.includes(move.element), `${enemy.id}/${move.id} : élément inconnu`);
      if (move.family === 'incantation') {
        assert.ok(RPG_ELEMENTS.includes(move.counterElement), `${enemy.id}/${move.id} : élément d’interruption inconnu`);
        incantations.push(move.counterElement);
      }
    }
    for (const phase of enemy.phases ?? []) {
      assert.ok(phase.threshold > 0 && phase.threshold < 1, `${enemy.id} : seuil de phase hors bornes`);
      assert.ok(!phase.clockInterval || phase.clockInterval >= 3, `${enemy.id} : horloge de phase trop courte`);
    }
  }
}
// Chaque incantation annoncée doit pouvoir être interrompue par l'équipe.
const teamInterrupts = new Set(
  party.flatMap((m) => m.skills).filter((s) => s.interrupt).map((s) => s.element),
);
for (const element of incantations) {
  assert.ok(teamInterrupts.has(element), `aucune compétence de l'équipe n'interrompt « ${element} »`);
}
console.log(
  `contenu ✓ — ${party.length} compagnons, ${skills} compétences, ${RPG_DEMO_WAVES.length} vagues, `
  + `${moves} actions ennemies, ${incantations.length} incantation(s) toutes interruptibles (${[...new Set(incantations)].join(', ')}).`,
);

// ── 2. Simulation des trois vagues ─────────────────────────────────────────
const rng = rpgRng(20261007); // même partie à chaque exécution
const battle = rpgCreateBattle({
  party: RPG_DEMO_PARTY,
  reserve: RPG_DEMO_RESERVE,
  foes: RPG_DEMO_WAVES[0].foes,
  clockInterval: RPG_DEMO_WAVES[0].clockInterval,
  seed: 20261007,
});

const stats = {
  turns: 0,
  actions: 0,
  reponses: { garde: 0, barrage: 0, contre: 0, reposition: 0, recolte: 0, souffle: 0 },
  damageDealt: 0,
  damageTaken: 0,
  interruptions: 0,
  waves: [],
};
const teamHp = () => battle.actors.filter((a) => a.side === 'equipe').reduce((sum, a) => sum + a.hp, 0);
const lowest = () => battle.actors.filter((a) => a.alive && a.side === 'equipe').sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];

/** Le pilote automatique : il lit les intentions et choisit. */
function playTeam(actor) {
  let guard = 0;
  while (!battle.over && actor.alive && actor.pa >= 1 && guard < 8) {
    guard += 1;
    const foes = battle.actors.filter((a) => a.alive && a.side === 'ennemi');
    if (!foes.length) break;
    const options = actor.skills.filter(
      (s) => s.pa <= actor.pa && (s.requiresName ?? 0) <= actor.nameSegments && (s.sandCost ?? 0) <= battle.ground.equipe,
    );

    // 1. Une incantation annoncée : on l'interrompt si on a l'élément.
    const charge = foes.find((f) => f.intent?.family === 'incantation');
    if (charge) {
      const stop = options.find((s) => s.interrupt && s.element === charge.intent.counterElement);
      if (stop) {
        const result = rpgUseSkill(battle, { actorId: actor.id, skillId: stop.id, targetId: charge.id });
        if (result.ok) {
          stats.actions += 1;
          stats.interruptions += 1;
          continue;
        }
      }
    }

    // 2. Un attaquant est annoncé : on casse son élan avec l'élément qui bat
    //    le sien. Ça protège celui qu'il visait, pas seulement soi.
    const menace = foes.find((f) => f.intent?.power > 0 && !f.contred);
    const contre = menace && options.find(
      (s) => s.power > 0 && rpgElementMultiplier(s.element, menace.intent.element) > 1,
    );
    if (contre) {
      const result = rpgUseSkill(battle, { actorId: actor.id, skillId: contre.id, targetId: menace.id });
      if (result.ok) {
        stats.actions += 1;
        stats.reponses.contre += 1;
        continue;
      }
    }

    // 3. On est la cible annoncée : barrage s'il y a du sable, sinon garde.
    const viseMoi = foes.some((f) => f.intent?.targetId === actor.id && f.intent.power > 0);
    if (viseMoi) {
      if (battle.ground.equipe >= RPG_BARRAGE_SABLE && rng() < 0.5) {
        if (rpgBarrage(battle, actor.id).ok) {
          stats.actions += 1;
          stats.reponses.barrage += 1;
          continue;
        }
      }
      if (rpgGuard(battle, actor.id).ok) {
        stats.actions += 1;
        stats.reponses.garde += 1;
        break; // en garde, le tour est bien employé : on s'arrête là
      }
    }

    // 4. Un blessé dans l'équipe et du sable au sol : on récolte.
    const wounded = lowest();
    if (wounded && wounded.hp / wounded.maxHp < 0.9 && battle.ground.equipe >= 20 && rng() < 0.6) {
      if (rpgRecolte(battle, actor.id, wounded.id).ok) {
        stats.actions += 1;
        stats.reponses.recolte += 1;
        continue;
      }
    }

    // 5. L'ennemi a du sable au sol : on le lui souffle.
    if (battle.ground.ennemi >= 40 && rng() < 0.4) {
      if (rpgSouffle(battle, actor.id).ok) {
        stats.actions += 1;
        stats.reponses.souffle += 1;
        continue;
      }
    }

    // 6. Sinon on frappe : le plus abîmé, avec ce qu'on a de plus lourd.
    const target = foes.slice().sort((a, b) => a.hp - b.hp)[0];
    const strikes = options.filter((s) => s.power > 0);
    if (!strikes.length) {
      if (rpgReposition(battle, actor.id).ok) {
        stats.actions += 1;
        stats.reponses.reposition += 1;
        continue;
      }
      break;
    }
    const skill = strikes.sort((a, b) => b.power - a.power)[0];
    const before = target.hp;
    const result = rpgUseSkill(battle, {
      actorId: actor.id,
      skillId: skill.id,
      targetId: target.id,
      crystallize: battle.verre >= 3 && skill.power >= 150 && rng() < 0.7,
    });
    if (!result.ok) break;
    stats.actions += 1;
    stats.damageDealt += Math.max(0, before - target.hp);
  }
}

/** Joue une vague entière et renvoie son bilan. */
function runWave(wave) {
  const summary = { title: wave.title, turns: 0, rounds: 0, astrolabe: 0 };
  const roundAvant = battle.round;
  const horlogeAvant = battle.log.filter((l) => l.tone === 'horloge').length;
  while (!battle.over && summary.turns < 3000) {
    summary.turns += 1;
    stats.turns += 1;
    const actor = rpgCurrentActor(battle);
    if (!actor) break;
    summary.rounds = Math.max(summary.rounds, battle.round);
    if (actor.side === 'equipe') {
      playTeam(actor);
      rpgEndTurn(battle);
      continue;
    }
    const avant = teamHp();
    rpgEnemyTurn(battle);
    stats.damageTaken += Math.max(0, avant - teamHp());
  }
  summary.rounds = battle.round - roundAvant + 1;
  summary.astrolabe = battle.log.filter((l) => l.tone === 'horloge').length - horlogeAvant;
  assert.equal(battle.over, 'victoire', `vague « ${wave.title} » perdue après ${summary.turns} tours`);
  return summary;
}

/** Le palier entre deux vagues : un tiers des PV rendus, sols balayés. */
function rest() {
  for (const member of battle.actors) {
    if (member.side === 'reserve' || member.side === 'equipe') {
      if (!member.alive) {
        member.alive = true;
        member.hp = Math.round(member.maxHp / 2);
      } else {
        member.hp = Math.min(member.maxHp, member.hp + Math.round(member.maxHp / 3));
      }
      member.pa = RPG_PA_PER_TURN;
    }
    member.shield = 0;
    member.felure = 0;
    member.fele = false;
  }
  battle.ground.equipe = 0;
  battle.ground.ennemi = 0;
}

for (const [index, wave] of RPG_DEMO_WAVES.entries()) {
  if (index > 0) {
    rest();
    rpgAddFoes(battle, wave.foes);
    battle.over = null;
    battle.clock = wave.clockInterval;
    battle.clockInterval = wave.clockInterval;
    battle.clockStrike = 0;
    stats.waves.push(runWave(wave));
  } else {
    stats.waves.push(runWave(wave));
  }
}

const boss = stats.waves[stats.waves.length - 1];

for (const wave of stats.waves) {
  console.log(`  · ${wave.title} — ${wave.turns} tours, ${wave.rounds} rounds, Astrolabe ${wave.astrolabe}×.`);
}
console.log(
  `simulation ✓ — ${stats.waves.length} vagues gagnées en ${stats.turns} tours, ${stats.actions} actions, `
  + `${stats.damageDealt} dégâts infligés, ${stats.damageTaken} subis, équipe à ${teamHp()} PV.`,
);
console.log(
  `réponses — ${stats.reponses.garde} gardes, ${stats.reponses.barrage} barrages, ${stats.reponses.contre} contre-éléments, `
  + `${stats.reponses.reposition} repositions, ${stats.reponses.recolte} récoltes, ${stats.reponses.souffle} souffles, `
  + `${stats.interruptions} interruptions.`,
);
assert.ok(boss.astrolabe >= 1, `l'Astrolabe n'a pas sonné sur le boss (${boss.rounds} rounds)`);
const rewards = rpgRewards(battle);
console.log(`récompenses — ${rewards.xp} XP, ${rewards.sable} sable, ${rewards.registres} registre(s).`);
console.log(
  'check:rpg ✓ — contenu cohérent (éléments, familles d’intention, incantations interruptibles) '
  + 'et trois vagues jouées jusqu’à la victoire, Astrolabe et phase 2 du boss compris.',
);
