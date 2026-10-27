/**
 * Le smoke de l'écran du Souk (lot 3) — l'écran monté pour de vrai, branché sur
 * le vrai hook de bourse.
 *
 * Il ne simule rien : `RpgSouk` reçoit `useSablierBourse`, les quêtes du jour
 * sont terminées par les **gestes du contrat d'événements**, et les boutons sont
 * cliqués dans le DOM. Ce que le joueur voit — le solde qui monte, la barre qui
 * se remplit, le bouton qui s'active, la pastille qui se vide — est lu dans le
 * document, pas dans l'état interne.
 *
 * Aucune minuterie n'entre dans les assertions : le compte à rebours du cycle
 * tourne en fond (toutes les 30 s), mais rien ne dépend de lui. La graine est
 * posée à la main, sans quoi la journée changerait d'un passage à l'autre.
 */

import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { useSablierBourse } from '../src/games/useSablierBourse.js';
import RpgSouk, { dureeAvantMinuit } from '../src/games/RpgSouk.jsx';
import RpgQuetesDuJour from '../src/games/RpgQuetesDuJour.jsx';
import {
  GAINS,
  RPG_BOURSE_STORAGE_KEY,
  chargerPortefeuille,
  crediterCredits,
  creditsLisible,
  portefeuilleVide,
  sauverPortefeuille,
} from '../src/games/rpgCredits.js';
import {
  RPG_GRAINE_STORAGE_KEY, RPG_QUETES_STORAGE_KEY, cleJour, jourPrecedent, queteParId,
} from '../src/games/rpgQuetes.js';
import {
  RPG_DUEL_CARDS, RPG_ELEMENTS, cardById, cardColors,
} from '../src/games/rpgCards.js';
import { rngSeme } from '../src/games/rpgHasard.js';
import { collectionJoueur } from '../src/games/rpgCollection.js';
import { RPG_STORY_TOURS } from '../src/games/rpgStoryTours.js';
import { etatRayon } from '../src/games/rpgBoosters.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * La progression du joueur du smoke : **deux tours montées**. C'est le moment
 * où le comptoir a de l'intérêt — toutes les couleurs déjà entrées dans la
 * ville sont dans le vivier, et les mythiques des Listes et du Souk ont de
 * quoi se promettre. Une progression plus pauvre rendrait le smoke presque vide.
 */
const PROGRESSION = {
  etagesVaincus: RPG_STORY_TOURS.slice(0, 2).flatMap((tour) => tour.etages.map((etage) => etage.id)),
};

/** L'illustration d'une carte : le smoke n'en charge aucune, il en pose le chemin. */
const illustration = (carte) => `/cards/${carte?.id ?? 'inconnue'}.jpg`;

/**
 * La collection de l'appareil, telle que `useDecksSablier` la calcule : la
 * dotation, les acquis, et **les cartes du Souk**, relues dans le portefeuille.
 */
function lireCollection() {
  let cartes = [];
  try {
    cartes = JSON.parse(window.localStorage.getItem(RPG_BOURSE_STORAGE_KEY) ?? 'null')?.cartes ?? [];
  } catch { cartes = []; }
  return collectionJoueur({ souk: cartes });
}

/**
 * L'écran, tel que la page le monte : le hook en dessous, l'écran au-dessus.
 *
 * `caisse` enregistre ce que chaque encaissement **rend** : le solde affiché
 * peut monter d'autant plus qu'un palier franchi pendant le smoke offre un
 * paquet du Souk, et un paquet rend ses doublons (lot 6). Le montant du geste,
 * lui, reste exact — c'est ce qu'on affirme.
 */
function Sonde({ surPret, sons, caisse }) {
  // Le tirage est semé : sans ça, le smoke dépendrait du hasard — exactement ce
  // qu'on refuse ailleurs. La graine est posée une fois pour toutes.
  // La collection est un état du *parent*, comme dans la page : elle ne bouge
  // que quand le hook prévient que des cartes viennent d'être rangées.
  const [collection, setCollection] = useState(lireCollection);
  const bourse = useSablierBourse({
    progression: PROGRESSION,
    rng: rngSeme(20261014),
    onCartesRangees: () => { setCollection(lireCollection()); sons.push('collection-rafraichie'); },
  });
  surPret(bourse);
  return (
    <>
    {/* Le panneau de l'onglet Jouer : la page le monte à droite du menu, il
        reçoit exactement les mêmes états et les mêmes gestes que le Souk. */}
    <RpgQuetesDuJour
      quetes={bourse.quetes}
      credits={bourse.credits}
      onReclamerQuete={(id) => caisse.push(bourse.reclamerUneQuete(id))}
      onReclamerCachet={() => caisse.push(bourse.reclamerLeCachet())}
      onReclamerSemaine={() => caisse.push(bourse.reclamerLeCachetDeLaSemaine())}
      onOuvrirSouk={() => { sons.push('vers-le-souk'); }}
      onPlaySfx={(nom) => { sons.push(nom); }}
    />
    <RpgSouk
      quetes={bourse.quetes}
      credits={bourse.credits}
      aReclamer={bourse.aReclamer}
      statutSync={bourse.statutSync}
      portefeuille={bourse.bourse}
      progression={PROGRESSION}
      collection={collection}
      ouverture={bourse.ouverture}
      cardArt={illustration}
      onReclamerQuete={(id) => caisse.push(bourse.reclamerUneQuete(id))}
      onReclamerCachet={() => caisse.push(bourse.reclamerLeCachet())}
      onOuvrirBooster={(rayonId) => bourse.acheterBooster(rayonId)}
      onOuvrirCoffret={(rayonId) => bourse.acheterCoffret(rayonId)}
      onAcheterCarteDirecte={(cardId) => bourse.acheterCarteDirecte(cardId)}
      onRafraichirEtal={() => bourse.rafraichirEtal()}
      onFermerOuverture={() => bourse.fermerOuverture()}
      onPlaySfx={(nom) => { sons.push(nom); }}
      onExit={() => { sons.push('sortie'); }}
    />
    </>
  );
}

