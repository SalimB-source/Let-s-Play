/**
 * Les crédits du Sablier — le portefeuille du Souk.
 *
 * Une seule monnaie pour ce chantier : **les crédits (◈)**. Ils viennent du jeu
 * (quêtes du jour, victoires d'étage, parties libres), se dépensent au Souk
 * (boosters) et se remboursent en doublons. Le module est écrit comme un
 * portefeuille à plusieurs devises — `{ credits, sable }` un jour — mais **seuls
 * les crédits sont ouverts** : le sable du dossier `04-progression-da.md`
 * (place sur la Liste, forge, rachat de Nom) mérite son propre chantier.
 *
 * Trois invariants, ceux de la maison :
 *
 * 1. **Tout est tolérant** : stockage absent (mode privé, iframe), JSON
 *    corrompu, valeurs d'un autre catalogue — on retombe sur un portefeuille
 *    vide plutôt que de casser un écran.
 * 2. **Rien ne se perd** : `fusionnerPortefeuilles` prend l'union des cartes et
 *    le **maximum** du solde, jamais la valeur d'un appareil au hasard. Un
 *    joueur qui dépense hors ligne peut voir ses crédits revenir au premier
 *    échange avec son compte ; l'inverse — un solde qui disparaît — est refusé.
 * 3. **Aucun barème n'est caché** : les gains, les prix et le remboursement des
 *    doublons sont des constantes exportées, affichées par le Souk et vérifiées
 *    par `tests/rpg-credits.test.js`.
 */

import { cardById, cardRarityInfo } from './rpgCards.js';
import { rayonParId } from './rpgBoosters.js';
import { normaliserCollection } from './rpgCollection.js';

/** Le portefeuille de l'appareil : solde, cartes du Souk, compteurs d'ouverture. */
export const RPG_BOURSE_STORAGE_KEY = 'letsplay_sablier_bourse_v1';

/** Ce que rend une carte déjà possédée, par rareté (une mythique vaut presque un paquet). */
export const BAREME_DOUBLON = Object.freeze({
  commune: 12,
  inhabituelle: 20,
  rare: 45,
  mythique: 120,
});

/**
 * Le journal des ouvertures : les dernières, la plus récente en tête. Vingt
 * entrées suffisent à se rappeler ce qu'on a sorti — et tiennent en quelques
 * kilo-octets dans le `jsonb` du compte, sans table ni migration.
 */
export const JOURNAL_MAX = 20;

/** Les gains du jeu, une bonne fois pour toutes. */
export const GAINS = Object.freeze({
  /** Premier déblayage d'un étage : la récompense du récit. */
  etagePremiere: 50,
  /** Étage déjà déblayé, regagné : le jeu paie le duel, pas le farm. */
  etageRejoue: 10,
  /** Partie libre gagnée, sans étage : de quoi entretenir la boucle. */
  duelLibre: 8,
  /** Le Cachet du cycle : les trois quêtes du jour terminées. */
  cachetDuCycle: 80,
  /** Le Cachet de la semaine : sept jours d'affilée. Même montant, même geste. */
  cachetDeLaSemaine: 80,
});

/** Le portefeuille d'un joueur neuf. */
export function portefeuilleVide() {
  return { version: 1, credits: 0, cartes: [], ouvertures: 0, pitie: 0, journal: [], majLe: null };
}

/** Entier positif ou nul, quelle que soit l'entrée (chaîne, `NaN`, négatif). */
function entierPositif(valeur) {
  const nombre = Math.floor(Number(valeur));
  return Number.isFinite(nombre) && nombre > 0 ? nombre : 0;
}

/**
 * Réduit n'importe quelle valeur à un portefeuille valable : solde entier,
 * cartes connues sans doublon, compteurs positifs. Une valeur illisible rend un
 * portefeuille vide — jamais `null`, jamais une exception.
 */
export function normaliserPortefeuille(value) {
  const brut = value && typeof value === 'object' ? value : {};
  return {
    version: 1,
    credits: entierPositif(brut.credits),
    cartes: normaliserCollection(brut.cartes),
    ouvertures: entierPositif(brut.ouvertures),
    pitie: entierPositif(brut.pitie),
    journal: normaliserJournal(brut.journal),
    majLe: typeof brut.majLe === 'string' ? brut.majLe : null,
  };
}

