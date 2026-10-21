/**
 * Le Sablier en ligne — protocole du mode PvP.
 * --------------------------------------------
 * Ce module ne dessine rien et ne parle à aucun réseau : il tient les trois
 * morceaux de règle qu'un duel **entre deux joueurs** exige et que le duel
 * contre l'IA n'a jamais eu besoin de nommer.
 *
 *  1. **Qui a la main** (`rpgPvpCoteActif`, `rpgPvpPeutAgir`). Le moteur de
 *     `rpgDuel.js` ne connaît que `duel.tour` ; en PvP il faut en plus la
 *     fenêtre de blocage et la fenêtre de réponse, où c'est le camp qui ne
 *     joue pas qui doit répondre.
 *  2. **Ce que chacun a le droit de voir** (`rpgPvpVue`). L'état complet porte
 *     les deux mains et les deux pioches : le serveur n'en envoie qu'une vue
 *     filtrée, remise du point de vue du destinataire (le camp `sorcier` est
 *     retourné pour que le joueur ait toujours sa main en bas de l'écran).
 *  3. **Ce que le serveur accepte** (`rpgPvpAppliquer`). Une intention arrive
 *     du client ; elle est rejouée par le serveur sur l'état de référence, de
 *     façon atomique (échec = état restauré à l'identique).
 *
 * Le module est **pur et testable hors navigateur** (`npm run check:rpg-pvp`) :
 * il ne lit ni `window`, ni `localStorage`, ni Supabase. L'arbitre (fonction
 * serveur) et la page de duel s'en servent tous les deux, ce qui garantit
 * qu'ils parlent bien de la même partie.
 *
 * Voir `docs/rpg/17-pvp-multijoueur.md` pour l'architecture, le schéma SQL
 * (`supabase/rpg-pvp.sql`) et le découpage en étapes.
 */

import { cardById } from './rpgCards.js';
import {
  rpgActiverArme,
  rpgActiverCapacite,
  rpgChoisirCouleurMana,
  rpgFinDeTour,
  rpgJouerArme,
  rpgJouerCreature,
  rpgLancerAttaque,
  rpgLancerMagie,
  rpgMulligan,
  rpgPeutMulligan,
  rpgReglerHasard,
} from './rpgDuel.js';
import { graineNumerique, rngSeme } from './rpgHasard.js';

/** Version du protocole : deux clients de versions différentes refusent de s'affronter. */
export const RPG_PVP_VERSION = 1;

/** Un code de défi : 8 caractères hexadécimaux, comme les salons Mirage. */
export const RPG_PVP_CODE_LONGUEUR = 8;

/** La page de duel, telle que déclarée dans `src/main.jsx`. */
export const RPG_PVP_CHEMIN = '/jeu/sablier-de-bab-el';

/** Les deux camps du moteur. Un siège PvP EST un camp. */
export const RPG_PVP_SIEGES = ['joueur', 'sorcier'];

/**
 * Horloges (millisecondes).
 *
 * `live`  : un tour ne dure pas une éternité, mais laisse le temps de lire sa
 *           main sur un téléphone. Au-delà, le serveur joue « fin de tour ».
 * `async` : pas de pendule qui court — seulement un rappel, puis un abandon
 *           technique au bout d'une semaine sans coup.
 * `invitation` : une invitation non acceptée expire au bout de 7 jours.
 */
export const RPG_PVP_HORLOGES = {
  live: 90 * 1000,
  rappelAsync: 24 * 60 * 60 * 1000,
  abandonAsync: 7 * 24 * 60 * 60 * 1000,
  invitation: 7 * 24 * 60 * 60 * 1000,
};

/** Les intentions que le serveur sait rejouer (`rpgPvpAppliquer`). */
export const RPG_PVP_INTENTIONS = [
  'mulligan',
  'choix-mana',
  'jouer-carte',
  'activer',
  'attaquer',
  'fin-de-tour',
  'conceder',
];

/** L'autre camp. Toute action « à l'autre » passe par ici, jamais par un littéral. */
export function rpgPvpAutreCote(cote) {
  return cote === 'joueur' ? 'sorcier' : cote === 'sorcier' ? 'joueur' : null;
}

/* ------------------------------------------------------------------ */
/* Codes de défi et liens profonds                                     */
/* ------------------------------------------------------------------ */

/** Normalise une saisie (casse, espaces, tirets) en code de 8 caractères hexa. */
export function rpgPvpCode(brut) {
  const propre = String(brut ?? '').toUpperCase().replace(/[^A-F0-9]/g, '');
  return propre.length === RPG_PVP_CODE_LONGUEUR ? propre : '';
}

