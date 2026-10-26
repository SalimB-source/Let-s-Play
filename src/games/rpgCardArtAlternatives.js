/**
 * Les illustrations **alternatives** — les anciennes peintures, gagnées à
 * l'échelle d'XP **ou achetées à la boutique du Catalogue**.
 * ----------------------------------------------------------------------
 * Le set Braise est passé de la peinture kaiga / nihonga à l'huile sombre
 * (dérogation « Souls », voir `RPG-CARD-ART.md`), puis tout le Sable. Ces
 * anciennes peintures ne sont pas perdues : elles deviennent des
 * **illustrations alternatives** que le joueur gagne ou achète, et que la fiche
 * d'une carte montre **à côté de la carte** qu'elles doublent.
 *
 * ## Deux sources, une seule table
 *
 * Le lot a grossi à chaque set repeint (soixante-dix-sept peintures) : deux par
 * palier de deux niveaux ne tenaient plus dans une courbe de soixante niveaux,
 * et dix-sept peintures seraient tombées ensemble au dernier palier. L'échelle
 * se resserre donc, et le reste passe en boutique :
 *
 *   - **l'échelle** — une illustration **tous les quatre niveaux**, de 4 à 60 :
 *     quinze paliers, les cartes **mythiques** d'abord, celles qui font
 *     plaisir à voir tomber. Rien ne se perd : un joueur qui revient avec
 *     cinquante niveaux trouve d'un coup ce que son XP a déjà couvert.
 *   - **la boutique** — tout le reste s'achète en crédits ◈, au prix de la
 *     rareté de la carte doublée (`PRIX_ILLUSTRATION`). L'achat se fait dans la
 *     fiche du catalogue, sur la vignette de l'illustration.
 *
 * La source se **calcule** avec la table : aucun niveau ni prix n'est stocké,
 * et une peinture ajoutée demain prend sa place sans migration.
 *
 * ## Trois invariants
 *
 * 1. **Une seule alternative par carte** : `alternativeDeCarte` rend la fiche
 *    ou `null`, et la table est unique par `carteId`.
 * 2. **Le palier est monotone** : les illustrations d'échelle sont rangées dans
 *    l'ordre de leur niveau, une par palier ; la boutique n'a pas de rang.
 * 3. **Rien ne casse sans image** : une fiche dont le fichier manque serait une
 *    vignette morte. Un test du dépôt vérifie que chaque `fichier` existe en
 *    4:5 dans `public/cards/alt/`.
 */

import { cardById, cardRarityInfo } from './rpgCards.js';
import { COURBE } from './rpgProfil.js';

const ART_BASE_URL = import.meta.env?.BASE_URL ?? '/';

/**
 * Le pas de l'échelle : **une illustration tous les quatre niveaux**. Le lot
 * grandit à chaque nouveau set repeint ; l'échelle, elle, reste courte et
 * lisible — les peintures en surnombre passent en boutique plutôt que de
 * s'entasser au dernier palier.
 */
export const NIVEAUX_PAR_PALIER = 4;

/** Combien d'illustrations l'échelle ouvre au total (niveaux 4 → 60). */
export const ALTERNATIVES_DE_ECHELLE = 15;

/** Le niveau du premier palier de l'échelle. */
export const NIVEAU_PREMIERE_ALTERNATIVE = NIVEAUX_PAR_PALIER;

/** L'ancien nom du pas, gardé pour les écrans et les tests qui parlent encore
 *  « d'un pas » : c'est le nombre de niveaux entre deux paliers. */
export const PAS_DES_ALTERNATIVES = NIVEAUX_PAR_PALIER;

/**
 * Les prix de la boutique, par rareté de la **carte doublée** : une peinture
 * mythique se paie cher, une commune se donne. Repères de la maison : un paquet
 * du Souk coûte 140 ◈, un étage déblayé rapporte 50, un duel libre 8.
 */
export const PRIX_ILLUSTRATION = Object.freeze({
  commune: 80,
  inhabituelle: 140,
  rare: 240,
  mythique: 400,
});

/** Le prix d'une illustration dont la rareté n'est pas connue. */
export const PRIX_ILLUSTRATION_DEFAUT = PRIX_ILLUSTRATION.inhabituelle;

