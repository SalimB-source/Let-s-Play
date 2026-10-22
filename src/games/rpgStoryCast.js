/**
 * Bible visuelle du récit : UN portrait canonique par personnage.
 * Les scènes ne portent jamais de chemin de portrait. Dialogues, journal et
 * plaque adverse passent par ce registre, sans tirage ni génération à la volée.
 * Les cartes existantes restent les références (même fichier, même révision).
 *
 * `stand` est le sprite détouré du plateau (fond transparent), dérivé de la
 * peinture canonique par `tools/make-stands.py`. **Tout personnage qui parle
 * en a un** : la scène ne montre plus de portrait encadré en repli pour les
 * figures des actes II à V. Le narrateur, qui est la ville elle-même, reste
 * sans sprite — la scène retombe alors sur la peinture du décor.
 *
 * `poses` donne, **situation par situation**, une variante du même sprite :
 * même visage, même tenue, même peinture — seule la posture change (et
 * l'expression avec elle). La pose de référence reste `stand` ; `poses` ne
 * fait que la remplacer le temps d'une situation, et une situation sans
 * variante garde la référence. Une figure sans `poses` reste donc valide.
 * Le fichier d'une variante suit toujours `stand-<id>-<suffixe>.webp`, le
 * suffixe étant celui que déclare la situation (`affrontement`, `decision`,
 * `apaisement`) : le test le vérifie, une variante mal nommée ne passe pas.
 */

/** Les situations qui, dans une scène, changent la posture d'un personnage. */
export const SITUATIONS_POSE_HISTOIRE = Object.freeze({
  /** La scène s'achève et un duel se prépare : on se met en garde. */
  duel: Object.freeze({ id: 'duel', nom: 'Affrontement', suffixe: 'affrontement', description: 'Dernier échange avant le duel' }),
  /** Une décision est posée au lecteur : la figure qui l'ouvre se cambre. */
  choix: Object.freeze({ id: 'choix', nom: 'Décision', suffixe: 'decision', description: 'Une décision est posée au lecteur' }),
  /** La scène se referme après la victoire : les épaules redescendent. */
  apres: Object.freeze({ id: 'apres', nom: 'Après-duel', suffixe: 'apaisement', description: 'Dernier échange de l’après-duel' }),
});

