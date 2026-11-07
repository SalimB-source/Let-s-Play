import test from 'node:test';
import assert from 'node:assert/strict';
import { choisirCouleurManaIA, choisirDefausseIA, choisirMulliganIA } from '../src/games/rpgAI.js';
import { rpgChoisirCouleurMana } from '../src/games/rpgDuel.js';
import { MOBA_DECKS, rpgMobaCreerPartie, rpgMobaResoudreRecherche, rpgMobaMulligan, rpgMobaJouerCreature, rpgMobaResoudreArrivee, rpgMobaLancerMagie, rpgMobaDeclarerAttaque, rpgMobaLancerAttaque, rpgMobaTerminerTour, rpgMobaDefausser, rpgMobaPasserFinDeTour, rpgMobaPasserEffetCreature, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirRechercheIA, rpgMobaChoisirCreatureIA, rpgMobaChoisirMagieIA, rpgMobaChoisirArriveeIA, rpgMobaChoisirAttaquantsIA, rpgMobaChoisirCiblesAttaqueIA, rpgMobaChoisirBlocagesIA } from '../src/games/rpgMobaAI.js';

const ok = (result) => assert.equal(result.ok, true, JSON.stringify(result));

test('AI decisions finish complete games with both seats, legal lane blocks and real decks', () => {
  const edited = { ...MOBA_DECKS[1], cardIds: [...MOBA_DECKS[1].cardIds] };
  for (const [from, to] of [['viking-des-neiges', 'veilleuse-des-citernes'], ['ashigaru-des-braises', 'djinn-de-la-flamme-mourante'], ['loup-des-neiges', 'scalde-des-runes'], ['berserk-des-trois-hivers', 'valkyrie-au-corbeau'], ['gardien-viking-du-fjord', 'drakkar-a-tete-de-dragon'], ['gardien-viking-du-fjord', 'volva-soigneuse'], ['porteuse-de-cruches', 'vipere-de-verre'], ['festin-des-vaillants', 'sonneur-fele'], ['hurlement-du-blizzard', 'geant-des-banquises'], ['eclair-du-marteau', 'feriel'], ['trait-de-braise', 'djinn-de-la-fleche-ardente']]) {
    edited.cardIds[edited.cardIds.indexOf(from)] = to;
  }
  const editedNew = { ...MOBA_DECKS[0], cardIds: [...MOBA_DECKS[0].cardIds] };
  for (const [from, to] of [['ashigaru-des-braises', 'gardien-de-la-porte-ardente'], ['gardienne-des-portes-de-sable', 'rempart-des-sables-eternels'], ['loup-des-neiges', 'serpent-du-monde'], ['jarl-au-marteau-de-guerre', 'ifrit-al-ahmar'], ['berserk-des-trois-hivers', 'tin-hinan'], ['trait-de-braise', 'serment-de-la-forge'], ['verglas', 'embuscade'], ['poigne-de-givre', 'appat-de-la-meute'], ['mousse-des-galiotes', 'fennec-des-decombres'], ['gardienne-des-portes-de-sable', 'chien-du-guet']]) {
    editedNew.cardIds[editedNew.cardIds.indexOf(from)] = to;
  }
  const editedDiscard = { ...MOBA_DECKS[4], cardIds: [...MOBA_DECKS[4].cardIds] };
  for (const [from, to] of [['papyrus', 'nom-efface'], ['viking-des-neiges', 'ibis-des-comptes'], ['gardien-viking-du-fjord', 'celle-qui-pese'], ['jarl-au-marteau-de-guerre', 'pere-des-corbeaux'], ['berserk-des-trois-hivers', 'valkyrie-des-neuf-nuits'], ['grand-hiver', 'la-devoreuse']]) {
    editedDiscard.cardIds[editedDiscard.cardIds.indexOf(from)] = to;
  }
  const editedSearch = { ...MOBA_DECKS[0], cardIds: [...MOBA_DECKS[0].cardIds] };
  for (const [from, to] of [['gardienne-des-portes-de-sable', 'tiziri-du-djurdjura'], ['mousse-des-galiotes', 'fennec-des-decombres']]) editedSearch.cardIds[editedSearch.cardIds.indexOf(from)] = to;
  const editedHarakiri = { ...MOBA_DECKS[0], cardIds: [...MOBA_DECKS[0].cardIds] };
  for (const [from, to] of [['ashigaru-des-braises', 'ronin-du-soleil-rouge'], ['ashigaru-des-braises', 'hatamoto-des-cendres'], ['jarl-au-marteau-de-guerre', 'samourai-du-torii'], ['jarl-au-marteau-de-guerre', 'tengu-du-mont-ardent'], ['mousse-des-galiotes', 'amani-des-ksour'], ['loup-des-neiges', 'kenshi-de-la-forge'], ['tempete-de-foudre-et-de-givre', 'susanoo']]) editedHarakiri.cardIds[editedHarakiri.cardIds.indexOf(from)] = to;
  const editedTransfer = { ...MOBA_DECKS[4], cardIds: [...MOBA_DECKS[4].cardIds] };
  for (const [from, to] of [['ashigaru-des-braises', 'chacal-du-seuil'], ['ashigaru-des-braises', 'pretre-de-la-bouche'], ['papyrus', 'le-poids'], ['papyrus', 'la-grande-pesee'], ['viking-des-neiges', 'berserk-du-crepuscule'], ['jarl-au-marteau-de-guerre', 'celui-qui-juge'], ['loup-des-neiges', 'ouvrier-du-natron'], ['brume-du-fjord', 'offrande-de-lin']]) editedTransfer.cardIds[editedTransfer.cardIds.indexOf(from)] = to;
  const editedTokens = { ...MOBA_DECKS[0], cardIds: [...MOBA_DECKS[0].cardIds] };
  for (const [from, to] of [['jarl-au-marteau-de-guerre', 'tarek'], ['viking-des-neiges', 'daimyo-du-soleil-rouge'], ['grand-hiver', 'orochi']]) editedTokens.cardIds[editedTokens.cardIds.indexOf(from)] = to;
  const editedMomie = { ...MOBA_DECKS[4], cardIds: [...MOBA_DECKS[4].cardIds] };
  for (const [from, to] of [['jarl-au-marteau-de-guerre', 'momie-de-lin'], ['grand-hiver', 'la-derniere-pesee']]) editedMomie.cardIds[editedMomie.cardIds.indexOf(from)] = to;
  const editedHeures = { ...MOBA_DECKS[0], cardIds: [...MOBA_DECKS[0].cardIds] };
  for (const [from, to] of [['ashigaru-des-braises', 'guetteur-du-beffroi'], ['mousse-des-galiotes', 'faussoyeur-des-dunes'], ['jarl-au-marteau-de-guerre', 'dune-marchante'], ['loup-des-neiges', 'scribe-de-la-liste']]) editedHeures.cardIds[editedHeures.cardIds.indexOf(from)] = to;
  const editedCorbeaux = { ...MOBA_DECKS[4], cardIds: [...MOBA_DECKS[4].cardIds] };
  editedCorbeaux.cardIds[editedCorbeaux.cardIds.indexOf('jarl-au-marteau-de-guerre')] = 'maitre-des-corbeaux';
  const decks = [...MOBA_DECKS, edited, editedNew, editedDiscard, editedSearch, editedHarakiri, editedTransfer, editedTokens, editedMomie, editedHeures, editedCorbeaux];
  for (let index = 0; index < 45; index++) {
    let seed = index + 1;
    const rng = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const duel = rpgMobaCreerPartie(decks[index % decks.length], decks[(index + 2) % decks.length], { rng }).duel;
    for (const side of ['joueur', 'sorcier']) ok(rpgMobaMulligan(duel, side, choisirMulliganIA(duel, side)));
    let actions = 0;
    while (!duel.moba.winner && actions++ < 1000) {
      assert.equal(rpgMobaPlacementCoherent(duel), true);
      const side = duel.tour, defense = side === 'joueur' ? 'sorcier' : 'joueur';
      if (duel[side].manaChoixEnAttente) { ok(rpgChoisirCouleurMana(duel, side, choisirCouleurManaIA(duel, side))); continue; }
      if (duel.mobaRechercheEnAttente) { const searchSide = duel.mobaRechercheEnAttente.cote; ok(rpgMobaResoudreRecherche(duel, searchSide, rpgMobaChoisirRechercheIA(duel, searchSide))); continue; }
      if (duel.defausseEnAttente) { const discardSide = duel.defausseEnAttente.cote; ok(rpgMobaDefausser(duel, discardSide, choisirDefausseIA(duel, discardSide))); continue; }
      if (duel.arriveeEnAttente) {
        const cible = rpgMobaChoisirArriveeIA(duel, side);
        assert.ok(cible, 'arrival must have a legal choice');
        ok(rpgMobaResoudreArrivee(duel, side, cible)); continue;
      }
      if (duel.effetCreatureEnAttente || duel.combatDeclare || duel.finDeTour) {
        const reaction = rpgMobaChoisirMagieIA(duel, defense, true);
        if (reaction) { ok(rpgMobaLancerMagie(duel, defense, reaction.id, reaction.cible, reaction.lane, reaction.prixLane)); continue; }
      }
      if (duel.effetCreatureEnAttente) { ok(rpgMobaPasserEffetCreature(duel, defense)); continue; }
      if (duel.combatDeclare) {
        const ids = duel.combatDeclare.attaquants;
        const blocks = rpgMobaChoisirBlocagesIA(duel, side, ids);
        ok(rpgMobaLancerAttaque(duel, side, ids, blocks, { declaree: true })); continue;
      }
      if (duel.finDeTour) { ok(rpgMobaPasserFinDeTour(duel, defense)); continue; }
      const creature = rpgMobaChoisirCreatureIA(duel, side);
      const magie = rpgMobaChoisirMagieIA(duel, side);
      if (magie && (!creature || magie.score >= 35)) { ok(rpgMobaLancerMagie(duel, side, magie.id, magie.cible, magie.lane, magie.prixLane)); continue; }
      if (creature) { ok(rpgMobaJouerCreature(duel, side, creature.id, creature.lane, creature.slot)); continue; }
      const attackers = duel.attaqueJouee !== side ? rpgMobaChoisirAttaquantsIA(duel, side) : [];
      if (attackers.length) { ok(rpgMobaDeclarerAttaque(duel, side, attackers, rpgMobaChoisirCiblesAttaqueIA(duel, side, attackers))); continue; }
      ok(rpgMobaTerminerTour(duel, side));
    }
    assert.ok(duel.moba.winner, `game ${index} did not end after ${actions} actions`);
  }
});

