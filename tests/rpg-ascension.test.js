import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  RPG_ASCENSION_CARDS, RPG_DUEL_CARDS, RPG_DECK_SOLEIL_ROUGE_BASE,
  cardById, carteJouableSansTerrain, duelCardById, rpgValiderDeck,
} from '../src/games/rpgCards.js';
import {
  ajouterCarteEnMainOuReserve, ascensionDisponible, combinaisonsAscension,
  coutImprimeAscension, reserveAscensionInitiale, timingAscensionValide, validerMateriauxAscension,
} from '../src/games/rpgAscension.js';
import {
  rpgActionsEtat, rpgBlesserCreature, rpgJouerCreature, rpgLancerAttaque, rpgLancerMagie,
  rpgPeutAttaquer, rpgReglerHasard,
  rpgNouveauDuel, rpgSorcierAnnonceSuivante, rpgSorcierResoudreAnnonce,
} from '../src/games/rpgDuel.js';
import { cardArt } from '../src/games/rpgCardArt.js';
import { effetsDetailles } from '../src/games/effetIcons.js';
import { rpgMobaCiblesIndividuelles } from '../src/games/rpgMobaAttaqueIndividuelle.js';
import { invocationPossible, sacrificesInvocation } from '../src/games/rpgInvocation.js';
import { choisirCarteIA, rpgCombinaisonsSacrificesIA } from '../src/games/rpgAI.js';
import { RPG_MODE_MANA_ESSAI, validerDeckManaEssai } from '../src/games/rpgManaEssai.js';
import {
  MOBA_CARTES_AUTORISEES, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle,
  rpgMobaJouerCreature, rpgMobaNouveauDuel,
  rpgMobaPasserCreature, rpgMobaPlacementCoherent, rpgMobaValiderDeck,
} from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirCreatureIA } from '../src/games/rpgMobaAI.js';
import { rpgPvpAppliquer, rpgPvpVue } from '../src/games/rpgPvp.js';

const DRAGON = 'samourai-du-dragon-rouge';
const fiche = cardById(DRAGON);
const deck = () => Array(20).fill('ashigaru-des-braises');
const nouveau = (options = {}) => {
  const duel = rpgNouveauDuel({ joueurDeck: deck(), sorcierDeck: deck(), rng: () => .5, joueurReserveAscension: [DRAGON], sorcierReserveAscension: [DRAGON], ...options });
  duel.mulliganFait = { joueur: true, sorcier: true };
  if (duel.modeMana) duel.manaEssaiDemarre = true;
  return duel;
};
const poser = (duel, id, cote = 'joueur') => {
  const tour = duel.tour;
  duel.tour = cote;
  duel[cote].invocationNormaleJouee = false;
  duel[cote].main.push(id);
  const res = rpgJouerCreature(duel, cote, id);
  duel.tour = tour;
  assert.ok(res.ok, res.raison);
  return res.entite;
};
const paire = (duel, cote = 'joueur') => ['ronin-du-soleil-rouge', 'onna-musha-des-cendres'].map((id) => poser(duel, id, cote));
const invoquer = (duel, victimes, options = {}) => rpgJouerCreature(duel, 'joueur', DRAGON, null, { sacrificeIds: victimes.map((e) => e.id), ...options });
const sansMutation = (duel, action) => {
  const avant = JSON.stringify(duel);
  const res = action();
  assert.equal(res.ok, false);
  assert.equal(JSON.stringify(duel), avant, `refus atomique : ${res.raison}`);
  return res;
};
const nouveauMoba = () => {
  const duel = rpgMobaNouveauDuel({ joueurDeck: deck(), sorcierDeck: deck(), rng: () => .5, joueurReserveAscension: [DRAGON], sorcierReserveAscension: [DRAGON] });
  duel.mulliganFait = { joueur: true, sorcier: true };
  duel.manaEssaiDemarre = true;
  return duel;
};
const poserMoba = (duel, id, voie, slot, side = 'joueur') => {
  const tour = duel.tour; duel.tour = side;
  duel.moba.creaturesJouees[side] = false;
  duel[side].main.push(id);
  const res = rpgMobaJouerCreature(duel, side, id, voie, slot);
  duel.tour = tour;
  assert.ok(res.ok, res.raison);
  return res.entite;
};
const paireMoba = (duel) => [poserMoba(duel, 'ronin-du-soleil-rouge', 'left', 0), poserMoba(duel, 'onna-musha-des-cendres', 'right', 1)];