const personnages = {
  narrateur: { nom: 'Bab El', fonction: 'La ville qui monte', portrait: null, couleur: '#d7bc86' },
  salem: { nom: 'Salem', fonction: 'Le Sondeur', carte: 'salem', portrait: 'cards/salem.jpg', position: '50% 24%', couleur: '#e6bf76', stand: 'sablier-story/stands/stand-salem.webp', poses: { duel: 'sablier-story/stands/stand-salem-affrontement.webp', choix: 'sablier-story/stands/stand-salem-decision.webp', apres: 'sablier-story/stands/stand-salem-apaisement.webp' } },
  yamina: { nom: 'Yamina', fonction: 'L’Horlogère', carte: 'yamina', portrait: 'cards/yamina.jpg', position: '50% 26%', couleur: '#9fd1cc', stand: 'sablier-story/stands/stand-yamina.webp', poses: { duel: 'sablier-story/stands/stand-yamina-affrontement.webp', choix: 'sablier-story/stands/stand-yamina-decision.webp', apres: 'sablier-story/stands/stand-yamina-apaisement.webp' } },
  feriel: { nom: 'Fériel', fonction: 'La Souffleuse de verre', carte: 'feriel', portrait: 'cards/feriel.jpg', position: '55% 15%', couleur: '#efb18e', stand: 'sablier-story/stands/stand-feriel.webp', poses: { duel: 'sablier-story/stands/stand-feriel-affrontement.webp', apres: 'sablier-story/stands/stand-feriel-apaisement.webp' } },
  tarek: { nom: 'Tarek', fonction: 'Le Porteur', carte: 'tarek', portrait: 'cards/tarek.jpg', position: '50% 24%', couleur: '#d4ad79', stand: 'sablier-story/stands/stand-tarek.webp', poses: { duel: 'sablier-story/stands/stand-tarek-affrontement.webp', apres: 'sablier-story/stands/stand-tarek-apaisement.webp' } },
  boualem: { nom: 'Boualem', fonction: 'Le Puisatier', carte: 'boualem', portrait: 'cards/boualem.jpg', position: '50% 22%', couleur: '#9bc7d2', stand: 'sablier-story/stands/stand-boualem.webp', poses: { duel: 'sablier-story/stands/stand-boualem-affrontement.webp', choix: 'sablier-story/stands/stand-boualem-decision.webp', apres: 'sablier-story/stands/stand-boualem-apaisement.webp' } },
  guetteur: { nom: 'Le Guetteur', fonction: 'Vigie de la Chambre', carte: 'guetteur-du-beffroi', portrait: 'cards/guetteur-du-beffroi.jpg', position: '60% 22%', couleur: '#cebb99', stand: 'sablier-story/stands/stand-guetteur.webp', poses: { duel: 'sablier-story/stands/stand-guetteur-affrontement.webp', apres: 'sablier-story/stands/stand-guetteur-apaisement.webp' } },
  scribe: { nom: 'La Scribe', fonction: 'Greffière des évacuations', portrait: 'sablier-story/scribe.jpg', position: '50% 24%', couleur: '#adc8b2', stand: 'sablier-story/stands/stand-scribe.webp', poses: { duel: 'sablier-story/stands/stand-scribe-affrontement.webp', choix: 'sablier-story/stands/stand-scribe-decision.webp', apres: 'sablier-story/stands/stand-scribe-apaisement.webp' } },
  puisatier: { nom: 'Le Puisatier des Cendres', fonction: 'Gardien des registres de passage', portrait: 'sablier-story/puisatier.jpg', position: '50% 24%', couleur: '#9bc7d2', stand: 'sablier-story/stands/stand-puisatier.webp', poses: { duel: 'sablier-story/stands/stand-puisatier-affrontement.webp', apres: 'sablier-story/stands/stand-puisatier-apaisement.webp' } },
  mahieddine: { nom: 'Mahieddine', fonction: 'Le Grand Horloger', portrait: 'sablier-story/mahieddine.jpg', position: '50% 24%', couleur: '#d7bc86', stand: 'sablier-story/stands/stand-mahieddine.webp', poses: { duel: 'sablier-story/stands/stand-mahieddine-affrontement.webp', choix: 'sablier-story/stands/stand-mahieddine-decision.webp', apres: 'sablier-story/stands/stand-mahieddine-apaisement.webp' } },
  marchand: { nom: 'Le Marchand de sable', fonction: 'Facteur des étals', carte: 'faiseur-de-passage', portrait: 'cards/faiseur-de-passage.jpg', position: '50% 24%', couleur: '#d9b578', stand: 'sablier-story/stands/stand-marchand.webp', poses: { duel: 'sablier-story/stands/stand-marchand-affrontement.webp', apres: 'sablier-story/stands/stand-marchand-apaisement.webp' } },
  amani: { nom: 'La Gardienne des ksour', fonction: 'Portière du souk haut', carte: 'amani-des-ksour', portrait: 'cards/amani-des-ksour.jpg', position: '50% 22%', couleur: '#e2bd84', stand: 'sablier-story/stands/stand-amani.webp', poses: { duel: 'sablier-story/stands/stand-amani-affrontement.webp', apres: 'sablier-story/stands/stand-amani-apaisement.webp' } },
  'djinn-souk': { nom: 'Le Djinn du tournant', fonction: 'Rouleur d’épices', carte: null, portrait: 'cards/djinn-du-souk.jpg', position: '50% 22%', couleur: '#ef9d6e', stand: 'sablier-story/stands/stand-djinn-souk.webp', poses: { duel: 'sablier-story/stands/stand-djinn-souk-affrontement.webp', choix: 'sablier-story/stands/stand-djinn-souk-decision.webp', apres: 'sablier-story/stands/stand-djinn-souk-apaisement.webp' } },
  'reine-etals': { nom: 'La Reine des étals', fonction: 'Doyenne du souk', carte: 'tin-hinan', portrait: 'cards/tin-hinan-des-pistes.jpg', position: '50% 22%', couleur: '#ecc987', stand: 'sablier-story/stands/stand-reine-etals.webp', poses: { duel: 'sablier-story/stands/stand-reine-etals-affrontement.webp', apres: 'sablier-story/stands/stand-reine-etals-apaisement.webp' } },
  pecheur: { nom: 'Le Pêcheur de perles', fonction: 'Plongeur des citernes basses', carte: 'veilleuse-des-citernes', portrait: 'cards/veilleuse-des-citernes.jpg', position: '50% 24%', couleur: '#8ec7d2', stand: 'sablier-story/stands/stand-pecheur.webp', poses: { duel: 'sablier-story/stands/stand-pecheur-affrontement.webp', apres: 'sablier-story/stands/stand-pecheur-apaisement.webp' } },
  nageuse: { nom: 'La Nageuse des puits', fonction: 'Gardienne des eaux souterraines', carte: 'bakunawa', portrait: 'cards/bakunawa.jpg', position: '50% 24%', couleur: '#7ab8cb', stand: 'sablier-story/stands/stand-nageuse.webp', poses: { duel: 'sablier-story/stands/stand-nageuse-affrontement.webp', apres: 'sablier-story/stands/stand-nageuse-apaisement.webp' } },
  sonneur: { nom: 'Le Sonneur d’écume', fonction: 'Cloche des ports engloutis', carte: 'sonneur-fele', portrait: 'cards/sonneur-fele.jpg', position: '50% 24%', couleur: '#9fd1cc', stand: 'sablier-story/stands/stand-sonneur.webp', poses: { duel: 'sablier-story/stands/stand-sonneur-affrontement.webp', apres: 'sablier-story/stands/stand-sonneur-apaisement.webp' } },
  devoreur: { nom: 'Le Dévoreur de l’abîme', fonction: 'Gardien du fond', carte: 'leviathan', portrait: 'cards/leviathan.jpg', position: '50% 24%', couleur: '#6fb3c8', stand: 'sablier-story/stands/stand-devoreur.webp', poses: { duel: 'sablier-story/stands/stand-devoreur-affrontement.webp', apres: 'sablier-story/stands/stand-devoreur-apaisement.webp' } },
  'garde-fjord': { nom: 'La Garde du fjord', fonction: 'Boucliers du passage', carte: 'guerrier-au-bouclier-rond', portrait: 'cards/guerrier-au-bouclier-rond.jpg', position: '50% 22%', couleur: '#a8cbe0', stand: 'sablier-story/stands/stand-garde-fjord.webp', poses: { duel: 'sablier-story/stands/stand-garde-fjord-affrontement.webp', apres: 'sablier-story/stands/stand-garde-fjord-apaisement.webp' } },
  'meute-neiges': { nom: 'La Meute des neiges', fonction: 'Chasseurs du plateau de glace', carte: 'loup-des-neiges', portrait: 'cards/loup-des-neiges.jpg', position: '50% 24%', couleur: '#b9d6e8', stand: 'sablier-story/stands/stand-meute-neiges.webp', poses: { duel: 'sablier-story/stands/stand-meute-neiges-affrontement.webp', apres: 'sablier-story/stands/stand-meute-neiges-apaisement.webp' } },
  'valkyrie-fjord': { nom: 'La Valkyrie du fjord', fonction: 'Porteuse du corbeau', carte: 'valkyrie-des-glaces', portrait: 'cards/valkyrie-des-glaces.jpg', position: '50% 22%', couleur: '#c4def0', stand: 'sablier-story/stands/stand-valkyrie-fjord.webp', poses: { duel: 'sablier-story/stands/stand-valkyrie-fjord-affrontement.webp', choix: 'sablier-story/stands/stand-valkyrie-fjord-decision.webp', apres: 'sablier-story/stands/stand-valkyrie-fjord-apaisement.webp' } },
  'maitre-hivers': { nom: 'Le Maître des Neuf Hivers', fonction: 'Celui qui tient le serment', carte: 'pere-des-corbeaux', portrait: 'cards/pere-des-corbeaux.jpg', position: '50% 22%', couleur: '#d3e7f5', stand: 'sablier-story/stands/stand-maitre-hivers.webp', poses: { duel: 'sablier-story/stands/stand-maitre-hivers-affrontement.webp', apres: 'sablier-story/stands/stand-maitre-hivers-apaisement.webp' } },
  'dernier-fennec': { nom: 'Le Dernier Fennec', fonction: 'Éclaireur des étages perdus', carte: 'fennec-des-decombres', portrait: 'cards/fennec-des-decombres.jpg', position: '50% 24%', couleur: '#e3be7a', stand: 'sablier-story/stands/stand-dernier-fennec.webp', poses: { duel: 'sablier-story/stands/stand-dernier-fennec-affrontement.webp', apres: 'sablier-story/stands/stand-dernier-fennec-apaisement.webp' } },
  'ifrit-ergs': { nom: 'L’Ifrit des ergs', fonction: 'Gardien du portail', carte: 'ifrit-des-ergs', portrait: 'cards/ifrit-des-ergs.jpg', position: '50% 22%', couleur: '#f09c67', stand: 'sablier-story/stands/stand-ifrit-ergs.webp', poses: { duel: 'sablier-story/stands/stand-ifrit-ergs-affrontement.webp', apres: 'sablier-story/stands/stand-ifrit-ergs-apaisement.webp' } },
  'horloger-zenith': { nom: 'L’Horloger du Zénith', fonction: 'Voix de l’horloge du ciel', carte: 'sahir-des-braises', portrait: 'cards/sahir-des-braises.jpg', position: '50% 22%', couleur: '#e8c47c', stand: 'sablier-story/stands/stand-horloger-zenith.webp', poses: { duel: 'sablier-story/stands/stand-horloger-zenith-affrontement.webp', choix: 'sablier-story/stands/stand-horloger-zenith-decision.webp', apres: 'sablier-story/stands/stand-horloger-zenith-apaisement.webp' } },
  'corsaire-mousse': { nom: 'La Mousse des galiotes', fonction: 'Guetteuse du chenal', carte: 'mousse-des-galiotes', portrait: 'cards/mousse-des-galiotes.jpg', position: '50% 22%', couleur: '#75c7d1', stand: 'sablier-story/stands/stand-pecheur.webp' },
  'corsaire-negociant': { nom: 'Le Négociant des rançons', fonction: 'Teneur des comptes de prise', carte: null, portrait: 'cards/faiseur-de-passage.jpg', position: '50% 24%', couleur: '#d9b578', stand: 'sablier-story/stands/stand-marchand.webp' },
  'corsaire-rais': { nom: 'Le Raïs de la Galiote', fonction: 'Capitaine de la flotte de la Régence', carte: 'rais-de-la-galiote', portrait: 'cards/rais-de-la-galiote.jpg', position: '50% 22%', couleur: '#9fd1cc', stand: 'sablier-story/stands/stand-sonneur.webp' },
  'corsaire-barbe-rousse': { nom: 'La Barbe-Rousse', fonction: 'Amiral du Hollandais volant', carte: 'la-barbe-rousse', portrait: 'cards/la-barbe-rousse.jpg', position: '50% 22%', couleur: '#6fb3c8', stand: 'sablier-story/stands/stand-devoreur.webp' },
  'samurai-ashigaru': { nom: 'L’Ashigaru du guet', fonction: 'Sentinelle de la palissade d’Edo', carte: 'ashigaru-des-braises', portrait: 'cards/ashigaru-des-braises.jpg', position: '50% 22%', couleur: '#e39a79', stand: 'sablier-story/stands/stand-guetteur.webp' },
  'samurai-ronin': { nom: 'Le Rōnin des braises', fonction: 'Sabre errant sans seigneur', carte: 'ronin-du-soleil-rouge', portrait: 'cards/ronin-du-soleil-rouge.jpg', position: '50% 22%', couleur: '#e99c6d', stand: 'sablier-story/stands/stand-dernier-fennec.webp' },
  'samurai-kenshi': { nom: 'Le Kenshi du torii', fonction: 'Maître d’armes du sanctuaire', carte: 'samourai-du-torii', portrait: 'cards/samourai-du-torii.jpg', position: '50% 22%', couleur: '#db846a', stand: 'sablier-story/stands/stand-valkyrie-fjord.webp' },
  'samurai-daimyo': { nom: 'Le Daimyō du Soleil rouge', fonction: 'Seigneur du Mont Ardent', carte: 'daimyo-du-soleil-rouge', portrait: 'cards/daimyo-du-soleil-rouge.jpg', position: '50% 22%', couleur: '#d56352', stand: 'sablier-story/stands/stand-maitre-hivers.webp' },
  'necro-ouvrier': { nom: 'L’Ouvrier du natron', fonction: 'Embaumeur des cryptes basses', carte: 'ouvrier-du-natron', portrait: 'cards/ouvrier-du-natron.jpg', position: '50% 22%', couleur: '#b8a5c9', stand: 'sablier-story/stands/stand-puisatier.webp' },
  'necro-chacal': { nom: 'Le Chacal du seuil', fonction: 'Gardien des caveaux', carte: 'chacal-du-seuil', portrait: 'cards/chacal-du-seuil.jpg', position: '50% 22%', couleur: '#c9a24e', stand: 'sablier-story/stands/stand-ifrit-ergs.webp' },
  'necro-peseuse': { nom: 'Celle qui pèse', fonction: 'Greffière de la Balance', carte: 'celle-qui-pese', portrait: 'cards/celle-qui-pese.jpg', position: '50% 22%', couleur: '#c9aa6a', stand: 'sablier-story/stands/stand-scribe.webp' },
  'necro-devoreuse': { nom: 'La Dévoreuse des âmes', fonction: 'Bête sacrée du Jugement', carte: 'la-devoreuse', portrait: 'cards/la-devoreuse.jpg', position: '50% 22%', couleur: '#947bb0', stand: 'sablier-story/stands/stand-devoreur.webp' },
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
  'corsaires-1': 'corsaire-mousse',
  'corsaires-2': 'corsaire-negociant',
  'corsaires-3': 'corsaire-rais',
  'corsaires-4': 'corsaire-barbe-rousse',
  'soleil-1': 'samurai-ashigaru',
  'soleil-2': 'samurai-ronin',
  'soleil-3': 'samurai-kenshi',
  'soleil-4': 'samurai-daimyo',
  'necropole-1': 'necro-ouvrier',
  'necropole-2': 'necro-chacal',
  'necropole-3': 'necro-peseuse',
  'necropole-4': 'necro-devoreuse',
});

