import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { choisirCibleAutoIA } from '../src/games/rpgAI.js';
import { RPG_SOLEIL_ROUGE_CARDS, RPG_SOLEIL_ROUGE_SET_ID } from '../src/games/rpgSoleilRouge.js';
import { RPG_DECKS, cardById, cardColors, cardReceivesResonance, cardArtId, rpgValiderDeck } from '../src/games/rpgCards.js';
import { COLLECTION_DEPART, carteReveleePar } from '../src/games/rpgCollection.js';
import { RPG_STORY_DECKS } from '../src/games/rpgStoryTours.js';
import { rpgNouveauDuel, rpgJouerArme, rpgJouerCreature, rpgBlesserCreature, rpgLancerMagie, rpgFinDeTour, rpgAttaquerCreature, rpgAttaquerSorcier, rpgResonanceEnJeu, rpgBonusResonance, rpgLancerAttaque, rpgActionsEtat } from '../src/games/rpgDuel.js';

function duelTest(rng = () => 0.5) {
  const duel = rpgNouveauDuel({
    joueurDeck: Array(40).fill('montagne'), sorcierDeck: Array(40).fill('montagne'), rng,
  });
  for (const cote of ['joueur', 'sorcier']) {
    duel[cote].mana = { braise: 100, eau: 100, sable: 100, neige: 100 };
  }
  return duel;
}
function jouer(duel, cote, id) {
  duel[cote].main.push(id);
  const resultat = rpgJouerCreature(duel, cote, id);
  assert.equal(resultat.ok, true, id);
  return resultat.entite;
}
function sort(duel, id, cible) {
  duel.joueur.main.push(id);
  assert.equal(rpgLancerMagie(duel, 'joueur', id, cible).ok, true, id);
}

// Les trois samouraïs ajoutés (hatamoto, kenshi, daimyō) ne sont pas dans le deck préconstruit.
const SAMOURAIS_AJOUTES = ['hatamoto-des-cendres', 'kenshi-de-la-forge', 'daimyo-du-soleil-rouge'];

test('Soleil rouge : dix-huit cartes mono-Braise uniques, illustrées en 1024 × 1280 et collectionnables', () => {
  assert.equal(RPG_SOLEIL_ROUGE_CARDS.length, 18);
  const empreintes = new Set();
  for (const carte of RPG_SOLEIL_ROUGE_CARDS) {
    assert.equal(cardById(carte.id).set, RPG_SOLEIL_ROUGE_SET_ID);
    assert.deepEqual(cardColors(carte.id), ['braise']);
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
    assert.deepEqual(dimensions, [1024, 1280], carte.id);
  }
  assert.equal(empreintes.size, 18, 'une illustration dédiée par carte');
});

test('le deck Soleil rouge est valide et ne mélange pas les deux cultures de Braise', () => {
  const deck = RPG_DECKS.find((d) => d.id === RPG_SOLEIL_ROUGE_SET_ID);
  assert.equal(rpgValiderDeck(deck.cardIds).ok, true);
  assert.equal(deck.cardIds.filter((id) => cardById(id).kind === 'terrain').length, 16);
  assert.deepEqual(new Set(deck.cardIds.filter((id) => cardById(id).kind !== 'terrain')),
    new Set(RPG_SOLEIL_ROUGE_CARDS.filter((c) => c.kind !== 'terrain' && !SAMOURAIS_AJOUTES.includes(c.id)).map((c) => c.id)));
  for (const id of SAMOURAIS_AJOUTES) assert.equal(deck.cardIds.includes(id), false, id);
  const djinns = RPG_DECKS.find((d) => d.id === 'cour-des-djinns');
  assert.ok(djinns.cardIds.every((id) => cardById(id).set !== RPG_SOLEIL_ROUGE_SET_ID));
});

