/**
 * Experimental local-only integration with the real duel engine. The UI uses
 * a fixed audited test deck; most card effects and online play are not yet
 * supported. Do not expose arbitrary decks or network actions through it.
 */
import { duelCardById } from './rpgCards.js';
import { rpgJouerCreature, rpgLancerAttaque, rpgLancerMagie, rpgNouveauDuel, rpgRetirerEntitesConquete } from './rpgDuel.js';
import { RPG_MODE_MANA_ESSAI } from './rpgManaEssai.js';
import { MOBA_SIDES, mobaInfliger, mobaNouveau, mobaPlacer, mobaRetirer, mobaValiderBlocages, mobaVoie } from './rpgMoba.js';

const OFFSETS = Object.freeze({ left: 0, center: 2, right: 3 });
// Audited for the experimental combat bridge only: no arrival, death or
// player-targeting effects. Expand with tests as more abilities are adapted.
const CARTES_COMBAT_AUDITEES = new Set([
  'ashigaru-des-braises', 'mousse-des-galiotes', 'viking-des-neiges',
  'gardienne-des-portes-de-sable', 'gardien-viking-du-fjord',
  'loup-des-neiges', 'berserk-des-trois-hivers', 'jarl-au-marteau-de-guerre',
]);
const fail = (raison) => ({ ok: false, raison });
export const MOBA_CARTES_ESSAI = Object.freeze([...CARTES_COMBAT_AUDITEES]);
export const MOBA_MAGIES_ESSAI = Object.freeze([
  'mur-de-boucliers', 'brume-du-fjord', 'hurlement-du-blizzard',
  'grand-voile-blanc', 'verglas', 'grand-hiver', 'tempete-de-foudre-et-de-givre',
]);
export const MOBA_DECK_ESSAI = Object.freeze([...MOBA_CARTES_ESSAI, ...MOBA_MAGIES_ESSAI].flatMap((id) => [id, id]));

/** Two human-controlled seats use the existing mana-essai turn and mana rules.
 * `pvp` is the engine's manual-control flag; no network or referee is used. */
export function rpgMobaNouveauDuel(options = {}) {
  const duel = rpgNouveauDuel({ ...options, modeMana: RPG_MODE_MANA_ESSAI, pvp: true });
  duel.moba = mobaNouveau();
  return duel;
}

/** Check the engine's fixed slots and the lane record describe the same board.
 * Fail closed if an unsupported engine action has modified only one of them. */
export function rpgMobaPlacementCoherent(duel) {
  if (!duel?.moba || duel.modeMana !== RPG_MODE_MANA_ESSAI) return false;
  for (const side of MOBA_SIDES) {
    const entities = duel[side]?.creatures;
    if (!Array.isArray(entities)) return false;
    const occupied = new Set();
    for (const lane of duel.moba.lanes) {
      if (!Object.hasOwn(OFFSETS, lane.id) || !Array.isArray(lane.slots?.[side])) return false;
      for (const [slot, id] of lane.slots[side].entries()) {
        if (id === null) continue;
        if (!lane.active || occupied.has(id)) return false;
        const entity = entities.find((candidate) => candidate.id === id);
        if (!entity || entity.emplacement !== OFFSETS[lane.id] + slot || entity.mobaLane !== lane.id) return false;
        occupied.add(id);
      }
    }
    if (occupied.size !== entities.length) return false;
  }
  return true;
}

/** Place a creature from the active player's hand using the engine's payment,
 * restrictions, entity creation and aura recalculation. Effects requiring lane
 * semantics are temporarily rejected rather than executed incorrectly. */
