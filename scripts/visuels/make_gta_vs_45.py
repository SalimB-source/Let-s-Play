#!/usr/bin/env python3
"""Affiche Instagram 4:5 — Jason (GTA VI) contre Trevor (GTA V), en arabe.

Une seule carte, au gabarit promo maison, mais poussée plus loin :

  ┌──────────────────────────────┐
  │ [Let's Play]      [GTA V][GTA VI] │
  │        ╱▔▔▔▔▔╲               │
  │       ╱ Trevor ╲  Jason      │  ← deux portraits en biais,
  │      ╱   2013   ╲  2026      │     couture en diagonale + badge VS
  │     ╱      ( VS )     ╲      │
  │    ╱                  ╲      │
  │  الدور     بطل رئيسي        │  ← tableau comparatif : deux valeurs
  │  المدينة   ساندي شورز       │     et une étiquette centrale
  │  …                          │
  │ ██ أيهما تختار؟ اكتب في التعليقات █ │
  └──────────────────────────────┘

Le texte est en arabe (droite → gauche), composé avec HarfBuzz via
`arabic_text.py` ; seuls les nombres et « GTA V / GTA VI » restent en latin.

Sources : artworks officiels Rockstar, dans `instagram/assets/` (exclus du
dépôt : le script seul suffit à régénérer l'affiche sur une machine qui les a).

Usage :
    python3 scripts/visuels/make_gta_vs_45.py [--out DOSSIER]
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

BG_TOP = (74, 38, 146)
BG_BOT = (26, 12, 58)
CREAM = (255, 238, 196)
YELLOW = (255, 214, 25)
INK = (28, 14, 62)
WHITE = (255, 255, 255)
MUTED = (198, 188, 232)

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

MARGIN = 40
HERO = (0, 268, 1080, 886)          # bande des deux portraits
SEAM_TOP, SEAM_BOT = 606, 502        # couture en biais (x du haut, x du bas)
ROWS_TOP = 978
ROW_H = 56
CTA_TOP = 1252

# Colonne de gauche = Trevor (2013), colonne de droite = Jason (2026) : l'ordre
# de lecture arabe va de droite à gauche, donc le plus récent est à droite.
LEFT = {
    "name": "تريفور",
    "full": "تريفور فيليبس",
    "meta": "GTA V · 2013",
    "logo": "gta5-logo.png",
    "art": "gta5-trevor-artwork.jpg",
    "focus": 0.18,
    "crop": (900, 40, 1800, 1060),
}
RIGHT = {
    "name": "جيسون",
    "full": "جيسون دوفال",
    "meta": "GTA VI · 2026",
    "logo": "gta6-logo.webp",
    "art": "gta6-jason-artwork.jpg",
    "focus": 0.78,
    "crop": (900, 0, 1800, 1050),
}

# Comparatif : étiquette centrale, valeur côté Trevor, valeur côté Jason.
ROWS = [
    ("الدور", "بطل رئيسي", "بطل رئيسي"),
    ("المدينة", "ساندي شورز", "فايس سيتي"),
    ("السنة", "2013", "2026"),
    ("الماضي", "طيار سابق", "جندي سابق"),
    ("السمة", "عنف مفاجئ", "هدوء وحذر"),
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
    w, h = px(W), px(H)
    img = vgrad((w, h), [(88, 46, 168), BG_TOP, BG_BOT, (22, 10, 50)])

    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    r = np.sqrt((xx - w * 0.5) ** 2 + (yy - h * 0.36) ** 2)
    arr = np.array(img).astype(float)
    arr += (np.clip(1 - r / (w * 0.7), 0, 1) ** 1.8)[..., None] * np.array((150, 92, 255)) * 0.32
    img = Image.fromarray(np.uint8(np.clip(arr, 0, 255)), "RGB").convert("RGBA")

    d = ImageDraw.Draw(img, "RGBA")
    # Triangles pleins aux angles, comme le gabarit maison.
    d.polygon([(px(W), px(1140)), (px(W), px(CTA_TOP)), (px(W - 220), px(CTA_TOP))], fill=(84, 44, 168, 180))
    d.polygon([(px(W), px(1180)), (px(W), px(CTA_TOP)), (px(W - 110), px(CTA_TOP))], fill=(126, 74, 226, 170))
    d.polygon([(px(0), px(1160)), (px(0), px(CTA_TOP)), (px(140), px(CTA_TOP))], fill=(74, 38, 150, 160))
    d.line([(px(28), px(238)), (px(150), px(238))], fill=(255, 255, 255, 40), width=px(1))

    for cx, cy, s_, alpha in ((px(1046), px(196), px(20), 220), (px(30), px(1198), px(16), 190)):
        d.polygon([(cx, cy - s_), (cx + s_ * 0.22, cy - s_ * 0.22), (cx + s_, cy),
                   (cx + s_ * 0.22, cy + s_ * 0.22), (cx, cy + s_),
                   (cx - s_ * 0.22, cy + s_ * 0.22), (cx - s_, cy),
                   (cx - s_ * 0.22, cy - s_ * 0.22)], fill=(255, 255, 255, alpha))
    return img


def header(im):
    """Bandeau de marque : logo Let's Play à gauche, logos des jeux à droite."""
    logo = Image.open(ROOT / "public/lets-play-logo.png").convert("RGBA")
    logo = logo.crop(logo.getchannel("A").getbbox())
    lw = px(232)
    logo = logo.resize((lw, round(lw * logo.height / logo.width)), Image.Resampling.LANCZOS)
    im.alpha_composite(logo, (px(26), px(28)))
    latin(im, 28, 214, "L'INFO JEU VIDÉO, SANS FILTRE", 10, (208, 196, 238),
          face="bold", tracking=1.7)

    x = W - 26
    for hero in (RIGHT, LEFT):
        art = Image.open(ASSETS / hero["logo"]).convert("RGBA")
        art = art.crop(art.getchannel("A").getbbox())
        hh = px(112)
        art = art.resize((round(hh * art.width / art.height), hh), Image.Resampling.LANCZOS)
        im.alpha_composite(art, (px(x) - art.width, px(30)))
        x -= art.width / S + 20


