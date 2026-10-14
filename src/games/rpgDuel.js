/**
 * Le duel de sorciers — moteur « façon Magic » des règles v3.
 *
 * Règles : la partie commence avec une main de 5 cartes et une table vide.
 * Les terrains produisent du mana coloré, les créatures ont le mal
 * d'invocation, les attaquants sont déclarés avant le combat et le défenseur
 * choisit ses bloqueurs. Les magies rapides ouvrent une fenêtre de réponse.
 */

import {
  RPG_ELEMENTS,
  armeById,
  cardById,
  cardColorCost,
  cardColors,
  cardResonanceGroup,
  cardReceivesResonance,
  duelCardById,
  jetonById,
  magieById,
  terrainById,
  terrainManaColors,
} from './rpgCards.js';
import {
  choisirActivationIA,
  choisirAttaquantsIA,
  choisirBloqueursIA,
  choisirCarteIA,
  choisirCibleAutoIA,
  choisirCiblesRapidesIA,
  choisirDefausseIA,
  choisirMulliganIA,
  choisirTerrainIA,
  couleurEngagement,
} from './rpgAI.js';

/* Tout le monde part à 25 PV : le joueur comme chaque sorcier adverse. La
 * puissance d'un étage du mode Histoire ne gonfle plus les PV (bonus à 0) —
 * elle reste affichée sur la fiche d'étage comme indice de difficulté, la
 * vraie difficulté venant du deck et du profil d'IA du sorcier. */
export const RPG_PV_JOUEUR = 25;
export const RPG_PV_SORCIER_BASE = 25;
export const RPG_PV_SORCIER_PAR_PUISSANCE = 0;
export const RPG_MAIN_DEPART = 5;
export const RPG_COULEURS = RPG_ELEMENTS;

/**
 * Les six phases d'un tour, dans l'ordre. Le moteur les enregistre dans
 * `duel.phase` ; elles ne verrouillent aucune action (c'est la règle de
 * chaque fonction qui décide), elles disent où l'on en est.
 *
 *  1. `debut`       — début de tour : on dégage, on PIOCHE, les échos tombent ;
 *  2. `principale`  — terrain (un par tour), créatures, magies ;
 *  3. `attaque`     — le joueur actif déclare TOUS ses attaquants ;
 *  4. `blocage`     — le défenseur désigne ses bloqueurs ; les deux camps
 *                     peuvent jouer des magies rapides avant les blessures ;
 *  5. `principale2` — après le combat : mêmes gestes qu'en première principale
 *                     (le terrain du tour reste unique) ; les créatures qui ont
 *                     attaqué restent engagées ;
 *  6. `fin`         — « Fin du tour » : l'adversaire peut jouer UNE magie rapide,
 *                     puis les effets « jusqu'à la fin du tour » prennent fin.
 */
export const RPG_PHASES = ['debut', 'principale', 'attaque', 'blocage', 'principale2', 'fin'];
export const RPG_PHASES_LIBELLES = {
  debut: 'Début de tour',
  principale: 'Phase principale',
  attaque: 'Phase d’attaque',
  blocage: 'Phase de blocage',
  principale2: 'Deuxième phase principale',
  fin: 'Fin de tour',
};

const destructionsParDuel = new WeakMap();
// Hors de l’état JSON : les sauvegardes restent sérialisables et les tests
// peuvent fournir un générateur déterministe. Une partie restaurée utilise Math.random.
const hasardParDuel = new WeakMap();
const GROUPES_RESONANCE = [...RPG_ELEMENTS, 'samourai'];

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

/** PV d'un sorcier adverse : 25, quelle que soit sa puissance d'étage. */
export const rpgSorcierPv = (puissance = 0) =>
  RPG_PV_SORCIER_BASE + RPG_PV_SORCIER_PAR_PUISSANCE * Math.max(0, puissance);

/** Mélange de Fisher-Yates ; le même tirage sert à l'ouverture et au mulligan. */
function melangerDeck(deck, rng = Math.random) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/**
 * Nouveau duel : tables vides, 0 sable, puis chaque camp pioche 5 cartes.
 * `decks` : listes d'identifiants de cartes (créatures pour l'instant).
 * `sorcierIA` : profil de l'IA ({ niveau, style }) — voir rpgAI.js. Chaque
 * sorcier du mode Histoire peut porter le sien.
 */
