/** Soutiens ordinaires du premier duo d’Ascensions. Contrairement aux
 * Ascensions, ces cartes entrent dans les paquets, la main et la collection.
 * Les choix automatiques sont annoncés explicitement : ordre de la main,
 * dernière carte admissible du cimetière, première depuis le dessus du deck. */
export const RPG_ASCENSION_SUPPORT_CREATURES = Object.freeze([
  Object.freeze({
    id: 'convoi-des-dunes', name: 'Convoi des dunes', kind: 'creature',
    element: 'sable', set: 'ascension-soutiens', art: 'convoi-des-dunes',
    cost: 2, atk: 1, def: 2, rarity: 'inhabituelle',
    typeLine: 'Créature — Humain · Éclaireur',
    arrivee: { type: 'renfort-ascension', zone: 'main', roles: [{ element: 'sable', cout: 2 }] },
    text: 'Quand le Convoi arrive : invoquez spécialement la première créature Sable de coût imprimé 2 de votre main. Ce renfort ne consomme pas votre invocation normale. Sans Rapidité, il ne peut pas attaquer ce tour. Cet effet est limité à une fois par tour, toutes vos copies du Convoi confondues.',
    flavor: 'Il connaît les chemins que les scorpions empruntent sous le sable.',
  }),
]);

export const RPG_ASCENSION_SUPPORT_SPELLS = Object.freeze([
  Object.freeze({
    id: 'retour-des-ensevelis', name: 'Retour des ensevelis', kind: 'magie',
    element: 'tenebres', set: 'ascension-soutiens', art: 'retour-des-ensevelis',
    cost: 3, rarity: 'inhabituelle', typeLine: 'Sorcellerie — Ténèbres',
    cibles: ['soi'], renfortUneFois: true,
    effet: { type: 'reanimation', element: 'tenebres', coutMax: 3, sansAscension: true, renfortAscension: true },
    text: 'Réanimez la dernière créature Ténèbres de coût imprimé 3 ou moins de votre cimetière. Elle ne consomme pas votre invocation normale et, sans Rapidité, ne peut pas attaquer ce tour. Une fois par tour, toutes vos copies de ce sort confondues.',
    flavor: 'La procession n’attend pas que les tombeaux soient refermés.',
  }),
  Object.freeze({
    id: 'confluence-des-etincelles', name: 'Confluence des étincelles', kind: 'magie',
    element: 'braise', set: 'ascension-soutiens', art: 'confluence-des-etincelles',
    cost: 3, rarity: 'rare', typeLine: 'Sorcellerie — Braise',
    cibles: ['soi'], renfortUneFois: true,
    effet: { type: 'renfort-ascension', zone: 'main', roles: [
      { type: 'djinn', element: 'braise', cout: 1 },
      { type: 'djinn', element: 'braise', cout: 3 },
    ] },
    text: 'Invoquez spécialement depuis votre main votre premier Djinn Braise de coût imprimé 1, puis votre premier Djinn Braise de coût imprimé 3, s’ils sont présents et s’il reste de la place. Ces renforts ne consomment pas votre invocation normale. Sans Rapidité, ils ne peuvent pas attaquer ce tour. Une fois par tour, toutes vos copies de ce sort confondues.',
    flavor: 'Une étincelle appelle la flamme ; la flamme réclame un corps.',
  }),
  Object.freeze({
    id: 'eveil-des-dunes', name: 'Éveil des dunes', kind: 'magie',
    element: 'sable', set: 'ascension-soutiens', art: 'eveil-des-dunes',
    cost: 4, rarity: 'rare', typeLine: 'Sorcellerie — Sable',
    cibles: ['soi'], renfortUneFois: true,
    effet: { type: 'renfort-ascension', zone: 'deck', roles: [{ type: 'elemental', element: 'sable', cout: 4 }] },
    text: 'Invoquez spécialement le premier Élémental Sable de coût imprimé 4 rencontré depuis le dessus de votre pioche. Le reste de la pioche conserve son ordre. Ce renfort ne consomme pas votre invocation normale et, sans Rapidité, ne peut pas attaquer ce tour. Une fois par tour, toutes vos copies de ce sort confondues.',
    flavor: 'Le désert n’a jamais été immobile. Il attendait son heure.',
  }),
]);
