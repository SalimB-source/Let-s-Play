/**
 * Partie guidée du Sablier : une main reproductible et un adversaire passif
 * permettent d'apprendre les actions sans dépendre d'une pioche aléatoire.
 */
import { RPG_DECK_JOUEUR_BASE } from './rpgCards.js';

export const RPG_TUTORIAL_PLAYER_DECK = RPG_DECK_JOUEUR_BASE;
export const RPG_TUTORIAL_OPPONENT_DECK = Object.freeze(Array(40).fill('montagne'));
export const RPG_TUTORIAL_OPENING_HAND = Object.freeze([
  'desert',
  'tislit-des-aures',
  'fennec-des-decombres',
  'rapport-du-greffier',
  'tempete-de-sable',
]);

/**
 * Le moteur conserve une vraie partie de 40 cartes ; on ne fait que remettre
 * cinq cartes connues en main pour que les étapes guidées soient toujours
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
  // La main adverse est aussi connue : elle ne contient que des terrains, donc
  // le sorcier ne peut ni lancer de sort ni attaquer pendant la démonstration.
  replacerMain(duel.sorcier, Array(5).fill('montagne'));
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
    text: 'Votre main contient cinq cartes. Le coût et les symboles indiquent ce qu’il faut payer ; les cartes jouables ont un halo doré. L’exercice utilise une main préparée pour vous guider.',
    nextLabel: 'Poser un terrain',
    side: 'top',
  },
  {
    id: 'terrain',
    kind: 'action',
    target: '[data-tutorial-target="terrain-card"]',
    eyebrow: 'ÉTAPE 2 · TERRAIN',
    title: 'Posez votre terrain',
    text: 'Touchez la carte Désert encadrée pour la poser. Vous ne pouvez jouer qu’un seul terrain pendant votre tour.',
    side: 'top',
  },
  {
    id: 'mana',
    kind: 'action',
    target: '[data-tutorial-target="mana-terrain"]',
    eyebrow: 'ÉTAPE 3 · MANA',
    title: 'Produisez du mana',
    text: 'Touchez le Désert posé pour l’engager : il produit un mana Sable. Un terrain engagé ne produit plus jusqu’à ce qu’il se dégage au prochain tour. Le jeu peut aussi engager vos terrains automatiquement pour payer une carte.',
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
    text: 'Touchez « Fin du tour ». Le mana non dépensé disparaît ; au début de votre prochain tour, vos terrains se dégagent, vous piochez une carte et vos créatures deviennent prêtes.',
    side: 'top',
  },
  {
    id: 'tour-adverse',
    kind: 'waiting',
    target: '[data-tutorial-target="enemy-field"]',
    eyebrow: 'LE TOUR DU SORCIER',
    title: 'Observez son tour',
    text: 'Le sorcier joue maintenant. Dans cette partie d’entraînement, il ne pose que des terrains afin que vous puissiez apprendre sans pression.',
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
    text: 'Vous connaissez les gestes essentiels : poser un terrain, produire du mana, jouer une créature, passer le tour et attaquer. La partie d’entraînement reste ouverte pour essayer librement.',
    nextLabel: 'Continuer la partie',
    side: 'top',
  },
]);
