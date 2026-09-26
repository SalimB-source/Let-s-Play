import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { baseUrl as base } from '../data';
import Comments from '../components/Comments';
import ArticleEngagement from '../components/ArticleEngagement';
import { youTubeEmbedUrl } from '../lib/videoPlayback';
import NotFound from './NotFound';
// Les actus du jour générées par le robot (src/news/autoIndex.js, vide au
// départ) cohabitent avec les articles manuels ci-dessous : même gabarit.
import { autoStories } from '../news/autoIndex';
import { incrementArticleView, getArticleViews, normalizeArticleId, formatViews } from '../lib/articleViews';
import { inferSentimentForStory, sentimentMeta } from '../lib/articleSentiment';
import SpoilerAlert from '../components/SpoilerAlert';

const stories = {
  // Actu à la une du 26.09.2026 — aussi mise en avant sur l'accueil.
  'halo-activision': {
    date: '26.09.2026', category: 'XBOX · ACTIVISION', image: 'halo-activision-news.jpg', imageAlt: 'Un super-soldat en armure verte s’avance vers un portail illuminé où brille le logo Activision — visuel éditorial Let’s Play', cover: 'ACTIVISION',
    title: 'HALO PASSE CHEZ', accent: 'ACTIVISION.', dek: 'Le 22 septembre, Xbox a confirmé que le prochain jeu Halo sera développé par Activision, avec une équipe entièrement nouvelle. Rare (Sea of Thieves) et World’s Edge (Age of Empires) rejoignent aussi le giron de l’éditeur de Call of Duty.',
    lead: 'La note interne « Continuing Our Reset », envoyée par Matt Booty aux équipes Xbox et publiée sur Xbox Wire, a mis fin aux rumeurs : c’est Activision qui développera le prochain jeu Halo. Une équipe dédiée, distincte des studios Call of Duty, sera montée pour l’occasion — tandis qu’Halo Studios est frappé par 268 licenciements.',
    intro: 'Depuis la fin de l’été, les rumeurs s’enchaînaient : Sledgehammer Games aurait présenté un projet de Halo multijoueur à Microsoft, et Xbox explorait ouvertement une proposition pour qu’Activision prête main-forte à la franchise. La restructuration du 22 septembre 2026 transforme la rumeur en feuille de route.',
    h2: 'LES FAITS',
    p1: 'Dans sa note, Matt Booty est sans détour : Activision étend son périmètre à World’s Edge (Age of Empires) et à Rare (Sea of Thieves), et prend en charge le développement du prochain titre Halo « avec une équipe créée spécifiquement pour le projet, séparée du développement et des plans en cours de Call of Duty ». Treyarch, Infinity Ward et Sledgehammer ne seront donc pas officiellement aux commandes du prochain Halo. Halo Studios n’est pas dissous pour autant : une petite équipe reste chargée de la communauté et des jeux déjà sur le marché, dont Halo Infinite et Halo: Campaign Evolved.',
    quote: 'Notre objectif pour Halo est clair : créer le plus grand jeu Halo de tous les temps, digne de son univers et de son héritage, tout en restant fidèle à ce qui a fait aimer la série aux joueurs.', quoteBy: 'ROB KOSTICH, PRÉSIDENT D’ACTIVISION',
    h2b: 'LE CONTEXTE',
    p2: 'Le même jour, Xbox a confirmé la suppression de 268 postes à travers Halo Studios, d’autres studios first-party, ainsi que la couche de management et les fonctions centrales de Xbox Game Studios. Playground et Turn 10 fusionnent pour porter ensemble Forza et Fable, l’avenir d’Arkane reste en discussion jusqu’à la fin de l’année, et deux accords concernant Ninja Theory sont tombés à l’eau.',
    p3: 'Pour les joueurs, la question n’est plus « qui fait Halo », mais « quel Halo ». Aucun titre ni fenêtre de sortie n’ont été communiqués, et Microsoft n’a pas confirmé les rumeurs de redémarrage de la trame narrative. Une réunion générale Xbox est prévue le 6 octobre 2026 : elle dira si le Major et sa nouvelle maison ont déjà un calendrier.',
    p4: 'Reste le symbole : vingt ans après la rivalité Halo / Call of Duty, Master Chief entre dans la maison de l’ancien concurrent. Microsoft justifie le mouvement par le regroupement d’équipes capables de partager compétences et moyens. Si l’ambition affichée est de revitaliser la franchise, elle se paie d’abord en postes — et c’est ce double visage, promesse d’un grand Halo et restructuration douloureuse, qui marquera cette date dans l’histoire de Xbox.',
    take: 'À RETENIR', takeText: 'Activision développera le prochain Halo avec une équipe dédiée, Rare et World’s Edge rejoignent son périmètre, et 268 postes sont supprimés — sans titre ni date annoncés.',
    source: 'D’après Xbox Wire (note interne « Continuing Our Reset » de Matt Booty, 22.09.2026) et IGN France, article consulté le 26.09.2026.', sourceUrl: 'https://fr.ign.com/halo-campaign-evolved/92471/cest-officiel-microsoft-confie-halo-a-activision-le-developpeur-de-call-of-duty-dans-le-cadre-deu-pl', sourceDetail: 'Lire l’article source',
    credit: 'Visuel : illustration éditoriale Let’s Play (image fournie à la rédaction).',
    sentiment: 'mixed'
  },
  // Actu cinéma & séries du 26.09.2026 — la reprise hebdomadaire de
  // Steel Ball Run (partie 7 de JoJo) sur Netflix, ouverte par l’épisode 2.
  // IMPORTANT ANTI-SPOILER : aucun détail d'intrigue n'est affiché en clair.
  // Les révélations sont rangées dans des <SpoilerAlert> cliquables.
  'cinema/jojo-steel-ball-run-episode-2': {
    date: '26.09.2026', category: 'NETFLIX · ANIME', image: 'cinema-jojo-steel-ball-run.jpg', imageAlt: 'Key visual officiel de STEEL BALL RUN JoJo’s Bizarre Adventure : Johnny Joestar au premier plan, Gyro Zeppeli derrière lui et les chevaux dorés de la course, sur fond violet à pois', cover: 'STEEL BALL RUN',
    title: 'STEEL BALL RUN', accent: 'REPREND LA COURSE.', dek: 'Six mois de silence après un spécial de 47 minutes encensé : depuis le 25 septembre, la partie 7 de JoJo’s Bizarre Adventure est enfin diffusée au rythme d’un épisode par semaine sur Netflix. L’épisode 2 ouvre un bloc de onze épisodes, chaque vendredi, jusqu’au 4 décembre.',
    lead: 'Le 19 mars dernier, la 1st STAGE donnait le départ de la Steel Ball Run : 47 minutes pour présenter Johnny Joestar, Gyro Zeppeli et la course transcontinentale la plus folle du manga. Puis plus rien. Ce vendredi 25 septembre, l’épisode 2 — « La requête du shérif à Mountain Tim » — a enfin lancé la machine hebdomadaire que les fans réclamaient.',
    intro: 'Entre-temps, la communauté a oscillé entre memes désespérés et crainte d’un traitement « Stone Ocean » : des épisodes lâchés par paquets, sans promotion. Le panel d’Anime Expo, le 3 juillet, a tranché : un épisode chaque vendredi, sous-titré et doublé, pour la planète entière.',
    h2: 'CE QUE RACONTE L’ÉPISODE 2 (SANS SPOILER)', p1: 'L’épisode 2 reprend exactement là où la 1st STAGE s’était arrêtée : la course vient de boucler sa première étape et l’organisation doit déjà gérer ses premières tensions. L’épisode se concentre sur deux axes sans en dévoiler l’issue : l’apprentissage du Spin côté Johnny au contact de Gyro, et l’installation d’une intrigue policière qui va suivre la caravane. Une reprise lisible même sans avoir lu le manga.',
    spoiler: {
      title: 'Détails de l’intrigue — épisode 2',
      content: 'Le verdict de la première étape tombe, et il est injuste : Gyro Zeppeli, arrivé en tête, est rétrogradé à la 21e place pour avoir utilisé ses Steel Balls contre un concurrent — c’est Sandman qui hérite de la victoire. Pendant ce temps, Johnny comprend que sa paralysie n’est pas une fin : au contact de Gyro, il découvre le Spin et sa deuxième leçon, « ne laisse pas tes muscles savoir ». L’alliance entre le paraplégique et le spadassin de Gênes se scelle ici. En coulisses, la course vire au polar : trois coureurs sont retrouvés éventrés, et le shérif enrôle le cowboy Mountain Tim comme adjoint pour retrouver le coupable — sous les yeux de Lucy Steel.'
    },
    quote: 'Le pouvoir n’est pas dans les sphères d’acier : il est dans la rotation. Toute la partie 7 tient dans cette phrase.', quoteBy: 'L’ANALYSE LET’S PLAY',
    h2b: 'POURQUOI SIX MOIS DE SILENCE', p2: 'Parce que David Production a choisi de soigner sa copie. La 1st STAGE, saluée comme l’un des meilleurs épisodes de l’année — un passage éclair en tête du classement MyAnimeList, devant Frieren — a exigé un polissage rare pour un lancement. Netflix, échaudé par les reproches faits au rythme de Stone Ocean, a ensuite calé la suite au cordeau : le panel Anime Expo du 3 juillet 2026, avec le compositeur Yugo Kanno et les voix américaines Daman Mills et Kaiji Tang, a officialisé le rendez-vous du vendredi.',
    p3: 'La reprise arrive avec un nouvel opening, « SPIN » du groupe Kroi, dévoilé le 23 septembre : un thème western nourri d’Ennio Morricone et des Ventures, frotté de funk, de soul et de hip-hop. Derrière la caméra, Yasuhiro Kimura et Hideya Takahashi dirigent toujours cette saison 6 — le 192e épisode de la saga animée — produite par David Production et Warner Bros. Japan, diffusée partout sur Netflix pendant que Crunchyroll reste sur le carreau.',
    spoiler2: {
      title: 'À venir — chapitres adaptés et indices manga',
      content: 'L’épisode 2 adapte les chapitres 12 à 14 du manga. La suite annoncée pour les 2nd et 3rd STAGE couvre la traversée du désert de l’Arizona et ses dinosaures, jusqu’au chapitre 32. Des fuites évoquent déjà 42 à 43 épisodes au total sur les prochaines années.'
    },
    p4: 'La suite du programme est connue : onze épisodes pour les 2nd et 3rd STAGE, avec un clap de fin attendu le 4 décembre pour ce bloc. En attendant, le rendez-vous est simple : chaque vendredi, 9 h du matin heure d’Alger. En selle.',
    take: 'À RETENIR', takeText: 'L’épisode 2 de Steel Ball Run est en ligne depuis le 25 septembre sur Netflix, puis un épisode chaque vendredi jusqu’au 4 décembre : onze épisodes pour les 2e et 3e étapes de la course.',
    source: 'D’après Netflix, le panel Anime Expo 2026, JoJo’s Bizarre Encyclopedia (jojowiki.com) et GamesRadar+, articles consultés le 26.09.2026.', sourceUrl: 'https://www.gamesradar.com/entertainment/anime-shows/jojos-bizarre-adventure-steel-ball-run-2nd-stage-3rd-stage-release-date-time-netflix/', sourceDetail: 'Lire l’article source',
    credit: 'Visuel : key visual officiel STEEL BALL RUN JoJo’s Bizarre Adventure — ©LUCKY LAND COMMUNICATIONS/SHUEISHA, JOJO’s Animation SBR Project.',
    sentiment: 'positive'
  },
  'cinema/dune-messiah-trailer': {
    date: '26.09.2026', category: 'WARNER BROS · DUNE', image: 'cinema-dune-messiah.jpg', imageAlt: 'Dune — Paul Atréides et Chani devant le soleil d’Arrakis, affiche officielle Legendary / Warner Bros', cover: 'DUNE: MESSIAH',
    title: 'DUNE: MESSIAH', accent: 'LE TRAILER ARRIVE.', dek: 'Denis Villeneuve a confirmé que la première bande-annonce de Dune: Messiah sera dévoilée en fin d’année. Le troisième chapitre, attendu en 2027, refermera la prophétie de Paul Atréides.',
    lead: 'La nouvelle est tombée simplement, comme souvent avec Villeneuve : la première bande-annonce de Dune: Messiah arrive en fin d’année, et le film sortira en 2027. Après le triomphe de Dune, deuxième partie, le cinéaste retourne sur Arrakis pour adapter le plus trouble des romans de Frank Herbert.',
    intro: 'Messiah ne sera pas une suite de plus : c’est le livre où le messie découvre le prix de sa propre légende. Un matériau sombre, politique, presque funèbre — et le chantier le plus attendu de la science-fiction au cinéma.',
    h2: 'CE QUE L’ON SAIT DU TRAILER', p1: 'Warner Bros. calera la révélation en fin d’année, adossée à l’un des grands rendez-vous de la salle. On y retrouvera Timothée Chalamet en Paul Atréides, Zendaya en Chani et Anya Taylor-Joy en Alia, personnage clé du roman. Le studio promet des images déjà finalisées plutôt qu’un simple teaser : Villeneuve montre rarement ce qui n’est pas prêt.',
    quote: 'Adapter Messiah, c’est adapter le revers de la médaille : le héros devient le problème.', quoteBy: 'L’ANALYSE LET’S PLAY',
    h2b: 'LE LIVRE LE PLUS DANGEREUX DE LA SAGA', p2: 'Publié en 1969, douze ans après Dune, Dune Messiah est présenté comme le roman le plus à contre-courant de la saga : il interroge le mythe du sauveur que les premiers films avaient construit.',
    spoiler: {
      title: 'Spoiler livre — intrigue de Dune Messiah (1969)',
      content: 'Le roman raconte un empire gagné et déjà rongé : la guerre sainte menée au nom de Paul a semé des milliards de morts, et les factions — Bene Gesserit, Tleilaxu, Guilde — ourdissent sa chute.'
    },
    p3: 'Côté fabrication, l’équipe reprend ses marques : Villeneuve à la réalisation et à l’écriture, la photographie désertique qui a signé visuellement la saga, et la musique de Hans Zimmer. Le cinéaste l’a répété : ce troisième film achèvera l’arc en trois actes entamé en 2021.',
    p4: 'Reste la question que tout le monde pose : Messiah sera-t-il le dernier Dune de Villeneuve ? L’intéressé rêve toujours d’adapter Les Enfants de Dune, mais jure qu’il faudra une pause de plusieurs années. En attendant, rendez-vous en fin d’année pour les premières images, puis en 2027 pour le verdict en salle.',
    take: 'À RETENIR', takeText: 'Première bande-annonce de Dune: Messiah en fin d’année, sortie en 2027 : Villeneuve, Chalamet, Zendaya et Taylor-Joy refermeront la prophétie de Paul Atréides.',
    source: 'D’après les annonces Warner Bros. et la fiche de référence du film, consultées le 26.09.2026.', sourceUrl: 'https://en.wikipedia.org/wiki/Dune:_Part_Three', sourceDetail: 'Consulter la fiche de référence',
    credit: 'Visuel : image promotionnelle officielle Warner Bros. fournie à la rédaction.',
    sentiment: 'positive'
  },
  'cinema/last-of-us-saison-3': {
    date: '22.09.2026', category: 'HBO · SÉRIES', image: 'cinema-last-of-us.jpg', imageAlt: 'The Last of Us — Ellie (Bella Ramsey) dans la série HBO, visuel officiel HBO', cover: 'THE LAST OF US',
    title: 'THE LAST OF US', accent: 'SAISON 3 CONFIRMÉE.', dek: 'HBO a officiellement commandé une troisième saison de The Last of Us. Elle adaptera la seconde moitié du deuxième jeu, avec de nouveaux arcs narratifs et le retour du duo Pascal–Ramsey.',
    lead: 'C’est confirmé : The Last of Us aura bien une saison 3. HBO a officialisé la commande, et avec elle la promesse d’adapter la partie du récit que le deuxième jeu racontait de l’autre côté du miroir — celle d’Abby.',
    intro: 'La saison 2 s’était achevée sur une fracture : Ellie et un mensonge impossible à porter. La suite devra changer de point de vue, l’exercice le plus risqué de toute la saga.',
    h2: 'PASSER DE L’AUTRE CÔTÉ DU MIROIR', p1: 'HBO confirme que la saison 3 adaptera la seconde moitié de The Last of Us Part II, avec un changement de perspective majeur annoncé comme le cœur du récit.',
    spoiler: {
      title: 'Spoiler jeu — structure narrative de Part II',
      content: 'Dans The Last of Us Part II, le récit bascule à mi-parcours : on rejoue les mêmes événements du point de vue d’Abby, celle que la saison 2 avait construite comme l’adversaire. La saison 3 reprendra cette seconde moitié, avec Kaitlyn Dever au centre, et devra faire accepter au public ce que le jeu imposait manette en main : comprendre, sans excuser.'
    },
    quote: 'Changer de point de vue n’est pas un twist : c’est tout le sujet.', quoteBy: 'L’ANALYSE LET’S PLAY',
    h2b: 'UN CHANTIER DÉJÀ SUR LES RAILS', p2: 'Craig Mazin et Neil Druckmann rempilent à l’écriture, avec une équipe rodée aux décors contaminés. Pedro Pascal et Bella Ramsey reviendront, entourés d’un casting élargi — Isabela Merced en Dina, Young Mazino en Jesse — et de nouveaux venus pour les arcs de Seattle. HBO vise une production lancée rapidement, pour un retour espéré en 2027.',
    p3: 'La série reste l’une des plus grosses machines de la chaîne : audiences solides, critiques globalement favorables, et un jeu d’origine remis en lumière à chaque saison. Assez pour que HBO voie plus loin : d’autres déclinaisons de l’univers de Naughty Dog restent dans les tiroirs.',
    p4: 'En attendant le tournage, la saison 2 est toujours en ligne, et notre article sur le mod multijoueur annulé de The Last of Us Part II rappelle que la franchise vit aussi côté joueurs. La saison 3, elle, a désormais une certitude : conclure l’histoire de Seattle sans trahir personne — ni Ellie, ni Abby, ni le public.',
    take: 'À RETENIR', takeText: 'HBO commande officiellement la saison 3 de The Last of Us : la seconde moitié de Part II, du point de vue d’Abby, avec Mazin et Druckmann aux commandes.',
    source: 'D’après le communiqué HBO du 22.09.2026 et la fiche de référence de la série, consultés le 26.09.2026.', sourceUrl: 'https://en.wikipedia.org/wiki/The_Last_of_Us_season_3', sourceDetail: 'Consulter la fiche de référence',
    credit: 'Visuel : image promotionnelle officielle HBO fournie à la rédaction.',
    sentiment: 'positive'
  },
  'cinema/marvel-doctor-doom': {
    date: '20.09.2026', category: 'MARVEL STUDIOS · MCU', image: 'cinema-doctor-doom.jpg', imageAlt: 'Doctor Doom — le visage de Robert Downey Jr. à moitié caché par le masque de métal du monarque de Latverie, visuel promotionnel Marvel Studios', cover: 'DOCTOR DOOM',
    title: 'DOCTOR DOOM', accent: 'PREND LES RÊNES DU MCU.', dek: 'Robert Downey Jr. sera Doctor Doom dans Avengers: Doomsday puis dans plusieurs films Marvel. Un choix qui redéfinit la prochaine saga : un seul visage, masqué, pour tenir l’univers entier.',
    lead: 'Marvel a tranché : la prochaine grande menace du MCU aura le visage de son plus ancien héros. Robert Downey Jr. revient, mais masqué, en Doctor Doom — et le studio confirme qu’il portera la saga sur plusieurs films, de Doomsday jusqu’aux suites déjà calées.',
    intro: 'Remplacer Kang après la sortie de route de Jonathan Majors obligeait Marvel à viser plus haut qu’un plan B. En choisissant Doom — et en faisant revenir son acteur fétiche dans un autre rôle — le studio transforme une contrainte en déclaration d’intention.',
    h2: 'UN SEUL MASQUE POUR TOUTE LA SAGA', p1: 'Doomsday, attendu en décembre, ne sera pas une apparition unique : Marvel Studios confirme que Downey Jr. incarnera Victor von Doom sur la durée, au cœur de l’arc qui mènera à Secret Wars. Les frères Russo réalisent, et le casting assemble des revenants de toutes les époques : anciens Avengers, X-Men des films Fox — Patrick Stewart et Ian McKellen compris. Doom y est présenté comme l’architecte de la crise du multivers, pas comme un simple boss de fin.',
    quote: 'Faire jouer Iron Man derrière le masque de Doom : le pari le plus culotté de Marvel depuis Endgame.', quoteBy: 'L’ANALYSE LET’S PLAY',
    h2b: 'APRÈS KANG, LE VIDE À COMBLER', p2: 'Depuis 2023 et la condamnation de Jonathan Majors, le MCU cherchait sa colonne vertébrale. Doom offre mieux qu’un méchant : un mythe déjà écrit, soixante ans de comics derrière lui, et une Latverie entière à installer. Reste le risque inverse : que le public ne voie que Downey Jr. sous le masque, et que Doom existe moins que son interprète.',
    p3: 'C’est tout l’enjeu du design montré par Marvel : masque intégral, cape verte, peu de peau visible. Le studio jure que la performance passera par la voix et la posture. Les premiers visuels officiels, dévoilés cet été, ont plutôt rassuré : le Doom de Doomsday emprunte autant aux époques classiques de Jack Kirby qu’aux versions modernes des comics.',
    p4: 'La suite du calendrier est connue : Doomsday en décembre 2026, puis Secret Wars fin 2027 pour refermer le multivers et redistribuer les cartes. D’ici là, chaque film et série Marvel sera lu à l’aune de cette annonce. Doom n’est plus une rumeur de casting : c’est le pilier sur lequel tout le studio s’appuie.',
    take: 'À RETENIR', takeText: 'Robert Downey Jr. incarnera Doctor Doom sur plusieurs films Marvel, d’Avengers: Doomsday (décembre 2026) à Secret Wars (2027) : la prochaine saga du MCU a son visage masqué.',
    source: 'D’après les annonces Marvel Studios et la fiche de référence du film, consultées le 26.09.2026.', sourceUrl: 'https://en.wikipedia.org/wiki/Avengers:_Doomsday', sourceDetail: 'Consulter la fiche de référence',
    credit: 'Visuel : image promotionnelle officielle Marvel Studios fournie à la rédaction.',
    sentiment: 'mixed'
  },
  'cinema/stranger-things-saison-5': {
    date: '18.09.2026', category: 'NETFLIX · SÉRIES', image: 'cinema-stranger-things.jpg', imageAlt: 'Stranger Things saison 5 — affiche teaser Netflix, Hawkins dans la brume du Monde à l’Envers', cover: 'STRANGER THINGS 5',
    title: 'STRANGER THINGS 5', accent: 'DATE ET TRAILER.', dek: 'Netflix a dévoilé la date de sortie et le premier trailer de la saison finale de Stranger Things : huit épisodes attendus pour mars 2027, pour refermer Hawkins et le Monde à l’Envers.',
    lead: 'C’est officiel : la dernière saison de Stranger Things arrive en mars 2027. Netflix a lâché la date et un premier trailer qui replonge Hawkins sous la menace de Vecna, onze ans après le début du phénomène.',
    intro: 'La saison 4 s’achevait sur un portail grand ouvert et une ville au bord du gouffre. La saison 5 promet d’y répondre : le groupe d’amis d’origine, désormais adulte, face à la fin de l’histoire.',
    h2: 'LE DERNIER PORTAIL', p1: 'Le trailer montre l’essentiel : Hawkins quadrillé, Vecna en toile de fond, et le noyau dur — Eleven, Mike, Will, Dustin, Lucas, Max, Joyce, Hopper — réuni pour une dernière campagne. Les frères Duffer ont prévenu : la saison se déroulera surtout à Hawkins, resserrée sur huit épisodes, avec un saut dans le temps assumé depuis la saison 4.',
    quote: 'Onze ans que Hawkins sert de porte d’entrée au Monde à l’Envers : la boucle devait se refermer là.', quoteBy: 'L’ANALYSE LET’S PLAY',
    h2b: 'UN ADIEU CALIBRÉ COMME UN ÉVÉNEMENT', p2: 'Netflix traite la fin comme un lancement mondial : teaser relayé partout, compte à rebours en ligne, et une diffusion prévue en une fois pour mars 2027 — le contraire du découpage en volumes testé ailleurs. La plateforme sait ce que vaut la série : l’un de ses plus gros pics d’audience historiques, saison après saison.',
    p3: 'Derrière l’événement, un héritage : Stranger Things a installé Netflix comme maison de production majeure, ressuscité les eighties pop de Spielberg et de King, et lancé une génération d’acteurs. Un spin-off est déjà en développement chez les Duffer, dans un autre coin du même univers — sans le casting actuel.',
    p4: 'D’ici mars 2027, les quatre saisons restent en ligne pour les retardataires. Le trailer, lui, tourne déjà en boucle : assez pour mesurer une dernière fois ce que la série a fait de mieux — des gamins à vélo devenus le dernier rempart d’une petite ville de l’Indiana.',
    take: 'À RETENIR', takeText: 'La saison finale de Stranger Things arrive en mars 2027 sur Netflix : huit épisodes, un premier trailer déjà en ligne, et Vecna en menace ultime sur Hawkins.',
    source: 'D’après l’annonce Netflix du 18.09.2026 et la fiche de référence de la série, consultées le 26.09.2026.', sourceUrl: 'https://en.wikipedia.org/wiki/Stranger_Things_season_5', sourceDetail: 'Consulter la fiche de référence',
    credit: 'Visuel : affiche teaser officielle Netflix fournie à la rédaction.',
    sentiment: 'positive'
  },
  'cinema/joker-folie-a-deux': {
    date: '15.09.2026', category: 'WARNER BROS · BILAN', image: 'cinema-joker.jpg', imageAlt: 'Joker: Folie à Deux — Joaquin Phoenix et Lady Gaga, affiche officielle Warner Bros', cover: 'JOKER 2',
    title: 'JOKER 2 DIVISE', accent: 'ET FAIT ENCORE DÉBAT.', dek: 'Conspué à Venise, boudé en salle, depuis réévalué : Joker: Folie à Deux reste le blockbuster le plus discuté de sa génération. Bilan d’un malentendu, deux ans après sa sortie.',
    lead: 'Peu de films auront autant fendu le public : conspué à Venise, boudé en salle, défendu ensuite par une partie de la critique, Joker: Folie à Deux continue de faire écrire — et de diviser. Retour sur ce que le film de Todd Phillips a vraiment essayé de faire.',
    intro: 'Sur le papier, tout était réuni pour un triomphe : un Oscar, un milliard de dollars, Joaquin Phoenix, Lady Gaga. À l’arrivée, le plus gros pari musical de Warner s’est pris le mur des attentes — et c’est peut-être là son sujet.',
    h2: 'UN PARI MUSICAL ASSUMÉ', p1: 'Folie à Deux n’est pas un film de super-vilains : c’est une comédie musicale de procès qui prend le contre-pied du premier opus. Les séquences musicales, tournées comme des rêves éveillés, sont au cœur du dispositif.',
    spoiler: {
      title: 'Spoiler — fin et traitement des personnages',
      content: 'Arthur Fleck y abandonne progressivement le personnage du Joker, et Harley Quinn — Lady Gaga — n’existe que dans le miroir de ses numéros chantés, repris du grand songbook américain. Les séquences musicales sont les seuls moments où les deux existent vraiment ensemble.'
    },
    quote: 'Conspué à sa sortie, rejoué depuis : Folie à Deux est en train de devenir un objet de culte.', quoteBy: 'L’ANALYSE LET’S PLAY',
    h2b: 'POURQUOI ÇA A COINCÉ', p2: 'D’abord un malentendu de marketing : les bandes-annonces vendaient un duo de vilains flamboyants, pas une déconstruction du mythe. Ensuite un contresens public : après le Joker « homme du peuple » de 2019, Phillips filme un homme qui renonce à son masque — exactement l’inverse de ce que la salle attendait. Le box-office a tranché sans appel : à peine de quoi rembourser un budget énorme.',
    p3: 'Reste ce que le film défend bec et ongles : la photographie de Lawrence Sher, la composition des plans, un Phoenix habité jusqu’au malaise. Une frange de la critique y voit désormais le geste le plus honnête d’un cinéaste de studio : avoir utilisé une notoriété de milliard de dollars pour filmer la fin d’une idolâtrie.',
    p4: 'Le débat n’est pas clos, et c’est tant mieux : Folie à Deux se reverra mieux qu’il ne s’est vu. En attendant, l’univers DC avance ailleurs — le Batman de Matt Reeves d’un côté, le DCU de James Gunn de l’autre — et le Joker de Phillips reste ce qu’il a toujours été : un one-shot, certes controversé, mais un one-shot.',
    take: 'À RETENIR', takeText: 'Joker: Folie à Deux reste un objet clivant : naufrage commercial assumé comme comédie musicale déconstructrice, il divise toujours critique et public — et se reverra comme un cas d’école.',
    source: 'Réécrit par la rédaction Let’s Play à partir des critiques et des chiffres de sortie du film, consultés le 26.09.2026.', sourceUrl: 'https://en.wikipedia.org/wiki/Joker:_Folie_%C3%A0_Deux', sourceDetail: 'Consulter la fiche de référence',
    credit: 'Visuel : photogramme officiel Warner Bros. fourni à la rédaction.',
    sentiment: 'mixed'
  },
  'cinema/house-of-dragon-saison-3': {
    date: '12.09.2026', category: 'HBO · SÉRIES', image: 'cinema-hotd.jpg', imageAlt: 'House of the Dragon — Rhaenyra Targaryen, affiche officielle HBO « Fire and Blood »', cover: 'HOUSE OF THE DRAGON',
    title: 'HOUSE OF THE DRAGON', accent: 'EN TOURNAGE.', dek: 'La troisième saison de House of the Dragon entre en tournage. HBO promet une guerre civile plus intense, de nouveaux dragons et le cœur de la Danse : la bataille qui fera basculer Westeros.',
    lead: 'Les caméras tournent : House of the Dragon lance sa saison 3, celle que les lecteurs de Fire & Blood attendent comme le point de non-retour de la Danse des Dragons. HBO annonce plus de fronts, plus de dragons, et moins de compromis.',
    intro: 'La saison 2 s’était achevée sur une guerre déclarée mais encore contenue. La troisième devra la montrer : fils mourants, trahisons de cour, et le ciel de Westeros saturé d’ailes.',
    h2: 'LA DANSE ENTRE DANS SA PHASE BRUTALE', p1: 'HBO annonce une escalade totale entre les deux camps, avec de nouveaux dragons et cavaliers annoncés. Matt Smith, Emma D’Arcy et Olivia Cooke rempilent, sous la houlette du showrunner Ryan Condal.',
    spoiler: {
      title: 'Spoiler livre & saison 3 — batailles à venir',
      content: 'Au programme de cette saison 3 : l’escalade totale entre le conseil noir de Rhaenyra et celui d’Aegon II, la bataille de la Gorgelette — l’un des chapitres les plus meurtriers du livre — et l’entrée en scène de nouveaux dragons et cavaliers, dont les bâtards de Dragonstone.'
    },
    quote: 'Une guerre civile avec dix-sept dragons n’a rien d’une bataille : c’est un incendie qui choisit ses camps.', quoteBy: 'L’ANALYSE LET’S PLAY',
    h2b: 'NOUVEAUX DRAGONS, NOUVEAUX CAMPS', p2: 'HBO le promet : le bestiaire s’élargit encore. Silverwing, Vermithor et les montures réclamées par les deux camps devront exister à l’écran, avec ce que cela suppose de volume d’effets. La production reprend ses bases — plateaux britanniques et extérieurs européens — avec de nouveaux réalisateurs annoncés pour donner à chaque front sa texture.',
    p3: 'La série mère reste l’un des piliers d’abonnement de HBO : chaque saison a tenu ses audiences malgré la comparaison permanente avec Game of Thrones. L’enjeu de la saison 3 est narratif autant qu’industriel : prouver que la Danse peut monter en intensité sans se perdre en manœuvres de couloir.',
    p4: 'Le retour n’est pas attendu avant 2027. D’ici là, l’univers continue de s’étendre : le spin-off A Knight of the Seven Kingdoms, plus intime et sans dragons, arrive en éclaireur. De quoi patienter avant que le ciel de Port-Réal ne s’embrase pour de bon.',
    take: 'À RETENIR', takeText: 'La saison 3 de House of the Dragon est en tournage : bataille de la Gorgelette, nouveaux dragons et guerre civile totale, pour un retour attendu en 2027 sur HBO.',
    source: 'D’après les annonces HBO du 12.09.2026 et la fiche de référence de la série, consultées le 26.09.2026.', sourceUrl: 'https://en.wikipedia.org/wiki/House_of_the_Dragon_season_3', sourceDetail: 'Consulter la fiche de référence',
    credit: 'Visuel : image promotionnelle officielle HBO fournie à la rédaction.',
    sentiment: 'positive'
  },
  'cinema/blade-reboot': {
    date: '10.09.2026', category: 'MARVEL STUDIOS · COULISSES', image: 'cinema-blade.jpg', imageAlt: 'Blade — affiche officielle du film de 1998 avec Wesley Snipes, franchise reprise par Marvel Studios', cover: 'BLADE',
    title: 'BLADE', accent: 'RETROUVE UN RÉALISATEUR.', dek: 'Après des années de départs et de scénarios jetés, le Blade de Marvel Studios aurait enfin un nouveau réalisateur. Mahershala Ali reste attaché au rôle, et un tournage est envisagé pour 2027.',
    lead: 'Le projet le plus turbulent du MCU tient peut-être son capitaine : selon plusieurs sources concordantes, Marvel Studios aurait arrêté un nouveau réalisateur pour Blade, sept ans après l’annonce du film avec Mahershala Ali.',
    intro: 'Annoncé en fanfare en 2019, le reboot du Daywalker a depuis tout connu : scénaristes remplacés, réalisateurs partis, réécritures complètes. Le studio jure que le film se fera. Cette fois, un calendrier commence à circuler.',
    h2: 'SEPT ANS DE CHANTIER', p1: 'Récapitulatif : Ali annoncé au San Diego Comic-Con 2019, un premier scénario commandé, deux réalisateurs successifs repartis — dont un parti en cours de préproduction — et une apparition vocale du personnage dans une scène post-générique pour prouver que le projet vivait encore. Chaque relance a remis l’angle à zéro : film d’époque ? horreur pure ? intégration au MCU contemporain ?',
    quote: 'Blade est le plus vieux chantier du MCU actuel : c’est aussi celui qui a le plus à perdre.', quoteBy: 'L’ANALYSE LET’S PLAY',
    h2b: 'CE QUE CHANGE CE RETOUR', p2: 'Un réalisateur nommé, c’est un ton arrêté : les échos de production décrivent un film sombre, classé R assumé, loin des comédies d’équipe. Le script repasserait par une dernière polish avant un tournage visé pour 2027, après la clôture de l’arc Doomsday / Secret Wars — le moment idéal pour installer un coin vraiment nocturne de l’univers.',
    p3: 'Il faut dire ce que Blade représente : la trilogie de Wesley Snipes (1998-2004) a financé la maison Marvel d’avant Disney, et prouvé qu’un comics pouvait porter un film adulte. Reprendre le Daywalker, c’est reprendre une filiation autant qu’un personnage.',
    p4: 'Rien n’est officiel tant que Marvel n’a pas communiqué : ni le nom du réalisateur, ni la fenêtre de sortie. Mais pour la première fois depuis 2019, le dossier avance dans un seul sens. Les fans du chasseur de vampires ont appris à compter les faux départs ; celui-ci ressemble enfin à un départ.',
    take: 'À RETENIR', takeText: 'Blade aurait enfin un réalisateur chez Marvel Studios : Mahershala Ali toujours attaché au rôle, tournage envisagé en 2027 après sept ans de development hell.',
    source: 'D’après les informations de production relayées le 10.09.2026 et la fiche de référence du film, consultées le 26.09.2026.', sourceUrl: 'https://en.wikipedia.org/wiki/Blade_(upcoming_film)', sourceDetail: 'Consulter la fiche de référence',
    credit: 'Visuel : image promotionnelle officielle Marvel Studios fournie à la rédaction.',
    sentiment: 'mixed'
  },
  'cinema/arcane-saison-2': {
    date: '08.09.2026', category: 'NETFLIX · RIOT GAMES', image: 'cinema-arcane.jpg', imageAlt: 'Arcane saison 2 — Jinx et Vi, affiche officielle Netflix / Riot Games', cover: 'ARCANE S2',
    title: 'ARCANE S2', accent: 'DERNIÈRE LIGNE DROITE.', dek: 'À quelques semaines de sa sortie, la saison 2 d’Arcane dévoile ses nouvelles affiches — et confirme qu’elle conclura l’histoire de Vi et Jinx. Piltover et Zaun n’ont jamais été aussi près de la rupture.',
    lead: 'Les affiches sont là, et elles donnent le ton : la saison 2 d’Arcane arrive dans quelques semaines sur Netflix, et ce sera la dernière pour le duo de sœurs qui a fait la réputation de la série. Riot et Fortiche préfèrent conclure plutôt qu’étirer.',
    intro: 'La saison 1 s’était terminée sur un coup de feu tiré vers le Conseil. La reprise montrera ce que cette balle coûte aux deux villes jumelles — et à celles qui la reçoivent de plein fouet.',
    h2: 'LES AFFICHES D’UN ADIEU', p1: 'Les nouveaux key arts mettent chacun face à son choix : Vi entre deux mondes, Jinx au bord du rire, Caitlyn en commandante, Silco et Vander en fantômes du passé. Riot Games et Netflix accompagnent ces visuels d’une confirmation attendue : cette saison 2 achèvera l’arc Piltover-Zaun, avec une sortie calée dans quelques semaines et une diffusion mondiale simultanée.',
    quote: 'Arcane a prouvé qu’une adaptation de jeu vidéo pouvait viser l’or plutôt que le minimum syndical.', quoteBy: 'L’ANALYSE LET’S PLAY',
    h2b: 'UNE FIN, PAS UN TERME', p2: 'Conclure cette histoire n’enterre pas l’univers : Riot développe déjà d’autres séries situées à Runeterra, avec de nouvelles régions et de nouveaux protagonistes, dans le même partenariat avec Fortiche. Les showrunners Christian Linke et Alex Yee restent aux commandes de la franchise animée ; la saison 2 servira de pont entre ce chapitre clos et les suivants.',
    p3: 'Ce qui ne changera pas : la fabrication. Le mélange 2D/3D de Fortiche, ses décors peints, son animation au cadre près — des années de travail par saison, et une reconnaissance critique rare pour une adaptation de jeu vidéo, Emmy Awards à l’appui.',
    p4: 'Rendez-vous dans quelques semaines sur Netflix, avec la saison 1 toujours en ligne pour se remettre à niveau. D’ici là, les affiches font leur travail : rappeler que la plus belle série d’animation du moment s’apprête à tirer sa révérence — et que Zaun n’a pas fini de briller dans le noir.',
    take: 'À RETENIR', takeText: 'La saison 2 d’Arcane sort dans quelques semaines sur Netflix et conclura l’histoire de Vi et Jinx ; d’autres séries Runeterra sont déjà en développement chez Riot.',
    source: 'D’après les annonces Riot Games / Netflix du 08.09.2026 et la fiche de référence de la série, consultées le 26.09.2026.', sourceUrl: 'https://en.wikipedia.org/wiki/Arcane_season_2', sourceDetail: 'Consulter la fiche de référence',
    credit: 'Visuel : affiches officielles Netflix / Riot Games fournies à la rédaction.',
    sentiment: 'positive'
  },
  'ea-sports-fc-27-carriere-dynamique': {
    date: '22.09.2026', category: 'EA SPORTS FC 27 · MODE CARRIÈRE', image: 'ea-sports-fc-27-carriere-pitch-notes.jpg', imageAlt: 'EA Sports FC 27 — fiche joueur du mode Carrière avec sa note globale et sa valeur marchande xTV calculée avec TransferRoom (visuel officiel EA Sports FC)', cover: 'EA SPORTS FC 27',
    title: 'EA SPORTS FC 27', accent: 'LA CARRIÈRE DEVIENT VIVANTE.', dek: 'Valeur marchande recalculée chaque semaine avec TransferRoom, note globale qui monte et qui chute, scénarios créés par la communauté : le mode Carrière est le vrai chantier de l’édition 2027.',
    lead: 'On n’attendait plus grand-chose d’un mode Carrière de football : une saison, puis l’impression d’avoir déjà tout vu. Ce que décrit Electronic Arts pour EA Sports FC 27 n’est pas une retouche de plus — le club se met à réagir en temps réel à ce qui se passe sur le terrain.',
    intro: 'Les Pitch Notes publiées par EA à trois jours de la sortie détaillent une refonte complète de la gestion : performances, forme, moral et valeur des joueurs pèsent désormais sur chaque décision. L’objectif affiché par les développeurs est simple à énoncer, difficile à tenir : effacer la routine des saisons répétitives pour se rapprocher du quotidien d’un entraîneur professionnel.',
    h2: 'LE MARCHÉ DES TRANSFERTS DEVIENT UN DOSSIER VIVANT', p1: 'Premier changement, et il est structurel : le prix d’un joueur ne reste plus figé à un montant calculé en fonction de son âge. Electronic Arts s’est associé à TransferRoom, la plateforme qu’utilisent les clubs professionnels, et reprend son système xTV pour estimer la valeur marchande à partir des performances réelles et du temps de jeu. Résultat : la cote d’un footballeur bouge chaque semaine, comme un cours en bourse. Une série de buts la fait grimper, une blessure ou un banc la fait chuter. Les négociations se déroulent elles aussi en plusieurs étapes étalées dans le temps — assez pour qu’un club concurrent s’invite au dernier moment et fasse capoter un transfert presque bouclé. Les contrats gagnent enfin des options réclamées depuis des années : paiement échelonné sur plusieurs saisons, clause de rachat, pourcentage à la revente, ou prêt immédiat du joueur acheté à son club d’origine. Selon EA, l’IA des clubs adverses a également été réécrite : elle recrute selon une stratégie tactique précise au lieu d’empiler des remplaçants inutiles.',
    quote: 'Une valeur qui bouge chaque semaine, c’est une saison qui ne peut plus se rejouer à l’identique.', quoteBy: 'L’ANALYSE LET’S PLAY',
    h2b: 'LA NOTE GLOBALE MONTE… ET DESCEND', p2: 'Deuxième bascule : la note globale devient dynamique. Dans les épisodes précédents, la progression d’un joueur suivait une courbe largement prédéfinie. Ici, elle peut monter ou chuter au fil de la saison selon la forme, le moral au quotidien et la condition physique. Le système d’entraînement manuel disparaît au profit de la récupération d’énergie : on ne passe plus ses semaines à optimiser des séances, on gère de la fraîcheur. Avec une conséquence très réaliste, et potentiellement cruelle : aligner un joueur tout juste revenu de blessure, sans être totalement rétabli, expose à une rechute immédiate.',
    p3: 'La progression gagne aussi en variété. Six profils de croissance sont intégrés : certains jeunes talents explosent très vite avant de stagner, d’autres ne révèlent leur potentiel qu’après plusieurs saisons. La polyvalence s’élargit, un joueur pouvant couvrir jusqu’à sept postes préférentiels sans pénalité sur sa note. En parallèle, le mode Manager Live ouvre un portail de création de scénarios accessible par un code QR : la communauté pourra concevoir et partager ses propres défis de carrière, avec des règles imposées dès le départ — pénalité de points au classement, plafond salarial strict, obligation d’aligner des jeunes du centre de formation. S’y ajoute un moteur d’événements imprévisibles qui sort du terrain : litiges financiers, sanctions de la ligue, tensions dans le vestiaire, et des conférences de presse où chaque réponse modifie le moral du groupe. En Carrière Joueur, des rivalités individuelles apparaissent face à un joueur géré par l’ordinateur au même poste.',
    p4: 'Reste la vraie question, celle qu’aucun patch note ne tranche. Le mode Carrière de la série souffre d’un syndrome connu : des saisons qui se ressemblent, une fois la première boucle comprise. Ce que décrit EA — un club qui vit, une valeur qui fluctue, un vestiaire qui s’agace — ressemble à la première tentative sérieuse pour casser ce rythme. Il faudra vérifier sur pièces que cette vie ne se résume pas à une pile de chiffres, et que les crises restent lisibles plutôt qu’aléatoires. Bonne nouvelle : la refonte s’appuie aussi sur le moteur de match détaillé dans les Pitch Notes de gameplay, qui renforce le contrôle manuel en défense. Rendez-vous le 25 septembre 2026, sur PC, PS5, Xbox Series et Switch, pour savoir si la routine a vraiment pris fin.',
    sentiment: 'positive', take: 'RÉSUMÉ', takeText: 'EA Sports FC 27 cherche surtout à rendre le mode Carrière moins statique : le club, le marché et les histoires de vestiaire devraient enfin peser ensemble sur une saison.',
    source: 'D’après les Pitch Notes d’Electronic Arts (« FC 27 Career Mode Deep Dive ») et l’article de jeuxvideo.com publié le 22.09.2026.', sourceUrl: 'https://www.jeuxvideo.com/news/2105158/ea-sports-fc-27-les-nouveautes-du-mode-carriere-qui-changent-tout.htm', sourceDetail: 'Lire l’article de référence',
    credit: 'Image : visuel officiel EA SPORTS FC 27 — fiche joueur du mode Carrière, valeur marchande xTV calculée avec TransferRoom. © Electronic Arts.'
  },
  'netmarble-tgs-2026': {
    date: '21.09.2026', category: 'NETMARBLE · TOKYO GAME SHOW', image: 'tokyo-game-show-2026-news.jpg', imageAlt: 'Visuel officiel du Tokyo Game Show 2026', cover: 'NETMARBLE', video: 'NyGVobZDCgo', videoTitle: 'Netmarble TGS 2026 — live officielle',
    title: 'NETMARBLE QUITTE', accent: 'LE TGS AVEC TROIS JEUX.', dek: 'Le bilan publié le 21 septembre confirme trois projets jouables au Tokyo Game Show 2026 : Shangri-La Frontier: The Seven Colossi, Solo Leveling: KARMA et Pearl in Blue.',
    lead: 'Netmarble a clôturé sa deuxième participation consécutive au Tokyo Game Show avec un line-up qui joue la carte de la diversité. Trois projets à venir ont été présentés sur le salon, avec des démos et des animations sur scène.',
    intro: 'Le communiqué confirme un fait important, mais souvent noyé dans les annonces de salon : ces jeux ont été montrés, pas datés. Aucune date de sortie n’est annoncée dans ce bilan, et les questions de disponibilité internationale ou de modèle économique restent donc ouvertes.',
    h2: 'TROIS PROMESSES, TROIS FORMATS', p1: 'Shangri-La Frontier: The Seven Colossi a été présenté comme un RPG collectible à combats en équipe et a bénéficié de sa première démonstration jouable au TGS. Solo Leveling: KARMA, en développement pour mobile, assume une formule d’action roguelite dans l’univers de la licence, avec des combinaisons d’armes et de bonus.',
    quote: 'Un line-up jouable n’est pas encore un calendrier de sortie.', quoteBy: 'L’ANALYSE LET’S PLAY',
    h2b: 'PEARL IN BLUE GARDE LE MYSTÈRE', p2: 'Pearl in Blue complète ce trio avec une proposition originale centrée sur ses personnages et son univers. Netmarble y a montré une première expérience jouable, accompagnée d’un espace thématique et de contenus sur scène.', p3: 'Cette sélection dessine un portefeuille très lisible : une adaptation d’IP manga/anime, un dérivé mobile de Solo Leveling et une nouvelle licence. C’est une démonstration de direction, pas encore une promesse de lancement à court terme.', p4: 'Pour les joueurs, le prochain signal à surveiller sera donc moins une nouvelle bande-annonce qu’une fenêtre de sortie précise. En attendant, les trois titres restent des projets en développement dont le potentiel devra être jugé sur pièces.',
    take: 'RÉSUMÉ', takeText: 'Netmarble veut occuper le terrain avec trois projets déjà montrables, mais garde encore la décision la plus importante — quand y jouer — pour plus tard.', source: 'Communiqué Netmarble publié le 21.09.2026 via EQS News.', sourceUrl: 'https://www.eqs-news.com/news/corporate/netmarble-wraps-up-tokyo-game-show-2026-with-three-upcoming-titles/3fca48e2-6062-4712-8715-83b095654f1a_en', sourceDetail: 'Lire la source',
    sentiment: 'positive'
  },
  'control-resonant-24-septembre': {
    date: '21.09.2026', category: 'REMEDY · SORTIE', image: 'physint-news.jpg', imageAlt: 'Visuel éditorial Let’s Play sur l’action paranormale', cover: 'CONTROL RESONANT', video: 'JZuJlSGpgQo', videoTitle: 'CONTROL Resonant — Story Trailer officiel',
    title: 'CONTROL RESONANT ARRIVE', accent: 'À J-3.', dek: 'Le prochain jeu de Remedy sortira le 24 septembre 2026 sur PS5, Xbox Series et PC. La version Mac est annoncée pour plus tard dans l’année.',
    lead: 'Ce n’est pas une annonce surprise du 21 septembre, mais c’est le rendez-vous le plus concret de la semaine : CONTROL Resonant est désormais à trois jours de son lancement mondial.',
    intro: 'Remedy a fixé la sortie au 24 septembre sur PlayStation 5, Xbox Series X|S, Steam et l’Epic Games Store. Le studio annonce aussi une compatibilité GeForce NOW dès le lancement, tandis que la version Mac arrivera plus tard en 2026.',
    h2: 'UNE DATE, DES PLATEFORMES', p1: 'Le jeu place Dylan Faden au centre d’une nouvelle crise paranormale à Manhattan. Ces éléments relèvent de la présentation officielle de Remedy ; ils ne préjugent ni de l’accueil critique ni du succès commercial du titre.',
    quote: 'À J-3, le plus important est ce qui est verrouillé.', quoteBy: 'L’ANALYSE LET’S PLAY',
    h2b: 'LE MAC RESTE À L’ÉCART DU JOUR J', p2: 'La fenêtre Mac est bien confirmée pour 2026 via Steam et l’App Store, mais aucune date plus précise n’est donnée. Il serait donc prématuré de parler d’une sortie simultanée sur tous les supports.', p3: 'Le calendrier publié le 21 septembre par ActuGaming replace simplement CONTROL Resonant dans la semaine du 21 au 27 septembre. La date de l’article ne doit pas être confondue avec celle de l’annonce de Remedy, publiée le 2 juin.', p4: 'À trois jours du lancement, l’information utile tient en quelques lignes : plateformes confirmées, rendez-vous fixé, et une version Mac qui suivra. Le reste devra attendre que le jeu soit entre les mains des joueurs.',
    take: 'RÉSUMÉ', takeText: 'CONTROL Resonant arrive avec une fenêtre claire sur les consoles et le PC ; l’absence de date Mac laisse toutefois une partie du public dans l’attente.', source: 'Remedy Entertainment et calendrier ActuGaming consultés le 21.09.2026.', sourceUrl: 'https://www.remedygames.com/article/control-resonant-launches-worldwide-on-september-24', sourceDetail: 'Lire l’annonce de Remedy',
    sentiment: 'positive'
  },
  'sorties-24-septembre': {
    date: '21.09.2026', category: 'SORTIES · 24 SEPTEMBRE', image: 'monster-hunter-wilds-switch2.jpg', imageAlt: 'Visuel éditorial Let’s Play consacré aux sorties de la semaine', cover: '24 SEPTEMBRE', video: 'eXLfSEipn7I', videoTitle: 'Silent Hill: Townfall — trailer officiel',
    title: 'LE 24 SEPTEMBRE VA FAIRE', accent: 'DU BRUIT.', dek: 'CONTROL Resonant et Silent Hill: Townfall partagent la même date de sortie. Deux visions du paranormal se retrouvent face à face dans le calendrier de la semaine.',
    lead: 'La semaine du 21 au 27 septembre 2026 se concentre autour d’un jeudi particulièrement chargé. Les deux dates les plus solides du calendrier sont celles de CONTROL Resonant et Silent Hill: Townfall, tous deux annoncés pour le 24 septembre.',
    intro: 'Le premier mise sur l’action paranormale et le retour de Dylan Faden, tandis que le second suit Simon sur l’île de St. Amelia dans une expérience d’horreur à la première personne. Le point commun s’arrête presque là : leurs promesses de jeu visent deux publics voisins mais pas identiques.',
    h2: 'DEUX VISIONS DU PARANORMAL', p1: 'CONTROL Resonant arrivera sur PS5, Xbox Series X|S, Steam et Epic Games Store. Silent Hill: Townfall est confirmé sur PS5, avec une approche à la première personne, le CRTV comme outil d’exploration et une enquête au cœur de son dispositif.',
    quote: 'Deux sorties le même jour : le choix se fera au ton, pas seulement au calendrier.', quoteBy: 'L’ANALYSE LET’S PLAY',
    h2b: 'UN JEUDI À SUIVRE, PAS UN VERDICT', p2: 'Le calendrier publié le 21 septembre par ActuGaming confirme cette concentration autour du 24 septembre. Les annonces de référence sont toutefois antérieures : Remedy a communiqué le 2 juin et le PlayStation Blog les 16-17 septembre selon la région.', p3: 'Cette nuance compte. La sélection du jour est un repérage éditorial des sorties confirmées, pas une liste exhaustive de tous les jeux de la semaine et encore moins un classement de qualité.', p4: 'Pour les joueurs, la question devient très concrète : préférez-vous l’étrangeté systémique de Remedy ou l’angoisse plus resserrée de Konami ? Dans les deux cas, le 24 septembre mérite d’être marqué dans le calendrier.',
    take: 'RÉSUMÉ', takeText: 'Le 24 septembre concentre deux sorties très différentes : une semaine chargée qui mérite d’être planifiée, plutôt qu’une nouvelle annonce à surinterpréter.', source: 'ActuGaming, « Les sorties jeux vidéo de la semaine du 21 septembre », consulté le 21.09.2026.', sourceUrl: 'https://www.actugaming.net/les-sorties-jeux-video-de-la-semaine-du-21-septembre-control-resonant-silent-hill-townfall-826185/', sourceDetail: 'Lire le calendrier',
    sentiment: 'positive'
  },
  'kingdom-hearts-4-coco': {
    date: '15.09.2026', category: 'SQUARE ENIX · DISNEY', image: 'kingdom-hearts-4-coco-news.jpg', imageAlt: 'Kingdom Hearts 4 — Sora, le visage peint en calavera, brandit une Keyblade en forme de guitare dans le monde de Coco (capture du trailer officiel D23 2026)', cover: 'KINGDOM HEARTS 4',
    title: 'LE MONDE DE COCO', accent: 'N’A RIEN D’UN HASARD.', dek: 'Square Enix a glissé Sora au milieu d’une séquence Disney consacrée à Coco. Derrière l’effet de surprise, c’est peut-être le monde le plus raccord avec la saga depuis des années.',
    lead: 'Personne ne l’avait vu venir sous cette forme. Alors que Disney parlait de la suite de son film d’animation Coco, les images ont basculé et Sora est apparu à l’écran : ce n’était pas une bande-annonce de film, mais l’officialisation d’un des mondes inédits de Kingdom Hearts 4.',
    intro: 'La rumeur circulait depuis des mois dans la communauté, sans jamais dépasser le stade du bruit de couloir. L’annonce a donc fait son effet, et elle relance immédiatement la question que se pose la saga depuis son retour : qui choisit les mondes, et sur quels critères ?',
    h2: 'UNE ANNONCE DÉGUISÉE EN SÉQUENCE DISNEY', p1: 'Le premier réflexe est de voir la manœuvre marketing. Une suite de Coco est en préparation, Kingdom Hearts est une vitrine mondiale, et l’on a longtemps entendu que Disney poussait pour installer ses licences les plus fortes — jusqu’aux univers live-action — dans les prochains épisodes. L’hypothèse n’est pas absurde. Elle est juste très incomplète.',
    quote: 'Dans Coco, on meurt deux fois. La seconde quand plus personne, chez les vivants, ne se souvient de vous. Kingdom Hearts raconte ça depuis vingt ans.', quoteBy: 'Let’s Play · Le vrai point commun',
    h2b: 'LA SECONDE MORT, TERRAIN DE JEU FAVORI DE NOMURA', p2: 'Car sur le fond, peu de mondes Disney collent aussi bien à l’écriture de Tetsuya Nomura. Chez Coco, la mort n’est pas une fin mais un passage : le Pays des Morts est un endroit habité, organisé, où l’on continue d’exister tant que quelqu’un, de l’autre côté, vous garde en mémoire. Le jour où le souvenir s’efface, l’existence s’efface avec lui.',
    p3: 'C’est exactement la mécanique émotionnelle de Kingdom Hearts. Quand Xion disparaît et que son cœur rejoint celui de Sora, Roxas et Axel ne perdent pas une amie : ils perdent jusqu’au souvenir de son existence. La saga a passé des épisodes entiers à répéter qu’un personnage n’est rien d’autre que la somme des cœurs qui se souviennent de lui — et voilà un monde Disney construit sur cette règle, avec ses propres autels et ses propres photos.',
    p4: 'Le reste de la connexion tient au cœur lui-même, qui est dans les deux univers le siège de la mémoire et des émotions. Chez Coco, c’est la musique qui vient rouvrir ce qui était enfoui ; chez Kingdom Hearts, le cœur n’oublie jamais tout à fait et sert même de boussole — Sora ouvre bien un chemin vers le Colisée au début de Kingdom Hearts 3 en se fiant à ce qu’il ressent. Autrement dit : si Square Enix choisit ses mondes avec ce niveau de soin, les mois qui nous séparent de la sortie — calée fin 2027 — méritent qu’on y regarde de très près.',
    take: 'RÉSUMÉ', takeText: 'L’arrivée de Coco élargit encore la promesse de Kingdom Hearts 4 : Square Enix mise sur la surprise et la variété pour faire patienter jusqu’à 2027.',
    source: 'D’après l’analyse de jeuxvideo.com (17.08.2026) et le communiqué officiel Square Enix (15.08.2026).', sourceUrl: 'https://www.jeuxvideo.com/news/2099264/kingdom-hearts-4-ce-monde-disney-est-probablement-bien-plus-adapte-a-la-saga-qu-on-ne-l-imagine.htm', sourceDetail: 'Lire l’article original',
    credit: 'Image : capture du trailer officiel KINGDOM HEARTS IV — D23 2026. KINGDOM HEARTS © Disney. © Disney/Pixar. Developed by SQUARE ENIX.',
    sentiment: 'positive'
  },
  'wolverine-exclu-ps5': {
    date: '15.09.2026', category: 'SONY · INSOMNIAC GAMES', image: 'wolverine-countdown.jpg', imageAlt: 'Marvel’s Wolverine — Logan griffes sorties, key art officiel d’Insomniac Games', cover: 'WOLVERINE',
    title: 'MARVEL’S WOLVERINE', accent: 'FAIT DES JALOUX.', dek: 'Le jeu sort aujourd’hui, et uniquement sur PS5. Après deux heures manette en main chez Insomniac Games, on vous raconte pourquoi l’aventure de Logan est l’exclu que les joueurs PC et Xbox Series regardent de travers.',
    lead: 'Jour J pour le mutant. Marvel’s Wolverine débarque ce 15 septembre sur PS5, sans aucune autre machine à l’horizon. Un choix que Sony assume, et que deux heures de prise en main suffisent à expliquer : entre récit original, combats bestiaux et mise en scène de cinéma, Logan signe l’une des aventures les plus enviables de la génération.',
    intro: 'Le postulat de départ a de quoi décontenancer : dans cet univers, les X-Men n’existent pas. Les mutants sont bien là, mais aucune grande équipe ne défend leurs intérêts. Logan, retiré depuis trois ans, a autrefois appartenu à la Team X de Nathaniel Essex, aux côtés de Dents de Sabre, Mystique et Jean Grey. Quand Bolivar Trask commence à enlever des mutants, il n’a d’autre choix que de ressortir les griffes.',
    h2: 'UNE OUVERTURE QUI NE FAIT PAS DE QUARTIER', p1: 'Pas de préambule, pas de tutoriel déguisé en promenade : le jeu s’ouvre directement dans l’action, avec une mise en scène qui installe immédiatement le ton. Oubliez la formule Spider-Man : Marvel’s Wolverine assume une aventure linéaire, ponctuée de zones semi-ouvertes, entièrement dédiée à la mise en scène.',
    spoiler: {
      title: 'Spoiler — scène d’ouverture',
      content: 'Le jeu s’ouvre in media res à bord d’un hélicoptère pris pour cible par la DCA. Provocé par Dents de Sabre, Logan répond en se laissant tomber dans le vide, griffes sorties et double doigt d’honneur à l’appui.'
    },
    quote: 'Un hélicoptère en feu, un saut dans le vide, un doigt d’honneur : en une scène, Logan est déjà chez lui.', quoteBy: 'Let’s Play · Carnet de prise en main',
    h2b: 'BESTIAL, MÊME QUAND IL SE FAIT DISCRET', p2: 'La linéarité n’empêche pas le voyage. Telambang, Madripoor, Tokyo : les décors, partiellement destructibles, mêlent réalisme et esthétique de comics modernes, portés par une caméra « in game » conçue sur mesure pour donner au jeu son grain de cinéma. C’est beau, c’est dense, et ça ne se dilue jamais.',
    p3: 'En combat, Insomniac ne retire rien : attaques, parades, esquives et exécutions sanglantes s’enchaînent dans un système qui célèbre la férocité du personnage. Même la furtivité reste brutale — Logan traque ses ennemis à l’odorat avant de les éliminer. Le tout s’appuie sur une progression light RPG : techniques, capacités spéciales et adaptations génétiques améliorent régénération, dégâts ou mobilité, pendant que des défis cachés débloquent des souvenirs perdus.',
    p4: 'Le jeu laisse aussi entrevoir un récit plus intime qu’attendu, qui explore autant la violence du mutant que les blessures de l’homme derrière les griffes. Ajoutez plusieurs dizaines de costumes et de griffes à personnaliser, et vous tenez l’exclu que tout le monde va regarder sortir… depuis une autre machine que la sienne. Notre verdict complet, lui, vous attend déjà dans la rubrique Tests.',
    spoiler2: {
      title: 'Spoiler — personnage surprise',
      content: 'Et puis il y a Jean Grey. Une scène particulièrement touchante laisse entrevoir un récit plus intime, avec des retrouvailles qui pèsent lourd dans l’histoire de Logan.'
    },
    take: 'RÉSUMÉ', takeText: 'Wolverine assume une direction plus resserrée et plus adulte : une aventure solo qui cherche son identité propre plutôt que de simplement collectionner les apparitions Marvel.',
    source: 'Basé sur la prise en main de jeuxvideo.com (15.08.2026).', sourceUrl: 'https://www.jeuxvideo.com/news/2096034/marvel-s-wolverine-l-exclu-ps5-enviee-par-tous-les-joueurs-pc-et-xbox-series.htm', sourceDetail: 'Lire l’article original',
    sentiment: 'positive'
  },
  'persona-6-switch-2': {
    date: '14.09.2026', category: 'SEGA · RPG', image: 'persona-6-news.jpg', imageAlt: 'Visuel officiel de l’univers Persona — site Atlus', cover: 'PERSONA 6',
    title: 'PERSONA 6 ARRIVE', accent: 'EN PHYSIQUE.', dek: 'Le prochain épisode de la série Persona sortira aussi en version physique sur Switch 2. Une bonne nouvelle pour les joueurs qui aiment garder leurs RPG près d’eux.',
    lead: 'SEGA avait déjà confirmé Persona 6 sur Switch 2, PS5, Xbox Series et PC. La console de Nintendo aura finalement droit à sa propre édition physique, en plus de la disponibilité numérique annoncée.',
    intro: 'La date de sortie reste inconnue, mais le projet commence à préciser son contour. Après l’annonce de la version physique sur PS5, la Switch 2 rejoint donc la liste des machines qui accueilleront le prochain grand RPG de SEGA.',
    h2: 'UNE CARTE QUI CHANGE TOUT', p1: 'Il faut toutefois garder une nuance importante : SEGA utilise régulièrement le format de la carte clé pour ses sorties physiques sur Switch 2. La boîte sera bien présente en magasin, mais le contenu pourrait nécessiter un téléchargement.',
    quote: 'Une édition physique, oui. Une cartouche complète, pas forcément.', quoteBy: 'Let’s Play · Ce qu’il faut retenir',
    h2b: 'LE GAME PASS DANS L’ÉQUATION', p2: 'Persona 6 sera également ajouté au Xbox Game Pass dès sa sortie. Une manière de toucher immédiatement un large public, alors que l’attente autour de la série dépasse depuis longtemps le cercle des habitués de Persona.', p3: 'Pour SEGA, le choix est cohérent : multiplier les portes d’entrée sans abandonner les collectionneurs. Les joueurs Switch 2 pourront choisir entre le confort du numérique et la présence d’une édition en boîte.', p4: 'Il reste maintenant à découvrir le jeu lui-même. Tant que la date, le prix et le contenu exact de la carte clé ne sont pas précisés, cette annonce doit surtout être lue comme un signe de confiance envers la nouvelle console.',
    take: 'RÉSUMÉ', takeText: 'Persona 6 devient un lancement multiplateforme dès le départ, un choix qui peut élargir son audience sans effacer l’importance de la version Switch 2.',
    sentiment: 'positive'
  },
  'last-of-us-ii-mod': {
    date: '14.09.2026', category: 'PLAYSTATION · PC', image: 'last-of-us-mod-news.jpg', imageAlt: 'The Last of Us Part II Remastered — visuel officiel PlayStation', cover: 'THE LAST OF US II',
    title: 'LE MULTIJOUEUR', accent: 'RESTE AU GARAGE.', dek: 'Un projet de mod voulait offrir une expérience multijoueur à la version PC de The Last of Us Part II. Sony a demandé son arrêt avant sa sortie.',
    lead: 'The Last of Us Part II Remastered est arrivé sur PC sans le mode multijoueur imaginé pendant le développement du jeu. Des fans ont tenté de combler ce manque avec un mod financé par leur communauté.',
    intro: 'L’équipe Specizer travaillait depuis janvier sur cette composante en ligne, avec une sortie envisagée ce mois-ci. Le projet avait trouvé son public grâce à Patreon et à plusieurs extraits diffusés en ligne.',
    h2: 'QUAND LES FANS REPRENNENT LE RELAIS', p1: 'L’histoire est révélatrice d’une attente qui n’a jamais vraiment disparu. Naughty Dog avait d’abord abandonné le multijoueur prévu pour The Last of Us Part II, avant de mettre fin à son projet connecté autonome. Les joueurs, eux, ont continué à imaginer ce que cet univers pouvait donner en ligne.',
    quote: 'Le projet devait sortir ce mois-ci. Il ne verra finalement jamais le jour.', quoteBy: 'Specizer · Message à sa communauté',
    h2b: 'UNE QUESTION DE DROITS, MAIS AUSSI DE CONTRÔLE', p2: 'Les moddeurs ont confirmé avoir reçu une lettre de Sony Interactive Entertainment leur demandant de ne pas publier le mod. Le contenu n’avait pas encore été officiellement lancé, mais ses images suffisaient à rendre le projet visible.', p3: 'La décision peut se comprendre du point de vue de l’éditeur : un mod non officiel qui reprend des éléments d’une licence protégée peut brouiller la frontière entre fan project et produit concurrent.', p4: 'Elle laisse malgré tout une frustration particulière. Après l’annulation du multijoueur officiel, cette tentative indépendante représentait l’une des rares façons de voir cette idée continuer à vivre. Les extraits encore disponibles témoignent surtout d’un projet qui n’aura pas eu le temps de rencontrer son public.',
    take: 'RÉSUMÉ', takeText: 'Le dossier rappelle la limite des projets communautaires autour des licences propriétaires : une idée prometteuse peut s’arrêter avant même d’avoir rencontré son public.',
    sentiment: 'negative'
  },
  'cyberpunk-2077-battlenet': {
    date: '14.09.2026', category: 'CD PROJEKT RED · PC', image: 'cyberpunk-2077-battlenet-news.webp', imageAlt: 'Cyberpunk 2077 Ultimate Edition — visuel officiel CD PROJEKT RED', cover: 'CYBERPUNK 2077',
    title: 'CYBERPUNK 2077', accent: 'CHANGE DE QUARTIER.', dek: 'L’Ultimate Edition rejoindra Battle.net plus tard cette année. CD Projekt RED et Blizzard continuent d’élargir leur partenariat autour de leurs grands RPG.',
    lead: 'Après The Witcher 3: Wild Hunt — Remastered, c’est au tour de Cyberpunk 2077: Ultimate Edition de prendre la direction de Battle.net. La sortie est confirmée pour 2026, sans date précise pour le moment.',
    intro: 'L’annonce s’inscrit dans un partenariat officialisé le 26 août entre CD Projekt RED et Blizzard. Le premier rendez-vous est fixé au 29 septembre avec The Witcher 3: Wild Hunt — Remastered, avant l’arrivée de Night City sur le même écosystème.',
    h2: 'NIGHT CITY SUR LE LAUNCHER BLIZZARD', p1: 'Pour les joueurs PC, le changement sera surtout une question d’écosystème. Cyberpunk 2077: Ultimate Edition regroupe déjà le jeu et son extension Phantom Liberty ; son arrivée sur Battle.net lui donnera une nouvelle vitrine auprès du public habitué aux jeux Blizzard.',
    quote: 'Deux univers de RPG, un même point d’entrée sur PC.', quoteBy: 'Let’s Play · L’enjeu de l’annonce',
    h2b: 'UN PARTENARIAT QUI PREND DE L’AMPLEUR', p2: 'Le choix n’est pas anodin. Battle.net est historiquement associé aux licences de Blizzard, mais la plateforme accueille aussi des jeux partenaires. The Witcher 3 puis Cyberpunk 2077 installent progressivement une passerelle entre deux publics de joueurs.', p3: 'Il faudra encore attendre les précisions pratiques : date exacte, prix, gestion des sauvegardes et éventuelles conditions pour les propriétaires de l’Ultimate Edition. Rien de tout cela n’a été détaillé à ce stade.', p4: 'Cette arrivée ne change pas le contenu de Cyberpunk 2077, mais elle confirme que CD Projekt RED cherche de nouveaux chemins de distribution pour ses jeux. Pour Night City, le prochain arrêt est donc connu ; le calendrier reste à écrire.',
    take: 'RÉSUMÉ', takeText: 'Cette arrivée complète la distribution de Cyberpunk 2077 sur PC, mais son intérêt dépendra surtout des avantages concrets de cette édition et de sa date réelle.',
    sentiment: 'positive'
  },
  'rayman-legends-retold': {
    date: '15.09.2026', category: 'UBISOFT · PLATEFORMES', image: 'rayman-legends-retold-news.jpg', imageAlt: 'Rayman Legends Retold — miniature officielle du trailer Ubisoft', cover: 'RAYMAN LEGENDS',
    title: 'RAYMAN RETOLD', accent: 'REPORTÉ À DÉCEMBRE.', dek: 'Le remaster ne sortira plus le 1er octobre. Ubisoft repousse le rendez-vous au 3 décembre 2026 pour peaufiner sa version.',
    lead: 'Les joueurs devront patienter quelques semaines de plus avant de retrouver Rayman. Alors que Rayman Legends Retold était attendu le 1er octobre 2026, Ubisoft vient d’annoncer un report au 3 décembre.',
    intro: 'Le changement concerne les versions PS5, Xbox Series, Switch 2 et PC. Le développement est présenté comme terminé, mais l’équipe souhaite profiter de ce délai supplémentaire pour améliorer les derniers détails et viser le niveau de qualité attendu pour ce retour.',
    h2: 'UN REPORT POUR POLIR LE REMASTER', p1: 'Ce décalage ne ressemble donc pas à une remise en question du projet. Rayman Legends Retold garde son calendrier de sortie et ses plateformes, tandis que les développeurs s’offrent un peu d’air pour finaliser l’expérience dans de meilleures conditions.',
    quote: 'Quelques semaines de plus pour laisser le remaster trouver son meilleur rythme.', quoteBy: 'Let’s Play · Le point calendrier',
    h2b: 'UN NOUVEAU RENDEZ-VOUS EN DÉCEMBRE', p2: 'La nouvelle date est fixée au 3 décembre 2026. Elle place le jeu au cœur d’une période chargée en sorties, mais offre aussi à Ubisoft une fenêtre supplémentaire pour présenter les nouveautés et les ajustements de cette version revisitée.', p3: 'Pour accompagner cette attente, une importante vidéo de gameplay est annoncée le 22 septembre. Ce sera l’occasion de voir plus concrètement le travail réalisé sur le remaster et de vérifier comment ses niveaux cultes se comportent sur les machines actuelles.', p4: 'Le rendez-vous change, mais l’envie reste intacte : Rayman Legends Retold vise toujours la PS5, les Xbox Series, la Switch 2 et le PC. Il faudra simplement attendre le début du mois de décembre pour lancer cette nouvelle partie.',
    take: 'RÉSUMÉ', takeText: 'Rayman revient dans une configuration large, avec une promesse qui devra maintenant se vérifier manette en main : la prochaine vidéo sera plus parlante que le calendrier.',
    sentiment: 'negative'
  },
  'fire-emblem-fortunes-weave': {
    date: '15.09.2026', category: 'NINTENDO · SWITCH 2', image: 'fire-emblem-fortunes-weave-news.jpg', imageAlt: 'Fire Emblem: Fortune’s Weave — visuel officiel Nintendo', cover: 'FIRE EMBLEM',
    title: 'FORTUNE’S WEAVE', accent: 'JOUE SA DERNIÈRE CARTE.', dek: 'À deux jours de sa sortie, Fire Emblem: Fortune’s Weave revient sur ses quatre destins et la liberté laissée aux joueurs pour les entrelacer.',
    lead: 'Le prochain Fire Emblem s’apprête à entrer en scène sur Nintendo Switch 2. Attendu le 17 septembre 2026, Fortune’s Weave profite de cette dernière ligne droite pour rappeler ce qui distingue son aventure : quatre protagonistes, quatre parcours et une destinée à reconstruire.',
    intro: 'Les héros sont présentés comme morts dans un futur proche avant de recevoir une seconde chance grâce à Eshmel, une oracle qui veut infléchir leur sort. Cette prémisse installe immédiatement l’enjeu du jeu : comprendre ce qui s’est brisé, puis réunir les fragments d’une histoire commune.',
    h2: 'QUATRE DESTINS, UNE SEULE ISSUE', p1: 'Chaque protagoniste dispose de son propre scénario, mais Fortune’s Weave ne cloisonne pas ces récits. Il sera possible de passer librement de l’un à l’autre afin de faire progresser les quatre fils narratifs et de viser la conclusion la plus favorable.',
    quote: 'Le joueur ne choisit plus seulement qui suivre : il choisit quand faire avancer chaque destin.', quoteBy: 'Let’s Play · La nouvelle mécanique narrative',
    h2b: 'ENTRE DEUX BATAILLES, LE TEMPS DES LIENS', p2: 'La formule stratégique reste familière aux habitués. Entre deux combats majeurs, le hub sert de point d’ancrage pour discuter avec les alliés, renforcer les soutiens, recruter de nouveaux personnages et explorer les environs.', p3: 'Ces moments de respiration ne sont pas qu’une parenthèse. Les échanges et les recrutements devraient nourrir la progression des quatre campagnes, tout en donnant au joueur les clés pour comprendre les enjeux de ce monde et les relations entre ses héros.', p4: 'La sortie est fixée au 17 septembre 2026, exclusivement sur Nintendo Switch 2. Une longue vidéo de présentation accompagne cette dernière étape et permet de revoir les bases de l’aventure avant de se lancer dans la bataille.',
    take: 'RÉSUMÉ', takeText: 'Fortune’s Weave mise sur la liberté de parcours pour renouveler la formule : son vrai défi sera de rendre ces choix aussi significatifs que nombreux.',
    sentiment: 'positive'
  },
  'tokyo-game-show-2026-annulation': {
    date: '20.09.2026', category: 'TOKYO GAME SHOW · JAPON', image: 'tokyo-game-show-2026-news.jpg', imageAlt: 'Visuel officiel Tokyo Game Show 2026 avec la mascotte de l’événement', cover: 'TGS 2026',
    title: 'LE TGS 2026', accent: 'PERD SON DERNIER JOUR.', dek: 'Le Tokyo Game Show annule officiellement sa journée du 21 septembre à cause de l’approche du typhon n°25. Le dimanche 20 reste maintenu, sous réserve des conditions locales.',
    lead: 'Le Tokyo Game Show 2026 n’ira pas jusqu’au bout de son programme initial. La CESA a annoncé le 19 septembre l’annulation complète de la journée du lundi 21, alors que le typhon n°25 doit renforcer les vents et les pluies sur la région de Tokyo.',
    intro: 'Le dimanche 20 septembre est maintenu comme prévu au Makuhari Messe, mais l’organisation demande aux visiteurs de surveiller la météo et les transports. Cette édition anniversaire, pensée pour durer cinq jours, se retrouve donc ramenée à quatre journées effectives.',
    h2: 'LA SÉCURITÉ PASSE AVANT LE SHOW', p1: 'La décision répond à un risque très concret : l’intensification annoncée des intempéries pourrait perturber les transports et compliquer le retour des visiteurs, exposants et équipes. La CESA a également prévenu que certaines installations ou activités du dimanche pourraient être modifiées si la situation l’exige.',
    quote: 'Le dimanche est maintenu. Le lundi est annulé pour permettre à chacun de rentrer en sécurité.', quoteBy: 'CESA · Avis officiel du 19 septembre 2026',
    h2b: 'UN PROGRAMME À SAUVER EN LIGNE', p2: 'Les billets du 21 septembre feront l’objet d’un remboursement via leur canal d’achat. Pour les scènes prévues ce jour-là, l’organisateur cherche encore à mettre en place des diffusions en ligne, sans avoir confirmé les contenus ni les horaires.', p3: 'L’enjeu dépasse la simple logistique. Le TGS célébrait ses trente ans et inaugurait un format de cinq jours ; cette annulation devient un précédent pour un salon déjà en pleine expansion. Les annonces importantes ne disparaissent pas forcément, mais leur mise en scène pourrait désormais passer par le numérique.', p4: 'À ce stade, le seul calendrier certain est celui du dimanche 20 septembre, maintenu sur place. Le reste dépendra de la trajectoire du typhon et des prochaines communications officielles de la CESA.',
    take: 'RÉSUMÉ', takeText: 'L’annulation perturbe le rendez-vous sans effacer son intérêt : les annonces importantes pourraient simplement se déplacer vers les formats numériques.', source: 'D’après l’avis officiel de la CESA publié le 19.09.2026.', sourceUrl: 'https://tgs.cesa.or.jp/2026/en/news/detail/00061', sourceDetail: 'Lire l’avis officiel', credit: 'Image : visuel officiel Tokyo Game Show 2026. © CESA / Nikkei Business Publications.',
    sentiment: 'negative'
  },
  'eshop-switch-2-20-septembre': {
    date: '20.09.2026', category: 'NINTENDO · SWITCH 2', image: 'fire-emblem-fortunes-weave-news.jpg', imageAlt: 'Fire Emblem: Fortune’s Weave — visuel officiel Nintendo', cover: 'ESHOP SWITCH 2',
    title: 'FIRE EMBLEM', accent: 'GARDE LA PREMIÈRE PLACE.', dek: 'Dans les classements eShop Switch 2 de la semaine du 20 septembre, Fortune’s Weave reste numéro un devant Diablo 4 et les deux éditions de LEGO Batman.',
    lead: 'Fire Emblem: Fortune’s Weave conserve la tête des ventes sur l’eShop de la Nintendo Switch 2 pour la semaine du 20 septembre 2026. Le RPG stratégique de Nintendo devance Diablo 4, arrivé quelques jours plus tôt, et les deux éditions de LEGO Batman: Legacy of the Dark Knight.',
    intro: 'Le résultat prolonge l’effet du préchargement commencé la semaine précédente : Fortune’s Weave était déjà installé en tête avant sa sortie. Le classement ne mesure donc pas uniquement les achats du week-end, mais il donne une première photographie de la demande autour du nouveau Fire Emblem.',
    h2: 'UN DUEL ENTRE NOUVEAUTÉS', p1: 'Le deuxième rang de Diablo 4 est le signal le plus parlant. Le jeu de Blizzard s’installe immédiatement derrière une exclusivité Switch 2, tandis que LEGO Batman occupe les troisième et quatrième places avec ses éditions standard et Deluxe. Le haut du tableau reste ainsi dominé par des licences déjà très identifiables.',
    quote: 'Fortune’s Weave reste numéro un ; Diablo 4 prend la tête du classement des jeux uniquement numériques.', quoteBy: 'Let’s Play · Lecture des classements du 20 septembre',
    h2b: 'LA SWITCH 2 ÉLARGIT SON ÉVENTAIL', p2: 'Le reste du top 10 montre une console qui accueille désormais des profils très différents : RuneScape: Dragonwilds arrive sixième, tandis que Trails in the Sky 2nd Chapter se place neuvième. Entre RPG, jeux-service et grands portages, l’eShop ne dépend plus d’un seul type de sortie.', p3: 'Il faut toutefois garder une nuance : ce tableau est un classement de ventes, pas un baromètre de qualité ni un chiffre de ventes communiqué par Nintendo. Il indique une hiérarchie à un instant donné, avec l’effet des précommandes et des éditions multiples.', p4: 'Pour Fortune’s Weave, le premier signal reste favorable. Sa première place confirme l’intérêt du public pour une aventure stratégique pensée autour de quatre destins, alors que le jeu entre dans sa première semaine complète de disponibilité.',
    take: 'RÉSUMÉ', takeText: 'Ce classement montre que Fire Emblem bénéficie déjà d’une forte visibilité sur Switch 2, mais ne suffit pas encore à mesurer son endurance commerciale.', source: 'Classement publié par Nintendo Everything le 20.09.2026.', sourceUrl: 'https://nintendoeverything.com/nintendo-switch-2-eshop-charts-september-20-2026/', sourceDetail: 'Voir le classement complet', credit: 'Image : visuel officiel Nintendo de Fire Emblem: Fortune’s Weave.',
    sentiment: 'positive'
  },
  'sony-licence-jeux-numeriques': {
    date: '20.09.2026', category: 'PLAYSTATION · JUSTICE', image: 'playstation-store-ownership-news.jpg', imageAlt: 'Interface officielle du PlayStation Store présentée par Sony Interactive Entertainment', cover: 'PLAYSTATION STORE',
    title: 'VOUS ACHETEZ UN JEU', accent: 'OU UNE LICENCE ?', dek: 'Dans une action collective en Californie, Sony soutient qu’un consommateur raisonnable sait qu’un achat numérique sur le PlayStation Store ne transfère pas la propriété du jeu.',
    lead: 'Le mot « acheter » vaut-il encore ce qu’il promet dans une boutique numérique ? C’est la question posée par une plainte collective déposée en Californie contre Sony. En réponse, l’entreprise affirme que les joueurs obtiennent une licence personnelle d’utilisation, et non la propriété du jeu téléchargé.',
    intro: 'L’affaire concerne quatre consommateurs qui reprochent au PlayStation Store d’employer des formulations comme « Buy Now » et « Confirm Purchase » sans expliquer assez clairement, au moment de la transaction, que l’accès reste encadré par les conditions de licence de PlayStation. Sony cherche pour sa part à faire rejeter la procédure ou à empêcher son traitement comme action collective.',
    h2: 'LE MOT « ACHETER » AU CŒUR DU DOSSIER', p1: 'La plainte s’appuie sur la loi californienne AB 2426, qui encadre depuis 2025 l’emploi de termes comme « buy » ou « purchase » pour des biens numériques. Lorsqu’une plateforme ne vend pas une propriété illimitée mais accorde une licence, elle doit le signaler de manière claire et visible avant la transaction, selon l’interprétation défendue par les plaignants.',
    quote: 'Le logiciel est concédé sous licence, et non vendu.', quoteBy: 'Conditions d’utilisation PlayStation, citées dans la procédure',
    h2b: 'UNE LICENCE N’EST PAS UNE LOCATION ORDINAIRE', p2: 'La nuance mérite d’être posée précisément. Un jeu numérique acheté sur le Store reste attaché au compte de l’utilisateur et peut être téléchargé selon les conditions de PlayStation. Mais le contrat ne décrit pas cette opération comme un transfert de propriété : il accorde un droit d’utilisation personnel, soumis aux règles du service et présenté comme révocable.', p3: 'Sony avance qu’il serait peu plausible qu’un consommateur raisonnable confonde cette licence avec la possession d’un objet physique. L’entreprise prend notamment l’exemple de Resident Evil Requiem : plusieurs personnes peuvent acheter le même fichier numérique, ce qui distingue cette transaction d’un bien matériel vendu une seule fois.', p4: 'C’est précisément ce raisonnement que la justice devra examiner. Le dossier ne signifie pas que les jeux déjà achetés vont disparaître, ni que Sony a déjà été condamné. Il pose une question de transparence : les conditions générales et les liens de licence sont-ils suffisamment visibles pour corriger l’impression créée par le bouton « Acheter » ?',
    take: 'RÉSUMÉ', takeText: 'L’enjeu dépasse Sony : cette affaire peut clarifier la manière dont les plateformes doivent présenter la propriété, la licence et les droits réels liés à un achat numérique.', source: 'Réécrit à partir de l’article Jeuxvideo.com du 20.09.2026, recoupé avec CNET et Polygon.', sourceUrl: 'https://www.jeuxvideo.com/news/2104611/les-joueurs-ne-possedent-pas-leurs-jeux-ps5-ils-ne-font-que-les-louer-sony-l-affirme-en-justice.htm', sourceDetail: 'Lire l’article de référence', credit: 'Image : visuel officiel PlayStation Store — Sony Interactive Entertainment.',
    sentiment: 'negative'
  }
};

