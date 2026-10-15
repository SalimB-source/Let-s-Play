#!/usr/bin/env python3
"""Détourage des sprites du mode Histoire (« stands » façon roman visuel).

Les images sources (tools/stands-raw/*.jpg) sont générées sur fond magenta
uni. On enlève ce fond par inondation depuis les bords (ce qui protège les
accidents magenta À L'INTÉRIEUR du personnage), on désincruste le halo sur
le contour, on adore un peu les bords, on rogne et on écrit le sprite dans
public/sablier-story/stands/.

Usage :
    python3 tools/make-stands.py                # traite tous les sources
    python3 tools/make-stands.py --debug        # + aperçus composites
    python3 tools/make-stands.py salem yamina   # sous-ensemble
"""
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter, ImageOps

BRUT = Path(__file__).resolve().parent.parent / "tools" / "stands-raw"
SORTIE = Path(__file__).resolve().parent.parent / "public" / "sablier-story" / "stands"
DEBUG = Path(__file__).resolve().parent.parent / "tools" / "stands-raw" / "debug"

MAGENTA = (255, 0, 255)
TOLERANCE = 132          # distance RGB admise pour rejoindre le fond
DESPILL = 22             # seuil de teinte magenta résiduelle sur le contour
PLUME = 1.2              # rayon de flou du masque (feather)
HAUTEUR_MAX = 1024
FOND_APERCU = (16, 24, 34, 255)  # bleu nuit du jeu, pour contrôler les bords


def distance_magenta(pixel):
    r, g, b = pixel[0], pixel[1], pixel[2]
    return ((r - MAGENTA[0]) ** 2 + (g - MAGENTA[1]) ** 2 + (b - MAGENTA[2]) ** 2) ** 0.5


def est_magenta(pixel):
    """Magenta franc : rouge et bleu hauts, vert nettement plus bas."""
    r, g, b = pixel[0], pixel[1], pixel[2]
    return r > 150 and b > 130 and g < min(r, b) - 60


def etaler_couleur(image, passes=4):
    """Étale la couleur du personnage sous ses pixels transparents.

    Sans ça, le bord garde le magenta du fond : le flou d'alpha le rend
    visible et tous les sprites ont un liseré rose. On dilate donc la couleur
    du contour de quelques pixels dans la zone vide (l'alpha, lui, ne bouge
    pas) — la plume ne peut plus révéler que des couleurs du personnage.
    """
    largeur, hauteur = image.size
    marge = passes + 1  # évite que le débordement ne revienne par le bord opposé
    rgb = ImageOps.expand(image.convert('RGB'), marge, fill=(0, 0, 0))
    rempli = ImageOps.expand(image.split()[3], marge, fill=0)
    for _ in range(passes):
        vide = rempli.point(lambda v: 255 if v == 0 else 0)
        if not vide.getbbox():
            break
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            voisin_rgb = ImageChops.offset(rgb, dx, dy)
            voisin_rempli = ImageChops.offset(rempli, dx, dy)
            prend = ImageChops.multiply(vide, voisin_rempli)
            rgb = Image.composite(voisin_rgb, rgb, prend)
            rempli = Image.composite(voisin_rempli, rempli, prend)
    return rgb.crop((marge, marge, marge + largeur, marge + hauteur))


def detourer(chemin):
    image = Image.open(chemin).convert("RGBA")
    largeur, hauteur = image.size
    pixels = image.load()

    vu = bytearray(largeur * hauteur)
    pile = []
    for x in range(largeur):
        pile.append((x, 0))
        pile.append((x, hauteur - 1))
    for y in range(hauteur):
        pile.append((0, y))
        pile.append((largeur - 1, y))

    def pousser(x, y):
        if 0 <= x < largeur and 0 <= y < hauteur and not vu[y * largeur + x]:
            vu[y * largeur + x] = 1
            pile.append((x, y))

    while pile:
        x, y = pile.pop()
        pixel = pixels[x, y]
        if distance_magenta(pixel) > TOLERANCE and not est_magenta(pixel):
            continue
        alpha = pixels[x, y][3]
        pixels[x, y] = (pixel[0], pixel[1], pixel[2], 0)
        pousser(x + 1, y)
        pousser(x - 1, y)
        pousser(x, y + 1)
        pousser(x, y - 1)
        del alpha

    # Halo : sur le contour, toute teinte magenta résiduelle perd son alpha.
    for y in range(hauteur):
        for x in range(largeur):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            if r > g + DESPILL and b > g + DESPILL:
                pixels[x, y] = (r, g, b, 0)
            elif r > g and b > g:
                # désaturation douce du liseré magenta
                grisé = (g + max(r, b)) // 4
                pixels[x, y] = (min(r, g + DESPILL), g, min(b, g + DESPILL), a)

    # Plume du masque : flou léger de l'alpha seulement. La couleur du
    # personnage est d'abord étalée sous la zone vide, sinon la plume révèle
    # le magenta du fond sur tout le contour.
    alpha = image.split()[3].filter(ImageFilter.GaussianBlur(PLUME))
    image = etaler_couleur(image, passes=4).convert('RGBA')
    image.putalpha(alpha)

    # Rogner sur le personnage.
    boite = image.getbbox()
    if boite:
        image = image.crop(boite)
    if image.height > HAUTEUR_MAX:
        largeur_cible = round(image.width * HAUTEUR_MAX / image.height)
        image = image.resize((largeur_cible, HAUTEUR_MAX), Image.LANCZOS)
    return image


def apercu(sprite, chemin):
    fond = Image.new("RGBA", sprite.size, FOND_APERCU)
    fond.alpha_composite(sprite)
    fond.convert("RGB").save(chemin)


def main():
    arguments = [a for a in sys.argv[1:] if not a.startswith("--")]
    debug = "--debug" in sys.argv
    SORTIE.mkdir(parents=True, exist_ok=True)
    if debug:
        DEBUG.mkdir(parents=True, exist_ok=True)
    sources = sorted([*BRUT.glob("*.jpg"), *BRUT.glob("*.png")])
    if arguments:
        sources = [s for s in sources if s.stem in arguments]
    if not sources:
        print(f"aucun source dans {BRUT}")
        return 1
    for chemin in sources:
        sprite = detourer(chemin)
        cible = SORTIE / f"stand-{chemin.stem}.webp"
        if sprite.height > 900:
            sprite = sprite.resize(
                (round(sprite.width * 900 / sprite.height), 900), Image.LANCZOS)
        sprite.save(cible, "WEBP", quality=84, method=6)
        if debug:
            apercu(sprite, DEBUG / f"apercu-{chemin.stem}.png")
        poids = cible.stat().st_size // 1024
        print(f"{chemin.name} → {cible.relative_to(SORTIE.parent.parent)} ({sprite.width}×{sprite.height}, {poids} ko)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