export function rpgMobaJouerCreature(duel, side, cardId, laneId, slot) {
  if (!rpgMobaPlacementCoherent(duel)) return fail('etat-incoherent');
  if (duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return fail('partie-terminee');
  if (!MOBA_SIDES.includes(side) || duel.tour !== side) return fail('pas-votre-tour');
  if (!duel.manaEssaiDemarre || duel[side].manaChoixEnAttente
    || !['principale', 'principale2'].includes(duel.phase)
    || duel.fenetreReponse || duel.finDeTour || duel.combatDeclare
    || duel.arriveeEnAttente || duel.effetCreatureEnAttente
    || duel.destructionsEnAttente?.length || duel.defausseEnAttente || duel.siteEnAttente) return fail('timing');
  const lane = mobaVoie(duel.moba, laneId);
  if (!lane?.active) return fail('voie-inactive');
  if (!Number.isInteger(slot) || slot < 0 || slot >= lane.slots[side].length || lane.slots[side][slot] !== null) return fail('emplacement');
  const carte = duelCardById(cardId);
  if (!carte || carte.kind === 'site') return fail('carte');
  // Drawing cards doesn't target a lane or modify the battlefield, so the
  // existing arrival resolver can already handle it unchanged. Other arrivals,
  // boarding and HP costs need lane semantics before they can be enabled.
  if ((carte.arrivee && carte.arrivee.type !== 'pioche') || Number.isFinite(carte.abordage) || carte.interceptionAttaque
    || carte.prixPv || duel[side].abordageDesArrivees || duel[side].prochaineArriveeAbordage) return fail('effet-non-pris-en-charge');
  const before = JSON.stringify(duel);
  const restore = () => {
    const snapshot = JSON.parse(before);
    for (const key of Object.keys(duel)) delete duel[key];
    Object.assign(duel, snapshot);
  };
  try {
    const result = rpgJouerCreature(duel, side, cardId, null, { emplacement: OFFSETS[laneId] + slot });
    // The supported path reaches no payment or other mutation when refused;
    // keep the original object references intact for the local controller.
    if (!result.ok) return result;
    // Only draw arrivals are permitted above; still fail closed if engine state
    // actions removed another entity or added an unexpected one.
    if (result.entite) result.entite.mobaLane = laneId;
    if (!result.entite || !duel[side].creatures.includes(result.entite)
      || result.entite.emplacement !== OFFSETS[laneId] + slot
      || !mobaPlacer(duel.moba, side, laneId, slot, result.entite.id).ok
      || !rpgMobaPlacementCoherent(duel)) {
      restore();
      return fail('effet-non-pris-en-charge');
    }
    return result;
  } catch (error) {
    restore();
    throw error;
  }
}

/** Experimental combat bridge for a small audited set of creatures.
 * Combat damage, readiness, blocking and the one-attack-per-turn rule are still
 * resolved by the duel engine. Other card abilities require an audit first. */
export function rpgMobaLancerAttaque(duel, side, attackerIds, blocks = {}) {
  if (!rpgMobaPlacementCoherent(duel)) return fail('etat-incoherent');
  if (duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return fail('partie-terminee');
  if (!MOBA_SIDES.includes(side) || duel.tour !== side) return fail('pas-votre-tour');
  if (!duel.manaEssaiDemarre || duel[side].manaChoixEnAttente
    || !['principale', 'attaque'].includes(duel.phase)
    || duel.fenetreReponse || duel.finDeTour || duel.combatDeclare
    || duel.arriveeEnAttente || duel.effetCreatureEnAttente
    || duel.destructionsEnAttente?.length || duel.defausseEnAttente || duel.siteEnAttente) return fail('timing');
  const isolation = mobaValiderBlocages(duel.moba, side, attackerIds, blocks);
  if (!isolation.ok) return isolation;

  // Other keywords, death triggers and player-targeting effects must be audited
  // before enabling them. This is not a permanent card restriction.
  if (MOBA_SIDES.some((cote) => duel[cote].creatures.some((entity) =>
    !CARTES_COMBAT_AUDITEES.has(entity.carteId) || entity.arme || entity.enCale
      || entity.coupRapide || entity.tribut || entity.volDeVie || entity.doitBloquer || entity.blocageForce
  ))) return fail('effet-non-pris-en-charge');

  const lanesByAttacker = new Map();
  for (const lane of duel.moba.lanes) {
    for (const id of lane.slots[side]) if (id !== null) lanesByAttacker.set(id, lane.id);
  }
  const damageEvents = [];
  const result = rpgLancerAttaque(duel, side, attackerIds, blocks, null, null, {}, {
    resoudreDegatsDirects: (hit) => {
      const laneId = lanesByAttacker.get(hit.attaquantId);
      const damage = mobaInfliger(duel.moba, side, laneId, hit.amount);
      if (!damage.ok) return { recus: 0 };
      damageEvents.push({ attackerId: hit.attaquantId, laneId, ...damage });
      if (damage.conquered) rpgRetirerEntitesConquete(duel, damage.removed);
      if (damage.winner) {
        duel.fin = { gagnant: damage.winner, raison: 'conquete-moba' };
        return { recus: damage.damage, terminerCombat: true };
      }
      return { recus: damage.damage };
    },
  });
  if (!result.ok) return result;
  // Creatures killed in ordinary combat leave the engine field. Clear the
  // corresponding lane slots without changing their original assignment.
  if (!duel.moba.winner) {
    for (const cote of MOBA_SIDES) {
      const live = new Set(duel[cote].creatures.map((entity) => entity.id));
      for (const lane of duel.moba.lanes) {
        for (const id of [...lane.slots[cote]]) {
          if (id !== null && !live.has(id)) mobaRetirer(duel.moba, cote, id);
        }
      }
    }
  }
  return { ...result, damageEvents };
}

/** Local test pool only: global effects with no player-HP target or revival.
 * The existing engine resolves their text; all departed entities are unlinked
 * from the lane board afterwards. */
export function rpgMobaLancerMagie(duel, side, cardId) {
  if (!rpgMobaPlacementCoherent(duel)) return fail('etat-incoherent');
  if (duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) return fail('partie-terminee');
  if (!MOBA_SIDES.includes(side) || duel.tour !== side) return fail('pas-votre-tour');
  if (!duel.manaEssaiDemarre || duel[side].manaChoixEnAttente
    || !['principale', 'principale2'].includes(duel.phase)
    || duel.fenetreReponse || duel.finDeTour || duel.combatDeclare
    || duel.arriveeEnAttente || duel.effetCreatureEnAttente
    || duel.destructionsEnAttente?.length || duel.defausseEnAttente || duel.siteEnAttente) return fail('timing');
  if (!MOBA_MAGIES_ESSAI.includes(cardId)
    || MOBA_SIDES.some((cote) => duel[cote].creatures.some((e) => !CARTES_COMBAT_AUDITEES.has(e.carteId) || e.arme || e.enCale))) return fail('effet-non-pris-en-charge');
  const result = rpgLancerMagie(duel, side, cardId);
  if (!result.ok) return result;
  for (const cote of MOBA_SIDES) {
    const live = new Set(duel[cote].creatures.map((e) => e.id));
    for (const lane of duel.moba.lanes) {
      for (const id of [...lane.slots[cote]]) if (id !== null && !live.has(id)) mobaRetirer(duel.moba, cote, id);
    }
  }
  return result;
}
