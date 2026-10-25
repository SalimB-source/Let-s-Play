/**
 * Les tutoriels du Sablier.
 *
 * Cinq leçons, une par archétype : les fondations du duel, la Marée des
 * abysses (Eau, magies et contres), la Balance des Heures (Ténèbres, effets de
 * créature), le Serment du Soleil rouge (Samouraïs, Résonance et Bannière) et
 * le Serment des Neuf Hivers (Neige, gel et Furie).
 *
 * Une leçon est une **partie d'entraînement scriptée** : une main connue, une
 * réserve de mana préparée, un adversaire passif et une suite d'étapes qui
 * suivent les gestes réels du duel. Les définitions restent des données pures ;
 * la page ne connaît que les événements qu'elle émet (`creature-jouee`,
 * `magie-lancee`, `bloqueur-assigne`…) et les conditions d'attente qu'elle sait
 * observer (`tour-joueur`, `annonce`, `combat-adverse`).
 *
 * Trois principes :
 *
 * 1. **Aucune pioche surprise** : les cartes utiles sont placées en main ou
 *    en haut du paquet par `preparerDuelTutoriel` ;
 * 2. **Aucun adversaire taquin** : sa main ne contient que les cartes de la
 *    démonstration et son paquet ne fournit que des cartes trop chères pour
 *    son mana ;
 * 3. **Une récompense par leçon** : `reward` est versé par la bourse
 *    (`reclamerRecompenseTutoriel`) et retenu dans le portefeuille.
 */
import { RPG_DECKS, RPG_DECK_JOUEUR_BASE, cardById } from './rpgCards.js';
import { rpgJouerCreature } from './rpgDuel.js';

const deckParId = (id) => RPG_DECKS.find((deck) => deck.id === id) ?? null;
const cartesDuDeck = (id) => [...(deckParId(id)?.cardIds ?? RPG_DECK_JOUEUR_BASE)];

/** La première leçon garde les alias historiques du tutoriel débutant. */
const FONDATIONS = 'fondations-du-sablier';

/** Place une main exacte, sans dupliquer les cartes déjà en main ou au paquet. */
function preparerMain(camp, ids) {
  if (!camp) return;
  const disponible = [...camp.deck, ...camp.main];
  const main = [];
  for (const id of ids ?? []) {
    const index = disponible.indexOf(id);
    // Une main de leçon est une convention : si la carte n'existe plus dans
    // cette version du deck, on ne fait pas échouer tout le tutoriel.
    if (index < 0) continue;
    main.push(disponible.splice(index, 1)[0]);
  }
  camp.main = main;
  camp.deck = disponible;
}

/**
 * Place une suite de pioches en haut du paquet. `rpgPiocher` dépile la fin du
 * tableau : la première carte demandée doit donc être la **dernière** poussée.
 * Les cartes absentes du paquet sont ignorées.
 */
function preparerPioches(camp, ids) {
  if (!camp) return;
  for (const id of ids ?? []) {
    const index = camp.deck.indexOf(id);
    if (index >= 0) camp.deck.splice(index, 1);
  }
  camp.deck.push(...[...(ids ?? [])].reverse());
}

/** Pose une créature sur un champ sans passer par la main du joueur. */
function poserCreatureSurChamp(duel, cote, cardId, { ready = false } = {}) {
  const camp = duel[cote];
  const carte = cardById(cardId);
  if (!carte || !camp) return null;
  const mainAvant = camp.main;
  const manaAvant = { ...camp.mana };
  const choixManaAvant = camp.manaChoixEnAttente;
  // Le coût est payé puis remboursé : la scène de leçon n'a pas à vider la
  // réserve du camp qui la reçoit.
  const cout = Number(carte.cost) || 0;
  const couleurs = Array.isArray(carte.colors)
    ? carte.colors
    : [carte.element].filter(Boolean);
  for (const couleur of couleurs) camp.mana[couleur] = Math.max(camp.mana[couleur] ?? 0, cout);
  camp.main = [cardId];
  // Une scène peut précéder le choix du mana d’essai : ce choix appartient
  // toujours à l’interaction suivante, pas à la mise en place silencieuse.
  camp.manaChoixEnAttente = false;
  const res = rpgJouerCreature(duel, cote, cardId, null, { cibleDifferee: true });
  camp.main = mainAvant;
  camp.mana = manaAvant;
  camp.manaChoixEnAttente = choixManaAvant;
  if (!res.ok) return null;
  if (res.entite) {
    res.entite.ready = ready;
    res.entite.attaquee = false;
  }
  if (duel.arriveeEnAttente?.entiteId === res.entite?.id) duel.arriveeEnAttente = null;
  return res.entite;
}

/** Ajoute un mana initial à un camp, sans dépasser les dix sources du mode. */
function installerMana(camp, mana, plafond = 10) {
  if (!camp || !mana) return;
  for (const [couleur, montant] of Object.entries(mana)) {
    const n = Math.max(0, Math.min(plafond, Math.floor(Number(montant) || 0)));
    if (!n) continue;
    camp.manaMax = { ...(camp.manaMax ?? {}), [couleur]: n };
    camp.mana = { ...(camp.mana ?? {}), [couleur]: n };
    camp.manaSources = Array.from({ length: n }, () => couleur);
    camp.manaChoixEnAttente = false;
  }
}

