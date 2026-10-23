/**
 * Le smoke du profil joueur — l'écran monté pour de vrai, branché sur le vrai
 * hook de bourse, plus la vraie page du Sablier pour l'onglet du menu.
 *
 * Il ne simule rien : `RpgProfilJoueur` reçoit `useSablierBourse`, l'XP est
 * versée par les **gestes du contrat d'événements**, et les boutons sont cliqués
 * dans le DOM. Ce que le joueur voit — la barre qui se remplit, le niveau qui
 * tombe, le paquet offert qui s'ouvre sans qu'un crédit bouge, la dette qui
 * attend derrière la cérémonie — est lu dans le document, pas dans l'état interne.
 *
 * Le tirage est semé (`rngSeme`) : sans ça le smoke dépendrait du hasard,
 * exactement ce que le reste du jeu refuse. Aucune assertion ne dépend d'une
 * minuterie.
 */

import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { useSablierBourse } from '../src/games/useSablierBourse.js';
import RpgProfilJoueur from '../src/games/RpgProfilJoueur.jsx';
import RpgBoosterOuverture from '../src/games/RpgBoosterOuverture.jsx';
import { GAINS } from '../src/games/rpgCredits.js';
import { RPG_GRAINE_STORAGE_KEY } from '../src/games/rpgQuetes.js';
import {
  EMBLEMES,
  RPG_PROFIL_STORAGE_KEY,
  XP,
  progressionDeXp,
  seuilDuNiveau,
} from '../src/games/rpgProfil.js';
import { RPG_DUEL_CARDS, carteJouableSansTerrain } from '../src/games/rpgCards.js';
import { rngSeme } from '../src/games/rpgHasard.js';
import { RPG_STORY_TOURS } from '../src/games/rpgStoryTours.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const setterValeur = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
const texte = (element) => (element?.textContent ?? '').replace(/\s+/g, ' ').trim();

/** Deux tours montées : le comptoir a toutes ses couleurs dans le vivier. */
const PROGRESSION = {
  etagesVaincus: RPG_STORY_TOURS.slice(0, 2).flatMap((tour) => tour.etages.map((etage) => etage.id)),
};
const TOUR = RPG_STORY_TOURS[0];
const DERNIER_ETAGE = TOUR.etages[TOUR.etages.length - 1].id;
const illustration = (carte) => `/cards/${carte?.id ?? 'inconnue'}.jpg`;
const jouables = RPG_DUEL_CARDS.filter(carteJouableSansTerrain).map((carte) => carte.id);

/**
 * L'écran, tel que la page le monte : le hook en dessous, le profil au-dessus,
 * et la cérémonie du paquet offert à côté — c'est `MonteeDeNiveau` de la page,
 * réduite à son visage « paquet offert » (l'annonce seule est gardée par
 * `scripts/rpg-profil-check.mjs`, qui lit la source).
 */
function Sonde({ surPret, sons, nomCompte = null }) {
  const bourse = useSablierBourse({
    progression: PROGRESSION,
    rng: rngSeme(20261023),
    onCartesRangees: () => { sons.push('collection-rafraichie'); },
  });
  surPret(bourse);
  const montee = bourse.monteeNiveau;
  return (
    <>
      <RpgProfilJoueur
        profil={bourse.profil}
        nomCompte={nomCompte}
        onRenommer={(pseudo) => bourse.renommerLeProfil(pseudo)}
        onChoisirEmbleme={(id) => bourse.choisirUnEmbleme(id)}
        onOuvrirSouk={() => { sons.push('vers-le-souk'); }}
        onPlaySfx={(nom) => { sons.push(nom); }}
        onExit={() => { sons.push('sortie'); }}
      />
      {montee?.ouverture ? (
        <RpgBoosterOuverture
          key={montee.token}
          ouverture={montee.ouverture}
          cardArt={illustration}
          onFermer={() => bourse.fermerMonteeNiveau()}
          onPlaySfx={(nom) => { sons.push(nom); }}
        />
      ) : null}
    </>
  );
}

