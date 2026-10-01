import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { youTubeThumbUrl } from '../lib/videoThumbnails';

const SITE_URL = 'https://salimb-source.github.io/Let-s-Play';
const base = import.meta.env.BASE_URL;
const SITE_NAME = 'Let’s Play';
const DEFAULT_IMAGE = `${SITE_URL}/hero-lets-play.jpg`;

const pageMeta = {
  '/': {
    title: 'Let’s Play — Gaming, tech et pop culture en Algérie',
    description: 'Let’s Play est le média algérien dédié au gaming, à la tech, à l’e-sport, au cinéma et à la pop culture.',
    type: 'website',
  },
  '/news': {
    title: 'Actualités gaming — Let’s Play',
    description: 'Les dernières actualités du jeu vidéo, des consoles, du PC, de la tech et de la pop culture par la rédaction Let’s Play.',
    type: 'website',
  },
  '/news/tech': {
    title: 'Actualités tech — IA, matériel, espace et cybersécurité — Let’s Play',
    description: 'Les actus tech de la rédaction Let’s Play : intelligence artificielle, matériel, smartphones, espace et cybersécurité, avec la source d’origine citée à chaque fois.',
    type: 'website',
  },
  '/calendrier': {
    title: 'Calendrier complet des sorties gaming — Let’s Play',
    description: 'Toutes les sorties de jeux vidéo datées, mois par mois : septembre 2026 à avril 2027, plateformes et comptes à rebours, mis à jour dès qu’une date est confirmée.',
    type: 'website',
  },
  '/reviews': {
    title: 'Tests de jeux vidéo — Let’s Play',
    description: 'Retrouvez les tests et analyses de jeux vidéo de Let’s Play : gameplay, technique, direction artistique et verdict.',
    type: 'website',
  },
  '/dossiers': {
    title: 'Dossiers gaming et pop culture — Let’s Play',
    description: 'Des dossiers de fond sur l’histoire du jeu vidéo, les générations de consoles, les studios et la culture gaming.',
    type: 'website',
  },
  '/quizz': {
    title: 'Quizz gaming & quizz du jour — Let’s Play',
    description: 'Teste tes connaissances gaming : culture générale, rétro, souls-like, RPG, e-sport et studios. Un quizz du jour, des succès et de l’XP à gagner.',
    type: 'website',
  },
  '/jeu': {
    title: 'Les jeux de Let’s Play — Mirage Rush et Vice City Rush',
    description: 'Joue directement dans la page à Mirage Rush, runner 3D western, et Vice City Rush, course arcade néon en décapotable à travers cinq villes.',
    type: 'website',
  },
  '/communaute': {
    title: 'Communauté gaming — groupes et discussions — Let’s Play',
    description: 'Créez des groupes de discussion, retrouvez les joueurs qui partagent vos univers et échangez dans la communauté gaming Let’s Play.',
    type: 'website',
  },
  '/community': {
    title: 'Gaming community — groups and discussions — Let’s Play',
    description: 'Create discussion groups, find players who share your worlds and join the Let’s Play gaming community.',
    type: 'website',
  },
  '/jeu/mirage-rush': {
    title: 'Mirage Rush — Jeu arcade 3D — Let’s Play',
    description: 'Cours dans un désert surréaliste en blocs, évite les cactus et grimpe au classement communautaire de Let’s Play.',
    image: 'mirage-rush-thumb.jpg',
    type: 'website',
  },
  '/jeu/vice-city-rush': {
    title: 'Vice City Rush — Course arcade 3D — Let’s Play',
    description: 'Monte dans un cabriolet et lance-toi dans une course arcade 3D à Vice City, New York, Tokyo, Paris ou Londres. Ramasse des objets, utilise tes pouvoirs et évite les zones de ralentissement.',
    image: 'vice-city-rush-thumb.svg',
    type: 'website',
  },
  '/news/kingdom-hearts-4-coco': {
    title: 'Kingdom Hearts 4 : pourquoi le monde de Coco colle à la saga — Let’s Play',
    description: 'Le monde de Coco est confirmé dans Kingdom Hearts 4, attendu fin 2027. Seconde mort, mémoire et symbolique du cœur : pourquoi ce choix de Disney et Tetsuya Nomura est bien plus cohérent qu’un simple coup marketing.',
    image: 'kingdom-hearts-4-coco-news.jpg', type: 'article', published: '2026-09-15', section: 'Actualités gaming',
  },
  '/news/wolverine-exclu-ps5': {
    title: 'Marvel’s Wolverine, l’exclu PS5 qui fait des jaloux — Let’s Play',
    description: 'Marvel’s Wolverine sort ce 15 septembre 2026, uniquement sur PS5. Deux heures de prise en main : récit original sans X-Men, combats bestiaux et mise en scène de cinéma — l’exclu que les joueurs PC et Xbox Series nous envient.',
    image: 'wolverine-countdown.jpg', type: 'article', published: '2026-09-15', section: 'Actualités gaming',
  },
  '/news/rayman-legends-retold': {
    title: 'Rayman Legends Retold reporté au 3 décembre 2026 — Let’s Play',
    description: 'Rayman Legends Retold est reporté au 3 décembre 2026 sur PS5, Xbox Series, Switch 2 et PC. Une vidéo de gameplay est annoncée le 22 septembre.',
    image: 'rayman-legends-retold-news.jpg', type: 'article', published: '2026-09-15', section: 'Actualités gaming',
  },
  '/news/fire-emblem-fortunes-weave': {
    title: 'Fire Emblem: Fortune’s Weave fait le point avant sa sortie — Let’s Play',
    description: 'Fire Emblem: Fortune’s Weave sortira le 17 septembre 2026 sur Nintendo Switch 2. Quatre protagonistes et des scénarios à entrelacer sont au cœur de cette nouvelle aventure.',
    image: 'fire-emblem-fortunes-weave-news.jpg', type: 'article', published: '2026-09-15', section: 'Actualités gaming',
  },
  '/news/cyberpunk-2077-battlenet': {
    title: 'Cyberpunk 2077 arrive sur Battle.net — Let’s Play',
    description: 'Cyberpunk 2077: Ultimate Edition rejoindra Battle.net en 2026 dans le prolongement du partenariat entre CD PROJEKT RED et Blizzard.',
    image: 'cyberpunk-2077-battlenet-news.webp', type: 'article', published: '2026-09-14', section: 'Actualités gaming',
  },
  '/news/persona-6-switch-2': {
    title: 'Persona 6 aura une édition physique sur Switch 2 — Let’s Play',
    description: 'Persona 6 est annoncé sur Switch 2, PS5, Xbox Series et PC, avec une édition physique prévue sur Nintendo Switch 2.',
    image: 'persona-6-news.jpg', type: 'article', published: '2026-09-14', section: 'Actualités gaming',
  },
  '/news/last-of-us-ii-mod': {
    title: 'Le mod multijoueur de The Last of Us Part II ne sortira pas — Let’s Play',
    description: 'Sony a demandé l’arrêt d’un projet de mod multijoueur destiné à The Last of Us Part II sur PC.',
    image: 'last-of-us-mod-news.jpg', type: 'article', published: '2026-09-14', section: 'Actualités gaming',
  },
  '/news/tokyo-game-show-2026-annulation': {
    title: 'Tokyo Game Show 2026 : le dernier jour annulé — Let’s Play',
    description: 'La CESA annule la journée du 21 septembre du Tokyo Game Show 2026 en raison de l’approche du typhon n°25. Le 20 septembre reste maintenu.',
    image: 'tokyo-game-show-2026-news.jpg', type: 'article', published: '2026-09-20', section: 'Actualités gaming',
  },
  '/news/eshop-switch-2-20-septembre': {
    title: 'Fire Emblem reste numéro un de l’eShop Switch 2 — Let’s Play',
    description: 'Fire Emblem: Fortune’s Weave conserve la première place de l’eShop Nintendo Switch 2 au 20 septembre 2026, devant Diablo 4 et LEGO Batman.',
    image: 'fire-emblem-fortunes-weave-news.jpg', type: 'article', published: '2026-09-20', section: 'Actualités gaming',
  },
  '/news/sony-licence-jeux-numeriques': {
    title: 'Sony : les jeux numériques PlayStation sont-ils achetés ou seulement licenciés ? — Let’s Play',
    description: 'Dans une plainte collective en Californie, Sony affirme qu’un achat sur le PlayStation Store accorde une licence personnelle et non la propriété du jeu numérique.',
    image: 'playstation-store-ownership-news.jpg', type: 'article', published: '2026-09-20', section: 'Actualités gaming',
  },
  '/news/ea-sports-fc-27-carriere-dynamique': {
    title: 'EA Sports FC 27 : la refonte du mode Carrière — Let’s Play',
    description: 'Valeur marchande recalculée chaque semaine avec TransferRoom (xTV), note globale dynamique, profils de croissance, scénarios communautaires et crises de vestiaire : ce que change la refonte du mode Carrière d’EA Sports FC 27, attendu le 25 septembre 2026.',
    image: 'ea-sports-fc-27-carriere-pitch-notes.jpg', type: 'article', published: '2026-09-22', section: 'Actualités gaming',
  },
  '/news/physint-budget-400-millions-xbox': {
    title: 'Physint : un budget de 400 millions de dollars ? Xbox aurait signé pour beaucoup moins — Let’s Play',
    description: 'Un chiffre de 400 millions de dollars a circulé autour de Physint, le jeu d’action-espionnage de Hideo Kojima repêché par Xbox. Christopher Dring évoque un simple bruit de couloir et Jason Schreier assure que Microsoft a signé pour un montant nettement inférieur.',
    image: 'kojima_mindplayer.png', type: 'article', published: '2026-09-29', section: 'Actualités gaming',
  },
  '/news/god-of-war-laufey-precommandes-arc-serpent': {
    title: 'God of War Laufey : l’arc-serpent de Faye et les éditions, à l’ouverture des précommandes — Let’s Play',
    description: 'Santa Monica Studio détaille la deuxième arme de Faye — l’arc-serpent, ses deux modes de visée et sa personnalisation — puis la grille des éditions de God of War Laufey : 79,99 € en Standard, 89,99 € en numérique Deluxe, mise à niveau à 10 €, bonus de précommande communs et aucun collector. Sortie le 16 février 2027 sur PS5.',
    image: 'https://blog.fr.playstation.com/tachyon/sites/10/2026/09/5bd30eac480284e480a9ba68e9f06472584219f4.jpg?resize=1088%2C612&crop_strategy=smart', type: 'article', published: '2026-09-29', section: 'Actualités gaming',
  },
  '/news/minecraft-world-hotel-chessington-2027': {
    title: 'Minecraft World Hotel : le premier hôtel officiel Minecraft ouvre en 2027 à Chessington — Let’s Play',
    description: 'Annoncé au Minecraft Live du 26 septembre 2026, le Minecraft World Hotel comptera près de 70 chambres sur quatre étages à Chessington (Grand Londres) : décors du jeu, restaurant inspiré des biomes océaniques, bar à potions et ascenseurs en portails du Nether, aux côtés du rollercoaster Escape the Nether.',
    image: 'screenshots/minecraft-world-hotel/01.jpg', type: 'article', published: '2026-09-29', section: 'Actualités gaming',
  },
  '/news/minecraft-the-sift-nouvelle-dimension': {
    title: 'Minecraft : le Sift, première nouvelle dimension depuis quinze ans — Let’s Play',
    description: 'Dévoilé au Minecraft Live du 26 septembre 2026, le Sift est la quatrième dimension de Minecraft après l’Overworld, le Nether et l’End. Il débute dans Minecraft Dungeons II le 29 septembre, avant les éditions Java et Bedrock en 2027.',
    image: 'https://www.minecraft.net/content/dam/minecraftnet/games/spicewood/screenshots/MCL_Dungeons2_sift_1280x720.jpg', type: 'article', published: '2026-09-28', section: 'Actualités gaming',
  },
  '/news/the-witcher-3-remastered-sortie-29-septembre': {
    title: 'The Witcher 3: Wild Hunt – Remastered sort le 29 septembre : heure, poids, gratuité — Let’s Play',
    description: 'Déverrouillage mondial le 29 septembre 2026 à 10 h UTC (11 h à Alger) sur PC, PS5, Xbox Series X|S et Switch 2. Gratuit pour les propriétaires du jeu sur PC et consoles actuelles, environ 45 Go, sans préchargement, extensions incluses.',
    image: 'https://public.cdn.cdpr.app/common/news/974db3ceaf0e6035a922cbbd7c7770b0_q90_1280x720.jpeg', type: 'article', published: '2026-09-28', section: 'Actualités gaming',
  },
  '/news/xbox-nadella-restructuration': {
    title: 'Satya Nadella défend la restructuration de Xbox — Let’s Play',
    description: 'Le PDG de Microsoft juge « formidable » la rationalisation de Xbox menée par Asha Sharma et promet un retour à la croissance dès le prochain exercice fiscal, alors que près de 3 200 postes sont supprimés et que Halo passe chez Activision.',
    image: 'https://news.microsoft.com/source/wp-content/uploads/2024/10/MS-Exec-Nadella-Satya.jpg', type: 'article', published: '2026-09-28', section: 'Actualités gaming',
  },
  '/news/tech/starship-vol-14-orbite-atteinte': {
    title: 'Starship atteint enfin l’orbite : 26 satellites Starlink V3 déployés — Let’s Play',
    description: 'Le 28 septembre 2026, le vol 14 de Starship a atteint l’orbite pour la première fois et déployé 26 satellites Starlink V3 opérationnels. Une panne d’un Raptor Vacuum en montée a ramené le vaisseau dans le Pacifique nord après 3 h 09, au lieu des dix heures prévues.',
    image: 'https://sxcontent9668.azureedge.us/cms-assets/assets/Flight_14_Website_Desktop_4_734a6bbf25.jpg', type: 'article', published: '2026-09-29', section: 'Actualités tech',
  },
  '/news/tech/nvidia-open-agent-safety-platform': {
    title: 'NVIDIA Open Agent Safety Platform : OpenShell et Sentry contre les agents fous — Let’s Play',
    description: 'Présentée le 28 septembre 2026 par NVIDIA, l’Open Agent Safety Platform combine OpenShell, un bac à sable open source qui applique une politique vérifiable aux agents autonomes, et Sentry, une surveillance matérielle sur DPU BlueField-4 qui les met en quarantaine en quelques millisecondes.',
    image: 'https://iprsoftwaremedia.com/219/files/202609/c68dda94943a6e093074e9e88fd5ddef/6aba9c533d6332d60a0bb99a_nvidia-open-agent-safety-platform/nvidia-open-agent-safety-platform_mid.png?v=f9cea0c6-00ad-4b7f-b0a0-6bc06b39af63', type: 'article', published: '2026-09-29', section: 'Actualités tech',
  },
  '/news/tech/midi-ia-maison-blanche': {
    title: 'Déjeuner IA à la Maison-Blanche : Trump reçoit les 6 boss de l’IA — Let’s Play',
    description: 'Le 29 septembre 2026, Donald Trump reçoit les patrons de Meta, Anthropic, OpenAI, Google, Palantir et Nvidia pour discuter de la régulation de l’IA, sous la pression d’un livre blanc de chercheurs — Hinton et Bengio en tête — qui réclame des règles contraignantes.',
    image: 'https://img.semafor.com/4edcc71f032e922ad0fa3f238b2206d9949f984f-2048x1294.jpg?w=740&q=75&auto=format&h=467', type: 'article', published: '2026-09-29', section: 'Actualités tech',
  },
  '/news/tech/starship-flight-14-premier-vol-orbital': {
    title: 'Starship : le vol 14 vise la première mise en orbite — Let’s Play',
    description: 'Le quatorzième vol d’essai de Starship, prévu le 28 septembre 2026 depuis Starbase, doit placer la fusée en orbite pour la première fois et déployer 26 satellites Starlink V3 (jusqu’à 26 Tbps). Fenêtre ouverte à 12 h 15 UTC, repli les 29 et 30 septembre.',
    image: 'https://sxcontent9668.azureedge.us/cms-assets/assets/Flight_14_Website_Desktop_4_734a6bbf25.jpg', type: 'article', published: '2026-0-28', section: 'Actualités tech',
  },
  '/news/tech/copilot-home-code-autopilot': {
    title: 'Copilot devient un agent : Home, Code et Autopilot — Let’s Play',
    description: 'Microsoft réorganise Copilot autour de Home, Code et Autopilot, présentés le 25 septembre 2026 : applications créées en langage courant, agent cloud persistant et facturation à l’usage pour les fonctions agentiques, d’abord chez les entreprises.',
    image: 'https://blogs.microsoft.com/wp-content/uploads/2026/09/OMB-Copilot-9-25-Hero-9_22_26.png', type: 'article', published: '2026-0-25', section: 'Actualités tech',
  },
  '/news/tech/apple-taptic-engine-verdict-5-7-milliards': {
    title: 'Apple condamnée à 5,7 milliards de dollars sur le Taptic Engine — Let’s Play',
    description: 'Un jury fédéral de San Diego a jugé le 25 septembre 2026 que le Taptic Engine des iPhone et Apple Watch contrefait deux brevets de Taction Technology : plus de 5,7 milliards de dollars de dommages, un record, qu’Apple conteste en appel.',
    image: 'https://platform.theverge.com/wp-content/uploads/sites/2/2026/09/268738_Apple_Watch_Series_12_AKrales_0277.jpg?quality=90&strip=all&crop=0%2C0%2C100%2C100&w=1600', type: 'article', published: '2026-0-25', section: 'Actualités tech',
  },
  '/news/tech/agent-openai-portail-australien': {
    title: 'Un agent OpenAI a franchi les protections d’un portail australien — Let’s Play',
    description: 'En juin 2026, un agent d’OpenAI a atteint des fichiers non publics du portail de statistiques Medicare australien sans consigne en ce sens. Le gouvernement n’a été prévenu que le 10 septembre par courriel et n’exclut pas des poursuites.',
    image: 'https://image.cnbcfm.com/api/v1/image/107431804-17189858722024-06-21t155215z_1214353438_rc2sj6aut6ur_rtrmadp_0_rockset-m-a-openai.jpeg?v=1757715670&w=1600&h=900&vtcrop=y', type: 'article', published: '2026-0-24', section: 'Actualités tech',
  },
  '/news/tech/meta-connect-2026-lunettes-muse-charm': {
    title: 'Meta Connect 2026 : lunettes VR à 1 299 $ et Muse Charm — Let’s Play',
    description: 'Meta a présenté le 23 septembre 2026 des lunettes de réalité virtuelle à 1 299 dollars, attendues au printemps 2027, et le Muse Charm, un accessoire à porter sur soi pour parler à l’agent Muse, annoncé pour décembre sans prix.',
    image: 'https://image.cnbcfm.com/api/v1/image/108367218-Julia_Meta_VR_2.jpg?v=1790211668&w=1600&h=900&vtcrop=y', type: 'article', published: '2026-0-23', section: 'Actualités tech',
  },
  '/news/cinema/endgame-encore-record-avatar': {
    title: 'Box-office mondial : Endgame frôle le trône d’Avatar — Let’s Play',
    description: 'Avec 86 M$ ce week-end (26 M$ en Amérique du Nord, 60 M$ à l’international), la ressortie d’Avengers: Endgame porte son total mondial à environ 2,885 milliard et revient à 39 millions du record d’Avatar ; le Royaume-Uni signe le plus gros démarrage de ressortie de son histoire.',
    image: youTubeThumbUrl('L2NAh3CIdig'), type: 'article', published: '2026-09-29', section: 'Actualités cinéma',
  },
  '/news/cinema/coyote-vs-acme-numerique': {
    title: 'Coyote vs. Acme : le film sauvé de Warner passe en ligne — Let’s Play',
    description: 'Coyote vs. Acme est disponible en numérique dès le 29 septembre 2026 à 24,99 $ sur Prime Video, Apple TV et Fandango at Home. Racheté par Ketchup Entertainment après sa suppression par Warner Bros., le film a dépassé les 100 millions de dollars au box-office mondial.',
    image: youTubeThumbUrl('Bpg3tJ4f3v0'), type: 'article', published: '2026-09-29', section: 'Actualités cinéma',
  },
  '/news/cinema/mononoke-chapter-3-netflix': {
    title: 'Mononoke : Chapter III clôture la trilogie sur Netflix — Let’s Play',
    description: 'Mononoke The Movie: Chapter III – The Curse of the Serpent est disponible sur Netflix le 29 septembre 2026 : le Marchand de médicaments affronte une malédiction née dans les rangs supérieurs de l’Ōoku, dans le dernier film de la trilogie de Kenji Nakamura.',
    image: youTubeThumbUrl('R6PUcxSZ7YM'), type: 'article', published: '2026-09-29', section: 'Actualités cinéma',
  },
  '/news/cinema/box-office-us-endgame-encore-26-millions': {
    title: 'Box-office : Avengers Endgame – Encore confirme ses 26 millions de dollars — Let’s Play',
    description: 'Bilan consolidé du week-end américain des 25-27 septembre 2026 : Endgame – Encore premier avec 26 M$ (deuxième meilleure ressortie de l’histoire), Resident Evil deuxième à 23,3 M$ et plus de 100 M$ en dix jours. Meilleur 39e week-end depuis 2015 avec 122,3 M$.',
    image: youTubeThumbUrl('L2NAh3CIdig'), type: 'article', published: '2026-09-28', section: 'Actualités cinéma',
  },
  '/news/cinema/the-last-of-us-saison-3-john-goodman-laura-bailey': {
    title: 'The Last of Us saison 3 : John Goodman, Laura Bailey et Ian Alexander au casting — Let’s Play',
    description: 'Pour The Last of Us Day, HBO annonce John Goodman (Joey), Ian Alexander (Paco) et Laura Bailey (Elizabeth, cheffe des Séraphites) dans la saison 3, attendue en 2027 sur HBO Max avec Craig Mazin seul showrunner. Bailey était la voix d’Abby dans le jeu.',
    image: 'https://variety.com/wp-content/uploads/2026/09/LastofUs.Split_.1.jpg?w=1000&h=667&crop=1', type: 'article', published: '2026-09-28', section: 'Actualités cinéma',
  },
  '/news/cinema/godzilla-minus-zero-premiere-nyff': {
    title: 'Godzilla Minus Zero : première mondiale applaudie au New York Film Festival — Let’s Play',
    description: 'La suite de Godzilla Minus One de Takashi Yamazaki a fait sa première mondiale au NYFF le 26 septembre 2026. Premier film de la saga classé R aux États-Unis, il sort le 3 novembre au Japon, le 4 novembre en France et le 6 novembre aux États-Unis.',
    image: 'https://variety.com/wp-content/uploads/2026/09/GettyImages-2297305809.jpg?w=1000&h=667&crop=1', type: 'article', published: '2026-09-28', section: 'Actualités cinéma',
  },
  '/news/cinema/box-office-us-endgame-resident-evil': {
    title: 'Box-office : Avengers Endgame reprend la tête face à Resident Evil — Let’s Play',
    description: 'La ressortie d’Avengers: Endgame vise 24 à 26 millions de dollars sur le week-end américain du 25-27 septembre 2026, devant le reboot Resident Evil de Zach Cregger (22-23,5 M$). Deuxième meilleur dernier week-end de septembre de l’histoire du box-office US.',
    image: youTubeThumbUrl('L2NAh3CIdig'), type: 'article', published: '2026-09-27', section: 'Actualités cinéma',
  },
  '/news/cinema/werwulf-trailer-eggers': {
    title: 'Werwulf : Robert Eggers montre ses crocs — Let’s Play',
    description: 'Deuxième bande-annonce le 26 septembre, jour de pleine lune, pour Werwulf de Robert Eggers : loup-garou en vieil anglais, Aaron Taylor-Johnson, Willem Dafoe et Lily-Rose Depp. Sortie le 25 décembre 2026.',
    image: 'https://images.contentstack.io/v3/assets/blt223a4a92692ca457/bltc56e9a2c23500694/6a3d520c6391ef7c261677e4/werwulf_4marquee_image.png?branch=production&width=1600', type: 'article', published: '2026-09-27', section: 'Actualités cinéma',
  },
  '/news/cinema/fred-astaire-biopic-tom-holland': {
    title: 'Le biopic Fred Astaire réunit Tom Holland, Margaret Qualley et Sabrina Carpenter — Let’s Play',
    description: 'Sony complète le casting de son biopic Fred Astaire : Tom Holland en Fred, Margaret Qualley en Adele Astaire et Sabrina Carpenter en Ginger Rogers, sous la direction de Paul King. Aucune date de sortie pour l’instant.',
    image: 'https://variety.com/wp-content/uploads/2026/09/margaret-tom-sabrina.jpg?w=1200&h=800&crop=1', type: 'article', published: '2026-09-27', section: 'Actualités cinéma',
  },
};

