/**
 * Les pierres d'effets — la plaque d'emblème sur laquelle chaque pictogramme
 * du Sablier vient se poser.
 *
 * La grammaire est celle des emblèmes de héros : plus de trait doré posé à
 * même le texte, mais une **pierre taillée** — fond saturé, biseau clair en
 * haut, ombre en bas, liseré sombre, et le symbole en blanc pur au centre.
 * Deux choses s'y lisent d'un coup d'œil, sans lire le mot :
 *
 * - **la forme dit la famille d'action** — le `diamant` pour ce qui frappe et
 *   se déplace (Assaut, Tempo), l'`hexagone` pour ce qui tient et dure
 *   (Garde, Ombre, Flux) ;
 * - **la pierre dit le registre** — braise pour le combat, or pour la garde,
 *   ténèbres pour ce qui ronge, émeraude pour les ressources, azur pour le
 *   tempo.
 *
 * Le dessin vit dans un carré de 32 unités : la pierre occupe les 32, le
 * pictogramme 13 (diamant) à 19 (hexagone) — les formes pointues laissent moins
 * de place au centre, et le trait garde la même épaisseur apparente partout
 * (voir `EPAISSEUR_SYMBOLE`).
 *
 * Rien ici ne dépend de React : la géométrie et le balisage se testent seuls
 * (`tests/rpg-effets-pierres.test.js`) et la page de revue
 * `scripts/effets-pierres-preview.mjs` les assemble sans navigateur.
 */

import { EFFET_ICONE, couleurProtection } from './effetIcons.js';

/** Le côté du carré de dessin, en unités de `viewBox`. */
export const PLAQUE_COTE = 32;

/**
 * Les silhouettes, en unités du carré de 32. Toutes sont centrées sur (16, 16)
 * et symétriques : la moitié haute et la moitié basse se découpent donc sur
 * l'horizontale du milieu (voir `moitie`).
 */
export const PLAQUE_FORMES = Object.freeze({
  diamant: Object.freeze([[16, 1.6], [30.4, 16], [16, 30.4], [1.6, 16]]),
  hexagone: Object.freeze([[16, 1.6], [28.5, 8.8], [28.5, 23.2], [16, 30.4], [3.5, 23.2], [3.5, 8.8]]),
});

/**
 * Les pierres : `encre` borde, `fond` remplit, `lueur` éclaire le biseau haut.
 * Les valeurs sont volontairement sombres sur les bords — la carte du Sablier
 * est elle-même sombre, une pierre doit s'y détacher sans briller comme un
 * néon.
 */
export const PLAQUE_PIERRES = Object.freeze({
  braise: Object.freeze({ encre: '#1b0609', creux: '#5d1116', fond: '#a8282d', lueur: '#ff9c72' }),
  or: Object.freeze({ encre: '#1c1204', creux: '#5d3f13', fond: '#c1922c', lueur: '#ffe6a6' }),
  tenebres: Object.freeze({ encre: '#11061f', creux: '#331356', fond: '#7a3cb2', lueur: '#d9b4ff' }),
  emeraude: Object.freeze({ encre: '#03150f', creux: '#0a3a30', fond: '#1b8873', lueur: '#8ff0d2' }),
  azur: Object.freeze({ encre: '#05111d', creux: '#132c4a', fond: '#3a72ad', lueur: '#a9dcff' }),
});

/**
 * Les familles : une forme, une pierre. Ajouter un registre d'effets, c'est
 * ajouter une ligne ici — jamais toucher au dessin des pierres.
 */
export const PLAQUE_FAMILLES = Object.freeze({
  assaut: Object.freeze({ forme: 'diamant', pierre: 'braise', libelle: 'Assaut' }),
  tempo: Object.freeze({ forme: 'diamant', pierre: 'azur', libelle: 'Tempo' }),
  garde: Object.freeze({ forme: 'hexagone', pierre: 'or', libelle: 'Garde' }),
  ombre: Object.freeze({ forme: 'hexagone', pierre: 'tenebres', libelle: 'Ombre' }),
  flux: Object.freeze({ forme: 'hexagone', pierre: 'emeraude', libelle: 'Flux' }),
});

/**
 * Chaque clé d'`EFFET_ICONE` rejoint une famille. L'ordre de lecture est celui
 * du duel : ce qui frappe, ce qui protège, ce qui ronge, ce qui nourrit, ce
 * qui bouge.
 */
