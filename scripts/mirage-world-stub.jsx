import React, { useEffect } from 'react';

/**
 * Remplaçant de `MirageWorld` (le moteur Three.js) pour les contrôles qui tournent
 * sans WebGL : jsdom (`npm run check:mirage-scoreboard`) ou un navigateur piloté à la
 * main. Il ne dessine rien : il se déclare prêt et expose ses props, ce qui permet au
 * test de franchir la ligne d'arrivée quand il veut en appelant `onFinish(résultat)`,
 * exactement comme le fait le vrai moteur.
 *
 * Il prend la place de `./MirageWorld` par un alias au moment du build SSR du test.
 */
export const worldControl = { props: null };

export default function MirageWorldStub(props) {
  // Dernières props reçues, lues par le test (et par `window.__mirageWorldProps` en navigateur).
  worldControl.props = props;
  if (typeof window !== 'undefined') window.__mirageWorldProps = props;
  useEffect(() => { props.onReady?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="mirage-world" data-stub="mirage-world" />;
}
