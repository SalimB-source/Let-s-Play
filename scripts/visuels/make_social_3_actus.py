#!/usr/bin/env python3
"""Visuel social multilingue — les trois actus du 27.11.2026.

Trois versions d'une même image **1080 × 1350 (4:5, Instagram / Facebook /
LinkedIn)**, dans la charte violette de Let's Play (`#4F3494`, jaune
`#f7d900`, vert acide `#e7fd52`) :

    python3 scripts/visuels/make_social_3_actus.py              # les trois
    python3 scripts/visuels/make_social_3_actus.py --lang fr    # une seule
    python3 scripts/visuels/make_social_3_actus.py --out /tmp

- `2026-11-27-trois-actus-fr.png` — français
- `2026-11-27-trois-actus-en.png` — anglais
- `2026-11-27-trois-actus-ar.png` — arabe (mise en page de droite à gauche,
  composition HarfBuzz/FreeType via `arabic_text.py`)

Chaque actu porte un **bandeau illustré** derrière son texte : vignette
recadrée, assombrie, voilée vers le violet du fond et légèrement floutée, puis
effacée en dégradé pour que rubrique, titre et résumé restent nets.

Les vignettes sont dans `scripts/visuels/assets/` (© Team Cherry, © Neuralink,
© Netflix — voir `CREDITS.txt`). Si l'une manque, le bloc retombe sur le fond
uni. Les textes sont figés ici : une image datée ne se régénère pas depuis les
données du site.

    python3 -m pip install -r scripts/visuels/requirements.txt
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from arabic_text import ArabicText

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
NUMBER_INK = (36, 22, 72)   # chiffre des pastilles, sur le jaune

EDITION = "27.11.2026"

# Blocs d'actus : un bandeau illustré de 216 px par actu.
BLOCK_TOP = 516
BLOCK_H = 216
BLOCK_GAP = 16
BLOCK_LEFT = 40
BLOCK_RIGHT = W - 40

# --------------------------------------------------------------------------
# Textes, par langue. Chaque actu : (numéro, rubrique, titre, résumé, vignette,
# cadrage vertical 0 haut → 1 bas).
# --------------------------------------------------------------------------
LANGUES = {
    "fr": {
        "dir": "ltr",
        "kicker": "ACTUS DU JOUR",
        "titre": ["TROIS ACTUS,", "UNE JOURNÉE."],
        "actus": [
            ("01", "GAMING", "CHERRY TIME",
             "Team Cherry présente Sea of Sorrow, l’extension gratuite\n"
             "de Hollow Knight: Silksong — 16 h, sur YouTube.",
             "gaming-sea-of-sorrow.webp", 0.50),
            ("02", "TECH", "NEURALINK",
             "La FDA autorise le premier essai pivot d’un implant\n"
             "cérébral aux États-Unis, chez des patients SLA.",
             "tech-neuralink-n1.jpg", 0.52),
            ("03", "CINÉMA", "QUASIMODO",
             "Vincent Cassel en Quasimodo : le Paris de 1830\n"
             "de Jean-François Richet arrive sur Netflix.",
             "cinema-quasimodo.jpg", 0.34),
        ],
        "sources": ("SOURCES OFFICIELLES · TEAMCHERRY.COM.AU · "
                    "NEURALINK.COM · NETFLIX.COM"),
    },
    "en": {
        "dir": "ltr",
        "kicker": "TODAY’S STORIES",
        "titre": ["THREE STORIES,", "ONE DAY."],
        "actus": [
            ("01", "GAMING", "CHERRY TIME",
             "Team Cherry unveils Sea of Sorrow, the free Hollow\n"
             "Knight: Silksong expansion — 4 p.m., on YouTube.",
             "gaming-sea-of-sorrow.webp", 0.50),
            ("02", "TECH", "NEURALINK",
             "The FDA clears the first pivotal trial of a brain\n"
             "implant in the US, in patients with ALS.",
             "tech-neuralink-n1.jpg", 0.52),
            ("03", "CINEMA", "QUASIMODO",
             "Vincent Cassel as Quasimodo: Jean-François Richet’s\n"
             "1830 Paris reaches Netflix.",
             "cinema-quasimodo.jpg", 0.34),
        ],
        "sources": ("OFFICIAL SOURCES · TEAMCHERRY.COM.AU · "
                    "NEURALINK.COM · NETFLIX.COM"),
    },
    "ar": {
        "dir": "rtl",
        "kicker": "أخبار اليوم",
        "titre": ["ثلاثة أخبار،", "في يوم واحد."],
        "actus": [
            ("01", "ألعاب", "تشيري تايم",
             "فريق تشيري يكشف «بحر الأحزان»، التوسعة المجانية لهولوك نايت: "
             "سيلكسونغ — 16:00 على يوتيوب.",
             "gaming-sea-of-sorrow.webp", 0.50),
            ("02", "تقنية", "نيورالينك",
             "الـ FDA تُجيز أول تجربة حاسمة لشريحة دماغية في الولايات المتحدة، "
             "لدى مرضى التصلّب الجانبي الضموري.",
             "tech-neuralink-n1.jpg", 0.52),
            ("03", "سينما", "كازيمودو",
             "فينسان كاسل في دور كازيمودو: باريس 1830 لجان فرانسوا ريشيه "
             "تصل إلى نتفليكس.",
             "cinema-quasimodo.jpg", 0.34),
        ],
        "sources": ("مصادر رسمية · TEAMCHERRY.COM.AU · NEURALINK.COM · "
                    "NETFLIX.COM"),
    },
}

FICHIERS = {
    "fr": "2026-11-27-trois-actus-fr.png",
    "en": "2026-11-27-trois-actus-en.png",
    "ar": "2026-11-27-trois-actus-ar.png",
}


# --------------------------------------------------------------------------
# Vignettes
# --------------------------------------------------------------------------
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
        # Visuel détouré sur blanc : négatif, pour retrouver un fond sombre
        # cohérent avec les deux autres bandeaux.
        src = Image.eval(src, lambda v: 255 - v)

    tile = recadre(src, box, focus, zoom=1.04)

    # Effacement : assombrissement, voile vers le violet du fond, léger flou.
    tile = Image.blend(tile, Image.new("RGB", tile.size, (0, 0, 0)), 0.60)
    tile = Image.blend(tile, Image.new("RGB", tile.size, INK), 0.30)
    return tile.filter(ImageFilter.GaussianBlur(1.4))


def degrade(tile: Image.Image, fin: float = 0.46, rtl: bool = False) -> Image.Image:
    """La vignette s'efface progressivement sous le texte (gauche, ou droite en RTL)."""
    w, h = tile.size
    masque = Image.new("L", (w, 1))
    for x in range(w):
        t = (w - 1 - x) / max(1, w - 1) if rtl else x / max(1, w - 1)
        k = t / fin
        masque.putpixel((x, 0), int(255 * min(1.0, max(0.0, k)) ** 1.2))
    masque = masque.resize((w, h))
    out = Image.new("RGB", (w, h), INK)
    out.paste(tile, (0, 0), masque)
    return out


