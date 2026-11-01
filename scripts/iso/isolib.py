"""Shared plumbing of the iso POC scripts: paths, the iso spec, Blender, the colour composition.

Stdlib and Pillow only, like the rest of scripts/: no numpy, so every pixel loop here is written to
touch as few pixels as the measure needs.
"""

import json
import os
import pathlib
import re
import shutil
import subprocess

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
ISO = json.loads((ROOT / "constants" / "isoSpec.json").read_text(encoding="utf-8"))
# Not /tmp: a reboot wiped a whole run there (art-loop.py).
WORK = pathlib.Path(os.environ.get("ART_LOOP_DIR", pathlib.Path.home() / ".cache" / "bati-art-loop")) / "iso"
BLOCKOUTS = ROOT / "scripts" / "iso" / "blockouts"
RENDERS = BLOCKOUTS / "renders"
SPRITES = ROOT / "assets" / "images" / "village" / "iso"
# ImageMagick stamps PNGs with the time they were written; the ledger pins references by hash.
REPRODUCIBLE = ("-strip", "-define", "png:exclude-chunks=date,time")
PASSES = (".tone.png", ".shadowtone.png", ".direct.png", ".ndotl.png", ".cls.png")


def hex_rgb(colour: str) -> tuple[int, int, int]:
    return tuple(int(colour[i : i + 2], 16) for i in (1, 3, 5))


def raw_colour(name: str) -> str:
    """A colour from constants/rawColors.ts, the app's one palette (prompt v5 §3.2)."""
    text = (ROOT / "constants" / "rawColors.ts").read_text(encoding="utf-8")
    match = re.search(rf"\b{name}: \"(#[0-9A-Fa-f]{{6}})\"", text)
    if not match:
        raise KeyError(name)
    return match.group(1)


_SRGB = [((v / 65535 + 0.055) / 1.055) ** 2.4 if v / 65535 > 0.04045 else v / 65535 / 12.92 for v in range(65536)]


def _linear16(path: pathlib.Path) -> list[float]:
    image = Image.open(path)
    return [_SRGB[v] for v in image.get_flattened_data()]


def compose(stem: pathlib.Path, out: pathlib.Path, socle_shadow: bool = True) -> None:
    """Pick each pixel's colour from the passes (iso_blockout.py docstring): the tone of its n.L,
    or the shadow tone where the moon's direct light is occluded. Writes `out` (RGBA) and
    `out.classes.png` (R: material code, G: tone class code, both as in the .cls pass).
    `socle_shadow=False`: a pixel flagged B 32..160 in the .cls pass (the top of a base, 64) is never
    shadowed and its B is 0 in the classes map (L2-T02)."""
    tone = Image.open(stem.with_suffix(".tone.png")).convert("RGBA")
    shadow = Image.open(stem.with_suffix(".shadowtone.png")).convert("RGBA")
    direct = _linear16(stem.with_suffix(".direct.png"))
    ndotl = _linear16(stem.with_suffix(".ndotl.png"))
    ratio, lit = ISO["tones"]["occludedRatio"], ISO["tones"]["lit"]
    cls = Image.open(stem.with_suffix(".cls.png")).convert("RGB")
    codes = cls.get_flattened_data()
    occluded = bytearray(len(direct))
    for i, (d, n) in enumerate(zip(direct, ndotl)):
        # Only a face that should be lit can be shadowed, and emissive parts (G code 200) never are.
        if n > lit and d < ratio * n and codes[i][1] != 200 and not (not socle_shadow and 32 <= codes[i][2] <= 160):
            occluded[i] = 255
    mask = Image.frombytes("L", tone.size, bytes(occluded))
    Image.composite(shadow, tone, mask).save(out)
    r, g, b = cls.split()
    # Snap the codes: material on multiples of 8, tone class on 20/80/140/200.
    r = r.point(lambda v: 8 * round(v / 8))
    g = g.point(lambda v: 0 if v < 10 else min((20, 80, 140, 200), key=lambda c: abs(c - v)))
    # B flags a cast shadow inside the sprite; G keeps the face's own class from its n.L, so the
    # audit can tell "this face turns away from the moon" from "a chimney shades this face".
    Image.merge("RGB", (r, g, mask)).save(out.with_suffix(".classes.png"))
    subprocess.run(["magick", str(out), *REPRODUCIBLE, str(out)], check=True)


def blender(spec_file: pathlib.Path, out: pathlib.Path, lines: bool = True, catcher: bool = False,
            swap: bool = False, socle_shadow: bool = True) -> dict:
    """Render a blockout spec through Blender's passes and compose it into `out` (RGBA).

    The passes are scratch: they go to WORK/passes, only the composed image and its maps are kept.
    Returns the anchor JSON, written beside `out` as `<out stem>.anchor.json`.
    """
    passes = WORK / "passes"
    passes.mkdir(parents=True, exist_ok=True)
    # No dot left in the stem: every pass name is built with with_suffix() on it.
    stem = passes / out.name.replace(".png", "").replace(".", "_")
    command = ["flatpak", "run", "--filesystem=home", "org.blender.Blender", "--background",
               "--python", str(ROOT / "scripts" / "iso" / "iso_blockout.py"), "--", str(spec_file), str(stem) + ".png"]
    if not lines:
        command.append("--no-lines")
    if catcher:
        command.append("--catcher")
    if swap:
        command.append("--swap-tones")
    result = subprocess.run(command, capture_output=True, text=True)
    anchor = stem.with_suffix(".anchor.json")
    if result.returncode != 0 or not anchor.exists():
        raise RuntimeError(f"blender failed on {spec_file.name}:\n{result.stdout[-3000:]}\n{result.stderr[-2000:]}")
    compose(stem, out, socle_shadow)
    target = out.with_name(out.name.replace(".png", "") + ".anchor.json")
    shutil.copy(anchor, target)
    if catcher:
        shutil.copy(stem.with_suffix(".catcher.png"), out.with_name(out.name.replace(".png", "") + ".catcher.png"))
    return json.loads(target.read_text(encoding="utf-8"))


def flatten(rgba: pathlib.Path, out: pathlib.Path, background: str) -> pathlib.Path:
    subprocess.run(["magick", str(rgba), "-background", background, "-flatten", "-alpha", "off",
                    *REPRODUCIBLE, str(out)], check=True)
    return out


def alpha(path: pathlib.Path) -> Image.Image:
    return Image.open(path).convert("RGBA").getchannel("A")
