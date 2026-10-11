/** Touch/pen adapter. Native HTML drag remains responsible for mouse input.
 * Horizontal gestures scroll the hand; vertical gestures lift a card.
 * A tap never starts a drag, and cancellation never commits a move.
 */
export function startRpgTouchDrag(event, { source, targetAt, onStart, onHover, onDrop, onEnd }) {
  if (!['touch', 'pen'].includes(event.pointerType) || event.isPrimary === false || event.button > 0) return null;
  const doc = source.ownerDocument;
  const win = doc.defaultView;
  const pointerId = event.pointerId;
  const x = event.clientX;
  const y = event.clientY;
  let active = false;
  let finished = false;
  let ghost;
  let hovered;
  const suppressClick = (e) => { e.preventDefault(); e.stopPropagation(); };
  const cleanup = () => {
    if (finished) return;
    finished = true;
    win.removeEventListener('pointermove', move);
    win.removeEventListener('pointerup', up);
    win.removeEventListener('pointercancel', cancel);
    win.removeEventListener('blur', cancel);
    doc.removeEventListener('visibilitychange', visibility);
    source.removeEventListener('contextmenu', suppressClick);
    ghost?.remove();
    hovered?.classList.remove('is-touch-drop-target');
    if (active) {
      // Also swallow the synthetic click generated after pointerup on Android/iOS.
      doc.addEventListener('click', suppressClick, true);
      win.setTimeout(() => doc.removeEventListener('click', suppressClick, true), 350);
      onEnd();
    }
  };
  const move = (e) => {
    if (e.pointerId !== pointerId) return;
    if (!active) {
      const dx = Math.abs(e.clientX - x);
      const dy = Math.abs(e.clientY - y);
      if (Math.max(dx, dy) < 10) return;
      if (dx > dy) { cleanup(); return; }
      active = true;
      const rect = source.getBoundingClientRect();
      ghost = doc.createElement('div');
      ghost.className = 'rpg-touch-drag-ghost';
      ghost.setAttribute('aria-hidden', 'true');
      const image = source.querySelector('img')?.cloneNode();
      if (image) ghost.append(image);
      ghost.style.width = `${rect.width}px`;
      ghost.style.height = `${rect.height}px`;
      doc.body.append(ghost);
      onStart();
    }
    if (e.cancelable) e.preventDefault();
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top = `${e.clientY - 24}px`;
    hovered?.classList.remove('is-touch-drop-target');
    hovered = targetAt(e.clientX, e.clientY);
    hovered?.classList.add('is-touch-drop-target');
    onHover(Boolean(hovered));
  };
  const up = (e) => {
    if (e.pointerId !== pointerId) return;
    try {
      if (active) {
        const target = targetAt(e.clientX, e.clientY);
        if (target) onDrop(target);
      }
    } finally { cleanup(); }
  };
  const cancel = (e) => {
    if (e?.pointerId != null && e.pointerId !== pointerId) return;
    cleanup();
  };
  const visibility = () => { if (doc.hidden) cleanup(); };
  source.addEventListener('contextmenu', suppressClick);
  win.addEventListener('pointermove', move, { passive: false });
  win.addEventListener('pointerup', up);
  win.addEventListener('pointercancel', cancel);
  win.addEventListener('blur', cancel);
  doc.addEventListener('visibilitychange', visibility);
  return cleanup;
}
