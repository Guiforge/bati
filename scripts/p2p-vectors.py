#!/usr/bin/env python3
"""Writes the frozen vectors of device-to-device sync, v1: __tests__/fixtures/p2p/*.json.

Independent of the app's code on purpose: Python's standard library only, written from
docs/designs/p2p-sync/SPEC.md section 2, so the JS and the Kotlin readers are checked against
something neither of them produced. Run once. A change of format is a new version and new files,
never a rerun over these.
"""

import base64
import hashlib
import hmac
import json
import struct
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "__tests__" / "fixtures" / "p2p"
NOTE = "Frozen. Written once by scripts/p2p-vectors.py, never regenerated: a change of format is a new version. See docs/designs/p2p-sync/SPEC.md section 2."
BLOCK = 128 * 1024


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def hkdf(ikm: bytes, salt: bytes, info: bytes, length: int = 32) -> bytes:
    prk = hmac.new(salt, ikm, hashlib.sha256).digest()
    out, block, counter = b"", b"", 1
    while len(out) < length:
        block = hmac.new(prk, block + info + bytes([counter]), hashlib.sha256).digest()
        out += block
        counter += 1
    return out[:length]


def lan_route(port: int, addresses: list[tuple[int, bytes]]) -> bytes:
    data = struct.pack(">H", port) + b"".join(bytes([family]) + raw for family, raw in addresses)
    return bytes([1, len(data)]) + data


def code(expires_at: int, token: bytes, install_id: bytes, device_id: bytes, name: str, routes: list[bytes], version: int = 1) -> bytes:
    encoded = name.encode("utf-8")
    return (
        bytes([version])
        + struct.pack(">I", expires_at)
        + token
        + install_id
        + device_id
        + bytes([len(encoded)])
        + encoded
        + bytes([len(routes)])
        + b"".join(routes)
    )


def frame(kind: int, body: bytes) -> bytes:
    # len counts the type byte and the body.
    return struct.pack(">I", 1 + len(body)) + bytes([kind]) + body


def pattern(size: int) -> bytes:
    return bytes((i * 31 + 7) % 251 for i in range(size))


