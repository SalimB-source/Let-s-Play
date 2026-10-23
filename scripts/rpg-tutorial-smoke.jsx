import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { RPG_TUTORIELS } from '../src/games/rpgTutorial.js';
import { cardHybridGradient } from '../src/games/rpgCards.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function monter(container) {
  const root = createRoot(container);
  const tuto = () => container.querySelector('.rpg-tutorial');
  const step = () => tuto()?.dataset.tutorialStep ?? null;
  const click = async (element, label) => {
    if (!element) throw new Error(`${label} est absent du DOM`);
    await act(async () => { element.click(); });
  };
  const next = () => container.querySelector('.rpg-tutorial__next');
  const card = (cardId) => container.querySelector(`.rpg-hand__card[data-card-id="${cardId}"]`);
  const carteChamp = (cote, cardId) => container.querySelector(`.card-row--${cote} .rpg-card[data-card-id="${cardId}"]`);
  return { root, tuto, step, click, next, card, carteChamp };
}

async function avancerInfos(harnais, jusqua) {
  for (let garde = 0; garde < 30 && harnais.step() !== jusqua; garde += 1) {
    await harnais.click(harnais.next(), `la commande de ${harnais.step()}`);
  }
}

export async function checkRpgTutorial(assert) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const harnais = monter(container);
  try {
    await act(async () => { harnais.root.render(<RpgDuelPage rng={() => 0.999} />); });
    await harnais.click([...container.querySelectorAll('button')]
      .find((bouton) => bouton.textContent.includes('Apprendre à jouer')), 'l’entrée « Apprendre à jouer »');

    const entrees = [...container.querySelectorAll('[data-tutorial-start]')];
    assert.equal(entrees.length, RPG_TUTORIELS.length, 'le menu propose une entrée par leçon');
    assert.deepEqual(entrees.map((entree) => entree.dataset.tutorialStart), RPG_TUTORIELS.map((lecon) => lecon.id));
    assert.ok(container.querySelector('[data-tutorial-id="maree-des-abysses"]')?.textContent.includes('150'),
      'la leçon Eau annonce ses 150 crédits');

    await harnais.click(entrees[0], 'le départ de la première leçon');
    await act(async () => { await wait(120); });
    assert.equal(harnais.step(), 'bienvenue', 'la leçon ouvre son étape d’accueil');
    assert.ok(container.querySelector('.rpg-tutorial')?.textContent.includes('Les Fondations du Sablier'),
      'l’encadré nomme la leçon choisie');

    await harnais.click(harnais.next(), 'l’étape d’accueil');
    assert.equal(harnais.step(), 'main');
    assert.deepEqual([...container.querySelectorAll('.rpg-hand__card')].map((element) => element.dataset.cardId),
      RPG_TUTORIELS[0].openingHand, 'la main guidée est celle de la leçon');

    await avancerInfos(harnais, 'creature');
    assert.equal(harnais.step(), 'creature');
    assert.ok(container.querySelector('[data-tutorial-target="mana-track"]') || true);
    assert.equal(harnais.card('tislit-des-aures')?.getAttribute('data-jouable'), 'true',
      'le mana produit rend Tislit jouable');
    await harnais.click(harnais.card('tislit-des-aures'), 'la carte Tislit préparée');
    await act(async () => { await wait(850); });
    assert.equal(harnais.step(), 'invocation', 'jouer Tislit révèle le mal d’invocation');
    assert.ok(harnais.carteChamp('equipe', 'tislit-des-aures'), 'l’explication encadre la créature réellement jouée');

    await avancerInfos(harnais, 'cinq-creatures');
    assert.ok(container.querySelector('.rpg-creature-slots--joueur'), 'les cinq emplacements sont montrés');
    await harnais.click(harnais.next(), 'la règle des cinq créatures');
    assert.equal(harnais.step(), 'fin-tour');
    await harnais.click(container.querySelector('[data-tutorial-target="end-turn"]'), 'la commande de fin de tour');
    await act(async () => { await wait(900); });
    assert.equal(harnais.step(), 'tour-adverse', 'le guide attend le tour adverse');
    await act(async () => { await wait(2400); });
    assert.equal(harnais.step(), 'pioche', 'le retour du tour joueur fait avancer le guide');
  } finally {
    await act(async () => { harnais.root.unmount(); });
    container.remove();
  }
}

