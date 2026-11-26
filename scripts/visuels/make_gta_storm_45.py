#!/usr/bin/env python3
"""Affiche Instagram 4:5 — Jason et Lucia fuient une tempête à moto, en arabe.

Composition « plein cadre » du gabarit Let's Play :

  ┌──────────────────────────────┐
  │ [Let's Play]        [GTA VI] │
  │                              │
  │   illustration plein cadre   │  ← Vice City sous l'orage,
  │   (moto, pluie, éclairs)     │     fondu vers le bas
  │                              │
  │  هاربون من العاصفة            │  ← titre arabe, ombre cyan
  │  جيسون ولوسيا …               │  ← une ligne de contexte
  ├──────────────────────────────┤
  │  03 · مطاردة  |  فايس سيتي    │  ← trois repères factuels
  │ ██ المطاردة كاملة في التعليقات █ │
  └──────────────────────────────┘

Le texte est en arabe (droite → gauche), composé avec HarfBuzz via
`arabic_text.py` ; seuls les nombres et « GTA VI » restent en latin.

Visuel : `instagram/assets/gta6-fuite-tempete-3d.jpg` — rendu 3D photoréaliste
original (pas une capture officielle : il est donc crédité comme illustration,
pas comme image Rockstar).

Usage :
    python3 scripts/visuels/make_gta_storm_45.py [--out DOSSIER]
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

BG_TOP = (58, 28, 122)
INK = (24, 11, 50)
CREAM = (255, 238, 196)
YELLOW = (255, 214, 25)
CYAN = (34, 211, 238)
WHITE = (255, 255, 255)
DIM = (198, 188, 232)

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

MARGIN = 48
WINDOW = (36, 306, 1044, 862)   # fenêtre 16:9 à coins coupés       # l'illustration se dissout jusqu'ici
TITLE_Y = 906
FACTS_Y = 1072
CTA_TOP = 1230

TITLE = "ما أكثر تغيّر مفاجئ في الطقس أذهلك؟"
SUBTITLE = "من صحو مشمس إلى عاصفة في دقائق — جيسون ولوسيا في فايس سيتي"
FACTS = (("01", "عاصفة مفاجئة"), ("02", "فايس سيتي"), ("03", "GTA VI · 2026"))


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


def base():
    return vgrad((px(W), px(H)), [(70, 34, 140), BG_TOP, (34, 16, 72), INK]).convert("RGBA")


def artwork():
    """Illustration entière, sans recadrage : les deux visages restent dans le cadre."""
    art = Image.open(ASSETS / "gta6-fuite-tempete-3d.jpg").convert("RGB")
    w, h = WINDOW[2] - WINDOW[0], WINDOW[3] - WINDOW[1]
    art = art.resize((px(w), px(h)), Image.Resampling.LANCZOS)
    art = ImageEnhance.Color(art).enhance(1.06)
    art = ImageEnhance.Contrast(art).enhance(1.04)
    return art


def blend_art(im, art):
    """Fenêtre à coins coupés, ombre portée et liseré clair."""
    x0, y0, x1, y1 = WINDOW
    cut = 34
    poly = [(x0 + 20, y0), (x1 - cut, y0), (x1, y0 + cut),
            (x1, y1 - cut), (x1 - cut, y1), (x0 + cut, y1),
            (x0, y1 - cut), (x0, y0 + 20)]
    mask = Image.new("L", (px(W), px(H)), 0)
    ImageDraw.Draw(mask).polygon([(px(a), px(b)) for a, b in poly], fill=255)

    shadow = Image.new("RGBA", im.size, (0, 0, 0, 0))
    shadow.paste((6, 2, 16, 220), (0, 0), mask)
    im.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(px(16))), (0, px(10)))

    canvas = Image.new("RGBA", im.size, (0, 0, 0, 0))
    canvas.paste(art, (px(x0), px(y0)))
    im.paste(canvas, (0, 0), mask)
    ImageDraw.Draw(im).line([(px(a), px(b)) for a, b in poly] + [(px(poly[0][0]), px(poly[0][1]))],
                            fill=(255, 255, 255, 80), width=px(2))


def header(im):
    """Logo Let's Play à gauche, logo GTA VI à droite."""
    logo = Image.open(ROOT / "public/lets-play-logo.png").convert("RGBA")
    logo = logo.crop(logo.getchannel("A").getbbox())
    lw = px(228)
    logo = logo.resize((lw, round(lw * logo.height / logo.width)), Image.Resampling.LANCZOS)
    im.alpha_composite(logo, (px(26), px(26)))
    latin(im, 30, 208, "L'INFO JEU VIDÉO, SANS FILTRE", 10, (212, 202, 240),
          face="bold", tracking=1.7)
    ImageDraw.Draw(im).line([(px(30), px(232)), (px(150), px(232))],
                            fill=(255, 255, 255, 60), width=px(1))

    game = Image.open(ASSETS / "gta6-logo.webp").convert("RGBA")
    game = game.crop(game.getchannel("A").getbbox())
    gh = px(150)
    game = game.resize((round(gh * game.width / game.height), gh), Image.Resampling.LANCZOS)
    im.alpha_composite(game, (px(W - 26) - game.width, px(34)))


