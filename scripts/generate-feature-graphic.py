#!/usr/bin/env python3
"""Compose the store feature graphics: one page of the book, 1024x500.

  python3 scripts/generate-feature-graphic.py [--out DIR]
  python3 scripts/generate-feature-graphic.py --og      # docs/legal/assets/img/og.jpg, 1200x630

`featureGraphic.png` is the 1024x500 banner Play requires and the F-Droid client shows at the
top of the app page. It speaks the app's inked bande dessinee language: the forge render
(`fastlane/featureGraphic-bg.jpg`, the smithy courtyard) darkened toward the left into ink
(#0C0D11), a recitatif cartouche on the left (ink box at 92%, 2 px #363A44 border, radius 4)
holding a short braise bar and the tagline in Alegreya ExtraBold, bone, and the sigil with the
"Bati" wordmark at the top right. The braise bar is the one accent. Fonts come from
node_modules/@expo-google-fonts, not from the system.

The background is a FLUX render recorded in the provenance ledger like every other shipped image
(see scripts/lib/flux.py). It is committed rather than re-rendered here because the endpoint is not
byte-deterministic across runs: the approved image is the asset, the prompt in the ledger is its
provenance.

Play's spec for the file is "JPEG or 24-bit PNG (no alpha)". In PNG terms that is colour type 2,
8-bit, and *no tRNS chunk* — an alpha'd PNG uploads to F-Droid without complaint and is refused
by Play, which is exactly how the two stores' copies would silently diverge. The compose step
flattens and the check below fails the run rather than letting that file ship.

`--og` composes the same page at 1200x630 (link previews, the README header) from the English
tagline and writes the JPEG the site and README point at; nothing else is touched.

Without --out the files go to fastlane/metadata/... and the provenance ledger is updated; with
--out (previews) they go to DIR/featureGraphic-<locale>.png and the ledger is left alone.
"""

import argparse
import pathlib
import struct
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from lib.flux import ROOT, record_derived  # noqa: E402

BG = ROOT / "fastlane" / "featureGraphic-bg.jpg"
FONTS = ROOT / "node_modules" / "@expo-google-fonts"
ALEGREYA = FONTS / "alegreya" / "800ExtraBold" / "Alegreya_800ExtraBold.ttf"
SIGIL = ROOT / "assets" / "icon.png"

INK = (12, 13, 17)  # #0C0D11
BONE = (236, 228, 212)  # #ECE4D4
BRAISE = (194, 65, 12)  # #C2410C, the one accent
RULE = (54, 58, 68)  # #363A44
SIZE = (1024, 500)
OG_SIZE = (1200, 630)
OG = ROOT / "docs" / "legal" / "assets" / "img" / "og.jpg"

# One tagline per shipped locale. Two lines, six words or fewer, >=60px once rendered: the
# banner is seen at roughly a third of its size on a phone card, and text that dies there is
# decoration. The copy leans on the pun the app is named after — "bien bâti" is muscled,
# "bâtir" is building the village — and "build/well-built" carries the same double meaning in
# English. French capitals keep their accents (BÂTIS, not BATIS). The size starts at 66 and
# shrinks only to keep the box inside the canvas; it never goes under 60.
TAGLINES = {
    "en-US": "BUILD YOUR BODY.\nBUILD YOUR VILLAGE.",
    "fr-FR": "BÂTIS TON CORPS.\nBÂTIS TON VILLAGE.",
    "de-DE": "BAU DEINEN KÖRPER.\nBAU DEIN DORF.",
    "es-ES": "FORJA TU CUERPO.\nLEVANTA TU ALDEA.",
}


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(ALEGREYA), size)


def background(SIZE=SIZE) -> Image.Image:
    """Cover-crop the render, then let ink take the left: opaque at the edge, gone at 80%."""
    art = Image.open(BG).convert("RGB")
    scale = max(SIZE[0] / art.width, SIZE[1] / art.height)
    art = art.resize((round(art.width * scale), round(art.height * scale)), Image.LANCZOS)
    left, top = (art.width - SIZE[0]) // 2, (art.height - SIZE[1]) // 2
    art = art.crop((left, top, left + SIZE[0], top + SIZE[1]))
    ramp = Image.linear_gradient("L").rotate(90).resize(SIZE)  # white left -> black right
    ramp = ramp.point(lambda v: max(0, round((v - 51) / 204 * 235)))  # 0 from 80% across
    return Image.composite(Image.new("RGB", SIZE, INK), art, ramp).convert("RGBA")


