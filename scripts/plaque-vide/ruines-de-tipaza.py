"""
Plaque « vide » des Ruines de Tipaza : sans la pièce de monnaie et les quatre
escargots (reconstruits en 3D). Les fûts, le chapiteau, l'amphore, les tessons,
la mosaïque et les dalles restent peints : en perspective oblique et très
ouvragés, ils seraient moins beaux refaits en maquette que dans la peinture. Voir _commun.py pour le procédé.

Ces objets sont petits et opaques : on comble par le pourtour (`mode='inpaint'`).

Usage : python3 scripts/plaque-vide/ruines-de-tipaza.py
"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _commun import combler


def cercle(cx, cy, r, n=24):
    return [(cx + r * math.cos(2 * math.pi * i / n), cy + r * math.sin(2 * math.pi * i / n)) for i in range(n)]


# Coordonnées de l'image vue en 1568 px de large, ombre peinte comprise.
REGIONS = [
    ('piece', cercle(1213, 806, 36)),
    ('escargot-1', cercle(1164, 975, 24)),
    ('escargot-2', cercle(1225, 947, 19)),
    ('escargot-3', cercle(1025, 1003, 21)),
    ('escargot-4', cercle(1278, 353, 21)),
]

# Petits objets : un lissage court (`flou`) garde le grain de la dalle autour.
combler('ruines-de-tipaza', [dict(nom=nom, poly=poly, mode='inpaint', grow=3, flou=3, rayon=5) for nom, poly in REGIONS], mode='inpaint')
