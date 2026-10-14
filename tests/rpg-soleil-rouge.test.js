import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { choisirCibleAutoIA } from '../src/games/rpgAI.js';
import { RPG_SOLEIL_ROUGE_CARDS, RPG_SOLEIL_ROUGE_SET_ID } from '../src/games/rpgSoleilRouge.js';
import { RPG_DECKS, cardById, cardColors, cardReceivesResonance, cardArtId, rpgValiderDeck } from '../src/games/rpgCards.js';
import { COLLECTION_DEPART, carteDebloqueePar } from '../src/games/rpgCollection.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgBlesserCreature, rpgLancerMagie, rpgFinDeTour, rpgAttaquerCreature, rpgResonanceEnJeu, rpgBonusResonance, rpgLancerAttaque, rpgActionsEtat } from '../src/games/rpgDuel.js';

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

test('Soleil rouge : quinze cartes mono-Braise uniques, illustrées en 1024 × 1280 et collectionnables', () => {
  assert.equal(RPG_SOLEIL_ROUGE_CARDS.length, 15);
  const empreintes = new Set();
  for (const carte of RPG_SOLEIL_ROUGE_CARDS) {
    assert.equal(cardById(carte.id).set, RPG_SOLEIL_ROUGE_SET_ID);
    assert.deepEqual(cardColors(carte.id), ['braise']);
    assert.equal(cardArtId(carte.id), carte.id);
    assert.ok(COLLECTION_DEPART.includes(carte.id) || carteDebloqueePar(carte.id));
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
  assert.equal(empreintes.size, 15, 'une illustration dédiée par carte');
});

test('le deck Soleil rouge est valide et ne mélange pas les deux cultures de Braise', () => {
  const deck = RPG_DECKS.find((d) => d.id === RPG_SOLEIL_ROUGE_SET_ID);
  assert.equal(rpgValiderDeck(deck.cardIds).ok, true);
  assert.equal(deck.cardIds.filter((id) => cardById(id).kind === 'terrain').length, 16);
  assert.deepEqual(new Set(deck.cardIds.filter((id) => cardById(id).kind !== 'terrain')),
    new Set(RPG_SOLEIL_ROUGE_CARDS.filter((c) => c.kind !== 'terrain').map((c) => c.id)));
  const djinns = RPG_DECKS.find((d) => d.id === 'cour-des-djinns');
  assert.ok(djinns.cardIds.every((id) => cardById(id).set !== RPG_SOLEIL_ROUGE_SET_ID));
});

test('les dix créatures suivent Honneur par rareté, sans anciens effets dispersés', () => {
  const valeurs = { commune: 1, inhabituelle: 1, rare: 2, mythique: 3 };
  for (const carte of RPG_SOLEIL_ROUGE_CARDS.filter((c) => !['magie', 'terrain'].includes(c.kind))) {
    assert.equal(carte.honneur, carte.id === 'orochi' ? 0 : valeurs[carte.rarity], carte.id);
    if (carte.id === 'orochi') assert.doesNotMatch(carte.text, /Honneur/);
    else assert.match(carte.text, new RegExp(`Honneur ${carte.honneur}`));
    if (carte.id !== 'susanoo') assert.equal(carte.arrivee, undefined);
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
  const exclus = [
    jouer(duel, 'joueur', 'ashigaru-des-braises'),
    jouer(duel, 'joueur', 'ronin-du-soleil-rouge'),
    jouer(duel, 'joueur', 'onna-musha-des-cendres'),
    jouer(duel, 'sorcier', 'oni-de-la-fournaise'),
    jouer(duel, 'sorcier', 'chien-du-guet'),
  ];
  const neige = jouer(duel, 'joueur', 'loup-des-neiges');
  const tengu = jouer(duel, 'joueur', 'tengu-du-mont-ardent');
  assert.equal(rpgResonanceEnJeu(duel, 'samourai'), 3);
  assert.equal(rpgResonanceEnJeu(duel, 'braise'), 0);
  assert.deepEqual([ami.atk, ami.def], [5, 6]);
  assert.deepEqual([adverse.atk, adverse.def], [5, 6]);
  assert.equal(tengu.resonance, 0, 'le Tengu n’est pas de type Samouraï');
  for (const entite of exclus) assert.equal(entite.resonance, 0, entite.name);
  assert.equal(neige.resonance, 0);
  const kagutsuchi = jouer(duel, 'sorcier', 'kagutsuchi-flamme-originelle');
  assert.equal(rpgResonanceEnJeu(duel, 'samourai'), 4);
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
  assert.equal(carteDebloqueePar(carte.id).etageId, 'sables-3');
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
  assert.equal(carteDebloqueePar(carte.id).etageId, 'sables-3');
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
  assert.equal(carteDebloqueePar(carte.id).etageId, 'sables-3');
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
