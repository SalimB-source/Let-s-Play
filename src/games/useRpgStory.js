/** Un seul propriétaire de progression : mutations synchrones, sauvegarde atomique.
 *  Pas d'effet de stockage dans un updater React (StrictMode peut les rejouer).
 */
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from '../auth/AuthContext';
import { chargerAcquis, chargerCollectionDistante } from './rpgCollection.js';
import { chargerPortefeuille } from './rpgCredits.js';
import { chargerDecksMaison, chargerSupprimesMaison, fusionnerEtatsSablier } from './rpgDeckBuilder.js';
import { chargerEtatQuetes } from './rpgQuetes.js';
import { chargerEtatSablier, sauverEtatSablier } from './rpgSablierRemote.js';
import {
  RPG_STORY_LEGACY_STORAGE_KEY,
  RPG_STORY_STORAGE_KEY,
  abonnerProgressionHistoire,
  chargerProgressionHistoire,
  marquerEtageVaincu,
  normaliserProgressionHistoire,
  reinitialiserProgressionHistoire,
  sauverProgressionHistoire,
} from './rpgStory.js';
import {
  acteCourantRecit,
  recitHistoireVide,
  transitionRecitHistoire,
} from './rpgStoryFlow.js';
import { acteSuivantHistoire } from './rpgStoryScenes.js';

function compteSablierActif() {
  try {
    const auth = useContext(AuthContext);
    if (!auth || auth.isDemo) return null;
    return auth.user?.id ?? null;
  } catch {
    return null;
  }
}

function etatLocalComplet(histoire) {
  return {
    decks: chargerDecksMaison(),
    supprimes: chargerSupprimesMaison(),
    collection: chargerCollectionDistante(),
    acquis: chargerAcquis(),
    bourse: chargerPortefeuille(),
    quetes: chargerEtatQuetes(),
    histoire,
  };
}

export function useRpgStory() {
  const compteId = compteSablierActif();
  const [progression, setProgression] = useState(chargerProgressionHistoire);
  const progressionRef = useRef(progression);
  const [sauvegardeOk, setSauvegardeOk] = useState(true);

  // Changement de joueur : la progression en mémoire appartenait au précédent.
  // Chaque joueur a sa clé (`:user:<id>`), donc la relecture suffit à repartir
  // sur SA campagne — et l'écriture suivante ne peut plus viser un autre compte.
  useEffect(() => {
    const locale = chargerProgressionHistoire();
    progressionRef.current = locale;
    setProgression(locale);
  }, [compteId]);

  useEffect(() => {
    const synchroniser = (prochaine) => {
      const normalisee = normaliserProgressionHistoire(prochaine ?? chargerProgressionHistoire());
      if (JSON.stringify(normalisee) === JSON.stringify(progressionRef.current)) return;
      progressionRef.current = normalisee;
      setProgression(normalisee);
    };
    const desabonner = abonnerProgressionHistoire(synchroniser);
    const surStorage = (event) => {
      if (!event || !event.key || event.key === RPG_STORY_STORAGE_KEY || event.key === RPG_STORY_LEGACY_STORAGE_KEY) {
        synchroniser(chargerProgressionHistoire());
      }
    };
    globalThis.window?.addEventListener?.('storage', surStorage);
    return () => {
      desabonner();
      globalThis.window?.removeEventListener?.('storage', surStorage);
    };
  }, []);

  useEffect(() => {
    if (!compteId) return undefined;
    let vivant = true;
    (async () => {
      const { state, source } = await chargerEtatSablier(compteId);
      if (!vivant || source === 'unavailable') return;
      const fusion = fusionnerEtatsSablier({ local: etatLocalComplet(progressionRef.current), distant: state });
      if (JSON.stringify(fusion.etat.histoire) !== JSON.stringify(progressionRef.current)) {
        progressionRef.current = fusion.etat.histoire;
        sauverProgressionHistoire(fusion.etat.histoire);
        setProgression(fusion.etat.histoire);
      }
      const distantHistoire = normaliserProgressionHistoire(state?.histoire);
      if ((!state && fusion.modifie) || (state && JSON.stringify(fusion.etat.histoire) !== JSON.stringify(distantHistoire))) {
        sauverEtatSablier(compteId, fusion.etat);
      }
    })();
    return () => { vivant = false; };
  }, [compteId]);

  const pousserHistoire = useCallback((histoire) => {
    if (!compteId) return;
    const fusion = fusionnerEtatsSablier({ local: etatLocalComplet(histoire) });
    sauverEtatSablier(compteId, { ...fusion.etat, histoire });
  }, [compteId]);

  const modifier = useCallback((operation) => {
    const avant = progressionRef.current;
    const resultat = operation(avant);
    if (resultat === avant) return avant;
    const apres = normaliserProgressionHistoire(resultat);
    progressionRef.current = apres;
    setSauvegardeOk(sauverProgressionHistoire(apres));
    setProgression(apres);
    pousserHistoire(apres);
    return apres;
  }, [pousserHistoire]);

  const ouvrirRecit = useCallback(() => modifier((etat) => {
    if (!etat.recit) return { ...etat, recit: recitHistoireVide() };
    if (etat.recit.curseur?.type === 'fin') {
      const suivant = acteSuivantHistoire(acteCourantRecit(etat.recit));
      if (suivant) {
        const recit = transitionRecitHistoire(etat.recit, {
          type: 'ouvrir-acte', curseur: etat.recit.curseur, acteId: suivant.id,
        }, etat.etagesVaincus);
        return recit === etat.recit ? etat : { ...etat, recit };
      }
    }
    return etat;
  }), [modifier]);

  const agirRecit = useCallback((evenement) => modifier((etat) => {
    const recit = transitionRecitHistoire(etat.recit, evenement, etat.etagesVaincus);
    return recit === etat.recit ? etat : { ...etat, recit };
  }), [modifier]);

  // Victoire et scène de sortie dans le MÊME objet sauvegardé : fermer la page
  // ne peut pas conserver l'un sans l'autre. Le caller valide la session du duel.
  const enregistrerVictoire = useCallback((etageId, curseurCampagne = null) => modifier((etat) => {
    const maj = marquerEtageVaincu(etat, etageId);
    const curseurDuel = curseurCampagne
      ?? (maj.recit?.curseur?.type === 'duel' && maj.recit.curseur.etageId === etageId ? maj.recit.curseur : null);
    if (!curseurDuel) return maj;
    const recit = transitionRecitHistoire(maj.recit, {
      type: 'victoire', etageId, curseur: curseurDuel,
    }, maj.etagesVaincus);
    return recit === maj.recit ? maj : { ...maj, recit };
  }), [modifier]);

  const recommencerRecit = useCallback(() => modifier((etat) => ({
    ...etat, recit: recitHistoireVide(),
  })), [modifier]);

  const effacerProgression = useCallback(() => modifier(() => reinitialiserProgressionHistoire()), [modifier]);

  return { progression, progressionRef, sauvegardeOk, ouvrirRecit, agirRecit, enregistrerVictoire, recommencerRecit, effacerProgression };
}
