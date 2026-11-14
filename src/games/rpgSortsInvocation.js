/** Sorcelleries de renfort : le choix s'effectue après résolution du sort. */
export const RPG_SORTS_INVOCATION = Object.freeze([
  Object.freeze({
    id: 'appel-des-marees', name: 'Appel des marées', kind: 'magie',
    element: 'eau', set: 'renforts', art: 'appel-des-marees',
    cost: 3, rarity: 'rare', typeLine: 'Sorcellerie — Eau', cibles: ['soi'], renfortUneFois: true,
    effet: { type: 'renfort-choisi', zone: 'deck', dessus: 3, coutMax: 3, reste: 'dessous' },
    text: 'Regardez les trois cartes du dessus de votre deck. Choisissez parmi elles une créature de coût imprimé 3 ou moins et invoquez-la spécialement, si possible. Placez les autres cartes sous le deck dans leur ordre initial. Ce renfort ne consomme pas votre invocation normale ; sans Rapidité, il ne peut pas attaquer ce tour. Une fois par tour.',
    flavor: 'La mer répond toujours à ceux qui connaissent son nom.',
  }),
  Object.freeze({
    id: 'ralliement-des-neiges', name: 'Ralliement des neiges', kind: 'magie',
    element: 'neige', set: 'renforts', art: 'ralliement-des-neiges',
    cost: 2, rarity: 'inhabituelle', typeLine: 'Sorcellerie — Neige', cibles: ['soi'], renfortUneFois: true,
    effet: { type: 'renfort-choisi', zone: 'deck', element: 'neige', coutMax: 4, melanger: true, ephemere: true },
    text: 'Choisissez une créature Neige de coût imprimé 4 ou moins dans votre deck et invoquez-la spécialement, si possible. Mélangez ensuite votre deck. La créature est détruite à la fin du tour. Ce renfort ne consomme pas votre invocation normale ; sans Rapidité, il ne peut pas attaquer ce tour. Une fois par tour.',
    flavor: 'Au premier cor, les silhouettes émergent de la neige.',
  }),
  Object.freeze({
    id: 'veille-des-braises', name: 'Veille des braises', kind: 'magie',
    element: 'braise', set: 'renforts', art: 'veille-des-braises',
    cost: 2, rarity: 'inhabituelle', typeLine: 'Sorcellerie — Braise', cibles: ['soi'], renfortUneFois: true,
    effet: { type: 'renfort-choisi', zone: 'main', typeImprime: 'Samouraï', coutMax: 3 },
    text: 'Choisissez une créature Samouraï de coût imprimé 3 ou moins dans votre main et invoquez-la spécialement, si possible. Ce renfort ne consomme pas votre invocation normale ; sans Rapidité, il ne peut pas attaquer ce tour. Une fois par tour.',
    flavor: 'Une seule braise suffit à rappeler les gardiens du feu.',
  }),
]);
