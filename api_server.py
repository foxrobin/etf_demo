"""Tiny HTTP wrapper around lambda_handler for external testing. py -3.14 api_server.py --host 0.0.0.0 --port 8787 http://10.1.8.59:8787"""

from __future__ import annotations

import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict

from lambda_function import lambda_handler
from provider_router import PROVIDERS


def _json_response(
    handler: BaseHTTPRequestHandler,
    status: int,
    payload: Dict[str, Any],
) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.end_headers()
    handler.wfile.write(body)


class LambdaApiHandler(BaseHTTPRequestHandler):
    server_version = "LambdaApi/1.0"

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:
        if self.path == "/health":
            _json_response(self, 200, {"ok": True})
            return

        if self.path == "/providers":
            _json_response(self, 200, {"providers": sorted(PROVIDERS.keys())})
            return

        _json_response(
            self,
            404,
            {
                "error": "Not found",
                "routes": ["GET /health", "GET /providers", "POST /lambda"],
            },
        )

    def do_POST(self) -> None:
        if self.path != "/lambda":
            _json_response(self, 404, {"error": "Not found"})
            return

        raw_len = self.headers.get("Content-Length", "0")
        try:
            length = int(raw_len)
        except ValueError:
            _json_response(self, 400, {"error": "Invalid Content-Length header"})
            return

        raw_body = self.rfile.read(length) if length > 0 else b"{}"
        try:
            event = json.loads(raw_body.decode("utf-8"))
        except Exception:
            _json_response(self, 400, {"error": "Request body must be valid JSON"})
            return

        if not isinstance(event, dict):
            _json_response(self, 400, {"error": "JSON root must be an object"})
            return

        result = lambda_handler(event, None)
        status_code = int(result.get("statusCode", 200))
        body = result.get("body", "{}")
        try:
            payload = json.loads(body) if isinstance(body, str) else body
        except Exception:
            payload = {"raw": body}
        _json_response(self, status_code, payload if isinstance(payload, dict) else {"data": payload})

    # Quiet default logs; keep one-line summary only.
    def log_message(self, fmt: str, *args: Any) -> None:
        print(f"[{self.address_string()}] {self.command} {self.path} - {fmt % args}")


def main() -> None:
    parser = argparse.ArgumentParser(description="HTTP wrapper for lambda_handler")
    parser.add_argument("--host", default="0.0.0.0", help="Bind host (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8787, help="Bind port (default: 8787)")
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), LambdaApiHandler)
    print(f"Serving lambda API on http://{args.host}:{args.port}")
    print("Routes: GET /health, GET /providers, POST /lambda")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
