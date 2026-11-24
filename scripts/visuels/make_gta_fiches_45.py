#!/usr/bin/env python3
"""Fiches personnages Instagram 4:5 — Trevor (GTA V) et Jason (GTA VI), en arabe.

Maquette « affiche GTA » : l'illustration officielle occupe TOUTE la carte
(aucun cadre, aucun panneau flottant), un voile d'encre montant du bas porte
les informations, et le nom est composé en gros caractères penchés avec un
dégradé néon, comme les logos de la série.

  ┌──────────────────────────────┐
  │ [GTA VI · 2026]        02    │
  │                              │
  │   illustration pleine page   │
  │        (décor derrière)      │
  │                              │
  │           جيسون  (penché)    │
  │  ملف شخصي ───────            │
  │  الدور      بطل رئيسي …      │  ← voile d'encre, filets fins
  │  المدينة    فايس سيتي …       │
  │  …                           │
  │  logo · crédit               │
  └──────────────────────────────┘

Le texte est en arabe (droite → gauche), composé avec HarfBuzz via
`arabic_text.py` ; seuls les nombres et « GTA V / GTA VI » restent en latin.

Sources
- Trevor : artwork officiel Rockstar (Sandy Shores), `instagram/assets/gta5-trevor-artwork.jpg`.
- Jason : clé d'art officielle *GTA VI* (ponton de Vice City),
  `instagram/assets/gta6-jason-portrait.jpg`.

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

INK = (8, 6, 16)
PAPER = (255, 255, 255)
SOFT = (231, 225, 245)
YELLOW = (255, 214, 25)
CYAN = (34, 211, 238)
CORAL = (255, 106, 74)
VIOLET = (162, 122, 255)
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

MARGIN = 56
NAME_Y = 692          # haut de l'encre du nom penché
ROWS_TOP = 1000        # première ligne de données
ROW_GAP = 52          # hauteur d'une rangée (étiquette + valeur)


FICHES = [
    {
        "slug": "trevor",
        "art": "gta5-trevor-artwork.jpg",
        "name": "تريفور",
        "game": "GTA V",
        "year": "2013",
        "index": "01",
        "accent": YELLOW,
        # Dégradé du nom : sable → corail.
        "grad": ((255, 226, 120), (255, 96, 62)),
        # Recadrage 4:5 sur l'artwork 16:9 (Trevor + maison qui brûle).
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
        "game": "GTA VI",
        "year": "2026",
        "index": "02",
        "accent": CYAN,
        # Dégradé du nom : cyan → rose de Vice City.
        "grad": ((126, 240, 255), (255, 84, 168)),
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


def artwork(fiche):
    """Illustration officielle plein cadre, sans bordure ni cartouche."""
    art = Image.open(ASSETS / fiche["art"]).convert("RGB")
    fig = art.crop(fiche["crop"])
    scale = max(px(W) / fig.width, px(H) / fig.height)
    fig = fig.resize((round(fig.width * scale), round(fig.height * scale)), Image.Resampling.LANCZOS)
    left = (fig.width - px(W)) // 2
    top = (fig.height - px(H)) // 2
    fig = fig.crop((left, top, left + px(W), top + px(H)))
    # Étalonnage « artwork » : un peu plus saturé et contrasté que la capture.
    fig = ImageEnhance.Color(fig).enhance(1.12)
    fig = ImageEnhance.Contrast(fig).enhance(1.06)
    return fig


def scrims(im):
    """Voile d'encre montant du bas + léger fond dégradé en haut."""
    w, h = im.size
    gy = np.linspace(0, 1, h)[:, None]
    veil = np.zeros((h, w, 4), dtype=float)
    veil[..., :3] = np.array(INK)
    # Bas : l'information doit être parfaitement lisible.
    veil[..., 3] = np.clip((gy - 0.470) / 0.135, 0, 1) ** 1.35 * 250
    # Haut : juste de quoi asseoir le macaron.
    veil[..., 3] = np.maximum(veil[..., 3], np.clip((0.14 - gy) / 0.14, 0, 1) ** 1.3 * 130)

    # Vignettage léger : les coins s'éteignent, l'illustration gagne en relief.
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    veil[..., 3] = np.clip(veil[..., 3] + np.clip((r - 0.62) / 0.7, 0, 1) ** 1.4 * 120, 0, 255)
    im.alpha_composite(Image.fromarray(np.uint8(veil), "RGBA"))


def skewed(layer, k):
    """Incline un calque vers la droite (italique des logos GTA)."""
    w, h = layer.size
    out = Image.new("RGBA", (w + round(abs(k) * h), h), (0, 0, 0, 0))
    shifted = layer.transform(
        out.size,
        Image.AFFINE,
        (1, -k, k * h if k > 0 else 0, 0, 1, 0),
        resample=Image.BICUBIC,
    )
    out.alpha_composite(shifted)
    return out


