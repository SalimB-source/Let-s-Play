"""Composition de texte arabe pour PIL, sans libraqm.

PIL n’est pas compilé avec libraqm dans cet environnement : ni `direction`,
ni `language` ne sont acceptés, et le reshaping de `arabic_reshaper` casse la
ligature lam-alif. On passe donc par HarfBuzz (uharfbuzz) pour obtenir les
glyphes, leurs positions et les marques de base, puis on dessine glyphe par
glyphe avec FreeType.
"""
from __future__ import annotations

from pathlib import Path

import freetype
import uharfbuzz as hb
from PIL import Image, ImageDraw


def _runs(text: str):
    """Découpe le texte logique en segments : arabe (RTL), latin/chiffres (LTR), espaces.

    Chaque espace devient un segment à part, placé entre les deux morceaux de
    texte : il garde ainsi sa place dans un paragraphe de base RTL, sans doubler
    ni coller les mots aux nombres.
    """
    runs, buf, kind = [], "", None
    for ch in text:
        if ch.isspace():
            k = "sp"
        elif (ch.isascii() and ch.isalnum()) or (ch.isascii() and ch in "/:.%-+&'"):
            k = "ltr"
        else:
            k = "rtl"
        if kind is None:
            kind = k
        if k != kind:
            runs.append((kind, buf))
            buf, kind = "", k
        buf += ch
    if buf:
        runs.append((kind, buf))
    return runs


class ArabicText:
    def __init__(self, path: str | Path, size: int):
        self.path = str(path)
        self.size = size
        self.face = freetype.Face(self.path)
        self.face.set_pixel_sizes(0, size)
        data = Path(self.path).read_bytes()
        self.hb_face = hb.Face(hb.Blob(data))
        self.hb_font = hb.Font(self.hb_face)
        upem = self.hb_face.upem
        self.hb_font.scale = (upem, upem)
        self.upem = upem

    def _shape_run(self, text: str, direction: str):
        buf = hb.Buffer()
        buf.add_str(text)
        buf.direction = direction
        buf.script = "Arab" if direction == "rtl" else "Latn"
        buf.language = "ar"
        hb.shape(self.hb_font, buf, {"kern": True, "liga": True})
        scale = self.size / self.upem
        glyphs = []
        x = 0.0
        for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
            adv = pos.x_advance * scale
            glyphs.append((info.codepoint, x + pos.x_offset * scale, -pos.y_offset * scale, adv))
            x += adv
        return glyphs, x

    def shape(self, text: str):
        """Glyphes placés de gauche à droite après réordonnancement bidirectionnel.

        `get_display` donne l’ordre visuel (UAX #9). Chaque segment est ensuite
        façonné dans sa propre direction : l’arabe en RTL (HarfBuzz applique les
        ligatures et renvoie les glyphes de droite à gauche), les nombres et mots
        latins en LTR pour que « 8/10 » ne devienne pas « 01/8 ».
        """
        total = 0.0
        placed = []
        # Base RTL : les segments sont posés de droite à gauche, mais chacun est
        # façonné dans sa propre direction — d’où l’ordre visuel correct.
        for kind, run in reversed(_runs(text)):
            if kind == "sp":  # espaces : largeur seule, aucun glyphe
                total += self._shape_run(" " * len(run), "ltr")[1]
                continue
            glyphs, width = self._shape_run(run, kind)
            for gid, gx, gy, _adv in glyphs:
                placed.append((gid, gx + total, gy))
            total += width
        return placed, total

    def width(self, text: str) -> float:
        return self.shape(text)[1]

    def draw(self, img: Image.Image, xy, text: str, fill, anchor: str = "la"):
        """`anchor` : l (left), r (right), m (middle) + a/m/d (asc/desc)."""
        glyphs, total = self.shape(text)
        x0, y0 = xy
        if anchor[0] == "r":
            start = x0 - total
        elif anchor[0] == "m":
            start = x0 - total / 2
        else:
            start = x0
        ascender = self.face.size.ascender / 64
        descender = self.face.size.descender / 64
        if anchor[1] == "m":
            base = y0 - (ascender + descender) / 2
        elif anchor[1] == "d":
            base = y0 - descender
        else:
            base = y0 + ascender
        draw = ImageDraw.Draw(img)
        for gid, gx, gy in glyphs:
            self.face.load_glyph(gid, freetype.FT_LOAD_RENDER | freetype.FT_LOAD_TARGET_NORMAL)
            bitmap = self.face.glyph.bitmap
            if bitmap.width == 0 or bitmap.rows == 0:
                continue
            glyph_img = Image.frombytes("L", (bitmap.width, bitmap.rows), bytes(bitmap.buffer))
            # bitmap_top est mesuré depuis la ligne de base, vers le haut.
            px = int(round(start + gx + self.face.glyph.bitmap_left))
            py = int(round(base - gy - self.face.glyph.bitmap_top))
            draw.bitmap((px, py), glyph_img, fill=fill)
        return total

    def wrap(self, text: str, max_width: float):
        words, rows, row = text.split(), [], ""
        for word in words:
            trial = f"{row} {word}".strip()
            if not row or self.width(trial) <= max_width:
                row = trial
            else:
                rows.append(row)
                row = word
        if row:
            rows.append(row)
        return rows
