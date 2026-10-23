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
 * | `carte-jouee` | l'union des quatre précédents, portée avec ses `couleurs` — et **le seul geste qui verse l'XP continu** (2 XP, `rpgProfil.js`) |
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
 * **L'XP suit exactement la même discipline.** `carte-jouee` est le seul geste
 * continu à verser de l'XP — `creature-invoquee`, `magie-lancee` et
 * `arme-jouee` tombent **avec** lui à chaque carte, les faire payer tous
 * compterait chaque carte deux fois. Et l'XP de la tour terminée ne suit que si
 * le butin, lui, a vraiment été versé : c'est la garde `toursPayees` qui décide,
 * donc une tour rejouée ne remonte pas la barre deux fois.
 *
 * Un événement **inconnu est ignoré en silence** — le récit d'un geste que le
 * Souk ne comprend pas ne casse rien —, et un événement qui ne fait bouger ni le
 * solde ni une quête rend l'état d'origine **tel quel**.
 */

import { cardById, cardColors } from './rpgCards.js';
import { crediterCredits, creditsDeVictoire, reclamerButinTour } from './rpgCredits.js';
import { cachetDeLaSemaineDisponible, cachetDisponible, progresserQuete, quetesAReclamer } from './rpgQuetes.js';
import { XP, gagnerXp } from './rpgProfil.js';

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

/** Les événements qui font monter la barre d'XP. Les autres ne comptent que pour les quêtes. */
export const EVENEMENTS_XP = Object.freeze(['duel-gagne', 'carte-jouee', 'booster-ouvert']);

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
 * Ce qu'un événement verse à la barre d'XP (`rpgProfil.js`). Le butin de la
 * tour **n'est pas** compris : il ne suit que si le portefeuille a vraiment
 * payé le butin, et c'est `appliquerEvenementDuel` qui l'ajoute — la garde
 * d'unicité décide, pas le point d'appel.
 */
export function xpDeLEvenement(evenement) {
  const normalise = normaliserEvenementDuel(evenement);
  if (!normalise || !EVENEMENTS_XP.includes(normalise.type)) return 0;
  if (normalise.type === 'carte-jouee') return XP.carteJouee;
  if (normalise.type === 'booster-ouvert') return XP.boosterOuvert;
  return xpDeVictoire({ mode: normalise.mode, premiere: normalise.premiere === true });
}

/** La victoire, en XP : le premier déblayage paie le récit, la reprise paie le duel. */
export function xpDeVictoire({ mode = 'libre', premiere = false } = {}) {
  if (mode === 'histoire' || mode === 'tours') {
    return premiere ? XP.etagePremiere : XP.etageRejoue;
  }
  return mode === 'libre' ? XP.duelLibre : 0;
}

/**
 * Pourquoi la barre a bougé — le motif gardé au journal des paliers. Il se lit
 * en clair sur la carte de profil (« un étage déblayé »), jamais comme un
 * identifiant.
 */
export function motifDeLEvenement(evenement) {
  const normalise = normaliserEvenementDuel(evenement);
  if (!normalise) return 'autre';
  if (normalise.type === 'carte-jouee') return 'carte';
  if (normalise.type === 'booster-ouvert') return 'booster';
  if (normalise.type === 'duel-gagne') {
    if (normalise.mode === 'libre') return 'duel-libre';
    return normalise.tourComplete ? 'tour' : 'etage';
  }
  return 'autre';
}

/**
 * Les compteurs du profil que l'événement fait avancer (`null` : aucun). Le
 * profil ne retient que ce que personne d'autre ne compte — les ouvertures de
 * paquets vivent déjà dans le portefeuille, les quêtes dans leur état.
 */
export function statsDeLEvenement(evenement) {
  const normalise = normaliserEvenementDuel(evenement);
  if (!normalise) return null;
  if (normalise.type === 'carte-jouee') return { cartesJouees: 1 };
  if (normalise.type !== 'duel-gagne') return null;
  if (normalise.mode === 'histoire' || normalise.mode === 'tours') {
    return normalise.premiere ? { duelsGagnes: 1, etagesPremiers: 1 } : { duelsGagnes: 1, etagesRejoues: 1 };
  }
  return normalise.mode === 'libre' ? { duelsGagnes: 1 } : null;
}

/**
 * Applique un événement à l'économie du joueur : `{ bourse, quetes, profil }`
 * entre, `{ bourse, quetes, profil, gain, butin, xp, niveaux, evenement,
 * reconnu }` sort.
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
 *     événement sans effet ne fait pas re-rendre l'écran du Souk ;
 *   - le **profil** (`rpgProfil.js`) monte de la même façon : l'XP du geste,
 *     plus celui du butin de la tour quand il a vraiment été versé. `niveaux`
 *     dit combien de paliers viennent de sonner — c'est ce chiffre qui déclenche
 *     le paquet offert, et il est rendu **sans ouvrir de booster** : ce module
 *     ne connaît ni le comptoir, ni le hasard, ni React.
 */
export function appliquerEvenementDuel({ bourse = null, quetes = null, profil = null } = {}, evenement = null) {
  const normalise = normaliserEvenementDuel(evenement);
  if (!normalise) {
    return { bourse, quetes, profil, gain: 0, butin: 0, xp: 0, niveaux: 0, evenement: null, reconnu: false };
  }
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

  // L'XP du geste, plus celui de la tour **seulement si** le butin a été versé :
  // la même garde d'unicité (`toursPayees`) décide des deux, donc une tour
  // rejouée ne remonte ni le solde ni la barre.
  let xp = xpDeLEvenement(normalise);
  let stats = statsDeLEvenement(normalise);
  if (butin) {
    xp += XP.tourTerminee;
    // Le compteur suit le butin : une tour **payée** est une tour terminée, et
    // une tour déjà payée ne remonte pas plus la carte de profil que le solde.
    stats = { ...(stats ?? {}), toursTerminees: (stats?.toursTerminees ?? 0) + 1 };
  }
  const palier = xp || stats ? gagnerXp(profil, xp, { motif: motifDeLEvenement(normalise), stats }) : null;
  const profilMaj = palier ? palier.profil : profil;

  return {
    bourse: encaisse.portefeuille,
    quetes: quetesMaj,
    profil: profilMaj,
    gain: encaisse.gain,
    butin,
    xp: palier ? palier.xpGagne : 0,
    niveaux: palier ? palier.niveauxGagnes : 0,
    evenement: normalise,
    reconnu: true,
  };
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
