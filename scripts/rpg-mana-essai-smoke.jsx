/* Parcours réel de l'essai dans jsdom : menu → mulligan → choix → carte jouée.
 * Une manche classique est couverte par les vérifications UI historiques. */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage, { FluxManaTrack } from '../src/games/RpgDuelPage.jsx';
import { RPG_MANA_ESSAI_DECKS } from '../src/games/rpgManaEssai.js';
import { RPG_BOURSE_STORAGE_KEY } from '../src/games/rpgCredits.js';
import { RPG_QUETES_STORAGE_KEY } from '../src/games/rpgQuetes.js';
import { RPG_STORY_STORAGE_KEY } from '../src/games/rpgStory.js';

export async function checkManaEssaiUi(assert) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const q = (selector) => container.querySelector(selector);
  const qa = (selector) => [...container.querySelectorAll(selector)];
  const click = async (element) => {
    assert.ok(element, 'commande présente');
    assert.equal(element.disabled, false, 'commande active');
    await act(async () => element.click());
  };
  const etatDurable = () => [RPG_BOURSE_STORAGE_KEY, RPG_QUETES_STORAGE_KEY, RPG_STORY_STORAGE_KEY]
    .map((cle) => window.localStorage.getItem(cle));
  // La présentation doit respecter les quatre couleurs et l'ordre des tours,
  // même si les trois decks prédéfinis ne proposent pas encore de Neige.
  const verifierPalette = async () => {
    const element = document.createElement('div');
    document.body.append(element);
    const vue = createRoot(element);
    const manaSources = ['eau', 'braise', 'neige', 'sable'];
    const manaMax = { eau: 1, braise: 1, neige: 1, sable: 1 };
    const mana = { eau: 0, braise: 0, neige: 1, sable: 1 };
    const orbes = () => [...element.querySelectorAll('.rpg-flux-track__slot')];
    try {
      await act(async () => vue.render(<FluxManaTrack camp={{ manaSources, manaMax, mana }} cote="joueur" />));
      assert.equal(element.querySelector('.rpg-flux-track__title'), null, 'plus de bandeau « Votre mana · acquis »');
      assert.equal(element.querySelector('.rpg-flux-track__reserve')?.textContent, '2/4', 'le compteur compact reste lisible');
      assert.equal(orbes().length, 10);
      assert.deepEqual(orbes().map((orb) => orb.dataset.manaSlot), Array.from({ length: 10 }, (_, i) => String(i + 1)));
      for (const [index, couleur] of manaSources.entries()) {
        assert.ok(orbes()[index].classList.contains(`rpg-flux-track__slot--${couleur}`), `la place ${index + 1} conserve sa couleur ${couleur}`);
        assert.ok(orbes()[index].querySelector(`svg.rpg-emblem--${couleur}`),
          `l'emblème SVG ${couleur} remplace la boule, sans dépendre des emojis`);
        assert.equal(orbes()[index].dataset.manaEtat, index < 2 ? 'depense' : 'disponible');
      }
      assert.ok(orbes().slice(4).every((orb) => orb.dataset.manaEtat === 'vide' && orb.textContent === '◇'),
        'les six places non acquises restent des losanges éteints, pas des boules');
      await act(async () => vue.render(<FluxManaTrack camp={{ manaSources, manaMax, mana: { ...manaMax } }} cote="joueur" />));
      assert.ok(orbes().slice(0, 4).every((orb) => orb.dataset.manaEtat === 'disponible'), 'recharger rallume les mêmes quatre boules');
      assert.ok(orbes().slice(4).every((orb) => orb.dataset.manaEtat === 'vide'));
    } finally {
      await act(async () => vue.unmount());
      element.remove();
    }
  };
  const revenirAuMenu = async () => click(q('.rpg-duel-nav button'));
  const demarrer = async (index) => {
    const boutons = qa('.rpg-flux-menu__decks button');
    assert.equal(boutons.length, 3, 'trois decks distincts accessibles depuis le menu');
    await click(boutons[index]);
    const partie = q('[data-scene="duel"]');
    assert.equal(partie?.getAttribute('data-mode-mana'), 'essai');
    assert.equal(q('.rpg-mulligan__cards')?.children.length, 5, 'mulligan de cinq cartes');
    assert.equal(q('.card-table')?.hasAttribute('inert'), true, 'la table attend le mulligan');
    assert.equal(q('.rpg-flux-choix'), null, 'le choix ne précède pas le mulligan');
    assert.equal(qa('.rpg-terrain').length, 0, 'aucun terrain posé');
    assert.equal(qa('.rpg-flux-track').length, 2, 'la réserve des deux camps reste affichée');
    for (const piste of qa('.rpg-flux-track')) {
      const orbes = [...piste.querySelectorAll('.rpg-flux-track__slot')];
      assert.equal(orbes.length, 10, 'les dix orbes existent dès l’ouverture');
      assert.ok(orbes.every((orb) => orb.dataset.manaEtat === 'vide'), 'avant le premier tour, elles sont toutes éteintes');
    }
    assert.equal(q('.rpg-card-piles--player .rpg-card-pile--deck b')?.textContent, '25', '30 cartes, moins la main de départ');
  };
  try {
    await verifierPalette();
    await act(async () => root.render(<RpgDuelPage rng={() => .999} />));
    const origine = etatDurable();
    assert.equal(q('.rpg-flux-menu__decks') !== null, true, 'le laboratoire est visible sans l’atelier');
    assert.deepEqual(qa('.rpg-flux-menu__decks button').map((bouton) => bouton.textContent.includes('couleur')), [true, true, true]);

    // Tricolore : le joueur garde sa main. Le premier mana est choisi après.
    await demarrer(2);
    assert.match(q('.rpg-mulligan__mana-note')?.textContent ?? '', /premier mana arrive après/);
    await click(q('.rpg-mulligan__valider'));
    assert.equal(q('.rpg-mulligan'), null, 'garder sa main ferme le volet');
    assert.equal(q('.card-table')?.hasAttribute('inert'), true, 'le choix coloré tient toujours la table');
    assert.equal(q('.rpg-flux-track--joueur')?.dataset.manaCapacite, '0');
    assert.equal(q('.rpg-flux-choix')?.getAttribute('aria-labelledby'), 'rpg-flux-choix-titre');
    assert.equal(q('#rpg-flux-choix-titre')?.textContent, 'Choisis ton mana');
    assert.equal(q('.rpg-flux-choix__backdrop'), null, 'le voile est porté par le dialogue, sans panneau supplémentaire');
    assert.equal(q('.rpg-flux-choix__panel p, .rpg-flux-choix__eyebrow'), null,
      'aucun autre texte ne précède les couleurs');
    assert.equal(q('.rpg-flux-choix__retour'), null, 'pas de bouton de retour au menu');
    assert.equal(q('.rpg-flux-choix__option strong, .rpg-flux-choix__option small'), null,
      'pas de nom visible ni de compteur acquis dans les ronds');
    assert.deepEqual(qa('.rpg-flux-choix__option').map((bouton) => bouton.getAttribute('aria-label')),
      ['Choisir le mana Sable', 'Choisir le mana Braise', 'Choisir le mana Eau']);
    for (const couleur of ['sable', 'braise', 'eau']) {
      assert.ok(q(`.rpg-flux-choix__option--${couleur} svg.rpg-emblem--${couleur}`),
        `le choix ${couleur} affiche son emblème sans emoji`);
    }
    await click(q('.rpg-flux-choix__option--eau'));
    assert.equal(q('.rpg-flux-choix'), null);
    assert.equal(q('.card-table')?.hasAttribute('inert'), false);
    assert.equal(q('.rpg-flux-track--joueur')?.dataset.manaDisponible, '1');
    assert.equal(q('.rpg-flux-track--joueur')?.dataset.manaCapacite, '1');
    assert.equal(q('.rpg-flux-track--joueur .rpg-flux-track__reserve')?.textContent, '1/1');
    assert.equal(q('.rpg-flux-track--ennemi')?.dataset.manaCapacite, '0');
    assert.equal(q('.rpg-flux-track--joueur .rpg-flux-track__slot:first-child')?.dataset.manaEtat, 'disponible');
    assert.ok(q('.rpg-flux-track--joueur .rpg-flux-track__slot:first-child svg.rpg-emblem--eau'));
    assert.ok(q('.rpg-flux-track--joueur .rpg-flux-track__slot:first-child')?.classList.contains('rpg-flux-track__slot--eau'));
    assert.equal(qa('.rpg-flux-track--joueur .rpg-flux-track__slot.is-empty').length, 9, 'neuf boules attendent les prochains tours');
    assert.deepEqual(etatDurable(), origine, 'choisir du mana ne change ni économie ni histoire');

    // Bicolore : l'étape de résultat du mulligan doit être fermée d'abord.
    await revenirAuMenu();
    await demarrer(1);
    await click(q('.rpg-mulligan__card[data-mulligan-index="0"]'));
    await click(q('.rpg-mulligan__valider'));
    assert.equal(q('.rpg-mulligan--resultat') !== null, true, 'l’échange montre la nouvelle main');
    assert.equal(q('.rpg-flux-choix'), null, 'pas de mana sous le résultat du mulligan');
    await click(q('.rpg-mulligan__commencer'));
    assert.equal(qa('.rpg-flux-choix__option').length, 2);
    await click(q('.rpg-flux-choix__option--braise'));
    const ashigaru = q('.rpg-hand__card[data-card-id="ashigaru-des-braises"]');
    assert.ok(ashigaru, 'une créature à 1 Braise est restée en main');
    assert.equal(ashigaru.dataset.jouable, 'true', 'le mana Braise peut la payer');
    await click(ashigaru);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 850)); });
    assert.equal(q('.rpg-flux-track--joueur')?.dataset.manaDisponible, '0', 'la carte dépense le nouveau mana');
    assert.equal(q('.rpg-flux-track--joueur')?.dataset.manaCapacite, '1', 'la source permanente reste acquise');
    const orbeDepensee = q('.rpg-flux-track--joueur .rpg-flux-track__slot:first-child');
    assert.equal(orbeDepensee?.dataset.manaEtat, 'depense', 'l’icône s’assombrit après paiement');
    assert.ok(orbeDepensee?.querySelector('svg.rpg-emblem--braise'), 'la flamme reste visible même dépensée');
    assert.ok(orbeDepensee?.classList.contains('rpg-flux-track__slot--braise'), 'elle garde sa couleur Braise');
    assert.equal(qa('.rpg-flux-track--joueur .rpg-flux-track__slot.is-empty').length, 9);
    assert.deepEqual(etatDurable(), origine, 'jouer une carte ne progresse ni les quêtes ni la bourse');

    // Mono : l'attribution du premier mana est automatique après le mulligan.
    await revenirAuMenu();
    await demarrer(0);
    await click(q('.rpg-mulligan__valider'));
    assert.equal(q('.rpg-flux-choix'), null, 'pas de dialogue de choix en mono-couleur');
    assert.equal(q('.rpg-flux-track--joueur')?.dataset.manaDisponible, '1');
    assert.equal(q('.rpg-flux-track--joueur .rpg-flux-track__slot:first-child')?.dataset.manaEtat, 'disponible');
    assert.ok(q('.rpg-flux-track--joueur .rpg-flux-track__slot:first-child svg.rpg-emblem--sable'));
    assert.ok(q('.rpg-flux-track--joueur .rpg-flux-track__slot:first-child')?.classList.contains('rpg-flux-track__slot--sable'));
    assert.equal(qa('.rpg-flux-track--joueur .rpg-flux-track__slot.is-empty').length, 9);
    assert.equal(q('.card-table')?.hasAttribute('inert'), false);
    assert.deepEqual(etatDurable(), origine);
    assert.equal(RPG_MANA_ESSAI_DECKS.length, 3);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
}
