/**
 * Le duel de sorciers — moteur « façon Magic » des règles v3.
 *
 * Règles : la partie commence avec une main de 5 cartes et une table vide.
 * Les terrains produisent du mana coloré, les créatures ont le mal
 * d'invocation, les attaquants sont déclarés avant le combat et le défenseur
 * choisit ses bloqueurs. Les éphémères ouvrent une fenêtre de réponse.
 */

import {
  RPG_ELEMENTS,
  cardById,
  cardColorCost,
  cardColors,
  duelCardById,
  magieById,
  terrainById,
  terrainManaColors,
} from './rpgCards.js';
import {
  choisirAttaquantsIA,
  choisirBloqueursIA,
  choisirCarteIA,
  choisirCibleAutoIA,
  choisirCiblesRapidesIA,
  choisirTerrainIA,
  couleurEngagement,
} from './rpgAI.js';

export const RPG_PV_JOUEUR = 50;
export const RPG_PV_SORCIER_BASE = 50;
export const RPG_PV_SORCIER_PAR_PUISSANCE = 5;
export const RPG_MAIN_DEPART = 5;
export const RPG_COULEURS = RPG_ELEMENTS;

const destructionsParDuel = new WeakMap();

export function rpgNombreDestructions(duel) {
  return destructionsParDuel.get(duel)?.length ?? 0;
}

export function rpgDestructionsDepuis(duel, position = 0) {
  return (destructionsParDuel.get(duel) ?? [])
    .slice(Math.max(0, position))
    .map((evenement) => ({ ...evenement, sourceElements: [...evenement.sourceElements] }));
}

function journaliserDestruction(duel, entite, sourceElements = []) {
  const journal = destructionsParDuel.get(duel) ?? [];
  journal.push({
    entityId: entite.id,
    sourceElements: normaliserCouleurs(sourceElements),
  });
  destructionsParDuel.set(duel, journal);
}

const ELEMENT_LABELS = { braise: 'Braise', eau: 'Eau', sable: 'Sable', neige: 'Neige' };
const normaliserCouleurs = (couleurs) => [...new Set((Array.isArray(couleurs) ? couleurs.flat(Infinity) : [couleurs]).filter(Boolean))];
const manaVide = () => ({ braise: 0, eau: 0, sable: 0, neige: 0 });
const totalMana = (camp) => RPG_COULEURS.reduce((somme, c) => somme + camp.mana[c], 0);

/** PV d'un sorcier adverse selon sa puissance. */
export const rpgSorcierPv = (puissance = 0) =>
  RPG_PV_SORCIER_BASE + RPG_PV_SORCIER_PAR_PUISSANCE * Math.max(0, puissance);

/**
 * Nouveau duel : tables vides, 0 sable, puis chaque camp pioche 5 cartes.
 * `decks` : listes d'identifiants de cartes (créatures pour l'instant).
 * `sorcierIA` : profil de l'IA ({ niveau, style }) — voir rpgAI.js. Chaque
 * sorcier du mode Histoire peut porter le sien.
 */
