#!/usr/bin/env python3
"""Trois slides « une actu, une image » — édition du 27.11.2026.

Complète `make_social_3_actus.py` (le récapitulatif) par **trois slides
1080 × 1350 (4:5)** qui résument chacun une actu, en trois langues :

    python3 scripts/visuels/make_social_actu_slides.py               # les neuf
    python3 scripts/visuels/make_social_actu_slides.py --lang fr     # trois
    python3 scripts/visuels/make_social_actu_slides.py --slug tech   # une actu
    python3 scripts/visuels/make_social_actu_slides.py --out /tmp

Fichiers produits dans `visuels/social/` :

    2026-11-27-slide-1-gaming-{fr,en,ar}.png    Cherry Time
    2026-11-27-slide-2-tech-{fr,en,ar}.png      Neuralink
    2026-11-27-slide-3-cinema-{fr,en,ar}.png    Quasimodo

Structure d'un slide : la vignette de l'actu occupe le haut de l'image (recadrée
en 4:3, assombrie vers le bas), puis le titre, l'accroche, trois points clés
numérotés et le rappel de la source. Version arabe en RTL (texte composé via
HarfBuzz, voir `arabic_text.py`).

Les faits sont figés ici, repris de l'édition publiée (`src/news/daily/2026-11-27.js`)
et de ses traductions : une image datée ne se régénère pas depuis le site.
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

EDITION = "27.11.2026"
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
                "titre": "CHERRY TIME",
                "accroche": "Team Cherry présente Sea of Sorrow, l’extension "
                            "gratuite de Hollow Knight: Silksong.",
                "points": [
                    "Rendez-vous le 27 novembre à 15 h UTC, soit 16 h à Alger, "
                    "sur la chaîne YouTube du studio.",
                    "Le studio promet « un paquet d’annonces excitantes » en plus "
                    "de la mise à jour sur l’extension.",
                    "Sea of Sorrow a été dévoilée le 15 décembre 2025 ; aucune "
                    "date de sortie n’a été confirmée depuis.",
                ],
                "source": "SOURCE : TEAMCHERRY.COM.AU · BILLET DU 25.11.2026",
            },
            "en": {
                "rubrique": "GAMING",
                "titre": "CHERRY TIME",
                "accroche": "Team Cherry unveils Sea of Sorrow, the free "
                            "Hollow Knight: Silksong expansion.",
                "points": [
                    "The show airs on 27 November at 15:00 UTC — 16:00 in "
                    "Algiers — on the studio’s YouTube channel.",
                    "Team Cherry promises “a bunch of exciting announcements” "
                    "on top of the Sea of Sorrow update.",
                    "Sea of Sorrow was revealed on 15 December 2025; no release "
                    "date has been confirmed since.",
                ],
                "source": "SOURCE: TEAMCHERRY.COM.AU · POST OF 25 NOV 2026",
            },
            "ar": {
                "rubrique": "ألعاب",
                "titre": "تشيري تايم",
                "accroche": "فريق تشيري يكشف «بحر الأحزان»، التوسعة المجانية "
                            "لهولوك نايت: سيلكسونغ.",
                "points": [
                    "الموعد في 27 نوفمبر عند 15:00 بالتوقيت العالمي، أي 16:00 "
                    "في الجزائر، على قناة الاستوديو في يوتيوب.",
                    "يَعِد الاستوديو بـ«حزمة من الإعلانات المثيرة» إضافة إلى "
                    "مستجدّات التوسعة.",
                    "كُشف عن بحر الأحزان في 15 ديسمبر 2025، ولم يُؤكَّد أي تاريخ "
                    "إصدار منذ ذلك الحين.",
                ],
                "source": "المصدر: TEAMCHERRY.COM.AU · تدوينة 25.11.2026",
            },
        },
    },
    {
        "slug": "tech",
        "index": 2,
        "asset": "tech-neuralink-n1.jpg",
        "focus": 0.52,
        "langues": {
            "fr": {
                "rubrique": "TECH",
                "titre": "NEURALINK",
                "accroche": "La FDA autorise le premier essai pivot d’un implant "
                            "cérébral aux États-Unis.",
                "points": [
                    "L’essai LINK Pivotal vise des personnes atteintes de "
                    "paralysie sévère due à la sclérose latérale amyotrophique.",
                    "L’objectif : évaluer sûreté et efficacité, avec un suivi "
                    "dans le temps sur plusieurs sites cliniques.",
                    "L’autorisation porte sur l’étude, pas sur un usage général : "
                    "l’implant N1 reste un dispositif expérimental.",
                ],
                "source": "SOURCE : NEURALINK.COM · MISE À JOUR DU 25.11.2026",
            },
            "en": {
                "rubrique": "TECH",
                "titre": "NEURALINK",
                "accroche": "The FDA clears the first pivotal trial of a brain "
                            "implant in the United States.",
                "points": [
                    "The LINK Pivotal Study targets people with severe paralysis "
                    "caused by ALS.",
                    "It aims to assess safety and effectiveness, with long-term "
                    "follow-up across several clinical sites.",
                    "The clearance covers the study, not general use: the N1 "
                    "implant remains an investigational device.",
                ],
                "source": "SOURCE: NEURALINK.COM · UPDATE OF 25 NOV 2026",
            },
            "ar": {
                "rubrique": "تقنية",
                "titre": "نيورالينك",
                "accroche": "الـ FDA تُجيز أول تجربة حاسمة لشريحة دماغية في "
                            "الولايات المتحدة.",
                "points": [
                    "تستهدف تجربة LINK المحورية أشخاصًا يعانون شللًا شديدًا بسبب "
                    "التصلّب الجانبي الضموري.",
                    "الهدف تقييم السلامة والفعالية، مع متابعة على المدى الطويل في "
                    "عدّة مواقع سريرية.",
                    "الإجازة تخصّ الدراسة لا الاستخدام العام: شريحة N1 لا تزال "
                    "جهازًا تجريبيًا.",
                ],
                "source": "المصدر: NEURALINK.COM · تحديث 25.11.2026",
            },
        },
    },
    {
        "slug": "cinema",
        "index": 3,
        "asset": "cinema-quasimodo.jpg",
        "focus": 0.34,
        "langues": {
            "fr": {
                "rubrique": "CINÉMA",
                "titre": "QUASIMODO",
                "accroche": "Vincent Cassel en Quasimodo : le Paris de 1830 de "
                            "Jean-François Richet arrive sur Netflix.",
                "points": [
                    "Paris, 1830 : le choléra menace la ville, entre troubles "
                    "politiques et amour impossible.",
                    "Le film réimagine l’homme qui aurait inspiré Quasimodo, "
                    "d’après un scénario d’Éric Besnard et Edgar Marie.",
                    "1 h 43, classé TV-MA, en VF originale — à vérifier dans le "
                    "catalogue algérien le jour de la sortie.",
                ],
                "source": "SOURCE : NETFLIX.COM · FICHE OFFICIELLE",
            },
            "en": {
                "rubrique": "CINEMA",
                "titre": "QUASIMODO",
                "accroche": "Vincent Cassel as Quasimodo: Jean-François Richet’s "
                            "1830 Paris reaches Netflix.",
                "points": [
                    "Paris, 1830: cholera threatens the city, between political "
                    "unrest and an impossible love.",
                    "The film reimagines the man who inspired Quasimodo, from a "
                    "script by Éric Besnard and Edgar Marie.",
                    "1 h 43, rated TV-MA, in original French — check your local "
                    "Netflix catalogue on release day.",
                ],
                "source": "SOURCE: NETFLIX.COM · OFFICIAL TITLE PAGE",
            },
            "ar": {
                "rubrique": "سينما",
                "titre": "كازيمودو",
                "accroche": "فينسان كاسل في دور كازيمودو: باريس 1830 لجان فرانسوا "
                            "ريشيه تصل إلى نتفليكس.",
                "points": [
                    "باريس 1830: الكوليرا تهدّد المدينة، بين اضطراب سياسي وحبّ "
                    "مستحيل.",
                    "يعيد الفيلم تصوّر الرجل الذي ألهم شخصية كازيمودو، بسيناريو "
                    "إريك بونار وإدغار ماري.",
                    "مدّته ساعة و43 دقيقة، بتصنيف TV-MA وبالفرنسية الأصلية — "
                    "تحقّق من الكتالوج الجزائري يوم الإصدار.",
                ],
                "source": "المصدر: NETFLIX.COM · الصفحة الرسمية",
            },
        },
    },
]

LANG_NAMES = {"fr": "fr", "en": "en", "ar": "ar"}


# --------------------------------------------------------------------------
# Outils de dessin
# --------------------------------------------------------------------------
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

    img = Image.new("RGB", (W, H), INK)

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
            nom = f"2026-11-27-slide-{slide['index']}-{slide['slug']}-{lang}.png"
            target = out_dir / nom
            img.save(target, optimize=True)
            print(f"Slide écrit : {target} ({W} × {H})")


if __name__ == "__main__":
    main()
