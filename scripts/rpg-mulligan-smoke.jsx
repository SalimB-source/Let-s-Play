// Le mulligan du Sablier, rendu dans jsdom : la main de départ s'affiche en
// entier — des faces 4:5, leurs plaques d'attaque et de défense (et la ligne de
// type des terrains et des sorts), tout le reste passant par l'aperçu rapide du
// survol — le joueur choisit ce qu'il change, valide, relit sa nouvelle main, et
// la table ne s'ouvre qu'ensuite.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { rpgPeutMulligan } from '../src/games/rpgDuel.js';
import { cardById } from '../src/games/rpgCards.js';
import { lancerDuelDepuisMenu } from './rpg-duel-start.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Les decks du scénario : depuis le mana automatique, la main de départ
 *  compte trois cartes et les paquets ne portent plus de terrains. Le deck du
 *  joueur est mono-Sable (le premier mana s'allume tout seul) ; son tirage
 *  déterministe ouvre sur deux Cuirasses de sel et l'Amayas du Hoggar, et
 *  l'échange des deux dernières ramène la Tislit des Aures — la créature à
 *  1 mana qui sera jouable dès la table rendue. */
const DECK_JOUER = ['rempart-de-dunes', 'sandales-de-tislit', 'jitte-d-amayas', 'tislit-des-aures', 'chien-du-guet', 'faiseur-de-passage'];
const DECK_SORCIER = ['tislit-des-aures', 'chien-du-guet', 'fennec-des-decombres'];

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

  // jsdom n'expose pas `matchMedia` : sans lui, la page suppose la souris (le
  // repli documenté de `viewport.survol`), et le volet arme donc l'aperçu
  // rapide — c'est le geste qu'on vérifie ici.
  assert.equal(typeof window.matchMedia, 'undefined', 'jsdom ne connaît pas le survol, la page le suppose');

  await act(async () => {
    root.render(<RpgDuelPage joueurDeck={DECK_JOUER} sorcierDeck={DECK_SORCIER} rng={() => 0.5} />);
  });
  assert.ok(await lancerDuelDepuisMenu(container, (element) => click(element, 'le menu mène au duel')), 'l’onglet Deck lance le duel');
  await act(async () => { await wait(120); });

  // ── 1. L'ouverture du duel est tenue par le volet, pas par la table ──────
  assert.ok(volet(), 'le duel s’ouvre sur le volet du mulligan');
  assert.equal(volet().getAttribute('role'), 'dialog', 'le volet est une boîte de dialogue modale');
  assert.match(volet().getAttribute('aria-label'), /Mulligan/, 'le volet se nomme pour les lecteurs d’écran');
  assert.equal(q('.card-table').hasAttribute('inert'), true, 'la table est close tant que la main n’est pas validée');
  assert.equal(cartes().length, 3, 'les trois cartes piochées sont toutes présentées');
  assert.deepEqual(cartes().map((carte) => carte.dataset.cardId), main(),
    'le volet montre exactement la main de départ, dans le même ordre');
  assert.equal(q('.rpg-mulligan__stage > .rpg-mulligan__cards')?.children.length, 3,
    'les trois cartes forment une seule rangée, dans la scène que la feuille mesure');
  for (const carte of cartes()) {
    const id = carte.dataset.cardId;
    const attendue = cardById(id);
    assert.equal(carte.querySelector('img')?.getAttribute('src')?.includes(`/cards/${id}.jpg`) ?? false, true,
      `la carte ${id} montre son illustration`);
    // Aucun texte imprimé sur la carte : ni nom, ni type, ni effets, ni drapeau.
    // Il ne reste que l'illustration et les repères de l'aperçu (coût, badge, sceau, stats).
    const reperes = (noeud) => noeud.classList?.contains('rpg-card-element-badge')
      || noeud.classList?.contains('rpg-mana-cost')
      || noeud.classList?.contains('rpg-sort-sceau')
      || noeud.classList?.contains('rpg-mulligan__stats');
    for (const noeud of carte.childNodes) {
      if (noeud.nodeType === 3) {
        assert.equal(noeud.textContent.trim(), '', `aucun texte n’est posé sur la carte ${id}`);
      } else if (noeud.nodeType === 1) {
        assert.ok(noeud.tagName === 'IMG' || reperes(noeud),
          `la carte ${id} ne porte que son illustration et ses repères (${noeud.className})`);
      }
    }
    assert.equal(Boolean(carte.querySelector('.rpg-mulligan__name, .rpg-mulligan__rules, .rpg-mulligan__flag, .rpg-mulligan__type')), false,
      `rien du texte d’interface n’est rendu sur la carte ${id}, exactement comme sur la face de l’aperçu`);
    // Les repères du jeu, eux, restent : le coût, le badge d’élément, les stats.
    assert.equal(Boolean(carte.querySelector('.rpg-mana-cost')) || attendue.kind === 'terrain', true,
      `la carte ${id} montre son coût (ou est un terrain, qui n’en a pas)`);
    const creature = attendue.kind === 'creature' || attendue.kind === 'hero';
    assert.equal(Boolean(carte.querySelector('.rpg-mulligan__stats')), creature,
      `la carte ${id} montre son attaque et sa défense si c’est une créature`);
    const plaques = carte.querySelectorAll('.rpg-mulligan__stats .rpg-stat-icon');
    if (creature) {
      // Les plaques du jeu : l'épée et le bouclier sur fond noir translucide.
      assert.equal(plaques.length, 2, `l’attaque et la défense de ${id} portent les icônes du jeu`);
      assert.equal(carte.querySelector('.rpg-mulligan__stats .rpg-card__stat--atk .rpg-stat-value')?.textContent,
        String(attendue.atk), `la plaque d’attaque de ${id} affiche sa valeur`);
      assert.equal(carte.querySelector('.rpg-mulligan__stats .rpg-card__pt .rpg-stat-value')?.textContent,
        String(attendue.def), `la plaque de défense de ${id} affiche sa valeur`);
      assert.equal(/⚔|🛡/.test(carte.textContent), false,
        `la carte ${id} n’écrit plus ⚔/🛡 : elle porte les plaques du jeu`);
      // L'attaque ouvre la rangée, la défense la ferme : chacune sur son bord.
      const rangee = carte.querySelector('.rpg-mulligan__stats');
      assert.equal(rangee.firstElementChild?.classList.contains('rpg-card__stat--atk'), true,
        `l’attaque de ${id} est la première plaque — à gauche`);
      assert.equal(rangee.lastElementChild?.classList.contains('rpg-card__pt'), true,
        `la défense de ${id} est la dernière plaque — à droite`);
    }
    assert.equal(carte.getAttribute('aria-pressed'), 'false', 'aucune carte n’est choisie à l’ouverture');
  }

  // ── 1 bis. Le survol d'une carte du mulligan n'ouvre pas d'aperçu rapide ──
  const survoler = async (element) => {
    await act(async () => {
      element.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }));
    });
  };
  assert.equal(q('.rpg-hover-card-preview'), null, 'aucun aperçu tant que rien n’est survolé');
  await survoler(cartes()[2]);
  assert.equal(q('.rpg-hover-card-preview'), null, 'survoler une carte du mulligan n’ouvre pas d’aperçu rapide');
  await act(async () => {
    cartes()[2].dispatchEvent(new window.MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
  });
  assert.equal(q('.rpg-hover-card-preview'), null, 'quitter la carte laisse le volet sans aperçu rapide');

  assert.match(titre(), /Gardez votre main/, 'le titre invite au choix');
  assert.match(q('.rpg-mulligan__head p').textContent, /Un seul échange/, 'le volet dit que le droit est unique');
  assert.match(q('.rpg-mulligan__valider').textContent, /Garder cette main/,
    'sans choix, valider revient à garder sa main');
  assert.equal(q('.rpg-mulligan__tout'), null, 'pas de bouton d’annulation tant que rien n’est choisi');

  // ── 2. Rien ne se joue pendant la lecture de la main ─────────────────────
  assert.equal(q('.rpg-btn--endturn')?.disabled, true, 'le tour ne peut pas être rendu avant la validation');
  assert.equal(qa('.rpg-hand__card[data-jouable="true"]').length, 0, 'aucune carte de la main n’est jouable');
  assert.equal(qa('.rpg-hand__card').every((carte) => carte.getAttribute('draggable') === 'false'), true,
    'aucune carte ne se glisse : le halo de jouabilité est éteint, la poignée aussi');
  assert.equal(q('.rpg-terrains--joueur .rpg-terrain'), null, 'rien n’est posé sur la table pendant le mulligan');

  // ── 3. Le choix des cartes à changer ─────────────────────────────────────
  await click(cartes()[1], 'toucher une carte la marque');
  assert.equal(cartes()[1].getAttribute('aria-pressed'), 'true', 'la carte choisie est pressée');
  assert.equal(cartes()[1].classList.contains('is-selected'), true, 'la carte choisie prend son état grisé à lueur rouge');
  assert.equal(cartes()[1].querySelector('.rpg-mulligan__flag'), null,
    'aucun mot n’est imprimé : la carte grisée et sa lueur rouge disent « à changer », et le compteur le chiffre');
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
  await click(cartes()[2], 'et la dernière aussi');

  // ── 4. Validation : ce qui sort, ce qui entre, et la main qui ne fond pas ─
  const duel = window.__RPG_DUEL__;
  const mainAvant = [...duel.joueur.main];
  const paquetAvant = [...duel.joueur.deck];
  const sorcierAvant = [...duel.sorcier.main];
  const sorcierPaquetAvant = [...duel.sorcier.deck];
  await click(q('.rpg-mulligan__valider'), 'valider l’échange');
  await act(async () => { await wait(120); });

  assert.equal(duel.joueur.main.length, 3, 'la main compte toujours trois cartes après l’échange');
  assert.deepEqual(duel.joueur.main.slice(0, 1), [mainAvant[0]],
    'la carte gardée reste en main, en tête');
  assert.equal([...duel.joueur.main, ...duel.joueur.deck].sort().join('|'),
    [...mainAvant, ...paquetAvant].sort().join('|'),
    'les deux cartes écartées sont retournées dans le paquet, aucune carte perdue');
  assert.equal(rpgPeutMulligan(duel, 'joueur'), false, 'le droit au mulligan est consommé');
  assert.match(duel.log.join('\n'), /Vous écartez .* et piochez 2 cartes/, 'le journal raconte l’échange');

  // Le volet reste ouvert sur la nouvelle main, avec les étapes du bilan.
  assert.match(volet()?.className ?? '', /rpg-mulligan--resultat/, 'le volet passe à l’étape du résultat');
  assert.match(titre(), /nouvelle main/, 'le titre annonce la main qui vient d’être piochée');
  assert.equal(cartes().length, 3, 'la nouvelle main se relit en grand');
  assert.equal(cartes().filter((carte) => carte.classList.contains('is-new')).length, 2,
    'les deux cartes piochées sont signalées');
  assert.deepEqual(cartes().filter((carte) => carte.classList.contains('is-new')).map((carte) => carte.dataset.cardId),
    duel.joueur.main.slice(1), 'ce sont bien les cartes qui viennent d’entrer en main');
  assert.match(q('.rpg-mulligan__head p').textContent, /Vous écartez 2 cartes et piochez 2 cartes/,
    'le bilan résume l’échange');
  assert.match(q('.rpg-mulligan__head p').textContent, /le sorcier (en change \d|garde sa main)/,
    'le bilan dit aussi ce qu’a fait le sorcier');
  assert.equal(q('.rpg-mulligan__valider'), null, 'plus de second échange possible');

  // ── 5. Le sorcier a eu le même droit ─────────────────────────────────────
  assert.equal(duel.sorcier.main.length, 3, 'la main du sorcier garde trois cartes');
  assert.equal([...duel.sorcier.main, ...duel.sorcier.deck].sort().join('|'),
    [...sorcierAvant, ...sorcierPaquetAvant].sort().join('|'),
    'le sorcier non plus ne perd pas de carte en route');

  // ── 6. « Commencer le duel » rend la table au joueur ─────────────────────
  await click(q('.rpg-mulligan__commencer'), 'commencer le duel');
  await act(async () => { await wait(120); });
  assert.equal(volet(), null, 'le volet est fermé');
  assert.equal(q('.card-table').hasAttribute('inert'), false, 'la table n’est plus close');
  assert.equal(q('.rpg-actions__wait'), null, 'le duel ne porte pas de bandeau d’indications');
  assert.match(q('.card-table').className, /card-table--plateau-/,
    'le plateau tiré est posé sous les cartes : il se voit, il ne s’annonce pas');
  assert.equal(q('.rpg-btn--endturn')?.disabled, false, 'le tour est maintenant au joueur');
  const jouableId = duel.joueur.main.find((id) => cardById(id)?.kind === 'creature' && (cardById(id)?.cost ?? 9) <= 1);
  assert.ok(jouableId, 'la main de départ gardée contient bien une créature à un mana');
  const jouable = q(`.rpg-hand__card[data-card-id="${jouableId}"]`);
  assert.equal(jouable?.dataset.jouable, 'true', 'une créature à un mana devient jouable dès la table rendue');
  await click(jouable, 'poser la créature');
  // La carte vole vers la table : le geste n'est résolu qu'à l'atterrissage.
  await act(async () => { await wait(900); });
  assert.ok(q(`.card-row--equipe .rpg-card[data-card-id="${jouableId}"]`),
    'la créature est posée sur la table');

  await act(async () => { root.unmount(); });
  container.remove();

  // ── 7. Table neuve, droit rendu : la partie suivante a son propre mulligan ─
  const deuxieme = document.createElement('div');
  document.body.append(deuxieme);
  const secondRoot = createRoot(deuxieme);
  await act(async () => {
    secondRoot.render(<RpgDuelPage joueurDeck={DECK_JOUER} sorcierDeck={DECK_SORCIER} rng={() => 0.5} />);
  });
  await lancerDuelDepuisMenu(deuxieme, (element) => act(async () => { element.click(); }));
  await act(async () => { await wait(120); });
  assert.ok(deuxieme.querySelector('.rpg-mulligan'), 'une partie neuve rouvre son mulligan');
  assert.equal(rpgPeutMulligan(window.__RPG_DUEL__, 'joueur'), true, 'le droit est rendu avec la table neuve');
  // Le joueur qui n'a rien à changer n'a pas de nouvelle main à relire : un
  // seul geste suffit, et la table rendue est celle du duel.
  await act(async () => { deuxieme.querySelector('.rpg-mulligan__valider').click(); });
  assert.equal(deuxieme.querySelector('.rpg-mulligan'), null, 'un volet sans choix se referme d’un geste');
  assert.equal(deuxieme.querySelector('.card-table').hasAttribute('inert'), false, 'la table est rendue');
  assert.equal(deuxieme.querySelector('.rpg-actions__wait'), null,
    'garder sa main n’écrit aucun bandeau : la table se rend telle quelle');
  assert.match(deuxieme.querySelector('.card-table').className, /card-table--plateau-/,
    'la partie neuve a bien tiré son plateau');
  await act(async () => { secondRoot.unmount(); });
  deuxieme.remove();
}
