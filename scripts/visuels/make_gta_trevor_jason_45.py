#!/usr/bin/env python3
"""Visuel Instagram 4:5 — « تريفور ضد جيسون » (Trevor vs Jason), en arabe.

Deux bras droits, deux époques : Trevor Philips (*GTA V*, 2013) face à Jason
Duval (*GTA VI*, 19 novembre 2026).

Décor : la clé d'art officielle de *GTA VI* — Jason et Lucia sur le ponton de
Vice City, palmiers, jet ski et skyline au coucher du soleil. C'est le décor
« typique » du jeu, pas un aplat de couleur. Trevor, détouré, est posé au
premier plan à gauche, à la même échelle de visage que Jason.

Texte : édition ARABE (sens de lecture droite → gauche), composée avec HarfBuzz
via `arabic_text.py` — PIL n'a pas libraqm ici, et sans façonnage les lettres
arabes se détachent. Les chiffres et les mots latins (« GTA VI », « 2013 »)
restent en caractères latins.

Sortie : PNG 1080 × 1350 px (4:5) et JPEG qualité 92 pour Instagram.

Sources
- Décor et Jason : clé d'art officielle *GTA VI* (Jason et Lucia, ponton de Vice
  City), `instagram/assets/gta6-pier-keyart.jpg`.
- Trevor : rendu officiel Rockstar détouré, `instagram/assets/gta5-trevor-render.png`.

Usage :
    python3 scripts/visuels/make_gta_trevor_jason_45.py [--out DOSSIER]
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageCms, ImageDraw, ImageEnhance, ImageFilter, ImageFont

from arabic_text import ArabicText

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
ASSETS = ROOT / "instagram/assets"

W, H, S = 1080, 1350, 2  # suréchantillonnage ×2 : lettrage et dégradés nets

INK = (13, 11, 20)
PAPER = (247, 245, 255)
GREY = (214, 208, 232)
YELLOW = (255, 214, 25)
CYAN = (34, 211, 238)
VIOLET = (186, 156, 255)

FONTS = {
    "black": HERE / "fonts/Anton.ttf",
    "bold": HERE / "fonts/Inter-700.ttf",
    "semi": HERE / "fonts/Inter-600.ttf",
    "regular": HERE / "fonts/Inter-400.ttf",
}

AR = {
    "display": HERE / "fonts/Tajawal-Black.ttf",
    "bold": HERE / "fonts/Tajawal-Bold.ttf",
    "regular": HERE / "fonts/Tajawal-Regular.ttf",
}

MARGIN = 56
ROWS_TOP = 1064
ROW_H = 58

# Textes de l'édition arabe. Les nombres restent en chiffres latins.
TREVOR = {
    "name": "تريفور",
    "game": "GTA V · 2013",
    "color": YELLOW,
    "points": ["لا يمكن التوقّع به", "عنف بلا سبب", "وفاء خام", "بلا أي حدود"],
    "head": (0.50, 0.006),
    "chin": 0.163,
    "head_px": 128,
    "head_at": 0.075,
}

JASON = {
    "name": "جيسون",
    "game": "GTA VI · 2026",
    "color": VIOLET,
    "points": ["هادئ", "عنف مُختار", "شكّ دائم", "العائلة أولاً"],
}

TITLE = "تريفور ضد جيسون"
KICKER = "مقارنة بين جيلين"
SUB = "جيل 2013 في مواجهة جيل 2026"
FOOTER_DATE = "GTA V : 2013 · GTA VI : 19 نوفمبر 2026"
FOOTER_CREDIT = "صور رسمية من روكستار غيمز"


def px(n):
    return round(n * S)


def ar(size, face="bold"):
    """Composeur arabe à la taille demandée (en unités de maquette)."""
    return ArabicText(AR[face], px(size))


def latin(im, x, y, s, size, color=PAPER, *, face="bold", tracking=0, align="left"):
    """Texte latin (ou chiffres) en coordonnées de maquette ; renvoie la largeur."""
    f = ImageFont.truetype(str(FONTS[face]), px(size))
    widths = [f.getlength(c) + px(tracking) for c in s]
    total = (sum(widths) - px(tracking)) if tracking and s else f.getlength(s)
    x0 = x if align == "left" else (x - total / S if align == "right" else x - total / (2 * S))
    draw = ImageDraw.Draw(im)
    if tracking:
        cursor = x0
        for c, w in zip(s, widths):
            draw.text((px(cursor), px(y)), c, font=f, fill=color)
            cursor += w / S
    else:
        draw.text((px(x0), px(y)), s, font=f, fill=color)
    return total / S


def ar_text(im, x, y, s, size, color=PAPER, *, face="bold", align="right"):
    """Texte arabe façonné (HarfBuzz), aligné à droite par défaut (RTL)."""
    body = ar(size, face)
    body.draw(im, (px(x), px(y)), s, fill=color, anchor="ra" if align == "right" else "la")
    return body.width(s) / S


def city_backdrop(background):
    """Le ponton de Vice City en fond de carte, réchauffé et légèrement flouté."""
    cover = max(px(W) / background.width, px(H) / background.height)
    art = background.resize((round(background.width * cover) + 2, round(background.height * cover) + 2),
                            Image.Resampling.LANCZOS)
    left = round((art.width - px(W)) * 0.42)
    top = round((art.height - px(H)) * 0.55)
    left = min(left, max(0, art.width - px(W)))
    top = min(top, max(0, art.height - px(H)))
    art = art.crop((left, top, left + px(W), top + px(H))).convert("RGB")
    art = art.filter(ImageFilter.GaussianBlur(px(1.6)))
    art = ImageEnhance.Color(art).enhance(1.06)
    return art.convert("RGBA")


def veil(im):
    """Voile de lisibilité, en bandes : le titre en haut, les lignes en bas.

    Le reste de l'image — le décor et Trevor — n'est que légèrement voilé :
    un dégradé latéral trop dense délavait le premier plan.
    """
    w, h = im.size
    gy = np.linspace(0, 1, h)[:, None]
    gx = np.linspace(0, 1, w)[None, :]
    top = np.clip((0.32 - gy) / 0.32, 0, 1) ** 1.9 * 235      # bandeau du titre
    bottom = np.clip((gy - 0.50) / 0.34, 0, 1) ** 1.6 * 228   # lignes de comparaison
    side = np.clip((gx - 0.42) / 0.58, 0, 1) ** 1.4 * 84      # colonne de texte
    alpha = np.clip(np.maximum(np.maximum(top, bottom), side) + 26, 0, 240)
    layer = np.zeros((h, w, 4), dtype=float)
    layer[..., :3] = np.array(INK)
    layer[..., 3] = alpha
    return Image.alpha_composite(im, Image.fromarray(np.uint8(layer), "RGBA"))


def cutout_trevor(trevor):
    """Buste détouré de Trevor, tête à la hauteur demandée (unités de maquette).

    Le rendu d'origine va jusqu'aux pieds : on ne garde que le buste, sinon
    Trevor occupe toute la carte et écrase le décor.
    """
    bust = trevor.crop((0, 0, trevor.width, round(trevor.height * 0.54)))
    head_h = (TREVOR["chin"] - TREVOR["head"][1]) * bust.height  # px source
    scale = px(TREVOR["head_px"]) / head_h
    return bust.resize((max(1, round(bust.width * scale)), max(1, round(bust.height * scale))),
                       Image.Resampling.LANCZOS)


def rim_and_shadow(art):
    """Liseré lumineux + ombre portée : le rendu se détache du décor photo."""
    alpha = art.getchannel("A")
    glow = alpha.filter(ImageFilter.GaussianBlur(px(3)))
    halo = Image.new("RGBA", art.size, (255, 214, 120, 0))
    halo.putalpha(glow.point(lambda v: min(150, int(v * 0.55))))
    shadow = Image.new("RGBA", art.size, INK + (255,))
    shadow.putalpha(alpha.filter(ImageFilter.GaussianBlur(px(14))).point(lambda v: int(v * 0.7)))
    out = Image.new("RGBA", art.size, (0, 0, 0, 0))
    out.alpha_composite(shadow)
    out.alpha_composite(halo)
    out.alpha_composite(art)
    return out


def masthead(im):
    """Bloc de titre arabe, aligné à droite : sur-titre, titre, sous-titre."""
    x = W - MARGIN
    latin(im, MARGIN, 62, "LET’S PLAY", 20, YELLOW, tracking=3.6, align="left")
    ar_text(im, x, 60, KICKER, 23, YELLOW, face="bold")
    ar_text(im, x, 100, TITLE, 92, PAPER, face="display")
    ar_text(im, x, 214, SUB, 27, GREY, face="regular")
    d = ImageDraw.Draw(im)
    d.line([(px(x - 92), px(258)), (px(x), px(258))], fill=CYAN, width=px(4))
    d.line([(px(MARGIN), px(258)), (px(MARGIN + 56), px(258))], fill=YELLOW, width=px(4))


def names(im):
    """Noms posés à même l'image, au-dessus des lignes de comparaison."""
    base = 966
    ar_text(im, W - MARGIN, base, TREVOR["name"], 62, PAPER, face="display")
    latin(im, W - MARGIN, base + 76, TREVOR["game"], 20, YELLOW, tracking=2.0, face="semi", align="right")
    ar_text(im, MARGIN, base, JASON["name"], 62, PAPER, face="display", align="left")
    latin(im, MARGIN, base + 76, JASON["game"], 20, VIOLET, tracking=2.0, face="semi", align="left")


