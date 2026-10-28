/**
 * Le Serment du Soleil rouge — extension mono-Braise du Sablier.
 * Inspiration : guerriers du Japon et folklore japonais. Identité de jeu :
 * Résonance samouraï et Harakiri à la mort. Les yōkai et Kagutsuchi ne sont pas des figures historiques.
 */
export const RPG_SOLEIL_ROUGE_SET_ID = 'serment-du-soleil-rouge';

/** Toutes les créatures du set qui portent le Harakiri ont Harakiri 1. */
export const RPG_HARAKIRI_PAR_RARETE = Object.freeze({
  commune: 1, inhabituelle: 1, rare: 1, mythique: 1,
});

const carte = (definition) => {
  // La clé de données reste `honneur` (les parties en cours la lisent dans
  // les entities sauvegardées) : seul le NOM de l'effet a changé, il
  // s'affiche et se lit Harakiri.
  const honneur = ['magie', 'terrain'].includes(definition.kind) ? 0 : (definition.honneur ?? RPG_HARAKIRI_PAR_RARETE[definition.rarity]);
  const texte = definition.text === '—' ? '' : definition.text;
  return {
    ...definition,
    element: 'braise',
    set: RPG_SOLEIL_ROUGE_SET_ID,
    art: definition.id,
    ...(honneur ? {
      honneur,
      text: [texte, `Harakiri${honneur > 1 ? ` ${honneur}` : ''} — Quand cette créature meurt, elle inflige ${honneur} dégât${honneur > 1 ? 's' : ''} à une créature adverse choisie au hasard, ou au sorcier adverse s’il n’y en a aucune.`].filter(Boolean).join(' '),
    } : {}),
  };
};

export const RPG_SOLEIL_ROUGE_JETONS = [{
  id: 'petit-orochi', name: 'Petit Orochi', pluriel: 'petits Orochi',
  kind: 'creature', jeton: true, element: 'braise', set: RPG_SOLEIL_ROUGE_SET_ID,
  art: 'petit-orochi', cost: 0, atk: 4, def: 4, rarity: 'commune',
  typeLine: 'Créature-jeton — Serpent',
  text: 'Créé à la mort d’Orochi. 4/4, sans coût.',
  flavor: 'Chaque fragment porte encore la force du serpent.',
}, {
  // Le Samouraï levé par le Daimyō : un corps de plus sur la table, de type
  // Samouraï — il reçoit donc la Résonance samouraï comme la bannière de son
  // seigneur. Sans coût, sans Harakiri (un jeton n’est pas une carte du set) et
  // sans Rapidité : il arrive avec le mal d’invocation, comme tout le monde.
  id: 'samourai-du-daimyo', name: 'Samouraï', pluriel: 'samouraïs',
  kind: 'creature', jeton: true, element: 'braise', set: RPG_SOLEIL_ROUGE_SET_ID,
  art: 'samourai-du-daimyo', cost: 0, atk: 1, def: 1, rarity: 'commune',
  typeLine: 'Créature-jeton — Humain · Samouraï',
  text: 'Créé à l’arrivée du Daimyō du Soleil rouge. 1/1, sans coût.',
  flavor: 'Il a répondu à l’étendard avant même de connaître son nom.',
}];

