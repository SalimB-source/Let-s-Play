import { armeById } from './rpgCards.js';

/** Réserve de défense d'une arme. Les anciennes sauvegardes n'avaient pas de
 * compteur : on suppose que les dégâts déjà visibles ont entamé l'armure. */
export function armureArme(entite) {
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

export function armureRestante(entite) { return armureArme(entite)?.restant ?? 0; }
export function defenseSansArmure(entite) { return Math.max(0, (Number(entite?.pv) || 0) - armureRestante(entite)); }
export function plafondSoinCreature(entite, plafond = entite?.pvMax ?? entite?.def ?? entite?.pv ?? 0) {
  const armure = armureArme(entite);
  return Math.max(0, Number(plafond) - (armure ? armure.max - armure.restant : 0));
}

/** Les dégâts touchent la réserve de l'arme en premier, jamais les soins. */
export function absorberDegatsArmure(entite, montant) {
  const armure = armureArme(entite);
  if (!armure) return 0;
  const absorbe = Math.min(armure.restant, Math.max(0, Number(montant) || 0));
  entite.arme.armure = { ...armure, restant: armure.restant - absorbe };
  return absorbe;
}
