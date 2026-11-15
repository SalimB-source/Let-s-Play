import React from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { installerDeckMaisonDeTest } from './rpg-duel-start.js';
const deck = ['tercio-de-cuivre', 'pilote-de-la-carreira', 'le-renegat', 'negociant-des-ranscons', 'galion-de-la-flotte', 'le-routier', 'le-grand-debarquement', 'haut-fond', 'vipere-de-verre', 'lettre-de-marque', 'grappin-d-abordage', 'baton-des-citernes', 'cotre-de-course', 'tislit-des-aures', 'mousse-des-galiotes'].flatMap((id) => [id, id]);
installerDeckMaisonDeTest(deck);
createRoot(document.getElementById('root')).render(<RpgDuelPage joueurDeck={deck} sorcierDeck={deck} rng={() => .9} />);
