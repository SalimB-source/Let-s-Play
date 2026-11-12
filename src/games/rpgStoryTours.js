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

import { RPG_DECKS_THEMATIQUES } from './rpgDecksThematiques.js';
import { RPG_TOUR_OUBLIEE } from './rpgTourOubliee.js';

/** Identifiants historiques de progression conservés dans les sauvegardes.
 * Les cartes jouées proviennent uniquement du catalogue thématique commun :
 * aucune ancienne recette d'étage n'est recomposée au lancement. */
const THEME_PAR_DECK = Object.freeze({
  'cour-des-djinns': 'sahir',
  'lettres-de-marque': 'corsaires',
  'veilleurs-du-desert': 'sable',
  'maree-des-abysses': 'sources',
  'sentiers-de-cendre': 'vampires',
  'souffleuse-de-verre': 'sahir',
  'serment-des-neuf-hivers': 'vikings',
  'gardes-du-fjord': 'vikings',
  'meute-des-neiges': 'vikings',
  'maitre-des-neuf-hivers': 'vikings',
  'grand-horloger': 'sahir',
  'gardes-du-soleil': 'lionne',
  'lames-du-soleil': 'lionne',
  'serment-du-soleil-rouge': 'lionne',
  'maitre-du-soleil-rouge': 'lionne',
  'momies-de-la-necropole': 'papyrus',
  'chacals-du-seuil': 'papyrus',
  'balance-des-heures': 'papyrus',
  'juges-de-la-necropole': 'papyrus',
  'guetteur-de-palier': 'sable',
  'scribe-de-la-liste': 'sahir',
  'puisatier-des-cendres': 'sahir',
  'marchand-de-sable': 'sahir',
  'gardienne-des-ksour': 'sable',
  'djinn-du-tournant': 'sahir',
  'reine-des-etals': 'sahir',
  'veille-des-ergs': 'sahir',
  'ifrit-des-sables': 'sahir',
  'horloger-du-zenith': 'sahir',
  'pecheur-de-perles': 'sources',
  'nageuse-des-puits': 'sources',
  'sonneur-d-ecume': 'sources',
  'devoreur-de-l-abime': 'sources',
  'equipage-des-galiotes': 'corsaires',
  'marche-des-ranscons': 'corsaires',
  'flotte-du-rais': 'corsaires',
  'amiral-des-deux-mers': 'corsaires',
  'valkyrie-du-fjord': 'vikings',
  'kenshi-du-torii': 'lionne',
  'peseuse-des-ames': 'papyrus',
  'corbeaux-du-givre': 'papyrus',
  'serment-des-neuf-nuits': 'papyrus',
  'veille-du-corbeau': 'papyrus',
  'maitre-des-corbeaux': 'papyrus',
  'veilleurs-absolus': 'sable',
  'flamme-absolue': 'lionne',
  'maree-absolue': 'sources',
  'hiver-absolu': 'vikings',
  'jugement-absolu': 'papyrus',
  'course-absolue': 'corsaires',
  'le-sablier': 'vampires',
  'horde-des-fosses': 'vampires',
  'cour-de-sang': 'vampires',
  'cauchemars-du-gourara': 'vampires',
  'cauchemars-du-registre': 'vampires',
  'bestiaire-oublie': 'vampires',
  'le-roi-sans-nom': 'vampires',
});
const themes = new Map(RPG_DECKS_THEMATIQUES.map((theme) => [theme.id, theme.cardIds]));
export const RPG_STORY_DECKS = Object.fromEntries(Object.entries(THEME_PAR_DECK)
  .map(([id, themeId]) => [id, themes.get(themeId)]));

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
        deck: 'guetteur-de-palier',
        puissance: 0,
        ia: { niveau: 'recit', style: 'equilibre' },
        note: 'Il compte les passants et rate la moitié de ses coups. Premier étage : on apprend ici.',
      },
      {
        id: 'listes-2',
        nom: 'La Scribe de la Liste',
        fonction: 'Greffière des évacuations',
        deck: 'scribe-de-la-liste',
        puissance: 1,
        ia: { niveau: 'normale', style: 'controle' },
        note: 'Elle rature les noms un par un — vos créatures aussi passent à la trappe.',
      },
      {
        id: 'listes-3',
        nom: 'Le Puisatier des Cendres',
        fonction: 'Maître des citernes',
        deck: 'puisatier-des-cendres',
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
        deck: 'marchand-de-sable',
        avatar: 'faiseur-de-passage',
        puissance: 2,
        ia: { niveau: 'normale', style: 'equilibre' },
        note: 'Il propose, il négocie, il encaisse. Aucun geste inutile.',
      },
      {
        id: 'souk-2',
        nom: 'La Gardienne des ksour',
        fonction: 'Portière du souk haut',
        deck: 'gardienne-des-ksour',
        avatar: 'amani-des-ksour',
        puissance: 3,
        ia: { niveau: 'normale', style: 'prudent' },
        note: 'Les portes de pierre tiennent parce qu’elle refuse tous les mauvais échanges.',
      },
      {
        id: 'souk-3',
        nom: 'Le Djinn du tournant',
        fonction: 'Rouleur d’épices',
        deck: 'djinn-du-tournant',
        avatar: null,
        puissance: 4,
        ia: { niveau: 'normale', style: 'agressif' },
        note: 'Il vendait des épices. Il a gardé le feu, et l’habitude d’ouvrir les hostilités.',
      },
      {
        id: 'souk-4',
        nom: 'La Reine des étals',
        fonction: 'Doyenne du souk',
        deck: 'reine-des-etals',
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
        deck: 'veille-des-ergs',
        avatar: 'fennec-des-decombres',
        puissance: 4,
        ia: { niveau: 'normale', style: 'agressif' },
        note: 'Les éclats sifflent ; il a déjà choisi son prochain pas — et le vôtre.',
      },
      {
        id: 'sables-2',
        nom: 'L’Ifrit des ergs',
        fonction: 'Gardien du portail',
        deck: 'ifrit-des-sables',
        avatar: 'ifrit-des-ergs',
        puissance: 5,
        ia: { niveau: 'veilleur', style: 'agressif' },
        note: 'Les dunes rougissent avant même qu’il apparaisse. Il frappe pour conclure.',
      },
      {
        id: 'sables-3',
        nom: 'L’Horloger du Zénith',
        fonction: 'Voix de l’horloge du ciel',
        deck: 'horloger-du-zenith',
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
        deck: 'pecheur-de-perles',
        avatar: 'veilleuse-des-citernes',
        puissance: 1,
        ia: { niveau: 'recit', style: 'equilibre' },
        note: 'Il remonte ses filets vides et s’en amuse. Premier plongeon : on apprend à contrer.',
      },
      {
        id: 'abysses-2',
        nom: 'La Nageuse des puits',
        fonction: 'Gardienne des eaux souterraines',
        deck: 'nageuse-des-puits',
        avatar: 'bakunawa',
        puissance: 3,
        ia: { niveau: 'normale', style: 'controle' },
        note: 'Elle attend que vous posiez votre carte pour la défaire. Ses silences tombent au bon moment.',
      },
      {
        id: 'abysses-3',
        nom: 'Le Sonneur d’écume',
        fonction: 'Cloche des ports engloutis',
        deck: 'sonneur-d-ecume',
        avatar: 'sonneur-fele',
        puissance: 5,
        ia: { niveau: 'normale', style: 'agressif' },
        note: 'Il sonne l’alerte et frappe avant que l’eau ne retombe.',
      },
      {
        id: 'abysses-4',
        nom: 'Le Dévoreur de l’abîme',
        fonction: 'Gardien du fond',
        deck: 'devoreur-de-l-abime',
        avatar: 'leviathan',
        puissance: 7,
        ia: { niveau: 'veilleur', style: 'controle' },
        note: 'Les bêtes du fond répondent à son appel. Il contre le premier sort qui le menace.',
      },
    ],
  },
  {
    id: 'tour-des-corsaires',
    nom: 'La Tour des Corsaires',
    miniature: 'tour-des-corsaires.jpg',
    resume: 'Quand les citernes des Abysses se sont ouvertes, la marée a révélé les routes de contrebande de la Régence. Les Corsaires de la Reine Anne détiennent les manifestes qui relient le Souk aux tours : à bord, la prise se partage, les cargaisons changent de main et chaque abordage rapproche Salem de la vérité sur la Chambre.',
    etages: [
      {
        id: 'corsaires-1', nom: 'La Mousse des galiotes', fonction: 'Guetteuse du chenal',
        deck: 'equipage-des-galiotes', avatar: 'mousse-des-galiotes', puissance: 1,
        ia: { niveau: 'recit', style: 'equilibre' },
        note: 'Elle connaît les passes que la Nageuse des puits a laissées derrière elle. À bord, même une petite prise peut changer le cours du duel.',
      },
      {
        id: 'corsaires-2', nom: 'Le Négociant des rançons', fonction: 'Teneur des comptes de prise',
        deck: 'marche-des-ranscons', avatar: null, puissance: 3,
        ia: { niveau: 'normale', style: 'prudent' },
        note: 'Il rachète les prisonniers de la Chambre et réinvestit chaque rançon dans la cale. Rien ne se perd, tout devient cargaison.',
      },
      {
        id: 'corsaires-3', nom: 'Le Raïs de la Galiote', fonction: 'Capitaine de la flotte de la Régence',
        deck: 'flotte-du-rais', avatar: 'rais-de-la-galiote', puissance: 5,
        ia: { niveau: 'veilleur', style: 'agressif' },
        note: 'Son cotre ouvre la voie, le grappin accroche le pont et les lettres de marque font de chaque abordage une affaire légale.',
      },
      {
        id: 'corsaires-4', nom: 'La Barbe-Rousse', fonction: 'Amiral du Hollandais volant',
        deck: 'amiral-des-deux-mers', avatar: 'la-barbe-rousse', puissance: 7,
        ia: { niveau: 'veilleur', style: 'controle' },
        note: 'Au sommet, le vaisseau fantôme surgit de la brume des Abysses. La Chambre a falsifié les manifestes : Salem doit choisir ce qu’il fera de la preuve.',
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
        deck: 'valkyrie-du-fjord',
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
    resume: 'Une forteresse d’écarlate et de cèdre au flanc du Mont Ardent. Le Harakiri y frappe au trépas, les sabres vibrent en résonance et le Daimyō lève son armée sous la flamme originelle.',
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
        deck: 'kenshi-du-torii',
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
        avatar: 'ouvrier-du-natron',
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
        deck: 'peseuse-des-ames',
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
  {
    // La Tour du Corbeau — le set hybride Neige + Ténèbres (doc 22). Le Père
    // des corbeaux de la Tour du Fjord s'y retourne : la neige entre dans la
    // nuit, et chaque étage demande les deux couleurs à la fois. Tour libre,
    // hors récit, comme celle du Sablier renversé : elle n'ajoute ni acte ni
    // scène, seulement ses quatre duels.
    id: 'tour-du-corbeau',
    nom: 'La Tour du Corbeau',
    miniature: 'tour-du-corbeau.jpg',
    resume: 'Là où la neige tombe sur la balance, un corbeau se pose sur chaque nom. La glace n’y blanchit plus : elle noircit. Quatre étages pour apprendre que le Nord et la Nuit ne font qu’un seul hiver — et qu’au sommet, le Père des corbeaux a changé d’œil.',
    etages: [
      {
        id: 'corbeau-1',
        nom: 'La Vigie des neuf nuits',
        fonction: 'Sentinelle du seuil noir',
        deck: 'corbeaux-du-givre',
        avatar: 'corbeau-de-givre',
        puissance: 4,
        ia: { niveau: 'normale', style: 'prudent' },
        note: 'Elle laisse la neige faire le travail : chaque corbeau qui se pose fige une créature de coût 3 ou moins, et la muraille attend que vous ayez froid.',
      },
      {
        id: 'corbeau-2',
        nom: 'La Veilleuse au corbeau noir',
        fonction: 'Greffière des morts sans nom',
        deck: 'serment-des-neuf-nuits',
        avatar: 'veilleuse-au-corbeau-noir',
        puissance: 5,
        ia: { niveau: 'veilleur', style: 'controle' },
        note: 'Elle compte à voix basse : le Tribut prend deux PV à chaque contact de ses berserks, qui ouvrent le combat par leur Provocation.',
      },
      {
        id: 'corbeau-3',
        nom: 'La Valkyrie des neuf nuits',
        fonction: 'Porteuse du corbeau de minuit',
        deck: 'veille-du-corbeau',
        avatar: 'valkyrie-des-neuf-nuits',
        puissance: 6,
        ia: { niveau: 'veilleur', style: 'agressif' },
        note: 'Envol, Furie et exil dans la même main : elle emporte les petites créatures avant qu’elles ne servent, puis frappe sans être bloquée.',
      },
      {
        id: 'corbeau-4',
        nom: 'Le Maître des corbeaux',
        fonction: 'Celui qui tient la neige et la nuit',
        deck: 'maitre-des-corbeaux',
        avatar: 'maitre-des-corbeaux',
        puissance: 7,
        ia: { niveau: 'sablier', style: 'equilibre' },
        note: '**boss** : le Père des corbeaux retourné. Cinq figures mythiques des deux identités, le gel et l’exil, et un œil dans la nuit qui n’oublie aucun de vos noms.',
      },
    ],
  },
  {
    // La tour d'épreuves terminale de la Conquête (hors récit « La Dernière
    // Liste ») : sept étages, sept identités différentes — les cinq
    // couleurs pures, la Course Sable + Eau, puis le bicolore du sommet.
    // Chaque gardien joue au niveau `sablier` (le plus fort de `rpgAI.js`)
    // avec un paquet « absolu » : les meilleures cartes de son identité,
    // sans plafond de mythiques ni de rares. Les puissances (8 à 14)
    // prolongent l'échelle des autres tours, qui plafonnent à 7.
    id: 'tour-du-sablier-renverse',
    nom: 'La Tour du Sablier renversé',
    miniature: 'tour-du-sablier-renverse.jpg',
    resume: 'Quand le Sablier se renverse, les maîtres de Bab El reviennent à leur sommet. Sept étages, sept manières de perdre : chaque gardien joue le meilleur de son art, sans retenue — et au dernier palier, le Sablier lui-même tient deux couleurs du temps.',
    etages: [
      {
        id: 'sablier-1',
        nom: 'La Dame aux ailes d’or',
        fonction: 'Maîtresse absolue du Sable',
        deck: 'veilleurs-absolus',
        avatar: 'dame-aux-ailes-d-or',
        puissance: 8,
        ia: { niveau: 'sablier', style: 'prudent' },
        note: 'Le désert à son sommet : Salem, Tarek et Tin Hinan derrière la même muraille. Elle bloque, elle soigne, elle équipe — et chaque échange la sert.',
      },
      {
        id: 'sablier-2',
        nom: 'Kagutsuchi, la Flamme originelle',
        fonction: 'Maître absolu de la Braise',
        deck: 'flamme-absolue',
        avatar: 'kagutsuchi-flamme-originelle',
        puissance: 9,
        ia: { niveau: 'sablier', style: 'agressif' },
        note: 'Treize mythiques de Braise dans un seul paquet : Orochi, Susanoo, les ifrits et le Daimyō. La course commence au premier mana et ne s’arrête pas.',
      },
      {
        id: 'sablier-3',
        nom: 'Jörmungandr, le Serpent des marées',
        fonction: 'Maître absolu de l’Eau',
        deck: 'maree-absolue',
        avatar: 'jormungandr',
        puissance: 10,
        ia: { niveau: 'sablier', style: 'controle' },
        note: 'Il contre ce qui compte, renvoie ce qui gêne, puis lâche les bêtes du fond — Léviathan, Kraken et Bakunawa répondent au même appel.',
      },
      {
        id: 'sablier-4',
        nom: 'La Dame des Neuf Mondes',
        fonction: 'Maîtresse absolue de la Neige',
        deck: 'hiver-absolu',
        avatar: 'dame-des-neuf-mondes',
        puissance: 11,
        ia: { niveau: 'sablier', style: 'equilibre' },
        note: 'Les six figures du Nord en une seule main : le Père des corbeaux compte vos cartes, le Marteau attend, et le Serpent du monde ignore vos sorts.',
      },
      {
        id: 'sablier-5',
        nom: 'Le Passeur au masque de chacal',
        fonction: 'Maître absolu des Ténèbres',
        deck: 'jugement-absolu',
        avatar: 'passeur-au-masque-de-chacal',
        puissance: 12,
        ia: { niveau: 'sablier', style: 'controle' },
        note: 'Le Prix se paie dès le premier tour et le Tribut ne rend rien. La Dévoreuse exile, la Dernière Pesée conclut : pesé, jugé, terminé.',
      },
      {
        id: 'sablier-6',
        nom: 'Le Chasseur d’Ocracoke',
        fonction: 'Maître absolu de la Course',
        deck: 'course-absolue',
        avatar: 'le-chasseur-d-ocracoke',
        puissance: 13,
        ia: { niveau: 'sablier', style: 'agressif' },
        note: 'La Régence revenue à son sommet : chaque arrivée aborde, chaque prise paie, et le meilleur du Sable et de l’Eau navigue sous la même lettre de marque.',
      },
      {
        id: 'sablier-7',
        nom: 'Le Sablier',
        fonction: 'Celui qui compte les heures',
        deck: 'le-sablier',
        avatar: null,
        puissance: 14,
        ia: { niveau: 'sablier', style: 'equilibre' },
        note: 'Il n’a ni visage ni manière : Sable et Braise dans un seul paquet, des mythiques sans retenue, et quatre coups d’avance sur tout ce que vous jouez. Le sable tombe pour vous.',
      },
    ],
  },
  // La onzième tour — et la dernière. Elle n'appartient pas au récit, ses
  // cartes ne sont pas au catalogue, et elle ne s'ouvre qu'à qui a renversé le
  // Sablier (`deblocage`, lu par `etageEstDebloque`).
  RPG_TOUR_OUBLIEE,
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

/** La tour précédente dans l’ordre de la Conquête, ou null pour la première.
 *  C’est elle qui ouvre la tour courante : l’ascension est séquentielle. */
export function tourPrecedente(tourId) {
  const index = RPG_STORY_TOURS.findIndex((tour) => tour.id === tourId);
  if (index <= 0) return null;
  return RPG_STORY_TOURS[index - 1] ?? null;
}

/** Les cartes d’un deck de campagne (l’identifiant inconnu rend null). */
export function deckHistoire(deckId) {
  return RPG_STORY_DECKS[deckId] ?? null;
}
