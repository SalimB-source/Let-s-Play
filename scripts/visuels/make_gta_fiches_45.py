#!/usr/bin/env python3
"""Fiches personnages Instagram 4:5 — Trevor (GTA V) et Jason (GTA VI), en arabe.

Deux cartes de la même série : même gabarit, même charte, deux personnages.
Chacune est un « ملف شخصي » (fiche de personnage) : nom, rôle, ville, passé,
trait dominant — le texte est en arabe (sens droite → gauche), composé avec
HarfBuzz via `arabic_text.py`. Seuls les nombres et « GTA V / GTA VI » restent
en caractères latins.

Sortie : un PNG et un JPEG 1080 × 1350 par personnage, dans
`instagram/fiches-personnages/`.

Sources
- Trevor : rendu officiel Rockstar détouré, `instagram/assets/gta5-trevor-render.png`.
- Jason : clé d'art officielle *GTA VI* (ponton de Vice City), recadrée sur lui
  dans `instagram/assets/gta6-pier-keyart.jpg`.

Éléments factuels repris des jeux : Trevor Philips, ancien pilote de l'US Air
Force devenu trafiquant d'armes et de méthamphétamine à Sandy Shores ; Jason
Duval, ancien soldat ayant grandi en Leonida parmi les trafiquants, qui tente
de refaire sa vie avec Lucia.

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

INK = (12, 10, 18)
PAPER = (247, 245, 255)
GREY = (206, 200, 226)
YELLOW = (255, 214, 25)
CYAN = (34, 211, 238)
VIOLET = (186, 156, 255)

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
PANEL_TOP = 812

LABEL = "ملف شخصي"

FICHES = [
    {
        "slug": "trevor",
        "art": "gta5-trevor-render.png",
        "name": "تريفور",
        "full": "تريفور فيليبس",
        "game": "GTA V",
        "year": "2013",
        "color": YELLOW,
        "accent": (124, 58, 237),
        "index": "01",
        "rows": [
            ("الدور", "بطل رئيسي في GTA V"),
            ("المدينة", "ساندي شورز، سان أندرياس"),
            ("الماضي", "طيار سابق في القوات الجوية"),
            ("العمل", "أسلحة ومخدّرات، ومهام بلا رحمة"),
            ("السمة", "عنف مفاجئ ووفاء غريب"),
        ],
        # Buste : on ne garde que le haut du rendu (il va jusqu'aux pieds).
        "crop": (0.0, 0.0, 1.0, 0.54),
        "focus": 0.50,
        "cutout": True,  # PNG détouré : pas de fond à masquer
    },
    {
        "slug": "jason",
        "art": "gta6-pier-keyart.jpg",
        "name": "جيسون",
        "full": "جيسون دوفال",
        "game": "GTA VI",
        "year": "2026",
        "color": VIOLET,
        "accent": (12, 74, 110),
        "index": "02",
        "rows": [
            ("الدور", "بطل رئيسي في GTA VI"),
            ("المدينة", "فايس سيتي، ليونيدا"),
            ("الماضي", "جندي سابق نشأ بين المهرّبين"),
            ("العمل", "سرقات مع لوسيا، بحثاً عن مخرج"),
            ("السمة", "هدوء وحذر… وحياة أخرى"),
        ],
        # Jason est au centre-droit de la clé d'art du ponton.
        "crop": (0.478, 0.155, 0.725, 1.0),
        "focus": 0.50,
        "height": 764,
        "cutout": False,  # photo : masque elliptique très doux
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


def wash(accent, color):
    """Fond de carte : encre + halo de la couleur du personnage."""
    y, x = np.ogrid[:H, :W]
    glow = np.exp(-(((x - 780) / 620) ** 2 + ((y - 380) / 520) ** 2))
    ink = np.array(INK) + glow[..., None] * np.array([46, 26, 70])
    tint = np.exp(-(((x - 240) / 520) ** 2 + ((y - 980) / 460) ** 2))
    ink = ink + tint[..., None] * (np.array(accent) - np.array(INK)) * 0.30
    grain = np.random.default_rng(3).normal(0, 0.6, (H, W, 1))
    im = Image.fromarray(np.uint8(np.clip(ink + grain, 0, 255)), "RGB")
    return im.resize((px(W), px(H)), Image.Resampling.BICUBIC).convert("RGBA")


def figure(art: Image.Image, fiche):
    """Personnage : détouré (PNG) posé sur le fond, ou photo en bande pleine largeur.

    - cutout : on n'applique aucun rectangle, le PNG a déjà son alpha.
    - photo : on la traite en BANDE qui touche les deux bords de la carte, puis
      on éteint son haut et son bas vers l'encre. Comme elle est pleine largeur,
      aucun bord vertical ne peut apparaître.
    """
    x0, y0, x1, y1 = fiche["crop"]
    box = (round(x0 * art.width), round(y0 * art.height), round(x1 * art.width), round(y1 * art.height))
    fig = art.crop(box)

    if fiche["cutout"]:
        target_h = px(700)
        scale = target_h / fig.height
        fig = fig.resize((max(1, round(fig.width * scale)), target_h), Image.Resampling.LANCZOS)
        return fig.convert("RGBA"), fig.getchannel("A")

    # Photo : bande pleine largeur (1080 px), hauteur fixée par la mise en page.
    band_h = px(620)
    scale = (px(W) / fig.width)
    fig = fig.resize((px(W), max(band_h, round(fig.height * scale))), Image.Resampling.LANCZOS)
    top_crop = max(0, round((fig.height - band_h) * 0.22))
    fig = fig.crop((0, top_crop, px(W), top_crop + band_h))
    fig = ImageEnhance.Brightness(fig.convert("RGB")).enhance(0.78)
    fig = ImageEnhance.Contrast(fig).enhance(1.14)
    fig = Image.blend(fig, Image.new("RGB", fig.size, INK), 0.18).convert("RGBA")

    w, h = fig.size
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    alpha = np.clip(yy / (h * 0.30), 0, 1) ** 1.2
    alpha *= np.clip((h - yy) / (h * 0.22), 0, 1) ** 0.9
    mask = Image.fromarray(np.uint8(alpha * 255), "L").filter(ImageFilter.GaussianBlur(px(18)))
    return fig, mask


def wrap(text, size, max_w, face="regular"):
    """Découpe une ligne arabe sur plusieurs lignes qui tiennent dans la carte."""
    body = ArabicText(AR[face], px(size))
    return body.wrap(text, px(max_w))


def fiche_image(fiche):
    art = Image.open(ASSETS / fiche["art"]).convert("RGBA")
    im = wash(fiche["accent"], fiche["color"])
    fig, mask = figure(art, fiche)

    # Halo de la couleur du personnage derrière la silhouette : elle se détache
    # du fond sans passer par un cadre.
    halo = Image.new("RGBA", (px(W), px(H)), (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo)
    cx, cy, r = px(W * 0.5), px(430), px(400)
    for k in range(24, 0, -1):
        rr = round(r * k / 24)
        hd.ellipse([cx - rr, cy - rr, cx + rr, cy + rr],
                   fill=fiche["color"] + (round(10 * (1 - k / 24) ** 1.6),))
    im = Image.alpha_composite(im, halo)

    # Position : photo pleine largeur juste sous le bloc de titre ; détourage
    # centré sur `focus`.
    if fiche["cutout"]:
        left = round(px(W) * fiche["focus"] - fig.width / 2)
        top = px(196)
    else:
        left, top = 0, px(214)
    im.paste(fig, (left, top), mask)

    # Voile bas + voile haut : le texte garde son contraste sur l'image.
    veil = np.zeros((px(H), px(W), 4), dtype=float)
    gy = np.linspace(0, 1, px(H))[:, None]
    veil[..., :3] = np.array(INK)
    veil[..., 3] = np.clip(np.clip((gy - 0.60) / 0.26, 0, 1) ** 1.2 * 240
                           + np.clip((0.24 - gy) / 0.24, 0, 1) ** 1.9 * 232, 0, 240)
    im = Image.alpha_composite(im, Image.fromarray(np.uint8(veil), "RGBA"))
    return im


def header(im, fiche):
    """Surtitre + nom + jeu, alignés à droite (lecture arabe)."""
    x = W - MARGIN
    ar_text(im, x, 58, LABEL, 22, YELLOW, face="bold")
    latin(im, MARGIN, 60, f"FICHE {fiche['index']} / 02", 18, GREY, tracking=3.0)
    ar_text(im, x, 92, fiche["name"], 104, PAPER, face="display")
    ar_text(im, x, 216, fiche["full"], 30, GREY, face="regular")
    # Étiquette du jeu, en pastille, sous le nom complet.
    label = f"{fiche['game']} · {fiche['year']}"
    f = ImageFont.truetype(str(FONTS["semi"]), px(22))
    tw = f.getlength(label) / S
    d = ImageDraw.Draw(im)
    box = (W - MARGIN - tw - 34, 262, W - MARGIN, 306)
    d.rounded_rectangle([px(v) for v in box], radius=px(22), fill=fiche["color"] + (255,))
    latin(im, W - MARGIN - 17, 270, label, 22, INK, face="semi", tracking=1.2, align="right")
    # Filet de la couleur du personnage, côté opposé.
    d.line([(px(MARGIN), px(284)), (px(MARGIN + 96), px(284))], fill=fiche["color"], width=px(5))


def panel(im, fiche):
    """Panneau des informations : cinq lignes étiquette / valeur, en bas."""
    d = ImageDraw.Draw(im)
    top = px(PANEL_TOP)
    d.rounded_rectangle([px(MARGIN), top, px(W - MARGIN), px(1272)], radius=px(26),
                        fill=INK + (236,), outline=fiche["color"] + (110,), width=px(2))
    x = W - MARGIN - 26
    inner = W - 2 * MARGIN - 52
    y = PANEL_TOP + 24
    for i, (label, value) in enumerate(fiche["rows"]):
        ar_text(im, x, y, label, 17, fiche["color"], face="bold")
        lines = wrap(value, 26, inner)
        for k, line in enumerate(lines):
            ar_text(im, x, y + 28 + k * 40, line, 26, PAPER, face="regular")
        y += 28 + len(lines) * 40 + 16
        if i < len(fiche["rows"]) - 1:
            d.line([(px(MARGIN + 26), px(y - 12)), (px(W - MARGIN - 26), px(y - 12))],
                   fill=(70, 58, 104, 180), width=px(1))


def footer(im, fiche):
    y = 1296
    logo = Image.open(ROOT / "public/lets-play-logo.png").convert("RGBA")
    logo = logo.crop(logo.getchannel("A").getbbox())
    logo.thumbnail((px(92), px(66)), Image.Resampling.LANCZOS)
    im.alpha_composite(logo, (px(MARGIN), px(y)))
    latin(im, MARGIN + 96, y + 10, "L’info jeu vidéo, sans filtre", 16, GREY, face="semi", tracking=0.6)
    ar_text(im, W - MARGIN, y, "صور رسمية من روكستار غيمز", 16, GREY, face="regular")


def build(fiche):
    im = fiche_image(fiche)
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
