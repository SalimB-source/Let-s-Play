/**
 * Le contrat d'événements du duel — ce que les gestes racontent au Souk.
 *
 * Le duel ne connaît ni les crédits ni les quêtes : il **raconte** ce qui vient
 * de se passer (« une créature est entrée », « le sorcier a pris 3 », « l'étage
 * est tombé ») et ce module en tire les conséquences. Toute la règle vit ici,
 * pure et sans React : `RpgDuelPage.jsx` appelle `noterEvenementDuel`, le hook
 * (`useSablierBourse.js`) range le résultat, et les tests vérifient la règle
 * sans monter un seul composant.
 *
 * Un événement est `{ type, ... }`. Les champs **dérivables** le sont ici, pas
 * au point d'appel : une carte jouée s'annonce `{ type: 'carte-jouee', cardId }`
 * et c'est ce module qui lit la carte pour en tirer ses couleurs. Un seul
 * endroit connaît le catalogue, donc un seul endroit peut se tromper.
 *
 * ## Ce que chaque événement rapporte
 *
 * | Événement | Ce qu'il fait |
 * | --- | --- |
 * | `duel-gagne` | **le seul qui paie** : 50 ◈ au premier déblayage d'un étage, 10 ◈ pour un étage rejoué, 8 ◈ pour un duel libre — et, quand la victoire trouve la tour complète (`tourComplete`), le **butin de la tour** (+200 ◈) tombe par-dessus, une seule fois par tour |
 * | `etage-deblaye` | ne paie rien (le duel a déjà payé) : sert à la quête du palier suivant |
 * | `creature-invoquee`, `magie-lancee`, `arme-jouee` | ne paient rien : font avancer les quêtes du jour |
 * | `carte-jouee` | l'union des quatre précédents, portée avec ses `couleurs` |
 * | `degats-infliges` | ne paie rien : fait avancer « le sorcier saigne » du **montant** |
 * | `booster-ouvert` | ne paie rien ici : le prix et le remboursement des doublons appartiennent à `rpgBoosters.js` |
 *
 * Que le paiement tienne à **un seul** événement est une règle, pas un détail
 * d'implémentation : `duel-gagne` et `etage-deblaye` tombent au même instant, et
 * les faire payer tous les deux doublerait chaque victoire. Le butin de la tour
 * suit la même règle : il voyage **avec** `duel-gagne` (`tourComplete`), jamais
 * dans un événement à part, et sa garde d'unicité vit dans le portefeuille
 * (`toursPayees`, `rpgCredits.js`) — pas au point d'appel.
 *
 * Un événement **inconnu est ignoré en silence** — le récit d'un geste que le
 * Souk ne comprend pas ne casse rien —, et un événement qui ne fait bouger ni le
 * solde ni une quête rend l'état d'origine **tel quel**.
 */

import { cardById, cardColors } from './rpgCards.js';
import { crediterCredits, creditsDeVictoire, reclamerButinTour } from './rpgCredits.js';
import { cachetDeLaSemaineDisponible, cachetDisponible, progresserQuete, quetesAReclamer } from './rpgQuetes.js';

/** Les types d'événements du contrat — la liste que les tests tiennent à jour. */
export const EVENEMENTS_DUEL = Object.freeze([
  'duel-gagne',
  'etage-deblaye',
  'creature-invoquee',
  'magie-lancee',
  'arme-jouee',
  'carte-jouee',
  'degats-infliges',
  'booster-ouvert',
]);

/** Les événements qui paient des crédits. Tous les autres ne font que compter. */
export const EVENEMENTS_PAYANTS = Object.freeze(['duel-gagne']);

const TYPES = new Set(EVENEMENTS_DUEL);

/** Un entier positif ou nul, quelle que soit l'entrée. */
function entierPositif(valeur) {
  const nombre = Math.floor(Number(valeur));
  return Number.isFinite(nombre) && nombre > 0 ? nombre : 0;
}

/**
 * Réduit n'importe quelle valeur à un événement du contrat, ou rend `null` :
 * type inconnu, valeur illisible, type absent. Les champs de carte (`couleurs`,
 * `kind`) sont **lus dans le catalogue** à partir de `cardId`, jamais pris pour
 * argent comptant chez l'appelant — une carte inconnue les laisse simplement
 * absents.
 */
