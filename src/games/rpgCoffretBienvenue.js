/**
 * Les **coffrets de bienvenue** — le premier choix d'un nouveau joueur.
 *
 * À la première connexion, le joueur ne reçoit plus la dotation entière du
 * catalogue : on lui présente **trois coffrets de couleurs différentes**, tirés
 * parmi les quatre couleurs historiques (Sable, Braise, Neige, Eau). Il en
 * ouvre **un seul**, et ce coffret devient sa collection de départ.
 *
 * ## Ce qu'il y a dans un coffret
 *
 * Trente cartes exactement, toutes jouables ensemble :
 *
 *   - **une mythique**, tirée au hasard dans la couleur du coffret ;
 *   - **trois rares**, distinctes, à **un exemplaire chacune** ;
 *   - le reste en **communes et inhabituelles** de la couleur, à deux
 *     exemplaires, jusqu'à trente cartes.
 *
 * Deux couleurs du catalogue sont trop « hautes » pour remplir vingt-six places
 * avec leurs seules communes (la Braise n'en a que huit, la Neige dix) : le
 * remplissage puise alors dans la **couleur alliée** du coffret — le Sable pour
 * la Braise (les deux font la Tour des Listes et le Souk), l'Eau pour la Neige
 * (les Abysses révèlent les premières cartes du Nord). Le coffret reste donc à
 * deux couleurs au plus, dans la limite de trois que le format autorise.
 *
 * ## Ce qui est tiré, et quand
 *
 * L'offre est tirée **une seule fois** et rangée sur l'appareil : revenir sur
 * l'écran sans choisir repropose **les mêmes trois coffrets**, jamais trois
 * autres. Une fois le choix fait, il est définitif (`choisi`) et le coffret
 * devient la collection du joueur (`rpgCollection.js`, `collectionJoueur`).
 *
 * ## Un coffret par compte, jamais hérité
 *
 * L'offre est rangée sous la clé **du compte** (`…:user:<id>`) et elle ne se
 * reprend **jamais** d'un visiteur. Un joueur qui a ouvert un coffret sans être
 * connecté le garde sur l'appareil ; le compte qu'il crée ensuite reçoit le
 * sien, avec son propre choix. Sans cette règle, un compte neuf sur un
 * navigateur déjà utilisé — ou dont la session n'était pas encore résolue au
 * premier rendu — trouvait un coffret « déjà ouvert » et n'avait donc ni choix
 * ni ouverture.
 *
 * Tout est **pur** ici : les fonctions reçoivent leur catalogue, leur générateur
 * et leur état, et rendent un nouvel état. Le stockage (`localStorage`) reste
 * aux deux fonctions de lecture/écriture, comme partout dans le dépôt.
 */

import {
  MYTHIQUE_VITRINE_PAR_ELEMENT,
  RPG_DUEL_CARDS,
  cardById,
  cardColors,
  cardCopyLimit,
  carteJouableSansTerrain,
  rpgValiderDeck,
} from './rpgCards.js';
import { ecrireProgression, lireProgression, stockageProgression } from '../lib/progressionScope.js';

/** La clé locale de l'offre et du choix. */
export const RPG_COFFRET_STORAGE_KEY = 'letsplay_sablier_coffret_bienvenue_v1';

/** Les quatre couleurs entre lesquelles les trois coffrets sont tirés. */
export const COFFRET_COULEURS = Object.freeze(['sable', 'braise', 'neige', 'eau']);

/** Trois coffrets proposés, trente cartes chacun, trois rares par coffret. */
export const COFFRETS_PROPOSES = 3;
export const COFFRET_TAILLE = 30;
export const COFFRET_RARES = 3;

/**
 * L'identité de chaque coffret : son nom, sa phrase, et sa **couleur alliée**
 * pour le remplissage quand la couleur principale n'a pas assez de communes.
 */
export const COFFRETS_IDENTITE = Object.freeze({
  sable: Object.freeze({
    nom: 'Coffret du Désert',
    sousTitre: 'Le sable, les ksour et la lame des pistes',
    alliee: 'braise',
  }),
  braise: Object.freeze({
    nom: 'Coffret du Soleil rouge',
    sousTitre: 'La braise, les samouraïs et les yōkai',
    alliee: 'sable',
  }),
  neige: Object.freeze({
    nom: 'Coffret des Neuf Hivers',
    sousTitre: 'La neige, les valkyries et les drakkars',
    alliee: 'eau',
  }),
  eau: Object.freeze({
    nom: 'Coffret des Abysses',
    sousTitre: 'L’eau, les citernes et les bêtes du fond',
    alliee: 'neige',
  }),
});