export function rpgNouveauDuel({ joueurDeck = [], sorcierDeck = [], sorcierPuissance = 0, sorcierIA = null, rng = Math.random } = {}) {
  const melanger = (deck) => {
    const d = [...deck];
    for (let i = d.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  };
  const duel = {
    tour: 'joueur',
    joueur: { pv: RPG_PV_JOUEUR, pvMax: RPG_PV_JOUEUR, mana: manaVide(), bouclier: 0, terrainPose: false, deck: melanger(joueurDeck), main: [], creatures: [], terrains: [], cimetiere: [], retoursProgrammes: [] },
    sorcier: {
      pv: rpgSorcierPv(sorcierPuissance),
      pvMax: rpgSorcierPv(sorcierPuissance),
      puissance: sorcierPuissance,
      ia: sorcierIA,
      mana: manaVide(),
      bouclier: 0,
      terrainPose: false,
      deck: melanger(sorcierDeck),
      main: [],
      creatures: [],
      terrains: [],
      cimetiere: [],
      retoursProgrammes: [],
    },
    fenetreReponse: false,
    // Carte annoncée par le sorcier, pas encore résolue : le joueur peut répondre ou laisser passer.
    annonce: null,
    log: [],
  };
  for (let i = 0; i < RPG_MAIN_DEPART; i += 1) {
    rpgPiocher(duel, 'joueur');
    rpgPiocher(duel, 'sorcier');
  }
  return duel;
}

/** Pioche 1 carte du deck vers la main ; null si le deck est vide. */
export function rpgPiocher(duel, cote) {
  const camp = duel[cote];
  if (!camp.deck.length) return null;
  const carte = camp.deck.pop();
  camp.main.push(carte);
  return carte;
}

/** Sources présentes en réserve et sur les terrains dégagés. Une source
 *  flexible apparaît une seule fois avec ses deux couleurs possibles. */
function sourcesManaDisponibles(camp) {
  const flottant = RPG_COULEURS.flatMap((couleur) => Array.from(
    { length: Math.max(0, Math.floor(camp.mana[couleur] ?? 0)) },
    () => ({ colors: [couleur], kind: 'mana' }),
  ));
  const terrains = (camp.terrains ?? [])
    .filter((terrain) => !terrain.tapped)
    .map((terrain) => ({ colors: terrainManaColors(terrain.carteId), kind: 'terrain', terrainId: terrain.id }))
    .filter((source) => source.colors.length);
  return [...flottant, ...terrains];
}

/** Assigne chaque pip coloré à une source différente (matching biparti). */
function sourcesCouvrentPips(sources, coutCouleur) {
  const pips = Object.entries(coutCouleur)
    .flatMap(([couleur, quantite]) => Array.from({ length: quantite }, () => couleur))
    .sort((a, b) => sources.filter((source) => source.colors.includes(a)).length
      - sources.filter((source) => source.colors.includes(b)).length);
  const affectations = new Map();
  const affecter = (couleur, vus) => {
    for (let index = 0; index < sources.length; index += 1) {
      if (!sources[index].colors.includes(couleur) || vus.has(index)) continue;
      vus.add(index);
      const dejaAffectee = affectations.get(index);
      if (dejaAffectee === undefined || affecter(dejaAffectee, vus)) {
        affectations.set(index, couleur);
        return true;
      }
    }
    return false;
  };
  return pips.every((couleur) => affecter(couleur, new Set()));
}

/** Une carte doit avoir assez de sources, et chaque pip coloré doit avoir
 *  une source distincte compatible. */
export function rpgPeutPayer(camp, carte) {
  const sources = sourcesManaDisponibles(camp);
  const cout = Math.max(0, carte.cost ?? 0);
  return sources.length >= cout && sourcesCouvrentPips(sources, cardColorCost(carte));
}

/** Paie d'abord les pips colorés obligatoires, puis le coût générique. Les
 *  terrains produisant plusieurs couleurs sont réservés aux pips qui en ont besoin. */
function payer(duel, cote, carte) {
  const camp = duel[cote];
  let reste = Math.max(0, carte.cost ?? 0);
  const depenserSource = (couleur) => {
    if (camp.mana[couleur] > 0) {
      camp.mana[couleur] -= 1;
      return true;
    }
    const terrain = camp.terrains
      .filter((candidat) => !candidat.tapped && terrainManaColors(candidat.carteId).includes(couleur))
      .sort((a, b) => terrainManaColors(a.carteId).length - terrainManaColors(b.carteId).length)[0];
    if (!terrain) return false;
    const res = rpgEngagerTerrain(duel, cote, terrain.id, couleur);
    if (!res.ok) return false;
    camp.mana[couleur] -= 1;
    return true;
  };

  const coutCouleur = cardColorCost(carte);
  for (const couleur of RPG_COULEURS) {
    for (let pip = 0; pip < (coutCouleur[couleur] ?? 0); pip += 1) {
      if (!depenserSource(couleur)) return;
      reste -= 1;
    }
  }
  for (const couleur of RPG_COULEURS) {
    const pris = Math.min(camp.mana[couleur], reste);
    camp.mana[couleur] -= pris;
    reste -= pris;
    if (!reste) return;
  }
  const couleursCarte = cardColors(carte);
  while (reste > 0) {
    const terrain = camp.terrains
      .filter((candidat) => !candidat.tapped && terrainManaColors(candidat.carteId).length)
      .sort((a, b) => terrainManaColors(a.carteId).length - terrainManaColors(b.carteId).length)[0];
    if (!terrain) return;
    const couleursTerrain = terrainManaColors(terrain.carteId);
    const couleur = couleursTerrain.includes(carte.element)
      ? carte.element
      : couleursCarte.find((candidate) => couleursTerrain.includes(candidate)) ?? couleursTerrain[0];
    if (!depenserSource(couleur)) return;
    reste -= 1;
  }
}

/** Pose UN terrain par tour, comme à Magic. */
export function rpgPoserTerrain(duel, cote, carteId) {
  const camp = duel[cote];
  const carte = terrainById(carteId);
  if (!carte) return { ok: false, raison: 'inconnue' };
  if (!camp.main.includes(carteId)) return { ok: false, raison: 'pas-en-main' };
  if (camp.terrainPose) return { ok: false, raison: 'deja-pose' };
  camp.main.splice(camp.main.indexOf(carteId), 1);
  camp.terrains.push({ id: `${carteId}-${camp.terrains.length}-${Math.floor(Math.random() * 1e6)}`, carteId, tapped: false });
  camp.terrainPose = true;
  duel.log.push(`${cote === 'joueur' ? 'Vous posez' : 'Le sorcier pose'} le terrain ${carte.name}.`);
  return { ok: true };
}

/** Engager un terrain dégagé : les terrains flexibles acceptent une couleur
 *  choisie, les terrains de base gardent leur production habituelle. */
export function rpgEngagerTerrain(duel, cote, terrainId, couleurChoisie = null) {
  const terrain = duel[cote].terrains.find((t) => t.id === terrainId);
  if (!terrain) return { ok: false, raison: 'absent' };
  if (terrain.tapped) return { ok: false, raison: 'deja-engage' };
  const couleurs = terrainManaColors(terrain.carteId);
  const couleur = couleurChoisie ?? couleurs[0];
  if (!couleurs.includes(couleur)) return { ok: false, raison: 'couleur' };
  terrain.tapped = true;
  duel[cote].mana[couleur] += 1;
  return { ok: true, couleur };
}

export const rpgMana = (camp) => ({ ...camp.mana, total: totalMana(camp) });

const autre = (cote) => (cote === 'joueur' ? 'sorcier' : 'joueur');

function appliquerAuraSable(duel, cote) {
  const camp = duel[cote];
  const tarekEnJeu = camp.creatures.some((entite) => entite.carteId === 'tarek');
  for (const entite of camp.creatures) {
    const carte = duelCardById(entite.carteId);
    const prochainBonus = tarekEnJeu && cardColors(carte).includes('sable') ? 1 : 0;
    const delta = prochainBonus - (entite.auraSableBonus ?? 0);
    if (!delta) continue;
    entite.auraSableBonus = prochainBonus;
    entite.atk += delta;
    entite.def += delta;
    entite.pvMax += delta;
    entite.pv += delta;
  }
}

/** Protection temporaire contre les effets et les créatures d'une couleur donnée. */
export function rpgEstProtegee(entite, element) {
  const couleursSources = normaliserCouleurs(element);
  return Boolean(couleursSources.length
    && entite?.protection?.toursRestants > 0
    && couleursSources.includes(entite.protection.contre));
}

/** Les boucliers absorbent les prochains dégâts avant qu'ils n'atteignent les PV. */
function rpgInfligerSorcier(duel, cote, amount) {
  const camp = duel[cote];
  const degats = Math.max(0, amount);
  const absorbes = Math.min(camp.bouclier ?? 0, degats);
  camp.bouclier = Math.max(0, (camp.bouclier ?? 0) - absorbes);
  const recus = degats - absorbes;
  camp.pv -= recus;
  return { recus, absorbes };
}

let uid = 0;
const nextId = () => { uid += 1; return `entite-${uid}`; };

function creerEntiteCreature(carte) {
  return {
    id: nextId(),
    carteId: carte.id,
    kind: carte.kind ?? 'creature',
    name: carte.name,
    atk: carte.atk,
    def: carte.def,
    pv: carte.def,
    pvMax: carte.def,
    bouclier: 0,
    bouclierLumiere: false,
    auraSableBonus: 0,
    esquive: Math.max(0, carte.esquive ?? 0),
    rapidite: Boolean(carte.rapidite),
    coupRapide: Boolean(carte.coupRapide),
    envol: Boolean(carte.envol),
    protection: carte.protection ? {
      contre: carte.protection.contre,
      toursRestants: carte.protection.tours ?? 2,
    } : null,
    ready: Boolean(carte.rapidite),
    attaquee: false,
    resonance: 0,
  };
}

/**
 * Furie — capacité des vikings : une créature **blessée qui survit** gagne
 * +X/+X (X = la furie imprimée sur la carte). Les blessures d'un même échange
 * comptent une seule fois, et une attaque entièrement absorbée par un bouclier
 * n'est pas une blessure : la furie attend le premier sang.
 */
function appliquerFurie(duel, entite, degatsRecus) {
  const furie = Math.max(0, Number(duelCardById(entite.carteId)?.furie) || 0);
  if (!furie || degatsRecus <= 0) return;
  entite.atk += furie;
  entite.pvMax = (entite.pvMax ?? entite.def) + furie;
  entite.def += furie;
  entite.pv += furie;
  duel.log.push(`${entite.name} entre en furie : +${furie}/+${furie}.`);
}

/** Résonance — la valeur totale des sources présentes sur la table : chaque
 *  valkyrie en jeu ajoute la sienne (1 par défaut) au renfort de la Neige. */
export function rpgResonanceEnJeu(duel) {
  let total = 0;
  for (const cote of ['joueur', 'sorcier']) {
    for (const entite of duel[cote].creatures) {
      total += Math.max(0, Number(duelCardById(entite.carteId)?.resonance) || 0);
    }
  }
  return total;
}

/**
 * Résonance — aura de table : tant qu'une valkyrie est en jeu, **toutes** les
 * créatures Neige de la table (les deux camps) gagnent +1/+1 par source. On ne
 * pose que l'écart pour chaque entité (`entite.resonance`), pour qu'une source
 * qui entre ou qui meurt ne fasse pas dériver les statistiques déjà cumulées
 * par la Furie. Perdre la Résonance ne tue jamais : au pire, 1 PV.
 */
function majResonance(duel) {
  const total = rpgResonanceEnJeu(duel);
  let renforcees = 0;
  let affaiblies = 0;
  for (const cote of ['joueur', 'sorcier']) {
    for (const entite of duel[cote].creatures) {
      const carte = duelCardById(entite.carteId);
      const voulu = cardColors(carte).includes('neige') ? total : 0;
      const actuel = Math.max(0, Number(entite.resonance) || 0);
      if (voulu === actuel) continue;
      const delta = voulu - actuel;
      entite.resonance = voulu;
      entite.atk = Math.max(0, entite.atk + delta);
      entite.pvMax = Math.max(1, (entite.pvMax ?? entite.def) + delta);
      entite.def = Math.max(1, entite.def + delta);
      entite.pv = Math.max(1, entite.pv + delta);
      if (delta > 0) renforcees += 1; else affaiblies += 1;
    }
  }
  if (renforcees) duel.log.push(`La Résonance renforce la Neige : +${total}/+${total} aux créatures Neige.`);
  else if (affaiblies) duel.log.push('La Résonance se tait : les créatures Neige perdent leur bonus.');
}

/** Applique les blessures d’un effet de combat simultanément avant de résoudre
 *  les capacités de destruction des créatures. */
function appliquerDegatsDeCombatSimultanes(duel, coups) {
  const blessures = new Map();
  for (const coup of coups) {
    const entite = duel[coup.cote].creatures.find((candidate) => candidate.id === coup.entiteId);
    if (!entite || rpgEstProtegee(entite, coup.sourceElement)) continue;
    if (entite.bouclierLumiere && (coup.sourceType === 'attaque' || coup.sourceType === 'magie')) {
      entite.bouclierLumiere = false;
      continue;
    }
    const degats = Math.max(0, Number(coup.amount) || 0);
    const esquive = coup.sourceType === 'attaque' || coup.sourceType === 'magie'
      ? Math.min(degats, Math.max(0, entite.esquive ?? 0))
      : 0;
    const apresEsquive = degats - esquive;
    if (apresEsquive <= 0) continue;
    const cle = `${coup.cote}:${entite.id}`;
    const blessure = blessures.get(cle) ?? {
      cote: coup.cote,
      entite,
      montant: 0,
      sourceElements: [],
    };
    blessure.montant += apresEsquive;
    blessure.sourceElements.push(...normaliserCouleurs(coup.sourceElement));
    blessures.set(cle, blessure);
  }

  const mortes = [];
  const furieuses = [];
  for (const blessure of blessures.values()) {
    const { entite, montant, cote } = blessure;
    const absorbes = Math.min(entite.bouclier ?? 0, montant);
    entite.bouclier = Math.max(0, (entite.bouclier ?? 0) - absorbes);
    const recus = montant - absorbes;
    entite.pv -= recus;
    entite.def = Math.min(entite.def, Math.max(0, entite.pv));
    if (entite.pv <= 0) {
      mortes.push({
        cote,
        entite,
        sourceElements: blessure.sourceElements,
      });
    } else {
      furieuses.push({ entite, recus });
    }
  }
  // La furie monte après les blessures : les blessures d'un même échange ne
  // comptent qu'une fois, et une créature morte ne s'énerve pas.
  for (const { entite, recus } of furieuses) appliquerFurie(duel, entite, recus);

  // Retire d’abord toutes les victimes : une capacité de destruction ne peut
  // donc empêcher l’autre combattant d’infliger les dégâts déjà calculés.
  for (const mort of mortes) {
    const camp = duel[mort.cote];
    journaliserDestruction(duel, mort.entite, mort.sourceElements);
    camp.creatures = camp.creatures.filter((candidate) => candidate.id !== mort.entite.id);
    camp.cimetiere.push(mort.entite.carteId);
    duel.log.push(`${mort.entite.name} est détruite et rejoint le cimetière.`);
  }
  for (const mort of mortes) {
    const carte = duelCardById(mort.entite.carteId);
    if (carte?.destruction) {
      appliquer(duel, mort.cote, carte.destruction, null, null, cardColors(carte), null, mort.entite.carteId);
    }
  }
  appliquerAuraSable(duel, 'joueur');
  appliquerAuraSable(duel, 'sorcier');
  majResonance(duel);
  rpgActionsEtat(duel);
}

/** Dégâts de capacité infligés à la créature que la carte combat, s’il y a lieu. */
function degatsCreatureCombattue(carte) {
  if (carte?.combat?.type !== 'degats-creature-combattue') return 0;
  return Math.max(0, Number(carte.combat.amount) || 0);
}

/** Prépare les dégâts des capacités « quand cette créature attaque ou bloque ».
 *  Ils se résolvent avant les blessures normales du combat. */
function ajouterDegatsCapaciteAvantCombat(coups, coteSource, carteSource, cible) {
  const amount = degatsCreatureCombattue(carteSource);
  if (amount <= 0 || !cible) return;
  coups.push({
    cote: autre(coteSource),
    entiteId: cible.id,
    amount,
    sourceElement: cardColors(carteSource),
    sourceType: 'capacite',
  });
}

/** Applique un effet de capacité (arrivée / destruction). `sauf` exclut une
 *  entité du buff (le Colosse ne se buffe pas lui-même). */
function appliquer(duel, cote, effet, cibleId, sauf = null, sourceElement = null, sourceType = null, sourceCarteId = null) {
  const adv = autre(cote);
  switch (effet.type) {
    case 'pioche':
      for (let i = 0; i < (effet.amount ?? 1); i += 1) rpgPiocher(duel, cote);
      return;
    case 'retour-main': {
      // Renvoi en main (« bounce ») : la cible quitte la table pour la main de
      // son propriétaire. `creature` vise le camp adverse, `creature-amie` le
      // camp du lanceur. `pioche` fait piocher le lanceur après le renvoi.
      const coteCible = effet.cible === 'creature-amie' ? cote : adv;
      const cibles = duel[coteCible].creatures.filter((entite) => entite.id === cibleId);
      for (const cible of cibles) {
        renvoyerEnMain(duel, coteCible, cible, sourceElement);
      }
      for (let i = 0; i < (effet.pioche ?? 0); i += 1) rpgPiocher(duel, cote);
      return;
    }
    case 'retour-apres-tours': {
      const carteSource = duelCardById(sourceCarteId);
      if (!carteSource) return;
      const tours = Math.max(1, Math.floor(Number(effet.tours) || 1));
      const camp = duel[cote];
      camp.retoursProgrammes ??= [];
      camp.retoursProgrammes.push({ carteId: sourceCarteId, toursRestants: tours });
      duel.log.push(`${carteSource.name} reviendra en jeu après ${tours} tour${tours === 1 ? '' : 's'}.`);
      return;
    }
    case 'sable':
      duel[cote].sable += effet.amount ?? 0;
      return;
    case 'soin':
      duel[cote].pv = Math.min(duel[cote].pvMax, duel[cote].pv + (effet.amount ?? 0));
      return;
    case 'soin-creatures':
      for (const entite of duel[cote].creatures) {
        entite.pv = Math.min(entite.pvMax, entite.pv + (effet.amount ?? 0));
        entite.def = Math.min(entite.pvMax, Math.max(entite.def, entite.pv));
      }
      return;
    case 'bouclier-lumiere': {
      const entite = duel[cote].creatures.find((candidate) => candidate.id === sauf);
      if (entite) entite.bouclierLumiere = true;
      return;
    }
    case 'bouclier': {
      if (effet.cible === 'creature-amie') {
        const entite = duel[cote].creatures.find((e) => e.id === cibleId);
        if (entite && !rpgEstProtegee(entite, sourceElement)) {
          entite.bouclier = (entite.bouclier ?? 0) + (effet.amount ?? 0);
        }
      } else {
        duel[cote].bouclier = (duel[cote].bouclier ?? 0) + (effet.amount ?? 0);
      }
      return;
    }
    case 'buff':
      for (const entite of duel[cote].creatures) {
        if (sauf === entite.id || rpgEstProtegee(entite, sourceElement)) continue;
        const bonusDefense = effet.def ?? 0;
        entite.atk += effet.atk ?? 0;
        entite.pvMax = (entite.pvMax ?? entite.def) + bonusDefense;
        entite.def += bonusDefense;
        entite.pv += bonusDefense;
      }
      return;
    case 'combat': {
      const combattant = duel[cote].creatures.find((entite) => entite.id === sauf);
      const cible = duel[adv].creatures.find((entite) => entite.id === cibleId);
      if (!combattant || !cible) return;
      duel.log.push(`${combattant.name} se bat contre ${cible.name} (${combattant.atk} / ${cible.atk}).`);
      appliquerDegatsDeCombatSimultanes(duel, [
        {
          cote: adv,
          entiteId: cible.id,
          amount: combattant.atk,
          sourceElement,
          sourceType: 'capacite',
        },
        {
          cote,
          entiteId: combattant.id,
          amount: cible.atk,
          sourceElement: cardColors(duelCardById(cible.carteId)),
          sourceType: 'capacite',
        },
      ]);
      return;
    }
    case 'detruire-terrain-aleatoire': {
      const terrainsAdverses = duel[adv].terrains;
      const source = duel[cote].creatures.find((entite) => entite.id === sauf);
      if (!terrainsAdverses.length) {
        duel.log.push(`${source?.name ?? 'La capacité'} arrive, mais aucun terrain adverse n’est à détruire.`);
        return;
      }
      const index = Math.floor(Math.random() * terrainsAdverses.length);
      const [terrainDetruit] = terrainsAdverses.splice(index, 1);
      duel[adv].cimetiere.push(terrainDetruit.carteId);
      journaliserDestruction(duel, { id: terrainDetruit.id }, sourceElement);
      const carteTerrain = terrainById(terrainDetruit.carteId);
      duel.log.push(`${source?.name ?? 'La capacité'} détruit le terrain adverse ${carteTerrain?.name ?? terrainDetruit.carteId}.`);
      return;
    }
    case 'degats': {
      if (effet.cible === 'sorcier') {
        rpgInfligerSorcier(duel, adv, effet.amount ?? 0);
        return;
      }
      const cibles = effet.cible === 'toutes-creatures'
        ? [...duel[adv].creatures]
        : duel[adv].creatures.filter((entite) => entite.id === cibleId);
      for (const cible of cibles) {
        rpgBlesserCreature(duel, adv, cible.id, effet.amount ?? 0, sourceElement, null, sourceType);
      }
      return;
    }
    default:
  }
}

/**
 * Renvoi en main (« bounce ») : la créature quitte la table **sans mourir** —
 * elle retourne dans la main de son propriétaire. Elle n'entre donc pas au
 * cimetière, ne déclenche aucune capacité de destruction, et perd tout ce
 * qu'elle avait gagné sur la table (blessures soignées, boucliers, Furie,
 * compteurs) : la rejouer coûtera de nouveau son mana. La protection contre la
 * couleur du sort arrête le renvoi, comme elle arrête les dégâts.
 */
function renvoyerEnMain(duel, cote, entite, sourceElement = null) {
  const camp = duel[cote];
  const presente = camp.creatures.find((e) => e.id === entite.id);
  if (!presente) return false;
  if (rpgEstProtegee(presente, sourceElement)) {
    duel.log.push(`${presente.name} échappe au renvoi : protégée.`);
    return false;
  }
  camp.creatures = camp.creatures.filter((e) => e.id !== presente.id);
  camp.main.push(presente.carteId);
  duel.log.push(`${presente.name} retourne dans la main de son propriétaire.`);
  majResonance(duel);
  return true;
}

/** Retire une créature morte, puis déclenche sa capacité de destruction. */
function enterrer(duel, cote, entite, sourceElements = []) {
  journaliserDestruction(duel, entite, sourceElements);
  const camp = duel[cote];
  camp.creatures = camp.creatures.filter((e) => e.id !== entite.id);
  camp.cimetiere.push(entite.carteId);
  duel.log.push(`${entite.name} est détruite et rejoint le cimetière.`);
  const carte = duelCardById(entite.carteId);
  if (carte?.destruction) {
    appliquer(duel, cote, carte.destruction, null, null, cardColors(carte), null, entite.carteId);
  }
  appliquerAuraSable(duel, cote);
  majResonance(duel);
}

/**
 * Actions d'état — le filet de sécurité de la table.
 *
 * Une créature sans défense ne tient pas debout : elle quitte le champ de
 * bataille **immédiatement**, quelle que soit la cause de sa chute (blessures
 * de combat, magie, capacité, malus d'aura, effet ajouté plus tard). Les
 * fonctions de dégâts enterrent déjà leurs victimes ; ce passage se contente
 * de garantir qu'aucun chemin ne puisse laisser une carte morte — et donc
 * engagée à jamais — sur le terrain. Il est rejoué tant qu'une capacité de
 * destruction en fait tomber une autre.
 *
 * @param {object} duel partie en cours, modifiée sur place
 * @returns {number} nombre de créatures retirées (0 = la table était saine)
 */
export function rpgActionsEtat(duel) {
  let retirees = 0;
  for (let garde = 0; garde < 32; garde += 1) {
    let uneMorte = false;
    for (const cote of ['joueur', 'sorcier']) {
      const morte = duel[cote].creatures.find((entite) => !(entite.pv > 0));
      if (!morte) continue;
      uneMorte = true;
      retirees += 1;
      enterrer(duel, cote, morte);
    }
    if (!uneMorte) break;
  }
  return retirees;
}

/** Dégâts sur une créature : à 0 défense, elle meurt (capacité comprise). */
export function rpgBlesserCreature(duel, cote, entiteId, amount, sourceElement = null, sourceElements = null, sourceType = null) {
  const entite = duel[cote].creatures.find((e) => e.id === entiteId);
  if (!entite) return { ok: false, raison: 'absente' };
  if (rpgEstProtegee(entite, sourceElement)) {
    return { ok: true, recus: 0, absorbes: 0, protegee: true };
  }
  if (entite.bouclierLumiere && (sourceType === 'attaque' || sourceType === 'magie')) {
    entite.bouclierLumiere = false;
    return { ok: true, recus: 0, absorbes: 0, bouclierLumiere: true };
  }
  const degats = Math.max(0, amount);
  const esquive = sourceType === 'attaque' || sourceType === 'magie'
    ? Math.min(degats, Math.max(0, entite.esquive ?? 0))
    : 0;
  const apresEsquive = degats - esquive;
  const absorbes = Math.min(entite.bouclier ?? 0, apresEsquive);
  entite.bouclier = Math.max(0, (entite.bouclier ?? 0) - absorbes);
  const recus = apresEsquive - absorbes;
  entite.pv -= recus;
  entite.def = Math.min(entite.def, Math.max(0, entite.pv));
  if (entite.pv <= 0) {
    const elements = sourceElements ?? (sourceElement ? [sourceElement] : []);
    enterrer(duel, cote, entite, elements);
  } else {
    appliquerFurie(duel, entite, recus);
  }
  appliquerAuraSable(duel, cote);
  rpgActionsEtat(duel);
  return { ok: true, recus, absorbes, esquives: esquive };
}

/** Pose une créature : paie le sable, arrive en jeu, capacité d'arrivée. */
export function rpgJouerCreature(duel, cote, carteId, cibleId = null) {
  const camp = duel[cote];
  const carte = duelCardById(carteId);
  if (!carte) return { ok: false, raison: 'inconnue' };
  if (!camp.main.includes(carteId)) return { ok: false, raison: 'pas-en-main' };
  if (carte.arrivee?.type === 'combat') {
    const adversaires = duel[autre(cote)].creatures;
    const cible = adversaires.find((entite) => entite.id === cibleId);
    if (cibleId && !cible) return { ok: false, raison: 'cible' };
    if (cible && rpgEstProtegee(cible, cardColors(carte))) return { ok: false, raison: 'protection' };
    if (!cibleId && adversaires.some((entite) => !rpgEstProtegee(entite, cardColors(carte)))) {
      return { ok: false, raison: 'cible' };
    }
  }
  if (!rpgPeutPayer(camp, carte)) return { ok: false, raison: 'mana' };
  payer(duel, cote, carte);
  camp.main.splice(camp.main.indexOf(carteId), 1);
  if (cote === 'joueur' && !duel.annonce) {
    const contreIA = choisirContreIA(duel, carte);
    if (contreIA) return contrerAnnonce(duel, 'sorcier', contreIA, { cote: 'joueur', carteId });
  }
  const entite = creerEntiteCreature(carte);
  camp.creatures.push(entite);
  duel.log.push(`${cote === 'joueur' ? 'Vous posez' : 'Le sorcier pose'} ${carte.name}.`);
  if (entite.protection) {
    const couleur = ELEMENT_LABELS[entite.protection.contre] ?? entite.protection.contre;
    duel.log.push(`${entite.name} reçoit une protection contre ${couleur} pour ce tour et le prochain tour adverse.`);
  }
  if (carte.arrivee) {
    const cibleArrivee = carte.arrivee.cible === 'creature-amie' ? (cibleId ?? entite.id) : cibleId;
    appliquer(duel, cote, carte.arrivee, cibleArrivee, entite.id, cardColors(carte));
  }
  majResonance(duel);
  appliquerAuraSable(duel, cote);
  rpgActionsEtat(duel);
  return { ok: true, entite };
}

const pret = (entite) => entite && entite.ready && !entite.attaquee;
// Le mal d'invocation empêche d'attaquer, pas de défendre : toute créature
// qui n'a pas attaqué ce tour peut bloquer, même si elle vient d'arriver.
const peutBloquer = (entite) => entite && !entite.attaquee;

/** Envol : un attaquant volant ne peut être bloqué que par une créature volante. */
export function rpgPeutBloquerAttaquant(bloqueur, attaquant) {
  if (!bloqueur || !attaquant) return false;
  return !attaquant.envol || Boolean(bloqueur.envol);
}

/** Combat entre créatures : dégâts mutuels et capacités liées au combat. */
export function rpgAttaquerCreature(duel, cote, entiteId, cibleId) {
  const attaquant = duel[cote].creatures.find((e) => e.id === entiteId);
  const cible = duel[autre(cote)].creatures.find((e) => e.id === cibleId);
  if (!attaquant || !cible) return { ok: false, raison: 'absente' };
  if (!pret(attaquant)) return { ok: false, raison: 'pas-pret' };
  attaquant.attaquee = true;

  const carteAttaquant = duelCardById(attaquant.carteId);
  const carteCible = duelCardById(cible.carteId);
  const couleursAttaquant = cardColors(carteAttaquant);
  const couleursCible = cardColors(carteCible);
  const degatsAvantCombat = [];
  ajouterDegatsCapaciteAvantCombat(degatsAvantCombat, cote, carteAttaquant, cible);
  ajouterDegatsCapaciteAvantCombat(degatsAvantCombat, autre(cote), carteCible, attaquant);
  appliquerDegatsDeCombatSimultanes(duel, degatsAvantCombat);

  const coupsNormaux = [];
  if (duel[cote].creatures.some((entite) => entite.id === attaquant.id)) {
    coupsNormaux.push({
      cote: autre(cote), entiteId: cible.id, amount: attaquant.atk,
      sourceElement: couleursAttaquant, sourceType: 'attaque',
    });
  }
  if (duel[autre(cote)].creatures.some((entite) => entite.id === cible.id)) {
    coupsNormaux.push({
      cote, entiteId: attaquant.id, amount: cible.atk,
      sourceElement: couleursCible, sourceType: 'attaque',
    });
  }
  appliquerDegatsDeCombatSimultanes(duel, coupsNormaux);
  rpgActionsEtat(duel);
  return { ok: true };
}

/** Cible automatique pour l'IA et les effets globaux ; l'interface laisse
 *  le joueur choisir la cible des sorts qui la demandent. Le choix est
 *  tactique : un kill sur la meilleure valeur, la menace principale, ou le
 *  sorcier quand c'est le meilleur coup (surtout quand il est létal). */
export function rpgCibleAuto(duel, cote, carte) {
  return choisirCibleAutoIA(duel, cote, carte);
}

/** Un contre ne vise que la carte que le sorcier vient d'annoncer. `cible` : 'carte'
 *  (n'importe quelle carte) ou 'sort' (magies seulement) ; `contre` : couleurs visées. */
function contreCorrespond(effet, carte) {
  if (effet.cible === 'sort' && !magieById(carte.id)) return false;
  if (effet.contre && !cardColors(carte).some((couleur) => effet.contre.includes(couleur))) return false;
  return true;
}

/**
 * Un contre n'a de sens que face à une annonce adverse qu'il peut viser.
 * L'interface s'en sert pour ne pas allumer une carte injouable : sans ça, le
 * joueur tape sa carte, confirme, et rien ne se passe — indéfiniment.
 *
 * @returns {boolean} vrai si la carte n'est pas un contre, ou si elle a une
 *   annonce adverse légale à contrer maintenant.
 */
export function rpgContreJouable(duel, cote, carte) {
  if (carte?.effet?.type !== 'contresort') return true;
  const annonce = duel.annonce;
  if (!annonce || annonce.cote === cote) return false;
  const visee = duelCardById(annonce.carteId) ?? magieById(annonce.carteId);
  return Boolean(visee && contreCorrespond(carte.effet, visee));
}

/** Contrer : répond à une annonce adverse (ou à la carte du joueur que l'IA contre).
 *  La carte visée est défaussée sans effet, et le contre paie son coût (Marée
 *  contraire fait aussi piocher une carte). `annonce` : { cote, carteId } ;
 *  par défaut l'annonce en cours du sorcier. */
function contrerAnnonce(duel, cote, carte, annonce = duel.annonce) {
  const camp = duel[cote];
  if (!annonce || annonce.cote === cote) return { ok: false, raison: 'rien-a-contrer' };
  const cible = duelCardById(annonce.carteId) ?? magieById(annonce.carteId);
  if (!cible || !contreCorrespond(carte.effet, cible)) return { ok: false, raison: 'cible' };
  if (!rpgPeutPayer(camp, carte)) return { ok: false, raison: 'mana' };
  payer(duel, cote, carte);
  camp.main.splice(camp.main.indexOf(carte.id), 1);
  camp.cimetiere.push(carte.id);
  const main = duel[annonce.cote].main;
  if (main.includes(annonce.carteId)) main.splice(main.indexOf(annonce.carteId), 1);
  duel[annonce.cote].cimetiere.push(annonce.carteId);
  if (annonce === duel.annonce) {
    duel.annonce = null;
    duel.fenetreReponse = false;
  }
  for (let i = 0; i < (carte.effet.pioche ?? 0); i += 1) rpgPiocher(duel, cote);
  duel.log.push(cote === 'joueur'
    ? `Vous contrez ${cible.name} avec ${carte.name}.`
    : `Le sorcier contre ${cible.name} avec ${carte.name}.`);
  return { ok: true, contre: true, parIA: cote === 'sorcier', carteContree: annonce.carteId, carteContre: carte.id };
}

/** Contre de l'IA à une carte du joueur : seulement si la carte coûte au moins 2,
 *  et avec le contre le moins cher qui vise cette carte et que le sorcier peut payer. */
function choisirContreIA(duel, carte) {
  if (!carte || (carte.cost ?? 0) < 2) return null;
  const candidats = duel.sorcier.main
    .map((id) => cardById(id))
    .filter((c) => c?.effet?.type === 'contresort'
      && contreCorrespond(c.effet, carte)
      && rpgPeutPayer(duel.sorcier, c))
    .sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0));
  return candidats[0] ?? null;
}

