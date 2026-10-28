from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit,unquote
import sys
STAGE=Path(__file__).parent
ROOT=Path(r'C:\xampp\htdocs\2025\Festival_Dos_Esportes')
class Handler(SimpleHTTPRequestHandler):
 protocol_version='HTTP/1.1'
 def translate_path(self,path):
  rel=unquote(urlsplit(path).path).lstrip('/') or 'index.html'
  if '..' in Path(rel).parts:return str(STAGE/'missing')
  return str(STAGE/rel if '--root' not in sys.argv and (STAGE/rel).is_file() else ROOT/rel)
 def do_GET(self):
  if self.path=='/favicon.ico':self.send_response(204);self.send_header('Content-Length','0');self.end_headers();return
  super().do_GET()
class Server(ThreadingHTTPServer):
 request_queue_size=256
 daemon_threads=True
Server(('127.0.0.1',8871 if '--root' in sys.argv else 8870),Handler).serve_forever()
