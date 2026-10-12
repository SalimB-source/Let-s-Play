/**
 * Le mode Histoire — les Tours de Bab El : données des tours et des étages.
 *
 * Continuité simple (décision) : chaque étage est un **duel autonome** — deck
 * complet, PV pleins, aucune ressource reportée. La progression se limite aux
 * étages déblayés ; l'histoire et la continuité narrative viendront plus tard
 * (voir `docs/rpg/06-mode-histoire.md`).
 *
 * Chaque étage porte un sorcier : son deck, sa puissance (PV supplémentaires,
 * affichés) et son profil d'IA (`rpgAI.js`) — la personnalité de gameplay.
 *
 * Chaque tour porte une **miniature** (`miniature`, livrée dans
 * `public/sablier-tours/`) : la galerie du mode Histoire montre d'abord les
 * tours en vignettes ; les étages ne se dévoilent qu'à l'ouverture d'une tour.
 */

import {
  RPG_DECK_HYBRIDE_BASE,
  RPG_DECK_JOUEUR_BASE,
  RPG_DECK_MAREE_BASE,
  RPG_DECK_NEIGE_BASE,
  RPG_DECK_SORCIER_BASE,
} from './rpgCards.js';

/** Variantes de decks propres à la campagne (40 cartes, mêmes quotas que le catalogue). */
export const RPG_STORY_DECKS = {
  'cour-des-djinns': RPG_DECK_SORCIER_BASE,
  'veilleurs-du-desert': RPG_DECK_JOUEUR_BASE,
  // Deck bleu (Eau) : contres et bêtes marines. Seule la Tour des Abysses le joue.
  'maree-des-abysses': RPG_DECK_MAREE_BASE,
  'sentiers-de-cendre': RPG_DECK_HYBRIDE_BASE,
  // Hybride agressive : le retrait passe devant le rempart, la Souffleuse
  // frappe avec le verre (Fériel) plutôt qu'elle ne se barricade. La Rafale du
  // minaret et la Fureur du souk ont été retirées du jeu : le Trait de braise
  // — déjà trois fois — reste son retrait instantané, et les deux cases
  // libérées passent au Vent rouge, la carte bicolore de la maison, et à un
  // second Braisier du souk, qui presse l'adversaire.
  'souffleuse-de-verre': [
    ...RPG_DECK_HYBRIDE_BASE.filter((id) => id !== 'rempart-de-dunes' && id !== 'djinn-de-foudre'),
    'djinn-de-foudre',
    'trait-de-braise',
    'vent-rouge',
    'braisier-du-souk',
  ],
  // La Neige du Serment, telle qu'elle se joue en duel libre.
  'serment-des-neuf-hivers': RPG_DECK_NEIGE_BASE,
  // Garde du fjord : la muraille d'abord — boucliers, brumes et soins, et l'on
  // ne rend coup qu'une fois l'adversaire essoufflé. Les deux arts du Glacier
  // se partagent les vingt-et-une sources de Neige.
  'gardes-du-fjord': [
    ...Array(11).fill('glacier'),
    ...Array(10).fill('glacier-des-arches'),
    ...Array(3).fill('guerrier-au-bouclier-rond'),
    ...Array(2).fill('loup-des-neiges'),
    ...Array(3).fill('scalde-des-runes'),
    ...Array(2).fill('valkyrie-au-corbeau'),
    ...Array(3).fill('mur-de-boucliers'),
    ...Array(2).fill('brume-du-fjord'),
    'festin-des-vaillants',
    'eclair-du-marteau',
    'dame-des-neuf-mondes',
    'drakkar-a-tete-de-dragon',
  ],
  // Meute des neiges : la course — loups, berserks et éclairs, sans réserve.
  'meute-des-neiges': [
    ...Array(11).fill('glacier'),
    ...Array(10).fill('glacier-des-arches'),
    ...Array(3).fill('loup-des-neiges'),
    ...Array(2).fill('berserk-des-trois-hivers'),
    ...Array(3).fill('guerrier-au-bouclier-rond'),
    ...Array(2).fill('valkyrie-au-corbeau'),
    'scalde-des-runes',
    ...Array(2).fill('eclair-du-marteau'),
    'hurlement-du-blizzard',
    'valkyrie-des-glaces',
    'geant-des-banquises',
    'festin-des-vaillants',
    ...Array(2).fill('mur-de-boucliers'),
  ],
  // Deck du boss du fjord : le Serment essuyé, avec les figures du Nord — le
  // Père des corbeaux et le Maître du marteau — à leur maximum d'exemplaires.
  'maitre-des-neuf-hivers': [
    ...Array(9).fill('glacier'),
    ...Array(9).fill('glacier-des-arches'),
    ...Array(3).fill('guerrier-au-bouclier-rond'),
    ...Array(2).fill('loup-des-neiges'),
    'scalde-des-runes',
    ...Array(2).fill('valkyrie-au-corbeau'),
    'berserk-des-trois-hivers',
    'jarl-au-marteau-de-guerre',
    'valkyrie-des-glaces',
    'geant-des-banquises',
    'drakkar-a-tete-de-dragon',
    'hurlement-du-blizzard',
    ...Array(2).fill('eclair-du-marteau'),
    ...Array(2).fill('brume-du-fjord'),
    ...Array(2).fill('festin-des-vaillants'),
    'pere-des-corbeaux',
    'maitre-du-marteau',
  ],
  // Deck de contrôle du boss : les Veilleurs, soigneusement essuyés, avec
  // deux mythiques de Braise glissées dans le paquet du Grand Horloger. Les
  // Dunes du Ténéré voisinent avec le Désert classique.
  'grand-horloger': [
    ...Array(9).fill('desert'),
    ...Array(8).fill('dunes-du-tenere'),
    ...Array(2).fill('fennec-des-decombres'),
    ...Array(2).fill('faiseur-de-passage'),
    ...Array(3).fill('tislit-des-aures'),
    ...Array(2).fill('tiziri-du-djurdjura'),
    ...Array(3).fill('amani-des-ksour'),
    ...Array(2).fill('amayas-du-hoggar'),
    'tin-hinan',
    'sahir-des-braises',
    'anqa-des-braises',
    ...Array(2).fill('rapport-du-greffier'),
    ...Array(2).fill('rempart-de-dunes'),
    'tempete-de-sable',
    'nuage-de-cendres',
  ],
};

