/**
 * Doublure de src/games/SoulsWorld.jsx pour `npm run check:souls-mobile`.
 *
 * jsdom n'a pas de WebGL : le vrai moteur ne deviendrait jamais « prêt » et la
 * page resterait sur « ALLUMAGE DE LA FLAMME… ». Cette doublure se déclare
 * prête au montage, publie un HUD plausible, et **enregistre les actions** que
 * la page lui envoie (`worldProbe.actions`) — c'est ainsi que le test vérifie
 * que le stick et les boutons de la manette arrivent bien au moteur.
 * Seul le moteur 3D est remplacé : la page, les overlays, le paysage et les
 * commandes tactiles sont les vrais.
 */
import React, { useEffect } from 'react';

export const worldProbe = { mounted: 0, props: null, actions: [] };

export default function SoulsWorldStub(props) {
  worldProbe.props = props;
  useEffect(() => {
    worldProbe.mounted += 1;
    worldProbe.actions.length = 0;
    if (props.actionsRef) {
      props.actionsRef.current = (name, payload) => { worldProbe.actions.push([name, payload]); };
    }
    props.onReady?.();
    props.onHud?.({
      x: 0, z: 6.5, hp: 100, maxHp: 100, stamina: 100, maxStamina: 100,
      souls: 0, flask: 3, maxFlask: 3, level: 0, zone: 'LE CAMP',
      moving: false, run: false, prompt: null, toast: null, drinking: false,
    });
    return () => {
      worldProbe.mounted -= 1;
      if (props.actionsRef) props.actionsRef.current = null;
    };
  }, []);
  return <div className="souls-world-stub" />;
}