function Arrow(){ return <span aria-hidden="true">↗</span>; }

export default function CurrentNews({ slug, slugPrefix }) {
  const routeSlug = useParams().slug;
  const allStories = { ...autoStories, ...stories };
  // Les routes préfixées (ex. : /news/cinema/:slug) passent slugPrefix pour
  // reconstruire la clé d'article (« cinema/<slug> ») : l'articleId reste
  // identique à celui des cartes du hub correspondant (vues, réactions…).
  const key = slug || (routeSlug && slugPrefix ? `${slugPrefix}${routeSlug}` : routeSlug);
  const story = key ? allStories[key] : stories['persona-6-switch-2'];
  if (!story) return <NotFound />;
  const articleId = `/news/${key}`;
  const sentimentId = inferSentimentForStory(story);
  const meta = sentimentMeta(sentimentId);
  const [views, setViews] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // Incrément global (anti-spam 30 min par navigateur) + lecture du total
    incrementArticleView(articleId).catch(() => {});
    getArticleViews([articleId]).then((map) => {
      if (!cancelled) setViews(map[normalizeArticleId(articleId)] ?? null);
    });
    // Rafraîchit le total après l'incrément (le RPC retourne déjà la valeur,
    // mais on relit pour couvrir le fallback local).
    const t = setTimeout(() => {
      getArticleViews([articleId]).then((map) => {
        if (!cancelled) setViews(map[normalizeArticleId(articleId)] ?? null);
      });
    }, 900);
    return () => { cancelled = true; clearTimeout(t); };
  }, [articleId]);

  return <>
    <section className="article-hero wrap"><div className="section-label"><span>ACTUS À LA UNE</span><span>{story.date} · {story.category}</span></div><div className="article-heading"><div><p className="eyebrow"><span className="live-dot" /> {story.auto ? 'ACTU DU JOUR · LET’S PLAY' : 'RÉÉCRIT POUR LET’S PLAY'}</p><h1>{story.title}<br/><em>{story.accent}</em></h1><p className="article-dek">{story.dek}</p><div className="article-byline"><span>LET’S PLAY</span><span>4 MIN DE LECTURE</span>{views != null && <span className="article-views-inline"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" width="14" height="14"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3.2" /></svg> {formatViews(views)} vues</span>}<span className={`article-sentiment-inline ${meta.color}`} title={meta.label}>{meta.emoji} {meta.label}</span></div></div><div className="article-cover hud-frame"><img src={`${base}${story.thumbnail || story.image}`} alt={story.imageAlt} /><div><small>{story.category}</small><strong>{story.cover}</strong></div><span className={`news-sentiment ${meta.color}`} style={{ top: 12, right: 12 }} aria-label={meta.label} title={meta.label}>{meta.emoji}</span>{views != null && <span className="news-views" style={{ left: 12, bottom: 12 }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3.2" /></svg>{formatViews(views)}</span>}</div></div></section>
    <main className="article-layout wrap">
      <article className="article-body">
        <p className="article-lead">{story.lead}</p>
        {story.intro ? <p>{story.intro}</p> : null}
        {story.video ? <section className="article-video"><div className="section-label"><span><b>VIDÉO</b> / OFFICIELLE</span><span>{story.category}</span></div><div className="article-video-frame"><iframe src={youTubeEmbedUrl(story.video)} title={story.videoTitle} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div><p className="article-source">Vidéo officielle : {story.videoTitle} · <a href={`https://www.youtube.com/watch?v=${story.video}`} target="_blank" rel="noreferrer">Voir sur YouTube</a></p></section> : null}

        <h2>{story.h2}</h2>
        <p>{story.p1}</p>

        {story.spoiler ? (
          <SpoilerAlert title={story.spoiler.title}>
            <p>{story.spoiler.content}</p>
          </SpoilerAlert>
        ) : null}

        {story.spoilers?.map((sp, i) => (
          <SpoilerAlert key={i} title={sp.title}>
            <p>{sp.content}</p>
          </SpoilerAlert>
        ))}

        {story.quote ? <div className="article-pullquote"><span>“</span><p>{story.quote}</p><small>{story.quoteBy}</small></div> : null}
        {story.p2 ? <p>{story.p2}</p> : null}

        {story.p3 ? (
          <>
            <h2>{story.h2b}</h2>
            <p>{story.p3}</p>
          </>
        ) : story.h2b ? <h2>{story.h2b}</h2> : null}

        {story.spoiler2 ? (
          <SpoilerAlert title={story.spoiler2.title}>
            <p>{story.spoiler2.content}</p>
          </SpoilerAlert>
        ) : null}

        {story.p4 ? <p>{story.p4}</p> : null}

        {story.takeText ? <div className="article-endnote"><span className="live-dot" /><strong>{story.take}</strong><span>{story.takeText}</span></div> : null}
        {story.source ? <p className="article-source">{story.source} <a href={story.sourceUrl} target="_blank" rel="noreferrer">{story.sourceDetail}</a></p> : null}
        {story.credit ? <p className="article-source">{story.credit}</p> : null}
      </article>

      <aside className="article-aside">
        <div className="aside-card"><span className="aside-kicker">EN BREF</span><strong>{story.date}</strong><strong>{story.category}</strong><strong>{story.auto ? 'ACTU DU JOUR · SOURCÉE' : 'LET’S PLAY ORIGINAL'}</strong>{views != null && <><span className="aside-kicker" style={{ marginTop: 14 }}>VUES GLOBALES</span><strong>{formatViews(views)} vues</strong></>}<span className="aside-kicker" style={{ marginTop: 14 }}>TON DE L’ACTU</span><strong className={`sentiment-text ${meta.color}`}>{meta.emoji} {meta.label}</strong></div>
        <div className="aside-card aside-card-accent"><span className="aside-kicker">À LIRE AUSSI</span><strong>LES ACTUS À LA UNE</strong><p>Retrouvez les dernières annonces et analyses de la rédaction.</p><Link className="arrow-link" to="/news">RETOUR AUX ACTUS <Arrow/></Link></div>
      </aside>
    </main>
    <ArticleEngagement articleId={`/news/${key}`} title={`${story.title} ${story.accent}`} />
    <Comments />
    <section className="cta wrap"><div><p className="eyebrow"><span className="live-dot" /> LA SUITE SUR LET’S PLAY</p><h2>RESTEZ DANS<br/><em>LE GAME.</em></h2></div><Link className="button button-yellow" to="/news">VOIR LES ACTUS <Arrow/></Link></section>
  </>;
}

export { stories };
