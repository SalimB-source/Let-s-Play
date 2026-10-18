/**
 * Partie guidée du Sablier : une main reproductible et un adversaire passif
 * permettent d'apprendre les actions sans dépendre d'une pioche aléatoire.
 */
import { RPG_DECK_JOUEUR_BASE } from './rpgCards.js';

export const RPG_TUTORIAL_PLAYER_DECK = [...RPG_DECK_JOUEUR_BASE];
export const RPG_TUTORIAL_OPPONENT_DECK = Object.freeze([...RPG_DECK_JOUEUR_BASE]);
export const RPG_TUTORIAL_OPPONENT_HAND = Object.freeze(['amani-des-ksour', 'cavalier-amazigh-du-desert', 'tempete-de-sable']);
export const RPG_TUTORIAL_OPENING_HAND = Object.freeze([
  'tislit-des-aures',
  'fennec-des-decombres',
  'chien-du-guet',
]);

/**
 * Le moteur conserve une partie de 30 cartes ; on ne fait que remettre
 * trois cartes connues en main pour que les étapes guidées soient toujours
 * possibles. Le reste du paquet et le tirage de l'adversaire restent intacts.
 */
export function preparerDuelTutoriel(duel) {
  if (!duel?.joueur || !duel?.sorcier) throw new TypeError('Un duel complet est nécessaire pour préparer le tutoriel.');

  const replacerMain = (camp, cartes) => {
    const paquet = [...camp.deck, ...camp.main];
    const main = cartes.map((carteId) => {
      const index = paquet.indexOf(carteId);
      if (index < 0) throw new Error(`La carte « ${carteId} » manque au deck du tutoriel.`);
      return paquet.splice(index, 1)[0];
    });
    camp.main = main;
    camp.deck = paquet;
  };

  replacerMain(duel.joueur, RPG_TUTORIAL_OPENING_HAND);
  // La main adverse est aussi connue : elle ne contient que des magies coûteuses, donc
  // le sorcier ne peut ni lancer de sort ni attaquer pendant la démonstration.
  replacerMain(duel.sorcier, RPG_TUTORIAL_OPPONENT_HAND);
  // La première pioche adverse reste coûteuse, quel que soit le mélange.
  const suivant = duel.sorcier.deck.findIndex((id) => id === 'dune-marchante');
  if (suivant >= 0) duel.sorcier.deck.push(...duel.sorcier.deck.splice(suivant, 1));
  duel.mainDepart = { joueur: duel.joueur.main.length, sorcier: duel.sorcier.main.length };
  duel.mulliganFait = { joueur: true, sorcier: true };
  return duel;
}

