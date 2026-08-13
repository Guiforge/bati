#!/usr/bin/env python3
"""Compose the store feature graphics from the forge render and the app's own type.

  python3 scripts/generate-feature-graphic.py

`featureGraphic.png` is the 1024x500 banner Play requires and the F-Droid client shows at the
top of the app page. Two rules shaped this composition, both from Play's own asset guidance:
no app-icon duplication (the icon is already displayed beside the banner in every placement,
so the crest stays off it) and no app-name duplication (the listing header already says Bati).
What remains is the one thing the banner can say that nothing else on the page does: a tagline,
set in the app's heading face over the app's own art.

The background is `fastlane/featureGraphic-bg.jpg`, a FLUX render recorded in the provenance
ledger like every other shipped image (see scripts/lib/flux.py). It is committed rather than
re-rendered here because the endpoint is not byte-deterministic across runs: the approved image
is the asset, the prompt in the ledger is its provenance. Delete the file and rerun to draw a
new one from the ledger's prompt.

Play's spec for the file is "JPEG or 24-bit PNG (no alpha)". In PNG terms that is colour type 2,
8-bit, and *no tRNS chunk* — an alpha'd PNG uploads to F-Droid without complaint and is refused
by Play, which is exactly how the two stores' copies would silently diverge. The compose step
flattens and the check below fails the run rather than letting that file ship.
"""

import pathlib
import struct
import subprocess
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from lib.flux import ROOT, record_derived  # noqa: E402

BG = ROOT / "fastlane" / "featureGraphic-bg.jpg"
FONT = (
    ROOT / "node_modules" / "@expo-google-fonts" / "space-grotesk"
    / "700Bold" / "SpaceGrotesk_700Bold.ttf"
)

# One (tagline, pointsize) per shipped locale. Two lines, six words or fewer, >=60px once
# rendered: the banner is seen at roughly a third of its size on a phone card, and text that
# dies there is decoration. The copy leans on the pun the app is named after — "bien bâti" is
# muscled, "bâtir" is building the village — and "build/well-built" carries the same double
# meaning in English. French capitals keep their accents (BÂTIS, not BATIS).
TAGLINES = {
    "en-US": ("BUILD YOUR BODY.\nBUILD YOUR VILLAGE.", 66),
    "fr-FR": ("BÂTIS TON CORPS.\nBÂTIS TON VILLAGE.", 66),
}


def magick(*args: str | pathlib.Path) -> None:
    subprocess.run(["magick", *map(str, args)], check=True, capture_output=True)


def compose(locale: str, tagline: str, pointsize: int, tmp: pathlib.Path) -> pathlib.Path:
    out = ROOT / "fastlane" / "metadata" / "android" / locale / "images" / "featureGraphic.png"
    text, mask, gold, shadow = (tmp / f"{locale}-{n}.png" for n in ("t", "m", "g", "s"))

    # Gradient-gold tagline: glyph alpha mask, filled #FFEA8A->#EDA912, over a soft dark
    # drop shadow and a faint amber glow — the same treatment at any locale's length.
    magick("-background", "none", "-font", FONT, "-pointsize", str(pointsize), "-kerning", "2.5",
           "-interline-spacing", "10", "-fill", "white", f"label:{tagline}",
           "-alpha", "extract", mask)
    width, height = map(int, subprocess.run(
        ["magick", str(mask), "-format", "%w %h", "info:"],
        check=True, capture_output=True, text=True).stdout.split())
    magick("-size", f"{width}x{height}", "gradient:#FFEA8A-#EDA912",
           mask, "-alpha", "off", "-compose", "CopyOpacity", "-composite", gold)
    magick(gold, "(", "+clone", "-fill", "#050810", "-colorize", "100",
           "-channel", "A", "-evaluate", "multiply", "0.85", "+channel", "-blur", "0x5", ")",
           "+swap", "-background", "none", "-layers", "merge", "+repage", shadow)
    magick(shadow, "(", "+clone", "-fill", "#F59E0B", "-colorize", "100", "-blur", "0x18",
           "-channel", "A", "-evaluate", "multiply", "0.35", "+channel", ")",
           "+swap", "-composite", text)

    # Cover-crop the 2:1 render to 2.048:1, scrim the quiet left third so the gold clears
    # AA over the teal wall, place the tagline inside the 80px safe margin, flatten to
    # colour type 2 (no alpha — see module docstring).
    magick(BG, "-resize", "1024x500^", "-gravity", "center", "-extent", "1024x500",
           "(", "-size", "620x500", "gradient:rgba(6,9,18,0.55)-rgba(6,9,18,0)",
           "-rotate", "-90", "-resize", "620x500!", ")",
           "-gravity", "northwest", "-composite",
           text, "-gravity", "west", "-geometry", "+92+0", "-composite",
           "-background", "#0B0F19", "-alpha", "remove", "-alpha", "off",
           "-strip", "-colorspace", "sRGB", "-type", "TrueColor",
           "-define", "png:color-type=2", "-define", "png:bit-depth=8",
           "-define", "png:compression-level=9", "-interlace", "none", f"PNG24:{out}")
    return out


def check(path: pathlib.Path) -> list[str]:
    """The Play-spec facts a green upload depends on, read from the actual chunks."""
    data = path.read_bytes()
    width, height, depth, ctype, _, _, interlace = struct.unpack(">IIBBBBB", data[16:29])
    chunks, offset = set(), 8
    while offset < len(data):
        length, tag = struct.unpack(">I4s", data[offset:offset + 8])
        chunks.add(tag)
        offset += 12 + length
        if tag == b"IEND":
            break
    problems = []
    if (width, height) != (1024, 500):
        problems.append(f"{width}x{height}, want 1024x500")
    if (ctype, depth, interlace) != (2, 8, 0):
        problems.append(f"colour type {ctype} depth {depth} interlace {interlace}, want 2/8/0")
    if b"tRNS" in chunks:
        problems.append("tRNS chunk present (transparency)")
    return problems


if __name__ == "__main__":
    if not BG.is_file():
        sys.exit(f"{BG} is missing; re-render it from its provenance.json prompt first.")
    if not FONT.is_file():
        sys.exit(f"{FONT} is missing; run npm install first.")

    failed = False
    with tempfile.TemporaryDirectory() as tmp:
        for locale, (tagline, pointsize) in TAGLINES.items():
            out = compose(locale, tagline, pointsize, pathlib.Path(tmp))
            problems = check(out)
            for problem in problems:
                print(f"  ✗ {out.relative_to(ROOT)}: {problem}", file=sys.stderr)
                failed = True
            if not problems:
                record_derived(out, BG, "cover-crop + left scrim + gradient-gold tagline")
                print(f"  ✓ {out.relative_to(ROOT)}  ({out.stat().st_size // 1024} KB)")
    sys.exit(1 if failed else 0)
