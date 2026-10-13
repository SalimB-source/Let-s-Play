"""
Outils communs des scripts de plaque « vide » (voir docs/rpg/12-decor-3d-table.md).

`combler(plateau, regions, ...)` efface des objets peints : chaque région est un
polygone (coordonnées de l'image vue en 1568 px de large, ombre peinte comprise),
élargi de `grow` px, puis comblé avec la matière prélevée ailleurs dans la même
peinture (décalage `shift` = où prendre le donneur, vers (dx, dy)). Le raccord est
une fusion par gradient (`mode='poisson'`, bien pour le sable) ou une copie à bord
adouci (`mode='doux'`, pour les fonds sombres où la fusion étale les teintes).
Le reste de la peinture est inchangé au pixel près : l'alignement avec les objets
3D est exact. La sortie est réduite à 2048 px (taille maximale des textures).
"""
import os
import numpy as np
import cv2

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
PAD = 80


def _kernel(radius):
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * radius + 1, 2 * radius + 1))


def combler(plateau, regions, mode='poisson', grow=14, debug=None):
    src = os.path.join(ROOT, 'public', f'plateau-{plateau}.jpg')
    out_path = os.path.join(ROOT, 'public', f'plateau-{plateau}-vide.jpg')
    im = cv2.imread(src)
    H, W = im.shape[:2]
    S = W / 1568.0
    out = cv2.copyMakeBorder(im, PAD, PAD, PAD, PAD, cv2.BORDER_REFLECT)
    full = np.zeros((H + 2 * PAD, W + 2 * PAD), np.uint8)
    for region in regions:
        # Le masque est dessiné dans la marge aussi : un objet qui touche le bord
        # de l'image doit être comblé jusque dans la réflexion, sinon la fusion
        # de gradient y prendrait ses conditions limites (donc l'objet).
        padded = np.zeros((H + 2 * PAD, W + 2 * PAD), np.uint8)
        pts = (np.array(region['poly'], np.float32) * S).astype(np.int32) + PAD
        cv2.fillPoly(padded, [pts], 255)
        if 'clip' in region:  # (x0, x1) en px 1568 : ne garde qu'une tranche
            x0, x1 = [int(c * S) + PAD for c in region['clip']]
            padded[:, :x0] = 0
            padded[:, x1:] = 0
        padded = cv2.dilate(padded, _kernel(int(region.get('grow', grow) * S)))
        full = cv2.bitwise_or(full, padded)
        dx, dy = int(region['shift'][0] * S), int(region['shift'][1] * S)
        # Le donneur : out[y + dy, x + dx] vient en (x, y).
        donor = np.roll(np.roll(out, -dy, axis=0), -dx, axis=1)
        ys, xs = np.nonzero(padded)
        if len(xs) == 0:
            continue
        if region.get('mode', mode) == 'poisson':
            box = (slice(max(ys.min() - 4, 0), ys.max() + 5), slice(max(xs.min() - 4, 0), xs.max() + 5))
            center = ((box[1].start + box[1].stop - 1) // 2, (box[0].start + box[0].stop - 1) // 2)
            out = cv2.seamlessClone(donor[box], out, padded[box], center, cv2.NORMAL_CLONE)
        else:
            alpha = cv2.GaussianBlur(padded, (0, 0), 5 * S).astype(np.float32)[..., None] / 255.0
            alpha = np.clip(alpha * 1.6, 0, 1)
            out = (donor * alpha + out * (1 - alpha)).astype(np.uint8)
        print(region.get('nom', '?'), ': %d px² comblés' % (np.count_nonzero(padded) / S / S))
    result = out[PAD:PAD + H, PAD:PAD + W]
    if debug:
        cv2.imwrite(debug, full[PAD:PAD + H, PAD:PAD + W])
    small = cv2.resize(result, (2048, 1365), interpolation=cv2.INTER_AREA)
    cv2.imwrite(out_path, small, [cv2.IMWRITE_JPEG_QUALITY, 86])
    print(f'plateau-{plateau}-vide.jpg écrit')


def ruban(points, demi_largeur):
    """Le polygone d'un trait épais le long d'une ligne brisée (cordes, manches), en px 1568."""
    pts = np.array(points, np.float32)
    left, right = [], []
    for i, p in enumerate(pts):
        a = pts[max(i - 1, 0)]
        b = pts[min(i + 1, len(pts) - 1)]
        d = b - a
        d = d / (np.linalg.norm(d) + 1e-6)
        n = np.array([-d[1], d[0]])
        left.append(tuple(p + n * demi_largeur))
        right.append(tuple(p - n * demi_largeur))
    return left + right[::-1]
