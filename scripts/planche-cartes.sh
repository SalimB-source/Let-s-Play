#!/usr/bin/env bash
# Planche de contrôle du catalogue — une vignette nommée par carte, groupée
# par élément, plus une planche générale.
#
# Usage :
#   scripts/planche-cartes.sh [dossier-de-sortie]
#
# Par défaut : /tmp/planche-cartes. Produit <élément>.jpg pour chaque élément
# et catalogue.jpg avec les 162 cartes. Les vignettes sont tirées des mêmes
# fichiers que le jeu (public/cards/<art>.jpg), donc la planche montre ce que
# le joueur voit — pas les originaux de .ref-art ni les alternatives.
set -euo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SORTIE="${1:-/tmp/planche-cartes}"
TRAVAIL="$SORTIE/travail"
mkdir -p "$TRAVAIL"

cd "$RACINE"

# 1. La liste des cartes illustrées, groupée par élément puis par rareté.
node --input-type=module > "$TRAVAIL/liste.tsv" <<'NODE'
import fs from 'node:fs';
import * as cartes from './src/games/rpgCards.js';
import * as tenebres from './src/games/rpgTenebres.js';

const toutes = [];
for (const module of [cartes, tenebres]) {
  for (const valeur of Object.values(module)) {
    if (Array.isArray(valeur) && valeur.length && valeur[0]?.element) toutes.push(...valeur);
  }
}

const parId = new Map(toutes.map((c) => [c.id, c]));
const fichiers = new Set(
  fs.readdirSync('public/cards').filter((f) => f.endsWith('.jpg')).map((f) => f.slice(0, -4)),
);

const ORDRE_ELEMENTS = ['braise', 'sable', 'neige', 'eau', 'tenebres'];
const ORDRE_RARETES = { mythique: 0, rare: 1, inhabituelle: 2, commune: 3 };

for (const element of ORDRE_ELEMENTS) {
  const lot = [...parId.values()]
    .filter((c) => c.element === element && !c.furie && fichiers.has(c.art ?? c.id))
    .sort(
      (a, b) =>
        (ORDRE_RARETES[a.rarity] ?? 9) - (ORDRE_RARETES[b.rarity] ?? 9) ||
        (a.name ?? '').localeCompare(b.name ?? '', 'fr'),
    );
  for (const c of lot) {
    process.stdout.write([element, c.rarity ?? '?', c.id, c.art ?? c.id, c.name ?? c.id].join('\t') + '\n');
  }
}
NODE

# 2. Une vignette par carte : l'art recadré, le nom au pied, sur fond de suie.
while IFS=$'\t' read -r element rarete id art nom; do
  [ -z "$id" ] && continue
  convert "public/cards/$art.jpg" -resize 190x238 -background '#101014' \
    -gravity center -splice 0x22 \
    -font DejaVu-Sans -pointsize 12 -fill '#d8d2c6' -annotate +0+95 "$nom" \
    -bordercolor '#101014' -border 3 "$TRAVAIL/$element-$id.jpg"
done < "$TRAVAIL/liste.tsv"

# 3. Une planche par élément.
for element in braise sable neige eau tenebres; do
  grep -P "^$element\t" "$TRAVAIL/liste.tsv" | awk -F'\t' -v d="$TRAVAIL" '{print d"/"$1"-"$3".jpg"}' > "$TRAVAIL/$element.tiles"
  nombre=$(grep -c . "$TRAVAIL/$element.tiles" || true)
  [ "$nombre" -eq 0 ] && continue
  montage $(cat "$TRAVAIL/$element.tiles") -tile 7x -geometry +4+4 -background '#101014' "$TRAVAIL/$element-raw.jpg"
  convert "$TRAVAIL/$element-raw.jpg" -bordercolor '#101014' -border 14 \
    -background '#101014' -fill '#e8e2d4' -font DejaVu-Serif-Bold -pointsize 30 \
    -gravity northwest -splice 0x52 \
    -annotate +18+12 "$(echo "$element" | tr 'a-z' 'A-Z') — $nombre cartes" "$SORTIE/$element.jpg"
done

# 4. La planche générale, toutes cartes confondues.
awk -F'\t' -v d="$TRAVAIL" '{print d"/"$1"-"$3".jpg"}' "$TRAVAIL/liste.tsv" > "$TRAVAIL/tous.txt"
total=$(grep -c . "$TRAVAIL/tous.txt")
montage $(cat "$TRAVAIL/tous.txt") -tile 14x -geometry +3+3 -background '#101014' "$TRAVAIL/tous-raw.jpg"
resume=$(cut -f1 "$TRAVAIL/liste.tsv" | sort | uniq -c | awk '{printf "%s %s · ", toupper(substr($2,1,1)) substr($2,2), $1}' | sed 's/ · $//')
convert "$TRAVAIL/tous-raw.jpg" -bordercolor '#101014' -border 16 \
  -background '#101014' -fill '#e8e2d4' -font DejaVu-Serif-Bold -pointsize 34 \
  -gravity northwest -splice 0x54 \
  -annotate +20+12 "CATALOGUE — $total cartes illustrées · $resume" "$SORTIE/catalogue.jpg"

echo "planches écrites dans $SORTIE ($total cartes)"