/** Lancer une magie : rituel pendant son tour, éphémère aussi en réponse. */
export function rpgLancerMagie(duel, cote, carteId, cibleId = null) {
  const camp = duel[cote];
  const adv = autre(cote);
  const carte = magieById(carteId);
  if (!carte) return { ok: false, raison: 'inconnue' };
  if (!camp.main.includes(carteId)) return { ok: false, raison: 'pas-en-main' };
  const fenetreEphémère = cote === 'joueur'
    && duel.fenetreReponse
    && carte.instant;
  if (duel.tour !== cote && !fenetreEphémère) return { ok: false, raison: 'timing' };
  if (!rpgPeutPayer(camp, carte)) return { ok: false, raison: 'mana' };
  if (carte.effet.type === 'contresort') return contrerAnnonce(duel, cote, carte);

  if (cote === 'joueur' && !duel.annonce) {
    const contreIA = choisirContreIA(duel, carte);
    if (contreIA) return contrerAnnonce(duel, 'sorcier', contreIA, { cote: 'joueur', carteId });
  }

  if (carte.effet.type === 'degats' && carte.effet.cible === 'creature') {
    if (cibleId === 'sorcier') {
      if (!carte.cibles?.includes('sorcier')) return { ok: false, raison: 'cible' };
    } else {
      const cible = duel[adv].creatures.find((entite) => entite.id === cibleId);
      if (!cible) return { ok: false, raison: 'cible' };
      if (rpgEstProtegee(cible, cardColors(carte))) return { ok: false, raison: 'protection' };
    }
  }
  if (carte.effet.type === 'bouclier' && carte.effet.cible === 'creature-amie') {
    const cible = camp.creatures.find((entite) => entite.id === cibleId);
    if (!cible) return { ok: false, raison: 'cible' };
    if (rpgEstProtegee(cible, cardColors(carte))) return { ok: false, raison: 'protection' };
  }
  if (carte.effet.type === 'retour-main') {
    // Le renvoi exige une créature sur la table : `creature` vise le camp
    // adverse, `creature-amie` le camp du lanceur. Sans cible légale, le sort
    // ne se lance pas et le mana n'est pas payé.
    const campCible = carte.effet.cible === 'creature-amie' ? camp : duel[adv];
    const cible = campCible.creatures.find((entite) => entite.id === cibleId);
    if (!cible) return { ok: false, raison: 'cible' };
    if (rpgEstProtegee(cible, cardColors(carte))) return { ok: false, raison: 'protection' };
  }

  payer(duel, cote, carte);
  camp.main.splice(camp.main.indexOf(carteId), 1);
  const effet = carte.effet.type === 'degats'
    && carte.effet.cible === 'creature'
    && cibleId === 'sorcier'
    ? { ...carte.effet, cible: 'sorcier' }
    : carte.effet;
  appliquer(duel, cote, effet, cibleId, null, cardColors(carte), 'magie');
  camp.cimetiere.push(carteId);
  duel.log.push(`${cote === 'joueur' ? 'Vous lancez' : 'Le sorcier lance'} ${carte.name}.`);
  rpgActionsEtat(duel);
  return { ok: true };
}

