/**
 * Malédiction — la nouvelle règle de La Barbe Noire (Lettres de Marque).
 *
 * Les Deux Visages ont disparu : plus d'`alternance`, plus de pastille, plus de
 * compteur 🎭 sur la table. À la place, un effet de présence qui donne **-2/-0
 * à TOUTES les créatures du camp adverse** — sans aucune adjacence (contrairement
 * à l'Aura), recalculé à chaque changement de la table. Voir `rpgDuel.js`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  rpgBlesserCreature,
  rpgEmplacementsChamp,
  rpgFinDeTour,
  rpgJouerCreature,
  rpgNouveauDuel,
} from '../src/games/rpgDuel.js';
import { RPG_ELEMENTS, cardById } from '../src/games/rpgCards.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import {
  EFFET_DEFINITIONS,
  EFFET_ICONE,
  EFFETS_SPRITE,
  MOTS_CLES_PASTILLES,
  iconePourLigne,
  pastillesPourCarte,
} from '../src/games/effetIcons.js';
import { puissanceCarte } from '../src/games/rpgCardPower.js';

const duelCases = () => rpgNouveauDuel({
  joueurDeck: [], sorcierDeck: [], rng: () => 0.5,
  joueurCouleurs: ['tenebres'], sorcierCouleurs: ['tenebres'],
  modeMana: RPG_MODE_MANA_ESSAI,
});
const manaPlein = (duel, cote) => {
  duel[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((couleur) => [couleur, 20]));
  // Le duel d'essai attend le choix du premier mana : neutralisé pour isoler
  // la règle, comme dans les tests du mode lui-même.
  duel[cote].manaChoixEnAttente = false;
};
/** Pose une carte ; `emplacement` choisit sa case (mode sans terrains). */
const poser = (duel, cote, carteId, emplacement = null) => {
  manaPlein(duel, cote);
  duel[cote].main.push(carteId);
  const res = rpgJouerCreature(duel, cote, carteId, null, { emplacement });
  assert.equal(res.ok, true, `${carteId} entre en jeu`);
  return res.entite;
};
const libelles = () => pastillesPourCarte(cardById('la-barbe-noire'))
  .map((pastille) => (pastille.valeur != null ? `${pastille.label} ${pastille.valeur}` : pastille.label));

test('La Barbe Noire est un 4/5 fixe qui imprime Malédiction -2/-0', () => {
  const noire = cardById('la-barbe-noire');
  assert.deepEqual([noire.cost, noire.atk, noire.def], [5, 4, 5]);
  assert.equal(noire.provocation, true, 'elle garde le rempart');
  assert.equal(noire.abordage, 4, 'et son Abordage 4');
  assert.equal(noire.insaisissable, true, 'et le dédoublement');
  assert.equal(noire.alternance, undefined, 'les Deux Visages ont quitté la fiche');
  assert.deepEqual(noire.malediction, { atk: 2, def: 0 });
  assert.match(noire.name, /malédiction/i, 'le nom ne parle plus des deux visages');
  assert.match(noire.text, /Malédiction — tant que La Barbe Noire est en jeu, toutes les créatures adverses gagnent -2\/-0/);
  assert.doesNotMatch(noire.text, /Deux Visages|change de visage|l’homme|la légende/,
    'plus aucune trace de l’ancien effet');
});

test('le mot-clé Malédiction remplace Deux Visages dans les pastilles et le glossaire', () => {
  const noire = cardById('la-barbe-noire');
  assert.deepEqual(libelles(), ['Provocation', 'Abordage 4', 'Malédiction']);
  assert.equal(iconePourLigne(noire,
    'Malédiction — tant que La Barbe Noire est en jeu, toutes les créatures adverses gagnent -2/-0.'),
    'malediction');
  assert.match(EFFET_DEFINITIONS.malediction(), /créatures du camp adverse/);
  assert.match(EFFET_DEFINITIONS.malediction(), /aucune adjacence/i);
  assert.equal(EFFET_ICONE.malediction, 'i-malediction');
  assert.equal(EFFET_ICONE.visages, undefined, 'l’ancienne icône n’est plus référencée');
  assert.ok(MOTS_CLES_PASTILLES.includes('malediction'));
  assert.equal(MOTS_CLES_PASTILLES.includes('visages'), false);
  assert.ok(EFFETS_SPRITE.includes('id="i-malediction"'));
  assert.equal(EFFETS_SPRITE.includes('id="i-visages"'), false);
  assert.ok(puissanceCarte(noire) > puissanceCarte({ ...noire, malediction: null }),
    'la Malédiction compte dans la valeur de la carte');
});