const KIND_PAR_TYPE = {
  'creature-invoquee': 'creature',
  'magie-lancee': 'magie',
  'arme-jouee': 'arme',
};

/** Un événement du contrat qui fait avancer cette quête, ou `null` s'il n'en existe pas. */
function evenementPour(quete) {
  const { type, couleur } = quete.ecoute ?? {};
  if (type === 'degats-infliges') return { type, montant: quete.objectif };
  if (type === 'duel-gagne') return { type, mode: 'libre' };
  if (type === 'etage-deblaye') return { type, etageId: 'listes-2', premiere: true };
  if (type === 'booster-ouvert') return { type, rayonId: 'souk' };
  const kind = KIND_PAR_TYPE[type];
  const carte = type === 'carte-jouee'
    ? RPG_DUEL_CARDS.find((candidat) => cardColors(candidat).includes(couleur))
    : RPG_DUEL_CARDS.find((candidat) => candidat.kind === kind);
  return carte ? { type, cardId: carte.id } : null;
}

/** La valeur d'un attribut `data-` de l'écran (jamais un `container` figé). */
const donnee = (selecteur, cle) => document.querySelector(selecteur)?.dataset?.[cle] ?? null;
const noeud = (selecteur) => document.querySelector(selecteur);
/**
 * Ce qu'il manque encore au comptoir — l'écran ne l'écrit plus sous le
 * paquet (il parle pour lui-même), alors le smoke relit la même règle pure
 * que l'écran (`etatRayon`), avec la collection du moment.
 */
const manquantesDuRayon = (rayonId, bourseActuelle) => etatRayon(
  rayonId, PROGRESSION, collectionJoueur({ souk: bourseActuelle.bourse.cartes }),
)?.nouvelles;

