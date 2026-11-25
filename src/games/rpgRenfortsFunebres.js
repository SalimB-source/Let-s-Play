/** Créature de renfort déclenchée par la mort, sans réanimation d'Ascension. */
export const RPG_RENFORTS_FUNEBRES = Object.freeze([
  Object.freeze({
    id: 'gardienne-des-derniers-noms', name: 'Gardienne des derniers noms', kind: 'creature',
    activation: { nom: 'Retour des ensevelis', cible: 'aucune', uneFoisParMatch: true, sortAssocie: 'retour-des-ensevelis', effet: { type: 'reanimation', element: 'tenebres', coutMax: 3, sansAscension: true, renfortAscension: true } },
    element: 'tenebres', set: 'balance-des-heures', art: 'gardienne-des-derniers-noms',
    cost: 3, atk: 2, def: 2, rarity: 'inhabituelle', typeLine: 'Créature — Humaine · Gardienne',
    destruction: { type: 'renfort-ascension', zone: 'deck', roles: [{ element: 'tenebres', coutMax: 2 }] },
    text: 'À sa mort : invoquez spécialement la première créature Ténèbres de coût imprimé 2 ou moins depuis le dessus de votre deck.',
    flavor: 'Son dernier souffle réveille un nom que la pierre avait oublié.',
  }),
  Object.freeze({
    id: 'veilleur-des-cendres', name: 'Veilleur des cendres', kind: 'creature',
    activation: { nom: 'Veille des braises', cible: 'aucune', uneFoisParMatch: true, sortAssocie: 'veille-des-braises', effet: { type: 'renfort-choisi', zone: 'main', element: 'braise', coutExact: 3, ephemere: true } },
    element: 'braise', set: 'serment-du-soleil-rouge', art: 'veilleur-des-cendres',
    cost: 3, atk: 3, def: 2, rarity: 'rare', typeLine: 'Créature — Humain · Samouraï',
    destruction: { type: 'renfort-choisi', zone: 'cimetiere', elements: ['tenebres', 'neige'], coutMax: 3, ephemere: true, uneFoisParNom: true },
    text: 'À sa mort : invoquez spécialement une créature Ténèbres ou Neige de coût imprimé 3 ou moins choisie dans votre cimetière. Détruisez-la à la fin du tour.',
    flavor: 'Une braise demeure quand la dernière lame est tombée.',
  }),
]);
