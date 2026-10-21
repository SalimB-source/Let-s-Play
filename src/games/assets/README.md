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

# Le Sablier — pirate boarding cry (`pirate-ahoy.mp3`)

`pirate-ahoy.mp3` is `Cartoon Pirate Voice - Ahoy.mp3` supplied by the user,
moved byte-for-byte with no re-encoding or modification (MP3, 44.1 kHz,
approximately 1.411 seconds).

Played via `RpgAudioPlayer` (`abordage`) whenever a creature with Abordage
kidnaps an opposing creature into its hold (`prendreEnCale`).

