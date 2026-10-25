/**
 * Le cerveau du sorcier — décisions tactiques de l’IA du duel.
 *
 * Le moteur (`rpgDuel.js`) reste seul responsable des règles ; ce module ne
 * choisit que des coups : quoi jouer, quoi cibler, comment bloquer, quand
 * attaquer. Chaque décision suit une heuristique expliquable — pas de magie
 * noire, pas de coup surprise — et reste déterministe en niveau « Normale ».
 *
 * Profils (le crochet du mode Histoire : chaque sorcier d’une tour peut
 * porter le sien) :
 *  - niveau : 'recit' | 'normale' | 'veilleur' | 'sablier' | 'oubliee'
 *      · récit    → se trompe volontairement (cibles et blocages approximatifs)
 *      · normale  → anticipe un coup et compare les séquences avec le moteur
 *      · veilleur → explore plus de réponses, anticipe trois coups, cherche le létal et garde son burn
 *      · sablier  → le niveau de la Tour du Sablier renversé : quatre coups
 *        d'avance, plus de réponses explorées à chaque pas, aucune erreur —
 *        le meilleur cerveau du jeu, réservé aux maîtres absolus.
 *      · oubliee  → le cerveau de L'Oublié, et de lui seul : cinq coups
 *        d'avance, une réponse de plus à chaque pas. Il reste borné (la
 *        recherche ne doit jamais figer le navigateur) : c'est la seule marche
 *        au-dessus du Sablier, et elle n'existe que pour le dernier étage de la
 *        Tour Oubliée.
 *  - style  : 'agressif' | 'equilibre' | 'prudent' | 'controle'
 *      · biaise attaques, blocages, priorité du burn et du contrôle du plateau.
 */

import {
  RPG_ELEMENTS,
  armeById,
  cardColorCost,
  cardColors,
  cardHasPrintedType,
  cardResonanceGroup,
  cardReceivesResonance,
  duelCardById,
  magieById,
  terrainById,
  terrainManaColors,
} from './rpgCards.js';
import { RPG_MODE_MANA_ESSAI } from './rpgManaEssai.js';
// Accès différé au moteur (cycle d'import maîtrisé : aucune de ces fonctions
// n'est appelée pendant l'évaluation des modules) — il s'agit ici de tester la
// solvabilité réelle avec exactement les mêmes règles de paiement que le jeu.
import * as moteur from './rpgDuel.js';

export const RPG_NIVEAUX_IA = ['recit', 'normale', 'veilleur', 'sablier', 'oubliee'];
export const RPG_STYLES_IA = ['agressif', 'equilibre', 'prudent', 'controle'];

const autre = (cote) => (cote === 'joueur' ? 'sorcier' : 'joueur');

/** Normalise un profil : toute valeur inconnue retombe sur la difficulté normale. */
export function rpgProfilIA(ia = null) {
  const niveau = RPG_NIVEAUX_IA.includes(ia?.niveau) ? ia.niveau : 'normale';
  const style = RPG_STYLES_IA.includes(ia?.style) ? ia.style : 'equilibre';
  return {
    niveau,
    style,
    /** Probabilité de rater volontairement le « bon » coup (niveau Récit). */
    tauxErreur: niveau === 'recit' ? 0.4 : 0,
    /** Les niveaux Veilleur et Sablier calculent les lignes létales et ménagent leur burn. */
    prescience: niveau === 'veilleur' || niveau === 'sablier' || niveau === 'oubliee',
    /** Le niveau Normal anticipe un coup ; le Veilleur prépare une séquence
     *  de trois, le Sablier une séquence de quatre, L'Oublié une de cinq. */
    profondeur: niveau === 'oubliee' ? 5
      : niveau === 'sablier' ? 4 : niveau === 'veilleur' ? 3 : niveau === 'normale' ? 2 : 0,
    /** Largeur bornée : plus fort en Veilleur, plus large encore en Sablier,
     *  et un cran de plus pour L'Oublié — sans bloquer le navigateur (la
     *  recherche reste bornée par le mana). */
    largeur: niveau === 'oubliee' ? 6
      : niveau === 'sablier' ? 5 : niveau === 'veilleur' ? 4 : niveau === 'normale' ? 3 : 1,
  };
}

/**
 * Durée visible de réflexion, variable selon la difficulté et la complexité
 * du plateau. Le temps laisse aussi lire les cartes déjà jouées : le niveau
 * Veilleur prend davantage de recul que l'Initiation.
 */
export function rpgDelaiReflexionIA(duel, cote = 'sorcier') {
  const profil = rpgProfilIA(duel?.[cote]?.ia ?? null);
  const base = profil.niveau === 'oubliee' ? 1620
    : profil.niveau === 'sablier' ? 1380 : profil.niveau === 'veilleur' ? 1120 : profil.niveau === 'normale' ? 760 : 480;
  const adversaire = autre(cote);
  const creatures = (duel?.[cote]?.creatures?.length ?? 0)
    + (duel?.[adversaire]?.creatures?.length ?? 0);
  const cartesEnMain = Math.min(5, duel?.[cote]?.main?.length ?? 0);
  // Le Sablier compte ses grains un à un : sa réflexion visible dépasse le
  // plafond des autres niveaux, le temps de lire la menace qu'il prépare.
  const plafond = profil.niveau === 'oubliee' ? 2200 : profil.niveau === 'sablier' ? 1900 : 1550;
  return Math.min(plafond, base + Math.min(300, creatures * 42 + cartesEnMain * 18));
}

const optionsIA = (duel, cote, options = {}) => ({
  profil: rpgProfilIA(options.ia ?? duel?.[cote]?.ia ?? null),
  rng: options.rng ?? Math.random,
});

// ── Évaluations de base ─────────────────────────────────────────────────────

/** Le Serpent du monde : protégé contre les magies et les sorcelleries —
 *  une carte `magie` ne peut ni le viser ni le toucher, l'IA l'écarte. */
function horsDAtteinteDuSort(entite, carte) {
  if (carte?.kind !== 'magie') return false;
  if (entite?.protectionSorts) return true;
  const couleurs = cardColors(carte);
  const contre = entite?.protectionSortsContre;
  return Boolean(contre && couleurs.some((couleur) => [contre].flat(Infinity).includes(couleur)));
}

/** Version locale du test de protection (pur, sans dépendance au moteur). */
function estProtegee(entite, couleurs) {
  // Les Sites partagent les emplacements du champ, jamais les règles de
  // créature : aucune cible, aucun échange ni équipement.
  if (duelCardById(entite?.carteId)?.kind === 'site') return true;
  const liste = [...new Set((Array.isArray(couleurs) ? couleurs.flat(Infinity) : [couleurs]).filter(Boolean))];
  // `contre` accepte une couleur seule ou une liste (la Lionne du midi ardent).
  const contre = [...new Set([entite?.protection?.contre].flat(Infinity).filter(Boolean))];
  // L’Armure de cendres confère une immunité permanente tant qu’elle est
  // portée : l’IA doit respecter la même protection que le moteur, notamment
  // quand elle cherche un bloqueur contre son porteur.
  const immunites = [...new Set([armeById(entite?.arme?.carteId)?.donne?.immunite]
    .flat(Infinity).filter(Boolean))];
  return Boolean(liste.length && (
    (entite?.protection?.toursRestants > 0 && contre.some((couleur) => liste.includes(couleur)))
    || immunites.some((couleur) => liste.includes(couleur))
  ));
}

/** Couleurs imprimées d'une entité en jeu — celles qui frappent quand elle
 *  attaque ou qu'elle bloque. Un jeton sans fiche n'a pas de couleur : aucune
 *  protection ne s'oppose à ses coups. */
function couleursEntite(entite) {
  return cardColors(duelCardById(entite?.carteId));
}

/** Dégâts qu'un coup de ces couleurs laisse vraiment : la protection fait
 *  écran à TOUT dégât de la couleur protégée, quelle que soit sa source —
 *  attaque, capacité, magie — exactement comme `rpgBlesserCreature`. */
function degatsSubis(entite, montant, couleursSource, sourceType = 'attaque') {
  if (estProtegee(entite, couleursSource)) return 0;
  return degatsApresEsquive(entite, montant, sourceType);
}

/** Blessure nette d'un coup de ces couleurs (Esquive, bouclier, protection). */
function blessureSousCouleurs(entite, montant, couleursSource, sourceType = 'attaque') {
  return estProtegee(entite, couleursSource) ? 0 : blessureNette(entite, montant, sourceType);
}

/** La créature meurt-elle sous ce coup-là ? La protection la sauve. */
function meurtSousCouleurs(entite, montant, couleursSource, sourceType = 'attaque') {
  return !estProtegee(entite, couleursSource) && meurtSous(entite, montant, sourceType);
}

/** Gelée (la Poigne de givre, le Verglas) : ni attaque ni blocage. */
function estGelee(entite) {
  return (entite?.gelToursRestants ?? 0) > 0;
}

/** Infiltration : inbloquable, par personne — permanente (imprimée ou par
 *  l'arme portée) ou accordée jusqu'à la fin du tour.
 *  Envol : seul un bloqueur volant arrête un volant.
 *  Attaque ciblée : un attaquant qui frappe une créature voit son attaque
 *  s'arrêter — personne ne se met en travers de cette frappe-là. */
function peutBloquerAttaquant(bloqueur, attaquant, frappePrecoce = false) {
  if (!bloqueur || !attaquant) return false;
  if ([bloqueur, attaquant].some((entite) => duelCardById(entite?.carteId)?.kind === 'site')) return false;
  if (frappePrecoce) return false;
  if (attaquant.infiltration) return false;
  return !attaquant.envol || Boolean(bloqueur.envol);
}

/**
 * Dégâts effectifs après Esquive : une attaque, une Magie ou une Sorcellerie
 * a 30 % de chance d'être entièrement esquivée, soit 70 % de ses dégâts en
 * espérance. Les capacités ne s'esquivent pas.
 */
export function degatsApresEsquive(entite, montant, sourceType = 'attaque') {
  const degats = Math.max(0, Number(montant) || 0);
  return entite?.esquive && ['attaque', 'magie'].includes(sourceType)
    ? degats * (1 - moteur.RPG_ESQUIVE_CHANCE)
    : degats;
}

/**
 * Blessure nette encaissée : ce qui reste après l’Esquive puis le bouclier.
 * Une attaque entièrement absorbée n’est pas une blessure — la Furie attend
 * le premier sang, exactement comme le moteur.
 */
export function blessureNette(entite, montant, sourceType = 'attaque') {
  const apresEsquive = degatsApresEsquive(entite, montant, sourceType);
  return Math.max(0, apresEsquive - Math.max(0, entite?.bouclier ?? 0));
}

/** Furie **nouvellement** gagnée par une créature blessée qui survit : le coup
 *  doit la faire passer sous sa DEF de base imprimée, et une Furie déjà active
 *  ne se regagne pas. Elle peut venir de la créature elle-même ou de son arme. */
export function furieGagnee(entite, degatsRecus) {
  const carte = duelCardById(entite?.carteId);
  const furie = Math.max(0, Number(carte?.furie) || 0)
    + Math.max(0, Number(armeById(entite?.arme?.carteId)?.donne?.furie) || 0);
  const degats = Math.max(0, Number(degatsRecus) || 0);
  const pv = Number(entite?.pv ?? entite?.def) || 0;
  const defenseDeBase = Number(carte?.def ?? entite?.pvMax ?? entite?.def ?? pv) || 0;
  const pvApres = pv - degats;
  return furie > 0 && degats > 0 && !entite?.furieDeclenchee
    && pvApres > 0 && pvApres < defenseDeBase ? furie : 0;
}

/** L’entité meurt-elle sous un coup de ce type (bouclier compris) ?
 *  Le moteur tue à 0 PV : dégâts ≥ PV + bouclier, pas strictement plus.
 *  La **Tenacité** (le Seigneur des mâchoires, le Maître du marteau) ne
 *  refuse plus la destruction : la créature meurt ici comme une autre, et ne
 *  revient qu'au tour suivant, avec 1 point de défense. L'IA peut donc tuer
 *  une créature tenace sans se tromper — le corps perdu n'est pas sauvé. */
function meurtSous(entite, montant, sourceType = 'attaque') {
  return degatsApresEsquive(entite, montant, sourceType)
    >= (entite.bouclier ?? 0) + Math.max(0, entite.pv ?? 0);
}

/** Une créature peut-elle bloquer ? Ni engagée, ni gelée, ni privée de sa
 *  défense par le venin de la Vipère ou la lune de Bakunawa
 *  (`empecheBlocageToursRestants`) — la même porte que `peutBloquer` du
 *  moteur. L'oublier fait refuser l'attaque entière (`raison: 'bloqueur'`). */
function peutBloquerEntite(entite) {
  return Boolean(entite) && duelCardById(entite?.carteId)?.kind !== 'site'
    && !entite.attaquee && !estGelee(entite)
    && !(entite.empecheBlocageToursRestants > 0);
}

/**
 * Valeur tactique d’une créature en jeu : stats, réserves, mots-clés,
 * capacités. Sert à comparer des échanges (« ma 2/2 contre sa 4/4 »).
 */
