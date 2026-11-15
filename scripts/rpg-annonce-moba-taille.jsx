// Même structure que les deux annonces MOBA ; le rendu partagé est le vrai composant de duel.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HoverCardPreview } from '../src/games/RpgDuelPage.jsx';
import { cardById } from '../src/games/rpgCards.js';
import { cardArt } from '../src/games/rpgCardArt.js';

function App() {
  const [longue, setLongue] = useState(false);
  const [choix, setChoix] = useState('');
  window.annonceLongue = setLongue;
  const autonome = new URLSearchParams(location.search).has('autonome');
  const carte = cardById('le-grand-debarquement');
  const texte = longue ? Array(40).fill('Inflige 2 dégâts à une créature ciblée.').join(' ') : carte.text;
  const commandes = <div className="rpg-annonce-sort__controls">
    <button type="button" className="rpg-btn rpg-annonce-sort__respond" onClick={() => setChoix('répondre')}>Répondre</button>
    <button type="button" className="rpg-btn rpg-annonce-sort__pass" onClick={() => setChoix('passer')}>Laisser passer</button>
  </div>;
  return <div className="rpg-battle rpg-battle--moba" data-scene="moba"><div className="moba">
    <section className="rpg-annonce-sort moba__card-announcement rpg-annonce-sort--magie" role="dialog" aria-modal="true" aria-label={`L’IA annonce ${carte.name}`}>
      <div className="rpg-annonce-sort__panel">
        {autonome ? <div className="moba__announcement-fallback"><img src={cardArt(carte)} alt="" /><div role="region" aria-label="Détails de la carte annoncée" tabIndex={0}>
          <small>CARTE ANNONCÉE</small><strong>{carte.name}</strong><p>{texte}</p><p>⌖ Toutes les créatures du sorcier</p>{commandes}
        </div></div> : <HoverCardPreview carte={{ ...carte, text: texte }} cible={{ nom: 'Toutes les créatures du sorcier' }} variante="annonce" controls={commandes} />}
      </div>
    </section><output id="choix">{choix}</output>
  </div></div>;
}
createRoot(document.getElementById('root')).render(<App />);
