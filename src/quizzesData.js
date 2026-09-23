/**
 * Quizz gaming de la rédaction Let's Play.
 * ----------------------------------------
 * Chaque quizz est une donnée : la page `/quizz` (grille + quizz du jour) et
 * `/quizz/:slug` (partie + corrections) ne font que les rendre. Le contenu
 * est rédigé en français ; la structure `labels` / `q` / `why` accepte déjà
 * `en` et `ar` (le rendu se replie sur `en` puis `fr` tant que la traduction
 * manque).
 *
 * Ajouter un quizz = ajouter une entrée ici : la page, la recherche
 * (`src/search/searchIndex.js`), la rotation du quizz du jour et le succès
 * « Tour complet » le prennent en compte (penser à mettre à jour la cible
 * du succès dans `src/achievements/catalog.js` si le nombre change).
 *
 * `videoId` sert de miniature (mêmes miniatures YouTube publiques que les
 * dossiers du site) ; `source` renvoie vers l'article maison qui approfondit
 * le sujet du quizz.
 */
import { baseUrl as base } from './data';

export const baseUrl = base;

/** Libellé traduit d'un bloc de contenu, repli en → fr. */
export function quizLabel(labels, lang = 'fr') {
  if (!labels) return '';
  return labels[lang] || labels.en || labels.fr || '';
}

export const QUIZ_TAGS = ['Culture', 'Rétro', 'Souls-like', 'RPG', 'E-sport', 'Studios', 'Tech', 'Cinéma'];

