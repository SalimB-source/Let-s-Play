/** Soutiens ordinaires du premier duo d’Ascensions. Contrairement aux
 * Ascensions, ces cartes entrent dans les paquets, la main et la collection.
 * Chaque effet précise les modalités de son choix et sa zone. */
export const RPG_ASCENSION_SUPPORT_CREATURES = Object.freeze([
  Object.freeze({
    id: 'gardienne-des-sables-ensevelis', name: 'Gardienne des sables ensevelis', kind: 'creature',
    element: 'sable', set: 'ascension-soutiens', art: 'gardienne-des-sables-ensevelis',
    cost: 4, atk: 2, def: 4, rarity: 'rare', typeLine: 'Créature — Humaine · Gardienne',
    defenseur: true,
    arrivee: { type: 'renfort-choisi', zone: 'cimetiere', coutMax: 3, ascensionAutorisee: true, bouclierRenfort: true },
    text: 'Défenseur. À son arrivée : choisissez dans votre cimetière une créature de coût imprimé 3 ou moins et invoquez-la spécialement avec un bouclier avant son effet d’arrivée.',
    flavor: 'Le désert garde les noms que les vivants ont oubliés.',
  }),
  Object.freeze({
    id: 'convoi-des-dunes', name: 'Convoi des dunes', kind: 'creature',
    element: 'sable', set: 'ascension-soutiens', art: 'convoi-des-dunes',
    cost: 2, atk: 1, def: 2, rarity: 'inhabituelle',
    typeLine: 'Créature — Humain · Éclaireur',
    arrivee: { type: 'choix-zone', zone: 'cimetiere', destination: 'main', elements: ['braise', 'sable', 'tenebres'] },
    text: 'À son arrivée : choisissez une créature Braise, Sable ou Ténèbres dans votre cimetière et renvoyez-la dans votre main.',
    flavor: 'Il connaît les chemins que les scorpions empruntent sous le sable.',
  }),
]);

export const RPG_ASCENSION_SUPPORT_SPELLS = Object.freeze([
  Object.freeze({
    id: 'retour-des-ensevelis', name: 'Retour des ensevelis', kind: 'magie',
    element: 'tenebres', set: 'ascension-soutiens', art: 'retour-des-ensevelis',
     rarity: 'inhabituelle', typeLine: 'Sorcellerie — Ténèbres',
    cibles: ['soi'], renfortUneFois: true,
    effet: { type: 'reanimation', element: 'tenebres', coutMax: 3, sansAscension: true, renfortAscension: true },
    text: 'Choisissez et réanimez une créature Ténèbres non-Ascension de coût imprimé 3 ou moins de votre cimetière.',
    flavor: 'La procession n’attend pas que les tombeaux soient refermés.',
  }),
  Object.freeze({
    id: 'confluence-des-etincelles', name: 'Confluence des étincelles', kind: 'magie',
    element: 'braise', set: 'ascension-soutiens', art: 'confluence-des-etincelles',
     rarity: 'rare', typeLine: 'Sorcellerie — Braise',
    cibles: ['soi'], renfortUneFois: true,
    effet: { type: 'renfort-ascension', zone: 'main', roles: [
      { type: 'djinn', element: 'braise', cout: 1 },
      { type: 'djinn', element: 'braise', cout: 3 },
    ] },
    text: 'Invoquez spécialement depuis votre main jusqu’à deux Djinns Braise : le premier de coût imprimé 1, puis le premier de coût 3.',
    flavor: 'Une étincelle appelle la flamme ; la flamme réclame un corps.',
  }),
  Object.freeze({
    id: 'eveil-des-dunes', name: 'Éveil des dunes', kind: 'magie',
    element: 'sable', set: 'ascension-soutiens', art: 'eveil-des-dunes',
     rarity: 'rare', typeLine: 'Sorcellerie — Sable',
    cibles: ['soi'], renfortUneFois: true,
    effet: { type: 'renfort-ascension', zone: 'deck', roles: [{ type: 'elemental', element: 'sable', cout: 4 }] },
    text: 'Invoquez spécialement le premier Élémental Sable de coût imprimé 4 depuis le dessus de votre pioche.',
    flavor: 'Le désert n’a jamais été immobile. Il attendait son heure.',
  }),
]);
