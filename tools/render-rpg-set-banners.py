"""Render the five Sablier set slides from their landscape art and card art.

Optional authoring tool (the generated WebP banners are checked in):
    python3 -m pip install pillow
    python3 tools/render-rpg-set-banners.py

Background paintings live in tools/rpg-set-backgrounds/ so the words embedded
in the images can be changed without regenerating their scenery. Each booster
is now sold in the Souk at the same price and with the same guarantees as
Vampires; only its themed weighting differs.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SCENERY = ROOT / 'tools/rpg-set-backgrounds'
CARDS = ROOT / 'public/cards'
OUTPUT = ROOT / 'public/sablier-promo'
FONTS = Path('/usr/share/fonts/truetype/dejavu')
SERIF = FONTS / 'DejaVuSerif.ttf'
BOLD = FONTS / 'DejaVuSerif-Bold.ttf'
SANS = FONTS / 'DejaVuSans-Bold.ttf'

# The wording follows the printed rules (Abordage, Furie, Harakiri, Butin, Tribut).
SETS = {
    'pirates': {
        'name': 'PIRATES', 'art': 'la-barbe-rousse', 'headline': ('LA MER', 'PREND TOUT.'),
        'ability': 'ABORDAGE',
        'description': ("À l’arrivée, prenez en cale une", 'créature adverse de coût autorisé,', 'sans la détruire.'),
        'footer': '140 CRÉDITS   ·   RARE GARANTIE',
        'accent': (139, 213, 216), 'accent_light': (193, 239, 236),
    },
    'vikings': {
        'name': 'VIKINGS', 'art': 'valkyrie-des-glaces', 'headline': ('LE NORD', 'RIPOSTE.'),
        'ability': 'FURIE',
        'description': ("Tant qu’elle est blessée, la créature", "gagne de l’attaque et frappe", 'plus fort.'),
        'footer': '140 CRÉDITS   ·   RARE GARANTIE',
        'accent': (145, 205, 235), 'accent_light': (207, 236, 248),
    },
    'samourais': {
        'name': 'SAMOURAÏS', 'art': 'kagutsuchi-flamme-originelle', 'headline': ('LE FEU', 'SURVIT.'),
        'ability': 'HARAKIRI',
        'description': ("Quand elle meurt, la créature blesse", 'un ennemi au hasard, ou le sorcier', "adverse s’il n’y en a aucun."),
        'footer': '140 CRÉDITS   ·   RARE GARANTIE',
        'accent': (247, 143, 109), 'accent_light': (255, 195, 149),
    },
    'sable': {
        'name': 'SABLE', 'art': 'cavalier-amazigh-du-desert', 'headline': ('LES DUNES', 'S’ÉVEILLENT.'),
        'ability': 'BUTIN',
        'description': ('Quand elle touche le sorcier adverse,', 'piochez une carte, puis défaussez-en', 'une.'),
        'footer': '140 CRÉDITS   ·   RARE GARANTIE',
        'accent': (227, 181, 104), 'accent_light': (251, 220, 158),
    },
    'egyptiens': {
        'name': 'ÉGYPTIENS', 'art': 'la-devoreuse', 'headline': ('LA BALANCE', 'VOUS JUGE.'),
        'ability': 'TRIBUT',
        'description': ('Quand elle touche le sorcier adverse,', 'il perd des PV et vous en gagnez', 'autant.'),
        'footer': '140 CRÉDITS   ·   RARE GARANTIE',
        'accent': (196, 170, 237), 'accent_light': (232, 205, 255),
    },
}


def font(path, size):
    return ImageFont.truetype(str(path), size)


def write(draw, x, y, message, face, color):
    draw.text((x + 2, y + 3), message, font=face, fill=(0, 0, 0, 218))
    draw.text((x, y), message, font=face, fill=color)


def make_pack(info):
    """Print a set onto the *real* Sablier foil pouch, not onto a flat card.

    Keep the photographed gold heat seals, crimped edges, glossy black folds,
    brand and ornate frame from the Vampires product image. Only the art inside
    the frame and the foil nameplate are replaced, so the shape reads as a
    sealed booster rather than a rectangular illustration.
    """
    original = Image.open(OUTPUT / 'booster-vampires.webp').convert('RGBA')
    pack = original.crop((251, 146, 768, 1147)).resize((292, 566), Image.Resampling.LANCZOS)
    # Hide the old illustration *and* its fire/armor bleeding past the frame.
    # Leave the outer heat-sealed gold seams, zipper folds and black foil intact.
    d = ImageDraw.Draw(pack)
    d.rectangle((2, 74, 289, 445), fill=(14, 12, 19))
    d.line((10, 88, 10, 426), fill=(72, 40, 36), width=2)
    d.line((281, 88, 281, 426), fill=(67, 52, 54), width=2)
    art = Image.open(CARDS / (info['art'] + '.jpg')).convert('RGB')
    art = ImageOps.fit(art, (236, 350), method=Image.Resampling.LANCZOS, centering=(.5, .34))
    # Softly shade the print toward the bevel without covering the foil frame.
    tint = Image.new('RGBA', art.size)
    pixels = tint.load()
    for y in range(art.height):
        for x in range(art.width):
            edge = max(0, 1 - min(x, art.width - x - 1, y, art.height - y - 1) / 28)
            pixels[x, y] = (8, 6, 14, int(83 * edge + 13))
    panel = Image.alpha_composite(art.convert('RGBA'), tint)
    pack.alpha_composite(panel, (28, 84))
    d = ImageDraw.Draw(pack)
    # Reprint the ornamental foil frame on the pouch surface.
    d.rectangle((24, 76, 268, 439), outline=(215, 177, 105), width=3)
    d.rectangle((29, 81, 263, 434), outline=(128, 91, 52), width=1)
    for x, direction in ((28, 1), (264, -1)):
        for y, sign in ((80, 1), (435, -1)):
            d.line((x, y + sign * 25, x, y, x + direction * 25, y),
                   fill=(249, 206, 132), width=3)
            d.arc((min(x, x + direction * 28), min(y, y + sign * 28),
                   max(x, x + direction * 28), max(y, y + sign * 28)),
                  0, 90, fill=(187, 137, 72), width=2)
    # Fully remove VAMPIRES from the original label; retain the wrinkled
    # metallic packet sides and the gold crimping above and below this plate.
    for y in range(446, 520):
        offset = abs(y - 482) / 37
        shade = int(9 + offset * 7)
        d.line((25, y, 266, y), fill=(shade + 4, shade + 1, shade + 7), width=1)
    d.line((30, 449, 261, 449), fill=(218, 175, 99), width=2)
    d.line((30, 516, 261, 516), fill=(135, 100, 56), width=2)
    size = 34
    while d.textbbox((0, 0), info['name'], font=font(BOLD, size))[2] > 222:
        size -= 1
    d.text((147, 485), info['name'], anchor='mm', font=font(BOLD, size),
           fill=(244, 215, 155), stroke_width=1, stroke_fill=(98, 63, 32))
    return pack


def render(slug, info):
    backdrop = Image.open(SCENERY / (slug + '.webp')).convert('RGBA')
    w, h = backdrop.size
    if (w, h) != (1264, 848):
        raise ValueError(f'{slug}: expected 1264x848 scenery')
    shade = Image.new('RGBA', (w, h))
    px = shade.load()
    for y in range(h):
        for x in range(w):
            # A quick fade just after the foil pack, then a dark right side:
            # the baked copy must stay legible over snow, stone and sea alike.
            near = max(0, min(1, (x - 420) / 110))
            far = max(0, min(1, (x - 530) / 700))
            bottom = max(0, min(1, (y - 480) / 368))
            px[x, y] = (7, 8, 16, min(235, int(105 * near + 115 * far + 18 * bottom)))
    backdrop = Image.alpha_composite(backdrop, shade)
    pack = make_pack(info)
    x, y = 148, 148
    shadow = Image.new('RGBA', backdrop.size)
    mask = Image.new('L', backdrop.size)
    mask.paste(225, (x + 9, y + 12, x + 9 + pack.width, y + 12 + pack.height))
    shadow.putalpha(mask.filter(ImageFilter.GaussianBlur(29)))
    backdrop = Image.alpha_composite(backdrop, shadow)
    backdrop.alpha_composite(pack, (x, y))
    d = ImageDraw.Draw(backdrop)
    light, accent = info['accent_light'], info['accent']
    write(d, 506, 194, 'LE SABLIER  ·  BOOSTER ' + info['name'], font(SANS, 25), light)
    for y, line in zip((261, 347), info['headline']):
        size = 83
        while d.textbbox((0, 0), line, font=font(BOLD, size))[2] > 650:
            size -= 1
        write(d, 498, y, line, font(BOLD, size), (255, 239, 217) if y == 261 else accent)
    d.line((505, 456, 1135, 456), fill=(*accent, 190), width=2)
    d.ellipse((504, 451, 514, 461), fill=light)
    write(d, 506, 478, info['ability'], font(BOLD, 43), light)
    for y, line in zip((539, 582, 625), info['description']):
        size = 36
        while d.textbbox((0, 0), line, font=font(SERIF, size))[2] > 625:
            size -= 1
        write(d, 506, y, line, font(SERIF, size), (252, 240, 225))
    footer_size = 24
    while d.textbbox((0, 0), info['footer'], font=font(SANS, footer_size))[2] > 670:
        footer_size -= 1
    write(d, 506, 737, info['footer'], font(SANS, footer_size), light)
    dest = OUTPUT / f'set-{slug}-banniere.webp'
    backdrop.convert('RGB').save(dest, 'WEBP', quality=89, method=6)
    print(f'{dest.relative_to(ROOT)} ({dest.stat().st_size:,} bytes)')


if __name__ == '__main__':
    for slug, info in SETS.items():
        render(slug, info)
