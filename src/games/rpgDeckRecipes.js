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
 *   - `terrains`  : liste vide ; le mana est désormais automatique ;
 *   - `creatures` : les places de créatures et de héros ;
 *   - `magies`    : les places de sorts ;
 *   - `armes`     : les places d'armes (0 par défaut : les paquets de
 *                   l'Histoire n'en alignent pas encore) ;
 *   - `signature` : les cartes qui portent l'archétype du deck, posées avant
 *                   le remplissage — c'est l'âme du boîtier, et c'est aussi ce
 *                   qui distingue deux decks qui puisent dans le même vivier.
 *
 * Les plafonds globaux (`mythiquesTotalMax`, `raresTotalMax`) contrôlent la
 * collection de raretés des decks de départ et comptent toutes les familles.
 * `finisseursMax` peut aussi borner les exemplaires à cinq manas ou plus.
 * Les plafonds facultatifs de campagne (`mythiquesMax`, `raresMax`) restent
 * comptés par famille : ils règlent la rampe des Tours sans laisser de place vide.
 *
 * La somme `creatures + magies + armes` doit faire 30 ; `terrains` reste vide — c'est le
 * contrôle de `tests/rpg-decks-puissance.test.js`, avec bien d'autres.
 */

/**
 * Les sept boîtiers de l'étagère (onglet Deck). Chaque recette fixe les cartes
 * signature, une seule mythique et un nombre de rares adapté aux trente cartes jouables ; les autres cartes
 * de ces paliers restent à obtenir dans des boosters.
 */
