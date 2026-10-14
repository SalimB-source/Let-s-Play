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
  sauverPortefeuille,
} from './rpgCredits.js';
import {
  chargerEtatQuetes,
  chargerGraine,
  fusionnerQuetes,
  normaliserEtatQuetes,
  ouvrirJournee,
  reclamerCachetDuCycle,
  reclamerQuete,
  sauverEtatQuetes,
} from './rpgQuetes.js';
import { appliquerEvenementDuel, compterReclamations } from './rpgEvenementsDuel.js';
import { chargerDecksMaison, chargerSupprimesMaison, fusionnerEtatsSablier } from './rpgDeckBuilder.js';
import { chargerAcquis, chargerCollectionDistante } from './rpgCollection.js';
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
export function useSablierBourse({ progression = null } = {}) {
  const authContext = useContext(AuthContext);
  const compteId = authContext?.user?.id ?? null;
  const [etat, setEtat] = useState(() => etatInitial(progression));
  const [statutSync, setStatutSync] = useState('local');
  // L'état courant, lisible depuis les rappels sans les recréer à chaque rendu.
  const etatRef = useRef(etat);
  etatRef.current = etat;

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
    reclamerLeCachet,
    pousser,
  };
}
