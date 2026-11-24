#!/usr/bin/env python3
"""Fiches personnages Instagram 4:5 — Trevor (GTA V) et Jason (GTA VI), en arabe.

Gabarit « affiche promo Let's Play », repris du modèle fourni :

  ┌──────────────────────────────┐
  │ [Let's Play]     [GRAND … ]  │  ← logo + logo du jeu (numéral en dégradé)
  │ ┌──────────────────────────┐ │
  │ │  تريفور فيليبس ؟          │ │  ← bandeau violet arrondi, titre crème
  │ └──────────────────────────┘ │
  │ ┌──────────────────────────┐ │  ← fenêtre photo, coins coupés en biais
  │ │   artwork plein cadre    │ │
  │ └──────────────────────────┘ │
  │  الدور      بطل رئيسي …      │  ← cinq lignes, étiquettes jaunes
  │  …                           │
  │ ███ شاركنا رأيك في التعليقات █ │  ← bandeau jaune pleine largeur
  └──────────────────────────────┘

Le texte est en arabe (droite → gauche), composé avec HarfBuzz via
`arabic_text.py` ; seuls les nombres et « GTA V / GTA VI » restent en latin.
Le logo du jeu est **redessiné** (numéral en dégradé + lettrage latin), aucun
fichier de marque Rockstar n'est utilisé.

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
from PIL import Image, ImageCms, ImageDraw, ImageFilter, ImageFont

from arabic_text import ArabicText

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
ASSETS = ROOT / "instagram/assets"

W, H, S = 1080, 1350, 2

# Charte Let's Play (src/styles.css) + accents du modèle fourni.
BG_TOP = (58, 28, 122)
BG_BOT = (30, 14, 68)
PURPLE = (61, 35, 133)
PURPLE_DEEP = (33, 17, 74)
CREAM = (255, 238, 196)
YELLOW = (255, 214, 25)
INK = (32, 16, 74)
WHITE = (255, 255, 255)
MUTED = (214, 205, 240)

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

MARGIN = 44
BANNER = (64, 272, 1016, 452)      # bandeau du titre
WINDOW = (36, 452, 1044, 950)      # fenêtre photo
ROWS_TOP = 996
ROW_GAP = 45
CTA_TOP = 1250


FICHES = [
    {
        "slug": "trevor",
        "art": "gta5-trevor-artwork.jpg",
        "numeral": "V",
        "words": ("GRAND", "THEFT", "AUTO"),
        "game": "GTA V",
        "year": "2013",
        "title": "من هو تريفور فيليبس؟",
        "accent": YELLOW,
        "crop": (1010, 40, 3410, 1340),
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
        "numeral": "VI",
        "words": ("GRAND", "THEFT", "AUTO"),
        "game": "GTA VI",
        "year": "2026",
        "title": "من هو جيسون دوفال؟",
        "accent": YELLOW,
        "crop": (1550, 230, 3300, 1290),
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
    draw = ImageDraw.Draw(im)
    cursor = x
    for c in s:
        draw.text((px(cursor), px(y)), c, font=f, fill=color)
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
    """Violet profond, halo central, triangles et étincelles du modèle."""
    w, h = px(W), px(H)
    img = vgrad((w, h), [(76, 38, 146), BG_TOP, BG_BOT, (24, 11, 54)])

    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    r = np.sqrt((xx - w * 0.5) ** 2 + (yy - h * 0.42) ** 2)
    arr = np.array(img).astype(float)
    arr += (np.clip(1 - r / (w * 0.62), 0, 1) ** 1.7)[..., None] * np.array((150, 90, 255)) * 0.30
    img = Image.fromarray(np.uint8(np.clip(arr, 0, 255)), "RGB").convert("RGBA")

    d = ImageDraw.Draw(img, "RGBA")
    # Triangles pleins, coin bas droit et coin haut gauche.
    d.polygon([(px(W), px(1160)), (px(W), px(1250)), (px(W - 210), px(1250))], fill=(84, 44, 168, 170))
    d.polygon([(px(W), px(1192)), (px(W), px(1250)), (px(W - 104), px(1250))], fill=(126, 74, 226, 160))
    d.polygon([(px(0), px(1180)), (px(0), px(1250)), (px(130), px(1250))], fill=(74, 38, 150, 150))

    # Filets en biais, discrets, aux angles.
    d.line([(px(24), px(424)), (px(146), px(424))], fill=(255, 255, 255, 46), width=px(2))

    # Étincelles à quatre branches.
    for cx, cy, s_, alpha in ((px(1018), px(478), px(22), 225), (px(34), px(462), px(18), 200)):
        d.polygon([(cx, cy - s_), (cx + s_ * 0.22, cy - s_ * 0.22), (cx + s_, cy),
                   (cx + s_ * 0.22, cy + s_ * 0.22), (cx, cy + s_),
                   (cx - s_ * 0.22, cy + s_ * 0.22), (cx - s_, cy),
                   (cx - s_ * 0.22, cy - s_ * 0.22)], fill=(255, 255, 255, alpha))
    return img


def logo_lets_play(im):
    logo = Image.open(ROOT / "public/lets-play-logo.png").convert("RGBA")
    logo = logo.crop(logo.getchannel("A").getbbox())
    w = px(296)
    logo = logo.resize((w, round(w * logo.height / logo.width)), Image.Resampling.LANCZOS)
    im.alpha_composite(logo, (px(30), px(18)))


def logo_game(im, fiche):
    """Logo du jeu redessiné : numéral en dégradé + lettrage latin empilé."""
    right = W - 44
    # Numéral : dégradé rose → orange → bleu, contour noir épais.
    size = 236 if fiche["numeral"] == "V" else 206
    f = ImageFont.truetype(str(FONTS["black"]), px(size))
    box = (px(320), px(size * 1.5))
    layer = Image.new("RGBA", box, (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((box[0] // 2, box[1] // 2), fiche["numeral"],
                               font=f, fill=(255, 255, 255, 255), anchor="mm")
    bbox = layer.getchannel("A").getbbox()
    mask = layer.getchannel("A").crop(bbox)
    fill = vgrad(mask.size, [(255, 96, 190), (255, 122, 96), (255, 196, 96), (120, 170, 255)])
    fill.putalpha(mask)
    num_w = mask.width / S

    words_w = 178
    num_x = right - words_w - 18 - num_w
    num_y = 44
    # Contour : même glyphe, gonflé puis noirci sous le remplissage.
    outline = mask.filter(ImageFilter.MaxFilter(px(7) // 2 * 2 + 1))
    dark = Image.new("RGBA", outline.size, (12, 6, 26, 255))
    dark.putalpha(outline)
    im.alpha_composite(dark, (px(num_x - 4), px(num_y - 4)))
    im.alpha_composite(fill, (px(num_x), px(num_y)))

    # Lettrage empilé, blanc, contour noir, aligné à droite.
    fw = ImageFont.truetype(str(FONTS["black"]), px(37))
    y = num_y + 12
    for word in fiche["words"]:
        tw = fw.getlength(word) / S
        ImageDraw.Draw(im).text((px(right), px(y)), word, font=fw, fill=WHITE, anchor="ra",
                                stroke_width=px(4), stroke_fill=(18, 8, 34))
        y += 44
        _ = tw


def banner(im, fiche):
    """Bandeau du titre : rectangle arrondi violet, texte crème."""
    x0, y0, x1, y1 = BANNER
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([px(x0), px(y0), px(x1), px(y1)], radius=px(44), fill=PURPLE + (246,))
    d.rounded_rectangle([px(x0), px(y0), px(x1), px(y1)], radius=px(44),
                        outline=(150, 108, 235, 90), width=px(2))

    size = 60
    while size > 30 and ArabicText(AR["display"], px(size)).width(fiche["title"]) / S > (x1 - x0) - 90:
        size -= 2
    ar_text(im, (x0 + x1) / 2, (y0 + y1) / 2, fiche["title"], size, CREAM,
            face="display", anchor="mm")


def photo_window(im, fiche):
    """Fenêtre photo à coins coupés, ombre portée, léger liseré clair."""
    x0, y0, x1, y1 = WINDOW
    cut, notch = 34, 22
    poly = [
        (x0 + notch, y0), (x1 - cut, y0), (x1, y0 + cut),
        (x1, y1 - cut), (x1 - cut, y1), (x0 + cut, y1),
        (x0, y1 - cut), (x0, y0 + notch),
    ]
    mask = Image.new("L", (px(W), px(H)), 0)
    ImageDraw.Draw(mask).polygon([(px(a), px(b)) for a, b in poly], fill=255)

    art = Image.open(ASSETS / fiche["art"]).convert("RGB").crop(fiche["crop"])
    tw, th = px(x1 - x0), px(y1 - y0)
    scale = max(tw / art.width, th / art.height)
    art = art.resize((round(art.width * scale), round(art.height * scale)), Image.Resampling.LANCZOS)
    art = art.crop(((art.width - tw) // 2, (art.height - th) // 2,
                    (art.width - tw) // 2 + tw, (art.height - th) // 2 + th))

    shadow = Image.new("RGBA", im.size, (0, 0, 0, 0))
    shadow.paste((8, 3, 20, 210), (0, 0), mask)
    shadow = shadow.filter(ImageFilter.GaussianBlur(px(16)))
    im.alpha_composite(shadow, (px(0), px(12)))

    canvas = Image.new("RGBA", im.size, (0, 0, 0, 0))
    canvas.paste(art, (px(x0), px(y0)))
    im.paste(canvas, (0, 0), mask)

    d = ImageDraw.Draw(im)
    d.line([(px(a), px(b)) for a, b in poly] + [(px(poly[0][0]), px(poly[0][1]))],
           fill=(255, 255, 255, 70), width=px(2))


def data_rows(im, fiche):
    """Cinq lignes de données sur le violet, étiquettes jaunes."""
    d = ImageDraw.Draw(im)
    y = ROWS_TOP
    for i, (label, value) in enumerate(fiche["rows"]):
        if i:
            d.line([(px(MARGIN), px(y - 11)), (px(W - MARGIN), px(y - 11))],
                   fill=(255, 255, 255, 34), width=px(1))
        ar_text(im, W - MARGIN, y, value, 26, WHITE, face="regular")
        ar_text(im, MARGIN, y + 4, label, 18, YELLOW, face="bold", anchor="la")
        y += ROW_GAP


def cta(im, fiche):
    """Bandeau jaune pleine largeur, appel à commenter."""
    d = ImageDraw.Draw(im)
    d.rectangle([0, px(CTA_TOP), px(W), px(H)], fill=YELLOW)
    ar_text(im, W / 2 - 26, (CTA_TOP + H) / 2, "شاركنا رأيك في التعليقات", 42, INK,
            face="display", anchor="mm")
    # Flèche vers le bas, dessinée (pas de glyphe manquant).
    cx, cy = px(W / 2 + 232), px((CTA_TOP + H) / 2)
    d.line([(cx, cy - px(22)), (cx, cy + px(16))], fill=INK + (255,), width=px(7))
    d.polygon([(cx - px(15), cy + px(12)), (cx + px(15), cy + px(12)), (cx, cy + px(28))], fill=INK + (255,))


def build(fiche):
    im = background()
    photo_window(im, fiche)
    banner(im, fiche)
    logo_lets_play(im)
    logo_game(im, fiche)
    data_rows(im, fiche)
    cta(im, fiche)
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
