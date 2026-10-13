/**
 * Les recettes des decks du Sablier.
 *
 * Une recette n'est pas une liste de cartes : c'est **ce qui ne se négocie
 * pas** dans un deck, le reste étant composé par `rpgDeckComposer.js` avec
 * **les meilleures cartes de l'identité, palier de rareté puis puissance**
 * (`rpgCardPower.js`). Une recette tient donc en cinq lignes :
 *
 *   - `identite`  : la ou les couleurs du deck — aucune carte hors de là
 *                   n'entre, jamais (un mono-Sable reste cent pour cent Sable) ;
 *   - `terrains`  : les places de terrains, jusqu'à la peinture de chaque
 *                   variante (le Désert et les Dunes du Ténéré ne produisent
 *                   pas le même sable mais la même chose) ;
 *   - `creatures` : les places de créatures et de héros ;
 *   - `magies`    : les places de sorts ;
 *   - `armes`     : les places d'armes (0 par défaut : les paquets de
 *                   l'Histoire n'en alignent pas encore) ;
 *   - `signature` : les cartes qui portent l'archétype du deck, posées avant
 *                   le remplissage — c'est l'âme du boîtier, et c'est aussi ce
 *                   qui distingue deux decks qui puisent dans le même vivier.
 *
 * Deux plafonds facultatifs (`mythiquesMax`, `raresMax`) ne servent qu'aux
 * decks de l'Histoire : ils bornent le nombre de figures et de rares qu'un
 * sorcier aligne, pour que la rampe des Tours tienne — la Garde du fjord
 * n'ouvre pas avec le Père des corbeaux, le Maître des Neuf Hivers si.
 *
 * La somme `terrains + creatures + magies + armes` doit faire 40 — c'est le
 * contrôle de `tests/rpg-decks-puissance.test.js`, avec bien d'autres.
 */

/**
 * Les cinq boîtiers de l'étagère (onglet Deck). Ils ne connaissent aucun
 * plafond : ce sont les decks du joueur, et le duel libre leur laisse tout le
 * catalogue de leur couleur.
 */
export const RPG_RECETTES_DECKS = {
  /**
   * Mono-Sable. L'identité amazighe garde ses trois gardiennes des ksour (l'égide d'Amani, la protection de Tiziri, la guide Amayas) et l'éclaireuse
   * des Aurès ; le reste des places va aux meilleures cartes Sable du
   * catalogue — les trois héros mythiques (Salem, Tarek, Tin Hinan), le
   * Cavalier et le Scribe, et le Fennec à son maximum. Côté sorts, la Tempête
   * de sable balaie la table et le Rapport du greffier fait piocher.
   */
  'veilleurs-du-desert': {
    identite: ['sable'],
    terrains: [['desert', 9], ['dunes-du-tenere', 8]],
    creatures: 16,
    magies: 5,
    armes: 2,
    signature: [
      ['amani-des-ksour', 3],
      ['cavalier-amazigh-du-desert', 1],
      ['tiziri-du-djurdjura', 1],
      ['amayas-du-hoggar', 1],
      ['tislit-des-aures', 1],
      ['tempete-de-sable', 1],
    ],
  },
  /**
   * Mono-Braise. Le vivier Braise tient en dix cartes : le deck les aligne
   * toutes à leur maximum — les quatre communes (Braisier, Ghul, Trait, Nuage)
   * à trois, les six mythiques (Fériel, Anqa, Djinn du souk, Sahir, Ifrit des
   * ergs, Ifrit al-Ahmar) à un. Les quatre places restantes reviennent aux
   * terrains : vingt-deux cartes de Braise, une courbe qui grimpe jusqu'à
   * l'Ifrit al-Ahmar.
   */
  'cour-des-djinns': {
    identite: ['braise'],
    terrains: [['montagne', 11], ['cretes-de-cendre', 11]],
    creatures: 11,
    magies: 6,
    armes: 1,
    signature: [
      ['braisier-du-souk', 3],
      ['trait-de-braise', 3],
      ['nuage-de-cendres', 3],
    ],
  },
  /**
   * Hybride Sable + Braise. Les deux couleurs n'ont plus de terrains séparés :
   * Désert et Montagne se partagent la moitié des places, Pétra (et sa seconde
   * source) prend l'autre et choisit sa couleur à chaque engagement. La
   * signature est bicolore — le Djinn de foudre et le Vent rouge exigent une
   * source de chaque — et le remplissage fait entrer **les neuf mythiques des
   * deux couleurs**, plus le Gardien des ksour et le Braisier.
   */
  'sentiers-de-cendre': {
    identite: ['sable', 'braise'],
    terrains: [
      ['desert', 3], ['dunes-du-tenere', 3],
      ['montagne', 3], ['cretes-de-cendre', 3],
      ['petra', 3], ['petra-des-deux-sources', 2],
    ],
    creatures: 16,
    magies: 5,
    armes: 2,
    signature: [
      ['djinn-de-foudre', 3],
      ['vent-rouge', 2],
      ['rempart-de-dunes', 1],
      ['takouba-des-pistes', 1],
    ],
  },
  /**
   * Mono-Eau. L'archétype du deck est le contresort : les six contres
   * (Contresort des abîmes, Silence d'écume, Défection) et les deux renvois en
   * main (Ressac, Courant de retour) sont posés d'abord. Le reste des places
   * va aux bêtes mythiques — Bakunawa, Kraken, Léviathan, Jörmungandr — et aux
   * deux héros d'Eau que le catalogue n'avait encore jamais alignés : Yamina
   * l'Horlogère et Boualem le Puisatier, aux côtés du Colosse de sel et de la
   * Vipère de verre.
   */
  'maree-des-abysses': {
    identite: ['eau'],
    terrains: [['mer', 8], ['lagune-des-salines', 8]],
    creatures: 8,
    magies: 14,
    armes: 2,
    signature: [
      ['contresort-des-abimes', 3],
      ['silence-decume', 3],
      ['ressac', 2],
      ['courant-de-retour', 1],
    ],
  },
  /**
   * Mono-Neige. Le Serment garde l'âme du set — le loup, le guerrier au
   * bouclier rond, le Jarl et sa Furie (la seule Furie du jeu, montrée au
   * duel), le Mur de boucliers, le Hurlement et la Brume — et empile ses
   * meilleures cartes : les quatre figures du Nord, les deux valkyries et le
   * Berserk à leur maximum.
   */
  'serment-des-neuf-hivers': {
    identite: ['neige'],
    terrains: [['glacier', 9], ['glacier-des-arches', 8]],
    creatures: 14,
    magies: 7,
    armes: 2,
    signature: [
      ['jarl-au-marteau-de-guerre', 1],
      ['loup-des-neiges', 1],
      ['guerrier-au-bouclier-rond', 1],
      ['mur-de-boucliers', 2],
      ['hurlement-du-blizzard', 1],
      ['brume-du-fjord', 1],
    ],
  },
};

