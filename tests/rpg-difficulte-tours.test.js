/**
 * La pression des Tours (`rpgDifficulteTours.js`) — ce qui rend les gardiens
 * durs à battre depuis que leurs paquets sont les listes thématiques communes.
 *
 * Trois familles d'assertions :
 *
 *  1. **La rampe** — la puissance d'un étage se traduit en pacte (PV, cartes,
 *     bouclier) et en plancher d'IA, sans jamais dépasser les bornes du moteur,
 *     sans jamais redescendre, et sans jamais retirer un atout déclaré.
 *  2. **Les tours** — chaque étage des onze tours arrive à la table avec son
 *     pacte et son cerveau : les sommets se jouent au moins au niveau Veilleur,
 *     la Tour du Sablier au niveau Sablier, la Tour Oubliée à l'Oublié.
 *  3. **Le duel** — les atouts calculés arrivent bien dans l'état du duel
 *     (PV, bouclier, main de départ), et le PvP les ignore.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RPG_PRESSION_CAPS,
  RPG_PRESSION_ORDRE_IA,
  RPG_PRESSION_PALIERS_IA,
  appliquerPressionEtage,
  appliquerPressionTour,
  atoutsPression,
  fusionnerAtouts,
  libellePacte,
  niveauLePlusFort,
  niveauPressionIA,
  pressionEtage,
} from '../src/games/rpgDifficulteTours.js';
import {
  RPG_ATOUTS_MAX,
  rpgAtoutsSorcier,
  rpgNouveauDuel,
  rpgSorcierPv,
} from '../src/games/rpgDuel.js';
import { RPG_NIVEAUX_IA, rpgProfilIA } from '../src/games/rpgAI.js';
import {
  RPG_STORY_TOURS,
  deckHistoire,
  tourHistoireParId,
  tousLesEtages,
} from '../src/games/rpgStoryTours.js';
import { RPG_DECKS_THEMATIQUES } from '../src/games/rpgDecksThematiques.js';

// ── 1. La rampe ─────────────────────────────────────────────────────────────

test('les bornes de la pression sont celles du moteur, et l’ordre d’IA celui du jeu', () => {
  assert.deepEqual({ ...RPG_PRESSION_CAPS }, { ...RPG_ATOUTS_MAX },
    'la pression ne peut pas promettre un pacte que `rpgAtoutsSorcier` rognerait');
  assert.deepEqual([...RPG_PRESSION_ORDRE_IA], [...RPG_NIVEAUX_IA],
    'l’échelle des planchers suit l’échelle des niveaux d’IA');
  for (const palier of RPG_PRESSION_PALIERS_IA) {
    assert.ok(RPG_NIVEAUX_IA.includes(palier.niveau), `${palier.niveau} est un niveau connu`);
  }
});

test('un étage de puissance 0 reste une initiation : aucun pacte, l’IA la plus douce', () => {
  assert.deepEqual(pressionEtage(0), { niveau: 'recit', atouts: { pv: 0, main: 0, bouclier: 0 } });
  assert.equal(libellePacte(atoutsPression(0)), '', 'aucun pacte à afficher');
  assert.equal(niveauPressionIA(undefined), 'recit');
  assert.deepEqual(atoutsPression(-3), atoutsPression(0), 'une puissance illisible vaut zéro');
});

test('la pression monte sans trou : PV, cartes, bouclier et niveau d’IA', () => {
  let precedent = atoutsPression(0);
  let niveauPrecedent = 0;
  for (let puissance = 1; puissance <= 40; puissance += 1) {
    const atouts = atoutsPression(puissance);
    assert.ok(atouts.pv >= precedent.pv, `PV non décroissants à ${puissance}`);
    assert.ok(atouts.main >= precedent.main, `cartes non décroissantes à ${puissance}`);
    assert.ok(atouts.bouclier >= precedent.bouclier, `bouclier non décroissant à ${puissance}`);
    for (const cle of ['pv', 'main', 'bouclier']) {
      assert.ok(atouts[cle] <= RPG_PRESSION_CAPS[cle], `${cle} borné à ${puissance}`);
    }
    const rang = RPG_PRESSION_ORDRE_IA.indexOf(niveauPressionIA(puissance));
    assert.ok(rang >= niveauPrecedent, `niveau non décroissant à ${puissance}`);
    niveauPrecedent = rang;
    precedent = atouts;
  }
  // Les paliers d'IA annoncés.
  assert.equal(niveauPressionIA(1), 'normale');
  assert.equal(niveauPressionIA(4), 'normale');
  assert.equal(niveauPressionIA(5), 'veilleur');
  assert.equal(niveauPressionIA(7), 'veilleur');
  assert.equal(niveauPressionIA(8), 'sablier');
  assert.equal(niveauPressionIA(14), 'sablier');
  // Les sommets du jeu tiennent les quatre leviers.
  const sommet = atoutsPression(16);
  assert.equal(sommet.pv, RPG_PRESSION_CAPS.pv);
  assert.ok(sommet.main >= 1 && sommet.bouclier >= 5, 'le sommet ouvre large et protégé');
});

test('la pression ne descend jamais un étage et ne retire jamais un atout déclaré', () => {
  assert.equal(niveauLePlusFort('oubliee', 'normale'), 'oubliee', 'un niveau déclaré plus fort est gardé');
  assert.equal(niveauLePlusFort('recit', 'veilleur'), 'veilleur', 'le plancher relève un niveau trop tendre');
  assert.equal(niveauLePlusFort(undefined, 'sablier'), 'sablier');
  assert.equal(niveauLePlusFort('inconnu', 'normale'), 'normale', 'un niveau inconnu ne bloque pas le plancher');

  const etage = {
    id: 'essai', puissance: 2, ia: { niveau: 'oubliee', style: 'controle' },
    atouts: { pv: 18, bouclier: 9, mana: 1 },
  };
  const avant = JSON.stringify(etage);
  const presse = appliquerPressionEtage(etage);
  assert.equal(JSON.stringify(etage), avant, 'les données d’origine ne sont pas mutées');
  assert.equal(presse.ia.niveau, 'oubliee', 'l’étage garde son cerveau');
  assert.equal(presse.ia.style, 'controle', 'le style est conservé');
  assert.ok(presse.atouts.pv >= 18 && presse.atouts.bouclier >= 9, 'aucun atout déclaré n’est rogné');
  assert.equal(presse.atouts.mana, 1, 'le vestige `mana` des fiches anciennes survit');
  assert.deepEqual(fusionnerAtouts(null, atoutsPression(0)), null, 'un pacte nul ne crée pas de champ');
});

// ── 2. Les tours ────────────────────────────────────────────────────────────

test('chaque tour applique sa pression à tous ses étages, sans toucher aux paquets', () => {
  // Les listes effectivement jouées sont les listes thématiques communes : la
  // pression ajoute un pacte, jamais une carte ni une couleur.
  const listes = RPG_DECKS_THEMATIQUES.map((theme) => theme.cardIds);
  for (const tour of RPG_STORY_TOURS) {
    const pressee = appliquerPressionTour(tour);
    assert.equal(pressee.etages.length, tour.etages.length);
    for (const etage of pressee.etages) {
      const paquet = deckHistoire(etage.deck);
      assert.ok(paquet, `${etage.id} : paquet connu`);
      assert.equal(paquet.length, 30, `${etage.id} : trente cartes`);
      assert.ok(listes.some((liste) => liste.length === paquet.length
        && liste.every((id, index) => id === paquet[index])), `${etage.id} : la liste thématique, inchangée`);
    }
  }
});

test('les onze tours arrivent à la table avec un pacte et un cerveau à la hauteur de leur puissance', () => {
  const tours = RPG_STORY_TOURS;
  assert.ok(tours.length >= 11, 'les onze tours sont là');
  for (const { tour, etage } of tousLesEtages()) {
    const pacte = rpgAtoutsSorcier(etage.atouts);
    if (etage.puissance > 0) {
      assert.ok(pacte.pv > 0, `${etage.id} : la puissance donne des PV de départ`);
    } else {
      assert.equal(etage.id, 'listes-1', 'seule la toute première marche reste nue');
      assert.equal(pacte.pv, 0);
    }
    const rang = RPG_PRESSION_ORDRE_IA.indexOf(etage.ia.niveau);
    const rangPlancher = RPG_PRESSION_ORDRE_IA.indexOf(niveauPressionIA(etage.puissance));
    assert.ok(rang >= rangPlancher, `${etage.id} : ${etage.ia.niveau} joue au moins au niveau du plancher`);
    if (etage.id !== 'listes-1') {
      assert.ok(rang >= RPG_PRESSION_ORDRE_IA.indexOf('normale'),
        `${etage.id} : plus d’initiation après la première marche`);
    }
    if (etage.puissance > 0) {
      assert.match(libellePacte(etage.atouts), /^Pacte : \+/, `${etage.id} : le pacte se lit sur la fiche`);
    } else {
      assert.equal(libellePacte(etage.atouts), '', `${etage.id} : aucune ligne de pacte`);
    }
  }

  // Les sommets : Veilleur au minimum, Sablier pour la tour terminale, et
  // l'Oublié pour le Roi sans nom.
  for (const tour of tours) {
    const sommet = tour.etages.at(-1);
    if (tour.id === 'tour-oubliee') {
      assert.equal(sommet.ia.niveau, 'oubliee', 'Le Roi sans nom joue au niveau secret');
    } else if (tour.id === 'tour-du-sablier-renverse') {
      for (const etage of tour.etages) assert.equal(etage.ia.niveau, 'sablier', `${etage.id} : maître absolu`);
    } else {
      const rang = RPG_PRESSION_ORDRE_IA.indexOf(sommet.ia.niveau);
      assert.ok(rang >= RPG_PRESSION_ORDRE_IA.indexOf('veilleur'), `${sommet.id} : le sommet se mérite`);
    }
  }

  // La Tour du Sablier renversé est bien la plus dure du jeu.
  const sablier = tourHistoireParId('tour-du-sablier-renverse');
  const pvSablier = rpgAtoutsSorcier(sablier.etages.at(-1).atouts).pv;
  const pvAutres = tours
    .filter((tour) => tour.id !== 'tour-du-sablier-renverse' && tour.id !== 'tour-oubliee')
    .map((tour) => rpgAtoutsSorcier(tour.etages.at(-1).atouts).pv);
  assert.ok(pvSablier > Math.max(...pvAutres), 'le Sablier donne plus de PV que les neuf tours du récit');
});

test('le pacte d’un étage croît avec lui dans chaque tour', () => {
  for (const tour of RPG_STORY_TOURS) {
    let precedent = 0;
    for (const etage of tour.etages) {
      const pv = rpgAtoutsSorcier(etage.atouts).pv;
      assert.ok(pv >= precedent, `${etage.id} : le pacte ne recule pas (${pv} < ${precedent})`);
      precedent = pv;
    }
  }
});

test('la fiche d’étage annonce le pacte en clair, PV et bouclier compris', () => {
  const sommet = tourHistoireParId('tour-oubliee').etages.at(-1);
  assert.equal(libellePacte(sommet.atouts), 'Pacte : +20 PV · +2 cartes · bouclier 10');
  assert.equal(libellePacte({ pv: 2 }), 'Pacte : +2 PV');
  assert.equal(libellePacte(null), '');
  assert.equal(libellePacte({}), '');
});

// ── 3. Le duel ──────────────────────────────────────────────────────────────

test('les atouts d’un étage arrivent dans l’état du duel : PV, bouclier, main de départ', () => {
  const etage = tourHistoireParId('tour-du-sablier-renverse').etages.at(-1);
  const duel = rpgNouveauDuel({
    joueurDeck: deckHistoire('veilleurs-absolus'),
    sorcierDeck: deckHistoire(etage.deck),
    sorcierPuissance: etage.puissance,
    sorcierIA: etage.ia,
    sorcierAtouts: etage.atouts,
    rng: () => 0.5,
  });
  const pacte = rpgAtoutsSorcier(etage.atouts);
  assert.equal(duel.sorcier.pv, rpgSorcierPv(etage.puissance) + pacte.pv, 'les PV du pacte sont posés');
  assert.equal(duel.sorcier.pvMax, duel.sorcier.pv);
  assert.equal(duel.sorcier.bouclier, pacte.bouclier, 'le bouclier du pacte est posé');
  assert.equal(duel.sorcier.main.length, 5 + pacte.main, 'les cartes du pacte sont en main');
  assert.deepEqual(duel.sorcier.atouts, pacte);
  assert.equal(duel.joueur.pv, rpgSorcierPv(0), 'le joueur garde ses 25 PV');
  assert.equal(duel.joueur.main.length, 5, 'le joueur garde sa main de départ');
  assert.ok(rpgProfilIA(duel.sorcier.ia).profondeur >= 4, 'le gardien du sommet anticipe quatre coups');

  // Et la pression ne double pas les atouts si on la repasse deux fois.
  const deuxFois = appliquerPressionEtage(appliquerPressionEtage(etage));
  assert.deepEqual(deuxFois.atouts, etage.atouts, 'appliquer la pression deux fois ne change rien');
});

test('le PvP ignore la pression des tours', () => {
  const etage = tourHistoireParId('tour-du-sablier-renverse').etages.at(-1);
  const deck = deckHistoire(etage.deck);
  const duel = rpgNouveauDuel({
    joueurDeck: deck, sorcierDeck: deck, sorcierAtouts: etage.atouts, pvp: true, rng: () => 0.5,
  });
  assert.equal(duel.sorcier.pv, rpgSorcierPv(0), 'un duel en ligne n’offre aucun pacte');
  assert.equal(duel.sorcier.bouclier, 0);
  assert.equal(duel.sorcier.atouts, undefined);
});
