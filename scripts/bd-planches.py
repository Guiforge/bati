"""The comic page each exercise ships as its one picture (Guillaume, 12/11: "tous les exercices en mode planche de BD",
the flip-books dropped): 2 to 4 of the movement's key poses in panels, in reading order = the movement's order, slanted
white gutters, thin black borders, numbered. Square, so it takes the app's square art slots unchanged. No generation:
the panels are the key poses drawn by scripts/anim-pilot-v3.py (the frames the flip-book branch shipped, kept in the
pilot cache) or the earlier pilots' validated flip-books.

    ~/.cache/bati-cutout-venv/bin/python -I scripts/bd-planches.py <out-dir>   # then copy <slug>.webp over the stills

The body box comes from a birefnet cutout (rembg; the venv is uv + Python 3.12), cached by picture hash.
"""
import json
import pathlib
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageSequence, ImageStat

ROOT = pathlib.Path(__file__).resolve().parent.parent
PILOT = pathlib.Path.home() / ".cache" / "bati-anim-pilot-v3"
FRAMES = PILOT / "app_frames"  # <slug>/k<i>.webp and manifest.json, as assets/images/exercises/anim/ had them
SITE = PILOT / "site"  # <slug>/cuts.webp, the earlier pilots' flip-books
MASKS = PILOT / "masks"
MANIFEST = json.loads((FRAMES / "manifest.json").read_text())
W = 720  # every page is square: laid out at 720, drawn at S times
S = 1.5
GUTTER, BORDER, TILT = 12, 3, 34
WHITE, INK = (255, 255, 255), (0, 0, 0)
# The outer margin is the app's own background (rawColors.bgDark): a white frame against the dark
# screen was the brightest thing on it, and the hero's fades turned it into grey wedges. The
# gutters between panels stay white (Guillaume's choice).
FRAME = (12, 13, 17)
# The bottom row of panels keeps its lowest part for the exercise name the hero paints there and
# for its bottom fade: the figures stay above it, or the plate hides the feet and hands.
RESERVE = 0.22  # of the body box's height, added below it


def corners(im):
    w, h = im.size
    b = w // 8
    boxes = [(0, 0, b, b), (w - b, 0, w, b), (0, h - b, b, h), (w - b, h - b, w, h)]
    s = [ImageStat.Stat(im.crop(x)).mean for x in boxes]
    return [sum(v[c] for v in s) / 4 for c in range(3)]


def matched(frames):
    """Every frame shifted per channel so its corners match the first frame's: the panels share one background."""
    ref = corners(frames[0])
    out = []
    for im in frames:
        d = [r - c for r, c in zip(ref, corners(im))]
        out.append(Image.merge("RGB", [ch.point(lambda v, k=k: max(0, min(255, round(v + d[k])))) for k, ch in enumerate(im.split())]))
    return out


def cover(im, box, size):
    """Crop `im` around `box` to the aspect of `size` (growing the box, never cutting the figure) and resize."""
    bw, bh = box[2] - box[0], box[3] - box[1]
    tw, th = size
    if bw / bh < tw / th:
        nw, nh = bh * tw / th, bh
    else:
        nw, nh = bw, bw * th / tw
    x0, y0 = (box[0] + box[2]) / 2 - nw / 2, (box[1] + box[3]) / 2 - nh / 2
    # Keep inside the picture where possible; a crop larger than the picture stays centred on the body instead.
    x0 = min(max(0, x0), im.width - nw) if nw <= im.width else x0
    y0 = min(max(0, y0), im.height - nh) if nh <= im.height else y0
    crop = (round(x0), round(y0), round(x0 + nw), round(y0 + nh))
    # Wider or taller than the picture: the rest is the picture's own background, never black.
    canvas = Image.new("RGB", (crop[2] - crop[0], crop[3] - crop[1]), tuple(round(c) for c in corners(im)))
    canvas.paste(im, (-crop[0], -crop[1]))
    return canvas.resize(size, Image.LANCZOS), crop


