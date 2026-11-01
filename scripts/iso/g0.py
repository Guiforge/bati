#!/usr/bin/env python3
"""Gate G0 of the iso POC: does the Blender camera draw the grid isoSpec.json describes?

    python3 scripts/iso/g0.py

Every later measure trusts this one: the anchor the app pins a sprite by, the footprint the audit
checks a painting against, the 2:1 the ground is drawn at. So it measures rather than looks:
cubes rendered without outlines, their edges located to a fraction of a pixel where the alpha
crosses one half (the antialiasing filter is symmetric, so that is where the true edge is), and
lines fitted through them. A one-pixel tolerance is meaningless if the measure itself is only
good to two.

Then the outline exists, the render is byte-identical twice, and gy runs the way cellToScreen says.
"""

import hashlib
import json
import sys

import isolib as L

S = L.ISO["S"]
OUT = L.WORK / "g0"


def spec(canvas: str, parts: list) -> L.pathlib.Path:
    OUT.mkdir(parents=True, exist_ok=True)
    name = f"{canvas}_{len(list(OUT.glob(canvas + '_*.json')))}"
    path = OUT / f"{name}.json"
    path.write_text(json.dumps({"canvas": canvas, "parts": parts}))
    return path


def cube(at, size, mat="stone"):
    return {"type": "box", "at": at, "size": size, "mat": mat}


def measure(png: L.pathlib.Path, wall_px: float) -> dict:
    a = L.alpha(png)
    width, height = a.size
    px = a.load()
    v = lambda x, y: px[x, y] / 255  # noqa: E731
    bottom = max(y for y in range(height) if any(px[x, y] >= 128 for x in range(0, width, 1)))
    rows = [y for y in range(height) if any(px[x, y] >= 128 for x in range(width))]
    xs = [x for x in range(width) if any(px[x, y] >= 128 for y in rows)]
    left_x, right_x = xs[0], xs[-1]

    def cross_x(y, from_left):
        r = range(1, width) if from_left else range(width - 2, -1, -1)
        for x in r:
            prev = v(x - 1, y) if from_left else v(x + 1, y)
            if v(x, y) >= 0.5 > prev:
                return (x - 0.5 + (0.5 - prev) / (v(x, y) - prev)) if from_left else (x + 1.5 - (0.5 - prev) / (v(x, y) - prev))
        return None

    def cross_y(x):
        for y in range(height - 2, -1, -1):
            below = v(x, y + 1)
            if v(x, y) >= 0.5 > below:
                return y + 1.5 - (0.5 - below) / (v(x, y) - below)
        return None

    # The wall: rows a third of the way up the vertical edges, well clear of both corners.
    ground_left = None
    for y in range(bottom, 0, -1):
        if px[left_x, y] >= 128:
            ground_left = y
            break
    wall_rows = [int(ground_left - wall_px * f) for f in (0.3, 0.4, 0.5, 0.6, 0.7)]
    xl = sum(cross_x(y, True) for y in wall_rows) / len(wall_rows)
    xr = sum(cross_x(y, False) for y in wall_rows) / len(wall_rows)

    def fit(columns):
        pts = [(x + 0.5, cross_y(x)) for x in columns]
        pts = [(x, y) for x, y in pts if y is not None]
        n = len(pts)
        mx, my = sum(p[0] for p in pts) / n, sum(p[1] for p in pts) / n
        m = sum((x - mx) * (y - my) for x, y in pts) / sum((x - mx) ** 2 for x, _ in pts)
        return m, my - m * mx

    centre = (left_x + right_x) / 2
    span = (right_x - left_x) / 2
    # Bottom vertex column found from the data, not assumed central: the axis test moves it.
    bottom_col = max(range(left_x, right_x + 1), key=lambda x: cross_y(x) or 0)
    m1, c1 = fit(range(left_x + 12, bottom_col - 12))
    m2, c2 = fit(range(bottom_col + 12, right_x - 12))
    bx = (c2 - c1) / (m1 - m2)
    return {"xl": xl, "xr": xr, "width": xr - xl, "slopeL": m1, "slopeR": m2,
            "anchor": [bx, m1 * bx + c1], "centre": centre, "span": span}


def px_of(gx, gy, z, anchor):
    """Canvas pixel of a grid point on the 2x2 canvas, whose anchor is the corner (2, 2)."""
    up = 0.866 * L.ISO["pxPerUnit"]
    return (anchor[0] + ((gx - gy) - 0) * S / 2, anchor[1] + ((gx + gy) - 4) * S / 4 - z * up)


