"""
Plaque « vide » du Désert de Verre : sans les roses de verre, l'astrolabe, la
corde et l'outre (reconstruits en 3D). Voir _commun.py pour le procédé. Le fond
est une peinture à l'huile en volutes : on le comble avec des volutes voisines.

Usage : python3 scripts/plaque-vide/desert-de-verre.py
"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _commun import combler


def cercle(cx, cy, r, n=28):
    return [(cx + r * math.cos(2 * math.pi * i / n), cy + r * math.sin(2 * math.pi * i / n)) for i in range(n)]


# Les polygones débordent de l'image : un objet coupé par le bord doit l'être jusque dans la marge.
ROSES = [(-70, -70), (335, -70), (405, 40), (410, 75), (345, 105), (305, 150), (295, 235), (215, 305), (155, 405),
         (100, 415), (60, 385), (-70, 365)]
ASTROLABE = cercle(1475, 197, 185)
CORDE = cercle(20, 845, 205)
OUTRE = [(1330, 608), (1380, 602), (1408, 640), (1450, 680), (1490, 670), (1640, 688), (1640, 1110), (1325, 1110),
         (1315, 990), (1345, 960), (1360, 905), (1340, 850), (1328, 790), (1345, 730), (1338, 680)]

# L'ordre compte : chaque donneur est pris dans la peinture déjà nettoyée, jamais sur un autre objet.
combler('desert-de-verre', [
    # (le donneur d'un objet de bord ne doit pas toucher l'image réfléchie du bord)
    dict(nom='corde', poly=CORDE, shift=(200, 0), grow=14),
    dict(nom='roses-gauche', poly=ROSES, clip=(-70, 250), shift=(0, 430), grow=16),
    dict(nom='roses-droite', poly=ROSES, clip=(250, 430), shift=(-120, 430), grow=16),
    dict(nom='outre', poly=OUTRE, shift=(-330, -100), grow=18),
    dict(nom='astrolabe', poly=ASTROLABE, shift=(-360, 150), grow=14),
], mode='poisson', debug='/tmp/w/dv-mask.png')
