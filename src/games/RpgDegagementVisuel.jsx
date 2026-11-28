import { useEffect, useRef, useState } from 'react';
import { dureeAnimation, rpgAnimationsReduites } from './rpgAnimations.js';

/** Le dégagement n'annonce pas une attaque légale : le gel ou d'autres
 * restrictions peuvent toujours s'appliquer. Seul le changement d'état de
 * la même créature fait naître cet éclat. */
export default function RpgDegagementVisuel({ entite }) {
  const id = entite?.id;
  const engagee = Boolean(entite?.attaquee);
  const precedent = useRef({ id, engagee });
  const [actif, setActif] = useState(false);
  useEffect(() => {
    const avant = precedent.current;
    precedent.current = { id, engagee };
    if (avant.id !== id || engagee) {
      setActif(false);
      return undefined;
    }
    if (!id || !avant.engagee || rpgAnimationsReduites()) return undefined;
    setActif(true);
    const timer = window.setTimeout(() => setActif(false), dureeAnimation(750));
    return () => window.clearTimeout(timer);
  }, [id, engagee]);

  return actif ? <span className="rpg-degagement" data-degagement="" aria-hidden="true"><i /><i /><i /></span> : null;
}