def light_checks(check, anchor, wall):
    """Prompt v5 G0: the moon, the composed tones, inner occlusion, and the cast shadow polygon."""
    from PIL import ImageChops, ImageDraw, ImageFilter

    stone = [L.hex_rgb(c) for c in L.ISO["materials"]["stone"]["tones"]]
    plaster = [L.hex_rgb(c) for c in L.ISO["materials"]["plaster"]["tones"]]

    def near(a, b):
        return all(abs(x - y) <= 2 for x, y in zip(a, b))

    # Faces of a stone cube: top, -y (screen left) lit, +x (screen right) in shadow.
    s = spec("building2x2", [cube([1, 1, 0], [1, 1, 1.0])])
    png = s.with_suffix(".png")
    L.blender(s, png)
    image = L.Image.open(png).convert("RGB")
    samples = {"top": px_of(1.5, 1.5, 1.0, anchor), "left (-y, lit)": px_of(1.5, 1.95, 0.5, anchor),
               "right (+x, shadow)": px_of(1.95, 1.5, 0.5, anchor)}
    for (name, at), want in zip(samples.items(), stone):
        got = image.getpixel((round(at[0]), round(at[1])))
        check(f"tone {name}", near(got, want), f"{got} vs palette {want}")

    # A small plaster cube in the shadow of a tall one: its lit face takes the shadow tone.
    s = spec("building2x2", [cube([0, 1, 0], [1, 1, 2.0]), cube([1.0, 0.4, 0], [0.6, 0.6, 0.4], "plaster")])
    png = s.with_suffix(".png")
    L.blender(s, png)
    at = px_of(1.3, 0.99, 0.2, anchor)
    got = L.Image.open(png).convert("RGB").getpixel((round(at[0]), round(at[1])))
    check("occluded lit face", near(got, plaster[2]), f"{got} vs plaster shadow {plaster[2]} (lit would be {plaster[1]})")

    # A pole: its shadow runs toward screen right.
    s = spec("building2x2", [cube([1.4, 1.4, 0], [0.2, 0.2, 2.0])])
    info = L.blender(s, s.with_suffix(".png"))
    xs = [p[0] for poly in info["shadow"] for p in poly["px"]]
    base = px_of(1.5, 1.5, 0, anchor)[0] - anchor[0]
    check("pole shadow to screen right", max(xs) > base + 100, f"shadow reaches x {max(xs):.0f} from the anchor, pole base {base:.0f}")

    # The computed polygon against Blender's own shadow catcher, outside the cube's mask.
    s = spec("building2x2", [cube([0.5, 1.0, 0], [1.0, 1.0, 1.2])])
    png = s.with_suffix(".png")
    info = L.blender(s, png, catcher=True)
    caught = L.alpha(png.with_name(png.name.replace(".png", "") + ".catcher.png")).point(lambda v: 255 if v >= 128 else 0)
    body = L.alpha(png).point(lambda v: 255 if v >= 128 else 0)
    drawn = L.Image.new("L", caught.size, 0)
    for poly in info["shadow"]:
        ImageDraw.Draw(drawn).polygon([(x + info["anchor"][0], y + info["anchor"][1]) for x, y in poly["px"]], fill=255)
    edge = ImageChops.subtract(drawn.filter(ImageFilter.MaxFilter(5)), drawn.filter(ImageFilter.MinFilter(5)))
    wrong = ImageChops.subtract(ImageChops.subtract(ImageChops.difference(caught, drawn), body), edge)
    stray = wrong.histogram()[255]
    check("shadow polygon vs catcher", stray == 0, f"{stray} px differ by more than 2 px outside the cube")


