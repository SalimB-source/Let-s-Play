#!/usr/bin/env python3
"""Synthèse procédurale des ambiances de la cinématique du Sablier.

Le sandbox ne peut pas télécharger de sons : ces nappes 100 % synthétiques
servent de fond sonore en attendant de vrais enregistrements (mêmes noms
de fichiers -> remplaçables sans toucher au montage).

Boucles parfaites : tous les LFO font un nombre entier de cycles.
Sorties (mono 44,1 kHz, sauf cloche stéréo) :
  public/sablier-cinematic/audio/amb/wind-desert-loop.wav   (60 s)
  public/sablier-cinematic/audio/amb/sand-shimmer-loop.wav  (24 s)
  public/sablier-cinematic/audio/amb/tea-room-tone.wav      (48 s)
  public/sablier-cinematic/audio/amb/deep-drone-loop.wav    (48 s)
  public/sablier-cinematic/audio/amb/bell-hit.wav           (8 s)
Usage : python3 tools/synth-ambiances.py
"""
import os
import wave

import numpy as np

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AMB = os.path.join(RACINE, "public", "sablier-cinematic", "audio", "amb")
SR = 44100


def ecrire_wav(chemin, x, stereo=False):
    """x : float32 mono [-1, 1] (ou (N, 2) si stéréo)."""
    x = np.clip(x, -1.0, 1.0)
    if not stereo:
        x = x.reshape(-1, 1)
    pcm = (x * 32767.0).astype(np.int16)
    with wave.open(chemin, "wb") as f:
        f.setnchannels(2 if stereo else 1)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(pcm.tobytes())
    print(f"{os.path.basename(chemin)} : {len(pcm) / SR:.1f}s "
          f"({os.path.getsize(chemin) / 1e6:.1f} Mo)")


def bruit_blanc(n, rng):
    return rng.standard_normal(n).astype(np.float64)


def passe_bas_fft(x, fc, ordre=2):
    """Filtre passe-bas (domaine FFT) de fréquence de coupure fc."""
    n = len(x)
    f = np.fft.rfftfreq(n, 1.0 / SR)
    h = 1.0 / (1.0 + (f / fc) ** (2 * ordre))
    return np.fft.irfft(np.fft.rfft(x) * h, n)


def passe_haut_fft(x, fc, ordre=2):
    n = len(x)
    f = np.fft.rfftfreq(n, 1.0 / SR)
    h = 1.0 / (1.0 + (fc / np.maximum(f, 1e-6)) ** (2 * ordre))
    return np.fft.irfft(np.fft.rfft(x) * h, n)


def passe_bande_fft(x, fc, bw, ordre=2):
    n = len(x)
    f = np.fft.rfftfreq(n, 1.0 / SR)
    h = 1.0 / (1.0 + ((f - fc) / bw) ** (2 * ordre))
    return np.fft.irfft(np.fft.rfft(x) * h, n)


def lfo(n, duree, cycles, phase=0.0):
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * cycles * t / duree + phase)


def boucle(x, duree_s=1.0):
    """Crossfade de couture : boucle parfaite malgré le bruit aléatoire."""
    m = int(SR * duree_s)
    fondu = np.linspace(0, 1, m)
    x = x.copy()
    x[-m:] = x[-m:] * (1 - fondu) + x[:m] * fondu
    return x


def vent_desert(duree=60.0):
    """Rafales graves + sifflements médiums errants."""
    rng = np.random.default_rng(11)
    n = int(duree * SR)
    base = passe_bas_fft(bruit_blanc(n, rng), 320)
    base /= np.abs(base).max()
    rafales = (0.55 + 0.25 * lfo(n, duree, 3)
               + 0.14 * lfo(n, duree, 7, 1.3)
               + 0.06 * lfo(n, duree, 13, 4.1))
    siffle = passe_bande_fft(bruit_blanc(n, rng), 900, 500)
    siffle /= np.abs(siffle).max()
    errance = 0.35 + 0.30 * lfo(n, duree, 5, 0.7) + 0.15 * lfo(n, duree, 11, 2.2)
    x = base * rafales + 0.35 * siffle * np.clip(errance, 0.05, 1.0)
    x = boucle(x)
    return (x / np.abs(x).max() * 0.5).astype(np.float32)


