/**
 * Calendrier des sorties de la page Actus : données + helpers de date partagés
 * entre la grille du mois, la frise et le compte à rebours « le plus attendu ».
 *
 * Deux comportements automatiques, à connaître pour tenir la page à jour :
 *
 * 1. Le compte à rebours ne cite jamais un jeu en dur : il prend le premier de la
 *    file `awaitedRank` qui n'est pas encore disponible et bascule sur la sortie
 *    suivante dès que le décompte atteint zéro — tous mois confondus.
 * 2. La grille et la frise affichent le mois « actif » : le mois courant s'il a
 *    des sorties au calendrier, sinon le mois de la prochaine sortie annoncée.
 *
 * Faire suivre octobre = pousser des entrées avec `month: 10` (et un visuel dans
 * `public/releases/`), rien d'autre à modifier :
 *
 *   { slug: 'metroid-ravenous', month: 10, day: 28, title: 'Metroid Ravenous',
 *     platforms: 'SWITCH 2', image: 'releases/metroid-ravenous.jpg',
 *     alt: 'Metroid Ravenous — Samus dans une grotte organique', awaitedRank: 9 }
 */

export const RELEASE_YEAR = 2026; // année par défaut des entrées du calendrier
export const RELEASE_MONTH = 9; // mois par défaut (1 = janvier … 12 = décembre)

const DAY_MS = 86400000;

/**
 * Une entrée = une sortie programmée.
 * - day            : jour du mois (inutile si `releaseAt` est renseigné)
 * - month · year   : optionnels, sinon RELEASE_MONTH · RELEASE_YEAR
 * - releaseAt      : (optionnel) instant précis de lancement en ISO 8601 avec
 *                    fuseau, ex. '2026-09-15T09:00:00+02:00' ou
 *                    '2026-09-15T00:00:00Z'. Sans lui, le décompte vise minuit,
 *                    heure locale du visiteur ; avec lui, tout le monde bascule
 *                    au même moment.
 * - image · alt    : visuel 16:9 (800×450) servi depuis public/, sans baseUrl
 * - awaitedRank    : (optionnel) rang du bloc « le plus attendu ». 1 = premier
 *                    compte à rebours de la saison, 2 = celui qui prend le relais
 *                    dès que le n°1 est sorti… Le rang est une échelle globale :
 *                    le premier jeu du mois suivant prend le rang suivant. Un jeu
 *                    sans rang reste éligible en dernier recours, trié par date.
 * - countdownImage : (optionnel) visuel dédié au bloc « le plus attendu ».
 */
