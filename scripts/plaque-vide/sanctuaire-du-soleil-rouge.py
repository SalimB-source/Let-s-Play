"""
Plaque « vide » du Sanctuaire du Soleil rouge : la peinture sans les objets que
la 3D reconstruit — le torii vermillon, ses deux lanternes de pierre et le
service rangé au bord droit (bol laqué, éventail, plateau de saké, flacon). Voir
docs/rpg/12-decor-3d-table.md pour le procédé.

Comme pour l'Erg du Sahara et le Fjord, l'image donneuse (sans ces objets) vient
d'un modèle d'édition d'image : elle est souvent recadrée, on ne la substitue
donc pas — on ne s'en sert que comme réserve de matière. Chaque objet est
entouré d'un polygone (coordonnées de l'image vue en 1568 px de large), élargi
de 40 px pour les ombres peintes, puis remplacé par le fond de la donneuse par
clonage de gradient (Poisson) : le reste de la peinture reste identique au pixel
près, donc l'alignement est exact.

Deux retouches propres à cette estampe, là où le clonage de Poisson étale la
teinte au lieu d'inventer un trait :

  · les **pierres noires du passage** restent peintes (elles n'ont pas de relief
    à gagner) : le clonage les a effacées avec le torii, on les recolle depuis la
    peinture d'origine ;
  · sous le service rangé, Poisson laisse une tache sombre et casse les **lignes
    de ratissage** : on recopie un morceau de gravier propre de la même hauteur
    (le bas de cour, à gauche) avec un bord adouci, puis les lignes se
    raccordent d'elles-mêmes.

Dépendances : pip install opencv-python-headless numpy
Usage : python3 scripts/plaque-vide/sanctuaire-du-soleil-rouge.py
"""
import os
import numpy as np
import cv2

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = os.path.join(ROOT, 'public', 'plateau-sanctuaire-du-soleil-rouge.jpg')
DONOR = os.path.join(HERE, 'sanctuaire-du-soleil-rouge-donneuse.jpg')
OUT = os.path.join(ROOT, 'public', 'plateau-sanctuaire-du-soleil-rouge-vide.jpg')

PEINTURE = cv2.imread(SRC)
H, W = PEINTURE.shape[:2]
S = W / 1568.0                       # l'échelle des repères : l'image vue en 1568 px
donneuse = cv2.resize(cv2.imread(DONOR), (W, H), interpolation=cv2.INTER_CUBIC)

# Les objets effacés par clonage de gradient, en repères 1568 (polygones relevés
# sur la peinture). L'encoche entre les piliers du torii est laissée de côté :
# c'est le passage des pierres noires, qui reste peint.
REGIONS = {
    'torii': [(565, 40), (1025, 40), (1025, 145), (975, 145), (975, 215),
              (935, 215), (935, 360), (858, 360), (858, 215), (702, 215),
              (702, 360), (628, 360), (628, 215), (565, 215)],
    'lanterne-gauche': [(212, 415), (348, 415), (348, 702), (212, 702)],
    'lanterne-droite': [(1202, 412), (1358, 412), (1358, 702), (1202, 702)],
    'bol-laque': [(1162, 782), (1260, 782), (1260, 870), (1162, 870)],
    'eventail': [(1138, 848), (1350, 848), (1350, 952), (1138, 952)],
    'service-sake': [(1252, 722), (1462, 722), (1462, 898), (1252, 898)],
}

# Le morceau de gravier propre recopié sur la zone du service (repères 1568) :
# la destination, et la source prise à la même hauteur sur la gauche de la cour.
GRAVIER_DESTINATION = (1120, 1380, 790, 950)   # x0, x1, y0, y1
GRAVIER_SOURCE = (240, 500, 790, 950)

# Le passage du torii (pierres noires, sabots des piliers, ombres) : Poisson y
# laisse des taches, on y recopie franchement le gravier de la donneuse. Les
# pierres reviennent ensuite en 3D, comme le reste du décor.
PASSAGE_DESTINATION = (688, 968, 130, 452)     # x0, x1, y0, y1

PAD = 80
sortie = cv2.copyMakeBorder(PEINTURE, PAD, PAD, PAD, PAD, cv2.BORDER_REFLECT)
donneur = cv2.copyMakeBorder(donneuse, PAD, PAD, PAD, PAD, cv2.BORDER_REFLECT)


