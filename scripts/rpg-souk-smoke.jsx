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
import RpgSouk, { creditsLisible, dureeAvantMinuit } from '../src/games/RpgSouk.jsx';
import {
  RPG_GRAINE_STORAGE_KEY, RPG_QUETES_STORAGE_KEY, cleJour, jourPrecedent, queteParId,
} from '../src/games/rpgQuetes.js';
import { GAINS, RPG_BOURSE_STORAGE_KEY, portefeuilleVide } from '../src/games/rpgCredits.js';
import { RPG_DUEL_CARDS, cardColors } from '../src/games/rpgCards.js';
import { rngSeme } from '../src/games/rpgHasard.js';
import { collectionJoueur } from '../src/games/rpgCollection.js';
import { RPG_STORY_TOURS } from '../src/games/rpgStoryTours.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * La progression du joueur du smoke : **deux tours montées**. C'est le moment
 * où l'étagère a de l'intérêt — Sable, Braise, Eau et le grand étal sont
 * ouverts, la Neige attend encore ses abysses, et les rayons ont des mythiques
 * à promettre. Une progression plus pauvre rendrait le smoke presque vide.
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

/** L'écran, tel que la page le monte : le hook en dessous, l'écran au-dessus. */
function Sonde({ surPret, sons }) {
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
      onReclamerQuete={(id) => bourse.reclamerUneQuete(id)}
      onReclamerCachet={() => bourse.reclamerLeCachet()}
      onOuvrirBooster={(rayonId) => bourse.acheterBooster(rayonId)}
      onOuvrirCoffret={(rayonId) => bourse.acheterCoffret(rayonId)}
      onFermerOuverture={() => bourse.fermerOuverture()}
      onPlaySfx={(nom) => { sons.push(nom); }}
      onExit={() => { sons.push('sortie'); }}
    />
  );
}

const KIND_PAR_TYPE = {
  'terrain-pose': 'terrain',
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
  if (type === 'booster-ouvert') return { type, rayonId: 'sable' };
  const kind = KIND_PAR_TYPE[type];
  const carte = type === 'carte-jouee'
    ? RPG_DUEL_CARDS.find((candidat) => cardColors(candidat).includes(couleur))
    : RPG_DUEL_CARDS.find((candidat) => candidat.kind === kind);
  return carte ? { type, cardId: carte.id } : null;
}

