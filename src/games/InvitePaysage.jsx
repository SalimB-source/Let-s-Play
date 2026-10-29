import { useEffect, useState } from 'react';

import { requestNativeFullscreen } from './gameFullscreen.js';

/**
 * « Le Sablier se joue en paysage » — src/games/InvitePaysage.jsx
 * ================================================================
 * L'application verrouille l'orientation depuis la route (`PaysageSablier.jsx`),
 * mais un navigateur ne tourne pas un écran tout seul : `screen.orientation.lock`
 * n'est accordé qu'au plein écran, et le plein écran exige un geste du joueur.
 * D'où cette invite, montrée debout sur un appareil tactile :
 *
 *   - `bandeau` — l'écran d'entrée du Sablier : une bande qui ne recouvre pas la
 *     carte, pour laisser les liens de téléchargement atteignables (c'est
 *     justement en portrait qu'on installe l'APK) ;
 *   - `plein` — le menu, l'atelier, le souk, le mode histoire : l'écran entier,
 *     comme l'invite du duel, parce qu'on n'y fait que jouer.
 *
 * Le bouton demande le plein écran **dans le geste du clic** ; la session de
 * paysage de la route verrouille l'orientation dès qu'il est posé (voir le
 * rattrapage de `rpgLandscape.js`).
 */

/** L'appareil est-il au doigt, et debout ? */
export function portraitAuDoigt(win = typeof window === 'undefined' ? undefined : window) {
  if (!win || !win.matchMedia) return false;
  const doigt = Boolean(win.LetsPlayAndroid) || win.matchMedia('(pointer: coarse)').matches;
  return Boolean(doigt) && win.innerHeight > win.innerWidth;
}

/** Même question, tenue à jour au fil des rotations et des redimensionnements. */
export function usePortraitAuDoigt() {
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const update = () => setPortrait(portraitAuDoigt());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);
  return portrait;
}

export default function InvitePaysage({
  variante = 'plein',
  titre = 'Le Sablier se joue en paysage',
  texte = 'Tournez l’appareil pour retrouver toute la largeur du plateau.',
  onActiver,
  children,
}) {
  const activer = () => {
    if (onActiver) { onActiver(); return; }
    // Repli : le plein écran seul, la session de la route verrouille ensuite.
    requestNativeFullscreen(document.documentElement).catch(() => {});
  };

  if (variante === 'bandeau') {
    return (
      <div className="rpg-rotate-prompt rpg-rotate-prompt--bandeau" role="status" aria-live="polite">
        <span className="rpg-rotate-prompt__icon" aria-hidden="true">↻</span>
        <p><strong>{titre}.</strong> {texte}</p>
        <button type="button" className="rpg-rotate-prompt__bouton" onClick={activer}>
          Activer le paysage
        </button>
        {children}
      </div>
    );
  }

  return (
    <div className="rpg-rotate-prompt" role="dialog" aria-modal="true" aria-label="Jouer en paysage">
      <span className="rpg-rotate-prompt__icon" aria-hidden="true">↻</span>
      <h2>{titre}</h2>
      <p>{texte}</p>
      <button type="button" className="rpg-btn rpg-btn--primary" onClick={activer}>
        Activer le paysage
      </button>
      <small>
        Si votre navigateur refuse la rotation automatique, tournez l’appareil et
        désactivez son verrouillage d’orientation.
      </small>
      {children}
    </div>
  );
}
