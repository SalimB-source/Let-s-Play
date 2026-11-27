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
  assert.equal(dune.pv, 0, 'les 4 blessures détruisent la 2/4');
  assert.ok(!d.sorcier.creatures.some((c) => c.id === dune.id));
});

test('Braise — Feux de kitsune répartit les projectiles sur deux cibles', () => {
  const d = duel(); const oni = poser(d, 'joueur', 'oni-de-la-fournaise');
  const a = poser(d, 'sorcier', 'dune-marchante');
  const b = poser(d, 'sorcier', 'dune-marchante');
  const avant = Number(d.combatAnimationSeq) || 0;
  assert.ok(rpgActiverCapacite(d, 'joueur', oni.id, a.id, { cibleSecondaireId: b.id }).ok);
  assert.deepEqual(tirsDeActivation(d, avant, oni.id).map((tir) => [tir.variante, tir.cible.entiteId]), [['feu', a.id], ['feu', b.id]]);
  assert.equal(a.pv, 2); assert.equal(b.pv, 2);
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

test('Neige — Scalde soigne : un éclat par allié soigné et pour le sorcier', () => {
  const d = duel();
  const eirik = poser(d, 'joueur', 'scalde-des-runes');
  const dune = poser(d, 'joueur', 'dune-marchante');
  dune.pv = 2; // une blessure que le soin de zone va remonter
  d.joueur.pv -= 2;
  const tirs = activer(d, eirik.id);
  assert.deepEqual(tirs.map((tir) => tir.variante), ['soin', 'soin']);
  assert.deepEqual(tirs.map((tir) => tir.cible), [
    { type: 'creature', cote: 'joueur', entiteId: dune.id },
    { type: 'sorcier', cote: 'joueur' },
  ], 'l’alliée soignée puis la plaque du sorcier — jamais la source elle-même');
  assert.equal(dune.pv, 4, 'soignée de 2');
  const soins = rpgConsommerSoins(d).map((soin) => [soin.entityId ?? 'sorcier', soin.montant]);
  assert.deepEqual(soins, [[dune.id, 2], ['sorcier', 2]], 'le journal des soins allume les éclats');
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
  const eirik = poser(d, 'joueur', 'scalde-des-runes');
  poser(d, 'joueur', 'dune-marchante'); // pleine : 4/4
  d.joueur.pv -= 2;
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
  const eirik = poser(d, 'joueur', 'scalde-des-runes');
  activer(d, daimyo.id);                 // +2/+1 : 4/5 PV, plafond 5
  assert.equal(dune.pv, 5);
  d.joueur.pv -= 2;
  dune.pv = 3;                           // une blessure à remonter
  const tirs = activer(d, eirik.id);
  assert.deepEqual(tirs.map((tir) => tir.cible.entiteId ?? tir.cible.type), [dune.id, 'sorcier']);
  assert.equal(dune.pv, 5, 'soignée jusqu’au plafond relevé — pas ramenée aux 4 PV imprimés');
});

test('la fenêtre d’effet activé passe au-dessus de toutes les cartes', () => {
  const jsx = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
  // Le portail échappe aux piles et rangées tout en restant dans la table,
  // sous ses annonces et ses effets de combat.
  assert.match(jsx, /closest\('\.card-table'\)/u);
  assert.match(jsx, /createPortal\(/u);
  assert.match(css, /\.rpg-card__effet-menu\s*\{[^}]*z-index:\s*44/u);
  // Aucune prop n'est câblée sur les rangées en JSX : les
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
  assert.match(resoudre, /executerActivation\(sourceId, entite\.id/u);
  const executer = jsx.slice(jsx.indexOf('const executerActivation ='), jsx.indexOf('const resoudreActivation = (entite)'));
  assert.match(executer, /prendreInstantaneChamp\(\)/u);
  assert.match(executer, /animerModificationsChamp\(champAvantAction, \[\], debutJournalDestructions\)/u);
  const sansCible = jsx.slice(jsx.indexOf("if (activation?.cible === 'aucune')"), jsx.indexOf('const engagerPourMana'));
  assert.match(sansCible, /prendreInstantaneChamp\(\)/u);
  assert.match(sansCible, /animerModificationsChamp\(champAvantAction, \[\], debutJournalDestructions\)/u);
});
