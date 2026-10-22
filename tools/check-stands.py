#!/usr/bin/env python3
"""Contrôle des sprites du récit : liseré de fond et gabarit.

Un détourage raté se voit à deux choses :

1. **le liseré** — des pixels semi-transparents teintés du magenta du fond.
   La cause est connue : les pixels transparents gardent la couleur du fond et
   la plume d'alpha la révèle. `tools/make-stands.py` étale donc la couleur du
   personnage sous la zone vide avant de flouter (`etaler_couleur`) ;
2. **le gabarit** — la figure doit remplir son cadre à la source. Le détourage
   rogne le sprite sur la figure, si bien que la hauteur livrée raconte le
   cadrage d'origine : une source où la figure occupe toute la hauteur donne un
   sprite de 900 px, une source cadrée trop large en donne un nettement plus
   court — et la figure paraît alors plus petite que les autres sur le plateau.

Usage :
    python3 tools/check-stands.py            # tous les sprites livrés
    python3 tools/check-stands.py salem      # un sous-ensemble
Sortie : une ligne par sprite, puis un verdict (code 1 si un sprite échoue).
"""
import sys
from pathlib import Path

from PIL import Image

SORTIE = Path(__file__).resolve().parent.parent / 'public' / 'sablier-story' / 'stands'
HAUTEUR_PLEINE = 850     # un sprite livré plus court vient d'une source cadrée trop large
LISERe_SEUIL = 4000      # pixels semi-transparents teintés tolérés (désaturations douces)
TEINTE = 30              # min(r, b) - g au-delà duquel un pixel est « teinté magenta »
BORD_HAUT_MAX = 40       # au-delà, la tête ou l'arme haute est coupée net
BORD_COTE_MAX = 65       # au-delà, un bras, un bouclier ou une arme latérale est coupé net


def mesurer(chemin):
    image = Image.open(chemin).convert('RGBA')
    pixels = image.load()
    largeur, hauteur = image.size
    teintes = 0
    min_x, min_y, max_x, max_y = largeur, hauteur, 0, 0
    for y in range(hauteur):
        for x in range(largeur):
            r, v, b, a = pixels[x, y]
            if a == 0:
                continue
            if min(r, b) - v > TEINTE and a < 200:
                teintes += 1
            if a > 40:
                min_x, max_x = min(min_x, x), max(max_x, x)
                min_y, max_y = min(min_y, y), max(max_y, y)
    bord_haut = sum(1 for x in range(largeur) if pixels[x, 0][3] > 40)
    bord_gauche = sum(1 for y in range(hauteur) if pixels[0, y][3] > 40)
    bord_droite = sum(1 for y in range(hauteur) if pixels[largeur - 1, y][3] > 40)
    return {
        'teintes': teintes,
        'hauteur': hauteur,
        'taille': (largeur, hauteur),
        'bords': (bord_haut, bord_gauche, bord_droite),
    }


def main():
    arguments = [a for a in sys.argv[1:] if not a.startswith('-')]
    sprites = sorted(SORTIE.glob('stand-*.webp'))
    if arguments:
        sprites = [s for s in sprites if any(a in s.stem for a in arguments)]
    if not sprites:
        print(f'aucun sprite dans {SORTIE}')
        return 1
    echecs = []
    for sprite in sprites:
        mesure = mesurer(sprite)
        souci = []
        if mesure['teintes'] > LISERe_SEUIL:
            souci.append(f"{mesure['teintes']} pixels teintés")
        if mesure['hauteur'] < HAUTEUR_PLEINE:
            souci.append(f"{mesure['hauteur']} px de haut (source cadrée trop large)")
        haut, gauche, droite = mesure['bords']
        if haut > BORD_HAUT_MAX:
            souci.append(f"coupé en haut ({haut} px)")
        if gauche > BORD_COTE_MAX:
            souci.append(f"coupé à gauche ({gauche} px)")
        if droite > BORD_COTE_MAX:
            souci.append(f"coupé à droite ({droite} px)")
        etat = '✗ ' + ' · '.join(souci) if souci else '✓'
        if souci:
            echecs.append(sprite.name)
        print(f"{etat:4s} {sprite.name:40s} {mesure['taille'][0]}×{mesure['taille'][1]} "
              f"teintés={mesure['teintes']} bords=({haut},{gauche},{droite})")
    if echecs:
        print(f"\n{len(echecs)} sprite(s) à reprendre : {', '.join(echecs)}")
        return 1
    print(f"\ntous les sprites ({len(sprites)}) ont un contour propre et un cadrage plein.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
