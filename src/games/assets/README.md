# Mirage Rush — cowboy cry

`cowboy-hey-haa.mp3` is the audio supplied by the user, copied byte-for-byte
from `public/cowboy-hey-haa.mp3` on GitHub branch
`arena/01a0ec69-let-s-play` (blob `5490bc87ec38e0d5e651260f2ad280f40025cdac`).
It replaces the generated voice. No pitch, speed or editing was applied.
MP3, stereo, 44.1 kHz, approximately 1.96 seconds.

Stored alongside the game's assets so Vite fingerprints and bundles the file
correctly on both root and subpath deployments.

The clip fires on every fifth consecutive player pickup (all stages/modes).
Missing a row or hitting an obstacle resets this vocal streak, independently
of the existing scoring combo. Muting stops the cry and music together.

# Le Sablier — three maritime sound effects

## Abordage (boarding capture): `chain-rattle.wav`

`chain-rattle.wav` is `ChainRattleMetalChainManyVariations_jxKTo_03.wav`
supplied by the user, moved byte-for-byte with no re-encoding or modification
(WAV PCM, mono, 16-bit, 44.1 kHz, 2.4 seconds, 211,724 bytes).

Played via `RpgAudioPlayer` under the SFX name `abordage` whenever a creature
with Abordage kidnaps an opposing creature into its hold (`prendreEnCale`).

## Pirate arrival: `pirate-ahoy.mp3`

`pirate-ahoy.mp3` is `Cartoon Pirate Voice - Ahoy.mp3` supplied by the user
(MP3, 44.1 kHz, approximately 1.411 seconds), kept byte-for-byte. It formerly
backed the `abordage` SFX; it now plays under the SFX name `pirate_arrivee`
whenever a pirate creature of the Lettres de Marque set — a non-token,
non-ship creature card played from the hand — enters the battlefield, on
either side (solo AI and PvP).

## Pirate arrival, second voice: `pirate-dialogue-alright.wav`

`pirate-dialogue-alright.wav` is the user-supplied
`public/Pirate_Dialogue_Alright.wav`, copied byte-for-byte with no
re-encoding (WAV PCM, stereo, 16-bit, 44.1 kHz, 0.779 second, 266,158 bytes).
It plays under the SFX name `pirate_dialogue`.

The pirate arrival alternates between the two voices: the first pirate card
cries « Ahoy ! », the next one says « Alright », and so on for the whole
match (`RPG_PIRATE_ARRIVEES_SFX` / `rpgSonArriveePirate` in `rpgAudio.js`).
Both sides and both modes share the same cycle. Ships keep the dock sound
alone — a pirate ship never plays either voice.

## Ship arrival: `dock-sound.mp3`

`dock-sound.mp3` is the user-supplied `Dock Sound_320k.mp3`, stored
byte-for-byte with no re-encoding (MP3 MPEG-1 Layer III, 320 kbps CBR,
48 kHz, 2.352 seconds, 94,125 bytes).

It plays under the SFX name `navire_arrivee` whenever a creature whose
printed type line contains "Navire" enters the battlefield (Le Brûlot, Cotre
de course, Galion de la flotte, la légende du Hollandais volant, Drakkar à
tête de dragon). A ship that also belongs to the pirate set plays the dock
sound only — never both arrival sounds. Tokens, reanimations and prisoners
returning from a hold are not arrivals and stay silent.

## Cold wind mass freeze: `cold-wind.wav`

`cold-wind.wav` is a real recorded wind sample, not synthesized.

- **Source recherchée sur internet** : Pixabay Content License (CC0-like, free commercial, no attribution required)
  - Bitter Cold Wind by DRAGON-STUDIO — https://pixabay.com/sound-effects/nature-bitter-cold-wind-482876/
  - Cold Wind Sound Effect — https://pixabay.com/sound-effects/cold-wind-sound-effect-127448/
  - Wind Artic Cold by cobratronik — https://freesound.org/people/cobratronik/sounds/117136/ (CC0)
- **Fichier actuel** : placeholder généré localement par filtrage de bruit blanc (low-pass 40+80, envelope bell, gust 0.7Hz) en attendant le vrai MP3 CC0, à remplacer par le fichier Pixabay téléchargé (2s, 44.1kHz, mono). Le placeholder est volontairement léger (2s, 176KB) pour le souffle froid simple qui descend sur les créatures adverses.
- **Usage** : SFX `cold_wind` joué dans `declencherGelMasse` (verglas, brume-du-fjord, hurlement-du-blizzard, geant-des-banquises), avec throttle 900ms. Volume 0.58, même bus que `flame_gust`/`water_wave`.
- **Remplacement** : télécharger le MP3 Pixabay, le renommer `cold-wind.mp3` et `cold-wind.wav` (ou convertir via ffmpeg), garder même durée ~2s pour coller à l'animation `rpg-cold-breath-descend 1.4s`.