export const RPG_RECETTES_DECKS = {
  /**
   * Les Veilleurs apprennent les mécaniques récentes du Sable : Butin,
   * équipements à déclenchement et récupération de cartes. La Takouba de
   * Tin Hinan est leur unique mythique ; les autres figures et équipements
   * mythiques restent à ouvrir au Souk.
   */
  'veilleurs-du-desert': {
    identite: ['sable'],
    terrains: [],
    creatures: 18,
    magies: 6,
    armes: 6,
    raresTotalMax: 5,
    mythiquesTotalMax: 1,
    signature: [
      ['tiziri-du-djurdjura', 2], ['faiseur-de-passage', 2], ['rempart-de-dunes', 2],
      ['chien-du-guet', 2], ['fennec-des-decombres', 2], ['tislit-des-aures', 2],
      ['amani-des-ksour', 1], ['cavalier-amazigh-du-desert', 1],
      ['rapport-du-greffier', 1], ['tempete-de-sable', 1],
      ['sandales-de-tislit', 1], ['licou-du-chien-de-sable', 1],
      ['jitte-d-amayas', 1], ['takouba-de-tin-hinan', 1],
    ],
  },
  /**
   * Les Djinns font travailler les nouvelles règles de Braise : dégâts en
   * plusieurs vagues, effets à la mort et retour différé d'Anqa. Les guerriers
   * au Honneur et le Samouraï du torii relient le nouveau lot du Soleil rouge
   * à l'ancien feu. Anqa est l'unique mythique de ce boîtier.
   */
  'cour-des-djinns': {
    identite: ['braise'],
    terrains: [],
    creatures: 21,
    magies: 9,
    armes: 0,
    raresTotalMax: 10,
    mythiquesTotalMax: 1,
    signature: [
      ['feux-de-kitsune', 2], ['sabre-maudit', 1],
      ['ghul-des-cendres', 2], ['braisier-du-souk', 2],
      ['ashigaru-des-braises', 2], ['ronin-du-soleil-rouge', 2],
      ['samourai-du-torii', 1], ['anqa-des-braises', 1],
      ['hatamoto-des-cendres', 2],
      ['trait-de-braise', 2], ['nuage-de-cendres', 2], ['frappe-iaijutsu', 1],
    ],
  },
  /**
   * L'hybride choisit son mana entre Braise et Sable et garde la
   * frappe rapide de Fériel et les équipements du Désert. Fériel est son
   * unique mythique ; les autres figures des deux couleurs attendent les
   * boosters.
   */
  'sentiers-de-cendre': {
    identite: ['sable', 'braise'],
    terrains: [],
    creatures: 16,
    magies: 8,
    armes: 6,
    raresTotalMax: 6,
    mythiquesTotalMax: 1,
    signature: [
      ['tislit-des-aures', 2], ['ashigaru-des-braises', 2], ['hatamoto-des-cendres', 2],
      ['ghul-des-cendres', 2], ['fennec-des-decombres', 1],
      ['djinn-de-foudre', 2], ['cavalier-amazigh-du-desert', 1], ['feriel', 1],
      ['rempart-de-dunes', 1], ['vent-rouge', 2], ['trait-de-braise', 1],
      ['takouba-des-pistes', 1], ['harnais-du-mehari', 1],
      ['jitte-d-amayas', 1], ['masque-du-guetteur', 1],
    ],
  },
  /**
   * La Marée enseigne le tempo : contresorts, rebonds, la Vipère et le Bâton
   * des citernes. Son unique mythique, le Léviathan, reprend toute la table en
   * main ; Yamina, Boualem et les autres bêtes restent aux boosters.
   */
  'maree-des-abysses': {
    identite: ['eau'],
    terrains: [],
    creatures: 10,
    magies: 18,
    armes: 2,
    raresTotalMax: 7,
    mythiquesTotalMax: 1,
    signature: [
      ['lame-de-mer', 2], ['ecueil', 2],
      ['porteuse-de-cruches', 2], ['veilleuse-des-citernes', 2],
      ['sonneur-fele', 2], ['vipere-de-verre', 1], ['leviathan', 1],
      ['contresort-des-abimes', 2], ['silence-decume', 2], ['ressac', 2],
      ['eau-de-la-source', 1], ['courant-de-retour', 1], ['maree-contraire', 1],
      ['baton-des-citernes', 1],
    ],
  },
  /**
   * Le Serment des Neuf Hivers associe la Furie et l'appel viking de la
   * Valkyrie au corbeau aux tours de gel, au brouillard de combat et à la
   * Lance de givre. Le Maître du marteau et la Valkyrie des glaces sont ses
   * deux mythiques ; les autres figures du Nord se gagnent au Souk.
   */
  'serment-des-neuf-hivers': {
    identite: ['neige'],
    terrains: [],
    creatures: 17,
    magies: 12,
    armes: 1,
    raresTotalMax: 10,
    mythiquesTotalMax: 2,
    finisseursMax: 8,
    signature: [
      ['eclair-du-marteau', 2], ['festin-des-vaillants', 2],
      ['guerrier-au-bouclier-rond', 2], ['loup-des-neiges', 2],
      ['jarl-au-marteau-de-guerre', 1], ['valkyrie-des-glaces', 1], ['maitre-du-marteau', 1],
      ['drakkar-a-tete-de-dragon', 1],
      ['poigne-de-givre', 1], ['appat-de-la-meute', 1],
      ['grand-voile-blanc', 1], ['mur-de-boucliers', 1], ['lance-de-givre', 1],
    ],
  },
  /**
   * Le Soleil rouge donne sa place aux trois mécaniques du set : Honneur à la
   * mort, Résonance samouraï et Bannière du Daimyō. Kagutsuchi est l'unique
   * mythique du deck ; Orochi, Susanoo et les autres figures s'ouvrent dans les
   * boosters.
   */
  'serment-du-soleil-rouge': {
    identite: ['braise'],
    terrains: [],
    creatures: 20,
    magies: 10,
    armes: 0,
    raresTotalMax: 10,
    mythiquesTotalMax: 1,
    signature: [
      ['ghul-des-cendres', 2], ['nuage-de-cendres', 2], ['sabre-maudit', 2],
      ['ashigaru-des-braises', 2], ['hatamoto-des-cendres', 2],
      ['ronin-du-soleil-rouge', 2], ['samourai-du-torii', 2],
      ['daimyo-du-soleil-rouge', 1], ['kenshi-de-la-forge', 2],
      ['tengu-du-mont-ardent', 1], ['kagutsuchi-flamme-originelle', 1],
      ['trait-de-braise', 2], ['frappe-iaijutsu', 2], ['feux-de-kitsune', 2],
    ],
  },
  /**
   * La Balance des Heures — le premier boîtier Ténèbres, l'Égypte pharaonique
   * en égyptien revival art déco. Sa signature porte le triptyque du set : le
   * **Prix** (Papyrus, La Grande Pesée — payer des PV), le **Tribut**
   * (Chacal du seuil, Celui qui juge, le Khopesh d'or — transférer la vie) et
   * **la mort qui déclenche** (Ouvrier du natron, Momie de lin, la Couveuse et
   * leurs shabtis). La défausse adverse (Nom effacé, Celle qui pèse) et le
   * transfert du Poids complètent le plan ; La Dévoreuse, mythique du
   * boîtier, exile ce que la balance a condamné. Les trois autres mythiques
   * du set — Le Passeur au masque de chacal, Le Maître des hiéroglyphes et La
   * Dernière Pesée — restent à ouvrir dans les boosters
   * (fiche : `docs/rpg/16-deck-la-balance-des-heures.md`).
   */
  'balance-des-heures': {
    identite: ['tenebres'],
    terrains: [],
    creatures: 19,
    magies: 10,
    armes: 1,
    raresTotalMax: 6,
    mythiquesTotalMax: 1,
    signature: [
      ['la-devoreuse', 1], ['chacal-du-seuil', 2], ['celui-qui-juge', 1],
      ['khopesh-d-or', 1], ['momie-de-lin', 2],
      ['papyrus', 2], ['la-grande-pesee', 1], ['le-poids', 2],
      ['nom-efface', 1], ['celle-qui-pese', 1], ['ouvrier-du-natron', 1],
    ],
  },
  /**
   * Les Lettres de Marque (fiche : `docs/rpg/18-deck-les-lettres-de-marque.md`)
   * — le set Piraterie hybride Sable + Eau de l'âge de la course. La signature
   * pose l'équipage de la Régence : l'Abordage prend (Raïs, Cotre, Lettre de
   * marque ; le Grand Débarquement arme les cales pleines), la Rançon rend (Négociant), la Cargaison
   * assure (Galion) et le Brûlot renvoie son tueur. Le Hollandais volant —
   * vaisseau fantôme au Coup rapide et à l'Abordage 3 — hante la flotte en
   * second grand voilier, aux côtés du Galion. L'Eau qui amollit la
   * prise vient du catalogue (Sonneur fêlé, Ressac, Lame de mer, Bâton des
   * citernes) ; le remplissage choisit les meilleures cartes Sable + Eau.
   */
  'lettres-de-marque': {
    identite: ['sable', 'eau'],
    terrains: [],
    creatures: 19,
    magies: 9,
    armes: 2,
    raresTotalMax: 7,
    mythiquesTotalMax: 1,
    signature: [
      ['rais-de-la-galiote', 2], ['cotre-de-course', 2], ['le-renegat', 2],
      ['tercio-de-cuivre', 2], ['pilote-de-la-carreira', 2], ['le-brulot', 2],
      ['negociant-des-ranscons', 1], ['galion-de-la-flotte', 1],
      ['la-vengeance-de-la-reine-anne', 1], ['la-barbe-rousse', 1],
      ['sonneur-fele', 1],
      ['lettre-de-marque', 2], ['haut-fond', 2], ['le-routier', 1],
      ['le-grand-debarquement', 1], ['ressac', 1], ['lame-de-mer', 1],
      ['grappin-d-abordage', 1], ['baton-des-citernes', 1],
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
    terrains: [],
    creatures: 20,
    magies: 10,
    armes: 0,
    mythiquesMax: 4,
    raresMax: 3,
    signature: [
      ['feriel', 1],
      ['trait-de-braise', 2],
      ['fennec-des-decombres', 2],
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
    terrains: [],
    creatures: 17,
    magies: 13,
    armes: 0,
    mythiquesMax: 1,
    raresMax: 7,
    signature: [
      ['dame-des-neuf-mondes', 1],
      ['mur-de-boucliers', 2],
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
    terrains: [],
    creatures: 18,
    magies: 12,
    armes: 0,
    mythiquesMax: 0,
    raresMax: 7,
    signature: [
      ['loup-des-neiges', 2],
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
    terrains: [],
    creatures: 20,
    magies: 10,
    armes: 0,
    mythiquesMax: 2,
    raresMax: 7,
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
    terrains: [],
    creatures: 20,
    magies: 10,
    armes: 0,
    mythiquesMax: 3,
    raresMax: 4,
    signature: [
      ['tin-hinan', 1],
      ['sahir-des-braises', 1],
      ['anqa-des-braises', 1],
    ],
  },
  /**
   * Gardes du Soleil (Soleil 1) : les sentinelles de la palissade. Pique et
   * garde prudente, l'Ashigaru et le Hatamoto bloquent en attendant les cendres.
   */
  'gardes-du-soleil': {
    identite: ['braise'],
    terrains: [],
    creatures: 20,
    magies: 10,
    armes: 0,
    mythiquesMax: 0,
    raresMax: 7,
    signature: [
      ['ashigaru-des-braises', 2],
      ['hatamoto-des-cendres', 2],
      ['ronin-du-soleil-rouge', 2],
      ['samourai-du-torii', 2],
      ['nuage-de-cendres', 2],
    ],
  },
  /**
   * Lames du Soleil (Soleil 2) : sabres errants sans maître. Course agressive
   * au katana, frappe iaijutsu et feux de kitsune sans aucune hésitation.
   */
  'lames-du-soleil': {
    identite: ['braise'],
    terrains: [],
    creatures: 20,
    magies: 10,
    armes: 0,
    mythiquesMax: 0,
    raresMax: 7,
    signature: [
      ['ronin-du-soleil-rouge', 2],
      ['onna-musha-des-cendres', 2],
      ['kenshi-de-la-forge', 2],
      ['frappe-iaijutsu', 2],
      ['feux-de-kitsune', 2],
      ['trait-de-braise', 2],
    ],
  },
  /**
   * Maître du Soleil rouge (Soleil 4) : le Daimyō au sommet du Mont Ardent.
   * La bannière du seigneur, Kagutsuchi la flamme originelle, Kenshi et Tengu.
   */
  'maitre-du-soleil-rouge': {
    identite: ['braise'],
    terrains: [],
    creatures: 20,
    magies: 10,
    armes: 0,
    mythiquesMax: 2,
    raresMax: 8,
    signature: [
      ['daimyo-du-soleil-rouge', 1],
      ['kagutsuchi-flamme-originelle', 1],
      ['kenshi-de-la-forge', 2],
      ['tengu-du-mont-ardent', 1],
      ['oni-de-la-fournaise', 1],
      ['serment-de-la-forge', 2],
    ],
  },
  /**
   * Momies de la Nécropole (Nécropole 1) : les embaumeurs du natron. Défense,
   * momies de lin, shabtis et papyrus pour épuiser l'adversaire.
   */
  'momies-de-la-necropole': {
    identite: ['tenebres'],
    terrains: [],
    creatures: 19,
    magies: 10,
    armes: 1,
    mythiquesMax: 0,
    raresMax: 4,
    signature: [
      ['momie-de-lin', 2],
      ['ouvrier-du-natron', 2],
      ['papyrus', 2],
      ['le-poids', 2],
    ],
  },
  /**
   * Chacals du Seuil (Nécropole 2) : chasseurs des caveaux. Tribut vorace,
   * morsure rapide au contact et Khopesh d'or pour voler les points de vie.
   */
  'chacals-du-seuil': {
    identite: ['tenebres'],
    terrains: [],
    creatures: 19,
    magies: 10,
    armes: 1,
    mythiquesMax: 0,
    raresMax: 6,
    signature: [
      ['chacal-du-seuil', 2],
      ['ureus-du-seuil', 2],
      ['ibis-des-comptes', 2],
      ['khopesh-d-or', 1],
      ['nom-efface', 2],
    ],
  },
  /**
   * Juges de la Nécropole (Nécropole 4) : le tribunal d'ébène. La Dévoreuse
   * exile ce que la balance condamne, avec Celui qui juge et La Dernière Pesée.
   */
  'juges-de-la-necropole': {
    identite: ['tenebres'],
    terrains: [],
    creatures: 19,
    magies: 10,
    armes: 1,
    mythiquesMax: 2,
    raresMax: 8,
    signature: [
      ['la-devoreuse', 1],
      ['celui-qui-juge', 1],
      ['celle-qui-pese', 2],
      ['khopesh-d-or', 1],
      ['la-derniere-pesee', 1],
    ],
  },
};
