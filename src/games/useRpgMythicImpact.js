import { useLayoutEffect, useRef } from 'react';
import { mythicArrivals, playMythicImpact } from './rpgMythicImpact.js';
import './rpg-mythic-impact.css';

export default function useRpgMythicImpact(duel, screen, tableRef, cardById, playSound) {
  const snapshot = useRef(null);
  const active = useRef(new Map());
  useLayoutEffect(() => {
    snapshot.current = null;
    return () => {
      active.current.forEach((cancel) => cancel());
      active.current.clear();
      snapshot.current = null;
    };
  }, [duel, screen]);
  useLayoutEffect(() => {
    if (!duel || screen !== 'partie') return;
    const current = [...duel.joueur.creatures, ...duel.sorcier.creatures];
    const previous = snapshot.current;
    snapshot.current = current.map(({ id, carteId }) => ({ id, carteId }));
    const table = tableRef.current;
    if (!previous || !table) return;
    for (const [id, cancel] of active.current) {
      if (!current.some((entity) => entity.id === id)) { cancel(); active.current.delete(id); }
    }
    if (document.hidden) return;
    const reduced = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    for (const entity of mythicArrivals(previous, current, cardById)) {
      const cards = [...table.querySelectorAll('.card-row [data-entity-id]')];
      const card = cards.find((node) => node.dataset.entityId === String(entity.id))
        ?? cards.find((node) => node.dataset.cardId === entity.carteId);
      if (card) active.current.set(entity.id, playMythicImpact(table, card, playSound, reduced));
    }
  });
}
