#!/usr/bin/env python3
"""GPT Image 2 behind a budget (tracks amendment v4.4): reserve, call, settle, record.

    openai_loop.py budget      spent and left, never the key
    openai_loop.py selfcheck   the refusals, offline, against a temp ledger

From Python: `edit(out, prompt, images, size, quality, session)` and `generate(out, prompt, size,
quality, session)`. Nothing is sent but to api.openai.com, with model `gpt-image-2` and no other.

Sources (official, read 2026-11-05):
- Pricing, per 1M tokens, Standard: image input 8.00, image output 30.00, text input 5.00
  (cached 2.00 / 1.25; Batch half of that; cached rates only through the Responses API).
  https://developers.openai.com/api/docs/pricing
- Parameters of /v1/images/edits: images 1-16, prompt, model, size (auto, 1024x1024, 1536x1024,
  1024x1536 or custom WxH: edges divisible by 16, ratio between 1:3 and 3:1, max 3840x2160, above
  2560x1440 experimental), quality low|medium|high|auto, output_format, no input_fidelity for this
  model; response `data[].b64_json` and `usage` {input_tokens, input_tokens_details{image_tokens,
  text_tokens}, output_tokens}. https://developers.openai.com/api/reference/resources/images/methods/edit
- Image input tokens ARE counted and billed at the image input rate (they are in input_tokens_details).
- Model page: https://developers.openai.com/api/docs/models/gpt-image-2

Not confirmed by any page: tokens per image by size and quality. The reservations below are
pessimistic guesses, settled on the real `usage`; a response without `usage` settles at the whole
reservation (charged unknown, the safe side).

The ledger sits beside iso_loop's (outside the repo, in the art-loop work dir), with its own lock.
The key is read in code only and scrubbed from every error text.
"""

import base64
import contextlib
import fcntl
import hashlib
import json
import math
import os
import pathlib
import sys
import tempfile
import time
import urllib.error
import urllib.request
import uuid

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import isolib as L  # noqa: E402

sys.path.insert(0, str(L.ROOT / "scripts"))
from lib import flux  # noqa: E402

MODEL = "gpt-image-2"
HOST = "https://api.openai.com"
KEY_FILE = pathlib.Path.home() / ".config" / "bati" / "openai.env"
VALIDATIONS = L.ROOT / "docs" / "designs" / "village-iso-v1" / "VALIDATIONS.md"
BUDGET = L.WORK / "openai_budget.json"
DEFAULT_TOTAL = 20.0
SESSION_CAP = 5.0
BATCH_CAP = 3.0
PRICE = {"image_in": 8.0, "text_in": 5.0, "image_out": 30.0}  # $ per 1M tokens
QUALITIES = ("low", "medium", "high")
# Pessimistic $ per image at 1 MP output (guess, see the header); scaled by pixels, plus per input image.
RESERVE_1MP = {"low": 0.08, "medium": 0.20, "high": 0.60}
RESERVE_PER_INPUT = 0.03


def _key() -> str:
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key and KEY_FILE.is_file():
        for line in KEY_FILE.read_text(encoding="utf-8").splitlines():
            name, _, value = line.strip().removeprefix("export ").partition("=")
            if name.strip() == "OPENAI_API_KEY":
                key = value.strip().strip("'\"")
    if not key:
        sys.exit("no OPENAI_API_KEY in the environment or ~/.config/bati/openai.env")
    return key


def _scrub(text: str) -> str:
    key = os.environ.get("OPENAI_API_KEY", "")
    with contextlib.suppress(OSError, SystemExit):
        key = key or _key()
    return text.replace(key, "[key]") if key else text


# --- budget ----------------------------------------------------------------------------------


def total_cap() -> float:
    """The last `BUDGET_OPENAI_V1: <number>` line under `## Lignes` of VALIDATIONS.md, else 20."""
    text = VALIDATIONS.read_text(encoding="utf-8") if VALIDATIONS.is_file() else ""
    _, found, lines = text.partition("\n## Lignes")
    value = DEFAULT_TOTAL
    for line in lines.splitlines() if found else []:
        if "BUDGET_OPENAI_V1:" in line:
            try:
                value = float(line.split("BUDGET_OPENAI_V1:", 1)[1].strip().replace(",", "."))
            except ValueError:
                sys.exit(f"{VALIDATIONS.name}: {line.strip()!r} is not a number")
    if not math.isfinite(value) or value <= 0:
        sys.exit(f"BUDGET_OPENAI_V1 is {value}: a finite ceiling above 0 is required")
    return value