export function valeurEntite(entite) {
  const carte = duelCardById(entite?.carteId) ?? {};
  let valeur = (entite?.atk ?? 0) * 1.3
    + Math.max(0, entite?.pv ?? entite?.def ?? 0) * 1.1
    + (entite?.bouclier ?? 0) * 1.1
    + (entite?.esquive ? 1.6 : 0)
    + (entite?.contreAttaque || carte.contreAttaque ? 1.8 : 0)
    + Math.max(0, carte.cost ?? 0) * 0.4;
  if (entite?.envol) valeur += 2.5;
  // Envol et Overkill prêtés par la Furie (le Maître du marteau) : l'état
  // vivant les porte, la carte les déclare dans `furieGains` — une Furie qui
  // n'est pas encore allumée garde ce potentiel.
  else if (carte.furieGains?.envol) valeur += 0.9;
  if (entite?.coupRapide) valeur += 2;
  if (entite?.provocation || carte.provocation) valeur += 0.8;
  if (entite?.nePeutPasAttaquer || carte.nePeutPasAttaquer) {
    valeur -= 0.5 * Math.max(0, Number(entite?.atk) || 0);
  }
  if (entite?.rapidite) valeur += 0.5;
  if (entite?.protection) valeur += 1.5;
  if (entite?.overkill || carte.overkill || carte.furieGains?.overkill) valeur += 1.2;
  // Tenacité : la créature meurt bien, mais sa carte revient au prochain tour
  // avec 1 point de défense — un corps gratuit vaut un peu plus que ses PV
  // affichés, sans valoir une créature qui refuse la destruction.
  if (entite?.tenaciteDisponible) valeur += 1;
  // Bouclier de lumière (la Dame aux ailes d'or, Salem) : la prochaine attaque
  // ou magie ne passe pas — un rempart d'un coup, à ne pas sous-estimer.
  if (entite?.bouclierLumiere) valeur += 2;
  // Furie : +X/+0 tant que la défense reste sous la DEF de base. Active, le bonus
  // est déjà dans l'attaque ; inactive, il reste un gain latent — y compris
  // après un soin qui l'a éteinte.
  if (carte.furie && !entite?.furieDeclenchee) valeur += 0.7 + carte.furie * 0.55;
  // Résonance : aura de table du type imprimé par la source.
  if (carte.resonance) valeur += 2 + carte.resonance * 2;
  // Bannière : chaque attaque d'un Samouraï du camp grandit l'attaquant pour de
  // bon — la source vaut plus que sa seule présence, elle récompense l'attaque.
  if (carte.banniere) valeur += 2;
  if (carte.arrivee) valeur += 1.5;
  if (carte.destruction) valeur += 1;
  if (carte.honneur) valeur += carte.honneur;
  // Butin (le Chien du guet) : chaque touche au sorcier rapporte une carte.
  if (carte.butin) valeur += 0.8;
  if (carte.combat) valeur += 2;
  // L'arme portée : bonus et mot-clé sont déjà dans les chiffres et les champs
  // de l'entité (envol, esquive lus plus haut) ; seul le déclenché s'ajoute.
  if (entite?.arme && armeById(entite.arme.carteId)?.declenche) valeur += 1.5;
  return valeur;
}

/** Force d'Overkill qui traverse un bloqueur : ce qui dépasse ses PV et son
 *  bouclier continue jusqu'au sorcier, comme dans le moteur. */
function excesOverkill(attaquant, bloqueur) {
  if (!attaquant?.overkill || !bloqueur) return 0;
  const encaissable = Math.max(0, (Number(bloqueur.pv ?? bloqueur.def) || 0)
    + Math.max(0, Number(bloqueur.bouclier) || 0));
  return Math.max(0, (Number(attaquant.atk) || 0) - encaissable);
}

/** Dégâts « préalables » d’un déclencheur de combat — nuls sans déclencheur
 *  correspondant à l’attaque ou au blocage en cours. */
function degatsAvantCombat(carte, quand) {
  if (carte?.combat?.type !== 'degats-creature-combattue') return 0;
  if (carte.combat.quand && carte.combat.quand !== quand) return 0;
  return Math.max(0, Number(carte.combat.amount) || 0);
}

/**
 * Résultat d’un échange de combat simple, du point de vue du défenseur, en
 * respectant l’ordre réel du moteur : les capacités préalables frappent
 * d’abord, les blessures normales ne s’échangent qu’entre survivants.
 */
export function resultatBlocage(attaquant, bloqueur) {
  const carteA = duelCardById(attaquant?.carteId) ?? {};
  const carteB = duelCardById(bloqueur?.carteId) ?? {};
  // Couleurs des deux combattants : la protection fait écran aux coups de la
  // couleur protégée, capacité préalable comprise. Un bloqueur protégé contre
  // la couleur de l'attaquant encaisse donc 0 et survit toujours ; un attaquant
  // protégé contre la couleur du bloqueur ne subit, lui, aucune riposte — le
  // moteur refuse d'ailleurs ce blocage-là (`rpgEstProtegee` sur l'attaquant).
  const couleursA = cardColors(carteA);
  const couleursB = cardColors(carteB);
  const degatsB = degatsAvantCombat(carteB, 'blocage');
  const degatsA = degatsAvantCombat(carteA, 'attaque');
  const typeB = carteB.combat?.sourceType ?? 'capacite';
  const typeA = carteA.combat?.sourceType ?? 'capacite';
  let blessureA = blessureSousCouleurs(attaquant, degatsB, couleursB, typeB);
  let blessureB = blessureSousCouleurs(bloqueur, degatsA, couleursA, typeA);
  const attaquantVit = !meurtSousCouleurs(attaquant, degatsB, couleursB, typeB);
  const bloqueurVit = !meurtSousCouleurs(bloqueur, degatsA, couleursA, typeA);
  let attaquantMeurt = !attaquantVit;
  let bloqueurMeurt = !bloqueurVit;
  if (attaquantVit && bloqueurVit) {
    // Bouclier de lumière (la Dame aux ailes d'or, Salem) : la PREMIÈRE attaque
    // ou magie ne touche pas — elle éteint le bouclier à sa place. Un coup de
    // capacité, lui, passe outre. Le bouclier du bloqueur avale donc la frappe
    // de l'attaquant, celui de l'attaquant avale la riposte.
    const forceAttaquant = bloqueur?.bouclierLumiere ? 0 : (attaquant.atk ?? 0);
    const forceBloqueur = attaquant?.bouclierLumiere ? 0 : (bloqueur.atk ?? 0);
    attaquantMeurt = meurtSousCouleurs(attaquant, forceBloqueur, couleursB, 'attaque');
    bloqueurMeurt = meurtSousCouleurs(bloqueur, forceAttaquant, couleursA, 'attaque');
    blessureA += blessureSousCouleurs(attaquant, forceBloqueur, couleursB, 'attaque');
    blessureB += blessureSousCouleurs(bloqueur, forceAttaquant, couleursA, 'attaque');
  }
  return {
    attaquantMeurt,
    bloqueurMeurt,
    // Survivre blessé, c’est entrer en furie : l’IA ne l’oublie pas.
    attaquantFurie: attaquantMeurt ? 0 : furieGagnee(attaquant, blessureA),
    bloqueurFurie: bloqueurMeurt ? 0 : furieGagnee(bloqueur, blessureB),
  };
}

/** Menace offensive d’une créature : ce qu’elle pèse sur la course aux PV. */
function menace(entite) {
  return (entite?.atk ?? 0) * 1.2 + valeurEntite(entite) * 0.4;
}

// ── Ciblage ─────────────────────────────────────────────────────────────────

function ciblesLegales(duel, cote, carte, portee) {
  const adv = autre(cote);
  const couleurs = cardColors(carte);
  if (portee === 'creature' || portee === 'combat') {
    return duel[adv].creatures.filter((entite) => !estProtegee(entite, couleurs)
      && !horsDAtteinteDuSort(entite, carte));
  }
  return [];
}

/**
 * Toutes les cibles envisageables pour un effet offensif, avec leur score :
 * les kills sur les plus grosses valeurs d’abord, le visage quand la carte
 * l’autorise (et surtout quand il est létal), sinon la menace principale.
 * `montant = null` évalue un combat d’arrivée sans montant fixe.
 */
function meilleuresOptionsOffensives(duel, cote, carte, { montant, sourceType, portee, profil, rng }) {
  const adv = autre(cote);
  const pvAdv = Math.max(0, duel[adv].pv ?? 0) + (duel[adv].bouclier ?? 0);
  const prets = duel[cote].creatures.filter((entite) => moteur.rpgPeutAttaquer(entite));
  const options = [];
  for (const entite of ciblesLegales(duel, cote, carte, portee)) {
    const kill = montant != null && meurtSous(entite, montant, sourceType);
    options.push({
      cibleId: entite.id,
      kill,
      score: (kill ? 20 : 0) + menace(entite),
    });
  }
  // « Créature ou sorcier » : la magie le déclare dans `cibles`, l'arrivée du
  // Maître du marteau dans `arrivee.cibles` — le visage adverse est alors une
  // option de ciblage, y compris quand la table est vide.
  const peutViserSorcier = portee === 'sorcier'
    || portee === 'creature' && Boolean(carte?.cibles?.includes('sorcier')
      || carte?.arrivee?.cibles?.includes('sorcier'))
    || carte?.effet?.cible === 'sorcier';
  if (peutViserSorcier) {
    const degats = montant ?? 0;
    const lethal = degatsGarantis(duel, cote, prets) + degats >= pvAdv;
    options.push({
      cibleId: 'sorcier',
      kill: false,
      lethal,
      score: lethal ? 200 : pvAdv <= degats + 10 ? 12 : 2,
    });
  }
  options.sort((a, b) => b.score - a.score);
  if (options.length > 1 && profil.tauxErreur > 0 && rng() < profil.tauxErreur) {
    return options[Math.floor(rng() * options.length)];
  }
  return options[0] ?? null;
}

/**
 * Cible automatique — contrat historique de `rpgCibleAuto` (le moteur et
 * l’interface l’utilisent pour la cible par défaut), en plus malin : kill,
 * menace principale, ou le sorcier quand c’est le meilleur coup.
 */
export function choisirCibleAutoIA(duel, cote, carte, options = {}) {
  const { profil, rng } = optionsIA(duel, cote, options);
  if (carte?.kind === 'arme') {
    return meilleureCibleArme(duel, cote, carte);
  }
  if (carte?.arrivee?.type === 'combat') {
    return meilleuresOptionsOffensives(duel, cote, carte, {
      montant: carte.atk ?? 0, sourceType: 'capacite', portee: 'combat', profil, rng,
    })?.cibleId ?? null;
  }
  if (carte?.arrivee?.type === 'degats') {
    if (carte.arrivee.cible === 'toutes-autres') return null;
    return meilleuresOptionsOffensives(duel, cote, carte, {
      montant: carte.arrivee.amount ?? 0,
      sourceType: 'capacite',
      portee: carte.arrivee.cible === 'sorcier' ? 'sorcier' : carte.arrivee.cible === 'toutes-creatures' ? 'zone' : 'creature',
      profil,
      rng,
    })?.cibleId ?? null;
  }
  if (carte?.arrivee?.type === 'exil') {
    // `coutMax` (le Père des corbeaux) et `coutMin` (Susanoo) : seules les
    // créatures qui respectent le seuil de coût sont des cibles légales.
    const couleurs = cardColors(carte);
    const legale = (entite) => !estProtegee(entite, couleurs)
      && moteur.cibleRespecteCoutMax(carte, entite);
    const adverse = duel[autre(cote)].creatures.filter(legale)
      .map((entite) => ({ entite, score: menace(entite) + valeurEntite(entite) * 0.2 }))
      .sort((a, b) => b.score - a.score)[0]?.entite.id ?? null;
    return adverse
      ?? duel[cote].creatures.filter(legale)
        .sort((a, b) => valeurEntite(a) - valeurEntite(b))[0]?.id ?? null;
  }
  if (carte?.arrivee?.type === 'retour-main' || carte?.effet?.type === 'retour-main') {
    return meilleureCibleRenvoiIA(duel, cote, carte);
  }
  if (carte?.arrivee?.type === 'debuff' || carte?.arrivee?.type === 'empeche-blocage') {
    // Le venin de la Vipère de verre, la lune dévorée de Bakunawa : la
    // créature marquée est la plus grosse menace que la protection ne
    // protège pas.
    return meilleureCibleMarqueeIA(duel, cote, carte)?.id ?? null;
  }
  if (carte?.arrivee?.type === 'donne') {
    // Le Faiseur de passage : l'Infiltration va à l'allié le plus précieux.
    return meilleureCibleAmie(duel, cote, carte);
  }
  if (carte?.arrivee?.type === 'bouclier' && carte.arrivee.cible === 'creature-amie' && carte.arrivee.choisirCible) {
    // La Veilleuse choisit un allié déjà présent ; seule sur la table, le
    // moteur retombe sur elle-même après son arrivée.
    return meilleureCibleAmie(duel, cote, carte);
  }
  if (carte?.effet?.cible === 'creature-amie') {
    return meilleureCibleAmie(duel, cote, carte);
  }
  if (carte?.effet?.type === 'combat' && carte.effet?.sourceCible === 'creature-amie') {
    // Le Défi du Jarl : la cible adverse d'abord (la plus menaçante qu'on
    // peut abattre), le champion allié étant choisi à part.
    return meilleuresOptionsOffensives(duel, cote, carte, {
      montant: null, sourceType: 'capacite', portee: 'combat', profil, rng,
    })?.cibleId ?? null;
  }
  if (carte?.effet?.type === 'blocage-force') {
    // L'Appât de la meute : on marque la plus grosse menace — elle devra se
    // jeter sur la prochaine attaque.
    return ciblesLegales(duel, cote, carte, 'creature')
      .sort((a, b) => menace(b) - menace(a))[0]?.id ?? null;
  }
  if (carte?.effet?.type === 'degats') {
    // Le Grand Hiver frappe les deux tables : il ne désigne personne.
    if (carte.effet.cible === 'toutes-autres') return null;
    return meilleuresOptionsOffensives(duel, cote, carte, {
      montant: carte.effet.amount ?? 0,
      sourceType: 'magie',
      portee: carte.effet.cible,
      profil,
      rng,
    })?.cibleId ?? null;
  }
  return null;
}

/**
 * Champion d'un duel (le Défi du Jarl) : la créature alliée qui tue
 * l'adversaire en y survivant, sinon la meilleure échange — en dernier
 * recours, la plus menaçante. Le combat est un échange de coups simultanés,
 * la simulation de blocage s'y applique telle quelle.
 */
