import { sacrificesInvocation, victimesInvocation } from './rpgInvocation.js';
/** Small, lane-aware policy. All moves are still resolved by the MOBA adapter;
 * probes run on copies, never on the live duel. */
import { cardById, cardColors, lienSatisfait } from './rpgCards.js';
import { mobaVieMaxPourCamp } from './rpgMoba.js';
import { choisirBloqueursIA, rpgCombinaisonsSacrificesIA, rpgSacrificeEstDeclasseIA } from './rpgAI.js';
import { rpgPeutAttaquer, rpgPeutBloquerAttaquant, rpgEstProtegee, rpgReglerHasard, rpgFinDeTour, rpgChoisirCouleurMana } from './rpgDuel.js';
import {
  MOBA_EMBUSCADES_COMBAT, MOBA_ARMES, MOBA_ARRIVEES_ALLIEES, MOBA_ARRIVEES_NEUTRES, MOBA_MAGIES_ALLIEES, MOBA_MAGIES_CIBLEES, MOBA_MAGIES_ESSAI, MOBA_MAGIES_SPATIALES,
  MOBA_CONTRESORTS, MOBA_MAGIES_IMMEDIATES, MOBA_MAGIES_REANIMATION, MOBA_MAGIES_PRIX, MOBA_MAGIES_SOINS, MOBA_MAGIES_TRANSFERT, MOBA_MAGIES_VOIES,
  rpgMobaPeutEmbuscade, rpgMobaJouerCreature, rpgMobaJouerArme, rpgMobaLancerMagie, rpgMobaCiblesDestruction, rpgMobaCiblesSite, rpgMobaResoudreDestruction, rpgMobaResoudreArrivee, rpgMobaCandidatsRecherche, rpgMobaCiblesPrise, rpgMobaCiblesOni,
  rpgMobaDeclarerAttaque, rpgMobaLancerAttaque, rpgMobaCiblesAttaque, rpgMobaPasserSort, rpgMobaPasserCreature, rpgMobaPasserEffetCreature,
} from './rpgMobaLocal.js';

/** Select from the AI's private candidates without exposing them in the UI. */
export function rpgMobaChoisirRechercheIA(duel, side = 'sorcier') {
  return rpgMobaCandidatsRecherche(duel, side)
    .sort((a, b) => (cardById(a)?.cost ?? 99) - (cardById(b)?.cost ?? 99))[0] ?? null;
}

