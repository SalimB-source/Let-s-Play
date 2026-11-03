import { armeById } from './rpgCards.js';

/** Réserve de défense d'une arme. Les anciennes sauvegardes n'avaient pas de
 * compteur : on suppose que les dégâts déjà visibles ont entamé l'armure. */
export function armurePrototype(entite) {
  const arme = entite?.arme;
  if (!arme) return null;
  if (arme.armure && Number.isFinite(arme.armure.max) && Number.isFinite(arme.armure.restant)) {
    const max = Math.max(0, arme.armure.max);
    return max > 0 ? { max, restant: Math.max(0, Math.min(max, arme.armure.restant)) } : null;
  }
  const carte = armeById(arme.carteId);
  const max = Math.max(0, (Number(carte?.bonus?.def) || 0) + (Number(entite.lienArmesBonus?.[arme.carteId]?.def) || 0));
  if (!max) return null;
  const blessures = Math.max(0, (Number(entite.pvMax) || 0) - (Number(entite.pv) || 0));
  return { max, restant: Math.max(0, max - blessures) };
}

/** Toutes les armures d'armes, y compris celles attachées par une magie. */
export function armureArme(entite) {
  const reserves = [armurePrototype(entite), ...(entite?.armuresMagiques ?? [])].filter(Boolean);
  const max = reserves.reduce((total, armure) => total + Math.max(0, Number(armure.max) || 0), 0);
  if (!max) return null;
  const restant = reserves.reduce((total, armure) => total + Math.max(0, Math.min(Number(armure.max) || 0, Number(armure.restant) || 0)), 0);
  return { max, restant };
}

export function armureRestante(entite) { return armureArme(entite)?.restant ?? 0; }
export function defenseSansArmure(entite) { return Math.max(0, (Number(entite?.pv) || 0) - armureRestante(entite)); }
export function plafondSoinCreature(entite, plafond = entite?.pvMax ?? entite?.def ?? entite?.pv ?? 0) {
  const armure = armureArme(entite);
  return Math.max(0, Number(plafond) - (armure ? armure.max - armure.restant : 0));
}

/** Les dégâts touchent la réserve de l'arme en premier, jamais les soins. */
export function absorberDegatsArmure(entite, montant) {
  let restant = Math.max(0, Number(montant) || 0);
  let absorbe = 0;
  const prototype = armurePrototype(entite);
  if (prototype) {
    const part = Math.min(prototype.restant, restant);
    entite.arme.armure = { ...prototype, restant: prototype.restant - part };
    restant -= part;
    absorbe += part;
  }
  for (const armure of entite.armuresMagiques ?? []) {
    const part = Math.min(Math.max(0, Number(armure.restant) || 0), restant);
    armure.restant -= part;
    restant -= part;
    absorbe += part;
  }
  return absorbe;
}
