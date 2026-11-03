/** Détermine la carte à consulter sans changer le comportement du clic de jeu.
 * Le losange ne montre que la première arme ; un clic sur son image ou son
 * compteur désigne cette arme, tandis que le reste de la carte reste la créature.
 */
export function cibleApercuClicDroit(target) {
  const hote = target?.closest?.('[data-card-id]')
    ?? target?.closest?.('.rpg-souk__carte-place')?.querySelector?.('[data-souk-carte][data-card-id]');
  if (!hote || hote.closest?.('[inert]') || hote.getAttribute('aria-hidden') === 'true') return null;
  const vignette = target?.closest?.('[data-arme-vignette]');
  const armeId = vignette && hote.contains(vignette) ? vignette.dataset.armeVignette : null;
  return { hote, carteId: armeId || hote.dataset.cardId, arme: Boolean(armeId) };
}
