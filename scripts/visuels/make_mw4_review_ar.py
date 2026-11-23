#!/usr/bin/env python3
"""Carte Instagram 4:5 — test de la campagne de Modern Warfare 4, en arabe.

Habillage repris du modèle fourni (visuel plein cadre, logo, panneau arrondi
cerclé de rouge, note à gauche) mais resserré : le key art occupe le haut et le
panneau ne prend que la hauteur exacte des cinq lignes.

Le texte arabe est composé via HarfBuzz (PIL n’a pas libraqm ici) : voir
`arabic_text.py`. Cinq lignes courtes, non numérotées, et la note du test.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from arabic_text import ArabicText

ROOT = Path(__file__).resolve().parents[2]
FONTS = ROOT / "scripts/visuels/fonts"
ART = ROOT / "instagram/assets/mw4-keyart.png"  # key art officiel (Price / Ghost)

W, H = 1080, 1350
MARGIN = 56
BG = (9, 9, 13)
YELLOW = (247, 217, 0)
WHITE = (255, 255, 255)
GREY = (198, 198, 208)
RED_EDGE = (188, 40, 30)

PANEL_GAP = 26       # noir entre le visuel et le panneau
BOTTOM = 88          # marge basse de la carte
HEAD_H = 132         # titre + ligne de contexte dans le panneau
PAD = 26             # marge intérieure du panneau

# Cinq lignes courtes, une par idée, sans numérotation.
# Chiffres en caractères latins (2019, 9, 8/10), pas en chiffres arabo-indiens.
LINES = [
    "الحملة تعيد الطاقة إلى السلسلة، والأفضل منذ 2019.",
    "جبهتان: بارك أمام غزو بلاده، وبرايس يطارد ماكاروف.",
    "رماية قوية ومعارك متوترة، ومشهد باريس هو الأبرز.",
    "بعض المراحل تبطئ الإيقاع، والحملة تدوم نحو 9 ساعات.",
    "التقييم 8/10 للحملة وحدها، دون اللعب الجماعي.",
]

TITLE_LATIN = "Call of Duty: Modern Warfare IV"  # titre en lettres romaines
TITLE_AR = "كول أوف دوتي: مودرن وورفير ٤"
KICKER = "اختبار الحملة الفردية | بي سي | صعوبة عالية"


def build_background(art_h: int) -> Image.Image:
    """Visuel officiel recadré à la largeur de la carte, fondu vers le noir."""
    art = Image.open(ART).convert("RGB")
    scale = art_h / art.height
    art = art.resize((round(art.width * scale), art_h), Image.LANCZOS)
    left = max(0, (art.width - W) // 2)
    art = art.crop((left, 0, left + W, art_h))
    canvas = Image.new("RGBA", (W, H), BG + (255,))
    canvas.paste(art, (0, 0))

    fade = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    fd = ImageDraw.Draw(fade)
    start = art_h - 150
    for y in range(start, art_h):
        t = (y - start) / (art_h - start)
        fd.line([(0, y), (W, y)], fill=BG + (int(235 * t ** 1.2),))
    return Image.alpha_composite(canvas, fade)


def layout(max_width: float):
    """Plus grande taille où chaque point tient sur une ligne, dans la largeur."""
    for size in range(40, 17, -1):
        body = ArabicText(FONTS / "Tajawal-Bold.ttf", size)
        rows = [body.wrap(line, max_width) for line in LINES]
        if not all(len(r) == 1 for r in rows):
            continue
        line_h = round(size * 1.62)
        gap = round(size * 0.28)
        block_h = len(rows) * line_h + (len(rows) - 1) * gap
        return body, [r[0] for r in rows], line_h, gap, block_h
    raise SystemExit("Le résumé ne tient pas sur cinq lignes")


def add_logo(img: Image.Image) -> Image.Image:
    logo = Image.open(ROOT / "public/lets-play-logo.png").convert("RGBA")
    logo = logo.crop(logo.getbbox())
    lw = 290
    logo = logo.resize((lw, round(lw * logo.height / logo.width)), Image.LANCZOS)
    img.alpha_composite(logo, (MARGIN - 18, 18))
    return img


def main():
    max_w = W - 2 * MARGIN - 2 * PAD - 200  # place laissée au cartouche de note
    body, rows, line_h, gap, block_h = layout(max_w)

    # Le panneau fait exactement la hauteur du texte ; le visuel prend le reste.
    panel_h = HEAD_H + block_h + PAD + 16  # un peu d’air sous la dernière ligne
    art_h = H - BOTTOM - panel_h - PANEL_GAP
    panel_top = art_h + PANEL_GAP
    panel_bottom = H - BOTTOM
    panel = (MARGIN, panel_top, W - MARGIN, panel_bottom)

    img = build_background(art_h)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle(panel, radius=40, fill=(6, 6, 10, 242), outline=RED_EDGE, width=3)

    # Cartouche de note : centré verticalement dans le panneau, chiffre centré dedans.
    box_h = panel_bottom - panel_top - HEAD_H - PAD  # même hauteur que le bloc de texte
    box_top = panel_top + ((panel_bottom - panel_top) - box_h) // 2
    score = (panel[0] + PAD, box_top, panel[0] + PAD + 176, box_top + box_h)
    d.rounded_rectangle(score, radius=28, outline=(203, 203, 210, 210), width=3)
    # Centrage optique : on centre l’encre du chiffre, pas les métriques de la fonte.
    big = ImageFont.truetype(str(FONTS / "Tajawal-Black.ttf"), 186)
    stamp = Image.new("RGBA", (400, 400), (0, 0, 0, 0))
    ImageDraw.Draw(stamp).text((200, 200), "8", font=big, fill=WHITE, anchor="mm")
    stamp = stamp.crop(stamp.getbbox())
    img.alpha_composite(stamp, (
        round((score[0] + score[2]) / 2 - stamp.width / 2),
        round((score[1] + score[3]) / 2 - stamp.height / 2),
    ))
    print("cadre note", score, "chiffre", stamp.size)

    right = panel[2] - PAD
    # Titre du jeu en lettres romaines, avec la ligne de contexte dessous.
    title_font = ImageFont.truetype(str(FONTS / "Anton.ttf"), 40)
    title_top = panel_top + 24
    d.text((right, title_top), TITLE_LATIN, font=title_font, fill=YELLOW, anchor="ra")
    asc, _ = title_font.getmetrics()
    kicker_size = 24
    ArabicText(FONTS / "Tajawal-Bold.ttf", kicker_size).draw(
        img, (right, title_top + asc + 18 + kicker_size * 0.62), KICKER, GREY, "rm")

    y = panel_top + HEAD_H + line_h / 2  # centre de la première ligne
    for row in rows:
        body.draw(img, (right, y), row, WHITE, "rm")
        y += line_h + gap

    add_logo(img)

    out = ROOT / "instagram" / "cod-mw4-test-arabe.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(out, quality=95)
    print(out, img.size, "corps", body.size, "visuel", art_h, "panneau", panel)


if __name__ == "__main__":
    main()
