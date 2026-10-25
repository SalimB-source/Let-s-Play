import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import jpeg from 'jpeg-js';

import {
  RPG_DUEL_CARDS,
  cardArtId,
  cardById,
  cardCopyLimit,
  cardColors,
  carteEstOubliee,
  carteJouableSansTerrain,
  convertirDeckSansTerrain,
  duelCardById,
  jetonById,
  magieById,
  rpgValiderDeck,
  armeById,
} from '../src/games/rpgCards.js';
import {
  RPG_TOUR_OUBLIEE,
  RPG_TOUR_OUBLIEE_ARMES,
  RPG_TOUR_OUBLIEE_CARTES,
  RPG_TOUR_OUBLIEE_CREATURES,
  RPG_TOUR_OUBLIEE_DECKS,
  RPG_TOUR_OUBLIEE_JETONS,
  RPG_TOUR_OUBLIEE_MAGIES,
  RPG_TOUR_OUBLIEE_SET_ID,
  carteOublieeParId,
  estCarteOubliee,
} from '../src/games/rpgTourOubliee.js';
import {
  RPG_STORY_DECKS,
  RPG_STORY_TOURS,
  deckHistoire,
  etageHistoireParId,
  tourHistoireParId,
  tousLesEtages,
} from '../src/games/rpgStoryTours.js';
import { COLLECTION_DEPART, RPG_REVELATIONS_PAR_ETAGE, cartesReveleesParEtage } from '../src/games/rpgCollection.js';
import {
  etageEstDebloque,
  marquerEtageVaincu,
  progressionHistoireVide,
  tourEstDebloquee,
} from '../src/games/rpgStory.js';
import {
  GAINS,
  butinDeTour,
  creditsDeVictoire,
  gainsDeTour,
  normaliserPortefeuille,
  portefeuilleVide,
  reclamerButinTour,
  recompenseEtage,
} from '../src/games/rpgCredits.js';
import { creditsDeLEvenement, normaliserEvenementDuel } from '../src/games/rpgEvenementsDuel.js';
import {
  RPG_ATOUTS_MAX,
  rpgAtoutsActifs,
  rpgAtoutsSorcier,
  rpgNouveauDuel,
  rpgSorcierPv,
} from '../src/games/rpgDuel.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import { RPG_NIVEAUX_IA, rpgProfilIA } from '../src/games/rpgAI.js';
import { RPG_AMBIENT_BPM } from '../src/games/rpgAmbientMusic.js';
import {
  plateauDeDeck,
  plateauParId,
  resoudrePlateauxDuDuel,
  varianteFantaisisteDe,
} from '../src/games/rpgPlateaux.js';
import { RPG_PLATEAUX } from '../src/games/rpgPlateaux.js';

const CHEMIN = (relatif) => fileURLToPath(new URL(`../public/${relatif}`, import.meta.url));

/** La vie de départ du jeu, sans pacte : tout le monde part à 25 PV. */
const RPG_PV_AVANT = 25;

/** La vie de départ du jeu, sans pacte : tout le monde part à 25 PV. */

// ── 1. Le set : un vrai set, mais hors catalogue ────────────────────────────

test('le Bestiaire oublié compte dix-huit cartes jouables et un jeton, toutes en Ténèbres', () => {
  assert.equal(RPG_TOUR_OUBLIEE_CARTES.length, 24);
  // Dix-sept créatures et le héros — `RPG_TOUR_OUBLIEE_CREATURES` porte les deux.
  assert.equal(RPG_TOUR_OUBLIEE_CREATURES.length, 18);
  assert.equal(RPG_TOUR_OUBLIEE_CREATURES.filter((carte) => carte.kind === 'hero').length, 1);
  assert.equal(RPG_TOUR_OUBLIEE_MAGIES.length, 5);
  assert.equal(RPG_TOUR_OUBLIEE_ARMES.length, 1);
  assert.equal(RPG_TOUR_OUBLIEE_JETONS.length, 1);
  const ids = new Set();
  for (const carte of [...RPG_TOUR_OUBLIEE_CARTES, ...RPG_TOUR_OUBLIEE_JETONS]) {
    assert.ok(carte.id && carte.name, 'chaque carte a un identifiant et un nom');
    assert.equal(ids.has(carte.id), false, `doublon d’identifiant : ${carte.id}`);
    ids.add(carte.id);
    assert.equal(carte.element, 'tenebres', `${carte.id} est une carte Ténèbres`);
    assert.equal(carte.set, RPG_TOUR_OUBLIEE_SET_ID, `${carte.id} : set de la tour`);
    assert.ok(Object.hasOwn(carte, 'rarity'), `${carte.id} : rareté absente`);
    if (carte.jeton) continue;
    assert.ok(Number.isFinite(carte.cost) && carte.cost >= 0, `${carte.id} : coût`);
    if (['creature', 'hero'].includes(carte.kind ?? 'creature')) {
      assert.ok(carte.atk >= 0 && carte.def >= 1, `${carte.id} : attaque et défense`);
    }
  }
});

