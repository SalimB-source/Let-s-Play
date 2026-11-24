#!/usr/bin/env python3
"""Ajoute le titre arabe jaune stylisé sur une cover, sans layout complet.

Le titre est composé en Tajawal Black, rempli d'un dégradé jaune chaud, avec
contour et relief en encre, halo sombre et dégradé de lisibilité en bas de
l'image. Aucun autre élément graphique n'est ajouté (pas de logo, pas de bandeau).

Usage :
    python3 scripts/visuels/add_cover_title.py SOURCE [--out CHEMIN]
                                                 [--text "…"] [--size 190]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageCms, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts/visuels"))
from arabic_text import ArabicText  # noqa: E402

FONTS = ROOT / "scripts/visuels/fonts"
DEFAULT_TEXT = "ما أكثر تغيّر مفاجئ في الطقس أذهلك؟"

YELLOW_HI = (255, 236, 110)
YELLOW = (255, 209, 20)
HOT = (243, 148, 0)
INK = (28, 13, 58)
MARGIN = 110


def glyph_layer(size: tuple[int, int], lines: list[str], font: ArabicText, lead: int) -> Image.Image:
    """Glyphes posés sur un calque transparent, centrés horizontalement."""
    W, H = size
    layer = Image.new("L", (W, H), 0)
    top = H // 2 - lead * len(lines) // 2
    for i, line in enumerate(lines):
        font.draw(layer, (W // 2, top + i * lead + lead // 2), line, fill=255, anchor="ma")
    return layer


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("--out", default=str(ROOT / "instagram/gta-trevor-jason/cover-titre-4k-2160x2700"))
    ap.add_argument("--text", default=DEFAULT_TEXT)
    ap.add_argument("--size", type=int, default=190)
    ap.add_argument("--bottom", type=int, default=300, help="marge basse du bloc titre")
    ap.add_argument("--depth", type=int, default=16, help="épaisseur du relief")
    args = ap.parse_args()

    base = Image.open(args.src).convert("RGBA")
    W, H = base.size

    font = ArabicText(FONTS / "Tajawal-Black.ttf", args.size)
    lines = font.wrap(args.text, W - 2 * MARGIN)
    lead = round(args.size * 1.18)

    # 1. gabarit des glyphes, puis recalage exact du bloc
    raw = glyph_layer((W, H), lines, font, lead)
    box = raw.getbbox()
    block = raw.crop(box)
    mask = Image.new("L", (W, H), 0)
    left = (W - block.width) // 2
    top = H - args.bottom - block.height
    mask.paste(block, (left, top))

    # 2. dégradé de lisibilité en bas de l'image
    scrim_h = int(H * 0.46)
    scrim = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(scrim)
    for y in range(scrim_h):
        t = y / (scrim_h - 1)
        a = round(235 * t ** 1.7)
        gd.line([(0, H - scrim_h + y), (W, H - scrim_h + y)], fill=INK + (a,))
    base.alpha_composite(scrim)

    # 3. halo sombre derrière le titre
    halo = Image.new("L", (W, H), 0)
    halo.paste(mask.filter(ImageFilter.GaussianBlur(26)), (0, 0))
    halo = halo.point(lambda v: round(v * 0.9))
    shadow = Image.new("RGBA", (W, H), INK + (255,))
    shadow.putalpha(halo)
    base.alpha_composite(shadow)

    # 4. relief : glyphes d'encre empilés vers le bas-droite
    ink = Image.new("RGBA", (W, H), INK + (255,))
    for d in range(args.depth, 0, -1):
        shifted = Image.new("L", (W, H), 0)
        shifted.paste(mask, (d // 2, d))
        if d > 6:  # les couches lointaines sont adoucies : profondeur plus crédible
            shifted = shifted.filter(ImageFilter.GaussianBlur(2.0))
        layer = ink.copy()
        layer.putalpha(shifted)
        base.alpha_composite(layer)

    # 5. contour d'encre
    outline = mask.filter(ImageFilter.MaxFilter(13))
    layer = ink.copy()
    layer.putalpha(outline)
    base.alpha_composite(layer)

    # 6. remplissage : dégradé jaune chaud masqué par les glyphes
    grad = Image.new("RGBA", (W, H))
    gd = ImageDraw.Draw(grad)
    span = block.height + 60
    for y in range(span):
        t = y / (span - 1)
        if t < 0.22:  # reflet : fine bande claire en haut de chaque bloc
            k = t / 0.22
            c = [round(YELLOW_HI[i] + (YELLOW[i] - YELLOW_HI[i]) * k) for i in range(3)]
        else:
            k = (t - 0.22) / 0.78
            c = [round(YELLOW[i] + (HOT[i] - YELLOW[i]) * k) for i in range(3)]
        gd.line([(0, y), (W, y)], fill=tuple(c) + (255,))
    fill = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    fill.paste(grad.crop((0, 0, W, span)), (0, top))
    fill.putalpha(mask)
    base.alpha_composite(fill)

    # 7. liseré clair : arête interne du glyphe, puis bandeau brillant décalé
    inner = mask.filter(ImageFilter.MinFilter(9))
    rim = ImageChops.subtract(mask, inner)
    rim = ImageChops.offset(rim, 0, 0)
    hl = Image.new("RGBA", (W, H), (255, 252, 220, 255))
    hl.putalpha(rim.point(lambda v: round(v * 0.75)))
    base.alpha_composite(hl)

    # 8. reflet : moitié haute des glyphes légèrement éclaircie
    gloss = mask.crop((0, 0, W, H))
    band = Image.new("L", (W, H), 0)
    band.paste(mask.crop((0, top, W, top + block.height // 2)), (0, top))
    gloss_mask = ImageChops.multiply(band, inner)
    gloss_mask = gloss_mask.filter(ImageFilter.GaussianBlur(1.5))
    gl = Image.new("RGBA", (W, H), (255, 255, 245, 255))
    gl.putalpha(gloss_mask.point(lambda v: round(v * 0.35)))
    base.alpha_composite(gl)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    icc = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
    rgb = base.convert("RGB")
    rgb.save(out.with_suffix(".png"), icc_profile=icc, optimize=True)
    rgb.save(out.with_suffix(".jpg"), quality=96, subsampling=0, icc_profile=icc, optimize=True)
    print(f"{out}.png  /  .jpg  ({W}×{H})  lignes={len(lines)}")


if __name__ == "__main__":
    main()