/**
 * Le côté vers lequel la **peinture** regarde. La plupart des figures sont
 * frontales — elles tiennent indifféremment l'un ou l'autre bord du plan. Une
 * poignée est dessinée de trois quarts : posées du mauvais côté, elles fixent
 * le bord de l'écran au lieu d'interpeller leur interlocuteur, et les deux
 * personnages semblent regarder dans la même direction.
 * On ne recense donc que les figures franchement tournées.
 */
const REGARDS_PEINTS = Object.freeze({
  // Tournées vers la gauche de l'image : elles appartiennent au bord droit.
  boualem: 'gauche',
  'dernier-fennec': 'gauche',
  devoreur: 'gauche',
  'djinn-souk': 'gauche',
  feriel: 'gauche',
  marchand: 'gauche',
  nageuse: 'gauche',
  'reine-etals': 'gauche',
  // Tournées vers la droite de l'image : elles appartiennent au bord gauche.
  amani: 'droite',
  guetteur: 'droite',
  'horloger-zenith': 'droite',
  'meute-neiges': 'droite',
  salem: 'droite',
  sonneur: 'droite',
  yamina: 'droite',
});

/** Le côté vers lequel regarde la peinture d'un personnage, ou null (frontal). */
export function regardHistoire(id) {
  return Object.hasOwn(REGARDS_PEINTS, id) ? REGARDS_PEINTS[id] : null;
}