/** Choose a legal Source recipient without changing the live game or its RNG. */
export function rpgMobaChoisirSiteIA(duel, side = 'sorcier') {
  const candidats = rpgMobaCiblesSite(duel, side).map((id) => duel[side].creatures.find((e) => e.id === id));
  return candidats.sort((a, b) => {
    const score = (e) => (e.atk ?? 0) + (e.pv ?? 0) + Math.max(0, (e.pvMax ?? 0) - (e.pv ?? 0))
      + (e.tenaciteDisponible ? 0 : 2) + (e.bouclier ? 0 : 1);
    return score(b) - score(a);
  })[0]?.id ?? null;
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

/** Test each supported Embuscade and its arrival on isolated copies. */
export function rpgMobaChoisirEmbuscadeIA(duel, side = 'sorcier') {
  const combat = duel.combatDeclare;
  let meilleur = null;
  for (const id of [...MOBA_EMBUSCADES_COMBAT, 'sorcier-du-ressac-noir']) {
    if (!rpgMobaPeutEmbuscade(duel, side, id)) continue;
    if (id === 'tojiro-le-pourfendeur') {
      // Tester chaque sacrifice et chaque case, y compris la case libérée.
      // Les sondes résolvent aussi les effets de mort et l'annonce suspendue.
      const baseline = copie(duel);
      if (baseline.mobaCreatureEnAttente) resoudreMenaceCreature(baseline, side);
      else if (baseline.mobaSortEnAttente) rpgMobaPasserSort(baseline, side);
      else if (baseline.effetCreatureEnAttente) rpgMobaPasserEffetCreature(baseline, side);
      resoudreDestructionsSurCopie(baseline);
      for (const victime of victimesInvocation(duel[side])) for (const lane of duel.moba.lanes) for (let slot = 0; slot < lane.slots[side].length; slot++) {
        if (lane.slots[side][slot] !== null && lane.slots[side][slot] !== victime.id) continue;
        const probe = copie(duel);
        if (!rpgMobaJouerCreature(probe, side, id, lane.id, slot, { ouvrirReponse: true, sacrificeIds: [victime.id] }).ok) continue;
        const arrivee = rpgMobaPasserCreature(probe, autre(side));
        if (arrivee.ok && probe.moba.winner === side) return { id, lane: lane.id, slot, sacrificeIds: [victime.id], score: 10000 };
        if (!arrivee.entite) continue;
        resoudreDestructionsSurCopie(probe);
        if (probe.mobaCreatureEnAttente) resoudreMenaceCreature(probe, autre(probe.mobaCreatureEnAttente.cote));
        else if (probe.mobaSortEnAttente) rpgMobaPasserSort(probe, autre(probe.mobaSortEnAttente.cote));
        else if (probe.effetCreatureEnAttente) rpgMobaPasserEffetCreature(probe, autre(probe.effetCreatureEnAttente.cote));
        resoudreDestructionsSurCopie(probe);
        const menace = (probe.combatDeclare?.attaquants ?? []).map((attackerId) => probe[autre(side)].creatures.find((e) => e.id === attackerId))
          .filter((attacker) => attacker && !probe.combatDeclare.ciblesAttaque?.[attacker.id]
            && attacker.mobaLane === arrivee.entite.mobaLane && rpgPeutBloquerAttaquant(arrivee.entite, attacker) && !rpgEstProtegee(attacker, cardColors(cardById(id))));
        const blocage = menace.reduce((best, attacker) => Math.max(best, attacker.atk ?? 0), 0);
        const blocageAvant = (baseline.combatDeclare?.attaquants ?? []).map((attackerId) => baseline[autre(side)].creatures.find((e) => e.id === attackerId))
          .filter((attacker) => attacker && !baseline.combatDeclare.ciblesAttaque?.[attacker.id]
            && baseline[side].creatures.some((e) => e.mobaLane === attacker.mobaLane && rpgPeutBloquerAttaquant(e, attacker) && !rpgEstProtegee(attacker, cardColors(cardById(e.carteId)))))
          .reduce((best, attacker) => Math.max(best, attacker.atk ?? 0), 0);
        const score = valeurPosition(probe, side) - valeurPosition(baseline, side) + Math.max(0, blocage - blocageAvant) * 2;
        if (rpgSacrificeEstDeclasseIA(cardById(id), [victime]) && score <= 1.5 && probe.moba.winner !== side) continue;
        if (score > 0 && (!meilleur || score > meilleur.score)) meilleur = { id, lane: lane.id, slot, sacrificeIds: [victime.id], score };
      }
      continue;
    }
    for (const lane of duel.moba.lanes) for (let slot = 0; slot < lane.slots[side].length; slot++) {
      if (lane.slots[side][slot] !== null) continue;
      const probe = copie(duel);
      if (!rpgMobaJouerCreature(probe, side, id, lane.id, slot, { ouvrirReponse: true }).ok) continue;
      const arrived = rpgMobaPasserCreature(probe, autre(side));
      if (!arrived.entite) continue;
      if (id === 'sanguinaire-des-dunes') {
        const baseline = copie(duel);
        if (baseline.mobaCreatureEnAttente) resoudreMenaceCreature(baseline, side);
        else if (baseline.mobaSortEnAttente) rpgMobaPasserSort(baseline, side);
        else if (baseline.effetCreatureEnAttente) rpgMobaPasserEffetCreature(baseline, side);
        if (probe.mobaCreatureEnAttente) resoudreMenaceCreature(probe, side);
        else if (probe.mobaSortEnAttente) rpgMobaPasserSort(probe, side);
        else if (probe.effetCreatureEnAttente) rpgMobaPasserEffetCreature(probe, side);
        resoudreDestructionsSurCopie(baseline); resoudreDestructionsSurCopie(probe);
        const gain = valeurPosition(probe, side) - valeurPosition(baseline, side);
        if (gain > 0 && (!meilleur || gain > meilleur.score)) meilleur = { id, lane: lane.id, slot, score: gain };
        continue;
      }
      if (id === 'gardienne-du-croissant') {
        const cible = rpgMobaChoisirArriveeIA(probe, side);
        if (!cible || !rpgMobaResoudreArrivee(probe, side, cible).ok) continue;
        const baseline = copie(duel);
        if (baseline.mobaSortEnAttente) rpgMobaPasserSort(baseline, side);
        else if (baseline.effetCreatureEnAttente) rpgMobaPasserEffetCreature(baseline, side);
        if (probe.mobaSortEnAttente) rpgMobaPasserSort(probe, side);
        else if (probe.effetCreatureEnAttente) rpgMobaPasserEffetCreature(probe, side);
        resoudreDestructionsSurCopie(probe);
        const gain = valeurPosition(probe, side) - valeurPosition(baseline, side);
        if (gain > 0 && (!meilleur || gain > meilleur.score)) meilleur = { id, lane: lane.id, slot, score: gain };
        continue;
      }
      if (id === 'porte-etendard-de-leclipse') {
        const gain = valeurPosition(probe, side) - valeurPosition(duel, side);
        if (gain > 0 && (!meilleur || gain > meilleur.score)) meilleur = { id, lane: lane.id, slot, score: gain };
        continue;
      }
      if (id === 'sorcier-du-ressac-noir') {
        const score = valeurPosition(probe, side) - valeurPosition(duel, side) + (cardById(duel.mobaCreatureEnAttente.carteId)?.cost ?? 0) * 2;
        if (!meilleur || score > meilleur.score) meilleur = { id, lane: lane.id, slot, score };
        continue;
      }
      const cible = probe.arriveeEnAttente ? rpgMobaChoisirArriveeIA(probe, side) : null;
      if (cible && !rpgMobaResoudreArrivee(probe, side, cible).ok) continue;
      if (probe.effetCreatureEnAttente && !rpgMobaPasserEffetCreature(probe, autre(side)).ok) continue;
      resoudreDestructionsSurCopie(probe);
      const threatened = (probe.combatDeclare?.attaquants ?? []).map((attackerId) => probe[combat.cote].creatures.find((e) => e.id === attackerId))
        .filter((attacker) => attacker && !combat.ciblesAttaque?.[attacker.id] && rpgPeutBloquerAttaquant(arrived.entite, attacker)
          && !rpgEstProtegee(attacker, cardColors(cardById(id))));
      const block = threatened.reduce((best, e) => Math.max(best, e.atk ?? 0), 0);
      if (!block && !cible) continue;
      const score = valeurPosition(probe, side) - valeurPosition(duel, side) + block * 2;
      if (!meilleur || score > meilleur.score) meilleur = { id, lane: lane.id, slot, score };
    }
  }
  return meilleur;
}

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
  // Dodge prevents attacks and spells, not abilities; keep it a modest
  // bounded bonus rather than equating it with guaranteed protection.
  if (entity.esquive) valeur += Math.min(1, Math.max(0, Number.isFinite(entity.esquiveChance) ? entity.esquiveChance : 0.15)) * 5;
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

// A Ghul controlled by the human leaves a mandatory choice. Planning must
// resolve it on copies before evaluating a spell/combat or passing priority;
// model that controller choosing the best resulting position, never the live RNG.
function resoudreDestructionsSurCopie(duel) {
  for (let n = 0; n < 10 && duel.destructionsEnAttente?.length && !duel.moba.winner; n += 1) {
    const side = duel.destructionsEnAttente[0].cote;
    let meilleur = null;
    for (const cible of rpgMobaCiblesDestruction(duel, side)) {
      const essai = copie(duel);
      if (!rpgMobaResoudreDestruction(essai, side, cible).ok) continue;
      const score = valeurPosition(essai, side);
      if (!meilleur || score > meilleur.score) meilleur = { cible, score };
    }
    if (!meilleur || !rpgMobaResoudreDestruction(duel, side, meilleur.cible).ok) break;
  }
}

// Evaluate the announced creature and its automatic AI arrival on the probe;
// the live response and later arrival choice are never mutated here.
function resoudreMenaceCreature(duel, defender) {
  if (!duel.mobaCreatureEnAttente || duel.defausseEnAttente || duel.mobaRechercheEnAttente) return;
  const caster = duel.mobaCreatureEnAttente.cote;
  const result = rpgMobaPasserCreature(duel, defender);
  if (!result.ok) return;
  resoudreDestructionsSurCopie(duel);
  // Une Embuscade peut avoir suspendu une autre annonce : l'évaluer aussi,
  // y compris lorsque son arrivée ne demande pas de cible.
  if (!duel.arriveeEnAttente && duel.mobaCreatureEnAttente) resoudreMenaceCreature(duel, autre(duel.mobaCreatureEnAttente.cote));
  else if (!duel.arriveeEnAttente && duel.mobaSortEnAttente) rpgMobaPasserSort(duel, autre(duel.mobaSortEnAttente.cote));
  else if (!duel.arriveeEnAttente && duel.effetCreatureEnAttente) rpgMobaPasserEffetCreature(duel, autre(duel.effetCreatureEnAttente.cote));
  resoudreDestructionsSurCopie(duel);
  for (let i = 0; i < 3 && duel.arriveeEnAttente && !duel.mobaRechercheEnAttente && !duel.moba.winner; i += 1) {
    const cible = rpgMobaChoisirArriveeIA(duel, caster);
    if (!cible || !rpgMobaResoudreArrivee(duel, caster, cible).ok) break;
    resoudreDestructionsSurCopie(duel);
    if (duel.effetCreatureEnAttente && !duel.defausseEnAttente) rpgMobaPasserEffetCreature(duel, autre(duel.effetCreatureEnAttente.cote));
    if (duel.mobaSortEnAttente && !duel.defausseEnAttente) rpgMobaPasserSort(duel, autre(duel.mobaSortEnAttente.cote));
    resoudreDestructionsSurCopie(duel);
  }
}

// When a passed weapon announcement opens a human boarding choice, complete
// that choice on the isolated probe before scoring the resulting position.
function resoudrePriseGrappinSurCopie(duel) {
  const attente = duel.arriveeEnAttente;
  if (attente?.carteId !== 'grappin-d-abordage' || !Number.isFinite(attente.abordage)) return;
  const cible = rpgMobaChoisirArriveeIA(duel, attente.cote);
  if (cible) rpgMobaResoudreArrivee(duel, attente.cote, cible);
}

/** Compare legal audited spells on bounded copies, including symmetrical board
 * wipes. Effects still execute exactly once, on the authoritative adapter. */
export function rpgMobaChoisirMagieIA(duel, side = 'sorcier', reaction = false) {
  const enemy = autre(side);
  const lanes = duel.moba.lanes.filter((lane) => lane.active);
  const creatures = duel[enemy].creatures;
  const allies = duel[side].creatures;
  const cards = [...new Set(duel[side].main)].map(cardById)
    .filter((c) => (c?.kind === 'magie' || (!reaction && MOBA_ARMES.includes(c?.id))) && (!reaction || c.instant));
  let initial = valeurPosition(duel, side);
  if (reaction && (duel.mobaSortEnAttente || duel.mobaCreatureEnAttente || duel.effetCreatureEnAttente)) {
    const baseline = copie(duel);
    if (baseline.mobaSortEnAttente) rpgMobaPasserSort(baseline, side);
    else if (baseline.mobaCreatureEnAttente) resoudreMenaceCreature(baseline, side);
    else rpgMobaPasserEffetCreature(baseline, side);
    resoudrePriseGrappinSurCopie(baseline);
    resoudreDestructionsSurCopie(baseline);
    initial = valeurPosition(baseline, side);
  }
  let meilleur = null;
  for (const card of cards) {
    const id = card.id;
    // Temporary combat buffs have no value after the attack phase or at the
    // opponent's end step; don't burn them just because creatures exist.
    if (['mur-de-boucliers', 'serment-de-la-forge', 'offrande-de-lin'].includes(id) && (reaction || duel.attaqueJouee === side || !allies.some(rpgPeutAttaquer))) continue;
    if (id === 'le-grand-debarquement' && (reaction || duel.attaqueJouee === side || !allies.some((e) => e.enCale && rpgPeutAttaquer(e)))) continue;
    if (id === 'rempart-de-dunes' && !(reaction && (duel.combatDeclare?.cote === enemy || duel.mobaSortEnAttente?.cote === enemy))) continue;
    let targets = [];
    if (MOBA_ARMES.includes(id)) {
      targets = allies.map((e) => [e.id, null]);
      if (id === 'lame-des-ergs') targets.push(...lanes.flatMap((lane) => lane.slots[side].flatMap((entry, slot) => entry === null ? [[null, lane.id, null, null, slot]] : [])));
    }
    else if (MOBA_MAGIES_REANIMATION.includes(id)) targets = lanes.flatMap((lane) => lane.slots[side].flatMap((entry, slot) => entry === null ? [[null, lane.id, null, null, slot]] : []));
    else if (MOBA_MAGIES_ALLIEES.includes(id)) targets = allies.map((e) => [e.id, null]);
    else if (MOBA_MAGIES_CIBLEES.includes(id)) {
      targets = id === 'defi-du-jarl' ? creatures.flatMap((target) => allies.filter((ally) => ally.mobaLane === target.mobaLane).map((ally) => [target.id, null, null, ally.id])) : creatures.map((e) => [e.id, null]);
      if (id === 'feux-de-kitsune') targets.push(...creatures.flatMap((a, i) => creatures.slice(i + 1).filter((b) => b.mobaLane === a.mobaLane).map((b) => [a.id, null, null, b.id])));
      if (MOBA_MAGIES_VOIES.includes(id)) targets.push(...lanes.map((l) => ['sorcier', l.id]));
    } else if (MOBA_MAGIES_PRIX.includes(id) && MOBA_MAGIES_TRANSFERT.includes(id)) {
      targets = lanes.flatMap((target) => lanes.map((payment) => [null, target.id, payment.id]));
    } else if (MOBA_MAGIES_PRIX.includes(id) && MOBA_MAGIES_SPATIALES.includes(id)) {
      targets = lanes.flatMap((target) => lanes.map((payment) => [null, target.id, payment.id]));
    } else if (MOBA_MAGIES_SOINS.includes(id) || MOBA_MAGIES_PRIX.includes(id) || MOBA_MAGIES_TRANSFERT.includes(id)) {
      targets = id === 'le-poids' && lienSatisfait(cardById(id), allies)
        ? lanes.flatMap((l) => creatures.filter((e) => e.mobaLane === l.id).map((e) => [e.id, l.id]))
        : lanes.map((l) => [null, l.id]);
    } else if (MOBA_MAGIES_ESSAI.includes(id) || MOBA_MAGIES_IMMEDIATES.includes(id) || (MOBA_CONTRESORTS.includes(id) && reaction && (duel.mobaSortEnAttente || duel.mobaCreatureEnAttente))) {
      targets = MOBA_MAGIES_SPATIALES.includes(id) ? lanes.map((l) => [null, l.id]) : [[null, null]];
    }
    for (const [cible, lane, prixLane = null, cibleSecondaire = null, emplacementReanimation = null] of targets) {
      const simulation = copie(duel);
      const result = MOBA_ARMES.includes(id)
        ? rpgMobaJouerArme(simulation, side, id, cible, { laneId: lane, slot: emplacementReanimation })
        : rpgMobaLancerMagie(simulation, side, id, cible, lane, prixLane, { cibleSecondaireId: cibleSecondaire, emplacementReanimation });
      if (!result.ok) continue;
      if (id === 'grappin-d-abordage') resoudrePriseGrappinSurCopie(simulation);
      resoudreDestructionsSurCopie(simulation);
      if (reaction && simulation.mobaSortEnAttente && !simulation.defausseEnAttente) rpgMobaPasserSort(simulation, autre(simulation.mobaSortEnAttente.cote));
      else if (reaction && simulation.mobaCreatureEnAttente) resoudreMenaceCreature(simulation, autre(simulation.mobaCreatureEnAttente.cote));
      else if (reaction && simulation.effetCreatureEnAttente && !simulation.defausseEnAttente) rpgMobaPasserEffetCreature(simulation, autre(simulation.effetCreatureEnAttente.cote));
      resoudrePriseGrappinSurCopie(simulation);
      resoudreDestructionsSurCopie(simulation);
      let score = valeurPosition(simulation, side) - initial;
      // Account for the spell itself being consumed: only newly drawn cards
      // count. Milling alone has no inherent lethal value in no-fatigue MOBA.
      score += Math.max(0, simulation[side].main.length - duel[side].main.length + 1) * 3;
      if (simulation.defausseEnAttente?.cote === side) score -= simulation.defausseEnAttente.restant * 3;
      const discardedEnemy = Math.max(0, duel[enemy].main.length - simulation[enemy].main.length)
        + (simulation.defausseEnAttente?.cote === enemy ? simulation.defausseEnAttente.restant : 0);
      score += discardedEnemy * 2;
      // Sandals are most valuable when they enable a fresh creature to attack
      // this turn. Do not value haste after combat or on an already-ready unit.
      if (id === 'sandales-de-tislit' && duel.attaqueJouee !== side) {
        const avant = allies.find((e) => e.id === cible);
        const apres = simulation[side].creatures.find((e) => e.id === cible);
        if (avant && apres && !rpgPeutAttaquer(avant) && rpgPeutAttaquer(apres)) score += Math.min(6, Math.max(0, apres.atk) * 1.5);
      }
      // Licou's delayed draw is only insurance while its bearer survives.
      if (id === 'licou-du-chien-de-sable' && simulation[side].deck.length && simulation[side].creatures.some((e) => e.id === cible && e.arme?.carteId === id)) score += 1.25;
      if (id === 'appat-de-la-meute' && !reaction && duel.attaqueJouee !== side
        && allies.some((e) => e.mobaLane === creatures.find((c) => c.id === cible)?.mobaLane && rpgPeutAttaquer(e) && !e.infiltration && !e.coupRapide)) score += 3;
      // Fog helps only when it can prevent the opponent's declared combat.
      if (id === 'grand-voile-blanc' && reaction && duel.combatDeclare?.cote === enemy) {
        score += duel[enemy].creatures.filter((e) => duel.combatDeclare.attaquants.includes(e.id))
          .reduce((sum, e) => sum + Math.max(0, e.atk ?? 0) * 1.3, 0);
      }
      if (id === 'lettre-de-marque' && !reaction && !duel[side].prochaineArriveeAbordage) {
        // Prefer signing before a playable arrival when that arrival can
        // actually take a prize. Probe bounded slots on the isolated state.
        const prisesAvant = simulation[enemy].creatures.length;
        const sommation = [...new Set(simulation[side].main)].map(cardById).filter((c) => c && ['creature', 'hero'].includes(c.kind));
        const prisePossible = sommation.some((creature) => lanes.some((voie) => {
          const slot = voie.slots[side].indexOf(null); if (slot < 0) return false;
          const essai = copie(simulation);
          const pose = rpgMobaJouerCreature(essai, side, creature.id, voie.id, slot);
          if (!pose.ok) return false;
          if (essai.arriveeEnAttente && Number.isFinite(essai.arriveeEnAttente.abordage)) {
            const cible = rpgMobaChoisirArriveeIA(essai, side);
            if (cible) rpgMobaResoudreArrivee(essai, side, cible);
          }
          return Boolean(pose.entite?.enCale) && essai[enemy].creatures.length < prisesAvant;
        }));
        if (prisePossible) score += 40;
      }
      score -= 0.5 + (card.cost ?? 0) * 0.15;
      if (score > 0.5 && (!meilleur || score > meilleur.score)) meilleur = { id, cible, lane, prixLane, ...(cibleSecondaire ? { cibleSecondaire } : {}), ...(emplacementReanimation !== null ? (id === 'lame-des-ergs' ? { emplacementArme: emplacementReanimation } : { emplacementReanimation }) : {}), score };
    }
  }
  return meilleur;
}

// Compare a real next-turn combat with and without the summon. Unknown
// pending choices return null and never count as a proven rescue.
function adversaireGagneProchainCombatMoba(duel, side) {
  try {
    const essai = copie(duel), enemy = autre(side);
    if (essai.tour !== side || essai.arriveeEnAttente || essai.effetCreatureEnAttente || essai.destructionsEnAttente?.length || essai.siteEnAttente) return null;
    rpgFinDeTour(essai);
    if (essai.moba.winner) return essai.moba.winner === enemy;
    if (essai.tour !== enemy || essai.moba.centerChoice || essai.siteEnAttente || essai.mobaDebutTourEnAttente) return null;
    if (essai[enemy].manaChoixEnAttente) rpgChoisirCouleurMana(essai, enemy, choisirCouleurManaIA(essai, enemy));
    const ids = rpgMobaChoisirAttaquantsIA(essai, enemy);
    if (!ids.length) return false;
    const cibles = rpgMobaChoisirCiblesAttaqueIA(essai, enemy, ids);
    if (!rpgMobaDeclarerAttaque(essai, enemy, ids, cibles).ok) return null;
    const blocs = rpgMobaChoisirBlocagesIA(essai, enemy, ids);
    if (!rpgMobaLancerAttaque(essai, enemy, ids, blocs, { declaree: true }).ok) return null;
    return essai.moba.winner === enemy;
  } catch { return null; }
}

export function rpgMobaChoisirCreatureIA(duel, side = 'sorcier') {
  const enemy = autre(side);
  const lanes = duel.moba.lanes.filter((l) => l.active || (l.id === 'center' && duel.moba.centerJoined?.side === side)).sort((a, b) => {
    const score = (l) => (mobaVieMaxPourCamp(duel.moba, enemy, l.id) - l.hp[enemy]) + l.slots[enemy].filter(Boolean).length * 2 - l.slots[side].filter(Boolean).length * 3;
    return score(b) - score(a);
  });
  const cards = [...new Set(duel[side].main)].map(cardById)
    .filter((c) => c && ['creature', 'hero', 'site'].includes(c.kind)
      && !(duel.attaqueJouee === side && (c.ephemere || c.furtif)))
    .sort((a, b) => b.cost - a.cost);
  // The Braisier can win immediately on arrival, even when a more expensive
  // summon or a crowded lane would otherwise rank first. Probe only legal
  // lethal lanes on a clone; the real duel and its RNG remain untouched.
  if (cards.some((card) => card.id === 'braisier-du-souk')
    && duel.moba.lanes.some((lane) => lane.conqueredBy === side)) {
    for (const lane of lanes.filter((candidate) => candidate.hp[enemy] === 1)) {
      const sacrificeIds = victimesInvocation(duel[side]).slice(0, sacrificesInvocation(cardById('braisier-du-souk'), duel)).map(e => e.id);
      const slot = lane.slots[side].indexOf(null);
      if (slot < 0 || sacrificeIds.length !== sacrificesInvocation(cardById('braisier-du-souk'), duel)) continue;
      const simulation = copie(duel);
      if (rpgMobaJouerCreature(simulation, side, 'braisier-du-souk', lane.id, slot, { sacrificeIds }).ok
        && simulation.moba.winner === side) return { id: 'braisier-du-souk', lane: lane.id, slot, sacrificeIds };
    }
  }
  let menaceInitiale;
  for (const card of cards) for (const lane of lanes) for (const victimes of rpgCombinaisonsSacrificesIA(duel, side, card)) {
    const sacrificeIds = victimes.map((e) => e.id);
    const libre = lane.slots[side].indexOf(null);
    const slot = libre >= 0 ? libre : lane.slots[side].findIndex((id) => sacrificeIds.includes(id));
    if (slot < 0) continue;
    const simulation = copie(duel);
    const pose = rpgMobaJouerCreature(simulation, side, card.id, lane.id, slot, { sacrificeIds });
    if (!pose.ok) continue;
    resoudreDestructionsSurCopie(simulation);
    // Resolve actual targeted arrivals on the probe before judging the payoff.
    for (let i = 0; i < 3 && simulation.arriveeEnAttente && !simulation.moba.winner; i++) {
      const cible = rpgMobaChoisirArriveeIA(simulation, side);
      if (!cible || !rpgMobaResoudreArrivee(simulation, side, cible).ok) break;
      resoudreDestructionsSurCopie(simulation);
      if (simulation.effetCreatureEnAttente) rpgMobaPasserEffetCreature(simulation, enemy);
    }
    if (card.id === 'valkyrie-des-glaces' && valeurPosition(simulation, side) < valeurPosition(duel, side)) continue;
    if (['bakunawa', 'cavalier-amazigh-du-desert', 'souverain-de-la-lune-noire'].includes(card.id) && !simulation.arriveeEnAttente) {
      const gain = valeurPosition(simulation, side) - valeurPosition(duel, side);
      const perdue = !simulation[side].creatures.some((entity) => entity.id === pose.entite?.id);
      if (gain < (perdue ? card.cost : 0)) continue;
    }
    if (victimes.length && rpgSacrificeEstDeclasseIA(card, victimes)) {
      const gain = valeurPosition(simulation, side) - valeurPosition(duel, side)
        + Math.max(0, simulation[side].main.length - duel[side].main.length + 1) * 3;
      const sansAttente = !simulation.arriveeEnAttente && !simulation.effetCreatureEnAttente
        && !simulation.destructionsEnAttente?.length && !simulation.siteEnAttente && !simulation.defausseEnAttente && !simulation.mobaRechercheEnAttente;
      let decisif = simulation.moba.winner === side || (sansAttente && gain > 1.5);
      if (!decisif && sansAttente) {
        if (menaceInitiale === undefined) menaceInitiale = adversaireGagneProchainCombatMoba(duel, side);
        if (menaceInitiale === true && adversaireGagneProchainCombatMoba(simulation, side) === false) decisif = true;
      }
      // A real, legally defended combat can justify a weaker hasty summon
      // when it immediately wins the match, not merely when it can attack.
      if (!decisif && sansAttente && pose.entite && rpgPeutAttaquer(pose.entite) && simulation.attaqueJouee !== side) {
        const essai = copie(simulation);
        const ids = rpgMobaChoisirAttaquantsIA(essai, side);
        if (ids.includes(pose.entite.id)) {
          const cibles = rpgMobaChoisirCiblesAttaqueIA(essai, side, ids);
          if (rpgMobaDeclarerAttaque(essai, side, ids, cibles).ok) {
            const blocs = rpgMobaChoisirBlocagesIA(essai, side, ids);
            decisif = Boolean(rpgMobaLancerAttaque(essai, side, ids, blocs, { declaree: true }).ok && essai.moba.winner === side);
          }
        }
      }
      if (!decisif) continue;
    }
    return { id: card.id, lane: lane.id, slot, sacrificeIds };
  }
  return null;
}

export function rpgMobaChoisirArriveeIA(duel, side = 'sorcier') {
  const attente = duel.arriveeEnAttente;
  if (!attente) return null;
  if (Number.isFinite(attente.abordage)) {
    const prises = rpgMobaCiblesPrise(duel, side);
    return [...duel[autre(side)].creatures].filter((e) => prises.includes(e.id)).sort((a, b) => valeurCreature(b) - valeurCreature(a))[0]?.id ?? null;
  }
  if (attente.carteId === 'oni-de-la-fournaise') {
    const candidates = rpgMobaCiblesOni(duel, side);
    return duel[autre(side)].creatures.filter((e) => e.id !== attente.cibleOni && candidates.includes(e.id))
      .sort((a, b) => ((b.pv <= 3 && !b.bouclier ? 8 : 0) + valeurCreature(b))
        - ((a.pv <= 3 && !a.bouclier ? 8 : 0) + valeurCreature(a)))[0]?.id ?? null;
  }
  if (['bakunawa', 'cavalier-amazigh-du-desert', 'souverain-de-la-lune-noire'].includes(attente.carteId)) {
    // Fight arrivals can kill either participant. Compare actual resolved
    // positions on copies rather than just picking the biggest opposing card.
    let best = null;
    for (const enemy of duel[autre(side)].creatures) {
      const simulation = copie(duel);
      if (!rpgMobaResoudreArrivee(simulation, side, enemy.id).ok) continue;
      resoudreDestructionsSurCopie(simulation);
      if (simulation.effetCreatureEnAttente && !rpgMobaPasserEffetCreature(simulation, autre(side)).ok) continue;
      resoudreDestructionsSurCopie(simulation);
      const score = valeurPosition(simulation, side);
      if (!best || score > best.score) best = { id: enemy.id, score };
    }
    return best?.id ?? null;
  }
  if (attente.carteId === 'guetteuse-des-marees') {
    // A token will cease to exist, whereas a wounded card can return healed.
    // Check legality on copies: sites and the Guetteuse herself are excluded.
    const candidats = [...duel[side].creatures].sort((a, b) => {
      const score = (e) => (e.jeton ? -100 : 0) + Math.max(0, (e.pvMax ?? 0) - (e.pv ?? 0)) * 3
        + (cardById(e.carteId)?.arrivee ? 1 : 0) - (e.arme ? 3 : 0) - (e.armes?.length ?? 0) * 2;
      return score(b) - score(a);
    });
    return candidats.find((e) => rpgMobaResoudreArrivee(copie(duel), side, e.id).ok)?.id ?? null;
  }
  if (attente.carteId === 'gardienne-du-croissant') {
    const menace = duel.mobaReponseSuspendue?.attente;
    const visees = [menace?.cibleId, menace?.cibleSecondaireId, ...Object.values(duel.combatDeclare?.ciblesAttaque ?? {})].filter(Boolean);
    const cibleMenacee = visees.find((id) => rpgMobaResoudreArrivee(copie(duel), side, id).ok);
    if (cibleMenacee) return cibleMenacee;
  }
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
        const score = (e) => {
          const prey = cardById(e.carteId);
          const traque = (prey?.abordage || e.butin || e.enCale) ? (cardById(attacker.carteId)?.traquePirates ?? 0) : 0;
          return valeurCreature(e) + ((attacker.atk ?? 0) + traque >= e.pv ? 5 : 0);
        };
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
    resoudreDestructionsSurCopie(simulation);
    let score = valeurPosition(simulation, side) - initial;
    // Sans pioche ni fatigue, deux défenses équivalentes peuvent se figer :
    // encourager les blessures réelles permet de tenter une percée graduelle.
    if (!duel[side].deck.length) {
      for (const defenseur of duel[autre(side)].creatures) {
        const apres = simulation[autre(side)].creatures.find((e) => e.id === defenseur.id);
        const dommages = Math.max(0, defenseur.pv - (apres?.pv ?? 0));
        score += dommages * 4;
      }
    }
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
  // A dying Brûlot can win the defender's second lane outright. The classic
  // block heuristic cannot see that lane death trigger. Try only bounded,
  // same-lane changes to its existing assignments, and accept one solely if
  // the real adapter validates it and the isolated combat actually wins.
  if (!duel.combatDeclare || !duel.moba.lanes.some((lane) => lane.conqueredBy === defense)) return result;
  const brulots = duel[defense].creatures.filter((entity) => entity.carteId === 'le-brulot'
    && duel.moba.lanes.some((lane) => lane.id === entity.mobaLane && lane.active && lane.hp[sideAttaque] <= 2));
  if (!brulots.length) return result;
  const gagne = (blocks) => {
    const simulation = copie(duel);
    const resolved = rpgMobaLancerAttaque(simulation, sideAttaque, ids, blocks, { declaree: true });
    return resolved.ok && simulation.moba.winner === defense;
  };
  if (gagne(result)) return result;
  for (const brulot of brulots) {
    for (const id of ids) {
      const attaquant = duel[sideAttaque].creatures.find((entity) => entity.id === id);
      if (attaquant?.mobaLane !== brulot.mobaLane || duel.combatDeclare.ciblesAttaque?.[id]) continue;
      const proposition = Object.fromEntries(Object.entries(result).map(([key, blockers]) => [key, blockers.filter((blocker) => blocker !== brulot.id)]));
      proposition[id] = [...(proposition[id] ?? []), brulot.id];
      if (gagne(proposition)) return proposition;
    }
  }
  return result;
}
