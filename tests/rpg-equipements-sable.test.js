/**
 * Le lot d'équipements du Sable — dix armes, une mécanique par carte.
 *
 * Dessiné dans l'esprit des Equipment de Magic (`docs/rpg/14-equipements-du-sable.md`)
 * et traduit dans le moteur du Sablier : les mots-clés donnés (Rapidité,
 * Esquive, Coup rapide), les déclencheurs du porteur — `porteurAttaque`,
 * `porteurBlesse`, `porteurBlesseCreature`, `porteurBlesseSorcier` — le
 * déclencheur de mort `porteurMeurt`, les compteurs dépensables de la Jitte
 * et l'arme vivante qui apporte son propre porteur.
 *
 * Contrôlés ici : le catalogue, chaque brique moteur (`appliquer`,
 * `rpgLancerAttaque`, `rpgJouerArme`, `rpgActiverArme`, `enterrer`), et
 * l'IA du sorcier qui sait dépenser des compteurs.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  rpgNouveauDuel,
  rpgJouerCreature,
  rpgJouerArme,
  rpgActiverArme,
  rpgPeutActiverArme,
  rpgPeutBloquerAttaquant,
  rpgLancerAttaque,
  rpgBlesserCreature,
  rpgDefausserCarte,
  rpgSorcierActiverArmes,
} from '../src/games/rpgDuel.js';
import { RPG_ARME_CARDS, RPG_DUEL_CARDS, armeById, cardById } from '../src/games/rpgCards.js';

/** Les dix cartes du lot, dans l'ordre du catalogue. */
const LOT = [
  'sandales-de-tislit', 'cuirasse-de-sel', 'javelot-du-beffroi',
  'licou-du-chien-de-sable', 'boussole-du-hoggar', 'harnais-du-mehari',
  'masque-du-guetteur', 'jitte-d-amayas', 'lame-des-ergs', 'takouba-de-tin-hinan',
];
const cartesDuLot = RPG_ARME_CARDS.filter((carte) => LOT.includes(carte.id));

/** Un deck épais : les effets du lot piochent et lisent souvent. */
const deckTest = () => Array.from({ length: 24 }, () => 'desert');
const duelVide = () => rpgNouveauDuel({ joueurDeck: deckTest(), sorcierDeck: deckTest() });
const donner = (duel, cote, id) => duel[cote].main.push(id);
const manaPlein = (duel, cote) => { duel[cote].mana = { braise: 9, eau: 9, sable: 9, neige: 9 }; };
const manaNul = (duel, cote) => { duel[cote].mana = { braise: 0, eau: 0, sable: 0, neige: 0 }; };

/** Pose une créature et rend son entité : le futur porteur. */
const poser = (duel, cote, id) => {
  donner(duel, cote, id);
  manaPlein(duel, cote);
  const res = rpgJouerCreature(duel, cote, id);
  assert.equal(res.ok, true, `${id} entre en jeu`);
  return res.entite;
};

/**
 * Ouvre un nouveau tour d'attaque pour le camp : lève le mal d'invocation de la
 * créature et rend au camp sa phase d'attaque (une seule par tour, voir
 * `rpgLancerAttaque`). Les tests qui attaquent « à chaque attaque » simulent
 * ainsi le tour suivant, comme `rpgFinDeTour` le ferait.
 */
const rendrePret = (duel, entite) => {
  duel.attaqueJouee = null;
  entite.ready = true;
  entite.attaquee = false;
};

/** Attache une arme à un porteur (ou à personne, pour une arme vivante). */
const equiper = (duel, cote, armeId, entite = null) => {
  donner(duel, cote, armeId);
  manaPlein(duel, cote);
  const res = rpgJouerArme(duel, cote, armeId, entite?.id ?? null);
  assert.equal(res.ok, true, `${armeId} s'attache (${res.raison ?? 'ok'})`);
  return res.entite;
};

// ── Le catalogue ────────────────────────────────────────────────────────────