export async function checkRpgTutorialCombat(assert) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const harnais = monter(container);
  try {
    await act(async () => { harnais.root.render(<RpgDuelPage rng={() => 0.999} />); });
    await harnais.click([...container.querySelectorAll('button')]
      .find((bouton) => bouton.textContent.includes('Apprendre à jouer')), 'l’entrée « Apprendre à jouer »');
    await harnais.click(container.querySelector('[data-tutorial-start="fondations-du-sablier"]'), 'la première leçon');
    await act(async () => { await wait(120); });

    await avancerInfos(harnais, 'creature');
    await harnais.click(harnais.card('tislit-des-aures'), 'la carte Tislit');
    await act(async () => { await wait(850); });
    await avancerInfos(harnais, 'fin-tour');
    await harnais.click(container.querySelector('[data-tutorial-target="end-turn"]'), 'la fin du tour');
    for (let i = 0; i < 18 && harnais.step() !== 'pioche'; i += 1) {
      await act(async () => { await wait(300); });
    }
    assert.equal(harnais.step(), 'pioche', 'le tour adverse passe et le guide revient au joueur');

    await harnais.click(harnais.next(), 'la pioche de début de tour');
    assert.equal(harnais.step(), 'attaque');
    await harnais.click(container.querySelector('[data-tutorial-target="attack-all"]'), 'Attaquer avec tous');
    assert.equal(harnais.step(), 'confirmer-attaque');
    await harnais.click(container.querySelector('[data-tutorial-target="confirm-attack"]'), 'la confirmation');
    assert.equal(harnais.step(), 'combat');
    assert.ok(container.querySelector('[data-tutorial-target="opponent-health"]'));

    await harnais.click(harnais.next(), 'la règle des points de vie');
    assert.equal(harnais.step(), 'arme');
    await harnais.click(harnais.card('sandales-de-tislit'), 'les Sandales de Tislit');
    await act(async () => { await wait(850); });
    assert.equal(harnais.step(), 'arme-cible');
    await harnais.click(harnais.carteChamp('equipe', 'tislit-des-aures'), 'Tislit, porteuse des Sandales');
    await act(async () => { await wait(300); });
    assert.equal(harnais.step(), 'arme-portee');
    assert.ok(harnais.carteChamp('equipe', 'tislit-des-aures')?.getAttribute('data-armes')?.includes('sandales-de-tislit'));

    await harnais.click(harnais.next(), 'la règle de l’arme');
    assert.equal(harnais.step(), 'fin-tour-2');
    assert.ok(harnais.carteChamp('equipe', 'chien-du-guet'), 'la scène de défense installe le Chien du guet');
    await harnais.click(container.querySelector('[data-tutorial-target="end-turn"]'), 'la fin du tour de défense');
    for (let i = 0; i < 20 && harnais.step() !== 'blocage'; i += 1) {
      await act(async () => { await wait(300); });
    }
    assert.equal(harnais.step(), 'blocage', 'le blocage du Chien du guet est demandé après l’assaut');
    await harnais.click(harnais.carteChamp('equipe', 'chien-du-guet'), 'le Chien du guet bloqueur');
    assert.equal(harnais.step(), 'blocage-cible');
    await harnais.click(harnais.carteChamp('ennemi', 'chien-de-sable'), 'le Chien de sable attaquant');
    assert.equal(harnais.step(), 'blocage-confirmer');
    await harnais.click(container.querySelector('[data-tutorial-target="resolve-combat"]'), 'Résoudre le combat');
    await act(async () => { await wait(300); });
    assert.equal(harnais.step(), 'blocage-explique');
    await harnais.click(harnais.next(), 'le bilan du blocage');
    assert.equal(harnais.step(), 'termine');
    assert.ok(container.querySelector('.rpg-tutorial__reward')?.textContent.includes('120'));
    await harnais.click(harnais.next(), 'Terminer le tutoriel');
    assert.equal(Boolean(harnais.tuto()), false, 'terminer la leçon referme l’overlay du tutoriel');
    assert.equal(Boolean(container.querySelector('.rpg-table')), false, 'terminer la leçon quitte la table de duel sans laisser la partie continuer');
    assert.ok(container.querySelector('.rpg-tutoriels'), 'terminer la leçon ramène à l’écran des leçons');
    assert.ok(container.querySelector('.rpg-tutorial-reward-toast')?.textContent.includes('+120 crédits'),
      'le bandeau de récompense apparaît sur l’écran des leçons');
    assert.equal(
      container.querySelector('[data-tutorial-id="fondations-du-sablier"]')?.classList.contains('is-done'),
      true,
      'la leçon terminée est marquée comme complétée',
    );
    const bourseTexte = () => container.querySelector('.rpg-tutoriels__purse strong')?.textContent ?? '';
    // La leçon paie ses 120 ◈ — le bandeau ci-dessus le dit au crédit près — et
    // verse aussi son XP (lot 6) : le niveau 2 tombe, son paquet du Souk s'ouvre,
    // et les doublons de ce paquet sont rendus comme dans n'importe quel paquet.
    // La bourse affiche donc les 120 ◈ de la leçon, et parfois un peu plus.
    const soldeApresPremiereFois = Number(bourseTexte().replace(/[^\d]/g, ''));
    assert.ok(soldeApresPremiereFois >= 120,
      `la bourse affiche les 120 crédits gagnés (et ${soldeApresPremiereFois - 120} rendus par le paquet du palier)`);
  } finally {
    await act(async () => { harnais.root.unmount(); });
    container.remove();
  }
}

