import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RPG_ELEMENTS, cardById } from '../src/games/rpgCards.js';
import { retoursAuDeckInvocation } from '../src/games/rpgInvocation.js';
import { rpgFinDeTour, rpgJouerCreature, rpgLancerAttaque, rpgNouveauDuel, rpgResoudreArriveeCiblee } from '../src/games/rpgDuel.js';
import { actualiserStatsApercu } from '../src/games/rpgApercuStatistiques.js';
import { rpgAfflictionsVisuelles } from '../src/games/rpgAfflictionsVisuelles.js';

function scene(rng = () => .9) {
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng });
  for (const cote of ['joueur', 'sorcier']) duel[cote].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 20]));
  return duel;
}
function poser(duel, cote, id) {
  const tour = duel.tour;
  duel.tour = cote;
  duel[cote].invocationNormaleJouee = false;
  duel[cote].main.push(id);
  const retourIds = Array(retoursAuDeckInvocation(cardById(id))).fill('gerboise-des-ruines');
  duel[cote].main.push(...retourIds);
  const res = rpgJouerCreature(duel, cote, id, null, retourIds.length ? { retourIds } : {});
  duel.tour = tour;
  assert.equal(res.ok, true, res.raison);
  res.entite.ready = true;
  res.entite.malInvocation = false;
  return res.entite;
}

test('la marque de poison suit une vraie attaque et disparaît après les deux tours', () => {
  const d = scene(), victime = poser(d, 'sorcier', 'dune-marchante'), scorpion = poser(d, 'joueur', 'scorpion-du-seuil');
  assert.deepEqual(rpgAfflictionsVisuelles(victime), []);
  assert.equal(rpgLancerAttaque(d, 'joueur', [scorpion.id], { [scorpion.id]: [victime.id] }).ok, true);
  assert.deepEqual(rpgAfflictionsVisuelles(victime), ['poison']);
  rpgFinDeTour(d);
  assert.deepEqual(rpgAfflictionsVisuelles(victime), ['poison']);
  rpgFinDeTour(d); rpgFinDeTour(d);
  assert.deepEqual(rpgAfflictionsVisuelles(victime), []);
});

test('une vraie attaque de Braise allume la marque tant que la brûlure subsiste', () => {
  const d = scene(() => .1), victime = poser(d, 'sorcier', 'griffon-des-dunes-gelees');
  victime.atk = 0;
  const tengu = poser(d, 'joueur', 'tengu-du-mont-ardent');
  assert.equal(rpgLancerAttaque(d, 'joueur', [tengu.id], { [tengu.id]: [victime.id] }).ok, true);
  assert.deepEqual(rpgAfflictionsVisuelles(victime), ['brulure']);
  rpgFinDeTour(d);
  assert.deepEqual(rpgAfflictionsVisuelles(victime), ['brulure']);
});

test('les deux marques coexistent et ne dépendent pas des anciennes données', () => {
  assert.deepEqual(rpgAfflictionsVisuelles(null), []);
  assert.deepEqual(rpgAfflictionsVisuelles({ poison: { toursRestants: 2 }, brulure: true }), ['poison', 'brulure']);
  assert.deepEqual(rpgAfflictionsVisuelles({ poison: { toursRestants: 0 }, brulure: true }), ['brulure']);
  assert.deepEqual(rpgAfflictionsVisuelles({ poison: null, brulure: false }), []);
});

