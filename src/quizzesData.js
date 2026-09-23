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
 * `image` est la miniature du quizz : une illustration maison livrée dans
 * `public/quizzes/<slug>.jpg` (16/9, produite par `quizThumbUrl`). `videoId`
 * reste l'épisode lié au sujet — il sert de repli si l'illustration manque
 * (`QuizThumb` via `src/lib/videoThumbnails.js`), comme il servait de
 * miniature avant. `source` renvoie vers l'article maison qui approfondit le
 * sujet du quizz.
 *
 * Difficulté : `difficulty` reste la difficulté « maison » du quizz (celle
 * affichée sur la grille), et `questions` sa banque de questions par défaut.
 * Chaque quizz porte en plus `questionVariants`, les banques des AUTRES
 * niveaux de difficulté : le lecteur propose les trois paliers
 * (`QUIZ_DIFFICULTIES`), qui changent les questions et rapportent des points
 * multipliés par difficulté (voir `DIFFICULTY_MULTIPLIER` dans
 * `src/quizzes/engine.js`). Une difficulté est « terminée » une fois : la
 * rejouer ne rapporte plus de points (ni XP, ni record, ni classement) —
 * chaque difficulté, elle, rapporte les siens, une seule fois.
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

/** Les trois paliers de difficulté jouables sur chaque quizz. */
export const QUIZ_DIFFICULTIES = ['easy', 'medium', 'hard'];

/**
 * Banque de questions d'un quizz pour une difficulté : la banque par défaut
 * (`questions`) quand c'est celle du quizz ou qu'aucune variante n'est
 * fournie. C'est elle que `prepareQuiz` (via `QuizPlayer`) mélange pour la
 * partie — les trois niveaux jouent donc de VRAIES questions différentes.
 */
export function quizQuestions(quiz, difficulty) {
  if (!quiz) return [];
  if (!difficulty || difficulty === quiz.difficulty) return quiz.questions || [];
  return (quiz.questionVariants && quiz.questionVariants[difficulty]) || quiz.questions || [];
}

export const QUIZ_TAGS = ['Culture', 'Rétro', 'Souls-like', 'RPG', 'E-sport', 'Studios', 'Tech', 'Cinéma'];