test('decision probes do not mutate the real game', () => {
  const duel = rpgMobaCreerPartie(MOBA_DECKS[0], MOBA_DECKS[3]).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  ok(rpgChoisirCouleurMana(duel, 'joueur', choisirCouleurManaIA(duel, 'joueur')));
  const avant = JSON.stringify(duel);
  rpgMobaChoisirCreatureIA(duel, 'joueur'); rpgMobaChoisirMagieIA(duel, 'joueur');
  assert.equal(JSON.stringify(duel), avant);
});

test('AI uses a legal instant in a response window and does not cross lanes when blocking', () => {
  const duel = rpgMobaCreerPartie(MOBA_DECKS[0], MOBA_DECKS[0], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'neige'));
  duel.joueur.mana.neige = 10;
  duel.joueur.main.push('jarl-au-marteau-de-guerre');
  const attacker = rpgMobaJouerCreature(duel, 'joueur', 'jarl-au-marteau-de-guerre', 'left', 0);
  ok(attacker); attacker.entite.ready = true;
  ok(rpgMobaTerminerTour(duel, 'joueur')); ok(rpgMobaPasserFinDeTour(duel, 'sorcier'));
  if (duel.sorcier.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'sorcier', 'neige'));
  duel.sorcier.mana.neige = 10;
  duel.sorcier.main.push('loup-des-neiges', 'loup-des-neiges');
  const blocker = rpgMobaJouerCreature(duel, 'sorcier', 'loup-des-neiges', 'left', 0); ok(blocker);
  ok(rpgMobaJouerCreature(duel, 'sorcier', 'loup-des-neiges', 'right', 0));
  ok(rpgMobaTerminerTour(duel, 'sorcier')); ok(rpgMobaPasserFinDeTour(duel, 'joueur'));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'neige'));
  ok(rpgMobaDeclarerAttaque(duel, 'joueur', [attacker.entite.id]));
  const blocks = rpgMobaChoisirBlocagesIA(duel, 'joueur', [attacker.entite.id]);
  assert.deepEqual(blocks[attacker.entite.id], [blocker.entite.id], 'provocation is satisfied in the same lane');
  duel.sorcier.mana.neige = 10;
  duel.sorcier.main = ['poigne-de-givre'];
  const magie = rpgMobaChoisirMagieIA(duel, 'sorcier', true);
  assert.equal(magie?.id, 'poigne-de-givre');
  assert.equal(magie?.cible, attacker.entite.id);
  ok(rpgMobaLancerMagie(duel, 'sorcier', magie.id, magie.cible, magie.lane, magie.prixLane));
  if (duel.combatDeclare) ok(rpgMobaLancerAttaque(duel, 'joueur', duel.combatDeclare.attaquants, blocks, { declaree: true }));
});