test('les calques sont partagés par les cartes et aperçus, sans bloquer les gestes ni le mouvement réduit', () => {
  const lire = (nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8');
  const page = lire('RpgDuelPage.jsx'), moba = lire('RpgMobaBoard.jsx');
  const composant = lire('RpgAfflictionsVisuelles.jsx'), css = lire('rpg-battle.css');
  assert.match(page, /!estSite && <RpgAfflictionsVisuelles entite={entite}/);
  assert.match(page, /entite && <RpgAfflictionsVisuelles entite={entite}/);
  assert.match(moba, /<TableCard[\s\S]*?entite={entity}/);
  assert.match(moba, /!carteSite && <><RpgAfflictionsVisuelles entite={entity}/);
  assert.match(composant, /aria-hidden="true"/);
  assert.match(css, /\.rpg-affliction\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(css, /\.rpg-battle\.is-reduced \.rpg-affliction\s*\{\s*animation:\s*none/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.rpg-affliction\s*\{\s*animation:\s*none/);
});

test('la Vipère applique une entrave d’attaque réelle qui expire sans toucher au poison', () => {
  const d = scene(), victime = poser(d, 'sorcier', 'chien-du-guet');
  d.joueur.main.push('vipere-de-verre');
  const pose = rpgJouerCreature(d, 'joueur', 'vipere-de-verre', null, { cibleDifferee: true });
  assert.equal(pose.ok, true); assert.equal(rpgResoudreArriveeCiblee(d, 'joueur', victime.id).ok, true);
  assert.deepEqual(rpgAfflictionsVisuelles(victime), ['entrave-attaque']);
  rpgFinDeTour(d); assert.deepEqual(rpgAfflictionsVisuelles(victime), ['entrave-attaque']);
  rpgFinDeTour(d); assert.deepEqual(rpgAfflictionsVisuelles(victime), []);
});

test('les interdits de combat sont indépendants et se retrouvent dans un aperçu actualisé', () => {
  const entite = { id: 'x', carteId: 'chien-du-guet', atk: 2, pv: 2, pvMax: 2, empecheAttaqueToursRestants: 1, empecheBlocageToursRestants: 1, poison: null, brulure: false };
  const duel = { joueur: { creatures: [entite] }, sorcier: { creatures: [] } };
  const visuel = { id: 'x', carteId: 'chien-du-guet', empecheAttaqueToursRestants: 0, poison: { toursRestants: 2 }, brulure: true };
  assert.deepEqual(rpgAfflictionsVisuelles(actualiserStatsApercu(visuel, duel)), ['entrave-attaque', 'entrave-blocage']);
  entite.empecheAttaqueToursRestants = 0; entite.empecheBlocageToursRestants = 0;
  assert.deepEqual(rpgAfflictionsVisuelles(actualiserStatsApercu(visuel, duel)), []);
});

test('le tir de neige gèle réellement puis libère sa cible en fin de tour', () => {
  const d = scene(() => .1), victime = poser(d, 'sorcier', 'dune-marchante');
  const volva = poser(d, 'joueur', 'volva-soigneuse');
  assert.equal(rpgLancerAttaque(d, 'joueur', [volva.id], { [volva.id]: [victime.id] }).ok, true);
  assert.ok(victime.gelToursRestants > 0);
  rpgFinDeTour(d); assert.ok(victime.gelToursRestants > 0);
  rpgFinDeTour(d); assert.equal(victime.gelToursRestants, 0);
});

test('un attaquant se dégage au début de son propre tour, pas au tour adverse', () => {
  const d = scene(), attaquant = poser(d, 'joueur', 'chien-du-guet');
  assert.equal(rpgLancerAttaque(d, 'joueur', [attaquant.id], {}).ok, true);
  assert.equal(attaquant.attaquee, true);
  rpgFinDeTour(d); assert.equal(attaquant.attaquee, true);
  rpgFinDeTour(d); assert.equal(attaquant.attaquee, false);
});

test('les nouveaux calques sont limités à la carte et respectent le mouvement réduit', () => {
  const lire = (nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8');
  const page = lire('RpgDuelPage.jsx'), moba = lire('RpgMobaBoard.jsx'), css = lire('rpg-battle.css');
  for (const [nom, classe] of [['RpgDegagementVisuel', 'rpg-degagement'], ['RpgFinPoisonVisuel', 'rpg-fin-poison']]) {
    assert.match(page, new RegExp(`<${nom} entite={entite}`));
    assert.match(moba, new RegExp(`<${nom} entite={entity}`));
    assert.match(css, new RegExp(`\\.${classe}\\s*\\{[^}]*pointer-events:\\s*none`, 's'));
    assert.match(css, new RegExp(`\\.rpg-battle\\.is-reduced \\.${classe}\\s*\\{\\s*display:\\s*none`));
    assert.match(css, new RegExp(`@media \\(prefers-reduced-motion: reduce\\)\\s*\\{\\s*\\.${classe}\\s*\\{\\s*display:\\s*none`));
  }
});
