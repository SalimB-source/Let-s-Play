#!/usr/bin/env python3
"""Trois slides « une actu, une image » — édition du 29.11.2026.

Complète `make_social_3_actus_1129.py` (le récapitulatif) par **trois slides
1080 × 1350 (4:5)** qui résument chacun une actu, en trois langues :

    python3 scripts/visuels/make_social_actu_slides_1129.py               # les neuf
    python3 scripts/visuels/make_social_actu_slides_1129.py --lang fr     # trois
    python3 scripts/visuels/make_social_actu_slides_1129.py --slug tech   # une actu
    python3 scripts/visuels/make_social_actu_slides_1129.py --out /tmp

Fichiers produits dans `visuels/social/` :

    2026-11-29-slide-1-gaming-{fr,en,ar}.png    Silksong — Sea of Sorrow
    2026-11-29-slide-2-tech-{fr,en,ar}.png      Anthropic — entrée en bourse
    2026-11-29-slide-3-cinema-{fr,en,ar}.png    14TH — Ava DuVernay

Structure d'un slide : la vignette de l'actu occupe le haut de l'image (recadrée
en 4:3, assombrie vers le bas), puis le titre, l'accroche, trois points clés
précédés d'un **losange** (aucune numérotation) et le rappel de la source
officielle. Version arabe en RTL (texte composé via HarfBuzz, voir
`arabic_text.py`).

Les faits sont figés ici, repris de l'édition publiée
(`src/news/daily/2026-11-29.js`) et de ses traductions : une image datée ne se
régénère pas depuis le site.
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from arabic_text import ArabicText

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
FONTS = HERE / "fonts"
ASSETS = HERE / "assets"
LOGO = ROOT / "public" / "lets-play-logo.png"

W, H = 1080, 1350
INK = (79, 52, 148)         # #4F3494 — violet Let's Play
BAR = (247, 217, 0)         # #f7d900 — jaune
TITLE = (231, 253, 82)      # #e7fd52 — vert acide
WHITE = (255, 255, 255)
MUTED = (196, 184, 230)     # lilas — texte secondaire
RULE = (140, 118, 208)
NUMBER_INK = (36, 22, 72)

EDITION = "29.11.2026"
PHOTO_H = 520               # bande illustrée du haut
PHOTO_TOP = 196


# --------------------------------------------------------------------------
# Contenus : chaque slide = visuel de fond + textes par langue.
# --------------------------------------------------------------------------
SLIDES = [
    {
        "slug": "gaming",
        "index": 1,
        "asset": "gaming-sea-of-sorrow.webp",
        "focus": 0.50,
        "langues": {
            "fr": {
                "rubrique": "GAMING",
                "titre": "SILKSONG",
                "accroche": "Sea of Sorrow, la première extension de "
                            "Hollow Knight: Silksong, sort le 11 décembre.",
                "points": [
                    "Gratuite pour tous les joueurs, sur les plateformes où "
                    "le jeu est déjà disponible.",
                    "Le studio promet un voyage au-dessus et sous l’océan "
                    "oublié de Pharloom, avec de nouveaux boss.",
                    "Aucune liste de zones n’a été publiée : le billet et le "
                    "trailer officiels s’en tiennent au cadre.",
                ],
                "source": "SOURCE : TEAMCHERRY.COM.AU · BILLET DU 27.11.2026",
            },
            "en": {
                "rubrique": "GAMING",
                "titre": "SILKSONG",
                "accroche": "Sea of Sorrow, the first Hollow Knight: Silksong "
                            "expansion, lands on 11 December.",
                "points": [
                    "Free for every player, on the platforms where the game "
                    "already runs.",
                    "The studio promises a voyage above and beneath "
                    "Pharloom’s forgotten ocean, with new bosses.",
                    "No list of areas has been published: the official post "
                    "and trailer stick to the frame.",
                ],
                "source": "SOURCE: TEAMCHERRY.COM.AU · POST OF 27.11.2026",
            },
            "ar": {
                "rubrique": "ألعاب",
                "titre": "سيلكسونغ",
                "accroche": "«بحر الأحزان»، أول توسعة لهولوك نايت: سيلكسونغ، "
                            "يصدر في 11 ديسمبر.",
                "points": [
                    "مجانًا لكل اللاعبين، على المنصّات التي تعمل عليها "
                    "اللعبة أصلًا.",
                    "يَعِد الاستوديو برحلة فوق محيط فارلوم المنسي وتحته، "
                    "مع زعماء جدد.",
                    "لم تُنشر أي قائمة مناطق: التدوينة والباندب-البداية "
                    "الرسميان يلتزمان الإطار.",
                ],
                "source": "المصدر: TEAMCHERRY.COM.AU · تدوينة 27.11.2026",
            },
        },
    },
    {
        "slug": "tech",
        "index": 2,
        "asset": "tech-anthropic-nasdaq.jpg",
        "focus": 0.50,
        "langues": {
            "fr": {
                "rubrique": "TECH",
                "titre": "ANTHROPIC",
                "accroche": "L’entreprise d’IA a clôturé son introduction "
                            "en bourse le 20 novembre.",
                "points": [
                    "1 127 000 000 d’actions Class A à 83 dollars, option "
                    "des banques exercée en totalité.",
                    "Première cotation le 19 novembre sur le Nasdaq, sous le "
                    "symbole ANT.",
                    "Un communiqué financier, pas un résultat technique : les "
                    "performances des modèles ne sont pas validées ici.",
                ],
                "source": "SOURCE : ANTHROPIC.COM · COMMUNIQUÉ DU 20.11.2026",
            },
            "en": {
                "rubrique": "TECH",
                "titre": "ANTHROPIC",
                "accroche": "The AI company closed its initial public "
                            "offering on 20 November.",
                "points": [
                    "1,127,000,000 Class A shares at $83, the banks’ option "
                    "exercised in full.",
                    "First trading on 19 November on the Nasdaq, under the "
                    "symbol ANT.",
                    "A financial release, not a technical result: the models’ "
                    "performance is not validated here.",
                ],
                "source": "SOURCE: ANTHROPIC.COM · RELEASE OF 20.11.2026",
            },
            "ar": {
                "rubrique": "تقنية",
                "titre": "أنثروبيك",
                "accroche": "شركة الذكاء الاصطناعي أغلقت طرحها العام الأولي "
                            "في 20 نوفمبر.",
                "points": [
                    "1.127 مليار سهم من الفئة A بسعر 83 دولارًا، مع تنفيذ "
                    "خيار البنوك بالكامل.",
                    "أول تداول في 19 نوفمبر على ناسداك تحت رمز ANT.",
                    "بيان مالي لا نتيجة تقنية: أداء النماذج لا يُصادَق عليه "
                    "هنا.",
                ],
                "source": "المصدر: ANTHROPIC.COM · بيان 20.11.2026",
            },
        },
    },
    {
        "slug": "cinema",
        "index": 3,
        "asset": "cinema-14th-still.jpg",
        "focus": 0.40,
        "langues": {
            "fr": {
                "rubrique": "CINÉMA",
                "titre": "14TH",
                "accroche": "Ava DuVernay consacre un documentaire au "
                            "quatorzième amendement.",
                "points": [
                    "En salles aux États-Unis et au Royaume-Uni depuis le "
                    "27 novembre 2026.",
                    "Mise en ligne mondiale sur Netflix le 4 décembre, "
                    "classé R.",
                    "La disponibilité en Algérie reste à vérifier sur sa "
                    "propre page Netflix le jour dit.",
                ],
                "source": "SOURCE : NETFLIX.COM · PAGE DU FILM (2026)",
            },
            "en": {
                "rubrique": "CINEMA",
                "titre": "14TH",
                "accroche": "Ava DuVernay devotes a documentary to the "
                            "fourteenth amendment.",
                "points": [
                    "In US and UK cinemas since 27 November 2026.",
                    "Worldwide on Netflix from 4 December, rated R.",
                    "Availability in Algeria still has to be checked on your "
                    "own Netflix page on the day.",
                ],
                "source": "SOURCE: NETFLIX.COM · TITLE PAGE (2026)",
            },
            "ar": {
                "rubrique": "سينما",
                "titre": "14TH",
                "accroche": "أفا دوفيرني تخصّص وثائقيًا للتعديل الرابع عشر.",
                "points": [
                    "في صالات الولايات المتحدة والمملكة المتحدة منذ "
                    "27 نوفمبر 2026.",
                    "إطلاق عالمي على نتفليكس في 4 ديسمبر، بتصنيف R.",
                    "التوفّر في الجزائر يبقى بحاجة إلى تحقّق على صفحتك في "
                    "نتفليكس يوم الإطلاق.",
                ],
                "source": "المصدر: NETFLIX.COM · صفحة الفيلم (2026)",
            },
        },
    },
]

LANG_NAMES = {"fr": "fr", "en": "en", "ar": "ar"}


# --------------------------------------------------------------------------
# Outils de dessin
# --------------------------------------------------------------------------
# --------------------------------------------------------------------------
# Fond : motif discret de losanges, écho des puces des slides
# --------------------------------------------------------------------------
# --------------------------------------------------------------------------
# Fond : motif discret de losanges, écho des puces des slides
# --------------------------------------------------------------------------
def fond(graine: int = 0) -> Image.Image:
    """Fond violet de la charte, semé de petits losanges creux très discrets.

    Le motif se fond dans le violet (à peine plus clair) et reste sous le
    texte : il donne de la matière au fond uni sans gêner la lecture.
    `graine` décale la trame d’un visuel à l’autre pour que les douze images
    n’aient pas exactement le même fond.
    """
    img = Image.new("RGB", (W, H), INK)
    motif = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(motif)
    pas = 96
    r = 13
    decalage = (graine % 4) * 24
    teinte = (96, 70, 170)          # violet plus clair : lisible, jamais criard
    for ligne, y in enumerate(range(-pas + decalage, H + pas, pas)):
        for x in range(-pas + (pas // 2 if ligne % 2 else 0), W + pas, pas):
            d.polygon([(x, y - r), (x + r, y), (x, y + r), (x - r, y)],
                      outline=teinte, width=3)
            # Un point au centre de chaque losange : la trame respire.
            d.ellipse([x - 1, y - 1, x + 1, y + 1], fill=teinte)
    img = Image.blend(img, motif, 0.9)
    return img.filter(ImageFilter.GaussianBlur(0.4))


def latin(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size)


def recadre(src: Image.Image, box: tuple[int, int], focus: float, zoom: float) -> Image.Image:
    bw, bh = box
    ratio = max(bw / src.width, bh / src.height) * zoom
    taille = (max(bw, round(src.width * ratio)), max(bh, round(src.height * ratio)))
    src = src.resize(taille, Image.LANCZOS)
    gauche = (src.width - bw) // 2
    haut = round((src.height - bh) * min(1.0, max(0.0, focus)))
    return src.crop((gauche, haut, gauche + bw, haut + bh))


def bandeau(asset: str, box: tuple[int, int], focus: float) -> Image.Image | None:
    chemin = ASSETS / asset
    if not chemin.exists():
        return None
    src = Image.open(chemin).convert("RGB")
    if asset.endswith("tech-neuralink-n1.jpg"):
        # Détouré sur blanc : négatif pour rester sur fond sombre.
        src = Image.eval(src, lambda v: 255 - v)
    tile = recadre(src, box, focus, zoom=1.0)
    # Assombri, puis fondu vers le violet en bas : le texte respire.
    tile = Image.blend(tile, Image.new("RGB", tile.size, (0, 0, 0)), 0.45)
    w, h = tile.size
    fondu = Image.new("L", (1, h))
    for y in range(h):
        t = max(0.0, (y / h - 0.30) / 0.70)
        fondu.putpixel((0, y), int(255 * min(1.0, t) ** 1.15))
    fondu = fondu.resize((w, h))
    tile.paste(Image.new("RGB", tile.size, INK), (0, 0), fondu)
    return tile.filter(ImageFilter.GaussianBlur(0.6))


def wrap_latin(texte: str, font: ImageFont.FreeTypeFont, largeur: float, draw) -> list[str]:
    mots, lignes, ligne = texte.split(), [], ""
    for mot in mots:
        essai = f"{ligne} {mot}".strip()
        if not ligne or draw.textlength(essai, font=font) <= largeur:
            ligne = essai
        else:
            lignes.append(ligne)
            ligne = mot
    if ligne:
        lignes.append(ligne)
    return lignes


def rendre(slide: dict, lang: str) -> Image.Image:
    data = slide["langues"][lang]
    rtl = lang == "ar"

    # Polices.
    if rtl:
        f_rubrique = ArabicText(FONTS / "Tajawal-Bold.ttf", 26)
        f_titre = ArabicText(FONTS / "Tajawal-Black.ttf", 74)
        f_accroche = ArabicText(FONTS / "Tajawal-Bold.ttf", 34)
        f_point = ArabicText(FONTS / "Tajawal-Regular.ttf", 29)
        f_source = ArabicText(FONTS / "Tajawal-Bold.ttf", 21)
        f_pied = latin("Inter-700.ttf", 22)
    else:
        f_rubrique = latin("Inter-700.ttf", 26)
        f_titre = latin("Anton.ttf", 82)
        f_accroche = latin("Inter-600.ttf", 32)
        f_point = latin("Inter-400.ttf", 27)
        f_source = latin("Inter-600.ttf", 20)
        f_pied = latin("Inter-700.ttf", 22)
    f_date = latin("Anton.ttf", 44)

    img = fond(slide["index"])

    # 1. Bande illustrée du haut.
    tile = bandeau(slide["asset"], (W, PHOTO_H), slide["focus"])
    if tile is not None:
        img.paste(tile, (0, PHOTO_TOP))

    draw = ImageDraw.Draw(img)

    # Barre d'accent : à gauche, ou à droite en arabe.
    if rtl:
        draw.rectangle([W - 14, 0, W - 1, H], fill=BAR)
    else:
        draw.rectangle([0, 0, 14, H], fill=BAR)

    # Bandeau supérieur : logo + date.
    logo = Image.open(LOGO).convert("RGBA")
    logo_w = 150
    logo_h = round(logo.height * logo_w / logo.width)
    logo = logo.resize((logo_w, logo_h), Image.LANCZOS)
    img.paste(logo, (W - 64 - logo_w if rtl else 64, 40), logo)
    if rtl:
        draw.text((64, 62), EDITION, font=f_date, fill=BAR, anchor="la")
    else:
        draw.text((W - 64, 62), EDITION, font=f_date, fill=BAR, anchor="ra")

    # 2. Rubrique + titre, sur le bas de la bande illustrée.
    texte_x = W - 64 if rtl else 64
    ancre = "ra" if rtl else "la"

    if rtl:
        f_rubrique.draw(img, (texte_x, PHOTO_TOP + PHOTO_H - 166), data["rubrique"],
                        MUTED, anchor=ancre)
        f_titre.draw(img, (texte_x, PHOTO_TOP + PHOTO_H - 132), data["titre"],
                     TITLE, anchor=ancre)
    else:
        draw.text((texte_x, PHOTO_TOP + PHOTO_H - 168), data["rubrique"],
                  font=f_rubrique, fill=MUTED)
        draw.text((texte_x, PHOTO_TOP + PHOTO_H - 132), data["titre"],
                  font=f_titre, fill=TITLE)

    # 3. Accroche.
    y = PHOTO_TOP + PHOTO_H + 44
    largeur = W - 128
    if rtl:
        for ligne in f_accroche.wrap(data["accroche"], largeur):
            f_accroche.draw(img, (texte_x, y), ligne, WHITE, anchor=ancre)
            y += 52
    else:
        for ligne in wrap_latin(data["accroche"], f_accroche, largeur, draw):
            draw.text((texte_x, y), ligne, font=f_accroche, fill=WHITE)
            y += 46

    # 4. Trois points clés, précédés d'un losange (pas de numérotation).
    y += 34
    for point in data["points"]:
        # Losange : deux triangles qui se rejoignent, en jaune.
        cx = W - 68 if rtl else 68
        cy = y + 26
        r = 15
        draw.polygon(
            [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], fill=BAR
        )
        # Petit creux intérieur : le losange se lit comme une puce, pas comme
        # une forme pleine.
        draw.polygon(
            [(cx, cy - 5), (cx + 5, cy), (cx, cy + 5), (cx - 5, cy)], fill=INK
        )

        # Texte.
        if rtl:
            px = W - 116
            for ligne in f_point.wrap(point, px - 48):
                f_point.draw(img, (px, y + 6), ligne, WHITE, anchor="ra")
                y += 42
        else:
            px = 116
            for ligne in wrap_latin(point, f_point, W - px - 64, draw):
                draw.text((px, y + 6), ligne, font=f_point, fill=WHITE)
                y += 40
        y += 28

    # 5. Pied : source, puis rappel du site.
    draw.rectangle([64, 1204, W - 64, 1205], fill=RULE)
    if rtl:
        f_source.draw(img, (W - 64, 1230), data["source"], MUTED, anchor="ra")
        # Signature latine : dessinée par PIL, un moteur bidi la retournerait.
        draw.text((W - 64, 1272), "LET'S PLAY", font=f_pied, fill=BAR, anchor="ra")
    else:
        draw.text((64, 1232), data["source"], font=f_source, fill=MUTED)
        draw.text((64, 1272), "LET’S PLAY · ACTUS DU JOUR", font=f_pied, fill=BAR)

    return img


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--out", default=str(ROOT / "visuels" / "social"),
        help="dossier de sortie (défaut : visuels/social)",
    )
    parser.add_argument("--lang", choices=["fr", "en", "ar", "toutes"],
                        default="toutes", help="langue (défaut : les trois)")
    parser.add_argument("--slug", choices=["gaming", "tech", "cinema", "tous"],
                        default="tous", help="actu (défaut : les trois)")
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    langues = ["fr", "en", "ar"] if args.lang == "toutes" else [args.lang]
    slides = SLIDES if args.slug == "tous" else [
        s for s in SLIDES if s["slug"] == args.slug
    ]

    for slide in slides:
        for lang in langues:
            img = rendre(slide, lang)
            nom = f"2026-11-29-slide-{slide['index']}-{slide['slug']}-{lang}.png"
            target = out_dir / nom
            img.save(target, optimize=True)
            print(f"Slide écrit : {target} ({W} × {H})")


if __name__ == "__main__":
    main()
