#!/usr/bin/env python3
"""Realigne chaque mB/mC sur son image A (V11.1).

Les images votees ont des tailles/ratios differents de A (ex: carree,
16:9 approximatif) : le resize force vers 4K les deforme differemment
et les fondus A/B/C ne se superposent pas (fantomes, sauts).

Correctif : pour chaque mB/mC, estimation ECC affine (translation +
echelle + rotation, robuste aux petits changements de contenu voulus)
vers A, puis reechantillonnage sur la grille exacte de A (bords
repliques). Ecrase les PNG mB/mC (originaux recuperables via git).
Affiche la correlation finale ; signale les paires douteuses (< 0.85).

Usage : python3 tools/aligner-moments.py
"""
import glob
import os

import cv2
import numpy as np

SRC = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "public", "sablier-cinematic")


def aligner(fixe_gris, mobile_couleur):
    """Aligne mobile_couleur sur fixe_gris. -> (image, rho) ou (None, 0)."""
    h, w = fixe_gris.shape
    # Init : resize sur la grille de A (comme le fait l'upscale).
    init = cv2.resize(mobile_couleur, (w, h), interpolation=cv2.INTER_LANCZOS4)
    gris = cv2.cvtColor(init, cv2.COLOR_BGR2GRAY)
    flou_fixe = cv2.GaussianBlur(fixe_gris, (5, 5), 1.0)
    flou_mob = cv2.GaussianBlur(gris, (5, 5), 1.0)
    mat = np.eye(2, 3, dtype=np.float32)
    crit = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 120, 1e-5)
    try:
        rho, mat = cv2.findTransformECC(flou_fixe, flou_mob, mat,
                                        cv2.MOTION_AFFINE, crit, None, 5)
    except cv2.error:
        return None, 0.0
    alignee = cv2.warpAffine(init, mat, (w, h),
                             flags=cv2.INTER_LANCZOS4 + cv2.WARP_INVERSE_MAP,
                             borderMode=cv2.BORDER_REPLICATE)
    return alignee, float(rho)


def main():
    douteuses = []
    traitees = 0
    for a in sorted(glob.glob(os.path.join(SRC, "cine-t*.png"))):
        base = os.path.basename(a)[:-4]
        if "-mB" in base or "-mC" in base:
            continue
        fixe = cv2.imread(a, cv2.IMREAD_GRAYSCALE)
        if fixe is None:
            continue
        for suffixe in ("-mB", "-mC"):
            chemin = os.path.join(SRC, base + suffixe + ".png")
            mob = cv2.imread(chemin, cv2.IMREAD_COLOR)
            if mob is None:
                continue
            alignee, rho = aligner(fixe, mob)
            if alignee is None:
                print(f"{base}{suffixe}: ECHEC ECC (resize simple garde)", flush=True)
                alignee = cv2.resize(mob, (fixe.shape[1], fixe.shape[0]),
                                     interpolation=cv2.INTER_LANCZOS4)
                rho = -1.0
            cv2.imwrite(chemin, alignee)
            traitees += 1
            if rho < 0.85:
                douteuses.append((base + suffixe, rho))
    print(f"OK : {traitees} images realignees", flush=True)
    if douteuses:
        print("DOUTEUSES (correlation < 0.85) :", flush=True)
        for nom, rho in douteuses:
            print(f"  {nom}: rho={rho:.3f}", flush=True)
    else:
        print("Aucune paire douteuse.", flush=True)


if __name__ == "__main__":
    main()
