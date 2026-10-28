/**
 * Les recettes des decks du Sablier.
 *
 * Une recette n'est pas une liste de cartes : c'est **ce qui ne se négocie
 * pas** dans un deck, le reste étant composé par `rpgDeckComposer.js` avec
 * **les meilleures cartes de l'identité, palier de rareté puis puissance**
 * (`rpgCardPower.js`). Une recette tient donc en cinq lignes :
 *
 *   - `identite`  : la ou les couleurs du **vivier de remplissage** — aucune
 *                   carte hors de là n'entre par lui, jamais (un mono-Sable
 *                   reste cent pour cent Sable) ; la signature, elle, pourrait
 *                   poser une exception assumée, mais aucun deck de l'étagère
 *                   n'en use aujourd'hui ;
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
 * La **rampe d'un étage de Tour** — plus on monte, plus le paquet est complet.
 *
 * Chaque Tour a désormais un paquet par étage, et non plus un paquet recyclé :
 * le premier étage ménage ses figures, le dernier les aligne **toutes**. Les
 * deux plafonds du composeur (`mythiquesMax` et `raresMax`, comptés par
 * famille) suivent la position de l'étage dans sa Tour :
 *
 *   - **étage 1** : aucune mythique, trois rares — on apprend ;
 *   - **étage n** : n−1 mythiques et n+2 rares, cran par cran ;
 *   - **sommet** : aucun plafond du tout — toutes les mythiques et toutes les
 *     rares de l'identité, comme les paquets « absolus » de la Tour du Sablier
 *     renversé. C'est la récompense de l'escalade, et le seul endroit du jeu où
 *     une couleur aligne ses figures d'un coup.
 */
