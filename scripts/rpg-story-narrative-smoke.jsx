import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { cardById } from '../src/games/rpgCards.js';
import { RPG_STORY_STORAGE_KEY, RPG_STORY_LEGACY_STORAGE_KEY } from '../src/games/rpgStory.js';
import { RPG_STORY_DECKS, RPG_STORY_TOURS } from '../src/games/rpgStoryTours.js';
import { RPG_STORY_ACTES, RPG_STORY_CAMPAIGN_FLOORS, acteSuivantHistoire, questionChoix, sceneHistoire, texteEpilogueActe } from '../src/games/rpgStoryScenes.js';
import { recitHistoireVide, transitionRecitHistoire } from '../src/games/rpgStoryFlow.js';
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
    await act(async () => root.render(<StrictMode><RpgDuelPage joueurDeck={joueurDeck} rng={() => 0} /></StrictMode>));
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
    // La scène montre le personnage découpé (stand) ; la plaque du duel garde
    // le portrait canonique de la même peinture.
    assert.match(query('.rpg-wizard-plate--ennemi img').getAttribute('src'), /cards\/guetteur-du-beffroi\.jpg/, 'le duel garde le portrait canonique du Guetteur');
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
    assert.match(query('[data-personnage="salem"]').getAttribute('src'), /cards\/salem\.jpg/, 'le journal garde le portrait canonique de Salem');
    assert.match(query('[data-personnage="scribe"]').getAttribute('src'), /sablier-story\/scribe\.jpg/, 'le journal garde le portrait canonique de la Scribe');
    await click(query('[data-journal-scene="listes-2-apres"] summary'));
    await click(query('[data-journal-replay="listes-2-apres"]'));
    assert.match(query('[data-journal-stage="listes-2-apres"] [data-personnage="scribe"]')?.getAttribute('src'), /sablier-story\/scribe\.jpg/, 'la relecture du journal garde le portrait canonique');
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
    // La campagne se découvre : à la fin de l'Acte I, l'affiche ne montre que
    // les actes atteints — les quatre suivants n'ont pas encore de titre.
    assert.equal(container.querySelectorAll('[data-campaign-act]').length, 1, 'l’affiche ne montre que les actes atteints');
    assert.equal(query('[data-campaign-act="acte-2"]'), null, 'l’Acte II n’est pas encore annoncé');
    assert.equal(query('[data-campaign-act="acte-1"]')?.dataset.actStatus, 'termine');
    // Un acte atteint doit pouvoir se présenter : sans ces deux champs, l'affiche
    // affichait « undefined · undefined. » et l'épilogue « Acte II terminé · undefined ».
    for (const acte of RPG_STORY_ACTES.filter((item) => item.id !== 'acte-1')) {
      assert.ok(acte.resume && acte.lieu, `l’acte ${acte.romain} a un résumé et un lieu`);
      assert.doesNotMatch(texteEpilogueActe(acte.id, {})?.lieu ?? '', /undefined/, `l’épilogue de l’acte ${acte.romain} nomme son lieu`);
    }
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
    await passerMulligan(container, click);
    await click(query('.rpg-btn--endturn'));
    await act(async () => { await wait(1100); });
    // La fenêtre de réponse n'existe que si l'annonce adverse est encore
    // pendante au réveil : sur une machine lente elle attend le clic, sur une
    // machine rapide le sort (coût 0, 99 dégâts) a déjà résolu et le joueur
    // est déjà à terre. Les deux chemins finissent sur l'écran de défaite.
    const passer = [...container.querySelectorAll('.rpg-annonce-sort button')].find((b) => b.textContent.includes('Laisser passer'));
    if (passer) await click(passer);
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

/**
 * Les poses alternatives : la situation d'une scène change la posture des
 * personnages qui en ont une (garde avant le duel, détente après la victoire),
 * et rien d'autre ne bouge — la pose de référence reste la règle.
 */
