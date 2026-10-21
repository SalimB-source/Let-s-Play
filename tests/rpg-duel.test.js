import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  RPG_MAIN_DEPART,
  RPG_PV_JOUEUR,
  RPG_PV_SORCIER_BASE,
  RPG_PV_SORCIER_PAR_PUISSANCE,
  rpgAttaquerCreature,
  rpgAttaquerSorcier,
  rpgBlesserCreature,
  rpgChoisirBloqueurs,
  rpgEngagerTerrain,
  rpgEstProtegee,
  rpgFinDeTour,
  rpgJouerCreature,
  rpgLancerAttaque,
  rpgMana,
  rpgMulligan,
  rpgMulliganSorcier,
  rpgNouveauDuel,
  rpgReglerHasard,
  rpgPeutMulligan,
  rpgNombreDestructions,
  rpgPeutAttaquer,
  rpgPeutBloquerAttaquant,
  rpgBlocageForceValide,
  rpgProvocationValide,
  rpgResonanceEnJeu,
  rpgResoudreDestructionCiblee,
  rpgDissiperDestructionsSansCible,
  rpgDestructionsDepuis,
  rpgDerniereBlessure,
  rpgNombreBlessures,
  rpgBlessuresDepuis,
  rpgOuvrirFenetreReponse,
  rpgPiocher,
  rpgPeutPayer,
  rpgPoserTerrain,
  rpgSorcierPv,
  rpgTourSorcierIA,
  rpgVainqueur,
  rpgActionsEtat,
  rpgContreJouable,
  rpgActiverCapacite,
  RPG_PHASES,
  RPG_PHASES_LIBELLES,
  rpgOuvrirFinDeTour,
  rpgPeutRepondre,
  rpgSorcierMagieRapide,
  arriveeCiblePortee,
  arriveeConsulteDeck,
  arriveeACibleLegale,
  rpgResoudreArriveeCiblee,
} from '../src/games/rpgDuel.js';
import {
  CARD_RARITIES,
  RPG_CREATURE_CARDS,
  RPG_DUEL_CARDS,
  RPG_DECK_JOUEUR_BASE,
  RPG_DECK_SORCIER_BASE,
  RPG_HERO_CARDS,
  RPG_MAGIE_CARDS,
  RPG_TERRAIN_CARDS,
  RPG_TOUR_CARDS,
  RPG_DECKS,
  cardArtId,
  cardById,
  cardColorCost,
  cardColors,
  cardRarityInfo,
  creatureById,
  terrainManaColors,
  RPG_DECK_HYBRIDE_BASE,
  RPG_ART_PROVISOIRE,
  RPG_DECK_NEIGE_BASE,
  RPG_DECK_TENEBRES_BASE,
  RPG_DECK_LETTRES_DE_MARQUE_BASE,
  RPG_ELEMENTS,
  cardCopyLimit,
  cardHasPrintedType,
  cardReceivesResonance,
  carteJouableSansTerrain,
  rpgValiderDeck,
} from '../src/games/rpgCards.js';
import { rpgLancerMagie, rpgRenvoisEnMain } from '../src/games/rpgDuel.js';
import { choisirMulliganIA } from '../src/games/rpgAI.js';

/** Main de départ générique, mélangée de façon fixe. */
const duelDeBase = (opts = {}) => rpgNouveauDuel({
  joueurDeck: ['chien-du-guet', 'chien-du-guet', 'fennec-des-decombres', 'porteuse-de-cruches', 'guetteur-du-beffroi', 'dune-marchante', 'colosse-de-sel', 'vipere-de-verre', 'sonneur-fele', 'djinn-du-souk', 'scribe-de-la-liste', 'chien-du-guet'],
  sorcierDeck: ['chien-du-guet', 'dune-marchante', 'chien-du-guet', 'dune-marchante', 'chien-du-guet', 'dune-marchante', 'chien-du-guet', 'dune-marchante'],
  rng: () => 0.5,
  ...opts,
});

/** Glisse une carte précise en main (le test ne dépend pas du mélange). */
const donner = (duel, cote, carteId) => duel[cote].main.push(carteId);

/** Donne directement du mana (le paiement est testé à part). */
const donnerMana = (duel, cote, n) => { duel[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((couleur) => [couleur, n])); };

/** Les peintures livrées au ratio de la face (4:5) : direction artistique `RPG-CARD-ART.md`. */
const PLEIN_ART_45 = [
  'eau-de-la-source', 'lame-de-mer', 'brisure-de-verre', 'parade-du-verre',
  'maree-contraire', 'ressac', 'courant-de-retour', 'dunes-du-tenere',
  'cretes-de-cendre', 'lagune-des-salines', 'petra-des-deux-sources',
  'glacier-des-arches',
  'djinn-de-foudre', 'sonneur-fele', 'silence-decume',
  // Le lot du gel du Serment : six peintures en fresque, livrées au ratio de
  // la face comme le reste de la collection.
  'poigne-de-givre', 'grand-voile-blanc', 'appat-de-la-meute',
  'verglas', 'defi-du-jarl', 'embuscade',
  // Le Grand Hiver et la Hache de la banquise, les deux dernières cartes du
  // Serment : la première en huile, la seconde dans la dérogation
  // photoréaliste des armes, toutes deux au ratio de la face.
  'grand-hiver', 'hache-de-la-banquise',
  // Les créatures-jetons de Tarek : deux chiens de sable peints dans la
  // palette de son illustration, livrés eux aussi au format de la face.
  'chien-de-sable',
  // Le Samouraï levé par le Daimyō du Soleil rouge, dans la palette kaiga du
  // set japonais : lui aussi livré au ratio de la face.
  'samourai-du-daimyo',
  // Les quatre armes du prototype, peintes comme le reste du catalogue.
  'takouba-des-pistes', 'baton-des-citernes', 'armure-de-cendres', 'lance-de-givre',
  // Le lot d'équipements du Sable : dix peintures au ratio de la face, dans la
  // dérogation « nihonga coloré » documentée par `RPG-CARD-ART.md`.
  'sandales-de-tislit', 'cuirasse-de-sel', 'javelot-du-beffroi',
  'licou-du-chien-de-sable', 'boussole-du-hoggar', 'harnais-du-mehari',
  'masque-du-guetteur', 'jitte-d-amayas', 'lame-des-ergs', 'takouba-de-tin-hinan',
  // La refonte du Père des corbeaux (Odin photoréaliste) est livrée elle
  // aussi au ratio exact de la face.
  'pere-des-corbeaux',
  // Les quatre porteurs humains de Furie, repeints en photoréaliste
  // fantaisiste : leurs faces intactes rejoignent le garde-fou du ratio de
  // la face (leurs doubles `*-furie.jpg` sont mesurés par
  // `check:rpg-furie-preview`).
  'guerrier-au-bouclier-rond', 'berserk-des-trois-hivers',
  'jarl-au-marteau-de-guerre', 'maitre-du-marteau',
  // La révision Neige : l’huile intacte du Loup et les nouveaux pleins arts
  // du Mur de boucliers, de l’Éclair du marteau et de la Brume du fjord.
  'loup-des-neiges', 'mur-de-boucliers', 'eclair-du-marteau', 'brume-du-fjord',
  // Les héros repeints en nihonga sur feuille d’or : livrés eux aussi au
  // ratio exact de la face, désormais contrôlé comme le reste.
  'salem', 'yamina', 'feriel', 'tarek', 'boualem',
  // Le Serpent du monde reçoit la même passe que les héros du récit.
  'serpent-du-monde',
];

const VARIANTES_TERRAIN = [
  ['dunes-du-tenere', 'desert'],
  ['cretes-de-cendre', 'montagne'],
  ['lagune-des-salines', 'mer'],
  ['petra-des-deux-sources', 'petra'],
  ['glacier-des-arches', 'glacier'],
];

/** Largeur et hauteur d'un JPEG, lues dans son en-tête SOF (aucune dépendance). */
function dimensionsJpeg(chemin) {
  const octets = readFileSync(chemin);
  if (octets[0] !== 0xff || octets[1] !== 0xd8) throw new Error(`${chemin} n’est pas un JPEG`);
  for (let i = 2; i + 9 < octets.length;) {
    if (octets[i] !== 0xff) { i += 1; continue; }
    const balise = octets[i + 1];
    const estSof = balise >= 0xc0 && balise <= 0xcf
      && ![0xc4, 0xc8, 0xcc].includes(balise);
    if (estSof) return [octets.readUInt16BE(i + 7), octets.readUInt16BE(i + 5)];
    i += 2 + octets.readUInt16BE(i + 2);
  }
  throw new Error(`dimensions introuvables dans ${chemin}`);
}

test('les bordures utilisent les cinq raretés — l’Épique de la Neige comprise — et acceptent uncommon', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(CARD_RARITIES).map(([key, rarity]) => [key, rarity.color])), {
    commune: '#f1f3f5',
    inhabituelle: '#4d9aff',
    rare: '#e1b33f',
    mythique: '#a875ed',
  });
  assert.equal(cardRarityInfo({ rarity: 'uncommon' }).key, 'inhabituelle');
  assert.equal(cardRarityInfo({ rarity: 'inhabituelle' }).color, CARD_RARITIES.inhabituelle.color);
  assert.equal(cardRarityInfo({ rarity: 'inconnue' }).key, 'commune');
  const carteFennec = cardById('fennec-des-decombres');
  assert.deepEqual({ cost: carteFennec.cost, atk: carteFennec.atk, def: carteFennec.def, rarity: carteFennec.rarity, butin: carteFennec.butin, rapidite: carteFennec.rapidite }, {
    cost: 2, atk: 3, def: 1, rarity: 'inhabituelle', butin: true, rapidite: true,
  });
});

test('le Cavalier amazigh est une rare Sable incluse dans le deck et le catalogue complet', () => {
  const cavalier = cardById('cavalier-amazigh-du-desert');
  assert.deepEqual({ element: cavalier.element, cost: cavalier.cost, atk: cavalier.atk, def: cavalier.def, rarity: cavalier.rarity }, {
    element: 'sable', cost: 5, atk: 4, def: 4, rarity: 'rare',
  });
  assert.equal(cavalier.typeLine, 'Créature — Guerrier amazigh');
  assert.deepEqual(cavalier.arrivee, { type: 'combat', cible: 'creature' });
  assert.match(cavalier.text, /se bat contre une créature adverse ciblée/i);
  assert.equal(RPG_DUEL_CARDS.some((carte) => carte.id === cavalier.id && carte.kind === 'creature'), true);
  assert.equal(RPG_DECK_JOUEUR_BASE.filter((id) => id === cavalier.id).length, 2,
    'le deck Veilleurs du Désert aligne le Cavalier à son maximum légal');
  assert.equal(rpgValiderDeck(RPG_DECK_JOUEUR_BASE).ok, true, 'le deck conserve ses 40 cartes et sa limite d’exemplaires');
  assert.equal(new Set(RPG_DUEL_CARDS.map((carte) => carte.id)).size, RPG_DUEL_CARDS.length,
    'le catalogue réunit les cartes sans doublon');
  assert.deepEqual(new Set(RPG_DUEL_CARDS.map((carte) => carte.kind)),
    new Set(['creature', 'hero', 'magie', 'arme']));
});

test('le set de créatures existe : soixante-dix-sept cartes façon TCG (coût, attaque, défense, rareté, type)', () => {
  assert.equal(RPG_CREATURE_CARDS.length, 77, 'le Djinn du souk est retiré du jeu, les Lettres de Marque ajoutent dix cartes');
  for (const carte of RPG_CREATURE_CARDS) {
    assert.ok(carte.id && carte.name, 'chaque carte a un identifiant et un nom');
    assert.ok(Number.isFinite(carte.cost) && carte.cost >= 0, 'chaque carte a un coût');
    assert.ok(carte.atk >= 0 && carte.def >= 1, 'chaque carte a attaque et défense');
    assert.ok(Object.hasOwn(CARD_RARITIES, carte.rarity), 'chaque carte a une rareté connue');
    assert.ok(RPG_ELEMENTS.includes(carte.element), 'chaque carte a un type parmi les quatre couleurs');
  }
  assert.equal(creatureById('djinn-du-souk'), null, 'le Djinn du souk n’existe plus');
});

test('les cinq Tours de défense appartiennent au catalogue et peuvent être jouées', () => {
  assert.deepEqual(RPG_TOUR_CARDS.map((carte) => carte.id), [
    'tour-de-braise', 'tour-des-flots', 'tour-de-sable', 'tour-de-neige', 'tour-des-tenebres',
  ]);

  for (const tour of RPG_TOUR_CARDS) {
    const carteCatalogue = RPG_DUEL_CARDS.find((carte) => carte.id === tour.id);
    assert.equal(carteCatalogue?.kind, 'creature', `${tour.name} est affichée parmi les créatures du catalogue`);
    assert.equal(creatureById(tour.id)?.id, tour.id, `${tour.name} se résout comme une créature`);
    assert.equal(carteJouableSansTerrain(carteCatalogue), true,
      `${tour.name} est éligible au format et peut entrer dans un deck`);
    assert.equal(cardCopyLimit(carteCatalogue), tour.rarity === 'mythique' ? 1 : 2,
      `${tour.name} respecte la limite d’exemplaires de sa rareté`);
  }
});

// ── La capacité de clan du Nord : la Furie ─────────────────────────────────

test('la Furie du Nord : +X/+0 sous la DEF de base, éteinte par le soin et rallumée par une nouvelle blessure', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 40);
  donnerMana(duel, 'sorcier', 40);

  // Furie du catalogue : 1 pour le Loup, 2 pour le Guerrier et le Berserk,
  // 3 pour le Jarl et pour le Maître du marteau. Les faces se contentent de
  // « Furie X. » : aucune ne récite la règle de soin et de réactivation.
  for (const [id, furie] of [
    ['guerrier-au-bouclier-rond', 2],
    ['loup-des-neiges', 1],
    ['berserk-des-trois-hivers', 2],
    ['jarl-au-marteau-de-guerre', 3],
    ['maitre-du-marteau', 3],
  ]) {
    const carte = cardById(id);
    assert.equal(carte.furie, furie, `${carte.name} porte Furie ${furie}`);
    assert.match(carte.text, new RegExp(`(?:^|\\. )Furie ${furie}\\.`),
      `${carte.name} nomme sobrement sa Furie`);
    assert.doesNotMatch(carte.text, /première fois|gagne \+\d+\/\+\d+|retrouve sa défense|nouvelle chute/,
      `${carte.name} ne porte pas l’explication complète de l’état réversible`);
  }

  // Guerrier 1/3, bouclier de 1 : un coup absorbé ne le fait pas passer
  // sous sa DEF de base imprimée (3).
  donner(duel, 'joueur', 'guerrier-au-bouclier-rond');
  const guerrier = rpgJouerCreature(duel, 'joueur', 'guerrier-au-bouclier-rond').entite;
  assert.equal(guerrier.bouclier, 1);
  assert.equal(guerrier.bouclierEpuise, false, 'le bouclier accordé n’est pas encore dépensé');
  assert.equal(rpgBlesserCreature(duel, 'joueur', guerrier.id, 1, 'braise').recus, 0);
  assert.equal(guerrier.bouclierEpuise, true, 'son dernier point absorbé, le bouclier est tombé');
  assert.deepEqual(
    [guerrier.atk, guerrier.def, guerrier.pv, guerrier.pvMax, guerrier.furieDeclenchee, guerrier.furieBonusAtk],
    [1, 3, 3, 3, false, 0],
    'le bouclier a tout absorbé : aucun écart sous la DEF de base',
  );

  // Blessé pour de bon : seule l’attaque monte, ni PV ni plafond ne bougent.
  assert.equal(rpgBlesserCreature(duel, 'joueur', guerrier.id, 2, 'braise').recus, 2);
  assert.deepEqual(
    [guerrier.atk, guerrier.def, guerrier.pv, guerrier.pvMax, guerrier.furieDeclenchee, guerrier.furieBonusAtk],
    [3, 1, 1, 3, true, 2],
    'Furie 2 : +2/+0, sans rendre de PV',
  );

  // Le soin d’arrivée de la Valkyrie des glaces referme exactement la
  // blessure : le Guerrier retrouve sa DEF de base et rend son +2.
  donner(duel, 'joueur', 'valkyrie-des-glaces');
  const valkyrie = rpgJouerCreature(duel, 'joueur', 'valkyrie-des-glaces').entite;
  assert.deepEqual([valkyrie.atk, valkyrie.def, valkyrie.pv, valkyrie.pvMax], [5, 5, 5, 5]);
  assert.deepEqual(
    [guerrier.atk, guerrier.pv, guerrier.pvMax, guerrier.furieDeclenchee, guerrier.furieBonusAtk],
    [1, 3, 3, false, 0],
    'à sa DEF de base, la Furie retombe et seul son bonus repart',
  );
  assert.ok(duel.log.includes('Guerrier au bouclier rond retrouve sa DEF de base : la furie retombe.'));

  // Une nouvelle blessure la rallume, sans la cumuler avec l’ancienne.
  rpgBlesserCreature(duel, 'joueur', guerrier.id, 1, 'braise');
  assert.deepEqual(
    [guerrier.atk, guerrier.pv, guerrier.pvMax, guerrier.furieDeclenchee, guerrier.furieBonusAtk],
    [3, 2, 3, true, 2],
    'la Furie peut revenir après avoir été soignée',
  );
  assert.equal(
    duel.log.filter((ligne) => ligne === 'Guerrier au bouclier rond entre en furie : +2/+0.').length,
    2,
    'les deux entrées en Furie sont journalisées',
  );
  assert.equal(rpgBlesserCreature(duel, 'joueur', guerrier.id, 5, 'braise').ok, true);
  assert.equal(duel.joueur.creatures.includes(guerrier), false, 'une créature qui meurt ne s’énerve pas');
  assert.equal(duel.joueur.cimetiere.includes('guerrier-au-bouclier-rond'), true);

  // Furie 3 : le Jarl 2/5 devient 5/4 après un point de dégâts.
  donner(duel, 'joueur', 'jarl-au-marteau-de-guerre');
  const jarl = rpgJouerCreature(duel, 'joueur', 'jarl-au-marteau-de-guerre').entite;
  assert.deepEqual([jarl.atk, jarl.def, jarl.pv, jarl.pvMax], [2, 5, 5, 5]);
  rpgBlesserCreature(duel, 'joueur', jarl.id, 1, 'braise');
  assert.deepEqual(
    [jarl.atk, jarl.def, jarl.pv, jarl.pvMax, jarl.furieDeclenchee, jarl.furieBonusAtk],
    [5, 4, 4, 5, true, 3],
    'Furie 3 : +3/+0',
  );

  // Une blessure de plus ne regagne pas le bonus déjà actif.
  rpgBlesserCreature(duel, 'joueur', jarl.id, 2, 'braise');
  assert.deepEqual(
    [jarl.atk, jarl.def, jarl.pv, jarl.pvMax, jarl.furieDeclenchee, jarl.furieBonusAtk],
    [5, 2, 2, 5, true, 3],
    'déjà en Furie : le bonus ne se cumule pas',
  );

  // Les blessures de combat synchronisent le même état.
  donner(duel, 'joueur', 'jarl-au-marteau-de-guerre');
  const jarlNeuf = rpgJouerCreature(duel, 'joueur', 'jarl-au-marteau-de-guerre').entite;
  donner(duel, 'sorcier', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  chien.ready = true;
  assert.equal(rpgAttaquerCreature(duel, 'sorcier', chien.id, jarlNeuf.id).ok, true);
  assert.equal(duel.joueur.creatures.includes(jarlNeuf), true, 'le Jarl encaisse les 2 dégâts sans mourir');
  assert.deepEqual(
    [jarlNeuf.atk, jarlNeuf.def, jarlNeuf.pv, jarlNeuf.pvMax, jarlNeuf.furieDeclenchee, jarlNeuf.furieBonusAtk],
    [5, 3, 3, 5, true, 3],
    'la blessure de combat allume la Furie 3, sans défense gagnée',
  );

  // Le seuil est la DEF imprimée (5), pas le plafond renforcé : le Rempart
  // porte le Jarl à 6 PV sur 8, donc au-dessus de sa base, et la Furie
  // s'éteint. Un premier point le laisse exactement à 5 ; le second le fait
  // repasser sous le seuil et rallume le bonus.
  donner(duel, 'joueur', 'rempart-de-dunes');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'rempart-de-dunes').ok, true);
  assert.deepEqual(
    [jarlNeuf.atk, jarlNeuf.def, jarlNeuf.pv, jarlNeuf.pvMax, jarlNeuf.furieDeclenchee, jarlNeuf.furieBonusAtk],
    [2, 6, 6, 8, false, 0],
    'un renfort qui ramène les PV au-dessus de la DEF de base éteint la Furie',
  );
  rpgBlesserCreature(duel, 'joueur', jarlNeuf.id, 1, 'braise');
  assert.deepEqual(
    [jarlNeuf.atk, jarlNeuf.pv, jarlNeuf.furieDeclenchee],
    [2, 5, false],
    'à exactement 5 PV, malgré un plafond de 8, il n’est toujours pas en Furie',
  );
  rpgBlesserCreature(duel, 'joueur', jarlNeuf.id, 1, 'braise');
  assert.deepEqual(
    [jarlNeuf.atk, jarlNeuf.pv, jarlNeuf.pvMax, jarlNeuf.furieDeclenchee, jarlNeuf.furieBonusAtk],
    [5, 4, 8, true, 3],
    'à 4 PV, sous la DEF de base, la Furie revient sans toucher au plafond renforcé',
  );
});

test('la révision Neige : nouvelles valeurs, nouvelles valkyries et quatre peintures reprises', () => {
  const loup = cardById('loup-des-neiges');
  assert.deepEqual(
    { cost: loup.cost, atk: loup.atk, def: loup.def, furie: loup.furie, text: loup.text },
    { cost: 2, atk: 2, def: 2, furie: 1, text: 'Furie 1.' },
  );

  const berserk = cardById('berserk-des-trois-hivers');
  assert.deepEqual(
    {
      cost: berserk.cost, atk: berserk.atk, def: berserk.def, furie: berserk.furie,
      provocation: berserk.provocation, coupRapide: berserk.coupRapide,
    },
    { cost: 4, atk: 1, def: 5, furie: 2, provocation: true, coupRapide: undefined },
    'le Berserk devient 1/5 : Provocation remplace Coup rapide',
  );
  assert.match(berserk.text, /Provocation — Quand cette créature attaque, elle doit être bloquée par au moins une créature si possible/);

  const jarl = cardById('jarl-au-marteau-de-guerre');
  assert.deepEqual(
    { cost: jarl.cost, atk: jarl.atk, def: jarl.def, furie: jarl.furie, overkill: jarl.overkill, text: jarl.text },
    { cost: 5, atk: 2, def: 5, furie: 3, overkill: true, text: 'Furie 3. Overkill.' },
  );

  const drakkar = cardById('drakkar-a-tete-de-dragon');
  assert.deepEqual(
    {
      cost: drakkar.cost, atk: drakkar.atk, def: drakkar.def,
      nePeutPasAttaquer: drakkar.nePeutPasAttaquer, destruction: drakkar.destruction,
    },
    {
      cost: 5, atk: 2, def: 6, nePeutPasAttaquer: true,
      destruction: { type: 'pioche', amount: 1 },
    },
    'le Drakkar devient un 2/6 qui ne peut pas attaquer et ne rend qu’une carte',
  );

  const scalde = cardById('scalde-des-runes');
  assert.deepEqual([scalde.cost, scalde.atk, scalde.def], [3, 1, 2],
    'le Scalde des runes devient 1/2');

  const festin = cardById('festin-des-vaillants');
  assert.deepEqual(
    { cost: festin.cost, effet: festin.effet, text: festin.text },
    {
      cost: 3,
      effet: { type: 'soin-creatures', amount: 1 },
      text: 'Soignez chacune de vos créatures de 1.',
    },
    'le Festin soigne les créatures alliées au lieu du sorcier',
  );

  assert.equal(cardById('mur-de-boucliers').cost, 5,
    'le Mur de boucliers coûte désormais 5');

  const valkyrie = cardById('valkyrie-des-glaces');
  assert.deepEqual(
    { cost: valkyrie.cost, atk: valkyrie.atk, def: valkyrie.def, envol: valkyrie.envol, rarity: valkyrie.rarity },
    { cost: 6, atk: 5, def: 5, envol: true, rarity: 'mythique' },
  );
  assert.equal(valkyrie.resonance, undefined, 'plus de Résonance viking');
  assert.equal(valkyrie.resonanceTribu, undefined);
  assert.deepEqual(valkyrie.protection, { contre: 'braise' });
  assert.deepEqual(valkyrie.arrivee, { type: 'soin-creatures', amount: 2 });
  assert.equal(arriveeCiblePortee(valkyrie), null, 'son soin collectif ne demande aucune cible');
  assert.match(valkyrie.text, /Protection contre la Braise/);
  assert.match(valkyrie.text, /soignez chacune de vos créatures de 2/);
  assert.doesNotMatch(valkyrie.text, /Résonance|inflige 2 dégâts/);

  const corbeau = cardById('valkyrie-au-corbeau');
  assert.deepEqual(
    { cost: corbeau.cost, atk: corbeau.atk, def: corbeau.def, envol: corbeau.envol },
    { cost: 5, atk: 3, def: 4, envol: true },
    'la Valkyrie au corbeau devient une 3/4 pour 5',
  );
  assert.equal(corbeau.resonance, undefined, 'plus de Résonance viking');
  assert.equal(corbeau.resonanceTribu, undefined);
  assert.deepEqual(corbeau.arrivee, { type: 'pioche', amount: 1, tribu: 'viking' });
  assert.equal(arriveeCiblePortee(corbeau), null, 'sa pioche viking ne demande aucune cible');
  assert.match(corbeau.text, /piochez une carte de type Viking au hasard dans votre deck/);
  assert.doesNotMatch(corbeau.text, /Résonance|gagnent \+1\/\+1/);
  assert.equal(cardHasPrintedType(corbeau, 'viking'), true, 'elle reste elle-même de type Viking');

  const embuscade = cardById('embuscade');
  assert.equal(embuscade.cost, 5);
  assert.deepEqual(embuscade.effet, {
    type: 'buff', atk: -2, def: -2, minimum: 1,
    cible: 'creatures-adverses', blocageForce: 'tour',
  }, 'seul son coût change');

  const eclair = cardById('eclair-du-marteau');
  assert.deepEqual(
    { cost: eclair.cost, instant: eclair.instant, effet: eclair.effet },
    { cost: 2, instant: true, effet: { type: 'degats', amount: 3, cible: 'creature' } },
    'l’Éclair ne change que de peinture, pas d’effet',
  );

  // Les quatre nouvelles images sont livrées au format exact de la face et
  // datées dans l’URL : Mur, Éclair et Brume remplacent d’anciens fichiers de
  // même nom, le Loup furieux est un nouvel état de sa peinture d’origine.
  // Les versions de cache vivent dans `rpgCardArt.js` depuis que le coffret du
  // salon et l'onglet Deck partagent les mêmes URL d'illustration.
  const page = readFileSync(new URL('../src/games/rpgCardArt.js', import.meta.url), 'utf8');
  for (const [art, revision] of [
    ['loup-des-neiges-furie', 'loup-furie-huile-v1'],
    ['mur-de-boucliers', 'mur-boucliers-charge-v1'],
    ['eclair-du-marteau', 'eclair-marteau-fjord-v1'],
    ['brume-du-fjord', 'brume-personnes-gelees-v2'],
  ]) {
    const chemin = fileURLToPath(new URL(`../public/cards/${art}.jpg`, import.meta.url));
    assert.deepEqual(dimensionsJpeg(chemin), [1024, 1280], `${art}.jpg est en 1024×1280`);
    assert.match(page, new RegExp(`'${art}': '${revision}'`), `${art}.jpg est daté contre les caches`);
  }
  const empreinte = (art) => createHash('sha256')
    .update(readFileSync(fileURLToPath(new URL(`../public/cards/${art}.jpg`, import.meta.url))))
    .digest('hex');
  assert.notEqual(empreinte('loup-des-neiges-furie'), empreinte('loup-des-neiges'),
    'le Loup en Furie est une peinture distincte de sa face intacte');
});

test('la Valkyrie au corbeau pioche un Viking au hasard du deck, sans aucune Résonance', () => {
  const carte = cardById('valkyrie-au-corbeau');
  assert.equal(cardHasPrintedType(carte, 'viking'), true);
  assert.equal(cardHasPrintedType('valkyrie-des-glaces', 'viking'), true,
    'la Valkyrie des glaces est éligible à l’appel : son type imprimé contient Viking');
  assert.equal(cardHasPrintedType('loup-des-neiges', 'viking'), false,
    'le Loup est Neige, mais son type imprimé est Loup');
  assert.equal(cardHasPrintedType('brume-du-fjord', 'viking'), false,
    'une sorcellerie Neige n’est pas une carte Viking');
  assert.equal(cardReceivesResonance('brume-du-fjord', 'viking'), false);

  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.5 });
  donnerMana(duel, 'joueur', 40);
  donnerMana(duel, 'sorcier', 40);
  duel.joueur.main = [];
  duel.sorcier.main = [];

  // Deux témoins déjà sur la table : leurs statistiques ne doivent pas
  // bouger quand la Valkyrie entre, puisqu’elle n’émet plus d’aura.
  donner(duel, 'joueur', 'guerrier-au-bouclier-rond');
  const guerrier = rpgJouerCreature(duel, 'joueur', 'guerrier-au-bouclier-rond').entite;
  donner(duel, 'sorcier', 'drakkar-a-tete-de-dragon');
  const drakkar = rpgJouerCreature(duel, 'sorcier', 'drakkar-a-tete-de-dragon').entite;
  assert.deepEqual([guerrier.atk, guerrier.def, guerrier.pv], [1, 3, 3]);
  assert.deepEqual([drakkar.atk, drakkar.def, drakkar.pv], [2, 6, 6]);

  // Deux candidats seulement : le Guerrier et le Jarl. Le Loup, la Brume et
  // le Scalde restent hors du tirage malgré leur couleur Neige.
  duel.joueur.deck = [
    'loup-des-neiges',
    'guerrier-au-bouclier-rond',
    'brume-du-fjord',
    'jarl-au-marteau-de-guerre',
    'scalde-des-runes',
  ];
  donner(duel, 'joueur', 'valkyrie-au-corbeau');
  rpgReglerHasard(duel, () => 0);
  const premiere = rpgJouerCreature(duel, 'joueur', 'valkyrie-au-corbeau').entite;
  assert.deepEqual(
    [premiere.atk, premiere.def, premiere.pv, premiere.pvMax, premiere.envol],
    [3, 4, 4, 4, true],
    'la Valkyrie entre à ses statistiques imprimées 3/4',
  );
  assert.deepEqual(duel.joueur.main, ['guerrier-au-bouclier-rond'],
    'un tirage à 0 prend le premier exemplaire Viking du deck');
  assert.deepEqual(duel.joueur.deck, [
    'loup-des-neiges', 'brume-du-fjord', 'jarl-au-marteau-de-guerre', 'scalde-des-runes',
  ], 'seul l’exemplaire tiré quitte le deck ; l’ordre du reste ne change pas');
  assert.deepEqual([guerrier.atk, guerrier.def, guerrier.pv], [1, 3, 3], 'aucun bonus allié');
  assert.deepEqual([drakkar.atk, drakkar.def, drakkar.pv], [2, 6, 6], 'aucun bonus adverse');
  assert.equal(rpgResonanceEnJeu(duel, 'viking'), 0);
  assert.equal(duel.log.some((ligne) => ligne.startsWith('La Résonance viking')), false);
  assert.ok(duel.log.includes(
    'Valkyrie au corbeau : 1 carte de type Viking tirée au hasard du deck rejoint la main.'));

  // Un tirage au bout de l’intervalle prend le dernier candidat restant.
  donner(duel, 'joueur', 'valkyrie-au-corbeau');
  rpgReglerHasard(duel, () => 0.999);
  const seconde = rpgJouerCreature(duel, 'joueur', 'valkyrie-au-corbeau').entite;
  assert.deepEqual([seconde.atk, seconde.def, seconde.pv], [3, 4, 4]);
  assert.deepEqual(duel.joueur.main, ['guerrier-au-bouclier-rond', 'jarl-au-marteau-de-guerre']);
  assert.deepEqual(duel.joueur.deck, ['loup-des-neiges', 'brume-du-fjord', 'scalde-des-runes']);

  // Sans Viking restant, il n’y a ni pioche de secours ni carte retirée.
  const duelSansViking = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.5 });
  donnerMana(duelSansViking, 'joueur', 20);
  duelSansViking.joueur.main = ['valkyrie-au-corbeau'];
  duelSansViking.joueur.deck = ['loup-des-neiges', 'brume-du-fjord'];
  assert.equal(rpgJouerCreature(duelSansViking, 'joueur', 'valkyrie-au-corbeau').ok, true);
  assert.deepEqual(duelSansViking.joueur.main, [], 'aucune carte de remplacement n’est piochée');
  assert.deepEqual(duelSansViking.joueur.deck, ['loup-des-neiges', 'brume-du-fjord']);
  assert.ok(duelSansViking.log.includes(
    'Valkyrie au corbeau ne trouve aucune carte de type Viking dans le deck.'));
});

