import { sortTransfere } from './rpgSortsTransferes.js';
/** Small, lane-aware policy. All moves are still resolved by the MOBA adapter;
 * probes run on copies, never on the live duel. */
import { cardById, cardColors, lienSatisfait } from './rpgCards.js';
import { estDefenseur } from './rpgDefenseur.js';
import { limiteInvocationMoba } from './rpgInvocation.js';
import { mobaVieMaxPourCamp, mobaVoiesCombat, mobaPartageVoie, mobaVoieJouable } from './rpgMoba.js';
import { rpgMobaCiblesIndividuelles } from './rpgMobaAttaqueIndividuelle.js';
import { choisirCouleurManaIA, rpgCombinaisonsSacrificesIA } from './rpgAI.js';
import { rpgPeutAttaquer, rpgPeutBloquerAttaquant, rpgEstProtegee, rpgReglerHasard, rpgFinDeTour, rpgChoisirCouleurMana, rpgAvecCompteurEntitesIsole, RPG_ESQUIVE_CHANCE } from './rpgDuel.js';
import {
  MOBA_ARMES, MOBA_ARRIVEES_ALLIEES, MOBA_ARRIVEES_NEUTRES, MOBA_MAGIES_ALLIEES, MOBA_MAGIES_CIBLEES, MOBA_MAGIES_ESSAI, MOBA_MAGIES_SPATIALES,
  MOBA_CONTRESORTS, MOBA_MAGIES_IMMEDIATES, MOBA_MAGIES_REANIMATION, MOBA_MAGIES_PRIX, MOBA_MAGIES_SOINS, MOBA_MAGIES_TRANSFERT, MOBA_MAGIES_VOIES,
  rpgMobaChoixActivation, rpgMobaResoudreRecherche, rpgMobaPeutEmbuscade, rpgMobaInvocationSpecialeDisponible, rpgMobaSacrificesInvocation, rpgMobaJouerCreature, rpgMobaJouerArme, rpgMobaLancerMagie, rpgMobaCiblesDestruction, rpgMobaCiblesSite, rpgMobaResoudreSite, rpgMobaResoudreDestruction, rpgMobaResoudreArrivee, rpgMobaCandidatsRecherche, rpgMobaCiblesPrise, rpgMobaCiblesOni,
  rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle, rpgMobaPasserSort, rpgMobaPasserCreature, rpgMobaPasserEffetCreature,
} from './rpgMobaLocal.js';

/** N'engager l'activation que si l'échange ou l'équipement est favorable. */
export function rpgMobaChoisirActivationIA(duel, side = 'sorcier') {
  let meilleur = null;
  for (const source of duel[side].creatures) {
    for (const choix of rpgMobaChoixActivation(duel, side, source.id)) {
      const cible = [...duel.joueur.creatures, ...duel.sorcier.creatures].find(e => e.id === choix.cibleId);
      let score = 0;
      if (choix.cibleId === null) {
        const type = cardById(source.carteId)?.activation?.effet?.type;
        if (['pioche', 'pioche-defausse'].includes(type)) score = duel[side].deck.length && duel[side].main.length <= 5 ? 3 : 0;
        else if (type === 'defaussePaquet') score = duel[autre(side)].deck.length ? 2 : 0;
        else if (type === 'prochaine-arrivee-abordage') score = !duel[side].prochaineArriveeAbordage && (duel[side].deck.length || duel[side].main.some(id => ['creature', 'hero'].includes(cardById(id)?.kind))) ? 3 : 0;
      } else if (choix.championId) {
        const champion = duel[side].creatures.find(e => e.id === choix.championId);
        if (!champion || !cible || cible.bouclier || cible.bouclierLumiere) continue;
        const donne = champion.gelToursRestants > 0 ? 0 : Math.max(0, champion.atk || 0);
        const recoit = cible.gelToursRestants > 0 ? 0 : Math.max(0, cible.atk || 0);
        score = Math.min(donne, cible.pv) + (donne >= cible.pv ? valeurCreature(cible) : 0)
          - Math.min(recoit, champion.pv) - (recoit >= champion.pv ? valeurCreature(champion) : 0);
      } else {
        const arme = cardById(choix.armeCarteId);
        const prix = Math.max(0, Number(arme?.blessurePorteur) || 0) + Math.max(0, -(Number(arme?.effet?.def) || 0));
        if (!cible || cible.pv <= prix) continue;
        score = 3 + (Number(arme?.bonus?.atk) || 0) + (Number(arme?.bonus?.def) || 0);
      }
      if (score > 0 && (!meilleur || score > meilleur.score)) meilleur = { sourceId: source.id, choix, score };
    }
  }
  return meilleur;
}

