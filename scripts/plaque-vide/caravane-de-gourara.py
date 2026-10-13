"""
Plaque « vide » de la Caravane de Gourara : sans l'outre, la corde, le compas et
le tapis roulé (reconstruits en 3D). Voir _commun.py pour le procédé : polygones
relevés à la main sur la peinture (ombres comprises), comblés avec du sable
prélevé ailleurs dans la peinture, par fusion de gradient.

Usage : python3 scripts/plaque-vide/caravane-de-gourara.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _commun import combler

CARPET = [(683, -10), (690, 45), (720, 70), (780, 92), (850, 112), (950, 135), (1050, 148),
          (1150, 158), (1215, 158), (1245, 140), (1250, -10)]
ROPE = [(1170, 150), (1230, 138), (1300, 140), (1350, 160), (1385, 205), (1402, 260), (1397, 330),
        (1352, 366), (1300, 392), (1240, 400), (1190, 394), (1150, 382), (1120, 362), (1106, 336),
        (1114, 326), (1140, 330), (1165, 350), (1170, 300), (1160, 250), (1158, 200)]
COMPASS = [(1145, 725), (1200, 722), (1245, 730), (1262, 760), (1268, 800), (1262, 840), (1230, 850),
           (1205, 880), (1205, 925), (1150, 927), (1105, 927), (1075, 924), (1072, 895), (1078, 870),
           (1082, 830), (1095, 805), (1120, 800), (1145, 790), (1148, 750)]
SKIN = [(312, 812), (340, 812), (350, 832), (385, 830), (420, 845), (450, 880), (500, 875), (560, 870),
        (610, 865), (630, 885), (650, 930), (662, 990), (667, 1055), (300, 1055), (300, 1010), (312, 985),
        (310, 950), (320, 900), (318, 880), (305, 860), (325, 850)]

combler('caravane-de-gourara', [
    dict(nom='tapis-gauche', poly=CARPET, clip=(0, 950), shift=(-560, 420)),
    dict(nom='tapis-droite', poly=CARPET, clip=(950, 1568), shift=(100, 430)),
    dict(nom='corde', poly=ROPE, shift=(0, 310)),
    dict(nom='compas', poly=COMPASS, shift=(170, -130)),
    dict(nom='outre', poly=SKIN, shift=(-180, -330)),
], mode='poisson', grow=16, debug='/tmp/gou-mask.png')
