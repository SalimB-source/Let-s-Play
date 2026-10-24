/**
 * Les crédits du Sablier — le portefeuille du Souk.
 *
 * Une seule monnaie pour ce chantier : **les crédits (◈)**. Ils viennent du jeu
 * (quêtes du jour, victoires d'étage, butins de tour, parties libres), se
 * dépensent au Souk (boosters) et se remboursent en doublons. Le module est
 * écrit comme un portefeuille à plusieurs devises — `{ credits, sable }` un
 * jour — mais **seuls les crédits sont ouverts** : le sable du dossier `04-progression-da.md`
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

import { RARETES_A_LETAL, cardById, cardCopyLimit, cardRarityInfo } from './rpgCards.js';
import { rayonParId } from './rpgBoosters.js';
import { lireExemplaire, normaliserCollection } from './rpgCollection.js';
import { tourHistoireParId } from './rpgStoryTours.js';
import { ecrireProgression, lireProgression, stockageProgression } from '../lib/progressionScope.js';

/**
 * Les crédits s'écrivent avec une espace fine insécable tous les trois chiffres :
 * « 1 240 ◈ » se lit, « 1240 ◈ » se déchiffre. Vit ici, avec les règles, parce
 * que trois écrans l'affichent (le Souk, la cérémonie, l'onglet) et qu'aucun ne
 * doit réinventer le format.
 */
export function creditsLisible(montant) {
  const nombre = Math.max(0, Math.floor(Number(montant) || 0));
  return String(nombre).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}

/** Le portefeuille de l'appareil : solde, cartes du Souk, compteurs d'ouverture. */
export const RPG_BOURSE_STORAGE_KEY = 'letsplay_sablier_bourse_v1';

/**
 * Ce que rend une carte déjà possédée, par rareté. Un doublon **adoucit** la
 * perte, il ne la paie jamais : même le pire paquet — trois inhabituelles, la
 * rare garantie et la mythique, tous des doublons — rend 112 ◈ pour 140 ◈. On
 * ne farme pas le comptoir en rachetant des paquets quand la collection est pleine.
 */
export const BAREME_DOUBLON = Object.freeze({
  commune: 6,
  inhabituelle: 10,
  rare: 22,
  mythique: 60,
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
  /** Le butin de la tour : tous ses étages déblayés. Plus gros que n'importe
   *  quel étage — c'est le sommet qui paie — mais versé **une fois par tour** :
   *  `toursPayees` le retient, comme `tutoriels` retient les leçons payées. */
  tourTerminee: 200,
  /** Partie libre gagnée, sans étage : de quoi entretenir la boucle. */
  duelLibre: 8,
  /** Le Cachet du cycle : les trois quêtes du jour terminées. */
  cachetDuCycle: 80,
  /** Le Cachet de la semaine : sept jours d'affilée. Même montant, même geste. */
  cachetDeLaSemaine: 80,
});

/** Le portefeuille d'un joueur neuf. `tutoriels` retient les leçons dont la
 *  récompense a déjà été encaissée : une leçon se rejoue, mais ne se paie
 *  qu'une fois. `toursPayees` retient de même les tours dont le butin a déjà
 *  été versé : les étages se rejouent, le butin ne tombe qu'une fois.
 *  `exemplaires` compte les copies achetées à l'unité à l'étal du Souk — voir
 *  `normaliserExemplaires`. */
export function portefeuilleVide() {
  return { version: 1, credits: 0, cartes: [], ouvertures: 0, pitie: 0, journal: [], tutoriels: [], toursPayees: [], exemplaires: {}, etal: etalVide(), majLe: null };
}

/** Entier positif ou nul, quelle que soit l'entrée (chaîne, `NaN`, négatif). */
function entierPositif(valeur) {
  const nombre = Math.floor(Number(valeur));
  return Number.isFinite(nombre) && nombre > 0 ? nombre : 0;
}

/** L'étal de cartes à l'unité avant sa première ouverture. */
export function etalVide() {
  return { jour: null, cartes: [], achetees: [], rafraichissements: 0, majLe: null };
}