# Which of the movement's distinct positions to show (indices in their order of appearance), and the layout.
# Default: the start and the position farthest from it. Layouts: "stack"/"side" (2), "top1" (1 big, then 2|3),
# "bottom3" (1|2, then 3 big), "grid" (2x2).
CONFIG = {
    "archer_pushup": ([0, 3, 0, 6], "rows"),  # centre, one side, centre again, the other: the alternation reads
    "windshield_wipers": ([0, 2, 4], "top1"),
    "jump_squat": ([0, 2, 3], "bottom3"),
    "skater_hop": ([0, 1], None),
    "bicycle_crunch": ([0, 1, 2], "top1"),
    "worlds_greatest_stretch": ([0, 2], None),
    "burpee": ([0, 1, 2, 3], "grid"),
    "muscle_up": ([0, 1, 2, 4], "grid"),
    "bear_crawl": ([1, 2], None),
    "mountain_climber": ([0, 1, 2], "rows"),  # one knee in, both feet down, the other knee in
    "toes_to_bar": ([0, 2, 3], "bottom3"),
    "cat_cow": ([1, 3], None),  # the two extremes: back hollow, back rounded
    "single_leg_deadlift": ([0, 3], "split"),
}
# Each panel framed on its own body, not one camera for the page: the positions differ too much in height.
OWN_CROP = {"muscle_up", "toes_to_bar", "single_leg_deadlift"}
# Jump arrows, in the panel's own fractions: (panel index, start, end).
JUMPS = {"star_jump": [(1, (0.13, 0.78), (0.13, 0.30))], "skater_hop": [(1, (0.82, 0.93), (0.25, 0.93))]}


def distinct_frames(slug):
    """The movement's distinct positions, in the order the loop first shows them."""
    if slug in MANIFEST:
        steps = MANIFEST[slug]
        order = list(dict.fromkeys(i for i, _ in steps))
        frames = [Image.open(FRAMES / slug / f"k{i + 1}.webp").convert("RGB") for i in order]
    else:
        raw = [f.convert("RGB").resize((480, 480), Image.LANCZOS) for f in ImageSequence.Iterator(Image.open(SITE / slug / "cuts.webp"))]
        seen, frames = set(), []
        for f in raw:
            key = f.resize((32, 32)).tobytes()
            if key not in seen:
                seen.add(key)
                frames.append(f)
    return matched(frames)


def choose(slug, frames):
    idx, layout = CONFIG.get(slug, (None, None))
    if layout == "rows" and len(idx) == 4:
        layout = "grid"  # four bands in a square leave each body a sliver
    if idx is None:
        def far(a, b):
            return sum(ImageChops.difference(a, b).convert("L").resize((64, 64)).getdata())
        idx = [0, max(range(1, len(frames)), key=lambda j: far(frames[0], frames[j]))] if len(frames) > 1 else [0]
    picks = [frames[min(i, len(frames) - 1)] for i in idx]
    box = union_box(picks)
    wide = (box[2] - box[0]) > 1.15 * (box[3] - box[1])
    if layout is None:
        layout = "stack" if wide else "side"
    elif layout == "top1" and wide:
        layout = "rows"  # two narrow panels side by side squeeze a wide body
    return picks, layout


def body_box(im, pad=16):
    """The body's box from a birefnet cutout (cached): a colour-difference mask took light vignettes and shadows for
    the body, which left a band of nothing under the feet."""
    import hashlib
    MASKS.mkdir(parents=True, exist_ok=True)
    f = MASKS / (hashlib.sha1(im.tobytes()).hexdigest()[:16] + ".png")
    if not f.exists():
        from rembg import new_session, remove
        global _SESSION
        if "_SESSION" not in globals():
            _SESSION = new_session("birefnet-general")
        remove(im, session=_SESSION, only_mask=True).save(f)
    x0, y0, x1, y1 = Image.open(f).point(lambda v: 255 if v > 128 else 0).getbbox() or (0, 0, *im.size)
    return (max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad))


def union_box(picks):
    """One crop for every panel of a page: the camera does not move between panels."""
    boxes = [body_box(p) for p in picks]
    return (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))


def arrow(d, a, b, w=None):
    """A fat comic arrow, white with a black ink outline, like the gutters and borders."""
    import math
    ang = math.atan2(b[1] - a[1], b[0] - a[0])
    ux, uy, px, py = math.cos(ang), math.sin(ang), -math.sin(ang), math.cos(ang)
    w = w or 16 * S
    hl, hw = 46 * S, 30 * S  # head length, head half-width
    n = (b[0] - hl * ux, b[1] - hl * uy)
    shape = [(a[0] + px * w / 2, a[1] + py * w / 2), (n[0] + px * w / 2, n[1] + py * w / 2), (n[0] + px * hw, n[1] + py * hw), b,
             (n[0] - px * hw, n[1] - py * hw), (n[0] - px * w / 2, n[1] - py * w / 2), (a[0] - px * w / 2, a[1] - py * w / 2)]
    d.polygon(shape, fill=WHITE, outline=INK, width=round((BORDER + 1) * S))


