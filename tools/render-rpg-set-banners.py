"""Prepare separate, responsive Sablier scenery and booster pouch images.

Optional authoring tool (Pillow required; the generated WebPs are checked in):
    python3 tools/render-rpg-set-banners.py

The five original landscape paintings live in tools/rpg-set-backgrounds/.
The Vampires background is maintained directly in public/sablier-promo/.
Typography remains HTML rather than painted into these images.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SCENERY = ROOT / 'tools/rpg-set-backgrounds'
CARDS = ROOT / 'public/cards'
OUTPUT = ROOT / 'public/sablier-promo'
FONTS = Path('/usr/share/fonts/truetype/dejavu')
BOLD = FONTS / 'DejaVuSerif-Bold.ttf'

SETS = {
    'pirates': {
        'name': 'PIRATES', 'art': 'la-barbe-noire', 'headline': ('LA MER', 'PREND TOUT.'),
        'ability': 'ABORDAGE',
        'description': ("À l’arrivée, prenez en cale une", 'créature adverse de coût autorisé,', 'sans la détruire.'),
        'footer': '140 CRÉDITS   ·   RARE GARANTIE',
        'accent': (139, 213, 216), 'accent_light': (193, 239, 236),
    },
    'vikings': {
        'name': 'VIKINGS', 'art': 'jarl-au-marteau-de-guerre', 'headline': ('LE NORD', 'RIPOSTE.'),
        'ability': 'FURIE',
        'description': ("Tant qu’elle est blessée, la créature", "gagne de l’attaque et frappe", 'plus fort.'),
        'footer': '140 CRÉDITS   ·   RARE GARANTIE',
        'accent': (145, 205, 235), 'accent_light': (207, 236, 248),
    },
    'samourais': {
        'name': 'SAMOURAÏS', 'art': 'onna-musha-des-cendres', 'headline': ('LE FEU', 'SURVIT.'),
        'ability': 'HARAKIRI',
        'description': ("Quand elle meurt, la créature blesse", 'un ennemi au hasard, ou le sorcier', "adverse s’il n’y en a aucun."),
        'footer': '140 CRÉDITS   ·   RARE GARANTIE',
        'accent': (247, 143, 109), 'accent_light': (255, 195, 149),
    },
    'sable': {
        'name': 'SABLE', 'art': 'kusayla-roi-des-imazighen', 'headline': ('LES DUNES', 'S’ÉVEILLENT.'),
        'ability': 'BUTIN',
        'description': ('Quand elle touche le sorcier adverse,', 'piochez une carte, puis défaussez-en', 'une.'),
        'footer': '140 CRÉDITS   ·   RARE GARANTIE',
        'accent': (227, 181, 104), 'accent_light': (251, 220, 158),
    },
    'egyptiens': {
        'name': 'ÉGYPTIENS', 'art': 'seigneur-des-machoires', 'headline': ('LA BALANCE', 'VOUS JUGE.'),
        'ability': 'TRIBUT',
        'description': ('Quand elle touche le sorcier adverse,', 'il perd des PV et vous en gagnez', 'autant.'),
        'footer': '140 CRÉDITS   ·   RARE GARANTIE',
        'accent': (196, 170, 237), 'accent_light': (232, 205, 255),
    },
}


def font(path, size):
    return ImageFont.truetype(str(path), size)


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


def render_responsive_assets():
    """Pack and scenery in separate layers: no baked text can be cropped in a slide."""
    import shutil

    vampire = Image.open(OUTPUT / 'booster-vampires.webp').convert('RGBA')
    vampire.crop((251, 146, 768, 1147)).resize((292, 566), Image.Resampling.LANCZOS).save(
        OUTPUT / 'paquet-vampires.webp', 'WEBP', quality=90, method=6,
    )
    for slug, info in SETS.items():
        make_pack(info).save(OUTPUT / f'paquet-{slug}.webp', 'WEBP', quality=90, method=6)
        shutil.copyfile(SCENERY / f'{slug}.webp', OUTPUT / f'fond-{slug}.webp')


if __name__ == '__main__':
    render_responsive_assets()
