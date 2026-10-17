// Les médaillons de coût de l'atelier sur les vraies cartes, en grille et dans
// le deck en cours. Le duel, le catalogue, la table et le guide ont leurs
// scénarios dédiés (battle-ui, stacks et tutorial-flow).
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { RpgDeckAtelier } from '../src/games/RpgDeckAtelier.jsx';
import { cardHybridGradient } from '../src/games/rpgCards.js';

export async function checkRpgHybridCostAtelier(assert) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const cout = (section, id) => container.querySelector(`${section}[data-card-id="${id}"] .rpg-atelier__cout`);
  try {
    await act(async () => {
      root.render(<RpgDeckAtelier
        cardIdsInitiaux={['djinn-de-foudre', 'vent-rouge', 'chien-du-guet']}
        collection={['djinn-de-foudre', 'vent-rouge', 'chien-du-guet']}
      />);
    });
    for (const [id, valeur] of [['djinn-de-foudre', '2'], ['vent-rouge', '3']]) {
      const degrade = cardHybridGradient(id);
      for (const section of ['.rpg-atelier__carte', '.rpg-atelier__ligne']) {
        const badge = cout(section, id);
        assert.ok(badge?.classList.contains('rpg-atelier__cout--hybride'),
          `${id} porte son disque bicolore dans ${section}`);
        assert.equal(badge.style.getPropertyValue('--rpg-hybrid-cost-bg'), degrade,
          `${id} garde l'ordre de ses couleurs dans ${section}`);
        assert.equal(badge.querySelector('b')?.textContent, valeur,
          `${id} garde son coût numérique dans ${section}`);
        assert.equal(badge.querySelectorAll('.rpg-atelier__pip').length, 2,
          `${id} garde ses pips colorés dans ${section}`);
      }
    }
    assert.equal(cout('.rpg-atelier__carte', 'chien-du-guet')?.classList.contains('rpg-atelier__cout--hybride'), false,
      'une créature mono garde le médaillon ordinaire');
    assert.equal(cout('.rpg-atelier__carte', 'petra'), null,
      'un terrain hybride ne reçoit pas de coût imprimé');
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
}