test('AI prefers the spell that wins the second lane over other possible moves', async () => {
  const { mobaInfliger } = await import('../src/games/rpgMoba.js');
  const duel = rpgMobaCreerPartie(MOBA_DECKS[0], MOBA_DECKS[0], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'neige'));
  duel.joueur.main = ['grand-hiver', 'eclair-du-marteau', 'ashigaru-des-braises'];
  duel.joueur.mana.neige = 10; duel.joueur.mana.braise = 10;
  ok(mobaInfliger(duel.moba, 'joueur', 'left', 10));
  ok(mobaInfliger(duel.moba, 'joueur', 'right', 7));
  const spell = rpgMobaChoisirMagieIA(duel, 'joueur');
  assert.equal(spell?.id, 'eclair-du-marteau');
  assert.equal(spell?.lane, 'right');
  assert.ok(spell.score >= 35, 'board prioritizes conquest over summoning');
  ok(rpgMobaLancerMagie(duel, 'joueur', spell.id, spell.cible, spell.lane));
  assert.equal(duel.moba.winner, 'joueur');
});

test('AI avoids a losing board wipe but uses one when enemy losses are greater', () => {
  const duel = rpgMobaCreerPartie(MOBA_DECKS[0], MOBA_DECKS[0], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'neige'));
  duel.joueur.mana.neige = 20; duel.joueur.mana.braise = 20;
  duel.joueur.main = ['jarl-au-marteau-de-guerre'];
  const ally = rpgMobaJouerCreature(duel, 'joueur', 'jarl-au-marteau-de-guerre', 'left', 0).entite;
  ok(rpgMobaTerminerTour(duel, 'joueur')); ok(rpgMobaPasserFinDeTour(duel, 'sorcier'));
  if (duel.sorcier.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'sorcier', 'braise'));
  duel.sorcier.mana.braise = 20; duel.sorcier.main = ['ashigaru-des-braises'];
  ok(rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0));
  ok(rpgMobaTerminerTour(duel, 'sorcier')); ok(rpgMobaPasserFinDeTour(duel, 'joueur'));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'neige'));
  duel.joueur.mana.neige = 20; duel.joueur.main = ['la-derniere-pesee'];
  duel.joueur.mana.tenebres = 20;
  assert.equal(rpgMobaChoisirMagieIA(duel, 'joueur'), null, 'do not sacrifice a stronger allied board');
  // Invert the comparison without using an unsafe real-game move.
  ally.atk = 0; ally.pv = 1;
  duel.sorcier.creatures[0].atk = 8; duel.sorcier.creatures[0].pv = 8;
  const spell = rpgMobaChoisirMagieIA(duel, 'joueur');
  assert.equal(spell?.id, 'la-derniere-pesee');
  ok(rpgMobaLancerMagie(duel, 'joueur', spell.id, spell.cible, spell.lane));
  assert.equal(duel.joueur.creatures.length, 0);
  assert.equal(duel.sorcier.creatures.length, 0);
});

