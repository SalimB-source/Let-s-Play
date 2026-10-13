"""
Plaque vide des Cavernes de Cristal : on efface les huit amas de cristaux
(améthystes à gauche, rubis à droite). Ils sont violets ou rose-rouge, la lave
est orange : une segmentation par teinte suffit, sans polygone à la main.

Dépendances : pip install pillow numpy opencv-python-headless
Usage : python3 scripts/plaque-vide/cavernes-de-cristal.py
"""
import cv2
import numpy as np
from lib import charger, composantes, exporter, masque_depuis_vue, remplir

PLATEAU = 'cavernes-de-cristal'


def masque_cristaux(im):
    """Masque (255) des amas de cristaux, mesuré sur la vue réduite à 1568 px puis agrandi."""
    sm = cv2.resize(im, (1568, round(im.shape[0] * 1568 / im.shape[1])), interpolation=cv2.INTER_AREA)
    hsv = cv2.cvtColor(sm, cv2.COLOR_BGR2HSV)
    h, s, v = [hsv[..., i].astype(int) for i in range(3)]
    violet = (h >= 122) & (h <= 166) & (s > 45) & (v > 70)
    rouge = ((h >= 160) | (h <= 1)) & (s > 100) & (v > 55)
    m = ((violet | rouge) * 255).astype(np.uint8)
    yy, xx = np.mgrid[0:sm.shape[0], 0:sm.shape[1]]
    m[((xx - 784) ** 2 + (yy - 522) ** 2) < 400 ** 2] = 0  # l'anneau runique du centre est violet aussi
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))
    m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))
    parts, _ = composantes(m, aire_min=1500)  # écarte les reflets isolés
    final = np.zeros_like(m)
    for part in parts:
        final |= part
    # Les facettes à l'ombre sont presque noires : on déborde, la roche refaite est naturelle.
    final = cv2.dilate(final, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))
    return masque_depuis_vue(final, (im.shape[1], im.shape[0])), final


if __name__ == '__main__':
    im = charger(PLATEAU)
    masque, vue = masque_cristaux(im)
    _, stats = composantes(vue, aire_min=1500)
    for x, y, w, h, aire in stats:
        print(f'amas {x},{y} {w}x{h} (vue 1568 px)')
    exporter(remplir(im, (masque > 127).astype(np.uint8) * 255), PLATEAU)
