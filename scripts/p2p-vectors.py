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


B64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"


def grouped(text: str) -> str:
    # Each group of 4 is followed by a check character, so a typo names its group (SPEC.md section 2).
    groups = [text[i : i + 4] for i in range(0, len(text), 4)]
    return " ".join(g + B64URL[hashlib.sha256(bytes([n]) + g.encode()).digest()[0] % 64] for n, g in enumerate(groups))


def frame(kind: int, body: bytes) -> bytes:
    # len counts the type byte and the body.
    return struct.pack(">I", 1 + len(body)) + bytes([kind]) + body


def pattern(size: int) -> bytes:
    return bytes((i * 31 + 7) % 251 for i in range(size))


def typo(shown: str, group: int) -> str:
    # One character of the group changed: its check character no longer matches.
    parts = shown.split(" ")
    g = parts[group]
    parts[group] = ("B" if g[0] == "A" else "A") + g[1:]
    return " ".join(parts)



# BIP-340 Schnorr, the reference implementation's arithmetic, for the meeting note's signature.
P_FIELD = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
N_ORDER = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
G_POINT = (
    0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798,
    0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8,
)


def point_add(a, b):
    if a is None:
        return b
    if b is None:
        return a
    if a[0] == b[0] and a[1] != b[1]:
        return None
    if a == b:
        lam = (3 * a[0] * a[0] * pow(2 * a[1], P_FIELD - 2, P_FIELD)) % P_FIELD
    else:
        lam = ((b[1] - a[1]) * pow(b[0] - a[0], P_FIELD - 2, P_FIELD)) % P_FIELD
    x = (lam * lam - a[0] - b[0]) % P_FIELD
    return (x, (lam * (a[0] - x) - a[1]) % P_FIELD)


def point_mul(point, k):
    result = None
    for i in range(256):
        if (k >> i) & 1:
            result = point_add(result, point)
        point = point_add(point, point)
    return result


def tagged(tag: str, msg: bytes) -> bytes:
    t = hashlib.sha256(tag.encode()).digest()
    return hashlib.sha256(t + t + msg).digest()


def schnorr_pub(sk: bytes) -> bytes:
    return point_mul(G_POINT, int.from_bytes(sk, "big"))[0].to_bytes(32, "big")


def schnorr_sign(msg: bytes, sk: bytes, aux: bytes) -> bytes:
    d0 = int.from_bytes(sk, "big")
    pub = point_mul(G_POINT, d0)
    d = d0 if pub[1] % 2 == 0 else N_ORDER - d0
    t = bytes(x ^ y for x, y in zip(d.to_bytes(32, "big"), tagged("BIP0340/aux", aux)))
    k0 = int.from_bytes(tagged("BIP0340/nonce", t + pub[0].to_bytes(32, "big") + msg), "big") % N_ORDER
    r = point_mul(G_POINT, k0)
    k = k0 if r[1] % 2 == 0 else N_ORDER - k0
    rx = r[0].to_bytes(32, "big")
    e = int.from_bytes(tagged("BIP0340/challenge", rx + pub[0].to_bytes(32, "big") + msg), "big") % N_ORDER
    return rx + ((k + e * d) % N_ORDER).to_bytes(32, "big")


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
            "case": "the text fallback: groups of 4 plus a check character; the field strips whitespace only, since '-' is base64url",
            "shown": grouped(b64url(good)),
            "typed": grouped(b64url(good)).replace(" ", "\n", 2),
            "text": b64url(good),
            "typo": {"group": 3, "typed": typo(grouped(b64url(good)), 3)},
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
    install_b = bytes.fromhex("fedcba9876543210fedcba9876543210")
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
            {"type": "pair", "hex": frame(8, token + r_b + install_b).hex(), "token": token.hex(), "random": r_b.hex(), "installId": "fedcba98-7654-3210-fedc-ba9876543210"},
            {"type": "linked", "hex": frame(9, r_a).hex(), "random": r_a.hex()},
        ],
        "refused": [
            {"case": "frame over 256 KiB", "hex": struct.pack(">I", 256 * 1024 + 1).hex() + "04"},
            {"case": "unknown type", "hex": frame(99, b"").hex()},
            {"case": "zero length", "hex": struct.pack(">I", 0).hex()},
            {"case": "pair with a short body", "hex": frame(8, token).hex()},
        ],
    }

    offer_key = hkdf(link, b"", b"bati/p2p/offer/v1")
    plain = bytearray(256)
    plain[0] = 1
    plain[1:5] = struct.pack(">I", 1_794_052_920)
    plain[5:7] = struct.pack(">H", 47_000)
    plain[7] = 2
    plain[8:13] = bytes([4, 192, 168, 1, 23])
    plain[13:30] = bytes([6]) + bytes.fromhex("2a0104a0000000001c2d3e4f5a6b7c8d")
    event_sk = hashlib.sha256(b"meeting key").digest()
    pubkey = schnorr_pub(event_sk).hex()
    created = 1_794_052_800
    tag = hmac.new(link, b"bati/p2p/rdv" + struct.pack(">Q", 498_348), hashlib.sha256).digest()[:16].hex()
    content = "c2VhbGVkIGJ5IGJhdGktY3J5cHRv"
    serial = json.dumps([0, pubkey, created, 21059, [["x", tag]], content], separators=(",", ":"), ensure_ascii=False)
    event_id = hashlib.sha256(serial.encode()).digest()
    meeting = {
        "note": NOTE,
        "linkBytes": link.hex(),
        "tags": [
            {"hour": h, "tag": hmac.new(link, b"bati/p2p/rdv" + struct.pack(">Q", h), hashlib.sha256).digest()[:16].hex()}
            for h in hours
        ],
        "sealBytes": offer_key.hex(),
        "offer": {"expiresAt": 1_794_052_920, "port": 47_000, "addresses": ["192.168.1.23", "2a01:4a0::1c2d:3e4f:5a6b:7c8d"]},
        "plain": bytes(plain).hex(),
        "event": {
            "signerSeed": event_sk.hex(),
            "aux": "00" * 32,
            "pubkey": pubkey,
            "created_at": created,
            "kind": 21059,
            "tags": [["x", tag]],
            "content": content,
            "id": event_id.hex(),
            "sig": schnorr_sign(event_id, event_sk, bytes(32)).hex(),
        },
    }

    for filename, data in (("code-v1.json", codes), ("names-v1.json", names), ("frames-v1.json", frames), ("meeting-v1.json", meeting)):
        (OUT / filename).write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