test('les préconstruits restent à l’écart des ajouts de puissance du set', () => {
  // Règle de design : les boîtiers de départ ne doivent pas être trop forts.
  // Les trois samouraïs ajoutés au set restent donc dehors, et le Daimyō comme
  // son jeton avec eux : le Daimyō ne vit nulle part dans les decks — il
  // s'obtient au Souk et se compose à l'atelier. La composition est recalculée
  // à chaque chargement : ce contrôle est ce qui empêche une carte de
  // « remonter » toute seule dans un boîtier le jour où sa valeur change.
  for (const deck of RPG_DECKS) {
    for (const id of SAMOURAIS_AJOUTES) {
      assert.equal(deck.cardIds.includes(id), false, `le boîtier ${deck.id} contient ${id}`);
    }
  }
  const listes = [
    ...RPG_DECKS.map((deck) => [`catalogue ${deck.id}`, deck.cardIds]),
    ...Object.entries(RPG_STORY_DECKS).map(([id, liste]) => [`Histoire ${id}`, liste]),
  ];
  for (const [nom, liste] of listes) {
    assert.equal(liste.includes('daimyo-du-soleil-rouge'), false, `${nom} contient le Daimyō`);
    assert.equal(liste.includes('samourai-du-daimyo'), false, `${nom} contient le jeton Samouraï`);
  }
  // Le boîtier du Soleil rouge garde exactement la signature du set : aucun des
  // ajouts n'a pris la place d'une Onna-musha ou d'un Tengu.
  const deck = RPG_DECKS.find((d) => d.id === RPG_SOLEIL_ROUGE_SET_ID);
  const compte = (id) => deck.cardIds.filter((candidat) => candidat === id).length;
  assert.deepEqual([
    compte('ashigaru-des-braises'), compte('ronin-du-soleil-rouge'), compte('samourai-du-torii'),
    compte('onna-musha-des-cendres'), compte('tengu-du-mont-ardent'), compte('cavalier-des-deux-sabres'),
    compte('kagutsuchi-flamme-originelle'), compte('orochi'), compte('susanoo'),
  ], [3, 3, 3, 1, 2, 1, 1, 1, 1]);
  // Le Kenshi reste, lui, au service de deux sorciers de la campagne (la
  // Souffleuse de verre et le Grand Horloger) : c'est le seul des ajouts à
  // sortir du Souk, et leurs plafonds de rares tiennent la rampe des Tours.
  assert.ok(Object.values(RPG_STORY_DECKS).filter((liste) => liste.includes('kenshi-de-la-forge')).length <= 2);
});

test('les dix créatures suivent Honneur par rareté, sans anciens effets dispersés', () => {
  const valeurs = { commune: 1, inhabituelle: 1, rare: 2, mythique: 3 };
  for (const carte of RPG_SOLEIL_ROUGE_CARDS.filter((c) => !['magie', 'terrain'].includes(c.kind))) {
    assert.equal(carte.honneur, carte.id === 'orochi' ? 0 : valeurs[carte.rarity], carte.id);
    if (carte.id === 'orochi') assert.doesNotMatch(carte.text, /Honneur/);
    else assert.match(carte.text, new RegExp(`Honneur ${carte.honneur}`));
    // Deux arrivées dans le set : l'exil de Susanoo et les deux Samouraïs du
    // Daimyō. La bannière du Daimyō est un déclenché d'attaque, pas un des
    // « anciens effets dispersés » que le set a retirés (ni combat, ni esquive).
    if (!['susanoo', 'daimyo-du-soleil-rouge'].includes(carte.id)) assert.equal(carte.arrivee, undefined);
    if (carte.id !== 'orochi') assert.equal(carte.destruction, undefined);
    assert.equal(carte.combat, undefined);
    assert.equal(carte.esquive, undefined);
  }
  assert.equal(cardById('tengu-du-mont-ardent').resonance, 1);
  assert.equal(cardById('kagutsuchi-flamme-originelle').resonance, 1);
});

test('le rōnin garde Rapidité et le tengu combine Envol et Résonance', () => {
  const duel = duelTest();
  assert.equal(jouer(duel, 'joueur', 'ronin-du-soleil-rouge').ready, true);
  const avant = duel.joueur.main.length;
  const tengu = jouer(duel, 'joueur', 'tengu-du-mont-ardent');
  assert.equal(tengu.envol, true);
  assert.equal(duel.joueur.main.length, avant, 'aucune pioche à l’arrivée');
  assert.deepEqual([tengu.atk, tengu.def], [4, 2]);
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
  assert.deepEqual([ami.atk, ami.def], [5, 6]);
  assert.deepEqual([adverse.atk, adverse.def], [5, 6]);
  assert.equal(tengu.resonance, 0, 'le Tengu n’est pas de type Samouraï');
  for (const entite of exclus) assert.equal(entite.resonance, 0, entite.name);
  assert.equal(neige.resonance, 0);
  const kagutsuchi = jouer(duel, 'sorcier', 'kagutsuchi-flamme-originelle');
  assert.equal(rpgResonanceEnJeu(duel, 'samourai'), 4);
  for (const entite of samourais) assert.equal(entite.resonance, 4, entite.name);
  assert.deepEqual([ami.atk, ami.def], [6, 7]);
  assert.deepEqual([adverse.atk, adverse.def], [6, 7]);
  assert.equal(kagutsuchi.resonance, 0, 'le Kami n’est pas de type Samouraï');
  jouer(duel, 'joueur', 'valkyrie-au-corbeau');
  assert.equal(rpgResonanceEnJeu(duel), 1, 'l’API sans élément conserve la Neige');
  assert.equal(neige.resonance, 1);
  assert.equal(ami.resonance, 4);
  for (const entite of exclus) assert.equal(entite.resonance, 0, entite.name);
  assert.equal(rpgBonusResonance(duel, { kind: 'creature', element: 'neige', typeLine: 'Créature — Samouraï' }), 5, 'Neige et tribu se cumulent indépendamment');
  assert.ok(duel.log.some((ligne) => ligne.startsWith('La Résonance samouraï')));
  assert.ok(!duel.log.some((ligne) => ligne.startsWith('La Résonance renforce la Braise')));
});

