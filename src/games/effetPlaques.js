/**
 * Les pierres d'effets — la plaque d'emblème sur laquelle chaque pictogramme
 * du Sablier vient se poser.
 *
 * La grammaire est celle des emblèmes de héros : plus de trait doré posé à
 * même le texte, mais une **pierre taillée** — fond saturé, anneau en creux,
 * liseré sombre, et le symbole en blanc pur au centre.
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
 * pictogramme 12 (diamant) à 19 (hexagone) — les formes pointues laissent moins
 * de place au centre, et le trait garde la même épaisseur apparente partout
 * (voir `EPAISSEUR_SYMBOLE`).
 *
 * Rien ici ne dépend de React : la géométrie et le balisage se testent seuls
 * (`tests/rpg-effets-pierres.test.js`) et la page de revue
 * `scripts/effets-pierres-preview.mjs` les assemble sans navigateur.
 */

import { EFFET_ICONE } from './effetIcons.js';

/** Le côté du carré de dessin, en unités de `viewBox`. */
export const PLAQUE_COTE = 32;

/**
 * Les silhouettes, en unités du carré de 32. Toutes sont centrées sur (16, 16)
 * et symétriques : la moitié haute et la moitié basse se découpent donc sur
 * l'horizontale du milieu (voir `moitie`).
 */
export const PLAQUE_FORMES = Object.freeze({
  diamant: Object.freeze([[16, 1.6], [30.4, 16], [16, 30.4], [1.6, 16]]),
  // L'hexagone remplit son carré de plus près que le premier dessin : à 18 px
  // sur une face de carte, une pierre étroite se lisait comme un pois à côté
  // de son pictogramme. Il garde ses pointes haute et basse, mais s'ouvre
  // jusqu'aux bords (28 de large sur 30 de haut, contre 25 sur 28,8).
  hexagone: Object.freeze([[16, 1], [30, 8.5], [30, 23.5], [16, 31], [2, 23.5], [2, 8.5]]),
});

/**
 * Les pierres : `encre` borde, `creux` fait l'anneau, `fond` remplit. `lueur`
 * garde la teinte claire de la famille — les repères taillés ne s'en servent
 * plus depuis que le champ est franc, mais la palette reste complète.
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
const SYMBOLE_PAR_FORME = Object.freeze({ diamant: 16, hexagone: 20 });

/**
 * L'épaisseur du biseau, forme par forme. L'hexagone ouvre largement son champ
 * (70 % de la silhouette) : c'est lui qui porte le plus de couleur. Le diamant,
 * dont les quatre pointes rognent le centre, garde un champ plus resserré —
 * sans quoi le pictogramme déborderait sur son contour.
 */
const BISEAU_PAR_FORME = Object.freeze({
  diamant: Object.freeze({ anneau: 0.92, champ: 0.84 }),
  hexagone: Object.freeze({ anneau: 0.9, champ: 0.8 }),
});

/** Le contour d'encre ajouté autour de la silhouette, en unités de 32. */
const CONTOUR = 1.4;

/** Le trait du pictogramme, en unités de pierre (32 pour le carré) : 2,2 sur
 * 32 donne 1,1 px de trait sur la pierre de 16 px du doigt, 2,1 px sur celle de
 * 32 px de l'aperçu — lisible aux deux bouts sans empâter le dessin. */
const EPAISSEUR_CIBLE = 2.2;

/** Le halo d'encre qui double le pictogramme : 1,6 unité de pierre de plus,
 * pour que le blanc se détache aussi des pierres claires (or, sable, azur). */
const CONTOUR_SYMBOLE = 1.6;

/** L'épaisseur de trait qui garde le même poids apparent, quelle que soit la forme. */
/** L'épaisseur de trait qui garde le même poids apparent, quelle que soit la forme. */
export const EPAISSEUR_SYMBOLE = Object.freeze(
  Object.entries(SYMBOLE_PAR_FORME).reduce((table, [forme, taille]) => {
    // Les symboles sont tracés sur 24 unités ; réduits à `taille`, un trait de
    // 1,75 unités de symbole ne pèse plus que 1,75 × taille / 24 à l'écran —
    // d'où la compensation pour viser `EPAISSEUR_CIBLE` sur la pierre.
    table[forme] = Math.round((EPAISSEUR_CIBLE * 24 / taille) * 100) / 100;
    return table;
  }, {}),
);

