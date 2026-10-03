import React, { useEffect, useRef } from 'react';
import { PAD_ACTIONS, attachStick, moveFromStick } from './soulsTouch';

/**
 * LA CENDRE — la manette à l'écran : stick à gauche, boutons à droite.
 *
 * Affichée seulement sur écran tactile (voir `useGameLandscape`) et seulement
 * en partie : les écrans d'intro, de pause et de mort ont leurs propres
 * boutons. Le glissement de caméra, lui, vit sur le canvas du monde
 * (`attachLookPad` dans SoulsWorld) : entre le stick et les boutons, le doigt
 * fait tourner la caméra, comme sur une manette le stick droit.
 *
 * Le composant ne connaît **pas** le moteur : il rend des gestes
 * (`onMove({ x, y, magnitude, run })`, `onAction('light' | …)`) que la page
 * transmet au monde via `actionsRef`.
 */

/** Stick au repos — le chevalier s'arrête. */
const IDLE = Object.freeze({ x: 0, y: 0, magnitude: 0, run: false });

export default function SoulsTouchControls({ onMove, onAction }) {
  const stickRef = useRef(null);
  const knobRef = useRef(null);
  const pointerFired = useRef(null);
  const moveRef = useRef(onMove);
  const actionRef = useRef(onAction);
  moveRef.current = onMove;
  actionRef.current = onAction;

  // Le stick suit le doigt et rend sa poussée au monde ; au démontage (pause,
  // mort), le chevalier s'arrête — sinon un doigt levé hors du stick le
  // laisserait courir tout seul.
  useEffect(() => {
    const stick = stickRef.current;
    const detach = attachStick(stick, {
      move: (vector) => moveRef.current?.(moveFromStick(vector)),
      end: () => moveRef.current?.(IDLE),
    }, { knob: knobRef.current });
    return () => {
      detach();
      moveRef.current?.(IDLE);
    };
  }, []);

  // Deux façons de presser un bouton, jamais les deux pour le même appui :
  // le doigt part sur `pointerdown` (aucun délai), et le clavier / les
  // technologies d'assistance passent par `click` (`detail === 0`).
  const press = (action, event) => {
    event.preventDefault();
    pointerFired.current = action;
    actionRef.current?.(action);
  };
  const release = () => { pointerFired.current = null; };
  const activate = (action, event) => {
    if (event.detail !== 0) return; // clic souris/tactile déjà traité au doigt
    if (pointerFired.current === action) {
      pointerFired.current = null;
      return;
    }
    actionRef.current?.(action);
  };

  return (
    <div
      className="souls-touch"
      role="group"
      aria-label="Commandes tactiles de La Cendre"
      onContextMenu={(event) => event.preventDefault()}
    >
      <p className="souls-touch-tip" aria-hidden="true">
        STICK À GAUCHE · BOUTONS À DROITE · GLISSE L’ÉCRAN POUR REGARDER
      </p>

      <div
        className="souls-touch-stick"
        ref={stickRef}
        role="application"
        aria-label="Stick de déplacement — poussé à fond, le chevalier court"
      >
        <span className="souls-touch-stick-ring" aria-hidden="true" />
        <span className="souls-touch-stick-knob" ref={knobRef} aria-hidden="true" />
        <span className="souls-touch-stick-label" aria-hidden="true">DÉPLACER</span>
      </div>

      <div className="souls-touch-pad">
        {PAD_ACTIONS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`souls-touch-button souls-touch-button-${entry.id}${entry.big ? ' is-big' : ''}`}
            aria-label={entry.aria}
            data-action={entry.action}
            onPointerDown={(event) => press(entry.action, event)}
            onPointerUp={release}
            onPointerCancel={release}
            onPointerLeave={release}
            onClick={(event) => activate(entry.action, event)}
          >
            <i aria-hidden="true">{entry.glyph}</i>
            <span>{entry.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
