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
      duel[cote].main.push('ashigaru-des-braises');
      const res = rpgJouerCreature(duel, cote, 'ashigaru-des-braises');
      assert.ok(res.ok, res.raison); res.entite.ready = true; return res.entite;
    };
    const a = poser('joueur'), b = poser('joueur'), cible = poser('sorcier');
    a.atk = 10; cible.atk = 0;
    await act(async () => window.__RPG_FORCE__());
    assert.equal(container.querySelector('.rpg-btn--attaque-tous'), null);
    const card = (id) => container.querySelector(`.rpg-card[data-entity-id="${id}"]`);
    await click(card(a.id));
    assert.equal(container.querySelector('.rpg-btn--confirmer-attaque').disabled, true, 'la cible est obligatoire');
    await click(card(cible.id));
    await click(container.querySelector('.rpg-btn--confirmer-attaque'));
    assert.equal(duel.sorcier.creatures.includes(cible), false);
    assert.equal(a.attaquee, true);
    assert.equal(duel.phase, 'principale');
    const pv = duel.sorcier.pv;
    await click(card(b.id));
    await click(container.querySelector('.rpg-wizard-plate--ennemi'));
    await click(container.querySelector('.rpg-btn--confirmer-attaque'));
    assert.equal(duel.sorcier.pv, pv - b.atk, 'une seconde créature attaque directement');

    // Terminer le tour et attendre la vraie déclaration de l'IA sur la table.
    const ennemi = poser('sorcier'); ennemi.atk = 8; ennemi.pv = 8;
    a.atk = 0; b.atk = 0; duel.sorcier.main = []; duel.joueur.main = [];
    await act(async () => window.__RPG_FORCE__());
    await click(container.querySelector('.rpg-btn--endturn'));
    for (let i = 0; i < 24 && !container.querySelector('.rpg-btn--resolve-combat'); i++) {
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 250)); });
    }
    const resolution = container.querySelector('.rpg-btn--resolve-combat');
    assert.ok(resolution, 'l’IA annonce une attaque et laisse une réponse');
    assert.match(resolution.textContent, /Résoudre l’attaque/);
    assert.ok(duel.combatDeclare?.cibleIndividuelle);
    assert.equal(container.querySelector('.is-blocker-draggable'), null, 'aucun choix de bloqueur');
    duel.joueur.main.push('garde-du-trone-givre');
    await act(async () => window.__RPG_FORCE__());
    assert.equal(container.querySelector('.rpg-hand__card[data-card-id="garde-du-trone-givre"]')?.dataset.jouable, 'true', 'Embuscade disponible pendant la réponse');
    await click(resolution);
    assert.equal(duel.combatDeclare, null);

  } finally {
    await act(async () => root.unmount()); container.remove();
  }
}