test('chaque carte du set a sa peinture plein art livrée dans public/cards/', () => {
  for (const carte of [...RPG_TOUR_OUBLIEE_CARTES, ...RPG_TOUR_OUBLIEE_JETONS]) {
    assert.ok(existsSync(CHEMIN(`cards/${cardArtId(carte)}.jpg`)),
      `${carte.id} : la peinture ${cardArtId(carte)}.jpg est livrée`);
  }
});

/**
 * Les peintures du set sont **plein cadre** : l'image occupe toute la carte et
 * le cadre est dessiné par le CSS du jeu (`.rpg-card`, `.rpg-hand__card`). Une
 * peinture qui arrive avec sa propre bordure — blanche comme noire, c'est le
 * travers classique des générateurs d'images — laisse un liseré tout autour de
 * la vignette. On mesure donc les quatre bords :
 *
 *  - la part de pixels clairs sur les quatre côtés (bordure blanche) ;
 *  - la platitude du pourtour (écart-type de la luminance) comparée à un
 *    anneau situé 34 px plus loin : un pourtour parfaitement uni qui tranche
 *    avec l'intérieur est une bande de cadre, quelle que soit sa couleur.
 */
function bordureDeLaPeinture(chemin) {
  const { data, width, height } = jpeg.decode(readFileSync(chemin), { useTArray: true });
  const luminance = (x, y) => {
    const i = (y * width + x) * 4;
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  };
  const clair = (x, y) => {
    const i = (y * width + x) * 4;
    return data[i] > 205 && data[i + 1] > 200 && data[i + 2] > 190;
  };
  const anneau = (marge) => {
    const points = [];
    for (let x = 0; x < width; x += 2) points.push([x, marge], [x, height - 1 - marge]);
    for (let y = 0; y < height; y += 2) points.push([marge, y], [width - 1 - marge, y]);
    return points;
  };
  const statistiques = (points) => {
    const valeurs = points.map(([x, y]) => luminance(x, y));
    const moyenne = valeurs.reduce((a, b) => a + b, 0) / valeurs.length;
    const ecart = Math.sqrt(valeurs.reduce((a, b) => a + (b - moyenne) ** 2, 0) / valeurs.length);
    return { moyenne, ecart };
  };
  const partClaire = (bord) => {
    let clairs = 0;
    let total = 0;
    if (bord === 'gauche' || bord === 'droite') {
      for (let y = 0; y < height; y += 3) {
        for (let d = 0; d < 4; d += 1) {
          total += 1;
          if (clair(bord === 'gauche' ? d : width - 1 - d, y)) clairs += 1;
        }
      }
    } else {
      for (let x = 0; x < width; x += 3) {
        for (let d = 0; d < 4; d += 1) {
          total += 1;
          if (clair(x, bord === 'haut' ? d : height - 1 - d)) clairs += 1;
        }
      }
    }
    return clairs / total;
  };
  return {
    clair: ['gauche', 'haut', 'droite', 'bas'].map(partClaire),
    bord: statistiques(anneau(1)),
    interieur: statistiques(anneau(34)),
  };
}

