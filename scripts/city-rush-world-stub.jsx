/**
 * Doublure de src/games/ViceCityWorld.jsx pour `npm run check:city-rush-ui`.
 *
 * jsdom n'a pas de WebGL : le vrai moteur ne peut pas démarrer. Cette doublure
 * se déclare prête au montage et garde les props courantes de la page
 * (`worldProbe.props`), de sorte que le test termine une course avec le résultat
 * de son choix via `props.onFinish`. Seul le moteur 3D est remplacé : la page, son
 * sélecteur de difficulté, ses records et ses écrans sont les vrais.
 */
import React, { useEffect } from 'react';

export const worldProbe = { props: null };

export default function ViceCityWorldStub(props) {
  worldProbe.props = props;
  useEffect(() => { props.onReady?.(); }, [props.cityId, props.carId]);
  return <div className="city-rush-world" data-difficulty={props.difficulty} />;
}
