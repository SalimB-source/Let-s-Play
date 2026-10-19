#!/usr/bin/env python3
"""Détoure les stands bruts (fond magenta) vers public/sablier-story/stands/*.webp.

Pipeline :
1. Flood-fill depuis les 4 bords pour identifier le fond magenta connecté,
   ainsi que les poches intérieures de magenta pur (#FF00FF) fermées par
   une mèche, une arme ou une mâchoire.
2. Suppression du halo magenta résiduel (despill + érosion douce alpha) sur
   les pixels de contour.
3. Recadrage serré sur la boîte englobante non-transparente, puis harmonisation
   en plan américain (mi-cuisses / genoux) pour que tous les personnages aient
   la même échelle de tête et de buste à l'écran.
4. Redimensionnement à 900 px de haut (ratio préservé) et export WebP RGBA.
"""

from __future__ import annotations

from collections import deque
from pathlib import Path
from PIL import Image, ImageFilter

RACINE = Path(__file__).resolve().parents[1]
DOSSIER_BRUT = RACINE / "tools" / "stands-raw"
DOSSIER_SORTIE = RACINE / "public" / "sablier-story" / "stands"
DOSSIER_PUBLIC = RACINE / "public" / "sablier-story"

HAUTEUR_CIBLE = 900
QUALITE_WEBP = 86

# Cadrages (top_frac, bot_frac, left_frac, right_frac) appliqués sur la boîte
# englobante brute afin d'harmoniser tous les personnages en plan américain
# (mi-cuisses / genoux) à la même échelle que salem, yamina, feriel et guetteur.
CADRAGES_PAR_DEFAUT = (0.0, 0.70, 0.0, 1.0)

CADRAGES_SPECIFIQUES: dict[str, tuple[float, float, float, float]] = {
    # Déjà cadrés en plan américain (touchent le bord inférieur du brut)
    "salem": (0.0, 1.0, 0.0, 1.0),
    "yamina": (0.0, 1.0, 0.0, 1.0),
    "feriel": (0.0, 1.0, 0.0, 1.0),
    "guetteur": (0.0, 1.0, 0.0, 1.0),
    "mahieddine": (0.0, 1.0, 0.0, 1.0),
    "scribe": (0.0, 1.0, 0.0, 1.0),
    "puisatier": (0.0, 1.0, 0.0, 1.0),
    "valkyrie-fjord-decision": (0.04, 0.96, 0.0, 1.0),
    # Poses spécifiques harmonisées avec leur stand de base
    "salem-affrontement": (0.0, 0.66, 0.08, 0.92),
    "salem-apaisement": (0.06, 0.68, 0.05, 1.0),
    "salem-decision": (0.0, 0.66, 0.0, 1.0),
    "yamina-affrontement": (0.0, 0.68, 0.0, 1.0),
    "yamina-apaisement": (0.0, 0.68, 0.0, 1.0),
    "yamina-decision": (0.0, 0.68, 0.04, 0.96),
    "feriel-affrontement": (0.0, 0.68, 0.0, 0.88),
    "feriel-apaisement": (0.0, 0.68, 0.0, 1.0),
    "guetteur-affrontement": (0.0, 0.70, 0.08, 0.94),
    "guetteur-apaisement": (0.0, 0.70, 0.0, 1.0),
    "mahieddine-affrontement": (0.0, 0.65, 0.0, 1.0),
    "mahieddine-apaisement": (0.0, 0.65, 0.0, 1.0),
    "mahieddine-decision": (0.0, 0.80, 0.0, 1.0),
    "scribe-affrontement": (0.0, 0.66, 0.0, 1.0),
    "scribe-apaisement": (0.0, 0.66, 0.0, 1.0),
    "scribe-decision": (0.0, 0.66, 0.0, 1.0),
    "puisatier-affrontement": (0.0, 0.66, 0.0, 0.96),
    "puisatier-apaisement": (0.0, 0.66, 0.0, 0.90),
    "horloger-zenith-affrontement": (0.11, 0.71, 0.08, 0.92),
    "maitre-hivers": (0.05, 0.73, 0.04, 0.96),
    "maitre-hivers-affrontement": (0.08, 0.71, 0.0, 1.0),
    "maitre-hivers-apaisement": (0.05, 0.73, 0.0, 1.0),
    "sonneur-affrontement": (0.08, 0.70, 0.0, 1.0),
    "pecheur-affrontement": (0.06, 0.68, 0.0, 1.0),
    "tarek-affrontement": (0.0, 0.70, 0.04, 0.94),
    "valkyrie-fjord-affrontement": (0.0, 0.70, 0.05, 0.95),
    "valkyrie-fjord-apaisement": (0.05, 0.70, 0.0, 1.0),
    "djinn-souk-apaisement": (0.0, 0.70, 0.04, 0.96),
    "amani-apaisement": (0.0, 0.70, 0.03, 0.97),
    # Créatures non-humanoïdes (conserver la silhouette, couper poussières/éclaboussures basses)
    "dernier-fennec": (0.0, 0.90, 0.0, 1.0),
    "dernier-fennec-affrontement": (0.0, 0.80, 0.0, 1.0),
    "dernier-fennec-apaisement": (0.0, 0.96, 0.0, 1.0),
    "devoreur": (0.0, 0.95, 0.0, 1.0),
    "devoreur-affrontement": (0.0, 0.92, 0.0, 1.0),
    "devoreur-apaisement": (0.0, 0.95, 0.0, 1.0),
    "ifrit-ergs": (0.0, 0.88, 0.0, 1.0),
    "ifrit-ergs-affrontement": (0.0, 0.88, 0.0, 1.0),
    "ifrit-ergs-apaisement": (0.0, 0.90, 0.0, 1.0),
    "meute-neiges": (0.0, 0.90, 0.0, 1.0),
    "meute-neiges-affrontement": (0.0, 0.88, 0.0, 1.0),
    "meute-neiges-apaisement": (0.0, 0.95, 0.0, 1.0),
    "nageuse": (0.0, 0.95, 0.0, 1.0),
    "nageuse-affrontement": (0.0, 0.92, 0.0, 1.0),
    "nageuse-apaisement": (0.0, 0.94, 0.0, 1.0),
}