/** Une leçon par archétype : le choix du menu « Apprendre à jouer ». */
export const RPG_TUTORIELS = Object.freeze([
  {
    id: FONDATIONS,
    name: 'Les Fondations du Sablier',
    eyebrow: 'PREMIER DUEL',
    level: 'Débutant',
    duration: '≈ 10 min',
    icon: '⌛',
    deckId: 'veilleurs-du-desert',
    deckName: 'Veilleurs du Désert',
    element: 'sable',
    reward: 120,
    tagline: 'Le tour complet, du mana à l’attaque, sans oublier les bloqueurs ni les armes.',
    description: 'La leçon complète pour tenir une table : mana automatique, main de départ, mal d’invocation, pioche de début de tour, attaque, défense, équipements et limite de cinq créatures. La partie guidée joue un vrai tour, puis laisse le sorcier attaquer pour apprendre à bloquer.',
    opponentDeckId: 'veilleurs-du-desert',
    opponentName: 'Sorcier d’entraînement',
    openingHand: ['tislit-des-aures', 'chien-du-guet', 'fennec-des-decombres'],
    playerDraws: ['sandales-de-tislit', 'rapport-du-greffier', 'tempete-de-sable'],
    opponentHand: ['tempete-de-sable', 'cavalier-amazigh-du-desert', 'tempete-de-sable'],
    opponentDraws: [],
    opponentMana: { sable: 1 },
    opponentDeckFill: 'tempete-de-sable',
    steps: [
      {
        id: 'bienvenue',
        kind: 'info',
        target: '[data-tutorial-target="opponent-health"]',
        eyebrow: 'LE DUEL · OBJECTIF',
        title: 'Bienvenue dans le Sablier',
        text: 'Faites tomber les points de vie du sorcier à zéro avant qu’il ne vide les vôtres. Cette leçon suit un vrai tour, pas à pas, puis vous montre comment défendre. Prenez le temps : l’adversaire d’entraînement est patient.',
        nextLabel: 'Découvrir ma main',
        side: 'bottom',
      },
      {
        id: 'main',
        kind: 'info',
        target: '[data-tutorial-target="hand"]',
        eyebrow: 'ÉTAPE 1 · VOTRE MAIN',
        title: 'Vos cartes, vos options',
        text: 'Votre main de départ contient trois cartes. Le coût et les symboles indiquent ce qu’il faut payer ; les cartes jouables s’allument d’un halo. La main est triée par coût croissant de gauche à droite et ne peut pas dépasser six cartes à la fin de votre tour.',
        nextLabel: 'Comprendre le mana',
        side: 'top',
      },
      {
        id: 'mana',
        kind: 'info',
        target: '[data-tutorial-target="mana-track"]',
        eyebrow: 'ÉTAPE 2 · MANA AUTOMATIQUE',
        title: 'Un mana de plus à chaque tour',
        text: 'Aucun terrain à poser ni à engager. Votre réserve se recharge à chaque tour et gagne un mana, jusqu’à dix. En mono-couleur, sa couleur est automatique ; avec plusieurs couleurs, vous choisirez la nouvelle couleur. Votre premier mana est déjà disponible.',
        nextLabel: 'Jouer une créature',
        side: 'top',
      },
      {
        id: 'creature',
        kind: 'action',
        target: '.rpg-hand__card[data-card-id="tislit-des-aures"]',
        eyebrow: 'ÉTAPE 3 · CRÉATURE',
        title: 'Jouez une créature',
        text: 'Tislit coûte un mana Sable. Touchez la carte encadrée pour la jouer : le mana déjà produit paie son coût. À son arrivée, Tislit vous fait piocher une carte.',
        on: 'creature-jouee',
        cardId: 'tislit-des-aures',
        side: 'top',
      },
      {
        id: 'invocation',
        kind: 'info',
        target: '.card-row--equipe .rpg-card[data-card-id="tislit-des-aures"]',
        eyebrow: 'RÈGLE · ARRIVÉE EN JEU',
        title: 'Le mal d’invocation',
        text: 'Une créature ne peut généralement pas attaquer le tour où elle arrive, mais elle peut déjà bloquer. La capacité Rapidité est l’exception : elle permet d’attaquer immédiatement. Au début de votre prochain tour, toutes vos créatures se dégagent et redeviennent prêtes.',
        nextLabel: 'Voir les emplacements',
        side: 'top',
      },
      {
        id: 'cinq-creatures',
        kind: 'info',
        target: '.rpg-creature-slots--joueur',
        eyebrow: 'RÈGLE · LE CHAMP',
        title: 'Cinq créatures au maximum',
        text: 'Chaque camp dispose de cinq emplacements, dessinés sous sa rangée. En partie, après avoir choisi une créature de votre main, vous cliquez la case libre où elle entre en jeu — ou vous l’y glissez directement. Poser une sixième créature ne l’ajoute pas : le jeu vous demande d’en sacrifier une pour libérer sa place. Le champ est plein à cinq, jamais plus.',
        nextLabel: 'Passer la main',
        side: 'top',
      },
      {
        id: 'fin-tour',
        kind: 'action',
        target: '[data-tutorial-target="end-turn"]',
        eyebrow: 'ÉTAPE 4 · FIN DU TOUR',
        title: 'Passez la main',
        text: 'Touchez « Fin du tour ». Le sorcier joue ensuite : dans cet entraînement, il n’a rien de jouable et laisse passer son tour pour vous laisser observer. À la fin de votre tour, les cartes au-delà de six en main sont défaussées.',
        on: 'fin-de-tour',
        side: 'top',
      },
      {
        id: 'tour-adverse',
        kind: 'waiting',
        target: '[data-tutorial-target="enemy-field"]',
        waitFor: 'tour-joueur',
        eyebrow: 'LE TOUR DU SORCIER',
        title: 'Observez son tour',
        text: 'Le sorcier prépare son mana et passe. Votre tour revient : c’est le moment de regarder ce que le début de tour vous rend.',
        side: 'bottom',
      },
      {
        id: 'pioche',
        kind: 'info',
        target: '[data-tutorial-target="hand"]',
        eyebrow: 'RÈGLE · DÉBUT DE TOUR',
        title: 'La pioche de début de tour',
        text: 'Au début de chaque tour, vous piochez une carte — ici, le Rapport du greffier. Votre réserve se recharge et gagne un mana (vous en avez maintenant deux), et vos créatures se dégagent. Ces trois choses arrivent automatiquement, avant votre phase principale.',
        nextLabel: 'Déclarer l’attaque',
        side: 'top',
      },
      {
        id: 'attaque',
        kind: 'action',
        target: '[data-tutorial-target="attack-all"]',
        eyebrow: 'ÉTAPE 5 · PHASE D’ATTAQUE',
        title: 'Déclarez vos attaquants',
        text: 'Votre créature est maintenant prête. Touchez « Attaquer avec tous » pour déclarer vos créatures prêtes — ici, Tislit seule. Vous pouvez aussi les sélectionner une par une sur le champ. Une seule phase d’attaque par tour.',
        on: 'attaque-declaree',
        side: 'top',
      },
      {
        id: 'confirmer-attaque',
        kind: 'action',
        target: '[data-tutorial-target="confirm-attack"]',
        eyebrow: 'ÉTAPE 6 · COMBAT',
        title: 'Confirmez l’attaque',
        text: 'Vérifiez les créatures déclarées, puis confirmez. En défense, le sorcier peut assigner ses bloqueurs : une créature bloquée s’arrête et les deux camps s’infligent leurs dégâts de combat. Sans bloqueur, les dégâts touchent directement le sorcier.',
        on: 'attaque-confirmee',
        side: 'top',
      },
      {
        id: 'combat',
        kind: 'info',
        target: '[data-tutorial-target="opponent-health"]',
        eyebrow: 'RÈGLE · POINTS DE VIE',
        title: 'Une attaque sans bloqueur',
        text: 'Sans bloqueur, les dégâts touchent directement le sorcier et font baisser ses points de vie. Le premier camp dont les points de vie atteignent zéro perd le duel. Ici, Tislit a infligé 1 dégât.',
        nextLabel: 'Équiper une arme',
        side: 'bottom',
      },
      {
        id: 'arme',
        kind: 'action',
        target: '.rpg-hand__card[data-card-id="sandales-de-tislit"]',
        eyebrow: 'ÉTAPE 7 · ARME',
        title: 'Une arme se porte',
        text: 'Les armes ne se posent pas sur la table : elles s’attachent à une créature alliée et lui donnent un bonus. Les Sandales de Tislit coûtent un mana et donnent +0/+1 et Rapidité. Touchez la carte encadrée.',
        on: 'arme-choisie',
        cardId: 'sandales-de-tislit',
        side: 'top',
      },
      {
        id: 'arme-cible',
        kind: 'action',
        target: '.card-row--equipe .rpg-card[data-card-id="tislit-des-aures"]',
        eyebrow: 'ÉTAPE 8 · PORTEUR',
        title: 'Choisissez le porteur',
        text: 'Touchez maintenant Tislit : elle portera les Sandales. Une arme reste attachée à sa créature ; si le porteur meurt, l’arme rejoint le cimetière avec lui. Rapidité lui permettra d’attaquer immédiatement les prochains tours.',
        on: 'arme-equipee',
        cardId: 'sandales-de-tislit',
        side: 'top',
      },
      {
        id: 'arme-portee',
        kind: 'info',
        target: '.card-row--equipe .rpg-card[data-card-id="tislit-des-aures"]',
        eyebrow: 'RÈGLE · ÉQUIPEMENT',
        title: 'L’arme suit sa créature',
        text: 'Les bonus de l’arme sont déjà comptés sur la carte du porteur : Tislit est maintenant 1/2 et possède Rapidité. Certaines armes ont aussi des déclencheurs : le Harnais du méhari produit du mana quand le porteur attaque, le Licou pioche quand le porteur meurt, la Takouba récompense chaque blessure infligée.',
        nextLabel: 'Laisser attaquer le sorcier',
        side: 'top',
      },
      {
        id: 'fin-tour-2',
        kind: 'action',
        target: '[data-tutorial-target="end-turn"]',
        prepare: { stagePlayer: ['chien-du-guet'] },
        eyebrow: 'ÉTAPE 9 · DÉFENSE',
        title: 'Laissez venir l’assaut',
        text: 'Un Chien du guet, gardé en réserve, rejoint votre champ pour la défense — il n’a pas attaqué et pourra bloquer. Terminez votre tour : le sorcier va envoyer une petite créature, et cette fois vous devrez choisir un bloqueur.',
        on: 'fin-de-tour',
        side: 'top',
      },
      {
        id: 'blocage-adverse',
        kind: 'waiting',
        target: '[data-tutorial-target="enemy-field"]',
        waitFor: 'combat-adverse',
        forceOpponentAttack: true,
        prepare: { stageOpponent: ['chien-de-sable'] },
        eyebrow: 'PHASE DE BLOCAGE',
        title: 'Le sorcier attaque',
        text: 'Un Chien de sable 1/1 est déclaré attaquant. Tislit a déjà attaqué ce tour-ci : elle ne peut pas bloquer. Votre Chien du guet, lui, n’a pas attaqué et se tient prêt. La défense se joue après l’attaque, jamais avant.',
        side: 'bottom',
      },
      {
        id: 'blocage',
        kind: 'action',
        target: '.card-row--equipe .rpg-card[data-card-id="chien-du-guet"]',
        eyebrow: 'ÉTAPE 10 · LE BLOCAGE',
        title: 'Désignez votre bloqueur',
        text: 'Touchez votre Chien du guet pour le sélectionner comme bloqueur. Une créature qui bloque s’arrête devant l’attaquant : les deux s’infligent leurs dégâts de combat, et les dégâts ne passent pas au sorcier.',
        on: 'bloqueur-selectionne',
        side: 'top',
      },
      {
        id: 'blocage-cible',
        kind: 'action',
        target: '.card-row--ennemi .rpg-card[data-card-id="chien-de-sable"]',
        eyebrow: 'ÉTAPE 11 · ASSIGNATION',
        title: 'Assignez le blocage',
        text: 'Touchez maintenant la créature attaquante pour lui opposer votre Chien du guet. Vous pouvez aussi glisser le bloqueur sur l’attaquant, à la souris comme au doigt. Un bloqueur ne participe qu’à un seul combat par tour.',
        on: 'bloqueur-assigne',
        side: 'bottom',
      },
      {
        id: 'blocage-confirmer',
        kind: 'action',
        target: '[data-tutorial-target="resolve-combat"]',
        eyebrow: 'ÉTAPE 12 · RÉSOLUTION',
        title: 'Résolvez le combat',
        text: 'Le blocage est assigné. Touchez « Résoudre le combat » : les dégâts partent en même temps. Votre Chien du guet, 2/2, encaisse 1 dégât et survit ; le Chien de sable, 1/1, est détruit. Vous ne perdez aucun point de vie.',
        on: 'combat-adverse-resolu',
        side: 'top',
      },
      {
        id: 'blocage-explique',
        kind: 'info',
        target: '.card-row--equipe .rpg-card[data-card-id="chien-du-guet"]',
        eyebrow: 'RÈGLE · ATTAQUE ET BLOCAGE',
        title: 'Attaquer n’est pas bloquer',
        text: 'Une créature déclarée attaquante ne peut pas bloquer pendant le tour adverse. Une créature qui bloque ne va pas jusqu’au sorcier : elle arrête l’attaquant. Les capacités comptent : Envol impose un bloqueur volant, Infiltration empêche tout blocage, Attaque ciblée frappe une créature avant le combat.',
        nextLabel: 'Terminer le tutoriel',
        side: 'top',
      },
      {
        id: 'termine',
        kind: 'complete',
        target: '[data-tutorial-target="player-field"]',
        eyebrow: 'BASES ACQUISES',
        title: 'À vous de jouer',
        text: 'Vous savez désormais tenir un tour complet : mana automatique, créature, pioche de début de tour, attaque, blocage, arme et limite de cinq créatures. Chaque leçon suivante se concentre sur un deck et ses mécaniques.',
        nextLabel: 'Terminer le tutoriel',
        side: 'top',
      },
    ],
  },
  {
    id: 'maree-des-abysses',
    name: 'Les Voies de la Marée',
    eyebrow: 'EAU · MAGIES',
    level: 'Intermédiaire',
    duration: '≈ 8 min',
    icon: '≈',
    deckId: 'maree-des-abysses',
    deckName: 'Marée des abysses',
    element: 'eau',
    reward: 150,
    tagline: 'Sorcelleries, Magies Rapides et contres : apprendre à répondre au bon moment.',
    description: 'Le deck bleu de contrôle : une Sorcellerie se lance à votre tour, une Magie Rapide peut répondre à tout instant, et un contre annule une carte annoncée avant sa résolution. La réserve est préparée pour que vous puissiez tout essayer.',
    opponentDeckId: 'maree-des-abysses',
    opponentName: 'Sorcière des abysses',
    openingHand: ['porteuse-de-cruches', 'eau-de-la-source', 'ressac', 'contresort-des-abimes'],
    playerMana: { eau: 8 },
    opponentHand: ['lame-de-mer'],
    opponentDraws: ['leviathan', 'seigneur-des-machoires'],
    opponentMana: { eau: 1 },
    opponentDeckFill: 'leviathan',
    stagedOpponent: [{ cardId: 'vipere-de-verre', ready: false }],
    steps: [
      {
        id: 'bienvenue',
        kind: 'info',
        target: '[data-tutorial-target="opponent-health"]',
        eyebrow: 'MARÉE DES ABYSSES · OBJECTIF',
        title: 'Prendre le temps de répondre',
        text: 'L’Eau ne frappe pas plus fort : elle choisit le bon moment. Cette leçon vous fait jouer une créature, une Sorcellerie, une Magie Rapide, puis contrer un sort adverse. Votre réserve est préparée à huit manas pour la démonstration.',
        nextLabel: 'Lire la main',
        side: 'bottom',
      },
      {
        id: 'main',
        kind: 'info',
        target: '[data-tutorial-target="hand"]',
        eyebrow: 'ÉTAPE 1 · QUATRE CARTES, TROIS TEMPS',
        title: 'Reconnaître les familles de sorts',
        text: 'La Porteuse de cruches est une créature. L’Eau de la source est une Sorcellerie : elle se lance pendant votre tour. Ressac et le Contresort des abîmes sont des Magies Rapides : elles peuvent se lancer en réponse, même pendant le tour adverse. Regardez le sceau au bas de chaque carte.',
        nextLabel: 'Jouer la créature',
        side: 'top',
      },
      {
        id: 'creature',
        kind: 'action',
        target: '.rpg-hand__card[data-card-id="porteuse-de-cruches"]',
        eyebrow: 'ÉTAPE 2 · CRÉATURE',
        title: 'Posez la Porteuse',
        text: 'Touchez la Porteuse de cruches. Elle coûte deux manas Eau et, à son arrivée, elle vous rend 3 points de vie : une capacité d’arrivée se résout immédiatement, une seule fois.',
        on: 'creature-jouee',
        cardId: 'porteuse-de-cruches',
        side: 'top',
      },
      {
        id: 'soin',
        kind: 'info',
        target: '[data-tutorial-target="player-health"]',
        eyebrow: 'RÈGLE · EFFET D’ARRIVÉE',
        title: 'Une arrivée peut soigner',
        text: 'La capacité d’arrivée de la Porteuse vous a rendu 3 PV, visibles sur votre plaque. Une capacité d’arrivée se déclenche quand la carte entre en jeu — pas quand elle est défaussée ni quand elle meurt.',
        nextLabel: 'Lancer une sorcellerie',
        side: 'top',
      },
      {
        id: 'sorcellerie',
        kind: 'action',
        target: '.rpg-hand__card[data-card-id="eau-de-la-source"]',
        eyebrow: 'ÉTAPE 3 · SORCELLERIE',
        title: 'Lancez l’Eau de la source',
        text: 'Touchez l’Eau de la source. C’est une Sorcellerie : elle ne peut se lancer que pendant VOTRE tour, jamais en réponse. Elle paie son mana, soigne 4 PV, puis rejoint le cimetière.',
        on: 'magie-lancee',
        cardId: 'eau-de-la-source',
        side: 'top',
      },
      {
        id: 'sorcellerie-info',
        kind: 'info',
        target: '[data-tutorial-target="player-health"]',
        eyebrow: 'RÈGLE · SORCELLERIE',
        title: 'Le temps de la sorcellerie',
        text: 'Une Sorcellerie attend votre phase principale. Elle ne peut pas être lancée pendant le tour adverse, ni pour répondre à une annonce. C’est le rythme lent du deck : on prépare, puis on frappe.',
        nextLabel: 'Essayer une Magie Rapide',
        side: 'top',
      },
      {
        id: 'magie-rapide',
        kind: 'action',
        target: '.rpg-hand__card[data-card-id="ressac"]',
        eyebrow: 'ÉTAPE 4 · MAGIE RAPIDE',
        title: 'Préparez Ressac',
        text: 'Ressac est une Magie Rapide : elle peut se lancer pendant votre tour, mais aussi en réponse à une annonce adverse ou pendant un combat. Elle renvoie une créature dans la main de son propriétaire. Touchez la carte.',
        on: 'magie-choisie',
        cardId: 'ressac',
        side: 'top',
      },
      {
        id: 'magie-rapide-cible',
        kind: 'action',
        target: '.card-row--ennemi .rpg-card[data-card-id="vipere-de-verre"]',
        eyebrow: 'ÉTAPE 5 · CIBLE',
        title: 'Renvoyez la Vipère de verre',
        text: 'Touchez la Vipère de verre encadrée : elle retourne en main. Une créature renvoyée perd ses blessures, ses armes et son mal d’invocation — elle devra être reposée entièrement.',
        on: 'magie-lancee',
        cardId: 'ressac',
        side: 'bottom',
      },
      {
        id: 'magie-rapide-info',
        kind: 'info',
        target: '[data-tutorial-target="hand"]',
        eyebrow: 'RÈGLE · MAGIE RAPIDE',
        title: 'Une carte qui répond',
        text: 'Ressac est allé au cimetière après sa résolution. Retenez la différence : Sorcellerie = temps lent, votre tour. Magie Rapide = temps instantané, réponse comprise. Le même coût, deux fenêtres de jeu.',
        nextLabel: 'Laisser le sorcier annoncer',
        side: 'top',
      },
      {
        id: 'fin-tour',
        kind: 'action',
        target: '[data-tutorial-target="end-turn"]',
        eyebrow: 'ÉTAPE 6 · PASSER LA MAIN',
        title: 'Laissez le sorcier jouer',
        text: 'Touchez « Fin du tour ». Le sorcier va annoncer une Lame de mer. Restez attentif : une Magie Rapide de contre ne se joue qu’au moment de l’annonce.',
        on: 'fin-de-tour',
        side: 'top',
      },
      {
        id: 'annonce-adverse',
        kind: 'action',
        target: '[data-tutorial-target="spell-announcement"]',
        scriptedAnnonce: { cardId: 'lame-de-mer', cible: 'creature-joueur' },
        eyebrow: 'LE SORCIER ANNONCE',
        title: 'Une carte est sur la pile',
        text: 'Le sorcier annonce Lame de mer. La carte n’est pas encore résolue : son aperçu s’ouvre au-dessus de la table. Touchez « Répondre » pour refermer l’aperçu et rendre votre main accessible, puis choisissez votre contre.',
        on: 'annonce-repondue',
        side: 'left',
      },
      {
        id: 'contre-jouer',
        kind: 'action',
        target: '.rpg-hand__card[data-card-id="contresort-des-abimes"]',
        eyebrow: 'ÉTAPE 7 · CONTRE',
        title: 'Contrez la Lame de mer',
        text: 'Le Contresort des abîmes coûte trois manas et peut contrer n’importe quelle carte annoncée. Touchez-le : la Lame de mer paie son coût, puis va au cimetière sans résoudre son effet. Votre contre fait de même.',
        on: 'contre-lance',
        cardId: 'contresort-des-abimes',
        side: 'top',
      },
      {
        id: 'contre-info',
        kind: 'info',
        target: '[data-tutorial-target="player-field"]',
        eyebrow: 'RÈGLE · LES CONTRE-SORTS',
        title: 'Chaque contre a sa cible',
        text: 'Écueil ne contre qu’une créature, Silence d’écume qu’une magie, le Contresort des abîmes n’importe quelle carte. Un contre ne sert à rien sans carte annoncée : la main l’éteint alors. La carte contredite ne produit aucun effet, mais son coût est perdu.',
        nextLabel: 'Terminer la leçon',
        side: 'top',
      },
      {
        id: 'termine',
        kind: 'complete',
        target: '[data-tutorial-target="player-field"]',
        eyebrow: 'MARÉE MAÎTRISÉE',
        title: 'Le tempo de l’Eau',
        text: 'Vous savez distinguer Sorcellerie et Magie Rapide, jouer un sort à son bon moment et contrer une carte annoncée. Les prochaines leçons explorent les créatures qui déclenchent leurs effets, puis les archétypes du Serment.',
        nextLabel: 'Terminer le tutoriel',
        side: 'top',
      },
    ],
  },
  {
    id: 'balance-des-heures',
    name: 'La Balance des Heures',
    eyebrow: 'TÉNÈBRES · EFFETS',
    level: 'Intermédiaire',
    duration: '≈ 8 min',
    icon: '☥',
    deckId: 'balance-des-heures',
    deckName: 'La Balance des Heures',
    element: 'tenebres',
    reward: 150,
    tagline: 'Le Tribut, le Prix et les créatures qui déclenchent leur effet à la mort.',
    description: 'Le deck Ténèbres paie avec la vie et récolte celle de l’adversaire : le Chacal frappe avec Rapidité et Tribut, le Papyrus a un Prix en PV, et la Momie de lin laisse un serviteur en mourant. Une leçon sur les effets qui se déclenchent.',
    opponentDeckId: 'serment-du-soleil-rouge',
    opponentName: 'Sorcier du Soleil rouge',
    openingHand: ['chacal-du-seuil', 'pretre-de-la-bouche', 'papyrus', 'momie-de-lin'],
    playerDraws: ['chacal-du-seuil', 'pretre-de-la-bouche'],
    playerMana: { tenebres: 8 },
    opponentHand: ['feux-de-kitsune'],
    opponentDraws: [],
    opponentMana: { braise: 4 },
    opponentDeckFill: 'kagutsuchi-flamme-originelle',
    steps: [
      {
        id: 'bienvenue',
        kind: 'info',
        target: '[data-tutorial-target="opponent-health"]',
        eyebrow: 'LA BALANCE DES HEURES · OBJECTIF',
        title: 'Le poids d’une vie',
        text: 'Les Ténèbres ne se contentent pas de blesser : elles échangent. Cette leçon montre le Tribut, le Prix payé en points de vie, les effets d’arrivée et ceux qui se déclenchent quand une créature meurt. Votre réserve est préparée à huit manas.',
        nextLabel: 'Lire la main',
        side: 'bottom',
      },
      {
        id: 'main',
        kind: 'info',
        target: '[data-tutorial-target="hand"]',
        eyebrow: 'ÉTAPE 1 · TROIS MÉCANIQUES',
        title: 'Lire les Ténèbres',
        text: 'Le Chacal du seuil a Rapidité et Tribut : quand il touche le sorcier, il lui prend 1 PV et vous en rend 1. Le Papyrus porte un Prix : 2 PV en plus de son mana. La Momie de lin, elle, déclenche son effet quand elle meurt. Trois façons de faire parler la balance.',
        nextLabel: 'Jouer le Chacal',
        side: 'top',
      },
      {
        id: 'creature-chacal',
        kind: 'action',
        target: '.rpg-hand__card[data-card-id="chacal-du-seuil"]',
        eyebrow: 'ÉTAPE 2 · RAPIDITÉ',
        title: 'Le Chacal entre en chasse',
        text: 'Touchez le Chacal du seuil. Il coûte un mana et possède Rapidité : contrairement aux autres créatures, il peut attaquer le tour même où il arrive.',
        on: 'creature-jouee',
        cardId: 'chacal-du-seuil',
        side: 'top',
      },
      {
        id: 'attaque-chacal',
        kind: 'action',
        target: '[data-tutorial-target="attack-all"]',
        eyebrow: 'ÉTAPE 3 · ATTAQUE',
        title: 'Faites frapper le Tribut',
        text: 'Le Chacal est prêt immédiatement. Touchez « Attaquer avec tous » : sa morsure inflige 2 dégâts au sorcier et déclenche son Tribut. Une attaque non bloquée passe directement au sorcier.',
        on: 'attaque-declaree',
        side: 'top',
      },
      {
        id: 'confirmer-chacal',
        kind: 'action',
        target: '[data-tutorial-target="confirm-attack"]',
        eyebrow: 'ÉTAPE 4 · COMBAT',
        title: 'Confirmez la morsure',
        text: 'Confirmez l’attaque. Le Tribut du Chacal se déclenche quand il inflige des blessures au sorcier : en plus des 2 dégâts de combat, le sorcier perd 1 PV et vous en gagnez 1.',
        on: 'attaque-confirmee',
        side: 'top',
      },
      {
        id: 'tribut',
        kind: 'info',
        target: '[data-tutorial-target="opponent-health"]',
        eyebrow: 'RÈGLE · TRIBUT',
        title: 'Prendre, puis garder',
        text: 'Le Tribut ne se déclenche que si la créature touche le sorcier adverse — pas une créature, pas un bloqueur. Le sorcier a perdu 3 PV en tout (2 de combat + 1 de Tribut) et vous en avez gagné 1 : votre réserve de vie peut dépasser 25 et son maximum suit le gain.',
        nextLabel: 'Jouer le Prêtre',
        side: 'bottom',
      },
      {
        id: 'pretre',
        kind: 'action',
        target: '.rpg-hand__card[data-card-id="pretre-de-la-bouche"]',
        eyebrow: 'ÉTAPE 5 · EFFET D’ARRIVÉE',
        title: 'Le Prêtre de la bouche',
        text: 'Touchez le Prêtre de la bouche, deux manas. Son effet ne demande aucune cible : à son arrivée, le sorcier perd 1 PV et vous en gagnez 1. C’est un transfert, pas des dégâts : votre total peut de nouveau dépasser 25.',
        on: 'creature-jouee',
        cardId: 'pretre-de-la-bouche',
        side: 'top',
      },
      {
        id: 'arrivee',
        kind: 'info',
        target: '[data-tutorial-target="player-health"]',
        eyebrow: 'RÈGLE · ARRIVÉE IMMÉDIATE',
        title: 'Un effet qui se déclenche en entrant',
        text: 'L’effet d’arrivée du Prêtre s’est résolu dès sa pose, avant même que vous puissiez jouer autre chose. Un effet d’arrivée ne se rejoue pas si la créature est renvoyée en main puis reposée : c’est une nouvelle entrée, donc un nouveau déclenchement.',
        nextLabel: 'Payer le Prix',
        side: 'top',
      },
      {
        id: 'prix',
        kind: 'action',
        target: '.rpg-hand__card[data-card-id="papyrus"]',
        eyebrow: 'ÉTAPE 6 · LE PRIX',
        title: 'Payez le Prix du Papyrus',
        text: 'Touchez le Papyrus. Sa ligne de Prix demande 2 PV en plus de son mana. Une fois payé, il vous fait piocher une carte. Le Prix se paie même si le sort est contré : on ne reprend pas ce qui a été donné à la balance.',
        on: 'magie-lancee',
        cardId: 'papyrus',
        side: 'top',
      },
      {
        id: 'prix-info',
        kind: 'info',
        target: '[data-tutorial-target="player-health"]',
        eyebrow: 'RÈGLE · PRIX EN PV',
        title: 'La vie est une ressource',
        text: 'Le Papyrus vous a coûté 2 PV. Le Prix n’est pas un dégât : il ne peut pas être prévenu par un bouclier et ne déclenche pas les effets « quand vous subissez des dégâts ». Il se paie au lancement, avant l’effet. D’autres cartes, comme La Grande Pesée, échangent ainsi votre vie contre celle du sorcier.',
        nextLabel: 'Jouer la Momie',
        side: 'top',
      },
      {
        id: 'creature-momie',
        kind: 'action',
        target: '.rpg-hand__card[data-card-id="momie-de-lin"]',
        eyebrow: 'ÉTAPE 7 · EFFET DE MORT',
        title: 'La Momie de lin',
        text: 'Touchez la Momie de lin. Elle coûte trois manas. Son texte ne parle pas d’arrivée mais de mort : ce qu’elle laisse derrière elle est sa vraie force.',
        on: 'creature-jouee',
        cardId: 'momie-de-lin',
        side: 'top',
      },
      {
        id: 'momie-info',
        kind: 'info',
        target: '.card-row--equipe .rpg-card[data-card-id="momie-de-lin"]',
        eyebrow: 'RÈGLE · DÉCLENCHEUR DE MORT',
        title: 'Ce qui meurt revient',
        text: 'Quand la Momie de lin meurt, elle crée une créature-jeton Shabti 1/1. Un effet de mort se déclenche quelle que soit la source : combat, magie, capacité ou sacrifice. Les jetons sont des créatures réelles, mais ils ne retournent jamais dans un deck.',
        nextLabel: 'Laisser le feu passer',
        side: 'top',
      },
      {
        id: 'fin-tour-tenebres',
        kind: 'action',
        target: '[data-tutorial-target="end-turn"]',
        eyebrow: 'ÉTAPE 8 · PASSER LA MAIN',
        title: 'Laissez le sorcier frapper',
        text: 'Terminez le tour. Le sorcier prépare des Feux de kitsune : 4 blessures à une créature ciblée. Vous allez choisir de les laisser passer pour voir mourir la Momie.',
        on: 'fin-de-tour',
        side: 'top',
      },
      {
        id: 'annonce-tenebres',
        kind: 'action',
        target: '[data-tutorial-target="spell-announcement"]',
        scriptedAnnonce: { cardId: 'feux-de-kitsune', cible: 'creature-joueur', cibleCarteId: 'momie-de-lin' },
        eyebrow: 'LE SORCIER ANNONCE',
        title: 'Un sort vise la Momie',
        text: 'Feux de kitsune est annoncé sur la Momie de lin : 4 blessures à une créature ciblée. La Momie n’a que 4 points de défense. Touchez « Laisser passer » : la Momie meurt sous les 4 blessures, et son effet de mort s’ouvre immédiatement.',
        on: 'annonce-passee',
        side: 'left',
      },
      {
        id: 'shabtis',
        kind: 'info',
        target: '.rpg-creature-slots--joueur',
        eyebrow: 'RÈGLE · CE QUI RESTE',
        title: 'Un Shabti pour une Momie',
        text: 'La Momie est morte, mais un Shabti 1/1 occupe maintenant son côté du champ. Les effets de mort peuvent donc renverser un échange : une créature détruite n’est pas toujours une perte sèche. Le deck Ténèbres construit toute sa pression sur ces derniers souffles.',
        nextLabel: 'Terminer la leçon',
        side: 'top',
      },
      {
        id: 'termine',
        kind: 'complete',
        target: '[data-tutorial-target="player-field"]',
        eyebrow: 'BALANCE COMPRISE',
        title: 'La mort a un prix',
        text: 'Tribut, Prix et déclencheurs de mort : les Ténèbres transforment chaque blessure et chaque disparition en avantage. Vous savez maintenant lire une carte jusqu’à son dernier souffle.',
        nextLabel: 'Terminer le tutoriel',
        side: 'top',
      },
    ],
  },
  {
    id: 'serment-du-soleil-rouge',
    name: 'Le Serment du Soleil rouge',
    eyebrow: 'SAMOURAÏS · RÉSONANCE',
    level: 'Avancé',
    duration: '≈ 7 min',
    icon: '⛩',
    deckId: 'serment-du-soleil-rouge',
    deckName: 'Le Serment du Soleil rouge',
    element: 'braise',
    reward: 150,
    tagline: 'Résonance samouraï, jetons du Daimyō et Bannière qui grandit à chaque attaque.',
    description: 'Le deck samouraï récompense les tables homogènes : le Shogun promu renforce tous les Samouraïs, lui compris, le Daimyō lève deux jetons et sa Bannière fait grandir chaque attaquant. Une leçon sur les auras et les attaques qui s’additionnent.',
    opponentDeckId: 'cour-des-djinns',
    opponentName: 'Sorcier des djinns',
    openingHand: ['ashigaru-des-braises', 'samourai-du-torii', 'daimyo-du-soleil-rouge'],
    playerDraws: ['ronin-du-soleil-rouge'],
    playerMana: { braise: 10 },
    opponentHand: ['nuage-de-cendres', 'feux-de-kitsune'],
    opponentDraws: [],
    opponentMana: { braise: 2 },
    opponentDeckFill: 'kagutsuchi-flamme-originelle',
    steps: [
      {
        id: 'bienvenue',
        kind: 'info',
        target: '[data-tutorial-target="opponent-health"]',
        eyebrow: 'SERMENT DU SOLEIL ROUGE · OBJECTIF',
        title: 'Une table, un camp',
        text: 'Les Samouraïs ne brillent pas seuls : leurs auras se lisent sur le type « Samouraï » et traversent les deux camps. Cette leçon installe trois créatures, puis fait attaquer tout le camp pour montrer la Résonance et la Bannière. Votre réserve est préparée à dix manas.',
        nextLabel: 'Lire la main',
        side: 'bottom',
      },
      {
        id: 'main',
        kind: 'info',
        target: '[data-tutorial-target="hand"]',
        eyebrow: 'ÉTAPE 1 · LE TYPE COMPTE',
        title: 'Samouraï, un mot qui relie',
        text: 'Ashigaru, Shogun promu et Daimyō portent tous le type Samouraï. La Résonance samouraï du Shogun donne +1/+1 à toutes les créatures Samouraï, lui compris, de la table, alliées comme adverses. La Bannière du Daimyō, elle, grandit ses Samouraïs à chaque attaque. Lisez la ligne de type avant la ligne d’effet.',
        nextLabel: 'Installer la recrue',
        side: 'top',
      },
      {
        id: 'ashigaru',
        kind: 'action',
        target: '.rpg-hand__card[data-card-id="ashigaru-des-braises"]',
        eyebrow: 'ÉTAPE 2 · LA RECRUE',
        title: 'Posez l’Ashigaru',
        text: 'Touchez l’Ashigaru des braises. Il coûte un mana : c’est un petit Samouraï 1/1, mais sa valeur viendra de ce qui l’entoure.',
        on: 'creature-jouee',
        cardId: 'ashigaru-des-braises',
        side: 'top',
      },
      {
        id: 'torii',
        kind: 'action',
        target: '.rpg-hand__card[data-card-id="samourai-du-torii"]',
        eyebrow: 'ÉTAPE 3 · LA RÉSONANCE',
        title: 'Le Shogun promu',
        text: 'Touchez le Shogun promu, quatre manas. À son arrivée, sa Résonance samouraï donne +1/+1 à chaque Samouraï, lui compris, de la table : l’Ashigaru devient 2/2. Regardez les statistiques changer sur le champ.',
        on: 'creature-jouee',
        cardId: 'samourai-du-torii',
        side: 'top',
      },
      {
        id: 'resonance',
        kind: 'info',
        target: '[data-tutorial-target="player-field"]',
        eyebrow: 'RÈGLE · RÉSONANCE',
        title: 'La force circule',
        text: 'La Résonance ne cible pas : elle s’applique en permanence à toutes les créatures du groupe, dans les deux camps. Deux Shoguns promus se renforcent eux-mêmes et mutuellement. La capacité disparaît dès que la créature source quitte le jeu.',
        nextLabel: 'Appeler le Daimyō',
        side: 'top',
      },
      {
        id: 'daimyo',
        kind: 'action',
        target: '.rpg-hand__card[data-card-id="daimyo-du-soleil-rouge"]',
        eyebrow: 'ÉTAPE 4 · LA BANNIÈRE',
        title: 'Le Daimyō et ses deux lames',
        text: 'Touchez le Daimyō du Soleil rouge, cinq manas. En arrivant, il crée deux jetons Samouraï 1/1. Tant qu’il est en jeu, chaque Samouraï de votre camp qui attaque gagne +1/+1 avant les blessures. La table est maintenant à cinq créatures : trois créatures et deux jetons, la limite est atteinte.',
        on: 'creature-jouee',
        cardId: 'daimyo-du-soleil-rouge',
        side: 'top',
      },
      {
        id: 'banniere',
        kind: 'info',
        target: '[data-tutorial-target="player-field"]',
        eyebrow: 'RÈGLE · BANNIÈRE ET JETONS',
        title: 'Une vague de samouraïs',
        text: 'Les deux jetons sont des créatures réelles : ils bloquent, attaquent et reçoivent la Résonance du torii comme les autres Samouraïs. Le Daimyō ne nourrit pas seulement les jetons : chaque Samouraï qui attaque grandit, y compris lui-même. La Bannière se résout avant les dégâts.',
        nextLabel: 'Passer au tour suivant',
        side: 'top',
      },
      {
        id: 'fin-tour-soleil',
        kind: 'action',
        target: '[data-tutorial-target="end-turn"]',
        eyebrow: 'ÉTAPE 5 · SE DÉGAGER',
        title: 'Laissez-les se lever',
        text: 'Les créatures posées ce tour ne peuvent pas attaquer : elles ont le mal d’invocation. Terminez le tour, puis revenez au vôtre : elles se dégageront toutes au début de votre phase principale.',
        on: 'fin-de-tour',
        side: 'top',
      },
      {
        id: 'tour-adverse-soleil',
        kind: 'waiting',
        target: '[data-tutorial-target="enemy-field"]',
        waitFor: 'tour-joueur',
        eyebrow: 'LE TOUR DU SORCIER',
        title: 'Le calme avant la charge',
        text: 'Le sorcier n’a rien à jouer : il passe. Votre réserve se recharge, vous piochez une carte et vos cinq Samouraïs se dégagent ensemble.',
        side: 'bottom',
      },
      {
        id: 'charge',
        kind: 'action',
        target: '[data-tutorial-target="attack-all"]',
        eyebrow: 'ÉTAPE 6 · LA CHARGE',
        title: 'Tous ensemble',
        text: 'Touchez « Attaquer avec tous ». Chaque Samouraï qui part gagne +1/+1 grâce à la Bannière avant que les blessures ne soient calculées : la table grandit au moment même où elle frappe.',
        on: 'attaque-declaree',
        side: 'top',
      },
      {
        id: 'confirmer-charge',
        kind: 'action',
        target: '[data-tutorial-target="confirm-attack"]',
        eyebrow: 'ÉTAPE 7 · IMPACT',
        title: 'Confirmez la charge',
        text: 'Confirmez l’attaque. Sans bloqueur, les cinq attaquants frappent directement le sorcier. La Bannière du Daimyō a déjà augmenté leur attaque : c’est la somme de toute la table, pas une frappe isolée.',
        on: 'attaque-confirmee',
        side: 'top',
      },
      {
        id: 'impact',
        kind: 'info',
        target: '[data-tutorial-target="opponent-health"]',
        eyebrow: 'RÈGLE · PUISSANCE COLLECTIVE',
        title: 'La somme des lames',
        text: 'Les dégâts de chaque attaquant sont calculés avec ses bonus. Un jeton 1/1 devient 2/2 avec la Résonance, puis 3/3 avec la Bannière à l’attaque. Cinq petits Samouraïs peuvent ainsi dépasser la force de n’importe quel colosse isolé.',
        nextLabel: 'Terminer la leçon',
        side: 'bottom',
      },
      {
        id: 'termine',
        kind: 'complete',
        target: '[data-tutorial-target="player-field"]',
        eyebrow: 'SERMENT TENU',
        title: 'Le Soleil rouge se lève',
        text: 'Résonance, Bannière et jetons : vous savez maintenant construire une table samouraï et transformer chaque attaque en crescendo. Le deck récompense la cohérence du type plus que la force brute.',
        nextLabel: 'Terminer le tutoriel',
        side: 'top',
      },
    ],
  },
  {
    id: 'serment-des-neuf-hivers',
    name: 'Le Serment des Neuf Hivers',
    eyebrow: 'NEIGE · FURIE ET GEL',
    level: 'Avancé',
    duration: '≈ 8 min',
    icon: '❄',
    deckId: 'serment-des-neuf-hivers',
    deckName: 'Serment des Neuf Hivers',
    element: 'neige',
    reward: 150,
    tagline: 'Boucliers, appel viking, gel et Furie : survivre pour mieux frapper.',
    description: 'Le deck Neige apprend la patience du Nord : le Guerrier arrive avec un bouclier, la Valkyrie au corbeau appelle au hasard une carte Viking du deck, la Poigne de givre immobilise un adversaire, et la Furie aiguise l’attaque d’une créature tant que sa défense reste sous sa DEF de base. Une leçon de défense et de contre-attaque.',
    opponentDeckId: 'serment-des-neuf-hivers',
    opponentName: 'Sorcier du fjord',
    openingHand: ['guerrier-au-bouclier-rond', 'valkyrie-au-corbeau', 'poigne-de-givre'],
    playerMana: { neige: 10 },
    opponentHand: ['maitre-du-marteau'],
    opponentDraws: [],
    opponentMana: { neige: 3 },
    opponentDeckFill: 'maitre-du-marteau',
    stagedOpponent: [
      { cardId: 'guerrier-au-bouclier-rond', ready: false },
      { cardId: 'loup-des-neiges', ready: false },
    ],
    stagedPlayer: [
      { cardId: 'berserk-des-trois-hivers', ready: false },
    ],
    steps: [
      {
        id: 'bienvenue',
        kind: 'info',
        target: '[data-tutorial-target="opponent-health"]',
        eyebrow: 'SERMENT DES NEUF HIVERS · OBJECTIF',
        title: 'Survivre au premier hiver',
        text: 'Le Nord ne gagne pas en frappant le premier : il encaisse, appelle ses renforts, gèle, puis revient plus fort. Cette leçon montre les boucliers, l’appel viking de la Valkyrie au corbeau, le gel et la Furie. Votre réserve est préparée à dix manas pour la démonstration.',
        nextLabel: 'Lire la main',
        side: 'bottom',
      },
      {
        id: 'main',
        kind: 'info',
        target: '[data-tutorial-target="hand"]',
        eyebrow: 'ÉTAPE 1 · TROIS RÉPONSES',
        title: 'Lire la main du Nord',
        text: 'Le Guerrier au bouclier rond arrive avec un bouclier 1 et porte Furie 2. La Valkyrie au corbeau est une 3/4 avec Envol et Furie 2 : à son arrivée, une carte de type Viking tirée au hasard de votre deck rejoindra votre main. La Poigne de givre inflige 2 dégâts et gèle une créature adverse. Votre Berserk des trois hivers, Furie 2, attend déjà sur votre ligne ; deux créatures adverses sont en face.',
        nextLabel: 'Poser le Guerrier',
        side: 'top',
      },
      {
        id: 'guerrier',
        kind: 'action',
        target: '.rpg-hand__card[data-card-id="guerrier-au-bouclier-rond"]',
        eyebrow: 'ÉTAPE 2 · LE REMPART',
        title: 'Posez le Guerrier',
        text: 'Touchez le Guerrier au bouclier rond. Il coûte deux manas. À son arrivée, il reçoit un bouclier 1 : le prochain dégât qu’il subit est réduit d’autant.',
        on: 'creature-jouee',
        cardId: 'guerrier-au-bouclier-rond',
        side: 'top',
      },
      {
        id: 'bouclier',
        kind: 'info',
        target: '[data-tutorial-target="player-field"]',
        eyebrow: 'RÈGLE · BOUCLIER',
        title: 'Un point de défense en plus',
        text: 'Le bouclier du Guerrier absorbe le prochain dégât qu’il subit, qu’il vienne d’une attaque ou d’une magie. Il est représenté sur la carte et disparaît après avoir encaissé. Un bouclier ne rend pas de PV : il évite seulement que le dégât ne les entame.',
        nextLabel: 'Appeler la Valkyrie',
        side: 'top',
      },
      {
        id: 'valkyrie',
        kind: 'action',
        target: '.rpg-hand__card[data-card-id="valkyrie-au-corbeau"]',
        eyebrow: 'ÉTAPE 3 · L’APPEL DU CORBEAU',
        title: 'La Valkyrie au corbeau',
        text: 'Touchez la Valkyrie au corbeau, cinq manas. Cette 3/4 avec Envol et Furie 2 ne renforce pas la table : à son arrivée, une carte de type Viking choisie au hasard parmi celles encore dans votre deck rejoint votre main.',
        on: 'creature-jouee',
        cardId: 'valkyrie-au-corbeau',
        side: 'top',
      },
      {
        id: 'appel-viking',
        kind: 'info',
        target: '[data-tutorial-target="hand"]',
        eyebrow: 'RÈGLE · PIOCHE VIKING',
        title: 'Le type imprimé décide',
        text: 'Regardez votre main : un renfort viking vient d’y arriver. Le moteur choisit au hasard parmi les cartes dont la ligne de type contient « Viking » et qui restent dans le deck. Le Loup des neiges, de type Loup, et les sorts Neige ne peuvent pas être tirés ainsi ; s’il ne reste aucun Viking, l’arrivée ne fait pas piocher. Gardez ce renfort pour un tour prochain.',
        nextLabel: 'Geler un adversaire',
        side: 'top',
      },
      {
        id: 'poigne',
        kind: 'action',
        target: '.rpg-hand__card[data-card-id="poigne-de-givre"]',
        eyebrow: 'ÉTAPE 4 · MAGIE DE GEL',
        title: 'Préparez la Poigne de givre',
        text: 'La Poigne de givre est une Magie Rapide à trois manas : 2 dégâts et gel. Touchez la carte, puis désignez la créature adverse. Une créature gelée ne peut ni attaquer ni bloquer pendant son prochain tour.',
        on: 'magie-choisie',
        cardId: 'poigne-de-givre',
        side: 'top',
      },
      {
        id: 'poigne-cible',
        kind: 'action',
        target: '.card-row--ennemi .rpg-card[data-card-id="guerrier-au-bouclier-rond"]',
        eyebrow: 'ÉTAPE 5 · CIBLE',
        title: 'Figez le guerrier adverse',
        text: 'Touchez le Guerrier au bouclier rond adverse. Son propre bouclier absorbe 1 des 2 dégâts : il reste à 2 de défense, sous sa DEF de base de 3, donc sa Furie s’allume. Le gel s’applique quand même et il ne pourra ni attaquer ni bloquer. Le Loup, lui, reste libre de charger.',
        on: 'magie-lancee',
        cardId: 'poigne-de-givre',
        side: 'bottom',
      },
      {
        id: 'gel',
        kind: 'info',
        target: '.card-row--ennemi .rpg-card[data-card-id="guerrier-au-bouclier-rond"]',
        eyebrow: 'RÈGLE · GEL',
        title: 'Une créature hors du temps',
        text: 'La créature gelée porte un voile de givre. Elle ne peut ni attaquer ni bloquer, et n’inflige aucun dégât de combat. Le gel dure jusqu’à la fin de son prochain tour : il ne se contente pas de retarder une attaque, il annule un tour entier.',
        nextLabel: 'Laisser le loup attaquer',
        side: 'bottom',
      },
      {
        id: 'fin-tour-neige',
        kind: 'action',
        target: '[data-tutorial-target="end-turn"]',
        eyebrow: 'ÉTAPE 6 · LE LOUP',
        title: 'Attendez l’assaut',
        text: 'Terminez le tour. Le guerrier adverse est gelé, mais un Loup des neiges va attaquer. Préparez votre Berserk : c’est le moment de bloquer et de déclencher sa Furie.',
        on: 'fin-de-tour',
        side: 'top',
      },
      {
        id: 'attaque-adverse',
        kind: 'waiting',
        target: '[data-tutorial-target="enemy-field"]',
        waitFor: 'combat-adverse',
        forceOpponentAttack: true,
        eyebrow: 'PHASE DE BLOCAGE',
        title: 'Le loup charge',
        text: 'Le Loup des neiges attaque en 2/2. Votre Berserk est 2/4, avec Furie 2. Assignez-le comme bloqueur : les 2 dégâts le laisseront à 2 de défense, sous sa DEF de base de 4, et sa Furie lui donnera +2/+0 après le combat.',
        side: 'bottom',
      },
      {
        id: 'blocage-neige',
        kind: 'action',
        target: '.card-row--equipe .rpg-card[data-card-id="berserk-des-trois-hivers"]',
        eyebrow: 'ÉTAPE 7 · LE BERSERK',
        title: 'Envoyez le Berserk',
        text: 'Touchez votre Berserk des trois hivers pour le sélectionner comme bloqueur. Il protège vos points de vie ; la blessure du Loup le fera passer sous sa DEF de base et allumera sa Furie.',
        on: 'bloqueur-selectionne',
        side: 'top',
      },
      {
        id: 'blocage-neige-cible',
        kind: 'action',
        target: '.card-row--ennemi .rpg-card[data-card-id="loup-des-neiges"]',
        eyebrow: 'ÉTAPE 8 · L’ASSIGNATION',
        title: 'Opposez le loup',
        text: 'Touchez le Loup des neiges pour lui assigner le blocage du Berserk. Les 2 dégâts laisseront le Berserk à 2 de défense, sous sa DEF de base de 4.',
        on: 'bloqueur-assigne',
        side: 'bottom',
      },
      {
        id: 'blocage-neige-confirmer',
        kind: 'action',
        target: '[data-tutorial-target="resolve-combat"]',
        eyebrow: 'ÉTAPE 9 · LA FURIE',
        title: 'Résolvez le combat',
        text: 'Touchez « Résoudre le combat ». Le Loup inflige 2 au Berserk, qui lui rend 2 et le terrasse. Blessé sous sa DEF de base, le Berserk déclenche sa Furie 2 et son attaque passe à 4. Vos points de vie, eux, restent intacts.',
        on: 'combat-adverse-resolu',
        side: 'top',
      },
      {
        id: 'furie',
        kind: 'info',
        target: '.card-row--equipe .rpg-card[data-card-id="berserk-des-trois-hivers"]',
        eyebrow: 'RÈGLE · FURIE',
        title: 'Sous la DEF de base',
        text: 'Le seuil de Furie est la DEF de base imprimée du Berserk : 4. À 2, il gagne +2/+0 et frappe désormais à 4. Si un soin le ramène à 4, ce bonus retombe ; une nouvelle chute sous 4 pourra le rallumer.',
        nextLabel: 'Terminer la leçon',
        side: 'top',
      },
      {
        id: 'termine',
        kind: 'complete',
        target: '[data-tutorial-target="player-field"]',
        eyebrow: 'HIVER SURVÉCU',
        title: 'Le Nord se souvient',
        text: 'Bouclier, appel viking, gel et Furie : vous savez maintenant défendre un tour, appeler un renfort, geler une menace et transformer une blessure en contre-attaque. Le Serment des Neuf Hivers ne craint pas le premier coup ; il attend le second.',
        nextLabel: 'Terminer le tutoriel',
        side: 'top',
      },
    ],
  },
]);

