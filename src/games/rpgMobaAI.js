/** Small, lane-aware policy. All moves are still resolved by the MOBA adapter;
 * probes run on copies, never on the live duel. */
import { cardById } from './rpgCards.js';
import { choisirBloqueursIA } from './rpgAI.js';
import { rpgPeutAttaquer, rpgReglerHasard } from './rpgDuel.js';
import {
  MOBA_ARRIVEES_ALLIEES, MOBA_ARRIVEES_NEUTRES, MOBA_MAGIES_ALLIEES, MOBA_MAGIES_CIBLEES, MOBA_MAGIES_ESSAI,
  MOBA_MAGIES_IMMEDIATES, MOBA_MAGIES_PRIX, MOBA_MAGIES_SOINS, MOBA_MAGIES_TRANSFERT, MOBA_MAGIES_VOIES,
  rpgMobaJouerCreature, rpgMobaLancerMagie, rpgMobaResoudreArrivee, rpgMobaCandidatsRecherche,
  rpgMobaDeclarerAttaque, rpgMobaLancerAttaque, rpgMobaCiblesAttaque,
} from './rpgMobaLocal.js';

/** Select from the AI's private candidates without exposing them in the UI. */
export function rpgMobaChoisirRechercheIA(duel, side = 'sorcier') {
  return rpgMobaCandidatsRecherche(duel, side)
    .sort((a, b) => (cardById(a)?.cost ?? 99) - (cardById(b)?.cost ?? 99))[0] ?? null;
}

// The live game's RNG is stored outside the serializable state. Give each
// probe its own deterministic RNG: merely considering a move must not consume
// randomness or change the live game's later draws and combat outcomes.
const copie = (duel) => {
  const simulation = JSON.parse(JSON.stringify(duel));
  rpgReglerHasard(simulation, () => 0.5);
  return simulation;
};
const autre = (side) => side === 'joueur' ? 'sorcier' : 'joueur';

// Heuristic values are deliberately local to MOBA: legacy wizard HP is not a
// victory resource here. Rewards reflect the three independent lane healths.
function valeurCreature(entity) {
  const carte = cardById(entity.carteId);
  const ephemere = carte?.ephemere || carte?.furtif;
  const force = Math.max(0, Number(entity.atk) || 0);
  const vie = Math.max(0, Number(entity.pv) || 0);
  const gelee = (entity.gelToursRestants ?? 0) > 0 || (entity.empecheAttaqueToursRestants ?? 0) > 0;
  let valeur = 2 + force * (gelee ? 0.5 : 1.5) + vie * 0.9;
  if (entity.bouclier) valeur += 1.4;
  if (entity.envol || entity.infiltration) valeur += 1;
  return valeur * (ephemere ? 0.25 : 1);
}

function valeurPosition(duel, side) {
  const enemy = autre(side);
  if (duel.moba.winner) return duel.moba.winner === side ? 10000 : -10000;
  let score = duel[side].creatures.reduce((sum, e) => sum + valeurCreature(e), 0)
    - duel[enemy].creatures.reduce((sum, e) => sum + valeurCreature(e), 0);
  for (const lane of duel.moba.lanes) {
    if (lane.conqueredBy) score += lane.conqueredBy === side ? 40 : -40;
    else score += (lane.hp[side] - lane.hp[enemy]) * 2;
  }
  return score;
}

/** Compare legal audited spells on bounded copies, including symmetrical board
 * wipes. Effects still execute exactly once, on the authoritative adapter. */