test('une arrivée qui pioche ou fouille le deck rend la pose non annulable', () => {
  const consulteDeck = [
    'ibis-des-comptes',
    'maitre-des-hieroglyphes',
    'tislit-des-aures',
    'sahir-des-braises',
    'scalde-des-runes',
    'valkyrie-au-corbeau',
    'jormungandr',
  ];
  assert.deepEqual(
    RPG_DUEL_CARDS.filter(arriveeConsulteDeck).map((carte) => carte.id).sort(),
    [...consulteDeck].sort(),
    'le prédicat couvre chaque pioche/recherche immédiate d’arrivée du catalogue',
  );
  assert.equal(arriveeConsulteDeck(cardById('guetteur-du-beffroi')), false,
    'sa pioche est différée par les compteurs d’Heures : rien n’est consulté à la pose');
  assert.equal(arriveeConsulteDeck(cardById('drakkar-a-tete-de-dragon')), false,
    'piocher à la destruction ne rend pas la pose elle-même irréversible');
  assert.equal(arriveeConsulteDeck({ arrivee: { type: 'recherche-deck' } }), true,
    'une future recherche explicite dans le deck suit la même règle');

  const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  const debutFinaliser = page.indexOf('const finaliserPoseCreature =');
  const finaliser = page.slice(debutFinaliser, debutFinaliser + 1800);
  assert.match(
    finaliser,
    /if \(arriveeConsulteDeck\(carte\) && !res\.arriveeEnAttente\) invaliderAnnulation\(\);\s+else conserverAnnulation\(etatAvantAction\);/,
    'la table retire « Annuler la dernière action » dès qu’une arrivée a consulté le deck',
  );
  assert.match(
    page,
    /if \(arriveeConsulteDeck\(carteSource\)\) invaliderAnnulation\(\);/,
    'une arrivée ciblée qui consulterait le deck perd aussi l’annulation à sa résolution',
  );
});

test('Anqa est une 4/4 Braise à 5 avec Envol qui revient après quatre tours', () => {
  const anqa = cardById('anqa-des-braises');
  assert.deepEqual({ element: anqa.element, cost: anqa.cost, atk: anqa.atk, def: anqa.def, rarity: anqa.rarity, envol: anqa.envol }, {
    element: 'braise', cost: 5, atk: 4, def: 4, rarity: 'mythique', envol: true,
  });
  assert.equal(anqa.destruction.type, 'retour-apres-tours');
  assert.equal(anqa.destruction.tours, 4);
  assert.match(anqa.text, /Envol — Ne peut être bloquée que par une créature avec Envol/);
  assert.match(anqa.text, /revient en jeu après quatre tours/i);
  assert.equal(cardArtId(anqa), 'anqa-des-braises');
});

test('l’Envol d’Anqa ne laisse que les créatures volantes la bloquer', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 30);
  donnerMana(duel, 'sorcier', 30);
  donner(duel, 'sorcier', 'anqa-des-braises');
  const anqaAttaquante = rpgJouerCreature(duel, 'sorcier', 'anqa-des-braises').entite;
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  anqaAttaquante.ready = true;
  chien.ready = true;

  assert.equal(anqaAttaquante.envol, true, 'l’Envol est porté par l’entité en jeu');
  assert.deepEqual(rpgChoisirBloqueurs(duel, 'sorcier', [anqaAttaquante.id]), {},
    'l’IA ne jette pas un Chien terrestre devant l’Anqa volante');
  const refus = rpgLancerAttaque(duel, 'sorcier', [anqaAttaquante.id], { [anqaAttaquante.id]: [chien.id] });
  assert.equal(refus.ok, false);
  assert.equal(refus.raison, 'envol', 'le moteur refuse un bloqueur sans Envol');
  assert.equal(chien.pv, 2, 'le blocage refusé ne blesse personne');
  assert.equal(duel.joueur.pv, RPG_PV_JOUEUR, 'aucune attaque n’est résolue');

  donner(duel, 'joueur', 'anqa-des-braises');
  const anqaBloqueuse = rpgJouerCreature(duel, 'joueur', 'anqa-des-braises').entite;
  anqaBloqueuse.ready = true;
  assert.deepEqual(rpgChoisirBloqueurs(duel, 'sorcier', [anqaAttaquante.id]), {
    [anqaAttaquante.id]: [anqaBloqueuse.id],
  }, 'une créature avec Envol peut bloquer un attaquant avec Envol');
  const combat = rpgLancerAttaque(duel, 'sorcier', [anqaAttaquante.id], {
    [anqaAttaquante.id]: [anqaBloqueuse.id],
  });
  assert.equal(combat.ok, true);
  assert.equal(combat.resume.paires.length, 1, 'les deux Anqa s’affrontent en vol');
  assert.equal(duel.joueur.pv, RPG_PV_JOUEUR, 'l’Anqa volante arrête l’attaque avant les PV');
  assert.equal(duel.sorcier.creatures.includes(anqaAttaquante), false, 'les deux 4/4 se détruisent');
  assert.equal(duel.joueur.creatures.includes(anqaBloqueuse), false);
});

test('Anqa revient en jeu après quatre changements de tour, sans attaquer immédiatement', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'anqa-des-braises');
  const anqa = rpgJouerCreature(duel, 'joueur', 'anqa-des-braises').entite;
  assert.equal(rpgBlesserCreature(duel, 'joueur', anqa.id, 4).ok, true);
  assert.equal(duel.joueur.creatures.includes(anqa), false, 'Anqa est détruite et quitte le champ');
  assert.ok(duel.joueur.cimetiere.includes('anqa-des-braises'));
  assert.deepEqual(duel.joueur.retoursProgrammes, [
    { carteId: 'anqa-des-braises', toursRestants: 4 },
  ]);

  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'sorcier');
  assert.equal(duel.joueur.retoursProgrammes[0].toursRestants, 3,
    'elle reste au cimetière après le premier tour');
  rpgFinDeTour(duel);
  rpgFinDeTour(duel);
  assert.equal(duel.joueur.retoursProgrammes[0].toursRestants, 1,
    'le sorcier a le temps de préparer la tombe');
  assert.equal(duel.joueur.creatures.some((entite) => entite.carteId === 'anqa-des-braises'), false);

  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'joueur');
  const anqaRenaissante = duel.joueur.creatures.find((entite) => entite.carteId === 'anqa-des-braises');
  assert.ok(anqaRenaissante, 'Anqa revient au début du tour après le quatrième changement');
  assert.equal(anqaRenaissante.pv, 4);
  assert.equal(anqaRenaissante.envol, true, 'elle renaît toujours volante');
  assert.equal(anqaRenaissante.ready, false, 'elle arrive avec le mal d’invocation');
  assert.equal(duel.joueur.cimetiere.includes('anqa-des-braises'), false);
  assert.deepEqual(duel.joueur.retoursProgrammes, []);
});

test('une Anqa détruite par des blessures simultanées programme aussi son retour', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'anqa-des-braises');
  donner(duel, 'sorcier', 'colosse-de-sel');
  const anqa = rpgJouerCreature(duel, 'joueur', 'anqa-des-braises').entite;
  const colosse = rpgJouerCreature(duel, 'sorcier', 'colosse-de-sel').entite;
  colosse.ready = true;

  assert.equal(rpgAttaquerCreature(duel, 'sorcier', colosse.id, anqa.id).ok, true);
  assert.equal(duel.joueur.creatures.includes(anqa), false);
  assert.deepEqual(duel.joueur.retoursProgrammes, [
    { carteId: 'anqa-des-braises', toursRestants: 4 },
  ]);
});

test('chaque carte du duel possède une illustration locale et une ligne de type', () => {
  const cartes = [...RPG_CREATURE_CARDS, ...RPG_HERO_CARDS, ...RPG_TERRAIN_CARDS, ...RPG_MAGIE_CARDS];
  for (const carte of cartes) {
    assert.ok(carte.typeLine, `${carte.id} affiche un type de carte`);
    const image = fileURLToPath(new URL(`../public/cards/${cardArtId(carte)}.jpg`, import.meta.url));
    assert.ok(existsSync(image), `${carte.id} réutilise une illustration existante (${image})`);
  }
  assert.ok(RPG_MAGIE_CARDS.find((carte) => carte.id === 'parade-du-verre').instant,
    'la Parade est bien marquée comme magie rapide');
});

test('les decks ont leurs illustrations et le contrôle catalogue détecte les partages restants', () => {
  const cartes = [...RPG_CREATURE_CARDS, ...RPG_HERO_CARDS, ...RPG_TERRAIN_CARDS, ...RPG_MAGIE_CARDS];
  for (const deck of RPG_DECKS) {
    const imagesDeCeDeck = new Map();
    for (const id of new Set(deck.cardIds)) {
      const illustration = cardArtId(cardById(id));
      assert.ok(illustration, `${id} a une illustration`);
      assert.equal(imagesDeCeDeck.has(illustration), false,
        `${id} partage l’illustration ${illustration} avec ${imagesDeCeDeck.get(illustration)} dans ${deck.name}`);
      imagesDeCeDeck.set(illustration, id);
    }
  }

  assert.equal(cardArtId('tempete-de-sable'), 'tempete-de-sable',
    'Tempête de sable utilise bien l’illustration du tourbillon');
  assert.equal(cardArtId('rempart-de-dunes'), 'rempart-de-dunes',
    'Rempart de dunes utilise sa nouvelle illustration protectrice');
  assert.notEqual(cardArtId('rempart-de-dunes'), cardArtId('dune-marchante'),
    'Rempart de dunes ne reprend pas l’illustration de la Dune marchante');

  const nouvellesIllustrations = [
    ['montagne', 'montagne'], ['fennec-des-decombres', 'fennec-des-decombres'],
    ['braisier-du-souk', 'braisier-du-souk'],
    ['djinn-du-souk', 'djinn-du-souk'], ['ghul-des-cendres', 'ghul-des-cendres'],
    ['sahir-des-braises', 'sahir-des-braises'], ['ifrit-des-ergs', 'ifrit-des-ergs'],
    ['ifrit-al-ahmar', 'ifrit-al-ahmar'],
    ['trait-de-braise', 'trait-de-braise'],
    ['nuage-de-cendres', 'nuage-de-cendres'],
    ['cavalier-amazigh-du-desert', 'cavalier-amazigh-du-desert'],
    ['djinn-de-foudre', 'djinn-de-foudre'], ['vent-rouge', 'vent-rouge'],
    ['petra', 'petra'], ['feriel', 'feriel'],
    // Refonte « plein art 4:5 » : ces sept magies portaient une illustration
    // prêtée (la Mer) ou un cadrage qui n’était pas celui de la carte. Chacune
    // a désormais sa peinture dédiée, livrée au format de la face (4:5).
    ['eau-de-la-source', 'eau-de-la-source'],
    ['lame-de-mer', 'lame-de-mer'],
    ['brisure-de-verre', 'brisure-de-verre'],
    ['parade-du-verre', 'parade-du-verre'],
    ['maree-contraire', 'maree-contraire'],
    ['ressac', 'ressac'],
    ['courant-de-retour', 'courant-de-retour'],
  ];
  // Le Serment des Neuf Hivers : chaque carte du deck Neige a son illustration
  // dédiée, variante du Glacier comprise (aucune ne partage le fichier d’une autre).
  const illustrationsNeige = RPG_DECK_NEIGE_BASE.filter((id, index, deck) => deck.indexOf(id) === index);
  assert.equal(illustrationsNeige.length, 19,
    'le deck Neige réunit les dix-neuf cartes distinctes retenues par sa recette');
  for (const carteId of illustrationsNeige) {
    assert.equal(cardArtId(carteId), carteId,
      `${carteId} affiche sa propre illustration Neige`);
    assert.ok(existsSync(fileURLToPath(new URL(`../public/cards/${carteId}.jpg`, import.meta.url))),
      `l’illustration plein art ${carteId} est livrée avec le jeu`);
  }

  for (const [carteId, illustration] of nouvellesIllustrations) {
    assert.equal(cardArtId(carteId), illustration,
      `${carteId} affiche sa nouvelle illustration full art`);
    assert.ok(existsSync(fileURLToPath(new URL(`../public/cards/${illustration}.jpg`, import.meta.url))),
      `l’illustration plein art ${illustration} est livrée avec le jeu`);
  }

  // Les faces du duel font 4:5 : un plein art livré dans un autre ratio se
  // retrouve recadré au milieu d’un sujet (ou cerclé de bandes). Ces
  // peintures-là sont contrôlées à la source, dans leur fichier.
  for (const carteId of PLEIN_ART_45) {
    const [largeur, hauteur] = dimensionsJpeg(
      fileURLToPath(new URL(`../public/cards/${cardArtId(carteId)}.jpg`, import.meta.url)),
    );
    assert.ok(Math.abs(largeur / hauteur - 4 / 5) < 0.01,
      `${carteId} est peint au ratio 4:5 de la face (${largeur}×${hauteur})`);
  }

  // Les illustrations dédiées des decks sont uniques. Les rares partages
  // restants dans le catalogue hors decks de départ sont recensés ici afin
  // qu'aucun nouveau partage ne passe inaperçu.
  const proprietaires = new Map();
  for (const carte of cartes) {
    const illustration = cardArtId(carte);
    if (!proprietaires.has(illustration)) proprietaires.set(illustration, []);
    proprietaires.get(illustration).push(carte.id);
  }
  const partages = [...proprietaires.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([illustration, ids]) => [illustration, ids])
    .sort(([a], [b]) => a.localeCompare(b));
  // Le catalogue ne compte plus aucun partage d’illustration : l’Eau de la
  // source et la Lame de mer, qui regardaient la peinture du terrain Mer, ont
  // chacune la leur.
  assert.deepEqual(partages, []);
});

test('chaque deck de départ a son boîtier illustré : une carte emblématique du deck, unique et livrée avec le jeu', () => {
  const illustrations = new Map();
  for (const deck of RPG_DECKS) {
    assert.ok(deck.boxArt, `${deck.name} a une illustration de boîtier (boxArt)`);
    assert.ok(deck.cardIds.some((id) => cardArtId(cardById(id)) === deck.boxArt),
      `l’illustration du boîtier « ${deck.name} » est celle d’une carte de ce deck`);
    assert.ok(existsSync(fileURLToPath(new URL(`../public/cards/${deck.boxArt}.jpg`, import.meta.url))),
      `l’illustration ${deck.boxArt} du boîtier « ${deck.name} » est livrée avec le jeu`);
    assert.equal(illustrations.has(deck.boxArt), false,
      `${deck.name} partage l’illustration ${deck.boxArt} avec ${illustrations.get(deck.boxArt)}`);
    illustrations.set(deck.boxArt, deck.name);
  }
});

test('les capacités des personnages amazighs se déclenchent à l’arrivée et à la destruction', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 100);
  donner(duel, 'joueur', 'fennec-des-decombres');
  const fennec = rpgJouerCreature(duel, 'joueur', 'fennec-des-decombres').entite;
  donner(duel, 'joueur', 'tislit-des-aures');
  const piocheAvant = duel.joueur.deck.length;
  rpgJouerCreature(duel, 'joueur', 'tislit-des-aures');
  assert.equal(duel.joueur.deck.length, piocheAvant - 1, 'Tislit fait piocher une carte en arrivant');

  donner(duel, 'joueur', 'tiziri-du-djurdjura');
  const tiziri = rpgJouerCreature(duel, 'joueur', 'tiziri-du-djurdjura').entite;
  assert.equal(fennec.atk, 3, 'Tiziri ne renforce que sa propre attaque');
  assert.equal(tiziri.atk, 2, 'Tiziri n’a plus de bonus d’arrivée : elle reste une 2/1');
  assert.equal(rpgEstProtegee(tiziri, ['braise']), true, 'sa protection contre la Braise est permanente');
  assert.equal(rpgEstProtegee(tiziri, ['eau']), false, 'et elle ne couvre que la Braise');
  donner(duel, 'joueur', 'amani-des-ksour');
  const amani = rpgJouerCreature(duel, 'joueur', 'amani-des-ksour').entite;
  assert.deepEqual([amani.atk, amani.def, amani.pv], [2, 5, 5], 'Amani est une 2/5');
  assert.equal(fennec.def, 3, 'son égide donne +0/+2 aux autres créatures du camp');

  donner(duel, 'joueur', 'amayas-du-hoggar');
  const amayas = rpgJouerCreature(duel, 'joueur', 'amayas-du-hoggar').entite;
  const mainAvantDestruction = duel.joueur.main.length;
  // Amayas 2/2 pèse 4 sous l’égide d’Amani : il faut l’abattre pour de bon.
  rpgBlesserCreature(duel, 'joueur', amayas.id, 4);
  assert.equal(duel.joueur.main.length, mainAvantDestruction + 1, 'Amayas fait piocher une carte quand il est détruit');

  donner(duel, 'joueur', 'tin-hinan');
  const tin = rpgJouerCreature(duel, 'joueur', 'tin-hinan').entite;
  assert.equal(fennec.atk, 3, 'Tin Hinan ne donne plus aucun boost de statistiques');
  assert.equal(fennec.def, 3, 'seule l’égide d’Amani (1 + 2) compte pour la défense');
  assert.equal(cardById('fennec-des-decombres').butin, true, 'son Butin reste imprimé sur la fiche');
  assert.equal(fennec.infiltration, true, 'Tin Hinan ouvre la route à ses autres créatures');
  assert.equal(tin.infiltration, false, 'elle ne gagne rien elle-même');
});

test('les arrivées à cible choisie refusent la pose sans désignation', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 30);
  donnerMana(duel, 'sorcier', 30);
  donner(duel, 'sorcier', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  donner(duel, 'sorcier', 'dune-marchante');
  const dune = rpgJouerCreature(duel, 'sorcier', 'dune-marchante').entite;

  donner(duel, 'joueur', 'tour-de-braise');
  assert.equal(rpgJouerCreature(duel, 'joueur', 'tour-de-braise').raison, 'cible',
    'la Tour de Braise attend la créature choisie pour son dégât d’arrivée');
  donner(duel, 'joueur', 'bakunawa');
  assert.equal(rpgJouerCreature(duel, 'joueur', 'bakunawa').raison, 'cible',
    'la gueule du Bakunawa attend elle aussi sa cible');

  const duneAvant = dune.pv;
  assert.equal(rpgJouerCreature(duel, 'joueur', 'tour-de-braise', dune.id).ok, true,
    'avec une cible désignée, la pose passe');
  assert.equal(dune.pv, duneAvant - 1, 'la créature choisie encaisse le dégât d’arrivée');
  assert.equal(chien.pv, 2, 'la créature non choisie est intacte');
});

test('Tin Hinan donne l’Infiltration à ses autres créatures — rien à elle-même, pas de boost', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 30);
  donnerMana(duel, 'sorcier', 30);
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  donner(duel, 'sorcier', 'porteuse-de-cruches');
  const bloqueuse = rpgJouerCreature(duel, 'sorcier', 'porteuse-de-cruches').entite;

  donner(duel, 'joueur', 'tin-hinan');
  const tin = rpgJouerCreature(duel, 'joueur', 'tin-hinan').entite;
  assert.deepEqual([chien.atk, chien.def], [2, 2], 'aucun boost : le Chien reste 2/2');
  assert.deepEqual([tin.atk, tin.def], [3, 3], 'Tin Hinan reste 3/3');
  assert.ok(chien.infiltration && chien.infiltrationTour,
    'le Chien est impossible à bloquer ce tour');
  assert.equal(tin.infiltration, false, 'la matriarche n’ouvre la route que pour les siens');
  assert.equal(rpgPeutBloquerAttaquant(bloqueuse, chien), false,
    'la Porteuse ne peut pas intercepter la créature infiltrée');
  assert.equal(rpgPeutBloquerAttaquant(bloqueuse, tin), true,
    'mais Tin Hinan, elle, reste bloquable');

  rpgFinDeTour(duel);
  assert.equal(chien.infiltration, false, 'l’Infiltration s’efface à la fin du tour');
  assert.deepEqual([chien.atk, chien.def], [2, 2], 'les statistiques n’ont jamais bougé');
  assert.equal(rpgPeutBloquerAttaquant(bloqueuse, chien), true,
    'redevenue bloquable, la créature peut de nouveau être interceptée');
});

test('le Père des corbeaux : 5/5 à 6 avec Envol, et ses corbeaux exilent une créature de coût 3 ou moins', () => {
  const carte = cardById('pere-des-corbeaux');
  assert.deepEqual({ cost: carte.cost, atk: carte.atk, def: carte.def }, { cost: 6, atk: 5, def: 5 });
  assert.equal(carte.envol, true, 'le Père des corbeaux a Envol');
  assert.equal(carte.activation, undefined, 'sa foudre activée a disparu');
  assert.deepEqual(carte.arrivee, { type: 'exil', cible: 'creature', coutMax: 3 });
  assert.match(carte.text, /Envol/);
  assert.match(carte.text, /coût 3 ou moins/);

  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 30);
  donnerMana(duel, 'sorcier', 30);
  donner(duel, 'sorcier', 'loup-des-neiges'); // coût 3 : exilable, pile au seuil
  const proie = rpgJouerCreature(duel, 'sorcier', 'loup-des-neiges').entite;
  donner(duel, 'sorcier', 'kraken'); // coût 5 : trop lourd pour les corbeaux
  const kraken = rpgJouerCreature(duel, 'sorcier', 'kraken').entite;

  // Une cible trop chère est illégale : l'exil la refuse.
  donner(duel, 'joueur', 'pere-des-corbeaux');
  assert.equal(rpgJouerCreature(duel, 'joueur', 'pere-des-corbeaux', kraken.id).raison, 'cible',
    'le Kraken à 5 mana est hors de portée des corbeaux');

  const pere = rpgJouerCreature(duel, 'joueur', 'pere-des-corbeaux', proie.id).entite;
  assert.equal(pere.envol, true, 'le Père arrive avec Envol');
  assert.equal(duel.sorcier.creatures.some((entite) => entite.id === proie.id), false,
    'le Loup à 3 mana est emporté');
  assert.equal(duel.sorcier.exil?.includes('loup-des-neiges'), true,
    'il est exilé — retiré de la partie, pas au cimetière');
  assert.equal(duel.sorcier.creatures.some((entite) => entite.id === kraken.id), true,
    'le Kraken, lui, reste en jeu');
});

test('le Maître du marteau : 5/5 Furie 3, Overkill et Tenacité, sans dégâts d’arrivée', () => {
  const carte = cardById('maitre-du-marteau');
  assert.deepEqual([carte.atk, carte.def, carte.furie], [5, 5, 3], '5/5 avec Furie 3');
  assert.equal(carte.arrivee, undefined, 'son arrivée ne blesse plus les créatures adverses');
  assert.equal(carte.overkill, true, 'Overkill remplace les dégâts d’arrivée');
  assert.equal(carte.tenacite, true);
  assert.match(carte.text, /^Furie 3\. Overkill\./);
  assert.doesNotMatch(carte.text, /première fois|gagne \+3\/\+3|inflige 2 dégâts/);
  assert.match(carte.text, /Tenacité — Une fois par partie, quand il meurt \(sauf exilé\), il revient en jeu au début de votre prochain tour avec 1 point de défense/);

  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'sorcier', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  donner(duel, 'sorcier', 'dune-marchante');
  const dune = rpgJouerCreature(duel, 'sorcier', 'dune-marchante').entite;

  donner(duel, 'joueur', 'maitre-du-marteau');
  const maitre = rpgJouerCreature(duel, 'joueur', 'maitre-du-marteau').entite;
  assert.equal(duel.sorcier.creatures.includes(chien), true,
    'sans dégâts d’arrivée, le Chien 2/2 reste en jeu');
  assert.equal(chien.pv, 2, 'le Chien est intact');
  assert.equal(dune.pv, 4, 'la Dune 2/4 aussi');
  assert.equal(maitre.overkill, true, 'l’entité porte l’Overkill imprimé');

  // Tenacité : le Maître meurt pour de bon — cimetière, déclenchements de mort
  // et aucune Furie — mais sa carte est promise au prochain tour du joueur.
  const debut = rpgNombreDestructions(duel);
  assert.equal(rpgBlesserCreature(duel, 'joueur', maitre.id, 20, 'braise').ok, true);
  assert.equal(duel.joueur.creatures.includes(maitre), false, 'la mort n’est plus refusée');
  assert.ok(duel.joueur.cimetiere.includes('maitre-du-marteau'));
  assert.equal(rpgNombreDestructions(duel), debut + 1, 'la destruction a bien eu lieu');
  assert.equal(maitre.furieDeclenchee, false, 'une morte ne s’allume pas de Furie');
  assert.deepEqual(duel.joueur.retoursProgrammes, [
    { carteId: 'maitre-du-marteau', toursRestants: 2, tenacite: true },
  ], 'il est mort pendant son tour : il revient au tour suivant du joueur');

  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'sorcier');
  assert.equal(duel.joueur.retoursProgrammes[0].toursRestants, 1,
    'il reste au cimetière pendant le tour du sorcier');
  assert.equal(duel.joueur.creatures.some((entite) => entite.carteId === 'maitre-du-marteau'), false);

  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'joueur');
  const revenu = duel.joueur.creatures.find((entite) => entite.carteId === 'maitre-du-marteau');
  assert.ok(revenu, 'Tenacité le ramène en jeu au début du prochain tour du joueur');
  assert.notEqual(revenu.id, maitre.id, 'c’est une présence neuve');
  assert.deepEqual([revenu.def, revenu.pv, revenu.pvMax], [1, 1, 5],
    'il revient avec 1 point de défense, sa vie pleine restant à restaurer');
  assert.equal(revenu.tenaciteDisponible, false, 'la renaissance de la partie est dépensée');
  assert.equal(revenu.ready, false, 'il revient avec le mal d’invocation');
  assert.equal(duel.joueur.cimetiere.includes('maitre-du-marteau'), false);
  assert.deepEqual(duel.joueur.retoursProgrammes, []);
  // Revenu à 1 PV, donc sous sa DEF de base de 5 : sa Furie 3 s’allume pour
  // +3/+0 seulement — la Furie du Sablier ne touche jamais la défense.
  assert.deepEqual([revenu.atk, revenu.furieDeclenchee, revenu.furieBonusAtk], [8, true, 3],
    'la présence revenue retrouve sa Furie : +3/+0 tant qu’elle reste sous sa DEF de base');

  // Un soin partiel ne suffit pas à éteindre l’état : à 3 PV sur 5, le
  // Maître reste en Furie. Une blessure de plus ne cumule pas son bonus.
  donnerMana(duel, 'joueur', 20); // le mana du tour a été remis à zéro au changement de tour
  donner(duel, 'joueur', 'valkyrie-des-glaces');
  assert.equal(rpgJouerCreature(duel, 'joueur', 'valkyrie-des-glaces').ok, true);
  assert.deepEqual(
    [revenu.atk, revenu.def, revenu.pv, revenu.pvMax, revenu.furieDeclenchee, revenu.furieBonusAtk],
    [8, 3, 3, 5, true, 3],
    'soigné de 2 sans retrouver sa DEF de base, il garde exactement le même bonus',
  );
  assert.equal(rpgBlesserCreature(duel, 'joueur', revenu.id, 1, 'braise').recus, 1);
  assert.deepEqual(
    [revenu.atk, revenu.def, revenu.pv, revenu.pvMax, revenu.furieBonusAtk],
    [8, 2, 2, 5, 3],
    'déjà active, la Furie ne se regagne pas',
  );

  // Seconde mort : la Tenacité n’a plus rien à promettre.
  assert.equal(rpgBlesserCreature(duel, 'joueur', revenu.id, 20, 'braise').ok, true);
  assert.equal(duel.joueur.creatures.includes(revenu), false);
  assert.deepEqual(duel.joueur.retoursProgrammes, [],
    'une seule renaissance par partie : la seconde mort est définitive');
});

test('Tenacité : le retour dépend du camp dont le tour commence', () => {
  const duel = duelDeBase();
  duel.tour = 'sorcier';
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'sorcier', 'maitre-du-marteau');
  const maitre = rpgJouerCreature(duel, 'sorcier', 'maitre-du-marteau').entite;
  // Le sorcier tue lui-même son Maître pendant SON tour : le retour attend le
  // prochain tour du sorcier, donc deux changements de tour.
  assert.equal(rpgBlesserCreature(duel, 'sorcier', maitre.id, 20, 'braise').ok, true);
  assert.deepEqual(duel.sorcier.retoursProgrammes, [
    { carteId: 'maitre-du-marteau', toursRestants: 2, tenacite: true },
  ]);

  // Une créature tenace tuée pendant le tour adverse revient dès le prochain
  // tour de son camp : un seul changement de tour.
  const autre = duelDeBase();
  autre.tour = 'sorcier';
  donnerMana(autre, 'joueur', 20);
  donner(autre, 'joueur', 'maitre-du-marteau');
  const sien = rpgJouerCreature(autre, 'joueur', 'maitre-du-marteau').entite;
  assert.equal(rpgBlesserCreature(autre, 'joueur', sien.id, 20, 'braise').ok, true);
  assert.deepEqual(autre.joueur.retoursProgrammes, [
    { carteId: 'maitre-du-marteau', toursRestants: 1, tenacite: true },
  ], 'mort pendant le tour du sorcier : le prochain tour du joueur arrive tout de suite');
  rpgFinDeTour(autre);
  assert.equal(autre.tour, 'joueur');
  assert.ok(autre.joueur.creatures.some((entite) => entite.carteId === 'maitre-du-marteau'));
});

test('Tenacité : l’exil ne ramène jamais la créature', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'maitre-du-marteau');
  const maitre = rpgJouerCreature(duel, 'joueur', 'maitre-du-marteau').entite;
  donner(duel, 'sorcier', 'la-devoreuse');
  const devoreuse = rpgJouerCreature(duel, 'sorcier', 'la-devoreuse', maitre.id).entite;
  assert.ok(devoreuse);
  assert.equal(duel.joueur.creatures.some((entite) => entite.id === maitre.id), false);
  assert.ok(duel.joueur.exil.includes('maitre-du-marteau'), 'la carte est retirée de la partie');
  assert.deepEqual(duel.joueur.retoursProgrammes, [], 'l’exil ne programme aucune renaissance');
});

test('le Jarl et le Maître du marteau percent avec leur Overkill imprimé', () => {
  for (const carteId of ['jarl-au-marteau-de-guerre', 'maitre-du-marteau']) {
    const duel = duelDeBase();
    donnerMana(duel, 'joueur', 30);
    donnerMana(duel, 'sorcier', 30);
    donner(duel, 'joueur', carteId);
    const attaquant = rpgJouerCreature(duel, 'joueur', carteId).entite;
    assert.equal(attaquant.overkill, true, `${carteId} entre avec Overkill`);
    donner(duel, 'sorcier', 'chien-du-guet');
    const bloqueur = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
    // Le bloqueur absorbe exactement un point de moins que la force de
    // l'attaquant et ne le blesse pas : seul l'excédent doit passer.
    Object.assign(bloqueur, {
      atk: 0,
      pv: attaquant.atk - 1,
      def: attaquant.atk - 1,
      pvMax: attaquant.atk - 1,
    });
    attaquant.ready = true;
    const pvSorcier = duel.sorcier.pv;
    const attaque = rpgLancerAttaque(duel, 'joueur', [attaquant.id], { [attaquant.id]: [bloqueur.id] });
    assert.equal(attaque.ok, true, `${carteId} attaque`);
    assert.equal(attaque.resume.frappeSorcier, 1, `${carteId} : l’excédent perce`);
    assert.equal(duel.sorcier.pv, pvSorcier - 1);
    assert.equal(duel.sorcier.creatures.includes(bloqueur), false);
  }
});

