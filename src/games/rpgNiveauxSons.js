/**
 * Le niveau d'écoute commun des sons du Sablier.
 * ---------------------------------------------
 *
 * Les échantillons du duel viennent de sources très différentes : une pioche
 * enregistrée très bas (`card_draw`, -32 LUFS avant normalisation), un coup
 * d'épée saturé (`player_attack_hit`, -6 LUFS), un cri viking, la voix d'une
 * carte… À volume d'élément égal, l'écart entendu allait de un à trente-deux
 * décibels : la pioche était inaudible, le coup d'épée assourdissant, et deux
 * voix d'arrivée sur trois passaient sous les bruitages de table.
 *
 * Ce module ramène **tous** ces fichiers au même niveau d'écoute :
 * `RPG_NIVEAU_CIBLE_LUFS` (-20 LUFS), mesuré selon ITU-R BS.1770 — la mesure
 * qui approche le mieux la sonie perçue. Chaque fichier est mesuré une fois,
 * et son gain linéaire en découle :
 *
 *     gain = 10 ** ((cible - niveau_mesure) / 20)
 *
 * Les deux tables ci-dessous portent, pour chaque fichier, son niveau intégré
 * en LUFS et sa crête en dBFS. Elles sont **mesurées**, jamais réglées à la
 * main, par `tools/mesure-sons-sablier.py` :
 *
 *     python3 tools/mesure-sons-sablier.py            # la table, et l'écart obtenu
 *     python3 tools/mesure-sons-sablier.py --js       # le littéral à recopier
 *
 * Toute pièce sonore ajoutée au jeu doit y être mesurée : un fichier absent
 * des tables joue à son niveau d'origine (gain de 1), et
 * `tests/rpg-niveaux-sons.test.js` refuse cet oubli.
 *
 * Deux gestes, dans cet ordre :
 *
 *  1. **les fichiers trop pointus sont remontés dans le fichier.** La pioche
 *     demandait +12 dB alors que sa crête ne laissait pas la marge : aucun gain
 *     de lecture ne pouvait la rendre audible sans saturer.
 *     `tools/mesure-sons-sablier.py --egaliser` réécrit ces WAV (gain + limiteur
 *     à pré-lecture, crête à -1 dBFS) — `card-draw.wav` et la voix du Tengu.
 *     Les MP3 fournis, eux, ne sont pas réécrits ;
 *  2. **le gain de lecture** ramène le reste, borné par ce que la crête permet
 *     (`RPG_PLAFOND_CRETE_DBFS`) : les deux voix MP3 sans marge — « Celle qui
 *     pèse » et « Le Maître des hiéroglyphes » — restent ainsi 4,1 dB et 1,4 dB
 *     sous le niveau commun. Tout le reste tombe pile dessus.
 *
 * Le survol de l'interface (`hover`) garde son murmure : son fichier est joué à
 * 0,05 du niveau commun (`DOSE_SURVOL`, dans `rpgAudio.js`), 17,4 dB sous les
 * bruitages, parce qu'il se déclenche à chaque carte effleurée — le balayage
 * d'une main de cartes en fait une nappe, alors qu'un son d'événement se
 * remarque.
 * Les musiques ont leur propre chaîne et leur propre réglage.
 */

/** Le niveau d'écoute commun : -20 LUFS, la sonie d'un bruitage de table. */
export const RPG_NIVEAU_CIBLE_LUFS = -20;

/**
 * La crête que le lecteur s'interdit de dépasser, en dBFS. Les fichiers dont
 * la crête empêche d'atteindre la cible sont d'abord remontés **dans le
 * fichier** (gain + limiteur, `tools/mesure-sons-sablier.py --egaliser`) :
 * ceux qui restent sous la cible le doivent à leur forme d'onde, pas à un
 * réglage oublié.
 */
export const RPG_PLAFOND_CRETE_DBFS = -0.5;

/** Le gain appliqué à un fichier mesuré `lufs` pour l'amener au niveau commun. */
export function gainDepuisNiveau(lufs, cible = RPG_NIVEAU_CIBLE_LUFS) {
  const niveau = Number(lufs);
  if (!Number.isFinite(niveau)) return 1;
  return 10 ** ((cible - niveau) / 20);
}

