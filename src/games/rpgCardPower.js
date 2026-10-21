/**
 * La puissance d'une carte du Sablier — l'échelle qui classe le catalogue.
 *
 * Deux questions se posent à chaque fois qu'un deck se compose : *quelle carte
 * est la meilleure ?* et *la meilleure de quel palier ?* Ce module répond aux
 * deux, avec une règle unique et vérifiable, pour que « les meilleures cartes
 * d'abord » ne soit pas une intention mais un calcul :
 *
 * 1. **Le palier de rareté** (`RPG_RANGS_RARETE`) passe avant tout : une
 *    mythique est une carte d'exception, une rare vaut mieux qu'une commune,
 *    même quand la commune a de bons chiffres. C'est la règle du jeu imprimé —
 *    la rareté dit ce que la carte vaut à la table.
 * 2. **La puissance** (`puissanceCarte`) départage les cartes d'un même
 *    palier : les chiffres (⚔ attaque, 🛡 défense), les capacités imprimées
 *    (envol, coup rapide, furie, overkill, résonance, esquive, protection, rapidité),
 *    les effets d'arrivée et le texte du sort — rapportés à ce que la carte
 *    coûte en mana. Une carte chère doit être plus forte qu'une carte bon
 *    marché pour la dépasser.
 *
 * Rien ici ne connaît le catalogue : les fonctions prennent une fiche de carte
 * (celle de `rpgCards.js`) et rendent un nombre. C'est ce qui permet aux
 * recettes de deck (`rpgDeckRecipes.js`) et au composeur (`rpgDeckComposer.js`)
 * de classer les cartes sans jamais importer le catalogue — donc sans cycle.
 */

/**
 * Les paliers de rareté, du plus faible au plus fort. Les clés sont celles de
 * `CARD_RARITIES` ; l'échelle reprend exactement l'ordre du jeu (commune <
 * inhabituelle < rare < mythique).
 */
export const RPG_RANGS_RARETE = {
  commune: 1,
  inhabituelle: 2,
  rare: 3,
  mythique: 4,
};

/** Rang d'une rareté inconnue : une carte sans rareté lisible compte comme commune. */
export function rangRarete(carte) {
  return RPG_RANGS_RARETE[carte?.rarity] ?? RPG_RANGS_RARETE.commune;
}

/**
 * La valeur d'un effet, sur la même échelle que les corps : les points de
 * dégâts, de soin, de bouclier ou de pioche, pondérés par ce qu'ils changent
 * réellement à la table. Une frappe sur *toutes* les créatures adverses vaut
 * plus qu'une frappe sur une seule ; un contresort qui arrête n'importe quelle
 * carte vaut mieux qu'un contresort qui n'arrête qu'un sort.
 */
