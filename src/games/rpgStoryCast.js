/**
 * Bible visuelle du récit : UN portrait canonique par personnage.
 * Les scènes ne portent jamais de chemin de portrait. Dialogues, journal et
 * plaque adverse passent par ce registre, sans tirage ni génération à la volée.
 * Les cartes existantes restent les références (même fichier, même révision).
 */
const personnages = {
  narrateur: { nom: 'Bab El', fonction: 'La ville qui monte', portrait: null, couleur: '#d7bc86' },
  salem: { nom: 'Salem', fonction: 'Le Sondeur', carte: 'salem', portrait: 'cards/salem.jpg', position: '50% 24%', couleur: '#e6bf76' },
  yamina: { nom: 'Yamina', fonction: 'L’Horlogère', carte: 'yamina', portrait: 'cards/yamina.jpg', position: '50% 26%', couleur: '#9fd1cc' },
  feriel: { nom: 'Fériel', fonction: 'La Souffleuse de verre', carte: 'feriel', portrait: 'cards/feriel.jpg', position: '55% 22%', couleur: '#efb18e' },
  tarek: { nom: 'Tarek', fonction: 'Le Porteur', carte: 'tarek', portrait: 'cards/tarek.jpg', position: '50% 24%', couleur: '#d4ad79' },
  boualem: { nom: 'Boualem', fonction: 'Le Puisatier', carte: 'boualem', portrait: 'cards/boualem.jpg', position: '50% 22%', couleur: '#9bc7d2' },
  guetteur: { nom: 'Le Guetteur', fonction: 'Vigie de la Chambre', carte: 'guetteur-du-beffroi', portrait: 'cards/guetteur-du-beffroi.jpg', position: '60% 22%', couleur: '#cebb99' },
  scribe: { nom: 'La Scribe', fonction: 'Greffière des évacuations', portrait: 'sablier-story/scribe.jpg', position: '50% 24%', couleur: '#adc8b2' },
  puisatier: { nom: 'Le Puisatier des Cendres', fonction: 'Gardien des registres de passage', portrait: 'sablier-story/puisatier.jpg', position: '50% 24%', couleur: '#9bc7d2' },
  mahieddine: { nom: 'Mahieddine', fonction: 'Le Grand Horloger', portrait: 'sablier-story/mahieddine.jpg', position: '50% 24%', couleur: '#d7bc86' },
};
export const RPG_STORY_CAST = Object.freeze(Object.fromEntries(
  Object.entries(personnages).map(([id, personnage]) => [id, Object.freeze({ id, ...personnage })]),
));

export const RPG_STORY_OPPONENT_CAST = Object.freeze({
  'listes-1': 'guetteur',
  'listes-2': 'scribe',
  'listes-3': 'puisatier',
  'listes-4': 'feriel',
  'listes-5': 'mahieddine',
});

export function personnageHistoire(id) {
  return Object.hasOwn(RPG_STORY_CAST, id) ? RPG_STORY_CAST[id] : RPG_STORY_CAST.narrateur;
}

/** cardArt est le résolveur partagé du duel, avec ses révisions de cache. */
export function portraitHistoire(id, baseUrl = '/', cardArt = null) {
  const personnage = personnageHistoire(id);
  if (!personnage.portrait) return null;
  if (personnage.carte && cardArt) return cardArt(personnage.carte);
  return `${baseUrl}${personnage.portrait}?v=recit-listes-1`;
}

export function personnageEtage(etageId) {
  return RPG_STORY_OPPONENT_CAST[etageId] ?? null;
}

export const RPG_STORY_DECORS = Object.freeze({
  tour: Object.freeze({ fichier: 'sablier-tours/tour-des-listes.jpg', position: '50% 45%' }),
  greffe: Object.freeze({ fichier: 'sablier-story/greffe.jpg', position: '50% 50%' }),
  citerne: Object.freeze({ fichier: 'sablier-tours/tour-des-abysses.jpg', position: '50% 65%' }),
  atelier: Object.freeze({ fichier: 'sablier-tours/tour-du-souk.jpg', position: '50% 55%' }),
});
