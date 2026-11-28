import { useLayoutEffect, useRef, useState } from 'react';
import { dureeAnimation, rpgAnimationsReduites } from './rpgAnimations.js';
import { instantaneTicsAfflictions, nouveauxTicsAfflictions } from './rpgTicsAfflictions.js';
import './rpg-tics-afflictions.css';

/** Les événements traversent le PvP et restent fiables si deux afflictions
 * frappent dans la même action, même après recomposition d'une pile tactile. */
export function useTicsAfflictions(duel, session) {
  const precedent = useRef(null);
  const sequence = useRef(0);
  const timers = useRef(new Set());
  const [effets, setEffets] = useState({});
  useLayoutEffect(() => () => { timers.current.forEach(clearTimeout); timers.current.clear(); }, []);
  useLayoutEffect(() => {
    const instantane = instantaneTicsAfflictions(duel);
    const ancien = precedent.current;
    precedent.current = { session, instantane };
    if (!ancien || ancien.session !== session) {
      timers.current.forEach(clearTimeout); timers.current.clear();
      setEffets((courants) => Object.keys(courants).length ? {} : courants);
      return;
    }
    const disparus = [...ancien.instantane.presents].filter((cle) => !instantane.presents.has(cle));
    if (disparus.length) setEffets((courants) => {
      if (!disparus.some((cle) => cle in courants)) return courants;
      const suivants = { ...courants };
      for (const cle of disparus) delete suivants[cle];
      return suivants;
    });
    if (rpgAnimationsReduites()) return;
    const nouveaux = nouveauxTicsAfflictions(duel, ancien.instantane, instantane).map((event) => ({
      cle: `${event.cote}:${event.entiteId}`, type: event.affliction, token: ++sequence.current,
    }));
    if (!nouveaux.length) return;
    setEffets((courants) => {
      const suivants = { ...courants };
      for (const { cle, type, token } of nouveaux) suivants[cle] = { ...suivants[cle], [type]: token };
      return suivants;
    });
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setEffets((courants) => {
        const suivants = { ...courants };
        for (const { cle, type, token } of nouveaux) {
          if (suivants[cle]?.[type] !== token) continue;
          const reste = { ...suivants[cle] };
          delete reste[type];
          if (Object.keys(reste).length) suivants[cle] = reste;
          else delete suivants[cle];
        }
        return suivants;
      });
    }, dureeAnimation(1150));
    timers.current.add(timer);
  });
  return effets;
}

export function RpgTicsAfflictions({ effets }) {
  return ['poison', 'brulure'].filter((type) => effets?.[type]).map((type) => (
    <span key={`${type}-${effets[type]}`} className={`rpg-tic-affliction rpg-tic-affliction--${type}`} data-tic-affliction={type} aria-hidden="true">
      <i /><i /><i />
    </span>
  ));
}