def seam_x(y):
    """Abscisse de la couture à la hauteur y (droite en haut, gauche en bas)."""
    y0, y1 = HERO[1], HERO[3]
    t = (y - y0) / (y1 - y0)
    return SEAM_TOP + (SEAM_BOT - SEAM_TOP) * t


def portraits(im):
    """Deux portraits en biais : chacun remplit sa moitié, cadré sur le visage."""
    x0, y0, x1, y1 = HERO
    hero_h = y1 - y0
    half = W // 2 + 70            # débord de 70 px sous la couture : aucun vide

    left_poly = [(x0, y0), (seam_x(y0), y0), (seam_x(y1), y1), (x0, y1)]
    right_poly = [(seam_x(y0), y0), (x1, y0), (x1, y1), (seam_x(y1), y1)]

    for hero, poly, tile_x in ((LEFT, left_poly, 0), (RIGHT, right_poly, W - half)):
        tile_w, tile_h = px(half), px(hero_h)
        art = Image.open(ASSETS / hero["art"]).convert("RGB").crop(hero["crop"])
        scale = max(tile_w / art.width, tile_h / art.height)
        art = art.resize((round(art.width * scale), round(art.height * scale)), Image.Resampling.LANCZOS)
        left = max(0, min(art.width - tile_w, round((art.width - tile_w) * hero["focus"])))
        art = art.crop((left, 0, left + tile_w, tile_h))

        mask = Image.new("L", (px(W), px(H)), 0)
        ImageDraw.Draw(mask).polygon([(px(a), px(b)) for a, b in poly], fill=255)

        layer = Image.new("RGBA", (px(W), px(H)), (0, 0, 0, 0))
        layer.paste(art, (px(tile_x), px(y0)))
        im.paste(layer, (0, 0), mask)

    # Couture : ombre portée + filet lumineux, strictement dans la bande photo.
    d = ImageDraw.Draw(im, "RGBA")
    pts_top, pts_bot = (px(seam_x(y0)), px(y0)), (px(seam_x(y1)), px(y1))
    shadow = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).line([pts_top, pts_bot], fill=(10, 4, 22, 150), width=px(14))
    im.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(px(7))))
    d.line([pts_top, pts_bot], fill=(255, 255, 255, 55), width=px(2))

    # Haut et bas de la bande photo fondus dans l'encre : aucune arête.
    for band_top, up in ((y0, True), (y1 - 96, False)):
        hgt = px(96)
        ga = np.zeros((hgt, px(W), 4), dtype=float)
        gy = np.linspace(0, 1, hgt)[:, None]
        ga[..., :3] = np.array((44, 22, 94))
        ga[..., 3] = (np.clip(1 - gy, 0, 1) ** 1.1 * 200) if up else (np.clip(gy, 0, 1) ** 1.1 * 210)
        im.alpha_composite(Image.fromarray(np.uint8(ga), "RGBA"), (0, px(band_top)))


