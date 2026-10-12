// Chasse aux cartes fantômes du Sablier.
//
// Trois épreuves, toutes jouées dans jsdom sur la vraie page de duel :
//   1. pilote automatique — des duels entiers, geste après geste, avec une
//      batterie d'invariants (aucune carte morte sur la table, aucune carte
//      engagée à tort, la table affiche exactement les créatures du moteur) ;
//   2. relance — repartir au menu pendant le tour du sorcier puis lancer un
//      nouveau duel ne doit rien laisser passer de l'ancienne partie ;
//   3. veille — un téléphone qui gèle l'onglet avale les minuteries : au
//      retour, aucune image de carte détruite ne doit rester posée.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { passerMulligan } from './rpg-duel-start.js';
import { RPG_DECKS } from '../src/games/rpgCards.js';

/** Horloge virtuelle : les minuteries du jeu avancent à la demande. */
function horlogeDuJeu() {
  const originalSetTimeout = window.setTimeout;
  const originalClearTimeout = window.clearTimeout;
  let maintenant = 0;
  let sequence = 0;
  const timers = new Map();
  window.setTimeout = (callback, delai = 0, ...args) => {
    const id = ++sequence;
    timers.set(id, { date: maintenant + Number(delai), callback: () => callback(...args) });
    return id;
  };
  window.clearTimeout = (id) => timers.delete(id);
  return {
    enAttente: () => timers.size,
    // Onglet gelé par le système : les minuteries en attente ne reviendront
    // jamais. C'est exactement ce que fait un téléphone qui met l'app en veille.
    perdreLesMinuteries: () => timers.clear(),
    avancer: async (duree) => {
      const fin = maintenant + duree;
      for (;;) {
        const prochain = [...timers.entries()]
          .filter(([, timer]) => timer.date <= fin)
          .sort((a, b) => a[1].date - b[1].date || a[0] - b[0])[0];
        if (!prochain) break;
        const [id, timer] = prochain;
        timers.delete(id);
        maintenant = timer.date;
        await act(async () => timer.callback());
      }
      maintenant = fin;
    },
    restaurer: () => {
      timers.clear();
      window.setTimeout = originalSetTimeout;
      window.clearTimeout = originalClearTimeout;
    },
  };
}

function prng(graine) {
  let etat = (graine * 2654435761) >>> 0;
  const tirer = () => {
    etat = (etat * 1664525 + 1013904223) >>> 0;
    return etat / 4294967296;
  };
  for (let i = 0; i < 8; i += 1) tirer();
  return tirer;
}

const texte = (element) => (element?.textContent ?? '').replace(/\s+/g, ' ').trim();

/** Rend la main à l'application après un retour d'arrière-plan. */
async function revenirDeVeille(secondes = 5) {
  const vraiMaintenant = Date.now;
  Date.now = () => vraiMaintenant.call(Date) + secondes * 1000;
  try {
    await act(async () => document.dispatchEvent(new window.Event('visibilitychange')));
  } finally {
    Date.now = vraiMaintenant;
  }
}

/**
 * Un duel entier joué par un pilote automatique déterministe.
 * `surFantome` est appelé la première fois qu'une image de carte détruite
 * apparaît : l'épreuve de veille s'y greffe sans scénario sur mesure.
 */
