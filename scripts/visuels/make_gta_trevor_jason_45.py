#!/usr/bin/env python3
"""Visuel Instagram 4:5 — « Trevor (GTA V) vs Jason (GTA VI) ».

Deux bras droits, deux époques : Trevor Philips, l'imprévisible de *Grand Theft
Auto V* (2013), face à Jason Duval, le vétéran plus posé de *Grand Theft Auto
VI* (19 novembre 2026). Deux portraits pleine hauteur, puis quatre axes de
comparaison en vis-à-vis.

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

W, H, S = 1080, 1350, 2  # suréchantillonnage ×2 : lettrage et diagonales nets

INK = (13, 11, 20)          # fond prune presque noir
PAPER = (247, 245, 255)     # blanc cassé
GREY = (169, 163, 194)      # légendes
YELLOW = (255, 214, 25)     # accent maison
CYAN = (34, 211, 238)
VIOLET = (168, 132, 255)    # encre de Jason (lisible sur le fond prune)
RULE = (58, 47, 87)

FONTS = {
    "black": HERE / "fonts/Anton.ttf",
    "bold": HERE / "fonts/Inter-700.ttf",
    "semi": HERE / "fonts/Inter-600.ttf",
    "regular": HERE / "fonts/Inter-400.ttf",
}

MARGIN = 52
CARD_TOP, CARD_H = 276, 560
CARD_W = (W - 2 * MARGIN - 32) // 2      # 470 px : deux cartes + gouttière
GAP = 32

TREVOR = {
    "name": "TREVOR",
    "game": "GTA V · 2013",
    "color": YELLOW,
    "points": ["Imprévisible", "Violence gratuite", "Loyauté brute", "Aucune limite"],
    "focus": (0.50, 0.26),   # visage dans le rendu vertical
    "zoom": 1.18,
}

JASON = {
    "name": "JASON",
    "game": "GTA VI · 2026",
    "color": VIOLET,
    "points": ["Posé", "Violence choisie", "Doute permanent", "La famille d’abord"],
    "focus": (0.52, 0.22),
}


def px(n):
    return round(n * S)


def font(face, size):
    return ImageFont.truetype(str(FONTS[face]), px(size))


def text(im, x, y, s, size, color=PAPER, *, face="bold", tracking=0, align="left"):
    """Écrit `s` en coordonnées de maquette et renvoie sa largeur (maquette).

    Le canevas est suréchantillonné (S = 2) : les positions comme les tailles
    sont donc multipliées par S au tracé, sinon le texte sort deux fois trop
    grand par rapport à la mise en page.
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
    # Bandeau bas : la zone des lignes de comparaison reste plus sombre.
    fade = Image.new("L", (W, H), 0)
    ImageDraw.Draw(fade).rectangle([0, 880, W, H], fill=70)
    fade = fade.filter(ImageFilter.GaussianBlur(px(40)))
    im = Image.composite(Image.new("RGB", (W, H), INK), im, fade)
    return im.resize((px(W), px(H)), Image.Resampling.BICUBIC).convert("RGBA")


def portrait_card(source, spec, box, *, alpha=False):
    """Portrait plein cadre, fondu vers le bas : la légende se pose dessus."""
    cw, ch = box
    w, h = source.size
    # `zoom` resserre le cadrage (Trevor est un plan large : on remonte sur le
    # buste pour que les deux cartes parlent à la même échelle).
    scale = max(cw / w, ch / h) * spec.get("zoom", 1.0)
    art = source.resize((max(cw, round(w * scale)), max(ch, round(h * scale))), Image.Resampling.LANCZOS)
    # Centrage sur le visage, sans déborder du cadre.
    fx, fy = spec["focus"]
    left = min(max(0, round(fx * art.width - cw / 2)), art.width - cw)
    top = min(max(0, round(fy * art.height - ch * 0.22)), art.height - ch)
    art = art.crop((left, top, left + cw, top + ch))
    if alpha:
        # Rendu détouré : on le pose sur un aplat de la couleur du personnage.
        plate = Image.new("RGBA", art.size, spec["color"] + (255,))
        plate = Image.blend(plate, Image.new("RGBA", art.size, (24, 18, 36, 255)), 0.86)
        plate.alpha_composite(art)
        art = plate
    art = art.convert("RGBA")
    # Dégradé bas : lisibilité du nom posé sur l'image.
    shade = Image.new("L", art.size, 0)
    sd = ImageDraw.Draw(shade)
    fade_h = px(190)
    for i in range(fade_h):
        t = i / fade_h
        sd.line([(0, art.height - fade_h + i), (art.width, art.height - fade_h + i)], fill=int(236 * t ** 1.5))
    art.paste(Image.new("RGBA", art.size, INK + (255,)), (0, 0), shade)
    return art


