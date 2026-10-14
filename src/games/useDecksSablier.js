/**
 * Les decks maison et la collection du Sablier, câblés à React.
 *
 * Le stockage local reste la copie de travail (le jeu marche hors ligne et
 * sans compte) ; le compte connecté — s'il y en a un — synchronise son casier
 * (`rpg_sablier_progress`) à la connexion puis à chaque mutation. La lecture
 * du contexte d'authentification est **défensive** : montée hors provider
 * (vérifications jsdom), la page vaut « non connecté » plutôt que de tomber.
 *
 * La collection est dérivée (jamais stockée telle quelle localement) :
 * dotation + récompenses des étages déblayés (`rpgCollection.js`), plus les
 * apports du compte mis en cache. Les mutations locales poussent l'état
 * fusionné au compte en tâche de fond — une écriture manquée ne change rien
 * pour le joueur : la prochaine mutation repoussera l'ensemble.
 */

import { useCallback, useEffect, useRef, useState, useContext } from 'react';
import { AuthContext } from '../auth/AuthContext';
import {
  enregistrerDeckDansCasier,
  chargerDecksMaison,
  chargerSupprimesMaison,
  fusionnerEtatsSablier,
  sauverCasierMaison,
  supprimerDeckDuCasier,
} from './rpgDeckBuilder.js';
import {
  chargerCollectionDistante,
  collectionJoueur,
  figerAcquisitions,
  sauverAcquis,
  sauverCollectionDistante,
} from './rpgCollection.js';
import { cartesOuvertes } from './rpgBoosters.js';
import { cardById } from './rpgCards.js';
import { chargerPortefeuille, sauverPortefeuille } from './rpgCredits.js';
import { chargerEtatQuetes, sauverEtatQuetes } from './rpgQuetes.js';
import { chargerEtatSablier, sauverEtatSablier } from './rpgSablierRemote.js';

