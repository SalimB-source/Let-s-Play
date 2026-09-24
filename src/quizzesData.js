/**
 * Quizz gaming de la rédaction Let's Play.
 * ----------------------------------------
 * Chaque quizz est une donnée : la page `/quizz` (grille + quizz du jour) et
 * `/quizz/:slug` (partie + corrections) ne font que les rendre. Le contenu
 * est rédigé en français ; la structure `labels` / `q` / `why` accepte déjà
 * `en` et `ar` (le rendu se replie sur `en` puis `fr` tant que la traduction
 * manque).
 *
 * TROIS NIVEAUX PAR QUIZZ — chaque quizz porte trois séries de questions
 * (`levels.easy` / `levels.medium` / `levels.hard`), et c'est À L'INTÉRIEUR
 * du quizz qu'on choisit sa difficulté : le niveau Facile est ouvert, le
 * Confirmé se débloque en terminant le Facile, l'Expert en terminant le
 * Confirmé (règles et stockage dans `src/quizzes/quizProgress.js`). La grille
 * `/quizz`, elle, ne classe plus les quizz par difficulté : tous sont jouables
 * dès l'arrivée, seul le niveau interne se débloque.
 *
 * Ajouter un quizz = ajouter une entrée ici : la page, la recherche
 * (`src/search/searchIndex.js`), la rotation du quizz du jour et le succès
 * « Tour complet » le prennent en compte (penser à mettre à jour la cible
 * du succès dans `src/achievements/catalog.js` si le nombre change).
 *
 * `image` est la miniature du quizz : une illustration maison livrée dans
 * `public/quizzes/<slug>.jpg` (16/9, produite par `quizThumbUrl`). `videoId`
 * reste l'épisode lié au sujet — il sert de repli si l'illustration manque
 * (`QuizThumb` via `src/lib/videoThumbnails.js`), comme il servait de
 * miniature avant. `source` renvoie vers l'article maison qui approfondit le
 * sujet du quizz.
 */
import { baseUrl as base } from './data';

export const baseUrl = base;

/**
 * Miniature d'un quizz : `public/quizzes/<slug>.jpg`.
 * Une seule fabrique pour les douze illustrations — la vérification
 * `npm run check:thumbs` s'assure qu'aucun chemin n'est codé en dur ailleurs.
 */
export function quizThumbUrl(slug) {
  return `${base}quizzes/${slug}.jpg`;
}

/** Libellé traduit d'un bloc de contenu, repli en → fr. */
export function quizLabel(labels, lang = 'fr') {
  if (!labels) return '';
  return labels[lang] || labels.en || labels.fr || '';
}

export const QUIZ_TAGS = ['Culture', 'Rétro', 'Souls-like', 'RPG', 'E-sport', 'Studios', 'Tech', 'Cinéma', 'Consoles', 'PC', 'FPS', 'Horreur', 'Combat', 'Course', 'Indé', 'Nintendo', 'Open World', 'SF'];

/**
 * Les trois niveaux d'un quizz, dans l'ordre de progression : Facile est
 * toujours ouvert, chaque niveau terminé débloque le suivant. Utilisé par le
 * lecteur (sélecteur de niveaux), la page de garde (progression) et les
 * succès (une complétion par niveau).
 */
export const QUIZ_LEVELS = ['easy', 'medium', 'hard'];

/**
 * Alias historique des paliers (`QUIZ_DIFFICULTIES` était le nom employé quand
 * la difficulté se choisissait sans déblocage) : même tableau, même ordre.
 */
export const QUIZ_DIFFICULTIES = QUIZ_LEVELS;

