import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgJouerCreature } from '../src/games/rpgDuel.js';
import { installerDeckMaisonDeTest, passerMulligan } from './rpg-duel-start.js';

export async function verifierCinematique(assert) {
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  const deck = ['tercio-de-cuivre', 'pilote-de-la-carreira', 'le-renegat', 'negociant-des-ranscons', 'galion-de-la-flotte', 'le-routier', 'le-grand-debarquement', 'haut-fond', 'vipere-de-verre', 'lettre-de-marque', 'grappin-d-abordage', 'baton-des-citernes', 'cotre-de-course', 'tislit-des-aures', 'mousse-des-galiotes'].flatMap((id) => [id, id]);
  installerDeckMaisonDeTest(deck);
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  const click = async (element) => { assert.ok(element); assert.equal(element.disabled, false); await act(async () => element.click()); };
  const pause = async () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 150)); });
  try {
    await act(async () => root.render(<RpgDuelPage joueurDeck={deck} sorcierDeck={deck} rng={() => .9} />));
    await click([...host.querySelectorAll('.rpg-mode-menu__switch button')].find((el) => el.textContent.trim().endsWith('Deck'))); await pause();
    await click(host.querySelector('.rpg-deck-choice__button')); await pause();
    await click(host.querySelector('.rpg-deck-detail__play')); await pause();
    await passerMulligan(host, click); await pause();
    const duel = window.__RPG_DUEL__;
    for (const cote of ['joueur', 'sorcier']) duel[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
    duel.joueur.manaChoixEnAttente = null; duel.sorcier.main = [];
    const poser = (cote, carte) => {
      duel[cote].invocationNormaleJouee = false; duel[cote].main.push(carte);
      const tour = duel.tour; duel.tour = cote;
      const res = rpgJouerCreature(duel, cote, carte); duel.tour = tour;
      assert.ok(res.ok, res.raison); res.entite.ready = true; res.entite.malInvocation = false;
      return res.entite;
    };
    const a = poser('joueur', 'ashigaru-des-braises');
    const b = poser('joueur', 'chien-du-guet');
    const cible = poser('sorcier', 'ashigaru-des-braises');
    a.atk = 10; cible.atk = 0; duel.joueur.main = [];
    await act(async () => window.__RPG_FORCE__());
    const card = (id) => host.querySelector(`.rpg-card[data-entity-id="${id}"]`);
    const mesurerScene = () => {
      const table = host.querySelector('.card-table');
      table.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600 });
      for (const [i, el] of [...table.querySelectorAll('.rpg-card[data-entity-id], .rpg-wizard-plate__avatar')].entries()) {
        el.getBoundingClientRect = () => ({ left: 100 + i * 30, top: 100 + i * 20, width: 80, height: 100 });
      }
    };
    mesurerScene();
    await click(card(a.id));
    await click(card(cible.id));
    assert.ok(!duel.sorcier.creatures.includes(cible));
    const cinema = host.querySelector('.rpg-classique-impact-cinema');
    assert.ok(cinema); assert.equal(cinema.getAttribute('aria-hidden'), 'true');
    assert.ok(cinema.querySelector('.moba__impact-trail'));
    assert.ok(cinema.querySelector('.moba__impact-number'), 'dégâts sur la carte détruite');
    assert.ok(host.querySelector('.rpg-classique-exchange-clash'));
    const pv = duel.sorcier.pv;
    mesurerScene(); await click(card(b.id));
    assert.equal(duel.sorcier.pv, pv - b.atk);
    assert.ok([...host.querySelectorAll('.rpg-classique-impact-cinema .moba__impact-number')].some((el) => el.textContent === `−${b.atk}`));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1350)); });
    assert.equal(host.querySelectorAll('.rpg-classique-impact-cinema').length, 0, 'les effets temporaires disparaissent');
  } finally { await act(async () => root.unmount()); host.remove(); }
}