/** L'identifiant du compte Sablier actif, ou `null` (hors provider, déconnecté, profil de démonstration). */
function compteSablierActif() {
  try {
    const auth = useContext(AuthContext);
    if (!auth || auth.isDemo) return null;
    return auth.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * L'état complet porté par le compte : casier local, apports du compte en
 * cache, acquis figés de l'appareil (le gel), et **l'économie** — le solde et
 * les quêtes, qui appartiennent à `useSablierBourse.js`.
 *
 * Ce hook les relit sur l'appareil au moment d'écrire sans jamais les toucher :
 * c'est ce qui lui permet de pousser l'état **entier** sans écraser les crédits
 * de son voisin, et réciproquement.
 */
function etatLocalActuel(acquis) {
  const casier = { decks: chargerDecksMaison(), supprimes: chargerSupprimesMaison() };
  return {
    ...casier,
    collection: chargerCollectionDistante(),
    acquis,
    bourse: chargerPortefeuille(),
    quetes: chargerEtatQuetes(),
  };
}

/**
 * La collection effective de l'appareil : la dotation de départ, les acquis
 * gelés, les apports du compte — et les **cartes achetées au Souk**, qui vivent
 * dans le portefeuille (`useSablierBourse.js`). Ce hook les transporte comme il
 * transporte l'économie : il les relit sur l'appareil, il ne les modifie pas.
 */
function collectionDeLAppareil(acquis) {
  return collectionJoueur({
    acquis,
    distante: chargerCollectionDistante(),
    souk: chargerPortefeuille().cartes,
  });
}

/** Statuts de synchronisation : `'local'`, `'attente'`, `'synchronise'`, `'horsligne'`. */
export function useDecksSablier() {
  // Le gel des acquis est calculé UNE fois, au montage : au premier lancement
  // de cette version, il reprend les cartes que l'ancienne règle avait données
  // pour les étages déjà vaincus (`figerAcquisitions`). Ensuite, `gel: true` le
  // rend définitif — les victoires suivantes révèlent sans donner.
  const [acquis, setAcquis] = useState(() => figerAcquisitions());
  const acquisRef = useRef(acquis);
  const [decksMaison, setDecksMaison] = useState(() => chargerDecksMaison());
  const [collection, setCollection] = useState(() => collectionDeLAppareil(acquis));
  const [statutSync, setStatutSync] = useState('local');
  const compteId = compteSablierActif();
  const supprimesRef = useRef(chargerSupprimesMaison());
  // Le gel est écrit sur l'appareil dès qu'il change (silencieux s'il n'y a
  // pas de stockage : le jeu reste jouable, la migration se refera).
  useEffect(() => { sauverAcquis(acquis); }, [acquis]);

  // À la connexion (et au retour de connexion), la fusion compte ↔ appareil.
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
      if (!state) {
        setStatutSync(source === 'unavailable' ? 'horsligne' : 'local');
        return;
      }
      const fusion = fusionnerEtatsSablier({ local: etatLocalActuel(acquisRef.current), distant: state });
      sauverCasierMaison(fusion.casier);
      supprimesRef.current = fusion.casier.supprimes;
      setDecksMaison(fusion.casier.decks);
      sauverCollectionDistante(fusion.etat.collection);
      // L'économie appartient à `useSablierBourse.js` : ce hook la transporte,
      // jamais ne la modifie — elle est rendue au stockage telle que la fusion
      // l'a recomposée, pour que l'autre hook la voie.
      sauverPortefeuille(fusion.etat.bourse);
      sauverEtatQuetes(fusion.etat.quetes);
      // Les acquis du compte rejoignent ceux de l'appareil (union, gel
      // compris) : un autre appareil peut porter des cartes que celui-ci n'a
      // pas encore vues.
      const acquisFusionnes = fusion.etat.acquis ?? acquisRef.current;
      acquisRef.current = acquisFusionnes;
      setAcquis(acquisFusionnes);
      setCollection(collectionJoueur({
        acquis: acquisFusionnes,
        distante: fusion.etat.collection,
        souk: fusion.etat.bourse?.cartes ?? [],
      }));
      setStatutSync('synchronise');
      // La fusion a apporté quelque chose à l'appareil : les autres
      // appareils doivent le savoir (pierres tombales, decks récents).
      if (fusion.modifie) sauverEtatSablier(compteId, fusion.etat);
    })();
    return () => {
      vivant = false;
    };
  }, [compteId]);

  // Les decks, pierres tombales, la collection effective et les acquis du
  // moment, poussés au compte — **avec l'économie**, relue sur l'appareil au
  // moment d'écrire. `etatLocalActuel` est la seule fabrique de cet état : un
  // enregistrement de deck ne doit jamais effacer les crédits de son voisin.
  const pousser = useCallback((casier, collectionEffective) => {
    if (!compteId) return;
    sauverEtatSablier(compteId, {
      ...etatLocalActuel(acquisRef.current),
      decks: casier.decks,
      supprimes: casier.supprimes,
      collection: collectionEffective,
      majLe: new Date().toISOString(),
    });
  }, [compteId]);

  /**
   * Enregistre un deck maison (création ou édition). Rend `{ ok, raison,
   * enregistre, deck }` — `enregistre` dit si l'appareil a pu écrire (sinon le
   * deck reste valable pour la session), `deck` est l'enregistrement horodaté.
   */
  const enregistrerDeckMaison = useCallback((deck) => {
    const maj = enregistrerDeckDansCasier({ decks: chargerDecksMaison(), supprimes: supprimesRef.current }, deck);
    if (!maj.ok) return { ok: false, raison: maj.raison, enregistre: false, deck: null };
    const enregistre = sauverCasierMaison(maj.casier);
    supprimesRef.current = maj.casier.supprimes;
    setDecksMaison(maj.casier.decks);
    const collectionEffective = collectionDeLAppareil(acquisRef.current);
    pousser(maj.casier, collectionEffective);
    return { ok: true, raison: null, enregistre, deck: maj.deck };
  }, [pousser]);

  /** Retire un deck maison (pierre tombale posée, pour la synchronisation). */
  const supprimerDeckMaison = useCallback((id) => {
    const casier = supprimerDeckDuCasier({ decks: chargerDecksMaison(), supprimes: supprimesRef.current }, id);
    const enregistre = sauverCasierMaison(casier);
    supprimesRef.current = casier.supprimes;
    setDecksMaison(casier.decks);
    pousser(casier, collectionDeLAppareil(acquisRef.current));
    return enregistre;
  }, [pousser]);

  /**
   * Une victoire d'étage vient d'être enregistrée : **elle ne donne plus de
   * cartes**, elle en **ouvre** au Souk (`rpgBoosters.js`). Le
   * compte reçoit l'union courante, pour les autres appareils, et la fonction
   * rend les cartes que cette victoire vient d'ouvrir — l'écran de fin de duel
   * peut les annoncer, et le lot 2 y branchera les crédits.
   */
  const noterVictoireEtage = useCallback((etageId, progressionMaj) => {
    const collectionEffective = collectionDeLAppareil(acquisRef.current);
    if (compteId) {
      pousser({ decks: chargerDecksMaison(), supprimes: supprimesRef.current }, collectionEffective);
    }
    setCollection(collectionEffective);
    const vaincusAvant = (progressionMaj?.etagesVaincus ?? []).filter((id) => id !== etageId);
    const ouvertesAvant = new Set(cartesOuvertes({ etagesVaincus: vaincusAvant }));
    return cartesOuvertes(progressionMaj)
      .filter((id) => !ouvertesAvant.has(id))
      .map((id) => ({ id, carte: cardById(id) }));
  }, [compteId, pousser]);

  /**
   * Relit la collection effective de l'appareil. Le Souk s'en sert après un
   * achat : les cartes du portefeuille viennent d'entrer dans la collection, et
   * l'atelier de decks doit les voir sans qu'on recharge la page.
   */
  const rafraichirCollection = useCallback(() => {
    setCollection(collectionDeLAppareil(acquisRef.current));
  }, []);

  return {
    decksMaison, collection, statutSync,
    enregistrerDeckMaison, supprimerDeckMaison, noterVictoireEtage, rafraichirCollection,
  };
}
