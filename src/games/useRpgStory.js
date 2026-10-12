/** Un seul propriétaire de progression : mutations synchrones, sauvegarde atomique.
 *  Pas d'effet de stockage dans un updater React (StrictMode peut les rejouer).
 */
import { useCallback, useRef, useState } from 'react';
import {
  chargerProgressionHistoire,
  marquerEtageVaincu,
  normaliserProgressionHistoire,
  reinitialiserProgressionHistoire,
  sauverProgressionHistoire,
} from './rpgStory.js';
import { recitHistoireVide, transitionRecitHistoire } from './rpgStoryFlow.js';

export function useRpgStory() {
  const [progression, setProgression] = useState(chargerProgressionHistoire);
  const progressionRef = useRef(progression);
  const [sauvegardeOk, setSauvegardeOk] = useState(true);

  const modifier = useCallback((operation) => {
    const avant = progressionRef.current;
    const resultat = operation(avant);
    if (resultat === avant) return avant;
    const apres = normaliserProgressionHistoire(resultat);
    progressionRef.current = apres;
    setSauvegardeOk(sauverProgressionHistoire(apres));
    setProgression(apres);
    return apres;
  }, []);

  const ouvrirRecit = useCallback(() => modifier((etat) => etat.recit
    ? etat : { ...etat, recit: recitHistoireVide() }), [modifier]);

  const agirRecit = useCallback((evenement) => modifier((etat) => {
    const recit = transitionRecitHistoire(etat.recit, evenement, etat.etagesVaincus);
    return recit === etat.recit ? etat : { ...etat, recit };
  }), [modifier]);

  // Victoire et scène de sortie dans le MÊME objet sauvegardé : fermer la page
  // ne peut pas conserver l'un sans l'autre. Le caller valide la session du duel.
  const enregistrerVictoire = useCallback((etageId, curseurCampagne = null) => modifier((etat) => {
    const maj = marquerEtageVaincu(etat, etageId);
    if (!curseurCampagne) return maj;
    const recit = transitionRecitHistoire(maj.recit, {
      type: 'victoire', etageId, curseur: curseurCampagne,
    }, maj.etagesVaincus);
    return recit === maj.recit ? maj : { ...maj, recit };
  }), [modifier]);

  const recommencerRecit = useCallback(() => modifier((etat) => ({
    ...etat, recit: recitHistoireVide(),
  })), [modifier]);

  const effacerProgression = useCallback(() => modifier(() => reinitialiserProgressionHistoire()), [modifier]);

  return { progression, progressionRef, sauvegardeOk, ouvrirRecit, agirRecit, enregistrerVictoire, recommencerRecit, effacerProgression };
}
