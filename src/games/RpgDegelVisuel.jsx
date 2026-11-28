import { useEffect, useRef, useState } from 'react';
import { dureeAnimation, rpgAnimationsReduites } from './rpgAnimations.js';

/** Un dégel n'est visible que si cette même créature était réellement gelée.
 * Aucun minuteur ni état de présentation ne modifie l'état du moteur. */
export default function RpgDegelVisuel({ entite }) {
  const id = entite?.id;
  const gelee = (entite?.gelToursRestants ?? 0) > 0;
  const precedent = useRef({ id, gelee });
  const [actif, setActif] = useState(false);

  useEffect(() => {
    const avant = precedent.current;
    precedent.current = { id, gelee };
    if (avant.id !== id || gelee) {
      setActif(false);
      return undefined;
    }
    if (!id || !avant.gelee || rpgAnimationsReduites()) return undefined;
    setActif(true);
    const timer = window.setTimeout(() => setActif(false), dureeAnimation(850));
    return () => window.clearTimeout(timer);
  }, [id, gelee]);

  return actif ? <span className="rpg-degel" data-degel="" aria-hidden="true"><i /><i /><i /><i /></span> : null;
}