for (const carteId of ['maitre-du-marteau', 'seigneur-des-machoires']) {
  for (const cote of ['joueur', 'sorcier']) {
    for (const role of ['attaquant', 'bloqueur']) {
      test(`Tenacité en combat simultané : ${carteId}, ${cote}, ${role}`, () => {
        const duel = duelDeBase();
        const adv = cote === 'joueur' ? 'sorcier' : 'joueur';
        for (const camp of [cote, adv]) donnerMana(duel, camp, 50);
        donner(duel, cote, carteId);
        const tenace = rpgJouerCreature(duel, cote, carteId).entite;
        donner(duel, adv, 'chien-du-guet');
        const adversaire = rpgJouerCreature(duel, adv, 'chien-du-guet').entite;
        adversaire.atk = 20;
        adversaire.pv = adversaire.def = adversaire.pvMax = 30;
        const attaquant = role === 'attaquant' ? tenace : adversaire;
        const bloqueur = role === 'attaquant' ? adversaire : tenace;
        const coteAttaque = role === 'attaquant' ? cote : adv;
        const forceInitiale = tenace.atk;
        const debut = rpgNombreDestructions(duel);
        attaquant.ready = true;
        attaquant.attaquee = false;
        duel.attaqueJouee = null;

        assert.equal(rpgLancerAttaque(duel, coteAttaque, [attaquant.id], {
          [attaquant.id]: [bloqueur.id],
        }).ok, true);
        // La Tenacité ne refuse plus la destruction : le porteur meurt.
        assert.equal(duel[cote].creatures.includes(tenace), false);
        assert.equal(duel[cote].cimetiere.filter((id) => id === carteId).length, 1);
        assert.equal(rpgNombreDestructions(duel), debut + 1);
        assert.equal(tenace.furieDeclenchee, false,
          'la Furie ne s’allume pas : il est mort avant de survivre');
        // Sa renaissance est promise au prochain tour de son camp : deux crans
        // s’il est tombé pendant son tour, un seul sinon.
        assert.deepEqual(duel[cote].retoursProgrammes, [{
          carteId,
          toursRestants: duel.tour === cote ? 2 : 1,
          tenacite: true,
        }]);
        // L’adversaire, lui, encaisse la force avant Furie — les dégâts
        // restent simultanés.
        assert.equal(adversaire.pv, 30 - forceInitiale);
        assert.equal(duel[adv].creatures.includes(adversaire), true);
        assert.ok(duel.combatFeed.some((entry) => entry.type === 'death' && entry.victim.id === tenace.id));
        assert.equal(duel.combatFeed.some((entry) => entry.type === 'hit' && entry.victim.id === tenace.id), false);
      });
    }
  }
}

test('Tenacité : un échange létal direct emporte les deux combattants tenaces', () => {
  const duel = duelDeBase();
  const combattants = ['joueur', 'sorcier'].map((cote) => {
    donnerMana(duel, cote, 50);
    donner(duel, cote, 'seigneur-des-machoires');
    return rpgJouerCreature(duel, cote, 'seigneur-des-machoires').entite;
  });
  const [attaquant, cible] = combattants;
  attaquant.ready = true;
  const debut = rpgNombreDestructions(duel);
  assert.equal(rpgAttaquerCreature(duel, 'joueur', attaquant.id, cible.id).ok, true);
  for (const [index, cote] of ['joueur', 'sorcier'].entries()) {
    assert.equal(duel[cote].creatures.includes(combattants[index]), false,
      'les 6/6 s’entretuent : la Tenacité ne refuse plus la mort');
    assert.equal(duel[cote].cimetiere.includes('seigneur-des-machoires'), true);
    assert.deepEqual(duel[cote].retoursProgrammes, [{
      carteId: 'seigneur-des-machoires',
      toursRestants: duel.tour === cote ? 2 : 1,
      tenacite: true,
    }], 'chacun promet sa renaissance');
  }
  assert.equal(rpgNombreDestructions(duel), debut + 2);
});

test('Tenacité ne sauve pas d’un coup fatal porté par deux bloqueurs', () => {
  const duel = duelDeBase();
  for (const cote of ['joueur', 'sorcier']) donnerMana(duel, cote, 50);
  donner(duel, 'joueur', 'maitre-du-marteau');
  const maitre = rpgJouerCreature(duel, 'joueur', 'maitre-du-marteau').entite;
  const bloqueurs = Array.from({ length: 2 }, () => {
    donner(duel, 'sorcier', 'chien-du-guet');
    const bloqueur = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
    bloqueur.atk = 4;
    return bloqueur;
  });
  maitre.ready = true;
  const debut = rpgNombreDestructions(duel);
  assert.equal(rpgLancerAttaque(duel, 'joueur', [maitre.id], {
    [maitre.id]: bloqueurs.map((entite) => entite.id),
  }).ok, true);
  assert.equal(duel.joueur.creatures.includes(maitre), false, 'les 8 blessures l’emportent');
  assert.equal(maitre.tenaciteDisponible, true, 'la Tenacité n’a pas été consommée : la mort a eu lieu');
  assert.equal(duel.sorcier.creatures.length, 0, 'les deux bloqueurs meurent dans le même échange');
  assert.equal(rpgNombreDestructions(duel), debut + 3);
  assert.deepEqual(duel.joueur.retoursProgrammes, [
    { carteId: 'maitre-du-marteau', toursRestants: 2, tenacite: true },
  ], 'un seul retour promis, malgré les deux bloqueurs');
  assert.equal(duel.log.filter((ligne) => ligne.startsWith('Tenacité :')).length, 1);
});

test('Amani est une 2/5 à 4 dont l’égide donne +0/+2 aux autres créatures de son camp', () => {
  const carte = cardById('amani-des-ksour');
  assert.deepEqual({ cost: carte.cost, atk: carte.atk, def: carte.def, rarity: carte.rarity }, {
    cost: 4, atk: 2, def: 5, rarity: 'rare',
  });
  assert.match(carte.text, /Tant qu.Amani est en jeu, vos autres créatures gagnent \+0\/\+2/);

  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 50);
  donnerMana(duel, 'sorcier', 50);

  // Sans Amani, chacun garde ses chiffres imprimés.
  donner(duel, 'joueur', 'chien-du-guet');
  const mien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  assert.deepEqual([mien.atk, mien.def, mien.pv], [2, 2, 2], 'pas d’égide, pas de bonus');

  // Amani entre : les autres gagnent +0/+2, elle reste une 2/5.
  donner(duel, 'joueur', 'amani-des-ksour');
  const amani = rpgJouerCreature(duel, 'joueur', 'amani-des-ksour').entite;
  assert.deepEqual([amani.atk, amani.def, amani.pv], [2, 5, 5], 'Amani ne se protège pas elle-même');
  assert.deepEqual([mien.atk, mien.def, mien.pv], [2, 4, 4], 'le Chien du guet gagne +0/+2');

  // Les arrivantes entrent déjà sous l’égide.
  donner(duel, 'joueur', 'fennec-des-decombres');
  const fennec = rpgJouerCreature(duel, 'joueur', 'fennec-des-decombres').entite;
  assert.deepEqual([fennec.atk, fennec.def, fennec.pv], [3, 3, 3], 'le Fennec 3/1 entre en 3/3');

  // Le camp adverse reste nu : l’égide ne protège pas l’envahisseur.
  donner(duel, 'sorcier', 'chien-du-guet');
  const sien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  assert.deepEqual([sien.atk, sien.def, sien.pv], [2, 2, 2], 'le Chien adverse reste un 2/2');

  // Une seconde Amani dédouble l’égide : chaque Amani protège toutes les
  // créatures sauf elle-même — elles se protègent donc l’une l’autre.
  donner(duel, 'joueur', 'amani-des-ksour');
  const seconde = rpgJouerCreature(duel, 'joueur', 'amani-des-ksour').entite;
  assert.deepEqual([seconde.atk, seconde.def, seconde.pv], [2, 7, 7], 'la seconde Amani 2/5 reçoit l’égide de la première : 2/7');
  assert.deepEqual([amani.atk, amani.def, amani.pv], [2, 7, 7], 'et la première reçoit la sienne');
  assert.deepEqual([mien.def, mien.pv], [6, 6], 'l’égide passe à +0/+4 pour les autres créatures');
  assert.deepEqual([fennec.def, fennec.pv], [5, 5]);

  // Retirer une Amani ne rend que son égide : l’autre tient le +0/+2.
  assert.equal(rpgBlesserCreature(duel, 'joueur', amani.id, 100, 'braise').ok, true);
  assert.deepEqual([seconde.def, seconde.pv], [5, 5], 'la seconde redevient une 2/5');
  assert.deepEqual([mien.def, mien.pv], [4, 4], 'le bonus retombe à +0/+2');
  assert.deepEqual([fennec.def, fennec.pv], [3, 3]);

  // Perdre la dernière égide ne tue jamais : au pire, 1 PV (règle de la Résonance).
  donner(duel, 'joueur', 'porteuse-de-cruches');
  const porteuse = rpgJouerCreature(duel, 'joueur', 'porteuse-de-cruches').entite;
  assert.deepEqual([porteuse.atk, porteuse.def, porteuse.pv], [0, 5, 5], 'la Porteuse 0/3 entre en 0/5');
  assert.equal(rpgBlesserCreature(duel, 'joueur', porteuse.id, 4, 'braise').recus, 4);
  assert.deepEqual([porteuse.def, porteuse.pv], [1, 1], 'quatre blessures : elle ne tient plus qu’à 1 PV');
  assert.equal(rpgBlesserCreature(duel, 'joueur', seconde.id, 100, 'braise').ok, true);
  assert.ok(duel.joueur.creatures.includes(porteuse), 'la perte de l’égide ne l’achève pas');
  assert.equal(porteuse.pv, 1, 'au pire, 1 PV');
  assert.deepEqual([mien.atk, mien.def, mien.pv], [2, 2, 2], 'le Chien retrouve son 2/2');
  assert.deepEqual([fennec.atk, fennec.def, fennec.pv], [3, 1, 1], 'le Fennec retrouve son 3/1');
});

test('la portée d’une arrivée ciblée est déclarée une fois, pour le moteur et pour la table', () => {
  const portees = Object.fromEntries(
    ['cavalier-amazigh-du-desert', 'vipere-de-verre', 'leviathan', 'sonneur-fele', 'susanoo',
      'guetteur-du-beffroi', 'ifrit-des-ergs', 'braisier-du-souk']
      .map((id) => [id, arriveeCiblePortee(cardById(id))]),
  );
  assert.deepEqual(portees, {
    'cavalier-amazigh-du-desert': 'ennemi', // le duel : une créature adverse
    'vipere-de-verre': 'ennemi',            // le venin (debuff ciblé)
    leviathan: null,                        // la vague renvoie toute la table : aucune désignation
    'sonneur-fele': 'ennemi',               // le rebond (retour-main, cible créature)
    susanoo: 'tous',                        // l’exil choisit dans les deux camps
    'guetteur-du-beffroi': null,            // les Heures ne désignent personne
    'ifrit-des-ergs': null,                 // les dégâts au sorcier non plus
    'braisier-du-souk': null,               // ni les dégâts de zone
  }, 'seule une arrivée qui désigne une cible annonce sa portée');
  assert.equal(arriveeCiblePortee(cardById('bakunawa')), 'ennemi', 'la lune de Bakunawa marque une créature adverse');
  assert.equal(arriveeCiblePortee(cardById('faiseur-de-passage')), 'allie', 'le Faiseur prête le passage à un allié');
});

test('une arrivée ciblée se désigne APRÈS la pose : la créature entre en jeu d’abord', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 30);
  donnerMana(duel, 'sorcier', 30);
  donner(duel, 'sorcier', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  assert.equal(arriveeACibleLegale(duel, 'joueur', cardById('vipere-de-verre')), true,
    'le Chien adverse est une cible légale pour la morsure');

  donner(duel, 'joueur', 'vipere-de-verre');
  const manaAvant = { ...duel.joueur.mana };
  const pose = rpgJouerCreature(duel, 'joueur', 'vipere-de-verre', null, { cibleDifferee: true });
  assert.equal(pose.ok, true, 'la pose différée passe : la Vipère entre en jeu sans cible');
  assert.equal(duel.joueur.creatures.includes(pose.entite), true, 'la Vipère est sur la table');
  assert.equal(duel.joueur.main.includes('vipere-de-verre'), false, 'la carte a quitté la main');
  assert.notDeepEqual(duel.joueur.mana, manaAvant, 'le mana a bien été payé');
  assert.equal(pose.arriveeEnAttente, true, 'l’arrivée reste en attente de sa victime');
  assert.deepEqual(duel.arriveeEnAttente, {
    cote: 'joueur', entiteId: pose.entite.id, carteId: 'vipere-de-verre',
  }, 'le duel retient quelle créature doit encore désigner');
  assert.equal(chien.pv, 2, 'la morsure n’a pas encore eu lieu : la cible se choisit sur la table');

  const res = rpgResoudreArriveeCiblee(duel, 'joueur', chien.id);
  assert.equal(res.ok, true, 'la désignation referme l’attente');
  assert.equal(chien.atk, 0, 'le venin retire 2 attaques à la créature choisie');
  assert.ok(chien.empecheAttaqueToursRestants > 0, 'elle ne pourra pas attaquer avant la fin de son prochain tour');
  assert.equal(duel.sorcier.creatures.includes(chien), true, 'le venin ronge, il ne tue pas');
  assert.equal(duel.arriveeEnAttente, null, 'il ne reste rien à désigner');
  assert.ok(duel.joueur.creatures.includes(pose.entite), 'la Vipère, elle, reste en jeu');
});

test('le venin de la Vipère ronge jusqu’au bout du tour de sa victime', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 30);
  donnerMana(duel, 'sorcier', 30);
  donner(duel, 'sorcier', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  donner(duel, 'joueur', 'vipere-de-verre');
  rpgJouerCreature(duel, 'joueur', 'vipere-de-verre', null, { cibleDifferee: true });
  rpgResoudreArriveeCiblee(duel, 'joueur', chien.id);
  assert.equal(chien.atk, 0, 'la morsure retire 2 attaques à la créature choisie');

  // La morsure ne s'évapore pas à la fin du tour du joueur qui l'a donnée :
  // elle tient tout le tour de la victime, comme l'interdit d'attaquer.
  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'sorcier', 'c’est le tour de la victime');
  assert.equal(chien.atk, 0, 'le venin ronge encore pendant le tour de la victime');
  assert.ok(chien.empecheAttaqueToursRestants > 0, 'et la victime ne peut toujours pas attaquer');

  rpgFinDeTour(duel);
  assert.equal(chien.atk, 2, 'à la fin du tour de la victime, le venin s’évapore');
  assert.equal(chien.empecheAttaqueToursRestants, 0, 'et la victime peut de nouveau attaquer');
  assert.equal(chien.venin ?? null, null, 'plus rien ne ronge la créature');
});

test('une arrivée différée sans cible légale se résout avec la pose, sans attente', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 30);
  donner(duel, 'joueur', 'vipere-de-verre');
  const pose = rpgJouerCreature(duel, 'joueur', 'vipere-de-verre', null, { cibleDifferee: true });
  assert.equal(pose.ok, true, 'la table adverse est vide : rien à désigner, la pose se résout');
  assert.equal(pose.arriveeEnAttente, undefined, 'aucune attente n’est ouverte');
  assert.equal(duel.arriveeEnAttente ?? null, null, 'le duel ne retient rien');
  assert.equal(duel.joueur.creatures.includes(pose.entite), true, 'la Vipère est bien en jeu');
});

test('la désignation différée revalide sa cible : camp, protection, attente close', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 30);
  donnerMana(duel, 'sorcier', 30);
  donner(duel, 'sorcier', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  donner(duel, 'sorcier', 'dune-marchante');
  const dune = rpgJouerCreature(duel, 'sorcier', 'dune-marchante').entite;

  assert.equal(rpgResoudreArriveeCiblee(duel, 'joueur', chien.id).raison, 'aucune-attente',
    'sans attente ouverte, aucune désignation n’est acceptée');
  donner(duel, 'joueur', 'vipere-de-verre');
  const pose = rpgJouerCreature(duel, 'joueur', 'vipere-de-verre', null, { cibleDifferee: true });
  assert.equal(rpgResoudreArriveeCiblee(duel, 'joueur', 'entite-absente').raison, 'cible',
    'une cible qui n’est pas sur la table est refusée');
  assert.equal(rpgResoudreArriveeCiblee(duel, 'joueur', pose.entite.id).raison, 'cible',
    'sa propre créature n’est pas une victime : la morsure ne vise que l’adversaire');
  // La Vipère de verre est une Eau : la protection contre l’Eau arrête sa morsure.
  Object.assign(dune, { protection: { contre: 'eau', toursRestants: 2 } });
  assert.equal(rpgResoudreArriveeCiblee(duel, 'joueur', dune.id).raison, 'protection',
    'la protection contre la couleur du venin refuse la morsure, comme avant');
  assert.equal(rpgResoudreArriveeCiblee(duel, 'joueur', chien.id).ok, true,
    'une cible légale finit par refermer l’attente');

  // L’exil du Susanoo, lui, choisit dans les deux camps — mais jamais lui-même.
  donner(duel, 'joueur', 'susanoo');
  const susanoo = rpgJouerCreature(duel, 'joueur', 'susanoo', null, { cibleDifferee: true });
  assert.equal(susanoo.arriveeEnAttente, true, 'le Susanoo se pose, puis désigne son exil');
  assert.equal(rpgResoudreArriveeCiblee(duel, 'joueur', susanoo.entite.id).raison, 'cible',
    'la créature qui porte l’arrivée ne se désigne pas elle-même');
  assert.equal(rpgResoudreArriveeCiblee(duel, 'joueur', pose.entite.id).ok, true,
    'en revanche, elle peut exiler une autre créature — ici la Vipère du même camp');
  assert.equal(duel.joueur.creatures.includes(pose.entite), false, 'la Vipère choisie est retirée de la partie');
});

test('le Cavalier doit choisir une créature adverse et combat mutuellement à son arrivée', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'cavalier-amazigh-du-desert');
  donner(duel, 'sorcier', 'chien-du-guet');
  const cible = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;

  const manaAvant = { ...duel.joueur.mana };
  const sansCible = rpgJouerCreature(duel, 'joueur', 'cavalier-amazigh-du-desert');
  assert.deepEqual(sansCible, { ok: false, raison: 'cible' }, 'le Cavalier attend une cible adverse légale');
  assert.deepEqual(duel.joueur.mana, manaAvant, 'une pose sans cible ne paie rien');
  assert.ok(duel.joueur.main.includes('cavalier-amazigh-du-desert'), 'la carte reste en main jusqu’au choix');

  const debut = rpgNombreDestructions(duel);
  const pose = rpgJouerCreature(duel, 'joueur', 'cavalier-amazigh-du-desert', cible.id);
  assert.equal(pose.ok, true);
  assert.equal(pose.entite.pv, 2, 'le Cavalier reçoit en retour les 2 dégâts de l’attaque du Chien');
  assert.ok(!duel.sorcier.creatures.includes(cible), 'les 4 dégâts du Cavalier détruisent le Chien 2/2');
  assert.deepEqual(rpgDestructionsDepuis(duel, debut), [
    { entityId: cible.id, sourceElements: ['sable'] },
  ], 'la destruction de la cible est attribuée au Cavalier Sable');
  assert.ok(duel.log.some((entry) => /Cavalier amazigh du Désert se bat contre Chien du guet \(4 \/ 2\)/.test(entry)),
    'le journal annonce l’affrontement et les deux attaques');
});

test('les deux combattants meurent bien simultanément avant les effets de destruction', () => {
  const duel = duelDeBase();
  duel.sorcier.deck.push('mer', 'mer');
  donnerMana(duel, 'joueur', 30);
  donnerMana(duel, 'sorcier', 30);
  donner(duel, 'joueur', 'cavalier-amazigh-du-desert');
  donner(duel, 'sorcier', 'drakkar-a-tete-de-dragon');
  const drakkar = rpgJouerCreature(duel, 'sorcier', 'drakkar-a-tete-de-dragon').entite;
  Object.assign(drakkar, { atk: 4, def: 4, pv: 4, pvMax: 4 });
  const mainAvant = duel.sorcier.main.length;

  const debut = rpgNombreDestructions(duel);
  const pose = rpgJouerCreature(duel, 'joueur', 'cavalier-amazigh-du-desert', drakkar.id);
  assert.equal(pose.ok, true);
  assert.ok(!duel.joueur.creatures.includes(pose.entite), 'les 4 dégâts du Drakkar détruisent le Cavalier');
  assert.ok(!duel.sorcier.creatures.includes(drakkar), 'les 4 dégâts du Cavalier détruisent le Drakkar');
  assert.equal(duel.sorcier.main.length, mainAvant + 1,
    'la capacité de destruction du Drakkar se résout ensuite et fait piocher une carte');
  assert.deepEqual(rpgDestructionsDepuis(duel, debut), [
    { entityId: drakkar.id, sourceElements: ['sable'] },
    { entityId: pose.entite.id, sourceElements: ['neige'] },
  ], 'les deux blessures mutuelles précèdent bien les capacités de destruction');
});

test('Rapidité permet au Fennec d’attaquer dès son tour de pose', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donner(duel, 'joueur', 'fennec-des-decombres');
  const fennec = rpgJouerCreature(duel, 'joueur', 'fennec-des-decombres').entite;
  assert.equal(fennec.rapidite, true, 'la capacité est portée par l’entité en jeu');
  assert.equal(fennec.ready, true, 'le Fennec est prêt dès son arrivée malgré le mal d’invocation habituel');
  const pvAvant = duel.sorcier.pv;
  const attaque = rpgLancerAttaque(duel, 'joueur', [fennec.id]);
  assert.equal(attaque.ok, true, 'le moteur accepte son attaque le tour où il a été posé');
  assert.equal(duel.sorcier.pv, pvAvant - 3, 'son attaque peut toucher directement dès ce tour');
  assert.equal(fennec.attaquee, true, 'l’attaque immédiate est bien consommée pour le tour');
});

test('le Djinn de foudre gagne Rapidité en plus de son Coup rapide', () => {
  const djinn = cardById('djinn-de-foudre');
  assert.deepEqual({ cost: djinn.cost, atk: djinn.atk, def: djinn.def, rapidite: djinn.rapidite, coupRapide: djinn.coupRapide }, {
    cost: 2, atk: 2, def: 1, rapidite: true, coupRapide: true,
  });
  assert.match(djinn.text, /^Rapidité.*Coup rapide — /);

  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'djinn-de-foudre');
  const entite = rpgJouerCreature(duel, 'joueur', 'djinn-de-foudre').entite;
  assert.equal(entite.rapidite, true, 'la capacité est portée par l’entité en jeu');
  assert.equal(entite.ready, true, 'le Djinn est prêt dès son arrivée malgré le mal d’invocation habituel');
});

test('Fériel est une mythique 4 mana 3/2 avec Rapidité et Coup rapide', () => {
  const feriel = cardById('feriel');
  assert.deepEqual({ cost: feriel.cost, atk: feriel.atk, def: feriel.def, rarity: feriel.rarity, rapidite: feriel.rapidite, coupRapide: feriel.coupRapide }, {
    cost: 4, atk: 3, def: 2, rarity: 'mythique', rapidite: true, coupRapide: true,
  });
  assert.equal(feriel.arrivee, undefined, 'son ancien effet de dégâts à l’arrivée est retiré');
  assert.match(feriel.text, /Rapidité/);
  assert.match(feriel.text, /Coup rapide.*sélectionnée pour attaquer.*créature adverse.*dégâts d’attaque/i);
  assert.equal(cardArtId(feriel), 'feriel', 'Fériel utilise sa nouvelle illustration dédiée');
});

test('le Coup rapide frappe la créature désignée, et l’attaque s’arrête là', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'feriel');
  const feriel = rpgJouerCreature(duel, 'joueur', 'feriel').entite;
  donner(duel, 'sorcier', 'fennec-des-decombres');
  const fennec = rpgJouerCreature(duel, 'sorcier', 'fennec-des-decombres').entite;
  Object.assign(fennec, { pv: 5, def: 5, pvMax: 5 });

  assert.equal(feriel.ready, true, 'Fériel peut attaquer dès son tour de pose');
  const pvSorcier = duel.sorcier.pv;
  const res = rpgLancerAttaque(duel, 'joueur', [feriel.id], {}, null, null, { [feriel.id]: fennec.id });
  assert.equal(res.ok, true);
  assert.equal(fennec.pv, 2, 'les 3 dégâts d’attaque pleins entament le Fennec de 5 PV');
  assert.equal(feriel.pv, 2, 'la créature visée ne riposte pas contre le Coup rapide');
  assert.equal(duel.sorcier.pv, pvSorcier, 'l’attaque s’arrête sur la frappe : le sorcier ne prend rien');
  assert.equal(res.resume.frappeSorcier, 0);
  assert.deepEqual(res.resume.paires, [], 'aucun combat de blocage : la frappe a clos l’attaque');
  assert.equal(feriel.attaquee, true, 'Fériel a consommé son attaque');
  assert.deepEqual(res.resume.coupsRapides.map(({ attaquant, cible, degats }) => ({ attaquant, cible, degats })), [
    { attaquant: 'FÉRIEL', cible: 'Fennec des décombres', degats: 3 },
  ]);
});

test('le Coup rapide a 25 % de chances de rater une créature, mais touche toujours l’adversaire à 100 %', () => {
  const cartesCoupRapide = RPG_DUEL_CARDS.filter((carte) => carte.coupRapide || carte.donne?.coupRapide || carte.effet?.coupRapide);
  assert.ok(cartesCoupRapide.length >= 9);
  for (const carte of cartesCoupRapide) {
    assert.match(carte.text, /25\s*%/, `${carte.id} précise les 25 % de chances de rater`);
    assert.match(carte.text, /100\s*%/, `${carte.id} précise les 100 % contre l’adversaire`);
  }

  // Jet < 0.25 : la frappe rapide contre une créature rate, l’attaque s’arrête là.
  const duelRate = duelDeBase({ rng: () => 0.24 });
  donnerMana(duelRate, 'joueur', 20);
  donnerMana(duelRate, 'sorcier', 20);
  donner(duelRate, 'joueur', 'feriel');
  const ferielRate = rpgJouerCreature(duelRate, 'joueur', 'feriel').entite;
  donner(duelRate, 'sorcier', 'fennec-des-decombres');
  const fennecRate = rpgJouerCreature(duelRate, 'sorcier', 'fennec-des-decombres').entite;
  const pvSorcierAvant = duelRate.sorcier.pv;
  const resRate = rpgLancerAttaque(duelRate, 'joueur', [ferielRate.id], {}, null, null, { [ferielRate.id]: fennecRate.id });
  assert.equal(resRate.ok, true);
  assert.equal(resRate.resume.coupsRapides[0].rate, true, 'le jet sous 0.25 marque le Coup rapide comme raté');
  assert.equal(resRate.resume.coupsRapides[0].degats, 0, 'aucun dégât infligé en cas d’échec');
  assert.equal(fennecRate.pv, fennecRate.pvMax, 'la créature ciblée reste indemne');
  assert.equal(duelRate.sorcier.pv, pvSorcierAvant, 'l’attaque s’arrête quand même : le sorcier ne prend rien');
  assert.equal(ferielRate.attaquee, true, 'l’attaquant est engagé malgré le raté');
  assert.ok(duelRate.log.some((ligne) => ligne.includes('rate son Coup rapide contre Fennec des décombres')));

  // Jet >= 0.25 : la frappe rapide touche sa cible.
  const duelTouche = duelDeBase({ rng: () => 0.25 });
  donnerMana(duelTouche, 'joueur', 20);
  donnerMana(duelTouche, 'sorcier', 20);
  donner(duelTouche, 'joueur', 'feriel');
  const ferielTouche = rpgJouerCreature(duelTouche, 'joueur', 'feriel').entite;
  donner(duelTouche, 'sorcier', 'dune-marchante');
  const duneTouche = rpgJouerCreature(duelTouche, 'sorcier', 'dune-marchante').entite;
  const resTouche = rpgLancerAttaque(duelTouche, 'joueur', [ferielTouche.id], {}, null, null, { [ferielTouche.id]: duneTouche.id });
  assert.equal(resTouche.ok, true);
  assert.equal(resTouche.resume.coupsRapides[0].rate, undefined);
  assert.equal(resTouche.resume.coupsRapides[0].degats, 3);
  assert.equal(duneTouche.pv, duneTouche.pvMax - 3);

  // Sans créature désignée (attaque contre l’adversaire) : 100 % de réussite même avec rng = 0.
  const duelSorcier = duelDeBase({ rng: () => 0 });
  donnerMana(duelSorcier, 'joueur', 20);
  donner(duelSorcier, 'joueur', 'feriel');
  const ferielSorcier = rpgJouerCreature(duelSorcier, 'joueur', 'feriel').entite;
  const pvAdvAvant = duelSorcier.sorcier.pv;
  const resSorcier = rpgLancerAttaque(duelSorcier, 'joueur', [ferielSorcier.id], {});
  assert.equal(resSorcier.ok, true);
  assert.equal(duelSorcier.sorcier.pv, pvAdvAvant - 3, 'l’attaque sur l’adversaire touche toujours à 100 %');
});

test('sans créature désignée, le Coup rapide attaque le sorcier comme n’importe quel attaquant', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'feriel');
  const feriel = rpgJouerCreature(duel, 'joueur', 'feriel').entite;
  donner(duel, 'sorcier', 'fennec-des-decombres');
  const fennec = rpgJouerCreature(duel, 'sorcier', 'fennec-des-decombres').entite;

  const pvSorcier = duel.sorcier.pv;
  // Aucun bloqueur assigné : rien ne s’interpose, l’attaque va au sorcier.
  const res = rpgLancerAttaque(duel, 'joueur', [feriel.id], {});
  assert.equal(res.ok, true, 'aucune cible n’est exigée : le choix appartient à l’attaquant');
  assert.equal(duel.sorcier.pv, pvSorcier - 3, 'la voie est libre : elle frappe le sorcier');
  assert.equal(fennec.pv, fennec.pvMax, 'la créature adverse n’a rien encaissé');
  assert.deepEqual(res.resume.coupsRapides, [], 'aucune frappe rapide n’a été déclarée');
  assert.equal(feriel.attaquee, true, 'l’attaque est consommée comme les autres');
});

test('un Coup rapide qui ne frappe personne est bloqué comme n’importe quel attaquant', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'feriel');
  const feriel = rpgJouerCreature(duel, 'joueur', 'feriel').entite;
  donner(duel, 'sorcier', 'chien-du-guet');
  const vise = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  donner(duel, 'sorcier', 'chien-du-guet');
  const bloqueur = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  // Corps de test : le bloqueur (0 ATQ) absorbe le combat sans blesser Fériel.
  Object.assign(vise, { pv: 5, def: 5, pvMax: 5 });
  Object.assign(bloqueur, { atk: 0, pv: 1, def: 1, pvMax: 1 });
  feriel.ready = true;

  const pvSorcier = duel.sorcier.pv;
  const res = rpgLancerAttaque(duel, 'joueur', [feriel.id], { [feriel.id]: [bloqueur.id] }, null, null, {});
  assert.equal(res.ok, true);
  assert.equal(vise.pv, 5, 'aucune frappe rapide : la créature écartée reste intacte');
  assert.equal(duel.sorcier.creatures.includes(bloqueur), false,
    'le combat normal a lieu : le bloqueur meurt sous les dégâts de combat de Fériel');
  assert.equal(feriel.pv, 2, 'le bloqueur blessant à 0, Fériel sort indemne');
  assert.equal(duel.sorcier.pv, pvSorcier, 'bloquée, elle ne touche pas les PV du sorcier');
  assert.equal(res.resume.frappeSorcier, 0);
  assert.deepEqual(res.resume.paires, [[feriel.name, bloqueur.name]],
    'le blocage est compté dans le résumé du combat');
});

test('la frappe du Coup rapide n’est pas bloquable : l’attaquant s’arrête dessus', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'feriel');
  const feriel = rpgJouerCreature(duel, 'joueur', 'feriel').entite;
  donner(duel, 'sorcier', 'chien-du-guet');
  const vise = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  const bloqueur = vise;
  feriel.ready = true;

  assert.equal(rpgPeutBloquerAttaquant(bloqueur, feriel, true), false,
    'la frappe rapide ne laisse rien à bloquer');
  assert.equal(rpgLancerAttaque(duel, 'joueur', [feriel.id], { [feriel.id]: [bloqueur.id] }, null, null,
    { [feriel.id]: vise.id }).raison, 'blocage',
    'désigner une proie et un bloqueur est contradictoire, la déclaration est refusée');
  assert.equal(feriel.attaquee, false, 'un refus ne consomme rien — ni l’attaque, ni la phase');
});

test('Provocation : l’IA réserve le seul bloqueur capable d’arrêter le provocateur volant', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 30);
  donnerMana(duel, 'sorcier', 30);
  donner(duel, 'joueur', 'berserk-des-trois-hivers');
  const auSol = rpgJouerCreature(duel, 'joueur', 'berserk-des-trois-hivers').entite;
  donner(duel, 'joueur', 'berserk-des-trois-hivers');
  const volant = rpgJouerCreature(duel, 'joueur', 'berserk-des-trois-hivers').entite;
  volant.envol = true; // même provocateur, mais seul un bloqueur volant peut l'arrêter
  donner(duel, 'sorcier', 'anqa-des-braises');
  const bloqueurVolant = rpgJouerCreature(duel, 'sorcier', 'anqa-des-braises').entite;
  bloqueurVolant.jeton = true; // le choix le plus tentant pour le Berserk au sol
  donner(duel, 'sorcier', 'chien-du-guet');
  const bloqueurAuSol = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;

  const blocages = rpgChoisirBloqueurs(duel, 'joueur', [auSol.id, volant.id]);
  assert.deepEqual(blocages[volant.id], [bloqueurVolant.id],
    'le bloqueur volant est réservé au seul attaquant qu’il peut arrêter');
  assert.deepEqual(blocages[auSol.id], [bloqueurAuSol.id],
    'le bloqueur terrestre couvre l’autre provocateur');
  assert.equal(rpgProvocationValide(duel, 'joueur', [auSol.id, volant.id], blocages), true);
  assert.equal(rpgProvocationValide(
    duel, 'joueur', [auSol.id, volant.id], { [auSol.id]: [bloqueurVolant.id] },
  ), false, 'utiliser le bloqueur volant au sol laisserait le provocateur volant découvert alors qu’un appariement complet existe');
});