export function choisirChampionDuelIA(duel, cote, cibleId = null) {
  const adv = autre(cote);
  const cible = duel[adv].creatures.find((entite) => entite.id === cibleId) ?? null;
  return duel[cote].creatures
    .map((entite) => {
      let score = menace(entite);
      if (cible) {
        const echange = resultatBlocage(entite, cible);
        if (echange.bloqueurMeurt && !echange.attaquantMeurt) score += 20 + valeurEntite(cible);
        else if (echange.bloqueurMeurt && echange.attaquantMeurt) score += valeurEntite(cible) - valeurEntite(entite);
        else if (echange.attaquantMeurt) score -= 15;
      }
      return { entite, score };
    })
    .sort((a, b) => b.score - a.score)[0]?.entite.id ?? null;
}

/**
 * Meilleur porteur pour une arme : la créature alliée **sans arme** la plus
 * précieuse — une seconde arme enverrait la première au cimetière, l'IA ne
 * paie jamais pour remplacer. Un mot-clé déjà porté (Envol sur une valkyrie)
 * ne se paie pas deux fois ; la protection contre la couleur de l'arme rend
 * la créature inéligible, comme pour un bouclier ami.
 */
function meilleureCibleArme(duel, cote, carte) {
  const couleurs = cardColors(carte);
  // Une arme qui blesse son porteur en s'attachant (la Hache de la banquise)
  // ne se confie pas à un mourant : le porteur doit survivre à la morsure.
  const morsure = Math.max(0, Number(carte?.blessurePorteur) || 0);
  const candidates = duel[cote].creatures
    .filter((entite) => !entite.mur && !entite.arme && !estProtegee(entite, couleurs)
      && (entite.pv ?? 0) > morsure);
  // Une arme à défense négative dont la mort du porteur déclenche un gain
  // (le Licou du chien de sable, +1/−1) ne cherche pas le meilleur bras :
  // elle cherche le moins regrettable — un jeton, un mourant — puisque la
  // pioche est le but et le porteur le prix. La Lance de givre, désormais
  // à +1/+0, n'a pas ce déclencheur : tuer son porteur serait une perte sèche.
  const malusDef = Math.min(0, Number(carte?.bonus?.def) || 0);
  if (malusDef < 0 && carte?.porteurMeurt) {
    const condamnees = candidates.filter((entite) => (entite.pv ?? 0) + malusDef <= 0);
    if (condamnees.length) {
      return condamnees
        .map((entite) => ({ entite, score: valeurEntite(entite) + (entite.jeton ? -6 : 0) }))
        .sort((a, b) => a.score - b.score)[0]?.entite.id ?? null;
    }
  }
  return candidates
    .filter((entite) => malusDef >= 0 || carte?.porteurMeurt || (entite.pv ?? 0) + malusDef > 0)
    .map((entite) => {
      let score = valeurEntite(entite);
      if (carte.donne?.envol && entite.envol) score -= 3;
      if (carte.donne?.esquive && entite.esquive) score -= 1;
      if (carte.donne?.coupRapide && entite.coupRapide) score -= 3;
      if (carte.donne?.rapidite && entite.rapidite) score -= 1;
      // À malus égal, un porteur encore solide perd moins qu'un mourant.
      if (malusDef < 0) score += Math.min(3, Math.max(0, (entite.pv ?? 0) + malusDef)) * 0.25;
      return { entite, score };
    })
    .sort((a, b) => b.score - a.score)[0]?.entite.id ?? null;
}

/** Meilleure créature amie pour un renfort ciblé (bouclier…) : la plus précieuse. */
function meilleureCibleAmie(duel, cote, carte) {
  const couleurs = cardColors(carte);
  return duel[cote].creatures
    .filter((entite) => !estProtegee(entite, couleurs) && !horsDAtteinteDuSort(entite, carte))
    .filter((entite) => carte.effet?.type !== 'arme' || entite.pv + (carte.effet.def ?? 0) > 0)
    .map((entite) => ({ entite, score: valeurEntite(entite) }))
    .sort((a, b) => b.score - a.score)[0]?.entite.id ?? null;
}

/**
 * La créature à marquer (le venin de la Vipère de verre, la lune dévorée de
 * Bakunawa) : la plus grosse menace adverse que la protection ne protège
 * pas. Sans victime légale, la fonction rend `null` — l'arrivée ne mordrait
 * personne, et la carte n'a alors rien à faire sur la table.
 */
function meilleureCibleMarqueeIA(duel, cote, carte) {
  const adv = autre(cote);
  const couleurs = cardColors(carte);
  return duel[adv].creatures
    .filter((entite) => !estProtegee(entite, couleurs) && !horsDAtteinteDuSort(entite, carte))
    .map((entite) => ({ entite, score: menace(entite) + valeurEntite(entite) * 0.2 }))
    .sort((a, b) => b.score - a.score)[0]?.entite ?? null;
}

/**
 * Cible du renvoi en main (« bounce ») : la créature la plus lourde parmi
 * celles que le sort peut toucher — la menace adverse qui repart en main
 * (`cible: 'creature'`), ou sa propre créature la plus précieuse si une carte
 * renvoyait une alliée (`cible: 'creature-amie'`). La protection rend la
 * créature intouchable ; sans cible légale, la fonction rend `null`.
 */
function meilleureCibleRenvoiIA(duel, cote, carte) {
  const portee = carte?.effet?.cible ?? carte?.arrivee?.cible;
  const campCible = portee === 'creature-amie' ? duel[cote] : duel[autre(cote)];
  const couleurs = cardColors(carte);
  return campCible.creatures
    .filter((entite) => !estProtegee(entite, couleurs) && !horsDAtteinteDuSort(entite, carte))
    .map((entite) => ({ entite, score: menace(entite) + valeurEntite(entite) * 0.2 }))
    .sort((a, b) => b.score - a.score)[0]?.entite.id ?? null;
}

/**
 * L’Attaque ciblée est un choix, attaquant par attaquant : frapper une créature
 * adverse — l'attaque s'arrête là, sans riposte ni blocage — ou attaquer
 * normalement, vers le sorcier. L'IA ne s'arrête que sur ce qu'elle abat : une
 * créature retirée de la table vaut plus que les dégâts rendus au visage.
 * Exception : quand l'assaut entier suffit déjà à faire tomber le sorcier,
 * aucune frappe ne détourne ces dégâts-là.
 */
export function choisirCiblesRapidesIA(duel, cote, attaquantIds = [], options = {}) {
  const { profil, rng } = optionsIA(duel, cote, options);
  const adv = autre(cote);
  const cibles = {};
  const attaquants = [...new Set(attaquantIds)]
    .map((id) => duel[cote].creatures.find((entite) => entite.id === id))
    .filter(Boolean);
  const pvAdv = Math.max(0, duel[adv].pv ?? 0) + (duel[adv].bouclier ?? 0);
  const degatsAuVisage = attaquants.reduce((somme, entite) => somme + (entite.atk ?? 0), 0);
  if (degatsAuVisage >= pvAdv) return cibles;
  
  // Priorité aux Tours de défense : les créatures avec coupRapide doivent
  // attaquer en priorité les créatures avec prioriteAttaqueRapide: true,
  // mais seulement si la frappe apporte une vraie valeur (kill ou menace majeure).
  const toursPrioritaires = duel[adv].creatures
    .filter((entite) => entite.prioriteAttaqueRapide && !entite.attaquee)
    .sort((a, b) => (b.atk ?? 0) - (a.atk ?? 0));

  for (const attaquant of attaquants) {
    if (!attaquant.coupRapide) continue;
    const carte = duelCardById(attaquant.carteId);

    // Tour prioritaire : seulement si on la tue ou si on n'a rien de mieux à faire.
    // Attaquer une Tour 0/4 avec 3 d'attaque sans la tuer gaspille la frappe.
    if (toursPrioritaires.length > 0) {
      // Une Tour protégée contre la couleur de l'attaquant ignore sa frappe :
      // le moteur refuserait même la désignation (`protection`), l'IA l'écarte.
      const tourCiblee = toursPrioritaires
        .find((tour) => !estProtegee(tour, couleursEntite(attaquant)));
      if (tourCiblee && meurtSousCouleurs(tourCiblee, attaquant.atk, couleursEntite(attaquant), 'attaque')) {
        // On tue la Tour : priorité absolue, même si d'autres cibles valent plus.
        cibles[attaquant.id] = tourCiblee.id;
        continue;
      }
    }
    
    const meilleure = meilleuresOptionsOffensives(duel, cote, carte, {
      montant: attaquant.atk, sourceType: 'attaque', portee: 'combat', profil, rng,
    });
    if (!meilleure?.cibleId || meilleure.cibleId === 'sorcier') continue;
    const proie = duel[adv].creatures.find((entite) => entite.id === meilleure.cibleId);
    // La Traque : contre une proie de la course (Abordage, Butin, cale
    // occupée), la frappe du Chasseur porte son +N/+0 — l’IA le compte avant
    // de décider si le coup tue.
    const traque = Math.max(0, Number(carte?.traquePirates) || 0);
    const estProie = Boolean(proie && (duelCardById(proie.carteId)?.abordage
      || (proie.butin ?? duelCardById(proie.carteId)?.butin) || proie.enCale));
    const forceFrappe = attaquant.atk + (estProie ? traque : 0);
    if (proie && meurtSous(proie, forceFrappe, 'attaque')) cibles[attaquant.id] = proie.id;
  }
  return cibles;
}

// ── Blocages ────────────────────────────────────────────────────────────────

/**
 * Les bloqueurs du camp adverse s’opposent aux attaquants déclarés.
 * Règle, dans l’ordre :
 *  1. ne pas mourir — si les dégâts non bloqués tuent le défenseur, on
 *     interpose ce qu’il faut, même à perte ;
 *  2. sinon, ne poser un bloqueur que sur un échange favorable (on tue
 *     l’attaquant) ou acceptable (échange mutuel de valeur au moins égale) ;
 *  3. jamais de blocage « dans le vide » : un bloqueur qui meurt sans tuer
 *     ni sauver la partie reste en réserve.
 */
