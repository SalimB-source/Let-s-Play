import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import RpgAvatarEclatement from '../src/games/RpgAvatarEclatement.jsx';
import { NOMBRE_ECLATS } from '../src/games/rpgAvatarEclats.js';
import '../src/games/rpg-avatars-plateau.css';
import '../src/games/rpg-avatar-eclatement.css';

const portrait = `${import.meta.env.BASE_URL}sablier-story/avatars/avatar-salem.webp?v=duel-tetes-1`;
const adversaire = `${import.meta.env.BASE_URL}sablier-story/avatars/avatar-ifrit-ergs.webp?v=duel-tetes-1`;

/** Démonstration autonome : le disque doré plein, puis l'éclatement du perdant
 *  pendant que le gagnant reste intact. Le bouton rejoue la fin de duel. */
function Demo() {
  const [cle, setCle] = useState(0);
  const [eclate, setEclate] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setEclate(true), 850);
    return () => clearTimeout(id);
  }, [cle]);

  const rejouer = () => { setEclate(false); setCle((n) => n + 1); };

  return (
    <>
      <h1>Éclatement de l’avatar</h1>
      <p className="intro">
        Disque doré rempli en CSS — aucun PNG transparent — puis fin de duel :
        l’avatar du perdant se brise en {NOMBRE_ECLATS} éclats, le gagnant reste intact.
      </p>
      <div className="scene">
        <div className="rpg-battle" data-scene="duel" style={{ '--rpg-eclat-portee': '105px' }}>
          <div className="card-table">
            <div className="rpg-wizard-plate rpg-wizard-plate--ennemi">
              <span className="rpg-wizard-plate__avatar" data-scene-avatar="ennemi" aria-hidden="true">
                <img src={adversaire} alt="" />
              </span>
            </div>
            <div className="rpg-wizard-plate rpg-wizard-plate--joueur">
              <span className={`rpg-wizard-plate__avatar${eclate ? ' is-eclatant' : ''}`} data-scene-avatar="joueur" aria-hidden="true">
                <img src={portrait} alt="" />
                {eclate && <RpgAvatarEclatement key={cle} image={portrait} camp="joueur" />}
              </span>
            </div>
          </div>
        </div>
        <div className="legende"><b>Gagnant</b> à gauche · <b>perdant éclaté</b> à droite</div>
      </div>
      <div className="commandes">
        <button type="button" onClick={rejouer}>Rejouer l’éclatement</button>
        <span className="compteur">{NOMBRE_ECLATS} morceaux · ~1,5 s · mouvement réduit respecté</span>
      </div>
    </>
  );
}

createRoot(document.getElementById('root')).render(<Demo />);
