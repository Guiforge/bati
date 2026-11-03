#!/usr/bin/env python3
"""U3 films: three moving concepts of the building upgrade moment, offline mockups on the real sprites.

    u3_films.py all            # 3 films x (day, night) x (capture zoom, default zoom) = 12 mp4, 3 contact sheets, films.json
    u3_films.py one <film> <ambiance> <zoom>

Films: case (La Case), jour (Contre-jour), mixte (La Case below legendary, Contre-jour on legendary and mythic).
Each film plays three scenes: forge stage solid -> grand, forge rank 3 -> 4 (the chimney base piece), castle_wall stage
grand -> legendary. Before the tap: the scaffold stands still with a hammer above it (800 ms); the tap dot; the moment, in the ms
of docs/designs/village/life/scratch/u3/idees.md (Contre-jour shortened to 1000 ms); 1 s of rest.
World scale (device px per canvas px): ZOOM / 3 * DPR, 3 = 384 px canvas cell / 128 dp cellDp, DPR 2.625. The capture zoom is
ZOOM_CAPTURE 0.6 (checked on the u2 capture: the forge is 0.52 px per canvas px there). The default zoom, 0.3, is measured on the
u2 start capture, where the island is framed.
Pieces: docs/designs/village/life/scratch/u3/pieces (FLUX 3 Image), scaffold: assets/images/village/iso/pieces (painted).
"""
import json
import pathlib
import subprocess
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[2]
U3 = ROOT / "docs/designs/village/life/scratch/u3"
PIECES, FILMS = U3 / "pieces", U3 / "films"
IMG = ROOT / "assets/images/village/iso"
U2 = ROOT / "docs/designs/village/life/scratch/u2"
FPS, W, H, DPR = 30, 1080, 1080, 2.625
ZOOMS = {"capture": 0.6, "defaut": 0.3}
INK = (15, 21, 24)
VEIL = (15, 42, 107, 0.42)  # isoNuitVoile
BUILD = {"forge": dict(anchor=(448, 1088), scaf="2x2", corners=[(0, 0), (-384, -193), (384, -193)],
                       lights=[((338, 808), 5), ((455, 808), 7), ((445, 180), 10)], stage_rank={"solid": 3, "grand": 5, "legendary": 7}),
         "castle_wall": dict(anchor=(448, 1088), scaf="1x1", corners=[(0, 0), (-108, -68), (237, -123)],
                             lights=[((433, 697), 3), ((615, 583), 3)], stage_rank={"solid": 3, "grand": 5, "legendary": 7, "rough": 1})}
SCAF = {"2x2": ((448, 1280), "echafaudage_2x2"), "1x1": ((256, 704), "echafaudage_1x1")}
TEASER = ("elements/teaser_r4_chimney_base", (272, -90))  # forge rank 4 piece, offset from the anchor (idees / constants)
SCENES = [("forge", "stade", "solid", "grand"), ("forge", "rang", "solid", "solid"), ("castle_wall", "stade", "grand", "legendary")]
FILM_RULE = {"case": lambda stage: "case", "jour": lambda stage: "jour", "mixte": lambda stage: "jour" if stage in ("legendary", "mythic") else "case"}
LABEL = {"case": "La Case", "jour": "Contre-jour", "mixte": "Case + Contre-jour"}
BEFORE, REST = 800, 1000
DURS = {("case", "stade"): 700, ("case", "rang"): 260, ("jour", "stade"): 1000, ("jour", "rang"): 450}
cache: dict = {}


def load(path):
    if path not in cache:
        cache[path] = Image.open(path).convert("RGBA")
    return cache[path]


def sprite(path, k, sx=1.0, sy=1.0):
    im = load(path)
    key = (path, round(k * sx, 4), round(k * sy, 4))
    if key not in cache:
        cache[key] = im.resize((max(1, round(im.width * k * sx)), max(1, round(im.height * k * sy))), Image.LANCZOS)
    return cache[key]


def with_alpha(im, a):
    if a >= 0.999:
        return im
    out = im.copy()
    out.putalpha(im.getchannel("A").point(lambda v: int(v * max(a, 0))))
    return out


