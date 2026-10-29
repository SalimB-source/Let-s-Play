/**
 * L'illustration des cartes du Sablier — un seul endroit pour les URL.
 * -------------------------------------------------------------------
 * `cardArt(id)` donne le chemin de la peinture d'une carte, `cardArtFurie(id)`
 * celui de sa face « furie ». Le module vit à part parce que le coffret de
 * deck (`RpgDeckBox.jsx`) et le salon du duel en ligne peignent les mêmes
 * images que le menu : une seule révision de cache, décidée ici.
 */

import { cardArtId, cardById } from './rpgCards.js';
import { RPG_TOUR_OUBLIEE_SET_ID } from './rpgTourOubliee.js';
import { alternativeDeCarte, illustrationAlternativeUrl } from './rpgCardArtAlternatives.js';

const CARD_ART_BASE_URL = import.meta.env?.BASE_URL ?? '/';

/**
 * La géométrie **livrée** des peintures : 768 × 960, le 4:5 exact du cadre
 * affiché.
 *
 * Les faces ont longtemps été livrées en 1024 × 1280 (et en cinq autres
 * formats voisins : 928 × 1152, 1122 × 1402, 1264 × 1568, 1023 × 1280,
 * 848 × 1264). Or aucune ne s'affiche plus large que ~270 px sur la table, et
 * 232 px dans le catalogue : on transportait jusqu'à quatre fois les pixels
 * utiles, 103 Mo de JPEG dans `public/cards/`. Ramenées à 768 × 960, qualité
 * 72, progressives, elles pèsent 39 Mo — et ne se distinguent pas de la
 * version d'origine à la taille d'affichage.
 *
 * Ces deux nombres sont la **référence** : `scripts/aleger-art-cartes.sh`
 * produit exactement ce format, les tests le vérifient sur les fichiers
 * livrés. Une peinture neuve se livre en 1024 × 1280 puis passe par
 * `npm run art:aleger` ; le script ne retouche jamais un fichier déjà à
 * 768 px de large, il est donc sûr de le relancer.
 */
export const CARD_ART_LARGEUR = 768;
export const CARD_ART_HAUTEUR = 960;

/**
 * Le set Neige a été peint en plusieurs passes, et sa **passe Souls** (octobre
 * 2026) repeint vingt de ses vingt-neuf cartes en huile sombre. Chaque carte
 * repeinte porte donc sa révision `neige-souls-cendres-v1` dans
 * `CARD_ART_CACHE_VERSIONS`, en clair : pas de version de set à maintenir, et
 * aucune peinture non repeinte ne change d'URL.
 */
const SET_NEIGE_SOULS_VERSION = 'neige-souls-cendres-v1';

/**
 * `sans-teinte-v1` — les peintures dont la **teinte de set** a été retirée.
 *
 * Deux sets portaient un virage de couleur appliqué à la peinture (pas en CSS) :
 * le bleu de nuit de l'Eau et le violet des Ténèbres. Le virage est annulé : ces
 * cartes sont revenues à leur peinture d'avant teinte. La marque ne décrit donc
 * plus une couleur de set, elle dit « cette peinture est neutre », et elle sert
 * surtout à casser le cache des navigateurs qui ont l'ancienne version.
 *
 * Le doré du Sable, lui, est retiré par mesure carte par carte
 * (`scripts/retirer-filtre-dore-sable.sh`, marque `sable-souls-desore-v3`).
 * Le filet de 3 px reste, lui, la seule marque d'élément — il ne dépend plus de
 * la peinture.
 */
const SANS_TEINTE = 'sans-teinte-v1';

