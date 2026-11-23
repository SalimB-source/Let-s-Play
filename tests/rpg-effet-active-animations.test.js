import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { cardById, RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { retoursAuDeckInvocation } from '../src/games/rpgInvocation.js';
import {
  rpgActiverCapacite,
  rpgConsommerSoins,
  rpgFinDeTour,
  rpgJouerCreature,
  rpgNouveauDuel,
} from '../src/games/rpgDuel.js';

/** Un effet activé se voit : l'élément de la carte signe le tir (le feu de la
 *  Braise, la tempête de la Neige, le tourbillon du renvoi, l'égide du
 *  bouclier prêté, l'éclat du soin, la braise du renfort), et la fenêtre
 *  « Activer l'effet » passe au-dessus de toutes les cartes. */

function quotaLibre(duel, cote) {
  if (duel?.moba) duel.moba.creaturesJouees[cote] = false;
  else if (duel?.[cote]) duel[cote].invocationNormaleJouee = false;
}

function duel({ rng = () => 0.9 } = {}) {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng });
  for (const cote of ['joueur', 'sorcier']) {
    d[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((element) => [element, 20]));
  }
  return d;
}

function poser(d, cote, id) {
  const tour = d.tour;
  d.tour = cote;                 // la pose est légale au tour de son camp
  quotaLibre(d, cote);           // une invocation normale par tour : le test en pose plusieurs
  d[cote].main.push(id);
  // Le prix d'une invocation de coût 5+ est un retour de cartes de la main au
  // deck : le test avance des Gerboises comme monnaie.
  // Les retours au deck doivent être des cartes DISTINCTES de la main.
  const monnaie = ['gerboise-des-ruines', 'chien-du-guet', 'porteuse-de-cruches'];
  const retourIds = [];
  for (let i = 0; i < retoursAuDeckInvocation(cardById(id)); i++) {
    d[cote].main.push(monnaie[i]);
    retourIds.push(monnaie[i]);
  }
  const resultat = rpgJouerCreature(d, cote, id, null, retourIds.length ? { retourIds } : {});
  d.tour = tour;
  assert.equal(resultat.ok, true, `${id} entre en jeu : ${resultat.raison}`);
  resultat.entite.ready = true;
  resultat.entite.malInvocation = false;
  return resultat.entite;
}

/** Les tirs décoratifs émis par l'effet activé, dans l'ordre du journal. */
function tirsDeActivation(d, avant, entiteId) {
  return (d.combatAnimations ?? [])
    .filter((animation) => animation.id > avant
      && animation.type === 'projectile-combat'
      && animation.source?.entiteId === entiteId);
}

function activer(d, sourceId, cibleId = null) {
  const avant = Number(d.combatAnimationSeq) || 0;
  rpgConsommerSoins(d); // le journal des soins repart de zéro pour ce test
  const resultat = rpgActiverCapacite(d, 'joueur', sourceId, cibleId);
  assert.equal(resultat.ok, true, `l'effet part : ${resultat.raison}`);
  return tirsDeActivation(d, avant, sourceId);
}

test('Braise — l’Oni de la fournaise crache le feu sur sa cible', () => {
  const d = duel();
  const oni = poser(d, 'joueur', 'oni-de-la-fournaise');
  const dune = poser(d, 'sorcier', 'dune-marchante');
  const tirs = activer(d, oni.id, dune.id);
  assert.equal(tirs.length, 1, 'un seul tir');
  assert.equal(tirs[0].variante, 'feu');
  assert.deepEqual(tirs[0].source, { type: 'creature', cote: 'joueur', entiteId: oni.id });
  assert.deepEqual(tirs[0].cible, { type: 'creature', cote: 'sorcier', entiteId: dune.id });
  assert.equal(dune.pv, 2, 'les 2 blessures tombent sur la 2/4');
});

test('Neige — la Valkyrie des glaces tire la tempête et gèle la cible', () => {
  const d = duel();
  const valkyrie = poser(d, 'joueur', 'valkyrie-des-glaces');
  const dune = poser(d, 'sorcier', 'dune-marchante');
  const tirs = activer(d, valkyrie.id, dune.id);
  assert.deepEqual(tirs.map((tir) => tir.variante), ['tempete']);
  assert.equal(dune.pv, 2, '2 blessures sur la 2/4');
  assert.ok((dune.gelToursRestants ?? 0) > 0, 'l’effet imprimé gèle bien la cible');
  assert.ok(d.log.some((ligne) => /gelée/iu.test(ligne)), 'le journal annonce le gel');
});