def inked(im):
    out = Image.new("RGBA", im.size, INK + (255,))
    out.putalpha(im.getchannel("A"))
    return out


def graded(im):
    """The night veil over a day sprite (isoNuitVoile 42 %): scaffold, dust; the painted night sprites are already graded."""
    r, g, b, a = im.split()
    v = Image.new("RGB", im.size, VEIL[:3])
    rgb = Image.blend(Image.merge("RGB", (r, g, b)), v, VEIL[3])
    rgb.putalpha(a)
    return rgb


def over(cv, im, x, y):
    x, y = round(x), round(y)
    l, t = max(0, x), max(0, y)
    r, b = min(cv.width, x + im.width), min(cv.height, y + im.height)
    if r <= l or b <= t:
        return
    cv.alpha_composite(im.crop((l - x, t - y, r - x, b - y)), (l, t))


def screen(cv, im, x, y, strength=1.0):
    x, y = round(x), round(y)
    l, t = max(0, x), max(0, y)
    r, b = min(cv.width, x + im.width), min(cv.height, y + im.height)
    if r <= l or b <= t:
        return
    sub = im.crop((l - x, t - y, r - x, b - y))
    lit = Image.new("RGB", sub.size, (0, 0, 0))
    lit.paste(sub.convert("RGB"), mask=sub.getchannel("A").point(lambda v: int(v * strength)))
    box = (l, t, r, b)
    cv.paste(ImageChops.screen(cv.crop(box).convert("RGB"), lit), box)


def bbox_of(path):
    return load(path).getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox()


# ------------------------------------------------------------------ background
def background(amb, zoom):
    """The u2 forge capture (real ground, paths, trees) with the old forge, its stones, the villager and the bird painted out by a
    copy of the ground 330 px below; then scaled to the zoom and, past its edges, mirrored."""
    src = U2 / f"forge-stade-{'jour' if amb == 'jour' else 'nuit'}.mp4"
    tmp = U3 / "films" / f"_bg_{amb}.png"
    tmp.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "14.0", "-i", str(src), "-frames:v", "1", str(tmp)], check=True)
    f = Image.open(tmp).convert("RGB")
    for box in ((380, 1000, 790, 1400), (270, 1120, 350, 1230)):
        l, t, r, b = box
        patch = f.crop((l, t + 420, r, b + 420))
        mask = Image.new("L", patch.size, 0)
        ImageDraw.Draw(mask).rectangle((14, 14, patch.width - 14, patch.height - 14), fill=255)
        f.paste(patch, (l, t), mask.filter(ImageFilter.GaussianBlur(10)))
    f.paste(f.crop((430, 1000, 520, 1065)).transform((90, 65), Image.AFFINE, (1, 0, 0, 0, 1, 0)), (430, 1000))  # bird, if still there
    tmp.unlink()
    f = f.crop((0, 140, 1080, 1840))
    a0 = (528, 1250 - 140)
    s = zoom / ZOOMS["capture"]
    if s != 1:
        f = f.resize((round(f.width * s), round(f.height * s)), Image.LANCZOS)
    a = (a0[0] * s, a0[1] * s)
    target = (W / 2, H * 0.58)
    arr = np.asarray(f)
    pad = 1200
    arr = np.pad(arr, ((pad, pad), (pad, pad), (0, 0)), mode="symmetric")
    ox, oy = round(a[0] + pad - target[0]), round(a[1] + pad - target[1])
    return Image.fromarray(arr[oy:oy + H, ox:ox + W]).convert("RGBA"), target


