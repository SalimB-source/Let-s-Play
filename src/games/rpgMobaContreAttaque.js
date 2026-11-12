/** Rectangles capturés avant mutation, y compris les cases vides : une carte
 * peut arriver puis disparaître au cours d'une même résolution. */
export function rpgMobaPositionsContreAttaque(table) {
  if (!table) return null;
  const rect = table.getBoundingClientRect();
  const width = table.clientWidth || rect.width, height = table.clientHeight || rect.height;
  if (!width || !height || !rect.width || !rect.height) return null;
  const boite = (element) => {
    const r = element.getBoundingClientRect();
    return { left: (r.left - rect.left) * width / rect.width, top: (r.top - rect.top) * height / rect.height,
      width: r.width * width / rect.width, height: r.height * height / rect.height };
  };
  const cases = Object.fromEntries([...table.querySelectorAll('[data-moba-position]')].map((el) => [
    `${el.dataset.mobaLane}:${el.dataset.mobaSide}:${el.dataset.mobaSlot}`, boite(el),
  ]));
  const voies = Object.fromEntries([...table.querySelectorAll('[data-moba-lane-hp]')].map((el) => {
    const r = boite(el), taille = Math.min(r.width, 72);
    return [el.dataset.mobaLaneHp, { left: r.left + (r.width - taille) / 2,
      top: r.top + (r.height - taille) / 2, width: taille, height: taille }];
  }));
  return { cases, voies };
}

/** Ne visualiser que les nouvelles ripostes du moteur et leurs vraies cibles. */
export function rpgMobaCiblesContreAttaque(avant, duel) {
  const effets = [];
  for (const event of duel.combatAnimations ?? []) {
    if (event.id <= avant.animationSeq || event.type !== 'contre-attaque') continue;
    const cible = event.cible;
    if (cible?.type === 'creature') {
      const carte = avant.cartes.find((item) => item.entityId === cible.entiteId);
      const lane = cible.mobaLane ?? carte?.laneId, slot = cible.mobaSlot ?? carte?.slot;
      const rect = avant.positions?.cases[`${lane}:${cible.cote}:${slot}`];
      if (rect) effets.push({ id: `${event.id}-creature`, rect, cible: `creature:${cible.entiteId}` });
    } else if (cible?.type === 'sorcier') {
      for (const lane of cible.mobaVoies ?? []) {
        const cle = `@moba:${lane}:${cible.cote}`;
        const rect = avant.positions?.voies[cle];
        if (rect) effets.push({ id: `${event.id}-${lane}`, rect, cible: cle });
      }
    }
  }
  return effets;
}