test('Provocation : sans bloqueur légal, l’attaque peut passer', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'berserk-des-trois-hivers');
  const berserk = rpgJouerCreature(duel, 'joueur', 'berserk-des-trois-hivers').entite;
  berserk.envol = true;
  berserk.ready = true;
  donner(duel, 'sorcier', 'chien-du-guet');
  rpgJouerCreature(duel, 'sorcier', 'chien-du-guet'); // terrestre : aucun blocage légal du volant

  assert.equal(rpgProvocationValide(duel, 'joueur', [berserk.id], {}), true,
    '« si possible » ne crée pas un bloqueur volant inexistant');
  const pvSorcier = duel.sorcier.pv;
  assert.equal(rpgLancerAttaque(duel, 'joueur', [berserk.id], {}).ok, true);
  assert.equal(duel.sorcier.pv, pvSorcier - 1);
});

test('Provocation : deux provocateurs pour un seul bloqueur n’exigent que le maximum possible', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 30);
  donnerMana(duel, 'sorcier', 30);
  donner(duel, 'joueur', 'berserk-des-trois-hivers');
  const premier = rpgJouerCreature(duel, 'joueur', 'berserk-des-trois-hivers').entite;
  donner(duel, 'joueur', 'berserk-des-trois-hivers');
  const second = rpgJouerCreature(duel, 'joueur', 'berserk-des-trois-hivers').entite;
  donner(duel, 'sorcier', 'chien-du-guet');
  const bloqueur = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;

  assert.equal(rpgProvocationValide(duel, 'joueur', [premier.id, second.id], {}), false,
    'le seul bloqueur disponible doit tout de même s’interposer');
  assert.equal(rpgProvocationValide(
    duel, 'joueur', [premier.id, second.id], { [premier.id]: [bloqueur.id] },
  ), true, 'un bloqueur ne peut pas couvrir deux provocateurs : le maximum possible suffit');
});

test('l’IA abat d’un Coup rapide la créature qu’elle peut tuer, et son attaque s’arrête', () => {
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.999 });
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  donner(duel, 'sorcier', 'feriel');
  const feriel = rpgJouerCreature(duel, 'sorcier', 'feriel').entite;
  const pvJoueur = duel.joueur.pv;

  rpgTourSorcierIA(duel);
  assert.equal(duel.joueur.creatures.includes(chien), false, 'Fériel abat le Chien 2/2 d’une frappe');
  assert.equal(duel.joueur.pv, pvJoueur, 'l’attaque s’arrête sur la frappe : le joueur ne prend rien');
  assert.equal(feriel.attaquee, true, 'l’attaque rapide de l’IA est bien consommée');
});

test('l’IA ne s’arrête pas sur une créature qu’elle ne tue pas : elle attaque le sorcier', () => {
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.999 });
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  Object.assign(chien, { pv: 5, def: 5, pvMax: 5 });
  // Le Chien s’est déjà engagé à l’attaque : il ne peut plus bloquer, et rien
  // ne se met devant le Coup rapide — l’IA doit donc choisir sa cible.
  chien.attaquee = true;
  donner(duel, 'sorcier', 'feriel');
  const feriel = rpgJouerCreature(duel, 'sorcier', 'feriel').entite;
  const pvJoueur = duel.joueur.pv;

  rpgTourSorcierIA(duel);
  assert.equal(chien.pv, 5, 'le Chien survit à la frappe : l’IA ne s’y arrête pas');
  assert.equal(duel.joueur.pv, pvJoueur - 3, 'Fériel attaque normalement et frappe le joueur');
  assert.equal(feriel.attaquee, true, 'l’attaque est consommée');
});

test('les capacités de feu punissent les bloqueurs et rendent les djinns distincts', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 100);
  donnerMana(duel, 'sorcier', 100);
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  donner(duel, 'sorcier', 'ghul-des-cendres');
  const ghul = rpgJouerCreature(duel, 'sorcier', 'ghul-des-cendres').entite;
  const pvChien = chien.pv;
  rpgBlesserCreature(duel, 'sorcier', ghul.id, 1);
  assert.equal(chien.pv, pvChien - 1, 'le Ghul inflige un dégât aux créatures adverses en mourant');

  donner(duel, 'sorcier', 'ifrit-des-ergs');
  const pvJoueur = duel.joueur.pv;
  const ifrit = rpgJouerCreature(duel, 'sorcier', 'ifrit-des-ergs').entite;
  assert.equal(duel.joueur.pv, pvJoueur, 'l’Ifrit n’a plus d’effet d’arrivée');
  rpgBlesserCreature(duel, 'sorcier', ifrit.id, 10, 'eau');
  assert.equal(duel.joueur.pv, pvJoueur - 4,
    'l’Ifrit détruit inflige 4 dégâts au sorcier adverse');
  donner(duel, 'sorcier', 'ifrit-al-ahmar');
  rpgJouerCreature(duel, 'sorcier', 'ifrit-al-ahmar');
  assert.equal(duel.joueur.creatures.length, 0, 'l’Ifrit al-Ahmar balaie les créatures adverses à son arrivée');
});

test('le Ghul des cendres : son contrôleur désigne la créature frappée à sa mort', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);

  // Deux créatures adverses : le choix est ouvert, la frappe attend un clic.
  donner(duel, 'sorcier', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  donner(duel, 'sorcier', 'dune-marchante');
  const dune = rpgJouerCreature(duel, 'sorcier', 'dune-marchante').entite;
  donner(duel, 'joueur', 'ghul-des-cendres');
  const ghul = rpgJouerCreature(duel, 'joueur', 'ghul-des-cendres').entite;
  rpgBlesserCreature(duel, 'joueur', ghul.id, 1, 'eau');
  assert.equal(duel.destructionsEnAttente?.length, 1, 'le Ghul mort attend sa désignation');
  assert.equal(rpgResoudreDestructionCiblee(duel, 'sorcier', chien.id).ok, false,
    'seul le contrôleur du mort désigne la victime');
  const pvDune = dune.pv;
  assert.equal(rpgResoudreDestructionCiblee(duel, 'joueur', dune.id).ok, true);
  assert.equal(dune.pv, pvDune - 1, 'la Dune encaisse le dégât choisi');
  assert.equal(duel.destructionsEnAttente.length, 0, 'l’attente est refermée');

  // Une seule cible légale : le joueur désigne quand même, la partie attend.
  rpgBlesserCreature(duel, 'sorcier', chien.id, 10, 'eau');
  donner(duel, 'joueur', 'ghul-des-cendres');
  const second = rpgJouerCreature(duel, 'joueur', 'ghul-des-cendres').entite;
  const pvDuneAvant = dune.pv;
  rpgBlesserCreature(duel, 'joueur', second.id, 1, 'eau');
  assert.equal(duel.destructionsEnAttente.length, 1,
    'une seule cible : le joueur doit tout de même la désigner');
  assert.equal(dune.pv, pvDuneAvant, 'rien n’est frappé avant le clic');
  assert.equal(rpgResoudreDestructionCiblee(duel, 'joueur', dune.id).ok, true);
  assert.equal(dune.pv, pvDuneAvant - 1, 'la Dune, seule cible légale, encaisse le dégât');
  assert.equal(duel.destructionsEnAttente.length, 0, 'l’attente est refermée');

  // Côté sorcier, l'IA choisit seule : jamais d'attente.
  donner(duel, 'joueur', 'chien-du-guet');
  const chienJoueur = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  donner(duel, 'joueur', 'fennec-des-decombres');
  const fennec = rpgJouerCreature(duel, 'joueur', 'fennec-des-decombres').entite;
  donner(duel, 'sorcier', 'ghul-des-cendres');
  const ghulSorcier = rpgJouerCreature(duel, 'sorcier', 'ghul-des-cendres').entite;
  const totalAvant = chienJoueur.pv + fennec.pv;
  rpgBlesserCreature(duel, 'sorcier', ghulSorcier.id, 1, 'eau');
  assert.equal(duel.destructionsEnAttente.length, 0, 'l’IA a frappé sans ouvrir d’attente');
  const survivants = duel.joueur.creatures.filter((entite) => [chienJoueur.id, fennec.id].includes(entite.id));
  const totalApres = survivants.reduce((somme, entite) => somme + entite.pv, 0);
  assert.equal(totalApres, totalAvant - 1, 'une des deux créatures du joueur a pris le dégât');
});

test('le Ghul retient la partie : pas de fin de tour avant la désignation, et l’effet se dissipe sans cible', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'sorcier', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  donner(duel, 'sorcier', 'dune-marchante');
  const dune = rpgJouerCreature(duel, 'sorcier', 'dune-marchante').entite;
  donner(duel, 'joueur', 'ghul-des-cendres');
  const ghul = rpgJouerCreature(duel, 'joueur', 'ghul-des-cendres').entite;
  rpgBlesserCreature(duel, 'joueur', ghul.id, 1, 'eau');
  assert.equal(duel.destructionsEnAttente.length, 1, 'la désignation est ouverte');

  // Le tour ne se ferme pas tant que le joueur n'a pas cliqué.
  duel.tour = 'joueur';
  duel.phase = 'principale2';
  const avant = { ...duel.joueur.mana };
  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'joueur', 'le tour ne passe pas tant que la cible manque');
  assert.deepEqual(duel.joueur.mana, avant, 'rien n’est remis à zéro par une fermeture avortée');
  assert.equal(duel.destructionsEnAttente.length, 1, 'l’attente reste ouverte');

  // Plus aucune créature légale : l'effet se dissipe et la partie repart.
  duel.sorcier.creatures = duel.sorcier.creatures.filter((entite) => entite.id !== chien.id);
  dune.protection = { contre: 'braise', toursRestants: 1 };
  assert.equal(rpgDissiperDestructionsSansCible(duel), 1, 'l’attente sans cible est dissipée');
  assert.equal(duel.destructionsEnAttente.length, 0);
  assert.ok(duel.log.some((ligne) => /se dissipe : aucune créature adverse/.test(ligne)),
    'le journal dit que l’effet se dissipe');
  rpgFinDeTour(duel);
  assert.notEqual(duel.tour, 'joueur', 'le tour se ferme dès que l’attente n’a plus d’objet');
});

test('le journal des blessures dit la couleur du coup et si la créature y a survécu', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'sorcier', 'leviathan');
  const leviathan = rpgJouerCreature(duel, 'sorcier', 'leviathan').entite;
  const coups = rpgBlesserCreature(duel, 'sorcier', leviathan.id, 1, 'braise', null, 'magie');
  assert.equal(coups.ok, true);
  const blessure = rpgDerniereBlessure(duel, leviathan.id);
  assert.deepEqual(blessure.elements, ['braise'], 'la roue de feu sait que le coup vient de la Braise');
  assert.equal(blessure.mortelle, false, 'la créature a survécu : rien n’est détruit');
  assert.equal(blessure.pvApres, leviathan.pv, 'le journal garde les points de vie d’après le coup');
  assert.equal(blessure.bouclierApres, leviathan.bouclier ?? 0,
    'la table compare cet état au champ pour ne pas rallumer une ancienne brûlure');
  // Une blessure d'une autre couleur ne se déguise pas en feu.
  rpgBlesserCreature(duel, 'sorcier', leviathan.id, 1, 'eau', null, 'magie');
  assert.deepEqual(rpgDerniereBlessure(duel, leviathan.id).elements, ['eau'],
    'la dernière blessure remplace la précédente : seul le coup neuf compte');
  assert.equal(rpgDerniereBlessure(duel, 'entite-inconnue'), null,
    'une créature jamais blessée n’a pas de blessure');
  // Le journal se lit par tranches : la table ne rejoue que les coups parus
  // depuis sa dernière action animée — jamais une ancienne brûlure.
  assert.equal(rpgNombreBlessures(duel), 2, 'deux blessures sont inscrites');
  const depuisPremiere = rpgBlessuresDepuis(duel, 1);
  assert.equal(depuisPremiere.length, 1, 'la seconde tranche ne contient que le second coup');
  assert.deepEqual(depuisPremiere[0].elements, ['eau']);
  assert.deepEqual(rpgBlessuresDepuis(duel, 2), [], 'plus rien après la dernière blessure');
});

test('une blessure mortelle de la Braise est journalisée comme telle', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'sorcier', 'fennec-des-decombres');
  const fennec = rpgJouerCreature(duel, 'sorcier', 'fennec-des-decombres').entite;
  rpgBlesserCreature(duel, 'sorcier', fennec.id, 9, 'braise', null, 'magie');
  assert.equal(duel.sorcier.creatures.length, 0, 'le Fennec est détruit');
  const blessure = rpgDerniereBlessure(duel, fennec.id);
  assert.equal(blessure.mortelle, true,
    'la table saura que la carte a quitté la table sous ce coup — pas par autre chose');
  assert.deepEqual(blessure.elements, ['braise']);
});

test('le journal des blessures nomme la carte du coup : l’Éclair du marteau se reconnaît', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);

  // La créature que le marteau touche sans la tuer.
  donner(duel, 'sorcier', 'leviathan');
  const leviathan = rpgJouerCreature(duel, 'sorcier', 'leviathan').entite;
  const pvAvant = leviathan.pv;
  donner(duel, 'joueur', 'eclair-du-marteau');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'eclair-du-marteau', leviathan.id).ok, true);
  assert.equal(leviathan.pv, pvAvant - 3, 'le marteau inflige ses 3 dégâts');
  const blessureMarteau = rpgDerniereBlessure(duel, leviathan.id);
  assert.equal(blessureMarteau.sourceCarteId, 'eclair-du-marteau',
    'la table saura faire tomber la foudre sur cette créature — et sur elle seule');
  assert.deepEqual(blessureMarteau.elements, ['neige']);
  assert.equal(blessureMarteau.mortelle, false);

  // Un autre sort de Neige nomme sa propre carte : pas de marteau pour lui.
  donner(duel, 'sorcier', 'dune-marchante');
  const dune = rpgJouerCreature(duel, 'sorcier', 'dune-marchante').entite;
  donner(duel, 'joueur', 'poigne-de-givre');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'poigne-de-givre', dune.id).ok, true);
  assert.equal(rpgDerniereBlessure(duel, dune.id).sourceCarteId, 'poigne-de-givre',
    'la Poigne de givre ne se déguise pas en Éclair du marteau');

  // Un coup direct, sans carte lancée, reste anonyme.
  rpgBlesserCreature(duel, 'sorcier', leviathan.id, 1, 'neige', null, 'capacite');
  assert.equal(rpgDerniereBlessure(duel, leviathan.id).sourceCarteId, null,
    'une capacité ne fait pas tomber le marteau');

  // La créature que le marteau tue : la foudre tombera sur son emplacement.
  donner(duel, 'sorcier', 'fennec-des-decombres');
  const fennec = rpgJouerCreature(duel, 'sorcier', 'fennec-des-decombres').entite;
  donner(duel, 'joueur', 'eclair-du-marteau');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'eclair-du-marteau', fennec.id).ok, true);
  assert.equal(duel.sorcier.creatures.some((entite) => entite.id === fennec.id), false,
    'le Fennec ne survit pas au marteau');
  const blessureMortelle = rpgDerniereBlessure(duel, fennec.id);
  assert.equal(blessureMortelle.sourceCarteId, 'eclair-du-marteau');
  assert.equal(blessureMortelle.mortelle, true,
    'la table fera tomber la foudre là où la créature se tenait');
});

test('le journal de destruction distingue la source immédiate et les capacités déclenchées', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);

  donner(duel, 'sorcier', 'fennec-des-decombres');
  const fennecToucheParEau = rpgJouerCreature(duel, 'sorcier', 'fennec-des-decombres').entite;
  donner(duel, 'joueur', 'lame-de-mer');
  const debutEau = rpgNombreDestructions(duel);
  assert.equal(rpgLancerMagie(duel, 'joueur', 'lame-de-mer', fennecToucheParEau.id).ok, true);
  assert.deepEqual(rpgDestructionsDepuis(duel, debutEau), [
    { entityId: fennecToucheParEau.id, sourceElements: ['eau'] },
  ], 'un sort Eau reste distingué d’une destruction par Braise');

  donner(duel, 'joueur', 'trait-de-braise');
  donner(duel, 'sorcier', 'fennec-des-decombres');
  const fennecToucheParFeu = rpgJouerCreature(duel, 'sorcier', 'fennec-des-decombres').entite;
  const debutBraise = rpgNombreDestructions(duel);
  assert.equal(rpgLancerMagie(duel, 'joueur', 'trait-de-braise', fennecToucheParFeu.id).ok, true);
  assert.deepEqual(rpgDestructionsDepuis(duel, debutBraise), [
    { entityId: fennecToucheParFeu.id, sourceElements: ['braise'] },
  ], 'un sort Braise attribue la destruction à la bonne créature cible');

  donner(duel, 'joueur', 'fennec-des-decombres');
  const fennecDuJoueur = rpgJouerCreature(duel, 'joueur', 'fennec-des-decombres').entite;
  donner(duel, 'sorcier', 'ghul-des-cendres');
  const ghul = rpgJouerCreature(duel, 'sorcier', 'ghul-des-cendres').entite;
  const debutCapacite = rpgNombreDestructions(duel);
  rpgBlesserCreature(duel, 'sorcier', ghul.id, 1, 'eau');
  assert.deepEqual(rpgDestructionsDepuis(duel, debutCapacite), [
    { entityId: ghul.id, sourceElements: ['eau'] },
    { entityId: fennecDuJoueur.id, sourceElements: ['braise'] },
  ], 'le Ghul meurt par Eau, mais son effet de Braise brûle correctement sa victime');
});

test('les dégâts d’arrivée Braise attribuent la destruction à la créature source', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'sorcier', 'fennec-des-decombres');
  const fennec = rpgJouerCreature(duel, 'sorcier', 'fennec-des-decombres').entite;
  donner(duel, 'joueur', 'braisier-du-souk');

  const debutArrivee = rpgNombreDestructions(duel);
  const poseBraisier = rpgJouerCreature(duel, 'joueur', 'braisier-du-souk');
  assert.equal(poseBraisier.ok, true);
  assert.deepEqual(
    [poseBraisier.entite.atk, poseBraisier.entite.def, poseBraisier.entite.pv],
    [1, 1, 1],
    'le Braisier du souk entre désormais en 1/1',
  );
  assert.deepEqual(rpgDestructionsDepuis(duel, debutArrivee), [
    { entityId: fennec.id, sourceElements: ['braise'] },
  ], 'le dégât d’arrivée du Braisier est reconnu comme source Braise');
});

test('le Sahir abat le Fennec avant qu’il ne puisse infliger ses blessures de combat', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'sahir-des-braises');
  donner(duel, 'sorcier', 'fennec-des-decombres');
  const sahir = rpgJouerCreature(duel, 'joueur', 'sahir-des-braises').entite;
  const fennec = rpgJouerCreature(duel, 'sorcier', 'fennec-des-decombres').entite;
  sahir.ready = true;

  const debutCombat = rpgNombreDestructions(duel);
  const combat = rpgLancerAttaque(duel, 'joueur', [sahir.id], { [sahir.id]: [fennec.id] });
  assert.equal(combat.ok, true);
  assert.deepEqual(rpgDestructionsDepuis(duel, debutCombat), [
    { entityId: fennec.id, sourceElements: ['braise'] },
  ], 'les 2 dégâts préalables du Sahir tuent le Fennec avant les blessures de combat');
  assert.equal(duel.sorcier.creatures.includes(fennec), false);
  assert.equal(sahir.pv, sahir.pvMax, 'le Fennec détruit ne peut plus infliger ses 3 dégâts au Sahir');
});

test('Sahir des braises est mythique, conserve sa pioche et gagne 2 dégâts en combat', () => {
  const carte = cardById('sahir-des-braises');
  assert.equal(carte.rarity, 'mythique');
  assert.deepEqual(carte.arrivee, { type: 'pioche', amount: 1 });
  assert.deepEqual(carte.combat, { type: 'degats-creature-combattue', amount: 2 });
  assert.match(carte.text, /attaque ou bloque/i);
  assert.match(carte.text, /avant les blessures de combat/i, 'le texte précise que les 2 dégâts partent en premier');
});

test('Sahir inflige ses 2 dégâts à la créature qui le bloque quand il attaque', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'sahir-des-braises');
  donner(duel, 'sorcier', 'colosse-de-sel');
  const sahir = rpgJouerCreature(duel, 'joueur', 'sahir-des-braises').entite;
  const bloqueur = rpgJouerCreature(duel, 'sorcier', 'colosse-de-sel').entite;
  sahir.ready = true;

  const combat = rpgLancerAttaque(duel, 'joueur', [sahir.id], { [sahir.id]: [bloqueur.id] });
  assert.equal(combat.ok, true);
  assert.equal(bloqueur.pv, 2, 'le Colosse 6/6 reçoit 2 dégâts d’attaque et 2 dégâts du Sahir');
  assert.equal(duel.joueur.creatures.includes(sahir), false,
    'le Colosse survit aux dégâts préalables et inflige ensuite ses blessures normales au Sahir');
});

test('Sahir inflige ses 2 dégâts à la créature qu’il bloque', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'sahir-des-braises');
  donner(duel, 'sorcier', 'colosse-de-sel');
  const bloqueur = rpgJouerCreature(duel, 'joueur', 'sahir-des-braises').entite;
  const attaquant = rpgJouerCreature(duel, 'sorcier', 'colosse-de-sel').entite;
  attaquant.ready = true;

  const combat = rpgLancerAttaque(duel, 'sorcier', [attaquant.id], { [attaquant.id]: [bloqueur.id] });
  assert.equal(combat.ok, true);
  assert.equal(attaquant.pv, 2, 'le Sahir bloqueur inflige 2 dégâts en plus de ses 2 dégâts de combat');
  assert.equal(duel.joueur.creatures.includes(bloqueur), false,
    'le Colosse survit aux dégâts préalables et tue ensuite le Sahir avec ses blessures normales');
});

test('un Sahir bloqueur détruit le Fennec avant ses blessures de combat', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'sahir-des-braises');
  donner(duel, 'sorcier', 'fennec-des-decombres');
  const sahir = rpgJouerCreature(duel, 'joueur', 'sahir-des-braises').entite;
  const fennec = rpgJouerCreature(duel, 'sorcier', 'fennec-des-decombres').entite;
  fennec.ready = true;

  const combat = rpgLancerAttaque(duel, 'sorcier', [fennec.id], { [fennec.id]: [sahir.id] });
  assert.equal(combat.ok, true);
  assert.equal(duel.sorcier.creatures.includes(fennec), false, 'les 2 dégâts préalables tuent le Fennec 3/1');
  assert.equal(duel.joueur.creatures.includes(sahir), true, 'le Sahir reste en jeu');
  assert.equal(sahir.pv, sahir.pvMax, 'le Fennec tué ne porte pas ses 3 dégâts');
});

test('rpgAttaquerCreature résout aussi les dégâts du Sahir avant la riposte', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'sahir-des-braises');
  donner(duel, 'sorcier', 'fennec-des-decombres');
  const sahir = rpgJouerCreature(duel, 'joueur', 'sahir-des-braises').entite;
  const adversaire = rpgJouerCreature(duel, 'sorcier', 'fennec-des-decombres').entite;
  sahir.ready = true;

  assert.equal(rpgAttaquerCreature(duel, 'joueur', sahir.id, adversaire.id).ok, true);
  assert.equal(duel.sorcier.creatures.includes(adversaire), false, 'les 2 dégâts du Sahir détruisent le Fennec');
  assert.equal(sahir.pv, sahir.pvMax, 'le Fennec détruit ne peut pas infliger ses dégâts de riposte');
});

// A blocker killed by the Sahir must not consume part of its normal attack.
for (const cote of ['joueur', 'sorcier']) {
  test(`Sahir : partage après les dégâts préalables, côté ${cote}`, () => {
    const duel = duelDeBase();
    const adv = cote === 'joueur' ? 'sorcier' : 'joueur';
    donnerMana(duel, cote, 30);
    donnerMana(duel, adv, 30);
    donner(duel, cote, 'sahir-des-braises');
    donner(duel, adv, 'fennec-des-decombres');
    donner(duel, adv, 'colosse-de-sel');
    const sahir = rpgJouerCreature(duel, cote, 'sahir-des-braises').entite;
    const fennec = rpgJouerCreature(duel, adv, 'fennec-des-decombres').entite;
    const colosse = rpgJouerCreature(duel, adv, 'colosse-de-sel').entite;
    sahir.ready = true;
    const pvSorcier = duel[adv].pv;
    const res = rpgLancerAttaque(duel, cote, [sahir.id], { [sahir.id]: [fennec.id, colosse.id] });
    assert.equal(res.ok, true);
    assert.deepEqual(res.resume.repartitions[sahir.id], { [colosse.id]: 2 });
    assert.equal(colosse.pv, 2, '2 dégâts de capacité puis les 2 blessures, pas seulement la moitié');
    assert.equal(duel[adv].creatures.includes(fennec), false);
    assert.equal(duel[adv].pv, pvSorcier, 'une attaque bloquée ne devient pas une attaque directe');
  });
}

for (const explicite of [false, true]) {
  test(`Sahir : partage ${explicite ? 'explicite' : 'automatique'} entre les seuls survivants`, () => {
    const duel = duelDeBase();
    donnerMana(duel, 'joueur', 30);
    donnerMana(duel, 'sorcier', 30);
    donner(duel, 'joueur', 'sahir-des-braises');
    const sahir = rpgJouerCreature(duel, 'joueur', 'sahir-des-braises').entite;
    const bloqueurs = ['fennec-des-decombres', 'colosse-de-sel', 'colosse-de-sel'].map(id => {
      donner(duel, 'sorcier', id);
      return rpgJouerCreature(duel, 'sorcier', id).entite;
    });
    // Neutraliser les bonus d’arrivée des Colosses pour isoler le partage.
    bloqueurs.forEach(b => { b.pv = b.def = b.carteId === 'fennec-des-decombres' ? 1 : 5; });
    sahir.ready = true;
    const partage = { [bloqueurs[1].id]: explicite ? 2 : 1, [bloqueurs[2].id]: explicite ? 0 : 1 };
    const res = rpgLancerAttaque(duel, 'joueur', [sahir.id], {
      [sahir.id]: bloqueurs.map(b => b.id),
    }, explicite ? { [sahir.id]: partage } : null);
    assert.equal(res.ok, true);
    assert.deepEqual(res.resume.repartitions[sahir.id], partage);
    assert.equal(bloqueurs[1].pv, explicite ? 1 : 2);
    assert.equal(bloqueurs[2].pv, explicite ? 3 : 2, 'la capacité ne se déclenche qu’une fois');
  });
}

test('Sahir : une répartition invalide ne consomme ni capacité ni bouclier', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 30);
  donnerMana(duel, 'sorcier', 30);
  donner(duel, 'joueur', 'sahir-des-braises');
  const sahir = rpgJouerCreature(duel, 'joueur', 'sahir-des-braises').entite;
  const bloqueurs = ['fennec-des-decombres', 'colosse-de-sel', 'colosse-de-sel'].map(id => {
    donner(duel, 'sorcier', id);
    return rpgJouerCreature(duel, 'sorcier', id).entite;
  });
  bloqueurs.forEach(b => { b.pv = b.def = b.carteId === 'fennec-des-decombres' ? 1 : 5; });
  sahir.ready = true;
  bloqueurs[1].bouclier = 1;
  const avant = JSON.stringify(duel);
  const res = rpgLancerAttaque(duel, 'joueur', [sahir.id], {
    [sahir.id]: bloqueurs.map(b => b.id),
  }, { [sahir.id]: { [bloqueurs[1].id]: 1, [bloqueurs[2].id]: 0 } });
  assert.deepEqual(res, { ok: false, raison: 'repartition' });
  assert.equal(JSON.stringify(duel), avant, 'aucun dégât, cimetière, pioche ou journal modifié');
});

test('Sahir : les boucliers préservent les bloqueurs pour le partage', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 30);
  donnerMana(duel, 'sorcier', 30);
  donner(duel, 'joueur', 'sahir-des-braises');
  const sahir = rpgJouerCreature(duel, 'joueur', 'sahir-des-braises').entite;
  const bloqueurs = ['onna-musha-des-cendres', 'colosse-de-sel'].map(id => {
    donner(duel, 'sorcier', id);
    return rpgJouerCreature(duel, 'sorcier', id).entite;
  });
  sahir.ready = true;
  bloqueurs[0].bouclier = 2;
  const pvEsquive = bloqueurs[0].pv;
  // Jet d'esquive manqué (au-dessus du seuil de 25 %) : l'Onna-musha encaisse
  // la blessure normale, que le test veut voir passer.
  rpgReglerHasard(duel, () => 0.9);
  const res = rpgLancerAttaque(duel, 'joueur', [sahir.id], { [sahir.id]: bloqueurs.map(b => b.id) });
  assert.equal(res.ok, true);
  assert.deepEqual(res.resume.repartitions[sahir.id], Object.fromEntries(bloqueurs.map(b => [b.id, 1])));
  assert.equal(bloqueurs[0].bouclier, 0);
  assert.equal(bloqueurs[0].pv, pvEsquive - 1, 'le bouclier absorbe la capacité, la blessure normale passe');
  assert.equal(bloqueurs[1].pv, 3);
});

test('Sahir : les destructions en chaîne précèdent aussi le partage', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 30);
  donnerMana(duel, 'sorcier', 30);
  donner(duel, 'joueur', 'sahir-des-braises');
  const sahir = rpgJouerCreature(duel, 'joueur', 'sahir-des-braises').entite;
  const bloqueurs = ['ghul-des-cendres', 'colosse-de-sel'].map(id => {
    donner(duel, 'sorcier', id);
    return rpgJouerCreature(duel, 'sorcier', id).entite;
  });
  sahir.ready = true;
  sahir.pv = sahir.def = 1;
  const pvSorcier = duel.sorcier.pv;
  const res = rpgLancerAttaque(duel, 'joueur', [sahir.id], { [sahir.id]: bloqueurs.map(b => b.id) });
  assert.equal(res.ok, true);
  assert.equal(duel.joueur.creatures.includes(sahir), false, 'le Ghul détruit emporte le Sahir');
  assert.deepEqual(res.resume.repartitions, {}, 'le Sahir détruit ne distribue aucune blessure');
  assert.equal(bloqueurs[1].pv, 4, 'seuls les 2 dégâts préalables touchent le Colosse');
  assert.equal(duel.sorcier.pv, pvSorcier);
});

test('les créatures du Désert attaquent : Amayas protège des Ténèbres en permanence, la protection temporaire expire', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 5);
  donner(duel, 'joueur', 'amayas-du-hoggar');
  const amayas = rpgJouerCreature(duel, 'joueur', 'amayas-du-hoggar').entite;

  // Amayas : protection imprimée permanente contre les Ténèbres (pas de `tours`).
  assert.deepEqual(amayas.protection, { contre: 'tenebres', toursRestants: Infinity });
  assert.equal(rpgEstProtegee(amayas, 'tenebres'), true);
  assert.equal(rpgEstProtegee(amayas, 'braise'), false, 'la protection ne couvre que la couleur indiquée');
  assert.equal(cardById('tiziri-du-djurdjura').protection.contre, 'braise', 'Tiziri protège contre la Braise, de façon permanente aussi');
  assert.equal(cardById('tislit-des-aures').protection, undefined, 'la protection n’est pas attribuée à toutes les créatures');

  // La protection temporaire (deux décomptes) reste une mécanique du moteur :
  // on la pose à la main sur un Chien du guet, comme le ferait une carte à
  // `tours: 2` — le tour posé et le tour adverse immédiatement suivant.
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  chien.protection = { contre: 'braise', toursRestants: 2 };

  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'sorcier');
  assert.equal(chien.protection.toursRestants, 1, 'la protection reste active pendant le tour adverse juste après');
  duel.sorcier.main.push('trait-de-braise');
  duel.sorcier.mana = { braise: 2, eau: 0, sable: 0, neige: 0 };
  const magieBloquee = rpgLancerMagie(duel, 'sorcier', 'trait-de-braise', chien.id);
  assert.equal(magieBloquee.raison, 'protection', 'la couleur protégée ne peut pas cibler la créature');
  assert.ok(duel.sorcier.main.includes('trait-de-braise'), 'le sort bloqué reste en main');
  assert.equal(chien.pv, 2, 'le sort protégé ne blesse pas');

  const ifrit = {
    id: 'ifrit-test', carteId: 'ifrit-des-ergs', name: 'Ifrit test',
    atk: 5, def: 4, pv: 4, pvMax: 4, bouclier: 0, ready: true, attaquee: false,
  };
  const ghul = {
    id: 'ghul-test', carteId: 'ghul-des-cendres', name: 'Ghul test',
    atk: 2, def: 1, pv: 1, pvMax: 1, bouclier: 0, ready: false, attaquee: false,
  };
  duel.sorcier.creatures.push(ifrit, ghul);
  assert.equal(rpgAttaquerCreature(duel, 'sorcier', ifrit.id, chien.id).ok, true);
  assert.equal(chien.pv, 2, 'les dégâts de combat Braise sont aussi prévenus');
  chien.ready = true;
  assert.deepEqual(rpgChoisirBloqueurs(duel, 'joueur', [chien.id]), {},
    'un bloqueur Braise ne peut pas arrêter un attaquant protégé contre Braise');
  assert.equal(rpgLancerAttaque(duel, 'joueur', [chien.id], { [chien.id]: [ghul.id] }).raison, 'protection',
    'le moteur refuse aussi une affectation de blocage illégale');

  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'joueur');
  assert.equal(chien.protection, null, 'la protection temporaire expire après le tour adverse immédiatement suivant');
  assert.equal(rpgEstProtegee(chien, 'braise'), false);
  assert.equal(rpgEstProtegee(amayas, 'tenebres'), true, 'la permanente d’Amayas, elle, ne décompte jamais');
});