# ------------------------------------------------------------------ the world
class Ctx:
    def __init__(self, amb, zoom, bg):
        self.amb, self.zoom = amb, zoom
        self.k = ZOOMS[zoom] / 3 * DPR
        self.bg, self.A = bg
        self.night = amb == "nuit"

    def new(self):
        self.cv = self.bg.copy()

    def sp(self, b, stage):
        return IMG / "peints" / b / f"{stage}.{'nuit' if self.night else 'jour'}.webp"

    def foot(self, b, dx=0, dy=0):
        return (self.A[0] + dx * self.k, self.A[1] + dy * self.k)

    def body(self, b, stage, sx=1.0, sy=1.0, dy=0.0, ink=0.0, alpha=1.0):
        if alpha <= 0:
            return
        ax, ay = BUILD[b]["anchor"]
        im = sprite(self.sp(b, stage), self.k, sx, sy)
        x, y = self.A[0] - ax * self.k * sx, self.A[1] + dy - ay * self.k * sy
        over(self.cv, with_alpha(im, alpha), x, y)
        if ink > 0:
            over(self.cv, with_alpha(inked(im), ink * alpha), x, y)

    def scaffold(self, b, ink=0.0):
        (ax, ay), name = SCAF[BUILD[b]["scaf"]]
        path = IMG / "pieces" / f"{name}.webp"
        im = sprite(path, self.k)
        if self.night:
            im = graded(im)
        x, y = self.A[0] - ax * self.k, self.A[1] - ay * self.k
        over(self.cv, im, x, y)
        if ink > 0:
            over(self.cv, with_alpha(inked(im), ink), x, y)

    def body_box(self, b, stage):
        l, t, r, bt = bbox_of(self.sp(b, stage))
        ax, ay = BUILD[b]["anchor"]
        return ((l - ax) * self.k, (t - ay) * self.k, (r - ax) * self.k, (bt - ay) * self.k)

    def hammer(self, b, stage):
        l, t, r, bt = self.body_box(b, stage)
        d = max(36, 0.1 * (r - l) + 20)
        cx, cy = self.A[0] + (l + r) / 2, self.A[1] + t - d * 0.9
        im = Image.new("RGBA", (int(d * 4), int(d * 4)), (0, 0, 0, 0))
        g = ImageDraw.Draw(im)
        u = d * 4 / 10
        for poly, col in (([(2.6, 1.2), (7.0, 1.2), (7.0, 3.6), (2.6, 3.6)], (226, 214, 184)), ([(4.4, 3.6), (5.2, 3.6), (5.2, 9.0), (4.4, 9.0)], (214, 200, 168))):
            pts = [(x * u, y * u) for x, y in poly]
            g.polygon(pts, fill=col, outline=INK + (255,), width=max(2, int(d / 9) * 2))
        im = im.resize((int(d), int(d)), Image.LANCZOS)
        if self.night:
            im = graded(im)
        over(self.cv, im, cx - d / 2, cy - d / 2)

    def piece(self, name, cx, cy, w, flip=False, alpha=1.0, dark=0.0, mode="over", strength=1.0, desat=0.0):
        if alpha <= 0 or w < 2:
            return
        if name.startswith("puffs") and self.night:
            name = name.replace("puffs_", "puffsn_")
        p = load(PIECES / name)
        s = w / p.width
        im = p.resize((max(1, round(p.width * s)), max(1, round(p.height * s))), Image.LANCZOS)
        if flip:
            im = ImageOps_mirror(im)
        if dark:
            im = Image.blend(im.convert("RGBA"), Image.new("RGBA", im.size, INK + (255,)), dark)
            im.putalpha(p.resize(im.size, Image.LANCZOS).getchannel("A"))
        if desat:
            grey = im.convert("L").convert("RGBA")
            grey.putalpha(im.getchannel("A"))
            im = Image.blend(im, grey, desat)
        im = with_alpha(im, alpha)
        (screen if mode == "screen" else over)(self.cv, im, cx - im.width / 2, cy - im.height / 2, *([strength] if mode == "screen" else []))

    def squash_glow(self, cx, cy, w, h, alpha):
        p = load(PIECES / "glow_0.png").resize((max(1, round(w)), max(1, round(h))), Image.LANCZOS)
        screen(self.cv, p, cx - w / 2, cy - h / 2, alpha)

    def lights(self, b, rank_old, rank_new, new_alpha):
        """The app's own Lueur (LueurDouce.tsx): isoLueur at 45 % in the heart, 0 at the rim, radius 9 dp for a fire (RAYON_LUEUR),
        a dp being 3 canvas px. The old stage's lights stay on, the new stage's come on with `new_alpha`. Night only."""
        if not self.night:
            return
        ax, ay = BUILD[b]["anchor"]
        rad = round(9 * 3 * self.k)
        yy, xx = np.mgrid[-rad:rad + 1, -rad:rad + 1]
        fall = np.clip(1 - np.hypot(xx, yy) / rad, 0, 1)
        for (lx, ly), fr in BUILD[b]["lights"]:
            a = 1.0 if fr <= rank_old else new_alpha if fr <= rank_new else 0.0
            if a > 0:
                lum = np.dstack([np.full(fall.shape, 240), np.full(fall.shape, 168), np.full(fall.shape, 72), fall * 255 * 0.45 * a]).astype(np.uint8)
                over(self.cv, Image.fromarray(lum), self.A[0] + (lx - ax) * self.k - rad, self.A[1] + (ly - ay) * self.k - rad)

    def tap(self, b, ms):
        if ms < 0 or ms > 200:
            return
        r = 26 + 22 * ms / 200
        d = ImageDraw.Draw(self.cv, "RGBA")
        cx, cy = self.A[0], self.A[1] - 130 * self.k
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(242, 226, 180, int(150 * (1 - ms / 200))), outline=INK + (200,), width=2)


