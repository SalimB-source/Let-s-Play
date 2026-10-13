"""
Fabrique la plaque « vide » des Cavernes de Cristal : la peinture sans les huit
amas d'améthystes et de rubis, que la 3D reconstruit (voir
docs/rpg/12-decor-3d-table.md et erg-du-sahara.py pour le principe).

Ici les cristaux sont les seuls éléments saturés violet / rouge sur de
l'obsidienne sombre : un masque par teinte les isole dans des boîtes de
recherche (coordonnées de l'image vue en 1568 px de large). Chaque boîte est
ensuite comblée avec de l'obsidienne prélevée plus à l'intérieur de la peinture
(décalage `shift`), fusionnée par copie à bord adouci. Le reste de la peinture
est inchangé au pixel près : l'alignement avec les objets 3D est exact.

Dépendances : pip install pillow numpy opencv-python-headless
Usage : python3 scripts/plaque-vide/cavernes-de-cristal.py [--debug]
"""
import os, sys
import numpy as np, cv2

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = os.path.join(ROOT, 'public', 'plateau-cavernes-de-cristal.jpg')
OUT = os.path.join(ROOT, 'public', 'plateau-cavernes-de-cristal-vide.jpg')

# (x0, y0, x1, y1) en px de l'image vue à 1568 de large ; shift (dx, dy) du donneur.
BOXES = {
    'tl-gauche':  dict(box=(0, 0, 118, 218), shift=(330, 90)),
    'tl-haut':    dict(box=(148, 0, 318, 118), shift=(60, 260)),
    'tr-haut':    dict(box=(1288, 0, 1468, 132), shift=(20, 330)),
    'tr-rubis':   dict(box=(1468, 0, 1568, 152), shift=(-40, 430)),
    'br-rubis':   dict(box=(1436, 800, 1568, 1012), shift=(-330, -120)),
    'br-bas':     dict(box=(1258, 918, 1446, 1045), shift=(-50, -250)),
    'bl-gauche':  dict(box=(0, 800, 112, 1012), shift=(250, -130)),
    'bl-bas':     dict(box=(148, 898, 362, 1045), shift=(100, -280)),
}

im = cv2.imread(SRC)
H, W = im.shape[:2]
S = W / 1568.0
hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
h, s, v = hsv[..., 0].astype(int), hsv[..., 1].astype(int), hsv[..., 2].astype(int)
# Violet (améthyste) ; rouge / rose (rubis), y compris les reflets clairs. Les
# veines de lave sont orange (teinte 5-30) : elles restent hors du masque.
purple = (h >= 118) & (h <= 160) & (s > 45) & (v > 55)
red = ((h >= 164) | (h <= 3)) & (s > 55) & (v > 70)
color = (purple | red).astype(np.uint8) * 255

PAD = 80
out = cv2.copyMakeBorder(im, PAD, PAD, PAD, PAD, cv2.BORDER_REFLECT)
kernel = lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
full = np.zeros((H, W), np.uint8)
for name, spec in BOXES.items():
    x0, y0, x1, y1 = [int(round(c * S)) for c in spec['box']]
    x1, y1 = min(x1, W), min(y1, H)
    region = np.zeros((H, W), np.uint8)
    region[y0:y1, x0:x1] = color[y0:y1, x0:x1]
    region = cv2.morphologyEx(region, cv2.MORPH_CLOSE, kernel(int(14 * S)))
    count, labels, stats, _ = cv2.connectedComponentsWithStats(region)
    keep = np.zeros_like(region)
    for i in range(1, count):
        if stats[i, cv2.CC_STAT_AREA] > 900 * S * S:
            keep[labels == i] = 255
    # Marge pour le liseré anti-crénelage et l'ombre peinte du cristal.
    keep = cv2.dilate(keep, kernel(int(11 * S)))
    full = cv2.bitwise_or(full, keep)
    dx, dy = int(spec['shift'][0] * S), int(spec['shift'][1] * S)
    # Le donneur : out[y + dy, x + dx] vient en (x, y), donc on prélève vers l'intérieur.
    donor = np.roll(np.roll(out, -dy, axis=0), -dx, axis=1)
    padded = cv2.copyMakeBorder(keep, PAD, PAD, PAD, PAD, cv2.BORDER_CONSTANT, value=0)
    # Bord adouci : l'obsidienne est sombre partout, le raccord reste discret.
    alpha = cv2.GaussianBlur(padded, (0, 0), 5 * S).astype(np.float32)[..., None] / 255.0
    alpha = np.clip(alpha * 1.6, 0, 1)
    out = (donor * alpha + out * (1 - alpha)).astype(np.uint8)
    print(name, ': %d px² comblés' % (np.count_nonzero(keep) / S / S))

result = out[PAD:PAD + H, PAD:PAD + W]
if '--debug' in sys.argv:
    cv2.imwrite('/tmp/cav-mask.png', full)
small = cv2.resize(result, (2048, 1365), interpolation=cv2.INTER_AREA)
cv2.imwrite(OUT, small, [cv2.IMWRITE_JPEG_QUALITY, 86])
print('plateau-cavernes-de-cristal-vide.jpg écrit')
