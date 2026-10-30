import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RPG_PV_JOUEUR,
  rpgActiverCapacite,
  rpgBlesserCreature,
  rpgChoisirAttaquants,
  rpgChoisirBloqueurs,
  rpgCibleAuto,
  rpgCiblesAttaqueRapide,
  rpgEstProtegee,
  rpgJouerCreature,
  rpgLancerAttaque,
  rpgLancerMagie,
  rpgNouveauDuel,
  rpgSorcierAnnonceSuivante,
  rpgSorcierResoudreAnnonce,
  rpgTourSorcierIA,
  rpgVainqueur,
} from '../src/games/rpgDuel.js';
import {
  blessureNette,
  choisirActivationIA,
  choisirCarteIA,
  choisirCibleAutoIA,
  furieGagnee,
  rpgProfilIA,
  rpgDelaiReflexionIA,
  resultatBlocage,
  valeurEntite,
  RPG_NIVEAUX_IA,
  RPG_STYLES_IA,
} from '../src/games/rpgAI.js';
import { cardById, cardColors } from '../src/games/rpgCards.js';

/** Duel prêt à être joué sans dépendre du mélange : mains vides, tables vides. */
const duelNu = (opts = {}) => rpgNouveauDuel({
  joueurDeck: [],
  sorcierDeck: [],
  rng: () => 0.5,
  ...opts,
});

const donner = (duel, cote, carteId) => duel[cote].main.push(carteId);

// Fixture de combat neutre : le Seigneur fournit un corps 6/6 ; ses
// mots-clés sans rapport avec le scénario sont désactivés explicitement.
const jouerGros = (duel, cote) => {
  const resultat = rpgJouerCreature(duel, cote, 'seigneur-des-machoires');
  if (resultat.entite) Object.assign(resultat.entite, { tenaciteDisponible: false, tribut: 0 });
  return resultat;
};
const donnerMana = (duel, cote, n) => { duel[cote].mana = { braise: n, eau: n, sable: n, neige: n }; };

// ── Ciblage ─────────────────────────────────────────────────────────────────

test('l’IA vise le kill, pas la première créature venue', () => {
  const duel = duelNu();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  // La Vipère arrive en premier sur la table, le Chien ensuite.
  donner(duel, 'joueur', 'vipere-de-verre');
  donner(duel, 'joueur', 'chien-du-guet');
  const vipere = rpgJouerCreature(duel, 'joueur', 'vipere-de-verre').entite;
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  // Seul le Chien meurt sous les 3 dégâts du Trait (la Vipère est trop pleine).
  Object.assign(vipere, { pv: 6, def: 6, pvMax: 6 });

  const trait = cardById('trait-de-braise');
  assert.equal(rpgCibleAuto(duel, 'sorcier', trait), chien.id,
    'le Trait vise le Chien 2/2 (kill) plutôt que la Vipère arrivée en premier');
  assert.notEqual(rpgCibleAuto(duel, 'sorcier', trait), vipere.id);
});

test('l’IA confie la parade de la Veilleuse à un allié, avec un repli solo', () => {
  const duel = duelNu();
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'sorcier', 'dune-marchante');
  const allie = rpgJouerCreature(duel, 'sorcier', 'dune-marchante').entite;
  donner(duel, 'sorcier', 'veilleuse-des-citernes');
  assert.equal(choisirCibleAutoIA(duel, 'sorcier', cardById('veilleuse-des-citernes')), allie.id);
  const choix = choisirCarteIA(duel, 'sorcier');
  assert.equal(choix?.carteId, 'veilleuse-des-citernes');
  assert.equal(choix?.cibleId, allie.id);
  assert.equal(rpgJouerCreature(duel, 'sorcier', 'veilleuse-des-citernes', choix.cibleId).ok, true);
  assert.equal(allie.bouclier, 1);

  const solo = duelNu();
  donnerMana(solo, 'sorcier', 20);
  donner(solo, 'sorcier', 'veilleuse-des-citernes');
  assert.equal(choisirCibleAutoIA(solo, 'sorcier', cardById('veilleuse-des-citernes')), null);
  const choixSolo = choisirCarteIA(solo, 'sorcier');
  assert.equal(choixSolo?.carteId, 'veilleuse-des-citernes');
  const pose = rpgJouerCreature(solo, 'sorcier', 'veilleuse-des-citernes', choixSolo.cibleId);
  assert.equal(pose.ok, true);
  assert.equal(pose.entite.bouclier, 1);
});

test('l’IA préfère le visage létal à un kill sur le plateau', () => {
  const duel = duelNu();
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'chien-du-guet'); // killable par le Trait…
  rpgJouerCreature(duel, 'joueur', 'chien-du-guet');
  duel.joueur.pv = 3; // …mais 3 dégâts au visage concluent la partie

  const trait = cardById('trait-de-braise');
  assert.equal(rpgCibleAuto(duel, 'sorcier', trait), 'sorcier',
    '3 dégâts garantis sur 3 PV : le burn part au visage');
});

test('l’Attaque ciblée choisit la cible la plus précieuse, pas la première', () => {
  const duel = duelNu();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'chien-du-guet');        // 2/2, en premier sur la table
  donner(duel, 'joueur', 'fennec-des-decombres'); // 3/1, plus de valeur
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  const fennec = rpgJouerCreature(duel, 'joueur', 'fennec-des-decombres').entite;
  donner(duel, 'sorcier', 'feriel');
  const feriel = rpgJouerCreature(duel, 'sorcier', 'feriel').entite;

  const cibles = rpgCiblesAttaqueRapide(duel, 'sorcier', [feriel.id]);
  assert.deepEqual(cibles, { [feriel.id]: fennec.id },
    'Fériel frappe le Fennec (valeur supérieure), même arrivé en second');
  assert.notEqual(cibles[feriel.id], chien.id);
});

// ── Blocages ────────────────────────────────────────────────────────────────

test('l’IA bloque les échanges favorables et refuse les blocages suicidaires', () => {
  const duel = duelNu();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'seigneur-des-machoires');
  const grosAttaquant = jouerGros(duel, 'joueur').entite; // 5/5
  donner(duel, 'sorcier', 'dune-marchante');
  const petiteDune = rpgJouerCreature(duel, 'sorcier', 'dune-marchante').entite; // 2/5
  grosAttaquant.ready = true;

  // 5/5 contre 2/5 : la Dune mourrait sans tuer — pas de blocage.
  assert.deepEqual(rpgChoisirBloqueurs(duel, 'joueur', [grosAttaquant.id]), {},
    'un bloqueur qui meurt sans tuer reste en réserve');

  // Inversé : la Dune 2/5 contre un Chien 2/2 — kill sans perdre la Dune.
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  chien.ready = true;
  assert.deepEqual(rpgChoisirBloqueurs(duel, 'joueur', [chien.id]), {
    [chien.id]: [petiteDune.id],
  }, 'tuer un attaquant en survivant : le blocage est joué');
});