export function rpgMobaChoisirMagieIA(duel, side = 'sorcier', reaction = false) {
  const enemy = autre(side);
  const lanes = duel.moba.lanes.filter((lane) => lane.active);
  const creatures = duel[enemy].creatures;
  const allies = duel[side].creatures;
  const cards = [...new Set(duel[side].main)].map(cardById)
    .filter((c) => c?.kind === 'magie' && (!reaction || c.instant));
  const initial = valeurPosition(duel, side);
  let meilleur = null;
  for (const card of cards) {
    const id = card.id;
    // Temporary combat buffs have no value after the attack phase or at the
    // opponent's end step; don't burn them just because creatures exist.
    if (['mur-de-boucliers', 'serment-de-la-forge', 'offrande-de-lin'].includes(id) && (reaction || duel.attaqueJouee === side || !allies.some(rpgPeutAttaquer))) continue;
    if (id === 'rempart-de-dunes' && !(reaction && duel.combatDeclare?.cote === enemy)) continue;
    let targets = [];
    if (MOBA_MAGIES_ALLIEES.includes(id)) targets = allies.map((e) => [e.id, null]);
    else if (MOBA_MAGIES_CIBLEES.includes(id)) {
      targets = creatures.map((e) => [e.id, null]);
      if (MOBA_MAGIES_VOIES.includes(id)) targets.push(...lanes.map((l) => ['sorcier', l.id]));
    } else if (MOBA_MAGIES_PRIX.includes(id) && MOBA_MAGIES_TRANSFERT.includes(id)) {
      targets = lanes.flatMap((target) => lanes.map((payment) => [null, target.id, payment.id]));
    } else if (MOBA_MAGIES_SOINS.includes(id) || MOBA_MAGIES_PRIX.includes(id) || MOBA_MAGIES_TRANSFERT.includes(id)) {
      targets = lanes.map((l) => [null, l.id]);
    } else if (MOBA_MAGIES_ESSAI.includes(id) || MOBA_MAGIES_IMMEDIATES.includes(id)) {
      targets = [[null, null]];
    }
    for (const [cible, lane, prixLane = null] of targets) {
      const simulation = copie(duel);
      const result = rpgMobaLancerMagie(simulation, side, id, cible, lane, prixLane);
      if (!result.ok) continue;
      let score = valeurPosition(simulation, side) - initial;
      // Account for the spell itself being consumed: only newly drawn cards
      // count. Milling alone has no inherent lethal value in no-fatigue MOBA.
      score += Math.max(0, simulation[side].main.length - duel[side].main.length + 1) * 3;
      if (simulation.defausseEnAttente?.cote === side) score -= simulation.defausseEnAttente.restant * 3;
      const discardedEnemy = Math.max(0, duel[enemy].main.length - simulation[enemy].main.length)
        + (simulation.defausseEnAttente?.cote === enemy ? simulation.defausseEnAttente.restant : 0);
      score += discardedEnemy * 2;
      if (id === 'appat-de-la-meute' && !reaction && duel.attaqueJouee !== side
        && allies.some((e) => e.mobaLane === creatures.find((c) => c.id === cible)?.mobaLane && rpgPeutAttaquer(e) && !e.infiltration && !e.coupRapide)) score += 3;
      // Fog helps only when it can prevent the opponent's declared combat.
      if (id === 'grand-voile-blanc' && reaction && duel.combatDeclare?.cote === enemy) {
        score += duel[enemy].creatures.filter((e) => duel.combatDeclare.attaquants.includes(e.id))
          .reduce((sum, e) => sum + Math.max(0, e.atk ?? 0) * 1.3, 0);
      }
      score -= 0.5 + (card.cost ?? 0) * 0.15;
      if (score > 0.5 && (!meilleur || score > meilleur.score)) meilleur = { id, cible, lane, prixLane, score };
    }
  }
  return meilleur;
}

export function rpgMobaChoisirCreatureIA(duel, side = 'sorcier') {
  const enemy = autre(side);
  const lanes = duel.moba.lanes.filter((l) => l.active).sort((a, b) => {
    const score = (l) => (10 - l.hp[enemy]) + l.slots[enemy].filter(Boolean).length * 2 - l.slots[side].filter(Boolean).length * 3;
    return score(b) - score(a);
  });
  const cards = [...new Set(duel[side].main)].map(cardById)
    .filter((c) => c && c.kind !== 'magie'
      && !(duel.attaqueJouee === side && (c.ephemere || c.furtif)))
    .sort((a, b) => b.cost - a.cost);
  // The Braisier can win immediately on arrival, even when a more expensive
  // summon or a crowded lane would otherwise rank first. Probe only legal
  // lethal lanes on a clone; the real duel and its RNG remain untouched.
  if (cards.some((card) => card.id === 'braisier-du-souk')
    && duel.moba.lanes.some((lane) => lane.conqueredBy === side)) {
    for (const lane of lanes.filter((candidate) => candidate.hp[enemy] === 1)) {
      const slot = lane.slots[side].indexOf(null);
      if (slot < 0) continue;
      const simulation = copie(duel);
      if (rpgMobaJouerCreature(simulation, side, 'braisier-du-souk', lane.id, slot).ok
        && simulation.moba.winner === side) return { id: 'braisier-du-souk', lane: lane.id, slot };
    }
  }
  for (const card of cards) for (const lane of lanes) {
    const slot = lane.slots[side].indexOf(null);
    if (slot < 0) continue;
    const simulation = copie(duel);
    if (!rpgMobaJouerCreature(simulation, side, card.id, lane.id, slot).ok) continue;
    // Her arrival hurts both camps. Avoid losing more board value than the
    // summon gains, instead of blindly choosing the most expensive creature.
    if (card.id === 'valkyrie-des-glaces' && valeurPosition(simulation, side) < valeurPosition(duel, side)) continue;
    return { id: card.id, lane: lane.id, slot };
  }
  return null;
}