/**
 * Le vivier **mono-couleur** d'un coffret : les cartes du duel dont la couleur
 * est exactement celle du coffret. Les hybrides restent dehors — un coffret
 * n'emprunte une seconde couleur que par sa couleur alliée, et seulement pour
 * les communes du remplissage.
 */
function vivierDe(couleur, cartes) {
  return (cartes ?? RPG_DUEL_CARDS).filter((carte) => carteJouableSansTerrain(carte)
    && cardColors(carte).length === 1 && cardColors(carte)[0] === couleur);
}

/** Les cartes d'une rareté, dans un vivier. */
function deRarete(vivier, rarete) {
  return vivier.filter((carte) => carte.rarity === rarete);
}

/**
 * Un tirage sans remise : mélange une copie de la liste (Fisher-Yates) avec le
 * générateur reçu — jamais `sort(() => rng() - 0.5)`, qui n'est pas un mélange
 * uniforme et rend des résultats reproductibles d'une manière inattendue.
 */
function melanger(liste, rng) {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/**
 * Compose **un** coffret d'une couleur : la mythique, les trois rares, puis le
 * remplissage. Rend `null` si la couleur n'a pas de mythique ou pas trois rares
 * — un catalogue amputé ne doit pas produire un coffret incomplet.
 */
export function composerCoffret(couleur, { cartes = RPG_DUEL_CARDS, rng = Math.random } = {}) {
  const identite = COFFRETS_IDENTITE[couleur];
  if (!identite) return null;
  const vivier = vivierDe(couleur, cartes);
  const mythiques = deRarete(vivier, 'mythique');
  const rares = deRarete(vivier, 'rare');
  if (mythiques.length < 1 || rares.length < COFFRET_RARES) return null;

  const mythique = mythiques[Math.floor(rng() * mythiques.length)];
  const raresChoisies = melanger(rares, rng).slice(0, COFFRET_RARES);

  const cardIds = [mythique.id, ...raresChoisies.map((carte) => carte.id)];
  const place = () => COFFRET_TAILLE - cardIds.length;
  // Le compte des copies, toutes sources confondues : une carte déjà posée par
  // la mythique ou par une rare ne revient pas par le remplissage, et une
  // commune ne dépasse jamais ses deux exemplaires.
  const copies = new Map([[mythique.id, 1]]);
  for (const carte of raresChoisies) copies.set(carte.id, 1);

  /**
   * Le remplissage : la couleur d'abord, puis son alliée. Deux exemplaires par
   * carte au plus (`cardCopyLimit`), et l'on s'arrête dès les trente cartes.
   */
  const remplirAvec = (source) => {
    for (const carte of melanger(source, rng)) {
      const deja = copies.get(carte.id) ?? 0;
      const limite = cardCopyLimit(carte);
      for (let copie = deja; copie < limite && place() > 0; copie += 1) {
        cardIds.push(carte.id);
        copies.set(carte.id, copie + 1);
      }
    }
  };
  const socle = (source) => source.filter((carte) => carte.rarity === 'commune'
    || carte.rarity === 'inhabituelle');
  // Le coffret reste **mono-couleur ou à deux couleurs** : sa couleur, puis son
  // alliée. Jamais une troisième — un coffret de quatre couleurs ne serait pas
  // un deck, et la règle en autorise trois au maximum.
  const paire = new Set([couleur, identite.alliee]);
  const dansLaPaire = socle(cartes.filter((carte) => carteJouableSansTerrain(carte)
    && cardColors(carte).every((autre) => paire.has(autre))));
  remplirAvec(socle(vivier));
  if (place() > 0) remplirAvec(dansLaPaire);
  if (place() > 0) return null;

  return {
    id: `coffret-${couleur}`,
    couleur,
    nom: identite.nom,
    sousTitre: identite.sousTitre,
    mythiqueId: mythique.id,
    raresIds: raresChoisies.map((carte) => carte.id),
    cardIds,
  };
}

/**
 * Tire les trois coffrets de l'offre : trois couleurs **différentes** parmi les
 * quatre historiques. Si une couleur ne peut pas composer son coffret (catalogue
 * amputé), elle est écartée et remplacée — l'offre rend toujours trois coffrets,
 * ou moins si le catalogue ne le permet pas.
 */
export function composerOffre({ cartes = RPG_DUEL_CARDS, rng = Math.random } = {}) {
  const couleurs = melanger(COFFRET_COULEURS, rng);
  const coffrets = [];
  for (const couleur of couleurs) {
    if (coffrets.length >= COFFRETS_PROPOSES) break;
    const coffret = composerCoffret(couleur, { cartes, rng });
    if (coffret) coffrets.push(coffret);
  }
  return coffrets;
}

/** L'état neuf : une offre tirée, aucun coffret encore choisi. */
export function offreBienvenue({ cartes = RPG_DUEL_CARDS, rng = Math.random, horloge = null } = {}) {
  return {
    version: 1,
    creeLe: typeof horloge === 'function' ? horloge() : new Date().toISOString(),
    coffrets: composerOffre({ cartes, rng }),
    choisi: null,
  };
}

/** L'état normalisé : une offre lisible, un choix qui désigne un coffret de l'offre. */
export function normaliserOffreBienvenue(value) {
  const brut = value && typeof value === 'object' ? value : {};
  const coffrets = (Array.isArray(brut.coffrets) ? brut.coffrets : [])
    .filter((coffret) => coffret && typeof coffret.id === 'string'
      && Array.isArray(coffret.cardIds) && coffret.cardIds.length === COFFRET_TAILLE
      && typeof coffret.mythiqueId === 'string'
      && Array.isArray(coffret.raresIds) && coffret.raresIds.length === COFFRET_RARES)
    .slice(0, COFFRETS_PROPOSES);
  const choisi = coffrets.some((coffret) => coffret.id === brut.choisi) ? brut.choisi : null;
  return {
    version: 1,
    creeLe: typeof brut.creeLe === 'string' ? brut.creeLe : null,
    coffrets,
    choisi,
  };
}

/** L'offre ne sert plus à rien : un coffret est choisi. */
export function offreTerminee(offre) {
  return Boolean(offre?.choisi);
}

/** Le coffret choisi, ou `null`. */
export function coffretChoisi(offre) {
  return offre?.coffrets?.find((coffret) => coffret.id === offre.choisi) ?? null;
}

/** Le coffret d'une offre, par identifiant. */
export function coffretParId(offre, id) {
  return offre?.coffrets?.find((coffret) => coffret.id === id) ?? null;
}

/**
 * Choisit un coffret — définitif. Rend un nouvel état ; un identifiant inconnu
 * laisse l'offre intacte, pour qu'un clic sur un coffret déjà parti ne casse
 * rien, et choisir une deuxième fois ne remplace jamais le premier choix.
 */
export function choisirCoffret(offre, id) {
  const etat = normaliserOffreBienvenue(offre);
  if (etat.choisi || !coffretParId(etat, id)) return etat;
  return { ...etat, choisi: id };
}

/**
 * Les **vagues** de la cérémonie : le socle (communes et inhabituelles) d'abord,
 * puis les trois rares, puis la mythique — chacune seule à la fin, comme un
 * bouquet qu'on garde pour la sortie.
 *
 * Chaque vague rend ses cartes **distinctes**, avec leur nombre d'exemplaires :
 * la cérémonie affiche une carte par vignette, avec sa pastille de copies.
 */
export function vaguesDuCoffret(coffret) {
  const compte = new Map();
  for (const id of coffret?.cardIds ?? []) compte.set(id, (compte.get(id) ?? 0) + 1);
  const seau = { socle: [], rares: [], mythique: [] };
  for (const [id, exemplaires] of compte.entries()) {
    const carte = cardById(id);
    if (!carte) continue;
    const ligne = { id, carte, exemplaires };
    if (carte.rarity === 'mythique') seau.mythique.push(ligne);
    else if (carte.rarity === 'rare') seau.rares.push(ligne);
    else seau.socle.push(ligne);
  }
  return [
    { cle: 'socle', titre: 'Le socle', legende: 'Les communes et les inhabituelles de votre couleur', cartes: seau.socle },
    { cle: 'rares', titre: 'Les trois rares', legende: 'Une seule de chacune — elles ne reviendront pas de sitôt', cartes: seau.rares },
    { cle: 'mythique', titre: 'La mythique', legende: 'La carte qui donne son nom au coffret', cartes: seau.mythique },
  ].filter((vague) => vague.cartes.length > 0);
}

/**
 * Le coffret est-il un deck jouable ? Trente cartes, deux couleurs au plus,
 * quotas de rareté respectés — c'est `rpgValiderDeck`, la règle du format.
 */
export function coffretEstJouable(coffret) {
  return Boolean(coffret) && rpgValiderDeck(coffret.cardIds).ok;
}

/**
 * Faut-il présenter les coffrets ? Seulement au **tout premier lancement** :
 *
 *   - aucune offre enregistrée, et aucun coffret choisi ;
 *   - un joueur qui a déjà joué (un étage vaincu, des cartes gagnées, une
 *     collection) **ne voit jamais l'écran** : sa collection existante ne se
 *     reprend pas, et un écran de bienvenue par-dessus son jeu serait faux.
 */
export function coffretBienvenueNecessaire({
  offre = null,
  progression = null,
  acquis = null,
  collection = null,
} = {}) {
  const etat = normaliserOffreBienvenue(offre);
  if (etat.choisi) return false;
  if (etat.coffrets.length === 0) return false; // catalogue incomplet : rien à proposer
  const etages = progression?.etagesVaincus;
  if (Array.isArray(etages) && etages.length > 0) return false;
  if ((acquis?.cartes?.length ?? 0) > 0) return false;
  if ((collection?.length ?? 0) > 0) return false;
  return true;
}

/**
 * La **mythique de vitrine** d'un coffret : celle dont l'illustration s'imprime
 * sur le paquet fermé.
 *
 * C'est la mythique emblématique de sa couleur (`MYTHIQUE_VITRINE_PAR_ELEMENT`,
 * `rpgCards.js`), la même que les boosters du Souk affichent — **pas** celle
 * qui sera tirée à l'ouverture : le paquet doit donner envie, pas vendre la
 * surprise de la troisième vague. Si la couleur n'a pas de vitrine, on se
 * rabat sur la mythique réellement tirée, pour qu'un paquet n'aille jamais
 * sans peinture.
 */
export function mythiqueVitrineDuCoffret(coffret) {
  if (!coffret) return null;
  const vitrine = cardById(MYTHIQUE_VITRINE_PAR_ELEMENT[coffret.couleur]);
  if (vitrine) return vitrine;
  return cardById(coffret.mythiqueId) ?? null;
}

/** Le coffret en deck maison : un nom, une peinture, trente cartes. */
export function coffretEnDeckMaison(coffret) {
  if (!coffret) return null;
  return {
    id: `maison-${coffret.id}`,
    nom: coffret.nom,
    cardIds: [...coffret.cardIds],
    boxArt: coffret.mythiqueId,
    element: coffret.couleur,
    elements: [coffret.couleur],
    maison: true,
    coffret: true,
  };
}

function browserStorage() {
  return stockageProgression();
}

/**
 * Le coffret **choisi** sur cet appareil, ou `null`. C'est la seule fonction que
 * `rpgCollection.js` appelle : elle ne connaît ni l'offre ni l'écran, seulement
 * le coffret qui remplace la dotation.
 */
export function coffretChoisiDeLAppareil() {
  return coffretChoisi(chargerOffreBienvenue());
}

/**
 * L'offre **du joueur courant**, normalisée (offre vide si rien n'est stocké).
 *
 * `reprise: false` : la copie d'un visiteur n'est jamais reprise. Le coffret de
 * bienvenue est un rendez-vous entre un compte et son premier écran, pas un
 * état d'appareil — voir l'en-tête du module.
 */
export function chargerOffreBienvenue() {
  const stockage = browserStorage();
  if (!stockage) return normaliserOffreBienvenue(null);
  try {
    const brut = lireProgression(RPG_COFFRET_STORAGE_KEY, stockage, { reprise: false });
    return normaliserOffreBienvenue(JSON.parse(brut ?? 'null'));
  } catch {
    return normaliserOffreBienvenue(null);
  }
}

/** Enregistre l'offre (et le choix). Rend l'état écrit, ou `null` sans stockage. */
export function sauverOffreBienvenue(offre) {
  const stockage = browserStorage();
  if (!stockage) return null;
  const etat = normaliserOffreBienvenue(offre);
  return ecrireProgression(RPG_COFFRET_STORAGE_KEY, JSON.stringify(etat), stockage) ? etat : null;
}

/**
 * L'offre à l'écran : celle du stockage, ou une offre neuve **non enregistrée**
 * (l'écran l'enregistre au premier rendu pour qu'un rechargement repropose les
 * mêmes trois coffrets).
 */
export function offreAAfficher({ cartes = RPG_DUEL_CARDS, rng = Math.random } = {}) {
  const existante = chargerOffreBienvenue();
  return existante.coffrets.length > 0 ? existante : offreBienvenue({ cartes, rng });
}
