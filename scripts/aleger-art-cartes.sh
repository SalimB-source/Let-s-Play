#!/usr/bin/env bash
#
# Allège les peintures de cartes — `public/cards/**/*.jpg`
# --------------------------------------------------------
# Une peinture est peinte en 1024 × 1280 (ou 928 × 1152) et pèse 160 à 600 Ko.
# Sur la table, une face mesure au plus ~270 px de large ; même dans l'aperçu
# du catalogue, on ne dépasse pas 232 px. Livrer du 1024 × 1280 revient donc à
# transporter quatre fois les pixels qu'on affiche — et c'est ce poids qui
# part dans l'installeur PC et dans chaque visite du site.
#
# Passe unique : 768 × 960 (le 4:5 exact du cadre affiché), qualité 72,
# progressif, sans métadonnées. Mesuré sur le catalogue entier : 103 Mo → 39 Mo,
# et aucune différence visible à 100 % sur les dégradés (feu, brume, ciel).
#
# Le cadrage compte : le catalogue n'est pas homogène (928 × 1152, 1122 × 1402,
# 1264 × 1568, 1023 × 1280, et `sphere-de-rotation` en 848 × 1264). Toutes ces
# faces sont déjà affichées en `object-fit: cover` dans un cadre 4:5 — donc déjà
# rognées au centre par le navigateur. On applique le même rognage sur le
# fichier : `-resize …^` puis `-extent`. Résultat identique à l'écran, mais une
# seule géométrie livrée, et les tests peuvent garder une assertion exacte.
#
# Sûr à relancer : un fichier déjà à 768 px de large ou moins est laissé
# intact — sinon chaque passage rajouterait une génération de pertes JPEG.
# Les peintures neuves, livrées en 1024 × 1280, sont donc reprises au passage
# suivant (`npm run art:aleger`).
#
# Usage :
#   scripts/aleger-art-cartes.sh            # tout public/cards
#   scripts/aleger-art-cartes.sh fichier…   # seulement ceux-là
set -euo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LARGEUR_MAX=768
HAUTEUR_MAX=960
QUALITE=72
PLANCHER=768

if [ "$#" -gt 0 ]; then
  FICHIERS=("$@")
else
  mapfile -t FICHIERS < <(find "$RACINE/public/cards" -type f -name '*.jpg' | sort)
fi

command -v convert >/dev/null 2>&1 || { echo "ImageMagick (convert) est requis." >&2; exit 1; }

avant=0
apres=0
traites=0
ignores=0

for fichier in "${FICHIERS[@]}"; do
  [ -f "$fichier" ] || continue
  largeur=$(identify -format '%w' "$fichier" 2>/dev/null || echo 0)
  if [ "$largeur" -le "$PLANCHER" ]; then
    ignores=$((ignores + 1))
    continue
  fi
  taille_avant=$(stat -c%s "$fichier")
  tmp="$(mktemp "${fichier}.XXXXXX")"
  convert "$fichier" \
    -resize "${LARGEUR_MAX}x${HAUTEUR_MAX}^" \
    -gravity center \
    -extent "${LARGEUR_MAX}x${HAUTEUR_MAX}" \
    -strip \
    -interlace Plane \
    -sampling-factor 4:2:0 \
    -quality "$QUALITE" \
    "$tmp"
  mv "$tmp" "$fichier"
  taille_apres=$(stat -c%s "$fichier")
  avant=$((avant + taille_avant))
  apres=$((apres + taille_apres))
  traites=$((traites + 1))
done

if [ "$traites" -eq 0 ]; then
  echo "Rien à alléger : ${ignores} peinture(s) déjà à ${LARGEUR_MAX} px ou moins."
  exit 0
fi

mo() { awk -v o="$1" 'BEGIN { printf "%.1f", o / 1048576 }'; }
echo "Allégé : ${traites} peinture(s), ${ignores} déjà légère(s)."
echo "  $(mo "$avant") Mo → $(mo "$apres") Mo"
