/**
 * Le Sablier — le texte court des aperçus de cartes.
 *
 * La règle imprimée d'une carte sert au jeu, à la recherche et au guide : elle
 * reste **entière** dans le catalogue (`rpgCards.js`). Mais une preview posée
 * au-dessus de la table n'a pas la place de réciter trois lignes de règles :
 * certaines cartes dépassaient l'encadré, qui coupait la fin sans aucun moyen
 * de la lire.
 *
 * Ces helpers ne font que **présenter** le texte : les mots-clés expliqués par
 * une pastille jaune ne sont pas redits sous elle. Les cibles, durées, Liens et
 * autres effets absents des pastilles restent lisibles (voir `rpg-battle.css`).
 * Les anciens raccourcis « en bref » sont conservés pour leurs autres usages.
 *
 * Aucun texte de carte n'est modifié : le moteur, les icônes d'effet et les
 * fiches lisibles continuent de recevoir la règle d'origine.
 */

import { texteCombatIndividuel } from './effetIcons.js';

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
  [/Provocation\s*[-—:]\s*[^.]*\./gu, 'Provocation : cible prioritaire.'],
  [/Tenacité\s*[-—:]\s*Une fois par partie, quand (?:il|elle) meurt \(sauf exilé\), (?:il|elle) revient en jeu au début de votre prochain tour avec 1 point de défense\.?/gu, 'Tenacité : revient une fois.'],
  [/Overkill\s*[-—:]\s*Quand (?:il|elle) attaque et qu[’']on (?:le|la) bloque, l[’']excédent de sa force au-delà des bloqueurs perce jusqu[’']au sorcier adverse\.?/gu, 'Overkill : perce les bloqueurs.'],
  [/Protection contre les sorts\s*[-—:]\s*Aucun sort \(Magie Rapide ou Sorcellerie\) ne peut (?:le|la) cibler ni (?:le|la) blesser\.?/gu, 'Immunisé contre les sorts.'],
  [/Mur\s*[-—:]\s*Cette créature ne peut pas attaquer et ne peut pas être équipée\.?/gu, 'Mur : ne peut pas attaquer.'],
  [/Doit bloquer\s*[-—:]\s*Cette créature doit bloquer une créature attaquante adverse chaque tour si possible\.?/gu, 'Doit bloquer.'],
  [/Priorité d[’']attaque rapide\s*[-—:]\s*Les créatures adverses avec Attaque rapide doivent attaquer cette tour en priorité si elles peuvent\.?/gu, 'Attire les attaques rapides.'],
  [/Attaque ciblée\s*[-—:]\s*[^.]*\./gu, 'Attaque ciblée : créature adverse ou attaque directe, selon les priorités.'],
  // Le nom du porteur n'est pas figé : Eirik, Tojiro, Kusayla — la capacité est
  // la même, la phrase qui la définit aussi.
  // Deux formulations coexistent dans le catalogue : « quand c’est un sort qui
  // le cible » (Tojiro, Kusayla) et « quand c’est un sort — ciblé ou de zone —
  // qui l’atteint » (Eirik). Le motif accepte les deux, sinon la règle entière
  // restait imprimée dans un aperçu qui n’a pas la place.
  [/Contre-attaque\s*[-—:]\s*Quand une créature adverse (?:le|la) frappe avec Attaque ciblée ou (?:le|la) cible avec une capacité, [^.;]+ lui inflige ses dégâts d[’']attaque ; quand c[’']est un sort[^.;]*? qui (?:l[’']atteint|(?:le|la) cible), la riposte frappe le sorcier adverse\.?/gu, 'Contre-attaque : riposte aux coups et aux sorts.'],
  // La Compagnie d'Eirik, en une ligne : le détail chiffré reste sur la fiche.
  [/Compagnie\s*[-—:]\s*Tant qu[’']il est en jeu, [^.]* gagne \+1\/\+1 pour chaque autre créature viking de son camp\./gu, 'Compagnie : +1/+1 par autre Viking de son camp.'],
];

function texteBrut(carte) {
  const brut = typeof carte === 'string' ? carte : texteCombatIndividuel(carte);
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

/**
 * Ne laisser dans une preview que les précisions que les pastilles ne disent
 * pas déjà. La comparaison de mots est volontairement stricte : une portée,
 * une cible, une durée ou un Lien différents restent imprimés.
 * `lecture` est la lecture de `effetsDetailles` (sections explicites déjà
 * transférées vers leurs pastilles), jamais le texte brut de la carte.
 */
export function texteApercuSansDoublons(lecture) {
  const texte = lecture?.texte?.trim();
  if (!texte) return '';
  const pastilles = lecture.pastilles ?? [];
  const mots = (phrase) => String(phrase).normalize('NFD').replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase().match(/[a-z0-9]+/gu) ?? [];
  const empreinte = (phrase) => mots(phrase).sort().join(' ');
  const expliqueDeja = (phrase) => {
    const tokens = mots(phrase);
    if (tokens.length < 4) return false;
    const normalise = tokens.join(' ');
    return pastilles.some(({ description }) => {
      if (!description) return false;
      const definition = mots(description).join(' ');
      return definition.includes(normalise) || empreinte(phrase) === empreinte(description);
    });
  };

  return texte.split(/\n+|(?<=[.!?])\s+/u).map((phrase) => {
    if (expliqueDeja(phrase)) return '';
    // Le Contresort décrit déjà l'annulation : ne laisser que les types de
    // cartes qu'il peut contrer et, le cas échéant, la pioche supplémentaire.
    if (pastilles.some((pastille) => pastille.cle === 'contresort' && pastille.description)) {
      const contre = phrase.match(/^Magie Rapide — Contre(?:z)? (.+?)(?:, puis (piochez .+))?\.$/iu);
      if (contre) return `Cible : ${contre[1]}.${contre[2] ? ` Puis ${contre[2]}.` : ''}`;
    }
    if (pastilles.some((pastille) => pastille.cle === 'debuff' && pastille.description)) {
      const malus = phrase.match(/^.+ donne -\d+\/-\d+ à (une créature ciblée)\.$/iu);
      if (malus) return `Cible : ${malus[1].replace(/ ciblée$/u, '')}.`;
    }
    // Quand le Renfort et l'Overkill ont chacun leur pastille, ne garder que
    // leur portée et leur durée, absentes des deux explications.
    if (['buff', 'overkill'].every((cle) => pastilles.some((pastille) => pastille.cle === cle && pastille.description))) {
      const portee = phrase.match(/^(?:Jusqu’à la fin du tour, )?(.+?) gagn(?:e|ent) \+\d+\/\+\d+ et Overkill(?: jusqu’à la fin du tour)?\.$/iu)?.[1];
      if (portee) return `Jusqu’à la fin du tour, ces effets s’appliquent à ${portee.toLowerCase()}.`;
    }
    if (pastilles.some((pastille) => pastille.cle === 'buff' && pastille.description)
      && /gagnent \+\d+\/\+\d+ et /u.test(phrase)) {
      return phrase.replace(/gagnent \+\d+\/\+\d+ et /u, 'gagnent aussi ');
    }
    // La cible et le déclencheur de ce Bouclier restent utiles, mais sa
    // mécanique (« le prochain sort… ») est déjà dans la pastille jaune.
    if (pastilles.some((pastille) => pastille.cle === 'bouclier' && pastille.description)) {
      return phrase.replace(/(\breçoit un bouclier)\s*(?:—|:|qui bloque)\s*le prochain sort ou effet de créature adverse\b.*$/iu, '$1.');
    }
    // Les deux gains sont déjà identifiés comme « (furie) » sur les pastilles.
    if (/^Tant que sa Furie est active, il gagne aussi Overkill et Envol\.$/u.test(phrase)
      && ['envol', 'overkill'].every((cle) => pastilles.some((pastille) => pastille.cle === cle && pastille.label.includes('(furie)')))) return '';
    return phrase;
  }).filter(Boolean).join(' ');
}

/** La phrase courte à imprimer en tête d'une preview. Vide sans texte de règle. */
export function resumeCarte(carte, limite = LIMITE_RESUME) {
  return raccourcirTexte(simplifierRegleCarte(carte), limite);
}

/** Vrai quand la règle complète ne tient pas dans un petit encadré d'aperçu. */
export function regleCarteLongue(carte, seuil = SEUIL_REGLE_LONGUE) {
  return texteBrut(carte).length > seuil;
}

/**
 * La condition d'Embuscade à mettre en avant dans les aperçus.
 * Le catalogue reste la seule source du texte ; la règle et la condition du
 * moteur ne changent pas. Les cartes sans Embuscade conditionnelle n'ont pas
 * d'encadré.
 */
export function conditionEmbuscadePourApercu(carte) {
  if (!carte?.reactionTourAdverse || !carte?.conditionEmbuscade) return null;
  const phrase = carte.text?.match(
    /^Embuscade\s*—\s*Vous pouvez jouer (?:cette créature|ce héros) pendant le tour adverse seulement (?:si |en réponse à )([^.]+)\./u,
  );
  return phrase?.[1]?.trim() ?? null;
}

/* Conditions courtes pour le cadre violet. Les morceaux d'index impair sont
 * les mots clés mis en gras ; les clés suivent celles du moteur, pas le nom
 * des cartes. La règle imprimée et le fonctionnement restent inchangés. */
const CONDITIONS_EMBUSCADE_COURTES = {
  'creature-jouee-main': ['une ', 'créature adverse', ' est jouée depuis la main'],
  'adversaire-blesse': ['une ', 'créature adverse blessée'],
  attaquant: ['l’adversaire ', 'attaque'],
  'djinn-adverse': ['il y a un ', 'Djinn', ' en face'],
  'autre-vampire': ['vous avez un ', 'autre Vampire', ' en jeu'],
  'trois-adversaires': ['l’adversaire a au moins ', '3 créatures'],
  'attaquant-force-2': ['une créature adverse de ', 'force 2+', ' attaque'],
  'attaquant-force-3': ['une créature adverse de ', 'force 3+', ' attaque'],
  'allie-cible': ['une de vos créatures est ', 'visée', ' par un sort, un effet ou une ', 'Attaque ciblée'],
  'deux-attaquants': ['l’adversaire attaque avec au moins ', '2 créatures'],
  'vampire-attaque': ['un de vos ', 'Vampires', ' est visé par une ', 'Attaque ciblée', ' ou ', 'bloque', ' une attaque'],
  'vampire-bloqueur': ['un de vos ', 'Vampires', ' ', 'bloque', ' une attaque'],
  'vie-inferieure': ['vous avez ', 'moins de PV', ' que l’adversaire'],
  'attaque-ciblee': ['une ', 'Attaque ciblée', ' adverse vise une de vos ', 'créatures'],
  'adversaire-force-4': ['l’adversaire a une créature de ', 'force 4+'],
};

/** Texte du cadre ; le texte imprimé reste un repli pour un futur cas inconnu. */
export function conditionEmbuscadeCourtePourApercu(carte) {
  const condition = conditionEmbuscadePourApercu(carte);
  return condition ? (CONDITIONS_EMBUSCADE_COURTES[carte.conditionEmbuscade] ?? [condition]) : null;
}
