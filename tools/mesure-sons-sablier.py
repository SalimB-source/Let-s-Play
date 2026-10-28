#!/usr/bin/env python3
"""Mesure le niveau des sons du Sablier et engendre la table d'égalisation.

Le duel mélange des échantillons qui viennent de sources très différentes : une
carte posée (`card-place.wav`, enregistrée très bas), un coup d'épée saturé, un
cri viking, un fichier de foley stéréo. À volume d'élément égal, l'écart
entendu va de un à trente-deux décibels : la pose de carte est inaudible, le
coup d'épée assourdissant.

Le jeu ramène donc chaque son au **même niveau d'écoute**
(`RPG_NIVEAU_CIBLE_LUFS`, voir `src/games/rpgNiveauxSons.js`) : chaque fichier
est mesuré une fois ici, et son gain linéaire en découle.

Ce que le script mesure, exactement :

  - **le niveau intégré** en LUFS, selon ITU-R BS.1770 (filtres K, blocs de
    400 ms recouvrant à 75 %, double interrupteur de silence à -70 LUFS puis
    -10 dB sous le niveau moyen des blocs retenus) — c'est la mesure qui
    approche le mieux la sonie perçue d'un fichier entier ;
  - **la crête** en dBFS, échantillon par échantillon.

Les deux valeurs servent : le niveau fixe le gain, la crête dit ce que ce gain
a le droit de pousser. Quand la crête ne laisse pas la marge nécessaire — la
pose d'une carte est enregistrée 27 dB sous le coup d'épée, avec 10 dB de
marge — le gain de lecture ne suffirait pas sans saturer : `--egaliser` remonte
alors le fichier lui-même (gain + limiteur à pré-lecture, crête à -1 dBFS) et
le réécrit en PCM 16 bits. C'est le seul mode qui touche aux fichiers, et
seulement aux WAV — les MP3 fournis gardent leur niveau, quitte à rester un peu
sous la cible.

Les lecteurs MP3 passent par PyAV (ffmpeg embarqué) ; les WAV sont lus ici même
(certains portent un bloc `bext` de terrain dont les métadonnées ne sont pas de
l'UTF-8, ce qui fait échouer les lecteurs trop stricts).

Usage :
    python3 tools/mesure-sons-sablier.py            # mesure et affiche la table
    python3 tools/mesure-sons-sablier.py --js       # le littéral JS à recopier
    python3 tools/mesure-sons-sablier.py --verifier # contrôle avant/après gain
    python3 tools/mesure-sons-sablier.py --egaliser # remonte les WAV trop pointus

Dépendances (outils de développement seulement, rien n'est livré avec le jeu) :
    pip install numpy av
"""
from __future__ import annotations

import argparse
import re
import struct
import sys
from pathlib import Path

import numpy as np

RACINE = Path(__file__).resolve().parent.parent
ASSETS = RACINE / 'src' / 'games' / 'assets'
PUBLIC = RACINE / 'public'
AUDIO_A = RACINE / 'src' / 'games' / 'rpgAudio.js'
VOIX_JS = RACINE / 'src' / 'games' / 'rpgArrivalVoices.js'
NIVEAUX_JS = RACINE / 'src' / 'games' / 'rpgNiveauxSons.js'

# Le niveau de référence de tous les sons du jeu — celui-là même que le module
# livré exporte ; il est relu ici pour que la mesure et le jeu ne divergent pas.
NIVEAU_CIBLE_DEFAUT = -20.0


