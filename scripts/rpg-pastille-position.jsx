import React from 'react';
import { createRoot } from 'react-dom/client';
import { PastilleEffet } from '../src/games/effetIcons.jsx';
import { effetsDetailles } from '../src/games/effetIcons.js';
import { cardById } from '../src/games/rpgCards.js';
import '../src/games/effet-icons.css';

createRoot(document.getElementById('root')).render(
  <div id="defilement" style={{ position: 'absolute', top: 20, left: 20, width: 350, height: 230, overflow: 'auto' }}>
    <div style={{ height: 600, paddingTop: 170, boxSizing: 'border-box' }}>
      <PastilleEffet pastille={{ cle: 'test', label: 'Effet', description: 'Une règle complète à lire sur la fiche, sans perdre de détail même lorsque la fenêtre est petite.' }} />
      <PastilleEffet pastille={effetsDetailles(cardById('lettre-de-marque')).pastilles.find((p) => p.cle === 'abordage')} />
    </div>
  </div>,
);
