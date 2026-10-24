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
  // Jouer une carte : la cliquer. Une créature ouvre alors le choix de sa case
  // (mode sans terrains) : on clique la première case libre, comme le joueur.
  // Le sort, lui, passe par sa fenêtre de confirmation.
  const jouer = async (id) => {
    const carte = hand(id);
    assert.equal(carte?.dataset.jouable, 'true', `${id} est jouable`);
    await click(carte);
    const boutonCase = container.querySelector('.rpg-creature-slot--choix');
    if (boutonCase) await click(boutonCase);
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
  // Sans terrain, un tour adverse court longtemps : fenêtre de réponse (600 ms),
  // bascule du tour, réflexion du sorcier (700 ms), présentation de ses cartes
  // (1 s chacune), combat, puis sa propre fin de tour qui se referme seule
  // quand la main du joueur ne peut pas répondre. Plutôt que de deviner la
  // longueur de la chaîne, on fait courir l'horloge par pas et on sert chaque
  // fenêtre dès qu'elle s'ouvre, jusqu'à ce que le tour du joueur revienne.
  // `resoudre: false` s'arrête la fenêtre de combat ouverte — le scénario
  // veut lire les attaquants déclarés avant de la trancher lui-même.
  const finirTour = async ({ resoudre = true } = {}) => {
    await click(container.querySelector('.rpg-btn--endturn'));
    for (let etape = 0; etape < 16; etape += 1) {
      await horloge.avancer(600);
      // Main trop pleine en fin de tour : la page attend la carte à écarter.
      // On sacrifie la dernière pioche et on valide.
      if (container.querySelector('.rpg-discard-prompt')) {
        const carteAEcarter = [...container.querySelectorAll('.rpg-hand__card')].at(-1);
        if (carteAEcarter) await click(carteAEcarter);
        const validerDefausse = container.querySelector('.rpg-btn--discard-confirm');
        if (validerDefausse) await click(validerDefausse);
        continue;
      }
      const passerAnnonce = container.querySelector('.rpg-annonce-sort__pass');
      if (passerAnnonce) { await click(passerAnnonce); continue; }
      const combat = container.querySelector('.rpg-btn--resolve-combat');
      if (combat && !resoudre) return;
      if (combat) { await click(combat); continue; }
      const passerFin = container.querySelector('.rpg-fin-tour button');
      if (passerFin) { await click(passerFin); continue; }
      const fin = container.querySelector('.rpg-btn--endturn');
      if (fin && !fin.disabled) return;
    }
    assert.fail('le tour adverse doit finir par rendre la main');
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
  // Trente cartes mono-Sable, tirées à l'identique (rng 0.999) : la main de
  // départ tient la Fennec et deux Tislit ; les pioches des tours 2 et 3
  // amenènt les deux Chiens du guet, celle du tour 4 une seconde Fennec qui
  // restera en main. Le sorcier, mono-Braise, ne tient que des créatures
  // hors de prix et les Feux de kitsune (coût 5) : ses premiers tours sont
  // muets et le sort ne peut tomber que lors de son cinquième tour.
  // Trente cartes, limites de copies respectées : les paires sont des
  // communes et inhabituelles, les rares et mythiques restent uniques.
  const REMPLISSAGE_SABLE = ['mousse-des-galiotes', 'sandales-de-tislit', 'licou-du-chien-de-sable', 'faiseur-de-passage', 'tiziri-du-djurdjura', 'rempart-de-dunes', 'cuirasse-de-sel', 'javelot-du-beffroi', 'tercio-de-cuivre', 'guetteur-du-beffroi', 'rapport-du-greffier', 'takouba-des-pistes'];
  const joueurDeck = [...REMPLISSAGE_SABLE.flatMap((id) => [id, id]), 'fennec-des-decombres', 'chien-du-guet', 'chien-du-guet', 'tislit-des-aures', 'tislit-des-aures', 'fennec-des-decombres'];
  const REMPLISSAGE_BRAISE = [...['ashigaru-des-braises', 'ghul-des-cendres', 'hatamoto-des-cendres', 'ronin-du-soleil-rouge', 'tour-de-braise'].flatMap((id) => [id, id]), 'samourai-du-torii', 'kenshi-de-la-forge', 'sahir-des-braises', 'braisier-du-souk', 'onna-musha-des-cendres', 'tengu-du-mont-ardent', 'oni-de-la-fournaise', 'daimyo-du-soleil-rouge', 'anqa-des-braises', 'ifrit-des-ergs', 'feriel', 'ifrit-al-ahmar', 'frappe-iaijutsu', 'armure-de-cendres'];
  const sorcierDeck = [...REMPLISSAGE_BRAISE, 'lionne-du-midi-ardent', 'kagutsuchi-flamme-originelle', 'cavalier-des-deux-sabres', 'orochi', 'susanoo', 'feux-de-kitsune'];
  await avecDuel(assert, { joueurDeck, sorcierDeck }, async ({ container, click, jouer, camp, finirTour, annonces, avancer }) => {
    await finirTour();
    await jouer('fennec-des-decombres');
    await finirTour();
    await jouer('chien-du-guet');
    await finirTour();
    await jouer('chien-du-guet');
    await finirTour();

    const chiens = camp('equipe', 'chien-du-guet');
    assert.equal(chiens.length, 2, 'les deux exemplaires sont visibles sur grand écran');
    const ids = chiens.map((carte) => carte.dataset.entityId);
    await click(container.querySelector('.rpg-btn--attaque-tous'));
    await click(container.querySelector('.rpg-btn--confirmer-attaque'));
    assert.ok(chiens.every((carte) => carte.classList.contains('is-attacked')), 'les deux Chiens ont attaqué');

    await click(container.querySelector('.rpg-btn--endturn'));
    await avancer(2600);
    assert.match(container.querySelector('.rpg-annonce-sort')?.textContent ?? '', /Fennec/,
      'le sorcier cible la première créature, avant les deux exemplaires identiques');
    await annonces();
    // La fin de tour du sorcier se referme d'elle-même (aucune magie rapide
    // en main), puis le tour revient : les survivants se dégagent.
    await avancer(1600);
    const passerFin = container.querySelector('.rpg-fin-tour button');
    if (passerFin) await click(passerFin);
    await avancer(400);
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
  // Trente cartes de part et d'autre, tirées à l'identique (rng 0.999). Le
  // joueur, mono-Braise, tient le Trait de braise dès la main de départ et
  // rien d'abordable avant le cinquième tour. Le sorcier, mono-Sable, ouvre
  // sur la Fennec et deux créatures hors de prix, puis pioche un Chien du
  // guet à chacun de ses tours 3 et 4 : sa rangée se remplit dans l'ordre,
  // une seule créature abordable par tour.
  const REMPLISSAGE_BRAISE2 = [...['ashigaru-des-braises', 'ghul-des-cendres', 'hatamoto-des-cendres', 'ronin-du-soleil-rouge', 'tour-de-braise'].flatMap((id) => [id, id]), 'samourai-du-torii', 'kenshi-de-la-forge', 'sahir-des-braises', 'braisier-du-souk', 'onna-musha-des-cendres', 'tengu-du-mont-ardent', 'oni-de-la-fournaise', 'daimyo-du-soleil-rouge', 'anqa-des-braises', 'ifrit-des-ergs', 'feriel', 'ifrit-al-ahmar', 'frappe-iaijutsu', 'armure-de-cendres'];
  const joueurDeck = [...REMPLISSAGE_BRAISE2, 'lionne-du-midi-ardent', 'kagutsuchi-flamme-originelle', 'cavalier-des-deux-sabres', 'orochi', 'susanoo', 'trait-de-braise'];
  // Le sorcier, mono-Sable : la main de départ tient la Mousse des galiotes
  // (1/2 sans Butin ni Rapidité ni déclencheur d'arrivée) et deux créatures
  // à 5 mana, injouables avant le cinquième tour. La Mousse entre dès le
  // premier tour, les pioches des tours 3 et 4 amenènt les deux Chiens du
  // guet, celle du cinquième le Négociant : la rangée se remplit dans
  // l'ordre.
  const REMPLISSAGE_SABLE2 = ['tislit-des-aures', 'sandales-de-tislit', 'licou-du-chien-de-sable', 'faiseur-de-passage', 'rempart-de-dunes', 'cuirasse-de-sel', 'javelot-du-beffroi', 'tercio-de-cuivre', 'guetteur-du-beffroi', 'amayas-du-hoggar', 'tiziri-du-djurdjura'].flatMap((id) => [id, id]);
  const sorcierDeck = [...REMPLISSAGE_SABLE2, 'negociant-des-ranscons', 'chien-du-guet', 'chien-du-guet', 'dame-aux-ailes-d-or', 'tin-hinan', 'faucon-du-zenith', 'cavalier-amazigh-du-desert', 'mousse-des-galiotes'];
  await avecDuel(assert, { joueurDeck, sorcierDeck }, async ({ container, click, jouer, camp, finirTour, avancer }) => {
    await finirTour();
    await finirTour();
    await finirTour();
    await finirTour();
    await finirTour();
    // La rangée adverse se lit en miroir : la case 0 — la première posée —
    // est à droite. Les deux Chiens du guet occupent les premières cases,
    // le Négociant des prises, posé au cinquième tour, entre à gauche.
    assert.deepEqual(camp('ennemi').map((carte) => carte.dataset.cardId).slice(0, 3), [
      'mousse-des-galiotes', 'chien-du-guet', 'chien-du-guet',
    ], 'la première créature précède les deux exemplaires identiques');
    const chiens = camp('ennemi', 'chien-du-guet');
    const ids = chiens.map((carte) => carte.dataset.entityId);
    assert.ok(chiens.every((carte) => carte.classList.contains('is-attacked')), 'les deux Chiens adverses ont attaqué');

    await jouer('trait-de-braise');
    await click(camp('ennemi', 'mousse-des-galiotes')[0]);
    assert.equal(camp('ennemi', 'mousse-des-galiotes').length, 0, 'le sort détruit la Mousse adverse');
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
    // La fin de tour du sorcier attend la réponse du joueur — la Frappe
    // d'iaijutsu en main laisse la fenêtre ouverte : on la laisse venir,
    // on passe, et le tour revient après la bascule.
    for (let patience = 0; patience < 12; patience += 1) {
      await avancer(300);
      if (container.querySelector('.rpg-btn--endturn')?.disabled === false) break;
      const passerFinCombat = container.querySelector('.rpg-annonce-sort__compact-pass');
      if (passerFinCombat) { await click(passerFinCombat); continue; }
    }
    assert.equal(container.querySelector('.rpg-btn--endturn').disabled, false, 'le duel continue après le combat adverse');
  });
}

export async function checkRpgCardState(assert) {
  await scenarioCouleursStats(assert);
  await scenarioDoublonsJoueur(assert);
  await scenarioDoublonsSorcier(assert);
  console.log('✓ Cartes de table : buffs bleu clair, debuffs rouges et aucune copie fantôme après une destruction dans les deux camps.');
}