/** Choisir un renfort en évaluant ses effets réels sur une copie du plateau.
 * Une recherche qui ajoute à la main reste distincte : elle ne met encore
 * aucune créature en jeu et ne doit pas être évaluée comme une invocation. */
export function rpgMobaChoisirRechercheIA(duel, side = 'sorcier') {
  const candidats = rpgMobaCandidatsRecherche(duel, side);
  if (!candidats.length) return null;
  if (!duel.mobaRechercheEnAttente?.renfort || duel.mobaRechercheEnAttente.recherche) return candidats[0];
  return rpgAvecCompteurEntitesIsole(() => {
    let meilleur = null;
    for (const id of candidats) {
      const essai = copie(duel);
      if (!rpgMobaResoudreRecherche(essai, side, id).ok) continue;
      resoudreDestructionsSurCopie(essai);
      // Une arrivée peut demander plusieurs désignations (Oni, Abordage),
      // puis ouvrir une fenêtre de réponse. Estimer les effets après passage
      // de la réponse, sur copie uniquement ; ne pas noter un choix inachevé.
      for (let i = 0; i < 8 && !essai.moba.winner; i++) {
        if (essai.destructionsEnAttente?.length) {
          resoudreDestructionsSurCopie(essai);
          if (essai.destructionsEnAttente?.length) break;
        } else if (essai.effetCreatureEnAttente) {
          if (!rpgMobaPasserEffetCreature(essai, autre(essai.effetCreatureEnAttente.cote)).ok) break;
        } else if (essai.arriveeEnAttente?.cote === side && !essai.mobaRechercheEnAttente) {
          const cible = rpgMobaChoisirArriveeIA(essai, side);
          if (!cible || !rpgMobaResoudreArrivee(essai, side, cible).ok) break;
        } else break;
      }
      if (essai.arriveeEnAttente || essai.effetCreatureEnAttente || essai.destructionsEnAttente?.length
        || essai.mobaRechercheEnAttente || essai.siteEnAttente || essai.defausseEnAttente || essai.boualemEnAttente) continue;
      const score = valeurPosition(essai, side);
      if (!meilleur || score > meilleur.score) meilleur = { id, score };
    }
    // Le moteur reste seul arbitre des choix. En cas de simulation impossible,
    // préserver le comportement antérieur et ne jamais bloquer la partie.
    return meilleur?.id ?? candidats[0];
  });
}

/** La Source soigne, renforce et protège : apprécier le danger visible et
 * l'utilité offensive en plus du soin réellement appliqué sur une copie. */
