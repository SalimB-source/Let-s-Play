/** Capture la géométrie avant résolution : une conquête ou une destruction
 * peut retirer la cible du DOM dès le prochain rendu. Aucun état de jeu n'est
 * modifié. Les coordonnées restent dans l'espace local du plateau. */
export function rpgMobaPositionsImpact(table) {
  if (!table) return null;
  const rect = table.getBoundingClientRect();
  const width = table.clientWidth || rect.width;
  const height = table.clientHeight || rect.height;
  if (!width || !height || !rect.width || !rect.height) return null;
  const point = (element) => {
    const r = element.getBoundingClientRect();
    return { x: (r.left + r.width / 2 - rect.left) * width / rect.width,
      y: (r.top + r.height / 2 - rect.top) * height / rect.height };
  };
  const entities = Object.fromEntries([...table.querySelectorAll('[data-moba-entity]')]
    .map((element) => [element.dataset.mobaEntity, point(element)]));
  const lanes = Object.fromEntries([...table.querySelectorAll('[data-moba-lane-hp]')]
    .map((element) => [element.dataset.mobaLaneHp, point(element)]));
  return { width, height, entities, lanes };
}

/** Seulement des dégâts réellement résolus, jamais l'attaque annoncée.
 * Les blessures directes de l'échange excluent esquive, protection et Voile ;
 * les événements de voie excluent les capacités annexes comme Tribut. */
export function rpgMobaImpactIndividuel(combat, resultat, positions, noms = {}) {
  if (!combat?.cibleIndividuelle || !resultat?.ok || resultat.annule) return null;
  const sourceId = combat.attaquants?.[0];
  const { cibleId, voie } = combat.cibleIndividuelle;
  const defenseur = combat.cote === 'joueur' ? 'sorcier' : 'joueur';
  const laneKey = `@moba:${voie}:${defenseur}`;
  const blessures = (resultat.resume?.blessures ?? []).filter((item) => item.montant > 0);
  const directs = (resultat.damageEvents ?? []).filter((event) => event.attackerId === sourceId
    && !event.tribut && event.laneId === voie && event.targetSide === defenseur && event.damage > 0);
  const impacts = blessures.map((item) => ({ id: item.entiteId, montant: item.montant,
    point: positions?.entities?.[item.entiteId], critique: (resultat.resume?.critiques ?? []).some((critical) => critical.entiteId === item.sourceId) }));
  for (const event of directs) impacts.push({ id: laneKey, montant: event.damage, point: positions?.lanes?.[laneKey], critique: (resultat.resume?.critiques ?? []).some((critical) => critical.entiteId === sourceId) });
  const annonce = impacts.map(({ id, montant }) => `${noms[id] ?? (id === laneKey ? `voie ${voie === 'left' ? 'gauche' : voie === 'right' ? 'droite' : 'centrale'}` : 'créature')} : ${montant} dégâts`).join(' ; ');
  return { positions, source: positions?.entities?.[sourceId],
    destination: cibleId ? positions?.entities?.[cibleId] : positions?.lanes?.[laneKey],
    impacts, annonce };
}