/** Vrai si `valeur` est un code de défi valide. */
export function rpgPvpCodeValide(valeur) {
  return rpgPvpCode(valeur) !== '';
}

/**
 * Code tiré au hasard. `rng` est injectable pour que les tests soient stables ;
 * le serveur, lui, n'utilise QUE cette fonction pour nommer une partie — un
 * code deviné à l'avance donnerait accès au siège d'en face.
 */
export function rpgPvpCodeAleatoire(rng = Math.random) {
  let code = '';
  while (code.length < RPG_PVP_CODE_LONGUEUR) {
    code += Math.floor(Math.min(0.999999, Math.max(0, rng())) * 16).toString(16).toUpperCase();
  }
  return code;
}

/**
 * Lien cliquable d'un défi. `base` vient de `window.location.origin` (vide en
 * test) : le lien reste relatif si on ne le fournit pas, ce qui marche aussi
 * bien dans un message du site que dans une application installée.
 */
export function rpgPvpLienDefi(code, base = '') {
  const propre = rpgPvpCode(code);
  if (!propre) return '';
  const racine = String(base || '').replace(/\/+$/, '');
  return `${racine}${RPG_PVP_CHEMIN}/defi/${propre}`;
}

/**
 * Retrouve le code d'un défi dans un lien, un chemin ou une saisie brute.
 * Tolérant exprès : un joueur peut coller l'URL complète, et le lien peut
 * arriver avec un suffixe de suivi (`?utm=…`).
 */
export function rpgPvpCodeDuLien(lien) {
  const texte = String(lien ?? '');
  const dansLeChemin = texte.match(/\/defi\/([A-Fa-f0-9]{8})\b/);
  if (dansLeChemin) return dansLeChemin[1].toUpperCase();
  const enParametre = texte.match(/[?&](?:defi|duel)=([A-Fa-f0-9]{8})\b/);
  if (enParametre) return enParametre[1].toUpperCase();
  return rpgPvpCode(texte);
}

/* ------------------------------------------------------------------ */
/* Qui a la main                                                       */
/* ------------------------------------------------------------------ */

/**
 * Le camp qui doit agir MAINTENANT. Pendant la phase de blocage et pendant la
 * fenêtre de réponse, c'est le défenseur — donc l'autre camp que `duel.tour`.
 */
export function rpgPvpCoteActif(duel) {
  if (!duel) return null;
  if (duel.fin?.gagnant) return null;
  if (duel.phase === 'blocage') return rpgPvpAutreCote(duel.tour);
  if (duel.fenetreReponse) return rpgPvpAutreCote(duel.tour);
  return duel.tour ?? null;
}

/**
 * Cette intention est-elle jouable par `cote`, maintenant ?
 * Rend `{ ok, raison }` — le serveur renvoie `raison` tel quel au client, qui
 * peut l'afficher (« Ce n'est pas ton tour », « Partie terminée »…).
 */
export function rpgPvpPeutAgir(duel, cote, intention = null) {
  if (!duel) return { ok: false, raison: 'partie-inconnue' };
  if (!RPG_PVP_SIEGES.includes(cote)) return { ok: false, raison: 'siege-inconnu' };
  if (duel.fin?.gagnant) {
    // On peut toujours concéder une partie déjà finie : c'est un no-op, et un
    // client qui perd la connexion au dernier coup ne doit pas se bloquer.
    if (intention?.type === 'conceder') return { ok: true, raison: null };
    return { ok: false, raison: 'terminee' };
  }
  if (intention?.type === 'conceder') return { ok: true, raison: null };
  if (!RPG_PVP_INTENTIONS.includes(intention?.type)) return { ok: false, raison: 'intention-inconnue' };
  // Avant les deux mulligans, seule la main de départ s'échange : aucune carte
  // ne se joue, et les deux camps peuvent échanger **dans n'importe quel
  // ordre** — exiger l'ordre du tour obligerait l'invité à attendre que l'hôte
  // ait cliqué, alors qu'aucun des deux ne « joue » encore.
  const mulligansFaits = duel.mulliganFait?.joueur && duel.mulliganFait?.sorcier;
  if (!mulligansFaits) {
    if (intention.type !== 'mulligan') return { ok: false, raison: 'mulligan' };
    return { ok: true, raison: null };
  }
  const actif = rpgPvpCoteActif(duel);
  if (actif !== cote) return { ok: false, raison: 'pas-votre-tour' };
  return { ok: true, raison: null };
}

/* ------------------------------------------------------------------ */
/* Vue filtrée                                                         */
/* ------------------------------------------------------------------ */

