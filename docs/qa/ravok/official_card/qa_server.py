from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class QAServer(ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True

class QAHandler(SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

handler = partial(QAHandler, directory='C:/xampp/htdocs/2025/Festival_Dos_Esportes')
QAServer(('127.0.0.1', 8815), handler).serve_forever()

