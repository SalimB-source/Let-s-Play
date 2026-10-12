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
 *  - niveau : 'recit' | 'normale' | 'veilleur'
 *      · récit    → se trompe volontairement (cibles et blocages approximatifs)
 *      · normale  → joue les meilleures options des heuristiques
 *      · veilleur → calcule en plus les lignes létales et garde son burn pour conclure
 *  - style  : 'agressif' | 'equilibre' | 'prudent' | 'controle'
 *      · biaise attaques, blocages, priorité du burn et du contrôle du plateau.
 */

import {
  RPG_ELEMENTS,
  cardColorCost,
  cardColors,
  duelCardById,
  magieById,
  terrainById,
  terrainManaColors,
} from './rpgCards.js';
// Accès différé au moteur (cycle d'import maîtrisé : aucune de ces fonctions
// n'est appelée pendant l'évaluation des modules) — il s'agit ici de tester la
// solvabilité réelle avec exactement les mêmes règles de paiement que le jeu.
import * as moteur from './rpgDuel.js';

export const RPG_NIVEAUX_IA = ['recit', 'normale', 'veilleur'];
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
    /** Le niveau Veilleur calcule les lignes létales et ménage son burn. */
    prescience: niveau === 'veilleur',
  };
}

const optionsIA = (duel, cote, options = {}) => ({
  profil: rpgProfilIA(options.ia ?? duel?.[cote]?.ia ?? null),
  rng: options.rng ?? Math.random,
});

// ── Évaluations de base ─────────────────────────────────────────────────────

/** Version locale du test de protection (pur, sans dépendance au moteur). */
function estProtegee(entite, couleurs) {
  const liste = [...new Set((Array.isArray(couleurs) ? couleurs.flat(Infinity) : [couleurs]).filter(Boolean))];
  return Boolean(liste.length
    && entite?.protection?.toursRestants > 0
    && liste.includes(entite.protection.contre));
}

/** Envol : seul un bloqueur volant peut arrêter un attaquant volant. */
function peutBloquerAttaquant(bloqueur, attaquant) {
  if (!bloqueur || !attaquant) return false;
  return !attaquant.envol || Boolean(bloqueur.envol);
}

