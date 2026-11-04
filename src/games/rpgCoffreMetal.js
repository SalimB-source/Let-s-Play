/**
 * Le métal d'un coffre de quête, choisi par ce qu'il rapporte.
 *
 * La règle est volontairement lisible d'un coup d'œil : **plus le coffre paie,
 * plus le métal est noble**. Le joueur n'a pas à lire le nombre pour savoir
 * lequel des trois coffres du jour vaut le détour — la couleur le lui dit
 * avant le chiffre.
 *
 * Les seuils tombent entre les récompenses réellement tirées par
 * `rpgQuetes.js`, jamais au milieu d'une valeur :
 *
 *   55, 60 ◈            → bronze   (les quêtes faciles)
 *   65, 70, 75 ◈        → argent   (les moyennes, et « le sorcier saigne »)
 *   80, 100 ◈           → or       (les difficiles, le Cachet, la Semaine)
 *
 * Le module est pur et sans dépendance : la palette vit ici pour que le dessin
 * (`RpgCoffreDore.jsx`) et les tests lisent la même source, et le CSS retrouve
 * le palier via l'attribut `data-coffre-metal`.
 *
 * Les identifiants `bronze` / `argent` / `or` sont ceux de `rpgCoffresQuetes.js`
 * (la rangée mobile) : le joueur retrouve le même vocabulaire d'un écran à
 * l'autre. Là-bas le métal suit le palier de la quête ; ici il suit le gain,
 * ce qui revient au même pour les quêtes et donne l'or au Cachet et à la
 * Semaine sans règle supplémentaire.
 */

/** En dessous, le bronze. */
export const SEUIL_ARGENT = 65;
/** À partir de là, l'or. */
export const SEUIL_OR = 80;

/**
 * Les trois métaux, du moins noble au plus noble.
 *
 * Chaque palette décrit la matière sous la lumière : `face` dégradé vertical
 * de la caisse, `cote` le flanc droit dans l'ombre, `dessus` le couvercle
 * bombé, `bande` les ferrures, `lueur` ce qui sort du coffre ouvert, `gemme`
 * la pierre sertie sur le couvercle.
 */
export const METAUX_COFFRE = Object.freeze({
  bronze: Object.freeze({
    id: 'bronze',
    nom: 'bronze',
    face: Object.freeze(['#f6cd9b', '#d9924e', '#a05f26', '#5f3411']),
    cote: Object.freeze(['#8a4f1e', '#4a2809']),
    dessus: Object.freeze(['#ffe0b4', '#e0a05a', '#a2612a']),
    bande: Object.freeze(['#ffe6c2', '#c9803a', '#6b3c14']),
    reflet: '#fff6e8',
    lueur: Object.freeze(['#fff0d2', '#ff9d3c']),
    gemme: Object.freeze(['#ffd08a', '#e07b2a', '#8a3f08']),
  }),
  argent: Object.freeze({
    id: 'argent',
    nom: 'argent',
    face: Object.freeze(['#fdfeff', '#dfe9f4', '#9db0c6', '#5b6c81']),
    cote: Object.freeze(['#7d8fa4', '#3f4c5c']),
    dessus: Object.freeze(['#ffffff', '#e6eef7', '#a4b6c9']),
    bande: Object.freeze(['#ffffff', '#c3d2e2', '#6d7f94']),
    reflet: '#ffffff',
    lueur: Object.freeze(['#f2f9ff', '#8fc4f0']),
    gemme: Object.freeze(['#d8f4ff', '#5fb8e8', '#1f6d9e']),
  }),
  or: Object.freeze({
    id: 'or',
    nom: 'or',
    face: Object.freeze(['#fff6c4', '#f7c944', '#c08c14', '#7a5205']),
    cote: Object.freeze(['#9c6b0e', '#543703']),
    dessus: Object.freeze(['#fffbcf', '#ffd75e', '#b8830f']),
    bande: Object.freeze(['#fff8d8', '#dfa524', '#7d5406']),
    reflet: '#fffdf0',
    lueur: Object.freeze(['#fff6cf', '#ffc23c']),
    gemme: Object.freeze(['#ffd2d2', '#e8434a', '#8c1220']),
  }),
});

/** L'ordre de lecture, du moins noble au plus noble. */
export const ORDRE_METAUX = Object.freeze(['bronze', 'argent', 'or']);

/**
 * Le métal qui correspond à un gain.
 *
 * Un montant absent ou aberrant retombe sur le bronze plutôt que sur l'or :
 * un coffre dont on ignore la valeur ne doit pas promettre le meilleur butin.
 */
export function metalPourGain(montant) {
  const gain = Number(montant);
  if (!Number.isFinite(gain)) return 'bronze';
  if (gain >= SEUIL_OR) return 'or';
  if (gain >= SEUIL_ARGENT) return 'argent';
  return 'bronze';
}

/** La palette d'un métal (`bronze` par défaut si l'identifiant est inconnu). */
export function paletteCoffre(metal) {
  return METAUX_COFFRE[metal] ?? METAUX_COFFRE.bronze;
}

/** Les trois libellés, pour les lecteurs d'écran et les infobulles. */
const LIBELLES_COFFRE = Object.freeze({
  bronze: 'coffre de bronze',
  argent: "coffre d'argent",
  or: "coffre d'or",
});

/**
 * « coffre d'or », « coffre d'argent »… d'après le gain.
 *
 * Le métal ne doit pas être une information purement visuelle : un joueur qui
 * ne voit pas les couleurs l'entend dans le libellé du bouton.
 */
export function libelleCoffre(montant) {
  return LIBELLES_COFFRE[metalPourGain(montant)];
}