/** Le gain qu'une crête permet encore : au-delà, le fichier saturerait. */
export function gainDepuisCrete(crete, plafond = RPG_PLAFOND_CRETE_DBFS) {
  const creteDb = Number(crete);
  if (!Number.isFinite(creteDb)) return 1;
  return 10 ** ((plafond - creteDb) / 20);
}

/**
 * Le gain d'une mesure `[lufs, crête]` : le niveau commun, borné par ce que la
 * crête autorise.
 */
export function gainDepuisMesure(mesure, cible = RPG_NIVEAU_CIBLE_LUFS, plafond = RPG_PLAFOND_CRETE_DBFS) {
  if (!Array.isArray(mesure)) return 1;
  return Math.min(gainDepuisNiveau(mesure[0], cible), gainDepuisCrete(mesure[1], plafond));
}

/**
 * Les bruitages du duel : `[niveau intégré en LUFS, crête en dBFS]`, mesurés
 * sur le fichier livré dans `src/games/assets/`.
 */
export const RPG_NIVEAUX_ECHANTILLONS = Object.freeze({
  card_draw: [-20.16, -1.0],
  attackers_confirm: [-13.43, -2.73],
  player_attack_hit: [-5.95, 0.0],
  flame_gust: [-16.65, -0.15],
  card_countered: [-16.85, -2.16],
  creature_return: [-18.86, -1.0],
  block_impact: [-17.01, 0.03],
  destruction_hit: [-14.12, -2.54],
  page_turn: [-20.88, -1.27],
  victoire: [-11.09, -0.0],
  furie_viking: [-13.8, -4.0],
  furie_viking_femelle: [-10.6, -0.9],
  defaite: [-21.09, -7.12],
  degats: [-13.53, -1.04],
  degats_sorcier: [-13.53, -1.04],
  abordage: [-17.75, -3.71],
  pirate_arrivee: [-12.86, -2.32],
  pirate_dialogue: [-11.06, -0.0],
  dwarf_dialogue: [-12.56, -0.0],
  navire_arrivee: [-23.1, -10.63],
  cold_wind: [-18.43, -1.41],
  freeze_impact: [-15.7, -0.2],
  foudre_marteau: [-15.01, -0.08],
  fleche: [-16.36, -1.41],
});

/**
 * Les voix d'arrivée des créatures — un fichier par carte, livré à la racine de
 * `public/` (voir `rpgArrivalVoices.js`) : `[niveau intégré en LUFS, crête en
 * dBFS]`.
 */
