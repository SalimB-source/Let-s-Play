#!/usr/bin/env python3
"""Visuel Instagram 4:5 — Trevor (GTA V) et Jason (GTA VI) côte à côte, en arabe.

Un seul visuel qui réunit les deux héros, dans le gabarit promo maison :

  ┌──────────────────────────────┐
  │ [Let's Play]   GTA V | GTA VI│
  │ ┌──────────────────────────┐ │
  │ │       تريفور ضد جيسون ؟    │ │  ← bandeau arrondi
  │ └──────────────────────────┘ │
  │ ┌───────────┬──────────────┐ │  ← deux fenêtres à coins coupés
  │ │  tريفور   │    جيسون     │ │
  │ │  2013     │    2026      │ │
  │ └───────────┴──────────────┘ │
  │  الماضي  …      │  الماضي …   │  ← deux colonnes de données
  │ ███ شاركنا رأيك في التعليقات █ │  ← bandeau jaune pleine largeur
  └──────────────────────────────┘

Le texte est en arabe (droite → gauche), composé avec HarfBuzz via
`arabic_text.py` ; seuls les nombres et « GTA V / GTA VI » restent en latin.

Sources : artworks officiels Rockstar, dans `instagram/assets/` (exclus du
dépôt : le script seul suffit à régénérer le visuel sur une machine qui les a).

Usage :
    python3 scripts/visuels/make_gta_duo_45.py [--out DOSSIER]
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageCms, ImageDraw, ImageFilter, ImageFont

from arabic_text import ArabicText

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
ASSETS = ROOT / "instagram/assets"

W, H, S = 1080, 1350, 2

BG_TOP = (58, 28, 122)
BG_BOT = (30, 14, 68)
PURPLE = (61, 35, 133)
CREAM = (255, 238, 196)
YELLOW = (255, 214, 25)
INK = (32, 16, 74)
WHITE = (255, 255, 255)
DIM = (196, 186, 228)

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

MARGIN = 44
BANNER = (44, 250, 1036, 382)
WINDOWS = ((34, 402, 534, 936), (546, 402, 1046, 936))   # gauche V, droite VI
COLS = ((532, 300), (1044, 300))                          # colonnes de données (droite, largeur)
ROWS_TOP = 978
ROW_GAP = 58
CTA_TOP = 1240

HEROES = [
    {
        "slug": "trevor",
        "art": "gta5-trevor-artwork.jpg",
        "logo": "gta5-logo.png",
        "name": "تريفور",
        "meta": "GTA V · 2013",
        "focus": 0.5,
        "crop": (930, 147, 1870, 1192),
        "rows": [
            ("الدور", "بطل رئيسي"),
            ("المدينة", "ساندي شورز"),
            ("الماضي", "طيار سابق"),
            ("السمة", "عنف مفاجئ"),
        ],
    },
    {
        "slug": "jason",
        "art": "gta6-jason-artwork.jpg",
        "logo": "gta6-logo.webp",
        "name": "جيسون",
        "meta": "GTA VI · 2026",
        "focus": 0.5,
        "crop": (900, 0, 1780, 979),
        "rows": [
            ("الدور", "بطل رئيسي"),
            ("المدينة", "فايس سيتي"),
            ("الماضي", "جندي سابق"),
            ("السمة", "هدوء وحذر"),
        ],
    },
]


def px(n):
    return round(n * S)


def ar_text(im, x, y, s, size, color=WHITE, *, face="bold", anchor="ra"):
    body = ArabicText(AR[face], px(size))
    body.draw(im, (px(x), px(y)), s, fill=color, anchor=anchor)
    return body.width(s) / S


def latin(im, x, y, s, size, color=WHITE, *, face="bold", tracking=0, anchor="la"):
    f = ImageFont.truetype(str(FONTS[face]), px(size))
    spacing = px(tracking)
    total = sum(f.getlength(c) for c in s) + spacing * max(0, len(s) - 1)
    if anchor[0] == "r":
        x -= total / S
    elif anchor[0] == "m":
        x -= total / (2 * S)
    d = ImageDraw.Draw(im)
    cursor = x
    for c in s:
        d.text((px(cursor), px(y)), c, font=f, fill=color)
        cursor += (f.getlength(c) + spacing) / S
    return total / S


def vgrad(size, stops):
    w, h = size
    canvas = Image.new("RGB", (1, h))
    d = ImageDraw.Draw(canvas)
    spans = len(stops) - 1
    for y in range(h):
        t = y / max(1, h - 1) * spans
        i = min(spans - 1, int(t))
        f = t - i
        c0, c1 = stops[i], stops[i + 1]
        d.point((0, y), fill=tuple(round(a + (b - a) * f) for a, b in zip(c0, c1)))
    return canvas.resize((w, h), Image.BILINEAR)


def background():
    """Violet profond, halo central, triangles et étincelles du gabarit maison."""
    w, h = px(W), px(H)
    img = vgrad((w, h), [(76, 38, 146), BG_TOP, BG_BOT, (24, 11, 54)])

    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    r = np.sqrt((xx - w * 0.5) ** 2 + (yy - h * 0.40) ** 2)
    arr = np.array(img).astype(float)
    arr += (np.clip(1 - r / (w * 0.66), 0, 1) ** 1.7)[..., None] * np.array((150, 90, 255)) * 0.30
    img = Image.fromarray(np.uint8(np.clip(arr, 0, 255)), "RGB").convert("RGBA")

    d = ImageDraw.Draw(img, "RGBA")
    d.polygon([(px(W), px(1166)), (px(W), px(CTA_TOP)), (px(W - 210), px(CTA_TOP))], fill=(84, 44, 168, 170))
    d.polygon([(px(W), px(1200)), (px(W), px(CTA_TOP)), (px(W - 104), px(CTA_TOP))], fill=(126, 74, 226, 160))
    d.polygon([(px(0), px(1180)), (px(0), px(CTA_TOP)), (px(130), px(CTA_TOP))], fill=(74, 38, 150, 150))
    d.line([(px(24), px(404)), (px(146), px(404))], fill=(255, 255, 255, 46), width=px(2))

    for cx, cy, s_, alpha in ((px(1012), px(412), px(20), 215), (px(32), px(404), px(16), 195)):
        d.polygon([(cx, cy - s_), (cx + s_ * 0.22, cy - s_ * 0.22), (cx + s_, cy),
                   (cx + s_ * 0.22, cy + s_ * 0.22), (cx, cy + s_),
                   (cx - s_ * 0.22, cy + s_ * 0.22), (cx - s_, cy),
                   (cx - s_ * 0.22, cy - s_ * 0.22)], fill=(255, 255, 255, alpha))
    return img


def header(im):
    """Logo Let's Play + les deux logos officiels des jeux."""
    logo = Image.open(ROOT / "public/lets-play-logo.png").convert("RGBA")
    logo = logo.crop(logo.getchannel("A").getbbox())
    lw = px(250)
    logo = logo.resize((lw, round(lw * logo.height / logo.width)), Image.Resampling.LANCZOS)
    im.alpha_composite(logo, (px(26), px(26)))
    latin(im, 32, 212, "L'INFO JEU VIDÉO, SANS FILTRE", 11, (188, 176, 226),
          face="bold", tracking=2.0)

    x = W - 30
    for hero in reversed(HEROES):
        art = Image.open(ASSETS / hero["logo"]).convert("RGBA")
        art = art.crop(art.getchannel("A").getbbox())
        h = px(124)
        w = round(h * art.width / art.height)
        art = art.resize((w, h), Image.Resampling.LANCZOS)
        im.alpha_composite(art, (px(x) - w, px(34)))
        x -= w / S + 22