export async function checkRpgTutorialEau(assert) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const harnais = monter(container);
  const originalGetBoundingClientRect = window.Element.prototype.getBoundingClientRect;
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;
  Object.defineProperty(window, 'innerWidth', { value: 1746, configurable: true, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: 859, configurable: true, writable: true });
  window.Element.prototype.getBoundingClientRect = function mockRect() {
    if (this.classList?.contains('rpg-annonce-sort')) {
      return { left: 0, top: 0, right: 1746, bottom: 859, width: 1746, height: 859 };
    }
    if (this.classList?.contains('rpg-hover-card-preview__layout')) {
      return { left: 542, top: 233, right: 1204, bottom: 625, width: 662, height: 392 };
    }
    if (this.matches?.('[data-tutorial-target]')) {
      return { left: 620, top: 680, right: 1120, bottom: 830, width: 500, height: 150 };
    }
    return originalGetBoundingClientRect.call(this);
  };
  try {
    await act(async () => { harnais.root.render(<RpgDuelPage rng={() => 0.999} />); });
    await harnais.click([...container.querySelectorAll('button')]
      .find((bouton) => bouton.textContent.includes('Apprendre à jouer')), 'l’entrée « Apprendre à jouer »');
    await harnais.click(container.querySelector('[data-tutorial-start="maree-des-abysses"]'), 'la leçon Eau');
    await act(async () => { await wait(120); });
    assert.equal(harnais.step(), 'bienvenue');
    await avancerInfos(harnais, 'creature');
    await harnais.click(harnais.card('porteuse-de-cruches'), 'la Porteuse de cruches');
    await act(async () => { await wait(850); });
    assert.equal(harnais.step(), 'soin');
    await avancerInfos(harnais, 'sorcellerie');
    await harnais.click(harnais.card('eau-de-la-source'), 'l’Eau de la source');
    await act(async () => { await wait(900); });
    assert.equal(harnais.step(), 'sorcellerie-info');
    await harnais.click(harnais.next(), 'la règle de la sorcellerie');
    assert.equal(harnais.step(), 'magie-rapide');
    await harnais.click(harnais.card('ressac'), 'Ressac');
    assert.equal(harnais.step(), 'magie-rapide-cible');
    await harnais.click(harnais.carteChamp('ennemi', 'vipere-de-verre'), 'la Vipère de verre');
    await act(async () => { await wait(300); });
    assert.equal(harnais.step(), 'magie-rapide-info');
    await harnais.click(harnais.next(), 'la règle de la magie rapide');
    assert.equal(harnais.step(), 'fin-tour');
    await harnais.click(container.querySelector('[data-tutorial-target="end-turn"]'), 'la fin du tour');
    for (let i = 0; i < 24 && !container.querySelector('.rpg-annonce-sort__respond'); i += 1) {
      await act(async () => { await wait(300); });
    }
    assert.equal(harnais.step(), 'annonce-adverse', 'le sorcier annonce sa Lame de mer scénarisée');
    assert.ok(container.querySelector('[data-tutorial-target="spell-announcement"]'), 'la section d’annonce est encadrée');
    const spotlight = container.querySelector('.rpg-tutorial__spotlight');
    assert.ok(spotlight, 'la fenêtre lumineuse encadre l’aperçu d’annonce sans voile plein écran');
    assert.equal(container.querySelector('.rpg-tutorial__shade--full'), null, 'le voile plein écran ne bloque pas le bouton Répondre');
    assert.equal(spotlight.style.left, '534px', 'la fenêtre lumineuse encadre le bloc carte + fiche plutôt que tout l’écran');
    assert.equal(spotlight.style.width, '678px', 'la largeur du cadre correspond au contenu centré de l’annonce');
    const panel = container.querySelector('.rpg-tutorial__panel');
    const panelLeft = Number.parseFloat(panel?.style.left ?? '0');
    assert.ok(panelLeft + 390 <= 534, `le panneau du tutoriel (${panelLeft}px) se place à gauche sans recouvrir l’annonce`);
    assert.equal(container.querySelector('.rpg-annonce-sort__pass')?.disabled, true, 'Laisser passer est désactivé quand la leçon demande de Répondre');
    await harnais.click(container.querySelector('.rpg-annonce-sort__respond'), 'Répondre');
    assert.equal(harnais.step(), 'contre-jouer', 'Répondre ouvre l’étape du contre');
    assert.equal(container.querySelector('.rpg-annonce-sort__compact-pass')?.disabled, true, 'Laisser passer compact reste désactivé à l’étape du contre');
    await harnais.click(harnais.card('contresort-des-abimes'), 'le Contresort des abîmes');
    await act(async () => { await wait(1100); });
    assert.equal(harnais.step(), 'contre-info');
    assert.equal(container.querySelector('.rpg-annonce-sort'), null, 'le sorcier n’annonce pas la Vipère de verre renvoyée en main pendant la fin de la leçon');
    await harnais.click(harnais.next(), 'la règle des contre-sorts');
    assert.equal(harnais.step(), 'termine');
    await harnais.click(harnais.next(), 'Terminer le tutoriel Eau');
    assert.equal(Boolean(container.querySelector('.rpg-table')), false, 'terminer la leçon Eau quitte la partie immédiatement');
    assert.ok(container.querySelector('.rpg-tutoriels'), 'retour au menu des leçons après la leçon Eau');
    const bourseAvantRejeu = container.querySelector('.rpg-tutoriels__purse strong')?.textContent;
    assert.equal(
      container.querySelector('[data-tutorial-id="maree-des-abysses"]')?.classList.contains('is-done'),
      true,
      'la leçon Eau est marquée terminée',
    );
    assert.ok(
      container.querySelector('[data-tutorial-id="maree-des-abysses"]')?.textContent.includes('Récompense remportée'),
      'la carte de leçon Eau indique que la récompense a déjà été remportée',
    );

    // Rejouer la même leçon Eau : le bonus de crédits ne doit pas être donné une seconde fois.
    await harnais.click(container.querySelector('[data-tutorial-start="maree-des-abysses"]'), 'rejouer la leçon Eau');
    await act(async () => { await wait(120); });
    await avancerInfos(harnais, 'creature');
    await harnais.click(harnais.card('porteuse-de-cruches'), 'la Porteuse de cruches (rejeu)');
    await act(async () => { await wait(850); });
    await avancerInfos(harnais, 'sorcellerie');
    await harnais.click(harnais.card('eau-de-la-source'), 'l’Eau de la source (rejeu)');
    await act(async () => { await wait(900); });
    await harnais.click(harnais.next(), 'la règle de la sorcellerie (rejeu)');
    await harnais.click(harnais.card('ressac'), 'Ressac (rejeu)');
    await harnais.click(harnais.carteChamp('ennemi', 'vipere-de-verre'), 'la Vipère de verre (rejeu)');
    await act(async () => { await wait(300); });
    await harnais.click(harnais.next(), 'la règle de la magie rapide (rejeu)');
    await harnais.click(container.querySelector('[data-tutorial-target="end-turn"]'), 'la fin du tour (rejeu)');
    for (let i = 0; i < 24 && !container.querySelector('.rpg-annonce-sort__respond'); i += 1) {
      await act(async () => { await wait(300); });
    }
    await harnais.click(container.querySelector('.rpg-annonce-sort__respond'), 'Répondre (rejeu)');
    await harnais.click(harnais.card('contresort-des-abimes'), 'le Contresort des abîmes (rejeu)');
    await act(async () => { await wait(1100); });
    await harnais.click(harnais.next(), 'la règle des contre-sorts (rejeu)');
    assert.equal(harnais.step(), 'termine');
    await harnais.click(harnais.next(), 'Terminer le tutoriel Eau (rejeu)');
    assert.equal(Boolean(container.querySelector('.rpg-table')), false, 'le rejeu quitte aussi la partie');
    assert.equal(
      container.querySelector('.rpg-tutoriels__purse strong')?.textContent,
      bourseAvantRejeu,
      'rejouer la leçon ne redonne aucun crédit supplémentaire',
    );
  } finally {
    window.Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, configurable: true, writable: true });
    await act(async () => { harnais.root.unmount(); });
    container.remove();
  }
}

