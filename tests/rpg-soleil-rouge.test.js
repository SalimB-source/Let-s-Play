import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { choisirCibleAutoIA } from '../src/games/rpgAI.js';
import { RPG_SOLEIL_ROUGE_CARDS, RPG_SOLEIL_ROUGE_SET_ID } from '../src/games/rpgSoleilRouge.js';
import { RPG_DECKS_ARCHETYPES, cardById, cardColors, cardReceivesResonance, cardArtId, rpgValiderDeck } from '../src/games/rpgCards.js';
import { COLLECTION_DEPART, carteReveleePar } from '../src/games/rpgCollection.js';
import { RPG_STORY_DECKS } from '../src/games/rpgStoryTours.js';
import { pastillesPourCarte } from '../src/games/effetIcons.js';
import { CARD_ART_HAUTEUR, CARD_ART_LARGEUR } from '../src/games/rpgCardArt.js';
import { rpgNouveauDuel, rpgJouerArme, rpgJouerCreature, rpgBlesserCreature, rpgLancerMagie, rpgFinDeTour, rpgAttaquerCreature, rpgAttaquerSorcier, rpgResonanceEnJeu, rpgBonusResonance, rpgAppliquerBannieresAttaque, rpgLancerAttaque, rpgActionsEtat } from '../src/games/rpgDuel.js';

function duelTest(rng = () => 0.5) {
  const duel = rpgNouveauDuel({
    joueurDeck: Array(40).fill('montagne'), sorcierDeck: Array(40).fill('montagne'), rng,
  });
  for (const cote of ['joueur', 'sorcier']) {
    duel[cote].mana = { braise: 100, eau: 100, sable: 100, neige: 100 };
  }
  return duel;
}
function jouer(duel, cote, id, cibleId = null) {
  duel[cote].main.push(id);
  let resultat = rpgJouerCreature(duel, cote, id, cibleId);
  if (!resultat.ok && resultat.raison === 'cible') {
    const adv = cote === 'joueur' ? 'sorcier' : 'joueur';
    const carte = cardById(id);
    if (carte?.arrivee?.type === 'degats' && carte.arrivee.cible === 'creature') {
      const adversaires = duel[adv].creatures;
      const cible = adversaires[adversaires.length - 1] ?? adversaires[0];
      if (cible) resultat = rpgJouerCreature(duel, cote, id, cible.id);
    }
  }
  assert.equal(resultat.ok, true, `${id} ${resultat.raison ?? ''}`.trim());
  if (id === 'seigneur-des-machoires') Object.assign(resultat.entite, { tenaciteDisponible: false, tribut: 0 });
  return resultat.entite;
}
function sort(duel, id, cible) {
  duel.joueur.main.push(id);
  assert.equal(rpgLancerMagie(duel, 'joueur', id, cible).ok, true, id);
}

// Les trois cartes de soutien ajoutées (hatamoto, kenshi, daimyō) forment désormais la charpente du starter.
const SAMOURAIS_AJOUTES = ['hatamoto-des-cendres', 'kenshi-de-la-forge', 'daimyo-du-soleil-rouge'];

test('Soleil rouge : dix-neuf cartes uniques, illustrées en 768 × 960 et collectionnables', () => {
  assert.equal(RPG_SOLEIL_ROUGE_CARDS.length, 19, 'le terrain Braise du Soleil rouge est retiré; Braise et sable complète le set');
  const empreintes = new Set();
  for (const carte of RPG_SOLEIL_ROUGE_CARDS) {
    assert.equal(cardById(carte.id).set, RPG_SOLEIL_ROUGE_SET_ID);
    assert.ok(cardColors(carte.id).includes('braise'), `${carte.id} porte Braise`);
    assert.equal(cardArtId(carte.id), carte.id);
    assert.ok(COLLECTION_DEPART.includes(carte.id) || carteReveleePar(carte.id));
    const jpg = readFileSync(new URL(`../public/cards/${carte.id}.jpg`, import.meta.url));
    empreintes.add(createHash('sha256').update(jpg).digest('hex'));
    let dimensions;
    for (let i = 2; i < jpg.length;) {
      const marqueur = jpg[i + 1];
      if (marqueur >= 0xc0 && marqueur <= 0xc3) {
        dimensions = [jpg.readUInt16BE(i + 7), jpg.readUInt16BE(i + 5)];
        break;
      }
      i += 2 + jpg.readUInt16BE(i + 2);
    }
    assert.deepEqual(dimensions, [CARD_ART_LARGEUR, CARD_ART_HAUTEUR], carte.id);
  }
  assert.equal(empreintes.size, 19, 'une illustration dédiée par carte');
});

test('le deck Soleil rouge est valide et concentre sa signature culturelle', () => {
  const deck = RPG_DECKS_ARCHETYPES.find((d) => d.id === RPG_SOLEIL_ROUGE_SET_ID);
  assert.equal(rpgValiderDeck(deck.cardIds).ok, true);
  assert.equal(deck.cardIds.filter((id) => cardById(id).kind === 'terrain').length, 0);
  const signature = [
    'ashigaru-des-braises', 'braisier-du-souk', 'daimyo-du-soleil-rouge',
    'feux-de-kitsune', 'frappe-iaijutsu', 'hatamoto-des-cendres',
    'kagutsuchi-flamme-originelle', 'kenshi-de-la-forge', 'nuage-de-cendres',
    'onna-musha-des-cendres', 'ronin-du-soleil-rouge', 'samourai-du-torii',
    'tengu-du-mont-ardent', 'trait-de-braise', 'ghul-des-cendres', 'sabre-maudit',
  ];
  assert.deepEqual(
    [...new Set(deck.cardIds.filter((id) => cardById(id).kind !== 'terrain'))].sort(),
    signature.sort(),
  );
  assert.ok(deck.cardIds.every((id) => cardColors(id).every((couleur) => couleur === 'braise')));
});

test('le starter met en avant Harakiri, Résonance samouraï et la Bannière avec le Daimyō et Kagutsuchi mythiques', () => {
  const deck = RPG_DECKS_ARCHETYPES.find((d) => d.id === RPG_SOLEIL_ROUGE_SET_ID);
  const ids = new Set(deck.cardIds);
  for (const id of SAMOURAIS_AJOUTES) assert.equal(ids.has(id), true, `${id} anime le boîtier`);
  for (const id of ['samourai-du-torii', 'feux-de-kitsune', 'frappe-iaijutsu', 'kagutsuchi-flamme-originelle']) {
    assert.equal(ids.has(id), true, `${id} porte une mécanique du set`);
  }
  assert.deepEqual([...new Set(deck.cardIds.filter((id) => cardById(id).rarity === 'mythique'))],
    ['daimyo-du-soleil-rouge', 'kagutsuchi-flamme-originelle']);

  for (const carte of RPG_SOLEIL_ROUGE_CARDS.filter((candidate) => candidate.rarity === 'mythique'
    && !['daimyo-du-soleil-rouge', 'kagutsuchi-flamme-originelle'].includes(candidate.id))) {
    assert.equal(ids.has(carte.id), false, `${carte.id} reste hors du deck de départ`);
    assert.equal(COLLECTION_DEPART.includes(carte.id), false, `${carte.id} n’est pas dans la dotation`);
    assert.ok(carteReveleePar(carte.id), `${carte.id} est accessible dans un booster après sa révélation`);
  }

  const listes = [
    ...RPG_DECKS_ARCHETYPES.map((starter) => starter.cardIds),
    ...Object.values(RPG_STORY_DECKS),
  ];
  for (const liste of listes) assert.equal(liste.includes('samourai-du-daimyo'), false, 'le jeton ne figure pas dans une liste');
});

