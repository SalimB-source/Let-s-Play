# Ambiances de la cinématique (V4+)

Nappes actuelles : **100 % synthétiques** (`tools/synth-ambiances.py`),
régénérables à volonté. Pour utiliser de vrais enregistrements,
remplacez les fichiers en gardant **exactement** ces noms, puis relancez
`python3 tools/monter-cinematique.py --audio-only` (ne refait que le mix).

| Fichier | Usage dans le film | Niveau |
|---|---|---|
| `wind-desert-loop.wav` | lit de vent sur tout le film (boucle 60 s) | 0.10 |
| `sand-shimmer-loop.wav` | scintillement de grains, tableau T05 (boucle 24 s) | 0.12 |
| `tea-room-tone.wav` | pièce feutrée + feu lointain, tableau T10 (boucle 48 s) | 0.10 |
| `deep-drone-loop.wav` | bourdon grave, portail T11 → titre T12 (boucle 48 s) | 0.13 |
| `bell-hit.wav` | cloche (3 coups) — remplace la version synthétique du mix | — |

Conseils si vous enregistrez/téléchargez (WAV 44,1/48 kHz ou MP3 320) :
boucles propres aux raccords inaudibles, sans écrêtage. Les fondus de
2 s en entrée/sortie de nappe masquent les raccords de sections.