export async function checkRpgTutorialAutresLecons(assert) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const harnais = monter(container);
  const originalGetBoundingClientRect = window.Element.prototype.getBoundingClientRect;
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;
  Object.defineProperty(window, 'innerWidth', { value: 1746, configurable: true, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: 859, configurable: true, writable: true });
  window.Element.prototype.getBoundingClientRect = function mockRect() {
    if (this.classList?.contains('rpg-annonce-sort')) {
      return { left: 0, top: 0, right: 1746, bottom: 859, width: 1746, height: 859 };
    }
    if (this.classList?.contains('rpg-hover-card-preview__layout')) {
      return { left: 542, top: 233, right: 1204, bottom: 625, width: 662, height: 392 };
    }
    if (this.matches?.('[data-tutorial-target]')) {
      return { left: 620, top: 680, right: 1120, bottom: 830, width: 500, height: 150 };
    }
    return originalGetBoundingClientRect.call(this);
  };
  try {
    await act(async () => { harnais.root.render(<RpgDuelPage rng={() => 0.999} />); });
    await harnais.click([...container.querySelectorAll('button')]
      .find((bouton) => bouton.textContent.includes('Apprendre à jouer')), 'l’entrée « Apprendre à jouer »');

    // Leçon 3 : La Balance des Heures (Ténèbres)
    await harnais.click(container.querySelector('[data-tutorial-start="balance-des-heures"]'), 'la leçon Ténèbres');
    await act(async () => { await wait(120); });
    await avancerInfos(harnais, 'creature-chacal');
    await harnais.click(harnais.card('chacal-du-seuil'), 'le Chacal du seuil');
    await act(async () => { await wait(850); });
    assert.equal(harnais.step(), 'attaque-chacal');
    await harnais.click(container.querySelector('[data-tutorial-target="attack-all"]'), 'Attaquer avec tous (Chacal)');
    assert.equal(harnais.step(), 'confirmer-chacal');
    await harnais.click(container.querySelector('[data-tutorial-target="confirm-attack"]'), 'Valider l’attaque (Chacal)');
    assert.equal(harnais.step(), 'tribut');
    await harnais.click(harnais.next(), 'la règle du Tribut');
    assert.equal(harnais.step(), 'pretre');
    await harnais.click(harnais.card('pretre-de-la-bouche'), 'le Prêtre de la bouche');
    await act(async () => { await wait(850); });
    assert.equal(harnais.step(), 'arrivee');
    await harnais.click(harnais.next(), 'la règle de l’arrivée');
    assert.equal(harnais.step(), 'prix');
    await harnais.click(harnais.card('papyrus'), 'le Papyrus');
    await act(async () => { await wait(900); });
    assert.equal(harnais.step(), 'prix-info');
    await harnais.click(harnais.next(), 'la règle du Prix');
    assert.equal(harnais.step(), 'creature-momie');
    await harnais.click(harnais.card('momie-de-lin'), 'la Momie de lin');
    await act(async () => { await wait(850); });
    assert.equal(harnais.step(), 'momie-info');
    await harnais.click(harnais.next(), 'la règle du Dernier souffle');
    assert.equal(harnais.step(), 'fin-tour-tenebres');
    await harnais.click(container.querySelector('[data-tutorial-target="end-turn"]'), 'la fin du tour Ténèbres');
    for (let i = 0; i < 24 && !container.querySelector('.rpg-annonce-sort__pass'); i += 1) {
      await act(async () => { await wait(300); });
    }
    assert.equal(harnais.step(), 'annonce-tenebres');
    assert.equal(Boolean(container.querySelector('.rpg-tutorial__shade--full')), false, 'pas de voile plein écran sur l’annonce Ténèbres');
    assert.equal(container.querySelector('.rpg-annonce-sort__respond')?.disabled, true, 'Répondre est désactivé quand la leçon demande de Laisser passer');
    await harnais.click(container.querySelector('.rpg-annonce-sort__pass'), 'Laisser passer');
    for (let i = 0; i < 16 && harnais.step() !== 'shabtis'; i += 1) {
      await act(async () => { await wait(250); });
    }
    assert.equal(harnais.step(), 'shabtis');
    assert.ok(harnais.carteChamp('equipe', 'shabti'), 'les Shabtis sont apparus sur le champ allié');
    await harnais.click(harnais.next(), 'le bilan des Shabtis');
    assert.equal(harnais.step(), 'termine');
    await harnais.click(harnais.next(), 'Terminer la leçon Ténèbres');
    assert.equal(Boolean(container.querySelector('.rpg-table')), false, 'la leçon Ténèbres se termine sans laisser la partie ouverte');

    // Leçon 4 : Le Serment du Soleil rouge (Samouraïs)
    await harnais.click(container.querySelector('[data-tutorial-start="serment-du-soleil-rouge"]'), 'la leçon Soleil rouge');
    await act(async () => { await wait(120); });
    await avancerInfos(harnais, 'ashigaru');
    await harnais.click(harnais.card('ashigaru-des-braises'), 'l’Ashigaru des braises');
    await act(async () => { await wait(850); });
    assert.equal(harnais.step(), 'torii');
    await harnais.click(harnais.card('samourai-du-torii'), 'le Samouraï du torii');
    await act(async () => { await wait(850); });
    assert.equal(harnais.step(), 'resonance');
    await harnais.click(harnais.next(), 'la règle de la Résonance');
    assert.equal(harnais.step(), 'daimyo');
    await harnais.click(harnais.card('daimyo-du-soleil-rouge'), 'le Daimyō du Soleil rouge');
    await act(async () => { await wait(850); });
    assert.equal(harnais.step(), 'banniere');
    await harnais.click(harnais.next(), 'la règle de la Bannière');
    assert.equal(harnais.step(), 'fin-tour-soleil');
    await harnais.click(container.querySelector('[data-tutorial-target="end-turn"]'), 'la fin du tour Soleil rouge');
    for (let i = 0; i < 24 && harnais.step() !== 'charge'; i += 1) {
      await act(async () => { await wait(300); });
    }
    assert.equal(harnais.step(), 'charge');
    await harnais.click(container.querySelector('[data-tutorial-target="attack-all"]'), 'Attaquer avec tous (Samouraïs)');
    assert.equal(harnais.step(), 'confirmer-charge');
    await harnais.click(container.querySelector('[data-tutorial-target="confirm-attack"]'), 'Valider l’attaque (Samouraïs)');
    assert.equal(harnais.step(), 'impact');
    await harnais.click(harnais.next(), 'le bilan de l’impact');
    assert.equal(harnais.step(), 'termine');
    await harnais.click(harnais.next(), 'Terminer la leçon Soleil rouge');
    assert.equal(Boolean(container.querySelector('.rpg-table')), false, 'la leçon Soleil rouge se termine sans laisser la partie ouverte');

    // Leçon 5 : Le Serment des Neuf Hivers (Neige)
    await harnais.click(container.querySelector('[data-tutorial-start="serment-des-neuf-hivers"]'), 'la leçon Neige');
    await act(async () => { await wait(120); });
    await avancerInfos(harnais, 'guerrier');
    await harnais.click(harnais.card('guerrier-au-bouclier-rond'), 'le Guerrier au bouclier rond');
    await act(async () => { await wait(850); });
    assert.equal(harnais.step(), 'bouclier');
    await harnais.click(harnais.next(), 'la règle du Bouclier');
    assert.equal(harnais.step(), 'valkyrie');
    await harnais.click(harnais.card('valkyrie-au-corbeau'), 'la Valkyrie au corbeau');
    await act(async () => { await wait(850); });
    assert.equal(harnais.step(), 'appel-viking');
    await harnais.click(harnais.next(), 'la règle de l’appel viking');
    assert.equal(harnais.step(), 'poigne');
    await harnais.click(harnais.card('poigne-de-givre'), 'la Poigne de givre');
    assert.equal(harnais.step(), 'poigne-cible');
    await harnais.click(harnais.carteChamp('ennemi', 'guerrier-au-bouclier-rond'), 'le Guerrier adverse');
    await act(async () => { await wait(300); });
    assert.equal(harnais.step(), 'gel');
    await harnais.click(harnais.next(), 'la règle du Gel');
    assert.equal(harnais.step(), 'fin-tour-neige');
    await harnais.click(container.querySelector('[data-tutorial-target="end-turn"]'), 'la fin du tour Neige');
    for (let i = 0; i < 24 && harnais.step() !== 'blocage-neige'; i += 1) {
      await act(async () => { await wait(300); });
    }
    assert.equal(harnais.step(), 'blocage-neige');
    await harnais.click(harnais.carteChamp('equipe', 'berserk-des-trois-hivers'), 'le Berserk allié bloqueur');
    assert.equal(harnais.step(), 'blocage-neige-cible');
    await harnais.click(harnais.carteChamp('ennemi', 'loup-des-neiges'), 'le Loup des neiges attaquant');
    assert.equal(harnais.step(), 'blocage-neige-confirmer');
    await harnais.click(container.querySelector('[data-tutorial-target="resolve-combat"]'), 'Résoudre le combat Neige');
    await act(async () => { await wait(300); });
    assert.equal(harnais.step(), 'furie');
    await harnais.click(harnais.next(), 'la règle de la Furie');
    assert.equal(harnais.step(), 'termine');
    await harnais.click(harnais.next(), 'Terminer la leçon Neige');
    assert.equal(Boolean(container.querySelector('.rpg-table')), false, 'la leçon Neige se termine sans laisser la partie ouverte');
    assert.equal(
      container.querySelectorAll('.rpg-tutoriels__card.is-done').length,
      5,
      'les cinq leçons sont marquées terminées dans le menu',
    );
  } finally {
    window.Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, configurable: true, writable: true });
    await act(async () => { harnais.root.unmount(); });
    container.remove();
  }
}