test('les peintures du set sont plein cadre : ni bordure blanche, ni bande noire', () => {
  const peintures = [...RPG_TOUR_OUBLIEE_CARTES, ...RPG_TOUR_OUBLIEE_JETONS]
    .map((carte) => [`cards/${cardArtId(carte)}.jpg`, carte.id])
    .filter(([relatif]) => existsSync(CHEMIN(relatif)))
    .concat([['sablier-tours/tour-oubliee.jpg', 'tour-oubliee']]);
  for (const [relatif, id] of peintures) {
    const mesure = bordureDeLaPeinture(CHEMIN(relatif));
    for (const part of mesure.clair) {
      assert.ok(part < 0.2, `${id} : liseré blanc sur un bord (${Math.round(part * 100)} %)`);
    }
    const plate = mesure.bord.ecart < 4 && Math.abs(mesure.bord.moyenne - mesure.interieur.moyenne) > 22;
    assert.equal(plate, false,
      `${id} : bande de cadre unie sur le pourtour (luminance ${Math.round(mesure.bord.moyenne)} contre ${Math.round(mesure.interieur.moyenne)} à l’intérieur)`);
  }
});

test('les cartes de l’Oubliée sont connues du moteur mais absentes du catalogue', () => {
  const catalogue = new Set(RPG_DUEL_CARDS.map((carte) => carte.id));
  for (const carte of [...RPG_TOUR_OUBLIEE_CARTES, ...RPG_TOUR_OUBLIEE_JETONS]) {
    assert.equal(catalogue.has(carte.id), false, `${carte.id} ne doit pas entrer au catalogue`);
    assert.ok(cardById(carte.id), `${carte.id} reste lisible par cardById`);
    if (carte.kind === 'magie') assert.ok(magieById(carte.id), `${carte.id} : magie connue du moteur`);
    else if (carte.kind === 'arme') assert.ok(armeById(carte.id), `${carte.id} : arme connue du moteur`);
    else if (carte.jeton) assert.ok(jetonById(carte.id), `${carte.id} : jeton connu du moteur`);
    else assert.ok(duelCardById(carte.id), `${carte.id} : créature connue du moteur`);
    assert.equal(carteEstOubliee(carte.id), true);
    assert.equal(estCarteOubliee(carte.id), true);
  }
  assert.equal(carteEstOubliee('salem'), false, 'une carte du catalogue n’est pas oubliée');
  assert.equal(carteOublieeParId('salem'), null);
});

test('aucune carte de l’Oubliée n’est obtenable : ni dotation, ni révélation, ni Souk', () => {
  const depart = new Set(COLLECTION_DEPART);
  const revelees = new Set(Object.values(RPG_REVELATIONS_PAR_ETAGE).flat());
  for (const carte of RPG_TOUR_OUBLIEE_CARTES) {
    assert.equal(depart.has(carte.id), false, `${carte.id} n’est pas dans la dotation`);
    assert.equal(revelees.has(carte.id), false, `${carte.id} ne se révèle à aucun étage`);
  }
  for (const { etage } of tousLesEtages()) {
    for (const id of cartesReveleesParEtage(etage.id)) {
      assert.equal(estCarteOubliee(id), false, `${id} ne doit jamais entrer dans un vivier`);
    }
  }
});

// ── 2. Les paquets et la rampe ──────────────────────────────────────────────

test('les six paquets de la tour sont valides, entièrement composés du set et intacts après conversion', () => {
  assert.equal(Object.keys(RPG_TOUR_OUBLIEE_DECKS).length, 6);
  const setIds = new Set(RPG_TOUR_OUBLIEE_CARTES.map((carte) => carte.id));
  for (const [deckId, liste] of Object.entries(RPG_TOUR_OUBLIEE_DECKS)) {
    assert.equal(deckHistoire(deckId), liste, `${deckId} est enregistré dans RPG_STORY_DECKS`);
    assert.equal(RPG_STORY_DECKS[deckId], liste);
    assert.equal(liste.length, 30, `${deckId} : trente cartes`);
    const validation = rpgValiderDeck(liste);
    assert.equal(validation.ok, true, `${deckId} : ${validation.raison}`);
    for (const id of liste) {
      assert.ok(setIds.has(id), `${deckId} : ${id} sort du set de l’Oubliée`);
      assert.ok(carteJouableSansTerrain(cardById(id)), `${deckId} : ${id} jouable sans terrain`);
      assert.ok(cardColors(id).every((couleur) => couleur === 'tenebres'), `${deckId} : ${id} Ténèbres`);
    }
    const comptes = new Map();
    for (const id of liste) comptes.set(id, (comptes.get(id) ?? 0) + 1);
    for (const [id, nombre] of comptes) {
      assert.ok(nombre <= cardCopyLimit(cardById(id)), `${deckId} : ${id} en ${nombre} exemplaires`);
    }
    // `convertirDeckSansTerrain` ne doit rien retirer ni compléter : le paquet
    // du sorcier arrive au moteur tel qu'il a été écrit.
    assert.deepEqual(convertirDeckSansTerrain(liste), liste, `${deckId} : conversion neutre`);
  }
});