/** Le halo sombre du pictogramme, forme par forme — même poids apparent : le
 * trait blanc, plus `CONTOUR_SYMBOLE` unités de pierre de chaque côté. */
export const HALO_SYMBOLE = Object.freeze(
  Object.entries(EPAISSEUR_SYMBOLE).reduce((table, [forme]) => {
    table[forme] = Math.round(((EPAISSEUR_CIBLE + CONTOUR_SYMBOLE) * 24 / SYMBOLE_PAR_FORME[forme]) * 100) / 100;
    return table;
  }, {}),
);

/* ── Une nuance par effet ────────────────────────────────────────────────────
   Le registre donne l'ancre (braise, or, ténèbres, émeraude, azur), mais deux
   effets d'une même famille ne doivent pas se confondre : quinze Assauts tous
   du même rouge ne se reconnaissaient qu'en lisant le pictogramme. Chaque clé
   reçoit donc **sa** nuance, déduite de sa place dans sa famille : la teinte
   pivote de part et d'autre de l'ancre, la lumière monte ou descend d'un cran,
   et la parité décale encore l'un des deux — deux effets voisins diffèrent
   toujours sur les deux axes à la fois. La famille reste lisible (on reste dans
   les rouges, les ors, les verts), chaque effet devient identifiable. */

/** `#rrggbb` → `{ h, s, l }` (h en degrés, s et l en 0–1). */
function versHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const v = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, v, b);
  const min = Math.min(r, v, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((v - b) / d + (v < b ? 6 : 0)) / 6;
  else if (max === v) h = ((b - r) / d + 2) / 6;
  else h = ((r - v) / d + 4) / 6;
  return { h: h * 360, s, l };
}

const borne = (valeur, min, max) => Math.min(max, Math.max(min, valeur));

/** `{ h, s, l }` → `#rrggbb`. */
function versHex({ h, s, l }) {
  const teinte = ((h % 360) + 360) % 360 / 360;
  const saturation = borne(s, 0, 1);
  const lumiere = borne(l, 0, 1);
  if (saturation === 0) {
    const gris = Math.round(lumiere * 255).toString(16).padStart(2, '0');
    return `#${gris}${gris}${gris}`;
  }
  const q = lumiere < 0.5 ? lumiere * (1 + saturation) : lumiere + saturation - lumiere * saturation;
  const p = 2 * lumiere - q;
  const canal = (t) => {
    const u = ((t % 1) + 1) % 1;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  const octet = (valeur) => Math.round(borne(valeur, 0, 1) * 255).toString(16).padStart(2, '0');
  return `#${octet(canal(teinte + 1 / 3))}${octet(canal(teinte))}${octet(canal(teinte - 1 / 3))}`;
}

/** Décale une couleur en teinte (degrés) et en lumière (points de %). */
export function decaler(hex, degres, lumiere = 0) {
  const { h, s, l } = versHsl(hex);
  return versHex({ h: h + degres, s, l: l + lumiere / 100 });
}

/** Trois couleurs fixes, selon le type d'effet (sans variation par clé). */
export function teinteEffet(cle) {
  const { famille } = plaqueEffet(cle);
  const registre = { assaut: 'braise', tempo: 'azur', garde: 'azur',
    ombre: 'tenebres', flux: 'tenebres' }[famille];
  return PLAQUE_PIERRES[registre] ?? PLAQUE_PIERRES.braise;
}

/**
 * Les teintes des éléments — la pastille de couleur et le disque de coût
 * prennent la même pierre que les effets, en hexagone et en losange.
 */
export const ELEMENT_TEINTES = Object.freeze({
  braise: '#a8282d',
  eau: '#2f6fae',
  sable: '#c1922c',
  neige: '#4f9fc4',
  tenebres: '#6b3fa0',
});

/** La palette d'une plaque nue, à partir d'une couleur de base. */
export function palettePlaque(base) {
  return Object.freeze({
    encre: decaler(base, 0, -34),
    creux: decaler(base, 0, -18),
    fond: base,
    lueur: decaler(base, 0, 22),
  });
}

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
 * Le fond est volontairement **simple** : la silhouette en encre donne le
 * liseré sombre, l'anneau en creux la marche du biseau, et le champ la couleur
 * pleine. Rien d'autre — ni moitié éclaircie, ni ombre basse, ni filet
 * intérieur : à la taille d'une carte (18 à 40 px), ces trois couches se
 * mélangeaient en une tache et salissaient la couleur de l'effet. Une pierre,
 * c'est une silhouette, un ourlet et un champ franc. Le pictogramme vient en
 * dernier, blanc, au-dessus de tout.
 *
 * `protectionContre` teinte la pierre de l'élément repoussé (le Sable, sans
 * teinte, garde la pierre de sa famille).
 */
