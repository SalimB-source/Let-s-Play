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

## Carte Instagram — test de Modern Warfare 4 (arabe)

`make_mw4_review_ar.py` produit `instagram/cod-mw4-test-arabe.png` : visuel
officiel de campagne en haut, logo Let’s Play, panneau arrondi avec la note à
gauche et cinq lignes de résumé en arabe à droite.

Pillow de cet environnement n’est pas compilé avec libraqm : ni `direction` ni
`language` ne sont acceptés. La composition arabe passe donc par HarfBuzz, qui
fournit les glyphes liés, leurs positions et les marques de base, puis FreeType
dessine chaque glyphe. D’où :

```bash
python3 -m venv .venv
.venv/bin/pip install -r scripts/visuels/requirements.txt uharfbuzz freetype-py
.venv/bin/python scripts/visuels/make_mw4_review_ar.py
```

`arabic_text.py` expose la classe `ArabicText` (`draw`, `width`, `wrap`) et sert
de point de départ pour toute carte en arabe de l’atelier.

Le key art utilisé est `instagram/assets/mw4-keyart.png` (voir le fichier
`CREDITS.txt` du même dossier). Le visuel est recadré, le panneau se dimensionne
sur les cinq lignes de texte, et la carte laisse une marge basse constante.

## Trevor (GTA V) vs Jason (GTA VI) — carte Instagram 4:5, en arabe

`make_gta_trevor_jason_45.py` compose une comparaison entre Trevor Philips
(*GTA V*, 2013) et Jason Duval (*GTA VI*, 19 novembre 2026) : décor de Vice City
(clé d'art officielle — ponton, palmiers, skyline au coucher de soleil), Trevor
détouré au premier plan, quatre axes de comparaison en vis-à-vis. Tout le texte
est en **arabe** (sens droite → gauche), composé avec HarfBuzz via
`arabic_text.py` ; seuls les nombres et « GTA VI » restent en caractères latins.

```bash
python3 -m pip install -r scripts/visuels/requirements.txt
python3 scripts/visuels/make_gta_trevor_jason_45.py            # → instagram/gta-trevor-jason/
python3 scripts/visuels/make_gta_trevor_jason_45.py --out /tmp  # autre dossier
```

Sorties : PNG **1080 × 1350** et JPEG qualité 92, dans
`instagram/gta-trevor-jason/`. Les matières premières (rendu détouré de Trevor,
clé d'art du ponton) vivent dans `instagram/assets/`, exclu du dépôt : le script
seul suffit à régénérer la carte sur une machine qui a ces deux fichiers.

## Fiches personnages — Trevor / Jason, en arabe

`make_gta_fiches_45.py` produit **deux** cartes 4:5 de la même série (même
gabarit, même charte) : un « ملف شخصي » par héros, avec rôle, ville, passé,
activité et trait dominant — cinq lignes, en arabe, composées avec HarfBuzz.

Gabarit des visuels maison, repris tel quel : fond violet avec triangles et
étincelles, **logo Let's Play** en haut à gauche, **logo du jeu** en haut à
droite (numéral en dégradé + lettrage latin, redessiné — aucun fichier de marque
Rockstar n'est utilisé), **bandeau arrondi** pour le titre en crème,
**fenêtre photo** à coins coupés qui occupe le centre, lignes de données sur le
violet avec étiquettes jaunes, et **bandeau jaune** pleine largeur
« شاركنا رأيك في التعليقات » en pied.

Illustrations : artwork officiel de Trevor à Sandy Shores
(`instagram/assets/gta5-trevor-artwork.jpg`) et clé d'art du ponton de Vice City
pour Jason (`instagram/assets/gta6-pier-keyart.jpg`) ; les deux fichiers sont
exclus du dépôt, le script seul suffit à régénérer les cartes.

```bash
python3 scripts/visuels/make_gta_fiches_45.py             # → instagram/fiches-personnages/
python3 scripts/visuels/make_gta_fiches_45.py --out /tmp  # autre dossier
```

Sorties : `fiche-trevor-ar-1080x1350.png/.jpg` et
`fiche-jason-ar-1080x1350.png/.jpg`.