/**
 * Le plan du plateau : au plus deux figures, de gauche à droite. L'ordre du
 * récit (l'hôte puis celui qui parle) est conservé **sauf** quand il met les
 * deux regards du même bord : on échange alors les places. Une figure qui
 * regarde encore vers l'extérieur est retournée (`miroir`), pour qu'aucune ne
 * tourne le dos à son interlocuteur.
 */
export function placerPlateauHistoire(ids = []) {
  const figures = [...new Set(ids)].slice(0, 2);
  if (figures.length < 2) return figures.map((id) => ({ id, miroir: false }));
  const exterieur = (id, bord) => (regardHistoire(id) === bord ? 1 : 0);
  const rangs = (gauche, droite) => exterieur(gauche, 'gauche') + exterieur(droite, 'droite');
  const [a, b] = figures;
  const ordre = rangs(a, b) > rangs(b, a) ? [b, a] : [a, b];
  return ordre.map((id, index) => ({ id, miroir: regardHistoire(id) === (index === 0 ? 'gauche' : 'droite') }));
}

/** Une seule révision de cache pour toute la famille des sprites du récit. */
export const STAND_REVISION = 'recit-stands-5';

export function personnageHistoire(id) {
  return Object.hasOwn(RPG_STORY_CAST, id) ? RPG_STORY_CAST[id] : RPG_STORY_CAST.narrateur;
}

