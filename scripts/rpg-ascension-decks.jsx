// Menu réel et préconstruits réels : aucune main ni partie préparée.
// Cette entrée n'est servie que par le serveur local de démonstration.
import React from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage, { RPG_RENDU_MOBA } from '../src/games/RpgDuelPage.jsx';
import RpgMobaBoard from '../src/games/RpgMobaBoard.jsx';

const mode = new URLSearchParams(location.search).get('mode') === 'moba' ? 'moba' : 'duel';
window.__ASCENSION_DECKS_MENU__ = true;
window.localStorage.setItem('letsplay_sablier_anim_reduite_v1', 'on');
window.localStorage.setItem('letsplay_sablier_sound_v1', 'off');
createRoot(document.getElementById('root')).render(<>
  {mode === 'duel' ? <RpgDuelPage />
    : <div className="rpg-battle rpg-battle--moba is-immersive is-reduced" data-scene="moba"><RpgMobaBoard rendu={RPG_RENDU_MOBA} sonActif={false} onQuitter={() => location.assign('/decks?mode=moba')} /></div>}
  <nav className="ascension-demo-tools" aria-label="Préconstruits Ascension">
    <span>Decks réels · 30 cartes + réserve</span>
    <a href="/decks?mode=duel" aria-current={mode === 'duel' ? 'page' : undefined}>Decks Duel</a>
    <a href="/decks?mode=moba" aria-current={mode === 'moba' ? 'page' : undefined}>Decks MOBA</a>
    <a href={`/?mode=${mode}`}>Démo des Ascensions</a>
  </nav>
</>);