/** Ouvre une fenêtre de réponse au contrôleur ciblé par la phase de combat. */
export function rpgOuvrirFenetreReponse(duel, cote = 'sorcier') {
  if (duel.tour !== cote) return false;
  duel.fenetreReponse = true;
  return true;
}

export function rpgFermerFenetreReponse(duel) {
  duel.fenetreReponse = false;
}

/** L’IA assigne ses bloqueurs avant que le joueur attaquant ne reçoive la priorité.
 *  Échanges favorables ou acceptables seulement, interposition forcée pour la survie. */
export function rpgChoisirBloqueurs(duel, cote, attaquantIds, ciblesAttaque = {}, options = {}) {
  return choisirBloqueursIA(duel, cote, attaquantIds, ciblesAttaque, options);
}

/** L’IA vise avec le Coup rapide la créature la plus intéressante à abattre. */
export function rpgCiblesAttaqueRapide(duel, cote, attaquantIds, options = {}) {
  return choisirCiblesRapidesIA(duel, cote, attaquantIds, options);
}

/** Les créatures que le sorcier engage réellement à l’attaque : pas
 *  d’assaut suicidaire, conclusion immédiate quand le visage adverse tombe. */
export function rpgChoisirAttaquants(duel, cote = 'sorcier', options = {}) {
  return choisirAttaquantsIA(duel, cote, options);
}

