/** Presentation only. Use the resolved engine summary, never infer the result
 * from a declaration (a target may have disappeared or the shot may miss). */
export function rpgMobaCombatFeedback(resume, entities, token) {
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  const miss = {};
  const critiques = {};
  const phrases = [];
  for (const shot of resume?.coupsRapides ?? []) {
    if (shot.annule) phrases.push(`${shot.attaquant} : attaque ciblée annulée, cible absente`);
    else if (shot.rate) {
      miss[shot.attaquantId] = { token };
      phrases.push(`${shot.attaquant} : attaque ciblée manquée`);
    }
  }
  for (const critical of resume?.critiques ?? []) {
    const entity = byId.get(critical.entiteId);
    if (critical.carteId === 'kagutsuchi-flamme-originelle') critiques[critical.entiteId] = { token, fois: critical.fois ?? 4 };
    if (entity) phrases.push(`${entity.name} : coup critique ×${critical.fois ?? 2}`);
  }
  return { miss, critiques, annonce: phrases.join(' ; ') };
}
