/** Détermine la carte désignée : chaque arme posée derrière une créature
 * porte son propre identifiant, indépendamment de celui de son porteur. */
export function cibleApercuClicDroit(target) {
  const hote = target?.closest?.('[data-card-id]')
    ?? target?.closest?.('.rpg-souk__carte-place')?.querySelector?.('[data-souk-carte][data-card-id]');
  if (!hote || hote.closest?.('[inert]') || hote.getAttribute('aria-hidden') === 'true') return null;
  const vignette = target?.closest?.('[data-arme-vignette]');
  const armeId = vignette && hote.contains(vignette) ? vignette.dataset.armeVignette : null;
  return { hote, carteId: armeId || hote.dataset.cardId, arme: Boolean(armeId || hote.hasAttribute('data-arme-equipee')) };
}