const CLES_PAR_FAMILLE = Object.freeze({
  assaut: Object.freeze([
    'degats', 'debuff', 'coupCritique', 'coupRapide', 'traque', 'traquePirates', 'overkill',
    'furie', 'honneur', 'abordage', 'prise', 'destruction-cible', 'destruction-totale',
    'destruction-navire', 'destruction-arme',
  ]),
  garde: Object.freeze([
    'protection', 'protectionSorts', 'protectionSortsContre', 'bouclier', 'bouclier-lumiere',
    'tenacite', 'defenseur', 'provocation', 'aura', 'banniere', 'buff', 'resonance', 'compagnie',
  ]),
  ombre: Object.freeze([
    'malediction', 'volDeVie', 'furtif', 'infiltration', 'exil', 'reanimation', 'contresort',
    'transfert', 'tribut', 'defausse', 'defausse-adverse', 'defaussePaquet', 'mue-mondiale',
    'empeche-blocage', 'empeche-attaque', 'cale',
  ]),
  flux: Object.freeze([
    'pioche', 'pioche-defausse', 'recherche', 'recherche-deck', 'butin', 'cargaison',
    'manaEngagement', 'soin', 'soin-creatures', 'recyclage', 'heures', 'jetons', 'lien',
  ]),
  tempo: Object.freeze([
    'rapidite', 'envol', 'esquive', 'contreAttaque', 'reactionTourAdverse', 'retour-main',
    'retour-apres-tours',
  ]),
});

/** La famille d'une clé, `null` quand la clé n'est pas répertoriée. */
export const PLAQUE_FAMILLE_EFFET = Object.freeze(
  Object.entries(CLES_PAR_FAMILLE).reduce((table, [famille, cles]) => {
    for (const cle of cles) table[cle] = famille;
    return table;
  }, {}),
);

/**
 * Le repli quand une clé n'est pas répertoriée (une nouvelle clé d'effet) :
 * c'est le symbole qui décide, jamais une teinte au hasard. Un symbole inconnu
 * tombe sur la garde — l'or, l'encre la plus neutre du jeu.
 */
const FAMILLE_PAR_SYMBOLE = Object.freeze({
  'i-degats': 'assaut',
  'i-coup-critique': 'assaut',
  'i-coup-rapide': 'assaut',
  'i-traque': 'assaut',
  'i-overkill': 'assaut',
  'i-furie': 'assaut',
  'i-abordage': 'assaut',
  'i-honneur': 'assaut',
  'i-protection': 'garde',
  'i-bouclier': 'garde',
  'i-tenacite': 'garde',
  'i-defenseur': 'garde',
  'i-provocation': 'garde',
  'i-aura': 'garde',
  'i-resonance': 'garde',
  'i-malediction': 'ombre',
  'i-vol-de-vie': 'ombre',
  'i-furtif': 'ombre',
  'i-infiltration': 'ombre',
  'i-contresort': 'ombre',
  'i-transfert': 'ombre',
  'i-defausse': 'ombre',
  'i-reanimation': 'ombre',
  'i-pioche': 'flux',
  'i-paquet': 'flux',
  'i-recherche': 'flux',
  'i-butin': 'flux',
  'i-cargaison': 'flux',
  'i-mana': 'flux',
  'i-soin': 'flux',
  'i-recyclage': 'flux',
  'i-heures': 'flux',
  'i-lien': 'flux',
  'i-rapidite': 'tempo',
  'i-envol': 'tempo',
  'i-esquive': 'tempo',
  'i-contre-attaque': 'tempo',
  'i-embuscade': 'tempo',
  'i-rebond': 'tempo',
});

/** La taille du symbole dans le carré de 32 : les pointes laissent moins de place. */
const SYMBOLE_PAR_FORME = Object.freeze({ diamant: 13, hexagone: 19 });

/** L'épaisseur de trait qui garde le même poids apparent, quelle que soit la forme. */
export const EPAISSEUR_SYMBOLE = Object.freeze(
  Object.entries(SYMBOLE_PAR_FORME).reduce((table, [forme, taille]) => {
    // Les symboles sont tracés sur 24 unités ; réduits à `taille`, un trait de
    // 1,75 unités de symbole ne pèse plus que 1,75 × taille / 24 à l'écran.
    table[forme] = Math.round((2 * 24 / taille) * 100) / 100;
    return table;
  }, {}),
);

const arrondi = (nombre) => Math.round(nombre * 100) / 100;

/** Les points d'un polygone, prêts pour l'attribut `points`. */
export const pointsSvg = (points) => points.map(([x, y]) => `${arrondi(x)},${arrondi(y)}`).join(' ');

/** Le même polygone, réduit vers le centre du carré. */
export function reduire(points, facteur, centre = PLAQUE_COTE / 2) {
  return points.map(([x, y]) => [
    centre + (x - centre) * facteur,
    centre + (y - centre) * facteur,
  ]);
}

/**
 * La moitié d'un polygone convexe au-dessus (ou au-dessous) de l'horizontale
 * `y` : c'est la facette claire du dessus et l'ombre du dessous. Les arêtes
 * coupées reçoivent leur point d'intersection, la silhouette reste donc close.
 */