function valeurEffet(effet = {}) {
  const montant = Number(effet.amount) || 0;
  switch (effet.type) {
    case 'degats': {
      const facteur = effet.cible === 'toutes-creatures' ? 1.9
        : effet.cible === 'toutes-autres' ? 1.4
        : effet.cible === 'sorcier' ? 1
          : 1.25;
      const echo = Number(effet.echo?.amount) || 0;
      // Le gel qui accompagne les dégâts (la Poigne de givre, le Verglas)
      // vaut un retrait de tempo en plus de la blessure ; un gel probabiliste
      // (la Brume du fjord, le Hurlement) se paie à son espérance.
      const chanceGel = Math.min(1, Math.max(0, Number(effet.gelChance) || 0));
      const gel = effet.gel ? 1.5 : chanceGel * 1.5;
      // `etSorcier` : le feu qui déborde de la table jusqu'au visage (le
      // Braisier du souk) se paie au même taux qu'un sort de dégâts direct.
      const exces = effet.etSorcier ? effet.etSorcier * 1.25 : 0;
      return montant * facteur + echo * 0.9 + gel + exces;
    }
    case 'transfert':
      // Le cœur pesé (set Ténèbres) : N PV quittent l'adversaire pour revenir
      // au camp — la valeur d'un dégât direct (1×) plus un demi-soin (0,5×),
      // jamais nommée « dégâts ». La pioche enchaînée (Grande Pesée) paie en plus.
      return montant * 1.5 + (Number(effet.pioche) || 0) * 1.5;
    case 'defausse-adverse':
      // UNE carte arrachée à une main adverse — la victime choisit, donc
      // toujours sa moins utile : valeur d'un tempo lent, plafonnée.
      return 2.4;
    case 'defaussePaquet':
      // Une carte du paquet adverse au cimetière : usure du paquet, et
      // fatigue du mode sans terrains à terme.
      return montant * 0.9;
    case 'soin':
      return montant * 0.5;
    case 'soin-creatures':
      return montant * 0.65;
    case 'pioche':
      // Une pioche tribale garantit une carte du type cherché s'il en reste
      // dans le deck : elle vaut davantage qu'une pioche aveugle, sans valoir
      // un choix libre dans tout le paquet.
      return montant * (effet.tribu ? 2.1 : 1.5);
    case 'pioche-defausse':
      return (Number(effet.pioche) || 0) * 1.2 - (Number(effet.defausse) || 0) * 0.4;
    case 'bouclier':
      return montant * 0.7;
    case 'bouclier-lumiere':
      return 2.5;
    case 'brouillard':
      // Une attaque entière annulée : la même échelle qu'un bon retrait.
      return 3;
    case 'blocage-force':
      return 1.5;
    case 'arme':
      return (Number(effet.atk) || 0) * 0.8 + (Number(effet.def) || 0) * 0.6 + (effet.coupRapide ? 2 : 0);
    case 'buff': {
      const atk = Number(effet.atk) || 0;
      const def = Number(effet.def) || 0;
      // Un débuff (l'Embuscade) vaut par ce qu'il retire à l'adversaire :
      // ses chiffres comptent en valeur absolue, plus le blocage forcé.
      if (effet.cible === 'creatures-adverses' || atk < 0 || def < 0) {
        return Math.abs(atk) * 0.8 + Math.abs(def) * 0.6 + (effet.blocageForce ? 1 : 0) + 0.5;
      }
      const plein = atk * 0.8 + def * 0.6 + (effet.overkill ? 1.2 : 0)
        + (effet.arriveesAbordage ? 1.5 : 0);
      // Le Grand Débarquement ne renforce que les cales pleines : le renfort
      // ne tient que si la course a déjà pris — rabais pour conditionnel.
      return effet.caleOccupeeSeulement ? plein * 0.7 : plein;
    }
    case 'arrivees-abordage':
      // La Lettre de marque : chaque créature du reste du tour accoste en
      // prenant — lu comme le mot-clé Abordage prêté à toute une vague.
      return 1.5;
    case 'prochaine-arrivee-abordage':
      // Le Pilote de la Carreira : une seule prochaine pose accoste en
      // prenant — une capture d’Abordage, pas davantage.
      return 1.5;
    case 'debuff': {
      // Le venin de la Vipère : les chiffres retirés valent comme un débuff
      // de `buff`, et les interdits de combat ont leur prix — la défense
      // réduite tue, l'attaque volée se remplace, le blocage interdit non.
      const atk = Math.abs(Number(effet.atk) || 0);
      const def = Math.abs(Number(effet.def) || 0);
      return atk * 0.8 + def * 0.6
        + (effet.empecheAttaque ? 1.5 : 0)
        + (effet.empecheBlocage ? 1 : 0);
    }
    case 'empeche-blocage':
      // La lune dévorée de Bakunawa : la défense adverse s'éteint un tour.
      return 1.5;
    case 'donne':
      // Le Faiseur de passage : un mot-clé prêté pour le tour.
      return effet.donne?.infiltration ? 2.5 : (effet.donne?.rapidite ? 0.5 : 0);
    case 'infiltration': {
      // +X/+Y durable si la carte les porte (`atk`/`def`), et le passe-droit
      // Infiltration pour l'échange en cours. Tin Hinan n'accorde ni stats ni
      // passe-droit à elle-même — sa valeur tient dans le +2 du camp.
      const bonus = (Number(effet.atk) || 0) * 0.8 + (Number(effet.def) || 0) * 0.6;
      return bonus + 2;
    }
    case 'recyclage':
      // Cimetière → main : la carte recyclée vaut un peu moins qu'une pioche
      // (elle est connue), le choix libre — toute la Liste — un cran au-dessus.
      return effet.cible === 'carte-cimetiere' ? 2 : 1.5;
    case 'reanimation-porteur':
      return 4; // Retour conditionnel, sans l’arme et avec seulement 1 DEF.
    case 'reanimation':
      // Cimetière → table : un corps qui revient, arrivées comprises. C'est
      // une créature entière à crédit, d'où le prix de carte entière.
      return 6;
    case 'heures': {
      // Le compte à rebours du beffroi : l'effet final à crédit, minoré pour
      // l'attente (deux tours en général — le dernier compteur fait sonner).
      const effets = Array.isArray(effet.effetFinal) ? effet.effetFinal : [effet.effetFinal].filter(Boolean);
      return effets.reduce((total, sous) => total + valeurEffet(sous ?? {}), 0) * 0.7;
    }
    case 'destruction-totale':
      return 8; // Nettoyage symétrique : détruit aussi le champ allié.
    case 'destruction-coutmax':
      // Celui qui juge : détruire les créatures à petit coût est un nettoyage
      // de terrain sélectif, plus faible qu'une destruction totale.
      return 5 + Math.min(2, Number(effet.coutMax) || 0);
    case 'exil':
      return 6;
    case 'retour-main':
      // La vague du Léviathan : renvoyer toute la table entière vaut une
      // tempête ; le renvoi ciblé reste un rebond ordinaire.
      return effet.cible === 'toutes-autres' ? 6 : 2;
    case 'degats-tueur':
      // Le Brûlot : 2 dégâts à la créature qui le détruit — une riposte de
      // mort, comptée comme des dégâts ciblés mais conditionnés au combat
      // (protections, boucliers et esquives s'appliquent).
      return montant * 0.9;
    case 'retour-apres-tours': {
      // Le retour d'Anqa : différé et dégressif — deux tours valent 2,5,
      // chaque tour de plus retire 0,375 (quatre tours ≈ 1,75). Le sorcier a
      // le temps de préparer la tombe.
      const tours = Math.max(2, Number(effet.tours) || 2);
      return Math.max(1, 2.5 - (tours - 2) * 0.375);
    }
    case 'contresort':
      return effet.cible === 'carte' ? 3.5 : 2.5;
    case 'destruire-terrain-aleatoire':
      return 2;
    case 'combat':
      return 2;
    // Les trois effets nés avec le lot d'équipements du Sable : un mana rendu
    // vaut un peu plus qu'un mana posé (il arrive au moment de l'attaque), une
    // lecture de deck vaut la moitié d'une pioche (le terrain n'est pas
    // garanti), et un compteur de Jitte vaut le mode qu'il paiera.
    case 'sable':
      return montant * 1.2;
    case 'regarder-dessus':
      return 1.5;
    case 'compteurs-arme':
      return montant * 2;
    default:
      return 0;
  }
}