/**
 * Résout une attaque déclarée. Un attaquant peut être bloqué par plusieurs
 * créatures, mais un bloqueur ne participe qu'à un seul combat. Chaque
 * bloqueur frappe l'attaquant ; l'attaquant répartit sa force entre ses
 * bloqueurs (répartition égale par défaut si aucune n'est fournie).
 * `blocages === null` laisse l'IA affecter automatiquement ses bloqueurs.
 */
export function rpgLancerAttaque(
  duel,
  cote,
  attaquantIds,
  blocages = null,
  repartitions = null,
  attaquantsBloques = null,
  ciblesAttaque = null,
) {
  const adv = autre(cote);
  const ids = [...new Set(attaquantIds ?? [])];
  const attaquants = duel[cote].creatures.filter((e) => ids.includes(e.id));
  if (!attaquants.length) return { ok: false, raison: 'personne' };
  if (attaquants.length !== ids.length) return { ok: false, raison: 'absent' };
  for (const entite of attaquants) {
    if (!pret(entite)) return { ok: false, raison: 'pas-pret' };
  }

  const ciblesRapides = ciblesAttaque ?? (cote === 'sorcier'
    ? rpgCiblesAttaqueRapide(duel, cote, ids)
    : {});
  if (!ciblesRapides || typeof ciblesRapides !== 'object' || Array.isArray(ciblesRapides)
    || Object.keys(ciblesRapides).some((id) => !ids.includes(id))) {
    return { ok: false, raison: 'cible' };
  }
  for (const attaquant of attaquants) {
    const carte = duelCardById(attaquant.carteId);
    const cibleId = ciblesRapides[attaquant.id];
    if (cibleId && !carte?.coupRapide) return { ok: false, raison: 'cible' };
    if (!carte?.coupRapide) continue;
    const ciblesLegales = duel[adv].creatures.filter((entite) => !rpgEstProtegee(entite, cardColors(carte)));
    if (!cibleId && ciblesLegales.length) return { ok: false, raison: 'cible' };
    const cible = cibleId && duel[adv].creatures.find((entite) => entite.id === cibleId);
    if (cible && rpgEstProtegee(cible, cardColors(carte))) return { ok: false, raison: 'protection' };
  }

  const bloqueursDisponibles = duel[adv].creatures.filter(peutBloquer);
  const affectations = blocages === null
    ? rpgChoisirBloqueurs(duel, cote, ids, ciblesRapides)
    : Object.fromEntries(Object.entries(blocages).map(([attaquantId, idsBloqueurs]) => [
      attaquantId,
      Array.isArray(idsBloqueurs) ? idsBloqueurs : idsBloqueurs ? [idsBloqueurs] : [],
    ]));
  const attaquantsDejaBloques = new Set((attaquantsBloques
    ?? Object.entries(affectations).filter(([, idsBloqueurs]) => idsBloqueurs.length).map(([id]) => id))
    .filter((id) => ids.includes(id) && !ciblesRapides[id]));

  const bloqueursUtilises = new Set();
  for (const [attaquantId, idsBloqueurs] of Object.entries(affectations)) {
    if (!ids.includes(attaquantId)) return { ok: false, raison: 'blocage' };
    if (new Set(idsBloqueurs).size !== idsBloqueurs.length) return { ok: false, raison: 'bloqueur' };
    if (ciblesRapides[attaquantId] && idsBloqueurs.length) return { ok: false, raison: 'blocage' };
    const attaquant = attaquants.find((entite) => entite.id === attaquantId);
    for (const bloqueurId of idsBloqueurs) {
      const bloqueur = bloqueursDisponibles.find((entite) => entite.id === bloqueurId);
      if (!bloqueur || bloqueursUtilises.has(bloqueurId)) return { ok: false, raison: 'bloqueur' };
      if (!rpgPeutBloquerAttaquant(bloqueur, attaquant)) return { ok: false, raison: 'envol' };
      if (rpgEstProtegee(attaquant, cardColors(duelCardById(bloqueur.carteId)))) {
        return { ok: false, raison: 'protection' };
      }
      bloqueursUtilises.add(bloqueurId);
    }
  }

  // Les capacités déclenchées par les blocages précèdent même le partage des
  // blessures. Prévoir aussi les destructions en chaîne, boucliers et protections
  // sur une copie pour qu'une répartition invalide ne modifie jamais la partie.
  const degatsAvantCombat = [];
  for (const attaquant of attaquants) {
    for (const bloqueurId of affectations[attaquant.id] ?? []) {
      const bloqueur = bloqueursDisponibles.find((entite) => entite.id === bloqueurId);
      ajouterDegatsCapaciteAvantCombat(degatsAvantCombat, cote, duelCardById(attaquant.carteId), bloqueur);
      ajouterDegatsCapaciteAvantCombat(degatsAvantCombat, adv, duelCardById(bloqueur.carteId), attaquant);
    }
  }
  const apresCapacites = degatsAvantCombat.length ? JSON.parse(JSON.stringify(duel)) : duel;
  if (degatsAvantCombat.length) appliquerDegatsDeCombatSimultanes(apresCapacites, degatsAvantCombat);
  const attaquantsApresCapacites = apresCapacites[cote].creatures.filter((entite) => ids.includes(entite.id));
  const bloqueursApresCapacites = new Set(apresCapacites[adv].creatures.map((entite) => entite.id));
  const blocagesApresCapacites = Object.fromEntries(attaquantsApresCapacites.map((entite) => [
    entite.id,
    (affectations[entite.id] ?? []).filter((id) => bloqueursApresCapacites.has(id)),
  ]));

  // Prépare et valide toutes les répartitions avant de modifier la partie.
  const repartitionFinale = {};
  for (const attaquant of attaquantsApresCapacites) {
    const idsBloqueurs = blocagesApresCapacites[attaquant.id] ?? [];
    if (!idsBloqueurs.length) continue;
    if (idsBloqueurs.length === 1) {
      repartitionFinale[attaquant.id] = { [idsBloqueurs[0]]: attaquant.atk };
      continue;
    }

    const saisie = repartitions?.[attaquant.id];
    const distribution = {};
    if (saisie == null) {
      const quotient = Math.floor(attaquant.atk / idsBloqueurs.length);
      let reste = attaquant.atk - quotient * idsBloqueurs.length;
      for (const bloqueurId of idsBloqueurs) {
        distribution[bloqueurId] = quotient + (reste > 0 ? 1 : 0);
        reste -= reste > 0 ? 1 : 0;
      }
    } else {
      if (Object.keys(saisie).some((id) => !idsBloqueurs.includes(id))) {
        return { ok: false, raison: 'repartition' };
      }
      for (const bloqueurId of idsBloqueurs) {
        const amount = Number(saisie[bloqueurId] ?? 0);
        if (!Number.isInteger(amount) || amount < 0) return { ok: false, raison: 'repartition' };
        distribution[bloqueurId] = amount;
      }
      if (Object.values(distribution).reduce((total, amount) => total + amount, 0) !== attaquant.atk) {
        return { ok: false, raison: 'repartition' };
      }
    }
    repartitionFinale[attaquant.id] = distribution;
  }

  const resume = {
    frappeSorcier: 0,
    paires: [],
    coupsRapides: [],
    blocages: affectations,
    repartitions: repartitionFinale,
    attaquantsBloques: [...attaquantsDejaBloques],
  };
  const degatsCombat = [];
  const coupsSorcier = [];
  const enregistrerDegatsCombat = (coups, coteCible, entiteId, amount, sourceElement, sourceType, coteSource, sourceId) => {
    coups.push({
      cote: coteCible,
      entiteId,
      amount,
      sourceElement,
      sourceType,
      coteSource,
      sourceId,
    });
  };
  // Appliquer réellement cette étape une seule fois, avant les blessures normales.
  appliquerDegatsDeCombatSimultanes(duel, degatsAvantCombat);
  for (const attaquant of attaquants) {
    attaquant.attaquee = true;
    if (!duel[cote].creatures.some((entite) => entite.id === attaquant.id)) continue;
    const cibleRapideId = ciblesRapides[attaquant.id];
    if (cibleRapideId) {
      const cible = duel[adv].creatures.find((entite) => entite.id === cibleRapideId);
      resume.coupsRapides.push(cible
        ? {
          attaquantId: attaquant.id,
          attaquant: attaquant.name,
          cibleId: cible.id,
          cible: cible.name,
          degats: attaquant.atk,
        }
        : { attaquantId: attaquant.id, attaquant: attaquant.name, cibleId: cibleRapideId, cible: null, degats: 0, annule: true });
      continue;
    }

    const idsBloqueurs = blocagesApresCapacites[attaquant.id] ?? [];
    if (!idsBloqueurs.length) {
      if (!attaquantsDejaBloques.has(attaquant.id)) {
        coupsSorcier.push({ attaquantId: attaquant.id, amount: attaquant.atk });
      }
      continue;
    }

    const bloqueurs = idsBloqueurs.map((id) => bloqueursDisponibles.find((entite) => entite.id === id));
    const carteAttaquant = duelCardById(attaquant.carteId);
    const couleursAttaquant = cardColors(carteAttaquant);
    for (const bloqueur of bloqueurs) {
      const carteBloqueur = duelCardById(bloqueur.carteId);
      const couleursBloqueur = cardColors(carteBloqueur);

      enregistrerDegatsCombat(
        degatsCombat,
        adv,
        bloqueur.id,
        repartitionFinale[attaquant.id][bloqueur.id] ?? 0,
        couleursAttaquant,
        'attaque',
        cote,
        attaquant.id,
      );

      enregistrerDegatsCombat(
        degatsCombat,
        cote,
        attaquant.id,
        bloqueur.atk,
        couleursBloqueur,
        'attaque',
        adv,
        bloqueur.id,
      );
    }
    resume.paires.push([attaquant.name, ...bloqueurs.map((bloqueur) => bloqueur.name)]);
  }

  for (const coup of resume.coupsRapides) {
    if (coup.annule) continue;
    const attaquantExiste = duel[cote].creatures.some((entite) => entite.id === coup.attaquantId);
    const cibleExiste = duel[adv].creatures.some((entite) => entite.id === coup.cibleId);
    if (!attaquantExiste || !cibleExiste) {
      coup.annule = true;
      continue;
    }
    const attaquantRapide = duel[cote].creatures.find((entite) => entite.id === coup.attaquantId);
    const carteAttaquant = duelCardById(attaquantRapide.carteId);
    enregistrerDegatsCombat(
      degatsCombat,
      adv,
      coup.cibleId,
      coup.degats,
      cardColors(carteAttaquant),
      'attaque',
      cote,
      coup.attaquantId,
    );
  }

  for (const coup of coupsSorcier) {
    if (!duel[cote].creatures.some((entite) => entite.id === coup.attaquantId)) continue;
    resume.frappeSorcier += coup.amount;
    rpgInfligerSorcier(duel, adv, coup.amount);
  }

  // Les montants normaux restent simultanés, mais une source éliminée par
  // une capacité préalable ne peut plus infliger ses blessures de combat.
  const coupsNormaux = degatsCombat
    .filter((coup) => duel[coup.coteSource].creatures.some((entite) => entite.id === coup.sourceId))
    .map(({ coteSource, sourceId, ...coup }) => coup);
  appliquerDegatsDeCombatSimultanes(duel, coupsNormaux);
  for (const coup of resume.coupsRapides) {
    duel.log.push(coup.annule
      ? `${coup.attaquant} ne trouve plus sa cible : son Coup rapide est annulé.`
      : `${coup.attaquant} inflige ${coup.degats} dégâts à ${coup.cible} avec Coup rapide.`);
  }
  duel.log.push(resume.paires.length || resume.coupsRapides.length
    ? `Combat : ${attaquants.length} attaquant(s), ${resume.paires.length} bloqué(s), ${resume.frappeSorcier} dégâts directs.`
    : `${attaquants.length} créature(s) frappent le sorcier (${resume.frappeSorcier}).`);
  rpgActionsEtat(duel);
  return { ok: true, resume };
}