export function rpgMobaChoisirSiteIA(duel, side = 'sorcier') {
  const candidats = rpgMobaCiblesSite(duel, side);
  return rpgAvecCompteurEntitesIsole(() => {
    let meilleur = null;
    const enemy = autre(side);
    for (const id of candidats) {
      const allie = duel[side].creatures.find((e) => e.id === id);
      const essai = copie(duel);
      if (!allie || !rpgMobaResoudreSite(essai, side, id).ok) continue;
      const apres = essai[side].creatures.find((e) => e.id === id);
      if (!apres) continue;
      const bonusMax = Math.max(0, (apres.pvMax ?? 0) - (allie.pvMax ?? 0));
      const soin = Math.max(0, (apres.pv ?? 0) - (allie.pv ?? 0) - bonusMax);
      // Estimation, pas prédiction : un ennemi doit pouvoir cibler cette voie
      // et infliger un coup mortel ; un bouclier déjà présent l'évite déjà.
      const menace = !allie.bouclier && !allie.bouclierLumiere && duel[enemy].creatures.some((ennemi) => {
        const force = Number(ennemi.atk) || 0;
        return !ennemi.mur && !ennemi.nePeutPasAttaquer && !(ennemi.gelToursRestants > 0)
          && !(ennemi.empecheAttaqueToursRestants > 0) && force >= (allie.pv ?? 0)
          && (apres.bouclier || apres.bouclierLumiere || (apres.pv ?? 0) > force)
          && rpgMobaCiblesIndividuelles(duel, enemy, ennemi.id).cibles.includes(id);
      });
      const attaque = Math.max(0, Number(allie.atk) || 0);
      const score = attaque + (allie.pv ?? 0) + soin
        + (allie.tenaciteDisponible ? 0 : 2) + (allie.bouclier ? 0 : 1)
        + (rpgPeutAttaquer(allie) ? Math.min(8, attaque) * 0.1 : 0)
        + (menace ? valeurCreature(allie) * 0.8 : 0);
      if (!meilleur || score > meilleur.score || (score === meilleur.score && soin > meilleur.soin)) meilleur = { id, score, soin };
    }
    return meilleur?.id ?? candidats[0] ?? null;
  });
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

/** Tester les Embuscades adverses sur copie, sans consommer de sacrifice. */
export function rpgMobaChoisirEmbuscadeIA(duel, side = 'sorcier') {
  return rpgAvecCompteurEntitesIsole(() => rpgMobaChoisirEmbuscadeIASurCopie(duel, side));
}

function rpgMobaChoisirEmbuscadeIASurCopie(duel, side = 'sorcier') {
  if (!duel?.moba || duel.tour === side || !duel.fenetreReponse) return null;
  let meilleur = null;
  for (const id of new Set(duel[side].main)) {
    if (!rpgMobaPeutEmbuscade(duel, side, id)) continue;
    for (const lane of duel.moba.lanes) {
      if (!mobaVoieJouable(duel.moba, side, lane.id)) continue;
      for (let slot = 0; slot < lane.slots[side].length; slot++) {
        if (lane.slots[side][slot] !== null) continue;
        const probe = copie(duel);
        const pose = rpgMobaJouerCreature(probe, side, id, lane.id, slot, { sacrificeIds: [], choixCoutAuto: true });
        if (!pose.ok) continue;
        resoudreDestructionsSurCopie(probe);
        const score = valeurPosition(probe, side) - valeurPosition(duel, side);
        if (score > 0 && (!meilleur || score > meilleur.score)) meilleur = { id, lane: lane.id, slot, sacrificeIds: [], score };
      }
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
  if (estDefenseur(entity)) valeur += 0.8;
  // Dodge prevents attacks and spells, not abilities; keep it a modest
  // bounded bonus rather than equating it with guaranteed protection.
  if (entity.esquive) valeur += Math.min(1, Math.max(0, Number.isFinite(entity.esquiveChance) ? entity.esquiveChance : RPG_ESQUIVE_CHANCE)) * 5;
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
  return rpgAvecCompteurEntitesIsole(() => rpgMobaChoisirMagieIASurCopie(duel, side, reaction));
}

function rpgMobaChoisirMagieIASurCopie(duel, side = 'sorcier', reaction = false) {
  const enemy = autre(side);
  const lanes = duel.moba.lanes.filter((lane) => lane.active);
  const places = duel.moba.lanes.filter((lane) => mobaVoieJouable(duel.moba, side, lane.id));
  const creatures = duel[enemy].creatures;
  const allies = duel[side].creatures;
  const cards = [...new Set(duel[side].main)].map(cardById)
    .filter((c) => c && !sortTransfere(c.id) && (c.kind === 'magie' || (!reaction && MOBA_ARMES.includes(c.id))) && (!reaction || c.instant));
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
      if (id === 'lame-des-ergs') targets.push(...places.flatMap((lane) => lane.slots[side].flatMap((entry, slot) => entry === null ? [[null, lane.id, null, null, slot]] : [])));
    }
    else if (MOBA_MAGIES_REANIMATION.includes(id)) targets = places.flatMap((lane) => lane.slots[side].flatMap((entry, slot) => entry === null ? [[null, lane.id, null, null, slot]] : []));
    else if (MOBA_MAGIES_ALLIEES.includes(id)) targets = allies.map((e) => [e.id, null]);
    else if (MOBA_MAGIES_CIBLEES.includes(id)) {
      targets = id === 'defi-du-jarl' ? creatures.flatMap((target) => allies.filter((ally) => mobaPartageVoie(duel.moba, ally.mobaLane, target.mobaLane)).map((ally) => [target.id, null, null, ally.id])) : creatures.map((e) => [e.id, null]);
      if (id === 'feux-de-kitsune') targets.push(...creatures.flatMap((a, i) => creatures.slice(i + 1).filter((b) => mobaPartageVoie(duel.moba, b.mobaLane, a.mobaLane)).map((b) => [a.id, null, null, b.id])));
      if (MOBA_MAGIES_VOIES.includes(id)) targets.push(...lanes.map((l) => ['sorcier', l.id]));
    } else if (MOBA_MAGIES_PRIX.includes(id) && MOBA_MAGIES_TRANSFERT.includes(id)) {
      targets = lanes.flatMap((target) => lanes.map((payment) => [null, target.id, payment.id]));
    } else if (MOBA_MAGIES_PRIX.includes(id) && MOBA_MAGIES_SPATIALES.includes(id)) {
      targets = lanes.flatMap((target) => lanes.map((payment) => [null, target.id, payment.id]));
    } else if (MOBA_MAGIES_SOINS.includes(id) || MOBA_MAGIES_PRIX.includes(id) || MOBA_MAGIES_TRANSFERT.includes(id)) {
      targets = id === 'le-poids' && lienSatisfait(cardById(id), allies)
        ? lanes.flatMap((l) => creatures.filter((e) => mobaPartageVoie(duel.moba, e.mobaLane, l.id)).map((e) => [e.id, l.id]))
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
      if (simulation.mobaRechercheEnAttente?.cote === side) {
        const selection = rpgMobaChoisirRechercheIA(simulation, side);
        if (!rpgMobaResoudreRecherche(simulation, side, selection).ok) continue;
      }
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
      // Licou's delayed draw is only insurance while its bearer survives.
      if (id === 'licou-du-chien-de-sable' && simulation[side].deck.length && simulation[side].creatures.some((e) => e.id === cible && e.arme?.carteId === id)) score += 1.25;
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
          const pose = rpgMobaJouerCreature(essai, side, creature.id, voie.id, slot, { choixCoutAuto: true });
          if (!pose.ok) return false;
          if (essai.arriveeEnAttente && Number.isFinite(essai.arriveeEnAttente.abordage)) {
            const cible = rpgMobaChoisirArriveeIA(essai, side);
            if (cible) rpgMobaResoudreArrivee(essai, side, cible);
          }
          return Boolean(pose.entite?.enCale) && essai[enemy].creatures.length < prisesAvant;
        }));
        if (prisePossible) score += 40;
      }
      score -= 0.5;
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
    for (let i = 0; i < 5 && !essai.moba.winner; i++) {
      const attaque = rpgMobaChoisirAttaqueIndividuelleIA(essai, enemy);
      if (!attaque) break;
      if (!rpgMobaDeclarerAttaqueIndividuelle(essai, enemy, attaque.attaquantId, attaque.cibleId, attaque.voie).ok
        || !rpgMobaResoudreAttaqueIndividuelle(essai, enemy).ok) return null;
      if (essai.moba.centerChoice || essai.defausseEnAttente || essai.destructionsEnAttente?.length) return null;
    }
    return essai.moba.winner === enemy;
  } catch { return null; }
}

