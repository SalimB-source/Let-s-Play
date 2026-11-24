#!/usr/bin/env python3
"""Visuel Instagram 4:5 — « Trevor (GTA V) vs Jason (GTA VI) ».

Deux bras droits, deux époques : Trevor Philips, l'imprévisible de *Grand Theft
Auto V* (2013), face à Jason Duval, le vétéran plus posé de *Grand Theft Auto
VI* (19 novembre 2026).

Mise en page : **un seul visuel, sans séparation**. Pas de cadre, pas de
couture, pas de badge « VS » : les deux personnages partagent le même décor
(une brume tirée de la clé d'art, floutée et unifiée), la même lumière et la
même échelle de visage. Les noms sont posés à même l'image, et les quatre axes
de comparaison tiennent dans la bande sombre du bas.

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
from PIL import Image, ImageCms, ImageDraw, ImageEnhance, ImageFilter, ImageFont

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
ART_TOP, ART_H = 244, 772    # bande des portraits (bas = 1016)
ROWS_TOP = 1042
ROW_H = 56

# Les deux visages sont mis à la MÊME hauteur de tête (`head_px`, en unités de
# maquette) et posés à la même hauteur dans la bande (`head_at`) : les
# personnages paraissent ainsi de la même taille, malgré un rendu en buste
# pour Trevor et un plan plus large pour Jason.
#   head / chin : sommet du crâne et bas du menton, en fractions de l'image
#   source ; le rapport des deux donne la hauteur de tête dans cette image.
TREVOR = {
    "name": "TREVOR",
    "game": "GTA V · 2013",
    "color": YELLOW,
    "points": ["Imprévisible", "Violence gratuite", "Loyauté brute", "Aucune limite"],
    "head": (0.50, 0.006),
    "chin": 0.163,
    "head_px": 150,
    "head_at": 0.075,
    "align_x": 0.50,
}

JASON = {
    "name": "JASON",
    "game": "GTA VI · 2026",
    "color": VIOLET,
    "points": ["Posé", "Violence choisie", "Doute permanent", "La famille d’abord"],
    "head": (0.46, 0.120),
    "chin": 0.267,
    "head_px": 150,
    "head_at": 0.075,
    "align_x": 0.47,
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


def cutout_portrait(source, spec, width, height):
    """Rendu détouré, mis à l'échelle commune, calé sur le crâne."""
    w, h = source.size
    head_h = max(0.01, (spec["chin"] - spec["head"][1]) * h)
    scale = (px(spec["head_px"]) * (height / px(ART_H))) / head_h
    art = source.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.Resampling.LANCZOS)
    # Le personnage complet doit tenir dans la bande : on réduit si besoin.
    if head_h * scale > height * (1 - spec["head_at"] - 0.10):
        shrink = (height * (1 - spec["head_at"] - 0.10)) / (head_h * scale)
        art = art.resize((max(1, round(art.width * shrink)), max(1, round(art.height * shrink))),
                         Image.Resampling.LANCZOS)
    return art


def photo_portrait(source, spec, width, height):
    """Photo plein cadre (Jason) : même échelle de visage, fondu bas et latéral."""
    w, h = source.size
    head_h = max(0.01, (spec["chin"] - spec["head"][1]) * h)
    scale = (px(spec["head_px"]) * (height / px(ART_H))) / head_h
    art = source.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.Resampling.LANCZOS)
    if art.width < width:
        art = art.resize((width, round(art.height * width / art.width)), Image.Resampling.LANCZOS)
    head_x, head_y = spec["head"]
    left = round(head_x * art.width - width * spec["align_x"])
    top = round(head_y * art.height - height * spec["head_at"])
    left = min(max(left, 0), max(0, art.width - width))
    top = min(max(top, 0), max(0, art.height - height))
    art = art.crop((left, top, left + width, top + height)).convert("RGBA")
    # La clé d'art est pâle : on remonte le contraste avant un voile très léger.
    art = ImageEnhance.Brightness(art.convert("RGB")).enhance(1.12).convert("RGBA")
    art = ImageEnhance.Contrast(art).enhance(1.06)
    return Image.alpha_composite(art, Image.new("RGBA", art.size, INK + (26,)))


def feather_bottom(art, height_px):
    """Fondu vers l'encre sur le bas d'un portrait, pour asseoir les noms."""
    shade = Image.new("L", art.size, 0)
    sd = ImageDraw.Draw(shade)
    for i in range(height_px):
        t = i / height_px
        sd.line([(0, art.height - height_px + i), (art.width, art.height - height_px + i)],
                fill=int(250 * t ** 1.5))
    out = art.copy()
    out.paste(Image.new("RGBA", art.size, INK + (255,)), (0, 0), shade)
    return out