/** cardArt est le résolveur partagé du duel, avec ses révisions de cache. */
export function portraitHistoire(id, baseUrl = '/', cardArt = null) {
  const personnage = personnageHistoire(id);
  if (!personnage.portrait) return null;
  if (personnage.carte && cardArt) return cardArt(personnage.carte);
  return `${baseUrl}${personnage.portrait}?v=recit-listes-2`;
}

/**
 * Le personnage « découpé » du plateau (sprite détouré, fond transparent),
 * quand il existe — sinon la scène retombe sur le portrait encadré.
 * Le `?v=` date les sprites : une passe de détourage ne peut pas être servie
 * depuis un cache sous l'ancienne URL.
 */
export function standHistoire(id, baseUrl = '/') {
  const personnage = personnageHistoire(id);
  return personnage.stand ? `${baseUrl}${personnage.stand}?v=${STAND_REVISION}` : null;
}

/**
 * Le sprite du plateau pour une **situation** donnée. `choix`, `duel` et
 * `apres` ont chacun leur variante quand le personnage en a une ; sinon, et
 * pour toute situation inconnue ou absente, c'est la pose de référence. Un
 * personnage sans sprite du tout (le narrateur) rend `null`.
 */
export function poseHistoire(id, situation = null, baseUrl = '/') {
  const personnage = personnageHistoire(id);
  const variante = situation ? personnage.poses?.[situation] : null;
  return variante ? `${baseUrl}${variante}?v=${STAND_REVISION}` : standHistoire(id, baseUrl);
}

