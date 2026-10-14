import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { cardById } from '../src/games/rpgCards.js';
import { RPG_STORY_STORAGE_KEY, RPG_STORY_LEGACY_STORAGE_KEY } from '../src/games/rpgStory.js';
import { RPG_STORY_DECKS, RPG_STORY_TOURS } from '../src/games/rpgStoryTours.js';
import { RPG_STORY_CAMPAIGN_FLOORS } from '../src/games/rpgStoryScenes.js';
import { collectionJoueur, chargerCollectionDistante, revelationsDepuisEtages } from '../src/games/rpgCollection.js';
import { RPG_PV_JOUEUR } from '../src/games/rpgDuel.js';
import { passerMulligan } from './rpg-duel-start.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function checkRpgStoryNarrative(assert) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root;
  const lire = () => JSON.parse(window.localStorage.getItem(RPG_STORY_STORAGE_KEY));
  const query = (selector) => container.querySelector(selector);
  const bouton = (texte) => [...container.querySelectorAll('button')].find((b) => b.textContent.trim() === texte);
  const click = async (element) => {
    assert.ok(element, 'la commande demandée est affichée');
    await act(async () => { element.click(); });
  };
  const unmount = async () => { if (root) { await act(async () => root.unmount()); root = null; } };
  const mount = async (joueurDeck = Array(5).fill('trait-de-braise')) => {
    await unmount();
    root = createRoot(container);
    await act(async () => root.render(<StrictMode><RpgDuelPage joueurDeck={joueurDeck} rng={() => 0.999} /></StrictMode>));
  };
  const histoire = async () => click([...container.querySelectorAll('.rpg-mode-menu__switch button')].find((b) => b.textContent.includes('Histoire')));
  const ouvrirCampagne = async () => { await histoire(); await click(query('[data-story-campaign]')); };
  const resumerEtContinuer = async () => {
    if (query('[data-story-summary]')) await click(query('[data-story-summary]'));
    await click(query('[data-story-next]'));
  };
  // Fixture seulement : accélérer un sort, pas remplacer la victoire du moteur
  // ni exposer une commande de test dans le jeu. Tout est restauré en finally.
  const trait = cardById('trait-de-braise');
  const original = { cost: trait.cost, effet: trait.effet };
  const premier = RPG_STORY_TOURS[0].etages[0];
  const iaOriginale = premier.ia;
  const deckOriginal = RPG_STORY_DECKS[premier.deck];
  trait.cost = 0;
  trait.effet = { ...trait.effet, amount: 99 };
  const gagner = async () => {
    await click(query('[data-story-start-duel]'));
    await passerMulligan(container, click);
    await click(query('.rpg-hand__card[data-card-id="trait-de-braise"]'));
    await click(query('.rpg-spell-confirm .rpg-btn--primary'));
    await click(query('.rpg-wizard-plate--ennemi'));
  };

  try {
    window.localStorage.clear();
    window.localStorage.setItem('letsplay_sablier_sound_v1', 'off');
    await mount();
    const coque = query('.rpg-battle');
    await ouvrirCampagne();
    assert.equal(query('.rpg-battle'), coque, 'la coque plein écran traverse la lecture');
    assert.equal(query('[data-story-cursor]')?.dataset.storyCursor, 'listes-1-avant');
    assert.equal(query('.card-table'), null, 'pas de duel derrière la scène');
    assert.equal(query('.rpg-mulligan'), null, 'pas de mulligan créé avant le clic de lancement');
    const salemSrc = query('[data-personnage="salem"]').getAttribute('src');
    await click(query('[data-story-next]'));
    const guetteurSrc = query('[data-personnage="guetteur"]').getAttribute('src');
    assert.equal(lire().recit.curseur.replique, 1);
    assert.equal(lire().recit.scenesVues.length, 0, 'ouvrir n’est pas valider');

    await mount();
    await ouvrirCampagne();
    assert.equal(lire().recit.curseur.replique, 1, 'la position résiste au démontage');
    assert.equal(query('[data-personnage="guetteur"]').getAttribute('src'), guetteurSrc, 'le même portrait revient au rechargement');
    await resumerEtContinuer();
    assert.equal(lire().recit.curseur.type, 'duel');
    assert.equal(query('[data-story-skip-duel]'), null, 'pas de saut d’un duel jamais gagné');
    assert.match(query('[data-story-duel-hp]')?.textContent ?? '', new RegExp(`^${RPG_PV_JOUEUR} PV`), 'le briefing affiche les 25 PV réels du duel');
    assert.ok(query('[data-story-duel-profile]')?.textContent.includes('Équilibré'), 'le briefing indique le profil tactique de l’adversaire');
    assert.ok(query('[data-story-tactic]')?.textContent.length > 10, 'le briefing affiche la note tactique de l’étage');
    assert.ok(query('[data-story-deck-select]'), 'le joueur peut choisir son deck directement depuis le briefing');
    const avantRelectureIntro = window.localStorage.getItem(RPG_STORY_STORAGE_KEY);
    await click(query('[data-story-replay-intro]'));
    assert.equal(query('[data-personnage="salem"]')?.getAttribute('src'), salemSrc, 'revoir la scène d’introduction retrouve le portrait de départ');
    await click(query('[data-story-close-replay]'));
    assert.equal(window.localStorage.getItem(RPG_STORY_STORAGE_KEY), avantRelectureIntro, 'revoir l’introduction ne modifie pas la sauvegarde');
    await click(query('[data-story-start-duel]'));
    assert.ok(query('.rpg-mulligan'), 'le vrai duel s’ouvre sur le mulligan');
    assert.equal(query('.rpg-wizard-plate--ennemi img').getAttribute('src'), guetteurSrc, 'portrait identique dans la scène et le duel');
    await click(bouton('Menu'));
    await click(bouton('Journal'));
    assert.ok(query('.rpg-campaign__confirm'), 'un duel en cours ne se perd pas sans confirmation');
    await click(bouton('Annuler'));
    await click(query('[data-story-campaign]'));
    assert.ok(query('.rpg-mulligan'), 'annuler la lecture permet de reprendre le duel intact');
    await passerMulligan(container, click);
    await click(query('.rpg-hand__card[data-card-id="trait-de-braise"]'));
    await click(query('.rpg-spell-confirm .rpg-btn--primary'));
    await click(query('.rpg-wizard-plate--ennemi'));
    assert.equal(query('[data-story-cursor]')?.dataset.storyCursor, 'listes-1-apres', 'une victoire réelle du moteur ouvre l’après-duel');
    assert.deepEqual(lire().etagesVaincus, ['listes-1']);
    assert.equal(lire().recit.curseur.id, 'listes-1-apres', 'victoire et curseur sont sauvegardés ensemble');
    assert.ok(query('.rpg-narrative__rewards'));
    assert.match(query('.rpg-narrative__rewards').textContent, /CE QUE L’ÉTAGE RÉVÈLE/,
      'l’étage annonce ce qu’il révèle — le Souk les vendra');
    assert.equal(collectionJoueur().includes('scribe-de-la-liste'), false,
      'la victoire ne donne plus la carte : le Souk la vendra (dossier 13)');
    assert.ok(revelationsDepuisEtages(lire().etagesVaincus).includes('scribe-de-la-liste'),
      'la carte est bien révélée par l’étage');
    assert.equal(query('.card-table'), null, 'la table gagnée ne reste pas sous la scène');

    await mount();
    await ouvrirCampagne();
    assert.equal(query('[data-story-cursor]')?.dataset.storyCursor, 'listes-1-apres');
    await resumerEtContinuer();
    assert.equal(query('[data-story-cursor]')?.dataset.storyCursor, 'listes-2-avant');
    await click(query('[data-story-next]'));
    const scribeSrc = query('[data-personnage="scribe"]').getAttribute('src');
    await resumerEtContinuer();
    await gagner();
    assert.equal(lire().recit.curseur.id, 'listes-2-apres');
    await click(query('[data-story-summary]'));
    assert.equal(query('[data-story-next]'), null, 'le résumé n’évite pas le choix');
    assert.equal(container.querySelectorAll('[data-story-choice]').length, 2);
    await mount();
    await ouvrirCampagne();
    assert.equal(container.querySelectorAll('[data-story-choice]').length, 2, 'un choix non résolu attend après rechargement');
    await click(query('[data-story-choice="publique"]'));
    assert.equal(lire().recit.curseur.id, 'listes-3-avant');
    assert.equal(lire().recit.choix['diffusion-liste'], 'publique');
    const apresChoix = window.localStorage.getItem(RPG_STORY_STORAGE_KEY);
    await click(bouton('Journal'));
    assert.equal(container.querySelectorAll('[data-journal-scene]').length, 4, 'le journal ne dévoile que les scènes validées');
    assert.equal(container.querySelectorAll('[data-journal-register]').length, 2, 'le journal affiche les deux premières pièces versées au dossier');
    assert.match(query('[data-journal-survivors-status]')?.textContent ?? '', /Sous la voûte du premier palier/, 'le journal indique où se trouvent les douze habitants');
    assert.equal(query('[data-personnage="salem"]').getAttribute('src'), salemSrc);
    assert.equal(query('[data-personnage="scribe"]').getAttribute('src'), scribeSrc, 'la Scribe est la même dans le journal');
    await click(query('[data-journal-scene="listes-2-apres"] summary'));
    await click(query('[data-journal-replay="listes-2-apres"]'));
    assert.equal(query('[data-journal-stage="listes-2-apres"] [data-personnage="scribe"]')?.getAttribute('src'), scribeSrc, 'la relecture en scène dans le journal garde le portrait canonique');
    await click(query('[data-journal-close-replay]'));
    assert.equal(query('[data-journal-stage]'), null, 'la relecture se referme proprement');
    assert.equal(window.localStorage.getItem(RPG_STORY_STORAGE_KEY), apresChoix, 'la relecture est sans effet');
    await click(bouton('Reprendre le récit →'));
    assert.equal(lire().recit.curseur.id, 'listes-3-avant');
    await click(query('.rpg-narrative__back'));
    assert.equal(container.querySelectorAll('[data-campaign-step]').length, 5, 'l’affiche de campagne présente les cinq paliers de l’épisode');
    assert.equal(query('[data-campaign-step="listes-1"]')?.dataset.stepStatus, 'termine');
    assert.equal(query('[data-campaign-step="listes-3"]')?.dataset.stepStatus, 'en-cours');
    await click(bouton('Recommencer le récit'));
    await click(bouton('Annuler'));
    assert.equal(lire().recit.choix['diffusion-liste'], 'publique', 'annuler conserve la décision');
    await click(bouton('Recommencer le récit'));
    await click(bouton('Oui, recommencer le récit'));
    assert.equal(lire().recit.curseur.id, 'listes-1-avant');
    assert.deepEqual(lire().etagesVaincus, ['listes-1', 'listes-2']);
    assert.equal(collectionJoueur().includes('braisier-du-souk'), false,
      'recommencer le récit ne donne pas de cartes : les étages révèlent');

    // Migration d'un joueur qui a déjà gagné les cinq étages : suivre le récit
    // complet sans grind, et finir par l'autre branche de l'épilogue.
    await unmount();
    window.localStorage.removeItem(RPG_STORY_STORAGE_KEY);
    window.localStorage.removeItem('letsplay_sablier_acquis_v1');
    window.localStorage.setItem(RPG_STORY_LEGACY_STORAGE_KEY, JSON.stringify({ etagesVaincus: RPG_STORY_CAMPAIGN_FLOORS }));
    await mount();
    // Le gel de migration reprend, une fois pour toutes, les cartes que
    // l'ancienne règle avait données pour ces étages (dossier 13).
    const acquisFiges = collectionJoueur();
    for (const carte of revelationsDepuisEtages(RPG_STORY_CAMPAIGN_FLOORS)) {
      assert.ok(acquisFiges.includes(carte), `${carte} est reprise par le gel de migration`);
    }
    await ouvrirCampagne();
    let garde = 0;
    while (lire().recit.curseur.type !== 'fin' && garde++ < 40) {
      const c = lire().recit.curseur;
      if (c.type === 'duel') await click(query('[data-story-skip-duel]'));
      else {
        if (query('[data-story-summary]')) await click(query('[data-story-summary]'));
        if (query('[data-story-choice="confiee"]')) await click(query('[data-story-choice="confiee"]'));
        else await click(query('[data-story-next]'));
      }
    }
    assert.ok(garde < 40);
    assert.match(query('.rpg-narrative__outcome').textContent, /Tarek.*escalier de service/);
    assert.equal(lire().recit.scenesVues.length, 10);
    assert.equal(lire().recit.choix['diffusion-liste'], 'confiee');
    assert.ok(query('[data-story-next-act="acte-2"]'), 'l’épilogue de l’Acte I permet d’ouvrir l’Acte II');
    assert.equal(query('.rpg-mulligan'), null);

    const cartesAvantEffacement = collectionJoueur();
    await click(query('.rpg-narrative__back'));
    assert.equal(container.querySelectorAll('[data-campaign-act]').length, 5, 'l’affiche présente les cinq actes de la campagne');
    assert.equal(query('[data-campaign-act="acte-1"]')?.dataset.actStatus, 'termine');
    await click(bouton('Effacer la progression'));
    await click(bouton('Annuler'));
    assert.equal(lire().recit.curseur.type, 'fin', 'annuler l’effacement ne change rien');
    await click(bouton('Effacer la progression'));
    await click(bouton('Confirmer l’effacement'));
    assert.deepEqual(lire().etagesVaincus, []);
    assert.equal(lire().recit, null);
    assert.equal(window.localStorage.getItem(RPG_STORY_LEGACY_STORAGE_KEY), null, 'la v1 ne ressuscite pas les victoires effacées');
    assert.deepEqual(collectionJoueur({ distante: chargerCollectionDistante() }), cartesAvantEffacement, 'effacer les victoires ne retire pas les cartes');
    await unmount();
    await mount();
    assert.deepEqual(collectionJoueur({ distante: chargerCollectionDistante() }), cartesAvantEffacement, 'les cartes restent après rechargement de la page');

    // Défaite réelle : le sorcier dispose du même sort-fixture et le joueur
    // n'a aucune carte. La fenêtre de réponse reste celle du jeu normal.
    await unmount();
    window.localStorage.removeItem(RPG_STORY_STORAGE_KEY);
    window.localStorage.removeItem(RPG_STORY_LEGACY_STORAGE_KEY);
    RPG_STORY_DECKS[premier.deck] = Array(10).fill('trait-de-braise');
    premier.ia = { niveau: 'normale', style: 'agressif' };
    await mount([]);
    await ouvrirCampagne();
    await resumerEtContinuer();
    await click(query('[data-story-start-duel]'));
    await click(query('.rpg-btn--endturn'));
    await act(async () => { await wait(1100); });
    await click([...container.querySelectorAll('.rpg-annonce-sort button')].find((b) => b.textContent.includes('Laisser passer')));
    await act(async () => { await wait(1600); });
    assert.ok(query('.rpg-overlay--loss'), 'la défaite garde son écran de résultat');
    assert.deepEqual(lire().etagesVaincus, []);
    assert.deepEqual(lire().recit.curseur, { type: 'duel', etageId: 'listes-1' });
    await click(bouton('Recommencer l’étage'));
    // Les PV se lisent sur la règle du moteur, pas sur un nombre écrit ici :
    // tout le monde part à 25 depuis que les sorciers ne gonflent plus leurs PV.
    assert.equal(query('.rpg-wizard-plate--joueur .rpg-wizard-plate__hp-value').textContent.trim(), String(RPG_PV_JOUEUR));
    assert.equal(query('.rpg-narrative'), null, 'réessayer ne réimpose pas la scène');
  } finally {
    await unmount();
    trait.cost = original.cost;
    trait.effet = original.effet;
    premier.ia = iaOriginale;
    RPG_STORY_DECKS[premier.deck] = deckOriginal;
    container.remove();
  }
}

