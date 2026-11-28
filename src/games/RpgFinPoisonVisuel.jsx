import { useEffect, useRef, useState } from 'react';
import { dureeAnimation, rpgAnimationsReduites } from './rpgAnimations.js';

/** Un souffle de dissolution seulement quand le poison de cet exemplaire
 * expire ; ni le compte à rebours ni un changement de carte ne le déclenche. */
export default function RpgFinPoisonVisuel({ entite }) {
  const id = entite?.id;
  const empoisonnee = (entite?.poison?.toursRestants ?? 0) > 0;
  const precedent = useRef({ id, empoisonnee });
  const [actif, setActif] = useState(false);
  useEffect(() => {
    const avant = precedent.current;
    precedent.current = { id, empoisonnee };
    if (avant.id !== id || empoisonnee) {
      setActif(false);
      return undefined;
    }
    if (!id || !avant.empoisonnee || rpgAnimationsReduites()) return undefined;
    setActif(true);
    const timer = window.setTimeout(() => setActif(false), dureeAnimation(980));
    return () => window.clearTimeout(timer);
  }, [id, empoisonnee]);

  return actif ? <span className="rpg-fin-poison" data-fin-poison="" aria-hidden="true"><i /><i /><i /></span> : null;
}
