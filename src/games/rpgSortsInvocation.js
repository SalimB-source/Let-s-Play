/** Sorcelleries de renfort : le choix s'effectue après résolution du sort. */
export const RPG_SORTS_INVOCATION = Object.freeze([
  Object.freeze({
    id: 'appel-des-marees', name: 'Appel des marées', kind: 'magie',
    element: 'eau', set: 'renforts', art: 'appel-des-marees',
     rarity: 'rare', typeLine: 'Sorcellerie — Eau', cibles: ['soi'], renfortUneFois: true,
    effet: { type: 'renfort-choisi', zone: 'deck', dessus: 3, element: 'eau', coutMax: 3, reste: 'dessous' },
    text: 'Parmi les trois cartes du dessus de votre deck, invoquez spécialement une créature Eau de coût imprimé 3 ou moins de votre choix. Placez les autres dessous, dans l’ordre. Une fois par tour.',
    flavor: 'La mer répond toujours à ceux qui connaissent son nom.',
  }),
  Object.freeze({
    id: 'ralliement-des-neiges', name: 'Ralliement des neiges', kind: 'magie',
    element: 'neige', set: 'renforts', art: 'ralliement-des-neiges',
     rarity: 'inhabituelle', typeLine: 'Sorcellerie — Neige', cibles: ['soi'], renfortUneFois: true,
    effet: { type: 'renfort-choisi', zone: 'main', coutExact: 5 },
    text: 'Invoquez spécialement une créature de coût imprimé 5 choisie dans votre main. Une fois par tour.',
    flavor: 'Au premier cor, les silhouettes émergent de la neige.',
  }),
  Object.freeze({
    id: 'veille-des-braises', name: 'Veille des braises', kind: 'magie',
    element: 'braise', set: 'renforts', art: 'veille-des-braises',
     rarity: 'inhabituelle', typeLine: 'Sorcellerie — Braise', cibles: ['soi'], renfortUneFois: true,
    effet: { type: 'renfort-choisi', zone: 'main', element: 'braise', coutExact: 3, ephemere: true },
    text: 'Invoquez spécialement une créature Braise de coût imprimé 3 choisie dans votre main. Détruisez-la à la fin du tour. Une fois par tour.',
    flavor: 'Une seule braise suffit à rappeler les gardiens du feu.',
  }),
]);
