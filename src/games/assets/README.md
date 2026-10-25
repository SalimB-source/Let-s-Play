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

## Voix des guerriers du Nord: `dwarf-dialogue-my-axe-shall-speak-for-me.wav`

`dwarf-dialogue-my-axe-shall-speak-for-me.wav` is the user-supplied
`public/Dwarf_Dialogue_Vocal_My_Axe_Shall_Speak_For_Me.wav`, copied byte-for-byte
with no re-encoding (WAV PCM, stereo, 16-bit, 44.1 kHz, 2.259 seconds,
460,252 bytes).

It plays on creature arrival for **Guerrier au bouclier rond**, **Berserk des
trois hivers**, **Jarl au marteau de guerre** and **Berserk du crépuscule**.
The same line is used for all four cards in solo and PvP; previews and unrelated
creatures do not trigger it.

## Foudre des marteaux: `thunder-spark-transition-full.mp3`

`thunder-spark-transition-full.mp3` is a byte-for-byte game copy of the
user-provided `public/26509 Thunder spark transition-full.mp3` (MP3 MPEG-1
Layer III, 320 kbps, 44.1 kHz, 3.422 seconds, 136,880 bytes). The original is
kept in `public/`; no re-encoding or editing was applied.

It plays as the `foudre_marteau` SFX for **Éclair du marteau**
(`eclair-du-marteau`) when cast and for the arrival effect of **Maître du
marteau** (`maitre-du-marteau`). Both sides use the same sound. A returning
Maître triggers it again with its Tenacité arrival effect; the PvP snapshot
route also recognizes the opponent's arrival.

## Cold wind mass freeze: `cold-wind.wav`

`cold-wind.wav` is a real recorded wind sample, not synthesized.

- **Source téléchargée depuis internet via GitHub (allowed host codeload.github.com)** :
  - Repo `Muges/ambientsounds` — https://github.com/Muges/ambientsounds
  - File `wind.ogg` — Wind by felix.blume (CC0 1.0) — https://freesound.org/people/felix.blume/sounds/217506/
  - Original : 166s, 3.1MB OGG stereo 48kHz, CC0
  - Trimmed to 2.2s mono 48kHz, fade 0.15s, normalized 0.85, 211KB WAV — real cold wind gust, perfect for verglas/brume/blizzard/geant
  - Download via `https://codeload.github.com/Muges/ambientsounds/tar.gz/refs/heads/master` (allowed host)
- **Autres sources CC0 proposées** (Pixabay Content License, free commercial) :
  - Bitter Cold Wind by DRAGON-STUDIO — https://pixabay.com/sound-effects/nature-bitter-cold-wind-482876/
  - Cold Wind Sound Effect — https://pixabay.com/sound-effects/cold-wind-sound-effect-127448/
  - Wind Artic Cold by cobratronik — https://freesound.org/people/cobratronik/sounds/117136/ (CC0)
- **Usage** : SFX `cold_wind` joué dans `declencherGelMasse` (verglas, brume-du-fjord, hurlement-du-blizzard, geant-des-banquises), avec throttle 900ms. Volume 0.58, même bus que `flame_gust`/`water_wave`.
- **Animation** : `rpg-cold-breath-descend 1.4s` souffle froid simple qui descend sur créatures adverses (joueur→ennemi top 5%, sorcier→joueur bottom 15%), 5 particules brume / 8 verglas.
- **Remplacement futur** : pour un MP3 Pixabay, télécharger et convertir via ffmpeg `ffmpeg -y -i input.mp3 -t 2.2 -af afade=t=in:st=0:d=0.15,afade=t=out:st=2.05:d=0.15 src/games/assets/cold-wind.wav`.

