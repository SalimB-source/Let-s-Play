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
  reparerCasierHorsStock,
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
import { garantirDeckDeDepart, RPG_DECK_DEPART_ID } from './rpgDeckDeDepart.js';
import { coffretChoisiDeLAppareil, joueurSablierDejaActif } from './rpgCoffretBienvenue.js';
import { useStatutSyncSablier } from './useStatutSyncSablier.js';
import { cartesOuvertes } from './rpgBoosters.js';
import { cardById } from './rpgCards.js';
import { chargerPortefeuille, exemplairesDuPortefeuille, sauverPortefeuille } from './rpgCredits.js';
import { chargerEtatQuetes, sauverEtatQuetes } from './rpgQuetes.js';
import { chargerProfil, sauverProfil } from './rpgProfil.js';
import { chargerProgressionHistoire, sauverProgressionHistoire } from './rpgStory.js';
import { chargerEtatSablier, sauverEtatSablier } from './rpgSablierRemote.js';

/**
 * L'état complet porté par le compte : casier local, apports du compte en
 * cache, acquis figés de l'appareil (le gel), et **l'économie** — le solde, les
 * quêtes et le profil (XP, niveaux), qui appartiennent à `useSablierBourse.js`.
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
    histoire: chargerProgressionHistoire(),
    profil: chargerProfil(),
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

/**
 * Le stock d'exemplaires payés à l'étal, relu sur l'appareil (`rpgCredits.js`).
 * C'est lui, et lui seul, qui borne les copies alignables au deck.
 */
function exemplairesDeLAppareil() {
  return exemplairesDuPortefeuille(chargerPortefeuille());
}

/**
 * L'état d'un appareil au moment où on le lit : ses decks, **rangés** selon le
 * stock du jour, la collection effective et ce stock. Une seule passe de
 * stockage, pour que les trois viennent du même instant.
 *
 * Le rangement n'est ni une punition ni une faveur : les decks écrits avant la
 * règle du stock (doc 13, D10) pouvaient aligner deux copies d'une carte payée
 * une fois. Ils rentrent dans leur stock — rien n'est ajouté à la collection,
 * et rien ne bouge sur un deck déjà conforme.
 */
function etatDeDepart(acquis, { attenteCompte = false, reparer = true } = {}) {
  const collection = collectionDeLAppareil(acquis);
  const exemplaires = exemplairesDeLAppareil();
  const casier = { decks: chargerDecksMaison(), supprimes: chargerSupprimesMaison() };
  // Ne jamais « réparer » avec un stock partiel avant la lecture du compte :
  // cela retirerait les cartes qui existent seulement sur l'autre appareil et
  // rendrait cette suppression plus récente que le vrai deck distant.
  const lu = reparer
    ? reparerCasierHorsStock(casier, collection, exemplaires)
    : { casier, modifie: false, retires: 0, ajoutes: 0 };
  // **Le deck de départ.** Plus aucun deck de base n'est offert depuis les
  // coffrets de bienvenue : si le deck du coffret manque (autre appareil,
  // sauvegarde d'avant), il est reposé ; sinon, un joueur qui n'a qu'une
  // collection reçoit un premier deck composé dans ses couleurs
  // (`rpgDeckDeDepart.js`). Une pierre tombale n'est jamais contredite.
  // Un seul écrit : le casier réparé *et* complété (l'ordre inverse écraserait
  // le deck de départ par la version d'avant réparation).
  // Un nouveau joueur va choisir son coffret à l'accueil. Ne lui inventons pas
  // auparavant un deck fondé sur l'ancienne dotation : il deviendrait invalide
  // dès que les cartes du coffret remplacent celle-ci.
  const dejaActif = joueurSablierDejaActif({
    progression: chargerProgressionHistoire(),
    acquis,
    collection: chargerCollectionDistante(),
    bourse: chargerPortefeuille(),
    profil: chargerProfil(),
    // L'ancien deck automatique seul peut avoir été créé avant le premier
    // choix ; un deck personnel, lui, témoigne d'un joueur déjà installé.
    aDeckPersonnel: lu.casier.decks.some((deck) => deck.id !== RPG_DECK_DEPART_ID),
  });
  const rattrapage = !attenteCompte && (dejaActif || coffretChoisiDeLAppareil())
    ? garantirDeckDeDepart({ casier: lu.casier, collection })
    : { casier: lu.casier, cree: null };
  if (rattrapage.cree || lu.modifie) sauverCasierMaison(rattrapage.casier);
  return {
    ...rattrapage.casier,
    collection,
    exemplaires,
    reparation: lu.modifie ? { retires: lu.retires, ajoutes: lu.ajoutes } : null,
  };
}