test('les créatures suivent Harakiri, sans anciens effets dispersés', () => {
  const valeurs = { commune: 1, inhabituelle: 1, rare: 1, mythique: 1 };
  // Quatre exceptions assumées : Orochi (ses héritiers remplacent la frappe),
  // l'Ashigaru des braises, redevenu un simple corps de 1 mana sans Harakiri,
  // l'Oni de la fournaise, désormais 4/5 avec dégâts à l'arrivée à la place,
  // et Kagutsuchi, 2/6 avec Coup critique au lieu de Harakiri.
  const sansHarakiri = ['orochi', 'ashigaru-des-braises', 'oni-de-la-fournaise', 'kagutsuchi-flamme-originelle'];
  for (const carte of RPG_SOLEIL_ROUGE_CARDS.filter((c) => !['magie', 'terrain'].includes(c.kind))) {
    assert.equal(carte.honneur, sansHarakiri.includes(carte.id) ? 0 : valeurs[carte.rarity], carte.id);
    if (sansHarakiri.includes(carte.id)) assert.doesNotMatch(carte.text, /Harakiri/);
    else assert.match(carte.text, /Harakiri/);
    // Trois arrivées dans le set : l'exil de Susanoo, les deux Samouraïs du
    // Daimyō et les dégâts de l'Oni de la fournaise. La bannière du Daimyō est un déclenché d'attaque, pas un des
    // « anciens effets dispersés » que le set a retirés (ni combat, ni esquive
    // sauf l'Esquive assumée de l'Onna-musha).
    if (!['susanoo', 'daimyo-du-soleil-rouge', 'oni-de-la-fournaise'].includes(carte.id)) assert.equal(carte.arrivee, undefined);
    if (carte.id !== 'orochi') assert.equal(carte.destruction, undefined);
    assert.equal(carte.combat, undefined);
    // Deux Esquives assumées : l'Onna-musha et Tojiro, le pourfendeur.
    assert.equal(carte.esquive, ['onna-musha-des-cendres', 'tojiro-le-pourfendeur'].includes(carte.id) ? true : undefined, carte.id);
    assert.equal(carte.contreAttaque, carte.id === 'tojiro-le-pourfendeur' ? true : undefined, carte.id);
  }
  assert.equal(cardById('tengu-du-mont-ardent').resonance, 1);
  const kagutsuchiCarte = cardById('kagutsuchi-flamme-originelle');
  assert.equal(kagutsuchiCarte.resonance, undefined);
  assert.equal(kagutsuchiCarte.resonanceTribu, undefined);
  assert.doesNotMatch(kagutsuchiCarte.text, /Résonance samouraï/);
  assert.equal(kagutsuchiCarte.coupRapide, true);
  assert.deepEqual(kagutsuchiCarte.coupCritique, { chance: 0.25, fois: 4 });
  assert.deepEqual([kagutsuchiCarte.atk, kagutsuchiCarte.def], [2, 6]);
  assert.equal(kagutsuchiCarte.honneur, 0);
  assert.match(kagutsuchiCarte.text, /Attaque ciblée — /);
  assert.match(kagutsuchiCarte.text, /Coup critique/);
});

test('le rōnin garde Rapidité et le tengu combine Envol et Résonance', () => {
  const duel = duelTest();
  assert.equal(jouer(duel, 'joueur', 'ronin-du-soleil-rouge').ready, true);
  const avant = duel.joueur.main.length;
  const tengu = jouer(duel, 'joueur', 'tengu-du-mont-ardent');
  assert.equal(tengu.envol, true);
  assert.equal(duel.joueur.main.length, avant, 'aucune pioche à l’arrivée');
  assert.deepEqual([tengu.atk, tengu.def], [2, 3]);
});

test('la Résonance samouraï se cumule dans les deux camps, sans toucher les autres types ni la Neige', () => {
  const duel = duelTest();
  const ami = jouer(duel, 'joueur', 'samourai-du-torii');
  const adverse = jouer(duel, 'sorcier', 'samourai-du-torii');
  // Ashigaru, Rōnin et Onna-musha sont des Samouraïs : ils reçoivent la Résonance.
  const samourais = [
    jouer(duel, 'joueur', 'ashigaru-des-braises'),
    jouer(duel, 'joueur', 'ronin-du-soleil-rouge'),
    jouer(duel, 'joueur', 'onna-musha-des-cendres'),
  ];
  const exclus = [
    jouer(duel, 'sorcier', 'oni-de-la-fournaise'),
    jouer(duel, 'sorcier', 'chien-du-guet'),
  ];
  const neige = jouer(duel, 'joueur', 'loup-des-neiges');
  const tengu = jouer(duel, 'joueur', 'tengu-du-mont-ardent');
  assert.equal(rpgResonanceEnJeu(duel, 'samourai'), 3);
  for (const entite of samourais) assert.equal(entite.resonance, 3, entite.name);
  assert.equal(rpgResonanceEnJeu(duel, 'braise'), 0);
  // Chaque Shogun (2/2) reçoit les trois sources, lui compris : +3/+3.
  assert.deepEqual([ami.atk, ami.def], [5, 5]);
  assert.deepEqual([adverse.atk, adverse.def], [5, 5]);
  assert.equal(tengu.resonance, 0, 'le Tengu n’est pas de type Samouraï');
  for (const entite of exclus) assert.equal(entite.resonance, 0, entite.name);
  assert.equal(neige.resonance, 0);
  const kagutsuchi = jouer(duel, 'sorcier', 'kagutsuchi-flamme-originelle');
  assert.equal(rpgResonanceEnJeu(duel, 'samourai'), 3);
  for (const entite of samourais) assert.equal(entite.resonance, 3, entite.name);
  assert.deepEqual([ami.atk, ami.def], [5, 5]);
  assert.deepEqual([adverse.atk, adverse.def], [5, 5]);
  assert.equal(kagutsuchi.resonance, 0, 'le Kami n’est pas de type Samouraï');
  jouer(duel, 'joueur', 'valkyrie-au-corbeau');
  assert.equal(rpgResonanceEnJeu(duel, 'viking'), 0, 'la Valkyrie ne porte plus de Résonance viking');
  assert.equal(neige.resonance, 0, 'la Neige ne reçoit aucune Résonance dans ce duel');
  assert.equal(ami.resonance, 3, 'le Shogun compte sa propre source');
  for (const entite of exclus) assert.equal(entite.resonance, 0, entite.name);
  assert.equal(rpgBonusResonance(duel, { kind: 'creature', element: 'neige', typeLine: 'Créature — Samouraï' }), 3, 'seule la tribu compte pour un Samouraï');
  assert.ok(duel.log.some((ligne) => ligne.startsWith('La Résonance samouraï')));
  assert.ok(!duel.log.some((ligne) => ligne.startsWith('La Résonance renforce la Braise')));
});

test('la Résonance samouraï suit le sous-type imprimé, pas le nom ni la couleur', () => {
  assert.equal(cardReceivesResonance({ kind: 'creature', element: 'eau', typeLine: 'Créature — Humain · Samouraï' }, 'samourai'), true);
  assert.equal(cardReceivesResonance({ kind: 'creature', element: 'braise', name: 'Samouraï imaginaire', typeLine: 'Créature — Oni' }, 'samourai'), false);
  assert.equal(cardReceivesResonance({ kind: 'magie', element: 'braise', typeLine: 'Sorcellerie — Samouraï' }, 'samourai'), false);
  for (const id of ['samourai-du-torii', 'tengu-du-mont-ardent']) {
    assert.equal(cardById(id).resonanceTribu, 'samourai');
    assert.match(cardById(id).text, /Résonance samouraï/);
    assert.match(cardById(id).text, /type Samouraï/);
  }
  assert.equal(cardById('kagutsuchi-flamme-originelle').resonanceTribu, undefined);
  assert.doesNotMatch(cardById('kagutsuchi-flamme-originelle').text, /Résonance samouraï/);
});

test('le renvoi d’une source retire sa Résonance, sans déclencher Harakiri', () => {
  const duel = duelTest();
  const ami = jouer(duel, 'joueur', 'samourai-du-torii');
  const source = jouer(duel, 'sorcier', 'tengu-du-mont-ardent');
  const cible = jouer(duel, 'sorcier', 'chien-du-guet');
  sort(duel, 'ressac', source.id);
  assert.equal(rpgResonanceEnJeu(duel, 'samourai'), 1);
  assert.deepEqual([ami.atk, ami.def], [3, 3], 'seul en jeu, le Shogun se renforce lui-même');
  assert.equal(cible.def, 2);
  assert.ok(duel.sorcier.main.includes('tengu-du-mont-ardent'));
  assert.ok(!duel.log.some((ligne) => ligne.startsWith('Harakiri')));
});

test('Harakiri tire au hasard parmi tous les adversaires vivants, jamais les alliés', () => {
  for (const [rng, attendu] of [[() => 0, 0], [() => 0.5, 1], [() => 0.99, 2]]) {
    const duel = duelTest(rng);
    const honneur = jouer(duel, 'joueur', 'hatamoto-des-cendres');
    const allie = jouer(duel, 'joueur', 'chien-du-guet');
    const cibles = Array.from({ length: 3 }, () => jouer(duel, 'sorcier', 'drakkar-a-tete-de-dragon'));
    rpgBlesserCreature(duel, 'joueur', honneur.id, 10, 'eau');
    assert.deepEqual(cibles.map((c) => c.def), [0, 1, 2].map((i) => i === attendu ? 5 : 6));
    assert.equal(allie.def, 2);
    assert.equal(duel.sorcier.pv, 25);
    assert.equal(duel.log.filter((ligne) => ligne.startsWith('Harakiri')).length, 1);
  }
});

test('Harakiri inflige 1 dégât quelle que soit la rareté et fonctionne dans les deux camps', () => {
  // L'Ashigaru des braises et l'Oni de la fournaise n'ont plus de Harakiri : leur mort ne frappe personne (montant 0).
  for (const [id, montant] of [['ashigaru-des-braises', 0], ['oni-de-la-fournaise', 0], ['hatamoto-des-cendres', 1], ['ronin-du-soleil-rouge', 1], ['samourai-du-torii', 1]]) {
    for (const cote of ['joueur', 'sorcier']) {
      const duel = duelTest();
      const adverse = cote === 'joueur' ? 'sorcier' : 'joueur';
      const mort = jouer(duel, cote, id);
      const cible = jouer(duel, adverse, 'seigneur-des-machoires');
      rpgBlesserCreature(duel, cote, mort.id, 20, 'eau');
      assert.equal(cible.def, 6 - montant, `${cote} ${id}`);
    }
  }
});

