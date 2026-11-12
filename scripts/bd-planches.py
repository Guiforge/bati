"""The comic page each exercise ships as its one picture (Guillaume, 12/11: "tous les exercices en mode planche de BD",
the flip-books dropped): 2 to 4 of the movement's key poses in panels, in reading order = the movement's order, slanted
white gutters, thin black borders, numbered. Square, so it takes the app's square art slots unchanged. No generation:
the panels are the key poses drawn by scripts/anim-pilot-v3.py (the frames the flip-book branch shipped, kept in the
pilot cache) or the earlier pilots' validated flip-books.

    ~/.cache/bati-cutout-venv/bin/python -I scripts/bd-planches.py <out-dir>   # then copy <slug>.webp over the stills
    ~/.cache/bati-cutout-venv/bin/python -I scripts/bd-planches.py --thumbs [slug...]   # their list thumbnails

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
# Frames redrawn after the flip-book shipped, by frame index: toes to bar's top had its shoes on backwards
# (Guillaume, 12/11), redrawn by FLUX 3 from that frame, logged in the pilot ledger (step feet-fix).
REDRAWN = {"toes_to_bar": {3: "feet_fix/toes_to_bar/flux1.png"}}
# Key poses picked for the page alone (k1, k2... in order), for the movements whose flip-book never passed
# (Guillaume, 12/11). Takes precedence over the flip-book. Dead bug: start, one side, the other, drawn by gpt-image-2.6
# on a jointed mannequin seen from the side (step 1 the mannequin, step 2 one side, both validated before the rest).
# Bicycle crunch: main's still, then the other side redrawn from it on the v15c mannequin, mirrored to face the same way.
BD_SRC = PILOT / "bd_src"
STILLS = PILOT / "stills"  # <slug>.webp, main's single illustration where it reads better than a page
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


def extended(im, feather=40, band=10):
    """`im` in the middle of a 3x3 canvas whose outer cells stretch its outermost rows and columns (the floor goes on
    down, the wall goes on up), blurred and faded into the picture's edges. Mirroring brought ghost limbs back in.
    The body is left out of everything that is stretched or blurred, and stays sharp: a head near the edge otherwise
    came back as a glow around it (Guillaume, 12/11)."""
    from PIL import ImageFilter
    w, h = im.size
    body = body_mask(im)
    ground = Image.composite(Image.new("RGB", im.size, tuple(round(c) for c in corners(im))), im,
                             body.point(lambda v: 255 if v > 64 else 0).filter(ImageFilter.MaxFilter(15)))
    def line(box, size):  # a band of edge pixels averaged to one line, stretched over a cell
        b = ground.crop(box)
        return b.resize((b.width, 1) if size[0] == w else (1, b.height), Image.BOX).resize(size, Image.BILINEAR)
    big = Image.new("RGB", (3 * w, 3 * h))
    big.paste(line((0, 0, w, band), (w, h)), (w, 0))
    big.paste(line((0, h - band, w, h), (w, h)), (w, 2 * h))
    big.paste(line((0, 0, band, h), (w, h)), (0, h))
    big.paste(line((w - band, 0, w, h), (w, h)), (2 * w, h))
    for (x, y), c in {(0, 0): (0, 0), (2, 0): (w - 1, 0), (0, 2): (0, h - 1), (2, 2): (w - 1, h - 1)}.items():
        big.paste(ground.getpixel(c), (x * w, y * h, (x + 1) * w, (y + 1) * h))
    big.paste(ground, (w, h))
    blurred = big.filter(ImageFilter.GaussianBlur(24))
    big.paste(im, (w, h))
    mask = Image.new("L", big.size, 0)
    ImageDraw.Draw(mask).rectangle((w + feather, h + feather, 2 * w - feather, 2 * h - feather), fill=255)
    keep = Image.new("L", big.size, 0)
    keep.paste(body.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(2)), (w, h))
    return Image.composite(big, blurred, ImageChops.lighter(mask.filter(ImageFilter.GaussianBlur(feather / 2)), keep))


def cover(im, box, size, shift=None, extend=False):
    """Crop `im` around `box` to the aspect of `size` (growing the box, never cutting the figure) and resize."""
    bw, bh = box[2] - box[0], box[3] - box[1]
    tw, th = size
    if bw / bh < tw / th:
        nw, nh = bh * tw / th, bh
    else:
        nw, nh = bw, bw * th / tw
    x0, y0 = (box[0] + box[2]) / 2 - nw / 2, (box[1] + box[3]) / 2 - nh / 2
    free = shift is not None
    if free:  # move the body by a fraction of the panel: the crop goes the other way
        x0, y0 = x0 - shift[0] * nw, y0 - shift[1] * nh
    # Keep inside the picture where possible; a crop larger than the picture stays centred on the body instead.
    want = (x0, y0)
    # Kept inside the picture, a hand-tuned shift included (TUNE gives it room with a little zoom): continuing the
    # picture past its edge blurred the bodies that touch it (Guillaume, 12/11). Only EXTEND pages go past it.
    x0 = min(max(0, x0), im.width - nw) if nw <= im.width and not extend else x0
    y0 = min(max(0, y0), im.height - nh) if nh <= im.height and not extend else y0
    crop = (round(x0), round(y0), round(x0 + nw), round(y0 + nh))
    if free and not extend and abs((x0 - want[0]) / nw) + abs((y0 - want[1]) / nh) > 0.01:
        print(f"  shift cut short by {(x0 - want[0]) / nw:+.2f}, {(y0 - want[1]) / nh:+.2f}")
    # Wider or taller than the picture: the rest continues the picture's own ground, mirrored and blurred, and
    # fades into it. A flat fill of the corners' colour read as a grey bar under the feet (Guillaume, 12/11).
    inside = crop[0] >= 0 and crop[1] >= 0 and crop[2] <= im.width and crop[3] <= im.height
    if inside or not extend:
        # A body touching the picture's edge smears when stretched: elsewhere the overflow stays the corners' colour.
        canvas = Image.new("RGB", (crop[2] - crop[0], crop[3] - crop[1]), tuple(round(c) for c in corners(im)))
        canvas.paste(im, (-crop[0], -crop[1]))
    else:
        canvas = extended(im).crop((crop[0] + im.width, crop[1] + im.height, crop[2] + im.width, crop[3] + im.height))
    return canvas.resize(size, Image.LANCZOS), crop


# Which of the movement's distinct positions to show (indices in their order of appearance), and the layout.
# Default: the start and the position farthest from it. Layouts: "stack"/"side" (2), "top1" (1 big, then 2|3),
# "bottom3" (1|2, then 3 big), "grid" (2x2).
CONFIG = {
    "archer_pushup": ([0, 3, 0, 6], "rows"),  # centre, one side, centre again, the other: the alternation reads
    "windshield_wipers": ([0, 2, 4], "top1"),
    "jump_squat": ([0, 2, 3], "bottom3"),
    "reverse_crunch": ([0, 1], "stack"),  # one above the other: a lying body gets the width
    "skater_hop": ([0, 2], None),  # landing on one leg, then on the other (1 was both feet down)
    "bicycle_crunch": ([0, 1], None),  # main's twist, then the other side (bd_src)
    "dead_bug": ([0, 1, 0, 2], "rows"),  # start, one side, start again, the other (bd_src), like the archer push-up
    "worlds_greatest_stretch": ([0, 2], None),
    "burpee": ([0, 1, 2, 3], "grid"),
    "muscle_up": ([0, 1, 2, 4], "grid"),
    "bear_crawl": ([1, 2], None),
    "mountain_climber": ([0, 1, 2], "rows"),  # one knee in, both feet down, the other knee in
    "toes_to_bar": ([0, 2, 3], "bottom3"),
    "hanging_leg_raise": ([0, 3], None),  # legs level, the top of the raise (2 was halfway)
    "negative_pullup": ([0, 1], "straight"),  # Guillaume, 12/11: both centred, a straight gutter
    "cat_cow": ([1, 3], None),  # the two extremes: back hollow, back rounded
    "single_leg_deadlift": ([0, 3], "split"),
}
# Each panel framed on its own body, not one camera for the page: the positions differ too much in height.
OWN_CROP = {"muscle_up", "toes_to_bar", "single_leg_deadlift", "jump_squat", "bicycle_crunch"}
# One camera for the page, but each panel centred on its own body's mass (a bar's width does not count).
CENTRE_OWN = {"negative_pullup"}
# Jump arrows, in the panel's own fractions: (panel index, start, end). None since Guillaume's review of 12/11
# ("enlève la flèche"): the two poses say the jump on their own.
JUMPS: dict = {}
# Per-panel framing from Guillaume's review of 12/11, one entry per panel in reading order: (zoom, dx, dy). zoom > 1
# draws the body bigger; dx, dy move it right and down by that fraction of the panel. Mostly a body too close to a
# panel border, or too small in its panel.
# The ground continued past the picture (extended()) where a flat fill showed as a band: Guillaume's review, 12/11.
EXTEND = {"curtsy_squat", "wall_pushup", "star_jump", "jump_squat", "thread_the_needle", "skater_hop",
          "russian_twist", "single_leg_glute_bridge", "chin_up", "pullups", "hanging_leg_raise", "knee_pushup", "muscle_up", "jumping_jack", "dead_bug", "bicycle_crunch"}
TUNE = {
    "bear_crawl": [None, (1, 0, 0.11)],
    "chin_up": [(1.25, 0, 0), (1.25, 0.08, 0.03)],
    "crunch": [(1, 0, -0.05), (1, 0, 0.09)],
    "diamond_pushup": [None, (1, 0, 0.04)],
    "dead_bug": [(1.15, 0.05, 0.06), (1.15, 0.01, 0.06), (1.15, 0.05, 0.06), (1.15, 0.01, 0.06)],
    "jumping_jack": [None, (1, 0.03, 0)],
    "flutter_kicks": [None, (1, 0, 0.06)],
    "hanging_leg_raise": [(1.2, 0, 0.03), (1.1, -0.04, 0.03)],
    "high_knees": [(1.12, 0, 0.03), (1.12, 0, 0.03)],
    "jump_squat": [(1.35, 0, 0.02), (1.3, 0, 0.02), (1.1, 0.05, 0.12)],
    "muscle_up": [(1.35, 0, 0.05), (1.35, 0, 0.02), (1.35, 0, 0.19), (1.35, 0, 0.13)],
    "negative_pullup": [(1.4, 0, 0.03), (1.4, 0, 0.02)],
    "pullups": [(1.35, 0, 0.03), (1.35, 0, 0.03)],
    "reverse_crunch": [(1.1, 0, 0), (1.1, 0, 0)],
    "russian_twist": [None, (1.12, 0, 0.11)],
    "single_leg_glute_bridge": [None, (1, 0, 0.07)],
    "skater_hop": [(1.4, 0.145, 0.02), (1.4, -0.16, 0.02)],
    "thread_the_needle": [(1.15, 0, 0), (1.25, 0, 0)],
    "toes_to_bar": [None, None, (1.25, 0, 0.07)],
    "windshield_wipers": [(0.92, 0, -0.03), (1, 0.03, 0), None],
}


def distinct_frames(slug):
    """The movement's distinct positions, in the order the loop first shows them."""
    if (BD_SRC / slug).is_dir():
        frames = [Image.open(f).convert("RGB") for f in sorted((BD_SRC / slug).glob("k*.webp"))]
    elif slug in MANIFEST:
        steps = MANIFEST[slug]
        order = list(dict.fromkeys(i for i, _ in steps))
        frames = [Image.open(FRAMES / slug / f"k{i + 1}.webp").convert("RGB") for i in order]
        for i, f in REDRAWN.get(slug, {}).items():  # a frame redrawn since, at the frame's own size
            frames[order.index(i)] = Image.open(PILOT / f).convert("RGB").resize(frames[0].size, Image.LANCZOS)
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