/** Les tours, de la plus basse à la plus haute. */
export const RPG_STORY_TOURS = [
  {
    id: 'tour-des-listes',
    nom: 'La Tour des Listes',
    miniature: 'tour-des-listes.jpg',
    resume: 'La Chambre y classe les quartiers évacuables. Chaque étage tient un nom de plus sur sa liste — et vous n’êtes pas le vôtre.',
    etages: [
      {
        id: 'listes-1',
        nom: 'Le Guetteur de palier',
        fonction: 'Vigie de la Chambre',
        deck: 'cour-des-djinns',
        puissance: 0,
        ia: { niveau: 'recit', style: 'equilibre' },
        note: 'Il compte les passants et rate la moitié de ses coups. Premier étage : on apprend ici.',
      },
      {
        id: 'listes-2',
        nom: 'La Scribe de la Liste',
        fonction: 'Greffière des évacuations',
        deck: 'sentiers-de-cendre',
        puissance: 1,
        ia: { niveau: 'normale', style: 'controle' },
        note: 'Elle rature les noms un par un — vos créatures aussi passent à la trappe.',
      },
      {
        id: 'listes-3',
        nom: 'Le Puisatier des Cendres',
        fonction: 'Maître des citernes',
        deck: 'veilleurs-du-desert',
        puissance: 2,
        ia: { niveau: 'normale', style: 'prudent' },
        note: 'Le miroir : votre propre deck, en défense. Il bloque, il soigne, il vous laisse vous épuiser.',
      },
      {
        id: 'listes-4',
        nom: 'La Souffleuse de verre',
        fonction: 'Artisane du souk haut',
        deck: 'souffleuse-de-verre',
        puissance: 3,
        ia: { niveau: 'normale', style: 'agressif' },
        note: 'Fériel à sa table : le verre frappe avant de répondre, et la course commence.',
      },
      {
        id: 'listes-5',
        nom: 'Le Grand Horloger',
        fonction: 'Chef de la Chambre des Heures',
        deck: 'grand-horloger',
        puissance: 5,
        ia: { niveau: 'veilleur', style: 'controle' },
        note: 'Le sommet. Il ménage son feu jusqu’à l’instant exact où il vous tue.',
      },
    ],
  },
  {
    id: 'tour-du-souk',
    nom: 'La Tour du Souk',
    miniature: 'tour-du-souk.jpg',
    resume: 'Trente étals suspendus, une seule règle : rien ne se vend à perte. Les sorciers d’ici ont tous une dette à couvrir.',
    etages: [
      {
        id: 'souk-1',
        nom: 'Le Marchand de sable',
        fonction: 'Facteur des étals',
        deck: 'sentiers-de-cendre',
        puissance: 2,
        ia: { niveau: 'normale', style: 'equilibre' },
        note: 'Il propose, il négocie, il encaisse. Aucun geste inutile.',
      },
      {
        id: 'souk-2',
        nom: 'La Gardienne des ksour',
        fonction: 'Portière du souk haut',
        deck: 'veilleurs-du-desert',
        puissance: 3,
        ia: { niveau: 'normale', style: 'prudent' },
        note: 'Les portes de pierre tiennent parce qu’elle refuse tous les mauvais échanges.',
      },
      {
        id: 'souk-3',
        nom: 'Le Djinn du tournant',
        fonction: 'Rouleur d’épices',
        deck: 'cour-des-djinns',
        puissance: 4,
        ia: { niveau: 'normale', style: 'agressif' },
        note: 'Il vendait des épices. Il a gardé le feu, et l’habitude d’ouvrir les hostilités.',
      },
      {
        id: 'souk-4',
        nom: 'La Reine des étals',
        fonction: 'Doyenne du souk',
        deck: 'souffleuse-de-verre',
        puissance: 5,
        ia: { niveau: 'veilleur', style: 'equilibre' },
        note: 'Elle a vu tomber trois étages. Elle ne paie plus ses dettes : elle les fait payer.',
      },
    ],
  },
  {
    id: 'tour-des-sables',
    nom: 'La Tour des Sables',
    miniature: 'tour-des-sables.jpg',
    resume: 'La dernière tour encore debout au-dessus du portail. Ce qui s’y joue décide de ce que Bab El devient.',
    etages: [
      {
        id: 'sables-1',
        nom: 'Le Dernier Fennec',
        fonction: 'Éclaireur des étages perdus',
        deck: 'veilleurs-du-desert',
        puissance: 4,
        ia: { niveau: 'normale', style: 'agressif' },
        note: 'Les éclats sifflent ; il a déjà choisi son prochain pas — et le vôtre.',
      },
      {
        id: 'sables-2',
        nom: 'L’Ifrit des ergs',
        fonction: 'Gardien du portail',
        deck: 'cour-des-djinns',
        puissance: 5,
        ia: { niveau: 'veilleur', style: 'agressif' },
        note: 'Les dunes rougissent avant même qu’il apparaisse. Il frappe pour conclure.',
      },
      {
        id: 'sables-3',
        nom: 'L’Horloger du Zénith',
        fonction: 'Voix de l’horloge du ciel',
        deck: 'grand-horloger',
        puissance: 7,
        ia: { niveau: 'veilleur', style: 'controle' },
        note: 'L’horloge n’annonce plus les cycles : elle les compte sur vous.',
      },
    ],
  },
  {
    id: 'tour-des-abysses',
    nom: 'La Tour des Abysses',
    miniature: 'tour-des-abysses.jpg',
    resume: 'Une tour d’eau, sans un grain de sable : l’abîme garde ce que la ville a perdu. Ses sorciers répondent à chaque carte, et rien ne passe sans réponse.',
    etages: [
      {
        id: 'abysses-1',
        nom: 'Le Pêcheur de perles',
        fonction: 'Plongeur des citernes basses',
        deck: 'maree-des-abysses',
        avatar: 'veilleuse-des-citernes',
        puissance: 1,
        ia: { niveau: 'recit', style: 'equilibre' },
        note: 'Il remonte ses filets vides et s’en amuse. Premier plongeon : on apprend à contrer.',
      },
      {
        id: 'abysses-2',
        nom: 'La Nageuse des puits',
        fonction: 'Gardienne des eaux souterraines',
        deck: 'maree-des-abysses',
        avatar: 'bakunawa',
        puissance: 3,
        ia: { niveau: 'normale', style: 'controle' },
        note: 'Elle attend que vous posiez votre carte pour la défaire. Ses silences tombent au bon moment.',
      },
      {
        id: 'abysses-3',
        nom: 'Le Sonneur d’écume',
        fonction: 'Cloche des ports engloutis',
        deck: 'maree-des-abysses',
        avatar: 'sonneur-fele',
        puissance: 5,
        ia: { niveau: 'normale', style: 'agressif' },
        note: 'Il sonne l’alerte et frappe avant que l’eau ne retombe.',
      },
      {
        id: 'abysses-4',
        nom: 'Le Dévoreur de l’abîme',
        fonction: 'Gardien du fond',
        deck: 'maree-des-abysses',
        avatar: 'leviathan',
        puissance: 7,
        ia: { niveau: 'veilleur', style: 'controle' },
        note: 'Les bêtes du fond répondent à son appel. Il contre le premier sort qui le menace.',
      },
    ],
  },
  {
    id: 'tour-du-fjord',
    nom: 'La Tour du Fjord',
    miniature: 'tour-du-fjord.jpg',
    resume: 'Au-dessus du portail, la Chambre range ce qu’elle ne sait plus classer : neuf hivers de mémoire et de glace, tenus par des serments qu’on ne prononce pas deux fois.',
    etages: [
      {
        id: 'fjord-1',
        nom: 'La Garde du fjord',
        fonction: 'Boucliers du passage',
        deck: 'gardes-du-fjord',
        avatar: 'guerrier-au-bouclier-rond',
        puissance: 1,
        ia: { niveau: 'normale', style: 'prudent' },
        note: 'Épaule contre épaule : la muraille ne cède pas, elle vous laisse frapper jusqu’à l’épuisement.',
      },
      {
        id: 'fjord-2',
        nom: 'La Meute des neiges',
        fonction: 'Chasseurs du plateau de glace',
        deck: 'meute-des-neiges',
        avatar: 'loup-des-neiges',
        puissance: 3,
        ia: { niveau: 'normale', style: 'agressif' },
        note: 'Ils courent sur la croûte gelée sans la briser. Le premier tour décide du reste.',
      },
      {
        id: 'fjord-3',
        nom: 'La Valkyrie du fjord',
        fonction: 'Porteuse du corbeau',
        deck: 'serment-des-neuf-hivers',
        avatar: 'valkyrie-des-glaces',
        puissance: 5,
        ia: { niveau: 'veilleur', style: 'agressif' },
        note: 'Elle choisit qui monte et qui reste dans la neige — et elle choisit vite.',
      },
      {
        id: 'fjord-4',
        nom: 'Le Maître des Neuf Hivers',
        fonction: 'Celui qui tient le serment',
        deck: 'maitre-des-neuf-hivers',
        avatar: 'pere-des-corbeaux',
        puissance: 7,
        ia: { niveau: 'veilleur', style: 'controle' },
        note: 'Le Père des corbeaux tient la table : deux corbeaux comptent vos cartes, et le marteau attend la fin du tour.',
      },
    ],
  },
];