/** La rareté de la carte doublée — `commune` quand la carte manque. */
export function rareteDeLaCarte(carteId) {
  const carte = cardById(carteId);
  return carte ? cardRarityInfo(carte).key : 'commune';
}

/** Le prix boutique d'une carte : il ne dépend que de sa rareté. */
export function prixIllustration(carteId) {
  return PRIX_ILLUSTRATION[rareteDeLaCarte(carteId)] ?? PRIX_ILLUSTRATION_DEFAUT;
}

// L'ordre de cette table est l'ordre des niveaux : on ajoute à la fin.
const DEFINITIONS = [
  ['susanoo', 'La tempête au tourbillon'],
  ['orochi', 'Les huit têtes de la vallée noyée'],
  ['oni-de-la-fournaise', 'L’oni du pont de braises'],
  ['kagutsuchi-flamme-originelle', 'Le premier feu sur la falaise'],
  ['daimyo-du-soleil-rouge', 'Le daimyō au soleil rouge'],
  ['tengu-du-mont-ardent', 'Le tengu entre les pics'],
  ['onna-musha-des-cendres', 'La naginata sur le toit'],
  ['ifrit-al-ahmar', 'Le seigneur des braises'],
  ['feriel', 'L’archère de la tour de guet'],
  ['anqa-des-braises', 'L’oiseau qui renaît des cendres'],
  ['ifrit-des-ergs', 'L’ifrit des dunes rouges'],
  ['sahir-des-braises', 'Le cercle tracé dans la poussière'],
  ['cavalier-des-deux-sabres', 'Le cavalier dans les herbes grises'],
  ['lionne-du-midi-ardent', 'La lionne sous le disque rouge'],
  ['samourai-du-torii', 'La carte de guerre sous la tente'],
  ['kenshi-de-la-forge', 'Le forgeron et le dragon de feu'],
  ['ronin-du-soleil-rouge', 'La charge dans les escaliers'],
  ['hatamoto-des-cendres', 'Le croissant d’or sous la lune'],
  ['ashigaru-des-braises', 'La ligne des yari'],
  ['braisier-du-souk', 'Le souffleur de braises'],
  ['serment-de-la-forge', 'Le serment sur l’enclume'],
  ['armure-de-cendres', 'L’armure vide au cratère'],
  ['tour-de-braise', 'La tour en flammes'],
  ['sabre-maudit', 'La lame au fil de braise'],
  ['frappe-iaijutsu', 'Le fourreau qui résonne'],
  ['feux-de-kitsune', 'Les lumières entre les cèdres'],
  ['trait-de-braise', 'L’étincelle du souk'],
  ['nuage-de-cendres', 'Le nuage sur la muraille'],
  ['vent-rouge', 'La tempête de sable rouge'],
  // Le Sable — l'ancien désert doré, avant la passe Souls.
  ['faucon-du-zenith', 'Le faucon au zénith d’or'],
  ['dame-aux-ailes-d-or', 'La dame aux ailes dorées'],
  ['dune-marchante', 'Le lion de sable'],
  ['djinn-de-foudre', 'Le djinn dans l’orage sec'],
  ['fennec-des-decombres', 'Le fennec sous la lune'],
  ['tour-de-sable', 'La tour des sables'],
  ['tislit-des-aures', 'L’éclaireuse des Aurès'],
  ['cavalier-amazigh-du-desert', 'Le cavalier à la monture blanche'],
  ['amayas-du-hoggar', 'Le guide au chameau'],
  ['faussoyeur-des-dunes', 'Le pillard au turban'],
  // Les pirates — l'ancien set doré, avant la passe Souls.
  ['la-barbe-rousse', 'L’amiral en plein abordage'],
  ['la-barbe-noire', 'Les deux visages de Thatch'],
  ['le-chasseur-d-ocracoke', 'Le chasseur dans les brumes'],
  ['la-vengeance-de-la-reine-anne', 'Le vaisseau fantôme à la lune'],
  ['galion-de-la-flotte', 'Le galion d’argent'],
  ['cotre-de-course', 'Le cotre sous pavillon noir'],
  ['le-renegat', 'Le corsaire aux deux pavillons'],
  ['negociant-des-ranscons', 'Le négociant dans sa boutique'],
  ['mousse-des-galiotes', 'Le mousse à la manœuvre'],
  ['rais-de-la-galiote', 'Le raïs à la barre'],
  // Les figures du désert et trois magies.
  ['tiziri-du-djurdjura', 'Le chant sur la crête'],
  ['amani-des-ksour', 'La gardienne des hauteurs'],
  ['guetteur-du-beffroi', 'La vigie du beffroi'],
  ['scribe-de-la-liste', 'Le scribe à la chandelle'],
  ['faiseur-de-passage', 'La lampe dans la muraille'],
  ['le-tresor-de-lima', 'Le trésor dans la jungle'],
  ['tercio-de-cuivre', 'Le tercio aux boucliers de cuivre'],
  ['tempete-de-sable', 'La tempête sur la caravane'],
  ['rempart-de-dunes', 'Le rempart de sable'],
  ['reanimation', 'La main hors du sable'],
  // Les héros du désert et les premiers équipements.
  ['salem', 'Salem à l’astrolabe d’or'],
  ['tarek', 'Tarek au soleil couchant'],
  ['tin-hinan', 'Tin Hinan sur la piste'],
  ['chien-du-guet', 'Le chien dans la vieille ville'],
  ['grappin-d-abordage', 'Le grappin sur la coque'],
  ['takouba-des-pistes', 'La takouba sous le soleil'],
  ['sandales-de-tislit', 'Les sandales au seuil'],
  ['cuirasse-de-sel', 'La cuirasse de sel'],
  ['javelot-du-beffroi', 'Le javelot dans la dune'],
  ['licou-du-chien-de-sable', 'Le licou sur la pierre'],
  ['harnais-du-mehari', 'Le harnais sous la lanterne'],
  ['masque-du-guetteur', 'Le masque du guetteur'],
  ['jitte-d-amayas', 'La jitte sur la pierre'],
  ['lame-des-ergs', 'La lame courbe dans la dune'],
  ['takouba-de-tin-hinan', 'La takouba de Tin Hinan'],
  ['lettre-de-marque', 'La lettre de marque'],
  ['le-grand-debarquement', 'Le grand débarquement'],
  ['rapport-du-greffier', 'Le rapport du greffier'],
  // Le Neige — peintes avant la passe Souls, sauf la mappemonde du Serpent du
  // monde, la tour en paysage et le portrait photoréaliste du Père des corbeaux.
  ['serpent-du-monde', 'Le serpent autour du monde'],
  ['tour-de-neige', 'La tour de neige au crépuscule'],
  ['dame-des-neuf-mondes', 'La dame des neuf mondes'],
  ['pere-des-corbeaux', 'Le père des corbeaux'],
  ['poigne-de-givre', 'La poigne de givre'],
  ['verglas', 'Le verglas'],
  ['embuscade', 'L’embuscade'],
  ['defi-du-jarl', 'Le défi du jarl'],
  ['appat-de-la-meute', 'L’appât de la meute'],
  ['grand-voile-blanc', 'Le grand voile blanc'],
  ['eirik-du-premier-serment', 'Eirik sur le fjord gelé'],
  ['valkyrie-des-glaces', 'La valkyrie des glaces'],
  ['geant-des-banquises', 'Le géant des banquises'],
  ['drakkar-a-tete-de-dragon', 'Le drakkar à tête de dragon'],
  ['scalde-des-runes', 'Le scalde à la cithare'],
  ['eclair-du-marteau', 'L’éclair du marteau'],
  ['mur-de-boucliers', 'Le mur de boucliers'],
  ['festin-des-vaillants', 'Le festin des vaillants'],
  ['brume-du-fjord', 'La brume du fjord'],
  ['hurlement-du-blizzard', 'Le hurlement du blizzard'],
  ['lance-de-givre', 'La lance de givre'],
  ['hache-de-la-banquise', 'La hache sous l’aurore'],
  // L'Eau — peinte avant la passe Souls, en couleurs plates ou au plein jour.
  ['yamina', 'Yamina au cadran du Souk'],
  ['boualem', 'Boualem au comptoir des sources'],
  ['baton-des-citernes', 'Le bâton des citernes'],
  ['porteuse-de-cruches', 'La porteuse de cruches'],
  ['pilote-de-la-carreira', 'Le pilote de la carreira'],
  ['source-de-bimini', 'La source de Bimini'],
  ['haut-fond', 'Le haut-fond'],
  ['lame-de-mer', 'La lame de mer'],
  ['le-routier', 'Le routier'],
  ['eau-de-la-source', 'L’eau de la source'],
  ['leviathan', 'Le Léviathan'],
  ['bakunawa', 'Bakunawa'],
  ['jormungandr', 'Jörmungandr'],
  ['seigneur-des-machoires', 'Le Seigneur des mâchoires'],
  ['vipere-de-verre', 'La vipère de verre'],
  ['tour-des-flots', 'La tour des flots'],
  ['sonneur-fele', 'Le sonneur fêlé'],
  ['veilleuse-des-citernes', 'La veilleuse des citernes'],
  ['silence-decume', 'Le silence d’écume'],
  ['kraken', 'Le Kraken'],
  ['parade-du-verre', 'La parade de verre'],
  ['brisure-de-verre', 'La brisure de verre'],
  ['ecueil', 'L’écueil'],
  ['contresort-des-abimes', 'Le contresort des abîmes'],
  ['maree-contraire', 'La marée contraire'],
  ['ressac', 'Le ressac'],
  ['courant-de-retour', 'Le courant de retour'],
];