export function moitie(points, { y = PLAQUE_COTE / 2, cote = 'haut' } = {}) {
  const dedans = ([, py]) => (cote === 'haut' ? py <= y : py >= y);
  const moitie = [];
  for (let index = 0; index < points.length; index += 1) {
    const debut = points[index];
    const fin = points[(index + 1) % points.length];
    const debutDedans = dedans(debut);
    if (debutDedans) moitie.push(debut);
    if (debutDedans !== dedans(fin)) {
      const part = (y - debut[1]) / (fin[1] - debut[1]);
      moitie.push([debut[0] + (fin[0] - debut[0]) * part, y]);
    }
  }
  return moitie;
}

/**
 * La pierre d'une clé d'effet : `{ cle, symbole, famille, forme, pierre }`.
 * Accepte une clé du vocabulaire (`butin`) comme un id de symbole (`i-butin`).
 */
export function plaqueEffet(cle) {
  const symbole = cle?.startsWith('i-') ? cle : (EFFET_ICONE[cle] ?? 'i-degats');
  const cleReperee = cle?.startsWith('i-')
    ? Object.keys(EFFET_ICONE).find((candidate) => EFFET_ICONE[candidate] === cle) ?? null
    : cle;
  const famille = PLAQUE_FAMILLE_EFFET[cleReperee] ?? FAMILLE_PAR_SYMBOLE[symbole] ?? 'garde';
  const { forme, pierre } = PLAQUE_FAMILLES[famille];
  return { cle: cleReperee, symbole, famille, forme, pierre };
}

/**
 * Le contenu d'une pierre, en balisage SVG (sans l'élément `<svg>`).
 *
 * L'ordre des couches fait tout le relief : la silhouette entière en encre
 * donne le liseré sombre, la réduction à 84 % le champ, la moitié haute la
 * lumière du biseau, la moitié basse l'ombre portée, et le trait de la
 * réduction le filet clair qui fait « taillé ». Le symbole vient en dernier,
 * blanc, au-dessus de tout.
 *
 * `protectionContre` teinte la pierre de l'élément repoussé (le Sable, sans
 * teinte, garde la pierre de sa famille).
 */
export function pierreEffet(cle, { protectionContre = null } = {}) {
  const plaque = plaqueEffet(cle);
  const silhouette = PLAQUE_FORMES[plaque.forme];
  const pierre = PLAQUE_PIERRES[plaque.pierre];
  const anneau = reduire(silhouette, 0.76);
  const champ = reduire(silhouette, 0.62);
  const lumiere = moitie(champ, { cote: 'haut' });
  const ombre = moitie(champ, { cote: 'bas' });
  const teinte = protectionContre ? couleurProtection(protectionContre) : null;
  const symbole = SYMBOLE_PAR_FORME[plaque.forme];
  const marge = arrondi((PLAQUE_COTE - symbole) / 2);
  return [
    `<polygon points="${pointsSvg(silhouette)}" fill="${pierre.encre}"/>`,
    `<polygon points="${pointsSvg(anneau)}" fill="${pierre.creux}"/>`,
    `<polygon points="${pointsSvg(champ)}" fill="${pierre.fond}"/>`,
    `<polygon points="${pointsSvg(lumiere)}" fill="${pierre.lueur}" fill-opacity=".24"/>`,
    `<polygon points="${pointsSvg(ombre)}" fill="${pierre.encre}" fill-opacity=".32"/>`,
    teinte ? `<polygon points="${pointsSvg(champ)}" fill="${teinte}" fill-opacity=".5"/>` : '',
    `<polygon points="${pointsSvg(champ)}" fill="none" stroke="${pierre.lueur}" stroke-opacity=".45" stroke-width=".9"/>`,
    `<use href="#${plaque.symbole}" x="${marge}" y="${marge}" width="${symbole}" height="${symbole}" fill="none" stroke="#ffffff" stroke-width="${EPAISSEUR_SYMBOLE[plaque.forme]}" stroke-linecap="round" stroke-linejoin="round"/>`,
  ].filter(Boolean).join('');
}

/**
 * La pierre complète, `<svg>` compris — pour un balisage écrit à la main
 * (page de revue, HTML figé). React passe par le même `pierreEffet`.
 */
export function plaqueSvg(cle, { size = 18, classe = '', titre = '', protectionContre = null } = {}) {
  const plaque = plaqueEffet(cle);
  const aria = titre ? ` role="img" aria-label="${titre}"` : ' aria-hidden="true"';
  const classes = `rpg-effet-icone${classe ? ` ${classe}` : ''}`;
  return `<svg class="${classes}" width="${size}" height="${size}" viewBox="0 0 ${PLAQUE_COTE} ${PLAQUE_COTE}" preserveAspectRatio="xMidYMid meet" data-plaque="${plaque.famille}" data-forme="${plaque.forme}" data-pierre="${plaque.pierre}" data-symbole="${plaque.symbole}"${protectionContre ? ` data-protection-contre="${protectionContre}"` : ''}${aria}>${pierreEffet(cle, { protectionContre })}</svg>`;
}
