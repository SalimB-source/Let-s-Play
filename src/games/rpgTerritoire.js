/** Influence visuelle uniquement : ne modifie ni le duel, ni son hasard.
 * Tous les sorciers commencent à 25 PV. Chaque PV d'écart déplace la
 * frontière de 1,5 point, jusqu'à 80/20 (20 PV d'écart). On compare les PV
 * réels, pas pvMax : la réserve peut grandir avec les soins.
 * `vainqueur` vient de la page pour inclure les fins PvP par abandon/délai.
 */
export function territoireDuDuel(duel, vainqueur = null) {
  let partJoueur = 50;
  if (vainqueur === 'joueur') partJoueur = 100;
  else if (vainqueur === 'sorcier') partJoueur = 0;
  else if (vainqueur !== 'egalite' && duel?.joueur && duel?.sorcier) {
    const joueur = duel.joueur.pv;
    const sorcier = duel.sorcier.pv;
    if (Number.isFinite(joueur) && Number.isFinite(sorcier)) {
      const ecart = Math.max(-20, Math.min(20, joueur - sorcier));
      partJoueur = Math.round((50 + ecart * 1.5) * 10) / 10;
    }
  }
  return {
    partJoueur,
    frontiere: 100 - partJoueur,
    dominant: partJoueur > 50 ? 'joueur' : partJoueur < 50 ? 'sorcier' : 'neutre',
  };
}