export async function fuzzDuel({ assert, graine, mobile = false, pasMax = 400, surFantome = null }) {
  const originalMatchMedia = window.matchMedia;
  const originalConsoleError = console.error;
  const avertissements = [];
  let auDoigt = mobile;
  let fantomeTeste = !surFantome;
  // Animations actives (le jeu par défaut) : c'est là que vivent les images
  // d'adieu des cartes détruites et le vol des cartes jouées.
  window.matchMedia = (query) => ({ matches: auDoigt && query.includes('pointer: coarse') });
  console.error = (...args) => {
    if (String(args[0]).includes('same key')) avertissements.push(String(args[0]));
    else originalConsoleError(...args);
  };
  const horloge = horlogeDuJeu();
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const rng = prng(graine);
  const decks = RPG_DECKS.filter((deck) => Array.isArray(deck.cardIds) && deck.cardIds.length);
  const deckJoueur = decks[Math.floor(rng() * decks.length)];
  const deckSorcier = decks[Math.floor(rng() * decks.length)];

  const q = (selector) => container.querySelector(selector);
  const qa = (selector) => [...container.querySelectorAll(selector)];
  const actions = [];
  const click = async (element, etiquette = '') => {
    if (!element || element.disabled) return false;
    actions.push(etiquette || element.className?.split?.(' ')?.[1] || element.tagName);
    await act(async () => element.click());
    verifier(`juste-apres:${actions[actions.length - 1]}`, { anime: true });
    if (!fantomeTeste && q('.rpg-card-destruction-fx')) {
      fantomeTeste = true;
      await surFantome({ q, qa, horloge, assert, graine });
    }
    return true;
  };
  const boutonTexte = (motif) => qa('button').find((bouton) => motif.test(texte(bouton)) && !bouton.disabled);

  const verifier = (etape, { anime = false } = {}) => {
    // Hors de la table (menu, deck, catalogue), il n'y a rien à comparer.
    if (!q('.card-table')) return;
    const contexte = `graine ${graine}${mobile ? ' (doigt)' : ''} — ${etape}`;
    // Vérité du moteur : aucune créature morte ne reste en jeu, et chaque carte
    // affichée correspond à une créature vivante.
    const etat = window.__RPG_DUEL__;
    if (etat) {
      for (const cote of ['joueur', 'sorcier']) {
        const mortes = etat[cote].creatures.filter((entite) => entite.pv <= 0);
        assert.deepEqual(mortes.map((entite) => `${entite.name} (${entite.pv} PV)`), [],
          `${contexte} : aucune créature morte ne reste dans le camp ${cote}`);
      }
      const vivantes = new Map([
        ...etat.joueur.creatures.map((entite) => [entite.id, { ...entite, cote: 'equipe' }]),
        ...etat.sorcier.creatures.map((entite) => [entite.id, { ...entite, cote: 'ennemi' }]),
      ]);
      for (const carte of qa('.card-row .rpg-card')) {
        const entite = vivantes.get(carte.dataset.entityId);
        assert.ok(entite,
          `${contexte} : ${carte.dataset.cardId} (${carte.dataset.entityId}) est affichée alors qu'elle a quitté la table`);
        const engagee = carte.dataset.combatTilted === 'true';
        if (engagee && !entite.attaquee) {
          const declare = etat.tour === 'joueur' || entite.cote === 'ennemi';
          assert.ok(declare,
            `${contexte} : ${carte.dataset.cardId} est engagée alors que le moteur la dit dégagée`);
        }
      }
      // Au doigt, les cartes identiques sont empilées : seul le grand écran
      // affiche une carte par créature.
      if (!auDoigt) {
        for (const [cote, camp] of [['equipe', etat.joueur], ['ennemi', etat.sorcier]]) {
          const affichees = qa(`.card-row--${cote} .rpg-card`).map((carte) => carte.dataset.entityId);
          assert.deepEqual([...affichees].sort(), camp.creatures.map((entite) => entite.id).sort(),
            `${contexte} : le camp ${cote} affiche exactement ses créatures vivantes`);
        }
      }
    }
    assert.equal(avertissements.length, 0, `${contexte} : clés React uniques (${avertissements[0] ?? ''})`);
    const ids = qa('.card-row .rpg-card').map((carte) => carte.dataset.entityId);
    assert.equal(new Set(ids).size, ids.length, `${contexte} : aucune carte dupliquée sur la table`);
    // Une image de destruction est légitime pendant son animation : on ne la
    // compte que lorsque l'horloge a fini de tourner.
    if (!anime) {
      assert.equal(qa('.rpg-card-destruction-fx').length, 0,
        `${contexte} : aucun effet de destruction figé sur la table`);
    }
    // Pendant une annonce du sorcier, ses créatures viennent d'être dégagées :
    // une carte encore inclinée est une carte morte restée sur le terrain.
    if (q('.rpg-annonce-sort')) {
      const inclinees = qa('.card-row--ennemi .rpg-card[data-combat-tilted="true"]');
      assert.equal(inclinees.length, 0,
        `${contexte} : aucune carte adverse engagée pendant les annonces (${inclinees.map((c) => c.dataset.cardId).join(', ')})`);
    }
    // Début du tour du joueur : toutes ses créatures sont dégagées et comptées
    // par le bouton « Attaquer avec tous » (le mal d'invocation excepté).
    const attaqueTous = q('.rpg-btn--attaque-tous');
    const finTour = q('.rpg-btn--endturn');
    if (!anime && !auDoigt && attaqueTous && finTour && !finTour.disabled && !q('.rpg-annonce-sort') && !q('.rpg-btn--resolve-combat')) {
      const mesCartes = qa('.card-row--equipe .rpg-card');
      const compte = Number(/\((\d+)\)/.exec(texte(attaqueTous))?.[1] ?? -1);
      if (etape === 'debut-de-tour') {
        const engagees = mesCartes.filter((carte) => carte.dataset.combatTilted === 'true');
        assert.equal(engagees.length, 0,
          `${contexte} : aucune de vos cartes ne reste engagée au début du tour`);
        const disponibles = mesCartes.filter((carte) => !carte.classList.contains('is-summoning-sick'));
        assert.equal(disponibles.length, compte,
          `${contexte} : les ${disponibles.length} cartes dégagées sont toutes jouables (${compte} annoncées) — ${mesCartes.map((carte) => `${carte.dataset.cardId}[${carte.className}]`).join(' | ')}`);
      }
    }
  };

  let tours = 0;
  let fin = 'pas max';
  try {
    await act(async () => root.render(
      <RpgDuelPage joueurDeck={deckJoueur.cardIds} sorcierDeck={deckSorcier.cardIds} sorcierPuissance={0} rng={rng} />,
    ));
    await click(q('.rpg-mode-menu__play .rpg-menu-button--primary'));
    await passerMulligan(container, (element) => click(element, 'mulligan'));
    await horloge.avancer(2000);
    verifier('ouverture');

    let attaqueFaite = false;
    let aJoue = true; // la première main est déjà posée par l'ouverture
    for (let pas = 0; pas < pasMax; pas += 1) {
      // Un joueur n'attend pas toujours la fin des animations : une fois sur
      // trois, on rejoue au milieu de la chaîne de minuteries du sorcier.
      const impatient = rng() < 0.35;
      await horloge.avancer(impatient ? 60 + Math.floor(rng() * 420) : 2000);
      if (q('.rpg-overlay')) { fin = 'duel terminé'; break; }
      verifier(aJoue ? 'tour' : 'debut-de-tour', { anime: impatient });

      // 1. Annonce du sorcier : répondre avec une magie rapide, ou laisser passer.
      const annonce = q('.rpg-annonce-sort__pass');
      if (annonce) {
        const ephemeres = qa('.rpg-hand__card[data-jouable="true"]');
        if (ephemeres.length && rng() < 0.5) {
          const choisie = ephemeres[Math.floor(rng() * ephemeres.length)];
          await click(choisie, `ephemere-annonce:${choisie.dataset.cardId}`);
          continue;
        }
        await click(annonce, 'passer');
        continue;
      }
      // 2. Fenêtre de combat : magie rapide, blocage, puis résolution.
      if (q('.rpg-btn--resolve-combat')) {
        const ephemeres = qa('.rpg-hand__card[data-jouable="true"]');
        if (ephemeres.length && rng() < 0.45) {
          const choisie = ephemeres[Math.floor(rng() * ephemeres.length)];
          await click(choisie, `ephemere-combat:${choisie.dataset.cardId}`);
          continue;
        }
      }
      const bloqueur = q('.card-row--equipe .rpg-card.is-blocker-draggable');
      const attaquantAdverse = q('.card-row--ennemi .rpg-card.is-blocker-target');
      if (bloqueur && attaquantAdverse && rng() < 0.7) {
        await click(bloqueur, 'bloqueur');
        await click(attaquantAdverse, 'assigner-blocage');
        continue;
      }
      if (await click(q('.rpg-btn--resolve-combat'), 'resoudre-combat')) continue;
      // 3. Confirmation d'une magie.
      if (await click(q('.rpg-spell-confirm .rpg-btn--primary'), 'confirmer-magie')) continue;
      // 4. Choix de cible en cours.
      const annulerCible = boutonTexte(/Annuler la cible/);
      if (annulerCible) {
        const cible = q('.rpg-card.is-ciblable') ?? q('.rpg-wizard-plate--ennemi.is-ciblable');
        if (!(await click(cible, `cible:${cible?.dataset?.cardId ?? 'sorcier'}`))) await click(annulerCible, 'annuler-cible');
        continue;
      }
      // 5. Attaque déclarée : confirmer, sinon annuler.
      const confirmer = q('.rpg-btn--confirmer-attaque');
      if (confirmer) {
        if (!(await click(confirmer, 'confirmer-attaque'))) await click(q('.rpg-btn--cancel-attack'), 'annuler-attaque');
        continue;
      }
      // 6. Jouer une carte de la main.
      const jouables = qa('.rpg-hand__card[data-jouable="true"]');
      if (jouables.length) {
        const carte = jouables[Math.floor(rng() * jouables.length)];
        aJoue = true;
        await click(carte, `main:${carte.dataset.cardId}`);
        continue;
      }
      // 7. Attaquer avec tout le monde une fois par tour.
      const attaqueTous = q('.rpg-btn--attaque-tous');
      if (!attaqueFaite && attaqueTous && !attaqueTous.disabled) {
        attaqueFaite = true;
        aJoue = true;
        await click(attaqueTous, 'attaquer-tous');
        continue;
      }
      // 7bis. Changer d'orientation / de taille d'écran en plein duel.
      if (rng() < 0.08) {
        auDoigt = !auDoigt;
        await act(async () => window.dispatchEvent(new window.Event('resize')));
        actions.push(`rotation:${auDoigt ? 'doigt' : 'grand'}`);
        continue;
      }
      // 7ter. Quitter la table puis reprendre la partie.
      if (rng() < 0.06) {
        const menu = boutonTexte(/^Menu$/);
        if (menu) {
          await click(menu, 'menu');
          await horloge.avancer(500);
          const reprendre = boutonTexte(/Reprendre/);
          if (reprendre) await click(reprendre, 'reprendre');
          continue;
        }
      }
      // 7quater. Déplier et replier les piles de cartes homonymes.
      const compteur = q('.rpg-card-stack__count, .rpg-card-stack__toggle');
      if (compteur && rng() < 0.3) {
        await click(compteur, 'pile');
        continue;
      }
      // 8. Annuler la dernière action de temps en temps.
      const annuler = q('.rpg-btn--undo');
      if (annuler && rng() < 0.25) {
        await click(annuler, 'annuler-action');
        continue;
      }
      // 9. Fin du tour.
      const finTour = q('.rpg-btn--endturn');
      if (finTour && !finTour.disabled) {
        attaqueFaite = false;
        aJoue = false;
        tours += 1;
        await click(finTour, 'fin-tour');
        continue;
      }
      // Rien à faire : si on a joué sans attendre, c'est que les animations du
      // sorcier tournent encore. On les laisse finir avant de crier au blocage.
      if (impatient) {
        await horloge.avancer(3000);
        verifier('apres-attente');
        continue;
      }
      fin = `bloqué : ${texte(q('.rpg-actions__message, .rpg-message, .rpg-bottombar'))?.slice(0, 160)}`;
      break;
    }
    await horloge.avancer(3000);
    verifier('fin');
  } finally {
    await act(async () => root.unmount());
    container.remove();
    horloge.restaurer();
    window.matchMedia = originalMatchMedia;
    console.error = originalConsoleError;
  }
  return { tours, fin, actions, deckJoueur: deckJoueur.id, deckSorcier: deckSorcier.id, fantomeTeste };
}