/**
 * Les cartes qui portent l'échelle : les **mythiques**, dans l'ordre du
 * catalogue, à hauteur de `ALTERNATIVES_DE_ECHELLE`. S'il n'y en a pas assez,
 * les peintures restantes complètent dans l'ordre de la table — l'échelle ne
 * reste jamais à moitié vide.
 */
const CARTES_DE_ECHELLE = (() => {
  const choisies = DEFINITIONS
    .map(([carteId]) => carteId)
    .filter((carteId) => cardById(carteId) && rareteDeLaCarte(carteId) === 'mythique')
    .slice(0, ALTERNATIVES_DE_ECHELLE);
  if (choisies.length >= ALTERNATIVES_DE_ECHELLE) return new Set(choisies);
  for (const [carteId] of DEFINITIONS) {
    if (choisies.length >= ALTERNATIVES_DE_ECHELLE) break;
    if (!choisies.includes(carteId)) choisies.push(carteId);
  }
  return new Set(choisies);
})();

/**
 * Les illustrations alternatives, prêtes pour l'écran :
 * `{ carteId, nom, fichier, source, niveau, prix, index }`.
 *
 * `source` vaut `'echelle'` (gagnée au niveau `niveau`) ou `'boutique'`
 * (achetée `prix` crédits). Le fichier vit dans `public/cards/alt/`, en 4:5
 * comme les faces qu'il double. L'ordre de la table est celui de
 * l'énumération : les illustrations d'échelle gardent leur rang, la boutique
 * n'en a pas.
 */
