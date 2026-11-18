"""Textes et destinations des éditions du carrousel The Game Awards 2026."""
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Copy:
    category: str
    nominees: str
    vote: str
    ceremony: str
    date: str
    cover_title: str
    swipe: str
    card_description: str
    cover_description: str
    cover_stem: str
    thumbs_dir: str


EDITIONS = {
    'fr': Copy(
        category='Jeu de l’année', nominees='Les nommés', vote='Votez sur',
        ceremony='Cérémonie', date='10 décembre', cover_title='Les 6 nommés',
        swipe='Faites défiler',
        card_description='Illustration de l’affiche fournie, mise en page Let’s Play.',
        cover_description='Couverture du carrousel Let’s Play, composée à partir des six illustrations fournies.',
        cover_stem='00-couverture-les-6-nommes', thumbs_dir='miniatures',
    ),
    'en': Copy(
        category='Game of the Year', nominees='The nominees', vote='Vote at',
        ceremony='Ceremony', date='December 10', cover_title='The 6 nominees',
        swipe='Swipe to see all six',
        card_description='Artwork from the supplied nominee poster. Layout by Let’s Play.',
        cover_description='Let’s Play carousel cover featuring artwork from all six supplied nominee posters.',
        cover_stem='00-cover-the-6-nominees', thumbs_dir='thumbnails',
    ),
}


def edition_dir(lang: str) -> Path:
    base = Path(__file__).resolve().parents[2] / 'visuels/tga-2026'
    return base if lang == 'fr' else base / lang


def zip_name(lang: str) -> str:
    suffix = '' if lang == 'fr' else f'-{lang}'
    return f'lets-play-game-awards-2026-4x5{suffix}.zip'