test('l’IA interpose un chump block quand la partie se joue', () => {
  const duel = duelNu();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'seigneur-des-machoires');
  const grosAttaquant = jouerGros(duel, 'joueur').entite; // 5/5
  donner(duel, 'sorcier', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite; // 2/2
  grosAttaquant.ready = true;
  duel.sorcier.pv = 4; // les 5 dégâts directs tuent le sorcier

  assert.deepEqual(rpgChoisirBloqueurs(duel, 'joueur', [grosAttaquant.id]), {
    [grosAttaquant.id]: [chien.id],
  }, 'sur 4 PV, le Chien s’interpose même sans espoir de tuer');
});

// ── Attaques ────────────────────────────────────────────────────────────────

test('le sorcier attaque quand les dégâts sont gratuits, pas quand ils se donnent', () => {
  const duel = duelNu();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'sorcier', 'fennec-des-decombres');
  const fennec = rpgJouerCreature(duel, 'sorcier', 'fennec-des-decombres').entite; // 3/1
  fennec.ready = true;

  // Plateau adverse vide : tout le monde part.
  assert.deepEqual(rpgChoisirAttaquants(duel, 'sorcier'), [fennec.id]);

  // Un mur 2/5 en face : le Fennec y mourrait pour rien — il reste.
  donner(duel, 'joueur', 'dune-marchante');
  const mur = rpgJouerCreature(duel, 'joueur', 'dune-marchante').entite;
  mur.ready = true;
  assert.deepEqual(rpgChoisirAttaquants(duel, 'sorcier'), [],
    '3/1 dans une 2/5 : pas d’assaut suicidaire');
});

test('le sorcier envoie tout quand le visage adverse ne survit pas', () => {
  const duel = duelNu();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'sorcier', 'fennec-des-decombres');
  donner(duel, 'sorcier', 'fennec-des-decombres');
  const premier = rpgJouerCreature(duel, 'sorcier', 'fennec-des-decombres').entite;
  const second = rpgJouerCreature(duel, 'sorcier', 'fennec-des-decombres').entite;
  donner(duel, 'joueur', 'dune-marchante');
  const mur = rpgJouerCreature(duel, 'joueur', 'dune-marchante').entite; // tue les 3/1
  premier.ready = true;
  second.ready = true;
  mur.ready = true;

  // Sans enjeu : les deux Fennecs se gardent.
  assert.deepEqual(rpgChoisirAttaquants(duel, 'sorcier'), []);

  // Sur 3 PV, un seul Fennec passera de toute façon — 3 ≥ 3 : on conclut.
  duel.joueur.pv = 3;
  assert.deepEqual(rpgChoisirAttaquants(duel, 'sorcier'), [premier.id, second.id],
    'la ligne létale force l’assaut général');
});

// ── Tour complet ────────────────────────────────────────────────────────────

test('le sorcier dégage la voie avec son removal avant de frapper', () => {
  const duel = duelNu();
  duel.tour = 'sorcier';
  donnerMana(duel, 'joueur', 10);
  donnerMana(duel, 'sorcier', 10);
  donner(duel, 'joueur', 'chien-du-guet'); // le bloqueur
  rpgJouerCreature(duel, 'joueur', 'chien-du-guet');
  donner(duel, 'sorcier', 'trait-de-braise');
  donner(duel, 'sorcier', 'fennec-des-decombres');
  const fennec = rpgJouerCreature(duel, 'sorcier', 'fennec-des-decombres').entite; // 3/1, Rapidité
  fennec.ready = true;

  rpgTourSorcierIA(duel);
  assert.equal(duel.joueur.creatures.length, 0, 'le Trait de braise abat le Chien');
  assert.equal(duel.joueur.pv, RPG_PV_JOUEUR - 3, 'le Fennec, la voie libre, frappe pour 3');
  assert.equal(fennec.attaquee, true);
});

test('le sorcier conclut avec son burn plutôt que de chipoter', () => {
  const duel = duelNu();
  duel.tour = 'sorcier';
  donnerMana(duel, 'joueur', 10);
  donnerMana(duel, 'sorcier', 10);
  duel.joueur.pv = 3;
  donner(duel, 'joueur', 'dune-marchante'); // le Trait ne la tue pas
  rpgJouerCreature(duel, 'joueur', 'dune-marchante');
  donner(duel, 'sorcier', 'trait-de-braise');

  rpgTourSorcierIA(duel);
  assert.equal(rpgVainqueur(duel), 'sorcier', '3 PV : le Trait part au visage et finit le duel');
  assert.equal(duel.joueur.pv, 0);
});

// ── Profils (crochets du mode Histoire) ─────────────────────────────────────

test('les profils IA se normalisent et couvrent niveaux et styles', () => {
  assert.deepEqual(RPG_NIVEAUX_IA, ['recit', 'normale', 'veilleur', 'sablier', 'oubliee']);
  assert.deepEqual(RPG_STYLES_IA, ['agressif', 'equilibre', 'prudent', 'controle']);
  const defaut = rpgProfilIA(null);
  assert.equal(defaut.niveau, 'normale');
  assert.equal(defaut.style, 'equilibre');
  assert.equal(defaut.tauxErreur, 0);
  const casse = rpgProfilIA({ niveau: 'impossible', style: 'chaotique' });
  assert.equal(casse.niveau, 'normale', 'un niveau inconnu retombe sur Normale');
  assert.equal(casse.style, 'equilibre');
  assert.ok(rpgProfilIA({ niveau: 'recit' }).tauxErreur > 0);
  assert.equal(rpgProfilIA({ niveau: 'veilleur' }).prescience, true);
  assert.equal(rpgProfilIA({ niveau: 'normale' }).profondeur, 2);
  assert.equal(rpgProfilIA({ niveau: 'veilleur' }).profondeur, 3);
  assert.ok(rpgProfilIA({ niveau: 'veilleur' }).largeur > rpgProfilIA({ niveau: 'normale' }).largeur);
  // Le Sablier (Tour du Sablier renversé) est le niveau terminal : il voit
  // un coup plus loin que le Veilleur, explore plus de réponses à chaque
  // pas, garde la prescience et ne se trompe jamais.
  const sablier = rpgProfilIA({ niveau: 'sablier' });
  assert.equal(sablier.profondeur, 4);
  assert.ok(sablier.largeur > rpgProfilIA({ niveau: 'veilleur' }).largeur);
  assert.equal(sablier.prescience, true);
  assert.equal(sablier.tauxErreur, 0);
  // L'Oublié (Tour Oubliée) est la seule marche au-dessus du Sablier : un coup
  // de plus, une réponse de plus, et les mêmes garanties.
  const oubliee = rpgProfilIA({ niveau: 'oubliee' });
  assert.equal(oubliee.profondeur, 5);
  assert.ok(oubliee.largeur > sablier.largeur);
  assert.equal(oubliee.prescience, true);
  assert.equal(oubliee.tauxErreur, 0);
});