/** Dégâts effectifs après Esquive (l’esquive ne s’applique qu’aux attaques et magies). */
export function degatsApresEsquive(entite, montant, sourceType = 'attaque') {
  const degats = Math.max(0, Number(montant) || 0);
  const esquive = sourceType === 'attaque' || sourceType === 'magie'
    ? Math.min(degats, Math.max(0, entite.esquive ?? 0))
    : 0;
  return degats - esquive;
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

/** Furie gagnée par une créature blessée qui survit (0 sans Furie ni blessure). */
export function furieGagnee(entite, degatsRecus) {
  const furie = Math.max(0, Number(duelCardById(entite?.carteId)?.furie) || 0);
  return furie > 0 && (degatsRecus ?? 0) > 0 ? furie : 0;
}

/** L’entité meurt-elle sous un coup de ce type (bouclier compris) ?
 *  Le moteur tue à 0 PV : dégâts ≥ PV + bouclier, pas strictement plus. */
function meurtSous(entite, montant, sourceType = 'attaque') {
  return degatsApresEsquive(entite, montant, sourceType)
    >= (entite.bouclier ?? 0) + Math.max(0, entite.pv ?? 0);
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
    + (entite?.esquive ?? 0) * 1.6
    + Math.max(0, carte.cost ?? 0) * 0.4;
  if (entite?.envol) valeur += 2.5;
  if (entite?.coupRapide) valeur += 2;
  if (entite?.rapidite) valeur += 0.5;
  if (entite?.protection) valeur += 1.5;
  // Furie : la créature grandit à chaque échange où elle survit blessée.
  if (carte.furie) valeur += 1 + carte.furie * 0.7;
  // Résonance : une aura qui renforce toute la Neige de la table.
  if (carte.resonance) valeur += 2 + carte.resonance * 2;
  if (carte.arrivee) valeur += 1.5;
  if (carte.destruction) valeur += 1;
  if (carte.combat) valeur += 2;
  return valeur;
}

/** Dégâts « préalables » d’une capacité (type Sahir) — nuls sans capacité. */
function degatsAvantCombat(carte) {
  if (carte?.combat?.type !== 'degats-creature-combattue') return 0;
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
  let blessureA = blessureNette(attaquant, degatsAvantCombat(carteB), 'capacite');
  let blessureB = blessureNette(bloqueur, degatsAvantCombat(carteA), 'capacite');
  const attaquantVit = !meurtSous(attaquant, degatsAvantCombat(carteB), 'capacite');
  const bloqueurVit = !meurtSous(bloqueur, degatsAvantCombat(carteA), 'capacite');
  let attaquantMeurt = !attaquantVit;
  let bloqueurMeurt = !bloqueurVit;
  if (attaquantVit && bloqueurVit) {
    attaquantMeurt = meurtSous(attaquant, bloqueur.atk, 'attaque');
    bloqueurMeurt = meurtSous(bloqueur, attaquant.atk, 'attaque');
    blessureA += blessureNette(attaquant, bloqueur.atk, 'attaque');
    blessureB += blessureNette(bloqueur, attaquant.atk, 'attaque');
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
    return duel[adv].creatures.filter((entite) => !estProtegee(entite, couleurs));
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
  const prets = duel[cote].creatures.filter((entite) => entite && entite.ready && !entite.attaquee);
  const options = [];
  for (const entite of ciblesLegales(duel, cote, carte, portee)) {
    const kill = montant != null && meurtSous(entite, montant, sourceType);
    options.push({
      cibleId: entite.id,
      kill,
      score: (kill ? 20 : 0) + menace(entite),
    });
  }
  const peutViserSorcier = portee === 'sorcier'
    || portee === 'creature' && (carte?.cibles?.includes('sorcier') ?? false)
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
  if (carte?.arrivee?.type === 'combat') {
    return meilleuresOptionsOffensives(duel, cote, carte, {
      montant: carte.atk ?? 0, sourceType: 'capacite', portee: 'combat', profil, rng,
    })?.cibleId ?? null;
  }
  if (carte?.arrivee?.type === 'degats') {
    return meilleuresOptionsOffensives(duel, cote, carte, {
      montant: carte.arrivee.amount ?? 0,
      sourceType: 'capacite',
      portee: carte.arrivee.cible === 'sorcier' ? 'sorcier' : carte.arrivee.cible === 'toutes-creatures' ? 'zone' : 'creature',
      profil,
      rng,
    })?.cibleId ?? null;
  }
  if (carte?.effet?.type === 'retour-main') {
    return meilleureCibleRenvoiIA(duel, cote, carte);
  }
  if (carte?.effet?.cible === 'creature-amie') {
    return meilleureCibleAmie(duel, cote, carte);
  }
  if (carte?.effet?.type === 'degats') {
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

/** Meilleure créature amie pour un renfort ciblé (bouclier…) : la plus précieuse. */
function meilleureCibleAmie(duel, cote, carte) {
  const couleurs = cardColors(carte);
  return duel[cote].creatures
    .filter((entite) => !estProtegee(entite, couleurs))
    .map((entite) => ({ entite, score: valeurEntite(entite) }))
    .sort((a, b) => b.score - a.score)[0]?.entite.id ?? null;
}

/**
 * Cible du renvoi en main (« bounce ») : la créature la plus lourde parmi
 * celles que le sort peut toucher — la menace adverse qui repart en main
 * (`cible: 'creature'`), ou sa propre créature la plus précieuse si une carte
 * renvoyait une alliée (`cible: 'creature-amie'`). La protection rend la
 * créature intouchable ; sans cible légale, la fonction rend `null`.
 */
function meilleureCibleRenvoiIA(duel, cote, carte) {
  const campCible = carte?.effet?.cible === 'creature-amie' ? duel[cote] : duel[autre(cote)];
  const couleurs = cardColors(carte);
  return campCible.creatures
    .filter((entite) => !estProtegee(entite, couleurs))
    .map((entite) => ({ entite, score: menace(entite) + valeurEntite(entite) * 0.2 }))
    .sort((a, b) => b.score - a.score)[0]?.entite.id ?? null;
}

/**
 * Cible du Coup rapide : la créature qu’on peut tuer avec le plus de valeur,
 * sinon la menace principale (le coup gratuit ne riposte jamais).
 */
export function choisirCiblesRapidesIA(duel, cote, attaquantIds = [], options = {}) {
  const { profil, rng } = optionsIA(duel, cote, options);
  const cibles = {};
  for (const id of [...new Set(attaquantIds)]) {
    const attaquant = duel[cote].creatures.find((entite) => entite.id === id);
    const carte = duelCardById(attaquant?.carteId);
    if (!attaquant || !carte?.coupRapide) continue;
    const meilleure = meilleuresOptionsOffensives(duel, cote, carte, {
      montant: attaquant.atk, sourceType: 'attaque', portee: 'combat', profil, rng,
    });
    if (meilleure?.cibleId && meilleure.cibleId !== 'sorcier') {
      cibles[attaquant.id] = meilleure.cibleId;
    }
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
  const ids = [...new Set(attaquantIds ?? [])].filter((id) => !ciblesAttaque?.[id]);
  const attaquants = duel[coteAttaquant].creatures.filter((entite) => ids.includes(entite.id));
  const bloqueurs = duel[coteDefense].creatures.filter((entite) => entite && !entite.attaquee);
  const affectations = {};
  if (!attaquants.length || !bloqueurs.length) return affectations;

  const legal = (attaquant, bloqueur) => peutBloquerAttaquant(bloqueur, attaquant)
    && !estProtegee(attaquant, cardColors(duelCardById(bloqueur.carteId)));

  const libres = new Set(bloqueurs.map((entite) => entite.id));
  const bloqueurParId = (id) => bloqueurs.find((entite) => entite.id === id);

  const parMenace = [...attaquants]
    .sort((a, b) => (b.atk ?? 0) - (a.atk ?? 0) || valeurEntite(b) - valeurEntite(a));
  const menaceRestante = () => attaquants
    .filter((entite) => !(affectations[entite.id] ?? []).length)
    .reduce((somme, entite) => somme + (entite.atk ?? 0), 0);
  const pvDefense = () => Math.max(0, duel[coteDefense].pv ?? 0) + (duel[coteDefense].bouclier ?? 0);
  const menaceTotale = attaquants.reduce((somme, entite) => somme + (entite.atk ?? 0), 0);
  // Sous pression (l'adversaire cogne fort), chaque dégât évité vaut presque
  // une pointe de valeur : on interpose plus volontiers, chump compris.
  const sousPression = menaceTotale >= pvDefense() * 0.5;
  const facteurVie = sousPression ? 1.25 : 0.4;

  const scoreBlocage = (attaquant, bloqueur) => {
    const { attaquantMeurt, bloqueurMeurt, attaquantFurie, bloqueurFurie } = resultatBlocage(attaquant, bloqueur);
    const degatsEvites = Math.min(attaquant.atk ?? 0, pvDefense());
    const degatsRecus = degatsApresEsquive(bloqueur, attaquant.atk ?? 0, 'attaque');
    // La Furie pèse dans la balance : entamer un viking sans le tuer le
    // nourrit ; survivre blessé de notre côté, au contraire, nous grandit.
    const furie = bloqueurFurie * 0.9 - attaquantFurie * 1.2;
    if (attaquantMeurt && !bloqueurMeurt) return 20 + valeurEntite(attaquant) + degatsEvites * facteurVie + furie;
    if (attaquantMeurt && bloqueurMeurt) {
      const ecart = valeurEntite(attaquant) - valeurEntite(bloqueur);
      if (ecart >= 0) return 10 + ecart + degatsEvites * facteurVie * 0.6 + furie;
      return -5 + ecart + degatsEvites * (sousPression ? 0.5 : 0.15) + furie;
    }
    if (!attaquantMeurt && !bloqueurMeurt) {
      // On l’écroule sans le tuer : utile seulement si ça coûte peu.
      return degatsEvites * facteurVie * 0.6 - degatsRecus * 0.4 + furie;
    }
    // Chump : on meurt sans le tuer — on encaisse quand même le coup est plus
    // lourd que ce que la créature vaut, surtout sous pression.
    return degatsEvites * facteurVie - valeurEntite(bloqueur) * 0.9 + furie;
  };
  const seuil = profil.style === 'agressif' ? -1 : profil.style === 'prudent' ? 2 : 0;

  // 1) Échanges bons ou acceptables, du plus gros attaquant au plus petit.
  for (const attaquant of parMenace) {
    const candidats = [...libres]
      .map(bloqueurParId)
      .filter((bloqueur) => legal(attaquant, bloqueur))
      .map((bloqueur) => ({ bloqueur, score: scoreBlocage(attaquant, bloqueur) }))
      .filter((candidat) => candidat.score > seuil)
      .sort((a, b) => b.score - a.score);
    if (!candidats.length) continue;
    if (profil.tauxErreur > 0 && rng() < profil.tauxErreur) continue;
    const choisi = candidats[0].bloqueur;
    libres.delete(choisi.id);
    affectations[attaquant.id] = [choisi.id];
  }

  // 2) Si la partie se perd sans blocage, on interpose quand même —
  //    d’abord le bloqueur le moins précieux qui encaisse le coup.
  if (menaceRestante() >= pvDefense()) {
    for (const attaquant of parMenace) {
      if (menaceRestante() < pvDefense()) break;
      if ((affectations[attaquant.id] ?? []).length) continue;
      const candidats = [...libres]
        .map(bloqueurParId)
        .filter((bloqueur) => legal(attaquant, bloqueur))
        .sort((a, b) => valeurEntite(a) - valeurEntite(b));
      if (!candidats.length) continue;
      const choisi = candidats[0];
      libres.delete(choisi.id);
      affectations[attaquant.id] = [choisi.id];
    }
  }
  return affectations;
}

// ── Attaques ────────────────────────────────────────────────────────────────

function attaquantsPrets(duel, cote) {
  return duel[cote].creatures.filter((entite) => entite && entite.ready && !entite.attaquee);
}

/**
 * Dégâts au visage garantis quel que soit le blocage adverse : chaque
 * bloqueur ne peut encaisser qu’un attaquant, donc les K plus gros coups
 * peuvent être retenus — le reste passe. Le Coup rapide qui trouve une
 * cible ne touche jamais les PV.
 */
function degatsGarantis(duel, cote, prets) {
  const adv = autre(cote);
  const bloqueurs = duel[adv].creatures.filter((entite) => entite && !entite.attaquee);
  const bloquablePar = (attaquant) => bloqueurs.some((bloqueur) => peutBloquerAttaquant(bloqueur, attaquant)
    && !estProtegee(attaquant, cardColors(duelCardById(bloqueur.carteId))));
  const frappent = prets.filter((attaquant) => {
    const carte = duelCardById(attaquant.carteId);
    return !(carte?.coupRapide && ciblesLegales(duel, cote, carte, 'combat').length);
  });
  const bloquables = frappent.filter(bloquablePar)
    .map((attaquant) => attaquant.atk ?? 0)
    .sort((a, b) => b - a);
  const directs = frappent
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
  const prets = attaquantsPrets(duel, cote);
  if (!prets.length) return [];
  const adv = autre(cote);
  const pvAdv = Math.max(0, duel[adv].pv ?? 0) + (duel[adv].bouclier ?? 0);

  // Létal garanti : on envoie tout, même dans des échanges — conclure prime.
  if (degatsGarantis(duel, cote, prets) >= pvAdv) return prets.map((entite) => entite.id);

  // Course : si l’adversaire nous abat au tour suivant, la défense ne sauvera
  // pas la partie — on accepte des assauts moins rentables pour presser.
  const menaceAdverse = duel[adv].creatures
    .reduce((somme, entite) => somme + (entite?.atk ?? 0), 0);
  const enCourse = menaceAdverse >= (duel[cote].pv ?? 0) + (duel[cote].bouclier ?? 0);

  const evaluation = (ensemble) => {
    const rapides = ensemble.filter((attaquant) => {
      const carte = duelCardById(attaquant.carteId);
      return carte?.coupRapide && ciblesLegales(duel, cote, carte, 'combat').length;
    });
    const frappent = ensemble.filter((attaquant) => !rapides.includes(attaquant));
    const ciblesRapides = choisirCiblesRapidesIA(duel, cote, rapides.map((entite) => entite.id), options);
    const blocages = choisirBloqueursIA(duel, cote, frappent.map((entite) => entite.id), ciblesRapides, options);
    let face = 0;
    let notrePerte = 0;
    let leurPerte = 0;
    let notreFurie = 0;
    let leurFurie = 0;
    for (const attaquant of frappent) {
      const idsBloqueurs = blocages[attaquant.id] ?? [];
      const bloqueur = idsBloqueurs.length
        ? duel[adv].creatures.find((entite) => entite.id === idsBloqueurs[0])
        : null;
      if (!bloqueur) {
        face += attaquant.atk ?? 0;
        continue;
      }
      const echange = resultatBlocage(attaquant, bloqueur);
      if (echange.attaquantMeurt) notrePerte += valeurEntite(attaquant);
      else notreFurie += echange.attaquantFurie * 0.8;
      if (echange.bloqueurMeurt) leurPerte += valeurEntite(bloqueur);
      else leurFurie += echange.bloqueurFurie * 0.8;
    }
    for (const [id, cibleId] of Object.entries(ciblesRapides)) {
      const attaquant = ensemble.find((entite) => entite.id === id);
      const cible = duel[adv].creatures.find((entite) => entite.id === cibleId);
      if (!attaquant || !cible) continue;
      if (meurtSous(cible, attaquant.atk, 'attaque')) leurPerte += valeurEntite(cible);
      else leurPerte += menace(cible) * 0.3;
    }
    return {
      face,
      notrePerte,
      leurPerte,
      score: face + leurPerte - notrePerte + notreFurie - leurFurie,
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
  const resonance = duel && cardColors(carte).includes('neige')
    ? Math.max(0, Number(moteur.rpgResonanceEnJeu(duel)) || 0)
    : 0;
  return {
    id: 'simulation',
    carteId: carte.id,
    atk: (carte.atk ?? 0) + resonance,
    def: (carte.def ?? 0) + resonance,
    pv: (carte.def ?? 0) + resonance,
    pvMax: (carte.def ?? 0) + resonance,
    bouclier: 0,
    esquive: Math.max(0, carte.esquive ?? 0),
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
  const cout = Math.max(0, carte.cost ?? 0);

  if (carte.kind === 'magie' || magieById(carte.id)) {
    const effet = carte.effet ?? {};
    if (effet.type === 'degats') {
      const montant = effet.amount ?? 0;
      if (effet.cible === 'toutes-creatures') {
        const tues = duel[adv].creatures.filter((entite) => meurtSous(entite, montant, 'magie'));
        const blessees = duel[adv].creatures
          .filter((entite) => !meurtSous(entite, montant, 'magie') && degatsApresEsquive(entite, montant, 'magie') > 0);
        // Une seconde vague (`echo`, le Nuage de cendres) ne tue pas encore :
        // l'adversaire a un tour pour la jouer. Elle vaut donc moins qu'un
        // dégât immédiat, mais elle use le bord de table.
        const echoMontant = Math.max(0, Number(effet.echo?.amount) || 0);
        const echo = echoMontant > 0
          ? (duel[adv].creatures.length - tues.length) * echoMontant * 0.35
          : 0;
        const gain = tues.reduce((somme, entite) => somme + valeurEntite(entite), 0) + blessees.length * 1.2 + echo;
        return { score: gain > 0 ? 4 + gain - cout * 0.3 : 0, cibleId: null };
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
      }
      return { score, cibleId: meilleure.cibleId };
    }
    if (effet.type === 'soin') {
      const soin = Math.min(effet.amount ?? 0, manquePv);
      return { score: soin > 0 ? 1 + soin * 1.1 - cout * 0.2 : 0, cibleId: null };
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
    if (effet.type === 'buff') {
      // Rien à renforcer sans créature en jeu : le sort reste en main plutôt
      // que d'être brûlé. Un bonus déclaré avec `tours` ne dépasse pas le tour
      // en cours — il ne développe pas la table et ne vaut que pour l'échange.
      if (!camp.creatures.length) return { score: 0, cibleId: null };
      const bonus = (effet.atk ?? 0) * 0.8 + (effet.def ?? 0) * 0.4;
      const durable = Number(effet.tours) > 0 ? 0.5 : 1;
      const score = (1.5 + camp.creatures.length * (1.5 + bonus)) * durable - cout * 0.2;
      return { score: score > 0 ? score : 0, cibleId: null };
    }
    if (effet.type === 'bouclier' && effet.cible === 'creature-amie') {
      const cibleId = meilleureCibleAmie(duel, cote, carte);
      return cibleId ? { score: 2 + (effet.amount ?? 0) * 0.5, cibleId } : null;
    }
    return null;
  }

  // Créature ou héros : le corps sur la table, les arrivées modulent.
  let score = 4 + cout * 0.8;
  // Les capacités de clan du Nord : un corps qui grandit sous les coups, ou
  // une aura qui renforce toute la Neige déjà posée.
  if (carte.furie) score += 0.8 + carte.furie * 0.7;
  if (carte.resonance) {
    const neigeAlliee = duel[cote].creatures
      .filter((entite) => cardColors(duelCardById(entite.carteId)).includes('neige')).length;
    const neigeAdverse = duel[adv].creatures
      .filter((entite) => cardColors(duelCardById(entite.carteId)).includes('neige')).length;
    score += 1.5 + carte.resonance * 1.5 + neigeAlliee * 0.6 - neigeAdverse * 0.4;
  }
  if (profil.style === 'controle' && cout <= 2) score -= 1;
  let cibleId = null;
  const arrivee = carte.arrivee;
  if (arrivee) {
    if (arrivee.type === 'pioche') score += 2 + (camp.main.length <= 3 ? 2 : 0);
    if (arrivee.type === 'soin') score += Math.min(arrivee.amount ?? 0, manquePv) * 0.8;
    if (arrivee.type === 'degats') {
      if (arrivee.cible === 'toutes-creatures') {
        score += duel[adv].creatures
          .filter((entite) => meurtSous(entite, arrivee.amount ?? 0, 'capacite'))
          .reduce((somme, entite) => somme + valeurEntite(entite), 0) + 1;
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
        if (meilleure?.cibleId && meilleure.cibleId !== 'sorcier') {
          cibleId = meilleure.cibleId;
          const cible = duel[adv].creatures.find((entite) => entite.id === cibleId);
          score += meilleure.kill ? 3 + valeurEntite(cible) : 0.5 + menace(cible) * 0.2;
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
      } else if (duel[adv].creatures.length) {
        return null; // le Cavalier exige une cible légale
      }
    }
    if (arrivee.type === 'buff') score += camp.creatures.length * 1.5;
    if (arrivee.type === 'bouclier') score += 1.5;
    if (arrivee.type === 'retour-apres-tours') score += 2;
    if (arrivee.type === 'detruire-terrain-aleatoire') score += duel[adv].terrains.length ? 3 : 0;
  }
  if (carte.destruction) score += 1;
  if (carte.combat) score += 2;
  return { score, cibleId };
}

/**
 * Le prochain coup du sorcier : la carte la plus utile avec sa cible, ou
 * null quand il n’a rien d’intéressant à faire (il garde alors son mana).
 * Les kills de créatures passent avant le développement, le développement
 * avant le burn inutile, et les renforts arrivent quand le plateau est garni.
 */
export function choisirCarteIA(duel, cote, options = {}) {
  const { profil, rng } = optionsIA(duel, cote, options);
  const camp = duel[cote];
  const candidats = [];
  for (const carteId of camp.main) {
    const carte = duelCardById(carteId) ?? magieById(carteId);
    if (!carte || carte.kind === 'terrain' || terrainById(carteId)) continue;
    if (!moteur.rpgPeutPayer(camp, carte)) continue;
    const evaluation = scoreCarte(duel, cote, carte, profil, rng);
    if (!evaluation || !(evaluation.score > 0)) continue;
    candidats.push({
      carteId,
      cibleId: evaluation.cibleId ?? null,
      score: evaluation.score + (profil.style === 'controle' && carte.kind === 'magie' ? 0.5 : 0),
    });
  }
  if (!candidats.length) return null;
  candidats.sort((a, b) => b.score - a.score);
  if (profil.tauxErreur > 0 && candidats.length > 1 && rng() < profil.tauxErreur) {
    return candidats[Math.floor(rng() * candidats.length)];
  }
  return candidats[0];
}