/** Les situations pour lesquelles ce personnage a réellement une variante. */
export function situationsPoseHistoire(id) {
  const poses = personnageHistoire(id).poses ?? {};
  return Object.keys(SITUATIONS_POSE_HISTOIRE).filter((situation) => Object.hasOwn(poses, situation));
}

export function personnageEtage(etageId) {
  return RPG_STORY_OPPONENT_CAST[etageId] ?? null;
}

export const RPG_STORY_DECORS = Object.freeze({
  tour: Object.freeze({ fichier: 'sablier-story/decor-tour.jpg', position: '50% 50%' }),
  greffe: Object.freeze({ fichier: 'sablier-story/greffe.jpg', position: '50% 50%' }),
  atelier: Object.freeze({ fichier: 'sablier-story/decor-atelier.jpg', position: '50% 52%' }),
  souk: Object.freeze({ fichier: 'sablier-story/decor-souk.jpg', position: '50% 50%' }),
  citerne: Object.freeze({ fichier: 'sablier-story/decor-citerne.jpg', position: '50% 55%' }),
  abysses: Object.freeze({ fichier: 'sablier-story/decor-citerne.jpg', position: '50% 55%' }),
  fjord: Object.freeze({ fichier: 'sablier-story/decor-fjord.jpg', position: '50% 50%' }),
  sables: Object.freeze({ fichier: 'sablier-story/decor-sables.jpg', position: '50% 52%' }),
});
