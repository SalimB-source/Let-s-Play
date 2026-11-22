/** Quelles créatures à distance portent l'**icône de leur type** sur l'ATQ ?
 *
 * La portée s'écrit avec trois icônes différentes sur la statistique d'attaque :
 * l'arc et sa flèche quand la peinture montre une arme de tir (yumi, arquebuse,
 * fusil, canon, shuriken), l'étoile d'invocation quand la nature convoque sans
 * arme (voir `rpgCartesEtoile.js`), et l'**icône du type de la créature** quand
 * elle frappe de loin sans aucun arme visible : le chant, le glas, le feuillet
 * lu à voix haute, le bâton, la queue, les ailes. L'arc y promettrait un tir
 * que la peinture dément — c'est le type qui attaque, c'est le type qui signe.
 *
 * La liste a été arrêtée peinture par peinture (trente cartes à distance hors
 * étoile) : dix gardent l'arc, vingt reçoivent leur type. Le glyphe lui-même
 * (oiseau, bête, ou figure) se lit sur la ligne de type imprimée, pour qu'une
 * carte future sans arme trouve son icône sans retoucher les glyphes.
 */
import { cardById, cardColors, RPG_ELEMENTS } from './rpgCards.js';

/** Vingt peintures sans arme de tir : la créature attaque de sa propre nature. */
const SANS_ARME_VISIBLE = new Set([
  // Bâton, cercles et sentence : la gardienne et l'homme de foi portent leur voix.
  'guetteuse-des-marees',
  'pretre-de-la-bouche',
  // Le feuillet et le nom lu à voix haute.
  'scribe-des-feuillets',
  'lecteur-du-dernier-nom',
  // Les ailes du Tengu, la queue de la Manticore.
  'tengu-du-mont-ardent',
  'manticore-des-dunes',
  // La pique du Tercio est d' melee : rien ne tire dans la peinture.
  'tercio-de-cuivre',
  // Le guet, le glas et la lanterne : rien qu'un cri qui porte.
  'guetteur-du-beffroi',
  'sonneur-fele',
  'veilleuse-des-citernes',
  // Le chant kabyle porte au-dessus de la mêlée.
  'tiziri-du-djurdjura',
  // Bâton de soin, lyre runique, rosaire et corbeau : aucune corde bandée.
  'volva-soigneuse',
  'scalde-des-runes',
  'veilleuse-au-corbeau-noir',
  // Les vampires frappent d'ombre et de commandement, sans arme tenue.
  'eclipse-silencieuse',
  'sorcier-du-ressac-noir',
  'veilleuse-de-la-lune-givree',
  'archonte-du-sablier-noir',
  // Le Père des corbeaux et la Dame des neuf mondes : le bâton, pas l'arc.
  'pere-des-corbeaux',
  'dame-des-neuf-mondes',
]);

/** Le type d'une créature, c'est sa couleur : le sablier du Sable, la tête de
 *  mort des Ténèbres, la flamme de la Braise, le flocon de la Neige, la goutte
 *  de l'Eau — les emblèmes partagés de `rpgEmblemes.jsx`. Une carte hybride
 *  montre sa première couleur dans l'ordre canonique, comme son cadre. */

/**
 * Le glyphe de type d'une carte, ou `null` si elle garde l'arc (ou l'étoile).
 * Une carte peut forcer son glyphe avec `iconeType`, ou sortir de la liste
 * avec `iconeType: null` imprimé — la fiche reste maîtresse d'elle-même.
 */
export function iconeTypeDe(carte) {
  if (!carte) return null;
  if (carte.kind && carte.kind !== 'creature' && carte.kind !== 'hero') return null;
  if (carte.kind === 'arme' || carte.porteeArme) return null;
  if ('iconeType' in carte) return carte.iconeType ?? null;
  if (!SANS_ARME_VISIBLE.has(carte.id)) return null;
  const presentes = cardColors(carte);
  return RPG_ELEMENTS.find((element) => presentes.includes(element)) ?? 'sable';
}

/** Vrai quand la peinture de cette créature ne montre aucune arme de tir. */
export function carteSansArmeVisible(carte) {
  if (!carte) return false;
  if ('iconeType' in carte) return carte.iconeType != null;
  return SANS_ARME_VISIBLE.has(carte.id);
}

/**
 * Même réponse, mais depuis une **créature en jeu** : le plateau ne manipule
 * que des entités (`{ carteId, distance, coupRapide, … }`), sans typeLine.
 * On lit donc la fiche d'origine dans le catalogue, en retombant sur l'entité
 * elle-même pour les jetons qui portent déjà leur nature.
 */
export function entiteIconeType(entite) {
  if (!entite) return null;
  const carte = (entite.carteId && cardById(entite.carteId)) || entite.carte || entite;
  return iconeTypeDe(carte) || iconeTypeDe(entite);
}

/** Une chance sur quatre : la fréquence commune du jeu (Esquive, coup critique,
 *  raté des créatures À distance) — celle des effets d'élément ci-dessous. */
export const RPG_PROC_ELEMENT_CHANCE = 0.25;

/** L'élément signé par l'emblème donne son effet à la portée : la Braise
 *  brûle, la Neige gèle, le Sable emporte un butin, les Ténèbres transfèrent
 *  la vie. L'Eau ne signe aucun effet propre. */
export const PROCS_ELEMENT_DISTANCE = Object.freeze({
  braise: 'brulure',
  neige: 'gel',
  sable: 'butin',
  tenebres: 'transfert',
});

/**
 * L'effet d'élément d'une créature **à distance** qui frappe de sa propre
 * nature (emblème d'élément à la place de l'arc), ou `null` : une archère qui
 * bande un arc reste un tir, pas un élément. Le moteur s'en sert quand
 * l'attaque touche : une chance sur quatre d'éveiller l'effet de l'élément.
 */
export function procElementDistance(carte) {
  if (!carte?.distance) return null;
  if (!SANS_ARME_VISIBLE.has(carte.id)) return null;
  return PROCS_ELEMENT_DISTANCE[iconeTypeDe(carte)] ?? null;
}
