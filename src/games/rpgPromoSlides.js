/* Les six boosters du Souk : décor, sachet et texte sont des calques séparés.
 * Ainsi la vitrine change de ratio sans couper les mots ni le produit. */
export const RPG_PROMO_DEBUT = 3;
export const RPG_PROMO_SLIDES = Object.freeze([
  {
    id: 'vampires', annonce: 'Booster Vampires', fond: 'fond-vampires.webp', paquet: 'paquet-vampires.webp',
    titre: ['LA NUIT', 'RIPOSTE.'], capacite: 'EMBUSCADE', accent: '#ef9d72',
    texte: 'Jouez une créature pendant le tour adverse si sa condition est remplie.',
    description: 'Booster Vampires — La nuit riposte. Embuscade : jouez une créature pendant le tour adverse si sa condition est remplie. 140 crédits, rare garantie, plus de chances de trouver des Vampires parmi toutes les cartes du Souk.',
  },
  {
    id: 'pirates', annonce: 'Booster Pirates', fond: 'fond-pirates.webp', paquet: 'paquet-pirates.webp',
    titre: ['LA MER', 'PREND TOUT.'], capacite: 'ABORDAGE', accent: '#8bd5d8',
    texte: 'À l’arrivée, prenez en cale une créature adverse de coût autorisé, sans la détruire.',
    description: 'Booster Pirates — Les Lettres de Marque. Abordage : à son arrivée, une créature peut prendre en cale une créature adverse de coût autorisé, sans la détruire. 140 crédits, cinq cartes, une rare garantie ; les cartes du thème sont plus fréquentes sans être garanties.',
  },
  {
    id: 'vikings', annonce: 'Booster Vikings', fond: 'fond-vikings.webp', paquet: 'paquet-vikings.webp',
    titre: ['LE NORD', 'RIPOSTE.'], capacite: 'FURIE', accent: '#91cdeb',
    texte: 'Tant qu’elle est blessée, la créature gagne de l’attaque et frappe plus fort.',
    description: 'Booster Vikings — Le Serment des Neuf Hivers. Furie : tant qu’elle est blessée, une créature avec Furie gagne de l’attaque. 140 crédits, cinq cartes, une rare garantie ; les cartes du thème sont plus fréquentes sans être garanties.',
  },
  {
    id: 'samourais', annonce: 'Booster Samouraïs', fond: 'fond-samourais.webp', paquet: 'paquet-samourais.webp',
    titre: ['LE FEU', 'SURVIT.'], capacite: 'HARAKIRI', accent: '#f78f6d',
    texte: 'Quand elle meurt, la créature blesse un ennemi au hasard, ou le sorcier adverse s’il n’y en a aucun.',
    description: 'Booster Samouraïs — Le Serment du Soleil rouge. Harakiri : à sa mort, la créature inflige des dégâts à une créature adverse au hasard, ou au sorcier adverse s’il n’y en a aucune. 140 crédits, cinq cartes, une rare garantie ; les cartes du thème sont plus fréquentes sans être garanties.',
  },
  {
    id: 'sable', annonce: 'Booster Sable', fond: 'fond-sable.webp', paquet: 'paquet-sable.webp',
    titre: ['LES DUNES', 'S’ÉVEILLENT.'], capacite: 'BUTIN', accent: '#e3b568',
    texte: 'Quand elle touche le sorcier adverse, piochez une carte, puis défaussez-en une.',
    description: 'Booster Sable — Les Veilleurs du Désert. Butin : quand la créature touche le sorcier adverse, piochez une carte puis défaussez-en une. 140 crédits, cinq cartes, une rare garantie ; les cartes du thème sont plus fréquentes sans être garanties.',
  },
  {
    id: 'egyptiens', annonce: 'Booster Égyptiens', fond: 'fond-egyptiens.webp', paquet: 'paquet-egyptiens.webp',
    titre: ['LA BALANCE', 'VOUS JUGE.'], capacite: 'TRIBUT', accent: '#c4aaed',
    texte: 'Quand elle touche le sorcier adverse, il perd des PV et vous en gagnez autant.',
    description: 'Booster Égyptiens — La Balance des Heures. Tribut : quand une créature touche le sorcier adverse, il perd des points de vie et vous en gagnez autant. 140 crédits, cinq cartes, une rare garantie ; les cartes du thème sont plus fréquentes sans être garanties.',
  },
]);
export const RPG_OFFRE_DIAPO = RPG_PROMO_DEBUT + RPG_PROMO_SLIDES.length;
