#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Visuel éditorial « Kojima Productions passe chez Xbox ».

Génère deux visuels construits autour de vraies photos de presse :

  public/kojima-xbox-news.jpg          1920 × 1080 (16:9, bandeau d'article)
  public/kojima-xbox-news-square.jpg   1080 × 1080 (carré réseaux sociaux)

Photos sources : public/news-sources/ (provenance détaillée dans CREDITS.txt).
Polices : Anton & Inter (SIL Open Font License 1.1) dans scripts/visuels/fonts/.

Usage :
    python3 scripts/visuels/make_kojima_xbox_visual.py

Le script est déterministe : mêmes entrées → mêmes pixels.
Le placement du texte se fait par « boîte encrée » (mesure réelle des glyphes),
donc aucun texte ne peut dériver d'une police à l'autre.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
FONTS = HERE / "fonts"
SRC = ROOT / "public" / "news-sources"
OUT = ROOT / "public"

# ---------------------------------------------------------------- palette ----
BG = (10, 10, 13)
YELLOW = (255, 212, 0)
GREEN = (125, 214, 63)  # vert « Xbox » assez lumineux pour un fond sombre
GREEN_DEEP = (16, 124, 16)  # vert Xbox officiel (aplat de la pastille)
WHITE = (255, 255, 255)
GREY = (158, 164, 172)
GREY_SOFT = (118, 124, 133)
HAIR = (48, 48, 58)

# ----------------------------------------------------------------- texte ----
KICKER = "CHANGEMENT DE CAP · INDUSTRIE"
BADGE = "LET’S PLAY"
BADGE_SUB = "ACTUS DU JOUR · 24.09.2026"
H1 = "KOJIMA PRODUCTIONS"
H2_WHITE = "PASSE CHEZ "
H2_ACCENT = "XBOX"
CHIPS = ["PHYSINT", "OD", "FILM & TV"]
SUB_WIDE = [
    "PHYSINT quitte PlayStation : trois mois après la rupture, Kojima",
    "Productions confie son jeu d’action-espionnage à Xbox, qui élargit",
    "un partenariat déjà noué avec OD — et qui dépasse le jeu vidéo.",
]
SUB_SQUARE = [
    "PHYSINT quitte PlayStation : trois mois après la rupture,",
    "Kojima Productions confie son jeu d’action-espionnage à Xbox.",
]
FROM_LABEL = "PLAYSTATION"
TO_LABEL = "XBOX"
CAPTION_1 = "HIDEO KOJIMA & ASHA SHARMA — XBOX"
CAPTION_2 = "Kojima Productions, Tokyo · 14.09.2026"
QUOTE = "« To invention and adventure together with Xbox »"
FOOTER = "Sources : communiqués Kojima Productions, Xbox & PlayStation · VGC · visuel Let’s Play"
PHOTO_TAG = "OD · PHYSINT · FILM & TV"

FONT_HEAD = "Anton.ttf"
FONT_REG = "Inter-400.ttf"
FONT_MED = "Inter-600.ttf"
FONT_BOLD = "Inter-700.ttf"


# ------------------------------------------------------------ utilitaires ----
def fnt(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size)


def text_w(draw: ImageDraw.ImageDraw, s: str, f, tracking: float = 0.0) -> float:
    """Largeur d'une chaîne, suivi typographique inclus."""
    if not s:
        return 0.0
    return sum(draw.textlength(c, font=f) for c in s) + tracking * (len(s) - 1)


def draw_tracked(draw, xy, s, f, fill, tracking: float = 0.0) -> float:
    """Écrit `s` lettre à lettre (suivi typographique) ; renvoie la largeur."""
    x, y = xy
    for c in s:
        draw.text((x, y), c, font=f, fill=fill)
        x += draw.textlength(c, font=f) + tracking
    return x - tracking


def ink_offsets(s: str, f, tracking: float = 0.0):
    """Boîte réellement encrée d'un texte (offsets relatifs au point de dessin)."""
    probe = ImageDraw.Draw(Image.new("L", (8, 8)))
    w = int(text_w(probe, s, f, tracking)) + 24
    h = f.size * 2 + 32
    img = Image.new("L", (max(8, w), max(8, h)), 0)
    d = ImageDraw.Draw(img)
    draw_tracked(d, (8, h // 2), s, f, 255, tracking)
    bb = img.getbbox()
    if bb is None:
        return (0, 0, 0, 0)
    return (bb[0] - 8, bb[1] - h // 2, bb[2] - 8, bb[3] - h // 2)


def draw_ink_top(draw, x: float, top: float, s: str, f, fill, tracking: float = 0.0) -> float:
    """Écrit `s` en alignant le haut de l'encre sur `top` ; renvoie la hauteur encrée."""
    x0, y0, _x1, y1 = ink_offsets(s, f, tracking)
    draw_tracked(draw, (x - x0, top - y0), s, f, fill, tracking)
    return y1 - y0


def ink_height(f, sample: str = "KOJIMA", tracking: float = 0.0) -> float:
    _x0, y0, _x1, y1 = ink_offsets(sample, f, tracking)
    return y1 - y0


def fit_size(s: str, name: str, max_w: float, start: int, tracking: float = 0.0, min_size: int = 10) -> int:
    """Plus grande taille (≤ start) dont la ligne tient dans `max_w`."""
    probe = ImageDraw.Draw(Image.new("RGB", (8, 8)))
    size = start
    while size > min_size:
        if text_w(probe, s, fnt(name, size), tracking) <= max_w:
            break
        size -= 2
    return size


def fit_lines(lines, name: str, max_w: float, start: int, tracking: float = 0.0, min_size: int = 10) -> int:
    """Taille commune à plusieurs lignes (la plus contrainte gagne)."""
    size = start
    while size > min_size:
        probe = ImageDraw.Draw(Image.new("RGB", (8, 8)))
        if all(max(text_w(probe, s, fnt(name, size), tracking), 1) <= max_w for s in lines):
            return size
        size -= 2
    return min_size


def cover(im: Image.Image, w: int, h: int, focus_x: float = 0.5, focus_y: float = 0.45) -> Image.Image:
    """Remplit (w, h) sans déformation, en cadrant sur le point de focus."""
    sw, sh = im.size
    scale = max(w / sw, h / sh)
    im = im.resize((max(1, round(sw * scale)), max(1, round(sh * scale))), Image.LANCZOS)
    nw, nh = im.size
    cx = int((nw - w) * min(1.0, max(0.0, focus_x)))
    cy = int((nh - h) * min(1.0, max(0.0, focus_y)))
    return im.crop((cx, cy, cx + w, cy + h))


def tune_photo(im: Image.Image) -> Image.Image:
    """Look commun aux photos : contraste auto, saturation légèrement retenue."""
    im = ImageOps.autocontrast(im, cutoff=1)
    im = ImageEnhance.Color(im).enhance(0.94)
    im = ImageEnhance.Contrast(im).enhance(1.05)
    return im


def vertical_veil(size, top_alpha: float, mid_alpha: float, bottom_alpha: float, color=BG) -> Image.Image:
    """Voile vertical (haut → milieu → bas) en RGBA."""
    w, h = size
    ys = np.linspace(0, 1, h, dtype=np.float32)
    alpha = np.interp(ys, np.array([0.0, 0.5, 1.0], dtype=np.float32),
                      np.array([top_alpha, mid_alpha, bottom_alpha], dtype=np.float32))
    layer = np.zeros((h, w, 4), dtype=np.uint8)
    layer[:, :, :3] = np.array(color, dtype=np.uint8)
    layer[:, :, 3] = (alpha * 255).astype(np.uint8)[:, None]
    return Image.fromarray(layer, "RGBA")


def horizontal_veil(size, start_alpha: float, end_alpha: float, color=BG) -> Image.Image:
    """Voile horizontal (gauche → droite) en RGBA."""
    w, h = size
    xs = np.linspace(0, 1, w, dtype=np.float32)
    alpha = np.interp(xs, np.array([0.0, 1.0], dtype=np.float32),
                      np.array([start_alpha, end_alpha], dtype=np.float32))
    layer = np.zeros((h, w, 4), dtype=np.uint8)
    layer[:, :, :3] = np.array(color, dtype=np.uint8)
    layer[:, :, 3] = (alpha * 255).astype(np.uint8)[None, :]
    return Image.fromarray(layer, "RGBA")


def radial_glow(size, cx: float, cy: float, radius: float, color, strength: float) -> Image.Image:
    """Halo circulaire (RGBA) pour réchauffer le fond côté photo."""
    w, h = size
    yy, xx = np.mgrid[0:h, 0:w]
    dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / radius
    alpha = np.clip(1.0 - dist, 0.0, 1.0) ** 2 * strength
    layer = np.zeros((h, w, 4), dtype=np.uint8)
    layer[:, :, :3] = np.array(color, dtype=np.uint8)
    layer[:, :, 3] = (alpha * 255).astype(np.uint8)
    return Image.fromarray(layer, "RGBA")


def photo_gradient(size, from_alpha: float, to_alpha: float, color=(8, 8, 11), start_at: float = 0.45) -> Image.Image:
    """Voile bas de photo : transparent en haut, sombre en bas (lisible partout)."""
    w, h = size
    ys = np.linspace(0, 1, h, dtype=np.float32)
    alpha = np.interp(ys, np.array([start_at, 1.0], dtype=np.float32),
                      np.array([from_alpha, to_alpha], dtype=np.float32))
    layer = np.zeros((h, w, 4), dtype=np.uint8)
    layer[:, :, :3] = np.array(color, dtype=np.uint8)
    layer[:, :, 3] = (alpha * 255).astype(np.uint8)[:, None]
    return Image.fromarray(layer, "RGBA")


def hud_brackets(draw, box, color=YELLOW, length: int = 26, width: int = 4, pad: int = 8):
    """Coins HUD « Let’s Play » autour d'un cadre (x0, y0, x1, y1)."""
    x0, y0, x1, y1 = box
    x0, y0, x1, y1 = x0 - pad, y0 - pad, x1 + pad, y1 + pad
    for a, b, c in (
        ((x0, y0 + length), (x0, y0), (x0 + length, y0)),
        ((x1 - length, y0), (x1, y0), (x1, y0 + length)),
        ((x1, y1 - length), (x1, y1), (x1 - length, y1)),
        ((x0 + length, y1), (x0, y1), (x0, y1 - length)),
    ):
        draw.line([a, b, c], fill=color, width=width, joint="curve")


def pill(draw, x, y, label, f, fg, bg, tracking=1.5, pad_x=28, radius=8, outline=None, strike=False, height=None):
    """Pastille à fond plein ou contour ; renvoie la largeur totale."""
    tw = text_w(draw, label, f, tracking)
    ih = ink_height(f, label, tracking)
    h = height or round(ih + 30)
    w = round(tw + pad_x * 2)
    box = [x, y, x + w, y + h]
    if bg is not None:
        draw.rounded_rectangle(box, radius=radius, fill=bg)
    if outline is not None:
        draw.rounded_rectangle(box, radius=radius, outline=outline, width=2)
    draw_ink_top(draw, x + pad_x, y + (h - ih) / 2, label, f, fg, tracking)
    if strike:
        draw.line([x + pad_x - 6, y + h / 2, x + w - pad_x + 6, y + h / 2], fill=fg, width=3)
    return w


def arrow(draw, x0, x1, y, color=YELLOW, width=4, head=16):
    """Flèche horizontale (trait + pointe) — matérialise la migration."""
    draw.line([x0, y, x1 - head, y], fill=color, width=width)
    draw.polygon([(x1, y), (x1 - head, y - head * 0.72), (x1 - head, y + head * 0.72)], fill=color)


# ----------------------------------------------------------------- rendu ----
def build_background(size, texture_path: Path) -> Image.Image:
    """Fond sombre + texture photo floutée + halo vert."""
    w, h = size
    base = Image.new("RGB", (w, h), BG)
    tex = cover(Image.open(texture_path).convert("RGB"), w, h)
    tex = tex.filter(ImageFilter.GaussianBlur(30))
    tex = ImageEnhance.Color(tex).enhance(0.55)
    tex = ImageEnhance.Brightness(tex).enhance(0.85)
    bg = Image.blend(base, tex, 0.42)
    bg = Image.alpha_composite(bg.convert("RGBA"),
                               radial_glow((w, h), w * 0.70, h * 0.48, max(w, h) * 0.62, GREEN_DEEP, 0.34))
    bg = Image.alpha_composite(bg, vertical_veil((w, h), 0.86, 0.52, 0.86))
    bg = Image.alpha_composite(bg, horizontal_veil((w, h), 0.55, 0.0))
    return bg.convert("RGB")


def photo_card(path: Path, w: int, h: int, caption_size: int, tag: bool = True) -> Image.Image:
    """Photo de presse encadrée + légende incrustée (voile sombre en bas)."""
    im = tune_photo(cover(Image.open(path).convert("RGB"), w, h, focus_y=0.42)).convert("RGBA")
    im = Image.alpha_composite(im, photo_gradient((w, h), 0.0, 0.94, start_at=0.42))
    dr = ImageDraw.Draw(im)

    # Tag HUD en haut à gauche
    if tag:
        tf = fnt(FONT_MED, max(15, round(caption_size * 0.70)))
        tw = text_w(dr, PHOTO_TAG, tf, 2.0)
        pad_x = 16
        bh = round(ink_height(tf, PHOTO_TAG) + 18)
        dr.rounded_rectangle([18, 18, 18 + tw + pad_x * 2 + 20, 18 + bh], radius=6, fill=(8, 8, 11, 205))
        dot_y = 18 + bh / 2
        dr.ellipse([18 + pad_x, dot_y - 4, 18 + pad_x + 9, dot_y + 5], fill=GREEN)
        draw_ink_top(dr, 18 + pad_x + 20, dot_y - ink_height(tf, PHOTO_TAG) / 2, PHOTO_TAG, tf, WHITE, 2.0)

    # Légende
    c1 = fnt(FONT_BOLD, caption_size)
    c2 = fnt(FONT_REG, max(14, round(caption_size * 0.90)))
    pad = 26
    gap = round(caption_size * 0.34)
    h2 = ink_height(c2, CAPTION_2)
    h1 = ink_height(c1, CAPTION_1)
    y2 = h - pad - h2
    draw_ink_top(dr, pad, y2 - gap - h1, CAPTION_1, c1, WHITE, 1.6)
    draw_ink_top(dr, pad, y2, CAPTION_2, c2, GREY, 0.6)
    return im


def top_bar(draw, x: int, y: int, scale: float = 1.0, sub_color=GREY) -> int:
    """Bandeau « LET’S PLAY · ACTUS DU JOUR… ». Renvoie la hauteur occupée."""
    badge_h = round(56 * scale)
    badge_w = round(238 * scale)
    draw.rounded_rectangle([x, y, x + badge_w, y + badge_h], radius=6, fill=YELLOW)
    bf = fnt(FONT_HEAD, round(30 * scale))
    bw = text_w(draw, BADGE, bf, 1.0)
    bh = ink_height(bf, BADGE)
    draw_tracked(draw, (x + (badge_w - bw) / 2, y + (badge_h - bh) / 2 - ink_offsets(BADGE, bf, 1.0)[1]),
                 BADGE, bf, (11, 11, 14), 1.0)
    sf = fnt(FONT_BOLD, round(24 * scale))
    sh = ink_height(sf, BADGE_SUB)
    draw_ink_top(draw, x + badge_w + round(26 * scale), y + (badge_h - sh) / 2, BADGE_SUB, sf, sub_color, 3.0)
    return badge_h


def migration_bar(draw, x: int, y: int, scale: float = 1.0) -> int:
    """PLAYSTATION barré → flèche → XBOX. Renvoie la hauteur occupée."""
    f = fnt(FONT_BOLD, round(30 * scale))
    h = round(ink_height(f, FROM_LABEL) + 30)
    w_from = pill(draw, x, y, FROM_LABEL, f, GREY_SOFT, None, tracking=2.0,
                  pad_x=round(26 * scale), outline=HAIR, strike=True, height=h)
    gap = round(52 * scale)
    arrow(draw, x + w_from + round(18 * scale), x + w_from + gap, y + h / 2, YELLOW,
          round(4 * scale), round(17 * scale))
    pill(draw, x + w_from + gap + round(10 * scale), y, TO_LABEL, f, WHITE, GREEN_DEEP,
         tracking=2.0, pad_x=round(30 * scale), height=h)
    return h


def render_wide() -> Image.Image:
    W, H = 1920, 1080
    M = 110  # marge
    canvas = build_background((W, H), SRC / "xbox-series-x-console.jpg")
    dr = ImageDraw.Draw(canvas)

    photo_w, photo_h = 712, 400
    photo_x, photo_y = W - M - photo_w, 620
    col_w = photo_x - M - 70

    # Bandeau + surtitre
    top_bar(dr, M, 88)
    kf = fnt(FONT_BOLD, 26)
    draw_ink_top(dr, M, 176, KICKER, kf, GREEN, 6.0)

    # Titre (2 lignes, taille commune)
    hsize = fit_lines([H1, H2_WHITE + H2_ACCENT], FONT_HEAD, W - 2 * M, 200, tracking=2.0)
    hf = fnt(FONT_HEAD, hsize)
    h_ink = ink_height(hf, H1)
    y1 = 228
    draw_ink_top(dr, M, y1, H1, hf, WHITE, 2.0)
    x2 = M + text_w(dr, H2_WHITE, hf, 2.0) + round(hsize * 0.04)
    draw_ink_top(dr, x2, y1 + h_ink + 30, H2_ACCENT, hf, GREEN, 2.0)
    draw_ink_top(dr, M, y1 + h_ink + 30, H2_WHITE, hf, WHITE, 2.0)
    rule_y = y1 + h_ink + 30 + h_ink + 36

    # Filet jaune
    dr.rectangle([M, rule_y, M + 96, rule_y + 6], fill=YELLOW)

    # Pastilles
    chip_f = fnt(FONT_BOLD, 24)
    cx = M
    for label in CHIPS:
        cx += pill(dr, cx, rule_y + 32, label, chip_f, GREY, (24, 24, 30), tracking=1.5, pad_x=20) + 12

    # Chapô
    sub_size = fit_lines(SUB_WIDE, FONT_REG, col_w, 30, tracking=0.2)
    sf = fnt(FONT_REG, sub_size)
    s_ink = ink_height(sf, SUB_WIDE[0])
    for i, line in enumerate(SUB_WIDE):
        draw_ink_top(dr, M, rule_y + 118 + i * (s_ink + 16), line, sf, GREY, 0.2)

    # Migration
    migration_bar(dr, M, rule_y + 244)

    # Pied de page
    ff_size = fit_size(FOOTER, FONT_REG, col_w, 20, tracking=0.4)
    draw_ink_top(dr, M, rule_y + 334, FOOTER, fnt(FONT_REG, ff_size), GREY_SOFT, 0.4)

    # Photo de presse
    card = photo_card(SRC / "kojima-asha-sharma-xbox-tokyo.jpg", photo_w, photo_h, 24)
    canvas.paste(card, (photo_x, photo_y), card)
    dr.rectangle([photo_x - 1, photo_y - 1, photo_x + photo_w, photo_y + photo_h], outline=HAIR, width=2)
    hud_brackets(dr, (photo_x, photo_y, photo_x + photo_w, photo_y + photo_h), YELLOW, 26, 4, 10)

    # Cadre HUD général
    hud_brackets(dr, (M - 46, 46, W - M + 46, H - 46), YELLOW, 40, 5, 0)
    hud_brackets(dr, (M - 46, 46, W - M + 46, H - 46), HAIR, 40, 2, 0)
    return canvas


def render_square() -> Image.Image:
    W = H = 1080
    canvas = Image.new("RGB", (W, H), BG)
    dr = ImageDraw.Draw(canvas)

    # Bandeau photo (haut)
    ph = round(W * 0.5185)  # ~560
    photo = tune_photo(cover(Image.open(SRC / "kojima-asha-sharma-xbox-tokyo.jpg").convert("RGB"),
                             W, ph, focus_y=0.36)).convert("RGBA")
    photo = Image.alpha_composite(photo, photo_gradient((W, ph), 0.10, 0.92, start_at=0.42))
    photo = Image.alpha_composite(photo, vertical_veil((W, ph), 0.70, 0.30, 0.0))  # voile haut (bandeau)
    canvas.paste(photo, (0, 0), photo)

    # Bandeau « LET’S PLAY » posé sur la photo
    top_bar(dr, 40, 34, scale=0.86, sub_color=GREY)

    # Légende + citation sur la photo
    c1 = fnt(FONT_BOLD, 24)
    c2 = fnt(FONT_REG, 22)
    cq = fnt(FONT_MED, 21)
    pad = 30
    hq = ink_height(cq, QUOTE)
    h2 = ink_height(c2, CAPTION_2)
    h1 = ink_height(c1, CAPTION_1)
    yq = ph - pad - hq
    y2 = yq - 6 - h2
    y1 = y2 - 8 - h1
    draw_ink_top(dr, pad, y1, CAPTION_1, c1, WHITE, 1.4)
    draw_ink_top(dr, pad, y2, CAPTION_2, c2, GREY, 0.6)
    draw_ink_top(dr, pad, yq, QUOTE, cq, YELLOW, 0.4)

    # Surtitre + titre
    kf = fnt(FONT_BOLD, 22)
    draw_ink_top(dr, 40, ph + 32, KICKER, kf, GREEN, 5.0)
    hsize = fit_lines([H1, H2_WHITE + H2_ACCENT], FONT_HEAD, W - 80, 108, tracking=1.5)
    hf = fnt(FONT_HEAD, hsize)
    h_ink = ink_height(hf, H1)
    y1t = ph + 66
    draw_ink_top(dr, 40, y1t, H1, hf, WHITE, 1.5)
    x2 = 40 + text_w(dr, H2_WHITE, hf, 1.5) + round(hsize * 0.04)
    draw_ink_top(dr, 40, y1t + h_ink + 24, H2_WHITE, hf, WHITE, 1.5)
    draw_ink_top(dr, x2, y1t + h_ink + 24, H2_ACCENT, hf, GREEN, 1.5)
    rule_y = y1t + h_ink + 24 + h_ink + 24
    dr.rectangle([40, rule_y, 40 + 80, rule_y + 5], fill=YELLOW)

    # Chapô
    sub_size = fit_lines(SUB_SQUARE, FONT_REG, W - 80, 26, tracking=0.2)
    sf = fnt(FONT_REG, sub_size)
    s_ink = ink_height(sf, SUB_SQUARE[0])
    for i, line in enumerate(SUB_SQUARE):
        draw_ink_top(dr, 40, rule_y + 26 + i * (s_ink + 14), line, sf, GREY, 0.2)

    # Migration + pied de page
    mh = migration_bar(dr, 40, rule_y + 100, scale=0.86)
    ff_size = fit_size(FOOTER, FONT_REG, W - 80, 18, tracking=0.3)
    draw_ink_top(dr, 40, rule_y + 100 + mh + 16, FOOTER, fnt(FONT_REG, ff_size), GREY_SOFT, 0.3)

    hud_brackets(dr, (18, 18, W - 18, H - 18), YELLOW, 30, 4, 0)
    return canvas


def main() -> None:
    wide = render_wide()
    wide.save(OUT / "kojima-xbox-news.jpg", "JPEG", quality=88, optimize=True, progressive=True)
    square = render_square()
    square.save(OUT / "kojima-xbox-news-square.jpg", "JPEG", quality=88, optimize=True, progressive=True)
    for p in (OUT / "kojima-xbox-news.jpg", OUT / "kojima-xbox-news-square.jpg"):
        with Image.open(p) as im:
            print(f"{p.relative_to(ROOT)}  {im.size[0]}×{im.size[1]}  {p.stat().st_size / 1024:.0f} Ko")


if __name__ == "__main__":
    main()
