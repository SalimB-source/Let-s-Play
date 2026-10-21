// Le bandeau d'ouverture de tour du Sablier, rendu dans jsdom : « Votre tour »
// quand la main passe au joueur, « Tour de l'adversaire » quand elle passe au
// sorcier — chacun le temps d'un battement (1,5 s), puis effacé de la table.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { lancerDuelDepuisMenu, passerMulligan } from './rpg-duel-start.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Les decks du scénario : depuis le mana automatique, la main de départ
 *  compte trois cartes et les paquets ne portent plus de terrains — des
 *  créatures mono-Sable suffisent, et le mono allume le mana tout seul. */
const DECK_JOUER = ['chien-du-guet', 'fennec-des-decombres', 'tiziri-du-djurdjura', 'faiseur-de-passage'];
// Le sorcier ouvre sur deux Chacals du seuil (1 mana, Rapidité) : il en pose
// un, attaque aussitôt, et la table attend la résolution du combat — son tour
// reste ouvert, le temps de vérifier que le bandeau vit sa seconde et demie
// sans être remplacé. Trente cartes sans remplissage : la pioche tire par la
// fin du paquet, les Chacals ferment donc la liste.
const DECK_SORCIER = [
  ...['papyrus', 'ouvrier-du-natron', 'nom-efface', 'gardienne-de-la-balance',
    'scribe-des-feuillets', 'pretre-de-la-bouche', 'offrande-de-lin', 'ureus-du-seuil',
    'momie-de-lin', 'ibis-des-comptes', 'couveuse-de-shabtis', 'khopesh-d-or',
    'le-poids', 'celle-qui-pese'].flatMap((id) => [id, id]),
  'chacal-du-seuil', 'chacal-du-seuil',
];

export async function checkRpgTurnBanner(assert) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);

  const cartes = () => [...container.querySelectorAll('button')];
  const bouton = (label) => cartes().find((element) => element.textContent.includes(label));
  const cliquer = async (element, message = 'la commande existe') => {
    assert.ok(element, message);
    await act(async () => { element.click(); });
  };
  const bandeau = () => container.querySelector('.rpg-annonce-tour__bandeau');
  const texte = () => bandeau()?.textContent.trim() ?? null;
  const camp = () => {
    const classes = [...(bandeau()?.classList ?? [])];
    if (classes.includes('is-joueur')) return 'joueur';
    if (classes.includes('is-sorcier')) return 'sorcier';
    return null;
  };

  await act(async () => {
    root.render(<RpgDuelPage joueurDeck={DECK_JOUER} sorcierDeck={DECK_SORCIER} rng={() => 0.999} />);
  });

  // ── 0. Le mulligan tient la table : rien à annoncer ────────────────────────
  assert.ok(await lancerDuelDepuisMenu(container, (element) => cliquer(element, 'le menu mène au duel')), 'l’onglet Deck lance le duel');
  await act(async () => { await wait(120); });
  assert.ok(container.querySelector('.rpg-mulligan'), 'le duel s’ouvre sur son volet de mulligan');
  assert.equal(bandeau(), null,
    'aucun bandeau de tour pendant le mulligan : la table n’est encore à personne');

  // ── 1. La main passe au joueur : « Votre tour » ────────────────────────────
  await passerMulligan(container, cliquer);
  await act(async () => { await wait(60); });
  assert.ok(bandeau(), 'la table rendue au joueur annonce son tour');
  assert.equal(texte(), 'Votre tour', 'le bandeau nomme le tour du joueur');
  assert.equal(camp(), 'joueur', 'le bandeau du joueur porte sa teinte (is-joueur)');
  const zone = container.querySelector('.rpg-annonce-tour');
  assert.equal(zone?.getAttribute('role'), 'status', 'le bandeau est une zone d’état pour les lecteurs d’écran');
  assert.equal(zone?.getAttribute('aria-live'), 'polite', 'l’annonce est polie : elle ne coupe pas la lecture en cours');
  assert.ok(container.querySelector('.card-table > .rpg-annonce-tour'),
    'le bandeau est posé sur la table du duel, pas dans une couche du menu');
  assert.equal(container.querySelectorAll('.rpg-annonce-tour__bandeau').length, 1,
    'un seul bandeau vit à la fois');

  // ── 2. Le battement dure 1,5 s, puis le bandeau s’efface ───────────────────
  await act(async () => { await wait(1200); });
  assert.equal(texte(), 'Votre tour', 'après 1,2 s, le bandeau tient encore sa place');
  await act(async () => { await wait(600); });
  assert.equal(bandeau(), null, 'après 1,8 s, le bandeau du joueur s’est effacé');

  // ── 3. Le tour rendu au sorcier : « Tour de l’adversaire » ─────────────────
  // La fin de tour ouvre d’abord la fenêtre de réponse (le sorcier peut jouer
  // une magie rapide) : sans réponse possible, la main bascule après un
  // battement — le bandeau suit la bascule, pas le clic.
  await cliquer(bouton('Fin du tour'), 'le bouton de fin de tour est là');
  await act(async () => { await wait(900); });
  assert.equal(texte(), 'Tour de l’adversaire', 'la main passée au sorcier s’annonce aussitôt après la fenêtre');
  assert.equal(camp(), 'sorcier', 'le bandeau du sorcier porte sa teinte (is-sorcier)');
  await act(async () => { await wait(900); });
  assert.equal(camp(), 'sorcier', 'après 0,9 s, le bandeau du sorcier est toujours là');
  await act(async () => { await wait(700); });
  assert.equal(camp(), null,
    'après 1,6 s de plus, le bandeau du sorcier s’est effacé — même annonce en cours sur la table');

  // ── 4. Un aller-retour par le menu ne rejoue pas le bandeau ────────────────
  await cliquer(bouton('Menu'), 'le bouton de menu est là');
  await act(async () => { await wait(60); });
  assert.equal(bandeau(), null, 'l’écran de menu n’affiche aucun bandeau de tour');
  await cliquer(bouton('Reprendre le duel en cours'), 'le duel en cours se reprend depuis le menu');
  await act(async () => { await wait(60); });
  assert.equal(bandeau(), null,
    'revenir sur la table ne rejoue pas le bandeau du tour en cours : il n’a pas basculé');

  await act(async () => { root.unmount(); });
  container.remove();
}
