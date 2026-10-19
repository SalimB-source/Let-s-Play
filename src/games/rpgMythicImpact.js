/** Arrival detection is based on entity IDs, never on renders or card hover. */
export function mythicArrivals(previous, current, cardById) {
  const known = new Set(previous.map((entity) => entity.id));
  return current.filter((entity) => !known.has(entity.id)
    && cardById(entity.carteId)?.rarity === 'mythique');
}

/** One self-contained cinematic; cancelling restores all original card styles. */
export function playMythicImpact(table, card, playSound, reduced = false) {
  const animations = [];
  const timers = [];
  let disposed = false;
  const animate = (element, frames, options) => {
    if (element?.animate) animations.push(element.animate(frames, options));
  };
  const rect = card.getBoundingClientRect();
  const bounds = table.getBoundingClientRect();
  const sx = table.offsetWidth / (bounds.width || 1);
  const sy = table.offsetHeight / (bounds.height || 1);
  const fx = document.createElement('div');
  fx.className = `rpg-mythic-impact${reduced ? ' is-reduced' : ''}`;
  fx.setAttribute('aria-hidden', 'true');
  fx.style.left = `${(rect.left + rect.width / 2 - bounds.left) * sx}px`;
  fx.style.top = `${(rect.top + rect.height / 2 - bounds.top) * sy}px`;
  fx.style.setProperty('--impact-size', `${Math.max(100, rect.width * sx)}px`);
  fx.innerHTML = '<i class="rpg-mythic-impact__shadow"></i><i class="rpg-mythic-impact__ring"></i><i class="rpg-mythic-impact__ring rpg-mythic-impact__ring--echo"></i>';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '-150 -150 300 300');
  svg.classList.add('rpg-mythic-impact__cracks');
  for (let i = 0; i < 9; i += 1) {
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', 'M 24 0 L 48 -5 L 60 3 L 79 -9 L 105 -4 M 60 3 L 70 18 L 89 25');
    path.setAttribute('transform', `rotate(${i * 40 + 13}) scale(${0.75 + (i % 3) * 0.12})`);
    svg.append(path);
  }
  fx.append(svg);
  for (let i = 0; i < 28; i += 1) {
    const mote = document.createElement('i');
    mote.className = i % 3 === 0 ? 'rpg-mythic-impact__debris' : 'rpg-mythic-impact__dust';
    const angle = i * 2.39996;
    const reach = 65 + (i % 7) * 15;
    mote.style.setProperty('--dx', `${Math.cos(angle) * reach}px`);
    mote.style.setProperty('--dy', `${Math.sin(angle) * reach * 0.58}px`);
    mote.style.setProperty('--delay', `${340 + (i % 5) * 12}ms`);
    mote.style.setProperty('--spin', `${i * 37}deg`);
    fx.append(mote);
  }
  table.append(fx);
  const cleanup = () => {
    disposed = true;
    timers.forEach(clearTimeout);
    animations.forEach((animation) => animation.cancel());
    fx.remove();
  };
  if (reduced) {
    animate(card, [{ filter: 'brightness(1.3)' }, { filter: 'brightness(1)' }], { duration: 450 });
    playSound('mythic_impact');
  } else {
    // Individual transform properties preserve the card's tilt / combat transform.
    animate(card, [
      { translate: '0 -68px', scale: '1.18', offset: 0, easing: 'ease-out' },
      { translate: '0 -76px', scale: '1.2', offset: 0.28, easing: 'cubic-bezier(.7,0,1,.45)' },
      { translate: '0 3px', scale: '1.015 .97', offset: 0.6, easing: 'ease-out' },
      { translate: '0 0', scale: '1', offset: 1 },
    ], { duration: 580 });
    timers.push(setTimeout(() => {
      if (disposed || !card.isConnected) return;
      playSound('mythic_impact');
      animate(table, [
        { translate: '0 0' }, { translate: '0 5px', offset: 0.12 },
        { translate: '-3px -3px', offset: 0.27 }, { translate: '2px 2px', offset: 0.45 },
        { translate: '-1px 0', offset: 0.7 }, { translate: '0 0' },
      ], { duration: 320, easing: 'ease-out' });
      table.querySelectorAll('.card-row [data-entity-id]').forEach((neighbor) => {
        if (neighbor === card) return;
        animate(neighbor, [{ translate: '0 0' }, { translate: '0 -3px', offset: 0.3 }, { translate: '0 0' }], { duration: 260 });
      });
    }, 348));
  }
  timers.push(setTimeout(cleanup, 1450));
  return cleanup;
}