test('sans créature adverse, Harakiri frappe le sorcier adverse', () => {
  for (const cote of ['joueur', 'sorcier']) {
    const duel = duelTest();
    const adverse = cote === 'joueur' ? 'sorcier' : 'joueur';
    const hatamoto = jouer(duel, cote, 'hatamoto-des-cendres');
    rpgBlesserCreature(duel, cote, hatamoto.id, 20, 'eau');
    assert.equal(duel[adverse].pv, 24);
    assert.match(duel.log.at(-1), /Harakiri : Hatamoto des cendres inflige 1 dégât au sorcier/);
  }
});

test('les dégâts du Harakiri respectent la protection, pas la parade ni Esquive', () => {
  const duel = duelTest();
  const mort = jouer(duel, 'joueur', 'samourai-du-torii');
  // Tiziri ne porte plus de protection de Braise (son engagement pour mana l’a
  // remplacée) : la protection est attachée directement à la cible, comme dans
  // les scénarios qui prêtent une protection temporaire.
  const protege = jouer(duel, 'sorcier', 'seigneur-des-machoires');
  protege.protection = { contre: 'braise', toursRestants: 2 };
  rpgBlesserCreature(duel, 'joueur', mort.id, 20, 'eau');
  assert.equal(protege.def, 6, 'protection contre la Braise : le Harakiri ne l’entame pas');
  const avecBouclier = duelTest();
  const mortBouclier = jouer(avecBouclier, 'joueur', 'samourai-du-torii');
  const cibleBouclier = jouer(avecBouclier, 'sorcier', 'seigneur-des-machoires');
  cibleBouclier.bouclier = 1;
  rpgBlesserCreature(avecBouclier, 'joueur', mortBouclier.id, 20, 'eau');
  assert.equal(cibleBouclier.bouclier, 1, 'la parade ne tombe pas sous une capacité');
  assert.equal(cibleBouclier.def, 5, 'le dégât du Harakiri passe : la parade n’absorbe rien');
  const autre = duelTest();
  const mort2 = jouer(autre, 'joueur', 'samourai-du-torii');
  const cible = jouer(autre, 'sorcier', 'seigneur-des-machoires');
  cible.esquive = true;
  rpgBlesserCreature(autre, 'joueur', mort2.id, 20, 'eau');
  assert.equal(cible.def, 5, 'capacité : Esquive ne se déclenche pas (6 − 1)');
});

test('Harakiri peut provoquer une chaîne de morts sans se déclencher deux fois', () => {
  const duel = duelTest();
  const premier = jouer(duel, 'joueur', 'samourai-du-torii');
  const kenshi = jouer(duel, 'sorcier', 'kenshi-de-la-forge');
  const hatamoto = jouer(duel, 'joueur', 'hatamoto-des-cendres');
  kenshi.pv = 1;
  kenshi.def = 1;
  hatamoto.pv = 2;
  hatamoto.def = 2;
  rpgBlesserCreature(duel, 'joueur', premier.id, 20, 'eau');
  assert.equal(duel.joueur.creatures.length, 0);
  assert.equal(duel.sorcier.creatures.length, 0);
  assert.equal(duel.sorcier.pv, 24, 'le dernier Harakiri sans créature en face touche le sorcier');
  assert.equal(duel.log.filter((ligne) => ligne.startsWith('Harakiri')).length, 3);
  rpgActionsEtat(duel);
  assert.equal(duel.log.filter((ligne) => ligne.startsWith('Harakiri')).length, 3);
});

test('les victimes simultanées sont retirées avant les tirages du Harakiri', () => {
  const duel = duelTest(() => 0);
  const attaquant = jouer(duel, 'joueur', 'hatamoto-des-cendres');
  const bloqueur = jouer(duel, 'sorcier', 'hatamoto-des-cendres');
  const survivant = jouer(duel, 'sorcier', 'drakkar-a-tete-de-dragon');
  attaquant.ready = true;
  assert.equal(rpgLancerAttaque(duel, 'joueur', [attaquant.id], { [attaquant.id]: bloqueur.id }).ok, true);
  assert.equal(survivant.def, 5);
  assert.equal(duel.joueur.creatures.length, 0);
  assert.deepEqual(duel.sorcier.creatures.map((c) => c.id), [survivant.id]);
});

test('la mort d’une source retire la Résonance avant sa frappe de Harakiri', () => {
  const duel = duelTest();
  const ami = jouer(duel, 'joueur', 'samourai-du-torii');
  const tengu = jouer(duel, 'joueur', 'tengu-du-mont-ardent');
  const cible = jouer(duel, 'sorcier', 'seigneur-des-machoires');
  rpgBlesserCreature(duel, 'joueur', tengu.id, 20, 'eau');
  assert.equal(rpgResonanceEnJeu(duel, 'samourai'), 1);
  assert.deepEqual([ami.atk, ami.def], [3, 3], 'sans le Tengu, le Shogun garde sa propre Résonance');
  assert.equal(cible.def, 5, 'Harakiri du Tengu sur le colosse 6');
});

test('l’iaijutsu détruit sa cible et le serment expire à la fin du tour', () => {
  assert.equal(cardById('frappe-iaijutsu').cost, 1);
  const duel = duelTest();
  const cible = jouer(duel, 'sorcier', 'chien-du-guet');
  sort(duel, 'frappe-iaijutsu', cible.id);
  assert.equal(duel.sorcier.creatures.length, 0);
  const ami = jouer(duel, 'joueur', 'ashigaru-des-braises');
  sort(duel, 'serment-de-la-forge');
  assert.deepEqual([ami.atk, ami.def], [3, 2]);
  rpgFinDeTour(duel);
  assert.deepEqual([ami.atk, ami.def], [1, 1]);
});

test('les feux de kitsune coûtent 5 et infligent 4 blessures à une créature ciblée', () => {
  const carte = cardById('feux-de-kitsune');
  assert.equal(carte.cost, 5);
  assert.equal(carte.instant, undefined, 'c’est une sorcellerie');
  assert.match(carte.typeLine, /^Sorcellerie/);
  assert.deepEqual(carte.cibles, ['creature', 'creature']);
  assert.deepEqual(carte.effet, { type: 'degats', amount: 4, cible: 'creature', choixDegats: true });
  assert.match(carte.text, /4 dégâts à une créature ou 2 dégâts à chacune de deux créatures ciblées/);
  const duel = duelTest();
  const allie = jouer(duel, 'joueur', 'chien-du-guet');
  const cible = jouer(duel, 'sorcier', 'seigneur-des-machoires');
  const fragile = jouer(duel, 'sorcier', 'chien-du-guet');
  const autreAdv = jouer(duel, 'sorcier', 'porteuse-de-cruches');
  const vieJoueur = duel.joueur.pv;
  const vieSorcier = duel.sorcier.pv;
  duel.joueur.main.push('feux-de-kitsune');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'feux-de-kitsune', cible.id, autreAdv.id).ok, true);
  assert.equal(cible.def, 4, 'la première cible subit 2 dégâts');
  assert.equal(autreAdv.def, 1, 'la seconde cible subit 2 dégâts');
  assert.equal(allie.def, 2, 'les alliés sont épargnés');
  sort(duel, 'feux-de-kitsune', fragile.id);
  assert.ok(!duel.sorcier.creatures.includes(fragile), 'une créature de défense 4 ou moins est détruite');
  assert.equal(duel.joueur.pv, vieJoueur);
  assert.equal(duel.sorcier.pv, vieSorcier);
});


test('les seize illustrations du set et leurs refontes ont une version de cache', () => {
  const page = readFileSync(new URL('../src/games/rpgCardArt.js', import.meta.url), 'utf8');
  for (const carte of RPG_SOLEIL_ROUGE_CARDS) {
    const versionsSpecifiques = {
      // Cartes repeintes en huile sombre, réaliste (dérogation Souls
      // documentée par `RPG-CARD-ART.md`). Le lot est daté par sa révision :
      // v2 pour Susanoo et Kagutsuchi, v3 pour le second lot, v4 pour le
      // troisième. Trois cartes du set gardent leur kaiga.
      'susanoo': 'braise-souls-cendres-v2',
      'kagutsuchi-flamme-originelle': 'braise-souls-cendres-v2',
      'orochi': 'braise-souls-cendres-v3',
      'oni-de-la-fournaise': 'braise-souls-cendres-v3',
      'daimyo-du-soleil-rouge': 'braise-souls-cendres-v3',
      'tengu-du-mont-ardent': 'braise-souls-cendres-v3',
      'onna-musha-des-cendres': 'braise-souls-cendres-v3',
      'feriel': 'braise-souls-cendres-v3',
      'cavalier-des-deux-sabres': 'braise-souls-cendres-v4',
      'ashigaru-des-braises': 'braise-souls-cendres-v4',
      'ronin-du-soleil-rouge': 'braise-souls-cendres-v4',
      'samourai-du-torii': 'braise-souls-cendres-v4',
      'hatamoto-des-cendres': 'braise-souls-cendres-v4',
      'kenshi-de-la-forge': 'braise-souls-cendres-v4',
      'serment-de-la-forge': 'braise-souls-cendres-v4',
      // Le dernier lot Souls : les magies et la Tour de braise. Toujours en
      // kaiga : Tojiro, rendu à sa peinture nihonga à la demande.
      'tojiro-le-pourfendeur': 'tojiro-nihonga-compo-identique-v1',
      'feux-de-kitsune': 'braise-souls-cendres-v6',
      'braise-et-sable': 'braise-et-sable-souls-v1',
      'sabre-maudit': 'braise-souls-cendres-v5',
      'frappe-iaijutsu': 'braise-souls-cendres-v6',
      'montagne-du-soleil-rouge': 'montagne-kaiga-soleil-rouge-v1',
    };
    const version = versionsSpecifiques[carte.id] ?? 'soleil-rouge-kaiga-couleurs-v7';
    assert.ok(page.includes(`'${carte.id}': '${version}'`), carte.id);
  }
});

