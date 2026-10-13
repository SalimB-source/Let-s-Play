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
  marchand: { nom: 'Le Marchand de sable', fonction: 'Facteur des étals', carte: 'faiseur-de-passage', portrait: 'cards/faiseur-de-passage.jpg', position: '50% 24%', couleur: '#d9b578' },
  amani: { nom: 'La Gardienne des ksour', fonction: 'Portière du souk haut', carte: 'amani-des-ksour', portrait: 'cards/amani-des-ksour.jpg', position: '50% 22%', couleur: '#e2bd84' },
  'djinn-souk': { nom: 'Le Djinn du tournant', fonction: 'Rouleur d’épices', carte: 'djinn-du-souk', portrait: 'cards/djinn-du-souk.jpg', position: '50% 22%', couleur: '#ef9d6e' },
  'reine-etals': { nom: 'La Reine des étals', fonction: 'Doyenne du souk', carte: 'tin-hinan', portrait: 'cards/tin-hinan-des-pistes.jpg', position: '50% 22%', couleur: '#ecc987' },
  pecheur: { nom: 'Le Pêcheur de perles', fonction: 'Plongeur des citernes basses', carte: 'veilleuse-des-citernes', portrait: 'cards/veilleuse-des-citernes.jpg', position: '50% 24%', couleur: '#8ec7d2' },
  nageuse: { nom: 'La Nageuse des puits', fonction: 'Gardienne des eaux souterraines', carte: 'bakunawa', portrait: 'cards/bakunawa.jpg', position: '50% 24%', couleur: '#7ab8cb' },
  sonneur: { nom: 'Le Sonneur d’écume', fonction: 'Cloche des ports engloutis', carte: 'sonneur-fele', portrait: 'cards/sonneur-fele.jpg', position: '50% 24%', couleur: '#9fd1cc' },
  devoreur: { nom: 'Le Dévoreur de l’abîme', fonction: 'Gardien du fond', carte: 'leviathan', portrait: 'cards/leviathan.jpg', position: '50% 24%', couleur: '#6fb3c8' },
  'garde-fjord': { nom: 'La Garde du fjord', fonction: 'Boucliers du passage', carte: 'guerrier-au-bouclier-rond', portrait: 'cards/guerrier-au-bouclier-rond.jpg', position: '50% 22%', couleur: '#a8cbe0' },
  'meute-neiges': { nom: 'La Meute des neiges', fonction: 'Chasseurs du plateau de glace', carte: 'loup-des-neiges', portrait: 'cards/loup-des-neiges.jpg', position: '50% 24%', couleur: '#b9d6e8' },
  'valkyrie-fjord': { nom: 'La Valkyrie du fjord', fonction: 'Porteuse du corbeau', carte: 'valkyrie-des-glaces', portrait: 'cards/valkyrie-des-glaces.jpg', position: '50% 22%', couleur: '#c4def0' },
  'maitre-hivers': { nom: 'Le Maître des Neuf Hivers', fonction: 'Celui qui tient le serment', carte: 'pere-des-corbeaux', portrait: 'cards/pere-des-corbeaux.jpg', position: '50% 22%', couleur: '#d3e7f5' },
  'dernier-fennec': { nom: 'Le Dernier Fennec', fonction: 'Éclaireur des étages perdus', carte: 'fennec-des-decombres', portrait: 'cards/fennec-des-decombres.jpg', position: '50% 24%', couleur: '#e3be7a' },
  'ifrit-ergs': { nom: 'L’Ifrit des ergs', fonction: 'Gardien du portail', carte: 'ifrit-des-ergs', portrait: 'cards/ifrit-des-ergs.jpg', position: '50% 22%', couleur: '#f09c67' },
  'horloger-zenith': { nom: 'L’Horloger du Zénith', fonction: 'Voix de l’horloge du ciel', carte: 'sahir-des-braises', portrait: 'cards/sahir-des-braises.jpg', position: '50% 22%', couleur: '#e8c47c' },
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
  'souk-1': 'marchand',
  'souk-2': 'amani',
  'souk-3': 'djinn-souk',
  'souk-4': 'reine-etals',
  'abysses-1': 'pecheur',
  'abysses-2': 'nageuse',
  'abysses-3': 'sonneur',
  'abysses-4': 'devoreur',
  'fjord-1': 'garde-fjord',
  'fjord-2': 'meute-neiges',
  'fjord-3': 'valkyrie-fjord',
  'fjord-4': 'maitre-hivers',
  'sables-1': 'dernier-fennec',
  'sables-2': 'ifrit-ergs',
  'sables-3': 'horloger-zenith',
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
  fjord: Object.freeze({ fichier: 'sablier-tours/tour-du-fjord.jpg', position: '50% 45%' }),
  sables: Object.freeze({ fichier: 'sablier-tours/tour-des-sables.jpg', position: '50% 48%' }),
});