export function rpgMobaChoisirCreatureIA(duel, side = 'sorcier') {
  return rpgAvecCompteurEntitesIsole(() => rpgMobaChoisirCreatureIASurCopie(duel, side));
}

function rpgMobaChoisirCreatureIASurCopie(duel, side = 'sorcier') {
  const enemy = autre(side);
  const lanes = duel.moba.lanes.filter((l) => l.active || (l.id === 'center' && duel.moba.centerJoined?.side === side)).sort((a, b) => {
    const score = (l) => (mobaVieMaxPourCamp(duel.moba, enemy, l.id) - l.hp[enemy]) + l.slots[enemy].filter(Boolean).length * 2 - l.slots[side].filter(Boolean).length * 3;
    return score(b) - score(a);
  });
  const cards = [...new Set([...duel[side].main, ...(duel[side].reserveAscension ?? [])])].map(cardById)
    .filter((c) => c && ['creature', 'hero', 'site'].includes(c.kind)
      && !(duel.attaqueJouee === side && (c.ephemere || c.furtif)))
    // Le quota revenu d'une invocation normale par tour s'applique aussi à
    // l'IA : une seconde créature du même tour ne reste candidate que si son
    // Embuscade la fait entrer hors quota, comme pour le joueur.
    .filter((c) => c.kind === 'site'
      || !limiteInvocationMoba(duel, side, c, rpgMobaInvocationSpecialeDisponible(duel, side, c.id)))
    .sort((a, b) => b.cost - a.cost);
  // Un coût imprimé élevé ne suffit pas à justifier la perte d'une créature.
  // Comparer toutes les invocations légales sur des copies, y compris celles
  // sans sacrifice, au lieu de retourner la première carte chère de la main.
  const valeurInitiale = valeurPosition(duel, side);
  let menaceInitiale;
  let victoireInitiale;
  let meilleur = null;
  const victoireCombat = (position) => {
    const essai = copie(position);
    for (let i = 0; i < 5 && !essai.moba.winner; i++) {
      const attaque = rpgMobaChoisirAttaqueIndividuelleIA(essai, side);
      if (!attaque || !rpgMobaDeclarerAttaqueIndividuelle(essai, side, attaque.attaquantId, attaque.cibleId, attaque.voie).ok
        || !rpgMobaResoudreAttaqueIndividuelle(essai, side).ok) break;
      resoudreDestructionsSurCopie(essai);
      if (essai.moba.centerChoice || essai.defausseEnAttente || essai.destructionsEnAttente?.length) break;
    }
    return essai.moba.winner === side;
  };
  for (const card of cards) for (const lane of lanes) for (const victimes of (rpgMobaInvocationSpecialeDisponible(duel, side, card.id) ? [[]] : rpgCombinaisonsSacrificesIA(duel, side, card)))
  for (const slot of (victimes.length
      ? lane.slots[side].flatMap((id, index) => victimes.some((e) => e.id === id) ? [index] : [])
      : [lane.slots[side].indexOf(null)].filter((index) => index >= 0))) {
    const sacrificeIds = victimes.map((e) => e.id);
    const simulation = copie(duel);
    const pose = rpgMobaJouerCreature(simulation, side, card.id, lane.id, slot, { sacrificeIds, choixCoutAuto: true });
    if (!pose.ok) continue;
    resoudreDestructionsSurCopie(simulation);
    // Les renforts et leurs arrivées peuvent s'enchaîner : simuler leurs vrais
    // choix avant d'évaluer le plateau, sans toucher à la partie réelle.
    for (let i = 0; i < 8 && !simulation.moba.winner; i++) {
      if (simulation.mobaRechercheEnAttente?.cote === side) {
        const choix = rpgMobaChoisirRechercheIA(simulation, side);
        if (!rpgMobaResoudreRecherche(simulation, side, choix ?? null).ok) break;
      } else if (simulation.arriveeEnAttente) {
        const cible = rpgMobaChoisirArriveeIA(simulation, side);
        if (!cible || !rpgMobaResoudreArrivee(simulation, side, cible).ok) break;
      } else break;
      resoudreDestructionsSurCopie(simulation);
      if (simulation.effetCreatureEnAttente) rpgMobaPasserEffetCreature(simulation, enemy);
    }
    if (simulation.moba.winner === enemy) continue;
    const sansAttente = !simulation.arriveeEnAttente && !simulation.effetCreatureEnAttente
      && !simulation.destructionsEnAttente?.length && !simulation.siteEnAttente
      && !simulation.defausseEnAttente && !simulation.mobaRechercheEnAttente;
    const gain = valeurPosition(simulation, side) - valeurInitiale
      + Math.max(0, simulation[side].main.length - duel[side].main.length + 1) * 3;
    if (card.id === 'valkyrie-des-glaces' && gain < 0) continue;
    if (['bakunawa', 'cavalier-amazigh-du-desert', 'souverain-de-la-lune-noire'].includes(card.id) && sansAttente) {
      const perdue = !simulation[side].creatures.some((entity) => entity.id === pose.entite?.id);
      if (gain < (perdue ? card.cost : 0)) continue;
    }
    // Perdre un corps, son équipement ou une attaque disponible est un coût
    // en plus de ses statistiques. Ne pas abandonner sans raison une voie
    // défendue par cette seule créature face à une menace.
    const cout = victimes.reduce((total, victime) => {
      // Le remplacement et son arrivée ont déjà résolu sur la copie : une
      // voie nettoyée ou défendue par l’Ascension n’est pas abandonnée.
      const seule = mobaVoiesCombat(duel.moba, victime.mobaLane).some((voie) =>
        simulation[enemy].creatures.some((e) => mobaVoiesCombat(simulation.moba, e.mobaLane).includes(voie))
        && !simulation[side].creatures.some((e) => mobaVoiesCombat(simulation.moba, e.mobaLane).includes(voie)));
      return total + 4 + (rpgPeutAttaquer(victime) ? 4 : 0) + (seule ? 4 : 0)
        + (victime.arme ? 3 : 0) + (victime.armes?.length ?? 0) * 2;
    }, 0);
    let priorite = simulation.moba.winner === side ? 3 : 0;
    if (victimes.length && duel.attaqueJouee !== side && duel[side].creatures.some(rpgPeutAttaquer)) {
      if (victoireInitiale === undefined) victoireInitiale = victoireCombat(duel);
      if (victoireInitiale) continue;
    }
    if (sansAttente && priorite < 3) {
      if (menaceInitiale === undefined) menaceInitiale = adversaireGagneProchainCombatMoba(duel, side);
      if (menaceInitiale === true && adversaireGagneProchainCombatMoba(simulation, side) === false) priorite = 2;
      // Un gain immédiat en combat compte seulement si la position initiale
      // ne pouvait pas déjà gagner sans perdre les créatures.
      if (pose.entite && rpgPeutAttaquer(pose.entite) && simulation.attaqueJouee !== side) {
        if (victoireInitiale === undefined) victoireInitiale = victoireCombat(duel);
        if (!victoireInitiale && victoireCombat(simulation)) priorite = 3;
      }
    }
    if (victimes.length && priorite === 0) {
      if (!sansAttente) continue;
      const menacePresente = duel[enemy].creatures.length > 0;
      const attaqueEnnemie = duel[enemy].creatures.some((e) =>
        !simulation[enemy].creatures.some((survivante) => survivante.id === e.id));
      const pvGagnes = duel.moba.lanes.reduce((sum, voie) => {
        const apres = simulation.moba.lanes.find((item) => item.id === voie.id);
        return sum + Math.max(0, voie.hp[enemy] - (apres?.hp[enemy] ?? voie.hp[enemy]));
      }, 0);
      const conquete = simulation.moba.lanes.some((voie) => voie.conqueredBy === side
        && !duel.moba.lanes.find((ancienne) => ancienne.id === voie.id)?.conqueredBy);
      const peutProgresser = (etat) => etat[side].creatures.some((e) =>
        cardById(e.carteId)?.kind !== 'site' && !e.nePeutPasAttaquer && (Number(e.atk) || 0) > 0
        && mobaVoiesCombat(etat.moba, e.mobaLane).length > 0);
      const debloqueProgression = !peutProgresser(duel) && peutProgresser(simulation);
      // Un sacrifice demande une amélioration nette importante ET un besoin
      // concret : menace, dégâts, conquête ou plateau incapable d'avancer.
      if (!(menacePresente || attaqueEnnemie || pvGagnes > 0 || conquete || debloqueProgression) || gain - cout < 4) continue;
    }
    const score = gain - cout;
    const choix = { id: card.id, lane: lane.id, slot, sacrificeIds };
    if (!meilleur || priorite > meilleur.priorite
      || (priorite === meilleur.priorite && score > meilleur.score)) meilleur = { choix, priorite, score };
  }
  return meilleur?.choix ?? null;
}

