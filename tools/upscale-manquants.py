#!/usr/bin/env python3
"""Upscale 4K des plaques manquantes uniquement (V11).

Traite : paires B/C sans 4K, nouveaux originaux (T11p3), et originaux
régénérés (famille/marché T03 version sombre). Réutilise le pipeline
de tools/upscale-cinematic.py. Idempotent : saute les 4K déjà à jour.
Usage : python3 tools/upscale-manquants.py
"""
import importlib.util
import os

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RACINE, "public", "sablier-cinematic")
DST = os.path.join(SRC, "4k")

# Originaux régénérés depuis leur 4K : à refaire même si le 4K existe.
FORCE = {"cine-t03e-marche-vie", "cine-t03f-famille"}

_spec = importlib.util.spec_from_file_location(
    "up", os.path.join(RACINE, "tools", "upscale-cinematic.py"))
_up = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_up)


def main():
    os.makedirs(DST, exist_ok=True)
    todo = []
    for f in sorted(os.listdir(SRC)):
        if not (f.startswith("cine-t") and f.endswith(".png")):
            continue
        base = f[:-4]
        dst = os.path.join(DST, f"{base}-4k.jpg")
        if base in FORCE or not os.path.exists(dst):
            todo.append((os.path.join(SRC, f), dst, base))
    print(f"{len(todo)} plaques a upscaler", flush=True)
    for src, dst, base in todo:
        octets = _up.upscale_4k(src, dst)
        print(f"{base}-4k.jpg 3840x2160 {octets / 1e6:.1f} Mo", flush=True)
    print("OK upscale manquants", flush=True)


if __name__ == "__main__":
    main()