/**
 * La valeur brute d'une carte : ses chiffres, ses capacités, son texte. C'est
 * le « corps » de la carte, avant toute considération de mana — les terrains
 * valent zéro (ils ne se choisissent pas pour leur puissance mais pour le mana
 * qu'ils produisent).
 */
export function valeurCarte(carte) {
  if (!carte || carte.kind === 'terrain') return 0;
  if (carte.kind === 'arme') {
    // Une arme vaut ce qu'elle ajoute à son porteur : les chiffres d'abord,
    // puis le mot-clé donné (aux mêmes prix que sur une créature), puis le
    // déclenché de combat, lu comme un effet de dégâts ordinaire.
    let valeur = 1.3 * (carte.bonus?.atk ?? 0) + (carte.bonus?.def ?? 0);
    if (carte.donne?.envol) valeur += 2.5;
    if (carte.donne?.bouclier) valeur += 0.7 * Math.max(0, Number(carte.donne.bouclier) || 0);
    if (carte.donne?.infiltration) valeur += 2.5;
    if (carte.donne?.esquive) valeur += 1.5;
    if (carte.donne?.furie) valeur += 0.7 + 0.55 * carte.donne.furie;
    if (carte.donne?.overkill) valeur += 1.2;
    if (carte.donne?.immunite) valeur += 2;
    // Une protection de couleur permanente (la Jitte d'Amayas) : ni ciblage ni
    // blessure de cette couleur tant que l'arme tient — au prix d'une immunité.
    if (carte.donne?.protection) valeur += 2.5;
    if (carte.donne?.rapidite) valeur += 0.5;
    if (carte.donne?.coupRapide) valeur += 2;
    if (carte.donne?.tribut) valeur += 1.6 * carte.donne.tribut;
    // L'Abordage d'arme (le Grappin d'abordage) : la capture à l'attachement,
    // au seuil imprimé — le même prix que le mot-clé sur une créature, saisi
    // au moment où le crochet mord.
    if (Number.isFinite(carte.abordage)) valeur += 1.5;
    // Le Grappin « dynamique » : le seuil suit le coût du porteur augmenté,
    // presque toujours plus haut que l’ancien seuil fixe — un cran au-dessus.
    if (carte.abordageDynamique) valeur += 2;
    // La prime de prise en cale (le Grappin) : un soin conditionnel, une fois
    // par capture — lu comme l'effet de soin qu'il est.
    if (carte.priseEnCale) valeur += valeurEffet(carte.priseEnCale);
    // L'arme qui pose un bouclier sur son porteur (la Hache de la banquise) :
    // il absorbe les premières blessures, au prix d'un bouclier de sort.
    if (carte.donne?.bouclier) valeur += 0.7 * carte.donne.bouclier;
    // Le prix de l'attachement : l'arme qui blesse son porteur vaut moins,
    // d'autant plus que la morsure est profonde.
    if (carte.blessurePorteur) valeur -= 1.2 * carte.blessurePorteur;
    if (carte.declenche?.effet) valeur += valeurEffet(carte.declenche.effet);
    // Les déclencheurs du porteur (lot du Sable,
    // `docs/rpg/14-equipements-du-sable.md`) : ce que l'arme rapporte à
    // CHAQUE attaque vaut davantage que le même effet joué une seule fois —
    // d'où le coefficient. Un jeton appelé au combat vaut son corps.
    if (carte.porteurAttaque) valeur += valeurEffet(carte.porteurAttaque) * 1.5;
    if (carte.porteurBlesseCreature) valeur += valeurEffet(carte.porteurBlesseCreature) * 1.5;
    if (carte.porteurBlesseSorcier) {
      valeur += valeurEffet(carte.porteurBlesseSorcier) * 1.5
        + (carte.porteurBlesseSorcier.type === 'jetons' ? 2.5 : 0);
    }
    if (carte.porteurBlesse) valeur += valeurEffet(carte.porteurBlesse) * 2;
    // Le Licou du chien de sable : deux cartes, payées du porteur.
    if (carte.porteurMeurt) valeur += valeurEffet(carte.porteurMeurt) * 0.8;
    // L'arme vivante se joue la table vide : elle apporte son propre bras.
    if (carte.armeVivante) valeur += 2.5;
    // Un jeton appelé à l'arrivée (le serpent du Bâton) vaut sa frappe d'un
    // tour ; la capacité activée vaut l'option de le rappeler à volonté.
    if (carte.arrivee?.type === 'jetons') valeur += 3;
    if (carte.activation) valeur += 3;
    return valeur;
  }
  if (carte.kind === 'magie') {
    let valeur = valeurEffet(carte.effet ?? {});
    // Un sort qui pioche en plus de son effet (le Courant de retour, la
    // Défection) vaut ce que vaut la carte qu'il ramène.
    if (carte.effet?.pioche) valeur += Number(carte.effet.pioche) * 1.5;
    return valeur;
  }
  if (carte.kind === 'site') {
    const attente = Math.max(1, Number(carte.site?.compteurs) || 1);
    const finale = carte.site?.recompense === 'bimini'
      ? 13 // +3/+3, soin complet, Protection contre les sorts et Tenacité
      : Math.max(0, Number(carte.site?.pioche) || 0) * 1.5;
    // La persistance et l'indestructibilité ont un prix, minoré par l'attente.
    return 2 + finale * Math.max(0.45, 1 - attente * 0.12);
  }
  let valeur = 1.3 * (carte.atk ?? 0) + (carte.def ?? 0);
  if (carte.envol) valeur += 2.5;
  if (carte.infiltration) valeur += 2.5;
  if (carte.coupRapide) valeur += 2;
  // La Traque du Chasseur : +N/+0 contre les seules proies de la course —
  // un tiers de la force brute, elle ne frappe pas à tous les combats.
  if (carte.traquePirates) valeur += 0.4 * carte.traquePirates;
  // Provocation détourne un bloqueur vers ce corps et ouvre la voie aux
  // autres attaquants : une pression tactique, sans valoir l'Infiltration.
  if (carte.provocation) valeur += 1;
  // Une créature qui ne peut pas attaquer garde sa force en blocage, mais
  // ne menace jamais directement le sorcier adverse.
  if (carte.nePeutPasAttaquer) valeur -= 0.5 * Math.max(0, Number(carte.atk) || 0);
  if (carte.rapidite) valeur += 0.5;
  if (carte.esquive) valeur += 1.5;
  if (carte.protection) valeur += 1.5;
  if (carte.furie) valeur += 0.7 + 0.55 * carte.furie;
  if (carte.overkill) valeur += 1.5;
  if (carte.resonance) valeur += 2 + 2 * carte.resonance;
  if (carte.honneur) valeur += carte.honneur;
  if (carte.combat) valeur += 2;
  if (carte.aura) valeur += 2.5;
  // Bannière : chaque attaque d'un Samouraï du camp laisse un +X/+X définitif
  // à l'attaquant — un renfort récurrent, un cran au-dessus d'une aura fixe.
  if (carte.banniere) valeur += 3;
  // Butin (le set Sable) : chaque contact avec le sorcier adverse fait
  // piocher puis défausser — une carte qui creuse, jouée à chaque attaque.
  if (carte.butin) valeur += 1.2;
  // Tribut (set Ténèbres) : chaque contact avec le sorcier adverse transfère
  // des PV — pesé au même rythme que le Butin, un peu en dessous.
  if (carte.tribut) valeur += 0.9 * carte.tribut;
  // Abordage (set Lettres de Marque) : la capture à L'ARRIVÉE — un retrait de
  // table garanti à la pose, qu'un exil ou un renvoi peut défaire, entre le
  // Butin et l'Envol.
  if (carte.abordage) valeur += 1.5;
  // Les Deux Visages (La Barbe Noire) : l'autre visage vaut un second corps —
  // la muraille quand la frappe manque, la frappe quand le mur s'effondre.
  if (carte.alternance) valeur += 1.5;
  // L'insaisissable (La Barbe Noire) : la cale adverse ne la prend jamais —
  // une rébellion permanente contre la signature du set d'en face.
  if (carte.insaisissable) valeur += 1;
  // Cargaison (set Lettres de Marque) : l'assurance du convoi — la pioche ne
  // joue qu'à la mort ou à la prise, donc sous le prix d'une pioche sèche.
  if (carte.cargaison) valeur += 0.9 * carte.cargaison;
  // Le déclencheur de prise (le Négociant) : une carte par créature mise en
  // cale, des deux côtés de la mer — un rendement incertain, un prix modéré.
  if (carte.declenchePrise) valeur += 1.2 * carte.declenchePrise;
  if (carte.arrivee) valeur += valeurEffet(carte.arrivee);
  // L'effet de destruction n'arrive que si la créature tombe : compté, mais
  // à 80 % — la mort n'est pas une garantie, et certaines tombent trop tard.
  if (carte.destruction) valeur += valeurEffet(carte.destruction) * 0.8;
  if (carte.activation) valeur += valeurEffet(carte.activation.effet) + 1;
  return valeur;
}

