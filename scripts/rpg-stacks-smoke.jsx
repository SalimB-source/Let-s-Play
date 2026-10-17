import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage, { TableCard } from '../src/games/RpgDuelPage.jsx';
import { cardById, cardHybridGradient } from '../src/games/rpgCards.js';
import { RPG_LONG_PRESS_MS } from '../src/games/rpgLongPress.js';
import { lancerDuelDepuisMenu, passerMulligan } from './rpg-duel-start.js';

/**
 * Scénarios tactiles des piles de cartes homonymes : la main et les deux champs
 * de bataille regroupent les exemplaires identiques, comme les terrains.
 */

// Un duel tactile complet, avec les accès DOM dont les scénarios ont besoin.
function creerDuel(assert, props) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const outils = {
    container,
    root,
    click: async (element, message = 'action exists') => {
      assert.ok(element, message);
      await act(async () => element.click());
    },
    attendre: (ms) => act(async () => new Promise((resolve) => setTimeout(resolve, ms))),
    mainSlots: (id) => [...container.querySelectorAll(`.rpg-hand__card[data-card-id="${id}"]`)],
    hand: (id) => container.querySelector(`.rpg-hand__card[data-card-id="${id}"]`) ?? null,
    camp: (cote, id) => [...container.querySelectorAll(`.card-row--${cote} .rpg-card[data-card-id="${id}"]`)],
    // La puce « ×N » est un frère des cartes du groupe, dans la même rangée.
    puces: (cote) => [...container.querySelectorAll(`.card-row--${cote} .rpg-card-stack__toggle`)],
    pv: (cote) => Number(
      container.querySelector(`.rpg-wizard-plate--${cote} .rpg-wizard-plate__pv`)?.textContent.match(/\d+/)?.[0] ?? 0,
    ),
    finDuTour: async () => {
      await outils.click(container.querySelector('.rpg-btn--endturn:not([disabled])'), 'Fin du tour est disponible');
      await outils.attendre(900);
      await outils.passerCombat();
    },
    passerCombat: async () => {
      for (let garde = 0; garde < 4; garde += 1) {
        const bouton = container.querySelector('.rpg-btn--resolve-combat');
        if (!bouton || bouton.disabled) return;
        await outils.click(bouton, 'la fenêtre de combat se referme');
        await outils.attendre(900);
      }
    },
    envoyerPointeur: async (element, type, props = {}) => {
      assert.ok(element, 'la carte existe');
      await act(async () => {
        const evenement = new window.Event(type, { bubbles: true, cancelable: true });
        Object.assign(evenement, {
          pointerType: 'touch', pointerId: 7, clientX: 30, clientY: 30, isPrimary: true, button: 0, ...props,
        });
        element.dispatchEvent(evenement);
      });
    },
    fermer: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
  outils.appuiLong = async (element) => {
    await outils.envoyerPointeur(element, 'pointerdown');
    await outils.attendre(RPG_LONG_PRESS_MS + 120);
    await outils.envoyerPointeur(element, 'pointerup');
  };
  outils.fermerApercu = async () => {
    await act(async () => {
      window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    await outils.attendre(460);   // le clic avalé après un appui long est passé
  };
  outils.pileDe = (carte) => carte?.closest('.rpg-card-stack') ?? null;
  outils.compteur = (cote, id) => outils.pileDe(outils.camp(cote, id)[0])?.querySelector('.rpg-card-stack__count') ?? null;
  return outils;
}

export async function checkRpgCardStacks(assert) {
  const originalMatchMedia = window.matchMedia;
  try {
    // Paysage tactile ; le mouvement réduit rend les poses de carte synchrones.
    window.matchMedia = () => ({ matches: true });
    await scenarioMainEtChampJoueur(assert);
    await scenarioChampAdverse(assert);
    await scenarioCreatureArmee(assert, 'tactile');
    // Ordinateur : la souris survole, l'écran est large, rien n'est empilé
    // par nom — la créature armée, elle, reste une pile.
    window.matchMedia = (requete) => ({ matches: /reduce|hover/.test(requete) });
    await scenarioCreatureArmee(assert, 'ordinateur');
    await scenarioCompteursSurCarte(assert);
  } finally {
    window.matchMedia = originalMatchMedia;
  }
}

async function scenarioMainEtChampJoueur(assert) {
  const duel = creerDuel(assert, {});
  const {
    container, root, click, attendre, mainSlots, hand, camp, pileDe, compteur, puces, pv, finDuTour,
    appuiLong, fermerApercu,
  } = duel;
  try {
    await act(async () => root.render(<RpgDuelPage
      joueurDeck={['desert', 'desert', 'desert', 'desert', 'desert', 'chien-du-guet', 'chien-du-guet', 'fennec-des-decombres', 'desert', 'desert']}
      sorcierDeck={Array(15).fill('desert')}
      rng={() => .999}
    />));
    assert.ok(await lancerDuelDepuisMenu(container, (element) => click(element, 'le duel démarre')), 'l’onglet Deck lance le duel');
    await passerMulligan(container, (element) => click(element, 'le mulligan se valide'));
    assert.ok(container.querySelector('.rpg-battle--touch'), 'le duel s’affiche en mode tactile');

    // ── Main : deux exemplaires identiques, un seul emplacement ────────────
    assert.equal(mainSlots('chien-du-guet').length, 1, 'les deux Chiens du guet en main forment une pile');
    assert.equal(hand('chien-du-guet').dataset.pileCount, '2', 'la pile de la main compte ses exemplaires');
    assert.equal(camp('equipe', 'chien-du-guet').length, 0, 'le champ de bataille est vide au départ');

    // ── Tour 1 : un terrain seulement, un Chien coûte deux sables ──────────
    await click(hand('desert'), 'poser un Désert');
    assert.equal(container.querySelectorAll('.rpg-terrain--joueur').length, 1, 'le terrain est posé');
    await finDuTour();

    // ── Tour 2 : deuxième terrain, premier Chien — pas encore de pile ──────
    await click(hand('desert'), 'poser le deuxième Désert');
    await click(hand('chien-du-guet'), 'jouer le premier Chien du guet');
    assert.equal(camp('equipe', 'chien-du-guet').length, 1, 'une créature seule occupe un emplacement');
    assert.equal(pileDe(camp('equipe', 'chien-du-guet')[0]), null, 'une carte seule n’est pas une pile');
    assert.equal(compteur('equipe', 'chien-du-guet'), null, 'pas de compteur pour un exemplaire unique');
    assert.equal(hand('chien-du-guet').dataset.pileCount, '1', 'la main ne garde qu’un Chien du guet');
    const premierChien = camp('equipe', 'chien-du-guet')[0].dataset.entityId;
    await finDuTour();

    // ── Tour 3 : le second Chien rejoint le premier, la pile apparaît ──────
    await click(hand('desert'), 'poser le troisième Désert');
    await click(hand('chien-du-guet'), 'jouer le second Chien du guet');
    assert.equal(camp('equipe', 'chien-du-guet').length, 1,
      'deux Chiens du guet identiques ne forment qu’une carte sur le champ');
    assert.equal(compteur('equipe', 'chien-du-guet').textContent, '×2', 'la pile affiche son compteur ×2');
    assert.equal(camp('equipe', 'chien-du-guet')[0].dataset.entityId, premierChien,
      'la carte de tête reste le premier exemplaire posé');
    assert.ok(camp('equipe', 'chien-du-guet')[0].getAttribute('aria-label').includes('Chien du guet'),
      'la pile garde le libellé accessible de la carte');

    // ── Un appui long sur la pile consulte la carte, sans rien jouer ───────
    await appuiLong(camp('equipe', 'chien-du-guet')[0]);
    const volet = container.querySelector('.rpg-card-peek');
    assert.ok(volet, 'tenir la pile une seconde ouvre l’aperçu de la carte');
    assert.ok(volet.getAttribute('aria-label').includes('Chien du guet'), 'l’aperçu nomme la carte de la pile');
    assert.equal(camp('equipe', 'chien-du-guet').length, 1, 'l’aperçu ne déplie pas le groupe');
    assert.equal(camp('equipe', 'chien-du-guet')[0].classList.contains('is-selected'), false,
      '… et ne déclare pas d’attaque');
    await fermerApercu();
    assert.equal(container.querySelector('.rpg-card-peek'), null, 'Échap referme l’aperçu de la pile');

    // ── La pile agit sur l'exemplaire qui peut encore attaquer ─────────────
    await click(camp('equipe', 'chien-du-guet')[0], 'toucher la pile');
    const cartesApresClic = camp('equipe', 'chien-du-guet');
    assert.equal(cartesApresClic.length, 2, 'déclarer un exemplaire déplie le groupe : on voit chaque carte');
    assert.equal(cartesApresClic[0].dataset.entityId, premierChien, 'c’est le Chien prêt qui a été déclaré');
    assert.equal(cartesApresClic[0].classList.contains('is-selected'), true, 'l’exemplaire prêt est sélectionné');
    assert.equal(cartesApresClic[1].classList.contains('is-selected'), false, 'le second exemplaire ne l’est pas');
    assert.equal(puces('equipe').length, 1, 'une puce ×2 permet de replier le groupe');

    // ── Annuler l'attaque replie le groupe (plus rien en cours) ────────────
    await click(container.querySelector('.rpg-btn--cancel-attack'), 'annuler l’attaque');
    assert.equal(camp('equipe', 'chien-du-guet').length, 1, 'le groupe annulé se replie');
    assert.equal(puces('equipe').length, 0, 'la puce de repli disparaît avec le groupe replié');

    // ── Déplier / replier à la main, par le compteur puis par la puce ──────
    await click(compteur('equipe', 'chien-du-guet'), 'toucher le compteur ×2');
    assert.equal(camp('equipe', 'chien-du-guet').length, 2, 'le compteur déplie les exemplaires');
    assert.equal(compteur('equipe', 'chien-du-guet'), null, 'le groupe déplié n’a plus de compteur');
    await click(puces('equipe')[0], 'toucher la puce ×2');
    assert.equal(camp('equipe', 'chien-du-guet').length, 1, 'la puce replie le groupe');
    assert.equal(compteur('equipe', 'chien-du-guet').textContent, '×2', '… et le compteur revient');

    // ── Attaque confirmée : la pile se déplie, puis passe au suivant ───────
    await click(camp('equipe', 'chien-du-guet')[0], 'déclarer l’attaque depuis la pile');
    assert.equal(camp('equipe', 'chien-du-guet').length, 2, 'le groupe reste déplié pendant la déclaration');
    await click(container.querySelector('.rpg-btn--confirmer-attaque'), 'confirmer l’attaque');
    await attendre(1800);   // l'effet d'attaque tient le groupe déplié jusqu'au bout
    const apresAttaque = camp('equipe', 'chien-du-guet');
    assert.equal(apresAttaque.length, 2, 'après l’attaque, le Chien engagé se sépare du Chien encore prêt');
    assert.equal(apresAttaque[0].dataset.entityId, premierChien, 'le premier exemplaire reste engagé sur la table');
    assert.notEqual(apresAttaque[1].dataset.entityId, premierChien, 'le second est encore disponible');
    assert.equal(compteur('equipe', 'chien-du-guet'), null, 'deux états d’engagement distincts ne partagent pas de compteur');

    // ── Les pioches remplissent la pile existante, pas la largeur ──────────
    const slotsAvant = mainSlots('desert').length;
    const desertAvant = Number(hand('desert').dataset.pileCount);
    await finDuTour();
    assert.equal(mainSlots('desert').length, slotsAvant, 'une pioche identique n’ajoute pas d’emplacement');
    assert.equal(Number(hand('desert').dataset.pileCount), desertAvant + 1,
      '… elle rejoint la pile de Désert et son compteur');
    assert.ok(container.querySelector('.rpg-turn-indicator')?.textContent.trim(),
      'l’indicateur de tour reste le seul repère de statut');
  } finally {
    await duel.fermer();
  }
}

// Champ du sorcier : mêmes piles de l'autre côté, dépliées par le combat, et
// blocage assigné depuis une pile repliée (la tête de pile est le bloqueur).
async function scenarioChampAdverse(assert) {
  const duel = creerDuel(assert, {});
  const { container, root, click, attendre, hand, camp, compteur, puces, pv } = duel;
  // Générateur déterministe mais varié : une constante figerait l'IA en défense.
  let graine = 7;
  const rng = () => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine / 2147483648; };
  const attaquantAdverse = () => container.querySelector('.card-row--ennemi .rpg-card.is-blocker-target');
  const resoudre = () => container.querySelector('.rpg-btn--resolve-combat:not([disabled])');
  const classe = (cote, id, etat) => camp(cote, id).filter((carte) => carte.classList.contains(etat)).length;
  const finirLeTour = async () => {
    await click(container.querySelector('.rpg-btn--endturn:not([disabled])'), 'Fin du tour est disponible');
    await attendre(1200);
    // Chaque carte annoncée par le sorcier attend la réponse du joueur : « Laisser passer » la résout.
    for (let i = 0; i < 20; i += 1) {
      const laisser = [...container.querySelectorAll('button')]
        .find((bouton) => bouton.textContent.includes('Laisser passer') && !bouton.disabled);
      if (!laisser) break;
      await click(laisser, 'laisser passer l’annonce du sorcier');
      await attendre(1200);
    }
  };
  try {
    // Main adverse déterministe : deux Déserts et trois Chiens d’ouverture ; les
    // deux derniers Déserts piochés assurent un Chien par tour jusqu’au combat.
    await act(async () => root.render(<RpgDuelPage
      joueurDeck={['desert', 'desert', 'desert', 'desert', 'desert', 'chien-du-guet', 'chien-du-guet', 'fennec-des-decombres', 'desert', 'desert']}
      sorcierDeck={['chien-du-guet', 'chien-du-guet', 'desert', 'chien-du-guet', 'desert', 'desert', 'desert']}
      rng={rng}
    />));
    assert.ok(await lancerDuelDepuisMenu(container, (element) => click(element, 'le duel démarre')), 'l’onglet Deck lance le duel');
    await passerMulligan(container, (element) => click(element, 'le mulligan se valide'));
    assert.ok(container.querySelector('.rpg-battle--touch'), 'le duel s’affiche en mode tactile');

    // ── Tours 1 et 2 : un terrain par tour, premier Chien des deux côtés ───
    await click(hand('desert'), 'poser un Désert');
    await finirLeTour();
    assert.equal(camp('ennemi', 'chien-du-guet').length, 0, 'le sorcier n’a rien posé au tour 1');
    await click(hand('desert'), 'poser le deuxième Désert');
    await click(hand('chien-du-guet'), 'poser un premier Chien du guet');
    await finirLeTour();
    assert.equal(camp('ennemi', 'chien-du-guet').length, 1, 'le sorcier aligne un Chien du guet');
    assert.equal(compteur('ennemi', 'chien-du-guet'), null, 'un exemplaire unique n’affiche pas de compteur');

    // ── Tour 3 : la pile du joueur, puis l'attaque adverse qui déplie ──────
    await click(hand('desert'), 'poser le troisième Désert');
    await click(hand('chien-du-guet'), 'poser le second Chien du guet');
    assert.equal(camp('equipe', 'chien-du-guet').length, 1, 'les deux Chiens du joueur forment une pile');
    assert.equal(compteur('equipe', 'chien-du-guet').textContent, '×2', 'compteur ×2 côté joueur');
    await finirLeTour();

    assert.equal(camp('ennemi', 'chien-du-guet').length, 2,
      'le sorcier a deux Chiens : son groupe se déplie parce qu’un exemplaire attaque');
    assert.equal(puces('ennemi').length, 1, 'une puce ×2 permet de replier le groupe adverse');
    assert.equal(classe('ennemi', 'chien-du-guet', 'is-declared-attacker'), 1, 'un seul exemplaire attaque');
    assert.ok(attaquantAdverse(), 'l’attaquant adverse reçoit les bloqueurs');
    assert.equal(camp('equipe', 'chien-du-guet').length, 1, 'la pile du joueur reste repliée tant qu’il n’a rien choisi');
    assert.equal(compteur('equipe', 'chien-du-guet').textContent, '×2', '… et garde son compteur ×2');
    assert.equal(classe('equipe', 'chien-du-guet', 'is-blocker-draggable'), 1,
      'la tête de pile est proposée comme bloqueur');

    // ── Bloquer depuis la pile : la tête est choisie, le groupe se déplie ──
    await click(camp('equipe', 'chien-du-guet')[0], 'toucher sa pile pour bloquer');
    assert.equal(classe('equipe', 'chien-du-guet', 'is-blocker-selected'), 1,
      'toucher la pile sélectionne l’exemplaire disponible comme bloqueur');
    assert.equal(camp('equipe', 'chien-du-guet').length, 2, 'le groupe se déplie : on voit le bloqueur choisi');
    await click(attaquantAdverse(), 'assigner le blocage');
    assert.equal(classe('equipe', 'chien-du-guet', 'is-blocking'), 1, 'le bloqueur assigné porte son état');
    await click(resoudre(), 'résoudre le combat adverse');
    await attendre(1800);
    assert.equal(container.querySelector('.rpg-btn--resolve-combat'), null, 'la fenêtre de combat est refermée');
    assert.equal(puces('ennemi').length, 0, 'le groupe adverse se replie une fois le combat terminé');
    assert.equal(camp('equipe', 'chien-du-guet').length, 1, 'l’exemplaire qui a bloqué est tombé : un Chien reste');
    assert.equal(compteur('equipe', 'chien-du-guet'), null, '… donc plus de pile côté joueur');

    // ── Tour 4 : attaque non bloquée, les états engagés restent distincts ──
    await click(hand('desert'), 'poser un Désert');
    await finirLeTour();
    assert.equal(camp('ennemi', 'chien-du-guet').length, 2, 'le sorcier attaque encore : son groupe est déplié');
    assert.equal(classe('ennemi', 'chien-du-guet', 'is-declared-attacker'), 1, 'un exemplaire attaque');
    const pvAvantAttaque = pv('joueur');
    await click(resoudre(), 'laisser passer l’attaque');
    await attendre(1800);
    assert.equal(camp('ennemi', 'chien-du-guet').length, 2,
      'après le combat, un Chien adverse est engagé, l’autre reste prêt');
    assert.equal(compteur('ennemi', 'chien-du-guet'), null, 'deux états d’engagement distincts restent visibles');
    assert.ok(pv('joueur') < pvAvantAttaque, 'l’attaque non bloquée a touché le joueur : ses PV baissent');
  } finally {
    await duel.fermer();
  }
}

/**
 * Une créature équipée d'une arme est une pile : l'arme glisse sous elle, et
 * l'aperçu (survol, appui long) dit qu'elle est équipée et de quelle arme.
 * Joué une fois au doigt, une fois à la souris : la pile ne dépend pas de la
 * disposition.
 */
async function scenarioCreatureArmee(assert, disposition) {
  const duel = creerDuel(assert, {});
  const { container, root, click, hand, camp, finDuTour, appuiLong, fermerApercu } = duel;
  const survoler = async (element) => {
    await act(async () => element.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true, relatedTarget: null })));
  };
  const quitterSurvol = async (element) => {
    await act(async () => element.dispatchEvent(new window.MouseEvent('mouseout', { bubbles: true, relatedTarget: null })));
  };
  try {
    // Pioche : la fin du paquet part en premier (deux Déserts, le Chien, la
    // Takouba, un Désert). Trois Déserts suffisent pour payer les trois manas.
    await act(async () => root.render(<RpgDuelPage
      joueurDeck={[...Array(8).fill('desert'), 'takouba-des-pistes', 'chien-du-guet', 'desert', 'desert', 'desert']}
      sorcierDeck={Array(15).fill('desert')}
      rng={() => .999}
    />));
    assert.ok(await lancerDuelDepuisMenu(container, (element) => click(element, `[${disposition}] le duel démarre`)), `[${disposition}] l’onglet Deck lance le duel`);
    await passerMulligan(container, (element) => click(element, `[${disposition}] le mulligan se valide`));
    assert.ok(hand('takouba-des-pistes'), `[${disposition}] la Takouba est en main`);

    await click(hand('desert'), `[${disposition}] poser un Désert`);
    await finDuTour();
    await click(hand('desert'), `[${disposition}] poser le deuxième Désert`);
    await click(hand('chien-du-guet'), `[${disposition}] jouer le Chien du guet`);
    await finDuTour();
    await click(hand('desert'), `[${disposition}] poser le troisième Désert`);

    // ── Un Chien nu n'est pas une pile ─────────────────────────────────────
    const chien = camp('equipe', 'chien-du-guet')[0];
    assert.ok(chien, `[${disposition}] le Chien est sur le champ`);
    assert.equal(chien.closest('.rpg-card-stack--arme'), null, `[${disposition}] un Chien nu n’est pas une pile armée`);

    // ── La Takouba s'attache au Chien : le Chien devient une pile armée ────
    await click(hand('takouba-des-pistes'), `[${disposition}] jouer la Takouba`);
    await click(camp('equipe', 'chien-du-guet')[0], `[${disposition}] attacher la Takouba au Chien`);
    const armee = camp('equipe', 'chien-du-guet')[0];
    const pile = armee?.closest('.rpg-card-stack--arme') ?? null;
    assert.ok(pile, `[${disposition}] le Chien équipé se présente comme une pile`);
    assert.equal(pile.querySelectorAll('.rpg-card').length, 1, `[${disposition}] la pile ne compte qu’une créature`);
    const dessous = pile.querySelector('.rpg-card-stack__arme');
    assert.ok(dessous, `[${disposition}] l’arme glisse sous la créature`);
    assert.ok(dessous.querySelector('img')?.getAttribute('src')?.includes('takouba-des-pistes'),
      `[${disposition}] la pile montre l’illustration de l’arme`);
    assert.equal(dessous.getAttribute('aria-hidden'), 'true', `[${disposition}] l’arme posée dessous reste décorative`);
    assert.equal(armee.querySelector('.rpg-card__compteurs'), null,
      `[${disposition}] aucune pastille de compteur n’apparaît avant d’en gagner`);
    assert.doesNotMatch(armee.textContent, /Takouba des pistes|\+2\/\+0|Infiltration/u,
      `[${disposition}] la face de la créature ne montre ni nom, ni bonus, ni texte d’effet de l’arme`);
    assert.doesNotMatch([...armee.querySelectorAll('[title]')].map((noeud) => noeud.title).join(' '), /\+2\/\+0|Infiltration/u,
      `[${disposition}] aucun infobulle de la face ne révèle l’effet de l’arme`);
    assert.match(armee.getAttribute('aria-label'), /Bonus d’équipement : \+2\/\+0.*Infiltration/u,
      `[${disposition}] le libellé accessible indique le bonus et l’effet sans nommer l’arme`);
    assert.doesNotMatch(armee.getAttribute('aria-label'), /Takouba des pistes/u,
      `[${disposition}] le nom de l’arme n’est plus annoncé depuis la carte équipée`);
    assert.equal(pile.querySelector('.rpg-card-stack__count'), null, `[${disposition}] une créature seule n’a pas de compteur ×N`);

    // ── Survol : les bonus d'équipement rejoignent les effets en bleu ──────
    await survoler(armee);
    const apercu = container.querySelector('.rpg-hover-card-preview');
    assert.ok(apercu, `[${disposition}] survoler la créature armée ouvre son aperçu`);
    const ligne = apercu.querySelector('[data-effet-equipement]');
    assert.ok(ligne, `[${disposition}] l’aperçu ajoute les bonus à la zone d’effets`);
    assert.match(ligne.textContent, /Bonus d’équipement : \+2\/\+0.*Infiltration/u,
      `[${disposition}] l’effet bleu donne les stats et le mot-clé : « ${ligne.textContent} »`);
    assert.ok(ligne.classList.contains('rpg-hover-card-preview__rule--equipment'),
      `[${disposition}] les effets d’équipement ont leur style bleu`);
    const miniature = apercu.querySelector('[data-arme-equipee="takouba-des-pistes"]');
    assert.ok(miniature, `[${disposition}] l’aperçu du porteur contient une petite carte d’arme`);
    assert.match(miniature.querySelector('img')?.getAttribute('src') ?? '', /takouba-des-pistes/u,
      `[${disposition}] la miniature reprend l’illustration de la Takouba`);
    assert.match(miniature.querySelector('figcaption strong')?.textContent ?? '', /Takouba des pistes/u,
      `[${disposition}] le nom de l’arme se lit dans l’aperçu, pas sur la face jouée`);
    assert.match(miniature.querySelector('figcaption small')?.textContent ?? '', /Le porteur gagne \+2\/\+0 et Infiltration/u,
      `[${disposition}] la miniature donne le texte d’effet de la carte d’arme`);
    assert.match(apercu.getAttribute('aria-label'), /armes équipées Takouba des pistes.*effets d’équipement.*\+2\/\+0.*Infiltration/u,
      `[${disposition}] le nom et les bonus d’équipement sont également accessibles`);
    await quitterSurvol(armee);
    assert.equal(container.querySelector('.rpg-hover-card-preview'), null, `[${disposition}] quitter la carte referme l’aperçu`);

    // ── Appui long : même miniature et même effet bleu, sans rien jouer ────
    await appuiLong(camp('equipe', 'chien-du-guet')[0]);
    const volet = container.querySelector('.rpg-card-peek');
    assert.ok(volet, `[${disposition}] tenir la créature armée une seconde ouvre son aperçu`);
    const ligneVolet = volet.querySelector('[data-effet-equipement]');
    assert.ok(ligneVolet?.textContent.includes('+2/+0') && ligneVolet.textContent.includes('Infiltration'),
      `[${disposition}] l’appui long montre les stats et effets accordés`);
    assert.match(volet.querySelector('[data-arme-equipee="takouba-des-pistes"] figcaption')?.textContent ?? '', /Takouba des pistes/u,
      `[${disposition}] l’appui long conserve la petite carte d’arme`);
    await fermerApercu();
    assert.equal(container.querySelector('.rpg-card-peek'), null, `[${disposition}] Échap referme l’aperçu`);

    // ── Clic droit : la fiche complète garde aussi la carte équipée ────────
    await act(async () => {
      camp('equipe', 'chien-du-guet')[0].dispatchEvent(new window.MouseEvent('contextmenu', {
        bubbles: true, cancelable: true, button: 2,
      }));
    });
    const fiche = container.querySelector('.rpg-card-peek--catalogue');
    assert.ok(fiche, `[${disposition}] le clic droit ouvre la fiche de la créature`);
    assert.match(fiche.querySelector('[data-arme-equipee="takouba-des-pistes"] figcaption')?.textContent ?? '', /Takouba des pistes.*Le porteur gagne \+2\/\+0/u,
      `[${disposition}] la fiche conserve la miniature et le texte d’effet de l’arme`);
    await fermerApercu();
    assert.equal(camp('equipe', 'chien-du-guet')[0].classList.contains('is-selected'), false,
      `[${disposition}] consulter la créature n’a déclaré aucune attaque`);
  } finally {
    await duel.fermer();
  }
}

