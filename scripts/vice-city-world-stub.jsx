/**
 * Doublure de src/games/ViceCityWorld.jsx pour `npm run check:vice-city-fullscreen`.
 *
 * jsdom n'a pas de WebGL : le vrai moteur de course ne devient jamais « prêt »
 * et l'arrivée n'arrive jamais. Cette doublure se déclare prête au montage et
 * garde les props courantes de la page (`worldProbe.props`), de sorte que le
 * test lance une course et la termine par le résultat de son choix via
 * `worldProbe.props.onFinish(…)`. Seul le moteur 3D est remplacé : la page
 * (intro, plein écran, HUD, arrivée) est la vraie.
 */
import React, { useEffect } from 'react';

export const worldProbe = { mounted: 0, props: null };

export default function ViceCityWorldStub(props) {
  worldProbe.props = props;
  useEffect(() => {
    worldProbe.mounted += 1;
    return () => { worldProbe.mounted -= 1; };
  }, []);
  // Le vrai moteur se reconstruit (et se redéclare prêt) à chaque course :
  // `runId` change à chaque lancement.
  useEffect(() => { props.onReady?.(); }, [props.runId]);
  return <div className="city-rush-world-stub" data-phase={props.phase} />;
}