test('le Veilleur réfléchit plus longtemps quand le plateau et sa main sont chargés', () => {
  const duel = duelNu({ sorcierIA: { niveau: 'veilleur' } });
  const delaiSimple = rpgDelaiReflexionIA(duel);
  duel.sorcier.main.push('fennec-des-decombres', 'trait-de-braise');
  duel.sorcier.creatures.push({ id: 'a', carteId: 'chien-du-guet', atk: 2, pv: 2, def: 2 });
  duel.joueur.creatures.push({ id: 'b', carteId: 'dune-marchante', atk: 2, pv: 5, def: 5 });
  assert.ok(rpgDelaiReflexionIA(duel) > delaiSimple);
  const duelNormal = duelNu({ sorcierIA: { niveau: 'normale' } });
  assert.ok(delaiSimple > rpgDelaiReflexionIA(duelNormal));
  // Le Sablier prend encore plus de recul que le Veilleur, à plateau égal.
  const duelSablier = duelNu({ sorcierIA: { niveau: 'sablier' } });
  assert.ok(rpgDelaiReflexionIA(duelSablier) > delaiSimple);
});

test('la recherche tactique simule ses coups sans modifier le duel réel', () => {
  const duel = duelNu({ sorcierIA: { niveau: 'veilleur', style: 'equilibre' } });
  duel.tour = 'sorcier';
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'sorcier', 'fennec-des-decombres');
  donner(duel, 'sorcier', 'trait-de-braise');
  donner(duel, 'sorcier', 'dune-marchante');
  donner(duel, 'joueur', 'chien-du-guet');
  donnerMana(duel, 'joueur', 20);
  rpgJouerCreature(duel, 'joueur', 'chien-du-guet');
  const avantRecherche = structuredClone(duel);

  const coup = choisirCarteIA(duel, 'sorcier');
  assert.ok(coup, 'le Veilleur trouve un coup jouable');
  assert.deepEqual(duel, avantRecherche, 'les simulations n’altèrent ni la main ni le plateau réels');
});

test('le niveau Récit se trompe, la Normale joue le bon blocage', () => {
  const poserEchangeDeChiens = (duel) => {
    donnerMana(duel, 'joueur', 10);
    donnerMana(duel, 'sorcier', 10);
    donner(duel, 'joueur', 'chien-du-guet');
    donner(duel, 'sorcier', 'chien-du-guet');
    const attaquant = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
    rpgJouerCreature(duel, 'sorcier', 'chien-du-guet');
    attaquant.ready = true;
    return attaquant;
  };

  const duelNormale = duelNu();
  const attaquant = poserEchangeDeChiens(duelNormale);
  assert.deepEqual(rpgChoisirBloqueurs(duelNormale, 'joueur', [attaquant.id]),
    { [attaquant.id]: [duelNormale.sorcier.creatures[0].id] },
    'échange mutuel 2/2 : la Normale bloque');

  const duelRecit = duelNu({ sorcierIA: { niveau: 'recit' } });
  const attaquantRecit = poserEchangeDeChiens(duelRecit);
  // rng () => 0 déclenche systématiquement l’erreur volontaire du Récit.
  assert.deepEqual(
    rpgChoisirBloqueurs(duelRecit, 'joueur', [attaquantRecit.id], {}, { rng: () => 0 }),
    {},
    'le Récit rate volontairement ses blocages',
  );
});

test('le niveau Veilleur garde son burn pour conclure, la Normale le pousse', () => {
  // La Fureur du souk a quitté le jeu : le burn de Braise, c'est désormais le
  // Trait. On protège la Dune contre la Braise — la mécanique du Désert — pour
  // qu'il ne reste au Trait que le visage comme cible légale.
  const duel = duelNu();
  duel.tour = 'sorcier';
  donnerMana(duel, 'joueur', 10);
  donnerMana(duel, 'sorcier', 10);
  donner(duel, 'joueur', 'dune-marchante');
  const dune = rpgJouerCreature(duel, 'joueur', 'dune-marchante').entite;
  dune.protection = { contre: 'braise', toursRestants: 2 };
  duel.joueur.pv = RPG_PV_JOUEUR; // aucun enjeu : 3 dégâts au visage ne changent rien
  donner(duel, 'sorcier', 'trait-de-braise');
  assert.equal(choisirCarteIA(duel, 'sorcier')?.carteId, 'trait-de-braise',
    'la Normale pousse son burn');

  const duelVeilleur = duelNu({ sorcierIA: { niveau: 'veilleur' } });
  duelVeilleur.tour = 'sorcier';
  donnerMana(duelVeilleur, 'joueur', 10);
  donnerMana(duelVeilleur, 'sorcier', 10);
  donner(duelVeilleur, 'joueur', 'dune-marchante');
  const duneVeilleur = rpgJouerCreature(duelVeilleur, 'joueur', 'dune-marchante').entite;
  duneVeilleur.protection = { contre: 'braise', toursRestants: 2 };
  duelVeilleur.joueur.pv = RPG_PV_JOUEUR;
  donner(duelVeilleur, 'sorcier', 'trait-de-braise');
  assert.equal(choisirCarteIA(duelVeilleur, 'sorcier'), null,
    'le Veilleur ménage son burn tant qu’il n’est pas décisif');
});

test('le résultat de blocage suit l’ordre réel du moteur (capacités d’abord)', () => {
  // Sahir 2/3 : ses 2 dégâts préalables tuent le Fennec 3/1 avant riposte.
  const sahir = { id: 'a', carteId: 'sahir-des-braises', atk: 2, def: 3, pv: 3, pvMax: 3, bouclier: 0, esquive: 0 };
  const fennec = { id: 'b', carteId: 'fennec-des-decombres', atk: 3, def: 1, pv: 1, pvMax: 1, bouclier: 0, esquive: 1 };
  assert.deepEqual(resultatBlocage(sahir, fennec),
    { attaquantMeurt: false, bloqueurMeurt: true, attaquantFurie: 0, bloqueurFurie: 0 },
    'le Fennec meurt avant d’infliger ses blessures, le Sahir survit');
});

// ── Les capacités du Nord dans la tête du sorcier ───────────────────────────

/** Attaquant témoin : un 4/4 sans Furie, pour isoler l’effet du mot-clé. */
const attaquantTemoin = () => ({
  id: 'cavalier-temoin', carteId: 'cavalier-amazigh-du-desert', name: 'Cavalier témoin',
  atk: 4, def: 4, pv: 4, pvMax: 4, bouclier: 0, esquive: 0, ready: true, attaquee: false,
});

const defenseurSousLeCoup = (duel) => {
  // Amani 2/5 : seule en jeu, son égide ne la grandit pas — elle survit aux
  // 2 dégâts du Jarl et le blesserait de 2 en retour.
  donner(duel, 'joueur', 'amani-des-ksour');
  const dune = rpgJouerCreature(duel, 'joueur', 'amani-des-ksour').entite;
  duel.joueur.pv = 8; // menace imminente : la pression autorise les blocages
  return dune;
};

