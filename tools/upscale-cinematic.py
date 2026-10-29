#!/usr/bin/env python3
"""Upscale HD -> 4K des 12 tableaux de la cinematique d'intro du Sablier.

Pipeline (classique, sans modele IA - poids non telechargeables ici) :
  1. Debruitage leger a resolution native (ne pas amplifier le bruit).
  2. Upscale Lanczos vers 3840x2160.
  3. Masque flou (unsharp) sur le canal L uniquement (pas de halos couleur).
  4. Grain monochrome tres fin (masque la douceur de l'upscale + coherence
     avec le grain film prevu au montage).

Sortie : public/sablier-cinematic/4k/cine-tXX-*-4k.jpg (JPEG q93).
Usage : python3 tools/upscale-cinematic.py
"""
import glob
import os
import sys

import cv2
import numpy as np

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RACINE, "public", "sablier-cinematic")
DST = os.path.join(SRC, "4k")
LARGEUR, HAUTEUR = 3840, 2160
QUALITE_JPG = 93


def upscale_4k(chemin_src, chemin_dst):
    img = cv2.imread(chemin_src, cv2.IMREAD_COLOR)
    if img is None:
        raise RuntimeError(f"lecture impossible : {chemin_src}")

    # 1. Debruitage doux a resolution native.
    propre = cv2.fastNlMeansDenoisingColored(img, None, h=3, hColor=3,
                                             templateWindowSize=7,
                                             searchWindowSize=21)
    # 2. Upscale Lanczos vers 4K.
    grand = cv2.resize(propre, (LARGEUR, HAUTEUR), interpolation=cv2.INTER_LANCZOS4)

    # 3. Micro-contraste sur L (LAB) : net sans halos couleur.
    lab = cv2.cvtColor(grand, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    flou = cv2.GaussianBlur(l, (0, 0), sigmaX=2.2)
    l_net = cv2.addWeighted(l, 1.45, flou, -0.45, 0)
    net = cv2.cvtColor(cv2.merge([l_net, a, b]), cv2.COLOR_LAB2BGR)

    # 4. Grain monochrome fin (sigma ~1.0 sur 8 bits).
    rng = np.random.default_rng(20261029)
    grain = rng.normal(0, 1.0, net.shape[:2]).astype(np.float32)
    final = np.clip(net.astype(np.float32) + grain[:, :, None], 0, 255).astype(np.uint8)

    cv2.imwrite(chemin_dst, final, [cv2.IMWRITE_JPEG_QUALITY, QUALITE_JPG,
                                    cv2.IMWRITE_JPEG_OPTIMIZE, 1])
    return os.path.getsize(chemin_dst)


def main():
    os.makedirs(DST, exist_ok=True)
    sources = sorted(glob.glob(os.path.join(SRC, "cine-t*.png")))
    if not sources:
        print("aucune source trouvee", file=sys.stderr)
        return 1
    total = 0
    for src in sources:
        base = os.path.splitext(os.path.basename(src))[0]
        dst = os.path.join(DST, f"{base}-4k.jpg")
        octets = upscale_4k(src, dst)
        total += octets
        print(f"{base}-4k.jpg 3840x2160 {octets / 1e6:.1f} Mo")
    print(f"OK : {len(sources)} fichiers, {total / 1e6:.1f} Mo au total -> {DST}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