# --------------------------------------------------------------------------
# Composition du visuel
# --------------------------------------------------------------------------
def latin(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size)


def rendre(lang: str) -> str:
    data = LANGUES[lang]
    rtl = data["dir"] == "rtl"

    # Polices : Anton/Inter en latin, Tajawal en arabe (titres plus gras).
    if rtl:
        f_kicker = ArabicText(FONTS / "Tajawal-Bold.ttf", 27)
        f_titre = ArabicText(FONTS / "Tajawal-Black.ttf", 58)
        f_cat = ArabicText(FONTS / "Tajawal-Bold.ttf", 24)
        f_titre_actu = ArabicText(FONTS / "Tajawal-Black.ttf", 42)
        f_resume = ArabicText(FONTS / "Tajawal-Regular.ttf", 27)
        f_sources = ArabicText(FONTS / "Tajawal-Bold.ttf", 21)
    else:
        f_kicker = latin("Inter-700.ttf", 26)
        f_titre = latin("Anton.ttf", 74)
        f_cat = latin("Inter-700.ttf", 23)
        f_titre_actu = latin("Anton.ttf", 46)
        f_resume = latin("Inter-400.ttf", 25)
        f_sources = latin("Inter-600.ttf", 20)
    f_date = latin("Anton.ttf", 92)
    f_num = latin("Anton.ttf", 40)

    img = Image.new("RGB", (W, H), INK)

    # 1. Les trois bandeaux illustrés, posés avant tout le texte.
    bw = BLOCK_RIGHT - BLOCK_LEFT
    for index, actus in enumerate(data["actus"]):
        asset, focus = actus[4], actus[5]
        haut = BLOCK_TOP + index * (BLOCK_H + BLOCK_GAP)
        tile = vignette(asset, (bw, BLOCK_H), focus)
        if tile is None:
            continue
        tile = degrade(tile, rtl=rtl)
        masque = Image.new("L", (bw, BLOCK_H), 0)
        ImageDraw.Draw(masque).rounded_rectangle(
            [0, 0, bw - 1, BLOCK_H - 1], radius=14, fill=255
        )
        img.paste(tile, (BLOCK_LEFT, haut), masque)

    draw = ImageDraw.Draw(img)

    # Barre d'accent : à gauche, ou à droite en arabe.
    if rtl:
        draw.rectangle([W - 14, 0, W - 1, H], fill=BAR)
    else:
        draw.rectangle([0, 0, 14, H], fill=BAR)

    # Bandeau : logo d'un côté, mention d'édition de l'autre.
    logo = Image.open(LOGO).convert("RGBA")
    logo_w = 190
    logo_h = round(logo.height * logo_w / logo.width)
    logo = logo.resize((logo_w, logo_h), Image.LANCZOS)
    img.paste(logo, (W - 64 - logo_w if rtl else 64, 58), logo)

    if rtl:
        f_kicker.draw(img, (64, 74), data["kicker"], MUTED, anchor="la")
    else:
        draw.text((W - 64, 74), data["kicker"], font=f_kicker, fill=MUTED, anchor="ra")
    draw.rectangle([64, 196, W - 64, 198], fill=RULE)

    # Date et titre principal.
    if rtl:
        draw.text((W - 64, 232), EDITION, font=f_date, fill=BAR, anchor="ra")
        for n, ligne in enumerate(data["titre"]):
            f_titre.draw(img, (W - 64, 384 + n * 84), ligne,
                         WHITE if n == 0 else TITLE, anchor="ra")
    else:
        draw.text((64, 232), EDITION, font=f_date, fill=BAR)
        draw.text((64, 336), data["titre"][0], font=f_titre, fill=WHITE)
        draw.text((64, 416), data["titre"][1], font=f_titre, fill=TITLE)

    # 2. Le texte des actus par-dessus les bandeaux.
    for index, (number, category, title, summary, _, _) in enumerate(data["actus"]):
        y = BLOCK_TOP + index * (BLOCK_H + BLOCK_GAP)

        # Pastille numérotée.
        if rtl:
            x0, x1, xc = W - 132, W - 64, W - 98
        else:
            x0, x1, xc = 64, 132, 98
        draw.rounded_rectangle([x0, y + 50, x1, y + 118], radius=10, fill=BAR)
        draw.text((xc, y + 84), number, font=f_num, fill=NUMBER_INK, anchor="mm")

        texte_x = W - 152 if rtl else 152
        ancre = "ra" if rtl else "la"

        if rtl:
            f_cat.draw(img, (texte_x, y + 28), category, MUTED, anchor=ancre)
            f_titre_actu.draw(img, (texte_x, y + 76), title, TITLE, anchor=ancre)
            # Résumé : retour à la ligne automatique, trois lignes au plus.
            lignes = f_resume.wrap(summary, texte_x - 170)
            for n, ligne in enumerate(lignes[:3]):
                f_resume.draw(img, (texte_x, y + 130 + n * 34), ligne, WHITE,
                              anchor=ancre)
        else:
            draw.text((texte_x, y + 36), category, font=f_cat, fill=MUTED)
            draw.text((texte_x, y + 64), title, font=f_titre_actu, fill=TITLE)
            draw.multiline_text(
                (texte_x, y + 124), summary, font=f_resume, fill=WHITE, spacing=8
            )

    # Pied : rappel des sources.
    draw.rectangle([64, 1216, W - 64, 1217], fill=RULE)
    if rtl:
        f_sources.draw(img, (W - 64, 1243), data["sources"], MUTED, anchor="ra")
    else:
        draw.text((64, 1246), data["sources"], font=f_sources, fill=MUTED)

    return lang, img


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--out",
        default=str(ROOT / "visuels" / "social"),
        help="dossier de sortie (défaut : visuels/social)",
    )
    parser.add_argument(
        "--lang", choices=["fr", "en", "ar", "toutes"], default="toutes",
        help="langue à produire (défaut : les trois)",
    )
    args = parser.parse_args()
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    langues = ["fr", "en", "ar"] if args.lang == "toutes" else [args.lang]
    for lang in langues:
        _, img = rendre(lang)
        target = out_dir / FICHIERS[lang]
        img.save(target, optimize=True)
        print(f"Visuel {lang} écrit : {target} ({W} × {H})")


if __name__ == "__main__":
    main()