test('une carte contrecarrée ne déclenche pas Harakiri', () => {
  const duel = duelTest();
  const cible = jouer(duel, 'joueur', 'chien-du-guet');
  duel.annonce = { cote: 'sorcier', carteId: 'samourai-du-torii' };
  duel.sorcier.main.push('samourai-du-torii');
  duel.joueur.main.push('contresort-des-abimes');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'contresort-des-abimes').ok, true);
  assert.equal(cible.def, 2);
  assert.ok(duel.sorcier.cimetiere.includes('samourai-du-torii'));
  assert.ok(!duel.log.some((ligne) => ligne.startsWith('Harakiri')));
});

test('les actions d’état déclenchent Harakiri une seule fois pour une créature morte', () => {
  const duel = duelTest();
  const mort = jouer(duel, 'joueur', 'samourai-du-torii');
  const cible = jouer(duel, 'sorcier', 'seigneur-des-machoires');
  mort.pv = 0;
  mort.def = 0;
  assert.equal(rpgActionsEtat(duel), 1);
  assert.equal(cible.def, 5);
  assert.equal(rpgActionsEtat(duel), 0);
  assert.equal(duel.joueur.cimetiere.filter((id) => id === 'samourai-du-torii').length, 1);
});

test('Harakiri fonctionne aussi après un aller-retour JSON de la partie', () => {
  let duel = duelTest();
  const mort = jouer(duel, 'joueur', 'hatamoto-des-cendres');
  const cible = jouer(duel, 'sorcier', 'seigneur-des-machoires');
  duel = JSON.parse(JSON.stringify(duel));
  rpgBlesserCreature(duel, 'joueur', mort.id, 20, 'eau');
  assert.equal(duel.sorcier.creatures.find((c) => c.id === cible.id).def, 5);
});


test('le Cavalier des deux sabres est mythique, rapide, samouraï et porte Harakiri', () => {
  const carte = cardById('cavalier-des-deux-sabres');
  assert.equal(carte.rarity, 'mythique');
  assert.equal(carte.honneur, 1);
  assert.equal(carte.rapidite, true);
  assert.equal(cardReceivesResonance(carte, 'samourai'), true);
  assert.deepEqual([carte.cost, carte.atk, carte.def], [6, 5, 4]);
  const deck = RPG_DECKS_ARCHETYPES.find((d) => d.id === RPG_SOLEIL_ROUGE_SET_ID);
  assert.equal(deck.cardIds.filter((id) => id === carte.id).length, 0, 'la mythique non-signature reste au Souk');
  assert.equal(COLLECTION_DEPART.includes(carte.id), false);
  assert.equal(carteReveleePar(carte.id).etageId, 'sables-3');
  const duel = duelTest();
  jouer(duel, 'joueur', 'tengu-du-mont-ardent');
  const cavalier = jouer(duel, 'joueur', carte.id);
  assert.equal(cavalier.ready, true);
  assert.deepEqual([cavalier.atk, cavalier.def], [6, 5]);
  const cible = jouer(duel, 'sorcier', 'seigneur-des-machoires');
  rpgBlesserCreature(duel, 'joueur', cavalier.id, 20, 'eau');
  assert.equal(cible.def, 5, 'Harakiri à la mort');
});


test('le Shogun promu renforce tous les Samouraïs, lui compris, et retire son bonus en quittant le jeu', () => {
  const carte = cardById('samourai-du-torii');
  assert.deepEqual([carte.cost, carte.atk, carte.def, carte.honneur], [4, 2, 2, 1]);
  assert.equal(carte.resonance, 1);
  assert.equal(carte.name, 'Shogun promu');
  assert.ok(!carte.resonanceExclutSource);
  assert.match(carte.text, /toutes les créatures de type Samouraï/);
  const duel = duelTest();
  const cavalier = jouer(duel, 'joueur', 'cavalier-des-deux-sabres');
  const source = jouer(duel, 'sorcier', carte.id);
  assert.deepEqual([source.atk, source.def], [3, 3], 'sa propre Résonance le renforce');
  assert.deepEqual([cavalier.atk, cavalier.def], [6, 5]);
  // Deux Shoguns cumulent les deux sources, eux compris.
  const second = jouer(duel, 'joueur', carte.id);
  assert.deepEqual([second.atk, second.def], [4, 4]);
  assert.deepEqual([source.atk, source.def], [4, 4]);
  assert.deepEqual([cavalier.atk, cavalier.def], [7, 6]);
  sort(duel, 'ressac', source.id);
  assert.equal(rpgResonanceEnJeu(duel, 'samourai'), 1);
  assert.deepEqual([second.atk, second.def], [3, 3], 'seul, il conserve sa propre Résonance');
  assert.deepEqual([cavalier.atk, cavalier.def], [6, 5]);
});

test('Orochi est un serpent 8/8 pour 8 et crée deux Petits Orochi 4/4 à sa mort dans son camp', () => {
  const carte = cardById('orochi');
  assert.deepEqual([carte.cost, carte.atk, carte.def], [8, 8, 8]);
  assert.match(carte.typeLine, /Serpent/);
  assert.equal(cardReceivesResonance(carte, 'samourai'), false);
  assert.equal(carteReveleePar(carte.id).etageId, 'sables-3');
  for (const cote of ['joueur', 'sorcier']) {
    const duel = duelTest();
    const adverse = cote === 'joueur' ? 'sorcier' : 'joueur';
    const cible = jouer(duel, adverse, 'seigneur-des-machoires');
    const defenseAvant = cible.def;
    const orochi = jouer(duel, cote, 'orochi');
    assert.equal(orochi.honneur, 0);
    rpgBlesserCreature(duel, cote, orochi.id, 8, 'eau');
    assert.equal(cible.def, defenseAvant, 'Orochi ne déclenche plus Harakiri');
    const petits = duel[cote].creatures;
    assert.equal(petits.length, 2);
    assert.notEqual(petits[0].id, petits[1].id);
    for (const petit of petits) {
      assert.equal(petit.carteId, 'petit-orochi');
      assert.equal(petit.jeton, true);
      assert.deepEqual([petit.atk, petit.def, petit.pvMax], [4, 4, 4]);
      assert.equal(petit.ready, false);
    }
    assert.ok(duel[cote].cimetiere.includes('orochi'));
    rpgActionsEtat(duel);
    assert.equal(duel[cote].creatures.length, 2, 'aucune création en double');
    rpgBlesserCreature(duel, cote, petits[0].id, 4, 'eau');
    assert.equal(duel[cote].creatures.length, 1, 'le petit ne crée pas de descendants');
  }
});

test('renvoyer Orochi ne crée pas de petits, et renvoyer un Petit Orochi le fait disparaître', () => {
  const duel = duelTest();
  const orochi = jouer(duel, 'sorcier', 'orochi');
  sort(duel, 'ressac', orochi.id);
  assert.equal(duel.sorcier.creatures.length, 0);
  assert.ok(duel.sorcier.main.includes('orochi'));
  const rejoue = jouer(duel, 'sorcier', 'orochi');
  rpgBlesserCreature(duel, 'sorcier', rejoue.id, 8, 'eau');
  sort(duel, 'ressac', duel.sorcier.creatures[0].id);
  assert.equal(duel.sorcier.creatures.length, 1);
  assert.ok(!duel.sorcier.main.includes('petit-orochi'));
  assert.ok(!COLLECTION_DEPART.includes('petit-orochi'));
  const deck = RPG_DECKS_ARCHETYPES.find((d) => d.id === RPG_SOLEIL_ROUGE_SET_ID);
  assert.equal(deck.cardIds.filter((id) => id === 'orochi').length, 0, 'Orochi reste hors du starter');
  assert.ok(carteReveleePar('orochi'), 'Orochi est accessible dans un booster');
  assert.ok(!deck.cardIds.includes('petit-orochi'));
});