/** Retire d'un camp ce qui ne regarde que son propriétaire, en garde les compteurs. */
function cacherCamp(camp) {
  if (!camp) return camp;
  const { main, deck, ia, ...publics } = camp;
  return {
    ...publics,
    main: [],
    deck: [],
    mainCount: Array.isArray(main) ? main.length : 0,
    deckCount: Array.isArray(deck) ? deck.length : 0,
    cimetiere: Array.isArray(camp.cimetiere) ? camp.cimetiere : [],
  };
}

/**
 * Retourne une partie pour que le camp `sorcier` la voie comme le camp
 * `joueur` : sa main descend en bas, son adversaire monte. Le protocole ne
 * transmet jamais autre chose que `vue === rpgPvpVue(etat, siege)`.
 */
function retournerPartie(vue) {
  const remplace = (cote) => (cote === 'joueur' ? 'sorcier' : cote === 'sorcier' ? 'joueur' : cote);
  [vue.joueur, vue.sorcier] = [vue.sorcier, vue.joueur];
  vue.tour = remplace(vue.tour);
  if (vue.attaqueJouee) vue.attaqueJouee = remplace(vue.attaqueJouee);
  if (vue.mulliganFait) {
    vue.mulliganFait = {
      joueur: Boolean(vue.mulliganFait.sorcier),
      sorcier: Boolean(vue.mulliganFait.joueur),
    };
  }
  if (vue.finDeTour?.cote) vue.finDeTour = { ...vue.finDeTour, cote: remplace(vue.finDeTour.cote) };
  if (vue.defausseEnAttente?.cote) {
    vue.defausseEnAttente = { ...vue.defausseEnAttente, cote: remplace(vue.defausseEnAttente.cote) };
  }
  if (vue.annonce?.cote) vue.annonce = { ...vue.annonce, cote: remplace(vue.annonce.cote) };
  if (vue.fin?.gagnant) vue.fin = { ...vue.fin, gagnant: remplace(vue.fin.gagnant) };
  return vue;
}

/**
 * La seule forme sous laquelle un état de duel sort du serveur.
 *
 * Garanties, vérifiées par `tests/rpg-pvp.test.js` :
 *   - la main et la pioche adverses sont vides, seuls leurs NOMBRES restent ;
 *   - la graine du hasard (`hasard`) ne sort jamais : la connaître, c'est
 *     prédire toutes les pioches suivantes ;
 *   - le profil d'IA (`ia`) et la puissance du sorcier disparaissent (ils
 *     n'ont aucun sens entre deux joueurs) ;
 *   - le camp `sorcier` est retourné, donc `vue.joueur` est TOUJOURS « moi ».
 */
export function rpgPvpVue(duel, cote = 'joueur') {
  if (!duel) return null;
  const vue = typeof structuredClone === 'function'
    ? structuredClone(duel)
    : JSON.parse(JSON.stringify(duel));
  delete vue.hasard;
  if (cote === 'sorcier') retournerPartie(vue);
  // Après retournement, l'adversaire est TOUJOURS `vue.sorcier` : c'est le
  // seul camp dont la main et la pioche doivent disparaître.
  vue.sorcier = cacherCamp(vue.sorcier);
  vue.joueur = { ...vue.joueur, mainCount: vue.joueur.main.length, deckCount: vue.joueur.deck.length };
  // Le journal et le fil de combat sont publics : ce qui y figure a été joué.
  vue.siege = cote;
  vue.adversaire = rpgPvpAutreCote(cote);
  return vue;
}

/* ------------------------------------------------------------------ */
/* Application d'une intention (côté serveur)                          */
/* ------------------------------------------------------------------ */

/** Remet l'objet en place sans changer son identité (le hasard y est accroché). */
function restaurerEtat(duel, instantane) {
  const propre = JSON.parse(instantane);
  for (const cle of Object.keys(duel)) {
    if (!(cle in propre)) delete duel[cle];
  }
  Object.assign(duel, propre);
}

/** Une fonction du moteur rend `{ ok }`, `true`, ou l'état lui-même. */
function refus(resultat) {
  if (resultat === false) return { ok: false, raison: 'refusee' };
  if (resultat && typeof resultat === 'object' && 'ok' in resultat && !resultat.ok) {
    return { ok: false, raison: resultat.raison ?? 'refusee' };
  }
  return null;
}

