/** Créature de renfort déclenchée par la mort, sans réanimation d'Ascension. */
export const RPG_RENFORTS_FUNEBRES = Object.freeze([
  Object.freeze({
    id: 'gardienne-des-derniers-noms', name: 'Gardienne des derniers noms', kind: 'creature',
    element: 'tenebres', set: 'balance-des-heures', art: 'gardienne-des-derniers-noms',
    cost: 3, atk: 2, def: 2, rarity: 'inhabituelle', typeLine: 'Créature — Humaine · Gardienne',
    destruction: { type: 'renfort-ascension', zone: 'cimetiere', roles: [{ element: 'tenebres', coutMax: 2 }] },
    text: 'Quand la Gardienne meurt : invoquez spécialement la dernière créature Ténèbres de coût imprimé 2 ou moins de votre cimetière, s’il reste une place. Ce renfort ne consomme pas votre invocation normale ; sans Rapidité, il ne peut pas attaquer ce tour. Une fois par tour, toutes vos Gardiennes des derniers noms confondues.',
    flavor: 'Son dernier souffle réveille un nom que la pierre avait oublié.',
  }),
  Object.freeze({
    id: 'veilleur-des-cendres', name: 'Veilleur des cendres', kind: 'creature',
    element: 'braise', set: 'serment-du-soleil-rouge', art: 'veilleur-des-cendres',
    cost: 3, atk: 3, def: 2, rarity: 'rare', typeLine: 'Créature — Humain · Samouraï',
    destruction: { type: 'renfort-ascension', zone: 'cimetiere', roles: [{ element: 'braise', coutMax: 2 }] },
    text: 'Quand le Veilleur meurt : invoquez spécialement la dernière créature Braise de coût imprimé 2 ou moins de votre cimetière, s’il reste une place. Ce renfort ne consomme pas votre invocation normale ; sans Rapidité, il ne peut pas attaquer ce tour. Une fois par tour, toutes vos copies du Veilleur des cendres confondues.',
    flavor: 'Une braise demeure quand la dernière lame est tombée.',
  }),
]);
