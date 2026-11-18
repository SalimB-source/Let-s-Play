# Visuels éditoriaux Let’s Play

## The Game Awards 2026 — les nommés au jeu de l’année

Les six PNG **1080 × 1350 px (4:5)** et leur archive ZIP se trouvent dans
`visuels/tga-2026/`, hors du site publié. Les numéros indiquent l’ordre du
carrousel, pas un classement.

Pour les réexporter à partir des six affiches fournies (PNG de 1744 × 982 px,
`tga-vote-game-of-the-year.png` et ses variantes numérotées de ` (1)` à ` (5)`) :

```bash
python3 -m pip install -r scripts/visuels/requirements.txt
python3 scripts/visuels/make_tga_2026_portraits.py /chemin/vers/les/affiches
```

Le script recadre les illustrations sans les étirer, conserve les crédits des
cartes sources et utilise le logo transparent `public/lets-play-logo.png`.
Les polices sont celles de l’atelier visuel et du lettrage Let’s Talk, déjà
embarquées. L’option `--out` permet de choisir un autre dossier de sortie.

### Couverture du carrousel et miniatures

`00-couverture-les-6-nommes.png` (1080 × 1350) est une couverture facultative,
à part des six cartes numérotées. Le ZIP commence par Grand Theft Auto VI (`01/06`).
Le sous-dossier `miniatures/` contient les versions JPEG 540 × 675 de la
couverture et de la première carte. Ces fichiers se
régénèrent à partir des six cartes, sans les pièces jointes d’origine et sans
modifier le ZIP des nommés :

```bash
python3 scripts/visuels/make_tga_2026_cover.py
```

### Édition anglaise

```bash
python3 scripts/visuels/make_tga_2026_portraits.py /chemin/vers/les/affiches --lang en
python3 scripts/visuels/make_tga_2026_cover.py --lang en --bundle
```

L’édition anglaise est exportée séparément dans `visuels/tga-2026/en/` ;
les fichiers français restent inchangés. Le ZIP `lets-play-game-awards-2026-4x5-en.zip`
contient les six cartes numérotées à sa racine, de GTA VI à Zelda. L’option
`--bundle` y ajoute la couverture et les deux miniatures dans `extras/`, sans
intercaler de fichier entre les six nommés. Les métadonnées des PNG sont
également dans la langue de l’édition.

## Kojima Productions → Xbox

Le script `make_kojima_xbox_visual.py` génère deux déclinaisons éditoriales :

- `public/kojima-xbox-news.jpg` — 1920 × 1080, format 16:9 ;
- `public/kojima-xbox-news-square.jpg` — 1080 × 1080, format carré/social.

Les deux rendus utilisent la vraie photo de Hideo Kojima et Asha Sharma prise
chez Kojima Productions le 14 septembre 2026. La provenance détaillée est
consignée dans `public/news-sources/CREDITS.txt`.

### Régénérer

```bash
python3 -m pip install -r scripts/visuels/requirements.txt
python3 scripts/visuels/make_kojima_xbox_visual.py
```

Les fontes sont embarquées localement afin que le rendu reste déterministe.
