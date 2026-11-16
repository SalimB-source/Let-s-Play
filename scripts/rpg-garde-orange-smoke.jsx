import React from 'react';
import { createRoot } from 'react-dom/client';
import { TableCard } from '../src/games/RpgDuelPage.jsx';
import { EffetsSprite } from '../src/games/effetIcons.jsx';
import '../src/games/rpg-moba.css';

const creature = (extra = {}) => ({ id: 'test-garde', carteId: 'chien-du-guet', name: 'Chien du guet', atk: 2, def: 2, pv: 2, pvMax: 2, ready: true, ...extra });
const click = () => { document.body.dataset.clicked = 'oui'; };
createRoot(document.getElementById('root')).render(<>
  <EffetsSprite />
  <div className={`rpg-battle${window.matchMedia('(hover: none) and (pointer: coarse)').matches ? ' rpg-battle--touch' : ''}`} data-scene="duel">
    <div className="card-row" style={{ position: 'relative', padding: '30px', justifyContent: 'start', gap: '35px' }}>
      <div id="provocation"><TableCard entite={creature({ provocation: true })} cote="joueur" onClick={click} /></div>
      <div id="normal"><TableCard entite={creature()} cote="joueur" /></div>
      <div id="selection"><TableCard entite={creature({ defenseur: true })} cote="joueur" selected /></div>
      <div id="gele"><TableCard entite={creature({ defenseur: true, gelToursRestants: 1 })} cote="joueur" /></div>
    </div>
  </div>
  <div className="moba"><div className="moba__real-slot" id="moba"><TableCard entite={creature({ defenseur: true })} cote="joueur" moba={{ className: 'moba__slot', disabled: true }} /></div></div>
</>);