test('la Malédiction ignore les cases vides : tout le camp adverse est touché', () => {
  const duel = duelCases();
  // Deux créatures adverses aux deux bouts de la rangée, trois cases vides
  // entre elles — l'Aura ne les verrait pas, la Malédiction si.
  const gauche = poser(duel, 'sorcier', 'faucon-du-zenith', 0);
  const droite = poser(duel, 'sorcier', 'anqa-des-braises', 4);
  const atkGauche = gauche.atk;
  const atkDroite = droite.atk;
  assert.equal(rpgEmplacementsChamp(duel.sorcier)[2], null, 'le milieu est bien vide');
  // Un témoin allié : son camp doit rester intact.
  const mien = poser(duel, 'joueur', 'chien-du-guet', 0);
  const atkMien = mien.atk;
  const noire = poser(duel, 'joueur', 'la-barbe-noire', 2);
  assert.equal(noire.enCale, null, 'coût 5 : personne n’est pris par l’Abordage 4');
  assert.equal(gauche.atk, atkGauche - 2, 'la créature de la case 0 est maudite');
  assert.equal(droite.atk, atkDroite - 2, 'celle de la case 4 aussi, malgré la distance');
  assert.equal(mien.atk, atkMien, 'le camp de la source est épargné');
  assert.equal(noire.atk, 4, 'la source ne se maudit pas elle-même');
  assert.ok(duel.log.some((ligne) => ligne.startsWith('Malédiction :')),
    'le journal annonce le malus');
});

test('une arrivée après la source est maudite ; la mort de la source lève tout', () => {
  const duel = duelCases();
  const ancien = poser(duel, 'sorcier', 'faucon-du-zenith', 0);
  const noire = poser(duel, 'joueur', 'la-barbe-noire', 0);
  assert.equal(ancien.atk, 1, '3/3 → 1/3');
  const nouveau = poser(duel, 'sorcier', 'ifrit-des-ergs', 4);
  assert.equal(nouveau.atk, 3, '5/3 → 3/3 : l’arrivée est maudite dès la pose');
  // Un petit corps : le plancher de 0 est respecté, la défense ne bouge pas.
  const petit = poser(duel, 'sorcier', 'tercio-de-cuivre', 2);
  assert.deepEqual([petit.atk, petit.def, petit.pv], [0, 4, 4], '-2/-0 ne tue jamais');
  assert.ok(duel.sorcier.creatures.includes(petit));

  assert.equal(rpgBlesserCreature(duel, 'joueur', noire.id, 100, 'braise').ok, true);
  assert.equal(ancien.atk, 3, 'l’ancien retrouve son attaque');
  assert.equal(nouveau.atk, 5, 'le nouveau aussi');
  assert.equal(petit.atk, 1, 'et le petit corps remonte à 1');
  assert.ok(duel.log.some((ligne) => ligne.startsWith('La Malédiction se lève')));
});

test('deux sources cumulent ; en retirer une ne rend que son malus', () => {
  const duel = duelCases();
  const adverse = poser(duel, 'sorcier', 'faucon-du-zenith', 0);
  const premiere = poser(duel, 'joueur', 'la-barbe-noire', 0);
  assert.equal(adverse.atk, 1, 'une source : -2');
  const seconde = poser(duel, 'joueur', 'la-barbe-noire', 4);
  assert.equal(adverse.atk, 0, 'deux sources : -4, plancher à 0');
  assert.equal(premiere.atk, 4, 'les deux sources restent intactes dans leur camp');
  assert.equal(seconde.atk, 4);
  assert.equal(rpgBlesserCreature(duel, 'joueur', premiere.id, 100, 'braise').ok, true);
  assert.equal(adverse.atk, 1, 'il reste la Malédiction de la seconde');
  // Le malus est un écart mémorisé : un nouveau rafraîchissement ne l'empile pas.
  rpgFinDeTour(duel);
  assert.equal(adverse.atk, 1, 'aucune dérive au tour suivant');
  assert.equal(seconde.atk, 4, 'la fin de tour ne change plus les visages');
  assert.ok(!duel.log.some((ligne) => ligne.includes('change de visage')));
});