export function pierreEffet(cle, { protectionContre = null } = {}) {
  const plaque = plaqueEffet(cle);
  const silhouette = PLAQUE_FORMES[plaque.forme];
  // Trois couleurs de type ; le pictogramme distingue les effets du même type.
  const pierre = teinteEffet(cle);
  const biseau = BISEAU_PAR_FORME[plaque.forme];
  const anneau = reduire(silhouette, biseau.anneau);
  const champ = reduire(silhouette, biseau.champ);

  const symbole = SYMBOLE_PAR_FORME[plaque.forme];
  const marge = arrondi((PLAQUE_COTE - symbole) / 2);
  return [
    `<polygon points="${pointsSvg(silhouette)}" fill="${pierre.encre}" stroke="${pierre.encre}" stroke-width="${CONTOUR}" stroke-linejoin="round"/>`,
    `<polygon points="${pointsSvg(anneau)}" fill="${pierre.creux}"/>`,
    `<polygon points="${pointsSvg(champ)}" fill="${pierre.fond}"/>`,
    // Le halo d'encre passe avant le blanc : il sépare le pictogramme du champ
    // quand la pierre est claire, et le fait lire d'un coup d'œil à 16 px.
    `<use href="#${plaque.symbole}" x="${marge}" y="${marge}" width="${symbole}" height="${symbole}" color="${pierre.encre}" fill="none" stroke="${pierre.encre}" stroke-opacity=".55" stroke-width="${HALO_SYMBOLE[plaque.forme]}" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<use href="#${plaque.symbole}" x="${marge}" y="${marge}" width="${symbole}" height="${symbole}" color="#ffffff" fill="none" stroke="#ffffff" stroke-width="${EPAISSEUR_SYMBOLE[plaque.forme]}" stroke-linecap="round" stroke-linejoin="round"/>`,
  ].filter(Boolean).join('');
}

/**
 * Une plaque **nue** : la même pierre — silhouette d'encre, anneau, champ —
 * mais sans pictogramme. C'est elle qui porte la pastille de couleur (hexagone) et
 * le losange de coût : les trois repères d'une carte se lisent donc dans la
 * même grammaire, à la même taille, et seule la silhouette dit ce qu'on
 * regarde.
 *
 * `bases` : une couleur, ou deux pour un coût hybride — le champ reçoit alors
 * un dégradé diagonal d'une couleur à l'autre.
 */
export function plaqueNue({ forme = 'hexagone', bases = [ELEMENT_TEINTES.braise] } = {}) {
  const silhouette = PLAQUE_FORMES[forme];
  const biseau = BISEAU_PAR_FORME[forme];
  const anneau = reduire(silhouette, biseau.anneau);
  const champ = reduire(silhouette, biseau.champ);
  const couleurs = (bases.length ? bases : [ELEMENT_TEINTES.braise]).slice(0, 2);
  const pierre = palettePlaque(couleurs[0]);
  const idDegrade = `plaque-${couleurs.join('').replace(/#/g, '')}`;
  const champSvg = couleurs.length > 1
    ? `<defs><linearGradient id="${idDegrade}" x1="0" y1="1" x2="1" y2="0">`
      + `<stop offset="0" stop-color="${couleurs[0]}"/>`
      + `<stop offset="1" stop-color="${couleurs[1]}"/>`
      + '</linearGradient></defs>'
      + `<polygon points="${pointsSvg(champ)}" fill="url(#${idDegrade})"/>`
    : `<polygon points="${pointsSvg(champ)}" fill="${pierre.fond}"/>`;
  return [
    `<polygon points="${pointsSvg(silhouette)}" fill="${pierre.encre}" stroke="${pierre.encre}" stroke-width="${CONTOUR}" stroke-linejoin="round"/>`,
    `<polygon points="${pointsSvg(anneau)}" fill="${pierre.creux}"/>`,
    champSvg,
  ].join('');
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