# ── Décodage ────────────────────────────────────────────────────────────────
def lire_wav(chemin: Path) -> tuple[np.ndarray, int]:
    """Lit un WAV (PCM 8/16/24/32 bits ou flottant), bloc `bext` toléré."""
    brut = chemin.read_bytes()
    if brut[0:4] != b'RIFF' or brut[8:12] != b'WAVE':
        raise ValueError('ce n’est pas un WAV')
    position = 12
    fmt = None
    donnees = None
    while position + 8 <= len(brut):
        identifiant = brut[position:position + 4]
        taille = struct.unpack('<I', brut[position + 4:position + 8])[0]
        corps = brut[position + 8:position + 8 + taille]
        if identifiant == b'fmt ':
            fmt = corps
        elif identifiant == b'data':
            donnees = corps
        position += 8 + taille + (taille % 2)
    if fmt is None or donnees is None:
        raise ValueError('bloc fmt ou data absent')
    format_audio, canaux, taux = struct.unpack('<HHI', fmt[0:8])
    bits = struct.unpack('<H', fmt[14:16])[0]
    if format_audio == 0xFFFE and len(fmt) >= 26:
        format_audio = struct.unpack('<H', fmt[24:26])[0]
    if format_audio == 3:
        type_echantillon = f'f{bits // 8}'
    elif format_audio == 1 and bits == 8:
        type_echantillon = 'u1'
    elif format_audio == 1:
        type_echantillon = f'i{bits // 8}'
    else:
        raise ValueError(f'format WAV non géré : {format_audio}/{bits}')
    audio = np.frombuffer(donnees, dtype=np.dtype('<' + type_echantillon))
    audio = audio.reshape(-1, canaux).T
    if type_echantillon == 'u1':
        audio = (audio.astype(np.float32) - 128.0) / 128.0
    elif type_echantillon.startswith('i'):
        audio = audio.astype(np.float32) / float(2 ** (bits - 1))
    else:
        audio = audio.astype(np.float32)
    return audio, taux


def lire_audio(chemin: Path) -> tuple[np.ndarray, int]:
    if chemin.suffix.lower() == '.wav':
        return lire_wav(chemin)
    import av  # importé seulement pour les MP3 : PyAV est facultatif

    with av.open(str(chemin)) as conteneur:
        flux = next(f for f in conteneur.streams if f.type == 'audio')
        taux = flux.rate
        # Aucun changement de canaux ni de fréquence : la crête mesurée reste
        # celle du fichier (ffmpeg remonte le mono en stéréo à -3 dB par canal).
        convertisseur = av.AudioResampler(format='fltp')
        morceaux = []
        for trame in conteneur.decode(flux):
            for converti in convertisseur.resample(trame):
                morceaux.append(converti.to_ndarray())
        for converti in convertisseur.resample(None):
            morceaux.append(converti.to_ndarray())
    if not morceaux:
        return np.zeros((2, 0), dtype=np.float32), taux
    return np.concatenate(morceaux, axis=1).astype(np.float32), taux


# ── Mesures ─────────────────────────────────────────────────────────────────
def _biquad(audio: np.ndarray, b, a) -> np.ndarray:
    """Filtre IIR d'ordre 2 appliqué canal par canal.

    scipy n'est qu'une accélération : la boucle ci-dessous donne le même
    résultat, en quelques secondes par fichier au lieu de quelques centièmes.
    """
    try:
        from scipy.signal import lfilter
    except ImportError:
        pass
    else:
        return lfilter(b, a, audio.astype(np.float64), axis=-1)
    sortie = np.empty_like(audio)
    for canal in range(audio.shape[0]):
        x = audio[canal].astype(np.float64)
        y = np.empty_like(x)
        x1 = x2 = y1 = y2 = 0.0
        for i in range(x.shape[0]):
            xi = x[i]
            yi = b[0] * xi + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2
            x2, x1 = x1, xi
            y2, y1 = y1, yi
            y[i] = yi
        sortie[canal] = y
    return sortie