const donnee = (selecteur, cle) => document.querySelector(selecteur)?.dataset?.[cle] ?? null;
const noeud = (selecteur) => document.querySelector(selecteur);
const nombre = (selecteur, cle) => Number(donnee(selecteur, cle));

export async function checkRpgProfilEcran(assert) {
  window.localStorage.clear();
  window.localStorage.setItem(RPG_GRAINE_STORAGE_KEY, 'graine-du-smoke-profil');
  const conteneur = document.createElement('div');
  document.body.appendChild(conteneur);
  const root = createRoot(conteneur);
  let racine2 = null;
  const sons = [];
  let bourse = null;
  const rendre = () => root.render(<Sonde surPret={(valeur) => { bourse = valeur; }} sons={sons} />);

  try {
    await act(async () => rendre());

    // ── Un joueur neuf : niveau 1, rien dans la barre, rien à offrir ────────
    assert.ok(noeud('[data-profil]'), 'l’écran du profil se rend');
    assert.equal(nombre('[data-profil-niveau]', 'profilNiveau'), 1, 'on naît au niveau 1');
    assert.equal(nombre('[data-profil-xp]', 'profilXp'), 0, 'sans un geste, la barre est vide');
    assert.equal(nombre('[data-profil-xp-need]', 'profilXpNeed'), seuilDuNiveau(1),
      'et elle annonce ce que le premier palier demande');
    assert.equal(nombre('[data-profil-xp-percent]', 'profilXpPercent'), 0);
    assert.equal(noeud('[data-profil-attente]'), null, 'rien n’est dû : pas de bandeau');
    assert.equal(noeud('[data-souk-ceremonie]'), null, 'et pas de cérémonie en l’air');
    assert.match(texte(noeud('[data-profil-xp-reste]')), new RegExp(`^0 / ${seuilDuNiveau(1)} XP$`),
      'la lecture dit ce que la barre a avalé et ce que le palier demande — rien d’autre');
    assert.match(texte(noeud('[data-profil-niveau]')), /^Niveau 1$/, 'le niveau s’écrit en toutes lettres');
    assert.equal(texte(noeud('.rpg-profil__medaillon')), EMBLEMES[0].glyphe,
      'le médaillon porte l’emblème du joueur');
    assert.equal(donnee('[data-profil-pseudo]', 'profilPseudo'), 'Gardien de Bab El',
      'sans compte et sans pseudo, la ville nomme le joueur');

    // La carte est **dépouillée** : ni rang, ni compteurs, ni barème, ni journal,
    // ni paliers à venir, ni état de synchronisation. Ces chiffres existent
    // toujours — dans `rpgProfil.js`, au Souk — mais la carte de profil n'est pas
    // un tableau de bord.
    for (const absent of ['[data-profil-rang]', '[data-profil-stat]', '[data-profil-stats]',
      '[data-profil-bareme]', '[data-profil-journal]', '[data-profil-courbe]', '[data-profil-sync]']) {
      assert.equal(noeud(absent), null, `${absent} n’est plus sur la carte`);
    }
    assert.equal(document.querySelectorAll('.rpg-profil__section').length, 0, 'plus aucune section à titre');
    assert.ok(document.querySelectorAll('[data-profil] *').length < 40,
      `toute la carte tient en quelques noeuds (${document.querySelectorAll('[data-profil] *').length})`);
    assert.equal(document.querySelectorAll('[data-profil] h3').length, 0, 'et pas un titre de section');

    // ── Jouer fait monter la barre, sans franchir de palier ─────────────────
    for (let index = 0; index < 4; index += 1) {
      await act(async () => bourse.noterEvenementDuel({ type: 'carte-jouee', cardId: jouables[index] }));
    }
    const attendu4 = progressionDeXp(XP.carteJouee * 4);
    assert.equal(nombre('[data-profil-xp]', 'profilXp'), attendu4.into, 'quatre cartes posées valent leur XP');
    assert.equal(nombre('[data-profil-xp-percent]', 'profilXpPercent'), attendu4.percent,
      'et la barre se remplit du même pourcentage');
    assert.equal(nombre('[data-profil-niveau]', 'profilNiveau'), 1, 'le premier palier n’est pas encore franchi');
    assert.equal(noeud('[data-souk-ceremonie]'), null, 'rien à ouvrir : pas de cérémonie');
    assert.equal(bourse.profil.stats.cartesJouees, 4,
      'le compteur de cartes suit — dans le profil, plus sur la carte');
    assert.equal(bourse.bourse.credits, 0, 'l’XP ne paie pas de crédit : ce sont deux monnaies');

    // ── Le duel gagné franchit le palier et ouvre un paquet offert ──────────
    const cartesAvant = bourse.bourse.cartes.length;
    const soldeAvant = bourse.bourse.credits;
    const palier = await act(async () => bourse.noterEvenementDuel({ type: 'duel-gagne', mode: 'libre' }));
    assert.equal(palier.xp, XP.duelLibre, 'le geste dit ce qu’il a versé');
    assert.equal(palier.niveaux, 1, 'et qu’un palier a sonné');
    assert.equal(palier.gain, 8, 'le duel libre paie ses crédits, comme avant');

    const attendu2 = progressionDeXp(attendu4.xp + XP.duelLibre);
    assert.equal(attendu2.niveau, 2, 'le niveau 2 tombe dans le premier duel libre gagné');
    assert.equal(nombre('[data-profil-niveau]', 'profilNiveau'), 2, 'l’écran le dit');
    assert.equal(nombre('[data-profil-xp]', 'profilXp'), attendu2.into, 'et le surplus repart dans la barre suivante');
    assert.equal(bourse.bourse.cartes.length, cartesAvant + 5, 'les cinq cartes du paquet sont rangées');
    // Le paquet offert suit les règles du comptoir : un doublon se rembourse,
    // une carte nouvelle ne coûte rien — les deux se lisent dans la cérémonie.
    assert.ok(bourse.monteeNiveau.ouverture.nouvelles <= 5, 'cinq cartes au plus');
    assert.equal(
      bourse.monteeNiveau.ouverture.remboursement > 0,
      bourse.monteeNiveau.ouverture.nouvelles < 5,
      'un doublon se rembourse, une carte nouvelle non',
    );
    assert.equal(bourse.monteeNiveau?.ouverture?.prix, 0, 'la cérémonie annonce un paquet offert');
    // Le seul crédit qui bouge ici est celui du duel (et les doublons rendus par
    // le tirage, comme au comptoir) : le paquet offert, lui, ne coûte rien.
    assert.equal(
      bourse.bourse.credits,
      soldeAvant + palier.gain + bourse.monteeNiveau.ouverture.remboursement,
      'le paquet offert ne coûte pas un crédit — seuls le duel et ses doublons en rendent',
    );
    assert.equal(bourse.boostersEnAttente, 0, 'la dette est réglée tout de suite');

    const ceremonie = noeud('[data-souk-ceremonie]');
    assert.ok(ceremonie, 'la cérémonie du paquet offert s’ouvre');
    assert.equal(donnee('[data-souk-ceremonie]', 'soukCeremonieOffert'), 'true', 'et elle se dit offerte');
    assert.equal(nombre('[data-souk-ceremonie]', 'soukCeremonieNiveau'), 2, 'elle nomme le niveau atteint');
    assert.equal(ceremonie.querySelectorAll('[data-souk-carte-dos]').length, 5, 'cinq cartes face cachée');
    assert.match(texte(ceremonie), /[Nn]iveau 2/, 'le joueur lit pourquoi il reçoit ce paquet');
    assert.ok(sons.includes('collection-rafraichie'), 'l’atelier de decks est prévenu');
    assert.equal(noeud('[data-profil-attente]'), null, 'rien n’attend derrière : le paquet est ouvert');

    // ── Un palier tombe pendant la cérémonie : la dette attend, elle ne se perd pas
    const palier2 = await act(async () => bourse.noterEvenementDuel({
      type: 'duel-gagne',
      mode: 'histoire',
      etageId: DERNIER_ETAGE,
      tourId: TOUR.id,
      premiere: true,
      tourComplete: true,
    }));
    assert.equal(palier2.gain, GAINS.etagePremiere + GAINS.tourTerminee,
      'la victoire paie son étage, et le butin de la tour par-dessus');
    assert.equal(palier2.butin, GAINS.tourTerminee, 'le butin est isolé pour l’écran');
    assert.equal(palier2.xp, XP.etagePremiere + XP.tourTerminee, 'et la barre suit le butin versé');
    assert.equal(palier2.niveaux, 1, 'un nouveau palier sonne');
    assert.equal(bourse.boostersEnAttente, 1, 'mais la cérémonie occupe l’écran : le paquet attend');
    assert.equal(nombre('[data-profil-attente]', 'profilAttente'), 1, 'et l’écran le dit');
    assert.match(texte(noeud('[data-profil-attente]')), /Un paquet vous attend/,
      'le bandeau promet le paquet en une ligne, sans l’ouvrir de force');
    await act(async () => noeud('[data-profil-attente-aller]').click());
    assert.ok(sons.includes('vers-le-souk') && sons.includes('menu'),
      'et ce bouton mène au Souk, avec le son du menu');
    assert.equal(donnee('[data-souk-ceremonie]', 'soukCeremonieNiveau'), '2',
      'la première cérémonie reste seule à l’écran');

    // ── Fermer la cérémonie règle la dette dans la foulée ───────────────────
    await act(async () => noeud('[data-souk-ceremonie-passer]').click());
    assert.equal(noeud('[data-souk-ceremonie-ranger]').disabled, false, 'une fois retournées, on peut ranger');
    const cartesAvant2 = bourse.bourse.cartes.length;
    await act(async () => noeud('[data-souk-ceremonie-ranger]').click());
    assert.ok(noeud('[data-souk-ceremonie]'), 'le second paquet dû s’ouvre aussitôt');
    assert.equal(nombre('[data-souk-ceremonie]', 'soukCeremonieNiveau'), progressionDeXp(bourse.profil.xp).niveau,
      'et il annonce le niveau qu’il fête');
    const rangees = bourse.bourse.cartes.length - cartesAvant2;
    assert.ok(rangees > 0 && rangees <= 5, `le second paquet range ses cartes (${rangees})`);
    assert.equal(bourse.monteeNiveau.ouverture.prix, 0, 'le second paquet est offert lui aussi');
    assert.equal(bourse.boostersEnAttente, 0, 'la dette est soldée');
    // Deux cérémonies de suite : la seconde repart du sachet, cartes face
    // cachée. Sans `key` sur la cérémonie, React garderait l’état de la
    // première et le joueur verrait un paquet déjà retourné.
    const passer2 = noeud('[data-souk-ceremonie-passer]');
    assert.ok(passer2, 'la seconde cérémonie reprend son déroulé, elle n’arrive pas terminée');
    assert.equal(noeud('[data-souk-ceremonie]').querySelectorAll('[data-souk-carte-dos]').length, 5,
      'et ses cinq cartes repartent face cachée');
    await act(async () => passer2.click());
    await act(async () => noeud('[data-souk-ceremonie-ranger]').click());
    assert.equal(noeud('[data-souk-ceremonie]'), null, 'plus rien à l’écran');
    assert.equal(bourse.monteeNiveau, null, 'et le hook a oublié la montée');
    assert.ok(bourse.bourse.credits >= soldeAvant, 'deux paliers offerts n’ont rien débité');
    assert.equal(noeud('[data-profil-attente]'), null, 'plus de bandeau : tout est offert');
    assert.ok(bourse.profil.paliers.length >= 2,
      'le profil a gardé les paliers franchis — la carte, elle, ne les affiche plus');
    assert.ok(bourse.profil.boostersOfferts >= 2, 'et les paquets offerts sont comptés');

    // ── Le nom et l'emblème s'écrivent, et se relisent ──────────────────────
    const saisie = noeud('[data-profil-pseudo-saisie]');
    assert.ok(noeud('[data-profil-pseudo-enregistrer]').disabled, 'rien à enregistrer tant qu’on n’a rien tapé');
    await act(async () => {
      setterValeur.call(saisie, '');
      saisie.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    assert.ok(noeud('[data-profil-pseudo-enregistrer]').disabled, 'un champ vide ne s’enregistre pas');
    assert.ok(noeud('[data-profil-pseudo-vide]'), 'et l’écran explique qu’un nom vide n’efface rien');
    await act(async () => {
      setterValeur.call(saisie, '  Salem l’arpenteur  ');
      saisie.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    assert.equal(noeud('[data-profil-pseudo-enregistrer]').disabled, false, 'un nom saisi s’enregistre');
    await act(async () => noeud('[data-profil-pseudo-enregistrer]').click());
    assert.equal(donnee('[data-profil-pseudo]', 'profilPseudo'), 'Salem l’arpenteur',
      'le pseudo est écrit, espaces compris');
    assert.equal(bourse.profil.pseudo, 'Salem l’arpenteur');
    assert.ok(sons.includes('select'), 'enregistrer sonne');

    const embleme = EMBLEMES[3];
    await act(async () => noeud(`[data-profil-embleme="${embleme.id}"]`).click());
    assert.equal(bourse.profil.embleme, embleme.id, 'l’emblème choisi est retenu');
    assert.equal(texte(noeud('.rpg-profil__medaillon')), embleme.glyphe, 'et le médaillon le porte');
    assert.ok(noeud(`[data-profil-embleme="${embleme.id}"]`).classList.contains('is-choisi'),
      'le bouton choisi se marque');
    assert.equal(
      [...document.querySelectorAll('[data-profil-embleme]')].filter((bouton) => bouton.classList.contains('is-choisi')).length,
      1, 'un seul emblème est choisi à la fois',
    );
    const avantInconnu = bourse.profil;
    assert.equal(bourse.choisirUnEmbleme('introuvable'), false, 'un emblème inconnu ne change rien');
    assert.equal(bourse.profil, avantInconnu, 'et ne réécrit pas le profil');

    // ── L'appareil garde le profil ──────────────────────────────────────────
    const ecrit = JSON.parse(window.localStorage.getItem(RPG_PROFIL_STORAGE_KEY) ?? 'null');
    assert.ok(ecrit, 'le profil est écrit sur l’appareil');
    assert.equal(ecrit.xp, bourse.profil.xp, 'l’XP écrite est celle de l’écran');
    assert.equal(ecrit.pseudo, 'Salem l’arpenteur');
    assert.equal(ecrit.embleme, embleme.id);
    assert.equal(ecrit.boostersOfferts, bourse.profil.boostersOfferts, 'et les paquets offerts aussi');

    const xpAvantRemontage = bourse.profil.xp;
    const niveauAvantRemontage = nombre('[data-profil-niveau]', 'profilNiveau');
    await act(async () => root.unmount());
    await wait(20);
    const sons2 = [];
    let bourse2 = null;
    // Une racine démontée ne se remonte pas : c'est un second montage, comme un
    // retour sur l'onglet après avoir fermé la page.
    racine2 = createRoot(conteneur);
    await act(async () => racine2.render(<Sonde surPret={(valeur) => { bourse2 = valeur; }} sons={sons2} />));
    assert.equal(bourse2.profil.xp, xpAvantRemontage, 'un nouveau montage relit l’XP de l’appareil');
    assert.equal(nombre('[data-profil-niveau]', 'profilNiveau'), niveauAvantRemontage, 'et le niveau qui va avec');
    assert.equal(donnee('[data-profil-pseudo]', 'profilPseudo'), 'Salem l’arpenteur', 'le nom survit');
    assert.equal(texte(noeud('.rpg-profil__medaillon')), embleme.glyphe, 'l’emblème aussi');
    assert.equal(bourse2.boostersEnAttente, 0, 'aucune dette ne renaît au remontage');
    assert.equal(noeud('[data-souk-ceremonie]'), null, 'et aucune cérémonie ne se rouvre toute seule');

    // ── Le retour rend la main ──────────────────────────────────────────────
    await act(async () => noeud('[data-profil-retour]').click());
    assert.ok(sons2.includes('sortie'), 'le bouton Menu sort de l’écran');
    await act(async () => noeud('[data-profil-attente-aller]')?.click?.());
  } finally {
    for (const racine of [racine2, root]) {
      try { if (racine) await act(async () => racine.unmount()); } catch { /* déjà démontée */ }
    }
    conteneur.remove();
  }

  // ── L'onglet du menu, dans la vraie page ──────────────────────────────────
  // La page entière est montée : c'est elle qui décide où vit l'onglet Profil,
  // et un smoke qui ne monterait que l'écran ne verrait pas un branchement cassé.
  window.localStorage.clear();
  window.localStorage.setItem(RPG_GRAINE_STORAGE_KEY, 'graine-du-smoke-profil');
  const conteneurPage = document.createElement('div');
  document.body.appendChild(conteneurPage);
  const rootPage = createRoot(conteneurPage);
  try {
    await act(async () => rootPage.render(<RpgDuelPage rng={rngSeme(20261023)} />));
    for (let fois = 0; fois < 3; fois += 1) {
      await act(async () => { });
      await wait(30);
    }
    const onglet = noeud('[data-profil-onglet]');
    assert.ok(onglet, 'l’onglet Profil est dans le menu du Sablier');
    assert.equal(onglet.tagName, 'BUTTON', 'et c’est un bouton');
    assert.equal(nombre('[data-profil-onglet]', 'profilOnglet'), 1, 'il affiche le niveau du joueur');
    assert.match(texte(onglet), /NIV\. 1/, 'et l’écrit en toutes lettres sur l’onglet');
    assert.match(texte(onglet), /Profil/, 'avec son libellé');
    assert.ok(onglet.querySelector('.rpg-mode-menu__profil-embleme'), 'et l’emblème du joueur');
    assert.equal(nombre('[data-profil-xp-onglet]', 'profilXpOnglet'), 0, 'et sa barre d’XP');
    assert.match(onglet.getAttribute('aria-label') ?? '', /Profil/, 'il se nomme pour qui ne le voit pas');
    assert.equal(noeud('[data-profil-pastille]'), null, 'sans palier dû, pas de pastille');
    assert.equal(noeud('[data-profil]'), null, 'l’écran n’est pas encore là');

    await act(async () => onglet.click());
    assert.ok(noeud('[data-profil]'), 'cliquer l’onglet ouvre l’écran du profil');
    assert.equal(noeud('[data-profil-onglet]').getAttribute('aria-current'), 'page',
      'et l’onglet se marque comme la page courante');
    assert.ok(noeud('[data-profil-retour]'), 'l’écran a son bouton Menu');

    await act(async () => noeud('[data-profil-retour]').click());
    assert.equal(noeud('[data-profil]'), null, 'le bouton Menu rend le menu');
    assert.ok(noeud('[data-profil-onglet]'), 'et l’onglet est toujours là');
  } finally {
    try { await act(async () => rootPage.unmount()); } catch { /* déjà démonté */ }
    conteneurPage.remove();
  }
}
