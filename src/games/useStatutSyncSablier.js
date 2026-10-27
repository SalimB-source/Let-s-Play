import { useCallback, useState } from 'react';

/**
 * Un statut appartient au compte qui l'a produit. Au premier rendu d'un autre
 * compte, on annonce immédiatement l'attente, sans réutiliser le « synchronisé »
 * de l'ancien joueur en attendant que les effets React se déclenchent.
 */
export function useStatutSyncSablier(compteId) {
  const [etat, setEtat] = useState(() => ({
    compteId,
    statut: compteId ? 'attente' : 'local',
  }));
  const setStatut = useCallback((statut) => {
    setEtat({ compteId, statut });
  }, [compteId]);
  const statut = etat.compteId === compteId
    ? etat.statut
    : (compteId ? 'attente' : 'local');
  return [statut, setStatut];
}

/** Invité et démo travaillent en local ; un compte attend ses synchronisations. */
export function accueilSablierPret(auth, ...statuts) {
  if (auth?.loading) return false;
  if (!auth?.user?.id || auth.isDemo) return true;
  return statuts.length > 0 && statuts.every((statut) => statut === 'synchronise' || statut === 'horsligne');
}