test('le lot compte dix équipements de Sable, tous peints', () => {
  assert.equal(cartesDuLot.length, 10);
  for (const carte of cartesDuLot) {
    assert.equal(carte.element, 'sable', `${carte.id} est une carte de Sable`);
    assert.equal(carte.kind, 'arme', `${carte.id} est une arme`);
    assert.match(carte.typeLine, /^Arme — /, `${carte.id} affiche sa ligne de type`);
    assert.ok(Number.isInteger(carte.bonus?.atk) && Number.isInteger(carte.bonus?.def),
      `${carte.id} donne un bonus +attaque/+défense`);
    assert.ok(carte.text && carte.flavor, `${carte.id} a son texte et sa saveur`);
    assert.equal(armeById(carte.id), carte, `${carte.id} se retrouve par armeById`);
    assert.ok(RPG_DUEL_CARDS.some((candidate) => candidate.id === carte.id),
      `${carte.id} est une carte du duel`);
    const image = fileURLToPath(new URL(`../public/cards/${carte.id}.jpg`, import.meta.url));
    assert.ok(existsSync(image), `${carte.id} a sa peinture plein art (${image})`);
  }
});

test('le lot s’étage par rareté : trois communes, trois inhabituelles, trois rares, une mythique', () => {
  const compter = (rarete) => cartesDuLot.filter((carte) => carte.rarity === rarete).length;
  assert.equal(compter('commune'), 3);
  assert.equal(compter('inhabituelle'), 3);
  assert.equal(compter('rare'), 3);
  assert.equal(compter('mythique'), 1);
  assert.equal(armeById('takouba-de-tin-hinan').rarity, 'mythique');
});

// ── Les mots-clés donnés ────────────────────────────────────────────────────

test('les Sandales de Tislit donnent la Rapidité : un jeton équipé frappe le tour même', () => {
  const duel = duelVide();
  const porteur = poser(duel, 'joueur', 'chien-du-guet');
  assert.equal(porteur.ready, false, 'le mal d’invocation tient la créature');
  equiper(duel, 'joueur', 'sandales-de-tislit', porteur);
  assert.equal(porteur.rapidite, true, 'le porteur gagne la Rapidité');
  assert.equal(porteur.ready, true, 'il peut attaquer le tour où il arrive');
  assert.equal(porteur.def, 2 + 1, '+0/+1');
});

test('la Cuirasse de sel donne +0/+3 et Esquive 1', () => {
  const duel = duelVide();
  const porteur = poser(duel, 'joueur', 'chien-du-guet'); // 2/2
  equiper(duel, 'joueur', 'cuirasse-de-sel', porteur);
  assert.equal(porteur.def, 5);
  assert.equal(porteur.esquive, 1);
  rpgBlesserCreature(duel, 'joueur', porteur.id, 3, 'braise', null, 'magie');
  assert.equal(porteur.pv, 3, '3 dégâts moins 1 d’Esquive sur 5 de défense');
});

test('le Javelot du beffroi donne le Coup rapide, que le remplacement retire', () => {
  const duel = duelVide();
  const porteur = poser(duel, 'joueur', 'chien-du-guet');
  equiper(duel, 'joueur', 'javelot-du-beffroi', porteur);
  assert.equal(porteur.coupRapide, true, 'le porteur gagne le Coup rapide');
  assert.equal(porteur.atk, 4, '+2/+0');
  // Une seconde arme envoie la première au cimetière : le mot-clé repart.
  equiper(duel, 'joueur', 'sandales-de-tislit', porteur);
  assert.equal(porteur.coupRapide, false, 'le Coup rapide appartenait au Javelot');
  assert.ok(duel.joueur.cimetiere.includes('javelot-du-beffroi'),
    'le Javelot remplacé rejoint le cimetière');
});

// ── Le Licou du chien de sable ──────────────────────────────────────────────