test('Susanoo reste hors du starter : 5/3 pour 6, Harakiri et exil à l’arrivée', () => {
  const carte = cardById('susanoo');
  assert.deepEqual([carte.cost, carte.atk, carte.def, carte.honneur], [6, 5, 3, 1]);
  assert.deepEqual(carte.arrivee, { type: 'exil', cible: 'creature', coutMin: 5 });
  assert.match(carte.text, /coût 5 ou plus/);
  const deck = RPG_DECKS_ARCHETYPES.find((d) => d.id === RPG_SOLEIL_ROUGE_SET_ID);
  assert.equal(deck.cardIds.length, 30);
  assert.equal(deck.cardIds.filter((id) => id === carte.id).length, 0, 'l’autre mythique attend les boosters');
  assert.equal(COLLECTION_DEPART.includes(carte.id), false);
  assert.equal(carteReveleePar(carte.id).etageId, 'sables-3');
  for (const coteCible of ['joueur', 'sorcier']) {
    const duel = duelTest();
    const cible = jouer(duel, coteCible, 'orochi');
    duel.joueur.main.push('susanoo');
    const mana = duel.joueur.mana.braise;
    assert.equal(rpgJouerCreature(duel, 'joueur', 'susanoo').raison, 'cible');
    assert.equal(duel.joueur.mana.braise, mana);
    const res = rpgJouerCreature(duel, 'joueur', 'susanoo', cible.id);
    assert.equal(res.ok, true);
    assert.equal(duel.joueur.mana.braise, mana - 6);
    assert.ok(!duel[coteCible].creatures.some((e) => e.id === cible.id));
    assert.deepEqual(duel[coteCible].exil, ['orochi']);
    assert.ok(!duel[coteCible].cimetiere.includes('orochi'));
    assert.ok(!duel[coteCible].main.includes('orochi'));
    assert.ok(!duel[coteCible].creatures.some((e) => e.carteId === 'petit-orochi'), 'exiler ne déclenche pas la mort');
  }
});

test('Susanoo respecte la protection et peut être joué sans cible sur une table vide', () => {
  const duel = duelTest();
  const petite = jouer(duel, 'sorcier', 'samourai-du-torii'); // coût 4 : hors seuil
  const protege = jouer(duel, 'sorcier', 'oni-de-la-fournaise'); // coût 5 : dans le seuil
  protege.protection = { contre: 'braise', toursRestants: 2 };
  duel.joueur.main.push('susanoo');
  assert.equal(rpgJouerCreature(duel, 'joueur', 'susanoo', petite.id).raison, 'cible',
    'une créature de coût inférieur à 5 ne peut pas être ciblée par Susanoo');
  assert.equal(rpgJouerCreature(duel, 'joueur', 'susanoo', protege.id).raison, 'protection');
  assert.equal(rpgJouerCreature(duel, 'joueur', 'susanoo', 'inexistante').raison, 'cible');
  assert.equal(rpgJouerCreature(duel, 'joueur', 'susanoo').ok, true,
    'sans cible légale de coût 5 ou plus non protégée, Susanoo se pose sans cible');
  assert.equal(duel.sorcier.creatures.includes(petite), true, 'la créature de coût 4 reste en jeu');
  const vide = duelTest();
  const susanoo = jouer(vide, 'joueur', 'susanoo');
  const cible = jouer(vide, 'sorcier', 'seigneur-des-machoires');
  rpgBlesserCreature(vide, 'joueur', susanoo.id, 3, 'eau');
  assert.equal(cible.def, 5, 'Harakiri fonctionne à la mort de Susanoo');
});

test('l’IA choisit une cible à exiler et l’exil retire les auras sans déclencher Harakiri', () => {
  const duel = duelTest();
  const ronin = jouer(duel, 'joueur', 'ronin-du-soleil-rouge'); // coût 3 : hors seuil
  const source = jouer(duel, 'joueur', 'samourai-du-torii'); // coût 4 imprimé, +1 par le Grappin → 5
  duel.joueur.main.push('grappin-d-abordage');
  assert.equal(rpgJouerArme(duel, 'joueur', 'grappin-d-abordage', source.id).ok, true);
  const cavalier = jouer(duel, 'sorcier', 'cavalier-des-deux-sabres');
  assert.equal(cavalier.atk, 6);
  assert.equal(choisirCibleAutoIA(duel, 'sorcier', cardById('susanoo')), source.id);
  duel.sorcier.main.push('susanoo');
  assert.equal(rpgJouerCreature(duel, 'sorcier', 'susanoo', ronin.id).raison, 'cible');
  assert.equal(rpgJouerCreature(duel, 'sorcier', 'susanoo', source.id).ok, true);
  assert.deepEqual([cavalier.atk, cavalier.def], [5, 4]);
  assert.ok(!duel.log.some((ligne) => ligne.startsWith('Harakiri')));
});


test('le Daimyō du Soleil rouge est un 3/4 à 5 qui lève deux Samouraïs 1/1 en arrivant', () => {
  const carte = cardById('daimyo-du-soleil-rouge');
  assert.deepEqual([carte.cost, carte.atk, carte.def, carte.rarity, carte.honneur], [5, 3, 4, 'mythique', 1]);
  assert.deepEqual(carte.arrivee, { type: 'jetons', jeton: 'samourai-du-daimyo', nombre: 2 });
  assert.deepEqual(carte.banniere, { tribu: 'samourai', atk: 1, def: 1 });
  assert.match(carte.text, /deux créatures-jetons « Samouraï » 1\/1/);
  assert.match(carte.text, /chaque fois qu’un Samouraï de votre camp attaque, ce Samouraï gagne \+1\/\+1/);

  // Le jeton : une créature-jeton déclarée hors du catalogue du duel — jamais
  // dans un deck, jamais dans la dotation de départ, jamais collectionnable.
  const jeton = cardById('samourai-du-daimyo');
  assert.equal(jeton.jeton, true);
  assert.deepEqual([jeton.cost, jeton.atk, jeton.def, jeton.element], [0, 1, 1, 'braise']);
  assert.equal(jeton.honneur, undefined, 'un jeton ne porte pas de Harakiri');
  assert.match(jeton.typeLine, /Créature-jeton — Humain · Samouraï/);
  assert.equal(cardReceivesResonance(jeton, 'samourai'), true, 'le jeton est un Samouraï');
  assert.equal(COLLECTION_DEPART.includes('samourai-du-daimyo'), false);
  const deck = RPG_DECKS_ARCHETYPES.find((d) => d.id === RPG_SOLEIL_ROUGE_SET_ID);
  assert.equal(deck.cardIds.includes('samourai-du-daimyo'), false);
  // L'illustration du jeton est livrée en plein art, au ratio de la face.
  const jpg = readFileSync(new URL(`../public/cards/${cardArtId(jeton)}.jpg`, import.meta.url));
  let dimensions;
  for (let i = 2; i < jpg.length;) {
    const marqueur = jpg[i + 1];
    if (marqueur >= 0xc0 && marqueur <= 0xc3) {
      dimensions = [jpg.readUInt16BE(i + 7), jpg.readUInt16BE(i + 5)];
      break;
    }
    i += 2 + jpg.readUInt16BE(i + 2);
  }
  assert.deepEqual(dimensions, [CARD_ART_LARGEUR, CARD_ART_HAUTEUR]);
});

test('le Daimyō paie 5 mana et pose ses deux jetons, sans pioche ni lancer en plus', () => {
  // Un jeton renvoyé cesse d’exister au lieu de rejoindre une main : le Ressac
  // du joueur ne vise que le camp d’en face, donc on renvoie celui du sorcier.
  const renvoi = duelTest();
  jouer(renvoi, 'sorcier', 'daimyo-du-soleil-rouge');
  const jetonsSorcier = renvoi.sorcier.creatures.filter((entite) => entite.carteId === 'samourai-du-daimyo');
  assert.equal(jetonsSorcier.length, 2);
  const mainSorcier = renvoi.sorcier.main.length;
  sort(renvoi, 'ressac', jetonsSorcier[0].id);
  assert.equal(renvoi.sorcier.creatures.length, 2, 'le jeton quitte la table');
  assert.equal(renvoi.sorcier.main.length, mainSorcier, 'un jeton ne rejoint jamais une main');
  assert.equal(renvoi.sorcier.main.includes('samourai-du-daimyo'), false);

  for (const cote of ['joueur', 'sorcier']) {
    const duel = duelTest();
    const avant = duel[cote].main.length;
    const mana = duel[cote].mana.braise;
    duel[cote].main.push('daimyo-du-soleil-rouge');
    const res = rpgJouerCreature(duel, cote, 'daimyo-du-soleil-rouge');
    assert.equal(res.ok, true);
    assert.equal(duel[cote].mana.braise, mana - 5, 'le coût de la carte, une seule fois');
    assert.equal(duel[cote].main.length, avant, 'aucune pioche à l’arrivée');
    const daimyo = res.entite;
    assert.deepEqual([daimyo.atk, daimyo.def, daimyo.pv, daimyo.pvMax], [3, 4, 4, 4]);
    const jetons = duel[cote].creatures.filter((entite) => entite.carteId === 'samourai-du-daimyo');
    assert.equal(jetons.length, 2);
    for (const jeton of jetons) {
      assert.equal(jeton.jeton, true);
      assert.deepEqual([jeton.atk, jeton.def, jeton.pvMax], [1, 1, 1]);
      assert.equal(jeton.ready, false, 'le jeton garde le mal d’invocation');
      assert.notEqual(jeton.id, daimyo.id);
    }
    rpgActionsEtat(duel);
    assert.equal(duel[cote].creatures.length, 3, 'aucune création en double');
  }
});

