import { cardColors } from './rpgCards.js';

// Les sources douces respectent tous les éléments d’une carte hybride, sans
// modifier les cadres ni les indicateurs de la carte.
const LUMIERES = Object.freeze({
  braise: '#ff925e', eau: '#68d8ee', sable: '#eac47e', neige: '#b5eaff', tenebres: '#bd8ee9',
});

export function rpgLumiereElementaire(carte) {
  const couleurs = cardColors(carte).map((element) => LUMIERES[element]).filter(Boolean);
  if (!couleurs.length) couleurs.push(LUMIERES.sable);
  const fond = couleurs.map((couleur, index) => {
    const x = couleurs.length === 1 ? 50 : 18 + (64 * index / (couleurs.length - 1));
    return `radial-gradient(ellipse at ${x}% 60%, color-mix(in srgb, ${couleur} 42%, transparent) 0%, color-mix(in srgb, ${couleur} 20%, transparent) 48%, transparent 78%)`;
  }).join(', ');
  return { '--rpg-lumiere-fond': fond };
}

/** Inclinaison bornée : jamais de déplacement des emplacements ni des règles. */
export function rpgAnglesRelief(rect, x, y) {
  if (!rect?.width || !rect?.height || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const borner = (n) => Math.max(-1, Math.min(1, n));
  return { x: -borner((y - rect.top) / rect.height * 2 - 1) * 3,
    y: borner((x - rect.left) / rect.width * 2 - 1) * 3 };
}

export function rpgEffacerRelief(element) {
  if (!element) return;
  element.removeAttribute('data-relief-survol');
  element.style.removeProperty('--rpg-relief-x');
  element.style.removeProperty('--rpg-relief-y');
  element.style.removeProperty('--rpg-ombre-x');
  element.style.removeProperty('--rpg-ombre-y');
}

export function rpgSurvolRelief(event, reduit = false) {
  const element = event.currentTarget;
  if (reduit || event.pointerType !== 'mouse' || event.buttons || element.closest('.is-reduced')) {
    rpgEffacerRelief(element); return;
  }
  const angles = rpgAnglesRelief(element.getBoundingClientRect(), event.clientX, event.clientY);
  if (!angles) return;
  element.style.setProperty('--rpg-relief-x', `${angles.x.toFixed(2)}deg`);
  element.style.setProperty('--rpg-relief-y', `${angles.y.toFixed(2)}deg`);
  element.style.setProperty('--rpg-ombre-x', `${(-angles.y * 1.5).toFixed(2)}px`);
  element.style.setProperty('--rpg-ombre-y', `${(8 + angles.x * 1.5).toFixed(2)}px`);
  element.setAttribute('data-relief-survol', 'true');
}
