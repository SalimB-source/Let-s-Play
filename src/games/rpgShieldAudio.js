/** Détecte la rupture d'une parade entre deux états d'une créature survivante.
 * Un bouclier retiré avec une arme remplacée n'a pas encaissé de coup. */
export function rpgBouclierVientDeRompre(avant, apres) {
  if (!avant || !apres || avant.isTerrain) return false;
  const armeChangee = (avant.armeId ?? null) !== (apres.arme?.carteId ?? null);
  const lumiere = Boolean(avant.bouclierLumiere && !apres.bouclierLumiere);
  const general = (avant.bouclier ?? 0) > 0 && (apres.bouclier ?? 0) <= 0;
  const colore = Boolean(avant.protection && !apres.protection);
  return lumiere || (!armeChangee && (general || colore));
}
