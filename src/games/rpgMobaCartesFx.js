// Regroupe les mouvements simultanés (Mue mondiale, pioches multiples) pour
// conserver l'ordre défausse → pioche sans saturer le plateau de cartes.
export function rpgMobaMouvementsCartes(evenements) {
  const groupes = [];
  for (const event of evenements) {
    if (!['pioche', 'defausse'].includes(event.type) || !['joueur', 'sorcier'].includes(event.cote)) continue;
    const dernier = groupes.at(-1);
    if (dernier?.type === event.type && dernier.cote === event.cote) {
      dernier.nombre += 1;
      dernier.carteId = event.carteId;
    } else {
      groupes.push({ type: event.type, cote: event.cote, carteId: event.carteId, nombre: 1 });
    }
  }
  return groupes;
}

export function rpgMobaTrajetCarte(depart, arrivee) {
  if (!depart || !arrivee || !depart.width || !arrivee.width) return null;
  const x = depart.left + depart.width / 2;
  const y = depart.top + depart.height / 2;
  return {
    x: x - 20,
    y: y - 28,
    dx: arrivee.left + arrivee.width / 2 - x,
    dy: arrivee.top + arrivee.height / 2 - y,
  };
}
