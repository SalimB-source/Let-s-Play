// Les cartes à résonance et à aura, rendues dans jsdom. Seule la carte qui
// imprime l'effet porte le calque ; celle qui ne fait que recevoir le bonus
// n'affiche rien. Rendu réel de `TableCard`, puis lectures du source et de la
// feuille de style.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RpgDuelPage, { TableCard } from '../src/games/RpgDuelPage.jsx';
import { RPG_DUEL_CARDS } from '../src/games/rpgCards.js';

void RpgDuelPage;

const carteRendue = (carteId, entite = {}) => {
  const html = renderToStaticMarkup(
    <TableCard
      entite={{
        id: 'entite-de-test', carteId, name: 'Créature de test', atk: 3, pv: 3, pvMax: 3, armes: [], ...entite,
      }}
      cote="joueur"
      tilt={0}
    />,
  );
  // Le rendu statique n'a pas de `document` : on relit le balisage par un DOM.
  return html;
};

export function rendreCartes() {
  const source = RPG_DUEL_CARDS.find((carte) => carte.id === 'samourai-du-torii');
  const neutre = RPG_DUEL_CARDS.find((carte) => carte.id === 'fennec-des-decombres');
  return {
    // Les cartes qui impriment une aura portent le même sonar, en jaune ; la
    // créature qui reçoit l'aura n'en projette rien.
    aura: {
      carte: RPG_DUEL_CARDS.find((carte) => carte.id === 'kenshi-de-la-forge'),
      html: carteRendue('kenshi-de-la-forge'),
    },
    auraNeutre: {
      // Le Fennec n'imprime ni aura ni résonance : lui compter une aura reçue
      // ne doit rien allumer.
      carte: RPG_DUEL_CARDS.find((carte) => carte.id === 'fennec-des-decombres'),
      html: carteRendue('fennec-des-decombres', { aura: 2, auraParGroupe: { sable: 2 } }),
    },
    // La Malédiction porte exactement le même sonar, en violet ; la créature
    // maudite (son `maledictionBonus` à -2) ne projette rien — seule la source
    // rayonne.
    malediction: {
      carte: RPG_DUEL_CARDS.find((carte) => carte.id === 'la-barbe-noire'),
      html: carteRendue('la-barbe-noire'),
    },
    maledictionNeutre: {
      carte: RPG_DUEL_CARDS.find((carte) => carte.id === 'fennec-des-decombres'),
      html: carteRendue('fennec-des-decombres', { maledictionBonus: -2 }),
    },
    source: { carte: source, html: carteRendue('samourai-du-torii') },
    corbeau: {
      carte: RPG_DUEL_CARDS.find((carte) => carte.id === 'valkyrie-au-corbeau'),
      html: carteRendue('valkyrie-au-corbeau'),
    },
    glaces: {
      carte: RPG_DUEL_CARDS.find((carte) => carte.id === 'valkyrie-des-glaces'),
      html: carteRendue('valkyrie-des-glaces'),
    },
    // Le bonus reçu est recalculé par le moteur sur TOUTES les créatures de la
    // famille : `entite.resonance` vaut 1 ici, et pourtant l'aura reste éteinte.
    neutre: {
      carte: neutre,
      html: carteRendue('fennec-des-decombres', { resonance: 1, resonanceParGroupe: { samourai: 1 } }),
    },
  };
}