def title_block(im):
    """Titre arabe + surtitre latin, ombre cyan décalée."""
    d = ImageDraw.Draw(im)

    # Sur-titre : petit trait + mention du jeu.
    d.line([(px(W - MARGIN), px(TITLE_Y - 30)), (px(W - MARGIN - 150), px(TITLE_Y - 30))],
           fill=CYAN + (190,), width=px(2))

    size = 88
    while size > 54 and ArabicText(AR["display"], px(size)).width(TITLE) / S > W - 2 * MARGIN:
        size -= 2
    # Deux lignes si la question est trop longue pour la largeur utile.
    body = ArabicText(AR["display"], px(size))
    max_w = W - 2 * MARGIN
    if body.width(TITLE) / S > max_w:
        lines = body.wrap(TITLE, max_w)
    else:
        lines = [TITLE]
    y = TITLE_Y
    for line in lines:
        ar_text(im, W - MARGIN + 4, y + 4, line, size, CYAN, face="display")
        ar_text(im, W - MARGIN, y, line, size, CREAM, face="display")
        y += round(size * 1.12)

    ar_text(im, W - MARGIN, y + 12, SUBTITLE, 24, (222, 214, 246), face="regular")


def facts(im):
    """Trois repères factuels, séparés par des filets."""
    d = ImageDraw.Draw(im)
    d.line([(px(MARGIN), px(FACTS_Y - 40)), (px(W - MARGIN), px(FACTS_Y - 40))],
           fill=(255, 255, 255, 46), width=px(1))

    col = (W - 2 * MARGIN) / 3
    for i, (num, label) in enumerate(FACTS):
        cx = MARGIN + col * (i + 0.5)
        latin(im, cx, FACTS_Y, num, 18, CYAN, face="black", tracking=1.6, anchor="m")
        # Latin seulement si le libellé ne contient aucune lettre arabe.
        if not any("\u0600" <= ch <= "\u06ff" for ch in label):
            latin(im, cx, FACTS_Y + 30, label, 17, WHITE, face="bold", tracking=0.6, anchor="m")
        else:
            ar_text(im, cx, FACTS_Y + 30, label, 22, WHITE, face="bold", anchor="ma")
        if i:
            x = MARGIN + col * i
            d.line([(px(x), px(FACTS_Y - 6)), (px(x), px(FACTS_Y + 66))],
                   fill=(255, 255, 255, 34), width=px(1))


def credit(im):
    """Crédit honnête : illustration originale, pas une capture officielle."""
    ar_text(im, W - MARGIN, CTA_TOP - 54, "رسم توضيحي مستوحى من عالم اللعبة", 14,
            (186, 176, 220), face="regular")


def cta(im):
    d = ImageDraw.Draw(im)
    d.rectangle([0, px(CTA_TOP), px(W), px(H)], fill=YELLOW)
    ar_text(im, W / 2 - 30, (CTA_TOP + H) / 2, "شاركنا تجربتك في التعليقات", 40, INK,
            face="display", anchor="mm")
    cx, cy = px(W / 2 + 250), px((CTA_TOP + H) / 2)
    d.line([(cx, cy - px(20)), (cx, cy + px(14))], fill=INK + (255,), width=px(7))
    d.polygon([(cx - px(14), cy + px(10)), (cx + px(14), cy + px(10)), (cx, cy + px(26))],
              fill=INK + (255,))


def build():
    im = base()
    blend_art(im, artwork())
    header(im)
    title_block(im)
    facts(im)
    credit(im)
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
    base_path = out / "gta6-jason-lucia-tempete-ar-1080x1350"
    img.save(base_path.with_suffix(".png"), icc_profile=icc)
    img.save(base_path.with_suffix(".jpg"), quality=92, subsampling=0, icc_profile=icc, optimize=True)
    print(f"{base_path}.png  /  .jpg")


if __name__ == "__main__":
    main()