export function rpgMobaChoisirArriveeIA(duel, side = 'sorcier') {
  return rpgAvecCompteurEntitesIsole(() => rpgMobaChoisirArriveeIASurCopie(duel, side));
}

function rpgMobaChoisirArriveeIASurCopie(duel, side = 'sorcier') {
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
  if (attente.carteId === 'volva-soigneuse') {
    // Comparer le soin réel, la capacité offensive et les menaces visibles.
    // Un allié intact ne reçoit aucun bonus ; une créature sauvée d'une frappe
    // accessible vaut davantage, mais ce n'est qu'une estimation tactique.
    return rpgAvecCompteurEntitesIsole(() => {
      let meilleur = null;
      const adversaire = autre(side);
      for (const allie of duel[side].creatures) {
        const essai = copie(duel);
        if (!rpgMobaResoudreArrivee(essai, side, allie.id).ok) continue;
        const apres = essai[side].creatures.find((e) => e.id === allie.id);
        const soin = Math.max(0, (apres?.pv ?? 0) - (allie.pv ?? 0));
        const force = valeurCreature(allie);
        const menace = soin > 0 && duel[adversaire].creatures.some((ennemi) =>
          !ennemi.nePeutPasAttaquer && !(ennemi.gelToursRestants > 0) && !(ennemi.empecheAttaqueToursRestants > 0)
          && (Number(ennemi.atk) || 0) >= (allie.pv ?? 0) && (Number(ennemi.atk) || 0) < (apres?.pv ?? 0)
          && rpgMobaCiblesIndividuelles(duel, adversaire, ennemi.id).cibles.includes(allie.id));
        const attaque = Math.min(10, Math.max(0, Number(allie.atk) || 0));
        const score = soin * (1 + attaque * 0.2) + (menace ? force * 0.8 : 0)
          + (soin && rpgPeutAttaquer(allie) ? 0.5 : 0);
        if (!meilleur || score > meilleur.score || (score === meilleur.score && force > meilleur.force)) meilleur = { id: allie.id, score, force };
      }
      return meilleur?.id ?? null;
    });
  }
  if (attente.carteId === 'tour-de-braise') {
    // Pour le dégât d'arrivée, préférer une élimination réelle et profitable
    // plutôt que choisir uniquement la plus grosse carte. Ne pas supposer
    // qu'une esquive réussira ou échouera, ni compter une Tenacité comme une
    // élimination définitive. Les choix non résolus restent conservateurs.
    const cibleMortelle = rpgAvecCompteurEntitesIsole(() => {
      const enemy = autre(side);
      const initial = valeurPosition(duel, side);
      let meilleur = null;
      for (const cible of duel[enemy].creatures) {
        if (cible.esquive || cible.tenaciteDisponible || !(cible.pv > 0 && cible.pv <= 1)) continue;
        const essai = copie(duel);
        if (!rpgMobaResoudreArrivee(essai, side, cible.id).ok) continue;
        if (essai.effetCreatureEnAttente && !rpgMobaPasserEffetCreature(essai, enemy).ok) continue;
        resoudreDestructionsSurCopie(essai);
        if (essai.moba.winner === enemy || essai.arriveeEnAttente || essai.effetCreatureEnAttente
          || essai.destructionsEnAttente?.length || essai.mobaRechercheEnAttente || essai.siteEnAttente
          || essai.defausseEnAttente || essai.boualemEnAttente) continue;
        if (essai[enemy].creatures.some((e) => e.id === cible.id)
          || (essai[enemy].retoursProgrammes ?? []).some((retour) => retour.mobaSourceId === cible.id)
          || duel[side].creatures.some((allie) => !essai[side].creatures.some((reste) => reste.id === allie.id))) continue;
        const score = valeurPosition(essai, side) - initial;
        if (score > 0 && (!meilleur || score > meilleur.score)) meilleur = { id: cible.id, score };
      }
      return meilleur?.id ?? null;
    });
    if (cibleMortelle) return cibleMortelle;
  }
  if (attente.carteId === 'maitre-du-marteau') {
    // Si la réponse est laissée passer, une victoire immédiate prime. Pour
    // une première voie, appliquer les préférences confirmées : perdre le
    // Maître seul, ou le Maître et un Ashigaru 1/1 sans équipement ni bonus
    // défensif. Ne pas étendre ce choix à d'autres sacrifices d'alliés.
    const conqueteUtile = rpgAvecCompteurEntitesIsole(() => {
      const essai = copie(duel);
      if (!rpgMobaResoudreArrivee(essai, side, 'sorcier').ok) return false;
      if (essai.effetCreatureEnAttente && !rpgMobaPasserEffetCreature(essai, autre(side)).ok) return false;
      resoudreDestructionsSurCopie(essai);
      if (essai.moba.winner === side) return true;
      if (essai.moba.winner || essai.arriveeEnAttente || essai.effetCreatureEnAttente
        || essai.destructionsEnAttente?.length || essai.mobaRechercheEnAttente || essai.siteEnAttente
        || essai.defausseEnAttente || essai.boualemEnAttente) return false;
      const premiereVoie = !duel.moba.lanes.some((lane) => lane.conqueredBy === side)
        && duel.moba.lanes.some((lane) => lane.active
          && essai.moba.lanes.find((apres) => apres.id === lane.id)?.conqueredBy === side);
      const autresAlliesPerdus = duel[side].creatures.filter((allie) => allie.id !== attente.entiteId
        && !essai[side].creatures.some((reste) => reste.id === allie.id));
      const ashigaruSimple = autresAlliesPerdus.length === 1 && (() => {
        const allie = autresAlliesPerdus[0];
        return allie.carteId === 'ashigaru-des-braises' && allie.atk === 1 && allie.pv === 1 && allie.pvMax === 1
          && !allie.arme && !allie.armes?.length && !allie.enCale && !allie.bouclier && !allie.bouclierLumiere
          && !allie.tenaciteDisponible && !allie.esquive && !allie.protection;
      })();
      return premiereVoie && (autresAlliesPerdus.length === 0 || ashigaruSimple);
    });
    if (conqueteUtile) return 'sorcier';
  }
  if (attente.carteId === 'veilleuse-des-citernes') {
    const score = (e) => (e.pv ?? 0) * 1.5 + (e.atk ?? 0) + (estDefenseur(e) ? 0 : 2) + (e.bouclier ? 0 : 1);
    return [...duel[side].creatures].sort((a, b) => score(b) - score(a))
      .find((e) => rpgMobaResoudreArrivee(copie(duel), side, e.id).ok)?.id ?? null;
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

/** Choisit une attaque individuelle en simulant les cibles légales sur une
 * copie. Aucun jet ni aucune mutation ne touche la partie réelle. */
export function rpgMobaChoisirAttaqueIndividuelleIA(duel, side = 'sorcier') {
  return rpgAvecCompteurEntitesIsole(() => rpgMobaChoisirAttaqueIndividuelleIASurCopie(duel, side));
}

function rpgMobaChoisirAttaqueIndividuelleIASurCopie(duel, side = 'sorcier') {
  const initial = valeurPosition(duel, side);
  let meilleur = null;
  let meilleurePriorite = -1;
  for (const attacker of duel[side].creatures.filter(rpgPeutAttaquer)) {
    for (const voie of mobaVoiesCombat(duel.moba, attacker.mobaLane)) {
      const choix = rpgMobaCiblesIndividuelles(duel, side, attacker.id, voie);
      const cibles = [...choix.cibles, ...(choix.directe ? [null] : [])];
      for (const cibleId of cibles) {
        const probe = copie(duel);
        if (!rpgMobaDeclarerAttaqueIndividuelle(probe, side, attacker.id, cibleId, voie).ok) continue;
        if (!rpgMobaResoudreAttaqueIndividuelle(probe, side).ok) continue;
        resoudreDestructionsSurCopie(probe);
        if (probe.moba.winner === autre(side)) continue;
        const score = valeurPosition(probe, side) - initial;
        // La conquête exile aussi nos créatures : le score matériel peut donc
        // baisser au moment même où l'on gagne une voie (surtout à 1 PV).
        // Une victoire ou une nouvelle voie passe avant cette perte normale ;
        // hors conquête, on garde le seuil de rentabilité habituel.
        const priorite = probe.moba.winner === side ? 2
          : duel.moba.lanes.some((lane) => lane.active
            && probe.moba.lanes.find((apres) => apres.id === lane.id)?.conqueredBy === side) ? 1 : 0;
        if (priorite === 0 && score <= 0) continue;
        if (priorite > meilleurePriorite || (priorite === meilleurePriorite && score > meilleur.score)) {
          meilleur = { attaquantId: attacker.id, cibleId, voie, score };
          meilleurePriorite = priorite;
        }
      }
    }
  }
  return meilleur;
}

/** Anciennes signatures conservées pour les intégrations, sans combat groupé. */
export function rpgMobaChoisirAttaquantsIA(duel, side = 'sorcier') {
  const choix = rpgMobaChoisirAttaqueIndividuelleIA(duel, side);
  return choix ? [choix.attaquantId] : [];
}
export function rpgMobaChoisirCiblesAttaqueIA(duel, side, ids) {
  const choix = rpgMobaChoisirAttaqueIndividuelleIA(duel, side);
  return choix && ids.length === 1 && ids[0] === choix.attaquantId && choix.cibleId ? { [choix.attaquantId]: choix.cibleId } : {};
}
export function rpgMobaChoisirBlocagesIA() { return {}; }