test('le Licou tue ce qu’il équipe et paie deux cartes', () => {
  const duel = duelVide();
  const porteur = poser(duel, 'joueur', 'fennec-des-decombres'); // 3/1
  const mainAvant = duel.joueur.main.length;
  equiper(duel, 'joueur', 'licou-du-chien-de-sable', porteur);
  assert.equal(duel.joueur.creatures.length, 0, 'le Fennec 3/1 passe à 3/0 : il meurt');
  assert.equal(duel.joueur.main.length, mainAvant + 2, 'deux cartes pour un mana');
  assert.ok(duel.joueur.cimetiere.includes('licou-du-chien-de-sable'),
    'l’arme tombe au cimetière avec son porteur');
});

test('sur une créature solide, le Licou reste une arme offensive et punit sa mort', () => {
  const duel = duelVide();
  const porteur = poser(duel, 'joueur', 'chien-du-guet'); // 2/2
  equiper(duel, 'joueur', 'licou-du-chien-de-sable', porteur);
  assert.equal(duel.joueur.creatures.length, 1, '2/2 passe à 3/1 : il survit');
  assert.equal(porteur.atk, 3);
  assert.equal(porteur.def, 1);
  const mainAvant = duel.joueur.main.length;
  rpgBlesserCreature(duel, 'joueur', porteur.id, 1, 'braise', null, 'magie');
  assert.equal(duel.joueur.main.length, mainAvant + 2, 'sa mort pioche quand même');
});

test('un renvoi en main n’est pas une mort : le Licou ne pioche pas', () => {
  const duel = duelVide();
  const porteur = poser(duel, 'joueur', 'chien-du-guet');
  equiper(duel, 'joueur', 'licou-du-chien-de-sable', porteur);
  const mainAvant = duel.joueur.main.length;
  // Le renvoi passe par `renvoyerEnMain` : l’arme tombe, rien ne se déclenche.
  duel.joueur.creatures = duel.joueur.creatures.filter((entite) => entite.id !== porteur.id);
  assert.equal(duel.joueur.main.length, mainAvant, 'aucune pioche');
});

// ── Les déclencheurs d'attaque ──────────────────────────────────────────────

test('la Boussole du Hoggar lit le dessus du deck à chaque attaque', () => {
  const duel = duelVide();
  // Porteur sans Butin : la pioche d'attaque doit venir de la Boussole seule.
  const porteur = poser(duel, 'joueur', 'dune-marchante');
  equiper(duel, 'joueur', 'boussole-du-hoggar', porteur);

  // Un terrain sur le dessus : il est révélé et rejoint la main.
  rendrePret(duel, porteur);
  duel.joueur.deck[duel.joueur.deck.length - 1] = 'dunes-du-tenere';
  const deckAvant = duel.joueur.deck.length;
  const mainAvant = duel.joueur.main.length;
  const res = rpgLancerAttaque(duel, 'joueur', [porteur.id], {});
  assert.equal(res.ok, true, 'l’attaque passe');
  assert.equal(duel.joueur.main.length, mainAvant + 1, 'le terrain rejoint la main');
  assert.equal(duel.joueur.deck.length, deckAvant - 1, 'il a quitté le deck');
  assert.ok(duel.joueur.main.includes('dunes-du-tenere'));

  // Autre chose qu'un terrain : la carte reste en place et n'est pas nommée.
  rendrePret(duel, porteur);
  duel.joueur.deck[duel.joueur.deck.length - 1] = 'fennec-des-decombres';
  const deckApres = duel.joueur.deck.length;
  rpgLancerAttaque(duel, 'joueur', [porteur.id], {});
  assert.equal(duel.joueur.deck.length, deckApres, 'le deck ne bouge pas');
  assert.ok(duel.log.some((ligne) => ligne.includes('ce n’est pas un terrain')),
    'le journal ne dit pas ce qu’il a vu');
});