/**
 * Réduit le journal à ce qu'il peut porter : une date lisible, un rayon connu,
 * des cartes du catalogue, et jamais plus de `JOURNAL_MAX` entrées. Une entrée
 * illisible est jetée sans bruit — le journal n'est pas une source de vérité,
 * seulement une mémoire.
 */
export function normaliserJournal(value) {
  const brut = Array.isArray(value) ? value : [];
  const propres = [];
  for (const entree of brut) {
    if (!entree || typeof entree !== 'object') continue;
    if (typeof entree.le !== 'string') continue;
    if (!rayonParId(entree.rayonId)) continue;
    const cartes = normaliserCollection(entree.cartes);
    if (!cartes.length) continue;
    propres.push({
      le: entree.le,
      rayonId: entree.rayonId,
      cartes,
      mythique: Boolean(entree.mythique),
      remboursement: entierPositif(entree.remboursement),
      coffret: Boolean(entree.coffret),
    });
  }
  // La même ouverture peut arriver des deux appareils (l'appareil pousse au
  // compte, le compte redescend) : on la reconnaît à son horodatage, son rayon
  // et ses cartes, et on ne la garde qu'une fois. Un coffret écrit dix entrées
  // dans la même milliseconde : elles n'ont pas les mêmes cartes, donc elles
  // restent toutes.
  const vues = new Set();
  const uniques = [];
  for (const entree of propres) {
    const cle = `${entree.le}|${entree.rayonId}|${entree.cartes.join(',')}`;
    if (vues.has(cle)) continue;
    vues.add(cle);
    uniques.push(entree);
  }
  // La plus récente en tête : l'écran n'a pas à trier.
  uniques.sort((a, b) => (a.le < b.le ? 1 : a.le > b.le ? -1 : 0));
  return uniques.slice(0, JOURNAL_MAX);
}

/** Encore une ouverture au journal, la plus récente en tête, la mémoire bornée. */
export function noterOuvertureJournal(portefeuille, { rayonId, cartes, mythique = false, remboursement = 0, coffret = false, horloge = null } = {}) {
  const base = normaliserPortefeuille(portefeuille);
  if (!rayonParId(rayonId)) return base;
  const lot = normaliserCollection(cartes);
  if (!lot.length) return base;
  const le = typeof horloge === 'string' ? horloge : new Date().toISOString();
  return {
    ...base,
    journal: normaliserJournal([
      { le, rayonId, cartes: lot, mythique: Boolean(mythique), remboursement: entierPositif(remboursement), coffret: Boolean(coffret) },
      ...base.journal,
    ]),
  };
}

/**
 * Ce que vaut une victoire. `premiere` ne vaut que pour un étage (Histoire ou
 * Tours) : c'est le premier déblayage qui paie, la reprise paie le duel.
 * Une défaite — ou un mode inconnu — ne rend rien.
 */
export function creditsDeVictoire({ mode = 'libre', premiere = false } = {}) {
  if (mode === 'histoire' || mode === 'tours') {
    return premiere ? GAINS.etagePremiere : GAINS.etageRejoue;
  }
  return mode === 'libre' ? GAINS.duelLibre : 0;
}

/** Le remboursement d'une liste de doublons (identifiants inconnus : 0). */
export function creditsDeDoublons(cardIds) {
  let total = 0;
  for (const id of (Array.isArray(cardIds) ? cardIds : [])) {
    const carte = cardById(id);
    if (!carte) continue;
    total += BAREME_DOUBLON[cardRarityInfo(carte).key] ?? 0;
  }
  return total;
}

/** Encaisse un montant (déjà calculé par l'appelant). Rend le portefeuille et le gain. */
export function crediterCredits(portefeuille, montant) {
  const base = normaliserPortefeuille(portefeuille);
  const gain = entierPositif(montant);
  if (!gain) return { portefeuille: base, gain: 0 };
  return {
    portefeuille: { ...base, credits: base.credits + gain, majLe: new Date().toISOString() },
    gain,
  };
}

/**
 * Dépense un montant. Rend `{ ok, portefeuille, raison }` : `'solde-insuffisant'`
 * quand il manque des crédits, `'montant-invalide'` pour un prix nul ou négatif.
 * Un refus rend le portefeuille normalisé, jamais amputé.
 */
export function depenserCredits(portefeuille, montant) {
  const base = normaliserPortefeuille(portefeuille);
  const prix = entierPositif(montant);
  if (!prix) return { ok: false, raison: 'montant-invalide', portefeuille: base };
  if (base.credits < prix) return { ok: false, raison: 'solde-insuffisant', portefeuille: base };
  return {
    ok: true,
    raison: null,
    portefeuille: { ...base, credits: base.credits - prix, majLe: new Date().toISOString() },
  };
}

