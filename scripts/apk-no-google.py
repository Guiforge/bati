#!/usr/bin/env python3
"""Which Google classes a release APK really holds, by R8's mapping and by the dex itself.

    scripts/apk-no-google.py <apk> <mapping.txt> [--allowed <packages.txt>] [--baseline <earlier.classes.txt>] [--write <out.txt>]

R8 renames classes, so a dex listing alone is blind: the mapping is what names them. Fails on any
class under F-Droid's own code signatures (fdroid/suss-code-signatures.txt) or Play Services or ML
Kit by name. `--allowed` fails on any class under com.google outside the packages it lists: by package,
because R8 keeps or drops an inner class from one build to the next and only a new library should fail a
release. `--baseline` lists what a change added, class by class. Used by the QR scanner's GO criteria
(docs/designs/multiplayer/qr-scanner.md) and by release.yml on the foss APK.
"""
import os, pathlib, re, subprocess, sys, tempfile, zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
FORBIDDEN = re.compile(r"com\.google\.(android\.gms|mlkit|firebase|android\.play)|play[._]services", re.I)


def mapped_classes(mapping: str) -> set[str]:
    return {
        line.split(" -> ")[0]
        for line in pathlib.Path(mapping).read_text().splitlines()
        if line and not line.startswith(("#", " ")) and " -> " in line
    }


def dex_classes(apk: str) -> set[str]:
    sdk = pathlib.Path(os.environ.get("ANDROID_HOME") or pathlib.Path.home() / "Android/Sdk") / "build-tools"
    dexdump = sorted(sdk.glob("*/dexdump"))[-1]
    found: set[str] = set()
    with tempfile.TemporaryDirectory() as tmp, zipfile.ZipFile(apk) as z:
        for name in z.namelist():
            if re.fullmatch(r"classes\d*\.dex", name):
                z.extract(name, tmp)
                out = subprocess.run([dexdump, f"{tmp}/{name}"], capture_output=True, text=True).stdout
                found |= {m.replace("/", ".") for m in re.findall(r"Class descriptor\s+:\s+'L(.+);'", out)}
    return found


def main() -> int:
    args = sys.argv[1:]
    baseline = args[args.index("--baseline") + 1] if "--baseline" in args else None
    write = args[args.index("--write") + 1] if "--write" in args else None
    allowed = args[args.index("--allowed") + 1] if "--allowed" in args else None
    apk, mapping = args[0], args[1]

    classes = mapped_classes(mapping) | dex_classes(apk)
    signatures = [
        re.compile(line)
        for line in (ROOT / "fdroid/suss-code-signatures.txt").read_text().splitlines()
        if line and not line.startswith("#")
    ]
    as_paths = {c: c.replace(".", "/") for c in classes}
    bad = sorted(c for c, p in as_paths.items() if FORBIDDEN.search(c) or any(s.search(p) for s in signatures))
    google = sorted(c for c in classes if c.startswith("com.google."))

    print(f"classes read: {len(classes)}; under com.google: {len(google)}; forbidden: {len(bad)}")
    groups: dict[str, int] = {}
    for c in google:
        key = ".".join(c.split(".")[:4])
        groups[key] = groups.get(key, 0) + 1
    for key, n in sorted(groups.items()):
        print(f"  {n:6} {key}")
    for c in bad[:40]:
        print(f"  FORBIDDEN {c}")
    if write:
        pathlib.Path(write).write_text("\n".join(google) + "\n")
    if baseline:
        known = set(pathlib.Path(baseline).read_text().split())
        added = sorted(set(google) - known)
        print(f"added under com.google since baseline: {len(added)}")
        for c in added[:40]:
            print(f"  + {c}")
    # Reading nothing would also be finding nothing forbidden.
    if len(classes) < 1000 or not any(c.startswith("com.guiforge.bati.") for c in classes):
        print(f"could not read the app's classes out of {apk}: {len(classes)} found")
        return 1
    unexpected: list[str] = []
    if allowed:
        lines = pathlib.Path(allowed).read_text().splitlines()
        packages = tuple(f"{line}." for line in lines if line and not line.startswith("#"))
        unexpected = [c for c in google if not c.startswith(packages)]
        print(f"under com.google outside {allowed}: {len(unexpected)}")
        for c in unexpected[:40]:
            print(f"  NEW {c}")
    return 1 if bad or unexpected else 0


if __name__ == "__main__":
    sys.exit(main())