// Les vrais compteurs d'effet (pas les ×N des piles) restent visibles sur la
// créature et suivent les valeurs du duel : Heures et sable de la Jitte.
async function scenarioCompteursSurCarte(assert) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const fiche = cardById('guetteur-du-beffroi');
  const entite = {
    id: 'guetteur-compteurs', carteId: fiche.id, name: fiche.name,
    atk: 4, pv: 2, pvMax: 2, ready: true,
    heures: { restants: 2 },
    arme: { carteId: 'jitte-d-amayas', compteurs: 3 },
  };
  const rendre = async (valeurs) => {
    await act(async () => root.render(<TableCard entite={{ ...entite, ...valeurs }} cote="joueur" />));
    return container.querySelector('.rpg-card');
  };
  try {
    const carte = await rendre({});
    const pastilles = carte.querySelector('.rpg-card__compteurs');
    assert.ok(pastilles, 'la carte équipée porte les losanges chiffrés');
    assert.equal(pastilles.classList.contains('rpg-card__compteurs--hybride'), false,
      'sur une carte mono, les compteurs restent sous la couleur');
    assert.equal(carte.querySelector('.rpg-card-element-badge').nextElementSibling, pastilles,
      'les compteurs suivent le repère de couleur sur la face');
    assert.equal(pastilles.getAttribute('aria-hidden'), 'true',
      'les chiffres décoratifs ne doublonnent pas avec le libellé du bouton');
    assert.equal(pastilles.querySelector('[data-compteur="heures"]')?.textContent, '2',
      'les Heures de la créature ont un losange chiffré');
    assert.equal(pastilles.querySelector('[data-compteur="sable"]')?.textContent, '3',
      'les compteurs de sable de l’arme ont leur propre losange');
    assert.match(carte.getAttribute('aria-label'), /2 compteurs d’Heures.*3 compteurs de sable/u,
      'le nombre et la provenance de chaque compteur restent accessibles');
    assert.doesNotMatch(carte.textContent, /●|\+2\/\+0/u,
      'les losanges ne contiennent ni pastille ronde ni rappel du bonus d’arme');

    const apresHeure = await rendre({ heures: { restants: 1 }, arme: { ...entite.arme, compteurs: 0 } });
    assert.equal(apresHeure.querySelector('[data-compteur="heures"]')?.textContent, '1',
      'le losange suit le retrait d’une Heure');
    assert.equal(apresHeure.querySelector('[data-compteur="sable"]'), null,
      'un compteur de sable dépensé disparaît de la carte');
    const apresSable = await rendre({ heures: null, arme: { ...entite.arme, compteurs: 1 } });
    assert.equal(apresSable.querySelector('[data-compteur="sable"]')?.textContent, '1',
      'la Jitte seule affiche aussi son compteur');
    assert.equal(apresSable.querySelector('[data-compteur="heures"]'), null,
      'la sonnerie fait disparaître le losange d’Heures');
    const vide = await rendre({ heures: null, arme: { ...entite.arme, compteurs: 0 } });
    assert.equal(vide.querySelector('.rpg-card__compteurs'), null,
      'aucun losange n’est montré quand tous les compteurs sont à zéro');

    const hybride = await rendre({
      carteId: 'djinn-de-foudre', name: 'Djinn de foudre', atk: 2, pv: 1, pvMax: 1,
    });
    const compteursHybrides = hybride.querySelector('.rpg-card__compteurs');
    assert.equal(compteursHybrides?.classList.contains('rpg-card__compteurs--hybride'), true,
      'sur la créature hybride, les compteurs passent sous le coût plutôt que sous les deux pastilles de couleur');
    assert.equal(compteursHybrides.querySelectorAll('.rpg-card__compteur').length, 2,
      'les deux losanges restent visibles, côte à côte sous le coût');
    assert.equal(hybride.querySelector('.rpg-mana-cost--hybride')?.style.getPropertyValue('--rpg-hybrid-cost-bg'),
      cardHybridGradient('djinn-de-foudre'), 'le Djinn porte aussi son coût bicolore sur la table');
    assert.match(hybride.getAttribute('aria-label'), /2 compteurs d’Heures.*3 compteurs de sable/u,
      'le déplacement ne retire pas les compteurs du libellé accessible');
    const retourMono = await rendre({});
    assert.equal(retourMono.querySelector('.rpg-card__compteurs--hybride'), null,
      'revenir à une créature mono replace les losanges sous sa couleur');
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
}
