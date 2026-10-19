/**
 * L'arrivée en jeu d'une créature : la carte s'élève, retombe et marque le sol.
 *
 * Le geste est celui des mythiques, mais il est pour tout le monde — une
 * commune posée au tour 2 mérite de *tomber* sur la table, pas d'apparaître.
 * Ce qui reste la marque du rang, c'est ce qui ébranle la table entière : la
 * secousse, la vague sur les créatures voisines, les fissures du sol et le coup
 * de tonnerre. Une carte posée vingt fois par partie ne doit pas faire trembler
 * l'arène à chaque fois — ni noyer la table sous les particules.
 */

/**
 * Les entités nouvelles sur la table, marquées de leur rang. La détection se
 * fait sur l'identité des entités — jamais sur un rendu ou un survol de carte :
 * un re-rendu ne rejoue pas la cérémonie, et une créature qui repart dans la
 * main puis revient en jeu est une arrivée de plus.
 *
 * @returns {Array<{ id: string, carteId: string, mythique: boolean }>}
 */
export function arriveesEnJeu(previous, current, cardById) {
  const connues = new Set(previous.map((entity) => entity.id));
  return current
    .filter((entity) => !connues.has(entity.id))
    .map((entity) => ({
      ...entity,
      mythique: cardById(entity.carteId)?.rarity === 'mythique',
    }));
}

/**
 * Une arrivée jouée sur la table, autonome : l'annulation rend la carte à ses
 * styles d'origine et retire la couche posée.
 *
 * @param {HTMLElement} table la table, repère de position (et du tremblement)
 * @param {HTMLElement} card la face de la créature qui arrive
 * @param {(nom: string) => void} playSound le son de la table
 * @param {boolean} reduced `prefers-reduced-motion` : plus de couche posée en
 *   lecture, seul l'éclat de la carte reste
 * @param {boolean} mythique le rang de la carte arrivée : `true` garde la
 *   cérémonie entière (secousse de la table, vague sur les voisines, fissures,
 *   second anneau, tonnerre) ; `false` joue le même slam et sa poussière, sans
 *   ébranler la table
 * @returns {() => void} l'annulation
 */
export function playMythicImpact(table, card, playSound, reduced = false, mythique = true) {
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
  fx.className = `rpg-mythic-impact${reduced ? ' is-reduced' : ''}${mythique ? '' : ' rpg-mythic-impact--pose'}`;
  fx.setAttribute('aria-hidden', 'true');
  fx.style.left = `${(rect.left + rect.width / 2 - bounds.left) * sx}px`;
  fx.style.top = `${(rect.top + rect.height / 2 - bounds.top) * sy}px`;
  fx.style.setProperty('--impact-size', `${Math.max(100, rect.width * sx)}px`);
  // Le second anneau, l'écho qui repart sur la table, reste un luxe de rang
  // mythique : une créature posée se contente du cercle qui la referme.
  fx.innerHTML = '<i class="rpg-mythic-impact__shadow"></i><i class="rpg-mythic-impact__ring"></i>'
    + (mythique ? '<i class="rpg-mythic-impact__ring rpg-mythic-impact__ring--echo"></i>' : '');
  if (mythique && !reduced) {
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
  }
  // Vingt-huit éclats pour une mythique qui fend le sol ; quatorze pour une
  // créature simplement posée — la poussière dit le choc, elle ne le joue pas.
  // En mouvement réduit, la couche est cachée par la feuille : rien n'est posé.
  const eclats = reduced ? 0 : (mythique ? 28 : 14);
  for (let i = 0; i < eclats; i += 1) {
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
    if (mythique) playSound('mythic_impact');
  } else {
    // Individual transform properties preserve the card's tilt / combat transform.
    animate(card, [
      { translate: '0 -68px', scale: '1.18', offset: 0, easing: 'ease-out' },
      { translate: '0 -76px', scale: '1.2', offset: 0.28, easing: 'cubic-bezier(.7,0,1,.45)' },
      { translate: '0 3px', scale: '1.015 .97', offset: 0.6, easing: 'ease-out' },
      { translate: '0 0', scale: '1', offset: 1 },
    ], { duration: 580 });
    if (mythique) {
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
  }
  timers.push(setTimeout(cleanup, 1450));
  return cleanup;
}
