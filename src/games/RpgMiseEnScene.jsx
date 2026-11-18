import { useEffect, useRef, useState } from 'react';
import { dureeAnimation } from './rpgAnimations.js';
import { rpgSegmentCible } from './rpgTempsForts.js';
import './rpg-mise-en-scene.css';

export function rpgEstLegendaire(carte) {
  return carte?.kind === 'hero';
}

export function RpgEntreeLegendaire() {
  return <span className="rpg-entree-legendaire" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>;
}

/** Annonce éphémère, sans modifier le journal ni recréer les faits anciens. */
export function RpgTempsForts({ evenements }) {
  const signature = JSON.stringify(evenements);
  const vus = useRef(new Set(evenements.map((event) => event.id)));
  const [visibles, setVisibles] = useState([]);
  const timerRef = useRef(null);
  useEffect(() => () => window.clearTimeout(timerRef.current), []);
  useEffect(() => {
    const actualites = JSON.parse(signature);
    const nouveaux = actualites.filter((event) => !vus.current.has(event.id));
    vus.current = new Set(actualites.map((event) => event.id));
    if (!nouveaux.length) return undefined;
    setVisibles(nouveaux.slice(-3));
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setVisibles([]), dureeAnimation(2400));
    return undefined;
  }, [signature]);
  if (!visibles.length) return null;
  return <div className="rpg-temps-forts" role="status" aria-live="polite">{visibles.map((event) => <span key={event.id} className={`rpg-temps-forts__fait is-${event.type}`}><b aria-hidden="true">{event.type === 'critique' ? '✦' : event.type === 'mort' ? '☠' : '⚑'}</b>{event.texte}</span>)}</div>;
}

/** Guide purement visuel : seuls les éléments déjà déclarés ciblables sont reliés. */
export function RpgGuideCibles({ surfaceRef, actif, sourceId = null, moba = false, attaque = false }) {
  const [layout, setLayout] = useState(null);
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!actif || !surface) { setLayout((old) => old === null ? old : null); return undefined; }
    const update = () => {
      const table = surface.getBoundingClientRect();
      const entites = [...surface.querySelectorAll(moba ? '[data-moba-entity]' : '[data-entity-id]')];
      const source = sourceId ? entites.find((el) => (moba ? el.dataset.mobaEntity : el.dataset.entityId) === String(sourceId))
        : surface.querySelector(moba ? '.moba__card.is-selected' : '.rpg-hand__card.is-targeting:not(.is-pose-en-cours)');
      if (!source || !table.width || !table.height) { setLayout((old) => old === null ? old : null); return; }
      const selector = moba ? `[data-rpg-guide-cible="true"], button.${attaque ? 'moba__attack-direct' : 'moba__lane-target'}:not(:disabled)` : '.card-row .rpg-card.is-ciblable, .rpg-wizard-plate.is-ciblable';
      const targets = [...surface.querySelectorAll(selector)].filter((el) => el !== source && !el.contains(source) && !source.contains(el) && !el.disabled);
      const segments = targets.map((target) => rpgSegmentCible(table, source.getBoundingClientRect(), target.getBoundingClientRect())).filter(Boolean);
      const suivant = segments.length ? { width: table.width, height: table.height, segments } : null;
      setLayout((old) => JSON.stringify(old) === JSON.stringify(suivant) ? old : suivant);
    };
    update();
    const observer = window.ResizeObserver ? new window.ResizeObserver(update) : null;
    observer?.observe(surface);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const frame = window.requestAnimationFrame?.(update);
    return () => { observer?.disconnect(); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); if (frame !== undefined) window.cancelAnimationFrame?.(frame); };
  });
  if (!actif || !layout) return null;
  return <svg className="rpg-guide-cibles" viewBox={`0 0 ${layout.width} ${layout.height}`} preserveAspectRatio="none" aria-hidden="true">{layout.segments.map((segment, i) => <line key={i} {...segment} />)}</svg>;
}

export function RpgVerdictScene({ vainqueur }) {
  if (!vainqueur) return null;
  const resultat = vainqueur === 'joueur' ? 'victoire' : vainqueur === 'sorcier' ? 'defaite' : 'nul';
  return <span className={`rpg-verdict-scene is-${resultat}`} aria-hidden="true"><i /><i /><i /></span>;
}
