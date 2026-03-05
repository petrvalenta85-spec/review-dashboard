#!/usr/bin/env python3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
import json

import os

PORT = int(os.environ.get("PORT", "8000"))
ALLOWED_HOSTS = {"www.heureka.cz"}


class DevHandler(SimpleHTTPRequestHandler):
    def _send_json(self, code: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path != "/proxy":
            return super().do_GET()

        params = parse_qs(parsed.query)
        target = (params.get("url") or [""])[0].strip()
        if not target:
            return self._send_json(400, {"error": "Missing url query param."})

        try:
            target_parsed = urlparse(target)
        except Exception:
            return self._send_json(400, {"error": "Invalid URL."})

        if target_parsed.scheme not in {"http", "https"}:
            return self._send_json(400, {"error": "Only http/https are supported."})

        if target_parsed.netloc not in ALLOWED_HOSTS:
            return self._send_json(403, {"error": "Host is not allowed for proxy."})

        try:
            request = Request(target, headers={"User-Agent": "BruderlandReviewDashboard/1.0"})
            with urlopen(request, timeout=20) as response:
                body = response.read()
                content_type = response.headers.get("Content-Type", "application/xml; charset=utf-8")
                self.send_response(200)
                self.send_header("Content-Type", content_type)
                self.send_header("Cache-Control", "no-store")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
        except HTTPError as exc:
            self._send_json(exc.code, {"error": f"Upstream HTTP error: {exc.code}"})
        except URLError as exc:
            self._send_json(502, {"error": f"Upstream network error: {exc.reason}"})
        except Exception as exc:
            self._send_json(500, {"error": f"Proxy failed: {exc}"})


def main():
    server = ThreadingHTTPServer(("0.0.0.0", PORT), DevHandler)
    print(f"Serving on http://0.0.0.0:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