export async function checkRpgStoryPoses(assert) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root = null;
  const query = (selector) => container.querySelector(selector);
  const sprite = (id) => container.querySelector(`[data-personnage-stand="${id}"] img[data-personnage]`);
  const dernier = (id) => sceneHistoire(id).repliques.length - 1;
  const poserEtat = (curseur, { etagesVaincus = [], scenesVues = [], choix = {} } = {}) => window.localStorage.setItem(
    RPG_STORY_STORAGE_KEY,
    JSON.stringify({ version: 2, etagesVaincus, recit: { ...recitHistoireVide(), curseur, scenesVues, choix } }),
  );
  const ouvrir = async () => {
    if (root) await act(async () => root.unmount());
    root = createRoot(container);
    await act(async () => root.render(<RpgDuelPage />));
    await act(async () => [...container.querySelectorAll('.rpg-mode-menu__switch button')]
      .find((b) => b.textContent.includes('Histoire')).click());
    await act(async () => container.querySelector('[data-story-campaign]').click());
    assert.ok(query('.rpg-narrative__plateau'), 'la scène est montée avec son plateau');
  };
  // Rejoue la campagne par les vraies transitions jusqu'à la scène visée : la
  // sauvegarde produite est exactement celle qu'un lecteur aurait à ce point.
  const avancerJusqua = (idScene) => {
    let recit = recitHistoireVide();
    let etages = [];
    for (let i = 0; i < 400 && recit.curseur.id !== idScene; i += 1) {
      if (recit.curseur.type === 'fin') {
        const suivant = acteSuivantHistoire(recit.curseur.acteId ?? 'acte-1');
        if (!suivant) break;
        recit = transitionRecitHistoire(recit, { type: 'ouvrir-acte', curseur: recit.curseur, acteId: suivant.id }, etages);
        continue;
      }
      if (recit.curseur.type === 'duel') {
        etages = [...etages, recit.curseur.etageId];
        recit = transitionRecitHistoire(recit,
          { type: 'victoire', curseur: recit.curseur, etageId: recit.curseur.etageId }, etages);
        continue;
      }
      const scene = sceneHistoire(recit.curseur.id);
      if (scene.choix) {
        // Chaque question a ses propres options : on prend la première, comme
        // un lecteur qui tranche sans se poser de question.
        const question = questionChoix(scene.choix);
        recit = transitionRecitHistoire(recit, { type: 'resumer', curseur: recit.curseur }, etages);
        recit = transitionRecitHistoire(recit,
          { type: 'choisir', curseur: recit.curseur, optionId: question.options[0].id }, etages);
      } else {
        recit = transitionRecitHistoire(recit, { type: 'continuer', curseur: recit.curseur }, etages);
      }
    }
    assert.equal(recit.curseur.id, idScene, `la campagne atteint ${idScene}`);
    return { recit, etages };
  };
  try {
    window.localStorage.clear();
    window.localStorage.setItem('letsplay_sablier_sound_v1', 'off');

    // 1. En cours de scène, personne ne change de posture.
    poserEtat({ type: 'scene', id: 'listes-1-avant', replique: 0, resume: false });
    await ouvrir();
    assert.match(sprite('salem').getAttribute('src'), /stand-salem\.webp/, 'en cours de scène, la pose de référence');
    assert.equal(sprite('salem').dataset.pose, undefined, 'hors situation, aucune variante déclarée');
    assert.equal(query('.rpg-narrative__plateau [data-pose]'), null, 'le plateau entier reste sur les poses de référence');

    // 2. Dernier échange d'une scène d'avant-duel : on se met en garde.
    poserEtat({ type: 'scene', id: 'listes-1-avant', replique: dernier('listes-1-avant'), resume: false });
    await ouvrir();
    assert.equal(sprite('salem').dataset.pose, 'duel', 'au dernier échange, Salem se met en garde');
    assert.match(sprite('salem').getAttribute('src'), /stand-salem-affrontement\.webp/, 'la variante remplace la référence');
    assert.match(sprite('guetteur').getAttribute('src'), /stand-guetteur-affrontement\.webp/,
      'la situation vaut pour tous les présents : le Guetteur barre le passage');
    assert.equal(sprite('guetteur').dataset.pose, 'duel');

    // 3. Après le duel, les épaules redescendent.
    poserEtat({ type: 'scene', id: 'listes-1-apres', replique: dernier('listes-1-apres'), resume: false },
      { etagesVaincus: ['listes-1'], scenesVues: ['listes-1-avant'] });
    await ouvrir();
    assert.equal(sprite('salem').dataset.pose, 'apres', 'la scène d’après-duel a sa propre posture');
    assert.match(sprite('salem').getAttribute('src'), /stand-salem-apaisement\.webp/);

    // 4. Une décision posée a sa situation à part, et sa propre peinture : les
    //    figures du plan qui en ont une la prennent ensemble, devant le lecteur.
    poserEtat({ type: 'scene', id: 'listes-2-apres', replique: dernier('listes-2-apres'), resume: false },
      { etagesVaincus: ['listes-1', 'listes-2'], scenesVues: ['listes-1-avant', 'listes-1-apres', 'listes-2-avant'] });
    await ouvrir();
    assert.ok(query('[data-story-choice-group]'), 'la décision est réellement posée');
    assert.equal(sprite('salem').dataset.pose, 'choix', 'la décision a sa propre posture');
    assert.match(sprite('salem').getAttribute('src'), /stand-salem-decision\.webp/);
    assert.equal(sprite('scribe').dataset.pose, 'choix', 'la Scribe montre la liste au lecteur');
    assert.match(sprite('scribe').getAttribute('src'), /stand-scribe-decision\.webp/);

    // 5. Toute la campagne plus loin : les deux figures d'un même plan qui ont
    //    une variante l'utilisent ensemble — Salem et Mahieddine se détendent
    //    dans l'après-duel du sommet de la Tour des Listes.
    const etatFinal = avancerJusqua('listes-5-apres');
    poserEtat({
      type: 'scene', id: 'listes-5-apres', replique: dernier('listes-5-apres'), resume: false,
    }, { etagesVaincus: etatFinal.etages, scenesVues: etatFinal.recit.scenesVues, choix: etatFinal.recit.choix });
    await ouvrir();
    assert.ok(sprite('salem') && sprite('mahieddine'), 'les deux figures du plan sont montées');
    assert.equal(sprite('salem').dataset.pose, 'apres', 'Salem se détend après son duel');
    assert.match(sprite('salem').getAttribute('src'), /stand-salem-apaisement\.webp/);
    assert.equal(sprite('mahieddine').dataset.pose, 'apres', 'Mahieddine aussi : la même situation vaut pour tout le plan');
    assert.match(sprite('mahieddine').getAttribute('src'), /stand-mahieddine-apaisement\.webp/);

    // 6. La dernière décision du récit, atteinte par le vrai rejeu de la
    //    campagne : les deux figures du plan prennent leur pose de décision —
    //    aucun plateau de décision ne reste sur une posture d'un autre moment.
    const etatFinale = avancerJusqua('sables-3-apres');
    poserEtat({
      type: 'scene', id: 'sables-3-apres', replique: dernier('sables-3-apres'), resume: false,
    }, { etagesVaincus: etatFinale.etages, scenesVues: etatFinale.recit.scenesVues, choix: etatFinale.recit.choix });
    await ouvrir();
    assert.ok(query('[data-story-choice-group]'), 'le choix du portail est posé au lecteur');
    assert.equal(sprite('mahieddine').dataset.pose, 'choix', 'le Grand Horloger passe la plume');
    assert.match(sprite('mahieddine').getAttribute('src'), /stand-mahieddine-decision\.webp/);
    assert.equal(sprite('horloger-zenith').dataset.pose, 'choix', 'l’Horloger du Zénith pose sa montre');
    assert.match(sprite('horloger-zenith').getAttribute('src'), /stand-horloger-zenith-decision\.webp/);
    assert.equal(query('.rpg-narrative__plateau [data-pose="apres"], .rpg-narrative__plateau [data-pose="duel"]'), null,
      'et aucune pose de duel ne traîne sur un plateau de décision');
  } finally {
    if (root) await act(async () => root.unmount());
    container.remove();
  }
}
