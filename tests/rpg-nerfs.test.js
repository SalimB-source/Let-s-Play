import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rpgNouveauDuel, rpgJouerCreature, rpgJouerArme, rpgLancerMagie, rpgAttaquerSorcier,
  rpgLancerAttaque, rpgFinDeTour, rpgEstProtegee, rpgContreJouable, rpgResoudreArriveeCiblee,
  rpgDefausserCarte, rpgBlesserCreature, rpgPeutAttaquer, rpgChoisirAttaquants,
} from '../src/games/rpgDuel.js';
import { magieById } from '../src/games/rpgCards.js';

/** Le helper du script d'origine : chaque vérification devient un assert. */
function ok(nom, condition, detail = '') {
  assert.ok(condition, detail ? `${nom} — ${detail}` : nom);
}

function duelAvecMains(joueurIds = [], sorcierIds = []) {
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [] });
  duel.joueur.main = [...joueurIds];
  duel.sorcier.main = [...sorcierIds];
  // Le mana classique vient des terrains posés, retirés du jeu : on remplit la\n  // réserve directement, assez pour payer tout ce que les tests jouent.
  for (const camp of [duel.joueur, duel.sorcier]) {
    camp.mana = { braise: 12, eau: 12, sable: 12, neige: 12, tenebres: 12 };
  }
  return duel;
}

test('Butin', () => {
{
  const duel = duelAvecMains(['chien-du-guet', 'pierre-du-seuil', 'pierre-du-seuil']);
  const pose = rpgJouerCreature(duel, 'joueur', 'chien-du-guet');
  ok('pose du Chien du guet', pose.ok);
  const entite = duel.joueur.creatures[0];
  entite.ready = true;
  const mainAvant = duel.joueur.main.length;
  const res = rpgAttaquerSorcier(duel, 'joueur', entite.id);
  ok('attaque du sorcier', res.ok);
  ok('butin déclenché (log)', duel.log.some((l) => l.includes('Butin')), JSON.stringify(duel.log.slice(-4)));
  ok('pioche + défausse en attente', duel.joueur.main.length === mainAvant + 1 - 1 + 1 || duel.defausseEnAttente?.restant > 0,
    `main=${duel.joueur.main.length} attente=${JSON.stringify(duel.defausseEnAttente)}`);
  if (duel.defausseEnAttente?.restant > 0) rpgDefausserCarte(duel, 'joueur');
}

// ─── 2. BUTIN : chemin bataille (rpgLancerAttaque) ───────────────────────────
{
  const duel = duelAvecMains(['chien-du-guet']);
  rpgJouerCreature(duel, 'joueur', 'chien-du-guet');
  const entite = duel.joueur.creatures[0];
  entite.ready = true;
  const res = rpgLancerAttaque(duel, 'joueur', [entite.id], { [entite.id]: [] }, null, []);
  ok('combat ouvert', res.ok);
  ok('butin via bataille', duel.log.some((l) => l.includes('Butin')), JSON.stringify(duel.log.slice(-5)));
  if (duel.defausseEnAttente?.restant > 0) rpgDefausserCarte(duel, 'joueur');
}

// ─── 3. TIN HINAN : Infiltration aux autres seulement, sans boost ────────────
});

test('Butin : deux créatures qui touchent le sorcier cumulent pioches et défausses', () => {
  const duel = duelAvecMains(['chien-du-guet', 'chien-du-guet']);
  duel.joueur.deck = ['pierre-du-seuil', 'pierre-du-seuil', 'pierre-du-seuil'];
  for (const _ of [0, 1]) {
    const pose = rpgJouerCreature(duel, 'joueur', 'chien-du-guet');
    ok('pose du Chien du guet', pose.ok);
  }
  for (const entite of duel.joueur.creatures) entite.ready = true;
  const mainAvant = duel.joueur.main.length;
  const res = rpgLancerAttaque(duel, 'joueur',
    duel.joueur.creatures.map((entite) => entite.id),
    Object.fromEntries(duel.joueur.creatures.map((entite) => [entite.id, []])));
  ok('combat ouvert', res.ok);
  ok('les deux Butins se déclenchent',
    duel.log.filter((l) => l.includes('Butin')).length === 2, JSON.stringify(duel.log.slice(-6)));
  assert.equal(duel.joueur.main.length, mainAvant + 2, 'deux cartes piochées');
  assert.equal(duel.defausseEnAttente?.restant, 2, 'les deux défausses se cumulent');
  rpgDefausserCarte(duel, 'joueur');
  assert.equal(duel.defausseEnAttente?.restant, 1, 'une seconde défausse reste due');
  rpgDefausserCarte(duel, 'joueur');
  assert.equal(duel.defausseEnAttente, null, 'la fenêtre est soldée');
  assert.equal(duel.joueur.main.length, mainAvant, 'deux pioches, deux défausses');
});