test('la bannière du Daimyō grandit chaque Samouraï qui attaque, et lui-même', () => {
  const duel = duelTest();
  const daimyo = jouer(duel, 'joueur', 'daimyo-du-soleil-rouge');
  const ronin = jouer(duel, 'joueur', 'ronin-du-soleil-rouge');
  const allie = jouer(duel, 'joueur', 'chien-du-guet');
  const adverse = jouer(duel, 'sorcier', 'ashigaru-des-braises');
  const pvSorcier = duel.sorcier.pv;
  // Une seule phase d'attaque par tour : chaque déclaration du camp ouvre donc
  // son propre tour (deux fins de tour ramènent la main au joueur).
  const nouveauTour = (cote) => {
    do { rpgFinDeTour(duel); } while (duel.tour !== cote);
  };
  // Le rōnin est un Samouraï : sa frappe du tour part à 3 + 1 = 4. Aucun
  // bloqueur n’est assigné, pour isoler la bannière du reste du combat.
  assert.equal(rpgLancerAttaque(duel, 'joueur', [ronin.id], { [ronin.id]: [] }).ok, true);
  assert.equal(duel.sorcier.pv, pvSorcier - 4, 'la bannière est posée avant les blessures');
  assert.deepEqual([ronin.atk, ronin.def, ronin.pv], [4, 3, 3], 'le +1/+1 reste acquis');
  // Un chien du guet n’est pas un Samouraï : rien pour lui.
  nouveauTour('joueur');
  assert.equal(rpgLancerAttaque(duel, 'joueur', [allie.id], { [allie.id]: [] }).ok, true);
  assert.deepEqual([allie.atk, allie.def], [2, 2]);
  // Les deux Samouraïs 1/1 levés par le Daimyō sont, eux, de la tribu.
  nouveauTour('joueur');
  const jeton = duel.joueur.creatures.find((entite) => entite.carteId === 'samourai-du-daimyo');
  assert.equal(rpgLancerAttaque(duel, 'joueur', [jeton.id], { [jeton.id]: [] }).ok, true);
  assert.deepEqual([jeton.atk, jeton.def], [2, 2], 'le jeton Samouraï reçoit la bannière');
  // Un Daimyō ne grandit que son camp : le samouraï du sorcier attaque à 1,
  // et sa propre arrivée n’a pas levé de jetons chez le joueur.
  nouveauTour('sorcier');
  assert.equal(rpgLancerAttaque(duel, 'sorcier', [adverse.id], { [adverse.id]: [] }).ok, true);
  assert.deepEqual([adverse.atk, adverse.def], [1, 1]);
  assert.equal(duel.joueur.creatures.filter((entite) => entite.carteId === 'samourai-du-daimyo').length,
    2, 'chaque camp ne lève que ses propres Samouraïs');
  // Le Daimyō est un Samouraï : sa propre attaque le grandit aussi.
  nouveauTour('joueur');
  assert.equal(rpgLancerAttaque(duel, 'joueur', [daimyo.id], { [daimyo.id]: [] }).ok, true);
  assert.deepEqual([daimyo.atk, daimyo.def], [4, 5]);
});

test('la bannière tombe dès la déclaration verrouillée, sans repasser à la résolution', () => {
  const duel = duelTest();
  jouer(duel, 'joueur', 'daimyo-du-soleil-rouge');
  const ronin = jouer(duel, 'joueur', 'ronin-du-soleil-rouge');
  const pvSorcier = duel.sorcier.pv;
  assert.deepEqual([ronin.atk, ronin.def, ronin.pv], [3, 2, 2]);

  // C'est le geste de l'interface quand les attaquants sont confirmés : le
  // renfort est visible avant les bloqueurs, alors qu'aucune blessure n'a
  // encore été infligée et que l'attaquant n'est pas encore engagé.
  assert.equal(rpgAppliquerBannieresAttaque(duel, 'joueur', [ronin.id]), true);
  assert.deepEqual([ronin.atk, ronin.def, ronin.pv], [4, 3, 3],
    'le +1/+1 est déjà là à la déclaration');
  assert.equal(ronin.attaquee, false, 'la déclaration ne résout pas encore le combat');
  assert.equal(duel.sorcier.pv, pvSorcier);

  assert.equal(rpgLancerAttaque(
    duel, 'joueur', [ronin.id], { [ronin.id]: [] }, null, null, {},
    { attaqueDeclaree: true, bannieresAppliquees: true },
  ).ok, true);
  assert.equal(duel.sorcier.pv, pvSorcier - 4, 'la frappe utilise la force déjà grandie');
  assert.deepEqual([ronin.atk, ronin.def, ronin.pv], [4, 3, 3],
    'la résolution ne déclenche pas la bannière une seconde fois');
});

test('la bannière s’applique à chaque attaque et reste acquise quand le Daimyō part', () => {
  const duel = duelTest();
  const daimyo = jouer(duel, 'joueur', 'daimyo-du-soleil-rouge');
  const ronin = jouer(duel, 'joueur', 'ronin-du-soleil-rouge');
  assert.equal(rpgLancerAttaque(duel, 'joueur', [ronin.id], { [ronin.id]: [] }).ok, true);
  assert.deepEqual([ronin.atk, ronin.def], [4, 3]);
  // Deux tours plus tard, le rōnin est dégagé et repart : la bannière repasse.
  rpgFinDeTour(duel);
  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'joueur');
  assert.equal(ronin.attaquee, false);
  assert.equal(rpgLancerAttaque(duel, 'joueur', [ronin.id], { [ronin.id]: [] }).ok, true);
  assert.deepEqual([ronin.atk, ronin.def], [5, 4], 'un déclenchement par attaque déclarée');
  // Le Daimyō quitte la table : le rōnin garde ce qu’il a gagné…
  rpgBlesserCreature(duel, 'joueur', daimyo.id, 10, 'eau');
  assert.equal(duel.joueur.creatures.some((entite) => entite.id === daimyo.id), false);
  assert.deepEqual([ronin.atk, ronin.def], [5, 4]);
  // …et la déclaration suivante — un tour plus tard, une seule phase d'attaque
  // par tour — ne le grandit plus.
  rpgFinDeTour(duel);
  rpgFinDeTour(duel);
  assert.equal(rpgLancerAttaque(duel, 'joueur', [ronin.id], { [ronin.id]: [] }).ok, true);
  assert.deepEqual([ronin.atk, ronin.def], [5, 4]);
  assert.ok(duel.log.some((ligne) => ligne.startsWith('Bannière Daimyō du Soleil rouge')));
});

test('le jeton Samouraï reçoit la Résonance samouraï comme la bannière de son seigneur', () => {
  const duel = duelTest();
  const torii = jouer(duel, 'joueur', 'samourai-du-torii');
  const daimyo = jouer(duel, 'joueur', 'daimyo-du-soleil-rouge');
  const jetons = duel.joueur.creatures.filter((entite) => entite.carteId === 'samourai-du-daimyo');
  // Une seule source de Résonance dans ce camp : le Torii. Le Daimyō porte la
  // bannière, pas la Résonance — mais les jetons, eux, sont des Samouraïs.
  assert.equal(rpgResonanceEnJeu(duel, 'samourai'), 1);
  for (const jeton of jetons) assert.deepEqual([jeton.atk, jeton.def], [2, 2]);
  assert.deepEqual([torii.atk, torii.def], [3, 3], 'le Shogun profite de sa propre Résonance');
  assert.deepEqual([daimyo.atk, daimyo.def], [4, 5]);
  // En attaquant, le jeton gagne encore +1/+1 par bannière : 3/3.
  for (const jeton of jetons) jeton.ready = true;
  assert.equal(rpgLancerAttaque(duel, 'joueur', [jetons[0].id]).ok, true);
  assert.deepEqual([jetons[0].atk, jetons[0].def], [3, 3]);
  assert.deepEqual([jetons[1].atk, jetons[1].def], [2, 2], 'l’autre jeton n’a pas attaqué');
  assert.equal(duel.joueur.creatures.length, 4);
});