def niveau_lufs(audio: np.ndarray, taux: int) -> float:
    """Niveau intégré ITU-R BS.1770 (filtres K et double interrupteur)."""
    if audio.shape[1] == 0:
        return -70.0
    x = audio.T.astype(np.float64)
    # Étage 1 : filtre en étagère, +4 dB au-dessus de 1,7 kHz.
    f0, gain, q = 1681.974450955533, 3.999843853973347, 0.7071752369554196
    k = np.tan(np.pi * f0 / taux)
    vh = 10 ** (gain / 20)
    vb = vh ** 0.4996667741545416
    a0 = 1 + k / q + k * k
    b1 = [(vh + vb * k / q + k * k) / a0, 2 * (k * k - vh) / a0, (vh - vb * k / q + k * k) / a0]
    a1 = [1.0, 2 * (k * k - 1) / a0, (1 - k / q + k * k) / a0]
    y = _biquad(x.T, b1, a1)
    # Étage 2 : coupe-bas à 38 Hz.
    f0, q = 38.13547087602444, 0.5003270373238773
    k = np.tan(np.pi * f0 / taux)
    a0 = 1 + k / q + k * k
    a2 = [1.0, 2 * (k * k - 1) / a0, (1 - k / q + k * k) / a0]
    y = _biquad(y, [1.0, -2.0, 1.0], a2)
    # Blocs de 400 ms recouvrant à 75 %.
    bloc = int(0.4 * taux)
    pas = int(0.1 * taux)
    if y.shape[1] < bloc:
        energie = float(np.mean(y ** 2)) * y.shape[0]
        return -0.691 + 10 * np.log10(energie + 1e-12)
    debuts = range(0, y.shape[1] - bloc + 1, pas)
    # Énergie du bloc : moyenne des carrés de tous les échantillons de tous les
    # canaux, sommée sur les canaux — la pondération des canaux de BS.1770 vaut
    # 1,0 pour la stéréo comme pour le mono remonté en stéréo.
    energies = np.array([float(np.mean(y[:, d:d + bloc] ** 2)) * y.shape[0] for d in debuts])
    niveaux = -0.691 + 10 * np.log10(energies + 1e-12)
    retenus = energies[niveaux > -70]
    if retenus.size == 0:
        return -70.0
    relatif = -0.691 + 10 * np.log10(np.mean(retenus)) - 10
    retenus = energies[niveaux > relatif]
    return float(-0.691 + 10 * np.log10(np.mean(retenus) + 1e-12))


def ecrire_wav(chemin: Path, audio: np.ndarray, taux: int) -> None:
    """Réécrit un WAV en PCM 16 bits, mêmes canaux, même fréquence."""
    canaux = audio.shape[0]
    entiers = np.clip(np.round(audio.T * 32767.0), -32768, 32767).astype('<i2')
    donnees = entiers.tobytes()
    bloc_fmt = struct.pack('<HHIIHH', 1, canaux, taux, taux * canaux * 2, canaux * 2, 16)
    entete = b'RIFF' + struct.pack('<I', 36 + len(donnees)) + b'WAVE'
    entete += b'fmt ' + struct.pack('<I', 16) + bloc_fmt
    entete += b'data' + struct.pack('<I', len(donnees))
    chemin.write_bytes(entete + donnees)


def limiter(audio: np.ndarray, taux: int, plafond_db: float = -1.0,
            pre_lecture_ms: float = 5.0, relachement_ms: float = 120.0) -> np.ndarray:
    """Limiteur à pré-lecture : les crêtes sont écrasées sans dépasser le plafond.

    La réduction de gain est calculée sur l'enveloppe de crête, avancée de la
    fenêtre de pré-lecture (le gain baisse donc *avant* le pic, sans
    distorsion), puis relâchée lentement. C'est le geste d'un limiteur de
    mastering, appliqué une fois pour toutes au fichier — plutôt qu'à chaque
    lecture par le bus du jeu.
    """
    plafond = 10 ** (plafond_db / 20)
    crete = np.max(np.abs(audio), axis=0)
    besoin = np.minimum(1.0, plafond / np.maximum(crete, 1e-9))
    fenetre = max(1, int(pre_lecture_ms / 1000 * taux))
    try:
        from scipy.ndimage import minimum_filter1d
        avance = minimum_filter1d(besoin, size=fenetre, mode='nearest')
    except ImportError:
        avance = np.copy(besoin)
        for decalage in range(1, fenetre):
            avance[:-decalage] = np.minimum(avance[:-decalage], besoin[decalage:])
    alpha = 1 - np.exp(-1 / (relachement_ms / 1000 * taux))
    enveloppe = np.empty_like(avance)
    courant = 1.0
    for i in range(avance.size):
        cible = avance[i]
        courant = cible if cible < courant else courant + (cible - courant) * alpha
        enveloppe[i] = courant
    return audio * enveloppe