def vers_pixels(x, y):
    return int(x * S) + PAD, int(y * S) + PAD


for nom, points in REGIONS.items():
    masque = np.zeros((H, W), np.uint8)
    cv2.fillPoly(masque, [(np.array(points, np.float32) * S).astype(np.int32)], 255)
    # L'ombre peinte déborde de l'objet : 40 px, comme sur l'Erg du Sahara.
    masque = cv2.dilate(masque, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (81, 81)))
    plein = cv2.copyMakeBorder(masque, PAD, PAD, PAD, PAD, cv2.BORDER_CONSTANT, value=0)
    ys, xs = np.where(plein > 0)
    y0, y1 = max(ys.min() - 6, 2), min(ys.max() + 6, sortie.shape[0] - 3)
    x0, x1 = max(xs.min() - 6, 2), min(xs.max() + 6, sortie.shape[1] - 3)
    sub, src = plein[y0:y1, x0:x1].copy(), donneur[y0:y1, x0:x1].copy()
    sortie = cv2.seamlessClone(src, sortie, sub, ((x0 + x1) // 2, (y0 + y1) // 2), cv2.NORMAL_CLONE)
    print(f'{nom} : {int(np.count_nonzero(masque) / S / S)} px² comblés par la donneuse')

# Le gravier propre : on le pose avant les pierres, pour finir par elles.
dx0, dx1, dy0, dy1 = GRAVIER_DESTINATION
sx0, sx1, sy0, sy1 = GRAVIER_SOURCE
px0, py0 = vers_pixels(dx0, dy0)
px1, py1 = vers_pixels(dx1, dy1)
qx0, qy0 = vers_pixels(sx0, sy0)
morceau = sortie[py0:py1, qx0:qx0 + (px1 - px0)].astype(np.float32)
hauteur, largeur = morceau.shape[:2]
marge = int(28 * S)
# Un bord adouci : le morceau se fond dans le clonage, sans arête franche.
alpha = np.ones((hauteur, largeur), np.float32)
rampe = np.linspace(0, 1, marge) ** 1.6
alpha[:, :marge] *= rampe
alpha[:, -marge:] *= rampe[::-1]
alpha[:marge, :] *= rampe[:, None]
alpha[-marge:, :] *= rampe[::-1, None]
alpha = cv2.GaussianBlur(alpha, (0, 0), marge / 3.0)[..., None]
sortie[py0:py1, px0:px1] = (morceau * alpha + sortie[py0:py1, px0:px1] * (1 - alpha)).astype(np.uint8)
print(f'gravier : {largeur}×{hauteur} px recopiés sous le service')

# Le passage du torii : gravier de la donneuse, franchement recopié.
x0, x1, y0, y1 = PASSAGE_DESTINATION
px0, py0 = vers_pixels(x0, y0)
px1, py1 = vers_pixels(x1, y1)
depart = donneur[py0:py1, px0:px1].astype(np.float32)
hauteur, largeur = depart.shape[:2]
marge_passage = int(24 * S)
alpha_passage = np.ones((hauteur, largeur), np.float32)
rampe_passage = np.linspace(0, 1, marge_passage) ** 1.6
alpha_passage[:, :marge_passage] *= rampe_passage
alpha_passage[:, -marge_passage:] *= rampe_passage[::-1]
alpha_passage[:marge_passage, :] *= rampe_passage[:, None]
alpha_passage[-marge_passage:, :] *= rampe_passage[::-1, None]
alpha_passage = cv2.GaussianBlur(alpha_passage, (0, 0), marge_passage / 3.0)[..., None]
sortie[py0:py1, px0:px1] = (depart * alpha_passage + sortie[py0:py1, px0:px1] * (1 - alpha_passage)).astype(np.uint8)
print(f'passage du torii : {largeur}×{hauteur} px de gravier propre')

resultat = sortie[PAD:PAD + H, PAD:PAD + W]
resultat = cv2.resize(resultat, (2048, 1365), interpolation=cv2.INTER_AREA)
cv2.imwrite(OUT, resultat, [cv2.IMWRITE_JPEG_QUALITY, 86])
print(f'plateau-sanctuaire-du-soleil-rouge-vide.jpg écrit ({resultat.shape[1]}×{resultat.shape[0]})')
