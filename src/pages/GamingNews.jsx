import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { baseUrl as base } from '../data';
import { useLanguage } from '../i18n/LanguageContext';
import { Arrow } from '../components/ReleasesCalendar';
import { youTubeThumbUrl } from '../lib/videoThumbnails';
// Les actus du jour générées par le robot ouvrent la liste (les plus récentes
// d'abord) ; les articles manuels de la rédaction suivent dans l'ordre.
import { autoNewsListing } from '../lib/autoNews';
import { getArticleViews, normalizeArticleId, formatViews } from '../lib/articleViews';
import { getArticleSentiment, sentimentMeta } from '../lib/articleSentiment';

// Visuels des cartes : les URLs absolues (images officielles hotlinkées) passent
// telles quelles, les fichiers locaux du site prennent le préfixe du baseUrl ;
// une carte SVG de repli (`fallbackImage`) prend le relais si l'image distante
// ne répond plus — même mécanique que la page cinéma.
const imageUrl = (image) => (/^https?:\/\//i.test(image) ? image : `${base}${image}`);

// Copy is module-scoped so the article list remains referentially stable across
// renders; recreating this object in the component retriggered its views effect
// indefinitely after each state update.
const FEATURED_COPY = {
  en: {
    cards: [
      ['STARCRAFT · FPS', '12.09.2026 · BLIZZARD', 'STARCRAFT GOES FPS.', 'Blizzard confirms an open-world shooter set at ground level in the StarCraft universe. It is not coming before 2030.'],
      ['DIABLO V · BLIZZCON', '12.09.2026 · BLIZZARD', 'DIABLO V IS COMING.', 'The next chapter arrives in spring 2029, in a Sanctuary left in ruins and without its heroes.'],
      ['DIABLO IV · SWITCH 2', '12.09.2026 · BLIZZARD', 'SANCTUARY GOES PORTABLE.', 'The Age of Hatred Collection brings the base game and its two major expansions to Switch 2 on September 15, 2026.'],
      ['DIABLO · NETFLIX', '12.09.2026 · BLIZZARD', 'DIABLO EXPANDS ITS WORLD.', 'An animated Diablo series is in development for Netflix, with more Blizzard adaptations under consideration.'],
    ], read: 'READ THE STORY', label: 'FEATURED NEWS', updated: 'Updated 04.10.2026', section: 'FEATURED NEWS', today: 'FEATURED NEWS'
  },
  fr: {
    cards: [
      ['STARCRAFT · FPS', '12.09.2026 · BLIZZARD', 'STARCRAFT PASSE AU FPS.', 'Blizzard officialise un shooter en monde ouvert situé au ras du champ de bataille. Le projet ne sortira pas avant 2030.'],
      ['DIABLO V · BLIZZCON', '12.09.2026 · BLIZZARD', 'DIABLO V SE PRÉPARE.', 'Le prochain épisode arrivera au printemps 2029 dans un Sanctuaire en ruines, privé de ses héros.'],
      ['DIABLO IV · SWITCH 2', '12.09.2026 · BLIZZARD', 'LE SANCTUAIRE ARRIVE SUR SWITCH 2.', 'La collection Age of Hatred réunira le jeu de base et ses deux extensions majeures dès le 15 septembre 2026.'],
      ['DIABLO · NETFLIX', '12.09.2026 · BLIZZARD', 'DIABLO ÉTEND SON UNIVERS.', 'Une série animée Diablo est en préparation pour Netflix. Blizzard étudie aussi d’autres adaptations.'],
    ], read: 'LIRE L’ARTICLE', label: 'ACTUS À LA UNE', updated: 'Mis à jour le 04.10.2026', section: 'ACTUS À LA UNE', today: 'ACTUS À LA UNE'
  },
  ar: {
    cards: [
      ['STARCRAFT · تصويب', '12.09.2026 · بليزارد', 'STARCRAFT تتحول إلى تصويب.', 'تعلن بليزارد عن لعبة تصويب في عالم مفتوح داخل عالم StarCraft، ولن تصدر قبل عام 2030.'],
      ['DIABLO V · بليزكون', '12.09.2026 · بليزارد', 'DIABLO V قادمة.', 'سيصل الفصل التالي في ربيع 2029 داخل ملاذ مدمّر اختفى منه الأبطال.'],
      ['DIABLO IV · SWITCH 2', '12.09.2026 · بليزارد', 'الملاذ يصل إلى Switch 2.', 'تضم مجموعة Age of Hatred اللعبة الأساسية وتوسعتين رئيسيتين ابتداءً من 15 سبتمبر 2026.'],
      ['DIABLO · NETFLIX', '12.09.2026 · بليزارد', 'DIABLO توسّع عالمها.', 'يجري إعداد مسلسل رسوم متحركة عن Diablo لصالح Netflix، مع دراسة تحويل عوالم أخرى.'],
    ], read: 'اقرأ المقال', label: 'أبرز الأخبار', updated: 'آخر تحديث 04.10.2026', section: 'أبرز الأخبار', today: 'أبرز الأخبار'
  }
};

// La section calendrier + compte à rebours (01) a été déplacée sur la page
// d'accueil, juste après le hero — la frise complète vit sur /calendrier.
export default function News(){
  const { t, lang } = useLanguage();
  const featured = FEATURED_COPY[lang] || FEATURED_COPY.fr;
  const million = t.news.million || t.news.featured;
  const [showAll, setShowAll] = useState(false);
  const [viewsMap, setViewsMap] = useState({});

  // Les actus du week-end des 03-04.10.2026 (rédigées à la main au gabarit du
  // robot) ouvrent la liste : RuneScape 4 annoncé au RuneFest, les concerts des
  // 40 ans de Castlevania et la fronde contre le code généré par IA dans
  // l'émulation ; suivent les actus du 28-29.09.2026, puis celles du robot et
  // les articles manuels de la rédaction dans l'ordre.
  const articles = useMemo(() => [
    { to: '/news/runescape-4-runefest-annonce', image: 'runescape-4-teaser.jpg', fallbackImage: 'runescape-4-news.svg', alt: 'RuneScape 4 — un magicien se protège les yeux de la lumière, capture du teaser d’annonce dévoilé au RuneFest 2026 (Jagex)', badge: 'JAGEX · MMORPG', kicker: '03.10.2026 · ACTUGAMING', title: 'RUNESCAPE 4 ÉCRIT SON SIXIÈME ÂGE.', excerpt: 'Jagex a refermé son RuneFest par l’annonce d’un quatrième MMORPG, provisoirement baptisé RuneScape 4, développé sous Unreal Engine. L’aventure se déroulera au Sixième Âge et débutera à Ashenfall, sans date de sortie. Toute la franchise repart en parallèle : Reignited le 2 décembre, Blood Crystal Saga en 2027 et un raid inédit pour Old School RuneScape.', read: 'LIRE L’ARTICLE', sentiment: 'positive' },
    { to: '/news/castlevania-40-ans-concerts-symphoniques', image: 'https://cdn.gamekult.com/optim/images/news/30/3050872268/pour-les-40-ans-de-castlevania-et-la-sortie-de-belmont-s-curse-des-concerts-symphoniques-vont-avoir-lieu-65c89bda__930_300__0-112-1887-720.png', fallbackImage: 'castlevania-40-ans-news.svg', alt: 'Castlevania 40th Anniversary — An Orchestral Concert, visuel de l’annonce officielle Konami', badge: 'KONAMI · CONCERTS', kicker: '04.10.2026 · GAMEKULT', title: 'CASTLEVANIA FÊTE SES 40 ANS SUR SCÈNE.', excerpt: 'Trois concerts symphoniques à Tokyo (13 mars), Londres (14 mars) et Los Angeles (26 mars), avec un orchestre de vingt-cinq musiciens et des arrangements signés Adam Hoskins. Les musiques de Belmont’s Curse, attendu le 15 octobre sur PC et consoles, y seront jouées en live pour la première fois.', read: 'LIRE L’ARTICLE', sentiment: 'positive' },
    { to: '/news/vibe-coding-emulation-decompilation', image: 'https://cdn.gamekult.com/optim/images/news/30/3050872249/du-code-bacle-par-ia-ralentit-des-projets-d-emulation-et-de-decompilation-les-developpeurs-poussent-un-coup-de-gueule-7c5509e8__930_300__0-41-739-279.jpg', fallbackImage: 'vibe-coding-emulation-news.svg', alt: 'Émulation et décompilation — illustration de l’article Gamekult consacré au code généré par IA', badge: 'PRÉSERVATION · IA', kicker: '03.10.2026 · GAMEKULT', title: 'LE VIBE CODING POLLUE LA PRÉSERVATION.', excerpt: 'Les mainteneurs de RPCS3 menacent de bannir les contributions générées en masse par IA sans relecture. Le portage PC de Mario Kart Wii a été critiqué pour la même raison, quand les projets Donkey Kong 64 et Super Mario Galaxy revendiquent un travail « 100 % humain ».', read: 'LIRE L’ARTICLE', sentiment: 'mixed' },
    { to: '/news/physint-budget-400-millions-xbox', image: 'kojima_mindplayer.png', alt: 'Hideo Kojima pose les mains jointes sous le logo lumineux de Xbox — visuel éditorial Let’s Play', badge: 'PHYSINT · XBOX', kicker: '29.09.2026 · KOJIMA PRODUCTIONS', title: 'PHYSINT À 400 M$ ? XBOX A SIGNÉ POUR MOINS.', excerpt: 'Un chiffre vertigineux de 400 millions de dollars a circulé ce week-end autour du jeu d’action-espionnage de Hideo Kojima. Christopher Dring parle d’un simple bruit de couloir, et Jason Schreier assure que Microsoft a signé pour un montant « nettement inférieur ».', read: 'LIRE L’ARTICLE', sentiment: 'mixed' },
    { to: '/news/god-of-war-laufey-precommandes-arc-serpent', image: 'https://blog.fr.playstation.com/tachyon/sites/10/2026/09/5bd30eac480284e480a9ba68e9f06472584219f4.jpg?resize=1088%2C612&crop_strategy=smart', fallbackImage: 'god-of-war-laufey-arc-serpent-news.svg', alt: 'God of War Laufey — artwork officiel de Faye face à Begtse, le cube Phranque à ses côtés (Santa Monica Studio)', badge: 'GOD OF WAR LAUFEY · PRÉCOMMANDES', kicker: '29.09.2026 · SANTA MONICA STUDIO', title: 'FAYE DÉGAINE L’ARC-SERPENT.', excerpt: 'À l’ouverture des précommandes, Santa Monica Studio détaille la deuxième arme de Faye et la grille des éditions : 79,99 € en Standard, 89,99 € en numérique Deluxe, une mise à niveau à 10 € et aucun collector. Sortie le 16 février 2027 sur PS5.', read: 'LIRE L’ARTICLE', sentiment: 'positive' },
    { to: '/news/minecraft-world-hotel-chessington-2027', image: 'screenshots/minecraft-world-hotel/01.jpg', fallbackImage: 'minecraft-world-hotel-chessington-news.svg', alt: 'Minecraft World Hotel — la chambre familiale aux lits superposés, concept art officiel Merlin Entertainments / Mojang Studios', badge: 'MINECRAFT WORLD · CHESSINGTON', kicker: '29.09.2026 · MERLIN ENTERTAINMENTS', title: 'MINECRAFT DORT À CHESSINGTON EN 2027.', excerpt: 'Le Minecraft Live du 26 septembre a livré la deuxième annonce du parc : le premier hôtel officiel Minecraft au monde, près de 70 chambres sur quatre étages, ouvrira en 2027 au land Minecraft World — en même temps que le rollercoaster Escape the Nether.', read: 'LIRE L’ARTICLE', sentiment: 'positive' },
    { to: '/news/minecraft-the-sift-nouvelle-dimension', image: 'https://www.minecraft.net/content/dam/minecraftnet/games/spicewood/screenshots/MCL_Dungeons2_sift_1280x720.jpg', fallbackImage: 'minecraft-the-sift-news.svg', alt: 'Un portail ouvert vers le Sift, la nouvelle dimension de Minecraft, dans Minecraft Dungeons II — capture officielle Mojang Studios', badge: 'MINECRAFT · THE SIFT', kicker: '28.09.2026 · MOJANG', title: 'MINECRAFT OUVRE SA 4E DIMENSION.', excerpt: 'Lors du Minecraft Live du 26 septembre, Mojang a dévoilé le Sift, quatrième dimension du jeu — la première depuis quinze ans. Elle débute dans Minecraft Dungeons II le 29 septembre, avant les éditions Java et Bedrock en 2027.', read: 'LIRE L’ARTICLE', sentiment: 'positive' },
    { to: '/news/the-witcher-3-remastered-sortie-29-septembre', image: 'https://public.cdn.cdpr.app/common/news/974db3ceaf0e6035a922cbbd7c7770b0_q90_1280x720.jpeg', fallbackImage: 'witcher-3-remastered-news.svg', alt: 'Geralt de Riv sur le visuel officiel de The Witcher 3: Wild Hunt – Remastered — CD PROJEKT RED', badge: 'THE WITCHER 3 · REMASTERED', kicker: '28.09.2026 · CD PROJEKT RED', title: 'THE WITCHER 3 REVIENT REMASTERISÉ.', excerpt: 'Déverrouillage mondial mardi à 10 h UTC (11 h à Alger) sur PC, PS5, Xbox Series X|S et Switch 2. Gratuit pour les propriétaires du jeu sur PC et consoles actuelles, environ 45 Go, sans préchargement.', read: 'LIRE L’ARTICLE', sentiment: 'positive' },
    { to: '/news/xbox-nadella-restructuration', image: 'https://news.microsoft.com/source/wp-content/uploads/2024/10/MS-Exec-Nadella-Satya.jpg', fallbackImage: 'xbox-nadella-news.svg', alt: 'Portrait officiel de Satya Nadella, PDG de Microsoft', badge: 'XBOX · MICROSOFT', kicker: '28.09.2026 · VGC', title: 'NADELLA DÉFEND LA CURE XBOX.', excerpt: 'Le PDG de Microsoft juge « formidable » la rationalisation menée par Asha Sharma et promet un retour à la croissance de Xbox, alors que près de 3 200 postes sont supprimés et que Halo passe chez Activision.', read: 'LIRE L’ARTICLE', sentiment: 'mixed' },
    { to: '/news/halo-activision', image: 'masterchief-activision.png', alt: 'Master Chief s’avance dans une installation futuriste devant le logo Activision — visuel éditorial Let’s Play', badge: 'HALO · ACTIVISION', kicker: '26.09.2026 · XBOX', title: 'HALO PASSE CHEZ ACTIVISION.', excerpt: 'Le 22 septembre, Xbox a confirmé que le prochain jeu Halo sera développé par Activision avec une équipe entièrement nouvelle. Rare (Sea of Thieves) et World’s Edge (Age of Empires) rejoignent aussi le giron de l’éditeur de Call of Duty.', read: 'LIRE L’ARTICLE', sentiment: 'mixed' },
    ...autoNewsListing,
    { to: '/news/ea-sports-fc-27-carriere-dynamique', image: 'ea-sports-fc-27-carriere-pitch-notes.jpg', alt: 'EA Sports FC 27 — fiche joueur du mode Carrière avec sa note globale et sa valeur marchande xTV (visuel officiel EA Sports FC)', badge: 'EA SPORTS FC 27 · CARRIÈRE', kicker: '22.09.2026 · ELECTRONIC ARTS', title: 'EA SPORTS FC 27 FAIT VIVRE SA CARRIÈRE.', excerpt: 'Valeur marchande recalculée chaque semaine avec TransferRoom, note globale dynamique, scénarios créés par la communauté et crises de vestiaire : la refonte du mode Carrière est le vrai chantier de l’édition 2027.', read: 'LIRE L’ARTICLE', sentiment: 'positive' },
    { to: '/news/netmarble-tgs-2026', image: 'tokyo-game-show-2026-news.jpg', alt: 'Tokyo Game Show 2026 — visuel officiel de l’événement', badge: 'TGS 2026 · NETMARBLE', kicker: '21.09.2026 · NETMARBLE', title: 'NETMARBLE QUITTE LE TGS AVEC TROIS JEUX.', excerpt: 'Shangri-La Frontier: The Seven Colossi, Solo Leveling: KARMA et Pearl in Blue ont été montrés sous forme de démos. Les dates de sortie restent ouvertes.', read: 'LIRE L’ARTICLE', sentiment: 'positive' },
    { to: '/news/control-resonant-24-septembre', image: 'physint-news.jpg', alt: 'Jeu d’action paranormal — visuel éditorial Let’s Play', badge: 'CONTROL RESONANT · SORTIE', kicker: '21.09.2026 · REMEDY', title: 'CONTROL RESONANT ARRIVE À J-3.', excerpt: 'Le lancement mondial reste fixé au 24 septembre sur PS5, Xbox Series et PC. La version Mac suivra plus tard en 2026.', read: 'LIRE L’ARTICLE', sentiment: 'positive' },
    { to: '/news/sorties-24-septembre', image: 'monster-hunter-wilds-switch2.jpg', alt: 'Sélection de jeux vidéo — visuel éditorial Let’s Play', badge: 'SORTIES · 24 SEPTEMBRE', kicker: '21.09.2026 · CALENDRIER', title: 'LE 24 SEPTEMBRE VA FAIRE DU BRUIT.', excerpt: 'CONTROL Resonant et Silent Hill: Townfall partagent la même date de sortie. Deux visions du paranormal, un seul jeudi à surveiller.', read: 'LIRE L’ARTICLE', sentiment: 'positive' },
    { to: '/news/sony-licence-jeux-numeriques', image: 'playstation-store-ownership-news.jpg', alt: 'Interface officielle du PlayStation Store', badge: 'PLAYSTATION · JUSTICE', kicker: '20.09.2026 · SONY', title: 'VOUS ACHETEZ UN JEU OU UNE LICENCE ?', excerpt: 'Dans une action collective en Californie, Sony soutient qu’un achat numérique sur le PlayStation Store accorde une licence personnelle, et non la propriété du jeu.', read: 'LIRE L’ARTICLE', sentiment: 'negative' },
    { to: '/news/tokyo-game-show-2026-annulation', image: 'tokyo-game-show-2026-news.jpg', alt: 'Visuel officiel Tokyo Game Show 2026', badge: 'TOKYO GAME SHOW · ANNULATION', kicker: '20.09.2026 · CESA', title: 'LE TGS 2026 PERD SON DERNIER JOUR.', excerpt: 'La journée du 21 septembre est annulée à cause de l’approche du typhon n°25. Le dimanche 20 reste maintenu, et une partie du programme pourrait passer en ligne.', read: 'LIRE L’ARTICLE', sentiment: 'negative' },
    { to: '/news/eshop-switch-2-20-septembre', image: 'fire-emblem-fortunes-weave-news.jpg', alt: 'Fire Emblem: Fortune’s Weave — visuel officiel Nintendo', badge: 'ESHOP SWITCH 2 · CLASSEMENT', kicker: '20.09.2026 · NINTENDO', title: 'FIRE EMBLEM GARDE LA PREMIÈRE PLACE.', excerpt: 'Fortune’s Weave reste numéro un sur l’eShop Switch 2, devant Diablo 4 et les deux éditions de LEGO Batman: Legacy of the Dark Knight.', read: 'LIRE L’ARTICLE', sentiment: 'positive' },
    { to: '/news/kingdom-hearts-4-coco', image: 'kingdom-hearts-4-coco-news.jpg', alt: 'Kingdom Hearts 4 — Sora et sa Keyblade-guitare dans le monde de Coco, capture du trailer officiel D23 2026', badge: 'KINGDOM HEARTS 4 · MONDES', kicker: '15.09.2026 · SQUARE ENIX', title: 'LE MONDE DE COCO N’A RIEN D’UN HASARD.', excerpt: 'Sora est apparu au milieu d’une séquence Disney consacrée à Coco. Derrière la surprise, un monde bâti sur la mémoire et la seconde mort — soit le cœur même de la saga.', read: 'LIRE L’ARTICLE', sentiment: 'positive' },
    { to: '/news/wolverine-exclu-ps5', image: 'wolverine-countdown.jpg', alt: 'Marvel’s Wolverine — Logan griffes sorties, key art officiel Insomniac Games', badge: 'WOLVERINE · EXCLU PS5', kicker: '15.09.2026 · SONY', title: 'WOLVERINE GARDE SES GRIFFES POUR LA PS5.', excerpt: 'Deux heures manette en main chez Insomniac : récit original sans X-Men, combats bestiaux et caméra de cinéma. L’exclu la plus enviée de la rentrée sort aujourd’hui.', read: 'LIRE L’ARTICLE', sentiment: 'positive' },
    { to: '/news/fire-emblem-fortunes-weave', image: 'fire-emblem-fortunes-weave-news.jpg', alt: 'Fire Emblem: Fortune’s Weave — visuel officiel Nintendo', badge: 'FIRE EMBLEM · SWITCH 2', kicker: '15.09.2026 · NINTENDO', title: 'FORTUNE’S WEAVE ENTRE EN SCÈNE.', excerpt: 'À deux jours de sa sortie, le nouvel épisode rappelle ses quatre protagonistes, ses scénarios croisés et son système de progression dans le hub.', read: 'LIRE L’ARTICLE', sentiment: 'positive' },
    { to: '/news/rayman-legends-retold', image: 'rayman-legends-retold-news.jpg', alt: 'Rayman Legends Retold — miniature officielle du trailer Ubisoft', badge: 'RAYMAN LEGENDS RETOLD · REPORT', kicker: '15.09.2026 · UBISOFT', title: 'RAYMAN RETROUVE SON RENDEZ-VOUS.', excerpt: 'Le remaster est repoussé au 3 décembre 2026 sur PS5, Xbox Series, Switch 2 et PC. Une vidéo de gameplay est attendue le 22 septembre.', read: 'LIRE L’ARTICLE', sentiment: 'negative' },
    { to: '/news/cyberpunk-2077-battlenet', image: 'cyberpunk-2077-battlenet-news.webp', alt: 'Cyberpunk 2077 Ultimate Edition — visuel officiel CD PROJEKT RED', badge: 'CYBERPUNK 2077 · BATTLE.NET', kicker: '14.09.2026 · CD PROJEKT RED', title: 'CYBERPUNK 2077 CHANGE DE QUARTIER.', excerpt: 'L’Ultimate Edition rejoindra Battle.net plus tard cette année, dans le prolongement du partenariat entre CD Projekt RED et Blizzard.', read: 'LIRE L’ARTICLE', sentiment: 'positive' },
    { to: '/news/persona-6-switch-2', image: 'persona-6-news.jpg', alt: 'Visuel officiel de l’univers Persona — site Atlus', badge: 'PERSONA 6 · SWITCH 2', kicker: '14.09.2026 · SEGA', title: 'PERSONA 6 ARRIVE EN PHYSIQUE.', excerpt: 'Le prochain épisode de Persona aura aussi une édition physique sur Switch 2. La date reste inconnue, mais la console rejoint les plateformes confirmées.', read: 'LIRE L’ARTICLE', sentiment: 'positive' },
    { to: '/news/last-of-us-ii-mod', image: 'last-of-us-mod-news.jpg', alt: 'The Last of Us Part II Remastered — visuel officiel PlayStation', badge: 'THE LAST OF US II · PC', kicker: '14.09.2026 · PLAYSTATION', title: 'LE MOD MULTIJOUEUR NE SORTIRA PAS.', excerpt: 'Sony a demandé l’arrêt d’un projet de fans qui voulait ajouter une composante multijoueur à la version PC de The Last of Us Part II.', read: 'LIRE L’ARTICLE', sentiment: 'negative' },
    ...featured.cards.map(([badge, kicker, title, excerpt], index) => ({ to: ['/news/starcraft-fps', '/news/diablo-v', '/news/diablo-switch-2', '/news/diablo-netflix'][index], image: ['starcraft-fps-news.jpeg', 'diablo-v-news.png', 'diablo-switch2-news.jpg', 'diablo-netflix-news.webp'][index], alt: title, badge, kicker, title, excerpt, read: featured.read, sentiment: 'positive' })),
    { to: '/news/monster-hunter-wilds', image: 'monster-hunter-wilds-switch2.jpg', alt: 'Monster Hunter Wilds sur Nintendo Switch 2', badge: 'MONSTER HUNTER · SWITCH 2', kicker: '09.09.2026 · CAPCOM', title: 'WILDS ARRIVE SUR SWITCH 2.', excerpt: 'Monster Hunter Wilds dévoile ses premières images sur Switch 2 et fixe sa sortie au 4 décembre 2026.', read: 'LIRE L’ARTICLE', sentiment: 'positive' },
    { to: '/news/zelda-40th', image: 'zelda-40th-switch2.jpg', alt: 'The Legend of Zelda Ocarina of Time sur Nintendo Switch 2', badge: 'ZELDA · 40 ANS', kicker: '08.09.2026 · NINTENDO', title: 'ZELDA FÊTE SES 40 ANS.', excerpt: 'Nintendo dévoile une Switch 2, une manette Pro et deux amiibo pour accompagner le retour d’Ocarina of Time.', read: 'LIRE L’ARTICLE', sentiment: 'positive' },
    { to: '/news/physint', image: 'physint-news.jpg', alt: t.news.featured.alt, badge: t.news.featured.badge, kicker: t.news.featured.kicker, title: t.news.featured.title, excerpt: t.news.featured.excerpt, read: t.news.featured.read, sentiment: 'mixed' },
    { to: '/news/metroid-ravenous', image: 'metroid-ravenous-news.png', alt: t.news.metroid.coverAlt, badge: t.news.metroid.eyebrow, kicker: `${t.news.metroid.date} · ${t.news.platforms}`, title: `${t.news.metroid.title} ${t.news.metroid.titleAccent}`, excerpt: t.news.metroid.dek, read: t.news.metroid.back, sentiment: 'positive' },
    { to: '/news/wardogs', image: 'wardogs-news.jpg', alt: t.news.wardogs.coverAlt, badge: t.news.wardogs.eyebrow, kicker: `${t.news.wardogs.date} · ${t.news.consolePlatforms}`, title: `${t.news.wardogs.title} ${t.news.wardogs.titleAccent}`, excerpt: t.news.wardogs.dek, read: t.news.wardogs.back, sentiment: 'positive' },
    { to: '/news/zelda-ocarina', image: 'zelda-ocarina-news.jpg', alt: t.news.zelda.coverAlt, badge: t.news.zelda.eyebrow, kicker: `${t.news.zelda.date} · ${t.news.platforms}`, title: `${t.news.zelda.title} ${t.news.zelda.titleAccent}`, excerpt: t.news.zelda.dek, read: t.news.zelda.back, sentiment: 'positive' },
    { to: '/news/onimusha-million', image: 'onimusha-million-news.jpg', alt: million.coverAlt || million.alt, badge: million.eyebrow || million.badge, kicker: `${million.date || million.kicker} · CAPCOM`, title: `${million.title} ${million.titleAccent || ''}`, excerpt: million.dek || million.excerpt, read: million.back || million.read, sentiment: 'positive' },
  ], [featured, million, t.news.featured, t.news.metroid, t.news.wardogs, t.news.zelda]);

  // Vues globales — récupérées une fois par liste affichée (Supabase ou fallback déterministe).
  useEffect(() => {
    const ids = articles.map((a) => normalizeArticleId(a.to));
    let cancelled = false;
    getArticleViews(ids).then((map) => {
      if (!cancelled) setViewsMap(map);
    });
    return () => { cancelled = true; };
  }, [articles]);

  // La page reste lisible par défaut : 12 actus maximum affichées, le bouton
  // « Voir toutes les actus » déplie le reste de la liste.
  const visibleArticles = showAll ? articles : articles.slice(0, 12);
  // Le dernier article paru ouvre la grille en grand sur 2 colonnes (actu à la
  // une) : les autres actus restent visibles à côté d'elle dès le premier écran.
  const [topStory, ...gridArticles] = visibleArticles;
  const allNewsLabel = lang === 'fr' ? 'Voir toutes les actus' : lang === 'ar' ? 'عرض كل الأخبار' : 'See all news';

  const renderStoryImage = (story, loading = 'lazy') => (
    <img
      src={imageUrl(story.image)}
      alt={story.alt}
      loading={loading}
      onError={(event) => {
        if (story.fallbackImage && event.currentTarget.dataset.fallback !== 'true') {
          event.currentTarget.dataset.fallback = 'true';
          event.currentTarget.src = imageUrl(story.fallbackImage);
        }
      }}
    />
  );

  const renderBadges = (article) => {
    const sentimentId = getArticleSentiment(article);
    const meta = sentimentMeta(sentimentId);
    const views = viewsMap[normalizeArticleId(article.to)] ?? null;
    return (
      <>
        <span className="news-feature-badge">{article.badge}</span>
        <span className="news-feature-arrow">↗</span>
        <span className={`news-sentiment ${meta.color}`} title={meta.label} aria-label={meta.label}>
          {meta.emoji}
        </span>
        {views != null && (
          <span className="news-views" aria-label={`${views} vues`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3.2" /></svg>
            {formatViews(views)}
          </span>
        )}
      </>
    );
  };

  // Libellé du lien « retour hub » selon la langue.
  const backHub = lang === 'fr' ? 'Retour au hub' : lang === 'ar' ? 'العودة' : 'Back to hub';

  return (
    <>
      <div className="news-hub-back wrap">
        <Link className="arrow-link" to="/news">{backHub} <Arrow /></Link>
      </div>
      <section className="news-carousel-section wrap">
        <div className="section-label"><span>{featured.section}</span><span>{featured.updated}</span></div>
        {/* Chaque carte est enveloppée dans une cellule `.news-grid-cell` : la
            carte porte le `clip-path` (coin biseauté) et la cellule porte
            l'ombre (`filter: drop-shadow`). Posée sur la carte, l'ombre serait
            découpée avec elle — clip-path s'applique après filter/box-shadow. */}
        <div className="news-carousel is-grid">
          {topStory && <div className="news-grid-cell news-grid-cell--today"><Link className="daily-news-card news-today" to={topStory.to}>
            <div className="daily-news-image">{renderStoryImage(topStory, 'eager')}{renderBadges(topStory)}</div>
            <div className="daily-news-copy">
              <p className="eyebrow"><span className="live-dot" /> {featured.today}</p>
              <span className="news-kicker">{topStory.kicker}</span>
              <h2>{topStory.title}</h2>
              <p>{topStory.excerpt}</p>
              <span className="read-link">{topStory.read} <Arrow /></span>
            </div>
          </Link></div>}
          {gridArticles.map((article) => <div className="news-grid-cell" key={article.to}><Link className="news-carousel-card" to={article.to}>
            <div className="news-carousel-image">{renderStoryImage(article)}{renderBadges(article)}</div>
            <div className="news-carousel-copy"><span className="news-kicker">{article.kicker}</span><h2>{article.title}</h2><p>{article.excerpt}</p><span className="read-link">{article.read} <Arrow/></span></div>
          </Link></div>)}
        </div>
        {articles.length > 12 && (
          <div className="news-all-actions">
            <button type="button" className="button button-yellow" onClick={() => setShowAll((current) => !current)}>
              {showAll ? (lang === 'fr' ? 'Réduire les actus' : lang === 'ar' ? 'عرض أقل' : 'Show fewer news') : allNewsLabel} <Arrow />
            </button>
          </div>
        )}
      </section>
      <section className="cta wrap"><div><p className="eyebrow"><span className="live-dot" /> {t.news.ctaEyebrow}</p><h2>{t.news.ctaH2a} <em>{t.news.ctaH2b}</em></h2></div><Link className="button button-yellow" to="/reviews">{t.news.ctaBtn} <Arrow/></Link></section>
    </>
  );
}