test('AI does not throw a weak creature into a strong same-lane blocker', () => {
  const duel = rpgMobaCreerPartie(MOBA_DECKS[0], MOBA_DECKS[0], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'braise'));
  duel.joueur.main = ['ashigaru-des-braises']; duel.joueur.mana.braise = 10;
  const attacker = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  ok(rpgMobaTerminerTour(duel, 'joueur')); ok(rpgMobaPasserFinDeTour(duel, 'sorcier'));
  if (duel.sorcier.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'sorcier', 'neige'));
  duel.sorcier.main = ['jarl-au-marteau-de-guerre']; duel.sorcier.mana.neige = 10;
  ok(rpgMobaJouerCreature(duel, 'sorcier', 'jarl-au-marteau-de-guerre', 'left', 0));
  ok(rpgMobaTerminerTour(duel, 'sorcier')); ok(rpgMobaPasserFinDeTour(duel, 'joueur'));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'braise'));
  const avant = JSON.stringify(duel);
  assert.deepEqual(rpgMobaChoisirAttaquantsIA(duel, 'joueur'), []);
  assert.equal(JSON.stringify(duel), avant, 'combat search leaves live state untouched');
  assert.ok(duel.joueur.creatures.includes(attacker));
});

test('AI preserves ephemeral attackers and short-lived buffs after combat', () => {
  const duel = rpgMobaCreerPartie(MOBA_DECKS[0], MOBA_DECKS[0], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'braise'));
  duel.joueur.main = ['ashigaru-des-braises', 'djinn-de-la-premiere-etincelle', 'mur-de-boucliers'];
  duel.joueur.mana.braise = 20; duel.joueur.mana.neige = 20;
  const creature = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  creature.ready = true;
  ok(rpgMobaDeclarerAttaque(duel, 'joueur', [creature.id]));
  ok(rpgMobaLancerAttaque(duel, 'joueur', [creature.id], {}, { declaree: true }));
  assert.equal(rpgMobaChoisirCreatureIA(duel, 'joueur'), null);
  assert.equal(rpgMobaChoisirMagieIA(duel, 'joueur'), null);
});