def ledger() -> dict:
    if BUDGET.is_file():
        return json.loads(BUDGET.read_text(encoding="utf-8"))
    return {"real": 0.0, "reserved": 0.0, "sessions": {}, "calls": []}


def _save(data: dict) -> None:
    BUDGET.parent.mkdir(parents=True, exist_ok=True)
    tmp = BUDGET.with_name(BUDGET.name + ".tmp")
    tmp.write_text(json.dumps(data, indent=2) + "\n")
    os.replace(tmp, BUDGET)


@contextlib.contextmanager
def locked():
    BUDGET.parent.mkdir(parents=True, exist_ok=True)
    with open(BUDGET.with_name("openai_budget.lock"), "w") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        yield


def _sess(data: dict, session: str) -> dict:
    return data["sessions"].setdefault(session, {"real": 0.0, "reserved": 0.0})


def estimate(size: str, quality: str, n_inputs: int) -> float:
    w, h = (1024, 1024) if size == "auto" else map(int, size.split("x"))
    return math.ceil((RESERVE_1MP[quality] * max(1.0, w * h / 1048576) + RESERVE_PER_INPUT * n_inputs) * 100) / 100


def reserve(amount: float, session: str, model: str = MODEL) -> float:
    if model != MODEL:
        sys.exit(f"refused: model {model!r}, only {MODEL!r}")
    session = session.strip().lower()
    if not session:
        sys.exit("refused: a session id is required")
    if amount > BATCH_CAP:
        sys.exit(f"refused: batch reserves {amount:.2f} $ > {BATCH_CAP:.2f} $, Guillaume decides")
    limit = total_cap()
    with locked():
        data = ledger()
        s = _sess(data, session)
        if data["real"] + data["reserved"] + amount > limit:
            sys.exit(f"hard stop: {data['real']:.2f} spent + {data['reserved']:.2f} reserved + {amount:.2f} > {limit:g} $")
        if s["real"] + s["reserved"] + amount > SESSION_CAP:
            sys.exit(f"session stop: {session} {s['real']:.2f} + {s['reserved']:.2f} + {amount:.2f} > {SESSION_CAP:g} $")
        data["reserved"] = round(data["reserved"] + amount, 4)
        s["reserved"] = round(s["reserved"] + amount, 4)
        _save(data)
    return amount


def price(usage: dict) -> float:
    det = usage.get("input_tokens_details") or {}
    img_in = int(det.get("image_tokens") or 0)
    txt_in = int(det.get("text_tokens") or max(0, int(usage.get("input_tokens") or 0) - img_in))
    out = int(usage.get("output_tokens") or 0)
    return math.ceil((img_in * PRICE["image_in"] + txt_in * PRICE["text_in"] + out * PRICE["image_out"]) / 1e6 * 1e4) / 1e4


def settle(amount: float, session: str, cost: float, entry: dict) -> None:
    with locked():
        data = ledger()
        s = _sess(data, session)
        data["reserved"] = round(max(0.0, data["reserved"] - amount), 4)
        s["reserved"] = round(max(0.0, s["reserved"] - amount), 4)
        data["real"] = round(data["real"] + cost, 4)
        s["real"] = round(s["real"] + cost, 4)
        data["calls"].append({**entry, "session": session, "reserved": amount, "cost": cost, "at": time.strftime("%Y-%m-%d %H:%M")})
        _save(data)


def budget() -> None:
    data, limit = ledger(), total_cap()
    print(f"spent {data['real']:.2f} $ of {limit:g} $, reserved {data['reserved']:.2f} $, left {limit - data['real'] - data['reserved']:.2f} $")
    for name, s in sorted(data["sessions"].items()):
        print(f"  session {name}: spent {s['real']:.2f} $, reserved {s['reserved']:.2f} $, left {SESSION_CAP - s['real'] - s['reserved']:.2f} $")


# --- calls -----------------------------------------------------------------------------------


def _post(path: str, body: bytes, content_type: str) -> dict:
    assert HOST.startswith("https://api.openai.com")
    request = urllib.request.Request(HOST + path, data=body, method="POST",
                                     headers={"Authorization": "Bearer " + _key(), "Content-Type": content_type})
    try:
        with urllib.request.urlopen(request, timeout=600) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"OpenAI HTTP {error.code}: {_scrub(error.read().decode('utf-8', 'replace'))[:500]}") from None
    except Exception as error:  # never let the request (headers) into the message
        raise RuntimeError(f"OpenAI call failed: {_scrub(type(error).__name__ + ': ' + str(error))[:300]}") from None


