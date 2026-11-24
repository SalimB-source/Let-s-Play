#!/usr/bin/env python3
"""Fiches personnages Instagram 4:5 — Trevor (GTA V) et Jason (GTA VI), en arabe.

Maquette brandée **Let's Play** : l'illustration officielle occupe toute la
carte (aucun cadre), elle se dissout vers le bas dans l'encre de la marque, et
l'habillage reprend l'identité du site — encre `#05060F`, violet `#A855F7`,
cyan `#22D3EE`, jaune `#FFD619`, dégradé violet → cyan, chiffres Anton.

  ┌──────────────────────────────┐
  │ [logo]            01 / 02    │  ← bandeau de marque
  │  illustration plein cadre    │
  │   (trevor : sandy shores)    │
  │                              │
  │            تريفور            │  ← nom arabe, ombre jaune
  │     تريفور فيليبس            │
  ├──────────────────────────────┤  ← filet dégradé
  │  الدور       بطل رئيسي …     │
  │  المدينة     ساندي شورز …    │  ← cinq lignes, étiquette jaune
  │  …                           │
  │ [LET'S PLAY]  crédit         │
  └──────────────────────────────┘

Le texte est en arabe (droite → gauche), composé avec HarfBuzz via
`arabic_text.py` ; seuls les nombres et « GTA V / GTA VI » restent en latin.

Sources
- Trevor : artwork officiel Rockstar (Sandy Shores), `instagram/assets/gta5-trevor-artwork.jpg`.
- Jason : clé d'art officielle *GTA VI* (ponton de Vice City),
  `instagram/assets/gta6-pier-keyart.jpg`.

Usage :
    python3 scripts/visuels/make_gta_fiches_45.py [--out DOSSIER]
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

W, H, S = 1080, 1350, 2

# Charte Let's Play (src/styles.css).
BG = (5, 6, 15)
PANEL = (11, 13, 30)
INK = (238, 240, 255)
MUTED = (163, 170, 205)
DIM = (118, 124, 158)
VIOLET = (168, 85, 247)
CYAN = (34, 211, 238)
YELLOW = (255, 214, 25)

FONTS = {
    "black": HERE / "fonts/Anton.ttf",
    "bold": HERE / "fonts/Inter-700.ttf",
    "semi": HERE / "fonts/Inter-600.ttf",
    "reg": HERE / "fonts/Inter-400.ttf",
}
AR = {
    "display": HERE / "fonts/Tajawal-Black.ttf",
    "bold": HERE / "fonts/Tajawal-Bold.ttf",
    "regular": HERE / "fonts/Tajawal-Regular.ttf",
}

MARGIN = 60
PHOTO_BOTTOM = 946     # l'image se dissout jusqu'ici
ROWS_TOP = 1016
ROW_GAP = 50
PANEL_TOP = 946


FICHES = [
    {
        "slug": "trevor",
        "art": "gta5-trevor-artwork.jpg",
        "name": "تريفور",
        "full": "تريفور فيليبس",
        "game": "GTA V",
        "year": "2013",
        "index": "01",
        "accent": YELLOW,
        "crop": (1180, 0, 2908, 2160),
        "rows": [
            ("الدور", "بطل رئيسي في GTA V"),
            ("المدينة", "ساندي شورز، سان أندرياس"),
            ("الماضي", "طيار سابق في القوات الجوية"),
            ("العمل", "أسلحة ومخدّرات ومهام بلا رحمة"),
            ("السمة", "عنف مفاجئ ووفاء غريب"),
        ],
    },
    {
        "slug": "jason",
        "art": "gta6-pier-keyart.jpg",
        "name": "جيسون",
        "full": "جيسون دوفال",
        "game": "GTA VI",
        "year": "2026",
        "index": "02",
        "accent": CYAN,
        "crop": (1490, 230, 2820, 1892),
        "rows": [
            ("الدور", "بطل رئيسي في GTA VI"),
            ("المدينة", "فايس سيتي، ليونيدا"),
            ("الماضي", "جندي سابق نشأ بين المهرّبين"),
            ("العمل", "سرقات مع لوسيا، بحثاً عن مخرج"),
            ("السمة", "هدوء وحذر… وحياة أخرى"),
        ],
    },
]


def px(n):
    return round(n * S)


def ar_text(im, x, y, s, size, color=INK, *, face="bold", align="right"):
    body = ArabicText(AR[face], px(size))
    body.draw(im, (px(x), px(y)), s, fill=color, anchor="ra" if align == "right" else "la")
    return body.width(s) / S


def latin(im, x, y, s, size, color=INK, *, face="bold", tracking=0, align="left"):
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


def gradient(size, stops, horizontal=False):
    """Dégradé linéaire vertical (ou horizontal) entre plusieurs arrêts."""
    w, h = size
    n = w if horizontal else h
    canvas = Image.new("RGB", (1, n))
    d = ImageDraw.Draw(canvas)
    spans = len(stops) - 1
    for y in range(n):
        t = y / max(1, n - 1) * spans
        i = min(spans - 1, int(t))
        f = t - i
        c0, c1 = stops[i], stops[i + 1]
        d.point((0, y), fill=tuple(round(a + (b - a) * f) for a, b in zip(c0, c1)))
    return canvas.resize((w, h), Image.BILINEAR)


def canvas_base():
    """Fond d'encre : dégradé, halo violet, trame de points discrète."""
    bg = gradient((px(W), px(H)), [(6, 7, 18), (11, 13, 34), (5, 6, 15)])
    arr = np.array(bg).astype(float)

    yy, xx = np.mgrid[0:px(H), 0:px(W)].astype(float)
    # Halo violet en haut à gauche, halo cyan en bas à droite.
    r1 = np.sqrt((xx - px(W) * 0.16) ** 2 + (yy - px(H) * 0.06) ** 2)
    arr += (np.clip(1 - r1 / (px(W) * 0.9), 0, 1) ** 1.8)[..., None] * np.array(VIOLET) * 0.30
    r2 = np.sqrt((xx - px(W) * 0.96) ** 2 + (yy - px(H) * 0.28) ** 2)
    arr += (np.clip(1 - r2 / (px(W) * 0.8), 0, 1) ** 1.9)[..., None] * np.array(CYAN) * 0.16

    # Trame de points, très faible, comme les fonds du site.
    step = px(26)
    dots = ((xx % step < 1.6) & (yy % step < 1.6)).astype(float)
    arr += (dots * 26)[..., None]

    return Image.fromarray(np.uint8(np.clip(arr, 0, 255)), "RGB").resize((px(W), px(H)))