test('l’IA connaît la Furie : entamer un viking sans le tuer le nourrit', () => {
  // La parade n'est plus une armure : elle ne retire aucun dégât.
  const garde = { id: 'g', carteId: 'jarl-au-marteau-de-guerre', atk: 2, def: 5, pv: 5, pvMax: 5, bouclier: 1, esquive: 0 };
  assert.equal(blessureNette(garde, 2), 2, 'le bouclier ne prévient plus les dégâts');
  assert.equal(furieGagnee(garde, blessureNette(garde, 2)), 2, 'Furie 2 : +2/+0 pour le Jarl');
  // Un coup létal, lui, ne laisse aucune Furie à gagner.
  assert.equal(blessureNette(garde, 5), 5);
  assert.equal(furieGagnee(garde, blessureNette(garde, 5)), 0, 'à 0 PV, pas de Furie');
  // Le plafond renforcé ne change pas le seuil imprimé : de 6 à 5 PV, le
  // Jarl est blessé sous son plafond mais reste exactement à sa base.
  assert.equal(furieGagnee({ ...garde, bouclier: 0, pv: 6, pvMax: 6 }, 1), 0,
    'un renfort garde la créature au-dessus de sa DEF de base');
  // Une créature sans Furie ne gagne rien, et une morte non plus.
  const cavalier = attaquantTemoin();
  assert.equal(furieGagnee(cavalier, 2), 0);
  assert.equal(furieGagnee(garde, 0), 0);
  assert.equal(furieGagnee(garde, garde.pv), 0, 'un coup létal ne laisse aucune Furie à gagner');
  // Une Furie déjà active ne promet aucun nouveau gain dans cet échange.
  assert.equal(furieGagnee({ ...garde, furieDeclenchee: true }, 2), 0,
    'le bonus est déjà là : il ne se cumule pas');

  // L’échange simulé rapporte le gain : les deux survivent, mais seul le
  // Jarl blessé voit son attaque promise à +2.
  const jarl = { ...garde, bouclier: 0 };
  const dune = { id: 'd', carteId: 'dune-marchante', atk: 2, def: 5, pv: 5, pvMax: 5, bouclier: 0, esquive: 0 };
  assert.deepEqual(resultatBlocage(jarl, dune),
    { attaquantMeurt: false, bloqueurMeurt: false, attaquantFurie: 2, bloqueurFurie: 0 });
  assert.deepEqual(resultatBlocage(cavalier, dune),
    { attaquantMeurt: false, bloqueurMeurt: false, attaquantFurie: 0, bloqueurFurie: 0 },
    'un corps sans Furie ne profite pas de la blessure');

  // Sur la table : blesser le Jarl sans le tuer fait refuser un blocage que
  // l’IA accepte contre un attaquant sans Furie.
  const duelFurieux = duelNu();
  donnerMana(duelFurieux, 'joueur', 40);
  donnerMana(duelFurieux, 'sorcier', 40);
  const duneContreJarl = defenseurSousLeCoup(duelFurieux);
  donner(duelFurieux, 'sorcier', 'jarl-au-marteau-de-guerre');
  const jarlEnJeu = rpgJouerCreature(duelFurieux, 'sorcier', 'jarl-au-marteau-de-guerre').entite;
  jarlEnJeu.ready = true;
  jarlEnJeu.provocation = false; // isole la décision de blocage facultatif de l’obligation Provocation
  assert.deepEqual(rpgChoisirBloqueurs(duelFurieux, 'sorcier', [jarlEnJeu.id]), {},
    'l’IA refuse d’écorner le Jarl : elle ne lui offrirait que +2/+0');
  assert.equal(duneContreJarl.atk, 2, 'le bloqueur reste en réserve');

  const duelTemoin = duelNu();
  donnerMana(duelTemoin, 'joueur', 40);
  donnerMana(duelTemoin, 'sorcier', 40);
  const duneTemoin = defenseurSousLeCoup(duelTemoin);
  const temoin = attaquantTemoin();
  duelTemoin.sorcier.creatures.push(temoin);
  assert.deepEqual(rpgChoisirBloqueurs(duelTemoin, 'sorcier', [temoin.id]),
    { [temoin.id]: [duneTemoin.id] },
    'un 4/4 sans Furie : l’échange devient acceptable et l’IA bloque');
});

test('l’IA connaît la Résonance : une source vaut plus que ses seules statistiques', () => {
  // Deux 3/3 de démonstration : le Djinn, puis le Tengu, source de Résonance
  // samouraï. Les fiches donnent l’identité et les capacités ; les chiffres
  // sont égalisés pour isoler le prix de l’aura.
  const duel = duelNu();
  const djinn = { id: 'djinn', carteId: 'djinn-du-souk', name: 'Djinn du souk', atk: 3, def: 3, pv: 3, pvMax: 3, bouclier: 0, esquive: 0, ready: true, attaquee: false };
  const tengu = { id: 'tengu', carteId: 'tengu-du-mont-ardent', name: 'Tengu du mont ardent', atk: 3, def: 3, pv: 3, pvMax: 3, bouclier: 0, esquive: 0, ready: true, attaquee: false };
  duel.joueur.creatures.push(djinn, tengu);
  assert.ok(valeurEntite(tengu) > valeurEntite(djinn) - 0.001,
    'l’aura du Tengu compte dans sa valeur');
  assert.equal(rpgCibleAuto(duel, 'sorcier', cardById('trait-de-braise')), 'tengu',
    'le Trait de braise tue la source de Résonance plutôt que le 3/3 nu');
});

test('le Père des corbeaux n’a plus de foudre activée : l’IA n’a rien à déclencher', () => {
  const duel = duelNu();
  duel.tour = 'sorcier';
  duel.sorcier.mana = { braise: 0, eau: 0, sable: 0, neige: 6 };
  const pere = {
    id: 'pere', carteId: 'pere-des-corbeaux', name: 'LE PÈRE DES CORBEAUX',
    atk: 5, def: 5, pv: 5, pvMax: 5, bouclier: 0, esquive: 0, ready: true, attaquee: false,
  };
  const chien = {
    id: 'chien', carteId: 'chien-du-guet', name: 'Chien du guet',
    atk: 2, def: 2, pv: 2, pvMax: 2, bouclier: 0, esquive: 0, ready: true, attaquee: false,
  };
  duel.sorcier.creatures.push(pere);
  duel.joueur.creatures.push(chien);

  // Sa foudre a disparu : même gorgée de mana de glace, l'IA ne trouve
  // aucune capacité à activer, et le moteur refuse de toute façon.
  assert.equal(choisirActivationIA(duel, 'sorcier'), null,
    'plus de capacité activée sur le Père des corbeaux');
  assert.equal(rpgActiverCapacite(duel, 'sorcier', 'pere', 'chien').ok, false,
    'le moteur ne connaît plus cette activation');
  assert.equal(duel.joueur.creatures.includes(chien), true, 'le Chien reste en vie');
});

// ── Arrivées qui désignent leur cible ───────────────────────────────────────

test('le sorcier joue la Vipère : le venin mord, et l’annonce ne repart pas en boucle', () => {
  const duel = duelNu();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'vipere-de-verre');

  const annonce = rpgSorcierAnnonceSuivante(duel, () => 0.5);
  assert.equal(annonce?.carteId, 'vipere-de-verre', 'la Vipère est annoncée');
  assert.equal(annonce?.cibleId, chien.id, 'la morsure choisit sa victime');
  const res = rpgSorcierResoudreAnnonce(duel);
  assert.equal(res.ok, true, 'la carte annoncée se résout — elle ne repart pas en boucle');
  assert.equal(duel.sorcier.main.includes('vipere-de-verre'), false, 'la Vipère a quitté la main');
  assert.equal(chien.atk, 0, 'le venin retire 2 attaques');
  assert.ok(chien.empecheAttaqueToursRestants > 0, 'la victime ne peut pas attaquer');
  // L’annonce suivante porte sur autre chose : le sorcier ne réannonce pas
  // la même carte (la partie était bloquée en boucle avant).
  const suivante = rpgSorcierAnnonceSuivante(duel, () => 0.5);
  assert.notEqual(suivante?.carteId, 'vipere-de-verre', 'la Vipère n’est pas réannoncée');
});