export function choisirBloqueursIA(duel, coteAttaquant, attaquantIds = [], ciblesAttaque = {}, options = {}) {
  const coteDefense = autre(coteAttaquant);
  const { profil, rng } = optionsIA(duel, coteDefense, options);
  const ids = [...new Set(attaquantIds ?? [])];
  // Un attaquant rapide qui frappe une créature n'attaque plus : son attaque
  // s'arrête sur sa frappe — rien à bloquer.
  const attaquantsBloquables = duel[coteAttaquant].creatures
    .filter((entite) => ids.includes(entite.id) && !ciblesAttaque?.[entite.id]);
  const attaquants = attaquantsBloquables
    // Les attaquants à 0 d'attaque n'ont rien à arrêter : les ignorer évite de
    // gaspiller un bloqueur pour 0 dégât (Porteuse 0/3, etc.). Provocation
    // fait exception : même réduite à 0, elle réclame son bloqueur légal.
    .filter((entite) => (entite.atk ?? 0) > 0 || entite.provocation);
  const bloqueurs = duel[coteDefense].creatures.filter(peutBloquerEntite);
  const affectations = {};
  if (!attaquantsBloquables.length || !bloqueurs.length) return affectations;

  const legal = (attaquant, bloqueur) => peutBloquerAttaquant(bloqueur, attaquant)
    && !estProtegee(attaquant, cardColors(duelCardById(bloqueur.carteId)));

  const libres = new Set(bloqueurs.map((entite) => entite.id));
  const bloqueurParId = (id) => bloqueurs.find((entite) => entite.id === id);

  // 0) Blocages obligatoires : les créatures avec `doitBloquer` et celles
  // marquées par l'Appât de la meute / l'Embuscade DOIVENT être déclarées.
  // Elles servent d'abord un provocateur encore découvert, en commençant par
  // celui qui a le moins de bloqueurs légaux : un bloqueur contraint ne doit
  // pas prendre la seule place capable d'arrêter un autre provocateur. À
  // défaut, l'IA les déclare devant la plus grosse menace encore découverte —
  // même à 0 d'attaque, car l'obligation porte sur tout blocage légal.
  const bloqueursForces = bloqueurs.filter((entite) => entite.doitBloquer
    || entite.blocageForce?.par === coteAttaquant);
  const nombreBloqueursLegaux = (attaquant) => [...libres]
    .filter((id) => legal(attaquant, bloqueurParId(id)))
    .length;
  const parMenaceForcee = (a, b) => (b.atk ?? 0) - (a.atk ?? 0)
    || valeurEntite(b) - valeurEntite(a);
  for (const bloqueurForce of bloqueursForces) {
    if (!libres.has(bloqueurForce.id)) continue;
    const ciblesLegales = attaquantsBloquables.filter((attaquant) => legal(attaquant, bloqueurForce));
    const cible = ciblesLegales
      .filter((attaquant) => attaquant.provocation && !(affectations[attaquant.id] ?? []).length)
      .sort((a, b) => nombreBloqueursLegaux(a) - nombreBloqueursLegaux(b))[0]
      ?? ciblesLegales
        .filter((attaquant) => !(affectations[attaquant.id] ?? []).length)
        .sort(parMenaceForcee)[0]
      ?? [...ciblesLegales].sort(parMenaceForcee)[0];
    if (cible) {
      libres.delete(bloqueurForce.id);
      affectations[cible.id] = [...(affectations[cible.id] ?? []), bloqueurForce.id];
    }
  }

  const parMenace = [...attaquants]
    .sort((a, b) => (b.atk ?? 0) - (a.atk ?? 0) || valeurEntite(b) - valeurEntite(a));
  const menaceRestante = () => attaquants
    .filter((entite) => !(affectations[entite.id] ?? []).length)
    .reduce((somme, entite) => somme + (entite.atk ?? 0), 0);
  const pvDefense = () => Math.max(0, duel[coteDefense].pv ?? 0) + (duel[coteDefense].bouclier ?? 0);

  const scoreBlocage = (attaquant, bloqueur) => {
    const { attaquantMeurt, bloqueurMeurt, attaquantFurie, bloqueurFurie } = resultatBlocage(attaquant, bloqueur);
    // Protection : un bloqueur protégé contre la couleur de l'attaquant
    // encaisse tout sans une égratignure. Il arrête l'attaque gratuitement et
    // ne peut pas mourir de cet échange — l'IA ne laisse jamais passer une
    // telle aubaine, quel que soit son seuil d'agressivité.
    const bloqueurImmunise = estProtegee(bloqueur, couleursEntite(attaquant));
    const degatsRecus = degatsSubis(bloqueur, attaquant.atk ?? 0, couleursEntite(attaquant), 'attaque');
    // Bloquer un Overkill n'épargne que la part absorbée par le bloqueur :
    // l'excédent frappera quand même le sorcier.
    const degatsEvites = Math.min(
      Math.max(0, (attaquant.atk ?? 0) - excesOverkill(attaquant, bloqueur)),
      pvDefense(),
    );
    const furie = bloqueurFurie * 0.9 - attaquantFurie * 1.6;
    if (bloqueurImmunise) {
      return (attaquantMeurt ? 24 : 14) + degatsEvites * 0.15 + furie;
    }
    // 1) On tue sans mourir : toujours excellent.
    if (attaquantMeurt && !bloqueurMeurt) return 20 + valeurEntite(attaquant) + degatsEvites * 0.15 + furie;
    if (attaquantMeurt && bloqueurMeurt) {
      const ecart = valeurEntite(attaquant) - valeurEntite(bloqueur);
      if (ecart >= -0.7) return 8 + ecart + degatsEvites * 0.08 + furie;
      return -Infinity;
    }
    // 2) Les deux survivent : on érode l'attaquant et on évite des dégâts.
    //    Rentable si ça ne nourrit pas une Furie adverse dévastatrice.
    if (!attaquantMeurt && !bloqueurMeurt) {
      // Nourrir la Furie 3 du Jarl (+3/+0 tant qu'il reste blessé) reste très coûteux.
      if (attaquantFurie >= 2) return -Infinity;
      // Érosion utile : on inflige des dégâts sans mourir, et on évite la frappe au visage.
      return degatsEvites * 0.35 - degatsRecus * 0.18 + furie;
    }
    // 3) Chump pur (bloqueur meurt, attaquant survit) : jamais en phase normale — réservé à l'urgence létale.
    return -Infinity;
  };
  // Seuil plus strict : on ne bloque que les bons échanges. Un échange
  // douteux reste en réserve pour la phase de survie.
  const seuil = profil.style === 'agressif' ? -0.6 : profil.style === 'prudent' ? 0.8 : 0;

  // 0bis) Provocation : ce n'est pas un choix tactique. Chaque provocateur
  // encore découvert doit recevoir un bloqueur légal, dans la limite du
  // plus grand appariement possible — le meilleur échange disponible s'il
  // existe, sinon le corps le moins précieux. L'appariement maximal évite
  // qu'un choix localement séduisant consomme le seul bloqueur capable
  // d'arrêter un autre provocateur. Le taux d'erreur du niveau Récit ne
  // peut pas rendre l'attaque illégale.
  const provocateursRestants = attaquants
    .filter((entite) => entite.provocation && !(affectations[entite.id] ?? []).length);
  if (provocateursRestants.length) {
    const candidatsParAttaquant = new Map(provocateursRestants.map((attaquant) => {
      const candidats = [...libres]
        .map(bloqueurParId)
        .filter((bloqueur) => legal(attaquant, bloqueur))
        .map((bloqueur) => ({ bloqueur, score: scoreBlocage(attaquant, bloqueur) }))
        .sort((a, b) => {
          const aFini = Number.isFinite(a.score);
          const bFini = Number.isFinite(b.score);
          if (aFini !== bFini) return aFini ? -1 : 1;
          if (aFini && bFini && a.score !== b.score) return b.score - a.score;
          const jetonA = a.bloqueur.jeton ? 0 : 1;
          const jetonB = b.bloqueur.jeton ? 0 : 1;
          if (jetonA !== jetonB) return jetonA - jetonB;
          return valeurEntite(a.bloqueur) - valeurEntite(b.bloqueur)
            || (a.bloqueur.pv ?? 0) - (b.bloqueur.pv ?? 0);
        })
        .map(({ bloqueur }) => bloqueur);
      return [attaquant.id, candidats];
    }));
    const parRareteDesBloqueurs = [...provocateursRestants]
      .sort((a, b) => candidatsParAttaquant.get(a.id).length - candidatsParAttaquant.get(b.id).length);
    const bloqueurAssigneA = new Map();
    const essayerAppariement = (attaquant, dejaVus) => {
      for (const bloqueur of candidatsParAttaquant.get(attaquant.id) ?? []) {
        if (dejaVus.has(bloqueur.id)) continue;
        dejaVus.add(bloqueur.id);
        const occupant = bloqueurAssigneA.get(bloqueur.id);
        if (!occupant || essayerAppariement(occupant, dejaVus)) {
          bloqueurAssigneA.set(bloqueur.id, attaquant);
          return true;
        }
      }
      return false;
    };
    for (const attaquant of parRareteDesBloqueurs) {
      essayerAppariement(attaquant, new Set());
    }
    for (const [bloqueurId, attaquant] of bloqueurAssigneA) {
      libres.delete(bloqueurId);
      affectations[attaquant.id] = [...(affectations[attaquant.id] ?? []), bloqueurId];
    }
  }

  // Le Grand Voile blanc annule tous les dégâts de combat de ce tour : un
  // blocage volontaire n'évite plus rien. Les déclarations obligatoires
  // ci-dessus (blocage forcé, Tours, Provocation) restent dues au moteur ;
  // tout le reste demeure en réserve.
  if (duel.brouillardCombat) return affectations;

  // 1) Échanges favorables — du plus gros attaquant au plus petit.
  for (const attaquant of parMenace) {
    if ((affectations[attaquant.id] ?? []).length) continue;
    const candidats = [...libres]
      .map(bloqueurParId)
      .filter((bloqueur) => legal(attaquant, bloqueur))
      .map((bloqueur) => ({ bloqueur, score: scoreBlocage(attaquant, bloqueur) }))
      .filter((candidat) => Number.isFinite(candidat.score) && candidat.score > seuil)
      .sort((a, b) => b.score - a.score);
    if (!candidats.length) continue;
    if (profil.tauxErreur > 0 && rng() < profil.tauxErreur) continue;
    const choisi = candidats[0].bloqueur;
    libres.delete(choisi.id);
    affectations[attaquant.id] = [choisi.id];
  }

  // 2) Urgence vitale : si les dégâts non bloqués nous tuent, on interpose
  //    le minimum — et on choisit les corps les moins précieux, jetons d'abord.
  //    La vie n'a de prix que quand elle évite la mort.
  if (menaceRestante() >= pvDefense() && pvDefense() > 0) {
    // Bloquer les plus grosses menaces d'abord évite de gaspiller un jeton sur un 1/1 pendant qu'un 6/6 passe.
    for (const attaquant of parMenace) {
      if (menaceRestante() < pvDefense()) break;
      if ((affectations[attaquant.id] ?? []).length) continue;
      const candidats = [...libres]
        .map(bloqueurParId)
        .filter((bloqueur) => legal(attaquant, bloqueur))
        .sort((a, b) => {
          // Jetons d'abord, puis valeur la plus faible, puis défense la plus faible
          const jetonA = a.jeton ? 0 : 1;
          const jetonB = b.jeton ? 0 : 1;
          if (jetonA !== jetonB) return jetonA - jetonB;
          const vA = valeurEntite(a);
          const vB = valeurEntite(b);
          if (vA !== vB) return vA - vB;
          return (a.pv ?? 0) - (b.pv ?? 0);
        });
      if (!candidats.length) continue;
      // Ne jamais sacrifier une créature dont la valeur dépasse de loin les dégâts évités
      // sauf si c'est le dernier rempart avant la mort.
      const choisi = candidats[0];
      const degatsSauves = attaquant.atk ?? 0;
      // Si on est à 1 PV, n'importe quel bloqueur vaut le coup ; à 10 PV, sacrifier une mythique pour 2 dégâts est absurde.
      const valeurLimite = pvDefense() <= 5 ? Infinity : pvDefense() <= 10 ? 6 : 4;
      if (valeurEntite(choisi) > degatsSauves * 1.2 && valeurEntite(choisi) > valeurLimite && menaceRestante() - degatsSauves >= pvDefense()) {
        // On pourrait sacrifier une autre créature moins chère si on en a — mais si c'est la seule, on la sacrifie quand même pour survivre.
        if (candidats.length > 1) continue;
      }
      libres.delete(choisi.id);
      affectations[attaquant.id] = [choisi.id];
    }
  }
  return affectations;
}

// ── Attaques ────────────────────────────────────────────────────────────────

function attaquantsPrets(duel, cote) {
  return duel[cote].creatures.filter(moteur.rpgPeutAttaquer);
}

/**
 * Une attaque à 0 n'a aucun sens sauf si son arme porte un déclencheur qui
 * part à l'attaque (Boussole du Hoggar, Harnais du méhari) — même un 0/3
 * peut alors rapporter une carte ou un mana.
 */
function peutAttaquerUtile(entite) {
  const atk = Number(entite?.atk) || 0;
  if (atk > 0) return true;
  const arme = armeById(entite?.arme?.carteId);
  return Boolean(arme?.porteurAttaque);
}

/**
 * Dégâts au visage garantis quel que soit le blocage adverse : chaque
 * bloqueur ne peut encaisser qu’un attaquant, donc les K plus gros coups
 * peuvent être retenus — le reste passe. L’Attaque ciblée, elle, ne détourne des
 * dégâts que si l’IA choisit la frappe (`choisirCiblesRapidesIA`) : ce calcul
 * majore donc légèrement les dégâts quand un rapide peut abattre une créature.
 */
function degatsGarantis(duel, cote, prets) {
  const adv = autre(cote);
  const bloqueurs = duel[adv].creatures.filter(peutBloquerEntite);
  const bloquablePar = (attaquant) => bloqueurs.some((bloqueur) => peutBloquerAttaquant(bloqueur, attaquant)
    && !estProtegee(attaquant, cardColors(duelCardById(bloqueur.carteId))));
  const bloquables = prets.filter(bloquablePar)
    .map((attaquant) => attaquant.atk ?? 0)
    .sort((a, b) => b - a);
  const directs = prets
    .filter((attaquant) => !bloquablePar(attaquant))
    .reduce((somme, attaquant) => somme + (attaquant.atk ?? 0), 0);
  const retenus = bloquables.slice(0, Math.min(bloqueurs.length, bloquables.length))
    .reduce((somme, atk) => somme + atk, 0);
  return directs + bloquables.reduce((somme, atk) => somme + atk, 0) - retenus;
}

/**
 * Quelles créatures le sorcier engage à l’attaque.
 *
 * La déclaration s’évalue comme un tout : l’adversaire répond par ses
 * meilleurs blocages (simulés avec le même évaluateur que nos propres
 * blocages), et l’assaut ne vaut que s’il rapporte au moins ce qu’il coûte —
 * dégâts au visage, créatures tuées, créatures perdues. On retire alors les
 * attaquants qui coûtent cher jusqu’à ce que la déclaration soit rentable :
 * un attaquant « gratuit » ou dominant tire toujours, un assaut suicidaire
 * reste au camp. La ligne létale, elle, envoie tout le monde.
 */
export function choisirAttaquantsIA(duel, cote, options = {}) {
  const { profil } = optionsIA(duel, cote, options);
  const pretsBruts = attaquantsPrets(duel, cote);
  // Jamais d'attaque à 0 sans déclencheur — la Porteuse 0/3, une Tour 0/4 ne
  // frappent pas : elles se tapent pour rien et ne bloquent plus ensuite.
  const prets = pretsBruts.filter(peutAttaquerUtile);
  if (!prets.length) return [];
  const adv = autre(cote);
  const pvAdv = Math.max(0, duel[adv].pv ?? 0) + (duel[adv].bouclier ?? 0);

  // Le Grand Voile blanc : aucun dégât de combat ce tour, ni sur les créatures
  // ni sur le sorcier. Attaquer n'y perce rien et engage les créatures pour
  // rien — seul un déclencheur « quand le porteur attaque » rapporte encore
  // quelque chose. L'IA garde son tour de frappe.
  if (duel.brouillardCombat) {
    return prets
      .filter((entite) => Boolean(armeById(entite?.arme?.carteId)?.porteurAttaque))
      .map((entite) => entite.id);
  }

  // Létal garanti : on envoie tout, même dans des échanges — conclure prime.
  if (degatsGarantis(duel, cote, prets) >= pvAdv) return prets.map((entite) => entite.id);

  // Course : si l’adversaire nous abat au tour suivant, la défense ne sauvera
  // pas la partie — on accepte des assauts moins rentables pour presser.
  const menaceAdverse = duel[adv].creatures
    .reduce((somme, entite) => somme + (entite?.atk ?? 0), 0);
  const enCourse = menaceAdverse >= (duel[cote].pv ?? 0) + (duel[cote].bouclier ?? 0);

  const evaluation = (ensemble) => {
    // L’Attaque ciblée choisit : la frappe sur une créature (valeur comptée à
    // part) arrête l'attaque — ni blocage, ni dégâts au visage —, et l'attaquant
    // qui s'en passe combat comme les autres.
    const ciblesRapides = choisirCiblesRapidesIA(duel, cote, ensemble.map((entite) => entite.id), options);
    const blocages = choisirBloqueursIA(duel, cote, ensemble.map((entite) => entite.id), ciblesRapides, options);
    let face = 0;
    let notrePerte = 0;
    let leurPerte = 0;
    let notreFurie = 0;
    let leurFurie = 0;
    // Une attaque arrêtée par un bloqueur protégé contre sa couleur ne rend
    // rien : pas de percée, aucune blessure à l'adversaire, et notre créature
    // s'entame pour rien. Ce gaspillage compte contre la déclaration — sinon
    // l'assaut paraît « neutre » et l'IA tire dans le mur.
    let gaspillage = 0;
    for (const attaquant of ensemble) {
      // Sa frappe l'a arrêté avant les blessures de combat.
      if (ciblesRapides[attaquant.id]) continue;
      const idsBloqueurs = blocages[attaquant.id] ?? [];
      const bloqueur = idsBloqueurs.length
        ? duel[adv].creatures.find((entite) => entite.id === idsBloqueurs[0])
        : null;
      if (!bloqueur) {
        face += attaquant.atk ?? 0;
        continue;
      }
      // Overkill : l'excédent perce le bloqueur et frappe le sorcier, comme
      // dans le moteur, avant même l'issue simultanée de l'échange.
      face += excesOverkill(attaquant, bloqueur);
      const echange = resultatBlocage(attaquant, bloqueur);
      const couleursAttaquant = couleursEntite(attaquant);
      if (estProtegee(bloqueur, couleursAttaquant)) {
        gaspillage += 1.2 + degatsSubis(attaquant, bloqueur.atk, couleursEntite(bloqueur), 'attaque') * 0.25;
      }
      if (echange.attaquantMeurt) notrePerte += valeurEntite(attaquant);
      else notreFurie += echange.attaquantFurie * 0.8;
      if (echange.bloqueurMeurt) leurPerte += valeurEntite(bloqueur);
      else leurFurie += echange.bloqueurFurie * 0.8;
    }
    for (const [id, cibleId] of Object.entries(ciblesRapides)) {
      const attaquant = ensemble.find((entite) => entite.id === id);
      const cible = duel[adv].creatures.find((entite) => entite.id === cibleId);
      if (!attaquant || !cible) continue;
      if (meurtSousCouleurs(cible, attaquant.atk, couleursEntite(attaquant), 'attaque')) {
        leurPerte += valeurEntite(cible);
      } else {
        leurPerte += menace(cible) * 0.3;
      }
    }
    return {
      face,
      notrePerte,
      leurPerte,
      gaspillage,
      score: face + leurPerte - notrePerte + notreFurie - leurFurie - gaspillage,
    };
  };

  const seuil = profil.style === 'agressif' ? -2 : profil.style === 'prudent' ? 1.5 : 0;
  const seuilActif = enCourse ? Math.min(seuil, -6) : seuil;
  const acceptable = (ev) => ev.score >= seuilActif || ev.face >= pvAdv;

  let ensemble = [...prets];
  let ev = evaluation(ensemble);
  while (ensemble.length && !acceptable(ev)) {
    // On retire l’attaquant dont la contribution est la plus négative.
    let pire = null;
    let pireDelta = Infinity;
    for (const attaquant of ensemble) {
      const sans = ensemble.filter((entite) => entite.id !== attaquant.id);
      const delta = ev.score - evaluation(sans).score;
      if (delta < pireDelta) {
        pireDelta = delta;
        pire = attaquant;
      }
    }
    ensemble = ensemble.filter((entite) => entite.id !== pire.id);
    ev = evaluation(ensemble);
  }
  return ensemble.map((entite) => entite.id);
}