export const quizzes = [
  {
    slug: 'culture-gaming',
    route: '/quizz/culture-gaming',
    videoId: 't1Re8ki_gsw',
    image: quizThumbUrl('culture-gaming'),
    tag: 'Culture',
    keywords: 'quizz culture gaming général mario zelda minecraft',
    source: '/dossiers/choc-generations-gaming',
    labels: {
      fr: { title: 'Culture gaming générale', text: 'Mario, Minecraft, GG… les bases que tout joueur connaît par cœur. Le quizz d’échauffement, en trois niveaux.' },
    },
    levels: {
      easy: [
        { id: 'cg1', q: { fr: 'Quelle entreprise a créé le personnage de Mario ?' }, choices: [{ fr: 'Sega' }, { fr: 'Nintendo' }, { fr: 'Sony' }, { fr: 'Atari' }], answer: 1, why: { fr: 'Mario naît dans Donkey Kong (1981), créé par Shigeru Miyamoto chez Nintendo.' } },
        { id: 'cg2', q: { fr: 'Que signifie le sigle « RPG » ?' }, choices: [{ fr: 'Role-Playing Game' }, { fr: 'Real Play Game' }, { fr: 'Rapid Performance Gear' }, { fr: 'Replay Game Protocol' }], answer: 0, why: { fr: 'RPG = Role-Playing Game, le jeu de rôle : on y incarne un personnage qui progresse.' } },
        { id: 'cg3', q: { fr: 'Quelle est la console de salon la plus vendue de l’histoire ?' }, choices: [{ fr: 'La Nintendo DS' }, { fr: 'La Game Boy' }, { fr: 'La PlayStation 2' }, { fr: 'La PlayStation 4' }], answer: 2, why: { fr: 'Avec environ 160 millions d’unités, la PS2 domine le classement depuis plus de vingt ans — c’est notre dossier « La PS2, la reine ».' } },
        { id: 'cg4', q: { fr: 'Comment s’appelle le héros de The Legend of Zelda ?' }, choices: [{ fr: 'Zelda' }, { fr: 'Ganon' }, { fr: 'Epona' }, { fr: 'Link' }], answer: 3, why: { fr: 'Zelda est la princesse : le héros que l’on contrôle s’appelle Link.' } },
        { id: 'cg5', q: { fr: 'Quel studio développe Fortnite ?' }, choices: [{ fr: 'Epic Games' }, { fr: 'Respawn' }, { fr: 'Ubisoft' }, { fr: 'Valve' }], answer: 0, why: { fr: 'Fortnite est développé par Epic Games, aussi connu pour le moteur Unreal.' } },
        { id: 'cg6', q: { fr: 'Dans Minecraft, quelle créature verte explose en silence près de vous ?' }, choices: [{ fr: 'Le zombie' }, { fr: 'Le creeper' }, { fr: 'L’enderman' }, { fr: 'Le squelette' }], answer: 1, why: { fr: 'Le creeper (Tssss… boum) est devenu la mascotte paradoxale du jeu.' } },
        { id: 'cg7', q: { fr: 'À la fin d’une partie, que signifie « GG » ?' }, choices: [{ fr: 'Get Going' }, { fr: 'Great Goal' }, { fr: 'Good Game' }, { fr: 'Game Over' }], answer: 2, why: { fr: 'GG = Good Game, le salut respectueux échangé entre joueurs.' } },
        { id: 'cg8', q: { fr: 'En quelle année la Game Boy originale est-elle sortie au Japon ?' }, choices: [{ fr: '1985' }, { fr: '1989' }, { fr: '1993' }, { fr: '1997' }], answer: 1, why: { fr: 'La Game Boy sort en 1989 au Japon et en Amérique du Nord, en 1990 en Europe.' } },
      ],
      medium: [
        { id: 'cgm1', q: { fr: 'Comment s’appelle le frère de Mario, habillé en vert ?' }, choices: [{ fr: 'Wario' }, { fr: 'Luigi' }, { fr: 'Toad' }, { fr: 'Birdo' }], answer: 1, why: { fr: 'Luigi apparaît dès Mario Bros. (1983) comme joueur 2 — il aura droit à sa propre série, Luigi’s Mansion.' } },
        { id: 'cgm2', q: { fr: 'Quelle console Nintendo de 2017 est à la fois portable et de salon ?' }, choices: [{ fr: 'La Wii U' }, { fr: 'La 3DS' }, { fr: 'La Switch' }, { fr: 'La GameCube' }], answer: 2, why: { fr: 'La Switch fusionne les deux mondes : sa manette se détache et l’écran se pose sur un dock.' } },
        { id: 'cgm3', q: { fr: 'Quel est le nom du hérisson bleu devenu la mascotte de Sega ?' }, choices: [{ fr: 'Sonic' }, { fr: 'Alex Kidd' }, { fr: 'Tails' }, { fr: 'Knuckles' }], answer: 0, why: { fr: 'Sonic the Hedgehog (1991) est la réponse de Sega au Mario de Nintendo.' } },
        { id: 'cgm4', q: { fr: 'Quel studio japonais développe les jeux Pokémon ?' }, choices: [{ fr: 'Square Enix' }, { fr: 'Game Freak' }, { fr: 'Level-5' }, { fr: 'Nintendo EPD' }], answer: 1, why: { fr: 'Game Freak, studio fondé par Satoshi Tajiri, développe les jeux Pokémon depuis 1996.' } },
        { id: 'cgm5', q: { fr: 'Que fait un joueur qui pratique le « speedrun » ?' }, choices: [{ fr: 'Il termine le jeu le plus vite possible' }, { fr: 'Il joue sans mourir en difficulté maximale' }, { fr: 'Il explore la carte à 100 %' }, { fr: 'Il joue avec les commentaires du public' }], answer: 0, why: { fr: 'Le speedrun chronomètre la partie, en exploitant les raccourcis autorisés par la catégorie.' } },
        { id: 'cgm6', q: { fr: 'Dans Tetris, comment efface-t-on une ligne ?' }, choices: [{ fr: 'En cliquant dessus' }, { fr: 'En la remplissant complètement' }, { fr: 'En attendant dix secondes' }, { fr: 'En empilant trois pièces identiques' }], answer: 1, why: { fr: 'Les tétrominos s’empilent : une ligne pleine disparaît et rapporte des points.' } },
        { id: 'cgm7', q: { fr: 'Combien de joueurs s’affrontent dans une partie de battle royale comme Fortnite ?' }, choices: [{ fr: '16' }, { fr: '32' }, { fr: '64' }, { fr: '100' }], answer: 3, why: { fr: 'Cent joueurs sautent du bus de combat, seuls ou en escouade : un seul survivant ou une seule équipe.' } },
        { id: 'cgm8', q: { fr: 'Que signifie le sigle « PvP » ?' }, choices: [{ fr: 'Player versus Player' }, { fr: 'Private versus Public' }, { fr: 'Play versus Pause' }, { fr: 'Party versus Party' }], answer: 0, why: { fr: 'PvP = joueurs contre joueurs, par opposition au PvE (joueur contre l’environnement).' } },
      ],
      hard: [
        { id: 'cgh1', q: { fr: 'En quelle année Donkey Kong, première apparition de Mario, est-il sorti en arcade ?' }, choices: [{ fr: '1979' }, { fr: '1981' }, { fr: '1983' }, { fr: '1985' }], answer: 1, why: { fr: 'Donkey Kong (1981) met en scène « Jumpman », que Nintendo rebaptisera Mario.' } },
        { id: 'cgh2', q: { fr: 'Quel moteur graphique d’Epic Games motorise une large partie de l’industrie ?' }, choices: [{ fr: 'Unity' }, { fr: 'Unreal Engine' }, { fr: 'CryEngine' }, { fr: 'Source' }], answer: 1, why: { fr: 'Unreal Engine, né en 1998 avec le FPS Unreal, sert aussi bien à Fortnite qu’aux séries télé.' } },
        { id: 'cgh3', q: { fr: 'Quel physicien incarne le héros de Half-Life ?' }, choices: [{ fr: 'Gordon Freeman' }, { fr: 'Adrian Shephard' }, { fr: 'Isaac Kleiner' }, { fr: 'Eli Vance' }], answer: 0, why: { fr: 'Gordon Freeman, du complexe Black Mesa, ne prononce pas un mot dans Half-Life (1998).' } },
        { id: 'cgh4', q: { fr: 'Quelle entreprise a racheté Activision Blizzard en 2023 ?' }, choices: [{ fr: 'Microsoft' }, { fr: 'Sony' }, { fr: 'Tencent' }, { fr: 'EA' }], answer: 0, why: { fr: 'L’acquisition, bouclée à l’automne 2023, place Call of Duty et Candy Crush chez Microsoft.' } },
        { id: 'cgh5', q: { fr: 'Quel jeu d’arcade de 1978 a déclenché la fièvre des salles de jeu au Japon ?' }, choices: [{ fr: 'Pong' }, { fr: 'Space Invaders' }, { fr: 'Pac-Man' }, { fr: 'Galaga' }], answer: 1, why: { fr: 'Space Invaders (Taito, 1978) vide les pièces de 100 yens — et l’industrie du jeu décolle.' } },
        { id: 'cgh6', q: { fr: 'Quel FPS de 1993 d’id Software a démocratisé le genre sur PC ?' }, choices: [{ fr: 'Wolfenstein 3D' }, { fr: 'Quake' }, { fr: 'Doom' }, { fr: 'Duke Nukem 3D' }], answer: 2, why: { fr: 'Doom (1993) popularise le FPS et le partage de niveaux entre joueurs.' } },
        { id: 'cgh7', q: { fr: 'Sur quelle console sort Super Mario 64 en 1996 ?' }, choices: [{ fr: 'La Super Nintendo' }, { fr: 'La Nintendo 64' }, { fr: 'La GameCube' }, { fr: 'La PlayStation' }], answer: 1, why: { fr: 'Super Mario 64 pose les bases du jeu de plateforme 3D — et de la caméra à stick analogique.' } },
        { id: 'cgh8', q: { fr: 'Qu’est-ce qui définit un « roguelike » ?' }, choices: [{ fr: 'Une génération aléatoire et la mort définitive' }, { fr: 'Un univers médiéval obligatoire' }, { fr: 'Un mode multijoueur uniquement' }, { fr: 'Une difficulté réglable à la volée' }], answer: 0, why: { fr: 'Le genre tient son nom de Rogue (1980) : donjons régénérés à chaque partie et progression perdue à la mort.' } },
      ],
    },
  },
  {
    slug: 'consoles-retro',
    route: '/quizz/consoles-retro',
    videoId: 'A2VPhWOUMHI',
    image: quizThumbUrl('consoles-retro'),
    tag: 'Rétro',
    keywords: 'quizz rétro consoles playstation xbox sega nintendo dreamcast',
    source: '/dossiers/25-ans-playstation-2',
    labels: {
      fr: { title: 'Consoles & rétro', text: 'PS1, PS2, Xbox 360, Dreamcast : les machines qui ont façonné nos salons, de nos dossiers histoire.' },
    },
    levels: {
      easy: [
        { id: 'cr1', q: { fr: 'Quelle est la première console de salon de Sony ?' }, choices: [{ fr: 'La PlayStation' }, { fr: 'La PSP' }, { fr: 'La PS2' }, { fr: 'La Saturn' }], answer: 0, why: { fr: 'La PlayStation sort en décembre 1994 au Japon : c’est le premier coup de Sony dans le salon.' } },
        { id: 'cre2', q: { fr: 'Quelle console portable Nintendo combine deux écrans dont un tactile ?' }, choices: [{ fr: 'La PSP' }, { fr: 'La Game Boy Advance' }, { fr: 'La PS Vita' }, { fr: 'La Nintendo DS' }], answer: 3, why: { fr: 'DS = Dual Screen : le stylet et le tactile en ont fait un phénomène mondial.' } },
        { id: 'cre3', q: { fr: 'La manette « DualShock » équipe les consoles de…' }, choices: [{ fr: 'Nintendo' }, { fr: 'Sony' }, { fr: 'Microsoft' }, { fr: 'Sega' }], answer: 1, why: { fr: 'Les deux moteurs de vibration du DualShock accompagnent les PlayStation depuis 1997.' } },
        { id: 'cre4', q: { fr: 'Quelle console est vendue avec Wii Sports pour conquérir les familles ?' }, choices: [{ fr: 'La Wii' }, { fr: 'La Switch' }, { fr: 'La GameCube' }, { fr: 'La Wii U' }], answer: 0, why: { fr: 'En 2006, la Wii et sa télécommande à détection de mouvements élargissent le public du jeu vidéo.' } },
        { id: 'cre5', q: { fr: 'Quelle console de salon Microsoft sort en 2001 ?' }, choices: [{ fr: 'La Xbox 360' }, { fr: 'La Xbox' }, { fr: 'La PS2' }, { fr: 'La GameCube' }], answer: 1, why: { fr: 'La Xbox (2001) débarque avec Halo et un disque dur de série — inédit sur console.' } },
        { id: 'cre6', q: { fr: 'Quelle console de Sega affronte la Super Nintendo au début des années 90 ?' }, choices: [{ fr: 'La Master System' }, { fr: 'La Saturn' }, { fr: 'La Mega Drive' }, { fr: 'La Dreamcast' }], answer: 2, why: { fr: 'La Mega Drive (1988 au Japon, 1990 en Europe) devient la rivale de la SNES — et de Sonic.' } },
        { id: 'cre7', q: { fr: 'Quelle console portable Sony sort en 2004 ?' }, choices: [{ fr: 'La PS Vita' }, { fr: 'La PSP' }, { fr: 'La Game Gear' }, { fr: 'La DS' }], answer: 1, why: { fr: 'La PSP (2004) lit des disques UMD et installe Sony durablement sur le portable.' } },
        { id: 'cre8', q: { fr: 'Quelle console de Sony de 2006 impose le disque Blu-ray ?' }, choices: [{ fr: 'La PS2' }, { fr: 'La PS3' }, { fr: 'La PSP' }, { fr: 'La PS4' }], answer: 1, why: { fr: 'La PS3 (2006) porte le Blu-ray face au HD DVD — un pari industriel gagné.' } },
      ],
      medium: [
        { id: 'crm1', q: { fr: 'Quelle console a rendu célèbre le « Red Ring of Death » ?' }, choices: [{ fr: 'La PS3' }, { fr: 'La GameCube' }, { fr: 'La Xbox 360' }, { fr: 'La Dreamcast' }], answer: 2, why: { fr: 'Le triple anneau rouge de la Xbox 360 signalait une panne matérielle — raconté dans notre dossier « 20 ans de Xbox 360 ».' } },
        { id: 'crm2', q: { fr: 'Quelle est la dernière console de salon de Sega ?' }, choices: [{ fr: 'La Saturn' }, { fr: 'La Mega Drive' }, { fr: 'La Game Gear' }, { fr: 'La Dreamcast' }], answer: 3, why: { fr: 'Après la Dreamcast (1998 au Japon), Sega quitte le matériel pour se consacrer à l’édition.' } },
        { id: 'crm3', q: { fr: 'Quel support la PlayStation originale a-t-elle imposé face aux cartouches ?' }, choices: [{ fr: 'Le CD-ROM' }, { fr: 'Le DVD' }, { fr: 'La disquette' }, { fr: 'Le Blu-ray' }], answer: 0, why: { fr: 'Le CD-ROM, moins cher et plus capacitaire, a changé l’économie du jeu vidéo.' } },
        { id: 'crm4', q: { fr: 'En quelle année la Nintendo 64 sort-elle en Europe ?' }, choices: [{ fr: '1996' }, { fr: '1997' }, { fr: '1998' }, { fr: '2000' }], answer: 1, why: { fr: 'Lancée en 1996 au Japon et aux États-Unis, la N64 arrive en Europe en mars 1997.' } },
        { id: 'crm5', q: { fr: 'Quelle console portable Nintendo a été déclinée en version « SP » à clapet ?' }, choices: [{ fr: 'La Game Boy Color' }, { fr: 'La Game Boy Advance' }, { fr: 'La DS' }, { fr: 'La PSP' }], answer: 1, why: { fr: 'La GBA SP (2003) ajoute un écran éclairé et une coque pliable à la Game Boy Advance.' } },
        { id: 'crm6', q: { fr: 'Quelle console de Sony sort en 2000 et fait aussi lecteur de DVD ?' }, choices: [{ fr: 'La PlayStation' }, { fr: 'La PS2' }, { fr: 'La PS3' }, { fr: 'La PSP' }], answer: 1, why: { fr: 'La PS2 (2000) se vend aussi comme lecteur DVD : un argument décisif face à la Dreamcast.' } },
        { id: 'crm7', q: { fr: 'Quelle console portable de Sega a rivalisé avec la Game Boy ?' }, choices: [{ fr: 'La Game Gear' }, { fr: 'La Nomad' }, { fr: 'La Saturn' }, { fr: 'La Mega Jet' }], answer: 0, why: { fr: 'La Game Gear (1990) affiche la couleur mais dévore six piles pour quelques heures de jeu.' } },
        { id: 'crm8', q: { fr: 'Quelle console de Sega sort au Japon en 1994, avant la Dreamcast ?' }, choices: [{ fr: 'La Saturn' }, { fr: 'La Mega Drive' }, { fr: 'La Master System' }, { fr: 'La 32X' }], answer: 0, why: { fr: 'La Saturn (1994) mise sur la 2D et la 3D naissante — et sur une sortie surprise aux États-Unis.' } },
      ],
      hard: [
        { id: 'crh1', q: { fr: 'Quelle extension CD de la Mega Drive sort au Japon en 1991 ?' }, choices: [{ fr: 'La Mega-CD' }, { fr: 'La 32X' }, { fr: 'Le Super Game Boy' }, { fr: 'Le Mega Modem' }], answer: 0, why: { fr: 'La Mega-CD (Sega CD aux États-Unis) ajoute un lecteur CD-ROM à la Mega Drive — trop cher pour convaincre le public.' } },
        { id: 'crh2', q: { fr: 'En quelle année la Dreamcast est-elle sortie en Europe ?' }, choices: [{ fr: '1997' }, { fr: '1998' }, { fr: '1999' }, { fr: '2000' }], answer: 2, why: { fr: 'Sortie en 1998 au Japon, la Dreamcast arrive en Europe en octobre 1999.' } },
        { id: 'crh3', q: { fr: 'Quel nom porte le processeur central de la PlayStation 2 ?' }, choices: [{ fr: 'L’Emotion Engine' }, { fr: 'Le Cell' }, { fr: 'Le R3000' }, { fr: 'Le Reality Synthesizer' }], answer: 0, why: { fr: 'Sony vante son Emotion Engine 128 bits et ses 66 millions de polygones par seconde.' } },
        { id: 'crh4', q: { fr: 'Quel format de disque propriétaire équipe la Dreamcast ?' }, choices: [{ fr: 'Le GD-ROM' }, { fr: 'Le Blu-ray' }, { fr: 'L’UMD' }, { fr: 'Le DVD-RAM' }], answer: 0, why: { fr: 'Le GD-ROM stocke environ 1 Go — mais les CD-R gravés ont vite contourné la protection de Sega.' } },
        { id: 'crh5', q: { fr: 'Quel périphérique de la Nintendo 64 devait ajouter un disque magnétique ?' }, choices: [{ fr: 'Le 64DD' }, { fr: 'Le Rumble Pak' }, { fr: 'Le Transfer Pak' }, { fr: 'L’Expansion Pak' }], answer: 0, why: { fr: 'Le 64DD, sorti seulement au Japon en 1999, reste un échec commercial retentissant.' } },
        { id: 'crh6', q: { fr: 'Quelle console de salon fut la première à intégrer un disque dur de série ?' }, choices: [{ fr: 'La PS2' }, { fr: 'La Xbox' }, { fr: 'La GameCube' }, { fr: 'La Dreamcast' }], answer: 1, why: { fr: 'La Xbox (2001) embarque un disque dur de 8 Go : sauvegardes et téléchargements sans carte mémoire.' } },
        { id: 'crh7', q: { fr: 'Quelle console de Sony a été la première à lire les jeux de sa devancière ?' }, choices: [{ fr: 'La PS2' }, { fr: 'La PS3' }, { fr: 'La PSP' }, { fr: 'La PS4' }], answer: 0, why: { fr: 'La PS2 lit les jeux PlayStation : une rétrocompatibilité qui a facilité son démarrage.' } },
        { id: 'crh8', q: { fr: 'Quelle console portable Sony succède à la PSP en 2011 ?' }, choices: [{ fr: 'La PS Vita' }, { fr: 'La PSP Go' }, { fr: 'La PSP Street' }, { fr: 'La Xperia Play' }], answer: 0, why: { fr: 'La PS Vita (2011) ajoute écran tactile, pavé arrière et une puissance proche de la PS3.' } },
      ],
    },
  },
  {
    slug: 'souls-fromsoftware',
    route: '/quizz/souls-fromsoftware',
    videoId: 'OH51fSHznwg',
    image: quizThumbUrl('souls-fromsoftware'),
    tag: 'Souls-like',
    keywords: 'quizz souls fromsoftware dark souls elden ring bloodborne miyazaki',
    source: '/dossiers/pourquoi-les-souls',
    labels: {
      fr: { title: 'Souls & FromSoftware', text: 'Lordran, Yharnam, l’Entre-Terre : un quizz exigeant, à l’image des jeux dont il s’inspire — trois niveaux, du premier feu de camp au Sans-Faute.' },
    },
    levels: {
      easy: [
        { id: 'sfe1', q: { fr: 'Quel studio japonais développe Dark Souls et Elden Ring ?' }, choices: [{ fr: 'Capcom' }, { fr: 'FromSoftware' }, { fr: 'Team Ninja' }, { fr: 'PlatinumGames' }], answer: 1, why: { fr: 'FromSoftware, studio de Tokyo fondé en 1986, crée la lignée des Souls.' } },
        { id: 'sfe2', q: { fr: 'Qui réalise Dark Souls et Elden Ring ?' }, choices: [{ fr: 'Hideo Kojima' }, { fr: 'Shigeru Miyamoto' }, { fr: 'Hidetaka Miyazaki' }, { fr: 'Yoko Taro' }], answer: 2, why: { fr: 'Hidetaka Miyazaki, président de FromSoftware, signe les deux.' } },
        { id: 'sfe3', q: { fr: 'Quel jeu FromSoftware remporte le GOTY aux Game Awards 2022 ?' }, choices: [{ fr: 'Sekiro' }, { fr: 'Elden Ring' }, { fr: 'Dark Souls III' }, { fr: 'Armored Core VI' }], answer: 1, why: { fr: 'Elden Ring rafle le jeu de l’année 2022, co-créé avec George R. R. Martin.' } },
        { id: 'sfe4', q: { fr: 'Dans quel pays se déroule Sekiro: Shadows Die Twice ?' }, choices: [{ fr: 'La Chine' }, { fr: 'La Corée' }, { fr: 'L’Inde' }, { fr: 'Le Japon' }], answer: 3, why: { fr: 'Sekiro se déroule dans un Japon de la fin Sengoku réinventé.' } },
        { id: 'sfe5', q: { fr: 'Dans Dark Souls, que deviennent vos âmes à votre mort ?' }, choices: [{ fr: 'Elles disparaissent à jamais' }, { fr: 'Elles tombent au sol, récupérables une fois' }, { fr: 'Elles sont partagées entre les joueurs' }, { fr: 'La moitié est confisquée' }], answer: 1, why: { fr: 'Vous les perdez sur le lieu de votre mort : une seconde mort avant de les reprendre les condamne.' } },
        { id: 'sfe6', q: { fr: 'Comment s’appelle le point de repos où l’on récupère sa vie, dans Dark Souls ?' }, choices: [{ fr: 'Le feu de camp' }, { fr: 'La fontaine' }, { fr: 'Le portail' }, { fr: 'La statue' }], answer: 0, why: { fr: 'Se reposer à un feu de camp restaure la vie — et ressuscite tous les ennemis déjà vaincus.' } },
        { id: 'sfe7', q: { fr: 'Quel écrivain a co-écrit la mythologie d’Elden Ring ?' }, choices: [{ fr: 'George R. R. Martin' }, { fr: 'J. R. R. Tolkien' }, { fr: 'Andrzej Sapkowski' }, { fr: 'Neil Gaiman' }], answer: 0, why: { fr: 'L’auteur du Trône de fer a signé les fondations du monde d’Elden Ring avant le travail de Miyazaki.' } },
        { id: 'sfe8', q: { fr: 'Dans Bloodborne, quel métier exerce le héros ?' }, choices: [{ fr: 'Chasseur' }, { fr: 'Chevalier' }, { fr: 'Alchimiste' }, { fr: 'Marchand' }], answer: 0, why: { fr: 'Le joueur incarne un chasseur lâché dans Yharnam lors de la Nuit de la Chasse.' } },
      ],
      medium: [
        { id: 'sfm1', q: { fr: 'Quel jeu de 2009 lance la lignée des « Souls » ?' }, choices: [{ fr: 'Dark Souls' }, { fr: 'King’s Field' }, { fr: 'Demon’s Souls' }, { fr: 'Sekiro' }], answer: 2, why: { fr: 'Demon’s Souls (2009) pose les bases ; Dark Souls (2011) donne son nom au genre.' } },
        { id: 'sfm2', q: { fr: 'Comment s’appelle le monde exploré dans Elden Ring ?' }, choices: [{ fr: 'Lordran' }, { fr: 'L’Entre-Terre' }, { fr: 'Yharnam' }, { fr: 'Boletaria' }], answer: 1, why: { fr: 'The Lands Between, « l’Entre-Terre » en français ; Lordran et Boletaria viennent de Dark/Demon’s Souls.' } },
        { id: 'sfm3', q: { fr: 'Lequel de ces jeux n’est PAS développé par FromSoftware ?' }, choices: [{ fr: 'Bloodborne' }, { fr: 'Nioh' }, { fr: 'Sekiro' }, { fr: 'Elden Ring' }], answer: 1, why: { fr: 'Nioh est signé Team Ninja (Koei Tecmo), souvent confondu avec un Souls.' } },
        { id: 'sfm4', q: { fr: 'Dans quelle ville cauchemardesque erre le chasseur de Bloodborne ?' }, choices: [{ fr: 'Yharnam' }, { fr: 'Majula' }, { fr: 'Lordran' }, { fr: 'Anor Londo' }], answer: 0, why: { fr: 'Yharnam, la cité du sang — notre épisode « Pourquoi les Souls ? » en parle longuement.' } },
        { id: 'sfm5', q: { fr: 'Comment s’appelle le sanctuaire qui sert de hub au premier Dark Souls ?' }, choices: [{ fr: 'Le Sanctuaire de Lige-Feu' }, { fr: 'Majula' }, { fr: 'Le Rêve du Chasseur' }, { fr: 'La Table Ronde' }], answer: 0, why: { fr: 'Le Sanctuaire de Lige-Feu (Firelink Shrine) relie les zones du jeu et abrite son feu central.' } },
        { id: 'sfm6', q: { fr: 'Quelle extension majeure d’Elden Ring est sortie en 2024 ?' }, choices: [{ fr: 'Shadow of the Erdtree' }, { fr: 'The Old Hunters' }, { fr: 'The Ringed City' }, { fr: 'Ashes of Ariandel' }], answer: 0, why: { fr: 'L’Ombre de l’Arbre-Monde (Shadow of the Erdtree) prolonge Elden Ring et rafle plusieurs prix.' } },
        { id: 'sfm7', q: { fr: 'Quel jeu FromSoftware de 2023 se joue aux commandes d’un mecha ?' }, choices: [{ fr: 'Armored Core VI' }, { fr: 'Sekiro' }, { fr: 'Bloodborne' }, { fr: 'Déraciné' }], answer: 0, why: { fr: 'Armored Core VI: Fires of Rubicon (2023) relance la série de mechas du studio.' } },
        { id: 'sfm8', q: { fr: 'Dans Sekiro, qu’équipe le héros pour remplacer son bras perdu ?' }, choices: [{ fr: 'Une prothèse shinobi' }, { fr: 'Un bouclier mécanique' }, { fr: 'Un œil de verre' }, { fr: 'Une armure lourde' }], answer: 0, why: { fr: 'La prothèse accueille grappin, haches et outils débloqués au fil du jeu.' } },
      ],
      hard: [
        { id: 'sfh1', q: { fr: 'Quel éditeur a publié Demon’s Souls au Japon en 2009 ?' }, choices: [{ fr: 'Sony Computer Entertainment' }, { fr: 'Bandai Namco' }, { fr: 'Atlus' }, { fr: 'FromSoftware' }], answer: 0, why: { fr: 'Sony publie le jeu au Japon ; Atlus (États-Unis) et Bandai Namco (Europe) le portent ensuite à l’international.' } },
        { id: 'sfh2', q: { fr: 'Quelle extension de Dark Souls met en scène le chevalier Artorias ?' }, choices: [{ fr: 'Artorias of the Abyss' }, { fr: 'The Old Hunters' }, { fr: 'Crown of the Sunken King' }, { fr: 'The Ringed City' }], answer: 0, why: { fr: 'Artorias of the Abyss (2012) revient sur le chevalier déchu et le gouffre d’Oolacile.' } },
        { id: 'sfh3', q: { fr: 'Comment s’appelle le hub de Bloodborne, quartier général des chasseurs ?' }, choices: [{ fr: 'Le Rêve du Chasseur' }, { fr: 'La Table Ronde' }, { fr: 'Majula' }, { fr: 'Le Sanctuaire de Lige-Feu' }], answer: 0, why: { fr: 'Le Rêve du Chasseur sert de refuge : on y améliore ses armes et y invoque des alliés.' } },
        { id: 'sfh4', q: { fr: 'Quelle série FromSoftware, avant les Souls, proposait déjà des donjons en vue subjective ?' }, choices: [{ fr: 'King’s Field' }, { fr: 'Armored Core' }, { fr: 'Echo Night' }, { fr: 'Tenchu' }], answer: 0, why: { fr: 'King’s Field (1994) est le premier jeu de rôle de FromSoftware, ancêtre direct des Souls.' } },
        { id: 'sfh5', q: { fr: 'Quelle créature clôt Elden Ring, après Radagon, lors du combat final ?' }, choices: [{ fr: 'La Bête de l’Elden' }, { fr: 'Malenia' }, { fr: 'Radahn' }, { fr: 'Godfrey' }], answer: 0, why: { fr: 'La Bête de l’Elden (Elden Beast) est l’ultime adversaire du jeu.' } },
        { id: 'sfh6', q: { fr: 'Quel village sert de hub à Dark Souls II ?' }, choices: [{ fr: 'Majula' }, { fr: 'Anor Londo' }, { fr: 'Yharnam' }, { fr: 'Boletaria' }], answer: 0, why: { fr: 'Majula, au bord de la falaise, remplace le Sanctuaire de Lige-Feu dans Dark Souls II.' } },
        { id: 'sfh7', q: { fr: 'Quel duo de boss garde Anor Londo dans Dark Souls ?' }, choices: [{ fr: 'Ornstein et Smough' }, { fr: 'Les Gargouilles' }, { fr: 'Nito et Seath' }, { fr: 'Artorias et Sif' }], answer: 0, why: { fr: 'Ornstein et Smough signent l’un des combats les plus célèbres du premier Dark Souls.' } },
        { id: 'sfh8', q: { fr: 'Quelle compositrice a signé les musiques de Bloodborne, Dark Souls III et Sekiro ?' }, choices: [{ fr: 'Yuka Kitamura' }, { fr: 'Nobuo Uematsu' }, { fr: 'Koji Kondo' }, { fr: 'Motoi Sakuraba' }], answer: 0, why: { fr: 'Yuka Kitamura a écrit une large part des thèmes du studio, avant de le quitter en 2023.' } },
      ],
    },
  },
  {
    slug: 'rpg-legends',
    route: '/quizz/rpg-legends',
    videoId: '0ThNyFItASM',
    image: quizThumbUrl('rpg-legends'),
    tag: 'RPG',
    keywords: 'quizz rpg zelda witcher skyrim persona final fantasy cyberpunk',
    source: '/dossiers/let-play-awards-2025',
    labels: {
      fr: { title: 'RPG légendaires', text: 'De Zelda à Cyberpunk, en passant par Skyrim et Persona : les mondes qui ont défini le genre, du niveau Facile au niveau Expert.' },
    },
    levels: {
      easy: [
        { id: 'rle1', q: { fr: 'Quel Zelda de 2017 réinvente la série en monde ouvert ?' }, choices: [{ fr: 'Twilight Princess' }, { fr: 'Skyward Sword' }, { fr: 'Majora’s Mask' }, { fr: 'Breath of the Wild' }], answer: 3, why: { fr: 'Breath of the Wild (2017) casse la formule Zelda : exploration totale et physique émergente.' } },
        { id: 'rle2', q: { fr: 'Quel studio développe The Elder Scrolls V: Skyrim ?' }, choices: [{ fr: 'CD Projekt Red' }, { fr: 'Obsidian' }, { fr: 'Bethesda Game Studios' }, { fr: 'BioWare' }], answer: 2, why: { fr: 'Bethesda Game Studios signe Skyrim (2011), encore joué partout quinze ans après.' } },
        { id: 'rle3', q: { fr: 'Dans The Witcher 3, quel est le métier de Geralt ?' }, choices: [{ fr: 'Chevalier' }, { fr: 'Sorcilleur, chasseur de monstres' }, { fr: 'Mage de guerre' }, { fr: 'Forgeron' }], answer: 1, why: { fr: 'Geralt de Riv est un sorcilleur : un mutant entraîné à chasser les monstres.' } },
        { id: 'rle4', q: { fr: 'Quel RPG en monde ouvert se déroule à Night City ?' }, choices: [{ fr: 'Starfield' }, { fr: 'Cyberpunk 2077' }, { fr: 'Deus Ex' }, { fr: 'GTA V' }], answer: 1, why: { fr: 'Night City est la mégalopole de Cyberpunk 2077, par CD Projekt Red.' } },
        { id: 'rle5', q: { fr: 'Quel jeu de 2023 se déroule dans l’univers de Donjons & Dragons ?' }, choices: [{ fr: 'Baldur’s Gate 3' }, { fr: 'Diablo IV' }, { fr: 'Starfield' }, { fr: 'Dragon’s Dogma 2' }], answer: 0, why: { fr: 'Baldur’s Gate 3 (Larian Studios) adapte les règles de Donjons & Dragons et rafle le GOTY 2023.' } },
        { id: 'rle6', q: { fr: 'Quel MMORPG se déroule sur le monde d’Azeroth ?' }, choices: [{ fr: 'Final Fantasy XIV' }, { fr: 'World of Warcraft' }, { fr: 'Guild Wars 2' }, { fr: 'The Elder Scrolls Online' }], answer: 1, why: { fr: 'World of Warcraft (2004) reste la référence du MMORPG, avec Azeroth pour terrain de jeu.' } },
        { id: 'rle7', q: { fr: 'Quel RPG spatial Bethesda sort en 2023 ?' }, choices: [{ fr: 'Starfield' }, { fr: 'Mass Effect' }, { fr: 'No Man’s Sky' }, { fr: 'Outer Worlds' }], answer: 0, why: { fr: 'Starfield (2023) est le premier univers spatial de Bethesda Game Studios.' } },
        { id: 'rle8', q: { fr: 'Dans Final Fantasy VII, comment s’appelle l’épée géante de Cloud ?' }, choices: [{ fr: 'L’épée Buster' }, { fr: 'L’épée Masamune' }, { fr: 'La Gunblade' }, { fr: 'Le Fouet d’énergie' }], answer: 0, why: { fr: 'L’épée Buster (Buster Sword) est devenue l’un des symboles de Final Fantasy VII.' } },
      ],
      medium: [
        { id: 'rlm1', q: { fr: 'Quelle série créée par Hironobu Sakaguchi a défini le JRPG ?' }, choices: [{ fr: 'Final Fantasy' }, { fr: 'Dragon Quest' }, { fr: 'Persona' }, { fr: 'Xenoblade' }], answer: 0, why: { fr: 'Sakaguchi lance Final Fantasy en 1987 chez Square, l’autre pilier du genre.' } },
        { id: 'rlm2', q: { fr: 'Dans quelle ville se déroule principalement Persona 5 ?' }, choices: [{ fr: 'Osaka' }, { fr: 'Kyoto' }, { fr: 'Yokohama' }, { fr: 'Tokyo' }], answer: 3, why: { fr: 'Les Voleurs fantômes arpentent Tokyo, de Shibuya à leurs planques café.' } },
        { id: 'rlm3', q: { fr: 'Dans Skyrim, comment appelle-t-on l’enfant de dragon que vous incarnez ?' }, choices: [{ fr: 'Dovahkiin' }, { fr: 'Thane' }, { fr: 'Grisbarbe' }, { fr: 'Alduin' }], answer: 0, why: { fr: 'Dovahkiin, l’enfant de dragon, absorbe les âmes des dragons et parle le Thu’um.' } },
        { id: 'rlm4', q: { fr: 'Dragon Quest et Final Fantasy sont aujourd’hui réunis sous quelle bannière ?' }, choices: [{ fr: 'Capcom' }, { fr: 'Konami' }, { fr: 'Square Enix' }, { fr: 'Sega' }], answer: 2, why: { fr: 'La fusion Square-Enix (2003) réunit les deux dynasties du JRPG.' } },
        { id: 'rlm5', q: { fr: 'Quel jeu de cartes, intégré à The Witcher 3, a eu droit à son propre jeu ?' }, choices: [{ fr: 'Le Gwent' }, { fr: 'Le Triple Triad' }, { fr: 'Le poker de New Vegas' }, { fr: 'Le Tarot de Cyrodiil' }], answer: 0, why: { fr: 'Le Gwent, jeu de cartes de The Witcher 3, est devenu un jeu autonome édité par CD Projekt Red.' } },
        { id: 'rlm6', q: { fr: 'Quel studio japonais développe Persona et Shin Megami Tensei ?' }, choices: [{ fr: 'Atlus' }, { fr: 'Level-5' }, { fr: 'Nihon Falcom' }, { fr: 'Monolith Soft' }], answer: 0, why: { fr: 'Atlus, studio de Tokyo, édite les deux séries depuis les années 80.' } },
        { id: 'rlm7', q: { fr: 'Quel RPG de BioWare met en scène l’Inquisiteur ?' }, choices: [{ fr: 'Dragon Age: Inquisition' }, { fr: 'Mass Effect 2' }, { fr: 'Jade Empire' }, { fr: 'Knights of the Old Republic' }], answer: 0, why: { fr: 'Dragon Age: Inquisition (2014) décroche le jeu de l’année aux Game Awards.' } },
        { id: 'rlm8', q: { fr: 'Quel est le nom du continent où se déroulent les Elder Scrolls ?' }, choices: [{ fr: 'Tamriel' }, { fr: 'Hyrule' }, { fr: 'Faerûn' }, { fr: 'Azeroth' }], answer: 0, why: { fr: 'Tamriel abrite les provinces de la série : Bordeciel, Cyrodiil, Morrowind…' } },
      ],
      hard: [
        { id: 'rlh1', q: { fr: 'Quel RPG post-apocalyptique de 1997 a lancé la série Fallout ?' }, choices: [{ fr: 'Fallout' }, { fr: 'Wasteland' }, { fr: 'Fallout 2' }, { fr: 'Arcanum' }], answer: 0, why: { fr: 'Fallout (Black Isle Studios, 1997) impose un monde post-nucléaire teinté d’humour noir.' } },
        { id: 'rlh2', q: { fr: 'Quel studio signe Mass Effect (2007) ?' }, choices: [{ fr: 'BioWare' }, { fr: 'Obsidian' }, { fr: 'Bethesda' }, { fr: 'Ion Storm' }], answer: 0, why: { fr: 'BioWare (Edmonton) crée Mass Effect et sa trilogie spatiale.' } },
        { id: 'rlh3', q: { fr: 'Quel studio belge a développé Divinity: Original Sin 2 et Baldur’s Gate 3 ?' }, choices: [{ fr: 'Larian Studios' }, { fr: 'Motion Twin' }, { fr: 'Asobo' }, { fr: 'Amplitude' }], answer: 0, why: { fr: 'Larian Studios (Gand) signe les deux RPG, récompensés pour leur liberté de jeu.' } },
        { id: 'rlh4', q: { fr: 'Quel Final Fantasy met en scène Squall et Rinoa ?' }, choices: [{ fr: 'Final Fantasy VIII' }, { fr: 'Final Fantasy VII' }, { fr: 'Final Fantasy IX' }, { fr: 'Final Fantasy X' }], answer: 0, why: { fr: 'Final Fantasy VIII (1999) suit Squall Leonhart et Rinoa Heartilly à la Garden de Balamb.' } },
        { id: 'rlh5', q: { fr: 'Quel RPG de 2019 signe ZA/UM, enquête dans la ville de Revachol ?' }, choices: [{ fr: 'Disco Elysium' }, { fr: 'Planescape: Torment' }, { fr: 'Pentiment' }, { fr: 'The Outer Worlds' }], answer: 0, why: { fr: 'Disco Elysium (ZA/UM, 2019) troque les combats contre un système de dialogues et de compétences.' } },
        { id: 'rlh6', q: { fr: 'Quel jeu de 2010, développé par Obsidian, poursuit la série Fallout dans le Nevada ?' }, choices: [{ fr: 'Fallout: New Vegas' }, { fr: 'Fallout 3' }, { fr: 'Fallout 4' }, { fr: 'Fallout Tactics' }], answer: 0, why: { fr: 'Fallout: New Vegas (2010) reprend les codes du premier Fallout — et ses choix moraux.' } },
        { id: 'rlh7', q: { fr: 'Quelle extension de The Witcher 3 se déroule dans la principauté de Toussaint ?' }, choices: [{ fr: 'Blood and Wine' }, { fr: 'Hearts of Stone' }, { fr: 'Blood Moon' }, { fr: 'Le Pacte des sorcières' }], answer: 0, why: { fr: 'Blood and Wine (2016) envoie Geralt sous le soleil de Toussaint, loin du Nord gris.' } },
        { id: 'rlh8', q: { fr: 'Quel Elder Scrolls de 2006 se déroule dans la province de Cyrodiil ?' }, choices: [{ fr: 'Oblivion' }, { fr: 'Morrowind' }, { fr: 'Skyrim' }, { fr: 'Daggerfall' }], answer: 0, why: { fr: 'The Elder Scrolls IV: Oblivion (2006) ouvre la province impériale de Cyrodiil.' } },
      ],
    },
  },
  {
    slug: 'esport-competition',
    route: '/quizz/esport-competition',
    videoId: 'twbaM8fiXpo',
    image: quizThumbUrl('esport-competition'),
    tag: 'E-sport',
    keywords: 'quizz esport counter-strike league of legends free fire mortal kombat rocket league valorant',
    labels: {
      fr: { title: 'E-sport & compétition', text: 'CS, LoL, Free Fire, Rocket League, Valorant : la scène compétitive, de Séoul à Alger (FFAC2023), en trois niveaux.' },
    },
    levels: {
      easy: [
        { id: 'ese1', q: { fr: 'Quelle série de football d’EA est devenue EA Sports FC en 2023 ?' }, choices: [{ fr: 'PES' }, { fr: 'eFootball' }, { fr: 'Football Manager' }, { fr: 'FIFA' }], answer: 3, why: { fr: 'Après trente ans de partenariat, EA quitte la licence FIFA et renomme sa série.' } },
        { id: 'ese2', q: { fr: 'En format standard, combien de joueurs par équipe sur le terrain de Rocket League ?' }, choices: [{ fr: '2' }, { fr: '3' }, { fr: '5' }, { fr: '11' }], answer: 1, why: { fr: 'Le format compétitif standard est le 3v3.' } },
        { id: 'ese3', q: { fr: 'Quelle série de combat met en scène Scorpion et Sub-Zero ?' }, choices: [{ fr: 'Street Fighter' }, { fr: 'Tekken' }, { fr: 'Mortal Kombat' }, { fr: 'Soulcalibur' }], answer: 2, why: { fr: 'Scorpion et Sub-Zero sont les rivaux emblématiques de Mortal Kombat (NetherRealm).' } },
        { id: 'ese4', q: { fr: 'Que signifie l’acronyme « MOBA » ?' }, choices: [{ fr: 'Multiplayer Online Battle Arena' }, { fr: 'Modern Online Battle Attack' }, { fr: 'Mobile Open Battle Area' }, { fr: 'Massive Online Board Adventure' }], answer: 0, why: { fr: 'MOBA = Multiplayer Online Battle Arena, la famille de LoL et Dota 2.' } },
        { id: 'ese5', q: { fr: 'Quel jeu de tir de Riot Games se joue en 5v5 avec des agents ?' }, choices: [{ fr: 'Overwatch' }, { fr: 'Valorant' }, { fr: 'Rainbow Six Siege' }, { fr: 'Apex Legends' }], answer: 1, why: { fr: 'Valorant (2020) mêle tir tactique et capacités d’agents, et structure un circuit mondial.' } },
        { id: 'ese6', q: { fr: 'Quel jeu de combat de Nintendo réunit Mario, Link et Pikachu ?' }, choices: [{ fr: 'Super Smash Bros.' }, { fr: 'Mario Kart' }, { fr: 'Splatoon' }, { fr: 'Pokkén Tournament' }], answer: 0, why: { fr: 'Super Smash Bros. se joue à quatre sur un même écran — et en tournois depuis la N64.' } },
        { id: 'ese7', q: { fr: 'Quel MOBA de Valve est né d’un mod de Warcraft III ?' }, choices: [{ fr: 'Dota 2' }, { fr: 'League of Legends' }, { fr: 'Heroes of the Storm' }, { fr: 'Smite' }], answer: 0, why: { fr: 'Dota naît en 2003 comme mod de Warcraft III avant de devenir Dota 2 chez Valve.' } },
        { id: 'ese8', q: { fr: 'Combien de joueurs composent une équipe sur le terrain dans EA Sports FC ?' }, choices: [{ fr: '7' }, { fr: '9' }, { fr: '11' }, { fr: '13' }], answer: 2, why: { fr: 'Onze contre onze, gardien compris, comme sur un vrai terrain.' } },
      ],
      medium: [
        { id: 'esm1', q: { fr: 'Quel mod de Half-Life (2000) est devenu la référence du FPS tactique ?' }, choices: [{ fr: 'Counter-Strike' }, { fr: 'Team Fortress' }, { fr: 'Day of Defeat' }, { fr: 'Garry’s Mod' }], answer: 0, why: { fr: 'Counter-Strike, mod communautaire devenu franchise majeure de l’e-sport.' } },
        { id: 'esm2', q: { fr: 'Dans League of Legends, que faut-il détruire pour gagner ?' }, choices: [{ fr: 'Le Baron' }, { fr: 'Le Nexus' }, { fr: 'L’inhibiteur' }, { fr: 'Le trône' }], answer: 1, why: { fr: 'Le Nexus adverse est le cœur de la base : sa chute termine la partie.' } },
        { id: 'esm3', q: { fr: 'Free Fire, star du FFAC2023 en Algérie, est édité par…' }, choices: [{ fr: 'Tencent' }, { fr: 'NetEase' }, { fr: 'Garena' }, { fr: 'Activision' }], answer: 2, why: { fr: 'Garena édite Free Fire, le battle royale mobile qui a rempli nos championnats FFAC.' } },
        { id: 'esm4', q: { fr: 'Quel STR a fait de la Corée du Sud la nation historique de l’e-sport ?' }, choices: [{ fr: 'Warcraft III' }, { fr: 'Age of Empires II' }, { fr: 'Command & Conquer' }, { fr: 'StarCraft' }], answer: 3, why: { fr: 'StarCraft (1998) y devient sport national télévisé, avec ses ligues et ses progamers.' } },
        { id: 'esm5', q: { fr: 'Quel FPS de Valve sort en 2012 et devient la référence compétitive ?' }, choices: [{ fr: 'Counter-Strike: Global Offensive' }, { fr: 'Left 4 Dead 2' }, { fr: 'Team Fortress 2' }, { fr: 'Portal 2' }], answer: 0, why: { fr: 'CS:GO (2012) structure une scène mondiale de tournois et de majors.' } },
        { id: 'esm6', q: { fr: 'Combien de joueurs par équipe dans une partie classique de League of Legends ?' }, choices: [{ fr: '4' }, { fr: '5' }, { fr: '6' }, { fr: '7' }], answer: 1, why: { fr: 'Cinq rôles par équipe : top, jungle, mid, bot et support.' } },
        { id: 'esm7', q: { fr: 'Quel est le nom du tournoi annuel de Dota 2, le plus riche de l’e-sport ?' }, choices: [{ fr: 'The International' }, { fr: 'Les Worlds' }, { fr: 'La Major' }, { fr: 'Le BLAST Premier' }], answer: 0, why: { fr: 'The International, organisé par Valve, a distribué des prize pools records financés par la communauté.' } },
        { id: 'esm8', q: { fr: 'Quelle compétition annuelle de Riot Games couronne les champions de League of Legends ?' }, choices: [{ fr: 'Les Worlds' }, { fr: 'Le LEC' }, { fr: 'La LCK' }, { fr: 'Le MSI' }], answer: 0, why: { fr: 'Les Worlds réunissent chaque automne les meilleures équipes de chaque région.' } },
      ],
      hard: [
        { id: 'esh1', q: { fr: 'En quelle année StarCraft est-il sorti ?' }, choices: [{ fr: '1995' }, { fr: '1998' }, { fr: '2001' }, { fr: '2004' }], answer: 1, why: { fr: 'StarCraft (Blizzard, 1998) devient un phénomène national en Corée du Sud.' } },
        { id: 'esh2', q: { fr: 'Quel trophée récompense les champions du monde de League of Legends ?' }, choices: [{ fr: 'La Coupe de l’Invocateur' }, { fr: 'L’Aegis' }, { fr: 'Le Bouclier de Summoner’s Rift' }, { fr: 'La Coupe Nexus' }], answer: 0, why: { fr: 'La Coupe de l’Invocateur (Summoner’s Cup) attend l’équipe victorieuse des Worlds.' } },
        { id: 'esh3', q: { fr: 'En quelle année la version 1.0 de Counter-Strike est-elle sortie ?' }, choices: [{ fr: '1998' }, { fr: '2000' }, { fr: '2002' }, { fr: '2004' }], answer: 1, why: { fr: 'Le mod apparaît en 1999 en bêta ; la version 1.0 sort en 2000, éditée par Valve.' } },
        { id: 'esh4', q: { fr: 'Quel FPS de Blizzard relance la scène compétitive en 2016 ?' }, choices: [{ fr: 'Overwatch' }, { fr: 'Hearthstone' }, { fr: 'Heroes of the Storm' }, { fr: 'StarCraft II' }], answer: 0, why: { fr: 'Overwatch (2016) lance sa ligue professionnelle et un circuit de Coupe du monde.' } },
        { id: 'esh5', q: { fr: 'De quel jeu « Faker » est-il le joueur le plus titré ?' }, choices: [{ fr: 'League of Legends' }, { fr: 'StarCraft II' }, { fr: 'Dota 2' }, { fr: 'Counter-Strike' }], answer: 0, why: { fr: 'Lee Sang-hyeok, dit Faker, cumule les titres mondiaux avec T1 sur League of Legends.' } },
        { id: 'esh6', q: { fr: 'Quelle série de combat de Bandai Namco met en scène Jin Kazama ?' }, choices: [{ fr: 'Tekken' }, { fr: 'Soulcalibur' }, { fr: 'Street Fighter' }, { fr: 'Dead or Alive' }], answer: 0, why: { fr: 'Jin Kazama incarne la famille Mishima dans Tekken depuis le troisième épisode.' } },
        { id: 'esh7', q: { fr: 'Quel studio a développé Rocket League avant son rachat par Epic Games ?' }, choices: [{ fr: 'Psyonix' }, { fr: 'Hi-Rez' }, { fr: 'Digital Extremes' }, { fr: 'Kronovi Games' }], answer: 0, why: { fr: 'Psyonix, studio de San Diego, crée Rocket League (2015) avant d’être racheté par Epic en 2019.' } },
        { id: 'esh8', q: { fr: 'Quel est le nom de la ligue européenne de League of Legends ?' }, choices: [{ fr: 'Le LEC' }, { fr: 'La LCS' }, { fr: 'La LCK' }, { fr: 'Le LPL' }], answer: 0, why: { fr: 'Le LEC (League of Legends European Championship) a remplacé les EU LCS en 2019.' } },
      ],
    },
  },
  {
    slug: 'studios-legends',
    route: '/quizz/studios-legends',
    videoId: 'aTs0zhm6Leg',
    image: quizThumbUrl('studios-legends'),
    tag: 'Studios',
    keywords: 'quizz studios créateurs kojima miyamoto naughty dog capcom ubisoft rockstar',
    source: '/dossiers/goya-hicosoft',
    labels: {
      fr: { title: 'Studios & créateurs', text: 'Kojima, Miyamoto, Naughty Dog, CD Projekt Red… les signatures derrière les mondes. Clin d’œil à notre dossier HicoSoft.' },
    },
    levels: {
      easy: [
        { id: 'sle1', q: { fr: 'Qui est considéré comme le père de Mario et de Zelda ?' }, choices: [{ fr: 'Shigeru Miyamoto' }, { fr: 'Satoru Iwata' }, { fr: 'Masahiro Sakurai' }, { fr: 'Hironobu Sakaguchi' }], answer: 0, why: { fr: 'Miyamoto crée Mario, Zelda, Donkey Kong… et reste l’âme créative de Nintendo.' } },
        { id: 'sle2', q: { fr: 'Sonic a été créé pour devenir la mascotte de quelle entreprise ?' }, choices: [{ fr: 'Nintendo' }, { fr: 'Atari' }, { fr: 'Sega' }, { fr: 'Sony' }], answer: 2, why: { fr: 'Sonic (1991) est la réponse de Sega au Mario de Nintendo.' } },
        { id: 'sle3', q: { fr: 'Quelle entreprise japonaise publie Resident Evil et Street Fighter ?' }, choices: [{ fr: 'Capcom' }, { fr: 'Konami' }, { fr: 'Square Enix' }, { fr: 'FromSoftware' }], answer: 0, why: { fr: 'Capcom, à Osaka, cumule ces deux licences historiques — et Monster Hunter.' } },
        { id: 'sle4', q: { fr: 'Quelle entreprise publie la série Assassin’s Creed ?' }, choices: [{ fr: 'Ubisoft' }, { fr: 'EA' }, { fr: 'Take-Two' }, { fr: 'Bandai Namco' }], answer: 0, why: { fr: 'Assassin’s Creed est la franchise phare d’Ubisoft depuis 2007.' } },
        { id: 'sle5', q: { fr: 'Quel studio suédois développe Minecraft ?' }, choices: [{ fr: 'Mojang' }, { fr: 'DICE' }, { fr: 'Paradox' }, { fr: 'Avalanche' }], answer: 0, why: { fr: 'Mojang, studio fondé par Notch, développe Minecraft depuis 2009.' } },
        { id: 'sle6', q: { fr: 'Quel studio de Sony a créé God of War ?' }, choices: [{ fr: 'Santa Monica Studio' }, { fr: 'Naughty Dog' }, { fr: 'Guerrilla' }, { fr: 'Sucker Punch' }], answer: 0, why: { fr: 'Santa Monica Studio signe God of War sur PlayStation depuis 2005.' } },
        { id: 'sle7', q: { fr: 'Quel studio a créé la série Les Sims ?' }, choices: [{ fr: 'Maxis' }, { fr: 'Valve' }, { fr: 'Firaxis' }, { fr: 'Blizzard' }], answer: 0, why: { fr: 'Maxis, studio de Will Wright, lance Les Sims en 2000 — et le genre de simulation de vie.' } },
        { id: 'sle8', q: { fr: 'Quel studio a développé la série Halo à ses débuts ?' }, choices: [{ fr: 'Bungie' }, { fr: '343 Industries' }, { fr: 'Rare' }, { fr: 'id Software' }], answer: 0, why: { fr: 'Bungie crée Halo (2001) avant de passer la main à 343 Industries chez Microsoft.' } },
      ],
      medium: [
        { id: 'slm1', q: { fr: 'Qui a créé Metal Gear avant de fonder Kojima Productions ?' }, choices: [{ fr: 'Hideo Kojima' }, { fr: 'Hidetaka Miyazaki' }, { fr: 'Shigeru Miyamoto' }, { fr: 'Yu Suzuki' }], answer: 0, why: { fr: 'Hideo Kojima crée Metal Gear chez Konami (1987) puis vole de ses propres ailes en 2015.' } },
        { id: 'slm2', q: { fr: 'Quel studio signe The Last of Us et Uncharted ?' }, choices: [{ fr: 'Naughty Dog' }, { fr: 'Insomniac Games' }, { fr: 'Santa Monica Studio' }, { fr: 'Guerrilla' }], answer: 0, why: { fr: 'Naughty Dog, studio californien de Sony, signe les deux sagas.' } },
        { id: 'slm3', q: { fr: 'Quel studio polonais a créé The Witcher et Cyberpunk 2077 ?' }, choices: [{ fr: 'Techland' }, { fr: 'CD Projekt Red' }, { fr: '11 bit studios' }, { fr: 'Bloober Team' }], answer: 1, why: { fr: 'CD Projekt Red, basé à Varsovie, adapte Sapkowski puis invente Night City.' } },
        { id: 'slm4', q: { fr: 'Quel studio développe GTA et Red Dead Redemption ?' }, choices: [{ fr: 'Rockstar Games' }, { fr: '2K Games' }, { fr: 'EA' }, { fr: 'Ubisoft Toronto' }], answer: 0, why: { fr: 'Rockstar Games (avec Rockstar North en Écosse) signe les deux open worlds.' } },
        { id: 'slm5', q: { fr: 'Quel studio a développé Marvel’s Spider-Man (2018) ?' }, choices: [{ fr: 'Insomniac Games' }, { fr: 'Sucker Punch' }, { fr: 'Bend Studio' }, { fr: 'Guerrilla' }], answer: 0, why: { fr: 'Insomniac Games, studio californien, signe Spider-Man et Ratchet & Clank.' } },
        { id: 'slm6', q: { fr: 'Quel studio finlandais a créé Alan Wake et Control ?' }, choices: [{ fr: 'Remedy Entertainment' }, { fr: 'Housemarque' }, { fr: 'Supercell' }, { fr: 'Frozenbyte' }], answer: 0, why: { fr: 'Remedy, studio d’Espoo, mêle thriller et récits imbriqués depuis Max Payne.' } },
        { id: 'slm7', q: { fr: 'Quel studio suédois développe Battlefield et a créé Mirror’s Edge ?' }, choices: [{ fr: 'DICE' }, { fr: 'Mojang' }, { fr: 'Massive' }, { fr: 'MachineGames' }], answer: 0, why: { fr: 'DICE, studio de Stockholm, signe Battlefield et le moteur Frostbite.' } },
        { id: 'slm8', q: { fr: 'Quel studio japonais a créé NieR: Automata avec Yoko Taro ?' }, choices: [{ fr: 'PlatinumGames' }, { fr: 'Team Ninja' }, { fr: 'Atlus' }, { fr: 'Cavia' }], answer: 0, why: { fr: 'PlatinumGames (Osaka) développe NieR: Automata (2017), réalisé par Yoko Taro.' } },
      ],
      hard: [
        { id: 'slh1', q: { fr: 'Quel studio néerlandais a créé Horizon Zero Dawn ?' }, choices: [{ fr: 'Guerrilla Games' }, { fr: 'Nixxes' }, { fr: 'Vanguard Games' }, { fr: 'Abbey Games' }], answer: 0, why: { fr: 'Guerrilla (Amsterdam) passe de Killzone à Horizon, lancé en 2017.' } },
        { id: 'slh2', q: { fr: 'Quel studio britannique a créé Tomb Raider en 1996 ?' }, choices: [{ fr: 'Core Design' }, { fr: 'Rare' }, { fr: 'Crystal Dynamics' }, { fr: 'Team17' }], answer: 0, why: { fr: 'Core Design (Derby) crée Lara Croft, avant que Crystal Dynamics ne reprenne la série.' } },
        { id: 'slh3', q: { fr: 'Quel studio ukrainien développe la série S.T.A.L.K.E.R. ?' }, choices: [{ fr: 'GSC Game World' }, { fr: '4A Games' }, { fr: 'Frogwares' }, { fr: 'Bohemia Interactive' }], answer: 0, why: { fr: 'GSC Game World, studio de Kiev, signe S.T.A.L.K.E.R. et la série Cossacks.' } },
        { id: 'slh4', q: { fr: 'Quel studio a créé Half-Life et Portal ?' }, choices: [{ fr: 'Valve' }, { fr: 'Gearbox' }, { fr: 'id Software' }, { fr: 'Raven Software' }], answer: 0, why: { fr: 'Valve (Washington) signe Half-Life (1998) et Portal, et exploite la plateforme Steam.' } },
        { id: 'slh5', q: { fr: 'Quel studio de Tim Schafer a créé Psychonauts ?' }, choices: [{ fr: 'Double Fine' }, { fr: 'LucasArts' }, { fr: 'Telltale' }, { fr: 'Ronin Games' }], answer: 0, why: { fr: 'Double Fine, fondé par Tim Schafer après Monkey Island, signe Psychonauts et Brütal Legend.' } },
        { id: 'slh6', q: { fr: 'Quel studio fondé à Lyon a développé Dishonored ?' }, choices: [{ fr: 'Arkane Studios' }, { fr: 'Quantic Dream' }, { fr: 'Asobo Studio' }, { fr: 'Spiders' }], answer: 0, why: { fr: 'Arkane Studios (Lyon) signe Dishonored et Deathloop pour le compte de Bethesda.' } },
        { id: 'slh7', q: { fr: 'Quelle entreprise a créé Diablo en 1996 ?' }, choices: [{ fr: 'Blizzard' }, { fr: 'id Software' }, { fr: 'Interplay' }, { fr: 'Westwood' }], answer: 0, why: { fr: 'Diablo naît chez Blizzard North, structure issue du studio Condor, rachetée par Blizzard.' } },
        { id: 'slh8', q: { fr: 'Quel studio japonais a créé la série Metal Slug ?' }, choices: [{ fr: 'SNK' }, { fr: 'Capcom' }, { fr: 'Irem' }, { fr: 'Treasure' }], answer: 0, why: { fr: 'SNK (Osaka) crée Metal Slug et The King of Fighters, piliers de l’arcade.' } },
      ],
    },
  },
  {
    slug: 'tech-hardware',
    route: '/quizz/tech-hardware',
    videoId: 'Zl6crcrPnPQ',
    image: quizThumbUrl('tech-hardware'),
    tag: 'Tech',
    keywords: 'quizz tech matériel gpu nvidia amd nvme ray tracing usb-c',
    labels: {
      fr: { title: 'Tech & matériel', text: 'GPU, NVMe, ray tracing, USB-C : le vocabulaire de la machine, côté segment Tech de l’émission — trois niveaux, du plus simple au plus pointu.' },
    },
    levels: {
      easy: [
        { id: 'the1', q: { fr: 'En parlant d’affichage, que mesurent les « FPS » ?' }, choices: [{ fr: 'La latence' }, { fr: 'Les images par seconde' }, { fr: 'La résolution' }, { fr: 'La température du panneau' }], answer: 1, why: { fr: 'Frames Per Second : la fluidité de l’image, à distinguer des Hz de la dalle.' } },
        { id: 'the2', q: { fr: 'Dans un processeur, à quoi servent les cœurs ?' }, choices: [{ fr: 'À exécuter plusieurs tâches en parallèle' }, { fr: 'À refroidir la puce' }, { fr: 'À stocker les données' }, { fr: 'À générer l’image' }], answer: 0, why: { fr: 'Chaque cœur exécute un flux d’instructions : plus de cœurs, plus de parallélisme.' } },
        { id: 'the3', q: { fr: 'Quel connecteur transporte image, données et charge dans un seul câble ?' }, choices: [{ fr: 'VGA' }, { fr: 'DVI' }, { fr: 'Péritel' }, { fr: 'USB-C' }], answer: 3, why: { fr: 'L’USB-C (avec DisplayPort Alt Mode et Power Delivery) remplace peu à peu tout le reste.' } },
        { id: 'the4', q: { fr: 'Le ray tracing consiste à…' }, choices: [{ fr: 'simuler le trajet de la lumière' }, { fr: 'compresser les textures' }, { fr: 'augmenter les FPS' }, { fr: 'réduire la latence réseau' }], answer: 0, why: { fr: 'On suit les rayons lumineux pour des reflets et ombres physiquement plausibles — coûteux en GPU.' } },
        { id: 'the5', q: { fr: 'Que signifie « RAM » ?' }, choices: [{ fr: 'Random Access Memory' }, { fr: 'Rapid Application Module' }, { fr: 'Read And Mount' }, { fr: 'Runtime Access Manager' }], answer: 0, why: { fr: 'La mémoire vive garde les données en cours d’utilisation : plus elle est vaste, plus on garde de programmes ouverts.' } },
        { id: 'the6', q: { fr: 'Quel composant exécute les instructions d’un programme ?' }, choices: [{ fr: 'Le processeur (CPU)' }, { fr: 'L’alimentation' }, { fr: 'Le disque dur' }, { fr: 'Le ventilateur' }], answer: 0, why: { fr: 'Le CPU orchestre les calculs ; le GPU se charge de l’image.' } },
        { id: 'the7', q: { fr: 'Quel câble relie un écran à un PC en transportant l’image et le son ?' }, choices: [{ fr: 'HDMI' }, { fr: 'USB-A' }, { fr: 'Ethernet' }, { fr: 'Jack 3,5 mm' }], answer: 0, why: { fr: 'HDMI et DisplayPort transportent image et son en numérique.' } },
        { id: 'the8', q: { fr: 'Quel type de disque n’a aucune pièce mobile ?' }, choices: [{ fr: 'Le SSD' }, { fr: 'Le disque dur mécanique' }, { fr: 'Le lecteur optique' }, { fr: 'La disquette' }], answer: 0, why: { fr: 'Le SSD lit et écrit dans des puces mémoire : silencieux, rapide, résistant aux chocs.' } },
      ],
      medium: [
        { id: 'thm1', q: { fr: 'Quelle entreprise conçoit les GPU GeForce ?' }, choices: [{ fr: 'AMD' }, { fr: 'NVIDIA' }, { fr: 'Intel' }, { fr: 'Qualcomm' }], answer: 1, why: { fr: 'NVIDIA signe la gamme GeForce ; AMD riposte avec les Radeon.' } },
        { id: 'thm2', q: { fr: 'Quelle technologie AMD concurrence le DLSS de NVIDIA ?' }, choices: [{ fr: 'FSR' }, { fr: 'RTX' }, { fr: 'XeSS' }, { fr: 'FreeSync' }], answer: 0, why: { fr: 'FidelityFX Super Resolution, l’upscaling d’AMD — XeSS vient d’Intel, FreeSync gère la synchronisation.' } },
        { id: 'thm3', q: { fr: 'Quelle interface équipe les SSD modernes les plus rapides ?' }, choices: [{ fr: 'SATA' }, { fr: 'IDE' }, { fr: 'NVMe' }, { fr: 'SCSI' }], answer: 2, why: { fr: 'NVMe sur port M.2 exploite le PCIe : des débits que SATA ne peut pas suivre.' } },
        { id: 'thm4', q: { fr: 'Quel port de carte graphique a disparu des PC modernes ?' }, choices: [{ fr: 'PCI Express' }, { fr: 'AGP' }, { fr: 'M.2' }, { fr: 'Thunderbolt' }], answer: 1, why: { fr: 'L’AGP (fin des années 90) a cédé sa place au PCI Express au milieu des années 2000.' } },
        { id: 'thm5', q: { fr: 'Que mesure le taux de rafraîchissement d’un écran, en hertz ?' }, choices: [{ fr: 'Le nombre d’images affichées par seconde' }, { fr: 'La résolution de la dalle' }, { fr: 'Le contraste maximal' }, { fr: 'La consommation électrique' }], answer: 0, why: { fr: '120 Hz affiche jusqu’à 120 images par seconde : la fluidité, à condition que la carte graphique suive.' } },
        { id: 'thm6', q: { fr: 'Quel procédé d’upscaling par IA équipe les cartes NVIDIA ?' }, choices: [{ fr: 'Le DLSS' }, { fr: 'Le FSR' }, { fr: 'Le XeSS' }, { fr: 'Le TAA' }], answer: 0, why: { fr: 'Le DLSS (Deep Learning Super Sampling) reconstruit l’image à partir d’une résolution moindre.' } },
        { id: 'thm7', q: { fr: 'Quelle entreprise conçoit les processeurs Ryzen ?' }, choices: [{ fr: 'Intel' }, { fr: 'AMD' }, { fr: 'ARM' }, { fr: 'Qualcomm' }], answer: 1, why: { fr: 'AMD lance Ryzen en 2017 et revient à la hauteur d’Intel sur le desktop.' } },
        { id: 'thm8', q: { fr: 'Que signifie « GPU » ?' }, choices: [{ fr: 'Graphics Processing Unit' }, { fr: 'General Power Unit' }, { fr: 'Gaming Performance Utility' }, { fr: 'Global Pixel Unit' }], answer: 0, why: { fr: 'Le processeur graphique exécute des milliers de calculs en parallèle pour produire l’image.' } },
      ],
      hard: [
        { id: 'thh1', q: { fr: 'Quelle norme de synchronisation adaptative est signée NVIDIA ?' }, choices: [{ fr: 'G-Sync' }, { fr: 'FreeSync' }, { fr: 'V-Sync' }, { fr: 'Adaptive Sync' }], answer: 0, why: { fr: 'G-Sync cale le rafraîchissement de l’écran sur les images de la carte ; AMD répond avec FreeSync.' } },
        { id: 'thh2', q: { fr: 'Que désigne le « TDP » d’un processeur ?' }, choices: [{ fr: 'La puissance thermique à dissiper' }, { fr: 'Le nombre de cœurs' }, { fr: 'La fréquence maximale' }, { fr: 'La taille du cache' }], answer: 0, why: { fr: 'Le TDP (Thermal Design Power) guide le choix du refroidissement et de l’alimentation.' } },
        { id: 'thh3', q: { fr: 'Que signifie « PCIe », le bus des cartes graphiques et des SSD NVMe ?' }, choices: [{ fr: 'Peripheral Component Interconnect Express' }, { fr: 'Processor Core Interface Extended' }, { fr: 'Parallel Card Input Engine' }, { fr: 'Power Control Interface Express' }], answer: 0, why: { fr: 'Le PCI Express remplace l’AGP et le PCI : chaque génération double le débit par ligne.' } },
        { id: 'thh4', q: { fr: 'Quelle mémoire ultra-rapide est empilée sur les cartes professionnelles ?' }, choices: [{ fr: 'La HBM' }, { fr: 'La DDR4' }, { fr: 'L’eMMC' }, { fr: 'La NAND' }], answer: 0, why: { fr: 'La HBM (High Bandwidth Memory) empile les puces pour raccourcir les distances et élargir la bande passante.' } },
        { id: 'thh5', q: { fr: 'Quel type de mémoire embarquée équipe une carte graphique moderne ?' }, choices: [{ fr: 'La GDDR' }, { fr: 'La DDR3' }, { fr: 'La LPDDR4' }, { fr: 'La SRAM' }], answer: 0, why: { fr: 'La VRAM (souvent GDDR6 ou GDDR7) stocke textures et tampons d’image.' } },
        { id: 'thh6', q: { fr: 'Quelle architecture de processeur équipe les Mac depuis 2020 ?' }, choices: [{ fr: 'ARM' }, { fr: 'x86' }, { fr: 'PowerPC' }, { fr: 'RISC-V' }], answer: 0, why: { fr: 'Les puces Apple M-series, basées sur l’architecture ARM, ont remplacé les processeurs Intel.' } },
        { id: 'thh7', q: { fr: 'Quel connecteur d’alimentation remplace les prises PCIe sur les cartes récentes ?' }, choices: [{ fr: 'Le 12VHPWR' }, { fr: 'Le Molex' }, { fr: 'Le SATA Power' }, { fr: 'Le 4-pin ATX' }], answer: 0, why: { fr: 'Le 12VHPWR (12+4 broches) alimente les cartes gourmandes ; des câbles mal enfoncés ont fait parler de lui.' } },
        { id: 'thh8', q: { fr: 'Quels cœurs d’un GPU calculent les intersections de rayons ?' }, choices: [{ fr: 'Les cœurs RT' }, { fr: 'Les cœurs Tensor' }, { fr: 'Les unités de rastérisation' }, { fr: 'Les contrôleurs mémoire' }], answer: 0, why: { fr: 'NVIDIA intègre des cœurs RT dédiés au ray tracing depuis la génération RTX ; les cœurs Tensor gèrent l’IA.' } },
      ],
    },
  },
  {
    slug: 'cinema-pop-culture',
    route: '/quizz/cinema-pop-culture',
    videoId: 'HzigJZOxz2o',
    image: quizThumbUrl('cinema-pop-culture'),
    tag: 'Cinéma',
    keywords: 'quizz cinéma séries adaptations arcane edgerunners witcher ready player one',
    labels: {
      fr: { title: 'Cinéma & pop culture', text: 'Adaptations, séries et films gamers : du PNJ de Free Guy au Ready Player One de Spielberg — trois niveaux, du grand public à l’expert.' },
    },
    levels: {
      easy: [
        { id: 'cpe1', q: { fr: 'Dans « Free Guy », le héros découvre qu’il est…' }, choices: [{ fr: 'un PNJ de jeu vidéo' }, { fr: 'un streamer' }, { fr: 'un speedrunner' }, { fr: 'un développeur' }], answer: 0, why: { fr: 'Ryan Reynolds joue un personnage d’arrière-plan qui prend conscience dans « Free City ».' } },
        { id: 'cpe2', q: { fr: 'Qui a réalisé « Ready Player One » (2018) ?' }, choices: [{ fr: 'Steven Spielberg' }, { fr: 'James Cameron' }, { fr: 'Denis Villeneuve' }, { fr: 'Christopher Nolan' }], answer: 0, why: { fr: 'Spielberg adapte le roman d’Ernest Cline et son déluge de références pop.' } },
        { id: 'cpe3', q: { fr: 'Quel film d’animation plonge dans un monde de bornes d’arcade, avec Ralph la casse ?' }, choices: [{ fr: 'Les Mondes de Ralph' }, { fr: 'Pixels' }, { fr: 'Tron' }, { fr: 'Ready Player One' }], answer: 0, why: { fr: 'Wreck-It Ralph / « Les Mondes de Ralph » (Disney, 2012), truffé de caméos gaming.' } },
        { id: 'cpe4', q: { fr: 'Quelle série adapte l’univers de League of Legends ?' }, choices: [{ fr: 'Arcane' }, { fr: 'Edgerunners' }, { fr: 'Sonic Prime' }, { fr: 'Splinter Cell' }], answer: 0, why: { fr: 'Arcane (Riot × Netflix) suit Jinx et Vi à Piltover et Zaun.' } },
        { id: 'cpe5', q: { fr: 'Quel film de 2021 fait revenir les trois Spider-Man au cinéma ?' }, choices: [{ fr: 'Spider-Man: No Way Home' }, { fr: 'Spider-Man: Homecoming' }, { fr: 'Venom' }, { fr: 'Morbius' }], answer: 0, why: { fr: 'No Way Home (2021) réunit Tom Holland, Tobey Maguire et Andrew Garfield.' } },
        { id: 'cpe6', q: { fr: 'Sur quelle plateforme la série adaptée de Fallout est-elle diffusée depuis 2024 ?' }, choices: [{ fr: 'Prime Video' }, { fr: 'Netflix' }, { fr: 'HBO Max' }, { fr: 'Disney+' }], answer: 0, why: { fr: 'Fallout (Prime Video, 2024) transpose le monde post-nucléaire de Bethesda.' } },
        { id: 'cpe7', q: { fr: 'Quel acteur incarne Nathan Drake dans Uncharted (2022) ?' }, choices: [{ fr: 'Tom Holland' }, { fr: 'Mark Wahlberg' }, { fr: 'Chris Pratt' }, { fr: 'Ryan Gosling' }], answer: 0, why: { fr: 'Tom Holland, déjà Spider-Man, prête ses traits à Nathan Drake face à Mark Wahlberg (Sully).' } },
        { id: 'cpe8', q: { fr: 'Quel film d’animation de 2023 met en scène Mario et Bowser ?' }, choices: [{ fr: 'Super Mario Bros., le film' }, { fr: 'Les Mondes de Ralph' }, { fr: 'Pixels' }, { fr: 'Sonic, le film' }], answer: 0, why: { fr: 'Le film d’animation d’Illumination (2023) dépasse le milliard de dollars de recettes.' } },
      ],
      medium: [
        { id: 'cpm1', q: { fr: 'Quelle franchise de jeux a été adaptée en série HBO en 2023 ?' }, choices: [{ fr: 'Halo' }, { fr: 'Fallout' }, { fr: 'The Last of Us' }, { fr: 'Tomb Raider' }], answer: 2, why: { fr: 'The Last of Us (HBO, 2023) ; Fallout suivra sur Prime Video en 2024.' } },
        { id: 'cpm2', q: { fr: 'Quelle série Netflix adapte l’univers de The Witcher ?' }, choices: [{ fr: 'The Witcher' }, { fr: 'Halo' }, { fr: 'Castlevania' }, { fr: 'Arcane' }], answer: 0, why: { fr: 'Henry Cavill y incarne Geralt dans les trois premières saisons.' } },
        { id: 'cpm3', q: { fr: 'Quel manga cyberpunk a donné un film culte en 1995 puis la série SAC ?' }, choices: [{ fr: 'Akira' }, { fr: 'Berserk' }, { fr: 'Ghost in the Shell' }, { fr: 'Evangelion' }], answer: 2, why: { fr: 'Ghost in the Shell de Masamune Shirow, filmé par Mamoru Oshii en 1995.' } },
        { id: 'cpm4', q: { fr: 'Quelle série anime est née dans l’univers de Cyberpunk 2077 ?' }, choices: [{ fr: 'Cyberpunk: Edgerunners' }, { fr: 'Arcane' }, { fr: 'Castlevania' }, { fr: 'Devil May Cry' }], answer: 0, why: { fr: 'Edgerunners (Studio Trigger, 2022) — et l’extension Phantom Liberty a suivi.' } },
        { id: 'cpm5', q: { fr: 'Quel jeu de Konami est adapté en série animée sur Netflix en 2017 ?' }, choices: [{ fr: 'Castlevania' }, { fr: 'Metal Gear' }, { fr: 'Silent Hill' }, { fr: 'Contra' }], answer: 0, why: { fr: 'Castlevania (Netflix, 2017) adapte la chasse aux vampires des Belmont.' } },
        { id: 'cpm6', q: { fr: 'Quelle série de Paramount+ adapte les jeux Halo ?' }, choices: [{ fr: 'Halo' }, { fr: 'Gears of War' }, { fr: 'Mass Effect' }, { fr: 'Destiny' }], answer: 0, why: { fr: 'Halo (2022) suit Master Chief en prises de vues réelles, avec Pablo Schreiber sous le casque.' } },
        { id: 'cpm7', q: { fr: 'Quel film de 2019 fait parler Pikachu avec la voix de Ryan Reynolds en VO ?' }, choices: [{ fr: 'Détective Pikachu' }, { fr: 'Sonic, le film' }, { fr: 'Pokémon : Mewtwo contre-attaque' }, { fr: 'Pixels' }], answer: 0, why: { fr: 'Détective Pikachu (2019) mêle animation et prises de vues réelles.' } },
        { id: 'cpm8', q: { fr: 'Quel film de 2020 a lancé la trilogie cinéma de Sonic ?' }, choices: [{ fr: 'Sonic, le film' }, { fr: 'Sonic 2' }, { fr: 'Sonic 3' }, { fr: 'Sonic Prime' }], answer: 0, why: { fr: 'Sonic, le film (2020) mêle animation et prises de vues réelles, suivi de deux suites.' } },
      ],
      hard: [
        { id: 'cph1', q: { fr: 'Quel studio d’animation japonais a produit Cyberpunk: Edgerunners ?' }, choices: [{ fr: 'Studio Trigger' }, { fr: 'Studio Ghibli' }, { fr: 'MAPPA' }, { fr: 'Kyoto Animation' }], answer: 0, why: { fr: 'Trigger (Kill la Kill, Gurren Lagann) anime Edgerunners, écrit avec CD Projekt Red.' } },
        { id: 'cph2', q: { fr: 'Quel réalisateur signe le film Ghost in the Shell de 1995 ?' }, choices: [{ fr: 'Mamoru Oshii' }, { fr: 'Katsuhiro Otomo' }, { fr: 'Hayao Miyazaki' }, { fr: 'Satoshi Kon' }], answer: 0, why: { fr: 'Mamoru Oshii filme Ghost in the Shell (1995), référence du cyberpunk au cinéma.' } },
        { id: 'cph3', q: { fr: 'Quel studio français d’animation a produit Arcane ?' }, choices: [{ fr: 'Fortiche' }, { fr: 'Illumination' }, { fr: 'Xilam' }, { fr: 'Bobbypills' }], answer: 0, why: { fr: 'Fortiche Production, studio parisien, anime Arcane pour Riot Games et Netflix.' } },
        { id: 'cph4', q: { fr: 'Quel film de 1982 plonge un programmeur dans le monde informatique de Tron ?' }, choices: [{ fr: 'Tron' }, { fr: 'Wargames' }, { fr: 'Blade Runner' }, { fr: 'L’Histoire sans fin' }], answer: 0, why: { fr: 'Tron (1982) est l’un des premiers films à mêler images de synthèse et prises de vues réelles.' } },
        { id: 'cph5', q: { fr: 'Quel roman de 1984 de William Gibson a popularisé le mot « cyberspace » ?' }, choices: [{ fr: 'Neuromancer' }, { fr: 'Snow Crash' }, { fr: 'Blade Runner' }, { fr: 'La Main gauche de la nuit' }], answer: 0, why: { fr: 'Neuromancer (1984) fonde le cyberpunk littéraire et impose le terme cyberspace.' } },
        { id: 'cph6', q: { fr: 'Quel film d’animation de 1988 suit des motards dans le Neo-Tokyo post-apocalyptique ?' }, choices: [{ fr: 'Akira' }, { fr: 'Ghost in the Shell' }, { fr: 'Perfect Blue' }, { fr: 'Cowboy Bebop' }], answer: 0, why: { fr: 'Akira (Katsuhiro Otomo, 1988) impose l’animation japonaise en Occident.' } },
        { id: 'cph7', q: { fr: 'Quel jeu de Konami est adapté au cinéma en 2006, dans la ville brumeuse de Silent Hill ?' }, choices: [{ fr: 'Silent Hill' }, { fr: 'Resident Evil' }, { fr: 'Fatal Frame' }, { fr: 'Alone in the Dark' }], answer: 0, why: { fr: 'Silent Hill (2006) transpose la série horrifique de Konami et sa brume iconique.' } },
        { id: 'cph8', q: { fr: 'Quel comédien prête sa voix à Bowser dans le film Super Mario Bros. (2023) ?' }, choices: [{ fr: 'Jack Black' }, { fr: 'Chris Pratt' }, { fr: 'Seth Rogen' }, { fr: 'Keegan-Michael Key' }], answer: 0, why: { fr: 'Jack Black double Bowser en VO, face à Chris Pratt (Mario) et Seth Rogen (Donkey Kong).' } },
      ],
    },
  },
  {
    slug: 'ps4-generation',
    route: '/quizz/ps4-generation',
    videoId: 'A2VPhWOUMHI',
    image: quizThumbUrl('ps4-generation'),
    tag: 'Consoles',
    keywords: 'quizz ps4 playstation 4 sony dualshock 4 exclusivités god of war horizon',
    source: '/dossiers/heritage-playstation-1',
    labels: {
      fr: { title: 'PS4 : la génération bleue', text: 'DualShock 4, exclusivités Naughty Dog et batailles en ligne : la console qui a régné sur les salons des années 2010, en trois niveaux.' },
    },
    levels: {
      easy: [
        { id: 'p4e1', q: { fr: 'En quelle année la PlayStation 4 sort-elle en Europe ?' }, choices: [{ fr: '2012' }, { fr: '2013' }, { fr: '2014' }, { fr: '2016' }], answer: 1, why: { fr: 'Lancée le 15 novembre 2013 en Amérique du Nord, la PS4 arrive en Europe le 29 novembre 2013.' } },
        { id: 'p4e2', q: { fr: 'Comment s’appelle la manette livrée avec la PS4 ?' }, choices: [{ fr: 'La DualShock 3' }, { fr: 'La DualShock 4' }, { fr: 'La DualSense' }, { fr: 'La Sixaxis' }], answer: 1, why: { fr: 'La DualShock 4 ajoute pavé tactile et barre lumineuse ; la DualSense n’arrivera qu’avec la PS5.' } },
        { id: 'p4e3', q: { fr: 'Quel support optique la PS4 lit-elle pour ses jeux ?' }, choices: [{ fr: 'Le CD' }, { fr: 'Le DVD' }, { fr: 'Le Blu-ray' }, { fr: 'La cartouche' }], answer: 2, why: { fr: 'Comme la PS3, la PS4 lit le Blu-ray : jusqu’à 50 Go par galette double couche.' } },
        { id: 'p4e4', q: { fr: 'Quelle exclu PS4 suit Aloy dans un monde peuplé de machines ?' }, choices: [{ fr: 'Horizon Zero Dawn' }, { fr: 'Killzone Shadow Fall' }, { fr: 'Infamous Second Son' }, { fr: 'Bloodborne' }], answer: 0, why: { fr: 'Horizon Zero Dawn (2017), signé Guerrilla, devient l’une des nouvelles licences fortes de Sony.' } },
        { id: 'p4e5', q: { fr: 'Quel battle royale a fait de la PS4 la reine du jeu en ligne grand public ?' }, choices: [{ fr: 'PUBG' }, { fr: 'Fortnite' }, { fr: 'Apex Legends' }, { fr: 'Warzone' }], answer: 1, why: { fr: 'Fortnite (2017) transforme la PS4 en phénomène de société, cross-play compris.' } },
        { id: 'p4e6', q: { fr: 'Quel service en ligne conditionne le multijoueur sur PS4 ?' }, choices: [{ fr: 'Le PlayStation Plus' }, { fr: 'Le Xbox Live' }, { fr: 'Le Nintendo Switch Online' }, { fr: 'Le Battle.net' }], answer: 0, why: { fr: 'Le PlayStation Plus ouvre le jeu en ligne et offre des jeux chaque mois.' } },
        { id: 'p4e7', q: { fr: 'À combien d’exemplaires la PS4 s’est-elle vendue environ ?' }, choices: [{ fr: '60 millions' }, { fr: '85 millions' }, { fr: 'Plus de 117 millions' }, { fr: '200 millions' }], answer: 2, why: { fr: 'Avec plus de 117 millions d’unités, la PS4 est la console Sony la plus vendue après la PS2.' } },
        { id: 'p4e8', q: { fr: 'Quelle couleur habille la PS4 originale ?' }, choices: [{ fr: 'Noire' }, { fr: 'Blanche' }, { fr: 'Bleue' }, { fr: 'Argentée' }], answer: 0, why: { fr: 'Noir mat et brillant séparés en diagonale : la signature de la PS4 de 2013.' } },
      ],
      medium: [
        { id: 'p4m1', q: { fr: 'Quelle version musclée de la PS4, capable de 4K, sort en 2016 ?' }, choices: [{ fr: 'La PS4 Slim' }, { fr: 'La PS4 Pro' }, { fr: 'La PS4K' }, { fr: 'La PS TV' }], answer: 1, why: { fr: 'La PS4 Pro (2016) vise la 4K et le HDR ; la Slim, plus compacte, sort la même année.' } },
        { id: 'p4m2', q: { fr: 'Quel studio Sony signe God of War (2018) sur PS4 ?' }, choices: [{ fr: 'Guerrilla' }, { fr: 'Santa Monica Studio' }, { fr: 'Insomniac Games' }, { fr: 'Sucker Punch' }], answer: 1, why: { fr: 'Santa Monica Studio ressuscite Kratos dans une saga nordique multi-récompensée.' } },
        { id: 'p4m3', q: { fr: 'Quel jeu de Naughty Dog conclut la génération PS4 en 2020 ?' }, choices: [{ fr: 'Uncharted 4' }, { fr: 'The Last of Us Part II' }, { fr: 'Crash Bandicoot 4' }, { fr: 'Days Gone' }], answer: 1, why: { fr: 'The Last of Us Part II (2020) rafle les récompenses et clôt la génération.' } },
        { id: 'p4m4', q: { fr: 'Quels boutons de la DualShock 4 remplacent Start et Select ?' }, choices: [{ fr: 'Options et Share' }, { fr: 'Menu et View' }, { fr: 'Plus et Moins' }, { fr: 'L3 et R3' }], answer: 0, why: { fr: 'Share pour capturer et diffuser, Options pour la pause : la PS4 pense social.' } },
        { id: 'p4m5', q: { fr: 'Quelle exclu horrifique de FromSoftware hante la PS4 en 2015 ?' }, choices: [{ fr: 'Dark Souls III' }, { fr: 'Bloodborne' }, { fr: 'Sekiro' }, { fr: 'Déraciné' }], answer: 1, why: { fr: 'Bloodborne (2015), l’exclu FromSoftware qui fait encore rêver Yharnam.' } },
        { id: 'p4m6', q: { fr: 'Quel titre Guerrilla accompagnait le lancement européen de la PS4 ?' }, choices: [{ fr: 'Infamous Second Son' }, { fr: 'Killzone Shadow Fall' }, { fr: 'Driveclub' }, { fr: 'Knack' }], answer: 1, why: { fr: 'Killzone Shadow Fall est l’un des titres du 29 novembre 2013 en Europe.' } },
        { id: 'p4m7', q: { fr: 'Quel casque de réalité virtuelle Sony arrive sur PS4 en 2016 ?' }, choices: [{ fr: 'Le PlayStation VR' }, { fr: 'Le Gear VR' }, { fr: 'L’Oculus Rift' }, { fr: 'Le Vive' }], answer: 0, why: { fr: 'Le PlayStation VR (2016) apporte la réalité virtuelle à des millions de salons.' } },
        { id: 'p4m8', q: { fr: 'Quel jeu de course de Polyphony débarque sur PS4 en 2017 ?' }, choices: [{ fr: 'Gran Turismo Sport' }, { fr: 'Forza Motorsport 7' }, { fr: 'Project Cars 2' }, { fr: 'Dirt Rally' }], answer: 0, why: { fr: 'Gran Turismo Sport (2017) recentre la saga sur la compétition FIA.' } },
      ],
      hard: [
        { id: 'p4h1', q: { fr: 'Avec qui Sony a-t-il co-développé l’APU de la PS4 ?' }, choices: [{ fr: 'Intel' }, { fr: 'AMD' }, { fr: 'NVIDIA' }, { fr: 'IBM' }], answer: 1, why: { fr: 'CPU Jaguar et GPU Radeon : l’APU AMD équipe la PS4 comme la Xbox One.' } },
        { id: 'p4h2', q: { fr: 'Combien de mémoire la PS4 embarque-t-elle ?' }, choices: [{ fr: '4 Go DDR3' }, { fr: '8 Go GDDR5' }, { fr: '12 Go GDDR6' }, { fr: '16 Go DDR4' }], answer: 1, why: { fr: '8 Go de GDDR5 unifiés : le pari gagnant de Sony face à la Xbox One.' } },
        { id: 'p4h3', q: { fr: 'Quel jeu de lancement mettait en scène un héros qui s’assemble morceau par morceau ?' }, choices: [{ fr: 'Knack' }, { fr: 'Resogun' }, { fr: 'The Order 1886' }, { fr: 'Infamous' }], answer: 0, why: { fr: 'Knack, signé Mark Cerny lui-même, accompagne le line-up de novembre 2013.' } },
        { id: 'p4h4', q: { fr: 'Quelle exclu de 2014 fait vibrer Seattle après l’apocalypse ?' }, choices: [{ fr: 'Infamous Second Son' }, { fr: 'The Last of Us' }, { fr: 'Days Gone' }, { fr: 'Horizon' }], answer: 0, why: { fr: 'Infamous Second Son (Sucker Punch, 2014) montre les muscles de la PS4 dès la première année.' } },
        { id: 'p4h5', q: { fr: 'Environ combien de TFLOPS délivre la PS4 Pro ?' }, choices: [{ fr: '1,84' }, { fr: '4,2' }, { fr: '10,3' }, { fr: '12,1' }], answer: 1, why: { fr: '4,2 TFLOPS pour la Pro, contre 1,84 pour la PS4 de base ; la PS5 montera à 10,28.' } },
        { id: 'p4h6', q: { fr: 'Quel jeu de Quantic Dream (2018) suit trois androïdes en fuite ?' }, choices: [{ fr: 'Heavy Rain' }, { fr: 'Beyond Two Souls' }, { fr: 'Detroit Become Human' }, { fr: 'Fahrenheit' }], answer: 2, why: { fr: 'Detroit: Become Human (2018) et ses destins croisés : Kara, Connor, Markus.' } },
        { id: 'p4h7', q: { fr: 'Sur quelle portable le Remote Play de la PS4 s’affiche-t-il dès 2013 ?' }, choices: [{ fr: 'La PSP' }, { fr: 'La PS Vita' }, { fr: 'La 3DS' }, { fr: 'La Switch' }], answer: 1, why: { fr: 'La PS Vita sert d’écran déporté à la PS4 dès le lancement de la console.' } },
        { id: 'p4h8', q: { fr: 'À sa sortie, la PS4 ne lit les jeux d’aucune console précédente, notamment pas ceux de…' }, choices: [{ fr: 'La PS1' }, { fr: 'La PS2' }, { fr: 'La PS3' }, { fr: 'La PSP' }], answer: 2, why: { fr: 'L’architecture x86 rompt avec le Cell : la PS3 n’est pas lisible, le streaming PS Now tentera de compenser.' } },
      ],
    },
  },
  {
    slug: 'nintendo-64',
    route: '/quizz/nintendo-64',
    videoId: 'A2VPhWOUMHI',
    image: quizThumbUrl('nintendo-64'),
    tag: 'Consoles',
    keywords: 'quizz nintendo 64 n64 super mario 64 ocarina of time mario kart 64 banjo',
    source: '/dossiers/choc-generations-gaming',
    labels: {
      fr: { title: 'Nintendo 64 : la révolution 3D', text: 'Super Mario 64, Ocarina of Time, Mario Kart 64 : la cartouche qui a inventé la 3D et les soirées à quatre, en trois niveaux.' },
    },
    levels: {
      easy: [
        { id: 'n6e1', q: { fr: 'En quelle année la Nintendo 64 sort-elle au Japon ?' }, choices: [{ fr: '1994' }, { fr: '1995' }, { fr: '1996' }, { fr: '1998' }], answer: 2, why: { fr: 'Lancée le 23 juin 1996 au Japon puis à l’automne aux États-Unis, elle arrive en Europe en mars 1997.' } },
        { id: 'n6e2', q: { fr: 'Quel jeu de lancement a défini la 3D moderne ?' }, choices: [{ fr: 'Super Mario 64' }, { fr: 'Ocarina of Time' }, { fr: 'Star Fox 64' }, { fr: 'Pilotwings 64' }], answer: 0, why: { fr: 'Super Mario 64 (1996) invente la caméra 3D libre et sert encore de référence au genre.' } },
        { id: 'n6e3', q: { fr: 'Combien de ports manette la N64 intègre-t-elle en façade ?' }, choices: [{ fr: 'Un' }, { fr: 'Deux' }, { fr: 'Quatre' }, { fr: 'Six' }], answer: 2, why: { fr: 'Quatre ports : Mario Kart 64 et Smash Bros. en font la reine des soirées multijoueur.' } },
        { id: 'n6e4', q: { fr: 'Quel titre de 1998 est régulièrement cité comme meilleur jeu de tous les temps ?' }, choices: [{ fr: 'Ocarina of Time' }, { fr: 'Majora’s Mask' }, { fr: 'GoldenEye 007' }, { fr: 'F-Zero X' }], answer: 0, why: { fr: 'Ocarina of Time verrouille le langage de l’aventure 3D : verrouillage Z, cycle jour/nuit, ocarina.' } },
        { id: 'n6e5', q: { fr: 'Quel jeu de course déclenche des batailles à quatre en écran splitté ?' }, choices: [{ fr: 'Mario Kart 64' }, { fr: 'Wave Race 64' }, { fr: 'F-Zero X' }, { fr: 'Diddy Kong Racing' }], answer: 0, why: { fr: 'Mario Kart 64 (1996) et son écran splitté à quatre : des soirées entières de carapaces bleues.' } },
        { id: 'n6e6', q: { fr: 'Quel accessoire fait vibrer la manette N64 dès 1997 ?' }, choices: [{ fr: 'Le Rumble Pak' }, { fr: 'Le Transfer Pak' }, { fr: 'Le Controller Pak' }, { fr: 'L’Expansion Pak' }], answer: 0, why: { fr: 'Le Rumble Pak, lancé avec Star Fox 64, généralise la vibration.' } },
        { id: 'n6e7', q: { fr: 'Quel duo ours & oiseau signé Rare marque la N64 ?' }, choices: [{ fr: 'Conker' }, { fr: 'Banjo-Kazooie' }, { fr: 'Perfect Dark' }, { fr: 'Donkey Kong 64' }], answer: 1, why: { fr: 'Banjo-Kazooie (1998), le plateformer 3D culte du studio Rare.' } },
        { id: 'n6e8', q: { fr: 'Quel support de jeu la N64 conserve-t-elle face au CD-ROM ?' }, choices: [{ fr: 'Le CD-ROM' }, { fr: 'La cartouche' }, { fr: 'Le MiniDisc' }, { fr: 'La disquette' }], answer: 1, why: { fr: 'La cartouche : chargements instantanés, mais capacité limitée face au CD de la PlayStation.' } },
      ],
      medium: [
        { id: 'n6m1', q: { fr: 'Quelle manette « trident » a démocratisé le stick analogique ?' }, choices: [{ fr: 'Celle de la N64' }, { fr: 'La DualShock' }, { fr: 'Le pad Saturn' }, { fr: 'La Wiimote' }], answer: 0, why: { fr: 'Le stick central de la manette N64 apprend le contrôle 3D à toute une génération.' } },
        { id: 'n6m2', q: { fr: 'Quel FPS James Bond transforme la N64 en machine à soirées ?' }, choices: [{ fr: 'Perfect Dark' }, { fr: 'GoldenEye 007' }, { fr: 'Turok' }, { fr: 'Doom 64' }], answer: 1, why: { fr: 'GoldenEye 007 (1997) : le multijoueur en écran splitté qui a usé des millions de canapés.' } },
        { id: 'n6m3', q: { fr: 'Quel space shooter de 1997 popularise le Rumble Pak ?' }, choices: [{ fr: 'Star Fox 64' }, { fr: 'Wave Race 64' }, { fr: 'F-Zero X' }, { fr: 'Pokémon Stadium' }], answer: 0, why: { fr: 'Star Fox 64 (1997) et son « Do a barrel roll ! », vendu avec le Rumble Pak en Europe.' } },
        { id: 'n6m4', q: { fr: 'Quel système de verrouillage Ocarina of Time lègue-t-il au genre ?' }, choices: [{ fr: 'Le Z-targeting' }, { fr: 'Le lock-on gyroscopique' }, { fr: 'Le viseur laser' }, { fr: 'Le mode photo' }], answer: 0, why: { fr: 'Le Z-targeting : la caméra qui verrouille l’ennemi, copiée par toute l’industrie.' } },
        { id: 'n6m5', q: { fr: 'Quel jeu Rare de 1997 court contre Mario Kart avec des animaux ?' }, choices: [{ fr: 'Diddy Kong Racing' }, { fr: 'Banjo-Tooie' }, { fr: 'Mickey’s Speedway USA' }, { fr: 'Cruis’n USA' }], answer: 0, why: { fr: 'Diddy Kong Racing (Rare, 1997) ose le mode aventure face au kart de Nintendo.' } },
        { id: 'n6m6', q: { fr: 'Quel partenaire technologique a co-conçu le processeur de la N64 ?' }, choices: [{ fr: 'Sega' }, { fr: 'Silicon Graphics' }, { fr: 'IBM' }, { fr: 'Atari' }], answer: 1, why: { fr: 'Le binôme Nintendo-SGI signe la machine : 64 bits et puissance graphique inédite.' } },
        { id: 'n6m7', q: { fr: 'Quel jeu de plateau à dés lance une longue série en 1998 ?' }, choices: [{ fr: 'Mario Party' }, { fr: 'WarioWare' }, { fr: 'Pokémon Snap' }, { fr: 'Yoshi’s Story' }], answer: 0, why: { fr: 'Mario Party (1998) : un plateau, des mini-jeux et des amitiés brisées.' } },
        { id: 'n6m8', q: { fr: 'Quel crossover de baston réunit Mario, Link et Pikachu en 1999 ?' }, choices: [{ fr: 'Super Smash Bros.' }, { fr: 'Mario Fighters' }, { fr: 'Pokémon Stadium' }, { fr: 'Kirby’s Dream Land' }], answer: 0, why: { fr: 'Super Smash Bros. (1999) transforme les mascottes en combattants.' } },
      ],
      hard: [
        { id: 'n6h1', q: { fr: 'Quelle capacité maximale pour les cartouches N64 ?' }, choices: [{ fr: '8 Mo' }, { fr: '32 Mo' }, { fr: '64 Mo' }, { fr: '128 Mo' }], answer: 2, why: { fr: '64 Mo en pointe : dérisoire face aux 650 Mo du CD, au cœur de l’exil des éditeurs tiers.' } },
        { id: 'n6h2', q: { fr: 'Quel add-on à disques, réservé au Japon, fut un échec commercial ?' }, choices: [{ fr: 'Le Satellaview' }, { fr: 'Le 64DD' }, { fr: 'Le Game Boy Player' }, { fr: 'L’e-Reader' }], answer: 1, why: { fr: 'Le 64DD (1999) et ses disques de 64 Mo : une poignée de milliers d’unités, neuf jeux.' } },
        { id: 'n6h3', q: { fr: 'L’Expansion Pak fait passer la RAM de 4 à…' }, choices: [{ fr: '6 Mo' }, { fr: '8 Mo' }, { fr: '12 Mo' }, { fr: '16 Mo' }], answer: 1, why: { fr: '8 Mo : indispensable à Majora’s Mask et au mode haute résolution de Perfect Dark.' } },
        { id: 'n6h4', q: { fr: 'Quel jeu de course futuriste tient 60 i/s avec 30 véhicules ?' }, choices: [{ fr: 'F-Zero X' }, { fr: 'Wipeout 64' }, { fr: 'Extreme-G' }, { fr: 'Pod' }], answer: 0, why: { fr: 'F-Zero X (1998) sacrifie la finesse graphique pour la fluidité absolue.' } },
        { id: 'n6h5', q: { fr: 'Dans Majora’s Mask, combien de jours avant la chute de la Lune ?' }, choices: [{ fr: 'Un' }, { fr: 'Trois' }, { fr: 'Sept' }, { fr: 'Dix' }], answer: 1, why: { fr: 'Trois jours, à remonter avec le Chant du temps : la boucle temporelle la plus célèbre du médium.' } },
        { id: 'n6h6', q: { fr: 'Quel safari photographique Pokémon signe la N64 en 1999 ?' }, choices: [{ fr: 'Pokémon Snap' }, { fr: 'Pokémon Stadium' }, { fr: 'Hey You, Pikachu!' }, { fr: 'Pokémon Puzzle League' }], answer: 0, why: { fr: 'Pokémon Snap (1999) : mitrailler des Magicarpe, un art.' } },
        { id: 'n6h7', q: { fr: 'Quel platformer adulte et tardif (2001) clôt la N64 chez Rare ?' }, choices: [{ fr: 'Conker’s Bad Fur Day' }, { fr: 'Jet Force Gemini' }, { fr: 'Donkey Kong 64' }, { fr: 'Banjo-Tooie' }], answer: 0, why: { fr: 'Conker’s Bad Fur Day (2001), le chant du cygne irrévérencieux de la console.' } },
        { id: 'n6h8', q: { fr: 'Wave Race 64 vous met aux commandes de…' }, choices: [{ fr: 'Des motos des mers' }, { fr: 'Des voiliers' }, { fr: 'Des hydroglisseurs' }, { fr: 'Des sous-marins' }], answer: 0, why: { fr: 'Des jet-skis : la houle simulée de Wave Race 64 reste une leçon de physique.' } },
      ],
    },
  },
  {
    slug: 'megadrive',
    route: '/quizz/megadrive',
    videoId: 'A2VPhWOUMHI',
    image: quizThumbUrl('megadrive'),
    tag: 'Consoles',
    keywords: 'quizz megadrive sega genesis sonic streets of rage 16 bits mega-cd',
    source: '/dossiers/choc-generations-gaming',
    labels: {
      fr: { title: 'Mega Drive : la guerre des 16 bits', text: 'Sonic, Streets of Rage et le « blast processing » : la console Sega qui a défié Nintendo et marqué l’Europe, en trois niveaux.' },
    },
    levels: {
      easy: [
        { id: 'mde1', q: { fr: 'En quelle année la Mega Drive sort-elle en Europe ?' }, choices: [{ fr: '1988' }, { fr: '1989' }, { fr: '1990' }, { fr: '1992' }], answer: 2, why: { fr: '1988 au Japon, 1989 aux États-Unis sous le nom Genesis, fin 1990 en Europe.' } },
        { id: 'mde2', q: { fr: 'Comment s’appelle la Mega Drive en Amérique du Nord ?' }, choices: [{ fr: 'La Saturn' }, { fr: 'La Genesis' }, { fr: 'La Nomad' }, { fr: 'La Sega CD' }], answer: 1, why: { fr: 'Outre-Atlantique, la console s’appelle Sega Genesis — même machine, autre nom.' } },
        { id: 'mde3', q: { fr: 'Quel héros bleu devient la mascotte de Sega en 1991 ?' }, choices: [{ fr: 'Knuckles' }, { fr: 'Sonic' }, { fr: 'Alex Kidd' }, { fr: 'Ristar' }], answer: 1, why: { fr: 'Sonic the Hedgehog (1991) donne enfin à Sega sa réponse à Mario, vitesse comprise.' } },
        { id: 'mde4', q: { fr: 'Combien de bits la Mega Drive brandit-elle comme étendard ?' }, choices: [{ fr: '8' }, { fr: '16' }, { fr: '32' }, { fr: '64' }], answer: 1, why: { fr: '« 16-BIT » en lettres d’or sur la console : l’argument massue de la guerre des consoles.' } },
        { id: 'mde5', q: { fr: 'Combien de boutons d’action sur la manette de base ?' }, choices: [{ fr: 'Deux' }, { fr: 'Trois' }, { fr: 'Six' }, { fr: 'Neuf' }], answer: 1, why: { fr: 'Trois boutons (A, B, C) ; le pad six boutons arrivera avec Street Fighter II.' } },
        { id: 'mde6', q: { fr: 'Quel add-on ajoute le CD-ROM à la Mega Drive ?' }, choices: [{ fr: 'Le 32X' }, { fr: 'Le Mega-CD' }, { fr: 'Le Virtua Processor' }, { fr: 'La Game Gear' }], answer: 1, why: { fr: 'Le Mega-CD (1991) apporte cinématiques et CD audio ; le 32X musclera la 3D, sans convaincre.' } },
        { id: 'mde7', q: { fr: 'Quelle trilogie de beat’em all fait régner Axel et Blaze ?' }, choices: [{ fr: 'Golden Axe' }, { fr: 'Streets of Rage' }, { fr: 'Shinobi' }, { fr: 'Comix Zone' }], answer: 1, why: { fr: 'Streets of Rage (1991-1994) et sa bande-son culte signée Yūzō Koshiro.' } },
        { id: 'mde8', q: { fr: 'Quel slogan US moque Nintendo pour vanter la Genesis ?' }, choices: [{ fr: '« Genesis does what Nintendon’t »' }, { fr: '« Sega screams »' }, { fr: '« Blast processing »' }, { fr: '« Welcome to the next level »' }], answer: 0, why: { fr: '« Genesis does what Nintendon’t » (1989) : la guerre des publicités est déclarée.' } },
      ],
      medium: [
        { id: 'mdm1', q: { fr: 'Quel processeur motorise la Mega Drive ?' }, choices: [{ fr: 'L’Intel 8086' }, { fr: 'Le Motorola 68000' }, { fr: 'Le Zilog Z80' }, { fr: 'L’ARM7' }], answer: 1, why: { fr: 'Le Motorola 68000 à 7,6 MHz ; le Z80, lui, s’occupe du son.' } },
        { id: 'mdm2', q: { fr: 'Quel run’n gun de Treasure (1993) pousse la console dans ses retranchements ?' }, choices: [{ fr: 'Gunstar Heroes' }, { fr: 'Rocket Knight Adventures' }, { fr: 'Contra Hard Corps' }, { fr: 'Ranger X' }], answer: 0, why: { fr: 'Gunstar Heroes empile sprites et effets sans ralentir : la vitrine technique de la Mega Drive.' } },
        { id: 'mdm3', q: { fr: 'Quel jeu de course utilise la puce SVP pour la 3D en 1994 ?' }, choices: [{ fr: 'OutRun' }, { fr: 'Virtua Racing' }, { fr: 'Super Hang-On' }, { fr: 'Rad Mobile' }], answer: 1, why: { fr: 'Virtua Racing et sa puce SVP dans la cartouche : des polygones sur 16 bits.' } },
        { id: 'mdm4', q: { fr: 'Quel Sonic de 1992 présente Tails ?' }, choices: [{ fr: 'Sonic CD' }, { fr: 'Sonic the Hedgehog 2' }, { fr: 'Sonic 3' }, { fr: 'Sonic & Knuckles' }], answer: 1, why: { fr: 'Sonic 2 (1992) : Tails, le spin dash et des anneaux à foison.' } },
        { id: 'mdm5', q: { fr: 'Quel Aladdin (1993) sur Mega Drive vient de Virgin Games ?' }, choices: [{ fr: 'Celui de Capcom' }, { fr: 'Celui de Virgin Games' }, { fr: 'Celui de Sega' }, { fr: 'Celui de Treasure' }], answer: 1, why: { fr: 'L’Aladdin Mega Drive, animé façon Disney par Virgin, éclipse la version Capcom de la SNES.' } },
        { id: 'mdm6', q: { fr: 'Quelle mascotte étoilée, née d’un prototype Sonic, sort en 1995 ?' }, choices: [{ fr: 'Ristar' }, { fr: 'Vector' }, { fr: 'Mighty' }, { fr: 'Ray' }], answer: 0, why: { fr: 'Ristar (1995), le héros aux bras extensibles issu des premières idées de Sonic.' } },
        { id: 'mdm7', q: { fr: 'Le 32X (1994) voulait contrer quelle génération ?' }, choices: [{ fr: 'Les 8 bits' }, { fr: 'Les 32 bits Saturn et PlayStation' }, { fr: 'Les portables' }, { fr: 'La Neo Geo' }], answer: 1, why: { fr: 'Le 32X bouche-trou face à la Saturn et à la PlayStation : trop tard, trop peu.' } },
        { id: 'mdm8', q: { fr: 'Quel beat’em all médiéval de Sega (1989) se joue à trois ?' }, choices: [{ fr: 'Golden Axe' }, { fr: 'Altered Beast' }, { fr: 'The Revenge of Shinobi' }, { fr: 'Shadow Dancer' }], answer: 0, why: { fr: 'Golden Axe : le barbare, l’amazone et le nain, montures dragon incluses.' } },
      ],
      hard: [
        { id: 'mdh1', q: { fr: 'Sur Mega Drive, le Z80 s’occupe de…' }, choices: [{ fr: 'L’affichage' }, { fr: 'Du son' }, { fr: 'Des sauvegardes' }, { fr: 'Des manettes' }], answer: 1, why: { fr: 'Le Z80 pilote le YM2612 et le PSG : la fameuse sonorité FM de la console.' } },
        { id: 'mdh2', q: { fr: 'Quel RPG de 1993 reste le sommet 16 bits de la saga Sega ?' }, choices: [{ fr: 'Shining Force II' }, { fr: 'Phantasy Star IV' }, { fr: 'Story of Thor' }, { fr: 'Light Crusader' }], answer: 1, why: { fr: 'Phantasy Star IV (1993), le chant du cygne RPG de la Mega Drive.' } },
        { id: 'mdh3', q: { fr: 'Quelle technologie de cartouche empilable introduit Sonic & Knuckles ?' }, choices: [{ fr: 'Le lock-on' }, { fr: 'Le battery-backup' }, { fr: 'Le SVP' }, { fr: 'Le pass-through 32X' }], answer: 0, why: { fr: 'Le lock-on : emboîtez Sonic 3 dessus et jouez à Sonic 3 & Knuckles.' } },
        { id: 'mdh4', q: { fr: 'Quelle série de foot US d’EA fait sa fortune sur Mega Drive ?' }, choices: [{ fr: 'NFL 2K' }, { fr: 'John Madden Football' }, { fr: 'NFL Blitz' }, { fr: 'Quarterback Club' }], answer: 1, why: { fr: 'John Madden Football dès 1990 : l’accord EA-Sega qui bâtit un empire.' } },
        { id: 'mdh5', q: { fr: 'Dans Comix Zone (1995), l’action se déroule…' }, choices: [{ fr: 'Dans les cases d’un comic book' }, { fr: 'Sous la mer' }, { fr: 'Dans un flipper' }, { fr: 'En vue subjective' }], answer: 0, why: { fr: 'Comix Zone : chaque écran est une page, chaque saut change de case.' } },
        { id: 'mdh6', q: { fr: 'Quel shmup Technosoft (1990) reste un Graal de collectionneur ?' }, choices: [{ fr: 'Thunder Force III' }, { fr: 'Gaiares' }, { fr: 'Gynoid' }, { fr: 'Hellfire' }], answer: 0, why: { fr: 'Thunder Force III (1990) : le shoot qui définit la console, entre défilements et boss énormes.' } },
        { id: 'mdh7', q: { fr: 'Le Sega Channel (1994) distribuait les jeux via…' }, choices: [{ fr: 'L’ADSL' }, { fr: 'Le câble télé' }, { fr: 'Le satellite' }, { fr: 'La ligne téléphonique' }], answer: 1, why: { fr: 'Le Sega Channel téléchargeait des jeux par le câble : l’ancêtre du dématérialisé.' } },
        { id: 'mdh8', q: { fr: 'Herzog Zwei (1989) est considéré comme l’ancêtre de quel genre ?' }, choices: [{ fr: 'Le MOBA' }, { fr: 'Le STR moderne' }, { fr: 'Le battle royale' }, { fr: 'Le city-builder' }], answer: 1, why: { fr: 'Herzog Zwei pose les bases du temps réel stratégique bien avant Dune II.' } },
      ],
    },
  },
  {
    slug: 'pc-legends',
    route: '/quizz/pc-legends',
    videoId: 't1Re8ki_gsw',
    image: quizThumbUrl('pc-legends'),
    tag: 'PC',
    keywords: 'quizz pc doom half-life starcraft diablo warcraft counter-strike baldur’s gate',
    labels: {
      fr: { title: 'Jeux PC légendaires', text: 'DOOM, Half-Life, StarCraft, Diablo : les fondations du jeu PC, du modding à l’e-sport, en trois niveaux.' },
    },
    levels: {
      easy: [
        { id: 'pce1', q: { fr: 'Quel FPS d’id Software (1993) déchaîne la planète PC ?' }, choices: [{ fr: 'Wolfenstein 3D' }, { fr: 'DOOM' }, { fr: 'Quake' }, { fr: 'Duke Nukem 3D' }], answer: 1, why: { fr: 'DOOM (1993) popularise le FPS et le modding — installé partout, même là où Windows 95 tardait.' } },
        { id: 'pce2', q: { fr: 'Quel jeu Valve de 1998 mêle récit et FPS sans jamais couper la caméra ?' }, choices: [{ fr: 'Half-Life' }, { fr: 'Portal' }, { fr: 'Left 4 Dead' }, { fr: 'Counter-Strike' }], answer: 0, why: { fr: 'Half-Life raconte son histoire en vue subjective, sans cinématique : une révolution narrative.' } },
        { id: 'pce3', q: { fr: 'Quel STR de Blizzard (1998) devient sport national en Corée du Sud ?' }, choices: [{ fr: 'Warcraft II' }, { fr: 'StarCraft' }, { fr: 'Age of Empires' }, { fr: 'Command & Conquer' }], answer: 1, why: { fr: 'StarCraft et ses trois races asymétriques fondent l’e-sport moderne, télévisé dès 1998.' } },
        { id: 'pce4', q: { fr: 'Quel action-RPG de 1996 popularise le donjon généré et le butin aléatoire ?' }, choices: [{ fr: 'Diablo' }, { fr: 'Baldur’s Gate' }, { fr: 'System Shock' }, { fr: 'Deus Ex' }], answer: 0, why: { fr: 'Diablo (Blizzard, 1996) : cathédrale, loot et « encore une descente » jusqu’à 3 h du matin.' } },
        { id: 'pce5', q: { fr: 'Quel mod de Half-Life (1999) fonde le FPS tactique en équipe ?' }, choices: [{ fr: 'Counter-Strike' }, { fr: 'Day of Defeat' }, { fr: 'Team Fortress Classic' }, { fr: 'Garry’s Mod' }], answer: 0, why: { fr: 'Counter-Strike, mod communautaire devenu franchise majeure, toujours roi de l’e-sport.' } },
        { id: 'pce6', q: { fr: 'Quelle simulation de vie de Maxis (2000) conquiert le grand public ?' }, choices: [{ fr: 'SimCity 3000' }, { fr: 'Les Sims' }, { fr: 'Spore' }, { fr: 'Theme Hospital' }], answer: 1, why: { fr: 'Les Sims (2000) : phénomène de société, machine à extensions et à histoires de quartier.' } },
        { id: 'pce7', q: { fr: 'Comment s’appelle le monde de Warcraft ?' }, choices: [{ fr: 'Azeroth' }, { fr: 'Lordaeron' }, { fr: 'Norfendre' }, { fr: 'Draenor' }], answer: 0, why: { fr: 'Azeroth, né avec Warcraft: Orcs & Humans (1994) et jamais quitté depuis.' } },
        { id: 'pce8', q: { fr: 'Quel FPS d’id (1996) passe à la vraie 3D et électrise les LAN ?' }, choices: [{ fr: 'Quake' }, { fr: 'Heretic' }, { fr: 'Hexen' }, { fr: 'Strife' }], answer: 0, why: { fr: 'Quake (1996) : moteurs 3D, speedruns et QuakeCon — la culture PC en un sigle.' } },
      ],
      medium: [
        { id: 'pcm1', q: { fr: 'Quel RPG BioWare (1998) adapte Donjons & Dragons sur PC ?' }, choices: [{ fr: 'Baldur’s Gate' }, { fr: 'Neverwinter Nights' }, { fr: 'Planescape: Torment' }, { fr: 'Icewind Dale' }], answer: 0, why: { fr: 'Baldur’s Gate impose le RPG occidental moderne et la légende de BioWare.' } },
        { id: 'pcm2', q: { fr: 'Quel STR de 1994 ouvre la saga Warcraft chez Blizzard ?' }, choices: [{ fr: 'Warcraft: Orcs & Humans' }, { fr: 'StarCraft' }, { fr: 'Blackthorne' }, { fr: 'The Lost Vikings' }], answer: 0, why: { fr: 'Warcraft: Orcs & Humans (1994) pose les premières pierres d’Azeroth.' } },
        { id: 'pcm3', q: { fr: 'Quel RPG post-apocalyptique d’Interplay (1997) engendre une dynastie ?' }, choices: [{ fr: 'Fallout' }, { fr: 'Wasteland' }, { fr: 'Arcanum' }, { fr: 'Shadowrun' }], answer: 0, why: { fr: 'Fallout (1997) : humour noir, guerre nucléaire et liberté totale.' } },
        { id: 'pcm4', q: { fr: 'Quel FPS d’Epic (1998) défie Quake et donne son nom à un moteur ?' }, choices: [{ fr: 'Unreal' }, { fr: 'Sin' }, { fr: 'Daikatana' }, { fr: 'Turok' }], answer: 0, why: { fr: 'Unreal (1998) : l’Unreal Engine naît avec lui et équipe encore la moitié de l’industrie.' } },
        { id: 'pcm5', q: { fr: 'Quel STR Westwood (1995) popularise le genre avec la confrérie du Nod ?' }, choices: [{ fr: 'Dune II' }, { fr: 'Command & Conquer' }, { fr: 'Alerte rouge' }, { fr: 'Tiberian Sun' }], answer: 1, why: { fr: 'Command & Conquer (1995) : FMV, base building et « yes sir ! ».' } },
        { id: 'pcm6', q: { fr: 'Quelle archéologue pille sa première tombe en 1996 ?' }, choices: [{ fr: 'Lara Croft dans Tomb Raider' }, { fr: 'Samus dans Metroid' }, { fr: 'Nathan Drake dans Uncharted' }, { fr: 'Aloy dans Horizon' }], answer: 0, why: { fr: 'Tomb Raider (Core Design, 1996) fait de Lara Croft une icône mondiale.' } },
        { id: 'pcm7', q: { fr: 'Quel point’n click LucasArts (1990) envoie Guybrush à Mêlée Island ?' }, choices: [{ fr: 'The Secret of Monkey Island' }, { fr: 'Day of the Tentacle' }, { fr: 'Full Throttle' }, { fr: 'Grim Fandango' }], answer: 0, why: { fr: 'Monkey Island (1990) : duels d’insultes et poulet à poulie.' } },
        { id: 'pcm8', q: { fr: 'Quel Valve de 2004 fait de la physique un terrain de jeu ?' }, choices: [{ fr: 'Half-Life 2' }, { fr: 'Portal' }, { fr: 'Left 4 Dead' }, { fr: 'Team Fortress 2' }], answer: 0, why: { fr: 'Half-Life 2 (2004) et le moteur Source : City 17 et le pistolet gravitaire.' } },
      ],
      hard: [
        { id: 'pch1', q: { fr: 'Quel simu spatial (1994) fait jouer Mark Hamill ?' }, choices: [{ fr: 'Wing Commander III' }, { fr: 'X-Wing' }, { fr: 'Freespace' }, { fr: 'Starlancer' }], answer: 0, why: { fr: 'Wing Commander III (1994) : Mark Hamill face à Malcolm McDowell, en FMV sur quatre CD.' } },
        { id: 'pch2', q: { fr: 'Sur quel moteur tourne Duke Nukem 3D (1996) ?' }, choices: [{ fr: 'id Tech 2' }, { fr: 'Build' }, { fr: 'Unreal' }, { fr: 'Le moteur Quake' }], answer: 1, why: { fr: 'Le Build engine (3D Realms), ses miroirs et ses secteurs empilés.' } },
        { id: 'pch3', q: { fr: 'Quel jeu Looking Glass (1998) invente l’infiltration systémique ?' }, choices: [{ fr: 'Thief: The Dark Project' }, { fr: 'System Shock 2' }, { fr: 'Deus Ex' }, { fr: 'Hitman' }], answer: 0, why: { fr: 'Thief (1998) : la lumière comme ennemie, le son comme arme.' } },
        { id: 'pch4', q: { fr: 'Quel action-RPG d’Ion Storm (2000) marie FPS, RPG et conspirations ?' }, choices: [{ fr: 'Deus Ex' }, { fr: 'Anachronox' }, { fr: 'Daikatana' }, { fr: 'System Shock 2' }], answer: 0, why: { fr: 'Deus Ex (2000) : JC Denton, les Illuminati et mille façons de faire chaque choix.' } },
        { id: 'pch5', q: { fr: 'Qui signe la bande-son de Quake (1996) ?' }, choices: [{ fr: 'Trent Reznor' }, { fr: 'Bobby Prince' }, { fr: 'Nobuo Uematsu' }, { fr: 'Jesper Kyd' }], answer: 0, why: { fr: 'Trent Reznor (Nine Inch Nails) : des nappes industrielles qui hantent encore les donjons.' } },
        { id: 'pch6', q: { fr: 'Quel RPG Black Isle (1999) fait du Sans-Nom une légende littéraire ?' }, choices: [{ fr: 'Planescape: Torment' }, { fr: 'Icewind Dale' }, { fr: 'Fallout 2' }, { fr: 'Baldur’s Gate II' }], answer: 0, why: { fr: 'Planescape: Torment (1999) : « What can change the nature of a man? »' } },
        { id: 'pch7', q: { fr: 'Comment s’appelle l’extension de StarCraft (1998) ?' }, choices: [{ fr: 'Brood War' }, { fr: 'Insurrection' }, { fr: 'Retribution' }, { fr: 'The Frozen Throne' }], answer: 0, why: { fr: 'Brood War (1998) prolonge les trois races et scelle la scène coréenne.' } },
        { id: 'pch8', q: { fr: 'Quel FPS croate (2001) né d’une démo devient un hymne au gore joyeux ?' }, choices: [{ fr: 'Serious Sam' }, { fr: 'Painkiller' }, { fr: 'Shadow Warrior' }, { fr: 'Blood' }], answer: 0, why: { fr: 'Serious Sam (Croteam, 2001) : des arènes, des milliers d’ennemis, zéro subtilité.' } },
      ],
    },
  },
  {
    slug: 'fps-legends',
    route: '/quizz/fps-legends',
    videoId: 't1Re8ki_gsw',
    image: quizThumbUrl('fps-legends'),
    tag: 'FPS',
    keywords: 'quizz fps doom quake halo call of duty counter-strike overwatch valorant',
    source: '/dossiers/choc-generations-gaming',
    labels: {
      fr: { title: 'FPS légendaires', text: 'DOOM, Halo, Call of Duty, Counter-Strike : les shooters à la première personne qui ont défini le genre, en trois niveaux.' },
    },
    levels: {
      easy: [
        { id: 'fpe1', q: { fr: 'Que signifie FPS ?' }, choices: [{ fr: 'First-Person Shooter' }, { fr: 'Fast Play System' }, { fr: 'Final Player Score' }, { fr: 'First Power Strike' }], answer: 0, why: { fr: 'FPS = First-Person Shooter, le jeu de tir en vue subjective.' } },
        { id: 'fpe2', q: { fr: 'Quel jeu d’id Software de 1993 a popularisé le FPS ?' }, choices: [{ fr: 'Wolfenstein 3D' }, { fr: 'DOOM' }, { fr: 'Quake' }, { fr: 'Duke Nukem' }], answer: 1, why: { fr: 'DOOM (1993) impose le FPS, le modding et le deathmatch.' } },
        { id: 'fpe3', q: { fr: 'Comment s’appelle le héros de Halo ?' }, choices: [{ fr: 'Master Chief' }, { fr: 'Commander Shepard' }, { fr: 'Marcus Fenix' }, { fr: 'Gordon Freeman' }], answer: 0, why: { fr: 'Master Chief, le Spartan-117, icône Xbox depuis 2001.' } },
        { id: 'fpe4', q: { fr: 'Quelle série d’Activision sort (presque) chaque année depuis 2003 ?' }, choices: [{ fr: 'Battlefield' }, { fr: 'Call of Duty' }, { fr: 'Medal of Honor' }, { fr: 'Halo' }], answer: 1, why: { fr: 'Call of Duty, la franchise FPS la plus vendue au monde.' } },
        { id: 'fpe5', q: { fr: 'Quel mod de Half-Life oppose terroristes et anti-terroristes ?' }, choices: [{ fr: 'Day of Defeat' }, { fr: 'Counter-Strike' }, { fr: 'Team Fortress' }, { fr: 'Garry’s Mod' }], answer: 1, why: { fr: 'Counter-Strike naît en 1999 comme mod de Half-Life.' } },
        { id: 'fpe6', q: { fr: 'Combien de joueurs par équipe en Overwatch 2 ?' }, choices: [{ fr: '4' }, { fr: '5' }, { fr: '6' }, { fr: '8' }], answer: 1, why: { fr: 'Overwatch 2 passe de 6v6 à 5v5 : un tank, deux DPS, deux supports.' } },
        { id: 'fpe7', q: { fr: 'Quelle arme tronçonne les démons dans DOOM ?' }, choices: [{ fr: 'La tronçonneuse' }, { fr: 'Le railgun' }, { fr: 'Le lance-flammes' }, { fr: 'Le BFG' }], answer: 0, why: { fr: 'La tronçonneuse : munitions en tuant, classique depuis 1993.' } },
        { id: 'fpe8', q: { fr: 'Quel FPS de Riot se joue avec des agents aux pouvoirs ?' }, choices: [{ fr: 'Valorant' }, { fr: 'Overwatch' }, { fr: 'Apex Legends' }, { fr: 'Paladins' }], answer: 0, why: { fr: 'Valorant (2020) mêle tir tactique et capacités d’agents.' } },
      ],
      medium: [
        { id: 'fpm1', q: { fr: 'Quel FPS de Valve de 2004 introduit le gravity gun ?' }, choices: [{ fr: 'Half-Life 2' }, { fr: 'Portal' }, { fr: 'Left 4 Dead' }, { fr: 'Counter-Strike Source' }], answer: 0, why: { fr: 'Half-Life 2 et le moteur Source : City 17 et le pistolet gravitaire.' } },
        { id: 'fpm2', q: { fr: 'Quel studio a créé Halo à l’origine ?' }, choices: [{ fr: 'Bungie' }, { fr: '343 Industries' }, { fr: 'Infinity Ward' }, { fr: 'id Software' }], answer: 0, why: { fr: 'Bungie crée Halo (2001) avant de passer la main à 343 Industries.' } },
        { id: 'fpm3', q: { fr: 'Quel moteur fait tourner Quake (1996) ?' }, choices: [{ fr: 'id Tech 2' }, { fr: 'Build Engine' }, { fr: 'Unreal Engine 1' }, { fr: 'GoldSrc' }], answer: 0, why: { fr: 'id Tech 2, le premier vrai moteur 3D temps réel de John Carmack.' } },
        { id: 'fpm4', q: { fr: 'Quel studio signe Call of Duty Modern Warfare (2007) ?' }, choices: [{ fr: 'Infinity Ward' }, { fr: 'Treyarch' }, { fr: 'Sledgehammer' }, { fr: 'DICE' }], answer: 0, why: { fr: 'Infinity Ward lance la sous-série Modern Warfare en 2007.' } },
        { id: 'fpm5', q: { fr: 'Quel battle royale FPS sort en 2017 et lance le phénomène ?' }, choices: [{ fr: 'PUBG' }, { fr: 'Fortnite' }, { fr: 'Apex Legends' }, { fr: 'Warzone' }], answer: 0, why: { fr: 'PUBG (2017) popularise le battle royale à 100 joueurs avant Fortnite.' } },
        { id: 'fpm6', q: { fr: 'Quel FPS tactique d’Ubisoft mise sur la destruction des murs ?' }, choices: [{ fr: 'Rainbow Six Siege' }, { fr: 'Ghost Recon' }, { fr: 'The Division' }, { fr: 'Far Cry 6' }], answer: 0, why: { fr: 'Rainbow Six Siege (2015) : chaque mur, chaque trappe peut tomber.' } },
        { id: 'fpm7', q: { fr: 'Quel est le nom de la version 2023 de Counter-Strike ?' }, choices: [{ fr: 'Counter-Strike 2' }, { fr: 'CS:GO 2' }, { fr: 'Counter-Strike Source 2' }, { fr: 'CS: Next' }], answer: 0, why: { fr: 'Counter-Strike 2 remplace CS:GO sur le moteur Source 2 en 2023.' } },
        { id: 'fpm8', q: { fr: 'Quel FPS coop de Valve vous jette contre des hordes de zombies ?' }, choices: [{ fr: 'Left 4 Dead' }, { fr: 'Back 4 Blood' }, { fr: 'DayZ' }, { fr: 'Dead Island' }], answer: 0, why: { fr: 'Left 4 Dead (2008) : quatre survivants, un réalisateur IA qui dose la tension.' } },
      ],
      hard: [
        { id: 'fph1', q: { fr: 'Qui a composé la bande-son de Quake (1996) ?' }, choices: [{ fr: 'Trent Reznor' }, { fr: 'Mick Gordon' }, { fr: 'Hans Zimmer' }, { fr: 'Bobby Prince' }], answer: 0, why: { fr: 'Trent Reznor (Nine Inch Nails) signe des nappes industrielles cultes.' } },
        { id: 'fph2', q: { fr: 'Sur quel moteur tourne Duke Nukem 3D (1996) ?' }, choices: [{ fr: 'Build Engine' }, { fr: 'id Tech 1' }, { fr: 'Unreal' }, { fr: 'Quake Engine' }], answer: 0, why: { fr: 'Le Build Engine de Ken Silverman, avec ses miroirs et secteurs empilés.' } },
        { id: 'fph3', q: { fr: 'Que signifie BFG, l’arme ultime de DOOM ?' }, choices: [{ fr: 'Big Fucking Gun' }, { fr: 'Blast Field Generator' }, { fr: 'Bio Force Gun' }, { fr: 'Burst Fire Gatling' }], answer: 0, why: { fr: 'Officiellement Big Fucking Gun — renommé Big Frag Gun dans le film.' } },
        { id: 'fph4', q: { fr: 'Quel FPS d’Arkane (2021) boucle le temps sur Blackreef ?' }, choices: [{ fr: 'Deathloop' }, { fr: 'Dishonored 2' }, { fr: 'Prey' }, { fr: 'Redfall' }], answer: 0, why: { fr: 'Deathloop (Arkane Lyon, 2021) : tuer huit cibles en une boucle.' } },
        { id: 'fph5', q: { fr: 'En quelle année sort la version 1.0 de Counter-Strike ?' }, choices: [{ fr: '1999' }, { fr: '2000' }, { fr: '2002' }, { fr: '2004' }], answer: 1, why: { fr: 'Bêta en 1999, version 1.0 en novembre 2000, éditée par Valve.' } },
        { id: 'fph6', q: { fr: 'Quel est le nom du multijoueur qui a fait exploser le Xbox Live avec Halo 2 ?' }, choices: [{ fr: 'Le matchmaking' }, { fr: 'Le LAN' }, { fr: 'Le split-screen' }, { fr: 'Le co-op' }], answer: 0, why: { fr: 'Halo 2 (2004) invente le matchmaking moderne sur Xbox Live.' } },
        { id: 'fph7', q: { fr: 'Quel FPS de 1997 de Rare a posé les bases du multijoueur console ?' }, choices: [{ fr: 'GoldenEye 007' }, { fr: 'Perfect Dark' }, { fr: 'Timesplitters' }, { fr: 'Halo' }], answer: 0, why: { fr: 'GoldenEye 007 (N64, 1997) : écran splitté à quatre et règles cultes.' } },
        { id: 'fph8', q: { fr: 'Quel FPS narratif d’Irrational Games se déroule à Rapture ?' }, choices: [{ fr: 'BioShock' }, { fr: 'System Shock 2' }, { fr: 'Prey' }, { fr: 'Deus Ex' }], answer: 0, why: { fr: 'BioShock (2007) : Rapture, les Big Daddies et « Would you kindly ».' } },
      ],
    },
  },
  {
    slug: 'horror-gaming',
    route: '/quizz/horror-gaming',
    videoId: 'OH51fSHznwg',
    image: quizThumbUrl('horror-gaming'),
    tag: 'Horreur',
    keywords: 'quizz horreur resident evil silent hill dead space the last of us amnesia',
    source: '/dossiers/pourquoi-les-souls',
    labels: {
      fr: { title: 'Horreur & survival', text: 'Resident Evil, Silent Hill, Dead Space, The Last of Us : l’horreur qui vous glace, du sursaut facile au cauchemar expert.' },
    },
    levels: {
      easy: [
        { id: 'hre1', q: { fr: 'Quelle saga de Capcom vous enferme dans un manoir rempli de zombies ?' }, choices: [{ fr: 'Silent Hill' }, { fr: 'Resident Evil' }, { fr: 'Dead Space' }, { fr: 'The Evil Within' }], answer: 1, why: { fr: 'Resident Evil (1996) naît dans le manoir Spencer, avec Chris et Jill.' } },
        { id: 'hre2', q: { fr: 'Quel objet soigne et sauvegarde dans Resident Evil ?' }, choices: [{ fr: 'La machine à écrire' }, { fr: 'Le feu de camp' }, { fr: 'La fontaine' }, { fr: 'Le lit' }], answer: 0, why: { fr: 'La machine à écrire et ses rubans encreurs : sauvegarde à l’ancienne.' } },
        { id: 'hre3', q: { fr: 'Quelle ville brumeuse hante la série Silent Hill ?' }, choices: [{ fr: 'Raccoon City' }, { fr: 'Silent Hill' }, { fr: 'Yharnam' }, { fr: 'Midwich' }], answer: 1, why: { fr: 'Silent Hill, la ville qui matérialise les peurs de ses visiteurs.' } },
        { id: 'hre4', q: { fr: 'Dans The Last of Us, quel champignon infecte l’humanité ?' }, choices: [{ fr: 'Le Cordyceps' }, { fr: 'Le T-Virus' }, { fr: 'La moisissure' }, { fr: 'Le Flood' }], answer: 0, why: { fr: 'Le Cordyceps transforme les humains en claqueurs et rôdeurs.' } },
        { id: 'hre5', q: { fr: 'Comment s’appelle le héros ingénieur de Dead Space ?' }, choices: [{ fr: 'Isaac Clarke' }, { fr: 'Leon Kennedy' }, { fr: 'James Sunderland' }, { fr: 'Alan Wake' }], answer: 0, why: { fr: 'Isaac Clarke affronte les nécromorphes à bord de l’USG Ishimura.' } },
        { id: 'hre6', q: { fr: 'Quel jeu vous fait fuir sans arme dans un manoir avec un bébé ?' }, choices: [{ fr: 'Amnesia' }, { fr: 'Resident Evil 7' }, { fr: 'Outlast' }, { fr: 'P.T.' }], answer: 2, why: { fr: 'Outlast (2013) : journaliste, caméra nocturne, asile de Mount Massive.' } },
        { id: 'hre7', q: { fr: 'Quel est le nom du virus de Resident Evil ?' }, choices: [{ fr: 'T-Virus' }, { fr: 'G-Virus' }, { fr: 'C-Virus' }, { fr: 'Le premier est le T-Virus, mais tous existent' }], answer: 3, why: { fr: 'T, G, C… la saga Umbrella a toute une collection de virus.' } },
        { id: 'hre8', q: { fr: 'Quel jeu de 2017 vous enferme dans la maison des Baker ?' }, choices: [{ fr: 'Resident Evil 7' }, { fr: 'Resident Evil Village' }, { fr: 'Silent Hill 2' }, { fr: 'Visage' }], answer: 0, why: { fr: 'Resident Evil 7 (2017) : première personne, Louisiane et famille Baker.' } },
      ],
      medium: [
        { id: 'hrm1', q: { fr: 'Qui est le créateur de Silent Hill et Siren ?' }, choices: [{ fr: 'Shinji Mikami' }, { fr: 'Keiichiro Toyama' }, { fr: 'Hideo Kojima' }, { fr: 'Fumito Ueda' }], answer: 1, why: { fr: 'Keiichiro Toyama crée Silent Hill chez Konami avant de fonder Siren.' } },
        { id: 'hrm2', q: { fr: 'Quel est le nom du culte de Silent Hill ?' }, choices: [{ fr: 'L’Ordre' }, { fr: 'Les Illuminés' }, { fr: 'Umbrella' }, { fr: 'Le Culte de la Lune' }], answer: 0, why: { fr: 'L’Ordre, secte qui vénère un dieu à naître dans la douleur.' } },
        { id: 'hrm3', q: { fr: 'Dans Dead Space, comment tuer efficacement un nécromorphe ?' }, choices: [{ fr: 'En visant la tête' }, { fr: 'En démembrant les membres' }, { fr: 'En brûlant le corps' }, { fr: 'En tirant dans le cœur' }], answer: 1, why: { fr: '« Cut off their limbs » : le démembrement stratégique est la clé.' } },
        { id: 'hrm4', q: { fr: 'Qui a réalisé Resident Evil 4 (2005) ?' }, choices: [{ fr: 'Shinji Mikami' }, { fr: 'Hideki Kamiya' }, { fr: 'Hideo Kojima' }, { fr: 'Yoko Taro' }], answer: 0, why: { fr: 'Shinji Mikami signe Resident Evil 4, qui réinvente le TPS.' } },
        { id: 'hrm5', q: { fr: 'Quel jeu de 2010 vous envoie dans les égouts de Raccoon City avec des énigmes ?' }, choices: [{ fr: 'Resident Evil 2' }, { fr: 'Resident Evil 3' }, { fr: 'Resident Evil 0' }, { fr: 'Resident Evil 2 Remake' }], answer: 0, why: { fr: 'Resident Evil 2 (1998) et son commissariat, culte du survival horror.' } },
        { id: 'hrm6', q: { fr: 'Comment s’appelle le détecteur de mouvement sonore de Silent Hill ?' }, choices: [{ fr: 'La radio' }, { fr: 'Le détecteur EMF' }, { fr: 'La lampe torche' }, { fr: 'Le PDA' }], answer: 0, why: { fr: 'La radio grésille quand un monstre approche — stress garanti.' } },
        { id: 'hrm7', q: { fr: 'Quel studio a développé Amnesia: The Dark Descent ?' }, choices: [{ fr: 'Frictional Games' }, { fr: 'Red Barrels' }, { fr: 'Bloober Team' }, { fr: 'Supermassive' }], answer: 0, why: { fr: 'Frictional Games (Suède) impose l’horreur sans combat en 2010.' } },
        { id: 'hrm8', q: { fr: 'Quel est le nom du manoir de Resident Evil Village ?' }, choices: [{ fr: 'Château Dimitrescu' }, { fr: 'Manoir Spencer' }, { fr: 'Maison Baker' }, { fr: 'Villa Umbrella' }], answer: 0, why: { fr: 'Château Dimitrescu et ses quatre seigneurs : le clou de Resident Evil Village (2021).' } },
      ],
      hard: [
        { id: 'hrh1', q: { fr: 'Quel compositeur signe les musiques oppressantes de Silent Hill ?' }, choices: [{ fr: 'Akira Yamaoka' }, { fr: 'Nobuo Uematsu' }, { fr: 'Koji Kondo' }, { fr: 'Yoko Shimomura' }], answer: 0, why: { fr: 'Akira Yamaoka, guitares industrielles et mélancolie, de 1999 à 2009.' } },
        { id: 'hrh2', q: { fr: 'Dans quel moteur tourne P.T., la démo annulée de Silent Hills ?' }, choices: [{ fr: 'Fox Engine' }, { fr: 'Decima' }, { fr: 'Unreal Engine 4' }, { fr: 'RE Engine' }], answer: 0, why: { fr: 'Fox Engine de Kojima Productions, pour P.T. (2014) avec Norman Reedus et Del Toro.' } },
        { id: 'hrh3', q: { fr: 'Quel est le vrai nom du Pyramid Head ?' }, choices: [{ fr: 'Le Bourreau Rouge' }, { fr: 'Pyramid Head est déjà son nom culte, son rôle est le bourreau de James' }, { fr: 'Le Gardien' }, { fr: 'Le Fossoyeur' }], answer: 1, why: { fr: 'Pyramid Head incarne la culpabilité de James Sunderland dans Silent Hill 2.' } },
        { id: 'hrh4', q: { fr: 'Quel est le nom du vaisseau de Dead Space ?' }, choices: [{ fr: 'USG Ishimura' }, { fr: 'UNSC Infinity' }, { fr: 'Normandy' }, { fr: 'Rocinante' }], answer: 0, why: { fr: 'L’USG Ishimura, brise-surface de classe Planet Cracker.' } },
        { id: 'hrh5', q: { fr: 'Quel est le nom de la petite fille fantôme de F.E.A.R. ?' }, choices: [{ fr: 'Alma' }, { fr: 'Samara' }, { fr: 'Laura' }, { fr: 'Alice' }], answer: 0, why: { fr: 'Alma Wade, l’enfant psychique qui hante F.E.A.R. (2005).' } },
        { id: 'hrh6', q: { fr: 'Quel jeu de 2023 remake Resident Evil 4 ?' }, choices: [{ fr: 'Resident Evil 4 Remake' }, { fr: 'Resident Evil 4 VR' }, { fr: 'Resident Evil 4 Gold' }, { fr: 'Resident Evil 4 Reborn' }], answer: 0, why: { fr: 'Remake RE Engine en 2023, avec Leon modernisé.' } },
        { id: 'hrh7', q: { fr: 'Quel studio a créé Alien: Isolation (2014) ?' }, choices: [{ fr: 'Creative Assembly' }, { fr: 'Relic' }, { fr: 'Sports Interactive' }, { fr: 'The Creative Assembly' }], answer: 0, why: { fr: 'Creative Assembly (Total War) signe l’un des meilleurs jeux Alien.' } },
        { id: 'hrh8', q: { fr: 'Dans Bloodborne, l’horreur cosmique vient de…' }, choices: [{ fr: 'Lovecraft' }, { fr: 'King' }, { fr: 'Poe' }, { fr: 'Barker' }], answer: 0, why: { fr: 'Miyazaki cite Lovecraft : dieux anciens, folie et sang.' } },
      ],
    },
  },
  {
    slug: 'fighting-legends',
    route: '/quizz/fighting-legends',
    videoId: 'twbaM8fiXpo',
    image: quizThumbUrl('fighting-legends'),
    tag: 'Combat',
    keywords: 'quizz combat street fighter tekken mortal kombat smash bros guilty gear',
    labels: {
      fr: { title: 'Jeux de combat légendaires', text: 'Street Fighter, Tekken, Mortal Kombat, Smash Bros : les KO les plus célèbres, du hadoken facile au frame data expert.' },
    },
    levels: {
      easy: [
        { id: 'fie1', q: { fr: 'Quelle série de combat crie « Hadoken » ?' }, choices: [{ fr: 'Street Fighter' }, { fr: 'Tekken' }, { fr: 'Mortal Kombat' }, { fr: 'Soulcalibur' }], answer: 0, why: { fr: 'Hadoken de Ryu, depuis Street Fighter (1987).' } },
        { id: 'fie2', q: { fr: 'Quel jeu Nintendo fait se battre Mario et Link ?' }, choices: [{ fr: 'Super Smash Bros.' }, { fr: 'Mario Kart' }, { fr: 'Mario Party' }, { fr: 'Splatoon' }], answer: 0, why: { fr: 'Smash Bros. réunit les mascottes Nintendo depuis 1999.' } },
        { id: 'fie3', q: { fr: 'Quelle saga est célèbre pour ses fatalities sanglantes ?' }, choices: [{ fr: 'Street Fighter' }, { fr: 'Mortal Kombat' }, { fr: 'Tekken' }, { fr: 'Dead or Alive' }], answer: 1, why: { fr: 'Mortal Kombat (1992) : Finish Him! et fatalities cultes.' } },
        { id: 'fie4', q: { fr: 'Quel personnage est la mascotte de Tekken ?' }, choices: [{ fr: 'Jin Kazama' }, { fr: 'Kazuya Mishima' }, { fr: 'Heihachi' }, { fr: 'Tous les Mishima' }], answer: 3, why: { fr: 'La famille Mishima incarne Tekken depuis 1994.' } },
        { id: 'fie5', q: { fr: 'Combien de boutons d’attaque dans Street Fighter II ?' }, choices: [{ fr: '3' }, { fr: '4' }, { fr: '6' }, { fr: '8' }], answer: 2, why: { fr: '3 poings + 3 pieds = 6 boutons, le standard arcade.' } },
        { id: 'fie6', q: { fr: 'Quel est le nom du tournoi mondial de jeux de combat à Las Vegas ?' }, choices: [{ fr: 'EVO' }, { fr: 'The International' }, { fr: 'Worlds' }, { fr: 'BlizzCon' }], answer: 0, why: { fr: 'EVO, Evolution Championship Series, depuis 1996.' } },
        { id: 'fie7', q: { fr: 'Qui est le boss final de Street Fighter II ?' }, choices: [{ fr: 'M. Bison' }, { fr: 'Akuma' }, { fr: 'Sagat' }, { fr: 'Balrog' }], answer: 0, why: { fr: 'M. Bison (Vega au Japon) clôt l’arcade de 1991.' } },
        { id: 'fie8', q: { fr: 'Quel jeu de combat se joue avec des armes blanches ?' }, choices: [{ fr: 'Soulcalibur' }, { fr: 'Tekken' }, { fr: 'Street Fighter' }, { fr: 'Mortal Kombat' }], answer: 0, why: { fr: 'Soulcalibur (Bandai Namco) : épées, haches et arènes en 3D.' } },
      ],
      medium: [
        { id: 'fim1', q: { fr: 'Quel est le nom du super move de Ryu ?' }, choices: [{ fr: 'Shinku Hadoken' }, { fr: 'Kamehameha' }, { fr: 'Final Flash' }, { fr: 'Dragon Punch' }], answer: 0, why: { fr: 'Shinku Hadoken, la boule de feu géante, depuis Super Street Fighter II Turbo.' } },
        { id: 'fim2', q: { fr: 'Quelle mécanique Tekken permet de rebondir l’adversaire ?' }, choices: [{ fr: 'Le juggle' }, { fr: 'Le parry' }, { fr: 'Le focus' }, { fr: 'Le burst' }], answer: 0, why: { fr: 'Le juggle : garder l’adversaire en l’air pour enchaîner.' } },
        { id: 'fim3', q: { fr: 'Qui a créé Street Fighter ?' }, choices: [{ fr: 'Capcom' }, { fr: 'SNK' }, { fr: 'Bandai Namco' }, { fr: 'Arc System Works' }], answer: 0, why: { fr: 'Capcom, à Osaka, depuis 1987.' } },
        { id: 'fim4', q: { fr: 'Quel personnage de Mortal Kombat dit « Get over here! » ?' }, choices: [{ fr: 'Scorpion' }, { fr: 'Sub-Zero' }, { fr: 'Raiden' }, { fr: 'Liu Kang' }], answer: 0, why: { fr: 'Scorpion et son kunai : Get over here!' } },
        { id: 'fim5', q: { fr: 'Quel jeu de combat français a explosé en 2023 ?' }, choices: [{ fr: 'Sifu' }, { fr: 'Absolver' }, { fr: 'Streets of Rage 4' }, { fr: 'Them’s Fightin’ Herds' }], answer: 0, why: { fr: 'Sifu (Sloclap, Paris) : kung-fu, vieillissement et revanche.' } },
        { id: 'fim6', q: { fr: 'Quel studio anime fait Guilty Gear Strive ?' }, choices: [{ fr: 'Arc System Works' }, { fr: 'Capcom' }, { fr: 'Bandai Namco' }, { fr: 'NetherRealm' }], answer: 0, why: { fr: 'Arc System Works, rois de la 2D flamboyante.' } },
        { id: 'fim7', q: { fr: 'Dans Smash Bros., comment élimine-t-on l’adversaire ?' }, choices: [{ fr: 'En l’éjectant hors de l’arène' }, { fr: 'En vidant sa barre de vie' }, { fr: 'En marquant un but' }, { fr: 'En capturant un drapeau' }], answer: 0, why: { fr: 'Pourcentage qui monte, éjection : Smash innove dès 1999.' } },
        { id: 'fim8', q: { fr: 'Quel jeu de combat met en scène des loups et des ninjas en 1991 ?' }, choices: [{ fr: 'Fatal Fury' }, { fr: 'Street Fighter II' }, { fr: 'Mortal Kombat' }, { fr: 'Art of Fighting' }], answer: 0, why: { fr: 'Fatal Fury de SNK lance Terry Bogard et la guerre SNK vs Capcom.' } },
      ],
      hard: [
        { id: 'fih1', q: { fr: 'Que signifie « frame data » en combat ?' }, choices: [{ fr: 'Le nombre d’images par attaque' }, { fr: 'La résolution du jeu' }, { fr: 'Le ping réseau' }, { fr: 'Le nombre de joueurs' }], answer: 0, why: { fr: 'Frame data : startup, active, recovery — le cœur du compétitif.' } },
        { id: 'fih2', q: { fr: 'Qui est le créateur de Super Smash Bros. ?' }, choices: [{ fr: 'Masahiro Sakurai' }, { fr: 'Shigeru Miyamoto' }, { fr: 'Satoru Iwata' }, { fr: 'Hideo Kojima' }], answer: 0, why: { fr: 'Sakurai (HAL Laboratory) crée Smash en 1999 et le dirige encore.' } },
        { id: 'fih3', q: { fr: 'Quel est le nom du dragon de Mortal Kombat ?' }, choices: [{ fr: 'Onaga' }, { fr: 'Shenron' }, { fr: 'Onaga est le Roi Dragon, le logo est un dragon' }, { fr: 'Le dragon s’appelle tout simplement le logo dragon' }], answer: 0, why: { fr: 'Onaga, le Roi Dragon, antagoniste de Deception.' } },
        { id: 'fih4', q: { fr: 'Quel est le coup le plus célèbre d’EVO 2004, Moment 37 ?' }, choices: [{ fr: 'Le parry de Daigo contre Justin Wong' }, { fr: 'Le combo infini de Marvel vs Capcom 2' }, { fr: 'Le perfect de Tokido' }, { fr: 'Le comeback de SonicFox' }], answer: 0, why: { fr: 'Daigo Umehara pare 15 coups de Chun-Li et remonte le round — légende.' } },
        { id: 'fih5', q: { fr: 'Quel est le nom du système de rollback netcode popularisé par GGPO ?' }, choices: [{ fr: 'Rollback netcode' }, { fr: 'Delay netcode' }, { fr: 'Lockstep' }, { fr: 'P2P' }], answer: 0, why: { fr: 'Rollback prédit et corrige : moins de latence perçue.' } },
        { id: 'fih6', q: { fr: 'Quel est le vrai nom de M. Bison au Japon ?' }, choices: [{ fr: 'Vega' }, { fr: 'Balrog' }, { fr: 'Sagat' }, { fr: 'Akuma' }], answer: 0, why: { fr: 'Au Japon, M. Bison s’appelle Vega ; Balrog devient M. Bison.' } },
        { id: 'fih7', q: { fr: 'Quel jeu de combat 3D de Sega a inventé le genre en 1993 ?' }, choices: [{ fr: 'Virtua Fighter' }, { fr: 'Tekken' }, { fr: 'Soul Edge' }, { fr: 'Dead or Alive' }], answer: 0, why: { fr: 'Virtua Fighter (AM2, 1993) : le premier combat en 3D polygonale.' } },
        { id: 'fih8', q: { fr: 'Dans Tekken, qu’est-ce que le « Electric Wind God Fist » ?' }, choices: [{ fr: 'Le coup le plus dur des Mishima' }, { fr: 'Une projection' }, { fr: 'Une provocation' }, { fr: 'Un stage' }], answer: 0, why: { fr: 'EWGF : just frame, dégâts énormes, symbole de maîtrise Mishima.' } },
      ],
    },
  },
  {
    slug: 'racing-legends',
    route: '/quizz/racing-legends',
    videoId: 'A2VPhWOUMHI',
    image: quizThumbUrl('racing-legends'),
    tag: 'Course',
    keywords: 'quizz course gran turismo mario kart forza need for speed f1',
    source: '/dossiers/choc-generations-gaming',
    labels: {
      fr: { title: 'Jeux de course légendaires', text: 'Gran Turismo, Mario Kart, Forza, Need for Speed : la vitesse sous toutes ses formes, du kart facile au simu expert.' },
    },
    levels: {
      easy: [
        { id: 'rae1', q: { fr: 'Quelle série Nintendo lance des carapaces sur la piste ?' }, choices: [{ fr: 'Mario Kart' }, { fr: 'F-Zero' }, { fr: 'Gran Turismo' }, { fr: 'Forza' }], answer: 0, why: { fr: 'Mario Kart (1992) et ses objets cultes : carapace bleue, banane, étoile.' } },
        { id: 'rae2', q: { fr: 'Quel jeu de course de Sony est surnommé « le vrai simulateur » ?' }, choices: [{ fr: 'Gran Turismo' }, { fr: 'Driveclub' }, { fr: 'Wipeout' }, { fr: 'MotorStorm' }], answer: 0, why: { fr: 'Gran Turismo (Polyphony, 1997) : « The Real Driving Simulator ».' } },
        { id: 'rae3', q: { fr: 'Quelle série d’EA vous fait fuir la police ?' }, choices: [{ fr: 'Need for Speed' }, { fr: 'Burnout' }, { fr: 'Forza Horizon' }, { fr: 'Midnight Club' }], answer: 0, why: { fr: 'Need for Speed : poursuites et tuning depuis 1994.' } },
        { id: 'rae4', q: { fr: 'Quel jeu de course futuriste a inspiré la musique techno ?' }, choices: [{ fr: 'Wipeout' }, { fr: 'F-Zero' }, { fr: 'Mario Kart' }, { fr: 'Gran Turismo' }], answer: 0, why: { fr: 'Wipeout (Psygnosis, 1995) : design et bande-son par The Designers Republic et Chemical Brothers.' } },
        { id: 'rae5', q: { fr: 'Quelle série Xbox mêle festival et open world ?' }, choices: [{ fr: 'Forza Horizon' }, { fr: 'Forza Motorsport' }, { fr: 'Project Gotham' }, { fr: 'PGR' }], answer: 0, why: { fr: 'Forza Horizon (Playground Games) : festival Horizon en monde ouvert.' } },
        { id: 'rae6', q: { fr: 'Dans Mario Kart, que fait l’étoile ?' }, choices: [{ fr: 'Rend invincible' }, { fr: 'Fait rapetisser' }, { fr: 'Donne un turbo' }, { fr: 'Inverse les commandes' }], answer: 0, why: { fr: 'L’étoile : invincibilité et vitesse, arc-en-ciel compris.' } },
        { id: 'rae7', q: { fr: 'Quel est le circuit le plus célèbre de F1 dans les jeux ?' }, choices: [{ fr: 'Monaco' }, { fr: 'Silverstone' }, { fr: 'Spa' }, { fr: 'Monza' }], answer: 0, why: { fr: 'Monaco, le joyau, présent dans tous les jeux F1.' } },
        { id: 'rae8', q: { fr: 'Quelle série Sega d’arcade vous met sur une moto ?' }, choices: [{ fr: 'OutRun' }, { fr: 'Hang-On' }, { fr: 'Daytona USA' }, { fr: 'Sega Rally' }], answer: 1, why: { fr: 'Hang-On (1985) et Super Hang-On : la moto qui se penche en arcade.' } },
      ],
      medium: [
        { id: 'ram1', q: { fr: 'Quel studio britannique a créé Forza Horizon ?' }, choices: [{ fr: 'Playground Games' }, { fr: 'Codemasters' }, { fr: 'Criterion' }, { fr: 'Turn 10' }], answer: 0, why: { fr: 'Playground Games (Leamington Spa) depuis 2012, racheté par Xbox.' } },
        { id: 'ram2', q: { fr: 'Quel jeu de 1997 lance Gran Turismo ?' }, choices: [{ fr: 'Gran Turismo sur PlayStation' }, { fr: 'Gran Turismo 2' }, { fr: 'Gran Turismo 3' }, { fr: 'Gran Turismo Sport' }], answer: 0, why: { fr: 'Gran Turismo (1997) par Kazunori Yamauchi, 10 millions de ventes.' } },
        { id: 'ram3', q: { fr: 'Quelle série de Criterion récompense les crashs spectaculaires ?' }, choices: [{ fr: 'Burnout' }, { fr: 'Need for Speed' }, { fr: 'Forza' }, { fr: 'Dirt' }], answer: 0, why: { fr: 'Burnout (2001-2011) : takedowns et mode crash à points.' } },
        { id: 'ram4', q: { fr: 'Quel jeu de rallye de Codemasters est la référence simu ?' }, choices: [{ fr: 'Dirt Rally' }, { fr: 'WRC' }, { fr: 'Sega Rally' }, { fr: 'Colin McRae Rally' }], answer: 0, why: { fr: 'Dirt Rally (2015) et ses suites, simu exigeante du rallye.' } },
        { id: 'ram5', q: { fr: 'Quel Mario Kart a introduit l’anti-gravité ?' }, choices: [{ fr: 'Mario Kart 8' }, { fr: 'Mario Kart Wii' }, { fr: 'Mario Kart DS' }, { fr: 'Mario Kart 7' }], answer: 0, why: { fr: 'Mario Kart 8 (Wii U, 2014) : pistes verticales et anti-gravité.' } },
        { id: 'ram6', q: { fr: 'Quel est le nom du créateur de Gran Turismo ?' }, choices: [{ fr: 'Kazunori Yamauchi' }, { fr: 'Shinji Mikami' }, { fr: 'Yu Suzuki' }, { fr: 'Hideo Kojima' }], answer: 0, why: { fr: 'Kazunori Yamauchi, pilote et patron de Polyphony Digital.' } },
        { id: 'ram7', q: { fr: 'Quelle série d’arcade Sega a popularisé la dérive ?' }, choices: [{ fr: 'Initial D' }, { fr: 'Daytona USA' }, { fr: 'OutRun 2' }, { fr: 'Sega Rally' }], answer: 0, why: { fr: 'Initial D Arcade Stage (Sega, 2002) : le drift comme discipline.' } },
        { id: 'ram8', q: { fr: 'Quel jeu de course Nintendo va à 1000 km/h en 1990 ?' }, choices: [{ fr: 'F-Zero' }, { fr: 'Mario Kart' }, { fr: 'Excitebike' }, { fr: 'Wave Race' }], answer: 0, why: { fr: 'F-Zero (1990, SNES) : Captain Falcon et Mute City à vitesse folle.' } },
      ],
      hard: [
        { id: 'rah1', q: { fr: 'Quel est le temps de référence au Nürburgring pour Gran Turismo ?' }, choices: [{ fr: 'La Nordschleife est le juge ultime' }, { fr: 'Monza' }, { fr: 'Suzuka' }, { fr: 'Laguna Seca' }], answer: 0, why: { fr: 'La Nordschleife (20 km) sert de benchmark simu depuis GT4.' } },
        { id: 'rah2', q: { fr: 'Quel moteur physique équipe Assetto Corsa ?' }, choices: [{ fr: 'Moteur maison Kunos' }, { fr: 'Unreal Engine' }, { fr: 'Unity' }, { fr: 'Ego Engine' }], answer: 0, why: { fr: 'Kunos Simulazioni développe son propre moteur physique ultra pointu.' } },
        { id: 'rah3', q: { fr: 'Quelle voiture est la plus chère de Gran Turismo 7 ?' }, choices: [{ fr: 'La Ferrari 330 P4' }, { fr: 'La Bugatti Veyron' }, { fr: 'La McLaren F1' }, { fr: 'La Porsche 917K' }], answer: 0, why: { fr: 'Ferrari 330 P4 (1967) : 20 millions de crédits, légende.' } },
        { id: 'rah4', q: { fr: 'Quel est le nom du mode 1000 tours de Gran Turismo 4 ?' }, choices: [{ fr: 'Les 24h du Nürburgring' }, { fr: 'Les 24h du Mans' }, { fr: 'Super Speedway 150 tours' }, { fr: 'Tsukuba 9h' }], answer: 1, why: { fr: 'Les 24 Heures du Mans, endurance mythique de GT4.' } },
        { id: 'rah5', q: { fr: 'Quel studio a créé Need for Speed Underground ?' }, choices: [{ fr: 'EA Black Box' }, { fr: 'Criterion' }, { fr: 'Ghost Games' }, { fr: 'Codemasters' }], answer: 0, why: { fr: 'EA Black Box (Vancouver) : tuning et nuit en 2003.' } },
        { id: 'rah6', q: { fr: 'Quel est le nom du créateur d’OutRun ?' }, choices: [{ fr: 'Yu Suzuki' }, { fr: 'Shigeru Miyamoto' }, { fr: 'Hideo Kojima' }, { fr: 'Tetsuya Mizuguchi' }], answer: 0, why: { fr: 'Yu Suzuki (Sega AM2) : OutRun (1986), Ferrari Testarossa et embruns.' } },
        { id: 'rah7', q: { fr: 'Quelle série de jeux F1 est développée par Codemasters ?' }, choices: [{ fr: 'F1 (officielle)' }, { fr: 'Gran Turismo' }, { fr: 'Forza' }, { fr: 'Project Cars' }], answer: 0, why: { fr: 'F1 2010 à aujourd’hui, licence officielle FIA.' } },
        { id: 'rah8', q: { fr: 'Quel jeu de course a introduit le rewind / retour en arrière ?' }, choices: [{ fr: 'Forza Motorsport 3' }, { fr: 'Gran Turismo 5' }, { fr: 'Need for Speed' }, { fr: 'Mario Kart' }], answer: 0, why: { fr: 'Forza Motorsport 3 (2009) : rembobiner pour corriger une erreur.' } },
      ],
    },
  },
  {
    slug: 'indie-gems',
    route: '/quizz/indie-gems',
    videoId: '0ThNyFItASM',
    image: quizThumbUrl('indie-gems'),
    tag: 'Indé',
    keywords: 'quizz indé indie hades celeste hollow knight undertale stardew valley',
    source: '/dossiers/let-play-awards-2025',
    labels: {
      fr: { title: 'Pépites indé', text: 'Hades, Celeste, Hollow Knight, Undertale : les jeux indépendants qui ont conquis le monde, du facile au 100% expert.' },
    },
    levels: {
      easy: [
        { id: 'ine1', q: { fr: 'Quel jeu indé vous fait escalader une montagne avec Madeline ?' }, choices: [{ fr: 'Celeste' }, { fr: 'Hollow Knight' }, { fr: 'Ori' }, { fr: 'Dead Cells' }], answer: 0, why: { fr: 'Celeste (2018) : plateforme exigeante et histoire d’anxiété.' } },
        { id: 'ine2', q: { fr: 'Quel jeu de ferme indé a conquis des millions de joueurs ?' }, choices: [{ fr: 'Stardew Valley' }, { fr: 'Harvest Moon' }, { fr: 'Animal Crossing' }, { fr: 'Farming Simulator' }], answer: 0, why: { fr: 'Stardew Valley (ConcernedApe, 2016) : un seul dev, un phénomène.' } },
        { id: 'ine3', q: { fr: 'Quel roguelike de Supergiant vous fait fuir les Enfers ?' }, choices: [{ fr: 'Hades' }, { fr: 'Bastion' }, { fr: 'Transistor' }, { fr: 'Pyre' }], answer: 0, why: { fr: 'Hades (2020) : Zagreus remonte vers l’Olympe, dieux en soutien.' } },
        { id: 'ine4', q: { fr: 'Quel jeu indé met en scène un chevalier insecte ?' }, choices: [{ fr: 'Hollow Knight' }, { fr: 'Shovel Knight' }, { fr: 'Bug Fables' }, { fr: 'Ori' }], answer: 0, why: { fr: 'Hollow Knight (Team Cherry, 2017) : Hallownest et ses secrets.' } },
        { id: 'ine5', q: { fr: 'Quel jeu vous demande d’épargner les monstres au lieu de les tuer ?' }, choices: [{ fr: 'Undertale' }, { fr: 'Deltarune' }, { fr: 'Omori' }, { fr: 'Earthbound' }], answer: 0, why: { fr: 'Undertale (Toby Fox, 2015) : tu peux finir sans tuer personne.' } },
        { id: 'ine6', q: { fr: 'Quel jeu de 2011 vous met dans la peau d’un cube qui résout des puzzles ?' }, choices: [{ fr: 'Portal 2' }, { fr: 'Fez' }, { fr: 'Braid' }, { fr: 'Minecraft' }], answer: 2, why: { fr: 'Braid (Jonathan Blow, 2008) : le temps comme mécanique.' } },
        { id: 'ine7', q: { fr: 'Quel jeu indé de survie a des graphismes en cubes ?' }, choices: [{ fr: 'Minecraft' }, { fr: 'Terraria' }, { fr: 'Roblox' }, { fr: 'Dragon Quest Builders' }], answer: 0, why: { fr: 'Minecraft (Mojang, 2009) : le plus vendu de l’histoire.' } },
        { id: 'ine8', q: { fr: 'Quel jeu indé vous fait gérer une prison spatiale avec des clones ?' }, choices: [{ fr: 'Among Us' }, { fr: 'FTL' }, { fr: 'Oxygen Not Included' }, { fr: 'RimWorld' }], answer: 0, why: { fr: 'Among Us (InnerSloth, 2018) : imposteur et tâches.' } },
      ],
      medium: [
        { id: 'inm1', q: { fr: 'Quel studio a développé Hades et Bastion ?' }, choices: [{ fr: 'Supergiant Games' }, { fr: 'Team Cherry' }, { fr: 'Motion Twin' }, { fr: 'ConcernedApe' }], answer: 0, why: { fr: 'Supergiant (San Francisco) : narration et musique uniques.' } },
        { id: 'inm2', q: { fr: 'Quel jeu indé français est un roguelike avec des cellules ?' }, choices: [{ fr: 'Dead Cells' }, { fr: 'Hades' }, { fr: 'Rogue Legacy' }, { fr: 'Slay the Spire' }], answer: 0, why: { fr: 'Dead Cells (Motion Twin, Bordeaux, 2017) : roguelike et metroidvania.' } },
        { id: 'inm3', q: { fr: 'Quel jeu de cartes roguelike vous fait gravir un donjon ?' }, choices: [{ fr: 'Slay the Spire' }, { fr: 'Hearthstone' }, { fr: 'Gwent' }, { fr: 'Balatro' }], answer: 0, why: { fr: 'Slay the Spire (2019) : deckbuilding et ascension.' } },
        { id: 'inm4', q: { fr: 'Qui a créé Stardew Valley seul ?' }, choices: [{ fr: 'ConcernedApe (Eric Barone)' }, { fr: 'Notch' }, { fr: 'Toby Fox' }, { fr: 'Lucas Pope' }], answer: 0, why: { fr: 'Eric Barone, 4 ans de dev solo, 30 millions de ventes.' } },
        { id: 'inm5', q: { fr: 'Quel jeu d’infiltration vous met dans la peau d’un douanier ?' }, choices: [{ fr: 'Papers, Please' }, { fr: 'This War of Mine' }, { fr: 'Beholder' }, { fr: 'Orwell' }], answer: 0, why: { fr: 'Papers, Please (Lucas Pope, 2013) : tampons et dilemmes moraux.' } },
        { id: 'inm6', q: { fr: 'Quel jeu indé raconte l’histoire d’un esprit qui guide les morts ?' }, choices: [{ fr: 'Spiritfarer' }, { fr: 'Gris' }, { fr: 'Journey' }, { fr: 'Abzu' }], answer: 0, why: { fr: 'Spiritfarer (Thunder Lotus, 2020) : gestion et deuil.' } },
        { id: 'inm7', q: { fr: 'Quel jeu de rythme vous fait jouer un samouraï sourd ?' }, choices: [{ fr: 'Hi-Fi Rush' }, { fr: 'Metal: Hellsinger' }, { fr: 'Crypt of the NecroDancer' }, { fr: 'BPM' }], answer: 0, why: { fr: 'Hi-Fi Rush (Tango, 2023) : action rythmée surprise de l’année.' } },
        { id: 'inm8', q: { fr: 'Quel metroidvania a été financé sur Kickstarter en 2014 ?' }, choices: [{ fr: 'Hollow Knight' }, { fr: 'Ori' }, { fr: 'Dead Cells' }, { fr: 'Blasphemous' }], answer: 0, why: { fr: 'Hollow Knight : 57k$ demandés, 400k$ récoltés.' } },
      ],
      hard: [
        { id: 'inh1', q: { fr: 'Quel est le nom du moteur de Celeste ?' }, choices: [{ fr: 'Monogame / XNA' }, { fr: 'Unity' }, { fr: 'Unreal' }, { fr: 'GameMaker' }], answer: 0, why: { fr: 'Celeste tourne sur Monogame, héritier de XNA de Microsoft.' } },
        { id: 'inh2', q: { fr: 'Combien de biomes dans Dead Cells 1.0 ?' }, choices: [{ fr: 'Plus de 15' }, { fr: '5' }, { fr: '8' }, { fr: '10' }], answer: 0, why: { fr: '15+ biomes interconnectés, sans temps de chargement.' } },
        { id: 'inh3', q: { fr: 'Quel jeu de Lucas Pope se déroule sur un bateau fantôme ?' }, choices: [{ fr: 'Return of the Obra Dinn' }, { fr: 'Papers, Please' }, { fr: 'The Witness' }, { fr: 'Outer Wilds' }], answer: 0, why: { fr: 'Return of the Obra Dinn (2018) : 60 destins à reconstituer.' } },
        { id: 'inh4', q: { fr: 'Quel est le vrai nom de l’auteur de Braid et The Witness ?' }, choices: [{ fr: 'Jonathan Blow' }, { fr: 'Phil Fish' }, { fr: 'Edmund McMillen' }, { fr: 'Derek Yu' }], answer: 0, why: { fr: 'Jonathan Blow, figure de l’indé exigeant.' } },
        { id: 'inh5', q: { fr: 'Quel jeu de cartes indé de 2024 a explosé avec des Jokers ?' }, choices: [{ fr: 'Balatro' }, { fr: 'Slay the Spire 2' }, { fr: 'Inscryption' }, { fr: 'Hearthstone' }], answer: 0, why: { fr: 'Balatro (LocalThunk, 2024) : poker roguelike, GOTY indé.' } },
        { id: 'inh6', q: { fr: 'Quel est le nom du studio derrière Hollow Knight ?' }, choices: [{ fr: 'Team Cherry' }, { fr: 'Team Meat' }, { fr: 'Cherry Games' }, { fr: 'Hollow Team' }], answer: 0, why: { fr: 'Team Cherry (Adélaïde, Australie) : trois devs, un chef-d’œuvre.' } },
        { id: 'inh7', q: { fr: 'Quel jeu indé a été créé en 48h pour une game jam ?' }, choices: [{ fr: 'Superhot' }, { fr: 'Celeste (prototype PICO-8)' }, { fr: 'Minecraft' }, { fr: 'Undertale' }], answer: 1, why: { fr: 'Celeste naît en PICO-8 lors d’une game jam en 4 jours.' } },
        { id: 'inh8', q: { fr: 'Quel est le nom du renard de Tunic ?' }, choices: [{ fr: 'Il n’a pas de nom, c’est juste le renard' }, { fr: 'Tunic' }, { fr: 'Link' }, { fr: 'Fox' }], answer: 0, why: { fr: 'Tunic (2022) : le renard sans nom et son manuel mystérieux façon Zelda.' } },
      ],
    },
  },
  {
    slug: 'nintendo-legends',
    route: '/quizz/nintendo-legends',
    videoId: 'A2VPhWOUMHI',
    image: quizThumbUrl('nintendo-legends'),
    tag: 'Nintendo',
    keywords: 'quizz nintendo mario zelda pokemon kirby metroid smash bros',
    source: '/dossiers/choc-generations-gaming',
    labels: {
      fr: { title: 'Légendes Nintendo', text: 'Mario, Zelda, Pokémon, Kirby, Metroid : l’univers Nintendo de 1985 à la Switch 2, en trois niveaux.' },
    },
    levels: {
      easy: [
        { id: 'nle1', q: { fr: 'Quelle est la couleur de Mario ?' }, choices: [{ fr: 'Rouge et bleu' }, { fr: 'Vert et jaune' }, { fr: 'Noir et blanc' }, { fr: 'Rose' }], answer: 0, why: { fr: 'Casquette rouge, salopette bleue, moustache iconique.' } },
        { id: 'nle2', q: { fr: 'Comment s’appelle le dinosaure vert ami de Mario ?' }, choices: [{ fr: 'Yoshi' }, { fr: 'Toad' }, { fr: 'Bowser' }, { fr: 'Koopa' }], answer: 0, why: { fr: 'Yoshi débute dans Super Mario World (1990).' } },
        { id: 'nle3', q: { fr: 'Quel animal est Pikachu ?' }, choices: [{ fr: 'Une souris électrique' }, { fr: 'Un chat' }, { fr: 'Un lapin' }, { fr: 'Un hamster' }], answer: 0, why: { fr: 'Pikachu, type Électrik, mascotte Pokémon depuis 1996.' } },
        { id: 'nle4', q: { fr: 'Comment s’appelle la princesse de Mario ?' }, choices: [{ fr: 'Peach' }, { fr: 'Zelda' }, { fr: 'Daisy' }, { fr: 'Rosalina' }], answer: 0, why: { fr: 'Princess Peach, souveraine du Royaume Champignon.' } },
        { id: 'nle5', q: { fr: 'Quelle est l’arme principale de Link ?' }, choices: [{ fr: 'L’épée et le bouclier' }, { fr: 'Un pistolet' }, { fr: 'Un arc seul' }, { fr: 'Une hache' }], answer: 0, why: { fr: 'Master Sword et bouclier Hylien : l’équipement de base.' } },
        { id: 'nle6', q: { fr: 'Quel objet permet de capturer les Pokémon ?' }, choices: [{ fr: 'La Poké Ball' }, { fr: 'Le filet' }, { fr: 'La cage' }, { fr: 'Le piège' }], answer: 0, why: { fr: 'La Poké Ball, inventée par le Prof. Chen et Silph Co.' } },
        { id: 'nle7', q: { fr: 'Comment s’appelle le méchant de Mario ?' }, choices: [{ fr: 'Bowser' }, { fr: 'Ganondorf' }, { fr: 'Wario' }, { fr: 'Donkey Kong' }], answer: 0, why: { fr: 'Bowser, Roi des Koopas, kidnappe Peach depuis 1985.' } },
        { id: 'nle8', q: { fr: 'Quelle console Nintendo est sortie en 2017 ?' }, choices: [{ fr: 'Switch' }, { fr: 'Wii U' }, { fr: '3DS' }, { fr: 'GameCube' }], answer: 0, why: { fr: 'La Switch : 140 millions de ventes, record Nintendo.' } },
      ],
      medium: [
        { id: 'nlm1', q: { fr: 'Quel est le nom du créateur de Mario et Zelda ?' }, choices: [{ fr: 'Shigeru Miyamoto' }, { fr: 'Satoru Iwata' }, { fr: 'Gunpei Yokoi' }, { fr: 'Hiroshi Yamauchi' }], answer: 0, why: { fr: 'Miyamoto, entré chez Nintendo en 1977, crée les deux sagas.' } },
        { id: 'nlm2', q: { fr: 'En quelle année sort Super Mario Bros. au Japon ?' }, choices: [{ fr: '1983' }, { fr: '1985' }, { fr: '1987' }, { fr: '1990' }], answer: 1, why: { fr: '13 septembre 1985 sur Famicom, il sauve l’industrie après le krach.' } },
        { id: 'nlm3', q: { fr: 'Quel est le nom japonais de Zelda ?' }, choices: [{ fr: 'Zeruda no Densetsu' }, { fr: 'Zelda Monogatari' }, { fr: 'Hyrule Fantasy' }, { fr: 'Link no Boken' }], answer: 0, why: { fr: 'Zeruda no Densetsu, La Légende de Zelda.' } },
        { id: 'nlm4', q: { fr: 'Quel est le premier Pokémon du Pokédex ?' }, choices: [{ fr: 'Bulbizarre' }, { fr: 'Pikachu' }, { fr: 'Mew' }, { fr: 'Salamèche' }], answer: 0, why: { fr: 'Bulbizarre #001, suivi d’Herbizarre et Florizarre.' } },
        { id: 'nlm5', q: { fr: 'Quel est le nom de la console portable à deux écrans de Nintendo ?' }, choices: [{ fr: 'DS' }, { fr: 'Game Boy Advance' }, { fr: 'Switch Lite' }, { fr: 'Virtual Boy' }], answer: 0, why: { fr: 'DS (2004) : 154 millions de ventes, deuxième console la plus vendue.' } },
        { id: 'nlm6', q: { fr: 'Comment s’appelle le royaume de Zelda ?' }, choices: [{ fr: 'Hyrule' }, { fr: 'Mushroom Kingdom' }, { fr: 'Kanto' }, { fr: 'Dream Land' }], answer: 0, why: { fr: 'Hyrule, terre de la Triforce et du château royal.' } },
        { id: 'nlm7', q: { fr: 'Quel est le nom de la boule rose de Nintendo ?' }, choices: [{ fr: 'Kirby' }, { fr: 'Jigglypuff' }, { fr: 'Toad' }, { fr: 'Boo' }], answer: 0, why: { fr: 'Kirby (HAL Laboratory, 1992) avale ses ennemis pour copier leurs pouvoirs.' } },
        { id: 'nlm8', q: { fr: 'Quel est le nom de la chasseuse de primes de Metroid ?' }, choices: [{ fr: 'Samus Aran' }, { fr: 'Zelda' }, { fr: 'Peach' }, { fr: 'Bayonetta' }], answer: 0, why: { fr: 'Samus Aran, révélation féminine de 1986 dans Metroid.' } },
      ],
      hard: [
        { id: 'nlh1', q: { fr: 'Quel est le nom du premier employé de Nintendo, fondateur en 1889 ?' }, choices: [{ fr: 'Fusajiro Yamauchi' }, { fr: 'Hiroshi Yamauchi' }, { fr: 'Shigeru Miyamoto' }, { fr: 'Gunpei Yokoi' }], answer: 0, why: { fr: 'Fusajiro Yamauchi fonde Nintendo pour des cartes Hanafuda.' } },
        { id: 'nlh2', q: { fr: 'Quel était le nom de code de la Nintendo 64 ?' }, choices: [{ fr: 'Project Reality' }, { fr: 'Project Dolphin' }, { fr: 'Project Revolution' }, { fr: 'Project NX' }], answer: 0, why: { fr: 'Project Reality, avec Silicon Graphics, avant Ultra 64 puis N64.' } },
        { id: 'nlh3', q: { fr: 'Quel est le nom du créateur de Game Boy ?' }, choices: [{ fr: 'Gunpei Yokoi' }, { fr: 'Shigeru Miyamoto' }, { fr: 'Satoru Iwata' }, { fr: 'Yokoi Gunpei est aussi le créateur du D-pad' }], answer: 0, why: { fr: 'Gunpei Yokoi invente la Game Boy, le D-pad et la philosophie « technologie vieillie ».' } },
        { id: 'nlh4', q: { fr: 'Combien de Korogus dans Breath of the Wild ?' }, choices: [{ fr: '900' }, { fr: '100' }, { fr: '500' }, { fr: '120' }], answer: 0, why: { fr: '900 Korogus à trouver, récompense : une crotte dorée géante.' } },
        { id: 'nlh5', q: { fr: 'Quel est le nom de l’ancêtre de Mario, dans Donkey Kong (1981) ?' }, choices: [{ fr: 'Jumpman' }, { fr: 'Plumber' }, { fr: 'Mario' }, { fr: 'Mr. Video' }], answer: 0, why: { fr: 'Jumpman, charpentier, devient Mario en 1983.' } },
        { id: 'nlh6', q: { fr: 'Quel est le nom du compositeur de Mario et Zelda ?' }, choices: [{ fr: 'Koji Kondo' }, { fr: 'Nobuo Uematsu' }, { fr: 'Yoko Shimomura' }, { fr: 'Junichi Masuda' }], answer: 0, why: { fr: 'Koji Kondo, depuis 1984, signe les thèmes les plus connus du jeu vidéo.' } },
        { id: 'nlh7', q: { fr: 'Quel est le nom de la console qui a failli être un add-on CD Sony-Nintendo ?' }, choices: [{ fr: 'PlayStation' }, { fr: 'Saturn' }, { fr: 'CD-i' }, { fr: '3DO' }], answer: 0, why: { fr: 'Le projet SNES-CD avorte, Sony en fait la PlayStation (1994).' } },
        { id: 'nlh8', q: { fr: 'Dans Pokémon, quel est le type qui bat le type Dragon ?' }, choices: [{ fr: 'Dragon, Glace et Fée' }, { fr: 'Feu' }, { fr: 'Eau' }, { fr: 'Combat' }], answer: 0, why: { fr: 'Dragon faible à Dragon, Glace et Fée depuis la 6G.' } },
      ],
    },
  },
  {
    slug: 'open-world-legends',
    route: '/quizz/open-world-legends',
    videoId: '0ThNyFItASM',
    image: quizThumbUrl('open-world-legends'),
    tag: 'Open World',
    keywords: 'quizz open world gta red dead zelda skyrim witcher elden ring',
    source: '/dossiers/let-play-awards-2025',
    labels: {
      fr: { title: 'Mondes ouverts légendaires', text: 'GTA, Red Dead, Zelda, Skyrim, The Witcher : les mondes ouverts qui vous ont fait oublier la quête principale, en trois niveaux.' },
    },
    levels: {
      easy: [
        { id: 'owe1', q: { fr: 'Quelle série de Rockstar vous met dans la peau d’un criminel en ville ?' }, choices: [{ fr: 'GTA' }, { fr: 'Red Dead' }, { fr: 'Bully' }, { fr: 'Mafia' }], answer: 0, why: { fr: 'Grand Theft Auto depuis 1997, phénomène avec GTA V (2013).' } },
        { id: 'owe2', q: { fr: 'Quel Zelda de 2017 est en monde ouvert ?' }, choices: [{ fr: 'Breath of the Wild' }, { fr: 'Ocarina of Time' }, { fr: 'Skyward Sword' }, { fr: 'Twilight Princess' }], answer: 0, why: { fr: 'Breath of the Wild réinvente Zelda en monde ouvert total.' } },
        { id: 'owe3', q: { fr: 'Dans quel jeu chevauchez-vous à travers le Far West en 1899 ?' }, choices: [{ fr: 'Red Dead Redemption 2' }, { fr: 'GTA V' }, { fr: 'Call of Duty' }, { fr: 'Assassin’s Creed' }], answer: 0, why: { fr: 'RDR2 (Rockstar, 2018) : Arthur Morgan et le gang Van der Linde.' } },
        { id: 'owe4', q: { fr: 'Quel RPG de Bethesda vous envoie à Bordeciel ?' }, choices: [{ fr: 'Skyrim' }, { fr: 'Oblivion' }, { fr: 'Fallout 4' }, { fr: 'Starfield' }], answer: 0, why: { fr: 'The Elder Scrolls V: Skyrim (2011) : Dovahkiin et les dragons.' } },
        { id: 'owe5', q: { fr: 'Quelle ville est le décor de GTA V ?' }, choices: [{ fr: 'Los Santos' }, { fr: 'Liberty City' }, { fr: 'Vice City' }, { fr: 'San Fierro' }], answer: 0, why: { fr: 'Los Santos, parodie de Los Angeles, avec Blaine County.' } },
        { id: 'owe6', q: { fr: 'Quel jeu de CD Projekt se déroule à Night City ?' }, choices: [{ fr: 'Cyberpunk 2077' }, { fr: 'The Witcher 3' }, { fr: 'Gwent' }, { fr: 'Thronebreaker' }], answer: 0, why: { fr: 'Cyberpunk 2077 (2020) : V et Johnny Silverhand à Night City.' } },
        { id: 'owe7', q: { fr: 'Dans The Witcher 3, quel est le nom du continent ?' }, choices: [{ fr: 'Le Continent' }, { fr: 'Tamriel' }, { fr: 'Azeroth' }, { fr: 'Faerûn' }], answer: 0, why: { fr: 'Le Continent, avec Novigrad, Skellige et Toussaint.' } },
        { id: 'owe8', q: { fr: 'Quel jeu FromSoftware est un monde ouvert en 2022 ?' }, choices: [{ fr: 'Elden Ring' }, { fr: 'Dark Souls III' }, { fr: 'Sekiro' }, { fr: 'Bloodborne' }], answer: 0, why: { fr: 'Elden Ring : l’Entre-Terre en monde ouvert, co-écrit avec G.R.R. Martin.' } },
      ],
      medium: [
        { id: 'owm1', q: { fr: 'Quel est le jeu le plus vendu de l’histoire du jeu vidéo (hors Minecraft) ?' }, choices: [{ fr: 'GTA V' }, { fr: 'Tetris' }, { fr: 'Wii Sports' }, { fr: 'PUBG' }], answer: 0, why: { fr: 'GTA V : plus de 200 millions d’exemplaires, record absolu hors Minecraft.' } },
        { id: 'owm2', q: { fr: 'Quel est le nom de la carte de Skyrim ?' }, choices: [{ fr: 'Bordeciel' }, { fr: 'Cyrodiil' }, { fr: 'Morrowind' }, { fr: 'Tamriel' }], answer: 0, why: { fr: 'Bordeciel (Skyrim en anglais) est la province nord de Tamriel.' } },
        { id: 'owm3', q: { fr: 'Quelle année pour l’histoire de Red Dead Redemption 2 ?' }, choices: [{ fr: '1899' }, { fr: '1911' }, { fr: '1865' }, { fr: '2001' }], answer: 0, why: { fr: '1899, fin de l’Ouest sauvage, juste avant le premier Red Dead (1911).' } },
        { id: 'owm4', q: { fr: 'Qui a écrit les livres The Witcher ?' }, choices: [{ fr: 'Andrzej Sapkowski' }, { fr: 'George R. R. Martin' }, { fr: 'J.R.R. Tolkien' }, { fr: 'CD Projekt' }], answer: 0, why: { fr: 'Andrzej Sapkowski, auteur polonais depuis 1986.' } },
        { id: 'owm5', q: { fr: 'Quel est le nom du cheval de Link dans Breath of the Wild ?' }, choices: [{ fr: 'Epona' }, { fr: 'Il n’a pas de nom fixe, vous nommez votre cheval' }, { fr: 'Agro' }, { fr: 'Roach' }], answer: 1, why: { fr: 'Vous capturez et nommez vos chevaux ; Epona vient via amiibo.' } },
        { id: 'owm6', q: { fr: 'Quel est le nom de l’éditeur de GTA ?' }, choices: [{ fr: 'Rockstar Games' }, { fr: 'Take-Two' }, { fr: '2K Games' }, { fr: 'Rockstar est édité par Take-Two' }], answer: 3, why: { fr: 'Rockstar Games, label de Take-Two Interactive.' } },
        { id: 'owm7', q: { fr: 'Quel est le premier GTA en 3D ?' }, choices: [{ fr: 'GTA III' }, { fr: 'GTA Vice City' }, { fr: 'GTA San Andreas' }, { fr: 'GTA IV' }], answer: 0, why: { fr: 'GTA III (2001) : Liberty City en 3D, révolution open world.' } },
        { id: 'owm8', q: { fr: 'Dans Cyberpunk 2077, qui joue Johnny Silverhand ?' }, choices: [{ fr: 'Keanu Reeves' }, { fr: 'Idris Elba' }, { fr: 'Norman Reedus' }, { fr: 'Troy Baker' }], answer: 0, why: { fr: 'Keanu Reeves prête son visage et sa voix à Johnny.' } },
      ],
      hard: [
        { id: 'owh1', q: { fr: 'Combien de fins différentes dans Elden Ring ?' }, choices: [{ fr: '6' }, { fr: '2' }, { fr: '3' }, { fr: '12' }], answer: 0, why: { fr: '6 fins : Seigneur d’Elden, Âge des Étoiles, Frenzied Flame, etc.' } },
        { id: 'owh2', q: { fr: 'Quel est le nom du moteur de Red Dead Redemption 2 ?' }, choices: [{ fr: 'RAGE' }, { fr: 'Unreal Engine' }, { fr: 'Decima' }, { fr: 'Frostbite' }], answer: 0, why: { fr: 'RAGE (Rockstar Advanced Game Engine), maison Rockstar.' } },
        { id: 'owh3', q: { fr: 'Quelle est la taille de la carte de GTA V ?' }, choices: [{ fr: 'Environ 80 km²' }, { fr: '200 km²' }, { fr: '20 km²' }, { fr: '500 km²' }], answer: 0, why: { fr: '~80 km² pour GTA V, 130 km² pour RDR2.' } },
        { id: 'owh4', q: { fr: 'Quel est le nom du créateur de GTA ?' }, choices: [{ fr: 'Dan et Sam Houser' }, { fr: 'Hideo Kojima' }, { fr: 'Shigeru Miyamoto' }, { fr: 'Todd Howard' }], answer: 0, why: { fr: 'Les frères Houser fondent Rockstar en 1998 avec Leslie Benzies.' } },
        { id: 'owh5', q: { fr: 'Dans Skyrim, quel cri vous permet de voler ?' }, choices: [{ fr: 'Aucun, mais « Tornade » vous projette' }, { fr: 'Fus Ro Dah' }, { fr: 'Feim Zii Gron' }, { fr: 'Voler n’existe pas sans mod' }], answer: 0, why: { fr: 'Pas de vol natif, mais mods et cris de déplacement rapide.' } },
        { id: 'owh6', q: { fr: 'Quel est le nom du monde de The Witcher 3 : Blood and Wine ?' }, choices: [{ fr: 'Toussaint' }, { fr: 'Novigrad' }, { fr: 'Skellige' }, { fr: 'Velen' }], answer: 0, why: { fr: 'Toussaint, ensoleillée, inspirée du sud de la France.' } },
        { id: 'owh7', q: { fr: 'Quel est le premier jeu open world moderne souvent cité ?' }, choices: [{ fr: 'The Legend of Zelda (1986)' }, { fr: 'GTA III (2001)' }, { fr: 'Elite (1984)' }, { fr: 'Shenmue (1999)' }], answer: 2, why: { fr: 'Elite (1984) : univers ouvert spatial, ancêtre du genre.' } },
        { id: 'owh8', q: { fr: 'Dans Breath of the Wild, combien de sanctuaires ?' }, choices: [{ fr: '120' }, { fr: '90' }, { fr: '150' }, { fr: '76' }], answer: 0, why: { fr: '120 sanctuaires + 16 DLC = 136 au total.' } },
      ],
    },
  },
  {
    slug: 'sci-fi-gaming',
    route: '/quizz/sci-fi-gaming',
    videoId: 'Zl6crcrPnPQ',
    image: quizThumbUrl('sci-fi-gaming'),
    tag: 'SF',
    keywords: 'quizz science fiction mass effect halo cyberpunk starcraft half-life',
    source: '/dossiers/choc-generations-gaming',
    labels: {
      fr: { title: 'SF & space opera', text: 'Mass Effect, Halo, Cyberpunk, StarCraft, Half-Life : la science-fiction qui fait décoller les manettes, en trois niveaux.' },
    },
    levels: {
      easy: [
        { id: 'sfe1a', q: { fr: 'Quelle saga de BioWare vous fait sauver la galaxie avec Shepard ?' }, choices: [{ fr: 'Mass Effect' }, { fr: 'Halo' }, { fr: 'Starfield' }, { fr: 'Destiny' }], answer: 0, why: { fr: 'Mass Effect (2007-2012) : Shepard contre les Moissonneurs.' } },
        { id: 'sfe2a', q: { fr: 'Quel est le nom de l’IA bleue de Halo ?' }, choices: [{ fr: 'Cortana' }, { fr: 'Siri' }, { fr: 'Alexa' }, { fr: 'Apex' }], answer: 0, why: { fr: 'Cortana, IA de l’UNSC, compagne de Master Chief.' } },
        { id: 'sfe3a', q: { fr: 'Dans quel jeu explorez-vous Night City en 2077 ?' }, choices: [{ fr: 'Cyberpunk 2077' }, { fr: 'Deus Ex' }, { fr: 'Blade Runner' }, { fr: 'Observer' }], answer: 0, why: { fr: 'Cyberpunk 2077 (CD Projekt, 2020) : Night City et ses implants.' } },
        { id: 'sfe4a', q: { fr: 'Quelle série de Blizzard oppose Terrans, Zergs et Protoss ?' }, choices: [{ fr: 'StarCraft' }, { fr: 'Warcraft' }, { fr: 'Diablo' }, { fr: 'Overwatch' }], answer: 0, why: { fr: 'StarCraft (1998) : STR SF culte, sport national en Corée.' } },
        { id: 'sfe5a', q: { fr: 'Quel physicien muet affronte des aliens à Black Mesa ?' }, choices: [{ fr: 'Gordon Freeman' }, { fr: 'Isaac Clarke' }, { fr: 'Alan Wake' }, { fr: 'Master Chief' }], answer: 0, why: { fr: 'Gordon Freeman, héros de Half-Life (1998).' } },
        { id: 'sfe6a', q: { fr: 'Comment s’appelle le vaisseau de Mass Effect ?' }, choices: [{ fr: 'Normandy' }, { fr: 'Enterprise' }, { fr: 'Rocinante' }, { fr: 'Ishimura' }], answer: 0, why: { fr: 'Normandy SR-1 puis SR-2, frégate de l’Alliance.' } },
        { id: 'sfe7a', q: { fr: 'Quel jeu de Bethesda vous envoie dans l’espace en 2023 ?' }, choices: [{ fr: 'Starfield' }, { fr: 'Skyrim' }, { fr: 'Fallout 4' }, { fr: 'Oblivion' }], answer: 0, why: { fr: 'Starfield (2023) : 1000 planètes, exploration spatiale.' } },
        { id: 'sfe8a', q: { fr: 'Quel est le nom de l’ennemi parasite de Halo ?' }, choices: [{ fr: 'Le Flood' }, { fr: 'Les Zergs' }, { fr: 'Les Tyranides' }, { fr: 'Les Nécromorphes' }], answer: 0, why: { fr: 'Le Flood, parasite qui infecte tout sur les anneaux.' } },
      ],
      medium: [
        { id: 'sfm1a', q: { fr: 'Qui a créé Mass Effect ?' }, choices: [{ fr: 'BioWare' }, { fr: 'Bethesda' }, { fr: 'Obsidian' }, { fr: 'CD Projekt' }], answer: 0, why: { fr: 'BioWare Edmonton, trilogie culte 2007-2012.' } },
        { id: 'sfm2a', q: { fr: 'Quel est le nom de l’anneau-monde de Halo ?' }, choices: [{ fr: 'Halo' }, { fr: 'Anneau-Monde' }, { fr: 'Installation 04' }, { fr: 'Les deux, Halo est le surnom de l’Installation 04' }], answer: 3, why: { fr: 'Installation 04, premier anneau découvert, surnommé Halo.' } },
        { id: 'sfm3a', q: { fr: 'Quel est le nom du moteur de Half-Life 2 ?' }, choices: [{ fr: 'Source' }, { fr: 'GoldSrc' }, { fr: 'Unreal Engine 2' }, { fr: 'id Tech 4' }], answer: 0, why: { fr: 'Source Engine (Valve, 2004) : physique et modding.' } },
        { id: 'sfm4a', q: { fr: 'Dans Cyberpunk 2077, quel acteur joue Johnny Silverhand ?' }, choices: [{ fr: 'Keanu Reeves' }, { fr: 'Idris Elba' }, { fr: 'Henry Cavill' }, { fr: 'Norman Reedus' }], answer: 0, why: { fr: 'Keanu Reeves, rockerboy immortel dans la puce de V.' } },
        { id: 'sfm5a', q: { fr: 'Quel est le nom de la race insectoïde de StarCraft ?' }, choices: [{ fr: 'Zerg' }, { fr: 'Tyranide' }, { fr: 'Flood' }, { fr: 'Nécromorphe' }], answer: 0, why: { fr: 'Les Zergs, essaim dirigé par l’Overmind puis Kerrigan.' } },
        { id: 'sfm6a', q: { fr: 'Quel jeu de 2022 vous fait incarner un chat dans une ville robot ?' }, choices: [{ fr: 'Stray' }, { fr: 'Cyberpunk 2077' }, { fr: 'The Ascent' }, { fr: 'Observer' }], answer: 0, why: { fr: 'Stray (BlueTwelve, 2022) : chat cyberpunk et robots.' } },
        { id: 'sfm7a', q: { fr: 'Quel est le nom de l’entreprise qui crée les réplicants dans Blade Runner ?' }, choices: [{ fr: 'Tyrell Corporation' }, { fr: 'Arasaka' }, { fr: 'Umbrella' }, { fr: 'Weyland-Yutani' }], answer: 0, why: { fr: 'Tyrell Corp, puis Wallace, créateurs des réplicants.' } },
        { id: 'sfm8a', q: { fr: 'Quel est le nom du héros de Deus Ex (2000) ?' }, choices: [{ fr: 'JC Denton' }, { fr: 'Adam Jensen' }, { fr: 'Gordon Freeman' }, { fr: 'V' }], answer: 0, why: { fr: 'JC Denton, agent nano-augmenté, conspiration mondiale.' } },
      ],
      hard: [
        { id: 'sfh1a', q: { fr: 'Quel est le nom de l’auteur de Neuromancien, qui a inspiré Cyberpunk ?' }, choices: [{ fr: 'William Gibson' }, { fr: 'Philip K. Dick' }, { fr: 'Isaac Asimov' }, { fr: 'Arthur C. Clarke' }], answer: 0, why: { fr: 'William Gibson (1984) invente le cyberspace et le cyberpunk.' } },
        { id: 'sfh2a', q: { fr: 'Dans Mass Effect, que sont les Moissonneurs ?' }, choices: [{ fr: 'Des machines qui moissonnent les civilisations tous les 50 000 ans' }, { fr: 'Des pirates' }, { fr: 'Une race d’insectes' }, { fr: 'Des humains augmentés' }], answer: 0, why: { fr: 'Les Reapers effacent les civilisations avancées pour préserver l’ordre.' } },
        { id: 'sfh3a', q: { fr: 'Quel est le nom du créateur de Halo, parti fonder Bungie ?' }, choices: [{ fr: 'Jason Jones' }, { fr: 'Marty O’Donnell' }, { fr: 'Alex Seropian' }, { fr: 'Les trois ont co-fondé Bungie' }], answer: 3, why: { fr: 'Jason Jones et Alex Seropian fondent Bungie en 1991.' } },
        { id: 'sfh4a', q: { fr: 'Quel est le nom du vaisseau fantôme de Dead Space ?' }, choices: [{ fr: 'USG Ishimura' }, { fr: 'UNSC Pillar of Autumn' }, { fr: 'Normandy' }, { fr: 'Nostromo' }], answer: 0, why: { fr: 'USG Ishimura, brise-surface infecté par le Flood-like nécromorphe.' } },
        { id: 'sfh5a', q: { fr: 'Quel est le nom du système de voyage de Mass Effect ?' }, choices: [{ fr: 'Relais cosmodésique' }, { fr: 'Hyperdrive' }, { fr: 'Warp' }, { fr: 'Saut quantique' }], answer: 0, why: { fr: 'Relais cosmodésiques : vestiges des Moissonneurs pour traverser la galaxie.' } },
        { id: 'sfh6a', q: { fr: 'Quel est le nom du premier jeu de la série X de Egosoft ?' }, choices: [{ fr: 'X: Beyond the Frontier' }, { fr: 'X3' }, { fr: 'X4' }, { fr: 'Elite' }], answer: 0, why: { fr: 'X: Beyond the Frontier (1999) : simu spatiale allemande culte.' } },
        { id: 'sfh7a', q: { fr: 'Dans Half-Life, que signifie G-Man ?' }, choices: [{ fr: 'Government Man' }, { fr: 'Gordon-Man' }, { fr: 'Mystère jamais expliqué officiellement' }, { fr: 'G-Man est son vrai nom' }], answer: 2, why: { fr: 'Valve n’a jamais expliqué G-Man, homme au costume bleu.' } },
        { id: 'sfh8a', q: { fr: 'Quel est le nom du créateur de Cyberpunk 2020, le jeu de rôle papier ?' }, choices: [{ fr: 'Mike Pondsmith' }, { fr: 'William Gibson' }, { fr: 'CD Projekt' }, { fr: 'Keanu Reeves' }], answer: 0, why: { fr: 'Mike Pondsmith crée Cyberpunk en 1988, consulté pour 2077.' } },
      ],
    },
  },
  {
    slug: 'battle-royale',
    route: '/quizz/battle-royale',
    videoId: 'twbaM8fiXpo',
    image: quizThumbUrl('battle-royale'),
    tag: 'E-sport',
    keywords: 'quizz battle royale fortnite pubg apex warzone free fire',
    labels: {
      fr: { title: 'Battle royale', text: 'PUBG, Fortnite, Apex, Warzone, Free Fire : le dernier survivant rafle tout, du drop facile au top 1 expert.' },
    },
    levels: {
      easy: [
        { id: 'bre1', q: { fr: 'Combien de joueurs dans une partie classique de battle royale ?' }, choices: [{ fr: '100' }, { fr: '50' }, { fr: '32' }, { fr: '16' }], answer: 0, why: { fr: '100 joueurs, un seul survivant — la règle du genre.' } },
        { id: 'bre2', q: { fr: 'Quel jeu d’Epic Games a popularisé le battle royale avec des constructions ?' }, choices: [{ fr: 'Fortnite' }, { fr: 'PUBG' }, { fr: 'Apex Legends' }, { fr: 'Minecraft' }], answer: 0, why: { fr: 'Fortnite Battle Royale (2017) ajoute construction et passe-partout.' } },
        { id: 'bre3', q: { fr: 'Quel est le nom du bus de Fortnite ?' }, choices: [{ fr: 'Le bus de combat' }, { fr: 'Le bus scolaire' }, { fr: 'Le bus magique' }, { fr: 'Le battle bus' }], answer: 3, why: { fr: 'Battle Bus, qui survole l’île à chaque début de partie.' } },
        { id: 'bre4', q: { fr: 'Quel jeu de battle royale est édité par Garena ?' }, choices: [{ fr: 'Free Fire' }, { fr: 'PUBG' }, { fr: 'Fortnite' }, { fr: 'Apex' }], answer: 0, why: { fr: 'Free Fire, star mobile du FFAC2023 en Algérie.' } },
        { id: 'bre5', q: { fr: 'Dans Apex Legends, combien de joueurs par escouade ?' }, choices: [{ fr: '3' }, { fr: '2' }, { fr: '4' }, { fr: '5' }], answer: 0, why: { fr: '3 joueurs par escouade, 20 escouades = 60 joueurs.' } },
        { id: 'bre6', q: { fr: 'Quel est le nom de la zone qui rétrécit ?' }, choices: [{ fr: 'La zone / le cercle' }, { fr: 'Le mur' }, { fr: 'Le brouillard' }, { fr: 'La tempête' }], answer: 0, why: { fr: 'Zone, cercle, tempête : elle force les joueurs à se rapprocher.' } },
        { id: 'bre7', q: { fr: 'Quel Call of Duty a lancé Warzone ?' }, choices: [{ fr: 'Modern Warfare (2019)' }, { fr: 'Black Ops 4' }, { fr: 'Modern Warfare 2' }, { fr: 'Vanguard' }], answer: 0, why: { fr: 'Warzone sort en mars 2020 avec Modern Warfare (2019).' } },
        { id: 'bre8', q: { fr: 'Que signifie « loot » ?' }, choices: [{ fr: 'Le butin' }, { fr: 'Le niveau' }, { fr: 'La vie' }, { fr: 'Le temps' }], answer: 0, why: { fr: 'Loot = armes et objets ramassés au sol.' } },
      ],
      medium: [
        { id: 'brm1', q: { fr: 'Quel est le premier battle royale à succès (2017) ?' }, choices: [{ fr: 'PUBG' }, { fr: 'Fortnite' }, { fr: 'H1Z1' }, { fr: 'PUBG est le premier à exploser, H1Z1 l’a précédé' }], answer: 3, why: { fr: 'H1Z1 (2015) précède, mais PUBG (2017) fait exploser le genre.' } },
        { id: 'brm2', q: { fr: 'Quel est le nom du créateur de PUBG ?' }, choices: [{ fr: 'Brendan Greene' }, { fr: 'Tim Sweeney' }, { fr: 'Vince Zampella' }, { fr: 'Garena' }], answer: 0, why: { fr: 'Brendan Greene, alias PlayerUnknown, moddeur Arma.' } },
        { id: 'brm3', q: { fr: 'Dans Fortnite, quel matériau est le plus solide ?' }, choices: [{ fr: 'Le métal' }, { fr: 'Le bois' }, { fr: 'La brique' }, { fr: 'Ils ont la même résistance au début, métal plus résistant à la fin' }], answer: 3, why: { fr: 'Bois 200 PV, brique 300, métal 400 — mais bois se construit plus vite.' } },
        { id: 'brm4', q: { fr: 'Quel est le nom de l’éditeur d’Apex Legends ?' }, choices: [{ fr: 'EA' }, { fr: 'Epic Games' }, { fr: 'Activision' }, { fr: 'Garena' }], answer: 0, why: { fr: 'EA édite Apex Legends (Respawn, 2019).' } },
        { id: 'brm5', q: { fr: 'Quel est le nombre de joueurs dans Warzone à son lancement ?' }, choices: [{ fr: '150' }, { fr: '100' }, { fr: '60' }, { fr: '200' }], answer: 0, why: { fr: '150 joueurs à Verdansk, puis 120, puis retour à 150.' } },
        { id: 'brm6', q: { fr: 'Quel est le nom de la mécanique de résurrection d’Apex ?' }, choices: [{ fr: 'Les balises de réapparition' }, { fr: 'Le gulag' }, { fr: 'Le van de réanimation' }, { fr: 'Le totem' }], answer: 0, why: { fr: 'Balises pour récupérer les bannières des alliés.' } },
        { id: 'brm7', q: { fr: 'Quel est le nom du mode sans construction de Fortnite ?' }, choices: [{ fr: 'Zero Build' }, { fr: 'No Build' }, { fr: 'Battle Royale sans construction' }, { fr: 'Mode tactique' }], answer: 0, why: { fr: 'Zero Build (2022) devient permanent face au succès.' } },
        { id: 'brm8', q: { fr: 'Quel est le prix du prize pool du premier tournoi Fortnite World Cup ?' }, choices: [{ fr: '30 millions de dollars' }, { fr: '1 million' }, { fr: '10 millions' }, { fr: '100 millions' }], answer: 0, why: { fr: '30M$ en 2019 à New York, 3M$ pour le vainqueur solo Bugha.' } },
      ],
      hard: [
        { id: 'brh1', q: { fr: 'Quel film japonais de 2000 a inspiré le nom battle royale ?' }, choices: [{ fr: 'Battle Royale de Kinji Fukasaku' }, { fr: 'Hunger Games' }, { fr: 'Running Man' }, { fr: 'Squid Game' }], answer: 0, why: { fr: 'Battle Royale (2000) : classe de lycéens qui s’entretuent.' } },
        { id: 'brh2', q: { fr: 'Quel est le nom du mod Arma 2 qui a créé le genre survival BR ?' }, choices: [{ fr: 'DayZ Battle Royale' }, { fr: 'PlayerUnknown’s Battle Royale mod' }, { fr: 'H1Z1' }, { fr: 'Arma 3 BR' }], answer: 1, why: { fr: 'PlayerUnknown modde Arma 2 puis Arma 3 avant PUBG.' } },
        { id: 'brh3', q: { fr: 'Quel est le temps moyen d’une partie de Fortnite ?' }, choices: [{ fr: '20 minutes' }, { fr: '5 minutes' }, { fr: '40 minutes' }, { fr: '60 minutes' }], answer: 0, why: { fr: '~20 minutes du drop au top 1.' } },
        { id: 'brh4', q: { fr: 'Dans Warzone, qu’est-ce que le Gulag ?' }, choices: [{ fr: 'Une prison 1v1 pour revenir en vie' }, { fr: 'Une arme' }, { fr: 'Un véhicule' }, { fr: 'Une carte' }], answer: 0, why: { fr: 'Mort en BR = duel 1v1 au Gulag pour revenir.' } },
        { id: 'brh5', q: { fr: 'Quel est le nombre max de joueurs dans le mode Impostors de Fortnite ?' }, choices: [{ fr: 'Ce n’est pas un battle royale, c’est un mode Among Us' }, { fr: '100' }, { fr: '16' }, { fr: '20' }], answer: 0, why: { fr: 'Impostors (2021) est le Among Us de Fortnite, 10 joueurs.' } },
        { id: 'brh6', q: { fr: 'Quel est le nom de la carte originale de PUBG ?' }, choices: [{ fr: 'Erangel' }, { fr: 'Miramar' }, { fr: 'Sanhok' }, { fr: 'Vikendi' }], answer: 0, why: { fr: 'Erangel, île russe de 8×8 km, carte mythique.' } },
        { id: 'brh7', q: { fr: 'Quel est le record de kills solo en Apex Legends ?' }, choices: [{ fr: 'Plus de 30 kills' }, { fr: '20 kills' }, { fr: '15 kills' }, { fr: '60 kills' }], answer: 0, why: { fr: 'Records >35 kills en partie publique, preuves vidéo.' } },
        { id: 'brh8', q: { fr: 'Quel moteur fait tourner Fortnite ?' }, choices: [{ fr: 'Unreal Engine 5' }, { fr: 'Unity' }, { fr: 'Frostbite' }, { fr: 'Source 2' }], answer: 0, why: { fr: 'Fortnite est passé à Unreal Engine 5 avec le Chapitre 4.' } },
      ],
    },
  },
  {
    slug: 'mmo-legends',
    route: '/quizz/mmo-legends',
    videoId: 't1Re8ki_gsw',
    image: quizThumbUrl('mmo-legends'),
    tag: 'RPG',
    keywords: 'quizz mmo wow final fantasy xiv guild wars eve online elder scrolls online',
    source: '/dossiers/let-play-awards-2025',
    labels: {
      fr: { title: 'MMO légendaires', text: 'World of Warcraft, Final Fantasy XIV, Guild Wars 2, EVE Online : les mondes persistants où des milliers de joueurs coexistent, en trois niveaux.' },
    },
    levels: {
      easy: [
        { id: 'mme1', q: { fr: 'Que signifie MMO ?' }, choices: [{ fr: 'Massively Multiplayer Online' }, { fr: 'Mega Multi Online' }, { fr: 'Massive Map Open' }, { fr: 'Multi Mode Online' }], answer: 0, why: { fr: 'MMO = jeu en ligne massivement multijoueur.' } },
        { id: 'mme2', q: { fr: 'Quel est le MMO le plus célèbre de Blizzard ?' }, choices: [{ fr: 'World of Warcraft' }, { fr: 'Diablo IV' }, { fr: 'Overwatch' }, { fr: 'StarCraft' }], answer: 0, why: { fr: 'WoW (2004) : 20 ans, 9 extensions, Azeroth.' } },
        { id: 'mme3', q: { fr: 'Comment s’appelle le monde de World of Warcraft ?' }, choices: [{ fr: 'Azeroth' }, { fr: 'Tamriel' }, { fr: 'Eorzea' }, { fr: 'Tyria' }], answer: 0, why: { fr: 'Azeroth, avec Kalimdor et Royaumes de l’Est.' } },
        { id: 'mme4', q: { fr: 'Quel MMO de Square Enix a été sauvé après un échec en 2010 ?' }, choices: [{ fr: 'Final Fantasy XIV' }, { fr: 'Final Fantasy XI' }, { fr: 'Dragon Quest X' }, { fr: 'Kingdom Hearts' }], answer: 0, why: { fr: 'FFXIV 1.0 échec, A Realm Reborn (2013) le sauve et devient culte.' } },
        { id: 'mme5', q: { fr: 'Que signifie « raid » dans un MMO ?' }, choices: [{ fr: 'Un donjon difficile pour beaucoup de joueurs' }, { fr: 'Une course' }, { fr: 'Un duel' }, { fr: 'Une quête solo' }], answer: 0, why: { fr: 'Raid : 10 à 40 joueurs contre un boss, coordination obligatoire.' } },
        { id: 'mme6', q: { fr: 'Quel MMO spatial a une économie réelle à plusieurs milliers d’euros ?' }, choices: [{ fr: 'EVE Online' }, { fr: 'Star Citizen' }, { fr: 'Elite Dangerous' }, { fr: 'No Man’s Sky' }], answer: 0, why: { fr: 'EVE Online (2003) : batailles à 6000 joueurs et pertes à 300k$.' } },
        { id: 'mme7', q: { fr: 'Quel est le niveau max actuel dans WoW ?' }, choices: [{ fr: '80' }, { fr: '60' }, { fr: '70' }, { fr: '90' }], answer: 0, why: { fr: '80 depuis The War Within (2024), après squish à 60.' } },
        { id: 'mme8', q: { fr: 'Dans un MMO, qu’est-ce qu’un « tank » ?' }, choices: [{ fr: 'Celui qui encaisse les dégâts' }, { fr: 'Celui qui soigne' }, { fr: 'Celui qui fait des dégâts' }, { fr: 'Un véhicule' }], answer: 0, why: { fr: 'Tank, healer, DPS : la trinité des MMO.' } },
      ],
      medium: [
        { id: 'mmm1', q: { fr: 'En quelle année sort World of Warcraft ?' }, choices: [{ fr: '2004' }, { fr: '2001' }, { fr: '2007' }, { fr: '2010' }], answer: 0, why: { fr: '23 novembre 2004 aux US, 2005 en Europe.' } },
        { id: 'mmm2', q: { fr: 'Quel est le nom de l’extension WoW avec les dragons en 2022 ?' }, choices: [{ fr: 'Dragonflight' }, { fr: 'Shadowlands' }, { fr: 'Battle for Azeroth' }, { fr: 'Legion' }], answer: 0, why: { fr: 'Dragonflight (2022) : retour aux Îles aux Dragons.' } },
        { id: 'mmm3', q: { fr: 'Qui est le directeur qui a sauvé Final Fantasy XIV ?' }, choices: [{ fr: 'Naoki Yoshida' }, { fr: 'Hironobu Sakaguchi' }, { fr: 'Yoshinori Kitase' }, { fr: 'Tetsuya Nomura' }], answer: 0, why: { fr: 'Naoki Yoshida (Yoshi-P) reprend FFXIV en 2010 et le reconstruit.' } },
        { id: 'mmm4', q: { fr: 'Quel est le nom de la monnaie de Guild Wars 2 ?' }, choices: [{ fr: 'L’or et les gemmes' }, { fr: 'Les Gil' }, { fr: 'Les Po' }, { fr: 'Les crédits' }], answer: 0, why: { fr: 'Or en jeu et gemmes premium, sans abonnement.' } },
        { id: 'mmm5', q: { fr: 'Quel MMO n’a pas d’abonnement obligatoire ?' }, choices: [{ fr: 'Guild Wars 2' }, { fr: 'WoW' }, { fr: 'FFXIV' }, { fr: 'EVE Online (a un abonnement mais peut se jouer en Alpha)' }], answer: 0, why: { fr: 'Guild Wars 2 : buy-to-play depuis 2012.' } },
        { id: 'mmm6', q: { fr: 'Quel est le nom du créateur de World of Warcraft ?' }, choices: [{ fr: 'Blizzard Entertainment' }, { fr: 'Chris Metzen' }, { fr: 'Rob Pardo' }, { fr: 'Toute l’équipe Blizzard North et Irvine' }], answer: 3, why: { fr: 'Équipe Blizzard menée par Rob Pardo et Chris Metzen.' } },
        { id: 'mmm7', q: { fr: 'Quel est le plus gros raid de WoW Classic ?' }, choices: [{ fr: '40 joueurs' }, { fr: '25 joueurs' }, { fr: '10 joueurs' }, { fr: '20 joueurs' }], answer: 0, why: { fr: 'Molten Core et Blackwing Lair : 40 joueurs à l’époque.' } },
        { id: 'mmm8', q: { fr: 'Dans EVE Online, qu’est-ce que Jita ?' }, choices: [{ fr: 'La principale station commerciale' }, { fr: 'Une planète' }, { fr: 'Un boss' }, { fr: 'Un vaisseau' }], answer: 0, why: { fr: 'Jita IV-4 : hub commercial où tout s’achète et se vend.' } },
      ],
      hard: [
        { id: 'mmh1', q: { fr: 'Combien d’abonnés au pic de WoW en 2010 ?' }, choices: [{ fr: '12 millions' }, { fr: '5 millions' }, { fr: '20 millions' }, { fr: '8 millions' }], answer: 0, why: { fr: '12 millions lors de Wrath of the Lich King, record historique.' } },
        { id: 'mmh2', q: { fr: 'Quel est le nom du serveur RP le plus célèbre de WoW ?' }, choices: [{ fr: 'Kirlanth / Confrérie du Thorium (FR) et Argent Dawn (EU)' }, { fr: 'Illidan' }, { fr: 'Sargeras' }, { fr: 'Hyjal' }], answer: 0, why: { fr: 'Confrérie du Thorium et Kirin Tor en FR, Argent Dawn en EU.' } },
        { id: 'mmh3', q: { fr: 'Dans FFXIV, qu’est-ce que la « relic weapon » ?' }, choices: [{ fr: 'Une arme légendaire à améliorer sur plusieurs patchs' }, { fr: 'Une arme du shop' }, { fr: 'Une arme de débutant' }, { fr: 'Une monture' }], answer: 0, why: { fr: 'Relique : quête longue, évolution visuelle et stats, chaque extension.' } },
        { id: 'mmh4', q: { fr: 'Quel est le nom du premier MMO graphique (1997) ?' }, choices: [{ fr: 'Ultima Online' }, { fr: 'EverQuest' }, { fr: 'WoW' }, { fr: 'Lineage' }], answer: 0, why: { fr: 'Ultima Online (1997) précède EverQuest (1999).' } },
        { id: 'mmh5', q: { fr: 'Quel est le nom de l’extension WoW qui introduit les Chevaliers de la mort ?' }, choices: [{ fr: 'Wrath of the Lich King' }, { fr: 'The Burning Crusade' }, { fr: 'Cataclysm' }, { fr: 'Legion' }], answer: 0, why: { fr: 'WotLK (2008) : Arthas et les DK, classe héroïque.' } },
        { id: 'mmh6', q: { fr: 'Dans EVE Online, combien de systèmes solaires ?' }, choices: [{ fr: 'Plus de 7000' }, { fr: '100' }, { fr: '500' }, { fr: '1000' }], answer: 0, why: { fr: '~8000 systèmes, dont 2500 en wormholes.' } },
        { id: 'mmh7', q: { fr: 'Quel est le nom du raid final de FFXIV Endwalker ?' }, choices: [{ fr: 'Pandaemonium' }, { fr: 'Omega' }, { fr: 'Eden' }, { fr: 'Alexander' }], answer: 0, why: { fr: 'Pandaemonium, raid de fin de l’arc Hydaelyn/Zodiark.' } },
        { id: 'mmh8', q: { fr: 'Quel MMO a été fermé après 14 ans puis relancé par des fans ?' }, choices: [{ fr: 'City of Heroes' }, { fr: 'WildStar' }, { fr: 'Warhammer Online' }, { fr: 'Tous' }], answer: 0, why: { fr: 'City of Heroes (2004-2012) relancé en serveur privé Homecoming.' } },
      ],
    },
  },
];

/** Les questions d’un niveau, avec repli sur le niveau Facile (jamais vide). */
export function quizLevelQuestions(quiz, level = 'easy') {
  const levels = quiz && quiz.levels ? quiz.levels : {};
  return levels[level] || levels.easy || [];
}

/** Alias historique : la banque de questions d’un niveau (`quizLevelQuestions`). */
export function quizQuestions(quiz, level = 'easy') {
  return quizLevelQuestions(quiz, level);
}

/** Nombre de questions d’un quizz, tous niveaux confondus (page de garde). */
export function quizQuestionsCount(quiz) {
  return QUIZ_LEVELS.reduce((total, level) => total + quizLevelQuestions(quiz, level).length, 0);
}

/** Retrouvez un quizz par son slug (null si inconnu). */
export function quizBySlug(slug) {
  return quizzes.find((quiz) => quiz.slug === slug) || null;
}