export async function checkRpgStoryStorageDenied(assert) {
  window.localStorage.clear();
  const proto = Object.getPrototypeOf(window.localStorage);
  const original = proto.setItem;
  proto.setItem = () => { throw new Error('quota'); };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<RpgDuelPage />));
    await act(async () => [...container.querySelectorAll('.rpg-mode-menu__switch button')].find((b) => b.textContent.includes('Histoire')).click());
    await act(async () => container.querySelector('[data-story-campaign]').click());
    assert.ok(container.querySelector('.rpg-narrative__warning'), 'le refus de stockage est annoncé');
    await act(async () => container.querySelector('[data-story-next]').click());
    assert.ok(container.querySelector('[data-personnage="guetteur"]'), 'la session reste jouable');
    await act(async () => container.querySelector('.rpg-narrative__back').click());
    await act(async () => container.querySelector('.rpg-story__reset').click());
    await act(async () => [...container.querySelectorAll('button')].find((b) => b.textContent === 'Confirmer l’effacement').click());
    assert.match(container.textContent, /La progression n’a pas été effacée/, 'sans cache des cartes, l’effacement est refusé');
    await act(async () => container.querySelector('[data-story-campaign]').click());
    assert.ok(container.querySelector('[data-personnage="guetteur"]'), 'le refus de réinitialisation conserve aussi le curseur en mémoire');
  } finally {
    await act(async () => root.unmount());
    proto.setItem = original;
    container.remove();
  }
}