export const gameReleases = [
  { slug: 'crimson-moon', day: 1, title: 'Crimson Moon', platforms: 'PC · PS5 · XBOX SERIES', image: 'releases/crimson-moon.jpg', alt: 'Crimson Moon — combat gothique sous un ciel de lune rouge' },
  { slug: 'moonlighter-2', day: 2, title: 'Moonlighter 2: The Endless Vault', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2', image: 'releases/moonlighter-2.jpg', alt: 'Moonlighter 2 — le héros traverse un couloir de donjon coloré' },
  { slug: 'the-blood-of-dawnwalker', day: 3, title: 'The Blood of Dawnwalker', platforms: 'PC · PS5 · XBOX SERIES', image: 'releases/the-blood-of-dawnwalker.jpg', alt: 'The Blood of Dawnwalker — key art du RPG vampire' },
  { slug: 'onimusha-way-of-the-sword', day: 4, title: 'Onimusha: Way of the Sword', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2', image: 'releases/onimusha-way-of-the-sword.jpg', alt: 'Onimusha: Way of the Sword — samouraï face aux démons', awaitedRank: 8 },
  { slug: 'wardogs', day: 10, title: 'Wardogs', platforms: 'PC', image: 'releases/wardogs.jpg', alt: 'Wardogs — mercenaires dans une cité en ruines' },
  { slug: 'marvels-wolverine', day: 15, title: 'Marvel’s Wolverine', platforms: 'PS5', image: 'releases/marvels-wolverine.jpg', countdownImage: 'wolverine-countdown.jpg', alt: 'Marvel’s Wolverine — key art de Insomniac', awaitedRank: 1 },
  { slug: 'fire-emblem-fortunes-weave', day: 17, title: 'Fire Emblem: Fortune’s Weave', platforms: 'SWITCH 2', image: 'releases/fire-emblem-fortunes-weave.jpg', alt: 'Fire Emblem: Fortune’s Weave — key art des héros entrelacés', awaitedRank: 2 },
  { slug: 'lego-batman-legacy-of-the-dark-knight', day: 18, title: 'LEGO Batman: Legacy of the Dark Knight', platforms: 'SWITCH 2', image: 'releases/lego-batman-legacy-of-the-dark-knight.jpg', alt: 'LEGO Batman — Batman miniature sous la pluie de Gotham', awaitedRank: 7 },
  { slug: 'control-resonant', day: 24, title: 'Control Resonant', platforms: 'PC · PS5 · XBOX SERIES', image: 'releases/control-resonant.jpg', alt: 'Control Resonant — Dylan Faden et son marteau au-dessus de Manhattan', awaitedRank: 4 },
  { slug: 'silent-hill-townfall', day: 24, title: 'Silent Hill Townfall', platforms: 'PC · PS5', image: 'releases/silent-hill-townfall.jpg', alt: 'Silent Hill Townfall — sheriff face à la brume rouge', awaitedRank: 3 },
  { slug: 'ea-sports-fc-27', day: 25, title: 'EA Sports FC 27', platforms: 'PC · PS5 · XBOX · SWITCH', image: 'releases/ea-sports-fc-27.jpg', alt: 'EA Sports FC 27 — visuel officiel de révélation', awaitedRank: 6 },
  { slug: 'the-witcher-3-remastered', day: 29, title: 'The Witcher 3: Wild Hunt – Remastered', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2', image: 'releases/the-witcher-3-remastered.jpg', alt: 'The Witcher 3: Wild Hunt – Remastered — Geralt, Ciri, Yennefer et Triss devant le crâne du Wild Hunt, key art officiel CD Projekt RED', awaitedRank: 5 },

  /* -----------------------------------------------------------------------
   * Octobre 2026 → avril 2027 : la suite de la saison, mois par mois.
   * Ces entrées alimentent la page « calendrier complet » (/calendrier) et
   * prennent le relais du compte à rebours une fois septembre terminé.
   * --------------------------------------------------------------------- */
  { slug: 'ghost-of-yotei-complete', month: 10, day: 1, title: 'Ghost of Yōtei: Complete Edition', platforms: 'PS5', alt: 'Ghost of Yōtei — Complete Edition' },
  { slug: 'end-of-abyss', month: 10, day: 1, title: 'End of Abyss', platforms: 'PC · PS5 · XBOX SERIES', alt: 'End of Abyss — action sci-fi d’Epic Games Publishing' },
  { slug: 'dynasty-warriors-3-remastered', month: 10, day: 1, title: 'Dynasty Warriors 3: Complete Edition Remastered', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2', alt: 'Dynasty Warriors 3 remasterisé — key art Koei Tecmo' },
  { slug: 'ace-combat-8', month: 10, day: 2, title: 'Ace Combat 8: Wings of Theve', platforms: 'PC · PS5 · XBOX SERIES', alt: 'Ace Combat 8 — chasseurs en vol, key art Bandai Namco' },
  { slug: 'gears-of-war-e-day', month: 10, day: 6, title: 'Gears of War: E-Day', platforms: 'PC · XBOX SERIES', image: 'releases/gears-of-war-e-day.jpg', alt: 'Gears of War: E-Day — Marcus et Dom en armure COG, key art officiel', awaitedRank: 9 },
  { slug: 'star-wars-galactic-racer', month: 10, day: 6, title: 'Star Wars: Galactic Racer', platforms: 'PC · PS5 · XBOX SERIES', alt: 'Star Wars: Galactic Racer — course arcade dans la galaxie' },
  { slug: 'kingdom-hearts-collection', month: 10, day: 8, title: 'Kingdom Hearts Collection 1-3', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2', alt: 'Kingdom Hearts — compilation des épisodes 1 à 3' },
  { slug: 'silver-pines', month: 10, day: 8, title: 'Silver Pines', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2 · SWITCH', alt: 'Silver Pines — metroidvania survival horror de Team17' },
  { slug: 'dragons-dogma-2-dark-arisen', month: 10, day: 9, title: 'Dragon’s Dogma 2: Dark Arisen', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2', alt: 'Dragon’s Dogma 2: Dark Arisen — extension sur Switch 2' },
  { slug: 'planet-zoo-2', month: 10, day: 13, title: 'Planet Zoo 2', platforms: 'PC · PS5 · XBOX SERIES', alt: 'Planet Zoo 2 — simulation de parc animalier de Frontier' },
  { slug: 'castlevania-belmonts-curse', month: 10, day: 15, title: 'Castlevania: Belmont’s Curse', platforms: 'PC · PS5 · XBOX SERIES · SWITCH', alt: 'Castlevania: Belmont’s Curse — retour 2D du clan Belmont, key art Konami' },
  { slug: 'enshrouded', month: 10, day: 15, title: 'Enshrouded 1.0', platforms: 'PC · PS5', alt: 'Enshrouded — version 1.0 du survival action RPG' },
  { slug: 'tales-of-eternia-remastered', month: 10, day: 16, title: 'Tales of Eternia Remastered', platforms: 'PC · PS4 · PS5 · XBOX SERIES · SWITCH 2 · SWITCH', alt: 'Tales of Eternia Remastered — JRPG classique de Bandai Namco' },
  { slug: 'final-fantasy-resonance', month: 10, day: 22, title: 'Final Fantasy Resonance', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2 · SWITCH', alt: 'Final Fantasy Resonance — JRPG HD-2D de Square Enix' },
  { slug: 'switch-sports-resort', month: 10, day: 22, title: 'Nintendo Switch Sports Resort', platforms: 'SWITCH 2', alt: 'Nintendo Switch Sports Resort — sports familiaux sur Switch 2' },
  { slug: 'call-of-duty-modern-warfare-4', month: 10, day: 23, title: 'Call of Duty: Modern Warfare 4', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2', image: 'releases/call-of-duty-modern-warfare-4.jpg', alt: 'Call of Duty: Modern Warfare 4 — escouade en intervention, visuel officiel', awaitedRank: 10 },
  { slug: 'phantom-blade-zero', month: 10, day: 29, title: 'Phantom Blade Zero', platforms: 'PC · PS5', alt: 'Phantom Blade Zero — action RPG wuxia de S-Game' },
  { slug: 'steinsgate-reboot', month: 10, day: 29, title: 'Steins;Gate Re:Boot', platforms: 'PS4 · PS5 · SWITCH 2 · SWITCH', alt: 'Steins;Gate Re:Boot — remake du visual novel de Mages' },
  { slug: 'godzilla-damm-remastered', month: 11, day: 3, title: 'Godzilla: Destroy All Monsters Melee Remastered', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2', alt: 'Godzilla: Destroy All Monsters Melee remasterisé par Pipeworks' },
  { slug: 'zelda-ocarina-of-time', month: 11, day: 5, title: 'The Legend of Zelda: Ocarina of Time', platforms: 'SWITCH 2', image: 'zelda-ocarina-news.jpg', to: '/news/zelda-ocarina', alt: 'The Legend of Zelda: Ocarina of Time — remake Switch 2, visuel Nintendo' },
  { slug: 'stellar-blade-complete', month: 11, day: 5, title: 'Stellar Blade Complete Edition', platforms: 'SWITCH 2', alt: 'Stellar Blade Complete Edition sur Switch 2' },
  { slug: 'marvel-guardians-encore', month: 11, day: 5, title: 'Marvel’s Guardians of the Galaxy: Encore Edition', platforms: 'SWITCH 2', alt: 'Marvel’s Guardians of the Galaxy: Encore Edition sur Switch 2' },
  { slug: 'crymelight', month: 11, day: 5, title: 'Crymelight', platforms: 'PC · PS5 · SWITCH 2', alt: 'Crymelight — action roguelike de FuRyu' },
  { slug: 'barbie-rewind', month: 11, day: 12, title: 'Barbie Rewind', platforms: 'PC · PS4 · PS5 · XBOX ONE · XBOX SERIES · SWITCH 2 · SWITCH', alt: 'Barbie Rewind — compilation rétro par Digital Eclipse' },
  { slug: 'metaphor-refantazio-switch2', month: 11, day: 12, title: 'Metaphor: ReFantazio', platforms: 'SWITCH 2', alt: 'Metaphor: ReFantazio — le RPG d’Atlus sur Switch 2' },
  { slug: 'grand-theft-auto-vi', month: 11, day: 19, title: 'Grand Theft Auto VI', platforms: 'PS5 · XBOX SERIES', image: 'gta6-dualsense-daily.jpg', alt: 'Grand Theft Auto VI — Vice City et la Léonida, univers officiel Rockstar', awaitedRank: 11 },
  { slug: 'gothic-3-classic', month: 11, day: 24, title: 'Gothic 3 Classic', platforms: 'PS4 · PS5 · XBOX ONE · XBOX SERIES', alt: 'Gothic 3 Classic — réédition du RPG de Piranha Bytes' },
  { slug: 'hela-of-mice-and-magic', month: 12, day: 1, title: 'Hela: Of Mice & Magic', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2', alt: 'Hela: Of Mice & Magic — puzzle platformer de Windup' },
  { slug: 'dragon-quest-monsters-withered-world', month: 12, day: 3, title: 'Dragon Quest Monsters: The Withered World', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2 · SWITCH', alt: 'Dragon Quest Monsters: The Withered World — key art Square Enix' },
  { slug: 'rayman-legends-retold', month: 12, day: 3, title: 'Rayman Legends Retold', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2', image: 'rayman-legends-retold-news.jpg', to: '/news/rayman-legends-retold', alt: 'Rayman Legends Retold — remaster Ubisoft reporté au 3 décembre 2026' },
  { slug: 'dawn-of-war-iv', month: 12, day: 3, title: 'Warhammer 40,000: Dawn of War IV', platforms: 'PC', alt: 'Warhammer 40,000: Dawn of War IV — stratégie en temps réel de Deep Silver' },
  { slug: 'xenoblade-3-switch2', month: 12, day: 3, title: 'Xenoblade Chronicles 3 – Nintendo Switch 2 Edition', platforms: 'SWITCH 2', alt: 'Xenoblade Chronicles 3 — édition Nintendo Switch 2' },
  { slug: 'monster-hunter-wilds-switch2', month: 12, day: 4, title: 'Monster Hunter Wilds', platforms: 'SWITCH 2', image: 'monster-hunter-wilds-switch2.jpg', to: '/news/monster-hunter-wilds', alt: 'Monster Hunter Wilds — la chasse arrive sur Switch 2, visuel Capcom', awaitedRank: 12 },
  { slug: 'attack-on-titan-3', month: 12, day: 10, title: 'Attack on Titan 3', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2', alt: 'Attack on Titan 3 — action anime de Koei Tecmo' },
  { slug: 'professor-layton-new-world-steam', month: 12, day: 10, title: 'Professor Layton and the New World of Steam', platforms: 'PC · PS5 · SWITCH 2 · SWITCH', alt: 'Professor Layton and the New World of Steam — énigmes de Level-5' },
  { slug: 'stage-tour', month: 12, day: 10, title: 'Stage Tour', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2', alt: 'Stage Tour — jeu rythmique de RedOctane Games' },
  { slug: 'path-of-exile-2', month: 12, day: 11, title: 'Path of Exile 2 (1.0)', platforms: 'PC · PS5 · XBOX SERIES', alt: 'Path of Exile 2 — version 1.0 de l’ARPG de Grinding Gear Games' },
  { slug: 'armatus', year: 2027, month: 1, day: 7, title: 'Armatus', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2', alt: 'Armatus — roguelike TPS de Counterplay Games' },
  { slug: 'danganronpa-2x2', year: 2027, month: 1, day: 14, title: 'Danganronpa 2×2', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2 · SWITCH', alt: 'Danganronpa 2×2 — remake du visual novel de Spike Chunsoft' },
  { slug: 'ananta', year: 2027, month: 1, day: 15, title: 'Ananta', platforms: 'PC · PS5', alt: 'Ananta — action RPG open world de NetEase' },
  { slug: 'stranger-than-heaven', year: 2027, month: 1, day: 15, title: 'Stranger Than Heaven', platforms: 'PC · PS5 · XBOX SERIES', alt: 'Stranger Than Heaven — action-aventure du RGG Studio' },
  { slug: 'tankrat', year: 2027, month: 1, day: 15, title: 'TankRat', platforms: 'PC · PS5', alt: 'TankRat — action-aventure de Kepler Interactive' },
  { slug: 'metroid-ravenous', year: 2027, month: 1, day: 28, title: 'Metroid Ravenous', platforms: 'SWITCH 2', image: 'metroid-ravenous-news.png', to: '/news/metroid-ravenous', alt: 'Metroid Ravenous — Samus dans une grotte organique, visuel Nintendo', awaitedRank: 13 },
  { slug: 'until-dawn-2', year: 2027, month: 1, day: 28, title: 'Until Dawn 2', platforms: 'PS5', alt: 'Until Dawn 2 — survival horror cinématique de Firesprite' },
  { slug: 'fate-extra-record', year: 2027, month: 1, day: 28, title: 'Fate/Extra Record', platforms: 'PC · PS4 · PS5 · SWITCH 2 · SWITCH', alt: 'Fate/Extra Record — remake du RPG de Type-Moon' },
  { slug: 'tropico-7', year: 2027, month: 1, day: 28, title: 'Tropico 7', platforms: 'PC · PS5 · XBOX SERIES', alt: 'Tropico 7 — simulation gouvernementale de Kalypso Media' },
  { slug: 'metro-2039', year: 2027, month: 2, day: 4, title: 'Metro 2039', platforms: 'PC · PS5 · XBOX SERIES', alt: 'Metro 2039 — FPS survival de 4A Games dans le métro' },
  { slug: 'muramasa-revenant-blades', year: 2027, month: 2, day: 4, title: 'Muramasa: Revenant Blades', platforms: 'PC · PS5 · SWITCH 2 · SWITCH', alt: 'Muramasa: Revenant Blades — remaster Vanillaware' },
  { slug: 'tomb-raider-legacy-of-atlantis', year: 2027, month: 2, day: 12, title: 'Tomb Raider: Legacy of Atlantis', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2', alt: 'Tomb Raider: Legacy of Atlantis — remake de Crystal Dynamics', awaitedRank: 14 },
  { slug: 'god-of-war-laufey', year: 2027, month: 2, day: 16, title: 'God of War Laufey', platforms: 'PS5', alt: 'God of War Laufey — nouveau chapitre de Santa Monica Studio', awaitedRank: 15 },
  { slug: 'romancing-saga-3-destinies', year: 2027, month: 2, day: 16, title: 'Romancing SaGa 3: Destinies United', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2 · SWITCH', alt: 'Romancing SaGa 3: Destinies United — remake Square Enix' },
  { slug: 'persona-4-revival', year: 2027, month: 2, day: 18, title: 'Persona 4 Revival', platforms: 'PC · PS5 · XBOX SERIES', alt: 'Persona 4 Revival — remake du RPG d’Atlus' },
  { slug: 'fable', year: 2027, month: 2, day: 23, title: 'Fable', platforms: 'PC · PS5 · XBOX SERIES', image: 'releases/fable.jpg', alt: 'Fable — l’héroïne face au château d’Albion, key art Playground Games', awaitedRank: 16 },
  { slug: 'hyrule-warriors-calamity-definitive', year: 2027, month: 2, day: 25, title: 'Hyrule Warriors: Age of Calamity – Definitive Edition', platforms: 'SWITCH 2', alt: 'Hyrule Warriors: Age of Calamity — Definitive Edition sur Switch 2' },
  { slug: 'eternal-anima', year: 2027, month: 3, day: 4, title: 'Eternal Anima', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2', image: 'releases/eternal-anima.jpg', alt: 'Eternal Anima — key art Marvelous annonçant la sortie du 4 mars 2027' },
  { slug: 'trine-6-together-in-time', year: 2027, month: 3, day: 4, title: 'Trine 6: Together in Time', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2 · SWITCH', alt: 'Trine 6: Together in Time — puzzle-platformer de Frozenbyte' },
  { slug: 'gundam-rogue-orbit', year: 2027, month: 3, day: 5, title: 'Gundam Rogue Orbit', platforms: 'PC · PS5 · XBOX SERIES', alt: 'Gundam Rogue Orbit — action-aventure Bandai Namco' },
  { slug: 'road-kings', year: 2027, month: 3, day: 11, title: 'Road Kings', platforms: 'PC · PS5 · XBOX SERIES', alt: 'Road Kings — simulation routière de Saber Interactive' },
  { slug: 'no-rest-for-the-wicked', year: 2027, month: 3, day: 15, title: 'No Rest for the Wicked (1.0)', platforms: 'PC · PS5', alt: 'No Rest for the Wicked — version 1.0 de Moon Studios' },
  { slug: 'exodus', year: 2027, month: 4, day: 7, title: 'Exodus', platforms: 'PC · PS5 · XBOX SERIES', alt: 'Exodus — RPG sci-fi d’Archetype Entertainment' },
  { slug: 'final-fantasy-vii-revelation', year: 2027, month: 4, day: 8, title: 'Final Fantasy VII Revelation', platforms: 'PC · PS5 · XBOX SERIES · SWITCH 2', image: 'releases/final-fantasy-vii-revelation.jpg', alt: 'Final Fantasy VII Revelation — key art officielle Square Enix', awaitedRank: 17 },
  { slug: 'melty-blood-twi-lumina', year: 2027, month: 4, day: 22, title: 'Melty Blood: Twi-Lumina', platforms: 'PC · PS4 · PS5 · XBOX SERIES · SWITCH 2 · SWITCH', alt: 'Melty Blood: Twi-Lumina — versus fighting de French-Bread' },
  { slug: 'mariachi-legends', year: 2027, month: 4, day: 27, title: 'Mariachi Legends', platforms: 'PC · PS5 · XBOX SERIES · SWITCH', alt: 'Mariachi Legends — metroidvania de Halberd Studios' },
];

/* ---------------------------------------------------------------------------
 * Dates
 * ------------------------------------------------------------------------- */

/** Accepte une Date, un timestamp ou une chaîne ISO ; retourne un timestamp. */
function timeOf(value){
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') return Date.parse(value);
  return Number(value);
}

function startOfDay(date){
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function toDay(value){
  return value instanceof Date ? value : new Date(timeOf(value));
}

/**
 * Instant de référence d'une sortie : `releaseAt` si fourni et valide, sinon
 * minuit local le `day` du mois par défaut (ou du `month`/`year` de l'entrée).
 */
export function releaseDate(release){
  if (release.releaseAt){
    const exact = new Date(release.releaseAt);
    if (!Number.isNaN(exact.getTime())) return exact;
  }
  const year = typeof release.year === 'number' ? release.year : RELEASE_YEAR;
  const month = typeof release.month === 'number' ? release.month : RELEASE_MONTH;
  const day = typeof release.day === 'number' ? release.day : 1;
  return new Date(year, month - 1, day, 0, 0, 0);
}

/** Jour / mois / année_effectifs d'une sortie (déduits de `releaseAt` le cas échéant). */
export function releaseDay(release){
  return releaseDate(release).getDate();
}
export function releaseMonth(release){
  return releaseDate(release).getMonth() + 1;
}
export function releaseYear(release){
  return releaseDate(release).getFullYear();
}

/** Nombre de jours d'un mois donné (9/2026 → 30). */
export function monthDays(year = RELEASE_YEAR, month = RELEASE_MONTH){
  return new Date(year, month, 0).getDate();
}

/** Sortie déjà passée (strictement avant aujourd'hui) — grille et frise. */
export function isPastRelease(release, today = new Date()){
  return releaseDate(release).getTime() < startOfDay(today);
}

/** Sortie qui tombe exactement le jour de `today`. */
export function isReleaseToday(release, today = new Date()){
  const midnight = startOfDay(today);
  const at = releaseDate(release).getTime();
  return at >= midnight && at < midnight + DAY_MS;
}

/** Retrouve une sortie par son slug. */
export function findRelease(slug, list = gameReleases){
  return list.find((release) => release.slug === slug);
}

/* ---------------------------------------------------------------------------
 * Libellés localisés (le mois n'est plus codé en dur dans la page)
 * ------------------------------------------------------------------------- */

/**
 * Locales des dates. `en-US` plutôt que `en-GB` : « September 15, 2026 » et le
 * mois abrégé sur trois lettres (« 15 SEP ») collent au ton déjà employé dans
 * les textes anglais du site. Les chiffres restent latins en arabe.
 */
const DATE_LOCALES = { fr: 'fr-FR', en: 'en-US', ar: 'ar-u-nu-latn' };

function formatDate(date, lang, options, fallback){
  try {
    return new Intl.DateTimeFormat(DATE_LOCALES[lang] || 'fr-FR', options).format(date);
  } catch (error) {
    return fallback();
  }
}

/** Nom long du mois, en capitales typographiques : « SEPTEMBRE ». */
export function monthHeadline(year, month, lang = 'fr'){
  const label = formatDate(new Date(year, month - 1, 1), lang, { month: 'long' }, () => `${month}/${year}`);
  return label.replace(/[.\s]+$/, '').toUpperCase();
}

/** Mois + année, en capitales : « SEPTEMBRE 2026 ». */
export function monthLabel(year, month, lang = 'fr'){
  const label = formatDate(new Date(year, month - 1, 1), lang, { month: 'long', year: 'numeric' }, () => `${month}/${year}`);
  return label.replace(/[.\s]+$/, '').toUpperCase();
}

/** Étiquette courte d'une sortie, ex. « 15 SEP » (ou « 15 SEPT » en français). */
export function releaseDayLabel(release, lang = 'fr'){
  const date = releaseDate(release);
  const short = formatDate(date, lang, { month: 'short' }, () => date.toLocaleDateString(lang === 'ar' ? 'ar' : lang, { month: 'short' }))
    .replace(/[.\s]/g, '')
    .toUpperCase();
  return `${String(date.getDate()).padStart(2, '0')} ${short}`;
}

/** Date longue d'une sortie, ex. « 15 septembre 2026 ». */
export function releaseDateLabel(release, lang = 'fr'){
  return formatDate(releaseDate(release), lang, { day: 'numeric', month: 'long', year: 'numeric' }, () => releaseDate(release).toLocaleDateString());
}

/* ---------------------------------------------------------------------------
 * Mois actif : ce que montrent la grille et la frise
 * ------------------------------------------------------------------------- */

export function monthKey(year, month){
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Sorties d'un mois donné, dans l'ordre du calendrier (puis par jour). */
export function releasesInMonth(year, month, list = gameReleases){
  return list
    .filter((release) => releaseYear(release) === year && releaseMonth(release) === month)
    .sort((a, b) => releaseDate(a).getTime() - releaseDate(b).getTime());
}

/**
 * Mois affiché par la page Actus : le mois courant s'il est au calendrier,
 * sinon le mois de la prochaine sortie (le calendrier reste donc utile avant
 * comme après le mois « vedette »), sinon le dernier mois connu.
 */
export function activeMonth(now = new Date(), list = gameReleases){
  const today = toDay(now);
  const currentKey = monthKey(today.getFullYear(), today.getMonth() + 1);
  const known = [...new Set(list.map((release) => monthKey(releaseYear(release), releaseMonth(release))))].sort();
  const upcoming = list
    .filter((release) => releaseDate(release).getTime() >= startOfDay(today))
    .sort((a, b) => releaseDate(a).getTime() - releaseDate(b).getTime());
  const nextKey = upcoming.length > 0 ? monthKey(releaseYear(upcoming[0]), releaseMonth(upcoming[0])) : null;

  let key = currentKey;
  if (!known.includes(key)) key = nextKey && known.includes(nextKey) ? nextKey : known[known.length - 1];
  if (!key) key = currentKey; // calendrier vide : on garde le mois courant, la section s'affiche vide

  const [year, month] = key.split('-').map(Number);
  const isCurrent = key === currentKey;
  return {
    key,
    year,
    month,
    days: monthDays(year, month),
    releases: releasesInMonth(year, month, list),
    isCurrent,
    todayDay: isCurrent ? today.getDate() : null,
  };
}

/**
 * Tous les mois contenant au moins une sortie, du plus proche au plus
 * lointain : c'est la colonne vertébrale de la page « calendrier complet ».
 */
export function calendarMonths(now = new Date(), list = gameReleases){
  const today = toDay(now);
  const currentKey = monthKey(today.getFullYear(), today.getMonth() + 1);
  return [...new Set(list.map((release) => monthKey(releaseYear(release), releaseMonth(release))))]
    .sort()
    .map((key) => {
      const [year, month] = key.split('-').map(Number);
      const isCurrent = key === currentKey;
      return {
        key,
        year,
        month,
        days: monthDays(year, month),
        releases: releasesInMonth(year, month, list),
        isCurrent,
        todayDay: isCurrent ? today.getDate() : null,
      };
    });
}

/* ---------------------------------------------------------------------------
 * File « le plus attendu » — alimente le bloc compte à rebours de la page Actus.
 * ------------------------------------------------------------------------- */

const UNRANKED = Number.MAX_SAFE_INTEGER;

function awaitedRank(release){
  return typeof release.awaitedRank === 'number' ? release.awaitedRank : UNRANKED;
}

/** Tri du bloc « le plus attendu » : rang éditorial d'abord, puis date de sortie. */
export function sortAwaited(list){
  return [...list].sort((a, b) => {
    const rankA = awaitedRank(a);
    const rankB = awaitedRank(b);
    if (rankA !== rankB) return rankA < rankB ? -1 : 1;
    return releaseDate(a).getTime() - releaseDate(b).getTime();
  });
}

/** Sorties pas encore disponibles, dans l'ordre où le compte à rebours doit les prendre. */
export function upcomingReleases(now = new Date(), list = gameReleases){
  const at = timeOf(now);
  return sortAwaited(list.filter((release) => releaseDate(release).getTime() > at));
}

/** Jeu à compter à présent (premier de la file), ou `null` si le calendrier est épuisé. */
export function nextAwaitedRelease(now = new Date(), list = gameReleases){
  return upcomingReleases(now, list)[0] || null;
}

/** Sorties du jour déjà disponibles (sert à la mention « sorti aujourd'hui »). */
export function todaysReleases(now = new Date(), list = gameReleases){
  const today = toDay(now);
  return sortAwaited(list.filter((release) => isReleaseToday(release, today)));
}

/** Temps restant avant une sortie, en jours/heures/minutes/secondes (jamais négatif). */
export function countdownParts(release, now = new Date()){
  const remaining = Math.max(0, releaseDate(release).getTime() - timeOf(now));
  const totalSeconds = Math.floor(remaining / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}
