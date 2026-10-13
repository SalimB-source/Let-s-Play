"""
Plaque « vide » des Abysses Phosphorescentes : sans la raie manta et sans
l'anneau de coquillages du centre (reconstruits en 3D, la manta bat des ailes).
Les amphores, les colonnes et les coraux restent peints : plusieurs sont
recouverts par les coraux, la maquette ne les égalerait pas. Voir _commun.py.

L'eau et le sable sont lisses : on comble par le pourtour (`mode='inpaint'`).

Usage : python3 scripts/plaque-vide/abysses-phosphorescentes.py
"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _commun import combler, ruban

# Coordonnées de l'image vue en 1568 px de large, ombre peinte comprise.
MANTA = [(1402, 120), (1418, 158), (1440, 178), (1470, 190), (1497, 198), (1508, 213), (1516, 245), (1530, 272), (1552, 291),
         (1568, 296), (1568, 306), (1540, 304), (1495, 300), (1460, 308), (1432, 312), (1415, 314), (1395, 310), (1388, 300),
         (1388, 282), (1400, 262), (1396, 240), (1390, 200), (1388, 160)]
OMBRE_MANTA = [(1362, 182), (1392, 175), (1396, 292), (1380, 297), (1366, 260)]
QUEUE = ruban([(1492, 196), (1530, 160), (1580, 120)], 8)

# L'anneau : cercle de centre (783, 523), rayon 255, en seize arcs.
CENTRE, RAYON, ARCS = (783, 523), 255, 16
anneau = []
for k in range(ARCS):
    a0 = 2 * math.pi * k / ARCS - 0.04
    a1 = 2 * math.pi * (k + 1) / ARCS + 0.04
    pts = [(CENTRE[0] + RAYON * math.cos(a0 + (a1 - a0) * i / 5), CENTRE[1] + RAYON * math.sin(a0 + (a1 - a0) * i / 5)) for i in range(6)]
    anneau.append((f'anneau-{k}', ruban(pts, 22)))

regions = [('manta', MANTA, dict(flou=10, rayon=14)), ('ombre-manta', OMBRE_MANTA, dict(flou=10, rayon=14)), ('queue', QUEUE, dict(flou=8, rayon=10))]
regions += [(nom, poly, dict(flou=7, rayon=10)) for nom, poly in anneau]
combler('abysses-phosphorescentes', [dict(nom=nom, poly=poly, mode='inpaint', grow=5, **opt) for nom, poly, opt in regions], mode='inpaint')
