/**
 * La bourse du Souk : les crédits ◈ et les quêtes du jour d'un joueur.
 *
 * Frère de `useDecksSablier.js`, avec les mêmes règles de la maison :
 *
 *   - **le stockage local est la copie de travail** — le jeu se joue hors ligne,
 *     `letsplay_sablier_bourse_v1` et `letsplay_sablier_quetes_v1` portent
 *     l'état, la table du compte le suit ;
 *   - **rien ne redescend** : la fusion est monotone (`fusionnerPortefeuilles`,
 *     `fusionnerQuetes`), un solde ne disparaît pas parce qu'un appareil est en
 *     retard ;
 *   - **défensif hors provider** : sans compte connecté, tout vit en local et
 *     `statutSync` reste `'local'`.
 *
 * Le hook ne connaît **que des événements normalisés** (`rpgEvenementsDuel.js`) :
 * les gestes du duel lui arrivent par `noterEvenementDuel`, ce qui rend la règle
 * testable sans monter un composant React.
 *
 * ## Le jour
 *
 * `ouvrirJournee` est appelé au montage, et de nouveau **chaque fois que
 * l'onglet redevient visible** : une session laissée ouverte toute la nuit doit
 * voir les quêtes du lendemain. La règle du dossier 13 (D6) tient — le jour ne
 * recule jamais, même si l'horloge de l'appareil recule.
 *
 * ## L'écriture au compte
 *
 * Les deux hooks (`useDecksSablier` et celui-ci) poussent **le même état
 * entier** : chacun relit le stockage local de l'autre au moment d'écrire, et
 * `fusionnerEtatsSablier` est le seul point de fusion. Aucun ne peut donc
 * écraser la moitié de l'autre.
 */

import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from '../auth/AuthContext';
import {
  chargerPortefeuille,
  crediterCredits,
  fusionnerPortefeuilles,
  normaliserPortefeuille,
  reclamerRecompenseTutoriel,
  sauverPortefeuille,
} from './rpgCredits.js';
import {
  chargerEtatQuetes,
  chargerGraine,
  fusionnerQuetes,
  normaliserEtatQuetes,
  ouvrirJournee,
  reclamerCachetDeLaSemaine,
  reclamerCachetDuCycle,
  reclamerQuete,
  sauverEtatQuetes,
} from './rpgQuetes.js';
import { appliquerEvenementDuel, compterReclamations } from './rpgEvenementsDuel.js';
import { ouvrirBooster, ouvrirCoffret } from './rpgBoosters.js';
import { chargerAcquis, chargerCollectionDistante, collectionJoueur } from './rpgCollection.js';
import { chargerDecksMaison, chargerSupprimesMaison, fusionnerEtatsSablier } from './rpgDeckBuilder.js';
import { chargerEtatSablier, sauverEtatSablier } from './rpgSablierRemote.js';

/** L'état local complet, tel qu'il vit sur l'appareil — les deux moitiés. */
function etatLocalComplet() {
  return {
    decks: chargerDecksMaison(),
    supprimes: chargerSupprimesMaison(),
    collection: chargerCollectionDistante(),
    acquis: chargerAcquis(),
    bourse: chargerPortefeuille(),
    quetes: chargerEtatQuetes(),
  };
}

// Une réclamation paie avec la même règle que tout le reste : `crediterCredits`,
// jamais un ajustement écrit sur place. L'arithmétique des ◈ vit dans un seul
// module, et c'est celui qui a ses tests.

/**
 * L'état d'entrée : ce que l'appareil porte, la journée du moment ouverte.
 * `progression` sert aux quêtes qui exigent une garde — « ouvrir le comptoir »
 * ne se tire pas tant que le Souk est fermé.
 */
function etatInitial(progression) {
  const bourse = chargerPortefeuille();
  const journee = ouvrirJournee({ etat: chargerEtatQuetes(), graine: chargerGraine(), progression });
  sauverEtatQuetes(journee.etat);
  return { bourse, quetes: journee.etat };
}