export function rampeEtage(etage, etages) {
  const rang = Math.max(1, Number(etage) || 1);
  const total = Math.max(rang, Number(etages) || rang);
  if (rang >= total) return {};
  // Les mythiques se comptent **globalement** (`mythiquesTotalMax`) : c'est le
  // chiffre qu'on lit sur la table, toutes familles confondues — zéro figure au
  // premier étage, une au deuxième, et toutes au sommet. Les rares, elles,
  // gardent le plafond **par famille** (`raresMax`, créatures et sorts
  // séparément) : le vivier d'une couleur est trop mince pour tenir trente
  // cartes si l'on plafonne les rares en bloc, et un paquet incomplet n'est pas
  // une rampe, c'est un bug.
  return { mythiquesTotalMax: rang - 1, raresMax: rang + 2 };
}

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
   * au Harakiri et le Shogun promu relient le nouveau lot du Soleil rouge
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
   * Le Soleil rouge donne sa place aux trois mécaniques du set : Harakiri à la
   * mort, Résonance samouraï et Bannière du Daimyō. Le Daimyō et Kagutsuchi
   * sont les deux mythiques du deck ; Orochi, Susanoo et les autres figures
   * s'ouvrent dans les boosters.
   */
  'serment-du-soleil-rouge': {
    identite: ['braise'],
    terrains: [],
    creatures: 20,
    magies: 10,
    armes: 0,
    raresTotalMax: 10,
    mythiquesTotalMax: 2,
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
   * marque ; le Grand Débarquement arme les cales pleines), la prise paie (Négociant), la Cargaison
   * assure (Galion) et la Mousse des galiotes hisse la voile dès le premier
   * mana. Le
   * Hollandais volant — vaisseau fantôme à l’Attaque ciblée et à l'Abordage 3 —
   * hante la flotte en second grand voilier, aux côtés du Galion. L'Eau qui
   * amollit la prise vient du catalogue (Sonneur fêlé, Ressac, Lame de mer,
   * Bâton des citernes) ; le remplissage choisit les meilleures cartes
   * Sable + Eau.
   *
   * Le Brûlot, devenu **Braise** (la seule flamme du set), a quitté le
   * boîtier : il reste à ouvrir dans les boosters. La flotte est donc
   * strictement Sable + Eau, et le deck déclare `elements: ['sable', 'eau']`.
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
      ['tercio-de-cuivre', 2], ['pilote-de-la-carreira', 2], ['mousse-des-galiotes', 2],
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
    ...rampeEtage(4, 5),
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
    creatures: 12,
    magies: 16,
    armes: 2,
    ...rampeEtage(1, 4),
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
    creatures: 12,
    magies: 16,
    armes: 2,
    ...rampeEtage(2, 4),
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
    ...rampeEtage(4, 4),
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
    ...rampeEtage(5, 5),
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
    creatures: 18,
    magies: 12,
    armes: 0,
    ...rampeEtage(1, 4),
    // Le vivier Braise manque de communes pour 20 créatures : un quatrième
    // rare complète le paquet sans laisser le deck de campagne incomplet.
    raresMax: 4,
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
    creatures: 18,
    magies: 12,
    armes: 0,
    ...rampeEtage(2, 4),
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
    ...rampeEtage(4, 4),
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
    ...rampeEtage(1, 4),
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
    ...rampeEtage(2, 4),
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
    ...rampeEtage(4, 4),
    signature: [
      ['la-devoreuse', 1],
      ['celui-qui-juge', 1],
      ['celle-qui-pese', 2],
      ['khopesh-d-or', 1],
      ['la-derniere-pesee', 1],
    ],
  },
  /**
   * ── La Tour du Sablier renversé ──────────────────────────────────────────
   * Les sept recettes « absolues » de la tour d'épreuves terminale. Leur
   * règle tient en un mot : **aucun plafond**. Ni `mythiquesMax`, ni
   * `raresMax` — là où les recettes ci-dessus règlent la rampe des Tours,
   * celles-ci ouvrent le vivier en grand et le composeur prend
   * littéralement **les meilleures cartes de l'identité**, mythiques
   * d'abord, chacune à son maximum légal. La signature ne garde que
   * l'ouverture de partie (les petits coûts qui tiennent les premiers
   * tours) : tout le reste est le sommet du catalogue, étage après étage,
   * dans une identité différente à chaque fois.
   */
  /**
   * Les Veilleurs absolus (Sablier 1) : le Sable sans retenue. Tislit et le
   * Fennec ouvrent la piste, puis la Dame aux ailes d'or, Salem, Tarek et
   * Tin Hinan tiennent la muraille — toutes les figures du désert à la fois.
   */
  'veilleurs-absolus': {
    identite: ['sable'],
    terrains: [],
    creatures: 19,
    magies: 8,
    armes: 3,
    signature: [
      ['tislit-des-aures', 2],
      ['fennec-des-decombres', 2],
      ['dame-aux-ailes-d-or', 1],
    ],
  },
  /**
   * La Flamme absolue (Sablier 2) : la Braise au maximum du catalogue —
   * les treize mythiques de la couleur dans un seul paquet, Kagutsuchi,
   * Orochi et Susanoo compris. Le Ghul et l'Ashigaru frappent dès le
   * premier mana, Sahir suit au troisième.
   */
  'flamme-absolue': {
    identite: ['braise'],
    terrains: [],
    creatures: 21,
    magies: 9,
    armes: 0,
    signature: [
      ['ghul-des-cendres', 2],
      ['ashigaru-des-braises', 2],
      ['frappe-iaijutsu', 2],
      ['sahir-des-braises', 1],
    ],
  },
  /**
   * La Marée absolue (Sablier 3) : l'Eau qui dit non. Contresorts, Ressacs
   * et Silences d'écume dès l'ouverture, puis toutes les bêtes du fond —
   * Léviathan, Kraken, Bakunawa et Jörmungandr dans le même paquet.
   */
  'maree-absolue': {
    identite: ['eau'],
    terrains: [],
    creatures: 14,
    magies: 14,
    armes: 2,
    signature: [
      ['ressac', 2],
      ['silence-decume', 2],
      ['contresort-des-abimes', 2],
      ['vipere-de-verre', 1],
    ],
  },
  /**
   * L'Hiver absolu (Sablier 4) : la Neige au complet. Eirik ouvre au
   * premier mana, les loups et les boucliers tiennent la croûte, puis les
   * six figures du Nord descendent ensemble — le Père des corbeaux, le
   * Maître du marteau, la Dame des neuf mondes et le Serpent du monde.
   */
  'hiver-absolu': {
    identite: ['neige'],
    terrains: [],
    creatures: 19,
    magies: 10,
    armes: 1,
    signature: [
      ['eirik-du-premier-serment', 1],
      ['loup-des-neiges', 2],
      ['guerrier-au-bouclier-rond', 2],
    ],
  },
  /**
   * Le Jugement absolu (Sablier 5) : les Ténèbres sans appel. Le Chacal
   * et l'Ouvrier paient le Prix dès le premier tour, le Papyrus dévore,
   * puis le Passeur, la Dévoreuse, le Maître des hiéroglyphes et la
   * Dernière Pesée ferment le tribunal.
   */
  'jugement-absolu': {
    identite: ['tenebres'],
    terrains: [],
    creatures: 19,
    magies: 10,
    armes: 1,
    signature: [
      ['chacal-du-seuil', 2],
      ['ouvrier-du-natron', 2],
      ['papyrus', 2],
    ],
  },
  /**
   * La Course absolue (Sablier 6) : les Lettres de Marque revenues à leur
   * sommet. La Mousse hisse la voile, le Raïs et le Cotre accrochent le
   * pont, la Lettre de marque arme chaque arrivée — et le remplissage
   * prend le meilleur du Sable et de l'Eau réunis, Chasseur d'Ocracoke
   * et Barbe-Rousse en tête.
   */
  'course-absolue': {
    identite: ['sable', 'eau'],
    terrains: [],
    creatures: 20,
    magies: 8,
    armes: 2,
    signature: [
      ['mousse-des-galiotes', 2],
      ['rais-de-la-galiote', 2],
      ['cotre-de-course', 2],
      ['lettre-de-marque', 2],
    ],
  },
  /**
   * Le Sablier (Sablier 7 — le sommet) : le seul paquet tricolore de la
   * campagne, Sable + Braise + Ténèbres, les trois couleurs du temps qui
   * tombe. Sans plafond, le composeur y verse **toutes** les mythiques
   * des trois identités — plus de vingt cartes d'exception dans trente
   * places. Tislit et le Trait de braise seuls gardent l'ouverture ;
   * ensuite, chaque carte piochée est une figure.
   */
  'le-sablier': {
    identite: ['sable', 'braise', 'tenebres'],
    terrains: [],
    creatures: 20,
    magies: 9,
    armes: 1,
    signature: [
      ['tislit-des-aures', 2],
      ['trait-de-braise', 2],
      ['sahir-des-braises', 1],
    ],
  },
  /**
   * La Tour du Corbeau (doc 22) — le seul set hybride Neige + Ténèbres du
   * jeu. Quatre paquets montent la rampe du seuil au Trône des corbeaux :
   * la neige d'abord, la nuit ensuite, les deux au sommet. Comme pour les
   * autres tours, `mythiquesMax` et `raresMax` comptent **par famille** :
   * le premier étage ménage ses figures, le dernier les aligne toutes.
   */
  'corbeaux-du-givre': {
    identite: ['neige', 'tenebres'],
    terrains: [],
    creatures: 20,
    magies: 10,
    armes: 0,
    ...rampeEtage(1, 4),
    signature: [
      ['corbeau-de-givre', 2],
      ['eirik-du-premier-serment', 1],
      ['chacal-du-seuil', 2],
      ['guerrier-au-bouclier-rond', 2],
    ],
  },
  'serment-des-neuf-nuits': {
    identite: ['neige', 'tenebres'],
    terrains: [],
    creatures: 20,
    magies: 10,
    armes: 0,
    ...rampeEtage(2, 4),
    signature: [
      ['veilleuse-au-corbeau-noir', 2],
      ['berserk-du-crepuscule', 2],
      ['valkyrie-au-corbeau', 1],
      ['pretre-de-la-bouche', 2],
      ['corbeau-de-givre', 2],
    ],
  },
  'veille-du-corbeau': {
    identite: ['neige', 'tenebres'],
    terrains: [],
    creatures: 20,
    magies: 10,
    armes: 0,
    ...rampeEtage(3, 4),
    signature: [
      ['valkyrie-des-neuf-nuits', 2],
      ['neige-noire', 2],
      ['berserk-du-crepuscule', 2],
      ['celle-qui-pese', 1],
      ['maitre-du-marteau', 1],
    ],
  },
  /**
   * Le Maître des corbeaux (Corbeau 4 — le sommet) : le Père des corbeaux
   * retourné, la neige et la nuit dans le même oiseau. Cinq figures
   * mythiques et les meilleures rares des deux identités, sans retenue.
   */
  'maitre-des-corbeaux': {
    identite: ['neige', 'tenebres'],
    terrains: [],
    creatures: 20,
    magies: 10,
    armes: 0,
    // Quatre figures du Nord dans la famille des créatures, plus la
    // Dernière Pesée que le remplissage des sorts s'accorde : cinq mythiques
    // au total, le maximum que le mode Histoire s'autorise avant les paquets
    // « absolus » de la Tour du Sablier renversé.
    ...rampeEtage(4, 4),
    signature: [
      ['maitre-des-corbeaux', 1],
      ['pere-des-corbeaux', 1],
      ['valkyrie-des-neuf-nuits', 2],
      ['neige-noire', 2],
      ['berserk-du-crepuscule', 2],
      ['maitre-du-marteau', 1],
      ['dame-des-neuf-mondes', 1],
    ],
  },
  // ── Les Tours, étage par étage — un paquet par marche ────────────────────
  //
  // Chaque Tour aligne désormais **son** paquet à chaque étage : la Tour des
  // Listes n'emprunte plus celui de la Cour des Djinns, les Abysses ne jouent
  // plus quatre fois la Marée, les Corsaires ne ressortent plus les mêmes
  // Lettres de Marque. Les plafonds viennent de `rampeEtage` : rien en bas,
  // tout au sommet.

  /** Listes 1 — le guet de palier : des corps bon marché, aucune figure. */
  'guetteur-de-palier': {
    identite: ['sable', 'braise'],
    terrains: [],
    creatures: 20,
    magies: 8,
    armes: 2,
    ...rampeEtage(1, 5),
    signature: [
      ['tislit-des-aures', 2], ['chien-du-guet', 2],
      ['guetteur-du-beffroi', 2], ['rempart-de-dunes', 2],
    ],
  },
  /** Listes 2 — la Scribe : la pioche et les guides, une première figure. */
  'scribe-de-la-liste': {
    identite: ['sable', 'braise'],
    terrains: [],
    creatures: 19,
    magies: 9,
    armes: 2,
    ...rampeEtage(2, 5),
    signature: [
      ['scribe-de-la-liste', 2], ['amayas-du-hoggar', 2],
      ['tiziri-du-djurdjura', 2], ['chien-du-guet', 2],
    ],
  },
  /** Listes 3 — le Puisatier : le Sable appelle la Braise, Bouchra ouvre. */
  'puisatier-des-cendres': {
    identite: ['sable', 'braise'],
    terrains: [],
    creatures: 20,
    magies: 8,
    armes: 2,
    ...rampeEtage(3, 5),
    signature: [
      ['amani-des-ksour', 2], ['bouchra-guerriere-des-cretes', 1],
      ['braisier-du-souk', 2], ['ghul-des-cendres', 2],
    ],
  },
  /** Souk 1 — le marchand de sable : l'étal du bas, rien de rare. */
  'marchand-de-sable': {
    identite: ['sable', 'braise'],
    terrains: [],
    creatures: 20,
    magies: 8,
    armes: 2,
    ...rampeEtage(1, 4),
    signature: [
      ['tislit-des-aures', 2], ['fennec-des-decombres', 2],
      ['tempete-de-sable', 2], ['ashigaru-des-braises', 2],
    ],
  },
  /** Souk 2 — la Gardienne des ksour : l'égide d'Amani et les équipements. */
  'gardienne-des-ksour': {
    identite: ['sable', 'braise'],
    terrains: [],
    creatures: 19,
    magies: 8,
    armes: 3,
    ...rampeEtage(2, 4),
    signature: [
      ['amani-des-ksour', 2], ['amayas-du-hoggar', 2],
      ['jitte-d-amayas', 1], ['tiziri-du-djurdjura', 2],
    ],
  },
  /** Souk 3 — le Djinn du tournant : la foudre et les cendres. */
  'djinn-du-tournant': {
    identite: ['sable', 'braise'],
    terrains: [],
    creatures: 19,
    magies: 10,
    armes: 1,
    ...rampeEtage(3, 4),
    signature: [
      ['djinn-de-foudre', 2], ['braisier-du-souk', 2],
      ['ghul-des-cendres', 2], ['vent-rouge', 2],
    ],
  },
  /** Souk 4 — la Reine des étals : le sommet du Souk, toutes les figures. */
  'reine-des-etals': {
    identite: ['sable', 'braise'],
    terrains: [],
    creatures: 20,
    magies: 9,
    armes: 1,
    ...rampeEtage(4, 4),
    signature: [
      ['feriel', 1], ['sahir-des-braises', 1],
      ['anqa-des-braises', 1], ['tarek', 1],
    ],
  },
  /** Sables 1 — le Dernier Fennec : la course du désert, sans figure. */
  'veille-des-ergs': {
    identite: ['sable', 'braise'],
    terrains: [],
    creatures: 21,
    magies: 7,
    armes: 2,
    ...rampeEtage(1, 3),
    signature: [
      ['fennec-des-decombres', 2], ['tislit-des-aures', 2],
      ['rempart-de-dunes', 2], ['chien-du-guet', 2],
    ],
  },
  /** Sables 2 — l'Ifrit des sables : le feu gagne la dune. */
  'ifrit-des-sables': {
    identite: ['sable', 'braise'],
    terrains: [],
    creatures: 20,
    magies: 9,
    armes: 1,
    ...rampeEtage(2, 3),
    signature: [
      ['ifrit-des-ergs', 1], ['djinn-de-foudre', 2],
      ['vent-rouge', 2], ['ghul-des-cendres', 2],
    ],
  },
  /** Sables 3 — l'Horloger du Zénith : le sommet du Sable et de la Braise. */
  'horloger-du-zenith': {
    identite: ['sable', 'braise'],
    terrains: [],
    creatures: 20,
    magies: 9,
    armes: 1,
    ...rampeEtage(3, 3),
    signature: [
      ['tin-hinan', 1], ['sahir-des-braises', 1],
      ['anqa-des-braises', 1], ['kusayla-roi-des-imazighen', 1],
    ],
  },
  /** Abysses 1 — le Pêcheur de perles : les citernes, rien de mythique. */
  'pecheur-de-perles': {
    identite: ['eau'],
    terrains: [],
    creatures: 10,
    magies: 18,
    armes: 2,
    ...rampeEtage(1, 4),
    signature: [
      ['porteuse-de-cruches', 2], ['lame-de-mer', 2], ['ecueil', 2],
    ],
  },
  /** Abysses 2 — la Nageuse des puits : la Vipère et les citernes. */
  'nageuse-des-puits': {
    identite: ['eau'],
    terrains: [],
    creatures: 11,
    magies: 17,
    armes: 2,
    ...rampeEtage(2, 4),
    signature: [
      ['veilleuse-des-citernes', 2], ['sonneur-fele', 2],
      ['vipere-de-verre', 1], ['baton-des-citernes', 1],
    ],
  },
  /** Abysses 3 — le Sonneur d'écume : les contresorts montent à la surface. */
  'sonneur-d-ecume': {
    identite: ['eau'],
    terrains: [],
    creatures: 11,
    magies: 17,
    armes: 2,
    ...rampeEtage(3, 4),
    signature: [
      ['sonneur-fele', 2], ['ressac', 2],
      ['contresort-des-abimes', 2], ['leviathan', 1],
    ],
  },
  /** Abysses 4 — le Dévoreur de l'abîme : le sommet de l'Eau. */
  'devoreur-de-l-abime': {
    identite: ['eau'],
    terrains: [],
    creatures: 12,
    magies: 16,
    armes: 2,
    ...rampeEtage(4, 4),
    signature: [
      ['kraken', 1], ['leviathan', 1],
      ['bakunawa', 1], ['jormungandr', 1],
    ],
  },
  /** Corsaires 1 — l'Équipage des galiotes : l'Abordage, sans figure. */
  'equipage-des-galiotes': {
    identite: ['sable', 'eau'],
    terrains: [],
    creatures: 19,
    magies: 9,
    armes: 2,
    ...rampeEtage(1, 4),
    signature: [
      ['mousse-des-galiotes', 2], ['rais-de-la-galiote', 2], ['haut-fond', 2],
    ],
  },
  /** Corsaires 2 — le Marché des rançons : le Négociant et les coureurs. */
  'marche-des-ranscons': {
    identite: ['sable', 'eau'],
    terrains: [],
    creatures: 19,
    magies: 9,
    armes: 2,
    ...rampeEtage(2, 4),
    signature: [
      ['negociant-des-ranscons', 1], ['cotre-de-course', 2],
      ['le-renegat', 2], ['mousse-des-galiotes', 2],
    ],
  },
  /** Corsaires 3 — la Flotte du Raïs : les galions et le débarquement. */
  'flotte-du-rais': {
    identite: ['sable', 'eau'],
    terrains: [],
    creatures: 19,
    magies: 9,
    armes: 2,
    ...rampeEtage(3, 4),
    signature: [
      ['rais-de-la-galiote', 2], ['galion-de-la-flotte', 2],
      ['le-grand-debarquement', 2], ['grappin-d-abordage', 1],
    ],
  },
  /** Corsaires 4 — l'Amiral des deux mers : le sommet de la course. */
  'amiral-des-deux-mers': {
    identite: ['sable', 'eau'],
    terrains: [],
    creatures: 19,
    magies: 9,
    armes: 2,
    ...rampeEtage(4, 4),
    signature: [
      ['la-barbe-rousse', 1], ['la-barbe-noire', 1],
      ['le-tresor-de-lima', 1], ['la-vengeance-de-la-reine-anne', 1],
    ],
  },

  /** Fjord 3 — la Valkyrie du fjord : les corbeaux appellent les guerriers. */
  'valkyrie-du-fjord': {
    identite: ['neige'],
    terrains: [],
    creatures: 18,
    magies: 12,
    armes: 0,
    ...rampeEtage(3, 4),
    signature: [
      ['valkyrie-au-corbeau', 2], ['scalde-des-runes', 2],
      ['guerrier-au-bouclier-rond', 2], ['loup-des-neiges', 2],
    ],
  },
  /** Soleil 3 — le Kenshi du torii : la garde du temple, lame au clair. */
  'kenshi-du-torii': {
    identite: ['braise'],
    terrains: [],
    creatures: 20,
    magies: 10,
    armes: 0,
    ...rampeEtage(3, 4),
    signature: [
      ['kenshi-de-la-forge', 2], ['samourai-du-torii', 2],
      ['onna-musha-des-cendres', 2], ['frappe-iaijutsu', 2],
    ],
  },
  /** Nécropole 3 — la Peseuse des âmes : Celle qui pèse et son khopesh. */
  'peseuse-des-ames': {
    identite: ['tenebres'],
    terrains: [],
    creatures: 19,
    magies: 10,
    armes: 1,
    ...rampeEtage(3, 4),
    signature: [
      ['celle-qui-pese', 1], ['khopesh-d-or', 1],
      ['pretre-de-la-bouche', 2], ['momie-de-lin', 2],
    ],
  },

};
