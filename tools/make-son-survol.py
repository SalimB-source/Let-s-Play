#!/usr/bin/env python3
"""Engendre `src/games/assets/hover.wav`, l'effleurement de survol du Sablier.

Le survol était le **dernier son synthétisé** du jeu : une sinusoïde de 55 ms
sur A4. Sur une carte qu'on s'apprête à poser, ce bip se confondait avec le
geste et donnait à la pose une couleur d'interface — un « bip de machine »
posé sur un bruitage de carton.

Le son est donc désormais **découpé dans un enregistrement réel** : la glissière
de `card-draw.wav` (une carte qu'on fait glisser), prise entre ses deux chocs,
loin de toute transitoire. On ne fabrique aucune forme d'onde : on isole
80 ms de papier, on les adoucit aux extrémités, et on s'arrête là.

Déterministe : mêmes octets à chaque exécution, comme `make-arrow-shot.mjs`.

    python3 tools/make-son-survol.py           # écrit le fichier
    python3 tools/make-son-survol.py --verifier # vérifie qu'il est à jour
"""
from __future__ import annotations

import sys
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfilt

RACINE = Path(__file__).resolve().parent.parent
SOURCE = RACINE / "src/games/assets/card-draw.wav"
CHEMIN_SORTIE = RACINE / "src/games/assets/hover.wav"

# La fenêtre de la glissière, entre le choc de pose (~0,05 s) et le choc
# d'arrivée (~0,39 s) : du papier, rien d'autre.
DEBUT = 0.130
FIN = 0.210
# Fondu d'entrée et de sortie : un effleurement ne claque pas.
FONDU_ENTREE = 0.010
FONDU_SORTIE = 0.035
# Coupe-bas : le bruit de manipulation du micro n'a rien à faire dans un survol.
COUPE_BAS_HZ = 150.0
CRETE_CIBLE_DBFS = -1.0


def lire_wav(chemin: Path) -> tuple[np.ndarray, int]:
    with wave.open(str(chemin), "rb") as w:
        canaux, largeur, taux, images = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        brut = w.readframes(images)
    if largeur != 2:
        raise SystemExit(f"{chemin.name} : PCM 16 bits attendu, reçu {8 * largeur} bits")
    donnees = np.frombuffer(brut, dtype="<i2").astype(np.float64) / 32768.0
    if canaux > 1:
        # Somme mono : un effleurement n'a pas besoin de largeur stéréo.
        donnees = donnees.reshape(-1, canaux).mean(axis=1)
    return donnees, taux


def ecrire_wav(chemin: Path, donnees: np.ndarray, taux: int) -> None:
    entier = np.clip(np.round(donnees * 32768.0), -32768, 32767).astype("<i2")
    with wave.open(str(chemin), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(taux)
        w.writeframes(entier.tobytes())


def engendrer() -> tuple[np.ndarray, int]:
    source, taux = lire_wav(SOURCE)
    debut = int(round(DEBUT * taux))
    fin = int(round(FIN * taux))
    if fin > len(source):
        raise SystemExit(f"{SOURCE.name} est plus court que la fenêtre demandée")
    extrait = source[debut:fin].copy()

    # Continu, sans décalage : le morceau commence et finit à zéro.
    extrait -= extrait.mean()
    if len(extrait) > 2:
        sos = butter(4, COUPE_BAS_HZ, btype="highpass", fs=taux, output="sos")
        extrait = sosfilt(sos, extrait)

    n = len(extrait)
    entree = max(1, int(round(FONDU_ENTREE * taux)))
    sortie = max(1, int(round(FONDU_SORTIE * taux)))
    enveloppe = np.ones(n)
    enveloppe[:entree] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, entree))
    enveloppe[n - sortie:] = 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, sortie))
    extrait *= enveloppe

    crete = float(np.abs(extrait).max()) or 1.0
    extrait *= (10 ** (CRETE_CIBLE_DBFS / 20)) / crete
    return extrait, taux


def main() -> int:
    donnees, taux = engendrer()
    if "--verifier" in sys.argv[1:]:
        if not CHEMIN_SORTIE.exists():
            raise SystemExit(f"{CHEMIN_SORTIE.name} manque : lancer sans --verifier")
        actuel, taux_actuel = lire_wav(CHEMIN_SORTIE)
        identique = taux_actuel == taux and len(actuel) == len(donnees) \
            and np.array_equal(np.round(actuel * 32768), np.round(donnees * 32768))
        print("Son du survol : à jour." if identique else "Son du survol : périmé, relancer sans --verifier.")
        return 0 if identique else 1
    ecrire_wav(CHEMIN_SORTIE, donnees, taux)
    print(f"Écrit {CHEMIN_SORTIE.relative_to(RACINE)} : {len(donnees) / taux:.3f} s, mono, {taux} Hz, "
          f"crête {CRETE_CIBLE_DBFS:.1f} dBFS (découpé dans {SOURCE.name}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