test('la Résonance samouraï suit le sous-type imprimé, pas le nom ni la couleur', () => {
  assert.equal(cardReceivesResonance({ kind: 'creature', element: 'eau', typeLine: 'Créature — Humain · Samouraï' }, 'samourai'), true);
  assert.equal(cardReceivesResonance({ kind: 'creature', element: 'braise', name: 'Samouraï imaginaire', typeLine: 'Créature — Oni' }, 'samourai'), false);
  assert.equal(cardReceivesResonance({ kind: 'magie', element: 'braise', typeLine: 'Sorcellerie — Samouraï' }, 'samourai'), false);
  for (const id of ['samourai-du-torii', 'tengu-du-mont-ardent', 'kagutsuchi-flamme-originelle']) {
    assert.equal(cardById(id).resonanceTribu, 'samourai');
    assert.match(cardById(id).text, /Résonance samouraï/);
    assert.match(cardById(id).text, /type Samouraï/);
  }
});

test('le renvoi d’une source retire sa Résonance, sans déclencher Honneur', () => {
  const duel = duelTest();
  const ami = jouer(duel, 'joueur', 'samourai-du-torii');
  const source = jouer(duel, 'sorcier', 'tengu-du-mont-ardent');
  const cible = jouer(duel, 'sorcier', 'chien-du-guet');
  sort(duel, 'ressac', source.id);
  assert.equal(rpgResonanceEnJeu(duel, 'samourai'), 1);
  assert.deepEqual([ami.atk, ami.def], [3, 4]);
  assert.equal(cible.def, 2);
  assert.ok(duel.sorcier.main.includes('tengu-du-mont-ardent'));
  assert.ok(!duel.log.some((ligne) => ligne.startsWith('Honneur')));
});

test('Honneur tire au hasard parmi tous les adversaires vivants, jamais les alliés', () => {
  for (const [rng, attendu] of [[() => 0, 0], [() => 0.5, 1], [() => 0.99, 2]]) {
    const duel = duelTest(rng);
    const honneur = jouer(duel, 'joueur', 'ashigaru-des-braises');
    const allie = jouer(duel, 'joueur', 'chien-du-guet');
    const cibles = Array.from({ length: 3 }, () => jouer(duel, 'sorcier', 'drakkar-a-tete-de-dragon'));
    rpgBlesserCreature(duel, 'joueur', honneur.id, 10, 'eau');
    assert.deepEqual(cibles.map((c) => c.def), [0, 1, 2].map((i) => i === attendu ? 5 : 6));
    assert.equal(allie.def, 2);
    assert.equal(duel.sorcier.pv, 25);
    assert.equal(duel.log.filter((ligne) => ligne.startsWith('Honneur')).length, 1);
  }
});

test('Honneur inflige 1, 2 ou 3 dégâts selon la rareté et fonctionne dans les deux camps', () => {
  for (const [id, montant] of [['ashigaru-des-braises', 1], ['ronin-du-soleil-rouge', 1], ['samourai-du-torii', 2], ['oni-de-la-fournaise', 3]]) {
    for (const cote of ['joueur', 'sorcier']) {
      const duel = duelTest();
      const adverse = cote === 'joueur' ? 'sorcier' : 'joueur';
      const mort = jouer(duel, cote, id);
      const cible = jouer(duel, adverse, 'colosse-de-sel');
      rpgBlesserCreature(duel, cote, mort.id, 20, 'eau');
      assert.equal(cible.def, 5 - montant, `${cote} ${id}`);
    }
  }
});

test('sans créature adverse, Honneur ne touche jamais le sorcier', () => {
  const duel = duelTest();
  const oni = jouer(duel, 'joueur', 'oni-de-la-fournaise');
  rpgBlesserCreature(duel, 'joueur', oni.id, 20, 'eau');
  assert.equal(duel.sorcier.pv, 25);
  assert.match(duel.log.at(-1), /aucune créature adverse/);
});

test('les dégâts d’Honneur respectent bouclier et protection, mais pas Esquive', () => {
  const duel = duelTest();
  const mort = jouer(duel, 'joueur', 'samourai-du-torii');
  const protege = jouer(duel, 'sorcier', 'amayas-du-hoggar');
  rpgBlesserCreature(duel, 'joueur', mort.id, 20, 'eau');
  assert.equal(protege.def, 2, 'protection contre la Braise');
  const autre = duelTest();
  const mort2 = jouer(autre, 'joueur', 'samourai-du-torii');
  const cible = jouer(autre, 'sorcier', 'colosse-de-sel');
  cible.bouclier = 1;
  cible.esquive = 3;
  rpgBlesserCreature(autre, 'joueur', mort2.id, 20, 'eau');
  assert.equal(cible.bouclier, 0);
  assert.equal(cible.def, 4, 'capacité : Esquive n’intervient pas');
});

