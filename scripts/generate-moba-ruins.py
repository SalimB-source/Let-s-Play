"""Crée les trois calques de ruines de chaque plateau MOBA.

Exécuter avec Pillow dans un environnement Python adapté :
  python -m venv /tmp/moba-ruins-venv
  /tmp/moba-ruins-venv/bin/pip install pillow
  /tmp/moba-ruins-venv/bin/python scripts/generate-moba-ruins.py
Les calques sont transparents ailleurs que sur leur voie et peuvent se superposer
lorsque deux voies sont conquises. Ne modifie jamais les décors originaux.
"""
from pathlib import Path
import math
import random
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1] / 'public' / 'sablier-moba'
WIDTH, HEIGHT = 1376, 768
# La carte est la même projection pour les cinq décors. Les bords de chaque
# calque restent à l'intérieur de la voie, pour préserver berges et monuments.
LANES = {'left': (284, 552), 'center': (616, 762), 'right': (826, 1092)}
PALETTES = {
    'champ-trois-voies-rapprochees': ((44, 35, 23), (13, 22, 20), (159, 132, 84)),
    'port-des-corsaires': ((31, 49, 52), (9, 29, 38), (130, 175, 171)),
    'erg-des-ksour': ((92, 52, 24), (50, 27, 17), (217, 158, 82)),
    'lac-gele-viking': ((31, 75, 97), (8, 39, 61), (161, 224, 234)),
    'temple-du-nil-egyptien': ((101, 66, 34), (41, 30, 23), (232, 174, 94)),
}


def ruined_lane(name, lane, colors):
    left, right = LANES[lane]
    mid, half = (left + right) / 2, (right - left) / 2
    seed = sum((i + 1) * ord(c) for i, c in enumerate(name + lane))
    rng = random.Random(seed)
    earth, abyss, light = colors
    img = Image.new('RGBA', (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(img, 'RGBA')
    # Poussière / glace pulvérisée / sel marin sur l'ensemble de la voie.
    for _ in range(2200):
        x, y = rng.randint(left, right), rng.randint(0, HEIGHT)
        radius = rng.choice((1, 1, 2, 3, 5))
        shade = light if rng.random() < .3 else earth
        draw.ellipse((x-radius, y-radius, x+radius, y+radius), fill=(*shade, rng.randint(12, 50)))

    # Faille irrégulière continue, dont les lèvres et les blocs conservent le
    # style colorimétrique du plateau : pas de bandes plates ni de X sur l'image.
    steps = list(range(-18, HEIGHT + 28, 16))
    route = []
    for y in steps:
        bend = math.sin(y / 95 + seed) * half * .09 + math.sin(y / 37 + seed) * half * .045
        breadth = half * (.57 + .11 * math.sin(y / 66 + seed / 3))
        route.append((y, mid+bend, breadth))
    def edges(multiplier, jitter=0):
        a, b = [], []
        for y, cx, width in route:
            noise = rng.uniform(-jitter, jitter)
            a.append((int(cx-width*multiplier+noise), y))
            b.append((int(cx+width*multiplier+noise), y))
        return a + b[::-1]
    draw.polygon(edges(1.42, 9), fill=(*earth, 145))
    rim = edges(1.32, 5)
    draw.line(rim + [rim[0]], fill=(*light, 100), width=3)
    draw.polygon(edges(1.05, 10), fill=(*earth, 213))
    draw.polygon(edges(.64, 8), fill=(*abyss, 224))

    # Fissures ramifiées, éclats de la surface, ombres courtes des gravats.
    for _ in range(115):
        y = rng.randrange(0, HEIGHT)
        x = mid + rng.uniform(-half * 1.04, half * 1.04)
        direction = -1 if x < mid else 1
        length = rng.uniform(12, 80 if lane != 'center' else 47)
        points = [(int(x), y)]
        for i in range(1, 5):
            points.append((int(x + direction * length * i/4 + rng.uniform(-5, 5)),
                           int(y + rng.uniform(-16, 16))))
        points = [(max(left, min(right, px)), max(0, min(HEIGHT, py))) for px, py in points]
        draw.line(points, fill=(*abyss, 185), width=rng.choice((2, 3, 4)))
        draw.line([(px, max(0, py-2)) for px, py in points], fill=(*light, 105), width=1)
    for _ in range(255):
        y = rng.randint(0, HEIGHT)
        x = rng.randint(left+4, right-4)
        size = rng.randint(3, 18 if lane != 'center' else 11)
        shard = [(x, y), (min(right, x+size), y+rng.randint(-5, 5)),
                 (max(left, x+rng.randint(-size, size)), min(HEIGHT, y+size))]
        draw.polygon(shard, fill=(*earth, rng.randint(100, 225)), outline=(*light, 110))
    # Évite tout débordement sur les voies voisines, même après interpolation.
    img.save(ROOT / f'{name}-detruit-{lane}.webp', 'WEBP', lossless=True, method=6)


if __name__ == '__main__':
    for name, colors in PALETTES.items():
        for lane in LANES:
            ruined_lane(name, lane, colors)
