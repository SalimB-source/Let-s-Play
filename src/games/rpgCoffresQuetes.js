/**
 * Les quêtes du jour deviennent des **coffres** — src/games/rpgCoffresQuetes.js
 * ============================================================================
 * L'accueil mobile du Sablier prend la grammaire d'un jeu mobile : une rangée
 * de coffres en bas de l'écran, comme les quatre emplacements d'un certain jeu
 * d'arène. Ici, pas de minuteur : **un coffre se gagne en finissant une quête**,
 * et il s'ouvre tout de suite, d'un tap.
 *
 *   - trois coffres de quête, un par palier — bronze (facile), argent (moyenne),
 *     or (difficile) ; ils versent les crédits que la quête versait déjà ;
 *   - le **Coffre du cycle** (les trois quêtes réclamées) : ses crédits **plus
 *     un vrai paquet de cartes**, retourné par la cérémonie du Souk ;
 *   - le **Coffre de la semaine** (sept jours d'affilée) : ses crédits plus
 *     **deux** paquets.
 *
 * Ce module ne change **aucune** règle d'économie : il lit `rpgQuetes.js` et
 * `rpgCredits.js` et ne fait que dire à l'écran quel coffre poser, dans quel
 * état, et ce qu'il contient. Les crédits restent ceux de la quête ; les
 * paquets sont de vrais paquets offerts (`ouvrirBoosterOffert`), tirés dans un
 * rayon ouvert du comptoir — s'il n'y en a aucun, le coffre rend ses crédits
 * seuls et l'écran le dit, sans jamais promettre de cartes qui ne viennent pas.
 *
 * Module pur : l'état des quêtes entre, la vue des coffres sort.
 */

import { GAINS } from './rpgCredits.js';
import {
  JOURS_DE_LA_SERIE, cachetDeLaSemaineDisponible, cachetDisponible, vueDeLaQuete,
} from './rpgQuetes.js';

/**
 * Les cinq coffres, du plus modeste au plus rare. `paquets` dit combien de
 * paquets de cartes le coffre ajoute à ses crédits ; `teinte` porte la couleur
 * du coffre dans la feuille de style (une seule variable, pas cinq règles).
 */
export const GENRES_COFFRES = Object.freeze({
  bronze: Object.freeze({ id: 'bronze', nom: 'Coffre en bois', teinte: '#955b2d', paquets: 0 }),
  argent: Object.freeze({ id: 'argent', nom: "Coffre d'argent", teinte: '#b9c6d6', paquets: 0 }),
  or: Object.freeze({ id: 'or', nom: "Coffre d'or", teinte: '#f2c14e', paquets: 0 }),
  royal: Object.freeze({ id: 'royal', nom: 'Coffre du cycle', teinte: '#8fd3ff', paquets: 1 }),
  legende: Object.freeze({ id: 'legende', nom: 'Coffre de la semaine', teinte: '#c79bff', paquets: 2 }),
});

/** Le genre de coffre qui correspond au palier d'une quête. */
export const COFFRE_PAR_PALIER = Object.freeze({
  facile: 'bronze',
  moyenne: 'argent',
  difficile: 'or',
});

/** Le genre d'un coffre par son identifiant (`null` si inconnu). */
export function genreCoffre(id) {
  return GENRES_COFFRES[id] ?? null;
}

/** Combien de paquets de cartes un genre ajoute à ses crédits. */
export function paquetsDuCoffre(genreId) {
  return genreCoffre(genreId)?.paquets ?? 0;
}

/**
 * Un emplacement de coffre, tel que l'écran le pose. `etat` vaut :
 * `encours` (verrouillé, la jauge dit où on en est), `pret` (à ouvrir),
 * `ouvert` (déjà encaissé aujourd'hui) ou `expire` (la quête est échue).
 */
