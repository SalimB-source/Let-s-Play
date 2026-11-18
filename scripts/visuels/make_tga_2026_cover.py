#!/usr/bin/env python3
"""Couverture et miniatures du carrousel TGA, à partir des six cartes Let’s Play."""
from __future__ import annotations

import argparse
from math import ceil, cos, floor, radians, tan
from pathlib import Path

import numpy as np
from PIL import Image, PngImagePlugin

from make_tga_2026_portraits import (
    CARDS, CYAN, H, HEAD, INK, LILAC, MARGIN, PAPER, RAIL, ROOT, S, W, YELLOW,
    lettering, line, polygon, px, seam, stamp, text, write_bundle,
)
from tga_2026_copy import Copy, EDITIONS, edition_dir

HEADER, FOOTER = 142, 1238
BAND_W, BAND_H, BAND_Y, ANGLE = W + 200, 244, 690, 4


def band_edge(x, side):
    theta = radians(ANGLE)
    middle = BAND_Y - tan(theta) * (x - W / 2)
    return middle + side * BAND_H / (2 * cos(theta))


def artwork(im, card, points, focus):
    """Poser une illustration sans distorsion, en la découpant sur la diagonale."""
    x0, y0 = floor(min(x for x, y in points)), floor(min(y for x, y in points))
    w, h = ceil(max(x for x, y in points)) - x0, ceil(max(y for x, y in points)) - y0
    # N’utiliser que la zone photographique commune : pas de rail, de filet ni de texte.
    art = card.crop((RAIL + 2, HEAD + 2, W - 1, floor(seam(W)) - 5))
    fx, fy, scale = focus
    ch = min(art.height, art.width * h / w) * scale
    cw = ch * w / h
    left = max(0, min(fx * art.width - cw / 2, art.width - cw))
    top = max(0, min(fy * art.height - ch / 2, art.height - ch))
    photo = art.resize((px(w), px(h)), Image.Resampling.LANCZOS, box=(left, top, left + cw, top + ch))
    mask = Image.new('L', photo.size)
    polygon(mask, [(x - x0, y - y0) for x, y in points], 255)
    im.paste(photo, (px(x0), px(y0)), mask)


def gallery(im, cards):
    # Deux rangées de trois facettes. Le bandeau central recouvre leur jonction.
    for row in range(2):
        top_x = (0, 394, 757, W) if row == 0 else (0, 382, 744, W)
        bot_x = (0, 318, 682, W) if row == 0 else (0, 308, 670, W)
        top = [(x, HEADER if row == 0 else band_edge(x, 1) - 3) for x in top_x]
        bot = [(x, band_edge(x, -1) + 3 if row == 0 else FOOTER) for x in bot_x]
        for j in range(3):
            i = row * 3 + j
            artwork(im, cards[i], [top[j], top[j+1], bot[j+1], bot[j]], CARDS[i].cover_focus)
        for j in (1, 2):
            line(im, [top[j], bot[j]], '#21132f', 7)
            line(im, [top[j], bot[j]], '#755992', 1.1)


