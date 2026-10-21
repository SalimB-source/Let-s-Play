/**
 * Le mode Histoire — les Tours de Bab El : données des tours et des étages.
 *
 * Continuité simple (décision) : chaque étage est un **duel autonome** — deck
 * complet, PV pleins, aucune ressource reportée. La progression se limite aux
 * étages déblayés ; l'histoire et la continuité narrative viendront plus tard
 * (voir `docs/rpg/06-mode-histoire.md`).
 *
 * Chaque étage porte un sorcier : son deck, sa puissance (indice de difficulté
 * affiché sur la fiche d'étage — elle ne gonfle plus les PV : tout le monde
 * démarre à 25 PV, voir `RPG_PV_SORCIER_PAR_PUISSANCE` dans `rpgDuel.js`) et
 * son profil d'IA (`rpgAI.js`) — la personnalité de gameplay.
 *
 * La galerie et la page de chaque tour montrent sa **maquette 3D**
 * (`rpgStoryTowerModels.js`). La peinture `miniature`, livrée dans
 * `public/sablier-tours/`, sert uniquement de repli sans WebGL. Les étages
 * ne se dévoilent qu'à l'ouverture d'une tour.
 */

import { composerDeck } from './rpgDeckComposer.js';
import { RPG_RECETTES_HISTOIRE } from './rpgDeckRecipes.js';
import {
  CATALOGUE_DU_COMPOSEUR,
  RPG_DECK_HYBRIDE_BASE,
  RPG_DECK_JOUEUR_BASE,
  RPG_DECK_MAREE_BASE,
  RPG_DECK_NEIGE_BASE,
  RPG_DECK_SOLEIL_ROUGE_BASE,
  RPG_DECK_SORCIER_BASE,
  RPG_DECK_TENEBRES_BASE,
} from './rpgCards.js';

/**
 * Les paquets de la campagne — les cinq decks du catalogue utilisés dans
 * l'Histoire, joués tels quels par leurs sorciers, et les cinq **variantes** que seuls les
 * étages alignent.
 *
 * Les variantes ne sont pas écrites carte par carte : elles passent par les
 * mêmes recettes que le catalogue (`RPG_RECETTES_HISTOIRE`, `rpgDeckRecipes.js`)
 * et le même composeur (`rpgDeckComposer.js`) — « les meilleures cartes
 * d’abord ». Ce qui les distingue, c’est leur signature (la manière du sorcier)
 * et leurs plafonds (`mythiquesMax`, `raresMax`) : la rampe des Tours, où la
 * Garde du fjord n’ouvre pas avec les figures du Nord et où le Maître des Neuf
 * Hivers les aligne. Les listes restent valides comme celles du catalogue :
 * 30 cartes sans terrain, mythiques à un exemplaire.
 */