test('Ascension : un Dragon Samouraï 7/7 avec Overkill, Esquive et Défenseur, hors pioche', () => {
  assert.equal(RPG_ASCENSION_CARDS.length, 4);
  assert.equal(duelCardById(DRAGON), fiche);
  assert.equal(fiche.atk, 7); assert.equal(fiche.def, 7); assert.equal(fiche.overkill, true);
  assert.equal(fiche.esquive, true); assert.equal(fiche.defenseur, true);
  assert.equal(fiche.typeLine, 'Créature d’Ascension — Dragon · Samouraï');
  assert.deepEqual(fiche.ascension, { nombre: 2, type: 'samourai', typeLabel: 'Samouraï', coutTotal: 7 });
  assert.equal(RPG_DUEL_CARDS.some((c) => c.id === DRAGON), false);
  assert.equal(carteJouableSansTerrain(fiche), false);
  assert.equal(MOBA_CARTES_AUTORISEES.includes(DRAGON), false);
});

test('Dragon : la fiche expose les trois capacités et la nouvelle illustration casse le cache', () => {
  const { pastilles } = effetsDetailles(fiche);
  for (const cle of ['overkill', 'esquive', 'defenseur']) {
    assert.ok(pastilles.some((p) => p.cle === cle), cle);
  }
  assert.match(pastilles.find((p) => p.cle === 'esquive').description, /15 %/);
  assert.match(pastilles.find((p) => p.cle === 'defenseur').description, /priorité/);
  assert.match(cardArt(DRAGON), /samourai-du-dragon-rouge\.jpg\?v=ascension-dragon-humanoide-v2$/);
  const jpeg = readFileSync(new URL('../public/cards/samourai-du-dragon-rouge.jpg', import.meta.url));
  assert.ok(jpeg.length < 260 * 1024, 'illustration optimisée sous le plafond du projet');
  assert.deepEqual([...jpeg.subarray(0, 2)], [0xff, 0xd8], 'fichier JPEG réel');
});

for (const sourceType of ['attaque', 'magie', 'capacite']) test(`Dragon : Esquive à 15 % face à ${sourceType}`, () => {
  for (const [jet, esquive] of [[.14999, true], [.15, false]]) {
    const duel = nouveau();
    const res = invoquer(duel, paire(duel)); assert.ok(res.ok, res.raison);
    const dragon = res.entite;
    let jets = 0;
    rpgReglerHasard(duel, () => { jets += 1; return jet; });
    const coup = rpgBlesserCreature(duel, 'joueur', dragon.id, 2, 'sable', null, sourceType, null, null, 'sorcier');
    assert.equal(coup.ok, true); assert.equal(coup.esquive, esquive);
    assert.equal(coup.recus, esquive ? 0 : 2); assert.equal(dragon.pv, esquive ? 7 : 5);
    assert.equal(jets, 1, 'un seul jet par effet');
  }
});

test('Dragon : Esquive ne refuse pas une capacité alliée', () => {
  const duel = nouveau(); const res = invoquer(duel, paire(duel)); assert.ok(res.ok, res.raison);
  let jets = 0;
  rpgReglerHasard(duel, () => { jets += 1; return 0; });
  const coup = rpgBlesserCreature(duel, 'joueur', res.entite.id, 2, 'braise', null, 'capacite', null, null, 'joueur');
  assert.equal(coup.esquive, false); assert.equal(res.entite.pv, 5); assert.equal(jets, 0);
});

