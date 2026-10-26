#!/usr/bin/env bash
# ── Retirer le « doré du Sable » des peintures ────────────────────────────────
#
# Le set Sable a reçu une teinte de set appliquée **à la peinture** (voir
# `src/games/RPG-CARD-ART.md`, « Le doré du Sable ») : un mélange `#c89a50` à
# 18 %, saturation × 1,04. Posée sur la passe Souls (cendre, ocre poussiéreux,
# mer noire), elle a fini par dominer : les cartes du coffret viraient toutes au
# sépia, et la cendre du set ne se lisait plus.
#
# Ce script retire une **part** de cette dominante chaude, carte par carte, sans
# toucher au dessin, au cadrage ni aux dimensions (4:5 intact) :
#
#   - on mesure la dominante de l'image au moment de la correction
#     (`mean(R) - mean(B)`, en niveaux de gris moyens) ;
#   - on retire `PART` (100 % par défaut : tout l'écart mesuré) de cette
#     dominante, moitié sur le rouge, moitié en ajout sur le bleu — c'est
#     l'inverse du mélange doré ;
#   - on retire 10 % de saturation, pour que l'ocre redevienne de l'ocre ;
#   - une carte déjà froide (dominante ≤ 6) n'est **pas** touchée : elle n'a
#     rien à perdre ;
#   - la correction est plafonnée à 7 % par canal : sur une scène
#     volontairement chaude (forge, torche), elle ne peut pas virer au gris.
#
# Une première passe à 65 % n'a pas suffi : « le filtre est trop fort » se
# lisait encore sur l'écran du coffret. La part est donc passée à 100 %, et
# c'est la mesure carte par carte qui protège les scènes chaudes.
#
# Usage :
#   scripts/retirer-filtre-dore-sable.sh --dry      # mesure seulement
#   scripts/retirer-filtre-dore-sable.sh            # corrige sur place
#   PART=60 SATURE=95 scripts/retirer-filtre-dore-sable.sh   # plus doux
#
# Après une correction, **incrémenter la clé de cache** des cartes touchées
# (`CARD_ART_CACHE_VERSIONS`, dans `src/games/rpgCardArt.js`) : le fichier garde
# son nom, et un navigateur garderait sinon l'ancienne peinture. La passe
# d'octobre 2026 a fait passer la marque à `sable-souls-desore-v3`.
#
# Le script est **idempotent** : une carte déjà corrigée a une dominante sous le
# seuil et n'est plus touchée, quel que soit le nombre de passages.

set -euo pipefail

cd "$(dirname "$0")/.."

PART="${PART:-100}"         # part de la dominante retirée, en %
SATURE="${SATURE:-90}"      # saturation restante, en %
SEUIL="${SEUIL:-6}"         # dominante en dessous de laquelle on ne touche à rien
PLAFOND="${PLAFOND:-7}"     # correction maximale par canal, en % de 255
QUALITE="${QUALITE:-92}"    # qualité JPEG de sortie

DRY=0
[ "${1:-}" = "--dry" ] && DRY=1

# Les cartes Sable et **leur fichier réel**, lus dans le catalogue et dans la
# table des illustrations : une seule source de vérité, alias compris.
CARTES=$(node --input-type=module -e "
  const { RPG_DUEL_CARDS } = await import('./src/games/rpgCards.js');
  const { cardArt } = await import('./src/games/rpgCardArt.js');
  for (const c of RPG_DUEL_CARDS.filter((x) => x.element === 'sable')) {
    const fichier = 'public/' + cardArt(c).replace(/^\\//, '').split('?')[0];
    console.log(c.id + '\t' + fichier);
  }
")

corrigees=0
intactes=0

while IFS=$'\t' read -r id fichier; do
  [ -n "$id" ] || continue
  if [ ! -f "$fichier" ]; then
    echo "absent   $id"
    continue
  fi

  # Dominante mesurée sur une vignette : le grain d'une huile ne doit pas peser.
  mesures=$(convert "$fichier" -resize 256x -format '%[fx:mean.r*255] %[fx:mean.b*255]' info:)
  delta=$(awk -v m="$mesures" -v part="$PART" -v seuil="$SEUIL" -v plafond="$PLAFOND" '
    BEGIN {
      split(m, v, " ");
      chaud = v[1] - v[2];
      if (chaud <= seuil) { printf "0 %.1f\n", chaud; exit }
      d = (part / 100) * chaud / (2 * 2.55);
      if (d > plafond) d = plafond;
      printf "%.2f %.1f\n", d, chaud;
    }')
  d=$(echo "$delta" | cut -d' ' -f1)
  chaud=$(echo "$delta" | cut -d' ' -f2)

  if [ "$d" = "0" ] || [ "$d" = "0.00" ]; then
    printf 'intacte  %-32s dominante %s\n' "$id" "$chaud"
    intactes=$((intactes + 1))
    continue
  fi

  printf 'corrige  %-32s dominante %-5s rouge -%s%% bleu +%s%%\n' "$id" "$chaud" "$d" "$d"
  corrigees=$((corrigees + 1))

  [ "$DRY" = "1" ] && continue

  tmp=$(mktemp "/tmp/$id.XXXXXX.jpg")
  convert "$fichier" \
    -channel R -evaluate subtract "${d}%" \
    -channel B -evaluate add "${d}%" \
    +channel \
    -modulate "100,${SATURE},100" \
    -define jpeg:preserve-settings -quality "$QUALITE" \
    "$tmp"
  mv "$tmp" "$fichier"
done <<< "$CARTES"

echo
echo "corrigées : $corrigees   intactes : $intactes${DRY:+}"
[ "$DRY" = "1" ] && echo "(essai à blanc : aucun fichier n'a été modifié)"