test('la rampe monte sans trou : puissances, IA, pactes et primes croissantes', () => {
  const tour = tourHistoireParId('tour-oubliee');
  assert.ok(tour, 'la tour fait partie des tours de Bab El');
  assert.equal(RPG_STORY_TOURS.at(-1).id, 'tour-oubliee', 'elle se dresse après le Sablier renversé');
  assert.equal(tour.etages.length, 6, 'six étages');
  assert.equal(tour.deblocage.tour, 'tour-du-sablier-renverse', 'elle s’ouvre après le Sablier');

  const puissances = tour.etages.map((etage) => etage.puissance);
  assert.deepEqual(puissances, [4, 5, 7, 9, 12, 16], 'la pente est celle du dossier 23');
  const primes = tour.etages.map((etage) => recompenseEtage(etage.id, { premiere: true }));
  assert.deepEqual(primes, [60, 70, 90, 120, 180, 1500], 'la prime du sommet écrase les autres');
  for (let i = 1; i < primes.length; i += 1) {
    assert.ok(primes[i] > primes[i - 1], `prime croissante à l’étage ${i + 1}`);
    assert.ok(puissances[i] > puissances[i - 1], `puissance croissante à l’étage ${i + 1}`);
  }
  // Le pacte arrive par paliers : rien aux étages 1 et 3, puis les leviers
  // s'ajoutent — et le sommet les tient tous les quatre.
  assert.ok(!tour.etages[0].atouts && !tour.etages[2].atouts, 'les premiers paliers restent nus');
  assert.ok(tour.etages.slice(3).every((etage) => etage.atouts), 'la fin de la tour est pactisée');

  // Les deux premiers étages sont « équilibrés » : aucune mythique, pas de
  // niveau d'IA hors de portée d'un joueur de campagne classique.
  for (const etage of tour.etages.slice(0, 2)) {
    const mythiques = RPG_TOUR_OUBLIEE_DECKS[etage.deck]
      .filter((id) => cardById(id).rarity === 'mythique');
    assert.deepEqual(mythiques, [], `${etage.id} : pas de mythique pour un premier palier`);
    assert.ok(['recit', 'normale'].includes(etage.ia.niveau), `${etage.id} : IA accessible`);
  }
  // L'étage 1 n'aligne que des communes et des inhabituelles ; l'étage 2
  // n'ajoute qu'une rare, comme premier avant-goût.
  const raresDuPremier = RPG_TOUR_OUBLIEE_DECKS[tour.etages[0].deck]
    .filter((id) => cardById(id).rarity === 'rare');
  assert.deepEqual(raresDuPremier, [], 'le premier étage est nu');
  const raresDuDeuxieme = new Set(RPG_TOUR_OUBLIEE_DECKS[tour.etages[1].deck]
    .filter((id) => cardById(id).rarity === 'rare'));
  assert.equal(raresDuDeuxieme.size, 2, 'le deuxième étage ouvre les rares avec parcimonie');
  // Le sommet est quasi imbattable : le meilleur cerveau, les quatre mythiques
  // et le pacte le plus lourd.
  const sommet = tour.etages.at(-1);
  assert.equal(sommet.ia.niveau, 'oubliee', 'L’Oublié joue au niveau secret');
  assert.ok(RPG_NIVEAUX_IA.includes('oubliee'));
  assert.deepEqual(rpgProfilIA(sommet.ia), {
    niveau: 'oubliee', style: 'controle', tauxErreur: 0,
    prescience: true, profondeur: 5, largeur: 6,
  });
  const mythiquesSommet = RPG_TOUR_OUBLIEE_DECKS[sommet.deck]
    .filter((id) => cardById(id).rarity === 'mythique');
  assert.equal(new Set(mythiquesSommet).size, 4, 'les quatre mythiques du set sont alignées');
  assert.ok(sommet.atouts.pv > 0 && sommet.atouts.mana > 0 && sommet.atouts.main > 0 && sommet.atouts.bouclier > 0,
    'le pacte du sommet joue sur les quatre leviers');
});