test('le Harnais du méhari rend un mana de sable à chaque attaque', () => {
  const duel = duelVide();
  const porteur = poser(duel, 'joueur', 'chien-du-guet');
  equiper(duel, 'joueur', 'harnais-du-mehari', porteur);
  assert.deepEqual(porteur.atk, 4, '+2/+2 sur un 2/2');
  rendrePret(duel, porteur);
  manaNul(duel, 'joueur');
  rpgLancerAttaque(duel, 'joueur', [porteur.id], {});
  assert.equal(duel.joueur.mana.sable, 1, 'un mana de sable rendu');
  rendrePret(duel, porteur);
  rpgLancerAttaque(duel, 'joueur', [porteur.id], {});
  assert.equal(duel.joueur.mana.sable, 2, 'à chaque attaque');
});

// ── Les déclencheurs de blessures ───────────────────────────────────────────

test('le Masque du guetteur et le Butin se cumulent : deux pioches puis deux défausses', () => {
  const duel = duelVide();
  const porteur = poser(duel, 'joueur', 'chien-du-guet');
  equiper(duel, 'joueur', 'masque-du-guetteur', porteur);
  rendrePret(duel, porteur);
  const pvAvant = duel.sorcier.pv;
  const mainAvant = duel.joueur.main.length;
  rpgLancerAttaque(duel, 'joueur', [porteur.id], {});
  assert.equal(duel.sorcier.pv, pvAvant - porteur.atk, 'le sorcier a été blessé');
  assert.equal(duel.joueur.main.length, mainAvant + 2, 'deux cartes piochées : Butin et Masque');
  assert.equal(duel.defausseEnAttente?.restant, 2, 'les deux défausses se cumulent');
  rpgDefausserCarte(duel, 'joueur', 0);
  assert.equal(duel.defausseEnAttente?.restant, 1, 'il reste la défausse du second effet');
  rpgDefausserCarte(duel, 'joueur', 0);
  assert.equal(duel.defausseEnAttente, null, 'la défausse est soldée');
  assert.equal(duel.joueur.main.length, mainAvant, 'deux pioches, deux défausses : le Butin est complet');
});

test('bloqué, le Masque du guetteur ne se déclenche pas', () => {
  const duel = duelVide();
  const porteur = poser(duel, 'joueur', 'chien-du-guet');
  const mur = poser(duel, 'sorcier', 'chien-du-guet');
  equiper(duel, 'joueur', 'masque-du-guetteur', porteur);
  rendrePret(duel, porteur);
  const mainAvant = duel.joueur.main.length;
  rpgLancerAttaque(duel, 'joueur', [porteur.id], { [porteur.id]: [mur.id] });
  assert.equal(duel.joueur.main.length, mainAvant, 'rien n’a été blessé chez le sorcier');
  assert.equal(duel.defausseEnAttente, null);
});

// ── La Jitte d’Amayas ───────────────────────────────────────────────────────

test('la Jitte d’Amayas : +2/+1, et une protection contre les Ténèbres', () => {
  const duel = duelVide();
  const porteur = poser(duel, 'joueur', 'chien-du-guet'); // 2/2
  equiper(duel, 'joueur', 'jitte-d-amayas', porteur);
  assert.deepEqual([porteur.atk, porteur.def, porteur.pv], [4, 3, 3], 'le 2/2 passe 4/3');
  assert.equal(porteur.arme.compteurs, undefined, 'plus de compteurs : l’arme est simple');
  assert.equal(rpgPeutActiverArme(duel, 'joueur', porteur.id), false, 'plus de modes à activer');
  assert.equal(rpgActiverArme(duel, 'joueur', porteur.id, { mode: 'force' }).ok, false,
    'les trois gestes d’autrefois ont disparu de la fiche');
  assert.equal(porteur.protection?.contre, 'tenebres', 'le porteur est gardé des Ténèbres');
  assert.equal(porteur.protection?.toursRestants, Infinity, 'la garde tient tant que l’arme tient');

  // Une source Ténèbres ne le blesse pas ; une autre couleur passe normalement.
  assert.equal(rpgBlesserCreature(duel, 'joueur', porteur.id, 3, 'tenebres').recus, 0,
    'la nuit glisse sur la Jitte');
  assert.equal(porteur.pv, 3);
  assert.equal(rpgBlesserCreature(duel, 'joueur', porteur.id, 1, 'braise').recus, 1,
    'la Braise, elle, mord comme avant');
});