/** Range des cartes gagnées au Souk dans le portefeuille (union, sans doublon). */
export function ajouterCartesAuPortefeuille(portefeuille, cardIds) {
  const base = normaliserPortefeuille(portefeuille);
  const cartes = normaliserCollection([...base.cartes, ...(Array.isArray(cardIds) ? cardIds : [])]);
  if (cartes.length === base.cartes.length) return base;
  return { ...base, cartes, majLe: new Date().toISOString() };
}

/**
 * Enregistre une ouverture : le compteur d'ouvertures monte toujours, la pitié
 * avec — sauf sur un rayon qui n'a **aucune mythique au vivier** : la promesse
 * des huit paquets ne compte que là où une mythique est possible. Une mythique
 * sortie remet la pitié à zéro.
 */
export function enregistrerOuverture(portefeuille, {
  mythique = false, aDesMythiques = true, rayonId = null, cartes = null, remboursement = 0, coffret = false,
} = {}) {
  const base = normaliserPortefeuille(portefeuille);
  const compte = {
    ...base,
    ouvertures: base.ouvertures + 1,
    pitie: mythique ? 0 : (aDesMythiques ? base.pitie + 1 : base.pitie),
    majLe: new Date().toISOString(),
  };
  // Le journal ne suit que si l'appelant dit ce qui est sorti : les compteurs,
  // eux, avancent toujours.
  return rayonId && cartes
    ? noterOuvertureJournal(compte, { rayonId, cartes, mythique, remboursement, coffret })
    : compte;
}

/**
 * Combien de paquets avant la mythique assurée (`0` : le prochain en contient
 * une, la pitié a atteint son seuil). `null` quand le rayon n'a aucune mythique
 * à donner — la promesse ne s'affiche alors pas.
 */
export function paquetsAvantMythique(portefeuille, { aDesMythiques = true, seuil = 8 } = {}) {
  if (!aDesMythiques) return null;
  const base = normaliserPortefeuille(portefeuille);
  const borne = entierPositif(seuil) || 1;
  return Math.max(0, borne - 1 - base.pitie);
}

/**
 * Fusion de l'appareil et du compte : cartes en union, solde et compteurs au
 * maximum, pitié la plus avancée. `modifie` dit si le compte apportait quelque
 * chose à l'appareil (c'est ce que le hook pousse ensuite au serveur).
 */
export function fusionnerPortefeuilles(local, distant) {
  const ici = normaliserPortefeuille(local);
  const la = normaliserPortefeuille(distant);
  const fusion = {
    version: 1,
    credits: Math.max(ici.credits, la.credits),
    cartes: normaliserCollection([...ici.cartes, ...la.cartes]),
    ouvertures: Math.max(ici.ouvertures, la.ouvertures),
    pitie: Math.max(ici.pitie, la.pitie),
    // Les deux journaux, du plus récent au plus ancien : `normaliserJournal`
    // trie et borne, donc deux appareils ne peuvent pas faire enfler la mémoire.
    journal: normaliserJournal([...ici.journal, ...la.journal]),
    majLe: (ici.majLe ?? '') >= (la.majLe ?? '') ? ici.majLe : la.majLe,
  };
  const modifie = JSON.stringify(fusion) !== JSON.stringify(ici);
  return { portefeuille: fusion, modifie };
}

function browserStorage() {
  try {
    return globalThis.window?.localStorage || globalThis.localStorage || null;
  } catch {
    return null;
  }
}

/** Le portefeuille de l'appareil (vide si le stockage manque ou ment). */
export function chargerPortefeuille() {
  const stockage = browserStorage();
  if (!stockage) return portefeuilleVide();
  try {
    return normaliserPortefeuille(JSON.parse(stockage.getItem(RPG_BOURSE_STORAGE_KEY) ?? 'null'));
  } catch {
    return portefeuilleVide();
  }
}

/** Écrit le portefeuille de l'appareil. Rend `true` si l'écriture a eu lieu. */
export function sauverPortefeuille(portefeuille) {
  const stockage = browserStorage();
  if (!stockage) return false;
  try {
    stockage.setItem(RPG_BOURSE_STORAGE_KEY, JSON.stringify(normaliserPortefeuille(portefeuille)));
    return true;
  } catch {
    return false;
  }
}