def layouts(name, aspect=1.0, n=3):
    """Panel polygons in page coordinates, in reading order; the page height. `aspect` is the movement's width over
    height (the union of its positions): the 2-panel pages take the height that fits it, not a fixed one."""
    g, t = GUTTER, TILT
    L, R = g, W - g
    if name == "rows":  # n wide bands, for a movement that spreads sideways; the gutters slant one way, then the other
        each = (W - (n + 1) * g) / n
        H = round(n * each + (n + 1) * g)
        cuts = [g + k * (each + g) - g / 2 for k in range(1, n)]
        edges = [((L, g), (R, g))] + [((L, y + (t / 2 if k % 2 == 0 else -t / 2)), (R, y - (t / 2 if k % 2 == 0 else -t / 2)))
                                       for k, y in enumerate(cuts)] + [((L, H - g), (R, H - g))]
        polys = []
        for k in range(n):
            (a0, b0), (a1, b1) = edges[k], edges[k + 1]
            top = g / 2 if k else 0
            bot = g / 2 if k < n - 1 else 0
            polys.append([(a0[0], a0[1] + top), (b0[0], b0[1] + top), (b1[0], b1[1] - bot), (a1[0], a1[1] - bot)])
        return polys, H
    if name == "stack":
        each = (W - 3 * g) / 2
        H = round(2 * each + 3 * g)
        mid = H / 2
        return [[(L, g), (R, g), (R, mid - t - g / 2), (L, mid + t - g / 2)],
                [(L, mid + t + g / 2), (R, mid - t + g / 2), (R, H - g), (L, H - g)]], H
    if name == "split":  # a narrow panel for a standing body, a wide one for the body that tips over
        H = W
        mx = W * 0.36
        return [[(L, g), (mx + t - g / 2, g), (mx - t - g / 2, H - g), (L, H - g)],
                [(mx + t + g / 2, g), (R, g), (R, H - g), (mx - t + g / 2, H - g)]], H
    if name == "side":
        H = W
        mx = W / 2
        return [[(L, g), (mx + t - g / 2, g), (mx - t - g / 2, H - g), (L, H - g)],
                [(mx + t + g / 2, g), (R, g), (R, H - g), (mx - t + g / 2, H - g)]], H
    H = W
    if name == "top1":  # 1 big on top, then 2 | 3
        y = H * 0.55
        mx = W / 2
        top = [(L, g), (R, g), (R, y - t - g / 2), (L, y + t - g / 2)]
        p2 = [(L, y + t + g / 2), (mx - g / 2 + 10, y + g / 2 + 4), (mx - g / 2 - 14, H - g), (L, H - g)]
        p3 = [(mx + g / 2 + 10, y + g / 2 + 4), (R, y - t + g / 2), (R, H - g), (mx + g / 2 - 14, H - g)]
        return [top, p2, p3], H
    if name == "bottom3":  # 1 | 2 on top, then 3 big
        y = H * 0.42
        mx = W / 2
        p1 = [(L, g), (mx - g / 2 + 14, g), (mx - g / 2 - 10, y - g / 2 + 4), (L, y - t - g / 2)]
        p2 = [(mx + g / 2 + 14, g), (R, g), (R, y + t - g / 2), (mx + g / 2 - 10, y - g / 2 + 4)]
        p3 = [(L, y - t + g / 2), (mx, y + g / 2 + 4), (R, y + t + g / 2), (R, H - g), (L, H - g)]
        return [p1, p2, p3], H
    if name == "grid":  # 2 x 2, the gutters slightly off square
        y, mx = H / 2, W / 2
        a, b = 18, 12
        return [[(L, g), (mx + b - g / 2, g), (mx - b - g / 2, y + a - g / 2), (L, y - a - g / 2)],
                [(mx + b + g / 2, g), (R, g), (R, y + a - g / 2 + 10), (mx - b + g / 2, y + a - g / 2)],
                [(L, y - a + g / 2), (mx - b - g / 2, y + a + g / 2), (mx + b - g / 2, H - g), (L, H - g)],
                [(mx - b + g / 2, y + a + g / 2), (R, y + a + g / 2 + 10), (R, H - g), (mx + b + g / 2, H - g)]], H
    raise ValueError(name)


