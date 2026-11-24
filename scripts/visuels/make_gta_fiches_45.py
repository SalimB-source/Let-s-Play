#!/usr/bin/env python3
"""Fiches personnages Instagram 4:5 — Trevor (GTA V) et Jason (GTA VI), en arabe.

Deux cartes de la même série, beaucoup plus colorées que la première version :
chaque fiche a son propre dégradé (coucher de soleil de Sandy Shores pour
Trevor, crépuscule pastel de Vice City pour Jason), un très gros numéro en
filigrane, un macaron de jeu, un panneau translucide flottant pour les
informations et une bande diagonale de la couleur du personnage.

Le texte est en arabe (sens droite → gauche), composé avec HarfBuzz via
`arabic_text.py` ; seuls les nombres et « GTA V / GTA VI » restent en latin.

Sortie : un PNG et un JPEG 1080 × 1350 par personnage, dans
`instagram/fiches-personnages/`.

Sources
- Trevor : rendu officiel Rockstar détouré, `instagram/assets/gta5-trevor-render.png`.
- Jason : clé d'art officielle *GTA VI* en portrait (Jason et Lucia sur le
  ponton), `instagram/assets/gta6-jason-portrait.jpg`.

Repères factuels : Trevor Philips, ancien pilote de l'US Air Force devenu
trafiquant d'armes et de méthamphétamine à Sandy Shores ; Jason Duval, ancien
soldat ayant grandi en Leonida parmi les trafiquants, qui tente de refaire sa
vie avec Lucia.

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

INK = (14, 10, 26)
PAPER = (255, 255, 255)
SOFT = (236, 231, 255)
YELLOW = (255, 214, 25)
CYAN = (34, 211, 238)
ORANGE = (255, 122, 61)
VIOLET = (168, 132, 255)
PINK = (255, 92, 176)

FONTS = {
    "black": HERE / "fonts/Anton.ttf",
    "bold": HERE / "fonts/Inter-700.ttf",
    "semi": HERE / "fonts/Inter-600.ttf",
}
AR = {
    "display": HERE / "fonts/Tajawal-Black.ttf",
    "bold": HERE / "fonts/Tajawal-Bold.ttf",
    "regular": HERE / "fonts/Tajawal-Regular.ttf",
}

MARGIN = 52
LABEL = "ملف شخصي"

FICHES = [
    {
        "slug": "trevor",
        "art": "gta5-trevor-render.png",
        "name": "تريفور",
        "full": "تريفور فيليبس",
        "game": "GTA V",
        "year": "2013",
        "index": "01",
        # Dégradé « désert de Sandy Shores » : ocre, orange, magenta.
        "sky": [(0.00, (86, 26, 74)), (0.34, (168, 54, 92)), (0.56, (236, 108, 62)), (0.72, (255, 176, 74))],
        "accent": YELLOW,
        "pill": (24, 16, 40),
        "cutout": True,
        "rows": [
            ("الدور", "بطل رئيسي في GTA V"),
            ("المدينة", "ساندي شورز، سان أندرياس"),
            ("الماضي", "طيار سابق في القوات الجوية"),
            ("العمل", "أسلحة ومخدّرات، ومهام بلا رحمة"),
            ("السمة", "عنف مفاجئ ووفاء غريب"),
        ],
    },
    {
        "slug": "jason",
        "art": "gta6-jason-portrait.jpg",
        "name": "جيسون",
        "full": "جيسون دوفال",
        "game": "GTA VI",
        "year": "2026",
        "index": "02",
        # Dégradé « crépuscule de Vice City » : indigo, violet, rose, cyan.
        "sky": [(0.00, (36, 22, 82)), (0.32, (96, 44, 132)), (0.55, (196, 76, 148)), (0.74, (86, 190, 214))],
        "accent": CYAN,
        "pill": (16, 22, 48),
        "cutout": False,
        # Cadrage sur Jason seul (Lucia sort du cadre) dans la clé d'art portrait.
        "crop": (0.40, 0.20, 1.0, 0.56),
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


def ar_text(im, x, y, s, size, color=PAPER, *, face="bold", align="right"):
    body = ArabicText(AR[face], px(size))
    body.draw(im, (px(x), px(y)), s, fill=color, anchor="ra" if align == "right" else "la")
    return body.width(s) / S


def latin(im, x, y, s, size, color=PAPER, *, face="bold", tracking=0, align="left"):
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


def wrap(text, size, max_w, face="regular"):
    body = ArabicText(AR[face], px(size))
    return body.wrap(text, px(max_w))


def backdrop(fiche):
    """Dégradé vertical plein cadre + halo lumineux + grain (fini « affiche »)."""
    stops = fiche["sky"]
    ys = np.linspace(0, 1, H)
    col = np.zeros((H, 3), dtype=float)
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        m = (ys >= p0) & (ys <= p1)
        t = ((ys[m] - p0) / max(1e-6, p1 - p0))[:, None]
        col[m] = np.array(c0) + (np.array(c1) - np.array(c0)) * t
    img = np.repeat(col[:, None, :], W, axis=1)

    # Grand disque lumineux : le « soleil » de l'affiche, en haut à gauche.
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    r = np.sqrt((xx - W * 0.24) ** 2 + ((yy - H * 0.06) * 1.2) ** 2)
    glow = np.clip(1 - r / (W * 0.9), 0, 1) ** 1.8
    img += glow[..., None] * np.array([255, 196, 120]) * 0.35

    # Bandes diagonales très discrètes : texture de fond.
    diag = ((xx + yy * 0.55) % 190) < 2
    img[diag] = img[diag] * 0.92 + np.array([255, 255, 255]) * 0.08

    img += np.random.default_rng(7).normal(0, 0.7, (H, W, 1))
    return Image.fromarray(np.uint8(np.clip(img, 0, 255)), "RGB").resize(
        (px(W), px(H)), Image.Resampling.BICUBIC).convert("RGBA")


def figure(fiche):
    """Personnage : détouré sur le dégradé (Trevor) ou photo en bande pleine largeur."""
    art = Image.open(ASSETS / fiche["art"]).convert("RGBA")

    if fiche["cutout"]:
        bust = art.crop((0, 0, art.width, round(art.height * 0.56)))
        target = px(760)
        scale = target / bust.height
        fig = bust.resize((max(1, round(bust.width * scale)), target), Image.Resampling.LANCZOS)
        # Liseré clair + ombre : le rendu se détache du dégradé.
        alpha = fig.getchannel("A")
        shade = Image.new("RGBA", fig.size, INK + (255,))
        shade.putalpha(alpha.filter(ImageFilter.GaussianBlur(px(16))).point(lambda v: int(v * 0.55)))
        rim = Image.new("RGBA", fig.size, fiche["accent"] + (0,))
        rim.putalpha(alpha.filter(ImageFilter.GaussianBlur(px(4))).point(lambda v: min(120, int(v * 0.5))))
        out = Image.new("RGBA", fig.size, (0, 0, 0, 0))
        out.alpha_composite(shade)
        out.alpha_composite(rim)
        out.alpha_composite(fig)
        return out, None

    # Photo : bande pleine largeur qui touche les deux bords, haut et bas éteints
    # vers le décor (aucun bord vertical visible).
    band_h = px(700)
    x0, y0, x1, y1 = fiche["crop"]
    box = (round(x0 * art.width), round(y0 * art.height), round(x1 * art.width), round(y1 * art.height))
    fig = art.crop(box)
    scale = px(W) / fig.width
    fig = fig.resize((px(W), max(band_h, round(fig.height * scale))), Image.Resampling.LANCZOS)
    top = max(0, round((fig.height - band_h) * 0.20))
    fig = fig.crop((0, top, px(W), top + band_h))
    fig = ImageEnhance.Brightness(fig.convert("RGB")).enhance(0.94)
    fig = ImageEnhance.Color(fig).enhance(1.12)
    fig = fig.convert("RGBA")

    w, h = fig.size
    yy, _ = np.mgrid[0:h, 0:w].astype(float)
    alpha = np.clip(yy / (h * 0.34), 0, 1) ** 1.35 * np.clip((h - yy) / (h * 0.30), 0, 1) ** 1.0
    mask = Image.fromarray(np.uint8(alpha * 255), "L").filter(ImageFilter.GaussianBlur(px(16)))
    return fig, mask


def header(im, fiche):
    """Sur-titre, nom arabe, nom complet et macaron du jeu, alignés à droite."""
    x = W - MARGIN
    # Macaron du jeu, en haut à gauche : GTA V / GTA VI + année.
    label = f"{fiche['game']} · {fiche['year']}"
    f = ImageFont.truetype(str(FONTS["bold"]), px(24))
    tw = f.getlength(label) / S
    d = ImageDraw.Draw(im)
    top, bottom = 46, 92
    d.rounded_rectangle([px(MARGIN), px(top), px(MARGIN + tw + 40), px(bottom)],
                        radius=px(23), fill=fiche["accent"] + (255,))
    latin(im, MARGIN + 20, top + 8, label, 24, INK, face="bold", tracking=1.4)
    # Index de la série, en pastille cerclée juste sous le macaron du jeu.
    idx_w = ImageFont.truetype(str(FONTS["bold"]), px(20)).getlength(f"{fiche['index']} / 02") / S
    d.rounded_rectangle([px(MARGIN), px(104), px(MARGIN + idx_w + 34), px(146)], radius=px(21),
                        outline=(255, 255, 255, 170), width=px(2))
    latin(im, MARGIN + 17, 112, f"{fiche['index']} / 02", 20, PAPER, face="bold", tracking=1.6)

    ar_text(im, x, 40, LABEL, 24, PAPER, face="bold")
    ar_text(im, x, 78, fiche["name"], 118, PAPER, face="display")
    ar_text(im, x, 214, fiche["full"], 32, SOFT, face="regular")
    d.line([(px(x - 120), px(258)), (px(x), px(258))], fill=fiche["accent"], width=px(6))


def panel(im, fiche):
    """Panneau translucide flottant : cinq lignes étiquette / valeur."""
    d = ImageDraw.Draw(im)
    top, bottom = 792, 1244
    d.rounded_rectangle([px(MARGIN), px(top), px(W - MARGIN), px(bottom)], radius=px(34),
                        fill=(16, 12, 32, 205))
    # Filet dégradé dans l'accent du personnage, sur le bord gauche du panneau.
    for i in range(px(bottom - top - 40)):
        a = round(255 * (1 - i / px(bottom - top - 40)) ** 2)
        d.line([(px(MARGIN + 6), px(top + 20 + i / S)), (px(MARGIN + 6), px(top + 21 + i / S))],
               fill=fiche["accent"] + (a,), width=px(6))

    x = W - MARGIN - 30
    inner = W - 2 * MARGIN - 84
    y = top + 26
    for i, (label, value) in enumerate(fiche["rows"]):
        ar_text(im, x, y, label, 18, fiche["accent"], face="bold")
        lines = wrap(value, 27, inner)
        for k, line in enumerate(lines):
            ar_text(im, x, y + 28 + k * 42, line, 27, PAPER, face="regular")
        y += 28 + len(lines) * 42 + 16
        if i < len(fiche["rows"]) - 1:
            d.line([(px(MARGIN + 34), px(y - 12)), (px(W - MARGIN - 30), px(y - 12))],
                   fill=(255, 255, 255, 46), width=px(1))


def footer(im, fiche):
    d = ImageDraw.Draw(im)
    y = 1272
    d.rounded_rectangle([px(MARGIN), px(y), px(W - MARGIN), px(1318)], radius=px(23),
                        fill=(16, 12, 32, 170))
    logo = Image.open(ROOT / "public/lets-play-logo.png").convert("RGBA")
    logo = logo.crop(logo.getchannel("A").getbbox())
    logo.thumbnail((px(78), px(56)), Image.Resampling.LANCZOS)
    im.alpha_composite(logo, (px(MARGIN + 16), px(y + 12)))
    latin(im, MARGIN + 104, y + 20, "L’info jeu vidéo, sans filtre", 17, SOFT, face="semi")
    ar_text(im, W - MARGIN - 18, y + 16, "صور رسمية من روكستار غيمز", 16, SOFT, face="regular")


def build(fiche):
    im = backdrop(fiche)
    fig, mask = figure(fiche)
    if mask is None:
        left = round(px(W) * 0.46 - fig.width / 2)
        top = px(212)
        im.alpha_composite(fig, (left, top))
    else:
        im.paste(fig, (0, px(214)), mask)
    # Fondu bas : le panneau doit se poser sur une zone calme.
    fade = Image.new("L", (px(W), px(H)), 0)
    fd = ImageDraw.Draw(fade)
    for i in range(px(420)):
        fd.line([(0, px(H) - 1 - i), (px(W), px(H) - 1 - i)], fill=round(200 * (1 - i / px(420)) ** 1.4))
    im.paste(Image.new("RGBA", (px(W), px(H)), (18, 10, 34, 255)), (0, 0), fade)
    header(im, fiche)
    panel(im, fiche)
    footer(im, fiche)
    return im.convert("RGB").resize((W, H), Image.Resampling.LANCZOS)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=ROOT / "instagram/fiches-personnages")
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    profile = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
    for fiche in FICHES:
        flat = build(fiche)
        stem = args.out / f"fiche-{fiche['slug']}-ar-1080x1350"
        png, jpg = stem.with_suffix(".png"), stem.with_suffix(".jpg")
        flat.save(png, optimize=True, icc_profile=profile)
        flat.save(jpg, quality=92, subsampling=0, optimize=True, icc_profile=profile)
        for path in (png, jpg):
            print(f"{path.relative_to(ROOT)}  {path.stat().st_size / 1024:.0f} Ko")


if __name__ == "__main__":
    main()