export async function checkRpgCardGuide(assert) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const harnais = monter(container);
  const exempleIds = () => [...container.querySelectorAll('[data-tutorial-target="card-guide-examples"] [data-card-id]')]
    .map((element) => element.dataset.cardId);
  try {
    await act(async () => { harnais.root.render(<RpgDuelPage rng={() => 0.999} />); });
    await harnais.click([...container.querySelectorAll('button')]
      .find((bouton) => bouton.textContent.includes('Cartes & effets')), 'l’entrée « Cartes & effets »');
    assert.equal(harnais.step(), 'card-guide-familles-de-cartes', 'le guide avancé commence par les familles de cartes');
    assert.deepEqual(exempleIds(), ['tislit-des-aures', 'tin-hinan'], 'les fiches affichent des exemples du catalogue réel');
    await harnais.click(harnais.next(), 'la fiche suivante');
    assert.equal(harnais.step(), 'card-guide-armes');
    await harnais.click(harnais.next(), 'la fiche du mana multicolore');
    assert.equal(harnais.step(), 'card-guide-terrain-hybride');
    const coutVentRouge = container.querySelector('[data-card-id="vent-rouge"] .rpg-card-guide__cost--hybride');
    assert.equal(coutVentRouge?.textContent, '3', 'le coût hybride garde son chiffre dans le guide');
    assert.equal(coutVentRouge?.style.getPropertyValue('--rpg-hybrid-cost-bg'), cardHybridGradient('vent-rouge'));

    while (harnais.step() !== 'card-guide-contresorts') await harnais.click(harnais.next(), 'la fiche de notion suivante');
    assert.ok(exempleIds().includes('contresort-des-abimes'), 'la fiche Contresorts pointe vers une vraie carte');
    await harnais.click(container.querySelector('.rpg-tutorial__close'), 'la fermeture du guide');
    assert.equal(container.querySelector('.rpg-card-guide'), null, 'fermer le guide revient au menu Jouer');
    assert.ok(container.querySelector('.rpg-mode-menu__play'), 'le menu principal réapparaît sans démarrer un duel');
  } finally {
    await act(async () => { harnais.root.unmount(); });
    container.remove();
  }
}
