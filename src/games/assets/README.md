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

