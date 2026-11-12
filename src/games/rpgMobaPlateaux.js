// Les trois calques transparents se superposent au décor de base : la
// conquête de deux voies ne nécessite pas une image pour chaque combinaison.
const avecRuines = (plateau) => Object.freeze({ ...plateau, ruines: Object.freeze(Object.fromEntries(
  ['left', 'center', 'right'].map((voie) => [voie, plateau.fichier.replace(/\.webp$/, `-detruit-${voie}.webp`)]),
)) });
// Décors uniquement : les trois voies, leurs cases et leurs règles restent
// identiques quel que soit le plateau choisi dans la préparation du duel.
export const MOBA_PLATEAUX = Object.freeze([
  avecRuines({ id: 'trois-voies', nom: 'Les trois voies', fichier: 'sablier-moba/champ-trois-voies-rapprochees.webp', musique: 'table-des-heures' }),
  avecRuines({ id: 'port-des-corsaires', nom: 'Port des Corsaires', fichier: 'sablier-moba/port-des-corsaires.webp', musique: 'navire-pirate' }),
  avecRuines({ id: 'erg-des-ksour', nom: 'Erg des ksour', fichier: 'sablier-moba/erg-des-ksour.webp', musique: 'erg-du-sahara' }),
  avecRuines({ id: 'lac-gele-viking', nom: 'Lac gelé viking', fichier: 'sablier-moba/lac-gele-viking.webp', musique: 'champ-de-bataille-viking' }),
  avecRuines({ id: 'temple-du-nil-egyptien', nom: 'Temple du Nil', fichier: 'sablier-moba/temple-du-nil-egyptien.webp', musique: 'necropole-des-dalles' }),
]);

export const MOBA_PLATEAU_PAR_DEFAUT = MOBA_PLATEAUX[0];
