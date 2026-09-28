#!/usr/bin/env python3
"""
Logo « Let’s Talk » — la messagerie de Let’s Play.
==================================================

Génère, à partir de la police Poppins Black Italic (OFL, embarquée dans
`fonts/`), les SVG vectoriels du logo et le module de données lu par le
composant React `src/social/LetsTalkLogo.jsx` :

  public/lets-talk-logo.svg          logo horizontal : bulle + « Let’s Talk »
  public/lets-talk-logo-stacked.svg  logo empilé, construit comme le logo Let’s Play
  public/lets-talk-mark.svg          emblème seul : la bulle « en train d’écrire »
  src/social/letsTalkLogoData.js     tracés + réglages partagés avec le composant

Direction artistique
--------------------
Un cousin du logo Let’s Play — même lettrage italique très gras, même
extrusion violette (#4F3494) vers le bas à droite, même liseré violet — mais
un logo à part entière :

  - « Talk » et la bulle passent au cyan du site (#22D3EE), là où « Play »
    est jaune ;
  - l’emblème est une bulle de discussion inclinée comme le lettrage, avec
    les trois points « en train d’écrire » ;
  - le même dessin sert sur fond sombre et sur fond clair (le liseré et
    l’extrusion violets tiennent le contraste sur les deux, comme pour le
    logo Let’s Play).

Toute la géométrie (rotation, inclinaison, mise à l’échelle) est appliquée
ici, aux coordonnées elles-mêmes : les SVG produits n’ont pas de
transformation imbriquée, et leurs viewBox sont calculées au plus juste.

Régénérer
---------
  python3 -m pip install -r scripts/lets-talk-logo/requirements.txt
  python3 scripts/lets-talk-logo/build_logo.py
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from fontTools.misc.transform import Transform
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
FONT = HERE / 'fonts' / 'Poppins-BlackItalic-latin.woff2'

# --------------------------------------------------------------------------
# Palette — relevée sur public/lets-play-logo.png (extrusion, liseré) et
# sur les variables du site (cyan).
# --------------------------------------------------------------------------
COLORS = {
    'white': '#FFFFFF',       # « Let’s », comme sur le logo Let’s Play
    'cyanTop': '#7AEEFC',     # dégradé de « Talk » et de la bulle
    'cyanMid': '#22D3EE',     # = --cyan du thème sombre
    'cyanBottom': '#0CB4D8',
    'outline': '#4F3494',     # liseré des faces
    'extrude': '#4F3494',     # extrusion (violet du logo Let’s Play)
    'rim': '#2B1F63',         # arête arrière de l’extrusion
    'dots': '#2B1F63',        # points « en train d’écrire »
}

# Approche manuelle (la police n’a pas de crénage sur ces paires) : un
# lettrage de logo serré, comme celui de Let’s Play.
TRACKING = -12
PAIR_ADJUST = {
    ('L', 'e'): -48, ('e', 't'): -16, ('t', '’'): -30, ('’', 's'): -22,
    ('T', 'a'): -78, ('a', 'l'): -6, ('l', 'k'): -4,
}
WORD_GAP = 132            # espace entre « Let’s » et « Talk » (unités de fonte)
ITALIC_SKEW = -10         # degrés — l’angle italique de Poppins Italic

# Réglages des trois variantes (angles en degrés, longueurs en unités de fonte :
# 1000 = un cadratin, capitales à 713).
HORIZONTAL = {
    'rotate': -2,           # à peine penché : un logo long pivoté perd vite en
                            # hauteur utile (à -4°, les lettres rapetissaient de 15 %)
    'mark_scale': 1.08,     # taille de la bulle par rapport au lettrage
    'mark_gap': 96,         # espace bulle → « Let’s »
    'extrude': (62, 38),
    'stroke': 12,
}
STACKED = {
    'rotate': -9,           # l’inclinaison franche du logo Let’s Play
    'line': 790,            # interligne « Let’s » → « Talk »
    'indent': 520,          # retrait de « Talk », comme « Play »
    'mark_scale': 0.66,
    'mark_rotate': -4,
    'extrude': (70, 42),
    'stroke': 12,
}
MARK = {
    'rotate': -8,
    'extrude': (70, 44),
    'stroke': 18,           # liseré plus marqué : l’emblème vit aussi à 16 px
}

# --------------------------------------------------------------------------
# Outils géométriques (repère SVG : y vers le bas)
# --------------------------------------------------------------------------


def fmt(value: float) -> str:
    text = f'{value:.1f}'
    if text.endswith('.0'):
        text = text[:-2]
    return '0' if text == '-0' else text


def transformed(rec: RecordingPen, t: Transform) -> RecordingPen:
    out = RecordingPen()
    rec.replay(TransformPen(out, t))
    return out


def path_d(rec: RecordingPen) -> str:
    pen = SVGPathPen(None, ntos=fmt)
    rec.replay(pen)
    return pen.getCommands()


def bounds(recs) -> tuple[float, float, float, float]:
    xs0, ys0, xs1, ys1 = [], [], [], []
    for rec in recs:
        pen = BoundsPen(None)
        rec.replay(pen)
        if pen.bounds:
            x0, y0, x1, y1 = pen.bounds
            xs0.append(x0); ys0.append(y0); xs1.append(x1); ys1.append(y1)
    return min(xs0), min(ys0), max(xs1), max(ys1)


def about(cx: float, cy: float, inner: Transform) -> Transform:
    """`inner` appliquée autour du point (cx, cy)."""
    return Transform().translate(cx, cy).transform(inner).translate(-cx, -cy)


def rotation(deg: float) -> Transform:
    return Transform().rotate(math.radians(deg))


def skew_x(deg: float) -> Transform:
    return Transform().skew(math.radians(deg), 0)


# --------------------------------------------------------------------------
# Formes de base
# --------------------------------------------------------------------------

_font = TTFont(str(FONT))
_glyphs = _font.getGlyphSet()
_cmap = _font.getBestCmap()
_hmtx = _font['hmtx']


def text_run(text: str, x: float = 0, baseline: float = 0) -> tuple[list[RecordingPen], float]:
    """Contours des lettres (repère y vers le bas), et chasse totale."""
    recs, pen_x, prev = [], x, None
    for char in text:
        name = _cmap[ord(char)]
        if prev is not None:
            pen_x += TRACKING + PAIR_ADJUST.get((prev, char), 0)
        rec = RecordingPen()
        _glyphs[name].draw(TransformPen(rec, Transform(1, 0, 0, -1, pen_x, baseline)))
        recs.append(rec)
        pen_x += _hmtx[name][0]
        prev = char
    return recs, pen_x - x


BUBBLE_W, BUBBLE_H, BUBBLE_R = 860, 620, 250


def bubble() -> RecordingPen:
    """Bulle arrondie, queue incurvée en bas à gauche (avant inclinaison)."""
    W, H, r = BUBBLE_W, BUBBLE_H, BUBBLE_R
    k = 0.5523 * r
    p = RecordingPen()
    p.moveTo((r, 0))
    p.lineTo((W - r, 0))
    p.curveTo((W - r + k, 0), (W, r - k), (W, r))
    p.lineTo((W, H - r))
    p.curveTo((W, H - r + k), (W - r + k, H), (W - r, H))
    p.lineTo((450, H))
    p.curveTo((378, H), (282, H + 118), (104, H + 196))      # queue : bord supérieur
    p.curveTo((168, H + 92), (176, H + 14), (152, H - 38))    # pointe → retour
    p.curveTo((82, H - 88), (0, H - 168), (0, H - r))         # raccord au flanc gauche
    p.lineTo((0, r))
    p.curveTo((0, r - k), (r - k, 0), (r, 0))
    p.closePath()
    return p


def circle(cx: float, cy: float, r: float) -> RecordingPen:
    k = 0.5523 * r
    p = RecordingPen()
    p.moveTo((cx + r, cy))
    p.curveTo((cx + r, cy + k), (cx + k, cy + r), (cx, cy + r))
    p.curveTo((cx - k, cy + r), (cx - r, cy + k), (cx - r, cy))
    p.curveTo((cx - r, cy - k), (cx - k, cy - r), (cx, cy - r))
    p.curveTo((cx + k, cy - r), (cx + r, cy - k), (cx + r, cy))
    p.closePath()
    return p


def emblem(t: Transform, rot: float) -> dict:
    """La bulle et ses trois points, inclinés comme le lettrage puis `t`."""
    cx, cy = BUBBLE_W / 2, BUBBLE_H / 2
    local = about(cx, cy, rotation(rot).transform(skew_x(ITALIC_SKEW)))
    full = t.transform(local)
    dots = [circle(cx + i * 222, cy + 6, 70) for i in (-1, 0, 1)]
    return {
        'bubble': transformed(bubble(), full),
        'dots': [transformed(d, full) for d in dots],
        'center': full.transformPoint((cx, cy)),
    }


# --------------------------------------------------------------------------
# Compositions
# --------------------------------------------------------------------------


def wordmark(x: float, baseline: float, two_lines: bool = False, dx2: float = 0, line: float = 0):
    lets, w1 = text_run('Let’s', x, baseline)
    if two_lines:
        talk, w2 = text_run('Talk', x + dx2, baseline + line)
        width = max(w1, dx2 + w2)
    else:
        talk, w2 = text_run('Talk', x + w1 + WORD_GAP, baseline)
        width = w1 + WORD_GAP + w2
    return lets, talk, width


def compose_horizontal() -> dict:
    cfg = HORIZONTAL
    lets, talk, width = wordmark(0, 0)
    # Emblème à gauche du mot, centré un peu sous le milieu des capitales : sa
    # queue descend sous la ligne de base, comme un jambage.
    scale = cfg['mark_scale']
    probe = emblem(Transform().scale(scale), rot=0)
    bx0, by0, bx1, by1 = bounds([probe['bubble']])
    tx = -cfg['mark_gap'] - bx1
    ty = -356 - probe['center'][1] + 30
    mark = emblem(Transform().translate(tx, ty).scale(scale), rot=0)
    x0, y0, x1, y1 = bounds([mark['bubble'], *lets, *talk])
    spin = about((x0 + x1) / 2, (y0 + y1) / 2, rotation(cfg['rotate']))
    return finish('horizontal', spin, lets, talk, mark, stroke=cfg['stroke'], extrude=cfg['extrude'])


def compose_stacked() -> dict:
    cfg = STACKED
    line, dx2 = cfg['line'], cfg['indent']
    lets, talk, width = wordmark(0, 0, two_lines=True, dx2=dx2, line=line)
    # La bulle occupe le creux laissé sous « Le » par le retrait de « Talk ».
    scale = cfg['mark_scale']
    probe = emblem(Transform().scale(scale), rot=cfg['mark_rotate'])
    bx0, by0, bx1, by1 = bounds([probe['bubble']])
    tx = dx2 - 70 - bx1
    ty = line - 356 - probe['center'][1] + 12
    mark = emblem(Transform().translate(tx, ty).scale(scale), rot=cfg['mark_rotate'])
    x0, y0, x1, y1 = bounds([mark['bubble'], *lets, *talk])
    spin = about((x0 + x1) / 2, (y0 + y1) / 2, rotation(cfg['rotate']))
    return finish('stacked', spin, lets, talk, mark, stroke=cfg['stroke'], extrude=cfg['extrude'])


def compose_mark() -> dict:
    cfg = MARK
    mark = emblem(Transform(), rot=cfg['rotate'])
    return finish('mark', Transform(), [], [], mark, stroke=cfg['stroke'], extrude=cfg['extrude'], square=True)


def finish(name, spin, lets, talk, mark, stroke, extrude, square=False) -> dict:
    lets = [transformed(r, spin) for r in lets]
    talk = [transformed(r, spin) for r in talk]
    bub = transformed(mark['bubble'], spin)
    dots = [transformed(d, spin) for d in mark['dots']]
    ex, ey = extrude
    rim = round(stroke * 0.9)
    x0, y0, x1, y1 = bounds([bub, *lets, *talk])
    pad = stroke / 2 + rim / 2 + 4
    vx0 = x0 - pad
    vy0 = y0 - pad
    vx1 = x1 + ex + pad
    vy1 = y1 + ey + pad
    if square:
        w, h = vx1 - vx0, vy1 - vy0
        side = max(w, h)
        vx0 -= (side - w) / 2
        vy0 -= (side - h) / 2
        vx1, vy1 = vx0 + side, vy0 + side
    # Origine ramenée à (0, 0) : des tracés plus courts, une viewBox lisible.
    shift = Transform().translate(-vx0, -vy0)
    move = lambda rec: path_d(transformed(rec, shift))  # noqa: E731
    return {
        'name': name,
        'viewBox': f'0 0 {fmt(vx1 - vx0)} {fmt(vy1 - vy0)}',
        'width': round(vx1 - vx0, 1),
        'height': round(vy1 - vy0, 1),
        'extrude': [ex, ey],
        'steps': 10,
        'stroke': stroke,
        'rim': rim,
        'lets': ' '.join(move(r) for r in lets),
        'talk': ' '.join(move(r) for r in talk),
        'bubble': move(bub),
        'dots': [move(d) for d in dots],
    }


# --------------------------------------------------------------------------
# Sorties
# --------------------------------------------------------------------------


def standalone_svg(logo: dict, title: str) -> str:
    """SVG autonome (même construction que le composant React)."""
    ex, ey = logo['extrude']
    steps = logo['steps']
    step_len = math.hypot(ex, ey) / steps
    solids = ''.join(f'<path d="{d}"/>' for d in (logo['lets'], logo['talk'], logo['bubble']) if d)
    stack = ''.join(
        f'<use xlink:href="#solid" transform="translate({fmt(ex * i / steps)} {fmt(ey * i / steps)})"/>'
        for i in range(steps - 1, 0, -1)
    )
    faces = []
    if logo['lets']:
        faces.append(f'<path d="{logo["lets"]}" fill="{COLORS["white"]}"/>')
    if logo['talk']:
        faces.append(f'<path d="{logo["talk"]}" fill="url(#cyan)"/>')
    faces.append(f'<path d="{logo["bubble"]}" fill="url(#cyan)"/>')
    dots = ''.join(f'<path d="{d}"/>' for d in logo['dots'])
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
        f'viewBox="{logo["viewBox"]}" width="{fmt(logo["width"])}" height="{fmt(logo["height"])}" '
        f'role="img" aria-labelledby="title">\n'
        f'<title id="title">{title}</title>\n'
        f'<defs>\n'
        f'<linearGradient id="cyan" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="{COLORS["cyanTop"]}"/>'
        f'<stop offset=".55" stop-color="{COLORS["cyanMid"]}"/>'
        f'<stop offset="1" stop-color="{COLORS["cyanBottom"]}"/></linearGradient>\n'
        f'<g id="solid">{solids}</g>\n'
        f'</defs>\n'
        f'<g stroke-linejoin="round">\n'
        f'<use xlink:href="#solid" transform="translate({fmt(ex)} {fmt(ey)})" fill="{COLORS["extrude"]}" '
        f'stroke="{COLORS["rim"]}" stroke-width="{logo["rim"] * 2}"/>\n'
        f'<g fill="{COLORS["extrude"]}" stroke="{COLORS["extrude"]}" stroke-width="{fmt(step_len * 1.8)}">{stack}</g>\n'
        f'<g stroke="{COLORS["outline"]}" stroke-width="{logo["stroke"]}">{"".join(faces)}</g>\n'
        f'<g fill="{COLORS["dots"]}">{dots}</g>\n'
        f'</g>\n'
        f'</svg>\n'
    )


def data_module(logos: list[dict]) -> str:
    payload = {
        logo['name']: {k: logo[k] for k in ('viewBox', 'width', 'height', 'extrude', 'steps', 'stroke', 'rim', 'lets', 'talk', 'bubble', 'dots')}
        for logo in logos
    }
    body = json.dumps(payload, ensure_ascii=False, indent=2)
    colors = json.dumps(COLORS, indent=2)
    return (
        '/* eslint-disable */\n'
        '// Fichier généré par scripts/lets-talk-logo/build_logo.py — ne pas modifier\n'
        '// à la main : relancer le script (voir son en-tête).\n'
        '//\n'
        '// Tracés du logo « Let’s Talk » (lettrage Poppins Black Italic, OFL,\n'
        '// vectorisé). Chaque variante donne sa viewBox, le vecteur d’extrusion et\n'
        '// les tracés déjà inclinés : « Let’s » (face blanche), « Talk » et la bulle\n'
        '// (faces cyan), puis les trois points « en train d’écrire ».\n\n'
        f'export const LETS_TALK_COLORS = {colors};\n\n'
        f'export const LETS_TALK_LOGOS = {body};\n'
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[1])
    parser.add_argument('--out', type=Path, default=None,
                        help='dossier de sortie (par défaut : public/ et src/social/ du dépôt)')
    args = parser.parse_args()

    logos = [compose_horizontal(), compose_stacked(), compose_mark()]
    by_name = {logo['name']: logo for logo in logos}

    public_dir = args.out or ROOT / 'public'
    data_dir = args.out or ROOT / 'src' / 'social'
    public_dir.mkdir(parents=True, exist_ok=True)
    data_dir.mkdir(parents=True, exist_ok=True)

    outputs = {
        public_dir / 'lets-talk-logo.svg': standalone_svg(by_name['horizontal'], 'Let’s Talk'),
        public_dir / 'lets-talk-logo-stacked.svg': standalone_svg(by_name['stacked'], 'Let’s Talk'),
        public_dir / 'lets-talk-mark.svg': standalone_svg(by_name['mark'], 'Let’s Talk'),
        data_dir / 'letsTalkLogoData.js': data_module(logos),
    }
    for path, content in outputs.items():
        path.write_text(content, encoding='utf-8')
        print(f'  {path.relative_to(ROOT) if path.is_relative_to(ROOT) else path}  ({len(content.encode()):,} o)')


if __name__ == '__main__':
    main()