/** Statuts de synchronisation : `'local'`, `'attente'`, `'synchronise'`, `'horsligne'`. */
export function useSablierBourse({ progression = null, rng = Math.random, onCartesRangees = null } = {}) {
  const authContext = useContext(AuthContext);
  const compteId = authContext?.user?.id ?? null;
  const [etat, setEtat] = useState(() => etatInitial(progression));
  const [statutSync, setStatutSync] = useState('local');
  // L'état courant, lisible depuis les rappels sans les recréer à chaque rendu.
  const etatRef = useRef(etat);
  etatRef.current = etat;
  // La progression non plus : un achat ouvert en pleine campagne doit lire les
  // marches du moment, pas celles du premier rendu.
  const progressionRef = useRef(progression);
  progressionRef.current = progression;
  // La cérémonie d'ouverture en cours — `null` hors d'un achat. Elle vit dans
  // l'état React mais **pas** dans le stockage : elle n'a rien à survivre à un
  // rechargement, et les cartes, elles, sont déjà encaissées.
  const [ouverture, setOuverture] = useState(null);
  const rngRef = useRef(rng);
  rngRef.current = rng;

  /** Écrit une paire (bourse, quêtes) : stockage d'abord, écran ensuite, compte en dernier. */
  const appliquer = useCallback((bourse, quetes) => {
    sauverPortefeuille(bourse);
    sauverEtatQuetes(quetes);
    setEtat({ bourse, quetes });
  }, []);

  /** Pousse l'état entier au compte — les deux moitiés, jamais une seule. */
  const pousser = useCallback(() => {
    if (!compteId) return null;
    const fusion = fusionnerEtatsSablier({ local: etatLocalComplet() });
    sauverEtatSablier(compteId, fusion.etat);
    return fusion.etat;
  }, [compteId]);

  // Le jour se referme tout seul : au retour sur l'onglet, la journée courante
  // est réouverte (nouveau tirage, compteurs à zéro) — la série, elle, continue.
  useEffect(() => {
    const surReveil = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const journee = ouvrirJournee({ etat: etatRef.current.quetes, graine: chargerGraine(), progression });
      if (!journee.nouveau) return;
      appliquer(etatRef.current.bourse, journee.etat);
      pousser();
    };
    document?.addEventListener?.('visibilitychange', surReveil);
    return () => document?.removeEventListener?.('visibilitychange', surReveil);
  }, [progression, appliquer, pousser]);

  // À la connexion (et à chaque retour de connexion), la fusion compte ↔ appareil.
  useEffect(() => {
    if (!compteId) {
      setStatutSync('local');
      return undefined;
    }
    let vivant = true;
    setStatutSync('attente');
    (async () => {
      const { state, source } = await chargerEtatSablier(compteId);
      if (!vivant) return;
      if (source === 'unavailable' || !state) {
        setStatutSync(source === 'unavailable' ? 'horsligne' : 'local');
        return;
      }
      // Le compte et l'appareil, moitié par moitié : l'économie n'écrase jamais
      // les decks, ni l'inverse — `fusionnerEtatsSablier` les range ensemble.
      const fusion = fusionnerEtatsSablier({ local: etatLocalComplet(), distant: state });
      const bourse = fusionnerPortefeuilles(etatRef.current.bourse, fusion.etat.bourse).portefeuille;
      const quetes = fusionnerQuetes(etatRef.current.quetes, fusion.etat.quetes).etat;
      if (!vivant) return;
      appliquer(bourse, quetes);
      setStatutSync('synchronise');
      sauverEtatSablier(compteId, { ...fusion.etat, bourse, quetes });
    })();
    return () => { vivant = false; };
  }, [compteId, appliquer]);

  /**
   * Applique un événement du duel : le solde s'il paie, les quêtes du jour
   * toujours. Rend `{ gain, evenement, reconnu }` — `gain` est ce que le duel
   * peut annoncer, `reconnu` dit si le geste fait partie du contrat.
   */
  const noterEvenementDuel = useCallback((evenement) => {
    const avant = etatRef.current;
    const suite = appliquerEvenementDuel(avant, evenement);
    if (!suite.reconnu) return { gain: 0, evenement: null, reconnu: false };
    // Les deux modules rendent leur entrée **telle quelle** quand rien ne bouge :
    // la comparaison de références suffit donc, et un geste sans effet (poser un
    // terrain quand aucune quête ne l'écoute) ne fait pas re-rendre l'écran.
    if (suite.bourse !== avant.bourse || suite.quetes !== avant.quetes) {
      appliquer(normaliserPortefeuille(suite.bourse), normaliserEtatQuetes(suite.quetes));
      pousser();
    }
    return { gain: suite.gain, evenement: suite.evenement, reconnu: true };
  }, [appliquer, pousser]);

  /**
   * Réclame une quête terminée : les ◈ entrent dans la bourse, la quête est
   * marquée prise (on ne la paie pas deux fois). Rend le montant encaissé, ou
   * `0` si la réclamation n'était pas due.
   */
  const reclamerUneQuete = useCallback((queteId) => {
    const avant = etatRef.current;
    const resultat = reclamerQuete(avant.quetes, queteId);
    if (!resultat.ok) return 0;
    appliquer(crediterCredits(avant.bourse, resultat.credits).portefeuille, resultat.etat);
    pousser();
    return resultat.credits;
  }, [appliquer, pousser]);

  /**
   * Achète et ouvre un paquet (ou un coffret de dix) : les crédits sont
   * débités, les cinq cartes rejoignent le portefeuille, les doublons sont
   * remboursés, la pitié avance — et « Ouvrir le comptoir » avance d'un cran.
   *
   * La **collection** que voit le tirage est celle de l'appareil au complet :
   * dotation, acquis gelés, apports du compte et cartes déjà achetées au Souk.
   * C'est ce qui évite de re-vendre une carte que le joueur possède déjà.
   *
   * Rend `{ ok, raison, prix, tirage }`. Un refus (rayon fermé, solde
   * insuffisant) ne touche à rien — et il est dit en clair à l'écran.
   */
  const acheter = useCallback((rayonId, { coffret = false } = {}) => {
    const avant = etatRef.current;
    const collection = collectionJoueur({
      acquis: chargerAcquis(),
      distante: chargerCollectionDistante(),
      souk: avant.bourse.cartes,
    });
    const ouvreur = coffret ? ouvrirCoffret : ouvrirBooster;
    const achat = ouvreur({
      portefeuille: avant.bourse,
      rayonId,
      progression: progressionRef.current,
      collection,
      rng: rngRef.current,
    });
    if (!achat.ok) return { ok: false, raison: achat.raison, prix: achat.prix, tirage: null };
    // Le reste de la boucle : l'ouverture est un geste du contrat d'événements,
    // donc les quêtes du jour la voient comme n'importe quel autre geste.
    const suite = appliquerEvenementDuel(
      { bourse: achat.portefeuille, quetes: avant.quetes },
      { type: 'booster-ouvert', rayonId },
    );
    appliquer(suite.bourse, suite.quetes);
    // Le paquet et le coffret ne rendent pas la même forme : le paquet rend un
    // tirage, le coffret une liste de paquets. La cérémonie, elle, reçoit
    // toujours la même : les cartes, une par une, et ce qu'elles ont rendu.
    const paquets = coffret ? achat.paquets : [achat.tirage];
    const cartes = paquets.flatMap((paquet) => paquet.details ?? []);
    // Les cartes sont écrites sur l'appareil **avant** la cérémonie : fermer
    // l'onglet au milieu d'un retournement ne doit rien coûter au joueur.
    setOuverture({
      rayonId,
      coffret,
      paquets: paquets.length,
      prix: achat.prix,
      cartes,
      remboursement: paquets.reduce((somme, paquet) => somme + (paquet.remboursement ?? 0), 0),
      nouvelles: cartes.filter((carte) => !carte.doublon).length,
      mythique: paquets.some((paquet) => paquet.mythique),
    });
    pousser();
    onCartesRangees?.();
    return { ok: true, raison: null, prix: achat.prix, tirage: achat.tirage };
  }, [appliquer, pousser, onCartesRangees]);

  /** Le paquet : cinq cartes, le prix du rayon. */
  const acheterBooster = useCallback((rayonId) => acheter(rayonId, { coffret: false }), [acheter]);

  /** Le coffret : dix paquets d'un même rayon, une mythique assurée. */
  const acheterCoffret = useCallback((rayonId) => acheter(rayonId, { coffret: true }), [acheter]);

  /**
   * Referme la cérémonie d'ouverture. Le portefeuille est déjà écrit et déjà
   * poussé au compte : ici, on rend la main, rien de plus.
   */
  const fermerOuverture = useCallback(() => setOuverture(null), []);

  /**
   * Le Cachet de la semaine : sept jours d'affilée. La série est relue **avant**
   * la garde de jour, comme au montage : c'est elle qui dit si le Cachet est dû,
   * et une série qui se termine aujourd'hui ne doit pas être perdue parce que
   * la journée a été rouverte entre-temps.
   */
  const reclamerLeCachetDeLaSemaine = useCallback(() => {
    const avant = etatRef.current;
    const serie = ouvrirJournee({
      etat: avant.quetes, graine: chargerGraine(), progression: progressionRef.current,
    }).etat.serie;
    const resultat = reclamerCachetDeLaSemaine({ etat: avant.quetes, serie });
    if (!resultat.ok) return 0;
    appliquer(crediterCredits(avant.bourse, resultat.credits).portefeuille, resultat.etat);
    pousser();
    return resultat.credits;
  }, [appliquer, pousser]);

  /** La récompense d'un tutoriel : versée une seule fois, puis retenue dans
   *  `bourse.tutoriels` (la fusion entre appareils en fait l'union). Rend le
   *  gain réellement encaissé, `0` si la leçon était déjà payée. */
  const reclamerTutoriel = useCallback((tutorielId, montant) => {
    const avant = etatRef.current;
    const resultat = reclamerRecompenseTutoriel(avant.bourse, tutorielId, montant);
    if (!resultat.ok) return 0;
    appliquer(resultat.portefeuille, avant.quetes);
    pousser();
    return resultat.gain;
  }, [appliquer, pousser]);

  /** Le Cachet du cycle : +80 ◈ une fois les trois quêtes du jour réclamées. */
  const reclamerLeCachet = useCallback(() => {
    const avant = etatRef.current;
    const resultat = reclamerCachetDuCycle(avant.quetes);
    if (!resultat.ok) return 0;
    appliquer(crediterCredits(avant.bourse, resultat.credits).portefeuille, resultat.etat);
    pousser();
    return resultat.credits;
  }, [appliquer, pousser]);

  return {
    bourse: etat.bourse,
    quetes: etat.quetes,
    credits: etat.bourse.credits,
    aReclamer: compterReclamations(etat.quetes),
    statutSync,
    noterEvenementDuel,
    reclamerUneQuete,
    reclamerTutoriel,
    reclamerLeCachet,
    reclamerLeCachetDeLaSemaine,
    acheterBooster,
    acheterCoffret,
    fermerOuverture,
    ouverture,
    pousser,
  };
}