def artwork(fiche):
    """Illustration officielle plein cadre, sans bordure ni cartouche."""
    art = Image.open(ASSETS / fiche["art"]).convert("RGB")
    fig = art.crop(fiche["crop"])
    scale = max(px(W) / fig.width, px(PHOTO_BOTTOM) / fig.height)
    fig = fig.resize((round(fig.width * scale), round(fig.height * scale)), Image.Resampling.LANCZOS)
    left = (fig.width - px(W)) // 2
    fig = fig.crop((left, 0, left + px(W), px(PHOTO_BOTTOM)))
    fig = ImageEnhance.Color(fig).enhance(1.1)
    fig = ImageEnhance.Contrast(fig).enhance(1.04)
    return fig


def blend_photo(im, fig):
    """Photo pleine page : seul le bas se dissout dans l'encre (aucun cadre)."""
    mask = Image.new("L", (1, fig.height), 255)
    d = ImageDraw.Draw(mask)
    band = px(250)
    for i in range(band):
        d.point((0, fig.height - 1 - i), fill=round(255 * (i / band) ** 1.5))
    mask = mask.resize(fig.size, Image.BILINEAR)
    im.paste(fig, (0, 0), mask.filter(ImageFilter.GaussianBlur(px(2))))

    # Voile sombre en haut, uniquement pour la lisibilité du bandeau de marque.
    h, w = im.size[1], im.size[0]
    gy = np.linspace(0, 1, h)[:, None]
    veil = np.zeros((h, w, 4), dtype=float)
    veil[..., :3] = np.array(BG)
    veil[..., 3] = np.clip((0.24 - gy) / 0.24, 0, 1) ** 1.4 * 205
    im.alpha_composite(Image.fromarray(np.uint8(veil), "RGBA"))

    # Assise du nom : dégradé d'encre sur le bas de l'image, sans arête.
    veil[..., 3] = np.clip((gy - 0.545) / 0.13, 0, 1) ** 1.25 * 240
    im.alpha_composite(Image.fromarray(np.uint8(veil), "RGBA"))