/** La leçon demandée, ou la première (les anciens appels sans identifiant). */
export function tutorielParId(id) {
  return RPG_TUTORIELS.find((tutoriel) => tutoriel.id === id) ?? RPG_TUTORIELS[0];
}

/** Toutes les cartes qu'une leçon manipule (mains, pioches, scènes, étapes). */
export function cartesDeLaLecon(tutoriel) {
  const ids = new Set();
  const ajouter = (id) => { if (typeof id === 'string' && id) ids.add(id); };
  for (const id of tutoriel?.openingHand ?? []) ajouter(id);
  for (const id of tutoriel?.playerDraws ?? []) ajouter(id);
  for (const id of tutoriel?.opponentHand ?? []) ajouter(id);
  for (const id of tutoriel?.opponentDraws ?? []) ajouter(id);
  ajouter(tutoriel?.opponentDeckFill);
  for (const scene of tutoriel?.stagedOpponent ?? []) ajouter(scene.cardId);
  for (const scene of tutoriel?.stagedPlayer ?? []) ajouter(scene.cardId);
  for (const etape of tutoriel?.steps ?? []) {
    ajouter(etape.cardId);
    for (const id of etape.prepare?.stageOpponent ?? []) ajouter(id);
    for (const id of etape.prepare?.stagePlayer ?? []) ajouter(id);
    ajouter(etape.scriptedAnnonce?.cardId);
  }
  return [...ids];
}

