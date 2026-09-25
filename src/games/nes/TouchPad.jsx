import React, { useCallback, useRef } from 'react';
import { BUTTONS } from './nesEngine';

// Manette tactile : croix directionnelle « glissable » (on peut rouler le
// pouce d'une direction à l'autre, diagonales comprises), A / B et
// Select / Start. Multi-touch : chaque zone suit son propre doigt.

// Disposition par défaut : manette NES. La Mega Drive passe la sienne
// (A / B / C + Start) via la prop `layout`.
export const NES_LAYOUT = {
  up: BUTTONS.UP,
  down: BUTTONS.DOWN,
  left: BUTTONS.LEFT,
  right: BUTTONS.RIGHT,
  meta: [
    { button: BUTTONS.SELECT, label: 'SELECT' },
    { button: BUTTONS.START, label: 'START' },
  ],
  face: [
    { button: BUTTONS.B, label: 'B', className: 'is-b' },
    { button: BUTTONS.A, label: 'A', className: 'is-a' },
  ],
};
const DEADZONE = 0.22;

function buzz() {
  try { navigator.vibrate?.(8); } catch { /* pas de vibreur */ }
}

function directionsFor(event, element, layout) {
  const rect = element.getBoundingClientRect();
  const dx = (event.clientX - rect.left) / rect.width - 0.5;
  const dy = (event.clientY - rect.top) / rect.height - 0.5;
  const pressed = new Set();
  if (Math.hypot(dx, dy) < DEADZONE / 2) return pressed;
  const angle = Math.atan2(dy, dx); // 0 = droite, π/2 = bas
  const sector = Math.round(angle / (Math.PI / 4)); // -4..4, 8 secteurs
  if ([-1, 0, 1].includes(sector)) pressed.add(layout.right);
  if ([1, 2, 3].includes(sector)) pressed.add(layout.down);
  if ([3, 4, -4, -3].includes(sector)) pressed.add(layout.left);
  if ([-3, -2, -1].includes(sector)) pressed.add(layout.up);
  return pressed;
}

export default function TouchPad({ engineRef, disabled, layout = NES_LAYOUT }) {
  const DIRECTIONS = [layout.up, layout.down, layout.left, layout.right];
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
  }, [engineRef, layout]);

  const onDpadDown = (event) => {
    if (disabled) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDirections(directionsFor(event, dpadRef.current, layout));
  };
  const onDpadMove = (event) => {
    if (disabled || !event.currentTarget.hasPointerCapture?.(event.pointerId)) return;
    setDirections(directionsFor(event, dpadRef.current, layout));
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
        <span className={`nes-dpad-arm up${dirs.has(layout.up) ? ' is-pressed' : ''}`} />
        <span className={`nes-dpad-arm down${dirs.has(layout.down) ? ' is-pressed' : ''}`} />
        <span className={`nes-dpad-arm left${dirs.has(layout.left) ? ' is-pressed' : ''}`} />
        <span className={`nes-dpad-arm right${dirs.has(layout.right) ? ' is-pressed' : ''}`} />
        <span className="nes-dpad-hub" />
      </div>
      <div className="nes-touch-meta">
        {layout.meta.map((item) => <React.Fragment key={item.label}>{bind(item.button, item.label, 'nes-pill')}</React.Fragment>)}
      </div>
      <div className={`nes-touch-ab${layout.face.length > 2 ? ' has-three' : ''}`}>
        {layout.face.map((item) => <React.Fragment key={item.label}>{bind(item.button, item.label, `nes-round ${item.className || ''}`)}</React.Fragment>)}
      </div>
    </div>
  );
}