def ImageOps_mirror(im):
    return im.transpose(Image.FLIP_LEFT_RIGHT)


# ------------------------------------------------------------------ the moments (ms from the tap)
def held(t, steps):
    """steps: [(from_ms, value)] ascending; the value of the last step at or before t, no interpolation."""
    v = steps[0][1]
    for ms, val in steps:
        if t >= ms:
            v = val
    return v


def ramp(t, a, b):
    return min(1.0, max(0.0, (t - a) / (b - a)))


def corners(c, b):
    return [c.foot(b, dx, dy) for dx, dy in BUILD[b]["corners"]]


def case_stade(c, b, old, new, t):
    ro, rn = BUILD[b]["stage_rank"][old], BUILD[b]["stage_rank"][new]
    bw = c.body_box(b, new)
    cx, cy = c.A[0] + (bw[0] + bw[2]) / 2, c.A[1] + (bw[1] + bw[3]) / 2
    bs = max(bw[2] - bw[0], bw[3] - bw[1])
    if t < 70:
        c.body(b, old, dy=3 * DPR)
        c.scaffold(b)
        c.lights(b, ro, ro, 0)
    else:
        scale = held(t, [(70, 1.0), (190, 1.08), (270, 0.98), (350, 1.0)])
        c.body(b, new, sx=scale, sy=scale)
        c.lights(b, ro, rn, 1.0 if t >= 520 else 0.0)
        pz = held(t, [(190, 1.0), (350, 0.6), (640, 0.0)])
        for i, (px, py) in enumerate(corners(c, b)):
            c.piece(f"puffs_0_{i}.png", px, py - 20 * c.k, 150 * c.k * pz, alpha=1.0 if pz else 0)
        if 70 <= t < 190:
            c.piece("burst_0_0.png", cx, cy, 1.3 * bs)
        elif 190 <= t < 270:
            c.piece("burst_0_1.png", cx, cy, 1.3 * bs * 0.85)


def case_rang(c, b, stage, t):
    ro = BUILD[b]["stage_rank"][stage]
    name, off = TEASER
    p = IMG / "peints" / b / "elements" / (name.split("/")[1] + (".nuit" if c.night else ".jour") + ".webp")
    im0 = load(p)
    x0, y0 = c.A[0] + off[0] * c.k, c.A[1] + off[1] * c.k
    c.body(b, stage)
    c.lights(b, ro, ro, 0)
    sc = held(t, [(0, 0.0), (70, 1.10), (150, 1.0)])
    if sc:
        im = sprite(p, c.k, sc, sc)
        over(c.cv, im, x0 + im0.width * c.k / 2 - im.width / 2, y0 + im0.height * c.k - im.height)
    px, py = x0 + im0.width * c.k / 2, y0 + im0.height * c.k / 2
    bb = c.body_box(b, stage)
    ux, uy = c.A[0] + (bb[0] + bb[2]) / 2, c.A[1] + bb[1] + 0.3 * (bb[3] - bb[1])  # the piece's own spot is off to the right
    if 0 <= t < 70:
        c.piece("burst_0_0.png", ux, uy, 0.5 * (bb[2] - bb[0]))
    if 70 <= t < 150:
        c.piece("puffs_0_1.png", px + 10, y0 + im0.height * c.k, 90 * c.k)


