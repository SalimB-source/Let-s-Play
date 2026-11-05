"""Render the five Sablier set slides from their landscape art and card art.

Optional authoring tool (the generated WebP banners are checked in):
    python3 -m pip install pillow
    python3 tools/render-rpg-set-banners.py

Background paintings live in tools/rpg-set-backgrounds/ so the words embedded
in the images can be changed without regenerating their scenery. The sets are
previews of card themes, not additional boosters sold by the Souk.
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
        'footer': 'LES LETTRES DE MARQUE   ·   SABLE + EAU',
        'accent': (139, 213, 216), 'accent_light': (193, 239, 236),
    },
    'vikings': {
        'name': 'VIKINGS', 'art': 'valkyrie-des-glaces', 'headline': ('LE NORD', 'RIPOSTE.'),
        'ability': 'FURIE',
        'description': ("Tant qu’elle est blessée, la créature", "gagne de l’attaque et frappe", 'plus fort.'),
        'footer': 'SERMENT DES NEUF HIVERS   ·   NEIGE',
        'accent': (145, 205, 235), 'accent_light': (207, 236, 248),
    },
    'samourais': {
        'name': 'SAMOURAÏS', 'art': 'kagutsuchi-flamme-originelle', 'headline': ('LE FEU', 'SURVIT.'),
        'ability': 'HARAKIRI',
        'description': ("Quand elle meurt, la créature blesse", 'un ennemi au hasard, ou le sorcier', "adverse s’il n’y en a aucun."),
        'footer': 'SERMENT DU SOLEIL ROUGE   ·   BRAISE',
        'accent': (247, 143, 109), 'accent_light': (255, 195, 149),
    },
    'sable': {
        'name': 'SABLE', 'art': 'cavalier-amazigh-du-desert', 'headline': ('LES DUNES', 'S’ÉVEILLENT.'),
        'ability': 'BUTIN',
        'description': ('Quand elle touche le sorcier adverse,', 'piochez une carte, puis défaussez-en', 'une.'),
        'footer': 'VEILLEURS DU DÉSERT   ·   SABLE',
        'accent': (227, 181, 104), 'accent_light': (251, 220, 158),
    },
    'egyptiens': {
        'name': 'ÉGYPTIENS', 'art': 'la-devoreuse', 'headline': ('LA BALANCE', 'VOUS JUGE.'),
        'ability': 'TRIBUT',
        'description': ('Quand elle touche le sorcier adverse,', 'il perd des PV et vous en gagnez', 'autant.'),
        'footer': 'BALANCE DES HEURES   ·   TÉNÈBRES',
        'accent': (196, 170, 237), 'accent_light': (232, 205, 255),
    },
}


def font(path, size):
    return ImageFont.truetype(str(path), size)


def write(draw, x, y, message, face, color):
    draw.text((x + 2, y + 3), message, font=face, fill=(0, 0, 0, 218))
    draw.text((x, y), message, font=face, fill=color)


def make_pack(info):
    """A small foil display pack featuring an actual card illustration."""
    pack = Image.new('RGBA', (300, 550), (0, 0, 0, 0))
    d = ImageDraw.Draw(pack)
    gold = (216, 178, 108)
    d.rounded_rectangle((2, 2, 297, 547), radius=7, fill=(15, 13, 19), outline=gold, width=5)
    d.rectangle((12, 33, 287, 515), fill=(9, 11, 18), outline=gold, width=3)
    art = Image.open(CARDS / (info['art'] + '.jpg')).convert('RGB')
    art = ImageOps.fit(art, (258, 364), method=Image.Resampling.LANCZOS, centering=(.5, .35))
    pack.paste(art, (21, 79))
    d.rectangle((19, 77, 281, 446), outline=gold, width=4)
    # Black nameplate and gold bars echo the existing Vampires foil packaging.
    d.rectangle((14, 448, 286, 514), fill=(11, 10, 15))
    d.line((29, 455, 271, 455), fill=gold, width=2)
    d.line((29, 508, 271, 508), fill=gold, width=2)
    for y in (14, 20, 26, 521, 527, 533, 539):
        d.line((9, y, 291, y), fill=(140, 115, 77, 140), width=2)
    d.text((150, 51), 'LE SABLIER', anchor='mm', font=font(BOLD, 21), fill=(246, 218, 161))
    size = 35
    while d.textbbox((0, 0), info['name'], font=font(BOLD, size))[2] > 250:
        size -= 1
    d.text((150, 482), info['name'], anchor='mm', font=font(BOLD, size), fill=(250, 226, 173))
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
    write(d, 506, 194, 'LE SABLIER  ·  SET ' + info['name'], font(SANS, 25), light)
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
