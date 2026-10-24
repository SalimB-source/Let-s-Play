/**
 * Le duel de sorciers — moteur « façon Magic » des règles v3.
 *
 * Règles : la partie commence avec une main de 5 cartes et une table vide
 * (3 cartes dans le mode sans terrains, voir `rpgManaEssai.js`).
 * Les terrains produisent du mana coloré, les créatures ont le mal
 * d'invocation, les attaquants sont déclarés avant le combat et le défenseur
 * choisit ses bloqueurs. Les magies rapides ouvrent une fenêtre de réponse.
 */

import {
  RPG_DUEL_CARDS,
  RPG_ELEMENTS,
  armeById,
  cardById,
  cardColorCost,
  cardColors,
  cardHasPrintedType,
  cardResonanceGroup,
  cardReceivesResonance,
  resonanceGroupLabel,
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
  choisirCouleurManaIA,
  couleurEngagement,
} from './rpgAI.js';
import { rpgEstCartePirate } from './rpgLettresDeMarque.js';
import {
  RPG_MANA_ESSAI_CARTES_EXCLUES,
  RPG_MANA_ESSAI_CHAMP_MAX,
  RPG_MANA_ESSAI_MAIN_DEPART,
  RPG_MANA_ESSAI_MAIN_MAX,
  RPG_MANA_ESSAI_MAX,
  RPG_MODE_MANA_ESSAI,
} from './rpgManaEssai.js';

/* Tout le monde PART à 25 PV : le joueur comme chaque sorcier adverse. La
 * puissance d'un étage du mode Histoire ne gonfle plus les PV (bonus à 0) —
 * elle reste affichée sur la fiche d'étage comme indice de difficulté, la
 * vraie difficulté venant du deck et du profil d'IA du sorcier.
 *
 * Mais 25 n'est plus un PLAFOND : c'est un point de départ. Tout gain de vie
 * (soin, Tribut, transfert) qui porte la vie au-dessus du maximum courant
 * fait monter ce maximum : la réserve de vie du sorcier s'élargit et le
 * gain est gardé. `pvMax` reste ainsi « la plus haute vie tenue » et l'écart
 * `pvMax - pv` reste la santé manquante.
 *
 * `RPG_PV_PLAFOND` est la soupape de réglage : `null` = aucune limite (la
 * réserve grossit sans borne), un nombre = la vie ne peut jamais dépasser
 * ce plafond (40, 50… pour re-barrer le jeu sans toucher au moteur). */
export const RPG_PV_JOUEUR = 25;
export const RPG_PV_SORCIER_BASE = 25;
export const RPG_PV_SORCIER_PAR_PUISSANCE = 0;
export const RPG_PV_PLAFOND = null;
export const RPG_MAIN_DEPART = 5;
/**
 * Esquive : une créature qui l'imprime (ou dont l'arme la donne) échappe à
 * **30 % des attaques, Magies et Sorcelleries** — leur effet sur elle est
 * annulé, pas diminué. Les capacités ne sont jamais esquivées. Le tirage vient
 * du hasard du duel (`hasardParDuel`), donc une même partie reste reproductible.
 */
export const RPG_ESQUIVE_CHANCE = 0.3;
export const RPG_COULEURS = RPG_ELEMENTS;
export const RPG_COUP_RAPIDE_ECHEC_CHANCE = 0.3;

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
// Les renvois en main, dans l'ordre où ils arrivent. Comme le journal des
// destructions, il vit hors de l'état sérialisé : la table s'en sert pour
// reconnaître une créature qui **quitte la table sans mourir**, quelle que
// soit l'action qui l'a renvoyée — une magie, le rebond d'une créature
// (le Sonneur fêlé, le Léviathan) ou une riposte du sorcier.
const renvoisParDuel = new WeakMap();
// Les blessures infligées à une créature par un **effet** — magie, sorcellerie,
// capacité ou arrivée — dans l'ordre où elles tombent. Le combat a son propre
// chemin (simultané) et n'y figure pas : la table y lit la couleur de la
// source pour allumer la roue de feu de la Braise.
const blessuresParDuel = new WeakMap();
// Hors de l’état JSON : les sauvegardes restent sérialisables et les tests
// peuvent fournir un générateur déterministe. Une partie restaurée utilise Math.random.
const hasardParDuel = new WeakMap();
// Les groupes de Résonance sont les TYPES imprimés des cartes qui la portent
// (Samouraï, Viking…), plus les éléments pour les rares sources qui en
// dépendent encore. La liste se déduit du catalogue : une carte qui imprime la
// Résonance s'y ajoute d'elle-même, sans table à tenir à la main.
const GROUPES_RESONANCE = [...new Set(
  [...RPG_ELEMENTS, ...RPG_DUEL_CARDS.filter((carte) => carte.resonance).map(cardResonanceGroup)],
)];

/** Les Sites occupent le champ, mais ne sont jamais des créatures de combat. */
function estSite(entiteOuCarte) {
  if (!entiteOuCarte) return false;
  const carte = entiteOuCarte.carteId
    ? duelCardById(entiteOuCarte.carteId)
    : entiteOuCarte;
  return carte?.kind === 'site';
}

export function rpgNombreDestructions(duel) {
  return destructionsParDuel.get(duel)?.length ?? 0;
}

export function rpgDestructionsDepuis(duel, position = 0) {
  return (destructionsParDuel.get(duel) ?? [])
    .slice(Math.max(0, position))
    .map((evenement) => ({ ...evenement, sourceElements: [...evenement.sourceElements] }));
}

/** Les créatures déjà renvoyées en main depuis le début du duel. */
export function rpgRenvoisEnMain(duel) {
  return (renvoisParDuel.get(duel) ?? []).map((evenement) => ({ ...evenement }));
}

// Les prises en cale par Abordage : hors de l'état JSON, comme les renvois et
// les soins. Deux rôles : `prisesEnCaleParDuel` garde l'historique du duel pour
// que la table ne traite jamais une créature kidnappée comme une carte détruite
// (`destruction_hit`), et `prisesAudioParDuel` livre à chaque rendu les prises
// toutes fraîches pour déclencher le cliquetis de chaînes d'abordage (`abordage`).
const prisesEnCaleParDuel = new WeakMap();
const prisesAudioParDuel = new WeakMap();

/** Les créatures déjà prises en cale depuis le début du duel. */
export function rpgPrisesEnCale(duel) {
  return (prisesEnCaleParDuel.get(duel) ?? []).map((evenement) => ({ ...evenement }));
}

/** Les prises en cale survenues depuis le dernier relevé — le journal se vide. */
export function rpgConsommerPrisesEnCale(duel) {
  if (!duel) return [];
  const journal = prisesAudioParDuel.get(duel) ?? [];
  prisesAudioParDuel.delete(duel);
  return journal;
}

// Les arrivées sonores des créatures maritimes : des journaux audio hors
// état JSON, sur le modèle des prises en cale. Quand une créature jouée depuis
// la main entre en jeu via `rpgJouerCreature`, le moteur la classe une seule
// fois : un **navire** — type imprimé « Navire », quel que soit son set — est
// accueilli par l'ambiance de quai (`navire_arrivee`) ; toute autre créature
// pirate du set Lettres de Marque l'est par un accueil alterné entre le cri
// « Ahoy ! » (`pirate_arrivee`) et le dialogue « Alright »
// (`pirate_dialogue`). Le type Navire prime : un navire pirate ne fait jamais
// retentir les deux sons. Ni les jetons (nés d'un effet), ni les réanimations,
// ni les détenues rendues en jeu par l'ouverture d'une cale ne passent par ce
// journal : le moteur précise lui-même que ces retours ne sont pas des
// arrivées. La page consomme les journaux à chaque rendu.
const arriveesPirateAudioParDuel = new WeakMap();
const arriveesNavireAudioParDuel = new WeakMap();

/** Les arrivées de pirates survenues depuis le dernier relevé — le journal se vide. */
export function rpgConsommerArriveesPirate(duel) {
  if (!duel) return [];
  const journal = arriveesPirateAudioParDuel.get(duel) ?? [];
  arriveesPirateAudioParDuel.delete(duel);
  return journal;
}

/** Les arrivées de navires survenues depuis le dernier relevé — le journal se vide. */
export function rpgConsommerArriveesNavire(duel) {
  if (!duel) return [];
  const journal = arriveesNavireAudioParDuel.get(duel) ?? [];
  arriveesNavireAudioParDuel.delete(duel);
  return journal;
}

function journaliserArriveeCreature(duel, cote, entite) {
  const carte = duelCardById(entite.carteId);
  const evenement = { entityId: entite.id, carteId: entite.carteId, cote };
  if (cardHasPrintedType(carte, 'Navire')) {
    const journal = arriveesNavireAudioParDuel.get(duel) ?? [];
    journal.push(evenement);
    arriveesNavireAudioParDuel.set(duel, journal);
  } else if (rpgEstCartePirate(carte)) {
    const journal = arriveesPirateAudioParDuel.get(duel) ?? [];
    journal.push(evenement);
    arriveesPirateAudioParDuel.set(duel, journal);
  }
}

function journaliserPriseEnCale(duel, capteur, coteCapteur, victime, coteVictime) {
  const evenement = {
    entityId: victime.id,
    carteId: victime.carteId,
    cote: coteVictime,
    capteurId: capteur.id,
    capteurCarteId: capteur.carteId,
    coteCapteur,
  };
  const historique = prisesEnCaleParDuel.get(duel) ?? [];
  historique.push(evenement);
  prisesEnCaleParDuel.set(duel, historique);
  const frais = prisesAudioParDuel.get(duel) ?? [];
  frais.push({ ...evenement });
  prisesAudioParDuel.set(duel, frais);
}

/** Combien de blessures d'effet le duel a encaissées depuis son début. */
export function rpgNombreBlessures(duel) {
  return blessuresParDuel.get(duel)?.length ?? 0;
}

/** Les blessures parues depuis une position du journal (0 : toutes). */
export function rpgBlessuresDepuis(duel, position = 0) {
  return (blessuresParDuel.get(duel) ?? [])
    .slice(Math.max(0, position))
    .map((evenement) => ({ ...evenement, elements: [...evenement.elements] }));
}

/**
 * La dernière blessure d'une créature : `{ entityId, cote, elements,
 * sourceCarteId, recus, absorbes, pvApres, bouclierApres, mortelle }`.
 * `pvApres`/`bouclierApres` disent si l'état actuel de la créature est
 * **encore** celui de cette blessure — la table n'allume donc la roue de feu
 * que pour un coup qui vient de tomber, jamais pour une ancienne brûlure.
 * `sourceCarteId` nomme la carte du coup quand le moteur la connaît (une
 * magie lancée) : l'Éclair du marteau se reconnaît ainsi parmi les autres
 * blessures de Neige, et sa foudre ne tombe que pour lui.
 */
export function rpgDerniereBlessure(duel, entityId) {
  const journal = blessuresParDuel.get(duel);
  if (!journal?.length) return null;
  for (let i = journal.length - 1; i >= 0; i -= 1) {
    if (journal[i].entityId === entityId) {
      return { ...journal[i], elements: [...journal[i].elements] };
    }
  }
  return null;
}

function journaliserBlessure(duel, cote, entite, blessure) {
  const journal = blessuresParDuel.get(duel) ?? [];
  journal.push({
    entityId: entite.id,
    cote,
    elements: normaliserCouleurs(blessure.elements),
    // La carte du coup, quand elle est connue : la couleur suffit à la roue
    // de feu, mais la foudre du marteau exige de nommer sa carte.
    sourceCarteId: blessure.sourceCarteId ?? null,
    recus: blessure.recus,
    absorbes: blessure.absorbes,
    pvApres: entite.pv,
    bouclierApres: entite.bouclier ?? 0,
    // `mortelle` : la créature a **quitté la table** sous ce coup. Une
    // Tenacité programmée ne change rien ici : la mort a bien eu lieu.
    mortelle: Boolean(blessure.mortelle),
  });
  blessuresParDuel.set(duel, journal);
}

function journaliserRenvoiEnMain(duel, cote, entite) {
  const journal = renvoisParDuel.get(duel) ?? [];
  journal.push({ entityId: entite.id, carteId: entite.carteId, cote });
  renvoisParDuel.set(duel, journal);
}

function journaliserDestruction(duel, entite, sourceElements = []) {
  const journal = destructionsParDuel.get(duel) ?? [];
  journal.push({
    entityId: entite.id,
    sourceElements: normaliserCouleurs(sourceElements),
  });
  destructionsParDuel.set(duel, journal);
}

const ELEMENT_LABELS = { braise: 'Braise', eau: 'Eau', sable: 'Sable', neige: 'Neige', tenebres: 'Ténèbres' };
const normaliserCouleurs = (couleurs) => [...new Set((Array.isArray(couleurs) ? couleurs.flat(Infinity) : [couleurs]).filter(Boolean))];
// Libellé des couleurs d'une protection : « Braise », ou « l'Eau et la Neige »
// quand `contre` est une liste (la Lionne du midi ardent).
const labelCouleursProtection = (contre) => normaliserCouleurs(contre)
  .map((couleur) => ELEMENT_LABELS[couleur] ?? couleur).join(' et ');
const manaVide = () => ({ braise: 0, eau: 0, sable: 0, neige: 0, tenebres: 0 });
// Tolère une réserve déclarée sans toutes les couleurs (objets de test,
// paquets classiques) : une clé absente compte pour zéro, jamais NaN.
const totalMana = (camp) => RPG_COULEURS.reduce((somme, c) => somme + (Number(camp.mana[c]) || 0), 0);
const totalCapaciteMana = (camp) => RPG_COULEURS.reduce((somme, c) => somme + (camp.manaMax?.[c] ?? 0), 0);

/** Identité fixée au lancement du duel d'essai ; une pioche ne change jamais
 * les couleurs proposées. Les decks historiques ne passent pas par ici. */
function couleursManaEssai(deck, couleurs) {
  const liste = couleurs ?? [...new Set(deck.flatMap((id) => cardColors(id)))];
  if (!Array.isArray(liste) || liste.length < 1 || liste.length > 3
    || liste.length !== new Set(liste).size || liste.some((couleur) => !RPG_COULEURS.includes(couleur))) {
    throw new Error('Un duel sans terrains exige une identité de 1 à 3 couleurs.');
  }
  const valides = [...liste];
  if (deck.some((id) => terrainById(id) || RPG_MANA_ESSAI_CARTES_EXCLUES.includes(id)
    || !cardById(id) || cardColors(id).some((couleur) => !valides.includes(couleur)))) {
    throw new Error('Un duel sans terrains ne peut contenir ni terrain, ni effet lié aux terrains, ni carte hors identité.');
  }
  return valides;
}

// La réserve sert au paiement ; la liste garde l'ordre des orbes gagnées,
// pour que chaque nouveau mana allume la prochaine place sans recolorer les précédentes.
const etatManaEssai = (couleurs) => ({ manaMax: manaVide(), manaSources: [], couleurs, manaChoixEnAttente: false, fatigue: 0 });

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
 * Change le générateur d'un duel déjà créé — les tests forcent ainsi une
 * esquive réussie ou manquée sans dépendre du hasard.
 */
export function rpgReglerHasard(duel, rng = Math.random) {
  hasardParDuel.set(duel, typeof rng === 'function' ? rng : Math.random);
  return duel;
}

/**
 * Nouveau duel : tables vides, 0 sable, puis chaque camp pioche 5 cartes.
 * `decks` : listes d'identifiants de cartes (créatures pour l'instant).
 * `sorcierIA` : profil de l'IA ({ niveau, style }) — voir rpgAI.js. Chaque
 * sorcier du mode Histoire peut porter le sien.
 */
