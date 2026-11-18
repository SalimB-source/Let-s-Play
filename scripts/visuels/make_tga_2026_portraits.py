#!/usr/bin/env python3
"""Recomposer les six affiches fournies des Game Awards en cartes Let’s Play 4:5."""
from __future__ import annotations

import argparse
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from zipfile import ZIP_STORED, ZipFile

import numpy as np
from PIL import Image, ImageCms, ImageDraw, ImageFilter, ImageFont, PngImagePlugin

from tga_2026_copy import Copy, EDITIONS, edition_dir, zip_name

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
W, H, S = 1080, 1350, 2  # suréchantillonnage du lettrage et des diagonales
HEAD, RAIL, FOOT = 170, 76, 1250
MARGIN = 54
PAPER, YELLOW, CYAN = '#faf8ff', '#ffd619', '#22d3ee'
LILAC, INK = '#d4c7eb', '#100b20'
FONTS = {
    'bold': HERE / 'fonts/Inter-700.ttf',
    'condensed': HERE / 'fonts/Anton.ttf',
    'display': HERE.parent / 'lets-talk-logo/fonts/Poppins-BlackItalic-latin.woff2',
}


@dataclass(frozen=True)
class Card:
    slug: str
    source: int  # indice de la pièce jointe d’origine
    first: str
    second: str
    studio: str
    y_offset: int
    cover_focus: tuple[float, float, float]

    def stem(self, position: int) -> str:
        return f'{position:02d}-{self.slug}'


# L’ordre des lignes pilote les numéros imprimés, les noms, le ZIP et la couverture.
CARDS = (
    Card('grand-theft-auto-vi', 3, 'GRAND THEFT', 'AUTO VI', 'ROCKSTAR GAMES', 0, (.455, .43, .98)),
    Card('resident-evil-requiem', 5, 'RESIDENT EVIL', 'REQUIEM', 'CAPCOM', 8, (.43, .44, .98)),
    Card('phantom-blade-zero', 4, 'PHANTOM', 'BLADE ZERO', 'S-GAME', 0, (.54, .48, .90)),
    Card('007-first-light', 1, '007', 'FIRST LIGHT', 'IO INTERACTIVE', 0, (.595, .43, .99)),
    Card('control-resonant', 2, 'CONTROL', 'RESONANT', 'REMEDY / ANNAPURNA', 0, (.45, .44, .97)),
    Card('the-legend-of-zelda-ocarina-of-time', 0, 'THE LEGEND OF ZELDA:', 'OCARINA OF TIME', 'NINTENDO', 59, (.515, .41, .95)),
)


def px(n):
    return round(n * S)


def polygon(im, points, color):
    ImageDraw.Draw(im).polygon([(px(x), px(y)) for x, y in points], fill=color)


def line(im, points, color, width=1):
    ImageDraw.Draw(im).line([(px(x), px(y)) for x, y in points], fill=color, width=px(width))


def seam(x):
    return 972 - .077 * x


@lru_cache(maxsize=64)
def font(face, size):
    return ImageFont.truetype(str(FONTS[face]), px(size))


def lettering(text, size, face='bold', tracking=0):
    """Masque recadré à l’encre (accents, approches et surplombs de l’italique inclus)."""
    f = font(face, size)
    advance = f.getlength(text) + max(0, len(text) - 1) * tracking * S
    pad = px(size)
    mask = Image.new('L', (round(advance + 2 * pad), 4 * pad))
    d = ImageDraw.Draw(mask)
    if not tracking:
        d.text((pad, 2 * pad), text, font=f, fill=255, anchor='ls')
    else:
        for i, ch in enumerate(text):
            # Mesurer la paire avec la lettre suivante conserve le crénage.
            x = pad + f.getlength(text[:i+1]) - f.getlength(ch) + i * tracking * S
            d.text((round(x), 2 * pad), ch, font=f, fill=255, anchor='ls')
    return mask.crop(mask.getbbox())


def stamp(im, mask, x, top, color, align='left'):
    dx = {'left': 0, 'center': .5, 'right': 1}[align] * mask.width
    pos = (round(px(x) - dx), px(top))
    im.paste(color, pos, mask)
    return mask.width / S


def text(im, x, y, s, size, color=PAPER, *, face='bold', tracking=0, align='left'):
    return stamp(im, lettering(s, size, face, tracking), x, y, color, align)


def title_line(im, s, top, size, color, extrude=0):
    while True:
        mask = lettering(s, size, 'display', -.018 * size)
        if mask.width <= px(W - 2 * MARGIN - extrude):
            break
        size -= 1
    if extrude:
        for i in range(extrude, 0, -1):
            stamp(im, mask, MARGIN + i, top + i, '#5d389d')
    stamp(im, mask, MARGIN, top, color)


