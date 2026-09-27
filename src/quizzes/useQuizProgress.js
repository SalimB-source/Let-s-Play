/**
 * Hook de progression des niveaux de quizz.
 * -----------------------------------------
 * Relie la règle pure de `./quizProgress` (Facile ouvert, Confirmé puis
 * Expert débloqués en cascade) aux composants React :
 *
 *   - `progress` : les niveaux terminés, copie locale fusionnée avec celle du
 *     compte connecté (la progression suit le compte, la copie locale sert de
 *     référence hors-ligne et pour les visiteurs) ;
 *   - `record(quizId, level)` : à appeler à la FIN d'une partie — note le
 *     niveau terminé localement, et le dépose sur le compte s'il y en a un.
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  fetchAccountProgress,
  markLevelCompleted,
  mergeProgress,
  pushLevelCompleted,
  readLocalProgress,
  saveLocalProgress,
} from './quizProgress';

export function useQuizProgress() {
  const { user, isDemo } = useAuth();
  const userId = user && !isDemo ? user.id : null;
  const [progress, setProgress] = useState(() => readLocalProgress());

  useEffect(() => {
    if (!userId) {
      setProgress(readLocalProgress());
      return undefined;
    }
    let cancelled = false;
    fetchAccountProgress(userId).then((remote) => {
      if (cancelled || !remote) return;
      const merged = mergeProgress(readLocalProgress(), remote);
      saveLocalProgress(merged);
      setProgress(merged);
    });
    return () => { cancelled = true; };
  }, [userId]);

  const record = useCallback((quizId, level) => {
    const next = markLevelCompleted(quizId, level);
    setProgress(next);
    if (userId) pushLevelCompleted(userId, quizId, level);
    return next;
  }, [userId]);

  return { progress, record };
}