// ── Phase principale : quoi jouer ───────────────────────────────────────────

function compterBesoins(main) {
  const besoins = Object.fromEntries(RPG_ELEMENTS.map((couleur) => [couleur, 0]));
  for (const id of main) {
    const carte = duelCardById(id) ?? magieById(id);
    if (!carte) continue;
    // `cardColorCost` couvre les deux écritures du catalogue : les pips
    // explicites (`colorCost`) des bicolores, et le pip d'élément des
    // cartes monocolores — Neige comprise.
    for (const [couleur, quantite] of Object.entries(cardColorCost(carte))) {
      besoins[couleur] = (besoins[couleur] ?? 0) + quantite;
    }
  }
  return besoins;
}

/** Nouveau mana du banc d'essai : combler d'abord les pips manquants des
 * cartes en main, sans jamais regarder le paquet caché. Un coût proche du
 * prochain tour compte davantage qu'une mythique encore lointaine. */
export function choisirCouleurManaIA(duel, cote = 'sorcier') {
  const camp = duel[cote];
  const capacite = camp?.manaMax ?? {};
  const total = RPG_ELEMENTS.reduce((somme, couleur) => somme + (capacite[couleur] ?? 0), 0);
  const cartes = (camp?.main ?? []).map((id) => duelCardById(id) ?? magieById(id) ?? armeById(id)).filter(Boolean);
  const besoins = compterBesoins(camp?.main ?? []);
  return [...(camp?.couleurs ?? [])].sort((a, b) => {
    const score = (couleur) => {
      const disponible = capacite[couleur] ?? 0;
      let valeur = (besoins[couleur] ?? 0) / (disponible + 1);
      for (const carte of cartes) {
        const manque = (cardColorCost(carte)[couleur] ?? 0) - disponible;
        if (manque <= 0) continue;
        valeur += carte.cost <= total + 1 ? 5 : carte.cost <= total + 3 ? 2 : 0.5;
        if (manque === 1 && carte.cost <= total + 1) valeur += 5;
      }
      return valeur;
    };
    return score(b) - score(a) || RPG_ELEMENTS.indexOf(a) - RPG_ELEMENTS.indexOf(b);
  })[0] ?? null;
}

/** Parmi les terrains en main, celui qui ouvre le plus de coups. */
export function choisirTerrainIA(duel, cote) {
  const camp = duel[cote];
  const terrains = camp.main.filter((id) => terrainById(id));
  if (!terrains.length) return null;
  if (terrains.length === 1) return terrains[0];

  const sources = {};
  for (const couleur of RPG_ELEMENTS) sources[couleur] = 0;
  for (const terrain of camp.terrains) {
    for (const couleur of terrainManaColors(terrain.carteId)) {
      sources[couleur] = (sources[couleur] ?? 0) + 1;
    }
  }
  for (const couleur of Object.keys(camp.mana)) {
    sources[couleur] = (sources[couleur] ?? 0) + (camp.mana[couleur] ?? 0);
  }

  const besoins = compterBesoins(camp.main.filter((id) => !terrainById(id)));
  const gain = (id) => terrainManaColors(id)
    .reduce((somme, couleur) => somme
      + Math.min(1, Math.max(0, (besoins[couleur] ?? 0) - (sources[couleur] ?? 0))), 0);
  return [...terrains].sort((a, b) => gain(b) - gain(a))[0];
}

/**
 * Mulligan d’ouverture du sorcier : il renvoie ce qu’il ne pourra pas lancer.
 * Une main sans terrain ne joue rien, une main que de terrains ne gagne pas de
 * duel. Niveau Récit, il garde sa main : la tour doit rester racontable.
 * Retourne la liste des indices de main à écarter (vide = on garde tout).
 */
export function choisirMulliganIA(duel, cote = 'sorcier', options = {}) {
  const profil = options.profil ?? rpgProfilIA(duel?.[cote]?.ia ?? null);
  const main = duel?.[cote]?.main ?? [];
  if (main.length < 2 || profil.niveau === 'recit') return [];
  if (duel?.modeMana === RPG_MODE_MANA_ESSAI) {
    // Aucun terrain à chercher : conserver les cartes de début de courbe et
    // échanger les coûts 5+ quand la main manque de coups à 1–3 manas.
    const petitsCouts = main.filter((id) => (duelCardById(id) ?? magieById(id) ?? armeById(id))?.cost <= 3).length;
    return main.flatMap((id, index) => {
      const cout = (duelCardById(id) ?? magieById(id) ?? armeById(id))?.cost ?? 0;
      return cout > (petitsCouts >= 2 ? 5 : 3) ? [index] : [];
    });
  }
  const terrains = [];
  const autres = [];
  main.forEach((carteId, index) => (terrainById(carteId) ? terrains : autres).push(index));
  // Renoncer à sa main ne vaut que si le paquet peut mieux faire : sans une
  // seule source restante, l'échange ne serait qu'un coup de théâtre.
  const sourcesAuPaquet = (duel[cote].deck ?? []).filter((carteId) => terrainById(carteId)).length;
  if (!sourcesAuPaquet) return [];
  // Aucune source : on renvoie tout ce qui ne se paie pas sans mana.
  if (!terrains.length) return autres;
  // Le cas inverse : on renvoie les terrains de trop, deux suffisent pour ouvrir.
  if (!autres.length) return terrains.slice(2);
  // Une carte qu’aucun terrain de la main ne finance est un tour perdu d’avance.
  const couleurs = new Set(terrains.flatMap((index) => terrainManaColors(main[index])));
  const injouables = autres.filter((index) => Object.keys(cardColorCost(main[index]))
    .some((couleur) => !couleurs.has(couleur)));
  // Renvoyer sa seule perspective n’en ouvrirait pas une meilleure : on garde.
  return injouables.length === autres.length ? [] : injouables;
}

/** Couleur à préférer quand un terrain flexible (Pétra…) s’engage. */
export function couleurEngagement(carteTerrain, main = []) {
  const id = typeof carteTerrain === 'string' ? carteTerrain : carteTerrain?.carteId ?? carteTerrain?.id;
  const couleurs = terrainManaColors(id);
  if (couleurs.length <= 1) return couleurs[0] ?? null;
  const besoins = compterBesoins(main);
  return [...couleurs].sort((a, b) => (besoins[b] ?? 0) - (besoins[a] ?? 0))[0];
}

/** Petite entité fictive pour évaluer un combat d’arrivée sans toucher la partie.
 *  `duel` fourni : l’entité naît avec la Résonance déjà en table, comme en jeu. */
function entiteDeSecours(carte, duel = null) {
  const resonance = duel ? moteur.rpgBonusResonance(duel, carte) : 0;
  return {
    id: 'simulation',
    carteId: carte.id,
    atk: (carte.atk ?? 0) + resonance,
    def: (carte.def ?? 0) + resonance,
    pv: (carte.def ?? 0) + resonance,
    pvMax: (carte.def ?? 0) + resonance,
    bouclier: 0,
    esquive: Boolean(carte.esquive),
    contreAttaque: Boolean(carte.contreAttaque),
    protection: null,
  };
}

/**
 * Score d’une carte jouable maintenant, avec sa cible éventuelle.
 * Retourne null si la carte est injouable (pas de cible légale requise).
 */