/**
 * Épreuve de relance : le joueur quitte la table pendant le tour du sorcier
 * (ses minuteries sont encore en vol), puis lance un nouveau duel. La partie
 * neuve doit être entièrement à lui — pas de combat hérité, pas de carte
 * étrangère, un bouton « Fin du tour » cliquable.
 */
export async function verifierRelance(assert) {
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = () => ({ matches: false });
  const horloge = horlogeDuJeu();
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const q = (selector) => container.querySelector(selector);
  const qa = (selector) => [...container.querySelectorAll(selector)];
  const click = async (element) => {
    if (!element || element.disabled) return false;
    await act(async () => element.click());
    return true;
  };
  const boutonTexte = (motif) => qa('button').find((bouton) => motif.test(texte(bouton)) && !bouton.disabled);

  try {
    await act(async () => root.render(
      <RpgDuelPage
        joueurDeck={[...Array(6).fill('desert'), 'chien-du-guet', 'fennec-des-decombres', 'desert', 'montagne']}
        sorcierDeck={['desert', 'desert', 'desert', 'chien-du-guet', 'fennec-des-decombres', 'montagne', 'montagne', 'montagne', 'montagne', 'montagne']}
        sorcierPuissance={0}
        rng={() => 0.5}
      />,
    ));
    await click(q('.rpg-mode-menu__play .rpg-menu-button--primary'));
    await passerMulligan(container, (element) => click(element));
    await horloge.avancer(2000);

    // Quelques tours pour que le sorcier déploie des créatures prêtes à attaquer.
    for (let tour = 0; tour < 5; tour += 1) {
      for (let geste = 0; geste < 4; geste += 1) {
        const jouable = q('.rpg-hand__card[data-jouable="true"]');
        if (!jouable) break;
        await click(jouable);
        await horloge.avancer(1200);
        await click(q('.rpg-spell-confirm .rpg-btn--primary'));
        await horloge.avancer(600);
      }
      await click(q('.rpg-btn--endturn'));
      await horloge.avancer(900);
      for (let annonce = 0; annonce < 8; annonce += 1) {
        const passer = q('.rpg-annonce-sort__pass');
        if (!passer) break;
        await click(passer);
        await horloge.avancer(1000);
      }
      if (tour === 4) break;
      await click(q('.rpg-btn--resolve-combat'));
      await horloge.avancer(1500);
    }
    assert.ok(window.__RPG_DUEL__?.sorcier.creatures.length > 0,
      'le sorcier a des créatures en jeu au moment où le joueur quitte la table');
    // On quitte la table juste après avoir rendu la main : le sorcier est en
    // train de jouer, ses minuteries sont en vol.
    await click(q('.rpg-btn--resolve-combat'));
    await horloge.avancer(300);
    await click(q('.rpg-btn--endturn'));
    await horloge.avancer(300);
    assert.ok(horloge.enAttente() > 0, 'des minuteries du sorcier sont encore en vol');
    await click(boutonTexte(/^Menu$/));
    assert.ok(!q('.card-table'), 'la table est quittée');

    await click(q('.rpg-mode-menu__play .rpg-menu-button--primary'));
    await passerMulligan(container, (element) => click(element));
    await horloge.avancer(4000);

    const etat = window.__RPG_DUEL__;
    assert.equal(qa('.rpg-card-destruction-fx').length, 0,
      'aucune image de carte détruite héritée de la partie précédente');
    assert.equal(qa('.card-row .rpg-card').length,
      (etat?.joueur.creatures.length ?? 0) + (etat?.sorcier.creatures.length ?? 0),
      'la nouvelle table n’affiche que les créatures de la nouvelle partie');
    assert.equal(Boolean(q('.rpg-btn--resolve-combat')), false,
      'aucun combat fantôme hérité de la partie précédente');
    assert.equal(q('.rpg-btn--endturn')?.disabled, false,
      'le joueur peut jouer son tour dans la nouvelle partie');
  } finally {
    await act(async () => root.unmount());
    container.remove();
    horloge.restaurer();
    window.matchMedia = originalMatchMedia;
  }
}