test('Dragon : Défenseur protège réellement un allié des Attaques ciblées en Duel', () => {
  const duel = nouveau(); const victimes = paire(duel);
  const allie = poser(duel, 'ashigaru-des-braises');
  const res = invoquer(duel, victimes); assert.ok(res.ok, res.raison);
  const attaquant = poser(duel, 'feriel', 'sorcier'); duel.tour = 'sorcier';
  const attaquer = (cible) => rpgLancerAttaque(duel, 'sorcier', [attaquant.id], null, null, null, { [attaquant.id]: cible });
  assert.equal(sansMutation(duel, () => attaquer(allie.id)).raison, 'defenseur');
  assert.ok(attaquer(res.entite.id).ok);
  assert.equal(res.entite.pv, 4, 'le Dragon encaisse la frappe de 3');
  assert.equal(allie.pv, 1, 'l’allié est protégé');
});

for (const voie of ['right', 'left']) test(`Dragon MOBA : Défenseur respecte les priorités depuis ${voie}`, () => {
  const duel = nouveauMoba(); const victimes = paireMoba(duel);
  const allie = poserMoba(duel, 'ashigaru-des-braises', 'right', 0);
  const res = rpgMobaJouerCreature(duel, 'joueur', DRAGON, 'right', 1, { sacrificeIds: victimes.map((e) => e.id) });
  assert.ok(res.ok, res.raison);
  const dragon = res.entite;
  assert.equal(dragon.defenseur, true); assert.equal(dragon.esquiveChance, .15);
  assert.equal(dragon.overkill, true); assert.equal(dragon.atk, 7); assert.equal(dragon.pv, 7);
  const attaquant = poserMoba(duel, 'feriel', voie, 0, 'sorcier'); duel.tour = 'sorcier';
  const choix = rpgMobaCiblesIndividuelles(duel, 'sorcier', attaquant.id);
  if (voie === 'right') {
    assert.deepEqual(choix, { cibles: [dragon.id], directe: false });
    assert.equal(sansMutation(duel, () => rpgMobaDeclarerAttaqueIndividuelle(duel, 'sorcier', attaquant.id, allie.id)).raison, 'cible');
    assert.ok(rpgMobaDeclarerAttaqueIndividuelle(duel, 'sorcier', attaquant.id, dragon.id).ok);
  } else {
    assert.equal(choix.directe, true, 'pas de Défenseur global depuis l’autre voie');
    assert.ok(choix.cibles.includes(allie.id));
    assert.ok(rpgMobaDeclarerAttaqueIndividuelle(duel, 'sorcier', attaquant.id, null).ok);
  }
  assert.ok(rpgMobaResoudreAttaqueIndividuelle(duel, 'sorcier').ok);
  assert.equal(dragon.pv, voie === 'right' ? 4 : 7);
  assert.equal(allie.pv, 1); assert.ok(rpgMobaPlacementCoherent(duel));
});

test('chaque camp commence avec une réserve indépendante, sérialisable, jamais piochée', () => {
  const duel = nouveau({ joueurDeck: [DRAGON, ...deck()] });
  assert.deepEqual(duel.joueur.reserveAscension, [DRAGON]);
  assert.deepEqual(duel.sorcier.reserveAscension, [DRAGON]);
  assert.notEqual(duel.joueur.reserveAscension, duel.sorcier.reserveAscension);
  assert.ok(!duel.joueur.main.includes(DRAGON) && !duel.joueur.deck.includes(DRAGON));
  assert.deepEqual(JSON.parse(JSON.stringify(duel)).joueur.reserveAscension, [DRAGON]);
  assert.deepEqual(reserveAscensionInitiale([DRAGON, DRAGON, 'chien-du-guet', 'inconnue']), [DRAGON]);
  assert.deepEqual(nouveau({ joueurReserveAscension: [] }).joueur.reserveAscension, []);
});