test('Honneur peut provoquer une chaîne de morts sans se déclencher deux fois', () => {
  const duel = duelTest();
  const premier = jouer(duel, 'joueur', 'samourai-du-torii');
  jouer(duel, 'sorcier', 'ashigaru-des-braises');
  jouer(duel, 'joueur', 'ashigaru-des-braises');
  rpgBlesserCreature(duel, 'joueur', premier.id, 20, 'eau');
  assert.equal(duel.joueur.creatures.length, 0);
  assert.equal(duel.sorcier.creatures.length, 0);
  assert.equal(duel.log.filter((ligne) => ligne.startsWith('Honneur')).length, 3);
  rpgActionsEtat(duel);
  assert.equal(duel.log.filter((ligne) => ligne.startsWith('Honneur')).length, 3);
});

test('les victimes simultanées sont retirées avant les tirages d’Honneur', () => {
  const duel = duelTest(() => 0);
  const attaquant = jouer(duel, 'joueur', 'ashigaru-des-braises');
  const bloqueur = jouer(duel, 'sorcier', 'ashigaru-des-braises');
  const survivant = jouer(duel, 'sorcier', 'drakkar-a-tete-de-dragon');
  attaquant.ready = true;
  assert.equal(rpgLancerAttaque(duel, 'joueur', [attaquant.id], { [attaquant.id]: bloqueur.id }).ok, true);
  assert.equal(survivant.def, 5);
  assert.equal(duel.joueur.creatures.length, 0);
  assert.deepEqual(duel.sorcier.creatures.map((c) => c.id), [survivant.id]);
});

test('la mort d’une source retire la Résonance avant sa frappe d’Honneur', () => {
  const duel = duelTest();
  const ami = jouer(duel, 'joueur', 'samourai-du-torii');
  const tengu = jouer(duel, 'joueur', 'tengu-du-mont-ardent');
  const cible = jouer(duel, 'sorcier', 'colosse-de-sel');
  rpgBlesserCreature(duel, 'joueur', tengu.id, 20, 'eau');
  assert.equal(rpgResonanceEnJeu(duel, 'samourai'), 1);
  assert.deepEqual([ami.atk, ami.def], [3, 4]);
  assert.equal(cible.def, 3);
});

test('l’iaijutsu détruit sa cible et le serment expire à la fin du tour', () => {
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

test('les feux de kitsune infligent 2 dégâts puis 1 au début du prochain tour du lanceur', () => {
  const carte = cardById('feux-de-kitsune');
  assert.equal(carte.effet.amount, 2);
  assert.deepEqual(carte.effet.echo, { amount: 1, tours: 1 });
  assert.match(carte.text, /Inflige 2 dégâts/);
  const duel = duelTest();
  const allie = jouer(duel, 'joueur', 'chien-du-guet');
  const cible = jouer(duel, 'sorcier', 'porteuse-de-cruches');
  const fragile = jouer(duel, 'sorcier', 'chien-du-guet');
  const vieJoueur = duel.joueur.pv;
  const vieSorcier = duel.sorcier.pv;
  sort(duel, 'feux-de-kitsune');
  assert.equal(cible.def, 1, 'la première vague inflige 2 dégâts');
  assert.ok(!duel.sorcier.creatures.includes(fragile), 'la première vague tue une créature à 2 de défense');
  assert.equal(allie.def, 2, 'les alliés sont épargnés');
  rpgFinDeTour(duel);
  assert.equal(duel.sorcier.creatures.length, 1);
  assert.equal(cible.def, 1, 'aucun écho pendant le tour adverse');
  rpgFinDeTour(duel);
  assert.equal(duel.sorcier.creatures.length, 0, 'la seconde vague inflige 1 dégât');
  assert.equal(allie.def, 2);
  assert.equal(duel.joueur.pv, vieJoueur);
  assert.equal(duel.sorcier.pv, vieSorcier);
});


test('les quinze illustrations du set et leurs refontes ont une version de cache', () => {
  const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  for (const carte of RPG_SOLEIL_ROUGE_CARDS) {
    const versionsSpecifiques = {
      'susanoo': 'susanoo-kaiga-couleurs-v1',
      'orochi': 'orochi-kaiga-vert-rouge-v2',
      'feux-de-kitsune': 'kitsune-kaiga-couleurs-v4',
      'cavalier-des-deux-sabres': 'cavalier-deux-sabres-kaiga-champ-ble-v2',
      'sabre-maudit': 'sabre-maudit-kaiga-palais-v1',
      'montagne-du-soleil-rouge': 'montagne-kaiga-soleil-rouge-v1',
      'frappe-iaijutsu': 'iaijutsu-kaiga-couleurs-sans-jambes-v10',
    };
    const version = versionsSpecifiques[carte.id] ?? 'soleil-rouge-kaiga-couleurs-v7';
    assert.ok(page.includes(`'${carte.id}': '${version}'`), carte.id);
  }
});

test('une carte contrecarrée ne déclenche pas Honneur', () => {
  const duel = duelTest();
  const cible = jouer(duel, 'joueur', 'chien-du-guet');
  duel.annonce = { cote: 'sorcier', carteId: 'samourai-du-torii' };
  duel.sorcier.main.push('samourai-du-torii');
  duel.joueur.main.push('contresort-des-abimes');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'contresort-des-abimes').ok, true);
  assert.equal(cible.def, 2);
  assert.ok(duel.sorcier.cimetiere.includes('samourai-du-torii'));
  assert.ok(!duel.log.some((ligne) => ligne.startsWith('Honneur')));
});