/** Toutes les épreuves, dans l'ordre du scénario le plus courant au plus rare. */
export async function checkRpgGhosts(assert, { graines = [1, 2, 3, 4, 5, 6] } = {}) {
  let veilleTestee = false;
  // Épreuve de veille : à la première carte détruite, on perd les minuteries
  // (onglet gelé) et on revient. La table doit se nettoyer toute seule.
  const surFantome = async ({ qa, horloge, assert: verifie }) => {
    verifie.ok(qa('.rpg-card-destruction-fx').length > 0, 'une carte détruite s’efface à l’écran');
    horloge.perdreLesMinuteries();
    await revenirDeVeille(5);
    verifie.deepEqual(qa('.rpg-card-destruction-fx').map((fx) => fx.dataset.rpgDestroyedId), [],
      'au retour de veille, aucune carte détruite ne reste sur la table');
    veilleTestee = true;
  };

  for (const mobile of [false, true]) {
    for (const graine of graines) {
      const resultat = await fuzzDuel({
        assert,
        graine,
        mobile,
        surFantome: veilleTestee ? null : surFantome,
      });
      console.log(`  graine ${graine}${mobile ? ' (doigt)' : ''} : ${resultat.tours} tours, ${resultat.deckJoueur} contre ${resultat.deckSorcier} — ${resultat.fin}`);
      if (process.env.RPG_FUZZ_TRACE) console.log(`    ${resultat.actions.slice(-40).join(' › ')}`);
    }
  }
  assert.ok(veilleTestee, 'l’épreuve de veille a bien trouvé une carte détruite à nettoyer');
  await verifierRelance(assert);
}
