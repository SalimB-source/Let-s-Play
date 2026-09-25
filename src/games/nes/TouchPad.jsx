import React, { useCallback, useRef } from 'react';
import { BUTTONS } from './nesEngine';

// Manette tactile : croix directionnelle « glissable » (on peut rouler le
// pouce d'une direction à l'autre, diagonales comprises), A / B et
// Select / Start. Multi-touch : chaque zone suit son propre doigt.

const DIRECTIONS = [BUTTONS.UP, BUTTONS.DOWN, BUTTONS.LEFT, BUTTONS.RIGHT];
const DEADZONE = 0.22;

function buzz() {
  try { navigator.vibrate?.(8); } catch { /* pas de vibreur */ }
}

function directionsFor(event, element) {
  const rect = element.getBoundingClientRect();
  const dx = (event.clientX - rect.left) / rect.width - 0.5;
  const dy = (event.clientY - rect.top) / rect.height - 0.5;
  const pressed = new Set();
  if (Math.hypot(dx, dy) < DEADZONE / 2) return pressed;
  const angle = Math.atan2(dy, dx); // 0 = droite, π/2 = bas
  const sector = Math.round(angle / (Math.PI / 4)); // -4..4, 8 secteurs
  if ([-1, 0, 1].includes(sector)) pressed.add(BUTTONS.RIGHT);
  if ([1, 2, 3].includes(sector)) pressed.add(BUTTONS.DOWN);
  if ([3, 4, -4, -3].includes(sector)) pressed.add(BUTTONS.LEFT);
  if ([-3, -2, -1].includes(sector)) pressed.add(BUTTONS.UP);
  return pressed;
}

export default function TouchPad({ engineRef, disabled }) {
  const dpadRef = useRef(null);
  const activeDirs = useRef(new Set());
  const [, force] = React.useReducer((n) => n + 1, 0);

  const setDirections = useCallback((next) => {
    const engine = engineRef.current;
    if (!engine) return;
    const current = activeDirs.current;
    for (const dir of DIRECTIONS) {
      if (current.has(dir) && !next.has(dir)) engine.release(1, dir, 'touch:dpad');
      if (!current.has(dir) && next.has(dir)) { engine.press(1, dir, 'touch:dpad'); buzz(); }
    }
    activeDirs.current = next;
    force();
  }, [engineRef]);

  const onDpadDown = (event) => {
    if (disabled) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDirections(directionsFor(event, dpadRef.current));
  };
  const onDpadMove = (event) => {
    if (disabled || !event.currentTarget.hasPointerCapture?.(event.pointerId)) return;
    setDirections(directionsFor(event, dpadRef.current));
  };
  const onDpadUp = () => setDirections(new Set());

  const bind = (button, label, className) => {
    const source = `touch:${label}`;
    const down = (event) => {
      if (disabled) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.currentTarget.classList.add('is-pressed');
      engineRef.current?.press(1, button, source);
      buzz();
    };
    const up = (event) => {
      event.currentTarget.classList.remove('is-pressed');
      engineRef.current?.release(1, button, source);
    };
    return (
      <button
        type="button"
        className={className}
        aria-label={label}
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={up}
        onLostPointerCapture={up}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span>{label}</span>
      </button>
    );
  };

  const dirs = activeDirs.current;
  return (
    <div className={`nes-touchpad${disabled ? ' is-disabled' : ''}`} aria-label="Manette tactile">
      <div
        ref={dpadRef}
        className="nes-dpad"
        role="group"
        aria-label="Croix directionnelle"
        onPointerDown={onDpadDown}
        onPointerMove={onDpadMove}
        onPointerUp={onDpadUp}
        onPointerCancel={onDpadUp}
        onLostPointerCapture={onDpadUp}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span className={`nes-dpad-arm up${dirs.has(BUTTONS.UP) ? ' is-pressed' : ''}`} />
        <span className={`nes-dpad-arm down${dirs.has(BUTTONS.DOWN) ? ' is-pressed' : ''}`} />
        <span className={`nes-dpad-arm left${dirs.has(BUTTONS.LEFT) ? ' is-pressed' : ''}`} />
        <span className={`nes-dpad-arm right${dirs.has(BUTTONS.RIGHT) ? ' is-pressed' : ''}`} />
        <span className="nes-dpad-hub" />
      </div>
      <div className="nes-touch-meta">
        {bind(BUTTONS.SELECT, 'SELECT', 'nes-pill')}
        {bind(BUTTONS.START, 'START', 'nes-pill')}
      </div>
      <div className="nes-touch-ab">
        {bind(BUTTONS.B, 'B', 'nes-round is-b')}
        {bind(BUTTONS.A, 'A', 'nes-round is-a')}
      </div>
    </div>
  );
}