export const RPG_SOLEIL_ROUGE_CREATURES = [
  carte({
    id: 'susanoo', name: 'Susanoo',
    cost: 6, atk: 5, def: 3, rarity: 'mythique',
    typeLine: 'Créature légendaire — Kami · Tempête',
    arrivee: { type: 'exil', cible: 'creature', coutMin: 5 },
    text: 'Quand Susanoo arrive en jeu, retirez de la partie une créature de coût 5 ou plus de votre choix.',
    flavor: 'Sa tempête emporte jusqu’au souvenir de ses adversaires.',
  }),
  carte({
    id: 'orochi', name: 'Orochi', honneur: 0,
    cost: 8, atk: 8, def: 8, rarity: 'mythique',
    typeLine: 'Créature légendaire — Serpent',
    destruction: { type: 'jetons', jeton: 'petit-orochi', nombre: 2 },
    text: 'Quand Orochi meurt, créez deux créatures-jetons « Petit Orochi » 4/4 sous votre contrôle.',
    flavor: 'La fin du serpent n’est que le commencement de ses héritiers.',
  }),
  carte({
    id: 'cavalier-des-deux-sabres', name: 'Cavalier des deux sabres',
    cost: 6, atk: 5, def: 4, rarity: 'mythique', rapidite: true, overkill: true,
    typeLine: 'Créature légendaire — Humain · Samouraï',
    text: 'Rapidité — Peut attaquer le tour où il arrive. Overkill — Quand il attaque et qu’on le bloque, l’excédent de sa force au-delà des bloqueurs perce jusqu’au sorcier adverse.',
    flavor: 'Sans armure, sans hésitation : les cimes ne sont qu’un autre chemin.',
  }),
  carte({
    id: 'ashigaru-des-braises', name: 'Ashigaru des braises', honneur: 0,
    cost: 1, atk: 1, def: 1, rarity: 'commune',
    typeLine: 'Créature — Humain · Ashigaru · Samouraï',
    text: '—',
    flavor: 'Avant les noms gravés dans les chroniques, il y eut ceux qui tinrent la ligne.',
  }),
  carte({
    id: 'ronin-du-soleil-rouge', name: 'Rōnin du Soleil rouge',
    cost: 3, atk: 3, def: 2, rarity: 'inhabituelle', rapidite: true,
    typeLine: 'Créature — Humain · Rōnin · Samouraï',
    text: 'Rapidité — Peut attaquer le tour où il arrive.',
    flavor: 'Sans maître, mais pas sans parole.',
  }),
  carte({
    id: 'samourai-du-torii', name: 'Shogun promu',
    cost: 4, atk: 2, def: 2, rarity: 'rare',
    typeLine: 'Créature — Humain · Samouraï',
    resonance: 1,
    resonanceTribu: 'samourai',
    text: 'Résonance samouraï — Tant qu’il est en jeu, toutes les créatures de type Samouraï de la table, lui compris, dans les deux camps, gagnent +1/+1.',
    flavor: 'Il ne garde pas la porte pour empêcher les vivants d’entrer.',
  }),
  carte({
    id: 'onna-musha-des-cendres', name: 'Onna-musha des cendres',
    cost: 4, atk: 3, def: 3, rarity: 'rare',
    typeLine: 'Créature — Humaine · Guerrière · Samouraï',
    esquive: true,
    text: 'Esquive — 25 % de chance d’esquiver une attaque, une Magie ou une Sorcellerie : leur effet sur elle ne porte pas du tout. Les capacités ne s’esquivent pas.',
    flavor: 'La naginata décrit un cercle ; personne n’en franchit le bord.',
  }),
  carte({
    id: 'tengu-du-mont-ardent', name: 'Tengu du mont ardent',
    cost: 4, atk: 2, def: 3, rarity: 'rare', envol: true,
    typeLine: 'Créature — Yōkai · Tengu',
    resonance: 1,
    resonanceTribu: 'samourai',
    text: 'Résonance samouraï — Tant qu’il est en jeu, toutes les créatures de type Samouraï de la table, dans les deux camps, gagnent +1/+1. Envol — Ne peut être bloqué que par une créature avec Envol.',
    flavor: 'La montagne enseigne à ceux qui savent écouter ses ailes.',
  }),
  carte({
    id: 'oni-de-la-fournaise', name: 'Oni de la fournaise', honneur: 0,
    cost: 5, atk: 4, def: 5, rarity: 'mythique',
    typeLine: 'Créature — Yōkai · Oni',
    arrivee: { type: 'degats', amount: 3, cible: 'creature', nombre: 2 },
    text: 'Quand l’Oni de la fournaise arrive : il inflige 3 dégâts à deux créatures ciblées (ou 3 dégâts à une seule s’il n’y en a qu’une).',
    flavor: 'Même tombée, sa massue fait trembler la forge.',
  }),
  carte({
    id: 'kagutsuchi-flamme-originelle', name: 'Kagutsuchi, Flamme originelle', honneur: 0,
    cost: 6, atk: 2, def: 6, rarity: 'mythique',
    typeLine: 'Créature légendaire — Kami · Feu',
    coupRapide: true,
    coupCritique: { chance: 0.25, fois: 4 },
    text: 'Attaque ciblée — Sélectionné pour attaquer, il peut frapper une créature adverse de votre choix (30 % de chances de rater, 100 % de chances de toucher s’il attaque l’adversaire) : il lui inflige ses dégâts d’attaque, sans riposte, et son attaque s’arrête là. Si vous ne désignez personne, il attaque normalement. Coup critique — En combat, 25 % de chances de frapper 4 fois la créature adverse.',
    flavor: 'Le feu avait un nom avant que les hommes apprennent à le contenir.',
  }),  // Trois samouraïs de plus : une recrue commune, un soutien rare et un
  // daimyō mythique. Leur type imprimé suffit à recevoir la Résonance samouraï.
  carte({
    id: 'hatamoto-des-cendres', name: 'Hatamoto des cendres',
    cost: 2, atk: 2, def: 2, rarity: 'commune',
    typeLine: 'Créature — Humain · Samouraï',
    text: '—',
    flavor: 'Il marche derrière son seigneur, et devant la mort.',
  }),
  carte({
    id: 'kenshi-de-la-forge', name: 'Kenshi de la forge',
    cost: 3, atk: 1, def: 2, rarity: 'rare',
    typeLine: 'Créature — Humain · Samouraï',
    // L'aura de forge : +1/+0 aux créatures ADJACENTES de SON camp, quel que
    // soit leur type — une aura ne franchit jamais la ligne du camp adverse et
    // une case vide coupe le voisinage (voir `appliquerAurasBuffAutres`).
    // Le petit corps est le prix de l'aura.
    aura: { type: 'buff-autres', atk: 1, def: 0, saufSoi: true, camps: 'camp' },
    text: 'Tant qu’il est en jeu, vos créatures adjacentes gagnent +1/+0, quel que soit leur type.',
    flavor: 'Il a appris à tenir l’acier avant de savoir tenir une lame.',
  }),
  // Le pourfendeur : la carte « duel » du set. Il ne cherche pas le contact —
  // il le rend. Contre-attaque lit les coups portés CONTRE lui (Attaque ciblée,
  // capacité qui le cible) et les sorts qui l'atteignent, y compris les sorts
  // de zone (`ripostesDeZone`) ; Esquive ne l'empêche jamais de riposter, elle
  // ne fait que lui épargner les dégâts (voir `riposteDeContreAttaque`).
  carte({
    id: 'tojiro-le-pourfendeur', name: 'Tojiro, le pourfendeur',
    cost: 6, atk: 5, def: 5, rarity: 'mythique',
    typeLine: 'Créature légendaire — Humain · Samouraï',
    esquive: true,
    contreAttaque: true,
    text: 'Esquive — 25 % de chance d’esquiver une attaque, une Magie ou une Sorcellerie : leur effet sur lui ne porte pas du tout. Contre-attaque — Quand une créature adverse le frappe avec Attaque ciblée ou le cible avec une capacité, Tojiro lui inflige ses dégâts d’attaque ; quand c’est un sort — ciblé ou de zone — qui l’atteint, la riposte frappe le sorcier adverse. S’il esquive une attaque ou un sort, il contre-attaque quand même. Les capacités ne s’esquivent pas.',
    flavor: 'Les deux lames ne dansent pas : elles répondent, coup pour coup, sans jamais reculer.',
  }),
  carte({
    id: 'daimyo-du-soleil-rouge', name: 'Daimyō du Soleil rouge',
    cost: 5, atk: 3, def: 4, rarity: 'mythique',
    typeLine: 'Créature — Humain · Samouraï',
    // Il lève ses deux Samouraïs en arrivant, puis grandit chaque attaque de son
    // camp : la bannière ne se lit que sur les créatures de type Samouraï.
    arrivee: { type: 'jetons', jeton: 'samourai-du-daimyo', nombre: 2 },
    banniere: { tribu: 'samourai', atk: 1, def: 1 },
    text: 'Quand le Daimyō arrive en jeu, il crée deux créatures-jetons « Samouraï » 1/1. Tant qu’il est en jeu, chaque fois qu’un Samouraï de votre camp attaque, ce Samouraï gagne +1/+1.',
    flavor: 'Sous son étendard, le soleil rouge ne se couche pas.',
  }),
];