export async function checkRpgSoukEcran(assert) {
  // ── Les règles d'affichage, sans DOM ──────────────────────────────────────
  assert.equal(creditsLisible(1240), '1\u202f240', 'les milliers se lisent avec une espace fine');
  assert.equal(creditsLisible(0), '0');
  assert.equal(creditsLisible(undefined), '0', 'un solde illisible s’affiche zéro, pas NaN');
  assert.equal(dureeAvantMinuit(7 * 3600 + 12 * 60), '7 h 12', 'le cycle se compte en heures et minutes');
  assert.equal(dureeAvantMinuit(43 * 60), '43 min', 'et en minutes sous l’heure');
  assert.match(dureeAvantMinuit(30), /^moins d/, 'et se tait poliment sous la minute');

  window.localStorage.clear();
  window.localStorage.setItem(RPG_GRAINE_STORAGE_KEY, 'graine-du-smoke-souk');
  const conteneur = document.createElement('div');
  document.body.appendChild(conteneur);
  const root = createRoot(conteneur);
  let rootDirect = null;
  let conteneurDirect = null;
  const sons = [];
  const caisse = [];
  let bourse = null;
  const rendre = (racine) => racine.render(
    <Sonde surPret={(valeur) => { bourse = valeur; }} sons={sons} caisse={caisse} />,
  );
  try {
    await act(async () => rendre(root));

    // ── L'écran est là, et il dit ce qu'il a ────────────────────────────────
    assert.ok(noeud('[data-souk]'), 'l’écran du Souk se rend');
    assert.equal(donnee('[data-souk-solde]', 'soukSolde'), '0', 'un joueur neuf n’a pas un crédit');
    assert.equal(Number(donnee('[data-souk-quetes]', 'soukQuetes')), 3, 'la journée propose trois quêtes');
    assert.ok(noeud('[data-souk-quetes]')?.children?.length === 3, 'et trois cartes sont peintes');
    assert.equal(donnee('[data-souk-cachet]', 'soukCachet'), 'attente',
      'le Cachet attend ses trois quêtes');
    // ── Le comptoir : un seul paquet fondu, ouvert, rien d'achetable sans solde
    assert.equal(Number(donnee('[data-souk-rayons-nombre]', 'soukRayonsNombre')), 1,
      'tous les boosters sont fondus en un seul paquet au comptoir');
    assert.equal(donnee('[data-souk-rayons]', 'soukRayons'), 'ouvert',
      'le comptoir est ouvert dès le départ');
    assert.equal(donnee('[data-souk-rayon="souk"]', 'soukRayonEtat'), 'sans-solde',
      'le comptoir ouvert sans un crédit refuse l’achat');
    assert.match(noeud('[data-souk-rayon="souk"] [data-souk-rayon-refus]')?.textContent ?? '', /Il manque/,
      'et il dit combien il manque');
    assert.ok(noeud('[data-souk-rayon="souk"] [data-souk-rayon-refus] .rpg-credit'),
      'le refus est frappé de la pièce lui aussi');
    assert.ok(noeud('[data-souk-ouvrir="souk"]').disabled, 'le bouton Ouvrir est donc désactivé');
    // Plus aucune fiche de détails sous le paquet : ni la description du
    // rayon, ni la ligne de taux, ni le compte des cartes manquantes — le
    // sachet dit déjà tout ce qu'il garantit, et seul le refus s'explique.
    assert.equal(noeud('[data-souk-rayon="souk"] [data-souk-rayon-taux]'), null,
      'aucune ligne de taux écrite sous le paquet');
    assert.equal(noeud('[data-souk-rayon="souk"] [data-souk-rayon-reste]'), null,
      'ni de compte des cartes qui manquent');
    assert.equal(noeud('[data-souk-rayon="souk"] .rpg-souk__rayon-texte'), null,
      'ni de phrase de présentation : le paquet parle pour lui-même');

    // ── Le paquet en volume : cinq faces, deux sertissages, son étiquette ───
    const paquet = noeud('[data-souk-ouvrir="souk"]');
    assert.equal(paquet.dataset.soukPaquet, RPG_ELEMENTS.join(','),
      'le paquet porte toutes les couleurs du jeu : il n’y en a plus qu’un');
    assert.ok(!paquet.classList.contains('is-ferme'), 'le comptoir est ouvert');
    assert.equal(paquet.querySelectorAll('.rpg-souk__paquet-face').length, 5,
      'le sachet est un pavé : cinq faces');
    assert.equal(paquet.querySelectorAll('.rpg-souk__paquet-sertissage').length, 2,
      'et il est scellé en haut et en bas');
    assert.ok((paquet.querySelector('.rpg-souk__paquet-rune')?.textContent ?? '').includes('⌛'),
      'la rune du Sablier est marquée sur le paquet');
    assert.equal(paquet.querySelector('.rpg-souk__paquet-nom')?.textContent, 'Souk',
      'le paquet dit d’où il vient');
    assert.match(paquet.querySelector('.rpg-souk__paquet-prix')?.textContent ?? '', /^\s*Acheter · 140\s*$/,
      'son étiquette dit le geste et le prix');
    assert.ok(paquet.querySelector('.rpg-souk__paquet-prix .rpg-credit'),
      'et le prix est frappé de la pièce, pas d’un losange de texte');
    assert.equal(paquet.getAttribute('aria-label'), 'Ouvrir le paquet Souk · 140 crédits',
      'et le paquet se nomme pour qui ne le voit pas');
    assert.equal(paquet.querySelector('.rpg-souk__paquet-scene')?.getAttribute('aria-hidden'), 'true',
      'la scène est décorative : le bouton porte déjà tout le sens');
    assert.equal(noeud('[data-souk-ouvrir-bouton="souk"]'), null,
      'le paquet est la seule voie d’achat — pas de bouton texte qui le double');
    assert.equal(noeud('[data-souk-attente]'), null, 'rien à réclamer : pas de bandeau');

    // ── L’étal direct : cinq cartes, trois raretés, zéro achat sans solde ───
    const offres = [...document.querySelectorAll('[data-souk-direct-carte]')];
    assert.equal(offres.length, 5, 'l’étal propose exactement cinq cartes');
    assert.equal(new Set(offres.map((carte) => carte.dataset.soukDirectCarte)).size, 5, 'les cinq offres sont distinctes');
    assert.ok(offres.every((carte) => ['inhabituelle', 'rare', 'mythique'].includes(carte.dataset.soukDirectRarete)),
      'l’étal vend des inhabituelles, des rares et des mythiques — jamais une commune');
    assert.deepEqual(new Set(offres.map((carte) => carte.dataset.soukDirectRarete)),
      new Set(['inhabituelle', 'rare', 'mythique']),
      'les trois prix sont visibles chaque jour : la garantie du tirage, pas un vœu');
    assert.ok(offres.some((carte) => carte.dataset.soukDirectRarete === 'rare')
      && offres.some((carte) => carte.dataset.soukDirectRarete === 'mythique'),
    'les deux prix sont représentés chaque jour');
    assert.ok(offres.every((carte) => !carte.querySelector('.rpg-brume-mythique')),
      'les cartes de l’étal ne portent plus de voile de brume');
    assert.ok(offres.every((carte) => carte.dataset.cardId === carte.dataset.soukDirectCarte),
      'chaque offre est reliée à l’aperçu par data-card-id');
    assert.ok(offres.every((carte) => carte.querySelector('[data-souk-direct-acheter]').disabled),
      'sans crédits, aucune carte ne peut être facturée');
    assert.match(noeud('[data-souk-direct-cartes="5"]')?.textContent ?? '', /150/, 'la rare annonce 150 crédits');
    assert.match(noeud('[data-souk-direct-cartes="5"]')?.textContent ?? '', /300/, 'la mythique annonce 300 crédits');
    assert.equal(noeud('[data-souk-direct-rafraichir]').disabled, false, 'le rafraîchissement du jour est disponible');

    // ── Les sept cartes de la série : la première porte déjà son cachet ─────
    const sections = [...document.querySelectorAll('[data-souk] > section')];
    const rangQuetes = sections.findIndex((section) => section.querySelector('#souk-quetes-titre'));
    const rangRayons = sections.findIndex((section) => section.querySelector('#souk-rayons-titre'));
    const rangDirect = sections.findIndex((section) => section.hasAttribute('data-souk-direct'));
    assert.equal(rangRayons, 0, 'le Souk ouvre sur les boosters : c’est la toute première chose qu’il montre');
    assert.equal(rangDirect, rangRayons + 1, 'les cartes du jour à l’unité suivent aussitôt les boosters');
    assert.equal(rangQuetes, rangDirect + 1, 'les quêtes du jour viennent ensuite');
    const cartesSerie = [...document.querySelectorAll('[data-souk-semaine-jour]')];
    assert.equal(cartesSerie.length, 7, 'la série se lit en sept petites cartes');
    const serie = Number(donnee('[data-souk-semaine]', 'soukSerie'));
    assert.ok(serie >= 1, 'le premier jour a ouvert la série');
    assert.equal(cartesSerie.filter((carte) => carte.dataset.soukSemaineJourEtat === 'atteint').length,
      Math.min(serie, 7), 'autant de cachets que de jours tenus');
    assert.equal(cartesSerie.filter((carte) => carte.classList.contains('is-aujourdhui')).length, 1,
      'un seul jour est marqué comme celui du joueur');
    assert.ok(noeud('[data-souk-semaine-jour="1"] .rpg-souk__jour-sceau'),
      'le premier jour porte son cachet');
    assert.ok(noeud('[data-souk-semaine-jour="7"] .rpg-souk__jour-gain .rpg-credit'),
      'la septième carte annonce le Cachet, pièce comprise');
    for (const carte of cartesSerie) {
      assert.match(carte.getAttribute('aria-label') ?? '', /^Jour [1-7] sur 7/,
        'chaque carte se nomme pour qui ne la voit pas');
    }

    // ── La pièce du crédit : frappée, décorative, et elle respire ───────────
    const piece = noeud('[data-souk-solde] .rpg-credit');
    assert.ok(piece, 'le solde est frappé de la pièce, plus écrit d’un losange de texte');
    assert.ok(piece.classList.contains('is-anime'), 'la grande pièce respire : elle appelle à en gagner');
    assert.equal(piece.getAttribute('aria-hidden'), 'true',
      'et elle est décorative : le mot « crédits » est déjà dans l’aria-label du solde');
    assert.ok(piece.querySelectorAll('polygon').length >= 6,
      'la pièce est taillée : corps, quatre facettes, biseau, marque de frappe');
    assert.ok(piece.querySelector('.rpg-credit__etincelle') && piece.querySelector('.rpg-credit__halo'),
      'elle a son étincelle et son halo');
    assert.ok(piece.querySelector('linearGradient'),
      'et son or est un dégradé, pas un aplat');
    const degrades = [...document.querySelectorAll('[data-souk] .rpg-credit linearGradient')].map((g) => g.id);
    assert.equal(new Set(degrades).size, degrades.length,
      'deux pièces ne partagent pas leurs dégradés — sinon toutes prendraient le premier');

    // ── Ce qui n'est pas terminé ne se réclame pas ──────────────────────────
    const jour = bourse.quetes.quetes.map((id) => queteParId(id));
    assert.ok(jour.every(Boolean), 'les quêtes du jour sont de vraies quêtes du pool');

    // ── Le panneau de l'onglet Jouer : les mêmes quêtes, à droite du menu ───
    assert.equal(Number(donnee('[data-jouer-quetes]', 'jouerQuetes')), 3,
      'le panneau annonce les trois quêtes du jour');
    assert.equal(donnee('[data-jouer-compte]', 'jouerCompte'), '0/3',
      'aucune réclamée au premier jour');
    assert.equal(donnee('[data-jouer-cachet]', 'jouerCachet'), 'attente',
      'le Cachet du cycle y attend ses trois quêtes');
    assert.equal(donnee('[data-jouer-solde]', 'jouerSolde'), donnee('[data-souk-solde]', 'soukSolde'),
      'les deux écrans lisent le même solde');
    assert.ok(Number(donnee('[data-jouer-serie]', 'jouerSerie')) >= 1, 'le panneau compte la série');
    assert.ok(noeud('[data-jouer-souk]'), 'et il mène au Souk');
    for (const quete of jour) {
      assert.equal(donnee(`[data-jouer-quete="${quete.id}"]`, 'jouerQueteEtat'), 'encours',
        `${quete.id} commence en cours dans le panneau aussi`);
      assert.equal(donnee(`[data-jouer-quete="${quete.id}"] [data-jouer-progres]`, 'jouerProgres'),
        `0/${quete.objectif}`, 'la barre du panneau part de zéro');
      assert.equal(noeud(`[data-jouer-reclamer="${quete.id}"]`), null,
        'pas de bouton à encaisser tant que l’objectif n’est pas atteint');
      assert.ok(noeud(`[data-jouer-quete="${quete.id}"] [data-jouer-reste]`),
        'et le panneau dit ce qu’il reste');
    }
    await act(async () => noeud('[data-jouer-souk]').click());
    assert.ok(sons.includes('vers-le-souk') && sons.includes('menu'),
      'le panneau mène au Souk, avec le son du menu');
    for (const quete of jour) {
      assert.equal(donnee(`[data-souk-quete="${quete.id}"]`, 'soukQueteEtat'), 'encours',
        `${quete.id} commence en cours`);
      const bouton = noeud(`[data-souk-reclamer="${quete.id}"]`);
      assert.ok(bouton, `${quete.id} a son bouton Réclamer`);
      assert.ok(bouton.disabled, 'désactivé tant que l’objectif n’est pas atteint');
      assert.ok(bouton.classList.contains('rpg-menu-button--secondary'),
        'et il est en état secondaire : le laiton n’est pas encore dû');
      assert.ok(!bouton.classList.contains('rpg-menu-button--primary'),
        'donc pas en primaire avant l’objectif');
      assert.equal(bouton.dataset.soukReclamerEtat, 'attente', 'son état se lit dans le DOM');
      assert.match(bouton.title, /^Il reste \d+/, 'et il dit ce qu’il reste');
      assert.ok(noeud(`[data-souk-quete="${quete.id}"] [data-souk-reste]`) !== null,
        'la carte écrit aussi ce qu’il reste');      const recompense = noeud(`[data-souk-quete="${quete.id}"] .rpg-souk__recompense`);
      assert.ok(recompense.querySelector('.rpg-credit'), 'la récompense est frappée de la pièce');
      assert.match(recompense.textContent, new RegExp(`\\+${quete.recompense}`),
        'le montant reste écrit à côté');
      assert.match(recompense.querySelector('.sr-only')?.textContent ?? '', /crédits/,
        'et le mot est là pour qui écoute');
    }

    // ── Jouer remplit la barre, et le bouton s'ouvre ────────────────────────
    const premiere = jour[0];
    const geste = evenementPour(premiere);
    assert.ok(geste, `« ${premiere.id} » écoute un geste du contrat`);
    const coups = premiere.ecoute.montant ? 1 : premiere.objectif;
    for (let coup = 0; coup < coups; coup += 1) {
      await act(async () => bourse.noterEvenementDuel(geste));
    }
    assert.equal(donnee(`[data-souk-quete="${premiere.id}"] [data-souk-progres]`, 'soukProgres'),
      `${premiere.objectif}/${premiere.objectif}`, 'la barre atteint son objectif');
    assert.equal(donnee(`[data-souk-quete="${premiere.id}"]`, 'soukQueteEtat'), 'terminee');
    assert.equal(noeud(`[data-souk-reclamer="${premiere.id}"]`).disabled, false,
      'le bouton s’active quand l’objectif est atteint');
    assert.ok(noeud(`[data-souk-reclamer="${premiere.id}"]`).classList.contains('rpg-menu-button--primary'),
      'et il passe en primaire : la récompense est due');
    assert.ok(!noeud(`[data-souk-reclamer="${premiere.id}"]`).classList.contains('rpg-menu-button--secondary'),
      'il quitte l’état secondaire');
    assert.equal(noeud(`[data-souk-reclamer="${premiere.id}"]`).dataset.soukReclamerEtat, 'pret',
      'son état le dit aussi');
    assert.match(noeud(`[data-souk-reclamer="${premiere.id}"]`).textContent, new RegExp(String(premiere.recompense)),
      'et il annonce le montant qu’il paie');
    // Le panneau de l'onglet Jouer voit la même barre se remplir, et propose
    // le même geste au même moment — sans qu'on ait rien cliqué deux fois.
    assert.equal(donnee(`[data-jouer-quete="${premiere.id}"] [data-jouer-progres]`, 'jouerProgres'),
      `${premiere.objectif}/${premiere.objectif}`, 'le panneau montre la barre pleine');
    const boutonPanneau = noeud(`[data-jouer-reclamer="${premiere.id}"]`);
    assert.ok(boutonPanneau, 'et il propose d’encaisser');
    assert.equal(boutonPanneau.disabled, false, 'actif, comme celui du Souk');

    // ── Réclamer paie, une seule fois ───────────────────────────────────────
    // Le solde est relevé juste avant le clic : les gestes qui ont rempli la
    // barre ont pu payer eux aussi (un duel gagné vaut 8 ◈), et c'est le
    // paiement de la quête qu'on isole ici.
    const avantReclamation = Number(donnee('[data-souk-solde]', 'soukSolde'));
    await act(async () => noeud(`[data-souk-reclamer="${premiere.id}"]`).click());
    assert.equal(caisse.at(-1), premiere.recompense, 'la réclamation encaisse la récompense annoncée');
    assert.ok(Number(donnee('[data-souk-solde]', 'soukSolde')) >= avantReclamation + premiere.recompense,
      'et le solde monte d’autant');
    assert.equal(donnee(`[data-souk-quete="${premiere.id}"]`, 'soukQueteEtat'), 'reclamee');
    assert.equal(noeud(`[data-souk-reclamer="${premiere.id}"]`), null, 'le bouton disparaît une fois payé');
    assert.equal(donnee(`[data-jouer-quete="${premiere.id}"]`, 'jouerQueteEtat'), 'reclamee',
      'le panneau l’a encaissée du même coup d’œil');
    assert.equal(donnee('[data-jouer-compte]', 'jouerCompte'), '1/3', 'et son compte suit');
    if (bourse.aReclamer > 0) {
      assert.equal(Number(donnee('[data-souk-attente]', 'soukAttente')), bourse.aReclamer,
        'le bandeau compte ce qui reste à réclamer');
    } else {
      assert.equal(noeud('[data-souk-attente]'), null, 'plus rien à réclamer : le bandeau s’efface');
    }
    assert.ok(sons.includes('bell'), 'encaisser sonne');

    // ── Les trois quêtes réclamées ouvrent le Cachet ────────────────────────
    for (const quete of jour.slice(1)) {
      const gesteSuivant = evenementPour(quete);
      assert.ok(gesteSuivant, `« ${quete.id} » écoute un geste du contrat`);
      const repetitions = quete.ecoute.montant ? 1 : quete.objectif;
      for (let coup = 0; coup < repetitions; coup += 1) {
        await act(async () => bourse.noterEvenementDuel(gesteSuivant));
      }
      const avant = Number(donnee('[data-souk-solde]', 'soukSolde'));
      // La première des deux se réclame **depuis le panneau du menu** : c'est
      // le même geste du hook, donc le même argent — et le Souk le voit.
      if (quete === jour[1]) {
        const parLePanneau = noeud(`[data-jouer-reclamer="${quete.id}"]`);
        assert.ok(parLePanneau, 'le panneau propose d’encaisser cette quête-là');
        await act(async () => parLePanneau.click());
      } else {
        await act(async () => noeud(`[data-souk-reclamer="${quete.id}"]`)?.click());
      }
      assert.equal(donnee(`[data-souk-quete="${quete.id}"]`, 'soukQueteEtat'), 'reclamee',
        `${quete.id} est réclamée`);
      assert.equal(donnee(`[data-jouer-quete="${quete.id}"]`, 'jouerQueteEtat'), 'reclamee',
        'et le panneau du menu dit exactement la même chose');
      assert.equal(caisse.at(-1), quete.recompense, `${quete.id} paie les ${quete.recompense} ◈ qu’elle annonce`);
      assert.ok(Number(donnee('[data-souk-solde]', 'soukSolde')) >= avant + quete.recompense,
        'et le solde les encaisse');
    }
    assert.equal(donnee('[data-souk-cachet]', 'soukCachet'), 'disponible',
      'les trois réclamées : le Cachet s’ouvre');
    assert.ok(noeud('[data-souk-cachet-reclamer]'), 'et son bouton est là');
    assert.ok(noeud('[data-souk-cachet-reclamer] .rpg-credit'),
      'et son bouton est frappé de la pièce');
    assert.equal(donnee('[data-jouer-cachet]', 'jouerCachet'), 'disponible',
      'le panneau du menu ouvre son Cachet en même temps');
    assert.equal(donnee('[data-jouer-compte]', 'jouerCompte'), '3/3', 'les trois y sont réclamées');

    const avantCachet = Number(donnee('[data-souk-solde]', 'soukSolde'));
    // Celui-là se réclame depuis le panneau : le montant est le barème, pas un
    // chiffre écrit dans un écran.
    assert.ok(noeud('[data-jouer-cachet-reclamer] .rpg-credit'),
      'le Cachet du panneau est frappé de la pièce lui aussi');
    await act(async () => noeud('[data-jouer-cachet-reclamer]').click());
    assert.equal(caisse.at(-1), GAINS.cachetDuCycle,
      `le Cachet paie ${GAINS.cachetDuCycle} ◈, d’où qu’on le réclame`);
    assert.ok(Number(donnee('[data-souk-solde]', 'soukSolde')) >= avantCachet + GAINS.cachetDuCycle,
      'et le solde les encaisse');
    assert.equal(donnee('[data-souk-cachet]', 'soukCachet'), 'pris', 'et il ne se réclame plus');
    assert.equal(donnee('[data-jouer-cachet]', 'jouerCachet'), 'pris', 'le panneau le sait aussi');
    assert.equal(noeud('[data-souk-cachet-reclamer]'), null, 'son bouton disparaît');
    assert.equal(Number(donnee('[data-souk-attente]', 'soukAttente')) || 0, 0,
      'plus rien n’attend : le bandeau s’efface');
    assert.ok(sons.includes('victoire'), 'le Cachet sonne sa victoire');

    // ── Acheter un paquet : la cérémonie, les cartes rangées, le solde ──────
    const soldeAvantAchat = Number(donnee('[data-souk-solde]', 'soukSolde'));
    const cartesAvant = bourse.bourse.cartes.length;
    const manquantesAvant = manquantesDuRayon('souk', bourse);
    assert.ok(Number.isFinite(manquantesAvant), 'le comptoir annonce ce qui lui manque');
    await act(async () => noeud('[data-souk-ouvrir="souk"]').click());
    assert.ok(noeud('[data-souk-ceremonie]'), 'la cérémonie d’ouverture s’ouvre');
    // Le paquet coûte son prix, mais les doublons sont remboursés dans la
    // foulée : le solde d'après vaut le solde d'avant, moins le prix, plus le
    // remboursement. C'est la seule écriture qui touche au portefeuille.
    assert.equal(
      Number(donnee('[data-souk-solde]', 'soukSolde')),
      soldeAvantAchat - 140 + bourse.ouverture.remboursement,
      'le paquet coûte ses 140 ◈, moins ce que les doublons rendent',
    );
    // Le portefeuille ne garde qu'un exemplaire de chaque carte : une carte déjà
    // rangée — par un paquet de palier, par exemple — n'y revient pas. Ce qui
    // compte, c'est que le tirage y entre, et que la collection voie ses
    // cartes **nouvelles**.
    const rangees = bourse.bourse.cartes.length - cartesAvant;
    assert.ok(rangees >= bourse.ouverture.nouvelles && rangees <= 5,
      `le paquet range ses cartes (${rangees} entrées, ${bourse.ouverture.nouvelles} nouvelles)`);
    assert.equal(noeud('[data-souk-ceremonie]').querySelectorAll('[data-souk-carte-dos]').length, 5,
      'les cinq cartes commencent face cachée');
    assert.ok(sons.includes('collection-rafraichie'), 'l’atelier de decks est prévenu : la collection a grandi');
    assert.ok(noeud('[data-souk-ceremonie-ranger]').disabled, '« Tout ranger » attend la fin des retournements');
    // Les cartes sont écrites, la collection est rafraîchie : l'étagère sait
    // déjà ce qui vient d'être rangé, même sous la cérémonie.
    assert.ok(manquantesDuRayon('souk', bourse) < manquantesAvant,
      'l’achat rafraîchit la collection tout de suite, sans recharger la page');

    // « Passer » retourne tout d'un coup : c'est le geste des gens pressés.
    await act(async () => noeud('[data-souk-ceremonie-passer]').click());
    const cartes = [...noeud('[data-souk-ceremonie]').querySelectorAll('[data-souk-carte]')];
    assert.equal(cartes.length, 5, 'les cinq cartes sont retournées');
    assert.equal(cartes.filter((carte) => carte.dataset.soukCarteEtat === 'nouvelle').length,
      bourse.ouverture.nouvelles, 'les tampons NOUVELLE comptent ce que le tirage a donné');
    assert.equal(
      cartes.reduce((somme, carte) => somme + Number(carte.dataset.soukCarteRemboursement), 0),
      bourse.ouverture.remboursement,
      'et les doublons affichent exactement ce qu’ils rendent',
    );
    assert.ok(bourse.ouverture.cartes.every((detail) => detail.carte), 'chaque carte tirée est une carte réelle');
    assert.equal(new Set(bourse.ouverture.cartes.map((detail) => detail.id)).size, 5, 'jamais deux fois la même');
    cartes.forEach((carte, index) => {
      const detail = bourse.ouverture.cartes[index];
      assert.equal(carte.dataset.cardId, detail.id, 'la face 3D ouvre la fiche de la bonne carte au clic droit');
      assert.ok(carte.querySelector('.rpg-souk__carte-volume'), 'la carte est présentée dans son volume 3D');
      assert.equal(carte.querySelector('.rpg-souk__carte-corps'), null, 'aucun descriptif ne couvre la carte révélée');
      assert.equal(carte.querySelector('h4'), null, 'même son nom reste dans la fiche de prévisualisation');
      assert.equal(carte.querySelector('[data-card-copies]')?.dataset.cardCopies, String(detail.exemplaires),
        'la pastille indique le stock après rangement de cette carte');
    });
    assert.ok(noeud('[data-souk-ceremonie-ranger]').disabled === false, 'une fois retournées, on peut ranger');

    // ── « Tout ranger » referme, et la collection voit les nouvelles cartes ──
    await act(async () => noeud('[data-souk-ceremonie-ranger]').click());
    assert.equal(noeud('[data-souk-ceremonie]'), null, 'la cérémonie rend la main');
    assert.equal(bourse.ouverture, null, 'et le hook oublie l’ouverture');
    if (bourse.quetes.quetes.includes('booster-1')) {
      assert.ok(bourse.quetes.progres['booster-1'] >= 1, '« Ouvrir le comptoir » avance en achetant');
    }
    // Le coffret coûte dix paquets : hors de portée ici, et il le dit.
    assert.ok(noeud('[data-souk-coffret="souk"]').disabled, 'le coffret demande ce qu’il coûte');
    const soldeAvantRefus = Number(donnee('[data-souk-solde]', 'soukSolde'));
    const refus = bourse.acheterCoffret('souk');
    assert.equal(refus.ok, false, 'un coffret sans solde refuse l’achat');
    assert.equal(refus.raison, 'solde-insuffisant');
    assert.equal(Number(donnee('[data-souk-solde]', 'soukSolde')), soldeAvantRefus,
      'un refus ne touche pas un seul crédit');

    // ── Le retour rend la main ──────────────────────────────────────────────
    await act(async () => noeud('[data-souk-retour]').click());
    assert.ok(sons.includes('sortie'), 'le bouton Menu sort de l’écran');

    await act(async () => root.unmount());
    conteneur.remove();
    await wait(20);

    // ── Achat à l’unité : une rare, un second tirage, puis une mythique ────
    // Une seconde sonde part avec une bourse garnie par la règle de crédit ;
    // le parcours utilise ensuite uniquement les vrais boutons et le vrai hook.
    window.localStorage.clear();
    window.localStorage.setItem(RPG_GRAINE_STORAGE_KEY, 'graine-du-smoke-souk');
    sauverPortefeuille(crediterCredits(portefeuilleVide(), 1000).portefeuille);
    conteneurDirect = document.createElement('div');
    document.body.appendChild(conteneurDirect);
    rootDirect = createRoot(conteneurDirect);
    await act(async () => rendre(rootDirect));

    const premierTirage = [...bourse.bourse.etal.cartes];
    const rareId = premierTirage.find((id) => cardById(id)?.rarity === 'rare');
    assert.ok(rareId, 'le premier tirage contient une rare à acheter');
    const ouverturesAvant = bourse.bourse.ouvertures;
    const pitieAvant = bourse.bourse.pitie;
    await act(async () => noeud(`[data-souk-direct-acheter="${rareId}"]`).click());
    assert.equal(bourse.bourse.credits, 850, 'la rare débite exactement 150 crédits');
    assert.equal(bourse.bourse.cartes.filter((id) => id === rareId).length, 1, 'elle ajoute un seul identifiant de carte');
    assert.equal(bourse.bourse.etal.achetees.filter((id) => id === rareId).length, 1, 'et mémorise un seul achat');
    assert.equal(bourse.bourse.ouvertures, ouverturesAvant, 'l’étal ne compte pas comme un booster');
    assert.equal(bourse.bourse.pitie, pitieAvant, 'et ne touche pas à la pitié');
    const carteAchetee = noeud(`[data-souk-direct-carte="${rareId}"]`);
    assert.equal(carteAchetee?.querySelector('[data-card-copies]')?.dataset.cardCopies, '1',
      'la pastille de l’étal voit le nouvel exemplaire');
    assert.equal(carteAchetee?.querySelector('[data-card-copies]')?.dataset.cardCopiesMax, '2',
      'et elle dit le quota du deck : « 1/2 », pas un chiffre sans bord');
    assert.equal(carteAchetee?.dataset.soukDirectEtat, 'achetee',
      'la carte du jour reste marquée « achetée », pas « déjà obtenue »');
    assert.match(carteAchetee?.textContent ?? '', /1\/2/, 'la ligne de stock reste lisible sous le nom');
    assert.ok(noeud(`[data-souk-direct-acheter="${rareId}"]`).disabled, 'la carte achetée ne peut pas être facturée deux fois le même jour');
    assert.equal(noeud('[data-souk-ceremonie]'), null, 'un achat direct ne déclenche aucune cérémonie de booster');
    // Le bug d’origine, côté DOM : une carte possédée en un exemplaire portait
    // « déjà possédée » et se refusait à la vente. Plus aucun carte de l’étal ne
    // doit employer ce mot — soit il reste une copie à acheter, soit le quota
    // est atteint et l’étal le dit.
    assert.ok(![...document.querySelectorAll('[data-souk-direct-carte]')]
      .some((carte) => /Déjà possédée/i.test(carte.textContent ?? '')),
    'aucune carte de l’étal ne dit « déjà possédée »');
    const offresApresAchat = [...document.querySelectorAll('[data-souk-direct-carte]')];
    assert.ok(offresApresAchat.filter((carte) => carte.dataset.soukDirectEtat === 'disponible').length >= 4,
      'les quatre autres offres du jour restent achetables : une possession partielle n’en ferme aucune');

    await act(async () => noeud('[data-souk-direct-rafraichir]').click());
    const secondTirage = [...bourse.bourse.etal.cartes];
    assert.equal(secondTirage.length, 5, 'le rafraîchissement propose bien cinq cartes');
    assert.ok(secondTirage.every((id) => !premierTirage.includes(id)), 'les cinq offres sont réellement renouvelées');
    assert.equal(bourse.bourse.etal.rafraichissements, 1, 'le rafraîchissement quotidien est consommé');
    assert.ok(noeud('[data-souk-direct-rafraichir]').disabled, 'et son bouton se ferme jusqu’au lendemain');
    assert.ok(bourse.bourse.etal.achetees.includes(rareId), 'l’achat du premier tirage reste dans l’historique du jour');

    const mythiqueId = secondTirage.find((id) => cardById(id)?.rarity === 'mythique');
    assert.ok(mythiqueId, 'le second tirage contient une mythique à acheter');
    await act(async () => noeud(`[data-souk-direct-acheter="${mythiqueId}"]`).click());
    assert.equal(bourse.bourse.credits, 550, 'la mythique débite exactement 300 crédits');
    assert.equal(bourse.bourse.cartes.filter((id) => id === mythiqueId).length, 1, 'elle aussi ne donne qu’un exemplaire');
    const soldeApres = bourse.bourse.credits;
    let secondAchat = null;
    await act(async () => { secondAchat = bourse.acheterCarteDirecte(mythiqueId); });
    assert.equal(secondAchat.ok, false, 'même en rejouant le geste, la seconde facturation est refusée');
    assert.equal(bourse.bourse.credits, soldeApres, 'et le solde ne bouge plus');

    // ── Le lendemain : ce qui manque encore est bel et bien en vente ───────
    // Le tirage est rejoué à l'identique (même graine, même jour) et seul le
    // garde-fou des achats se vide — c'est exactement ce que voit le joueur qui
    // revient après minuit. Une rare tenue à un seul exemplaire doit donc être
    // **achetable**, et non pas marquée d'un « déjà obtenu » qui la dit finie.
    await act(async () => rootDirect.unmount());
    rootDirect = null;
    conteneurDirect.remove();
    conteneurDirect = null;
    await wait(20);

    const veille = chargerPortefeuille();
    sauverPortefeuille({
      ...veille,
      etal: { ...veille.etal, cartes: premierTirage, achetees: [] },
    });
    conteneurDirect = document.createElement('div');
    document.body.appendChild(conteneurDirect);
    rootDirect = createRoot(conteneurDirect);
    await act(async () => rendre(rootDirect));

    const auLendemain = noeud(`[data-souk-direct-carte="${rareId}"]`);
    assert.equal(auLendemain?.dataset.soukDirectEtat, 'disponible',
      'un exemplaire sur deux : la carte est disponible, pas « déjà obtenue »');
    assert.match(auLendemain?.querySelector('[data-souk-direct-acheter]')?.textContent ?? '', /Acheter le 2ᵉ/,
      'le bouton nomme la copie qu’il vend');
    assert.match(auLendemain?.textContent ?? '', /Il vous manque le 2ᵉ exemplaire · 1\/2/,
      'et la ligne de stock le redit sous le nom');
    await act(async () => noeud(`[data-souk-direct-acheter="${rareId}"]`).click());
    assert.equal(bourse.bourse.credits, 400, 'la seconde copie se paie au même prix, 150 crédits');
    assert.deepEqual(bourse.bourse.exemplaires, { [rareId]: 2 }, 'le portefeuille compte deux copies');
    assert.equal(bourse.bourse.cartes.filter((id) => id === rareId).length, 1,
      'la possession, elle, reste un seul identifiant : c’est le stock qui compte');
    const complete = noeud(`[data-souk-direct-carte="${rareId}"]`);
    assert.equal(complete?.dataset.soukDirectEtat, 'complet', 'au quota du deck, la carte devient « complète »');
    assert.equal(complete?.querySelector('[data-card-copies]')?.dataset.cardCopies, '2');
    assert.match(complete?.textContent ?? '', /Quota du deck atteint · 2\/2/,
      'et la raison du refus est écrite noir sur blanc');
    assert.ok(noeud(`[data-souk-direct-acheter="${rareId}"]`).disabled, 'plus rien à payer sur cette carte');
    assert.ok(Number(donnee('[data-souk-direct-complet]', 'soukDirectComplet')) >= 1,
      'l’étal résume en une ligne les cartes du jour déjà au quota');

    await act(async () => rootDirect.unmount());
    rootDirect = null;
    conteneurDirect.remove();
    conteneurDirect = null;
    await wait(20);
  } finally {
    try { await act(async () => root.unmount()); } catch { /* déjà démonté */ }
    conteneur.remove();
    if (rootDirect) {
      try { await act(async () => rootDirect.unmount()); } catch { /* déjà démonté */ }
    }
    conteneurDirect?.remove();
  }
}