export function rpgMobaChoisirArriveeIA(duel, side = 'sorcier') {
  const attente = duel.arriveeEnAttente;
  if (!attente) return null;
  const neutral = MOBA_ARRIVEES_NEUTRES.includes(attente.carteId);
  const cibleSide = MOBA_ARRIVEES_ALLIEES.includes(attente.carteId) ? side : autre(side);
  const candidates = [...duel[cibleSide].creatures].sort((a, b) => (b.atk + b.pv) - (a.atk + a.pv)).map((e) => e.id);
  if (neutral) candidates.push(...[...duel[side].creatures].sort((a, b) => (a.atk + a.pv) - (b.atk + b.pv)).map((e) => e.id));
  if (attente.carteId === 'maitre-du-marteau') candidates.push('sorcier');
  return candidates.find((id) => rpgMobaResoudreArrivee(copie(duel), side, id).ok) ?? null;
}

/** Choose an eligible defender in the attacker's lane, preferring an enemy
 * that the strike can remove. Legality remains enforced by the adapter. */
export function rpgMobaChoisirCiblesAttaqueIA(duel, side, ids) {
  const enemy = autre(side);
  const cibles = {};
  for (const id of ids) {
    const attacker = duel[side].creatures.find((e) => e.id === id);
    if (!attacker?.coupRapide) continue;
    const choix = rpgMobaCiblesAttaque(duel, side, id);
    const target = choix.cibles.map((cibleId) => duel[enemy].creatures.find((e) => e.id === cibleId))
      .filter(Boolean).sort((a, b) => {
        const score = (e) => valeurCreature(e) + ((attacker.atk ?? 0) >= e.pv ? 5 : 0);
        return score(b) - score(a);
      })[0];
    if (target) cibles[id] = target.id;
  }
  return cibles;
}

/** At most five occupied slots means at most 31 attack sets. Simulate each
 * declaration and lane-valid defense on an isolated copy, preferring real
 * conquests and good trades over sacrificing every creature each turn. */
export function rpgMobaChoisirAttaquantsIA(duel, side = 'sorcier') {
  const prets = duel[side].creatures.filter((e) => {
    if (!rpgPeutAttaquer(e) || (e.atk ?? 0) <= 0) return false;
    const choix = rpgMobaCiblesAttaque(duel, side, e.id);
    return !choix.obligatoires || choix.cibles.length > 0;
  });
  const initial = valeurPosition(duel, side);
  let meilleurScore = 0;
  let meilleur = [];
  for (let masque = 1; masque < (1 << prets.length); masque++) {
    const ids = prets.filter((_, i) => masque & (1 << i)).map((e) => e.id);
    const simulation = copie(duel);
    const cibles = rpgMobaChoisirCiblesAttaqueIA(simulation, side, ids);
    if (!rpgMobaDeclarerAttaque(simulation, side, ids, cibles).ok) continue;
    const blocs = rpgMobaChoisirBlocagesIA(simulation, side, ids);
    if (!rpgMobaLancerAttaque(simulation, side, ids, blocs, { declaree: true }).ok) continue;
    let score = valeurPosition(simulation, side) - initial;
    // Butin exchanges a card after a real lane hit; reward the draw modestly,
    // without peeking at its identity or consuming the live game's RNG.
    score += Math.max(0, duel[side].deck.length - simulation[side].deck.length) * 1.5;
    // A survivor that attacks cannot intercept next turn. Ephemeral cards
    // disappear anyway and should not be held back as defenders.
    for (const entity of prets.filter((e) => ids.includes(e.id))) {
      if (!simulation[side].creatures.some((e) => e.id === entity.id)) continue;
      if (cardById(entity.carteId)?.ephemere || cardById(entity.carteId)?.furtif) continue;
      const lane = duel.moba.lanes.find((l) => l.id === entity.mobaLane);
      const menace = duel[autre(side)].creatures.some((e) => e.mobaLane === lane?.id && (e.atk ?? 0) > 0);
      if (menace) score -= 0.4;
    }
    if (score > meilleurScore) { meilleurScore = score; meilleur = ids; }
  }
  return meilleur;
}

/** The classic block policy is used on one lane at a time with that lane's HP,
 * so its simulated blocks can never cross lanes. */
export function rpgMobaChoisirBlocagesIA(duel, sideAttaque, ids) {
  const defense = autre(sideAttaque);
  const result = {};
  for (const lane of duel.moba.lanes.filter((l) => l.active)) {
    const scoped = { ...duel,
      [sideAttaque]: { ...duel[sideAttaque], creatures: duel[sideAttaque].creatures.filter((e) => e.mobaLane === lane.id) },
      [defense]: { ...duel[defense], pv: lane.hp[defense], bouclier: 0, creatures: duel[defense].creatures.filter((e) => e.mobaLane === lane.id) },
    };
    Object.assign(result, choisirBloqueursIA(scoped, sideAttaque, ids, duel.combatDeclare?.ciblesAttaque ?? {}));
  }
  return result;
}
