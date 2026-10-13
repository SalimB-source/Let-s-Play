"""
Outils communs de fabrication des plaques « vides » (voir erg-du-sahara.py et
docs/rpg/12-decor-3d-table.md) : on efface d'une peinture les objets que la 3D
reconstruit, en gardant le reste identique au pixel près.

`remplir` efface chaque zone du masque en y clonant (clonage de gradient /
Poisson) un morceau de la même peinture, pris ailleurs : le décalage est
choisi automatiquement, parmi une grille, pour que la couronne autour de la
zone ressemble le plus à celle du donneur, sans jamais reprendre un objet.
"""
import os
import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
PUBLIC = os.path.join(ROOT, 'public')
PAD = 80


def charger(plateau):
    im = cv2.imread(os.path.join(PUBLIC, f'plateau-{plateau}.jpg'))
    assert im is not None, plateau
    return im


def masque_depuis_vue(masque_vue, taille):
    """Un masque dessiné sur la vue réduite (1568 px) → pleine résolution."""
    w, h = taille
    return cv2.resize(masque_vue, (w, h), interpolation=cv2.INTER_LINEAR)


def composantes(masque, aire_min=1):
    n, lab, st, _ = cv2.connectedComponentsWithStats((masque > 127).astype(np.uint8))
    return [(lab == i).astype(np.uint8) * 255 for i in range(1, n) if st[i, 4] >= aire_min], st[1:]


def remplir(im, masque, interdit=None, portee=0.32, pas=0.02, graine_ring=26, reduction=4):
    """Efface `masque` (255 = à effacer) dans `im`. `interdit` : zones à ne jamais copier."""
    h, w = im.shape[:2]
    out = cv2.copyMakeBorder(im, PAD, PAD, PAD, PAD, cv2.BORDER_REFLECT)
    parts, _ = composantes(masque)
    interdit = masque if interdit is None else interdit
    interdit_big = cv2.dilate(interdit, np.ones((31, 31), np.uint8))
    r = reduction
    small = cv2.resize(im, (w // r, h // r), interpolation=cv2.INTER_AREA).astype(np.int16)
    forbidden_s = cv2.resize(interdit_big, (w // r, h // r), interpolation=cv2.INTER_NEAREST) > 0
    sw, sh = w // r, h // r
    ring_px = max(2, graine_ring // r)
    for part in parts:
        ys, xs = np.where(part > 0)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        bw, bh = x1 - x0, y1 - y0
        part_s = cv2.resize(part, (sw, sh), interpolation=cv2.INTER_NEAREST) > 0
        ring_s = (cv2.dilate(part_s.astype(np.uint8), np.ones((ring_px * 2 + 1,) * 2, np.uint8)) > 0) & ~part_s
        sx0, sx1, sy0, sy1 = x0 // r, -(-x1 // r), y0 // r, -(-y1 // r)
        best = None
        for dy in np.arange(-portee, portee + 1e-9, pas):
            for dx in np.arange(-portee, portee + 1e-9, pas):
                sx, sy = int(round(dx * sw)), int(round(dy * sh))
                if abs(sx * r) < bw * 0.6 and abs(sy * r) < bh * 0.6:
                    continue
                if sx0 + sx - ring_px < 0 or sy0 + sy - ring_px < 0 or sx1 + sx + ring_px > sw or sy1 + sy + ring_px > sh:
                    continue
                # le donneur ne doit contenir aucun objet
                if forbidden_s[sy0 + sy:sy1 + sy, sx0 + sx:sx1 + sx].any():
                    continue
                src = np.roll(np.roll(small, -sy, axis=0), -sx, axis=1)
                diff = np.abs(src - small)[ring_s].mean()
                # préfère un donneur proche : à ressemblance égale, moins de déplacement
                score = diff + 6.0 * (abs(dx) + abs(dy))
                if best is None or score < best[0]:
                    best = (score, sx * r, sy * r)
        assert best, 'aucun donneur sans objet'
        _, sx, sy = best
        src = np.roll(np.roll(im, -sy, axis=0), -sx, axis=1)
        srcp = cv2.copyMakeBorder(src, PAD, PAD, PAD, PAD, cv2.BORDER_REFLECT)
        mp = cv2.copyMakeBorder(part, PAD, PAD, PAD, PAD, cv2.BORDER_CONSTANT, value=0)
        m = 20
        X0, X1, Y0, Y1 = x0 + PAD - m, x1 + PAD + m, y0 + PAD - m, y1 + PAD + m
        patch = srcp[Y0:Y1, X0:X1]
        sub = mp[Y0:Y1, X0:X1].copy()
        # NORMAL_CLONE exige un masque qui ne touche pas le bord de la sous-image
        sub[:2] = 0; sub[-2:] = 0; sub[:, :2] = 0; sub[:, -2:] = 0
        out = cv2.seamlessClone(patch, out, sub, ((X0 + X1) // 2, (Y0 + Y1) // 2), cv2.NORMAL_CLONE)
        print(f'  zone {x0},{y0} {bw}x{bh} ← décalage ({sx},{sy}) score {best[0]:.1f}')
    return out[PAD:PAD + h, PAD:PAD + w]


def exporter(im, plateau, largeur=2048):
    h, w = im.shape[:2]
    res = cv2.resize(im, (largeur, round(h * largeur / w)), interpolation=cv2.INTER_AREA)
    path = os.path.join(PUBLIC, f'plateau-{plateau}-vide.jpg')
    cv2.imwrite(path, res, [cv2.IMWRITE_JPEG_QUALITY, 86])
    print(f'plateau-{plateau}-vide.jpg écrit ({res.shape[1]}x{res.shape[0]})')