export function rpgNouveauDuel({ joueurDeck = [], sorcierDeck = [], sorcierPuissance = 0, sorcierIA = null, rng = Math.random, modeMana = null, joueurCouleurs = null, sorcierCouleurs = null, pvp = false } = {}) {
  const essaiMana = modeMana === RPG_MODE_MANA_ESSAI;
  const identiteJoueur = essaiMana ? couleursManaEssai(joueurDeck, joueurCouleurs) : null;
  const identiteSorcier = essaiMana ? couleursManaEssai(sorcierDeck, sorcierCouleurs) : null;
  const duel = {
    ...(essaiMana ? { modeMana: RPG_MODE_MANA_ESSAI, manaEssaiDemarre: false } : {}),
    ...(pvp ? { pvp: true } : {}),
    tour: 'joueur',
    joueur: { pv: RPG_PV_JOUEUR, pvMax: RPG_PV_JOUEUR, degatsRecus: 0, mana: manaVide(), ...(essaiMana ? etatManaEssai(identiteJoueur) : {}), bouclier: 0, terrainPose: false, deck: melangerDeck(joueurDeck, rng), main: [], creatures: [], terrains: [], cimetiere: [], retoursProgrammes: [], bonusTemporaires: [], degatsEchos: [] },
    sorcier: {
      pv: rpgSorcierPv(sorcierPuissance),
      pvMax: rpgSorcierPv(sorcierPuissance),
      degatsRecus: 0,
      puissance: sorcierPuissance,
      ia: sorcierIA,
      mana: manaVide(),
      ...(essaiMana ? etatManaEssai(identiteSorcier) : {}),
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
    // UNE SEULE PHASE D'ATTAQUE PAR TOUR : le camp qui a déclaré son combat est
    // noté ici ('joueur' ou 'sorcier'). Une seconde déclaration du même camp est
    // refusée avant que le tour ne passe (`rpgFinDeTour` remet le champ à null) ;
    // un refus de déclaration, lui, ne consomme rien.
    attaqueJouee: null,
    finDeTour: null,
    // Carte annoncée par le sorcier, pas encore résolue : le joueur peut répondre ou laisser passer.
    annonce: null,
    // Défausse en attente (ex. Jörmungandr côté joueur) : { cote, restant, sourceCarteId }
    defausseEnAttente: null,
    // Récompense d'un Site qui attend le choix de sa créature alliée.
    siteEnAttente: null,
    // Mulligan : chaque camp a droit à UN échange, avant le premier tour.
    mulliganFait: { joueur: false, sorcier: false },
    log: [],
    combatFeed: [],
  };
  hasardParDuel.set(duel, rng);
  // Mode sans terrains : main de départ réduite à trois cartes. Le mode
  // classique conserve sa main historique de cinq cartes.
  const mainDepart = essaiMana ? RPG_MANA_ESSAI_MAIN_DEPART : RPG_MAIN_DEPART;
  for (let i = 0; i < mainDepart; i += 1) {
    rpgPiocher(duel, 'joueur');
    rpgPiocher(duel, 'sorcier');
  }
  // Témoin de la main de départ : le mulligan n'est légal que tant qu'elle est
  // intacte (et il la conserve, puisque l'on pioche autant qu'on écarte).
  duel.mainDepart = { joueur: duel.joueur.main.length, sorcier: duel.sorcier.main.length };
  // Le premier joueur ne pioche pas de sixième carte au tour 1. Son premier
  // mana (même en mono) n'arrive qu'après les mulligans des deux camps.
  if (essaiMana) duel.joueur.manaChoixEnAttente = true;
  return duel;
}

/** Fin des deux mulligans : ouvre le premier tour et accorde le premier mana.
 * L'interface appelle ceci à la fermeture du volet, jamais pendant l'échange.
 * Le mono choisit tout seul ; en multi, le joueur doit faire son choix. */
export function rpgDemarrerManaEssai(duel) {
  if (duel?.modeMana !== RPG_MODE_MANA_ESSAI || duel.manaEssaiDemarre) return { ok: false, raison: 'mode' };
  if (!duel.mulliganFait?.joueur || !duel.mulliganFait?.sorcier) return { ok: false, raison: 'mulligan' };
  duel.manaEssaiDemarre = true;
  if (duel.joueur.couleurs.length === 1) return rpgChoisirCouleurMana(duel, 'joueur', duel.joueur.couleurs[0]);
  return { ok: true, choixEnAttente: true };
}

/** Choisit uniquement la couleur du NOUVEAU mana permanent (pas celle des
 * sources des tours passés). Ce choix vaut une fois par tour et ne peut pas
 * dépasser dix sources. L'IA passe exactement par cette même règle. */
export function rpgChoisirCouleurMana(duel, cote, couleur) {
  if (duel?.modeMana !== RPG_MODE_MANA_ESSAI || !duel.manaEssaiDemarre) return { ok: false, raison: 'mode' };
  if (!['joueur', 'sorcier'].includes(cote) || duel.tour !== cote) return { ok: false, raison: 'tour' };
  const camp = duel[cote];
  if (!camp.manaChoixEnAttente) return { ok: false, raison: 'deja-choisi' };
  if (!camp.couleurs.includes(couleur)) return { ok: false, raison: 'couleur' };
  if (totalCapaciteMana(camp) >= RPG_MANA_ESSAI_MAX) return { ok: false, raison: 'plafond' };
  camp.manaMax[couleur] += 1;
  camp.manaSources.push(couleur);
  camp.mana[couleur] += 1;
  camp.manaChoixEnAttente = false;
  duel.log.push(`${cote === 'joueur' ? 'Vous gagnez' : 'Le sorcier gagne'} un mana ${ELEMENT_LABELS[couleur]} permanent (${totalCapaciteMana(camp)}/${RPG_MANA_ESSAI_MAX}).`);
  return { ok: true, couleur };
}

// Événements de présentation uniquement : hors de l'état sauvegardé du duel.
const presentations = new WeakMap();
function presenter(duel, evenement) {
  const file = presentations.get(duel) ?? [];
  file.push(evenement);
  presentations.set(duel, file);
}
export function rpgConsommerPresentations(duel) {
  const file = presentations.get(duel) ?? [];
  presentations.delete(duel);
  return file;
}

// Les soins, eux aussi hors de l'état sauvegardé : chaque gain de vie RÉEL —
// donc jamais nul — y laisse `{ cote, entityId, montant }`, `entityId` nul
// quand c'est le sorcier lui-même qui regagne des PV. La page en tire l'éclat
// vert et le son du soin, quelle que soit la source : magie, arrivée,
// destruction, arme, Tribut ou transfert. Le journal observe sans jamais rien
// décider : aucune règle ne le lit.
const soinsParDuel = new WeakMap();
function journaliserSoin(duel, cote, montant, entityId = null) {
  if (!(montant > 0)) return;
  const journal = soinsParDuel.get(duel) ?? [];
  journal.push({ cote, entityId, montant });
  soinsParDuel.set(duel, journal);
}
/** Les gains de vie survenus depuis le dernier relevé — le journal se vide. */
export function rpgConsommerSoins(duel) {
  if (!duel) return [];
  const journal = soinsParDuel.get(duel) ?? [];
  soinsParDuel.delete(duel);
  return journal;
}

/**
 * Un gain de vie sur le sorcier (soin, Tribut, transfert) : la vie monte
 * TOUJOURS de la totalité du montant — 25 n'est plus un plafond — et le
 * maximum suit : la réserve gagnée au-delà de la vie la plus haute jamais
 * tenue est conservée (`pvMax` = la plus haute vie tenue, `pvMax - pv` = la
 * santé manquante). `RPG_PV_PLAFOND`, s'il est réglé, borne la réserve.
 * Renvoie le gain réellement appliqué (zéro si rien n'a été donné).
 */
export function rpgGagnerVie(duel, cote, montant) {
  const camp = duel?.[cote];
  if (!camp) return 0;
  const n = Math.max(0, Number(montant) || 0);
  if (!n) return 0;
  const avant = camp.pv;
  camp.pv += n;
  const plafond = RPG_PV_PLAFOND ?? Infinity;
  const max = Math.min(plafond, Math.max(camp.pvMax ?? camp.pv, camp.pv));
  camp.pvMax = max;
  if (camp.pv > max) camp.pv = max;   // la soupape de plafond rogne l'excédent
  const gagne = camp.pv - avant;
  journaliserSoin(duel, cote, gagne);
  return gagne;
}
function presenterEffet(duel, cote, carteId) {
  if (duelCardById(carteId)?.kind === 'creature') {
    presenter(duel, { type: 'effet', cote, carteId });
  }
}

/** Pioche 1 carte du deck vers la main ; null si le deck est vide. */
export function rpgPiocher(duel, cote) {
  const camp = duel[cote];
  if (!camp.deck.length) return null;
  const carte = camp.deck.pop();
  camp.main.push(carte);
  presenter(duel, { type: 'pioche', cote, carteId: carte });
  return carte;
}

/**
 * Pioche une carte d'un type imprimé donné, choisie uniformément au hasard
 * parmi les exemplaires encore dans le deck. Ce n'est pas une pioche du
 * dessus suivie d'un tri : s'il ne reste aucune carte du type demandé, rien
 * ne rejoint la main. Le reste du deck garde son ordre.
 */
function piocherCarteDeType(duel, cote, type) {
  const camp = duel?.[cote];
  if (!camp?.deck?.length || !type) return null;
  const candidates = [];
  camp.deck.forEach((carteId, index) => {
    if (cardHasPrintedType(carteId, type)) candidates.push(index);
  });
  if (!candidates.length) return null;
  const rng = hasardParDuel.get(duel) ?? Math.random;
  const choix = Math.min(
    candidates.length - 1,
    Math.max(0, Math.floor(rng() * candidates.length)),
  );
  const [carte] = camp.deck.splice(candidates[choix], 1);
  camp.main.push(carte);
  presenter(duel, { type: 'pioche', cote, carteId: carte });
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

/**
 * Ouvre la fenêtre de défausse d'un camp — ou la PROLONGE si elle est déjà
 * ouverte. Les effets d'une même fenêtre se CUMULENT : deux Butins qui
 * touchent le sorcier, un Butin et le Masque du guetteur, deux « Nom effacé »…
 * chaque déclencheur ajoute ses défausses aux précédentes au lieu d'écraser
 * l'attente (`restant` perdait alors les demandes antérieures — deux Butins
 * ne faisaient défausser qu'une seule carte). `motif` ('effet', 'fin-de-tour')
 * habille l'écran de défausse ; omis, l'attente garde la forme historique
 * `{ cote, restant, sourceCarteId }`.
 */
function ouvrirDefausseEnAttente(duel, cote, restant, sourceCarteId = null, motif = null) {
  const n = Math.max(0, Math.floor(Number(restant) || 0));
  const camp = duel?.[cote];
  if (!n || !camp?.main.length) return duel?.defausseEnAttente ?? null;
  const attente = duel.defausseEnAttente;
  if (attente?.cote === cote && attente.restant > 0) {
    // Même fenêtre : le total demandé ne dépasse jamais les cartes en main.
    attente.restant = Math.min(attente.restant + n, camp.main.length);
    return attente;
  }
  duel.defausseEnAttente = motif
    ? { cote, restant: Math.min(n, camp.main.length), sourceCarteId, motif }
    : { cote, restant: Math.min(n, camp.main.length), sourceCarteId };
  return duel.defausseEnAttente;
}

/** Cartes à défausser en fin de tour dans le mode sans terrains : au-delà de
 * six cartes en main, l'excédent part au cimetière. Hors essai, aucune limite
 * de fin de tour ne s'applique (la main classique n'est pas plafonnée ici). */
export function rpgExcesMainFinDeTour(duel, cote) {
  if (duel?.modeMana !== RPG_MODE_MANA_ESSAI) return 0;
  const camp = duel?.[cote];
  if (!camp) return 0;
  return Math.max(0, camp.main.length - RPG_MANA_ESSAI_MAIN_MAX);
}

/**
 * Ouvre la défausse de fin de tour du mode sans terrains : le camp désigné
 * doit se séparer de son excédent de main (voir `rpgDefausserCarte`, qui
 * referme l'attente carte après carte). L'interface du joueur s'en sert pour
 * laisser CHOSIR les cartes défaussées avant que le tour ne se ferme ;
 * `rpgFinDeTour`, lui, défausse d'office (choix de l'IA) ce qui resterait.
 *
 * @returns {number} le nombre de cartes à défausser (0 = rien à ouvrir)
 */
export function rpgPreparerDefausseFinDeTour(duel, cote) {
  const exces = rpgExcesMainFinDeTour(duel, cote);
  if (!exces) return 0;
  if (duel.defausseEnAttente?.cote === cote && duel.defausseEnAttente.restant > 0) {
    return duel.defausseEnAttente.restant;
  }
  duel.defausseEnAttente = { cote, restant: exces, sourceCarteId: null, motif: 'fin-de-tour' };
  duel.log.push(`${cote === 'joueur' ? 'Vous avez' : 'Le sorcier a'} ${duel[cote].main.length} cartes en main : ${exces} carte${exces > 1 ? 's' : ''} à défausser pour redescendre à ${RPG_MANA_ESSAI_MAIN_MAX}.`);
  return exces;
}

/** Le mulligan est ouvert tant que la partie n'a pas commencé : table vide et
 *  main encore égale à celle du départ. Un seul échange par camp. */
export function rpgPeutMulligan(duel, cote = 'joueur') {
  if (!duel || duel.mulliganFait?.[cote]) return false;
  if (duel.manaEssaiDemarre || duel.annonce) return false;
  if (!duel.pvp && duel.tour !== 'joueur') return false;
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
  if (duel.pvp) {
    duel.log.push(ecartees.length
      ? `${cote === 'joueur' ? 'Vous échangez' : 'Le sorcier échange'} ${fois}.`
      : (cote === 'joueur' ? 'Vous gardez votre main de départ.' : 'Le sorcier garde sa main de départ.'));
  } else {
    duel.log.push(ecartees.length
      ? (cote === 'joueur'
        ? `Vous écartez ${ecartees.map(nom).join(', ')} et piochez ${fois}.`
        : `Le sorcier écarte ${ecartees.map(nom).join(', ')} et pioche ${fois}.`)
      : (cote === 'joueur' ? 'Vous gardez votre main de départ.' : 'Le sorcier garde sa main de départ.'));
  }
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
  if (camp.manaChoixEnAttente) return false;
  // Le Prix (set Ténèbres) : un coût supplémentaire en PV ne peut jamais
  // faire descendre sous 1 — sinon la carte est refusée, rien n'est payé.
  if ((carte.prixPv ?? 0) > 0 && camp.pv <= carte.prixPv) return false;
  const sources = sourcesManaDisponibles(camp);
  const cout = Math.max(0, carte.cost ?? 0);
  return sources.length >= cout && sourcesCouvrentPips(sources, cardColorCost(carte));
}

/** Paie d'abord les pips colorés obligatoires, puis le coût générique. Les
 *  terrains produisant plusieurs couleurs sont réservés aux pips qui en ont besoin. */
function payer(duel, cote, carte) {
  const camp = duel[cote];
  // Le Prix en PV se paie avec le mana : le contrôle de `rpgPeutPayer`
  // garantit qu'il en reste au moins un après paiement.
  if ((carte.prixPv ?? 0) > 0) {
    camp.pv = Math.max(1, camp.pv - carte.prixPv);
    duel.log.push(`${cote === 'joueur' ? 'Vous payez' : 'Le sorcier paie'} ${carte.prixPv} PV pour ${carte.name ?? 'la carte'}.`);
  }
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
  // Dans l'essai, seul le pip impose sa couleur : pour le générique, utiliser
  // d'abord les autres réserves afin de garder la couleur exigée pour la suite
  // du tour. Les duels classiques conservent leur ordre de paiement historique.
  const prioriteGenerique = duel.modeMana === RPG_MODE_MANA_ESSAI
    ? [
        ...RPG_COULEURS.filter((couleur) => !coutCouleur[couleur]),
        ...RPG_COULEURS.filter((couleur) => coutCouleur[couleur]),
      ]
    : RPG_COULEURS;
  for (const couleur of prioriteGenerique) {
    // Une réserve sans cette couleur (objet partiel) ne produit ni NaN ni
    // nouvelle clé : elle ne contribue tout simplement pas au paiement.
    const dispo = Number.isFinite(camp.mana[couleur]) ? camp.mana[couleur] : 0;
    const pris = Math.min(dispo, reste);
    if (Number.isFinite(camp.mana[couleur])) camp.mana[couleur] -= pris;
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
  if (duel.modeMana === RPG_MODE_MANA_ESSAI) return { ok: false, raison: 'sans-terrains' };
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
  if (duel.modeMana === RPG_MODE_MANA_ESSAI) return { ok: false, raison: 'sans-terrains' };
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
  presenterEffet(duel, cote, carte.id);
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
    const prochainBonus = !estSite(carte) && tarekEnJeu && cardColors(carte).includes('sable') ? 1 : 0;
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
 * **autres** créatures de son camp gagnent +0/+1. Même contrat que l'aura
 * Sable : chaque entité ne garde que l'écart appliqué (`auraAmaniBonus`), pour
 * qu'une créature qui entre ou qui meurt ne fasse pas dériver les statistiques
 * déjà cumulées par la Furie ou d'autres renforts. L'égide compte **par source** :
 * chaque Amani protège toutes les créatures sauf elle-même, donc une seconde
 * Amani double le bonus des autres et protège la première. Comme toute aura,
 * l'égide ne franchit jamais la ligne du camp adverse. La perdre ne tue jamais :
 * au pire, 1 PV (la règle de la Résonance).
 */
function appliquerAuraAmani(duel, cote) {
  const camp = duel[cote];
  const nombreAmani = camp.creatures.filter((entite) => entite.carteId === 'amani-des-ksour').length;
  for (const entite of camp.creatures) {
    const sources = entite.carteId === 'amani-des-ksour'
      ? nombreAmani - 1
      : nombreAmani;
    const prochainBonus = estSite(entite) ? 0 : Math.max(0, sources);
    const delta = prochainBonus - (entite.auraAmaniBonus ?? 0);
    if (!delta) continue;
    entite.auraAmaniBonus = prochainBonus;
    entite.def = Math.max(1, entite.def + delta);
    entite.pvMax = Math.max(1, (entite.pvMax ?? entite.def) + delta);
    entite.pv = Math.max(1, entite.pv + delta);
  }
}

/**
 * La bannière de guerre — « tant que cette créature est en jeu, chaque fois
 * qu'un Samouraï de son camp attaque, il gagne +X/+X ». Le Daimyō du Soleil
 * rouge la porte.
 *
 * Ce n'est pas une aura mais un **déclenché** : le renfort se pose au moment où
 * l'attaque est déclarée (donc avant les blessures — la frappe du tour en
 * profite), et il reste **acquis** à la créature, comme la Furie. La bannière
 * ne reprend jamais ce qu'elle a donné : un Daimyō qui quitte la table, ou une
 * attaque qui se termine, laisse les Samouraïs grandis tels quels.
 *
 * Seul le camp de la source en profite — les Samouraïs du sorcier ne reçoivent
 * rien d'un Daimyō adverse, comme l'aura Sable de Tarek ne renforce que son
 * camp. Plusieurs bannières en jeu se cumulent : chacune compte pour un
 * déclenchement de plus. Le type se lit sur la ligne de type imprimée
 * (`cardReceivesResonance`), jamais sur la couleur ni sur le nom ; le Daimyō
 * lui-même est un Samouraï, donc sa propre attaque le grandit aussi.
 */
function appliquerBannieresAttaque(duel, cote, attaquants = []) {
  const sources = [];
  for (const entite of duel[cote].creatures) {
    if (!(entite.pv > 0)) continue;
    const carte = duelCardById(entite.carteId);
    if (carte?.banniere) sources.push({ nom: carte.name, banniere: carte.banniere });
  }
  if (!sources.length) return;
  for (const attaquant of attaquants) {
    if (!(attaquant.pv > 0)) continue;
    const carte = duelCardById(attaquant.carteId);
    const recues = sources.filter(({ banniere }) => cardReceivesResonance(carte, banniere.tribu));
    if (!recues.length) continue;
    const bonusAttaque = recues.reduce((total, { banniere }) => total + Math.max(0, Number(banniere.atk) || 0), 0);
    const bonusDefense = recues.reduce((total, { banniere }) => total + Math.max(0, Number(banniere.def) || 0), 0);
    if (!bonusAttaque && !bonusDefense) continue;
    attaquant.atk = Math.max(0, attaquant.atk + bonusAttaque);
    attaquant.pvMax = Math.max(1, (attaquant.pvMax ?? attaquant.def) + bonusDefense);
    attaquant.def = Math.max(1, attaquant.def + bonusDefense);
    attaquant.pv = Math.max(1, attaquant.pv + bonusDefense);
    duel.log.push(`Bannière ${recues.map(({ nom }) => nom).join(', ')} : ${attaquant.name} gagne +${bonusAttaque}/+${bonusDefense} en attaquant.`);
  }
}

/**
 * Déclare le déclenchement des bannières pour une attaque dont les attaquants
 * viennent d'être verrouillés. L'interface l'appelle à la déclaration même —
 * avant le choix des bloqueurs et avant les réponses rapides — pour que les
 * statistiques visibles pendant tout le combat soient déjà celles du Samouraï
 * grandi. `rpgLancerAttaque` reçoit ensuite `bannieresAppliquees: true` et ne
 * rejoue pas le déclenchement au moment des blessures.
 *
 * Le retour dit seulement si la déclaration est recevable ; sans bannière en
 * jeu, l'appel réussit et ne change rien.
 */
export function rpgAppliquerBannieresAttaque(duel, cote, attaquantIds = []) {
  const camp = duel?.[cote];
  if (!camp || duel.attaqueJouee === cote) return false;
  const ids = [...new Set(attaquantIds)];
  if (!ids.length) return false;
  const attaquants = ids.map((id) => camp.creatures.find((entite) => entite.id === id));
  if (attaquants.some((entite) => !entite || !rpgPeutAttaquer(entite))) return false;
  appliquerBannieresAttaque(duel, cote, attaquants);
  return true;
}

/**
 * Kenshi de la forge — l'aura de forge : tant qu'il est en jeu, **toutes les
 * autres créatures de son camp** gagnent +1/+0, quel que soit leur type. Une
 * aura ne franchit jamais la ligne du camp adverse.
 *
 * Le Kenshi ne se forge pas lui-même — il dit « les autres » : il ne reçoit que
 * l'aura de ses confrères, s'il y en a d'autres. Deux Kenshis du même camp se
 * donnent donc +1/+0 l'un à l'autre et +2/+0 au reste de leur camp.
 *
 * Chaque entité ne retient que l'écart appliqué (`auraKenshiBonus`), même
 * contrat que l'aura Sable et l'égide d'Amani : une arrivée ou une mort ne fait
 * jamais dériver les statistiques déjà gagnées par la Furie ou un autre renfort.
 * L'aura ne touche pas la défense : la perdre ne peut pas tuer, et l'attaque
 * retombe au plancher de 0.
 */
function appliquerAuraKenshi(duel) {
  for (const cote of ['joueur', 'sorcier']) {
    const sources = duel[cote].creatures
      .filter((entite) => entite.carteId === 'kenshi-de-la-forge');
    for (const entite of duel[cote].creatures) {
      const voulu = estSite(entite) ? 0 : sources.reduce((bonus, source) => {
        const aura = duelCardById(source.carteId)?.aura;
        if (source.id === entite.id && aura?.saufSoi) return bonus;
        return bonus + Math.max(0, Number(aura?.atk) || 0);
      }, 0);
      const delta = voulu - (entite.auraKenshiBonus ?? 0);
      if (!delta) continue;
      entite.auraKenshiBonus = voulu;
      entite.atk = Math.max(0, entite.atk + delta);
    }
  }
}

/**
 * Rafraîchit toutes les auras de présence après un changement du champ de
 * bataille (arrivée, mort, renvoi, retour programmé) : l'aura Sable de Tarek
 * et l'égide d'Amani sur chaque camp, l'aura de forge du Kenshi sur la table
 * entière, puis la Résonance de table. Chaque mécanisme ne pose que l'écart
 * qu'il détient déjà — voir les commentaires de `appliquerAuraSable`,
 * `appliquerAuraAmani`, `appliquerAuraKenshi` et `majResonance`.
 */
function rafraichirAuras(duel) {
  appliquerAuraSable(duel, 'joueur');
  appliquerAuraSable(duel, 'sorcier');
  appliquerAuraAmani(duel, 'joueur');
  appliquerAuraAmani(duel, 'sorcier');
  appliquerAuraKenshi(duel);
  majResonance(duel);
  // La Furie suit l'écart entre la défense actuelle et la DEF de base
  // imprimée : une aura qui déplace les PV peut donc aussi l'allumer ou
  // l'éteindre, même sans changer ce seuil.
  synchroniserFuries(duel);
}

/** Protection temporaire contre les effets et les créatures d'une couleur
 *  donnée — plus l'immunité permanente que l'arme portée peut conférer
 *  (`donne.immunite`, l'Armure de cendres contre la Braise) : même porte
 *  d'entrée pour tous les dégâts, ciblages et blocages du moteur. */
export function rpgEstProtegee(entite, element) {
  // Un Site n'est pas une cible légale, quelle que soit la couleur de la
  // source. Cette porte commune le protège aussi des zones et destructions.
  if (estSite(entite)) return true;
  const couleursSources = normaliserCouleurs(element);
  if (!entite || !couleursSources.length) return false;
  // `contre` accepte une couleur seule ou une liste (la Lionne du midi
  // ardent est protégée contre l'Eau ET la Neige).
  if (entite.protection?.toursRestants > 0
    && normaliserCouleurs(entite.protection.contre).some((couleur) => couleursSources.includes(couleur))) return true;
  const immunite = armeCarteDe(entite)?.donne?.immunite;
  return Boolean(immunite && couleursSources.includes(immunite));
}

/**
 * Protection limitée aux sorts d'une couleur. Elle ne remplace pas la
 * protection générale ci-dessus : une créature de Braise peut toujours
 * attaquer, bloquer ou utiliser une capacité contre la Valkyrie des glaces ;
 * seules les Magies Rapides et Sorcelleries de Braise sont arrêtées.
 * `sourceType` reste explicite pour ne jamais transformer une capacité en
 * sort par simple présence d'une couleur.
 */
export function rpgEstProtegeeDesSorts(entite, element, sourceType = 'magie') {
  if (!entite || sourceType !== 'magie') return false;
  if (entite.protectionSorts) return true;
  const couleursSources = normaliserCouleurs(element);
  const couleursProtegees = normaliserCouleurs(entite.protectionSortsContre);
  return couleursSources.length > 0
    && couleursProtegees.some((couleur) => couleursSources.includes(couleur));
}

/** Les boucliers absorbent les prochains dégâts avant qu'ils n'atteignent les PV. */
function rpgInfligerSorcier(duel, cote, amount) {
  const camp = duel[cote];
  const degats = Math.max(0, amount);
  const absorbes = Math.min(camp.bouclier ?? 0, degats);
  camp.bouclier = Math.max(0, (camp.bouclier ?? 0) - absorbes);
  const recus = degats - absorbes;
  camp.pv -= recus;
  // Compteur des dégâts RÉELS encaissés : la vie perdue, bouclier dévoré
  // mis à part. Il ne dépend plus de l'écart au maximum — la vie peut
  // dépasser 25 et le maximum suit, l'écart ne dirait plus rien.
  camp.degatsRecus = (camp.degatsRecus ?? 0) + recus;
  return { recus, absorbes };
}

let uid = 0;
const nextId = () => { uid += 1; return `entite-${uid}`; };

export function rpgSyncCompteurEntites(duel) {
  if (!duel) return 0;
  let plusHaut = Number(duel.prochainUid) || 0;
  for (const camp of [duel.joueur, duel.sorcier]) {
    if (!camp) continue;
    for (const liste of [camp.creatures, camp.terrains, camp.retoursProgrammes]) {
      if (!Array.isArray(liste)) continue;
      for (const item of liste) {
        const brut = item?.id ?? item?.entite?.id ?? '';
        const match = String(brut).match(/^entite-(\d+)$/);
        if (match) plusHaut = Math.max(plusHaut, Number(match[1]));
      }
    }
  }
  uid = plusHaut;
  duel.prochainUid = plusHaut;
  return plusHaut;
}

export function rpgNoterCompteurEntites(duel) {
  if (!duel) return 0;
  duel.prochainUid = Math.max(Number(duel.prochainUid) || 0, uid);
  return duel.prochainUid;
}

function creerEntiteCreature(carte) {
  return {
    id: nextId(),
    carteId: carte.id,
    kind: carte.kind ?? 'creature',
    // Un Site occupe bien une case du champ, mais reste hors de toutes les
    // règles de créature : indestructible, non combattant et non ciblable.
    site: carte.kind === 'site',
    indestructible: carte.kind === 'site',
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
    // Un bouclier déjà tombé reste lisible dans l'aperçu (pastille et texte
    // grisés) jusqu'à ce qu'un nouveau bouclier le remplace.
    bouclierEpuise: false,
    auraSableBonus: 0,
    auraAmaniBonus: 0,
    boualemContresortDisponible: carte.id === 'boualem',
    esquive: Boolean(carte.esquive),
    // Contre-attaque (Tojiro, Eirik) : la créature rend chaque coup porté
    // CONTRE elle — Coup rapide, capacité qui la cible, sort qui la désigne —
    // même quand une Esquive a annulé les blessures.
    contreAttaque: Boolean(carte.contreAttaque),
    // Le surcoût du porteur d’une arme (le Grappin d’abordage) : le mana déjà
    // payé ne change pas, mais le **coût que vaut la créature en jeu** grimpe
    // tant que l’arme tient (voir `rpgCoutEntite`) — seuil d’Abordage à
    // l’attachement et plafonds de coût le lisent.
    coutBonusArme: 0,
    rapidite: Boolean(carte.rapidite),
    coupRapide: Boolean(carte.coupRapide),
    provocation: Boolean(carte.provocation),
    envol: Boolean(carte.envol),
    infiltration: Boolean(carte.infiltration),
    // Furie : l'état visible et la seule part d'attaque qu'il a ajoutée. Le
    // bonus est compté à part pour pouvoir le retirer sans toucher aux
    // autres renforts quand la créature retrouve sa DEF de base.
    furieDeclenchee: false,
    furieBonusAtk: 0,
    // Overkill (le Serpent du monde) : comme le Piétinement — bloqué, il fait
    // passer au sorcier défenseur la force qui dépasse ses bloqueurs.
    // `overkillTemporaire` compte les prêts encore actifs (le Mur de
    // boucliers) sans écraser l'Overkill imprimé ou celui d'une arme.
    overkill: Boolean(carte.overkill),
    overkillTemporaire: 0,
    // Protection contre les magies rapides et les sorcelleries (le Serpent du
    // monde) : aucun sort ne peut la cibler ni la blesser — les capacités,
    // armes et attaques passent normalement.
    protectionSorts: Boolean(carte.protectionSorts),
    protectionSortsContre: carte.protectionSortsContre ?? null,
    tenaciteDisponible: Boolean(carte.tenacite),
    protection: carte.protection ? {
      contre: carte.protection.contre,
      // Sans `tours` déclaré, la protection est **permanente** (Tiziri) :
      // `Infinity` survit aux décomptes de `rpgFinDeTour`.
      toursRestants: carte.protection.tours ?? Infinity,
    } : null,
    // Interdits de combat (le venin de la Vipère, la lune dévorée de
    // Bakunawa) : tours du contrôleur qui restent à couvrir, comme le gel —
    // l'un interdit d'attaquer, l'autre de bloquer.
    empecheAttaqueToursRestants: 0,
    empecheBlocageToursRestants: 0,
    // La morsure du venin (la Vipère de verre) : `{ atk, def, toursRestants }`
    // — les chiffres retirés par la morsure et le temps qu'il lui reste à
    // ronger. Elle s'efface avec l'interdit d'attaquer (voir `rpgFinDeTour`).
    venin: null,
    // Compte à rebours du Guetteur du beffroi : `{ restants, effet }`, décompté
    // au début de chaque tour du contrôleur (`resoudreHeures`).
    heures: null,
    ready: Boolean(carte.rapidite),
    attaquee: false,
    resonance: 0,
    honneur: Math.max(0, Number(carte.honneur) || 0),
    // Le Tribut (set Ténèbres) : transfert de vie au contact du sorcier
    // adverse — `declencherTributs`, même voie de bilans que le Butin.
    tribut: Math.max(0, Number(carte.tribut) || 0),
    // La cale du capteur : `{ carteId, name, entite }` — la créature adverse
    // prise vive, détenue face visible, une seule place, `null` si vide. La
    // prisonnière ne figure plus dans `camp.creatures` : sa case est libre.
    enCale: null,
    // Bonus conditionnel d'une cale occupée (le Hollandais volant). Le delta est
    // mémorisé séparément afin de disparaître sans effacer les autres buffs.
    caleCombleBonusAtk: 0,
    butin: Boolean(carte.butin),
    // Les Deux Visages (La Barbe Noire) : l'index du visage courant, `null`
    // pour toute créature sans alternance. La fiche imprime le visage
    // d'arrivée (index 0) ; le moteur bascule au début de chaque tour du camp
    // (`changerVisages`), les blessures suivant d'un visage à l'autre.
    visage: carte.alternance ? 0 : null,
    // La Cargaison (set Lettres de Marque) : combien de cartes le propriétaire
    // pioche quand cette créature meurt ou est prise en cale.
    cargaison: Math.max(0, Number(carte.cargaison) || 0),
    // Gel (la Poigne de givre, le Verglas) : tours du contrôleur qui restent
    // à couvrir — la créature ni n'attaque ni ne bloque tant que c'est > 0.
    gelToursRestants: 0,
    // Blocage forcé (l'Appât de la meute, l'Embuscade) : la créature marquée
    // doit bloquer si elle le peut. `par` : le camp du lanceur (seule SA
    // prochaine attaque la concerne) ; `portee` : 'attaque' (le marqueur vit
    // jusqu'à la prochaine attaque du lanceur) ou 'tour' (il meurt avec le
    // tour en cours).
    blocageForce: null,
    // Mur (Tours de défense) : ne peut ni attaquer ni être équipée.
    mur: Boolean(carte.mur),
    // Interdiction d'attaquer seule (le Drakkar) : à la différence d'un Mur,
    // la créature peut toujours bloquer et porter une arme.
    nePeutPasAttaquer: Boolean(carte.nePeutPasAttaquer),
    // Doit bloquer (Tours de défense) : cette créature doit bloquer chaque tour
    // si possible, de manière permanente (pas comme blocageForce qui est temporaire).
    doitBloquer: Boolean(carte.doitBloquer),
    // Priorité d'attaque rapide (Tours de défense) : les créatures adverses
    // avec Attaque rapide doivent attaquer cette tour en priorité.
    prioriteAttaqueRapide: Boolean(carte.prioriteAttaqueRapide),
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
 * Fait encaisser un montant par le bouclier d'une créature et rend ce qui a
 * été absorbé. Le point encore porté par une arme (`entite.arme.bouclier`)
 * encaisse en premier : quand l'arme tombera, seul ce
 * reliquat-là repartira avec elle — un bouclier venu d'un sort ou d'une
 * arrivée ne peut donc pas être volé par un simple changement d'arme.
 */
function absorberBouclier(entite, montant) {
  const absorbes = Math.min(entite.bouclier ?? 0, Math.max(0, montant));
  entite.bouclier = Math.max(0, (entite.bouclier ?? 0) - absorbes);
  if (absorbes > 0 && entite.bouclier === 0 && !entite.bouclierLumiere) {
    entite.bouclierEpuise = true;
  }
  if (entite.arme?.bouclier) {
    entite.arme.bouclier = Math.max(0, entite.arme.bouclier - absorbes);
  }
  return absorbes;
}

/**
 * Attache une arme à une créature : le bonus et le mot-clé donné se fondent
 * dans ses champs, comme une aura permanente mais personnelle. Le +défense
 * grandit PV max et PV présents du même montant (la créature se tient mieux
 * debout) ; les retirer ne tuera jamais (plancher 1, comme la Résonance).
 * Une seule arme par créature : attacher la nouvelle envoie l'ancienne au
 * cimetière du même camp.
 */
/**
 * Le coût que vaut une créature **en jeu** : son coût imprimé plus le
 * surcoût de l’arme qu’elle porte (le Grappin d’abordage : +1 tant qu’il est
 * attaché). C’est ce chiffre que lisent la légalité d’une prise en cale et
 * les plafonds de coût.
 */
export function rpgCoutEntite(entite) {
  if (!entite) return Math.max(1, Number(duelCardById(entite?.carteId)?.cost) || 1);
  const imprime = Math.max(0, Number(duelCardById(entite.carteId)?.cost) || 0);
  return Math.max(1, imprime + Math.max(0, Number(entite.coutBonusArme) || 0));
}

function attacherArme(duel, cote, entite, carteArme) {
  if (entite.mur || estSite(entite)) return;
  if (entite.arme) retirerArme(duel, cote, entite);
  entite.arme = { carteId: carteArme.id };
  entite.atk += carteArme.bonus?.atk ?? 0;
  entite.pvMax = (entite.pvMax ?? entite.def) + (carteArme.bonus?.def ?? 0);
  entite.def += carteArme.bonus?.def ?? 0;
  entite.pv += carteArme.bonus?.def ?? 0;
  // Un bouclier éventuellement donné par l'arme rejoint la réserve qui
  // absorbera les prochains dégâts ; sa part encore intacte vit sur l'arme
  // elle-même pour repartir avec elle si elle est remplacée.
  const bouclierDonne = Math.max(0, Math.floor(Number(carteArme.donne?.bouclier) || 0));
  if (bouclierDonne) {
    entite.arme.bouclier = bouclierDonne;
    entite.bouclier = (entite.bouclier ?? 0) + bouclierDonne;
    entite.bouclierEpuise = false;
  }
  if (carteArme.donne?.esquive) entite.esquive = true;
  if (carteArme.donne?.envol) entite.envol = true;
  if (carteArme.donne?.infiltration) entite.infiltration = true;
  if (carteArme.donne?.coupRapide) entite.coupRapide = true;
  if (carteArme.donne?.tribut) entite.tribut = (entite.tribut ?? 0) + carteArme.donne.tribut;
  // La Jitte d'Amayas : l'arme couvre son porteur d'une protection de couleur
  // permanente (tant qu'elle est attachée), comme celle imprimée de Tiziri.
  if (carteArme.donne?.protection) {
    entite.protection = { contre: carteArme.donne.protection.contre, toursRestants: Infinity };
  }
  if (carteArme.donne?.rapidite) {
    entite.rapidite = true;
    entite.ready = true;
  }
  // Le Grappin d'abordage alourdit d'abord son porteur (`coutPorteur`) :
  // son coût en jeu grimpe tant que le crochet tient.
  if (carteArme.coutPorteur) {
    entite.coutBonusArme = (Number(entite.coutBonusArme) || 0) + carteArme.coutPorteur;
    duel.log.push(`${entite.name} est équipée du ${carteArme.name} : son coût monte à ${rpgCoutEntite(entite)}.`);
  }
  // …puis le crochet mord dès qu'il s'attache : le porteur active Abordage X
  // au barème du set — X = son coût **augmenté** − 1 — et la créature adverse
  // de coût ≤ X choisie rejoint sa cale. Côté joueur, le choix de la cible
  // passe par `duel.arriveeEnAttente` (la table s'allume, voir la page) ;
  // côté sorcier, l'IA choisit seule la prize la plus précieuse. Un porteur
  // dont la cale est déjà pleine ne reprend pas : une seule place.
  if ((Number.isFinite(carteArme.abordage) || carteArme.abordageDynamique) && !entite.enCale) {
    const seuilGrappin = carteArme.abordageDynamique
      ? Math.max(0, rpgCoutEntite(entite) - 1)
      : carteArme.abordage;
    const couleursGrappin = cardColors(carteArme);
    if (cote === 'joueur') {
      if (duel[autre(cote)].creatures.some((victime) => priseEnCaleLegale(victime, couleursGrappin, seuilGrappin))) {
        duel.arriveeEnAttente = { cote, entiteId: entite.id, carteId: carteArme.id, abordage: seuilGrappin };
      }
    } else {
      const priseGrappin = meilleurePriseAbordage(duel, autre(cote), couleursGrappin, seuilGrappin);
      if (priseGrappin) prendreEnCale(duel, entite, priseGrappin, null, autre(cote));
    }
  }
}

/** Retire l'arme d'une créature encore en jeu (remplacement) : bonus et
 *  mot-clé repartent, l'arme rejoint le cimetière de son camp. */
function retirerArme(duel, cote, entite) {
  const carteArme = armeCarteDe(entite);
  const bouclierRestant = Math.max(0, Number(entite.arme?.bouclier) || 0);
  entite.arme = null;
  if (!carteArme) return;
  entite.atk = Math.max(0, entite.atk - (carteArme.bonus?.atk ?? 0));
  entite.pvMax = Math.max(1, (entite.pvMax ?? entite.def) - (carteArme.bonus?.def ?? 0));
  entite.def = Math.max(1, entite.def - (carteArme.bonus?.def ?? 0));
  entite.pv = Math.max(1, Math.min(entite.pv, entite.pvMax));
  if (bouclierRestant) {
    entite.bouclier = Math.max(0, (entite.bouclier ?? 0) - bouclierRestant);
  }
  if (carteArme.donne?.esquive) entite.esquive = Boolean(duelCardById(entite.carteId)?.esquive);
  if (carteArme.donne?.envol) {
    // L'arme rendue ne retire pas l'Envol que la Furie prête encore.
    entite.envol = Boolean(duelCardById(entite.carteId)?.envol)
      || Boolean(gainsFurieActifs(duel, entite)?.envol);
  }
  if (carteArme.donne?.infiltration) entite.infiltration = Boolean(duelCardById(entite.carteId)?.infiltration)
    || Boolean(entite.infiltrationTour);
  if (carteArme.donne?.coupRapide) entite.coupRapide = Boolean(duelCardById(entite.carteId)?.coupRapide);
  if (carteArme.donne?.rapidite) entite.rapidite = Boolean(duelCardById(entite.carteId)?.rapidite);
  // Le crochet rendu, le coût du porteur retombe à son imprimé.
  if (carteArme.coutPorteur) {
    entite.coutBonusArme = Math.max(0, (Number(entite.coutBonusArme) || 0) - carteArme.coutPorteur);
  }
  if (carteArme.donne?.tribut) entite.tribut = Math.max(0, Number(duelCardById(entite.carteId)?.tribut) || 0);
  if (carteArme.donne?.protection) {
    // L'arme partie, la protection retombe à celle imprimée sur la fiche.
    const impression = duelCardById(entite.carteId)?.protection;
    entite.protection = impression
      ? { contre: impression.contre, toursRestants: impression.tours ?? Infinity }
      : null;
  }
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
 * Le porteur **meurt** : son arme tombe au cimetière et, si la carte le
 * porte, son déclencheur `porteurMeurt` part — le Licou du chien de sable
 * pioche alors ses deux cartes. Comme à Magic, seule la mort compte : un
 * renvoi en main ou un exil emportent l'arme sans rien déclencher
 * (`renvoyerEnMain`, `case 'exil'`). La Tenacité, elle, laisse la mort se
 * produire : le porteur meurt et son arme tombe comme pour toute autre
 * créature.
 */
function armeDePorteurMort(duel, cote, entite) {
  const carteArme = armeCarteDe(entite);
  if (!carteArme) return;
  armeAuCimetiere(duel, cote, entite);
  if (!carteArme.porteurMeurt) return;
  // Résoudre après le retrait des morts, jamais pendant qu’ils occupent encore
  // leurs cases. Le Khopesh ramène son propre porteur, pas le dernier mort.
  return () => {
    if (carteArme.porteurMeurt.type === 'reanimation-porteur') {
      const camp = duel[cote];
      const index = camp.cimetiere.lastIndexOf(entite.carteId);
      const carte = duelCardById(entite.carteId);
      if (index < 0 || !carte || !placesLibresChamp(duel, cote)) return;
      camp.cimetiere.splice(index, 1);
      const revenant = creerEntiteCreature(carte);
      revenant.pv = revenant.def = revenant.pvMax = 1;
      camp.creatures.push(revenant);
      placerDansEmplacement(duel, cote, revenant, entite.emplacement);
      duel.log.push(`${carteArme.name} : ${carte.name} revient en jeu avec 1 point de défense, sans son arme.`);
      appliquerArriveeDeRetour(duel, cote, carte, revenant);
      return;
    }
    appliquer(duel, cote, carteArme.porteurMeurt, null, null, cardColors(carteArme), null, carteArme.id);
  };
}

/** Furie portée par une créature : la valeur de sa carte, plus celle que
 *  l'arme tenue peut lui prêter. Une seule lecture pour le moteur et ses
 *  synchronisations après un changement d'équipement. */
function furieTotale(entite) {
  return Math.max(0, Number(duelCardById(entite.carteId)?.furie) || 0)
    + Math.max(0, Number(armeCarteDe(entite)?.donne?.furie) || 0);
}

/**
 * Les mots-clés qu'une Furie prête **tant qu'elle tient** : la carte les
 * déclare dans `furieGains` (le Maître du marteau gagne Overkill et Envol).
 * `null` quand la carte n'en prête aucun, ou quand la Furie est retombée — la
 * même lecture pour la synchronisation et pour les recomputations de bonus
 * temporaires.
 */
function gainsFurieActifs(duel, entite) {
  const gains = duelCardById(entite?.carteId)?.furieGains;
  if (!gains) return null;
  return Number(entite?.pv) > 0 && Boolean(entite?.furieDeclenchee) ? gains : null;
}

/**
 * Allume ou éteint les mots-clés prêtés par la Furie. Ils ne sont **pas**
 * imprimés sur la carte : l'Overkill du Maître n'existe que sous la Furie. Le
 * recalcul n'oublie jamais ce qu'une arme ou un renfort temporaire prête à
 * côté (`overkillTemporaire`, le Mur de boucliers).
 */
function appliquerGainsFurie(duel, entite) {
  const carte = duelCardById(entite?.carteId);
  if (!carte?.furieGains) return;
  const gains = gainsFurieActifs(duel, entite);
  if (carte.furieGains.overkill) {
    entite.overkill = Boolean(gains?.overkill)
      || Boolean(carte.overkill)
      || Boolean(armeCarteDe(entite)?.donne?.overkill)
      || (Number(entite.overkillTemporaire) || 0) > 0;
  }
  if (carte.furieGains.envol) {
    entite.envol = Boolean(gains?.envol)
      || Boolean(carte.envol)
      || Boolean(armeCarteDe(entite)?.donne?.envol);
  }
}

/**
 * Furie — état réversible, pas flambée unique : tant que la défense actuelle
 * d'une créature vivante est **sous sa DEF de base** (la défense imprimée de
 * sa carte, sans les renforts ni les auras), elle gagne +X/+0. Dès qu'un
 * soin — ou tout autre changement de statistiques — la ramène à cette DEF de
 * base, seul le bonus compté dans `furieBonusAtk` repart ; une nouvelle chute
 * sous le seuil le rallume. Un coup entièrement absorbé ne fait pas passer
 * sous le seuil. Renvoyée en main puis rejouée, la carte revient à sa DEF de
 * base et donc hors de Furie.
 */
function synchroniserFurieEntite(duel, entite) {
  if (!entite) return false;
  const furie = furieTotale(entite);
  let bonus = Number(entite.furieBonusAtk);
  // Présence ancienne ou fixture antérieure au compteur : l'état visible dit
  // si le bonus est déjà compris dans l'attaque affichée.
  if (!Number.isFinite(bonus)) bonus = entite.furieDeclenchee ? furie : 0;
  bonus = Math.max(0, bonus);
  const pv = Number(entite.pv) || 0;
  const defenseDeBase = Math.max(
    0,
    Number(duelCardById(entite.carteId)?.def ?? entite.pvMax ?? entite.def) || 0,
  );
  const active = furie > 0 && pv > 0 && defenseDeBase > 0 && pv < defenseDeBase;
  const voulu = active ? furie : 0;
  const delta = voulu - bonus;
  const etaitActive = Boolean(entite.furieDeclenchee);
  entite.furieBonusAtk = voulu;
  entite.furieDeclenchee = active;
  if (delta) entite.atk = Math.max(0, (Number(entite.atk) || 0) + delta);
  // Les mots-clés prêtés par la Furie (Overkill et Envol du Maître du marteau)
  // suivent exactement le même état : actifs tant que la Furie tient, éteints
  // dès qu'un soin ramène la créature à sa DEF de base.
  appliquerGainsFurie(duel, entite);
  if (duel && pv > 0 && active && !etaitActive) {
    const gains = gainsFurieActifs(duel, entite);
    const mots = [gains?.overkill ? 'Overkill' : null, gains?.envol ? 'Envol' : null].filter(Boolean);
    duel.log.push(mots.length
      ? `${entite.name} entre en furie : +${furie}/+0, ${mots.join(' et ')}.`
      : `${entite.name} entre en furie : +${furie}/+0.`);
  } else if (duel && pv > 0 && !active && etaitActive) {
    duel.log.push(`${entite.name} retrouve sa DEF de base : la furie retombe.`);
  }
  return active;
}

function synchroniserFuries(duel) {
  for (const cote of ['joueur', 'sorcier']) {
    for (const entite of duel[cote].creatures) synchroniserFurieEntite(duel, entite);
  }
}

function appliquerFurie(duel, entite, degatsRecus) {
  if (!(degatsRecus > 0)) return;
  synchroniserFurieEntite(duel, entite);
}

/** Total des sources d'un groupe de Résonance (élément ou tribu), dans les
 * deux camps. Le défaut Neige conserve l'ancienne signature de l'API. */
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
 * le type Samouraï, quelle que soit sa couleur ; le Tengu ne se renforce pas
 * lui-même et Kagutsuchi n’est plus une source de Résonance. Les sources se
 * cumulent dans les deux camps.
 * Une source marquée `resonanceExclutSource` ne
 * renforce que **les autres** : sa propre contribution est retirée du total
 * qu'elle reçoit, mais les autres sources continuent de la renforcer.
 * La perte du bonus laisse au minimum 1 PV, comme en Neige. */
function majResonance(duel) {
  const totaux = Object.fromEntries(GROUPES_RESONANCE.map((element) => [element, rpgResonanceEnJeu(duel, element)]));
  const renforcees = new Set();
  const affaiblies = new Set();
  for (const cote of ['joueur', 'sorcier']) {
    for (const entite of duel[cote].creatures) {
      if (!(entite.pv > 0)) continue;
      const carteEntite = duelCardById(entite.carteId);
      const groupes = GROUPES_RESONANCE.filter((groupe) => cardReceivesResonance(carteEntite, groupe));
      const recuPar = (groupe) => Math.max(0, (totaux[groupe] ?? 0) -
        (carteEntite?.resonanceExclutSource && cardResonanceGroup(carteEntite) === groupe
          ? Math.max(0, Number(carteEntite.resonance) || 0)
          : 0));
      const voulu = groupes.reduce((total, groupe) => total + recuPar(groupe), 0);
      const actuel = Math.max(0, Number(entite.resonance) || 0);
      const precedents = entite.resonanceParGroupe ?? {};
      entite.resonanceParGroupe = Object.fromEntries(groupes.map((groupe) => [groupe, recuPar(groupe)]));
      if (voulu === actuel) continue;
      const delta = voulu - actuel;
      entite.resonance = voulu;
      entite.atk = Math.max(0, entite.atk + delta);
      entite.pvMax = Math.max(1, (entite.pvMax ?? entite.def) + delta);
      entite.def = Math.max(1, entite.def + delta);
      entite.pv = Math.max(1, entite.pv + delta);
      for (const element of groupes) {
        const ancien = precedents[element] ?? 0;
        const prochain = recuPar(element);
        if (prochain > ancien) renforcees.add(element);
        else if (prochain < ancien) affaiblies.add(element);
      }
    }
  }
  // Le groupe est un type imprimé (Samouraï, Viking…) ou, à défaut, un
  // élément : le journal nomme les créatures dans les deux cas.
  const estElement = (groupe) => Boolean(ELEMENT_LABELS[groupe]);
  for (const groupe of renforcees) {
    const label = resonanceGroupLabel(groupe);
    duel.log.push(estElement(groupe)
      ? `La Résonance renforce la ${label} : +${totaux[groupe]}/+${totaux[groupe]} aux créatures ${label}.`
      : `La Résonance ${label.toLowerCase()} renforce les créatures de type ${label} : +${totaux[groupe]}/+${totaux[groupe]}.`);
  }
  for (const groupe of affaiblies) {
    if (renforcees.has(groupe)) continue;
    const label = resonanceGroupLabel(groupe);
    duel.log.push(estElement(groupe)
      ? `La Résonance se tait : les créatures ${label} perdent leur bonus.`
      : `La Résonance ${label.toLowerCase()} se tait : les créatures de type ${label} perdent leur bonus.`);
  }
}

/** Harakiri : une seule créature adverse vivante, choisie uniformément au
 * hasard — ou le sorcier adverse s'il n'y a aucune créature adverse.
 * Protection et bouclier restent applicables ; ce sont des dégâts de capacité,
 * pas une attaque ni une magie.
 * La donnée de la carte garde le nom `honneur` : seul le nom affiché a changé. */
function declencherHarakiri(duel, cote, entite) {
  const carte = duelCardById(entite.carteId);
  const honneur = Math.max(0, Number(carte?.honneur) || 0);
  if (!honneur) return;
  presenterEffet(duel, cote, entite.carteId);
  // La source morte ne maintient plus sa Résonance pendant sa dernière frappe.
  rafraichirAuras(duel);
  const adversaire = autre(cote);
  const cibles = duel[adversaire].creatures.filter((cible) => cible.pv > 0);
  if (!cibles.length) {
    rpgInfligerSorcier(duel, adversaire, honneur);
    duel.log.push(`Harakiri${honneur > 1 ? ` ${honneur}` : ''} : ${entite.name} inflige ${honneur} dégât${honneur > 1 ? 's' : ''} au sorcier ${adversaire === 'joueur' ? 'joueur' : 'ennemi'}.`);
    return;
  }
  const rng = hasardParDuel.get(duel) ?? Math.random;
  const index = Math.min(cibles.length - 1, Math.max(0, Math.floor(rng() * cibles.length)));
  const cible = cibles[index];
  duel.log.push(`Harakiri${honneur > 1 ? ` ${honneur}` : ''} : ${entite.name} inflige ${honneur} dégât${honneur > 1 ? 's' : ''} à ${cible.name}, choisie au hasard.`);
  rpgBlesserCreature(duel, adversaire, cible.id, honneur, cardColors(carte), null, 'capacite');
}

/**
 * Une proie du Chasseur d’Ocracoke : une créature de la course — Abordage
 * imprimé, Butin (imprimé ou prêté par une cale pleine) ou une cale occupée.
 * La Prime la lit à sa mort, la Traque la lit au moment de frapper.
 */
function estProieDuChasseur(entite) {
  if (!entite) return false;
  const carte = duelCardById(entite.carteId);
  return Boolean(carte?.abordage
    || (entite.butin ?? carte?.butin)
    || entite.enCale);
}

/**
 * La Traque du Chasseur (`traquePirates` sur la fiche) : +N/+0 contre une
 * proie de la course, pour ce combat seulement — jamais contre le sorcier,
 * jamais en bloquant. `0` partout ailleurs.
 */
function bonusTraquePirates(attaquant, cible) {
  const bonus = Math.max(0, Number(duelCardById(attaquant?.carteId)?.traquePirates) || 0);
  return bonus > 0 && estProieDuChasseur(cible) ? bonus : 0;
}

/**
 * L'Esquive se tente **une fois par attaque ou par sort** : 30 % de chance que
 * son effet sur la créature ne porte pas du tout. Les Magies rapides et les
 * Sorcelleries partagent le `sourceType` « magie » ; les capacités de
 * créatures conservent leur propre type et ne sont jamais esquivées.
 */
function tenterEsquive(duel, entite, sourceType) {
  if (!['attaque', 'magie'].includes(sourceType) || !entite?.esquive) return false;
  const rng = hasardParDuel.get(duel) ?? Math.random;
  const reussie = rng() < RPG_ESQUIVE_CHANCE;
  if (reussie) {
    duel.log.push(`${entite.name} esquive ${sourceType === 'magie' ? 'le sort' : 'l’attaque'}.`);
  }
  return reussie;
}

/**
 * La Contre-attaque est une riposte IMMÉDIATE, sans jet de dés. Elle frappe
 * la créature qui a porté le coup (un Coup rapide, une
 * capacité qui le ciblait) ou, pour un sort, le sorcier qui l'a lancé — la
 * magie se paie sur le visage du lanceur.
 *
 * Elle passe par `rpgBlesserCreature` avec le type « capacite » : les
 * capacités ne s'esquivent pas, une riposte ne peut donc jamais être renvoyée
 * en boucle par une Esquive adverse. Une créature déjà tombée ne riposte pas ;
 * une Esquive réussie, elle, n'empêche rien — c'est tout l'intérêt de la carte.
 *
 * @param {object} duel partie en cours
 * @param {object} defenseur entité qui porte Contre-attaque
 * @param {{ type: 'creature'|'sorcier', cote: string, entiteId?: string }} source
 * @returns {boolean} vrai si une riposte est partie
 */
function riposteDeContreAttaque(duel, defenseur, source) {
  if (!defenseur?.contreAttaque || !(defenseur.pv > 0)) return false;
  const force = Math.max(0, Number(defenseur.atk) || 0);
  if (!force) return false;
  const carte = duelCardById(defenseur.carteId);
  if (source?.type === 'sorcier') {
    if (!duel[source.cote]) return false;
    duel.log.push(`Contre-attaque : ${defenseur.name} renvoie le sort au sorcier ${source.cote === 'joueur' ? 'joueur' : 'ennemi'} — ${force} dégât${force > 1 ? 's' : ''}.`);
    rpgInfligerSorcier(duel, source.cote, force);
    return true;
  }
  const attaquant = duel[source?.cote]?.creatures.find((entite) => entite.id === source?.entiteId);
  if (!attaquant) return false;
  duel.log.push(`Contre-attaque : ${defenseur.name} rend son coup à ${attaquant.name} — ${force} dégât${force > 1 ? 's' : ''}.`);
  rpgBlesserCreature(duel, source.cote, attaquant.id, force, cardColors(carte), null, 'capacite', defenseur.carteId);
  return true;
}

/**
 * La Contre-attaque d'un effet : la cible adverse désignée par une capacité
 * riposte sur la créature source, celle d'un sort sur le sorcier qui l'a
 * lancé. Les effets de zone (`cible: 'toutes-creatures'`) ne désignent
 * personne : ils ne déclenchent rien.
 */
function riposterSurEffet(duel, cote, effet, cibleId, sauf, sourceType) {
  if (!cibleId || effet?.cible !== 'creature') return false;
  if (sourceType !== 'capacite' && sourceType !== 'magie') return false;
  const defenseur = duel[autre(cote)].creatures.find((entite) => entite.id === cibleId);
  if (!defenseur?.contreAttaque) return false;
  return riposteDeContreAttaque(duel, defenseur, sourceType === 'magie'
    ? { type: 'sorcier', cote }
    : { type: 'creature', cote, entiteId: sauf });
}

/** Applique les blessures d’un effet de combat simultanément avant de résoudre
 *  les capacités de destruction des créatures.
 *
 *  Rend les Esquives réussies contre des ATTAQUES (hors Coup rapide, traité
 *  par l'appelant) : l'appelant y lit les Contre-attaques à déclencher une
 *  fois l'échange terminé. */
function appliquerDegatsDeCombatSimultanes(duel, coups) {
  const blessures = new Map();
  // Les Esquives réussies contre une attaque : l'appelant en tire les
  // Contre-attaques (Tojiro riposte même quand le coup n'a pas porté).
  const esquivesContre = [];
  for (const [indexCoup, coup] of coups.entries()) {
    const entite = duel[coup.cote].creatures.find((candidate) => candidate.id === coup.entiteId);
    if (!entite || rpgEstProtegee(entite, coup.sourceElement)) continue;
    // Le Serpent du monde : protégé contre les magies — la vague d'un sort
    // de zone le contourne, les attaques et capacités passent.
    if (rpgEstProtegeeDesSorts(entite, coup.sourceElement, coup.sourceType)) continue;
    // Le Grand Voile blanc : les dégâts de combat s’égarent dans le blanc —
    // les dégâts de capacité et de magie, eux, traversent le voile.
    if (duel.brouillardCombat && coup.sourceType === 'attaque') continue;
    if (entite.bouclierLumiere && (coup.sourceType === 'attaque' || coup.sourceType === 'magie')) {
      entite.bouclierLumiere = false;
      if (!(entite.bouclier > 0)) entite.bouclierEpuise = true;
      continue;
    }
    if (tenterEsquive(duel, entite, coup.sourceType)) {
      // Une attaque esquivée reste une attaque portée : Contre-attaque se
      // déclenche. Les Coup rapide sont déjà comptés par `rpgLancerAttaque`
      // (`rapide`), pour ne pas riposter deux fois.
      if (!coup.rapide && coup.sourceType === 'attaque' && coup.sourceCote && coup.sourceId) {
        esquivesContre.push({
          cote: coup.cote,
          entiteId: entite.id,
          source: { type: 'creature', cote: coup.sourceCote, entiteId: coup.sourceId },
        });
      }
      continue;
    }
    const degats = Math.max(0, Number(coup.amount) || 0);
    if (degats <= 0) continue;
    const cle = `${coup.cote}:${entite.id}`;
    const blessure = blessures.get(cle) ?? {
      cote: coup.cote,
      entite,
      montant: 0,
      coups: [],
      sourceElements: [],
      sources: [],
      // Les sources des blessures d'ATTAQUE seules : l'Abordage ne prend
      // qu'une victime du combat (sourceType 'attaque') — jamais une victime
      // de la capacité duel du Cavalier ni d'un sort, qui passent par la même
      // fonction (set Lettres de Marque, doc 17 §4).
      attaqueSources: [],
    };
    blessure.montant += degats;
    blessure.coups.push({
      amount: degats,
      sourceKey: coup.sourceCote && coup.sourceId
        ? `${coup.sourceCote}:${coup.sourceId}`
        : `coup:${indexCoup}`,
    });
    blessure.sourceElements.push(...normaliserCouleurs(coup.sourceElement));
    const source = coup.sourceCote && coup.sourceId
      ? duel[coup.sourceCote]?.creatures.find((candidate) => candidate.id === coup.sourceId)
      : null;
    if (source && !blessure.sources.some((candidate) => candidate.id === source.id)) {
      blessure.sources.push({ id: source.id, name: source.name, carteId: source.carteId, cote: coup.sourceCote });
      if (coup.sourceType === 'attaque') {
        blessure.attaqueSources.push({ id: source.id, name: source.name, carteId: source.carteId, cote: coup.sourceCote });
      }
    }
    blessures.set(cle, blessure);
  }

  const mortes = [];
  const furieuses = [];
  for (const blessure of blessures.values()) {
    const { entite, montant, cote } = blessure;
    let recus = 0;
    for (const coupRecu of blessure.coups ?? [{ amount: montant, sourceKey: 'unique' }]) {
      const absorbes = absorberBouclier(entite, coupRecu.amount);
      recus += coupRecu.amount - absorbes;
    }
    entite.pv -= recus;
    entite.def = Math.min(entite.def, Math.max(0, entite.pv));
    // Les coups ont déjà été cumulés : une créature à 0 PV meurt une seule
    // fois, quels que soient le nombre d'attaquants et de bloqueurs. Tenacité
    // ne refuse plus la mort — elle programme seulement un retour au prochain
    // tour du camp (voir `programmerRetourTenacite`).
    if (entite.pv <= 0) {
      mortes.push({
        cote,
        entite,
        sourceElements: blessure.sourceElements,
        sources: blessure.sources,
        attaqueSources: blessure.attaqueSources,
      });
    } else {
      furieuses.push({ entite, recus, cote, sources: blessure.sources });
    }
  }
  // La Furie se synchronise après les blessures cumulées de l'échange : les
  // coups simultanés ne font jamais double effet, et une créature morte ne
  // s'énerve pas. Le journal reprend aussi les frappes qui n'ont pas
  // été létales : le flux ne se limite donc pas aux créatures détruites.
  for (const { entite, recus, cote, sources } of furieuses) {
    appliquerFurie(duel, entite, recus);
    if (recus > 0 && sources?.length) {
      duel.combatFeed = duel.combatFeed ?? [];
      duel.combatFeed.push({
        id: `${entite.id}:hit:${duel.log.length}`,
        type: 'hit',
        amount: recus,
        victim: { id: entite.id, name: entite.name, carteId: entite.carteId, cote },
        killers: sources,
      });
      duel.combatFeed = duel.combatFeed.slice(-12);
    }
  }

  // Les victimes de ce combat (le Brûlot embrase son tueur : seules les
  // créatures qui ont survécu à l'échange peuvent être embrasées).
  const mortsIds = new Set(mortes.map((mort) => mort.entite.id));
  // Retire d’abord toutes les victimes : une capacité de destruction ne peut
  // donc empêcher l’autre combattant d’infliger les dégâts déjà calculés.
  for (const mort of mortes) {
    const camp = duel[mort.cote];
    // La Prime lit la victime avant que sa mort n'ouvre sa cale et n'éteigne
    // un éventuel Butin conditionnel.
    mort.donnePrime = estProieDuChasseur(mort.entite);
    // Un capteur qui meurt en combat rend sa cale — et la détenue revient EN
    // JEU, avec ses statistiques de prise.
    ouvrirCale(duel, mort.cote, mort.entite, { enJeu: true });
    journaliserDestruction(duel, mort.entite, mort.sourceElements);
    mort.declencherArme = armeDePorteurMort(duel, mort.cote, mort.entite);
    camp.creatures = camp.creatures.filter((candidate) => candidate.id !== mort.entite.id);
    camp.cimetiere.push(mort.entite.carteId);
    detacherArmes(duel, mort.cote, mort.entite);
    duel.log.push(`${mort.entite.name} est détruite et rejoint le cimetière.`);
    // Une créature tenace tombe comme les autres : sa renaissance est promise
    // au prochain tour de son camp, comme pour une blessure isolée.
    programmerRetourTenacite(duel, mort.cote, mort.entite);
    duel.combatFeed = duel.combatFeed ?? [];
    duel.combatFeed.push({
      id: `${mort.entite.id}:${duel.log.length}`,
      type: 'death',
      victim: { id: mort.entite.id, name: mort.entite.name, carteId: mort.entite.carteId, cote: mort.cote },
      killers: mort.sources ?? [],
    });
    duel.combatFeed = duel.combatFeed.slice(-12);
  }
  for (const mort of mortes) {
    mort.declencherArme?.();
    const carte = duelCardById(mort.entite.carteId);
    if (carte?.destruction) {
      declencherCapaciteDestruction(duel, mort.cote, carte, mort.entite.carteId);
    }
    declencherHarakiri(duel, mort.cote, mort.entite);
  }
  // Prime du Chasseur d'Ocracoke : seul un tueur qui a porté des blessures
  // d'attaque et une victime pirate qualifiée font piocher.
  for (const mort of mortes) {
    if (!mort.donnePrime) continue;
    for (const source of mort.attaqueSources ?? []) {
      if (!duelCardById(source.carteId)?.primeChasseur) continue;
      const pioche = rpgPiocher(duel, source.cote);
      duel.log.push(`Prime : ${source.name} détruit ${mort.entite.name}${pioche ? ' — son contrôleur pioche une carte' : ''}.`);
    }
  }
  // Le Brûlot (degats-tueur) : mort en combat, il embrase son tueur — les
  // dégâts de l'effet tombent sur l'une des créatures qui l'ont détruit et qui
  // a survécu à l'échange. Mort par magie ou par capacité, rien ne se
  // déclenche : seul le tueur de combat est connu —
  // `declencherCapaciteDestruction` passe bien par ici, son effet
  // 'degats-tueur' est un no-op ailleurs.
  for (const mort of mortes) {
    const carte = duelCardById(mort.entite.carteId);
    if (carte?.destruction?.type !== 'degats-tueur') continue;
    const amount = Math.max(0, Number(carte.destruction.amount) || 0);
    if (!amount) continue;
    for (const source of mort.sources ?? []) {
      if (mortsIds.has(source.id)) continue;
      const tueur = duel[source.cote]?.creatures.find((candidate) => candidate.id === source.id);
      if (!tueur) continue;
      duel.log.push(`${mort.entite.name} embrase son pont : ${tueur.name} subit ${amount} dégât${amount > 1 ? 's' : ''}.`);
      rpgBlesserCreature(duel, source.cote, tueur.id, amount, cardColors(carte), null, 'capacite', carte.id);
      break;
    }
  }
  rafraichirAuras(duel);
  rpgActionsEtat(duel);
  return esquivesContre;
}

/** Dégâts infligés à la créature que la carte combat, s’il y a lieu. */
function degatsCreatureCombattue(carte, quand) {
  if (carte?.combat?.type !== 'degats-creature-combattue') return 0;
  if (carte.combat.quand && carte.combat.quand !== quand) return 0;
  return Math.max(0, Number(carte.combat.amount) || 0);
}

/** Prépare les dégâts des capacités « quand cette créature attaque ou bloque ».
 *  Ils se résolvent avant les blessures normales du combat. Le déclenché de
 *  l'arme portée (`declenche.sur === 'combat'`) frapperait par le même
 *  chemin, mais sous la couleur de l'arme, pas de la créature. `quand` évite
 *  qu'un effet réservé au blocage (la Tour de Braise) ne parte en attaque. */
function ajouterDegatsCapaciteAvantCombat(coups, coteSource, carteSource, cible, entiteSource = null, quand = 'attaque') {
  if (!cible) return;
  // La créature qui porte la capacité est nommée comme source de la blessure :
  // si l'échange tue une créature (le Brûlot), son effet de mort sait qui l'a
  // détruite, même quand les dégâts sont partis avant les coups normaux.
  const source = entiteSource ? { sourceCote: coteSource, sourceId: entiteSource.id } : {};
  const amount = degatsCreatureCombattue(carteSource, quand);
  if (amount > 0) {
    coups.push({
      cote: autre(coteSource),
      entiteId: cible.id,
      amount,
      sourceElement: cardColors(carteSource),
      sourceType: carteSource.combat.sourceType ?? 'capacite',
      ...source,
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
        ...source,
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
      // Le Tribut prêté par l'Offrande de lin repart avec le renfort.
      if (entry.tribut) entite.tribut = Math.max(0, (entite.tribut ?? 0) - entry.tribut);
      // L'Overkill prêté par le Mur de boucliers repart aussi, sans éteindre
      // celui de la carte ni celui d'une arme encore tenue.
      if (entry.overkill) {
        entite.overkillTemporaire = Math.max(
          0,
          (entite.overkillTemporaire ?? entry.overkill) - entry.overkill,
        );
        entite.overkill = Boolean(duelCardById(entite.carteId)?.overkill)
          || Boolean(armeCarteDe(entite)?.donne?.overkill)
          || entite.overkillTemporaire > 0
          // L'Overkill prêté par la Furie (le Maître du marteau) ne part pas
          // avec le renfort temporaire d'un sort.
          || Boolean(gainsFurieActifs(duel, entite)?.overkill);
      }
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

/**
 * Durée, en tours du contrôleur, d'un interdit « jusqu'à la fin de son
 * prochain tour » (le venin de la Vipère, la lune de Bakunawa) : la même
 * horloge que le gel — 2 si son tour est en cours, 1 sinon.
 */
function dureeJusquAuProchainTour(duel, entite) {
  const proprietaire = duel.joueur.creatures.some((candidate) => candidate.id === entite.id)
    ? 'joueur' : 'sorcier';
  return duel.tour === proprietaire ? 2 : 1;
}

/**
 * Butin (le set Sable) : quand une créature dotée du mot-clé touche le
 * sorcier adverse en combat, son contrôleur pioche une carte puis en
 * défausse une. Même chemin que les déclencheurs d'armes : les bilans de
 * combat disent qui a frappé le sorcier et pour combien.
 */
function declencherButins(duel, cote, bilans) {
  let declenche = false;
  for (const bilan of bilans) {
    if (!(bilan.sorcier > 0)) continue;
    const entite = duel[cote].creatures.find((candidate) => candidate.id === bilan.id);
    const carte = entite ? duelCardById(entite.carteId) : null;
    if (!(entite?.butin ?? Boolean(carte?.butin))) continue;
    appliquer(duel, cote, { type: 'pioche-defausse', pioche: 1, defausse: 1 },
      null, entite.id, cardColors(carte), 'capacite', carte.id);
    duel.log.push(`Butin : ${entite.name} touche le sorcier — pioche 1, défausse 1.`);
    declenche = true;
  }
  return declenche;
}

/**
 * Tribut (le set Ténèbres) : quand une créature dotée du mot-clé touche le
 * sorcier adverse, il perd N PV et son contrôleur en gagne N — même chemin
 * que le Butin : les bilans de combat disent qui a frappé le sorcier et pour
 * combien. Jamais écrit en « dégâts » : la Braise garde les dégâts nus.
 */
function declencherTributs(duel, cote, bilans) {
  let declenche = false;
  for (const bilan of bilans) {
    if (!(bilan.sorcier > 0)) continue;
    const entite = duel[cote].creatures.find((candidate) => candidate.id === bilan.id);
    const montant = entite?.tribut ?? 0;
    if (!(montant > 0)) continue;
    transfertVie(duel, cote, montant);
    duel.log.push(`Tribut : ${entite.name} touche le sorcier — ${
      cote === 'joueur' ? `le sorcier perd ${montant} PV, vous en gagnez ${montant}`
        : `vous perdez ${montant} PV, le sorcier en gagne ${montant}`}.`);
    declenche = true;
  }
  return declenche;
}

/* ── La cale des corsaires (set Lettres de Marque, doc 18) ────────────────────
   L'Abordage prend la créature vaincue en cale au lieu de la détruire ; la
   cale la détient face visible (une seule place par capteur) ; il n'y a pas
   de rachat : la détenue ne revient qu'en **faisant quitter la table au
   capteur** — détruit (elle revient en jeu), exilé ou renvoyé en main (elle
   revient en main). */

/** Met à jour le bonus qui n'existe que tant que la cale est occupée. */
function synchroniserCaleComble(entite) {
  if (!entite) return;
  const carte = duelCardById(entite.carteId);
  const voulu = entite.enCale ? Math.max(0, Number(carte?.caleComble?.atk) || 0) : 0;
  const delta = voulu - Math.max(0, Number(entite.caleCombleBonusAtk) || 0);
  entite.atk = Math.max(0, (Number(entite.atk) || 0) + delta);
  entite.caleCombleBonusAtk = voulu;
  entite.butin = Boolean(carte?.butin || (entite.enCale && carte?.caleComble?.butin));
}

/**
 * Le seuil de prise de l'Abordage (set Lettres de Marque) : le coût de la
 * carte captrice − 1 — une créature qui coûte 5 prend tout ce qui coûte 4 ou
 * moins. L'imprimé (`carte.abordage`, déjà au barème) prime ; sans imprimé,
 * les sceaux du camp étendent le même barème aux créatures qui arrivent :
 * `camp.abordageDesArrivees` (la Lettre de marque, tout le tour) ou
 * `camp.prochaineArriveeAbordage` (le Pilote de la Carreira, la seule
 * prochaine créature jouée). `prochaineOfferte` est l'instantané du sceau du
 * Pilote **au début de la pose** : il arme la créature en train d'accoster
 * sans que le Pilote puisse s'armer lui-même à sa propre arrivée. Renvoie
 * `null` quand la carte n'accoste pas.
 */
function seuilAbordage(carte, camp, prochaineOfferte = Boolean(camp?.prochaineArriveeAbordage)) {
  if (Number.isFinite(carte?.abordage)) return carte.abordage;
  // Pas de contrôle de `kind` ici : les fiches des sets n'en portent pas
  // toutes (seules les magies et les armes l'impriment), et la fonction ne
  // sert que pour des créatures posées par `rpgJouerCreature`.
  if ((camp?.abordageDesArrivees || prochaineOfferte) && carte?.kind !== 'magie' && carte?.kind !== 'arme') {
    return Math.max(0, (Number(carte.cost) || 0) - 1);
  }
  return null;
}

/**
 * Une créature est prisable en cale : pas une figure légendaire (on les tue,
 * on ne les vend pas), pas une tenace (on ne prend pas ce qui reviendra), pas
 * protégée contre la couleur de la source, et de coût ≤ seuil. Les jetons de
 * créature sont prisables depuis n’importe quel seuil d’abordage.
 */
function priseEnCaleLegale(victime, couleurs, seuil) {
  if (!victime) return false;
  const carte = duelCardById(victime.carteId);
  if (!carte || carte.kind === 'hero') return false;
  if (carte.insaisissable) return false;
  if (victime.tenaciteDisponible) return false;
  if (rpgEstProtegee(victime, couleurs)) return false;
  // Le surcoût d’un Grappin porté compte : une créature équipée vaut son
  // coût augmenté face au seuil de prise.
  return rpgCoutEntite(victime) <= seuil;
}

/**
 * La prize que l'IA (ou la pose sans désignation) tire de la table : la
 * créature légale au meilleur butin — le coût d'abord, la menace ensuite.
 */
function meilleurePriseAbordage(duel, coteVictime, couleurs, seuil) {
  return duel[coteVictime].creatures
    .filter((victime) => priseEnCaleLegale(victime, couleurs, seuil))
    .map((victime) => ({
      victime,
      score: rpgCoutEntite(victime) * 10 + (victime.atk ?? 0) + (victime.pv ?? 0),
    }))
    .sort((a, b) => b.score - a.score)[0]?.victime ?? null;
}

/**
 * La créature adverse vaincue quitte la table par la cale du capteur. Elle
 * libère sa case, perd tout (ses armes tombent au cimetière, comme un mort)
 * et ne déclenche RIEN — ni journal des destructions, ni Harakiri, ni capacité
 * de mort, ni quêtes. Sa propre cale, si elle en tenait une, s'ouvre d'abord :
 * quitter la table ouvre toujours.
 */
function prendreEnCale(duel, capteur, victime, sourceSnapshot = null, coteVictime = null) {
  if (!capteur || capteur.enCale) return false;
  // Une figure légendaire ne se vend pas, la Tenacité refuse la cale comme
  // elle refuse la mort, et l'insaisissable (La Barbe Noire) glisse toujours
  // entre les grappins (garde pour les appels directs du moteur : la
  // désignation de l'arrivée a déjà filtré tout cela).
  if (duelCardById(victime?.carteId)?.kind === 'hero') return false;
  if (duelCardById(victime?.carteId)?.insaisissable) return false;
  if (victime?.tenaciteDisponible) return false;
  const coteCapteur = duel.joueur.creatures.some((candidate) => candidate.id === capteur.id)
    ? 'joueur' : 'sorcier';
  const coteVictimeEffective = coteVictime ?? autre(coteCapteur);
  ouvrirCale(duel, coteVictimeEffective, victime);
  capteur.enCale = {
    carteId: victime.carteId,
    name: victime.name,
    // La présence elle-même, telle qu'elle était au moment du crochet. Elle
    // revient EN JEU si le capteur meurt (voir `ouvrirCale`) : sa fiche est
    // relue par la cale, sa mémoire de table (attaque, défense, PV, auras
    // déjà comptées, marques) reste intacte — c'est un retour, pas une
    // nouvelle arrivée.
    entite: victime,
  };
  synchroniserCaleComble(capteur);
  duel[coteVictimeEffective].creatures = duel[coteVictimeEffective].creatures
    .filter((candidate) => candidate.id !== victime.id);
  detacherArmes(duel, coteVictimeEffective, victime);
  armeAuCimetiere(duel, coteVictimeEffective, victime);
  journaliserPriseEnCale(duel, capteur, coteCapteur, victime, coteVictimeEffective);
  duel.log.push(`${capteur.name} prend ${victime.name} en cale — détenue, pas détruite.`);
  duel.combatFeed = duel.combatFeed ?? [];
  duel.combatFeed.push({
    id: `${victime.id}:prise:${duel.log.length}`,
    type: 'prise',
    victim: { id: victime.id, name: victime.name, carteId: victime.carteId, cote: coteVictimeEffective },
    killers: [sourceSnapshot ?? { id: capteur.id, name: capteur.name, carteId: capteur.carteId, cote: coteCapteur }],
  });
  duel.combatFeed = duel.combatFeed.slice(-12);
  // La Cargaison paie aussi à la prise : le convoi est assuré contre la capture.
  declencherCargaison(duel, coteVictimeEffective, victime);
  // Le Grappin d'abordage (`priseEnCale`) : chaque prise vaut son pesant de soins.
  const carteArme = armeCarteDe(capteur);
  if (carteArme?.priseEnCale) {
    appliquer(duel, coteCapteur, carteArme.priseEnCale, null, capteur.id,
      cardColors(carteArme), 'capacite', carteArme.id);
  }
  // Le Négociant encaisse sa commission à chaque prise, des deux côtés de la mer.
  declencherPrises(duel);
  return true;
}

/**
 * La cale d'un capteur s'ouvre à sa sortie de table — destruction, sacrifice,
 * renvoi en main, exil, capture — et jamais autrement : la cale ne se vide pas
 * d'elle-même.
 *
 * Deux issues, selon la façon dont le capteur quitte la table :
 * - **il meurt** (`enJeu: true` — destruction, mort au combat, sacrifice) : le
 *   prisonnier revient **en jeu**, sur le champ de bataille de son
 *   propriétaire, avec l'attaque et la défense qu'il avait avant la prise. Ce
 *   n'est pas une arrivée : aucun effet d'arrivée ne se déclenche. Comme la
 *   renaissance de Tenacité, il revient avec le mal d'invocation (il n'attaque
 *   pas le tour de son retour, sauf Rapidité) ;
 * - **il quitte la table sans mourir** (renvoi en main, exil, capture par un
 *   autre corsaire) : le prisonnier retourne dans la **main** de son
 *   propriétaire.
 *
 * Le retour en jeu exige une place libre sur le champ (mode sans terrains) :
 * s'il n'y en a pas, la carte part en main — la cale ne se referme jamais.
 */
function ouvrirCale(duel, cote, entite, { enJeu = false } = {}) {
  const cale = entite?.enCale;
  if (!cale) return false;
  entite.enCale = null;
  synchroniserCaleComble(entite);
  const coteProprietaire = autre(cote);
  const camp = duel[coteProprietaire];
  const prisonniere = cale.entite;
  if (enJeu && prisonniere && placesLibresChamp(duel, coteProprietaire) > 0) {
    // La détenue reprend sa présence : ses statistiques sont celles de la
    // prise, ses auras déjà comptées dans ses chiffres (`auraSableBonus` et
    // consorts), donc `rafraichirAuras` ne les comptera pas deux fois. Seul
    // l'engagement se remet à neuf : le retour ne donne pas d'attaque gratuite.
    const carte = duelCardById(prisonniere.carteId);
    prisonniere.ready = Boolean(carte?.rapidite);
    prisonniere.attaquee = false;
    camp.creatures.push(prisonniere);
    placerDansEmplacement(duel, coteProprietaire, prisonniere,
      Number.isInteger(prisonniere.emplacement) ? prisonniere.emplacement : null);
    duel.log.push(`La cale de ${entite.name} s’ouvre : ${cale.name} revient en jeu avec ${prisonniere.atk}/${prisonniere.def} — sa prise, pas une arrivée.`);
    return true;
  }
  camp.main.push(cale.carteId);
  duel.log.push(`La cale de ${entite.name} s’ouvre : ${cale.name} retourne dans la main de son propriétaire.`);
  return true;
}

/**
 * Cargaison N : quand la créature meurt OU est prise en cale, son propriétaire
 * pioche N cartes — l'assurance du convoi. Même chemin de pioche que le
 * Kraken (`pioche`), jamais écrit en dégâts (règle de direction §11).
 */
function declencherCargaison(duel, coteProprietaire, entite) {
  const carte = duelCardById(entite.carteId);
  const n = Math.max(0, Number(carte?.cargaison) || 0);
  if (!n) return false;
  appliquer(duel, coteProprietaire, { type: 'pioche', amount: n },
    null, null, cardColors(carte), 'capacite', carte.id);
  duel.log.push(`Cargaison : ${entite.name} paie son assurance — ${
    coteProprietaire === 'joueur' ? 'vous piochez' : 'le sorcier pioche'} ${n} carte${n > 1 ? 's' : ''}.`);
  return true;
}

/** Le déclencheur `prise` (le Négociant) : chaque fois qu'une créature est
 *  prise en cale — par qui que ce soit —, le contrôleur de chaque Négociant
 *  en jeu pioche une carte : la commission se paie des deux côtés de la mer. */
function declencherPrises(duel) {
  for (const cote of ['joueur', 'sorcier']) {
    for (const entite of duel[cote].creatures) {
      const carte = duelCardById(entite.carteId);
      const n = Math.max(0, Number(carte?.declenchePrise) || 0);
      if (!n) continue;
      appliquer(duel, cote, { type: 'pioche', amount: n },
        null, null, cardColors(carte), 'capacite', carte.id);
      duel.log.push(`Prise : ${entite.name} encaisse sa commission — ${
        cote === 'joueur' ? 'vous piochez' : 'le sorcier pioche'} ${n} carte${n > 1 ? 's' : ''}.`);
    }
  }
}

/**
 * Le cœur pesé : le camp cible PERD `montant` PV (jamais des « dégâts » —
 * règle de direction §11), le camp source les GAGNE en entier : la vie peut
 * dépasser 25, le maximum suit le gain (`rpgGagnerVie`). La perte peut
 * éteindre un sorcier : `rpgVainqueur` lit les PV comme après le combat.
 */
function transfertVie(duel, coteSource, montant) {
  const n = Math.max(0, Number(montant) || 0);
  if (!n) return { perdu: 0, gagne: 0 };
  const perdant = duel[autre(coteSource)];
  perdant.pv -= n;
  // La vie perdue par le cœur pesé est un dégât infligé : elle compte pour
  // la quête « le sorcier saigne ».
  perdant.degatsRecus = (perdant.degatsRecus ?? 0) + n;
  const gagne = rpgGagnerVie(duel, coteSource, n);
  return { perdu: n, gagne };
}

/** Applique un effet de capacité (arrivée / destruction). `sauf` exclut
 *  l’entité source quand l’effet ne doit pas se viser elle-même. */
function appliquerEffet(duel, cote, effet, cibleId, sauf = null, sourceElement = null, sourceType = null, sourceCarteId = null) {
  presenterEffet(duel, cote, sourceCarteId);
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
  // Une Magie ou une Sorcellerie hostile qui désigne une créature peut voir
  // son effet sur cette cible esquivé. Les dégâts passent, eux, par les deux
  // fonctions de blessure ci-dessous afin de couvrir aussi les sorts de zone
  // sans effectuer un second jet sur une cible directe.
  const viseUneCreatureAdverse = cibleId && (effet.cible === 'creature'
    // Certaines fiches de malus portent leur cible dans `cibles`, sans la
    // répéter dans l'effet ; leur cible reste toujours une créature adverse.
    || ['debuff', 'empeche-blocage'].includes(effet.type));
  if (sourceType === 'magie' && effet.type !== 'degats' && viseUneCreatureAdverse) {
    const cibleSort = duel[adv].creatures.find((entite) => entite.id === cibleId);
    if (cibleSort && tenterEsquive(duel, cibleSort, sourceType)) {
      // La pioche éventuelle (Courant de retour) appartient au lanceur : elle
      // ne dépend pas de l'effet esquivé par la cible et se résout normalement.
      for (let i = 0; i < (effet.pioche ?? 0); i += 1) rpgPiocher(duel, cote);
      return;
    }
  }
  switch (effet.type) {
    case 'destruction-totale': {
      // Les morts sont retirés ensemble, avant leurs déclenchements : les
      // jetons et les réanimations produits ensuite échappent à cette vague.
      const declenchements = [];
      const victimes = [cote, adv].flatMap((camp) => duel[camp].creatures
        .filter((entite) => !rpgEstProtegee(entite, sourceElement)
          && !rpgEstProtegeeDesSorts(entite, sourceElement, sourceType)
          && !tenterEsquive(duel, entite, sourceType))
        .map((entite) => ({ camp, entite })));
      for (const { camp, entite } of victimes) {
        enterrer(duel, camp, entite, sourceElement, declenchements);
      }
      for (const declencher of declenchements) declencher();
      rafraichirAuras(duel);
      rpgActionsEtat(duel);
      return;
    }
    case 'destruction-coutmax': {
      // Détruit toutes les créatures dont le coût en mana est <= effet.coutMax.
      // Sans borne, la vague prend les deux camps sauf sa source (Celui qui
      // juge) ; `cible: 'creatures-adverses'` la borne au camp adverse — la
      // Neige noire ne brise pas les siens. Les morts sont retirées ensemble,
      // avant leurs déclenchements : les jetons et réanimations produits
      // ensuite échappent à cette vague.
      const camps = effet.cible === 'creatures-adverses' ? [adv] : [cote, adv];
      const declenchements = [];
      const victimes = [];
      const epargnees = [];
      for (const camp of camps) {
        for (const entite of duel[camp].creatures) {
          // La source ne se vise jamais elle-même (Celui qui juge).
          if (entite.id === sauf) continue;
          // La protection de couleur et le Serpent du monde écartent la vague.
          if (rpgEstProtegee(entite, sourceElement)
            || rpgEstProtegeeDesSorts(entite, sourceElement, sourceType)) continue;
          // Un sort esquivé est annulé EN ENTIER sur cette créature : ni
          // destruction, ni gel — un seul jet, comme pour les dégâts de zone.
          if (tenterEsquive(duel, entite, sourceType)) continue;
          if ((duelCardById(entite.carteId)?.cost ?? 0) <= effet.coutMax) {
            victimes.push({ camp, entite });
          } else {
            epargnees.push({ camp, entite });
          }
        }
      }
      for (const { camp, entite } of victimes) {
        enterrer(duel, camp, entite, sourceElement, declenchements);
      }
      for (const declencher of declenchements) declencher();
      // Le gel tombe sur ce qui **reste** : une créature brisée n'a plus rien
      // à figer. Il suit la même vague, donc les mêmes protections.
      if (effet.gel) {
        for (const { entite } of epargnees) gelerEntite(duel, entite);
      }
      rafraichirAuras(duel);
      rpgActionsEtat(duel);
      return;
    }
    case 'exil': {
      for (const campCible of [adv, cote]) {
        const victime = duel[campCible].creatures.find((entite) => entite.id === cibleId);
        if (!victime) continue;
        if (rpgEstProtegee(victime, sourceElement) || rpgEstProtegeeDesSorts(victime, sourceElement, sourceType)) return;
        // `coutMax` (le Père des corbeaux) : les corbeaux ne soulèvent que les
        // créatures de coût 3 ou moins — au-delà, la cible est illégale.
        if (Number.isFinite(effet.coutMax)
          && (duelCardById(victime.carteId)?.cost ?? 0) > effet.coutMax) return;
        duel[campCible].creatures = duel[campCible].creatures.filter((entite) => entite.id !== victime.id);
        // Toute sortie de table ouvre la cale (set Lettres de Marque) : même
        // retirée de la partie, la créature rend son prisonnier.
        ouvrirCale(duel, campCible, victime);
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
      if (!porteur || rpgEstProtegee(porteur, sourceElement)
        || rpgEstProtegeeDesSorts(porteur, sourceElement, sourceType)) return;
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
    case 'transfert': {
      // Le cœur pesé (set Ténèbres) : le camp adverse perd des PV, le camp
      // source en gagne — le transfert, jamais des « dégâts ». `pioche` en
      // chaîne porte la Grande Pesée.
      const montant = Math.max(0, Number(effet.amount) || 0);
      if (!montant) return;
      transfertVie(duel, cote, montant);
      duel.log.push(`Transfert : ${adv === 'joueur' ? 'le joueur' : 'le sorcier'} perd ${montant} PV, ${cote === 'joueur' ? `vous en gagnez ${montant}` : `le sorcier en gagne ${montant}`}.`);
      for (let i = 0; i < (effet.pioche ?? 0); i += 1) rpgPiocher(duel, cote);
      return;
    }
    case 'defausse-adverse': {
      // Nom effacé : UNE carte, choisie par la victime — elle garde sa
      // meilleure. Le sorcier tranche aussitôt (l'IA épargne son épargne),
      // le joueur reçoit l'écran de défausse (`defausseEnAttente`).
      const camp = duel[adv];
      if (!camp.main.length) return;
      const source = sourceCarteId ? (cardById(sourceCarteId)?.name ?? 'Nom effacé') : 'Nom effacé';
      if (adv === 'joueur') {
        // Deux « Nom effacé » dans la même fenêtre se cumulent : chacun prend
        // sa carte, l'attente s'allonge au lieu de s'écraser.
        ouvrirDefausseEnAttente(duel, 'joueur', 1, sourceCarteId, 'effet');
        duel.log.push(`${source} : une carte de votre main part au cimetière (choisissez laquelle).`);
        return;
      }
      rpgDefausserCarte(duel, 'sorcier');
      return;
    }
    case 'defaussePaquet': {
      // Les feuillets : le dessus du paquet adverse part au cimetière —
      // la fatigue (1, 2, 3… PV) fera le reste du travail.
      const nombre = Math.max(0, Number(effet.amount) || 0);
      const camp = duel[adv];
      if (!nombre || !camp.deck.length) return;
      const partie = camp.deck.splice(Math.max(0, camp.deck.length - nombre), nombre);
      camp.cimetiere.push(...partie);
      const noms = partie.map((id) => cardById(id)?.name ?? id).join(', ');
      duel.log.push(`${partie.length} carte${partie.length > 1 ? 's' : ''} du paquet adverse au cimetière : ${noms}.`);
      return;
    }
    case 'pioche': {
      const nombre = Math.max(0, Math.floor(Number(effet.amount ?? 1) || 0));
      if (!effet.tribu) {
        for (let i = 0; i < nombre; i += 1) rpgPiocher(duel, cote);
        return;
      }
      // La Valkyrie au corbeau : le hasard choisit parmi les cartes du type
      // demandé encore dans le deck, pas parmi tout le paquet.
      let piochees = 0;
      for (let i = 0; i < nombre; i += 1) {
        if (!piocherCarteDeType(duel, cote, effet.tribu)) break;
        piochees += 1;
      }
      const source = cardById(sourceCarteId)?.name ?? 'La capacité';
      const label = resonanceGroupLabel(effet.tribu);
      duel.log.push(piochees
        ? `${source} : ${piochees} carte${piochees > 1 ? 's' : ''} de type ${label} tirée${piochees > 1 ? 's' : ''} au hasard du deck rejoint${piochees > 1 ? 'ent' : ''} la main.`
        : `${source} ne trouve aucune carte de type ${label} dans le deck.`);
      return;
    }
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
        // Cette défausse immédiate compte pour une de celles de l'effet ; les
        // suivantes s'ajoutent à la fenêtre déjà ouverte (autre Butin, autre
        // Masque du guetteur…) au lieu de l'écraser.
        ouvrirDefausseEnAttente(duel, cote, aDefausser - 1, sourceCarteId);
        return;
      }
      // Plusieurs déclencheurs dans la même fenêtre (deux Butins, un Butin et
      // le Masque…) : les défausses se CUMULENT, une par effet.
      ouvrirDefausseEnAttente(duel, cote, aDefausser, sourceCarteId);
      return;
    }
    case 'retour-main': {
      // Renvoi en main (« bounce » / Rebond) : la cible quitte la table pour la
      // main de son propriétaire. `creature` vise le camp adverse (ou une
      // créature alliée explicitement désignée hors `sauf`), `creature-amie` le
      // camp du lanceur, `toutes-autres` la table entière hors la source (la
      // vague du Léviathan). `pioche` fait piocher le lanceur après le renvoi.
      if (effet.cible === 'toutes-autres') {
        for (const campCible of [cote, adv]) {
          for (const entite of [...duel[campCible].creatures]) {
            if (entite.id === sauf || tenterEsquive(duel, entite, sourceType)) continue;
            renvoyerEnMain(duel, campCible, entite, sourceElement, sourceType);
          }
        }
      } else if (effet.cible === 'creature-amie') {
        const cibles = duel[cote].creatures.filter((entite) => entite.id === cibleId);
        for (const cible of cibles) {
          renvoyerEnMain(duel, cote, cible, sourceElement, sourceType);
        }
      } else {
        const enFace = duel[adv].creatures.find((entite) => entite.id === cibleId);
        const chezSoi = duel[cote].creatures.find((entite) => entite.id === cibleId && entite.id !== sauf);
        if (enFace) {
          renvoyerEnMain(duel, adv, enFace, sourceElement, sourceType);
        } else if (chezSoi) {
          renvoyerEnMain(duel, cote, chezSoi, sourceElement, sourceType);
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
      // Un mana RENDU (le Harnais du méhari, à chaque attaque de son
      // porteur). Il rejoint la réserve ordinaire, celle que remplissent les
      // terrains : l'ancien champ `camp.sable` ne comptait plus pour rien —
      // l'effet dormait faute de carte pour le porter. Comme tout mana, il
      // s'évapore au début du tour suivant s'il n'est pas dépensé.
      duel[cote].mana.sable += Math.max(0, Number(effet.amount) || 0);
      return;
    case 'regarder-dessus': {
      // La Boussole du Hoggar : le désert se lit, il ne se pioche pas. On
      // regarde la première carte du deck (le sommet est la FIN du tableau :
      // `rpgPiocher` le tire d'un `pop`) ; un terrain part en main révélé,
      // tout le reste reste en place et n'est nommé nulle part — l'adversaire
      // n'apprend que ce qu'on veut bien lui montrer.
      const camp = duel[cote];
      const source = cardById(sourceCarteId);
      if (!camp.deck.length) {
        duel.log.push(`${source?.name ?? 'La capacité'} scrute un deck vide.`);
        return;
      }
      const carteDessusId = camp.deck[camp.deck.length - 1];
      const carteDessus = cardById(carteDessusId);
      const estTerrain = carteDessus?.kind === 'terrain' || Boolean(terrainById(carteDessusId));
      if (estTerrain) {
        camp.deck.pop();
        camp.main.push(carteDessusId);
        duel.log.push(`${source?.name ?? 'La capacité'} révèle ${carteDessus?.name ?? 'un terrain'} : il rejoint la main.`);
        return;
      }
      duel.log.push(`${source?.name ?? 'La capacité'} scrute la première carte du deck : ce n’est pas un terrain, elle reste en place.`);
      return;
    }
    case 'compteurs-arme': {
      // La Jitte d’Amayas : les compteurs vivent sur l'arme elle-même
      // (`entite.arme.compteurs`), pas sur la créature — le porteur peut
      // mourir, tomber au cimetière avec ses compteurs, rien ne suit.
      const porteur = duel[cote].creatures.find((entite) => entite.id === sauf);
      if (!porteur?.arme) return;
      const nombre = Math.max(0, Math.floor(Number(effet.amount) || 1));
      porteur.arme.compteurs = Math.max(0, (porteur.arme.compteurs ?? 0) + nombre);
      const carte = armeById(porteur.arme.carteId);
      duel.log.push(`${carte?.name ?? 'L’arme'} gagne ${nombre} compteur${nombre > 1 ? 's' : ''} de sable (${porteur.arme.compteurs} au total).`);
      return;
    }
    case 'soin': {
      // La vie monte de la totalité du soin : elle peut dépasser 25, et le
      // maximum suit (la réserve de vie s'élargit).
      rpgGagnerVie(duel, cote, effet.amount ?? 0);
      return;
    }
    case 'soin-creatures': {
      const montant = Math.max(0, Number(effet.amount) || 0);
      const soins = [];
      for (const entite of duel[cote].creatures) {
        const pvAvant = Number(entite.pv) || 0;
        // Un état restauré ou construit par un scénario peut avoir perdu son
        // plafond : il se relit alors sur la défense actuelle ou imprimée,
        // plutôt que de laisser le soin se perdre dans un `NaN`.
        const plafondDeclare = Number(entite.pvMax);
        const plafond = Number.isFinite(plafondDeclare)
          ? plafondDeclare
          : Math.max(
            pvAvant,
            Number(entite.def) || 0,
            Number(duelCardById(entite.carteId)?.def) || 0,
          );
        entite.pvMax = plafond;
        entite.pv = Math.min(plafond, pvAvant + montant);
        entite.def = Math.min(plafond, Math.max(Number(entite.def) || 0, entite.pv));
        const gagne = entite.pv - pvAvant;
        if (gagne > 0) {
          journaliserSoin(duel, cote, gagne, entite.id);
          soins.push(`${entite.name} +${gagne}`);
        }
        // Le soin peut refermer la blessure qui tenait la Furie allumée.
        synchroniserFurieEntite(duel, entite);
      }
      if (soins.length) {
        const source = sourceCarteId ? cardById(sourceCarteId)?.name : null;
        duel.log.push(`${source ?? 'Soin'} : ${soins.join(', ')}.`);
      }
      // `etJoueur` (Yamina) : le même soin s'étend au sorcier du camp —
      // les créatures d'abord, puis leur maître.
      if ((effet.etJoueur ?? 0) > 0) {
        const pvAvant = duel[cote].pv;
        duel[cote].pv = Math.min(duel[cote].pvMax, duel[cote].pv + effet.etJoueur);
        journaliserSoin(duel, cote, duel[cote].pv - pvAvant);
      }
      return;
    }
    case 'bouclier-lumiere': {
      const entite = duel[cote].creatures.find((candidate) => candidate.id === sauf);
      if (entite) {
        entite.bouclierLumiere = true;
        entite.bouclierEpuise = false;
      }
      return;
    }
    case 'bouclier': {
      if (effet.cible === 'creature-amie') {
        // Sans autre allié (ou lors d’une réanimation), la Veilleuse retombe
        // sur sa propre entité : son arrivée ne se perd jamais.
        const entite = duel[cote].creatures.find((e) => e.id === (cibleId ?? sauf));
        if (entite && !rpgEstProtegee(entite, sourceElement)
          && !rpgEstProtegeeDesSorts(entite, sourceElement, sourceType)) {
          entite.bouclier = (entite.bouclier ?? 0) + (effet.amount ?? 0);
          if (entite.bouclier > 0) entite.bouclierEpuise = false;
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
      // Cinq emplacements au maximum (mode essai) : les jetons qui n'ont pas
      // de place libre ne naissent pas — la table ne dépasse jamais ses cases.
      const crees = Math.min(nombre, placesLibresChamp(duel, cote));
      if (!crees) {
        duel.log.push(`Le champ est plein : les ${(modele.pluriel ?? modele.name).toLowerCase()} ne peuvent pas entrer.`);
        return;
      }
      const source = duel[cote].creatures.find((entite) => entite.id === sauf);
      for (let i = 0; i < crees; i += 1) {
        const jeton = creerEntiteCreature(modele);
        // `ephemere` : le jeton ne survit pas au tour qui l'a vu naître —
        // `rpgFinDeTour` le détruit (serpents du Bâton des citernes).
        if (effet.ephemere) jeton.detruireFinDuTour = true;
        duel[cote].creatures.push(jeton);
        placerDansEmplacement(duel, cote, jeton);
      }
      const nom = crees > 1 ? (modele.pluriel ?? modele.name) : modele.name;
      duel.log.push(`${source?.name ?? 'L’effet'} crée ${crees} ${nom.toLowerCase()} ${modele.atk}/${modele.def} sans coût${effet.ephemere ? ', détruit à la fin du tour' : ''}.`);
      if (crees < nombre) {
        const restants = nombre - crees;
        duel.log.push(`Le champ est plein : ${restants} ${(modele.pluriel ?? modele.name).toLowerCase()} de plus ne peu${restants > 1 ? 'vent' : 't'} pas entrer.`);
      }
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
      // `cible: 'porteur'` : le bonus ne vise que la créature désignée par
      // `sauf` — un mode de la Jitte d’Amayas grandit le porteur seul, pas le
      // camp entier. Toutes les autres buffs campent sur le camp et
      // s'excluent elles-mêmes (`sauf`).
      const horsSort = (entite) => contreAdversaire && sourceType === 'magie'
        && (rpgEstProtegeeDesSorts(entite, sourceElement, sourceType) || tenterEsquive(duel, entite, sourceType));
      const ciblesBuff = effet.cible === 'porteur'
        ? campCible.creatures.filter((entite) => entite.id === sauf && !rpgEstProtegee(entite, sourceElement))
        : campCible.creatures.filter((entite) => entite.id !== sauf
          && !rpgEstProtegee(entite, sourceElement)
          && !horsSort(entite)
          // Le Grand Débarquement ne renforce que les cales pleines : une
          // créature sans prise à bord ne débarque personne.
          && (!effet.caleOccupeeSeulement || Boolean(entite.enCale)));
      // `tribut` (l'Offrande de lin) : le renfort porte aussi le mot-clé —
      // chaque créature touchée gagne Tribut X, rendu avec le bonus quand le
      const bonusTribut = Math.max(0, Number(effet.tribut) || 0);
      const bonusOverkill = effet.overkill ? 1 : 0;
      for (const entite of ciblesBuff) {
        const bonusAttaque = effet.atk ?? 0;
        const bonusDefense = effet.def ?? 0;
        entite.atk = Math.max(plancher, entite.atk + bonusAttaque);
        entite.pvMax = Math.max(plancher, (entite.pvMax ?? entite.def) + bonusDefense);
        entite.def = Math.max(plancher, entite.def + bonusDefense);
        entite.pv = Math.max(plancher, entite.pv + bonusDefense);
        if (bonusTribut) entite.tribut = (entite.tribut ?? 0) + bonusTribut;
        if (bonusOverkill) {
          entite.overkill = true;
          if (temporaire) entite.overkillTemporaire = (entite.overkillTemporaire ?? 0) + bonusOverkill;
        }
        if (temporaire) carnet.push({ entiteId: entite.id, atk: bonusAttaque, def: bonusDefense, tribut: bonusTribut, overkill: bonusOverkill, tour: duel.tour });
        // Un malus qui ronge jusqu'à l'os tue sa victime (la Lame de verre) —
        // et la mort est attribuée à la couleur de la source, pour le journal.
        if (!(entite.pv > 0) && plancher <= 0) {
          enterrer(duel, contreAdversaire ? adv : cote, entite, sourceElement ? [sourceElement] : []);
          continue;
        }
        if (effet.blocageForce) {
          entite.blocageForce = { par: cote, portee: effet.blocageForce === 'tour' ? 'tour' : 'attaque' };
          forces += 1;
        }
      }
      if (forces) {
        duel.log.push(`${forces} créature${forces > 1 ? 's adverses doivent' : ' adverse doit'} bloquer si ${forces > 1 ? 'elles le peuvent' : 'elle le peut'} ${effet.blocageForce === 'tour' ? 'ce tour' : 'lors de votre prochaine attaque'}.`);
      }
      // Les cales pleines du Grand Débarquement se lisent au journal : qui
      // détient une prise débarque en force, les autres regardent.
      if (effet.caleOccupeeSeulement) {
        duel.log.push(ciblesBuff.length
          ? `Les cales pleines débarquent : ${ciblesBuff.map((entite) => entite.name).join(', ')} gagne${ciblesBuff.length > 1 ? 'nt' : ''} +${effet.atk ?? 0}/+${effet.def ?? 0}${bonusOverkill ? ' et Overkill' : ''}${temporaire ? ' jusqu’à la fin du tour' : ''}.`
          : 'Aucune cale n’est occupée : personne ne débarque.');
      }
      // Un buff peut armer aussi les arrivées : jusqu'à la fin du tour,
      // chaque créature que le camp pose accoste en prenant (seuil
      // coût − 1, le même barème que l'imprimé — voir `seuilAbordage`).
      if (effet.arriveesAbordage) {
        duel[cote].abordageDesArrivees = true;
        duel.log.push('Jusqu’à la fin du tour, les créatures qui arrivent en jeu ont Abordage.');
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
      if (!entite || rpgEstProtegee(entite, sourceElement)
        || rpgEstProtegeeDesSorts(entite, sourceElement, sourceType)) return;
      entite.blocageForce = { par: cote, portee: effet.portee === 'tour' ? 'tour' : 'attaque' };
      duel.log.push(`${entite.name} devra bloquer si elle le peut lors de votre prochaine attaque.`);
      return;
    }
    case 'infiltration': {
      // Le ralliement de Tin Hinan : les créatures du camp passent incognito
      // jusqu'à la fin du tour (Infiltration : impossibles à bloquer).
      // `cible: 'autres-allies'` — la version validée de la matriarche : elle
      // ouvre la route POUR LES SIENS, elle ne gagne rien elle-même, et le
      // boost de stats a disparu (`atk`/`def` restent disponibles pour
      // d'autres cartes). Le passe-droit s'efface à `rpgFinDeTour` (voir
      // `annulerInfiltrations`).
      const source = duel[cote].creatures.find((entite) => entite.id === sauf);
      const bonusAttaque = effet.atk ?? 0;
      const bonusDefense = effet.def ?? 0;
      const ouvreLaRoute = effet.cible === 'autres-allies';
      for (const entite of duel[cote].creatures) {
        if (ouvreLaRoute && entite.id === sauf) continue;
        if (rpgEstProtegee(entite, sourceElement)
          || rpgEstProtegeeDesSorts(entite, sourceElement, sourceType)) continue;
        entite.atk += bonusAttaque;
        entite.pvMax = (entite.pvMax ?? entite.def) + bonusDefense;
        entite.def += bonusDefense;
        entite.pv += bonusDefense;
        entite.infiltration = true;
        entite.infiltrationTour = true; // passe-droit du tour : voir `annulerInfiltrations`
      }
      duel.log.push(`Infiltration : ${source?.name ?? 'l’effet'} ouvre la route — ${ouvreLaRoute ? 'ses autres créatures' : 'ses créatures'} sont impossibles à bloquer ce tour.`);
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
          // Le duel de créatures nomme ses deux combattants : le mort sait
          // laquelle l'a détruit (le Brûlot embrase son tueur).
          sourceCote: cote,
          sourceId: combattant.id,
        },
        {
          cote,
          entiteId: combattant.id,
          amount: cible.atk,
          sourceElement: cardColors(duelCardById(cible.carteId)),
          sourceType: 'capacite',
          sourceCote: adv,
          sourceId: cible.id,
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
      if (effet.cible === 'toutes-autres') {
        // Photographie des deux champs : la source est épargnée et les jetons
        // créés par les morts ne subissent pas la vague qui les a fait naître.
        const coups = [cote, adv].flatMap((camp) => duel[camp].creatures
          .filter((entite) => entite.id !== sauf)
          .map((entite) => ({ cote: camp, entiteId: entite.id,
            amount: effet.amount ?? 0, sourceElement, sourceType })));
        appliquerDegatsDeCombatSimultanes(duel, coups);
        return;
      }
      if (effet.cible === 'sorcier') {
        rpgInfligerSorcier(duel, adv, effet.amount ?? 0);
        differerEcho(duel, cote, adv, effet, sourceElement, sourceType, sourceCarteId);
        return;
      }
      // La plupart des vagues « toutes-creatures » sont hostiles. Ifrit
      // al-Ahmar déclare explicitement `inclutAllies` : sa vague balaie les
      // deux camps et ne s'épargne pas elle-même.
      const cibles = effet.cible === 'toutes-creatures'
        ? (effet.inclutAllies
          ? [cote, adv].flatMap((camp) => duel[camp].creatures.map((entite) => ({ entite, camp })))
          : duel[adv].creatures.map((entite) => ({ entite, camp: adv })))
        : duel[adv].creatures.filter((entite) => entite.id === cibleId).map((entite) => ({ entite, camp: adv }));
      // `gelChance` (le Hurlement du blizzard, la Brume du fjord) : chaque
      // créature touchée tire son propre jet — le même hasard que le duel.
      const rngGel = hasardParDuel.get(duel) ?? Math.random;
      for (const { entite: cible, camp: campCible } of cibles) {
        const blessure = rpgBlesserCreature(duel, campCible, cible.id, effet.amount ?? 0, sourceElement, null, sourceType, sourceCarteId);
        // Un sort esquivé est annulé en entier sur cette créature : ni dégât,
        // ni gel associé. Les autres cibles font leur propre jet.
        if (blessure.esquive) continue;
        // Le gel (`gel`) accompagne les dégâts — la Poigne de givre, le
        // Verglas. La créature tuée n'a rien à figer ; la survivante ne
        // rejoindra ni l'attaque ni le blocage avant la fin de son prochain tour.
        if (effet.gel || effet.gelChance) {
          const survivante = duel[campCible].creatures.find((entite) => entite.id === cible.id);
          if (!survivante) continue;
          if (rpgEstProtegeeDesSorts(survivante, sourceElement, sourceType)) continue;
          if (rpgEstProtegee(survivante, sourceElement)) continue;
          if (effet.gel || rngGel() < effet.gelChance) {
            gelerEntite(duel, survivante);
          } else {
            duel.log.push(`${survivante.name} secoue le givre : le gel ne prend pas.`);
          }
        }
      }
      // `etSorcier` : le feu se propage jusqu'au sorcier adverse (le Braisier
      // du souk) — le même effet frappe la table, puis le visage.
      if (effet.etSorcier) {
        rpgInfligerSorcier(duel, adv, effet.etSorcier);
      }
      differerEcho(duel, cote, adv, effet, sourceElement, sourceType, sourceCarteId);
      return;
    }
    case 'magie-gratuite': {
      // Le Kraken : à l'arrivée, son contrôleur PEUT lancer une magie rapide
      // ou une sorcellerie de sa main sans payer son coût de mana (le Prix en
      // PV, lui, se paie toujours). Côté joueur, le jeton d'attente
      // `duel.magieGratuite` reste ouvert jusqu'au lancement — ou s'éteint
      // avec le tour. Côté sorcier, l'IA lance aussitôt son meilleur sort
      // jouable, cible choisie par ses heuristiques.
      if (cote === 'sorcier') {
        duel.magieGratuite = { cote, carteId: sourceCarteId };
        const candidates = duel.sorcier.main
          .map((id) => magieById(id))
          .filter((magie) => magie && magie.effet?.type !== 'contresort')
          .sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0));
        for (const magie of candidates) {
          const cible = choisirCibleAutoIA(duel, cote, magie);
          if (rpgLancerMagie(duel, cote, magie.id, cible).ok) break;
        }
        duel.magieGratuite = null;
        return;
      }
      duel.magieGratuite = { cote, carteId: sourceCarteId };
      duel.log.push(`${cardById(sourceCarteId)?.name ?? 'Le Kraken'} : vous pouvez lancer une magie rapide ou une sorcellerie de votre main sans payer son coût de mana.`);
      return;
    }
    case 'gel': {
      // Le gel **sans blessure** (le Géant des banquises) : le froid seul fige
      // les créatures adverses — ni attaque ni blocage jusqu'à la fin de leur
      // prochain tour. La protection contre la couleur de la source fait écran
      // au gel exactement comme elle ferait écran aux dégâts.
      const cibles = effet.cible === 'toutes-creatures'
        ? duel[adv].creatures.filter((entite) => !rpgEstProtegee(entite, sourceElement)
          && !rpgEstProtegeeDesSorts(entite, sourceElement, sourceType)
          && !tenterEsquive(duel, entite, sourceType))
        : duel[adv].creatures.filter((entite) => entite.id === cibleId
          && (!Number.isFinite(effet.coutMax) || rpgCoutEntite(entite) <= effet.coutMax)
          && !rpgEstProtegee(entite, sourceElement)
          && !rpgEstProtegeeDesSorts(entite, sourceElement, sourceType));
      for (const cible of cibles) gelerEntite(duel, cible);
      return;
    }
    case 'recyclage': {
      // Cimetière → main : la Dune marchante renvoie les magies, le
      // Faussoyeur les créatures, le Scribe n'importe quelle carte de la
      // Liste (`cible` : 'magie-cimetiere' | 'creature-cimetiere' |
      // 'carte-cimetiere'). La DERNIÈRE entrée qui convient part en main —
      // la dépouille la plus fraîche. La source qui vient de mourir ne se
      // renvoie jamais elle-même : la Liste survit à ceux qui la tiennent,
      // pas à eux-mêmes.
      const camp = duel[cote];
      const convient = {
        'magie-cimetiere': (id) => Boolean(magieById(id)),
        'creature-cimetiere': (id) => {
          const carteAuCimetiere = duelCardById(id);
          return Boolean(carteAuCimetiere) && !magieById(id) && !armeById(id)
            && carteAuCimetiere.kind !== 'terrain';
        },
        'carte-cimetiere': (id) => Boolean(cardById(id)),
      }[effet.cible ?? 'carte-cimetiere'] ?? ((id) => Boolean(cardById(id)));
      const fin = sourceCarteId && camp.cimetiere[camp.cimetiere.length - 1] === sourceCarteId
        ? camp.cimetiere.length - 1
        : camp.cimetiere.length;
      let index = -1;
      for (let i = fin - 1; i >= 0; i -= 1) {
        if (convient(camp.cimetiere[i])) { index = i; break; }
      }
      const source = sauf ? duel[cote].creatures.find((entite) => entite.id === sauf) : null;
      const nomSource = source?.name ?? duelCardById(sourceCarteId)?.name ?? 'La capacité';
      if (index < 0) {
        duel.log.push(`${nomSource} : rien à renvoyer du cimetière.`);
        return;
      }
      const [carteRenvoyee] = camp.cimetiere.splice(index, 1);
      camp.main.push(carteRenvoyee);
      duel.log.push(`${nomSource} renvoie ${cardById(carteRenvoyee)?.name ?? carteRenvoyee} du cimetière en main.`);
      return;
    }
    case 'reanimation': {
      // Cimetière → table (la Réanimation du Sable) : la dernière créature du
      // cimetière revient en jeu — avec son mal d'invocation ordinaire (elle
      // n'attaquera qu'à votre prochain tour, sauf Rapidité) et ses arrivées.
      const camp = duel[cote];
      const convient = (id) => {
        const carteAuCimetiere = duelCardById(id);
        return Boolean(carteAuCimetiere) && !magieById(id) && !armeById(id)
          && carteAuCimetiere.kind !== 'terrain';
      };
      let index = -1;
      for (let i = camp.cimetiere.length - 1; i >= 0; i -= 1) {
        if (convient(camp.cimetiere[i])) { index = i; break; }
      }
      if (index < 0) {
        duel.log.push('Réanimation : aucune créature au cimetière.');
        return;
      }
      // Pas de place libre : la créature reste au cimetière, la carte n'est
      // pas consommée. Un mort ne revient pas « à côté » des cinq cases.
      if (!placesLibresChamp(duel, cote)) {
        const carteEnAttente = duelCardById(camp.cimetiere[index]);
        duel.log.push(`Réanimation : aucune place libre — ${carteEnAttente?.name ?? 'la créature'} reste au cimetière.`);
        return;
      }
      const [carteRevivee] = camp.cimetiere.splice(index, 1);
      const carte = duelCardById(carteRevivee);
      const entite = creerEntiteCreature(carte);
      camp.creatures.push(entite);
      placerDansEmplacement(duel, cote, entite);
      duel.log.push(`Réanimation : ${carte.name} revient en jeu.`);
      appliquerArriveeDeRetour(duel, cote, carte, entite);
      return;
    }
    case 'heures': {
      // Le Guetteur du beffroi : un compte à rebours d'Heures posé sur lui.
      // `resoudreHeures` le décompte au début de chaque tour du contrôleur et
      // résout `effetFinal` à la sonnerie (le dernier compteur retiré).
      const entite = duel[cote].creatures.find((candidate) => candidate.id === sauf);
      if (!entite) return;
      const compteurs = Math.max(1, Math.floor(Number(effet.compteurs) || 2));
      entite.heures = { restants: compteurs, effet: effet.effetFinal ?? null };
      duel.log.push(`${entite.name} commence à compter : ${compteurs} heures.`);
      return;
    }
    case 'debuff': {
      // Le venin de la Vipère de verre : une créature adverse ciblée perd du
      // pouvoir (`atk`/`def` négatifs) et peut être empêchée d'attaquer
      // (`empecheAttaque`) ou de bloquer (`empecheBlocage`) jusqu'à la fin de
      // son prochain tour. La langue de l'Eau : elle ronge, elle ne brûle pas
      // (`minimum` empêche de tuer par la statistique seule — l'Embuscade).
      const entite = duel[adv].creatures.find((candidate) => candidate.id === cibleId);
      if (!entite || rpgEstProtegee(entite, sourceElement)) return;
      if (rpgEstProtegeeDesSorts(entite, sourceElement, sourceType)) return;
      const plancher = Number.isFinite(effet.minimum) ? effet.minimum : 0;
      const bonusDefense = effet.def ?? 0;
      entite.atk = Math.max(plancher, entite.atk + (effet.atk ?? 0));
      entite.pvMax = Math.max(plancher, (entite.pvMax ?? entite.def) + bonusDefense);
      entite.def = Math.max(plancher, entite.def + bonusDefense);
      entite.pv = Math.max(plancher, entite.pv + bonusDefense);
      const duree = dureeJusquAuProchainTour(duel, entite);
      if (Number(effet.tours) > 0) {
        if (effet.empecheAttaque || effet.empecheBlocage) {
          // Le venin de la Vipère : la morsure (-2/-0) vit aussi longtemps que
          // l'interdit d'attaquer — jusqu'à la fin du prochain tour de la
          // victime. Elle s'efface donc AVEC lui, et non à la fin du tour qui
          // l'a vue naître (le carnet des renforts, lui, s'évapore à ce
          // moment-là : la bouchée serait déjà partie avant le tour de la
          // victime, et le venin ne rongerait plus rien).
          entite.venin = { atk: effet.atk ?? 0, def: bonusDefense, toursRestants: duree };
        } else {
          const carnet = (duel[adv].bonusTemporaires ??= []);
          carnet.push({ entiteId: entite.id, atk: effet.atk ?? 0, def: bonusDefense, tour: duel.tour });
        }
      }
      if (effet.empecheAttaque) {
        entite.empecheAttaqueToursRestants = Math.max(entite.empecheAttaqueToursRestants, duree);
        duel.log.push(`${entite.name} ne pourra pas attaquer avant la fin de son prochain tour.`);
      }
      if (effet.empecheBlocage) {
        entite.empecheBlocageToursRestants = Math.max(entite.empecheBlocageToursRestants, duree);
        duel.log.push(`${entite.name} ne pourra pas bloquer avant la fin de son prochain tour.`);
      }
      // Le venin qui ronge jusqu'à l'os tue sa victime (la Lame de mer ronge
      // les 1/1) — la mort est attribuée à la couleur de la source.
      if (!(entite.pv > 0) && plancher <= 0) {
        enterrer(duel, adv, entite, sourceElement ? [sourceElement] : []);
      }
      return;
    }
    case 'empeche-blocage': {
      // La lune dévorée de Bakunawa : la créature adverse ciblée reste sur la
      // table, mais la défense s'éteint — elle ne peut pas bloquer jusqu'à la
      // fin de son prochain tour.
      const entite = duel[adv].creatures.find((candidate) => candidate.id === cibleId);
      if (!entite || rpgEstProtegee(entite, sourceElement)
        || rpgEstProtegeeDesSorts(entite, sourceElement, sourceType)) return;
      entite.empecheBlocageToursRestants = Math.max(
        entite.empecheBlocageToursRestants,
        dureeJusquAuProchainTour(duel, entite),
      );
      duel.log.push(`${entite.name} ne pourra pas bloquer avant la fin de son prochain tour.`);
      return;
    }
    case 'donne': {
      // Le Faiseur de passage : un mot-clé prêté à une créature alliée pour
      // le tour (`donne: { infiltration: true }` — le passage est ouvert).
      const cibleEquipe = effet.cible === 'toutes-alliees';
      const ciblesDonne = cibleEquipe
        ? duel[cote].creatures.slice()
        : [duel[cote].creatures.find((candidate) => candidate.id === cibleId)].filter(Boolean);
      if (!ciblesDonne.length) return;
      for (const entite of ciblesDonne) {
        if (rpgEstProtegee(entite, sourceElement)
          || rpgEstProtegeeDesSorts(entite, sourceElement, sourceType)) continue;
        if (effet.donne?.infiltration) {
          entite.infiltration = true;
          entite.infiltrationTour = true;
          duel.log.push(`${entite.name} gagne Infiltration jusqu’à la fin du tour.`);
        }
        if (effet.donne?.rapidite) entite.ready = true;
      }
      return;
    }
    case 'prochaine-arrivee-abordage': {
      // Le Pilote de la Carreira lit la route pour le seul prochain départ :
      // la **prochaine** créature jouée ce tour accoste avec Abordage (même
      // barème que l'imprimé, coût − 1). Le sceau est consommé par cette
      // pose et meurt de toute façon avec le tour (`rpgFinDeTour`).
      duel[cote].prochaineArriveeAbordage = true;
      duel.log.push('La prochaine créature jouée ce tour a Abordage.');
      return;
    }
    case 'arrivees-abordage': {
      // La Lettre de marque : la Chancellerie arme les arrivées — jusqu'à la
      // fin du tour, chaque créature que le camp pose accoste en prenant (le
      // seuil suit le barème de l'imprimé : coût de l'arrivante − 1, voir
      // `seuilAbordage`). Les créatures déjà en jeu ne gagnent rien : le
      // sceau ne se gratte pas après coup, et la cale déjà prise reste
      // pleine (doc 18 §12.10).
      duel[cote].abordageDesArrivees = true;
      duel.log.push('Jusqu’à la fin du tour, les créatures qui arrivent en jeu ont Abordage.');
      return;
    }
    default:
  }
}

/**
 * L'entrée unique des effets du duel. Elle applique l'effet, puis laisse la
 * Contre-attaque répondre si l'effet **désignait** une créature adverse :
 * une capacité se paie sur la créature qui la porte, un sort sur le sorcier
 * qui l'a lancé. Un effet esquivé par la cible déclenche la riposte comme un
 * effet encaissé — l'Esquive ne rend pas le coup moins vif.
 */
function appliquer(duel, cote, effet, cibleId, sauf = null, sourceElement = null, sourceType = null, sourceCarteId = null) {
  appliquerEffet(duel, cote, effet, cibleId, sauf, sourceElement, sourceType, sourceCarteId);
  riposterSurEffet(duel, cote, effet, cibleId, sauf, sourceType);
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
function renvoyerEnMain(duel, cote, entite, sourceElement = null, sourceType = null) {
  const camp = duel[cote];
  const presente = camp.creatures.find((e) => e.id === entite.id);
  if (!presente) return false;
  if (rpgEstProtegee(presente, sourceElement) || rpgEstProtegeeDesSorts(presente, sourceElement, sourceType)) {
    duel.log.push(`${presente.name} échappe au renvoi : protégée.`);
    return false;
  }
  camp.creatures = camp.creatures.filter((e) => e.id !== presente.id);
  detacherArmes(duel, cote, presente);
  // Une arme, elle, ne suit pas son porteur en main : elle tombe au cimetière.
  armeAuCimetiere(duel, cote, presente);
  // Le capteur renvoyé en main rend sa cale : le prisonnier repart lui aussi
  // en main, du côté de son propriétaire — deux cartes en main pour le prix
  // d'un renvoi, c'est le risque du corsaire.
  ouvrirCale(duel, cote, presente);
  // Une créature-jeton n'a pas de carte à renvoyer : elle **cesse d'exister**,
  // comme un jeton de table qui quitte le champ de bataille. Sans cette règle,
  // un chien de sable de Tarek deviendrait une carte gratuite et rejouable.
  if (presente.jeton) {
    duel.log.push(`${presente.name} quitte la table : un jeton cesse d’exister.`);
    rafraichirAuras(duel);
    return true;
  }
  camp.main.push(presente.carteId);
  journaliserRenvoiEnMain(duel, cote, presente);
  duel.log.push(`${presente.name} retourne dans la main de son propriétaire.`);
  rafraichirAuras(duel);
  return true;
}

/**
 * Sacrifice consenti du mode sans terrains : une créature du camp quitte le
 * plateau pour le cimetière afin de libérer l'un des cinq emplacements. C'est
 * une vraie destruction — armes détachées au cimetière, capacité de
 * destruction et Harakiri déclenchés. Une créature tenace meurt donc pour de
 * bon : seule sa renaissance (Tenacité) lui rendra une présence au tour
 * suivant.
 */
export function rpgSacrifierCreature(duel, cote, entiteId) {
  if (duel?.modeMana !== RPG_MODE_MANA_ESSAI) return { ok: false, raison: 'mode' };
  const camp = duel?.[cote];
  const entite = camp?.creatures.find((candidate) => candidate.id === entiteId);
  if (!entite) return { ok: false, raison: 'absente' };
  if (estSite(entite)) return { ok: false, raison: 'indestructible' };
  duel.log.push(`${cote === 'joueur' ? 'Vous sacrifiez' : 'Le sorcier sacrifie'} ${entite.name} pour libérer un emplacement.`);
  sacrifierCreature(duel, cote, entite);
  rafraichirAuras(duel);
  rpgActionsEtat(duel);
  return { ok: true, entite, carteId: entite.carteId };
}

/**
 * Tenacité — la renaissance, au prochain tour du camp qui contrôle la carte.
 * Une fois par partie, une créature tenace **meurt** normalement (cimetière,
 * arme au cimetière, capacité de mort et Harakiri déclenchés : rien n'est
 * refusé) mais sa carte est promise à un retour au début du prochain tour de
 * son contrôleur, avec 1 point de défense.
 *
 * Le compteur de `retoursProgrammes` tombe à **chaque** changement de tour,
 * pour les deux camps : deux crans si le mourant tombe pendant son propre
 * tour, un seul s'il tombe pendant celui de l'adversaire. Dans les deux cas,
 * il revient au début du prochain tour de son camp.
 *
 * L'exil ne programme rien : la carte est retirée de la partie et n'a plus de
 * cimetière d'où revenir (`case 'exil'` ne passe pas par ici). La renaissance
 * elle-même est une présence neuve, **sans** Tenacité : la renaissance est
 * dépensée, et une seconde mort est définitive pour cette présence — comme
 * pour la Furie, une carte repassée en main puis rejouée repart, elle, d'une
 * présence neuve.
 *
 * La renaissance est une **vraie arrivée en jeu** : l'effet d'arrivée de la
 * carte retentit (voir `appliquerArriveeDeRetour`). Un Maître du marteau qui
 * revient frappe donc de nouveau ses 3 dégâts, et les corbeaux du Père des
 * corbeaux emportent une nouvelle créature.
 */
function programmerRetourTenacite(duel, cote, entite) {
  // Seule une vraie carte le peut : un jeton n'a pas de Tenacité, et sa mort
  // ne laisse aucune carte au cimetière où la retrouver.
  if (!entite?.tenaciteDisponible || entite.jeton) return;
  const camp = duel[cote];
  camp.retoursProgrammes ??= [];
  camp.retoursProgrammes.push({
    carteId: entite.carteId,
    toursRestants: duel.tour === cote ? 2 : 1,
    tenacite: true,
  });
  duel.log.push(`Tenacité : ${entite.name} reviendra en jeu au prochain tour de son camp avec 1 point de défense.`);
}

/** Retire une créature morte, puis déclenche sa capacité de destruction. */
function enterrer(duel, cote, entite, sourceElements = [], declenchements = null) {
  rejoindreCimetiere(duel, cote, entite, sourceElements, 'est détruite et rejoint le cimetière.', declenchements);
}

/**
 * Sacrifice : la créature quitte la table **par la volonté de son camp** — le
 * prix d'une pose quand le champ des cinq places est plein (mode essai). Comme
 * une destruction, elle meurt pour de bon : elle rejoint le cimetière et
 * déclenche sa capacité de « quand elle meurt ». Une créature tenace profite
 * donc, elle aussi, du retour promis au prochain tour de son camp.
 */
function sacrifierCreature(duel, cote, entite) {
  if (estSite(entite)) return false;
  rejoindreCimetiere(duel, cote, entite, [], 'est sacrifiée et rejoint le cimetière.');
  return true;
}

/**
 * Capacité « quand elle est détruite ». La plupart s'appliquent sans choix
 * (le Kraken pioche, l'Ifrit frappe le sorcier) ; les dégâts à **une**
 * créature (le Ghul des cendres) demandent une cible, et c'est le contrôleur
 * du mort qui la désigne : l'IA choisit seule, le joueur passe par l'attente
 * `duel.destructionsEnAttente`. Le joueur désigne **toujours**, même quand une
 * seule créature est légale — le jeu attend son clic —, et sans cible légale
 * l'effet se dissipe.
 */
function declencherCapaciteDestruction(duel, cote, carte, carteId) {
  const effet = carte.destruction;
  // `degats-tueur` (Le Brûlot) ne se résout qu'au combat, là où les sources
  // des blessures sont connues : ailleurs, il n'y a pas de tueur à embraser.
  if (effet?.type === 'degats-tueur') return;
  if (!(effet?.type === 'degats' && effet.cible === 'creature')) {
    appliquer(duel, cote, effet, null, null, cardColors(carte), null, carteId);
    return;
  }
  const adv = autre(cote);
  const legales = duel[adv].creatures.filter((entite) => !rpgEstProtegee(entite, cardColors(carte)));
  if (!legales.length) {
    duel.log.push(`${carte.name} se dissipe : aucune créature adverse à frapper.`);
    return;
  }
  const resoudre = (cibleId) => appliquer(duel, cote, effet, cibleId, null, cardColors(carte), null, carteId);
  if (cote === 'sorcier') {
    const choix = choisirCibleAutoIA(duel, cote, { ...carte, arrivee: effet });
    resoudre(legales.some((entite) => entite.id === choix) ? choix : legales[0].id);
    return;
  }
  duel.destructionsEnAttente = duel.destructionsEnAttente ?? [];
  duel.destructionsEnAttente.push({ cote, carteId });
  const amount = effet.amount ?? 0;
  duel.log.push(`${carte.name} : désignez la créature adverse qui subira ${amount} dégât${amount > 1 ? 's' : ''}.`);
}

/** Sortie commune au cimetière : retrait, armes, capacité de destruction. */
function rejoindreCimetiere(duel, cote, entite, sourceElements, libelle, declenchements = null) {
  if (estSite(entite)) return false;
  // Le mort qui tenait une cale la rend : le prisonnier revient EN JEU (la
  // mort du capteur n'est pas un renvoi), et la Cargaison du mort paie son
  // assurance.
  ouvrirCale(duel, cote, entite, { enJeu: true });
  declencherCargaison(duel, cote, entite);
  journaliserDestruction(duel, entite, sourceElements);
  const declencherArme = armeDePorteurMort(duel, cote, entite);
  const camp = duel[cote];
  camp.creatures = camp.creatures.filter((e) => e.id !== entite.id);
  camp.cimetiere.push(entite.carteId);
  detacherArmes(duel, cote, entite);
  duel.log.push(`${entite.name} ${libelle}`);
  // Tenacité : la mort est réelle, mais la carte est promise à un retour au
  // prochain tour de son camp. Programmée avant les déclenchements de mort :
  // une réanimation immédiate (le Khopesh) retirera la carte du cimetière et
  // le retour programmé se dissipera faute de carte à reprendre.
  programmerRetourTenacite(duel, cote, entite);
  const declencher = () => {
    declencherArme?.();
    const carte = duelCardById(entite.carteId);
    if (carte?.destruction) {
      declencherCapaciteDestruction(duel, cote, carte, entite.carteId);
    }
    declencherHarakiri(duel, cote, entite);
  };
  if (declenchements) declenchements.push(declencher);
  else {
    declencher();
    rafraichirAuras(duel);
  }
}

/**
 * Combien de créatures peuvent encore entrer sur le champ. En essai, les cinq
 * emplacements dessinés sur le plateau sont les **seules** places : un jeton,
 * une réanimation ou un retour programmé doit lui aussi en prendre une. Hors
 * essai, le format historique garde son champ sans plafond.
 */
function placesLibresChamp(duel, cote) {
  if (duel.modeMana !== RPG_MODE_MANA_ESSAI) return Infinity;
  return Math.max(0, RPG_MANA_ESSAI_CHAMP_MAX - duel[cote].creatures.length);
}

/**
 * Mode essai : chaque créature posée **garde sa case** (0 à 4) tant qu'elle
 * reste en jeu. Quand une créature quitte le champ (mort, sacrifice, renvoi),
 * sa case se vide et les autres ne glissent pas pour la combler ; la créature
 * suivante prend la première case libre — ou, pour un sacrifice, la case de
 * la victime (`prefere`). Hors essai, la rangée garde son ordre de pose.
 */
function placerDansEmplacement(duel, cote, entite, prefere = null) {
  if (duel.modeMana !== RPG_MODE_MANA_ESSAI || !entite) return;
  const prises = new Set(rpgEmplacementsChamp(duel[cote])
    .map((occupant, index) => (occupant && occupant !== entite ? index : null))
    .filter((index) => index !== null));
  if (Number.isInteger(prefere) && prefere >= 0 && prefere < RPG_MANA_ESSAI_CHAMP_MAX && !prises.has(prefere)) {
    entite.emplacement = prefere;
    return;
  }
  for (let index = 0; index < RPG_MANA_ESSAI_CHAMP_MAX; index += 1) {
    if (!prises.has(index)) {
      entite.emplacement = index;
      return;
    }
  }
}

/**
 * Les cinq cases d'un camp (`duel.joueur`, `duel.sorcier`) en essai : un tableau de cinq entrées, la créature
 * qui occupe chaque case ou `null`. Une créature sans case connue (partie
 * sauvegardée avant les cases fixes) ou en doublon prend la première case
 * libre, dans l'ordre de la rangée — sans rien modifier de l'état du duel.
 */
export function rpgEmplacementsChamp(camp) {
  const cases = Array.from({ length: RPG_MANA_ESSAI_CHAMP_MAX }, () => null);
  const sansCase = [];
  for (const entite of camp?.creatures ?? []) {
    const index = entite?.emplacement;
    if (Number.isInteger(index) && index >= 0 && index < RPG_MANA_ESSAI_CHAMP_MAX && !cases[index]) {
      cases[index] = entite;
    } else {
      sansCase.push(entite);
    }
  }
  for (const entite of sansCase) {
    const libre = cases.indexOf(null);
    if (libre < 0) break;
    cases[libre] = entite;
  }
  return cases;
}

/** La créature qu'un camp sacrifie de lui-même : la plus frêle d'abord, la
 *  plus entamée ensuite — l'IA (et une pose sans désignation) garde toujours
 *  ses meilleures cartes quand le champ est plein. */
function choisirSacrifice(camp) {
  return camp.creatures.filter((entite) => !estSite(entite)).sort((a, b) =>
    ((a.atk ?? 0) + (a.def ?? 0)) - ((b.atk ?? 0) + (b.def ?? 0))
    || (a.pv ?? 0) - (b.pv ?? 0))[0] ?? null;
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
  // Filet de sécurité pour les soins et changements de statistiques qui ne
  // passent ni par une blessure ni par un rafraîchissement d'auras.
  synchroniserFuries(duel);
  return retirees;
}

/** Dégâts sur une créature : à 0 défense, elle meurt (capacité comprise).
 *  `sourceCarteId` ne sert qu'au journal des blessures : la table y reconnaît
 *  le coup qui mérite sa propre cinématique (l'Éclair du marteau). */
export function rpgBlesserCreature(duel, cote, entiteId, amount, sourceElement = null, sourceElements = null, sourceType = null, sourceCarteId = null) {
  const entite = duel[cote].creatures.find((e) => e.id === entiteId);
  if (!entite) return { ok: false, raison: 'absente' };
  if (rpgEstProtegee(entite, sourceElement)) {
    return { ok: true, recus: 0, absorbes: 0, protegee: true };
  }
  // Le Serpent du monde : les sorts ne le blessent pas, même en zone.
  if (rpgEstProtegeeDesSorts(entite, sourceElement, sourceType)) {
    return { ok: true, recus: 0, absorbes: 0, protegee: true };
  }
  if (entite.bouclierLumiere && (sourceType === 'attaque' || sourceType === 'magie')) {
    entite.bouclierLumiere = false;
    if (!(entite.bouclier > 0)) entite.bouclierEpuise = true;
    return { ok: true, recus: 0, absorbes: 0, bouclierLumiere: true };
  }
  if (tenterEsquive(duel, entite, sourceType)) {
    return { ok: true, recus: 0, absorbes: 0, esquive: true };
  }
  const apresEsquive = Math.max(0, amount);
  const absorbes = absorberBouclier(entite, apresEsquive);
  const recus = apresEsquive - absorbes;
  entite.pv -= recus;
  entite.def = Math.min(entite.def, Math.max(0, entite.pv));
  const elements = sourceElements ?? (sourceElement ? [sourceElement] : []);
  let mortelle = false;
  if (entite.pv <= 0) {
    // À 0 PV la créature meurt vraiment : Tenacité ne refuse plus la
    // destruction, elle promet seulement une renaissance au prochain tour.
    // Une morte ne s'enflamme donc jamais de Furie.
    enterrer(duel, cote, entite, elements);
    mortelle = true;
  } else {
    appliquerFurie(duel, entite, recus);
  }
  // Le journal dit d'où vient le coup — et si les points de vie actuels sont
  // encore ceux de cette blessure : la table ne confond pas une brûlure neuve
  // avec une ancienne, ni avec une attaque de créature.
  if (apresEsquive > 0) {
    journaliserBlessure(duel, cote, entite, { elements, sourceCarteId, recus, absorbes, mortelle });
  }
  rafraichirAuras(duel);
  rpgActionsEtat(duel);
  return { ok: true, recus, absorbes, esquive: false };
}

/**
 * L'arrivée peut-elle frapper **le sorcier adverse**, et pas seulement une
 * créature ? Le Maître du marteau le déclare : `arrivee.cibles` liste
 * `'creature'` et `'sorcier'`, exactement comme la magie « 3 dégâts à une
 * créature ou un sorcier ciblés » (Trait de braise, Éclair du marteau). La
 * portée reste `'ennemi'` — la table allume les créatures —, le visage adverse
 * s'allume à part, et le moteur accepte `cibleId: 'sorcier'`.
 */
export function arriveeViseSorcier(carte) {
  return Boolean(carte?.arrivee?.cibles?.includes('sorcier'));
}

/**
 * La portée d'une **arrivée qui désigne une cible** : `'ennemi'` (le duel du
 * Cavalier, la morsure de la Vipère, la lance de la Valkyrie, la gueule du
 * Léviathan et du Bakunawa, le rebond du Sonneur), `'tous'` (l'exil du
 * Susanoo, qui choisit dans les deux camps) ou `'allie'` (un renvoi en main
 * sur une créature du camp qui le joue). `null` pour une arrivée qui se
 * résout seule : soin, pioche, renfort, jetons, dégâts de zone ou au sorcier —
 * ces effets ne demandent rien, il n'y a donc rien à ordonner.
 *
 * Une arrivée « créature **ou** sorcier » (le Maître du marteau) garde la
 * portée `'ennemi'` : les créatures adverses s'allument, et le visage adverse
 * s'allume à part (`arriveeViseSorcier`).
 *
 * Cette portée est la **même règle** pour le moteur et pour la table : le duel
 * s'en sert pour exiger la cible (`rpgJouerCreature`) et pour valider la
 * désignation (`rpgResoudreArriveeCiblee`), la page pour allumer les cibles
 * (`targetMode`) — une arrivée ne peut donc pas demander d'un côté ce qu'elle
 * refuse de l'autre.
 */
export function arriveeCiblePortee(carte) {
  const arrivee = carte?.arrivee;
  if (!arrivee) return null;
  if (arrivee.type === 'exil') return 'tous';
  if (arrivee.type === 'combat') return arrivee.cible === 'creature' ? 'ennemi' : null;
  if (arrivee.type === 'degats') return arrivee.cible === 'creature' ? 'ennemi' : null;
  if (arrivee.type === 'retour-main') {
    if (arrivee.cible === 'toutes-autres') return null; // la vague du Léviathan ne désigne rien
    return arrivee.cible === 'creature-amie' ? 'allie' : 'ennemi';
  }
  if (arrivee.type === 'gel') return arrivee.cible === 'creature' ? 'ennemi' : null;
  if (arrivee.type === 'debuff' || arrivee.type === 'empeche-blocage') return 'ennemi';
  if (arrivee.type === 'donne') return 'allie';
  if (arrivee.type === 'bouclier' && arrivee.cible === 'creature-amie' && arrivee.choisirCible) return 'allie';
  return null;
}

/**
 * L'arrivée consulte-t-elle le deck **immédiatement** — pioche, pioche puis
 * défausse, ou recherche/pioche ciblée par type ? Une telle pose révèle ou
 * déplace des cartes du paquet : l'interface ne doit plus proposer de
 * l'annuler comme un simple geste réversible. Les effets différés (les
 * compteurs d'Heures du Guetteur, par exemple) ne consultent encore rien à
 * la pose et ne sont donc pas comptés ici.
 */
export function arriveeConsulteDeck(carte) {
  const arrivee = carte?.arrivee;
  if (!arrivee) return false;
  const type = String(arrivee.type ?? '');
  return type.startsWith('pioche')
    || type.startsWith('recherche')
    || type === 'tuteur'
    || Number(arrivee.pioche) > 0
    || Number(arrivee.recherche) > 0
    || Boolean(arrivee.rechercheDeck);
}

/** Les camps qu'une arrivée peut viser, dans l'ordre où on les propose. */
function campsDePortee(cote, portee) {
  if (portee === 'tous') return [cote, autre(cote)];
  if (portee === 'allie') return [cote];
  return [autre(cote)];
}

/** Reste-t-il, sur la table, une créature que cette arrivée peut désigner ? */
/** `coutMax` (le Père des corbeaux) : la cible d'une arrivée doit coûter au
 *  plus ce seuil — sans seuil déclaré, tout coût convient. */
export function cibleRespecteCoutMax(carte, entite) {
  if (!Number.isFinite(carte?.arrivee?.coutMax)) return true;
  // Un Grappin porté alourdit sa cible face aux plafonds de coût, comme
  // face aux seuils de prise.
  return rpgCoutEntite(entite) <= carte.arrivee.coutMax;
}

/**
 * L'effet d'arrivée tel qu'il se résout sur la cible désignée. Viser le
 * **sorcier adverse** bascule `cible: 'creature'` en `cible: 'sorcier'` — la
 * même bascule que la magie « créature ou sorcier » de `rpgLancerMagie` : les
 * dégâts partent alors au visage, bouclier du sorcier compris.
 */
export function effetArriveePourCible(carte, cibleId) {
  const arrivee = carte?.arrivee;
  if (!arrivee) return null;
  if (arrivee.cible === 'creature' && cibleId === 'sorcier') {
    return { ...arrivee, cible: 'sorcier' };
  }
  return arrivee;
}

/**
 * L'effet d'arrivée d'une créature qui **revient en jeu** sans être posée
 * depuis la main — renaissance de Tenacité, réanimation du Khopesh, retour
 * programmé de l'Anqa. C'est le même déclenchement que la pose : la cible est
 * désignée automatiquement (le joueur ne reprend pas la main au milieu d'un
 * changement de tour), et le Maître du marteau revenu de Tenacité frappe donc
 * de nouveau ses 3 dégâts — sur une créature, ou sur le sorcier adverse quand
 * il n'y a rien de mieux à toucher.
 */
function appliquerArriveeDeRetour(duel, cote, carte, entite) {
  if (!carte?.arrivee) return false;
  const cible = rpgCibleAuto(duel, cote, carte);
  appliquer(duel, cote, effetArriveePourCible(carte, cible), cible,
    entite.id, cardColors(carte), 'capacite', carte.id);
  journaliserArriveeAuSorcier(duel, carte, cible);
  return true;
}

/** Les dégâts d'arrivée portés au **visage** adverse n'ont pas de ligne à eux
 *  dans `appliquer` (contrairement aux blessures de créature) : le journal
 *  l'écrit ici, pour que le joueur voie d'où viennent les 3 points. */
function journaliserArriveeAuSorcier(duel, carte, cibleId) {
  if (cibleId !== 'sorcier') return;
  const amount = Number(carte?.arrivee?.amount) || 0;
  if (!amount) return;
  duel.log.push(`${carte.name} : ${amount} dégâts au sorcier adverse.`);
}

export function arriveeACibleLegale(duel, cote, carte, entiteId = null) {
  const portee = arriveeCiblePortee(carte);
  if (!portee) return false;
  // Le sorcier adverse est toujours une cible légale quand l'arrivée le
  // permet : l'effet trouve donc toujours quelqu'un à frapper (le retour de
  // Tenacité, lui aussi, ne se dissipe plus faute de créature).
  if (arriveeViseSorcier(carte)) return true;
  return campsDePortee(cote, portee)
    .some((camp) => duel[camp].creatures.some((entite) => entite.id !== entiteId
      && !rpgEstProtegee(entite, cardColors(carte))
      && cibleRespecteCoutMax(carte, entite)));
}

/**
 * Pose une créature : paie le sable, arrive en jeu, capacité d'arrivée.
 *
 * `cibleDifferee` — la **désignation sur la table**. Une arrivée qui désigne une
 * cible (voir `arriveeCiblePortee`) demande normalement sa cible *avec* la pose :
 * le moteur refuse la carte tant qu'aucune créature n'est désignée. Quand la page
 * pose d'abord, elle passe `cibleDifferee: true` : la créature entre en jeu,
 * l'arrivée est mise en attente (`duel.arriveeEnAttente`) et la désignation
 * s'ouvre ensuite, sur la table — `rpgResoudreArriveeCiblee` la referme. Une
 * arrivée qui ne désigne rien (ou qui n'a plus de cible légale) se résout, elle,
 * dans les deux cas avec la pose.
 *
 * `sacrificeId` — le **prix de la pose** quand le champ des cinq places est
 * plein (mode essai, `RPG_MANA_ESSAI_CHAMP_MAX`) : la créature désignée est
 * sacrifiée au moment de payer, puis la nouvelle entre en jeu. Sans
 * désignation, le moteur refuse la pose (`raison: 'champ-plein'`) sauf pour le
 * sorcier, qui sacrifie automatiquement sa créature la plus frêle.
 *
 * `emplacement` — la **case choisie par le joueur** (0 à 4, mode essai) : la
 * créature entre en jeu sur cette case plutôt que sur la première libre. Une
 * case hors du champ ou déjà occupée refuse la pose (`raison:
 * 'emplacement'`) avant tout paiement — sauf la case de la créature
 * sacrifiée, libérée par la pose elle-même. Sans choix (`null`, l'IA, les
 * effets), la première case libre reste la règle ; hors essai, le choix est
 * ignoré : le champ classique n'a pas de cases.
 */
export function rpgJouerCreature(duel, cote, carteId, cibleId = null, { cibleDifferee = false, sacrificeId = null, emplacement = null } = {}) {
  const camp = duel[cote];
  // Le sceau du Pilote se lit **avant** la pose : il arme cette créature-ci,
  // et le Pilote lui-même ne peut pas profiter du sceau qu’il va poser.
  const prochainAbordageOffert = Boolean(camp.prochaineArriveeAbordage);
  const carte = duelCardById(carteId);
  if (!carte) return { ok: false, raison: 'inconnue' };
  if (!camp.main.includes(carteId)) return { ok: false, raison: 'pas-en-main' };
  // Le champ d'essai n'a que cinq places, dessinées sur le plateau : la
  // sixième créature exige qu'une autre soit sacrifiée. La validation tôt
  // (avant paiement et contre) laisse au joueur le temps de choisir sa
  // victime ; le sacrifice, lui, n'a lieu qu'au moment d'engager la pose —
  // un contresort annule tout sans rien coûter.
  const champPlein = duel.modeMana === RPG_MODE_MANA_ESSAI
    && camp.creatures.length >= RPG_MANA_ESSAI_CHAMP_MAX;
  let sacrifice = null;
  if (champPlein) {
    sacrifice = sacrificeId
      ? camp.creatures.find((entite) => entite.id === sacrificeId) ?? null
      : (cote === 'sorcier' ? choisirSacrifice(camp) : null);
    if (!sacrifice || estSite(sacrifice)) {
      return { ok: false, raison: sacrificeId ? 'sacrifice' : 'champ-plein' };
    }
  }
  // La case choisie se valide tôt, comme le sacrifice : hors du champ ou
  // déjà occupée (par une autre que la victime du sacrifice), la pose est
  // refusée avant paiement et sans rien changer à la table.
  const emplacementChoisi = duel.modeMana === RPG_MODE_MANA_ESSAI && emplacement !== null && emplacement !== undefined
    ? emplacement
    : null;
  if (emplacementChoisi !== null) {
    if (!Number.isInteger(emplacementChoisi)
      || emplacementChoisi < 0 || emplacementChoisi >= RPG_MANA_ESSAI_CHAMP_MAX) {
      return { ok: false, raison: 'emplacement' };
    }
    const occupant = rpgEmplacementsChamp(camp)[emplacementChoisi];
    if (occupant && occupant.id !== sacrifice?.id) {
      return { ok: false, raison: 'emplacement' };
    }
  }
  if (carte.arrivee?.type === 'combat' || (carte.arrivee?.type === 'degats' && carte.arrivee.cible === 'creature')) {
    // Une arrivée qui désigne une créature (duel du Cavalier, lance de givre de
    // la Valkyrie, gueule du Bakunawa) exige sa cible tant qu'il reste une
    // créature adverse à viser : la pose sans désignation est refusée — sauf
    // quand la page pose la créature d'abord (`cibleDifferee`), la désignation
    // suivant alors sur la table.
    //
    // Le Maître du marteau peut, lui, frapper **le sorcier adverse** : le
    // visage est alors une cible comme une autre (`'sorcier'`, le même jeton
    // que les magies « créature ou sorcier »).
    if (cibleId === 'sorcier') {
      if (!arriveeViseSorcier(carte)) return { ok: false, raison: 'cible' };
    } else {
      const adversaires = duel[autre(cote)].creatures;
      const cible = adversaires.find((entite) => entite.id === cibleId);
      if (cibleId && !cible) return { ok: false, raison: 'cible' };
      if (cible && rpgEstProtegee(cible, cardColors(carte))) return { ok: false, raison: 'protection' };
      // Sans désignation, la pose n'est refusée que s'il reste une cible
      // légale — créature, ou sorcier quand la carte le permet.
      if (!cibleId && !cibleDifferee && arriveeACibleLegale(duel, cote, carte)) {
        return { ok: false, raison: 'cible' };
      }
    }
  }
  if (carte.arrivee?.type === 'gel' && carte.arrivee.cible === 'creature') {
    // Le Corbeau de givre : le cri désigne une créature adverse, et le froid
    // ne mord que sous son seuil de coût (`coutMax`). Sans désignation, la
    // pose n'est refusée que s'il reste une cible légale — la page désigne
    // alors sur la table (`cibleDifferee`).
    const adversaires = duel[autre(cote)].creatures;
    const cible = adversaires.find((entite) => entite.id === cibleId);
    if (cibleId && !cible) return { ok: false, raison: 'cible' };
    if (cible && !cibleRespecteCoutMax(carte, cible)) return { ok: false, raison: 'cible' };
    if (cible && rpgEstProtegee(cible, cardColors(carte))) return { ok: false, raison: 'protection' };
    if (!cibleId && !cibleDifferee && arriveeACibleLegale(duel, cote, carte)) {
      return { ok: false, raison: 'cible' };
    }
  }
  if (carte.arrivee?.type === 'exil') {
    const creatures = [...camp.creatures, ...duel[autre(cote)].creatures];
    const cible = creatures.find((entite) => entite.id === cibleId);
    if (cibleId && !cible) return { ok: false, raison: 'cible' };
    if (cible && !cibleRespecteCoutMax(carte, cible)) return { ok: false, raison: 'cible' };
    if (cible && rpgEstProtegee(cible, cardColors(carte))) return { ok: false, raison: 'protection' };
    if (!cibleId && !cibleDifferee && creatures.some((entite) => !rpgEstProtegee(entite, cardColors(carte))
      && cibleRespecteCoutMax(carte, entite))) {
      return { ok: false, raison: 'cible' };
    }
  }
  // L'Abordage à l'arrivée : une cible désignée d'avance doit être une
  // prise légale (créature adverse, pas un jeton ni une figure, coût ≤
  // seuil) — sinon la pose est refusée, comme pour l'exil. Sans désignation
  // (la page pose d'abord, l'IA ne désigne pas), la prize se choisit après
  // la pose : la table s'allume ou l'IA pioche seule.
  const seuilAbordagePose = seuilAbordage(carte, camp, prochainAbordageOffert);
  if (seuilAbordagePose !== null && cibleId && !arriveeCiblePortee(carte)) {
    const cibleVisee = duel[autre(cote)].creatures.find((candidate) => candidate.id === cibleId);
    if (!cibleVisee || !priseEnCaleLegale(cibleVisee, cardColors(carte), seuilAbordagePose)) {
      return { ok: false, raison: 'cible' };
    }
  }

  if (carte.arrivee?.type === 'retour-main' && cibleId) {
    const cible = duel[autre(cote)].creatures.find((entite) => entite.id === cibleId)
      ?? duel[cote].creatures.find((entite) => entite.id === cibleId);
    if (!cible) return { ok: false, raison: 'cible' };
    if (rpgEstProtegee(cible, cardColors(carte))) return { ok: false, raison: 'protection' };
  }
  if (['debuff', 'empeche-blocage', 'donne'].includes(carte.arrivee?.type)
    || (carte.arrivee?.type === 'bouclier' && carte.arrivee.choisirCible)) {
    // Une arrivée qui marque une créature (le venin de la Vipère, la lune de
    // Bakunawa, le passage ouvert du Faiseur) exige sa cible comme le duel
    // d'un Jarl — la portée dit quel camp, la protection garde ses droits.
    const portee = arriveeCiblePortee(carte);
    const creatures = campsDePortee(cote, portee).flatMap((camp) => duel[camp].creatures);
    const cible = creatures.find((entite) => entite.id === cibleId);
    if (cibleId && !cible) return { ok: false, raison: 'cible' };
    if (cible && rpgEstProtegee(cible, cardColors(carte))) return { ok: false, raison: 'protection' };
    if (!cibleId && !cibleDifferee && creatures.some((entite) => !rpgEstProtegee(entite, cardColors(carte)))) {
      return { ok: false, raison: 'cible' };
    }
  }
  if (!rpgPeutPayer(camp, carte)) return { ok: false, raison: 'mana' };
  // L'IA peut répondre à la créature avant son entrée en jeu. Dans ce cas,
  // `contrerAnnonce` paie la créature lancée ainsi que le contresort adverse.
  if (cote === 'joueur' && !duel.annonce && !duel.pvp) {
    const contreIA = choisirContreIA(duel, carte);
    if (contreIA) return contrerAnnonce(duel, 'sorcier', contreIA, { cote: 'joueur', carteId });
  }
  // Rien n'a été annulé : le sacrifice de la place libre a lieu maintenant,
  // juste avant le paiement — la créature entre ensuite sur le champ vidé.
  // Si le sorcier a contré la créature plus haut, on n'arrive jamais ici :
  // rien n'a été sacrifié. L'indice de la victime est retenu : la nouvelle
  // créature prend sa place, au même emplacement du plateau.
  let emplacementSacrifice = null;
  let caseSacrifice = null;
  if (sacrifice) {
    emplacementSacrifice = camp.creatures.findIndex((entite) => entite.id === sacrifice.id);
    caseSacrifice = rpgEmplacementsChamp(camp).findIndex((occupant) => occupant?.id === sacrifice.id);
    duel.log.push(`${cote === 'joueur' ? 'Vous sacrifiez' : 'Le sorcier sacrifie'} ${sacrifice.name} pour faire place à ${carte.name}.`);
    sacrifierCreature(duel, cote, sacrifice);
  }
  payer(duel, cote, carte);
  camp.main.splice(camp.main.indexOf(carteId), 1);
  // La pose est engagée : le sceau du Pilote est dépensé par cette créature
  // (les seuils de SA prise restent lus sur l'instantané de début de pose).
  if (prochainAbordageOffert) camp.prochaineArriveeAbordage = false;
  const entite = creerEntiteCreature(carte);
  if (carte.kind === 'site') {
    entite.heures = {
      restants: Math.max(0, Math.trunc(Number(carte.site?.compteurs) || 0)),
      effet: { type: 'site', recompense: carte.site?.recompense ?? null },
    };
  }
  // La capacité de destruction du sacrifié a pu déplacer la table (jetons,
  // renvois) : l'emplacement libéré se borne à la rangée telle qu'elle est.
  if (emplacementSacrifice !== null && emplacementSacrifice >= 0) {
    camp.creatures.splice(Math.min(emplacementSacrifice, camp.creatures.length), 0, entite);
  } else {
    camp.creatures.push(entite);
  }
  // Sa case : celle que le joueur a choisie, sinon celle de la victime d'un
  // sacrifice, sinon la première libre.
  placerDansEmplacement(duel, cote, entite,
    emplacementChoisi ?? (caseSacrifice >= 0 ? caseSacrifice : null));
  duel.log.push(`${cote === 'joueur' ? 'Vous posez' : 'Le sorcier pose'} ${carte.name}.`);
  // Le son d'arrivée suit l'entrée en jeu elle-même, avant même la résolution
  // des effets d'arrivée (qui peuvent ouvrir une attente et rendre la main
  // tôt) : un pirate salue, un navire accoste au bruit du quai — des deux
  // camps, une seule fois par créature.
  journaliserArriveeCreature(duel, cote, entite);
  if (entite.protection) {
    const couleur = labelCouleursProtection(entite.protection.contre);
    duel.log.push(entite.protection.toursRestants === Infinity
      ? `${entite.name} reçoit une protection permanente contre ${couleur}.`
      : `${entite.name} reçoit une protection contre ${couleur} pour ce tour et le prochain tour adverse.`);
  }
  if (carte.arrivee) {
    // La désignation se fait **sur la table** : quand la page pose d'abord
    // (`cibleDifferee`) et qu'il reste une cible légale, l'arrivée attend son
    // tour — la créature est en jeu, le duel retient ce qu'il reste à désigner,
    // et `rpgResoudreArriveeCiblee` appliquera l'effet sur la cible choisie.
    // Quand la Lettre de marque arme aussi les
    // arrivées, l'attente porte à la fois la cible d'arrivée et le seuil
    // d'Abordage : les deux seront résolus l'un après l'autre.
    if (cibleDifferee && !cibleId && arriveeACibleLegale(duel, cote, carte, entite.id)) {
      const seuilAbordagePose = seuilAbordage(carte, camp, prochainAbordageOffert);
      duel.arriveeEnAttente = {
        cote,
        entiteId: entite.id,
        carteId,
        ...(Number.isFinite(seuilAbordagePose) ? { abordage: seuilAbordagePose } : {}),
      };
      rafraichirAuras(duel);
      rpgActionsEtat(duel);
      return { ok: true, entite, arriveeEnAttente: true, sacrificeId: sacrifice?.id ?? null, emplacement: entite.emplacement ?? null };
    }
    // Seuls les effets d'arrivée qui **désignent** une cible reçoivent un
    // `cibleId` : les autres (renfort de camp, pioche, création de jetons…)
    // n'en portent pas, ce qui évite qu'une cible quelconque — un Boualem
    // adverse par exemple — n'intercepte un effet qui ne la visait pas.
    const cibleArrivee = carte.arrivee.cible
      ? (carte.arrivee.cible === 'creature-amie' ? (cibleId ?? entite.id) : cibleId)
      : null;
    appliquer(duel, cote, effetArriveePourCible(carte, cibleArrivee), cibleArrivee,
      entite.id, cardColors(carte), 'capacite', carte.id);
    journaliserArriveeAuSorcier(duel, carte, cibleArrivee);
  }
  // L'Abordage (set Lettres de Marque) : la prise se fait À L'ARRIVÉE — le
  // capteur tire sa prize dès qu'il accoste, pas en frappant (au combat, les
  // créatures meulent et meurent ensemble : la prise n'y trouvait jamais son
  // compte). La créature adverse de coût ≤ seuil désignée rejoint sa cale ;
  // le seuil suit le barème de l'imprimé — coût du capteur − 1 — que la Lettre
  // de marque étend aux arrivées sans imprimé
  // (`camp.abordageDesArrivees`). Seules les créatures **jouées depuis la
  // main** accostent : les jetons créés par effet ne prennent rien.
  const seuilAbordageArrivee = seuilAbordage(carte, camp, prochainAbordageOffert);
  if (seuilAbordageArrivee !== null && !duel.arriveeEnAttente) {
    const couleursAbordage = cardColors(carte);
    const ciblesPossibles = () => duel[autre(cote)].creatures
      .filter((victime) => priseEnCaleLegale(victime, couleursAbordage, seuilAbordageArrivee));
    if (ciblesPossibles().length) {
      if (cibleDifferee && !cibleId) {
        duel.arriveeEnAttente = { cote, entiteId: entite.id, carteId, abordage: seuilAbordageArrivee };
        rafraichirAuras(duel);
        rpgActionsEtat(duel);
        return { ok: true, entite, arriveeEnAttente: true, sacrificeId: sacrifice?.id ?? null, emplacement: entite.emplacement ?? null };
      }
      const cibleAbordage = (cibleId && !arriveeCiblePortee(carte))
        ? duel[autre(cote)].creatures.find((candidate) => candidate.id === cibleId)
        : meilleurePriseAbordage(duel, autre(cote), couleursAbordage, seuilAbordageArrivee);
      if (cibleAbordage && priseEnCaleLegale(cibleAbordage, couleursAbordage, seuilAbordageArrivee)) {
        prendreEnCale(duel, entite, cibleAbordage, null, autre(cote));
      }
    }
  }
  rafraichirAuras(duel);
  rpgActionsEtat(duel);
  return { ok: true, entite, sacrificeId: sacrifice?.id ?? null, emplacement: entite.emplacement ?? null };
}

/**
 * Referme la désignation d'une arrivée en attente : la créature est **déjà en
 * jeu** (`duel.arriveeEnAttente`), on ne fait qu'appliquer son effet d'arrivée
 * sur la cible choisie. C'est le second temps de la pose quand la table
 * désigne : la créature s'est posée, le joueur a cliqué la cible.
 *
 * La cible est revalidée ici — camp de la portée, protection — parce que la
 * table a pu changer entre la pose et le clic (une réponse, une mort, un
 * renvoi) : ce qui n'est plus visable est refusé, l'attente reste ouverte.
 */
export function rpgResoudreArriveeCiblee(duel, cote, cibleId) {
  const attente = duel.arriveeEnAttente;
  if (!attente || attente.cote !== cote) return { ok: false, raison: 'aucune-attente' };
  const entite = duel[cote].creatures.find((candidate) => candidate.id === attente.entiteId);
  const carte = duelCardById(entite?.carteId);
  const portee = arriveeCiblePortee(carte);
  // L'Abordage à l'arrivée : l'attente porte son seuil (`attente.abordage`)
  // plutôt qu'une portée d'arrivée — la créature (ou le porteur du Grappin)
  // est posée, elle attend sa prize. La carte source peut être la créature
  // accostante ou l'arme accrochée : c'est SA couleur qui protège.
  //
  // Quand l'attente porte à la fois un Abordage et une cible d'arrivée
  // (Lettre de marque + créature avec arrivée ciblée), un effet est résolu
  // par clic : l'attente est allégée de l'effet résolu et reste ouverte pour
  // l'autre. Le drapeau `arriveeResolue` marque que la cible d'arrivée a
  // déjà été désignée (sinon `portee`, toujours dérivée de la fiche de carte,
  // resterait vraie après résolution).
  const hasAbordage = Number.isFinite(attente.abordage);
  const arriveeDejaResolue = Boolean(attente.arriveeResolue);
  const hasArrivee = Boolean(portee) && !arriveeDejaResolue;

  const estCibleAbordage = hasAbordage
    && duel[autre(cote)].creatures.some((c) => c.id === cibleId)
    && priseEnCaleLegale(duel[autre(cote)].creatures.find((c) => c.id === cibleId),
      cardColors(duelCardById(attente.carteId) ?? armeById(attente.carteId)), attente.abordage);

  // Le visage adverse est une cible d'arrivée à part entière quand la carte
  // l'autorise (`arrivee.cibles`, le Maître du marteau) : il n'est pas une
  // créature de la table, il n'apparaît donc pas dans `campsDePortee`.
  const viseSorcier = hasArrivee && cibleId === 'sorcier' && arriveeViseSorcier(carte);
  const estCibleArrivee = viseSorcier || (hasArrivee
    && campsDePortee(cote, portee)
      .flatMap((camp) => duel[camp].creatures)
      .some((c) => c.id === cibleId));

  if (!estCibleAbordage && !estCibleArrivee) return { ok: false, raison: 'cible' };

  // 1. Résoudre l'Abordage si la cible cliquée est une prise légale.
  if (estCibleAbordage) {
    if (!entite || entite.enCale) {
      duel.arriveeEnAttente = null;
      return { ok: false, raison: 'absente' };
    }
    const carteSource = duelCardById(attente.carteId) ?? armeById(attente.carteId);
    const ciblePrise = duel[autre(cote)].creatures.find((candidate) => candidate.id === cibleId);
    prendreEnCale(duel, entite, ciblePrise, null, autre(cote));
    // S'il reste aussi une cible d'arrivée à désigner, on garde l'attente
    // pour elle seule (le seuil d'Abordage est consommé).
    if (hasArrivee) {
      duel.arriveeEnAttente = { cote, entiteId: entite.id, carteId: attente.carteId };
    } else {
      duel.arriveeEnAttente = null;
      rafraichirAuras(duel);
      rpgActionsEtat(duel);
    }
    return { ok: true, cible: ciblePrise };
  }

  // 2. Résoudre la cible d'arrivée.
  if (!entite) {
    duel.arriveeEnAttente = null;
    return { ok: false, raison: 'absente' };
  }
  // 2a. Le sorcier adverse (« créature ou sorcier ») : la bascule d'effet
  // route les dégâts au visage, bouclier du sorcier compris.
  if (cibleId === 'sorcier') {
    if (!arriveeViseSorcier(carte)) return { ok: false, raison: 'cible' };
    const arriveeSuivante = hasAbordage
      ? { cote, entiteId: entite.id, carteId: attente.carteId, abordage: attente.abordage, arriveeResolue: true }
      : null;
    duel.arriveeEnAttente = arriveeSuivante;
    appliquer(duel, cote, effetArriveePourCible(carte, 'sorcier'), 'sorcier',
      entite.id, cardColors(carte), 'capacite', carte.id);
    journaliserArriveeAuSorcier(duel, carte, 'sorcier');
    rafraichirAuras(duel);
    rpgActionsEtat(duel);
    return { ok: true, cible: null, sorcier: true };
  }
  const cible = campsDePortee(cote, portee)
    .flatMap((camp) => duel[camp].creatures)
    .find((candidate) => candidate.id === cibleId);
  if (!cible) return { ok: false, raison: 'cible' };
  // « une AUTRE créature » : celle qui porte l'arrivée ne se désigne jamais
  // elle-même — l'exil du Susanoo, qui choisit pourtant dans les deux camps,
  // ne peut pas se retourner contre la créature qu'il vient de poser.
  if (cible.id === entite.id) return { ok: false, raison: 'cible' };
  // Le Père des corbeaux : ses corbeaux ne soulèvent que les créatures de
  // coût 3 ou moins — une cible trop lourde reste illégale, l'attente ouverte.
  if (Number.isFinite(carte.arrivee?.coutMax)
    && (duelCardById(cible.carteId)?.cost ?? 0) > carte.arrivee.coutMax) {
    return { ok: false, raison: 'cible' };
  }
  if (rpgEstProtegee(cible, cardColors(carte))) return { ok: false, raison: 'protection' };
  // Marquer l'arrivée comme résolue et garder l'Abordage en attente s'il reste.
  const arriveeSuivante = hasAbordage
    ? { cote, entiteId: entite.id, carteId: attente.carteId, abordage: attente.abordage, arriveeResolue: true }
    : null;
  duel.arriveeEnAttente = arriveeSuivante;
  appliquer(duel, cote, effetArriveePourCible(carte, cible.id), cible.id,
    entite.id, cardColors(carte), 'capacite', carte.id);
  rafraichirAuras(duel);
  rpgActionsEtat(duel);
  return { ok: true, cible };
}

/**
 * Fait tomber les attentes de destruction qui n'ont plus de cible : le champ
 * adverse s'est vidé, ou s'est entièrement protégé, entre la mort et la
 * désignation. L'effet se dissipe alors au lieu de retenir la partie ; la
 * table appelle ce nettoyage avant de continuer, et le moteur le refait
 * lui-même à chaque désignation.
 */
export function rpgDissiperDestructionsSansCible(duel) {
  const attentes = duel.destructionsEnAttente;
  if (!attentes?.length) return 0;
  const restantes = [];
  let dissipees = 0;
  for (const attente of attentes) {
    const carte = duelCardById(attente.carteId);
    const legales = duel[autre(attente.cote)].creatures
      .filter((entite) => !rpgEstProtegee(entite, cardColors(carte)));
    if (legales.length) {
      restantes.push(attente);
      continue;
    }
    dissipees += 1;
    duel.log.push(`${carte?.name ?? 'La capacité'} se dissipe : aucune créature adverse à frapper.`);
  }
  duel.destructionsEnAttente = restantes;
  return dissipees;
}

/**
 * Résout l'attente de destruction ciblée (le Ghul des cendres) : le contrôleur
 * du mort clique la créature adverse qui encaisse les dégâts. La partie ne
 * continue pas tant que ce clic n'est pas donné — la table bloque la fin de
 * tour et le tour du sorcier. L'attente tombe d'elle-même si plus aucune
 * créature n'est légale (voir `rpgDissiperDestructionsSansCible`).
 */
export function rpgResoudreDestructionCiblee(duel, cote, cibleId) {
  rpgDissiperDestructionsSansCible(duel);
  const attente = duel.destructionsEnAttente?.[0];
  if (!attente || attente.cote !== cote) return { ok: false, raison: 'aucune-attente' };
  const carte = duelCardById(attente.carteId);
  const adv = autre(cote);
  const legales = duel[adv].creatures.filter((entite) => !rpgEstProtegee(entite, cardColors(carte)));
  if (!legales.length) {
    duel.destructionsEnAttente.shift();
    return { ok: false, raison: 'aucune-cible' };
  }
  const cible = legales.find((entite) => entite.id === cibleId);
  if (!cible) return { ok: false, raison: 'cible' };
  duel.destructionsEnAttente.shift();
  appliquer(duel, cote, carte.destruction, cible.id, null, cardColors(carte), null, attente.carteId);
  rpgActionsEtat(duel);
  return { ok: true, cible };
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
  let cible = camp.creatures.find((entite) => entite.id === cibleId) ?? null;
  // Arme vivante (la Lame des ergs) : jouable la table vide — elle fait
  // naître le chien de sable qui la portera. Aucun porteur désigné n'est
  // alors exigé ; la création du jeton n'a pas de cible, Boualem ne peut pas
  // la contrer, et l'arme s'attache au dernier jeton arrivé.
  if (!cible && !carte.armeVivante) return { ok: false, raison: 'cible' };
  if (cible && cible.mur) return { ok: false, raison: 'mur' };
  if (cible && rpgEstProtegee(cible, cardColors(carte))) return { ok: false, raison: 'protection' };
  if (!rpgPeutPayer(camp, carte)) return { ok: false, raison: 'mana' };
  if (cote === 'joueur' && !duel.annonce && !duel.pvp) {
    const contreIA = choisirContreIA(duel, carte);
    if (contreIA) return contrerAnnonce(duel, 'sorcier', contreIA, { cote: 'joueur', carteId });
  }
  payer(duel, cote, carte);
  camp.main.splice(camp.main.indexOf(carteId), 1);
  const porteurCree = !cible;
  if (porteurCree) {
    appliquer(duel, cote, {
      type: 'jetons',
      jeton: carte.armeVivante.jeton,
      nombre: Math.max(1, Math.floor(Number(carte.armeVivante.nombre) || 1)),
    }, null, null, cardColors(carte), null, carte.id);
    cible = camp.creatures[camp.creatures.length - 1] ?? null;
    if (!cible) return { ok: false, raison: 'cible' };
  }
  // Le prix de l'attachement (la Hache de la banquise) : l'arme mord son
  // porteur AVANT de lui donner quoi que ce soit — le bouclier qu'elle
  // accorde ne saurait donc absorber sa propre morsure. Un porteur qui
  // succombe ne porte rien : l'arme tombe au cimetière avec lui, comme si
  // son porteur était mort en la prenant.
  if (Math.max(0, Number(carte.blessurePorteur) || 0) > 0) {
    const morsure = Math.max(0, Number(carte.blessurePorteur) || 0);
    duel.log.push(`${carte.name} mord ${cible.name} en s’attachant (${morsure} dégât${morsure > 1 ? 's' : ''}).`);
    rpgBlesserCreature(duel, cote, cible.id, morsure, carte.element, null, 'capacite', carte.id);
    if (!camp.creatures.some((entite) => entite.id === cible.id)) {
      camp.cimetiere.push(carte.id);
      duel.log.push(`${carte.name} emporte son porteur : l’arme tombe au cimetière.`);
      rpgActionsEtat(duel);
      return { ok: true, entite: null };
    }
  }
  attacherArme(duel, cote, cible, carte);
  const bonusSigne = (valeur) => {
    const nombre = Number(valeur) || 0;
    return nombre < 0 ? `−${Math.abs(nombre)}` : `+${nombre}`;
  };
  const bonus = `${bonusSigne(carte.bonus?.atk)}/${bonusSigne(carte.bonus?.def)}`;
  duel.log.push(porteurCree
    ? `${carte.name} fait naître son propre porteur et s’attache à ${cible.name} (${bonus}).`
    : `${cote === 'joueur' ? 'Vous attachez' : 'Le sorcier attache'} ${carte.name} à ${cible.name} (${bonus}).`);
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
 * un serpent ; la Jitte d’Amayas : un compteur de sable pour l'un de ses
 * trois modes). Ce n'est pas une carte : rien à annoncer, rien à contrer —
 * une décision de son tour, payable autant de fois que le mana (ou les
 * compteurs) le permettent, comme tout le reste dans ce jeu se décide
 * pendant son propre tour.
 *
 * `options.mode` choisit un mode quand l'arme en propose plusieurs
 * (`activation.modes`) ; `options.cibleId` désigne la créature visée par un
 * mode qui demande une cible (le Trait de sable de la Jitte).
 *
 * @returns {{ok: true, entite: object} | {ok: false, raison: string}}
 */
export function rpgActiverArme(duel, cote, entiteId, options = {}) {
  if (duel.tour !== cote) return { ok: false, raison: 'tour' };
  if (duel.annonce) return { ok: false, raison: 'annonce' };
  const camp = duel[cote];
  const entite = camp.creatures.find((candidate) => candidate.id === entiteId);
  if (!entite) return { ok: false, raison: 'absente' };
  const carte = armeCarteDe(entite);
  const activation = carte?.activation;
  if (!activation) return { ok: false, raison: 'aucune-activation' };
  const mode = activation.modes?.find((candidate) => candidate.id === options.mode) ?? null;
  if (activation.modes?.length && !mode) return { ok: false, raison: 'mode' };
  const cout = Math.max(0, Number(activation.cout) || 0);
  const compteurs = Math.max(0, Number(activation.compteurs) || 0);
  if (compteurs && (entite.arme?.compteurs ?? 0) < compteurs) return { ok: false, raison: 'compteurs' };
  if (!rpgPeutPayer(camp, { cost: cout })) return { ok: false, raison: 'mana' };
  if (cout) payer(duel, cote, { cost: cout });
  if (compteurs) entite.arme.compteurs = Math.max(0, (entite.arme.compteurs ?? 0) - compteurs);
  const prix = compteurs
    ? `${compteurs} compteur${compteurs > 1 ? 's' : ''} de sable`
    : `${cout} mana${cout > 1 ? 's' : ''}`;
  duel.log.push(`${cote === 'joueur' ? 'Vous activez' : 'Le sorcier active'} ${carte.name} (${prix})${mode ? ` — ${mode.label}` : ''}.`);
  appliquer(duel, cote, mode ? mode.effet : activation.effet, options.cibleId ?? null, entite.id, carte.element, null, carte.id);
  appliquerAuraSable(duel, cote);
  majResonance(duel);
  rpgActionsEtat(duel);
  return { ok: true, entite };
}

/** L'arme portée par cette créature a-t-elle de quoi s'activer, tout de suite ? */
export function rpgPeutActiverArme(duel, cote, entiteId) {
  const entite = duel?.[cote]?.creatures.find((candidate) => candidate.id === entiteId);
  const activation = armeCarteDe(entite)?.activation;
  if (!activation || duel.tour !== cote || duel.annonce) return false;
  const compteurs = Math.max(0, Number(activation.compteurs) || 0);
  if (compteurs && (entite.arme?.compteurs ?? 0) < compteurs) return false;
  return rpgPeutPayer(duel[cote], { cost: Math.max(0, Number(activation.cout) || 0) });
}

/**
 * Les modes d'activation de l'arme portée, tels que l'interface peut les
 * présenter : un bouton par mode, avec son prix et son libellé.
 */
export function rpgModesArme(duel, cote, entiteId) {
  const entite = duel?.[cote]?.creatures.find((candidate) => candidate.id === entiteId);
  const activation = armeCarteDe(entite)?.activation;
  if (!activation) return [];
  return (activation.modes ?? [{ id: null, label: null, description: null, effet: activation.effet }]);
}

// Gelé (Poigne de givre, Verglas) : la créature ni n'attaque ni ne bloque.
// Mur (Tours de défense) et `nePeutPasAttaquer` (le Drakkar) : ne peuvent
// jamais attaquer, même prêts — seul le Mur interdit aussi l'équipement.
const estGelee = (entite) => (entite?.gelToursRestants ?? 0) > 0;
export const rpgPeutAttaquer = (entite) => entite && !estSite(entite)
  && entite.ready && !entite.attaquee && !estGelee(entite)
  && !(entite.empecheAttaqueToursRestants > 0) && !entite.mur && !entite.nePeutPasAttaquer;
const pret = rpgPeutAttaquer;
// Le mal d'invocation empêche d'attaquer, pas de défendre : toute créature
// qui n'a pas attaqué ce tour peut bloquer, même si elle vient d'arriver.
// Le gel, lui, ferme aussi la défense.
const peutBloquer = (entite) => entite && !estSite(entite)
  && !entite.attaquee && !estGelee(entite)
  && !(entite.empecheBlocageToursRestants > 0);
// Pour la résolution d'un combat déjà déclaré : un bloqueur gelé après sa
// déclaration reste bloquant (comme un attaquant gelé reste attaquant avec
// 0 de force). On ignore donc gel et empêche-blocage pour retrouver le
// bloqueur déjà assigné.
const peutBloquerPourResolution = (entite) => entite && !estSite(entite) && !entite.attaquee;

/**
 * Qui peut bloquer qui :
 * — Coup rapide : l'attaquant qui frappe une créature (`frappeRapide` vrai)
 *   voit son attaque s'arrêter sur sa frappe — il n'y a plus rien à bloquer ;
 * — Infiltration : l'attaquant ne peut pas être bloqué du tout, par personne.
 *   Elle peut être permanente (imprimée, ou conférée par l'arme portée) ou
 *   accordée jusqu'à la fin du tour (le ralliement de Tin Hinan) ;
 * — Envol : un attaquant volant ne peut être bloqué que par une créature volante.
 */
export function rpgPeutBloquerAttaquant(bloqueur, attaquant, frappeRapide = false) {
  if (!bloqueur || !attaquant || estSite(bloqueur) || estSite(attaquant)) return false;
  if (frappeRapide) return false;
  if (attaquant.infiltration) return false;
  return !attaquant.envol || Boolean(bloqueur.envol);
}

/**
 * Provocation : chaque attaquant qui la porte doit recevoir au moins un
 * bloqueur, dans la limite de ce que les blocages légaux permettent.
 *
 * La limite compte : avec deux provocateurs et un seul défenseur capable de
 * les arrêter, exiger les deux rendrait le combat insoluble. On compare donc
 * les provocateurs réellement bloqués au plus grand appariement possible
 * entre provocateurs et bloqueurs légaux (un bloqueur ne compte qu'une fois).
 * Un provocateur dont la frappe rapide a choisi une créature n'attaque plus
 * le sorcier : rien ne peut ni ne doit le bloquer.
 */
export function rpgProvocationValide(
  duel,
  cote,
  attaquantIds = [],
  blocages = {},
  ciblesAttaque = {},
) {
  if (!duel?.[cote] || !duel?.[autre(cote)]) return true;
  const adv = autre(cote);
  const ids = [...new Set(attaquantIds ?? [])];
  const attaquants = duel[cote].creatures.filter((entite) => ids.includes(entite.id));
  const frappeSurCreature = (attaquant) => Boolean(ciblesAttaque?.[attaquant?.id]
    && duel[adv].creatures.some((entite) => entite.id === ciblesAttaque[attaquant.id]));
  const provocateurs = attaquants.filter((entite) => entite.provocation && !frappeSurCreature(entite));
  if (!provocateurs.length) return true;

  const bloqueurs = duel[adv].creatures.filter(peutBloquer);
  const bloqueurParId = new Map(bloqueurs.map((entite) => [entite.id, entite]));
  const legal = (bloqueur, attaquant) => Boolean(bloqueur)
    && rpgPeutBloquerAttaquant(bloqueur, attaquant, false)
    && !rpgEstProtegee(attaquant, cardColors(duelCardById(bloqueur.carteId)));

  // Provocateurs effectivement couverts par l'affectation proposée. Un même
  // bloqueur écrit deux fois ne peut pas couvrir deux attaquants.
  const bloqueursComptes = new Set();
  let provocateursBloques = 0;
  for (const attaquant of provocateurs) {
    const idsBloqueurs = blocages?.[attaquant.id] ?? [];
    const liste = Array.isArray(idsBloqueurs) ? idsBloqueurs : [idsBloqueurs];
    const bloqueurLegal = liste
      .map((id) => bloqueurParId.get(id))
      .find((bloqueur) => bloqueur && !bloqueursComptes.has(bloqueur.id) && legal(bloqueur, attaquant));
    if (bloqueurLegal) {
      bloqueursComptes.add(bloqueurLegal.id);
      provocateursBloques += 1;
    }
  }

  // Plus grand nombre de provocateurs qu'une affectation légale peut couvrir.
  const bloqueurAssigneA = new Map();
  const essayer = (attaquant, dejaVus) => {
    for (const bloqueur of bloqueurs) {
      if (dejaVus.has(bloqueur.id) || !legal(bloqueur, attaquant)) continue;
      dejaVus.add(bloqueur.id);
      const occupant = bloqueurAssigneA.get(bloqueur.id);
      if (!occupant || essayer(occupant, dejaVus)) {
        bloqueurAssigneA.set(bloqueur.id, attaquant);
        return true;
      }
    }
    return false;
  };
  let maximumPossible = 0;
  for (const attaquant of provocateurs) {
    if (essayer(attaquant, new Set())) maximumPossible += 1;
  }
  return provocateursBloques >= maximumPossible;
}

/**
 * Blocage forcé (l'Appât de la meute, l'Embuscade) : le défenseur doit
 * **déclarer** chaque créature marquée par le camp attaquant, en l'assignant
 * à un attaquant qu'elle peut légalement bloquer. Le moteur ne complète pas
 * l'affectation à sa place : sans cette déclaration, le combat n'est pas
 * recevable. Une créature marquée qui n'a aucun blocage légal (Envol,
 * Infiltration, Protection, frappe de Coup rapide déjà dirigée contre une
 * créature…) n'a évidemment rien à déclarer.
 */
export function rpgBlocageForceValide(
  duel,
  cote,
  attaquantIds = [],
  blocages = {},
  ciblesAttaque = {},
) {
  if (!duel?.[cote] || !duel?.[autre(cote)]) return true;
  const adv = autre(cote);
  const ids = [...new Set(attaquantIds ?? [])];
  const attaquants = duel[cote].creatures.filter((entite) => ids.includes(entite.id));
  const frappeSurCreature = (attaquant) => Boolean(ciblesAttaque?.[attaquant?.id]
    && duel[adv].creatures.some((entite) => entite.id === ciblesAttaque[attaquant.id]));
  const assignations = new Map();
  for (const attaquant of attaquants) {
    const idsBloqueurs = blocages?.[attaquant.id] ?? [];
    const liste = Array.isArray(idsBloqueurs) ? idsBloqueurs : [idsBloqueurs];
    for (const bloqueurId of liste) {
      if (bloqueurId && !assignations.has(bloqueurId)) assignations.set(bloqueurId, attaquant);
    }
  }
  const legal = (bloqueur, attaquant) => Boolean(bloqueur && attaquant)
    && !frappeSurCreature(attaquant)
    && rpgPeutBloquerAttaquant(bloqueur, attaquant, false)
    && !rpgEstProtegee(attaquant, cardColors(duelCardById(bloqueur.carteId)));
  const forces = duel[adv].creatures
    .filter((entite) => peutBloquer(entite) && entite.blocageForce?.par === cote);
  for (const bloqueurForce of forces) {
    const ciblesLegales = attaquants.filter((attaquant) => legal(bloqueurForce, attaquant));
    if (!ciblesLegales.length) continue;
    const attaquantAssigne = assignations.get(bloqueurForce.id);
    if (!attaquantAssigne || !legal(bloqueurForce, attaquantAssigne)) return false;
  }
  return true;
}

/** Combat entre créatures : dégâts mutuels et capacités liées au combat. */
export function rpgAttaquerCreature(duel, cote, entiteId, cibleId) {
  const attaquant = duel[cote].creatures.find((e) => e.id === entiteId);
  const cible = duel[autre(cote)].creatures.find((e) => e.id === cibleId);
  if (!attaquant || !cible) return { ok: false, raison: 'absente' };
  if (!pret(attaquant)) return { ok: false, raison: 'pas-pret' };
  // Toute attaque déclarée passe par une bannière : celle du Daimyō grandit
  // l'attaquant Samouraï avant les blessures, comme dans `rpgLancerAttaque`.
  appliquerBannieresAttaque(duel, cote, [attaquant]);
  attaquant.attaquee = true;

  const carteAttaquant = duelCardById(attaquant.carteId);
  const carteCible = duelCardById(cible.carteId);
  const couleursAttaquant = cardColors(carteAttaquant);
  const couleursCible = cardColors(carteCible);
  const degatsAvantCombat = [];
  ajouterDegatsCapaciteAvantCombat(degatsAvantCombat, cote, carteAttaquant, cible, attaquant, 'attaque');
  ajouterDegatsCapaciteAvantCombat(degatsAvantCombat, autre(cote), carteCible, attaquant, cible, 'blocage');
  appliquerDegatsDeCombatSimultanes(duel, degatsAvantCombat);

  const coupsNormaux = [];
  // La Traque du Chasseur paie aussi dans ce duel de créatures : il y
  // « attaque » bel et bien sa cible.
  const traque = bonusTraquePirates(attaquant, cible);
  if (duel[cote].creatures.some((entite) => entite.id === attaquant.id)) {
    coupsNormaux.push({
      cote: autre(cote), entiteId: cible.id, amount: attaquant.atk + traque,
      sourceElement: couleursAttaquant, sourceType: 'attaque',
      sourceCote: cote, sourceId: attaquant.id,
    });
    if (traque > 0) duel.log.push(`Traque : ${attaquant.name} gagne +${traque}/+0 contre ${cible.name} pour ce combat.`);
  }
  if (duel[autre(cote)].creatures.some((entite) => entite.id === cible.id)) {
    coupsNormaux.push({
      cote, entiteId: attaquant.id, amount: cible.atk,
      sourceElement: couleursCible, sourceType: 'attaque',
      sourceCote: autre(cote), sourceId: cible.id,
    });
  }
  const esquivesCombat = appliquerDegatsDeCombatSimultanes(duel, coupsNormaux);
  // Contre-attaque : le duel de créatures rend les coups esquivés.
  for (const esquive of esquivesCombat ?? []) {
    const defenseur = duel[esquive.cote]?.creatures.find((entite) => entite.id === esquive.entiteId);
    if (!defenseur) continue;
    riposteDeContreAttaque(duel, defenseur, esquive.source);
  }
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
  // Écueil : ne contre que les créatures (héros et jetons compris) — jamais
  // un sort, jamais une arme. Le cas `carte` (le Contresort des abîmes)
  // accepte tout, `sort` (le Silence d’écume) les seules magies.
  if (effet.cible === 'creature') {
    const kind = carte?.kind ?? 'creature';
    if (kind !== 'creature' && kind !== 'hero') return false;
  }
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

/** Une créature peut-elle être désignée par ce sort ? Même porte que le
 *  lancement (`rpgLancerMagie`) et que l'allumage des cibles sur la table :
 *  pas un Site, pas protégée contre la couleur du sort, et jamais le Serpent
 *  du monde, qu'aucune magie ne peut viser. */
function entiteCiblableParSort(entite, carte) {
  return Boolean(entite)
    && !rpgEstProtegee(entite, cardColors(carte))
    && !rpgEstProtegeeDesSorts(entite, cardColors(carte));
}

/**
 * Ce sort a-t-il, là, tout de suite, de quoi se lancer ?
 *
 * Un sort qui désigne une créature — dégâts ou malus sur une adverse, bouclier
 * ou renvoi sur une alliée, les deux champions du Défi du Jarl — n'a aucune
 * cible valide quand la table ne porte aucune créature qu'il peut légalement
 * viser : le moteur refuserait le lancement (`raison: 'cible'`), donc la main
 * ne doit pas l'allumer. C'est l'équivalent, pour les cibles, de
 * `rpgContreJouable` pour les contres : sans ça, le joueur tape une carte
 * illuminée, confirme, et rien ne se passe.
 *
 * Les sorts qui ne désignent rien (zone, pioche, soin du sorcier, dégâts
 * adressés au sorcier adverse…) gardent toujours une cible valide : ils se
 * lancent quelle que soit la table. La Réanimation, elle, désigne au
 * cimetière : sans créature à y relever, elle n'a pas de cible non plus.
 *
 * @returns {boolean} vrai si la carte n'est pas un sort, ou si elle a au
 *   moins une cible légale maintenant.
 */
export function rpgSortACibleValide(duel, cote, carte) {
  if (carte?.kind !== 'magie') return true;
  if (carte.effet?.type === 'contresort') return rpgContreJouable(duel, cote, carte);
  if (carte.effet?.type === 'reanimation') {
    return duel[cote].cimetiere.some((id) => {
      const carteAuCimetiere = duelCardById(id);
      return Boolean(carteAuCimetiere) && !magieById(id) && !armeById(id)
        && carteAuCimetiere.kind !== 'terrain';
    });
  }
  const adv = autre(cote);
  const aCibleAlliee = duel[cote].creatures.some((entite) => entiteCiblableParSort(entite, carte));
  const aCibleEnnemie = duel[adv].creatures.some((entite) => entiteCiblableParSort(entite, carte));
  // Le Défi du Jarl désigne deux créatures : sans champion des deux côtés,
  // le duel n'a pas lieu.
  if (carte.effet?.type === 'combat' && carte.effet?.sourceCible === 'creature-amie') {
    return aCibleAlliee && aCibleEnnemie;
  }
  if (carte.effet?.type === 'degats' && carte.effet?.cible === 'creature') {
    // Certains sorts peuvent aussi frapper le sorcier adverse directement.
    return aCibleEnnemie || Boolean(carte.cibles?.includes('sorcier'));
  }
  if (['debuff', 'empeche-blocage', 'blocage-force'].includes(carte.effet?.type)) return aCibleEnnemie;
  if (carte.effet?.type === 'retour-main') {
    return carte.effet.cible === 'creature-amie' ? aCibleAlliee : aCibleEnnemie;
  }
  if (['bouclier', 'arme'].includes(carte.effet?.type) && carte.effet?.cible === 'creature-amie') return aCibleAlliee;
  if (carte.effet?.cible === 'creature-amie') return aCibleAlliee;
  if (carte.effet?.cible === 'creature') return aCibleEnnemie;
  return true;
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
  // Le lancement gratuit du Kraken : le coût de mana saute, le Prix en PV
  // reste dû — et un contresort, qui ne vit qu'en réponse à une annonce,
  // n'entre pas dans la faveur.
  const lancementGratuit = duel.magieGratuite?.cote === cote && carte.effet.type !== 'contresort';
  if (lancementGratuit) {
    if ((carte.prixPv ?? 0) > 0 && camp.pv <= carte.prixPv) return { ok: false, raison: 'mana' };
  } else if (!rpgPeutPayer(camp, carte)) return { ok: false, raison: 'mana' };
  if (carte.effet.type === 'contresort') return contrerAnnonce(duel, cote, carte);
  // Le Serpent du monde : protégé contre les magies et les sorcelleries —
  // aucun sort ne peut le viser, quel que soit le camp du lanceur.
  for (const idVise of [cibleId, cibleAllieeId]) {
    if (!idVise || idVise === 'sorcier') continue;
    const visee = [...duel.joueur.creatures, ...duel.sorcier.creatures]
      .find((entite) => entite.id === idVise);
    if (rpgEstProtegeeDesSorts(visee, cardColors(carte)) || estSite(visee)) return { ok: false, raison: 'protection' };
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
  if (carte.effet.type === 'debuff' || carte.effet.type === 'empeche-blocage') {
    // Le venin de la Vipère (et sa sœur d'ébène Bakunawa, en sort) exige une
    // créature adverse à marquer ; la protection contre l'eau la refuse.
    const cible = duel[adv].creatures.find((entite) => entite.id === cibleId);
    if (!cible) return { ok: false, raison: 'cible' };
    if (rpgEstProtegee(cible, cardColors(carte))) return { ok: false, raison: 'protection' };
  }
  if (carte.effet.type === 'reanimation') {
    // La Réanimation ne se lance qu'avec une créature au cimetière — le mana
    // reste entier, comme pour un renvoi sans cible.
    const convient = (id) => {
      const carteAuCimetiere = duelCardById(id);
      return Boolean(carteAuCimetiere) && !magieById(id) && !armeById(id)
        && carteAuCimetiere.kind !== 'terrain';
    };
    if (!camp.cimetiere.some(convient)) return { ok: false, raison: 'cible' };
  }
  const creatureRetourneeEnMain = carte.effet.type === 'retour-main'
    ? (carte.effet.cible === 'creature-amie'
      ? camp.creatures.find((entite) => entite.id === cibleId)
      : duel[adv].creatures.find((entite) => entite.id === cibleId)
        ?? camp.creatures.find((entite) => entite.id === cibleId))
    : null;
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

  if (cote === 'joueur' && !duel.annonce && !duel.pvp) {
    const contreIA = choisirContreIA(duel, carte);
    if (contreIA) {
      // Même contrecarré, le sort gratuit a été lancé : la faveur du Kraken
      // est consommée.
      if (lancementGratuit) duel.magieGratuite = null;
      return contrerAnnonce(duel, 'sorcier', contreIA, { cote: 'joueur', carteId });
    }
  }

  if (lancementGratuit) {
    // La faveur du Kraken : pas de mana — seul le Prix en PV, s'il existe.
    if ((carte.prixPv ?? 0) > 0) {
      camp.pv = Math.max(1, camp.pv - carte.prixPv);
      duel.log.push(`${cote === 'joueur' ? 'Vous payez' : 'Le sorcier paie'} ${carte.prixPv} PV pour ${carte.name ?? 'la carte'}.`);
    }
    duel.magieGratuite = null;
    duel.log.push(`${carte.name} est lancée sans payer son coût de mana (Kraken).`);
  } else {
    payer(duel, cote, carte);
  }
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
  // Une Esquive annule le renvoi : la cible est toujours sur la table et la
  // page ne doit pas jouer son animation de retour en main.
  const renvoiEffectif = Boolean(creatureRetourneeEnMain && !creatureRetourneeEnMain.jeton
    && ![...duel.joueur.creatures, ...duel.sorcier.creatures]
      .some((entite) => entite.id === creatureRetourneeEnMain.id));
  return {
    ok: true,
    renvoiMain: renvoiEffectif,
    renvoiEntityId: renvoiEffectif ? creatureRetourneeEnMain.id : null,
  };
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

/** L’IA choisit, pour chaque attaquant rapide, la créature qu’il abat d’une
 *  frappe (l’attaque s’arrête là) — aucune entrée pour qui attaque le sorcier. */
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
 *
 * `ciblesAttaque` porte le CHOIX du Coup rapide, attaquant par attaquant :
 * l'identifiant d'une créature adverse à frapper — la frappe tombe avant les
 * blessures de combat, l'attaque s'arrête là et l'attaquant n'est alors ni
 * bloqué ni porté sur le sorcier — ou rien du tout, et l'attaquant attaque
 * normalement. C'est aussi la seule phase d'attaque du camp pour ce tour : la
 * suivante est refusée (`raison: 'attaque-jouee'`) jusqu'au tour prochain.
 */
/**
 * Les déclencheurs des armes portées par des attaquants — le lot du Sable
 * (`docs/rpg/14-equipements-du-sable.md`) :
 *
 * — `porteurAttaque` : « quand le porteur attaque » (Boussole du Hoggar,
 *   Harnais du méhari) — il part pour tout attaquant déclaré, même si le
 *   combat l'emporte ;
 * — `porteurBlesse` / `porteurBlesseCreature` / `porteurBlesseSorcier` :
 *   « quand le porteur inflige des blessures de combat » (la Jitte d’Amayas
 *   compte, le Masque du guetteur pioche, la Takouba de Tin Hinan fait les
 *   deux).
 *
 * @param {Array<{id: string, armeId: string|null, creature: number, sorcier: number}>} bilans
 */
function declencherArmesAttaquants(duel, cote, bilans) {
  let declenche = false;
  for (const bilan of bilans) {
    const carte = bilan.armeId ? armeById(bilan.armeId) : null;
    if (!carte) continue;
    const effets = [];
    if (carte.porteurAttaque) effets.push(carte.porteurAttaque);
    if (carte.porteurBlesse && bilan.creature + bilan.sorcier > 0) effets.push(carte.porteurBlesse);
    if (carte.porteurBlesseCreature && bilan.creature > 0) effets.push(carte.porteurBlesseCreature);
    if (carte.porteurBlesseSorcier && bilan.sorcier > 0) effets.push(carte.porteurBlesseSorcier);
    for (const effet of effets) {
      // Aucune cible : ces déclencheurs ne désignent rien, Boualem ne peut
      // donc pas les contrer (même règle que les arrivées qui créent des
      // jetons).
      appliquer(duel, cote, effet, null, bilan.id, cardColors(carte), null, carte.id);
      declenche = true;
    }
  }
  if (!declenche) return;
  // Un déclencheur peut avoir créé un chien de sable ou une carte piochée :
  // les auras du camp se relisent comme après n'importe quelle arrivée.
  appliquerAuraSable(duel, cote);
  majResonance(duel);
}

export function rpgLancerAttaque(
  duel,
  cote,
  attaquantIds,
  blocages = null,
  repartitions = null,
  attaquantsBloques = null,
  ciblesAttaque = null,
  { attaqueDeclaree = false, bannieresAppliquees = false } = {},
) {
  const adv = autre(cote);
  if (duel.modeMana === RPG_MODE_MANA_ESSAI && duel[cote]?.manaChoixEnAttente) {
    return { ok: false, raison: 'choix-mana' };
  }
  // Une seule phase d'attaque par tour : le camp qui a déjà résolu son combat
  // n'en déclare pas un second. Le drapeau n'est posé que sur une déclaration
  // acceptée (plus bas) : un refus ne consomme rien.
  if (duel.attaqueJouee === cote) return { ok: false, raison: 'attaque-jouee' };
  const ids = [...new Set(attaquantIds ?? [])];
  const attaquants = duel[cote].creatures.filter((e) => ids.includes(e.id));
  if (!attaquants.length) return { ok: false, raison: 'personne' };
  if (attaquants.length !== ids.length) return { ok: false, raison: 'absent' };
  for (const entite of attaquants) {
    // Le gel interdit une nouvelle déclaration, mais ne doit pas bloquer
    // la résolution d'une attaque déjà déclarée avant la réponse adverse.
    if (!pret(entite) && !(attaqueDeclaree && estGelee(entite)
      && entite.ready && !entite.attaquee)) return { ok: false, raison: 'pas-pret' };
  }
  const forceCombat = (entite) => estGelee(entite) ? 0 : entite.atk;

  const ciblesRapides = ciblesAttaque ?? (cote === 'sorcier'
    ? rpgCiblesAttaqueRapide(duel, cote, ids)
    : {});
  if (!ciblesRapides || typeof ciblesRapides !== 'object' || Array.isArray(ciblesRapides)
    || Object.keys(ciblesRapides).some((id) => !ids.includes(id))) {
    return { ok: false, raison: 'cible' };
  }
  // Le Coup rapide est un CHOIX, attaquant par attaquant : frapper une créature
  // adverse — l'attaque s'arrête alors sur cette frappe — ou attaquer
  // normalement, vers le sorcier. Sans cible désignée il n'y a rien à frapper,
  // et la déclaration reste parfaitement légale : l'attaquant rejoint la vague
  // ordinaire (bloquable, blessures de combat, sorcier s'il passe). La cible
  // désignée, elle, doit être une créature adverse non protégée.
  for (const attaquant of attaquants) {
    const cibleId = ciblesRapides[attaquant.id];
    if (!cibleId) continue;
    if (!attaquant.coupRapide) return { ok: false, raison: 'cible' };
    const cible = duel[adv].creatures.find((entite) => entite.id === cibleId);
    // Une cible disparue entre la déclaration et la résolution n'est pas une
    // erreur d'appel : la frappe est annulée plus bas, l'attaque suit son cours.
    if (cible && rpgEstProtegee(cible, cardColors(duelCardById(attaquant.carteId)))) {
      return { ok: false, raison: 'protection' };
    }
  }

  // L'attaquant dont la frappe rapide a trouvé sa cible : son attaque s'arrête
  // sur cette frappe — rien à bloquer, et personne à interposer.
  const frappeSurCreature = (attaquant) => Boolean(ciblesRapides[attaquant?.id]
    && duel[adv].creatures.some((entite) => entite.id === ciblesRapides[attaquant.id]));

  const bloqueursDisponiblesStrict = duel[adv].creatures.filter(peutBloquer);
  // Si le combat a déjà été déclaré (fenêtre de réponse), un bloqueur gelé
  // après coup reste bloquant : on le retrouve même s'il est gelé.
  const bloqueursDisponiblesPourValidation = attaqueDeclaree
    ? duel[adv].creatures.filter(peutBloquerPourResolution)
    : bloqueursDisponiblesStrict;
  const bloqueursDisponibles = bloqueursDisponiblesStrict;
  const affectations = blocages === null
    ? rpgChoisirBloqueurs(duel, cote, ids, ciblesRapides)
    : Object.fromEntries(Object.entries(blocages).map(([attaquantId, idsBloqueurs]) => [
      attaquantId,
      Array.isArray(idsBloqueurs) ? idsBloqueurs : idsBloqueurs ? [idsBloqueurs] : [],
    ]));
  // Blocage forcé (l’Appât de la meute, l’Embuscade) : l’affectation doit
  // déjà déclarer chaque créature marquée qui a un blocage légal. Le moteur
  // valide cette déclaration plus bas, sans assigner le bloqueur à la place
  // du défenseur.
  // Blocage obligatoire (Tours de défense) : les créatures avec doitBloquer: true
  // DOIVENT bloquer une créature attaquante si elles le peuvent.
  // Une créature à la fois « doit bloquer » et marquée par l’Appât ne profite
  // pas de cette assignation permanente : le marqueur exige sa déclaration.
  const bloqueursObligatoires = bloqueursDisponiblesStrict.filter((entite) => entite.doitBloquer
    && entite.blocageForce?.par !== cote);
  for (const bloqueurOblig of bloqueursObligatoires) {
    const dejaAssigne = Object.values(affectations).some((idsBloqueurs) => idsBloqueurs.includes(bloqueurOblig.id));
    if (dejaAssigne) continue;
    const candidats = attaquants
      .filter((attaque) => rpgPeutBloquerAttaquant(bloqueurOblig, attaque, frappeSurCreature(attaque))
        && !rpgEstProtegee(attaque, cardColors(duelCardById(bloqueurOblig.carteId))))
      .sort((a, b) => Number(Boolean(b.provocation)) - Number(Boolean(a.provocation))
        || (b.atk ?? 0) - (a.atk ?? 0));
    if (!candidats.length) continue;
    affectations[candidats[0].id] = [...(affectations[candidats[0].id] ?? []), bloqueurOblig.id];
  }
  const attaquantsDejaBloques = new Set((attaquantsBloques
    ?? Object.entries(affectations).filter(([, idsBloqueurs]) => idsBloqueurs.length).map(([id]) => id))
    .filter((id) => ids.includes(id)));

  const bloqueursUtilises = new Set();
  for (const [attaquantId, idsBloqueurs] of Object.entries(affectations)) {
    if (!ids.includes(attaquantId)) return { ok: false, raison: 'blocage' };
    // Sa frappe a une cible : l'attaque s'arrête dessus, rien à bloquer.
    const frappeRapide = frappeSurCreature(attaquants.find((entite) => entite.id === attaquantId));
    if (frappeRapide && idsBloqueurs.length) return { ok: false, raison: 'blocage' };
    if (new Set(idsBloqueurs).size !== idsBloqueurs.length) return { ok: false, raison: 'bloqueur' };
    const attaquant = attaquants.find((entite) => entite.id === attaquantId);
    for (const bloqueurId of idsBloqueurs) {
      const bloqueur = bloqueursDisponiblesPourValidation.find((entite) => entite.id === bloqueurId);
      if (!bloqueur || bloqueursUtilises.has(bloqueurId)) return { ok: false, raison: 'bloqueur' };
      if (!rpgPeutBloquerAttaquant(bloqueur, attaquant, frappeRapide)) {
        return { ok: false, raison: frappeRapide ? 'blocage' : attaquant.infiltration ? 'infiltration' : 'envol' };
      }
      if (rpgEstProtegee(attaquant, cardColors(duelCardById(bloqueur.carteId)))) {
        return { ok: false, raison: 'protection' };
      }
      bloqueursUtilises.add(bloqueurId);
    }
  }

  // Vérification des bloqueurs obligatoires (Tours de défense) : toutes les
  // créatures avec doitBloquer: true DOIVENT avoir bloqué si elles le pouvaient
  const bloqueursObligatoiresNonUtilises = bloqueursDisponiblesStrict
    .filter((entite) => entite.doitBloquer && !bloqueursUtilises.has(entite.id));
  for (const bloqueurOblig of bloqueursObligatoiresNonUtilises) {
    // Vérifier s'il y avait au moins un attaquant qu'il pouvait bloquer
    const avaitCible = attaquants.some(
      (attaque) => rpgPeutBloquerAttaquant(bloqueurOblig, attaque, frappeSurCreature(attaque))
        && !rpgEstProtegee(attaque, cardColors(duelCardById(bloqueurOblig.carteId)))
    );
    if (avaitCible) {
      return { ok: false, raison: 'doit-bloquer' };
    }
  }

  // Blocage forcé : le défenseur doit avoir déclaré chaque bloqueur marqué
  // qui pouvait légalement s'interposer.
  if (!rpgBlocageForceValide(duel, cote, ids, affectations, ciblesRapides)) {
    return { ok: false, raison: 'blocage-force' };
  }

  // Provocation : l'affectation doit couvrir autant de provocateurs qu'une
  // répartition légale des bloqueurs disponibles le permet.
  if (!rpgProvocationValide(duel, cote, ids, affectations, ciblesRapides)) {
    return { ok: false, raison: 'provocation' };
  }

  // La déclaration est légale : la bannière du Daimyō (et de tout porteur du
  // même déclenché) grandit chaque Samouraï engagé AVANT que les blessures ne
  // soient calculées — le partage et la frappe du tour lisent donc la force
  // augmentée. Le contrôle des répartitions fournies par l'appelant, plus bas,
  // compare au total de l'attaquant tel qu'il est ici : une répartition figée
  // sur les statistiques d'avant la bannière est refusée. Une répartition
  // refusée est une erreur d'appel (l'interface laisse le moteur partager) :
  // la table est alors rendue telle qu'elle était, bannière comprise.
  // Le porteur d'une arme qui attaque emporte ses déclencheurs : on note ici
  // QUI portait QUOI, parce que l'arme peut tomber au cimetière pendant le
  // combat — le déclenchement part quand même, il appartient à l'attaque et
  // pas à la survie, comme à Magic.
  const porteursDeclencheurs = attaquants.map((entite) => ({
    id: entite.id,
    armeId: entite.arme?.carteId ?? null,
  }));
  const avantBanniere = attaquants.map((entite) => ({
    entite, atk: entite.atk, def: entite.def, pv: entite.pv, pvMax: entite.pvMax, journal: duel.log.length,
  }));
  const annulerBanniere = () => {
    for (const etat of avantBanniere) {
      etat.entite.atk = etat.atk;
      etat.entite.def = etat.def;
      etat.entite.pv = etat.pv;
      etat.entite.pvMax = etat.pvMax;
    }
    duel.log.length = avantBanniere[0].journal;
  };
  // Une résolution précédée d'une vraie déclaration a déjà reçu la bannière
  // au verrouillage des attaquants (`rpgAppliquerBannieresAttaque`) : elle ne
  // se déclenche pas une seconde fois ici. Les appels directs la reçoivent
  // toujours avant les blessures.
  if (!bannieresAppliquees) appliquerBannieresAttaque(duel, cote, attaquants);

  // Les capacités déclenchées par les blocages précèdent même le partage des
  // blessures. Prévoir aussi les destructions en chaîne, boucliers et protections
  // sur une copie pour qu'une répartition invalide ne modifie jamais la partie.
  const degatsAvantCombat = [];
  // Le Coup rapide frappe AVANT les blessures de combat : la créature désignée à
  // la déclaration encaisse les dégâts d'attaque, sans riposte, avec 30 % de
  // chances de rater sa cible (alors qu'attaquer l'adversaire normalement touche
  // à 100 %). C'est un choix — et il coupe court : l'attaquant qui a frappé
  // s'arrête là, il n'est ni bloqué, ni échangé, et ne touche pas le sorcier
  // (`attaquantsArretes`).
  const rngCombat = hasardParDuel.get(duel) ?? Math.random;
  const frappesRapides = [];
  for (const attaquant of attaquants) {
    const cibleRapideId = ciblesRapides[attaquant.id];
    if (!cibleRapideId) continue;
    const cible = duel[adv].creatures.find((entite) => entite.id === cibleRapideId);
    const rate = Boolean(cible) && !estGelee(attaquant) && rngCombat() < RPG_COUP_RAPIDE_ECHEC_CHANCE;
    // La Traque du Chasseur : sa frappe rapide contre une proie de la course
    // porte le +N/+0 — un attaquant gelé, lui, ne frappe de toute façon pas.
    const traque = cible && !estGelee(attaquant) ? bonusTraquePirates(attaquant, cible) : 0;
    frappesRapides.push(!cible
      ? { attaquantId: attaquant.id, attaquant: attaquant.name, cibleId: cibleRapideId, cible: null, degats: 0, annule: true }
      : rate
        ? { attaquantId: attaquant.id, attaquant: attaquant.name, cibleId: cible.id, cible: cible.name, degats: 0, rate: true }
        : {
          attaquantId: attaquant.id,
          attaquant: attaquant.name,
          cibleId: cible.id,
          cible: cible.name,
          degats: forceCombat(attaquant) + traque,
          traque,
        });
    if (!cible || rate) continue;
    degatsAvantCombat.push({
      cote: adv,
      entiteId: cible.id,
      amount: forceCombat(attaquant) + traque,
      sourceElement: cardColors(duelCardById(attaquant.carteId)),
      sourceType: 'attaque',
      sourceCote: cote, sourceId: attaquant.id,
      // Marque la frappe rapide : sa Contre-attaque est résolue une seule
      // fois, juste après les blessures de la frappe.
      rapide: true,
    });
  }
  // Les attaquants dont la frappe a trouvé sa cible : leur attaque s'arrête sur
  // cette frappe. Elle ne connaît ni blocage, ni blessures de combat, ni dégâts
  // au sorcier. Une cible disparue entre-temps annule la frappe (`annule`) et
  // rend l'attaquant à la vague ordinaire.
  const attaquantsArretes = new Set(frappesRapides
    .filter((frappe) => !frappe.annule)
    .map((frappe) => frappe.attaquantId));
  for (const attaquant of attaquants) {
    for (const bloqueurId of affectations[attaquant.id] ?? []) {
      const bloqueur = bloqueursDisponiblesPourValidation.find((entite) => entite.id === bloqueurId);
      if (!estGelee(attaquant)) ajouterDegatsCapaciteAvantCombat(degatsAvantCombat, cote, duelCardById(attaquant.carteId), bloqueur, attaquant, 'attaque');
      if (bloqueur && !estGelee(bloqueur)) ajouterDegatsCapaciteAvantCombat(degatsAvantCombat, adv, duelCardById(bloqueur.carteId), attaquant, bloqueur, 'blocage');
    }
  }
  const apresCapacites = degatsAvantCombat.length ? JSON.parse(JSON.stringify(duel)) : duel;
  if (degatsAvantCombat.length) {
    // La copie sert à valider la répartition, la partie réelle à la résoudre.
    // Enregistrer puis rejouer les jets évite qu’une Esquive réussie sur la
    // copie soit différente sur la table (ce qui ferait disparaître une
    // riposte ou invaliderait un blocage à cause du seul hasard).
    const rngSource = hasardParDuel.get(duel) ?? Math.random;
    const jets = [];
    hasardParDuel.set(apresCapacites, () => {
      const jet = rngSource();
      jets.push(jet);
      return jet;
    });
    appliquerDegatsDeCombatSimultanes(apresCapacites, degatsAvantCombat);
    let rejoues = 0;
    hasardParDuel.set(duel, () => (rejoues < jets.length ? jets[rejoues++] : rngSource()));
  }
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
      repartitionFinale[attaquant.id] = { [idsBloqueurs[0]]: forceCombat(attaquant) };
      continue;
    }

    const saisie = repartitions?.[attaquant.id];
    const distribution = {};
    if (saisie == null) {
      const quotient = Math.floor(forceCombat(attaquant) / idsBloqueurs.length);
      let reste = forceCombat(attaquant) - quotient * idsBloqueurs.length;
      for (const bloqueurId of idsBloqueurs) {
        distribution[bloqueurId] = quotient + (reste > 0 ? 1 : 0);
        reste -= reste > 0 ? 1 : 0;
      }
    } else {
      if (Object.keys(saisie).some((id) => !idsBloqueurs.includes(id))) {
        annulerBanniere();
        return { ok: false, raison: 'repartition' };
      }
      for (const bloqueurId of idsBloqueurs) {
        const amount = Number(saisie[bloqueurId] ?? 0);
        if (!Number.isInteger(amount) || amount < 0) {
          annulerBanniere();
          return { ok: false, raison: 'repartition' };
        }
        distribution[bloqueurId] = amount;
      }
      if (Object.values(distribution).reduce((total, amount) => total + amount, 0) !== forceCombat(attaquant)) {
        annulerBanniere();
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
  // La déclaration passe à l'histoire : la phase d'attaque de ce camp est jouée,
  // aucun second combat ne s'ouvrira avant le tour suivant (`rpgFinDeTour`).
  duel.attaqueJouee = cote;
  // Appliquer réellement cette étape une seule fois, avant les blessures normales.
  appliquerDegatsDeCombatSimultanes(duel, degatsAvantCombat);
  // La Traque du Chasseur, côté combat bloqué : ses frappes contre les proies
  // de la course portent le bonus — noté ici, journalisé après l’échange.
  const traquesCombat = [];
  for (const attaquant of attaquants) {
    attaquant.attaquee = true;
    if (!duel[cote].creatures.some((entite) => entite.id === attaquant.id)) continue;
    // Sa frappe rapide a touché : l'attaque s'arrête là, sans blocage, sans
    // blessures de combat et sans dégâts au sorcier.
    if (attaquantsArretes.has(attaquant.id)) continue;
    const idsBloqueurs = blocagesApresCapacites[attaquant.id] ?? [];
    if (!idsBloqueurs.length) {
      // Un attaquant déclaré bloqué le reste même si ses bloqueurs sont tombés
      // sous les capacités préalables : seul le passage libre frappe le sorcier.
      if (!attaquantsDejaBloques.has(attaquant.id)) {
        coupsSorcier.push({ attaquantId: attaquant.id, amount: forceCombat(attaquant) });
      }
      continue;
    }

    const bloqueurs = idsBloqueurs.map((id) => bloqueursDisponiblesPourValidation.find((entite) => entite.id === id)).filter(Boolean);
    const carteAttaquant = duelCardById(attaquant.carteId);
    const couleursAttaquant = cardColors(carteAttaquant);
    for (const bloqueur of bloqueurs) {
      const carteBloqueur = duelCardById(bloqueur.carteId);
      const couleursBloqueur = cardColors(carteBloqueur);
      const forceBloqueur = estGelee(bloqueur) ? 0 : bloqueur.atk;

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
        forceBloqueur,
        couleursBloqueur,
        'attaque',
        adv,
        bloqueur.id,
      );
    }
    // La Traque : le +N/+0 s’ajoute aux blessures portées à la première
    // proie qui bloque — la répartition déclarée (qui partage la force
    // imprimée) reste donc valide, le bonus frappe en sus, simultané au
    // reste du combat.
    const proieTraquee = estGelee(attaquant)
      ? null
      : bloqueurs.find((bloqueur) => bonusTraquePirates(attaquant, bloqueur) > 0);
    const bonusTraque = proieTraquee ? bonusTraquePirates(attaquant, proieTraquee) : 0;
    if (proieTraquee && bonusTraque > 0) {
      enregistrerDegatsCombat(
        degatsCombat,
        adv,
        proieTraquee.id,
        bonusTraque,
        couleursAttaquant,
        'attaque',
        cote,
        attaquant.id,
      );
      traquesCombat.push({ attaquant: attaquant.name, cible: proieTraquee.name, bonus: bonusTraque });
    }
    // Overkill (le Serpent du monde) : comme le Piétinement — la force qui
    // dépasse ce qu'il faut pour terrasser les bloqueurs (PV et boucliers
    // compris) continue sa course jusqu'au sorcier défenseur.
    if (attaquant.overkill) {
      const encaissable = bloqueurs.reduce((total, bloqueur) => total
        + Math.max(0, bloqueur.pv + (bloqueur.bouclier ?? 0)), 0);
      const exces = Math.max(0, forceCombat(attaquant) + bonusTraque - encaissable);
      if (exces > 0) {
        coupsSorcier.push({ attaquantId: attaquant.id, amount: exces, overkill: attaquant.name });
      }
    }
    resume.paires.push([attaquant.name, ...bloqueurs.map((bloqueur) => bloqueur.name)]);
  }

  for (const coup of coupsSorcier) {
    if (!duel[cote].creatures.some((entite) => entite.id === coup.attaquantId)) continue;
    // Le Grand Voile blanc avale aussi les coups portés au sorcier.
    if (duel.brouillardCombat) continue;
    resume.frappeSorcier += coup.amount;
    rpgInfligerSorcier(duel, adv, coup.amount);
    if (coup.overkill) {
      duel.log.push(`Overkill : ${coup.overkill} perce les bloqueurs — ${coup.amount} dégâts au sorcier.`);
    }
  }

  // Les montants normaux restent simultanés, mais une source éliminée par
  // une capacité préalable ne peut plus infliger ses blessures de combat.
  const coupsNormaux = degatsCombat
    .filter((coup) => duel[coup.coteSource].creatures.some((entite) => entite.id === coup.sourceId))
    .map(({ coteSource, sourceId, ...coup }) => ({ ...coup, sourceCote: coteSource, sourceId }));
  const esquivesCombat = appliquerDegatsDeCombatSimultanes(duel, coupsNormaux);
  // Contre-attaque : une attaque esquivée pendant l'échange est rendue à son
  // auteur, une seule fois par défenseur, après les blessures simultanées.
  for (const esquive of esquivesCombat ?? []) {
    const defenseur = duel[esquive.cote]?.creatures.find((entite) => entite.id === esquive.entiteId);
    if (!defenseur) continue;
    riposteDeContreAttaque(duel, defenseur, esquive.source);
  }
  for (const coup of resume.coupsRapides) {
    duel.log.push(coup.annule
      ? `${coup.attaquant} ne trouve plus sa cible : son Coup rapide est annulé.`
      : coup.rate
        ? `${coup.attaquant} rate son Coup rapide contre ${coup.cible}.`
        : `${coup.attaquant} inflige ${coup.degats} dégâts à ${coup.cible} avec Coup rapide${coup.traque ? ` (Traque +${coup.traque}/+0)` : ''}.`);
  }
  for (const traque of traquesCombat) {
    duel.log.push(`Traque : ${traque.attaquant} gagne +${traque.bonus}/+0 contre ${traque.cible} pour ce combat.`);
  }
  // Contre-attaque : la cible d'un Coup rapide rend le coup, qu'elle ait
  // encaissé la frappe ou qu'elle l'ait esquivée — seule une frappe RATÉE ne
  // lui laisse rien à rendre. La cible tombée sous le coup, elle, ne riposte
  // plus (`riposteDeContreAttaque` lit ses PV). La riposte est résolue après
  // le journal de la frappe rapide, pour que le récit se lise dans l'ordre.
  for (const frappe of frappesRapides) {
    if (frappe.annule || frappe.rate) continue;
    const defenseur = duel[adv].creatures.find((entite) => entite.id === frappe.cibleId);
    if (!defenseur) continue;
    riposteDeContreAttaque(duel, defenseur, {
      type: 'creature', cote, entiteId: frappe.attaquantId,
    });
  }
  duel.log.push(resume.paires.length || resume.coupsRapides.length
    ? `Combat : ${attaquants.length} attaquant(s), ${resume.paires.length} bloqué(s), ${resume.frappeSorcier} dégâts directs.`
    : `${attaquants.length} créature(s) frappent le sorcier (${resume.frappeSorcier}).`);
  if (duel.brouillardCombat) {
    duel.log.push('Le grand voile blanc absorbe les dégâts de combat.');
  }
  // Bilan des blessures portées par chaque attaquant, armes du Sable
  // comprises : le Coup rapide compte, la riposte des bloqueurs non
  // (`coupsNormaux` contient les deux sens), et le Grand Voile blanc efface
  // tout ce qui visait le sorcier.
  const ajouterBlessure = (carnet, id, montant) => carnet.set(id, (carnet.get(id) ?? 0) + Math.max(0, Number(montant) || 0));
  const blessuresCreatures = new Map();
  for (const frappe of frappesRapides) {
    if (!frappe.annule && !frappe.rate) ajouterBlessure(blessuresCreatures, frappe.attaquantId, frappe.degats);
  }
  for (const coup of coupsNormaux) {
    if (coup.cote !== adv) continue;
    ajouterBlessure(blessuresCreatures, coup.sourceId, coup.amount);
  }
  const blessuresSorcier = new Map();
  if (!duel.brouillardCombat) {
    for (const coup of coupsSorcier) ajouterBlessure(blessuresSorcier, coup.attaquantId, coup.amount);
  }
  declencherArmesAttaquants(duel, cote, porteursDeclencheurs.map(({ id, armeId }) => ({
    id,
    armeId,
    creature: blessuresCreatures.get(id) ?? 0,
    sorcier: blessuresSorcier.get(id) ?? 0,
  })));
  // Butin : les créatures du Sable qui ont touché le sorcier piochent puis
  // défaussent — même bilan, même fenêtre que les armes. Tribut : même
  // contact, même bilan, transfert de vie à la clé.
  const bilansContact = porteursDeclencheurs.map(({ id }) => ({
    id,
    sorcier: blessuresSorcier.get(id) ?? 0,
  }));
  declencherButins(duel, cote, bilansContact);
  declencherTributs(duel, cote, bilansContact);
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

/**
 * Résolution d'une attaque qui n'a pas été bloquée par une créature — le
 * raccourci d'une attaque isolée (les scénarios sans interface s'en servent).
 * Le Coup rapide garde son choix : avec `cibleCreatureId`, la créature frappe
 * la créature désignée et son attaque s'arrête là (`rpgLancerAttaque`) ;
 * sans cible, elle attaque le sorcier comme n'importe quelle créature.
 */
export function rpgAttaquerSorcier(duel, cote, entiteId, cibleCreatureId = null) {
  const attaquant = duel[cote].creatures.find((e) => e.id === entiteId);
  if (!attaquant) return { ok: false, raison: 'absente' };
  if (!pret(attaquant)) return { ok: false, raison: 'pas-pret' };
  const carte = duelCardById(attaquant.carteId);
  if (attaquant.coupRapide) {
    if (cibleCreatureId) {
      const cible = duel[autre(cote)].creatures.find((entite) => entite.id === cibleCreatureId);
      if (!cible) return { ok: false, raison: 'cible' };
      if (rpgEstProtegee(cible, cardColors(carte))) return { ok: false, raison: 'protection' };
      return rpgLancerAttaque(duel, cote, [entiteId], { [entiteId]: [] }, null, [], { [entiteId]: cibleCreatureId });
    }
  } else if (cibleCreatureId) {
    return { ok: false, raison: 'cible' };
  }
  // Ce raccourci suppose une attaque non bloquée : un bloqueur forcé capable
  // de s'interposer doit d'abord être déclaré dans un vrai combat.
  if (!rpgBlocageForceValide(duel, cote, [entiteId], { [entiteId]: [] }, {})) {
    return { ok: false, raison: 'blocage-force' };
  }
  // L'attaque directe est une attaque comme une autre : la bannière grandit
  // l'attaquant avant sa frappe. Le Coup rapide, plus haut, est passé par
  // `rpgLancerAttaque` et a déjà reçu son déclenchement.
  appliquerBannieresAttaque(duel, cote, [attaquant]);
  attaquant.attaquee = true;
  let frappeSorcier = 0;
  if (duel.brouillardCombat) {
    // Le Grand Voile blanc : le coup s'égare, le sorcier ne prend rien.
    duel.log.push(`${attaquant.name} frappe dans le grand voile blanc : le sorcier ne prend rien.`);
  } else {
    frappeSorcier = attaquant.atk;
    rpgInfligerSorcier(duel, autre(cote), attaquant.atk);
    duel.log.push(`${attaquant.name} frappe le sorcier ${autre(cote) === 'joueur' ? 'joueur' : 'ennemi'} (${attaquant.atk}).`);
  }
  // L'arme du Sable emporte ses déclencheurs : « attaque » et « blesse le
  // sorcier » (le Coup rapide, plus haut, est passé par `rpgLancerAttaque`,
  // qui les a déjà réglés).
  declencherArmesAttaquants(duel, cote, [{
    id: attaquant.id,
    armeId: attaquant.arme?.carteId ?? null,
    creature: 0,
    sorcier: frappeSorcier,
  }]);
  declencherButins(duel, cote, [{ id: attaquant.id, sorcier: frappeSorcier }]);
  declencherTributs(duel, cote, [{ id: attaquant.id, sorcier: frappeSorcier }]);
  rpgActionsEtat(duel);
  return { ok: true };
}

/**
 * Don de Bimini : la cible est entièrement soignée après avoir grandi, puis
 * conserve définitivement les deux protections promises par la Source.
 */
export function rpgResoudreSiteCible(duel, cote, cibleId) {
  const attente = duel?.siteEnAttente;
  if (!attente || attente.cote !== cote || attente.recompense !== 'bimini') {
    return { ok: false, raison: 'attente' };
  }
  const cible = duel[cote]?.creatures.find((entite) => entite.id === cibleId);
  if (!cible || estSite(cible)) return { ok: false, raison: 'cible' };
  const pvAvant = Math.max(0, Number(cible.pv) || 0);
  const pvMaxAvant = Math.max(1, Number(cible.pvMax) || Number(cible.def) || 1);
  cible.atk = Math.max(0, (Number(cible.atk) || 0) + 3);
  cible.pvMax = pvMaxAvant + 3;
  cible.def = cible.pvMax;
  cible.pv = cible.pvMax;
  cible.protectionSorts = true;
  cible.tenaciteDisponible = true;
  journaliserSoin(duel, cote, Math.max(0, cible.pv - pvAvant), cible.id);
  duel.siteEnAttente = null;
  duel.log.push(`La Source de Bimini soigne entièrement ${cible.name} : elle gagne définitivement +3/+3, Protection contre les sorts et Tenacité.`);
  return { ok: true, cibleId: cible.id };
}

/** Résout l'étape finale d'un Site lorsque sa dernière Heure est retirée. */
function resoudreSite(duel, cote, entite, carte) {
  const recompense = carte.site?.recompense;
  if (recompense === 'pioche') {
    const nombre = Math.max(0, Math.trunc(Number(carte.site?.pioche) || 0));
    let piochees = 0;
    for (let index = 0; index < nombre; index += 1) {
      if (rpgPiocher(duel, cote)) piochees += 1;
    }
    duel.log.push(`${carte.name} est découvert : ${cote === 'joueur' ? 'vous piochez' : 'le sorcier pioche'} ${piochees} carte${piochees > 1 ? 's' : ''}.`);
    return;
  }
  if (recompense !== 'bimini') return;
  const cibles = duel[cote].creatures.filter((candidate) => !estSite(candidate));
  if (!cibles.length) {
    duel.log.push('La Source de Bimini est atteinte, mais aucune créature ne peut boire son eau.');
    return;
  }
  duel.siteEnAttente = { cote, entiteId: entite.id, carteId: carte.id, recompense: 'bimini' };
  if (cote === 'sorcier') {
    const cible = [...cibles].sort((a, b) =>
      ((b.atk ?? 0) + (b.pv ?? 0)) - ((a.atk ?? 0) + (a.pv ?? 0)))[0];
    rpgResoudreSiteCible(duel, cote, cible.id);
  } else {
    duel.log.push('La Source de Bimini est atteinte : choisissez une créature alliée à restaurer et consacrer.');
  }
}

/**
 * Les Heures tombent au début du tour du contrôleur. Le Guetteur applique son
 * effet final ; un Site révèle sa récompense et reste posé avec son art final.
 */
function resoudreHeures(duel) {
  const camp = duel[duel.tour];
  for (const entite of [...camp.creatures]) {
    if (!entite.heures) continue;
    entite.heures.restants -= 1;
    if (entite.heures.restants > 0) {
      duel.log.push(`${entite.name} : ${entite.heures.restants} heure${entite.heures.restants > 1 ? 's' : ''} à compter.`);
      continue;
    }
    const effetFinal = entite.heures.effet;
    entite.heures = null;
    const carte = duelCardById(entite.carteId);
    if (carte?.kind === 'site') {
      duel.log.push(`${entite.name} : la dernière Heure est retirée.`);
      resoudreSite(duel, duel.tour, entite, carte);
      continue;
    }
    duel.log.push(`Le beffroi sonne : ${entite.name} a fini de compter.`);
    const effets = Array.isArray(effetFinal) ? effetFinal : (effetFinal ? [effetFinal] : []);
    for (const effet of effets) {
      appliquer(duel, duel.tour, effet, null, entite.id, cardColors(carte), 'capacite', entite.carteId);
    }
  }
}

/**
 * Fait avancer d’un tour les cartes promises à revenir et les remet en jeu.
 * Deux origines : la capacité de mort « retour-apres-tours » (l'Anqa) et la
 * **Tenacité**, dont la carte revient avec `tenacite: true` — un point de
 * défense et plus aucune renaissance pour la partie. Une carte qui n'est plus
 * au cimetière (relevée entre-temps par le Khopesh, par exemple) ne revient
 * pas : le retour se dissipe sans doublon.
 *
 * Ce retour est une **arrivée en jeu** : `appliquerArriveeDeRetour` rejoue
 * l'effet d'arrivée de la carte, cible désignée par l'IA. C'est la règle de
 * Tenacité voulue pour le Maître du marteau (ses 3 dégâts retentissent) comme
 * pour toutes les créatures tenaces.
 */
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
      // Le retour attend une place libre : sans elle, il est repoussé d'un tour
      // plutôt que de poser une sixième créature hors des cases.
      if (!placesLibresChamp(duel, cote)) {
        camp.retoursProgrammes.push({ ...retour, toursRestants: 1 });
        duel.log.push(`Le champ est plein : ${carte.name} attend une place libre pour revenir.`);
        continue;
      }
      camp.cimetiere.splice(indexCimetiere, 1);
      const entite = creerEntiteCreature(carte);
      if (retour.tenacite) {
        // Renaissance de Tenacité : un point de défense, et plus aucune
        // Tenacité — la carte a dépensé sa seule renaissance de la partie.
        // Le plafond de vie reste la défense imprimée : un soin peut rendre à
        // la créature sa vie (et donc sa défense), sans lui rendre Tenacité.
        entite.tenaciteDisponible = false;
        entite.pv = 1;
        entite.def = 1;
        // La renaissance est une **vraie arrivée en jeu** : l'effet d'arrivée
        // de la carte se déclenche de nouveau (voir `appliquerArriveeDeRetour`
        // juste après). Le Maître du marteau revenu de Tenacité refrappe donc.
        duel.log.push(carte.arrivee
          ? `Tenacité : ${carte.name} revient en jeu avec 1 point de défense, et son effet d’arrivée retentit.`
          : `Tenacité : ${carte.name} revient en jeu avec 1 point de défense.`);
      } else {
        duel.log.push(`${carte.name} renaît et revient en jeu.`);
      }
      camp.creatures.push(entite);
      placerDansEmplacement(duel, cote, entite);
      // Tenacité, Khopesh, Anqa : revenir en jeu rejoue l'arrivée de la carte.
      appliquerArriveeDeRetour(duel, cote, carte, entite);
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
  if (duel.siteEnAttente) return null;
  if (duel.modeMana === RPG_MODE_MANA_ESSAI && duel[duel.tour].manaChoixEnAttente) return null;
  if (duel.finDeTour) return duel.finDeTour;
  duel.phase = 'fin';
  duel.finDeTour = { cote: duel.tour };
  duel.fenetreReponse = true;
  duel.log.push(`Fin du tour du ${duel.tour === 'joueur' ? 'joueur' : 'sorcier'} : ${duel.tour === 'joueur' ? 'le sorcier peut' : 'vous pouvez'} jouer une magie rapide.`);
  return duel.finDeTour;
}

/** Le camp a-t-il en main une magie rapide qu'il peut jouer maintenant ?
 *  (Un contre n'a rien à contrer en fin de tour : il ne compte pas — et un
 *  sort sans cible valide non plus.) */
export function rpgPeutRepondre(duel, cote) {
  return duel[cote].main.some((id) => {
    const carte = magieById(id);
    return Boolean(carte?.instant
      && rpgContreJouable(duel, cote, carte)
      && rpgSortACibleValide(duel, cote, carte)
      && rpgPeutPayer(duel[cote], carte));
  });
}

/** Une magie rapide de l'IA (fin de tour du joueur, blocage d'une attaque du
 *  joueur) : au plus une carte, la plus utile selon son profil. */
export function rpgSorcierMagieRapide(duel, rng = Math.random) {
  const coup = choisirCarteIA(duel, 'sorcier', { ia: duel.sorcier.ia, rng, seulementInstants: true });
  if (!coup) return null;
  const res = rpgLancerMagie(duel, 'sorcier', coup.carteId, coup.cibleId);
  // La cible repart avec le résultat : la page en a besoin pour dire, au-dessus
  // des piles du sorcier, ce que le sort vient de frapper.
  return res.ok
    ? { ...res, carteId: coup.carteId, cibleId: coup.cibleId ?? null, cibleAllieeId: coup.cibleAllieeId ?? null }
    : null;
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
/**
 * Les Deux Visages (La Barbe Noire, set Lettres de Marque) : au début du tour
 * de son camp, la créature change de visage — l'homme et la légende se
 * relaient, sans que personne ne choisisse. Les statistiques du nouveau
 * visage remplacent celles de l'ancien **par différence** : les armes portées
 * et les renforts posés par-dessus suivent le mouvement. Les blessures
 * suivent d'un visage à l'autre (une légende blessée reste un homme blessé),
 * et changer de visage ne la tue jamais : à terre, le corps garde 1 PV.
 */
function changerVisages(duel) {
  const camp = duel[duel.tour];
  for (const entite of camp.creatures) {
    if (entite.visage == null) continue;
    const visages = duelCardById(entite.carteId)?.alternance?.visages;
    if (!Array.isArray(visages) || visages.length < 2) continue;
    const ancien = visages[entite.visage] ?? visages[0];
    entite.visage = (entite.visage + 1) % visages.length;
    const nouveau = visages[entite.visage];
    const deltaAtk = (nouveau.atk ?? 0) - (ancien.atk ?? 0);
    const deltaDef = (nouveau.def ?? 0) - (ancien.def ?? 0);
    entite.atk = Math.max(0, entite.atk + deltaAtk);
    entite.pvMax = Math.max(1, (entite.pvMax ?? entite.def) + deltaDef);
    entite.def = Math.max(1, entite.def + deltaDef);
    entite.pv = Math.min(entite.pv + deltaDef, entite.def);
    if (entite.pv < 1) entite.pv = 1;
    // La Provocation appartient au visage : l'homme tient le rempart, la
    // légende ne se cache derrière rien.
    if (ancien.provocation || nouveau.provocation) {
      entite.provocation = Boolean(nouveau.provocation);
    }
    duel.log.push(`${entite.name} change de visage : ${nouveau.nom ?? 'l’autre'} (${nouveau.atk ?? 0}/${nouveau.def ?? 0}).`);
  }
}

export function rpgFinDeTour(duel) {
  // Bimini attend que son contrôleur désigne la créature consacrée.
  if (duel.siteEnAttente) return duel;
  // Un joueur multicolore doit investir son nouveau mana avant de pouvoir
  // quitter son tour. Ce garde-fou protège aussi les appels hors interface.
  if (duel.modeMana === RPG_MODE_MANA_ESSAI && duel[duel.tour].manaChoixEnAttente) return duel;
  // Une destruction ciblée attend son clic : le tour ne se ferme pas avant
  // elle, sinon le Ghul frapperait pendant le tour suivant — ou pas du tout.
  // Une attente sans cible légale se dissipe d'abord : elle ne bloque rien.
  rpgDissiperDestructionsSansCible(duel);
  if (duel.destructionsEnAttente?.length) return duel;
  duel.phase = 'fin';
  duel.finDeTour = null;
  while (duel.defausseEnAttente?.restant > 0 && duel[duel.defausseEnAttente.cote]?.main.length) {
    rpgDefausserCarte(duel, duel.defausseEnAttente.cote);
  }
  duel.defausseEnAttente = null;
  duel.fenetreReponse = false;
  duel.annonce = null;
  // Une arrivée qui attendait sa victime meurt avec le tour : la page interdit
  // de terminer tant qu'une désignation est ouverte, mais le moteur ne laisse
  // jamais traîner l'attente d'un tour sur l'autre.
  duel.arriveeEnAttente = null;
  // Les sceaux des arrivées (Lettre de marque, Pilote de la Carreira)
  // expirent avec le tour qui les a vus naître : les poses suivantes
  // n'accostent plus.
  duel[duel.tour].abordageDesArrivees = false;
  duel[duel.tour].prochaineArriveeAbordage = false;
  // La faveur du Kraken non utilisée s'éteint avec le tour.
  duel.magieGratuite = null;
  detruireEphemeres(duel);
  for (const cote of ['joueur', 'sorcier']) {
    for (const entite of duel[cote].creatures) {
      if (!(entite.protection?.toursRestants > 0)) continue;
      entite.protection.toursRestants -= 1;
      if (entite.protection.toursRestants <= 0) {
        const couleur = labelCouleursProtection(entite.protection.contre);
        entite.protection = null;
        duel.log.push(`${entite.name} perd sa protection contre ${couleur}.`);
      }
    }
  }
  annulerBonusTemporaires(duel, duel.tour); // le bonus meurt avec le tour qui l’a vu jouer
  annulerInfiltrations(duel); // l’Infiltration aussi : redevenues bloquables
  // Le gel (la Poigne de givre, le Verglas) compte les tours du contrôleur de
  // la créature figée : la fin de chacun de SES tours en décoche un. Les
  // interdits de combat (le venin de la Vipère, la lune de Bakunawa) suivent
  // la même horloge.
  for (const entite of duel[duel.tour].creatures) {
    if (entite.gelToursRestants > 0) {
      entite.gelToursRestants -= 1;
      if (entite.gelToursRestants <= 0) duel.log.push(`${entite.name} n’est plus gelée.`);
    }
    if (entite.empecheAttaqueToursRestants > 0) {
      entite.empecheAttaqueToursRestants -= 1;
      if (entite.empecheAttaqueToursRestants <= 0) duel.log.push(`${entite.name} peut de nouveau attaquer.`);
    }
    if (entite.empecheBlocageToursRestants > 0) {
      entite.empecheBlocageToursRestants -= 1;
      if (entite.empecheBlocageToursRestants <= 0) duel.log.push(`${entite.name} peut de nouveau bloquer.`);
    }
    // Le venin de la Vipère : la morsure s'efface avec l'interdit d'attaquer,
    // à la fin du tour de la victime. La créature retrouve son attaque.
    if (entite.venin?.toursRestants > 0) {
      entite.venin.toursRestants -= 1;
      if (entite.venin.toursRestants <= 0) {
        entite.atk = Math.max(0, entite.atk - (entite.venin.atk ?? 0));
        entite.pvMax = Math.max(0, (entite.pvMax ?? 0) - (entite.venin.def ?? 0));
        entite.pv = Math.max(0, entite.pv - (entite.venin.def ?? 0));
        duel.log.push(`Le venin s’évapore : ${entite.name} retrouve son attaque.`);
        entite.venin = null;
      }
    }
  }
  // Le Grand Voile blanc et le blocage forcé « ce tour » (l’Embuscade)
  // meurent avec le tour en cours.
  duel.brouillardCombat = false;
  for (const cote of ['joueur', 'sorcier']) {
    for (const entite of duel[cote].creatures) {
      if (entite.blocageForce?.portee === 'tour') entite.blocageForce = null;
    }
  }
  // Mode sans terrains : main plafonnée à six cartes en fin de tour. Ce qui
  // dépasse est défaussé ici — choisi par le joueur via l'interface quand il
  // a ouvert la défausse, défaussé d'office (lecture de l'IA) sinon, et
  // toujours pour le sorcier, qui n'a personne pour choisir à sa place.
  if (duel.modeMana === RPG_MODE_MANA_ESSAI) {
    rpgPreparerDefausseFinDeTour(duel, duel.tour);
    while (duel.defausseEnAttente?.cote === duel.tour && duel.defausseEnAttente.restant > 0
      && duel[duel.tour].main.length) {
      rpgDefausserCarte(duel, duel.tour);
    }
    if (duel.defausseEnAttente?.cote === duel.tour) duel.defausseEnAttente = null;
  }
  duel.tour = autre(duel.tour);
  duel.phase = 'debut';
  // Nouveau tour, nouvelle phase d'attaque : le camp qui vient de jouer a
  // consommé la sienne, l'autre ouvre la sienne.
  duel.attaqueJouee = null;
  const camp = duel[duel.tour];
  // La réserve encore disponible couvre les réponses pendant le tour adverse ;
  // elle ne se cumule jamais d'un tour personnel à l'autre. Les capacités
  // temporaires de mana ne deviennent pas des sources permanentes.
  camp.mana = duel.modeMana === RPG_MODE_MANA_ESSAI ? { ...camp.manaMax } : manaVide();
  camp.terrainPose = false;         // un nouveau terrain peut être posé (mode classique)
  for (const terrain of camp.terrains) terrain.tapped = false; // on dégage
  if (!rpgPiocher(duel, duel.tour) && duel.modeMana === RPG_MODE_MANA_ESSAI) {
    // Seule la pioche OBLIGATOIRE provoque la fatigue. Un effet qui tente de
    // piocher dans un paquet vide ne blesse pas plusieurs fois par tour.
    camp.fatigue += 1;
    camp.pv -= camp.fatigue;
    duel.log.push(`Fatigue : ${duel.tour === 'joueur' ? 'vous perdez' : 'le sorcier perd'} ${camp.fatigue} PV (paquet vide).`);
  }
  for (const entite of camp.creatures) {
    entite.ready = true;
    entite.attaquee = false;
  }
  resoudreRetoursProgrammes(duel);
  resoudreHeures(duel);             // les compteurs d'Heures du beffroi
  resoudreEchos(duel);              // les échos dus au camp dont le tour s'ouvre
  changerVisages(duel);             // Les Deux Visages tournent avec le camp
  if (duel.modeMana === RPG_MODE_MANA_ESSAI && !rpgVainqueur(duel)
    && totalCapaciteMana(camp) < RPG_MANA_ESSAI_MAX) {
    camp.manaChoixEnAttente = true;
    const autoIA = duel.tour === 'sorcier' && !duel.pvp;
    if (autoIA || camp.couleurs.length === 1) {
      rpgChoisirCouleurMana(duel, duel.tour, autoIA
        ? choisirCouleurManaIA(duel, 'sorcier') : camp.couleurs[0]);
    }
  }
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
  // En essai, le mana coloré a été choisi au début du tour du sorcier.
  if (duel.modeMana === RPG_MODE_MANA_ESSAI) return;
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
 *  Retourne null quand le sorcier n'a plus rien à jouer.
 *
 *  Une annonce ne doit jamais être une carte injouable : le moteur refuserait
 *  la pose, la résolution échouerait, et le sorcier réannoncerait la même
 *  carte sans fin — sa morsure, la lune de Bakunawa ou le passage du Faiseur
 *  désignant une créature que l'IA n'avait pas su choisir. La carte est donc
 *  écartée si elle exige une cible et qu'aucune cible ne peut être trouvée ;
 *  le sorcier cherche alors autre chose, et sa partie continue. */
export function rpgSorcierAnnonceSuivante(duel, rng = Math.random) {
  if (duel.annonce) return duel.annonce;
  const refuses = new Set();
  for (let essai = 0; essai < 4; essai += 1) {
    const coup = choisirCarteIA(duel, 'sorcier', { ia: duel.sorcier.ia, rng, exclus: refuses });
    if (!coup) return null;
    const carte = duelCardById(coup.carteId) ?? magieById(coup.carteId) ?? armeById(coup.carteId);
    // L'arrivée qui désigne sa cible emporte toujours sa cible : si l'IA en
    // a oublié une, le moteur la retrouve (le venin de la Vipère, la lune de
    // Bakunawa, le passage du Faiseur).
    const cibleId = coup.cibleId
      ?? (arriveeCiblePortee(carte) ? rpgCibleAuto(duel, 'sorcier', carte) : null);
    if (!cibleId && arriveeCiblePortee(carte) && arriveeACibleLegale(duel, 'sorcier', carte)) {
      // La carte exige une cible, il en reste une sur la table, et rien n'a
      // pu être désigné : elle n'est pas jouable. On l'écarte.
      refuses.add(coup.carteId);
      continue;
    }
    duel.annonce = { cote: 'sorcier', carteId: coup.carteId, cibleId: cibleId ?? null, cibleAllieeId: coup.cibleAllieeId ?? null };
    duel.fenetreReponse = true;
    duel.log.push(`Le sorcier annonce ${duelCardById(coup.carteId)?.name ?? magieById(coup.carteId)?.name ?? armeById(coup.carteId)?.name ?? coup.carteId}.`);
    return duel.annonce;
  }
  return null;
}

/** Laisser passer : résout la carte annoncée (paiement et effet). */
export function rpgSorcierResoudreAnnonce(duel) {
  const annonce = duel.annonce;
  if (!annonce) return { ok: false, raison: 'aucune-annonce' };
  duel.annonce = null;
  duel.fenetreReponse = false;
  // Champ d'essai plein : le moteur sacrifie d'office la créature la plus
  // frêle du sorcier (`choisirSacrifice`, dans `rpgJouerCreature`) pour poser
  // celle qu'il vient d'annoncer, comme le joueur le fait après confirmation.
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
/**
 * La créature que le Trait de sable va piquer : la plus entamée d'abord —
 * l'IA achève ce qu'elle peut achever —, la plus frêle à défaut.
 */
function choisirCibleDegatsArmeIA(duel, carte, montant) {
  const proies = duel.joueur.creatures
    .filter((entite) => !rpgEstProtegee(entite, cardColors(carte)))
    .sort((a, b) => (a.pv ?? 0) - (b.pv ?? 0) || (a.def ?? 0) - (b.def ?? 0));
  const tuable = proies.find((entite) => (entite.pv ?? 0) <= montant);
  return (tuable ?? proies[0])?.id ?? null;
}

/**
 * Quel mode une arme à modes dépense-t-elle, côté sorcier ? Le bon sens d'un
 * joueur de Jitte : achever une créature d'abord, se soigner quand la
 * blessure compte, grandir son porteur le reste du tour.
 */
function choisirModeArmeIA(duel, carte) {
  const modes = carte.activation?.modes ?? [];
  if (!modes.length) return null;
  const proies = duel.joueur.creatures.filter((entite) => !rpgEstProtegee(entite, cardColors(carte)));
  if (proies.some((entite) => (entite.pv ?? 0) <= 1)) {
    return modes.find((mode) => mode.effet?.type === 'degats') ?? modes[0];
  }
  if (duel.sorcier.pv <= duel.sorcier.pvMax - 4) {
    return modes.find((mode) => mode.effet?.type === 'soin') ?? modes[0];
  }
  return modes.find((mode) => mode.effet?.type === 'buff') ?? modes[0];
}

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
    const parCompteurs = Math.max(0, Number(activation.compteurs) || 0) > 0;
    let garde = 8;
    while (garde-- > 0) {
      if (parCompteurs) {
        // La Jitte d’Amayas : on dépense les compteurs de sable un par un,
        // jamais tous d'un coup sur le même geste.
        if ((porteur.arme?.compteurs ?? 0) < activation.compteurs) break;
        const mode = choisirModeArmeIA(duel, carte);
        const cibleId = mode?.effet?.type === 'degats'
          ? choisirCibleDegatsArmeIA(duel, carte, Math.max(0, Number(mode.effet.amount) || 0))
          : null;
        const res = rpgActiverArme(duel, 'sorcier', porteur.id, { mode: mode?.id ?? null, cibleId });
        if (!res.ok) break;
        actives.push(porteur);
        continue;
      }
      if (!rpgPeutPayer(duel.sorcier, { cost: cout })) break;
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
    const bannieresAppliquees = rpgAppliquerBannieresAttaque(duel, 'sorcier', attaquants);
    const ciblesAttaque = rpgCiblesAttaqueRapide(duel, 'sorcier', attaquants, { ia: duel.sorcier.ia, rng });
    rpgLancerAttaque(duel, 'sorcier', attaquants, null, null, null, ciblesAttaque,
      { bannieresAppliquees });
  }
  return joue;
}

/** Qui a gagné ? null tant que les deux sorciers tiennent debout. */
export function rpgVainqueur(duel) {
  if (duel?.fin?.nul) return 'egalite';
  if (duel?.fin?.gagnant) return duel.fin.gagnant;
  const joueur = duel.joueur.pv <= 0;
  const sorcier = duel.sorcier.pv <= 0;
  if (joueur && sorcier) return 'egalite';
  if (sorcier) return 'joueur';
  if (joueur) return 'sorcier';
  return null;
}