test('AI chooses an eligible enemy for neutral exile, or an eligible ally if no enemy is legal', () => {
  const duel = rpgMobaCreerPartie(MOBA_DECKS[4], MOBA_DECKS[4], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'neige'));
  duel.joueur.mana.braise = 20; duel.joueur.mana.neige = 20; duel.joueur.mana.tenebres = 20;
  duel.joueur.main = ['ashigaru-des-braises'];
  const enemy = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  ok(rpgMobaTerminerTour(duel, 'joueur')); ok(rpgMobaPasserFinDeTour(duel, 'sorcier'));
  if (duel.sorcier.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'sorcier', 'neige'));
  duel.sorcier.mana.braise = 20; duel.sorcier.mana.neige = 20; duel.sorcier.mana.tenebres = 20;
  duel.sorcier.main = ['ashigaru-des-braises', 'valkyrie-des-neuf-nuits'];
  const ally = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0).entite;
  const valkyrie = rpgMobaJouerCreature(duel, 'sorcier', 'valkyrie-des-neuf-nuits', 'center', 0);
  ok(valkyrie); assert.equal(valkyrie.arriveeEnAttente, true);
  assert.equal(rpgMobaChoisirArriveeIA(duel, 'sorcier'), enemy.id);
  ok(rpgMobaResoudreArrivee(duel, 'sorcier', enemy.id));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
  // A second valid arrival with no enemy still finds the other allied creature.
  duel.sorcier.main.push('valkyrie-des-neuf-nuits');
  const second = rpgMobaJouerCreature(duel, 'sorcier', 'valkyrie-des-neuf-nuits', 'right', 1);
  ok(second); assert.equal(second.arriveeEnAttente, true);
  assert.equal(rpgMobaChoisirArriveeIA(duel, 'sorcier'), ally.id);
  ok(rpgMobaResoudreArrivee(duel, 'sorcier', ally.id));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('AI assigns forced blockers to attackers in their own lane, including zero attack', () => {
  const duel = rpgMobaCreerPartie(MOBA_DECKS[0], MOBA_DECKS[0], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'neige'));
  duel.joueur.mana.braise = 10; duel.joueur.main = ['ashigaru-des-braises'];
  const attacker = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  ok(rpgMobaTerminerTour(duel, 'joueur')); ok(rpgMobaPasserFinDeTour(duel, 'sorcier'));
  if (duel.sorcier.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'sorcier', 'neige'));
  duel.sorcier.mana.braise = 10; duel.sorcier.main = ['ashigaru-des-braises', 'ashigaru-des-braises'];
  const blocker = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  const distant = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0).entite;
  ok(rpgMobaTerminerTour(duel, 'sorcier')); ok(rpgMobaPasserFinDeTour(duel, 'joueur'));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'neige'));
  duel.joueur.mana.neige = 10; duel.joueur.main = ['embuscade'];
  ok(rpgMobaLancerMagie(duel, 'joueur', 'embuscade'));
  attacker.atk = 0;
  ok(rpgMobaDeclarerAttaque(duel, 'joueur', [attacker.id]));
  const blocks = rpgMobaChoisirBlocagesIA(duel, 'joueur', [attacker.id]);
  assert.deepEqual(blocks[attacker.id], [blocker.id]); assert.ok(!Object.values(blocks).flat().includes(distant.id));
  ok(rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], blocks, { declaree: true }));
});