def shared_world(im, trevor, jason):
    """Un seul décor : les deux personnages côte à côte, sans séparation.

    Le fond est commun (halo prune), les deux figures se chevauchent légèrement
    et partagent la même lumière basse — rien ne les coupe en deux.
    """
    band_h = px(ART_H)
    base_y = px(ART_TOP)

    # Décor commun : une brume tirée de la clé d'art (ciel et blé), floutée et
    # étirée sur toute la bande. Les deux personnages baignent ainsi dans la
    # même lumière, sans bord de photo visible.
    sky = jason.crop((0, 0, jason.width, round(jason.height * 0.42)))
    cover = max(px(W) / sky.width, band_h / sky.height)
    sky = sky.resize((round(sky.width * cover) + 2, round(sky.height * cover) + 2),
                     Image.Resampling.LANCZOS)
    wx = round((sky.width - px(W)) / 2)
    wy = round((sky.height - band_h) / 2)
    sky = sky.crop((wx, wy, wx + px(W), wy + band_h)).convert("RGB")
    sky = sky.filter(ImageFilter.GaussianBlur(px(26)))
    # Ce ciel est très clair : on le ramène dans l'ombre, plus dense à gauche.
    sky = ImageEnhance.Brightness(sky).enhance(0.62)
    world = sky.convert("RGBA")
    world = Image.alpha_composite(world, Image.new("RGBA", world.size, INK + (150,)))
    left_dim = Image.new("RGBA", world.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(left_dim)
    for x in range(px(520)):
        a = round(120 * (1 - x / px(520)) ** 1.3)
        ld.line([(x, 0), (x, band_h)], fill=INK + (a,))
    world = Image.alpha_composite(world, left_dim)
    im.alpha_composite(world, (0, base_y))

    # Jason (photo) se pose sur ce décor ; son bord gauche se fond dans l'encre.
    jason_w = px(600)
    jacket = photo_portrait(jason, JASON, jason_w, band_h)
    side = Image.new("L", jacket.size, 255)
    sd = ImageDraw.Draw(side)
    span = px(230)
    for i in range(span):
        sd.line([(i, 0), (i, jacket.height)], fill=round(255 * i / span))
    back = Image.new("RGBA", (px(W), band_h), (0, 0, 0, 0))
    back.paste(jacket, (px(W - 600), 0), side)
    # La photo de Jason commence sous le haut de la bande : on adoucit cette
    # arête horizontale pour qu'elle se dissolve dans la brume.
    top_edge = Image.new("L", (px(W), band_h), 0)
    te = ImageDraw.Draw(top_edge)
    edge = px(120)
    for i in range(edge):
        te.line([(0, i), (px(W), i)], fill=round(255 * i / edge))
    te.rectangle([0, edge, px(W), band_h], fill=255)
    back.putalpha(Image.composite(back.getchannel("A"), Image.new("L", back.size, 0), top_edge))
    back = feather_bottom(back, px(260))
    im.alpha_composite(back, (0, base_y))

    # Halo derrière Trevor : il se découpe sur la lumière, pas sur une ligne.
    glow = Image.new("RGBA", (px(W), band_h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    cx, cy, r = px(300), round(band_h * 0.46), px(330)
    for k in range(28, 0, -1):
        rr = round(r * k / 28)
        alpha = round(46 * (1 - k / 28) ** 1.6)
        gd.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=(74, 42, 104, alpha))
    im.alpha_composite(glow, (0, base_y))

    # Trevor (rendu détouré) à gauche, à la même échelle de visage.
    trevor_art = cutout_portrait(trevor, TREVOR, px(620), band_h)
    head_x, head_y = TREVOR["head"]
    # Le crâne doit tomber à `head_at` de la bande ; le buste descend ensuite
    # jusqu'au fondu bas. `left` centre la tête dans la moitié gauche.
    left = round(px(300) - head_x * trevor_art.width)
    top = round(px(TREVOR["head_at"]) * band_h - head_y * trevor_art.height)
    front = Image.new("RGBA", (px(W), band_h), (0, 0, 0, 0))
    front.paste(trevor_art, (left, top), trevor_art)
    front = feather_bottom(front, px(200))
    im.alpha_composite(front, (0, base_y))

    # Haze d'unification : une brume prune posée sur les DEUX personnages, plus
    # dense sur les bords, pour qu'ils baignent dans la même lumière.
    haze = Image.new("RGBA", (px(W), band_h), (0, 0, 0, 0))
    hd = ImageDraw.Draw(haze)
    for i in range(px(150)):
        a = round(190 * (1 - i / px(150)) ** 1.4)
        hd.line([(0, i), (px(W), i)], fill=INK + (a,))
    for i in range(px(120)):
        a = round(210 * (1 - i / px(120)) ** 1.2)
        hd.line([(0, band_h - 1 - i), (px(W), band_h - 1 - i)], fill=INK + (a,))
    # Voile latéral : les bords rentrent dans l'ombre, le centre reste éclairé.
    # Décroissance exponentielle continue (pas de marche au bord, qui laissait
    # une couture verticale visible).
    lateral = np.zeros((band_h, px(W), 4), dtype=float)
    gx = np.arange(px(W))
    falloff = np.exp(-(gx / (px(W) * 0.16)) ** 2) + np.exp(-((px(W) - 1 - gx) / (px(W) * 0.16)) ** 2)
    lateral[..., :3] = np.array(INK)
    lateral[..., 3] = np.clip(120 * falloff, 0, 255)
    im.alpha_composite(Image.fromarray(np.uint8(lateral), "RGBA"), (0, base_y))
    im.alpha_composite(haze, (0, base_y))


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
    shared_world(im, trevor, jason)
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