function scoreCarte(duel, cote, carte, profil, rng) {
  const adv = autre(cote);
  const camp = duel[cote];
  const pvAdv = Math.max(0, duel[adv].pv ?? 0) + (duel[adv].bouclier ?? 0);
  const manquePv = Math.max(0, (camp.pvMax ?? camp.pv) - camp.pv);
  // Le Prix en PV (set Ténèbres) : sous le seuil, la carte est injouable —
  // le moteur la refuserait de toute façon (`rpgPeutPayer`).
  if ((carte.prixPv ?? 0) > 0 && camp.pv <= carte.prixPv) return { score: 0, cibleId: null };
  // Le même Prix alourdit le rendement : un PV manquant coûte toujours plus
  // cher que du mana disponible.
  const cout = Math.max(0, carte.cost ?? 0) + Math.max(0, Number(carte.prixPv) || 0) * 0.6;

  if (carte.kind === 'magie' || magieById(carte.id)) {
    const effet = carte.effet ?? {};
    if (effet.type === 'destruction-totale') {
      // La protection de couleur et le Serpent du monde (protégé des magies)
      // écartent la vague : la créature survit sans rien encaisser. Une
      // créature tenace meurt bien, mais revient au tour suivant avec 1 point
      // de défense : la vague vaut donc un peu moins contre elle.
      const pertes = (c) => duel[c].creatures
        .filter((entite) => !estProtegee(entite, cardColors(carte)) && !horsDAtteinteDuSort(entite, carte))
        .reduce((somme, entite) => somme + valeurEntite(entite)
          * (entite.tenaciteDisponible ? 0.7 : 1), 0);
      const gain = pertes(adv) - pertes(cote);
      return { score: gain > 0 ? 4 + gain - cout * 0.3 : 0, cibleId: null };
    }
    if (effet.type === 'destruction-coutmax') {
      // Le jugement, et la Neige noire qui le complète de gel : la vague ne
      // brise que les créatures assez petites, dans les camps qu'elle couvre
      // (`cible: 'creatures-adverses'` épargne le camp du lanceur). La
      // protection de couleur et le Serpent du monde écartent la vague ;
      // l'Esquive de la cible en annule la destruction à son taux d'échec.
      const couleursSort = cardColors(carte);
      const seuil = Number(effet.coutMax) || 0;
      const camps = effet.cible === 'creatures-adverses' ? [adv] : [cote, adv];
      const couvertes = camps.flatMap((camp) => duel[camp].creatures
        .filter((entite) => !estProtegee(entite, couleursSort) && !horsDAtteinteDuSort(entite, carte)));
      const brisees = couvertes
        .filter((entite) => (duelCardById(entite.carteId)?.cost ?? 0) <= seuil);
      const gain = brisees.reduce((somme, entite) => somme
        + valeurEntite(entite)
          * (entite.esquive ? 1 - moteur.RPG_ESQUIVE_CHANCE : 1)
          * (entite.tenaciteDisponible ? 0.7 : 1), 0)
        + (effet.gel ? (couvertes.length - brisees.length) * 1.2 : 0);
      return { score: gain > 0 ? 4 + gain - cout * 0.3 : 0, cibleId: null };
    }
    if (effet.type === 'degats') {
      const montant = effet.amount ?? 0;
      if (effet.cible === 'toutes-creatures') {
        // La protection de couleur (ou le Serpent du monde, contre les magies)
        // fait écran à la vague : la créature ne perd rien, l'IA ne compte donc
        // ni sa mort ni sa blessure — un sort de Braise jeté sur une table
        // protégée n'est pas un balayage, c'est du mana perdu.
        const couleursSort = cardColors(carte);
        const touchees = duel[adv].creatures
          .filter((entite) => !estProtegee(entite, couleursSort) && !horsDAtteinteDuSort(entite, carte));
        const tues = touchees.filter((entite) => meurtSous(entite, montant, 'magie'));
        const blessees = touchees
          .filter((entite) => !meurtSous(entite, montant, 'magie') && degatsApresEsquive(entite, montant, 'magie') > 0);
        // Une seconde vague (`echo`, le Nuage de cendres) ne tue pas encore :
        // elle retombe au début du prochain tour de son lanceur, l'adversaire
        // a donc son tour entier pour jouer. Elle vaut moins qu'un dégât
        // immédiat, mais elle use le bord de table.
        const echoMontant = Math.max(0, Number(effet.echo?.amount) || 0);
        const echo = echoMontant > 0
          ? (touchees.length - tues.length) * echoMontant * 0.35
          : 0;
        const chanceGel = Math.min(1, Math.max(0, Number(effet.gelChance) || 0));
        const gain = tues.reduce((somme, entite) => somme + valeurEntite(entite), 0) + blessees.length * 1.2 + echo
          // Le gel de zone fige les survivantes réellement touchées en plus
          // de la blessure : un tour entier de leur attaque en moins. Quand
          // il n'est qu'une chance (25 % pour la Brume du fjord, une sur deux
          // pour le Hurlement), il se paie à sa probabilité.
          + (effet.gel ? touchees.length * 1.2 : blessees.length * chanceGel * 1.2);
        return { score: gain > 0 ? 4 + gain - cout * 0.3 : 0, cibleId: null };
      }
      if (effet.cible === 'toutes-autres') {
        // Le Grand Hiver : la vague frappe les DEUX tables. Le sorcier compte
        // donc ce qu'il détruit chez l'adversaire, MOINS ce qu'il perd chez
        // lui — il ne la lance que si le compte penche de son côté.
        const valeurTable = (campVise) => duel[campVise].creatures.reduce((total, entite) => {
          if (estProtegee(entite, cardColors(carte)) || horsDAtteinteDuSort(entite, carte)) return total;
          const recus = degatsApresEsquive(entite, montant, 'magie');
          if (recus <= 0) return total;
          return total + (meurtSous(entite, montant, 'magie') ? valeurEntite(entite) : 1.2);
        }, 0);
        const gain = valeurTable(adv) - valeurTable(cote);
        return { score: gain > 0 ? 3 + gain - cout * 0.3 : 0, cibleId: null };
      }
      const meilleure = meilleuresOptionsOffensives(duel, cote, carte, {
        montant, sourceType: 'magie', portee: effet.cible, profil, rng,
      });
      if (!meilleure) return null;
      let score;
      if (meilleure.cibleId === 'sorcier') {
        if (meilleure.lethal) score = 100;
        else if (profil.prescience && pvAdv > montant * 2.5 && duel[adv].creatures.length) score = 0;
        else score = (pvAdv <= montant + 10 ? 6 : profil.style === 'agressif' ? 3.5 : 2) - cout * 0.2;
      } else {
        const cible = duel[adv].creatures.find((entite) => entite.id === meilleure.cibleId);
        if (meilleure.kill) score = 5 + valeurEntite(cible) - cout * 0.2;
        else score = (profil.style === 'controle' ? 1.5 : 0.5) + menace(cible) * 0.2 - cout * 0.2;
        if (effet.gel) score += 1.2; // la Poigne de givre fige sa cible en plus de la brûler
      }
      return { score, cibleId: meilleure.cibleId };
    }
    if (effet.type === 'arme') {
      const cibleId = meilleureCibleAmie(duel, cote, carte);
      if (!cibleId) return null;
      const cible = camp.creatures.find((entite) => entite.id === cibleId);
      return { score: 4 + (effet.atk ?? 0) * 0.8 + (cible.coupRapide ? 0 : 2) - cout * 0.2, cibleId };
    }
    if (effet.type === 'soin') {
      const soin = Math.min(effet.amount ?? 0, manquePv);
      return { score: soin > 0 ? 1 + soin * 1.1 - cout * 0.2 : 0, cibleId: null };
    }
    if (effet.type === 'soin-creatures') {
      // Le Festin des vaillants : un petit soin pour toute la table. Il ne
      // vaut son mana que si plusieurs blessures se referment réellement ;
      // refermer celle qui entretient une Furie alliée coûte son bonus.
      const montant = Math.max(0, Number(effet.amount) || 0);
      let totalSoin = 0;
      let creaturesSoignees = 0;
      let furiesEteintes = 0;
      for (const entite of camp.creatures) {
        const soin = Math.min(montant, Math.max(0, (entite.pvMax ?? entite.pv ?? 0) - (entite.pv ?? 0)));
        if (!soin) continue;
        totalSoin += soin;
        creaturesSoignees += 1;
        const defenseDeBase = Number(duelCardById(entite.carteId)?.def ?? entite.pvMax ?? entite.def) || 0;
        if (entite.furieDeclenchee && defenseDeBase > 0 && (entite.pv ?? 0) + soin >= defenseDeBase) {
          furiesEteintes += 1;
        }
      }
      const soinJoueur = Math.min(Math.max(0, Number(effet.etJoueur) || 0), manquePv);
      const score = totalSoin * 0.9 + creaturesSoignees * 0.25 + soinJoueur * 0.7
        - furiesEteintes * 1.4 - cout * 0.35 - 0.4;
      return { score: totalSoin + soinJoueur > 0 ? score : 0, cibleId: null };
    }
    if (effet.type === 'pioche') {
      return { score: 3 + (camp.main.length <= 3 ? 3 : 0) - cout * 0.2, cibleId: null };
    }
    if (effet.type === 'retour-main') {
      // Renvoi en main : rien n'est tué, mais la menace adverse repart en main
      // (son mana est perdu, son arrivée devra être repayée) et le Courant de
      // retour ajoute une carte. Sans cible légale, le sort reste en main.
      const cibleId = meilleureCibleRenvoiIA(duel, cote, carte);
      if (!cibleId) return null;
      const cible = duel[effet.cible === 'creature-amie' ? cote : adv].creatures
        .find((entite) => entite.id === cibleId);
      if (!cible) return null;
      const tempo = effet.cible === 'creature-amie' ? valeurEntite(cible) * 0.2 : 1.5 + menace(cible) * 0.5;
      const controle = profil.style === 'controle' ? 1 : 0;
      const score = tempo + controle + (effet.pioche ?? 0) * 2 - cout * 0.3;
      return { score: score > 0 ? score : 0, cibleId };
    }
    if (effet.type === 'debuff') {
      // La Lame de mer (-2/-2) : elle tue ce qu'elle fait tomber sous 1 point
      // de défense (le moteur enterre la victime à 0 PV), sinon elle rabote la
      // menace — attaque et réserve de vie comprises. Une carte qui ne ferait
      // que griffer une grosse créature reste en main.
      const plancher = Number.isFinite(effet.minimum) ? effet.minimum : 0;
      const retraitAtk = Number(effet.atk) || 0;
      const retraitDef = Number(effet.def) || 0;
      const options = ciblesLegales(duel, cote, carte, 'creature').map((entite) => {
        const tue = plancher <= 0 && (entite.pv ?? 0) + retraitDef <= 0;
        const apres = {
          ...entite,
          atk: Math.max(plancher, (entite.atk ?? 0) + retraitAtk),
          pv: Math.max(plancher, (entite.pv ?? 0) + retraitDef),
        };
        const gain = tue ? 5 + valeurEntite(entite) : menace(entite) - menace(apres);
        const paralysie = (effet.empecheAttaque ? 1.5 : 0) + (effet.empecheBlocage ? 1 : 0);
        return { cibleId: entite.id, kill: tue, score: gain + paralysie };
      }).filter((option) => option.score > 0)
        .sort((a, b) => b.score - a.score);
      if (!options.length) return null;
      const meilleure = options[0];
      const score = (meilleure.kill ? 5 + valeurEntite(
        duel[adv].creatures.find((entite) => entite.id === meilleure.cibleId),
      ) : meilleure.score * 0.8) - cout * 0.2;
      return { score: score > 0 ? score : 0, cibleId: meilleure.cibleId };
    }
    if (effet.type === 'reanimation') {
      // La Réanimation ramène la DERNIÈRE créature du cimetière (le moteur) :
      // elle ne se paie que si ce corps-là vaut son mana.
      const derniere = [...camp.cimetiere].reverse().find((id) => {
        const defunte = duelCardById(id);
        return Boolean(defunte) && !magieById(id) && !armeById(id) && defunte.kind !== 'terrain';
      });
      if (!derniere) return null;
      const valeur = valeurEntite(entiteDeSecours(duelCardById(derniere), duel));
      const score = 1.5 + valeur - cout * 0.2;
      return { score: score > 0 ? score : 0, cibleId: null };
    }
    if (effet.type === 'combat' && effet.sourceCible === 'creature-amie') {
      // Le Défi du Jarl : un duel à deux cibles. Sans champion, rien à jouer ;
      // le combat ne vaut que s'il tue leur menace sans y laisser la nôtre.
      if (!camp.creatures.length) return { score: 0, cibleId: null };
      const meilleure = meilleuresOptionsOffensives(duel, cote, carte, {
        montant: null, sourceType: 'capacite', portee: 'combat', profil, rng,
      });
      if (!meilleure?.cibleId || meilleure.cibleId === 'sorcier') return { score: 0, cibleId: null };
      const cibleId = meilleure.cibleId;
      const cibleAllieeId = choisirChampionDuelIA(duel, cote, cibleId);
      const champion = camp.creatures.find((entite) => entite.id === cibleAllieeId);
      const cible = duel[adv].creatures.find((entite) => entite.id === cibleId);
      if (!champion || !cible) return { score: 0, cibleId: null };
      const echange = resultatBlocage(champion, cible);
      let score = 3 - cout * 0.2;
      if (echange.bloqueurMeurt) score += valeurEntite(cible);
      if (echange.attaquantMeurt) score -= valeurEntite(champion);
      return { score: score > 0 ? score : 0, cibleId, cibleAllieeId };
    }
    if (effet.type === 'blocage-force') {
      // L'Appât de la meute : on marque la plus grosse menace, utile surtout
      // quand on s'apprête à charger.
      const cibleId = ciblesLegales(duel, cote, carte, 'creature')
        .sort((a, b) => menace(b) - menace(a))[0]?.id ?? null;
      if (!cibleId) return { score: 0, cibleId: null };
      const prets = attaquantsPrets(duel, cote).length;
      return { score: prets ? 2 + prets - cout * 0.2 : 0, cibleId };
    }
    if (effet.type === 'brouillard') {
      // Le Grand Voile blanc : il ne vaut que contre une attaque qui se
      // prépare — plus l'adversaire lève de force, plus le voile est cher.
      const menaceAttaque = duel[adv].creatures
        .filter((entite) => moteur.rpgPeutAttaquer(entite))
        .reduce((somme, entite) => somme + (entite.atk ?? 0), 0);
      const enDanger = menaceAttaque >= (camp.pv ?? 0) * 0.5;
      return {
        score: menaceAttaque > 0 ? 2 + menaceAttaque * 0.35 + (enDanger ? 3 : 0) - cout * 0.2 : 0,
        cibleId: null,
      };
    }
    if (effet.type === 'buff' && effet.cible === 'creatures-adverses') {
      // L'Embuscade : le débuff ne tue jamais (plancher 1/1) mais ampute
      // toute la table adverse avant de la jeter sur nos attaquants.
      const adversaires = duel[adv].creatures;
      if (!adversaires.length) return { score: 0, cibleId: null };
      const retraitAtk = Math.abs(Number(effet.atk) || 0);
      const retraitDef = Math.abs(Number(effet.def) || 0);
      const score = 1.5 + adversaires.length * (0.8 + retraitAtk * 0.5 + retraitDef * 0.4)
        + (effet.blocageForce ? 1.5 : 0) - cout * 0.2;
      return { score: score > 0 ? score : 0, cibleId: null };
    }
    if (effet.type === 'buff') {
      // Rien à renforcer sans créature en jeu : le sort reste en main plutôt
      // que d'être brûlé. Un bonus déclaré avec `tours` ne dépasse pas le tour
      // en cours — il ne développe pas la table et ne vaut que pour l’échange.
      // Le Grand Débarquement ne compte que ses cales pleines : sans prise à
      // bord, il ne vaut rien et reste en main.
      const renforcees = effet.caleOccupeeSeulement
        ? camp.creatures.filter((entite) => entite.enCale)
        : camp.creatures;
      if (!renforcees.length) return { score: 0, cibleId: null };
      const bonus = (effet.atk ?? 0) * 0.8 + (effet.def ?? 0) * 0.4
        + (effet.overkill ? 1.1 : 0);
      const durable = Number(effet.tours) > 0 ? 0.5 : 1;
      const score = (1.5 + renforcees.length * (1.5 + bonus)) * durable - cout * 0.2;
      return { score: score > 0 ? score : 0, cibleId: null };
    }
    if (effet.type === 'transfert') {
      // Le cœur pesé (set Ténèbres) : le PV adverse qui tombe vaut le PV
      // gagné ; une mort de sorcier annoncée vaut le duel. La pioche de la
      // Grande Pesée paie en sus.
      const montant = Math.max(0, Number(effet.amount) || 0);
      const pioche = Math.max(0, Number(effet.pioche) || 0);
      const score = (montant >= pvAdv ? 100 : montant * 1.1) + pioche * 1.5 - cout * 0.2;
      return { score, cibleId: null };
    }
    if (effet.type === 'defausse-adverse') {
      // UNE carte, choisie par la victime — sur une main adverse vide, zéro.
      const score = duel[adv].main.length ? 2.4 - cout * 0.2 : 0;
      return { score, cibleId: null };
    }
    if (effet.type === 'defaussePaquet') {
      // Les feuillets pressent la fatigue : deux fois plus utile quand le
      // paquet adverse s'amincit (mode sans terrains).
      const montant = Math.max(0, Number(effet.amount) || 0);
      const reste = duel[adv].deck.length;
      const score = montant * 0.9 * (reste <= 10 ? 2 : 1) - cout * 0.2;
      return { score: score > 0 ? score : 0, cibleId: null };
    }
    if (effet.type === 'bouclier' && effet.cible === 'creature-amie') {
      const cibleId = meilleureCibleAmie(duel, cote, carte);
      return cibleId ? { score: 2 + (effet.amount ?? 0) * 0.5, cibleId } : null;
    }
    if (effet.type === 'arrivees-abordage') {
      // La Lettre de marque : les arrivées du tour accostent — elle ne vaut
      // que ce que le reste de la main peut poser.
      const creaturesEnMain = camp.main.filter((id) => (duelCardById(id) ?? magieById(id) ?? armeById(id))?.kind === 'creature').length;
      return { score: creaturesEnMain ? 1.5 + creaturesEnMain : 0, cibleId: null };
    }
    return null;
  }

  if (carte.kind === 'arme') {
    // Une arme sans porteur libre ne se joue pas : elle attend une créature.
    // Exception, l'**arme vivante** (la Lame des ergs) : elle fait naître le
    // chien de sable qui la portera, elle se joue donc la table vide.
    // Son prix suit ce qu'elle ajoute — chiffres, mot-clé utile au porteur
    // choisi, déclenché — rapporté à son coût, comme un renfort permanent.
    const cibleId = meilleureCibleArme(duel, cote, carte);
    if (!cibleId && !carte.armeVivante) return null;
    const porteur = camp.creatures.find((entite) => entite.id === cibleId);
    // Porteur créé par l'arme elle-même : un jeton 1/1 armé, sans rien
    // dépenser de plus que la carte.
    let gain = (carte.bonus?.atk ?? 0) * 1.3 + (carte.bonus?.def ?? 0);
    if (!porteur) gain += 2.5;
    if (carte.donne?.esquive) gain += 1.5;
    if (carte.donne?.envol && !porteur?.envol) gain += 2.5;
    if (carte.donne?.bouclier) gain += Math.max(0, Number(carte.donne.bouclier) || 0) * 0.9;
    if (carte.donne?.infiltration && !porteur?.infiltration) gain += 2.5;
    if (carte.donne?.furie) gain += 1 + carte.donne.furie * 0.7;
    if (carte.donne?.rapidite && !porteur?.rapidite) gain += 0.7;
    if (carte.donne?.coupRapide && !porteur?.coupRapide) gain += 2;
    if (carte.donne?.tribut) gain += carte.donne.tribut * 0.9;
    if (carte.donne?.immunite && !estProtegee(porteur, carte.donne.immunite)) gain += 2;
    // Le bouclier que l'arme pose sur son porteur, et la morsure qu'elle lui
    // fait payer d'abord (la Hache de la banquise) : le second se retranche
    // du premier, sans jamais rendre la carte absurde à jouer.
    if (carte.donne?.bouclier) gain += carte.donne.bouclier * 0.8;
    if (carte.blessurePorteur) gain -= carte.blessurePorteur * 0.6;
    if (carte.declenche) gain += 2;
    // Les déclencheurs du porteur (lot du Sable) : ce que l'arme rapporte
    // chaque tour, au-delà des chiffres qu'elle affiche.
    if (carte.porteurAttaque) gain += 1.5;
    if (carte.porteurBlesse) gain += 1.5;
    if (carte.porteurBlesseCreature) gain += 1;
    if (carte.porteurBlesseSorcier) gain += 1.5;
    // Le Licou du chien de sable : deux cartes au prix du porteur.
    if (carte.porteurMeurt) gain += porteur?.jeton ? 3 : 1.2;
    // Un serpent appelé à l'arrivée, et un autre à la demande contre du mana
    // (Bâton des citernes) : un corps rapide d'un tour vaut sa frappe.
    if (carte.arrivee?.type === 'jetons') gain += 2.5;
    if (carte.activation) gain += 2;
    return { score: 3 + gain - cout * 0.2, cibleId };
  }

  if (carte.kind === 'site') {
    // Un Site paie aujourd'hui une récompense différée. Bimini vaut son soin,
    // son +3/+3 et ses protections ; un trésor vaut les cartes qu'il révélera.
    const attente = Math.max(1, Number(carte.site?.compteurs) || 1);
    const valeurFinale = carte.site?.recompense === 'bimini'
      ? (camp.creatures.some((entite) => duelCardById(entite.carteId)?.kind !== 'site') ? 11 : 5)
      : Math.max(0, Number(carte.site?.pioche) || 0) * 3.2;
    return { score: Math.max(0.5, valeurFinale - attente * 0.8 - cout * 0.25), cibleId: null };
  }

  // Créature ou héros : le corps sur la table, les arrivées modulent.
  let score = 4 + cout * 0.8;
  // Les capacités de clan du Nord : un corps qui grandit sous les coups, ou
  // une aura qui renforce tout le type déjà posé (Samouraï, Viking…).
  if (carte.furie) score += 0.8 + carte.furie * 0.7;
  if (carte.aura) {
    // Tarek, Amani, Kenshi : l'aura ne grandit que les AUTRES corps — sa
    // valeur suit donc la table déjà posée, pas les chiffres de la carte.
    const force = Math.max(0, Number(carte.aura.atk) || 0) * 0.8
      + Math.max(0, Number(carte.aura.def) || 0) * 0.6;
    score += 1.5 + camp.creatures.length * force;
  }
  if (carte.resonance) {
    const element = cardResonanceGroup(carte);
    const alliees = duel[cote].creatures
      .filter((entite) => cardReceivesResonance(duelCardById(entite.carteId), element)).length;
    const adverses = duel[adv].creatures
      .filter((entite) => cardReceivesResonance(duelCardById(entite.carteId), element)).length;
    score += 1.5 + carte.resonance * 1.5 + alliees * 0.6 - adverses * 0.4;
  }
  if (profil.style === 'controle' && cout <= 2) score -= 1;
  let cibleId = null;
  const arrivee = carte.arrivee;
  if (arrivee) {
    if (arrivee.type === 'pioche') {
      if (arrivee.tribu) {
        const resteUneCarteDuType = camp.deck.some((carteId) => cardHasPrintedType(carteId, arrivee.tribu));
        score += resteUneCarteDuType ? 2.5 + (camp.main.length <= 3 ? 2 : 0) : 0;
      } else {
        score += 2 + (camp.main.length <= 3 ? 2 : 0);
      }
    }
    if (arrivee.type === 'pioche-defausse') {
      const net = Math.max(0, (arrivee.pioche ?? 0) - (arrivee.defausse ?? 0));
      score += 1 + net * 1.5 + (camp.main.length <= 3 ? 2 : 0);
    }
    if (['retour-main', 'exil'].includes(arrivee.type)) {
      const cibleRenvoi = arrivee.type === 'exil' ? choisirCibleAutoIA(duel, cote, carte) : meilleureCibleRenvoiIA(duel, cote, carte);
      if (cibleRenvoi) {
        cibleId = cibleRenvoi;
        const cible = duel[adv].creatures.find((entite) => entite.id === cibleRenvoi);
        if (cible) score += arrivee.type === 'exil' ? 4 + valeurEntite(cible) : 1.5 + menace(cible) * 0.4;
      }
    }
    if (arrivee.type === 'soin') score += Math.min(arrivee.amount ?? 0, manquePv) * 0.8;
    if (arrivee.type === 'transfert') score += Math.max(0, Number(arrivee.amount) || 0) * 1.1;
    if (arrivee.type === 'debuff' || arrivee.type === 'empeche-blocage') {
      // Le venin de la Vipère de verre, la lune dévorée de Bakunawa : la
      // victime se choisit — la plus grosse menace adverse que la protection
      // ne protège pas. Sans victime, l'arrivée ne mord personne : la carte
      // reste en main plutôt que de brûler son sable pour rien.
      const marquee = meilleureCibleMarqueeIA(duel, cote, carte);
      if (!marquee) return { score: 0, cibleId: null };
      cibleId = marquee.id;
      score += 1.5 + menace(marquee) * 0.35;
    }
    if (arrivee.type === 'donne') {
      // Le Faiseur de passage : l'Infiltration va à l'allié le plus précieux,
      // celui qui frappera le plus fort. Sans allié, l'arrivée ne sert à rien.
      const allie = meilleureCibleAmie(duel, cote, carte);
      if (!allie) return { score: 0, cibleId: null };
      cibleId = allie;
      const entiteAllie = duel[cote].creatures.find((entite) => entite.id === allie);
      score += 1.2 + (entiteAllie ? menace(entiteAllie) * 0.2 : 0);
    }
    if (arrivee.type === 'bouclier' && arrivee.cible === 'creature-amie' && arrivee.choisirCible) {
      // La Veilleuse privilégie l'allié le plus utile ; seule, elle peut
      // encore se protéger elle-même grâce au repli du moteur.
      const allie = meilleureCibleAmie(duel, cote, carte);
      if (allie) {
        cibleId = allie;
        const entiteAllie = duel[cote].creatures.find((entite) => entite.id === allie);
        score += 1.2 + (entiteAllie ? menace(entiteAllie) * 0.2 : 0);
      } else {
        score += 0.8;
      }
    }
    if (arrivee.type === 'degats') {
      if (arrivee.cible === 'toutes-autres') {
        const valeurVague = (camp) => duel[camp].creatures.reduce((total, entite) => {
          if (estProtegee(entite, cardColors(carte))) return total;
          return total + (meurtSous(entite, arrivee.amount ?? 0, 'capacite')
            ? valeurEntite(entite) : 0.5);
        }, 0);
        score += valeurVague(adv) - valeurVague(cote);
      } else if (arrivee.cible === 'toutes-creatures') {
        // La protection de couleur annule aussi les dégâts d'arrivée. Ifrit
        // al-Ahmar est la seule vague qui inclut les deux camps : ses pertes
        // alliées et sa propre mort comptent donc dans l'évaluation.
        const campsTouches = arrivee.inclutAllies ? [cote, adv] : [adv];
        const valeurVague = (camp) => duel[camp].creatures
          .filter((entite) => !estProtegee(entite, cardColors(carte)))
          .reduce((total, entite) => total + (meurtSous(entite, arrivee.amount ?? 0, 'capacite')
            ? valeurEntite(entite) : 0.5), 0);
        if (arrivee.inclutAllies) {
          score += valeurVague(adv) - valeurVague(cote);
          // La carte elle-même entre avant la vague : un 3/3 qui s'inflige
          // trois blessures ne laisse pas de présence derrière lui.
          if ((carte.def ?? 0) <= (arrivee.amount ?? 0)) score -= valeurEntite(entiteDeSecours(carte, duel));
        } else {
          score += valeurVague(adv);
          if (duel[adv].creatures.some((entite) => !estProtegee(entite, cardColors(carte))
            && meurtSous(entite, arrivee.amount ?? 0, 'capacite'))) score += 1;
        }
      } else if (arrivee.cible === 'sorcier') {
        score += 2 + (pvAdv <= (arrivee.amount ?? 0) + 10 ? 3 : 0);
      } else {
        const meilleure = meilleuresOptionsOffensives(duel, cote, carte, {
          montant: arrivee.amount ?? 0,
          sourceType: 'capacite',
          portee: 'creature',
          profil,
          rng,
        });
        if (meilleure?.cibleId) {
          cibleId = meilleure.cibleId;
          if (cibleId === 'sorcier') {
            // Le visage est une cible légale (Maître du marteau) : la carte se
            // pose en le frappant, même quand la table adverse est vide.
            score += meilleure.lethal ? 4 : 1.5;
          } else {
            const cible = duel[adv].creatures.find((entite) => entite.id === cibleId);
            score += meilleure.kill ? 3 + valeurEntite(cible) : 0.5 + menace(cible) * 0.2;
          }
        }
      }
    }
    if (arrivee.type === 'combat') {
      const meilleure = meilleuresOptionsOffensives(duel, cote, carte, {
        montant: carte.atk ?? 0,
        sourceType: 'capacite',
        portee: 'combat',
        profil,
        rng,
      });
      if (meilleure?.cibleId && meilleure.cibleId !== 'sorcier') {
        cibleId = meilleure.cibleId;
        const cible = duel[adv].creatures.find((entite) => entite.id === cibleId);
        const echange = resultatBlocage(entiteDeSecours(carte, duel), cible);
        if (echange.attaquantMeurt && !echange.bloqueurMeurt) score -= 8;
        else if (!echange.attaquantMeurt && echange.bloqueurMeurt) score += 3 + valeurEntite(cible);
        else score += (valeurEntite(cible) - valeurEntite(entiteDeSecours(carte, duel))) * 0.6;
        score += echange.attaquantFurie * 0.8;
      } else if (moteur.arriveeACibleLegale(duel, cote, carte)) {
        // Une arrivée qui désigne une créature (le Cavalier) ne se joue pas
        // sans cible : le moteur refuserait la pose.
        return null;
      }
      // Table entièrement protégée contre la couleur de la carte : aucune
      // cible légale, donc la créature entre simplement sans frapper — la
      // carte se joue quand même, la protection adverse ne la bloque pas.
    }
    if (arrivee.type === 'buff') score += camp.creatures.length * 1.5;
    if (arrivee.type === 'infiltration') {
      // +X/+0 à tout le camp, et le droit de frapper sans être bloqué ce tour :
      // d'autant plus fort que le camp est peuplé.
      score += camp.creatures.length * 1.5 + 2;
    }
    if (arrivee.type === 'jetons') {
      // Chaque créature-jeton est un corps de plus sur la table, pour l'attaque
      // suivante comme pour le blocage : deux chiens de sable valent deux tours
      // de pression en plus du sorcier lui-même.
      score += (Math.max(0, Math.floor(Number(arrivee.nombre) || 1))) * 2;
      // Une bannière derrière les jetons les grandit à chaque attaque : le
      // Daimyō et ses deux Samouraïs se renforcent l'un l'autre.
      if (carte.banniere) score += 2;
    }
    if (arrivee.type === 'bouclier') {
      score += 1.5;
      if (arrivee.cible === 'creature-amie') {
        cibleId = meilleureCibleAmie(duel, cote, carte);
        if (cibleId) score += 0.5;
      }
    }
    if (arrivee.type === 'bouclier-lumiere') {
      // La Dame aux ailes d'or, Salem : un rempart qui avale la prochaine
      // attaque ou magie — il protège un corps qu'on veut garder.
      score += 2.5;
    }
    if (arrivee.type === 'soin-creatures') {
      // Yamina : chaque alliée récupère ses PV manquants, le sorcier aussi.
      const soins = camp.creatures.reduce((total, entite) => total
        + Math.min(arrivee.amount ?? 0,
          Math.max(0, (entite.pvMax ?? entite.pv ?? 0) - (entite.pv ?? 0))), 0);
      score += soins * 0.6 + Math.min(arrivee.etJoueur ?? 0, manquePv) * 0.8;
    }
    if (arrivee.type === 'heures') {
      // Le Guetteur du beffroi : un compte à rebours dont la sonnerie frappe
      // le sorcier adverse et pioche — ça vaut un petit bonus, pas plus.
      score += 1 + Math.max(0, Number(arrivee.compteurs) || 0) * 0.3;
    }
    if (arrivee.type === 'recyclage') score += 1.5 + (camp.main.length <= 3 ? 1 : 0);
    if (arrivee.type === 'defausse-adverse') score += duel[adv].main.length ? 1.2 : 0;
    if (arrivee.type === 'reanimation') {
      const derniere = [...camp.cimetiere].reverse().find((id) => {
        const defunte = duelCardById(id);
        return Boolean(defunte) && !magieById(id) && !armeById(id) && defunte.kind !== 'terrain';
      });
      if (derniere) {
        score += valeurEntite(entiteDeSecours(duelCardById(derniere), duel))
          - valeurEntite(entiteDeSecours(carte, duel));
      }
    }
    if (arrivee.type === 'retour-apres-tours') score += 2;
    if (arrivee.type === 'detruire-terrain-aleatoire') score += duel[adv].terrains.length ? 3 : 0;
  }
  // Filet de sécurité : une arrivée qui désigne sa cible (le venin de la
  // Vipère, la lune de Bakunawa, le passage du Faiseur) ne se joue pas sans
  // cible — le moteur refuserait la carte, et le sorcier l'annoncerait sans
  // fin. S'il reste une victime sur la table et que l'arrivée n'en a pas
  // choisi, la carte reste en main.
  if (!cibleId && moteur.arriveeCiblePortee(carte) && moteur.arriveeACibleLegale(duel, cote, carte)) {
    return { score: 0, cibleId: null };
  }
  // Le Tribut (set Ténèbres) : un contact qui vaut des PV à chaque frappe.
  if (carte.tribut) score += carte.tribut * 0.9;
  if (carte.destruction) score += 1;
  if (carte.honneur) score += carte.honneur * (duel[adv].creatures.length ? 0.8 : 0.3);
  if (carte.combat) score += 2;
  // L'Abordage (set Lettres de Marque) : la prize à l'arrivée — une créature
  // adverse de coût ≤ seuil quitte la table sans mourir. Le moteur choisit
  // la meilleure prise tout seul (cibleId reste null ici). Le seuil peut
  // venir d’un sceau du camp (Lettre de marque, Pilote de la Carreira) : au
  // barème du set, coût de l’arrivante − 1.
  const seuilAbordageIa = Number.isFinite(carte.abordage)
    ? carte.abordage
    : (duel[cote]?.abordageDesArrivees || duel[cote]?.prochaineArriveeAbordage)
      ? Math.max(0, (Number(carte.cost) || 0) - 1)
      : null;
  if (seuilAbordageIa !== null) {
    const prisable = duel[adv].creatures.some((entite) => (duelCardById(entite.carteId)?.kind ?? 'creature') !== 'hero'
      && !duelCardById(entite.carteId)?.insaisissable
      && !entite.tenaciteDisponible
      && !estProtegee(entite, cardColors(carte))
      && ((duelCardById(entite.carteId)?.cost ?? 0) + Math.max(0, Number(entite.coutBonusArme) || 0)) <= seuilAbordageIa);
    if (prisable) score += 2.5;
  }
  // Le Pilote de la Carreira ne vaut que par la pose suivante : sans autre
  // créature en main à armer ce tour, son routier ne mène nulle part.
  if (carte.arrivee?.type === 'prochaine-arrivee-abordage') {
    const autresCreatures = duel[cote].main
      .filter((id) => id !== carte.id && duelCardById(id)).length;
    if (autresCreatures > 0) score += 1.5;
  }
  // Les Deux Visages (La Barbe Noire) : un corps qui alterne vaut deux
  // présences ; l'insaisissable refuse la cale adverse pour de bon.
  if (carte.alternance) score += 1.5;
  if (carte.insaisissable) score += 1;
  return { score, cibleId };
}

