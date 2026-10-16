// Régressions des cartes sur table : couleurs des stats, vrais tours et interactions dans jsdom.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage, { TableCard } from '../src/games/RpgDuelPage.jsx';
import { lancerDuelDepuisMenu, passerMulligan } from './rpg-duel-start.js';

// Seuls les délais du jeu sont virtuels : aucun sommeil réel entre les tours.
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

async function avecDuel(assert, props, scenario, { mobile = false } = {}) {
  const originalMatchMedia = window.matchMedia;
  const originalConsoleError = console.error;
  const avertissementsCles = [];
  window.matchMedia = (query) => ({
    matches: query.includes('prefers-reduced-motion') || (mobile && query.includes('pointer: coarse')),
  });
  console.error = (...args) => {
    if (String(args[0]).includes('Encountered two children with the same key')) avertissementsCles.push(args);
    else originalConsoleError(...args);
  };
  const horloge = horlogeDuJeu();
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const click = async (element) => {
    assert.ok(element, 'la commande existe');
    assert.equal(element.disabled, false, 'la commande est disponible');
    await act(async () => element.click());
  };
  const hand = (id) => container.querySelector(`.rpg-hand__card[data-card-id="${id}"]`);
  const camp = (cote, id) => [...container.querySelectorAll(`.card-row--${cote} .rpg-card${id ? `[data-card-id="${id}"]` : ''}`)];
  const jouer = async (id) => {
    const carte = hand(id);
    assert.equal(carte?.dataset.jouable, 'true', `${id} est jouable`);
    await click(carte);
    const confirmer = container.querySelector('.rpg-spell-confirm .rpg-btn--primary');
    if (confirmer) await click(confirmer);
  };
  const annonces = async () => {
    for (let i = 0; i < 12; i += 1) {
      const passer = container.querySelector('.rpg-annonce-sort__pass');
      if (!passer) return;
      await click(passer);
      await horloge.avancer(1000);
    }
    assert.fail('le sorcier doit finir ses annonces');
  };
  const finirTour = async ({ resoudre = true } = {}) => {
    await click(container.querySelector('.rpg-btn--endturn'));
    await horloge.avancer(800);
    await annonces();
    const combat = container.querySelector('.rpg-btn--resolve-combat');
    if (combat && resoudre) await click(combat);
    // Fin de tour du sorcier : le joueur peut répondre par une magie rapide ; ici il passe.
    const passer = container.querySelector('.rpg-fin-tour button');
    if (passer && resoudre) await click(passer);
  };
  try {
    await act(async () => root.render(<RpgDuelPage {...props} sorcierPuissance={0} rng={() => .999} />));
    await lancerDuelDepuisMenu(container, click);
    await passerMulligan(container, click);
    await scenario({ container, click, jouer, camp, finirTour, annonces, avancer: horloge.avancer });
    assert.equal(avertissementsCles.length, 0, 'chaque exemplaire visible garde une clé React unique');
  } finally {
    await act(async () => root.unmount());
    container.remove();
    horloge.restaurer();
    window.matchMedia = originalMatchMedia;
    console.error = originalConsoleError;
  }
}

async function scenarioCouleursStats(assert) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const entite = (id, atk, pv) => ({
    id,
    carteId: 'chien-du-guet',
    name: 'Chien du guet',
    atk,
    def: pv,
    pv,
    pvMax: pv,
    ready: true,
    attaquee: false,
  });
  try {
    await act(async () => root.render(
      <div>
        <TableCard entite={entite('buff', 4, 4)} cote="joueur" tilt={0} />
        <TableCard entite={entite('neutre', 2, 2)} cote="joueur" tilt={0} />
        <TableCard entite={entite('debuff', 1, 1)} cote="ennemi" tilt={0} />
        <TableCard entite={entite('mixte', 4, 1)} cote="joueur" tilt={0} />
      </div>,
    ));
    const stats = (id) => [...container.querySelectorAll(`[data-entity-id="${id}"] .rpg-card__foot > span`)];
    const [attaqueBuff, defenseBuff] = stats('buff');
    const [attaqueNeutre, defenseNeutre] = stats('neutre');
    const [attaqueDebuff, defenseDebuff] = stats('debuff');
    const [attaqueMixte, defenseMixte] = stats('mixte');

    assert.ok(attaqueBuff.classList.contains('is-buffed') && defenseBuff.classList.contains('is-buffed'),
      'un bonus ATQ/DÉF applique séparément l’état bleu clair aux deux plaques');
    assert.deepEqual([attaqueBuff.dataset.statVariation, defenseBuff.dataset.statVariation], ['buff', 'buff']);
    assert.ok(attaqueDebuff.classList.contains('is-debuffed') && defenseDebuff.classList.contains('is-debuffed'),
      'un malus ATQ/DÉF applique séparément l’état rouge aux deux plaques');
    assert.deepEqual([attaqueDebuff.dataset.statVariation, defenseDebuff.dataset.statVariation], ['debuff', 'debuff']);
    assert.deepEqual([attaqueMixte.dataset.statVariation, defenseMixte.dataset.statVariation], ['buff', 'debuff'],
      'une même créature peut montrer son ATQ en bleu clair et sa DÉF en rouge');
    assert.equal(attaqueNeutre.dataset.statVariation, undefined, 'une ATQ imprimée reste neutre');
    assert.equal(defenseNeutre.dataset.statVariation, undefined, 'une DÉF imprimée reste neutre');
    assert.match(container.querySelector('[data-entity-id="buff"]').getAttribute('aria-label'),
      /attaque 4, défense 4, attaque augmentée, défense augmentée/,
      'les bonus sont aussi annoncés sans dépendre du bleu clair');
    assert.match(container.querySelector('[data-entity-id="debuff"]').getAttribute('aria-label'),
      /attaque 1, défense 1, attaque diminuée, défense diminuée/,
      'les malus sont aussi annoncés sans dépendre du rouge');
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
}