export const quizzes = [
  {
    slug: 'culture-gaming',
    route: '/quizz/culture-gaming',
    videoId: 't1Re8ki_gsw',
    tag: 'Culture',
    difficulty: 'easy',
    keywords: 'quizz culture gaming général mario zelda minecraft',
    source: '/dossiers/choc-generations-gaming',
    labels: {
      fr: { title: 'Culture gaming générale', text: 'Mario, Minecraft, GG… les bases que tout joueur connaît par cœur. Le quizz d’échauffement.' },
    },
    questions: [
      { id: 'cg1', q: { fr: 'Quelle entreprise a créé le personnage de Mario ?' }, choices: [{ fr: 'Sega' }, { fr: 'Nintendo' }, { fr: 'Sony' }, { fr: 'Atari' }], answer: 1, why: { fr: 'Mario naît dans Donkey Kong (1981), créé par Shigeru Miyamoto chez Nintendo.' } },
      { id: 'cg2', q: { fr: 'Que signifie le sigle « RPG » ?' }, choices: [{ fr: 'Role-Playing Game' }, { fr: 'Real Play Game' }, { fr: 'Rapid Performance Gear' }, { fr: 'Replay Game Protocol' }], answer: 0, why: { fr: 'RPG = Role-Playing Game, le jeu de rôle : on y incarne un personnage qui progresse.' } },
      { id: 'cg3', q: { fr: 'Quelle est la console de salon la plus vendue de l’histoire ?' }, choices: [{ fr: 'La Nintendo DS' }, { fr: 'La Game Boy' }, { fr: 'La PlayStation 2' }, { fr: 'La PlayStation 4' }], answer: 2, why: { fr: 'Avec environ 160 millions d’unités, la PS2 domine le classement depuis plus de vingt ans — c’est notre dossier « La PS2, la reine ».' } },
      { id: 'cg4', q: { fr: 'Comment s’appelle le héros de The Legend of Zelda ?' }, choices: [{ fr: 'Zelda' }, { fr: 'Ganon' }, { fr: 'Epona' }, { fr: 'Link' }], answer: 3, why: { fr: 'Zelda est la princesse : le héros que l’on contrôle s’appelle Link.' } },
      { id: 'cg5', q: { fr: 'Quel studio développe Fortnite ?' }, choices: [{ fr: 'Epic Games' }, { fr: 'Respawn' }, { fr: 'Ubisoft' }, { fr: 'Valve' }], answer: 0, why: { fr: 'Fortnite est développé par Epic Games, aussi connu pour le moteur Unreal.' } },
      { id: 'cg6', q: { fr: 'Dans Minecraft, quelle créature verte explose en silence près de vous ?' }, choices: [{ fr: 'Le zombie' }, { fr: 'Le creeper' }, { fr: 'L’enderman' }, { fr: 'Le squelette' }], answer: 1, why: { fr: 'Le creeper (Tssss… boum) est devenu la mascotte paradoxale du jeu.' } },
      { id: 'cg7', q: { fr: 'À la fin d’une partie, que signifie « GG » ?' }, choices: [{ fr: 'Get Going' }, { fr: 'Great Goal' }, { fr: 'Good Game' }, { fr: 'Game Over' }], answer: 2, why: { fr: 'GG = Good Game, le salut respectueux échangé entre joueurs.' } },
      { id: 'cg8', q: { fr: 'En quelle année la Game Boy originale est-elle sortie au Japon ?' }, choices: [{ fr: '1985' }, { fr: '1989' }, { fr: '1993' }, { fr: '1997' }], answer: 1, why: { fr: 'La Game Boy sort en 1989 au Japon et en Amérique du Nord, en 1990 en Europe.' } },
    ],
  },
  {
    slug: 'consoles-retro',
    route: '/quizz/consoles-retro',
    videoId: 'A2VPhWOUMHI',
    tag: 'Rétro',
    difficulty: 'medium',
    keywords: 'quizz rétro consoles playstation xbox sega nintendo dreamcast',
    source: '/dossiers/25-ans-playstation-2',
    labels: {
      fr: { title: 'Consoles & rétro', text: 'PS1, PS2, Xbox 360, Dreamcast : les machines qui ont façonné nos salons, de nos dossiers histoire.' },
    },
    questions: [
      { id: 'cr1', q: { fr: 'Quelle est la première console de salon de Sony ?' }, choices: [{ fr: 'La PlayStation' }, { fr: 'La PSP' }, { fr: 'La PS2' }, { fr: 'La Saturn' }], answer: 0, why: { fr: 'La PlayStation sort en décembre 1994 au Japon : c’est le premier coup de Sony dans le salon.' } },
      { id: 'cr2', q: { fr: 'Quelle console a rendu célèbre le « Red Ring of Death » ?' }, choices: [{ fr: 'La PS3' }, { fr: 'La GameCube' }, { fr: 'La Xbox 360' }, { fr: 'La Dreamcast' }], answer: 2, why: { fr: 'Le triple anneau rouge de la Xbox 360 signalait une panne matérielle — raconté dans notre dossier « 20 ans de Xbox 360 ».' } },
      { id: 'cr3', q: { fr: 'Quelle est la dernière console de salon de Sega ?' }, choices: [{ fr: 'La Saturn' }, { fr: 'La Mega Drive' }, { fr: 'La Game Gear' }, { fr: 'La Dreamcast' }], answer: 3, why: { fr: 'Après la Dreamcast (1998 au Japon), Sega quitte le matériel pour se consacrer à l’édition.' } },
      { id: 'cr4', q: { fr: 'Quel support la PlayStation originale a-t-elle imposé face aux cartouches ?' }, choices: [{ fr: 'Le CD-ROM' }, { fr: 'Le DVD' }, { fr: 'La disquette' }, { fr: 'Le Blu-ray' }], answer: 0, why: { fr: 'Le CD-ROM, moins cher et plus capacitaire, a changé l’économie du jeu vidéo.' } },
      { id: 'cr5', q: { fr: 'En quelle année la Nintendo 64 sort-elle en Europe ?' }, choices: [{ fr: '1996' }, { fr: '1997' }, { fr: '1998' }, { fr: '2000' }], answer: 1, why: { fr: 'Lancée en 1996 au Japon et aux États-Unis, la N64 arrive en Europe en mars 1997.' } },
      { id: 'cr6', q: { fr: 'Quelle console portable combine deux écrans dont un tactile ?' }, choices: [{ fr: 'La PSP' }, { fr: 'La Game Boy Advance' }, { fr: 'La PS Vita' }, { fr: 'La Nintendo DS' }], answer: 3, why: { fr: 'DS = Dual Screen : le stylet et le tactile en ont fait un phénomène mondial.' } },
      { id: 'cr7', q: { fr: 'La manette « DualShock » équipe les consoles de…' }, choices: [{ fr: 'Nintendo' }, { fr: 'Sony' }, { fr: 'Microsoft' }, { fr: 'Sega' }], answer: 1, why: { fr: 'Les deux moteurs de vibration du DualShock accompagnent les PlayStation depuis 1997.' } },
      { id: 'cr8', q: { fr: 'Quelle console est vendue avec Wii Sports pour conquérir les familles ?' }, choices: [{ fr: 'La Wii' }, { fr: 'La Switch' }, { fr: 'La GameCube' }, { fr: 'La Wii U' }], answer: 0, why: { fr: 'En 2006, la Wii et sa télécommande à détection de mouvements élargissent le public du jeu vidéo.' } },
    ],
  },
  {
    slug: 'souls-fromsoftware',
    route: '/quizz/souls-fromsoftware',
    videoId: 'OH51fSHznwg',
    tag: 'Souls-like',
    difficulty: 'hard',
    keywords: 'quizz souls fromsoftware dark souls elden ring bloodborne miyazaki',
    source: '/dossiers/pourquoi-les-souls',
    labels: {
      fr: { title: 'Souls & FromSoftware', text: 'Lordran, Yharnam, l’Entre-Terre : un quizz exigeant, à l’image des jeux dont il s’inspire.' },
    },
    questions: [
      { id: 'sf1', q: { fr: 'Quel jeu de 2009 lance la lignée des « Souls » ?' }, choices: [{ fr: 'Dark Souls' }, { fr: 'King’s Field' }, { fr: 'Demon’s Souls' }, { fr: 'Sekiro' }], answer: 2, why: { fr: 'Demon’s Souls (2009) pose les bases ; Dark Souls (2011) donne son nom au genre.' } },
      { id: 'sf2', q: { fr: 'Qui réalise Dark Souls et Elden Ring ?' }, choices: [{ fr: 'Hideo Kojima' }, { fr: 'Shigeru Miyamoto' }, { fr: 'Hidetaka Miyazaki' }, { fr: 'Yoko Taro' }], answer: 2, why: { fr: 'Hidetaka Miyazaki, président de FromSoftware, signe les deux.' } },
      { id: 'sf3', q: { fr: 'Dans Dark Souls, que deviennent vos âmes à votre mort ?' }, choices: [{ fr: 'Elles disparaissent à jamais' }, { fr: 'Elles tombent au sol, récupérables une fois' }, { fr: 'Elles sont partagées entre les joueurs' }, { fr: 'La moitié est confisquée' }], answer: 1, why: { fr: 'Vous les perdez sur le lieu de votre mort : une seconde mort avant de les reprendre les condamne.' } },
      { id: 'sf4', q: { fr: 'Quel jeu FromSoftware remporte le GOTY aux Game Awards 2022 ?' }, choices: [{ fr: 'Sekiro' }, { fr: 'Elden Ring' }, { fr: 'Dark Souls III' }, { fr: 'Armored Core VI' }], answer: 1, why: { fr: 'Elden Ring rafle le jeu de l’année 2022, co-créé avec George R. R. Martin.' } },
      { id: 'sf5', q: { fr: 'Dans quel pays se déroule Sekiro: Shadows Die Twice ?' }, choices: [{ fr: 'La Chine' }, { fr: 'La Corée' }, { fr: 'L’Inde' }, { fr: 'Le Japon' }], answer: 3, why: { fr: 'Sekiro se déroule dans un Japon de la fin Sengoku réinventé.' } },
      { id: 'sf6', q: { fr: 'Comment s’appelle le monde exploré dans Elden Ring ?' }, choices: [{ fr: 'Lordran' }, { fr: 'L’Entre-Terre' }, { fr: 'Yharnam' }, { fr: 'Boletaria' }], answer: 1, why: { fr: 'The Lands Between, « l’Entre-Terre » en français ; Lordran et Boletaria viennent de Dark/Demon’s Souls.' } },
      { id: 'sf7', q: { fr: 'Lequel de ces jeux n’est PAS développé par FromSoftware ?' }, choices: [{ fr: 'Bloodborne' }, { fr: 'Nioh' }, { fr: 'Sekiro' }, { fr: 'Elden Ring' }], answer: 1, why: { fr: 'Nioh est signé Team Ninja (Koei Tecmo), souvent confondu avec un Souls.' } },
      { id: 'sf8', q: { fr: 'Dans quelle ville cauchemardesque erre le chasseur de Bloodborne ?' }, choices: [{ fr: 'Yharnam' }, { fr: 'Majula' }, { fr: 'Lordran' }, { fr: 'Anor Londo' }], answer: 0, why: { fr: 'Yharnam, la cité du sang — notre épisode « Pourquoi les Souls ? » en parle longuement.' } },
    ],
  },
  {
    slug: 'rpg-legends',
    route: '/quizz/rpg-legends',
    videoId: '0ThNyFItASM',
    tag: 'RPG',
    difficulty: 'medium',
    keywords: 'quizz rpg zelda witcher skyrim persona final fantasy cyberpunk',
    source: '/dossiers/let-play-awards-2025',
    labels: {
      fr: { title: 'RPG légendaires', text: 'De Zelda à Cyberpunk, en passant par Skyrim et Persona : les mondes qui ont défini le genre.' },
    },
    questions: [
      { id: 'rl1', q: { fr: 'Quel studio développe The Elder Scrolls V: Skyrim ?' }, choices: [{ fr: 'CD Projekt Red' }, { fr: 'Obsidian' }, { fr: 'Bethesda Game Studios' }, { fr: 'BioWare' }], answer: 2, why: { fr: 'Bethesda Game Studios signe Skyrim (2011), encore joué partout quinze ans après.' } },
      { id: 'rl2', q: { fr: 'Dans The Witcher 3, quel est le métier de Geralt ?' }, choices: [{ fr: 'Chevalier' }, { fr: 'Sorcilleur, chasseur de monstres' }, { fr: 'Mage de guerre' }, { fr: 'Forgeron' }], answer: 1, why: { fr: 'Geralt de Riv est un sorcilleur : un mutant entraîné à chasser les monstres.' } },
      { id: 'rl3', q: { fr: 'Quelle série créée par Hironobu Sakaguchi a défini le JRPG ?' }, choices: [{ fr: 'Final Fantasy' }, { fr: 'Dragon Quest' }, { fr: 'Persona' }, { fr: 'Xenoblade' }], answer: 0, why: { fr: 'Sakaguchi lance Final Fantasy en 1987 chez Square, l’autre pilier du genre.' } },
      { id: 'rl4', q: { fr: 'Dans quelle ville se déroule principalement Persona 5 ?' }, choices: [{ fr: 'Osaka' }, { fr: 'Kyoto' }, { fr: 'Yokohama' }, { fr: 'Tokyo' }], answer: 3, why: { fr: 'Les Voleurs fantômes arpentent Tokyo, de Shibuya à leurs planques café.' } },
      { id: 'rl5', q: { fr: 'Dans Skyrim, comment appelle-t-on l’enfant de dragon que vous incarnez ?' }, choices: [{ fr: 'Dovahkiin' }, { fr: 'Thane' }, { fr: 'Grisbarbe' }, { fr: 'Alduin' }], answer: 0, why: { fr: 'Dovahkiin, l’enfant de dragon, absorbe les âmes des dragons et parle le Thu’um.' } },
      { id: 'rl6', q: { fr: 'Quel RPG en monde ouvert se déroule à Night City ?' }, choices: [{ fr: 'Starfield' }, { fr: 'Cyberpunk 2077' }, { fr: 'Deus Ex' }, { fr: 'GTA V' }], answer: 1, why: { fr: 'Night City est la mégalopole de Cyberpunk 2077, par CD Projekt Red.' } },
      { id: 'rl7', q: { fr: 'Dragon Quest et Final Fantasy sont aujourd’hui réunis sous quelle bannière ?' }, choices: [{ fr: 'Capcom' }, { fr: 'Konami' }, { fr: 'Square Enix' }, { fr: 'Sega' }], answer: 2, why: { fr: 'La fusion Square-Enix (2003) réunit les deux dynasties du JRPG.' } },
      { id: 'rl8', q: { fr: 'Quel Zelda de 2017 réinvente la série en monde ouvert ?' }, choices: [{ fr: 'Twilight Princess' }, { fr: 'Skyward Sword' }, { fr: 'Majora’s Mask' }, { fr: 'Breath of the Wild' }], answer: 3, why: { fr: 'Breath of the Wild (2017) casse la formule Zelda : exploration totale et physique émergente.' } },
    ],
  },
  {
    slug: 'esport-competition',
    route: '/quizz/esport-competition',
    videoId: 'twbaM8fiXpo',
    tag: 'E-sport',
    difficulty: 'medium',
    keywords: 'quizz esport counter-strike league of legends free fire mortak kombat rocket league',
    source: '/events/ooredoo',
    labels: {
      fr: { title: 'E-sport & compétition', text: 'CS, LoL, Free Fire, Rocket League : la scène compétitive, de Séoul à Alger (FFAC2023).' },
    },
    questions: [
      { id: 'ec1', q: { fr: 'Quel mod de Half-Life (2000) est devenu la référence du FPS tactique ?' }, choices: [{ fr: 'Counter-Strike' }, { fr: 'Team Fortress' }, { fr: 'Day of Defeat' }, { fr: 'Garry’s Mod' }], answer: 0, why: { fr: 'Counter-Strike, mod communautaire devenu franchise majeure de l’e-sport.' } },
      { id: 'ec2', q: { fr: 'Dans League of Legends, que faut-il détruire pour gagner ?' }, choices: [{ fr: 'Le Baron' }, { fr: 'Le Nexus' }, { fr: 'L’inhibiteur' }, { fr: 'Le trône' }], answer: 1, why: { fr: 'Le Nexus adverse est le cœur de la base : sa chute termine la partie.' } },
      { id: 'ec3', q: { fr: 'Free Fire, star du FFAC2023 en Algérie, est édité par…' }, choices: [{ fr: 'Tencent' }, { fr: 'NetEase' }, { fr: 'Garena' }, { fr: 'Activision' }], answer: 2, why: { fr: 'Garena édite Free Fire, le battle royale mobile qui a rempli nos championnats FFAC.' } },
      { id: 'ec4', q: { fr: 'Quel STR a fait de la Corée du Sud la nation historique de l’e-sport ?' }, choices: [{ fr: 'Warcraft III' }, { fr: 'Age of Empires II' }, { fr: 'Command & Conquer' }, { fr: 'StarCraft' }], answer: 3, why: { fr: 'StarCraft (1998) y devient sport national télévisé, bien avant le reste du monde.' } },
      { id: 'ec5', q: { fr: 'Quelle série de football d’EA est devenue EA Sports FC en 2023 ?' }, choices: [{ fr: 'PES' }, { fr: 'eFootball' }, { fr: 'Football Manager' }, { fr: 'FIFA' }], answer: 3, why: { fr: 'Après trente ans de partenariat, EA quitte la licence FIFA et renomme sa série.' } },
      { id: 'ec6', q: { fr: 'En format standard, combien de joueurs par équipe sur le terrain de Rocket League ?' }, choices: [{ fr: '2' }, { fr: '3' }, { fr: '5' }, { fr: '11' }], answer: 1, why: { fr: 'Le format compétitif standard est le 3v3.' } },
      { id: 'ec7', q: { fr: 'Quelle série de combat met en scène Scorpion et Sub-Zero ?' }, choices: [{ fr: 'Street Fighter' }, { fr: 'Tekken' }, { fr: 'Mortal Kombat' }, { fr: 'Soulcalibur' }], answer: 2, why: { fr: 'Scorpion et Sub-Zero sont les rivaux emblématiques de Mortal Kombat (NetherRealm).' } },
      { id: 'ec8', q: { fr: 'Que signifie l’acronyme « MOBA » ?' }, choices: [{ fr: 'Multiplayer Online Battle Arena' }, { fr: 'Modern Online Battle Attack' }, { fr: 'Mobile Open Battle Area' }, { fr: 'Massive Online Board Adventure' }], answer: 0, why: { fr: 'MOBA = Multiplayer Online Battle Arena, la famille de LoL et Dota 2.' } },
    ],
  },
  {
    slug: 'studios-legends',
    route: '/quizz/studios-legends',
    videoId: 'aTs0zhm6Leg',
    tag: 'Studios',
    difficulty: 'hard',
    keywords: 'quizz studios créateurs kojima miyamoto naughty dog capcom ubisoft rockstar',
    source: '/dossiers/goya-hicosoft',
    labels: {
      fr: { title: 'Studios & créateurs', text: 'Kojima, Miyamoto, Naughty Dog, CD Projekt Red… les signatures derrière les mondes. Clin d’œil à notre dossier HicoSoft.' },
    },
    questions: [
      { id: 'sl1', q: { fr: 'Qui a créé Metal Gear avant de fonder Kojima Productions ?' }, choices: [{ fr: 'Hideo Kojima' }, { fr: 'Hidetaka Miyazaki' }, { fr: 'Shigeru Miyamoto' }, { fr: 'Yu Suzuki' }], answer: 0, why: { fr: 'Hideo Kojima crée Metal Gear chez Konami (1987) puis vole de ses propres ailes en 2015.' } },
      { id: 'sl2', q: { fr: 'Quel studio signe The Last of Us et Uncharted ?' }, choices: [{ fr: 'Naughty Dog' }, { fr: 'Insomniac Games' }, { fr: 'Santa Monica Studio' }, { fr: 'Guerrilla' }], answer: 0, why: { fr: 'Naughty Dog, studio californien de Sony, signe les deux sagas.' } },
      { id: 'sl3', q: { fr: 'Quelle entreprise publie la série Assassin’s Creed ?' }, choices: [{ fr: 'Ubisoft' }, { fr: 'EA' }, { fr: 'Take-Two' }, { fr: 'Bandai Namco' }], answer: 0, why: { fr: 'Assassin’s Creed est la franchise phare d’Ubisoft depuis 2007.' } },
      { id: 'sl4', q: { fr: 'Qui est considéré comme le père de Mario et de Zelda ?' }, choices: [{ fr: 'Shigeru Miyamoto' }, { fr: 'Satoru Iwata' }, { fr: 'Masahiro Sakurai' }, { fr: 'Hironobu Sakaguchi' }], answer: 0, why: { fr: 'Miyamoto crée Mario, Zelda, Donkey Kong… et reste l’âme créative de Nintendo.' } },
      { id: 'sl5', q: { fr: 'Quel studio polonais a créé The Witcher et Cyberpunk 2077 ?' }, choices: [{ fr: 'Techland' }, { fr: 'CD Projekt Red' }, { fr: '11 bit studios' }, { fr: 'Bloober Team' }], answer: 1, why: { fr: 'CD Projekt Red, basé à Varsovie, adapte Sapkowski puis invente Night City.' } },
      { id: 'sl6', q: { fr: 'Sonic a été créé pour devenir la mascotte de quelle entreprise ?' }, choices: [{ fr: 'Nintendo' }, { fr: 'Atari' }, { fr: 'Sega' }, { fr: 'Sony' }], answer: 2, why: { fr: 'Sonic (1991) est la réponse de Sega au Mario de Nintendo.' } },
      { id: 'sl7', q: { fr: 'Quel studio développe GTA et Red Dead Redemption ?' }, choices: [{ fr: 'Rockstar Games' }, { fr: '2K Games' }, { fr: 'EA' }, { fr: 'Ubisoft Toronto' }], answer: 0, why: { fr: 'Rockstar Games (avec Rockstar North en Écosse) signe les deux open worlds.' } },
      { id: 'sl8', q: { fr: 'Quelle entreprise japonaise publie Resident Evil et Street Fighter ?' }, choices: [{ fr: 'Capcom' }, { fr: 'Konami' }, { fr: 'Square Enix' }, { fr: 'FromSoftware' }], answer: 0, why: { fr: 'Capcom, à Osaka, cumule ces deux licences historiques — et Monster Hunter.' } },
    ],
  },
  {
    slug: 'tech-hardware',
    route: '/quizz/tech-hardware',
    videoId: 'Zl6crcrPnPQ',
    tag: 'Tech',
    difficulty: 'medium',
    keywords: 'quizz tech matériel gpu nvidia amd nvme ray tracing usb-c',
    labels: {
      fr: { title: 'Tech & matériel', text: 'GPU, NVMe, ray tracing, USB-C : le vocabulaire de la machine, côté segment Tech de l’émission.' },
    },
    questions: [
      { id: 'th1', q: { fr: 'Quelle entreprise conçoit les GPU GeForce ?' }, choices: [{ fr: 'AMD' }, { fr: 'NVIDIA' }, { fr: 'Intel' }, { fr: 'Qualcomm' }], answer: 1, why: { fr: 'NVIDIA signe la gamme GeForce ; AMD riposte avec les Radeon.' } },
      { id: 'th2', q: { fr: 'En parlant d’affichage, que mesurent les « FPS » ?' }, choices: [{ fr: 'La latence' }, { fr: 'Les images par seconde' }, { fr: 'La résolution' }, { fr: 'La température du panneau' }], answer: 1, why: { fr: 'Frames Per Second : la fluidité de l’image, à distinguer des Hz de la dalle.' } },
      { id: 'th3', q: { fr: 'Quelle technologie AMD concurrence le DLSS de NVIDIA ?' }, choices: [{ fr: 'FSR' }, { fr: 'RTX' }, { fr: 'XeSS' }, { fr: 'FreeSync' }], answer: 0, why: { fr: 'FidelityFX Super Resolution, l’upscaling d’AMD — XeSS vient d’Intel, FreeSync gère la synchronisation.' } },
      { id: 'th4', q: { fr: 'Quelle interface équipe les SSD modernes les plus rapides ?' }, choices: [{ fr: 'SATA' }, { fr: 'IDE' }, { fr: 'NVMe' }, { fr: 'SCSI' }], answer: 2, why: { fr: 'NVMe sur port M.2 exploite le PCIe : des débits que SATA ne peut pas suivre.' } },
      { id: 'th5', q: { fr: 'Dans un processeur, à quoi servent les cœurs ?' }, choices: [{ fr: 'À exécuter plusieurs tâches en parallèle' }, { fr: 'À refroidir la puce' }, { fr: 'À stocker les données' }, { fr: 'À générer l’image' }], answer: 0, why: { fr: 'Chaque cœur exécute un flux d’instructions : plus de cœurs, plus de parallélisme.' } },
      { id: 'th6', q: { fr: 'Quel port de carte graphique a disparu des PC modernes ?' }, choices: [{ fr: 'PCI Express' }, { fr: 'AGP' }, { fr: 'M.2' }, { fr: 'Thunderbolt' }], answer: 1, why: { fr: 'L’AGP (fin des années 90) a cédé sa place au PCI Express au milieu des années 2000.' } },
      { id: 'th7', q: { fr: 'Le ray tracing consiste à…' }, choices: [{ fr: 'simuler le trajet de la lumière' }, { fr: 'compresser les textures' }, { fr: 'augmenter les FPS' }, { fr: 'réduire la latence réseau' }], answer: 0, why: { fr: 'On suit les rayons lumineux pour des reflets et ombres physiquement plausibles — coûteux en GPU.' } },
      { id: 'th8', q: { fr: 'Quel connecteur transporte image, données et charge dans un seul câble ?' }, choices: [{ fr: 'VGA' }, { fr: 'DVI' }, { fr: 'Péritel' }, { fr: 'USB-C' }], answer: 3, why: { fr: 'L’USB-C (avec DisplayPort Alt Mode et Power Delivery) remplace peu à peu tout le reste.' } },
    ],
  },
  {
    slug: 'cinema-pop-culture',
    route: '/quizz/cinema-pop-culture',
    videoId: 'HzigJZOxz2o',
    tag: 'Cinéma',
    difficulty: 'easy',
    keywords: 'quizz cinéma séries adaptations arcane edgerunners witcher ready player one',
    labels: {
      fr: { title: 'Cinéma & pop culture', text: 'Adaptations, séries et films gamers : du PNJ de Free Guy au Ready Player One de Spielberg.' },
    },
    questions: [
      { id: 'cp1', q: { fr: 'Quelle franchise de jeux a été adaptée en série HBO en 2023 ?' }, choices: [{ fr: 'Halo' }, { fr: 'Fallout' }, { fr: 'The Last of Us' }, { fr: 'Tomb Raider' }], answer: 2, why: { fr: 'The Last of Us (HBO, 2023) ; Fallout suivra sur Prime Video en 2024.' } },
      { id: 'cp2', q: { fr: 'Quelle série Netflix adapte l’univers de The Witcher ?' }, choices: [{ fr: 'The Witcher' }, { fr: 'Halo' }, { fr: 'Castlevania' }, { fr: 'Arcane' }], answer: 0, why: { fr: 'Henry Cavill y incarne Geralt dans les trois premières saisons.' } },
      { id: 'cp3', q: { fr: 'Quelle série adapte l’univers de League of Legends ?' }, choices: [{ fr: 'Arcane' }, { fr: 'Edgerunners' }, { fr: 'Sonic Prime' }, { fr: 'Splinter Cell' }], answer: 0, why: { fr: 'Arcane (Riot × Netflix) suit Jinx et Vi à Piltover et Zaun.' } },
      { id: 'cp4', q: { fr: 'Dans « Free Guy », le héros découvre qu’il est…' }, choices: [{ fr: 'un PNJ de jeu vidéo' }, { fr: 'un streamer' }, { fr: 'un speedrunner' }, { fr: 'un développeur' }], answer: 0, why: { fr: 'Ryan Reynolds joue un personnage d’arrière-plan qui prend conscience dans « Free City ».' } },
      { id: 'cp5', q: { fr: 'Qui a réalisé « Ready Player One » (2018) ?' }, choices: [{ fr: 'Steven Spielberg' }, { fr: 'James Cameron' }, { fr: 'Denis Villeneuve' }, { fr: 'Christopher Nolan' }], answer: 0, why: { fr: 'Spielberg adapte le roman d’Ernest Cline et son déluge de références pop.' } },
      { id: 'cp6', q: { fr: 'Quel manga cyberpunk a donné un film culte en 1995 puis la série SAC ?' }, choices: [{ fr: 'Akira' }, { fr: 'Berserk' }, { fr: 'Ghost in the Shell' }, { fr: 'Evangelion' }], answer: 2, why: { fr: 'Ghost in the Shell de Masamune Shirow, filmé par Mamoru Oshii en 1995.' } },
      { id: 'cp7', q: { fr: 'Quelle série anime est née dans l’univers de Cyberpunk 2077 ?' }, choices: [{ fr: 'Cyberpunk: Edgerunners' }, { fr: 'Arcane' }, { fr: 'Castlevania' }, { fr: 'Devil May Cry' }], answer: 0, why: { fr: 'Edgerunners (Studio Trigger, 2022) — et l’extension Phantom Liberty a suivi.' } },
      { id: 'cp8', q: { fr: 'Quel film d’animation plonge dans un monde de bornes d’arcade, avec Ralph la casse ?' }, choices: [{ fr: 'Les Mondes de Ralph' }, { fr: 'Pixels' }, { fr: 'Tron' }, { fr: 'Ready Player One' }], answer: 0, why: { fr: 'Wreck-It Ralph / « Les Mondes de Ralph » (Disney, 2012), truffé de caméos gaming.' } },
    ],
  },
];

/** Retrouvez un quizz par son slug (null si inconnu). */
export function quizBySlug(slug) {
  return quizzes.find((quiz) => quiz.slug === slug) || null;
}