test('Eau — le Léviathan renvoie sa cible dans le tourbillon', () => {
  const d = duel();
  const leviathan = poser(d, 'joueur', 'leviathan');
  const dune = poser(d, 'sorcier', 'dune-marchante');
  const tirs = activer(d, leviathan.id, dune.id);
  assert.deepEqual(tirs.map((tir) => tir.variante), ['renvoi']);
  assert.equal(d.sorcier.creatures.some((c) => c.id === dune.id), false, 'la cible a quitté la table');
  assert.ok(d.sorcier.main.includes('dune-marchante'), 'elle est rentrée en main');
});

test('Sable — Salem endurcit une alliée jusqu’à la fin du tour', () => {
  const d = duel();
  const salem = poser(d, 'joueur', 'salem');
  const dune = poser(d, 'joueur', 'dune-marchante');
  const tirs = activer(d, salem.id, dune.id);
  assert.deepEqual(tirs.map((tir) => tir.variante), ['renfort'], 'l’éclair de ce qui grandit');
  assert.deepEqual(tirs[0].cible, { type: 'creature', cote: 'joueur', entiteId: dune.id });
  assert.equal(dune.def, 6, '+0/+2 : la défense suit le plafond relevé');
  assert.equal(dune.pv, 6);
  assert.equal(dune.atk, 2, 'l’attaque ne bouge pas');
  assert.equal(dune.bouclier ?? 0, 0, 'l’égide d’un tour reste l’affaire de la Guetteuse');
  rpgFinDeTour(d); rpgFinDeTour(d);
  assert.equal(dune.def, 4, 'le renfort tombe avec le tour');
});

test('Neige — Eirik soigne : un éclat par allié soigné et pour le sorcier', () => {
  const d = duel();
  const eirik = poser(d, 'joueur', 'eirik-du-premier-serment');
  const dune = poser(d, 'joueur', 'dune-marchante');
  dune.pv = 2; // une blessure que le soin de zone va remonter
  const tirs = activer(d, eirik.id);
  assert.deepEqual(tirs.map((tir) => tir.variante), ['soin', 'soin']);
  assert.deepEqual(tirs.map((tir) => tir.cible), [
    { type: 'creature', cote: 'joueur', entiteId: dune.id },
    { type: 'sorcier', cote: 'joueur' },
  ], 'l’alliée soignée puis la plaque du sorcier — jamais la source elle-même');
  assert.equal(dune.pv, 4, 'soignée de 2');
  const soins = rpgConsommerSoins(d).map((soin) => [soin.entityId ?? 'sorcier', soin.montant]);
  assert.deepEqual(soins, [['sorcier', 2], [dune.id, 2]], 'le journal des soins allume les éclats');
  assert.equal(d.joueur.pvMax, d.joueur.pv, 'la réserve du sorcier suit sa vie : la barre ne déborde pas');
});

test('Braise — le Daimyō renforce le camp : la braise du renfort', () => {
  const d = duel();
  const daimyo = poser(d, 'joueur', 'daimyo-du-soleil-rouge');
  const dune = poser(d, 'joueur', 'dune-marchante');
  const atkAvant = dune.atk;
  const tirs = activer(d, daimyo.id);
  // Le Daimyō pose un Samouraï en arrivant : le camp compte deux alliés à
  // renforcer, la source exceptée — un tir par allié, dans l'ordre du camp.
  const allies = d.joueur.creatures.filter((creature) => creature.id !== daimyo.id);
  assert.ok(allies.some((creature) => creature.carteId === 'samourai-du-daimyo'), 'le jeton est là');
  assert.deepEqual(tirs.map((tir) => tir.variante), allies.map(() => 'renfort'));
  assert.deepEqual(tirs.map((tir) => tir.cible.entiteId), allies.map((creature) => creature.id));
  assert.equal(dune.atk, atkAvant + 2, 'le renfort est bien appliqué');
  // Le plafond réel s'appelle `pvMax` (pas `maxPv`) : sans lui, le soin
  // suivant ramenait les PV gagnés au plafond imprimé. La DEF suit, comme dans
  // les auras Sable et Amani.
  assert.equal(dune.pvMax, 5, 'le plafond monte avec les PV gagnés');
  assert.equal(dune.def, 5, 'la DEF suit le plafond');
});