test('les atouts sont bornés, normalisés et refusés en PvP', () => {
  assert.deepEqual(rpgAtoutsSorcier(null), { pv: 0, mana: 0, main: 0, bouclier: 0 });
  assert.deepEqual(rpgAtoutsSorcier({ pv: 999, mana: 99, main: -4, bouclier: 'x' }), {
    pv: RPG_ATOUTS_MAX.pv, mana: RPG_ATOUTS_MAX.mana, main: 0, bouclier: 0,
  });
  assert.equal(rpgAtoutsActifs(null), false);
  assert.equal(rpgAtoutsActifs({ pv: 1 }), true);
});

test('le pacte du sommet se lit dans l’état du duel : PV, mana, main et bouclier', () => {
  const deck = RPG_TOUR_OUBLIEE_DECKS['le-roi-sans-nom'];
  const atouts = RPG_TOUR_OUBLIEE.etages.at(-1).atouts;
  const duel = rpgNouveauDuel({
    joueurDeck: RPG_TOUR_OUBLIEE_DECKS['horde-des-fosses'],
    sorcierDeck: deck,
    sorcierPuissance: 16,
    sorcierIA: { niveau: 'oubliee', style: 'controle' },
    sorcierAtouts: atouts,
    modeMana: RPG_MODE_MANA_ESSAI,
    rng: () => 0.5,
  });
  assert.equal(duel.sorcier.pv, rpgSorcierPv(16) + atouts.pv);
  assert.equal(duel.sorcier.pvMax, duel.sorcier.pv);
  assert.equal(duel.sorcier.bouclier, atouts.bouclier);
  assert.equal(duel.sorcier.main.length, 3 + atouts.main, 'une carte de départ de plus');
  assert.deepEqual(duel.sorcier.atouts, { pv: 12, mana: 1, main: 1, bouclier: 6 });
  assert.ok(duel.sorcier.manaSources.length >= atouts.mana, 'le mana du pacte est déjà une source');
  assert.ok(duel.log.some((ligne) => /pacte/i.test(ligne)), 'le pacte est annoncé dans le journal');

  // Sans atout — ou en PvP — le duel reste exactement celui d'avant.
  const neutre = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => 0.5 });
  assert.equal(neutre.sorcier.pv, RPG_PV_AVANT, 'aucun PV offert sans pacte');
  assert.equal(neutre.sorcier.atouts, undefined);
  const pvp = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, sorcierAtouts: atouts, pvp: true, rng: () => 0.5 });
  assert.equal(pvp.sorcier.pv, RPG_PV_AVANT, 'le PvP ignore les pactes');
  assert.equal(pvp.sorcier.bouclier, 0);
});


// ── 3. Le verrou et la progression ──────────────────────────────────────────

test('la tour reste verrouillée tant que le Sablier renversé n’est pas terminé', () => {
  const vide = progressionHistoireVide();
  assert.equal(tourEstDebloquee(vide, 'tour-du-sablier-renverse'), true, 'le Sablier est libre');
  assert.equal(tourEstDebloquee(vide, 'tour-oubliee'), false, 'la tour secrète est fermée');
  assert.equal(etageEstDebloque(vide, 'oubliee-1'), false, 'aucun étage n’est jouable');

  const sablier = tourHistoireParId('tour-du-sablier-renverse');
  let progression = vide;
  for (const etage of sablier.etages.slice(0, -1)) progression = marquerEtageVaincu(progression, etage.id);
  assert.equal(tourEstDebloquee(progression, 'tour-oubliee'), false, 'six étages sur sept ne suffisent pas');

  progression = marquerEtageVaincu(progression, sablier.etages.at(-1).id);
  assert.equal(tourEstDebloquee(progression, 'tour-oubliee'), true, 'les sept maîtres vaincus ouvrent la tour');
  assert.equal(etageEstDebloque(progression, 'oubliee-1'), true);
  assert.equal(etageEstDebloque(progression, 'oubliee-2'), false, 'pas de saut d’étage');

  const apresUn = marquerEtageVaincu(progression, 'oubliee-1');
  assert.equal(etageEstDebloque(apresUn, 'oubliee-2'), true);
  assert.equal(etageEstDebloque(apresUn, 'oubliee-3'), false);
});