def main() -> None:
    if OUT.exists() and any(OUT.iterdir()) and "--force" not in sys.argv:
        sys.exit(f"{OUT} already holds frozen vectors; a new format is a new version")
    OUT.mkdir(parents=True, exist_ok=True)

    token = bytes(range(32))
    install_id = bytes.fromhex("0123456789abcdef0123456789abcdef")
    device_id = hashlib.sha256(b"device A certificate").digest()
    ipv4 = (4, bytes([192, 168, 1, 23]))
    ipv6 = (6, bytes.fromhex("fe800000000000001c2d3e4f5a6b7c8d"))
    expires_at = 1_794_052_800
    lan = lan_route(41237, [ipv4, ipv6])

    good = code(expires_at, token, install_id, device_id, "Pixel de Guillaume", [lan])
    unknown_route = bytes([9, 3, 1, 2, 3])
    codes = {
        "note": NOTE,
        "now": expires_at - 300,
        "valid": [
            {
                "case": "one LAN route, IPv4 and IPv6",
                "text": b64url(good),
                "hex": good.hex(),
                "expiresAt": expires_at,
                "token": token.hex(),
                "installId": "01234567-89ab-cdef-0123-456789abcdef",
                "deviceId": device_id.hex(),
                "name": "Pixel de Guillaume",
                "lan": {"port": 41237, "addresses": ["192.168.1.23", "fe80::1c2d:3e4f:5a6b:7c8d"]},
            },
            {
                "case": "an unknown route next to the LAN one is skipped",
                "text": b64url(code(expires_at, token, install_id, device_id, "Tab", [unknown_route, lan])),
                "expiresAt": expires_at,
                "token": token.hex(),
                "installId": "01234567-89ab-cdef-0123-456789abcdef",
                "deviceId": device_id.hex(),
                "name": "Tab",
                "lan": {"port": 41237, "addresses": ["192.168.1.23", "fe80::1c2d:3e4f:5a6b:7c8d"]},
            },
        ],
        "grouped": {
            "case": "the text fallback in groups of 4; the field strips whitespace only, since '-' is base64url",
            "typed": " ".join(b64url(good)[i : i + 4] for i in range(0, len(b64url(good)), 4)).replace(" ", "\n", 2),
            "text": b64url(good),
        },
        "refused": [
            {"case": "expired", "reason": "expired", "now": expires_at + 1, "text": b64url(good)},
            {"case": "unknown version", "reason": "version", "text": b64url(code(expires_at, token, install_id, device_id, "A", [lan], version=2))},
            {"case": "no route this build knows", "reason": "version", "text": b64url(code(expires_at, token, install_id, device_id, "A", [unknown_route]))},
            {"case": "name over 32 bytes", "reason": "malformed", "text": b64url(code(expires_at, token, install_id, device_id, "é" * 17, [lan]))},
            {"case": "truncated", "reason": "malformed", "text": b64url(good[:-3])},
            {"case": "trailing bytes", "reason": "malformed", "text": b64url(good + b"\x00")},
            {"case": "not base64url", "reason": "malformed", "text": "not a code!"},
        ],
    }

    r_a = hashlib.sha256(b"rA").digest()
    r_b = hashlib.sha256(b"rB").digest()
    id_a = device_id
    id_b = hashlib.sha256(b"device B certificate").digest()
    link = hkdf(r_a + r_b, id_a + id_b, b"bati/p2p/link/v1")
    hours = [498_348, 498_349, 498_350]
    names = {
        "note": NOTE,
        "rA": r_a.hex(),
        "rB": r_b.hex(),
        "idA": id_a.hex(),
        "idB": id_b.hex(),
        "derivedLink": link.hex(),
        "nsd": [
            {"hour": h, "name": hmac.new(link, b"bati/p2p/nsd" + struct.pack(">Q", h), hashlib.sha256).digest()[:16].hex()}
            for h in hours
        ],
    }

    file = pattern(300 * 1024)
    blocks = [hashlib.sha256(file[i : i + BLOCK]).digest() for i in range(0, len(file), BLOCK)]
    whole = hashlib.sha256(file).digest()
    instance = bytes.fromhex("00112233445566778899aabbccddeeff")
    file_name = "bati-01234567-89ab-cdef-0123-456789abcdef.batb".encode()
    announce_body = (
        bytes([len(file_name)]) + file_name + struct.pack(">Q", len(file)) + whole + struct.pack(">I", len(blocks)) + b"".join(blocks)
    )
    name_b = "Pixel".encode()
    frames = {
        "note": NOTE,
        "blockBytes": BLOCK,
        "file": {"size": len(file), "pattern": "byte i = (i * 31 + 7) % 251", "sha256": whole.hex(), "blocks": [b.hex() for b in blocks]},
        "frames": [
            {"type": "hello", "hex": frame(1, instance + bytes([len(name_b)]) + name_b).hex(), "instanceId": instance.hex(), "name": "Pixel"},
            {"type": "announce", "hex": frame(2, announce_body).hex(), "name": file_name.decode(), "size": len(file), "sha256": whole.hex(), "blocks": [b.hex() for b in blocks]},
            {"type": "announceEmpty", "hex": frame(2, bytes([0])).hex()},
            {"type": "want", "hex": frame(3, struct.pack(">I", 2) + struct.pack(">II", 0, 2)).hex(), "indexes": [0, 2]},
            {"type": "block", "hex": frame(4, struct.pack(">I", 2) + file[2 * BLOCK : 2 * BLOCK + 16]).hex(), "index": 2, "bytes": file[2 * BLOCK : 2 * BLOCK + 16].hex()},
            {"type": "ack", "hex": frame(5, whole).hex(), "sha256": whole.hex()},
            {"type": "ping", "hex": frame(6, b"").hex()},
            {"type": "bye", "hex": frame(7, bytes([3])).hex(), "reason": 3},
        ],
        "refused": [
            {"case": "frame over 256 KiB", "hex": struct.pack(">I", 256 * 1024 + 1).hex() + "04"},
            {"case": "unknown type", "hex": frame(99, b"").hex()},
            {"case": "zero length", "hex": struct.pack(">I", 0).hex()},
        ],
    }

    for filename, data in (("code-v1.json", codes), ("names-v1.json", names), ("frames-v1.json", frames)):
        (OUT / filename).write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