test('Tin Hinan', () => {
{
  const duel = duelAvecMains(['tin-hinan', 'chien-du-guet']);
  rpgJouerCreature(duel, 'joueur', 'chien-du-guet');
  const chien = duel.joueur.creatures[0];
  const atkChienAvant = chien.atk;
  const res = rpgJouerCreature(duel, 'joueur', 'tin-hinan');
  ok('pose de Tin Hinan', res.ok);
  const tin = duel.joueur.creatures.find((e) => e.carteId === 'tin-hinan');
  ok('le Chien gagne Infiltration', chien.infiltration === true && chien.infiltrationTour === true);
  ok('Tin Hinan ne gagne rien', tin.infiltration !== true, `infiltration=${tin.infiltration}`);
  ok('pas de boost de stats', chien.atk === atkChienAvant, `atk ${atkChienAvant}→${chien.atk}`);
}

// ─── 4. HEURES : compte à rebours du Guetteur ────────────────────────────────
});

test('Heures', () => {
{
  const duel = duelAvecMains(['guetteur-du-beffroi', 'pierre-du-seuil', 'pierre-du-seuil', 'pierre-du-seuil']);
  rpgJouerCreature(duel, 'joueur', 'guetteur-du-beffroi');
  const guetteur = duel.joueur.creatures[0];
  ok('2 compteurs posés', guetteur.heures?.restants === 2, JSON.stringify(guetteur.heures));
  const pvSorcierAvant = duel.sorcier.pv;
  rpgFinDeTour(duel); // fin tour joueur → tour sorcier (rien pour le Guetteur)
  rpgFinDeTour(duel); // fin tour sorcier → tour joueur : décompte 1
  ok('premier compteur tombé', guetteur.heures?.restants === 1, JSON.stringify(guetteur.heures));
  rpgFinDeTour(duel); // tour sorcier
  rpgFinDeTour(duel); // tour joueur : décompte 2 → sonnerie
  ok('sonnerie (heures purgées)', guetteur.heures === null);
  ok('2 dégâts au sorcier adverse', duel.sorcier.pv === pvSorcierAvant - 2, `pv ${pvSorcierAvant}→${duel.sorcier.pv}`);
  ok('pioche de la sonnerie', duel.log.some((l) => l.includes('beffroi sonne')));
}

// ─── 5. ÉCUEIL : ne contre qu'une créature ───────────────────────────────────
});

test('Écueil', () => {
{
  const duel = duelAvecMains(['ecueil', 'tempete-de-sable', 'chien-du-guet']);
  duel.annonce = { cote: 'sorcier', carteId: 'chien-du-guet' };
  const ecueil = { id: 'ecueil', ...duel.joueur.main.map(() => ({})) };
  const carteEcueil = magieById('ecueil');
  ok('contrecarre une créature', rpgContreJouable(duel, 'joueur', carteEcueil) === true);
  duel.annonce = { cote: 'sorcier', carteId: 'tempete-de-sable' };
  ok('refuse un sort', rpgContreJouable(duel, 'joueur', carteEcueil) === false);
  duel.annonce = { cote: 'sorcier', carteId: 'chien-du-guet' };
  const res = rpgLancerMagie(duel, 'joueur', 'ecueil');
  ok('contrée !', res.ok && res.contre === true, JSON.stringify(res));
  ok('le chien est au cimetière', duel.sorcier.cimetiere.includes('chien-du-guet'));
}

// ─── 6. VIPÈRE : debuff -2/-0 + interdit d'attaquer ──────────────────────────
});

test('Vipère / Bakunawa', () => {
{
  const duel = duelAvecMains(['vipere-de-verre']);
  duel.sorcier.main = ['chien-du-guet'];
  rpgJouerCreature(duel, 'sorcier', 'chien-du-guet');
  const chien = duel.sorcier.creatures[0];
  const res = rpgJouerCreature(duel, 'joueur', 'vipere-de-verre', null, { cibleDifferee: true });
  ok('pose avec désignation différée', res.ok);
  const res2 = rpgResoudreArriveeCiblee(duel, 'joueur', chien.id);
  ok('venin appliqué', res2.ok);
  ok('chien à 0 attaque', chien.atk === 0, `atk=${chien.atk}`);
  ok('interdit d\'attaque marqué', chien.empecheAttaqueToursRestants >= 1, `${chien.empecheAttaqueToursRestants}`);
}

// ─── 7. PROTECTION PERMANENTE (Tiziri) ──────────────────────────────────────
});