def masthead(im):
    text(im, MARGIN, 58, "LET’S PLAY · COMPARATIF", 19, YELLOW, tracking=3.4)
    # « TREVOR vs JASON » sur une ligne : VS jaune intercalé, JASON en violet.
    size = 82
    x = MARGIN
    x += text(im, x, 96, "TREVOR", size, PAPER, face="black") + 16
    x += text(im, x, 120, "VS", 40, YELLOW, face="black") + 16
    text(im, x, 96, "JASON", size, VIOLET, face="black")
    text(im, MARGIN, 196, "GTA V (2013) face à GTA VI (2026) : deux bras droits, deux époques.",
         23, GREY, face="regular")
    ImageDraw.Draw(im).line([(px(MARGIN), px(236)), (px(MARGIN + 88), px(236))], fill=CYAN, width=px(4))


def vs_badge(im, cx, cy):
    r = 40
    d = ImageDraw.Draw(im)
    d.ellipse([px(cx - r - 5), px(cy - r - 5), px(cx + r + 5), px(cy + r + 5)], fill=INK)
    d.ellipse([px(cx - r), px(cy - r), px(cx + r), px(cy + r)], fill=YELLOW)
    text(im, cx, cy - 19, "VS", 34, INK, face="black", align="center")


def comparison(im, specs, top):
    """Quatre axes en vis-à-vis, filet fin tous les deux rangs."""
    row = 74
    mid = W / 2
    for i, (left, right) in enumerate(zip(specs[0]["points"], specs[1]["points"])):
        y = top + i * row
        if i:
            ImageDraw.Draw(im).line(
                [(px(mid - 210), px(y - 16)), (px(mid - 34), px(y - 16))], fill=RULE, width=px(1))
            ImageDraw.Draw(im).line(
                [(px(mid + 34), px(y - 16)), (px(mid + 210), px(y - 16))], fill=RULE, width=px(1))
        text(im, mid - 28, y, left, 25, PAPER, face="semi", align="right")
        ImageDraw.Draw(im).rounded_rectangle(
            [px(mid - 5), px(y + 10), px(mid + 5), px(y + 20)], radius=px(5), fill=specs[0]["color"])
        text(im, mid + 28, y, right, 25, PAPER, face="semi")


def footer(im):
    y = 1262
    ImageDraw.Draw(im).line([(px(MARGIN), px(y)), (px(W - MARGIN), px(y))], fill=RULE, width=px(2))
    logo = Image.open(ROOT / "public/lets-play-logo.png").convert("RGBA")
    logo = logo.crop(logo.getchannel("A").getbbox())
    logo.thumbnail((px(104), px(76)), Image.Resampling.LANCZOS)
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

    cards = (
        (TREVOR, trevor, MARGIN, True),
        (JASON, jason, MARGIN + CARD_W + GAP, False),
    )
    for spec, source, x, alpha in cards:
        card = portrait_card(source, spec, (px(CARD_W), px(CARD_H)), alpha=alpha)
        ImageDraw.Draw(im).rounded_rectangle(
            [px(x - 3), px(CARD_TOP - 3), px(x + CARD_W + 3), px(CARD_TOP + CARD_H + 3)],
            radius=px(20), fill=spec["color"],
        )
        mask = Image.new("L", card.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, card.width, card.height], radius=px(18), fill=255)
        im.paste(card, (px(x), px(CARD_TOP)), mask)
        # Légende posée sur le bas du portrait.
        text(im, x + 24, CARD_TOP + CARD_H - 116, spec["name"], 52, PAPER, face="black")
        text(im, x + 26, CARD_TOP + CARD_H - 52, spec["game"], 21, spec["color"], tracking=1.6, face="semi")

    vs_badge(im, W / 2, CARD_TOP + CARD_H / 2)
    comparison(im, (TREVOR, JASON), 908)
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
