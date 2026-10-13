"""
Plaque « vide » du Fjord des Neuf Hivers : sans la lanterne, le cor, la hache, la
corde et le bâton de runes (reconstruits en 3D). Voir _commun.py pour le procédé.
Fond de roche et de glace : on copie des morceaux voisins, à bord adouci.

Usage : python3 scripts/plaque-vide/fjord-des-neuf-hivers.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _commun import combler, ruban

LANTERN = [(20, 60), (40, 42), (70, 40), (95, 65), (115, 90), (125, 100), (160, 120), (175, 150), (185, 185),
           (195, 215), (215, 260), (225, 310), (230, 350), (228, 390), (218, 408), (222, 432), (205, 452),
           (150, 468), (110, 462), (100, 432), (55, 408), (35, 332), (10, 272), (0, 215), (0, 150), (15, 140),
           (25, 110), (15, 80)]
HORN = [(6, 609), (12, 571), (94, 549), (175, 546), (188, 581), (216, 596), (250, 665), (259, 727), (256, 771),
        (300, 787), (325, 815), (350, 865), (400, 890), (475, 927), (506, 965), (531, 1015), (544, 1045),
        (519, 1045), (475, 1015), (425, 977), (362, 956), (294, 940), (244, 921), (206, 906), (169, 852),
        (125, 809), (87, 759), (50, 702), (22, 662)]
HORN_CORD = ruban([(188, 584), (225, 615), (250, 684), (247, 746), (212, 815), (206, 865), (216, 915),
                   (250, 971), (300, 1015), (325, 1040)], 12)
HORN_TAIL = ruban([(0, 788), (60, 805), (125, 815)], 10)
AXE_HEAD = [(1090, 298), (1150, 250), (1200, 212), (1250, 212), (1265, 245), (1245, 280), (1215, 300),
            (1200, 350), (1160, 362), (1100, 306)]
AXE_HANDLE = ruban([(1212, 252), (1300, 335), (1400, 430), (1480, 520), (1541, 582), (1568, 605)], 32)
ROPE = [(1235, 150), (1260, 115), (1330, 105), (1400, 125), (1440, 160), (1500, 150), (1568, 150), (1568, 420),
        (1500, 425), (1440, 410), (1400, 382), (1370, 362), (1340, 332), (1300, 302), (1250, 252), (1235, 200)]
STAFF = [(1483, 621), (1549, 668), (1540, 720), (1500, 790), (1440, 860), (1385, 935), (1340, 985), (1260, 1012),
         (1214, 1026), (1228, 980), (1270, 925), (1330, 850), (1400, 740), (1445, 670)]

combler('fjord-des-neuf-hivers', [
    dict(nom='lanterne', poly=LANTERN, shift=(240, 90), grow=22),
    dict(nom='cor', poly=HORN, shift=(0, -400), grow=22),
    dict(nom='cor-sangle', poly=HORN_CORD, shift=(0, -400), grow=10),
    dict(nom='cor-bout', poly=HORN_TAIL, shift=(0, -400), grow=10),
    dict(nom='hache-fer', poly=AXE_HEAD, shift=(-200, 30), grow=18),
    dict(nom='hache-manche', poly=AXE_HANDLE, shift=(-200, 30), grow=16),
    dict(nom='corde', poly=ROPE, shift=(-420, 40), grow=18),
    dict(nom='baton', poly=STAFF, shift=(-270, -40), grow=18),
], mode='poisson', debug='/tmp/w/fjord-mask.png')