def name_stack(im, fiche):
    """Nom géant penché, rempli d'un dégradé, cerclé de noir + ombre portée."""
    size = 190
    while size > 100 and ArabicText(AR["display"], px(size)).width(fiche["name"]) / S > W - 2 * MARGIN - 46:
        size -= 4
    body = ArabicText(AR["display"], px(size))

    pad = px(30)
    box_w = round(body.width(fiche["name"])) + pad * 2
    box_h = px(size) * 2 + pad * 2
    text = Image.new("RGBA", (box_w, box_h), (0, 0, 0, 0))
    body.draw(text, (box_w - pad, px(size) + pad), fiche["name"], fill=(255, 255, 255, 255), anchor="ra")

    mask = text.getchannel("A").crop(text.getchannel("A").getbbox())
    # Ombre / contour épais, comme les logos de la série.
    outline = mask.filter(ImageFilter.MaxFilter(px(9) // 2 * 2 + 1))
    outline = outline.filter(ImageFilter.GaussianBlur(px(1.2)))
    dark = Image.new("RGBA", outline.size, (9, 4, 20, 255))
    dark.putalpha(outline.point(lambda v: min(255, int(v * 1.0))))

    # Remplissage en dégradé vertical sur les seules lettres.
    c0, c1 = fiche["grad"]
    grad = Image.new("RGB", (1, mask.height))
    gd = ImageDraw.Draw(grad)
    for y in range(mask.height):
        t = y / max(1, mask.height - 1)
        gd.point((0, y), fill=tuple(round(a + (b - a) * t) for a, b in zip(c0, c1)))
    fill = grad.resize(mask.size, Image.BILINEAR).convert("RGBA")
    fill.putalpha(mask)

    k = 0.20
    fill_s, dark_s = skewed(fill, k), skewed(dark, k)
    x = px(W - MARGIN) - fill_s.width
    y = px(NAME_Y) - px(9)

    sh = Image.new("RGBA", fill_s.size, (0, 0, 0, 0))
    sh.paste((6, 3, 14, 200), (0, 0), fill_s.getchannel("A").filter(ImageFilter.GaussianBlur(px(9))))
    im.alpha_composite(sh, (x + px(4), y + px(16)))
    im.alpha_composite(dark_s, (x, y))
    im.alpha_composite(fill_s, (x, y))


def corner_tag(im, fiche):
    """Macaron du jeu en haut à gauche, numéro de série en haut à droite."""
    d = ImageDraw.Draw(im)
    label = f"{fiche['game']} · {fiche['year']}"
    f = ImageFont.truetype(str(FONTS["bold"]), px(23))
    tw = sum(f.getlength(c) for c in label) / S + (len(label) - 1) * 1.4
    d.rounded_rectangle([px(MARGIN - 22), px(42), px(MARGIN + tw + 26), px(94)],
                        radius=px(26), fill=fiche["accent"] + (255,))
    latin(im, MARGIN, 54, label, 23, INK, face="bold", tracking=1.4)

    # Numéro de série : contour seul, pour ne pas concurrencer l'illustration.
    f = ImageFont.truetype(str(FONTS["black"]), px(96))
    d.text((px(W - MARGIN), px(52)), fiche["index"], font=f, fill=(255, 255, 255, 0),
           anchor="ra", stroke_width=px(2), stroke_fill=(255, 255, 255, 165))


def data_rows(im, fiche):
    """Cinq lignes de données, sans encadré : étiquette d'accent + valeur."""
    d = ImageDraw.Draw(im)
    x = W - MARGIN
    y = ROWS_TOP
    ar_text(im, x, y - 44, "ملف شخصي", 20, fiche["accent"], face="bold")
    for i, (label, value) in enumerate(fiche["rows"]):
        if i:
            d.line([(px(MARGIN), px(y - 12)), (px(W - MARGIN), px(y - 12))],
                   fill=(255, 255, 255, 46), width=px(1))
        ar_text(im, x, y, value, 27, SOFT, face="regular")
        ar_text(im, MARGIN, y + 3, label, 17, fiche["accent"], face="bold", align="left")
        y += ROW_GAP


def footer(im, fiche):
    """Signature de la marque."""
    y = H - 66
    d = ImageDraw.Draw(im)
    d.line([(px(MARGIN), px(y - 26)), (px(W - MARGIN), px(y - 26))],
           fill=(255, 255, 255, 40), width=px(1))
    logo = Image.open(ROOT / "public/lets-play-logo.png").convert("RGBA")
    logo = logo.crop(logo.getchannel("A").getbbox())
    logo.thumbnail((px(96), px(70)), Image.Resampling.LANCZOS)
    im.alpha_composite(logo, (px(MARGIN), px(y - 22)))
    latin(im, MARGIN + 108, y - 4, "L'info jeu vidéo, sans filtre", 17, (208, 200, 230), face="semi")
    ar_text(im, W - MARGIN, y + 2, "صور رسمية من روكستار غيمز", 15, (188, 180, 212), face="regular")


def build(fiche):
    im = artwork(fiche).convert("RGBA")
    scrims(im)
    name_stack(im, fiche)
    data_rows(im, fiche)
    corner_tag(im, fiche)
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
