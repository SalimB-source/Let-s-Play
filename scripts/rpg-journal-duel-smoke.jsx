// Rendu réel de l'onglet du journal du duel : fermé, ouvert, refermé, relu.
// Le composant `CombatFeed` ne demande aucune partie : il reçoit ses faits en
// propriété, exactement comme la table les reçoit du moteur (`duel.combatFeed`).
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { CombatFeed } from '../src/games/RpgDuelPage.jsx';

const evenements = [
  {
    id: 'corsaire:12',
    type: 'death',
    victim: { id: 'v-tercio', name: 'Tercio de cuivre', carteId: 'tercio-de-cuivre' },
    killers: [{ id: 'k-sonneur', name: 'Sonneur fêlé', carteId: 'sonneur-fele' }],
  },
  {
    id: 'corsaire:13',
    type: 'hit',
    amount: 2,
    victim: { id: 'v-corsaire', name: 'Corsaire', carteId: 'corsaire' },
    killers: [{ id: 'k-corsaire', name: 'Corsaire', carteId: 'corsaire' }],
  },
];
const priseEnCale = {
  id: 'galion:14',
  type: 'prise',
  victim: { id: 'v-galion', name: 'Galion', carteId: 'galion' },
  killers: [{ id: 'k-abordeur', name: 'Abordeur', carteId: 'abordeur' }],
};

export async function rendreJournal() {
  const conteneur = document.createElement('div');
  document.body.appendChild(conteneur);
  const racine = createRoot(conteneur);

  const rendre = async (events) => {
    await act(async () => {
      racine.render(<CombatFeed events={events} />);
    });
  };
  const cliquer = async (selecteur) => {
    const bouton = conteneur.querySelector(selecteur);
    await act(async () => { bouton.click(); });
  };
  const etat = () => {
    const bouton = conteneur.querySelector('.rpg-combat-feed__toggle');
    const panneau = conteneur.querySelector('.rpg-combat-feed__panel');
    const badge = conteneur.querySelector('.rpg-combat-feed__badge');
    return {
      bouton: bouton
        ? {
          exists: true,
          expanded: bouton.getAttribute('aria-expanded'),
          label: bouton.getAttribute('aria-label'),
          controls: bouton.getAttribute('aria-controls'),
          title: bouton.getAttribute('title'),
        }
        : { exists: false },
      panneau: panneau
        ? {
          hidden: panneau.hidden,
          id: panneau.id,
          lignes: panneau.querySelectorAll('.rpg-combat-feed__event').length,
        }
        : null,
      badge: badge ? badge.textContent : null,
      texte: conteneur.textContent,
    };
  };

  await rendre(evenements);
  const ferme = etat();
  await cliquer('.rpg-combat-feed__toggle');
  const ouvert = etat();
  await cliquer('.rpg-combat-feed__toggle');
  const referme = etat();
  // Un toucher ailleurs sur la table referme le panneau, comme une infobulle.
  await cliquer('.rpg-combat-feed__toggle');
  await act(async () => {
    document.body.dispatchEvent(new window.Event('pointerdown', { bubbles: true }));
  });
  const hors = etat();
  // Échap aussi.
  await cliquer('.rpg-combat-feed__toggle');
  await act(async () => {
    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });
  const echap = etat();
  // Un fait nouveau arrive après lecture : seul lui rallume le badge.
  await rendre([...evenements, priseEnCale]);
  const nouveau = etat();
  // Deux sources et une prise sans source : leurs noms et issues restent
  // présents, même lorsque l'interface les dispose sur plusieurs lignes.
  await rendre([
    { ...evenements[0], id: 'double', killers: [evenements[0].killers[0], evenements[1].killers[0]] },
    { ...priseEnCale, id: 'sans-source', killers: [] },
    evenements[1],
  ]);
  await cliquer('.rpg-combat-feed__toggle');
  const lignes = [...conteneur.querySelectorAll('.rpg-combat-feed__event')];
  const lisibilite = lignes.map((ligne) => ({
    texte: ligne.textContent,
    issue: ligne.querySelector('[role="img"]')?.getAttribute('aria-label'),
    icone: Boolean(ligne.querySelector('.rpg-combat-feed__skull svg')),
    sources: ligne.querySelectorAll('.rpg-combat-feed__card:not(.rpg-combat-feed__card--victim)').length,
  }));
  // Sans fait à raconter, le journal n'existe pas : la table reste nue.
  await rendre([]);
  const vide = etat();

  await act(async () => { racine.unmount(); });
  conteneur.remove();
  return { ferme, ouvert, referme, hors, echap, nouveau, lisibilite, vide };
}
