import React from 'react';
import { createRoot } from 'react-dom/client';
import RpgCadreCarte from '../src/games/RpgCadreCarte.jsx';
import '../src/games/rpg-bouclier.css';
import { HoverCardPreview, TableCard, RPG_RENDU_MOBA } from '../src/games/RpgDuelPage.jsx';
import { cardById } from '../src/games/rpgCards.js';
import { EffetsSprite } from '../src/games/effetIcons.jsx';

const cartes = [
  ['magie', 'magie', 'appel-des-marees.jpg'],
  ['arme', 'arme', 'sabre-maudit.jpg'],
  ['creature', 'creature', 'amani-des-ksour.jpg'],
  ['hero', 'hero', 'amani-des-ksour.jpg'],
  ['defenseur', 'creature', 'amani-des-ksour.jpg'],
  ['site', 'site', 'source-de-bimini.jpg'],
  ['terrain', 'terrain', 'amani-des-ksour.jpg'],
  ['ascension', 'creature', 'samourai-du-dragon-rouge.jpg'],
  // Les échantillons couleur utilisent des types qui gardent leur cadre.
  ...['braise', 'eau', 'sable', 'neige', 'tenebres', 'hybride'].map(id => [id, 'magie', 'amani-des-ksour.jpg']),
];
function App() {
  return <main className="cartes-test">{cartes.map(([id, kind, fichier]) => <button
    key={id} id={id} type="button" className={`face-test${id === 'defenseur' ? ' rpg-carte-bouclier' : ''}`}
    onClick={() => { document.body.dataset.carteCliquee = id; }}
  >
    <img src={`${import.meta.env.BASE_URL}cards/${fichier}`} alt="" />
    <RpgCadreCarte carte={id === 'ascension' ? cardById('samourai-du-dragon-rouge') : { kind, element: id, ...(id === 'hybride' ? { colors: ['eau', 'braise'] } : {}) }} />
    <span className="icone-test" aria-hidden="true">✦</span>
  </button>)}</main>;
}
const parametres = new URLSearchParams(window.location.search);
const carteReelle = parametres.get('apercu');
const tableReelle = parametres.get('table');
const pileReelle = parametres.get('pile');
const sortReel = parametres.get('sort');
const entite = (id) => ({ id: `test-${id}`, carteId: id, name: cardById(id)?.name, atk: 2, def: 3, pv: 3, pvMax: 3, armes: [], ready: true });
const contenu = pileReelle
  ? <div className={`rpg-battle${parametres.has('touch') ? ' rpg-battle--touch' : ''}`}><RPG_RENDU_MOBA.CardPile count={1} label="Cimetière" variant="graveyard" topCard={pileReelle} onClick={() => { document.body.dataset.pileCliquee = 'oui'; }} onHoverCard={(carte) => { document.body.dataset.pileSurvolee = carte.id; }} /></div>
  : sortReel
    ? <div className={`rpg-battle${parametres.has('touch') ? ' rpg-battle--touch' : ''}`}><RPG_RENDU_MOBA.SpellAnnouncement annonce={{ carteId: sortReel, cible: { nom: 'Cible' } }} camp={parametres.get('camp') || 'joueur'} /></div>
    : carteReelle
  ? <div className="rpg-battle" data-scene="duel"><EffetsSprite /><HoverCardPreview carte={cardById(carteReelle)} variante="annonce" style={{ left: 30, top: 15 }} /></div>
  : tableReelle
    ? <div className="rpg-battle" data-scene="duel"><EffetsSprite /><div className="card-row" style={{ padding: 30 }}><TableCard entite={entite(tableReelle)} cote="joueur" /></div></div>
    : <App />;
createRoot(document.getElementById('root')).render(contenu);
