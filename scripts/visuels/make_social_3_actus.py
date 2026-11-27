#!/usr/bin/env python3
"""Visuel social — les trois actus du 27.11.2026 (récapitulatif illustré).

Une seule image 1080 × 1350 (4:5, format Instagram / Facebook / LinkedIn),
dans la charte des cartes d'actus du site : fond `#101720`, barre jaune
`#f7d900`, titres `#e7fd52`, texte secondaire `#9fb0c0`.

Chaque actu porte un **bandeau illustré** derrière son texte : une vignette
recadrée, fortement assombrie, voilée vers la couleur du fond et très
légèrement floutée, puis effacée en dégradé vers la gauche pour que la
rubrique, le titre et le résumé restent nets.

    python3 -m pip install -r scripts/visuels/requirements.txt
    python3 scripts/visuels/make_social_3_actus.py            # écrit visuels/social/
    python3 scripts/visuels/make_social_3_actus.py --out /tmp

Les vignettes sont dans `scripts/visuels/assets/` :

- `gaming-sea-of-sorrow.webp` — visuel promotionnel de *Sea of Sorrow* (© Team Cherry)
- `tech-neuralink-n1.jpg` — implant Neuralink N1, détouré sur blanc (© Neuralink)
- `cinema-quasimodo.jpg` — Quasimodo / Vincent Cassel (© Netflix)

Si une vignette manque, le bloc concerné retombe proprement sur le fond uni.
Les textes sont figés ici : ce visuel accompagne l'édition du 27 novembre 2026
et ne se régénère pas depuis les données du site (une image datée doit rester
stable). Le script est déterministe : mêmes fontes embarquées, même rendu.
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
FONTS = HERE / "fonts"
ASSETS = HERE / "assets"
LOGO = ROOT / "public" / "lets-play-logo.png"

W, H = 1080, 1350
INK = (79, 52, 148)         # #4F3494 — violet Let's Play (fond)
BAR = (247, 217, 0)         # #f7d900 — barre d'accent
TITLE = (231, 253, 82)      # #e7fd52 — titres
WHITE = (255, 255, 255)
MUTED = (196, 184, 230)     # violet très clair — texte secondaire
RULE = (140, 118, 208)      # filet violet clair

EDITION = "27.11.2026"

# numéro, rubrique, titre, résumé, vignette, cadrage vertical (0 haut → 1 bas)
STORIES = [
    (
        "01",
        "GAMING",
        "CHERRY TIME",
        "Team Cherry présente Sea of Sorrow, l’extension gratuite\n"
        "de Hollow Knight: Silksong — 16 h, sur YouTube.",
        "gaming-sea-of-sorrow.webp",
        0.50,
    ),
    (
        "02",
        "TECH",
        "NEURALINK",
        "La FDA autorise le premier essai pivot d’un implant\n"
        "cérébral aux États-Unis, chez des patients SLA.",
        "tech-neuralink-n1.jpg",
        0.52,
    ),
    (
        "03",
        "CINÉMA",
        "QUASIMODO",
        "Vincent Cassel en Quasimodo : le Paris de 1830\n"
        "de Jean-François Richet arrive sur Netflix.",
        "cinema-quasimodo.jpg",
        0.34,
    ),
]

SOURCES = "SOURCES OFFICIELLES · TEAMCHERRY.COM.AU · NEURALINK.COM · NETFLIX.COM"

# Blocs d'actus : un bandeau illustré de 216 px par actu.
BLOCK_TOP = 516
BLOCK_H = 216
BLOCK_GAP = 16
BLOCK_LEFT = 40
BLOCK_RIGHT = W - 40
TEXT_X = 152


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size)


def recadre(src: Image.Image, box: tuple[int, int], focus: float, zoom: float) -> Image.Image:
    """Recadrage « cover » à la taille voulue, en gardant `focus` en hauteur."""
    bw, bh = box
    ratio = max(bw / src.width, bh / src.height) * zoom
    taille = (max(bw, round(src.width * ratio)), max(bh, round(src.height * ratio)))
    src = src.resize(taille, Image.LANCZOS)
    gauche = (src.width - bw) // 2
    haut = round((src.height - bh) * min(1.0, max(0.0, focus)))
    return src.crop((gauche, haut, gauche + bw, haut + bh))


def vignette(nom: str, box: tuple[int, int], focus: float) -> Image.Image | None:
    """Bandeau illustré effacé, prêt à être posé sous le texte."""
    chemin = ASSETS / nom
    if not chemin.exists():
        return None
    src = Image.open(chemin).convert("RGB")

    if nom.endswith("tech-neuralink-n1.jpg"):
        # Visuel détouré sur blanc : on l'inverse en négatif pour retrouver un
        # fond sombre cohérent avec les deux autres bandeaux (l'implant reste
        # parfaitement reconnaissable, ses fils deviennent lumineux).
        src = Image.eval(src, lambda v: 255 - v)

    tile = recadre(src, box, focus, zoom=1.04)

    # Effacement : assombrissement, voile vers le violet du fond, léger flou.
    tile = Image.blend(tile, Image.new("RGB", tile.size, (0, 0, 0)), 0.60)
    tile = Image.blend(tile, Image.new("RGB", tile.size, INK), 0.30)
    return tile.filter(ImageFilter.GaussianBlur(1.4))


def degrade(tile: Image.Image, fin: float = 0.46) -> Image.Image:
    """La vignette s'efface progressivement vers la gauche, sous le texte."""
    w, h = tile.size
    masque = Image.new("L", (w, 1))
    for x in range(w):
        k = (x / max(1, w)) / fin
        masque.putpixel((x, 0), int(255 * min(1.0, max(0.0, k)) ** 1.2))
    masque = masque.resize((w, h))
    out = Image.new("RGB", (w, h), INK)
    out.paste(tile, (0, 0), masque)
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--out",
        default=str(ROOT / "visuels" / "social"),
        help="dossier de sortie (défaut : visuels/social)",
    )
    parser.add_argument("--name", default="2026-11-27-trois-actus.png")
    args = parser.parse_args()
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    img = Image.new("RGB", (W, H), INK)

    # 1. Les trois bandeaux illustrés, posés avant tout le texte.
    bw = BLOCK_RIGHT - BLOCK_LEFT
    for index, (_, _, _, _, asset, focus) in enumerate(STORIES):
        haut = BLOCK_TOP + index * (BLOCK_H + BLOCK_GAP)
        tile = vignette(asset, (bw, BLOCK_H), focus)
        if tile is None:
            continue
        tile = degrade(tile)
        masque = Image.new("L", (bw, BLOCK_H), 0)
        ImageDraw.Draw(masque).rounded_rectangle(
            [0, 0, bw - 1, BLOCK_H - 1], radius=14, fill=255
        )
        img.paste(tile, (BLOCK_LEFT, haut), masque)

    draw = ImageDraw.Draw(img)

    # Barre d'accent à gauche, comme les cartes du site.
    draw.rectangle([0, 0, 14, H], fill=BAR)

    # Bandeau : logo + mention d'édition.
    logo = Image.open(LOGO).convert("RGBA")
    logo_w = 190
    logo_h = round(logo.height * logo_w / logo.width)
    logo = logo.resize((logo_w, logo_h), Image.LANCZOS)
    img.paste(logo, (64, 58), logo)

    draw.text(
        (W - 64, 74), "ACTUS DU JOUR", font=font("Inter-700.ttf", 26),
        fill=MUTED, anchor="ra",
    )
    draw.rectangle([64, 196, W - 64, 198], fill=RULE)

    # Date et titre principal.
    draw.text((64, 232), EDITION, font=font("Anton.ttf", 92), fill=BAR)
    draw.text((64, 336), "TROIS ACTUS,", font=font("Anton.ttf", 74), fill=WHITE)
    draw.text((64, 416), "UNE JOURNÉE.", font=font("Anton.ttf", 74), fill=TITLE)

    # 2. Le texte par-dessus les bandeaux.
    for index, (number, category, title, summary, _, _) in enumerate(STORIES):
        y = BLOCK_TOP + index * (BLOCK_H + BLOCK_GAP)
        draw.rounded_rectangle([64, y + 50, 132, y + 118], radius=10, fill=BAR)
        draw.text(
            (98, y + 84), number, font=font("Anton.ttf", 40),
            fill=(36, 22, 72), anchor="mm"
        )
        draw.text((TEXT_X, y + 38), category, font=font("Inter-700.ttf", 23), fill=MUTED)
        draw.text((TEXT_X, y + 64), title, font=font("Anton.ttf", 46), fill=TITLE)
        draw.multiline_text(
            (TEXT_X, y + 124),
            summary,
            font=font("Inter-400.ttf", 25),
            fill=WHITE,
            spacing=8,
        )

    # Pied : sources officielles uniquement (pas d'adresse de site).
    draw.rectangle([64, 1216, W - 64, 1217], fill=RULE)
    draw.text((64, 1246), SOURCES, font=font("Inter-600.ttf", 20), fill=MUTED)

    target = out_dir / args.name
    img.save(target, optimize=True)
    print(f"Visuel écrit : {target} ({W} × {H})")


if __name__ == "__main__":
    main()
