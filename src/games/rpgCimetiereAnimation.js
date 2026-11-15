/** Mouvements visuels uniquement : ce journal ne modifie ni ne sérialise le duel. */
const mouvements = new WeakMap();

export function noterSortieCimetiere(duel, cote, carteId, destination, entiteId = null) {
  if (!duel || !carteId || !['main', 'jeu'].includes(destination)) return;
  const file = mouvements.get(duel) ?? [];
  file.push({ cote, carteId, destination, entiteId });
  mouvements.set(duel, file);
}

export function consommerSortiesCimetiere(duel) {
  if (!duel) return [];
  const file = mouvements.get(duel) ?? [];
  mouvements.delete(duel);
  return file;
}

/** Copie les zones : le moteur peut muter un même objet entre deux rendus. */
export function instantaneCimetiere(duel) {
  if (!duel) return null;
  return Object.fromEntries(['joueur', 'sorcier'].map((cote) => {
    const camp = duel[cote] ?? {};
    return [cote, {
      cimetiere: [...(camp.cimetiere ?? [])],
      exil: [...(camp.exil ?? [])],
      main: [...(camp.main ?? [])],
      mainCount: camp.mainCount ?? camp.main?.length ?? 0,
      deckCount: camp.deckCount ?? camp.deck?.length ?? 0,
      creatures: (camp.creatures ?? []).map(({ id, carteId }) => ({ id, carteId })),
    }];
  }));
}

function differences(avant, apres) {
  const disponibles = new Map();
  for (const id of apres) disponibles.set(id, (disponibles.get(id) ?? 0) + 1);
  return avant.filter((id) => {
    const nombre = disponibles.get(id) ?? 0;
    if (!nombre) return true;
    disponibles.set(id, nombre - 1);
    return false;
  });
}

/** Repli pour une vue PvP distante : seul un retrait public qui correspond à
 * une nouvelle présence ou à une carte gagnée en main peut être animé. La
 * main adverse masquée n'expose jamais de face dans le rendu. */
export function sortiesCimetiereEntreVues(avant, apres) {
  if (!avant || !apres) return [];
  const resultat = [];
  for (const cote of ['joueur', 'sorcier']) {
    const vieux = avant[cote], nouveau = apres[cote];
    const retraits = differences(vieux.cimetiere, nouveau.cimetiere);
    // Un coût d'exil ne doit pas ressembler à une réanimation de la même carte.
    for (const id of differences(nouveau.exil ?? [], vieux.exil ?? [])) {
      const index = retraits.indexOf(id);
      if (index >= 0) retraits.splice(index, 1);
    }
    const idsAvant = new Set(vieux.creatures.map((e) => e.id));
    for (const entite of nouveau.creatures) {
      if (idsAvant.has(entite.id)) continue;
      const i = retraits.indexOf(entite.carteId);
      if (i < 0) continue;
      retraits.splice(i, 1);
      resultat.push({ cote, carteId: entite.carteId, entiteId: entite.id, destination: 'jeu' });
    }
    const ajouts = differences(nouveau.main, vieux.main);
    for (const id of ajouts) {
      const i = retraits.indexOf(id);
      if (i < 0) continue;
      retraits.splice(i, 1);
      resultat.push({ cote, carteId: id, destination: 'main' });
    }
    // L'adversaire PvP n'expose que le nombre de cartes en main.
    if (cote === 'sorcier' && !nouveau.main.length && !vieux.main.length) {
      const baisseDeck = Math.max(0, vieux.deckCount - nouveau.deckCount);
      const gain = Math.max(0, nouveau.mainCount - vieux.mainCount - baisseDeck);
      resultat.push(...retraits.slice(0, gain).map((carteId) => ({ cote, carteId, destination: 'main' })));
    }
  }
  return resultat;
}
