/* Les affiches des boosters du Souk présentent les cartes et leurs capacités
 * dans la vitrine « Jouer ». Chaque paquet contient cinq cartes, dont une rare. */
export const RPG_PROMO_DEBUT = 3;
export const RPG_PROMO_SLIDES = Object.freeze([
  {
    id: 'vampires', annonce: 'Booster Vampires', affiche: 'booster-vampires-banniere.webp',
    description: 'Booster Vampires — La nuit riposte. Embuscade : jouez une créature pendant le tour adverse si sa condition est remplie. 140 crédits, rare garantie, plus de chances de trouver des Vampires parmi toutes les cartes du Souk.',
  },
  {
    id: 'pirates', annonce: 'Booster Pirates', affiche: 'set-pirates-banniere.webp',
    description: 'Booster Pirates — Les Lettres de Marque. Abordage : à son arrivée, une créature peut prendre en cale une créature adverse de coût autorisé, sans la détruire. 140 crédits, cinq cartes, une rare garantie ; les cartes du thème sont plus fréquentes sans être garanties.',
  },
  {
    id: 'vikings', annonce: 'Booster Vikings', affiche: 'set-vikings-banniere.webp',
    description: 'Booster Vikings — Le Serment des Neuf Hivers. Furie : tant qu’elle est blessée, une créature avec Furie gagne de l’attaque. 140 crédits, cinq cartes, une rare garantie ; les cartes du thème sont plus fréquentes sans être garanties.',
  },
  {
    id: 'samourais', annonce: 'Booster Samouraïs', affiche: 'set-samourais-banniere.webp',
    description: 'Booster Samouraïs — Le Serment du Soleil rouge. Harakiri : à sa mort, la créature inflige des dégâts à une créature adverse au hasard, ou au sorcier adverse s’il n’y en a aucune. 140 crédits, cinq cartes, une rare garantie ; les cartes du thème sont plus fréquentes sans être garanties.',
  },
  {
    id: 'sable', annonce: 'Booster Sable', affiche: 'set-sable-banniere.webp',
    description: 'Booster Sable — Les Veilleurs du Désert. Butin : quand la créature touche le sorcier adverse, piochez une carte puis défaussez-en une. 140 crédits, cinq cartes, une rare garantie ; les cartes du thème sont plus fréquentes sans être garanties.',
  },
  {
    id: 'egyptiens', annonce: 'Booster Égyptiens', affiche: 'set-egyptiens-banniere.webp',
    description: 'Booster Égyptiens — La Balance des Heures. Tribut : quand une créature touche le sorcier adverse, il perd des points de vie et vous en gagnez autant. 140 crédits, cinq cartes, une rare garantie ; les cartes du thème sont plus fréquentes sans être garanties.',
  },
]);
export const RPG_OFFRE_DIAPO = RPG_PROMO_DEBUT + RPG_PROMO_SLIDES.length;
