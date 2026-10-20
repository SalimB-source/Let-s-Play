/**
 * Les quêtes du jour du Sablier — trois objectifs, une journée, un Cachet.
 *
 * Le principe, décidé au dossier `13-souk-credits-quetes-boosters.md` :
 *
 * - **Trois quêtes par jour**, une par palier (facile, moyenne, difficile).
 *   Elles sont **tirées par graine** : `quetesDuJour(jour, graine)` rend le même
 *   tirage pour le même couple — deux appareils d'un même compte voient les
 *   mêmes quêtes, et vider le stockage ne relance pas le dé.
 * - **Le jour ne recule jamais.** `jourCourant` prend la date locale la plus
 *   récente entre l'horloge et le dernier jour connu : remonter l'horloge ne
 *   rend aucune quête supplémentaire.
 * - **On réclame, on ne reçoit pas en silence.** Une quête terminée attend son
 *   bouton ; les trois terminées ouvrent le **Cachet du cycle** (+80 ◈).
 * - **La progression est plafonnée** à l'objectif, et une quête réclamée ne
 *   progresse plus : le doublon d'un événement ne compte pas deux fois.
 *
 * Le seul événement qui exige une garde est l'ouverture d'un booster : elle
 * n'est tirée que si un rayon du Souk est ouvert (`rpgBoosters.js`). Les quêtes
 * de couleur, elles, sont toutes jouables dès le premier jour grâce aux decks
 * du catalogue (le Serment pour la Neige, la Marée pour l'Eau) — pas de garde.
 *
 * Le module est pur : les événements entrent, l'état sort. `tests/rpg-quetes.test.js`
 * couvre le tirage, la journée, la réclamation et la fusion.
 */

import { GAINS } from './rpgCredits.js';
import { rayonsOuverts } from './rpgBoosters.js';
import { rngSeme, graineNumerique, tirerParmi } from './rpgHasard.js';
import { ecrireProgression, lireProgression, stockageProgression } from '../lib/progressionScope.js';

/** L'état des quêtes de l'appareil. */
export const RPG_QUETES_STORAGE_KEY = 'letsplay_sablier_quetes_v1';

/** Sept jours d'affilée : le Cachet de la semaine. */
export const JOURS_DE_LA_SERIE = 7;

/** Les paliers, dans l'ordre du tirage : un seul tirage par palier et par jour. */
export const PALIERS = Object.freeze(['facile', 'moyenne', 'difficile']);

/**
 * Le pool des treize quêtes. `ecoute` dit quel événement du duel compte (voir le
 * contrat d'événements du dossier 13) ; `montant: true` fait progresser du
 * montant de l'événement au lieu d'un point par événement ; `garde` empêche le
 * tirage tant que la condition n'est pas remplie.
 */
export const QUETES = Object.freeze([
  // ── Faciles : la table, pas la victoire ────────────────────────────────────
  { id: 'creatures-10', palier: 'facile', titre: 'La ménagerie', texte: 'Invoquez 10 créatures.', objectif: 10, recompense: 60, ecoute: { type: 'creature-invoquee' } },
  { id: 'armes-3', palier: 'facile', titre: 'Le prix du passage', texte: 'Équipez 3 armes.', objectif: 3, recompense: 60, ecoute: { type: 'arme-jouee' } },
  { id: 'cartes-braise-8', palier: 'facile', titre: 'La Montagne au travail', texte: 'Jouez 8 cartes de Braise.', objectif: 8, recompense: 55, ecoute: { type: 'carte-jouee', couleur: 'braise' } },
  // ── Moyennes : la journée d'un duelliste ───────────────────────────────────
  { id: 'duels-2', palier: 'moyenne', titre: 'Deux duels', texte: 'Gagnez 2 duels.', objectif: 2, recompense: 70, ecoute: { type: 'duel-gagne' } },
  { id: 'magies-6', palier: 'moyenne', titre: 'Le grand jeu', texte: 'Lancez 6 magies.', objectif: 6, recompense: 65, ecoute: { type: 'magie-lancee' } },
  { id: 'cartes-sable-8', palier: 'moyenne', titre: 'Le Désert au travail', texte: 'Jouez 8 cartes de Sable.', objectif: 8, recompense: 65, ecoute: { type: 'carte-jouee', couleur: 'sable' } },
  { id: 'cartes-eau-8', palier: 'moyenne', titre: 'La Marée au travail', texte: 'Jouez 8 cartes d’Eau.', objectif: 8, recompense: 70, ecoute: { type: 'carte-jouee', couleur: 'eau' } },
  { id: 'cartes-neige-8', palier: 'moyenne', titre: 'Le Serment au travail', texte: 'Jouez 8 cartes de Neige.', objectif: 8, recompense: 65, ecoute: { type: 'carte-jouee', couleur: 'neige' } },
  // ── Difficiles : l'étage, la victoire, la boutique ─────────────────────────
  { id: 'duels-3', palier: 'difficile', titre: 'Trois duels', texte: 'Gagnez 3 duels.', objectif: 3, recompense: 100, ecoute: { type: 'duel-gagne' } },
  { id: 'etage-1', palier: 'difficile', titre: 'Le palier suivant', texte: 'Déblayez 1 nouvel étage.', objectif: 1, recompense: 80, ecoute: { type: 'etage-deblaye' } },
  { id: 'degats-40', palier: 'difficile', titre: 'Le sorcier saigne', texte: 'Infligez 40 dégâts au sorcier.', objectif: 40, recompense: 75, ecoute: { type: 'degats-infliges', montant: true } },
  { id: 'booster-1', palier: 'difficile', titre: 'Ouvrir le comptoir', texte: 'Ouvrez 1 booster au Souk.', objectif: 1, recompense: 60, ecoute: { type: 'booster-ouvert' }, garde: 'rayon-ouvert' },
]);