export function rpgNouveauDuel({ joueurDeck = [], sorcierDeck = [], sorcierPuissance = 0, sorcierIA = null, rng = Math.random } = {}) {
  const duel = {
    tour: 'joueur',
    joueur: { pv: RPG_PV_JOUEUR, pvMax: RPG_PV_JOUEUR, mana: manaVide(), bouclier: 0, terrainPose: false, deck: melangerDeck(joueurDeck, rng), main: [], creatures: [], terrains: [], cimetiere: [], retoursProgrammes: [], bonusTemporaires: [], degatsEchos: [] },
    sorcier: {
      pv: rpgSorcierPv(sorcierPuissance),
      pvMax: rpgSorcierPv(sorcierPuissance),
      puissance: sorcierPuissance,
      ia: sorcierIA,
      mana: manaVide(),
      bouclier: 0,
      terrainPose: false,
      deck: melangerDeck(sorcierDeck, rng),
      main: [],
      creatures: [],
      terrains: [],
      cimetiere: [],
      retoursProgrammes: [],
      bonusTemporaires: [],
      degatsEchos: [],
    },
    fenetreReponse: false,
    // Phase du tour en cours (voir RPG_PHASES) et fenêtre de « fin de tour » :
    // { cote } = le camp dont le tour se termine ; l'AUTRE camp peut y jouer
    // une magie rapide avant que le tour ne se ferme pour de bon.
    phase: 'principale',
    finDeTour: null,
    // Carte annoncée par le sorcier, pas encore résolue : le joueur peut répondre ou laisser passer.
    annonce: null,
    // Défausse en attente (ex. Jörmungandr côté joueur) : { cote, restant, sourceCarteId }
    defausseEnAttente: null,
    // Mulligan : chaque camp a droit à UN échange, avant le premier tour.
    mulliganFait: { joueur: false, sorcier: false },
    log: [],
  };
  hasardParDuel.set(duel, rng);
  for (let i = 0; i < RPG_MAIN_DEPART; i += 1) {
    rpgPiocher(duel, 'joueur');
    rpgPiocher(duel, 'sorcier');
  }
  // Témoin de la main de départ : le mulligan n'est légal que tant qu'elle est
  // intacte (et il la conserve, puisque l'on pioche autant qu'on écarte).
  duel.mainDepart = { joueur: duel.joueur.main.length, sorcier: duel.sorcier.main.length };
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

/**
 * Défausse une carte de la main vers le cimetière (suite à un effet
 * `pioche-defausse` comme Jörmungandr). Accepte un indice dans `main` ou un
 * identifiant de carte ; à défaut, choisit la carte la moins utile.
 */
export function rpgDefausserCarte(duel, cote = 'joueur', indexOuCarteId = null) {
  const camp = duel?.[cote];
  if (!camp || !camp.main.length) {
    if (duel?.defausseEnAttente?.cote === cote) duel.defausseEnAttente = null;
    return { ok: false, raison: 'main-vide' };
  }
  let index = -1;
  if (typeof indexOuCarteId === 'number' && Number.isInteger(indexOuCarteId)) {
    if (indexOuCarteId >= 0 && indexOuCarteId < camp.main.length) index = indexOuCarteId;
    else return { ok: false, raison: 'hors-main' };
  } else if (typeof indexOuCarteId === 'string') {
    index = camp.main.indexOf(indexOuCarteId);
    if (index < 0) return { ok: false, raison: 'pas-en-main' };
  } else {
    index = choisirDefausseIA(duel, cote);
  }
  if (index < 0 || index >= camp.main.length) return { ok: false, raison: 'hors-main' };
  const [carteId] = camp.main.splice(index, 1);
  camp.cimetiere.push(carteId);
  const nom = cardById(carteId)?.name ?? carteId;
  duel.log.push(`${cote === 'joueur' ? 'Vous défaussez' : 'Le sorcier défausse'} ${nom}.`);
  if (duel.defausseEnAttente?.cote === cote) {
    duel.defausseEnAttente.restant = Math.max(0, (duel.defausseEnAttente.restant ?? 1) - 1);
    if (duel.defausseEnAttente.restant <= 0 || !camp.main.length) {
      duel.defausseEnAttente = null;
    }
  }
  return { ok: true, carteId };
}

/** Le mulligan est ouvert tant que la partie n'a pas commencé : table vide et
 *  main encore égale à celle du départ. Un seul échange par camp. */
export function rpgPeutMulligan(duel, cote = 'joueur') {
  if (!duel || duel.mulliganFait?.[cote]) return false;
  if (duel.tour !== 'joueur' || duel.annonce) return false;
  if (!duel[cote].main.length) return false;
  if (duel[cote].main.length !== (duel.mainDepart?.[cote] ?? 0)) return false;
  return ['joueur', 'sorcier'].every((camp) => !duel[camp].creatures.length
    && !duel[camp].terrains.length
    && !duel[camp].terrainPose
    && !duel[camp].cimetiere.length);
}

/**
 * Échange de la main de départ : les cartes désignées (indices dans `main`)
 * repartent dans le paquet, qui est battu, puis le camp pioche autant de
 * cartes qu'il en a écartées — jamais plus qu'il n'en reste.
 * Aucun camp n'est pénalisé en nombre de cartes : c'est un choix, pas un prix.
 */
export function rpgMulligan(duel, cote, index = [], rng = Math.random) {
  const camp = duel[cote];
  if (!camp || !rpgPeutMulligan(duel, cote)) return { ok: false, ecartees: [], piochees: [] };
  // Un index, jamais un nom : dans une main de cinq exemplaires identiques,
  // « changer un Désert » ne veut rien dire — « changer celui de la case 2 » oui.
  const versIndex = (valeur) => (typeof valeur === 'number' || typeof valeur === 'string' ? Number(valeur) : Number.NaN);
  const valides = [...new Set(index.map(versIndex)
    .filter((valeur) => Number.isInteger(valeur) && valeur >= 0 && valeur < camp.main.length))]
    .sort((a, b) => a - b);
  // Rien de choisi, rien de désigné : « je garde » ne déplace ni main ni paquet,
  // et ne perturbe aucun tirage — le droit est simplement consommé.
  if (!valides.length) {
    duel.mulliganFait[cote] = true;
    duel.log.push(cote === 'joueur' ? 'Vous gardez votre main de départ.' : 'Le sorcier garde sa main de départ.');
    return { ok: true, ecartees: [], piochees: [] };
  }
  const ecartees = valides.map((valeur) => camp.main[valeur]);
  // Retirer du plus grand vers le plus petit : les indices restants restent justes.
  for (let i = valides.length - 1; i >= 0; i -= 1) camp.main.splice(valides[i], 1);
  camp.deck = melangerDeck([...camp.deck, ...ecartees], rng);
  const piochees = [];
  for (let i = 0; i < ecartees.length; i += 1) {
    const carte = rpgPiocher(duel, cote);
    if (!carte) break;
    piochees.push(carte);
  }
  duel.mulliganFait[cote] = true;
  const nom = (carteId) => cardById(carteId)?.name ?? carteId;
  const fois = `${piochees.length} carte${piochees.length > 1 ? 's' : ''}`;
  duel.log.push(ecartees.length
    ? (cote === 'joueur'
      ? `Vous écartez ${ecartees.map(nom).join(', ')} et piochez ${fois}.`
      : `Le sorcier écarte ${ecartees.map(nom).join(', ')} et pioche ${fois}.`)
    : (cote === 'joueur' ? 'Vous gardez votre main de départ.' : 'Le sorcier garde sa main de départ.'));
  return { ok: true, ecartees, piochees };
}

/** Le sorcier mulligane au même moment, avec sa propre lecture de la main. */
export function rpgMulliganSorcier(duel, rng = Math.random) {
  return rpgMulligan(duel, 'sorcier', choisirMulliganIA(duel, 'sorcier'), rng);
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

/** Coût d'un effet activé sous la forme d'une « pseudo-carte » que `payer`
 *  sait acquitter : tout le mana demandé doit venir de la couleur dédiée. */
function coutActivation(activation) {
  const cout = Math.max(0, Math.floor(Number(activation?.cout) || 0));
  const couleur = activation?.couleur;
  return {
    cost: cout,
    colorCost: couleur && RPG_COULEURS.includes(couleur) ? { [couleur]: cout } : {},
    element: couleur ?? null,
  };
}

/** La capacité activée d'une créature en jeu (le Père des corbeaux) : elle
 *  s'active à son tour, tant qu'on peut en payer le mana de glace. */
export function rpgPeutActiverCapacite(duel, cote, entiteId) {
  const entite = duel[cote].creatures.find((candidate) => candidate.id === entiteId);
  const activation = entite ? duelCardById(entite.carteId)?.activation : null;
  if (!activation || duel.tour !== cote) return false;
  return rpgPeutPayer(duel[cote], coutActivation(activation));
}

/** Active la capacité : le mana part d'abord — même si Boualem la contre —
 *  puis elle inflige ses blessures à la créature choisie, alliée ou adverse
 *  (« une créature au choix »). Les blessures ne sont ni une attaque ni une
 *  magie : Esquive n'y fait rien. */
export function rpgActiverCapacite(duel, cote, entiteId, cibleId) {
  const camp = duel[cote];
  const entite = camp.creatures.find((candidate) => candidate.id === entiteId);
  const activation = entite ? duelCardById(entite.carteId)?.activation : null;
  if (!entite || !activation) return { ok: false, raison: 'capacite' };
  if (duel.tour !== cote) return { ok: false, raison: 'tour' };
  const cibleCamp = ['joueur', 'sorcier'].find((possedant) => duel[possedant].creatures
    .some((candidate) => candidate.id === cibleId)) ?? null;
  const cible = cibleCamp
    ? duel[cibleCamp].creatures.find((candidate) => candidate.id === cibleId)
    : null;
  if (!cible) return { ok: false, raison: 'cible' };
  const carte = duelCardById(entite.carteId);
  const couleur = activation.couleur ?? carte.element;
  if (rpgEstProtegee(cible, couleur)) return { ok: false, raison: 'protection' };
  const cout = coutActivation(activation);
  if (!rpgPeutPayer(camp, cout)) return { ok: false, raison: 'mana' };
  payer(duel, cote, cout);
  // Boualem ne contre que l'effet qui le **cible vraiment** — la foudre l'a
  // bien pris pour cible : elle se paie, puis se dénoue.
  if (cible.carteId === 'boualem' && cible.boualemContresortDisponible) {
    cible.boualemContresortDisponible = false;
    duel.log.push('Boualem contre l’effet adverse qui le ciblait.');
    rpgActionsEtat(duel);
    return { ok: true, contre: true };
  }
  const montant = Math.max(0, Number(activation.effet?.amount) || 0);
  if ((activation.effet?.type ?? 'degats') === 'degats') {
    rpgBlesserCreature(duel, cibleCamp, cible.id, montant, couleur, null, 'capacite');
  }
  duel.log.push(`${entite.name} inflige ${montant} blessures à ${cible.name}.`);
  rpgActionsEtat(duel);
  return { ok: true, cibleId: cible.id };
}

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

/**
 * Amani — l'égide de la Gardienne des ksour : tant qu'Amani est en jeu, les
 * **autres** créatures de son camp gagnent +0/+2. Même contrat que l'aura
 * Sable : chaque entité ne garde que l'écart appliqué (`auraAmaniBonus`), pour
 * qu'une créature qui entre ou qui meurt ne fasse pas dériver les statistiques
 * déjà cumulées par la Furie ou d'autres renforts. L'égide compte **par source** :
 * chaque Amani protège toutes les créatures sauf elle-même, donc une seconde
 * Amani double le bonus des autres et protège la première. L'égide ne franchit
 * jamais la ligne du camp adverse. La perdre ne tue jamais : au pire, 1 PV
 * (la règle de la Résonance).
 */
function appliquerAuraAmani(duel, cote) {
  const camp = duel[cote];
  const nombreAmani = camp.creatures.filter((entite) => entite.carteId === 'amani-des-ksour').length;
  for (const entite of camp.creatures) {
    const sources = entite.carteId === 'amani-des-ksour'
      ? nombreAmani - 1
      : nombreAmani;
    const prochainBonus = 2 * Math.max(0, sources);
    const delta = prochainBonus - (entite.auraAmaniBonus ?? 0);
    if (!delta) continue;
    entite.auraAmaniBonus = prochainBonus;
    entite.def = Math.max(1, entite.def + delta);
    entite.pvMax = Math.max(1, (entite.pvMax ?? entite.def) + delta);
    entite.pv = Math.max(1, entite.pv + delta);
  }
}

/**
 * Rafraîchit toutes les auras de présence après un changement du champ de
 * bataille (arrivée, mort, renvoi, retour programmé) : l'aura Sable de Tarek
 * et l'égide d'Amani sur chaque camp, puis la Résonance de table. Chaque
 * mécanisme ne pose que l'écart qu'il détient déjà — voir les commentaires de
 * `appliquerAuraSable`, `appliquerAuraAmani` et `majResonance`.
 */
function rafraichirAuras(duel) {
  appliquerAuraSable(duel, 'joueur');
  appliquerAuraSable(duel, 'sorcier');
  appliquerAuraAmani(duel, 'joueur');
  appliquerAuraAmani(duel, 'sorcier');
  majResonance(duel);
}

/** Protection temporaire contre les effets et les créatures d'une couleur
 *  donnée — plus l'immunité permanente que l'arme portée peut conférer
 *  (`donne.immunite`, l'Armure de cendres contre la Braise) : même porte
 *  d'entrée pour tous les dégâts, ciblages et blocages du moteur. */
export function rpgEstProtegee(entite, element) {
  const couleursSources = normaliserCouleurs(element);
  if (!entite || !couleursSources.length) return false;
  if (entite.protection?.toursRestants > 0
    && couleursSources.includes(entite.protection.contre)) return true;
  const immunite = armeCarteDe(entite)?.donne?.immunite;
  return Boolean(immunite && couleursSources.includes(immunite));
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
    // Créature-jeton : créée par un effet, sans carte en main ni coût payé.
    // Elle se bat comme les autres, mais ne retourne jamais dans une main.
    jeton: Boolean(carte.jeton),
    name: carte.name,
    atk: carte.atk,
    def: carte.def,
    pv: carte.def,
    pvMax: carte.def,
    bouclier: 0,
    bouclierLumiere: false,
    auraSableBonus: 0,
    auraAmaniBonus: 0,
    boualemContresortDisponible: carte.id === 'boualem',
    esquive: Math.max(0, carte.esquive ?? 0),
    rapidite: Boolean(carte.rapidite),
    coupRapide: Boolean(carte.coupRapide),
    envol: Boolean(carte.envol),
    infiltration: Boolean(carte.infiltration),
    tenaciteDisponible: Boolean(carte.tenacite),
    protection: carte.protection ? {
      contre: carte.protection.contre,
      toursRestants: carte.protection.tours ?? 2,
    } : null,
    ready: Boolean(carte.rapidite),
    attaquee: false,
    resonance: 0,
    honneur: Math.max(0, Number(carte.honneur) || 0),
    // Gel (la Poigne de givre, le Verglas) : tours du contrôleur qui restent
    // à couvrir — la créature ni n'attaque ni ne bloque tant que c'est > 0.
    gelToursRestants: 0,
    // Blocage forcé (l'Appât de la meute, l'Embuscade) : la créature marquée
    // doit bloquer si elle le peut. `par` : le camp du lanceur (seule SA
    // prochaine attaque la concerne) ; `portee` : 'attaque' (le marqueur vit
    // jusqu'à la prochaine attaque du lanceur) ou 'tour' (il meurt avec le
    // tour en cours).
    blocageForce: null,
    // L'arme attachée (`{ carteId }`), ou null : une seule par créature.
    // Bonus et mot-clé sont déjà fondus dans les champs ci-dessus (atk, def,
    // pv, esquive, envol…) ; la fiche se relit par `armeById` quand il faut
    // les retirer (remplacement) ou faire tomber l'arme au cimetière.
    arme: null,
  };
}

/** La fiche de l'arme portée par une entité, ou null. */
function armeCarteDe(entite) {
  return entite?.arme ? armeById(entite.arme.carteId) : null;
}

/**
 * Attache une arme à une créature : le bonus et le mot-clé donné se fondent
 * dans ses champs, comme une aura permanente mais personnelle. Le +défense
 * grandit PV max et PV présents du même montant (la créature se tient mieux
 * debout) ; les retirer ne tuera jamais (plancher 1, comme la Résonance).
 * Une seule arme par créature : attacher la nouvelle envoie l'ancienne au
 * cimetière du même camp.
 */
function attacherArme(duel, cote, entite, carteArme) {
  if (entite.arme) retirerArme(duel, cote, entite);
  entite.arme = { carteId: carteArme.id };
  entite.atk += carteArme.bonus?.atk ?? 0;
  entite.pvMax = (entite.pvMax ?? entite.def) + (carteArme.bonus?.def ?? 0);
  entite.def += carteArme.bonus?.def ?? 0;
  entite.pv += carteArme.bonus?.def ?? 0;
  if (carteArme.donne?.esquive) entite.esquive = (entite.esquive ?? 0) + carteArme.donne.esquive;
  if (carteArme.donne?.envol) entite.envol = true;
  if (carteArme.donne?.infiltration) entite.infiltration = true;
  if (carteArme.donne?.rapidite) {
    entite.rapidite = true;
    entite.ready = true;
  }
}

/** Retire l'arme d'une créature encore en jeu (remplacement) : bonus et
 *  mot-clé repartent, l'arme rejoint le cimetière de son camp. */
function retirerArme(duel, cote, entite) {
  const carteArme = armeCarteDe(entite);
  entite.arme = null;
  if (!carteArme) return;
  entite.atk = Math.max(0, entite.atk - (carteArme.bonus?.atk ?? 0));
  entite.pvMax = Math.max(1, (entite.pvMax ?? entite.def) - (carteArme.bonus?.def ?? 0));
  entite.def = Math.max(1, entite.def - (carteArme.bonus?.def ?? 0));
  entite.pv = Math.max(1, Math.min(entite.pv, entite.pvMax));
  if (carteArme.donne?.esquive) entite.esquive = Math.max(0, (entite.esquive ?? 0) - carteArme.donne.esquive);
  if (carteArme.donne?.envol) entite.envol = Boolean(duelCardById(entite.carteId)?.envol);
  if (carteArme.donne?.infiltration) entite.infiltration = Boolean(duelCardById(entite.carteId)?.infiltration)
    || Boolean(entite.infiltrationTour);
  if (carteArme.donne?.rapidite) entite.rapidite = Boolean(duelCardById(entite.carteId)?.rapidite);
  duel[cote].cimetiere.push(carteArme.id);
  duel.log.push(`${entite.name} se sépare de ${carteArme.name} : l’arme rejoint le cimetière.`);
}

/**
 * Le porteur quitte la table (destruction, renvoi en main…) : son arme tombe
 * avec lui, au cimetière — jamais en main, jamais au sol. C'est le prix de
 * l'investissement, et ce qui rend le renvoi et la destruction d'une grosse
 * créature armée vraiment rentables.
 */
function armeAuCimetiere(duel, cote, entite) {
  const carteArme = armeCarteDe(entite);
  if (!carteArme) return;
  entite.arme = null;
  duel[cote].cimetiere.push(carteArme.id);
  duel.log.push(`${carteArme.name}, l’arme de ${entite.name}, rejoint le cimetière.`);
}

/**
 * Furie — capacité des vikings : une créature **blessée qui survit** gagne
 * +X/+X (X = la furie imprimée sur la carte) — une seule fois. La première
 * blessure survivée l'enflamme ; les suivantes ne la grandissent plus. Les
 * blessures d'un même échange ne font donc jamais double effet, et une
 * attaque entièrement absorbée par un bouclier n'est pas une blessure : la
 * furie attend le premier sang. Renvoyée en main puis rejouée, la carte
 * revient avec sa Furie neuve : la flambée appartient à la présence en jeu.
 */
function appliquerFurie(duel, entite, degatsRecus) {
  const furie = Math.max(0, Number(duelCardById(entite.carteId)?.furie) || 0)
    + Math.max(0, Number(armeCarteDe(entite)?.donne?.furie) || 0);
  if (!furie || degatsRecus <= 0 || entite.furieDeclenchee) return;
  entite.furieDeclenchee = true;
  entite.atk += furie;
  entite.pvMax = (entite.pvMax ?? entite.def) + furie;
  entite.def += furie;
  entite.pv += furie;
  duel.log.push(`${entite.name} entre en furie : +${furie}/+${furie}.`);
}

/** Total des sources d'un groupe de Résonance (élément ou tribu), dans les
 * deux camps. Le défaut Neige conserve l'API des valkyries. */
export function rpgResonanceEnJeu(duel, element = 'neige') {
  let total = 0;
  for (const cote of ['joueur', 'sorcier']) {
    for (const entite of duel[cote].creatures) {
      if (!(entite.pv > 0)) continue;
      const carte = duelCardById(entite.carteId);
      if (cardResonanceGroup(carte) !== element) continue;
      total += Math.max(0, Number(carte?.resonance) || 0);
    }
  }
  return total;
}

/** Bonus total reçu par une carte : même filtrage en jeu et dans l'IA. */
export function rpgBonusResonance(duel, carte) {
  return GROUPES_RESONANCE.reduce((total, groupe) => total +
    (cardReceivesResonance(carte, groupe) ? rpgResonanceEnJeu(duel, groupe) : 0), 0);
}

/** Aura de table par élément ou tribu. La Résonance samouraï ne renforce que
 * le type Samouraï, quelle que soit sa couleur ; ni le Tengu ni Kagutsuchi ne
 * se renforcent eux-mêmes. Les sources se cumulent dans les deux camps.
 * La perte du bonus laisse au minimum 1 PV, comme en Neige. */
function majResonance(duel) {
  const totaux = Object.fromEntries(GROUPES_RESONANCE.map((element) => [element, rpgResonanceEnJeu(duel, element)]));
  const renforcees = new Set();
  const affaiblies = new Set();
  for (const cote of ['joueur', 'sorcier']) {
    for (const entite of duel[cote].creatures) {
      if (!(entite.pv > 0)) continue;
      const groupes = GROUPES_RESONANCE.filter((groupe) => cardReceivesResonance(duelCardById(entite.carteId), groupe));
      const voulu = groupes.reduce((total, groupe) => total + (totaux[groupe] ?? 0), 0);
      const actuel = Math.max(0, Number(entite.resonance) || 0);
      const precedents = entite.resonanceParGroupe ?? {};
      entite.resonanceParGroupe = Object.fromEntries(groupes.map((groupe) => [groupe, totaux[groupe] ?? 0]));
      if (voulu === actuel) continue;
      const delta = voulu - actuel;
      entite.resonance = voulu;
      entite.atk = Math.max(0, entite.atk + delta);
      entite.pvMax = Math.max(1, (entite.pvMax ?? entite.def) + delta);
      entite.def = Math.max(1, entite.def + delta);
      entite.pv = Math.max(1, entite.pv + delta);
      for (const element of groupes) {
        const ancien = precedents[element] ?? 0;
        const prochain = totaux[element] ?? 0;
        if (prochain > ancien) renforcees.add(element);
        else if (prochain < ancien) affaiblies.add(element);
      }
    }
  }
  for (const element of renforcees) {
    if (element === 'samourai') {
      duel.log.push(`La Résonance samouraï renforce les Samouraïs : +${totaux[element]}/+${totaux[element]}.`);
      continue;
    }
    const label = ELEMENT_LABELS[element];
    duel.log.push(`La Résonance renforce la ${label} : +${totaux[element]}/+${totaux[element]} aux créatures ${label}.`);
  }
  for (const element of affaiblies) {
    if (!renforcees.has(element)) duel.log.push(element === 'samourai'
      ? 'La Résonance samouraï se tait : les Samouraïs perdent leur bonus.'
      : `La Résonance se tait : les créatures ${ELEMENT_LABELS[element]} perdent leur bonus.`);
  }
}

/** Honneur : une seule créature adverse vivante, choisie uniformément au
 * hasard. Protection et bouclier restent applicables ; ce sont des dégâts de
 * capacité, pas une attaque ni une magie. Sans créature adverse, aucun dégât. */
function declencherHonneur(duel, cote, entite) {
  const carte = duelCardById(entite.carteId);
  const honneur = Math.max(0, Number(carte?.honneur) || 0);
  if (!honneur) return;
  // La source morte ne maintient plus sa Résonance pendant sa dernière frappe.
  rafraichirAuras(duel);
  const adversaire = autre(cote);
  const cibles = duel[adversaire].creatures.filter((cible) => cible.pv > 0);
  if (!cibles.length) {
    duel.log.push(`Honneur ${honneur} : ${entite.name} ne trouve aucune créature adverse.`);
    return;
  }
  const rng = hasardParDuel.get(duel) ?? Math.random;
  const index = Math.min(cibles.length - 1, Math.max(0, Math.floor(rng() * cibles.length)));
  const cible = cibles[index];
  duel.log.push(`Honneur ${honneur} : ${entite.name} inflige ${honneur} dégâts à ${cible.name}, choisie au hasard.`);
  rpgBlesserCreature(duel, adversaire, cible.id, honneur, cardColors(carte), null, 'capacite');
}

/** Applique les blessures d’un effet de combat simultanément avant de résoudre
 *  les capacités de destruction des créatures. */
function appliquerDegatsDeCombatSimultanes(duel, coups) {
  const blessures = new Map();
  for (const coup of coups) {
    const entite = duel[coup.cote].creatures.find((candidate) => candidate.id === coup.entiteId);
    if (!entite || rpgEstProtegee(entite, coup.sourceElement)) continue;
    // Le Grand Voile blanc : les dégâts de combat s’égarent dans le blanc —
    // les dégâts de capacité et de magie, eux, traversent le voile.
    if (duel.brouillardCombat && coup.sourceType === 'attaque') continue;
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
  // La furie s'embrase après les blessures, une seule fois par présence : les
  // blessures d'un même échange ne font jamais double effet, et une créature
  // morte ne s'énerve pas.
  for (const { entite, recus } of furieuses) appliquerFurie(duel, entite, recus);

  // Retire d’abord toutes les victimes : une capacité de destruction ne peut
  // donc empêcher l’autre combattant d’infliger les dégâts déjà calculés.
  for (const mort of mortes) {
    const camp = duel[mort.cote];
    journaliserDestruction(duel, mort.entite, mort.sourceElements);
    armeAuCimetiere(duel, mort.cote, mort.entite);
    camp.creatures = camp.creatures.filter((candidate) => candidate.id !== mort.entite.id);
    camp.cimetiere.push(mort.entite.carteId);
    detacherArmes(duel, mort.cote, mort.entite);
    duel.log.push(`${mort.entite.name} est détruite et rejoint le cimetière.`);
  }
  for (const mort of mortes) {
    const carte = duelCardById(mort.entite.carteId);
    if (carte?.destruction) {
      appliquer(duel, mort.cote, carte.destruction, null, null, cardColors(carte), null, mort.entite.carteId);
    }
    declencherHonneur(duel, mort.cote, mort.entite);
  }
  rafraichirAuras(duel);
  rpgActionsEtat(duel);
}

/** Dégâts de capacité infligés à la créature que la carte combat, s’il y a lieu. */
function degatsCreatureCombattue(carte) {
  if (carte?.combat?.type !== 'degats-creature-combattue') return 0;
  return Math.max(0, Number(carte.combat.amount) || 0);
}

/** Prépare les dégâts des capacités « quand cette créature attaque ou bloque ».
 *  Ils se résolvent avant les blessures normales du combat. Le déclenché de
 *  l'arme portée (`declenche.sur === 'combat'`) frapperait par le même
 *  chemin, mais sous la couleur de l'arme, pas de la créature. */
function ajouterDegatsCapaciteAvantCombat(coups, coteSource, carteSource, cible, entiteSource = null) {
  if (!cible) return;
  const amount = degatsCreatureCombattue(carteSource);
  if (amount > 0) {
    coups.push({
      cote: autre(coteSource),
      entiteId: cible.id,
      amount,
      sourceElement: cardColors(carteSource),
      sourceType: 'capacite',
    });
  }
  const carteArme = armeCarteDe(entiteSource);
  const declenche = carteArme?.declenche;
  if (declenche?.sur === 'combat' && declenche.effet?.type === 'degats') {
    const degatsArme = Math.max(0, Number(declenche.effet.amount) || 0);
    if (degatsArme > 0) {
      coups.push({
        cote: autre(coteSource),
        entiteId: cible.id,
        amount: degatsArme,
        sourceElement: cardColors(carteArme),
        sourceType: 'capacite',
      });
    }
  }
}

/**
 * Seconde vague d’un sort déclaré avec `echo` (le Nuage de cendres) : les
 * dégâts immédiats sont déjà tombés, l’écho est inscrit chez la victime et
 * retombe **au début du prochain tour de son lanceur** (`resoudreEchos`),
 * quand l’autre camp a joué le sien. La promesse est écrite même si le nuage
 * ne couvre personne sur le moment : c’est le tour adverse qui décidera de ce
 * qu’il y aura à brûler — si la table est restée vide à son heure, l’écho se
 * dissipe et le journal le dit.
 */
function differerEcho(duel, cote, adv, effet, sourceElement, sourceType, sourceCarteId) {
  const echo = effet?.echo;
  if (!echo) return;
  const amount = Math.max(0, Number(echo.amount ?? effet.amount) || 0);
  if (amount <= 0) return;
  const cible = echo.cible ?? (effet.cible === 'sorcier' ? 'sorcier' : 'toutes-creatures');
  const promesses = (duel[adv].degatsEchos ??= []);
  promesses.push({
    amount,
    cible,
    // Nombre de tours du lanceur à attendre : chaque fois qu’il reprend la
    // main, la promesse perd un tour (voir `resoudreEchos`).
    toursRestants: Math.max(1, Math.floor(Number(echo.tours) || 1)),
    coteSource: cote,
    sourceElement,
    sourceType,
    carteId: sourceCarteId ?? null,
  });
  const nomSource = (duelCardById(sourceCarteId) ?? magieById(sourceCarteId))?.name ?? 'Le sort';
  duel.log.push(`${nomSource} diffère ${amount} dégâts : ils tomberont au début de ${cote === 'joueur' ? 'votre' : 'son'} prochain tour.`);
}

/** Fait retomber les échos dus au camp dont le tour commence : un tour de
 *  moins pour ses promesses, et les dégâts tombent sur le camp qui les a
 *  reçues en promesse. Un écho n’attend que son lanceur : il retombe après le
 *  tour adverse, quand l’autre camp a eu la main (voir `rpgFinDeTour`). */
function resoudreEchos(duel) {
  const lanceur = duel.tour;
  for (const cote of ['joueur', 'sorcier']) {
    const camp = duel[cote];
    const echos = camp.degatsEchos ?? [];
    if (!echos.length) continue;
    camp.degatsEchos = [];
    for (const echo of echos) {
      // L’autre camp vient de jouer son tour : la promesse attend celui de son
      // lanceur. Une promesse sans lanceur consigné (état ancien) retombe tout
      // de suite, comme avant.
      if (echo.coteSource && echo.coteSource !== lanceur) {
        camp.degatsEchos.push(echo);
        continue;
      }
      const toursRestants = Math.max(0, Math.floor(Number(echo.toursRestants) || 0) - 1);
      if (toursRestants > 0) {
        camp.degatsEchos.push({ ...echo, toursRestants });
        continue;
      }
      const nomSource = (duelCardById(echo.carteId) ?? magieById(echo.carteId))?.name ?? 'Le sort';
      if (echo.cible === 'sorcier') {
        rpgInfligerSorcier(duel, cote, echo.amount);
        duel.log.push(`L’écho de ${nomSource} retombe sur le sorcier (${echo.amount}).`);
        continue;
      }
      const cibles = [...camp.creatures];
      if (!cibles.length) {
        duel.log.push(`L’écho de ${nomSource} se dissipe : plus rien à brûler sur la table.`);
        continue;
      }
      duel.log.push(`L’écho de ${nomSource} retombe sur la table : ${echo.amount} dégâts.`);
      for (const cible of cibles) {
        rpgBlesserCreature(duel, cote, cible.id, echo.amount, echo.sourceElement, null, echo.sourceType);
      }
    }
  }
}

/** Efface les bonus « jusqu’à la fin du tour » **joués pendant le tour qui se
 *  termine** — `tourFerme` : le tour de celui qui a lancé le sort, pas celui du
 *  camp renforcé. Une magie rapide lancée en réponse meurt donc avec l’échange qui
 *  l’a vu partir, et une créature déjà sortie de table n’a rien à récupérer :
 *  son bonus est né et mort avec elle. Une créature réduite à 0 défense par le
 *  retrait du bonus tombe, comme à Magic quand le renfort s’évanouit. */
function annulerBonusTemporaires(duel, tourFerme) {
  for (const cote of ['joueur', 'sorcier']) {
    const camp = duel[cote];
    const carnet = camp.bonusTemporaires ?? [];
    if (!carnet.length) continue;
    const restants = [];
    const effaces = [];
    for (const entry of carnet) {
      if (entry.tour && entry.tour !== tourFerme) {
        restants.push(entry);
        continue;
      }
      const entite = camp.creatures.find((candidate) => candidate.id === entry.entiteId);
      if (!entite) continue;
      entite.atk = Math.max(0, entite.atk - (entry.atk ?? 0));
      entite.pvMax = Math.max(0, (entite.pvMax ?? 0) - (entry.def ?? 0));
      entite.pv = Math.max(0, entite.pv - (entry.def ?? 0));
      entite.def = Math.min(entite.def, Math.max(0, entite.pv));
      effaces.push(entite.name);
    }
    camp.bonusTemporaires = restants;
    if (!effaces.length) continue;
    duel.log.push(`Le renfort s’évapore (${effaces.join(', ')}).`);
    if (camp.creatures.some((entite) => !(entite.pv > 0))) rpgActionsEtat(duel);
  }
}

/** L'Infiltration accordée pour un tour (le ralliement de Tin Hinan) ne dure
 *  que le tour qui l'a vue naître : à la fin du tour, chaque créature
 *  redevient bloquable — sauf source permanente : l'Infiltration imprimée ou
 *  celle de l'arme portée (le Takouba) survit au changement de tour. Les
 *  statistiques gagnées, elles, restent acquises. */
function annulerInfiltrations(duel) {
  for (const cote of ['joueur', 'sorcier']) {
    for (const entite of duel[cote].creatures) {
      entite.infiltrationTour = false;
      entite.infiltration = Boolean(duelCardById(entite.carteId)?.infiltration)
        || Boolean(armeCarteDe(entite)?.donne?.infiltration);
    }
  }
}

/**
 * Gèle une créature (la Poigne de givre, le Verglas) : ni attaque ni blocage
 * jusqu'à la fin du **prochain tour de son contrôleur** — si le gel tombe
 * pendant le tour du contrôleur, il couvre donc le tour en cours et le
 * suivant ; sinon, le prochain tour du contrôleur. `gelToursRestants` compte
 * les tours du contrôleur qui restent à couvrir, décomptés à `rpgFinDeTour`.
 */
function gelerEntite(duel, entite) {
  const proprietaire = duel.joueur.creatures.some((candidate) => candidate.id === entite.id)
    ? 'joueur' : 'sorcier';
  entite.gelToursRestants = duel.tour === proprietaire ? 2 : 1;
  duel.log.push(`${entite.name} est gelée : ni attaque ni blocage jusqu’à la fin de son prochain tour.`);
}

/** Applique un effet de capacité (arrivée / destruction). `sauf` exclut une
 *  entité du buff (le Colosse ne se buffe pas lui-même). */
function appliquer(duel, cote, effet, cibleId, sauf = null, sourceElement = null, sourceType = null, sourceCarteId = null) {
  const adv = autre(cote);
  // Boualem ne contre que l'effet qui le **cible vraiment** : un effet de zone,
  // un renfort de camp ou une arrivée qui crée des jetons n'a pas de cible et
  // ne doit donc jamais déclencher son contresort (le moteur ne transmet un
  // `cibleId` qu'aux effets qui en désignent une).
  if (cibleId && effet.cible) {
    const cibleBoualem = duel[adv].creatures.find((entite) => entite.id === cibleId);
    if (cibleBoualem?.carteId === 'boualem' && cibleBoualem.boualemContresortDisponible) {
      cibleBoualem.boualemContresortDisponible = false;
      duel.log.push(`Boualem contre l’effet adverse qui le ciblait.`);
      return;
    }
  }
  switch (effet.type) {
    case 'exil': {
      for (const campCible of [adv, cote]) {
        const victime = duel[campCible].creatures.find((entite) => entite.id === cibleId);
        if (!victime) continue;
        if (rpgEstProtegee(victime, sourceElement)) return;
        duel[campCible].creatures = duel[campCible].creatures.filter((entite) => entite.id !== victime.id);
        detacherArmes(duel, campCible, victime);
        armeAuCimetiere(duel, campCible, victime);
        if (!victime.jeton) {
          duel[campCible].exil ??= [];
          duel[campCible].exil.push(victime.carteId);
        }
        duel.log.push(`${victime.name} est retirée de la partie.`);
        rafraichirAuras(duel);
        return;
      }
      return;
    }
    case 'arme': {
      const porteur = duel[cote].creatures.find((entite) => entite.id === cibleId);
      if (!porteur || rpgEstProtegee(porteur, sourceElement)) return;
      porteur.armes ??= [];
      porteur.armes.push(sourceCarteId);
      porteur.atk += effet.atk ?? 0;
      porteur.pvMax += effet.def ?? 0;
      porteur.pv += effet.def ?? 0;
      porteur.def += effet.def ?? 0;
      if (effet.coupRapide) porteur.coupRapide = true;
      duel.log.push(`${(cardById(sourceCarteId)?.name ?? 'Une arme')} s’attache à ${porteur.name} : +${effet.atk}/${effet.def}, Coup rapide.`);
      return;
    }
    case 'pioche':
      for (let i = 0; i < (effet.amount ?? 1); i += 1) rpgPiocher(duel, cote);
      return;
    case 'pioche-defausse': {
      const pioche = Math.max(0, Number(effet.pioche ?? effet.amount) || 0);
      const aDefausser = Math.max(0, Number(effet.defausse) || 0);
      for (let i = 0; i < pioche; i += 1) rpgPiocher(duel, cote);
      if (aDefausser <= 0 || !duel[cote].main.length) return;
      if (cote === 'sorcier') {
        for (let i = 0; i < aDefausser && duel[cote].main.length; i += 1) {
          rpgDefausserCarte(duel, cote);
        }
        return;
      }
      if (cibleId !== null && cibleId !== undefined
        && (typeof cibleId === 'number' || duel[cote].main.includes(cibleId))) {
        rpgDefausserCarte(duel, cote, cibleId);
        const restant = Math.min(aDefausser - 1, duel[cote].main.length);
        if (restant > 0) {
          duel.defausseEnAttente = { cote, restant, sourceCarteId };
        }
        return;
      }
      duel.defausseEnAttente = {
        cote,
        restant: Math.min(aDefausser, duel[cote].main.length),
        sourceCarteId,
      };
      return;
    }
    case 'retour-main': {
      // Renvoi en main (« bounce » / Rebond) : la cible quitte la table pour la
      // main de son propriétaire. `creature` vise le camp adverse (ou une
      // créature alliée explicitement désignée hors `sauf`), `creature-amie` le
      // camp du lanceur. `pioche` fait piocher le lanceur après le renvoi.
      if (effet.cible === 'creature-amie') {
        const cibles = duel[cote].creatures.filter((entite) => entite.id === cibleId);
        for (const cible of cibles) {
          renvoyerEnMain(duel, cote, cible, sourceElement);
        }
      } else {
        const enFace = duel[adv].creatures.find((entite) => entite.id === cibleId);
        const chezSoi = duel[cote].creatures.find((entite) => entite.id === cibleId && entite.id !== sauf);
        if (enFace) {
          renvoyerEnMain(duel, adv, enFace, sourceElement);
        } else if (chezSoi) {
          renvoyerEnMain(duel, cote, chezSoi, sourceElement);
        }
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
    case 'jetons': {
      // Créatures-jetons : l'effet fait naître une ou plusieurs créatures de
      // modèle (`jetonById`), sans carte en main ni sable payé. Elles entrent
      // en jeu comme n'importe quelle créature — le mal d'invocation et les
      // auras du camp s'appliquent à leur tour, `rpgJouerCreature` finissant
      // par `rafraichirAuras`.
      const modele = jetonById(effet.jeton);
      if (!modele) return;
      const nombre = Math.max(0, Math.floor(Number(effet.nombre) || 1));
      if (!nombre) return;
      const source = duel[cote].creatures.find((entite) => entite.id === sauf);
      for (let i = 0; i < nombre; i += 1) {
        const jeton = creerEntiteCreature(modele);
        // `ephemere` : le jeton ne survit pas au tour qui l'a vu naître —
        // `rpgFinDeTour` le détruit (serpents du Bâton des citernes).
        if (effet.ephemere) jeton.detruireFinDuTour = true;
        duel[cote].creatures.push(jeton);
      }
      const nom = nombre > 1 ? (modele.pluriel ?? modele.name) : modele.name;
      duel.log.push(`${source?.name ?? 'L’effet'} crée ${nombre} ${nom.toLowerCase()} ${modele.atk}/${modele.def} sans coût${effet.ephemere ? ', détruit à la fin du tour' : ''}.`);
      return;
    }
    case 'buff': {
      // Un bonus déclaré avec `tours` est un bonus « jusqu’à la fin du tour » :
      // il est accordé comme les autres, puis noté dans le carnet du camp avec
      // le tour qui le voit naître, pour être effacé à `rpgFinDeTour` de CE
      // tour-là (voir `annulerBonusTemporaires`). Le Rempart de dunes tient donc
      // pour l’échange en cours, pas au-delà.
      //
      // `cible: 'creatures-adverses'` (l’Embuscade) inverse le camp visé : le
      // maléfice frappe la table adverse, et `minimum` (plancher 1 pour
      // l’Embuscade) empêche les statistiques de descendre sous ce seuil — une
      // créature amputée survit, jamais tuée par le débuff seul. `blocageForce`
      // marque aussi les créatures touchées : elles devront bloquer.
      const temporaire = Number(effet.tours) > 0;
      const contreAdversaire = effet.cible === 'creatures-adverses';
      const campCible = contreAdversaire ? duel[adv] : duel[cote];
      const carnet = (campCible.bonusTemporaires ??= []);
      const plancher = Number.isFinite(effet.minimum) ? effet.minimum : 0;
      let forces = 0;
      for (const entite of campCible.creatures) {
        if (sauf === entite.id || rpgEstProtegee(entite, sourceElement)) continue;
        const bonusAttaque = effet.atk ?? 0;
        const bonusDefense = effet.def ?? 0;
        entite.atk = Math.max(plancher, entite.atk + bonusAttaque);
        entite.pvMax = Math.max(plancher, (entite.pvMax ?? entite.def) + bonusDefense);
        entite.def = Math.max(plancher, entite.def + bonusDefense);
        entite.pv = Math.max(plancher, entite.pv + bonusDefense);
        if (temporaire) carnet.push({ entiteId: entite.id, atk: bonusAttaque, def: bonusDefense, tour: duel.tour });
        if (effet.blocageForce) {
          entite.blocageForce = { par: cote, portee: effet.blocageForce === 'tour' ? 'tour' : 'attaque' };
          forces += 1;
        }
      }
      if (forces) {
        duel.log.push(`${forces} créature${forces > 1 ? 's adverses doivent' : ' adverse doit'} bloquer si ${forces > 1 ? 'elles le peuvent' : 'elle le peut'} ${effet.blocageForce === 'tour' ? 'ce tour' : 'lors de votre prochaine attaque'}.`);
      }
      return;
    }
    case 'brouillard': {
      // Le Grand Voile blanc : aucun dégât de combat ce tour, des deux côtés.
      // Le voile meurt avec le tour en cours (voir `rpgFinDeTour`).
      duel.brouillardCombat = true;
      duel.log.push('Un grand voile blanc couvre le champ : aucun dégât de combat ce tour.');
      return;
    }
    case 'blocage-force': {
      // L’Appât de la meute : la créature adverse ciblée doit bloquer si elle
      // le peut lors de la prochaine attaque du lanceur (le marqueur est
      // dépensé par cette attaque, voir `rpgLancerAttaque`).
      const entite = duel[adv].creatures.find((candidate) => candidate.id === cibleId);
      if (!entite || rpgEstProtegee(entite, sourceElement)) return;
      entite.blocageForce = { par: cote, portee: effet.portee === 'tour' ? 'tour' : 'attaque' };
      duel.log.push(`${entite.name} devra bloquer si elle le peut lors de votre prochaine attaque.`);
      return;
    }
    case 'infiltration': {
      // Le ralliement de Tin Hinan : TOUTES les créatures du camp — la source
      // comprise — gagnent +ATK/+DEF, et passent incognito jusqu'à la fin du
      // tour (Infiltration : impossibles à bloquer). Les statistiques restent
      // acquises ; le passe-droit s'efface à `rpgFinDeTour` (voir
      // `annulerInfiltrations`). Contrairement au `buff`, aucune entité n'est
      // exclue : « toutes les créatures du joueur ».
      const source = duel[cote].creatures.find((entite) => entite.id === sauf);
      const bonusAttaque = effet.atk ?? 0;
      const bonusDefense = effet.def ?? 0;
      for (const entite of duel[cote].creatures) {
        if (rpgEstProtegee(entite, sourceElement)) continue;
        entite.atk += bonusAttaque;
        entite.pvMax = (entite.pvMax ?? entite.def) + bonusDefense;
        entite.def += bonusDefense;
        entite.pv += bonusDefense;
        entite.infiltration = true;
        entite.infiltrationTour = true; // passe-droit du tour : voir `annulerInfiltrations`
      }
      duel.log.push(`Infiltration : ${source?.name ?? 'l’effet'} rend ses créatures impossibles à bloquer ce tour.`);
      return;
    }
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
        differerEcho(duel, cote, adv, effet, sourceElement, sourceType, sourceCarteId);
        return;
      }
      const cibles = effet.cible === 'toutes-creatures'
        ? [...duel[adv].creatures]
        : duel[adv].creatures.filter((entite) => entite.id === cibleId);
      for (const cible of cibles) {
        rpgBlesserCreature(duel, adv, cible.id, effet.amount ?? 0, sourceElement, null, sourceType);
        // Le gel (`gel`) accompagne les dégâts — la Poigne de givre, le
        // Verglas. La créature tuée n'a rien à figer ; la survivante ne
        // rejoindra ni l'attaque ni le blocage avant la fin de son prochain tour.
        if (effet.gel) {
          const survivante = duel[adv].creatures.find((entite) => entite.id === cible.id);
          if (survivante) gelerEntite(duel, survivante);
        }
      }
      differerEcho(duel, cote, adv, effet, sourceElement, sourceType, sourceCarteId);
      return;
    }
    default:
  }
}

/** Une arme attachée quitte le jeu avec son porteur, sans revenir en main. */
function detacherArmes(duel, cote, entite) {
  const armes = entite.armes ?? [];
  duel[cote].cimetiere.push(...armes);
  entite.armes = [];
  if (armes.length) duel.log.push(`Les armes de ${entite.name} rejoignent le cimetière.`);
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
  detacherArmes(duel, cote, presente);
  // Une arme, elle, ne suit pas son porteur en main : elle tombe au cimetière.
  armeAuCimetiere(duel, cote, presente);
  // Une créature-jeton n'a pas de carte à renvoyer : elle **cesse d'exister**,
  // comme un jeton de table qui quitte le champ de bataille. Sans cette règle,
  // un chien de sable de Tarek deviendrait une carte gratuite et rejouable.
  if (presente.jeton) {
    duel.log.push(`${presente.name} quitte la table : un jeton cesse d’exister.`);
    rafraichirAuras(duel);
    return true;
  }
  camp.main.push(presente.carteId);
  duel.log.push(`${presente.name} retourne dans la main de son propriétaire.`);
  rafraichirAuras(duel);
  return true;
}

/** Retire une créature morte, puis déclenche sa capacité de destruction. */
function enterrer(duel, cote, entite, sourceElements = []) {
  // Tenacité : la destruction est refusée une fois — la créature survit et il
  // lui reste 1 point de défense. Aucune capacité de destruction ne se
  // déclenche : elle n'a pas été détruite. Seule cette présence en jeu la
  // dépense : renvoyée en main puis rejouée, la carte revient avec sa Tenacité.
  if (entite.tenaciteDisponible) {
    entite.tenaciteDisponible = false;
    entite.pv = 1;
    entite.def = 1;
    duel.log.push(`Tenacité : ${entite.name} refuse la destruction — il lui reste 1 point de défense.`);
    return;
  }
  journaliserDestruction(duel, entite, sourceElements);
  armeAuCimetiere(duel, cote, entite);
  const camp = duel[cote];
  camp.creatures = camp.creatures.filter((e) => e.id !== entite.id);
  camp.cimetiere.push(entite.carteId);
  detacherArmes(duel, cote, entite);
  duel.log.push(`${entite.name} est détruite et rejoint le cimetière.`);
  const carte = duelCardById(entite.carteId);
  if (carte?.destruction) {
    appliquer(duel, cote, carte.destruction, null, null, cardColors(carte), null, entite.carteId);
  }
  declencherHonneur(duel, cote, entite);
  rafraichirAuras(duel);
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
    // La Tenacité peut avoir sauvé la créature : elle a alors survécu à une
    // blessure, et la Furie s'applique comme pour n'importe quel survivant.
    if (duel[cote].creatures.some((candidate) => candidate.id === entite.id)) {
      appliquerFurie(duel, entite, recus);
    }
  } else {
    appliquerFurie(duel, entite, recus);
  }
  rafraichirAuras(duel);
  rpgActionsEtat(duel);
  return { ok: true, recus, absorbes, esquives: esquive };
}

/** Pose une créature : paie le sable, arrive en jeu, capacité d'arrivée. */
export function rpgJouerCreature(duel, cote, carteId, cibleId = null) {
  const camp = duel[cote];
  const carte = duelCardById(carteId);
  if (!carte) return { ok: false, raison: 'inconnue' };
  if (!camp.main.includes(carteId)) return { ok: false, raison: 'pas-en-main' };
  if (carte.arrivee?.type === 'combat' || (carte.arrivee?.type === 'degats' && carte.arrivee.cible === 'creature')) {
    // Une arrivée qui désigne une créature (duel du Cavalier, lance de givre de
    // la Valkyrie, gueule du Bakunawa) exige sa cible tant qu'il reste une
    // créature adverse à viser : la pose sans désignation est refusée.
    const adversaires = duel[autre(cote)].creatures;
    const cible = adversaires.find((entite) => entite.id === cibleId);
    if (cibleId && !cible) return { ok: false, raison: 'cible' };
    if (cible && rpgEstProtegee(cible, cardColors(carte))) return { ok: false, raison: 'protection' };
    if (!cibleId && adversaires.some((entite) => !rpgEstProtegee(entite, cardColors(carte)))) {
      return { ok: false, raison: 'cible' };
    }
  }
  if (carte.arrivee?.type === 'exil') {
    const creatures = [...camp.creatures, ...duel[autre(cote)].creatures];
    const cible = creatures.find((entite) => entite.id === cibleId);
    if (cibleId && !cible) return { ok: false, raison: 'cible' };
    if (cible && rpgEstProtegee(cible, cardColors(carte))) return { ok: false, raison: 'protection' };
    if (!cibleId && creatures.some((entite) => !rpgEstProtegee(entite, cardColors(carte)))) {
      return { ok: false, raison: 'cible' };
    }
  }
  if (carte.arrivee?.type === 'retour-main' && cibleId) {
    const cible = duel[autre(cote)].creatures.find((entite) => entite.id === cibleId)
      ?? duel[cote].creatures.find((entite) => entite.id === cibleId);
    if (!cible) return { ok: false, raison: 'cible' };
    if (rpgEstProtegee(cible, cardColors(carte))) return { ok: false, raison: 'protection' };
  }
  if (!rpgPeutPayer(camp, carte)) return { ok: false, raison: 'mana' };
  // L'IA peut répondre à la créature avant son entrée en jeu. Dans ce cas,
  // `contrerAnnonce` paie la créature lancée ainsi que le contresort adverse.
  if (cote === 'joueur' && !duel.annonce) {
    const contreIA = choisirContreIA(duel, carte);
    if (contreIA) return contrerAnnonce(duel, 'sorcier', contreIA, { cote: 'joueur', carteId });
  }
  payer(duel, cote, carte);
  camp.main.splice(camp.main.indexOf(carteId), 1);
  const entite = creerEntiteCreature(carte);
  camp.creatures.push(entite);
  duel.log.push(`${cote === 'joueur' ? 'Vous posez' : 'Le sorcier pose'} ${carte.name}.`);
  if (entite.protection) {
    const couleur = ELEMENT_LABELS[entite.protection.contre] ?? entite.protection.contre;
    duel.log.push(`${entite.name} reçoit une protection contre ${couleur} pour ce tour et le prochain tour adverse.`);
  }
  if (carte.arrivee) {
    // Seuls les effets d'arrivée qui **désignent** une cible reçoivent un
    // `cibleId` : les autres (renfort de camp, pioche, création de jetons…)
    // n'en portent pas, ce qui évite qu'une cible quelconque — un Boualem
    // adverse par exemple — n'intercepte un effet qui ne la visait pas.
    const cibleArrivee = carte.arrivee.cible
      ? (carte.arrivee.cible === 'creature-amie' ? (cibleId ?? entite.id) : cibleId)
      : null;
    appliquer(duel, cote, carte.arrivee, cibleArrivee, entite.id, cardColors(carte), 'capacite', carte.id);
  }
  rafraichirAuras(duel);
  rpgActionsEtat(duel);
  return { ok: true, entite };
}

/**
 * Joue une arme : payée en mana depuis la main, elle s'attache directement à
 * une créature alliée désignée (héros et jetons compris) — pas de pose au sol,
 * pas de déplacement ensuite. La protection contre la couleur de l'arme
 * refuse l'attachement, comme elle refuse un bouclier ami. Une créature déjà
 * armée voit son ancienne arme partir au cimetière (voir `attacherArme`).
 * Le sorcier peut répondre par un contresort « carte », comme pour une
 * créature : l'arme part alors au cimetière sans jamais être portée.
 */
export function rpgJouerArme(duel, cote, carteId, cibleId = null) {
  const camp = duel[cote];
  const carte = armeById(carteId);
  if (!carte) return { ok: false, raison: 'inconnue' };
  if (!camp.main.includes(carteId)) return { ok: false, raison: 'pas-en-main' };
  const cible = camp.creatures.find((entite) => entite.id === cibleId);
  if (!cible) return { ok: false, raison: 'cible' };
  if (rpgEstProtegee(cible, cardColors(carte))) return { ok: false, raison: 'protection' };
  if (!rpgPeutPayer(camp, carte)) return { ok: false, raison: 'mana' };
  if (cote === 'joueur' && !duel.annonce) {
    const contreIA = choisirContreIA(duel, carte);
    if (contreIA) return contrerAnnonce(duel, 'sorcier', contreIA, { cote: 'joueur', carteId });
  }
  payer(duel, cote, carte);
  camp.main.splice(camp.main.indexOf(carteId), 1);
  attacherArme(duel, cote, cible, carte);
  const bonus = `+${carte.bonus?.atk ?? 0}/+${carte.bonus?.def ?? 0}`;
  duel.log.push(`${cote === 'joueur' ? 'Vous attachez' : 'Le sorcier attache'} ${carte.name} à ${cible.name} (${bonus}).`);
  // L'arrivée de l'arme elle-même peut porter un effet (le Bâton des
  // citernes appelle son premier serpent en s'attachant).
  if (carte.arrivee) {
    appliquer(duel, cote, carte.arrivee, null, cible.id, carte.element, null, carte.id);
    appliquerAuraSable(duel, cote);
    majResonance(duel);
  }
  rpgActionsEtat(duel);
  return { ok: true, entite: cible };
}

/**
 * Capacité activée d'une arme portée (le Bâton des citernes : 3 manas pour
 * un serpent). Ce n'est pas une carte : rien à annoncer, rien à contrer —
 * une décision de son tour, payable autant de fois que le mana le permet,
 * comme tout le reste dans ce jeu se décide pendant son propre tour.
 *
 * @returns {{ok: true, entite: object} | {ok: false, raison: string}}
 */
export function rpgActiverArme(duel, cote, entiteId) {
  if (duel.tour !== cote) return { ok: false, raison: 'tour' };
  if (duel.annonce) return { ok: false, raison: 'annonce' };
  const camp = duel[cote];
  const entite = camp.creatures.find((candidate) => candidate.id === entiteId);
  if (!entite) return { ok: false, raison: 'absente' };
  const carte = armeCarteDe(entite);
  const activation = carte?.activation;
  if (!activation) return { ok: false, raison: 'aucune-activation' };
  const cout = Math.max(0, Number(activation.cout) || 0);
  if (!rpgPeutPayer(camp, { cost: cout })) return { ok: false, raison: 'mana' };
  payer(duel, cote, { cost: cout });
  duel.log.push(`${cote === 'joueur' ? 'Vous activez' : 'Le sorcier active'} ${carte.name} (${cout} manas).`);
  appliquer(duel, cote, activation.effet, null, entite.id, carte.element, null, carte.id);
  appliquerAuraSable(duel, cote);
  majResonance(duel);
  rpgActionsEtat(duel);
  return { ok: true, entite };
}

// Gelé (Poigne de givre, Verglas) : la créature ni n'attaque ni ne bloque.
const estGelee = (entite) => (entite?.gelToursRestants ?? 0) > 0;
const pret = (entite) => entite && entite.ready && !entite.attaquee && !estGelee(entite);
// Le mal d'invocation empêche d'attaquer, pas de défendre : toute créature
// qui n'a pas attaqué ce tour peut bloquer, même si elle vient d'arriver.
// Le gel, lui, ferme aussi la défense.
const peutBloquer = (entite) => entite && !entite.attaquee && !estGelee(entite);

/**
 * Qui peut bloquer qui :
 * — Infiltration : l'attaquant ne peut pas être bloqué du tout, par personne.
 *   Elle peut être permanente (imprimée, ou conférée par l'arme portée) ou
 *   accordée jusqu'à la fin du tour (le ralliement de Tin Hinan) ;
 * — Envol : un attaquant volant ne peut être bloqué que par une créature volante.
 */
export function rpgPeutBloquerAttaquant(bloqueur, attaquant) {
  if (!bloqueur || !attaquant) return false;
  if (attaquant.infiltration) return false;
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
  ajouterDegatsCapaciteAvantCombat(degatsAvantCombat, cote, carteAttaquant, cible, attaquant);
  ajouterDegatsCapaciteAvantCombat(degatsAvantCombat, autre(cote), carteCible, attaquant, cible);
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
  const visee = duelCardById(annonce.carteId) ?? magieById(annonce.carteId) ?? armeById(annonce.carteId);
  return Boolean(visee && contreCorrespond(carte.effet, visee));
}

/** Contrer : répond à une annonce adverse (ou à la carte du joueur que l'IA contre).
 * La carte visée et le contre paient tous deux leur coût, puis vont au cimetière
 * sans résoudre l'effet de la carte visée (Déflection fait aussi piocher).
 * `annonce` : { cote, carteId } ; par défaut l'annonce en cours du sorcier. */
function contrerAnnonce(duel, cote, carte, annonce = duel.annonce) {
  const camp = duel[cote];
  if (!annonce || annonce.cote === cote) return { ok: false, raison: 'rien-a-contrer' };
  const cible = duelCardById(annonce.carteId) ?? magieById(annonce.carteId) ?? armeById(annonce.carteId);
  if (!cible || !contreCorrespond(carte.effet, cible)) return { ok: false, raison: 'cible' };
  if (!rpgPeutPayer(camp, carte)) return { ok: false, raison: 'mana' };
  const campAnnonce = duel[annonce.cote];
  if (!rpgPeutPayer(campAnnonce, cible)) return { ok: false, raison: 'mana' };

  // Payer la carte lancée, même si elle est immédiatement contrecarrée, puis
  // payer le contresort. Les cartes du joueur restent en main jusque-là ; les
  // annonces du sorcier ne paient normalement qu'à leur résolution.
  payer(duel, annonce.cote, cible);
  payer(duel, cote, carte);
  const main = campAnnonce.main;
  if (main.includes(annonce.carteId)) main.splice(main.indexOf(annonce.carteId), 1);
  duel[annonce.cote].cimetiere.push(annonce.carteId);
  camp.main.splice(camp.main.indexOf(carte.id), 1);
  camp.cimetiere.push(carte.id);
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

/** Lancer une magie : sorcellerie pendant son tour, magie rapide aussi en réponse. */
export function rpgLancerMagie(duel, cote, carteId, cibleId = null, cibleAllieeId = null) {
  const camp = duel[cote];
  const adv = autre(cote);
  const carte = magieById(carteId);
  if (!carte) return { ok: false, raison: 'inconnue' };
  if (!camp.main.includes(carteId)) return { ok: false, raison: 'pas-en-main' };
  // Magie rapide : le camp qui n'a pas la main peut la jouer pendant une
  // fenêtre de réponse (blocage, fin de tour), joueur comme sorcier.
  const fenetreEphémère = cote !== duel.tour
    && duel.fenetreReponse
    && carte.instant;
  if (duel.tour !== cote && !fenetreEphémère) return { ok: false, raison: 'timing' };
  if (!rpgPeutPayer(camp, carte)) return { ok: false, raison: 'mana' };
  if (carte.effet.type === 'contresort') return contrerAnnonce(duel, cote, carte);

  if (carte.effet.type === 'degats' && carte.effet.cible === 'creature') {
    if (cibleId === 'sorcier') {
      if (!carte.cibles?.includes('sorcier')) return { ok: false, raison: 'cible' };
    } else {
      const cible = duel[adv].creatures.find((entite) => entite.id === cibleId);
      if (!cible) return { ok: false, raison: 'cible' };
      if (rpgEstProtegee(cible, cardColors(carte))) return { ok: false, raison: 'protection' };
    }
  }
  if (['bouclier', 'arme'].includes(carte.effet.type) && carte.effet.cible === 'creature-amie') {
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
  if (carte.effet.type === 'combat' && carte.effet.sourceCible === 'creature-amie') {
    // Le Défi du Jarl : deux désignations — votre champion, puis la créature
    // adverse. Sans les deux, le duel n'a pas lieu et le mana reste entier.
    const champion = camp.creatures.find((entite) => entite.id === cibleAllieeId);
    const adverse = duel[adv].creatures.find((entite) => entite.id === cibleId);
    if (!champion || !adverse) return { ok: false, raison: 'cible' };
    if (rpgEstProtegee(champion, cardColors(carte)) || rpgEstProtegee(adverse, cardColors(carte))) {
      return { ok: false, raison: 'protection' };
    }
  }
  if (carte.effet.type === 'blocage-force') {
    // L’Appât de la meute exige une créature adverse à marquer.
    const cible = duel[adv].creatures.find((entite) => entite.id === cibleId);
    if (!cible) return { ok: false, raison: 'cible' };
    if (rpgEstProtegee(cible, cardColors(carte))) return { ok: false, raison: 'protection' };
  }

  if (cote === 'joueur' && !duel.annonce) {
    const contreIA = choisirContreIA(duel, carte);
    if (contreIA) return contrerAnnonce(duel, 'sorcier', contreIA, { cote: 'joueur', carteId });
  }

  payer(duel, cote, carte);
  camp.main.splice(camp.main.indexOf(carteId), 1);
  const effet = carte.effet.type === 'degats'
    && carte.effet.cible === 'creature'
    && cibleId === 'sorcier'
    ? { ...carte.effet, cible: 'sorcier' }
    : carte.effet;
  // Pour un duel (`combat`), `sauf` porte le champion allié — le cas `combat`
  // d’`appliquer` lit sa source dans ce paramètre.
  appliquer(duel, cote, effet, cibleId,
    carte.effet.type === 'combat' ? (cibleAllieeId ?? null) : null,
    cardColors(carte), 'magie', carteId);
  if (carte.effet.type !== 'arme') camp.cimetiere.push(carteId);
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
    if (cibleId && !attaquant.coupRapide) return { ok: false, raison: 'cible' };
    if (!attaquant.coupRapide) continue;
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
  // Blocage forcé (l’Appât de la meute, l’Embuscade) : chaque créature marquée
  // par ce camp doit bloquer si elle le peut — le marqueur part à la prochaine
  // attaque du lanceur (« si elle le peut » : sans blocage légal, elle est libre).
  const forces = bloqueursDisponibles.filter((entite) => entite.blocageForce?.par === cote);
  for (const force of forces) {
    const dejaAssigne = Object.values(affectations).some((idsBloqueurs) => idsBloqueurs.includes(force.id));
    if (dejaAssigne) continue;
    const candidats = attaquants
      .filter((attaque) => rpgPeutBloquerAttaquant(force, attaque)
        && !rpgEstProtegee(attaque, cardColors(duelCardById(force.carteId))))
      .sort((a, b) => (b.atk ?? 0) - (a.atk ?? 0));
    if (!candidats.length) continue;
    affectations[candidats[0].id] = [...(affectations[candidats[0].id] ?? []), force.id];
  }
  const attaquantsDejaBloques = new Set((attaquantsBloques
    ?? Object.entries(affectations).filter(([, idsBloqueurs]) => idsBloqueurs.length).map(([id]) => id))
    .filter((id) => ids.includes(id)));

  const bloqueursUtilises = new Set();
  for (const [attaquantId, idsBloqueurs] of Object.entries(affectations)) {
    if (!ids.includes(attaquantId)) return { ok: false, raison: 'blocage' };
    if (new Set(idsBloqueurs).size !== idsBloqueurs.length) return { ok: false, raison: 'bloqueur' };
    const attaquant = attaquants.find((entite) => entite.id === attaquantId);
    for (const bloqueurId of idsBloqueurs) {
      const bloqueur = bloqueursDisponibles.find((entite) => entite.id === bloqueurId);
      if (!bloqueur || bloqueursUtilises.has(bloqueurId)) return { ok: false, raison: 'bloqueur' };
      if (!rpgPeutBloquerAttaquant(bloqueur, attaquant)) {
        return { ok: false, raison: attaquant.infiltration ? 'infiltration' : 'envol' };
      }
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
  // Le Coup rapide frappe AVANT les blessures de combat : la cible choisie à la
  // déclaration encaisse les dégâts d'attaque, sans riposte. L'attaque se
  // poursuit ensuite normalement — l'attaquant peut être bloqué, échange ses
  // blessures de combat, ou frappe le sorcier s'il passe. Un bloqueur emporté
  // par cette frappe précoce est déjà hors du combat.
  const frappesRapides = [];
  for (const attaquant of attaquants) {
    const cibleRapideId = ciblesRapides[attaquant.id];
    if (!cibleRapideId) continue;
    const cible = duel[adv].creatures.find((entite) => entite.id === cibleRapideId);
    frappesRapides.push(cible
      ? {
        attaquantId: attaquant.id,
        attaquant: attaquant.name,
        cibleId: cible.id,
        cible: cible.name,
        degats: attaquant.atk,
      }
      : { attaquantId: attaquant.id, attaquant: attaquant.name, cibleId: cibleRapideId, cible: null, degats: 0, annule: true });
    if (!cible) continue;
    degatsAvantCombat.push({
      cote: adv,
      entiteId: cible.id,
      amount: attaquant.atk,
      sourceElement: cardColors(duelCardById(attaquant.carteId)),
      sourceType: 'attaque',
    });
  }
  for (const attaquant of attaquants) {
    for (const bloqueurId of affectations[attaquant.id] ?? []) {
      const bloqueur = bloqueursDisponibles.find((entite) => entite.id === bloqueurId);
      ajouterDegatsCapaciteAvantCombat(degatsAvantCombat, cote, duelCardById(attaquant.carteId), bloqueur, attaquant);
      ajouterDegatsCapaciteAvantCombat(degatsAvantCombat, adv, duelCardById(bloqueur.carteId), attaquant, bloqueur);
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
    coupsRapides: frappesRapides,
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
    const idsBloqueurs = blocagesApresCapacites[attaquant.id] ?? [];
    if (!idsBloqueurs.length) {
      // Un attaquant rapide n'est bloqué que par des bloqueurs encore debout :
      // si la frappe précoce les a tous emportés, la voie est libre.
      if (!attaquantsDejaBloques.has(attaquant.id) || ciblesRapides[attaquant.id]) {
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

  for (const coup of coupsSorcier) {
    if (!duel[cote].creatures.some((entite) => entite.id === coup.attaquantId)) continue;
    // Le Grand Voile blanc avale aussi les coups portés au sorcier.
    if (duel.brouillardCombat) continue;
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
  if (duel.brouillardCombat) {
    duel.log.push('Le grand voile blanc absorbe les dégâts de combat.');
  }
  // L’attaque est passée : le blocage forcé « lors de votre prochaine attaque »
  // (l’Appât de la meute) a été dépensé par celle-ci.
  for (const entite of duel[adv].creatures) {
    if (entite.blocageForce?.par === cote && entite.blocageForce?.portee === 'attaque') {
      entite.blocageForce = null;
    }
  }
  // Le combat est derrière nous : le joueur actif entre en deuxième phase
  // principale (ses attaquants restent engagés jusqu'à son prochain tour).
  if (cote === duel.tour) duel.phase = 'principale2';
  rpgActionsEtat(duel);
  return { ok: true, resume };
}

/** Résolution d'une attaque qui n'a pas été bloquée par une créature. */
export function rpgAttaquerSorcier(duel, cote, entiteId, cibleCreatureId = null) {
  const attaquant = duel[cote].creatures.find((e) => e.id === entiteId);
  if (!attaquant) return { ok: false, raison: 'absente' };
  if (!pret(attaquant)) return { ok: false, raison: 'pas-pret' };
  const carte = duelCardById(attaquant.carteId);
  if (attaquant.coupRapide) {
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
  if (duel.brouillardCombat) {
    // Le Grand Voile blanc : le coup s'égare, le sorcier ne prend rien.
    duel.log.push(`${attaquant.name} frappe dans le grand voile blanc : le sorcier ne prend rien.`);
  } else {
    rpgInfligerSorcier(duel, autre(cote), attaquant.atk);
    duel.log.push(`${attaquant.name} frappe le sorcier ${autre(cote) === 'joueur' ? 'joueur' : 'ennemi'} (${attaquant.atk}).`);
  }
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
  rafraichirAuras(duel);
}

/** Note la phase en cours (l'interface la lit pour son rail de phases). */
export function rpgDefinirPhase(duel, phase) {
  if (!RPG_PHASES.includes(phase)) return false;
  duel.phase = phase;
  return true;
}

/** Le joueur actif quitte son tour : on entre en phase de FIN DE TOUR. L'autre
 *  camp a alors la main pour jouer une magie rapide (`rpgLancerMagie`). Rien
 *  n'est encore effacé — un Rempart de dunes « jusqu'à la fin du tour » protège
 *  donc toujours pendant cette fenêtre. `rpgFinDeTour` ferme ensuite le tour. */
export function rpgOuvrirFinDeTour(duel) {
  if (duel.finDeTour) return duel.finDeTour;
  duel.phase = 'fin';
  duel.finDeTour = { cote: duel.tour };
  duel.fenetreReponse = true;
  duel.log.push(`Fin du tour du ${duel.tour === 'joueur' ? 'joueur' : 'sorcier'} : ${duel.tour === 'joueur' ? 'le sorcier peut' : 'vous pouvez'} jouer une magie rapide.`);
  return duel.finDeTour;
}

/** Le camp a-t-il en main une magie rapide qu'il peut jouer maintenant ?
 *  (Un contre n'a rien à contrer en fin de tour : il ne compte pas.) */
export function rpgPeutRepondre(duel, cote) {
  return duel[cote].main.some((id) => {
    const carte = magieById(id);
    return Boolean(carte?.instant
      && rpgContreJouable(duel, cote, carte)
      && rpgPeutPayer(duel[cote], carte));
  });
}

/** Une magie rapide de l'IA (fin de tour du joueur, blocage d'une attaque du
 *  joueur) : au plus une carte, la plus utile selon son profil. */
export function rpgSorcierMagieRapide(duel, rng = Math.random) {
  const coup = choisirCarteIA(duel, 'sorcier', { ia: duel.sorcier.ia, rng, seulementInstants: true });
  if (!coup) return null;
  const res = rpgLancerMagie(duel, 'sorcier', coup.carteId, coup.cibleId);
  return res.ok ? { ...res, carteId: coup.carteId } : null;
}

/** Détruit les créatures éphémères (`detruireFinDuTour`) : elles ne
 *  survivent jamais au tour qui les a vues naître (serpents du Bâton). */
function detruireEphemeres(duel) {
  for (const cote of ['joueur', 'sorcier']) {
    const ephemeres = duel[cote].creatures.filter((entite) => entite.detruireFinDuTour);
    for (const entite of ephemeres) {
      duel.log.push(`${entite.name} est détruit : la fin du tour le reprend.`);
      enterrer(duel, cote, entite);
    }
  }
}

/** Fin du tour : le tour qui se ferme efface les renforts « jusqu'à la fin du
 *  tour », puis l'autre camp commence — DÉBUT DE TOUR : revenu de sable,
 *  pioche 1, ses créatures deviennent prêtes (le mal d'invocation tombe) et les
 *  échos différés (Nuage de cendres) dont il est le lanceur retombent sur la
 *  table d'en face. Le tour s'ouvre ensuite en phase principale. */
export function rpgFinDeTour(duel) {
  duel.phase = 'fin';
  duel.finDeTour = null;
  while (duel.defausseEnAttente?.restant > 0 && duel[duel.defausseEnAttente.cote]?.main.length) {
    rpgDefausserCarte(duel, duel.defausseEnAttente.cote);
  }
  duel.defausseEnAttente = null;
  duel.fenetreReponse = false;
  duel.annonce = null;
  detruireEphemeres(duel);
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
  annulerBonusTemporaires(duel, duel.tour); // le bonus meurt avec le tour qui l’a vu jouer
  annulerInfiltrations(duel); // l’Infiltration aussi : redevenues bloquables
  // Le gel (la Poigne de givre, le Verglas) compte les tours du contrôleur de
  // la créature figée : la fin de chacun de SES tours en décoche un.
  for (const entite of duel[duel.tour].creatures) {
    if (!(entite.gelToursRestants > 0)) continue;
    entite.gelToursRestants -= 1;
    if (entite.gelToursRestants <= 0) duel.log.push(`${entite.name} n’est plus gelée.`);
  }
  // Le Grand Voile blanc et le blocage forcé « ce tour » (l’Embuscade)
  // meurent avec le tour en cours.
  duel.brouillardCombat = false;
  for (const cote of ['joueur', 'sorcier']) {
    for (const entite of duel[cote].creatures) {
      if (entite.blocageForce?.portee === 'tour') entite.blocageForce = null;
    }
  }
  duel.tour = autre(duel.tour);
  duel.phase = 'debut';
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
  resoudreEchos(duel);              // les échos dus au camp dont le tour s'ouvre
  duel.phase = 'principale';
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

/** Le sorcier annonce sa prochaine carte sans la résoudre. La carte paie son
 *  coût à la résolution, ou au moment où le joueur la contre.
 *  Ouvre la fenêtre de réponse : le joueur peut répondre avec une magie rapide, ou laisser passer.
 *  Retourne null quand le sorcier n'a plus rien à jouer. */
export function rpgSorcierAnnonceSuivante(duel, rng = Math.random) {
  if (duel.annonce) return duel.annonce;
  const coup = choisirCarteIA(duel, 'sorcier', { ia: duel.sorcier.ia, rng });
  if (!coup) return null;
  duel.annonce = { cote: 'sorcier', carteId: coup.carteId, cibleId: coup.cibleId ?? null, cibleAllieeId: coup.cibleAllieeId ?? null };
  duel.fenetreReponse = true;
  duel.log.push(`Le sorcier annonce ${duelCardById(coup.carteId)?.name ?? magieById(coup.carteId)?.name ?? armeById(coup.carteId)?.name ?? coup.carteId}.`);
  return duel.annonce;
}

/** Laisser passer : résout la carte annoncée (paiement et effet). */
export function rpgSorcierResoudreAnnonce(duel) {
  const annonce = duel.annonce;
  if (!annonce) return { ok: false, raison: 'aucune-annonce' };
  duel.annonce = null;
  duel.fenetreReponse = false;
  const res = armeById(annonce.carteId)
    ? rpgJouerArme(duel, 'sorcier', annonce.carteId, annonce.cibleId)
    : duelCardById(annonce.carteId)
      ? rpgJouerCreature(duel, 'sorcier', annonce.carteId, annonce.cibleId)
      : rpgLancerMagie(duel, 'sorcier', annonce.carteId, annonce.cibleId, annonce.cibleAllieeId ?? null);
  rpgActionsEtat(duel);
  return { ...res, carteId: annonce.carteId };
}

/**
 * Le sorcier active les armes activables de ses créatures (le Bâton des
 * citernes) : après ses annonces, chaque activation achète un serpent qui
 * attaquera ce tour-ci — le mana restant s'évaporerait sinon. Il garde
 * toutefois de quoi contrer (4 manas) s'il tient un contresort « carte ».
 */
export function rpgSorcierActiverArmes(duel) {
  const actives = [];
  const tientContresort = duel.sorcier.main.some((id) => magieById(id)?.effet?.type === 'contresort'
    && magieById(id)?.effet?.cible === 'carte');
  const reserve = tientContresort ? 4 : 0;
  for (const porteur of duel.sorcier.creatures) {
    const carte = armeById(porteur.arme?.carteId ?? '');
    const activation = carte?.activation;
    if (!activation) continue;
    const cout = (Number(activation.cout) || 0) + reserve;
    let garde = 8;
    while (garde-- > 0 && rpgPeutPayer(duel.sorcier, { cost: cout })) {
      const res = rpgActiverArme(duel, 'sorcier', porteur.id);
      if (!res.ok) break;
      actives.push(porteur);
    }
  }
  return actives;
}

/** Le sorcier convertit son mana de glace restant en capacités activées (la
 *  foudre du Père des corbeaux), tant qu'un coup en vaut la peine. */
export function rpgSorcierActiverCapacitesIA(duel, rng = Math.random) {
  const actives = [];
  let garde = 6;
  while (garde-- > 0) {
    const coup = choisirActivationIA(duel, 'sorcier', { ia: duel.sorcier.ia, rng });
    if (!coup) break;
    const res = rpgActiverCapacite(duel, 'sorcier', coup.entiteId, coup.cibleId);
    if (!res.ok) break;
    actives.push(res);
  }
  return actives;
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
  rpgSorcierActiverArmes(duel);
  rpgSorcierActiverCapacitesIA(duel, rng);
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