/** Résolution d'une attaque qui n'a pas été bloquée par une créature. */
export function rpgAttaquerSorcier(duel, cote, entiteId, cibleCreatureId = null) {
  const attaquant = duel[cote].creatures.find((e) => e.id === entiteId);
  if (!attaquant) return { ok: false, raison: 'absente' };
  if (!pret(attaquant)) return { ok: false, raison: 'pas-pret' };
  const carte = duelCardById(attaquant.carteId);
  if (carte?.coupRapide) {
    const ciblesLegales = duel[autre(cote)].creatures
      .filter((entite) => !rpgEstProtegee(entite, cardColors(carte)));
    if (ciblesLegales.length && !cibleCreatureId) return { ok: false, raison: 'cible' };
    if (cibleCreatureId) {
      const cible = duel[autre(cote)].creatures.find((entite) => entite.id === cibleCreatureId);
      if (!cible) return { ok: false, raison: 'cible' };
      if (rpgEstProtegee(cible, cardColors(carte))) return { ok: false, raison: 'protection' };
      return rpgLancerAttaque(duel, cote, [entiteId], { [entiteId]: [] }, null, [], { [entiteId]: cibleCreatureId });
    }
  } else if (cibleCreatureId) {
    return { ok: false, raison: 'cible' };
  }
  attaquant.attaquee = true;
  rpgInfligerSorcier(duel, autre(cote), attaquant.atk);
  duel.log.push(`${attaquant.name} frappe le sorcier ${autre(cote) === 'joueur' ? 'joueur' : 'ennemi'} (${attaquant.atk}).`);
  rpgActionsEtat(duel);
  return { ok: true };
}