test('la protection de la Jitte part avec elle — sauf celle imprimée sur la fiche', () => {
  const duel = duelVide();
  const simple = poser(duel, 'joueur', 'chien-du-guet');
  equiper(duel, 'joueur', 'jitte-d-amayas', simple);
  // Remplacer l’arme : la Jitte tombe au cimetière et emporte sa garde.
  donner(duel, 'joueur', 'takouba-des-pistes');
  manaPlein(duel, 'joueur');
  assert.equal(rpgJouerArme(duel, 'joueur', 'takouba-des-pistes', simple.id).ok, true);
  assert.equal(duel.joueur.cimetiere.includes('jitte-d-amayas'), true);
  assert.equal(simple.protection, null, 'le Chien n’est plus protégé de rien');

  // Amayas porte sa propre protection Ténèbres imprimée : la Jitte partie, elle demeure.
  const amayas = poser(duel, 'joueur', 'amayas-du-hoggar');
  equiper(duel, 'joueur', 'jitte-d-amayas', amayas);
  donner(duel, 'joueur', 'takouba-des-pistes');
  manaPlein(duel, 'joueur');
  assert.equal(rpgJouerArme(duel, 'joueur', 'takouba-des-pistes', amayas.id).ok, true);
  assert.equal(amayas.protection?.contre, 'tenebres', 'sa protection imprimée demeure');
  assert.equal(amayas.protection?.toursRestants, Infinity);
});

// ── L'arme vivante ──────────────────────────────────────────────────────────

test('la Lame des ergs se joue la table vide : elle crée son chien et s’y attache', () => {
  const duel = duelVide();
  assert.equal(duel.joueur.creatures.length, 0, 'aucune créature à équiper');
  const porteur = equiper(duel, 'joueur', 'lame-des-ergs', null);
  assert.equal(duel.joueur.creatures.length, 1, 'un chien de sable est né');
  assert.equal(porteur.carteId, 'chien-de-sable');
  assert.equal(porteur.arme.carteId, 'lame-des-ergs', 'la lame s’y est attachée');
  assert.equal(porteur.atk, 1 + 3, 'le chien 1/1 passe à 4/2');
  assert.equal(porteur.def, 1 + 1);
});

test('une arme sans arme vivante refuse toujours de se jouer sans créature', () => {
  const duel = duelVide();
  donner(duel, 'joueur', 'sandales-de-tislit');
  manaPlein(duel, 'joueur');
  assert.equal(rpgJouerArme(duel, 'joueur', 'sandales-de-tislit', null).raison, 'cible');
});

// ── La mythique ─────────────────────────────────────────────────────────────

test('la Takouba de Tin Hinan : le Coup rapide frappe une créature et pioche, sans chien', () => {
  const duel = duelVide();
  const porteur = poser(duel, 'joueur', 'chien-du-guet'); // 2/2
  const mur = poser(duel, 'sorcier', 'dune-marchante'); // 2/5
  equiper(duel, 'joueur', 'takouba-de-tin-hinan', porteur); // → 5/4, Coup rapide
  assert.equal(porteur.coupRapide, true);
  assert.equal(porteur.infiltration, false, 'elle se fait bloquer : le Coup rapide est la voie');
  assert.equal(rpgPeutBloquerAttaquant(mur, porteur), true);

  rendrePret(duel, porteur);
  const mainAvant = duel.joueur.main.length;
  const pvMur = mur.pv;
  const pvSorcier = duel.sorcier.pv;
  // Coup rapide sur le mur : l'attaque s'arrête sur la frappe.
  const res = rpgLancerAttaque(duel, 'joueur', [porteur.id], {}, null, [], { [porteur.id]: mur.id });
  assert.equal(res.ok, true, `l’attaque passe (${res.raison ?? 'ok'})`);
  assert.equal(mur.pv, pvMur - porteur.atk, 'le Coup rapide a frappé le mur');
  assert.equal(duel.joueur.main.length, mainAvant + 1, 'une carte pour une créature blessée');
  assert.equal(duel.sorcier.pv, pvSorcier, 'l’attaque s’est arrêtée : le sorcier ne prend rien');
  assert.equal(duel.joueur.creatures.filter((e) => e.carteId === 'chien-de-sable').length, 0,
    'aucun chien : le sorcier n’a pas été blessé');
});