export const RPG_ILLUSTRATIONS_ALTERNATIVES = Object.freeze((() => {
  let rang = 0;
  return DEFINITIONS.map(([carteId, nom], index) => {
    const deEchelle = CARTES_DE_ECHELLE.has(carteId);
    // Une illustration d'échelle par palier, bornée au plafond de la courbe.
    const niveau = deEchelle
      ? Math.min(COURBE.niveauMax, NIVEAU_PREMIERE_ALTERNATIVE + rang++ * NIVEAUX_PAR_PALIER)
      : null;
    return Object.freeze({
      carteId,
      nom,
      fichier: `cards/alt/${carteId}.jpg`,
      source: deEchelle ? 'echelle' : 'boutique',
      niveau,
      prix: deEchelle ? null : prixIllustration(carteId),
      index,
    });
  });
})());

/** Les illustrations qui se gagnent à l'échelle, dans l'ordre des niveaux. */
export const ALTERNATIVES_DE_L_ECHELLE = Object.freeze(
  RPG_ILLUSTRATIONS_ALTERNATIVES.filter((entree) => entree.source === 'echelle'),
);

/** Les illustrations qui s'achètent, dans l'ordre de la table. */
export const ALTERNATIVES_DE_BOUTIQUE = Object.freeze(
  RPG_ILLUSTRATIONS_ALTERNATIVES.filter((entree) => entree.source === 'boutique'),
);

