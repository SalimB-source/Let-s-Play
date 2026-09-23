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
 * Une seule fabrique pour les huit illustrations — la vérification
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

export const QUIZ_TAGS = ['Culture', 'Rétro', 'Souls-like', 'RPG', 'E-sport', 'Studios', 'Tech', 'Cinéma'];

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
    source: '/events/ooredoo',
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