/**
 * La puissance d'une carte : son palier de rareté d'abord (×10, pour qu'aucune
 * carte d'un palier ne puisse dépasser une carte du palier supérieur), puis sa
 * valeur rapportée à son mana — le rendement. Une carte à 1 mana qui rend 4
 * vaut mieux qu'une carte à 6 manas qui rend 14 : la première se joue plus tôt
 * et laisse du mana pour la suite.
 */
export function puissanceCarte(carte) {
  if (!carte || carte.kind === 'terrain') return 0;
  // Un Prix en PV (set Ténèbres) alourdit le vrai coût : à rendement égal,
  // une carte qui se paie en vie vaut moins qu'une carte au mana seul.
  const cout = Math.max(1.5, (Number(carte.cost) || 1) + (Number(carte.prixPv) || 0) * 0.6);
  return rangRarete(carte) * 10 + valeurCarte(carte) / cout;
}

/**
 * Le comparateur des decks : le palier d'abord, la puissance ensuite, puis le
 * mana le plus bas (à puissance égale, la carte la plus jouable d'abord), et
 * l'identifiant pour que deux cartes ex æquo gardent toujours le même ordre —
 * une recette doit rendre exactement la même liste à chaque exécution.
 */
export function comparerCartesParPuissance(a, b) {
  return rangRarete(b) - rangRarete(a)
    || puissanceCarte(b) - puissanceCarte(a)
    || (a?.cost ?? 0) - (b?.cost ?? 0)
    || String(a?.id).localeCompare(String(b?.id));
}
