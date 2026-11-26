#!/usr/bin/env python3
"""Cover Instagram 4:5 — Jason et Lucia à moto devant la tempête, sans layout.

Le visuel est l'illustration seule, plein cadre, sans logo, sans texte ni
bandeau : elle est recadrée en 4:5 en gardant les visages au centre.

Source : `instagram/assets/gta6-fuite-tempete-3d.jpg` (rendu 3D original) ou
`gta6-fuite-tempete.jpg` (version dessinée), au choix avec `--src`.

Usage :
    python3 scripts/visuels/make_gta_cover_45.py [--src 3d|dessin] [--out DOSSIER]
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageCms

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "instagram/assets"
W, H = 1080, 1350

SOURCES = {
    "3d": "gta6-fuite-tempete-3d.jpg",
    "dessin": "gta6-fuite-tempete.jpg",
}
NAMES = {
    "3d": "cover-jason-lucia-tempete-3d-1080x1350",
    "dessin": "cover-jason-lucia-tempete-1080x1350",
}


def cover(src: Image.Image, focus_y: float = 0.30) -> Image.Image:
    """Recadrage « cover » en 4:5, visages conservés au centre."""
    scale = max(W / src.width, H / src.height)
    im = src.resize((round(src.width * scale), round(src.height * scale)), Image.Resampling.LANCZOS)
    left = (im.width - W) // 2
    top = max(0, round((im.height - H) * focus_y))
    return im.crop((left, top, left + W, top + H))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", choices=sorted(SOURCES), default="3d")
    ap.add_argument("--out", default=str(ROOT / "instagram/gta-trevor-jason"))
    ap.add_argument("--focus", type=float, default=0.30, help="position verticale du cadrage (0 → 1)")
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    src = Image.open(ASSETS / SOURCES[args.src]).convert("RGB")
    img = cover(src, args.focus)

    icc = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
    base = out / NAMES[args.src]
    img.save(base.with_suffix(".png"), icc_profile=icc)
    img.save(base.with_suffix(".jpg"), quality=94, subsampling=0, icc_profile=icc, optimize=True)
    print(f"{base}.png  /  .jpg")


if __name__ == "__main__":
    main()