def _multipart(fields: dict, files: list) -> tuple[bytes, str]:
    boundary = uuid.uuid4().hex
    parts = []
    for name, value in fields.items():
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    for path in files:
        parts.append((f'--{boundary}\r\nContent-Disposition: form-data; name="image[]"; filename="{path.name}"\r\n'
                      "Content-Type: image/png\r\n\r\n").encode() + path.read_bytes() + b"\r\n")
    parts.append(f"--{boundary}--\r\n".encode())
    return b"".join(parts), f"multipart/form-data; boundary={boundary}"


def _run(out, prompt, images, size, quality, session) -> dict:
    out = pathlib.Path(out)
    images = [pathlib.Path(i) for i in images]
    model = MODEL
    assert model == "gpt-image-2"
    session = session.strip().lower()
    _key()  # before reserve: a missing key must not burn a reservation
    if quality not in QUALITIES:
        sys.exit(f"refused: quality {quality!r}, one of {QUALITIES}")
    if size != "auto":
        w, h = map(int, size.split("x"))  # ValueError on a malformed size, before any spend
        if w < 16 or h < 16 or w % 16 or h % 16 or max(w, h) > 3840 or not 1 / 3 <= w / h <= 3 or w * h > 3840 * 2160:
            sys.exit(f"refused: size {size} (edges divisible by 16, ratio 1:3 to 3:1, max 3840x2160)")
    if out.exists():
        sys.exit(f"refused: {out} exists, never overwritten")
    if "thronebreaker" in prompt.lower() or any("thronebreaker" in str(i).lower() for i in images):
        sys.exit("refused: no Thronebreaker image or word")
    for i in images:
        if not i.is_file():
            sys.exit(f"refused: input {i} is missing")
    amount = reserve(estimate(size, quality, len(images)), session, model)
    cost, entry, response = amount, {"model": model, "size": size, "quality": quality, "out": str(out)}, None
    try:
        fields = {"model": model, "prompt": prompt, "size": size, "quality": quality, "n": 1}
        if images:
            body, ctype = _multipart(fields, images)
            response = _post("/v1/images/edits", body, ctype)
        else:
            response = _post("/v1/images/generations", json.dumps(fields).encode(), "application/json")
        usage = response.get("usage")
        if usage:
            cost = price(usage)
        else:
            entry["note"] = "no usage in the response, settled at the reservation"
        entry["usage"] = usage
        # The paid bytes reach the disk first, whatever the checks below say.
        out.parent.mkdir(parents=True, exist_ok=True)
        part = out.with_name(f".{out.name}.part")
        part.write_bytes(base64.b64decode(response["data"][0]["b64_json"]))
        if response.get("model", model) != MODEL:
            quarantine = out.with_name(out.name + ".WRONG-MODEL.quarantine")
            os.replace(part, quarantine)
            sys.exit(f"refused: response model {response.get('model')!r}, bytes kept in {quarantine}")
        os.link(part, out)  # fails if out exists: never overwrites
        part.unlink()
    except Exception as error:  # a failed call settles what was charged (usage if any, else the reservation)
        entry["error"] = _scrub(f"{type(error).__name__}: {error}")[:300]
        raise
    finally:
        settle(amount, session, cost, entry)
    rel = str(out.resolve().relative_to(L.ROOT)) if out.resolve().is_relative_to(L.ROOT) else str(out.resolve())
    flux.record(rel, {
        "model": MODEL, "provider": "OpenAI Images API", "prompt": prompt, "size": size, "quality": quality,
        "inputs": [{"path": str(i), "sha256": hashlib.sha256(i.read_bytes()).hexdigest()} for i in images],
        "tokens": entry["usage"], "cost": cost, "session": session, "date": time.strftime("%Y-%m-%d"),
    })
    return {"out": str(out), "cost": cost, "usage": entry["usage"]}


def edit(out, prompt, images, size="1024x1024", quality="medium", session="") -> dict:
    if not images:
        sys.exit("refused: edit needs at least one image (1 to 16)")
    if len(images) > 16:
        sys.exit("refused: at most 16 input images")
    return _run(out, prompt, images, size, quality, session)


