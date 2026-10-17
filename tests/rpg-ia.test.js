import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RPG_PV_JOUEUR,
  rpgActiverCapacite,
  rpgChoisirAttaquants,
  rpgChoisirBloqueurs,
  rpgCibleAuto,
  rpgCiblesAttaqueRapide,
  rpgJouerCreature,
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
  furieGagnee,
  rpgProfilIA,
  resultatBlocage,
  valeurEntite,
  RPG_NIVEAUX_IA,
  RPG_STYLES_IA,
} from '../src/games/rpgAI.js';
import { cardById } from '../src/games/rpgCards.js';

/** Duel prêt à être joué sans dépendre du mélange : mains vides, tables vides. */
const duelNu = (opts = {}) => rpgNouveauDuel({
  joueurDeck: [],
  sorcierDeck: [],
  rng: () => 0.5,
  ...opts,
});

const donner = (duel, cote, carteId) => duel[cote].main.push(carteId);
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

test('le Coup rapide choisit la cible la plus précieuse, pas la première', () => {
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
  donner(duel, 'joueur', 'colosse-de-sel');
  const grosAttaquant = rpgJouerCreature(duel, 'joueur', 'colosse-de-sel').entite; // 5/5
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
  donner(duel, 'joueur', 'colosse-de-sel');
  const grosAttaquant = rpgJouerCreature(duel, 'joueur', 'colosse-de-sel').entite; // 5/5
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
  assert.deepEqual(RPG_NIVEAUX_IA, ['recit', 'normale', 'veilleur']);
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

/** Attaquant témoin : mêmes statistiques que le Jarl (4/4), aucune Furie. */
const attaquantTemoin = () => ({
  id: 'cavalier-temoin', carteId: 'cavalier-amazigh-du-desert', name: 'Cavalier témoin',
  atk: 4, def: 4, pv: 4, pvMax: 4, bouclier: 0, esquive: 0, ready: true, attaquee: false,
});

const defenseurSousLeCoup = (duel) => {
  donner(duel, 'joueur', 'dune-marchante');
  const dune = rpgJouerCreature(duel, 'joueur', 'dune-marchante').entite;
  duel.joueur.pv = 8; // menace imminente : la pression autorise les blocages
  return dune;
};

test('l’IA connaît la Furie : entamer un viking sans le tuer le nourrit', () => {
  // Une attaque entièrement absorbée n’est pas une blessure…
  const garde = { id: 'g', carteId: 'jarl-au-marteau-de-guerre', atk: 4, def: 4, pv: 4, pvMax: 4, bouclier: 3, esquive: 0 };
  assert.equal(blessureNette(garde, 2), 0, 'le bouclier absorbe tout : aucune furie');
  assert.equal(furieGagnee(garde, blessureNette(garde, 2)), 0);
  // …alors qu’un coup qui passe laisse la créature entrer en furie.
  assert.equal(blessureNette(garde, 5), 2);
  assert.equal(furieGagnee(garde, blessureNette(garde, 5)), 3, 'Furie 3 : +3/+3 pour le Jarl');
  // Une créature sans Furie ne gagne rien, et une morte non plus.
  const cavalier = attaquantTemoin();
  assert.equal(furieGagnee(cavalier, 2), 0);
  assert.equal(furieGagnee(garde, 0), 0);
  // Une Furie déjà enflammée ne promet plus rien : une seule flambée.
  assert.equal(furieGagnee({ ...garde, furieDeclenchee: true }, 2), 0,
    'Furie déjà passée : plus rien à gagner');

  // L’échange simulé rapporte le gain : 4/4 des deux côtés, mais un seul
  // grandit — le bloqueur qui survit blessé et le viking qui encaisse.
  const jarl = { ...garde, bouclier: 0 };
  const dune = { id: 'd', carteId: 'dune-marchante', atk: 2, def: 5, pv: 5, pvMax: 5, bouclier: 0, esquive: 0 };
  assert.deepEqual(resultatBlocage(jarl, dune),
    { attaquantMeurt: false, bloqueurMeurt: false, attaquantFurie: 3, bloqueurFurie: 0 });
  assert.deepEqual(resultatBlocage(cavalier, dune),
    { attaquantMeurt: false, bloqueurMeurt: false, attaquantFurie: 0, bloqueurFurie: 0 },
    'un corps sans Furie ne profite pas de la blessure');

  // Sur la table : à statistiques égales, le viking entamé fait refuser le
  // blocage que le témoin identique accepte — la seule différence est la Furie.
  const duelFurieux = duelNu();
  donnerMana(duelFurieux, 'joueur', 40);
  donnerMana(duelFurieux, 'sorcier', 40);
  const duneContreJarl = defenseurSousLeCoup(duelFurieux);
  donner(duelFurieux, 'sorcier', 'jarl-au-marteau-de-guerre');
  const jarlEnJeu = rpgJouerCreature(duelFurieux, 'sorcier', 'jarl-au-marteau-de-guerre').entite;
  jarlEnJeu.ready = true;
  assert.deepEqual(rpgChoisirBloqueurs(duelFurieux, 'sorcier', [jarlEnJeu.id]), {},
    'l’IA refuse d’écorner le Jarl : elle ne lui offrirait que +3/+3');
  assert.equal(duneContreJarl.atk, 2, 'le bloqueur reste en réserve');

  const duelTemoin = duelNu();
  donnerMana(duelTemoin, 'joueur', 40);
  donnerMana(duelTemoin, 'sorcier', 40);
  const duneTemoin = defenseurSousLeCoup(duelTemoin);
  const temoin = attaquantTemoin();
  duelTemoin.sorcier.creatures.push(temoin);
  assert.deepEqual(rpgChoisirBloqueurs(duelTemoin, 'sorcier', [temoin.id]),
    { [temoin.id]: [duneTemoin.id] },
    'mêmes 4/4 sans Furie : l’échange devient acceptable et l’IA bloque');
});

test('l’IA connaît la Résonance : une valkyrie vaut plus que ses seules statistiques', () => {
  // Deux 3/3 sur la table : le Djinn arrivé en premier, la Valkyrie ensuite.
  const duel = duelNu();
  const djinn = { id: 'djinn', carteId: 'djinn-du-souk', name: 'Djinn du souk', atk: 3, def: 3, pv: 3, pvMax: 3, bouclier: 0, esquive: 0, ready: true, attaquee: false };
  const valkyrie = { id: 'valkyrie', carteId: 'valkyrie-au-corbeau', name: 'Valkyrie au corbeau', atk: 3, def: 3, pv: 3, pvMax: 3, bouclier: 0, esquive: 0, ready: true, attaquee: false };
  duel.joueur.creatures.push(djinn, valkyrie);
  // Sans son aura, la Valkyrie vaudrait moins que le Djinn : c’est la
  // Résonance — le renfort de toute la Neige — qui renverse le classement.
  assert.ok(valeurEntite(valkyrie) > valeurEntite(djinn) - 0.001,
    'l’aura de la Valkyrie compte dans sa valeur');
  assert.equal(rpgCibleAuto(duel, 'sorcier', cardById('trait-de-braise')), 'valkyrie',
    'le Trait de braise tue la source de Résonance plutôt que le 3/3 nu');
});

test('l’IA sait convertir son mana de glace en foudre activée', () => {
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

  const coup = choisirActivationIA(duel, 'sorcier');
  assert.ok(coup, 'une proie à abattre vaut son mana de glace');
  assert.deepEqual(coup, { entiteId: 'pere', cibleId: 'chien' });
  assert.equal(rpgActiverCapacite(duel, 'sorcier', coup.entiteId, coup.cibleId).ok, true);
  assert.equal(duel.joueur.creatures.includes(chien), false,
    'la foudre abat le Chien 2/2');

  // Sans mana de glace, la capacité reste au fourreau.
  donnerMana(duel, 'sorcier', 4);
  duel.sorcier.mana.neige = 0;
  assert.equal(choisirActivationIA(duel, 'sorcier'), null,
    'pas de mana de glace, pas de foudre');
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
  assert.ok(chien.empecheBlocageToursRestants > 0, 'la victime ne peut plus bloquer');

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