test('la Vipère sans victime sur la table reste en main : la partie continue', () => {
  const duel = duelNu();
  duel.tour = 'sorcier';
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'sorcier', 'vipere-de-verre');
  const annonce = rpgSorcierAnnonceSuivante(duel, () => 0.5);
  assert.equal(annonce, null, 'rien n’est annoncé : la morsure n’aurait personne à mordre');
  assert.equal(duel.sorcier.main.includes('vipere-de-verre'), true, 'la Vipère reste en main');
  assert.equal(duel.annonce, null, 'aucune fenêtre de réponse ne reste ouverte');
});

test('Bakunawa et Faiseur de passage : la lune et le passage se choisissent aussi', () => {
  const duel = duelNu();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'bakunawa');

  const annonce = rpgSorcierAnnonceSuivante(duel, () => 0.5);
  assert.equal(annonce?.carteId, 'bakunawa');
  assert.equal(annonce?.cibleId, chien.id, 'la lune choisit sa victime');
  assert.equal(rpgSorcierResoudreAnnonce(duel).ok, true, 'la Bakunawa se résout');
  assert.equal(duel.joueur.creatures.includes(chien), false, 'la créature choisie a perdu son combat contre Bakunawa');

  // Le Faiseur de passage : l’Infiltration va à un allié du sorcier.
  const duel2 = duelNu();
  donnerMana(duel2, 'joueur', 20);
  donnerMana(duel2, 'sorcier', 20);
  donner(duel2, 'sorcier', 'chien-du-guet');
  const allie = rpgJouerCreature(duel2, 'sorcier', 'chien-du-guet').entite;
  duel2.tour = 'sorcier';
  donner(duel2, 'sorcier', 'faiseur-de-passage');
  const annonce2 = rpgSorcierAnnonceSuivante(duel2, () => 0.5);
  assert.equal(annonce2?.carteId, 'faiseur-de-passage');
  assert.equal(annonce2?.cibleId, allie.id, 'le passage choisit son allié');
  assert.equal(rpgSorcierResoudreAnnonce(duel2).ok, true, 'le Faiseur se résout');
  assert.equal(allie.infiltration, true, 'l’allié passe sans être bloqué');
});

test('Le Grand Hiver : le sorcier ne le lance que si le compte des pertes penche de son côté', () => {
  // Deux 1/1 chez le joueur, un Seigneur chez le sorcier : la vague tue pour
  // lui et ne lui coûte qu'une blessure — il la lance, sans désigner de cible.
  const duel = duelNu();
  duel.tour = 'sorcier';
  donnerMana(duel, 'joueur', 9);
  donnerMana(duel, 'sorcier', 9);
  for (let i = 0; i < 2; i += 1) {
    donner(duel, 'joueur', 'tislit-des-aures');
    rpgJouerCreature(duel, 'joueur', 'tislit-des-aures');
  }
  donner(duel, 'sorcier', 'seigneur-des-machoires');
  jouerGros(duel, 'sorcier');
  donner(duel, 'sorcier', 'grand-hiver');
  const choix = choisirCarteIA(duel, 'sorcier', () => 0.5);
  assert.equal(choix?.carteId, 'grand-hiver');
  assert.equal(choix.cibleId, null, 'un sort qui frappe les deux tables ne désigne personne');

  // L'inverse : deux 1/1 chez le sorcier, une grosse créature chez le joueur.
  // Il perdrait plus qu'il ne gagnerait — la carte reste en main.
  const duel2 = duelNu();
  duel2.tour = 'sorcier';
  donnerMana(duel2, 'joueur', 9);
  donnerMana(duel2, 'sorcier', 9);
  donner(duel2, 'joueur', 'seigneur-des-machoires');
  jouerGros(duel2, 'joueur');
  for (let i = 0; i < 2; i += 1) {
    donner(duel2, 'sorcier', 'tislit-des-aures');
    rpgJouerCreature(duel2, 'sorcier', 'tislit-des-aures');
  }
  donner(duel2, 'sorcier', 'grand-hiver');
  assert.equal(choisirCarteIA(duel2, 'sorcier', () => 0.5), null,
    'le sorcier ne sacrifie pas sa propre table pour un dégât');
});

// ── Protection : l’IA respecte l’écran de couleur ───────────────────────────

/**
 * Tiziri est protégée contre la Braise de façon permanente : les coups d’une
 * carte Braise — attaque, capacité, magie — ne la touchent pas. L’Ifrit, 5/4
 * Braise, est le mur de référence de ce lot de tests.
 */
const ifritBraise = () => ({
  id: 'ifrit', carteId: 'ifrit-des-ergs', name: 'Ifrit des ergs',
  atk: 5, def: 4, pv: 4, pvMax: 4, bouclier: 0, esquive: 0, ready: true, attaquee: false,
});

test('la protection annule les coups de sa couleur dans l’échange simulé', () => {
  const tiziri = {
    id: 'tiziri', carteId: 'tiziri-du-djurdjura', name: 'Tiziri',
    atk: 2, def: 1, pv: 1, pvMax: 1, bouclier: 0, esquive: 0,
    protection: { contre: 'braise', toursRestants: Infinity },
  };
  // 5 dégâts Braise sur une 2/1 : sans protection elle meurt, avec elle elle
  // encaisse zéro et entame l’Ifrit en retour.
  assert.deepEqual(resultatBlocage(ifritBraise(), tiziri),
    { attaquantMeurt: false, bloqueurMeurt: false, attaquantFurie: 0, bloqueurFurie: 0 },
    'la protection Braise sauve Tiziri de l’Ifrit Braise');
  assert.deepEqual(resultatBlocage(ifritBraise(), { ...tiziri, protection: null }),
    { attaquantMeurt: false, bloqueurMeurt: true, attaquantFurie: 0, bloqueurFurie: 0 },
    'sans la protection, les 5 dégâts l’emportent');
  // Une protection d’une autre couleur ne protège de rien ici.
  assert.deepEqual(
    resultatBlocage(ifritBraise(), { ...tiziri, protection: { contre: 'tenebres', toursRestants: 2 } }),
    { attaquantMeurt: false, bloqueurMeurt: true, attaquantFurie: 0, bloqueurFurie: 0 },
    'protégée contre les Ténèbres, Tiziri reste vulnérable à la Braise',
  );
});