def brand_bar(im, fiche):
    """Bandeau de marque : logo, mention, numéro de série et jeu."""
    # Filet supérieur dégradé : la signature chromatique du site.
    im.paste(gradient((px(W), px(5)), [VIOLET, CYAN], horizontal=True), (0, 0))

    # Logo Let's Play, à sa couleur d'origine (blanc + jaune) sur l'encre.
    logo = Image.open(ROOT / "public/lets-play-logo.png").convert("RGBA")
    logo = logo.crop(logo.getchannel("A").getbbox())
    logo.thumbnail((px(150), px(112)), Image.Resampling.LANCZOS)
    im.alpha_composite(logo, (px(MARGIN), px(40)))

    d = ImageDraw.Draw(im)

    # Numéro de série dans la charte : gros chiffre Anton, barre d'accent.
    f = ImageFont.truetype(str(FONTS["black"]), px(62))
    d.text((px(W - MARGIN), px(52)), fiche["index"], font=f, fill=INK, anchor="ra")
    tw = f.getlength(fiche["index"]) / S
    d.line([(px(W - MARGIN - tw - 14), px(66)), (px(W - MARGIN - tw - 14), px(110))],
           fill=fiche["accent"] + (255,), width=px(3))
    latin(im, W - MARGIN - tw - 26, 108, f"/ 0{len(FICHES)}", 14, DIM, face="bold", tracking=1.8, align="right")

    # Étiquette du jeu, sous le numéro.
    label = f"{fiche['game']} · {fiche['year']}"
    f2 = ImageFont.truetype(str(FONTS["bold"]), px(19))
    lw = sum(f2.getlength(c) for c in label) / S + (len(label) - 1) * 1.2
    d.rounded_rectangle([px(W - MARGIN - lw - 26), px(138), px(W - MARGIN), px(180)],
                        radius=px(21), outline=fiche["accent"] + (255,), width=px(2))
    latin(im, W - MARGIN - 13, 148, label, 19, fiche["accent"], face="bold", tracking=1.2, align="right")


def name_block(im, fiche):
    """Nom arabe, ombre jaune décalée, puis nom complet en petit."""
    size = 148
    while size > 88 and ArabicText(AR["display"], px(size)).width(fiche["name"]) / S > W - 2 * MARGIN:
        size -= 4
    body = ArabicText(AR["display"], px(size))
    x = W - MARGIN
    y = 726

    # Ombre portée dans l'accent du personnage, décalée à la manière du logo.
    ar_text(im, x + 7, y + 8, fiche["name"], size, fiche["accent"], face="display")
    ar_text(im, x, y, fiche["name"], size, (18, 12, 34), face="display")
    ar_text(im, x, y, fiche["name"], size, INK, face="display")

    ar_text(im, x, y + 168, fiche["full"], 30, fiche["accent"], face="bold")


def panel(im, fiche):
    """Panneau d'information : filet dégradé, cinq lignes, coins marqués."""
    d = ImageDraw.Draw(im)
    top = PANEL_TOP
    d.line([(px(MARGIN), px(top)), (px(W - MARGIN), px(top))], fill=(255, 255, 255, 30), width=px(1))
    bar = gradient((px(320), px(4)), [VIOLET, CYAN], horizontal=True)
    im.paste(bar, (px(MARGIN), px(top - 2)))

    # Repères d'angle, comme les cadres du site.
    for cx, cy, dx, dy in ((MARGIN, top, 1, 0), (W - MARGIN, top, -1, 0)):
        d.line([(px(cx), px(cy)), (px(cx + 26 * dx), px(cy))], fill=fiche["accent"] + (255,), width=px(2))

    y = ROWS_TOP
    for i, (label, value) in enumerate(fiche["rows"]):
        if i:
            d.line([(px(MARGIN), px(y - 16)), (px(W - MARGIN), px(y - 16))],
                   fill=(255, 255, 255, 24), width=px(1))
        ar_text(im, W - MARGIN, y, value, 26, INK, face="regular")
        ar_text(im, MARGIN, y + 4, label, 17, fiche["accent"], face="bold", align="left")
        y += ROW_GAP


def footer(im, fiche):
    """Signature : filet dégradé, marque, crédit."""
    d = ImageDraw.Draw(im)
    y = H - 58
    d.line([(px(MARGIN), px(y - 34)), (px(W - MARGIN), px(y - 34))], fill=(255, 255, 255, 26), width=px(1))

    latin(im, MARGIN, y, "LET'S PLAY", 17, INK, face="black", tracking=2.2)
    d.rectangle([px(MARGIN + 150), px(y + 2), px(MARGIN + 154), px(y + 20)],
                fill=fiche["accent"] + (255,))
    latin(im, MARGIN + 168, y + 4, "MÉDIA JEU VIDÉO INDÉPENDANT", 12, DIM, face="bold", tracking=1.6)

    ar_text(im, W - MARGIN, y + 2, "صور رسمية من روكستار غيمز", 14, DIM, face="regular")


def build(fiche):
    im = canvas_base().convert("RGBA")
    fig = artwork(fiche)
    blend_photo(im, fig)
    name_block(im, fiche)
    panel(im, fiche)
    brand_bar(im, fiche)
    footer(im, fiche)
    return im.convert("RGB").resize((W, H), Image.Resampling.LANCZOS)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT / "instagram/fiches-personnages"))
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    icc = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
    for fiche in FICHES:
        img = build(fiche)
        base = out / f"fiche-{fiche['slug']}-ar-1080x1350"
        img.save(base.with_suffix(".png"), icc_profile=icc)
        img.save(base.with_suffix(".jpg"), quality=92, subsampling=0, icc_profile=icc, optimize=True)
        print(f"{base}.png  /  .jpg")


if __name__ == "__main__":
    main()
