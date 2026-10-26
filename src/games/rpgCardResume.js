/**
 * Le Sablier — le texte court des aperçus de cartes.
 *
 * La règle imprimée d'une carte sert au jeu, à la recherche et au guide : elle
 * reste **entière** dans le catalogue (`rpgCards.js`). Mais une preview posée
 * au-dessus de la table n'a pas la place de réciter trois lignes de règles :
 * certaines cartes dépassaient l'encadré, qui coupait la fin sans aucun moyen
 * de la lire.
 *
 * Ces helpers ne font que **présenter** le texte : l'aperçu montre une phrase
 * « en bref » (mots-clés raccourcis, précisions entre parenthèses retirées,
 * coupure propre à la fin d'un mot), et garde la règle complète juste
 * dessous, dans un bloc qui défile (voir `rpg-battle.css`).
 *
 * Aucun texte de carte n'est modifié : le moteur, les icônes d'effet et les
 * fiches lisibles continuent de recevoir la règle d'origine.
 */

/** Au-delà, une règle est « longue » : l'aperçu ajoute son résumé et défile. */
export const SEUIL_REGLE_LONGUE = 180;

/** Longueur maximum du résumé, en caractères — deux ou trois lignes à l'écran. */
export const LIMITE_RESUME = 118;

/**
 * Les explications de mots-clés déjà nommés par les pastilles de la carte.
 * On garde l'effet utile, pas la définition complète du mot-clé : la règle
 * entière reste lisible en dessous. Les motifs couvrent les variantes
 * masculin/féminin et les deux apostrophes employées dans le catalogue.
 */
const RACCOURCIS = [
  [/Rapidité\s*[-—:]\s*(?:Cette créature )?[Pp]eut attaquer le tour où (?:elle|il) arrive\.?/gu, 'Rapidité : attaque dès l’arrivée.'],
  [/Butin\s*[-—:]\s*Quand cette créature touche le sorcier adverse, piochez une carte puis défaussez-en une\.?/gu, 'Butin : piochez 1, défaussez 1.'],
  [/Envol\s*[-—:]\s*Ne peut être bloqué[e]? que par une créature avec Envol\.?/gu, 'Envol.'],
  [/Provocation\s*[-—:]\s*Quand cette créature attaque, elle doit être bloquée par au moins une créature si possible\.?/gu, 'Provocation : doit être bloquée.'],
  [/Tenacité\s*[-—:]\s*Une fois par partie, quand (?:il|elle) meurt \(sauf exilé\), (?:il|elle) revient en jeu au début de votre prochain tour avec 1 point de défense\.?/gu, 'Tenacité : revient une fois.'],
  [/Overkill\s*[-—:]\s*Quand (?:il|elle) attaque et qu[’']on (?:le|la) bloque, l[’']excédent de sa force au-delà des bloqueurs perce jusqu[’']au sorcier adverse\.?/gu, 'Overkill : perce les bloqueurs.'],
  [/Protection contre les sorts\s*[-—:]\s*Aucun sort \(Magie Rapide ou Sorcellerie\) ne peut (?:le|la) cibler ni (?:le|la) blesser\.?/gu, 'Immunisé contre les sorts.'],
  [/Mur\s*[-—:]\s*Cette créature ne peut pas attaquer et ne peut pas être équipée\.?/gu, 'Mur : ne peut pas attaquer.'],
  [/Doit bloquer\s*[-—:]\s*Cette créature doit bloquer une créature attaquante adverse chaque tour si possible\.?/gu, 'Doit bloquer.'],
  [/Priorité d[’']attaque rapide\s*[-—:]\s*Les créatures adverses avec Attaque rapide doivent attaquer cette tour en priorité si elles peuvent\.?/gu, 'Attire les attaques rapides.'],
  [/Attaque ciblée\s*[-—:]\s*Sélectionné[e]? pour attaquer,[^.]*\./gu, 'Attaque ciblée : peut attaquer n’importe quelle créature adverse.'],
  // Le nom du porteur n'est pas figé : Eirik, Tojiro, Kusayla — la capacité est
  // la même, la phrase qui la définit aussi.
  [/Contre-attaque\s*[-—:]\s*Quand une créature adverse (?:le|la) frappe avec Attaque ciblée ou (?:le|la) cible avec une capacité, [^.;]+ lui inflige ses dégâts d[’']attaque ; quand c[’']est un sort qui (?:le|la) cible, la riposte frappe le sorcier adverse\.?/gu, 'Contre-attaque : riposte aux coups et aux sorts.'],
];

function texteBrut(carte) {
  const brut = typeof carte === 'string' ? carte : carte?.text;
  if (typeof brut !== 'string') return '';
  const propre = brut.replace(/\s+/gu, ' ').trim();
  return propre && propre !== '—' ? propre : '';
}

/** La règle d'une carte, débarrassée des explications de mots-clés verbeuses. */
export function simplifierRegleCarte(carte) {
  const brut = texteBrut(carte);
  if (!brut) return '';
  return RACCOURCIS
    .reduce((texte, [motif, remplacement]) => texte.replace(motif, remplacement), brut)
    // Les parenthèses ne portent que des précisions (pourcentages, exemples).
    .replace(/\s*\([^)]*\)/gu, '')
    .replace(/\s+/gu, ' ')
    .replace(/\s+([.;:,])/gu, '$1')
    .trim();
}

/** Coupe sur un blanc, jamais au milieu d'un mot, et marque la suite d'une ellipse. */
export function raccourcirTexte(texte, limite = LIMITE_RESUME) {
  const propre = String(texte ?? '').replace(/\s+/gu, ' ').trim();
  if (!propre) return '';
  const maximum = Math.max(24, Math.floor(limite));
  if (propre.length <= maximum) return propre;
  const debut = propre.slice(0, maximum);
  const dernier = Math.max(
    debut.lastIndexOf(' '),
    debut.lastIndexOf(','),
    debut.lastIndexOf(';'),
  );
  const morceau = (dernier > maximum * 0.55 ? debut.slice(0, dernier) : debut)
    .replace(/[\s,;:.–—-]+$/u, '');
  return `${morceau || debut.trimEnd()}…`;
}

/** La phrase courte à imprimer en tête d'une preview. Vide sans texte de règle. */
export function resumeCarte(carte, limite = LIMITE_RESUME) {
  return raccourcirTexte(simplifierRegleCarte(carte), limite);
}

/** Vrai quand la règle complète ne tient pas dans un petit encadré d'aperçu. */
export function regleCarteLongue(carte, seuil = SEUIL_REGLE_LONGUE) {
  return texteBrut(carte).length > seuil;
}