test('aucun constructeur de paquet classique, mana-essai ou MOBA n’accepte une Ascension', () => {
  const ids = [...RPG_DECK_SOLEIL_ROUGE_BASE]; ids[0] = DRAGON;
  assert.equal(rpgValiderDeck(ids).ok, false);
  const paquet = { cardIds: ids, elements: ['braise', 'sable'] };
  assert.equal(validerDeckManaEssai(paquet).ok, false);
  assert.equal(rpgMobaValiderDeck(paquet).ok, false);
});

test('3 + 4 Samouraïs : sacrifices, entrée depuis la réserve, effets de mort conservés', () => {
  const duel = nouveau(); const victimes = paire(duel);
  const mana = JSON.stringify(duel.joueur.mana); const main = [...duel.joueur.main];
  assert.equal(ascensionDisponible(duel, 'joueur', DRAGON), true);
  const res = invoquer(duel, victimes);
  assert.ok(res.ok, res.raison); assert.equal(res.entite.carteId, DRAGON);
  assert.equal(res.entite.atk, 7); assert.equal(res.entite.pv, 7);
  assert.equal(res.entite.overkill, true); assert.equal(res.entite.esquive, true);
  assert.equal(res.entite.esquiveChance, .15); assert.equal(res.entite.defenseur, true);
  assert.equal(res.entite.mur, false); assert.equal(res.entite.nePeutPasAttaquer, false);
  assert.equal(rpgPeutAttaquer({ ...res.entite, malInvocation: false }), true, 'Défenseur n’est pas un Mur et n’interdit pas d’attaquer');
  assert.deepEqual(res.sacrificeIds, victimes.map((e) => e.id));
  assert.deepEqual(duel.joueur.reserveAscension, []);
  assert.deepEqual(duel.joueur.cimetiere, victimes.map((e) => e.carteId));
  assert.equal(duel.joueur.creatures.length, 1);
  assert.deepEqual(duel.joueur.main, main);
  assert.equal(JSON.stringify(duel.joueur.mana), mana);
  assert.equal(duel.sorcier.pv, 23, 'les deux Harakiri se déclenchent');
});

for (const quota of [false, true]) test(`une Ascension ne change pas le quota normal (${quota})`, () => {
  const duel = nouveau(); const victimes = paire(duel);
  duel.joueur.invocationNormaleJouee = quota;
  assert.ok(invoquer(duel, victimes).ok);
  assert.equal(duel.joueur.invocationNormaleJouee, quota);
  if (!quota) {
    duel.joueur.main.push('ashigaru-des-braises');
    assert.ok(rpgJouerCreature(duel, 'joueur', 'ashigaru-des-braises').ok, 'invocation normale encore disponible');
  }
});

test('le coût vient de l’imprimé, pas des buffs, de l’arme ou d’un champ cost forgé', () => {
  const duel = nouveau(); const victimes = paire(duel);
  Object.assign(victimes[0], { cost: 100, atk: 30, def: 30, coutBonusArme: 12 });
  assert.equal(coutImprimeAscension(victimes[0]), 3);
  assert.ok(invoquer(duel, victimes).ok);
});

for (const [libelle, transformer] of [
  ['un seul sacrifice', (d, v) => [v[0].id]],
  ['trois sacrifices', (d, v) => [...v.map((e) => e.id), poser(d, 'ashigaru-des-braises').id]],
  ['le même corps deux fois', (d, v) => [v[0].id, v[0].id]],
  ['une présence inexistante', (d, v) => [v[0].id, 'presence-absente']],
  ['une créature adverse', (d, v) => [v[0].id, poser(d, 'onna-musha-des-cendres', 'sorcier').id]],
]) test(`${libelle} : refus sans aucun sacrifice ni perte de carte`, () => {
  const duel = nouveau(); const victimes = paire(duel); const ids = transformer(duel, victimes);
  sansMutation(duel, () => rpgJouerCreature(duel, 'joueur', DRAGON, null, { sacrificeIds: ids }));
});