export const RPG_TUTORIAL_STEPS = Object.freeze([
  {
    id: 'bienvenue',
    kind: 'info',
    target: '[data-tutorial-target="opponent-health"]',
    eyebrow: 'LE DUEL · OBJECTIF',
    title: 'Bienvenue dans le Sablier',
    text: 'Faites tomber les points de vie du sorcier à zéro avant qu’il ne vide les vôtres. Cette partie guidée vous fera jouer un premier tour, pas à pas.',
    nextLabel: 'Découvrir ma main',
    side: 'bottom',
  },
  {
    id: 'main',
    kind: 'info',
    target: '[data-tutorial-target="hand"]',
    eyebrow: 'ÉTAPE 1 · VOTRE MAIN',
    title: 'Vos cartes, vos options',
    text: 'Votre main contient trois cartes. Le coût et les symboles indiquent ce qu’il faut payer ; les cartes jouables s’allument d’un halo — bleu pour une créature, or pour une Magie Rapide, violet pour une Sorcellerie. L’exercice utilise une main préparée pour vous guider.',
    nextLabel: 'Comprendre le mana',
    side: 'top',
  },
  {
    id: 'mana',
    kind: 'info',
    target: '[data-tutorial-target="mana-track"]',
    eyebrow: 'ÉTAPE 2 · MANA AUTOMATIQUE',
    title: 'Un mana de plus à chaque tour',
    text: 'Aucun terrain à poser ni à engager. Votre réserve se recharge à chaque tour et gagne un mana, jusqu’à dix. En mono-Sable, sa couleur est automatique ; avec plusieurs couleurs, vous choisissez la nouvelle couleur. Votre premier mana est déjà disponible.',
    nextLabel: 'Jouer une créature',
    side: 'top',
  },
  {
    id: 'creature',
    kind: 'action',
    target: '[data-tutorial-target="creature-card"]',
    eyebrow: 'ÉTAPE 4 · CRÉATURE',
    title: 'Jouez une créature',
    text: 'Tislit coûte un mana Sable. Touchez la carte encadrée pour la jouer : le mana déjà produit paie son coût.',
    side: 'top',
  },
  {
    id: 'invocation',
    kind: 'info',
    target: '[data-tutorial-target="played-creature"]',
    eyebrow: 'RÈGLE · ARRIVÉE EN JEU',
    title: 'Le mal d’invocation',
    text: 'Une créature ne peut généralement pas attaquer le tour où elle arrive, mais elle peut déjà bloquer. La capacité Rapidité est une exception : elle permet d’attaquer immédiatement.',
    nextLabel: 'Terminer mon tour',
    side: 'top',
  },
  {
    id: 'fin-tour',
    kind: 'action',
    target: '[data-tutorial-target="end-turn"]',
    eyebrow: 'ÉTAPE 5 · FIN DU TOUR',
    title: 'Passez la main',
    text: 'Touchez « Fin du tour ». Au prochain tour, votre réserve se recharge et gagne un mana, vous piochez une carte et vos créatures deviennent prêtes. En fin de tour, défaussez les cartes au-delà de cinq en main. Le champ accueille cinq créatures : en poser une sixième demande un sacrifice.',
    side: 'top',
  },
  {
    id: 'tour-adverse',
    kind: 'waiting',
    target: '[data-tutorial-target="enemy-field"]',
    eyebrow: 'LE TOUR DU SORCIER',
    title: 'Observez son tour',
    text: 'Le sorcier joue maintenant. Dans cette partie d’entraînement, il attend de pouvoir lancer ses magies afin que vous puissiez apprendre sans pression.',
    side: 'bottom',
  },
  {
    id: 'attaque',
    kind: 'action',
    target: '[data-tutorial-target="attack-all"]',
    eyebrow: 'ÉTAPE 6 · ATTAQUE',
    title: 'Déclarez vos attaquants',
    text: 'Votre créature est maintenant prête. Cliquez sur « Attaquer avec tous » pour déclarer vos créatures prêtes ; vous pouvez aussi les sélectionner une par une sur le champ de bataille.',
    side: 'top',
  },
  {
    id: 'confirmer-attaque',
    kind: 'action',
    target: '[data-tutorial-target="confirm-attack"]',
    eyebrow: 'ÉTAPE 7 · COMBAT',
    title: 'Confirmez l’attaque',
    text: 'Vérifiez les créatures déclarées, puis confirmez. En défense, le sorcier peut assigner ses bloqueurs : les créatures bloquées s’infligent leurs dégâts de combat.',
    side: 'top',
  },
  {
    id: 'combat',
    kind: 'info',
    target: '[data-tutorial-target="opponent-health"]',
    eyebrow: 'RÈGLE · POINTS DE VIE',
    title: 'Une attaque sans bloqueur',
    text: 'Sans bloqueur, les dégâts touchent directement le sorcier et font baisser ses points de vie. Le premier camp dont les points de vie atteignent zéro perd le duel.',
    nextLabel: 'Comprendre les magies',
    side: 'bottom',
  },
  {
    id: 'magies',
    kind: 'info',
    target: '[data-tutorial-target="hand"]',
    eyebrow: 'RÈGLE · MAGIES',
    title: 'Les sorts ont leurs propres règles',
    text: 'Les magies paient aussi leur coût et rejoignent le cimetière après résolution. Un rituel se joue pendant votre tour ; un éphémère peut aussi répondre à une annonce ou à un combat adverse.',
    nextLabel: 'Terminer le tutoriel',
    side: 'top',
  },
  {
    id: 'termine',
    kind: 'complete',
    target: '[data-tutorial-target="player-field"]',
    eyebrow: 'BASES ACQUISES',
    title: 'À vous de jouer',
    text: 'Vous connaissez les gestes essentiels : gérer votre mana automatique, jouer une créature, passer le tour et attaquer. La partie d’entraînement reste ouverte pour essayer librement.',
    nextLabel: 'Continuer la partie',
    side: 'top',
  },
]);
