import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';

export async function checkRpgPreviewActions(assert) {
  const originalMatchMedia = window.matchMedia;
  // Landscape touch device; reduced motion makes card plays synchronous.
  window.matchMedia = () => ({ matches: true });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const click = async (element) => { assert.ok(element, 'action exists'); await act(async () => element.click()); };
  const action = (label) => [...container.querySelectorAll('.rpg-card-preview__actions button')].find(b => b.textContent === label);
  const hand = (id) => container.querySelector(`.rpg-hand__card[data-card-id="${id}"]`);
  const play = async (id) => {
    await click(hand(id));
    assert.equal(action('Jouer la carte').disabled, false);
    await click(action('Jouer la carte'));
    assert.equal(container.querySelector('.rpg-card-preview'), null);
  };
  try {
    await act(async () => root.render(<RpgDuelPage
      joueurDeck={['desert', 'desert', 'desert', 'desert', 'desert', 'fennec-des-decombres', 'chien-du-guet', 'desert', 'desert', 'desert']}
      sorcierDeck={Array(15).fill('desert')} rng={() => .999}
    />));
    await click(container.querySelector('.rpg-menu-button--primary'));
    assert.ok(container.querySelector('.rpg-battle--touch'));
    await click(hand('fennec-des-decombres'));
    assert.equal(container.querySelector('.rpg-card-preview__visual .rpg-card-preview__stats')?.getAttribute('aria-label'), 'Attaque 3, défense 1');
    assert.equal(container.querySelector('.rpg-card-preview__details .rpg-card-preview__stats'), null, 'stats stay with the card, not the text panel');
    assert.equal(action('Jouer la carte').disabled, true, 'unpayable creature is inspectable but cannot be played');
    await click(action('Retour au plateau'));
    await play('desert');
    await click(hand('desert'));
    assert.equal(action('Jouer la carte').disabled, true, 'second terrain is forbidden');
    assert.equal(action('Annuler la dernière action'), undefined, 'undo is not a card action');
    await click(action('Retour au plateau'));
    await click(container.querySelector('.rpg-actions__turn .rpg-btn--undo'));
    assert.equal(container.querySelectorAll('.rpg-terrain--joueur').length, 0);
    await play('desert');
    await click(container.querySelector('.rpg-btn--endturn'));
    await act(async () => new Promise(resolve => setTimeout(resolve, 800)));
    await play('desert');
    await play('fennec-des-decombres');
    await click(container.querySelector('.rpg-btn--attaque-tous'));
    assert.equal(container.querySelectorAll('.rpg-card--equipe.is-selected').length, 1, 'attack-all selects ready creatures from the board');
    assert.equal(container.querySelector('.rpg-phase-step.is-active')?.dataset.phase, 'combat');
    assert.equal(container.querySelector('.rpg-btn--endturn').disabled, true);
    await click(container.querySelector('.rpg-btn--cancel-attack'));
    assert.equal(container.querySelectorAll('.rpg-card--equipe.is-selected').length, 0);
    assert.equal(container.querySelector('.rpg-phase-step.is-active')?.dataset.phase, 'principal');
    assert.equal(container.querySelector('.rpg-btn--endturn').disabled, false);
    const fennec = () => container.querySelector('.rpg-card--equipe[data-card-id="fennec-des-decombres"]');
    await click(fennec());
    assert.equal(fennec().classList.contains('is-selected'), false, 'inspecting does not declare an attack');
    await click(action('Attaquer avec cette créature'));
    assert.equal(fennec().classList.contains('is-selected'), true);
    assert.equal(action('Confirmer l’attaque (1)').disabled, false);
    await click(action('Annuler l’attaque'));
    assert.equal(fennec().classList.contains('is-selected'), false);
    await click(fennec());
    await click(action('Attaquer avec cette créature'));
    await click(action('Confirmer l’attaque (1)'));
    assert.equal(container.querySelector('.rpg-card-preview'), null);
    assert.equal(fennec().classList.contains('is-attacked'), true, 'confirmation resolves the unblocked attack');
    await click(fennec());
    assert.equal(action('Attaquer avec cette créature').disabled, true, 'a spent creature cannot attack twice');
    await click(action('Retour au plateau'));
    await click(container.querySelector('.rpg-terrain--joueur'));
    assert.ok(container.querySelector('.rpg-card-preview--terrain'), 'terrain taps also open a preview');
    assert.ok([...container.querySelectorAll('.rpg-card-preview__actions button')].some(b => b.textContent.includes('Produire du mana') && b.disabled), 'spent terrain production is disabled');
  } finally {
    await act(async () => root.unmount());
    container.remove();
    window.matchMedia = originalMatchMedia;
  }
}