def jour_stade(c, b, old, new, t):
    ro, rn = BUILD[b]["stage_rank"][old], BUILD[b]["stage_rank"][new]
    bw = c.body_box(b, new)
    cx, cy = c.A[0] + (bw[0] + bw[2]) / 2, c.A[1] + (bw[1] + bw[3]) / 2
    bs = max(bw[2] - bw[0], bw[3] - bw[1])
    g = ramp(t, 0, 100) - ramp(t, 500, 760)
    ink = ramp(t, 0, 100) - ramp(t, 500, 760)
    if g > 0:
        gl = 1.5 * bs * (0.6 + 0.4 * ramp(t, 0, 200))
        if c.night:
            c.squash_glow(c.A[0], c.A[1] - 8 * c.k, 1.3 * 384 * c.k * 1.4, 0.45 * 384 * c.k, 0.6 * g)
            c.piece("glow_0.png", cx, cy, gl, mode="screen", strength=g)
        else:
            c.piece("glow_0.png", cx, cy, gl, alpha=0.6 * g, desat=0.6)
    if t < 200:
        c.body(b, old, ink=ink)
        c.scaffold(b, ink=ink)
    else:
        sc = 0.88 + 0.18 * ramp(t, 200, 340) if t < 340 else 1.06 - 0.06 * ramp(t, 340, 420)
        c.body(b, new, sx=sc, sy=sc, ink=ink, alpha=1.0)
    c.lights(b, ro, rn, ramp(t, 450, 530))
    dust = 1.0 if t < 760 else 1 - ramp(t, 760, 1000)
    if t >= 200 and dust > 0:
        for i, (px, py) in enumerate(corners(c, b)):
            c.piece(f"puffs_0_{i}.png", px, py - 20 * c.k, 150 * c.k * (1 + 0.25 * (1 - dust)), alpha=dust, dark=0.65 * dust)


def jour_rang(c, b, stage, t):
    ro = BUILD[b]["stage_rank"][stage]
    name, off = TEASER
    p = IMG / "peints" / b / "elements" / (name.split("/")[1] + (".nuit" if c.night else ".jour") + ".webp")
    im0 = load(p)
    x0, y0 = c.A[0] + off[0] * c.k, c.A[1] + off[1] * c.k
    c.body(b, stage)
    c.lights(b, ro, ro, 0)
    px, py = x0 + im0.width * c.k / 2, y0 + im0.height * c.k / 2
    gl = ramp(t, 0, 100) * (1 - ramp(t, 300, 450))
    if gl > 0:
        bb = c.body_box(b, stage)
        ux, uy = c.A[0] + (bb[0] + bb[2]) / 2, c.A[1] + bb[1] + 0.3 * (bb[3] - bb[1])
        c.piece("glow_0.png", ux, uy, 0.7 * (bb[2] - bb[0]), mode="screen" if c.night else "over", alpha=0.6 * gl, strength=gl, desat=0 if c.night else 0.6)
    sc = 0.0 if t < 100 else (1.10 * ramp(t, 100, 200) if t < 200 else 1.10 - 0.10 * ramp(t, 200, 300))
    ink = 1.0 if t < 300 else 1 - ramp(t, 300, 450)
    if t >= 0 and sc > 0:
        im = sprite(p, c.k, sc, sc)
        pos = (x0 + im0.width * c.k / 2 - im.width / 2, y0 + im0.height * c.k - im.height)
        over(c.cv, im, *pos)
        over(c.cv, with_alpha(inked(im), ink), *pos)
    elif 0 <= t < 100:  # shadow arriving: a small inked shape under the glow
        im = inked(sprite(p, c.k, 0.5 + 0.5 * ramp(t, 0, 100), 0.5 + 0.5 * ramp(t, 0, 100)))
        over(c.cv, im, x0 + im0.width * c.k / 2 - im.width / 2, y0 + im0.height * c.k - im.height)


PLANS = {("case", "stade"): case_stade, ("case", "rang"): case_rang, ("jour", "stade"): jour_stade, ("jour", "rang"): jour_rang}