/**
 * Le **stock d'exemplaires** achetés à l'unité : `{ id: nombre }`, où `nombre`
 * est le nombre **total** de copies acquises, borné par le quota de rareté
 * (`cardCopyLimit`). Le champ n'est pas une seconde collection : `cartes`
 * répond à « est-ce que je la possède ? » (donc « est-ce que je peux la jouer
 * au deck ? »), `exemplaires` répond à « combien de copies ai-je payées ? ».
 *
 * Quatre règles rendent la lecture sûre :
 *
 * - **une carte possédée sans entrée explicite compte pour un exemplaire** :
 *   c'est ce que valaient toutes les sauvegardes avant l'étal, aucune ne peut
 *   donc maigrir ;
 * - **un exemplaire unique n'est pas écrit** : la valeur implicite est `1`, ce
 *   qui rend la normalisation idempotente et le `jsonb` du compte minuscule ;
 * - **le quota borne le stock** : une mythique — unique dans un deck — ne peut
 *   jamais compter deux copies ;
 * - **le stock ne déborde pas de la possession** : une entrée qui ne
 *   correspond à aucune carte du portefeuille est jetée, un compteur ne peut
 *   donc pas faire exister une carte.
 */
export function normaliserExemplaires(value, cartes = []) {
  const possedees = new Set(normaliserCollection(cartes));
  const brut = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const comptes = {};
  for (const [id, nombre] of Object.entries(brut)) {
    if (!possedees.has(id)) continue;
    const carte = cardById(id);
    const limite = carte ? cardCopyLimit(carte) : null;
    // Aucun quota pour les terrains (`Infinity`) : ils ne se vendent pas à
    // l'unité et n'ont donc pas de stock à compter.
    if (!carte || !Number.isFinite(limite)) continue;
    // Le quota borne d'abord, l'implicite ensuite : cinq copies d'une mythique
    // ramenées à une ne s'écrivent pas, `1` étant déjà la valeur par défaut.
    const copies = Math.min(entierPositif(nombre), limite);
    if (copies <= 1) continue;
    comptes[id] = copies;
  }
  return comptes;
}

/** Le stock d'exemplaires d'un portefeuille, normalisé sur ses propres cartes. */
export function exemplairesDuPortefeuille(portefeuille) {
  const base = normaliserPortefeuille(portefeuille);
  return normaliserExemplaires(base.exemplaires, base.cartes);
}

/**
 * Ajoute **une** copie d'une carte au portefeuille : l'union sur `cartes` (la
 * possession) et le compteur d'`exemplaires` (le stock) se font ensemble, pour
 * qu'un achat à l'unité ne puisse jamais débiter une copie sans la ranger.
 *
 * Le quota de rareté borne le stock : `ajoute: false` quand il est atteint, et
 * le portefeuille rendu est alors **identique** — un geste rejoué ne crée ni
 * copie ni dépense de plus. La première copie n'est pas écrite (`1` est la
 * valeur implicite) ; la seconde, si.
 */
export function ajouterExemplaireAuPortefeuille(portefeuille, cardId, { possedee = null } = {}) {
  const base = normaliserPortefeuille(portefeuille);
  const carte = cardById(cardId);
  const limite = cardCopyLimit(carte);
  if (!carte || !Number.isFinite(limite)) return { portefeuille: base, ajoute: false, total: 0 };
  // La possession s'apprécie sur la collection du joueur quand l'appelant la
  // connaît (une carte héritée des Tours n'est pas dans `base.cartes`, qui ne
  // porte que les cartes du Souk) ; sinon sur le portefeuille lui-même.
  const possedeeAvant = possedee === null ? base.cartes.includes(cardId) : Boolean(possedee);
  const comptes = normaliserExemplaires(base.exemplaires, base.cartes);
  const avant = lireExemplaire(comptes, cardId, possedeeAvant);
  const total = Math.min(avant + 1, limite);
  if (total === avant) return { portefeuille: base, ajoute: false, total: avant };
  const cartes = normaliserCollection([...base.cartes, cardId]);
  return {
    portefeuille: {
      ...base,
      cartes,
      exemplaires: normaliserExemplaires({ ...comptes, [cardId]: total }, cartes),
      majLe: new Date().toISOString(),
    },
    ajoute: true,
    total,
  };
}