def body_mask(im):
    """The body's mask from a birefnet cutout, cached by picture hash."""
    import hashlib
    MASKS.mkdir(parents=True, exist_ok=True)
    f = MASKS / (hashlib.sha1(im.tobytes()).hexdigest()[:16] + ".png")
    if not f.exists():
        from rembg import new_session, remove
        global _SESSION
        if "_SESSION" not in globals():
            _SESSION = new_session("birefnet-general")
        remove(im, session=_SESSION, only_mask=True).save(f)
    return Image.open(f).convert("L")


def body_box(im, pad=16):
    """The body's box from a birefnet cutout (cached): a colour-difference mask took light vignettes and shadows for
    the body, which left a band of nothing under the feet."""
    x0, y0, x1, y1 = body_mask(im).point(lambda v: 255 if v > 128 else 0).getbbox() or (0, 0, *im.size)
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
    if name in ("side", "straight"):  # "straight": an upright gutter, for two panels that must both be centred
        H = W
        mx = W / 2
        t = 0 if name == "straight" else t
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


# Main's single illustration kept, with a two-way arrow along the movement, where Guillaume found it read better
# than a page (12/11): (start, end) in fractions of the picture.
STILL_ARROWS = {"standing_calf_raise": ((0.80, 0.69), (0.80, 0.41))}


