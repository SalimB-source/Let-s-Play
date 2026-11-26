#!/usr/bin/env python3
"""Montée en 4K d'une cover 4:5, avec renforcement des détails.

Recadre la source en 4:5 (1080 × 1350 puis 2160 × 2700), lisse les grains de
compression, puis applique un masque de netteté local. Aucun contenu n'est
ajouté : c'est un agrandissement, pas une régénération.

Usage :
    python3 scripts/visuels/upscale_cover.py SOURCE [--out CHEMIN] [--focus 0.30]
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageCms, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
W, H = 2160, 2700


def cover(src: Image.Image, focus: float) -> Image.Image:
    """Cadrage « cover » en 4:5, sans déformer."""
    scale = max(W / src.width, H / src.height)
    im = src.resize((round(src.width * scale), round(src.height * scale)), Image.Resampling.LANCZOS)
    left = (im.width - W) // 2
    top = max(0, round((im.height - H) * focus))
    return im.crop((left, top, left + W, top + H))


def enhance(im: Image.Image) -> Image.Image:
    """Lissage léger (anti-grain) puis accentuation locale des détails."""
    mid = im.resize((round(im.width * 0.64), round(im.height * 0.64)), Image.Resampling.LANCZOS)
    sharp = Image.blend(im, mid.resize(im.size, Image.Resampling.LANCZOS), 0.25)
    sharp = sharp.filter(ImageFilter.UnsharpMask(radius=2.2, percent=115, threshold=3))
    sharp = ImageEnhance.Contrast(sharp).enhance(1.03)
    return ImageEnhance.Color(sharp).enhance(1.04)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("--out", default=str(ROOT / "instagram/gta-trevor-jason/cover-4k-2160x2700"))
    ap.add_argument("--focus", type=float, default=0.30)
    args = ap.parse_args()

    img = enhance(cover(Image.open(args.src).convert("RGB"), args.focus))
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    icc = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
    img.save(out.with_suffix(".png"), icc_profile=icc, optimize=True)
    img.save(out.with_suffix(".jpg"), quality=96, subsampling=0, icc_profile=icc, optimize=True)
    print(f"{out}.png  /  .jpg  ({img.width}×{img.height})")


if __name__ == "__main__":
    main()
