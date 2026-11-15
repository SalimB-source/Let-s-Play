import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgJouerCreature } from '../src/games/rpgDuel.js';
import { installerDeckMaisonDeTest, passerMulligan } from './rpg-duel-start.js';

export async function checkTourFlots(assert) {
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  const deck = ['tercio-de-cuivre', 'pilote-de-la-carreira', 'le-renegat', 'negociant-des-ranscons', 'galion-de-la-flotte', 'le-routier', 'le-grand-debarquement', 'haut-fond', 'vipere-de-verre', 'lettre-de-marque', 'grappin-d-abordage', 'baton-des-citernes', 'cotre-de-course', 'tislit-des-aures', 'mousse-des-galiotes'].flatMap(id => [id, id]);
  installerDeckMaisonDeTest(deck);
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  const click = async el => { assert.ok(el, 'élément présent'); await act(async () => el.click()); };
  const pause = async ms => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });
  try {
    await act(async () => root.render(<RpgDuelPage joueurDeck={deck} sorcierDeck={deck} rng={() => .9} />));
    const onglet = [...container.querySelectorAll('.rpg-mode-menu__switch button')].find(el => el.textContent.trim().endsWith('Deck'));
    await click(onglet); await pause(150);
    await click(container.querySelector('.rpg-deck-choice__button')); await pause(150);
    await click(container.querySelector('.rpg-deck-detail__play')); await pause(150);
    await passerMulligan(container, click); await pause(150);
    const duel = window.__RPG_DUEL__;
    for (const cote of ['joueur', 'sorcier']) duel[cote].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40]));
    duel.joueur.manaChoixEnAttente = null; duel.sorcier.main = [];
    const poser = (cote, id) => {
      duel[cote].invocationNormaleJouee = false; duel[cote].main.push(id);
      const tour = duel.tour; duel.tour = cote;
      const res = rpgJouerCreature(duel, cote, id); duel.tour = tour;
      assert.ok(res.ok, res.raison); res.entite.ready = true; res.entite.malInvocation = false; return res.entite;
    };
    const a = poser('joueur', 'chien-du-guet'), tour = poser('sorcier', 'tour-des-flots');
    a.atk = 2; duel.sorcier.main = [];
    await act(async () => window.__RPG_FORCE__());
    const card = id => container.querySelector(`.rpg-card[data-entity-id="${id}"]`);
    await click(card(a.id)); await click(card(tour.id));
    for (let i = 0; i < 20 && duel.joueur.creatures.includes(a); i++) await pause(100);
    assert.equal(tour.pv, 2, 'la Tour subit les blessures');
    assert.ok(duel.joueur.main.includes(a.carteId));
    assert.ok(container.querySelector(`[data-rpg-bounce-id="${a.id}"][data-rpg-bounce-fx="eau"]`), 'tourbillon du renvoi');
    assert.equal(container.querySelector(`[data-rpg-destroyed-id="${a.id}"]`), null, 'pas d’animation de mort');
  } finally {
    await act(async () => root.unmount()); container.remove();
  }
}