for (const [ids, raison] of [
  [['ronin-du-soleil-rouge', 'kenshi-de-la-forge'], 'ascension-cout'],
  [['onna-musha-des-cendres', 'onna-musha-des-cendres'], 'ascension-cout'],
  [['ronin-du-soleil-rouge', 'tengu-du-mont-ardent'], 'ascension-type'],
]) test(`${ids.join(' + ')} : le type et le total doivent être exacts`, () => {
  const duel = nouveau(); const victimes = ids.map((id) => poser(duel, id));
  assert.equal(invocationPossible(duel, 'joueur', fiche), false);
  assert.equal(sansMutation(duel, () => invoquer(duel, victimes)).raison, raison);
});

test('deux copies distinctes sont légales ; une sélection partielle garde seulement les recettes exactes', () => {
  const duel = nouveau(); const a = poser(duel, 'ronin-du-soleil-rouge'); const b = poser(duel, 'ronin-du-soleil-rouge');
  const c = poser(duel, 'onna-musha-des-cendres');
  const variante = { ...fiche, ascension: { ...fiche.ascension, coutTotal: 6 } };
  assert.ok(validerMateriauxAscension(duel.joueur, variante, [a.id, b.id]).ok);
  assert.deepEqual(combinaisonsAscension(duel.joueur, fiche, [a.id]).map((g) => g.map((e) => e.id)), [[a.id, c.id]]);
  for (const groupe of rpgCombinaisonsSacrificesIA(duel, 'joueur', fiche)) assert.ok(validerMateriauxAscension(duel.joueur, fiche, groupe.map((e) => e.id)).ok);
  assert.equal(sacrificesInvocation(fiche, duel, 'joueur', true), 2, 'une Embuscade ne supprime jamais la recette');
});

for (const [libelle, changer] of [
  ['tour adverse', (d) => { d.tour = 'sorcier'; }],
  ['phase d’attaque', (d) => { d.phase = 'attaque'; }],
  ['réponse en cours', (d) => { d.fenetreReponse = true; }],
  ['mulligan non terminé', (d) => { d.mulliganFait.joueur = false; }],
  ['effet de mort en attente', (d) => { d.destructionsEnAttente = [{ cote: 'joueur' }]; }],
  ['partie terminée', (d) => { d.fin = { gagnant: 'sorcier' }; }],
]) test(`pas d’Ascension pendant : ${libelle}`, () => {
  const duel = nouveau(); const victimes = paire(duel); changer(duel);
  assert.equal(timingAscensionValide(duel, 'joueur'), false);
  assert.equal(sansMutation(duel, () => invoquer(duel, victimes)).raison, 'ascension-timing');
});

test('aucune carte de réserve ne peut être réinvoquée sans y être encore présente', () => {
  const duel = nouveau(); const victimes = paire(duel); duel.joueur.reserveAscension = [];
  duel.joueur.main.push(DRAGON); // une main forgée ne permet pas de contourner la zone.
  assert.equal(sansMutation(duel, () => invoquer(duel, victimes)).raison, 'pas-en-reserve');
});

test('cinq cases pleines : l’Ascension utilise une place libérée et les autres corps restent en jeu', () => {
  const duel = nouveau({ modeMana: RPG_MODE_MANA_ESSAI }); const victimes = paire(duel);
  const autres = Array.from({ length: 3 }, () => poser(duel, 'ashigaru-des-braises'));
  const place = victimes[0].emplacement;
  assert.ok(invoquer(duel, victimes, { emplacement: place }).ok);
  assert.equal(duel.joueur.creatures.length, 4);
  assert.ok(autres.every((e) => duel.joueur.creatures.includes(e)));
  assert.equal(duel.joueur.creatures.find((e) => e.carteId === DRAGON).emplacement, place);
});

