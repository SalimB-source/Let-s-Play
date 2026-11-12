/** Presentation only. Use the resolved engine summary, never infer the result
 * from a declaration (a target may have disappeared or the shot may miss). */
export function rpgMobaCombatFeedback(resume, entities, token) {
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  const miss = {};
  const critiques = {};
  const phrases = [];
  for (const shot of resume?.coupsRapides ?? []) {
    if (shot.annule) phrases.push(shot.annulationSphere === 'attaquant'
      ? `${shot.attaquant} : attaque ciblée annulée, attaquant renvoyé par la Sphère`
      : shot.annulationSphere === 'cible'
        ? `${shot.attaquant} : attaque ciblée annulée, cible renvoyée par la Sphère`
        : `${shot.attaquant} : attaque ciblée annulée, cible absente`);
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

/** Chaque résolution garde son propre délai. Les effets encore visibles sont
 * réunis sans modifier les anciens ; pour une même créature, le plus récent
 * fournit le jeton qui relance son animation. */
export function rpgMobaFusionnerFeedback(effets) {
  const miss = {};
  const critiques = {};
  const annonces = [];
  for (const effet of Object.values(effets ?? {})) {
    Object.assign(miss, effet.miss);
    Object.assign(critiques, effet.critiques);
    if (effet.annonce) annonces.push(effet.annonce);
  }
  return { miss, critiques, annonce: annonces.join(' ; ') };
}
