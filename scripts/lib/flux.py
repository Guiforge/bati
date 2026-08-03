"""One client for the FLUX image API, shared by every generate-*.py script.

Why this module exists at all: the three original scripts each carried their own copy of the
same `urllib` block, the same retry, the same base64 decode. They had already drifted apart on
timeouts and error handling by the time anyone looked.

Why *this* provider: the art has to be redistributable for the app to enter f-droid.org, and the
FLUX licence is the clearest text on the market about outputs — "We claim no ownership rights in
and to the Outputs... you may use Output for any purpose (including for commercial purposes)"
(§2(d)), plus "Outputs are not considered Derivatives under this License" (§1(a)). That grant runs
to whoever holds the API key. Going through an aggregator breaks it: the aggregator is the account
holder, and its own terms say nothing about passing the grant on. Hence a direct BFL key.

The API is asynchronous, unlike the chat-completions shape the old scripts spoke: POST the prompt,
get a polling URL back, poll until Ready, then download from a signed URL that expires in about ten
minutes. That last detail is why the download happens inline here and not in the caller.
"""

import concurrent.futures
import json
import os
import pathlib
import random
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import zlib

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent

# `-preview` in the path is the vendor's, not ours; override with FLUX_ENDPOINT when it graduates.
ENDPOINT = os.environ.get("FLUX_ENDPOINT", "https://api.bfl.ai/v1/flux-2-pro-preview")
PROVENANCE = ROOT / "scripts" / "provenance.json"

# BFL allows 24 concurrent requests on this endpoint. Sitting at a quarter of the ceiling leaves
# room for whatever else is holding the same key, and the wall-clock difference over a batch of
# fifty is small — each image is a minute of *waiting*, so six in flight already hides almost all
# of it. Raise FLUX_CONCURRENCY if you own the key outright.
CONCURRENCY = int(os.environ.get("FLUX_CONCURRENCY", "6"))

BG = "#0B0F19"  # The app's base surface; any letterboxing pads to this, never to white.

_ledger_lock = threading.Lock()
_print_lock = threading.Lock()


def load_key() -> str:
    """Read BFL_API_KEY from the environment, falling back to .env.

    Parsed by hand rather than with python-dotenv: the sibling scripts are stdlib-only and run
    with a bare `python3`, and one `split("=", 1)` is not worth a dependency and a virtualenv.
    """
    key = os.environ.get("BFL_API_KEY")
    if key:
        return key

    env = ROOT / ".env"
    if env.is_file():
        for line in env.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("#") or "=" not in line:
                continue
            name, _, value = line.partition("=")
            if name.strip() == "BFL_API_KEY":
                return value.strip().strip("\"'")

    sys.exit("BFL_API_KEY is not set (environment or .env). Get one at https://bfl.ai.")


def seed_for(slug: str) -> int:
    """A stable seed per slug, so a prompt edit changes the request and not the dice.

    Derived from the name rather than stored in a table: a table is one more thing to keep in step
    with the slug list, and this cannot fall out of sync with anything.

    FLUX_SEED_SALT re-rolls. Determinism is what makes a prompt edit legible — the same seed, a
    different instruction, so you can see what the edit did — but it also means a single unlucky
    image is stuck: rerunning it reproduces the same bad draw forever. The salt is the escape hatch,
    and the seed actually used is written to the provenance ledger, so the image stays reproducible.

        FLUX_SEED_SALT=1 python3 scripts/generate-exercises.py dip
    """
    return zlib.crc32(slug.encode("utf-8")) + int(os.environ.get("FLUX_SEED_SALT", "0"))