/** Fait avancer d’un tour les cartes promises à revenir et les remet en jeu. */
function resoudreRetoursProgrammes(duel) {
  for (const cote of ['joueur', 'sorcier']) {
    const camp = duel[cote];
    const retours = camp.retoursProgrammes ?? [];
    camp.retoursProgrammes = [];
    for (const retour of retours) {
      const toursRestants = Math.max(0, Math.floor(Number(retour.toursRestants) || 0) - 1);
      if (toursRestants > 0) {
        camp.retoursProgrammes.push({ ...retour, toursRestants });
        continue;
      }

      const carte = duelCardById(retour.carteId);
      const indexCimetiere = camp.cimetiere.lastIndexOf(retour.carteId);
      if (!carte || indexCimetiere < 0) continue;
      camp.cimetiere.splice(indexCimetiere, 1);
      const entite = creerEntiteCreature(carte);
      camp.creatures.push(entite);
      duel.log.push(`${carte.name} renaît et revient en jeu.`);
      if (carte.arrivee) {
        const cibleArrivee = rpgCibleAuto(duel, cote, carte);
        appliquer(duel, cote, carte.arrivee, cibleArrivee, entite.id, cardColors(carte));
      }
    }
  }
  majResonance(duel);
}

/** Fin du tour : l'autre camp commence — revenu de sable, pioche 1,
 *  ses créatures deviennent prêtes (le mal d'invocation tombe). */