test('chaque étage de la tour a son paquet, son plateau connu et son ambiance', () => {
  for (const etage of RPG_TOUR_OUBLIEE.etages) {
    assert.ok(etageHistoireParId(etage.id), `${etage.id} est un étage de l’Histoire`);
    assert.ok(RPG_TOUR_OUBLIEE_DECKS[etage.deck], `${etage.id} : paquet connu`);
    const plateau = plateauDeDeck(etage.deck);
    assert.equal(plateau.motif, 'deck', `${etage.deck} a son plateau attitré`);
    assert.ok(RPG_PLATEAUX.some((entry) => entry.id === plateau.plateau.id), `${etage.deck} : plateau livré`);
    // La tour a sa propre table : le Cimetière des noms effacés, la nécropole
    // de plein air dressée autour d'elle. Les six paquets s'y battent, comme
    // les sept du Sablier dans sa chambre de verre.
    assert.equal(plateau.plateau.id, 'cimetiere-des-noms-effaces', `${etage.deck} se bat au cimetière`);
    if (etage.avatar) {
      assert.ok(existsSync(CHEMIN(`cards/${cardArtId(etage.avatar)}.jpg`)),
        `${etage.id} : le portrait ${etage.avatar} est livré`);
      const rang = { commune: 0, inhabituelle: 1, rare: 2, mythique: 3 };
      assert.ok(rang[cardById(etage.avatar).rarity] >= 1, `${etage.id} : le portrait n’est pas une carte de base`);
      assert.equal(cardById(etage.avatar).typeLine.includes('légendaire'), true,
        `${etage.id} : le portrait est une figure légendaire`);
      assert.ok(deckHistoire(etage.deck).includes(etage.avatar), `${etage.id} : son portrait joue dans son paquet`);
    }
  }
  // La rampe des visages suit celle des paquets : deux figures ordinaires en
  // bas, puis trois mythiques d'affilée pour les trois derniers gardiens.
  assert.deepEqual(
    RPG_TOUR_OUBLIEE.etages.filter((etage) => etage.avatar).map((etage) => cardById(etage.avatar).rarity),
    ['inhabituelle', 'rare', 'mythique', 'mythique', 'mythique'],
  );
  assert.equal(RPG_TOUR_OUBLIEE.etages.at(-1).avatar, 'l-oublie');
  assert.ok(RPG_AMBIENT_BPM['tour-oubliee'] >= 55 && RPG_AMBIENT_BPM['tour-oubliee'] <= 110);
  assert.ok(existsSync(CHEMIN('sablier-tours/tour-oubliee.jpg')), 'la miniature de repli est livrée');
});

// ── 4. L'économie ───────────────────────────────────────────────────────────

test('la tour a deux tables : le cimetière des noms effacés, et la Fosse', () => {
  // Le cimetière est la table de la tour ; la Fosse en est le double, ouvert par
  // le tirage fantaisiste comme l'Erg s'ouvre sur le désert de verre.
  const fosse = plateauParId('fosse-de-l-oubliee');
  const cimetiere = plateauParId('cimetiere-des-noms-effaces');
  assert.ok(fosse && cimetiere, 'les deux tables de la tour sont au catalogue');
  assert.notEqual(fosse.fichier, cimetiere.fichier, 'chacune a son propre fond');
  assert.equal(varianteFantaisisteDe('cimetiere-des-noms-effaces').id, 'fosse-de-l-oubliee');
  assert.equal(varianteFantaisisteDe('fosse-de-l-oubliee'), null,
    'la Fosse n’a pas de double au second degré');
  // Le cimetière reste dehors : son résumé parle de tombes, pas de puits.
  assert.match(cimetiere.resume, /tombes|stèles/i, 'le cimetière annonce ses tombes');
  assert.match(cimetiere.resume, /sans inscription|sans texte|effac/i,
    'ses pierres sont nues — aucun nom, aucun caractère');
  // Sans l'option, les deux camps de la tour restent au cimetière ; avec elle,
  // le second tirage peut les faire descendre dans la Fosse.
  const dehors = resoudrePlateauxDuDuel({ deckJoueur: 'horde-des-fosses', deckAdverse: 'le-roi-sans-nom' });
  assert.equal(dehors.joueur.plateau.id, 'cimetiere-des-noms-effaces');
  assert.equal(dehors.decouper, false, 'les deux camps de la tour partagent la même table');
  const dedans = resoudrePlateauxDuDuel({
    deckJoueur: 'horde-des-fosses',
    deckAdverse: 'cour-des-djinns',
    variantesFantaisistes: true,
    rng: () => 0.9,
  });
  assert.equal(dedans.joueur.plateau.id, 'fosse-de-l-oubliee');
  assert.equal(dedans.joueur.variante, true);
});