export const quizzes = [
  {
    slug: 'culture-gaming',
    route: '/quizz/culture-gaming',
    videoId: 't1Re8ki_gsw',
    image: quizThumbUrl('culture-gaming'),
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
    questionVariants: {
      medium: [
        { id: 'cgm1', q: { fr: 'Que signifie le sigle « DLC » ?' }, choices: [{ fr: 'Downloadable Content' }, { fr: 'Digital Launch Code' }, { fr: 'Dynamic Level Crafting' }, { fr: 'Direct Link Connection' }], answer: 0, why: { fr: 'DLC = Downloadable Content : les contenus additionnels téléchargeables après la sortie.' } },
        { id: 'cgm2', q: { fr: 'Quel géant a racheté la franchise Minecraft en 2014 ?' }, choices: [{ fr: 'Sony' }, { fr: 'Microsoft' }, { fr: 'Google' }, { fr: 'Apple' }], answer: 1, why: { fr: 'Microsoft a payé Mojang 2,5 milliards de dollars : Minecraft reste sa pépite soft.' } },
        { id: 'cgm3', q: { fr: 'Comment s’appelle le cheval de Link dans Ocarina of Time ?' }, choices: [{ fr: 'Midona' }, { fr: 'Talon' }, { fr: 'Epona' }, { fr: 'Malon' }], answer: 2, why: { fr: 'Epona ; Midona est la chanteuse, Talon le cheval de The Wind Waker.' } },
        { id: 'cgm4', q: { fr: 'En quelle année Super Mario Bros. est-il sorti sur NES ?' }, choices: [{ fr: '1983' }, { fr: '1985' }, { fr: '1987' }, { fr: '1989' }], answer: 1, why: { fr: 'Super Mario Bros. (septembre 1985 au Japon) a fait le triomphe de la NES en Europe.' } },
        { id: 'cgm5', q: { fr: 'Que signifie « AFK » en jeu ?' }, choices: [{ fr: 'All Friends Killed' }, { fr: 'Advanced Fire Kill' }, { fr: 'Away From Keyboard' }, { fr: 'Another Final Kill' }], answer: 2, why: { fr: 'Away From Keyboard : le joueur est parti, son personnage reste.' } },
        { id: 'cgm6', q: { fr: 'Que mange Pac-Man pour marquer des points ?' }, choices: [{ fr: 'Des fruits' }, { fr: 'Des pastilles' }, { fr: 'Des fantômes' }, { fr: 'Des puces' }], answer: 1, why: { fr: 'Les pastilles rapportent les points ; les fruits (et l’arcade !) ne sont que des bonus.' } },
        { id: 'cgm7', q: { fr: 'Dans Among Us, quel vaisseau accueille la majorité des parties ?' }, choices: [{ fr: 'The Airship' }, { fr: 'Polus' }, { fr: 'Fungle' }, { fr: 'The Skeld' }], answer: 3, why: { fr: 'The Skeld est la carte emblématique ; The Airship, Polus et Fungle l’ont rejointe plus tard.' } },
        { id: 'cgm8', q: { fr: 'Que signifie « NPC » ?' }, choices: [{ fr: 'New Power Console' }, { fr: 'Non-Player Character' }, { fr: 'Next Program Cycle' }, { fr: 'Non-Public Content' }], answer: 1, why: { fr: 'Non-Player Character : un personnage contrôlé par le jeu, pas par un joueur.' } },
      ],
      hard: [
        { id: 'cgh1', q: { fr: 'En quelle année Tetris est-il sorti pour la première fois, en URSS ?' }, choices: [{ fr: '1982' }, { fr: '1984' }, { fr: '1986' }, { fr: '1989' }], answer: 1, why: { fr: 'Alexeï Pajitnov présente Tetris en 1984 sur l’ordinateur Electronika 60, à Moscou.' } },
        { id: 'cgh2', q: { fr: 'Quel moteur propulse The Elder Scrolls V: Skyrim ?' }, choices: [{ fr: 'CryEngine' }, { fr: 'Gamebryo' }, { fr: 'Unreal Engine' }, { fr: 'Source' }], answer: 1, why: { fr: 'Skyrim roule sur Gamebryo (le moteur dérivé de l’id Tech 4, devenu « Creation Engine »).' } },
        { id: 'cgh3', q: { fr: 'Qui a composé la musique de Super Mario Bros. (1985) ?' }, choices: [{ fr: 'Hirokazu Tanaka' }, { fr: 'Hajime Mizoguchi' }, { fr: 'Koji Kondo' }, { fr: 'Yoko Shimomura' }], answer: 2, why: { fr: 'Koji Kondo (Nintendo) ; Tanaka signe Sonic, Mizoguchi Zelda, Shimomura Kingdom Hearts.' } },
        { id: 'cgh4', q: { fr: 'Qui est le grand antagoniste de la série Mega Man X ?' }, choices: [{ fr: 'Dr. Wily' }, { fr: 'Zero' }, { fr: 'Sigma' }, { fr: 'Alia' }], answer: 2, why: { fr: 'Sigma, un modèle X corrompu par le virus ; le Dr. Wily reste le vilain de la série classique.' } },
        { id: 'cgh5', q: { fr: 'Comment s’appelle l’épée légendaire d’Ocarina of Time ?' }, choices: [{ fr: 'Sword of Saria' }, { fr: 'Master Sword' }, { fr: 'Sword of Galateria' }, { fr: 'Blade of the Goddess' }], answer: 1, why: { fr: 'La Master Sword ; la Sword of Galateria est celle du tout premier Zelda (1986).' } },
        { id: 'cgh6', q: { fr: 'En quelle année World of Warcraft a-t-il été lancé ?' }, choices: [{ fr: '2001' }, { fr: '2003' }, { fr: '2004' }, { fr: '2006' }], answer: 2, why: { fr: 'World of Warcraft (Blizzard) sort en novembre 2004 et porte le MMORPG au grand public.' } },
        { id: 'cgh7', q: { fr: 'Quel studio a créé le moteur GoldSrc, utilisé par Half-Life ?' }, choices: [{ fr: 'id Software' }, { fr: '3D Realms' }, { fr: 'Valve' }, { fr: 'Epic Games' }], answer: 2, why: { fr: 'GoldSrc est une branche de l’id Tech 1, développée par Valve pour Half-Life (1998).' } },
        { id: 'cgh8', q: { fr: 'Quelle est la première extension de World of Warcraft, sortie en 2007 ?' }, choices: [{ fr: 'Wrath of the Lich King' }, { fr: 'Mists of Pandaria' }, { fr: 'The Burning Crusade' }, { fr: 'Legion' }], answer: 2, why: { fr: 'The Burning Crusade (2007) ouvre la porte des Trolls et d’Outland, avant WotLK (2008).' } },
      ],
    },
  },
  {
    slug: 'consoles-retro',
    route: '/quizz/consoles-retro',
    videoId: 'A2VPhWOUMHI',
    image: quizThumbUrl('consoles-retro'),
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
    questionVariants: {
      easy: [
        { id: 'cre1', q: { fr: 'De quelle console Sonic (1991) était-il la mascotte ?' }, choices: [{ fr: 'La Mega Drive' }, { fr: 'La Super Famicom' }, { fr: 'La Saturn' }, { fr: 'La Neo Geo' }], answer: 0, why: { fr: 'Sonic a été créé pour porter la Mega Drive de Sega face à la NES de Nintendo.' } },
        { id: 'cre2', q: { fr: 'Quelle petite console monochrome a fait le triomphe de Pokémon dans les années 90 ?' }, choices: [{ fr: 'La Game Boy' }, { fr: 'La Game Gear' }, { fr: 'La Lynx' }, { fr: 'La TurboExpress' }], answer: 0, why: { fr: 'Pokémon (1996) a explosé sur Game Boy ; la Game Gear était sa rivale couleur de Sega.' } },
        { id: 'cre3', q: { fr: 'Quel petit accessoire à détection de mouvements équipe la Wii ?' }, choices: [{ fr: 'Le Nunchuk' }, { fr: 'Le GamePad' }, { fr: 'La Wii Remote' }, { fr: 'Le Classic Controller' }], answer: 2, why: { fr: 'La « Wiimote », la télécommande qui a élargi le public du jeu vidéo.' } },
        { id: 'cre4', q: { fr: 'Quelle console a rendu célèbre Halo en 2001 ?' }, choices: [{ fr: 'La PS2' }, { fr: 'La GameCube' }, { fr: 'La Xbox' }, { fr: 'La Dreamcast' }], answer: 2, why: { fr: 'Halo: Combat Evolved accompagne le lancement de la Xbox — et a aidé à sa réussite.' } },
        { id: 'cre5', q: { fr: 'Quelle entreprise a fabriqué la Mega Drive et la Saturn ?' }, choices: [{ fr: 'Sony' }, { fr: 'Panasonic' }, { fr: 'Atari' }, { fr: 'Sega' }], answer: 3, why: { fr: 'Sega, de la Mega Drive (1988) à la Saturn (1994) — avant la Dreamcast.' } },
        { id: 'cre6', q: { fr: 'Quelle console Nintendo, sortie en 2001, a porté Zelda : The Wind Waker ?' }, choices: [{ fr: 'La N64' }, { fr: 'La GameCube' }, { fr: 'La DS' }, { fr: 'La Wii' }], answer: 1, why: { fr: 'La GameCube (2001 au Japon) ; The Wind Waker y est sorti en 2002.' } },
        { id: 'cre7', q: { fr: 'Quel support la PS2 lisait, contrairement à la première PlayStation ?' }, choices: [{ fr: 'Le Blu-ray' }, { fr: 'Le CD-ROM' }, { fr: 'La cartouche' }, { fr: 'Le DVD' }], answer: 3, why: { fr: 'La PS2 est la première console à lire le DVD — un argument massue à l’époque.' } },
        { id: 'cre8', q: { fr: 'Quelle manette à double vibration équipe les PlayStation depuis 1997 ?' }, choices: [{ fr: 'Le Sixaxis' }, { fr: 'Le Pro Controller' }, { fr: 'Les Joy-Con' }, { fr: 'Le DualShock' }], answer: 3, why: { fr: 'Le DualShock, héritier du contrôleur PS1 ; le Sixaxis (PS3) n’avait plus de vibration.' } },
      ],
      hard: [
        { id: 'crh1', q: { fr: 'En quelle année la première PlayStation est-elle sortie en Europe ?' }, choices: [{ fr: '1994' }, { fr: '1995' }, { fr: '1996' }, { fr: '1997' }], answer: 1, why: { fr: 'Décembre 1994 au Japon, septembre aux États-Unis, mars 1995 en Europe.' } },
        { id: 'crh2', q: { fr: 'Quel processeur 16 bits équipe la Mega Drive ?' }, choices: [{ fr: 'Le Z80' }, { fr: 'Le SuperFX' }, { fr: 'Le Motorola 68000' }, { fr: 'Le NEC V800' }], answer: 2, why: { fr: 'Un Motorola 68000 ; le Z80 est à la NES, le SuperFX à la Super Famicom.' } },
        { id: 'crh3', q: { fr: 'Quel accessoire optionnel de la Nintendo 64 ajoutait la vibration ?' }, choices: [{ fr: 'Le Controller Pak' }, { fr: 'Le Rumble Pak' }, { fr: 'L’Expansion Pak' }, { fr: 'Le Game Boy Player' }], answer: 1, why: { fr: 'Le Rumble Pak se branchait sur la manette N64 — la vibration avant l’heure.' } },
        { id: 'crh4', q: { fr: 'Combien de mégaoctets contenait la Memory Card d’origine de la PS1 ?' }, choices: [{ fr: '1 Mo' }, { fr: '2 Mo' }, { fr: '8 Mo' }, { fr: '16 Mo' }], answer: 2, why: { fr: '8 Mo, soit 16 blocs de 512 Ko — l’origine des « 2 blocs » qui partent en fumée.' } },
        { id: 'crh5', q: { fr: 'Quelle console a popularisé le double stick analogique en Occident ?' }, choices: [{ fr: 'La Dreamcast' }, { fr: 'La Xbox' }, { fr: 'La PS2' }, { fr: 'La GameCube' }], answer: 1, why: { fr: 'La manette Xbox (2001) a imposé ses deux sticks ; la PS2 gardait ses croix.' } },
        { id: 'crh6', q: { fr: 'Les « Visual Memory Units » (VMU) équipaient quelle console ?' }, choices: [{ fr: 'La PS2' }, { fr: 'La Xbox' }, { fr: 'La N64' }, { fr: 'La Dreamcast' }], answer: 3, why: { fr: 'Les VMU, disquettes à petit écran, étaient la mémoire de la Dreamcast.' } },
        { id: 'crh7', q: { fr: 'En quelle année Sega a-t-elle définitivement quitté le marché du matériel ?' }, choices: [{ fr: '1998' }, { fr: '2000' }, { fr: '2001' }, { fr: '2003' }], answer: 2, why: { fr: 'La Dreamcast est arrêtée en mars 2001 : Sega ne fabrique plus de consoles depuis.' } },
        { id: 'crh8', q: { fr: 'Quel module intégré permettait de jouer en ligne sur la Dreamcast ?' }, choices: [{ fr: 'Le Wi-Fi' }, { fr: 'L’Ethernet' }, { fr: 'Le Bluetooth' }, { fr: 'Un modem 56 k' }], answer: 3, why: { fr: 'Dès 1998, la Dreamcast embarquait un modem 56 k — en avant sur le multijoueur réseau.' } },
      ],
    },
  },
  {
    slug: 'souls-fromsoftware',
    route: '/quizz/souls-fromsoftware',
    videoId: 'OH51fSHznwg',
    image: quizThumbUrl('souls-fromsoftware'),
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
    questionVariants: {
      easy: [
        { id: 'sfe1', q: { fr: 'Comment s’appelle le monde exploré dans Elden Ring ?' }, choices: [{ fr: 'Lordran' }, { fr: 'L’Entre-Terre' }, { fr: 'Yharnam' }, { fr: 'Boletaria' }], answer: 1, why: { fr: 'The Lands Between, « l’Entre-Terre » ; Lordran et Boletaria viennent de Dark/Demon’s Souls.' } },
        { id: 'sfe2', q: { fr: 'Quel jeu de 2011 a donné son nom au genre « Souls » ?' }, choices: [{ fr: 'Demon’s Souls' }, { fr: 'Sekiro' }, { fr: 'Bloodborne' }, { fr: 'Dark Souls' }], answer: 3, why: { fr: 'Dark Souls (2011) ; Demon’s Souls (2009) est l’ancêtre qui a posé les bases.' } },
        { id: 'sfe3', q: { fr: 'Qui est le directeur d’Elden Ring ?' }, choices: [{ fr: 'Hideo Kojima' }, { fr: 'Shigeru Miyamoto' }, { fr: 'Hidetaka Miyazaki' }, { fr: 'Yoko Taro' }], answer: 2, why: { fr: 'Hidetaka Miyazaki, le président de FromSoftware, signe toute la lignée.' } },
        { id: 'sfe4', q: { fr: 'Dans Dark Souls, que perdez-vous quand vous mourez ?' }, choices: [{ fr: 'Vos âmes' }, { fr: 'Votre équipement' }, { fr: 'La moitié de vos âmes' }, { fr: 'Rien' }], answer: 0, why: { fr: 'Toutes vos âmes tombent au sol — à récupérer une seule fois avant votre prochaine chute.' } },
        { id: 'sfe5', q: { fr: 'Quel jeu de 2009 est considéré comme le premier « Souls » ?' }, choices: [{ fr: 'King’s Field' }, { fr: 'Demon’s Souls' }, { fr: 'Dark Souls' }, { fr: 'Armored Core' }], answer: 1, why: { fr: 'Demon’s Souls (PS3, 2009), d’après le roman de George R. R. Martin.' } },
        { id: 'sfe6', q: { fr: 'Quelle cité vitriolée et victorienne est le cœur de Bloodborne ?' }, choices: [{ fr: 'Cainhurst' }, { fr: 'Le Rêve du Chasseur' }, { fr: 'Yharnam' }, { fr: 'Hornburg' }], answer: 2, why: { fr: 'Yharnam ; Cainhurst et le Rêve du Chasseur sont des lieux secondaires du même jeu.' } },
        { id: 'sfe7', q: { fr: 'Quel studio japonais développe toute la lignée des Souls ?' }, choices: [{ fr: 'Team Ninja' }, { fr: 'PlatinumGames' }, { fr: 'FromSoftware' }, { fr: 'Capcom' }], answer: 2, why: { fr: 'FromSoftware, à Yokohama — Demon’s Souls à Armored Core en passant par Elden Ring.' } },
        { id: 'sfe8', q: { fr: 'Quel personnage incarnez-vous dans Sekiro: Shadows Die Twice ?' }, choices: [{ fr: 'Le Loup' }, { fr: 'Le Sans-nom' }, { fr: 'Le Chasseur' }, { fr: 'Le Téméraire' }], answer: 0, why: { fr: 'Le Loup ; le Sans-nom est celui de Dark Souls, le Chasseur celui de Bloodborne.' } },
      ],
      medium: [
        { id: 'sfm1', q: { fr: 'En quelle année Demon’s Souls est-il sorti sur PS3 ?' }, choices: [{ fr: '2008' }, { fr: '2009' }, { fr: '2010' }, { fr: '2011' }], answer: 1, why: { fr: 'Février 2009 au Japon : la machine à souffrance était lancée.' } },
        { id: 'sfm2', q: { fr: 'Comment s’appelle le sanctuaire central de Dark Souls ?' }, choices: [{ fr: 'Anor Londo' }, { fr: 'La forteresse de Sen' }, { fr: 'Firelink' }, { fr: 'Lordran' }], answer: 2, why: { fr: 'Le Sanctuaire de Firelink, camp de base entre chaque tentative.' } },
        { id: 'sfm3', q: { fr: 'Quel seigneur de l’Entre-Terre règne sur le Limgrave ?' }, choices: [{ fr: 'Radahn' }, { fr: 'Morgott' }, { fr: 'Rennala' }, { fr: 'Godrick le Greffé' }], answer: 3, why: { fr: 'Godrick the Grafted, premier grand seigneur d’Elden Ring — et premier boss de la région.' } },
        { id: 'sfm4', q: { fr: 'Quelle mécanique est au cœur de l’évasion dans Sekiro ?' }, choices: [{ fr: 'La roulade' }, { fr: 'Le parry' }, { fr: 'Le dash' }, { fr: 'Le blocage' }], answer: 1, why: { fr: 'Sekiro supprime la roulade : c’est la déflection (parry) qui « fait tout ».' } },
        { id: 'sfm5', q: { fr: 'En quelle année Bloodborne est-il sorti ?' }, choices: [{ fr: '2013' }, { fr: '2014' }, { fr: '2015' }, { fr: '2016' }], answer: 2, why: { fr: 'Mars 2015 sur PS3/PS4, exclusivité Sony de l’époque.' } },
        { id: 'sfm6', q: { fr: 'Quel objet soigne le personnage dans Dark Souls ?' }, choices: [{ fr: 'Le flacon Estus' }, { fr: 'La potion d’herbe' }, { fr: 'Le sang de dragon' }, { fr: 'La cendre' }], answer: 0, why: { fr: 'Le flacon Estus, rechargé aux fonts de flammes — le cœur du système.' } },
        { id: 'sfm7', q: { fr: 'Qui a co-écrit l’histoire d’Elden Ring avec FromSoftware ?' }, choices: [{ fr: 'Neil Druckmann' }, { fr: 'George R. R. Martin' }, { fr: 'Akira Toriyama' }, { fr: 'Hideo Kojima' }], answer: 1, why: { fr: 'George R. R. Martin, le roi de la Trône de fer, a signé le lore d’Elden Ring.' } },
        { id: 'sfm8', q: { fr: 'Quel jeu FromSoftware de 2018 met en scène un samurai à un bras ?' }, choices: [{ fr: 'Nioh' }, { fr: 'Ys VIII' }, { fr: 'Dragon’s Dogma II' }, { fr: 'Sekiro: Shadows Die Twice' }], answer: 3, why: { fr: 'Sekiro ; Nioh (souvent confondu) est signé Team Ninja, pas FromSoftware.' } },
      ],
    },
  },
  {
    slug: 'rpg-legends',
    route: '/quizz/rpg-legends',
    videoId: '0ThNyFItASM',
    image: quizThumbUrl('rpg-legends'),
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
    questionVariants: {
      easy: [
        { id: 'rle1', q: { fr: 'Quel est le héros que l’on contrôle dans The Legend of Zelda ?' }, choices: [{ fr: 'Zelda' }, { fr: 'Ganon' }, { fr: 'Impa' }, { fr: 'Link' }], answer: 3, why: { fr: 'Zelda est la princesse, Impa la gardienne : c’est Link qu’on dirige.' } },
        { id: 'rle2', q: { fr: 'Quel studio a développé Skyrim ?' }, choices: [{ fr: 'CD Projekt Red' }, { fr: 'Ubisoft' }, { fr: 'EA' }, { fr: 'Bethesda Game Studios' }], answer: 3, why: { fr: 'Bethesda Game Studios (2011) — encore joué partout quinze ans après.' } },
        { id: 'rle3', q: { fr: 'Qui est le « Loup blanc » de The Witcher ?' }, choices: [{ fr: 'Jaskier' }, { fr: 'Ciri' }, { fr: 'Vesemir' }, { fr: 'Geralt de Riv' }], answer: 3, why: { fr: 'Geralt de Riv, le sorcisseur ; Jaskier est son bard et Ciri sa fille d’adoption.' } },
        { id: 'rle4', q: { fr: 'Quelle série, lancée en 1987, a défini le JRPG ?' }, choices: [{ fr: 'Dragon Quest' }, { fr: 'Final Fantasy' }, { fr: 'Persona' }, { fr: 'Tales of' }], answer: 1, why: { fr: 'Final Fantasy (Square, 1987) ; Dragon Quest (1986) est son autre pilier.' } },
        { id: 'rle5', q: { fr: 'Dans quelle ville se déroule Persona 5 ?' }, choices: [{ fr: 'Osaka' }, { fr: 'Tokyo' }, { fr: 'Kyoto' }, { fr: 'Yokohama' }], answer: 1, why: { fr: 'Les Voleurs fantômes arpentent Tokyo, de Shibuya à leurs planques café.' } },
        { id: 'rle6', q: { fr: 'Quel RPG se déroule à Night City ?' }, choices: [{ fr: 'Starfield' }, { fr: 'GTA V' }, { fr: 'Cyberpunk 2077' }, { fr: 'Star Wars Outlaws' }], answer: 2, why: { fr: 'Cyberpunk 2077, la mégalopole de CD Projekt Red — et de la série Netflix.' } },
        { id: 'rle7', q: { fr: 'Comment appelle-t-on l’Enfant de dragon dans Skyrim ?' }, choices: [{ fr: 'Thane' }, { fr: 'Alduin' }, { fr: 'Dovahkiin' }, { fr: 'Prêtre du Dragon' }], answer: 2, why: { fr: 'Dovahkiin : le titre du joueur, absorbant les âmes des dragons et parlant le Thu’um.' } },
        { id: 'rle8', q: { fr: 'Quel Zelda de 2017 a cassé la formule en monde ouvert total ?' }, choices: [{ fr: 'Tears of the Kingdom' }, { fr: 'Twilight Princess' }, { fr: 'Skyward Sword' }, { fr: 'Breath of the Wild' }], answer: 3, why: { fr: 'Breath of the Wild (2017) ; Tears of the Kingdom est sa suite (2023).' } },
      ],
      hard: [
        { id: 'rlh1', q: { fr: 'En quelle année le premier Final Fantasy est-il sorti ?' }, choices: [{ fr: '1985' }, { fr: '1987' }, { fr: '1989' }, { fr: '1991' }], answer: 1, why: { fr: 'Décembre 1987 sur Famicom, par Square — l’année même du premier Super Mario Bros. en Europe.' } },
        { id: 'rlh2', q: { fr: 'Quel est le boss final du scénario canonique de Skyrim ?' }, choices: [{ fr: 'Miraak' }, { fr: 'Hermaeus Mora' }, { fr: 'Durnahviir' }, { fr: 'Alduin' }], answer: 3, why: { fr: 'Alduin, le monde-serpent ; Miraak n’apparaît que dans le DLC Dragonborn.' } },
        { id: 'rlh3', q: { fr: 'Quel roman (1993) ouvre la saga « Le Sorceleur » de Sapkowski ?' }, choices: [{ fr: 'L’Épée de la destinée' }, { fr: 'Le Dernier Souhait' }, { fr: 'La Tour de l’Haut-Œil' }, { fr: 'Le Sang des élues' }], answer: 1, why: { fr: '« Le Dernier Souhait » (1993) est le premier ROMAN ; L’Épée de la destinée (1992) est une collection de nouvelles.' } },
        { id: 'rlh4', q: { fr: 'En quelle année le premier Dragon Quest est-il sorti au Japon ?' }, choices: [{ fr: '1984' }, { fr: '1986' }, { fr: '1988' }, { fr: '1990' }], answer: 1, why: { fr: 'Mai 1986 sur Famicom, signé Yuji Horii — le père du JRPG japonais.' } },
        { id: 'rlh5', q: { fr: 'Qui est le protagoniste de Final Fantasy VII ?' }, choices: [{ fr: 'Squall' }, { fr: 'Zidane' }, { fr: 'Noctis' }, { fr: 'Cloud Strife' }], answer: 3, why: { fr: 'Cloud Strife, mercenaire aux cheveux argentés ; Squall (VIII), Zidane (IX), Noctis (XV) sont ceux des suites.' } },
        { id: 'rlh6', q: { fr: 'Dans quel bourg étudiant se déroule Persona 4 ?' }, choices: [{ fr: 'Tokyo' }, { fr: 'Inaba' }, { fr: 'Mitakihara' }, { fr: 'Shibuya' }], answer: 1, why: { fr: 'Inaba, le village de la TV ; Mitakihara est l’académie fictive de Persona 3.' } },
        { id: 'rlh7', q: { fr: 'Quel ancien soldat de classe 1 est devenu l’ennemi final de Final Fantasy VII ?' }, choices: [{ fr: 'Jenova' }, { fr: 'Kefka' }, { fr: 'Sephiroth' }, { fr: 'Gilgamesh' }], answer: 2, why: { fr: 'Sephiroth, l’ancien SOLDAT 1 ; Jenova n’est qu’un spécimen, Kefka est celui de FFVI.' } },
        { id: 'rlh8', q: { fr: 'En quelle année le premier The Legend of Zelda est-il sorti sur Famicom ?' }, choices: [{ fr: '1984' }, { fr: '1986' }, { fr: '1987' }, { fr: '1989' }], answer: 1, why: { fr: 'Février 1986, dix mois après la NES en Occident — Link a 40 ans.' } },
      ],
    },
  },
  {
    slug: 'esport-competition',
    route: '/quizz/esport-competition',
    videoId: 'twbaM8fiXpo',
    image: quizThumbUrl('esport-competition'),
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
    questionVariants: {
      easy: [
        { id: 'ece1', q: { fr: 'Dans Rocket League, combien de joueurs par équipe en format standard ?' }, choices: [{ fr: '2' }, { fr: '3' }, { fr: '5' }, { fr: '11' }], answer: 1, why: { fr: 'Le format compétitif standard est le 3 contre 3.' } },
        { id: 'ece2', q: { fr: 'Scorpion et Sub-Zero s’affrontent dans quelle série de combat ?' }, choices: [{ fr: 'Street Fighter' }, { fr: 'Mortal Kombat' }, { fr: 'Tekken' }, { fr: 'Soulcalibur' }], answer: 1, why: { fr: 'Mortal Kombat (NetherRealm) ; Scorpion est « Get over here ! ».' } },
        { id: 'ece3', q: { fr: 'Quel battle royale mobile est édité par Garena ?' }, choices: [{ fr: 'PUBG Mobile' }, { fr: 'Fortnite' }, { fr: 'Free Fire' }, { fr: 'Apex Mobile' }], answer: 2, why: { fr: 'Free Fire, la star mobile qui a rempli les championnats FFAC en Algérie.' } },
        { id: 'ece4', q: { fr: 'Dans League of Legends, qu’est-ce qu’il faut détruire pour gagner ?' }, choices: [{ fr: 'Le Baron' }, { fr: 'L’inhibiteur' }, { fr: 'Le trône' }, { fr: 'Le Nexus' }], answer: 3, why: { fr: 'Le Nexus, le cœur de la base adverse : sa chute termine la partie.' } },
        { id: 'ece5', q: { fr: 'Quel FPS tactique est né d’un mod de Half-Life ?' }, choices: [{ fr: 'Team Fortress' }, { fr: 'Counter-Strike' }, { fr: 'Day of Defeat' }, { fr: 'Garry’s Mod' }], answer: 1, why: { fr: 'Counter-Strike, mod communautaire devenu franchise majeure de l’e-sport.' } },
        { id: 'ece6', q: { fr: 'Quel sport est l’ancêtre de Rocket League ?' }, choices: [{ fr: 'Le hockey sur glace' }, { fr: 'Le rugby' }, { fr: 'Le football' }, { fr: 'Le basket' }], answer: 2, why: { fr: 'Du football — mais joué en voitures boostées.' } },
        { id: 'ece7', q: { fr: 'Quel titre de Riot Games est une « arena » 5v5 d’agents ?' }, choices: [{ fr: 'Teamfight Tactics' }, { fr: 'Wild Rift' }, { fr: 'League of Legends' }, { fr: 'Valorant' }], answer: 3, why: { fr: 'Valorant, le tactical shooter 5v5 qui a rejoint la famille LoL.' } },
        { id: 'ece8', q: { fr: 'De quelle série « EA Sports FC » est-il devenu le nom en 2023 ?' }, choices: [{ fr: 'PES' }, { fr: 'eFootball' }, { fr: 'Football Manager' }, { fr: 'FIFA' }], answer: 3, why: { fr: 'Après trente ans de partenariat, EA a quitté la licence FIFA et renommé sa série.' } },
      ],
      hard: [
        { id: 'ech1', q: { fr: 'En quelle année Counter-Strike est-il sorti pour la première fois, en tant que mod ?' }, choices: [{ fr: '1997' }, { fr: '1999' }, { fr: '2000' }, { fr: '2001' }], answer: 1, why: { fr: 'Novembre 1999, un an après Half-Life ; la licence devient officielle en 2000.' } },
        { id: 'ech2', q: { fr: 'Quelle équipe a remporté le tout premier championnat du monde de League of Legends (2011) ?' }, choices: [{ fr: 'Fnatic' }, { fr: 'Cloud9' }, { fr: 'T1' }, { fr: 'Team SoloMid' }], answer: 3, why: { fr: 'TSM (Amérique du Nord) a décroché le premier Worlds, à Copenhague.' } },
        { id: 'ech3', q: { fr: 'En quelle année s’est tenu le premier « The International » de Dota 2 ?' }, choices: [{ fr: '2010' }, { fr: '2011' }, { fr: '2012' }, { fr: '2013' }], answer: 1, why: { fr: 'En 2011, sur la Sunshine Coast en Australie — l’ère des purses records est lancée.' } },
        { id: 'ech4', q: { fr: 'Quelle équipe a remporté le premier Major officiel de CS:GO (2013) ?' }, choices: [{ fr: 'Natus Vincere' }, { fr: 'Fnatic' }, { fr: 'Team Liquid' }, { fr: 'Cloud9' }], answer: 0, why: { fr: 'Na’Vi, à Cologne, en battant Fnatic en finale.' } },
        { id: 'ech5', q: { fr: 'En quelle année Free Fire est-il sorti sur mobile ?' }, choices: [{ fr: '2015' }, { fr: '2017' }, { fr: '2019' }, { fr: '2021' }], answer: 1, why: { fr: 'Novembre 2017, en Asie du Sud-Est d’abord — avant de remplir les FFAC.' } },
        { id: 'ech6', q: { fr: 'Que signifie le mode « ARAM » de League of Legends ?' }, choices: [{ fr: 'Any Role Any Map' }, { fr: 'All Random All Mid' }, { fr: 'All Ranked Any Mode' }, { fr: 'Auto Random Assignment' }], answer: 1, why: { fr: 'All Random All Mid : champions tirés au sort, une seule voie, du pur chaos.' } },
        { id: 'ech7', q: { fr: 'Quel studio américain a créé Rocket League ?' }, choices: [{ fr: 'Epic Games' }, { fr: 'Riot Games' }, { fr: '343 Industries' }, { fr: 'Psyonix' }], answer: 3, why: { fr: 'Psyonix (racheté par Epic en 2019) a créé le jeu dès 2015.' } },
        { id: 'ech8', q: { fr: 'En quelle année Valorant a-t-il été lancé à l’échelle mondiale ?' }, choices: [{ fr: '2019' }, { fr: '2020' }, { fr: '2021' }, { fr: '2022' }], answer: 2, why: { fr: 'Juin 2021 pour le monde (soft launch en 2020) — et un e-sport monté à toute vitesse.' } },
      ],
    },
  },
  {
    slug: 'studios-legends',
    route: '/quizz/studios-legends',
    videoId: 'aTs0zhm6Leg',
    image: quizThumbUrl('studios-legends'),
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
    questionVariants: {
      easy: [
        { id: 'sle1', q: { fr: 'Quel studio développe GTA V et Red Dead Redemption 2 ?' }, choices: [{ fr: '2K Games' }, { fr: 'Rockstar Games' }, { fr: 'EA' }, { fr: 'Ubisoft' }], answer: 1, why: { fr: 'Rockstar Games, et Rockstar North en Écosse pour le cœur des deux open worlds.' } },
        { id: 'sle2', q: { fr: 'Quelle entreprise publie la série Assassin’s Creed ?' }, choices: [{ fr: 'EA' }, { fr: 'Ubisoft' }, { fr: 'Activision' }, { fr: 'Capcom' }], answer: 1, why: { fr: 'Assassin’s Creed est la franchise phare d’Ubisoft depuis 2007.' } },
        { id: 'sle3', q: { fr: 'Quel studio a développé Uncharted et The Last of Us ?' }, choices: [{ fr: 'Insomniac Games' }, { fr: 'Guerrilla' }, { fr: 'Naughty Dog' }, { fr: 'Santa Monica Studio' }], answer: 2, why: { fr: 'Naughty Dog, studio californien de Sony, signe les deux sagas.' } },
        { id: 'sle4', q: { fr: 'Quelle entreprise japonaise publie Resident Evil ?' }, choices: [{ fr: 'Konami' }, { fr: 'Sega' }, { fr: 'Square Enix' }, { fr: 'Capcom' }], answer: 3, why: { fr: 'Capcom, à Osaka — ainsi que Street Fighter et Monster Hunter.' } },
        { id: 'sle5', q: { fr: 'Qui est considéré comme le père de Mario ?' }, choices: [{ fr: 'Satoru Iwata' }, { fr: 'Shigeru Miyamoto' }, { fr: 'Yu Suzuki' }, { fr: 'Yoko Taro' }], answer: 1, why: { fr: 'Miyamoto crée Mario, Zelda, Donkey Kong… et reste l’âme créative de Nintendo.' } },
        { id: 'sle6', q: { fr: 'Quel studio polonais a créé The Witcher et Cyberpunk 2077 ?' }, choices: [{ fr: 'Techland' }, { fr: '11 bit studios' }, { fr: 'Bloober Team' }, { fr: 'CD Projekt Red' }], answer: 3, why: { fr: 'CD Projekt Red, basé à Varsovie, adapte Sapkowski puis invente Night City.' } },
        { id: 'sle7', q: { fr: 'Quelle entreprise a créé Sonic ?' }, choices: [{ fr: 'Nintendo' }, { fr: 'Atari' }, { fr: 'Sega' }, { fr: 'Sony' }], answer: 2, why: { fr: 'Sonic (1991) est la réponse de Sega au Mario de Nintendo.' } },
        { id: 'sle8', q: { fr: 'Quelle firme publie aujourd’hui Final Fantasy et Dragon Quest ?' }, choices: [{ fr: 'Capcom' }, { fr: 'Konami' }, { fr: 'Bandai Namco' }, { fr: 'Square Enix' }], answer: 3, why: { fr: 'La fusion Square-Enix (2003) a réuni les deux dynasties du JRPG.' } },
      ],
      medium: [
        { id: 'slm1', q: { fr: 'En quelle année Hideo Kojima a-t-il quitté Konami ?' }, choices: [{ fr: '2012' }, { fr: '2014' }, { fr: '2015' }, { fr: '2017' }], answer: 2, why: { fr: '2015, à l’issue de MGSV — pour fonder Kojima Productions la même année.' } },
        { id: 'slm2', q: { fr: 'En quelle année le premier Metal Gear est-il sorti, sur MSX ?' }, choices: [{ fr: '1985' }, { fr: '1987' }, { fr: '1989' }, { fr: '1991' }], answer: 1, why: { fr: 'Août 1987 sur MSX, chez Konami — le début de toute la saga.' } },
        { id: 'slm3', q: { fr: 'Quel studio écossais a développé GTA V ?' }, choices: [{ fr: 'Rockstar San Diego' }, { fr: 'Rockstar North' }, { fr: 'Rockstar Leeds' }, { fr: 'Rockstar Newcastle' }], answer: 1, why: { fr: 'Rockstar North, à Édimbourg — aussi responsable de Red Dead Redemption 2.' } },
        { id: 'slm4', q: { fr: 'En quelle année Naughty Dog a-t-il été fondé ?' }, choices: [{ fr: '1980' }, { fr: '1984' }, { fr: '1989' }, { fr: '1994' }], answer: 1, why: { fr: '1984, sous le nom Amusement Creations, avant de devenir Naughty Dog en 1989.' } },
        { id: 'slm5', q: { fr: 'Quel studio a développé Horizon Zero Dawn ?' }, choices: [{ fr: 'Naughty Dog' }, { fr: 'Insomniac Games' }, { fr: 'Santa Monica Studio' }, { fr: 'Guerrilla Games' }], answer: 3, why: { fr: 'Guerrilla Games (Pays-Bas), connu avant pour la série Killzone.' } },
        { id: 'slm6', q: { fr: 'Dans quel pays se trouve le siège historique d’Ubisoft ?' }, choices: [{ fr: 'La Belgique' }, { fr: 'L’Allemagne' }, { fr: 'La Suède' }, { fr: 'La France' }], answer: 3, why: { fr: 'Ubisoft est né à Paris en 1986, et reste un acteur majeur de la tech française.' } },
        { id: 'slm7', q: { fr: 'Quel studio indépendant a développé Hades ?' }, choices: [{ fr: 'Mojang' }, { fr: 'Larian Studios' }, { fr: 'Housemarque' }, { fr: 'Supergiant Games' }], answer: 3, why: { fr: 'Supergiant Games (USA) ; Larian signe Baldur’s Gate 3, Housemarque Returnal.' } },
        { id: 'slm8', q: { fr: 'En quelle année Valve a-t-il lancé Half-Life ?' }, choices: [{ fr: '1996' }, { fr: '1998' }, { fr: '2000' }, { fr: '2001' }], answer: 1, why: { fr: 'Novembre 1998 : l’FPS raconté, qui a redéfini le genre — et lancé Valve.' } },
      ],
    },
  },
  {
    slug: 'tech-hardware',
    route: '/quizz/tech-hardware',
    videoId: 'Zl6crcrPnPQ',
    image: quizThumbUrl('tech-hardware'),
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
    questionVariants: {
      easy: [
        { id: 'the1', q: { fr: 'Quelle entreprise conçoit les GPU GeForce ?' }, choices: [{ fr: 'AMD' }, { fr: 'Intel' }, { fr: 'NVIDIA' }, { fr: 'Qualcomm' }], answer: 2, why: { fr: 'NVIDIA signe la gamme GeForce ; AMD riposte avec les Radeon.' } },
        { id: 'the2', q: { fr: 'En parlant d’affichage, que mesurent les « FPS » ?' }, choices: [{ fr: 'La latence' }, { fr: 'La résolution' }, { fr: 'Les images par seconde' }, { fr: 'La température du panneau' }], answer: 2, why: { fr: 'Frames Per Second : la fluidité de l’image, à distinguer des Hz de la dalle.' } },
        { id: 'the3', q: { fr: 'Quel connecteur transporte image, données et charge en un seul câble ?' }, choices: [{ fr: 'VGA' }, { fr: 'DVI' }, { fr: 'Péritel' }, { fr: 'USB-C' }], answer: 3, why: { fr: 'L’USB-C (DisplayPort Alt Mode + Power Delivery) remplace peu à peu tout le reste.' } },
        { id: 'the4', q: { fr: 'À quoi sert la RAM d’un ordinateur ?' }, choices: [{ fr: 'À stocker les données en permanence' }, { fr: 'À refroidir la carte graphique' }, { fr: 'À servir de mémoire de travail temporaire' }, { fr: 'À accélérer le réseau' }], answer: 2, why: { fr: 'La RAM est la mémoire vive : rapide, mais vidée à l’extinction.' } },
        { id: 'the5', q: { fr: 'Le ray tracing consiste à…' }, choices: [{ fr: 'compresser les textures' }, { fr: 'simuler le trajet de la lumière' }, { fr: 'augmenter les FPS' }, { fr: 'réduire la latence réseau' }], answer: 1, why: { fr: 'On suit les rayons lumineux pour des reflets et ombres physiquement plausibles.' } },
        { id: 'the6', q: { fr: 'Quelle entreprise conçoit les GPU Radeon ?' }, choices: [{ fr: 'NVIDIA' }, { fr: 'AMD' }, { fr: 'Intel' }, { fr: 'ARM' }], answer: 1, why: { fr: 'AMD signe la gamme Radeon, rivale historique des GeForce.' } },
        { id: 'the7', q: { fr: 'En affichage, que mesurent les « Hz » ?' }, choices: [{ fr: 'La luminosité' }, { fr: 'Le taux de rafraîchissement' }, { fr: 'Le contraste' }, { fr: 'La densité de pixels' }], answer: 1, why: { fr: 'Les Hz comptent les rafraîchissements par seconde — 144 Hz = plus de fluidité.' } },
        { id: 'the8', q: { fr: 'Parmi ces stockages, lequel est le plus rapide ?' }, choices: [{ fr: 'Le disque dur (HDD)' }, { fr: 'Le SSD SATA' }, { fr: 'La clé USB' }, { fr: 'Le SSD NVMe' }], answer: 3, why: { fr: 'Le NVMe sur PCIe exploite des débits qu’aucun SATA, ni HDD, ni USB ne suit.' } },
      ],
      hard: [
        { id: 'thh1', q: { fr: 'En quelle année la spécification NVMe 1.0 a-t-elle été publiée ?' }, choices: [{ fr: '2009' }, { fr: '2011' }, { fr: '2013' }, { fr: '2015' }], answer: 1, why: { fr: 'Août 2011, par un consortium mené par Intel — le SSD a enfin un protocole taillé pour lui.' } },
        { id: 'thh2', q: { fr: 'Quelle première gamme GeForce intégrait des cœurs dédiés au ray tracing ?' }, choices: [{ fr: 'La série GTX 10' }, { fr: 'La série RTX 20' }, { fr: 'La série GTX 16' }, { fr: 'La série RTX 40' }], answer: 1, why: { fr: 'Les RTX 20 (Turing, 2018) ont inauguré les Tensor/RT cores.' } },
        { id: 'thh3', q: { fr: 'Quelle norme USB a introduit le « SuperSpeed » à 5 Gbit/s ?' }, choices: [{ fr: 'L’USB 2.0' }, { fr: 'L’USB 3.0' }, { fr: 'L’USB 3.1' }, { fr: 'L’USB 3.2 Gen 2' }], answer: 1, why: { fr: 'USB 3.0 (2008) = SuperSpeed 5 Gbit/s, le basculement vers les connecteurs plus petits.' } },
        { id: 'thh4', q: { fr: 'Quelle génération de GPU NVIDIA a introduit la « frame generation » (DLSS 3) ?' }, choices: [{ fr: 'La RTX 30 (Ampere)' }, { fr: 'La RTX 20 (Turing)' }, { fr: 'La GTX 16' }, { fr: 'La RTX 40 (Ada)' }], answer: 3, why: { fr: 'La RTX 40 (2022) a ajouté la génération d’images au DLSS, grâce au bloc Tensor.' } },
        { id: 'thh5', q: { fr: 'En quelle année le standard DDR4 a-t-il été ratifié ?' }, choices: [{ fr: '2008' }, { fr: '2010' }, { fr: '2014' }, { fr: '2016' }], answer: 2, why: { fr: 'Décembre 2014, par le JDEC — elle domine le marché depuis les années 2016.' } },
        { id: 'thh6', q: { fr: 'Quelle architecture de processeur PC est née d’une collaboration Intel-AMD ?' }, choices: [{ fr: 'ARM' }, { fr: 'x86' }, { fr: 'MIPS' }, { fr: 'RISC-V' }], answer: 1, why: { fr: 'L’8086 (1978) est signé Intel ET AMD — x86 en est la descendance directe.' } },
        { id: 'thh7', q: { fr: 'Quel débit par voie (lane) procure le PCIe 4.0 ?' }, choices: [{ fr: '8 GT/s' }, { fr: '16 GT/s' }, { fr: '32 GT/s' }, { fr: '64 GT/s' }], answer: 1, why: { fr: '16 GT/s par lane ; le PCIe 3.0 fait 8, le 5.0 fait 32.' } },
        { id: 'thh8', q: { fr: 'Quelle technologie de synchronisation écran/carte graphique est signée AMD ?' }, choices: [{ fr: 'FreeSync' }, { fr: 'G-Sync' }, { fr: 'Thunderbolt' }, { fr: 'DLSS' }], answer: 0, why: { fr: 'FreeSync (AMD, open source) contre G-Sync (NVIDIA, matériel) ; DLSS est un upscaling.' } },
      ],
    },
  },
  {
    slug: 'cinema-pop-culture',
    route: '/quizz/cinema-pop-culture',
    videoId: 'HzigJZOxz2o',
    image: quizThumbUrl('cinema-pop-culture'),
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
    questionVariants: {
      medium: [
        { id: 'cpm1', q: { fr: 'En quelle année la série « Fallout » (Prime Video) est-elle sortie ?' }, choices: [{ fr: '2022' }, { fr: '2023' }, { fr: '2024' }, { fr: '2025' }], answer: 2, why: { fr: 'Avril 2024, après The Last of Us (HBO, 2023).' } },
        { id: 'cpm2', q: { fr: 'Quel studio d’animation a produit Cyberpunk: Edgerunners ?' }, choices: [{ fr: 'MAPPA' }, { fr: 'Studio Trigger' }, { fr: 'Ufotable' }, { fr: 'Bones' }], answer: 1, why: { fr: 'Studio Trigger (Kill la Kill), avec Riot et Netflix — le style s’est vu dès le trailer.' } },
        { id: 'cpm3', q: { fr: 'Qui a réalisé le film « Ghost in the Shell » (1995) ?' }, choices: [{ fr: 'Hayao Miyazaki' }, { fr: 'Hideaki Anno' }, { fr: 'Mamoru Oshii' }, { fr: 'Satoshi Kon' }], answer: 2, why: { fr: 'Mamoru Oshii, d’après le manga de Masamune Shirow.' } },
        { id: 'cpm4', q: { fr: 'Dans quelle(s) ville(s) se déroule « Arcane » ?' }, choices: [{ fr: 'Demacia et Noxus' }, { fr: 'Piltover et Zaun' }, { fr: 'Shurima et Ionia' }, { fr: 'Freljord et Targon' }], answer: 1, why: { fr: 'La cité lumière de Piltover et sa gueule noire, Zaun.' } },
        { id: 'cpm5', q: { fr: 'Quel acteur incarne Geralt dans les trois premières saisons de « The Witcher » ?' }, choices: [{ fr: 'Liam Hemsworth' }, { fr: 'Tom Hiddleston' }, { fr: 'Henry Cavill' }, { fr: 'Chiwetel Ejiofor' }], answer: 2, why: { fr: 'Henry Cavill de 2019 à 2023 ; Liam Hemsworth a repris le rôle en saison 4.' } },
        { id: 'cpm6', q: { fr: 'Quel roman d’Ernest Cline a inspiré « Ready Player One » ?' }, choices: [{ fr: 'Armada' }, { fr: '1984' }, { fr: 'Ready Player One' }, { fr: 'Ender’s Game' }], answer: 2, why: { fr: 'Le roman (2011) s’appelle du même nom que le film (Spielberg, 2018).' } },
        { id: 'cpm7', q: { fr: 'En quelle année le film d’animation « Les Mondes de Ralph » est-il sorti ?' }, choices: [{ fr: '2010' }, { fr: '2012' }, { fr: '2014' }, { fr: '2016' }], answer: 1, why: { fr: 'Wreck-It Ralph (Disney, 2012), truffé de caméos gaming.' } },
        { id: 'cpm8', q: { fr: 'Quelle chaîne a diffusé la série « The Last of Us » ?' }, choices: [{ fr: 'Netflix' }, { fr: 'HBO' }, { fr: 'Prime Video' }, { fr: 'Disney+' }], answer: 1, why: { fr: 'HBO (2023), avant Fallout sur Prime Video (2024).' } },
      ],
      hard: [
        { id: 'cph1', q: { fr: 'En quelle année le film « Akira » est-il sorti ?' }, choices: [{ fr: '1985' }, { fr: '1988' }, { fr: '1991' }, { fr: '1995' }], answer: 1, why: { fr: '1988 (monde 1989), signé Katsuhiro Otomo — le film qui a ouvert l’anime à l’Occident.' } },
        { id: 'cph2', q: { fr: 'En quelle année la série « The Witcher » (Netflix) est-elle arrivée ?' }, choices: [{ fr: '2017' }, { fr: '2018' }, { fr: '2019' }, { fr: '2020' }], answer: 2, why: { fr: '20 décembre 2019, avec Henry Cavill en Geralt.' } },
        { id: 'cph3', q: { fr: 'Qui est l’auteur du manga « Ghost in the Shell » ?' }, choices: [{ fr: 'Katsuhiro Otomo' }, { fr: 'Masamune Shirow' }, { fr: 'Kentaro Miura' }, { fr: 'Rumiko Takahashi' }], answer: 1, why: { fr: 'Masamune Shirow (1989) ; Otomo signe Akira, Miura Berserk.' } },
        { id: 'cph4', q: { fr: 'En quelle année le jeu Cyberpunk 2077 est-il sorti ?' }, choices: [{ fr: '2019' }, { fr: '2020' }, { fr: '2021' }, { fr: '2022' }], answer: 1, why: { fr: '10 décembre 2020 (PC/PS4/Xbox One), après un report d’un an.' } },
        { id: 'cph5', q: { fr: 'Quelle compagnie a co-produit « Arcane » avec Netflix ?' }, choices: [{ fr: 'Blizzard' }, { fr: 'Square Enix' }, { fr: 'Capcom' }, { fr: 'Riot Games' }], answer: 3, why: { fr: 'Arcane est un produit Riot × Netflix — la série d’animation de League of Legends.' } },
        { id: 'cph6', q: { fr: 'En quelle année le premier Devil May Cry est-il sorti ?' }, choices: [{ fr: '1999' }, { fr: '2001' }, { fr: '2003' }, { fr: '2005' }], answer: 1, why: { fr: 'Juin 2001 sur GameCube ; la série anime Devil May Cry (2007) l’a suivi.' } },
        { id: 'cph7', q: { fr: 'Quel film de 1999 a popularisé le « bullet time » ?' }, choices: [{ fr: 'The Dark Knight' }, { fr: 'Tron' }, { fr: 'The Matrix' }, { fr: 'Speed Racer' }], answer: 2, why: { fr: 'The Matrix (Wachowski, 1999) — et son « choix du robot » a fait le tour des chats gaming.' } },
        { id: 'cph8', q: { fr: 'En quelle année « Princess Mononoké » est-il sorti au Japon ?' }, choices: [{ fr: '1995' }, { fr: '1997' }, { fr: '1999' }, { fr: '2001' }], answer: 1, why: { fr: 'Juillet 1997, chez Hayao Miyazaki et Studio Ghibli — record du box-office japonais de l’époque.' } },
      ],
    },
  },
];

/** Retrouvez un quizz par son slug (null si inconnu). */
export function quizBySlug(slug) {
  return quizzes.find((quiz) => quiz.slug === slug) || null;
}
