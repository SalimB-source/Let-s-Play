// Le mulligan du Sablier, rendu dans jsdom : la main de départ s'affiche en
// grand, le joueur choisit ce qu'il change, valide, relit sa nouvelle main, et
// la table ne s'ouvre qu'ensuite.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { rpgPeutMulligan } from '../src/games/rpgDuel.js';
import { cardById } from '../src/games/rpgCards.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Les decks du scénario : 5 premiers cartes en main, le reste au paquet. */
const DECK_JOUER = ['desert', 'chien-du-guet', 'fennec-des-decombres', 'mer', 'montagne', 'ressac', 'parade-du-verre', 'veilleur-du-couchant', 'desert', 'desert'];
const DECK_SORCIER = ['montagne', 'desert', 'chien-du-guet', 'fennec-des-decombres', 'dune-marchante', 'montagne', 'chien-du-guet', 'desert', 'djinn-du-souk', 'vipere-de-verre'];

export async function checkRpgMulligan(assert) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const q = (selector) => container.querySelector(selector);
  const qa = (selector) => [...container.querySelectorAll(selector)];
  const click = async (element, message = 'la commande existe') => {
    assert.ok(element, message);
    await act(async () => { element.click(); });
  };
  const volet = () => q('.rpg-mulligan');
  const cartes = () => qa('.rpg-mulligan__card');
  const titre = () => q('.rpg-mulligan__head h2')?.textContent ?? '';
  const main = () => qa('.rpg-hand__card').map((carte) => carte.dataset.cardId);

  await act(async () => {
    root.render(<RpgDuelPage joueurDeck={DECK_JOUER} sorcierDeck={DECK_SORCIER} rng={() => 0.5} />);
  });
  await click(q('.rpg-mode-menu__play .rpg-menu-button--primary'), 'le menu Jouer lance le duel');
  await act(async () => { await wait(120); });

  // ── 1. L'ouverture du duel est tenue par le volet, pas par la table ──────
  assert.ok(volet(), 'le duel s’ouvre sur le volet du mulligan');
  assert.equal(volet().getAttribute('role'), 'dialog', 'le volet est une boîte de dialogue modale');
  assert.match(volet().getAttribute('aria-label'), /Mulligan/, 'le volet se nomme pour les lecteurs d’écran');
  assert.equal(q('.card-table').hasAttribute('inert'), true, 'la table est close tant que la main n’est pas validée');
  assert.equal(cartes().length, 5, 'les cinq cartes piochées sont toutes présentées');
  assert.deepEqual(cartes().map((carte) => carte.dataset.cardId), main(),
    'le volet montre exactement la main de départ, dans le même ordre');
  for (const carte of cartes()) {
    const id = carte.dataset.cardId;
    assert.ok(carte.querySelector('.rpg-mulligan__face img')?.getAttribute('src')?.includes(`/cards/${id}.jpg`),
      `la carte ${id} est rendue en grand, avec son illustration`);
    assert.equal(carte.textContent.includes(cardById(id).name), true, `la carte ${id} affiche son nom`);
    assert.equal(carte.querySelector('.rpg-mulligan__rules')?.textContent.length > 8, true,
      `la carte ${id} expose ses règles sans survol ni appui long`);
    assert.equal(carte.getAttribute('aria-pressed'), 'false', 'aucune carte n’est choisie à l’ouverture');
  }
  assert.match(titre(), /Gardez votre main/, 'le titre invite au choix');
  assert.match(q('.rpg-mulligan__head p').textContent, /Un seul échange/, 'le volet dit que le droit est unique');
  assert.match(q('.rpg-mulligan__valider').textContent, /Garder cette main/,
    'sans choix, valider revient à garder sa main');
  assert.equal(q('.rpg-mulligan__tout'), null, 'pas de bouton d’annulation tant que rien n’est choisi');

  // ── 2. Rien ne se joue pendant la lecture de la main ─────────────────────
  assert.equal(q('.rpg-btn--endturn')?.disabled, true, 'le tour ne peut pas être rendu avant la validation');
  assert.equal(qa('.rpg-hand__card[data-jouable="true"]').length, 0, 'aucune carte de la main n’est jouable');
  assert.equal(qa('.rpg-hand__card').every((carte) => carte.getAttribute('draggable') === 'false'), true,
    'aucune carte ne se glisse : le halo doré est éteint, la poignée aussi');
  assert.equal(q('.rpg-terrains--joueur .rpg-terrain'), null, 'rien n’est posé sur la table pendant le mulligan');

  // ── 3. Le choix des cartes à changer ─────────────────────────────────────
  await click(cartes()[1], 'toucher une carte la marque');
  assert.equal(cartes()[1].getAttribute('aria-pressed'), 'true', 'la carte choisie est pressée');
  assert.equal(cartes()[1].classList.contains('is-selected'), true, 'la carte choisie prend le liseré doré');
  assert.match(cartes()[1].querySelector('.rpg-mulligan__flag').textContent, /à changer/, 'le drapeau dit « à changer »');
  await click(cartes()[2], 'toucher une seconde carte la marque aussi');
  assert.match(q('.rpg-mulligan__compteur').textContent, /2 cartes à changer/, 'le compteur suit la sélection');
  assert.match(q('.rpg-mulligan__valider').textContent, /Changer 2 cartes/, 'le bouton primary nomme l’échange');
  await click(cartes()[1], 're-toucher la carte la libère');
  assert.equal(cartes()[1].getAttribute('aria-pressed'), 'false', 'le choix se défait au second toucher');
  assert.match(q('.rpg-mulligan__valider').textContent, /Changer 1 carte$/, 'un seul exemplaire reste choisi');
  await click(q('.rpg-mulligan__tout'), 'annuler la sélection');
  assert.equal(cartes().filter((carte) => carte.getAttribute('aria-pressed') === 'true').length, 0,
    '« Annuler la sélection » vide les choix sans fermer le volet');
  await click(cartes()[1], 'la carte du milieu est choisie');
  await click(cartes()[2], 'et la suivante aussi');

  // ── 4. Validation : ce qui sort, ce qui entre, et la main qui ne fond pas ─
  const duel = window.__RPG_DUEL__;
  const mainAvant = [...duel.joueur.main];
  const paquetAvant = [...duel.joueur.deck];
  const sorcierAvant = [...duel.sorcier.main];
  const sorcierPaquetAvant = [...duel.sorcier.deck];
  await click(q('.rpg-mulligan__valider'), 'valider l’échange');
  await act(async () => { await wait(120); });

  assert.equal(duel.joueur.main.length, 5, 'la main compte toujours cinq cartes après l’échange');
  assert.deepEqual(duel.joueur.main.slice(0, 3), [mainAvant[0], mainAvant[3], mainAvant[4]],
    'les cartes gardées restent en main, dans leur ordre');
  assert.equal([...duel.joueur.main, ...duel.joueur.deck].sort().join('|'),
    [...mainAvant, ...paquetAvant].sort().join('|'),
    'les deux cartes écartées sont retournées dans le paquet, aucune carte perdue');
  assert.equal(rpgPeutMulligan(duel, 'joueur'), false, 'le droit au mulligan est consommé');
  assert.match(duel.log.join('\n'), /Vous écartez .* et piochez 2 cartes/, 'le journal raconte l’échange');

  // Le volet reste ouvert sur la nouvelle main, avec les étapes du bilan.
  assert.match(volet()?.className ?? '', /rpg-mulligan--resultat/, 'le volet passe à l’étape du résultat');
  assert.match(titre(), /nouvelle main/, 'le titre annonce la main qui vient d’être piochée');
  assert.equal(cartes().length, 5, 'la nouvelle main se relit en grand');
  assert.equal(cartes().filter((carte) => carte.classList.contains('is-new')).length, 2,
    'les deux cartes piochées sont signalées');
  assert.deepEqual(cartes().filter((carte) => carte.classList.contains('is-new')).map((carte) => carte.dataset.cardId),
    duel.joueur.main.slice(3), 'ce sont bien les cartes qui viennent d’entrer en main');
  assert.match(q('.rpg-mulligan__head p').textContent, /Vous écartez 2 cartes et piochez 2 cartes/,
    'le bilan résume l’échange');
  assert.match(q('.rpg-mulligan__head p').textContent, /le sorcier (en change \d|garde la sienne)/,
    'le bilan dit aussi ce qu’a fait le sorcier');
  assert.equal(q('.rpg-mulligan__valider'), null, 'plus de second échange possible');

  // ── 5. Le sorcier a eu le même droit ─────────────────────────────────────
  assert.equal(duel.sorcier.main.length, 5, 'la main du sorcier garde cinq cartes');
  assert.equal([...duel.sorcier.main, ...duel.sorcier.deck].sort().join('|'),
    [...sorcierAvant, ...sorcierPaquetAvant].sort().join('|'),
    'le sorcier non plus ne perd pas de carte en route');

  // ── 6. « Commencer le duel » rend la table au joueur ─────────────────────
  await click(q('.rpg-mulligan__commencer'), 'commencer le duel');
  await act(async () => { await wait(120); });
  assert.equal(volet(), null, 'le volet est fermé');
  assert.equal(q('.card-table').hasAttribute('inert'), false, 'la table n’est plus close');
  assert.match(q('.rpg-actions__wait').textContent, /Plateau :/,
    'le message d’ouverture du plateau survit au mulligan');
  assert.equal(q('.rpg-btn--endturn')?.disabled, false, 'le tour est maintenant au joueur');
  const terrainId = duel.joueur.main.find((id) => cardById(id)?.kind === 'terrain');
  assert.ok(terrainId, 'la main de départ gardée contient bien un terrain');
  const terrain = q(`.rpg-hand__card[data-card-id="${terrainId}"]`);
  assert.equal(terrain?.dataset.jouable, 'true', 'un terrain devient jouable dès la table rendue');
  await click(terrain, 'poser le terrain');
  // La carte vole vers la table : le geste n'est résolu qu'à l'atterrissage.
  await act(async () => { await wait(900); });
  assert.ok(q('.rpg-terrains--joueur .rpg-terrain'), 'le terrain est posé sur la table');

  await act(async () => { root.unmount(); });
  container.remove();

  // ── 7. Table neuve, droit rendu : la partie suivante a son propre mulligan ─
  const deuxieme = document.createElement('div');
  document.body.append(deuxieme);
  const secondRoot = createRoot(deuxieme);
  await act(async () => {
    secondRoot.render(<RpgDuelPage joueurDeck={DECK_JOUER} sorcierDeck={DECK_SORCIER} rng={() => 0.5} />);
  });
  await act(async () => {
    deuxieme.querySelector('.rpg-mode-menu__play .rpg-menu-button--primary').click();
  });
  await act(async () => { await wait(120); });
  assert.ok(deuxieme.querySelector('.rpg-mulligan'), 'une partie neuve rouvre son mulligan');
  assert.equal(rpgPeutMulligan(window.__RPG_DUEL__, 'joueur'), true, 'le droit est rendu avec la table neuve');
  // Le joueur qui n'a rien à changer n'a pas de nouvelle main à relire : un
  // seul geste suffit, et le message du plateau reste celui du duel.
  await act(async () => { deuxieme.querySelector('.rpg-mulligan__valider').click(); });
  assert.equal(deuxieme.querySelector('.rpg-mulligan'), null, 'un volet sans choix se referme d’un geste');
  assert.equal(deuxieme.querySelector('.card-table').hasAttribute('inert'), false, 'la table est rendue');
  assert.match(deuxieme.querySelector('.rpg-actions__wait').textContent, /Plateau :/,
    'garder sa main n’écrit pas un nouveau message par-dessus l’ouverture');
  await act(async () => { secondRoot.unmount(); });
  deuxieme.remove();
}
