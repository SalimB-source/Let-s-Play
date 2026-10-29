/**
 * Voix d'arrivée des créatures — un échantillon par carte, livré à la racine
 * de `public/`.
 *
 * Trois lots de fichiers ont été déposés : le lot « Game voices » (37 MP3
 * courts, 0,65 s à 3,06 s), puis 14 voix (1,07 s à 3,08 s, plus un WAV — le
 * Tengu), puis 9 voix de héros et de créatures (1,88 s à 3,97 s). Tous vivent à
 * la racine de `public/`, sauf le Tengu, ramené en PCM 16 bits mono. Chacun porte le
 * nom de sa carte, qui n'est presque jamais l'identifiant de la carte, ni même
 * son nom imprimé : le rapprochement est fait ici, ligne par ligne, et chaque
 * écart est consigné.
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
 *
 * **La voix précède sa créature** : c'est la page qui décide *quand*, et elle
 * annonce la carte avec le geste — départ du vol depuis la main, résolution de
 * la carte annoncée par l'adversaire, déchirure du sacrifice — jamais après la
 * pose. D'où le préchargement (`prechargerVoix`) : un fichier inconnu du
 * navigateur ferait attendre la réplique jusqu'après l'atterrissage.
 */

/** Base publique de Vite (`/Let-s-Play/` sur GitHub Pages, `/` ailleurs). */
const RPG_PUBLIC_BASE = import.meta.env?.BASE_URL ?? '/';

/**
 * Les 60 voix livrées, carte par carte. L'ordre suit la collection — Braise,
 * Ténèbres, Sable, Eau, Neige, les héros — puis les lots suivants, rangés à
 * part, dans l'ordre où ils sont arrivés.
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

  // ── Deuxième lot : 14 voix de plus ──────────────────────────────────────
  // Le lot suivant ne nomme pas non plus les cartes telles qu'elles
  // s'impriment ; chaque écart est consigné ici.
  //
  // « Ashigaru » : le seul ashigaru du jeu, celui des braises.
  'ashigaru-des-braises': 'Ashigaru.mp3',
  // « Ronin du soleil rouge » sans macron : la carte s'écrit « Rōnin du Soleil
  // rouge ».
  'ronin-du-soleil-rouge': 'Ronin du soleil rouge.mp3',
  // « Tengu » : la carte est le Tengu du mont ardent. Seule voix du lot en
  // WAV — l'original 24 bits stéréo a été ramené en PCM 16 bits mono 44,1 kHz
  // pour rester dans le poids d'une voix (137 Ko) et se décoder partout.
  'tengu-du-mont-ardent': 'Tengu.wav',
  'hatamoto-des-cendres': 'Hatamoto des cendres.mp3',
  'gardienne-de-la-balance': 'Gardienne de la balance.mp3',
  // « Prête de la bouche » : la carte est le **Prêtre** de la bouche — le
  // fichier écrit la prêtresse.
  'pretre-de-la-bouche': 'Prête de la bouche.mp3',
  'ibis-des-comptes': 'Ibis des comptes.mp3',
  'celle-qui-pese': 'Celle qui pèse.mp3',
  // « Piloe de la carrera » : deux coquilles du lot pour la carte « Pilote de
  // la Carreira ».
  'pilote-de-la-carreira': 'Piloe de la carrera.mp3',
  'le-renegat': 'Le renegat.mp3',
  // « Djinn d'éclair » : le seul djinn du jeu est le Djinn de foudre.
  'djinn-de-foudre': "Djinn d'éclair.mp3",
  // « La dame des neufs mondes » : la carte s'imprime « LA DAME DES NEUF
  // MONDES », au singulier.
  'dame-des-neuf-mondes': 'La dame des neufs mondes.mp3',
  'pere-des-corbeaux': 'Pere des corbeaux.mp3',
  tarek: 'Tarek.mp3',

  // ── Troisième lot : 9 voix de plus ──────────────────────────────────────
  // Les héros et les créatures des crêtes, du Hoggar et des ergs.
  'amani-des-ksour': 'Amani.mp3',
  'amayas-du-hoggar': 'Amayas.mp3',
  'bouchra-guerriere-des-cretes': 'Bouchra.mp3',
  // « Eirick » : la carte s'écrit « Eirik du Premier Serment ». Une lettre de
  // trop dans le fichier, la voix est la sienne.
  'eirik-du-premier-serment': 'Eirick.mp3',
  // « Ifrit furtif » : le fichier dit le nom imprimé, la carte est
  // `ifrit-des-ergs` — à ne pas confondre avec Ifrit al-Ahmar, le héros, qui a
  // déjà sa voix.
  'ifrit-des-ergs': 'Ifrit furtif.MP3',
  'guerrier-au-bouclier-rond': 'Guerrier au bouclier rond.mp3',
  'sahir-des-braises': 'Sahir des braises.mp3',
  'tiziri-du-djurdjura': 'Tiziri.mp3',
  // « Volva » sans tréma : la carte est la Völva soigneuse.
  'volva-soigneuse': 'Volva.mp3',
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

/** Repère les renaissances de Tenacité dans deux instantanés PvP : les
 * journaux audio WeakMap du moteur ne traversent pas le serveur. */
export function rpgRetoursTenaciteEntreEtats(avant, apres) {
  const retours = [];
  for (const cote of ['joueur', 'sorcier']) {
    const ancienCamp = avant?.[cote];
    const nouveauCamp = apres?.[cote];
    if (!ancienCamp || !nouveauCamp) continue;
    const idsAvant = new Set((ancienCamp.creatures ?? []).map((entite) => entite.id));
    const disponibles = new Map();
    for (const retour of ancienCamp.retoursProgrammes ?? []) {
      if (retour.tenacite) disponibles.set(retour.carteId, (disponibles.get(retour.carteId) ?? 0) + 1);
    }
    for (const retour of nouveauCamp.retoursProgrammes ?? []) {
      if (retour.tenacite) disponibles.set(retour.carteId, Math.max(0, (disponibles.get(retour.carteId) ?? 0) - 1));
    }
    for (const entite of nouveauCamp.creatures ?? []) {
      if (idsAvant.has(entite.id) || entite.tenaciteDisponible || !(disponibles.get(entite.carteId) > 0)) continue;
      disponibles.set(entite.carteId, disponibles.get(entite.carteId) - 1);
      retours.push({ entityId: entite.id, carteId: entite.carteId, cote, origine: 'tenacite' });
    }
  }
  return retours;
}