/**
 * Les cinq paquets que l'Histoire joue et que l'étagère ne montre pas — les
 * variantes des sorciers des Tours. Chacun garde sa signature et son plafond :
 * c'est la rampe de la campagne (l'étage dit la puissance, le paquet dit la
 * manière).
 */
export const RPG_RECETTES_HISTOIRE = {
  /**
   * La Souffleuse de verre (Listes 4, Souk 4) : l'Hybride agressive. Fériel
   * frappe avec le verre, le Trait de braise est son retrait instantané, le
   * Fennec ouvre la piste et le Vent rouge balaie ; quatre mythiques au plus,
   * pour laisser les Figures du fjord au sommet de la campagne.
   */
  'souffleuse-de-verre': {
    identite: ['sable', 'braise'],
    terrains: [
      ['desert', 3], ['dunes-du-tenere', 3],
      ['montagne', 3], ['cretes-de-cendre', 3],
      ['petra', 3], ['petra-des-deux-sources', 2],
    ],
    creatures: 17,
    magies: 6,
    mythiquesMax: 4,
    raresMax: 3,
    signature: [
      ['feriel', 1],
      ['trait-de-braise', 3],
      ['fennec-des-decombres', 3],
      ['vent-rouge', 2],
      ['djinn-de-foudre', 1],
    ],
  },
  /**
   * La Garde du fjord (Fjord 1) : la muraille d'abord. Un seul mythique — la
   * Dame des neuf mondes —, deux rares au plus, et le reste en boucliers,
   * brumes et festins : le premier étage du Nord apprend au joueur à frapper
   * dans une défense, pas à survivre à une avalanche.
   */
  'gardes-du-fjord': {
    identite: ['neige'],
    terrains: [['glacier', 11], ['glacier-des-arches', 10]],
    creatures: 12,
    magies: 7,
    mythiquesMax: 1,
    raresMax: 2,
    signature: [
      ['dame-des-neuf-mondes', 1],
      ['mur-de-boucliers', 3],
      ['brume-du-fjord', 2],
      ['festin-des-vaillants', 2],
      ['scalde-des-runes', 1],
      ['guerrier-au-bouclier-rond', 1],
    ],
  },
  /**
   * La Meute des neiges (Fjord 2) : la course. Aucun mythique, les loups
   * devant, le Berserk et les valkyries à leur maximum, le Hurlement et la
   * Brume pour finir — la Garde tenait la porte, la Meute la défonce.
   */
  'meute-des-neiges': {
    identite: ['neige'],
    terrains: [['glacier', 11], ['glacier-des-arches', 10]],
    creatures: 13,
    magies: 6,
    mythiquesMax: 0,
    raresMax: 3,
    signature: [
      ['loup-des-neiges', 3],
      ['berserk-des-trois-hivers', 2],
      ['guerrier-au-bouclier-rond', 1],
      ['hurlement-du-blizzard', 1],
    ],
  },
  /**
   * Le Maître des Neuf Hivers (Fjord 4) : le boss du Nord. Deux figures — le
   * Père des corbeaux et le Maître du marteau — et quatre rares : les deux
   * valkyries, le Berserk et le Drakkar, tous à trois exemplaires.
   */
  'maitre-des-neuf-hivers': {
    identite: ['neige'],
    terrains: [['glacier', 9], ['glacier-des-arches', 9]],
    creatures: 15,
    magies: 7,
    mythiquesMax: 2,
    raresMax: 4,
    signature: [
      ['pere-des-corbeaux', 1],
      ['maitre-du-marteau', 1],
    ],
  },
  /**
   * Le Grand Horloger (Listes 5, Sables 3) : le boss de la Chambre des Heures.
   * Il tenait les Veilleurs, il tient maintenant un vrai hybride : Pétra
   * rejoint le Désert et la Montagne pour payer les trois figures qu'il aligne
   * — Tin Hinan, Sahir des braises et l'Anqa — plus les meilleures cartes de
   * chaque couleur. (Auparavant, ses deux mythiques de Braise étaient
   * injouables : le paquet n'avait aucune source de Braise.)
   */
  'grand-horloger': {
    identite: ['sable', 'braise'],
    terrains: [
      ['desert', 5], ['dunes-du-tenere', 5],
      ['montagne', 3], ['cretes-de-cendre', 2],
      ['petra', 2],
    ],
    creatures: 17,
    magies: 6,
    mythiquesMax: 3,
    raresMax: 4,
    signature: [
      ['tin-hinan', 1],
      ['sahir-des-braises', 1],
      ['anqa-des-braises', 1],
    ],
  },
};