test('un renvoi rend l’Ascension à la réserve, une mort la laisse au cimetière', () => {
  const duel = nouveau(); let res = invoquer(duel, paire(duel)); assert.ok(res.ok);
  duel.tour = 'sorcier'; duel.sorcier.main.push('courant-de-retour');
  assert.ok(rpgLancerMagie(duel, 'sorcier', 'courant-de-retour', res.entite.id).ok);
  assert.deepEqual(duel.joueur.reserveAscension, [DRAGON]); assert.equal(duel.joueur.main.includes(DRAGON), false);
  duel.tour = 'joueur'; res = invoquer(duel, paire(duel)); assert.ok(res.ok);
  rpgBlesserCreature(duel, 'joueur', res.entite.id, 20); rpgActionsEtat(duel);
  assert.deepEqual(duel.joueur.reserveAscension, []);
  assert.ok(duel.joueur.cimetiere.includes(DRAGON));
  const camp = { main: [], reserveAscension: [] };
  assert.equal(ajouterCarteEnMainOuReserve(camp, DRAGON), 'reserveAscension');
  assert.deepEqual(camp.main, []);
});

test('un contre retire la carte de la réserve, jamais une autre carte de la main', () => {
  const duel = nouveau(); paire(duel, 'sorcier'); duel.tour = 'sorcier';
  duel.annonce = { cote: 'sorcier', carteId: DRAGON }; duel.fenetreReponse = true;
  duel.joueur.main.push('ecueil'); const mainAdverse = [...duel.sorcier.main];
  const res = rpgLancerMagie(duel, 'joueur', 'ecueil'); assert.ok(res.ok, res.raison);
  assert.deepEqual(duel.sorcier.reserveAscension, []); assert.ok(duel.sorcier.cimetiere.includes(DRAGON));
  assert.deepEqual(duel.sorcier.main, mainAdverse); assert.equal(duel.sorcier.creatures.length, 2);
});

test('MOBA : sacrifice entre deux voies, place réutilisée, aucun quota normal ou Embuscade consommé', () => {
  const duel = nouveauMoba(); const victimes = paireMoba(duel);
  duel.moba.creaturesJouees.joueur = true; duel.moba.embuscadesJouees.joueur = false;
  const res = rpgMobaJouerCreature(duel, 'joueur', DRAGON, 'right', 1, { sacrificeIds: victimes.map((e) => e.id) });
  assert.ok(res.ok, res.raison); assert.equal(res.entite.mobaLane, 'right');
  assert.equal(duel.moba.creaturesJouees.joueur, true); assert.equal(duel.moba.embuscadesJouees.joueur, false);
  assert.ok(rpgMobaPlacementCoherent(duel)); assert.deepEqual(duel.joueur.reserveAscension, []);
});

test('MOBA : annonce depuis la réserve puis résolution sans double retrait', () => {
  const duel = nouveauMoba(); const victimes = paireMoba(duel);
  const ids = victimes.map((e) => e.id); const main = [...duel.joueur.main];
  const annonce = rpgMobaJouerCreature(duel, 'joueur', DRAGON, 'left', 0, { sacrificeIds: ids, ouvrirReponse: true });
  assert.ok(annonce.ok, annonce.raison); assert.ok(annonce.creatureEnAttente);
  assert.deepEqual(duel.joueur.reserveAscension, []); assert.deepEqual(duel.joueur.main, main);
  const res = rpgMobaPasserCreature(duel, 'sorcier'); assert.ok(res.ok, res.raison);
  assert.equal(duel.joueur.creatures.filter((e) => e.carteId === DRAGON).length, 1);
  assert.ok(rpgMobaPlacementCoherent(duel)); assert.equal(duel.mobaCreatureEnAttente, null);
});

