// Scène React réelle, sans partie réseau, pour mesurer l'annonce et ses commandes.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HoverCardPreview } from '../src/games/RpgDuelPage.jsx';
import { cardById } from '../src/games/rpgCards.js';

function App() {
  const [longue, setLongue] = useState(false);
  const [carteId, setCarteId] = useState('trait-de-braise');
  const [choix, setChoix] = useState('');
  window.annonceLongue = setLongue;
  window.annonceCarte = setCarteId;
  const carte = cardById(carteId);
  const texteLong = Array(12).fill('Inflige 2 dégâts à une créature ciblée.').join(' ');
  return <div className={`rpg-battle${window.matchMedia('(pointer: coarse)').matches ? ' rpg-battle--touch' : ''}`} data-scene="duel">
    <section className="rpg-annonce-sort rpg-annonce-sort--magie" aria-label="Annonce de sort">
      <div className="rpg-annonce-sort__panel">
        <HoverCardPreview carte={longue ? { ...carte, text: texteLong } : carte} variante="annonce"
          cible={{ nom: 'Créature ciblée', illustrationId: 'ashigaru-des-braises' }}
          controls={<div className="rpg-annonce-sort__controls">
            <button className="rpg-btn rpg-annonce-sort__respond" onClick={() => setChoix('répondre')}>Répondre</button>
            <button className="rpg-btn rpg-annonce-sort__pass" onClick={() => setChoix('passer')}>Laisser passer</button>
          </div>} />
      </div>
    </section>
    <output id="choix">{choix}</output>
  </div>;
}
createRoot(document.getElementById('root')).render(<App />);