def comparison(im):
    """Quatre axes en vis-à-vis : Trevor à droite (RTL), Jason à gauche."""
    mid = W / 2
    for i, (right_side, left_side) in enumerate(zip(TREVOR["points"], JASON["points"])):
        y = ROWS_TOP + i * ROW_H
        if i:
            d = ImageDraw.Draw(im)
            d.line([(px(mid + 34), px(y - 14)), (px(mid + 214), px(y - 14))], fill=(92, 74, 128), width=px(1))
            d.line([(px(mid - 214), px(y - 14)), (px(mid - 34), px(y - 14))], fill=(92, 74, 128), width=px(1))
        ar_text(im, mid - 30, y, right_side, 27, PAPER, face="bold")
        ImageDraw.Draw(im).ellipse([px(mid - 5), px(y + 12), px(mid + 5), px(y + 22)], fill=TREVOR["color"])
        ar_text(im, mid + 30, y, left_side, 27, PAPER, face="bold", align="left")


def footer(im):
    y = 1268
    ImageDraw.Draw(im).line([(px(MARGIN), px(y)), (px(W - MARGIN), px(y))], fill=(92, 74, 128), width=px(2))
    logo = Image.open(ROOT / "public/lets-play-logo.png").convert("RGBA")
    logo = logo.crop(logo.getchannel("A").getbbox())
    logo.thumbnail((px(104), px(76)), Image.Resampling.LANCZOS)
    im.alpha_composite(logo, (px(MARGIN), px(y + 14)))
    ar_text(im, W - MARGIN, y + 16, FOOTER_DATE, 20, GREY, face="regular")
    ar_text(im, W - MARGIN, y + 48, FOOTER_CREDIT, 18, VIOLET, face="regular")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=ROOT / "instagram/gta-trevor-jason")
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)

    background = Image.open(ASSETS / "gta6-pier-keyart.jpg").convert("RGB")
    trevor = Image.open(ASSETS / "gta5-trevor-render.png").convert("RGBA")

    im = city_backdrop(background)

    # Trevor au premier plan, à DROITE (l'arabe se lit de droite à gauche : il
    # ouvre la comparaison), à la même échelle de visage que Jason.
    art = rim_and_shadow(cutout_trevor(trevor))
    head_x, head_y = TREVOR["head"]
    left = round(px(W) - px(300) - head_x * art.width)
    top = round(px(300) - head_y * art.height)
    im.alpha_composite(art, (left, top))

    # Le voile passe APRÈS le personnage : il unifie le premier plan au décor
    # et laisse les textes lisibles par-dessus.
    im = veil(im)

    masthead(im)
    names(im)
    comparison(im)
    footer(im)

    flat = im.convert("RGB").resize((W, H), Image.Resampling.LANCZOS)
    profile = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
    png = args.out / "gta-trevor-vs-jason-ar-1080x1350.png"
    flat.save(png, optimize=True, icc_profile=profile)
    jpg = args.out / "gta-trevor-vs-jason-ar-1080x1350.jpg"
    flat.save(jpg, quality=92, subsampling=0, optimize=True, icc_profile=profile)
    for path in (png, jpg):
        print(f"{path.relative_to(ROOT)}  {path.stat().st_size / 1024:.0f} Ko")


if __name__ == "__main__":
    main()