function executerIntention(duel, cote, intention) {
  switch (intention.type) {
    case 'mulligan': {
      if (!rpgPeutMulligan(duel, cote)) return { ok: false, raison: 'mulligan-fait' };
      // Le hasard du duel (s'il est branché) : deux rejoueurs retrouvent ainsi
      // exactement le même mélange des cartes écartées.
      rpgMulligan(duel, cote, Array.isArray(intention.index) ? intention.index : [], rpgPvpRng(duel) ?? undefined);
      return { ok: true };
    }
    case 'choix-mana':
      return rpgChoisirCouleurMana(duel, cote, intention.couleur) ?? { ok: true };
    case 'jouer-carte': {
      const carte = cardById(intention.carteId);
      if (!carte) return { ok: false, raison: 'carte-inconnue' };
      if (!duel[cote].main.includes(intention.carteId)) return { ok: false, raison: 'pas-en-main' };
      if (carte.kind === 'creature') return rpgJouerCreature(duel, cote, intention.carteId, intention.cibleId ?? null);
      if (carte.kind === 'arme') return rpgJouerArme(duel, cote, intention.carteId, intention.cibleId ?? null);
      if (carte.kind === 'magie') return rpgLancerMagie(duel, cote, intention.carteId, intention.cibleId ?? null);
      return { ok: false, raison: 'carte-injouable' };
    }
    case 'activer': {
      const entite = duel[cote]?.creatures?.find((candidat) => candidat.id === intention.entiteId);
      if (!entite) return { ok: false, raison: 'entite-inconnue' };
      if (entite.armeId) return rpgActiverArme(duel, cote, intention.entiteId, intention.options ?? {});
      return rpgActiverCapacite(duel, cote, intention.entiteId, intention.cibleId ?? null) ?? { ok: true };
    }
    case 'attaquer':
      // v1 : le défenseur ne choisit pas encore ses bloqueurs (le moteur les
      // assigne) ; l'échange « déclaration / blocage » viendra avec la file
      // d'attente, voir docs/rpg/17-pvp-multijoueur.md §5.
      return rpgLancerAttaque(
        duel,
        cote,
        Array.isArray(intention.attaquants) ? intention.attaquants : [],
        intention.blocages ?? null,
        intention.repartitions ?? null,
        intention.attaquantsBloques ?? null,
        intention.ciblesAttaque ?? null,
      );
    case 'fin-de-tour': {
      if (duel.tour !== cote) return { ok: false, raison: 'pas-votre-tour' };
      const avant = duel.tour;
      rpgFinDeTour(duel);
      // Le moteur refuse silencieusement (destruction en attente, choix de mana)
      // en laissant le tour au même camp : on le dit au client.
      if (duel.tour === avant) return { ok: false, raison: 'tour-non-close' };
      return { ok: true };
    }
    case 'conceder':
      // Idempotent : un client qui rejoue son abandon après reconnexion ne
      // renverse pas le vainqueur déjà enregistré.
      if (!duel.fin?.gagnant) duel.fin = { gagnant: rpgPvpAutreCote(cote), raison: 'abandon' };
      return { ok: true };
    default:
      return { ok: false, raison: 'intention-inconnue' };
  }
}

/**
 * Rejoue l'intention de `cote` sur l'état de référence du serveur.
 *
 * **Atomique** : toute exception ou tout refus laisse `duel` exactement dans
 * l'état d'avant (l'objet garde son identité, donc son générateur de hasard).
 * Rend `{ ok, raison, duel }` — `duel` est le même objet qu'à l'entrée.
 */
export function rpgPvpAppliquer(duel, cote, intention) {
  if (!intention || typeof intention !== 'object' || !intention.type) {
    return { ok: false, raison: 'intention-invalide', duel };
  }
  const droit = rpgPvpPeutAgir(duel, cote, intention);
  if (!droit.ok) return { ok: false, raison: droit.raison, duel };
  const instantane = JSON.stringify(duel);
  let resultat;
  try {
    resultat = executerIntention(duel, cote, intention);
  } catch (error) {
    restaurerEtat(duel, instantane);
    return { ok: false, raison: 'erreur', duel };
  }
  const echec = refus(resultat);
  if (echec) {
    restaurerEtat(duel, instantane);
    return { ok: false, raison: echec.raison, duel };
  }
  return { ok: true, raison: null, duel };
}

/* ------------------------------------------------------------------ */
/* Résultat, journal, horloge                                          */
/* ------------------------------------------------------------------ */

/**
 * Vainqueur éventuel : `{ gagnant: 'joueur' | 'sorcier' | null, nul, raison }`.
 * Un camp à 0 PV ou moins perd ; les deux en même temps, c'est un nul.
 */