test('une créature déjà pleine ne gagne rien : aucun éclat fantôme', () => {
  const d = duel();
  const eirik = poser(d, 'joueur', 'eirik-du-premier-serment');
  poser(d, 'joueur', 'dune-marchante'); // pleine : 4/4
  const tirs = activer(d, eirik.id);
  assert.deepEqual(tirs.map((tir) => tir.cible), [{ type: 'sorcier', cote: 'joueur' }],
    'seule la plaque du sorcier est visée — pas de « +2 » sur une alliée intacte');
  assert.deepEqual(rpgConsommerSoins(d).map((soin) => soin.entityId), [null],
    'le journal ne note que le gain réel du sorcier');
});

test('le renfort ne se défait pas au soin suivant : le plafond relevé tient', () => {
  const d = duel();
  const daimyo = poser(d, 'joueur', 'daimyo-du-soleil-rouge');
  const dune = poser(d, 'joueur', 'dune-marchante');
  activer(d, daimyo.id);                 // +2/+1 : 4/5 PV, plafond 5
  assert.equal(dune.pv, 5);
  rpgFinDeTour(d); rpgFinDeTour(d);      // le tour revient au joueur, l'effet se recharge
  const eirik = poser(d, 'joueur', 'eirik-du-premier-serment');
  dune.pv = 3;                           // une blessure à remonter
  const tirs = activer(d, eirik.id);
  assert.deepEqual(tirs.map((tir) => tir.cible.entiteId ?? tir.cible.type), [dune.id, 'sorcier']);
  assert.equal(dune.pv, 5, 'soignée jusqu’au plafond relevé — pas ramenée aux 4 PV imprimés');
});

test('la fenêtre d’effet activé passe au-dessus de toutes les cartes', () => {
  const jsx = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
  // Les rangées sont des contextes d'empilement à 4/5, sous les terrains (41)
  // et le dock de la main (42) : le menu ouvert soulève la carte ET sa rangée.
  // La carte et ses variantes équipées/gardées portent la même levée.
  assert.match(css, /\.rpg-card\.is-effet-menu,\s*\.rpg-card:is\([^)]*\)\.is-effet-menu\s*\{[^}]*z-index:\s*44/u);
  // La rangée ET ses wrappers de pile/prison suivent la carte soulevée, et la
  // levée est `!important` : en mode mana d'essai, chaque carte de la rangée
  // porte un `z-index: 1` donné par une règle plus spécifique.
  assert.match(css, /\.card-row:has\(\.rpg-card\.is-effet-menu\),\s*\.card-row > :is\(\.rpg-card-stack, \.rpg-card-prison\):has\(\.rpg-card\.is-effet-menu\)\s*\{\s*z-index:\s*44\s*!important/u);
  // La levée se lit dans le CSS, aucune prop n'est câblée dans le JSX : les
  // deux rangées gardent leur `className` littéral.
  assert.match(jsx, /className="card-row card-row--equipe"/u);
  assert.match(jsx, /className="card-row card-row--ennemi"/u);
  assert.doesNotMatch(jsx, /card-row--[a-z]+\$\{/u, 'aucune rangée ne se voit câbler la classe en JSX');
  // Les annonces et les calques de combat gardent la priorité sur la fenêtre.
  assert.match(css, /\.rpg-annonce-action\s*\{[^}]*z-index:\s*4[6-9]/u);
});

test('les tirs des effets activés ont chacun leur tête, et l’activation les joue', () => {
  const jsx = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
  for (const variante of ['tempete', 'vague', 'sable', 'ombre', 'egide', 'renvoi', 'soin', 'renfort']) {
    assert.match(css, new RegExp(`\\.rpg-projectile-combat--${variante} \\.rpg-projectile-combat__tete\\s*\\{`, 'u'),
      `la tête « ${variante} » est dessinée`);
  }
  // Le tourbillon du renvoi tourne sans voler l'angle du tir.
  assert.match(css, /@keyframes rpg-projectile-tourbillon\s*\{\s*from \{ rotate: 0deg; \}/u);
  // Sans le relevé du champ avant/après, aucun tir ne s'allume : les deux
  // chemins d'activation (avec et sans cible) le font maintenant.
  const resoudre = jsx.slice(jsx.indexOf('const resoudreActivation = (entite)'), jsx.indexOf('const basculerAttaquant'));
  assert.match(resoudre, /prendreInstantaneChamp\(\)/u);
  assert.match(resoudre, /animerModificationsChamp\(champAvantAction, \[\], debutJournalDestructions\)/u);
  const sansCible = jsx.slice(jsx.indexOf("if (activation?.cible === 'aucune')"), jsx.indexOf('const engagerPourMana'));
  assert.match(sansCible, /prendreInstantaneChamp\(\)/u);
  assert.match(sansCible, /animerModificationsChamp\(champAvantAction, \[\], debutJournalDestructions\)/u);
});