def header(im, first_card):
    polygon(im, [(0, 0), (W, 0), (W, HEADER), (0, HEADER)], INK)
    polygon(im, [(865, 0), (W, 0), (W, HEADER), (772, HEADER)], '#291548')
    polygon(im, [(897, 0), (W, 0), (W, HEADER), (804, HEADER)], '#3e2177')
    line(im, [(857, 0), (764, HEADER)], '#6c49a1', 1)
    with Image.open(ROOT / 'public/lets-play-logo.png') as source:
        logo = source.convert('RGBA')
    logo = logo.crop(logo.getchannel('A').getbbox())
    logo.thumbnail((px(147), px(105)), Image.Resampling.LANCZOS)
    im.paste(logo, (px(952) - logo.width // 2, px(69) - logo.height // 2), logo)
    # L’aile de TGA provient déjà de l’affiche d’origine, via la première carte.
    wing = first_card.crop((52, 28, 87, 62)).getchannel('R')
    wing = wing.point(lambda v: max(0, (v-16) * 255/239))
    wing = wing.crop(wing.getbbox()).resize((px(55), px(52)), Image.Resampling.LANCZOS)
    stamp(im, wing, MARGIN, 44, YELLOW)
    line(im, [(138, 43), (138, 97)], '#6e5788', 1.4)
    x = 170 + text(im, 170, 56, 'THE GAME AWARDS', 39, face='display', tracking=-.6)
    line(im, [(x+24, 90), (x+37, 50)], '#8669a6', 2)
    text(im, x+56, 57, '2026', 37, YELLOW, face='display')


def central_band(im, labels: Copy):
    y, x = np.ogrid[:BAND_H, :BAND_W]
    glow = np.exp(-((x - 1000) / 600)**2 - ((y - 130) / 420)**2)
    base = np.array([37, 18, 68]) + glow[..., None] * np.array([37, 17, 66])
    grain = np.random.default_rng(26).normal(0, .7, (BAND_H, BAND_W, 1))
    band = Image.fromarray(np.uint8(base + grain)).resize((px(BAND_W), px(BAND_H)), Image.Resampling.BICUBIC)
    # Plis du même violet que sur les cartes, en retrait du titre.
    for dx in (0, 176):
        polygon(band, [(840+dx, -36), (929+dx, -36), (1152+dx, 96), (1056+dx, 96)], '#3c216c')
        polygon(band, [(1056+dx, 96), (1152+dx, 96), (959+dx, 249), (845+dx, 249)], '#4e2b87')
    line(band, [(0, 1), (BAND_W, 1)], '#b298db', 2)
    polygon(band, [(0, 0), (806, 0), (743, 3), (0, 9)], YELLOW)
    line(band, [(0, BAND_H-2), (BAND_W, BAND_H-2)], '#9774c2', 2)
    left = (BAND_W - W) / 2 + MARGIN
    right = BAND_W - left
    for xp in (right-46, right-27, right-8):
        polygon(band, [(xp, 26), (xp+11, 26), (xp+3, 41), (xp-8, 41)], '#c4a7eb')
    line(band, [(left, 65), (left+31, 65)], CYAN, 4)
    category = lettering(labels.category.upper(), 31, tracking=3.4)
    stamp(band, category, left+49, 74.5 - category.height/S, PAPER)
    size = 147
    while True:
        title = lettering(labels.cover_title.upper(), size, 'display', -.022 * size)
        if title.width <= px(right-left-5):
            break
        size -= 1
    top = BAND_H - 33 - title.height / S
    for d in range(4, 0, -1):
        stamp(band, title, left+d, top+d, '#60399c')
    stamp(band, title, left, top, YELLOW)
    strip = band.convert('RGBA').rotate(ANGLE, Image.Resampling.BICUBIC, expand=True)
    im.paste(strip, (px(W/2)-strip.width//2, px(BAND_Y)-strip.height//2), strip)


def footer(im, labels: Copy):
    polygon(im, [(0, FOOTER), (W, FOOTER), (W, H), (0, H)], INK)
    line(im, [(0, FOOTER), (W, FOOTER)], '#765995', 2)
    text(im, MARGIN, FOOTER+21, labels.ceremony.upper(), 18, LILAC, tracking=2.5)
    text(im, MARGIN, FOOTER+51, labels.date, 34, PAPER)
    # Invitation au geste sans superposer de texte aux portraits.
    text(im, 931, FOOTER+44, labels.swipe, 31, PAPER, align='right')
    polygon(im, [(966, FOOTER+30), (1031, FOOTER+30), (1019, FOOTER+82), (954, FOOTER+82)], YELLOW)
    line(im, [(974, FOOTER+56), (1007, FOOTER+56)], INK, 3)
    line(im, [(994, FOOTER+44), (1007, FOOTER+56), (994, FOOTER+68)], INK, 3)


def thumbnail(im, path, profile):
    im.resize((540, 675), Image.Resampling.LANCZOS).save(
        path, 'JPEG', quality=91, subsampling=0, optimize=True, progressive=True, icc_profile=profile)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--lang', choices=EDITIONS, default='fr')
    parser.add_argument('--cards', type=Path, help='par défaut, le dossier de l’édition choisie')
    parser.add_argument('--bundle', action='store_true', help='inclure la couverture et les miniatures dans le ZIP')
    parser.add_argument('--out', type=Path, help='par défaut, à côté des six cartes')
    args = parser.parse_args()
    labels = EDITIONS[args.lang]
    card_dir = args.cards or edition_dir(args.lang)
    out = args.out or card_dir
    small = out / labels.thumbs_dir
    small.mkdir(parents=True, exist_ok=True)
    cards = []
    paths = [card_dir / f'{nominee.stem(n)}.png' for n, nominee in enumerate(CARDS, 1)]
    for path in paths:
        with Image.open(path) as card:
            # Les cartes françaises d’origine précèdent le marquage de langue iTXt.
            if (getattr(card.info.get('Title'), 'lang', None) or 'fr') != args.lang:
                raise ValueError(f'Carte attendue en {args.lang} : {path}')
            if card.size != (W, H):
                raise ValueError(f'Carte Let’s Play de 1080 × 1350 px attendue : {card.filename}')
            cards.append(card.convert('RGB'))
    profile = cards[0].info.get('icc_profile')
    canvas = Image.new('RGB', (px(W), px(H)), INK)
    gallery(canvas, cards)
    header(canvas, cards[0])
    central_band(canvas, labels)
    footer(canvas, labels)
    cover = canvas.resize((W, H), Image.Resampling.LANCZOS)
    meta = PngImagePlugin.PngInfo()
    meta.add_itxt('Title', f'{labels.category} 2026 — {labels.cover_title}', lang=args.lang)
    meta.add_itxt('Description', labels.cover_description, lang=args.lang)
    cover_path = out / f'{labels.cover_stem}.png'
    cover_thumb = small / f'{labels.cover_stem}.jpg'
    first_thumb = small / f'{paths[0].stem}.jpg'
    cover.save(cover_path, optimize=True, icc_profile=profile, pnginfo=meta)
    thumbnail(cover, cover_thumb, profile)
    thumbnail(cards[0], first_thumb, profile)
    if args.bundle:
        entries = [(p, p.name) for p in paths]
        entries.extend((p, f'extras/{p.relative_to(out).as_posix()}') for p in (cover_path, cover_thumb, first_thumb))
        write_bundle(out, args.lang, entries)


if __name__ == '__main__':
    main()