test('les actions d’état déclenchent Honneur une seule fois pour une créature morte', () => {
  const duel = duelTest();
  const mort = jouer(duel, 'joueur', 'samourai-du-torii');
  const cible = jouer(duel, 'sorcier', 'colosse-de-sel');
  mort.pv = 0;
  mort.def = 0;
  assert.equal(rpgActionsEtat(duel), 1);
  assert.equal(cible.def, 3);
  assert.equal(rpgActionsEtat(duel), 0);
  assert.equal(duel.joueur.cimetiere.filter((id) => id === 'samourai-du-torii').length, 1);
});

test('Honneur fonctionne aussi après un aller-retour JSON de la partie', () => {
  let duel = duelTest();
  const mort = jouer(duel, 'joueur', 'oni-de-la-fournaise');
  const cible = jouer(duel, 'sorcier', 'colosse-de-sel');
  duel = JSON.parse(JSON.stringify(duel));
  rpgBlesserCreature(duel, 'joueur', mort.id, 20, 'eau');
  assert.equal(duel.sorcier.creatures.find((c) => c.id === cible.id).def, 2);
});


test('le Cavalier des deux sabres est mythique, rapide, samouraï et porte Honneur 3', () => {
  const carte = cardById('cavalier-des-deux-sabres');
  assert.equal(carte.rarity, 'mythique');
  assert.equal(carte.honneur, 3);
  assert.equal(carte.rapidite, true);
  assert.equal(cardReceivesResonance(carte, 'samourai'), true);
  assert.deepEqual([carte.cost, carte.atk, carte.def], [6, 5, 4]);
  const deck = RPG_DECKS.find((d) => d.id === RPG_SOLEIL_ROUGE_SET_ID);
  assert.equal(deck.cardIds.filter((id) => id === carte.id).length, 1);
  assert.equal(carteReveleePar(carte.id).etageId, 'sables-3');
  const duel = duelTest();
  jouer(duel, 'joueur', 'tengu-du-mont-ardent');
  const cavalier = jouer(duel, 'joueur', carte.id);
  assert.equal(cavalier.ready, true);
  assert.deepEqual([cavalier.atk, cavalier.def], [6, 5]);
  const cible = jouer(duel, 'sorcier', 'colosse-de-sel');
  rpgBlesserCreature(duel, 'joueur', cavalier.id, 20, 'eau');
  assert.equal(cible.def, 2, 'Honneur 3 à la mort');
});


test('le Samouraï du torii donne Résonance samouraï, se renforce et retire son bonus en quittant le jeu', () => {
  const carte = cardById('samourai-du-torii');
  assert.deepEqual([carte.cost, carte.atk, carte.def, carte.honneur], [3, 2, 3, 2]);
  assert.equal(carte.resonance, 1);
  const duel = duelTest();
  const cavalier = jouer(duel, 'joueur', 'cavalier-des-deux-sabres');
  const source = jouer(duel, 'sorcier', carte.id);
  assert.deepEqual([source.atk, source.def], [3, 4]);
  assert.deepEqual([cavalier.atk, cavalier.def], [6, 5]);
  sort(duel, 'ressac', source.id);
  assert.equal(rpgResonanceEnJeu(duel, 'samourai'), 0);
  assert.deepEqual([cavalier.atk, cavalier.def], [5, 4]);
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
    const cible = jouer(duel, adverse, 'colosse-de-sel');
    const defenseAvant = cible.def;
    const orochi = jouer(duel, cote, 'orochi');
    assert.equal(orochi.honneur, 0);
    rpgBlesserCreature(duel, cote, orochi.id, 8, 'eau');
    assert.equal(cible.def, defenseAvant, 'Orochi ne déclenche plus Honneur');
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
  const deck = RPG_DECKS.find((d) => d.id === RPG_SOLEIL_ROUGE_SET_ID);
  assert.equal(deck.cardIds.filter((id) => id === 'orochi').length, 1);
  assert.ok(!deck.cardIds.includes('petit-orochi'));
});