def vs_badge(im):
    """Badge VS au centre de la couture, avec éclairs de part et d'autre."""
    cx, cy = px(520), px(604)
    r = px(72)
    d = ImageDraw.Draw(im, "RGBA")

    # Halo derrière le badge.
    glow = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([cx - r - px(26), cy - r - px(26), cx + r + px(26), cy + r + px(26)],
                                 fill=YELLOW + (90,))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(px(18))))

    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=YELLOW + (255,))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=INK + (255,), width=px(7))

    f = ImageFont.truetype(str(FONTS["black"]), px(68))
    layer = Image.new("RGBA", (px(260), px(160)), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((px(130), px(80)), "VS", font=f, fill=INK, anchor="mm")
    bbox = layer.getchannel("A").getbbox()
    im.alpha_composite(layer.crop(bbox), (cx - (bbox[2] - bbox[0]) // 2, cy - (bbox[3] - bbox[1]) // 2))

    # Éclairs (petits triangles jaunes) de part et d'autre du badge.
    for side in (-1, 1):
        bx = cx + side * px(114)
        d.polygon([(bx, cy - px(34)), (bx + side * px(30), cy - px(2)),
                   (bx + side * px(6), cy + px(2)), (bx + side * px(26), cy + px(34)),
                   (bx - side * px(10), cy + px(4)), (bx + side * px(10), cy - px(2))],
                  fill=YELLOW + (235,))


def names(im):
    """Nom arabe + millésime, dans chaque moitié, en bas de la photo."""
    for hero, side in ((LEFT, "l"), (RIGHT, "r")):
        x = MARGIN + 10 if side == "l" else W - MARGIN - 10
        anchor = "la" if side == "l" else "ra"
        base_y = 744
        body = ArabicText(AR["display"], px(64))
        tw = body.width(hero["name"]) / S
        pad = 20
        box = ((x - pad, base_y - 14, x + tw + pad, base_y + 84) if side == "l"
               else (x - tw - pad, base_y - 14, x + pad, base_y + 84))
        plate = Image.new("RGBA", im.size, (0, 0, 0, 0))
        ImageDraw.Draw(plate).rounded_rectangle([px(box[0]), px(box[1]), px(box[2]), px(box[3])],
                                                radius=px(16), fill=(20, 9, 46, 205))
        im.alpha_composite(plate)

        ar_text(im, x, base_y, hero["name"], 64, WHITE, face="display", anchor=anchor)
        latin(im, x, base_y + 92, hero["meta"], 16, YELLOW, face="bold", tracking=1.4, anchor=anchor)


def table(im):
    """Tableau comparatif : une étiquette centrale, deux valeurs."""
    d = ImageDraw.Draw(im)
    d.line([(px(MARGIN), px(ROWS_TOP - 40)), (px(W - MARGIN), px(ROWS_TOP - 40))],
           fill=(255, 255, 255, 50), width=px(1))

    cx = W / 2
    for i, (label, left, right) in enumerate(ROWS):
        y = ROWS_TOP + i * ROW_H
        if i % 2:
            band = Image.new("RGBA", im.size, (0, 0, 0, 0))
            ImageDraw.Draw(band).rectangle(
                [px(MARGIN), px(y - 14), px(W - MARGIN), px(y - 14 + ROW_H)],
                fill=(255, 255, 255, 12))
            im.alpha_composite(band)
        if i:
            d.line([(px(MARGIN), px(y - 14)), (px(W - MARGIN), px(y - 14))],
                   fill=(255, 255, 255, 26), width=px(1))
        ar_text(im, cx, y + 2, label, 16, YELLOW, face="bold", anchor="ma")
        ar_text(im, cx - 84, y, left, 25, WHITE, face="regular", anchor="ra")
        ar_text(im, cx + 84, y, right, 25, WHITE, face="regular", anchor="la")


def cta(im):
    d = ImageDraw.Draw(im)
    d.rectangle([0, px(CTA_TOP), px(W), px(H)], fill=YELLOW)
    ar_text(im, W / 2 - 30, (CTA_TOP + H) / 2, "أيهما تختار؟ اكتب في التعليقات", 38, INK,
            face="display", anchor="mm")
    cx, cy = px(W / 2 + 262), px((CTA_TOP + H) / 2)
    d.line([(cx, cy - px(18)), (cx, cy + px(14))], fill=INK + (255,), width=px(7))
    d.polygon([(cx - px(13), cy + px(10)), (cx + px(13), cy + px(10)), (cx, cy + px(26))],
              fill=INK + (255,))


def build():
    im = background()
    portraits(im)
    names(im)
    vs_badge(im)
    header(im)
    table(im)
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
    base = out / "gta-jason-vs-trevor-ar-1080x1350"
    img.save(base.with_suffix(".png"), icc_profile=icc)
    img.save(base.with_suffix(".jpg"), quality=92, subsampling=0, icc_profile=icc, optimize=True)
    print(f"{base}.png  /  .jpg")


if __name__ == "__main__":
    main()