test('le barème de l’étage remplace le barème global, sans toucher aux autres tours', () => {
  assert.equal(recompenseEtage('oubliee-6', { premiere: true }), 1500);
  assert.equal(recompenseEtage('oubliee-6', { premiere: false }), 80);
  assert.equal(recompenseEtage('oubliee-1', { premiere: true }), 60);
  assert.equal(recompenseEtage('listes-1', { premiere: true }), GAINS.etagePremiere, 'les autres étages gardent GAINS');
  assert.equal(recompenseEtage('etage-inconnu', { premiere: false }), GAINS.etageRejoue);
  assert.equal(butinDeTour('tour-oubliee'), 600);
  assert.equal(butinDeTour('tour-du-souk'), GAINS.tourTerminee);

  assert.equal(creditsDeVictoire({ mode: 'histoire', premiere: true, etageId: 'oubliee-6' }), 1500);
  assert.equal(creditsDeVictoire({ mode: 'histoire', premiere: false, etageId: 'oubliee-6' }), 80);
  const evenement = normaliserEvenementDuel({
    type: 'duel-gagne', mode: 'histoire', etageId: 'oubliee-6', tourId: 'tour-oubliee', premiere: true,
  });
  assert.equal(creditsDeLEvenement(evenement), 1500, 'l’événement porte l’étage jusqu’au barème');
});

test('le butin de la Tour Oubliée ne tombe qu’une fois', () => {
  const vide = normaliserPortefeuille(portefeuilleVide());
  const paiement = reclamerButinTour(vide, 'tour-oubliee');
  assert.equal(paiement.ok, true);
  assert.equal(paiement.gain, 600);
  const encore = reclamerButinTour(paiement.portefeuille, 'tour-oubliee');
  assert.equal(encore.ok, false);
  assert.equal(encore.raison, 'deja-payee');
  assert.equal(encore.portefeuille.credits, paiement.portefeuille.credits, 'aucun second versement');

  const gains = gainsDeTour('tour-oubliee', { etagesVaincus: RPG_TOUR_OUBLIEE.etages.map((e) => e.id) });
  assert.equal(gains.complete, true);
  assert.equal(gains.total, 60 + 70 + 90 + 120 + 180 + 1500 + 600);
  assert.equal(gains.dejaGagne, gains.total - butinDeTour('tour-oubliee'), 'le butin reste à réclamer');
});

// ── 5. Les gardes du catalogue ──────────────────────────────────────────────

test('les cartes de l’Oubliée ne peuvent pas entrer dans un deck de joueur', async () => {
  const { rpgValiderDeckMaison } = await import('../src/games/rpgDeckBuilder.js');
  const deck = [...RPG_TOUR_OUBLIEE_DECKS['le-roi-sans-nom']];
  const validation = rpgValiderDeckMaison(deck, [], null);
  assert.equal(validation.ok, false, 'un deck de joueur est refusé');
  assert.ok(validation.raisons.some((raison) => /hors collection/.test(raison)));
  // Même avec une collection fabriquée, le stock n'existe pas : les cartes ne
  // sont ni au Souk, ni comptées par `nombreExemplaires`.
  const { collectionJoueur, nombreExemplaires } = await import('../src/games/rpgCollection.js');
  const collection = collectionJoueur({});
  assert.equal(collection.some((id) => estCarteOubliee(id)), false);
  assert.equal(nombreExemplaires(collection, 'l-oublie'), 0);
});