/** Coups actuellement jouables, ordonnés par l'heuristique historique. */
function candidatsCartesIA(duel, cote, options = {}) {
  const { profil, rng } = optionsIA(duel, cote, options);
  const camp = duel[cote];
  const exclus = options.exclus ?? new Set();
  const candidats = [];
  for (const carteId of camp.main) {
    const carte = duelCardById(carteId) ?? magieById(carteId) ?? armeById(carteId);
    if (!carte || carte.kind === 'terrain' || terrainById(carteId)) continue;
    if (exclus.has(carteId)) continue;
    // Hors de son tour (blocage, fin de tour) : seules les magies rapides, et
    // jamais un contre — il n'y a rien à contrer.
    if (options.seulementInstants && (!carte.instant || carte.effet?.type === 'contresort')) continue;
    if (!moteur.rpgPeutPayer(camp, carte)) continue;
    const evaluation = scoreCarte(duel, cote, carte, profil, rng);
    if (!evaluation || !(evaluation.score > 0)) continue;
    // Filet de sécurité : la cible désignée chez l'adversaire doit être
    // légale. Une créature protégée contre la couleur de la carte (ou dérobée
    // aux magies par le Serpent du monde) est refusée par le moteur — la carte
    // annoncée serait alors un tour perdu, le sorcier s'arrêtant sur un refus.
    if (evaluation.cibleId && evaluation.cibleId !== 'sorcier') {
      const visee = duel[autre(cote)].creatures
        .find((entite) => entite.id === evaluation.cibleId);
      if (visee && (estProtegee(visee, cardColors(carte)) || horsDAtteinteDuSort(visee, carte))) continue;
    }
    candidats.push({
      carteId,
      cibleId: evaluation.cibleId ?? null,
      cibleAllieeId: evaluation.cibleAllieeId ?? null,
      score: evaluation.score + (profil.style === 'controle' && carte.kind === 'magie' ? 0.5 : 0),
    });
  }
  return candidats.sort((a, b) => b.score - a.score);
}

