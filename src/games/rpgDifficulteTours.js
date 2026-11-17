/**
 * La pression des Tours — ce que chaque gardien ajoute au duel.
 *
 * Depuis que les paquets d'étage sont taillés dans les listes thématiques du
 * catalogue (`rpgDecksThematiques.js`), deux étages ne se distinguent plus par
 * leurs cartes : ils jouent les mêmes trente cartes, avec les mêmes deux
 * exemplaires par carte, et le joueur peut aligner exactement le même paquet.
 * La difficulté d'une tour ne peut donc plus venir du paquet — elle vient du
 * **pacte** du gardien et du **cerveau** qui le joue.
 *
 * `pressionEtage(puissance)` traduit la puissance affichée sur la fiche
 * d'étage en deux leviers, tous deux lisibles **avant** le duel :
 *
 *  - `atouts` : PV de départ, cartes de plus en main et bouclier initial
 *    (`rpgAtoutsSorcier` dans `rpgDuel.js`, bornés par `RPG_ATOUTS_MAX`). Le
 *    pacte se cumule avec celui qu'un étage déclare : la pression ne retire
 *    jamais un atout écrit dans les données ;
 *  - `niveau` : le plancher d'IA de l'étage — un gardien de puissance 8 ne
 *    joue jamais comme une initiation, quoi qu'en dise une fiche ancienne.
 *    Un étage peut toujours déclarer plus fort : le plancher ne descend
 *    personne.
 *
 * La rampe est volontairement raide : plus on monte dans les tours, plus le
 * gardien commence loin devant. Rien n'est caché — la fiche d'étage affiche le
 * pacte (« Pacte : +16 PV · +1 carte · bouclier 5 ») et le niveau d'IA.
 *
 * **Pas de mana dans la pression.** Les règles du Sablier sont aujourd'hui
 * sans mana : `rpgPeutPayer` ne regarde que le prix en PV, et un atout `mana`
 * ne change rien au duel. Offrir du mana au gardien serait un pacte affiché
 * pour rien ; la pression ne joue donc que les leviers qui pèsent réellement.
 *
 * Le module ne dépend d'aucun autre module de jeu : il reste pur et importable
 * par les données (`rpgStoryTours.js`), par l'interface et par les tests.
 */

/** Les mêmes bornes que `RPG_ATOUTS_MAX` (`rpgDuel.js`), rappelées ici pour
 *  que la pression soit calculable sans charger le moteur. Un test vérifie
 *  que les deux tables restent identiques. */
export const RPG_PRESSION_CAPS = Object.freeze({
  pv: 20, mana: 3, main: 3, bouclier: 10,
});

/** L'ordre des niveaux d'IA, du plus tendre au plus fort — miroir de
 *  `RPG_NIVEAUX_IA` (`rpgAI.js`), vérifié par un test. */
export const RPG_PRESSION_ORDRE_IA = Object.freeze(['recit', 'normale', 'veilleur', 'sablier', 'oubliee']);

/** Le plancher d'IA, par palier de puissance (du plus fort au plus faible).
 *  Puissance 1 → Gardien, 5 → Veilleur, 8 → Sablier : les tours terminales
 *  jouent au cerveau le plus profond du jeu. La puissance 0 reste
 *  l'Initiation : le premier étage de la première tour apprend le jeu. */
export const RPG_PRESSION_PALIERS_IA = Object.freeze([
  Object.freeze({ puissance: 8, niveau: 'sablier' }),
  Object.freeze({ puissance: 5, niveau: 'veilleur' }),
  Object.freeze({ puissance: 1, niveau: 'normale' }),
  Object.freeze({ puissance: 0, niveau: 'recit' }),
]);

/** La rampe du pacte, en clair (voir `atoutsPression`). */
export const RPG_PRESSION_RAMPE = Object.freeze({
  /** PV de départ : 2 par point de puissance, plafonnés à 20. */
  pvParPuissance: 2,
  /** Bouclier initial : 0,6 par point de puissance (arrondi), plafonné à 10. */
  bouclierParPuissance: 0.6,
  /** Puissance à partir de laquelle le gardien ouvre avec une carte de plus. */
  mainDes: 7,
  /** Puissance à partir de laquelle le gardien ouvre avec deux cartes de plus. */
  mainForteDes: 12,
  /** Puissance à partir de laquelle le gardien se présente avec un bouclier. */
  bouclierDes: 3,
});