test('la bannière arme la frappe du tour dans l’échange, pas seulement sur le sorcier', () => {
  const duel = duelTest();
  jouer(duel, 'joueur', 'daimyo-du-soleil-rouge');
  const ronin = jouer(duel, 'joueur', 'ronin-du-soleil-rouge');
  // Un 3/4 neutre : ni Samouraï (la bannière du camp d’en face ne le touche
  // pas), ni Harakiri, ni Furie — il meurt à 4 dégâts (l’attaque armée), il
  // survivrait à 3.
  const bloqueur = jouer(duel, 'sorcier', 'boualem');
  assert.deepEqual([bloqueur.atk, bloqueur.def], [3, 4]);
  const pvSorcier = duel.sorcier.pv;
  const res = rpgLancerAttaque(duel, 'joueur', [ronin.id], { [ronin.id]: [bloqueur.id] });
  assert.equal(res.ok, true);
  assert.equal(res.resume.repartitions[ronin.id][bloqueur.id], 4, 'la bannière compte dans le partage');
  assert.equal(duel.sorcier.creatures.some((entite) => entite.id === bloqueur.id), false,
    '4 dégâts sur un 3/4 : le bloqueur tombe, là où 3 ne l’auraient pas tué');
  assert.equal(res.resume.frappeSorcier, 0, 'l’attaque était bloquée : aucun dégât de combat direct');
  assert.equal(duel.sorcier.pv, pvSorcier - 1, 'sans survivant adverse, le Harakiri du rōnin mort touche le sorcier');
  assert.equal(duel.joueur.creatures.some((entite) => entite.id === ronin.id), false,
    'le rōnin encaisse 3 : il tombe, sa bannière ne l’a pas sauvé');
});

test('une répartition refusée ne laisse pas la bannière derrière elle', () => {
  const duel = duelTest();
  jouer(duel, 'joueur', 'daimyo-du-soleil-rouge');
  const ronin = jouer(duel, 'joueur', 'ronin-du-soleil-rouge');
  // Deux 2/4 neutres : 2 dégâts chacun ne les tue pas.
  const premier = jouer(duel, 'sorcier', 'dune-marchante');
  const second = jouer(duel, 'sorcier', 'dune-marchante');
  assert.deepEqual([premier.atk, premier.def], [2, 4]);
  const journal = duel.log.length;
  // Un partage figé sur la force d’avant la bannière (3) ne totalise plus
  // l’attaque de l’attaquant grandi (4) : la déclaration est refusée.
  const refus = rpgLancerAttaque(duel, 'joueur', [ronin.id],
    { [ronin.id]: [premier.id, second.id] }, { [ronin.id]: { [premier.id]: 3, [second.id]: 0 } });
  assert.equal(refus.raison, 'repartition');
  assert.deepEqual([ronin.atk, ronin.def, ronin.pv], [3, 2, 2], 'aucun bonus laissé derrière');
  assert.equal(ronin.attaquee, false, 'la créature n’est pas engagée');
  assert.equal(duel.log.length, journal, 'aucune ligne de bannière au journal');
  // La même déclaration, laissée au moteur, partage bien 4 : 2 et 2.
  const res = rpgLancerAttaque(duel, 'joueur', [ronin.id], { [ronin.id]: [premier.id, second.id] });
  assert.equal(res.ok, true);
  assert.deepEqual(res.resume.repartitions[ronin.id], { [premier.id]: 2, [second.id]: 2 });
  assert.equal(duel.sorcier.creatures.length, 2, '2 dégâts sur des 2/4 : les deux bloqueurs survivent');
  // Le rōnin, lui, encaisse 2 + 2 : sa bannière ne l’a pas sauvé.
  assert.equal(duel.joueur.creatures.some((entite) => entite.id === ronin.id), false);
});

test('la bannière déclenche aussi une attaque directe contre le sorcier', () => {
  const duel = duelTest();
  const daimyo = jouer(duel, 'joueur', 'daimyo-du-soleil-rouge');
  const pvSorcier = duel.sorcier.pv;
  assert.equal(rpgAttaquerSorcier(duel, 'joueur', daimyo.id).raison, 'pas-pret');
  daimyo.ready = true;
  assert.equal(rpgAttaquerSorcier(duel, 'joueur', daimyo.id).ok, true);
  assert.equal(duel.sorcier.pv, pvSorcier - 4, 'le Daimyō frappe à 4, pas à 3');
  assert.deepEqual([daimyo.atk, daimyo.def], [4, 5]);
});

test('le Kenshi de la forge est un 1/2 à 3 qui ne forge que ses créatures adjacentes', () => {
  const carte = cardById('kenshi-de-la-forge');
  assert.deepEqual([carte.cost, carte.atk, carte.def, carte.rarity, carte.honneur], [3, 1, 2, 'rare', 1]);
  assert.match(carte.typeLine, /Samouraï/);
  assert.deepEqual(carte.aura, { type: 'buff-autres', atk: 1, def: 0, saufSoi: true, camps: 'camp' });
  assert.match(carte.text, /vos créatures adjacentes gagnent \+1\/\+0, quel que soit leur type/);
  assert.ok(!carte.arrivee && !carte.destruction && !carte.resonance, 'l’aura est son seul texte de règle');

  // Rangée : Kenshi (0), Torii (1), Chien (2), Tengu (3). Une seule voisine
  // est à portée de la forge ; la Résonance, elle, reste de table.
  const duel = duelTest();
  const kenshi = jouer(duel, 'joueur', 'kenshi-de-la-forge');
  const torii = jouer(duel, 'joueur', 'samourai-du-torii');
  const adverse = jouer(duel, 'sorcier', 'ronin-du-soleil-rouge');
  const nonSamourai = jouer(duel, 'joueur', 'chien-du-guet');
  // Le Tengu est un yōkai, pas un Samouraï, et il porte la Résonance samouraï.
  const yokai = jouer(duel, 'joueur', 'tengu-du-mont-ardent');
  assert.equal(rpgResonanceEnJeu(duel, 'samourai'), 2, 'le Torii et le Tengu');
  assert.deepEqual([kenshi.atk, kenshi.def], [3, 4],
    'le Kenshi reçoit la Résonance mais pas sa propre forge');
  // Le Shogun, case voisine : 2/2 imprimé, +2/+2 de Résonance, +1/+0 de forge.
  assert.deepEqual([torii.atk, torii.def], [5, 4], 'la voisine immédiate est forgée');
  // Le rōnin adverse : 3/2, +2/+2 de Résonance (elle, est de table) — la forge
  // du Kenshi ne franchit pas la ligne du camp.
  assert.deepEqual([adverse.atk, adverse.def], [5, 4]);
  assert.deepEqual([nonSamourai.atk, nonSamourai.def], [2, 2],
    'le Chien, à deux cases, n’est plus forgé');
  assert.deepEqual([yokai.atk, yokai.def], [2, 3],
    'le Tengu, encore plus loin, ne reçoit que la Résonance');
  assert.ok(duel.log.some((ligne) => ligne.startsWith('La Résonance samouraï')));
});

test('la forge compte par source, se retire à l’exil et ne touche jamais la défense', () => {
  const duel = duelTest();
  // Chaque Kenshi est posé juste à côté de sa protégée : les deux camps
  // occupent des cases 0 et 1, donc la forge de voisinage s’applique.
  const premier = jouer(duel, 'joueur', 'kenshi-de-la-forge');
  const ronin = jouer(duel, 'joueur', 'ronin-du-soleil-rouge');
  const onna = jouer(duel, 'sorcier', 'onna-musha-des-cendres');
  assert.deepEqual([ronin.atk, ronin.def], [4, 2], 'la forge du Kenshi voisin sert son camp');
  assert.deepEqual([onna.atk, onna.def], [3, 3], 'la Samouraï d’en face ne reçoit rien');
  // Un second Kenshi, dans l’autre camp : chacun forge les Samouraïs de SON
  // camp. Les deux Kenshis ne se donnent rien — pas plus qu’ils ne cumulent.
  const second = jouer(duel, 'sorcier', 'kenshi-de-la-forge');
  assert.deepEqual([ronin.atk, ronin.def], [4, 2], 'le rōnin ne reçoit pas la forge d’en face');
  assert.deepEqual([onna.atk, onna.def], [4, 3], 'la Samouraï adverse reçoit la sienne');
  assert.deepEqual([premier.atk, premier.def], [1, 2], 'un Kenshi seul dans son camp ne se forge pas');
  assert.deepEqual([second.atk, second.def], [1, 2]);
  // On retire les sources par l'exil du Père des corbeaux (coût 3 ou moins) :
  // l'exil n'est pas une mort, ni Harakiri, ni capacité de destruction ne se
  // déclenchent — là où une blessure ferait frapper le Harakiri du Kenshi et
  // brouillerait la mesure.
  const exiler = (cibleId) => {
    duel.joueur.main.push('pere-des-corbeaux');
    assert.equal(rpgJouerCreature(duel, 'joueur', 'pere-des-corbeaux', cibleId).ok, true);
  };
  exiler(premier.id);
  assert.deepEqual([ronin.atk, ronin.def, ronin.pv], [3, 2, 2], 'la forge de l’absent est retirée');
  assert.deepEqual([onna.atk, onna.def], [4, 3], 'celle d’en face reste en place');
  assert.deepEqual([second.atk, second.def], [1, 2], 'le Kenshi adverse reste un 1/2');
  // Plus de forge du tout : les Samouraïs reviennent à leur force imprimée.
  exiler(second.id);
  assert.deepEqual([ronin.atk, ronin.def, ronin.pv], [3, 2, 2]);
  assert.deepEqual([onna.atk, onna.def], [3, 3]);
  // La défense n’a jamais bougé d’un point : perdre la forge ne peut pas tuer.
  assert.ok(!duel.log.some((ligne) => ligne.startsWith('Harakiri')));
});