def egaliser(chemin: Path, cible: float, plafond_db: float = -1.0, passes: int = 4) -> dict:
    """Remonte un WAV à la cible, en limitant ses crêtes (les MP3 ne sont pas réécrits)."""
    if chemin.suffix.lower() != '.wav':
        return {'reecrit': False, 'raison': 'MP3 : non réécrit'}
    audio, taux = lire_audio(chemin)
    avant = mesurer(chemin)
    depart = gain_depuis_lufs(avant['lufs'], cible)
    # Le gain qu'un simple volume permettrait, crête comprise.
    if depart <= 10 ** ((plafond_db - avant['crete']) / 20):
        return {'reecrit': False, 'raison': 'déjà dans sa marge', 'depart': depart}
    for _ in range(passes):
        niveau = niveau_lufs(audio, taux)
        if abs(niveau - cible) < 0.15:
            break
        audio = audio * gain_depuis_lufs(niveau, cible)
        audio = limiter(audio, taux, plafond_db)
    ecrire_wav(chemin, audio, taux)
    apres = mesurer(chemin)
    return {'reecrit': True, 'avant': avant, 'apres': apres, 'gain': gain_depuis_lufs(apres['lufs'], cible)}


def mesurer(chemin: Path) -> dict:
    audio, taux = lire_audio(chemin)
    crete = float(np.max(np.abs(audio))) if audio.shape[1] else 0.0
    return {
        'lufs': niveau_lufs(audio, taux),
        'crete': 20 * np.log10(crete) if crete > 0 else -99.0,
        'duree': audio.shape[1] / taux if taux else 0.0,
    }


# ── Inventaire ──────────────────────────────────────────────────────────────
def inventaire_echantillons() -> list[tuple[str, str]]:
    """(nom de bruitage, fichier) relu dans le registre du lecteur."""
    source = AUDIO_A.read_text(encoding='utf-8')
    bloc = re.search(r'ECHANTILLONS_FICHIERS\s*=\s*Object\.freeze\(\[(.*?)\]\)', source, re.S)
    if not bloc:
        raise SystemExit('ECHANTILLONS_FICHIERS introuvable dans src/games/rpgAudio.js')
    return re.findall(r"\[\s*'([^']+)'\s*,\s*new URL\('\./assets/([^']+)'", bloc.group(1))


def inventaire_voix() -> list[str]:
    """Les fichiers de voix d'arrivée, relus dans la table des cartes."""
    source = VOIX_JS.read_text(encoding='utf-8')
    bloc = re.search(r'RPG_ARRIVAL_VOICE_FILES\s*=\s*Object\.freeze\(\{(.*?)\}\);', source, re.S)
    if not bloc:
        raise SystemExit('RPG_ARRIVAL_VOICE_FILES introuvable')
    fichiers = re.findall(r":\s*'([^']+\.(?:mp3|MP3|wav))'", bloc.group(1))
    fichiers += re.findall(r':\s*"([^"]+\.(?:mp3|MP3|wav))"', bloc.group(1))
    return sorted(set(fichiers), key=str.lower)


def niveau_cible() -> float:
    """La cible lue dans le module livré — jamais une constante en double."""
    if not NIVEAUX_JS.exists():
        return NIVEAU_CIBLE_DEFAUT
    trouve = re.search(r'RPG_NIVEAU_CIBLE_LUFS\s*=\s*(-?\d+(?:\.\d+)?)', NIVEAUX_JS.read_text(encoding='utf-8'))
    return float(trouve.group(1)) if trouve else NIVEAU_CIBLE_DEFAUT


def plafond_crete() -> float:
    """Le plafond de crête du module livré, en dBFS."""
    if not NIVEAUX_JS.exists():
        return -0.5
    trouve = re.search(r'RPG_PLAFOND_CRETE_DBFS\s*=\s*(-?\d+(?:\.\d+)?)', NIVEAUX_JS.read_text(encoding='utf-8'))
    return float(trouve.group(1)) if trouve else -0.5


def gain_de_lecture(lufs: float, crete: float, cible: float, plafond: float) -> tuple[float, bool]:
    """Le gain appliqué à la lecture : le niveau commun, borné par la crête."""
    gain = gain_depuis_lufs(lufs, cible)
    gain_crete = 10 ** ((plafond - crete) / 20)
    return (gain, False) if gain <= gain_crete else (gain_crete, True)


def gain_depuis_lufs(lufs: float, cible: float) -> float:
    return 10 ** ((cible - lufs) / 20)


def fmt_nombre(valeur: float) -> str:
    return f'{valeur:.1f}' if abs(valeur - round(valeur, 1)) < 0.005 else f'{valeur:.2f}'