test('Susanoo est dans le deck : 6/3 pour 5, Honneur 3 et exil à l’arrivée', () => {
  const carte = cardById('susanoo');
  assert.deepEqual([carte.cost, carte.atk, carte.def, carte.honneur], [5, 6, 3, 3]);
  const deck = RPG_DECKS.find((d) => d.id === RPG_SOLEIL_ROUGE_SET_ID);
  assert.equal(deck.cardIds.length, 40);
  assert.equal(deck.cardIds.filter((id) => id === carte.id).length, 1);
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
    assert.equal(duel.joueur.mana.braise, mana - 5);
    assert.ok(!duel[coteCible].creatures.some((e) => e.id === cible.id));
    assert.deepEqual(duel[coteCible].exil, ['orochi']);
    assert.ok(!duel[coteCible].cimetiere.includes('orochi'));
    assert.ok(!duel[coteCible].main.includes('orochi'));
    assert.ok(!duel[coteCible].creatures.some((e) => e.carteId === 'petit-orochi'), 'exiler ne déclenche pas la mort');
  }
});

test('Susanoo respecte la protection et peut être joué sans cible sur une table vide', () => {
  const duel = duelTest();
  const protege = jouer(duel, 'sorcier', 'chien-du-guet');
  protege.protection = { contre: 'braise', toursRestants: 2 };
  duel.joueur.main.push('susanoo');
  assert.equal(rpgJouerCreature(duel, 'joueur', 'susanoo', protege.id).raison, 'protection');
  assert.equal(rpgJouerCreature(duel, 'joueur', 'susanoo', 'inexistante').raison, 'cible');
  const vide = duelTest();
  const susanoo = jouer(vide, 'joueur', 'susanoo');
  const cible = jouer(vide, 'sorcier', 'colosse-de-sel');
  rpgBlesserCreature(vide, 'joueur', susanoo.id, 3, 'eau');
  assert.equal(cible.def, 2, 'Honneur 3 fonctionne à la mort de Susanoo');
});

test('l’IA choisit une cible à exiler et l’exil retire les auras sans déclencher Honneur', () => {
  const duel = duelTest();
  const source = jouer(duel, 'joueur', 'samourai-du-torii');
  const cavalier = jouer(duel, 'sorcier', 'cavalier-des-deux-sabres');
  assert.equal(cavalier.atk, 6);
  assert.equal(choisirCibleAutoIA(duel, 'sorcier', cardById('susanoo')), source.id);
  duel.sorcier.main.push('susanoo');
  assert.equal(rpgJouerCreature(duel, 'sorcier', 'susanoo', source.id).ok, true);
  assert.deepEqual([cavalier.atk, cavalier.def], [5, 4]);
  assert.ok(!duel.log.some((ligne) => ligne.startsWith('Honneur')));
});


test('le Daimyō du Soleil rouge est un 3/3 à 5 qui lève deux Samouraïs 1/1 en arrivant', () => {
  const carte = cardById('daimyo-du-soleil-rouge');
  assert.deepEqual([carte.cost, carte.atk, carte.def, carte.rarity, carte.honneur], [5, 3, 3, 'rare', 2]);
  assert.deepEqual(carte.arrivee, { type: 'jetons', jeton: 'samourai-du-daimyo', nombre: 2 });
  assert.deepEqual(carte.banniere, { tribu: 'samourai', atk: 1, def: 1 });
  assert.match(carte.text, /deux créatures-jetons « Samouraï » 1\/1/);
  assert.match(carte.text, /chaque fois qu’un Samouraï de votre camp attaque, ce Samouraï gagne \+1\/\+1/);

  // Le jeton : une créature-jeton déclarée hors du catalogue du duel — jamais
  // dans un deck, jamais dans la dotation de départ, jamais collectionnable.
  const jeton = cardById('samourai-du-daimyo');
  assert.equal(jeton.jeton, true);
  assert.deepEqual([jeton.cost, jeton.atk, jeton.def, jeton.element], [0, 1, 1, 'braise']);
  assert.equal(jeton.honneur, undefined, 'un jeton ne porte pas d’Honneur');
  assert.match(jeton.typeLine, /Créature-jeton — Humain · Samouraï/);
  assert.equal(cardReceivesResonance(jeton, 'samourai'), true, 'le jeton est un Samouraï');
  assert.equal(COLLECTION_DEPART.includes('samourai-du-daimyo'), false);
  const deck = RPG_DECKS.find((d) => d.id === RPG_SOLEIL_ROUGE_SET_ID);
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
  assert.deepEqual(dimensions, [1024, 1280]);
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
    assert.deepEqual([daimyo.atk, daimyo.def, daimyo.pv, daimyo.pvMax], [3, 3, 3, 3]);
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
  assert.deepEqual([daimyo.atk, daimyo.def], [4, 4]);
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
  assert.deepEqual([torii.atk, torii.def], [3, 4]);
  assert.deepEqual([daimyo.atk, daimyo.def], [4, 4]);
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
  // Un 4/4 neutre : ni Samouraï (la bannière du camp d’en face ne le touche
  // pas), ni Honneur — il meurt à 4 dégâts, il survivrait à 3.
  const bloqueur = jouer(duel, 'sorcier', 'jarl-au-marteau-de-guerre');
  assert.deepEqual([bloqueur.atk, bloqueur.def], [4, 4]);
  const pvSorcier = duel.sorcier.pv;
  const res = rpgLancerAttaque(duel, 'joueur', [ronin.id], { [ronin.id]: [bloqueur.id] });
  assert.equal(res.ok, true);
  assert.equal(res.resume.repartitions[ronin.id][bloqueur.id], 4, 'la bannière compte dans le partage');
  assert.equal(duel.sorcier.creatures.some((entite) => entite.id === bloqueur.id), false,
    '4 dégâts sur une 4/4 : le bloqueur tombe, là où 3 ne l’auraient pas tué');
  assert.equal(duel.sorcier.pv, pvSorcier, 'l’attaque était bloquée : aucun dégât direct');
  assert.equal(duel.joueur.creatures.some((entite) => entite.id === ronin.id), false,
    'le rōnin encaisse 4 : il tombe, sa bannière ne l’a pas sauvé');
});