# ------------------------------------------------------------------ films
def scene_frames(film, scene, c):
    b, kind, old, new = scene
    direction = FILM_RULE[film](new)
    dur = DURS[(direction, kind)]
    total = BEFORE + dur + REST
    n = round(total * FPS / 1000)
    out = []
    for i in range(n):
        ms = i * 1000 / FPS
        t = ms - BEFORE  # ms from the tap, negative before
        c.new()
        if t < 0:
            c.body(b, old)
            if kind == "stade":
                c.scaffold(b)
            c.lights(b, BUILD[b]["stage_rank"][old], BUILD[b]["stage_rank"][old], 0)
            c.hammer(b, old)
        elif t < dur + 1:
            plan = PLANS[(direction, kind)]
            plan(c, b, old, new, t) if kind == "stade" else plan(c, b, old, t)
        else:
            c.body(b, new)
            c.lights(b, BUILD[b]["stage_rank"][new], BUILD[b]["stage_rank"][new], 1.0)
            if kind == "rang":
                name, off = TEASER
                p = IMG / "peints" / b / "elements" / (name.split("/")[1] + (".nuit" if c.night else ".jour") + ".webp")
                im = sprite(p, c.k)
                over(c.cv, im, c.A[0] + off[0] * c.k, c.A[1] + off[1] * c.k)
        c.tap(b, t)
        out.append((ms, direction, c.cv.convert("RGB")))
    return out


def run_one(film, amb, zoom):
    c = Ctx(amb, zoom, background(amb, ZOOMS[zoom]))
    frames, marks = [], []
    for sc in SCENES:
        start = len(frames)
        fr = scene_frames(film, sc, c)
        marks.append({"scene": f"{sc[0]} {sc[1]} {sc[2]}->{sc[3]}", "direction": fr[0][1], "start_ms": round(start * 1000 / FPS)})
        frames += [(start * 1000 / FPS + m, d, im) for m, d, im in fr]
    FILMS.mkdir(parents=True, exist_ok=True)
    name = f"{film}-{amb}-{zoom}"
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-preset", "medium", str(FILMS / f"{name}.mp4")],
                         stdin=subprocess.PIPE)
    for _, _, im in frames:
        p.stdin.write(im.tobytes())
    p.stdin.close()
    p.wait()
    return name, frames, marks


def sheet(film, parts):
    """10 fps, ms labels; day rows then night rows; the capture zoom, cropped round the building; max 1600 px wide."""
    cols, tile = 8, 198
    font = ImageFont.load_default(size=15)
    tiles = []
    for amb, frames in parts:
        for ms, _, im in frames[::3]:
            t = im.crop((190, 250, 890, 950)).resize((tile, tile), Image.LANCZOS)
            d = ImageDraw.Draw(t)
            d.rectangle((0, 0, 92, 18), fill=(0, 0, 0))
            d.text((3, 1), f"{amb[0]} {round(ms)}", fill=(255, 255, 0), font=font)
            tiles.append(t)
    rows = -(-len(tiles) // cols)
    sh = Image.new("RGB", (cols * tile, rows * tile))
    for i, t in enumerate(tiles):
        sh.paste(t, ((i % cols) * tile, (i // cols) * tile))
    sh.save(FILMS / f"{film}-planche.png")


def main():
    cmd = sys.argv[1]
    index = []
    films = [sys.argv[2]] if cmd == "one" else list(FILM_RULE)
    for film in films:
        parts = []
        for amb in ("jour", "nuit"):
            for zoom in ("capture", "defaut"):
                if cmd == "one" and (amb, zoom) != (sys.argv[3], sys.argv[4]):
                    continue
                name, frames, marks = run_one(film, amb, zoom)
                if zoom == "capture":
                    parts.append((amb, frames))
                index.append({"file": f"{name}.mp4", "direction": LABEL[film], "building": "forge, castle_wall", "ambiance": amb,
                              "zoom": ZOOMS[zoom], "zoom_name": zoom, "length_ms": round(len(frames) * 1000 / FPS), "scenes": marks})
                print(name, len(frames), flush=True)
        if parts and cmd == "all":
            sheet(film, parts)
    if cmd == "all":
        (FILMS / "films.json").write_text(json.dumps(index, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
