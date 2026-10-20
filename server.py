#!/usr/bin/env python
"""
Zero-dependency local HTTP server for the Igloo Inc. 3D WebGL2 experience.
Properly serves WebAssembly, Draco models, KTX2 textures, and OGG audio with CORS & SPA fallback.
"""

import http.server
import mimetypes
import os
import sys

PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Register custom MIME types
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/wasm", ".wasm")
mimetypes.add_type("application/octet-stream", ".drc")
mimetypes.add_type("image/ktx2", ".ktx2")
mimetypes.add_type("audio/ogg", ".ogg")
mimetypes.add_type("font/woff2", ".woff2")
mimetypes.add_type("font/woff", ".woff")
mimetypes.add_type("image/x-exr", ".exr")
mimetypes.add_type("application/json", ".json")


class IglooHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def handle_one_request(self):
        # Browsers abort in-flight requests routinely (navigation away, asset
        # cancel). Without this guard the socket error propagates out of
        # copyfile() and terminates the whole server process.
        try:
            super().handle_one_request()
        except (ConnectionResetError, BrokenPipeError, ConnectionAbortedError):
            self.close_connection = True

    def end_headers(self):
        # Enable CORS and Worker threading policies
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_head(self):
        # SPA routing fallback for /portfolio/:project
        path = self.translate_path(self.path)
        if not os.path.exists(path) and not os.path.splitext(self.path)[1]:
            self.path = "/index.html"
        return super().send_head()

    def do_GET(self):
        return super().do_GET()

    def do_HEAD(self):
        return super().do_HEAD()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        PORT = int(sys.argv[1])
    server_address = ("127.0.0.1", PORT)
    # Threading so parallel asset loads (browser requests dozens of .drc/.ktx2
    # files at once) are served concurrently instead of serialized.
    httpd = http.server.ThreadingHTTPServer(server_address, IglooHTTPHandler)
    httpd.daemon_threads = True
    print(f"🧊 Igloo 3D Experience running at: http://localhost:{PORT}")
    print("Press Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