/* ── Les alias du premier tutoriel, conservés pour la page et les tests ────── */

export const RPG_TUTORIAL_PLAYER_DECK = Object.freeze(cartesDuDeck(RPG_TUTORIELS[0].deckId));
export const RPG_TUTORIAL_OPPONENT_DECK = Object.freeze(cartesDuDeck(RPG_TUTORIELS[0].opponentDeckId));
export const RPG_TUTORIAL_OPENING_HAND = Object.freeze([...RPG_TUTORIELS[0].openingHand]);
export const RPG_TUTORIAL_OPPONENT_HAND = Object.freeze([...RPG_TUTORIELS[0].opponentHand]);
export const RPG_TUTORIAL_STEPS = Object.freeze(RPG_TUTORIELS[0].steps);

/**
 * Prépare la partie d'entraînement d'une leçon : mains connues, pioches
 * placées, mana éventuellement préparé et créatures déjà en scène. Le duel
 * doit être **déjà créé** (les deux camps ont pioché leur main de départ).
 *
 * Le moteur garde le reste de la partie intact : on ne fait que déplacer des
 * cartes connues et poser la scène décrite par la leçon.
 */
export function preparerDuelTutoriel(duel, tutorielOuId = RPG_TUTORIELS[0]) {
  if (!duel?.joueur || !duel?.sorcier) throw new TypeError('Un duel complet est nécessaire pour préparer le tutoriel.');
  const tutoriel = typeof tutorielOuId === 'string' ? tutorielParId(tutorielOuId) : (tutorielOuId ?? RPG_TUTORIELS[0]);

  preparerMain(duel.joueur, tutoriel.openingHand ?? []);
  if (tutoriel.playerDraws?.length) preparerPioches(duel.joueur, tutoriel.playerDraws);

  preparerMain(duel.sorcier, tutoriel.opponentHand ?? []);
  // Le reste du paquet adverse n'a pas à raconter d'histoire : on le remplit
  // de cartes trop chères pour son mana, afin qu'il ne perturbe pas la leçon.
  if (tutoriel.opponentDeckFill) {
    duel.sorcier.deck = Array(30).fill(tutoriel.opponentDeckFill);
  }
  if (tutoriel.opponentDraws?.length) preparerPioches(duel.sorcier, tutoriel.opponentDraws);
  if (tutoriel.opponentMana) installerMana(duel.sorcier, tutoriel.opponentMana);

  // La main de la leçon est déjà la scène : le mulligan ne doit pas la changer.
  duel.mainDepart = { joueur: duel.joueur.main.length, sorcier: duel.sorcier.main.length };
  duel.mulliganFait = { joueur: true, sorcier: true };

  for (const scene of tutoriel.stagedOpponent ?? []) {
    poserCreatureSurChamp(duel, 'sorcier', scene.cardId, { ready: Boolean(scene.ready) });
  }
  for (const scene of tutoriel.stagedPlayer ?? []) {
    poserCreatureSurChamp(duel, 'joueur', scene.cardId, { ready: Boolean(scene.ready) });
  }

  return duel;
}