test('Protection permanente', () => {
{
  const duel = duelAvecMains(['tiziri-du-djurdjura']);
  rpgJouerCreature(duel, 'joueur', 'tiziri-du-djurdjura');
  const tiziri = duel.joueur.creatures[0];
  ok('protégée contre la braise', tiziri.protection?.contre === 'braise');
  ok('contre la braise', rpgEstProtegee(tiziri, ['braise']));
  ok('pas contre l\'eau', !rpgEstProtegee(tiziri, ['eau']));
  rpgFinDeTour(duel); rpgFinDeTour(duel); rpgFinDeTour(duel); rpgFinDeTour(duel);
  ok('toujours protégée après 2 tours complets', rpgEstProtegee(tiziri, ['braise']));
  ok('bonus +1 ATQ temporaire bien retiré', tiziri.atk === 2, `atk=${tiziri.atk}`);
}

// ─── 8. RÉANIMATION : cimetière → table ─────────────────────────────────────
});

test('Réanimation / Recyclage', () => {
{
  const duel = duelAvecMains(['reanimation', 'chien-du-guet']);
  duel.joueur.cimetiere.push('chien-du-guet');
  const res = rpgLancerMagie(duel, 'joueur', 'reanimation');
  ok('réanimation résolue', res.ok, JSON.stringify(res));
  ok('le chien revient', duel.joueur.creatures.some((e) => e.carteId === 'chien-du-guet'));
  ok('sorti du cimetière', !duel.joueur.cimetiere.includes('chien-du-guet'));
}

// ─── 9. SCRIBE : renvoie une carte du cimetière (jamais lui-même) ───────────
{
  const duel = duelAvecMains(['scribe-de-la-liste']);
  const res = rpgJouerCreature(duel, 'joueur', 'scribe-de-la-liste');
  ok('pose du Scribe', res.ok);
  duel.joueur.cimetiere.push('chien-du-guet'); // une carte AVANT sa mort
  const scribe = duel.joueur.creatures[0];
  scribe.pv = 0;
  // Enterrer via dégâts létaux :
  rpgBlesserCreature(duel, 'joueur', scribe.id, 10, ['braise']);
  ok('le Scribe est mort', duel.joueur.cimetiere.includes('scribe-de-la-liste'));
  ok('il renvoie le Chien, pas lui-même', duel.joueur.main.includes('chien-du-guet')
    && !duel.joueur.main.includes('scribe-de-la-liste'), `main=${JSON.stringify(duel.joueur.main)}`);
}

// ─── 10. ANQA : retour dans 4 tours ─────────────────────────────────────────
});

test('Anqa', () => {
{
  const duel = duelAvecMains(['anqa-des-braises']);
  rpgJouerCreature(duel, 'joueur', 'anqa-des-braises');
  const anqa = duel.joueur.creatures[0];
  rpgBlesserCreature(duel, 'joueur', anqa.id, 10, ['braise']);
  const programmes = duel.joueur.retoursProgrammes;
  ok('retour programmé sur 4 tours', programmes.length === 1 && programmes[0].toursRestants === 4,
    JSON.stringify(programmes));
}
});


for (const cote of ['joueur', 'sorcier']) {
  test(`Vipère : ${cote} ne peut pas sélectionner ni attaquer avec la victime avant expiration`, () => {
    const adverse = cote === 'joueur' ? 'sorcier' : 'joueur';
    const duel = duelAvecMains();
    duel[cote].main = ['fennec-des-decombres', 'chien-du-guet'];
    const victime = rpgJouerCreature(duel, cote, 'fennec-des-decombres').entite;
    const libre = rpgJouerCreature(duel, cote, 'chien-du-guet').entite;
    duel.tour = adverse;
    duel[adverse].main = ['vipere-de-verre'];
    assert.equal(rpgJouerCreature(duel, adverse, 'vipere-de-verre', victime.id).ok, true);
    assert.equal(victime.atk, 1, 'la victime conserve une attaque positive');
    rpgFinDeTour(duel);
    assert.equal(duel.tour, cote);
    assert.equal(victime.ready, true);
    assert.equal(rpgPeutAttaquer(victime), false);
    assert.equal(rpgPeutAttaquer(libre), true);
    // Sans défenseur, l’IA voudrait envoyer toutes les créatures disponibles.
    duel[adverse].creatures = [];
    for (const niveau of ['recit', 'normale', 'veilleur']) {
      assert.deepEqual(rpgChoisirAttaquants(duel, cote, { ia: { niveau } }), [libre.id]);
    }
    const avant = structuredClone(duel);
    assert.deepEqual(rpgLancerAttaque(duel, cote, [victime.id, libre.id]),
      { ok: false, raison: 'pas-pret' });
    assert.deepEqual(duel, avant, 'le refus ne modifie pas le duel');
    assert.equal(rpgLancerAttaque(duel, cote, [libre.id]).ok, true);
    rpgFinDeTour(duel);
    assert.equal(victime.empecheAttaqueToursRestants, 0);
    rpgFinDeTour(duel);
    assert.equal(rpgPeutAttaquer(victime), true);
    assert.equal(rpgLancerAttaque(duel, cote, [victime.id]).ok, true);
  });
}