/** Tous les étages, dans l’ordre de gravée (tours puis étages). */
export function tousLesEtages() {
  return RPG_STORY_TOURS.flatMap((tour) => tour.etages.map((etage, index) => ({ tour, etage, index })));
}

/** L’étage par son identifiant, avec son tour et sa position. */
export function etageHistoireParId(etageId) {
  return tousLesEtages().find(({ etage }) => etage.id === etageId) ?? null;
}

/** Le tour par son identifiant. */
export function tourHistoireParId(tourId) {
  return RPG_STORY_TOURS.find((tour) => tour.id === tourId) ?? null;
}

/** L’étage suivant dans la même tour, ou null au sommet. */
export function prochainEtage(etageId) {
  const courant = etageHistoireParId(etageId);
  if (!courant) return null;
  return courant.tour.etages[courant.index + 1] ?? null;
}

/** L’étage précédent dans la même tour (pour le déblocage), ou null au premier. */
export function etagePrecedent(etageId) {
  const courant = etageHistoireParId(etageId);
  if (!courant || courant.index === 0) return null;
  return courant.tour.etages[courant.index - 1] ?? null;
}

/** Les cartes d’un deck de campagne (l’identifiant inconnu rend null). */
export function deckHistoire(deckId) {
  return RPG_STORY_DECKS[deckId] ?? null;
}