export function normaliserEvenementDuel(evenement) {
  const brut = evenement && typeof evenement === 'object' ? evenement : null;
  if (!brut || !TYPES.has(brut.type)) return null;
  const normalise = { type: brut.type };
  const carte = typeof brut.cardId === 'string' ? cardById(brut.cardId) : null;
  if (carte) {
    normalise.cardId = carte.id;
    normalise.kind = carte.kind;
    normalise.couleurs = cardColors(carte);
  }
  if (typeof brut.etageId === 'string') normalise.etageId = brut.etageId;
  if (typeof brut.tourId === 'string') normalise.tourId = brut.tourId;
  if (typeof brut.rayonId === 'string') normalise.rayonId = brut.rayonId;
  if (typeof brut.mode === 'string') normalise.mode = brut.mode;
  if (brut.premiere === true) normalise.premiere = true;
  // `tourComplete` se raconte comme `premiere` : c'est le point d'appel qui a
  // la progression sous les yeux — la victoire vient-elle de déblayer le
  // dernier étage de la tour ? Le module, lui, garde l'unicité du butin.
  if (brut.tourComplete === true) normalise.tourComplete = true;
  // Seul « degats-infliges » porte un montant ; ailleurs, le champ n'existe pas
  // — un `montant` glissé dans un autre événement ne compte jamais.
  if (brut.type === 'degats-infliges') normalise.montant = entierPositif(brut.montant);
  return normalise;
}

/**
 * Ce qu'un événement paie. `duel-gagne` est le seul à sortir un montant ; tous
 * les autres rendent zéro, y compris `etage-deblaye` (le duel a déjà payé).
 */
export function creditsDeLEvenement(evenement) {
  const normalise = normaliserEvenementDuel(evenement);
  if (!normalise || !EVENEMENTS_PAYANTS.includes(normalise.type)) return 0;
  return creditsDeVictoire({ mode: normalise.mode, premiere: normalise.premiere });
}

/**
 * Applique un événement à l'économie du joueur : `{ bourse, quetes }` entre,
 * `{ bourse, quetes, gain, butin, evenement, reconnu }` sort.
 *
 *   - le **solde** ne bouge que si l'événement paie (`creditsDeLEvenement`) ;
 *   - le **butin de la tour** suit `duel-gagne` : une victoire qui raconte
 *     `tourComplete` sur une tour du mode Histoire paie `GAINS.tourTerminee`
 *     par-dessus le gain de l'étage — une seule fois par tour, la garde
 *     (`toursPayees`) vit dans le portefeuille, donc deux onglets ou deux
 *     appareils ne paient pas deux fois. `butin` isole ce montant pour que
 *     l'écran puisse l'annoncer à part ;
 *   - les **quêtes du jour** avancent selon `progresserQuete`, qui sait déjà
 *     ignorer ce qui ne le concerne pas et rendre l'objet d'origine quand rien
 *     ne bouge : la stabilité référentielle tient de bout en bout, et un
 *     événement sans effet ne fait pas re-rendre l'écran du Souk.
 */
export function appliquerEvenementDuel({ bourse = null, quetes = null } = {}, evenement = null) {
  const normalise = normaliserEvenementDuel(evenement);
  if (!normalise) return { bourse, quetes, gain: 0, butin: 0, evenement: null, reconnu: false };
  const montant = creditsDeLEvenement(normalise);
  // Un événement qui ne paie pas rend le **portefeuille d'origine**, pas sa
  // copie normalisée : l'appelant peut donc comparer les références pour savoir
  // si quelque chose a bougé, plutôt que de recopier l'état à chaque carte posée.
  let encaisse = montant ? crediterCredits(bourse, montant) : { portefeuille: bourse, gain: 0 };
  let butin = 0;
  if (normalise.type === 'duel-gagne' && normalise.tourComplete
    && (normalise.mode === 'histoire' || normalise.mode === 'tours')) {
    const reclamation = reclamerButinTour(encaisse.portefeuille, normalise.tourId);
    // Un butin refusé (tour déjà payée, identifiant inconnu) ne remplace pas
    // le portefeuille : la référence d'origine continue de dire « rien n'a bougé ».
    if (reclamation.ok) {
      encaisse = { portefeuille: reclamation.portefeuille, gain: encaisse.gain + reclamation.gain };
      butin = reclamation.gain;
    }
  }
  const quetesMaj = progresserQuete(quetes, normalise);
  return { bourse: encaisse.portefeuille, quetes: quetesMaj, gain: encaisse.gain, butin, evenement: normalise, reconnu: true };
}

/**
 * Ce que l'onglet du Souk doit signaler : les quêtes terminées qu'on n'a pas
 * encore réclamées, plus le Cachet du cycle quand il attend. Zéro : rien à
 * faire, pas de pastille. C'est le seul chiffre que la pastille affiche.
 */
export function compterReclamations(quetes) {
  return quetesAReclamer(quetes).length
    + (cachetDisponible(quetes) ? 1 : 0)
    + (cachetDeLaSemaineDisponible(quetes) ? 1 : 0);
}
