/**
 * Voix d'arrivée des créatures — un échantillon par carte, livré à la racine
 * de `public/`.
 *
 * Le lot « Game voices » dépose un court MP3 par créature (0,65 s à 3,06 s,
 * 80 kbps, 44,1 kHz) sous le nom de sa carte. Ce nom n'est presque jamais
 * l'identifiant de la carte, ni même son nom imprimé : le rapprochement est
 * fait ici, ligne par ligne, et chaque écart est consigné.
 *
 * Ce que ces fichiers ne sont pas :
 *  - les longues pistes de plateau (`Viking Howl.mp3`, `Egypt.mp3`,
 *    `Le Sceau de Sang (Instrumental).mp3`, `raspberrymusic - A Vikings.mp3`…)
 *    appartiennent à `rpgPlateauMusic.js` ;
 *  - `viking warrior battle cry with horn.mp3` et
 *    `26509 Thunder spark transition-full.mp3` sont déjà les bruitages
 *    `victoire` et `foudre_marteau` de `rpgAudio.js` (copiés dans
 *    `src/games/assets/`) ;
 *  - `Dwarf_Dialogue_Vocal_…wav` et `Pirate_Dialogue_Alright.wav` sont les
 *    accueils génériques de `rpgDwarfAudio.js` et `rpgAudio.js`.
 *
 * Priorité : la voix d'une carte supplante son accueil générique — une Barbe
 * Rousse n'écoute pas « Ahoy ! » par-dessus sa propre réplique. Les cartes
 * sans voix gardent donc seules les accueils pirates, le quai des navires et
 * la réplique naine.
 *
 * Le lecteur reste muet si le joueur a coupé le son (voir `RpgAudioPlayer`).
 * Aucun aperçu, aucune pioche, aucune réanimation ne déclenche une voix :
 * seule une entrée en jeu depuis la main, comme les accueils qu'elle remplace.
 */

/** Base publique de Vite (`/Let-s-Play/` sur GitHub Pages, `/` ailleurs). */
const RPG_PUBLIC_BASE = import.meta.env?.BASE_URL ?? '/';

/**
 * Les 37 voix livrées, carte par carte. L'ordre suit la collection : Braise,
 * puis Ténèbres, Sable, Eau, Neige, et enfin les héros.
 */
export const RPG_ARRIVAL_VOICE_FILES = Object.freeze({
  // ── Cour du Soleil rouge · Braise ───────────────────────────────────────
  susanoo: 'Susanoo.mp3',
  'cavalier-des-deux-sabres': 'Cavalier des deux sabres.mp3',
  'onna-musha-des-cendres': 'Onna-musha.mp3',
  'oni-de-la-fournaise': 'Oni de la fournaise.mp3',
  // Le fichier porte le nom de la déesse, la carte s'appelle « Kagutsuchi,
  // Flamme originelle » ; « (1) » est le suffixe du téléchargement.
  'kagutsuchi-flamme-originelle': 'Kagutsuchi(1).MP3',
  'kenshi-de-la-forge': 'Kenshi de la forge.mp3',
  'tojiro-le-pourfendeur': 'Tojiro.mp3',
  // « Damiyo » : le Daimyō du Soleil rouge, sans accent ni macron.
  'daimyo-du-soleil-rouge': 'Damiyo.mp3',
  // « Shogun » : le Samouraï du Torii est la carte qui se promeut en Shogun.
  'samourai-du-torii': 'Shogun.mp3',

  // ── Balance des Heures · Ténèbres ───────────────────────────────────────
  'celui-qui-juge': 'Celui qui juge.mp3',
  // « (1) » : suffixe de téléchargement, la carte est unique.
  'la-devoreuse': 'La dévoreuse(1).MP3',
  // « Le passeur » : la carte complète est « Le Passeur au masque de chacal ».
  'passeur-au-masque-de-chacal': 'Le passeur.mp3',
  'maitre-des-hieroglyphes': 'Maitre des Hieroglyphes.mp3',
  'berserk-du-crepuscule': 'Berserk du crépuscule.mp3',
  'valkyrie-des-neuf-nuits': 'Valkyrie des neufs nuits.mp3',

  // ── Veilleurs du Désert & pistes · Sable ────────────────────────────────
  'faucon-du-zenith': 'faucon du zenith.mp3',
  // « lionne du soleil » : la Lionne du midi ardent.
  'lionne-du-midi-ardent': 'lionne du soleil.mp3',
  'dame-aux-ailes-d-or': "dame aux ailes d'or.mp3",
  'seigneur-des-machoires': 'Seigneur des machoires.mp3',
  'cavalier-amazigh-du-desert': 'Cavalier amazigh du desert.mp3',

  // ── Lettres de Marque · les deux amiraux ────────────────────────────────
  'la-barbe-rousse': 'Barbe rousse.mp3',
  // « Black beard » : la Barbe Noire, la malédiction.
  'la-barbe-noire': 'Black beard.mp3',

  // ── Eau profonde et serpents ────────────────────────────────────────────
  // « Serpent de verre » : la seule carte de verre du jeu est la Vipère de
  // verre — c'est elle que le fichier nomme.
  'vipere-de-verre': 'Serpent de verre.mp3',
  jormungandr: 'Jormungandr.mp3',

  // ── Serment des Neuf Hivers · Neige ─────────────────────────────────────
  'jarl-au-marteau-de-guerre': 'Jarl au marteau de guerre.mp3',
  // « Valkyrie de glace » : la Valkyrie des glaces.
  'valkyrie-des-glaces': 'Valkyrie de glace.mp3',
  // « Valkyrie du corbeau » : la Valkyrie au corbeau.
  'valkyrie-au-corbeau': 'Valkyrie du corbeau.mp3',
  // « Viking des trois hivers » : le Berserk des trois hivers.
  'berserk-des-trois-hivers': 'Viking des trois hivers.mp3',
  // « Géant de glace » : le Géant des banquises.
  'geant-des-banquises': 'Géant de glace.mp3',

  // ── Les héros ───────────────────────────────────────────────────────────
  salem: 'Salem.mp3',
  yamina: 'Yamina.mp3',
  boualem: 'Boualem.mp3',
  feriel: 'Feriel.mp3',
  // « Kusayla » : Le roi Kusayla.
  'kusayla-roi-des-imazighen': 'Kusayla.mp3',
  'ifrit-al-ahmar': 'Ifrit el ahmar.mp3',
  'maitre-du-marteau': 'Maitre du marteau.mp3',
  'maitre-des-corbeaux': 'Maitre des corbeaux.mp3',
});

