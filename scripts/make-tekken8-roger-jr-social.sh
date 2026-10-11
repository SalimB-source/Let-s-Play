#!/usr/bin/env bash
# Builds the 4:5 (1080x1350) social card for the Tekken 8 / Roger Jr. news,
# in the LET'S PLAY house style (near-black, #ffd400 yellow, heavy caps).
#
#   usage: scripts/make-tekken8-roger-jr-social.sh [source.jpg] [out.jpg]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${1:-$ROOT/public/tekken8-roger-jr-jin-news.jpg}"
OUT="${2:-$ROOT/public/tekken8-roger-jr-jin-social-4x5.jpg}"

W=1080
H=1350
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# ---------------------------------------------------------------- fonts
FONT_BLACK="$TMP/ArchivoBlack.ttf"
FONT_REG=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
FONT_REGB=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf

# Archivo Black (OFL) is fetched on demand so the repo stays light.
if command -v python3 >/dev/null 2>&1; then
  curl -fsSL -o "$TMP/ab.tgz" \
    https://registry.npmjs.org/@fontsource/archivo-black/-/archivo-black-5.2.5.tgz 2>/dev/null || true
  tar xzf "$TMP/ab.tgz" -C "$TMP" 2>/dev/null || true
  python3 - "$TMP" "$FONT_BLACK" <<'PY' 2>/dev/null || true
import sys, glob
from fontTools.ttLib import TTFont
src = glob.glob(sys.argv[1] + "/package/files/archivo-black-latin-400-normal.woff")[0]
f = TTFont(src); f.flavor = None; f.save(sys.argv[2])
PY
fi
[ -f "$FONT_BLACK" ] || FONT_BLACK="$FONT_REGB"

# ---------------------------------------------------------------- copy
T_LOGO="LET'S PLAY"
T_KICK="TEKKEN 8  ·  SAISON 3"
T_H1="ROGER JR."
T_H2="MET UNE DROITE"
T_H3="À JIN KAZAMA"
T_S1="Le kangourou boxeur rejoint le roster le 17 novembre,"
T_S2="early access dès le 12 pour la saison 3."
T_FOOT="11.10.2026  ·  EVO FRANCE  ·  D'APRÈS BANDAI NAMCO"

# -------------------------------------------------------------- helpers
# NB: ImageMagick's security policy blocks 'label:@file', so text goes inline.
width_of () { # font pointsize kerning text
  convert -font "$1" -pointsize "$2" -kerning "$3" label:"$4" -format "%w" info: 2>/dev/null || echo 99999
}
# largest pointsize (<= $3) whose rendered width fits in $4
fit_size () { # font text maxsize maxwidth kerning
  local s
  for ((s = "$3"; s >= 16; s -= 2)); do
    [ "$(width_of "$1" "$s" "${5:-0}" "$2")" -le "$4" ] && { echo "$s"; return; }
  done
  echo 16
}

# -------------------------------------------------------------- palette
YELLOW="#ffd400"
GREY="#9a9aa6"
WHITE="#ffffff"

# ----------------------------------------------------------- base image
# resize to full height, then centre-crop to an exact 4:5 frame
convert "$SRC" -resize x${H} -gravity center -crop ${W}x${H}+0+0 +repage \
  -colorspace sRGB "$TMP/base.jpg"

# --------------------------------------------------------- scrim layers
# top scrim: 0.85 opaque at y=0 fading to nothing by 55% of the frame
convert -size ${W}x${H} gradient:none-black \
  -channel A -level 0%,55% +channel \
  -channel A -negate   +channel \
  -channel A -evaluate multiply 0.85 +channel \
  PNG32:"$TMP/grad_t.png"
# bottom scrim: nothing until 78%, then up to 0.85 opaque
convert -size ${W}x${H} gradient:none-black \
  -channel A -level 78%,100% +channel \
  -channel A -evaluate multiply 0.85 +channel \
  PNG32:"$TMP/grad_b.png"

