/* Les affiches des sets ne sont pas de nouveaux rayons du Souk : elles
 * présentent des cartes et leurs capacités dans la vitrine « Jouer ». */
export const RPG_PROMO_DEBUT = 3;
export const RPG_PROMO_SLIDES = Object.freeze([
  {
    id: 'vampires', annonce: 'Booster Vampires', affiche: 'booster-vampires-banniere.webp',
    description: 'Booster Vampires — La nuit riposte. Embuscade : jouez une créature pendant le tour adverse si sa condition est remplie. 140 crédits, rare garantie, plus de chances de trouver des Vampires parmi toutes les cartes du Souk.',
  },
  {
    id: 'pirates', annonce: 'Set Pirates', affiche: 'set-pirates-banniere.webp',
    description: 'Set Pirates — Les Lettres de Marque. Abordage : à son arrivée, une créature peut prendre en cale une créature adverse de coût autorisé, sans la détruire.',
  },
  {
    id: 'vikings', annonce: 'Set Vikings', affiche: 'set-vikings-banniere.webp',
    description: 'Set Vikings — Le Serment des Neuf Hivers. Furie : tant qu’elle est blessée, une créature avec Furie gagne de l’attaque.',
  },
  {
    id: 'samourais', annonce: 'Set Samouraïs', affiche: 'set-samourais-banniere.webp',
    description: 'Set Samouraïs — Le Serment du Soleil rouge. Harakiri : à sa mort, la créature inflige des dégâts à une créature adverse au hasard, ou au sorcier adverse s’il n’y en a aucune.',
  },
  {
    id: 'sable', annonce: 'Set Sable', affiche: 'set-sable-banniere.webp',
    description: 'Set Sable — Les Veilleurs du Désert. Butin : quand la créature touche le sorcier adverse, piochez une carte puis défaussez-en une.',
  },
  {
    id: 'egyptiens', annonce: 'Set Égyptiens', affiche: 'set-egyptiens-banniere.webp',
    description: 'Set Égyptiens — La Balance des Heures. Tribut : quand une créature touche le sorcier adverse, il perd des points de vie et vous en gagnez autant.',
  },
]);
export const RPG_OFFRE_DIAPO = RPG_PROMO_DEBUT + RPG_PROMO_SLIDES.length;