/** Les identifiants des cartes qui ont une voix, dans l'ordre de la table. */
export const RPG_ARRIVAL_VOICE_CARD_IDS = Object.freeze(Object.keys(RPG_ARRIVAL_VOICE_FILES));

function resolveCardId(cardOrId) {
  if (typeof cardOrId === 'string') return cardOrId;
  return cardOrId?.id ?? cardOrId?.carteId ?? null;
}

/**
 * Le nom du fichier de voix d'une carte (`null` pour toute autre carte : les
 * jetons, les sites, les magies et les créatures du lot silencieux).
 */
export function rpgArrivalVoiceFile(cardOrId) {
  const cardId = resolveCardId(cardOrId);
  if (!cardId) return null;
  return Object.prototype.hasOwnProperty.call(RPG_ARRIVAL_VOICE_FILES, cardId)
    ? RPG_ARRIVAL_VOICE_FILES[cardId]
    : null;
}

/**
 * L'adresse publique de la voix d'une carte — `null` quand la carte n'en a
 * pas. Les noms livrés contiennent espaces, apostrophes et parenthèses : le
 * nom de fichier est encodé (`encodeURIComponent` laisse l'apostrophe telle
 * quelle, ce qu'une adresse accepte), la base ne l'est pas.
 */
export function rpgArrivalVoiceUrl(cardOrId) {
  const fichier = rpgArrivalVoiceFile(cardOrId);
  if (!fichier) return null;
  return `${RPG_PUBLIC_BASE}${encodeURIComponent(fichier)}`;
}

/** La carte a-t-elle sa propre voix d'arrivée ? */
export function rpgACarteUneVoix(cardOrId) {
  return rpgArrivalVoiceFile(cardOrId) !== null;
}

/**
 * Les entrées en jeu qui gardent leur **accueil générique** — le quai d'un
 * navire, le cri ou le dialogue pirate, la réplique naine : toutes les cartes
 * sauf celles qui parlent déjà d'elles-mêmes. Une Barbe-Rousse n'écoute donc
 * jamais « Ahoy ! » par-dessus sa propre réplique, alors que la Mousse des
 * galiotes, muette, garde le cri pirate.
 */
export function rpgArriveesSansVoix(entrees) {
  return (Array.isArray(entrees) ? entrees : [])
    .filter((entree) => entree && !rpgACarteUneVoix(entree.carteId));
}