export const RPG_STORY_DECKS = {
  'cour-des-djinns': RPG_DECK_SORCIER_BASE,
  'veilleurs-du-desert': RPG_DECK_JOUEUR_BASE,
  // Deck bleu (Eau) : contres et bêtes marines. Seule la Tour des Abysses le joue.
  'maree-des-abysses': RPG_DECK_MAREE_BASE,
  'sentiers-de-cendre': RPG_DECK_HYBRIDE_BASE,
  // La Souffleuse de verre : l’Hybride agressive — Fériel frappe avec le verre,
  // le Trait de braise est son retrait instantané, le Fennec ouvre la piste.
  'souffleuse-de-verre': composerDeck(RPG_RECETTES_HISTOIRE['souffleuse-de-verre'], CATALOGUE_DU_COMPOSEUR),
  // La Neige du Serment, telle qu’elle se joue en duel libre.
  'serment-des-neuf-hivers': RPG_DECK_NEIGE_BASE,
  // Garde du fjord : la muraille d’abord — boucliers, brumes et soins.
  'gardes-du-fjord': composerDeck(RPG_RECETTES_HISTOIRE['gardes-du-fjord'], CATALOGUE_DU_COMPOSEUR),
  // Meute des neiges : la course — loups, berserks et valkyries, sans réserve.
  'meute-des-neiges': composerDeck(RPG_RECETTES_HISTOIRE['meute-des-neiges'], CATALOGUE_DU_COMPOSEUR),
  // Le boss du fjord : le Serment essuyé, les figures du Nord à leur maximum.
  'maitre-des-neuf-hivers': composerDeck(RPG_RECETTES_HISTOIRE['maitre-des-neuf-hivers'], CATALOGUE_DU_COMPOSEUR),
  // Le boss de la Chambre des Heures : un vrai hybride Sable + Braise, Pétra
  // comprise — ses mythiques de Braise sont enfin payables.
  'grand-horloger': composerDeck(RPG_RECETTES_HISTOIRE['grand-horloger'], CATALOGUE_DU_COMPOSEUR),
  // Tour du Soleil rouge (Braise / Samouraïs)
  'gardes-du-soleil': composerDeck(RPG_RECETTES_HISTOIRE['gardes-du-soleil'], CATALOGUE_DU_COMPOSEUR),
  'lames-du-soleil': composerDeck(RPG_RECETTES_HISTOIRE['lames-du-soleil'], CATALOGUE_DU_COMPOSEUR),
  'serment-du-soleil-rouge': RPG_DECK_SOLEIL_ROUGE_BASE,
  'maitre-du-soleil-rouge': composerDeck(RPG_RECETTES_HISTOIRE['maitre-du-soleil-rouge'], CATALOGUE_DU_COMPOSEUR),
  // Tour de la Nécropole (Ténèbres / Égypte)
  'momies-de-la-necropole': composerDeck(RPG_RECETTES_HISTOIRE['momies-de-la-necropole'], CATALOGUE_DU_COMPOSEUR),
  'chacals-du-seuil': composerDeck(RPG_RECETTES_HISTOIRE['chacals-du-seuil'], CATALOGUE_DU_COMPOSEUR),
  'balance-des-heures': RPG_DECK_TENEBRES_BASE,
  'juges-de-la-necropole': composerDeck(RPG_RECETTES_HISTOIRE['juges-de-la-necropole'], CATALOGUE_DU_COMPOSEUR),
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
        avatar: 'faiseur-de-passage',
        puissance: 2,
        ia: { niveau: 'normale', style: 'equilibre' },
        note: 'Il propose, il négocie, il encaisse. Aucun geste inutile.',
      },
      {
        id: 'souk-2',
        nom: 'La Gardienne des ksour',
        fonction: 'Portière du souk haut',
        deck: 'veilleurs-du-desert',
        avatar: 'amani-des-ksour',
        puissance: 3,
        ia: { niveau: 'normale', style: 'prudent' },
        note: 'Les portes de pierre tiennent parce qu’elle refuse tous les mauvais échanges.',
      },
      {
        id: 'souk-3',
        nom: 'Le Djinn du tournant',
        fonction: 'Rouleur d’épices',
        deck: 'cour-des-djinns',
        avatar: null,
        puissance: 4,
        ia: { niveau: 'normale', style: 'agressif' },
        note: 'Il vendait des épices. Il a gardé le feu, et l’habitude d’ouvrir les hostilités.',
      },
      {
        id: 'souk-4',
        nom: 'La Reine des étals',
        fonction: 'Doyenne du souk',
        deck: 'souffleuse-de-verre',
        avatar: 'tin-hinan',
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
        avatar: 'fennec-des-decombres',
        puissance: 4,
        ia: { niveau: 'normale', style: 'agressif' },
        note: 'Les éclats sifflent ; il a déjà choisi son prochain pas — et le vôtre.',
      },
      {
        id: 'sables-2',
        nom: 'L’Ifrit des ergs',
        fonction: 'Gardien du portail',
        deck: 'cour-des-djinns',
        avatar: 'ifrit-des-ergs',
        puissance: 5,
        ia: { niveau: 'veilleur', style: 'agressif' },
        note: 'Les dunes rougissent avant même qu’il apparaisse. Il frappe pour conclure.',
      },
      {
        id: 'sables-3',
        nom: 'L’Horloger du Zénith',
        fonction: 'Voix de l’horloge du ciel',
        deck: 'grand-horloger',
        avatar: 'sahir-des-braises',
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
  {
    id: 'tour-du-soleil-rouge',
    nom: 'La Tour du Soleil rouge',
    miniature: 'tour-du-soleil-rouge.jpg',
    resume: 'Une forteresse d’écarlate et de cèdre au flanc du Mont Ardent. L’honneur y frappe au trépas, les sabres vibrent en résonance et le Daimyō lève son armée sous la flamme originelle.',
    etages: [
      {
        id: 'soleil-1',
        nom: 'L’Ashigaru du guet',
        fonction: 'Sentinelle de la palissade',
        deck: 'gardes-du-soleil',
        avatar: 'ashigaru-des-braises',
        puissance: 1,
        ia: { niveau: 'normale', style: 'prudent' },
        note: 'La lance basse et le pas mesuré. Il bloque les premiers assauts et laisse les cendres s’accumuler.',
      },
      {
        id: 'soleil-2',
        nom: 'Le Rōnin des braises',
        fonction: 'Sabre errant sans seigneur',
        deck: 'lames-du-soleil',
        avatar: 'ronin-du-soleil-rouge',
        puissance: 3,
        ia: { niveau: 'normale', style: 'agressif' },
        note: 'Sans armure ni hésitation : le katana frappe dès son arrivée, avant même que la fumée ne se dissipe.',
      },
      {
        id: 'soleil-3',
        nom: 'Le Kenshi du torii',
        fonction: 'Maître d’armes du sanctuaire',
        deck: 'serment-du-soleil-rouge',
        avatar: 'samourai-du-torii',
        puissance: 5,
        ia: { niveau: 'veilleur', style: 'agressif' },
        note: 'Chaque coup résonne dans la garde de ses pairs. Sa parade au torii prépare la riposte sanglante.',
      },
      {
        id: 'soleil-4',
        nom: 'Le Daimyō du Soleil rouge',
        fonction: 'Seigneur du Mont Ardent',
        deck: 'maitre-du-soleil-rouge',
        avatar: 'daimyo-du-soleil-rouge',
        puissance: 7,
        ia: { niveau: 'veilleur', style: 'controle' },
        note: 'Le seigneur de la forteresse. Sa bannière gonfle chaque samouraï qui attaque, et la flamme de Kagutsuchi consume quiconque hésite.',
      },
    ],
  },
  {
    id: 'tour-de-la-necropole',
    nom: 'La Tour de la Nécropole',
    miniature: 'tour-de-la-necropole.jpg',
    resume: 'Les cryptes d’ébène et d’or enfouies sous le calcaire de Bab El. Le Prix s’y paie en sang, le Tribut dévore les cœurs et les serviteurs de lin s’éveillent dans l’ombre.',
    etages: [
      {
        id: 'necropole-1',
        nom: 'L’Ouvrier du natron',
        fonction: 'Embaumeur des cryptes basses',
        deck: 'momies-de-la-necropole',
        avatar: 'momie-de-lin',
        puissance: 1,
        ia: { niveau: 'normale', style: 'prudent' },
        note: 'Il roule les bandelettes sans hâte. Ses momies tombent pour mieux renaître et épuiser vos réserves.',
      },
      {
        id: 'necropole-2',
        nom: 'Le Chacal du seuil',
        fonction: 'Gardien des caveaux',
        deck: 'chacals-du-seuil',
        avatar: 'chacal-du-seuil',
        puissance: 3,
        ia: { niveau: 'normale', style: 'agressif' },
        note: 'Une morsure rapide dans l’obscurité : le Tribut vous arrache vos PV pour nourrir sa propre vigueur.',
      },
      {
        id: 'necropole-3',
        nom: 'Celle qui pèse',
        fonction: 'Greffière de la Balance',
        deck: 'balance-des-heures',
        avatar: 'celle-qui-pese',
        puissance: 5,
        ia: { niveau: 'veilleur', style: 'controle' },
        note: 'Elle pose la plume sur le plateau. Vos cartes quittent votre main tandis que le papyrus consume vos forces.',
      },
      {
        id: 'necropole-4',
        nom: 'La Dévoreuse des âmes',
        fonction: 'Bête sacrée du Jugement',
        deck: 'juges-de-la-necropole',
        avatar: 'la-devoreuse',
        puissance: 7,
        ia: { niveau: 'veilleur', style: 'controle' },
        note: 'Le tribunal d’ébène au sommet des catacombes. Les créatures jugées trop lourdes sont exilées sans retour.',
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