test('AI selects the lane where Le Poids wins and uses isolated probes', async () => {
  const { mobaInfliger } = await import('../src/games/rpgMoba.js');
  const duel = rpgMobaCreerPartie(MOBA_DECKS[4], MOBA_DECKS[4], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', choisirCouleurManaIA(duel, 'joueur')));
  duel.joueur.mana.tenebres = 20; duel.joueur.main = ['le-poids'];
  ok(mobaInfliger(duel.moba, 'joueur', 'right', 10)); ok(mobaInfliger(duel.moba, 'joueur', 'left', 8));
  const before = JSON.stringify(duel);
  const choice = rpgMobaChoisirMagieIA(duel, 'joueur');
  assert.equal(choice.id, 'le-poids'); assert.equal(choice.lane, 'left');
  assert.equal(JSON.stringify(duel), before);
  ok(rpgMobaLancerMagie(duel, 'joueur', choice.id, choice.cible, choice.lane));
  assert.equal(duel.moba.winner, 'joueur'); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('AI picks independent affordable payment and winning transfer lanes for La Grande Pesée', async () => {
  const { mobaInfliger } = await import('../src/games/rpgMoba.js');
  const duel = rpgMobaCreerPartie(MOBA_DECKS[4], MOBA_DECKS[4], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', choisirCouleurManaIA(duel, 'joueur')));
  duel.joueur.mana.tenebres = 20; duel.joueur.main = ['la-grande-pesee'];
  ok(mobaInfliger(duel.moba, 'joueur', 'right', 10)); ok(mobaInfliger(duel.moba, 'joueur', 'left', 7));
  ok(mobaInfliger(duel.moba, 'sorcier', 'left', 9));
  const choice = rpgMobaChoisirMagieIA(duel, 'joueur');
  assert.equal(choice.id, 'la-grande-pesee'); assert.equal(choice.lane, 'left'); assert.equal(choice.prixLane, 'center');
  ok(rpgMobaLancerMagie(duel, 'joueur', choice.id, choice.cible, choice.lane, choice.prixLane));
  assert.equal(duel.moba.winner, 'joueur'); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('AI summons Tarek and can plan legal attacks with his rapid tokens', () => {
  const duel = rpgMobaCreerPartie(MOBA_DECKS[0], MOBA_DECKS[0], { rng: () => .5 }).duel;
  ok(rpgMobaMulligan(duel, 'joueur', [])); ok(rpgMobaMulligan(duel, 'sorcier', []));
  if (duel.joueur.manaChoixEnAttente) ok(rpgChoisirCouleurMana(duel, 'joueur', 'sable'));
  duel.joueur.main = ['tarek']; duel.joueur.mana.sable = 10;
  const choice = rpgMobaChoisirCreatureIA(duel, 'joueur');
  assert.equal(choice?.id, 'tarek');
  ok(rpgMobaJouerCreature(duel, 'joueur', choice.id, choice.lane, choice.slot));
  const dogs = duel.joueur.creatures.filter((e) => e.carteId === 'chien-de-sable');
  assert.equal(dogs.length, 2);
  const attackers = rpgMobaChoisirAttaquantsIA(duel, 'joueur');
  assert.ok(attackers.some((id) => dogs.some((dog) => dog.id === id)));
  ok(rpgMobaDeclarerAttaque(duel, 'joueur', attackers, rpgMobaChoisirCiblesAttaqueIA(duel, 'joueur', attackers)));
  ok(rpgMobaLancerAttaque(duel, 'joueur', attackers, {}, { declaree: true }));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});
