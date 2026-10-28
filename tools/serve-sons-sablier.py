#!/usr/bin/env python3
"""Serveur statique pour la salle d'écoute du Sablier.

`/` mène directement à `sons-du-sablier.html` (sinon l'aperçu tomberait sur le
`index.html` du site React, qui exige une compilation Vite pour fonctionner).
Tout le reste du dépôt est servi tel quel — la page en a besoin : elle joue les
modules `src/games/rpgAudio.js` et `src/games/rpgNiveauxSons.js` à l'identique
de l'en-jeu.
"""
import os
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 4173
PAGE_ACCUEIL = "/sons-du-sablier.html"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        chemin = self.path.split("?", 1)[0].split("#", 1)[0]
        if chemin in ("/", "/index.html"):
            self.path = PAGE_ACCUEIL
        return super().do_GET()

    def do_HEAD(self):
        chemin = self.path.split("?", 1)[0].split("#", 1)[0]
        if chemin in ("/", "/index.html"):
            self.path = PAGE_ACCUEIL
        return super().do_HEAD()

    def end_headers(self):
        # Pas de cache : page et sons bougent souvent pendant le travail.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        print(f"{self.address_string()} - - {fmt % args}", flush=True)


if __name__ == "__main__":
    serveur = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Salle d'écoute du Sablier : http://0.0.0.0:{PORT}/ ({PAGE_ACCUEIL})", flush=True)
    serveur.serve_forever()
