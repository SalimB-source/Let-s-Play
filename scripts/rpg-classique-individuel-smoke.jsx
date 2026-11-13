import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgJouerCreature } from '../src/games/rpgDuel.js';
import { installerDeckMaisonDeTest, passerMulligan } from './rpg-duel-start.js';

export async function checkCombatIndividuel(assert) {
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  const deck = ['tercio-de-cuivre', 'pilote-de-la-carreira', 'le-renegat', 'negociant-des-ranscons', 'galion-de-la-flotte', 'le-routier', 'le-grand-debarquement', 'haut-fond', 'vipere-de-verre', 'lettre-de-marque', 'grappin-d-abordage', 'baton-des-citernes', 'cotre-de-course', 'tislit-des-aures', 'mousse-des-galiotes'].flatMap((id) => [id, id]);
  installerDeckMaisonDeTest(deck);
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  const click = async (el) => { assert.ok(el, 'élément présent'); assert.equal(el.disabled, false); await act(async () => el.click()); };
  try {
    await act(async () => root.render(<RpgDuelPage joueurDeck={deck} sorcierDeck={deck} rng={() => .9} />));
    const pause = async () => act(async () => { await new Promise(resolve => setTimeout(resolve, 150)); });
    const onglet = [...container.querySelectorAll('.rpg-mode-menu__switch button')].find(el => el.textContent.trim().endsWith('Deck'));
    await click(onglet); await pause();
    await click(container.querySelector('.rpg-deck-choice__button')); await pause();
    await click(container.querySelector('.rpg-deck-detail__play')); await pause();
    await passerMulligan(container, click); await pause();
    const duel = window.__RPG_DUEL__;
    assert.ok(duel);
    for (const cote of ['joueur', 'sorcier']) duel[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
    duel.joueur.manaChoixEnAttente = null; duel.sorcier.main = [];
    const poser = (cote) => {
      // Construction de la scène de test, hors quota d'invocation.
      duel[cote].invocationNormaleJouee = false;
      duel[cote].main.push('ashigaru-des-braises');
      const tour = duel.tour; duel.tour = cote;
      const res = rpgJouerCreature(duel, cote, 'ashigaru-des-braises');
      duel.tour = tour;
      assert.ok(res.ok, res.raison); res.entite.ready = true; return res.entite;
    };
    const a = poser('joueur'), b = poser('joueur'), cible = poser('sorcier');
    a.atk = 10; cible.atk = 0;
    await act(async () => window.__RPG_FORCE__());
    assert.equal(container.querySelector('.rpg-btn--attaque-tous'), null);
    const card = (id) => container.querySelector(`.rpg-card[data-entity-id="${id}"]`);
    await click(card(a.id));
    assert.equal(container.querySelector('.rpg-btn--confirmer-attaque'), null, 'aucune confirmation à cliquer');
    await act(async () => window.dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })));
    assert.equal(duel.tour, 'joueur', 'Espace ne termine pas le tour pendant le choix de cible');
    assert.equal(a.attaquee, false);
    const pvAvantCibleInvalide = duel.sorcier.pv;
    await click(container.querySelector('.rpg-wizard-plate--ennemi'));
    assert.equal(duel.sorcier.pv, pvAvantCibleInvalide, 'la cible directe illégale ne lance pas l’attaque');
    assert.equal(a.attaquee, false);
    await click(card(cible.id));
    assert.equal(duel.sorcier.creatures.includes(cible), false);
    assert.equal(a.attaquee, true);
    assert.equal(duel.phase, 'principale');
    const pv = duel.sorcier.pv;
    await click(card(b.id));
    await click(container.querySelector('.rpg-wizard-plate--ennemi'));
    assert.equal(duel.sorcier.pv, pv - b.atk, 'une seconde créature attaque directement');

    // Avec une réponse légale, l'attaque doit attendre le joueur, même après
    // le délai de résolution automatique.
    const ennemi = poser('sorcier'); ennemi.atk = 8; ennemi.pv = ennemi.pvMax = 12;
    const second = poser('sorcier'); second.atk = 7; second.pv = second.pvMax = 12;
    a.atk = 0; b.atk = 0; duel.sorcier.main = []; duel.sorcier.deck = [];
    duel.joueur.main = ['trait-de-braise'];
    await act(async () => window.__RPG_FORCE__());
    await click(container.querySelector('.rpg-btn--endturn'));
    for (let i = 0; i < 32 && !container.querySelector('.rpg-btn--resolve-combat'); i++) {
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 250)); });
    }
    const resolution = container.querySelector('.rpg-btn--resolve-combat');
    assert.ok(resolution, 'une réponse jouable maintient la fenêtre');
    assert.ok(duel.combatDeclare?.cibleIndividuelle);
    assert.equal(container.querySelector('.is-blocker-draggable'), null, 'aucun choix de bloqueur');
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 700)); });
    assert.ok(duel.combatDeclare?.cibleIndividuelle, 'la fenêtre reste ouverte si une carte est jouable');

    // La minuterie est annulée si une Embuscade devient jouable avant
    // l'impact : elle ne doit jamais voler une réponse au joueur.
    duel.joueur.main = ['ecueil']; // contresort sans sort annoncé : injouable
    await act(async () => window.__RPG_FORCE__());
    assert.equal(container.querySelector('.rpg-btn--resolve-combat'), null, 'pas de confirmation sans réponse');
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 100)); });
    a.pv = a.pvMax - 1;
    duel.joueur.main = ['garde-du-trone-givre'];
    await act(async () => window.__RPG_FORCE__());
    assert.equal(container.querySelector('.rpg-hand__card[data-card-id="garde-du-trone-givre"]')?.dataset.jouable, 'true');
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 700)); });
    assert.ok(duel.combatDeclare?.cibleIndividuelle, 'une Embuscade jouable annule la résolution automatique');
    assert.ok(container.querySelector('.rpg-btn--resolve-combat'));

    // Jouer réellement la dernière réponse : après le sort et ses animations,
    // l'attaque en cours et la suivante se résolvent sans autre clic.
    duel.joueur.main = ['trait-de-braise'];
    await act(async () => window.__RPG_FORCE__());
    await click(container.querySelector('.rpg-hand__card[data-card-id="trait-de-braise"]'));
    assert.ok(duel.combatDeclare, 'la désignation du sort suspend la résolution');
    await click(container.querySelector('.rpg-spell-confirm .rpg-btn--primary'));
    await click(card(ennemi.id));
    for (let i = 0; i < 20 && duel.joueur.main.includes('trait-de-braise'); i++) {
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 250)); });
    }
    assert.ok(!duel.joueur.main.includes('trait-de-braise'), 'la réponse a été jouée');
    for (let i = 0; i < 40 && (!ennemi.attaquee || !second.attaquee || duel.combatDeclare); i++) {
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 250)); });
    }
    assert.ok(ennemi.attaquee && second.attaquee, 'les attaques de l’IA continuent');
    assert.equal(duel.combatDeclare, null, 'les attaques ont été résolues sans clic');
    assert.equal(container.querySelector('.rpg-btn--resolve-combat'), null);


  } finally {
    await act(async () => root.unmount()); container.remove();
  }
}
