import { useLayoutEffect, useRef, useState } from 'react';
import { dureeAnimation, rpgAnimationsReduites } from './rpgAnimations.js';
import { releverEnvol, transitionsEnvol } from './rpgEnvolTransitions.js';
import './rpg-envol-transition.css';

/** Suivi au niveau de la table : la carte peut changer de pile ou de case
 * au même moment. La session PvP est stable même quand l'état est cloné. */
export function useEnvolTransitions(duel, session) {
  const precedent = useRef(null);
  const sequence = useRef(0);
  const timers = useRef(new Set());
  const [effets, setEffets] = useState({});
  useLayoutEffect(() => () => { timers.current.forEach(clearTimeout); timers.current.clear(); }, []);
  useLayoutEffect(() => {
    const vue = releverEnvol(duel);
    const ancien = precedent.current;
    precedent.current = { session, vue };
    if (!ancien || ancien.session !== session) {
      timers.current.forEach(clearTimeout); timers.current.clear();
      setEffets((courants) => Object.keys(courants).length ? {} : courants);
      return;
    }
    const disparus = [...ancien.vue.keys()].filter((cle) => !vue.has(cle));
    if (disparus.length) setEffets((courants) => {
      if (!disparus.some((cle) => cle in courants)) return courants;
      const suivants = { ...courants };
      for (const cle of disparus) delete suivants[cle];
      return suivants;
    });
    if (rpgAnimationsReduites()) return;
    const changements = transitionsEnvol(ancien.vue, vue).map(({ cle, type }) => [cle, { type, token: ++sequence.current }]);
    if (!changements.length) return;
    setEffets((courants) => ({ ...courants, ...Object.fromEntries(changements) }));
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setEffets((courants) => {
        const suivants = { ...courants };
        for (const [cle, effet] of changements) if (suivants[cle]?.token === effet.token) delete suivants[cle];
        return suivants;
      });
    }, dureeAnimation(1200));
    timers.current.add(timer);
  });
  return effets;
}

/** Calque décoratif séparé du mouvement de la carte et de ses repères. */
export function RpgEnvolTransition({ effet }) {
  if (!effet) return null;
  return <span key={effet.token} className={`rpg-envol-transition rpg-envol-transition--${effet.type}`} data-envol-transition={effet.type} aria-hidden="true">
    <i /><i /><i /><i />
  </span>;
}