# ------------------------------------------------------------ typography
MAXW=$((W - 128))
HKERN=1
HSIZE=$(fit_size "$FONT_BLACK" "$T_H2" 100 "$MAXW" "$HKERN")
for t in "$T_H1" "$T_H3"; do
  s=$(fit_size "$FONT_BLACK" "$t" 100 "$MAXW" "$HKERN")
  [ "$s" -lt "$HSIZE" ] && HSIZE=$s
done
[ "$HSIZE" -le 88 ] && HKERN=0

SSIZE=$(fit_size "$FONT_REG" "$T_S1" 34 "$MAXW" 2)
s=$(fit_size "$FONT_REG" "$T_S2" 34 "$MAXW" 2); [ "$s" -lt "$SSIZE" ] && SSIZE=$s

FSIZE=$(fit_size "$FONT_REGB" "$T_FOOT" 24 "$MAXW" 4)

# top block -------------------------------------------------------------
Y_KICK=250
LEAD=$(( HSIZE + 8 ))
Y_H1=$(( 340 ))
Y_H2=$(( Y_H1 + LEAD ))
Y_H3=$(( Y_H2 + LEAD ))
Y_BAR=$(( Y_H3 + 38 ))

# bottom block ----------------------------------------------------------
Y_S1=1206
Y_S2=$(( Y_S1 + 40 ))
Y_FOOT=1312

echo "layout: headline=${HSIZE}pt (kern ${HKERN}) lead=${LEAD} | h1=${Y_H1} h2=${Y_H2} h3=${Y_H3} bar=${Y_BAR} | sub=${SSIZE}pt foot=${FSIZE}pt"
for t in "$T_H1" "$T_H2" "$T_H3"; do
  printf '  %-16s %4spx\n' "$t" "$(width_of "$FONT_BLACK" "$HSIZE" "$HKERN" "$t")"
done

set +e
convert "$TMP/base.jpg" \
  \( "$TMP/grad_t.png" \) -compose over -composite \
  \( "$TMP/grad_b.png" \) -compose over -composite \
  \
  -stroke "$YELLOW" -strokewidth 5 -fill none \
  -draw "line 64,150 64,64 line 64,64 150,64" \
  -draw "line $((W-64)),1250 $((W-64)),1164 line $((W-64)),1250 $((W-150)),1250" \
  -stroke none \
  \
  -fill "$YELLOW" -draw "rectangle 64,74 388,140" \
  -font "$FONT_BLACK" -pointsize 34 -fill "#0b0b0f" -gravity northwest \
  -annotate +84+94 "$T_LOGO" \
  \
  -font "$FONT_REGB" -pointsize 26 -fill "$YELLOW" -gravity northwest \
  -annotate +64+$((Y_KICK - 26)) "$T_KICK" \
  \
  -font "$FONT_BLACK" -pointsize "$HSIZE" -kerning "$HKERN" -fill "$WHITE" -gravity northwest \
  -annotate +64+$((Y_H1 - HSIZE)) "$T_H1" \
  -annotate +64+$((Y_H2 - HSIZE)) "$T_H2" \
  -annotate +64+$((Y_H3 - HSIZE)) "$T_H3" \
  \
  -fill "$YELLOW" -draw "rectangle 64,$Y_BAR $((64+96)),$((Y_BAR+6))" \
  \
  -font "$FONT_REG" -pointsize "$SSIZE" -kerning 2 -fill "$GREY" -gravity northwest \
  -annotate +64+$((Y_S1 - SSIZE)) "$T_S1" \
  -annotate +64+$((Y_S2 - SSIZE)) "$T_S2" \
  \
  -font "$FONT_REGB" -pointsize "$FSIZE" -kerning 4 -fill "$WHITE" -gravity northwest \
  -annotate +64+$((Y_FOOT - FSIZE)) "$T_FOOT" \
  \
  -quality 90 -strip "$OUT"
rc=$?
set -e

if [ "$rc" -ne 0 ]; then
  echo "compose failed (rc=$rc) — writing bare 4:5 frame" >&2
  convert "$TMP/base.jpg" -quality 90 "$OUT"
fi

identify "$OUT"