def bourdon(duree=48.0):
    """Empilement grave (cycles entiers -> boucle parfaite) + grondement."""
    rng = np.random.default_rng(23)
    n = int(duree * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for k, amp in ((2640, 1.0), (2641, 0.7), (3960, 0.45),
                   (5280, 0.30), (7920, 0.15)):
        f0 = k / duree
        x += amp * np.sin(2 * np.pi * f0 * t)
    grond = passe_bas_fft(bruit_blanc(n, rng), 90)
    x += 0.5 * grond / np.abs(grond).max() * len(x) ** 0  # normalisé après
    gonfle = 0.75 + 0.25 * lfo(n, duree, 2, 0.4)
    x = x * gonfle
    x = boucle(x)
    return (x / np.abs(x).max() * 0.45).astype(np.float32)


def scintillement(duree=24.0):
    """Grains aigus + quelques tintements amortis (loin des bords)."""
    rng = np.random.default_rng(37)
    n = int(duree * SR)
    grains = passe_haut_fft(bruit_blanc(n, rng), 6000)
    grains /= np.abs(grains).max()
    porte = np.clip(0.4 + 0.35 * lfo(n, duree, 7, 1.1)
                    + 0.25 * lfo(n, duree, 3, 3.3), 0.02, 1.0)
    x = 0.5 * grains * porte
    t = np.arange(n) / SR
    for _ in range(9):  # tintements : fréquence + position aléatoires
        f0 = rng.uniform(2800, 5200)
        t0 = rng.uniform(2.0, duree - 4.0)
        dec = rng.uniform(1.5, 3.5)
        env = np.exp(-np.clip(t - t0, 0, None) * dec) * (t >= t0)
        x += rng.uniform(0.10, 0.30) * env * np.sin(2 * np.pi * f0 * (t - t0))
    x = boucle(x)
    return (x / np.abs(x).max() * 0.35).astype(np.float32)


def salon_the(duree=48.0):
    """Pièce feutrée + feu lointain (crépitements doux aléatoires)."""
    rng = np.random.default_rng(51)
    n = int(duree * SR)
    t = np.arange(n) / SR
    piece = passe_bas_fft(bruit_blanc(n, rng), 220)
    piece /= np.abs(piece).max()
    x = 0.30 * piece
    for _ in range(46):  # crépitements : bouffées de bruit amorties
        t0 = rng.uniform(1.0, duree - 2.0)
        dec = rng.uniform(25, 90)
        larg = rng.uniform(0.004, 0.020)
        m = int(larg * SR)
        i0 = int(t0 * SR)
        if i0 + m >= n:
            continue
        bouffee = rng.standard_normal(m) * np.exp(-np.arange(m) / SR * dec)
        x[i0:i0 + m] += rng.uniform(0.05, 0.22) * bouffee
    # Lueur lente du feu sur l'ensemble (cycles entiers).
    x *= 0.8 + 0.2 * lfo(n, duree, 4, 0.9)
    # Fondus microscopiques aux bords (boucle sûre malgré les transitoires).
    m = SR // 4
    x[:m] *= np.linspace(0, 1, m)
    x[-m:] *= np.linspace(1, 0, m)
    return (x / np.abs(x).max() * 0.40).astype(np.float32)


def cloche(duree=8.0):
    """Cloche : partiels inharmoniques, aigus amortis plus vite, chorus stéréo."""
    n = int(duree * SR)
    t = np.arange(n) / SR
    partiels = [(98, 1.00), (198, 0.55), (269, 0.35), (369, 0.22),
                (530, 0.12), (740, 0.07), (1180, 0.04)]
    g = np.zeros(n)
    d = np.zeros(n)
    for f0, amp in partiels:
        dec = 2.0 * (f0 / 98.0) ** 0.6
        env = np.exp(-t * dec)
        g += amp * env * np.sin(2 * np.pi * f0 * t)
        d += amp * env * np.sin(2 * np.pi * f0 * 1.0015 * t)
    st = np.stack([g, d], axis=1)
    return (st / np.abs(st).max() * 0.8).astype(np.float32)


def main():
    os.makedirs(AMB, exist_ok=True)
    ecrire_wav(os.path.join(AMB, "wind-desert-loop.wav"), vent_desert())
    ecrire_wav(os.path.join(AMB, "sand-shimmer-loop.wav"), scintillement())
    ecrire_wav(os.path.join(AMB, "tea-room-tone.wav"), salon_the())
    ecrire_wav(os.path.join(AMB, "deep-drone-loop.wav"), bourdon())
    ecrire_wav(os.path.join(AMB, "bell-hit.wav"), cloche(), stereo=True)


if __name__ == "__main__":
    main()
