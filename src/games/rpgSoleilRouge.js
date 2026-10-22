/**
 * Le Serment du Soleil rouge — extension mono-Braise du Sablier.
 * Inspiration : guerriers du Japon et folklore japonais. Identité de jeu :
 * Résonance samouraï et Honneur à la mort. Les yōkai et Kagutsuchi ne sont pas des figures historiques.
 */
export const RPG_SOLEIL_ROUGE_SET_ID = 'serment-du-soleil-rouge';

/** Toutes les créatures du set qui portent Honneur ont Honneur 1. */
export const RPG_HONNEUR_PAR_RARETE = Object.freeze({
  commune: 1, inhabituelle: 1, rare: 1, mythique: 1,
});

const carte = (definition) => {
  const honneur = ['magie', 'terrain'].includes(definition.kind) ? 0 : (definition.honneur ?? RPG_HONNEUR_PAR_RARETE[definition.rarity]);
  const texte = definition.text === '—' ? '' : definition.text;
  return {
    ...definition,
    element: 'braise',
    set: RPG_SOLEIL_ROUGE_SET_ID,
    art: definition.id,
    ...(honneur ? {
      honneur,
      text: [texte, `Honneur ${honneur} — Quand cette créature meurt, elle inflige ${honneur} dégât${honneur > 1 ? 's' : ''} à une créature adverse choisie au hasard, ou au sorcier adverse s’il n’y en a aucune.`].filter(Boolean).join(' '),
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
  // seigneur. Sans coût, sans Honneur (un jeton n’est pas une carte du set) et
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
    arrivee: { type: 'exil', cible: 'creature' },
    text: 'Quand Susanoo arrive en jeu, retirez de la partie une créature de votre choix.',
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
    cost: 6, atk: 5, def: 4, rarity: 'mythique', rapidite: true,
    typeLine: 'Créature légendaire — Humain · Samouraï',
    text: 'Rapidité — Peut attaquer le tour où il arrive.',
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
    id: 'samourai-du-torii', name: 'Samouraï du torii',
    cost: 4, atk: 2, def: 2, rarity: 'rare',
    typeLine: 'Créature — Humain · Samouraï',
    resonance: 1,
    resonanceTribu: 'samourai',
    resonanceExclutSource: true,
    text: 'Résonance samouraï — Tant qu’il est en jeu, toutes les autres créatures de type Samouraï de la table, dans les deux camps, gagnent +1/+1.',
    flavor: 'Il ne garde pas la porte pour empêcher les vivants d’entrer.',
  }),
  carte({
    id: 'onna-musha-des-cendres', name: 'Onna-musha des cendres',
    cost: 4, atk: 3, def: 3, rarity: 'rare',
    typeLine: 'Créature — Humaine · Guerrière · Samouraï',
    esquive: true,
    text: 'Esquive — 30 % de chance d’esquiver une attaque, une Magie ou une Sorcellerie : leur effet sur elle ne porte pas du tout. Les capacités ne s’esquivent pas.',
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
    id: 'oni-de-la-fournaise', name: 'Oni de la fournaise',
    cost: 5, atk: 5, def: 4, rarity: 'mythique',
    typeLine: 'Créature — Yōkai · Oni',
    text: '—',
    flavor: 'Même tombée, sa massue fait trembler la forge.',
  }),
  carte({
    id: 'kagutsuchi-flamme-originelle', name: 'Kagutsuchi, Flamme originelle',
    cost: 6, atk: 6, def: 5, rarity: 'mythique',
    typeLine: 'Créature légendaire — Kami · Feu',
    coupRapide: true,
    text: 'Coup rapide — Sélectionné pour attaquer, il peut frapper une créature adverse de votre choix (30 % de chances de rater, 100 % de chances de toucher s’il attaque l’adversaire) : il lui inflige ses dégâts d’attaque, sans riposte, et son attaque s’arrête là. Si vous ne désignez personne, il attaque normalement.',
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
    // L'aura de forge : +1/+0 à TOUTES les AUTRES créatures de SON camp,
    // quel que soit leur type — une aura ne franchit jamais la ligne du camp
    // adverse (voir `appliquerAuraKenshi`). Le petit corps est le prix de l'aura.
    aura: { type: 'buff-autres', atk: 1, def: 0, saufSoi: true, camps: 'camp' },
    text: 'Tant qu’il est en jeu, toutes vos autres créatures gagnent +1/+0, quel que soit leur type.',
    flavor: 'Il a appris à tenir l’acier avant de savoir tenir une lame.',
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
    effet: { type: 'arme', cible: 'creature-amie', atk: 1, def: 0, coupRapide: true },
    text: 'Arme — Le porteur gagne +1/+0 et Coup rapide : déclaré attaquant, il peut frapper une créature adverse de votre choix (30 % de chances de rater) — elle encaisse sa force sans riposte, et son attaque s’arrête là ; sans proie désignée, il attaque normalement (100 % de chances de toucher l’adversaire). Le sabre reste attaché et rejoint le cimetière quand le porteur quitte le jeu.',
    flavor: 'La lame prend la force. La main en paie le prix.',
  }),
  carte({
    id: 'frappe-iaijutsu', name: 'Frappe d’iaijutsu',
    kind: 'magie', cost: 2, rarity: 'rare', instant: true,
    typeLine: 'Magie Rapide — Technique · Braise',
    cibles: ['creature'],
    effet: { type: 'degats', amount: 2, cible: 'creature' },
    text: 'Magie Rapide — Inflige 2 dégâts à une créature ciblée.',
    flavor: 'Le fourreau n’a pas fini de résonner que le duel est terminé.',
  }),
  carte({
    id: 'feux-de-kitsune', name: 'Feux de kitsune',
    kind: 'magie', cost: 5, rarity: 'rare',
    typeLine: 'Sorcellerie — Feu follet · Braise',
    cibles: ['creature'],
    effet: { type: 'degats', amount: 4, cible: 'creature' },
    text: 'Sorcellerie — Inflige 4 blessures à une créature ciblée.',
    flavor: 'Ne suivez pas les lumières entre les cèdres : elles connaissent déjà votre chemin.',
  }),
  carte({
    id: 'serment-de-la-forge', name: 'Serment de la forge',
    kind: 'magie', cost: 4, rarity: 'mythique',
    typeLine: 'Sorcellerie — Serment · Braise',
    cibles: ['soi'],
    effet: { type: 'buff', atk: 2, def: 1, tours: 1 },
    text: 'Vos créatures gagnent +2/+1 jusqu’à la fin du tour.',
    flavor: 'Ce n’est pas l’acier qui prête serment, mais la main qui le reçoit.',
  }),
];

export const RPG_SOLEIL_ROUGE_CARDS = [
  ...RPG_SOLEIL_ROUGE_CREATURES,
  ...RPG_SOLEIL_ROUGE_MAGIES,
];
