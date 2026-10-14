/**
 * Le Serment du Soleil rouge — extension mono-Braise du Sablier.
 * Inspiration : guerriers du Japon et folklore japonais. Identité de jeu :
 * Résonance samouraï et Honneur à la mort. Les yōkai et Kagutsuchi ne sont pas des figures historiques.
 */
export const RPG_SOLEIL_ROUGE_SET_ID = 'serment-du-soleil-rouge';

/** Communes/inhabituelles : 1 ; rares : 2 ; mythiques : 3. */
export const RPG_HONNEUR_PAR_RARETE = Object.freeze({
  commune: 1, inhabituelle: 1, rare: 2, mythique: 3,
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
      text: [texte, `Honneur ${honneur} — Quand cette créature meurt, elle inflige ${honneur} dégât${honneur > 1 ? 's' : ''} à une créature adverse choisie au hasard.`].filter(Boolean).join(' '),
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
}];

export const RPG_SOLEIL_ROUGE_CREATURES = [
  carte({
    id: 'susanoo', name: 'Susanoo',
    cost: 5, atk: 6, def: 3, rarity: 'mythique',
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
    id: 'ashigaru-des-braises', name: 'Ashigaru des braises',
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
    cost: 3, atk: 2, def: 3, rarity: 'rare',
    typeLine: 'Créature — Humain · Samouraï',
    resonance: 1,
    resonanceTribu: 'samourai',
    text: 'Résonance samouraï — Tant qu’il est en jeu, toutes les créatures de type Samouraï de la table, dans les deux camps, gagnent +1/+1.',
    flavor: 'Il ne garde pas la porte pour empêcher les vivants d’entrer.',
  }),
  carte({
    id: 'onna-musha-des-cendres', name: 'Onna-musha des cendres',
    cost: 4, atk: 3, def: 3, rarity: 'rare',
    typeLine: 'Créature — Humaine · Guerrière · Samouraï',
    text: '—',
    flavor: 'La naginata décrit un cercle ; personne n’en franchit le bord.',
  }),
  carte({
    id: 'tengu-du-mont-ardent', name: 'Tengu du mont ardent',
    cost: 4, atk: 4, def: 2, rarity: 'rare', envol: true,
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
    cost: 6, atk: 5, def: 5, rarity: 'mythique',
    typeLine: 'Créature légendaire — Kami · Feu',
    resonance: 1,
    resonanceTribu: 'samourai',
    text: 'Résonance samouraï — Tant que Kagutsuchi est en jeu, toutes les créatures de type Samouraï de la table, dans les deux camps, gagnent +1/+1.',
    flavor: 'Le feu avait un nom avant que les hommes apprennent à le contenir.',
  }),  // Trois samouraïs de plus : une recrue commune, une inhabituelle et un
  // daimyō rare. Leur type imprimé suffit à recevoir la Résonance samouraï.
  carte({
    id: 'hatamoto-des-cendres', name: 'Hatamoto des cendres',
    cost: 2, atk: 2, def: 2, rarity: 'commune',
    typeLine: 'Créature — Humain · Samouraï',
    text: '—',
    flavor: 'Il marche derrière son seigneur, et devant la mort.',
  }),
  carte({
    id: 'kenshi-de-la-forge', name: 'Kenshi de la forge',
    cost: 3, atk: 2, def: 4, rarity: 'rare',
    typeLine: 'Créature — Humain · Samouraï',
    text: '—',
    flavor: 'Il a appris à tenir l’acier avant de savoir tenir une lame.',
  }),
  carte({
    id: 'daimyo-du-soleil-rouge', name: 'Daimyō du Soleil rouge',
    cost: 5, atk: 4, def: 5, rarity: 'rare',
    typeLine: 'Créature — Humain · Samouraï',
    text: '—',
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
    effet: { type: 'arme', cible: 'creature-amie', atk: 5, def: -2, coupRapide: true },
    text: 'Arme — Le porteur gagne +5/-2 et Coup rapide : quand il attaque, choisissez une créature adverse ; il lui inflige sa force sans riposte, puis poursuit son attaque. Le sabre reste attaché et rejoint le cimetière quand le porteur quitte le jeu. Si sa défense tombe à 0, le porteur meurt.',
    flavor: 'La lame prend la force. La main en paie le prix.',
  }),
  carte({
    id: 'frappe-iaijutsu', name: 'Frappe d’iaijutsu',
    kind: 'magie', cost: 2, rarity: 'rare', instant: true,
    typeLine: 'Magie Rapide — Technique · Braise',
    cibles: ['creature'],
    effet: { type: 'degats', amount: 3, cible: 'creature' },
    text: 'Magie Rapide — Inflige 3 dégâts à une créature ciblée.',
    flavor: 'Le fourreau n’a pas fini de résonner que le duel est terminé.',
  }),
  carte({
    id: 'feux-de-kitsune', name: 'Feux de kitsune',
    kind: 'magie', cost: 3, rarity: 'rare',
    typeLine: 'Sorcellerie — Feu follet · Braise',
    cibles: ['toutes'],
    effet: { type: 'degats', amount: 2, cible: 'toutes-creatures', echo: { amount: 1, tours: 1 } },
    text: 'Inflige 2 dégâts à toutes les créatures adverses, puis 1 dégât supplémentaire au début de votre tour suivant.',
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

export const RPG_SOLEIL_ROUGE_TERRAINS = [
  carte({
    id: 'montagne-du-soleil-rouge', name: 'Montagne du Soleil rouge',
    kind: 'terrain', cost: 0, rarity: 'commune', varianteDe: 'montagne',
    typeLine: 'Terrain — Montagne',
    text: 'Engagez : ajoutez un mana Braise.',
    flavor: 'Sous le soleil rouge, la pierre garde le feu des anciens serments.',
  }),
];

export const RPG_SOLEIL_ROUGE_CARDS = [
  ...RPG_SOLEIL_ROUGE_CREATURES,
  ...RPG_SOLEIL_ROUGE_MAGIES,
  ...RPG_SOLEIL_ROUGE_TERRAINS,
];