/**
 * Fusion des stocks entre deux appareils : le **maximum** copie par copie,
 * jamais la somme (deux appareils qui achètent le même exemplaire ne créent pas
 * deux exemplaires) ni la valeur du plus récent.
 */
export function fusionnerExemplaires(local, distant, cartes = []) {
  const ici = normaliserExemplaires(local, cartes);
  const la = normaliserExemplaires(distant, cartes);
  const fusion = { ...ici };
  for (const [id, nombre] of Object.entries(la)) {
    fusion[id] = Math.max(fusion[id] ?? 0, nombre);
  }
  return normaliserExemplaires(fusion, cartes);
}

/** Identifiants vendables à l'unité, sans doublon et avec une mémoire bornée. */
function idsCartesDirectes(value, limite) {
  return normaliserCollection(value).filter((id) => {
    const carte = cardById(id);
    return carte && carte.kind !== 'terrain' && RARETES_A_LETAL.includes(cardRarityInfo(carte).key);
  }).slice(0, limite);
}

/**
 * Normalise l'étal quotidien transporté par le portefeuille. Les achats des
 * deux tirages du jour restent mémorisés (cinq + cinq au maximum), tandis que
 * les offres courantes ne dépassent jamais cinq cartes.
 */
export function normaliserEtal(value) {
  const brut = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const jour = typeof brut.jour === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(brut.jour) ? brut.jour : null;
  const majLe = typeof brut.majLe === 'string' && Number.isFinite(Date.parse(brut.majLe)) ? brut.majLe : null;
  return {
    jour,
    cartes: idsCartesDirectes(brut.cartes, 5),
    achetees: idsCartesDirectes(brut.achetees, 10),
    rafraichissements: Math.min(1, entierPositif(brut.rafraichissements)),
    majLe,
  };
}

/**
 * Fusion compte/appareil de l'étal : le jour le plus récent gagne ; à jour
 * égal, le tirage rafraîchi remplace le tirage initial et les achats s'unissent.
 * Un vieil appareil ne peut donc ni rendre un rafraîchissement ni rouvrir hier.
 */
export function fusionnerEtals(local, distant) {
  const ici = normaliserEtal(local);
  const la = normaliserEtal(distant);
  if (ici.jour !== la.jour) return (ici.jour ?? '') >= (la.jour ?? '') ? ici : la;
  const source = ici.rafraichissements === la.rafraichissements
    ? ((ici.majLe ?? '') >= (la.majLe ?? '') ? ici : la)
    : (ici.rafraichissements > la.rafraichissements ? ici : la);
  return {
    ...source,
    achetees: idsCartesDirectes([...ici.achetees, ...la.achetees], 10),
    rafraichissements: Math.max(ici.rafraichissements, la.rafraichissements),
  };
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
    tutoriels: normaliserTutoriels(brut.tutoriels),
    toursPayees: normaliserToursPayees(brut.toursPayees),
    exemplaires: normaliserExemplaires(brut.exemplaires, normaliserCollection(brut.cartes)),
    etal: normaliserEtal(brut.etal),
    majLe: typeof brut.majLe === 'string' ? brut.majLe : null,
  };
}

/**
 * Les identifiants de leçons déjà payées : des chaînes non vides, sans
 * doublon. La mémoire reste petite et tolérante aux anciennes sauvegardes
 * (qui n'avaient pas le champ).
 */
export function normaliserTutoriels(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim()))]
    .slice(0, 40);
}

/**
 * Les identifiants de tours dont le butin a déjà été versé : des chaînes non
 * vides **connues du catalogue des tours**, sans doublon. Même mémoire petite
 * et tolérante que les leçons — les anciennes sauvegardes n'avaient pas le
 * champ, une tour retirée du catalogue un jour ne bloque rien.
 */
