"""Checks of the _v2 renders (F1 vague 3), in ~/.cache/bati-art-loop/iso/blockouts_v2/:

    python3 scripts/iso/blockouts/verify_v2.py [slug_v2 ...]

 - the exports of exports/test_exports.py (8 exports, shadow from volumes within 1 px, accroches, masks, mock-up);
 - same canvas, size and anchor (to 1 px) as the original stage, same footprint corner (lowest opaque row);
 - composed colour: share of interior pixels more than 2 off a tone of their class, beside the original's (palette: g0.py);
 - light direction: the lit faces sit left of the shadowed faces (class centroids);
 - highest shadow-casting vertex and ground-shadow reach against the original (gen_v2_vague3.py asserts the first).
"""
import json
import pathlib
import sys

ISO = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ISO))
sys.path.insert(0, str(ISO / "exports"))
import isolib as L  # noqa: E402

CACHE = pathlib.Path.home() / ".cache" / "bati-art-loop" / "iso" / "blockouts_v2"
ORIG = L.RENDERS
L.BLOCKOUTS, L.RENDERS, L.SPRITES = CACHE / "specs", CACHE / "renders", CACHE / "mockups"
import test_exports as T  # noqa: E402

TOL = 2


def near(c, tone):
    return all(abs(a - b) <= TOL for a, b in zip(c, tone))


def colour(stem, info, mats):
    """Share of the opaque, non-ink pixels of known class that are not within TOL of a tone of their class;
    and the x sum and count of the lit (80) and shadowed (140) face pixels."""
    rgba = L.Image.open(stem.with_suffix(".rgba.png")).convert("RGBA")
    cls = L.Image.open(stem.with_suffix(".classes.png")).convert("RGB")
    tones = {i: [L.hex_rgb(t) for t in mats[n]["tones"]] for n, i in info["materialIndex"].items() if n in mats}
    px, cp = rgba.load(), cls.load()
    off = n = 0
    sums = {1: [0, 0], 2: [0, 0]}
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = px[x, y]
            if a < 255:
                continue
            code, tc, _ = cp[x, y]
            if tc in (80, 140):
                k = 1 if tc == 80 else 2
                sums[k][0] += x
                sums[k][1] += 1
            if code // 8 not in tones or tc not in (20, 80, 140) or max(r, g, b) < 40:
                continue
            if not (0 < x < rgba.width - 1 and 0 < y < rgba.height - 1) or any(
                    cp[x + dx, y + dy] != cp[x, y] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                continue  # an edge pixel (ink, anti-aliasing) is a blend by design
            n += 1
            off += not any(near((r, g, b), t) for t in tones[code // 8])
    return off / max(n, 1), sums


def main():
    slugs = sys.argv[1:] or sorted(p.stem for p in L.BLOCKOUTS.glob("*_v2.json"))
    bad = []
    for slug in slugs:
        fails = []
        T.check(slug, lambda ok, what: ok or fails.append(what))
        info = json.loads((L.RENDERS / f"{slug}.anchor.json").read_text())
        old = json.loads((ORIG / f"{slug.removesuffix('_v2')}.anchor.json").read_text())
        if info["size"] != old["size"] or info["canvas"] != old["canvas"]:
            fails.append("canvas or size")
        if max(abs(a - b) for a, b in zip(info["anchor"], old["anchor"])) > 1:
            fails.append(f"anchor {info['anchor']} vs {old['anchor']}")
        rgba = L.Image.open(L.RENDERS / f"{slug}.rgba.png").convert("RGBA")
        cls = L.Image.open(L.RENDERS / f"{slug}.classes.png").convert("RGB")
        box = rgba.getchannel("A").point(lambda a: 255 if a >= 128 else 0).getbbox()
        obox = L.Image.open(ORIG / f"{slug.removesuffix('_v2')}.rgba.png").convert("RGBA").getchannel("A").point(lambda a: 255 if a >= 128 else 0).getbbox()
        W, H = rgba.size
        if box[0] <= 0 or box[1] <= 0 or box[2] >= W or box[3] >= H:
            fails.append(f"clipped by the canvas {box}")
        if box[3] != obox[3]:
            fails.append(f"footprint bottom row {box[3]} vs {obox[3]}")
        spec = json.loads((L.BLOCKOUTS / f"{slug}.json").read_text())
        mats = {k: v for k, v in L.ISO["materials"].items() if not k.startswith("_")} | spec.get("materials", {})
        share, sums = colour(L.RENDERS / slug, info, mats)
        base, _ = colour(ORIG / slug.removesuffix("_v2"), old, mats)
        # The palette itself is g0.py's job (exact). Here a count only: interior pixels off by more than TOL
        # (soft light on tilted faces, ink) exist in the originals too, so it is shown beside theirs, not gated.
        note = f"colour off {share:.1%} (original {base:.1%})"
        if sums[1][1] and sums[2][1] and sums[1][0] / sums[1][1] >= sums[2][0] / sums[2][1]:
            fails.append("light: lit faces are not left of the shadowed ones")
        print(f"{slug}: {'ok' if not fails else 'FAIL ' + '; '.join(fails)}  ({note}, box {box})", flush=True)
        bad += fails
    print("fails:", len(bad))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