/**
 * Copie isolée du duel pour essayer un coup sans toucher à la vraie partie.
 * Les états du moteur sont des données simples ; `structuredClone` conserve
 * aussi les propriétés optionnelles, avec un repli pour les WebView anciens.
 */
function copierDuelPourRecherche(duel) {
  if (typeof globalThis.structuredClone === 'function') return globalThis.structuredClone(duel);
  return JSON.parse(JSON.stringify(duel));
}

/** Applique un candidat dans une copie en passant par les vraies règles. */
function simulerCoupCarte(duel, cote, coup) {
  try {
    const simulation = copierDuelPourRecherche(duel);
    moteur.rpgReglerHasard(simulation, () => 0.5);
    let resultat;
    if (armeById(coup.carteId)) {
      resultat = moteur.rpgJouerArme(simulation, cote, coup.carteId, coup.cibleId);
    } else if (duelCardById(coup.carteId)) {
      resultat = moteur.rpgJouerCreature(simulation, cote, coup.carteId, coup.cibleId);
    } else if (magieById(coup.carteId)) {
      resultat = moteur.rpgLancerMagie(
        simulation, cote, coup.carteId, coup.cibleId, coup.cibleAllieeId,
      );
    }
    return resultat?.ok ? simulation : null;
  } catch {
    // Un effet qui ne peut pas être simulé ne doit jamais bloquer le vrai tour.
    return null;
  }
}

/**
 * Valeur publique d'une position : vie, table, terrains, main (en nombre de
 * cartes) et mana encore disponible. Le contenu de la main adverse n'est
 * jamais consulté : l'IA ne s'accorde pas de connaissance cachée.
 */
function evaluerPositionIA(duel, cote) {
  const vainqueur = moteur.rpgVainqueur(duel);
  if (vainqueur === cote) return 100000;
  if (vainqueur && vainqueur !== 'egalite') return -100000;
  if (vainqueur === 'egalite') return 0;

  const valeurCamp = (camp) => {
    const poidsVie = camp.pv <= 7 ? 1.45 : 1.1;
    const vie = (camp.pv ?? 0) * poidsVie + (camp.bouclier ?? 0) * 0.8;
    const creatures = (camp.creatures ?? []).reduce((total, entite) => {
      const tempo = moteur.rpgPeutAttaquer(entite)
        ? Math.max(0, entite.atk ?? 0) * 0.12
        : 0;
      return total + valeurEntite(entite) + tempo;
    }, 0);
    const terrains = (camp.terrains ?? []).length * 1.15;
    const cartes = Math.min(12, camp.main?.length ?? 0) * 1.35;
    const mana = RPG_ELEMENTS.reduce((total, couleur) => total + (camp.mana?.[couleur] ?? 0), 0) * 0.1;
    return vie + creatures + terrains + cartes + mana;
  };

  return valeurCamp(duel[cote]) - valeurCamp(duel[autre(cote)]);
}

/** Recherche bornée des meilleurs coups de la phase principale. */
function rechercherMeilleureSuite(duel, cote, profil, profondeur, rng) {
  const valeurActuelle = evaluerPositionIA(duel, cote);
  let meilleur = { valeur: valeurActuelle, coup: null };
  if (profondeur <= 0 || Math.abs(valeurActuelle) >= 100000) return meilleur;

  const optionsRecherche = {
    ia: { niveau: profil.niveau, style: profil.style },
    rng,
    exclus: new Set(),
  };
  const candidats = candidatsCartesIA(duel, cote, optionsRecherche)
    .slice(0, profil.largeur);
  for (const coup of candidats) {
    const simulation = simulerCoupCarte(duel, cote, coup);
    if (!simulation) continue;
    const suite = rechercherMeilleureSuite(
      simulation, cote, profil, profondeur - 1, rng,
    );
    // Le score initial départage les positions très proches sans remplacer
    // l'évaluation réelle du plateau par une simple somme de bonus heuristiques.
    const departage = Math.min(0.25, Math.max(0, coup.score) * 0.0025);
    const valeur = suite.valeur + departage;
    if (valeur > meilleur.valeur) meilleur = { valeur, coup };
  }
  return meilleur;
}

/**
 * Le prochain coup du sorcier : la carte la plus utile avec sa cible, ou
 * null quand il n’a rien d’intéressant à faire. Les niveaux Normale et
 * Veilleur simulent en plus plusieurs séquences courtes avec les vraies règles
 * du moteur ; le Veilleur explore plus de réponses et deux coups à l'avance.
 */
export function choisirCarteIA(duel, cote, options = {}) {
  const { profil, rng } = optionsIA(duel, cote, options);
  const candidats = candidatsCartesIA(duel, cote, options);
  if (!candidats.length) return null;
  if (profil.tauxErreur > 0 && candidats.length > 1 && rng() < profil.tauxErreur) {
    return candidats[Math.floor(rng() * candidats.length)];
  }
  // Une magie rapide se choisit en réponse immédiate : pas de planification de
  // phase principale, le joueur attend déjà la réponse du sorcier.
  if (!profil.profondeur || options.seulementInstants) return candidats[0];
  const plan = rechercherMeilleureSuite(duel, cote, profil, profil.profondeur, rng);
  // Si un effet personnalisé refuse la simulation, l'heuristique éprouvée
  // garde toujours la main et la partie continue normalement.
  return plan.coup ?? candidats[0];
}

/**
 * Défausse d’une carte de la main (Jörmungandr…) : l’IA écarte la carte la
 * moins précieuse — un terrain excédentaire si la table est déjà garnie,
 * sinon la carte au score le plus faible.
 */
/**
 * Capacité activée en jeu (la foudre du Père des corbeaux) : le mana de
 * glace est cher, on ne le dépense que pour achever une vraie proie ou
 * estropier une menace assez grosse pour le valoir. Retourne null quand
 * aucun coup ne mérite son mana.
 */
export function choisirActivationIA(duel, cote, options = {}) {
  const { profil = rpgProfilIA(duel?.[cote]?.ia), rng = Math.random } = options;
  const adv = autre(cote);
  for (const entite of duel[cote].creatures) {
    const carte = duelCardById(entite.carteId);
    const activation = carte?.activation;
    if (!activation?.effet) continue;
    if (!moteur.rpgPeutActiverCapacite(duel, cote, entite.id)) continue;
    const montant = Math.max(0, Number(activation.effet.amount) || 0);
    const meilleure = meilleuresOptionsOffensives(duel, cote, carte, {
      montant,
      sourceType: 'capacite',
      portee: 'creature',
      profil,
      rng,
    });
    if (!meilleure?.cibleId || meilleure.cibleId === 'sorcier') continue;
    const cible = duel[adv].creatures.find((candidate) => candidate.id === meilleure.cibleId);
    if (!cible) continue;
    const vautLeMana = meilleure.kill ? valeurEntite(cible) >= 3 : menace(cible) >= 7;
    if (vautLeMana) return { entiteId: entite.id, cibleId: meilleure.cibleId };
  }
  return null;
}

export function choisirDefausseIA(duel, cote = 'sorcier') {
  const camp = duel?.[cote];
  const main = camp?.main ?? [];
  if (!main.length) return -1;
  const terrainsEnJeu = (camp.terrains ?? []).length;
  const terrainsEnMain = main.filter((id) => terrainById(id)).length;
  const valeurEnMain = (id) => {
    if (terrainById(id)) {
      return terrainsEnJeu + terrainsEnMain > 5 ? 0.5 : 3;
    }
    const carte = duelCardById(id) ?? magieById(id);
    if (!carte) return 0;
    return (carte.cost ?? 1) + (carte.rarity === 'mythique' ? 4 : carte.rarity === 'rare' ? 2 : 1);
  };
  let meilleurIndex = 0;
  let pireValeur = Infinity;
  for (let i = 0; i < main.length; i += 1) {
    const v = valeurEnMain(main[i]);
    if (v < pireValeur) {
      pireValeur = v;
      meilleurIndex = i;
    }
  }
  return meilleurIndex;
}