const QUETE_PAR_ID = new Map(QUETES.map((quete) => [quete.id, quete]));

/** Durée de vie d'une fournée de quêtes — 24 heures. Au-delà, les non-terminées sont retirées. */
export const QUETE_DUREE_MS = 24 * 60 * 60 * 1000;

/** L'état d'un joueur qui n'a encore rien vu. */
export function etatQuetesVide() {
  return {
    version: 1, jour: null, quetes: [], progres: {}, reclamations: [],
    cachet: false, semaine: false, serie: 0, majLe: null, debutLe: null,
  };
}

/** La quête par son identifiant (`null` si inconnue). */
export function queteParId(queteId) {
  return QUETE_PAR_ID.get(queteId) ?? null;
}

/**
 * La date locale d'une horloge, en `AAAA-MM-JJ`. On travaille sur les
 * composantes locales (et non sur l'ISO UTC) pour que « aujourd'hui » soit le
 * jour du joueur, pas celui de Greenwich.
 */
export function cleJour(horloge = Date.now()) {
  const date = new Date(horloge);
  if (Number.isNaN(date.getTime())) return null;
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mois}-${jour}`;
}

/** Le jour courant, jamais antérieur au dernier jour connu (le temps ne recule pas). */
export function jourCourant(horloge = Date.now(), dernierJour = null) {
  const aujourdhui = cleJour(horloge);
  if (!aujourdhui) return dernierJour ?? null;
  if (typeof dernierJour === 'string' && dernierJour > aujourdhui) return dernierJour;
  return aujourdhui;
}

/** La veille d'une clé de jour (`null` si la clé est illisible). */
export function jourPrecedent(cle) {
  const [annee, mois, jour] = String(cle ?? '').split('-').map(Number);
  if (!annee || !mois || !jour) return null;
  const date = new Date(annee, mois - 1, jour);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() - 1);
  return cleJour(date.getTime());
}

/** Secondes avant minuit — le « cycle se referme dans … » de l'écran. */
export function secondesAvantMinuit(horloge = Date.now()) {
  const date = new Date(horloge);
  if (Number.isNaN(date.getTime())) return 0;
  const minuit = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
  return Math.max(0, Math.round((minuit - date.getTime()) / 1000));
}

/** Horodatage du début de la fournée en cours (ms), ou `null` si aucune fournée. */
export function horodatageDebut(etat) {
  const base = normaliserEtatQuetes(etat);
  if (base.debutLe) {
    const t = Date.parse(base.debutLe);
    if (Number.isFinite(t)) return t;
  }
  // Anciens états sans `debutLe` : la fournée commence à minuit local de son jour.
  if (base.jour) {
    const [annee, mois, jour] = base.jour.split('-').map(Number);
    const minuit = new Date(annee, mois - 1, jour).getTime();
    if (Number.isFinite(minuit)) return minuit;
  }
  return null;
}

/** La fournée est-elle expirée (24 h dépassées) ? */
export function estJourneeExpiree(etat, horloge = Date.now()) {
  const debut = horodatageDebut(etat);
  if (debut == null) return false;
  return horloge - debut >= QUETE_DUREE_MS;
}

/** Millisecondes restantes avant l'expiration (0 si déjà expirée ou sans fournée). */
export function tempsRestantMs(etat, horloge = Date.now()) {
  const debut = horodatageDebut(etat);
  if (debut == null) return 0;
  return Math.max(0, debut + QUETE_DUREE_MS - horloge);
}

/** Secondes avant l'expiration des quêtes non terminées. */
export function secondesAvantExpiration(etat, horloge = Date.now()) {
  return Math.max(0, Math.round(tempsRestantMs(etat, horloge) / 1000));
}

/** Les quêtes non terminées et expirées — celles qui seront retirées. */
export function quetesExpirees(etat, horloge = Date.now()) {
  if (!estJourneeExpiree(etat, horloge)) return [];
  const base = normaliserEtatQuetes(etat);
  return base.quetes.filter((id) => {
    if (base.reclamations.includes(id)) return false;
    const quete = QUETE_PAR_ID.get(id);
    if (!quete) return false;
    const progres = base.progres[id] ?? 0;
    return progres < quete.objectif;
  });
}

/** Retire les quêtes non terminées expirées (après 24 h). */
export function purgerQuetesExpirees(etat, horloge = Date.now()) {
  const base = normaliserEtatQuetes(etat);
  const expirees = quetesExpirees(base, horloge);
  if (!expirees.length) return base;
  const aRetirer = new Set(expirees);
  const quetes = base.quetes.filter((id) => !aRetirer.has(id));
  const progres = { ...base.progres };
  for (const id of expirees) delete progres[id];
  const reclamations = base.reclamations.filter((id) => !aRetirer.has(id));
  return {
    ...base,
    quetes,
    progres,
    reclamations,
    majLe: new Date(horloge).toISOString(),
  };
}

/** Le pool jouable aujourd'hui : la seule garde est celle du Souk. */
export function quetesDisponibles(progression = null) {
  const soukOuvert = rayonsOuverts(progression).length > 0;
  return QUETES.filter((quete) => quete.garde !== 'rayon-ouvert' || soukOuvert);
}

/**
 * Le tirage du jour : une quête par palier, toujours la même pour un même
 * couple (jour, graine). Une graine absente (hors compte) vaut `'sans-compte'` :
 * le joueur hors ligne a ses quêtes, elles ne le suivront simplement pas.
 */
export function quetesDuJour(jour, graine = null, progression = null) {
  const rng = rngSeme(graineNumerique(`sablier-quetes:${jour}:${graine ?? 'sans-compte'}`));
  const pool = quetesDisponibles(progression);
  const tirage = [];
  for (const palier of PALIERS) {
    const quete = tirerParmi(pool.filter((candidat) => candidat.palier === palier && !tirage.includes(candidat.id)), rng);
    if (quete) tirage.push(quete.id);
  }
  return tirage;
}

/** Réduit une valeur quelconque à un état de quêtes valable. */
export function normaliserEtatQuetes(value) {
  const brut = value && typeof value === 'object' ? value : {};
  const jour = typeof brut.jour === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(brut.jour) ? brut.jour : null;
  const quetes = (Array.isArray(brut.quetes) ? brut.quetes : []).filter((id) => QUETE_PAR_ID.has(id)).filter((id, index, liste) => liste.indexOf(id) === index);
  const progres = {};
  const brutProgres = brut.progres && typeof brut.progres === 'object' ? brut.progres : {};
  for (const id of quetes) {
    const quete = QUETE_PAR_ID.get(id);
    const valeur = Math.floor(Number(brutProgres[id]));
    progres[id] = Number.isFinite(valeur) ? Math.min(quete.objectif, Math.max(0, valeur)) : 0;
  }
  const reclamations = (Array.isArray(brut.reclamations) ? brut.reclamations : [])
    .filter((id) => quetes.includes(id))
    .filter((id, index, liste) => liste.indexOf(id) === index);
  const serie = Math.max(0, Math.floor(Number(brut.serie)) || 0);
  const majLe = typeof brut.majLe === 'string' ? brut.majLe : null;
  const brutDebut = typeof brut.debutLe === 'string' ? brut.debutLe : null;
  const debutLe = brutDebut && !Number.isNaN(Date.parse(brutDebut)) ? brutDebut : null;
  return {
    version: 1,
    jour,
    quetes,
    progres,
    reclamations,
    cachet: Boolean(brut.cachet),
    semaine: Boolean(brut.semaine),
    serie,
    majLe,
    debutLe,
  };
}

/**
 * Ouvre la journée : même jour, rien ne bouge ; jour nouveau, les trois quêtes
 * sont tirées, la progression remise à zéro et la série prolongée (ou repartie
 * à un). Un jour **antérieur** au jour connu est ignoré : le temps ne recule
 * pas, même si l'horloge de l'appareil recule.
 *
 * Après 24 h (`QUETE_DUREE_MS`), les quêtes non terminées sont retirées : une
 * fournée expirée force une nouvelle journée même si la clé calendaire n'a pas
 * changé.
 *
 * Rend `{ etat, nouveau, quetes }` — `nouveau` permet à l'écran de féliciter
 * (ou non) le joueur pour sa nouvelle journée.
 */
export function ouvrirJournee({ etat, jour, graine = null, progression = null, horloge = Date.now() } = {}) {
  const base = normaliserEtatQuetes(etat);
  const cle = typeof jour === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(jour) ? jour : cleJour(horloge);
  if (!cle || cle === base.jour || (base.jour && cle < base.jour)) {
    // Même journée (ou horloge reculée) : seules les quêtes non terminées
    // échues après 24 h sont retirées ; les terminées restent à réclamer.
    const retirees = quetesExpirees(base, horloge);
    if (!retirees.length) return { etat: base, nouveau: false, quetes: base.quetes, retirees: [] };
    const purge = purgerQuetesExpirees(base, horloge);
    return { etat: purge, nouveau: false, quetes: purge.quetes, retirees };
  }
  // Nouvelle journée calendaire : tirage frais, progression à zéro, série suivie.
  const quetes = quetesDuJour(cle, graine, progression);
  const suite = base.jour && jourPrecedent(cle) === base.jour;
  const maintenantIso = new Date(horloge).toISOString();
  const maj = {
    version: 1,
    jour: cle,
    quetes,
    progres: Object.fromEntries(quetes.map((id) => [id, 0])),
    reclamations: [],
    cachet: false,
    // Le Cachet de la semaine se reprend à chaque journée : c'est `serie` qui
    // dit si elle est due, et elle ne recule jamais (D6).
    semaine: false,
    serie: suite ? base.serie + 1 : 1,
    majLe: maintenantIso,
    debutLe: maintenantIso,
  };
  return { etat: maj, nouveau: true, quetes, retirees: [] };
}

/** L'increment qu'un événement vaut pour une quête (0 : l'événement ne la concerne pas). */
function increment(quete, evenement) {
  const ecoute = quete.ecoute ?? {};
  if (!evenement || evenement.type !== ecoute.type) return 0;
  if (ecoute.couleur && !(Array.isArray(evenement.couleurs) ? evenement.couleurs : []).includes(ecoute.couleur)) return 0;
  if (ecoute.montant) {
    const montant = Math.floor(Number(evenement.montant));
    return Number.isFinite(montant) && montant > 0 ? montant : 0;
  }
  return 1;
}

/**
 * Fait progresser les quêtes du jour à partir d'un événement du duel
 * (`{ type, couleurs?, montant?, etageId?, mode? }`). Un événement inconnu, une
 * quête déjà réclamée, expirée ou un objectif atteint ne changent rien — et
 * l'état d'origine est rendu **tel quel** quand rien ne bouge, comme partout
 * ailleurs.
 */
export function progresserQuete(etat, evenement, horloge = Date.now()) {
  const base = normaliserEtatQuetes(etat);
  // Une quete non terminée expirée ne progresse plus.
  const expirees = new Set(quetesExpirees(base, horloge));
  // Un état qui ne bouge pas rend l'objet d'origine : l'événement d'un duel
  // (une carte posée, un point de dégât) ne doit pas faire re-rendre l'écran
  // du Souk — la stabilité référentielle est une règle de la maison.
  const inchange = () => (etat && typeof etat === 'object' ? etat : base);
  if (!base.quetes.length) return inchange();
  const progres = { ...base.progres };
  let change = false;
  for (const id of base.quetes) {
    if (expirees.has(id)) continue;
    const quete = QUETE_PAR_ID.get(id);
    if (!quete || base.reclamations.includes(id)) continue;
    const avant = progres[id] ?? 0;
    if (avant >= quete.objectif) continue;
    const gain = increment(quete, evenement);
    if (!gain) continue;
    progres[id] = Math.min(quete.objectif, avant + gain);
    change = true;
  }
  if (!change) return inchange();
  return { ...base, progres, majLe: new Date(horloge).toISOString() };
}

/** La quête est-elle terminée ? */
export function queteTerminee(etat, queteId) {
  const quete = QUETE_PAR_ID.get(queteId);
  if (!quete) return false;
  return (normaliserEtatQuetes(etat).progres[queteId] ?? 0) >= quete.objectif;
}

/** Une quete est-elle expirée (24 h dépassées sans être terminée) ? */
export function estQueteExpiree(etat, queteId, horloge = Date.now()) {
  return quetesExpirees(etat, horloge).includes(queteId);
}

/**
 * Une quête du jour telle qu'un écran la raconte : son objectif, où en est le
 * joueur, si c'est terminé, si c'est déjà encaissé ou expiré.
 *
 * C'est **la** vue partagée : l'écran du Souk et le panneau de l'onglet Jouer la
 * lisent tous les deux, donc ils ne peuvent pas se contredire — même barre, même
 * état, même montant. Les compteurs sont bornés ici (une progression au-delà de
 * l'objectif, négative ou illisible vaut ce que valent les règles), et
 * `etat` porte le mot que les deux écrans affichent : `encours`, `terminee`,
 * `reclamee`, `expiree`.
 */
export function vueDeLaQuete(etat, queteId, horloge = Date.now()) {
  const quete = QUETE_PAR_ID.get(queteId);
  if (!quete) return null;
  const base = normaliserEtatQuetes(etat);
  const progres = Math.min(quete.objectif, Math.max(0, Math.floor(Number(base.progres[queteId]) || 0)));
  const reclamee = base.reclamations.includes(queteId);
  const terminee = progres >= quete.objectif;
  const expiree = !reclamee && !terminee && quetesExpirees(base, horloge).includes(queteId);
  return {
    quete,
    progres,
    reste: quete.objectif - progres,
    pourcent: Math.round((progres / quete.objectif) * 100),
    reclamee,
    terminee,
    expiree,
    etat: reclamee ? 'reclamee' : terminee ? 'terminee' : expiree ? 'expiree' : 'encours',
  };
}

/** Les quêtes terminées et non réclamées — ce que compte la pastille du menu. */
export function quetesAReclamer(etat, horloge = Date.now()) {
  const base = normaliserEtatQuetes(etat);
  return base.quetes.filter((id) => !base.reclamations.includes(id) && queteTerminee(base, id) && !estQueteExpiree(base, id, horloge));
}

/** Le Cachet du cycle attend-il ? (les trois quêtes terminées, Cachet non pris) */
export function cachetDisponible(etat, horloge = Date.now()) {
  const base = normaliserEtatQuetes(etat);
  if (base.cachet || !base.quetes.length) return false;
  // Si une quete a expiré sans être terminée, le cycle ne s'ouvrira jamais.
  if (quetesExpirees(base, horloge).length) return false;
  return base.quetes.every((id) => base.reclamations.includes(id));
}

/** Sept jours d'affilée : la série est pleine (et jamais deux fois la même). */
export function serieComplete(etat) {
  const base = normaliserEtatQuetes(etat);
  return base.serie > 0 && base.serie % JOURS_DE_LA_SERIE === 0;
}

/** Le Cachet de la semaine attend-il ? (sept jours d'affilée, non réclamé) */
export function cachetDeLaSemaineDisponible(etat) {
  const base = normaliserEtatQuetes(etat);
  return !base.semaine && serieComplete(base);
}

/** Combien de jours il reste à tenir pour le prochain Cachet de la semaine. */
export function joursAvantLeCachetDeLaSemaine(etat) {
  const base = normaliserEtatQuetes(etat);
  return JOURS_DE_LA_SERIE - (base.serie % JOURS_DE_LA_SERIE);
}

/**
 * Les sept étapes de la série, telles qu'un écran les pose : une petite carte
 * par jour, la dernière portant le Cachet.
 *
 * `atteint` dit que la série a déjà passé ce jour ; `aujourdhui` marque celui
 * où le joueur se tient. La semaine se referme au septième jour et la suivante
 * repart au premier — même arithmétique que `serieComplete`, lue une seule
 * fois, ici : l'écran n'a pas à refaire la division.
 *
 * Une série vide ne pose aucun cachet (jour 1 compris) ; une série de sept,
 * qu'il soit réclamé ou non, a les sept cachets de la semaine.
 */
export function etapesDeLaSerie(etat) {
  const base = normaliserEtatQuetes(etat);
  const parcourus = base.serie > 0 ? ((base.serie - 1) % JOURS_DE_LA_SERIE) + 1 : 0;
  return Array.from({ length: JOURS_DE_LA_SERIE }, (_, index) => ({
    jour: index + 1,
    atteint: index < parcourus,
    aujourdhui: index === parcourus - 1,
  }));
}

/**
 * Réclame le Cachet de la semaine : sept jours d'affilée, une fois. Le
 * compteur de série, lui, ne bouge pas — c'est le jour suivant qui l'allonge.
 */
export function reclamerCachetDeLaSemaine({ etat, serie = null } = {}) {
  const base = normaliserEtatQuetes(etat);
  const serieVisee = Number.isFinite(Number(serie)) && Number(serie) > 0 ? Math.floor(Number(serie)) : base.serie;
  if (base.semaine) return { ok: false, raison: 'deja-reclame', etat: base, credits: 0 };
  if (!serieComplete({ ...base, serie: serieVisee, semaine: false })) {
    return { ok: false, raison: 'serie-incomplete', etat: base, credits: 0, serie: serieVisee };
  }
  // La série visée peut être en avance sur l'état (le garde de jour l'a lue
  // avant sa sauvegarde) : on l'écrit en même temps que la réclamation.
  return {
    ok: true,
    raison: null,
    etat: { ...base, semaine: true, serie: Math.max(base.serie, serieVisee), majLe: new Date().toISOString() },
    credits: GAINS.cachetDeLaSemaine,
  };
}

/**
 * Réclame une quête : elle doit exister, être terminée, non expirée et ne pas
 * avoir déjà été payée. Rend `{ ok, raison, etat, credits }` — les crédits ne
 * sont **pas** encaissés ici, c'est le portefeuille (`rpgCredits.js`) qui les
 * porte.
 */
export function reclamerQuete(etat, queteId, horloge = Date.now()) {
  const base = normaliserEtatQuetes(etat);
  const quete = QUETE_PAR_ID.get(queteId);
  if (!quete || !base.quetes.includes(queteId)) return { ok: false, raison: 'quete-inconnue', etat: base, credits: 0 };
  if (base.reclamations.includes(queteId)) return { ok: false, raison: 'deja-reclamee', etat: base, credits: 0 };
  if (estQueteExpiree(base, queteId, horloge)) return { ok: false, raison: 'expiree', etat: base, credits: 0 };
  if ((base.progres[queteId] ?? 0) < quete.objectif) {
    return { ok: false, raison: 'objectif-incomplet', etat: base, credits: 0, progres: base.progres[queteId] ?? 0, objectif: quete.objectif };
  }
  return {
    ok: true,
    raison: null,
    etat: { ...base, reclamations: [...base.reclamations, queteId], majLe: new Date(horloge).toISOString() },
    credits: quete.recompense,
  };
}

/** Réclame le Cachet du cycle, une seule fois par journée, les trois quêtes payées. */
export function reclamerCachetDuCycle(etat) {
  const base = normaliserEtatQuetes(etat);
  if (base.cachet) return { ok: false, raison: 'deja-reclame', etat: base, credits: 0 };
  if (!cachetDisponible(base)) return { ok: false, raison: 'cycle-incomplet', etat: base, credits: 0 };
  return {
    ok: true,
    raison: null,
    etat: { ...base, cachet: true, majLe: new Date().toISOString() },
    credits: GAINS.cachetDuCycle,
  };
}

/**
 * Fusion de l'appareil et du compte : le jour le plus récent gagne, la
 * progression d'une même journée prend le maximum quête par quête, les
 * réclamations s'unissent (on ne paie jamais deux fois), la série prend le
 * maximum. `modifie` dit si le compte apportait quelque chose.
 */
export function fusionnerQuetes(local, distant) {
  const ici = normaliserEtatQuetes(local);
  const la = normaliserEtatQuetes(distant);
  const jour = (ici.jour ?? '') >= (la.jour ?? '') ? ici.jour : la.jour;
  const plusRecent = jour === la.jour && jour !== ici.jour ? la : ici;
  const memeJour = Boolean(jour) && ici.jour === la.jour;
  const quetes = memeJour ? [...new Set([...ici.quetes, ...la.quetes])] : plusRecent.quetes;
  const progres = {};
  for (const id of quetes) {
    progres[id] = memeJour ? Math.max(ici.progres[id] ?? 0, la.progres[id] ?? 0) : (plusRecent.progres[id] ?? 0);
  }
  const reclamations = quetes.filter((id) => (memeJour
    ? ici.reclamations.includes(id) || la.reclamations.includes(id)
    : plusRecent.reclamations.includes(id)));
  const debutLe = (() => {
    const a = ici.debutLe ? Date.parse(ici.debutLe) : 0;
    const b = la.debutLe ? Date.parse(la.debutLe) : 0;
    if (!a && !b) return plusRecent.debutLe ?? null;
    if (!a) return la.debutLe;
    if (!b) return ici.debutLe;
    return a >= b ? ici.debutLe : la.debutLe;
  })();
  const fusion = {
    version: 1,
    jour,
    quetes,
    progres,
    reclamations,
    cachet: memeJour ? ici.cachet || la.cachet : plusRecent.cachet,
    semaine: memeJour ? ici.semaine || la.semaine : plusRecent.semaine,
    serie: Math.max(ici.serie, la.serie),
    majLe: (ici.majLe ?? '') >= (la.majLe ?? '') ? ici.majLe : la.majLe,
    debutLe,
  };
  const modifie = JSON.stringify(fusion) !== JSON.stringify(ici);
  return { etat: fusion, modifie };
}

function browserStorage() {
  return stockageProgression();
}

/** L'état des quêtes de l'appareil (vide si le stockage manque ou ment). */
export function chargerEtatQuetes() {
  const stockage = browserStorage();
  if (!stockage) return etatQuetesVide();
  try {
    return normaliserEtatQuetes(JSON.parse(lireProgression(RPG_QUETES_STORAGE_KEY, stockage) ?? 'null'));
  } catch {
    return etatQuetesVide();
  }
}

/** Écrit l'état des quêtes. Rend `true` si l'écriture a eu lieu. */
export function sauverEtatQuetes(etat) {
  const stockage = browserStorage();
  if (!stockage) return false;
  return ecrireProgression(RPG_QUETES_STORAGE_KEY, JSON.stringify(normaliserEtatQuetes(etat)), stockage);
}

/**
 * La graine du joueur, créée une fois pour l'appareil. Le compte connecté passe
 * son identifiant ; hors ligne, cette graine locale fait que les quêtes du jour
 * ne changent pas d'une visite à l'autre.
 */
export const RPG_GRAINE_STORAGE_KEY = 'letsplay_sablier_graine_v1';

/**
 * Graine du tirage quotidien.
 *
 * Un compte connecté passe son identifiant : la graine en dérive, donc le
 * même joueur retrouve **les mêmes quêtes du jour** sur son PC, son téléphone
 * et le navigateur — sans rien stocker ni synchroniser. Un visiteur garde la
 * graine de l'appareil, créée une fois.
 */
export function chargerGraine(compteId = null) {
  const compte = typeof compteId === 'string' ? compteId.trim() : '';
  if (compte) return `compte-${compte}`;
  const stockage = browserStorage();
  if (!stockage) return 'sans-compte';
  try {
    const existante = lireProgression(RPG_GRAINE_STORAGE_KEY, stockage);
    if (existante) return existante;
    const graine = `appareil-${Math.floor(Math.random() * 1e9).toString(36)}`;
    ecrireProgression(RPG_GRAINE_STORAGE_KEY, graine, stockage);
    return graine;
  } catch {
    return 'sans-compte';
  }
}