/** La valeur d'un attribut `data-` de l'écran (jamais un `container` figé). */
const donnee = (selecteur, cle) => document.querySelector(selecteur)?.dataset?.[cle] ?? null;
const noeud = (selecteur) => document.querySelector(selecteur);
/** Ce qu'il manque encore à un rayon — l'attribut est sur la ligne, pas la tuile. */
const manquantesDuRayon = (rayonId) => Number(noeud(`[data-souk-rayon="${rayonId}"] [data-souk-rayon-reste]`)
  ?.dataset?.soukRayonReste);

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
  let root3 = null;
  let root4 = null;
  const sons = [];
  let bourse = null;
  const rendre = (racine) => racine.render(<Sonde surPret={(valeur) => { bourse = valeur; }} sons={sons} />);
  try {
    await act(async () => rendre(root));

    // ── L'écran est là, et il dit ce qu'il a ────────────────────────────────
    assert.ok(noeud('[data-souk]'), 'l’écran du Souk se rend');
    assert.equal(donnee('[data-souk-solde]', 'soukSolde'), '0', 'un joueur neuf n’a pas un crédit');
    assert.equal(Number(donnee('[data-souk-quetes]', 'soukQuetes')), 3, 'la journée propose trois quêtes');
    assert.ok(noeud('[data-souk-quetes]')?.children?.length === 3, 'et trois cartes sont peintes');
    assert.equal(donnee('[data-souk-cachet]', 'soukCachet'), 'attente',
      'le Cachet attend ses trois quêtes');
    // ── L'étagère : cinq rayons, deux ouverts, et rien d'achetable sans solde ─
    assert.equal(Number(donnee('[data-souk-rayons-nombre]', 'soukRayonsNombre')), 5, 'les cinq rayons sont là');
    assert.equal(donnee('[data-souk-rayons]', 'soukRayons'), 'ouverts',
      'les Listes sont montées : Sable et Braise sont ouverts');
    assert.equal(donnee('[data-souk-rayon="braise"]', 'soukRayonEtat'), 'sans-solde',
      'un rayon ouvert sans un crédit refuse l’achat');
    assert.match(noeud('[data-souk-rayon="braise"] [data-souk-rayon-refus]')?.textContent ?? '', /Il manque/,
      'et il dit combien il manque');
    assert.ok(noeud('[data-souk-ouvrir="braise"]').disabled, 'le bouton Ouvrir est donc désactivé');
    assert.equal(donnee('[data-souk-rayon="neige"]', 'soukRayonEtat'), 'ferme',
      'la Neige est encore gardée par sa tour');
    assert.match(noeud('[data-souk-rayon="neige"] [data-souk-rayon-refus]')?.textContent ?? '', /gard[eé]/,
      'et le refus dit qui la garde');
    assert.match(noeud('[data-souk-rayon="braise"] [data-souk-rayon-taux]')?.textContent ?? '', /5 cartes/,
      'chaque rayon annonce son taux');

    // ── Le paquet en volume : cinq faces, deux sertissages, son étiquette ───
    const paquet = noeud('[data-souk-ouvrir="braise"]');
    assert.equal(paquet.dataset.soukPaquet, 'braise', 'le paquet porte la couleur de son rayon');
    assert.equal(paquet.querySelectorAll('.rpg-souk__paquet-face').length, 5,
      'le sachet est un pavé : cinq faces');
    assert.equal(paquet.querySelectorAll('.rpg-souk__paquet-sertissage').length, 2,
      'et il est scellé en haut et en bas');
    assert.ok((paquet.querySelector('.rpg-souk__paquet-rune')?.textContent ?? '').includes('⌛'),
      'la rune du Sablier est marquée sur le paquet');
    assert.equal(paquet.querySelector('.rpg-souk__paquet-nom')?.textContent, 'Braise',
      'le paquet dit de quel rayon il vient');
    assert.match(paquet.querySelector('.rpg-souk__paquet-prix')?.textContent ?? '', /^Acheter · 140 ◈$/,
      'son étiquette dit le geste et le prix');
    assert.equal(paquet.getAttribute('aria-label'), 'Ouvrir le paquet Braise · 140 crédits',
      'et le paquet se nomme pour qui ne le voit pas');
    assert.equal(paquet.querySelector('.rpg-souk__paquet-scene')?.getAttribute('aria-hidden'), 'true',
      'la scène est décorative : le bouton porte déjà tout le sens');
    assert.equal(noeud('[data-souk-ouvrir-bouton="braise"]'), null,
      'le paquet est la seule voie d’achat — pas de bouton texte qui le double');
    assert.ok(noeud('[data-souk-ouvrir="neige"]')?.classList.contains('is-ferme'),
      'un rayon gardé affiche un paquet éteint');
    assert.equal(noeud('[data-souk-attente]'), null, 'rien à réclamer : pas de bandeau');

    // ── Ce qui n'est pas terminé ne se réclame pas ──────────────────────────
    const jour = bourse.quetes.quetes.map((id) => queteParId(id));
    assert.ok(jour.every(Boolean), 'les quêtes du jour sont de vraies quêtes du pool');
    for (const quete of jour) {
      assert.equal(donnee(`[data-souk-quete="${quete.id}"]`, 'soukQueteEtat'), 'encours',
        `${quete.id} commence en cours`);
      const bouton = noeud(`[data-souk-reclamer="${quete.id}"]`);
      assert.ok(bouton, `${quete.id} a son bouton Réclamer`);
      assert.ok(bouton.disabled, 'désactivé tant que l’objectif n’est pas atteint');
      assert.match(bouton.title, /^Il reste \d+/, 'et il dit ce qu’il reste');
      assert.ok(noeud(`[data-souk-quete="${quete.id}"] [data-souk-reste]`) !== null,
        'la carte écrit aussi ce qu’il reste');
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
    assert.match(noeud(`[data-souk-reclamer="${premiere.id}"]`).textContent, new RegExp(String(premiere.recompense)),
      'et il annonce le montant qu’il paie');

    // ── Réclamer paie, une seule fois ───────────────────────────────────────
    // Le solde est relevé juste avant le clic : les gestes qui ont rempli la
    // barre ont pu payer eux aussi (un duel gagné vaut 8 ◈), et c'est le
    // paiement de la quête qu'on isole ici.
    const avantReclamation = Number(donnee('[data-souk-solde]', 'soukSolde'));
    await act(async () => noeud(`[data-souk-reclamer="${premiere.id}"]`).click());
    assert.equal(Number(donnee('[data-souk-solde]', 'soukSolde')), avantReclamation + premiere.recompense,
      'la réclamation encaisse la récompense annoncée');
    assert.equal(donnee(`[data-souk-quete="${premiere.id}"]`, 'soukQueteEtat'), 'reclamee');
    assert.equal(noeud(`[data-souk-reclamer="${premiere.id}"]`), null, 'le bouton disparaît une fois payé');
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
      await act(async () => noeud(`[data-souk-reclamer="${quete.id}"]`)?.click());
      assert.equal(donnee(`[data-souk-quete="${quete.id}"]`, 'soukQueteEtat'), 'reclamee',
        `${quete.id} est réclamée`);
      assert.equal(Number(donnee('[data-souk-solde]', 'soukSolde')), avant + quete.recompense,
        `${quete.id} paie les ${quete.recompense} ◈ qu’elle annonce`);
    }
    assert.equal(donnee('[data-souk-cachet]', 'soukCachet'), 'disponible',
      'les trois réclamées : le Cachet s’ouvre');
    assert.ok(noeud('[data-souk-cachet-reclamer]'), 'et son bouton est là');

    const avantCachet = Number(donnee('[data-souk-solde]', 'soukSolde'));
    await act(async () => noeud('[data-souk-cachet-reclamer]').click());
    assert.equal(Number(donnee('[data-souk-solde]', 'soukSolde')), avantCachet + GAINS.cachetDuCycle,
      `le Cachet paie ${GAINS.cachetDuCycle} ◈`);
    assert.equal(donnee('[data-souk-cachet]', 'soukCachet'), 'pris', 'et il ne se réclame plus');
    assert.equal(noeud('[data-souk-cachet-reclamer]'), null, 'son bouton disparaît');
    assert.equal(Number(donnee('[data-souk-attente]', 'soukAttente')) || 0, 0,
      'plus rien n’attend : le bandeau s’efface');
    assert.ok(sons.includes('victoire'), 'le Cachet sonne sa victoire');

    // ── Acheter un paquet : la cérémonie, les cartes rangées, le solde ──────
    const soldeAvantAchat = Number(donnee('[data-souk-solde]', 'soukSolde'));
    const cartesAvant = bourse.bourse.cartes.length;
    const manquantesAvant = manquantesDuRayon('braise');
    assert.ok(Number.isFinite(manquantesAvant), 'le rayon Braise annonce ce qui lui manque');
    await act(async () => noeud('[data-souk-ouvrir="braise"]').click());
    assert.ok(noeud('[data-souk-ceremonie]'), 'la cérémonie d’ouverture s’ouvre');
    // Le paquet coûte son prix, mais les doublons sont remboursés dans la
    // foulée : le solde d'après vaut le solde d'avant, moins le prix, plus le
    // remboursement. C'est la seule écriture qui touche au portefeuille.
    assert.equal(
      Number(donnee('[data-souk-solde]', 'soukSolde')),
      soldeAvantAchat - 140 + bourse.ouverture.remboursement,
      'le paquet coûte ses 140 ◈, moins ce que les doublons rendent',
    );
    assert.equal(bourse.bourse.cartes.length, cartesAvant + 5, 'les cinq cartes rejoignent le portefeuille');
    assert.equal(noeud('[data-souk-ceremonie]').querySelectorAll('[data-souk-carte-dos]').length, 5,
      'les cinq cartes commencent face cachée');
    assert.ok(sons.includes('collection-rafraichie'), 'l’atelier de decks est prévenu : la collection a grandi');
    assert.ok(noeud('[data-souk-ceremonie-ranger]').disabled, '« Tout ranger » attend la fin des retournements');
    // Les cartes sont écrites, la collection est rafraîchie : l'étagère sait
    // déjà ce qui vient d'être rangé, même sous la cérémonie.
    assert.ok(manquantesDuRayon('braise') < manquantesAvant,
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
    assert.ok(noeud('[data-souk-ceremonie-ranger]').disabled === false, 'une fois retournées, on peut ranger');

    // ── « Tout ranger » referme, et la collection voit les nouvelles cartes ──
    await act(async () => noeud('[data-souk-ceremonie-ranger]').click());
    assert.equal(noeud('[data-souk-ceremonie]'), null, 'la cérémonie rend la main');
    assert.equal(bourse.ouverture, null, 'et le hook oublie l’ouverture');
    if (bourse.quetes.quetes.includes('booster-1')) {
      assert.ok(bourse.quetes.progres['booster-1'] >= 1, '« Ouvrir le comptoir » avance en achetant');
    }
    // Le coffret coûte dix paquets : hors de portée ici, et il le dit.
    assert.ok(noeud('[data-souk-coffret="braise"]').disabled, 'le coffret demande ce qu’il coûte');
    const soldeAvantRefus = Number(donnee('[data-souk-solde]', 'soukSolde'));
    const refus = bourse.acheterBooster('neige');
    assert.equal(refus.ok, false, 'un rayon fermé refuse l’achat');
    assert.equal(refus.raison, 'rayon-ferme');
    assert.equal(Number(donnee('[data-souk-solde]', 'soukSolde')), soldeAvantRefus,
      'un refus ne touche pas un seul crédit');

    // ── Le retour rend la main ──────────────────────────────────────────────
    await act(async () => noeud('[data-souk-retour]').click());
    assert.ok(sons.includes('sortie'), 'le bouton Menu sort de l’écran');

    await act(async () => root.unmount());
    conteneur.remove();
    await wait(20);
  } finally {
    try { await act(async () => root.unmount()); } catch { /* déjà démonté */ }
    conteneur.remove();
  }
}