test('la forge, la Résonance samouraï et la bannière se cumulent sans dériver', () => {
  const duel = duelTest();
  const kenshi = jouer(duel, 'joueur', 'kenshi-de-la-forge');
  const torii = jouer(duel, 'joueur', 'samourai-du-torii');
  const daimyo = jouer(duel, 'joueur', 'daimyo-du-soleil-rouge');
  const jeton = duel.joueur.creatures.find((entite) => entite.carteId === 'samourai-du-daimyo');
  // Une source de Résonance donne +1/+1 aux Samouraïs ; la forge n’ajoute
  // son +1/+0 qu’au Torii, seule voisine du Kenshi (cases 0 et 1). Le Daimyō
  // et ses jetons, plus loin, n’en profitent pas ; la bannière attend l’attaque.
  assert.equal(rpgResonanceEnJeu(duel, 'samourai'), 1);
  assert.deepEqual([kenshi.atk, kenshi.def], [2, 3], 'le Kenshi reçoit la Résonance, pas sa forge');
  assert.deepEqual([torii.atk, torii.def], [4, 3], 'le Shogun voisin reçoit la forge et sa propre Résonance');
  assert.deepEqual([daimyo.atk, daimyo.def], [4, 5], 'le Daimyō, à deux cases, n’est pas forgé');
  assert.deepEqual([jeton.atk, jeton.def], [2, 2], 'ni le jeton, encore plus loin');
  // La table bouge encore (le jeton grandit à l’attaque) : la forge ne dérive pas.
  jeton.ready = true;
  assert.equal(rpgLancerAttaque(duel, 'joueur', [jeton.id], { [jeton.id]: [] }).ok, true);
  assert.deepEqual([jeton.atk, jeton.def], [3, 3], 'bannière +1/+1 sur la Résonance seule');
  assert.deepEqual([torii.atk, torii.def], [4, 3], 'les autres n’ont pas bougé');
  assert.deepEqual([daimyo.atk, daimyo.def], [4, 5]);
});

test('une bannière adverse ne grandit pas mes Samouraïs, et deux bannières se cumulent', () => {
  const duel = duelTest();
  jouer(duel, 'sorcier', 'daimyo-du-soleil-rouge');
  const allie = jouer(duel, 'joueur', 'ronin-du-soleil-rouge');
  assert.equal(rpgLancerAttaque(duel, 'joueur', [allie.id], { [allie.id]: [] }).ok, true);
  assert.deepEqual([allie.atk, allie.def], [3, 2], 'le Daimyō du sorcier ne renforce que son camp');
  // Une seconde bannière chez le sorcier : ses Samouraïs gagnent +2/+2.
  jouer(duel, 'sorcier', 'daimyo-du-soleil-rouge');
  const ashigaru = jouer(duel, 'sorcier', 'ashigaru-des-braises');
  ashigaru.ready = true;
  assert.equal(rpgLancerAttaque(duel, 'sorcier', [ashigaru.id], { [ashigaru.id]: [] }).ok, true);
  assert.deepEqual([ashigaru.atk, ashigaru.def], [3, 3]);
});

test('Susanoo exile aussi un porteur des nouvelles armes sans perdre son équipement', () => {
  const duel = duelTest();
  const porteur = jouer(duel, 'sorcier', 'oni-de-la-fournaise');
  duel.sorcier.main.push('takouba-des-pistes');
  assert.equal(rpgJouerArme(duel, 'sorcier', 'takouba-des-pistes', porteur.id).ok, true);
  duel.joueur.main.push('susanoo');
  assert.equal(rpgJouerCreature(duel, 'joueur', 'susanoo', porteur.id).ok, true);
  assert.deepEqual(duel.sorcier.exil, ['oni-de-la-fournaise']);
  assert.ok(duel.sorcier.cimetiere.includes('takouba-des-pistes'));
  assert.ok(!duel.sorcier.cimetiere.includes('oni-de-la-fournaise'));
});

test('Tojiro, le pourfendeur : 5/5 mythique à 6, Esquive et Contre-attaque', () => {
  const carte = cardById('tojiro-le-pourfendeur');
  assert.equal(carte.rarity, 'mythique');
  assert.deepEqual([carte.cost, carte.atk, carte.def, carte.honneur], [6, 5, 5, 1]);
  assert.equal(carte.esquive, true);
  assert.equal(carte.contreAttaque, true);
  assert.match(carte.text, /Contre-attaque — /);
  assert.match(carte.text, /riposte frappe le sorcier adverse/);
  assert.match(carte.text, /il contre-attaque quand même/);
  assert.equal(cardReceivesResonance(carte, 'samourai'), true);
  const deck = RPG_DECKS_ARCHETYPES.find((d) => d.id === RPG_SOLEIL_ROUGE_SET_ID);
  assert.equal(deck.cardIds.includes(carte.id), false, 'la mythique attend le Souk');
  assert.equal(carteReveleePar(carte.id).etageId, 'sables-3');
  assert.equal(pastillesPourCarte(carte).some((pastille) => pastille.cle === 'contreAttaque'), true);
});

test('Contre-attaque : une attaque ciblée portée contre Tojiro lui est rendue — et reste rendue s’il esquive', () => {
  const duel = duelTest();
  const tojiro = jouer(duel, 'sorcier', 'tojiro-le-pourfendeur');
  const djinn = jouer(duel, 'joueur', 'djinn-de-foudre');
  djinn.ready = true;
  assert.equal(rpgLancerAttaque(duel, 'joueur', [djinn.id], {}, null, null, { [djinn.id]: tojiro.id }).ok, true);
  assert.equal(tojiro.pv, 3, 'la frappe rapide de 2 passe');
  assert.equal(duel.joueur.creatures.some((entite) => entite.id === djinn.id), false,
    'Tojiro rend 5 dégâts à l’Attaque ciblée et la tue');
  assert.ok(duel.log.some((ligne) => /Contre-attaque : Tojiro, le pourfendeur rend son coup/.test(ligne)));

  // Esquive réussie : la frappe ne porte pas, la riposte part quand même. Le
  // premier jet (0,5) laisse l’Attaque ciblée toucher, le second (0,1) réussit
  // l'Esquive de Tojiro — un seul jet à 0,1 aurait fait RATER la frappe.
  let jets = [];
  const duelEsquive = duelTest(() => (jets.length ? jets.shift() : 0.5));
  const tojiroEsquive = jouer(duelEsquive, 'sorcier', 'tojiro-le-pourfendeur');
  const djinnEsquive = jouer(duelEsquive, 'joueur', 'djinn-de-foudre');
  djinnEsquive.ready = true;
  jets = [0.5, 0.1];
  rpgLancerAttaque(duelEsquive, 'joueur', [djinnEsquive.id], {}, null, null, { [djinnEsquive.id]: tojiroEsquive.id });
  assert.equal(tojiroEsquive.pv, 5, 'l’attaque ciblée est esquivée');
  assert.equal(duelEsquive.joueur.creatures.some((entite) => entite.id === djinnEsquive.id), false,
    'la Contre-attaque frappe malgré l’Esquive');
});

test('Contre-attaque : un sort qui cible Tojiro frappe son lanceur, même esquivé', () => {
  const duel = duelTest();
  const tojiro = jouer(duel, 'sorcier', 'tojiro-le-pourfendeur');
  duel.joueur.main.push('frappe-iaijutsu');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'frappe-iaijutsu', tojiro.id).ok, true);
  assert.equal(tojiro.pv, 3, 'le sort inflige ses 2 dégâts');
  assert.equal(duel.joueur.pv, 20, 'la riposte frappe le sorcier qui a lancé le sort');

  const duelEsquive = duelTest(() => 0.05);
  const tojiroEsquive = jouer(duelEsquive, 'sorcier', 'tojiro-le-pourfendeur');
  duelEsquive.joueur.main.push('frappe-iaijutsu');
  rpgLancerMagie(duelEsquive, 'joueur', 'frappe-iaijutsu', tojiroEsquive.id);
  assert.equal(tojiroEsquive.pv, 5, 'le sort est esquivé');
  assert.equal(duelEsquive.joueur.pv, 20, 'Tojiro renvoie le sort au sorcier malgré l’Esquive');
});

test('Contre-attaque : une capacité qui cible Tojiro se paie sur la créature qui la porte', () => {
  const duel = duelTest();
  const tojiro = jouer(duel, 'sorcier', 'tojiro-le-pourfendeur');
  duel.joueur.main.push('tour-de-braise');
  assert.equal(rpgJouerCreature(duel, 'joueur', 'tour-de-braise', tojiro.id).ok, true);
  assert.equal(tojiro.pv, 4, 'l’arrivée inflige son dégât');
  assert.equal(duel.joueur.creatures.some((entite) => entite.carteId === 'tour-de-braise'), false,
    'la Tour de Braise encaisse la Contre-attaque et meurt');
  assert.equal(duel.joueur.pv, 25, 'un effet de créature ne touche jamais le sorcier');
});
