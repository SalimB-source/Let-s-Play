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
  const hand = (id) => container.querySelector(`.rpg-hand__card[data-card-id="${id}"]`);
  const handCards = () => [...container.querySelectorAll('.rpg-hand__card')];
  const terrain = () => container.querySelector('.rpg-terrain--joueur');
  const terrainsJoueurs = () => container.querySelectorAll('.rpg-terrain--joueur');
  const confirmDialog = () => container.querySelector('.rpg-spell-confirm[role="dialog"]');
  const confirmButton = (label) => [...(confirmDialog()?.querySelectorAll('button') ?? [])].find((b) => b.textContent === label);
  const fennec = () => container.querySelector('.rpg-card--equipe[data-card-id="fennec-des-decombres"]');
  try {
    await act(async () => root.render(<RpgDuelPage
      joueurDeck={['desert', 'desert', 'desert', 'desert', 'desert', 'rapport-du-greffier', 'fennec-des-decombres', 'desert', 'chien-du-guet', 'desert']}
      sorcierDeck={Array(15).fill('desert')} rng={() => .999}
    />));
    await click(container.querySelector('.rpg-menu-button--primary'));
    assert.ok(container.querySelector('.rpg-battle--touch'));

    // ── Cliquer une carte non jouable explique le refus, sans rien lancer ──
    await click(hand('fennec-des-decombres'));
    assert.ok(container.textContent.includes('Mana insuffisant pour Fennec des décombres'),
      'cliquer une créature non payable affiche l’explication du refus');
    assert.ok(hand('fennec-des-decombres'), 'la créature non payable reste en main');
    assert.equal(terrainsJoueurs().length, 0, 'aucune carte n’est posée');
    assert.equal(confirmDialog(), null, 'aucune boîte de confirmation pour une créature');

    // ── Cliquer un terrain le pose immédiatement ; limite à un par tour ────
    await click(hand('desert'));
    assert.equal(terrainsJoueurs().length, 1, 'le clic pose le terrain sur la table');
    await click(hand('desert'));
    assert.ok(container.textContent.includes('déjà posé votre terrain ce tour'),
      'le second terrain du tour est refusé avec une explication');
    assert.equal(terrainsJoueurs().length, 1, 'le terrain refusé reste en main');
    assert.equal(confirmDialog(), null, 'la limite de terrain ne demande pas de confirmation');

    // ── Une seule étape d’annulation restaure le terrain posé ──────────────
    await click(container.querySelector('.rpg-actions__turn .rpg-btn--undo'));
    assert.equal(terrainsJoueurs().length, 0, 'l’annulation retire le terrain posé');

    // ── Les magies demandent confirmation avant le lancement ──────────────
    await click(hand('desert'));
    const mainAvantSort = handCards().length;
    await click(hand('rapport-du-greffier'));
    assert.ok(confirmDialog(), 'cliquer une magie ouvre la confirmation de lancement');
    assert.ok(confirmDialog().textContent.includes('Lancer Rapport du greffier ?'),
      'la confirmation nomme le sort à lancer');
    assert.equal(confirmDialog().querySelectorAll('.rpg-spell-confirm__rules > span').length, 1,
      'la confirmation montre les effets du sort, un par ligne');
    await click(confirmButton('Annuler'));
    assert.equal(confirmDialog(), null, 'Annuler ferme la confirmation');
    assert.equal(handCards().length, mainAvantSort, 'le sort annulé reste en main');
    await click(hand('rapport-du-greffier'));
    await click(confirmButton('Lancer le sort'));
    assert.equal(confirmDialog(), null, 'confirmer ferme la boîte de lancement');
    assert.equal(handCards().length, mainAvantSort + 1,
      'le sort se lance : il quitte la main et pioche deux cartes');

    // ── Le tour suivant empile le second terrain, la créature se paie seule ─
    await click(container.querySelector('.rpg-btn--endturn'));
    await act(async () => new Promise(resolve => setTimeout(resolve, 800)));
    await click(hand('desert'));
    assert.equal(terrainsJoueurs().length, 1, 'deux terrains identiques forment une pile');
    assert.equal(terrain().dataset.terrainCount, '2');
    await click(hand('fennec-des-decombres'));
    assert.ok(fennec(), 'cliquer une créature payable la pose sur la table');
    assert.equal(terrain().dataset.availableCount, '0',
      'le paiement automatique engage les deux instances, pas seulement la carte affichée');

    // ── La sélection d’attaque est directe, avec annulation et confirmation ─
    await click(container.querySelector('.rpg-btn--attaque-tous'));
    assert.equal(container.querySelectorAll('.rpg-card--equipe.is-selected').length, 1,
      'attaque en masse : les créatures prêtes sont sélectionnées depuis la table');
    assert.equal(container.querySelector('.rpg-phase-step.is-active')?.dataset.phase, 'combat');
    assert.equal(container.querySelector('.rpg-btn--endturn').disabled, true);
    await click(container.querySelector('.rpg-btn--cancel-attack'));
    assert.equal(container.querySelectorAll('.rpg-card--equipe.is-selected').length, 0);
    assert.equal(container.querySelector('.rpg-phase-step.is-active')?.dataset.phase, 'principal');
    assert.equal(container.querySelector('.rpg-btn--endturn').disabled, false);

    await click(fennec());
    assert.equal(fennec().classList.contains('is-selected'), true,
      'cliquer la créature la déclare attaquante directement');
    assert.equal(fennec().dataset.combatTilted, 'true');
    await click(fennec());
    assert.equal(fennec().classList.contains('is-selected'), false,
      'recliquer la retire de l’attaque');
    await click(fennec());
    assert.equal(fennec().classList.contains('is-selected'), true);
    await click(container.querySelector('.rpg-btn--confirmer-attaque'));
    assert.equal(fennec().classList.contains('is-attacked'), true,
      'la confirmation résout l’attaque sans bloqueur');
    assert.equal(fennec().dataset.combatTilted, 'true');

    // ── Les gardes de cartes engagées restent actives sans aperçu ──────────
    await click(fennec());
    assert.equal(fennec().classList.contains('is-selected'), false,
      'une créature engagée ne peut pas attaquer deux fois');
    assert.ok(container.textContent.includes('a déjà attaqué ce tour'),
      'le clic sur la créature engagée explique qu’elle a déjà attaqué');
    const comptes = { available: terrain().dataset.availableCount, tapped: terrain().dataset.tappedCount };
    await click(terrain());
    assert.deepEqual(
      { available: terrain().dataset.availableCount, tapped: terrain().dataset.tappedCount }, comptes,
      'cliquer un terrain engagé ne produit pas de mana');
  } finally {
    await act(async () => root.unmount());
    container.remove();
    window.matchMedia = originalMatchMedia;
  }
}
