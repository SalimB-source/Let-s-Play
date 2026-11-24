#!/usr/bin/env python3
"""Visuel Instagram 4:5 — « Trevor (GTA V) vs Jason (GTA VI) ».

Deux bras droits, deux époques : Trevor Philips, l'imprévisible de *Grand Theft
Auto V* (2013), face à Jason Duval, le vétéran plus posé de *Grand Theft Auto
VI* (19 novembre 2026).

Mise en page : **sans cadres**. Les deux portraits occupent toute la largeur du
haut de la carte, dos à dos, séparés par une couture diagonale jaune / cyan ;
les noms sont posés directement sur les images et les quatre axes de
comparaison tiennent dans une bande sombre en bas.

Sortie : PNG 1080 × 1350 px (4:5) et JPEG qualité 92 pour Instagram.

Sources
- Trevor : rendu officiel Rockstar (fond transparent), fourni via
  `instagram/assets/gta5-trevor-render.png`.
- Jason : clé d'art officielle *GTA VI* (Jason et Lucia), déjà publiée sur le
  site (`public/gta6-jason-lucia-hero.jpg`), recadrée sur Jason dans
  `instagram/assets/gta6-jason.jpg`.

Usage :
    python3 scripts/visuels/make_gta_trevor_jason_45.py [--out DOSSIER]
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageCms, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
ASSETS = ROOT / "instagram/assets"

W, H, S = 1080, 1350, 2  # suréchantillonnage ×2 : lettrage et couture nets

INK = (13, 11, 20)          # fond prune presque noir
PAPER = (247, 245, 255)     # blanc cassé
GREY = (176, 170, 200)      # légendes
YELLOW = (255, 214, 25)     # accent maison
CYAN = (34, 211, 238)
VIOLET = (178, 146, 255)    # encre de Jason (lisible sur le fond prune)
RULE = (58, 47, 87)

FONTS = {
    "black": HERE / "fonts/Anton.ttf",
    "bold": HERE / "fonts/Inter-700.ttf",
    "semi": HERE / "fonts/Inter-600.ttf",
    "regular": HERE / "fonts/Inter-400.ttf",
}

MARGIN = 52
SEAM = W / 2                 # couture entre les deux portraits
FEATHER = 46                 # largeur du dégradé qui fond une image dans l'autre
ART_TOP, ART_H = 244, 772    # bande des portraits (bas = 1016)
ROWS_TOP = 1042
ROW_H = 56

TREVOR = {
    "name": "TREVOR",
    "game": "GTA V · 2013",
    "color": YELLOW,
    "points": ["Imprévisible", "Violence gratuite", "Loyauté brute", "Aucune limite"],
    "focus": (0.50, 0.26),
    "zoom": 1.12,
}

JASON = {
    "name": "JASON",
    "game": "GTA VI · 2026",
    "color": VIOLET,
    "points": ["Posé", "Violence choisie", "Doute permanent", "La famille d’abord"],
    "focus": (0.52, 0.20),
    "zoom": 1.0,
}


def px(n):
    return round(n * S)


def font(face, size):
    return ImageFont.truetype(str(FONTS[face]), px(size))


def text(im, x, y, s, size, color=PAPER, *, face="bold", tracking=0, align="left"):
    """Écrit `s` en coordonnées de maquette et renvoie sa largeur (maquette).

    Le canevas est suréchantillonné (S = 2) : positions et tailles sont donc
    multipliées par S au tracé, sinon le texte sort deux fois trop grand.
    """
    f = font(face, size)
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


def ground():
    """Prune profond, halo violet en haut à droite, grain d'impression léger."""
    y, x = np.ogrid[:H, :W]
    glow = np.exp(-(((x - 950) / 620) ** 2 + ((y - 90) / 400) ** 2))
    ink = np.array(INK) + glow[..., None] * np.array([60, 30, 96])
    grain = np.random.default_rng(11).normal(0, 0.7, (H, W, 1))
    im = Image.fromarray(np.uint8(np.clip(ink + grain, 0, 255)), "RGB")
    return im.resize((px(W), px(H)), Image.Resampling.BICUBIC).convert("RGBA")