def compose(tagline: str, SIZE=SIZE, top=66) -> Image.Image:
    canvas = background(SIZE)
    d = ImageDraw.Draw(canvas)
    lines = tagline.split("\n")
    pad_x, pad_y, margin = 36, 30, 64
    size = top
    while size > 60:
        f = font(size)
        if max(d.textlength(line, font=f) for line in lines) + 2 * pad_x <= SIZE[0] - 2 * margin - 180:
            break
        size -= 1
    f = font(size)
    pitch = round(size * 1.08)
    cap = round(size * 0.72)
    text_w = round(max(d.textlength(line, font=f) for line in lines))
    height = pad_y + 6 + 30 + cap + pitch * (len(lines) - 1) + round(size * 0.12) + pad_y
    x0, y0 = margin, (SIZE[1] - height) // 2 + 20
    layer = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(
        [(x0, y0), (x0 + text_w + 2 * pad_x, y0 + height)], radius=4, fill=(*INK, 235), outline=RULE, width=2
    )
    canvas.alpha_composite(layer)

    x, y = x0 + pad_x, y0 + pad_y
    d.rectangle([x, y, x + 71, y + 5], fill=BRAISE)
    y += 6 + 30 + cap
    for line in lines:
        d.text((x, y), line, font=f, fill=BONE, anchor="ls")
        y += pitch

    # Sigil and name, top right.
    sigil = Image.open(SIGIL).convert("RGBA").resize((64, 64), Image.LANCZOS)
    mask = Image.new("L", (64, 64), 0)
    ImageDraw.Draw(mask).rounded_rectangle([(0, 0), (63, 63)], radius=10, fill=255)
    sigil.putalpha(ImageChops.multiply(sigil.getchannel("A"), mask))
    name = font(30)
    wx = SIZE[0] - 40 - 64 - 12 - d.textlength("Bati", font=name)
    shade = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    ImageDraw.Draw(shade).rounded_rectangle([(wx - 14, 26), (SIZE[0] - 26, 118)], radius=4, fill=(*INK, 150))
    canvas.alpha_composite(shade.filter(ImageFilter.GaussianBlur(6)))
    canvas.alpha_composite(sigil, (round(wx), 40))
    ImageDraw.Draw(canvas).text((wx + 64 + 12, 72), "Bati", font=name, fill=BONE, anchor="lm")
    return canvas.convert("RGB")


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
    ap = argparse.ArgumentParser()
    ap.add_argument("--og", action="store_true", help="write the 1200x630 link-preview image and stop")
    ap.add_argument("--out", help="write previews to DIR/featureGraphic-<locale>.png, skip the ledger")
    args = ap.parse_args()
    if not BG.is_file():
        sys.exit(f"{BG} is missing; re-render it from its provenance.json prompt first.")
    if not ALEGREYA.is_file():
        sys.exit(f"{ALEGREYA} is missing; run npm install first.")

    if args.og:
        OG.parent.mkdir(parents=True, exist_ok=True)
        compose(TAGLINES["en-US"], OG_SIZE, 80).save(OG, "JPEG", quality=85, optimize=True, progressive=True)
        print(f"  ✓ {OG}  ({OG.stat().st_size // 1024} KB)")
        sys.exit(0)

    failed = False
    for locale, tagline in TAGLINES.items():
        if args.out:
            out = pathlib.Path(args.out) / f"featureGraphic-{locale}.png"
        else:
            out = ROOT / "fastlane" / "metadata" / "android" / locale / "images" / "featureGraphic.png"
        out.parent.mkdir(parents=True, exist_ok=True)
        compose(tagline).save(out, "PNG", optimize=True)
        problems = check(out)
        for problem in problems:
            print(f"  ✗ {out}: {problem}", file=sys.stderr)
            failed = True
        if not problems:
            if not args.out:
                record_derived(out, BG, "cover-crop + left ink fade + cartouche tagline")
            print(f"  ✓ {out}  ({out.stat().st_size // 1024} KB)")
    sys.exit(1 if failed else 0)
