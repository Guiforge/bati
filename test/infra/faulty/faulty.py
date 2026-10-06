#!/usr/bin/env python3
"""A WebDAV server that misbehaves on command, for the release bench.

It speaks only what Bati speaks (src/cloudSync.ts): MKCOL, PROPFIND depth 1, GET, PUT, MOVE, DELETE,
with basic auth. Everything is stored under DATA_DIR. What makes it useful is /_admin: a test says
"the next PUT of a .batb answers 507" or "hide this file from listings" and the server does exactly
that, once or every time, and keeps a log of every request it saw.

Admin API (no auth, never exposed beyond the compose network and the bench's own port):
  POST   /_admin/fault    {"method": "PUT", "path": ".batb", "action": "status", "status": 507,
                           "after": 0, "count": 1, "headers": {...}, "ms": 0}
  DELETE /_admin/faults   forget every fault
  POST   /_admin/reset    forget faults, files and log
  GET    /_admin/log      every request seen: [{n, method, path, status, fault}]
  GET    /_admin/files    {name: size}
  PUT    /_admin/file/<name>   put a file straight in (body = bytes)
  POST   /_admin/mtime    {"name": "...", "epoch": 1700000000}   change a file's modification time

Fault actions:
  status        answer `status` (401 403 404 405 409 412 423 429 500 502 503 507 ...), body empty
  latency       sleep `ms` then answer normally
  truncate      GET: send half the body with the full Content-Length then close; PUT: store half
  empty         GET: send an empty body; PUT: store an empty file
  swap          GET: send the bytes of the file called `other` instead
  hide          PROPFIND: leave the file called `name` out of the listing
  weirdnames    PROPFIND: add files with accents, spaces and upper case
  dateshift     PROPFIND: shift every Last-Modified by `ms` milliseconds
  reset         close the connection without answering
  emptymultistatus  PROPFIND: 207 with an empty <multistatus/>, not even the folder's own entry
  ghost         PROPFIND: list a file called `name` that does not exist (its GET answers 404)
  fixedetag     PROPFIND: every file carries the same ETag (`etag`, default "fixed")
  rotateetag    PROPFIND: every ETag changes on every listing, though no file did

/_portal answers GET with 200 and an HTML login page, without auth: the `Location` to give a
`status` fault of 302 to play an SSO proxy whose session expired (OkHttp follows it as a GET).
"""
import hashlib
import json
import os
import shutil
import sys
import threading
import time
from email.utils import formatdate
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse
from xml.sax.saxutils import escape

DATA_DIR = os.environ.get("DATA_DIR", "/data")
USER = os.environ.get("DAV_USER", "bati")
PASSWORD = os.environ.get("DAV_PASSWORD", "bati-test-password")
LOCK = threading.Lock()
FAULTS: list[dict] = []
LOG: list[dict] = []
SEQ = {"n": 0}
LISTINGS = {"n": 0}  # for rotateetag
LISTING_ACTIONS = ("hide", "weirdnames", "dateshift", "emptymultistatus", "ghost", "fixedetag", "rotateetag")


def local(path: str) -> str:
    rel = unquote(urlparse(path).path).strip("/")
    full = os.path.normpath(os.path.join(DATA_DIR, rel))
    if not full.startswith(os.path.normpath(DATA_DIR)):
        raise ValueError("outside the data dir")
    return full