const routeAliases = {
  '/calendar': '/calendrier',
  '/quiz': '/quizz',
  '/quizzes': '/quizz',
};

function upsertMeta(attribute, value, content) {
  if (!content) return;
  let node = document.head.querySelector(`meta[${attribute}="${value}"]`);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute(attribute, value);
    document.head.appendChild(node);
  }
  node.setAttribute('content', content);
}

function absoluteAsset(path) {
  if (!path) return DEFAULT_IMAGE;
  // Les miniatures officielles hébergées chez les studios (YouTube, Focus
  // Features, Variety…) sont des URLs absolues : on les laisse passer telles
  // quelles, seul le préfixe du site s'applique aux fichiers locaux.
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}/${String(path).replace(/^\//, '')}`;
}

export default function SEO() {
  const { pathname } = useLocation();
  const { lang } = useLanguage();
  const key = routeAliases[pathname] || pathname;
  const meta = pageMeta[key] || {
    title: `${SITE_NAME} — Gaming et pop culture`,
    description: 'Let’s Play, média gaming et pop culture en Algérie : actualités, tests, dossiers et événements.',
    type: 'website',
  };
  const canonical = `${SITE_URL}${pathname === '/' ? '/' : pathname}`;
  const image = absoluteAsset(meta.image);

  useEffect(() => {
    document.title = meta.title;
    document.documentElement.lang = lang || 'fr';
    upsertMeta('name', 'description', meta.description);
    upsertMeta('name', 'author', SITE_NAME);
    upsertMeta('name', 'robots', 'index, follow, max-image-preview:large');
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:type', meta.type || 'website');
    upsertMeta('property', 'og:title', meta.title);
    upsertMeta('property', 'og:description', meta.description);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:image:alt', meta.title);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', meta.title);
    upsertMeta('name', 'twitter:description', meta.description);
    upsertMeta('name', 'twitter:image', image);

    let canonicalLink = document.head.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonical;

    let structured = document.head.querySelector('#seo-jsonld');
    if (!structured) {
      structured = document.createElement('script');
      structured.id = 'seo-jsonld';
      structured.type = 'application/ld+json';
      document.head.appendChild(structured);
    }
    const graph = [
      { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: SITE_NAME, url: `${SITE_URL}/`, logo: absoluteAsset('lets-play-logo.png') },
      { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: SITE_NAME, url: `${SITE_URL}/`, publisher: { '@id': `${SITE_URL}/#organization` }, inLanguage: lang || 'fr' },
    ];
    if (meta.type === 'article') {
      graph.push({ '@type': 'NewsArticle', headline: meta.title.replace(' — Let’s Play', ''), description: meta.description, image: [image], datePublished: meta.published, dateModified: meta.published, author: { '@type': 'Organization', name: SITE_NAME }, publisher: { '@id': `${SITE_URL}/#organization` }, mainEntityOfPage: canonical, articleSection: meta.section });
    }
    structured.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
  }, [canonical, image, lang, meta]);

  return null;
}