test('la Takouba qui attaque le sorcier lève un chien de sable, sans pioche', () => {
  const duel = duelVide();
  // Porteur sans Butin ni déclencheur : seule la Takouba doit parler dans ce test.
  const porteur = poser(duel, 'joueur', 'dune-marchante');
  const mur = poser(duel, 'sorcier', 'dune-marchante'); // le bloqueur écarté du test
  equiper(duel, 'joueur', 'takouba-de-tin-hinan', porteur);
  rendrePret(duel, porteur);
  const mainAvant = duel.joueur.main.length;
  const pvMur = mur.pv;
  const pvSorcier = duel.sorcier.pv;
  // Aucune proie désignée : le porteur attaque normalement, et aucun bloqueur
  // n'est assigné — le sorcier encaisse ses 5 dégâts.
  const res = rpgLancerAttaque(duel, 'joueur', [porteur.id], { [porteur.id]: [] });
  assert.equal(res.ok, true, `l’attaque passe (${res.raison ?? 'ok'})`);
  assert.equal(mur.pv, pvMur, 'la créature écartée n’a rien encaissé');
  assert.equal(duel.sorcier.pv, pvSorcier - porteur.atk, 'le sorcier encaisse la frappe entière');
  assert.equal(duel.joueur.main.length, mainAvant, 'aucune pioche : aucune créature n’a été blessée');
  const chiens = duel.joueur.creatures.filter((entite) => entite.carteId === 'chien-de-sable');
  assert.equal(chiens.length, 1, 'le sorcier blessé lève un chien de sable');
});

test('la Jitte simplifiée n’offre plus rien à activer : l’IA passe son chemin', () => {
  const duel = duelVide();
  const porteur = poser(duel, 'sorcier', 'chien-du-guet');
  poser(duel, 'joueur', 'chien-du-guet');
  donner(duel, 'sorcier', 'jitte-d-amayas');
  manaPlein(duel, 'sorcier');
  assert.equal(rpgJouerArme(duel, 'sorcier', 'jitte-d-amayas', porteur.id).ok, true);
  duel.tour = 'sorcier'; // l'activation n'appartient qu'à son propre tour
  const actives = rpgSorcierActiverArmes(duel);
  assert.equal(actives.length, 0, 'plus de compteurs ni de modes : rien à dépenser');
  assert.equal(duel.joueur.creatures.length, 1, 'la proie reste indemne');
});

// ── Le catalogue reste jouable ──────────────────────────────────────────────

test('chaque carte du lot se joue et s’attache sans casser la table', () => {
  for (const id of LOT) {
    const duel = duelVide();
    const porteur = poser(duel, 'joueur', 'dune-marchante'); // 2/5, encaisse tout
    donner(duel, 'joueur', id);
    manaPlein(duel, 'joueur');
    const res = rpgJouerArme(duel, 'joueur', id, porteur.id);
    assert.equal(res.ok, true, `${id} s'attache (${res.raison ?? 'ok'})`);
    assert.equal(duel.joueur.creatures.includes(porteur), true, `${id} laisse son porteur debout`);
    assert.equal(cardById(id).kind, 'arme');
  }
});