test('le sorcier n’attaque pas dans un bloqueur protégé contre sa couleur', () => {
  const duel = duelNu();
  duel.tour = 'sorcier';
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'sorcier', 'ifrit-des-ergs');
  const ifrit = rpgJouerCreature(duel, 'sorcier', 'ifrit-des-ergs').entite;
  donner(duel, 'joueur', 'tiziri-du-djurdjura');
  const tiziri = rpgJouerCreature(duel, 'joueur', 'tiziri-du-djurdjura').entite;
  tiziri.protection = { contre: 'braise', toursRestants: Infinity };
  ifrit.ready = true;
  ifrit.attaquee = false;
  ifrit.overkill = false; // évite que le débordement rende l’attaque rentable malgré la protection
  assert.equal(rpgEstProtegee(tiziri, cardColors(cardById('ifrit-des-ergs'))), true,
    'Tiziri est bien protégée contre la couleur de l’Ifrit');

  // L’attaque ne percerait pas et n’abattrait personne : l’Ifrit resterait
  // en jeu, entamé pour rien. L’IA garde son attaquant au camp.
  assert.deepEqual(rpgChoisirAttaquants(duel, 'sorcier'), [],
    'aucune attaque dans un mur protégé qui ne rend rien');

  // La même attaque redevient bonne quand le bloqueur n’est pas protégé :
  // le Chien 2/2 meurt sans emporter l’Ifrit.
  duel.joueur.creatures = duel.joueur.creatures.filter((entite) => entite.id !== tiziri.id);
  donner(duel, 'joueur', 'chien-du-guet');
  rpgJouerCreature(duel, 'joueur', 'chien-du-guet');
  assert.deepEqual(rpgChoisirAttaquants(duel, 'sorcier'), [ifrit.id],
    'face à un bloqueur vulnérable, l’Ifrit attaque');
});

test('le bloqueur protégé arrête l’attaque sans une égratignure, et l’IA le pose', () => {
  const duel = duelNu();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'ifrit-des-ergs');
  const ifrit = rpgJouerCreature(duel, 'joueur', 'ifrit-des-ergs').entite;
  ifrit.ready = true;
  ifrit.attaquee = false;
  donner(duel, 'sorcier', 'tiziri-du-djurdjura');
  const tiziri = rpgJouerCreature(duel, 'sorcier', 'tiziri-du-djurdjura').entite;
  tiziri.protection = { contre: 'braise', toursRestants: Infinity };

  // Un blocage gratuit — la bloqueuse ne peut pas mourir de ce coup-là — se
  // prend toujours, quel que soit le seuil d’agressivité.
  assert.deepEqual(rpgChoisirBloqueurs(duel, 'joueur', [ifrit.id]),
    { [ifrit.id]: [tiziri.id] }, 'Tiziri encaisse l’Ifrit Braise sans risque');

  // Le moteur confirme le calcul de l’IA : la bloqueuse est intacte, l’Ifrit
  // est entamé par la riposte.
  const res = rpgLancerAttaque(duel, 'joueur', [ifrit.id], { [ifrit.id]: [tiziri.id] });
  assert.equal(res.ok, true);
  assert.equal(tiziri.pv, 1, 'la protection Braise laisse Tiziri à ses 1 PV');
  assert.equal(ifrit.pv, 1, 'la riposte 2/1 laisse l’Ifrit furtif à 1 PV sur ses 3 PV');
});

test('l’Attaque ciblée ne désigne pas une Tour protégée contre sa couleur', () => {
  // La Tour de neige est une priorité d’attaque rapide, et Fériel (3/2 Braise)
  // la tuerait : elle la frappe en premier — sauf si une protection l’en
  // empêche. C’est le cas de figure où l’ancienne heuristique désignait une
  // cible que le moteur refuse (`protection`), perdant l’attaque du tour.
  const poser = (protection) => {
    const duel = duelNu();
    donnerMana(duel, 'joueur', 20);
    donnerMana(duel, 'sorcier', 20);
    donner(duel, 'joueur', 'tour-de-neige');
    const tour = rpgJouerCreature(duel, 'joueur', 'tour-de-neige').entite;
    Object.assign(tour, { pv: 2, def: 2, ready: false, protection });
    donner(duel, 'sorcier', 'feriel');
    const feriel = rpgJouerCreature(duel, 'sorcier', 'feriel').entite;
    return { duel, tour, feriel };
  };

  const protegee = poser({ contre: 'braise', toursRestants: Infinity });
  assert.deepEqual(rpgCiblesAttaqueRapide(protegee.duel, 'sorcier', [protegee.feriel.id]), {},
    'une Tour protégée contre la Braise n’est pas une cible de l’Attaque ciblée Braise');
  // Rien n’est désigné : l’attaque reste légale, Fériel attaque normalement.
  assert.equal(rpgLancerAttaque(protegee.duel, 'sorcier', [protegee.feriel.id], null, null, null, {}).ok, true);

  // Sans protection, la même Tour est bien la cible : c’est la protection,
  // et elle seule, qui change la décision.
  const nue = poser(null);
  assert.deepEqual(rpgCiblesAttaqueRapide(nue.duel, 'sorcier', [nue.feriel.id]),
    { [nue.feriel.id]: nue.tour.id });
});

test('le Trait de braise ne désigne jamais une créature protégée contre la Braise', () => {
  const duel = duelNu();
  duel.tour = 'sorcier';
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  // Tiziri ne porte plus de protection de Braise (elle s’engage pour du mana
  // désormais) : la protection est attachée à la cible, comme une protection
  // temporaire prêtée par un effet.
  donner(duel, 'joueur', 'fennec-des-decombres');
  const protege = rpgJouerCreature(duel, 'joueur', 'fennec-des-decombres').entite;
  protege.protection = { contre: 'braise', toursRestants: Infinity };
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  donner(duel, 'sorcier', 'trait-de-braise');

  const choix = choisirCarteIA(duel, 'sorcier');
  assert.equal(choix?.cibleId, chien.id,
    'le Trait choisit la seule cible que la protection ne couvre pas');
  assert.notEqual(choix.cibleId, protege.id);

  // Seule la protégée reste sur la table : le Trait part au visage — il ne
  // se jette pas sur l’écran de Braise.
  duel.joueur.creatures = duel.joueur.creatures.filter((entite) => entite.id !== chien.id);
  const choixSeul = choisirCarteIA(duel, 'sorcier');
  if (choixSeul) {
    assert.equal(choixSeul.cibleId, 'sorcier', 'le burn s’adresse au sorcier, jamais à la protégée');
  }
});

test('un sort de zone ne compte ni ne cible les créatures protégées', () => {
  // Table entièrement protégée contre la Braise : le Vent rouge (2 dégâts à
  // toutes les créatures adverses) ne tuerait personne — il reste en main.
  const duel = duelNu();
  duel.tour = 'sorcier';
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'fennec-des-decombres');
  const protege = rpgJouerCreature(duel, 'joueur', 'fennec-des-decombres').entite;
  protege.protection = { contre: 'braise', toursRestants: Infinity };
  donner(duel, 'sorcier', 'vent-rouge');
  assert.equal(choisirCarteIA(duel, 'sorcier'), null,
    'aucune victime possible derrière la protection : le sort reste en main');

  // Une cible vulnérable suffit à rendre le sort rentable.
  donner(duel, 'joueur', 'chien-du-guet');
  rpgJouerCreature(duel, 'joueur', 'chien-du-guet');
  assert.equal(choisirCarteIA(duel, 'sorcier')?.carteId, 'vent-rouge',
    'le Chien 2/2 meurt sous la rafale : le sort vaut son mana');
});