def badge(d, xy, n):
    x, y = xy
    r = 20 * S  # readable at the instructions sheet's ~300 dp
    d.ellipse((x - r, y - r, x + r, y + r), fill=INK, outline=WHITE, width=round(2 * S))
    f = None
    for path in ("/usr/share/fonts/google-noto/NotoSans-Bold.ttf", "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans-Bold.ttf"):
        if pathlib.Path(path).exists():
            f = ImageFont.truetype(path, round(25 * S))
            break
    tw = d.textlength(str(n), font=f)
    d.text((x - tw / 2, y - 16 * S), str(n), font=f, fill=WHITE)


def page(slug, numbers):
    frames = distinct_frames(slug)
    picks, layout = choose(slug, frames)
    box = union_box(picks)
    polys, H = layouts(layout, (box[2] - box[0]) / (box[3] - box[1]), len(picks))
    polys = [[(x * S, y * S) for x, y in poly] for poly in polys[:len(picks)]]
    out = Image.new("RGB", (round(W * S), round(H * S)), WHITE)
    d = ImageDraw.Draw(out)
    for k, (im, poly) in enumerate(zip(picks, polys)):
        xs, ys = [p[0] for p in poly], [p[1] for p in poly]
        rect = (round(min(xs)), round(min(ys)), round(max(xs)), round(max(ys)))
        size = (rect[2] - rect[0], rect[3] - rect[1])
        b = body_box(im) if slug in OWN_CROP else box
        # The slanted edges eat up to TILT pixels of the panel: keep the body clear of them.
        k_y = (b[3] - b[1]) / size[1]
        k_x = (b[2] - b[0]) / size[0]
        b = (b[0] - TILT * S * k_x, b[1] - TILT * S * k_y, b[2] + TILT * S * k_x, b[3] + TILT * S * k_y)
        if rect[3] >= (H - GUTTER - 1) * S:  # a bottom-row panel
            b = (b[0], b[1], b[2], b[3] + (b[3] - b[1]) * RESERVE)
        img, _ = cover(im, b, size)
        mask = Image.new("L", out.size, 0)
        ImageDraw.Draw(mask).polygon(poly, fill=255)
        layer = Image.new("RGB", out.size, WHITE)
        layer.paste(img, rect[:2])
        out.paste(layer, (0, 0), mask)
    for k, a, b in JUMPS.get(slug, []):
        xs, ys = [p[0] for p in polys[k]], [p[1] for p in polys[k]]
        x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
        arrow(d, (x0 + a[0] * (x1 - x0), y0 + a[1] * (y1 - y0)), (x0 + b[0] * (x1 - x0), y0 + b[1] * (y1 - y0)))
    g = GUTTER * S
    for edge in ((0, 0, out.width, g), (0, out.height - g, out.width, out.height), (0, 0, g, out.height),
                 (out.width - g, 0, out.width, out.height)):
        d.rectangle(edge, fill=FRAME)
    for k, poly in enumerate(polys):
        d.polygon(poly, outline=INK, width=round(BORDER * S))
        if numbers:
            x0, y0 = min(poly, key=lambda q: q[0] + q[1])  # the panel's top-left vertex, whatever the slant
            badge(d, (x0 + 36 * S, y0 + 36 * S), k + 1)
    return out, layout, len(picks)


if __name__ == "__main__":
    out = pathlib.Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    slugs = sorted(set(MANIFEST) | {p.parent.name for p in SITE.glob("*/cuts.webp")})
    # The dead bug and the bicycle crunch keep main's still until their redraw is validated.
    slugs = [s for s in slugs if (ROOT / "assets" / "images" / "exercises" / f"{s}.webp").exists()
             and s not in ("towel_door_row", "dead_bug", "bicycle_crunch")]
    for slug in slugs:
        im, layout, n = page(slug, True)
        im.save(out / f"{slug}.webp", quality=88)
        print(slug, layout, n, im.size)
