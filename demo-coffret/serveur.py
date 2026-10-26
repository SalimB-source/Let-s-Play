"""Sert le dépôt, la racine ouvrant la démo du coffret — sans cache.

Sans `Cache-Control: no-store`, un navigateur garde le `bundle.js` de la
version précédente : on croit alors que les corrections n'ont rien changé
(la brillance était encore là, la vitrine encore absente).
"""
import functools
import http.server

RACINE = '/home/user/Let-s-Play'


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        if self.path in ('/', '/index.html'):
            self.send_response(302)
            self.send_header('Location', '/demo-coffret/index.html')
            self.end_headers()
            return
        return super().do_GET()

    def log_message(self, *args):
        pass


http.server.ThreadingHTTPServer(('0.0.0.0', 4174), functools.partial(Handler, directory=RACINE)).serve_forever()