def double_arrow(d, a, b):
    """The comic arrow with a head at both ends: up and down, the way the heels go."""
    import math
    ang = math.atan2(b[1] - a[1], b[0] - a[0])
    ux, uy, px, py = math.cos(ang), math.sin(ang), -math.sin(ang), math.cos(ang)
    w, hl, hw = 16 * S, 46 * S, 30 * S
    na, nb = (a[0] + hl * ux, a[1] + hl * uy), (b[0] - hl * ux, b[1] - hl * uy)
    side = lambda q, k: (q[0] + px * k, q[1] + py * k)
    shape = [a, side(na, hw), side(na, w / 2), side(nb, w / 2), side(nb, hw), b,
             side(nb, -hw), side(nb, -w / 2), side(na, -w / 2), side(na, -hw)]
    d.polygon(shape, fill=WHITE, outline=INK, width=round((BORDER + 1) * S))


def still_page(slug):
    out = Image.open(STILLS / f"{slug}.webp").convert("RGB").resize((round(W * S), round(W * S)), Image.LANCZOS)
    a, b = STILL_ARROWS[slug]
    double_arrow(ImageDraw.Draw(out), (a[0] * out.width, a[1] * out.height), (b[0] * out.width, b[1] * out.height))
    return out, "still", 1


def page(slug, numbers):
    if slug in STILL_ARROWS:
        return still_page(slug)
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
        if slug in CENTRE_OWN:
            cols = body_mask(im).point(lambda v: 1 if v > 128 else 0).resize((im.width, 1), Image.BOX)
            weights = list(cols.getdata())
            cx = sum(i * v for i, v in enumerate(weights)) / max(1, sum(weights))
            half = (b[2] - b[0]) / 2
            b = (cx - half, b[1], cx + half, b[3])
        # The slanted edges eat up to TILT pixels of the panel: keep the body clear of them.
        k_y = (b[3] - b[1]) / size[1]
        k_x = (b[2] - b[0]) / size[0]
        b = (b[0] - TILT * S * k_x, b[1] - TILT * S * k_y, b[2] + TILT * S * k_x, b[3] + TILT * S * k_y)
        if rect[3] >= (H - GUTTER - 1) * S:  # a bottom-row panel
            b = (b[0], b[1], b[2], b[3] + (b[3] - b[1]) * RESERVE)
        t = TUNE.get(slug, [])
        zoom, dx, dy = t[k] if k < len(t) and t[k] else (1, 0, 0)
        bw, bh = (b[2] - b[0]) / zoom, (b[3] - b[1]) / zoom
        cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
        b = (cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2)
        img, _ = cover(im, b, size, (dx, dy) if (zoom, dx, dy) != (1, 0, 0) else None, slug in EXTEND)
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