def etag_of(full: str) -> str:
    st = os.stat(full)
    return hashlib.md5(f"{st.st_mtime_ns}:{st.st_size}".encode()).hexdigest()


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):  # the admin log is the log
        pass

    # --- plumbing -------------------------------------------------------------------------------

    def body(self) -> bytes:
        n = int(self.headers.get("Content-Length") or 0)
        return self.rfile.read(n) if n else b""

    def send(self, status: int, data: bytes = b"", headers: dict | None = None, fault: str = ""):
        self.send_response(status)
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)
        with LOCK:
            SEQ["n"] += 1
            LOG.append({"n": SEQ["n"], "method": self.command, "path": self.path, "status": status, "fault": fault})

    def authed(self) -> bool:
        import base64

        header = self.headers.get("Authorization", "")
        if not header.startswith("Basic "):
            return False
        try:
            user, _, password = base64.b64decode(header[6:]).decode().partition(":")
        except Exception:
            return False
        return user == USER and password == PASSWORD

    def pick_fault(self):
        with LOCK:
            for fault in FAULTS:
                if fault["method"] not in ("*", self.command):
                    continue
                listing_action = fault.get("action") in LISTING_ACTIONS
                if not listing_action and fault["path"] not in ("*", "") and fault["path"] not in unquote(self.path):
                    continue
                fault["seen"] = fault.get("seen", 0) + 1
                if fault["seen"] <= fault.get("after", 0):
                    continue
                used = fault.get("used", 0)
                if fault.get("count") is not None and used >= fault["count"]:
                    continue
                fault["used"] = used + 1
                return dict(fault)
        return None

    # --- dispatch -------------------------------------------------------------------------------

    def handle_any(self):
        if self.path.startswith("/_admin"):
            return self.admin()
        if self.path.startswith("/_portal"):
            self.body()
            if self.command != "GET":
                return self.send(405, fault="portal")
            page = b"<!doctype html><html><body><form>Sign in</form></body></html>"
            return self.send(200, page, {"Content-Type": "text/html"}, "portal")
        fault = self.pick_fault()
        label = fault["action"] if fault else ""
        if fault and fault["action"] == "reset":
            with LOCK:
                SEQ["n"] += 1
                LOG.append({"n": SEQ["n"], "method": self.command, "path": self.path, "status": 0, "fault": "reset"})
            self.close_connection = True
            self.connection.close()
            return
        if fault and fault["action"] == "latency":
            time.sleep(fault.get("ms", 1000) / 1000)
            fault = None
        if not self.authed():
            return self.send(401, headers={"WWW-Authenticate": 'Basic realm="bench"'}, fault=label)
        if fault and fault["action"] == "status":
            headers = {str(k): str(v) for k, v in (fault.get("headers") or {}).items()}
            return self.send(int(fault["status"]), headers=headers, fault=label)
        handler = getattr(self, "_" + self.command, None)
        return handler(fault) if handler else self.send(405)

    do_GET = do_PUT = do_PROPFIND = do_MKCOL = do_MOVE = do_DELETE = do_HEAD = do_OPTIONS = do_POST = (
        lambda self: self.handle_any()
    )

    # --- WebDAV ---------------------------------------------------------------------------------

    def _GET(self, fault):
        full = local(self.path)
        if not os.path.isfile(full):
            return self.send(404)
        data = open(full, "rb").read()
        action = fault and fault["action"]
        if action == "empty":
            return self.send(200, b"", {"ETag": f'"{etag_of(full)}"'}, "empty")
        if action == "swap":
            other = os.path.join(DATA_DIR, fault["other"]) if fault.get("other") else None
            if other and os.path.isfile(other):
                data = open(other, "rb").read()
            return self.send(200, data, {"ETag": f'"{etag_of(full)}"'}, "swap")
        if action == "truncate":
            self.send_response(200)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data[: len(data) // 2])
            self.wfile.flush()
            self.close_connection = True
            with LOCK:
                SEQ["n"] += 1
                LOG.append({"n": SEQ["n"], "method": "GET", "path": self.path, "status": 200, "fault": "truncate"})
            self.connection.close()
            return
        return self.send(200, data, {"ETag": f'"{etag_of(full)}"', "Content-Type": "application/octet-stream"})

    def _PUT(self, fault):
        data = self.body()
        action = fault and fault["action"]
        if action == "truncate":
            data = data[: len(data) // 2]
        elif action == "empty":
            data = b""
        full = local(self.path)
        if not os.path.isdir(os.path.dirname(full)):
            return self.send(409, fault=action or "")
        existed = os.path.exists(full)
        tmp = full + ".tmp-upload"
        open(tmp, "wb").write(data)
        os.replace(tmp, full)
        return self.send(204 if existed else 201, fault=action or "")

    def _MKCOL(self, fault):
        full = local(self.path)
        if os.path.exists(full):
            return self.send(405)
        os.makedirs(full, exist_ok=True)
        return self.send(201)

    def _DELETE(self, fault):
        full = local(self.path)
        if not os.path.exists(full):
            return self.send(404)
        shutil.rmtree(full) if os.path.isdir(full) else os.remove(full)
        return self.send(204)

    def _MOVE(self, fault):
        src = local(self.path)
        dest = local(self.headers.get("Destination", ""))
        if not os.path.isfile(src):
            return self.send(404)
        existed = os.path.exists(dest)
        if existed and self.headers.get("Overwrite", "T").upper() == "F":
            return self.send(412)
        os.replace(src, dest)
        return self.send(204 if existed else 201)

    def _PROPFIND(self, fault):
        full = local(self.path)
        self.body()
        if os.path.isfile(full):
            # Depth 0 on one file, which the app asks after every upload to check the server holds it (confirmHolds).
            from urllib.parse import quote

            st = os.stat(full)
            xml = (
                '<?xml version="1.0" encoding="utf-8"?><d:multistatus xmlns:d="DAV:">'
                f"<d:response><d:href>{escape(quote(self.path))}</d:href><d:propstat><d:prop><d:resourcetype/>"
                f"<d:getlastmodified>{formatdate(st.st_mtime, usegmt=True)}</d:getlastmodified>"
                f"<d:getcontentlength>{st.st_size}</d:getcontentlength>"
                f'<d:getetag>"{etag_of(full)}"</d:getetag>'
                "</d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response></d:multistatus>"
            )
            return self.send(207, xml.encode(), {"Content-Type": "application/xml; charset=utf-8"}, "")
        if not os.path.isdir(full):
            return self.send(404)
        action = fault and fault["action"]
        if action == "emptymultistatus":
            empty = b'<?xml version="1.0" encoding="utf-8"?><d:multistatus xmlns:d="DAV:"/>'
            return self.send(207, empty, {"Content-Type": "application/xml; charset=utf-8"}, action)
        with LOCK:
            LISTINGS["n"] += 1
            listing_no = LISTINGS["n"]
        shift = (fault.get("ms", 0) / 1000) if action == "dateshift" else 0
        rows = []
        names = sorted(os.listdir(full))
        extra = ["Tablette de Léa.batb", "UPPER Case.batb", "dossier é"] if action == "weirdnames" else []
        for name in names:
            if name.endswith(".tmp-upload"):
                continue
            if action == "hide" and fault.get("name") and fault["name"] in name:
                continue
            p = os.path.join(full, name)
            st = os.stat(p)
            is_dir = os.path.isdir(p)
            rows.append((name + ("/" if is_dir else ""), st.st_mtime + shift, 0 if is_dir else st.st_size,
                         etag_of(p) if not is_dir else "", is_dir))
        for name in extra:
            rows.append((name, time.time() + shift, 3, "weird" + hashlib.md5(name.encode()).hexdigest()[:8], False))
        if action == "ghost":
            name = fault.get("name") or "bati-6f6f6f6f-0000-4000-8000-000000000000.batb"
            rows.append((name, time.time(), 4096, "ghost" + hashlib.md5(name.encode()).hexdigest()[:8], False))
        if action == "fixedetag":
            rows = [(n, m, s, fault.get("etag", "fixed") if t else t, d) for n, m, s, t, d in rows]
        if action == "rotateetag":
            rows = [(n, m, s, f"{t}-{listing_no}" if t else t, d) for n, m, s, t, d in rows]
        base = self.path if self.path.endswith("/") else self.path + "/"
        xml = ['<?xml version="1.0" encoding="utf-8"?><d:multistatus xmlns:d="DAV:">']
        xml.append(
            f'<d:response><d:href>{escape(base)}</d:href><d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype>'
            f"</d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>"
        )
        from urllib.parse import quote

        for name, mtime, size, tag, is_dir in rows:
            href = base + quote(name)
            kind = "<d:resourcetype><d:collection/></d:resourcetype>" if is_dir else "<d:resourcetype/>"
            xml.append(
                f"<d:response><d:href>{escape(href)}</d:href><d:propstat><d:prop>{kind}"
                f"<d:getlastmodified>{formatdate(mtime, usegmt=True)}</d:getlastmodified>"
                f"<d:getcontentlength>{size}</d:getcontentlength>"
                + (f'<d:getetag>"{tag}"</d:getetag>' if tag else "")
                + "</d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>"
            )
        xml.append("</d:multistatus>")
        return self.send(207, "".join(xml).encode(), {"Content-Type": "application/xml; charset=utf-8"}, action or "")

    def _HEAD(self, fault):
        return self.send(200 if os.path.exists(local(self.path)) else 404)

    def _OPTIONS(self, fault):
        return self.send(200, headers={"DAV": "1", "Allow": "OPTIONS,GET,PUT,DELETE,MKCOL,MOVE,PROPFIND"})

    def _POST(self, fault):
        return self.send(405)

    # --- admin ----------------------------------------------------------------------------------

    def admin(self):
        path = self.path.split("?")[0]
        data = self.body()
        if path == "/_admin/fault" and self.command == "POST":
            fault = json.loads(data)
            fault.setdefault("method", "*")
            fault.setdefault("path", "*")
            fault.setdefault("count", None)
            with LOCK:
                FAULTS.append(fault)
            return self.json({"faults": len(FAULTS)})
        if path == "/_admin/faults" and self.command == "DELETE":
            with LOCK:
                FAULTS.clear()
            return self.json({"faults": 0})
        if path == "/_admin/reset" and self.command == "POST":
            with LOCK:
                FAULTS.clear()
                LOG.clear()
            for entry in os.listdir(DATA_DIR):
                p = os.path.join(DATA_DIR, entry)
                shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
            return self.json({"ok": True})
        if path == "/_admin/log":
            with LOCK:
                return self.json(list(LOG))
        if path == "/_admin/files":
            out = {}
            for root, _dirs, files in os.walk(DATA_DIR):
                for f in files:
                    p = os.path.join(root, f)
                    out[os.path.relpath(p, DATA_DIR)] = os.path.getsize(p)
            return self.json(out)
        if path.startswith("/_admin/file/") and self.command == "PUT":
            target = os.path.join(DATA_DIR, unquote(path[len("/_admin/file/"):]))
            os.makedirs(os.path.dirname(target), exist_ok=True)
            open(target, "wb").write(data)
            return self.json({"size": len(data)})
        if path == "/_admin/mtime" and self.command == "POST":
            req = json.loads(data)
            # A bare file name (what the tests have) is looked for under DATA_DIR, where the app's folder is.
            wanted = os.path.basename(req["name"])
            found = [os.path.join(r, f) for r, _d, fs in os.walk(DATA_DIR) for f in fs if f == wanted]
            if not found:
                return self.send(404)
            for path_ in found:
                os.utime(path_, (req["epoch"], req["epoch"]))
            return self.json({"ok": True})
        return self.send(404)

    def json(self, obj):
        raw = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


if __name__ == "__main__":
    os.makedirs(DATA_DIR, exist_ok=True)
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