# Réglages spécifiques par fichier (tolérance magenta, rayon de plume, force despill)
REGLAGES_DEFAUT = (95, 1.2, 22)
REGLAGES: dict[str, tuple[int, float, int]] = {
    "yamina": (80, 1.2, 26),
    "djinn-souk": (85, 1.2, 24),
    "meute-neiges": (55, 1.2, 24),
    "ifrit-ergs": (105, 1.0, 20),
    "ifrit-ergs-affrontement": (105, 1.0, 20),
    "ifrit-ergs-apaisement": (105, 1.0, 20),
}


def score_magenta(r: int, g: int, b: int) -> int:
    """Retourne un score élevé quand le pixel domine en rouge + bleu vs vert."""
    if r < 110 or b < 90:
        return 0
    if abs(r - b) > 95:
        return 0
    return (r - g) + (b - g)


def est_magenta_pur_interieur(r: int, g: int, b: int) -> bool:
    """Détecte une poche intérieure de fond magenta pur (#FF00FF)."""
    return r > 205 and b > 185 and g < 95 and ((r - g) + (b - g)) >= 290


def masque_fond_bord(image: Image.Image, seuil: int) -> list[list[bool]]:
    """Flood-fill 8-connexe depuis les bords + poches intérieures magenta pur."""
    largeur, hauteur = image.size
    pixels = image.load()
    visite = [[False] * largeur for _ in range(hauteur)]
    fond = [[False] * largeur for _ in range(hauteur)]
    file: deque[tuple[int, int]] = deque()

    def pousser(x: int, y: int) -> None:
        if visite[y][x]:
            return
        visite[y][x] = True
        r, g, b, _ = pixels[x, y]
        if score_magenta(r, g, b) >= seuil:
            fond[y][x] = True
            file.append((x, y))

    for x in range(largeur):
        pousser(x, 0)
        pousser(x, hauteur - 1)
    for y in range(hauteur):
        pousser(0, y)
        pousser(largeur - 1, y)

    # Amorcer aussi les poches intérieures de magenta pur (ex. entre bras et corps)
    for y in range(1, hauteur - 1):
        for x in range(1, largeur - 1):
            if not visite[y][x]:
                r, g, b, _ = pixels[x, y]
                if est_magenta_pur_interieur(r, g, b):
                    visite[y][x] = True
                    fond[y][x] = True
                    file.append((x, y))

    while file:
        x, y = file.popleft()
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                if dx == 0 and dy == 0:
                    continue
                nx, ny = x + dx, y + dy
                if 0 <= nx < largeur and 0 <= ny < hauteur and not visite[ny][nx]:
                    pousser(nx, ny)
    return fond


