import { useLayoutEffect, useRef, useState } from 'react';
import './rpg-tutorial.css';

const VIEWPORT_MARGIN = 14;
const SPOTLIGHT_GUTTER = 8;
const POPUP_GAP = 16;

function almostSameRect(left, right) {
  if (!left || !right) return left === right;
  return ['left', 'top', 'width', 'height'].every((key) => Math.abs(left[key] - right[key]) < 1);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, Math.max(min, max)));
}

function overlapArea(leftRect, rightRect) {
  const xOverlap = Math.max(
    0,
    Math.min(leftRect.left + leftRect.width, rightRect.left + rightRect.width) - Math.max(leftRect.left, rightRect.left),
  );
  const yOverlap = Math.max(
    0,
    Math.min(leftRect.top + leftRect.height, rightRect.top + rightRect.height) - Math.max(leftRect.top, rightRect.top),
  );
  return xOverlap * yOverlap;
}

/** Voile plein écran avec une fenêtre lumineuse autour de la cible de l'étape. */
export default function RpgTutorialOverlay({
  step, stepIndex, totalSteps, onNext, onFinish, onClose,
  tutorialName = 'LE SABLIER · TUTORIEL', reward = 0, rewardClaimed = false,
}) {
  const panelRef = useRef(null);
  const [spotlight, setSpotlight] = useState(null);
  const [position, setPosition] = useState(null);

  useLayoutEffect(() => {
    let observedTarget = null;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => update());
    const resolveTarget = () => {
      if (!step.target) return null;
      const found = document.querySelector(step.target);
      if (!found) return null;
      // L'aperçu d'annonce occupe tout l'écran par son voile (.rpg-annonce-sort) :
      // la fenêtre lumineuse encadre son contenu centré (la carte, sa fiche et
      // ses commandes « Répondre » / « Laisser passer ») plutôt que le voile.
      return found.querySelector?.('.rpg-hover-card-preview__layout') ?? found;
    };
    const update = () => {
      const width = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1024);
      const height = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 768);
      const target = resolveTarget();
      if (observer && target !== observedTarget) {
        if (observedTarget) observer.unobserve(observedTarget);
        observedTarget = target;
        if (observedTarget) observer.observe(observedTarget);
      }
      if (!target?.getBoundingClientRect) {
        setSpotlight((current) => current === null ? current : null);
        return null;
      }
      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height || rect.bottom <= 0 || rect.right <= 0 || rect.top >= height || rect.left >= width) {
        setSpotlight((current) => current === null ? current : null);
        return target;
      }
      const left = Math.max(0, rect.left - SPOTLIGHT_GUTTER);
      const top = Math.max(0, rect.top - SPOTLIGHT_GUTTER);
      const right = Math.min(width, rect.right + SPOTLIGHT_GUTTER);
      const bottom = Math.min(height, rect.bottom + SPOTLIGHT_GUTTER);
      const measured = { left, top, width: right - left, height: bottom - top };
      setSpotlight((current) => almostSameRect(current, measured) ? current : measured);
      return target;
    };

    const initialTarget = update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.addEventListener('scroll', update, true);
    // Certaines cibles n'existent qu'après une animation (la carte jouée qui
    // atterrit, l'aperçu d'annonce qui s'ouvre) : on guette leur apparition
    // plutôt que de laisser un voile plein écran jusqu'au clic suivant.
    const mutations = typeof MutationObserver === 'undefined' ? null : new MutationObserver(update);
    mutations?.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-card-id', 'data-entity-id', 'data-tutorial-target'],
    });
    let frame = 0;
    let essais = 0;
    const retenter = () => {
      const found = update();
      essais += 1;
      if (!found && essais < 60) frame = window.requestAnimationFrame(retenter);
    };
    if (!initialTarget) frame = window.requestAnimationFrame(retenter);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('scroll', update, true);
      observer?.disconnect();
      mutations?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [step.id, step.target]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const width = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1024);
    const height = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 768);
    const panelWidth = panel.offsetWidth || Math.min(390, width - VIEWPORT_MARGIN * 2);
    const panelHeight = panel.offsetHeight || 220;
    if (!spotlight) {
      const centered = {
        left: (width - panelWidth) / 2,
        top: (height - panelHeight) / 2,
      };
      setPosition((current) => current && Math.abs(current.left - centered.left) < 1 && Math.abs(current.top - centered.top) < 1
        ? current : centered);
      return;
    }

    const sideOrder = step.side === 'bottom'
      ? ['bottom', 'top', 'right', 'left']
      : step.side === 'right'
        ? ['right', 'left', 'top', 'bottom']
        : step.side === 'left'
          ? ['left', 'right', 'top', 'bottom']
          : ['top', 'bottom', 'right', 'left'];
    const positions = {
      top: {
        left: spotlight.left + spotlight.width / 2 - panelWidth / 2,
        top: spotlight.top - panelHeight - POPUP_GAP,
        fits: spotlight.top - VIEWPORT_MARGIN >= panelHeight + POPUP_GAP,
      },
      bottom: {
        left: spotlight.left + spotlight.width / 2 - panelWidth / 2,
        top: spotlight.top + spotlight.height + POPUP_GAP,
        fits: height - spotlight.top - spotlight.height - VIEWPORT_MARGIN >= panelHeight + POPUP_GAP,
      },
      right: {
        left: spotlight.left + spotlight.width + POPUP_GAP,
        top: spotlight.top + spotlight.height / 2 - panelHeight / 2,
        fits: width - spotlight.left - spotlight.width - VIEWPORT_MARGIN >= panelWidth + POPUP_GAP,
      },
      left: {
        left: spotlight.left - panelWidth - POPUP_GAP,
        top: spotlight.top + spotlight.height / 2 - panelHeight / 2,
        fits: spotlight.left - VIEWPORT_MARGIN >= panelWidth + POPUP_GAP,
      },
    };
    const clampPanel = (candidate) => ({
      left: clamp(candidate.left, VIEWPORT_MARGIN, width - panelWidth - VIEWPORT_MARGIN),
      top: clamp(candidate.top, VIEWPORT_MARGIN, height - panelHeight - VIEWPORT_MARGIN),
    });
    const side = sideOrder.find((candidate) => positions[candidate].fits);
    const chosen = side
      ? positions[side]
      : [
        ...sideOrder.map((candidate) => clampPanel(positions[candidate])),
        clampPanel({ left: VIEWPORT_MARGIN, top: VIEWPORT_MARGIN }),
        clampPanel({ left: VIEWPORT_MARGIN, top: height - panelHeight - VIEWPORT_MARGIN }),
        clampPanel({ left: width - panelWidth - VIEWPORT_MARGIN, top: VIEWPORT_MARGIN }),
        clampPanel({ left: width - panelWidth - VIEWPORT_MARGIN, top: height - panelHeight - VIEWPORT_MARGIN }),
      ].reduce((best, candidate) => {
        const candidateOverlap = overlapArea({ ...candidate, width: panelWidth, height: panelHeight }, spotlight);
        const bestOverlap = overlapArea({ ...best, width: panelWidth, height: panelHeight }, spotlight);
        return candidateOverlap < bestOverlap ? candidate : best;
      });
    const next = clampPanel(chosen);
    setPosition((current) => current && Math.abs(current.left - next.left) < 1 && Math.abs(current.top - next.top) < 1
      ? current : next);
  }, [spotlight, step.id, step.side]);

  const popupStyle = position
    ? { left: `${position.left}px`, top: `${position.top}px`, transform: 'none' }
    : undefined;
  const fullScreenShade = !spotlight;
  const interactiveTarget = step.kind === 'action';

  return (
    <div className="rpg-tutorial" data-tutorial-step={step.id}>
      {fullScreenShade ? (
        <div className="rpg-tutorial__shade rpg-tutorial__shade--full" aria-hidden="true" />
      ) : (
        <>
          <div className="rpg-tutorial__shade" aria-hidden="true" style={{ inset: `0 0 calc(100% - ${spotlight.top}px) 0` }} />
          <div className="rpg-tutorial__shade" aria-hidden="true" style={{ inset: `${spotlight.top + spotlight.height}px 0 0 0` }} />
          <div className="rpg-tutorial__shade" aria-hidden="true" style={{ inset: `${spotlight.top}px calc(100% - ${spotlight.left}px) calc(100% - ${spotlight.top + spotlight.height}px) 0` }} />
          <div className="rpg-tutorial__shade" aria-hidden="true" style={{ inset: `${spotlight.top}px 0 calc(100% - ${spotlight.top + spotlight.height}px) ${spotlight.left + spotlight.width}px` }} />
          {!interactiveTarget && (
            <div
              className="rpg-tutorial__target-guard"
              aria-hidden="true"
              style={{ left: `${spotlight.left}px`, top: `${spotlight.top}px`, width: `${spotlight.width}px`, height: `${spotlight.height}px` }}
            />
          )}
          <div
            className="rpg-tutorial__spotlight"
            aria-hidden="true"
            style={{ left: `${spotlight.left}px`, top: `${spotlight.top}px`, width: `${spotlight.width}px`, height: `${spotlight.height}px` }}
          />
        </>
      )}

      <section
        ref={panelRef}
        className={`rpg-tutorial__panel rpg-tutorial__panel--${step.kind}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rpg-tutorial-title"
        aria-describedby="rpg-tutorial-description"
        style={popupStyle}
      >
        <header className="rpg-tutorial__header">
          <div className="rpg-tutorial__step-label">
            <span>{tutorialName}</span>
            <span className="rpg-tutorial__counter">{stepIndex + 1} / {totalSteps}</span>
          </div>
          <button type="button" className="rpg-tutorial__close" onClick={onClose} aria-label="Fermer le tutoriel">
            ×
          </button>
        </header>
        <div className="rpg-tutorial__progress" aria-hidden="true">
          <span style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }} />
        </div>
        <p className="rpg-tutorial__eyebrow">{step.eyebrow}</p>
        <h2 id="rpg-tutorial-title">{step.title}</h2>
        <p id="rpg-tutorial-description" className="rpg-tutorial__copy">{step.text}</p>
        {step.kind === 'complete' && reward > 0 && (
          <p className={`rpg-tutorial__reward${rewardClaimed ? ' is-claimed' : ''}`} role="status">
            <span aria-hidden="true">◈</span>
            {rewardClaimed ? `Récompense déjà remportée (${reward} crédits)` : `Récompense de la leçon : +${reward} crédits`}
          </p>
        )}
        <footer className="rpg-tutorial__footer">
          {step.kind === 'action' && (
            <p className="rpg-tutorial__instruction"><span aria-hidden="true">⌖</span> Touchez la zone encadrée pour continuer.</p>
          )}
          {step.kind === 'waiting' && (
            <p className="rpg-tutorial__instruction rpg-tutorial__instruction--waiting" role="status">
              <span aria-hidden="true" /> Le tour adverse est en cours…
            </p>
          )}
          {step.kind === 'info' && (
            <button type="button" className="rpg-tutorial__next" onClick={onNext} autoFocus>
              {step.nextLabel ?? 'Continuer'} <span aria-hidden="true">→</span>
            </button>
          )}
          {step.kind === 'complete' && (
            <button type="button" className="rpg-tutorial__next" onClick={onFinish} autoFocus>
              {step.nextLabel ?? 'Continuer'} <span aria-hidden="true">→</span>
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