def _json(url: str, key: str, payload: dict | None = None, attempts: int = 6) -> dict:
    """One GET or POST, retrying the failures that are worth retrying.

    429 is the one that matters once several images are in flight at once: the endpoint caps
    concurrent requests, and the answer is to wait rather than to give up on the image. BFL does not
    send Retry-After, so the wait is exponential with jitter — without the jitter a pool of six
    workers that all get throttled would come back in lockstep and throttle each other again.
    """
    for attempt in range(attempts):
        try:
            request = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8") if payload is not None else None,
                headers={"x-key": key, "Content-Type": "application/json"},
                method="POST" if payload is not None else "GET",
            )
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.loads(response.read())
        except urllib.error.HTTPError as error:
            # 429 = too many in flight, 5xx = their side wobbling. Both pass. A 4xx that is not 429
            # is a bad prompt or a bad key, and retrying it just burns the clock.
            if error.code != 429 and error.code < 500:
                raise
            if attempt == attempts - 1:
                raise
            after = error.headers.get("Retry-After")
            wait = float(after) if after and after.isdigit() else min(2**attempt, 30)
            time.sleep(wait + random.uniform(0, 1.0))
        except urllib.error.URLError:
            if attempt == attempts - 1:
                raise
            time.sleep(min(2**attempt, 30) + random.uniform(0, 1.0))

    raise RuntimeError(f"gave up on {url} after {attempts} attempts")


def _poll(polling_url: str, key: str, timeout: float = 300.0) -> str:
    """Block until the image is ready and return its (short-lived, signed) URL."""
    deadline = time.monotonic() + timeout
    delay = 1.0

    while time.monotonic() < deadline:
        time.sleep(delay)
        delay = min(delay * 1.5, 5.0)  # The first render rarely lands in under a second.

        body = _json(polling_url, key)
        status = body.get("status")
        if status == "Ready":
            return body["result"]["sample"]
        # Anything that is not Ready and not still running is terminal — surface the vendor's own
        # wording rather than a generic failure, because "Content Moderated" needs a prompt edit
        # and "Request Failed" needs a retry, and they are not the same problem.
        if status not in ("Pending", "Queued", "Processing", "Request Accepted"):
            raise RuntimeError(f"FLUX returned {status}: {json.dumps(body.get('details', body))}")

    raise TimeoutError(f"FLUX did not finish within {timeout:.0f}s")