const CARD_ART_CACHE_VERSIONS = {
  // Lettres de Marque : les Sites changent de peinture à chaque Heure.
  // Devenue « La légende du Hollandais volant » : vaisseau fantôme
  // photoréaliste, repeint sous son ancien nom de fichier.
  'la-vengeance-de-la-reine-anne': 'sable-souls-desore-v3',
  // La Barbe-Rousse repeint : jeune amiral en plein abordage, vue cinéma.
  'la-barbe-rousse': 'sable-souls-desore-v3',
  'le-chasseur-d-ocracoke': 'sable-souls-desore-v3',
  'source-de-bimini': 'pirates-v1',
  'source-de-bimini-2': 'pirates-v1',
  'source-de-bimini-1': 'pirates-v1',
  'source-de-bimini-0': 'pirates-v1',
  'le-tresor-de-lima': 'sable-souls-desore-v3',
  'le-tresor-de-lima-1': 'pirates-v2',
  'le-tresor-de-lima-0': 'pirates-v2',
  // Braise — la refonte Souls (huile sombre, réaliste) du set Soleil rouge.
  // Une révision partagée pour le lot ; Susanoo et Kagutsuchi, repeints une
  // seconde fois de zéro, portent leur propre révision.
  'susanoo': 'braise-souls-cendres-v2',
  'kagutsuchi-flamme-originelle': 'braise-souls-cendres-v2',
  'orochi': 'braise-souls-cendres-v3',
  'petit-orochi': 'petit-orochi-kaiga-couleurs-v1',
  'samourai-du-daimyo': 'samourai-du-daimyo-kaiga-couleurs-v1',
  'cavalier-des-deux-sabres': 'braise-souls-cendres-v4',
  // Le Pourfendeur repeint en peinture japonaise nihonga, même composition
  // mais en pigments minéraux (octobre 2025) : révision dédiée pour le cache.
  'tojiro-le-pourfendeur': 'tojiro-nihonga-compo-identique-v1',
  'sabre-maudit': 'braise-souls-cendres-v5',
  'montagne-du-soleil-rouge': 'montagne-kaiga-soleil-rouge-v1',
  // Soleil rouge uniquement : refonte kaiga / nihonga, personnages en action.
  'ashigaru-des-braises': 'braise-souls-cendres-v4',
  'ronin-du-soleil-rouge': 'braise-souls-cendres-v4',
  'samourai-du-torii': 'braise-souls-cendres-v4',
  'onna-musha-des-cendres': 'braise-souls-cendres-v3',
  'hatamoto-des-cendres': 'braise-souls-cendres-v4',
  'kenshi-de-la-forge': 'braise-souls-cendres-v4',
  'daimyo-du-soleil-rouge': 'braise-souls-cendres-v3',
  'tengu-du-mont-ardent': 'braise-souls-cendres-v3',
  'oni-de-la-fournaise': 'braise-souls-cendres-v3',
  'frappe-iaijutsu': 'braise-souls-cendres-v6',
  'feux-de-kitsune': 'braise-souls-cendres-v6',
  'serment-de-la-forge': 'braise-souls-cendres-v4',
  'pere-des-corbeaux': 'odin-photoreal-v1',
  'ifrit-al-ahmar': 'braise-souls-cendres-v3',
  'la-devoreuse': 'devoreuse-nihonga-visage-v1',
  'ifrit-des-ergs': 'braise-souls-cendres-v3',
  'trait-de-braise': 'braise-souls-cendres-v5',
  'anqa-des-braises': 'braise-souls-cendres-v3',
  'sahir-des-braises': 'braise-souls-cendres-v3',
  'braisier-du-souk': 'braise-souls-cendres-v4',
  // Le Sable — la passe Souls du désert : mêmes cartes, lumière de cendre.
  // Le Faucon du zénith devient la déesse solaire : révision dédiée, sa
  // peinture ne partage plus la marque de passe des autres cartes Sable.
  'faucon-du-zenith': 'faucon-deesse-solaire-v1',
  'dune-marchante': 'sable-souls-desore-v3',
  'fennec-des-decombres': 'sable-souls-desore-v3',
  'tour-de-sable': 'sable-souls-desore-v3',
  'tislit-des-aures': 'sable-souls-desore-v3',
  'cavalier-amazigh-du-desert': 'sable-souls-desore-v3',
  'amayas-du-hoggar': 'sable-souls-desore-v3',
  'faussoyeur-des-dunes': 'sable-souls-desore-v3',
  'la-barbe-noire': 'sable-souls-desore-v3',
  'galion-de-la-flotte': 'sable-souls-desore-v3',
  'cotre-de-course': 'sable-souls-desore-v3',
  'le-renegat': 'sable-souls-desore-v3',
  'negociant-des-ranscons': 'sable-souls-desore-v3',
  'mousse-des-galiotes': 'sable-souls-desore-v3',
  'rais-de-la-galiote': 'sable-souls-desore-v3',
  'tiziri-du-djurdjura': 'sable-souls-desore-v3',
  'amani-des-ksour': 'sable-souls-desore-v3',
  'guetteur-du-beffroi': 'sable-souls-desore-v3',
  'scribe-de-la-liste': 'sable-souls-desore-v3',
  'faiseur-de-passage': 'sable-souls-desore-v3',
  'tercio-de-cuivre': 'sable-souls-desore-v3',
  'tempete-de-sable': 'sable-souls-desore-v3',
  'rempart-de-dunes': 'sable-souls-desore-v3',
  'reanimation': 'sable-souls-desore-v3',
  // Les héros du désert, leur chien et les premiers équipements.
  'salem': 'sable-souls-desore-v3',
  'tarek': 'sable-souls-desore-v3',
  'tin-hinan-des-pistes': 'sable-souls-desore-v3',
  // Bouchra, la guerrière des crêtes : peinture neuve, révision dédiée.
  'bouchra-guerriere-des-cretes': 'bouchra-cretes-v3',
  // Le roi Kusayla, peint pour le souverain amazigh : une révision dédiée, pour
  // qu'un repaint futur ne date que sa propre peinture. Le guépard qu'il
  // appelle à son arrivée est une créature-jeton, peinte elle aussi.
  // v3 : charge frontale, hache courte brandie vers le ciel.
  'kusayla-roi-des-imazighen': 'kusayla-roi-imazigh-v3',
  'guepard': 'guepard-jeton-v1',
  'chien-du-guet': 'sable-souls-desore-v3',
  // Le grappin est repassé de l'ancre au croc : quatre griffes sur le bastingage.
  'grappin-d-abordage': 'grappin-griffes-bastingage-v4',
  'takouba-des-pistes': 'sable-souls-desore-v3',
  'sandales-de-tislit': 'sable-souls-desore-v3',
  'cuirasse-de-sel': 'sable-souls-desore-v3',
  // Le javelot est repassé de la dune au beffroi : il est chez lui, sous la cloche.
  'javelot-du-beffroi': 'javelot-beffroi-cloche-v4',
  'licou-du-chien-de-sable': 'sable-souls-desore-v3',
  // Fin du set Sable : les trois dernières armes et les trois dernières magies.
  'harnais-du-mehari': 'sable-souls-desore-v3',
  'masque-du-guetteur': 'sable-souls-desore-v3',
  'jitte-d-amayas': 'sable-souls-desore-v3',
  'lame-des-ergs': 'sable-souls-desore-v3',
  'takouba-de-tin-hinan': 'sable-souls-desore-v3',
  'lettre-de-marque': 'sable-souls-desore-v3',
  'le-grand-debarquement': 'sable-souls-desore-v3',
  'rapport-du-greffier': 'sable-souls-desore-v3',
  'tour-de-braise': 'braise-souls-cendres-v5',
  'nuage-de-cendres': 'braise-souls-cendres-v5',
  'vent-rouge': 'braise-souls-cendres-v5',
  // Les cinq héros du récit ont été **repeints en nihonga** (pigments
  // minéraux sur feuille d’or) avec une palette algérienne — indigo touareg,
  // safran, henné, vert émeraude, turquoise et or. Mêmes noms de fichiers,
  // mêmes visages et mêmes accessoires : les quatre portraits dont la
  // composition est inchangée partagent une révision, pour qu’aucun cache ne
  // resserve les huiles précédentes. Fériel a une nouvelle composition :
  // archère au sommet d’une tour, une flèche électrique encochée, et donc
  // une révision dédiée.
  feriel: 'braise-souls-cendres-v3',




  // Le Corbeau des neuf nuits — le set hybride Neige + Ténèbres (doc 22).
  // Cinq peintures neuves et la figure retournée du Père des corbeaux :
  // toutes partagent la révision du set, décidée ici une seule fois.
  'corbeau-de-givre': 'corbeau-neuf-nuits-v1',
  'veilleuse-au-corbeau-noir': 'corbeau-neuf-nuits-v1',
  // Cadrage resserré sur le Berserk, sans masquer sa tête sous le nom.
  // La nouvelle révision renouvelle aussi les images en cache.
  'berserk-du-crepuscule': 'corbeau-crepuscule-cadrage-v3',
  'valkyrie-des-neuf-nuits': 'corbeau-neuf-nuits-v1',
  'neige-noire': 'corbeau-neuf-nuits-v1',
  'maitre-des-corbeaux': 'corbeau-neuf-nuits-v1',
  // Les deux faces de Furie du Corbeau des neuf nuits : même composition que
  // la peinture intacte, seulement marquée par le combat. Redéclarées plus bas
  // dans la passe des Furies (`corbeau-furie-souls-v1`), à l'exception du
  // Berserk dont le recadrage impose sa propre révision.
  'berserk-du-crepuscule-furie': 'corbeau-furie-crepuscule-cadrage-v3',
  'valkyrie-des-neuf-nuits-furie': 'corbeau-furie-neuf-nuits-v1',
  // Le Serpent du monde garde la facture nihonga, mais sa composition est
  // repensée : un serpent unique et anatomiquement cohérent encercle le globe.
  // Sa révision dédiée l’emporte sur celle du set Neige.
  'serpent-du-monde': 'serpent-terre-nihonga-v1',
  // L'Armure de cendres quitte le lot photoréaliste : son dessin d'origine
  // est conservé trait pour trait et simplement repeint en nihonga.
  'armure-de-cendres': 'braise-souls-cendres-v4',
  // Le Bâton des citernes quitte le lot photoréaliste à son tour : le bâton
  // seul derrière la glace d'une vitrine, les serpents dehors.
  'baton-des-citernes': 'baton-nihonga-vitrine-dehors-v2',
  'djinn-de-foudre': 'sable-souls-desore-v3',
  'sonneur-fele': 'plein-art-cloche-v1',
  // La Dame aux ailes d'or s'envole dans la nef en ruine : révision dédiée.
  'dame-aux-ailes-d-or': 'dame-ailes-or-vol-v1',
  'lionne-du-midi-ardent': 'braise-souls-cendres-v4',
  'brisure-de-verre': 'plein-art-verre-v2',
  'silence-decume': 'plein-art-bulle-v1',
  'parade-du-verre': 'plein-art-verre-v1',
  'maree-contraire': 'deflection-ultrason-v1',
  ressac: 'djinn-tourbillon-v1',
  'courant-de-retour': 'djinn-tourbillon-v1',
  // La passe Souls du Neige efface la dérogation photoréaliste : les quatre
  // porteurs humains de Furie sont peints à l'huile comme le reste du set, et
  // leur double ensanglanté avec eux — l'un sans l'autre jurerait de facture.
  // Les faces de Furie de la passe : le loup, la valkyrie au corbeau, le
  // berserk, le maître et bientôt le Jarl — même scène que la face intacte,
  // seulement marquée par le combat.
  // Repeints sous leurs anciens noms : charge frontale pour le Mur, marteau
  // d’électricité fonçant sur une cible pour l’Éclair, soldats gelés dans la
  // brume pour la Brume du fjord et grizzli prisonnier de la glace pour le
  // Hurlement du blizzard.
  // La passe Souls du Neige — dix cartes que leur peinture d'origine rendait
  // étrangères à l'huile sombre : la mappemonde du Serpent du monde, la tour en
  // 1408×768, la Dame au fil, la Poigne, l'Appât, le Défi, le Verglas, le
  // Grand Voile, l'Embuscade et le portrait photoréaliste du Père des corbeaux.
  'serpent-du-monde': 'neige-souls-cendres-v1',
  'tour-de-neige': 'neige-souls-cendres-v1',
  'dame-des-neuf-mondes': 'neige-souls-cendres-v1',
  'pere-des-corbeaux': 'neige-souls-cendres-v1',
  'poigne-de-givre': 'neige-loup-gele-souls-v2',
  'volva-soigneuse': 'volva-soigneuse-souls-v1',
  'braise-et-sable': 'braise-et-sable-souls-v1',
  'verglas': 'neige-souls-cendres-v1',
  'embuscade': 'neige-souls-cendres-v1',
  'defi-du-jarl': 'neige-souls-cendres-v1',
  'appat-de-la-meute': 'neige-souls-cendres-v1',
  // Le Grand Voile blanc était peint en voile de drakkar ; c'est une magie de
  // brouillard, la carte le dit (« les coups s'égarent dans le blanc »).
  'grand-voile-blanc': 'neige-brouillard-v1',
  // Deuxième lot : les figures du Nord et cinq magies.
  // La hache d'Éirik avait le fer planté au milieu du manche : refaite.
  'eirik-du-premier-serment': 'neige-eirik-hache-v2',
  'valkyrie-des-glaces': 'neige-souls-cendres-v1',
  'geant-des-banquises': 'neige-souls-cendres-v1',
  'drakkar-a-tete-de-dragon': 'neige-souls-cendres-v1',
  'scalde-des-runes': 'neige-souls-cendres-v1',
  // Le marteau de foudre se lisait comme un simple éclair : il a une tête.
  // Quatrième reprise : le marteau est d'acier bleu runique, sa foudre aussi.
  'eclair-du-marteau': 'neige-eclair-marteau-v5',
  'mur-de-boucliers': 'neige-souls-cendres-v1',
  'festin-des-vaillants': 'neige-souls-cendres-v1',
  'brume-du-fjord': 'neige-souls-cendres-v1',
  // Le grizzly lisait comme un bloc de verre : c'est la glace qui casse.
  'hurlement-du-blizzard': 'neige-hurlement-grizzli-v2',
  // La passe des Furies (octobre 2026) : faces intactes et faces déclenchées,
  // sous deux marques — la commune, et une dédiée au loup et à la valkyrie dont
  // seule la face de Furie a changé.
  'berserk-des-trois-hivers': 'neige-souls-cendres-v1',
  'berserk-des-trois-hivers-furie': 'neige-furie-souls-v1',
  // Le Maître boit et rit dans sa taverne — sa face de Furie garde, elle, sa
  // peinture de bataille, le marteau levé sous la foudre froide.
  'maitre-du-marteau': 'neige-maitre-tavern-v1',
  'maitre-du-marteau-furie': 'neige-furie-souls-v1',
  'loup-des-neiges-furie': 'neige-furie-loup-v1',
  'valkyrie-au-corbeau-furie': 'neige-furie-valkyrie-v1',
  'jarl-au-marteau-de-guerre': 'neige-souls-cendres-v1',
  'jarl-au-marteau-de-guerre-furie': 'neige-furie-souls-v1',
  'guerrier-au-bouclier-rond-furie': 'neige-furie-souls-v1',
  // La Völva : sa face de Furie la montre sanglante, les yeux d'or, le bâton
  // en feu — la même ruine de fjord sous la tempête. Peinte après la passe
  // commune, elle porte donc sa propre révision.
  'volva-soigneuse-furie': 'neige-furie-volva-v1',
  // Les deux furies du Corbeau des neuf nuits : même scène que leur peinture
  // intacte, marquée par le combat. La face du Berserk suit le recadrage de sa
  // peinture intacte — même scène, même cri, mais le crâne entier dégagé sous
  // le bandeau de nom — et prend donc sa propre révision.
  'berserk-du-crepuscule-furie': 'corbeau-furie-crepuscule-cadrage-v3',
  'valkyrie-des-neuf-nuits-furie': 'corbeau-furie-souls-v1',
  // La Tour Oubliée rejoint la passe : l'Ifrit d'encre porte Furie 1. Sa face
  // déclenchée reprend son archive en feu, fissures ouvertes et encre lâchée.
  // Révision dédiée, comme les autres doubles de Furie : le fichier garde son
  // nom, seul le `?v=` casse le cache.
  'ifrit-d-encre-furie': 'tour-furie-encre-v1',
  // Brise-lame : la Magie Rapide Braise qui désarme l'adversaire. Peinture
  // neuve, révision dédiée contre les caches du navigateur.
  'brise-lame': 'braise-brise-lame-v2',
  // La passe des Ténèbres — l'Égypte de la balance (octobre 2026). Le set
  // était resté en or massif, violet et lumière de musée ; il passe à l'os, à
  // la suie et à l'or terni. Le violet de set — un mélange de 18 % de #5b2a86
  // appliqué à la peinture — a ensuite été **retiré** : ces cartes sont
  // revenues à l'os et à la suie, sans virage. Les six cartes du Corbeau des
  // neuf nuits, elles, n'ont jamais reçu de teinte.
  'khopesh-d-or': SANS_TEINTE,
  'chacal-du-seuil': SANS_TEINTE,
  'ouvrier-du-natron': SANS_TEINTE,
  'gardienne-de-la-balance': SANS_TEINTE,
  'scribe-des-feuillets': SANS_TEINTE,
  'pretre-de-la-bouche': SANS_TEINTE,
  'ureus-du-seuil': SANS_TEINTE,
  // Deuxième lot : les figures du seuil, les masques et les magies du livre.
  // La Dévoreuse garde son identité — la gueule énorme qui avale, sans visage
  // humain — mais perd l'or, le bleu de feu et le masque de pharaon.
  'momie-de-lin': SANS_TEINTE,
  'ibis-des-comptes': SANS_TEINTE,
  'celle-qui-pese': SANS_TEINTE,
  'la-devoreuse': SANS_TEINTE,
  'celui-qui-juge': SANS_TEINTE,
  'passeur-au-masque-de-chacal': SANS_TEINTE,
  'maitre-des-hieroglyphes': SANS_TEINTE,
  'papyrus': SANS_TEINTE,
  'nom-efface': SANS_TEINTE,
  'offrande-de-lin': SANS_TEINTE,
  // Troisième lot : les trois pesées et les deux lieux. Le set Ténèbres est
  // clos — 28 cartes jouables, toutes à l'huile.
  'le-poids': SANS_TEINTE,
  'les-feuillets': SANS_TEINTE,
  'la-grande-pesee': SANS_TEINTE,
  'la-derniere-pesee': SANS_TEINTE,
  'tour-des-tenebres': SANS_TEINTE,
  // La passe Souls de l'Eau (octobre 2026) — premier lot : les deux héros et
  // huit cartes dont la peinture jurait (le bâton art nouveau, le portefaix
  // éclairé comme un souk, le pilote en plein jour, la source turquoise). Le
  // lot avait été viré au bleu de nuit pour distinguer l'Eau de la Neige ; le
  // virage est **retiré**, les peintures reviennent à l'ardoise froide.
  'yamina': SANS_TEINTE,
  'boualem': SANS_TEINTE,
  'baton-des-citernes': SANS_TEINTE,
  'porteuse-de-cruches': SANS_TEINTE,
  'pilote-de-la-carreira': SANS_TEINTE,
  'source-de-bimini': SANS_TEINTE,
  'haut-fond': SANS_TEINTE,
  'lame-de-mer': SANS_TEINTE,
  'le-routier': SANS_TEINTE,
  'eau-de-la-source': SANS_TEINTE,
  // Les bêtes et les gardiens — deuxième lot : les unes étaient trop claires,
  // les autres carrément absentes du registre. Leur bleu de nuit a été retiré
  // comme celui du premier lot : ce sont des peintures neutres, dévirées.
  'leviathan': SANS_TEINTE,
  'bakunawa': SANS_TEINTE,
  'jormungandr': SANS_TEINTE,
  // Le Seigneur des mâchoires est repeint en figure du Nil (Sabek, le
  // souverain crocodile) : révision dédiée, la peinture du village inondé
  // reste l'illustration alternative.
  'seigneur-des-machoires': 'tenebres-seigneur-machoires-nil-v2',
  'vipere-de-verre': SANS_TEINTE,
  'tour-des-flots': SANS_TEINTE,
  'sonneur-fele': SANS_TEINTE,
  'veilleuse-des-citernes': SANS_TEINTE,
  'silence-decume': SANS_TEINTE,
  // Dernier lot : les huit magies du verre et du ressac, plus le Kraken refait
  // — la première peinture donnait un serpent enroulé au navire, pas une bête
  // à tentacules. Le set Eau est clos : 27 cartes, toutes à l'huile.
  'kraken': SANS_TEINTE,
  'parade-du-verre': SANS_TEINTE,
  'brisure-de-verre': SANS_TEINTE,
  'ecueil': SANS_TEINTE,
  'contresort-des-abimes': SANS_TEINTE,
  'maree-contraire': SANS_TEINTE,
  'ressac': SANS_TEINTE,
  'courant-de-retour': SANS_TEINTE,
  // Les deux armes : la lance seule dans la glace, la hache plantée dans la
  // banquise — aucune main, aucun porteur, et plus d'aurore colorée.
  'lance-de-givre': 'neige-souls-cendres-v1',
  // La hache est plantée lame première, le fût debout : demande explicite.
  'hache-de-la-banquise': 'neige-hache-fil-en-bas-v2',
  // La Hache est seule, sa lame plantée dans la banquise : aucun porteur
  // ne vient concurrencer l’arme dans la nouvelle illustration.
};
/**
 * La Tour Oubliée a d'abord été peinte en encrage BD, puis entièrement
 * reprise en peinture réaliste sombre (façon Souls) : la `?v=` change donc
 * l'URL de chaque peinture du set, et aucun cache ne peut resservir l'ancienne
 * direction artistique sous le même nom de fichier. Incrémenter à chaque
 * nouvelle passe sur le set.
 */