def backdrop():
    """Une encre prune à gauche, plus électrique côté pli ; léger grain d’impression."""
    y, x = np.ogrid[:H, :W]
    glow = np.exp(-(((x - 1050) / 690)**2 + ((y - 1030) / 620)**2))
    ink = np.array([29, 15, 56]) + glow[..., None] * np.array([42, 16, 83])
    grain = np.random.default_rng(26).normal(0, .78, (H, W, 1))
    im = Image.fromarray(np.uint8(np.clip(ink + grain, 0, 255)))
    im = im.resize((px(W), px(H)), Image.Resampling.BICUBIC)
    # Plis en chevron : une référence au signe « play » et à l’extrusion du logo.
    for offset, upper, lower, edge in ((0, '#3a206b', '#4b2789', '#63379f'),
                                        (174, '#452579', '#562b9a', '#7943b9')):
        x = offset
        polygon(im, [(670+x, 846), (772+x, 846), (1092+x, 1035), (986+x, 1035)], upper)
        polygon(im, [(986+x, 1035), (1092+x, 1035), (792+x, 1276), (666+x, 1276)], lower)
        line(im, [(772+x, 846), (1092+x, 1035), (792+x, 1276)], edge, 1.1)
    return im


def masthead(im, source, labels: Copy):
    polygon(im, [(0, 0), (W, 0), (W, HEAD), (0, HEAD)], INK)
    # Écusson biseauté, avec le fichier de marque du site (pas un logo recomposé).
    polygon(im, [(860, 0), (W, 0), (W, HEAD), (749, HEAD)], '#291548')
    polygon(im, [(895, 0), (W, 0), (W, HEAD), (784, HEAD)], '#3e2177')
    line(im, [(852, 0), (741, HEAD)], '#6c49a1', 1.1)
    logo = Image.open(ROOT / 'public/lets-play-logo.png').convert('RGBA')
    logo = logo.crop(logo.getchannel('A').getbbox())
    logo.thumbnail((px(164), px(118)), Image.Resampling.LANCZOS)
    im.paste(logo, (px(947) - logo.width // 2, px(82) - logo.height // 2), logo)

    # Isoler l’emblème TGA de l’affiche fournie ; l’imprimer en une encre.
    red = source.crop((275, 838, 327, 889)).getchannel('R')
    wing = red.point(lambda v: max(0, min(255, (v-15) * 255/155)))
    wing = wing.crop(wing.getbbox()).resize((px(31), px(30)), Image.Resampling.LANCZOS)
    stamp(im, wing, MARGIN, 30, YELLOW)
    x = 103 + text(im, 103, 37, 'THE GAME AWARDS', 22, tracking=2.4)
    line(im, [(x+20, 55), (x+28, 35)], '#8e74bf', 2)
    text(im, x+46, 37, '2026', 22, YELLOW, tracking=2.1)
    # Garder la catégorie dans la zone de gauche, sans toucher à l’écusson.
    size = 77
    while True:
        heading = lettering(labels.category.upper(), size, 'display', -1.45)
        if heading.width <= px(680):
            break
        size -= 1
    stamp(im, heading, MARGIN-2, 71 + int((79 - heading.height/S)/2), PAPER)


def illustration(im, source, y_offset):
    # Les cartes d’origine font 1744 × 982 ; la pochette seule occupe 602 × 602.
    # Cadrer en coordonnées source, à échelle uniforme, sans le cartouche turquoise.
    w = W - RAIL
    h = round(seam(RAIL)) - HEAD + 2
    src_y = 62 + y_offset
    box = (990, src_y, 1592, src_y + h * 602/w)
    photo = source.resize((px(w), px(h)), Image.Resampling.LANCZOS, box=box)
    photo = photo.filter(ImageFilter.UnsharpMask(radius=1.5, percent=40, threshold=4))
    mask = Image.new('L', photo.size)
    polygon(mask, [(0, 0), (w, 0), (w, seam(W)-HEAD), (0, seam(RAIL)-HEAD)], 255)
    im.paste(photo, (px(RAIL), px(HEAD)), mask)


def spine(im, n, labels: Copy):
    polygon(im, [(0, HEAD), (RAIL, HEAD), (RAIL, seam(RAIL)), (0, seam(0))], '#2b174f')
    line(im, [(RAIL-.7, HEAD), (RAIL-.7, seam(RAIL))], '#7452a4', 1)
    mid = RAIL / 2
    text(im, mid, HEAD+33, f'{n:02}', 41, YELLOW, face='condensed', align='center')
    text(im, mid, HEAD+82, '/ 06', 17, LILAC, align='center')
    # Index de collection, pas un classement : une barre active par carte.
    for i in range(len(CARDS)):
        y = HEAD + 134 + i * 20
        line(im, [(mid-12, y), (mid+12, y)], YELLOW if i+1 == n else '#725695', 3 if i+1 == n else 1.4)
    label = lettering(labels.nominees.upper(), 22, tracking=3.8).transpose(Image.Transpose.ROTATE_90)
    stamp(im, label, mid, 641, PAPER, align='center')
    line(im, [(mid, 460), (mid, 607)], '#715494', 1)
    for i in range(3):
        polygon(im, [(mid-12+i*10, 921), (mid-8+i*10, 921), (mid-14+i*10, 937), (mid-18+i*10, 937)], '#a985d5')


def credits(im, first, second, studio):
    # Une tranche jaune qui s’amincit comme sur les habillages sociaux Let’s Play.
    line(im, [(0, seam(0)), (W, seam(W))], '#9a6cf0', 2)
    polygon(im, [(0, seam(0)-2), (685, seam(685)-2), (636, seam(636)+2), (0, seam(0)+8)], YELLOW)
    for x in (961, 980, 999):
        polygon(im, [(x, seam(x)-2), (x+12, seam(x+12)-2), (x+2, seam(x+2)+9), (x-10, seam(x-10)+9)], YELLOW)
    line(im, [(MARGIN, 1004), (MARGIN+28, 1004)], CYAN, 3)
    text(im, MARGIN+45, 994, studio, 26, LILAC, tracking=2.5)
    title_line(im, first, 1037, 83, PAPER)
    title_line(im, second, 1109, 137, YELLOW, extrude=4)


def footer(im, labels: Copy):
    polygon(im, [(0, FOOT), (W, FOOT), (W, H), (0, H)], INK)
    line(im, [(0, FOOT), (W, FOOT)], '#715492', 1.2)
    text(im, MARGIN, 1269, labels.vote.upper(), 17, LILAC, tracking=2.7)
    width = text(im, MARGIN, 1294, 'thegameawards.com', 33, PAPER, tracking=-.5)
    x, y = MARGIN+width+18, 1309
    line(im, [(x, y+8), (x+16, y-8)], YELLOW, 3)
    line(im, [(x+2, y-8), (x+16, y-8), (x+16, y+6)], YELLOW, 3)
    label = lettering(labels.ceremony.upper(), 17, tracking=2.7)
    stamp(im, label, W-MARGIN, round(1282 - label.height/S), LILAC, align='right')
    text(im, W-MARGIN, 1292, labels.date, 33, YELLOW, align='right')


def write_bundle(out, lang, entries):
    # Les PNG et JPEG sont déjà compressés. L’ordre des entrées est celui de publication.
    with ZipFile(out / zip_name(lang), 'w', compression=ZIP_STORED) as bundle:
        for path, archive_path in entries:
            bundle.write(path, archive_path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('sources', type=Path, help='dossier contenant les six PNG tga-vote-game-of-the-year')
    parser.add_argument('--lang', choices=EDITIONS, default='fr')
    parser.add_argument('--out', type=Path, help='par défaut, le dossier de l’édition choisie')
    args = parser.parse_args()
    labels = EDITIONS[args.lang]
    out = args.out or edition_dir(args.lang)
    out.mkdir(parents=True, exist_ok=True)
    profile = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
    paths = []
    for n, card in enumerate(CARDS, 1):
        suffix = f' ({card.source})' if card.source else ''
        with Image.open(args.sources / f'tga-vote-game-of-the-year{suffix}.png') as original:
            if original.size != (1744, 982):
                raise ValueError(f'Cadrage prévu pour une source de 1744 × 982 : {original.filename}')
            source = original.convert('RGB')
        im = backdrop()
        masthead(im, source, labels)
        illustration(im, source, card.y_offset)
        spine(im, n, labels)
        credits(im, card.first, card.second, card.studio)
        footer(im, labels)
        path = out / f'{card.stem(n)}.png'
        meta = PngImagePlugin.PngInfo()
        meta.add_itxt('Title', f'{card.first} {card.second} — {labels.category} 2026', lang=args.lang)
        meta.add_itxt('Description', f'{card.studio} · {labels.card_description}', lang=args.lang)
        im.resize((W, H), Image.Resampling.LANCZOS).save(path, pnginfo=meta, icc_profile=profile, optimize=True)
        paths.append(path)
    write_bundle(out, args.lang, [(path, path.name) for path in paths])


if __name__ == '__main__':
    main()
