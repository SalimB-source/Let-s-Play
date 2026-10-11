/** Presentation only: keep every terrain instance in the engine. The next
 * available instance is used for a manual mana action, never the whole stack. */
export function groupTerrainStacks(terrains = []) {
  const groups = new Map();
  for (const terrain of terrains) {
    let group = groups.get(terrain.carteId);
    if (!group) {
      group = { carteId: terrain.carteId, count: 0, available: 0, tapped: 0, terrain };
      groups.set(terrain.carteId, group);
    }
    group.count++;
    if (terrain.tapped) group.tapped++;
    else {
      group.available++;
      if (group.terrain.tapped) group.terrain = terrain;
    }
  }
  return [...groups.values()];
}