/** Statuts de synchronisation : `'local'`, `'attente'`, `'synchronise'`, `'horsligne'`. */
export function useDecksSablier() {
  const auth = useContext(AuthContext);
  const compteId = auth && !auth.isDemo ? (auth.user?.id ?? null) : null;
  const attenteCompte = Boolean(auth?.loading || compteId);
  // Le gel des acquis est calculé UNE fois, au montage : au premier lancement
  // de cette version, il reprend les cartes que l'ancienne règle avait données
  // pour les étages déjà vaincus (`figerAcquisitions`). Ensuite, `gel: true` le
  // rend définitif — les victoires suivantes révèlent sans donner.
  const [acquis, setAcquis] = useState(() => figerAcquisitions());
  const acquisRef = useRef(acquis);
  // Un seul instantané au montage : `etatDeDepart` écrit dans le casier quand il
  // range des decks, il ne doit donc pas être calculé deux fois.
  const [depart] = useState(() => etatDeDepart(acquis, { attenteCompte, reparer: !attenteCompte }));
  const [decksMaison, setDecksMaison] = useState(depart.decks);
  const [collection, setCollection] = useState(depart.collection);
  // Le stock payé à l'étal : les decks le respectent, l'atelier le consulte.
  const [exemplaires, setExemplaires] = useState(depart.exemplaires);
  const [reparation, setReparation] = useState(depart.reparation);
  const [statutSync, setStatutSync] = useStatutSyncSablier(compteId);
  const supprimesRef = useRef(chargerSupprimesMaison());
  // Changement de joueur — session restaurée, connexion, déconnexion, autre
  // compte sur la même machine : l'état en mémoire appartenait au précédent.
  // On relit la copie du joueur courant (clé `:user:<id>`, voir
  // `lib/progressionScope.js`) AVANT la première écriture.
  useEffect(() => {
    const suivis = figerAcquisitions();
    acquisRef.current = suivis;
    const depart = etatDeDepart(suivis, { attenteCompte, reparer: !attenteCompte });
    supprimesRef.current = depart.supprimes;
    setAcquis(suivis);
    setDecksMaison(depart.decks);
    setCollection(depart.collection);
    setExemplaires(depart.exemplaires);
    setReparation(depart.reparation);
  }, [compteId, attenteCompte]);
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
        // Hors ligne ou sans copie distante : garder les decks locaux intacts.
        // Un stock absent ne prouve pas qu'une carte a été perdue ; on peut
        // néanmoins compléter un casier vide à partir des données locales.
        const depart = etatDeDepart(acquisRef.current, { reparer: false });
        supprimesRef.current = depart.supprimes;
        setDecksMaison(depart.decks);
        setCollection(depart.collection);
        setExemplaires(depart.exemplaires);
        setReparation(depart.reparation);
        if (source === 'unavailable') {
          setStatutSync('horsligne');
          return;
        }
        // Compte sans copie serveur (première connexion sur cet appareil) : la
        // copie locale du joueur devient sa ligne Supabase, une seule fois.
        // L'écran n'annonce « synchronisé » que si l'écriture a eu lieu.
        const enregistre = await sauverEtatSablier(compteId, etatLocalActuel(acquisRef.current));
        if (!vivant) return;
        setStatutSync(enregistre ? 'synchronise' : 'horsligne');
        return;
      }
      const fusion = fusionnerEtatsSablier({ local: etatLocalActuel(acquisRef.current), distant: state });
      const etatFusionne = fusion.etat;
      // Le casier est rangé APRÈS la fusion : c'est le stock fusionné qui décide
      // des copies alignables. Ranger avant jetterait des copies qu'un achat
      // fait sur l'autre appareil vient juste de payer.
      const acquisFusionnes = etatFusionne.acquis ?? acquisRef.current;
      const collectionFusionnee = collectionJoueur({
        acquis: acquisFusionnes,
        distante: etatFusionne.collection,
        souk: etatFusionne.bourse?.cartes ?? [],
      });
      const exemplairesFusionnes = exemplairesDuPortefeuille(etatFusionne.bourse);
      const casier = reparerCasierHorsStock(fusion.casier, collectionFusionnee, exemplairesFusionnes);
      // Un ancien compte récupéré sur un appareil neuf peut n'avoir aucun deck
      // local : le rattrapage se fait maintenant, avec sa vraie collection, et
      // non avant le téléchargement sur la dotation du nouveau joueur.
      const dejaActif = joueurSablierDejaActif({
        progression: etatFusionne.histoire,
        acquis: acquisFusionnes,
        collection: etatFusionne.collection,
        bourse: etatFusionne.bourse,
        profil: etatFusionne.profil,
        aDeckPersonnel: casier.casier.decks.some((deck) => deck.id !== RPG_DECK_DEPART_ID),
      });
      const rattrapage = dejaActif || coffretChoisiDeLAppareil()
        ? garantirDeckDeDepart({ casier: casier.casier, collection: collectionFusionnee })
        : { casier: casier.casier, cree: null };
      sauverCasierMaison(rattrapage.casier);
      supprimesRef.current = rattrapage.casier.supprimes;
      setDecksMaison(rattrapage.casier.decks);
      if (casier.modifie) setReparation({ retires: casier.retires, ajoutes: casier.ajoutes });
      sauverCollectionDistante(fusion.etat.collection);
      // L'économie appartient à `useSablierBourse.js` : ce hook la transporte,
      // jamais ne la modifie — elle est rendue au stockage telle que la fusion
      // l'a recomposée, pour que l'autre hook la voie.
      sauverPortefeuille(fusion.etat.bourse);
      sauverEtatQuetes(fusion.etat.quetes);
      sauverProgressionHistoire(fusion.etat.histoire);
      // Le profil voyage comme l'économie : relu, fusionné, rendu au stockage —
      // jamais modifié ici, c'est `useSablierBourse.js` qui le fait monter.
      sauverProfil(fusion.etat.profil);
      // Les acquis du compte rejoignent ceux de l'appareil (union, gel
      // compris) : un autre appareil peut porter des cartes que celui-ci n'a
      // pas encore vues.
      acquisRef.current = acquisFusionnes;
      setAcquis(acquisFusionnes);
      setCollection(collectionFusionnee);
      setExemplaires(exemplairesFusionnes);
      // Attendre aussi la fin de l'écriture initiale : elle ne doit pas
      // écraser ensuite le coffret choisi pendant qu'elle était encore en vol.
      if (fusion.modifie || rattrapage.cree || casier.modifie) {
        const enregistre = await sauverEtatSablier(compteId, { ...fusion.etat, ...rattrapage.casier });
        if (!vivant) return;
        setStatutSync(enregistre ? 'synchronise' : 'horsligne');
      } else {
        setStatutSync('synchronise');
      }
    })();
    return () => {
      vivant = false;
    };
  }, [compteId, setStatutSync]);

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
    setExemplaires(exemplairesDeLAppareil());
  }, []);

  return {
    decksMaison, collection, exemplaires, reparation, statutSync,
    enregistrerDeckMaison, supprimerDeckMaison, noterVictoireEtage, rafraichirCollection,
  };
}