def generate(out, prompt, size="1024x1024", quality="medium", session="") -> dict:
    return _run(out, prompt, [], size, quality, session)


# --- self-check ------------------------------------------------------------------------------


def _refuses(fn) -> str:
    try:
        fn()
    except SystemExit as stop:
        return str(stop)
    raise AssertionError("expected a refusal")


def selfcheck() -> None:
    global BUDGET, VALIDATIONS
    saved = BUDGET, VALIDATIONS
    with tempfile.TemporaryDirectory() as tmp:
        BUDGET, VALIDATIONS = pathlib.Path(tmp) / "b.json", pathlib.Path(tmp) / "none.md"
        try:
            assert "model" in _refuses(lambda: reserve(0.1, "s", "gpt-image-1.5"))
            assert "batch" in _refuses(lambda: reserve(3.01, "s"))
            assert "session id" in _refuses(lambda: reserve(0.1, " "))
            reserve(2.9, "a")
            reserve(2.0, "a")  # 4.9 in session a
            assert "session stop" in _refuses(lambda: reserve(0.2, "a"))
            for name in "bcd":  # 4.9 + 2.9 x3 = 13.6
                reserve(2.9, name)
            reserve(2.9, "e")
            reserve(2.9, "f")  # 19.4 reserved
            assert "hard stop" in _refuses(lambda: reserve(2.9, "g"))
            settle(2.9, "b", 0.1234, {})
            data = ledger()
            assert data["real"] == 0.1234 and abs(data["reserved"] - 16.5) < 1e-6, data
            VALIDATIONS.write_text("## x\n\n## Lignes\n2026-11-05 BUDGET_OPENAI_V1: 40\n")
            assert total_cap() == 40.0
            assert price({"input_tokens": 1000, "input_tokens_details": {"image_tokens": 600, "text_tokens": 400},
                          "output_tokens": 1000}) == 0.0368  # 4.8 + 2.0 + 30 per thousand-token millionths
            assert "exists" in _refuses(lambda: _run(VALIDATIONS, "p", [], "1024x1024", "low", "z"))
            assert "size" in _refuses(lambda: _run(pathlib.Path(tmp) / "o.png", "p", [], "1000x1000", "low", "z"))
            assert "size" in _refuses(lambda: _run(pathlib.Path(tmp) / "o.png", "p", [], "-16x-16", "low", "z"))
            n = len(ledger()["calls"]), ledger()["reserved"]
            saved_env = os.environ.pop("OPENAI_API_KEY", None)
            global KEY_FILE
            old_kf, KEY_FILE = KEY_FILE, pathlib.Path(tmp) / "nokey.env"
            try:
                assert "OPENAI_API_KEY" in _refuses(lambda: _run(pathlib.Path(tmp) / "o.png", "p", [], "1024x1024", "low", "z"))
            finally:
                KEY_FILE = old_kf
                if saved_env:
                    os.environ["OPENAI_API_KEY"] = saved_env
            assert (len(ledger()["calls"]), ledger()["reserved"]) == n, "missing key touched the ledger"
            reserve(0.1, "Case")
            reserve(0.1, " case ")
            assert list(ledger()["sessions"]).count("case") == 1 and "Case" not in ledger()["sessions"]
            # wrong model keeps the paid bytes in quarantine
            real_post, real_key = _post, os.environ.get("OPENAI_API_KEY")
            os.environ["OPENAI_API_KEY"] = "sk-test"
            globals()["_post"] = lambda *a: {"model": "gpt-image-1", "data": [{"b64_json": base64.b64encode(b"png").decode()}]}
            try:
                target = pathlib.Path(tmp) / "w.png"
                assert "response model" in _refuses(lambda: _run(target, "p", [], "1024x1024", "low", "q"))
                assert (target.parent / "w.png.WRONG-MODEL.quarantine").read_bytes() == b"png" and not target.exists()
            finally:
                globals()["_post"] = real_post
                os.environ.pop("OPENAI_API_KEY") if real_key is None else os.environ.__setitem__("OPENAI_API_KEY", real_key)
        finally:
            BUDGET, VALIDATIONS = saved
    print("selfcheck ok")


if __name__ == "__main__":
    {"budget": budget, "selfcheck": selfcheck}.get(sys.argv[1] if len(sys.argv) > 1 else "", lambda: sys.exit(__doc__))()