test('la partie démarre table vide et chaque camp pioche 5 cartes', () => {
  const duel = duelDeBase();
  assert.equal(duel.joueur.creatures.length, 0, 'aucune créature en jeu au départ');
  assert.equal(duel.sorcier.creatures.length, 0);
  assert.equal(duel.joueur.terrains.length, 0, 'aucun terrain au départ');
  assert.equal(duel.joueur.main.length, RPG_MAIN_DEPART);
  assert.equal(duel.sorcier.main.length, RPG_MAIN_DEPART);
  assert.equal(duel.joueur.pv, RPG_PV_JOUEUR, `le joueur démarre à ${RPG_PV_JOUEUR} PV`);
  assert.equal(duel.joueur.pvMax, RPG_PV_JOUEUR, 'le plafond de soin suit les PV de départ');
});

test('les 5 cartes piochées viennent bien du deck', () => {
  const duel = duelDeBase();
  assert.equal(duel.joueur.deck.length, 12 - RPG_MAIN_DEPART);
  const carte = rpgPiocher(duel, 'joueur');
  assert.ok(carte, 'piocher rend la carte');
  assert.equal(duel.joueur.main.length, 6);
});

test('deck vide : piocher rend null sans casser', () => {
  const duel = rpgNouveauDuel({ joueurDeck: ['chien-du-guet', 'chien-du-guet'], rng: () => 0 });
  assert.equal(duel.joueur.main.length, 2, 'le deck ne donne que ce qu’il a');
  assert.equal(rpgPiocher(duel, 'joueur'), null);
});

test('le sorcier ennemi démarre aux mêmes PV que le joueur, quelle que soit sa puissance', () => {
  assert.equal(RPG_PV_SORCIER_PAR_PUISSANCE, 0, 'la puissance d’un étage ne gonfle plus les PV');
  assert.equal(rpgSorcierPv(0), RPG_PV_SORCIER_BASE);
  assert.equal(rpgSorcierPv(4), RPG_PV_SORCIER_BASE);
  assert.equal(rpgSorcierPv(7), RPG_PV_SORCIER_BASE);
  const duel = duelDeBase({ sorcierPuissance: 6 });
  assert.equal(duel.sorcier.pv, RPG_PV_SORCIER_BASE);
  assert.equal(duel.sorcier.pvMax, RPG_PV_SORCIER_BASE);
});

test('un coût hybride exige une source Braise et une source Sable', () => {
  const djinn = cardById('djinn-de-foudre');
  const sort = cardById('vent-rouge');
  assert.deepEqual(cardColors(djinn), ['sable', 'braise']);
  assert.deepEqual(cardColorCost(djinn), { sable: 1, braise: 1 });
  assert.equal(djinn.cost, 2);
  assert.equal(djinn.atk, 2);
  assert.equal(djinn.def, 1);
  assert.equal(djinn.coupRapide, true);
  assert.deepEqual(cardColorCost(sort), { braise: 1, sable: 1 });
  assert.equal(rpgEstProtegee({ protection: { contre: 'sable', toursRestants: 1 } }, cardColors(djinn)), true,
    'un attaquant bicolore est arrêté par une protection contre le Sable');
  assert.equal(rpgEstProtegee({ protection: { contre: 'eau', toursRestants: 1 } }, cardColors(djinn)), false,
    'une protection contre une troisième couleur ne s’applique pas');

  const camp = duelDeBase().joueur;
  camp.mana = { braise: 2, eau: 0, sable: 0, neige: 0 };
  assert.equal(rpgPeutPayer(camp, djinn), false, 'deux Braises ne remplacent pas le pip Sable');
  camp.mana = { braise: 0, eau: 0, sable: 2, neige: 0 };
  assert.equal(rpgPeutPayer(camp, djinn), false, 'deux Sables ne remplacent pas le pip Braise');
  camp.mana = { braise: 1, eau: 0, sable: 1, neige: 0 };
  assert.equal(rpgPeutPayer(camp, djinn), true, 'une source de chaque couleur suffit pour le Djinn de foudre');
});

test('poser une créature sans mana échoue, avec mana elle entre en jeu', () => {
  const duel = duelDeBase();
  donner(duel, 'joueur', 'chien-du-guet'); // 2, sable
  assert.equal(rpgJouerCreature(duel, 'joueur', 'chien-du-guet').ok, false, 'sans mana, non');
  donnerMana(duel, 'joueur', 2);
  const pose = rpgJouerCreature(duel, 'joueur', 'chien-du-guet');
  assert.equal(pose.ok, true);
  assert.equal(duel.joueur.creatures.length, 1);
  assert.equal(duel.joueur.creatures[0].atk, 2);
  assert.equal(duel.joueur.creatures[0].pv, 2);
});

test('les blessures restent repérables après un bonus de défense', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  assert.equal(chien.pvMax, 2, 'la créature conserve son maximum de PV de base');

  donner(duel, 'joueur', 'rempart-de-dunes');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'rempart-de-dunes').ok, true);
  assert.equal(chien.pvMax, 5, 'un bonus de défense augmente aussi le maximum de PV');
  rpgBlesserCreature(duel, 'joueur', chien.id, 1);
  assert.equal(chien.pv, 4);
  assert.ok(chien.pv < chien.pvMax, 'la créature blessée reste distinguable après le bonus');
});

test('Rempart de dunes : +0/+3 à toutes les créatures, jusqu’à la fin du tour seulement', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'chien-du-guet');
  donner(duel, 'joueur', 'fennec-des-decombres');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  const fennec = rpgJouerCreature(duel, 'joueur', 'fennec-des-decombres').entite;

  donner(duel, 'joueur', 'rempart-de-dunes');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'rempart-de-dunes').ok, true);
  assert.equal(chien.def, 5, 'le Chien 2/2 tient à 5 derrière son mur de sable');
  assert.equal(chien.atk, 2, 'le rempart ne rend pas plus fort : il rend plus difficile à tuer');
  assert.equal(fennec.def, 4, 'toute la ligne est renforcée, pas seulement la cible');
  assert.equal(fennec.atk, 3, 'l’attaque du Fennec reste la sienne');

  // Le rempart court sur tout le tour qui l’a vu jouer : l’attaque ne le solde
  // pas avant la fin du tour.
  chien.ready = true;
  const pvSorcierAvant = duel.sorcier.pv;
  rpgLancerAttaque(duel, 'joueur', [chien.id]);
  assert.equal(duel.sorcier.pv, pvSorcierAvant - 2, 'le Chien frappe derrière son mur de sable');
  assert.equal(chien.def, 5, 'déclarer l’attaque ne fait pas tomber le bonus');

  // Le sable retombe avec le tour : la table retrouve ses défenses d’avant.
  rpgFinDeTour(duel);
  assert.equal(chien.def, 2, 'le bonus ne survit pas à la fin du tour où il a été joué');
  assert.equal(chien.pvMax, 2, 'le maximum de PV rendu disparaît avec le bonus');
  assert.equal(chien.atk, 2, 'le Chien n’avait rien gagné en attaque, il ne perd rien');
  assert.equal(fennec.def, 1, 'le Fennec retrouve sa défense de base');
  assert.deepEqual(duel.joueur.bonusTemporaires, [], 'le carnet des renforts est vide après la fin du tour');

  // Le tour du sorcier ne renforce personne : la ligne du joueur n’a rien à récupérer.
  rpgFinDeTour(duel);
  assert.equal(chien.pv, 2, 'un tour adverse ne fait pas tomber deux fois le même bonus');
});

test('Tempête de sable : 3 dégâts à toutes les créatures adverses', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donnerMana(duel, 'sorcier', 10);
  donner(duel, 'sorcier', 'sonneur-fele');
  const sonneur = rpgJouerCreature(duel, 'sorcier', 'sonneur-fele').entite;
  assert.equal(sonneur.pv, 3, 'le Sonneur tient sur trois défenses');

  donner(duel, 'joueur', 'tempete-de-sable');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'tempete-de-sable').ok, true);
  assert.equal(sonneur.pv, 0, 'un dégât de plus que la tempête d’avant : le Sonneur ne tient plus');
  assert.equal(duel.sorcier.creatures.includes(sonneur), false, 'la tempête vide la table adverse');
  assert.ok(duel.sorcier.cimetiere.includes('sonneur-fele'), 'la victime est bien enterrée');
});

test('Nuage de cendres : 2 dégâts sur le coup, 2 autres au début de votre tour suivant', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donnerMana(duel, 'sorcier', 10);
  donner(duel, 'sorcier', 'sonneur-fele');
  donner(duel, 'sorcier', 'chien-du-guet');
  const sonneur = rpgJouerCreature(duel, 'sorcier', 'sonneur-fele').entite;
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;

  donner(duel, 'joueur', 'nuage-de-cendres');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'nuage-de-cendres').ok, true);
  assert.equal(chien.pv, 0, 'la première vague emporte le Chien 2/2');
  assert.equal(sonneur.pv, 1, 'le Sonneur 2/3 traverse la première vague avec un point de vie');
  assert.equal(duel.sorcier.degatsEchos.length, 1, 'la seconde vague est promise');
  assert.equal(duel.sorcier.degatsEchos[0].coteSource, 'joueur', 'et elle est datée de son lanceur');

  // Le tour du joueur se ferme : le sorcier commence, la promesse attend son
  // heure — il a tout son tour pour jouer avant que le nuage ne retombe.
  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'sorcier');
  assert.equal(sonneur.pv, 1, 'l’écho ne tombe pas avant que le sorcier ait joué son tour');
  assert.equal(duel.sorcier.degatsEchos.length, 1, 'la promesse est toujours en suspens');

  // Le sorcier pose une créature pendant son tour, puis rend la main : c’est
  // maintenant que le nuage retombe, sur la table telle qu’elle est alors.
  donnerMana(duel, 'sorcier', 10);
  donner(duel, 'sorcier', 'chien-du-guet');
  const renfort = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'joueur');
  assert.ok(sonneur.pv <= 0, 'le nuage retombe au début de votre tour suivant');
  assert.equal(duel.sorcier.creatures.includes(sonneur), false, 'et il l’emporte avec lui');
  assert.ok(renfort.pv <= 0, 'la créature posée entre-temps est brûlée elle aussi');
  assert.equal(duel.sorcier.creatures.length, 0, 'la seconde vague a vidé la table adverse');
  assert.deepEqual(duel.sorcier.degatsEchos, [], 'l’écho est consommé, il ne repasse pas deux fois');

  rpgFinDeTour(duel);
  assert.equal(duel.joueur.creatures.length, 0, 'la table du joueur n’a jamais été touchée');
});

test('un écho lancé sur une table vidée par la première vague brûle ce qui arrive ensuite', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donnerMana(duel, 'sorcier', 10);
  donner(duel, 'sorcier', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;

  donner(duel, 'joueur', 'nuage-de-cendres');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'nuage-de-cendres').ok, true);
  assert.equal(chien.pv, 0, 'la première vague emporte le Chien 2/2');
  assert.equal(duel.sorcier.creatures.length, 0, 'et laisse la table vide');
  assert.equal(duel.sorcier.degatsEchos.length, 1,
    'le nuage reste suspendu : c’est le tour adverse qui fera ce qu’il y a à brûler');

  // Le sorcier joue son tour et repose une créature : la seconde vague la trouve.
  rpgFinDeTour(duel);
  donnerMana(duel, 'sorcier', 10);
  donner(duel, 'sorcier', 'sonneur-fele');
  const sonneur = rpgJouerCreature(duel, 'sorcier', 'sonneur-fele').entite;
  assert.equal(sonneur.pv, 3, 'le Sonneur arrive entier');
  rpgFinDeTour(duel);
  assert.equal(sonneur.pv, 1, 'la seconde vague brûle la créature posée entre-temps');
  assert.deepEqual(duel.sorcier.degatsEchos, [], 'la promesse est soldée');
  assert.equal(duel.joueur.pv, duel.joueur.pvMax, 'le joueur n’est pas touché');
});

test('un écho qui ne trouve personne à son heure se dissipe, et le journal le dit', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'nuage-de-cendres');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'nuage-de-cendres').ok, true,
    'le sort se lance même sans créature en face');
  assert.equal(duel.sorcier.degatsEchos.length, 1, 'le nuage passe sur une table vide et reste suspendu');
  rpgFinDeTour(duel);
  assert.equal(duel.sorcier.degatsEchos.length, 1, 'le tour du sorcier ne le fait pas tomber');
  assert.equal(duel.joueur.pv, duel.joueur.pvMax, 'et ne touche personne au passage');
  rpgFinDeTour(duel);
  assert.match(duel.log.join('\\n'), /L’écho de Nuage de cendres se dissipe/u,
    'au début du tour du lanceur, un nuage sans victime se dissipe et le journal l’annonce');
  assert.deepEqual(duel.sorcier.degatsEchos, [], 'la promesse est soldée, elle ne traîne pas');
  assert.equal(duel.sorcier.pv, duel.sorcier.pvMax, 'et ne touche pas non plus le sorcier adverse');
});

test('un écho de l’IA retombe après le tour du joueur, sur la table telle qu’elle est alors', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donnerMana(duel, 'sorcier', 10);
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;

  // Le sorcier attaque la table du joueur à son tour : première vague.
  rpgFinDeTour(duel);
  donnerMana(duel, 'sorcier', 10);
  donner(duel, 'sorcier', 'nuage-de-cendres');
  assert.equal(rpgLancerMagie(duel, 'sorcier', 'nuage-de-cendres').ok, true);
  assert.equal(chien.pv, 0, 'la première vague emporte le Chien 2/2 du joueur');
  assert.equal(duel.joueur.degatsEchos.length, 1, 'la promesse est inscrite chez le joueur');

  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'joueur', 'le joueur reprend la main');
  assert.equal(duel.joueur.degatsEchos.length, 1,
    'la promesse du sorcier attend le tour de son lanceur, pas celui du joueur');
  assert.equal(duel.joueur.degatsEchos[0].coteSource, 'sorcier', 'elle sait d’où elle vient');

  // Le vrai cas de l’IA : le joueur défend sa table, puis le sorcier reprend la
  // main — c’est là que la seconde vague tombe sur ce qui a été posé.
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'chien-du-guet');
  const renfort = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  rpgFinDeTour(duel);
  assert.equal(renfort.pv, 0, 'la seconde vague du sorcier brûle la créature posée entre-temps');
  assert.deepEqual(duel.joueur.degatsEchos, [], 'la promesse est soldée');
});

test('la promesse d’écho garde sa référence tant qu’elle attend : la page distingue la vague venue d’écho', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'nuage-de-cendres');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'nuage-de-cendres').ok, true);
  const promesse = duel.sorcier.degatsEchos[0];

  // Le tour du joueur se ferme : la promesse est reportée, et le moteur la
  // conserve sans la réécrire — même référence dans le registre. C’est ce qui
  // permet à l’interface de distinguer « la vague attend encore » de « la
  // vague vient d’écho » (elle a quitté le registre).
  rpgFinDeTour(duel);
  assert.equal(duel.sorcier.degatsEchos[0], promesse,
    'la promesse reportée n’est pas réécrite : même référence au registre');

  // L'ouverture du tour suivant du lanceur : la vague retombe, la promesse
  // disparaît du registre — c'est elle que la page réaffiche en preview.
  rpgFinDeTour(duel);
  assert.deepEqual(duel.sorcier.degatsEchos, [], 'la vague venue d’écho ne laisse aucune promesse au registre');
});

test('les retouches du catalogue : Rapport du greffier à 3 manas, Déflection renommée', () => {
  assert.equal(cardById('rapport-du-greffier').cost, 3, 'le Rapport se paie trois manas');
  assert.deepEqual(cardById('rapport-du-greffier').effet, { type: 'pioche', amount: 2 },
    'son effet reste la pioche de deux cartes');
  assert.equal(cardById('maree-contraire').name, 'Déflection', 'Marée contraire s’appelle Déflection');
  assert.equal(cardById('maree-contraire').effet.type, 'contresort', 'son effet de contre est intact');
  assert.match(cardById('rempart-de-dunes').text, /\+0\/\+3.*fin du tour/u,
    'le Rempart annonce son bonus borné au tour');
  assert.deepEqual(cardById('rempart-de-dunes').effet, { type: 'buff', atk: 0, def: 3, tours: 1 },
    'le moteur porte la durée du bonus');
  assert.equal(cardById('nuage-de-cendres').cost, 5, 'le Nuage de cendres se paie cinq manas');
  assert.equal(cardById('nuage-de-cendres').effet.echo.amount, 2, 'le Nuage promet sa seconde vague');
});

test('le carnet des renforts ne solde que le tour qui les a vus jouer', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;

  // Le cas d’une magie rapide de renfort lancé en réponse pendant le tour adverse :
  // le carnet retient le tour de l’échange, jamais le camp renforcé.
  chien.def += 3;
  chien.pv += 3;
  chien.pvMax += 3;
  duel.joueur.bonusTemporaires.push({ entiteId: chien.id, atk: 0, def: 3, tour: 'sorcier' });

  rpgFinDeTour(duel);
  assert.equal(chien.def, 5, 'un bonus né pendant le tour adverse ne tombe pas avec le nôtre');
  assert.equal(duel.joueur.bonusTemporaires.length, 1, 'il attend le tour qui l’a vu jouer');

  rpgFinDeTour(duel);
  assert.equal(chien.def, 2, 'il retombe avec le tour pendant lequel il a été joué');
  assert.equal(chien.pvMax, 2, 'le maximum de PV suit la même échéance');
  assert.deepEqual(duel.joueur.bonusTemporaires, [], 'le carnet est soldé, et soldé une seule fois');
});

test('un renfort de magie rapide qui s’évapore peut laisser une créature à terre', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  donner(duel, 'joueur', 'rempart-de-dunes');
  rpgLancerMagie(duel, 'joueur', 'rempart-de-dunes');
  rpgBlesserCreature(duel, 'joueur', chien.id, 4);
  assert.equal(chien.pv, 1, 'les 3 défenses du rempart ont encaissé trois des quatre dégâts');

  rpgFinDeTour(duel);
  assert.equal(chien.pv, 0, 'le bonus retiré, la blessure devient mortelle');
  assert.equal(duel.joueur.creatures.includes(chien), false, 'la créature quitte la table avec son rempart');
});

test('capacité à l’arrivée : la Porteuse soigne son sorcier, et la vie passe au-dessus de 25', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  duel.joueur.pv = RPG_PV_JOUEUR - 5;
  donner(duel, 'joueur', 'porteuse-de-cruches');
  rpgJouerCreature(duel, 'joueur', 'porteuse-de-cruches');
  assert.equal(duel.joueur.pv, RPG_PV_JOUEUR - 2);
  duel.joueur.pv = RPG_PV_JOUEUR - 1;
  donner(duel, 'joueur', 'porteuse-de-cruches');
  rpgJouerCreature(duel, 'joueur', 'porteuse-de-cruches');
  assert.equal(duel.joueur.pv, RPG_PV_JOUEUR + 2, 'le soin ne s’arrête plus à 25 PV');
  assert.equal(duel.joueur.pvMax, RPG_PV_JOUEUR + 2, 'le maximum suit la vie gagnée');
});

test('la vie peut dépasser 25 : la réserve s’élargit et ne fond pas avec les dégâts', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  // Un soin à pleine vie : la vie monte, le maximum avec elle.
  donner(duel, 'joueur', 'porteuse-de-cruches');
  rpgJouerCreature(duel, 'joueur', 'porteuse-de-cruches');
  assert.equal(duel.joueur.pv, RPG_PV_JOUEUR + 3, 'la vie dépasse 25');
  assert.equal(duel.joueur.pvMax, RPG_PV_JOUEUR + 3, 'le maximum suit la vie gagnée');
  // Un coup encaissé ne touche pas au maximum : la réserve reste entière.
  duel.joueur.pv = 10;
  assert.equal(duel.joueur.pvMax, RPG_PV_JOUEUR + 3, 'les dégâts ne fondent pas la réserve');
  assert.equal(duel.joueur.pvMax - duel.joueur.pv, RPG_PV_JOUEUR - 7, 'l’écart reste la santé manquante');
});

test('le cœur pesé donne toute la vie : le Tribut fait passer le camp au-dessus de 25', () => {
  const duel = duelDeBase();
  duel.joueur.creatures.push({
    id: 'tribut-test',
    carteId: 'chacal-du-seuil',
    name: 'Chacal du seuil',
    atk: 1,
    pv: 1,
    pvMax: 1,
    tribut: 2,
    ready: true,
    attaquee: false,
    jeton: false,
    armes: [],
    emplacement: 0,
  });
  const res = rpgAttaquerSorcier(duel, 'joueur', 'tribut-test');
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(duel.joueur.pv, RPG_PV_JOUEUR + 2, 'le Tribut porte la vie au-dessus de 25');
  assert.equal(duel.joueur.pvMax, RPG_PV_JOUEUR + 2, 'le maximum suit le gain');
  assert.equal(duel.sorcier.pv, RPG_PV_SORCIER_BASE - 1 - 2, 'le sorcier perd la frappe et le Tribut');
  assert.equal(duel.sorcier.degatsRecus, 3, 'les dégâts réellement encaissés se comptent');
});

test('les dégâts encaissés se comptent : la magie compte pour la quête « le sorcier saigne »', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'eclair-du-marteau');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'eclair-du-marteau', 'sorcier').ok, true);
  assert.equal(duel.sorcier.degatsRecus, 3, 'la magie compte pour la quête');
  assert.equal(duel.sorcier.pv, RPG_PV_SORCIER_BASE - 3);
});

test('la Veilleuse gagne son bouclier dès son arrivée et absorbe les premiers dégâts', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'veilleuse-des-citernes');
  const veilleuse = rpgJouerCreature(duel, 'joueur', 'veilleuse-des-citernes').entite;
  assert.equal(veilleuse.bouclier, 2);
  const degats = rpgBlesserCreature(duel, 'joueur', veilleuse.id, 3);
  assert.equal(degats.absorbes, 2);
  assert.equal(veilleuse.pv, 3);
});

test('capacité à l’arrivée : le Guetteur pose ses compteurs d’Heures', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'guetteur-du-beffroi');
  const mainAvant = duel.joueur.main.length;
  const guetteur = rpgJouerCreature(duel, 'joueur', 'guetteur-du-beffroi').entite;
  assert.equal(duel.joueur.main.length, mainAvant - 1, 'aucune pioche à l’arrivée : seul le compte à rebours commence');
  assert.equal(guetteur.heures && guetteur.heures.restants, 2, '2 compteurs d’Heures posés sur le Guetteur');
});
test('capacité à l’arrivée : la Vipère inocule son venin à une créature adverse', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'sorcier', 10);
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'sorcier', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  donner(duel, 'joueur', 'vipere-de-verre');
  rpgJouerCreature(duel, 'joueur', 'vipere-de-verre', chien.id);
  assert.equal(duel.sorcier.creatures.length, 1, 'le venin ronge, il ne tue pas');
  assert.equal(chien.atk, 0, 'le Chien 2/2 perd ses 2 attaques');
  assert.ok(chien.empecheAttaqueToursRestants > 0, 'et ne peut plus attaquer avant la fin de son prochain tour');
});
test('capacité à l’arrivée : le Colosse buffe vos autres créatures', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donner(duel, 'joueur', 'chien-du-guet');
  donner(duel, 'joueur', 'colosse-de-sel');
  rpgJouerCreature(duel, 'joueur', 'chien-du-guet');
  rpgJouerCreature(duel, 'joueur', 'colosse-de-sel');
  const chien = duel.joueur.creatures.find((e) => e.carteId === 'chien-du-guet');
  const colosse = duel.joueur.creatures.find((e) => e.carteId === 'colosse-de-sel');
  assert.equal(chien.atk, 3);
  assert.equal(chien.pv, 3);
  assert.equal(colosse.atk, 6, 'lui-même n’est pas buffé');
});

test('Esquive : 25 % des attaques sont annulées entièrement — jamais une magie', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'onna-musha-des-cendres');
  const esquiveuse = rpgJouerCreature(duel, 'joueur', 'onna-musha-des-cendres').entite;
  donner(duel, 'sorcier', 'ashigaru-des-braises'); // 1/1 : un point d’attaque
  const porteuse = rpgJouerCreature(duel, 'sorcier', 'ashigaru-des-braises').entite;
  porteuse.ready = true;
  assert.equal(esquiveuse.esquive, true, 'l’Onna-musha imprime Esquive, sans chiffre');

  // Jet forcé sous le seuil : l’attaque ne porte pas du tout.
  rpgReglerHasard(duel, () => 0.1);
  const combat = rpgLancerAttaque(duel, 'sorcier', [porteuse.id], { [porteuse.id]: [esquiveuse.id] });
  assert.equal(combat.ok, true);
  assert.equal(esquiveuse.pv, 3, 'l’attaque esquivée est annulée en entier'); 
  assert.ok(duel.log.some((ligne) => /esquive l’attaque/.test(ligne)), 'le journal nomme l’esquive');
  assert.ok(duel.joueur.creatures.includes(esquiveuse), 'l’Onna-musha survit sans une égratignure');
  assert.ok(!duel.sorcier.creatures.includes(porteuse), 'elle riposte normalement au bloqueur');

  // Les magies ne s’esquivent jamais : les 3 dégâts du Trait de braise passent.
  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'trait-de-braise');
  assert.equal(rpgLancerMagie(duel, 'sorcier', 'trait-de-braise', esquiveuse.id).ok, true);
  assert.equal(esquiveuse.pv, 0, 'une magie n’est pas une attaque : elle frappe toujours');
});

test('Esquive : le jet se tente pour chaque attaquant d’un combat', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'onna-musha-des-cendres');
  const esquiveuse = rpgJouerCreature(duel, 'joueur', 'onna-musha-des-cendres').entite;
  esquiveuse.ready = true;
  donner(duel, 'sorcier', 'ashigaru-des-braises');
  donner(duel, 'sorcier', 'ashigaru-des-braises');
  const premierePorteuse = rpgJouerCreature(duel, 'sorcier', 'ashigaru-des-braises').entite;
  const secondePorteuse = rpgJouerCreature(duel, 'sorcier', 'ashigaru-des-braises').entite;

  // Premier coup esquivé, second coup encaissé : deux jets indépendants.
  const jets = [0.1, 0.9];
  rpgReglerHasard(duel, () => (jets.length ? jets.shift() : 0.9));
  const combat = rpgLancerAttaque(duel, 'joueur', [esquiveuse.id], {
    [esquiveuse.id]: [premierePorteuse.id, secondePorteuse.id],
  });
  assert.equal(combat.ok, true);
  assert.equal(esquiveuse.pv, 2,
    'un coup sur deux est esquivé : l’Ashigaru non esquivé passe son point');
  assert.equal(duel.log.filter((ligne) => /esquive l’attaque/.test(ligne)).length, 1,
    'un seul des deux coups est annulé');
  assert.ok(duel.joueur.creatures.includes(esquiveuse), 'l’Onna-musha tient la table');
});

test('Rebond : à son arrivée, le Sonneur fêlé renvoie la créature ciblée dans la main de son propriétaire', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 30);
  donnerMana(duel, 'sorcier', 30);
  donner(duel, 'joueur', 'sonneur-fele');
  donner(duel, 'sorcier', 'dune-marchante');
  const dune = rpgJouerCreature(duel, 'sorcier', 'dune-marchante').entite;
  const pose = rpgJouerCreature(duel, 'joueur', 'sonneur-fele', dune.id);
  assert.equal(pose.ok, true);
  assert.equal(duel.joueur.creatures.length, 1, 'le Sonneur fêlé arrive en jeu');
  assert.equal(duel.sorcier.creatures.length, 0, 'la Dune marchante quitte la table');
  assert.ok(duel.sorcier.main.includes('dune-marchante'), 'elle est renvoyée dans la main du sorcier');
  assert.equal(duel.sorcier.cimetiere.includes('dune-marchante'), false, 'elle ne va pas au cimetière');
  // Un effet de créature vaut un sort : le journal des renvois doit nommer la
  // créature, sinon la table lui donnerait un adieu de destruction au lieu du
  // tourbillon d'eau (et la main la verrait revenir trop tôt).
  const renvois = rpgRenvoisEnMain(duel);
  assert.equal(renvois.length, 1, 'le rebond du Sonneur est journalisé');
  assert.deepEqual(renvois[0], { entityId: dune.id, carteId: 'dune-marchante', cote: 'sorcier' });
});

test('chaque attaquant peut viser le sorcier : les bloqueurs sont choisis séparément', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donnerMana(duel, 'sorcier', 10);
  donner(duel, 'joueur', 'dune-marchante');
  donner(duel, 'sorcier', 'chien-du-guet');
  const maDune = rpgJouerCreature(duel, 'joueur', 'dune-marchante').entite;
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  assert.equal(rpgAttaquerCreature(duel, 'joueur', maDune.id, chien.id).raison,
    'pas-pret', 'une créature qui arrive observe : pas d’attaque ce tour');
  maDune.ready = true;
  chien.ready = true;

  const direct = rpgLancerAttaque(duel, 'joueur', [maDune.id], {});
  assert.equal(direct.ok, true, 'la présence de bloqueurs ne supprime pas les dégâts directs');
  assert.equal(direct.resume.frappeSorcier, 2);
  assert.equal(duel.sorcier.pv, RPG_PV_SORCIER_BASE - 2);
  assert.equal(duel.sorcier.creatures.length, 1, 'le chien reste en défense tant que le joueur ne l’assigne pas');
  assert.equal(rpgAttaquerSorcier(duel, 'joueur', maDune.id).raison, 'pas-pret', 'une créature ne réattaque pas');
});

test('combat de créatures : dégâts mutuels, la plus fragile casse', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'dune-marchante');
  donner(duel, 'sorcier', 'chien-du-guet');
  rpgJouerCreature(duel, 'joueur', 'dune-marchante');
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  rpgFinDeTour(duel);
  rpgAttaquerCreature(duel, 'sorcier', chien.id, duel.joueur.creatures[0].id);
  assert.equal(duel.sorcier.creatures.length, 0, 'le chien meurt (2 ≥ 2)');
  assert.equal(duel.joueur.creatures[0].pv, 2, 'la dune encaisse 2');
});

test('les héros sont des cartes du paquet, pas de la main de départ', () => {
  const duel = rpgNouveauDuel({
    joueurDeck: ['salem', 'yamina', 'boualem', 'feriel', 'tarek', 'chien-du-guet', 'chien-du-guet'],
    rng: () => 0.5,
  });
  donnerMana(duel, 'joueur', 10);
  if (duel.joueur.main.includes('salem')) {
    const res = rpgJouerCreature(duel, 'joueur', 'salem');
    assert.equal(res.ok, true, 'Salem se pose comme carte');
    assert.equal(duel.joueur.creatures[0].kind, 'hero');
  }
  assert.ok(true);
});

test('Salem reçoit un bouclier de lumière qui absorbe le premier impact ennemi', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'salem');
  const salem = rpgJouerCreature(duel, 'joueur', 'salem').entite;
  assert.equal(salem.bouclierLumiere, true);
  const premier = rpgBlesserCreature(duel, 'joueur', salem.id, 3, ['braise'], null, 'magie');
  assert.equal(premier.bouclierLumiere, true);
  assert.equal(salem.pv, 3);
  assert.equal(salem.bouclierLumiere, false);
  assert.equal(rpgBlesserCreature(duel, 'joueur', salem.id, 1, ['braise'], null, 'magie').recus, 1);
  assert.equal(salem.pv, 2);
});

test('Yamina soigne toutes les créatures alliées de 2 et rend 5 PV au joueur', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  rpgBlesserCreature(duel, 'joueur', chien.id, 1);
  duel.joueur.pv -= 7;
  const pvAvant = duel.joueur.pv;
  donner(duel, 'joueur', 'yamina');
  const yamina = rpgJouerCreature(duel, 'joueur', 'yamina').entite;
  assert.equal(chien.pv, 2);
  assert.equal(yamina.pv, 4);
  assert.equal(duel.joueur.pv, pvAvant + 5, 'son arrivée rend aussi 5 PV au joueur');
  assert.match(cardById('yamina').text, /vous regagnez 5 PV/);
});