export const RPG_NIVEAUX_VOIX = Object.freeze({
  'Sentinel of the Sands.mp3': [-21.86, -6.64],
  'Archon of the Black Hourglass.mp3': [-21.37, -6.69],
  'Dancer of the Dune Shadows.mp3': [-24.56, -8.20],
  'Watcher of the Last Twilight.mp3': [-19.52, -2.96],
  'Sovereign of the Black Moon.mp3': [-19.22, -3.60],
  'Silent Eclipse.mp3': [-24.30, -5.71],
  'Guardian of the Crescent.mp3': [-19.73, -2.70],
  'Tracker of Moonless Nights.mp3': [-21.64, -4.95],
  'Bloodthirster of the Dunes.mp3': [-16.05, -1.02],
  'Standard-Bearer of the Eclipse.mp3': [-16.59, -1.44],
  'Watcher of the Frozen Moon.mp3': [-26.93, -9.18],
  'Scourge of the Black Moon.mp3': [-21.45, -1.72],
  'General of the Black Crescent.mp3': [-16.69, -2.20],
  'Guard of the Frozen Throne.mp3': [-18.85, -0.97],
  'Amani.mp3': [-26.26, -7.48],
  'Amayas.mp3': [-25.91, -6.41],
  'Ashigaru.mp3': [-22.34, -5.72],
  'Barbe rousse.mp3': [-19.34, -2.63],
  'Berserk du crépuscule.mp3': [-18.08, -3.7],
  'Black beard.mp3': [-18.79, -2.78],
  'Boualem.mp3': [-23.17, -7.23],
  'Bouchra.mp3': [-20.43, -3.38],
  'Cavalier amazigh du desert.mp3': [-16.45, -4.0],
  'Cavalier des deux sabres.mp3': [-12.46, -0.47],
  'Celle qui pèse.mp3': [-29.47, -5.83],
  'Celui qui juge.mp3': [-19.08, -2.44],
  "dame aux ailes d'or.mp3": [-20.0, -3.7],
  'Damiyo.mp3': [-15.88, -0.9],
  "Djinn d'éclair.mp3": [-19.0, -1.54],
  'Eirick.mp3': [-19.46, -4.43],
  'faucon du zenith.mp3': [-17.62, -2.7],
  'Feriel.mp3': [-22.25, -4.09],
  'Gardienne de la balance.mp3': [-26.1, -7.99],
  'Guerrier au bouclier rond.mp3': [-19.19, -3.67],
  'Géant de glace.mp3': [-19.38, -4.36],
  'Hatamoto des cendres.mp3': [-17.18, -2.84],
  'Ibis des comptes.mp3': [-18.33, -1.39],
  'Ifrit el ahmar.mp3': [-20.98, -1.82],
  'Ifrit furtif.MP3': [-17.22, -3.63],
  'Jarl au marteau de guerre.mp3': [-18.52, -3.42],
  'Jormungandr.mp3': [-22.32, -4.68],
  'Kagutsuchi(1).MP3': [-19.4, -9.66],
  'Kenshi de la forge.mp3': [-17.42, -3.41],
  'Kusayla.mp3': [-19.07, -4.12],
  'La dame des neufs mondes.mp3': [-28.62, -13.09],
  'La dévoreuse(1).MP3': [-23.93, -10.71],
  'Le passeur.mp3': [-21.47, -3.01],
  'Le renegat.mp3': [-14.54, -0.55],
  'lionne du soleil.mp3': [-17.98, -2.21],
  'Maitre des corbeaux.mp3': [-17.44, -2.38],
  'Maitre des Hieroglyphes.mp3': [-22.0, -1.14],
  'Maitre du marteau.mp3': [-15.91, -2.53],
  'Oni de la fournaise.mp3': [-17.73, -1.33],
  'Onna-musha.mp3': [-20.07, -5.73],
  'Pere des corbeaux.mp3': [-20.29, -3.03],
  'Piloe de la carrera.mp3': [-18.47, -3.73],
  'Prête de la bouche.mp3': [-16.92, -5.81],
  'Ronin du soleil rouge.mp3': [-23.57, -6.93],
  'Sahir des braises.mp3': [-24.25, -8.62],
  'Salem.mp3': [-21.58, -7.21],
  'Seigneur des machoires.mp3': [-18.65, -1.17],
  'Serpent de verre.mp3': [-19.53, -4.56],
  'Shogun.mp3': [-17.05, -3.62],
  'Susanoo.mp3': [-13.53, -0.81],
  'Tarek.mp3': [-19.29, -2.55],
  'Tengu.wav': [-20.55, -1.0],
  'Tiziri.mp3': [-16.13, -1.5],
  'Tojiro.mp3': [-17.42, -1.31],
  'Valkyrie de glace.mp3': [-16.35, -2.88],
  'Valkyrie des neufs nuits.mp3': [-21.5, -6.27],
  'Valkyrie du corbeau.mp3': [-21.7, -7.44],
  'Viking des trois hivers.mp3': [-19.82, -3.87],
  'Volva.mp3': [-18.07, -2.24],
  'Yamina.mp3': [-24.46, -7.82],
});

/**
 * Le gain d'un bruitage du catalogue, d'après sa mesure. Un nom inconnu — un
 * son ajouté sans passer par la mesure — joue à son niveau d'origine.
 */
export function gainEchantillon(nom) {
  return gainDepuisMesure(RPG_NIVEAUX_ECHANTILLONS[nom]);
}

/**
 * Le gain d'une voix d'arrivée, d'après la mesure de son fichier.
 *
 * `fichier` peut être le nom livré (`Tengu.wav`) ou l'adresse publique que le
 * lecteur reçoit de `rpgArrivalVoiceUrl` (`/Tengu.wav`,
 * `/dame%20aux%20ailes%20d'or.mp3`) : le nom est relu dans l'adresse, puis
 * désechappé.
 */
export function gainVoixArrivee(fichier) {
  const brut = String(fichier ?? '');
  const nom = brut.slice(brut.lastIndexOf('/') + 1);
  let decode = nom;
  try {
    decode = decodeURIComponent(nom);
  } catch { /* adresse mal formée : le nom brut reste la clé */ }
  return gainDepuisMesure(RPG_NIVEAUX_VOIX[brut] ?? RPG_NIVEAUX_VOIX[nom] ?? RPG_NIVEAUX_VOIX[decode]);
}
