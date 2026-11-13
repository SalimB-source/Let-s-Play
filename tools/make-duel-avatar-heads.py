#!/usr/bin/env python3
"""Extrait les têtes détourées des stands du récit pour le plateau de duel.

Les coordonnées sont des fractions du stand original (gauche, haut, droite,
 bas). Elles sont cadrées pour conserver cheveux, casques, oreilles ou cornes
sans montrer le corps. La transparence du stand est conservée, avec un fondu
au bas pour éviter une découpe droite sur le cou. Exige Pillow avec WebP.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
STANDS = ROOT / 'public/sablier-story/stands'
OUTPUT = ROOT / 'public/sablier-story/avatars'
SIZE = 192

# Chaque cadrage est vérifié sur la figure correspondante, y compris les
# portraits non humains ou décentrés (bâton, cornes, museau, casque…).
CROPS = {
    'amani': (.50, .00, .79, .27),
    'boualem': (.30, .00, .64, .29),
    'corsaire-barbe-rousse': (.36, .00, .64, .27),
    'corsaire-mousse': (.43, .00, .75, .25),
    'corsaire-negociant': (.33, .00, .69, .28),
    'corsaire-rais': (.40, .00, .74, .28),
    'dernier-fennec': (.00, .00, .55, .49),
    'devoreur': (.16, .00, .87, .46),
    'djinn-souk': (.27, .00, .72, .29),
    'feriel': (.42, .00, .74, .26),
    'garde-fjord': (.25, .00, .62, .28),
    'guetteur': (.43, .00, .82, .29),
    'horloger-zenith': (.35, .00, .68, .27),
    'ifrit-ergs': (.00, .00, 1.00, .75),
    'mahieddine': (.30, .00, .65, .28),
    'maitre-hivers': (.21, .26, .57, .58),
    'marchand': (.35, .00, .73, .28),
    'meute-neiges': (.62, .00, 1.00, .43),
    'nageuse': (.14, .00, .82, .52),
    'necro-chacal': (.00, .00, .39, .42),
    'necro-devoreuse': (.28, .00, .76, .48),
    'necro-ouvrier': (.39, .00, .76, .28),
    'necro-peseuse': (.31, .00, .69, .30),
    'pecheur': (.34, .00, .74, .28),
    'puisatier': (.20, .00, .60, .28),
    'reine-etals': (.31, .00, .64, .29),
    'salem': (.36, .00, .72, .27),
    'samurai-ashigaru': (.37, .11, .83, .40),
    'samurai-daimyo': (.34, .00, .76, .48),
    'samurai-kenshi': (.32, .00, .74, .48),
    'samurai-ronin': (.41, .00, .73, .28),
    'scribe': (.30, .00, .68, .28),
    'sonneur': (.35, .00, .74, .28),
    'tarek': (.22, .00, .55, .27),
    'valkyrie-fjord': (.29, .00, .73, .35),
    'yamina': (.31, .00, .69, .31),
}


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for nom, (left, top, right, bottom) in CROPS.items():
        with Image.open(STANDS / f'stand-{nom}.webp') as source:
            source = source.convert('RGBA')
            w, h = source.size
            crop = source.crop((round(left*w), round(top*h), round(right*w), round(bottom*h)))
        # Fondu exclusivement sur la fin du cou, sans modifier le détourage du
        # visage ni la transparence préexistante du sprite.
        alpha = crop.getchannel('A')
        fade_start = round(crop.height * .82)
        for y in range(fade_start, crop.height):
            factor = (crop.height - 1 - y) / max(1, crop.height - 1 - fade_start)
            row = alpha.crop((0, y, crop.width, y + 1)).point(lambda a: round(a * factor))
            alpha.paste(row, (0, y))
        crop.putalpha(alpha)
        crop.thumbnail((SIZE - 8, SIZE - 8), Image.Resampling.LANCZOS)
        image = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
        image.alpha_composite(crop, ((SIZE - crop.width) // 2, (SIZE - crop.height) // 2))
        image.save(OUTPUT / f'avatar-{nom}.webp', 'WEBP', quality=88, method=6)
    print(f'{len(CROPS)} avatars de duel détourés dans {OUTPUT}')


if __name__ == '__main__':
    main()
