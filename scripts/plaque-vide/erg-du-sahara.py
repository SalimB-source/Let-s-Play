"""
Fabrique la plaque « vide » d'un plateau : la peinture sans les objets que la
3D reconstruit (voir docs/rpg/12-decor-3d-table.md).

Procédé :
  1. Une image donneuse du même plateau, SANS les objets, est obtenue avec un
     modèle d'édition d'image (« retire seulement ces objets et leurs ombres,
     garde tout le reste »). Elle est souvent recadrée : on ne la substitue
     pas, on ne s'en sert que comme réserve de sable.
  2. Chaque objet est entouré d'un polygone (coordonnées de l'image vue en
     1568 px de large), élargi de 40 px pour les ombres peintes.
  3. Le sable de la donneuse est fusionné dans la peinture d'ORIGINE, seulement
     dans ces polygones, par clonage de gradient (Poisson) : le reste de la
     peinture reste identique au pixel près, donc l'alignement avec les objets
     3D est exact. `dx`/`dy` décalent la zone de la donneuse pour éviter d'y
     recopier un autre objet ou une ombre de dune.
  4. La sortie 3840x2560 est réduite à 2048 px (taille maximale des textures
     de la scène) dans public/.

Dépendances : pip install pillow numpy opencv-python-headless
Usage : python3 scripts/plaque-vide/erg-du-sahara.py
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
import numpy as np, cv2
SRC=os.path.join(ROOT, 'public', 'plateau-erg-du-sahara.jpg')
im = cv2.imread(SRC); H, W = im.shape[:2]
ai = cv2.imread(os.path.join(HERE, 'erg-du-sahara-donneuse.jpg')); ai = cv2.resize(ai, (W, H), interpolation=cv2.INTER_CUBIC)
S = W/1568.0
def poly(pts): return (np.array(pts, np.float32)*S).astype(np.int32)
regions = {
 'lantern_skin': dict(shapes=[
    ('poly', [(160,688),(205,683),(245,700),(252,760),(240,830),(215,880),(222,960),(215,998),(100,998),(40,975),(35,920),(70,850),(110,790),(140,730)]),
    ('poly', [(192,1045),(190,985),(215,930),(238,870),(240,825),(262,820),(272,845),(310,875),(380,888),(430,915),(445,960),(440,1045)])], dy=-0.12, dx=0.10),
 'stones_bowl': dict(shapes=[
    ('poly', [(1238,805),(1265,775),(1315,765),(1365,772),(1400,790),(1402,850),(1380,885),(1340,895),(1320,925),(1280,935),(1262,912),(1275,880),(1245,860)]),
    ('ell', (1445,915,88,82))], dy=0.0, dx=0.0),
 'rope': dict(shapes=[
    ('poly', [(1335,232),(1350,215),(1400,195),(1425,110),(1470,92),(1540,100),(1568,110),(1568,296),(1500,296),(1440,276),(1380,252)])], dy=0.27, dx=0.0),
}
PAD=60
out = cv2.copyMakeBorder(im, PAD,PAD,PAD,PAD, cv2.BORDER_REFLECT)
aip = cv2.copyMakeBorder(ai, PAD,PAD,PAD,PAD, cv2.BORDER_REFLECT)
full = np.zeros((H,W),np.uint8)
for name, r in regions.items():
    m = np.zeros((H,W),np.uint8)
    for kind, data in r['shapes']:
        if kind=='poly': cv2.fillPoly(m, [poly(data)], 255)
        else:
            cx,cy,ax,ay = [v*S for v in data]; cv2.ellipse(m,(int(cx),int(cy)),(int(ax),int(ay)),0,0,360,255,-1)
    m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(81,81)))
    full |= m
    mp = cv2.copyMakeBorder(m, PAD,PAD,PAD,PAD, cv2.BORDER_CONSTANT, value=0)
    # extend the mask into the padding where it touches the border so no object sliver remains
    for side in range(4):
        pass
    ys,xs = np.where(m>0)
    x0,x1,y0,y1 = xs.min(),xs.max(),ys.min(),ys.max()
    if x0==0: mp[:, :PAD][ (m[:, :1]>0).repeat(PAD,1).T.T if False else slice(None)] |= 0
    # touching borders: fill the padding strip next to touched border columns/rows
    if x0==0:  mp[PAD:PAD+H, :PAD] = np.where(m[:, :1]>0, 255, 0).repeat(PAD,1)
    if x1==W-1: mp[PAD:PAD+H, PAD+W:] = np.where(m[:, -1:]>0, 255, 0).repeat(PAD,1)
    if y1==H-1: mp[PAD+H:, PAD:PAD+W] = np.where(m[-1:, :]>0, 255, 0).repeat(PAD,0)
    if y0==0:  mp[:PAD, PAD:PAD+W] = np.where(m[:1, :]>0, 255, 0).repeat(PAD,0)
    # donor shifted
    M = np.float32([[1,0,-r['dx']*W],[0,1,-r['dy']*H]])
    donor = cv2.warpAffine(aip, M, (aip.shape[1], aip.shape[0]), borderMode=cv2.BORDER_REFLECT)
    ys,xs = np.where(mp>0); bx0,bx1,by0,by1 = xs.min(),xs.max(),ys.min(),ys.max()
    # keep the paste region strictly inside the destination so Poisson has neighbours
    bx0=max(bx0,2); by0=max(by0,2); bx1=min(bx1,out.shape[1]-3); by1=min(by1,out.shape[0]-3)
    sub = mp[by0:by1+1, bx0:bx1+1].copy(); src = donor[by0:by1+1, bx0:bx1+1].copy()
    center = ((bx0+bx1)//2, (by0+by1)//2)
    out = cv2.seamlessClone(src, out, sub, center, cv2.NORMAL_CLONE)
res = out[PAD:PAD+H, PAD:PAD+W]
res = cv2.resize(res, (2048, 1365), interpolation=cv2.INTER_AREA)
cv2.imwrite(os.path.join(ROOT, 'public', 'plateau-erg-du-sahara-vide.jpg'), res, [cv2.IMWRITE_JPEG_QUALITY, 86])
print('plateau-erg-du-sahara-vide.jpg écrit')
