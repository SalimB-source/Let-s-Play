"""Sert le dépôt, la racine ouvrant directement la démo du coffret."""
import functools
import http.server

RACINE = '/home/user/Let-s-Play'


class Handler(http.server.SimpleHTTPRequestHandler):
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