def main() -> int:
    wall = 1.0 * 0.866 * L.ISO["pxPerUnit"]
    failures = []
    report = []

    def check(label, ok, detail):
        report.append(f"{'ok  ' if ok else 'FAIL'} {label}: {detail}")
        if not ok:
            failures.append(label)

    cases = []
    for name, canvas in L.ISO["canvases"].items():
        scale = canvas.get("pxScale", 1)
        fw, fh = canvas["footprint"]
        if canvas["anchor"] == "footprintBottom":
            cases.append((name, [fw - 1, fh - 1, 0], [1, 1], scale))
            if fw >= 2 and fh >= 2:
                # In the footprint's bottom corner, so its own bottom corner is the canvas anchor.
                cases.append((name, [fw - 2, fh - 2, 0], [2, 2], scale))
            if [fw, fh] not in ([1, 1], [2, 2]):
                # The whole footprint from (0, 0): its back corner must stay on the canvas too.
                cases.append((name, [0, 0, 0], [fw, fh], scale))
        elif canvas["anchor"] == "cellCenter":
            cases.append((name, [0, 0, 0], [0.5, 0.5], scale))  # bottom corner on the cell centre
        else:
            cases.append((name, [-1, -1, 0], [1, 1], scale))  # bottom corner on the origin
    # The triptych is three building2x2 canvases side by side: nothing new to measure.

    for name, at, size, scale in cases:
        w, h = size
        canvas = L.ISO["canvases"][name]
        s = spec(name, [cube(at, [w, h, 1.0])])
        png = s.with_suffix(".png")
        anchor = L.blender(s, png, lines=False)["anchor"]
        m = measure(png, wall * scale)
        expect_w = S * scale * (w + h) / 2
        label = f"{name} cube {w}x{h}"
        x0, y0, x1, _ = L.alpha(png).point(lambda v: 255 if v >= 128 else 0).getbbox()
        # measure() reads the width on wall rows placed for a square base; an oblong one is read whole.
        width = m["width"] if w == h else x1 - x0
        check(f"{label} width", abs(width - expect_w) <= 1, f"{width:.2f} px, expected {expect_w:.0f}")
        check(f"{label} 2:1", abs(abs(m["slopeL"]) - 0.5) < 0.004 and abs(abs(m["slopeR"]) - 0.5) < 0.004,
              f"slopes {m['slopeL']:.4f} / {m['slopeR']:.4f}")
        check(f"{label} anchor", abs(m["anchor"][0] - anchor[0]) <= 1 and abs(m["anchor"][1] - anchor[1]) <= 1,
              f"measured {m['anchor'][0]:.2f},{m['anchor'][1]:.2f}, spec {anchor}")
        if canvas["anchor"] == "footprintBottom" and at[:2] == [canvas["footprint"][0] - w, canvas["footprint"][1] - h]:
            target = [canvas["w"] / 2, canvas["h"] - L.ISO["anchorMarginPx"]]
            check(f"{label} on canvas anchor", abs(anchor[0] - target[0]) <= 1 and abs(anchor[1] - target[1]) <= 1,
                  f"{anchor} vs {target}")
        if size == canvas.get("footprint"):
            check(f"{label} whole footprint on canvas", x0 > 0 and y0 > 0 and x1 < canvas["w"],
                  f"opaque from x {x0} to {x1} of {canvas['w']}, top at y {y0}")

    # Axis sense: a cube at cell (1,0) and one at (0,1) land where cellToScreen puts them.
    base = L.ISO["canvases"]["building2x2"]
    target = [base["w"] / 2, base["h"] - L.ISO["anchorMarginPx"]]
    for cell in ((1, 0), (0, 1)):
        s = spec("building2x2", [cube([cell[0], cell[1], 0], [1, 1, 1.0])])
        png = s.with_suffix(".png")
        L.blender(s, png, lines=False)
        m = measure(png, wall)
        gx, gy = cell[0] + 1, cell[1] + 1  # the cube's bottom corner
        expect = [target[0] + ((gx - gy) - 0) * S / 2, target[1] + ((gx + gy) - 4) * S / 4]
        check(f"axis cell {cell}", abs(m["anchor"][0] - expect[0]) <= 1 and abs(m["anchor"][1] - expect[1]) <= 1,
              f"measured {m['anchor'][0]:.2f},{m['anchor'][1]:.2f}, cellToScreen {expect}")

    # Outline present, and the render reproducible to the byte.
    s = spec("building2x2", [cube([0, 0, 0], [2, 2, 1.0])])
    first, second = s.with_suffix(".png"), s.with_name(s.stem + "_again.png")
    L.blender(s, first)
    L.blender(s, second)
    h1, h2 = (hashlib.sha256(p.read_bytes()).hexdigest() for p in (first, second))
    check("same hash twice", h1 == h2, f"{h1[:12]} / {h2[:12]}")
    image = L.Image.open(first).convert("RGB")
    y = int(target[1] - 96 - wall / 2)  # half-way up the left wall
    row = [image.getpixel((x, y)) for x in range(base["w"])]
    dark = [x for x, p in enumerate(row) if (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255 < 0.2]
    first_opaque = next(x for x in range(base["w"]) if L.alpha(first).getpixel((x, y)) >= 128)
    run = [x for x in dark if first_opaque <= x < first_opaque + 12]
    check("outline visible", len(run) >= 3, f"{len(run)} dark px at the left wall edge, row {y}")

    light_checks(check, target, wall)

    print("\n".join(report))
    (OUT / "g0-report.txt").write_text("\n".join(report) + "\n")
    print(f"\nG0: {'PASS' if not failures else 'FAIL ' + ', '.join(failures)}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
