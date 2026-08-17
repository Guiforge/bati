#!/usr/bin/env python3
"""Re-encode the bundled art to WebP, and keep the provenance ledger honest about it.

    python3 scripts/to-webp.py            # convert everything still in PNG/JPEG
    python3 scripts/to-webp.py --dry-run  # report what would change, touch nothing

docs/architecture/performance.md rule #2 asks for WebP sized to display resolution; the repo
shipped 134 PNG/JPEG files and zero WebP. The illustrations are the whole win: flat cel-shaded
art with large even fills is exactly what WebP is good at, and the 1024x1024 village scenes drop
to roughly a tenth of their PNG size with no visible loss.

Two qualities, because two source formats:

  PNG  -> q90. These are lossless originals, so this is the only lossy step they ever take and
          it can afford to be gentle.
  JPEG -> q85. Already lossy, so re-encoding compounds artefacts. q85 buys about a third off
          without visible generational damage; going lower starts to show on the dark
          backgrounds every cover in this app has.

The three icons in `app.json` (icon, adaptive-icon, favicon) are deliberately left alone. They
feed Expo's native build pipeline rather than Metro, where they are resized into platform mipmaps
anyway — converting them risks a toolchain that expects PNG for no bundle saving at all.
"""

import argparse
import json
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
PROVENANCE = ROOT / "scripts" / "provenance.json"

QUALITY = {".png": 90, ".jpg": 85, ".jpeg": 85}

# Nothing here reaches Metro, so converting any of it saves nothing off the bundle.
# The first three are consumed by `expo prebuild` (see the module docstring); the badges are
# `<img>` tags in README.md, and renaming them silently breaks the images on the project page.
KEEP_AS_IS = {
    "assets/icon.png",
    "assets/adaptive-icon.png",
    "assets/favicon.png",
    "assets/badges/get-it-on-fdroid.png",
    "assets/badges/get-it-on-github.png",
    # Named by extension in `app.json` (`previewImage`), and this script deletes the original it
    # converts — so a run that touched these would leave two dangling paths in the manifest.
    "assets/widget-preview/flame.png",
    "assets/widget-preview/weekly.png",
}


def convert(src: pathlib.Path, dry_run: bool) -> tuple[pathlib.Path, int, int] | None:
    """Encode one file next to itself and drop the original. Returns (out, before, after)."""
    out = src.with_suffix(".webp")
    before = src.stat().st_size

    if dry_run:
        return out, before, 0

    result = subprocess.run(
        ["cwebp", "-quiet", "-q", str(QUALITY[src.suffix.lower()]), str(src), "-o", str(out)],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0 or not out.is_file():
        print(f"  !! {src.relative_to(ROOT)}: {result.stderr.strip()}", file=sys.stderr)
        return None

    src.unlink()
    return out, before, out.stat().st_size


def move_ledger_entries(pairs: list[tuple[pathlib.Path, pathlib.Path]]) -> int:
    """Follow each converted file's provenance to its new path, and drop entries gone stale.

    Deliberately *not* `record_derived()`. That helper describes a file made from another file
    that is still there to point at — a resized icon beside its render. Here the original is
    replaced, so a `derived_from` would name a path that no longer exists, and the model, prompt
    and seed that make the licence checkable would be lost with it. A re-encode does not change
    where an image came from, so the entry moves and gains a note saying how it was squeezed.
    """
    ledger = json.loads(PROVENANCE.read_text(encoding="utf-8"))

    for src, out in pairs:
        key, new_key = str(src.relative_to(ROOT)), str(out.relative_to(ROOT))
        entry = ledger.pop(key, None)
        if entry is None:
            # Every shipped asset had an entry when this was written; a new one without is a
            # real gap in the F-Droid answer, so say so rather than inventing a record.
            print(f"  !! no provenance for {key} — left unrecorded", file=sys.stderr)
            continue
        entry["reencoded"] = f"cwebp -q {QUALITY[src.suffix.lower()]}, from {src.name}"
        ledger[new_key] = entry

    # Past sessions left entries pointing into /tmp scratchpads — drafts that were never shipped.
    # The ledger answers "where did the art *in this repo* come from", so an entry has to name a
    # file inside it. An absolute path is out of scope even when the temp file happens to survive
    # on the machine that made it, which is why testing `is_file()` alone missed all 27 of them.
    stale = [
        k for k in ledger if pathlib.PurePosixPath(k).is_absolute() or not (ROOT / k).is_file()
    ]
    for k in stale:
        del ledger[k]

    PROVENANCE.write_text(
        json.dumps(dict(sorted(ledger.items())), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return len(stale)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="report only, change nothing")
    args = parser.parse_args()

    if not args.dry_run and shutil.which("cwebp") is None:
        print("cwebp not found — install libwebp-tools", file=sys.stderr)
        return 1

    sources = sorted(
        p
        for p in ASSETS.rglob("*")
        if p.suffix.lower() in QUALITY and str(p.relative_to(ROOT)) not in KEEP_AS_IS
    )
    pairs: list[tuple[pathlib.Path, pathlib.Path]] = []
    before_total = after_total = 0

    for src in sources:
        done = convert(src, args.dry_run)
        if done is None:
            return 1
        out, before, after = done
        before_total += before
        after_total += after
        if not args.dry_run:
            pairs.append((src, out))

    if args.dry_run:
        print(f"Would convert {len(sources)} files ({before_total / 1e6:.1f} MB).")
        return 0

    # Runs even when there was nothing left to convert: the ledger can go stale on its own, and
    # a second invocation is the natural place to notice.
    stale = move_ledger_entries(pairs)

    if pairs:
        saved = before_total - after_total
        print(
            f"Converted {len(pairs)} files: {before_total / 1e6:.1f} MB -> "
            f"{after_total / 1e6:.1f} MB ({saved / 1e6:.1f} MB saved, "
            f"{100 * saved / before_total:.0f}%)."
        )
    else:
        print("Nothing left to convert.")
    print(f"Pruned {stale} provenance entries not describing a file in this repo.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
