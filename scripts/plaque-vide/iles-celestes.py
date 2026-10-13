"""
Plaque « vide » des Îles Célestes : sans les sapins, les petits rochers et la
corde des berges (reconstruits en 3D). Les berges de roche et la lanterne,
coupées par le bord, restent peintes. Voir _commun.py pour le procédé.

Sous un sapin opaque, le fond n'a pas besoin d'être fin : on le comble par
le pourtour (`mode='inpaint'`), une neige lisse.

Usage : python3 scripts/plaque-vide/iles-celestes.py
"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _commun import combler, ruban


def cercle(cx, cy, r, n=24):
    return [(cx + r * math.cos(2 * math.pi * i / n), cy + r * math.sin(2 * math.pi * i / n)) for i in range(n)]


SAPINS = [
    (163, 1011, 56), (310, 1001, 74), (474, 990, 90), (663, 1012, 68),          # berge sud-ouest
    (45, 18, 56), (179, 37, 76), (292, 16, 52), (430, 20, 30), (558, 44, 82), (670, 26, 48),  # berge nord
    (1020, 40, 76), (1220, 30, 52),
]
ROCHERS = [(1423, 172, 46), (1427, 202, 30), (1458, 243, 24), (225, 905, 32), (213, 932, 16), (236, 953, 18)]
CAILLOU = ruban([(122, 940), (126, 965), (118, 995)], 22)
CORDE = cercle(-8, 915, 118) + []
QUEUE = ruban([(0, 1006), (52, 990), (79, 954), (92, 917), (121, 893), (176, 893)], 16)

combler('iles-celestes', [
    *[dict(nom=f'sapin-{i}', poly=cercle(x, y, r), mode='inpaint', grow=12) for i, (x, y, r) in enumerate(SAPINS)],
    *[dict(nom=f'rocher-{i}', poly=cercle(x, y, r), mode='inpaint', grow=10) for i, (x, y, r) in enumerate(ROCHERS)],
    dict(nom='caillou', poly=CAILLOU, mode='inpaint', grow=8),
    dict(nom='corde', poly=CORDE, mode='inpaint', grow=12),
    dict(nom='queue', poly=QUEUE, mode='inpaint', grow=8),
], mode='inpaint', debug='/tmp/w/ic-mask.png')