export function rpgFinDeTour(duel) {
  duel.fenetreReponse = false;
  duel.annonce = null;
  for (const cote of ['joueur', 'sorcier']) {
    for (const entite of duel[cote].creatures) {
      if (!(entite.protection?.toursRestants > 0)) continue;
      entite.protection.toursRestants -= 1;
      if (entite.protection.toursRestants <= 0) {
        const couleur = ELEMENT_LABELS[entite.protection.contre] ?? entite.protection.contre;
        entite.protection = null;
        duel.log.push(`${entite.name} perd sa protection contre ${couleur}.`);
      }
    }
  }
  duel.tour = autre(duel.tour);
  const camp = duel[duel.tour];
  camp.mana = manaVide();           // le mana non dépensé s'évapore
  camp.terrainPose = false;         // un nouveau terrain peut être posé
  for (const terrain of camp.terrains) terrain.tapped = false; // on dégage
  rpgPiocher(duel, duel.tour);
  for (const entite of camp.creatures) {
    entite.ready = true;
    entite.attaquee = false;
  }
  resoudreRetoursProgrammes(duel);
  rpgActionsEtat(duel);
  duel.log.push(`— Au tour du ${duel.tour === 'joueur' ? 'joueur' : 'sorcier'}.`);
  return duel;
}

/** L'IA joue sa phase principale : terrain, créatures et sorts dans l'ordre
 *  le plus utile (kill avant développement, renforts quand le plateau est
 *  garni, burn pour conclure), puis prépare ses attaques. */
/** Phase de préparation du sorcier : il pose son terrain et engage ses terrains. */
export function rpgSorcierPrepareTerrain(duel) {
  const terrainEnMain = choisirTerrainIA(duel, 'sorcier');
  if (terrainEnMain) rpgPoserTerrain(duel, 'sorcier', terrainEnMain);
  for (const terrain of duel.sorcier.terrains) {
    if (terrain.tapped) continue;
    rpgEngagerTerrain(duel, 'sorcier', terrain.id, couleurEngagement(terrain, duel.sorcier.main));
  }
}

/** Le sorcier choisit sa prochaine carte et l'ANNONCE sans la payer ni la résoudre.
 *  Ouvre la fenêtre de réponse : le joueur peut répondre avec un éphémère, ou laisser passer.
 *  Retourne null quand le sorcier n'a plus rien à jouer. */
export function rpgSorcierAnnonceSuivante(duel, rng = Math.random) {
  if (duel.annonce) return duel.annonce;
  const coup = choisirCarteIA(duel, 'sorcier', { ia: duel.sorcier.ia, rng });
  if (!coup) return null;
  duel.annonce = { cote: 'sorcier', carteId: coup.carteId, cibleId: coup.cibleId ?? null };
  duel.fenetreReponse = true;
  duel.log.push(`Le sorcier annonce ${duelCardById(coup.carteId)?.name ?? magieById(coup.carteId)?.name ?? coup.carteId}.`);
  return duel.annonce;
}

/** Laisser passer : résout la carte annoncée (paiement et effet). */
export function rpgSorcierResoudreAnnonce(duel) {
  const annonce = duel.annonce;
  if (!annonce) return { ok: false, raison: 'aucune-annonce' };
  duel.annonce = null;
  duel.fenetreReponse = false;
  const res = duelCardById(annonce.carteId)
    ? rpgJouerCreature(duel, 'sorcier', annonce.carteId, annonce.cibleId)
    : rpgLancerMagie(duel, 'sorcier', annonce.carteId, annonce.cibleId);
  rpgActionsEtat(duel);
  return { ...res, carteId: annonce.carteId };
}

export function rpgTourSorcierPreparationIA(duel, rng = Math.random) {
  const joue = [];
  rpgSorcierPrepareTerrain(duel);
  // Sans interface, chaque carte annoncée est résolue aussitôt (pas de réponse du joueur).
  let garde = 12;
  while (garde-- > 0) {
    if (!rpgSorcierAnnonceSuivante(duel, rng)) break;
    const res = rpgSorcierResoudreAnnonce(duel);
    if (!res.ok) break;
    if (res.entite) joue.push(res.entite);
  }
  return joue;
}

/** Tour complet de l'IA, conservé pour les scénarios sans interface. */
export function rpgTourSorcierIA(duel, rng = Math.random) {
  const joue = rpgTourSorcierPreparationIA(duel, rng);
  const attaquants = rpgChoisirAttaquants(duel, 'sorcier', { ia: duel.sorcier.ia, rng });
  if (attaquants.length) {
    const ciblesAttaque = rpgCiblesAttaqueRapide(duel, 'sorcier', attaquants, { ia: duel.sorcier.ia, rng });
    rpgLancerAttaque(duel, 'sorcier', attaquants, null, null, null, ciblesAttaque);
  }
  return joue;
}

/** Qui a gagné ? null tant que les deux sorciers tiennent debout. */
export function rpgVainqueur(duel) {
  const joueur = duel.joueur.pv <= 0;
  const sorcier = duel.sorcier.pv <= 0;
  if (joueur && sorcier) return 'egalite';
  if (sorcier) return 'joueur';
  if (joueur) return 'sorcier';
  return null;
}