# The list thumbnail is one panel of the page, not the page (four panels do not read at 36-56 px) and not the
# still the page replaced (Guillaume, 12/11: some poses moved a lot, the old still looked like another exercise).
# Default: the last panel, where the movement arrives.
THUMB_PANEL: dict[str, int] = {"burpee": 2, "muscle_up": 2}  # the plank; the chest passing over the bar
THUMBS = ROOT / "assets" / "images" / "exercises" / "thumbs"


def thumb(slug, size=128):
    frames = distinct_frames(slug)
    picks, _ = choose(slug, frames)
    im = picks[THUMB_PANEL.get(slug, -1)]
    b = body_box(im, pad=12)
    side = max(b[2] - b[0], b[3] - b[1]) * 1.06
    cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
    sq, _ = cover(im, (cx - side / 2, cy - side / 2, cx + side / 2, cy + side / 2), (size * 2, size * 2),
                  None, slug in EXTEND)
    return sq.resize((size, size), Image.LANCZOS)


if __name__ == "__main__" and sys.argv[1:2] == ["--thumbs"]:
    slugs = sys.argv[2:] or sorted(set(MANIFEST) | {p.parent.name for p in SITE.glob("*/cuts.webp")})
    slugs = [s for s in slugs if (ROOT / "assets" / "images" / "exercises" / f"{s}.webp").exists()
             and s != "towel_door_row" and s not in STILL_ARROWS]
    for slug in slugs:
        thumb(slug).save(THUMBS / f"{slug}.webp", "WEBP", quality=82)
        print(slug)
elif __name__ == "__main__":
    out = pathlib.Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    slugs = sys.argv[2:] or sorted(set(MANIFEST) | {p.parent.name for p in SITE.glob("*/cuts.webp")})
    slugs = [s for s in slugs if (ROOT / "assets" / "images" / "exercises" / f"{s}.webp").exists() and s != "towel_door_row"]
    for slug in slugs:
        im, layout, n = page(slug, True)
        im.save(out / f"{slug}.webp", quality=88)
        print(slug, layout, n, im.size)
