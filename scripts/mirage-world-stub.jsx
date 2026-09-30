/**
 * Doublure de src/games/MirageWorld.jsx pour `npm run check:mirage-cup`.
 *
 * jsdom n'a pas de WebGL : le vrai moteur ne devient jamais « prêt » et aucune
 * course ne peut partir. Cette doublure se déclare prête au montage et garde
 * les props courantes de la page (`worldProbe.props`), de sorte que le test
 * termine une course avec le résultat de son choix via `props.onFinish`.
 * Seul le moteur 3D est remplacé : la page, la coupe et l'écran du trophée
 * sont les vrais.
 */
import React, { useEffect } from 'react';

export const worldProbe = { mounted: 0, props: null };

export default function MirageWorldStub(props) {
  worldProbe.props = props;
  useEffect(() => {
    worldProbe.mounted += 1;
    return () => { worldProbe.mounted -= 1; };
  }, []);
  // Le vrai moteur se reconstruit (et se redéclare prêt) quand le terrain change.
  useEffect(() => { props.onReady?.(); }, [props.stage]);
  return <div className="mirage-world-stub" data-stage={props.stage} />;
}