def etaler_couleur(image: Image.Image, iterations: int = 3) -> None:
    """Étend la couleur des pixels opaques vers les pixels transparents voisins.

    Évite que le flou d'alpha ou le redimensionnement ne mélange le RGB noir/magenta
    des pixels transparents avec le contour du personnage.
    """
    largeur, hauteur = image.size
    pixels = image.load()
    for _ in range(iterations):
        maj: list[tuple[int, int, int, int, int]] = []
        for y in range(hauteur):
            for x in range(largeur):
                r, g, b, a = pixels[x, y]
                if a > 32:
                    continue
                sr = sg = sb = n = 0
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < largeur and 0 <= ny < hauteur:
                            nr, ng, nb, na = pixels[nx, ny]
                            if na > 96:
                                sr += nr
                                sg += ng
                                sb += nb
                                n += 1
                if n > 0:
                    maj.append((x, y, sr // n, sg // n, sb // n))
        for x, y, r, g, b in maj:
            _, _, _, a = pixels[x, y]
            pixels[x, y] = (r, g, b, a)


def detourer(chemin: Path) -> Image.Image:
    seuil, plume, despill = REGLAGES.get(chemin.stem, REGLAGES_DEFAUT)
    cadrage = CADRAGES_SPECIFIQUES.get(chemin.stem, CADRAGES_PAR_DEFAUT)
    image = Image.open(chemin).convert("RGBA")
    largeur, hauteur = image.size
    fond = masque_fond_bord(image, seuil=seuil)

    pixels = image.load()
    alpha = Image.new("L", (largeur, hauteur), 255)
    apx = alpha.load()

    for y in range(hauteur):
        for x in range(largeur):
            if fond[y][x]:
                apx[x, y] = 0
                pixels[x, y] = (0, 0, 0, 0)

    # Despill + atténuation alpha sur les pixels proches du fond
    for y in range(hauteur):
        for x in range(largeur):
            if fond[y][x]:
                continue
            proche_fond = False
            for dx in (-2, -1, 0, 1, 2):
                for dy in (-2, -1, 0, 1, 2):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < largeur and 0 <= ny < hauteur and fond[ny][nx]:
                        proche_fond = True
                        break
                if proche_fond:
                    break
            if not proche_fond:
                continue
            r, g, b, a = pixels[x, y]
            s = score_magenta(r, g, b)
            if s > 20:
                facteur = max(0.0, 1.0 - (s / (seuil * 1.15)))
                na = int(a * facteur)
                plafond_rb = min(255, g + despill + int((1.0 - facteur) * 10))
                nr = min(r, plafond_rb)
                nb = min(b, max(g + despill // 2, plafond_rb - 12))
                pixels[x, y] = (nr, g, nb, na)
                apx[x, y] = na
            elif r > g + 35 and b > g + 25:
                nr = min(r, g + 30)
                nb = min(b, g + 22)
                pixels[x, y] = (nr, g, nb, a)

    if plume > 0:
        alpha_flou = alpha.filter(ImageFilter.GaussianBlur(radius=plume))
        bfpx = alpha_flou.load()
        for y in range(hauteur):
            for x in range(largeur):
                if fond[y][x]:
                    apx[x, y] = 0
                else:
                    apx[x, y] = min(apx[x, y], bfpx[x, y])

    image.putalpha(alpha)
    etaler_couleur(image, iterations=3)

    boite = image.getbbox()
    if boite:
        image = image.crop(boite)

    # Harmonisation du cadrage (plan américain mi-cuisses / genoux)
    t_f, b_f, l_f, r_f = cadrage
    if (t_f, b_f, l_f, r_f) != (0.0, 1.0, 0.0, 1.0):
        w, h = image.size
        x0 = max(0, min(w - 1, int(round(w * l_f))))
        x1 = max(x0 + 1, min(w, int(round(w * r_f))))
        y0 = max(0, min(h - 1, int(round(h * t_f))))
        y1 = max(y0 + 1, min(h, int(round(h * b_f))))
        image = image.crop((x0, y0, x1, y1))
        boite2 = image.getbbox()
        if boite2:
            image = image.crop(boite2)

    if image.height != HAUTEUR_CIBLE:
        nouvelle_largeur = max(1, round(image.width * HAUTEUR_CIBLE / image.height))
        image = image.resize((nouvelle_largeur, HAUTEUR_CIBLE), Image.LANCZOS)

    return image


def main() -> None:
    DOSSIER_SORTIE.mkdir(parents=True, exist_ok=True)
    fichiers = sorted(DOSSIER_BRUT.glob("*.jpg"))
    if not fichiers:
        raise SystemExit(f"Aucun fichier brut dans {DOSSIER_BRUT}")

    for src in fichiers:
        sortie = DOSSIER_SORTIE / f"stand-{src.stem}.webp"
        sprite = detourer(src)
        sprite.save(sortie, "WEBP", quality=QUALITE_WEBP, method=6)
        print(f"OK {sortie.name:36s} {sprite.width}x{sprite.height} ({sortie.stat().st_size // 1024} Ko)")

    for obsolete in ("scribe.jpg", "puisatier.jpg", "mahieddine.jpg"):
        cible = DOSSIER_PUBLIC / obsolete
        if cible.exists():
            print(f"Info : {cible.relative_to(RACINE)} conservé (référence portrait).")


if __name__ == "__main__":
    main()