def banner(im):
    x0, y0, x1, y1 = BANNER
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([px(x0), px(y0), px(x1), px(y1)], radius=px(42), fill=PURPLE + (246,))
    d.rounded_rectangle([px(x0), px(y0), px(x1), px(y1)], radius=px(42),
                        outline=(150, 108, 235, 90), width=px(2))
    title = "من هو الأقرب إليك؟"
    size = 62
    while size > 30 and ArabicText(AR["display"], px(size)).width(title) / S > (x1 - x0) - 90:
        size -= 2
    ar_text(im, (x0 + x1) / 2, (y0 + y1) / 2, title, size, CREAM, face="display", anchor="mm")


def photo_window(im, box, hero):
    """Fenêtre photo à coins coupés, cadrée sur le visage du personnage."""
    x0, y0, x1, y1 = box
    cut = 30
    poly = [(x0 + 18, y0), (x1 - cut, y0), (x1, y0 + cut),
            (x1, y1 - cut), (x1 - cut, y1), (x0 + cut, y1),
            (x0, y1 - cut), (x0, y0 + 18)]
    mask = Image.new("L", (px(W), px(H)), 0)
    ImageDraw.Draw(mask).polygon([(px(a), px(b)) for a, b in poly], fill=255)

    art = Image.open(ASSETS / hero["art"]).convert("RGB").crop(hero["crop"])
    tw, th = px(x1 - x0), px(y1 - y0)
    scale = max(tw / art.width, th / art.height)
    art = art.resize((round(art.width * scale), round(art.height * scale)), Image.Resampling.LANCZOS)
    # `focus` = position horizontale du sujet dans le cadre (0 → 1).
    left = round((art.width - tw) * hero["focus"])
    left = max(0, min(art.width - tw, left))
    top = round((art.height - th) * 0.5)
    art = art.crop((left, top, left + tw, top + th))

    # Fondu vers l'encre en bas de la photo : la légende s'y pose sans arête.
    fade = Image.new("L", (1, th))
    fd = ImageDraw.Draw(fade)
    band = round(th * 0.34)
    for i in range(band):
        fd.point((0, th - 1 - i), fill=round(255 * (i / band) ** 1.4))
    fade = fade.resize((tw, th), Image.BILINEAR)
    dark = Image.new("RGB", (tw, th), (26, 13, 58))
    art = Image.composite(dark, art, fade)

    shadow = Image.new("RGBA", im.size, (0, 0, 0, 0))
    shadow.paste((8, 3, 20, 210), (0, 0), mask)
    shadow = shadow.filter(ImageFilter.GaussianBlur(px(14)))
    im.alpha_composite(shadow, (0, px(10)))

    canvas = Image.new("RGBA", im.size, (0, 0, 0, 0))
    canvas.paste(art, (px(x0), px(y0)))
    im.paste(canvas, (0, 0), mask)
    ImageDraw.Draw(im).line([(px(a), px(b)) for a, b in poly] + [(px(poly[0][0]), px(poly[0][1]))],
                            fill=(255, 255, 255, 80), width=px(2))