export function normaliserToursPayees(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .filter((id) => typeof id === 'string' && id.trim())
      .map((id) => id.trim())
      .filter((id) => tourHistoireParId(id)),
  )].slice(0, 40);
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
      // Un paquet offert par un palier (`rpgProfil.js`) : le journal le dit,
      // pour que le joueur reconnaisse ce qu'il n'a pas payé.
      offert: Boolean(entree.offert),
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
export function noterOuvertureJournal(portefeuille, { rayonId, cartes, mythique = false, remboursement = 0, coffret = false, offert = false, horloge = null } = {}) {
  const base = normaliserPortefeuille(portefeuille);
  if (!rayonParId(rayonId)) return base;
  const lot = normaliserCollection(cartes);
  if (!lot.length) return base;
  const le = typeof horloge === 'string' ? horloge : new Date().toISOString();
  return {
    ...base,
    journal: normaliserJournal([
      { le, rayonId, cartes: lot, mythique: Boolean(mythique), remboursement: entierPositif(remboursement), coffret: Boolean(coffret), offert: Boolean(offert) },
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
 * Encaisse la récompense d'un tutoriel. Une leçon ne paie qu'une fois :
 * `tutoriels` porte les identifiants déjà réglés, et la fusion entre appareils
 * en fait l'union. Rend `{ ok, portefeuille, gain, raison }`.
 */
export function reclamerRecompenseTutoriel(portefeuille, tutorielId, montant) {
  const base = normaliserPortefeuille(portefeuille);
  const id = typeof tutorielId === 'string' ? tutorielId.trim() : '';
  if (!id) return { ok: false, raison: 'tutoriel-inconnu', portefeuille: base, gain: 0 };
  if (base.tutoriels.includes(id)) return { ok: false, raison: 'deja-reclame', portefeuille: base, gain: 0 };
  const paiement = crediterCredits(base, montant);
  if (!paiement.gain) return { ok: false, raison: 'montant-invalide', portefeuille: base, gain: 0 };
  return {
    ok: true,
    raison: null,
    gain: paiement.gain,
    portefeuille: { ...paiement.portefeuille, tutoriels: [...base.tutoriels, id] },
  };
}

/**
 * Encaisse le **butin d'une tour terminée** — tous ses étages déblayés. Une
 * tour ne paie qu'une fois : `toursPayees` porte les identifiants déjà réglés,
 * et la fusion entre appareils en fait l'union. Rend `{ ok, portefeuille, gain,
 * raison }` : `'tour-inconnue'` pour un identifiant hors catalogue,
 * `'deja-payee'` quand le butin est déjà en poche — un refus rend le
 * portefeuille normalisé, jamais crédité.
 */
export function reclamerButinTour(portefeuille, tourId, montant = GAINS.tourTerminee) {
  const base = normaliserPortefeuille(portefeuille);
  const id = typeof tourId === 'string' ? tourId.trim() : '';
  if (!id || !tourHistoireParId(id)) return { ok: false, raison: 'tour-inconnue', portefeuille: base, gain: 0 };
  if (base.toursPayees.includes(id)) return { ok: false, raison: 'deja-payee', portefeuille: base, gain: 0 };
  const paiement = crediterCredits(base, montant);
  if (!paiement.gain) return { ok: false, raison: 'montant-invalide', portefeuille: base, gain: 0 };
  return {
    ok: true,
    raison: null,
    gain: paiement.gain,
    portefeuille: { ...paiement.portefeuille, toursPayees: [...base.toursPayees, id] },
  };
}

/**
 * L'affiche des gains d'une tour — ce que le menu des Tours promet et ce que
 * le joueur a déjà en poche. Chaque étage porte son barème (le premier
 * déblayage paie, le rejeu paie moins), le sommet porte le butin, et les
 * totaux se lisent sans calcul d'écran :
 *
 * `{ tourId, etages: [{ id, premiere, rejoue, gagne }], butin, butinGagne,
 *    total, dejaGagne, reste, complete }`
 *
 * `etagesVaincus` vient de la progression Histoire (`rpgStory.js`),
 * `toursPayees` du portefeuille. Les deux sont tolérants : absents, ils disent
 * simplement « rien de gagné ». Une tour inconnue rend `null`.
 */
export function gainsDeTour(tourId, { etagesVaincus = null, toursPayees = null } = {}) {
  const tour = tourHistoireParId(tourId);
  if (!tour) return null;
  const vaincus = new Set(Array.isArray(etagesVaincus) ? etagesVaincus : []);
  const etages = tour.etages.map((etage) => ({
    id: etage.id,
    premiere: GAINS.etagePremiere,
    rejoue: GAINS.etageRejoue,
    gagne: vaincus.has(etage.id),
  }));
  const butin = GAINS.tourTerminee;
  const butinGagne = normaliserToursPayees(toursPayees).includes(tour.id);
  const dejaGagne = etages.filter((etage) => etage.gagne).length * GAINS.etagePremiere
    + (butinGagne ? butin : 0);
  const total = etages.length * GAINS.etagePremiere + butin;
  return {
    tourId: tour.id,
    etages,
    butin,
    butinGagne,
    total,
    dejaGagne,
    reste: Math.max(0, total - dejaGagne),
    complete: etages.length > 0 && etages.every((etage) => etage.gagne),
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
  mythique = false, aDesMythiques = true, rayonId = null, cartes = null, remboursement = 0, coffret = false, offert = false,
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
    ? noterOuvertureJournal(compte, { rayonId, cartes, mythique, remboursement, coffret, offert })
    : compte;
}

/**
 * Combien de paquets avant la mythique assurée (`0` : le prochain en contient
 * une, la pitié a atteint son seuil). `null` quand le comptoir n'a aucune mythique
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
  const cartes = normaliserCollection([...ici.cartes, ...la.cartes]);
  const fusion = {
    version: 1,
    credits: Math.max(ici.credits, la.credits),
    cartes,
    ouvertures: Math.max(ici.ouvertures, la.ouvertures),
    pitie: Math.max(ici.pitie, la.pitie),
    // Les deux journaux, du plus récent au plus ancien : `normaliserJournal`
    // trie et borne, donc deux appareils ne peuvent pas faire enfler la mémoire.
    journal: normaliserJournal([...ici.journal, ...la.journal]),
    tutoriels: normaliserTutoriels([...ici.tutoriels, ...la.tutoriels]),
    toursPayees: normaliserToursPayees([...ici.toursPayees, ...la.toursPayees]),
    // Le stock d'exemplaires se fusionne sur les cartes déjà réunies : un
    // appareil en retard ne peut pas faire redescendre une carte de 2 à 1.
    exemplaires: fusionnerExemplaires(ici.exemplaires, la.exemplaires, cartes),
    etal: fusionnerEtals(ici.etal, la.etal),
    majLe: (ici.majLe ?? '') >= (la.majLe ?? '') ? ici.majLe : la.majLe,
  };
  const modifie = JSON.stringify(fusion) !== JSON.stringify(ici);
  return { portefeuille: fusion, modifie };
}

function browserStorage() {
  return stockageProgression();
}

/** Le portefeuille de l'appareil (vide si le stockage manque ou ment). */
export function chargerPortefeuille() {
  const stockage = browserStorage();
  if (!stockage) return portefeuilleVide();
  try {
    return normaliserPortefeuille(JSON.parse(lireProgression(RPG_BOURSE_STORAGE_KEY, stockage) ?? 'null'));
  } catch {
    return portefeuilleVide();
  }
}

/** Écrit le portefeuille de l'appareil. Rend `true` si l'écriture a eu lieu. */
export function sauverPortefeuille(portefeuille) {
  const stockage = browserStorage();
  if (!stockage) return false;
  return ecrireProgression(
    RPG_BOURSE_STORAGE_KEY,
    JSON.stringify(normaliserPortefeuille(portefeuille)),
    stockage,
  );
}