const entierPositif = (valeur) => {
  const nombre = Number(valeur);
  return Number.isFinite(nombre) && nombre > 0 ? Math.floor(nombre) : 0;
};

/** Le plancher d'IA d'une puissance d'étage. */
export function niveauPressionIA(puissance = 0) {
  const p = entierPositif(puissance);
  return RPG_PRESSION_PALIERS_IA.find((palier) => p >= palier.puissance)?.niveau ?? 'recit';
}

/**
 * Le pacte qu'un étage de cette puissance impose au joueur — PV, cartes en
 * main, bouclier. Toujours dans les bornes du moteur, et toujours croissant.
 */
export function atoutsPression(puissance = 0) {
  const p = entierPositif(puissance);
  const rampe = RPG_PRESSION_RAMPE;
  const borner = (valeur, cle) => Math.min(entierPositif(valeur), RPG_PRESSION_CAPS[cle]);
  return {
    pv: borner(Math.round(p * rampe.pvParPuissance), 'pv'),
    main: borner(p >= rampe.mainForteDes ? 2 : p >= rampe.mainDes ? 1 : 0, 'main'),
    bouclier: borner(p >= rampe.bouclierDes ? Math.round(p * rampe.bouclierParPuissance) : 0, 'bouclier'),
  };
}

/** Les deux leviers d'un étage, calculés depuis sa seule puissance. */
export function pressionEtage(puissance = 0) {
  return { niveau: niveauPressionIA(puissance), atouts: atoutsPression(puissance) };
}

/** Le niveau le plus fort des deux (la pression ne descend jamais un étage). */
export function niveauLePlusFort(declare, plancher) {
  const rang = (niveau) => {
    const index = RPG_PRESSION_ORDRE_IA.indexOf(niveau);
    return index < 0 ? -1 : index;
  };
  return rang(declare) >= rang(plancher) ? declare : plancher;
}

/** Fusionne les atouts déclarés par un étage avec ceux de la pression :
 *  le maximum levier par levier, pour ne jamais affaiblir un pacte écrit. */
export function fusionnerAtouts(declares = null, pression = null) {
  const resultat = {};
  for (const cle of ['pv', 'mana', 'main', 'bouclier']) {
    const valeur = Math.max(
      entierPositif(declares?.[cle]),
      entierPositif(pression?.[cle]),
    );
    if (valeur > 0) resultat[cle] = Math.min(valeur, RPG_PRESSION_CAPS[cle]);
  }
  return Object.keys(resultat).length ? resultat : null;
}

/** Applique la pression à un étage, sans muter les données d'origine. */
export function appliquerPressionEtage(etage) {
  if (!etage || typeof etage !== 'object') return etage;
  const pression = pressionEtage(etage.puissance ?? 0);
  const atouts = fusionnerAtouts(etage.atouts, pression.atouts);
  return {
    ...etage,
    ia: { ...(etage.ia ?? {}), niveau: niveauLePlusFort(etage.ia?.niveau, pression.niveau) },
    ...(atouts ? { atouts } : {}),
  };
}

/** Applique la pression à une tour entière. */
export function appliquerPressionTour(tour) {
  if (!tour || !Array.isArray(tour.etages)) return tour;
  return { ...tour, etages: tour.etages.map(appliquerPressionEtage) };
}

/** Applique la pression à toutes les tours de la Conquête. */
export function appliquerPressionTours(tours = []) {
  return tours.map(appliquerPressionTour);
}

/** Le pacte d'un étage en clair, pour les fiches : « Pacte : +12 PV ·
 *  +1 carte · bouclier 6 ». Chaîne vide quand l'étage n'a pas de pacte. */
export function libellePacte(atouts = null) {
  if (!atouts) return '';
  const morceaux = [];
  if (atouts.pv) morceaux.push(`+${atouts.pv} PV`);
  if (atouts.main) morceaux.push(`+${atouts.main} carte${atouts.main > 1 ? 's' : ''}`);
  if (atouts.bouclier) morceaux.push(`bouclier ${atouts.bouclier}`);
  return morceaux.length ? `Pacte : ${morceaux.join(' · ')}` : '';
}