/** Arme attachée : utilise le ciblage des magies, reste sur son porteur. */
export const RPG_SOLEIL_ROUGE_MAGIES = [
  carte({
    id: 'sabre-maudit', name: 'Sabre maudit',
    kind: 'magie', cost: 4, rarity: 'rare',
    typeLine: 'Arme — Sabre maudit',
    cibles: ['creature-amie'],
    effet: { type: 'arme', cible: 'creature-amie', atk: 2, def: -2, coupCritique: 0.25 },
    // Le Lien de la Flamme : sur Kagutsuchi, le sabre ne mord **que la
    // force** — la défense imprimée reste intacte (+2/+0 au lieu de +2/-2).
    // Et comme les coups critiques se cumulent, sa frappe quadruple passe de
    // 25 % à 50 % de chances SANS que ce Lien ait à l'écrire.
    lien: { ancre: 'kagutsuchi-flamme-originelle', effet: { def: 0 }, porteur: true },
    text: 'Arme — Le porteur gagne +2/-2. Coup critique — 25 % de chances d’infliger deux fois ses dégâts d’attaque à une créature adverse ; contre le sorcier, l’attaque ciblée touche à 100 %. Le sabre rejoint le cimetière quand le porteur quitte le jeu. Lien de la Flamme — sur Kagutsuchi, Flamme originelle, le sabre ne mord que la force : le porteur gagne +2/+0 au lieu de +2/-2, et son critique s’ajoute à sa frappe quadruple (50 % de chances de frapper 4 fois).',
    flavor: 'La lame prend la force. La main en paie le prix.',
  }),
  carte({
    id: 'braise-et-sable', name: 'Braise et sable',
    kind: 'magie', cost: 3, rarity: 'rare',
    colors: ['braise', 'sable'], colorCost: { braise: 1, sable: 1 },
    typeLine: 'Arme — Lame de braise et de sable',
    cibles: ['creature-amie'],
    effet: { type: 'arme', cible: 'creature-amie', atk: 1, def: 0, coupRapide: true, coupCritique: 0.25 },
    // Le Lien du deuxième sabre : le Cavalier en porte deux, la lame en mord
    // une fois de plus. Attaque ciblée et coup critique restent intacts.
    lien: { ancre: 'cavalier-des-deux-sabres', effet: { atk: 2 } },
    text: 'Arme — Le porteur gagne +1/+0 et Attaque ciblée (déclaré attaquant, il peut frapper une créature adverse de votre choix avec 30 % de chances de rater : elle encaisse ses dégâts, sans riposte, et son attaque s’arrête là ; sans proie désignée, il attaque l’adversaire normalement avec 100 % de chances de toucher). Coup critique — 25 % de chances d’infliger deux fois ses dégâts d’attaque à une créature adverse. L’arme rejoint le cimetière quand son porteur quitte le jeu. Lien du Cavalier — si le Cavalier des deux sabres est en jeu, le porteur gagne +2/+0 à la place.',
    flavor: 'Une moitié mord ; l’autre choisit où.',
  }),
  carte({
    id: 'frappe-iaijutsu', name: 'Frappe d’iaijutsu',
    kind: 'magie', cost: 1, rarity: 'rare', instant: true,
    typeLine: 'Magie Rapide — Technique · Braise',
    cibles: ['creature'],
    effet: { type: 'degats', amount: 2, cible: 'creature' },
    // Le Lien du Pourfendeur : la frappe gagne le cran qui manquait, celui qui
    // finit le duel — 3 au lieu de 2, pour 1 mana.
    lien: { ancre: 'tojiro-le-pourfendeur', effet: { amount: 3 } },
    text: 'Magie Rapide — Inflige 2 dégâts à une créature ciblée. Lien du Pourfendeur — si Tojiro, le pourfendeur est en jeu, inflige 3 dégâts à la place.',
    flavor: 'Le fourreau n’a pas fini de résonner que le duel est terminé.',
  }),
  carte({
    id: 'feux-de-kitsune', name: 'Feux de kitsune',
    kind: 'magie', cost: 5, rarity: 'rare',
    typeLine: 'Sorcellerie — Feu follet · Braise',
    cibles: ['creature', 'creature'],
    effet: { type: 'degats', amount: 4, cible: 'creature', choixDegats: true },
    // Le Lien de la fournaise : l'Oni frappe deux fois, et les deux feux
    // montent d'un cran — 5 sur une cible, 3 sur chacune des deux.
    lien: { ancre: 'oni-de-la-fournaise', effet: { amount: 5, secondAmount: 3 } },
    text: 'Sorcellerie — Infligez 4 dégâts à une créature ou 2 dégâts à chacune de deux créatures ciblées. Lien de l’Oni — si l’Oni de la fournaise est en jeu, infligez 5 dégâts à une créature ou 3 dégâts à chacune de deux créatures ciblées.',
    flavor: 'Ne suivez pas les lumières entre les cèdres : elles connaissent déjà votre chemin.',
  }),
  carte({
    id: 'serment-de-la-forge', name: 'Serment de la forge',
    kind: 'magie', cost: 4, rarity: 'mythique',
    typeLine: 'Sorcellerie — Serment · Braise',
    cibles: ['soi'],
    effet: { type: 'buff', atk: 2, def: 1, coupRapide: true, tours: 1 },
    lien: { ancre: 'daimyo-du-soleil-rouge', effet: { atk: 3, def: 1 } },
    text: 'Vos créatures gagnent +2/+1 et Attaque ciblée (30 % de chances de rater contre une créature, 100 % de chances de toucher l’adversaire) jusqu’à la fin du tour. Lien du Daimyō — si le Daimyō du Soleil rouge est en jeu, elles gagnent +3/+1 à la place.',
    flavor: 'Ce n’est pas l’acier qui prête serment, mais la main qui le reçoit.',
  }),
];

export const RPG_SOLEIL_ROUGE_CARDS = [
  ...RPG_SOLEIL_ROUGE_CREATURES,
  ...RPG_SOLEIL_ROUGE_MAGIES,
];