def panel(source, spec, width, height, *, cutout=False):
    """Portrait recadré à la largeur de la bande, sans bord ni cadre."""
    w, h = source.size
    scale = max(width / w, height / h) * spec.get("zoom", 1.0)
    art = source.resize((max(width, round(w * scale)), max(height, round(h * scale))),
                        Image.Resampling.LANCZOS)
    fx, fy = spec["focus"]
    left = min(max(0, round(fx * art.width - width / 2)), art.width - width)
    top = min(max(0, round(fy * art.height - height * 0.30)), art.height - height)
    art = art.crop((left, top, left + width, top + height)).convert("RGBA")
    if cutout:
        # Rendu détouré : aplat sombre teinté de l'encre du personnage, l'image
        # n'a plus de fond propre — pas de cadre, elle se fond dans la carte.
        plate = np.zeros((art.height, art.width, 3), dtype=float)
        gy, gx = np.ogrid[:art.height, :art.width]
        glow = np.exp(-(((gx - art.width * 0.42) / (art.width * 0.9)) ** 2
                        + ((gy - art.height * 0.32) / (art.height * 0.8)) ** 2))
        plate += np.array(INK) + glow[..., None] * np.array([74, 42, 104])
        back = Image.fromarray(np.uint8(np.clip(plate, 0, 255)), "RGB").convert("RGBA")
        back.alpha_composite(art)
        art = back
    # Bas de la bande : fondu vers l'encre, pour poser les noms dessus.
    shade = Image.new("L", art.size, 0)
    sd = ImageDraw.Draw(shade)
    fade_h = px(300)
    for i in range(fade_h):
        t = i / fade_h
        sd.line([(0, art.height - fade_h + i), (art.width, art.height - fade_h + i)], fill=int(250 * t ** 1.5))
    art.paste(Image.new("RGBA", art.size, INK + (255,)), (0, 0), shade)
    return art


def seam_mask(width, height, *, left_side):
    """Masque en dégradé : les deux portraits se croisent sans bord visible."""
    mask = Image.new("L", (width, height), 0)
    span = px(FEATHER)
    draw = ImageDraw.Draw(mask)
    for i in range(width):
        if left_side:
            # Opaque, puis extinction sur les derniers pixels de la couture.
            v = 255 if i <= width - span else round(255 * (width - i) / span)
        else:
            # Transparent sur la couture, puis pleinement opaque.
            v = 255 if i >= span else round(255 * i / span)
        draw.line([(i, 0), (i, height)], fill=v)
    return mask.filter(ImageFilter.GaussianBlur(px(1.5)))


def art_band(im, trevor, jason):
    """Les deux portraits dos à dos, pleine largeur, sans cadre."""
    band_h = px(ART_H)
    half = round(SEAM + FEATHER)

    left = panel(trevor, TREVOR, px(half), band_h, cutout=True)
    right = panel(jason, JASON, px(half), band_h)
    # Jason : la clé d'art est très claire (poussière, ciel) ; un voile léger
    # l'accorde au traitement sombre de la moitié gauche.
    right = Image.alpha_composite(right, Image.new("RGBA", right.size, INK + (46,)))
    layer = Image.new("RGBA", (px(W), band_h), (0, 0, 0, 0))
    layer.paste(left, (0, 0), seam_mask(px(half), band_h, left_side=True))
    layer.paste(right, (px(SEAM - FEATHER), 0), seam_mask(px(half), band_h, left_side=False))

    # Haut de la bande : un fondu court évite l'arête nette sous le titre.
    top_fade = Image.new("L", (px(W), band_h), 0)
    tf = ImageDraw.Draw(top_fade)
    for i in range(px(26)):
        tf.line([(0, i), (px(W), i)], fill=round(255 * (1 - i / px(26))))
    layer.paste(Image.new("RGBA", layer.size, INK + (255,)), (0, 0), top_fade)

    # Couture diagonale : un trait jaune, doublé d'un filet cyan.
    d = ImageDraw.Draw(layer)
    d.line([(px(SEAM - 22), 0), (px(SEAM + 22), band_h)], fill=CYAN, width=px(2))
    d.line([(px(SEAM - 26), 0), (px(SEAM + 18), band_h)], fill=YELLOW, width=px(5))
    im.alpha_composite(layer, (0, px(ART_TOP)))


def masthead(im):
    text(im, MARGIN, 56, "LET’S PLAY · COMPARATIF", 19, YELLOW, tracking=3.4)
    # « TREVOR vs JASON » sur une ligne : VS jaune intercalé, JASON en violet.
    size = 82
    x = MARGIN
    x += text(im, x, 92, "TREVOR", size, PAPER, face="black") + 16
    x += text(im, x, 116, "VS", 40, YELLOW, face="black") + 16
    text(im, x, 92, "JASON", size, VIOLET, face="black")
    text(im, MARGIN, 190, "GTA V (2013) face à GTA VI (2026) : deux bras droits, deux époques.",
         23, GREY, face="regular")
    ImageDraw.Draw(im).line([(px(MARGIN), px(230)), (px(MARGIN + 88), px(230))], fill=CYAN, width=px(4))