def main() -> int:
    parseur = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parseur.add_argument('--js', action='store_true', help='n’affiche que le littéral JavaScript des tables')
    parseur.add_argument('--verifier', action='store_true', help='contrôle le niveau obtenu après application du gain')
    parseur.add_argument('--egaliser', action='store_true',
                         help='réécrit les WAV dont la crête empêche d’atteindre la cible (gain + limiteur)')
    options = parseur.parse_args()

    cible = niveau_cible()

    echantillons = []
    for nom, fichier in inventaire_echantillons():
        chemin = ASSETS / fichier
        if not chemin.exists():
            print(f'  !! {nom} : {fichier} manquant', file=sys.stderr)
            continue
        echantillons.append((nom, mesurer(chemin)))

    voix = []
    for fichier in inventaire_voix():
        chemin = PUBLIC / fichier
        if not chemin.exists():
            print(f'  !! voix manquante : {fichier}', file=sys.stderr)
            continue
        voix.append((fichier, mesurer(chemin)))

    if options.egaliser:
        plafond = -1.0
        print(f'Niveau de référence : {cible:g} LUFS — crête plafonnée à {plafond:g} dBFS\n')
        for nom, fichier in inventaire_echantillons():
            chemin = ASSETS / fichier
            if not chemin.exists():
                continue
            resultat = egaliser(chemin, cible, plafond)
            if resultat['reecrit']:
                print(f"{fichier:52} {resultat['avant']['lufs']:>6.1f} → {resultat['apres']['lufs']:>5.1f} LUFS"
                      f"  crête {resultat['apres']['crete']:>5.1f} dBFS  (gain de lecture ×{resultat['gain']:.2f})")
            elif resultat.get('depart') is not None:
                print(f"{fichier:52} inchangé — {resultat['raison']}")
            else:
                print(f"{fichier:52} non réécrit — {resultat['raison']}")
        for fichier in inventaire_voix():
            chemin = PUBLIC / fichier
            if not chemin.exists():
                continue
            resultat = egaliser(chemin, cible, plafond)
            if resultat['reecrit']:
                print(f"{fichier:52} {resultat['avant']['lufs']:>6.1f} → {resultat['apres']['lufs']:>5.1f} LUFS"
                      f"  crête {resultat['apres']['crete']:>5.1f} dBFS  (gain de lecture ×{resultat['gain']:.2f})")
        return 0

    if options.js:
        print('export const RPG_NIVEAUX_ECHANTILLONS = Object.freeze({')
        for nom, m in echantillons:
            print(f"  {nom}: [{fmt_nombre(m['lufs'])}, {fmt_nombre(m['crete'])}],")
        print('});')
        print()
        print('export const RPG_NIVEAUX_VOIX = Object.freeze({')
        for fichier, m in voix:
            print(f"  {fichier!r}: [{fmt_nombre(m['lufs'])}, {fmt_nombre(m['crete'])}],")
        print('});')
        return 0

    plafond = plafond_crete()
    print(f'Niveau de référence : {cible:g} LUFS — crête plafonnée à {plafond:g} dBFS\n')
    print(f'{"son":34} {"LUFS":>7} {"crête":>7} {"gain":>8} {"niveau obtenu":>14}')
    print('-' * 76)
    ecarts = []
    for nom, m in echantillons + voix:
        gain, bride = gain_de_lecture(m['lufs'], m['crete'], cible, plafond)
        obtenu = m['lufs'] + 20 * np.log10(gain)
        ecarts.append(abs(obtenu - cible))
        alerte = '  (bridé par sa crête)' if bride else ''
        print(f'{nom:34} {m["lufs"]:>7.1f} {m["crete"]:>7.1f} {20 * np.log10(gain):>+7.1f} dB {obtenu:>12.1f} LUFS{alerte}')

    if options.verifier:
        brides = [(nom, m) for nom, m in echantillons + voix
                  if gain_de_lecture(m['lufs'], m['crete'], cible, plafond)[1]]
        print(f'\nÉcart maximal au niveau de référence : {max(ecarts):.2f} dB sur {len(ecarts)} fichiers'
              f' — {len(brides)} bridé(s) par leur crête : {", ".join(n for n, _ in brides)}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