test('MOBA : recette devenue invalide pendant une réponse, dissipation sans bloquer la partie', () => {
  const duel = nouveauMoba(); const victimes = paireMoba(duel);
  assert.ok(rpgMobaJouerCreature(duel, 'joueur', DRAGON, 'left', 0, { sacrificeIds: victimes.map((e) => e.id), ouvrirReponse: true }).ok);
  rpgBlesserCreature(duel, 'joueur', victimes[1].id, 20); rpgActionsEtat(duel);
  // Le pont synchronise les sorties avant la prochaine intention.
  for (const lane of duel.moba.lanes) lane.slots.joueur = lane.slots.joueur.map((id) => duel.joueur.creatures.some((e) => e.id === id) ? id : null);
  const res = rpgMobaPasserCreature(duel, 'sorcier');
  assert.ok(res.ok, res.raison); assert.equal(res.dissipe, true);
  assert.equal(duel.mobaCreatureEnAttente, null); assert.equal(duel.fenetreReponse, false);
  assert.equal(duel.joueur.cimetiere.filter((id) => id === DRAGON).length, 1);
});

test('PvP : le serveur valide la réserve et les sacrifices, pour les deux sièges', () => {
  for (const cote of ['joueur', 'sorcier']) {
    const duel = nouveau({ pvp: true }); const victimes = paire(duel, cote); duel.tour = cote;
    const res = rpgPvpAppliquer(duel, cote, { type: 'jouer-carte', carteId: DRAGON, sacrificeIds: victimes.map((e) => e.id) });
    assert.ok(res.ok, res.raison); assert.deepEqual(duel[cote].reserveAscension, []);
    assert.ok(duel[cote].creatures.some((e) => e.carteId === DRAGON));
    assert.deepEqual(rpgPvpVue(duel, cote).sorcier.reserveAscension, [DRAGON], 'réserves consultables sans dévoiler la main');
  }
});

test('PvP : un total illégal n’est jamais accepté par l’arbitre', () => {
  const duel = nouveau({ pvp: true }); const victimes = [poser(duel, 'ronin-du-soleil-rouge'), poser(duel, 'kenshi-de-la-forge')];
  sansMutation(duel, () => rpgPvpAppliquer(duel, 'joueur', { type: 'jouer-carte', carteId: DRAGON, sacrificeIds: victimes.map((e) => e.id) }));
});

test('les deux plateaux ont une zone consultable ; la réserve reste accessible au doigt', () => {
  const duel = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  const moba = readFileSync(new URL('../src/games/RpgMobaBoard.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/games/rpg-ascension.css', import.meta.url), 'utf8');
  assert.match(duel, /<ZoneReserveAscension duel=\{duel\} cote="joueur"/);
  assert.match(duel, /<ZoneReserveAscension duel=\{duel\} cote="sorcier"/);
  assert.match(moba, /<ZoneReserveAscension duel=\{duel\} cote=\{side\}/);
  assert.match(css, /rpg-battle--touch[\s\S]*?grid-area: enemy-mana/);
  assert.match(css, /rpg-battle--touch[\s\S]*?grid-area: mana/);
});


test('tous les sacrifices sont payés même si leur Harakiri remporte la partie avant l’arrivée', () => {
  const duel = nouveau(); const victimes = paire(duel); duel.sorcier.pv = 1;
  const res = invoquer(duel, victimes);
  assert.ok(res.ok); assert.equal(res.dissipe, true);
  assert.ok(victimes.every((e) => !duel.joueur.creatures.some((c) => c.id === e.id)));
  assert.ok(victimes.every((e) => duel.joueur.cimetiere.includes(e.carteId)));
  assert.equal(duel.joueur.cimetiere.filter((id) => id === DRAGON).length, 1);
  assert.deepEqual(duel.joueur.reserveAscension, []);
});

test('IA classique : propose la réserve, annonce puis résout avec une vraie recette', () => {
  const duel = nouveau(); const victimes = paire(duel, 'sorcier'); duel.tour = 'sorcier';
  duel.sorcier.main = [];
  for (const e of victimes) Object.assign(e, { pv: 1, atk: 0, nePeutPasAttaquer: true });
  const avant = JSON.stringify(duel);
  const choix = choisirCarteIA(duel, 'sorcier', { rng: () => .5 });
  assert.equal(choix?.carteId, DRAGON);
  assert.ok(validerMateriauxAscension(duel.sorcier, fiche, choix.sacrificeIds).ok);
  assert.equal(JSON.stringify(duel), avant, 'la réflexion ne modifie pas la partie');
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, DRAGON);
  const res = rpgSorcierResoudreAnnonce(duel); assert.ok(res.ok, res.raison);
  assert.ok(duel.sorcier.creatures.some((e) => e.carteId === DRAGON));
  assert.equal(duel.sorcier.invocationNormaleJouee, true);
});