async function scenarioDoublonsJoueur(assert) {
  await avecDuel(assert, {
    joueurDeck: [...Array(5).fill('desert'), 'chien-du-guet', 'chien-du-guet', 'fennec-des-decombres', 'desert', 'montagne'],
    // Le Trait n'est pioché qu'au cinquième tour adverse.
    sorcierDeck: ['trait-de-braise', ...Array(9).fill('montagne')],
  }, async ({ container, click, jouer, camp, finirTour, annonces, avancer }) => {
    await jouer('montagne');
    await finirTour();
    await jouer('desert');
    await jouer('fennec-des-decombres');
    await finirTour();
    await jouer('desert');
    await jouer('chien-du-guet');
    await finirTour();
    await jouer('desert');
    await jouer('chien-du-guet');
    await finirTour();

    const chiens = camp('equipe', 'chien-du-guet');
    assert.equal(chiens.length, 2, 'les deux exemplaires sont visibles sur grand écran');
    const ids = chiens.map((carte) => carte.dataset.entityId);
    await click(container.querySelector('.rpg-btn--attaque-tous'));
    await click(container.querySelector('.rpg-btn--confirmer-attaque'));
    assert.ok(chiens.every((carte) => carte.classList.contains('is-attacked')), 'les deux Chiens ont attaqué');

    await click(container.querySelector('.rpg-btn--endturn'));
    await avancer(800);
    assert.match(container.querySelector('.rpg-annonce-sort')?.textContent ?? '', /Fennec/,
      'le sorcier cible la première créature, avant les deux exemplaires identiques');
    await annonces();
    assert.equal(camp('equipe', 'fennec-des-decombres').length, 0, 'le Fennec détruit quitte la table');
    const survivants = camp('equipe', 'chien-du-guet');
    assert.equal(survivants.length, 2, 'la destruction ne laisse aucune carte fantôme engagée');
    assert.deepEqual(survivants.map((carte) => carte.dataset.entityId), ids, 'les exemplaires survivants gardent leur identité');
    assert.ok(survivants.every((carte) => carte.classList.contains('is-pret')
      && !carte.classList.contains('is-attacked') && carte.dataset.combatTilted === 'false'),
    'au tour suivant, les deux survivants se dégagent visuellement');
    assert.equal(container.querySelector('.rpg-btn--attaque-tous')?.textContent.includes('(2)'), true,
      'seules les deux vraies créatures sont proposées pour attaquer');
    await click(survivants[0]);
    await click(container.querySelector('.rpg-btn--cancel-attack'));
    assert.ok(camp('equipe').every((carte) => carte.dataset.combatTilted === 'false'),
      'une déclaration annulée ne laisse aucune copie inclinée');
  });
}

async function scenarioDoublonsSorcier(assert) {
  await avecDuel(assert, {
    joueurDeck: [...Array(8).fill('desert'), 'trait-de-braise', 'montagne'],
    // Le Sable arrive au troisième tour : le Fennec entre avant les Chiens.
    sorcierDeck: ['desert', 'desert', 'desert', 'montagne', 'montagne', 'chien-du-guet', 'chien-du-guet', 'fennec-des-decombres', 'montagne', 'montagne'],
  }, async ({ container, click, jouer, camp, finirTour }) => {
    await jouer('montagne');
    await finirTour();
    for (let tour = 2; tour <= 5; tour += 1) {
      await jouer('desert');
      await finirTour();
    }
    assert.deepEqual(camp('ennemi').map((carte) => carte.dataset.cardId), [
      'fennec-des-decombres', 'chien-du-guet', 'chien-du-guet',
    ], 'la première créature précède les deux exemplaires identiques');
    const chiens = camp('ennemi', 'chien-du-guet');
    const ids = chiens.map((carte) => carte.dataset.entityId);
    assert.ok(chiens.every((carte) => carte.classList.contains('is-attacked')), 'les deux Chiens adverses ont attaqué');

    await jouer('trait-de-braise');
    await click(camp('ennemi', 'fennec-des-decombres')[0]);
    assert.equal(camp('ennemi', 'fennec-des-decombres').length, 0, 'le sort détruit le Fennec adverse');
    const survivants = camp('ennemi', 'chien-du-guet');
    assert.equal(survivants.length, 2, 'aucune carte fantôme ne reste dans le camp du sorcier');
    assert.deepEqual(survivants.map((carte) => carte.dataset.entityId), ids, 'les adversaires survivants gardent leur identité');
    assert.ok(survivants.every((carte) => carte.classList.contains('is-attacked')),
      'une créature ne se dégage pas avant le tour de son propriétaire');

    await finirTour({ resoudre: false });
    const attaquants = camp('ennemi', 'chien-du-guet');
    assert.equal(attaquants.length, 2, 'la nouvelle attaque ne ressuscite pas de copie fantôme');
    assert.ok(attaquants.every((carte) => carte.classList.contains('is-declared-attacker')
      && !carte.classList.contains('is-attacked')), 'chaque vrai exemplaire adverse peut attaquer de nouveau');
    await click(container.querySelector('.rpg-btn--resolve-combat'));
    assert.equal(container.querySelector('.rpg-btn--endturn').disabled, false, 'le duel continue après le combat adverse');
  });
}

export async function checkRpgCardState(assert) {
  await scenarioCouleursStats(assert);
  await scenarioDoublonsJoueur(assert);
  await scenarioDoublonsSorcier(assert);
  console.log('✓ Cartes de table : buffs bleu clair, debuffs rouges et aucune copie fantôme après une destruction dans les deux camps.');
}