def captions(im, heroes):
    """Bandeau de légende plein, en bas de chaque photo : jeu puis nom."""
    d = ImageDraw.Draw(im)
    for hero, (x0, y0, x1, y1) in zip(heroes, WINDOWS):
        plate = (x0, y1 - 116, x1, y1)
        d.rectangle([px(plate[0]), px(plate[1]), px(plate[2]), px(plate[3])],
                    fill=(28, 14, 62, 235))
        d.rectangle([px(plate[0]), px(plate[1]), px(plate[0] + 6), px(plate[3])],
                    fill=YELLOW + (255,))
        latin(im, x1 - 22, y1 - 104, hero["meta"], 16, YELLOW, face="bold",
              tracking=1.4, anchor="r")
        ar_text(im, x1 - 22, y1 - 74, hero["name"], 58, WHITE, face="display")


def data_columns(im, heroes):
    """Quatre lignes de données par colonne, séparées par un filet central."""
    d = ImageDraw.Draw(im)
    d.line([(px(W / 2), px(ROWS_TOP - 34)), (px(W / 2), px(CTA_TOP - 26))],
           fill=(255, 255, 255, 40), width=px(1))

    for hero, (right, width) in zip(heroes, COLS):
        y = ROWS_TOP
        for label, value in hero["rows"]:
            d.line([(px(right - width + 22), px(y - 14)), (px(right - 22), px(y - 14))],
                   fill=(255, 255, 255, 30), width=px(1))
            ar_text(im, right - 22, y, value, 25, WHITE, face="regular")
            ar_text(im, right - width + 22, y + 4, label, 16, YELLOW, face="bold", anchor="la")
            y += ROW_GAP


def cta(im):
    d = ImageDraw.Draw(im)
    d.rectangle([0, px(CTA_TOP), px(W), px(H)], fill=YELLOW)
    ar_text(im, W / 2 - 26, (CTA_TOP + H) / 2, "شاركنا اختيارك في التعليقات", 40, INK,
            face="display", anchor="mm")
    cx, cy = px(W / 2 + 236), px((CTA_TOP + H) / 2)
    d.line([(cx, cy - px(20)), (cx, cy + px(14))], fill=INK + (255,), width=px(7))
    d.polygon([(cx - px(14), cy + px(10)), (cx + px(14), cy + px(10)), (cx, cy + px(26))], fill=INK + (255,))


def build():
    im = background()
    photo_window(im, WINDOWS[0], HEROES[0])
    photo_window(im, WINDOWS[1], HEROES[1])
    captions(im, HEROES)
    banner(im)
    header(im)
    data_columns(im, HEROES)
    cta(im)
    return im.convert("RGB").resize((W, H), Image.Resampling.LANCZOS)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT / "instagram/gta-trevor-jason"))
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    img = build()
    icc = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
    base = out / "gta-trevor-jason-duo-ar-1080x1350"
    img.save(base.with_suffix(".png"), icc_profile=icc)
    img.save(base.with_suffix(".jpg"), quality=92, subsampling=0, icc_profile=icc, optimize=True)
    print(f"{base}.png  /  .jpg")


if __name__ == "__main__":
    main()