test('une table protégée contre sa couleur n’empêche pas une créature d’arriver', () => {
  // Le Cavalier frappe une créature à son arrivée. Contre une table protégée
  // contre le Sable, il n’a aucune cible légale : le moteur accepte pourtant
  // la pose (l’arrivée ne désigne plus personne), et l’IA ne doit pas garder
  // la carte en main pour autant.
  const duel = duelNu();
  duel.tour = 'sorcier';
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'dune-marchante');
  const dune = rpgJouerCreature(duel, 'joueur', 'dune-marchante').entite;
  dune.protection = { contre: 'sable', toursRestants: Infinity };
  donner(duel, 'sorcier', 'cavalier-amazigh-du-desert');

  assert.equal(rpgEstProtegee(dune, cardColors(cardById('cavalier-amazigh-du-desert'))), true);
  const choix = choisirCarteIA(duel, 'sorcier');
  assert.equal(choix?.carteId, 'cavalier-amazigh-du-desert',
    'le Cavalier entre en jeu sans cible plutôt que de rester en main');
  assert.equal(choix.cibleId ?? null, null, 'aucune créature protégée n’est désignée');
});

// ── Les autres mécaniques du moteur dans la tête du sorcier ─────────────────

test('le venin anti-blocage retire le bloqueur de la liste de l’IA', () => {
  // La Vipère de verre et la lune de Bakunawa laissent la créature en vie mais
  // lui interdisent de bloquer (`empecheBlocageToursRestants`). La proposer
  // quand même fait refuser l’attaque entière par le moteur (`raison:
  // 'bloqueur'`) : le joueur perdait son tour de frappe.
  const duel = duelNu();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  chien.ready = true;
  donner(duel, 'sorcier', 'seigneur-des-machoires');
  const seigneur = jouerGros(duel, 'sorcier').entite;
  seigneur.ready = false;
  seigneur.empecheBlocageToursRestants = 2; // mordu, la défense s'éteint

  // Un 6/6 tuerait le Chien sans mourir : sans l’interdit, l’IA le poserait.
  assert.deepEqual(rpgChoisirBloqueurs(duel, 'joueur', [chien.id]), {},
    'un bloqueur empoisonné n’est jamais proposé');
  const res = rpgLancerAttaque(duel, 'joueur', [chien.id],
    rpgChoisirBloqueurs(duel, 'joueur', [chien.id]));
  assert.equal(res.ok, true, 'l’attaque reste légale — le tour de frappe n’est pas perdu');
  assert.equal(duel.sorcier.pv, RPG_PV_JOUEUR - 2, 'les 2 dégâts passent');

  // Le venin expire : la même créature bloque de nouveau.
  seigneur.empecheBlocageToursRestants = 0;
  duel.tour = 'joueur';
  chien.ready = true;
  chien.attaquee = false;
  assert.deepEqual(rpgChoisirBloqueurs(duel, 'joueur', [chien.id]),
    { [chien.id]: [seigneur.id] }, 'sans venin, le 6/6 bloque à nouveau');
});

test('le Grand Voile blanc : l’IA n’attaque pas pour rien', () => {
  const duel = duelNu();
  duel.tour = 'sorcier';
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'sorcier', 'ifrit-des-ergs');
  const ifrit = rpgJouerCreature(duel, 'sorcier', 'ifrit-des-ergs').entite;
  ifrit.ready = true;
  duel.brouillardCombat = true; // « aucune créature n’inflige de dégâts de combat ce tour »

  assert.deepEqual(rpgChoisirAttaquants(duel, 'sorcier'), [],
    'aucun dégât de combat ne passerait : l’Ifrit reste prêt');
  duel.brouillardCombat = false;
  assert.deepEqual(rpgChoisirAttaquants(duel, 'sorcier'), [ifrit.id],
    'le voile levé, la frappe repart');
});

test('Tenacité : l’IA sait que la créature meurt et revient au tour suivant', () => {
  const tenace = {
    id: 'tenace', carteId: 'seigneur-des-machoires', name: 'Seigneur des mâchoires',
    atk: 6, def: 6, pv: 4, pvMax: 6, bouclier: 0, esquive: 0, tenaciteDisponible: true,
  };
  // L’Ifrit 5/4 frappe 5 sur 4 PV : la Tenacité ne refuse plus la destruction.
  // Le Seigneur meurt, et l’Ifrit meurt de la riposte — un échange létal net.
  assert.deepEqual(resultatBlocage(ifritBraise(), tenace),
    { attaquantMeurt: true, bloqueurMeurt: true, attaquantFurie: 0, bloqueurFurie: 0 },
    'Tenacité ne trompe plus l’IA : les deux combattants meurent');
  // Une créature tenace vaut quand même un peu plus qu'une créature nue : sa
  // carte revient au tour suivant avec 1 point de défense.
  assert.ok(valeurEntite(tenace) > valeurEntite({ ...tenace, tenaciteDisponible: false }),
    'la renaissance promise garde une valeur tactique');

  // Sur la table : le Seigneur meurt en bloquant, sa carte promet son retour.
  const duel = duelNu();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'ifrit-des-ergs');
  const ifrit = rpgJouerCreature(duel, 'joueur', 'ifrit-des-ergs').entite;
  ifrit.ready = true;
  donner(duel, 'sorcier', 'seigneur-des-machoires');
  const seigneur = rpgJouerCreature(duel, 'sorcier', 'seigneur-des-machoires').entite;
  Object.assign(seigneur, { pv: 4, def: 4 });
  assert.deepEqual(rpgChoisirBloqueurs(duel, 'joueur', [ifrit.id]), {},
    'l’IA ne sacrifie plus son 6/6 pour un simple échange : la Tenacité ne le sauve plus');
  // La mort, elle, est bien réelle — et la carte promet son retour au prochain
  // tour de son camp (le sorcier, tué pendant le tour du joueur).
  assert.equal(rpgBlesserCreature(duel, 'sorcier', seigneur.id, 10, 'braise').ok, true);
  assert.equal(duel.sorcier.creatures.includes(seigneur), false, 'le Seigneur meurt');
  assert.ok(duel.sorcier.cimetiere.includes('seigneur-des-machoires'));
  assert.deepEqual(duel.sorcier.retoursProgrammes, [{
    carteId: 'seigneur-des-machoires', toursRestants: 1, tenacite: true,
  }], 'sa renaissance est promise au prochain tour du sorcier');
});

test('le Bouclier de lumière avale la première attaque, l’IA le sait', () => {
  const dame = {
    id: 'dame', carteId: 'dame-aux-ailes-d-or', name: 'La Dame aux ailes d’or',
    atk: 3, def: 5, pv: 5, pvMax: 5, bouclier: 0, esquive: 0, bouclierLumiere: true,
  };
  // 5 dégâts sur 5 PV tueraient la Dame — le bouclier les absorbe.
  assert.deepEqual(resultatBlocage(ifritBraise(), dame),
    { attaquantMeurt: false, bloqueurMeurt: false, attaquantFurie: 0, bloqueurFurie: 0 },
    'le bouclier de lumière éteint la frappe de l’Ifrit');
  assert.equal(resultatBlocage(ifritBraise(), { ...dame, bouclierLumiere: false }).bloqueurMeurt, true,
    'bouclier éteint, la même frappe l’emporte');
});