test('une répartition refusée ne laisse pas la bannière derrière elle', () => {
  const duel = duelTest();
  jouer(duel, 'joueur', 'daimyo-du-soleil-rouge');
  const ronin = jouer(duel, 'joueur', 'ronin-du-soleil-rouge');
  // Deux 2/5 neutres : 2 dégâts chacun ne les tue pas.
  const premier = jouer(duel, 'sorcier', 'dune-marchante');
  const second = jouer(duel, 'sorcier', 'dune-marchante');
  assert.deepEqual([premier.atk, premier.def], [2, 5]);
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
  assert.equal(duel.sorcier.creatures.length, 2, '2 dégâts sur des 2/5 : les deux bloqueurs survivent');
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
  assert.deepEqual([daimyo.atk, daimyo.def], [4, 4]);
});

test('le Kenshi de la forge est un 1/3 à 3 qui forge les autres Samouraïs', () => {
  const carte = cardById('kenshi-de-la-forge');
  assert.deepEqual([carte.cost, carte.atk, carte.def, carte.rarity, carte.honneur], [3, 1, 3, 'rare', 2]);
  assert.match(carte.typeLine, /Samouraï/);
  assert.deepEqual(carte.aura, { type: 'buff-tribu', tribu: 'samourai', atk: 2, def: 0, saufSoi: true, camps: 'tous' });
  assert.match(carte.text, /les autres créatures de type Samouraï de la table, dans les deux camps, gagnent \+2\/\+0/);
  assert.ok(!carte.arrivee && !carte.destruction && !carte.resonance, 'l’aura est son seul texte de règle');

  // L'aura est de table : les deux camps, comme la Résonance samouraï.
  const duel = duelTest();
  const kenshi = jouer(duel, 'joueur', 'kenshi-de-la-forge');
  const torii = jouer(duel, 'joueur', 'samourai-du-torii');
  const adverse = jouer(duel, 'sorcier', 'ronin-du-soleil-rouge');
  const nonSamourai = jouer(duel, 'joueur', 'chien-du-guet');
  // Le Tengu est un yōkai, pas un Samouraï : il ne reçoit rien — mais il porte
  // la Résonance samouraï, donc il compte comme source pour les autres.
  const yokai = jouer(duel, 'joueur', 'tengu-du-mont-ardent');
  assert.equal(rpgResonanceEnJeu(duel, 'samourai'), 2, 'le Torii et le Tengu');
  assert.deepEqual([kenshi.atk, kenshi.def], [3, 5],
    'le Kenshi reçoit la Résonance mais pas sa propre forge');
  // Le Torii : 2/3 d’imprimé, +2/+2 des deux Résonances, +2/+0 de la forge.
  assert.deepEqual([torii.atk, torii.def], [6, 5]);
  // Le rōnin adverse : 3/2, +2/+2 de Résonance et +2/+0 de forge — ni la
  // Résonance ni la forge ne connaissent les camps.
  assert.deepEqual([adverse.atk, adverse.def], [7, 4]);
  assert.deepEqual([nonSamourai.atk, nonSamourai.def], [2, 2], 'un Chien n’est pas un Samouraï');
  assert.deepEqual([yokai.atk, yokai.def], [4, 2], 'un Tengu n’est pas un Samouraï');
  assert.ok(duel.log.some((ligne) => ligne.startsWith('La Résonance samouraï')));
});

