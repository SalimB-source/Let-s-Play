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