test('le Kraken offre une magie gratuite : le sort se lance sans payer son mana', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 5);
  donner(duel, 'joueur', 'kraken');
  const kraken = rpgJouerCreature(duel, 'joueur', 'kraken').entite;
  assert.deepEqual([kraken.atk, kraken.def], [2, 5], 'le Kraken est passé 2/5');
  assert.equal(duel.magieGratuite?.cote, 'joueur', 'la faveur du Kraken est ouverte');

  // Le mana est épuisé par la pose : seule la faveur permet de lancer.
  duel.joueur.mana = { braise: 0, eau: 0, sable: 0, neige: 0 };
  donner(duel, 'joueur', 'rapport-du-greffier');
  const mainAvant = duel.joueur.main.length;
  assert.equal(rpgLancerMagie(duel, 'joueur', 'rapport-du-greffier').ok, true,
    'la sorcellerie se lance sans payer ses 3 manas');
  assert.equal(duel.joueur.main.length, mainAvant - 1 + 2, '-1 carte lancée, +2 piochées');
  assert.equal(duel.magieGratuite, null, 'la faveur se consume sur le sort lancé');

  // La faveur consommée, le mana redevient exigible.
  donner(duel, 'joueur', 'rapport-du-greffier');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'rapport-du-greffier').raison, 'mana',
    'le deuxième sort repasse à la caisse');
});

test('la faveur du Kraken exclut les contresorts et s’éteint à la fin du tour', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 5);
  donner(duel, 'joueur', 'kraken');
  rpgJouerCreature(duel, 'joueur', 'kraken');
  assert.equal(duel.magieGratuite?.cote, 'joueur');
  duel.joueur.mana = { braise: 0, eau: 0, sable: 0, neige: 0 };

  // Un contresort ne vit qu'en réponse : il n'entre pas dans la faveur.
  donner(duel, 'joueur', 'ecueil');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'ecueil').ok, false,
    'l’Écueil ne profite pas du lancement gratuit');
  assert.equal(duel.magieGratuite?.cote, 'joueur', 'la faveur reste ouverte');

  rpgFinDeTour(duel);
  assert.equal(duel.magieGratuite, null, 'la faveur non employée s’éteint à la fin du tour');
});

test('le Serpent du monde est intouchable par les sorts, mais pas par le reste', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'serpent-du-monde');
  const serpent = rpgJouerCreature(duel, 'joueur', 'serpent-du-monde').entite;

  // Cibler le Serpent avec une magie est illégal, des deux camps.
  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'trait-de-braise');
  assert.equal(rpgLancerMagie(duel, 'sorcier', 'trait-de-braise', serpent.id).raison, 'protection',
    'le Trait de braise ne peut pas le viser');

  // Une magie de zone l'épargne aussi : les dégâts de sort glissent sur lui.
  donner(duel, 'sorcier', 'tempete-de-sable');
  assert.equal(rpgLancerMagie(duel, 'sorcier', 'tempete-de-sable').ok, true);
  assert.equal(serpent.pv, 6, 'la Tempête de sable ne l’écorche pas');

  // Les blessures hors sort (capacités, armes, combat) passent normalement.
  assert.equal(rpgBlesserCreature(duel, 'joueur', serpent.id, 2, ['braise'], null, 'capacite').recus, 2);
  assert.equal(serpent.pv, 4, 'une capacité le blesse comme n’importe qui');
});

test('Overkill : l’excédent au-delà des bloqueurs perce jusqu’au sorcier', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'serpent-du-monde');
  const serpent = rpgJouerCreature(duel, 'joueur', 'serpent-du-monde').entite;
  serpent.ready = true;
  donner(duel, 'sorcier', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;

  const pvSorcier = duel.sorcier.pv;
  const res = rpgLancerAttaque(duel, 'joueur', [serpent.id], { [serpent.id]: [chien.id] });
  assert.equal(res.ok, true);
  assert.equal(duel.sorcier.creatures.includes(chien), false, 'le bloqueur 2/2 tombe');
  assert.equal(duel.sorcier.pv, pvSorcier - 4,
    '6 de force, 2 encaissés par le Chien : 4 percent jusqu’au sorcier');
  assert.ok(duel.log.some((ligne) => ligne.includes('Overkill')), 'le journal nomme la percée');
});

test('le Hurlement du blizzard : 2 dégâts, et chaque survivante tire son gel à pile ou face', () => {
  // Un hasard qui dit toujours « oui » : toutes les survivantes gèlent.
  const duelGel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.1 });
  donnerMana(duelGel, 'joueur', 20);
  donnerMana(duelGel, 'sorcier', 20);
  donner(duelGel, 'sorcier', 'dune-marchante');
  const dune = rpgJouerCreature(duelGel, 'sorcier', 'dune-marchante').entite; // 2/4
  donner(duelGel, 'sorcier', 'chien-du-guet');
  const chien = rpgJouerCreature(duelGel, 'sorcier', 'chien-du-guet').entite; // 2/2
  donner(duelGel, 'joueur', 'hurlement-du-blizzard');
  assert.equal(rpgLancerMagie(duelGel, 'joueur', 'hurlement-du-blizzard').ok, true);
  assert.equal(duelGel.sorcier.creatures.includes(chien), false, 'le Chien 2/2 meurt des 2 dégâts');
  assert.equal(dune.pv, 2, 'la Dune encaisse les 2 dégâts');
  assert.equal(dune.gelToursRestants > 0, true, 'la survivante est gelée : le jet a réussi');

  // Un hasard qui dit toujours « non » : le givre ne prend pas.
  const duelSec = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.9 });
  donnerMana(duelSec, 'joueur', 20);
  donnerMana(duelSec, 'sorcier', 20);
  donner(duelSec, 'sorcier', 'dune-marchante');
  const duneSeche = rpgJouerCreature(duelSec, 'sorcier', 'dune-marchante').entite;
  donner(duelSec, 'joueur', 'hurlement-du-blizzard');
  assert.equal(rpgLancerMagie(duelSec, 'joueur', 'hurlement-du-blizzard').ok, true);
  assert.equal(duneSeche.pv, 2);
  assert.equal(Boolean(duneSeche.gelToursRestants), false, 'le jet a échoué : pas de gel');
  assert.ok(duelSec.log.some((ligne) => ligne.includes('secoue le givre')),
    'le journal raconte le jet manqué');
});

test('la Brume du fjord est une sorcellerie : 1 dégât à toutes, gel à 25 %', () => {
  const carte = cardById('brume-du-fjord');
  assert.equal(carte.instant, undefined, 'plus une magie rapide');
  assert.match(carte.typeLine, /^Sorcellerie/);
  assert.deepEqual(carte.effet, { type: 'degats', amount: 1, cible: 'toutes-creatures', gelChance: 0.25 });
  assert.match(carte.text, /25 % de chances d’être gelée/);

  const lancerAvecHasard = (hasard) => {
    const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => hasard });
    donnerMana(duel, 'joueur', 20);
    donnerMana(duel, 'sorcier', 20);
    donner(duel, 'sorcier', 'dune-marchante');
    const dune = rpgJouerCreature(duel, 'sorcier', 'dune-marchante').entite; // 2/4
    donner(duel, 'joueur', 'brume-du-fjord');
    assert.equal(rpgLancerMagie(duel, 'joueur', 'brume-du-fjord').ok, true);
    assert.equal(dune.pv, 3, 'la brume mord de 1');
    return { duel, dune };
  };

  const gele = lancerAvecHasard(0.24);
  assert.equal(gele.dune.gelToursRestants > 0, true,
    'un jet strictement sous 0,25 gèle la survivante');
  const sec = lancerAvecHasard(0.25);
  assert.equal(Boolean(sec.dune.gelToursRestants), false,
    'à 0,25 exactement, le gel ne prend pas');
  assert.ok(sec.duel.log.some((ligne) => ligne.includes('secoue le givre')),
    'le journal raconte le jet manqué');
});

test('le Rempart de dunes se joue désormais en réponse, comme toute magie rapide', () => {
  const carte = cardById('rempart-de-dunes');
  assert.equal(carte.instant, true);
  assert.match(carte.typeLine, /^Magie Rapide/);

  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  donner(duel, 'joueur', 'rempart-de-dunes');
  // Hors de son tour, dans une fenêtre de réponse : la magie rapide passe.
  duel.tour = 'sorcier';
  duel.fenetreReponse = true;
  assert.equal(rpgLancerMagie(duel, 'joueur', 'rempart-de-dunes').ok, true,
    'le Rempart répond pendant le tour adverse');
  assert.equal(chien.def, 5, '+0/+3 jusqu’à la fin du tour');
});

test('le Mur de boucliers donne +2/+0 et Overkill jusqu’à la fin du tour', () => {
  const carte = cardById('mur-de-boucliers');
  assert.equal(carte.cost, 5, 'le Mur de boucliers coûte 5');
  assert.deepEqual(carte.effet, { type: 'buff', atk: 2, def: 0, overkill: true, tours: 1 });
  assert.equal(carte.text, 'Vos créatures gagnent +2/+0 et Overkill jusqu’à la fin du tour.');

  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 30);
  donnerMana(duel, 'sorcier', 30);
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite; // 2/2 sans Overkill
  donner(duel, 'joueur', 'serpent-du-monde');
  const serpent = rpgJouerCreature(duel, 'joueur', 'serpent-du-monde').entite; // Overkill imprimé
  donner(duel, 'sorcier', 'chien-du-guet');
  const bloqueur = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  Object.assign(bloqueur, { atk: 0, pv: 2, def: 2, pvMax: 2 });

  donner(duel, 'joueur', 'mur-de-boucliers');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'mur-de-boucliers').ok, true);
  assert.deepEqual(
    [chien.atk, chien.def, chien.pv, chien.pvMax, chien.overkill, chien.overkillTemporaire],
    [4, 2, 2, 2, true, 1],
    'le 2/2 devient 4/2 et reçoit un Overkill prêté',
  );
  assert.deepEqual(
    [serpent.atk, serpent.def, serpent.overkill, serpent.overkillTemporaire],
    [8, 6, true, 1],
    'le Serpent reçoit aussi +2/+0, sans confondre prêt et mot-clé imprimé',
  );

  // Le Chien prête sa force excédentaire au sorcier : 4 d’attaque contre un
  // bloqueur qui n’encaisse que 2, donc 2 percent.
  chien.ready = true;
  const pvSorcier = duel.sorcier.pv;
  const attaque = rpgLancerAttaque(duel, 'joueur', [chien.id], { [chien.id]: [bloqueur.id] });
  assert.equal(attaque.ok, true);
  assert.equal(attaque.resume.frappeSorcier, 2, 'l’excédent d’Overkill atteint le sorcier');
  assert.equal(duel.sorcier.pv, pvSorcier - 2);
  assert.equal(duel.sorcier.creatures.includes(bloqueur), false, 'le bloqueur tombe');
  assert.equal(duel.joueur.creatures.includes(chien), true, 'le bloqueur à 0 ATQ laisse le Chien vivant');
  assert.ok(duel.log.some((ligne) => ligne.startsWith('Overkill : Chien du guet perce les bloqueurs')));

  rpgFinDeTour(duel);
  assert.deepEqual(
    [chien.atk, chien.def, chien.pv, chien.overkill, chien.overkillTemporaire],
    [2, 2, 2, false, 0],
    'à la fin du tour, +2/+0 et l’Overkill prêté repartent ensemble',
  );
  assert.deepEqual(
    [serpent.atk, serpent.def, serpent.overkill, serpent.overkillTemporaire],
    [6, 6, true, 0],
    'mais l’Overkill imprimé du Serpent demeure',
  );
});

test('la Brisure de verre fauche les créatures dont la défense tombe sous 1', () => {
  assert.match(cardById('brisure-de-verre').text, /Si leur défense tombe en dessous de 1, elles sont détruites/);
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'sorcier', 'ashigaru-des-braises');
  const fragile = rpgJouerCreature(duel, 'sorcier', 'ashigaru-des-braises').entite; // 1/1
  donner(duel, 'sorcier', 'chien-du-guet');
  const solide = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite; // 2/2
  donner(duel, 'joueur', 'brisure-de-verre');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'brisure-de-verre').ok, true);
  assert.equal(duel.sorcier.creatures.includes(fragile), false, 'le 1/1 se brise');
  assert.deepEqual([solide.atk, solide.pv], [1, 1], 'le 2/2 survit, amputé en 1/1');
});

test('la Lame de mer détruit la créature dont la défense tombe sous 1', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'sorcier', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  donner(duel, 'joueur', 'lame-de-mer');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'lame-de-mer', chien.id).ok, true);
  assert.equal(duel.sorcier.creatures.includes(chien), false,
    'le -2/-2 jette sa défense à 0 : le Chien 2/2 est détruit');
  assert.match(cardById('lame-de-mer').text, /Si sa défense tombe en dessous de 1, elle est détruite/);
});

test('Tarek donne +1/+1 aux créatures Sable tant qu’il est en jeu', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 30);
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  donner(duel, 'joueur', 'porteuse-de-cruches');
  const eau = rpgJouerCreature(duel, 'joueur', 'porteuse-de-cruches').entite;
  donner(duel, 'joueur', 'tarek');
  const tarek = rpgJouerCreature(duel, 'joueur', 'tarek').entite;
  assert.deepEqual({ atk: chien.atk, pv: chien.pv, def: chien.def }, { atk: 3, pv: 3, def: 3 });
  assert.deepEqual({ atk: eau.atk, pv: eau.pv, def: eau.def }, { atk: 0, pv: 3, def: 3 });
  assert.deepEqual({ atk: tarek.atk, pv: tarek.pv, def: tarek.def }, { atk: 5, pv: 6, def: 6 });
});

test('Tarek crée deux chiens de sable 1/1 sans coût à son arrivée', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 30);
  donner(duel, 'joueur', 'tarek');
  const tarek = rpgJouerCreature(duel, 'joueur', 'tarek');
  assert.equal(tarek.ok, true);
  const jetons = duel.joueur.creatures.filter((entite) => entite.carteId === 'chien-de-sable');
  assert.equal(jetons.length, 2, 'Tarek arrive avec ses deux chiens de sable');
  assert.ok(jetons.every((entite) => entite.jeton), 'les deux chiens sont des créatures-jetons');
  // La fiche imprimée est 1/1 ; sur la table, l’aura Sable de Tarek les porte à
  // 2/2 dès qu’ils arrivent, exactement comme les autres créatures Sable.
  const chienDeSable = cardById('chien-de-sable');
  assert.deepEqual({ cost: chienDeSable.cost, atk: chienDeSable.atk, def: chienDeSable.def, jeton: chienDeSable.jeton }, {
    cost: 0, atk: 1, def: 1, jeton: true,
  });
  assert.ok(jetons.every((entite) => entite.atk === 2 && entite.pv === 2 && entite.def === 2),
    'les chiens arrivent à 2/2 sous l’aura de Tarek');
  assert.equal(duel.joueur.main.includes('chien-de-sable'), false, 'aucun chien de sable n’entre en main');

  // Rapidité : de vraies créatures, qui peuvent frapper dès leur arrivée.
  assert.ok(jetons.every((entite) => entite.rapidite && entite.ready),
    'les chiens de sable ont Rapidité et sont prêts dès leur arrivée');
  const attaque = rpgLancerAttaque(duel, 'joueur', jetons.map((entite) => entite.id));
  assert.equal(attaque.ok, true, 'les chiens de sable attaquent dès leur arrivée');
  assert.equal(attaque.resume.frappeSorcier, 4, 'deux chiens à 2 ATQ frappent le sorcier');
});

test('un chien de sable renvoyé en main cesse d’exister : jamais de carte gratuite', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'sorcier', 30);
  donner(duel, 'sorcier', 'tarek');
  rpgJouerCreature(duel, 'sorcier', 'tarek');
  const jeton = duel.sorcier.creatures.find((entite) => entite.carteId === 'chien-de-sable');
  assert.ok(jeton, 'le sorcier a lui aussi ses chiens de sable');
  const mainAvant = duel.sorcier.main.length;

  donnerMana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'ressac');
  const renvoi = rpgLancerMagie(duel, 'joueur', 'ressac', jeton.id);
  assert.equal(renvoi.ok, true);
  assert.equal(duel.sorcier.creatures.some((entite) => entite.id === jeton.id), false,
    'le jeton quitte la table');
  assert.equal(duel.sorcier.main.length, mainAvant, 'un jeton ne rejoint jamais la main de son propriétaire');
  assert.equal(duel.sorcier.cimetiere.includes('chien-de-sable'), false, 'il ne va pas non plus au cimetière');

  // Et la créature-jeton n’est pas une carte de collection : elle n’est pas dans
  // le catalogue jouable, donc ni dans les decks ni dans l’atelier de decks.
  assert.equal(cardById('chien-de-sable').jeton, true);
  assert.equal(RPG_DUEL_CARDS.some((carte) => carte.id === 'chien-de-sable'), false,
    'le chien de sable reste hors du catalogue jouable');
  assert.equal(RPG_DECKS.some((deck) => deck.cardIds.includes('chien-de-sable')), false,
    'aucun deck ne contient de créature-jeton');
});

test('la création de jetons n’est pas un effet ciblé : Boualem ne la contre pas', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'sorcier', 30);
  donner(duel, 'sorcier', 'boualem');
  const boualem = rpgJouerCreature(duel, 'sorcier', 'boualem').entite;
  assert.equal(boualem.boualemContresortDisponible, true);

  donnerMana(duel, 'joueur', 30);
  donner(duel, 'joueur', 'tarek');
  // L’interface et l’IA transmettent parfois la première créature adverse comme
  // cible par défaut : elle ne doit pas transformer l’arrivée en effet ciblé.
  const pose = rpgJouerCreature(duel, 'joueur', 'tarek', boualem.id);
  assert.equal(pose.ok, true);
  assert.equal(boualem.boualemContresortDisponible, true, 'le contresort de Boualem reste disponible');
  assert.equal(duel.joueur.creatures.filter((entite) => entite.carteId === 'chien-de-sable').length, 2,
    'les deux chiens de sable entrent quand même en jeu');
});

test('Boualem est une 3/4 et contre une seule fois l’effet adverse qui le cible', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'boualem');
  const boualem = rpgJouerCreature(duel, 'joueur', 'boualem').entite;
  assert.deepEqual([boualem.atk, boualem.pv, boualem.def], [3, 4, 4]);
  assert.equal(boualem.boualemContresortDisponible, true);

  donner(duel, 'sorcier', 'vipere-de-verre');
  const premier = rpgJouerCreature(duel, 'sorcier', 'vipere-de-verre', boualem.id);
  assert.equal(premier.ok, true);
  assert.equal(boualem.pv, 4, 'le premier effet ciblé est contrecarré');
  assert.equal(boualem.boualemContresortDisponible, false);

  donner(duel, 'sorcier', 'vipere-de-verre');
  rpgJouerCreature(duel, 'sorcier', 'vipere-de-verre', boualem.id);
  assert.equal(boualem.atk, 1, 'le deuxième effet ciblé inocule son venin : 3 → 1 attaque');
  assert.equal(boualem.pv, 4, 'le venin ronge la force, pas les points de vie');
});

test('phase d’attaque sans bloqueur : tous les attaquants frappent le sorcier', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donner(duel, 'joueur', 'chien-du-guet');
  donner(duel, 'joueur', 'dune-marchante');
  rpgJouerCreature(duel, 'joueur', 'chien-du-guet');
  rpgJouerCreature(duel, 'joueur', 'dune-marchante');
  rpgFinDeTour(duel);
  rpgFinDeTour(duel);
  const ids = duel.joueur.creatures.map((e) => e.id);
  const res = rpgLancerAttaque(duel, 'joueur', ids);
  assert.equal(res.ok, true);
  assert.equal(res.resume.frappeSorcier, 2 + 2, 'chien 2 + dune 2');
  assert.equal(duel.sorcier.pv, RPG_PV_SORCIER_BASE - 4);
  assert.ok(duel.joueur.creatures.every((e) => e.attaquee), 'tout le monde a frappé');
  assert.equal(rpgLancerAttaque(duel, 'joueur', ids).raison, 'attaque-jouee',
    'une seule phase d’attaque par tour');
  // Deux fins de tour ramènent la main au joueur : sa prochaine phase d’attaque
  // est ouverte, et les créatures sont dégagées.
  rpgFinDeTour(duel);
  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'joueur');
  assert.equal(rpgLancerAttaque(duel, 'joueur', ids).ok, true, 'le tour suivant rouvre la phase');
});

test('une déclaration refusée ne consomme pas la phase d’attaque du tour', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donner(duel, 'joueur', 'chien-du-guet');
  donner(duel, 'joueur', 'dune-marchante');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  const dune = rpgJouerCreature(duel, 'joueur', 'dune-marchante').entite;
  rpgFinDeTour(duel);
  rpgFinDeTour(duel);
  chien.attaquee = true; // le Chien s’est déjà engagé : sa déclaration est refusée

  assert.equal(rpgLancerAttaque(duel, 'joueur', [chien.id]).raison, 'pas-pret');
  assert.equal(rpgLancerAttaque(duel, 'joueur', [dune.id]).ok, true,
    'la phase reste ouverte après un refus');
});

test('après le choix des bloqueurs, une magie rapide répond avant les dégâts et un attaquant reste bloqué', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donnerMana(duel, 'sorcier', 10);
  donner(duel, 'joueur', 'chien-du-guet');
  const attaquant = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  attaquant.ready = true;
  donner(duel, 'sorcier', 'chien-du-guet');
  const bloqueur = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  donner(duel, 'joueur', 'trait-de-braise');

  const blocages = rpgChoisirBloqueurs(duel, 'joueur', [attaquant.id]);
  assert.deepEqual(blocages[attaquant.id], [bloqueur.id], 'le sorcier assigne son bloqueur avant de rendre la priorité');
  assert.equal(rpgOuvrirFenetreReponse(duel, 'joueur'), true, 'la fenêtre de réponse s’ouvre pendant le tour du joueur');
  const reponse = rpgLancerMagie(duel, 'joueur', 'trait-de-braise', bloqueur.id);
  assert.equal(reponse.ok, true, 'le joueur peut lancer une magie rapide après le choix du bloqueur');
  assert.equal(duel.sorcier.creatures.includes(bloqueur), false, 'la magie rapide retire le bloqueur avant les dégâts');

  const pvSorcier = duel.sorcier.pv;
  const res = rpgLancerAttaque(duel, 'joueur', [attaquant.id], { [attaquant.id]: [] }, {}, [attaquant.id]);
  assert.equal(res.ok, true);
  assert.equal(res.resume.frappeSorcier, 0, 'un attaquant déjà bloqué ne frappe pas directement quand son bloqueur disparaît');
  assert.deepEqual(res.resume.attaquantsBloques, [attaquant.id]);
  assert.equal(duel.sorcier.pv, pvSorcier);
});

test('défense automatique : une créature bloque chaque attaquant, dégâts simultanés', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'chien-du-guet');   // 2/2
  donner(duel, 'joueur', 'vipere-de-verre'); // 3/1
  donner(duel, 'sorcier', 'dune-marchante'); // 2/4
  donner(duel, 'sorcier', 'dune-marchante'); // 2/4
  rpgJouerCreature(duel, 'joueur', 'chien-du-guet');
  const vipere = rpgJouerCreature(duel, 'joueur', 'vipere-de-verre').entite;
  rpgJouerCreature(duel, 'sorcier', 'dune-marchante');
  rpgJouerCreature(duel, 'sorcier', 'dune-marchante');
  rpgFinDeTour(duel);
  rpgFinDeTour(duel);
  const chien = duel.joueur.creatures.find((e) => e.carteId === 'chien-du-guet');
  const res = rpgLancerAttaque(duel, 'joueur', [chien.id, vipere.id]);
  assert.equal(res.ok, true);
  // chien → dune 1 (2 dégâts), vipère → dune 2 (3 dégâts) ; chaque attaquant
  // encaisse la riposte (2) même si sa cible meurt : dégâts simultanés.
  assert.equal(duel.sorcier.creatures.length, 2, 'les dunes 2/4 encaissent sans mourir');
  assert.deepEqual(duel.sorcier.creatures.map((d) => d.pv).sort(), [1, 2]);
  assert.equal(duel.joueur.creatures.length, 0, 'chien 2/2 et vipère 3/1 meurent à la riposte');
});

test('les magies : types, coûts, cibles et magies rapides de combat', () => {
  assert.equal(RPG_MAGIE_CARDS.length, 44);
  for (const carte of RPG_MAGIE_CARDS) {
    assert.ok(RPG_ELEMENTS.includes(carte.element), 'type parmi les cinq couleurs');
    assert.ok(carte.kind === 'magie' && carte.cost >= 0);
    assert.ok(Array.isArray(carte.cibles) && carte.cibles.length >= 1);
  }
  assert.ok(RPG_MAGIE_CARDS.some((c) => c.cibles.includes('sorcier')), 'certaines magies ciblent les joueurs');
  assert.ok(RPG_MAGIE_CARDS.some((c) => c.cibles.includes('creature')), 'certaines magies ciblent les créatures');
  assert.ok(RPG_MAGIE_CARDS.find((c) => c.id === 'trait-de-braise')?.instant);
  assert.ok(RPG_MAGIE_CARDS.find((c) => c.id === 'brisure-de-verre')?.instant);
  // Rafale du minaret, Sentence de la Liste et Fureur du souk ont été retirées
  // du jeu : elles ne figurent plus ni au catalogue ni dans aucun deck.
  for (const idRetire of ['rafale-du-minaret', 'sentence-de-la-liste', 'fureur-du-souk']) {
    assert.equal(RPG_MAGIE_CARDS.some((c) => c.id === idRetire), false, `${idRetire} a quitté le jeu`);
    assert.equal(RPG_DECKS.some((deck) => deck.cardIds.includes(idRetire)), false,
      `${idRetire} ne reste dans aucun deck de départ`);
  }
});

test('un bloqueur ne peut arrêter qu’un seul attaquant ; les autres frappent les PV', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'sorcier', 'chien-du-guet');
  const attaquantBloque = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  const attaquantLibre = rpgJouerCreature(duel, 'sorcier', 'dune-marchante').entite;
  donner(duel, 'joueur', 'chien-du-guet');
  const bloqueur = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  attaquantBloque.ready = true;
  attaquantLibre.ready = true;
  bloqueur.ready = true;

  const res = rpgLancerAttaque(duel, 'sorcier', [attaquantBloque.id, attaquantLibre.id], {
    [attaquantBloque.id]: bloqueur.id,
  });
  assert.equal(res.ok, true);
  assert.equal(res.resume.paires.length, 1, 'un seul échange de combat');
  assert.equal(res.resume.frappeSorcier, 2, 'la Dune non bloquée inflige 2');
  assert.equal(duel.joueur.pv, RPG_PV_JOUEUR - 2);
  assert.equal(duel.joueur.creatures.length, 0, 'Chien contre Chien : les deux sont détruits');
  assert.equal(duel.joueur.cimetiere.at(-1), 'chien-du-guet');
  assert.deepEqual(duel.combatFeed.map(({ victim, killers }) => [
    victim.name, killers.map(({ name }) => name),
  ]), [
    ['Chien du guet', ['Chien du guet']],
    ['Chien du guet', ['Chien du guet']],
  ], 'le journal garde les deux éliminations et relie chaque victime à son combattant');
});

test('plusieurs bloqueurs défendent un attaquant et la force est répartie avant les dégâts mutuels', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'sorcier', 30);
  donnerMana(duel, 'joueur', 30);
  donner(duel, 'sorcier', 'colosse-de-sel'); // 6/6
  const colosse = rpgJouerCreature(duel, 'sorcier', 'colosse-de-sel').entite;
  donner(duel, 'joueur', 'porteuse-de-cruches'); // 1/3
  donner(duel, 'joueur', 'fennec-des-decombres'); // 3/1
  const porteuse = rpgJouerCreature(duel, 'joueur', 'porteuse-de-cruches').entite;
  const fennec = rpgJouerCreature(duel, 'joueur', 'fennec-des-decombres').entite;
  colosse.ready = true;

  const res = rpgLancerAttaque(duel, 'sorcier', [colosse.id], {
    [colosse.id]: [porteuse.id, fennec.id],
  }, {
    [colosse.id]: { [porteuse.id]: 3, [fennec.id]: 3 },
  });
  assert.equal(res.ok, true, 'les créatures nouvellement posées peuvent défendre');
  assert.deepEqual(res.resume.blocages[colosse.id], [porteuse.id, fennec.id]);
  assert.deepEqual(res.resume.repartitions[colosse.id], { [porteuse.id]: 3, [fennec.id]: 3 });
  assert.equal(colosse.pv, 3, 'le Colosse ne reçoit rien de la Porteuse 0/3 et 3 du Fennec');
  assert.deepEqual(duel.joueur.creatures, [], 'la répartition détruit la Porteuse et le Fennec');
  assert.ok(duel.joueur.cimetiere.includes('porteuse-de-cruches'));
  assert.ok(duel.joueur.cimetiere.includes('fennec-des-decombres'));
});

test('la répartition des dégâts doit exactement égaler la force de l’attaquant', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'sorcier', 30);
  donnerMana(duel, 'joueur', 30);
  donner(duel, 'sorcier', 'colosse-de-sel');
  const colosse = rpgJouerCreature(duel, 'sorcier', 'colosse-de-sel').entite;
  donner(duel, 'joueur', 'porteuse-de-cruches');
  donner(duel, 'joueur', 'fennec-des-decombres');
  const porteuse = rpgJouerCreature(duel, 'joueur', 'porteuse-de-cruches').entite;
  const fennec = rpgJouerCreature(duel, 'joueur', 'fennec-des-decombres').entite;
  colosse.ready = true;
  const res = rpgLancerAttaque(duel, 'sorcier', [colosse.id], {
    [colosse.id]: [porteuse.id, fennec.id],
  }, {
    [colosse.id]: { [porteuse.id]: 3, [fennec.id]: 1 },
  });
  assert.equal(res.ok, false);
  assert.equal(res.raison, 'repartition');
  assert.equal(colosse.attaquee, false, 'une répartition invalide n’engage pas l’attaquant');
});

test('Parade et Trait de braise sont des magies rapides de réponse; le bouclier absorbe les dégâts', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donnerMana(duel, 'sorcier', 10);
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  donner(duel, 'sorcier', 'chien-du-guet');
  const cible = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  Object.assign(cible, { pv: 5, def: 5, pvMax: 5 });
  donner(duel, 'joueur', 'parade-du-verre');
  donner(duel, 'joueur', 'trait-de-braise');
  donnerMana(duel, 'joueur', 2);

  duel.tour = 'sorcier';
  assert.equal(rpgLancerMagie(duel, 'joueur', 'parade-du-verre', chien.id).raison, 'timing',
    'aucune réponse hors de la fenêtre de combat');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'trait-de-braise', cible.id).raison, 'timing',
    'Trait de braise ne peut pas être lancé hors de la fenêtre de réponse adverse');
  duel.fenetreReponse = true;
  const trait = rpgLancerMagie(duel, 'joueur', 'trait-de-braise', cible.id);
  assert.equal(trait.ok, true, 'la nouvelle Magie Rapide Braise peut être lancée en réponse');
  assert.equal(cible.pv, 2, 'les 3 dégâts du Trait laissent 2 PV à la créature adverse 5/5');
  assert.ok(duel.joueur.cimetiere.includes('trait-de-braise'), 'le Trait résolu va au cimetière');

  donnerMana(duel, 'joueur', 2);
  const parade = rpgLancerMagie(duel, 'joueur', 'parade-du-verre', chien.id);
  assert.equal(parade.ok, true);
  assert.equal(chien.bouclier, 3);
  assert.equal(chien.bouclierEpuise, false);
  assert.ok(duel.joueur.cimetiere.includes('parade-du-verre'), 'la Parade résolue va au cimetière');

  const premierCoup = rpgBlesserCreature(duel, 'joueur', chien.id, 2);
  assert.equal(premierCoup.absorbes, 2);
  assert.equal(chien.pv, 2, 'les premiers dégâts ne traversent pas le bouclier');
  assert.equal(chien.bouclierEpuise, false, 'il reste un point : le bouclier tient encore');
  rpgBlesserCreature(duel, 'joueur', chien.id, 2);
  assert.equal(chien.pv, 1, 'le point de bouclier restant absorbe un dégât');
  assert.equal(chien.bouclier, 0);
  assert.equal(chien.bouclierEpuise, true, 'le dernier point absorbé marque le bouclier tombé');
});

test('Parade de verre ne se lance pas si sa créature cible est absente', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 5);
  donner(duel, 'joueur', 'parade-du-verre');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'parade-du-verre', 'entite-absente').raison, 'cible');
  assert.ok(duel.joueur.main.includes('parade-du-verre'), 'la carte et le mana restent intacts');
});

