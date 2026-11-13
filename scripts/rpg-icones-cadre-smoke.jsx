// Scènes de géométrie réelles pour le contrôle Chromium, sans lancer un duel.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/games/rpg-battle.css';
import '../src/games/rpg-mobile.css';
import '../src/games/rpg-mana-essai.css';
import { IconesCarte, EffetsSprite } from '../src/games/effetIcons.jsx';
import '../src/games/rpg-moba.css';

const quatre = { envol: true, infiltration: true, volDeVie: true, rapidite: true };
const beaucoup = { ...quatre, coupRapide: true, provocation: true, defenseur: true, esquive: true, protection: { contre: ['eau', 'braise'] } };
const style = (width, height) => ({ position: 'relative', display: 'block', width, height, minHeight: 0, flex: 'none', padding: 0, border: '2px solid black', boxSizing: 'border-box', transform: 'none' });
function App() {
  const [carte, setCarte] = useState(quatre);
  window.changerEffets = (nombre) => setCarte(nombre === 1 ? { envol: true } : nombre === 10 ? beaucoup : quatre);
  return <><EffetsSprite /><div className={`rpg-battle${window.matchMedia('(hover: none) and (pointer: coarse)').matches ? ' rpg-battle--touch' : ''}`} data-scene="duel">
    <div className="card-row" style={{ position: 'relative', display: 'block', width: 350, height: 75 }}>
      <button id="posee" className="rpg-card rpg-card--img" style={style(48, 60)}><IconesCarte carte={carte} className="rpg-card-icones--colonne" /></button>
      <button id="activation" className="rpg-card rpg-card--img" style={{ ...style(48, 60), position: 'absolute', left: 80, top: 0 }}><IconesCarte carte={quatre} className="rpg-card-icones--colonne rpg-card-icones--sous-activation" /></button>
    </div>
    <div className="rpg-hand"><button id="main" className="rpg-hand__card rpg-hand__card--img" style={style(44, 55)}><IconesCarte carte={quatre} className="rpg-card-icones--colonne rpg-card-icones--main" /></button></div>
    <div id="apercu" className="rpg-hover-card-preview__face" style={style(150, 188)}><IconesCarte carte={beaucoup} className="rpg-card-icones--colonne rpg-card-icones--apercu" /></div>
    <div id="catalogue" className="rpg-card-catalogue__art" style={style(80, 100)}><IconesCarte carte={beaucoup} className="rpg-card-icones--colonne rpg-card-icones--catalogue" /></div>
  </div>
  <div className="rpg-battle rpg-battle--moba"><div className="moba"><div className="moba__slots"><div className="moba__real-slot"><button id="moba" className="rpg-card rpg-card--img" style={style(48, 60)}><IconesCarte carte={beaucoup} className="rpg-card-icones--colonne" /></button></div></div>
    <div className="moba__mulligan-overlay"><div id="mulligan" className="moba__mulligan-item" style={style(48, 60)}><button className="rpg-mulligan__card" style={style(48, 60)} /><IconesCarte carte={beaucoup} className="rpg-card-icones--colonne rpg-card-icones--mulligan-moba" /></div></div>
  </div></div></>;
}
createRoot(document.getElementById('root')).render(<App />);