function emplacement({ cle, genre, titre, texte, credits, progres, objectif, etat, queteId = null }) {
  const coffre = genreCoffre(genre) ?? GENRES_COFFRES.bronze;
  const borne = Math.max(1, Math.floor(Number(objectif) || 1));
  const fait = Math.max(0, Math.min(borne, Math.floor(Number(progres) || 0)));
  return {
    cle,
    queteId,
    genre: coffre.id,
    nom: coffre.nom,
    teinte: coffre.teinte,
    paquets: coffre.paquets,
    titre,
    texte,
    credits,
    progres: etat === 'ouvert' || etat === 'pret' ? borne : fait,
    objectif: borne,
    pourcent: etat === 'ouvert' || etat === 'pret' ? 100 : Math.round((fait / borne) * 100),
    etat,
  };
}

/**
 * La rangée du jour : trois coffres de quête puis le Coffre du cycle, et —
 * à part, plus large — le Coffre de la semaine.
 *
 * `vueDesCoffres` est **la** vue partagée : l'accueil mobile et la cérémonie
 * d'ouverture la lisent tous les deux, donc ils ne peuvent pas se contredire.
 */
export function vueDesCoffres(etatQuetes, horloge = Date.now()) {
  const liste = Array.isArray(etatQuetes?.quetes) ? etatQuetes.quetes : [];
  const quetes = liste.map((id) => {
    const vue = vueDeLaQuete(etatQuetes, id, horloge);
    if (!vue) return null;
    const { quete, progres, pourcent, etat } = vue;
    return emplacement({
      cle: `quete:${id}`,
      queteId: id,
      genre: COFFRE_PAR_PALIER[quete.palier] ?? 'bronze',
      titre: quete.titre,
      texte: quete.texte,
      credits: quete.recompense,
      progres,
      objectif: quete.objectif,
      etat: etat === 'reclamee' ? 'ouvert' : etat === 'terminee' ? 'pret' : etat === 'expiree' ? 'expire' : 'encours',
    });
  }).filter(Boolean);

  const ouvertes = quetes.filter((coffre) => coffre.etat === 'ouvert').length;
  const cyclePret = cachetDisponible(etatQuetes, horloge);
  const cycle = emplacement({
    cle: 'cycle',
    genre: 'royal',
    titre: 'Coffre du cycle',
    texte: `Réclamez les ${liste.length || 3} quêtes du jour.`,
    credits: GAINS.cachetDuCycle,
    progres: ouvertes,
    objectif: liste.length || 3,
    etat: etatQuetes?.cachet ? 'ouvert' : cyclePret ? 'pret' : 'encours',
  });

  const serie = Math.max(0, Math.floor(Number(etatQuetes?.serie) || 0));
  const semainePret = cachetDeLaSemaineDisponible(etatQuetes);
  const semaine = emplacement({
    cle: 'semaine',
    genre: 'legende',
    titre: 'Coffre de la semaine',
    texte: `${JOURS_DE_LA_SERIE} jours d’affilée.`,
    credits: GAINS.cachetDeLaSemaine,
    progres: semainePret ? JOURS_DE_LA_SERIE : serie % JOURS_DE_LA_SERIE,
    objectif: JOURS_DE_LA_SERIE,
    etat: semainePret ? 'pret' : etatQuetes?.semaine ? 'ouvert' : 'encours',
  });

  const slots = [...quetes, cycle];
  return {
    slots,
    semaine,
    prets: [...slots, semaine].filter((coffre) => coffre.etat === 'pret').length,
    ouverts: [...slots, semaine].filter((coffre) => coffre.etat === 'ouvert').length,
  };
}

/** Le coffre d'une quête, seul (`null` si la quête n'est pas du jour). */
export function coffreDeLaQuete(etatQuetes, queteId, horloge = Date.now()) {
  return vueDesCoffres(etatQuetes, horloge).slots.find((coffre) => coffre.queteId === queteId) ?? null;
}

/** Ce que l'écran annonce sous un coffre, en une ligne courte. */
export function legendeCoffre(coffre) {
  if (!coffre) return '';
  if (coffre.etat === 'ouvert') return 'Ouvert ✓';
  if (coffre.etat === 'expire') return 'Échue';
  if (coffre.etat === 'pret') return 'Ouvrir !';
  return `${coffre.progres}/${coffre.objectif}`;
}