/**
 * Applique la réserve préparée APRÈS `rpgDemarrerManaEssai` : le premier mana
 * automatique a déjà été choisi, la leçon remplace la réserve par celle qu'elle
 * annonce. Sans réserve préparée, le duel suit la règle normale (un mana).
 */
export function appliquerManaInitialTutoriel(duel, tutorielOuId = RPG_TUTORIELS[0]) {
  const tutoriel = typeof tutorielOuId === 'string' ? tutorielParId(tutorielOuId) : (tutorielOuId ?? RPG_TUTORIELS[0]);
  if (duel?.joueur && tutoriel.playerMana) installerMana(duel.joueur, tutoriel.playerMana);
  return duel;
}

/**
 * Ce qu'une étape installe en arrivant : une ou plusieurs créatures posées sur
 * un champ (le Chien du guet qui rejoint la défense, le Chien de sable que le
 * sorcier envoie). La fonction est idempotente — rejouer l'étape ne crée pas
 * une seconde créature.
 */
export function preparerEtapeTutoriel(duel, etape) {
  if (!duel?.sorcier || !duel?.joueur || !etape?.prepare) return [];
  const creees = [];
  // Le moteur ne laisse pas un camp invoquer hors de son tour : la scène
  // attend le tour de son camp (l'appel est rejoué quand le tour bascule).
  for (const cardId of etape.prepare.stageOpponent ?? []) {
    if (duel.tour !== 'sorcier') continue;
    if (duel.sorcier.creatures.some((entite) => entite.carteId === cardId)) continue;
    const entite = poserCreatureSurChamp(duel, 'sorcier', cardId, { ready: true });
    if (entite) creees.push(entite);
  }
  for (const cardId of etape.prepare.stagePlayer ?? []) {
    if (duel.tour !== 'joueur') continue;
    if (duel.joueur.creatures.some((entite) => entite.carteId === cardId)) continue;
    const entite = poserCreatureSurChamp(duel, 'joueur', cardId, { ready: true });
    if (entite) creees.push(entite);
  }
  return creees;
}