test('IA MOBA : voit la réserve et ne simule que des sacrifices exacts sans muter le plateau', () => {
  const duel = nouveauMoba(); const victimes = paireMoba(duel);
  duel.joueur.main = [];
  for (const e of victimes) Object.assign(e, { pv: 1, atk: 0, nePeutPasAttaquer: true });
  const avant = JSON.stringify(duel);
  const choix = rpgMobaChoisirCreatureIA(duel, 'joueur');
  assert.equal(choix?.id, DRAGON);
  assert.ok(validerMateriauxAscension(duel.joueur, fiche, choix.sacrificeIds).ok);
  assert.equal(JSON.stringify(duel), avant);
  assert.ok(rpgMobaJouerCreature(duel, 'joueur', choix.id, choix.lane, choix.slot, { sacrificeIds: choix.sacrificeIds }).ok);
});

test('MOBA : un contre à l’annonce ne retire pas deux fois la carte et laisse le quota normal libre', async () => {
  const { rpgMobaLancerMagie } = await import('../src/games/rpgMobaLocal.js');
  const duel = nouveauMoba(); const victimes = paireMoba(duel);
  duel.moba.creaturesJouees.joueur = false;
  duel.sorcier.main = ['ecueil'];
  assert.ok(rpgMobaJouerCreature(duel, 'joueur', DRAGON, 'left', 0, { ouvrirReponse: true, sacrificeIds: victimes.map((e) => e.id) }).ok);
  assert.ok(rpgMobaLancerMagie(duel, 'sorcier', 'ecueil').ok);
  assert.equal(duel.mobaCreatureEnAttente, null);
  assert.equal(duel.joueur.cimetiere.filter((id) => id === DRAGON).length, 1);
  assert.equal(duel.joueur.creatures.length, 2);
  assert.equal(duel.moba.creaturesJouees.joueur, false);
  assert.deepEqual(duel.joueur.reserveAscension, []);
});

test('MOBA : les morts des sacrifices peuvent gagner avant l’arrivée, sans résurrection ni case fantôme', () => {
  const duel = nouveauMoba(); const victimes = paireMoba(duel);
  for (const lane of duel.moba.lanes.filter((l) => l.id !== 'center')) lane.hp.sorcier = 1;
  const res = rpgMobaJouerCreature(duel, 'joueur', DRAGON, 'right', 1, { sacrificeIds: victimes.map((e) => e.id) });
  assert.ok(res.ok, res.raison); assert.equal(res.dissipe, true);
  assert.equal(duel.moba.winner, 'joueur'); assert.equal(duel.joueur.creatures.length, 0);
  assert.equal(duel.joueur.cimetiere.filter((id) => id === DRAGON).length, 1);
  assert.ok(rpgMobaPlacementCoherent(duel));
});

test('MOBA : une conquête pendant les sacrifices peut fermer la case choisie sans annuler leur paiement', () => {
  const duel = nouveauMoba(); const victimes = paireMoba(duel);
  duel.moba.lanes.find((l) => l.id === 'left').hp.sorcier = 1;
  const res = rpgMobaJouerCreature(duel, 'joueur', DRAGON, 'left', 0, { sacrificeIds: victimes.map((e) => e.id) });
  assert.ok(res.ok, res.raison); assert.equal(res.dissipe, true);
  assert.equal(duel.moba.winner, null);
  assert.ok(duel.joueur.cimetiere.includes(DRAGON)); assert.deepEqual(duel.joueur.reserveAscension, []);
  assert.ok(rpgMobaPlacementCoherent(duel));
});