// ── Le lot du gel du Serment ───────────────────────────────────────────────
// Six sorts de contrôle du combat : gel (Poigne de givre, Verglas), brume de
// combat (Grand Voile blanc), blocage forcé (Appât de la meute, Embuscade) et
// duel de champions (Défi du Jarl).

test('Poigne de givre : 2 dégâts et gel — la créature n’attaque ni ne bloque jusqu’à la fin de son prochain tour', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 5);
  donnerMana(duel, 'sorcier', 5);
  donner(duel, 'sorcier', 'colosse-de-sel'); // 5/5
  const colosse = rpgJouerCreature(duel, 'sorcier', 'colosse-de-sel').entite;
  colosse.ready = true;
  donner(duel, 'joueur', 'poigne-de-givre');
  const res = rpgLancerMagie(duel, 'joueur', 'poigne-de-givre', colosse.id);
  assert.equal(res.ok, true);
  assert.equal(colosse.pv, 4, 'la Poigne inflige 2 dégâts');
  assert.ok(colosse.gelToursRestants > 0, 'le Colosse est gelé');
  assert.equal(rpgLancerAttaque(duel, 'sorcier', [colosse.id], { [colosse.id]: [] }).raison, 'pas-pret',
    'une créature gelée ne part pas à l’attaque');
  rpgFinDeTour(duel); // fin du tour du joueur
  assert.ok(colosse.gelToursRestants > 0, 'le gel tient pendant le tour du contrôleur');
  rpgFinDeTour(duel); // fin du prochain tour du sorcier
  assert.equal(colosse.gelToursRestants, 0, 'le gel tombe à la fin du prochain tour du contrôleur');
});

test('Grand Voile blanc : les dégâts de combat du tour s’égarent dans le blanc', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 5);
  donnerMana(duel, 'sorcier', 5);
  donner(duel, 'sorcier', 'colosse-de-sel'); // 5/5
  const colosse = rpgJouerCreature(duel, 'sorcier', 'colosse-de-sel').entite;
  colosse.ready = true;
  duel.tour = 'sorcier';
  rpgOuvrirFenetreReponse(duel, 'sorcier');
  donner(duel, 'joueur', 'grand-voile-blanc');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'grand-voile-blanc').ok, true,
    'la magie rapide se joue dans la fenêtre de réponse adverse');
  const res = rpgLancerAttaque(duel, 'sorcier', [colosse.id], { [colosse.id]: [] });
  assert.equal(res.ok, true);
  assert.equal(res.resume.frappeSorcier, 0, 'le voile avale les coups');
  assert.equal(duel.joueur.pv, RPG_PV_JOUEUR, 'aucun dégât de combat ne passe');
  rpgFinDeTour(duel); // fin du tour du sorcier : le voile tombe avec le tour
  assert.equal(duel.brouillardCombat, false);
});

test('Appât de la meute : le défenseur doit déclarer le bloqueur forcé à la prochaine attaque du lanceur', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 5);
  donnerMana(duel, 'sorcier', 5);
  donner(duel, 'sorcier', 'colosse-de-sel'); // 5/5
  const colosse = rpgJouerCreature(duel, 'sorcier', 'colosse-de-sel').entite;
  donner(duel, 'joueur', 'appat-de-la-meute');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'appat-de-la-meute', colosse.id).ok, true);
  donner(duel, 'joueur', 'chien-du-guet'); // 2/2
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  chien.ready = true;
  // Le marqueur n'assigne personne tout seul : sans déclaration du défenseur,
  // le combat est refusé et ni l'attaque ni le marqueur ne sont consommés.
  assert.equal(rpgBlocageForceValide(duel, 'joueur', [chien.id], { [chien.id]: [] }), false);
  const sansDeclaration = rpgLancerAttaque(duel, 'joueur', [chien.id], { [chien.id]: [] });
  assert.equal(sansDeclaration.ok, false);
  assert.equal(sansDeclaration.raison, 'blocage-force');
  assert.equal(chien.attaquee, false, 'le refus ne consomme pas l’attaque');
  assert.deepEqual(colosse.blocageForce, { par: 'joueur', portee: 'attaque' },
    'le refus ne dépense pas le marqueur');
  // Côté IA, la déclaration est explicite : le Colosse marqué est assigné
  // avant la résolution, comme n'importe quel bloqueur choisi.
  assert.deepEqual(rpgChoisirBloqueurs(duel, 'joueur', [chien.id]), { [chien.id]: [colosse.id] },
    'l’IA déclare le bloqueur forcé');
  assert.equal(rpgBlocageForceValide(duel, 'joueur', [chien.id], { [chien.id]: [colosse.id] }), true);
  const res = rpgLancerAttaque(duel, 'joueur', [chien.id], { [chien.id]: [colosse.id] });
  assert.equal(res.ok, true);
  assert.deepEqual(res.resume.blocages[chien.id], [colosse.id], 'le Colosse marqué se jette devant le Chien');
  assert.equal(res.resume.frappeSorcier, 0, 'l’attaque est bloquée de force');
  assert.equal(colosse.pv, 4, 'le Chien laisse 2 dégâts au Colosse avant de tomber');
});

test('Verglas : 1 dégât et gel de masse sur la table adverse', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 8);
  donnerMana(duel, 'sorcier', 8);
  donner(duel, 'sorcier', 'colosse-de-sel'); // 6/6
  donner(duel, 'sorcier', 'onna-musha-des-cendres'); // 3/3, Esquive
  const colosse = rpgJouerCreature(duel, 'sorcier', 'colosse-de-sel').entite;
  const fennec = rpgJouerCreature(duel, 'sorcier', 'onna-musha-des-cendres').entite;
  colosse.ready = true;
  fennec.ready = true;
  donner(duel, 'joueur', 'verglas');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'verglas').ok, true);
  assert.equal(colosse.pv, 5, 'le Colosse prend le dégât de grêle');
  assert.equal(fennec.pv, 2, 'l’Esquive ne couvre pas les magies : le dégât de grêle passe');
  assert.ok(colosse.gelToursRestants > 0 && fennec.gelToursRestants > 0,
    'toute la table adverse est gelée');
  assert.equal(rpgLancerAttaque(duel, 'sorcier', [colosse.id, fennec.id], {}).raison, 'pas-pret',
    'plus personne ne part à l’attaque');
});

test('Le Grand Hiver : 1 dégât à toutes les créatures, les deux camps compris, pour 2 manas', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 8);
  donnerMana(duel, 'sorcier', 8);
  const griffe = cardById('grand-hiver');
  assert.equal(griffe.cost, 2, 'le sort coûte 2 manas');
  assert.equal(griffe.element, 'neige');
  assert.equal(griffe.instant, undefined, 'c’est une sorcellerie, pas une magie rapide');
  assert.deepEqual(griffe.effet, { type: 'degats', amount: 1, cible: 'toutes-autres' });

  donner(duel, 'sorcier', 'colosse-de-sel'); // 6/6
  donner(duel, 'sorcier', 'tislit-des-aures'); // 1/1
  const colosse = rpgJouerCreature(duel, 'sorcier', 'colosse-de-sel').entite;
  const tislit = rpgJouerCreature(duel, 'sorcier', 'tislit-des-aures').entite;
  donner(duel, 'joueur', 'dune-marchante'); // 2/4
  donner(duel, 'joueur', 'tislit-des-aures'); // 1/1
  const dune = rpgJouerCreature(duel, 'joueur', 'dune-marchante').entite;
  const tislitAlliee = rpgJouerCreature(duel, 'joueur', 'tislit-des-aures').entite;

  donner(duel, 'joueur', 'grand-hiver');
  const manaAvant = Object.values(duel.joueur.mana).reduce((total, n) => total + n, 0);
  assert.equal(rpgLancerMagie(duel, 'joueur', 'grand-hiver').ok, true);
  assert.equal(Object.values(duel.joueur.mana).reduce((total, n) => total + n, 0), manaAvant - 2,
    'les 2 manas sont payés');
  assert.equal(colosse.pv, 5, 'le Colosse adverse encaisse');
  assert.equal(dune.pv, 3, 'la Dune alliée encaisse aussi : l’hiver ne choisit pas son camp');
  assert.equal(duel.sorcier.creatures.some((entite) => entite.id === tislit.id), false,
    'la créature adverse 1/1 meurt');
  assert.equal(duel.joueur.creatures.some((entite) => entite.id === tislitAlliee.id), false,
    'la créature alliée 1/1 meurt de la même vague');
  assert.equal(duel.joueur.cimetiere.includes('grand-hiver'), true, 'la sorcellerie rejoint le cimetière');
  // Un bouclier garde ses droits, comme contre tout dégât.
  const duel2 = duelDeBase();
  donnerMana(duel2, 'joueur', 8);
  donnerMana(duel2, 'sorcier', 8);
  donner(duel2, 'sorcier', 'guerrier-au-bouclier-rond'); // 2/2, bouclier 1
  const guerrier = rpgJouerCreature(duel2, 'sorcier', 'guerrier-au-bouclier-rond').entite;
  assert.equal(guerrier.bouclier, 1);
  const pvGuerrier = guerrier.pv;
  donner(duel2, 'joueur', 'grand-hiver');
  assert.equal(rpgLancerMagie(duel2, 'joueur', 'grand-hiver').ok, true);
  assert.equal(guerrier.bouclier, 0, 'le bouclier absorbe la vague');
  assert.equal(guerrier.pv, pvGuerrier, 'et la créature ne perd aucun PV');
});

test('Défi du Jarl : le champion allié se bat avec la créature adverse ciblée', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 5);
  donnerMana(duel, 'sorcier', 5);
  donner(duel, 'joueur', 'colosse-de-sel'); // 5/5
  donner(duel, 'sorcier', 'porteuse-de-cruches'); // 1/3
  const colosse = rpgJouerCreature(duel, 'joueur', 'colosse-de-sel').entite;
  const porteuse = rpgJouerCreature(duel, 'sorcier', 'porteuse-de-cruches').entite;
  donner(duel, 'joueur', 'defi-du-jarl');
  // Le duel exige les deux désignations : sans elles, rien ne se lance ni ne se paie.
  assert.equal(rpgLancerMagie(duel, 'joueur', 'defi-du-jarl', porteuse.id).raison, 'cible');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'defi-du-jarl', null, colosse.id).raison, 'cible');
  assert.equal(duel.joueur.mana.neige, 5, 'le mana reste entier tant que le duel n’a pas ses deux cibles');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'defi-du-jarl', porteuse.id, colosse.id).ok, true);
  assert.equal(duel.sorcier.creatures.length, 0, 'la Porteuse tombe sous les 6 dégâts du champion');
  assert.equal(colosse.pv, 6, 'la Porteuse 0/3 ne rend aucun coup : le Colosse reste intact');
});

test('Embuscade : -2/-2 jamais sous 1/1, et toute la table adverse doit bloquer ce tour', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 8);
  donnerMana(duel, 'sorcier', 8);
  donner(duel, 'sorcier', 'colosse-de-sel'); // 5/5
  donner(duel, 'sorcier', 'chien-du-guet'); // 2/2
  const colosse = rpgJouerCreature(duel, 'sorcier', 'colosse-de-sel').entite;
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  donner(duel, 'joueur', 'embuscade');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'embuscade').ok, true);
  assert.deepEqual([chien.atk, chien.def, chien.pv], [1, 1, 1],
    'le Chien 2/2 tombe à 1/1 : jamais sous le plancher');
  assert.deepEqual([colosse.atk, colosse.def, colosse.pv], [4, 4, 4], 'le Colosse 6/6 devient 4/4');
  donner(duel, 'joueur', 'chien-du-guet');
  const assaillant = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  assaillant.ready = true;
  // Comme pour l’Appât, le défenseur déclare ses bloqueurs forcés : le moteur
  // refuse une affectation vide, et l’IA assigne les deux créatures marquées.
  assert.equal(rpgLancerAttaque(duel, 'joueur', [assaillant.id], { [assaillant.id]: [] }).raison,
    'blocage-force');
  const declaration = rpgChoisirBloqueurs(duel, 'joueur', [assaillant.id]);
  assert.deepEqual(new Set(declaration[assaillant.id]), new Set([colosse.id, chien.id]),
    'l’IA déclare les deux bloqueurs forcés');
  const res = rpgLancerAttaque(duel, 'joueur', [assaillant.id], declaration);
  assert.equal(res.ok, true);
  assert.equal(res.resume.blocages[assaillant.id].length, 2,
    'les deux créatures adverses doivent se jeter devant l’assaillant');
  rpgFinDeTour(duel); // fin du tour : le marqueur « ce tour » s’efface
  for (const entite of duel.sorcier.creatures) {
    assert.equal(entite.blocageForce, null, `${entite.name} n’est plus forcée de bloquer`);
  }
});

test('le plein art du Serment est livré : les vingt-huit cartes Neige sont dédiées, aucune provisoire', () => {
  // La liste des illustrations provisoires est vide : le deck Neige et sa
  // variante de Glacier sont entièrement peints.
  assert.deepEqual(RPG_ART_PROVISOIRE, [], 'aucune carte Neige n’attend sa peinture');
  const fiches = ['creature', 'hero', 'magie', 'arme'];
  const cartesNeige = RPG_DUEL_CARDS.filter((carte) => carte.element === 'neige');
  assert.equal(cartesNeige.length, 28, 'vingt-huit cartes Neige au catalogue, sans le Glacier ni sa variante');
  assert.deepEqual([...new Set(cartesNeige.map((carte) => carte.kind))].sort(),
    ['arme', 'creature', 'hero', 'magie'], 'le set Neige couvre les quatre types de cartes jouables');
  for (const carte of cartesNeige) {
    assert.ok(fiches.includes(carte.kind), `${carte.id} est une carte jouable du set Neige`);
    assert.equal(cardArtId(carte), carte.id, `${carte.id} affiche son illustration dédiée`);
    assert.ok(existsSync(fileURLToPath(new URL(`../public/cards/${carte.id}.jpg`, import.meta.url))),
      `${carte.id} a sa peinture plein art`);
  }
  // Une carte ajoutée à la liste provisoire doit exister, et le jour où son
  // plein art arrive, elle doit en sortir : la liste ne peut pas mentir.
  for (const id of RPG_ART_PROVISOIRE) {
    assert.ok(RPG_DECK_NEIGE_BASE.includes(id), `${id} appartient au deck Neige`);
    assert.ok(existsSync(fileURLToPath(new URL(`../public/cards/${id}.jpg`, import.meta.url))),
      `${id} a bien une image, même provisoire`);
  }
});

test('les quatre figures du Nord portent leur kenning, jamais le mot « dieu »', () => {
  const figures = RPG_DUEL_CARDS.filter((carte) => carte.kind === 'hero' && carte.element === 'neige');
  assert.equal(figures.length, 4, 'le set Neige a quatre figures légendaires');
  assert.deepEqual(figures.map((carte) => carte.id),
    ['pere-des-corbeaux', 'maitre-du-marteau', 'dame-des-neuf-mondes', 'serpent-du-monde']);
  // Les noms du catalogue suivent les périphrases des poèmes du Nord : la
  // figure du tonnerre se reconnaît à son marteau, pas à un nom de divinité.
  assert.deepEqual(figures.map((carte) => carte.role),
    ['Celui qui sait', 'Le Tonnerre', 'La Gardienne du foyer', 'Celui qui entoure']);
  for (const carte of figures) {
    assert.equal(carte.rarity, 'mythique', 'les figures du Nord sont mythiques, comme tous les héros');
    assert.match(carte.typeLine, /^Créature légendaire — /);
    assert.doesNotMatch(`${carte.name} ${carte.role} ${carte.text ?? ''} ${carte.flavor ?? ''}`,
      /\bdieu(x)?\b/i, `${carte.id} ne nomme jamais de divinité`);
  }
  const maitre = RPG_DUEL_CARDS.find((carte) => carte.id === 'maitre-du-marteau');
  assert.equal(maitre.role, 'Le Tonnerre', 'le Maître du marteau est la figure du tonnerre');
  assert.match(maitre.flavor, /marteau/, 'son marteau qui revient à sa main est sa marque');
  assert.match(maitre.flavor, /tonnerre/);
});

test('aucune peinture Neige n’est le doublon d’une autre : les figures du Nord ont leur propre sujet', () => {
  // Deux cartes peuvent partager un même sujet (le marteau du Maître et
  // l’Éclair du marteau, les corbeaux du Père) : leurs peintures doivent
  // rester deux images distinctes, jamais le même fichier recopié.
  const empreintes = new Map();
  for (const carte of RPG_DUEL_CARDS.filter((candidate) => candidate.element === 'neige')) {
    const chemin = fileURLToPath(new URL(`../public/cards/${carte.id}.jpg`, import.meta.url));
    const empreinte = createHash('sha256').update(readFileSync(chemin)).digest('hex');
    assert.equal(empreintes.has(empreinte), false,
      `${carte.id} ne recopie pas la peinture de ${empreintes.get(empreinte)}`);
    empreintes.set(empreinte, carte.id);
  }
  assert.equal(empreintes.size, 28, 'les vingt-huit peintures Neige sont toutes différentes');
});

test('le Serment des Neuf Hivers est un deck mono-Neige : 30 cartes, sans terrain, mythiques en un exemplaire', () => {
  const deck = RPG_DECKS.find(({ id }) => id === 'serment-des-neuf-hivers');
  assert.ok(deck, 'le deck Neige apparaît dans la sélection');
  assert.equal(deck.role, 'joueur');
  assert.equal(deck.element, 'neige');
  assert.equal(deck.terrain, 'glacier');
  assert.equal(deck.cardIds, RPG_DECK_NEIGE_BASE, 'la sélection joue la liste de 30 cartes du deck');
  const valide = rpgValiderDeck(deck.cardIds);
  assert.equal(valide.ok, true, valide.raison);
  assert.equal(valide.terrains, 0, 'aucun terrain dans le format automatique');
  assert.equal(deck.cardIds.filter((id) => id === 'glacier').length, 0);
  assert.equal(deck.cardIds.filter((id) => id === 'glacier-des-arches').length, 0);
  for (const id of new Set(deck.cardIds)) {
    const carte = cardById(id);
    assert.deepEqual(cardColors(carte), ['neige'], `${id} reste dans l’identité Neige du deck`);
  }

  // Les raretés sont celles de Magic : seule la mythique est unique ; la
  // Valkyrie des glaces, désormais mythique, ne se joue donc qu'en un exemplaire.
  assert.deepEqual(Object.keys(CARD_RARITIES), ['commune', 'inhabituelle', 'rare', 'mythique'], 'pas de rareté « épique »');
  assert.equal(cardCopyLimit(cardById('valkyrie-des-glaces')), 1);
  assert.equal(cardCopyLimit(cardById('maitre-du-marteau')), 1);
  assert.equal(cardCopyLimit(cardById('loup-des-neiges')), 2);
  const mythiqueEnDouble = [...RPG_DECK_NEIGE_BASE];
  const placeDuLoup = mythiqueEnDouble.lastIndexOf('loup-des-neiges');
  mythiqueEnDouble[placeDuLoup] = 'maitre-du-marteau';
  assert.equal(rpgValiderDeck(mythiqueEnDouble).ok, false, 'deux Maîtres du marteau sont refusés');
  assert.match(rpgValiderDeck(mythiqueEnDouble).raison, /1 max/);
  for (const carte of RPG_DUEL_CARDS.filter((candidate) => candidate.element === 'neige' && candidate.rarity === 'mythique')) {
    assert.ok(RPG_DECK_NEIGE_BASE.filter((id) => id === carte.id).length <= 1,
      `${carte.id} mythique apparaît au plus une fois dans le deck Neige`);
    assert.ok(cardColors(carte).length >= 1, `${carte.id} porte au moins une couleur`);
  }

  // Les figures du Nord ne sont jamais appelées « dieux » dans leurs textes.
  for (const carte of RPG_DUEL_CARDS) {
    const texte = `${carte.name} ${carte.role ?? ''} ${carte.text ?? ''} ${carte.flavor ?? ''}`;
    assert.doesNotMatch(texte, /\bdieu(x)?\b/i, `${carte.id} ne nomme pas de divinité`);
  }
});

test('les cartes du Serment se résolvent : valkyries ailées, berserk, drakkar, magies et figures du Nord', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 40);
  donnerMana(duel, 'sorcier', 40);

  // Une créature adverse pour servir de cible aux capacités d'arrivée.
  donner(duel, 'sorcier', 'dune-marchante');
  const dune = rpgJouerCreature(duel, 'sorcier', 'dune-marchante').entite;

  // Valkyrie au corbeau : volante 3/4, sans Résonance. Son arrivée appelle
  // le seul Viking encore dans ce deck de démonstration.
  donner(duel, 'joueur', 'loup-des-neiges');
  const loup = rpgJouerCreature(duel, 'joueur', 'loup-des-neiges').entite;
  duel.joueur.deck = ['jarl-au-marteau-de-guerre'];
  donner(duel, 'joueur', 'valkyrie-au-corbeau');
  const valkyrie = rpgJouerCreature(duel, 'joueur', 'valkyrie-au-corbeau').entite;
  assert.deepEqual([valkyrie.atk, valkyrie.def, valkyrie.pv, valkyrie.envol], [3, 4, 4, true],
    'la Valkyrie arrive en 3/4 avec Envol');
  assert.ok(duel.joueur.main.includes('jarl-au-marteau-de-guerre'),
    'son arrivée met le Viking du deck dans la main du joueur');
  assert.deepEqual([loup.atk, loup.def, loup.pv], [2, 2, 2],
    'aucune aura ne renforce le Loup ni les Vikings déjà en jeu');
  assert.equal(rpgResonanceEnJeu(duel, 'viking'), 0);
  assert.equal(duel.sorcier.creatures.every((e) => rpgPeutBloquerAttaquant(e, valkyrie) === false), true,
    'aucune créature terrestre ne peut bloquer la Valkyrie');

  // Valkyrie des glaces : plus de Résonance ni de lance ciblée. Elle entre
  // sans désignation à ses statistiques imprimées 5/5, et son arrivée soigne
  // les créatures du joueur — assez pour éteindre la Furie du Loup ramené à
  // sa DEF de base.
  rpgBlesserCreature(duel, 'joueur', loup.id, 1, 'braise');
  assert.deepEqual(
    [loup.atk, loup.pv, loup.pvMax, loup.furieDeclenchee],
    [3, 1, 2, true],
    'le Loup blessé est en Furie avant l’arrivée',
  );
  donner(duel, 'joueur', 'valkyrie-des-glaces');
  const duneAvantGlace = dune.pv;
  const glace = rpgJouerCreature(duel, 'joueur', 'valkyrie-des-glaces');
  assert.equal(glace.ok, true, 'son soin ne demande aucune cible');
  assert.deepEqual(
    [glace.entite.atk, glace.entite.def, glace.entite.pv, glace.entite.pvMax, glace.entite.envol],
    [5, 5, 5, 5, true],
    'la Valkyrie des glaces entre en 5/5 : aucune des deux valkyries n’émet de Résonance',
  );
  assert.equal(rpgResonanceEnJeu(duel, 'viking'), 0);
  assert.equal(rpgEstProtegee(glace.entite, ['braise']), true, 'Protection contre la Braise');
  assert.equal(rpgEstProtegee(glace.entite, ['eau']), false, 'et contre elle seule');
  assert.deepEqual(
    [loup.atk, loup.pv, loup.pvMax, loup.furieDeclenchee, loup.furieBonusAtk],
    [2, 2, 2, false, 0],
    'soigné de 2 jusqu’à sa DEF de base, le Loup quitte la Furie',
  );
  assert.equal(dune.pv, duneAvantGlace, 'aucune lance ne blesse plus la Dune à l’arrivée');

  // Géant des banquises : à l'arrivée, il gèle toutes les créatures adverses.
  donner(duel, 'sorcier', 'chien-du-guet');
  rpgJouerCreature(duel, 'sorcier', 'chien-du-guet');
  const chienGeant = duel.sorcier.creatures.at(-1);
  donner(duel, 'joueur', 'geant-des-banquises');
  rpgJouerCreature(duel, 'joueur', 'geant-des-banquises');
  assert.equal(duel.sorcier.creatures.includes(chienGeant), true,
    'le pas du Géant ne blesse plus personne : le Chien reste en jeu');
  assert.equal(chienGeant.gelToursRestants > 0, true, 'mais le Chien est gelé par l’arrivée du Géant');
  assert.equal(duel.log.some((ligne) => ligne.includes('est gelée : ni attaque ni blocage')), true,
    'le journal annonce le gel');

  // Drakkar : 2/6, il ne peut pas attaquer — mais il peut encore bloquer —
  // et son naufrage ne fait plus piocher qu'une carte.
  duel.joueur.deck = ['glacier', 'glacier'];
  donner(duel, 'joueur', 'drakkar-a-tete-de-dragon');
  const mainAvant = duel.joueur.main.length;
  const drakkar = rpgJouerCreature(duel, 'joueur', 'drakkar-a-tete-de-dragon').entite;
  assert.deepEqual([drakkar.atk, drakkar.def, drakkar.pv], [2, 6, 6]);
  assert.equal(drakkar.nePeutPasAttaquer, true);
  drakkar.ready = true;
  assert.equal(rpgPeutAttaquer(drakkar), false, 'même prêt, le Drakkar ne peut pas attaquer');
  assert.equal(rpgLancerAttaque(duel, 'joueur', [drakkar.id], {}).ok, false,
    'le moteur refuse son attaque');
  assert.equal(rpgPeutBloquerAttaquant(drakkar, dune), true,
    'l’interdiction d’attaquer ne l’empêche pas de bloquer');
  assert.equal(duel.joueur.main.length, mainAvant - 1, 'le Drakkar entre en jeu sans faire piocher');
  rpgBlesserCreature(duel, 'joueur', drakkar.id, 10, 'braise');
  assert.equal(duel.joueur.main.length, mainAvant,
    'le Drakkar détruit fait piocher une seule carte');

  // Berserk : Provocation — son attaque ne peut pas partir sans bloqueur
  // tant qu'un blocage légal est possible. Le Fennec 3/1 s'interpose donc :
  // il tombe sous le point du Berserk, mais ses 3 dégâts allument sa Furie.
  donner(duel, 'sorcier', 'fennec-des-decombres');
  rpgJouerCreature(duel, 'sorcier', 'fennec-des-decombres');
  const fennec = duel.sorcier.creatures.at(-1);
  donner(duel, 'joueur', 'berserk-des-trois-hivers');
  const berserk = rpgJouerCreature(duel, 'joueur', 'berserk-des-trois-hivers').entite;
  assert.equal(cardById('berserk-des-trois-hivers').coupRapide, undefined,
    'Coup rapide a quitté la fiche');
  assert.equal(berserk.provocation, true, 'l’entité porte Provocation');
  berserk.ready = true;
  const pvSorcierAvantBerserk = duel.sorcier.pv;
  const sansBloqueur = rpgLancerAttaque(duel, 'joueur', [berserk.id], { [berserk.id]: [] });
  assert.equal(sansBloqueur.ok, false, 'sans bloqueur, la déclaration est refusée');
  assert.equal(sansBloqueur.raison, 'provocation');
  assert.equal(berserk.attaquee, false, 'le refus ne consomme pas son attaque');
  const attaque = rpgLancerAttaque(duel, 'joueur', [berserk.id], { [berserk.id]: [fennec.id] });
  assert.equal(attaque.ok, true, 'avec un bloqueur légal, l’attaque se résout');
  assert.equal(duel.sorcier.creatures.includes(fennec), false,
    'le Fennec 3/1 tombe sous le point de combat du Berserk');
  assert.deepEqual(
    [berserk.atk, berserk.def, berserk.pv, berserk.pvMax, berserk.furieDeclenchee, berserk.furieBonusAtk],
    [3, 2, 2, 5, true, 2],
    'les 3 dégâts du bloqueur laissent le Berserk 1/5 à 2 PV : Furie 2 porte son attaque à 3',
  );
  assert.equal(attaque.resume.frappeSorcier, 0);
  assert.equal(duel.sorcier.pv, pvSorcierAvantBerserk,
    'bloqué, le Berserk ne touche pas le sorcier');

  // Magies : sorcelleries et magies rapides.
  donner(duel, 'joueur', 'mur-de-boucliers');
  const loupAvantMur = { atk: loup.atk, def: loup.def, pv: loup.pv, overkill: loup.overkill };
  assert.equal(rpgLancerMagie(duel, 'joueur', 'mur-de-boucliers').ok, true);
  assert.deepEqual(
    { atk: loup.atk, def: loup.def, pv: loup.pv, overkill: loup.overkill },
    { ...loupAvantMur, atk: loupAvantMur.atk + 2, overkill: true },
    'le Mur de boucliers donne +2/+0 et Overkill, sans toucher à la défense',
  );

  donner(duel, 'joueur', 'brume-du-fjord');
  duel.fenetreReponse = false;
  const duneAvantBrume = dune.pv;
  assert.equal(rpgLancerMagie(duel, 'joueur', 'brume-du-fjord').ok, true);
  assert.equal(dune.pv, duneAvantBrume - 1,
    'la Brume du fjord mord toutes les créatures adverses de 1');

  donner(duel, 'joueur', 'festin-des-vaillants');
  duel.joueur.pv = RPG_PV_JOUEUR - 10;
  const pvBerserkAvantFestin = berserk.pv;
  const pvDuneAvantFestin = dune.pv;
  assert.equal(rpgLancerMagie(duel, 'joueur', 'festin-des-vaillants').ok, true);
  assert.equal(duel.joueur.pv, RPG_PV_JOUEUR - 10,
    'le Festin ne soigne plus le sorcier qui le lance');
  assert.equal(berserk.pv, pvBerserkAvantFestin + 1,
    'chaque créature alliée blessée récupère 1 PV');
  assert.deepEqual(
    [berserk.furieDeclenchee, berserk.furieBonusAtk],
    [true, 2],
    'à 3 PV, toujours sous sa DEF de base 5, le Berserk reste en Furie',
  );
  assert.equal(loup.pv, loup.pvMax, 'les créatures intactes restent plafonnées à leurs PV max');
  assert.equal(dune.pv, pvDuneAvantFestin, 'les créatures adverses ne sont pas soignées');

  donner(duel, 'sorcier', 'dune-marchante');
  const dune2 = rpgJouerCreature(duel, 'sorcier', 'dune-marchante').entite;
  donner(duel, 'joueur', 'hurlement-du-blizzard');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'hurlement-du-blizzard').ok, true);
  assert.equal(dune2.pv, 2, 'le Hurlement du blizzard balaie toutes les créatures adverses');

  donner(duel, 'joueur', 'eclair-du-marteau');
  const pvSorcierAvantEclair = duel.sorcier.pv;
  assert.equal(rpgLancerMagie(duel, 'joueur', 'eclair-du-marteau', 'sorcier').ok, true);
  assert.equal(duel.sorcier.pv, pvSorcierAvantEclair - 3, 'l’Éclair du marteau peut frapper le sorcier');

  // Les quatre figures du Nord : exil, balayage, soin et le grand Serpent.
  // On replace le joueur à 20 PV pour isoler le soin de la Dame du Festin,
  // qui ne rend plus de vie au sorcier.
  duel.joueur.pv = RPG_PV_JOUEUR - 5;
  for (const [id, figure] of [['pere-des-corbeaux', 'Le Père des corbeaux'], ['maitre-du-marteau', 'Le Maître du marteau'], ['dame-des-neuf-mondes', 'La Dame des neuf mondes']]) {
    const carte = cardById(id);
    assert.equal(carte.kind, 'hero', `${figure} est un héros`);
    assert.equal(carte.element, 'neige');
    donner(duel, 'joueur', id);
    // Le Père des corbeaux désigne une créature de coût 3 ou moins à exiler.
    const cibleExil = id === 'pere-des-corbeaux'
      ? [...duel.sorcier.creatures, ...duel.joueur.creatures]
        .find((entite) => (cardById(entite.carteId)?.cost ?? 0) <= 3)?.id ?? null
      : undefined;
    assert.equal(rpgJouerCreature(duel, 'joueur', id, cibleExil).ok, true, `${figure} se pose`);
  }
  // Le joueur a été remis à 20 PV : le soin de la Dame s’ajoute en entier
  // (20 + 5) et n'est plus rogné par un plafond de 25.
  assert.equal(duel.joueur.pv, RPG_PV_JOUEUR, 'le soin de la Dame s’ajoute en entier');
  assert.equal(duel.joueur.pvMax, RPG_PV_JOUEUR, 'le maximum ne bouge que si la vie le dépasse');

  // Le Père des corbeaux : Envol, et ses corbeaux exilent une petite créature.
  donner(duel, 'sorcier', 'chien-du-guet');
  const emportee = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  donner(duel, 'joueur', 'pere-des-corbeaux');
  const corbeaux = rpgJouerCreature(duel, 'joueur', 'pere-des-corbeaux', emportee.id).entite;
  assert.equal(corbeaux.envol, true, 'le Père des corbeaux vole');
  assert.equal(duel.sorcier.creatures.includes(emportee), false,
    'les corbeaux emportent le Chien à 2 mana');
  assert.equal(duel.sorcier.exil?.includes('chien-du-guet'), true,
    'exilé — retiré de la partie, pas au cimetière');

  // Le Serpent du monde : protégé des magies, Overkill au combat.
  donner(duel, 'joueur', 'serpent-du-monde');
  const serpent = rpgJouerCreature(duel, 'joueur', 'serpent-du-monde').entite;
  assert.deepEqual([serpent.atk, serpent.def], [6, 6],
    'le Serpent entre à sa force imprimée 6/6');
  assert.equal(serpent.protectionSorts, true, 'protégé contre les magies et les sorcelleries');
  assert.equal(serpent.overkill, true, 'il porte Overkill');
  donner(duel, 'joueur', 'eclair-du-marteau');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'eclair-du-marteau', serpent.id).raison, 'protection',
    'aucun sort ne peut le viser — pas même les vôtres');
});