const SET_TOUR_OUBLIEE_ART_VERSION = 'souls-realiste-v1';
/**
 * Les illustrations alternatives **affichées** — celles que le joueur a
 * achetées puis choisies pour remplacer la peinture de la passe Souls sur la
 * carte elle-même. La table est un simple index `carteId → alternative` :
 *
 *   - elle se **remplit** depuis la bourse (`définirIllustrationsAffichees`),
 *     au montage et à chaque achat, plutôt que d'être lue ici — un module de
 *     rendu ne connaît ni le stockage ni le compte ;
 *   - elle ne porte que des peintures **possédées** : c'est la bourse qui
 *     filtre, `normaliserIllustrations` recoupe déjà les affichées sur les
 *     achetées ;
 *   - elle ne change **que la face** d'une carte (`cardArt`) : les vignettes de
 *     furie et d'entité gardent leur propre illustration.
 */
const ILLUSTRATIONS_AFFICHEES = new Map();

/** Pose les illustrations choisies par le joueur (`['salem', …]`). */
export function definirIllustrationsAffichees(carteIds = []) {
  ILLUSTRATIONS_AFFICHEES.clear();
  for (const carteId of Array.isArray(carteIds) ? carteIds : []) {
    const alternative = alternativeDeCarte(carteId);
    if (alternative) ILLUSTRATIONS_AFFICHEES.set(alternative.carteId, alternative);
  }
  return ILLUSTRATIONS_AFFICHEES.size;
}