/** L'index des alternatives par carte : une seule par carte, par construction. */
const PAR_CARTE = new Map(RPG_ILLUSTRATIONS_ALTERNATIVES.map((entree) => [entree.carteId, entree]));

/** L'illustration alternative d'une carte, ou `null` si elle n'en a pas. */
export function alternativeDeCarte(carteId) {
  return PAR_CARTE.get(String(carteId ?? '')) ?? null;
}

/** L'URL de l'image d'une alternative (révision de cache comprise). */
export function illustrationAlternativeUrl(alternative) {
  if (!alternative?.fichier) return '';
  // Le nom du fichier change avec le contenu (chaque peinture est archivée une
  // fois pour toutes) : pas de `?v=` à propager, un cache ne peut pas mentir.
  return `${ART_BASE_URL}${alternative.fichier}`;
}

/**
 * Vrai quand le **niveau** du joueur ouvre cette illustration d'échelle. Une
 * illustration de boutique n'est jamais « débloquée » par l'XP : elle s'achète
 * (voir `possedeIllustration`, `rpgCredits.js`).
 */
export function alternativeDebloquee(alternative, niveau) {
  if (!alternative || alternative.source !== 'echelle') return false;
  const palier = Math.max(1, Math.floor(Number(niveau) || 1));
  return palier >= alternative.niveau;
}

/**
 * Vrai quand l'illustration est **ouverte** pour ce joueur : gagnée à
 * l'échelle par son niveau, ou achetée à la boutique. `acquises` est la liste
 * des identifiants achetés, celle du portefeuille.
 */
export function alternativeOuverte(alternative, niveau, acquises = []) {
  if (!alternative) return false;
  if (alternative.source === 'echelle') return alternativeDebloquee(alternative, niveau);
  return Array.isArray(acquises) && acquises.includes(alternative.carteId);
}

/** Les illustrations d'échelle ouvertes à ce niveau, dans l'ordre du catalogue. */
export function alternativesDebloquees(niveau) {
  return ALTERNATIVES_DE_L_ECHELLE.filter((entree) => alternativeDebloquee(entree, niveau));
}

/**
 * La prochaine illustration d'échelle à gagner, ou `null` quand l'échelle est
 * couverte : c'est elle que la barre d'XP annonce (« prochaine illustration au
 * niveau N »).
 */
export function prochaineAlternative(niveau) {
  const palier = Math.max(1, Math.floor(Number(niveau) || 1));
  return ALTERNATIVES_DE_L_ECHELLE.find((entree) => entree.niveau > palier) ?? null;
}

/**
 * Les illustrations d'échelle **gagnées entre deux niveaux** — celles que
 * l'écran de fin de duel doit montrer. `avant` est le niveau d'avant la partie,
 * `apres` celui d'après : tout ce qui est neuf est rendu dans l'ordre. Un
 * passage de plusieurs paliers d'un coup (grosse victoire, retour sur un
 * appareil) rend tout ce qu'il a ouvert.
 */
export function alternativesGagneesEntre(niveauAvant, niveauApres) {
  const avant = Math.max(0, Math.floor(Number(niveauAvant) || 0));
  const apres = Math.max(0, Math.floor(Number(niveauApres) || 0));
  if (apres <= avant) return [];
  return ALTERNATIVES_DE_L_ECHELLE.filter(
    (entree) => entree.niveau > avant && entree.niveau <= apres,
  );
}

/** Combien d'illustrations d'échelle restent à gagner à ce niveau. */
export function alternativesRestantes(niveau) {
  return ALTERNATIVES_DE_L_ECHELLE
    .filter((entree) => entree.niveau > Math.max(1, Math.floor(Number(niveau) || 1))).length;
}

/** Le nom de la carte doublée par une alternative — pour les libellés d'écran. */
export function nomDeLaCarte(carteId) {
  return cardById(carteId)?.name ?? String(carteId ?? '');
}