test('Overkill : le Serpent du monde compte l’excédent qui perce le bloqueur', () => {
  // Le Serpent 6/6 contre un bloqueur 2/2 qui le retient : 4 dégâts filent
  // jusqu’au sorcier. Moteur et IA doivent être d’accord.
  const duel = duelNu();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'serpent-du-monde');
  const serpent = rpgJouerCreature(duel, 'joueur', 'serpent-du-monde').entite;
  serpent.ready = true;
  donner(duel, 'sorcier', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  chien.ready = false;
  assert.equal(serpent.overkill, true, 'le Serpent du monde a bien Overkill');

  // Le blocage est forcé (une Tour doit bloquer) : le Chien 2/2 est interposé.
  const res = rpgLancerAttaque(duel, 'joueur', [serpent.id], { [serpent.id]: [chien.id] });
  assert.equal(res.ok, true);
  assert.equal(res.resume.frappeSorcier, 4, 'l’excédent perce : 4 dégâts au sorcier');
  assert.equal(duel.sorcier.pv, RPG_PV_JOUEUR - 4);
});

test('la Lame de mer est jouée : elle tue ce qu’elle fait tomber sous 1', () => {
  const duel = duelNu();
  duel.tour = 'sorcier';
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  // Le Seigneur arrive d’abord, puis
  // le Chien 2/2 — la Lame de mer le fait tomber à 0/0, elle est détruite.
  donner(duel, 'joueur', 'seigneur-des-machoires'); // 6/6 → 4/4 : survit
  jouerGros(duel, 'joueur');
  donner(duel, 'joueur', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  assert.deepEqual([chien.atk, chien.pv], [2, 2], 'le Chien arrive intact');
  donner(duel, 'sorcier', 'lame-de-mer');

  const choix = choisirCarteIA(duel, 'sorcier');
  assert.equal(choix?.carteId, 'lame-de-mer', 'l’IA joue enfin sa Lame de mer');
  assert.equal(choix.cibleId, chien.id, 'elle vise la créature qu’elle détruit, pas le Seigneur');

  // Le moteur confirme le calcul : le Chien tombe, le Seigneur survit.
  const res = rpgLancerMagie(duel, 'sorcier', 'lame-de-mer', choix.cibleId);
  assert.equal(res.ok, true, 'la Lame de mer se lance sur la cible annoncée');
  assert.equal(duel.joueur.creatures.some((entite) => entite.id === chien.id), false,
    'la victime est détruite à 0 PV');
});

test('la Réanimation ramène le mort qui vaut son mana', () => {
  const duel = duelNu();
  duel.tour = 'sorcier';
  donnerMana(duel, 'sorcier', 20);
  duel.sorcier.cimetiere.push('seigneur-des-machoires');
  donner(duel, 'sorcier', 'reanimation');
  assert.equal(choisirCarteIA(duel, 'sorcier')?.carteId, 'reanimation',
    'un 6/6 au cimetière justifie la Réanimation');

  // Cimetière vide de créature : la carte ne se joue pas.
  const duel2 = duelNu();
  duel2.tour = 'sorcier';
  donnerMana(duel2, 'sorcier', 20);
  duel2.sorcier.cimetiere.push('trait-de-braise'); // une magie, pas une créature
  donner(duel2, 'sorcier', 'reanimation');
  assert.equal(choisirCarteIA(duel2, 'sorcier'), null,
    'aucune créature au cimetière : rien à ramener');
});

test('l’Appât de la meute : l’IA anticipe le blocage obligatoire', () => {
  const duel = duelNu();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'ifrit-des-ergs');
  const ifrit = rpgJouerCreature(duel, 'joueur', 'ifrit-des-ergs').entite;
  ifrit.ready = true;
  donner(duel, 'sorcier', 'dune-marchante');
  const dune = rpgJouerCreature(duel, 'sorcier', 'dune-marchante').entite;
  dune.ready = false;
  // Marquée par l’Appât : elle DOIT bloquer la prochaine attaque du lanceur,
  // même si l’échange est mauvais pour elle.
  dune.blocageForce = { par: 'joueur' };
  assert.deepEqual(rpgChoisirBloqueurs(duel, 'joueur', [ifrit.id]),
    { [ifrit.id]: [dune.id] }, 'le blocage forcé est compté dans la simulation');
});

test('une zone qui réveille des Contre-attaques coûte son prix à l’IA', () => {
  // Niveau Récit : heuristique seule, sans simulation moteur — la pénalité de
  // riposte doit suffire à sortir le sort du classement.
  const niveauRecit = (duel) => { duel.sorcier.ia = { niveau: 'recit' }; };

  // Le Grand Hiver ne griffe qu’à 1 : le survivant renvoie ses dégâts au
  // sorcier, la vague vaut moins que rien. Face à une 2/2 sans Contre-attaque,
  // le même sort reste rentable. Le porteur de la Contre-attaque est ici le roi
  // Kusayla (5/3) : à 1 dégât il survit et riposte à 5.
  let duel = duelNu();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'kusayla-roi-des-imazighen');
  rpgJouerCreature(duel, 'joueur', 'kusayla-roi-des-imazighen');
  donner(duel, 'sorcier', 'grand-hiver');
  niveauRecit(duel);
  assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => 0.5 }), null,
    'le Grand Hiver ne se lance pas dans une Contre-attaque survivante');

  duel = duelNu();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'loup-des-neiges');
  rpgJouerCreature(duel, 'joueur', 'loup-des-neiges');
  donner(duel, 'sorcier', 'grand-hiver');
  niveauRecit(duel);
  assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => 0.5 })?.carteId, 'grand-hiver',
    'sans Contre-attaque en face, le Grand Hiver reste rentable');

  // Embuscade létale : deux Eiriks survivants renvoient 4 dégâts au visage du
  // sorcier (3 PV). La simulation du niveau Normal voit la mort et choisit
  // autre chose.
  duel = duelNu();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'eirik-du-premier-serment');
  rpgJouerCreature(duel, 'joueur', 'eirik-du-premier-serment');
  donner(duel, 'joueur', 'eirik-du-premier-serment');
  rpgJouerCreature(duel, 'joueur', 'eirik-du-premier-serment');
  duel.sorcier.pv = 3;
  donner(duel, 'sorcier', 'embuscade');
  donner(duel, 'sorcier', 'loup-des-neiges');
  assert.notEqual(choisirCarteIA(duel, 'sorcier', { rng: () => 0.5 })?.carteId, 'embuscade',
    'l’IA ne signe pas sa mort en lançant Embuscade dans deux Contre-attaques');

  // Capacité de zone : le Braisier 1/1 blesse l’Eirik (2 PV) qui survit et le
  // tue en riposte — l’IA préfère une créature sans ce risque.
  duel = duelNu();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'eirik-du-premier-serment');
  rpgJouerCreature(duel, 'joueur', 'eirik-du-premier-serment');
  donner(duel, 'sorcier', 'braisier-du-souk');
  donner(duel, 'sorcier', 'loup-des-neiges');
  assert.notEqual(choisirCarteIA(duel, 'sorcier', { rng: () => 0.5 })?.carteId, 'braisier-du-souk',
    'le Braisier ne se pose pas devant une Contre-attaque qui va le tuer');
});