/** L'illustration alternative affichée sur une carte, ou `null`. */
export function illustrationAlternativeAffichee(id) {
  return ILLUSTRATIONS_AFFICHEES.get(cardArtId(id) ?? String(id ?? '')) ?? null;
}

export const cardArt = (id) => {
  const artId = cardArtId(id);
  // La peinture choisie par le joueur passe avant tout le reste : c'est elle
  // qu'il a payée, et c'est elle qu'il veut voir sur sa carte.
  const alternative = ILLUSTRATIONS_AFFICHEES.get(artId);
  if (alternative) return illustrationAlternativeUrl(alternative);
  const carte = cardById(artId);
  const revision = CARD_ART_CACHE_VERSIONS[artId]
    ?? (carte?.set === RPG_TOUR_OUBLIEE_SET_ID ? SET_TOUR_OUBLIEE_ART_VERSION : undefined);
  return `${CARD_ART_BASE_URL}cards/${artId}.jpg${revision ? `?v=${revision}` : ''}`;
};

/**
 * Illustration d'une entité posée. Un Site peut fournir une suite d'arts
 * indexée par ses compteurs d'Heures : Bimini révèle ainsi une nouvelle
 * profondeur de la grotte à chaque retrait. Les autres cartes conservent leur
 * illustration imprimée habituelle.
 */
export const cardArtEntite = (entite) => {
  const carte = cardById(entite?.carteId);
  if (!carte) return '';
  if (carte.kind === 'site' && carte.site?.arts) {
    const restants = Math.max(0, Math.trunc(Number(entite?.heures?.restants) || 0));
    return cardArt(carte.site.arts[restants] ?? carte.art ?? carte.id);
  }
  return cardArt(carte);
};

/**
 * Illustration « furie » d'une créature : tant que son état Furie est actif
 * (`entite.furieDeclenchee === true`), on affiche sa peinture alternative
 * entachée de sang et en colère ; dès qu'il retombe, la face normale revient.
 * Retourne l'URL de l'image `public/cards/<id>-furie.jpg` avec sa révision
 * de cache. Chaque porteur de Furie doit donc livrer ce fichier : le moteur
 * ne le demande que lorsque l'état est actif, mais ne devine pas son absence.
 */
export const cardArtFurie = (id) => {
  const artId = `${cardArtId(id)}-furie`;
  const revision = CARD_ART_CACHE_VERSIONS[artId];
  return `${CARD_ART_BASE_URL}cards/${artId}.jpg${revision ? `?v=${revision}` : ''}`;
};
