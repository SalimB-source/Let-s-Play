#!/usr/bin/env python3
"""Visuel social — les trois actus du 27.11.2026 (récapitulatif).

Une seule image 1080 × 1350 (4:5, format Instagram / Facebook / LinkedIn),
dans la charte des cartes d'actus du site : fond `#101720`, barre jaune
`#f7d900`, titres `#e7fd52`, texte secondaire `#9fb0c0`.

    python3 -m pip install -r scripts/visuels/requirements.txt
    python3 scripts/visuels/make_social_3_actus.py            # écrit visuels/social/
    python3 scripts/visuels/make_social_3_actus.py --out /tmp

Les textes sont figés ici : ce visuel accompagne l'édition du 27 novembre 2026
et ne se régénère pas depuis les données du site (une image datée doit rester
stable). Le script est déterministe : mêmes fontes embarquées, même rendu.
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
FONTS = Path(__file__).resolve().parent / "fonts"
LOGO = ROOT / "public" / "lets-play-logo.png"

W, H = 1080, 1350
INK = (16, 23, 32)          # #101720 — fond des cartes d'actus
BAR = (247, 217, 0)         # #f7d900 — barre d'accent
TITLE = (231, 253, 82)      # #e7fd52 — titres
WHITE = (255, 255, 255)
MUTED = (159, 176, 192)     # #9fb0c0 — texte secondaire
DIM = (108, 124, 140)

EDITION = "27.11.2026"

STORIES = [
    (
        "01",
        "GAMING",
        "CHERRY TIME",
        "Team Cherry présente Sea of Sorrow, l’extension gratuite\n"
        "de Hollow Knight: Silksong — 16 h, sur YouTube.",
    ),
    (
        "02",
        "TECH",
        "NEURALINK",
        "La FDA autorise le premier essai pivot d’un implant\n"
        "cérébral aux États-Unis, chez des patients SLA.",
    ),
    (
        "03",
        "CINÉMA",
        "QUASIMODO",
        "Vincent Cassel en Quasimodo : le Paris de 1830\n"
        "de Jean-François Richet arrive sur Netflix.",
    ),
]

SOURCES = "SOURCES OFFICIELLES · TEAMCHERRY.COM.AU · NEURALINK.COM · NETFLIX.COM"
SITE = "SALIMB-SOURCE.GITHUB.IO/LET-S-PLAY"


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--out",
        default=str(ROOT / "visuels" / "social"),
        help="dossier de sortie (défaut : visuels/social)",
    )
    args = parser.parse_args()
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    img = Image.new("RGB", (W, H), INK)
    draw = ImageDraw.Draw(img)

    # Barre d'accent à gauche, comme les cartes du site.
    draw.rectangle([0, 0, 14, H], fill=BAR)

    # Bandeau : logo + mention d'édition.
    logo = Image.open(LOGO).convert("RGBA")
    logo_w = 190
    logo_h = round(logo.height * logo_w / logo.width)
    logo = logo.resize((logo_w, logo_h), Image.LANCZOS)
    img.paste(logo, (64, 58), logo)

    kicker = font("Inter-700.ttf", 26)
    draw.text((W - 64, 74), "ACTUS DU JOUR", font=kicker, fill=MUTED, anchor="ra")

    # Filet de séparation du bandeau.
    draw.rectangle([64, 196, W - 64, 198], fill=(38, 48, 60))

    # Date et titre principal.
    draw.text((64, 232), EDITION, font=font("Anton.ttf", 92), fill=BAR)
    draw.text((64, 336), "TROIS ACTUS,", font=font("Anton.ttf", 74), fill=WHITE)
    draw.text((64, 416), "UNE JOURNÉE.", font=font("Anton.ttf", 74), fill=TITLE)

    # Les trois actus.
    top = 548
    gap = 228
    for index, (number, category, title, summary) in enumerate(STORIES):
        y = top + index * gap
        # Pastille numérotée.
        draw.rounded_rectangle([64, y, 132, y + 68], radius=10, fill=BAR)
        draw.text(
            (98, y + 34), number, font=font("Anton.ttf", 40), fill=INK, anchor="mm"
        )
        # Rubrique + titre.
        draw.text(
            (152, y + 4), category, font=font("Inter-700.ttf", 24), fill=MUTED
        )
        draw.text((152, y + 32), title, font=font("Anton.ttf", 50), fill=TITLE)
        # Résumé sur deux lignes.
        draw.multiline_text(
            (152, y + 96),
            summary,
            font=font("Inter-400.ttf", 27),
            fill=WHITE,
            spacing=10,
        )
        # Filet de séparation (sauf après le dernier bloc).
        if index < len(STORIES) - 1:
            draw.rectangle([64, y + 196, W - 64, y + 197], fill=(38, 48, 60))

    # Pied : sources et adresse du site.
    draw.rectangle([64, 1216, W - 64, 1217], fill=(38, 48, 60))
    small = font("Inter-600.ttf", 20)
    draw.text((64, 1244), SOURCES, font=small, fill=MUTED)
    draw.text((64, 1278), SITE, font=font("Inter-700.ttf", 22), fill=BAR)

    target = out_dir / "2026-11-27-trois-actus.png"
    img.save(target, optimize=True)
    print(f"Visuel écrit : {target} ({W} × {H})")


if __name__ == "__main__":
    main()