export function rpgPvpResultat(duel) {
  if (!duel) return { gagnant: null, nul: false, raison: 'partie-inconnue' };
  if (duel.fin?.gagnant) return { gagnant: duel.fin.gagnant, nul: false, raison: duel.fin.raison ?? 'fin' };
  const joueurMort = (duel.joueur?.pv ?? 1) <= 0;
  const sorcierMort = (duel.sorcier?.pv ?? 1) <= 0;
  if (joueurMort && sorcierMort) return { gagnant: null, nul: true, raison: 'double-ko' };
  if (joueurMort) return { gagnant: 'sorcier', nul: false, raison: 'pv' };
  if (sorcierMort) return { gagnant: 'joueur', nul: false, raison: 'pv' };
  return { gagnant: null, nul: false, raison: null };
}

/**
 * Réécrit les entrées du journal du point de vue des NOMS des deux joueurs.
 * Le moteur écrit « Vous » / « Le sorcier » : vrai contre l'IA, illisible entre
 * deux joueurs, et faux pour celui qui reçoit la vue retournée. Comme une
 * action n'a qu'un acteur, on sait à qui « Vous » renvoie dans SES entrées.
 */
export function rpgPvpNommerLog(entrees, acteur, noms = {}) {
  const moi = String(noms[acteur] ?? (acteur === 'joueur' ? 'Vous' : 'Le sorcier'));
  const autre = String(noms[rpgPvpAutreCote(acteur)] ?? (acteur === 'joueur' ? 'Le sorcier' : 'Vous'));
  return (Array.isArray(entrees) ? entrees : []).map((entree) => String(entree)
    .replace(/\bVous\b/g, moi)
    .replace(/\bvous\b/g, moi)
    .replace(/Le sorcier/g, autre)
    .replace(/le sorcier/g, autre));
}

/**
 * Horloge d'un tour. `mode` vaut `'live'` ou `'async'`.
 * Rend `{ echeance, restant, expire, rappel }` — `expire` est ce que le
 * serveur vérifie avant d'accepter une action.
 */
export function rpgPvpHorloge(mode, dernierCoup, maintenant = Date.now()) {
  const depart = Number(dernierCoup) || 0;
  if (!depart) return { echeance: null, restant: null, expire: false, rappel: false };
  if (mode === 'async') {
    const echeance = depart + RPG_PVP_HORLOGES.abandonAsync;
    return {
      echeance,
      restant: Math.max(0, echeance - maintenant),
      expire: maintenant >= echeance,
      rappel: maintenant >= depart + RPG_PVP_HORLOGES.rappelAsync,
    };
  }
  const echeance = depart + RPG_PVP_HORLOGES.live;
  return { echeance, restant: Math.max(0, echeance - maintenant), expire: maintenant >= echeance, rappel: false };
}

/**
 * Accroche un hasard **rejouable** à un état chargé depuis la base.
 *
 * Le moteur garde son générateur dans une `WeakMap` : il ne survit pas à un
 * aller-retour JSON, donc chaque requête repartirait sur `Math.random`. On
 * branche ici un générateur semé dont l'ÉTAT est rangé dans le duel
 * (`duel.hasard = { graine, compteur }`), ce qui rend une partie auditable :
 * à partir de la même graine et du même journal d'actions, on retrouve la même
 * partie. `rpgPvpVue` supprime ce champ avant tout envoi.
 */
export function rpgPvpRng(duel) {
  return duel ? hasardParDuel.get(duel) ?? null : null;
}

/** Générateurs branchés par `rpgPvpBrancherHasard`, un par état de duel. */
const hasardParDuel = new WeakMap();

export function rpgPvpBrancherHasard(duel, graine = duel?.hasard?.graine ?? 1) {
  if (!duel) return duel;
  const depart = Number.isFinite(Number(graine)) ? Number(graine) >>> 0 : 1;
  let compteur = Number(duel.hasard?.compteur) || 0;
  duel.hasard = { graine: depart, compteur };
  // Tirage n° `compteur` = générateur amorcé par l'empreinte de (graine, n).
  // Chaque tirage est donc INDÉPENDANT de l'historique : recharger la partie
  // depuis la base reprend exactement la même suite, sans avoir à rejouer les
  // tirages précédents. C'est ce qui rend une partie auditable (même graine +
  // même journal d'actions = même partie, §9 de docs/rpg/17-pvp-multijoueur.md).
  const rng = () => {
    compteur += 1;
    duel.hasard.compteur = compteur;
    return rngSeme(graineNumerique(`${depart}:${compteur}`))();
  };
  hasardParDuel.set(duel, rng);
  return rpgReglerHasard(duel, rng);
}