test('la forge compte par source, se retire à l’exil et ne touche jamais la défense', () => {
  const duel = duelTest();
  const premier = jouer(duel, 'joueur', 'kenshi-de-la-forge');
  const ronin = jouer(duel, 'joueur', 'ronin-du-soleil-rouge');
  const onna = jouer(duel, 'sorcier', 'onna-musha-des-cendres');
  assert.deepEqual([ronin.atk, ronin.def], [5, 2]);
  assert.deepEqual([onna.atk, onna.def], [5, 3]);
  // Un second Kenshi : chaque Samouraï en reçoit +2/+0 de plus, mais les deux
  // Kenshis ne se donnent que l’un à l’autre (+2/+0 chacun, jamais +4).
  const second = jouer(duel, 'sorcier', 'kenshi-de-la-forge');
  assert.deepEqual([ronin.atk, ronin.def], [7, 2], 'le rōnin cumule les deux forges');
  assert.deepEqual([onna.atk, onna.def], [7, 3]);
  assert.deepEqual([premier.atk, premier.def], [3, 3], 'chaque Kenshi ne reçoit que l’autre');
  assert.deepEqual([second.atk, second.def], [3, 3]);
  // On retire les sources par l'exil de Susanoo : l'exil n'est pas une mort,
  // ni Honneur, ni capacité de destruction ne se déclenchent — là où une
  // blessure ferait frapper l'Honneur 2 du Kenshi et brouillerait la mesure.
  const exiler = (cibleId) => {
    duel.joueur.main.push('susanoo');
    assert.equal(rpgJouerCreature(duel, 'joueur', 'susanoo', cibleId).ok, true);
  };
  exiler(premier.id);
  assert.deepEqual([ronin.atk, ronin.def, ronin.pv], [5, 2, 2], 'la forge de l’absent est retirée');
  assert.deepEqual([onna.atk, onna.def], [5, 3]);
  assert.deepEqual([second.atk, second.def], [1, 3], 'le dernier Kenshi retombe à 1/3');
  // Plus de forge du tout : les Samouraïs reviennent à leur force imprimée.
  exiler(second.id);
  assert.deepEqual([ronin.atk, ronin.def, ronin.pv], [3, 2, 2]);
  assert.deepEqual([onna.atk, onna.def], [3, 3]);
  // La défense n’a jamais bougé d’un point : perdre la forge ne peut pas tuer.
  assert.ok(!duel.log.some((ligne) => ligne.startsWith('Honneur')));
});

test('la forge, la Résonance samouraï et la bannière se cumulent sans dériver', () => {
  const duel = duelTest();
  const kenshi = jouer(duel, 'joueur', 'kenshi-de-la-forge');
  const torii = jouer(duel, 'joueur', 'samourai-du-torii');
  const daimyo = jouer(duel, 'joueur', 'daimyo-du-soleil-rouge');
  const jeton = duel.joueur.creatures.find((entite) => entite.carteId === 'samourai-du-daimyo');
  // Deux sources de Résonance (le Torii, et le Tengu s’il était là) : ici une
  // seule, donc +1/+1 ; la forge ajoute +2/+0 à tout le monde sauf au Kenshi,
  // et la bannière attend l’attaque.
  assert.equal(rpgResonanceEnJeu(duel, 'samourai'), 1);
  assert.deepEqual([kenshi.atk, kenshi.def], [2, 4], 'le Kenshi reçoit la Résonance, pas sa forge');
  assert.deepEqual([torii.atk, torii.def], [5, 4]);
  assert.deepEqual([daimyo.atk, daimyo.def], [6, 4]);
  assert.deepEqual([jeton.atk, jeton.def], [4, 2]);
  // La table bouge encore (le jeton grandit à l’attaque) : la forge ne dérive pas.
  jeton.ready = true;
  assert.equal(rpgLancerAttaque(duel, 'joueur', [jeton.id], { [jeton.id]: [] }).ok, true);
  assert.deepEqual([jeton.atk, jeton.def], [5, 3], 'bannière +1/+1 sur la forge et la Résonance');
  assert.deepEqual([torii.atk, torii.def], [5, 4], 'les autres n’ont pas bougé');
  assert.deepEqual([daimyo.atk, daimyo.def], [6, 4]);
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
  const porteur = jouer(duel, 'sorcier', 'chien-du-guet');
  duel.sorcier.main.push('takouba-des-pistes');
  assert.equal(rpgJouerArme(duel, 'sorcier', 'takouba-des-pistes', porteur.id).ok, true);
  duel.joueur.main.push('susanoo');
  assert.equal(rpgJouerCreature(duel, 'joueur', 'susanoo', porteur.id).ok, true);
  assert.deepEqual(duel.sorcier.exil, ['chien-du-guet']);
  assert.ok(duel.sorcier.cimetiere.includes('takouba-des-pistes'));
  assert.ok(!duel.sorcier.cimetiere.includes('chien-du-guet'));
});