test('les decks de départ respectent les limites mythiques et le deck hybride reste valide', () => {
  assert.deepEqual(RPG_DECKS.map(({ id }) => id),
    ['veilleurs-du-desert', 'cour-des-djinns', 'sentiers-de-cendre', 'maree-des-abysses', 'serment-des-neuf-hivers', 'serment-du-soleil-rouge', 'balance-des-heures', 'lettres-de-marque'],
    'les huit decks du catalogue, dont les deux cultures de Braise, les Ténèbres et la Régence');
  assert.equal(RPG_DECK_SORCIER_BASE.filter((id) => id === 'anqa-des-braises').length, 1,
    'la Cour des Djinns contient Anqa comme unique mythique');
  assert.equal(RPG_DECK_HYBRIDE_BASE.filter((id) => id === 'feriel').length, 1,
    'les Sentiers de cendre contiennent Fériel comme unique mythique');
  assert.equal(RPG_DECK_HYBRIDE_BASE.filter((id) => id === 'anqa-des-braises').length, 0,
    'les Sentiers de cendre laissent les autres mythiques dans les boosters');
  assert.equal(RPG_DECK_TENEBRES_BASE.filter((id) => id === 'la-devoreuse').length, 1,
    'la Balance des Heures contient La Dévoreuse comme unique mythique');
  assert.equal(RPG_DECK_TENEBRES_BASE.filter((id) => id === 'la-derniere-pesee').length, 0,
    'la Balance des Heures laisse La Dernière Pesée et les autres mythiques dans les boosters');
  assert.equal(RPG_DECK_LETTRES_DE_MARQUE_BASE.filter((id) => id === 'la-barbe-rousse').length, 1,
    'les Lettres de Marque contiennent La Barbe-Rousse comme unique mythique');
  for (const [deck, terrainsAttendus, creaturesAttendues, magiesAttendues, armesAttendues] of [
    [RPG_DECK_JOUEUR_BASE, 0, 18, 6, 6],
    [RPG_DECK_SORCIER_BASE, 0, 21, 9, 0],
    [RPG_DECK_NEIGE_BASE, 0, 17, 12, 1],
    [RPG_DECK_TENEBRES_BASE, 0, 19, 10, 1],
    [RPG_DECK_LETTRES_DE_MARQUE_BASE, 0, 19, 9, 2],
  ]) {
    const valide = rpgValiderDeck(deck);
    assert.equal(valide.ok, true, valide.raison);
    assert.equal(deck.length, 30);
    assert.equal(valide.terrains, terrainsAttendus);
    const comptes = {};
    for (const id of deck) {
      comptes[id] = (comptes[id] ?? 0) + 1;
      assert.ok(cardById(id), `${id} existe dans le catalogue des cartes`);
    }
    for (const [id, n] of Object.entries(comptes)) {
      const carte = cardById(id);
      const limite = cardCopyLimit(carte);
      assert.ok(n <= limite, `${id} ×${n} (limite ${limite})`);
    }
    const creatures = deck.filter((id) => ['creature', 'hero'].includes(cardById(id)?.kind));
    const magies = deck.filter((id) => cardById(id)?.kind === 'magie');
    const armes = deck.filter((id) => cardById(id)?.kind === 'arme');
    assert.equal(creatures.length, creaturesAttendues);
    assert.equal(magies.length, magiesAttendues);
    assert.equal(armes.length, armesAttendues);
  }

  for (const [deck, element] of [
    [RPG_DECK_JOUEUR_BASE, 'sable'],
    [RPG_DECK_SORCIER_BASE, 'braise'],
    [RPG_DECK_NEIGE_BASE, 'neige'],
    [RPG_DECK_TENEBRES_BASE, 'tenebres'],
  ]) {
    for (const id of deck) {
      const carte = cardById(id);
      assert.equal(carte.element, element, `${id} appartient à l’élément ${element}`);
      if (carte.kind === 'terrain') {
        assert.deepEqual(terrainManaColors(carte), [element], `${id} produit l’élément ${element}`);
      }
    }
  }

  const deckHybride = RPG_DECKS.find(({ id }) => id === 'sentiers-de-cendre');
  assert.ok(deckHybride, 'le deck hybride apparaît dans la sélection');
  assert.equal(deckHybride.role, 'joueur');
  assert.deepEqual(deckHybride.elements, ['sable', 'braise']);
  assert.equal(deckHybride.cardIds, RPG_DECK_HYBRIDE_BASE, 'la sélection utilise le deck hybride de 30 cartes');
  const valide = rpgValiderDeck(deckHybride.cardIds);
  assert.equal(valide.ok, true, valide.raison);
  assert.equal(valide.terrains, 0);
  assert.ok(RPG_DECK_HYBRIDE_BASE.every((id) => cardById(id)?.kind !== 'terrain'));
  assert.equal(RPG_DECK_HYBRIDE_BASE.filter((id) => ['creature', 'hero'].includes(cardById(id)?.kind)).length, 16);
  assert.equal(RPG_DECK_HYBRIDE_BASE.filter((id) => cardById(id)?.kind === 'magie').length, 8);
  assert.equal(RPG_DECK_HYBRIDE_BASE.filter((id) => cardById(id)?.kind === 'arme').length, 6);
  for (const carte of RPG_DUEL_CARDS.filter((candidate) => candidate.rarity === 'mythique')) {
    assert.ok(RPG_DECK_HYBRIDE_BASE.filter((id) => id === carte.id).length <= 1,
      `${carte.id} mythique apparaît au plus une fois dans le deck hybride`);
  }
  for (const id of new Set(RPG_DECK_HYBRIDE_BASE)) {
    const carte = cardById(id);
    assert.ok(cardColors(carte).every((couleur) => deckHybride.elements.includes(couleur)),
      `${id} reste dans l’identité Sable/Braise du deck`);
  }
  const cartesHybrides = new Set(RPG_DECK_HYBRIDE_BASE.filter((id) => {
    const cout = cardColorCost(cardById(id));
    return cout.braise > 0 && cout.sable > 0;
  }));
  assert.ok(cartesHybrides.has('djinn-de-foudre') && cartesHybrides.has('vent-rouge'),
    'le deck contient plusieurs cartes exigeant une source Braise et une source Sable');
});

test('le validateur exige 30 cartes sans terrain, les quotas et une identité de trois couleurs au plus', () => {
  assert.equal(rpgValiderDeck(RPG_DECK_JOUEUR_BASE.slice(0, 29)).ok, false);
  assert.equal(rpgValiderDeck([...RPG_DECK_JOUEUR_BASE, 'chien-du-guet']).ok, false);
  const tropDeCopies = [...RPG_DECK_JOUEUR_BASE];
  tropDeCopies[0] = 'chien-du-guet';
  assert.equal(rpgValiderDeck(tropDeCopies).ok, false);
  assert.match(rpgValiderDeck(tropDeCopies).raison, /chien-du-guet.*3 exemplaires/);
  const mythiqueEnDouble = [...RPG_DECK_HYBRIDE_BASE];
  mythiqueEnDouble[mythiqueEnDouble.indexOf('djinn-de-foudre')] = 'feriel';
  assert.equal(rpgValiderDeck(mythiqueEnDouble).ok, false);
  assert.match(rpgValiderDeck(mythiqueEnDouble).raison, /feriel mythique en 2 exemplaires \(1 max\)/);
  for (const id of ['desert', 'boussole-du-hoggar', 'djinn-du-souk', 'inconnue']) {
    const cartes = [...RPG_DECK_JOUEUR_BASE];
    cartes[0] = id;
    assert.equal(rpgValiderDeck(cartes).ok, false, `${id} est hors format`);
  }
  const quatreCouleurs = [...RPG_DECK_HYBRIDE_BASE];
  quatreCouleurs[0] = 'ressac';
  quatreCouleurs[1] = 'loup-des-neiges';
  assert.equal(rpgValiderDeck(quatreCouleurs).ok, false);
  assert.match(rpgValiderDeck(quatreCouleurs).raison, /1 à 3 couleurs/);
});

test('Trait de braise coûte 2, est une magie rapide et inflige 3 dégâts à une créature ou un sorcier', () => {
  const trait = cardById('trait-de-braise');
  assert.deepEqual({ cost: trait.cost, instant: trait.instant, typeLine: trait.typeLine, amount: trait.effet.amount, cibles: trait.cibles }, {
    cost: 2, instant: true, typeLine: 'Magie Rapide — Braise', amount: 3, cibles: ['creature', 'sorcier'],
  });
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'trait-de-braise');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'trait-de-braise').ok, false, 'sans cible légale, le sort échoue');
  donnerMana(duel, 'sorcier', 10);
  donner(duel, 'sorcier', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  assert.equal(rpgLancerMagie(duel, 'joueur', 'trait-de-braise', chien.id).ok, true, 'les 3 dégâts détruisent le Chien 2/2');
  assert.equal(duel.sorcier.creatures.length, 0);
  const pvSorcierAvant = duel.sorcier.pv;
  donner(duel, 'joueur', 'trait-de-braise');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'trait-de-braise', 'sorcier').ok, true,
    'la cible Sorcier applique aussi les 3 dégâts');
  assert.equal(duel.sorcier.pv, pvSorcierAvant - 3);
  duel.joueur.pv = RPG_PV_JOUEUR - 10;
  donner(duel, 'joueur', 'eau-de-la-source');
  rpgLancerMagie(duel, 'joueur', 'eau-de-la-source');
  assert.equal(duel.joueur.pv, RPG_PV_JOUEUR - 6);
  const mainAvant = duel.joueur.main.length;
  donner(duel, 'joueur', 'rapport-du-greffier');
  rpgLancerMagie(duel, 'joueur', 'rapport-du-greffier');
  assert.equal(duel.joueur.main.length, mainAvant + 2, 'donner +1, lancée −1, piochées +2');
  // Sans creature adverse : la seule cible légale du Trait est le sorcier.
  const pvAvant = duel.sorcier.pv;
  donner(duel, 'joueur', 'trait-de-braise');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'trait-de-braise', 'sorcier').ok, true,
    'la Fureur du souk retirée, le Trait reste le sort qui frappe le sorcier');
  assert.equal(duel.sorcier.pv, pvAvant - 3, 'le Trait touche le sorcier de 3 dégâts');
});

test('vainqueur : nul tant que les deux sorciers sont debout', () => {
  const duel = duelDeBase();
  assert.equal(rpgVainqueur(duel), null);
  duel.sorcier.pv = 0;
  assert.equal(rpgVainqueur(duel), 'joueur');
  duel.joueur.pv = 0;
  assert.equal(rpgVainqueur(duel), 'egalite');
});

test('actions d’état : une créature sans défense quitte la table, d’où qu’elle vienne', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 9);
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  assert.equal(duel.joueur.creatures.length, 1);
  assert.equal(rpgActionsEtat(duel), 0, 'une table saine n’est pas touchée');

  // Un effet qui viderait les PV sans passer par les dégâts (malus, aura
  // perdue, capacité future) ne doit jamais laisser la carte sur le terrain.
  chien.pv = 0;
  chien.attaquee = true;
  assert.equal(rpgActionsEtat(duel), 1, 'la créature morte est retirée');
  assert.deepEqual(duel.joueur.creatures, [], 'plus aucune carte morte en jeu');
  assert.ok(duel.joueur.cimetiere.includes('chien-du-guet'), 'elle rejoint le cimetière');
  assert.equal(rpgActionsEtat(duel), 0, 'le balayage est idempotent');
});

test('actions d’état : le balayage passe après chaque geste public du duel', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 9);
  donnerMana(duel, 'sorcier', 9);
  donner(duel, 'joueur', 'chien-du-guet');
  donner(duel, 'sorcier', 'chien-du-guet');
  const mien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  const sien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  mien.pv = 0;
  sien.pv = -3;
  donner(duel, 'joueur', 'fennec-des-decombres');
  rpgJouerCreature(duel, 'joueur', 'fennec-des-decombres');
  assert.deepEqual(duel.joueur.creatures.map((entite) => entite.carteId), ['fennec-des-decombres'],
    'poser une carte nettoie les créatures mortes des deux camps');
  assert.deepEqual(duel.sorcier.creatures, []);
});

test('un contre n’est jouable que face à une annonce adverse qu’il peut viser', () => {
  const duel = duelDeBase();
  const silence = cardById('silence-decume');
  const chien = cardById('chien-du-guet');
  assert.equal(rpgContreJouable(duel, 'joueur', chien), true, 'une carte qui n’est pas un contre reste jouable');
  assert.equal(rpgContreJouable(duel, 'joueur', silence), false, 'sans annonce, le contre n’est pas jouable');

  // Annonce du sorcier d’un sort : le Silence d’écume peut répondre, quelle que soit sa couleur.
  duel.annonce = { cote: 'sorcier', carteId: 'trait-de-braise' };
  assert.equal(rpgContreJouable(duel, 'joueur', silence), true);
  duel.annonce = { cote: 'sorcier', carteId: 'eau-de-la-source' };
  assert.equal(rpgContreJouable(duel, 'joueur', silence), true);
  // Une créature annoncée ne peut pas être contrée par Silence d’écume.
  duel.annonce = { cote: 'sorcier', carteId: 'chien-du-guet' };
  assert.equal(rpgContreJouable(duel, 'joueur', silence), false);
  // Sa propre annonce ne se contre pas.
  duel.annonce = { cote: 'joueur', carteId: 'trait-de-braise' };
  assert.equal(rpgContreJouable(duel, 'joueur', silence), false);
});

/* ── Le mulligan : la main de départ s'échange une fois, à carte égale ─────── */

const compteurDeCartes = (liste) => [...liste].sort().join('|');

test('mulligan : les cartes choisies repartent et sont remplacées par autant de pioches', () => {
  const duel = rpgNouveauDuel({
    joueurDeck: ['desert', 'desert', 'chien-du-guet', 'montagne', 'mer', 'fennec-des-decombres', 'djinn-du-souk', 'ressac'],
    sorcierDeck: Array(8).fill('desert'),
    rng: () => 0.5,
  });
  assert.equal(rpgPeutMulligan(duel, 'joueur'), true, 'le mulligan est ouvert à l’ouverture du duel');
  const mainAvant = [...duel.joueur.main];
  const paquetAvant = [...duel.joueur.deck];
  const { ok, ecartees, piochees } = rpgMulligan(duel, 'joueur', [0, 2], () => 0.25);

  assert.equal(ok, true, 'l’échange est accepté');
  assert.deepEqual(ecartees, [mainAvant[0], mainAvant[2]], 'ce sont bien les cartes désignées qui partent');
  assert.equal(piochees.length, 2, 'on pioche autant de cartes qu’on en écarte');
  assert.equal(duel.joueur.main.length, mainAvant.length, 'la main ne diminue jamais');
  assert.equal(compteurDeCartes([...duel.joueur.main, ...duel.joueur.deck]),
    compteurDeCartes([...mainAvant, ...paquetAvant]),
    'aucune carte perdue : la main et le paquet ensemble gardent le même contenu');
  assert.equal(rpgPeutMulligan(duel, 'joueur'), false, 'un seul échange par camp');
  assert.deepEqual(rpgMulligan(duel, 'joueur', [1]), { ok: false, ecartees: [], piochees: [] },
    'le second refus est silencieux : rien ne bouge');
});

test('mulligan : ce sont les cases de la main qui sont écartées, pas les noms', () => {
  // rng fixe à 0.999 : le mélange laisse le paquet en ordre, la main est donc
  // exactement le dessus du paquet — cinq Déserts identiques.
  const duel = rpgNouveauDuel({
    joueurDeck: ['chien-du-guet', 'fennec-des-decombres', 'ressac', 'desert', 'desert', 'desert', 'desert', 'desert'],
    sorcierDeck: [],
    rng: () => 0.999,
  });
  assert.deepEqual(duel.joueur.main, [...Array(5).fill('desert')], 'toute la main est en Déserts');
  const paquetAvant = [...duel.joueur.deck];
  const { ecartees, piochees } = rpgMulligan(duel, 'joueur', [0, 2, 4], () => 0.999);
  assert.deepEqual(ecartees, ['desert', 'desert', 'desert'], 'trois exemplaires précis quittent la main');
  assert.equal(piochees.length, 3, 'trois cartes remontent du paquet');
  assert.equal(duel.joueur.main.length, 5, 'la main ne fond pas');
  assert.equal(duel.joueur.main.filter((id) => id === 'desert').length + duel.joueur.deck.filter((id) => id === 'desert').length, 5,
    'les cinq Déserts de la main sont tous retournés dans le paquet');
  assert.equal([...duel.joueur.main, ...duel.joueur.deck].sort().join('|'),
    [...Array(5).fill('desert'), ...paquetAvant].sort().join('|'),
    'rien ne se perd ni ne se crée');
});

test('mulligan : doublons, cases hors main et valeurs vides sont ignorés', () => {
  const duel = duelDeBase();
  const mainAvant = [...duel.joueur.main];
  const { ecartees } = rpgMulligan(duel, 'joueur', [1, 1, '1', 9, -3, 2.5, null, undefined, {}]);
  assert.deepEqual(ecartees, [mainAvant[1]], 'une seule case est désignée, même annoncée cinq fois');
  assert.equal(duel.joueur.main.length, mainAvant.length, 'et la main garde sa taille');
});

test('mulligan : la main garde sa taille, même avec un paquet presque vide', () => {
  // Six cartes au total : cinq en main, une au paquet. Les cartes écartées sont
  // rebattues avec, si bien que l'échange reste possible sans rien perdre.
  const duel = rpgNouveauDuel({
    joueurDeck: ['desert', 'desert', 'desert', 'desert', 'desert', 'chien-du-guet'],
    sorcierDeck: [],
    rng: () => 0.999,
  });
  assert.equal(duel.joueur.main.length, 5);
  assert.equal(duel.joueur.deck.length, 1);
  const totalAvant = duel.joueur.main.length + duel.joueur.deck.length;
  const { ecartees, piochees } = rpgMulligan(duel, 'joueur', [0, 1, 2, 3, 4], () => 0.999);
  assert.equal(ecartees.length, 5, 'les cinq cartes partent');
  assert.equal(piochees.length, 5, 'cinq reviennent, piochées dans le paquet rebattu');
  assert.equal(duel.joueur.main.length + duel.joueur.deck.length, totalAvant, 'le compte y est');
});

test('mulligan : fermé dès qu’une carte a été posée ou qu’un tour a été joué', () => {
  const duel = rpgNouveauDuel({
    joueurDeck: ['desert', 'chien-du-guet', 'fennec-des-decombres', 'ressac', 'mer', 'montagne', 'dune-marchante'],
    sorcierDeck: Array(7).fill('desert'),
    rng: () => 0.5,
  });
  assert.equal(rpgPeutMulligan(duel, 'joueur'), true, 'à la table vide, l’échange est ouvert');
  duel.joueur.terrains.push({ id: 't1', carteId: 'desert', tapped: false });
  assert.equal(rpgPeutMulligan(duel, 'joueur'), false, 'la table n’est plus vide : le mulligan est passé');

  const neuf = rpgNouveauDuel({ joueurDeck: duelDeBase().joueur.main, sorcierDeck: [], rng: () => 0.5 });
  rpgFinDeTour(neuf);
  assert.equal(neuf.tour, 'sorcier');
  assert.equal(rpgPeutMulligan(neuf, 'joueur'), false, 'le tour du joueur est terminé : plus d’échange');
});

test('mulligan : sans main de départ, rien n’est proposé', () => {
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.5 });
  assert.equal(duel.joueur.main.length, 0);
  assert.equal(rpgPeutMulligan(duel, 'joueur'), false, 'pas de main, pas de mulligan');
});

test('mulligan du sorcier : il ne renvoie rien quand le paquet ne peut pas mieux faire', () => {
  const aSec = rpgNouveauDuel({
    joueurDeck: Array(10).fill('desert'),
    sorcierDeck: Array(5).fill('desert'),
    rng: () => 0.999,
  });
  aSec.sorcier.main = ['chien-du-guet', 'fennec-des-decombres', 'djinn-du-souk', 'dune-marchante', 'colosse-de-sel'];
  aSec.sorcier.deck = [];
  assert.equal(aSec.sorcier.deck.length, 0, 'plus une carte au paquet');
  assert.deepEqual(choisirMulliganIA(aSec, 'sorcier'), [],
    'sans terrain à espérer, changer sa main ne serait qu’un coup de théâtre');
});

test('mulligan : niveau Récit, le sorcier ne renvoie jamais sa main', () => {
  const duel = rpgNouveauDuel({
    joueurDeck: Array(10).fill('desert'),
    sorcierDeck: ['chien-du-guet', 'fennec-des-decombres', 'djinn-du-souk', 'dune-marchante', 'colosse-de-sel'],
    sorcierIA: { niveau: 'recit' },
    rng: () => 0.5,
  });
  const mainAvant = [...duel.sorcier.main];
  const { ecartees } = rpgMulliganSorcier(duel, () => 0.5);
  assert.deepEqual(ecartees, [], 'le profil récit garde la main de départ');
  assert.deepEqual(duel.sorcier.main, mainAvant);
});

test('mulligan : la main de départ est le seul témoin, une pioche de tour ferme la porte', () => {
  const duel = duelDeBase();
  assert.deepEqual(duel.mainDepart, { joueur: RPG_MAIN_DEPART, sorcier: RPG_MAIN_DEPART });
  rpgPiocher(duel, 'joueur');
  assert.equal(rpgPeutMulligan(duel, 'joueur'), false, 'la main n’est plus la main de départ');
});


// ── Les six phases du tour ──────────────────────────────────────────────────

test('un tour compte six phases, dans l’ordre : début, principale, attaque, blocage, deuxième principale, fin', () => {
  assert.deepEqual(RPG_PHASES, ['debut', 'principale', 'attaque', 'blocage', 'principale2', 'fin']);
  for (const phase of RPG_PHASES) assert.ok(RPG_PHASES_LIBELLES[phase], `${phase} a un libellé`);
});

test('début de tour : la pioche se fait à l’ouverture du tour, puis on entre en phase principale', () => {
  const duel = duelDeBase();
  assert.equal(duel.phase, 'principale', 'la partie s’ouvre en phase principale');
  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'sorcier');
  assert.equal(duel.phase, 'principale', 'le tour du sorcier s’ouvre aussi en phase principale');
  const main = duel.joueur.main.length;
  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'joueur');
  assert.equal(duel.joueur.main.length, main + 1, 'une carte piochée au début du tour');
  assert.equal(duel.phase, 'principale');
});

test('fin de tour : l’adversaire peut jouer une magie rapide, pas une sorcellerie', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  donnerMana(duel, 'sorcier', 10);
  donner(duel, 'sorcier', 'trait-de-braise');
  donner(duel, 'sorcier', 'lame-de-mer');

  assert.equal(rpgLancerMagie(duel, 'sorcier', 'trait-de-braise', chien.id).raison, 'timing',
    'hors fenêtre, le sorcier ne joue rien pendant le tour du joueur');
  assert.equal(rpgPeutRepondre(duel, 'sorcier'), true, 'il a une magie rapide payable en main');

  assert.deepEqual(rpgOuvrirFinDeTour(duel), { cote: 'joueur' });
  assert.equal(duel.phase, 'fin');
  assert.equal(rpgLancerMagie(duel, 'sorcier', 'lame-de-mer', chien.id).raison, 'timing',
    'une sorcellerie ne se joue pas en réponse');
  assert.equal(rpgLancerMagie(duel, 'sorcier', 'trait-de-braise', chien.id).ok, true,
    'une magie rapide, si');
  assert.equal(duel.joueur.creatures.includes(chien), false, 'le Trait de braise a touché sa cible');

  rpgFinDeTour(duel);
  assert.equal(duel.finDeTour, null, 'la fenêtre se referme avec le tour');
  assert.equal(duel.fenetreReponse, false);
  assert.equal(duel.tour, 'sorcier');
});

test('fin de tour : le Rempart de dunes tient encore pendant la réponse adverse, et tombe ensuite', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  donner(duel, 'joueur', 'rempart-de-dunes');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'rempart-de-dunes').ok, true);
  assert.equal(chien.def, 5);

  rpgOuvrirFinDeTour(duel);
  assert.equal(chien.def, 5, 'ouvrir la fin de tour n’efface rien : la réponse adverse subit encore le rempart');
  donnerMana(duel, 'sorcier', 10);
  donner(duel, 'sorcier', 'trait-de-braise');
  assert.equal(rpgLancerMagie(duel, 'sorcier', 'trait-de-braise', chien.id).ok, true);
  assert.equal(duel.joueur.creatures.includes(chien), true, '3 dégâts contre 5 de défense : le chien survit');

  assert.equal(chien.def, 2, 'il a pourtant encaissé les 3 dégâts');
  rpgFinDeTour(duel);
  assert.equal(duel.joueur.creatures.includes(chien), false,
    'le rempart disparaît seulement à la fermeture du tour — et emporte la créature entamée');
});

test('fenêtre de fin de tour : le sorcier IA joue sa magie rapide, et jamais un contre', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'dune-marchante');
  const dune = rpgJouerCreature(duel, 'joueur', 'dune-marchante').entite;
  duel.sorcier.main = ['silence-decume'];
  donnerMana(duel, 'sorcier', 10);
  assert.equal(rpgPeutRepondre(duel, 'sorcier'), false, 'un contre seul n’a rien à contrer en fin de tour');
  rpgOuvrirFinDeTour(duel);
  assert.equal(rpgSorcierMagieRapide(duel), null);

  duel.sorcier.main = ['trait-de-braise'];
  const res = rpgSorcierMagieRapide(duel);
  assert.equal(res?.ok, true);
  assert.equal(res.carteId, 'trait-de-braise');
  assert.equal(res.cibleId, dune.id,
    'la cible revient avec le résultat : la fiche du sorcier dit ce que le sort a frappé');
  assert.ok(duel.sorcier.cimetiere.includes('trait-de-braise'));
  assert.ok(dune.pv < dune.pvMax || !duel.joueur.creatures.includes(dune), 'la magie a frappé');
});

test('phase de blocage : les deux camps jouent des magies rapides avant les blessures', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'chien-du-guet');
  const attaquant = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  attaquant.ready = true;
  donnerMana(duel, 'sorcier', 10);
  donner(duel, 'sorcier', 'trait-de-braise');

  assert.equal(rpgOuvrirFenetreReponse(duel, 'joueur'), true);
  const res = rpgSorcierMagieRapide(duel);
  assert.equal(res?.ok, true, 'le sorcier répond pendant le blocage');
  assert.equal(duel.joueur.creatures.includes(attaquant), false, 'l’attaquant est abattu avant le combat');
});

// Régression : Poigne de givre pendant la réponse à une attaque déclarée.
for (const cote of ['joueur', 'sorcier']) {
  for (const nombreBloqueurs of [0, 1, 2]) {
    test(`gel en réponse : combat de ${cote}, ${nombreBloqueurs} bloqueur(s), sans blocage du jeu`, () => {
      const duel = duelDeBase();
      const adv = cote === 'joueur' ? 'sorcier' : 'joueur';
      donnerMana(duel, cote, 20);
      donnerMana(duel, adv, 20);
      donner(duel, cote, 'colosse-de-sel');
      const attaquant = rpgJouerCreature(duel, cote, 'colosse-de-sel').entite;
      attaquant.ready = true;
      const bloqueurs = Array.from({ length: nombreBloqueurs }, () => {
        donner(duel, adv, 'chien-du-guet');
        return rpgJouerCreature(duel, adv, 'chien-du-guet').entite;
      });
      duel.tour = cote;
      rpgOuvrirFenetreReponse(duel, cote);
      donner(duel, adv, 'poigne-de-givre');
      assert.equal(rpgLancerMagie(duel, adv, 'poigne-de-givre', attaquant.id).ok, true);
      const pvAvant = duel[adv].pv;
      const res = rpgLancerAttaque(duel, cote, [attaquant.id],
        { [attaquant.id]: bloqueurs.map((e) => e.id) }, null, null, {}, { attaqueDeclaree: true });
      assert.equal(res.ok, true);
      assert.equal(res.resume.frappeSorcier, 0);
      assert.equal(duel[adv].pv, pvAvant);
      for (const bloqueur of bloqueurs) assert.equal(bloqueur.pv, bloqueur.pvMax);
      assert.equal(duel.attaqueJouee, cote);
      assert.equal(duel.phase, 'principale2', 'la partie peut continuer après le combat');
      assert.equal(attaquant.attaquee, true);
      assert.ok(attaquant.gelToursRestants > 0);
    });
  }
}

test('gel en réponse : les autres attaquants infligent encore leurs blessures', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'sorcier', 20);
  donnerMana(duel, 'joueur', 20);
  const attaquants = ['colosse-de-sel', 'chien-du-guet'].map((id) => {
    donner(duel, 'sorcier', id);
    const entite = rpgJouerCreature(duel, 'sorcier', id).entite;
    entite.ready = true;
    return entite;
  });
  duel.tour = 'sorcier';
  rpgOuvrirFenetreReponse(duel, 'sorcier');
  donner(duel, 'joueur', 'poigne-de-givre');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'poigne-de-givre', attaquants[0].id).ok, true);
  const res = rpgLancerAttaque(duel, 'sorcier', attaquants.map((e) => e.id), {},
    null, null, {}, { attaqueDeclaree: true });
  assert.equal(res.ok, true);
  assert.equal(res.resume.frappeSorcier, attaquants[1].atk);
});

test('gel en réponse : le Coup rapide ne blesse plus sa cible', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'sorcier', 20);
  donnerMana(duel, 'joueur', 20);
  donner(duel, 'sorcier', 'colosse-de-sel');
  const attaquant = rpgJouerCreature(duel, 'sorcier', 'colosse-de-sel').entite;
  attaquant.ready = true;
  attaquant.coupRapide = true;
  donner(duel, 'joueur', 'chien-du-guet');
  const cible = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  duel.tour = 'sorcier';
  rpgOuvrirFenetreReponse(duel, 'sorcier');
  donner(duel, 'joueur', 'poigne-de-givre');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'poigne-de-givre', attaquant.id).ok, true);
  const res = rpgLancerAttaque(duel, 'sorcier', [attaquant.id], {}, null, null,
    { [attaquant.id]: cible.id }, { attaqueDeclaree: true });
  assert.equal(res.ok, true);
  assert.equal(res.resume.coupsRapides[0].degats, 0);
  assert.equal(cible.pv, cible.pvMax);
  assert.equal(res.resume.frappeSorcier, 0);
});


test('gel : animation, état persistant, accessibilité et résolution dans les deux camps', () => {
  const battlePage = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  const battleCss = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
  // Le gel est lisible dans les deux camps, sans intercepter les clics de cible.
  assert.match(battlePage, /gelee && <span className="rpg-card__frost" aria-hidden="true">/);
  assert.match(battlePage, /gelee \? 'is-frozen'/);
  assert.match(battlePage, /gelée : ne peut ni attaquer ni bloquer/);
  assert.match(battleCss, /\.rpg-card__frost\s*\{[^}]*pointer-events:\s*none;[^}]*animation:\s*rpg-freeze-spread/s);
  assert.match(battleCss, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.rpg-card__frost, \.rpg-card__frost-crystals \{ animation: none;/);
  assert.equal((battlePage.match(/attaqueDeclaree: true,/g) ?? []).length, 2,
    'les deux camps résolvent une attaque déjà déclarée malgré un gel en réponse');
});

test('Coup rapide raté : affiche un texte « MISS » façon RPG au-dessus de la carte qui attaque', () => {
  const battlePage = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  const battleCss = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
  assert.match(battlePage, /className="rpg-card__miss" aria-hidden="true">\s*MISS\s*<\/span>/);
  assert.match(battlePage, /miss \? 'is-miss' : ''/);
  assert.match(battlePage, /data-miss=\{miss \? 'true' : undefined\}/);
  assert.equal((battlePage.match(/declencherMissEntites\(attaquantsRates\)/g) ?? []).length, 2,
    'le MISS est déclenché pour les attaquants des deux camps');
  assert.match(battleCss, /\.rpg-card\.is-miss\s*\{[^}]*overflow:\s*visible/s);
  assert.match(battleCss, /\.rpg-card__miss\s*\{[^}]*bottom:\s*calc\(100%\s*\+\s*6px\)[^}]*animation:\s*rpg-card-miss-pop/s);
});

