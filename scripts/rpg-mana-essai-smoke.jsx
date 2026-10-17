/* Parcours réel de l'essai dans jsdom : menu → mulligan → choix → carte jouée.
 * Une manche classique est couverte par les vérifications UI historiques. */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage, { CreatureSlots, FluxManaTrack } from '../src/games/RpgDuelPage.jsx';
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
  // Les cases se lisent une par une : une créature morte laisse son trou, les
  // voisines gardent leur case (le plateau ne se resserre pas).
  const verifierCases = async () => {
    const element = document.createElement('div');
    document.body.append(element);
    const vue = createRoot(element);
    const cases = () => [...element.querySelectorAll('.rpg-creature-slot')];
    try {
      const troue = { creatures: [{ id: 'a', emplacement: 1 }, { id: 'c', emplacement: 3 }] };
      await act(async () => vue.render(<CreatureSlots camp={troue} cote="joueur" />));
      assert.equal(cases().length, 5, 'les cinq cases sont toujours dessinées');
      assert.deepEqual(cases().map((slot) => slot.dataset.creatureSlotOccupe),
        ['true', 'false', 'true', 'false', 'false'],
        'la case 2, vidée par une mort, reste vide : personne ne glisse pour la prendre');
      assert.deepEqual(cases().map((slot) => slot.classList.contains('is-occupied')),
        [true, false, true, false, false], 'le trait plein suit la case prise, pas le compte');
      assert.equal(element.querySelector('.rpg-creature-slots')?.dataset.creatureSlotsOccupes, '2');
      await act(async () => vue.render(<CreatureSlots camp={{ creatures: [] }} cote="ennemi" />));
      assert.ok(cases().every((slot) => slot.dataset.creatureSlotOccupe === 'false'), 'plateau vide : tout attend');
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
    assert.equal(q('.rpg-mulligan__cards')?.children.length, 3, 'mulligan de trois cartes : la nouvelle main de départ');
    assert.equal(q('.card-table')?.hasAttribute('inert'), true, 'la table attend le mulligan');
    assert.equal(q('.rpg-flux-choix'), null, 'le choix ne précède pas le mulligan');
    assert.equal(qa('.rpg-terrain').length, 0, 'aucun terrain posé');
    assert.equal(qa('.rpg-flux-track').length, 2, 'la réserve des deux camps reste affichée');
    for (const piste of qa('.rpg-flux-track')) {
      const orbes = [...piste.querySelectorAll('.rpg-flux-track__slot')];
      assert.equal(orbes.length, 10, 'les dix orbes existent dès l’ouverture');
      assert.ok(orbes.every((orb) => orb.dataset.manaEtat === 'vide'), 'avant le premier tour, elles sont toutes éteintes');
    }
    assert.equal(q('.rpg-card-piles--player .rpg-card-pile--deck b')?.textContent, '27', '30 cartes, moins la main de départ de trois cartes');
    // Les cinq emplacements de créatures sont dessinés des deux côtés.
    for (const cote of ['ennemi', 'joueur']) {
      const emplacements = qa(`.rpg-creature-slots--${cote} .rpg-creature-slot`);
      assert.equal(emplacements.length, 5, `cinq emplacements de créatures côté ${cote}`);
      assert.deepEqual(emplacements.map((slot) => slot.dataset.creatureSlot), ['1', '2', '3', '4', '5']);
      assert.ok(emplacements.every((slot) => slot.dataset.creatureSlotOccupe === 'false'), 'plateau vide : toutes les cases attendent');
      assert.equal(q(`.rpg-creature-slots--${cote}`)?.dataset.creatureSlots, '5');
    }
  };
  try {
    await verifierPalette();
    await verifierCases();
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
    // Main de départ de trois cartes : l'Ashigaru à 1 Braise n'y est pas encore.
    // Il arrive avec la pioche du tour 2 — le tour 1 se termine sans le jouer,
    // le sorcier n'a rien à annoncer avec son unique mana, et le second mana
    // (Sable) laisse le Braise du tour 1 payer la créature.
    assert.equal(q('.rpg-hand__card[data-card-id="ashigaru-des-braises"]'), null, 'pas d’Ashigaru dans la main de trois cartes');
    await click(q('.rpg-btn--endturn'));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1600)); });
    assert.equal(qa('.rpg-flux-choix__option').length, 2, 'le tour 2 rouvre le choix du nouveau mana');
    await click(q('.rpg-flux-choix__option--sable'));
    const ashigaru = q('.rpg-hand__card[data-card-id="ashigaru-des-braises"]');
    assert.ok(ashigaru, 'la pioche du tour 2 a apporté la créature à 1 Braise');
    assert.equal(ashigaru.dataset.jouable, 'true', 'le mana Braise peut la payer');
    await click(ashigaru);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 850)); });
    assert.equal(q('.rpg-flux-track--joueur')?.dataset.manaDisponible, '1', 'la carte dépense un des deux manas');
    assert.equal(q('.rpg-flux-track--joueur')?.dataset.manaCapacite, '2', 'les deux sources permanentes restent acquises');
    const orbeDepensee = q('.rpg-flux-track--joueur .rpg-flux-track__slot:first-child');
    assert.equal(orbeDepensee?.dataset.manaEtat, 'depense', 'l’icône s’assombrit après paiement');
    assert.ok(orbeDepensee?.querySelector('svg.rpg-emblem--braise'), 'la flamme reste visible même dépensée');
    assert.ok(orbeDepensee?.classList.contains('rpg-flux-track__slot--braise'), 'elle garde sa couleur Braise');
    assert.equal(qa('.rpg-flux-track--joueur .rpg-flux-track__slot.is-empty').length, 8);
    // La créature posée occupe le premier des cinq emplacements dessinés.
    assert.equal(q('.rpg-creature-slots--joueur')?.dataset.creatureSlotsOccupes, '1', 'un emplacement de créature occupé côté joueur');
    assert.equal(q('.rpg-creature-slots--joueur .rpg-creature-slot')?.dataset.creatureSlotOccupe, 'true');
    assert.equal(q('.rpg-creature-slots--ennemi')?.dataset.creatureSlotsOccupes, '0');
    // La carte se tient dans **sa** case : la colonne de la rangée est écrite
    // sur la carte, une morte laisserait donc un trou sans déplacer les autres.
    assert.equal(q('.card-row--equipe .rpg-card')?.dataset.emplacement, '1', 'la carte posée porte sa case');
    assert.match(q('.card-row--equipe .rpg-card')?.getAttribute('style') ?? '', /grid-column:\s*1;/,
      'la carte occupe la colonne de sa case');
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