def _record(rel_path: str, entry: dict) -> None:
    """Append to the provenance ledger.

    This is the file that makes the asset relicensing checkable instead of merely asserted: model,
    exact prompt, seed and date for every image shipped. An F-Droid reviewer asking "where did this
    art come from" gets an answer that can be re-run.
    """
    with _ledger_lock:  # Read-modify-write on one file, from a pool of workers.
        ledger = {}
        if PROVENANCE.is_file():
            ledger = json.loads(PROVENANCE.read_text(encoding="utf-8"))

        ledger[rel_path] = entry
        PROVENANCE.parent.mkdir(parents=True, exist_ok=True)
        PROVENANCE.write_text(
            json.dumps(dict(sorted(ledger.items())), indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )


def record_derived(out: pathlib.Path, source: pathlib.Path, how: str) -> None:
    """Note a file produced from another one rather than from a prompt.

    Resized icons and copied backgrounds carry the licence of the render they came from, but a
    reader checking `assets/` against the ledger should not have to deduce that from filenames —
    an unlisted image looks like an unaccounted one.
    """
    _record(
        str(out.relative_to(ROOT)),
        {
            "derived_from": str(source.relative_to(ROOT)),
            "how": how,
            "licence": "same as the source render; see that entry",
        },
    )


def generate(
    *,
    slug: str,
    prompt: str,
    out: pathlib.Path,
    width: int = 1024,
    height: int = 1024,
    quality: int = 82,
    attempts: int = 3,
) -> bool:
    """Render one prompt to `out`. Returns False if it could not be produced.

    Never raises on a single image: a batch of fifty should not lose forty-nine because one prompt
    tripped the content filter. The caller reports the tally.

    Deliberately text-only. Passing one of our own finished images back as a style reference was
    tried and removed: it makes each image's provenance depend on another image's, which is the one
    thing the ledger exists to keep flat and independently re-runnable for the F-Droid submission.
    The shared STYLE paragraph holds a family together well enough without it.
    """
    key = load_key()
    seed = seed_for(slug)
    payload = {
        "prompt": prompt,
        "width": width,
        "height": height,
        "seed": seed,
        "output_format": "jpeg" if out.suffix in (".jpg", ".jpeg") else "png",
    }

    for attempt in range(1, attempts + 1):
        try:
            submitted = _json(ENDPOINT, key, payload)
            polling_url = submitted.get("polling_url")
            if not polling_url:
                raise RuntimeError(f"no polling_url in response: {submitted}")

            url = _poll(polling_url, key)
            with urllib.request.urlopen(url, timeout=120) as response:
                raw = response.read()
            break
        except (urllib.error.URLError, RuntimeError, TimeoutError, KeyError) as error:
            if attempt == attempts:
                with _print_lock:
                    print(f"  ✗ {slug}: {error}", file=sys.stderr)
                return False
            with _print_lock:
                print(f"  … {slug}: {error} (retry {attempt}/{attempts - 1})", file=sys.stderr)
            time.sleep(2.0 * attempt)

    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(out.suffix + ".tmp")
    tmp.write_bytes(raw)

    # Normalise through ImageMagick: the API honours width/height, but re-encoding is what holds
    # the file size down (a 1024² PNG straight from the API is ~1.5 MB against ~110 KB here) and
    # guarantees the exact dimensions the UI lays out against.
    subprocess.run(
        ["magick", str(tmp), "-resize", f"{width}x{height}!", "-quality", str(quality), str(out)],
        check=True,
        capture_output=True,
    )
    tmp.unlink()

    # Scratch renders outside the repo (style probes, one-off comparisons) still get made, they
    # just do not enter the ledger — it records what ships, and the crash it used to throw here
    # happened *after* the image was paid for and written, which is the worst possible moment.
    _record(
        str(out.relative_to(ROOT)) if out.is_relative_to(ROOT) else str(out),
        {
            "model": ENDPOINT.rsplit("/", 1)[-1],
            "provider": "Black Forest Labs (direct API)",
            "licence": "FLUX licence §2(d): outputs usable for any purpose, including commercial",
            "prompt": prompt,
            "seed": seed,
            "width": width,
            "height": height,
            "generated": time.strftime("%Y-%m-%d"),
        },
    )

    with _print_lock:
        print(f"  ✓ {out.name}  ({out.stat().st_size // 1024} KB, seed {seed})")
    return True


def run(items: list[tuple[str, str]], out_dir: pathlib.Path, **kwargs) -> int:
    """Generate a whole family in parallel. `items` is (slug, prompt). Returns the failure count.

    Threads rather than asyncio: every step here is a blocking wait on the network — submit, poll,
    download — so the GIL is released throughout and a pool gets the full speedup without the
    scripts having to grow an event loop. Fifty images at one a minute is fifty minutes serial and
    about eight at six workers.
    """
    # A slug may carry a subdirectory ("quests/chop_wood", "buildings/campfire"); accept either the
    # whole thing or just the leaf on the command line, because nobody types the folder.
    only = set(sys.argv[1:])
    selected = [(s, p) for s, p in items if not only or s in only or s.rsplit("/", 1)[-1] in only]
    if only and not selected:
        sys.exit(f"no slug matched {sorted(only)}; known: {sorted(s for s, _ in items)}")

    suffix = kwargs.pop("suffix", ".jpg")
    workers = min(CONCURRENCY, len(selected))
    print(f"{len(selected)} image(s), {workers} at a time\n")

    # Each worker prints its own ✓/✗ as it lands, so there is no ordered progress counter to keep:
    # results arrive out of order by design, and the tally below is what actually matters.
    failed = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [
            pool.submit(
                generate, slug=slug, prompt=prompt, out=out_dir / f"{slug}{suffix}", **kwargs
            )
            for slug, prompt in selected
        ]
        for future in concurrent.futures.as_completed(futures):
            if not future.result():
                failed += 1

    print(f"\n{len(selected) - failed}/{len(selected)} generated, {failed} failed.")
    return failed