def vs_badge(im, cx, cy):
    r = 38
    d = ImageDraw.Draw(im)
    d.ellipse([px(cx - r - 5), px(cy - r - 5), px(cx + r + 5), px(cy + r + 5)], fill=INK)
    d.ellipse([px(cx - r), px(cy - r), px(cx + r), px(cy + r)], fill=YELLOW)
    text(im, cx, cy - 18, "VS", 33, INK, face="black", align="center")


def name_plates(im):
    """Noms posés à même l'image, bas de la bande de portraits."""
    base = ART_TOP + ART_H - 92
    text(im, MARGIN, base, TREVOR["name"], 74, PAPER, face="black")
    text(im, MARGIN + 3, base + 82, TREVOR["game"], 20, YELLOW, tracking=1.8, face="semi")
    text(im, W - MARGIN, base, JASON["name"], 74, PAPER, face="black", align="right")
    text(im, W - MARGIN, base + 82, JASON["game"], 20, VIOLET, tracking=1.8, face="semi", align="right")


def comparison(im, specs):
    """Quatre axes en vis-à-vis ; traits fins entre les rangs, pastille au centre."""
    mid = W / 2
    for i, (left, right) in enumerate(zip(specs[0]["points"], specs[1]["points"])):
        y = ROWS_TOP + i * ROW_H
        if i:
            d = ImageDraw.Draw(im)
            d.line([(px(mid - 214), px(y - 12)), (px(mid - 36), px(y - 12))], fill=RULE, width=px(1))
            d.line([(px(mid + 36), px(y - 12)), (px(mid + 214), px(y - 12))], fill=RULE, width=px(1))
        text(im, mid - 30, y, left, 24, PAPER, face="semi", align="right")
        ImageDraw.Draw(im).ellipse([px(mid - 4), px(y + 8), px(mid + 4), px(y + 16)], fill=TREVOR["color"])
        text(im, mid + 30, y, right, 24, PAPER, face="semi")


def footer(im):
    y = 1262
    ImageDraw.Draw(im).line([(px(MARGIN), px(y)), (px(W - MARGIN), px(y))], fill=RULE, width=px(2))
    logo = Image.open(ROOT / "public/lets-play-logo.png").convert("RGBA")
    logo = logo.crop(logo.getchannel("A").getbbox())
    logo.thumbnail((px(96), px(70)), Image.Resampling.LANCZOS)
    im.alpha_composite(logo, (px(MARGIN), px(y + 14)))
    text(im, W - MARGIN, y + 18, "GTA V : 2013 · GTA VI : 19 NOVEMBRE 2026", 19, GREY,
         tracking=1.2, face="semi", align="right")
    text(im, W - MARGIN, y + 46, "VISUELS OFFICIELS ROCKSTAR GAMES", 16, VIOLET, tracking=1.2, align="right")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=ROOT / "instagram/gta-trevor-jason")
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)

    trevor = Image.open(ASSETS / "gta5-trevor-render.png").convert("RGBA")
    jason = Image.open(ASSETS / "gta6-jason.jpg").convert("RGB")

    im = ground()
    masthead(im)
    art_band(im, trevor, jason)
    vs_badge(im, SEAM, ART_TOP + ART_H - 232)
    name_plates(im)
    comparison(im, (TREVOR, JASON))
    footer(im)

    # Le canevas de travail est suréchantillonné ×2 : l'export repasse à
    # 1080 × 1350 (4:5), le format attendu par Instagram.
    flat = im.convert("RGB").resize((W, H), Image.Resampling.LANCZOS)
    profile = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
    png = args.out / "gta-trevor-vs-jason-1080x1350.png"
    flat.save(png, optimize=True, icc_profile=profile)
    jpg = args.out / "gta-trevor-vs-jason-1080x1350.jpg"
    flat.save(jpg, quality=92, subsampling=0, optimize=True, icc_profile=profile)
    for path in (png, jpg):
        print(f"{path.relative_to(ROOT)}  {path.stat().st_size / 1024:.0f} Ko")


if __name__ == "__main__":
    main()
